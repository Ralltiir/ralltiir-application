/**
 * @file url utility
 * @author harttle<harttle@harttle.com>
 */
define(function (require) {
    // TODO replace this with WHATWG URL
    var _ = require('ralltiir')._;

    function setQuery(url, key, val) {
        if (typeof key === 'object') {
            _.forOwn(key, function (val, key) {
                url = setQuery(url, key, val);
            });
            return url;
        }
        url += /\?/.test(url) ? '&' : '?';
        url += encodeURIComponent(key) + '=' + encodeURIComponent(val);
        return url;
    }

    return {setQuery: setQuery};
});
