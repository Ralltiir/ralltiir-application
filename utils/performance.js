
/**
 * 通用 service
 *
 * @file    service.js
 * @author  harttle<harttle@harttle.com>
 */
define(function (require) {

    /**
     * Page Performance Data
     *
     * @class
     */
    function Performance() {
        this.init();
    }

    Performance.prototype.init = function () {
        this.navigationStart = null;
        this.requestStart = null;
        this.domLoading = null;
        this.headInteractive = null;
        this.domInteractive = null;
    };

    Performance.prototype.startNavigation = function () {
        this.init();
        this.navigationStart = Date.now();
    };
    return Performance;
});
