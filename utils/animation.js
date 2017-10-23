/**
 * @file page animation
 * @author taoqingqian01
 * */
define(function (require) {
    var Naboo = require('./naboo');
	var dom = require('./dom')
    var Spark = require('./spark');
    Naboo.register('enter', function (next, el, duration, ease, delay) {
        dom.css(el, {
            'display': 'block',
            'position': 'fixed',
            'top': 0,
            'left': 0,
            'height': '100%',
            'overflow': 'hidden',
            'opacity': 0,
            '-webkit-transform': 'translate3d(100%, 0, 0)',
            'transform': 'translate3d(100%, 0, 0)'
        });
        Spark.css3(el, {
            'opacity': 1,
            '-webkit-transform': 'translate3d(0, 0, 0)',
            'transform': 'translate3d(0, 0, 0)'
        }, duration, ease, delay, function () {
            // 设为 static 的动作需要在动画结束后且原页面已销毁时进行操作
            // 否则会导致页面滚动位置的跳动
            next();
        });
    });

    Naboo.register('exit', function (next, el, duration, ease, delay) {
        dom.css(el, {
            'position': 'fixed',
            'top': 0,
            'left': 0,
            'height': '100%',
            'overflow': 'hidden',
            'opacity': 1,
            '-webkit-transform': 'translate3d(0, 0, 0)',
            'transform': 'translate3d(0, 0, 0)'
        });
        Spark.css3(el, {
            'opacity': 0,
            '-webkit-transform': 'translate3d(100%, 0, 0)',
            'transform': 'translate3d(100%, 0, 0)'
        }, duration, ease, delay, function () {
            dom.css(el, {
                'display': 'none',
                'overflow': 'auto',
                'position': 'static',
                '-webkit-transform': 'none',
                'transform': 'none'
            });
            next();
        });
    });
});
