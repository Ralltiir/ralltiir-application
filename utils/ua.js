/**
 * @file UA related tests
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    var ua = navigator.userAgent;
    var isIOS = /(iPad|iPhone|iPod)/.test(ua);

    var match = ua.match(/ applewebkit\/(\d+)/i);
    var awVersion = match && parseFloat(match[1]);
    var isWKWebView = +awVersion > 600;

    var isBaidu = /baiduboxapp|baiduhi/.test(ua);

    return {
        isIOS: isIOS,
        isWKWebView: isWKWebView,
        isBaidu: isBaidu
    };
});
