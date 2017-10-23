/**
 * 通用 service
 *
 * @file    service.js
 * @author  harttle<harttle@harttle.com>
 */
define(function (require) {
    var rt = require('ralltiir');
    var Promise = rt.promise;
    var View = require('./view/view');
    var _ = rt._;

    function Service(url, options) {
        this.options = parse(options);
    }

    function parse(options) {
        if (!options) return {};

        if (options.head) {
            console.warn('use options.view instead of options.head');
            options.view = options.head;
        }
        return options;
    }

    Service.prototype.beforeAttach = function (current) {
        var options = parse(current.options);
        if (_.get(current, 'options.src') === 'sync') {
            this.view = View.parse(
                current.options.view,
                document.querySelector('#sfr-app .rt-view')
            );
            this.view.prepareRender();
            return;
        }

        if (this.view && this.view.rendered) {
            this.view.reAttach();
        }
        else {
            var viewOpts = _.defaultsDeep(
                options.view,
                this.options.view
            );
            this.view = new View(viewOpts);
            this.view.setTemplateStream(View.createTemplateStream(current.url));
        }

        // 检查动画
        this.view.enterAnimate = false;
        var skipAnimation = _.get(current, 'options.skipAnimation');
        var src = _.get(current, 'options.src');
        if (!skipAnimation && src !== 'history' && src !== 'back' && src !== 'sync') {
            // 普通入场
            this.view.enterAnimate = true;
        }
        return this.view.startEnterAnimate();
    };

    Service.prototype.attach = function (current) {
        var view = this.view;
        // 同步页首次加载，首屏dom放入sfview
        if (current.options && current.options.src === 'sync') {
            view.attach();
            return;
        }
        // 此处没有 return promise，因为这样会阻塞生命周期导致无法回退，故让 render 不受生命周期控制
        Promise.resolve()
        .then(function () {
            if (view.rendered) {
                view.prepareRender();
            }
            else {
                // 修复 iOS 下动画闪烁的问题，在 renderStream 前 scroll
                scrollTo(0, 0);
                return view.render();
            }
        })
        .then(function () {
            return view.attach();
        })
        .catch(function (err) {
            // eslint-disable-next-line
            console.error('RenderError, redirecting...', err);
            if (current.options.src !== 'sync') {
                location.replace(location.href);
            }
        });
    };

    Service.prototype.beforeDetach = function (current, prev) {
        return this.view.beforeDetach(current, prev);
    };

    Service.prototype.detach = function (current, prev, extra) {
        var view = this.view;
        view.exitAnimate = false;
        var skipAnimation = _.get(current, 'options.skipAnimation');
        var src = _.get(current, 'options.src');
        if (!skipAnimation && src === 'back') {
            view.exitAnimate = true;
        }

        // 修复退场时，页面跳动的问题；还原滚动位置的时机比较诡异，需要在动画做之前搞定。
        // TODO: 增加生命周期来完整这个工作
        _.get(current, 'service.view.restoreScrollState') && current.service.view.restoreScrollState();

        return view.startExitAnimate(current, prev, extra)
        .then(function () {
            view.detach();
        });
    };

    Service.prototype.destroy = function () {
        return this.view.destroy();
    };

    Service.instancEnabled = true;

    return Service;
});
