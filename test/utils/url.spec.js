/**
 * @file URL 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

var requirejs = require('requirejs');
requirejs.config({nodeRequire: require});

requirejs(['../../utils/url', 'chai'], function(URL, chai) {
    describe('utils/url', function() {
        describe('#setQuery()', function () {
            it('key should be equal to object', function () {
                chai.expect(URL.setQuery('https://m.baidu.com/', {
                    'rt-partial': 'true',
                    'rt-selector': 'false'
                })).to.be.equal('https://m.baidu.com/?rt-partial=true&rt-selector=false');
            });
            it('key should not be equal to object', function () {
                chai.expect(URL.setQuery('https://m.baidu.com/', 'rt', 'true')).to.be.equal('https://m.baidu.com/?rt=true');
            });
        });
    });
});
