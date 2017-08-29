/**
 * @file    通用 view
 * @author  lizhaoming
 */

define(function (require) {

    require('../utils/animation');

    var rt = require('ralltiir');
    var Naboo = require('../../fusion/deps/naboo');
    var Renderer = require('./render');
    var windowGuard = require('../window-guard');
    var _ = rt._;
    var View = rt.view;
    var action = rt.action;
    var Promise = rt.promise;
    var animationTimeMs = 300;
    var animationDelayMs = 0;
    var animationEase = 'ease';

    function addEventListener(target, eventName, handler, attach) {
        target.addEventListener(eventName, handler, attach);
        this.on('detach', function () {
            target.removeEventListener(eventName, handler, attach);
        });
    }
    function vwAddEventListener() {
        var fn = addEventListener;
        if (arguments.length < 4) {
            fn = _.partial(fn, window);
        }
        fn.apply(this, arguments);
    }

    /**
     * CommonView
     *
     * @class
     */
    var CommonView = function () {
        View.apply(this, arguments);
        // 初始化 virtual window
        var view = this;
        var vw = Object.create({
            performance: {},
            view: this
        }, {
            head: {
                writeable: false,
                get: function () {
                    return view.$head && view.$head[0];
                }
            },
            body: {
                writeable: false,
                get: function () {
                    return view.$body && view.$body[0];
                }
            },
            container: {
                writeable: false,
                get: function () {
                    return view.$view && view.$view[0];
                }
            },
            render: {
                writeable: false,
                get: function () {
                    return view.renderer;
                }
            },
            addEventListener: {
                writeable: false,
                get: function () {
                    return vwAddEventListener;
                }
            }
        });
        this.vw = vw;
        rt.emitter.mixin(this.vw);
    };

    /**
     * Parent
     *
     * @class
     */
    var Parent = function () {};
    Parent.prototype = View.prototype;
    CommonView.prototype = new Parent();
    CommonView.uber = View.prototype;
    CommonView.prototype.constructor = CommonView;
	// rewrite render function
    CommonView.prototype.setTemplateStream = function (promise) {
        this.resourceQueryPromise = promise;
    };

    CommonView.prototype.render = function () {
        this.prepareRender();
        if (this.streamRenderPromise) {
            return this.streamRenderPromise;
        }
        this.guardContext = windowGuard.createContext();
        var view = this;
        // 渲染 stream
        return this.streamRenderPromise = this.resourceQueryPromise.then(function (xhr) {
            view.vw.emit('beforeRender');
            var html = xhr.data || '';
            var el = document.createElement('div');
            el.innerHTML = html;
            // 手百&浏览器 内核渲染数据标记
            html += '<rendermark></rendermark>';
            _.forEach(el.querySelectorAll('[data-sfr-omit]'), function (el) {
                el.remove();
            });
            return view.renderer.render({
                type: 'template/body',
                innerHTML: el.innerHTML
            });
        });
    };

    CommonView.prototype.setHead = function (desc) {
        this.headConfig = desc;
        var $back = this.$head.find('.rt-back');
        var $title = this.$head.find('.rt-title>div');
        var $tool = this.$head.find('.rt-tool');

        if (_.has(desc, 'back.html')) {
            $back.html(desc.back.html);
        }
        if (_.has(desc, 'back.onClick')) {
            $back.off('click').on('click', function () {
                if (false !== desc.back.onClick()) {
                    action.back();
                }
            });
        }
        else {
            $back.off('click').on('click', function () {
                action.back();
            });
        }

        if (_.has(desc, 'title')) {
            $title.text(desc.title);
        }
        var $icons = _.map(desc && desc.icons, function (icon) {
            var $icon = $(icon.html);
            if (icon.onClick) {
                $icon.on('click', icon.onClick);
            }
            return $icon;
        });
        $tool.empty().append($icons);
    };

    CommonView.prototype.parse = function ($el) {
        this.$view = $el;
        this.$head = $el.find('.rt-head');
        this.$body = $el.find('.rt-body');
        this.setHead();
    };

    CommonView.prototype.renderFrame = function (opts) {
        // 拼 DOM
        if (this.frameRendered) {
            // 检查是否已渲染
            return false;
        }
        this.frameRendered = true;

        this.$head = $([
            '<div class="rt-head">',
                '<div class="rt-back"><i class="c-icon">&#xe750;</i></div>',
                '<div class="rt-tool"></div>',
                '<div class="rt-title">',
                    '<div class="c-line-clamp1"></div>',
                '</div>',
            '</div>'
        ].join(''));
        this.setHead(opts.head);

        this.$body = $('<div class="rt-body">');
        this.$view = $('<div class="rt-view">');
        this.$view.append(this.$head).append(this.$body);

        $(rt.doc).append(this.$view);
    };

    CommonView.prototype.startEnterAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.enterAnimate) {
                var dom = self.$view[0];
                Naboo.enter(dom, animationTimeMs, animationEase, animationDelayMs).start(function () {
                    resolve();
                });
            }
            else {
                self.$view.css({
                    'opacity': 1,
                    '-webkit-transform': 'none',
                    'transform': 'none'
                }).show();
                resolve();
            }
        });
    };

    CommonView.prototype.prepareRender = function () {
        // 设为 static 的动作必须在动画结束后、原页面已销毁时进行操作
        // 否则会导致页面滚动位置的跳动
        this.$view.css({
            'position': 'static',
            'overflow': 'auto',
            'height': 'auto',
            '-webkit-transform': 'none',
            'transform': 'none',
            'min-height': $(window).height()
        });
        if (!this.renderer) {
            this.renderer = new Renderer(this.vw);
        }
        window._SF_ = window._SF_ || {};
        window._SF_._global_ = this.renderer.global._global_;
        window._SF_.page = this.renderer.global.scope;
        window._SF_.vw = this.vw;
    };

    CommonView.prototype.renderStream = function () {
        // eslint-disable-next-line
        console.warn('view.renderStream deprecated, use view.render() instead.');
        return this.render();
    };

    CommonView.prototype.attach = function () {
        this.vw.emit('attach');
        return Promise.resolve();
    };

    CommonView.prototype.detach = function () {
        this.$view && this.$view.find('.rt-back').off('click');
        this.vw.emit('detach');
        var view = this;
        return Promise.resolve().then(function () {
            var changeList = windowGuard.checkContext(view.guardContext);
            if (changeList.totalChanges > 1) {
                // eslint-disable-next-line
                console.warn('side effects detected:', changeList);
            }
        });
    };

    CommonView.prototype.startExitAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.exitAnimate) {
                var dom = self.$view[0];
                Naboo.exit(dom, animationTimeMs, animationEase, animationDelayMs).start(function () {
                    resolve();
                });
            }
            else {
                self.$view.css({
                    'display': 'none',
                    'position': 'static',
                    '-webkit-transform': 'none',
                    'transform': 'none'
                });
                resolve();
            }
        });
    };

    CommonView.prototype.hideView = function () {
        this.$view.hide();
    };

    CommonView.prototype.removeDom = function () {
        this.$view.remove();
        delete this.$view;
        delete this.$head;
        delete this.$body;
    };

    return CommonView;
});
