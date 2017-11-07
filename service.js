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
    var http = rt.http;

    function Service(url, options) {
        this.options = parse(options);
    }

    Service.prototype.beforeAttach = function (current) {
        _.assign(this.options, parse(current.options));

        if (this.view) {
            this.view.reuse();
        }
        else if (isServerRendered(current)) {
            var rootEl = document.querySelector('#sfr-app .rt-view')
            this.view = new View(this.options, rootEl);
        }
        else {
            this.view = new View(this.options);
            this.view.fetchUrl(current.url);
        }

        return this.view.enter(shouldEnterAnimate(current));
    };

    Service.prototype.attach = function (current) {
        var view = this.view;

        return Promise.resolve()
        .then(function () {
            return view.populated ? '' : view.render();
        })
        .then(function () {
            view.resetStyle();
            return view.attach();
        });
    };

    Service.prototype.beforeDetach = function (current) {
        return this.view.prepareExit(shouldExitAnimate(current));
    };

    Service.prototype.detach = function (current, prev, extra) {
        var view = this.view;
        return view
        .exit(shouldExitAnimate(current))
        .then(function () {
            view.detach();
        })
        .then(function () {
            view.trigger('rt.detached');
        });
    };

    Service.prototype.destroy = function () {
        return this.view.destroy();
    };

    function shouldEnterAnimate(state) {
        if (isServerRendered(state)) {
            return false;
        }
        var reason = _.get(state, 'options.src');
        return reason === '' || reason === 'hijack';
    }

    function shouldExitAnimate(state) {
        var reason = _.get(state, 'options.src');
        return reason === 'back';
    }

    function isServerRendered(state) {
        return _.get(state, 'options.src') === 'sync'
    }

    function parse(options) {
        if (!options) {
            return {};
        }
        return _.assign({}, options.view, options.head);
    }

    return Service;
});
