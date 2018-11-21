/**
 * @file UA 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var UA = require('utils/ua');

    describe('utils/ua', function () {
        it('async load modules', function () {
            describe('ua', function () {
                it('should return isIOS boolean value', function () {
                    var ua = navigator.userAgent;
                    var isIOS = /(iPad|iPhone|iPod)/.test(ua);
                    expect(UA.isIOS).to.be.equal(isIOS);
                });
                it('should return isWKWebView boolean value', function () {
                    var ua = navigator.userAgent;
                    var match = ua.match(/ applewebkit\/(\d+)/i);
                    var awVersion = match && parseFloat(match[1]);
                    var isWKWebView = +awVersion > 600;
                    expect(UA.isWKWebView).to.be.equal(isWKWebView);
                });
                it('should return isBaidu boolean value', function () {
                    var ua = navigator.userAgent;
                    var isBaidu = /baiduboxapp|baiduhi/.test(ua);
                    expect(UA.isBaidu).to.be.equal(isBaidu);
                });
            });
        });
    });
});
