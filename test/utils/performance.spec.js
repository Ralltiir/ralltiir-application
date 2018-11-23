/**
 * @file Performance 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var Performance = require('utils/performance');

    describe('utils/performance', function() {
        it('async load modules', function () {
            describe('#startNavigation()', function () {
                it('key should be equal to object', function () {
                    var performance = new Performance();
                    performance.startNavigation();
                    var now = Date.now();
                    expect(performance.navigationStart).to.be.at.most(now);
                });
            });
        });
    });
});
