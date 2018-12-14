/**
 * @file Animation 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var Animation = require('utils/animation');

    describe('utils/animation', function() {
        it('async load modules', function () {
            describe('#enter()', function () {
                it('should show enter animation', function (done) {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var scrollX = 60;
                    var scrollY = 60;
                    var promise = Animation.enter(view, scrollX, scrollY);
                    promise.then(function () {
                        expect(view.style.opacity).to.be.equal('1');
                        done();
                    });
                });
            });
            describe('#prepareExit()', function () {
                it('should show prepareExit animation', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var head = view.querySelector('.rt-head');
                    var scrollX = 80;
                    var scrollY = 80;
                    Animation.prepareExit(view, scrollX, scrollY);
                    expect(head.style.top).to.be.equal('80px');
                });
            });
            describe('#exit()', function () {
                it('should show exit animation', function (done) {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var scrollX = 100;
                    var scrollY = 100;
                    var promise = Animation.exit(view, scrollX, scrollY);
                    promise.then(function () {
                        expect(view.style.display).to.be.equal('none');
                        done();
                    });
                });
            });
            describe('#exitSilent()', function () {
                it('should show exitSilent animation', function (done) {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    var promise = Animation.exitSilent(view);
                    promise.then(function () {
                        expect(view.style.display).to.be.equal('none');
                        done();
                    });
                });
            });
            describe('#resetStyle()', function () {
                it('should show resetStyle animation', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var view = document.querySelector('.rt-view');
                    view.style.display = 'block';
                    Animation.resetStyle(view);
                    expect(view.style.display).to.be.equal('');
                });
            });
        });
    });
});