/**
 * @file render streamed partial render impl
 * @author harttle<yangjun14@baidu.com>
 * The Template Render, render templates in serial.
 *
 * @example
 * var ts = template.createReadStream(url);
 * var r = new Render(virtualWindow);
 * r.global.scope.foo = 'bar';
 *
 * var headTemplate = ts.read();
 * r.render(headTemplate);
 *
 * ts.on('data', function(template){
 *   r.render(template);
 * });
 * r.setRenderer(function(template){
 *   console.log(this.global.virtualWindow);
 *   console.log(this.global.scope);
 * });
 */
define(['sfr'], function (superFrame) {
    var _ = superFrame._;
    var Promise = superFrame.promise;
    // reference: https://github.com/jquery/jquery/blob/master/src/manipulation/var/rscriptType.js
    var rscriptType = /^$|\/(?:java|ecma)script/i;
    var rstylesheetType = /stylesheet/i;

    /**
     * render constructor
     *
     * @class
     * @param {Object} virtualWindow The virtual window object used to evaluate client scripts
     */
    function Render(virtualWindow) {
        this.global = {
            scope: {},
            virtualWindow: virtualWindow
        };
        var render = this;
        this.global._global_ = Object.create(null, {
            container: {
                writeable: false,
                get: function () {
                    return render.global.virtualWindow.container;
                }
            }
        });
        this.queue = Promise.resolve();
    }

    /**
     * Render templates in serial
     *
     * @param {Object} template The template object from TemplateStream Data
     * @return {Promise} resolves with the rendered DOM when complete, rejects when there's any error
     */
    Render.prototype.render = function (template) {
        return this.queue = this.queue
            .catch(function (e) {
                // ensure stack captured by browser console
                setTimeout(function () {
                    throw e;
                });
            })
            .then(function () {
                return this.renderer(template);
            }.bind(this));
    };

    /**
     * Set the renderer implementation, default: `Render.prototype.renderer`
     *
     * @param {Function} renderer The renderer implementation
     */
    Render.prototype.setRenderer = function (renderer) {
        this.global.renderer = renderer;
    };

    /**
     * The default renderer implementation, may be override by `#setRenderer()`
     * This could be override by `#setRenderer()`
     *
     * @param {Object} template The template object from TemplateStream data
     * @return {Promise<HTMLElement|HTMLFragment>} return a promise resolves the rendered DOM
     */
    Render.prototype.renderer = function (template) {
        var head = this.global.virtualWindow.head;
        var body = this.global.virtualWindow.body;
        switch (template.type) {
            case 'template/head':
                return this.renderPartial(head, template);
            case 'template/body':
                return this.renderPartial(body, template);
            default:
                return this.renderPartial(body, template);
        }
    };

    /**
     * Render and encorce JavaScript execution
     *
     * @param {HTMLElement} parent The parent element
     * @param {Template} template The template
     * @return {Promise} resolves when partial fully rendered, rejects when render error
     */
    Render.prototype.renderPartial = function (parent, template) {
        // documentFragment does not allow setting arbitrary innerHTML,
        // use <div> instead.
        var html = template.innerHTML;
        var docfrag = document.createElement('div');
        docfrag.innerHTML = html;

        var links = docfrag.querySelectorAll('link');
        var scripts = docfrag.querySelectorAll('script');

        return Promise.resolve()
            .then(function () {
                return enforceCSS(links, parent);
            })
            .then(function () {
                return moveNodes(docfrag, parent);
            })
            .then(function () {
                return this.enforceJS(scripts, template);
            }.bind(this));
    };

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
                Render.load(link, done);
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
     * @param {Template} template The template
     * @return {Promise} resolves when all scripts complete/error, never rejects
     */
    Render.prototype.enforceJS = function (scripts, template) {
        var fp = createEvaluator(this.global);
        var scriptIndex = -1;
        var pendingJS = _
            .toArray(scripts)
            .filter(function (script) {
                return rscriptType.test(script.type);
            })
            .map(function (script) {
                var clonedScript;
                if (script.src) {
                    // 外链 js
                    clonedScript = cloneScript(script);
                    scriptIndex++;
                }
                else {
                    // 非外链
                    var useLoader = template.hasOwnProperty('use-loader');
                    if (useLoader) {
                        scriptIndex++;
                    }
                    clonedScript = this.wrapScript(script, useLoader ? '_superframeJSLoader' : fp);
                }
                clonedScript.setAttribute('data-evaluator-id', fp);
                clonedScript.setAttribute('data-script-index', scriptIndex);
                return clonedScript;
            }, this);

        return new Promise(function (resolve) {
            var pendingCount = pendingJS.length;

            if (pendingCount === 0) {
                pendingCount = 1;
                return done();
            }

            pendingJS.forEach(function (script) {
                domEval(script, done);
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

    function createEvaluator(global) {
        var fp = 'sf_closure_eval_' + Math.random().toString(36).substr(2);

        window[fp] = function (client) {
            client(global.virtualWindow, global.scope, global._global_);
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
        return 'function(vw, page, _global_){' + code + '}';
    };

    /**
     * Execute the given external script
     *
     * @param {HTMLElement} el the element to attach
     * @param {Function} cb the callback to be called when render complete (or error)
     */
    function domEval(el, cb) {
        document.head.appendChild(el);

        // we DO NOT need to wait for inline scripts
        if (!el.src) {
            done();
        }
        // listen to onstatechange immediately
        else {
            Render.load(el, done);
        }

        function done() {
            document.head.removeChild(el);
            cb();
        }
    }

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
    Render.load = function (el, cb) {
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
