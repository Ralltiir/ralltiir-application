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

    function View(options, viewEl) {
        this.renderer = new Renderer();
        this.backOption = {
            html: '<i class="c-icon">&#xe750;</i>',
            onClick: action.back.bind(action)
        };
        this.defaultHeadOptions = options || {
            back: this.backOption
        };

        if (!viewEl) {
            viewEl = dom.elementFromString(html);
            rt.doc.appendChild(viewEl);
        }

        this.viewEl = viewEl;
        this.headEl = this.viewEl.querySelector('.rt-head');
        this.bodyEl = this.viewEl.querySelector('.rt-body');
        this.viewEl.ralltiir = this;

        this.loading = new Loading();
        this.setHead(_.defaultsDeep(options, this.defaultHeadOptions));
    }

    View.parse = function (options, el) {
        var view = new View({}, el);
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
            return Promise.all([
                view.renderer.render(view.headEl, xhr.data || '', {
                    replace: true,
                    from: '.rt-head',
                    render: view.updateHead.bind(view)
                }),
                view.renderer.render(view.bodyEl, xhr.data || '', {
                    replace: true,
                    from: '.rt-body'
                })
            ]);
        })
        .then(function () {
            view.rendered = true;
        });
    };

    View.prototype.updateHead = function (container) {
        this.headEl.innerHTML = container.innerHTML || '';
        if (history.length) {
            updateTitleBarElement(this.headEl.querySelector('.rt-back'), this.backOption);
        }
    };

    View.prototype.partialUpdate = function (url, options) {
        var renderer = this.renderer;
        var body = this.bodyEl;
        var to = options.to ? body.querySelector(options.to) : body;

        if (options.replace) {
            dom.trigger(to, 'rt.updating', {options: options});
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
            dom.trigger(to, 'rt.willUpdate');
            return renderer.render(to, xhr.data || '', {
                from: options.from,
                replace: options.replace
            })
            .then(function () {
                dom.trigger(to, 'rt.updated');
            });
        })
        .catch(function (e) {
            console.warn('partialUpdate Error, redirecting', e);
            location.href = url;
        });
    };

    function updateTitleBarElement(el, options) {
        if (!el.rtClickHandler) {
            el.rtClickHandler = _.noop;
            el.addEventListener('click', function () {
                el.rtClickHandler();
            });
        }
        if (_.has(options, 'html')) {
            el.innerHTML = options.html || '';
        }
        if (_.has(options, 'onClick')) {
            el.rtClickHandler = _.get(options, 'onClick');
        }
    }

    View.prototype.setHead = function (desc) {
        desc = desc || {};
        var headEl = this.headEl;

        desc.back = history.length > 0 ? this.backOption : desc.back;
        updateTitleBarElement(headEl.querySelector('.rt-back'), desc.back);
        updateTitleBarElement(headEl.querySelector('.rt-title'), desc.title);
        updateTitleBarElement(headEl.querySelector('.rt-subtitle'), desc.subtitle);

        if (desc.actions) {
            var toolEl = headEl.querySelector('.rt-actions');
            toolEl.innerHTML = '';
            _.forEach(desc.actions, function (icon) {
                var iconEl = dom.elementFromString('<span>');
                updateTitleBarElement(iconEl, icon);
                toolEl.appendChild(iconEl);
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

    return View;
});
