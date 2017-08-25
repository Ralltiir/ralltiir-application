/**
 * 通用 service
 *
 * @file    commonService.js
 * @author  lizhaoming
 */
define(function (require) {
    var superFrame = require('sfr');
    var CommonView = require('../view/commonView');
    var BaseService = superFrame.service;
    var Cache = superFrame.cache;
    var commonViews = Cache.create('commonViews');
    var commonService = new BaseService();
    var http = superFrame.http;

    commonService.createTemplateStream = function (state) {
        return http.ajax(state.url, {
            xhrFields: {
                withCredentials: true
            }
        });
    };

    commonService.createView = function (state) {
        return new CommonView();
    };

    commonService.create = function (current, prev, extra) {
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            this.syncPageUrl = current.url;
            $('#sfr-app .sfr-sync-page').css({'display': 'block'});
            return;
        }
        if (current.url === this.syncPageUrl) {
            $('#sfr-app .sfr-sync-page').css({'display': 'block'});
            return;
        }
        // 获取 view 实例
        var view = commonViews.get(current.url);
        if (!view) {
            view = this.createView(current, prev, extra);
            commonViews.set(current.url, view);
        }
        // 设置 options
        // TODO
        // remove zepto dep
        var opt = $.extend({}, this.commonViewOptions, current.options && current.options.view);
        // 渲染框架
        view.renderFrame(opt);
        view.vw.performance.requestStart = Date.now();
        view.setTemplateStream(this.createTemplateStream(current, extra));
        // 检查动画
        view.enterAnimate = false;
        var skipAllAnimation = current && current.options && current.options.skipAllAnimation;
        var src = current && current.options && current.options.src;
        if (!skipAllAnimation && src !== 'history' && src !== 'back' && src !== 'sync') {
            // 普通入场
            view.enterAnimate = true;
        }
        else if (!current && !prev) {
            // 无参数入场（为啥会无参数？？）
            view.enterAnimate = true;
        }

        // 如果有，则从 extra 中读取动画函数，并替换 view 中的相关函数
        // 使得用户可以自定义进退场动画
        if (extra) {
            if (typeof extra.enterAnimation === 'function') {
                view.startEnterAnimate = extra.enterAnimation;
            }

            if (typeof extra.exitAnimation === 'function') {
                view.startExitAnimate = extra.exitAnimation;
            }
        }

        return view.startEnterAnimate(current, prev, extra);
    };

    commonService.attach = function (current, prev, extra) {
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            return;
        }
        if (current.url === this.syncPageUrl) {
            return;
        }
        var view = commonViews.get(current.url);
        // 修复 iOS 下动画闪烁的问题，在 renderStream 前 scroll
        scrollTo(0, 0);
        // 此处没有 return promise，因为这样会阻塞生命周期导致无法回退，故让 render 不受生命周期控制
        view.render()
        .then(function () {
            return view.attach();
        })
        .catch(function (err) {
            var code = err.status;
            if ((typeof code) !== 'number') {
                code = err.code || 901;
            }
            console.error('RenderError, redirecting...', err);
            if (current.options.src !== 'sync') {
                var query = location.search + (location.search ? '&' : '?');
                query += 'sfr_fb=' + code;

                var url = location.protocol + '//' + location.host
                    + location.pathname + query + location.hash;
                location.replace(url);
            }
        });
    };

    commonService.update = function (state, trans) {
        var view = commonViews.get(state.url);
        return view.update(state, trans);
    };

    commonService.detach = function (current, prev, extra) {
        var view = commonViews.get(prev.url);
        // 容器页
        if (!view) {
            return;
        }
        return view.detach();
    };

    commonService.destroy = function (current, prev, extra) {
        var view = commonViews.get(prev.url);
        // 容器页
        if (!view) {
            $('#sfr-app .sfr-sync-page').hide();
            return;
        }
        var useDOMCache = prev && prev.options && prev.options.useDOMCache;
        // var animationFunction = view.startExitAnimate
        view.exitAnimate = false;
        var skipAllAnimation = current && current.options && current.options.skipAllAnimation;
        var src = current && current.options && current.options.src;
        if (!skipAllAnimation && src === 'back') {
            view.exitAnimate = true;
        }
        else if (!current && !prev) {
            view.exitAnimate = true;
        }

        return view.startExitAnimate(current, prev, extra)
        .then(function () {
            if (!useDOMCache) {
                view.removeDom();
                commonViews.remove(prev.url);
            }
            else {
                view.hideView();
            }
        });
    };

    commonService.getContainer = function (current) {
        var view = commonViews.get(current.url);
        return view.$container;
    };

    var CommonService = function () {};
    CommonService.prototype = commonService;
    CommonService.prototype.constructor = CommonService;
    return CommonService;
});
