/**
 * @file    view 一个 Ralltiir 页面的视图对象，可被缓存
 * @author  harttle<harttle@harttle.com>
 */

define(function (require) {
    var animation = require('../utils/animation');
    var URL = require('../utils/url');
    var Loading = require('./loading');
    var dom = require('../utils/dom');
    var rt = require('ralltiir');
    var Renderer = require('./render');
    var debug = require('../utils/debug');
    var _ = rt._;
    var http = rt.http;
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

    prepareEnvironment();

    function View(options, viewEl) {
        this.renderer = new Renderer();
        this.options = options || {};
        this.valid = true;

        if (viewEl) {
            this.initElement(viewEl);
            this.populated = true;
            this.options = _.defaultsDeep(optionsFromDOM(viewEl), options);
            this.setData(normalize(this.options));
        }
        else {
            this.initElement(this.createContainer());
            this.setData(normalize(this.options));
        }
        this.loading = new Loading(this.viewEl);
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
        return this.pendingFetch
        .then(function (xhr) {
            var opts = optionsFromDOM(dom.wrapElementFromString(xhr.data));
            view.setData(normalize(opts));
            view.loading.hide();
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
        var self = this;
        var loading = new Loading(to);

        if (url !== location.pathname + location.search) {
            this.valid = false;
        }

        if (!options.to) {
            options.to = '.rt-body';
        }

        if (!options.from) {
            options.from = options.to;
        }

        if (!options.fromUrl) {
            options.fromUrl = url;
        }

        dom.trigger(to, 'rt.willUpdate', data);

        if (options.replace) {
            to.innerHTML = '';
            loading.show();
        }

        var token = Math.random().toString(36).substr(2);
        to.setAttribute('data-rt-token', token);

        return this.createTemplateStream(URL.setQuery(options.fromUrl, {
            'rt-partial': 'true',
            'rt-selector': options.from
        }))
        .then(function (xhr) {
            loading.hide();

            if (to.getAttribute('data-rt-token') !== token) {
                return;
            }
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
        animation.resetStyle(this.viewEl);
    };

    View.prototype.setAttached = function () {
        this.resetStyle();
        scrollTo(this.scrollX, this.scrollY);
        this.attached = true;
        this.trigger('rt.attached');
    };

    View.prototype.setActive = function () {
        this.trigger('rt.ready');
        dom.addClass(this.viewEl, 'active');
    };

    View.prototype.reuse = function () {
        rt.doc.appendChild(this.viewEl);
    };

    View.prototype.setDetached = function () {
        this.attached = false;
        this.viewEl.remove();
        this.trigger('rt.detached');
    };

    View.prototype.trigger = function (event) {
        return dom.trigger(this.viewEl, event);
    };

    View.prototype.enter = function (useAnimation) {
        this.trigger('rt.willAttach');
        this.resetStyle();

        if (!useAnimation) {
            this.restoreStates();
            return Promise.resolve();
        }
        var el = this.viewEl;
        var scrollX = this.scrollX;
        var scrollY = this.scrollY;
        return animation.enter(el, scrollX, scrollY);
    };

    View.prototype.prepareExit = function (useAnimation) {
        this.trigger('rt.willDetach');
        this.scrollX = window.scrollX;
        this.scrollY = window.scrollY;
        dom.removeClass(this.viewEl, 'active');
        return animation.prepareExit(this.viewEl, window.scrollX, window.scrollY);
    };

    View.prototype.exit = function (useAnimation) {
        return useAnimation
            ? animation.exit(this.viewEl, this.scrollX, this.scrollY)
            : animation.exitSilent(this.viewEl);
    };

    View.prototype.destroy = function () {
        this.trigger('rt.destroyed');
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
        this.loading.show();
        this.pendingFetch = this.createTemplateStream(url);
    };

    View.prototype.createTemplateStream = function (url, headers) {
        var backendUrl = this.getBackendUrl(url);
        backendUrl = URL.setQuery(backendUrl, 'rt', 'true');
        return http.ajax(backendUrl, {
            headers: headers || {},
            xhrFields: {withCredentials: true}
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

    function normalize(options) {
        options = options || {};
        if (_.get(options, 'back.html') === undefined
            && history.length > 1) {
            _.set(options, 'back.html', '<rt-back></rt-back>');
        }
        return options;
    }

    function prepareEnvironment() {
        if ('scrollRestoration' in history) {
            // Back off, browser, I got this...
            history.scrollRestoration = 'manual';
        }
        if (
            !document.querySelector('link[rel=stylesheet][data-for=rt-view]')
            && !document.querySelector('style[data-for="rt-view"]')
            && !document.querySelector('link[rel=stylesheet][href$="view/rt-view.css"]') // legacy
        ) {
            var prefix = debug.enabled ? './amd_modules' : '//unpkg.com';
            var link = dom.elementFromString('<link rel="stylesheet">');
            link.setAttribute('href', prefix + '/ralltiir-application/view/rt-view.css');
            document.head.appendChild(link);
        }
    }

    function optionsFromDOM(el) {
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

    View.prototype.createContainer = function () {
        var viewEl = dom.elementFromString(html);
        rt.doc.appendChild(viewEl);
        return viewEl;
    };

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
