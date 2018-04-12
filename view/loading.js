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

    /**
     * Loading animation
     *
     * @class
     * @param {HTMLElement} parent the element to attach loading dom to
     */
    function Loading(parent) {
        this.container = parent;
        this.element = dom.elementFromString(html);
    }

    Loading.prototype.show = function () {
        dom.css(this.container, {'background-color': '#fff'});
        this.container.appendChild(this.element);
    };

    Loading.prototype.hide = function () {
        dom.css(this.container, {'background-color': ''});
        dom.removeNode(this.element);
    };

    return Loading;
});
