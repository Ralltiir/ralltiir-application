/**
 * @file DOM 测试用例
 * @author duxiaonan(duxiaonan@baidu.com)
 */

define(function (require) {
    var DOM = require('utils/dom');

    describe('utils/dom', function() {
        it('async load modules', function () {
            describe('#removeNode()', function () {
                it('should remove node if exist', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl');
                    var child = node.childNodes[0];
                    DOM.removeNode(child);
                    expect(node.innerHTML).to.be.equal('<span>Tea</span><span>Milk</span>');
                });
                it('should not remove node if not exist', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-2');
                    var child = document.createElement('DIV');
                    DOM.removeNode(child);
                    expect(node.innerHTML).to.be.equal('<span>Coffee</span><span>Tea</span><span>Milk</span>');
                });
            });
            describe('#closest()', function () {
                it('should return closest ancestor element', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    var child = node.childNodes[1];
                    var predict = function (parent) {
                        // according request...
                        if (parent.parentNode && parent.parentNode.tagName !== 'BODY') {
                            return false;
                        } else {
                            return true;
                        }
                    };
                    expect(DOM.closest(child, predict).innerHTML).to.be.equal('<span>Coffee</span><span>Tea</span><span>Milk</span>');
                });
                it('should not return sibling element', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    var child = node.childNodes[1];
                    var predict = function (parent) {
                        // according request...
                        if (parent.parentNode && parent.parentNode.tagName !== 'BODY') {
                            return false;
                        } else {
                            return true;
                        }
                    };
                    expect(DOM.closest(child, predict).innerHTML).to.not.equal('<span>Coffee</span>');
                });
                it('should return self element', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    var predict = function (parent) {
                        // according request...
                        if (parent.parentNode && parent.parentNode.tagName !== 'BODY') {
                            return false;
                        } else {
                            return true;
                        }
                    };
                    expect(DOM.closest(node, predict).innerHTML).to.be.equal('<span>Coffee</span><span>Tea</span><span>Milk</span>');
                });
            });
            describe('#addClass()', function () {
                it('should add class for empty className', function () {
                    var el = {
                        className: ''
                    };
                    DOM.addClass(el, 'foo-bar');
                    expect(el.className).to.be.equal(' foo-bar');
                });
                it('should add class with class list', function () {
                    var el = {
                        className: 'foo bar'
                    };
                    DOM.addClass(el, 'foo-bar');
                    expect(el.className).to.be.equal('foo bar foo-bar');
                });
                it('should not add if already exist', function () {
                    var el = {
                        className: 'foo foo-bar bar'
                    };
                    DOM.addClass(el, 'foo-bar');
                    expect(el.className).to.be.equal('foo foo-bar bar');
                });
            });
            describe('#removeClass()', function () {
                it('should remove class for empty className', function () {
                    var el = {
                        className: 'foo bar'
                    };
                    DOM.removeClass(el, '');
                    expect(el.className).to.be.equal('foo bar');
                });
                it('should remove class with class list', function () {
                    var el = {
                        className: 'foo foo-bar bar'
                    };
                    DOM.removeClass(el, 'foo-bar bar');
                    expect(el.className).to.be.equal('foo');
                });
                it('should not remove if not exist', function () {
                    var el = {
                        className: 'foo bar'
                    };
                    DOM.removeClass(el, 'foo-bar');
                    expect(el.className).to.be.equal('foo bar');
                });
            });
            describe('#elementFromString()', function () {
                it('should get first element from string', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var html = document.getElementById('tpl-3').innerHTML;
                    expect(DOM.elementFromString(html).innerText).to.be.equal('Coffee');
                });
                it('should get undefined from empty string', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var html = '';
                    expect(DOM.elementFromString(html)).to.be.equal(undefined);
                });
            });
            describe('#wrapElementFromString()', function () {
                it('should wrap element from string', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var html = document.getElementById('tpl-3').innerHTML;
                    expect(DOM.wrapElementFromString(html).innerHTML).to.be.equal('<span>Coffee</span><span>Tea</span><span>Milk</span>');
                });
                it('should wrap element from empty string', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var html = '';
                    expect(DOM.wrapElementFromString(html).innerHTML).to.be.equal('');
                });
            });
            describe('#trigger()', function () {
                it('should trigger custom event', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    var type = 'drink';
                    var options = {
                        url: 'https://m.baidu.com/',
                        bubbles: true
                    };
                    var beverage = 'Coffee';
                    document.addEventListener(type, function () {
                        beverage = 'Tea';
                    });
                    DOM.trigger(node, type, options);
                    expect(beverage).to.be.equal('Tea');
                });
                it('should not trigger uncorrect custom event', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    var type = 'drink';
                    var options = {
                        url: 'https://m.baidu.com/',
                        bubbles: true
                    };
                    var beverage = 'Coffee';
                    document.addEventListener('eat', function () {
                        beverage = 'Tea';
                    });
                    DOM.trigger(node, type, options);
                    expect(beverage).to.be.equal('Coffee');
                });
            });
            describe('#css()', function () {
                it('should add style with obj', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    node.style.font = 'italic bold 20px arial,serif';
                    node.style.color = '#000';
                    var obj = {
                        border: '1px solid rgb(238, 238, 238)',
                        backgroundColor: 'fff'
                    };
                    DOM.css(node, obj);
                    expect(node.style.border).to.be.equal('1px solid rgb(238, 238, 238)');
                });
                it('should not add style with uncorrect obj', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-3');
                    node.style.font = 'italic bold 20px arial,serif';
                    node.style.color = '#000';
                    var obj = {
                        border: '1px solid rgb(238, 238, 238)'
                    };
                    DOM.css(node, obj);
                    expect(node.style.backgroundColor).to.not.equal('rgb(255, 255, 255)');
                });
            });
            describe('#show()', function () {
                it('should show element with display block', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-4');
                    node.style.display = 'inline';
                    DOM.show(node);
                    expect(node.style.display).to.be.equal('block');
                });
                it('should not show element with display inline', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-4');
                    DOM.show(node);
                    expect(node.style.display).to.not.equal('inline');
                });
            });
            describe('#hide()', function () {
                it('should show element with display none', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-5');
                    DOM.hide(node);
                    expect(node.style.display).to.be.equal('none');
                });
                it('should not show element with display block', function () {
                    document.body.innerHTML = window.__html__['test/utils/template.html'];
                    var node = document.getElementById('tpl-5');
                    node.style.display = 'block';
                    DOM.hide(node);
                    expect(node.style.display).to.not.equal('block');
                });
            });
        });
    });
});