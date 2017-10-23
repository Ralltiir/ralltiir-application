/**
 * @file render streamed partial render impl
 * @author harttle<harttle@harttle.com>
 * The Template Render, render templates in serial.
 */
define(['ralltiir'], function (superFrame) {
    var _ = superFrame._;
    var Promise = superFrame.promise;
    // reference: https://github.com/jquery/jquery/blob/master/src/manipulation/var/rscriptType.js
    var rscriptType = /^$|\/(?:java|ecma)script/i;
    var rstylesheetType = /stylesheet/i;

    function Render() {}

    /**
     * Render and encorce JavaScript execution
     *
     * @param {HTMLElement} parent The parent element
     * @param {String} html The html string to render with
     * @param {string} [options=] render options
     * @param {string} [options.from=:root] The container element or the selector of the container element in the DOM of the retrieved HTML
     * @param {boolean} [options.replace=false] Whether or not to replace the contents of container element
     * @return {Promise} resolves when partial fully rendered, rejects when render error
     */
    Render.prototype.render = function (parent, html, options) {
        var docfrag = Render.parse(html, options.from);

        var links = docfrag.querySelectorAll('link');
        var scripts = docfrag.querySelectorAll('script');

        if (options.replace) {
            parent.innerHTML = '';
        }

        return Promise.resolve()
            .then(function () {
                return enforceCSS(links, parent);
            })
            .then(function () {
                return moveNodes(docfrag, parent);
            })
            .then(function () {
                return this.enforceJS(scripts, parent);
            }.bind(this));
    };

    /**
     * Parse HTML to DOM Object
     *
     * @param {String} html The html string to render with
     * @param {String} [from=:root] The root selector, allows returning partial DOM
     * @return {HTMLElement} element containing the DOM tree from `html`
     */
    Render.parse = function (html, from) {
        // documentFragment does not allow setting arbitrary innerHTML,
        // use <div> instead.
        var docfrag = document.createElement('div');
        docfrag.innerHTML = html;

        if (from) {
            var tmp = docfrag.querySelector(from);
            if (tmp) {
                docfrag = tmp;
            } else {
                console.warn('from element not found, using all');
            }
        }

        _.forEach(docfrag.querySelectorAll('[data-rt-omit]'), function (el) {
            el.remove();
        });

        // 手百&浏览器 内核渲染数据标记
        docfrag.appendChild(document.createElement('rendermark'));
        return docfrag;
    }

    function moveNodes(from, to) {
        while (from.childNodes.length > 0) {
            to.appendChild(from.childNodes[0]);
        }
    }

    /**
     * Wait for `<link rel="stylesheet">` loading within the given HTML element
     *
     * @param {HTMLElementCollection} links The elements containing `<link rel="stylesheet">` tags
     * @param {HTMLElement} parent the parent dom to which links will attach
     * @return {Promise} resolves when all links complete/error, never rejects
     */
    function enforceCSS(links, parent) {
        var pendingCSS = _
            .toArray(links)
            .filter(function (link) {
                return rstylesheetType.test(link.rel);
            });

        return new Promise(function (resolve) {
            var pendingCount = pendingCSS.length;

            if (pendingCount === 0) {
                pendingCount = 1;
                return done();
            }

            pendingCSS.forEach(function (link) {
                parent.appendChild(link);
                Render.loadResource(link, done);
            });

            function done() {
                pendingCount--;
                if (pendingCount === 0) {
                    resolve();
                }
            }
        });
    }

    /**
     * Enforce `<script>` execution within the given HTML element
     *
     * @param {HTMLElementCollection} scripts The elements containing `<script>` tags
     * @param {HTMLElement} parent The parent element to insert `<script>`
     * @return {Promise} resolves when all scripts complete/error, never rejects
     */
    Render.prototype.enforceJS = function (scripts, parent) {
        var fp = createEvaluator(this.global);
        var pendingJS = _
            .toArray(scripts)
            .filter(function (script) {
                return rscriptType.test(script.type);
            })
            .map(function (script) {
                return script.src ? cloneScript(script) : this.wrapScript(script, fp);
            }, this);

        return new Promise(function (resolve) {
            var pendingCount = pendingJS.length;

            if (pendingCount === 0) {
                pendingCount = 1;
                return done();
            }

            pendingJS.forEach(function (script) {
                domEval(script, parent, done);
            });

            function done() {
                pendingCount--;
                if (pendingCount === 0) {
                    destroyEvaluator(fp);
                    resolve();
                }
            }
        });
    };

    function createEvaluator() {
        var fp = 'sf_closure_eval_' + Math.random().toString(36).substr(2);

        window[fp] = function (client) {
            client();
        };

        return fp;
    }

    function destroyEvaluator(fp) {
        delete window[fp];
    }

    /**
     * Wrap script with the randomized callback wrapper
     *
     * @param {HTMLElement} el the element to be wrapped
     * @param {string} wrapper the function name to be used as wrapper
     * @return {HTMLScriptElement} the wrapped script element
     */
    Render.prototype.wrapScript = function (el, wrapper) {
        var script = document.createElement('script');
        script.text = wrapper + '(' + this.clientFunction(el.innerHTML) + ');';
        return script;
    };

    /**
     * Get client function from code text
     *
     * @param {string} code The code block of client code
     * @return {string} A function body in string
     */
    Render.prototype.clientFunction = function (code) {
        return 'function(){' + code + '}';
    };

    /**
     * Execute the given external script
     *
     * @param {HTMLElement} el the element to attach
     * @param {Function} cb the callback to be called when render complete (or error)
     */
    function domEval (el, parent, cb) {
        parent.appendChild(el);

        // we DO NOT need to wait for inline scripts
        if (!el.src) {
            done();
        }
        // listen to onstatechange immediately
        else {
            Render.loadResource(el, done);
        }

        function done() {
            el.remove();
            cb();
        }
    };

    /**
     * Scripts inserted by innerHTML will **NOT** be executed,
     * no matter inlined or external
     *
     * @param {HTMLScriptElement} el the script element to be cloned
     * @return {HTMLScript} the cloned script
     */
    function cloneScript(el) {
        var script = document.createElement('script');
        script.src = el.src;
        return script;
    }

    /**
     * Load the given external resource element
     * Note: this **CANNOT** return a promise, since we should listen to onstatechange immediately after appendChild
     *
     * @param {HTMLElement} el The element to load
     * @param {Function} cb the function to be called when load complete (or error)
     */
    Render.loadResource = function (el, cb) {
        var completed = false;
        // Polyfill: 直接绑定onloadend会不被触发
        // spec. https://xhr.spec.whatwg.org/#interface-progressevent
        el.onload = el.onerror = el.onreadystatechange = function () {
            var readyState = el.readyState;
            if (typeof readyState === 'undefined' || /^(loaded|complete)$/.test(readyState)) {
                if (completed) {
                    return;
                }

                completed = true;
                setTimeout(function () {
                    cb(el);
                });
            }

        };
    };

    return Render;
});
