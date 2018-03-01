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
    var Performance = require('./utils/performance');
    var _ = rt._;
    var logger = rt.logger;
    var config = require('./config');

    // eslint-disable-next-line
    function Service(url, options) {
        this.options = normalize(options);
        this.scope = {
            performance: new Performance(),
            options: options
        };
        this.name = this.options.name;
    }

    Service.prototype.hasValidView = function () {
        return this.view && this.view.valid;
    };

    Service.prototype.shouldUseCache = function (current, useAnimation) {
        if (config.cacheDisabled) {
            return false;
        }
        if (this.options.isolateCSS && useAnimation) {
            return false;
        }
        var reason = _.get(current, 'options.src');
        return reason === 'back' || reason === 'history';
    };

    Service.prototype.beforeAttach = function (current) {
        this.scope.performance.startNavigation();
        _.assign(this.options, normalize(current.options));
        var useAnimation = this.shouldEnterAnimate(current);
        logger.debug('service.beforeAttach', this.beforeAttach);

        if (this.shouldUseCache(current, useAnimation) && this.hasValidView()) {
            logger.info('using cached dom for', current.url);
            this.view.reuse();
        }
        else if (isServerRendered(current)) {
            var rootEl = document.querySelector('#sfr-app .rt-view');
            this.view = new View(this.scope, rootEl);
        }
        else {
            this.view = new View(this.scope);
            this.view.fetchUrl(current.url);
        }

        return this.view.enter(useAnimation);
    };

    Service.prototype.shouldEnterAnimate = function (state) {
        if (isServerRendered(state)) {
            return false;
        }
        var reason = _.get(state, 'options.src');
        return !reason || reason === 'hijack';
    };

    Service.prototype.shouldExitAnimate = function (current, prev) {
        if (this.options.isolateCSS) {
            if (!this.name) {
                return false;
            }
            if (this.name !== _.get(current, 'service.name')) {
                return false;
            }
        }
        var reason = _.get(current, 'options.src');
        return reason === 'back';
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
        })
        .catch(function (err) {
            var status = err.status || 901;
            var query = location.search + (location.search ? '&' : '?');

            // eslint-disable-next-line
            console.error(err);
            if (_.get(current, 'options.src') !== 'sync' && query.indexOf('rt-err=') === -1) {
                query += 'rt-err=' + status;
                var url = location.protocol + '//' + location.host
                    + location.pathname + query + location.hash;
                location.replace(url);
            }
        });
    };

    Service.prototype.beforeDetach = function (current, prev) {
        return this.view.prepareExit(this.shouldExitAnimate(current, prev));
    };

    Service.prototype.detach = function (current, prev, extra) {
        var view = this.view;
        return view
        .exit(this.shouldExitAnimate(current, prev))
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

    function isServerRendered(state) {
        return _.get(state, 'options.src') === 'sync';
    }

    function normalize(options) {
        if (!options) {
            return {};
        }
        options = _.cloneDeep(options);
        if (options.view || options.head) {
            // eslint-disable-next-line
            console.warn(
                '[DEPRECATED] options.head, options.view will not be supported in future version',
                'checkout: https://ralltiir.github.io/ralltiir/get-started/view-options.html'
            );
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
