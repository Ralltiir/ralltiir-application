/**
 * @file debug utility
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    var debug = {
        enabled: /rt-debug/.test(location.search),
        cacheDisabled: /rt-cache-disable/.test(location.search)
    };
    /* eslint-disable no-console */
    if (debug.enabled) {
        console.log('Ralltiir Application debug enabled');
    }
    if (debug.cacheDisabled) {
        console.log('Ralltiir Application cache disabled');
    }
    /* eslint-enable no-console */
    return debug;
});
