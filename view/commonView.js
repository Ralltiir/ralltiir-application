/**
 * @file    通用 view
 * @author  lizhaoming
 */

define(function (require) {

    require('../utils/animation');

    var superFrame = require('ralltiir');
    var Naboo = require('../../fusion/deps/naboo');
    var Renderer = require('./render');
    var windowGuard = require('../window-guard');
    var _ = superFrame._;
    var View = superFrame.view;
    var action = superFrame.action;
    var Promise = superFrame.promise;
    var animationTimeMs = 300;
    var animationDelayMs = 0;
    var animationEase = 'ease';

    var $viewStyle = $('<style data-for="sf25/view/commonView"></style>');
    $viewStyle.text(__inline('./sfview.css'));
    $('head').append($viewStyle);

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

    var CommonView = function () {
        View.apply(this, arguments);
        // 初始化 virtual window
        var view = this;
        var vw = Object.create({
            performance: {}
        }, {
            head: {
                writeable: false,
                get: function () {
                    return view.$sfHead && view.$sfHead[0];
                }
            },
            body: {
                writeable: false,
                get: function () {
                    return view.$sfBody && view.$sfBody[0];
                }
            },
            container: {
                writeable: false,
                get: function () {
                    return view.$container && view.$container[0];
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
        superFrame.emitter.mixin(this.vw);
    };
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
            var html = xhr.data || ''
            var el = document.createElement('div');
            el.innerHTML = html;
            // 手百&浏览器 内核渲染数据标记
            html += '<rendermark></rendermark>';
            _.forEach(el.querySelectorAll('[data-sfr-omit]'), function (el) {
                // 移除不需要在 sf 中渲染的 dom
                el.remove()
            });
            return view.renderer.render({
                type: 'template/body',
                innerHTML: el.innerHTML
            });
        });
    };

    CommonView.prototype.renderFrame = function (opts) {
        // 拼 DOM
        if (this.frameRendered) {
            // 检查是否已渲染
            return false;
        }
        this.frameRendered = true;

        var backHtml = '<i class="c-icon">&#xe750;</i>';
        if (opts.hasOwnProperty('backHtml')) {
            backHtml = opts.backHtml;
        }
        this.$sfHead = $([
            '<div class="sfa-head">',
                '<div class="sfa-back">' + backHtml + '</div>',
                '<div class="sfa-tool"></div>',
                '<div class="sfa-title">',
                    '<div class="c-line-clamp1">' + (opts.headTitle || '') + '</div>',
                '</div>',
            '</div>'
        ].join(''));
        // 设置头部 css
        var headCss = {};
        // 短路运算
        opts.headHeight && (headCss.height = opts.headHeight);
        opts.headBackground && (headCss.background = opts.headBackground);
        opts.headColor && (headCss.color = opts.headColor);
        this.$sfHead.css(headCss);

        this.$sfBody = $('<div class="sfa-body">');

        this.$container = $('<div class="sfa-view">');

        if (opts.customClassName) {
            this.$container.addClass(opts.customClassName);
        }
        this.$container.append(this.$sfHead).append(this.$sfBody);

        $(superFrame.doc).append(this.$container);
    };

    CommonView.prototype.startEnterAnimate = function () {
        // console.log('startEnterAnimate');
        var dtd = new $.Deferred();
        // 入场动画
        if (this.enterAnimate) {
            var dom = this.$container[0];
            Naboo.enter(dom, animationTimeMs, animationEase, animationDelayMs).start(function () {
                dtd.resolve();
            });
        }
        else {
            this.$container.css({
                'opacity': 1,
                '-webkit-transform': 'none',
                'transform': 'none'
            }).show();
            dtd.resolve();
        }
        return dtd.promise();
    };

    CommonView.prototype.prepareRender = function () {
        // 设为 static 的动作必须在动画结束后、原页面已销毁时进行操作
        // 否则会导致页面滚动位置的跳动
        this.$container.css({
            'position': 'static',
            'overflow': 'auto',
            'height': 'auto',
            '-webkit-transform': 'none',
            'transform': 'none',
            'min-height': $(window).height()
        });
        this.$container.find('.sfa-back').on('click', function (e) {
            action.back();
            e.preventDefault();
        });
        // console.log('prepareRender');
        if (!this.renderer) {
            this.renderer = new Renderer(this.vw);
        }
        window._SF_ = window._SF_ || {};
        window._SF_._global_ = this.renderer.global._global_;
        window._SF_.page = this.renderer.global.scope;
        window._SF_.vw = this.vw;
    };

    CommonView.prototype.renderStream = function () {
        console.warn('view.renderStream is deprecated, use view.render() instead.');
        return this.render();
    };

    CommonView.prototype.attach = function () {
        var view = this;
        return new Promise(function (done) {
            view.vw.emit('attach');
            done();
        });
    };

    CommonView.prototype.detach = function () {
        var dtd = new $.Deferred();
        this.$container && this.$container.find('.sfa-back').off('click');
        this.vw.emit('detach');
        dtd.resolve();
        var view = this;
        return dtd.promise().then(function () {
            // 试图分析 window 中的全局变量变化
            var changeList = windowGuard.checkContext(view.guardContext);
            if (changeList.totalChanges > 1) {
                console.warn('You have some changes leaved on window!', changeList);
            }
            else {
                console.log('guard pass');
            }
            // 试图还原修改
            // windowGuard.revertChanges(changeList);
        });
    };

    CommonView.prototype.startExitAnimate = function () {
        var dtd = new $.Deferred();
        if (this.exitAnimate) {
            var dom = this.$container[0];
            Naboo.exit(dom, animationTimeMs, animationEase, animationDelayMs).start(function () {
                dtd.resolve();
            });
        }
        else {
            this.$container.css({
                'display': 'none',
                'position': 'static',
                '-webkit-transform': 'none',
                'transform': 'none'
            });
            dtd.resolve();
        }
        return dtd.promise();
    };

    CommonView.prototype.hideView = function () {
        this.$container.hide();
    };

    CommonView.prototype.removeDom = function () {
        this.$container.remove();
        delete this.$container;
        delete this.$sfHead;
        delete this.$sfBody;
    };

    return CommonView;
});
