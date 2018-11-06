/**
 * @file URL 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

// 模拟浏览器环境
var requirejs = require('requirejs');
global.window = {
    navigator: {
        userAgent: 'fdasf'
    },
    location: {
        href: 'fdas',
        search: 'fd'
    },
    document: {
        querySelector: function(){ return {} }
    }
};
global.location = global.window.location;

requirejs.config({
    baseUrl: '',
    paths: {
        'ralltiir': 'amd_modules/ralltiir',
        '@searchfe/underscore': 'amd_modules/@searchfe/underscore',
        '@searchfe/assert': 'amd_modules/@searchfe/assert',
        '@searchfe/promise': 'amd_modules/@searchfe/promise'
    }
});

describe('utils/url', function() {
    it('async load modules', function (done) {
        requirejs(['utils/url', 'chai'], function(URL, chai) {
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
                done();
            });
        });
    });
});

