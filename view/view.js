/**
 * @file    view 一个 Ralltiir 页面的视图对象，可被缓存
 * @author  harttle<harttle@harttle.com>
 */

define(function (require) {
    var animation = require('../utils/animation');
    var ua = require('../utils/ua');
    var URL = require('../utils/url');
    var Loading = require('./loading');
    var dom = require('../utils/dom');
    var rt = require('ralltiir');
    var Render = require('./render');
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

    // eslint-disable-next-line
    function View(options, viewEl) {
        this.renderer = new Render();
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
        var self = this;
        return this.pendingFetch
        .then(function (xhr) {
            var html = xhr.data || '';
            var docfrag = Render.parse(html);

            self.loading.hide();

            var view = docfrag.querySelector('.rt-view');
            if (!view) {
                var message = '".rt-view" not found in retrieved HTML'
                + '(from ' + self.backendUrl + ' )'
                + 'abort rendering...';
                throw new Error(message);
            }
            self.renderer.moveClasses(view, self.viewEl);

            return Promise.resolve()
            .then(function () {
                return self.renderer.render(self.headEl, docfrag.querySelector('.rt-head'), {
                    replace: true,
                    onContentLoaded: function normalizeSSR() {
                        var opts = optionsFromDOM(dom.wrapElementFromString(html));
                        self.setData(normalize(opts));
                    }
                });
            })
            .then(function () {
                return self.renderer.render(self.bodyEl, docfrag.querySelector('.rt-body'), {
                    replace: true
                });
            });
        })
        .then(function () {
            self.populated = true;
        });
    };

    View.prototype.partialUpdate = function (url, options) {
        var renderer = this.renderer;
        var body = this.bodyEl;
        var to = options.to ? body.querySelector(options.to) : body;
        var data = {url: url, options: options};
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

        return this.fetch(URL.setQuery(options.fromUrl, {
            'rt-partial': 'true',
            'rt-selector': options.from
        }))
        .then(function (xhr) {
            loading.hide();

            if (to.getAttribute('data-rt-token') !== token) {
                return;
            }
            rt.action.reset(url, null, {silent: true});

            var docfrag = Render.parse(xhr.data || '');
            docfrag = options.from ? docfrag.querySelector(options.from) : docfrag;

            return renderer.render(to, docfrag, {replace: options.replace})
            .then(function () {
                dom.trigger(to, 'rt.updated', data);
            });
        })
        .catch(function (e) {
            // eslint-disable-next-line
            console.warn('partialUpdate Error, redirecting', e);
            location.href = url;
        });
    };

    View.prototype.setHead = function (desc) {
        // eslint-disable-next-line
        console.warn('[DEPRECATED] use .setData() instead of .setHead()');
        return this.setData(desc);
    };

    View.prototype.setData = function (desc) {
        var headEl = this.headEl;

        this.updateTitleBarElement(headEl.querySelector('.rt-back'), desc.back);
        this.updateTitleBarElement(headEl.querySelector('.rt-title'), desc.title);
        this.updateTitleBarElement(headEl.querySelector('.rt-subtitle'), desc.subtitle);

        if (desc.actions) {
            var toolEl = headEl.querySelector('.rt-actions');
            toolEl.innerHTML = '';
            _.forEach(desc.actions, function (icon) {
                var iconEl = dom.elementFromString('<span class="rt-action">');
                icon.tryReplace = true;
                var resultIconEl = this.updateTitleBarElement(iconEl, icon);
                toolEl.appendChild(resultIconEl);
            }, this);
        }
    };

    View.prototype.resetStyle = function () {
        animation.resetStyle(this.viewEl);
    };

    View.prototype.setAttached = function () {
        this.resetStyle();
        this.restoreStates();
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

    View.prototype.prepareExit = function () {
        this.trigger('rt.willDetach');
        this.scrollX = window.scrollX;
        this.scrollY = window.scrollY;
        dom.removeClass(this.viewEl, 'active');
        // need prepare regardless useAnimation, scrollTop will be affected otherwise
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
        this.pendingFetch = this.fetch(url);
    };

    View.prototype.fetch = function (url, headers) {
        this.backendUrl = this.getBackendUrl(url);
        this.backendUrl = URL.setQuery(this.backendUrl, 'rt', 'true');
        return http.ajax(this.backendUrl, {
            headers: headers || {},
            xhrFields: {withCredentials: true}
        });
    };

    View.prototype.getBackendUrl = function (url) {
        if (_.isFunction(this.options.backendUrl)) {
            return this.options.backendUrl(url);
        }
        if (_.isString(this.options.backendUrl)) {
            return this.options.backendUrl;
        }
        var root = rt.action.config().root.replace(/\/+$/, '');
        return root + url;
    };

    View.backHtml = '<i class="c-icon">&#xe750;</i>';

    function normalize(options) {
        options = options || {};
        if (_.get(options, 'back.html') === undefined
            && history.length > 1) {
            _.set(options, 'back.html', '<rt-back>' + View.backHtml + '</rt-back>');
        }
        return options;
    }

    function prepareEnvironment() {
        // ios 设为 manual 时回退时页面不响应 1s
        if (('scrollRestoration' in history) && !ua.isIOS) {
            // Back off, browser, I got this...
            history.scrollRestoration = 'manual';
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

    View.prototype.updateTitleBarElement = function (el, options) {
        if (_.has(options, 'html')) {
            el.innerHTML = options.html || '';
            // special markups
            if (el.querySelector('rt-back')) {
                el.innerHTML = el.innerHTML || View.backHtml;
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
    };

    return View;
});
