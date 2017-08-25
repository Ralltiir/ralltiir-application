/**
 * @file window variable check
 * @author lizhaoming@baidu.com
 * */
define(function () {
    var guard = {};
    guard.createContext = function () {
        try {
            var windowCopy = {};
            for (var x in window) {
                if (!window.hasOwnProperty(x)) {
                    continue;
                }
                windowCopy[x] = window[x];
            }
            return windowCopy;
        }
        catch (e) {
            console.error(e);
            return {};
        }
    };
    guard.checkContext = function (windowCopy) {
        var changeList = {
            changed: [],
            added: [],
            removed: [],
            totalChanges: 0
        };
        try {
            var x;
            // 正向检查，检查新增的
            for (x in window) {
                if (!window.hasOwnProperty(x)) {
                    continue;
                }
                if (!windowCopy.hasOwnProperty(x)) {
                    changeList.added.push({
                        key: x,
                        value: window[x]
                    });
                }
            }
            // 反向检查，检查修改的和删除的
            for (x in windowCopy) {
                if (!windowCopy.hasOwnProperty(x)) {
                    continue;
                }
                if (!window.hasOwnProperty(x)) {
                    changeList.removed.push({
                        key: x,
                        value: windowCopy[x]
                    });
                }
                if (windowCopy[x] !== window[x]) {
                    changeList.changed.push({
                        key: x,
                        value: window[x],
                        valueBefore: windowCopy[x]
                    });
                }
            }
            changeList.totalChanges = changeList.changed.length + changeList.added.length + changeList.removed.length;
        }
        catch (e) {
            console.error(e);
        }
        return changeList;
    };
    guard.revertChanges = function (changeList) {
        var i;
        var v;
        for (i = 0; i < changeList.added.length; i++) {
            v = changeList.added[i];
            delete window[v.key];
        }
        for (i = 0; i < changeList.removed.length; i++) {
            v = changeList.removed[i];
            window[v.key] = v.value;
        }
        for (i = 0; i < changeList.changed.length; i++) {
            v = changeList.changed[i];
            window[v.key] = v.valueBefore;
        }
    };
    return guard;
});
