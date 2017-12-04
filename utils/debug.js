/**
 * @file debug utility
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    return {
        enabled: /rt-debug/.test(location.search)
    };
});
