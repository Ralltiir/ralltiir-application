/**
 * 通用 service
 *
 * @file    service.js
 * @author  lizhaoming
 */
define(function (require) {
    var rt = require('ralltiir');
    var CommonView = require('./view/view');
    var BaseService = rt.service;
    var Cache = rt.cache;
    var viewCache = Cache.create('viewCache');
    var commonService = new BaseService();
    var http = rt.http;
    var _ = rt._;

    commonService.createTemplateStream = function (url) {
        var i = url.indexOf('#');
        if (i > -1) {
            url = url.substr(0, i);
        }
        url += url.indexOf('?') > -1 ? '&' : '?';
        url += 'async=true';

        return http.ajax(url, {
            xhrFields: {
                withCredentials: true
            }
        });
    };

    commonService.create = function (current, prev, extra) {
        // 获取 view 实例
        var view = viewCache.get(current.url);
        if (!view) {
            view = new CommonView();
            viewCache.set(current.url, view);
        }
        current.page.view = view;
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            this.syncPageUrl = current.url;
            view.parse($('#sfr-app .rt-view'));
            view.prepareRender();
            return;
        }
        var opt = _.assign({}, this.commonViewOptions, current.options && current.options.view);
        // 渲染框架
        view.renderFrame(opt);
        view.vw.performance.requestStart = Date.now();
        view.setTemplateStream(this.createTemplateStream(current.url));
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
        var view = viewCache.get(current.url);
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
            // eslint-disable-next-line
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

    commonService.partialUpdate = function (url, options) {
        var view = options.page.view;
        var resource = this.createTemplateStream(url);
        return view.partialUpdate(resource, options);
    };

    commonService.detach = function (current, prev, extra) {
        var view = viewCache.get(prev.url);
        // 容器页
        if (!view) {
            return;
        }
        return view.detach();
    };

    commonService.destroy = function (current, prev, extra) {
        var view = viewCache.get(prev.url);
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
                viewCache.remove(prev.url);
            }
            else {
                view.hideView();
            }
        });
    };

    commonService.getContainer = function (current) {
        var view = viewCache.get(current.url);
        return view.$container;
    };

    /**
     * CommonService wrapper
     *
     * @class
     */
    var CommonService = function () {};
    CommonService.prototype = commonService;
    CommonService.prototype.constructor = CommonService;
    return CommonService;
});
