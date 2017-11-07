/**
 * @file    view 一个 Ralltiir 页面的视图对象，可被缓存
 * @author  harttle<harttle@harttle.com>
 */

define(function (require) {
    require('../utils/animation');
    var Loading = require('./rt-loading');
    var dom = require('../utils/dom');
    var rt = require('ralltiir');
    var http = rt.http;
    var Naboo = require('../utils/naboo');
    var Renderer = require('./render');
    var _ = rt._;
    var action = rt.action;
    var Promise = rt.promise;
    var html = [
        '<div class="rt-view active">',
        '  <div class="rt-head">',
        '    <div class="rt-back"></div>',
        '    <div class="rt-actions"></div>',
        '    <div class="rt-center">',
        '      <span class="rt-title"></span>',
        '      <span class="rt-subtitle"></span>',
        '    </div>',
        '  </div>',
        '  <div class="rt-body"></div>',
        '</div>'
    ].join('');

    function View(options, viewEl) {
        this.renderer = new Renderer();
        this.loading = new Loading();
        this.options = options || {};
        prepareEnvironment();

        if (viewEl) {
            this.initElement(viewEl);
            this.populated = true;
            this.options = _.defaultsDeep(parseOptions(viewEl), options);
            this.setData(applyDefaults(this.options));
        }
        else {
            this.initElement(createContainer());
            this.setData(applyDefaults(this.options));
        }
    }

    View.prototype.initElement = function (viewEl) {
        this.viewEl = viewEl;
        this.viewEl.setAttribute('data-base', this.options.baseUrl || '');
        this.headEl = this.viewEl.querySelector('.rt-head');
        this.bodyEl = this.viewEl.querySelector('.rt-body');
        this.viewEl.ralltiir = this;
    };

    View.prototype.render = function () {
        var view = this;
        return this.resourceQueryPromise
        .then(function (xhr) {
            var opts = parseOptions(dom.wrapElementFromString(xhr.data));
            view.setData(applyDefaults(opts));
            return view.renderer.render(view.bodyEl, xhr.data || '', {
                replace: true,
                from: '.rt-body'
            });
        })
        .then(function () {
            view.populated = true;
        });
    };

    View.prototype.partialUpdate = function (url, options) {
        var renderer = this.renderer;
        var body = this.bodyEl;
        var to = options.to ? body.querySelector(options.to) : body;
        var data = {url: url, options: options};
        dom.trigger(to, 'rt.willUpdate', data);

        if (options.replace) {
            to.innerHTML = '';
            this.loading.show(to);
        }
        return View
        .createTemplateStream(url, {
            'x-rt-partial': 'true',
            'x-rt-selector': options.from || ':root'
        })
        .then(function (xhr) {
            rt.action.reset(url, null, {silent: true});
            return renderer.render(to, xhr.data || '', {
                from: options.from,
                replace: options.replace
            })
            .then(function () {
                dom.trigger(to, 'rt.updated', data);
            });
        })
        .catch(function (e) {
            console.warn('partialUpdate Error, redirecting', e);
            location.href = url;
        });
    };

    View.prototype.setHead = function (desc) {
        console.warn('[DEPRECATED] use .setData() instead of .setHead()');
        return this.setData(desc);
    };

    View.prototype.setData = function (desc) {
        var headEl = this.headEl;

        updateTitleBarElement(headEl.querySelector('.rt-back'), desc.back);
        updateTitleBarElement(headEl.querySelector('.rt-title'), desc.title);
        updateTitleBarElement(headEl.querySelector('.rt-subtitle'), desc.subtitle);

        if (desc.actions) {
            var toolEl = headEl.querySelector('.rt-actions');
            toolEl.innerHTML = '';
            _.forEach(desc.actions, function (icon) {
                var iconEl = dom.elementFromString('<span class="rt-action">');
                icon.tryReplace = true;
                var resultIconEl = updateTitleBarElement(iconEl, icon);
                toolEl.appendChild(resultIconEl);
            });
        }
    };

    View.prototype.resetStyle = function () {
        dom.css(this.viewEl, {
            'display': '',
            'opacity': '',
            'position': '',
            'z-index': '',
            'top': '',
            'left': '',
            'height': '',
            'width': '',
            'overflow': '',
            '-webkit-transform': '',
            'transform': ''
        });
        dom.css(this.headEl, {
            'z-index': '',
            'position': '',
            'top': ''
        });
    };

    View.prototype.attach = function () {
        scrollTo(this.scrollX, this.scrollY);
        this.attached = true;
        dom.trigger(this.viewEl, 'rt.attached');
    };

    View.prototype.reuse = function () {
        this.resetStyle();
        dom.addClass(this.viewEl, 'active');
        rt.doc.appendChild(this.viewEl);
    };

    View.prototype.detach = function () {
        dom.removeClass(this.viewEl, 'active');
        this.attached = false;
        this.viewEl.remove();
    };

    View.prototype.trigger = function (event) {
        return dom.trigger(this.viewEl, event);
    };

    View.prototype.enter = function (useAnimation) {
        this.resetStyle();

        if (!useAnimation) {
            this.restoreStates();
            return Promise.resolve();
        }
        var el = this.viewEl;
        var scrollX = this.scrollX;
        var scrollY = this.scrollY;
        return new Promise(function (resolve) {
            Naboo.enter(el, scrollX, scrollY).start(resolve);
        });
    };

    View.prototype.prepareExit = function (useAnimation) {
        this.scrollX = window.scrollX;
        this.scrollY = window.scrollY;

        if (!useAnimation) {
            return Promise.resolve();
        }
        var el = this.viewEl;
        return new Promise(function (resolve) {
            Naboo.prepareExit(el, window.scrollX, window.scrollY).start(resolve);
        });
    }

    View.prototype.exit = function (useAnimation) {
        var el = this.viewEl;
        var sx = this.scrollX;
        var sy = this.scrollY;
        if (!useAnimation) {
            dom.css(el, {
                'display': 'none',
                '-webkit-transform': 'none',
                'transform': 'none'
            });
            return Promise.resolve();
        }
        return new Promise(function (resolve) {
            Naboo.exit(el, sx, sy).start(resolve);
        });
    };

    View.prototype.destroy = function () {
        dom.trigger(this.viewEl, 'rt.destroyed');
        this.viewEl.remove();
        delete this.viewEl;
        delete this.headEl;
        delete this.bodyEl;
    };

    View.prototype.restoreStates = function () {
        if (this.hasOwnProperty('scrollX')) {
            scrollTo(this.scrollX, this.scrollY);
        }
    };

    View.prototype.fetchUrl = function (url) {
        this.resourceQueryPromise = this.createTemplateStream(url);
    }

    View.prototype.createTemplateStream = function (url, headers) {
        var backendUrl = this.getBackendUrl(url)
        return http.ajax(backendUrl, {
            headers: _.assign(headers, { 'x-rt': 'true' }),
            xhrFields: { withCredentials: true }
        });
    };

    View.prototype.getBackendUrl = function (url) {
        if (_.isFunction(this.options.backendUrl)) {
            return this.options.backendUrl(url);
        }
        var root = rt.action.config().root.replace(/\/+$/, '');
        return root + url;
    };

    View.backHTML = '<i class="c-icon">&#xe750;</i>';

    function applyDefaults(options) {
        if (_.get(options, 'back.html') === undefined
            && history.length > 1) {
            _.set(options, 'back.html', '<rt-back></rt-back>');
        }
        return options;
    }

    function prepareEnvironment () {
        if ('scrollRestoration' in history) {
            // Back off, browser, I got this...
            history.scrollRestoration = 'manual';
        }
    }

    function parseOptions(el) {
        var headEl = el.querySelector('.rt-head');
        var ret = {};

        var backEl = headEl.querySelector('.rt-back');
        if (backEl && backEl.innerHTML) {
            ret.back = {html: backEl.innerHTML};
        }

        var titleEl = headEl.querySelector('.rt-title');
        if (titleEl && titleEl.innerHTML) {
            ret.title = {html: titleEl.innerHTML};
        }

        var subtitleEl = headEl.querySelector('.rt-subtitle');
        if (subtitleEl && subtitleEl.innerHTML) {
            ret.subtitle = {html: subtitleEl.innerHTML};
        }

        var actionEls = headEl.querySelector('.rt-actions').children;
        if (actionEls.length) {
            ret.actions = [];
            _.forEach(actionEls, function (el) {
                if (el && el.outerHTML) {
                    ret.actions.push({html: el.outerHTML});
                }
            });
        }

        return ret;
    }

    function createContainer() {
        var viewEl = dom.elementFromString(html);
        rt.doc.appendChild(viewEl);
        return viewEl;
    }

    function getBackendUrl(url) {
        var root = rt.action.config().root.replace(/\/+$/, '');
        return root + url;
    }

    function updateTitleBarElement(el, options) {
        if (_.has(options, 'html')) {
            el.innerHTML = options.html || '';
            // special markups
            if (el.querySelector('rt-back')) {
                el.innerHTML = View.backHTML;
                options.onClick = action.back.bind(action);
            }
            else if (el.querySelector('rt-empty')) {
                el.innerHTML = '';
            }
            if (options.tryReplace && el.children.length) {
                el = el.children[0];
            }
        }
        if (!el.rtClickHandler) {
            el.rtClickHandler = _.noop;
            el.addEventListener('click', function () {
                el.rtClickHandler();
            });
        }
        if (_.has(options, 'onClick')) {
            el.rtClickHandler = _.get(options, 'onClick');
        }
        return el;
    }

    return View;
});
