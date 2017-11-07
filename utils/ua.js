define(function () {
    var ua = navigator.userAgent;
    var exports = {
        isIOS: function () {
            return /(iPad|iPhone|iPod)/.test(ua );
        },
        isWKWebView: function () {
            var awVersion = parseFloat(ua.match(/ applewebkit\/(\d+)/i)[1]);
            return +awVersion > 600;
        },
        isBaidu: function () {
            return /baiduboxapp|baiduhi/.test(ua);
        }
    }
    return exports;
});
