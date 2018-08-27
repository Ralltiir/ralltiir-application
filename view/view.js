/**
 * @file    view 一个 Ralltiir 页面的视图对象，可被缓存
 * @author  harttle<yangjvn@126.com>
 * @description 动画调度逻辑较为复杂，分4个生命周期完成。
 *
 * 入场动画过程：
 *   1. beforeDetach: fix 当前页面，并恢复当前页的滚动
 *   2. beforeAttach: 如果有缓存，加载目标页面并恢复其滚动；如果无缓存，直接加载空页面
 *   3. detach:
 *   4. attach：目标页面左滑入场
 *
 * 退场动画过程：
 *   1. beforeDetach: fix 当前页面，并恢复当前页的滚动
 *   2. beforeAttach: 加载目标页面（缓存的）并恢复其滚动
 *   3. detach: 当前页右滑动画
 *   4. attach：激活目标页面
 */

define(function (require) {
    var animation = require('../utils/animation');
    var URL = require('../utils/url');
    var Loading = require('./loading');
    var dom = require('../utils/dom');
    var rt = require('ralltiir');
    var _ = require('@searchfe/underscore');
    var Promise = require('@searchfe/promise');
    var assert = require('@searchfe/assert');
    var Render = require('./render');
    var logger = rt.logger;
    var http = rt.http;
    var action = rt.action;
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

    // eslint-disable-next-line
    function View(scope, viewEl) {
        this.renderer = new Render();
        this.name = scope.name;
        this.options = normalize(scope.options) || {};
        this.performance = scope.performance;
        this.valid = true;

        if (viewEl) {
            // Do not fade in when view exits!
            this.options.fadeIn = false;
            this.initElement(viewEl);
            this.populated = true;
            this.options = _.defaultsDeep(normalize(optionsFromDOM(viewEl)), this.options);
            this.setData(this.options);
        }
        else {
            this.initElement(this.createContainer());
            this.setData(this.options);
        }
        this.loading = new Loading(this.viewEl);
    }

    View.prototype.initElement = function (viewEl) {
        assert(viewEl, '.rt-view not exist');
        this.viewEl = viewEl;
        this.viewEl.setAttribute('data-base', this.options.baseUrl || '');
        if (this.options.background !== undefined) {
            this.viewEl.style.background = this.options.background;
        }
        
        this.headEl = this.viewEl.querySelector('.rt-head');
        assert(this.headEl, '.rt-view>.rt-head not exist');

        this.bodyEl = this.viewEl.querySelector('.rt-body');
        assert(this.bodyEl, '.rt-view>rt-body not exist');
        if (this.options.fadeIn) {
            dom.addClass(this.viewEl, 'rt-view-fade');
        }
        if (this.options.headClass) {
            dom.addClass(this.headEl, this.options.headClass);
        }
        this.viewEl.ralltiir = this;
    };

    View.prototype.render = function () {
        var self = this;
        return this.pendingFetch
        .then(function (xhr) {
            self.performance.domLoading = Date.now();
            var html = xhr.data || '';
            var docfrag = Render.parse(html);
            if (!self.options.fadeIn) {
                self.loading.hide();
            }
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
                })
                .catch(function (err) {
                    err.code = err.code || 910;
                    throw err;
                });
            })
            .then(function () {
                self.performance.headInteractive = Date.now();
                return self.renderer.render(self.bodyEl, docfrag.querySelector('.rt-body'), {
                    replace: true,
                    onContentLoaded: function normalizeSSR() {
                        if (self.options.fadeIn) {
                            dom.addClass(self.viewEl, 'rt-view-fadein');
                        }
                        self.performance.domContentLoaded = Date.now();
                    }
                })
                .catch(function (err) {
                    err.code = err.code || 911;
                    throw err;
                });
            });
        })
        .then(function () {
            self.populated = true;
        })
        .then(function () {
            setTimeout(function() {
                self.anchorScroll();
            }, 0);
        })
        .catch(function (err) {
            err.code = err.code || 919;
            throw err;
        });
    };

    /**
     * 存在hash时定位到目标元素
     *
     */
    View.prototype.anchorScroll = function () {
        if (!location.hash) {
            return;
        }
        var key = location.hash.replace('#', '');
        var anchor = this.viewEl.querySelector('[name="'+ key +'"]');
        if (anchor && anchor.getBoundingClientRect) {
            scrollTo(0, anchor.getBoundingClientRect().top);
        }
    };

    /**
     * 给其他页面实例发送消息
     *
     * @param {any} msg 消息体
     * @param {string} [target] 目标 Service 名称，如果为空则发送当前同名的 Service。
     */
    View.prototype.postMessage = function (msg, target) {
        if (arguments.length < 2) {
            target = this.name;
            assert(target, 'service name not set, cannot postMessage to itself');
        }
        rt.services.postMessage(msg, target);
    };

    View.prototype.partialUpdate = function (url, options) {
        url = this.resolveUrl(url);

        var renderer = this.renderer;
        var body = this.bodyEl;
        var to = options.to ? body.querySelector(options.to) : body;
        var data = {url: url, options: options, bubbles: true};
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
        var self = this;
        return new Promise(function (resolve) {
            self.resetStyle();
            self.restoreStates();
            self.attached = true;
            self.performance.domInteractive = Date.now();
            setTimeout(function () {
                self.trigger('rt.attached');
                resolve();
            });
        });
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
        dom.removeNode(this.viewEl);
        this.trigger('rt.detached');
        // 兼容网盟广告rerfer方案，7.26沟通，临时方案复用SF 2.x参数，2月内下线
        this.setSspHerf(null);
    };

    View.prototype.setSspHerf = function (href) {
        window._SF_ = window._SF_ || {};
        window._SF_._global_ = window._SF_._global_ || {};
        window._SF_._global_._ssp = window._SF_._global_._ssp || {};
        window._SF_._global_._ssp.location = window._SF_._global_._ssp.location || {};
        window._SF_._global_._ssp.location.href = href || null;
    }

    View.prototype.trigger = function (event, options) {
        return dom.trigger(this.viewEl, event, options);
    };

    View.prototype.enter = function (useEnterAnimation) {
        this.trigger('rt.willAttach');
        logger.debug('[view.enter] resetting styles, useEnterAnimation', useEnterAnimation);
        this.resetStyle();
        if (!useEnterAnimation) {
            logger.debug('[view.enter] animation disabled restoreStates...');
            this.restoreStates();
            return Promise.resolve();
        }
        var el = this.viewEl;
        logger.debug('[view.enter] calling animaiton.enter with', this.scrollX, this.scrollY);
        return animation.enter(el, this.scrollX, this.scrollY);
    };

    View.prototype.prepareExit = function (useAnimation) {
        this.trigger('rt.willDetach');
        this.scrollX = window.scrollX;
        this.scrollY = window.scrollY;
        logger.debug('[view.prepareExit] saving scrollX/scrollY', this.scrollX, this.scrollY);
        dom.removeClass(this.viewEl, 'active');
        // need prepare regardless useAnimation, scrollTop will be effected otherwise
        return animation.prepareExit(this.viewEl, this.scrollX, this.scrollY);
    };

    View.prototype.exit = function (useAnimation) {
        return useAnimation
            ? animation.exit(this.viewEl, this.scrollX, this.scrollY)
            : animation.exitSilent(this.viewEl);
    };

    View.prototype.destroy = function () {
        this.trigger('rt.destroyed');
        dom.removeNode(this.viewEl);
        delete this.viewEl;
        delete this.headEl;
        delete this.bodyEl;
    };

    View.prototype.restoreStates = function () {
        logger.debug('restoring states to', this.scrollX, this.scrollY);
        if (this.hasOwnProperty('scrollX')) {
            scrollTo(this.scrollX, this.scrollY);
        } else {
            scrollTo(0, 0);
        }
    };

    View.prototype.fetchUrl = function (url) {
        this.loading.show({
            loadingClass: this.options.loadingClass || '',
            disableBackground: !!this.options.background
        });
        this.pendingFetch = this.fetch(url);
    };

    View.prototype.fetch = function (url, headers) {
        this.backendUrl = this.getBackendUrl(url);
        this.backendUrl = URL.setQuery(this.backendUrl, 'rt', 'true');
        this.performance.requestStart = Date.now();
        // 兼容网盟广告rerfer方案，7.26沟通，临时方案复用SF 2.x参数，2月内下线
        this.setSspHerf(this.backendUrl);
        return http.ajax(this.backendUrl, {
            headers: headers || {},
            xhrFields: {withCredentials: true}
        })
        .catch(function (err) {
            err.code = err.status || 900;
            throw err;
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
        options = _.cloneDeep(options);
        if (_.get(options, 'back.html') === undefined
            && history.length > 1) {
            _.set(options, 'back.html', '<rt-empty>' + View.backHtml + '</rt-empty>');
        }
        return options;
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

        var actionEl = headEl.querySelector('.rt-actions');
        if (actionEl && actionEl.children.length) {
            ret.actions = [];
            _.forEach(actionEl.children, function (el) {
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

    View.prototype.resolveUrl = function (url) {
        return this.options.baseUrl + url;
    };

    return View;
});
