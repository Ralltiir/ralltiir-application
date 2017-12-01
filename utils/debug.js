/**
 * @file debug utility
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    if (/debug/.test(location.search)) {
        localStorage.setItem('rt.debug', true);
    }
    return {enabled: localStorage.getItem('rt.debug')};
});
