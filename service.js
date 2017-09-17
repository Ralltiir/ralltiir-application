/**
 * 通用 service
 *
 * @file    service.js
 * @author  lizhaoming
 */
define(function (require) {
    console.log('v3===================');
    var rt = require('ralltiir');
    var CommonView = require('./view/view');
    var Cache = rt.cache;
    var http = rt.http;
    var _ = rt._;

    function Service() {
        this.view = new CommonView();
    };

    Service.prototype.beforeAttach = function (current) {
        var view = this.view;
        if (_.get(current, 'options.src') === 'sync') {
            view.parse($('#sfr-app .rt-view'));
            view.prepareRender();
            return
        }

        if (view.rendered) {
            view.reAttach();
        }
        else {
            view.renderFrame(current.options);
            view.setTemplateStream(createTemplateStream(current.url));
        }

        // 检查动画
        view.enterAnimate = false;
        var skipAnimation = _.get(current, 'options.skipAnimation');
        var src = _.get(current, 'options.src');
        if (!skipAnimation && src !== 'history' && src !== 'back' && src !== 'sync') {
            // 普通入场
            view.enterAnimate = true;
        }
        return view.startEnterAnimate();
    };

    Service.prototype.attach = function (current) {
        var view = this.view;
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            view.attach();
            return;
        }
        // 修复 iOS 下动画闪烁的问题，在 renderStream 前 scroll
        scrollTo(0, 0);
        // 此处没有 return promise，因为这样会阻塞生命周期导致无法回退，故让 render 不受生命周期控制
        
        var p = view.rendered ? Promise.resolve() : view.render();
        p
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
                query += 'rt_fb=' + code;

                var url = location.protocol + '//' + location.host
                    + location.pathname + query + location.hash;
                location.replace(url);
            }
        });
    };

    Service.prototype.partialUpdate = function (url, options) {
        var view = options.page.view;
        var resource = createTemplateStream(url, {
            'x-rt-partial': 'true',
            'x-rt-selector': options.from || ':root'
        });
        return view.partialUpdate(resource, options);
    };

    Service.prototype.beforeDetach = function (current, prev) {
        return this.view.beforeDetach();
    };

    Service.prototype.detach = function (current, prev, extra) {
        var view = this.view;
        var self = this;
        view.exitAnimate = false;
        var skipAnimation = _.get(current, 'options.skipAnimation');
        var src = _.get(current, 'options.src');
        if (!skipAnimation && src === 'back') {
            view.exitAnimate = true;
        }

        return view.startExitAnimate(current, prev, extra)
        .then(function () {
            view.detach();
        });
    };

    Service.prototype.destroy = function () {
        return this.view.destroy();
    };

    Service.instancEnabled = true;

    function createTemplateStream (url, headers) {
        return http.ajax(url, {
            headers: _.assign(headers, {
                'x-rt': 'true'
            }),
            xhrFields: {
                withCredentials: true
            }
        });
    };

    return Service;
});
