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
    var animationTimeMs = 300;
    var animationDelayMs = 0;
    var animationEase = 'ease';
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
    var defaultOptions = {
        back: {
            html: '<i class="c-icon">&#xe750;</i>',
            onClick: action.back.bind(action)
        }
    };

    function View(options, viewEl) {
        this.renderer = new Renderer();
        this.loading = new Loading();
        options = options || {};

        if (viewEl) {
            this.bindElement(viewEl);
            options = _.defaultsDeep(parseOptions(viewEl), options);
            this.setData(applyDefaults(options));
        }
        else {
            this.bindElement(createContainer());
            this.setData(applyDefaults(options));
        }
    }

    View.prototype.bindElement = function (viewEl) {
        this.viewEl = viewEl;
        this.headEl = this.viewEl.querySelector('.rt-head');
        this.bodyEl = this.viewEl.querySelector('.rt-body');
        this.viewEl.ralltiir = this;
    };

    // TODO 移到 Service
    View.parse = function (options, el) {
        var view = new View({}, el);
        // TODO 去掉这个标记
        view.rendered = true;
        return view;
    };

    View.prototype.setTemplateStream = function (promise) {
        this.resourceQueryPromise = promise;
    };

    View.prototype.render = function () {
        this.prepareRender();
        var view = this;
        if (this.streamRenderPromise) {
            return this.streamRenderPromise;
        }
        return this.streamRenderPromise = this.resourceQueryPromise
        .then(function (xhr) {
            view.setData(parseOptions(dom.wrapElementFromString(xhr.data)));
            return view.renderer.render(view.bodyEl, xhr.data || '', {
                replace: true,
                from: '.rt-body'
            });
        })
        .then(function () {
            view.rendered = true;
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

    function updateTitleBarElement(el, options) {
        if (_.has(options, 'html')) {
            el.innerHTML = options.html || '';
            // special markups
            if (el.querySelector('rt-back')) {
                el.innerHTML = '<i class="c-icon">&#xe750;</i>';
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

    View.prototype.setHead = function (desc) {
        console.warn('[DEPRECATED] use .setData() instead of .setHead()');
        return this.setData(desc);
    }

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

    View.prototype.startEnterAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.enterAnimate) {
                Naboo.enter(self.viewEl, animationTimeMs, animationEase, animationDelayMs).start(resolve);
            }
            else {
                dom.css(self.viewEl, {
                    'opacity': 1,
                    '-webkit-transform': 'none',
                    'transform': 'none'
                });
                resolve();
            }
        });
    };

    View.prototype.prepareRender = function () {
        // 设为 static 的动作必须在动画结束后且原页面已销毁时进行操作
        // 否则会导致页面滚动位置的跳动
        dom.css(this.viewEl, {
            'position': 'static',
            '-webkit-transform': 'none',
            'transform': 'none',
            'overflow': 'visible',
            'min-height': window.innerHeight + 'px'
        });
    };

    View.prototype.attach = function () {
        dom.trigger(this.viewEl, 'rt.attached');
        this.attached = true;
        //不使用restoreScrollState，因为要处理回退后再打开（scollX无记录）置顶的情况
        scrollTo(this.scrollX, this.scrollY);
    };

    // TODO 统一由 attach 操作，干掉 reAttach
    View.prototype.reAttach = function () {
        dom.addClass(this.viewEl, 'active');
        dom.show(this.viewEl);
        rt.doc.appendChild(this.viewEl);
    };

    View.prototype.beforeDetach = function (current, prev) {
        dom.trigger(this.viewEl, 'rt.willDetach');
        // 对历史记录操作，不保存浏览位置
        if (['back', 'history'].indexOf(current.options.src) < 0) {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
        }
        dom.removeClass(this.viewEl, 'active');
    };

    View.prototype.detach = function () {
        dom.trigger(this.viewEl, 'rt.detached');
        this.viewEl.remove();
        this.attached = false;
    };

    View.prototype.startExitAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.exitAnimate) {
                Naboo
                .exit(self.viewEl, animationTimeMs, animationEase, animationDelayMs)
                .start(function () {
                    resolve();
                });
            }
            else {
                dom.css(self.viewEl, {
                    'display': 'none',
                    '-webkit-transform': 'none',
                    'transform': 'none'
                });
                resolve();
            }
        });
    };

    View.prototype.destroy = function () {
        dom.trigger(this.viewEl, 'rt.destroyed')
        this.viewEl.remove();
        delete this.viewEl;
        delete this.headEl;
        delete this.bodyEl;
    };

    View.prototype.restoreScrollState = function () {
        if (this.hasOwnProperty('scrollX')) {
            scrollTo(this.scrollX, this.scrollY);
        }
    };

    View.createTemplateStream = function (url, headers) {
        return http.ajax(url, {
            headers: _.assign(headers, {
                'x-rt': 'true'
            }),
            xhrFields: {
                withCredentials: true
            }
        });
    };

    function applyDefaults(options) {
        if (_.get(options, 'back.html') === undefined
            && history.length > 1) {
            _.set(options, 'back.html', '<rt-back></rt-back>');
        }
        return options;
    }

    function parseOptions(el) {
        var headEl = el.querySelector('.rt-head');
        var ret = {};

        var backEl = headEl.querySelector('.rt-back');
        if (backEl && backEl.innerHTML) {
            ret.back = { html: backEl.innerHTML };
        }
        else if (history.length > 1){
            ret.back = {
                html: '<i class="c-icon">&#xe750;</i>',
                onClick: action.back.bind(action)
            };
        }

        var titleEl = headEl.querySelector('.rt-title');
        if (titleEl && titleEl.innerHTML) {
            ret.title = { html: titleEl.innerHTML };
        }

        var subtitleEl = headEl.querySelector('.rt-subtitle');
        if (subtitleEl && subtitleEl.innerHTML) {
            ret.subtitle = { html: subtitleEl.innerHTML };
        }

        var actionEls = headEl.querySelector('.rt-actions').children;
        if (actionEls.length) {
            ret.actions = [];
            _.forEach(actionEls, function (el) {
                if (el && el.outerHTML) {
                    ret.actions.push({ html: el.outerHTML });
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

    return View;
});
