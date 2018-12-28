/**
 * @file Spark 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var Spark = require('utils/spark');

    describe('utils/spark', function() {
        it('async load modules', function () {
            describe('#dispose()', function () {
                it('should return dispose status', function () {
                    Spark.dispose();
                    expect(Spark.disposed).to.be.ok;
                });
            });
            describe('#css3()', function () {
                it('should show css3 animation with property string', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var property = '@-webkit-keyframes mymove {from { top: 0px;} to {top:2 00px;}}';
                    var duration = 500;
                    var ease = 'ease';
                    var delay = 0;
                    view.style.opacity = '';
                    var animation = function (el, property, duration, ease, delay) {
                        return new Promise(function (resolve) {
                            Spark.css3(el, property, duration, ease, delay, resolve);
                        });
                    };
                    var promise = animation(view, property, duration, ease, delay);
                    promise.then(function () {
                        expect(view.style.animationFillMode).to.be.equal('both');
                        done();
                    });
                });
            });
            describe('#js()', function () {
                it('should show js animation', function (done) {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var property = {
                        'opacity': 1
                    };
                    var duration = 500;
                    var Ease = [ 'easeIn', 'easeOut', 'easeInOut' ];
                    var Tween = [ 'Linear', 'Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Expo', 'Circ', 'Elastic', 'Back', 'Bounce' ];
                    var delay = 0;
                    Tween.forEach(tw => {
                        Ease.forEach(ea => {
                            view.style.opacity = '';
                            var animation = function (el, property, duration, tween, ease, delay) {
                                return new Promise(function (resolve) {
                                    Spark.js(el, property, duration, tween, ease, delay, resolve);
                                });
                            };
                            var promise = animation(view, property, duration, tw, ea, delay);
                            promise.then(function () {
                                expect(view.style.opacity).to.be.equal('1');
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});