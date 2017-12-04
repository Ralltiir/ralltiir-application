/**
 * @file UA related tests
 * @author harttle<harttle@harttle.com>
 */
define(function () {
    var ua = navigator.userAgent;
    var isIOS = /(iPad|iPhone|iPod)/.test(ua);

    var awVersion = parseFloat(ua.match(/ applewebkit\/(\d+)/i)[1]);
    var isWKWebView = +awVersion > 600;

    var isBaidu = /baiduboxapp|baiduhi/.test(ua);

    return {
        isIOS: isIOS,
        isWKWebView: isWKWebView,
        isBaidu: isBaidu
    };
});
