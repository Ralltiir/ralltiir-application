/**
 * @file rt-app configuration
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    var config = {
        debugEnabled: /rt-debug/.test(location.search),
        cacheDisabled: /rt-cache-disable/.test(location.search),
        duration: getDuration(),
        animationEase: 'ease'
    };

    function getDuration() {
        var match = /rt-duration=(\d+)/.exec(location.search);
        return match ? Number(match[1]) : 300;
    }

    /* eslint-disable no-console */
    if (config.enabled) {
        console.log('Ralltiir Application debug enabled');
    }
    if (config.cacheDisabled) {
        console.log('Ralltiir Application cache disabled');
    }
    /* eslint-enable no-console */
    return config;
});
