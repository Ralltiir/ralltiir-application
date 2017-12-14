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
        this.options = normalize(options);
    }

    Service.prototype.beforeAttach = function (current) {
        _.assign(this.options, normalize(current.options));

        if (this.view && this.view.valid) {
            this.view.reuse();
        }
        else if (isServerRendered(current)) {
            var rootEl = document.querySelector('#sfr-app .rt-view');
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
        view.setActive();

        return Promise.resolve()
        .then(function () {
            return view.populated ? '' : view.render();
        })
        .then(function () {
            view.setAttached();
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
            view.setDetached();
        });
    };

    Service.prototype.destroy = function () {
        return this.view.destroy();
    };

    Service.setBackHtml = function (html) {
        View.backHtml = html;
    };

    function shouldEnterAnimate(state) {
        if (isServerRendered(state)) {
            return false;
        }
        var reason = _.get(state, 'options.src');
        return !reason || reason === 'hijack';
    }

    function shouldExitAnimate(state) {
        var reason = _.get(state, 'options.src');
        return reason === 'back';
    }

    function isServerRendered(state) {
        return _.get(state, 'options.src') === 'sync';
    }

    function normalize(options) {
        if (!options) {
            return {};
        }
        options = _.assign({}, options, options.view, options.head);

        if (_.isString(options.title)) {
            options.title = {html: options.title};
        }
        if (_.isString(options.subtitle)) {
            options.subtitle = {html: options.subtitle};
        }
        if (_.isString(options.back)) {
            options.back = {html: options.back};
        }
        _.forEach(options.actions, function (action, i) {
            if (_.isString(action)) {
                options.actions[i] = {html: action};
            }
        });
        return options;
    }

    return Service;
});
