define(function (require) {
    var _ = require('ralltiir')._;

    function truthy(val) {
        return !!val;
    }

    function addClass(el, name) {
        var cls = (el.className || '') + ' ' + name;
        var map = {};
        
        cls.split(/\s+/g).forEach(function(cls){
            map[cls] = true;
        });
        el.className = _.keys(map).join(' ');
    }

    function removeClass(el, name) {
        var cls = (el.className || '');
        var map = {};
        
        cls.split(/\s+/g).forEach(function(cls){
            map[cls] = true;
        });

        (name || '').split(/\s+/g).forEach(function(cls){
            delete map[cls];
        });
        el.className = _.keys(map).join(' ');
    }

    function elementFromString(html) {
        return wrapElementFromString(html).childNodes[0];
    }
    function wrapElementFromString(html) {
        var div = document.createElement('div');
        div.innerHTML = html || '';
        return div;
    }
    function trigger(el, type, options) {
        var event = new Event(type);
        _.assign(event, options);
        el.dispatchEvent(event);
    }
    function css(el, obj) {
        var style = {};
        var currStyle = el.getAttribute('style') || ''
        currStyle
            .split(';')
            .forEach(function (statement) {
                var tokens = statement.split(':');
                var key = (tokens[0] || '').trim();
                var val = (tokens[1] || '').trim();
                if (key && val) {
                    style[key] = val;
                }
            })
        _.assign(style, obj);
        var styleText = '';
        _.forOwn(style, function (val, key) {
            styleText += key + ':' + val + ';';
        });
        el.setAttribute('style', styleText);
    }

    function show(el) {
        css(el, {display: 'block'})
    }

    function hide(el) {
        css(el, {display: 'none'})
    }

    return {
        css: css,
        removeClass: removeClass,
        addClass: addClass,
        elementFromString: elementFromString,
        wrapElementFromString: wrapElementFromString,
        trigger: trigger,
        show: show,
        hide: hide
    }
})
