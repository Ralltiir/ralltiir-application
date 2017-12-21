/**
 * @file page animation
 * @author taoqingqian01
 * */
define(function (require) {
    var UA = require('./ua');
    var _ = require('ralltiir')._;
    var dom = require('./dom');
    var Spark = require('./spark');
    var config = require('../config');
    var exports = {};

    exports.enter = function (el, sx, sy) {
        dom.css(el, {
            'display': 'block',
            'position': 'fixed',
            'z-index': '600',
            'top': 0,
            'left': 0,
            'height': '100%',
            'width': '100%',
            'overflow': 'hidden',
            'opacity': 0,
            '-webkit-transform': translate3d('100%', 0, 0),
            'transform': translate3d('100%', 0, 0)
        });
        restoreFixedPosition(el, sx, sy);
        return new Promise(function (resolve) {
            Spark.css3(el, {
                'opacity': 1,
                '-webkit-transform': translate3d(0, 0, 0),
                'transform': translate3d(0, 0, 0)
            }, config.duration, config.animationEase, 0, resolve);
        });
    };

    function restoreFixedPosition(el, sx, sy) {
        el.scrollLeft = sx;
        el.scrollTop = sy;
        dom.css(el.querySelector('.rt-head'), {
            'z-index': '610',
            'top': (sy || 0) + 'px'
        });
        _.forEach(el.querySelectorAll('.rt-fixed'), function (el) {
            dom.css(el, {'display': 'none'});
        });
    }

    exports.prepareExit = function (el, sx, sy) {
        dom.css(el, {
            'position': 'fixed',
            'z-index': '600',
            'top': 0,
            'left': 0,
            'opacity': 1,
            'height': '100%',
            'width': '100%',
            'overflow': 'hidden',
            '-webkit-transform': translate3d(0, 0, 0),
            'transform': translate3d(0, 0, 0)
        });
        if (shouldScrollFixed()) {
            restoreFixedPosition(el, sx, sy);
        }
    };

    exports.exit = function (el, sx, sy) {
        return new Promise(function (resolve) {
            Spark.css3(el, {
                'opacity': 0,
                'left': '100%',
                '-webkit-transform': translate3d('100%', 0, 0),
                'transform': translate3d('100%', 0, 0)
            }, config.duration, config.animationEase, 0, function () {
                dom.css(el, {'display': 'none'});
                resolve();
            });
        });
    };

    exports.exitSilent = function (el) {
        dom.css(el, {
            'display': 'none'
        });
        return Promise.resolve();
    };

    exports.resetStyle = function (viewEl) {
        dom.css(viewEl, {
            'display': '',
            'opacity': '',
            'position': '',
            'z-index': '',
            'top': '',
            'left': '',
            'height': '',
            'width': '',
            'overflow': '',
            '-webkit-transform': '',
            'transform': ''
        });
        dom.css(viewEl.querySelector('.rt-head'), {
            'z-index': '',
            'position': '',
            'top': ''
        });
        _.forEach(viewEl.querySelectorAll('.rt-fixed'), function (el) {
            dom.css(el, {'display': ''});
        });
    };

    function shouldScrollFixed() {
        if (!UA.isIOS) {
            return true;
        }
        return UA.isWKWebView && !UA.isBaidu;
    }
    function translate3d(x, y, z) {
        x = x ? x : 0;
        y = y ? y : 0;
        z = z ? z : 0;
        if (typeof x === 'number') {
            x += 'px';
        }
        if (typeof y === 'number') {
            y += 'px';
        }
        if (typeof z === 'number') {
            z += 'px';
        }
        return 'translate3d(' + x + ',' + y + ',' + z + ')';
    }

    return exports;
});
