/**
 * @file URL 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var URL = require('utils/url');

    describe('utils/url', function() {
        it('async load modules', function () {
            describe('#setQuery()', function () {
                it('key should be equal to object', function () {
                    expect(URL.setQuery('https://m.baidu.com/', {
                        'rt-partial': 'true',
                        'rt-selector': 'false'
                    })).to.be.equal('https://m.baidu.com/?rt-partial=true&rt-selector=false');
                });
                it('key should not be equal to object', function () {
                    expect(URL.setQuery('https://m.baidu.com/', 'rt', 'true')).to.be.equal('https://m.baidu.com/?rt=true');
                });
            });
        });
    });
});
