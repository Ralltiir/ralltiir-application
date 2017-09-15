/**
 * 通用 service
 *
 * @file    service.js
 * @author  lizhaoming
 */
define(function (require) {
    var rt = require('ralltiir');
    var CommonView = require('./view/view');
    var Cache = rt.cache;
    var http = rt.http;
    var _ = rt._;

    /**
     * page dispatch service
     *
     * @class
     */
    var Service = function (options) {};

    Service.prototype.constructor = Service;

    Service.prototype.create = function (current, prev, extra) {
        var view = current.page.view;
        if (!view) {
            view = new CommonView();
            current.page.view = view;
        }
        var ret;
        if (current.options && current.options.src === 'sync') {
            view.parse($('#sfr-app .rt-view'));
            view.prepareRender();
        }
        else {
            var opt = _.assign({}, _.get(current, 'options'));
            // 渲染框架
            view.renderFrame(opt);
            view.vw.performance.requestStart = Date.now();
            view.setTemplateStream(createTemplateStream(current.url));
            // 检查动画
            view.enterAnimate = false;
            var skipAllAnimation = _.get(current, 'options.skipAllAnimation');
            var src = _.get(current, 'options.src');
            if (!skipAllAnimation && src !== 'history' && src !== 'back' && src !== 'sync') {
                // 普通入场
                view.enterAnimate = true;
            }
            ret = view.startEnterAnimate(current, prev, extra);
        }
        return ret;
    };

    Service.prototype.attach = function (current, prev, extra) {
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            return;
        }
        var view = current.page.view;
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

    Service.prototype.partialUpdate = function (url, options) {
        var view = options.page.view;
        var resource = createTemplateStream(url);
        return view.partialUpdate(resource, options);
    };

    Service.prototype.detach = function (current, prev, extra) {
        var view = prev.page.view;
        if (!view) { // 容器页
            return;
        }
        return view.detach();
    };

    Service.prototype.destroy = function (current, prev, extra) {
        var view = prev.page.view;
        view.exitAnimate = false;
        var skipAllAnimation = _.get(current, 'options.skipAllAnimation');
        var src = _.get(current, 'options.src');
        if (!skipAllAnimation && src === 'back') {
            view.exitAnimate = true;
        }

        return view.startExitAnimate(current, prev, extra)
        .then(function () {
            view.removeDom();
            prev.page.view = null;
        });
    };

    Service.prototype.getContainer = function (current) {
        var view = viewCache.get(current.url);
        return view.$container;
    };

    function createTemplateStream (url) {
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

    return Service;
});
