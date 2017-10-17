/**
 * @file    载入动画
 * @author  harttle@harttle.com
 */

define(function (require) {
    var dom = require('../utils/dom');

    var html = [
        '<div class="rt-loading">',
        '  <span class="rt-loading-logo"></span>',
        '  <span class="rt-loading-bar"></span>',
        '</div>'
    ].join('\n');

    function Loading () {
        this.element = dom.elementFromString(html);
    }

    Loading.prototype.show = function (parent) {
        parent.appendChild(this.element);
    }

    Loading.prototype.hide = function () {
        this.element.remove();
    }

    return Loading;
});
