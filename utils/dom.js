define(function (require) {
    var _ = require('ralltiir')._;

    function elementFromString(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return div.childNodes[0]
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
        var styleText = _.reduce(obj, function (str, key) {
            var statement = key + ':' + obj[key] + ';';
            return str + statement;
        }, '');
        el.setAttribute('style', styleText);
    }

    return {
        css: css,
        elementFromString: elementFromString,
        trigger: trigger
    }
})
