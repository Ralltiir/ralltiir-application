/**
 * @file UA 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

// 模拟浏览器环境
var requirejs = require('requirejs');
requirejs.config({nodeRequire: require});
// global.window = {
//     navigator: {
//         userAgent: 'fdasf'
//     }
// };
// global.navigator = global.window.navigator;
//
// requirejs.config({
//     baseUrl: ''
// });

describe('utils/ua', function () {
    it('async load modules', function () {
        requirejs(['../../utils/ua', 'chai'], function (UA, chai) {
            describe('ua', function () {
                it('should return isIOS boolean value', function () {
                    var ua = navigator.userAgent;
                    var isIOS = /(iPad|iPhone|iPod)/.test(ua);
                    chai.expect(UA.isIOS).to.be.equal(isIOS);
                });
                it('should return isWKWebView boolean value', function () {
                    var ua = navigator.userAgent;
                    var match = ua.match(/ applewebkit\/(\d+)/i);
                    var awVersion = match && parseFloat(match[1]);
                    var isWKWebView = +awVersion > 600;
                    chai.expect(UA.isWKWebView).to.be.equal(isWKWebView);
                });
                it('should return isBaidu boolean value', function () {
                    var ua = navigator.userAgent;
                    var isBaidu = /baiduboxapp|baiduhi/.test(ua);
                    chai.expect(UA.isBaidu).to.be.equal(isBaidu);
                });
            });
        });
    });
});

// describe('utils/ua', function () {
//     it('async load modules', function (done) {
//         requirejs(['utils/ua', 'chai'], function (UA, chai) {
//             describe('ua', function () {
//                 it('should return isIOS boolean value', function () {
//                     var ua = navigator.userAgent;
//                     var isIOS = /(iPad|iPhone|iPod)/.test(ua);
//                     chai.expect(UA.isIOS).to.be.equal(isIOS);
//                 });
//                 it('should return isWKWebView boolean value', function () {
//                     var ua = navigator.userAgent;
//                     var match = ua.match(/ applewebkit\/(\d+)/i);
//                     var awVersion = match && parseFloat(match[1]);
//                     var isWKWebView = +awVersion > 600;
//                     chai.expect(UA.isWKWebView).to.be.equal(isWKWebView);
//                 });
//                 it('should return isBaidu boolean value', function () {
//                     var ua = navigator.userAgent;
//                     var isBaidu = /baiduboxapp|baiduhi/.test(ua);
//                     chai.expect(UA.isBaidu).to.be.equal(isBaidu);
//                 });
//                 done();
//             });
//         });
//     });
// });