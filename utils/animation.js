/**
 * @file page animation
 * @author taoqingqian01
 * */
define(function (require) {
    var Naboo = require('./naboo');
    var UA = require('./ua');
	var dom = require('./dom');
    var Spark = require('./spark');
    var exports = {duration: '300', ease: 'ease', delay: 'delay'};

    Naboo.register('enter', function (next, el, sx, sy) {
        dom.css(el, {
            'display': 'block',
            'position': 'fixed',
            'z-index': '502',
            'top': 0,
            'left': 0,
            'height': '100%',
            'width': '100%',
            'overflow': 'hidden',
            'opacity': 0,
            '-webkit-transform': translate3d('100%', 0, 0),
            'transform': translate3d('100%', 0, 0)
        });
        el.scrollLeft = sx;
        el.scrollTop = sy;
        dom.css(el.querySelector('.rt-head'), {
            'z-index': '503',
            'top': sy + 'px'
        });
        Spark.css3(el, {
            'opacity': 1,
            '-webkit-transform': translate3d(0, 0, 0),
            'transform': translate3d(0, 0, 0)
        }, exports.duration, exports.ease, exports.delay, next);
    });

    Naboo.register('prepareExit', function (next, el, sx, sy) {
        dom.css(el, {
            'position': 'fixed',
            'z-index': 502,
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
            el.scrollLeft = sx;
            el.scrollTop = sy;
            dom.css(el.querySelector('.rt-head'), {
                'position': 'absolute',
                'top': sy + 'px'
            });
        }
        next();
    });

    Naboo.register('exit', function (next, el, sx, sy) {
        Spark.css3(el, {
            'opacity': 0,
            'left': '100%',
            '-webkit-transform': translate3d('100%', 0, 0),
            'transform': translate3d('100%', 0, 0)
        }, exports.duration, exports.ease, exports.delay, function () {
            dom.css(el, { 'display': 'none' });
            next();
        });
    });

    function shouldScrollFixed () {
        return UA.isWKWebView() && !UA.isBaidu();
    }
    function translate3d(x, y, z) {
        if (typeof x === 'number') {
            x += 'px'
        }
        if (typeof y === 'number') {
            y += 'px'
        }
        if (typeof z === 'number') {
            z += 'px'
        }
        return 'translate3d(' + x + ',' + y + ',' + z + ')';
    }

    return exports;
});
