/*
 * Superframe
 * Version: ralltiir-2.7.0-11
 * Homepage: http://superframe.baidu.com
 * Build Date: 2017-09-19T20:40:03+0800
 * Last Commit: 802ef80 fix: map#set feature: setInstanceLimit
 */
/**
 * @file main.js inline all modules
 * @author harttle<yangjun14@baidu.com>
 */
(function () {
    define(['sfr'], function (sfr) {
        return sfr;
    });
    define('ralltiir', ['sfr'], function (sfr) {
        return sfr;
    });
    // router
    /**
 * @file url处理
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/router/router/URL', ['require', 'sfr/utils/uri/component/Path', 'sfr/utils/uri/component/Query', 'sfr/utils/uri/component/Fragment', 'sfr/router/router/config'], function (require) {

    var Path = require('sfr/utils/uri/component/Path');
    var Query = require('sfr/utils/uri/component/Query');
    var Fragment = require('sfr/utils/uri/component/Fragment');
    var config = require('sfr/router/router/config');
    // Spec. RFC3986: URI Generic Syntax
    // see: https://tools.ietf.org/html/rfc3986#page-50
    var URIRegExp = new RegExp('^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?');

    var DEFAULT_TOKEN = '?';

    /**
     * URL
     *
     * @constructor
     * @param {string} str url
     * @param {Object=} options 选项
     * @param {Object=} options.query 查询条件
     * @param {URL=} options.base 基路径
     * @param {string=} options.root 根路径
     */
    function URL(str, options) {
        options = options || {};
        str = (str || '').trim() || config.path;

        var match = URIRegExp.exec(str);
        // ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
        //  12            3  4          5       6  7        8 9
        if (!match) {
            // eslint-disable-next-line
            console.warn('URI not valid:');
        }

        var token = this.token = options.token || DEFAULT_TOKEN;
        var root = options.root || config.root;
        if (root.charAt(root.length - 1) === '/') {
            root = root.substring(0, root.length - 1);
        }

        this.root = root;

        str = str.split('#');
        this.fragment = new Fragment(str[1]);

        str = str[0].split(token);
        var base = options.base || {};
        this.path = new Path(str[0], base.path);
        this.query = new Query(str[1]);

        // 路径修正
        // * 针对相对路径修正
        // * 添加默认的'/'
        var path = this.path.get();
        this.outRoot = path.indexOf('..') === 0;
        if (this.outRoot) {
            path = Path.resolve(root + '/', path);
            if (path.indexOf(root) === 0) {
                path = path.substring(root.length);
                this.path.set(path);
                this.outRoot = false;
            }
        }

        if (!this.outRoot && path.charAt(0) !== '/') {
            this.path.set('/' + path);
        }

        if (options.query) {
            this.query.add(options.query);
        }
    }

    /**
     * 字符串化
     *
     * @public
     * @return {string}
     */
    URL.prototype.toString = function () {
        var root = this.root;
        var path = this.path.get();
        if (this.outRoot) {
            path = Path.resolve(root + '/', path);
        }
        else {
            path = root + path;
        }

        return path
            + this.query.toString(this.token)
            + this.fragment.toString();
    };

    /**
     * 比较Path
     *
     * @public
     * @param {string} path 路径
     * @return {boolean}
     */
    URL.prototype.equalPath = function (path) {
        return this.path.get() === path;
    };

    /**
     * 比较Path与Query是否相等
     *
     * @public
     * @param {URL} url url对象
     * @return {boolean}
     */
    URL.prototype.equal = function (url) {
        return this.query.equal(url.query)
            && this.equalPath(url.path.get());
    };

    /**
     * 比较Path, Query及Fragment是否相等
     *
     * @public
     * @param {URL} url url对象
     * @return {boolean}
     */
    URL.prototype.equalWithFragment = function (url) {
        return this.equal(url)
            && this.fragment.equal(url.fragment);
    };

    /**
     * 获取查询条件
     *
     * @public
     * @return {Object}
     */
    URL.prototype.getQuery = function () {
        return this.query.get();
    };

    /**
     * 获取路径
     *
     * @public
     * @return {string}
     */
    URL.prototype.getPath = function () {
        return this.path.get();
    };

    return URL;

});
;
    /**
 * @file 配置信息
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/router/router/config', [], {

    /**
     * 默认的路径
     * 只对hash控制器生效
     *
     * @type {string}
     */
    path: '/',

    /**
     * 默认的根路径
     *
     * @type {string}
     */
    root: '',

    /**
     * 路由模式
     * 可选async或page
     *
     * @type {string}
     */
    mode: 'async'

});
;
    /**
 * @file controller
 * @author treelite(c.xinle@gmail.com), Firede(firede@firede.us)
 */

define('sfr/router/router/controller', ['require', 'sfr/lang/underscore', 'sfr/router/router/URL', 'sfr/router/router/config'], function (require) {
    var _ = require('sfr/lang/underscore');
    var URL = require('sfr/router/router/URL');
    var config = require('sfr/router/router/config');
    var applyHandler;
    var curLocation;

    /**
     * 调用路由处理器
     *
     * @inner
     * @param {URL} url URL对象
     * @param {Object} options 参数
     */
    function callHandler(url, options) {
        if (equalWithCurLocation(url, options)) {
            return;
        }
        applyHandler(url, options);
        curLocation = url;
    }

    /**
     * 判断是否与当前路径相等
     *
     * @inner
     * @param {URL} url URL对象
     * @param {Object} options 参数
     * @return {boolean}
     */
    function equalWithCurLocation(url, options) {
        return curLocation && url.equal(curLocation) && !options.force;
    }

    /**
     * url忽略root
     *
     * @inner
     * @param {string} url url
     * @return {string}
     */
    function ignoreRoot(url) {
        var root = config.root;
        if (url.charAt(0) === '/' && root) {
            if (url.indexOf(root) === 0) {
                url = url.replace(root, '');
            }
            else {
                // 绝对地址超出了root的范围
                // 转化为相对路径
                var dirs = root.split('/').slice(1);
                dirs = dirs.map(function () {
                    return '..';
                });
                url = dirs.join('/') + url;
                // 此时的相对路径是针对root的
                // 所以把curlocation置为空
                curLocation = null;
            }
        }

        return url;
    }

    /**
     * 创建URL对象
     *
     * @inner
     * @param {string=} url url字符串
     * @param {Object=} query 查询条件
     * @return {URL}
     */
    function createURL(url, query) {
        if (!url) {
            url = ignoreRoot(location.pathname);
        }
        return new URL(url, {query: query, base: curLocation});
    }

    /**
     * 路由监控
     *
     * @inner
     * @param {Object=} e 事件参数
     * @param {boolean} isSync 是否为同步渲染
     * @return {*}
     */
    function monitor(e, isSync) {
        e = e || {};

        if (_.get(e, 'state.disableServiceDispatch')) {
            return;
        }

        var url = ignoreRoot(location.pathname);
        if (location.search.length > 1) {
            url += location.search;
        }
        url = createURL(url);

        if (url.outRoot) {
            return outOfControl(url.toString(), true);
        }

        var options = isSync ? {src: 'sync'} : _.extend({}, e.state, {src: 'history'});
        callHandler(url, options);
    }

    var exports = {};

    /**
     * URL超出控制范围
     *
     * @inner
     * @param {string} url url地址
     * @param {boolean} silent 是否不添加历史纪录 默认为false
     */
    function outOfControl(url, silent) {
        exports.dispose();

        if (silent) {
            location.replace(url);
        }
        else {
            location.href = url;
        }
    }

    /**
     * 初始化
     *
     * @public
     * @param {Function} apply 调用路由处理器
     */
    exports.init = function (apply) {
        window.addEventListener('popstate', monitor, false);
        applyHandler = apply;

        // 首次调用为同步渲染
        monitor(null, true);
    };

    /**
     * 路由跳转
     *
     * @public
     * @param {string} url 路径
     * @param {Object=} query 查询条件
     * @param {Object=} options 跳转参数
     * @param {boolean=} options.force 是否强制跳转
     * @param {boolean=} options.silent 是否静默跳转（不改变URL）
     * @return {*}
     */
    exports.redirect = function (url, query, options) {
        options = options || {};
        url = createURL(url, query);

        if (url.outRoot || config.mode === 'page') {
            return !equalWithCurLocation(url, options) && outOfControl(url.toString());
        }

        if (!curLocation.equalWithFragment(url)) {
            history.pushState(options, options.title, url.toString());
        }
        if (!options.silent) {
            callHandler(url, options);
        }
    };

    /**
     * 重置当前的URL
     *
     * @public
     * @param {string} url 路径
     * @param {Object=} query 查询条件
     * @param {Object=} options 重置参数
     * @param {boolean=} options.silent 是否静默重置，静默重置只重置URL，不加载action
     * @return {*}
     */
    exports.reset = function (url, query, options) {
        options = options || {};
        url = createURL(url, query);

        if (url.outRoot || config.mode === 'page') {
            return !equalWithCurLocation(url, options) && outOfControl(url.toString());
        }

        if (!options.silent) {
            callHandler(url, options);
        }
        else {
            curLocation = url;
        }
        history.replaceState(options, options.title, url.toString());
    };

    /**
     * 销毁
     *
     * @public
     */
    exports.dispose = function () {
        window.removeEventListener('popstate', monitor, false);
        curLocation = null;
    };

    exports.ignoreRoot = ignoreRoot;

    exports.createURL = createURL;

    return exports;
});
;
    /**
 * @file Router Frontend router via popstate and pushstate.
 * @author treelite<c.xinle@gmail.com>, Firede<firede@firede.us>
 * @module Router
 */

define('sfr/router/router', ['require', 'sfr/lang/underscore', 'sfr/router/router/config', 'sfr/router/router/controller', 'sfr/utils/logger'], function (require) {
    var extend = require('sfr/lang/underscore').extend;
    var globalConfig = require('sfr/router/router/config');
    var controller = require('sfr/router/router/controller');
    var _ = require('sfr/lang/underscore');
    var logger = require('sfr/utils/logger');

    function routerFactory() {
        /**
         * @constructor
         * @alias module:Router
         */
        var router = {};

        /**
         * 路由规则
         *
         * @type {Array.<Object>}
         */
        var rules = [];

        /**
         * 上一次的route信息
         *
         * @type {Object}
         */
        var prevState = {};

        /**
         * 判断是否已存在路由处理器
         *
         * @inner
         * @param {string|RegExp} path 路径
         * @return {number}
         */
        function indexOfHandler(path) {
            var index = -1;

            path = path.toString();
            rules.some(function (item, i) {
                // toString是为了判断正则是否相等
                if (item.raw.toString() === path) {
                    index = i;
                }

                return index !== -1;
            });

            return index;
        }

        /**
         * 从path中获取query
         * 针对正则表达式的规则
         *
         * @inner
         * @param {string} path 路径
         * @param {Object} item 路由信息
         * @return {Object}
         */
        function getParamsFromPath(path, item) {
            var res = {};
            var names = item.params || [];
            var params = path.match(item.path) || [];

            for (var i = 1, name; i < params.length; i++) {
                name = names[i - 1] || '$' + i;
                res[name] = decodeURIComponent(params[i]);
            }

            return res;
        }

        /**
         * 根据URL调用处理器
         *
         * @inner
         * @param {URL} url url对象
         * @param {Object} options 参数
         * @param {string} options.title 页面标题
         */
        function apply(url, options) {
            logger.log('router apply: ' + url);
            options = options || {};

            var handler;
            var query = extend({}, url.getQuery());
            var params = {};
            var path = url.getPath();

            handler = findHandler(url);
            if (!handler) {
                throw new Error('can not find route for: ' + path);
            }

            if (handler.path instanceof RegExp && handler.path.test(path)) {
                params = getParamsFromPath(path, handler);
            }

            var curState = {
                path: path,
                pathPattern: handler.raw,
                query: query,
                params: params,
                url: controller.ignoreRoot(url.toString()),
                originalUrl: url.toString(),
                options: options
            };
            var args = [curState, prevState];
            prevState = curState;

            logger.log('router calling handler: ' + handler.name);
            handler.fn.apply(handler.thisArg, args);
        }

        /**
         * Find handler object by Url Object
         *
         * @private
         * @param {Object} url The url object
         * @return {Object} the corresponding handler for the given url
         */
        function findHandler(url) {
            var handler;
            var defHandler;
            var path = url.getPath();
            logger.log('finding handlers for', url, 'in rules:', rules);
            rules.some(function (item) {
                if (item.path instanceof RegExp) {
                    if (item.path.test(path)) {
                        handler = item;
                    }
                }
                else if (url.equalPath(item.path)) {
                    handler = item;
                }

                if (!item.path) {
                    defHandler = item;
                }

                return !!handler;
            });
            return handler || defHandler;
        }

        /**
         * 处理RESTful风格的路径
         * 使用正则表达式
         *
         * @inner
         * @param {string} path 路径
         * @return {Object}
         */
        function restful(path) {
            var res = {
                params: []
            };

            res.path = path.replace(/:([^/]+)/g, function ($0, $1) {
                res.params.push($1);
                return '([^/]+)';
            });

            res.path = new RegExp('^' + res.path + '$');

            return res;
        }


        /**
         * Find registered path pattern by url
         *
         * @param {string} url The url string
         * @return {Object} The handler object associated with the given url
         */
        router.pathPattern = function (url) {
            url = controller.ignoreRoot(url);
            var urlObj = controller.createURL(url);
            var handler = findHandler(urlObj);
            if (!handler) {
                return null;
            }
            return handler.raw;
        };

        /**
         * 重置当前的URL
         *
         * @public
         * @param {string} url 路径
         * @param {Object} query 查询条件
         * @param {Object} options 选项
         * @param {boolean} options.silent 是否静默重置，静默重置只重置URL，不加载action
         */
        router.reset = function (url, query, options) {
            controller.reset(url, query, options);
        };

        /**
         * 设置配置信息
         *
         * @public
         * @param {Object} options 配置信息
         * @param {string} options.path 默认路径
         * @param {string} options.index index文件名称
         * @param {string} options.mode 路由模式，可选async、page，默认为async
         */
        router.config = function (options) {
            options = options || {};
            // 修正root，添加头部的`/`并去掉末尾的'/'
            var root = options.root;
            if (root && root.charAt(root.length - 1) === '/') {
                root = options.root = root.substring(0, root.length - 1);
            }

            if (root && root.charAt(0) !== '/') {
                options.root = '/' + root;
            }

            extend(globalConfig, options);
        };

        /**
         * 添加路由规则
         *
         * @public
         * @param {string|RegExp} path 路径
         * @param {function(path, query)} fn 路由处理函数
         * @param {Object} thisArg 路由处理函数的this指针
         */
        router.add = function (path, fn, thisArg) {
            if (indexOfHandler(path) >= 0) {
                throw new Error('path already exist');
            }

            var rule = {
                raw: path,
                path: path,
                fn: fn,
                thisArg: thisArg
            };

            if (_.isString(path) && _.contains(path, ':')) {
                rule = extend(rule, restful(path));
            }

            rules.push(rule);
        };

        /**
         * 删除路由规则
         *
         * @public
         * @param {string} path 路径
         */
        router.remove = function (path) {
            var i = indexOfHandler(path);
            if (i >= 0) {
                rules.splice(i, 1);
            }
        };

        /**
         * 测试路由规则存在性
         *
         * @public
         * @param {string} path 路径
         * @return {boolean} 是否存在
         */
        router.exist = function (path) {
            return indexOfHandler(path) >= 0;
        };

        /**
         * 清除所有路由规则
         *
         * @public
         */
        router.clear = function () {
            rules = [];
        };

        /**
         * URL跳转
         *
         * @public
         * @param {string} url 路径
         * @param {?Object} query 查询条件
         * @param {Object} options 跳转参数
         * @param {string} options.title 跳转后页面的title
         * @param {boolean} options.force 是否强制跳转
         * @param {boolean} options.silent 是否静默跳转（不改变URL）
         */
        router.redirect = function (url, query, options) {
            logger.log('router redirecting to: ' + url);
            controller.redirect(url, query, options);
        };

        /**
         * 启动路由监控
         *
         * @public
         * @param {Object} options 配置项
         */
        router.start = function (options) {
            router.config(options);
            controller.init(apply);
        };

        /**
         * 停止路由监控
         *
         * @public
         */
        router.stop = function () {
            controller.dispose();
            router.clear();
            prevState = {};
        };

        /**
         * 更换控制器
         * 仅用于单元测试及自定义控制器的调试
         * TODO: re-implement this via DI
         *
         * @public
         * @param {Object} implement 路由控制器
         */
        router.controller = function (implement) {
            var tmp = controller;
            controller = implement;
            _.forOwn(tmp, function (v, k) {
                if (!controller.hasOwnProperty(k)) {
                    controller[k] = v;
                }
            });
        };

        /**
         * 获取当前状态
         *
         * @return {Object} 返回上一次调度后的状态
         */
        router.getState = function () {
            return prevState;
        };

        router.ignoreRoot = controller.ignoreRoot;
        router.createURL = controller.createURL;

        return router;
    }
    return routerFactory;
});
;

    // utils
    /**
 * @file IoC Dependency Injector
 *   * only support sync AMD modules
 *   * cyclic dependencies are not handled
 *   * entities returned by factories are always cached
 * @author harttle<yangjun14@baidu.com>
 */
define('sfr/utils/di', ['require', 'sfr/lang/assert', 'sfr/lang/underscore'], function (require) {
    var assert = require('sfr/lang/assert');
    var _ = require('sfr/lang/underscore');

    /**
     * Create a IoC container
     *
     * @constructor
     * @param {Object} config The dependency tree configuration
     * @param {Function} require Optional, the require used by DI, defaults to `window.require`
     */
    function DI(config, require) {
        // this.require = require || window.require;
        this.config = this.normalize(config);
        this.container = Object.create(null);
    }

    DI.prototype.resolve = function (name) {
        var decl = this.config[name];
        assert(decl, 'module declaration not found: ' + name);

        // cache check
        if (this.container[name] && decl.cache) {
            return this.container[name];
        }

        // AMD resolving
        if (decl.value === undefined && decl.module) {
            decl.value = decl.module;
        }

        switch (decl.type) {
            case 'value':
                return this.container[name] = decl.value;
            case 'factory':
                assert(typeof decl.value === 'function', 'entity not injectable: ' + decl.value);
                var deps = decl.args || [];
                return this.container[name] = this.inject(decl.value, deps);
            default:
                throw new Error('DI type ' + decl.type + ' not recognized');
        }
    };

    DI.prototype.inject = function (factory, deps) {
        // Note: cyclic dependencies are not detected, avoid this!
        var args = deps.map(function (name) {
            return this.resolve(name);
        }, this);

        return factory.apply(null, args);
    };

    DI.prototype.normalize = function (config) {
        _.forOwn(config, function (decl, key) {
            if (decl.cache === undefined) {
                decl.cache = true;
            }

            if (decl.type === undefined) {
                decl.type = 'value';
            }

        });
        return config;
    };

    return DI;
});
;
    /**
 * @file logger.js Superframe Debug Utility
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/utils/logger', ['require'], function (require) {
    var timing = !!location.search.match(/logger-timming/i);
    var match = location.search.match(/logger-server=([^&]*)/i);
    var server = match ? decodeURIComponent(match[1]) : false;

    var timeOffset = Date.now();
    var lastTime = timeOffset;

    function reset() {
        lastTime = timeOffset = Date.now();
    }

    function assemble() {
        var args = Array.prototype.slice.call(arguments);

        if (timing) {
            args.unshift('[' + getTiming() + ']');
        }

        var stack = (new Error('logger track')).stack || '';
        var line = stack.split('\n')[3] || '';
        var match;
        var location = '';

        match = /at\s+\(?(.*):\d+:\d+\)?$/.exec(line) || [];
        var url = match[1];

        match = /([^/?#]+)([?#]|$)/.exec(url) || [];
        var fileName = match[1];
        location += fileName ? fileName + ':' : '';

        match = /at ([\w\d.]+)\s*\(/.exec(line) || [];
        var funcName = match[1] || 'anonymous';
        location += funcName;

        args.unshift('[' + location + ']');
        return args;
    }

    function getTiming() {
        var now = Date.now();
        var duration = (now - timeOffset) / 1000;
        var ret = duration + '(+' + (now - lastTime) + ')';
        lastTime = now;
        return ret;
    }

    function send(impl, args) {
        var fn = new Function('impl', 'args', 'impl.apply(console, args);');
        fn(impl, args);
        if (server) {
            var img = new Image();
            var msg = args.join(' ').replace(/\s+/g, ' ').trim();
            img.src = server + '/sfr/log/' + msg;
        }
    }

    function logFactory(level, impl) {
        return function () {
            var args = assemble.apply(null, arguments);
            send(impl, args);
        };
    }

    return {
        /* eslint-disable no-console */
        log: logFactory('log', console.log),
        debug: logFactory('debug', console.log),
        info: logFactory('info', console.info),
        warn: logFactory('warn', console.warn),
        error: logFactory('error', console.error),
        reset: reset
    };
});
;
    /**
 * @file http http utility
 * @author harttle<yangjun14@baidu.com>
 * @module http
 */

define('sfr/utils/http', ['require', 'sfr/lang/underscore', 'sfr/lang/promise', 'sfr/utils/url'], function (require) {
    var _ = require('sfr/lang/underscore');
    var Promise = require('sfr/lang/promise');
    var Url = require('sfr/utils/url');
    var exports = {};

    /**
     * Perform an asynchronous HTTP (Ajax) request.
     *
     * @param {string} url A string containing the URL to which the request is sent.
     * @param {Object} settings A set of key/value pairs that configure the Ajax request. All settings are optional.
     * @param {string} settings.method The method to open the Ajax request.
     * @param {any} settings.data The data to send, could be a string, a FormData, or a plain object. The 'Content-type' header is guessed accordingly, ie. 'application/x-www-form-urlencoded', 'multipart/form-data'.
     * @param {Object} settings.headers A set of key/value pairs that configure the Ajax request headers. If set to 'application/json', the settings.data will be JSON.stringified; If set to 'x-www-form-urlencoded', which is by default, the settings.data will be url-encoded.
     * @param {boolean} settings.jsonp [NOT implemented yet] Whether or not to use JSONP, default to `false`.
     * @param {string} settings.jsonpCallback [NOT implemented yet] Specify the callback function name for a JSONP request. This value will be used instead of the random name automatically generated by default.
     * @param {xhrFields} settings.xhrFields A set of key/value pairs that configure the fields of the xhr object. Note: onreadystatechange not supported, make use of the returned promise instead.
     * @return {Promise} A promise resolves/rejects with the xhr
     * @example
     * ajax('/foo', {
     *         method: 'POST',
     *         headers: {
     *             "content-type": "application/json"
     *         },
     *         xhrFields: {
     *             withCredentials: true
     *         }
     *     })
     *     .then(function(xhr) {
     *         xhr.status == 200;
     *         xhr.responseHeaders['Content-Type'] == 'application/json';
     *         xhr.responseText == '{"foo": "bar"}';
     *         // xhr.data is parsed from responseText according to Content-Type
     *         xhr.data === {foo: 'bar'};
     *     });
     *     .catch(function(xhr|errorThrown ) {});
     *     .finally(function(xhr|errorThrown ) { });
     */
    exports.ajax = function (url, settings) {
        // console.log('ajax with', url, settings);
        if (typeof url === 'object') {
            settings = url;
            url = '';
        }

        // normalize settings
        settings = _.defaultsDeep(settings, {
            url: url,
            method: settings && settings.type || 'GET',
            headers: {},
            data: null,
            jsonp: false,
            jsonpCallback: 'sf_http_' + Math.random().toString(36).substr(2)
        });
        _.forOwn(settings.headers, function (v, k) {
            settings.headers[k] = v.toLowerCase(v);
        });

        if (settings.headers['content-type'] || settings.data) {
            settings.headers['content-type'] = settings.headers['content-type']
                || guessContentType(settings.data);
        }

        // console.log('before parse data', settings);
        if (/application\/json/.test(settings.headers['content-type'])) {
            settings.data = JSON.stringify(settings.data);
        }
        else if (/form-urlencoded/.test(settings.headers['content-type'])) {
            settings.data = Url.param(settings.data);
        }

        // console.log('after parse data', settings);
        return doAjax(settings);
    };

    /**
     * Try guess the content-type of given data.
     *
     * @private
     * @param {any} data entity data
     * @return {string} content-type string
     */
    function guessContentType(data) {
        if (data instanceof FormData) {
            return 'multipart/form-data';
        }

        // header restrictions on CORS requests, see:
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS
        return 'application/x-www-form-urlencoded';
    }

    /**
     * Load data from the server using a HTTP GET request.
     *
     * @param {string} url A string containing the URL to which the request is sent.
     * @param {Object} data A plain object or string that is sent to the server with the request.
     * @return {Promise} A promise resolves/rejects with the xhr
     */
    exports.get = function (url, data) {
        return exports.ajax(url, {
            data: data
        });
    };

    /**
     * Load data from the server using a HTTP POST request.
     *
     * @param {string} url A string containing the URL to which the request is sent.
     * @param {Object} data A plain object or string that is sent to the server with the request.
     * @return {Promise} A promise resolves/rejects with the xhr
     */
    exports.post = function (url, data) {
        return exports.ajax(url, {
            method: 'POST',
            data: data
        });
    };

    /**
     * Load data from the server using a HTTP PUT request.
     *
     * @param {string} url A string containing the URL to which the request is sent.
     * @param {Object} data A plain object or string that is sent to the server with the request.
     * @return {Promise} A promise resolves/rejects with the xhr
     */
    exports.put = function (url, data) {
        return exports.ajax(url, {
            method: 'PUT',
            data: data
        });
    };

    /**
     * Load data from the server using a HTTP DELETE request.
     *
     * @param {string} url A string containing the URL to which the request is sent.
     * @param {Object} data A plain object or string that is sent to the server with the request.
     * @return {Promise} A promise resolves/rejects with the xhr
     */
    exports.delete = function (url, data) {
        return exports.ajax(url, {
            method: 'DELETE',
            data: data
        });
    };

    function doAjax(settings) {
        // console.log('doAjax with', settings);
        var xhr;
        try {
            xhr = exports.createXHR();
        }
        catch (e) {
            return Promise.reject(e);
        }
        // console.log('open xhr');
        xhr.open(settings.method, settings.url, true);

        _.forOwn(settings.headers, function (v, k) {
            xhr.setRequestHeader(k, v);
        });
        _.assign(xhr, settings.xhrFields);

        return new Promise(function (resolve, reject) {
            xhr.onreadystatechange = function () {
                // console.log('onreadystatechange', xhr.readyState, xhr.status);
                if (xhr.readyState === 4) {
                    xhr = resolveXHR(xhr);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr);
                    }
                    else {
                        reject(xhr);
                    }
                }

            };
            // console.log('doajax sending:', settings.data);
            xhr.send(settings.data);
        });
    }

    function resolveXHR(xhr) {

        /**
         * parse response headers
         */
        var headers = xhr.getAllResponseHeaders()
            // Spec: https://developer.mozilla.org/en-US/docs/Glossary/CRLF
            .split('\r\n')
            .filter(_.negate(_.isEmpty))
            .map(function (str) {
                return _.split(str, /\s*:\s*/);
            });
        xhr.responseHeaders = _.fromPairs(headers);

        /**
         * parse response body
         */
        xhr.data = xhr.responseText;
        if (xhr.responseHeaders['Content-Type'] === 'application/json') {
            try {
                xhr.data = JSON.parse(xhr.responseText);
            }
            catch (e) {
                // eslint-disable-next-line
                console.warn('Invalid JSON content with Content-Type: application/json');
            }
        }

        return xhr;
    }

    exports.createXHR = function () {
        var xhr = false;

        if (window.XMLHttpRequest) { // Mozilla, Safari,...
            xhr = new XMLHttpRequest();
        }
        else if (window.ActiveXObject) { // IE
            xhr = new ActiveXObject('Microsoft.XMLHTTP');
        }

        if (!xhr) {
            throw new Error('Cannot create an XHR instance');
        }

        return xhr;
    };

    return exports;
});
;
    /**
 * @file URL url parse utility
 * @author treelite(c.xinle@gmail.com)
 * @module url
 */

define('sfr/utils/url', ['require', 'sfr/utils/uri/URI', 'sfr/lang/underscore', 'sfr/utils/uri/component/Path', 'sfr/utils/uri/util/uri-parser'], function (require) {

    var URI = require('sfr/utils/uri/URI');
    var _ = require('sfr/lang/underscore');
    var Path = require('sfr/utils/uri/component/Path');
    var uRIParser = require('sfr/utils/uri/util/uri-parser');

    /**
     * 创建URI对象
     *
     * @constructor
     * @alias module:url
     * @param {...string|Object} data uri
     * @return {Object}
     */
    function url(data) {
        return new URI(data);
    }

    /**
     * 解析URI字符串
     *
     * @static
     * @param {string} str URI字符串
     * @return {Object} The URL Object
     */
    url.parse = function (str) {
        return uRIParser(str);
    };

    /**
     * resolve path
     *
     * @static
     * @param {string} from 起始路径
     * @param {string=} to 目标路径
     * @return {string}
     */
    url.resolve = function (from, to) {
        return Path.resolve(from, to);
    };

    /**
     * Format a plain object into query string.
     *
     * @static
     * @param {Object} obj The object to be formated.
     * @return {string} The result query string.
     * @example
     * param({foo:'bar ', bar: 'foo'});     // yields "foo=bar%20&bar=foo"
     */
    url.param = function (obj) {
        if (!_.isObject(obj)) {
            return obj;
        }

        return _.map(obj, function (v, k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(v);
        })
            .join('&');
    };

    return url;
});
;
    /**
 * @file cache.js A simple LRU cache implementation.
 *
 * Performance Notes: Since LRU queue is implemented by JavaScript Array internally,
 * it's enough for small cache limits.
 * Large cache limits may require linklist implementation.
 * @author harttle<yangjun14@baidu.com>
 * @module Cache
 */

define('sfr/utils/cache', ['require', 'sfr/lang/assert', 'sfr/utils/cache-namespace'], function (require) {
    var assert = require('sfr/lang/assert');
    var Namespace = require('sfr/utils/cache-namespace');
    var storage = {};
    var exports = {};

    /**
     * Create a namespaced cache instance
     *
     * @static
     * @param {string} name The namespace identifier
     * @param {Object} options The options object used to create the namespace
     * @return {Namespace} the namespace object created
     */
    exports.create = function (name, options) {
        assert(name, 'cannot create namespace with empty name');
        assert(!storage[name], 'namespace with ' + name + ' already created');

        return storage[name] = new Namespace(name, options);
    };

    exports.destroy = function (name) {
        assert(storage[name], 'namespace with ' + name + ' not exist');
        delete storage[name];
    };

    /**
     * Using a specific namespace
     *
     * @param {string} name The namespace identifier
     * @static
     * @return {Object} The scoped cache object
     */
    exports.using = function (name) {
        return usingNamespace(name);
    };

    /**
     * Set a cache item
     *
     * @static
     * @param {string} name The namespace for your cache item
     * @param {string} key The key for your cache item
     * @param {any} value The value for your cache item
     * @return {any} The return value of corresponding Namespace#set
     * */
    exports.set = function (name, key, value) {
        return usingNamespace(name).set(key, value);
    };

    /**
     *  Get a cache item
     *
     * @static
     * @param {string} name The namespace for your cache item
     * @param {string} key The key for your cache item
     * @return {any} The value for your cache item, or undefined if the specified item does not exist.
     * */
    exports.get = function (name, key) {
        return usingNamespace(name).get(key);
    };

    exports.size = function (name) {
        return usingNamespace(name).size();
    };

    /**
     * Rename a cache item
     *
     * @static
     * @param {string} name The namespace for your cache item
     * @param {string} before The source key for your cache item
     * @param {string} after The destination key for your cache item
     * @return {any} The return value of corresponding Namespace#rename
     */
    exports.rename = function (name, before, after) {
        return usingNamespace(name).rename(before, after);
    };

    /**
     * Remove a specific `key` in namespace `name`
     *
     * @static
     * @param {string} name The namespace identifier
     * @param {string} key The key to remove
     * @return {any} The return value of corresponding Namespace#remove
     * */
    exports.remove = function (name, key) {
        return usingNamespace(name).remove(key);
    };

    /**
     * Clear the given namespace, or all namespaces if `name` not set.
     *
     * @static
     * @param {string} name The namespace to clear.
     * @return {undefined|Namespace} Return the Namespace object if `name` is given, undefined otherwise.
     * */
    exports.clear = function (name) {
        if (arguments.length === 0) {
            storage = {};
        }
        else {
            return usingNamespace(name).clear();
        }
    };

    /**
     * Check whether the given key exists within the namespace, or whether the namespace exists if key not set.
     *
     * @static
     * @param {string} name The namespace to check
     * @param {string} key The key to check with
     * @return {boolean} Return if the namespace specified by `name` contains `key`
     */
    exports.contains = function (name, key) {
        if (arguments.length === 0) {
            throw new Error('namespace not specified');
        }

        // quering for namespace
        if (arguments.length === 1) {
            return storage.hasOwnProperty(name);
        }

        // quering for key
        if (!storage.hasOwnProperty(name)) {
            return false;
        }

        return storage[name].contains(key);
    };

    exports.has = function (name) {
        return storage.hasOwnProperty(name);
    };

    /**
     * Get the cache storage for specified namespace
     *
     * @private
     * @param {string} name The namespace to get
     * @return {Namespace} Return the namespace object identified by `name`
     */
    function usingNamespace(name) {
        if (!storage.hasOwnProperty(name)) {
            throw new Error('cache namespace ' + name + ' undefined');
        }

        return storage[name];
    }

    return exports;

});
;
    /**
 * @file cache-namespace.js
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/utils/cache-namespace', ['require', 'sfr/lang/underscore'], function (require) {
    /**
     * Namespace utility for cache module
     * @module Namespace
     */

    var _ = require('sfr/lang/underscore');

    /**
     * Event handler interfact used by Namespaceoptions.onRemove
     *
     * @interface
     * @param {string} v value
     * @param {string} k key
     * @param {boolean} evicted true if the entry is removed to make space, false otherwise
     */
    function onRemove(v, k, evicted) {
    }

    /**
     * Create a LRU cache namespace.
     *
     * @constructor
     * @alias module:Namespace
     * @param {string} name The namespace identifier
     * @param {number} options.limit The MAX count of cached items
     * @param {Function} options.onRemove The callback when item removed
     */
    function Namespace(name, options) {
        this.name = name;
        this.list = [];
        this.options = _.assign({
            limit: 3,
            onRemove: onRemove
        }, options);
    }
    Namespace.prototype = {
        constructor: Namespace,

        setLimit: function (limit) {
            this.options.limit = limit;
        },

        /**
         * Get a cache item, and reset the item accessed to the tail.
         *
         * @memberof Namespace
         * @param {string} key The key for your cache item
         * @return {any} The value for your cache item, or undefined if the specified item does not exist.
         */
        get: function (key) {
            var idx = this.findIndexByKey(key);
            if (idx === -1) {
                return undefined;
            }

            var item = this.list[idx];
            this.list.splice(idx, 1);
            this.list.push(item);
            return item.value;
        },

        /**
         * Set a cache item and put the item to the tail, while remove the first item when limit overflow.
         *
         * @param {string} key The key for your cache item
         * @param {any} value The value for your cache item
         * @return {Object} this
         * */
        set: function (key, value) {
            this.remove(key);

            while (this.list.length >= this.options.limit) {
                var dropped = this.list.shift();
                this.options.onRemove(dropped.value, dropped.key, true);
            }

            this.list.push({
                key: key,
                value: value
            });
            return this;
        },

        /**
         * Alias to #has
         *
         * @param {string} key The key to check with
         * @return {Object} this
         */
        contains: function (key) {
            return this.has(key);
        },

        /**
         * Check whether the given key exists within the namespace, or whether the namespace exists if key not set.
         *
         * @param {string} key The key to check with
         * @return {Object} this
         */
        has: function (key) {
            return this.findIndexByKey(key) > -1;
        },

        /**
         * Rename a cache item
         *
         * @param {string} before The source key for your cache item
         * @param {string} after The destination key for your cache item
         * @return {Object} this
         */
        rename: function (before, after) {
            if (before === after) {
                return this;
            }

            this.remove(after);
            var idx = this.findIndexByKey(before);
            if (idx === -1) {
                throw new Error('key not found:' + before);
            }

            this.list[idx].key = after;
            return this;
        },

        /**
         * Remove a specific `key` in namespace `name`
         *
         * @param {string} key The key to remove
         * @return {Object} this
         * */
        remove: function (key) {
            var idx = this.findIndexByKey(key);
            if (idx > -1) {
                var item = this.list[idx];
                this.options.onRemove(item.value, item.key, false);
                this.list.splice(idx, 1);
            }

            return this;
        },

        size: function () {
            return this.list.length;
        },

        /**
         * Clear the given namespace, or all namespaces if `name` not set.
         *
         * @param {string} name The namespace to clear.
         * @return {Object} this
         * */
        clear: function () {
            this.list = [];
            return this;
        },

        /**
         * Find the index of the given key exists in list,
         *
         * @private
         * @param {string} key The key to find
         * @return {number} return the index of the given key, false if not found
         * @example
         * findIndexByKey('k', [{'k':'v'}])    // yields 0
         */
        findIndexByKey: function (key) {
            return _.findIndex(this.list, function (item) {
                return item.key === key;
            });
        }
    };

    return Namespace;
});

;
    /**
 * @file emitter
 * @author  Firede(firede@firede.us)
 * @module Emitter
 * @example
 *
 * ```javascript
 * var emitter = new Emitter();
 * emitter.on('foo', function(value) {
 *     console.log(value);
 *  });
 *  // console.log: 'test'
 *  emitter.emit('foo', 'test');
 *  ```
 */

define('sfr/utils/emitter', ['require'], function (require) {

    /**
     * Create a emitter instance
     *
     * @constructor
     * @alias module:Emitter
     */
    function Emitter() {}

    /**
     * Emitter的prototype（为了便于访问），以及代码压缩
     *
     * @inner
     */
    var proto = Emitter.prototype;

    /**
     * 获取事件列表
     * 若还没有任何事件则初始化列表
     *
     * @private
     * @return {Object}
     */
    proto._getEvents = function () {
        if (!this._events) {
            this._events = {};
        }

        return this._events;
    };

    /**
     * 获取最大监听器个数
     * 若尚未设置，则初始化最大个数为10
     *
     * @private
     * @return {number}
     */
    proto._getMaxListeners = function () {
        if (isNaN(this.maxListeners)) {
            this.maxListeners = 10;
        }

        return this.maxListeners;
    };

    /**
     * 挂载事件
     *
     * @public
     * @param {string} event 事件名
     * @param {Function} listener 监听器
     * @return {Emitter}
     */
    proto.on = function (event, listener) {
        var events = this._getEvents();
        var maxListeners = this._getMaxListeners();

        events[event] = events[event] || [];

        var currentListeners = events[event].length;
        if (currentListeners >= maxListeners && maxListeners !== 0) {
            throw new RangeError(
                'Warning: possible Emitter memory leak detected. '
                + currentListeners
                + ' listeners added.'
           );
        }

        events[event].push(listener);

        return this;
    };

    /**
     * 挂载只执行一次的事件
     *
     * @public
     * @param {string} event 事件名
     * @param {Function} listener 监听器
     * @return {Emitter}
     */
    proto.once = function (event, listener) {
        var me = this;

        function on() {
            me.off(event, on);
            listener.apply(this, arguments);
        }
        // 挂到on上以方便删除
        on.listener = listener;

        this.on(event, on);

        return this;
    };

    /**
     * 注销事件与监听器
     * 任何参数都`不传`将注销当前实例的所有事件
     * 只传入`event`将注销该事件下挂载的所有监听器
     * 传入`event`与`listener`将只注销该监听器
     *
     * @public
     * @param {string=} event 事件名
     * @param {Function=} listener 监听器
     * @return {Emitter}
     */
    proto.off = function (event, listener) {
        var events = this._getEvents();

        // 移除所有事件
        if (0 === arguments.length) {
            this._events = {};
            return this;
        }

        var listeners = events[event];
        if (!listeners) {
            return this;
        }

        // 移除指定事件下的所有监听器
        if (1 === arguments.length) {
            delete events[event];
            return this;
        }

        // 移除指定监听器（包括对once的处理）
        var cb;
        for (var i = 0; i < listeners.length; i++) {
            cb = listeners[i];
            if (cb === listener || cb.listener === listener) {
                listeners.splice(i, 1);
                break;
            }
        }
        return this;
    };

    /**
     * 触发事件
     *
     * @public
     * @param {string} event 事件名
     * @param {...*} args 传递给监听器的参数，可以有多个
     * @return {Emitter}
     */
    proto.emit = function (event) {
        var events = this._getEvents();
        var listeners = events[event];
        // 内联arguments的转化 提升性能
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        if (listeners) {
            listeners = listeners.slice(0);
            for (i = 0; i < listeners.length; i++) {
                try {
                    listeners[i].apply(this, args);
                }
                catch (e) {
                    // eslint-disable-next-line
                    console.error(e);
                }
            }
        }

        return this;
    };

    /**
     * 返回指定事件的监听器列表
     *
     * @public
     * @param {string} event 事件名
     * @return {Array} 监听器列表
     */
    proto.listeners = function (event) {
        var events = this._getEvents();
        return events[event] || [];
    };

    /**
     * 设置监听器的最大个数，为0时不限制
     *
     * @param {number} number 监听器个数
     * @return {Emitter}
     */
    proto.setMaxListeners = function (number) {
        this.maxListeners = number;

        return this;
    };

    var protoKeys = Object.keys(proto);

    /**
     * 将Emitter混入目标对象
     *
     * @param {Object} obj 目标对象
     * @return {Object} 混入Emitter后的对象
     * @static
     */
    Emitter.mixin = function (obj) {
        // forIn不利于V8的优化
        var key;
        for (var i = 0, max = protoKeys.length; i < max; i++) {
            key = protoKeys[i];
            obj[key] = proto[key];
        }
        return obj;
    };

    // Export
    return Emitter;

});
;
    /**
 * @file utils/dom.js
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/utils/dom', ['require'], function (require) {
    function addClass(el, className) {
        if (!hasClass(el, className)) {
            if (el.className) {
                el.className += ' ';
            }
            el.className += className;
        }
    }
    function hasClass(el, className) {
        return rClassName(className).test(el.className);
    }
    function rClassName(name) {
        return new RegExp('(^|\\s)' + name + '(\\s|$)');
    }
    return {
        addClass: addClass,
        hasClass: hasClass
    };
});
;

    // lang
    /**
 * @author harttle(yangjvn@126.com)
 * @file underscore.js
 */

// eslint-disable-next-line
define('sfr/lang/underscore', ['require', 'sfr/lang/assert'], function (require) {
    /**
     * A lightweight underscore implementation.
     * 包括字符串工具、对象工具、函数工具、语言增强等。设计原则：
     * 1. 与 Lodash 重合的功能与其保持接口一致，
     *     文档: https://github.com/exports/exports
     * 2. Lodash 中不包含的部分，如有需要可联系 yangjvn14 (Hi)
     *     文档：本文件中函数注释。
     * @namespace underscore
     */

    var assert = require('sfr/lang/assert');
    var arrayProto = Array.prototype;
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var stringProto = String.prototype;
    var exports = {};
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

    /**
     * Get deep property by path
     *
     * @param {Object} obj The object to query with
     * @param {string} path A dot-delimited path string
     * @return {any} the value assiciated with path
     */
    function get(obj, path) {
        var ret = obj;
        (path || '').split('.').forEach(function (key) {
            ret = ret ? ret[key] : undefined;
        });
        return ret;
    }

    /**
     * Has deep property by path
     *
     * @param {any} obj The object to query with
     * @param {string} path A dot-delimited path string
     * @return {boolean} the value assiciated with path
     */
    function has(obj, path) {
        var paths = path.split('.');
        var i = 0;
        while (hasFunc(obj, paths[i]) && i < paths.length) {
            obj = obj[paths[i++]];
        }
        return i >= paths.length;
    }

    /**
     * Test if obj has property key
     *
     * @private
     * @param {any} obj The object to query with
     * @param {string} key The key to test
     * @return {boolean} the value assiciated with path
     */
    function hasFunc(obj, key) {
        return obj !== null && obj !== undefined && hasOwnProperty.call(obj, key);
    }

    /**
     * Parse arguments into Array
     *
     * @private
     * @param {Array-like-Object} args the arguments to be parsed
     * @return {Array} argument as array
     */
    function getArgs(args) {
        args = toArray(args);
        args.shift();
        return args;
    }

    /**
     * 公有函数
     */

    /**
     * Creates an array of the own and inherited enumerable property names of object.
     *
     * @param {Object} object The object to query.
     * @return {Array} Returns the array of property names.
     * @memberof underscore
     */
    function keysIn(object) {
        var ret = [];
        // eslint-disable-next-line
        for (var key in object) {
            ret.push(key);
        }
        return ret;
    }

    /**
     * Creates an array of the own enumerable property names of object.
     *
     * @param {Object} object The object to query.
     * @return {Array} Returns the array of property names.
     * @memberof underscore
     */
    function keys(object) {
        return Object.keys(Object(object));
    }

    /**
     * Iterates over own enumerable string keyed properties of an object and invokes iteratee for each property.
     * The iteratee is invoked with three arguments: (value, key, object).
     * Iteratee functions may exit iteration early by explicitly returning false.
     *
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @return {Object} Returs object.
     * @memberof underscore
     */
    function forOwn(object, iteratee) {
        object = object || {};
        for (var k in object) {
            if (object.hasOwnProperty(k)) {
                if (iteratee(object[k], k, object) === false) {
                    break;
                }
            }
        }
        return object;
    }

    /**
     * Converts value to an array.
     *
     * @param {any} value The value to convert.
     * @return {Array} Returns the converted array.
     * @memberof underscore
     */
    function toArray(value) {
        if (!value) {
            return [];
        }
        return arrayProto.slice.call(value);
    }

    /**
     * Iterates over elements of collection and invokes iteratee for each element.
     * The iteratee is invoked with three arguments: (value, index|key, collection).
     *
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @return {undefined} Just like Array.prototype.forEach
     * @memberof underscore
     */
    function forEach(collection, iteratee) {
        var args = getArgs(arguments);
        return arrayProto.forEach.apply(collection || [], args);
    }

    /**
     * Creates an array of values by running each element in collection thru iteratee.
     * The iteratee is invoked with three arguments: (value, index|key, collection).
     *
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @return {Array} Returns the new mapped array.
     * @memberof underscore
     */
    function map(collection, iteratee) {
        if (isArrayLike(collection)) {
            var args = getArgs(arguments);
            return arrayProto.map.apply(collection || [], args);
        }
        var ret = [];
        forOwn(collection, function () {
            ret.push(iteratee.apply(null, arguments));
        });
        return ret;
    }

    /**
     * Reduce array or object.
     * The iteratee is invoked with three arguments: (prev, curr, index|key, collection).
     *
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {any} init The initial value.
     * @return {Array} Returns the new mapped array.
     * @memberof underscore
     */
    function reduce(collection, iteratee, init) {
        if (isArrayLike(collection)) {
            var args = getArgs(arguments);
            return arrayProto.reduce.apply(collection, args);
        }
        var ks = keys(collection);
        var ret;
        var i;
        if (arguments.length >= 3) {
            ret = init;
            i = 0;
        }
        else if (ks.length > 0) {
            ret = collection[ks[0]];
            i = 1;
        }
        for (; i < ks.length; i++) {
            var key = ks[i];
            ret = iteratee(ret, collection[key], key, collection);
        }
        return ret;
    }

    /**
     * Creates a slice of array from start up to, but not including, end.
     *
     * @param {Array} collection The array to slice.
     * @param {number} start The start position.
     * @param {number} end The end position.
     * @return {Array} Returns the slice of array.
     * @memberof underscore
     */
    function slice(collection, start, end) {
        var args = getArgs(arguments);
        return arrayProto.slice.apply(collection || [], args);
    }

    /**
     * This method is based on JavaScript Array.prototype.splice
     *
     * @param {Collection} collection the collection to be spliced
     * @return {Array} the spliced result
     * @memberof underscore
     */
    function splice(collection) {
        var args = getArgs(arguments);
        return arrayProto.splice.apply(collection || [], args);
    }

    /**
     * This method is based on JavaScript String.prototype.split
     *
     * @param {string} str the string to be splited.
     * @return {Array} Returns the string segments.
     * @memberof underscore
     */
    function split(str) {
        var args = getArgs(arguments);
        return stringProto.split.apply(str || '', args);
    }

    /**
     * Find and return the index of the first element predicate returns truthy for instead of the element itself.
     *
     * @param {Array} array The array to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param {number} [fromIndex=0] The index to search from.
     * @return {number} Returns the index of the found element, else -1.
     * @memberof underscore
     */
    function findIndex(array, predicate, fromIndex) {
        for (var i = fromIndex || 0; i < array.length; i++) {
            if (predicate(array[i], i, array)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * The missing string formatting function for JavaScript.
     *
     * @param {string} fmt The format string (can only contain "%s")
     * @return {string} The result string.
     * @memberof underscore
     * @example
     * format("foo%sfoo", "bar");   // returns "foobarfoo"
     */
    function format(fmt) {
        return getArgs(arguments).reduce(function (prev, cur) {
            return prev.replace('%s', cur);
        }, fmt);
    }

    /**
     * Assigns own and inherited enumerable string keyed properties of source objects to
     * the destination object for all destination properties that resolve to undefined.
     * Source objects are applied from left to right.
     * Once a property is set, additional values of the same property are ignored.
     *
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @memberof underscore
     * @return {Object} Returns object.
     */
    function defaults() {
        return assign.apply(null, slice(arguments, 0).reverse());
    }

    /**
     * Checks if value is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, new Number(0), and new String(''))
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is an object, else false.
     * @memberof underscore
     */
    function isObject(value) {
        var type = typeof value;
        return value != null && (type === 'object' || type === 'function');
    }

    /**
     * Checks if value is a valid array-like length.
     *
     * @param {any} value the value to be checked
     * @return {boolean} true if value is length, false otherwise
     */
    function isLength(value) {
        return typeof value === 'number'
            && value > -1
            && value % 1 === 0
            && value <= MAX_SAFE_INTEGER;
    }

    /**
     * Checks if value is array-like
     *
     * @param {any} value the value to be checked
     * @return {boolearn} true if value is array-like, false otherwise
     */
    function isArrayLike(value) {
        return value != null && isLength(value.length) && !isFunction(value);
    }

    /**
     * Checks if value is classified as a Function object.
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is a function, else false.
     * @memberof underscore
     */
    function isFunction(value) {
        // safari 9 bug is omited, since it's not a mobile browser
        var type = typeof value;
        return type  === 'function';
    }

    /**
     * Checks if value is classified as a String primitive or object.
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is a string, else false.
     * @memberof underscore
     */
    function isString(value) {
        return value instanceof String || typeof value === 'string';
    }

    /**
     * Uses indexOf internally, if list is an Array. Use fromIndex to start your search at a given index.
     * http://underscorejs.org/#contains
     *
     * @param {Array|string} list the list of items in which to find
     * @param {any} value the value to find
     * @param {number} fromIndex Optional, default to 0
     * @return {number} Returns true if the value is present in the list, false otherwise.
     * @memberof underscore
     */
    function contains(list, value, fromIndex) {
        if (fromIndex === undefined) {
            fromIndex = 0;
        }
        return list.indexOf(value, fromIndex) > -1;
    }

    /**
     * Checks if value is classified as a RegExp object.
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is a RegExp, else false.
     * @memberof underscore
     */
    function isRegExp(value) {
        return value instanceof RegExp;
    }

    /**
     * Assigns own enumerable string keyed properties of source objects to the destination object.
     * Source objects are applied from left to right.
     * Subsequent sources overwrite property assignments of previous sources.
     *
     * Note: This method mutates object and is loosely based on Object.assign.
     *
     * @param {Object} object The destination object.
     * @param {...Object} source The source objects.
     * @return {Object} Returns object.
     * @memberof underscore
     */
    function assign(object, source) {
        object = object == null ? {} : object;
        var srcs = slice(arguments, 1);
        forEach(srcs, function (src) {
            assignBinary(object, src);
        });
        return object;
    }

    function assignBinaryDeep(dst, src) {
        if (!dst) {
            return dst;
        }
        forOwn(src, function (v, k) {
            if (isObject(v) && isObject(dst[k])) {
                return assignBinaryDeep(dst[k], v);
            }
            dst[k] = v;
        });
    }

    function assignBinary(dst, src) {
        if (!dst) {
            return dst;
        }
        forOwn(src, function (v, k) {
            dst[k] = v;
        });
        return dst;
    }

    /**
     * This method is like `_.defaults` except that it recursively assigns default properties.
     *
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @return {Object} Returns object.
     * @memberof underscore
     */
    function defaultsDeep() {
        var ret = {};
        var srcs = slice(arguments, 0).reverse();
        forEach(srcs, function (src) {
            assignBinaryDeep(ret, src);
        });
        return ret;
    }

    /**
     * The inverse of `_.toPairs`; this method returns an object composed from key-value pairs.
     *
     * @param {Array} pairs The key-value pairs.
     * @return {Object} Returns the new object.
     * @memberof underscore
     */
    function fromPairs(pairs) {
        var object = {};
        map(pairs, function (arr) {
            var k = arr[0];
            var v = arr[1];
            object[k] = v;
        });
        return object;
    }

    /**
     * Checks if value is classified as an Array object.
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is an array, else false.
     * @memberof underscore
     */
    function isArray(value) {
        return value instanceof Array;
    }

    /**
     * Checks if value is an empty object, collection, map, or set.
     * Objects are considered empty if they have no own enumerable string keyed properties.
     *
     * @param {any} value The value to check.
     * @return {boolean} Returns true if value is an array, else false.
     * @memberof underscore
     */
    function isEmpty(value) {
        return isArray(value) ? value.length === 0 : !value;
    }

    /**
     * Creates a function that negates the result of the predicate func.
     * The func predicate is invoked with the this binding and arguments of the created function.
     *
     * @param {Function} predicate The predicate to negate.
     * @return {Function} Returns the new negated function.
     * @memberof underscore
     */
    function negate(predicate) {
        return function () {
            return !predicate.apply(null, arguments);
        };
    }

    /**
     * Creates a function that invokes func with partials prepended to the arguments it receives.
     * This method is like `_.bind` except it does not alter the this binding.
     *
     * @param {Function} func  The function to partially apply arguments to.
     * @param {...any} partials The arguments to be partially applied.
     * @return {Function} Returns the new partially applied function.
     * @memberof underscore
     */
    function partial(func) {
        return func.bind.apply(func, slice(arguments));
    }

    /**
     * This method is like `_.partial` except that partially applied arguments are appended to the arguments it receives.
     *
     * @param {Function} func  The function to partially apply arguments to.
     * @param {...any} partials The arguments to be partially applied.
     * @return {Function} Returns the new partially applied function.
     * @memberof underscore
     */
    function partialRight(func) {
        var placeholders = slice(arguments);
        placeholders.shift();
        return function () {
            var args = slice(arguments);
            var spliceArgs = [args, arguments.length, 0].concat(placeholders);
            splice.apply(null, spliceArgs);
            return func.apply(null, args);
        };
    }

    /**
     * Creates a function that provides value to wrapper as its first argument.
     * Any additional arguments provided to the function are appended to those provided to the wrapper. The wrapper is invoked with the this binding of the created function.\
     *
     * @param  {*}        value    The value to wrap.
     * @param  {Function} wrapper  The wrapper function.
     * @return {Function}          Returns the new function.
     * @memberof underscore
     */
    function wrap(value, wrapper) {
        assert((typeof wrapper === 'function'), 'wrapper should be a function');
        return function () {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(value);
            return wrapper.apply(this, args);
        };
    }

    /**
     * 为类型构造器建立继承关系
     *
     * @param {Function} subClass 子类构造器
     * @param {Function} superClass 父类构造器
     * @return {Function}
     * @memberof underscore
     */
    function inherits(subClass, superClass) {

        /**
         * Temperary class
         *
         * @private
         * @class
         */
        var Empty = function () {};
        Empty.prototype = superClass.prototype;
        var selfPrototype = subClass.prototype;
        var proto = subClass.prototype = new Empty();

        for (var key in selfPrototype) {
            if (selfPrototype.hasOwnProperty(key)) {
                proto[key] = selfPrototype[key];
            }
        }
        subClass.prototype.constructor = subClass;

        return subClass;
    }

    // objectect Related
    exports.keysIn = keysIn;
    exports.keys = keys;
    exports.get = get;
    exports.has = has;
    exports.forOwn = forOwn;
    exports.assign = assign;
    exports.merge = assign;
    exports.extend = assign;
    exports.defaults = defaults;
    exports.defaultsDeep = defaultsDeep;
    exports.fromPairs = fromPairs;

    // Array Related
    exports.slice = slice;
    exports.splice = splice;
    exports.forEach = forEach;
    exports.map = map;
    exports.reduce = reduce;
    exports.toArray = toArray;
    exports.findIndex = findIndex;

    // String Related
    exports.split = split;
    exports.format = format;

    // Lang Related
    exports.isArray = isArray;
    exports.isFunction = isFunction;
    exports.isEmpty = isEmpty;
    exports.isString = isString;
    exports.isObject = isObject;
    exports.isArrayLike = isArrayLike;
    exports.isLength = isLength;
    exports.isRegExp = isRegExp;
    exports.inherits = inherits;
    exports.contains = contains;
    exports.noop = function () {};

    // Function Related
    exports.partial = partial;
    exports.partialRight = partialRight;
    exports.negate = negate;
    exports.wrap = wrap;

    return exports;
});
;
    /**
 * @file promise.js A Promise Implementation
 *
 * This implementation conforms to Promise/A+ spec. see: https://promisesaplus.com/
 * @author harttle <yangjun14@baidu.com>
 * @module Promise
 */

/* eslint-disable no-extend-native */

define('sfr/lang/promise', ['require', 'sfr/lang/assert', 'sfr/lang/set-immediate'], function (require) {
    var PENDING = 0;
    var FULFILLED = 1;
    var REJECTED = 2;
    var UNHANDLED_REJECTION_EVENT_MSG = 'cannot make RejectionEvent when promise not rejected';
    var config = {
        longStackTraces: false
    };
    var assert = require('sfr/lang/assert');
    var setImmediate = require('sfr/lang/set-immediate');

    /**
     * Create a new promise.
     * The passed in function will receive functions resolve and reject as its arguments
     * which can be called to seal the fate of the created promise.
     *
     * The returned promise will be resolved when resolve is called, and rejected when reject called or any exception occurred.
     * If you pass a promise object to the resolve function, the created promise will follow the state of that promise.
     *
     * @param {Function} cb The resolver callback.
     * @constructor
     * @alias module:Promise
     * @example
     * var p = new Promise(function(resolve, reject){
     *     true ? resolve('foo') : reject('bar');
     * });
     */
    function Promise(cb) {
        if (!(this instanceof Promise)) {
            throw 'Promise must be called with new operator';
        }

        if (typeof cb !== 'function') {
            throw 'callback not defined';
        }

        this._state = PENDING;
        this._result;
        this._fulfilledCbs = [];
        this._rejectedCbs = [];
        this._errorPending = false;
        this._fromResolver(cb);
    }

    Promise.prototype._fulfill = function (result) {
        this._result = result;
        this._state = FULFILLED;
        this._flush();
    };

    Promise.prototype._reject = function (err) {
        if (config.longStackTraces && err) {
            err.stack += '\n' + this._originalStack;
        }

        this._result = err;
        this._state = REJECTED;
        this._errorPending = true;
        this._flush();

        setImmediate(function () {
            this._checkUnHandledRejection();
        }.bind(this));
    };

    Promise.prototype._resolve = function (result) {
        if (isThenable(result)) {
            // result.then is un-trusted
            this._fromResolver(result.then.bind(result));
        }
        else {
            this._fulfill(result);
        }
    };

    /**
     * Resolve the un-trusted promise definition function: fn
     * which has exactly the same signature as the .then function
     *
     * @param {Function} fn the reslver
     */
    Promise.prototype._fromResolver = function (fn) {
        // ensure resolve/reject called once
        var resolved = false;
        var self = this;
        try {
            fn(function (result) {
                if (resolved) {
                    return;
                }

                resolved = true;
                self._resolve(result);
            }, function (err) {
                if (resolved) {
                    return;
                }

                resolved = true;
                self._reject(err);
            });
        }
        catch (err) {
            if (resolved) {
                return;
            }

            resolved = true;
            self._reject(err);
        }
    };

    Promise.prototype._checkUnHandledRejection = function () {
        if (this._errorPending) {
            var event = mkRejectionEvent(this);
            window.dispatchEvent(event);
        }

    };

    Promise.prototype._flush = function () {
        if (this._state === PENDING) {
            return;
        }

        var cbs = this._state === REJECTED ? this._rejectedCbs : this._fulfilledCbs;

        cbs.forEach(function (callback) {
            if (this._state === REJECTED && this._errorPending) {
                this._errorPending = false;
            }

            if (typeof callback === 'function') {
                var result = this._result;
                setImmediate(function () {
                    callback(result);
                });
            }

        }, this);
        this._rejectedCbs = [];
        this._fulfilledCbs = [];
    };

    /**
     * Register a callback on fulfilled or rejected.
     *
     * @param {Function} onFulfilled the callback on fulfilled
     * @param {Function} onRejected the callback on rejected
     */
    Promise.prototype._done = function (onFulfilled, onRejected) {
        this._fulfilledCbs.push(onFulfilled);
        this._rejectedCbs.push(onRejected);
        this._flush();
    };

    /**
     * The Promise/A+ .then, register a callback on resolve. See: https://promisesaplus.com/
     *
     * @param {Function} onFulfilled The fulfilled callback.
     * @param {Function} onRejected The rejected callback.
     * @return {Promise} A thenable.
     */
    Promise.prototype.then = function (onFulfilled, onRejected) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var ret;
            self._done(function (result) {
                if (typeof onFulfilled !== 'function') {
                    return resolve(result);
                }
                try {
                    ret = onFulfilled(result);
                }
                catch (e) {
                    return reject(e);
                }
                resolve(ret);
            }, function (err) {
                if (typeof onRejected !== 'function') {
                    return reject(err);
                }
                try {
                    ret = onRejected(err);
                }
                catch (e) {
                    return reject(e);
                }
                resolve(ret);
            });
        });
    };

    /**
     * The Promise/A+ .catch, retister a callback on reject. See: https://promisesaplus.com/
     *
     * @param {Function} cb The callback to be registered.
     * @return {Promise} A thenable.
     */
    Promise.prototype.catch = function (cb) {
        return this.then(function (result) {
            return result;
        }, cb);
    };

    /**
     * Register a callback on either resolve or reject. See: https://promisesaplus.com/
     *
     * @param {Function} cb The callback to be registered.
     * @return {Promise} A thenable.
     */
    Promise.prototype.finally = function (cb) {
        return this.then(cb, cb);
    };

    /**
     * Create a promise that is resolved with the given value.
     * If value is already a thenable, it is returned as is.
     * If value is not a thenable, a fulfilled Promise is returned with value as its fulfillment value.
     *
     * @param {Promise|any} obj The value to be resolved.
     * @return {Promise} A thenable which resolves the given `obj`
     * @static
     */
    Promise.resolve = function (obj) {
        return isThenable(obj) ? obj
            : new Promise(function (resolve) {
                return resolve(obj);
            });
    };

    /**
     * Create a promise that is rejected with the given error.
     *
     * @param {Error} err The error to reject with.
     * @return {Promise} A thenable which is rejected with the given `error`
     * @static
     */
    Promise.reject = function (err) {
        return new Promise(function (resolve, reject) {
            reject(err);
        });
    };

    /**
     * This method is useful for when you want to wait for more than one promise to complete.
     *
     * Given an Iterable(arrays are Iterable), or a promise of an Iterable,
     * which produces promises (or a mix of promises and values),
     * iterate over all the values in the Iterable into an array and return a promise that is fulfilled when
     * all the items in the array are fulfilled.
     * The promise's fulfillment value is an array with fulfillment values at respective positions to the original array.
     * If any promise in the array rejects, the returned promise is rejected with the rejection reason.
     *
     * @param {Iterable<any>|Promise<Iterable<any>>} promises The promises to wait for.
     * @return {Promise} A thenable.
     * @static
     */
    Promise.all = function (promises) {
        return new Promise(function (resolve, reject) {
            var results = promises.map(function () {
                return undefined;
            });
            var count = promises.length;
            promises
                .map(Promise.resolve)
                .forEach(function (promise, idx) {
                    promise.then(function (result) {
                        results[idx] = result;
                        count--;
                        flush();
                    }, reject);
                });

            // case for empty array
            flush();

            function flush() {
                if (count <= 0) {
                    resolve(results);
                }
            }
        });
    };

    /**
     * Promisify callback
     *
     * @param {Function} resolver The callback to promisify
     * @return {Promise} that is resolved by a node style callback function. This is the most fitting way to do on the fly promisification when libraries don't expose classes for automatic promisification.
     */
    Promise.fromCallback = function (resolver) {
        return new Promise(function (resolve) {
            resolver(function (arg) {
                resolve(arg);
            });
        });
    };

    /**
     * Call functions in serial until someone rejected.
     *
     * @static
     * @param {Array} iterable the array to iterate with.
     * @param {Array} iteratee returns a new promise. The iteratee is invoked with three arguments: (value, index, iterable).
     * @return {Promise} the promise resolves when the last is completed
     */
    Promise.mapSeries = function (iterable, iteratee) {
        var ret = Promise.resolve('init');
        var result = [];
        iterable.forEach(function (item, idx) {
            ret = ret
                .then(function () {
                    return iteratee(item, idx, iterable);
                })
                .then(function (x) {
                    return result.push(x);
                });
        });
        return ret.then(function () {
            return result;
        });
    };

    function mkRejectionEvent(promise) {
        assert(promise._state === REJECTED, UNHANDLED_REJECTION_EVENT_MSG);
        var RejectionEvent;
        if (typeof window.PromiseRejectionEvent === 'function') {
            RejectionEvent = window.PromiseRejectionEvent;
        }
        else {
            RejectionEvent = CustomEvent;
        }
        var event = new RejectionEvent('unhandledrejection', {
            promise: promise,
            reason: promise._result
        });
        event.reason = event.reason || promise._result;
        return event;
    }

    function isThenable(obj) {
        return obj && typeof obj.then === 'function';
    }

    return Promise;
});
;
    /**
 * @file assert.js assert utility
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/lang/assert', ['require'], function (require) {
    function assert(predict, msg) {
        if (!predict) {
            throw new Error(msg);
        }
    }
    return assert;
});
;
    /**
 * @file map Map for JavaScript with ES6-compliant API but not ES6-compliant.
 * @author harttle<harttle@harttle.com>
 *
 * Limitations:
 * * Key equivalence is value based
 * * Types of keys supported: String, RegExp
 */

/* eslint-disable no-extend-native */

define('sfr/lang/map', ['require', 'sfr/lang/underscore'], function (require) {

    var _ = require('sfr/lang/underscore');

    /**
     * Map utility
     *
     * @constructor
	 */
    function Map() {
        this.size = 0;
        this._data = {};
    }

    /**
	 * set key into the map
     *
	 * @param {string|RegExp} key the key
	 * @param {any} value the value
	 * @return {undefined}
	 */
    Map.prototype.set = function (key, value) {
        var k = fingerprint(key);
        if (!this._data.hasOwnProperty(k)) {
            this.size++;
        }
        this._data[k] = {
            key: key,
            value: value
        };
    };

    Map.prototype.keys = function (cb) {
        var data = this._data;
        return Object.keys(this._data).map(function (k) {
            var item = data[k];
            return item.key;
        });
    };

    Map.prototype.forEach = function (cb) {
        var data = this._data;
        Object.keys(this._data).forEach(function (k) {
            var item = data[k];
            cb(item.value, item.key);
        });
    };

    /**
	 * test if the key exists
     *
	 * @param {string|RegExp} key the key
	 * @param {any} v the value
	 * @return {boolean} Returns true if contains k, return false otherwise.
	 */
    Map.prototype.has = function (key) {
        var k = fingerprint(key);
        return this._data.hasOwnProperty(k);
    };

    /**
	 * delete the specified key
     *
	 * @param {string|RegExp} key the key
	 * @return {undefined}
	 */
    Map.prototype.delete = function (key) {
        var k = fingerprint(key);
        if (this._data.hasOwnProperty(k)) {
            delete this._data[k];
            this.size--;
        }
    };

    /**
	 * get value by key
     *
	 * @param {string|RegExp} key the key
	 * @return {any} the value associated to k
	 */
    Map.prototype.get = function (key) {
        var k = fingerprint(key);
        var item = this._data[k];
        return item ? item.value : undefined;
    };

    /**
	 * clear the map, remove all keys
     *
     * @param {string|RegExp} k the key
	 */
    Map.prototype.clear = function (k) {
        this.size = 0;
        this._data = {};
    };

    /**
	 * Get string fingerprint for value
     *
     * @private
	 * @param {any} value The value to be summarized.
	 * @return {string} The fingerprint for the value.
	 */
    function fingerprint(value) {
        if (_.isRegExp(value)) {
            return 'reg_' + value;
        }
        if (_.isString(value)) {
            return 'str_' + value;
        }
        return 'other_' + value;
    }

    return Map;
});
;
    /**
 * @file setImmediate polyfill for non-conformant browsers
 * @author harttle<yangjvn@126.com>
 */

define('sfr/lang/set-immediate', ['require'], function (require) {
    var global = getGlobal();
    var MSG = 'setImmediate polyfill';

    function immediate(cb) {
        // W3C conformant browsers
        if (global.setImmediate) {
            global.setImmediate(cb);
        }
        // Workers
        else if (global.MessageChannel) {
            var channel = new MessageChannel();
            channel.port1.onmessage = cb;
            channel.port2.postMessage(MSG);
        }
        // non-IE8
        else if (global.addEventListener && global.postMessage) {
            global.addEventListener('message', cb, false);
            global.postMessage(MSG, '*');
        }
        // Rest old browsers, IE8 goes here
        else {
            global.setTimeout(cb);
        }
    }

    function getGlobal() {
        if (typeof window !== 'undefined') {
            return window;
        }

        if (typeof self !== 'undefined') {
            return self;
        }

        // eslint-disable-next-line
        return Function('return this')();
    }

    return immediate;
});
;

    // utils/uri
    /**
 * @file URI
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/URI', ['require', 'sfr/utils/uri/util/uri-parser', 'sfr/utils/uri/component/Scheme', 'sfr/utils/uri/component/UserName', 'sfr/utils/uri/component/Password', 'sfr/utils/uri/component/Host', 'sfr/utils/uri/component/Port', 'sfr/utils/uri/component/Path', 'sfr/utils/uri/component/Query', 'sfr/utils/uri/component/Fragment'], function (require) {

    var parseURI = require('sfr/utils/uri/util/uri-parser');

    /**
     * 属性构造函数
     *
     * @const
     * @type {Object}
     */
    var COMPONENTS = {
        scheme: require('sfr/utils/uri/component/Scheme'),
        username: require('sfr/utils/uri/component/UserName'),
        password: require('sfr/utils/uri/component/Password'),
        host: require('sfr/utils/uri/component/Host'),
        port: require('sfr/utils/uri/component/Port'),
        path: require('sfr/utils/uri/component/Path'),
        query: require('sfr/utils/uri/component/Query'),
        fragment: require('sfr/utils/uri/component/Fragment')
    };

    /**
     * URI
     *
     * @constructor
     * @param {string|Object} data URL
     */
    function URI(data) {
        data = parseURI(data);

        var Factory;
        var me = this;
        Object.keys(COMPONENTS).forEach(function (name) {
            Factory = COMPONENTS[name];
            me[name] = new Factory(data[name]);
        });
    }

    /**
     * 字符串化authority
     *
     * @inner
     * @param {URI} uri URI对象
     * @return {string}
     */
    function stringifyAuthority(uri) {
        var res = [];
        var username = uri.username.toString();
        var password = uri.password.toString();
        var host = uri.host.toString();
        var port = uri.port.toString();

        if (username || password) {
            res.push(username + ':' + password + '@');
        }

        res.push(host);
        res.push(port);

        return res.join('');
    }

    /**
     * 设置属性
     *
     * @public
     * @param {string=} name 属性名称
     * @param {...*} args 数据
     */
    URI.prototype.set = function () {
        var i = 0;
        var arg = {};
        if (arguments.length > 1) {
            arg.name = arguments[i++];
        }
        arg.data = Array.prototype.slice.call(arguments, i);

        var component = this[arg.name];
        if (component) {
            component.set.apply(component, arg.data);
        }
        else {
            var me = this;
            var data = parseURI(arg.data[0]);
            Object.keys(COMPONENTS).forEach(function (name) {
                me[name].set(data[name]);
            });
        }
    };

    /**
     * 获取属性
     *
     * @public
     * @param {string} name 属性名称
     * @return {*}
     */
    URI.prototype.get = function () {
        var arg = {
                name: arguments[0],
                data: Array.prototype.slice.call(arguments, 1)
            };
        var component = this[arg.name];

        if (component) {
            return component.get.apply(component, arg.data);
        }
    };

    /**
     * 转化成字符串
     *
     * @public
     * @param {string=} name 属性名称
     * @return {string}
     */
    URI.prototype.toString = function (name) {
        var str;
        var component = this[name];

        if (component) {
            str = component.toString();
        }
        else {
            str = [];
            var scheme = this.scheme.toString();
            if (scheme) {
                str.push(scheme + ':');
            }
            var authority = stringifyAuthority(this);
            if (scheme && authority) {
                str.push('//');
            }
            str.push(authority);
            str.push(this.path.toString());
            str.push(this.query.toString());
            str.push(this.fragment.toString());
            str = str.join('');
        }

        return str;
    };

    /**
     * 比较uri
     *
     * @public
     * @param {string|URI} uri 待比较的URL对象
     * @return {boolean}
     */
    URI.prototype.equal = function (uri) {
        if (!(uri instanceof URI)) {
            uri = new URI(uri);
        }

        var res = true;
        var names = Object.keys(COMPONENTS);

        for (var i = 0, name; res && (name = names[i]); i++) {
            if (name === 'port') {
                res = this[name].equal(uri[name].get(), this.scheme.get());
            }
            else {
                res = this[name].equal(uri[name]);
            }
        }

        return res;
    };

    return URI;

});
;
    /**
 * @file abstract component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Abstract', ['require'], function (require) {

    /**
     * URI Component 虚基类
     * 提供基础方法
     *
     * @constructor
     * @param {string} data 数据
     */
    function Abstract() {
        var args = Array.prototype.slice.call(arguments);
        this.set.apply(this, args);
    }

    /**
     * 获取数据
     *
     * @public
     * @return {string}
     */
    Abstract.prototype.get = function () {
        return this.data;
    };

    /**
     * 设置数据
     *
     * @public
     * @param {string} data 数据
     */
    Abstract.prototype.set = function (data) {
        this.data = data || '';
    };

    /**
     * 添加数据
     *
     * @public
     * @param {string} data 数据
     */
    Abstract.prototype.add = function (data) {
        this.set(data);
    };

    /**
     * 移除数据
     *
     * @public
     */
    Abstract.prototype.remove = function () {
        this.data = '';
    };

    /**
     * 字符串输出
     *
     * @public
     * @return {string}
     */
    Abstract.prototype.toString = function () {
        return this.data.toString();
    };

    /**
     * 数据比较
     *
     * @public
     * @param {Object} data 带比较对象
     * @return {boolean}
     */
    Abstract.prototype.equal = function (data) {
        if (data instanceof Abstract) {
            data = data.get();
        }
        // 需要类型转化的比较
        /* eslint-disable eqeqeq */
        return this.data == data;
        /* eslint-enable eqeqeq */
    };

    return Abstract;
});
;
    /**
 * @file fragment component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Fragment', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var inherits = require('sfr/lang/underscore').inherits;
    var Abstract = require('sfr/utils/uri/component/Abstract');

    var DEFAULT_PREFIX = '#';

    /**
     * Fragment
     *
     * @constructor
     * @param {string} data 数据
     */
    function Fragment(data) {
        Abstract.call(this, data);
    }

    inherits(Fragment, Abstract);

    /**
     * 字符串化
     *
     * @public
     * @param {string=} prefix 前缀分割符
     * @return {string}
     */
    Fragment.prototype.toString = function (prefix) {
        prefix = prefix || DEFAULT_PREFIX;
        return this.data ? prefix + this.data : '';
    };

    return Fragment;
});
;
    /**
 * @file host component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Host', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var inherits = require('sfr/lang/underscore').inherits;
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * Host
     *
     * @constructor
     * @param {string} data 数据
     */
    function Host(data) {
        Abstract.call(this, data);
    }

    inherits(Host, Abstract);

    /**
     * 设置host
     * 忽略大小写
     *
     * @public
     * @param {string} host Host
     */
    Host.prototype.set = function (host) {
        host = host || '';
        this.data = host.toLowerCase();
    };

    /**
     * 比较host
     * 忽略大小写
     *
     * @public
     * @param {string|Host} host Host
     * @return {boolean}
     */
    Host.prototype.equal = function (host) {
        if (host instanceof Host) {
            host = host.get();
        }
        else {
            host = host || '';
        }
        return this.data === host.toLowerCase();
    };

    return Host;
});
;
    /**
 * @file password component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Password', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var inherits = require('sfr/lang/underscore').inherits;
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * Password
     *
     * @constructor
     * @param {string} data 数据
     */
    function Password(data) {
        Abstract.call(this, data);
    }

    inherits(Password, Abstract);

    return Password;
});
;
    /**
 * @file path component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Path', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var inherits = require('sfr/lang/underscore').inherits;
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * normalize path
     * see rfc3986 #6.2.3. Scheme-Based Normalization
     *
     * @inner
     * @param {string} path 路径
     * @return {string}
     */
    function normalize(path) {
        if (!path) {
            path = '/';
        }

        return path;
    }

    /**
     * 获取目录
     *
     * @inner
     * @param {string} path 路径
     * @return {string}
     */
    function dirname(path) {
        path = path.split('/');
        path.pop();
        return path.join('/');
    }

    /**
     * 处理路径中的相对路径
     *
     * @inner
     * @param {Array} paths 分割后的路径
     * @param {boolean} overRoot 是否已超出根目录
     * @return {Array}
     */
    function resolveArray(paths, overRoot) {
        var up = 0;
        for (var i = paths.length - 1, item; item = paths[i]; i--) {
            if (item === '.') {
                paths.splice(i, 1);
            }
            else if (item === '..') {
                paths.splice(i, 1);
                up++;
            }
            else if (up) {
                paths.splice(i, 1);
                up--;
            }
        }

        if (overRoot) {
            while (up-- > 0) {
                paths.unshift('..');
            }
        }

        return paths;
    }

    /**
     * Path
     *
     * @constructor
     * @param {string} data 路径
     * @param {string|Path=} base 相对路径
     */
    function Path(data, base) {
        Abstract.call(this, data, base);
    }

    /**
     * 应用路径
     *
     * @public
     * @param {string} from 起始路径
     * @param {string=} to 目标路径
     * @return {string}
     */
    Path.resolve = function (from, to) {
        to = to || '';

        if (to.charAt(0) === '/') {
            return Path.resolve(to);
        }

        var isAbsolute = from.charAt(0) === '/';
        var isDir = false;
        if (to) {
            from = dirname(from);
            isDir = to.charAt(to.length - 1) === '/';
        }
        // 对于`/`不处理
        else if (from.length > 1) {
            isDir = from.charAt(from.length - 1) === '/';
        }

        var path = from.split('/')
            .concat(to.split('/'))
            .filter(
                function (item) {
                    return !!item;
                }
            );

        path = resolveArray(path, !isAbsolute);


        return (isAbsolute ? '/' : '')
            + (path.length > 0 ? path.join('/') + (isDir ? '/' : '') : '');
    };

    inherits(Path, Abstract);

    /**
     * 设置path
     *
     * @public
     * @param {string} path 路径
     * @param {string|Path=} base 相对路径
     */
    Path.prototype.set = function (path, base) {
        if (base instanceof Path) {
            base = base.get();
        }

        var args = [path || ''];
        if (base) {
            args.unshift(base);
        }
        this.data = Path.resolve.apply(Path, args);
    };

    /**
     * 比较path
     *
     * @public
     * @param {string|Path} path 路径
     * @return {boolean}
     */
    Path.prototype.equal = function (path) {
        var myPath = normalize(this.data);

        if (path instanceof Path) {
            path = normalize(path.get());
        }
        else {
            path = normalize(Path.resolve(path || ''));
        }

        return myPath === path;
    };

    /**
     * 应用路径
     *
     * @public
     * @param {string|Path} path 起始路径
     * @param {boolean} from 目标路径
     */
    Path.prototype.resolve = function (path, from) {
        if (path instanceof Path) {
            path = path.get();
        }

        var args = [this.data];
        if (from) {
            args.unshift(path);
        }
        else {
            args.push(path);
        }

        this.data = Path.resolve.apply(Path, args);
    };

    return Path;
});
;
    /**
 * @file port component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Port', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var inherits = require('sfr/lang/underscore').inherits;
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * 常见协议的默认端口号
     *
     * @const
     * @type {Object}
     */
    var DEFAULT_PORT = {
            ftp: '21',
            ssh: '22',
            telnet: '23',
            http: '80',
            https: '443',
            ws: '80',
            wss: '443'
        };

    /**
     * Prot
     *
     * @constructor
     * @param {string} data 端口号
     */
    function Port(data) {
        Abstract.call(this, data);
    }

    inherits(Port, Abstract);

    /**
     * 比较port
     *
     * @public
     * @param {string|Port} port 端口号
     * @param {string=} scheme 协议
     * @return {boolean}
     */
    Port.prototype.equal = function (port, scheme) {
        var myPort = this.data || DEFAULT_PORT[scheme];
        if (port instanceof Port) {
            port = port.get();
        }
        port = port || DEFAULT_PORT[scheme];

        return myPort === port;
    };

    /**
     * 字符串化
     *
     * @public
     * @return {string}
     */
    Port.prototype.toString = function () {
        return this.data ? ':' + this.data : '';
    };

    return Port;
});
;
    /**
 * @file query component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Query', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract', 'sfr/utils/uri/util/parse-query', 'sfr/utils/uri/util/stringify-query'], function (require) {
    var _ = require('sfr/lang/underscore');
    var Abstract = require('sfr/utils/uri/component/Abstract');
    var parse = require('sfr/utils/uri/util/parse-query');
    var stringify = require('sfr/utils/uri/util/stringify-query');

    /**
     * 默认的查询条件分割符
     *
     * @const
     * @type {string}
     */
    var DEFAULT_PREFIX = '?';

    /**
     * 比较数组
     *
     * @inner
     * @param {Array} a 待比较数组
     * @param {Array} b 待比较数组
     * @return {boolean}
     */
    function compareArray(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return false;
        }

        if (a.length !== b.length) {
            return false;
        }

        a = a.slice(0);
        a = a.slice(0);
        a.sort();
        b.sort();

        var res = true;
        for (var i = 0, len = a.length; res && i < len; i++) {
            // 需要类型转化的比较
            /* eslint-disable eqeqeq */
            res = a[i] == b[i];
            /* eslint-enable eqeqeq */
        }

        return res;
    }

    /**
     * 比较对象
     *
     * @inner
     * @param {Object} a 待比较对象
     * @param {Object} b 待比较对象
     * @return {boolean}
     */
    function compareObject(a, b) {

        if (!_.isObject(a) || !_.isObject(b)) {
            return false;
        }

        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);

        if (aKeys.length !== bKeys.length) {
            return false;
        }

        var res = true;
        for (var i = 0, key, item; res && (key = aKeys[i]); i++) {
            if (!b.hasOwnProperty(key)) {
                res = false;
                break;
            }

            item = a[key];
            if (Array.isArray(item)) {
                res = compareArray(item, b[key]);
            }
            else {
                // 需要类型转化的比较
                /* eslint-disable eqeqeq */
                res = item == b[key];
                /* eslint-enable eqeqeq */
            }
        }

        return res;
    }

    /**
     * 解码数据
     *
     * @inner
     * @param {string|Array.<string>} value 数据
     * @return {string|Array.<string>}
     */
    function decodeValue(value) {
        if (Array.isArray(value)) {
            value = value.map(function (k) {
                return decodeComponent(k);
            });
        }
        else if (value === null || value === undefined) {
            value = null;
        }
        else {
            value = decodeComponent(value);
        }
        return value;
    }

    function decodeComponent(value) {
        value = String(value).replace(/\+/g, '%20');
        return decodeURIComponent(value);
    }

    /**
     * 添加查询条件
     *
     * @inner
     * @param {string} key 键
     * @param {string|Array.<string>} value 值
     * @param {Object} items 目标数据
     * @return {Object}
     */
    function addQueryItem(key, value, items) {
        var item = items[key];

        value = decodeValue(value);

        if (item) {
            if (!Array.isArray(item)) {
                item = [item];
            }
            if (Array.isArray(value)) {
                item = item.concat(value);
            }
            else {
                item.push(value);
            }
        }
        else {
            item = value;
        }

        items[key] = item;

        return items;
    }

    /**
     * Query
     *
     * @constructor
     * @param {string|Object} data 查询条件
     */
    function Query(data) {
        data = data || {};
        Abstract.call(this, data);
    }

    _.inherits(Query, Abstract);

    /**
     * 设置query
     *
     * @public
     * @param {...string|Object} data 查询条件
     */
    Query.prototype.set = function () {

        if (arguments.length === 1) {
            var query = arguments[0];
            if (_.isObject(query)) {
                var data = this.data = {};
                _.forOwn(query, function (val, key) {
                    data[key] = decodeValue(val);
                });
            }
            else {
                this.data = parse(query);
            }
        }
        else {
            this.data[arguments[0]] = decodeValue(arguments[1]);
        }

    };

    /**
     * 获取query
     *
     * @public
     * @param {string=} name 查询条件名称
     * @return {*}
     */
    Query.prototype.get = function (name) {
        return name ? this.data[name] : _.extend({}, this.data);
    };

    /**
     * 字符串化
     *
     * @public
     * @param {string=} prefix 前缀分割符
     * @return {string}
     */
    Query.prototype.toString = function (prefix) {
        prefix = prefix || DEFAULT_PREFIX;
        var str = stringify(this.data);

        return str ? prefix + str : '';
    };

    /**
     * 比较query
     *
     * @public
     * @param {string|Object|Query} query 查询条件
     * @return {boolean}
     */
    Query.prototype.equal = function (query) {
        if (_.isString(query)) {
            query = parse(query);
        }
        else if (query instanceof Query) {
            query = query.get();
        }

        return compareObject(this.data, query);
    };

    /**
     * 添加query item
     *
     * @public
     * @param {string|Object} key 键
     * @param {string=} value 值
     */
    Query.prototype.add = function (key, value) {
        var data = this.data;

        if (_.isObject(key)) {
            Object.keys(key).forEach(function (k) {
                addQueryItem(k, key[k], data);
            });
        }
        else {
            addQueryItem(key, value, data);
        }

        this.data = data;
    };

    /**
     * 删除query item
     *
     * @public
     * @param {string=} key 键，忽略该参数则清除所有的query item
     */
    Query.prototype.remove = function (key) {
        if (!key) {
            this.data = {};
        }
        else if (this.data.hasOwnProperty(key)) {
            delete this.data[key];
        }
    };

    return Query;
});
;
    /**
 * @file scheme component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/Scheme', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var _ = require('sfr/lang/underscore');
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * Scheme
     *
     * @constructor
     * @param {string} data 协议
     */
    function Scheme(data) {
        Abstract.call(this, data);
    }

    _.inherits(Scheme, Abstract);

    /**
     * 设置scheme
     * 忽略大小写
     *
     * @public
     * @param {string} scheme 协议
     */
    Scheme.prototype.set = function (scheme) {
        scheme = scheme || '';
        this.data = scheme.toLowerCase();
    };

    /**
     * 比较scheme
     * 忽略大小写
     *
     * @public
     * @param {string|Scheme} scheme 协议
     * @return {boolean}
     */
    Scheme.prototype.equal = function (scheme) {
        if (scheme instanceof Scheme) {
            scheme = scheme.get();
        }
        else {
            scheme = scheme || '';
        }
        return this.data === scheme.toLowerCase();
    };

    return Scheme;
});
;
    /**
 * @file username component
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/component/UserName', ['require', 'sfr/lang/underscore', 'sfr/utils/uri/component/Abstract'], function (require) {
    var _ = require('sfr/lang/underscore');
    var Abstract = require('sfr/utils/uri/component/Abstract');

    /**
     * UserName
     *
     * @constructor
     * @param {string} data 用户名
     */
    function UserName(data) {
        Abstract.call(this, data);
    }

    _.inherits(UserName, Abstract);

    return UserName;
});
;
    /**
 * @file parse query
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/util/parse-query', ['require'], function (require) {

    /**
     * 解析query
     *
     * @public
     * @param {string} query 查询条件
     * @return {Object}
     */
    function parse(query) {
        var res = {};

        query = query.split('&');
        var key;
        var value;
        query.forEach(function (item) {
            if (!item) {
                return;
            }

            item = item.split('=');
            key = item[0];
            value = item.length >= 2
                ? decodeValue(item[1])
                : null;

            if (res[key]) {
                if (!Array.isArray(res[key])) {
                    res[key] = [res[key]];
                }
                res[key].push(value);
            }
            else {
                res[key] = value;
            }
        });

        return res;
    }

    function decodeValue(value) {
        value = String(value).replace(/\+/g, '%20');
        return decodeURIComponent(value);
    }

    return parse;

});
;
    /**
 * @file stringify query
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/util/stringify-query', ['require'], function (require) {

    /**
     * 字符串化query
     *
     * @public
     * @param {Object} query 查询条件
     * @return {string}
     */
    function stringify(query) {
        var str = [];
        var item;

        Object.keys(query).forEach(function (key) {
            item = query[key];

            if (!Array.isArray(item)) {
                item = [item];
            }

            item.forEach(function (value) {
                if (value === null) {
                    str.push(key);
                }
                else {
                    str.push(key + '=' + encodeURIComponent(value || ''));
                }
            });
        });

        return str.join('&');
    }

    return stringify;
});
;
    /**
 * @file uri parser
 * @author treelite(c.xinle@gmail.com)
 */

define('sfr/utils/uri/util/uri-parser', ['require', 'sfr/lang/underscore'], function (require) {

    var UNDEFINED;

    var _ = require('sfr/lang/underscore');

    /**
     * 标准化URI数据
     *
     * @inner
     * @param {Object} data URI数据
     * @return {Object}
     */
    function normalize(data) {
        var res = {};
        // URI组成
        // http://tools.ietf.org/html/rfc3986#section-3
        var components = [
                'scheme', 'username', 'password', 'host',
                'port', 'path', 'query', 'fragment'
            ];

        components.forEach(function (name) {
            res[name] = data[name] || UNDEFINED;
        });

        return res;
    }

    /**
     * 解析authority
     * ! 不支持IPv6
     *
     * @inner
     * @param {string} str authority
     * @return {Object}
     */
    function parseAuthority(str) {
        var res = {};

        str.replace(
            /^([^@]+@)?([^:]+)(:\d+)?$/,
            function ($0, userInfo, host, port) {
                if (userInfo) {
                    userInfo = userInfo.slice(0, -1);
                    userInfo = userInfo.split(':');
                    res.username = userInfo[0];
                    res.password = userInfo[1];
                }

                res.host = host;

                if (port) {
                    res.port = port.substring(1);
                }
            }
        );

        return res;

    }

    /**
     * 检测是否有port
     *
     * @inner
     * @param {string} str uri字符串
     * @param {Object} data 数据容器
     * @return {boolean}
     */
    function detectPort(str, data) {
        // 忽略scheme 与 userinfo
        var res = /[^:]+:\d{2,}(\/|$)/.test(str);

        // 有port
        // 必定没有scheme
        if (res) {
            str = str.split('/');
            _.extend(data, parseAuthority(str.shift()));
            if (str.length > 0) {
                data.path = '/' + str.join('/');
            }
        }

        return res;
    }

    /**
     * 检测是否有scheme
     *
     * @inner
     * @param {string} str uri字符串
     * @param {Object} data 数据容器
     * @return {boolean}
     */
    function detectScheme(str, data) {
        var i = str.indexOf(':');
        var slashIndex = str.indexOf('/');
        slashIndex = slashIndex >= 0 ? slashIndex : str.length;

        // 不考虑authority
        var res = i >= 0 && i < slashIndex;

        if (res) {
            data.scheme = str.substring(0, i);
            data.path = str.substring(i + 1);
        }

        return res;
    }

    /**
     * 解析字符串
     *
     * @inner
     * @param {string} str uri字符串
     * @return {Object}
     */
    function parse(str) {
        var res = {};

        // 提取fragment
        var i = str.indexOf('#');
        if (i >= 0) {
            res.fragment = str.substring(i + 1);
            str = str.substring(0, i);
        }

        // 提取query
        i = str.indexOf('?');
        if (i >= 0) {
            res.query = str.substring(i + 1);
            str = str.substring(0, i);
        }

        // 检测是否同时有scheme与authority
        i = str.indexOf('://');
        if (i >= 0) {
            res.scheme = str.substring(0, i);
            str = str.substring(i + 3);
            // 特例 `file` 不存在 authority
            if (res.scheme === 'file') {
                res.path = str;
            }
            else {
                str = str.split('/');
                _.extend(res, parseAuthority(str.shift()));
                if (str.length > 0) {
                    res.path = '/' + str.join('/');
                }
            }
            return res;
        }

        // 检测是否含有port
        // 如果有必定不存在scheme
        if (detectPort(str, res)) {
            return res;
        }

        // 检测是否含有scheme
        // 如果有必定不存在authority
        if (detectScheme(str, res)) {
            return res;
        }

        // 只有host与path
        str = str.split('/');
        res.host = str.shift();
        if (str.length > 0) {
            res.path = '/' + str.join('/');
        }

        return res;
    }

    /**
     * 解析URI
     *
     * @public
     * @param {string|Object} data uri
     * @return {Object}
     */
    return function (data) {
        if (_.isString(data)) {
            data = parse(data);
        }

        return normalize(data);
    };

});
;

    // core
    /**
 * @file action.js
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/action', ['require', 'sfr/utils/cache', 'sfr/lang/promise', 'sfr/lang/assert', 'sfr/utils/logger', 'sfr/lang/underscore', 'sfr/utils/dom', 'sfr/utils/url'], function (require) {
    /**
     * @module action
     */

    var cache = require('sfr/utils/cache');
    var Promise = require('sfr/lang/promise');
    var assert = require('sfr/lang/assert');
    var logger = require('sfr/utils/logger');
    var _ = require('sfr/lang/underscore');
    var dom = require('sfr/utils/dom');
    var URL = require('sfr/utils/url');

    function actionFactory(router, location, history, doc, Emitter, services) {
        var exports = new Emitter();
        var pages;
        var backManually;
        var indexPageUrl;
        var isIndexPage;
        var root;
        var pageId;
        var visitedClassName;

        // The state data JUST for the next dispatch
        var stageData = {};
        var dispatchQueue = mkDispatchQueue();

        /**
         * This is provided to reset closure variables which defines the inner state.
         *
         * @private
         */
        exports.init = function () {
            services.init(this.dispatch);
            exports.pages = pages = cache.create('pages', {
                onRemove: function (page, url, evicted) {
                    if (_.isFunction(page.onRemove)) {
                        page.onRemove(url, evicted);
                    }
                },
                limit: 32
            });
            backManually = false;
            visitedClassName = 'visited';
            root = '/';
            indexPageUrl = '/';
            isIndexPage = true;
            pageId = 0;
        };

        /**
         * Get the stage data being passed to next dispatch
         *
         * @private
         * @return {Object} current state
         */
        exports.getState = function () {
            return stageData;
        };

        /**
         *  Register a service instance to action
         *
         *  @static
         *  @param {string|RestFul|RegExp} pathPattern The path of the service
         *  @param {Object} service The service object to be registered
         *  @example
         *  action.regist('/person', new Service());
         *  action.regist('/person/:id', new Service());
         *  action.regist(/^person\/\d+/, new Service());
         * */
        exports.regist = function (pathPattern, service) {
            services.register(pathPattern, service);
        };

        /**
         * Un-register a service by path
         *
         * @param {string|RestFul|RegExp} pathPattern The path of the service
         */
        exports.unregist = function (pathPattern) {
            services.unRegister(pathPattern);
        };

        /**
         *  Switch from the previous service to the current one.
         *  Call `prev.detach`, `prev.destroy`,
         *  `current.create`, `current.attach` in serial.
         *  Typically called by the Router,
         *  you may not want to call dispatch manually.
         *
         *  If any of these callbacks returns a `Thenable`, it'll be await.
         *  If the promise is rejected, the latter callbacks will **NOT** be called.
         *
         *  Returns a promise that
         *  resolves if all callbacks executed without throw (or reject),
         *  rejects if any of the callbacks throwed or rejected.
         *
         *  Note: If current and prev is the same service,
         *  the `prev.destroy` will **NOT** be called.
         *
         *  @static
         *  @param {Object} current The current scope
         *  @param {Object} prev The previous scope
         *  @return {Promise}
         * */
        exports.dispatch = function (current, prev) {
            assert(current, 'cannot dispatch with options:' + current);

            logger.log('action dispatching to: ' + current.url);

            var src = _.get(current, 'options.src');

            var prevService = services.getOrCreate(prev.url, prev.pathPattern);
            prev.service = prevService;
            var currentService = services.getOrCreate(
                current.url,
                current.pathPattern,
                // 是 redirect 或 hijack
                src !== 'history' && src !== 'back'
            );
            current.service = currentService;

            if (!pages.contains(current.url)) {
                pages.set(current.url, {
                    id: pageId,
                    isIndex: isIndexPage
                });
            }
            current.page = pages.get(current.url);
            prev.page = pages.get(prev.url);

            var data = stageData;
            stageData = {};

            if (backManually) {
                backManually = false;
                current.options.src = 'back';
            }

            // mark initial page
            if (current.options && current.options.src === 'sync') {
                indexPageUrl = current.url || '/';
            }
            else {
                isIndexPage = false;
            }

            doc.ensureAttached();
            // Abort currently the running dispatch queue,
            // and initiate a new one.
            return dispatchQueue.reset([
                function prevDetach() {
                    if (!prevService) {
                        return;
                    }
                    return prevService.constructor.instancEnabled
                        ? prevService.beforeDetach(current, prev, data)
                        : prevService.detach(current, prev, data);
                },
                function currCreate() {
                    if (!currentService) {
                        return;
                    }
                    return currentService.constructor.instancEnabled
                        ? currentService.beforeAttach(current, prev, data)
                        : currentService.create(current, prev, data);
                },
                function prevDestroy() {
                    if (!prevService) {
                        return;
                    }
                    return prevService.constructor.instancEnabled
                        ? prevService.detach(current, prev, data)
                        : prevService.destroy(current, prev, data);
                },
                function currAttach() {
                    if (!currentService) {
                        return;
                    }
                    return currentService.attach(current, prev, data);
                }
            ]).exec(function currAbort() {
                if (prevService && prevService.constructor.instancEnabled) {
                    if (currentService && currentService.abort) {
                        currentService.destroy();
                    }
                }
                else {
                    if (currentService && currentService.abort) {
                        currentService.abort(current, prev, data);
                    }
                }
            });
        };

        /**
         * Check if currently in initial page
         *
         * @return {boolean} whether current page is the index page
         */
        exports.isIndexPage = function () {
            return isIndexPage;
        };

        /**
         * Execute a queue of functions in serial, and previous execution will be stopped.
         * This is a singleton closure containing current execution queue and threadID.
         *
         * A thread (implemented by mapSeries) will be initiated for each execution.
         * And anytime there's a new thread initiating, the previous threads will stop running.
         *
         * @return {Object} DispatchQueue interfaces: {reset, exec}
         * @private
         */
        function mkDispatchQueue() {
            // Since we cannot quit a promise, there can be multiple threads running, actually.
            var MAX_THREAD_COUNT = 10000;
            // This is the ID of the currently running thread
            var threadID = 0;
            var lastAbortCallback;
            var queue = [];
            var exports = {
                reset: reset,
                exec: exec,
                aborted: false
            };

            /**
             * When reset called, a thread containing a queue of functions is initialized,
             * and latter functions in last thread will be ommited.
             *
             * @param {Array} q the tasks to be queued
             * @return {Object} The DispatchQueue object
             */
            function reset(q) {
                queue = q;
                threadID = (threadID + 1) % MAX_THREAD_COUNT;
                return exports;
            }

            /**
             * When exec called, current queue is executed in serial,
             * and a promise for the results of the functions is returned.
             *
             * @param {Function} abortCallback The callback to be called when dispatch aborted
             * @return {Promise} The promise to be resolved when all tasks completed
             */
            function exec(abortCallback) {
                // Record the thread ID for current thread
                // To ensure there's ONLY ONE thread running.
                var thisThreadID = threadID;
                if (_.isFunction(lastAbortCallback)) {
                    lastAbortCallback();
                }
                lastAbortCallback = abortCallback;
                return Promise.mapSeries(queue, function (cb) {
                    if (typeof cb !== 'function') {
                        return;
                    }
                    // Just stop running
                    if (thisThreadID !== threadID) {
                        return;
                    }
                    logger.log('calling lifecycle', cb.name);
                    return cb();
                }).catch(function (e) {
                    // throw asyncly rather than console.error(e.stack)
                    // to enable browser console's error tracing.
                    setTimeout(function () {
                        throw e;
                    });
                }).then(function () {
                    lastAbortCallback = null;
                });
            }

            return exports;
        }

        /**
         *  Check if the specified service has been registered
         *
         *  @static
         *  @param {string} urlPattern The path of the service
         *  @return {boolean} Returns true if it has been registered, else false.
         * */
        exports.exist = function (urlPattern) {
            return services.isRegistered(urlPattern);
        };

        /**
         *  config the action, called by action.start
         *
         *  @param {Object} options key/value pairs to config the action
         *  @static
         * */
        exports.config = function (options) {
            options = options || {};
            if (options.root) {
                root = options.root;
            }
            if (options.visitedClassName) {
                visitedClassName = options.visitedClassName;
            }
            router.config(options);
        };

        /**
         * Redirect to another page, and change to next state
         *
         * @static
         * @param {string} url The URL to redirect
         * @param {string} query The query string to redirect
         * @param {Object} options The router options to redirect
         * @param {string} options.title Optional, 页面的title
         * @param {boolean} options.force Optional, 是否强制跳转
         * @param {boolean} options.silent Optional, 是否静默跳转（不改变URL）
         * @param {Object} data extended data being passed to `current.options`
         * */
        exports.redirect = function (url, query, options, data) {
            logger.log('action redirecting to: ' + url);
            url = resolveUrl(url);
            _.assign(stageData, data);
            options = _.assign({}, options, {
                id: pageId++
            });
            try {
                if (options.silent) {
                    transferPageTo(url, query);
                }
                router.redirect(url, query, options);
            }
            catch (e) {
                url = URL.resolve(root, url);
                location.replace(url);
                exports.emit('redirect failed', url);
                throw e;
            }
            exports.emit('redirected', url);
        };

        function resolveUrl(url) {
            var urlObj = URL.parse(url);

            // Superframe protocol, eg. sfr://root
            if (urlObj.scheme === 'sfr') {
                if (urlObj.host === 'index') {
                    return indexPageUrl;
                }
            }

            // fallback to url
            return url;
        }

        /**
         *  Back to last state
         *
         *  @static
         * */
        exports.back = function () {
            backManually = true;
            history.back();
        };

        /**
         * Reset/replace current state
         *
         * @static
         * @param {string} url The URL to reset
         * @param {string} query The query string to reset
         * @param {Object} options The router options
         * @param {string} options.title Optional, 页面的title
         * @param {boolean} options.force Optional, 是否强制跳转
         * @param {boolean} options.silent Optional, 是否静默跳转（不改变URL）
         * @param {Object} data extended data being passed to `current.options`
         * */
        exports.reset = function (url, query, options, data) {
            if (isIndexPage) {
                indexPageUrl = url;
            }

            transferPageTo(url, query);
            _.assign(stageData, data);
            router.reset(url, query, options);
        };

        function transferPageTo(url, query) {
            var from = router.ignoreRoot(location.pathname + location.search);
            var to = router.createURL(url, query).toString();
            logger.log('[transfering page] from:', from, 'to:', to);
            pages.rename(from, to);
        }

        /**
         *  hijack global link href
         *
         *  @private
         *  @param {Event} event The click event object
         * */
        function onAnchorClick(event) {
            event = event || window.event;
            var targetEl = closest(event.target || event.srcElement, 'A');

            if (!targetEl) {
                return;
            }

            // link href only support url like pathname,e.g:/sf?params=
            var link = targetEl.getAttribute('data-sf-href');
            var options = targetEl.getAttribute('data-sf-options');

            if (link) {
                event.preventDefault();
                try {
                    options = JSON.parse(options) || {};
                }
                catch (err) {
                    // eslint-disable-next-line
                    console.warn('JSON parse failed, fallback to empty options');
                    options = {};
                }
                options.src = 'hijack';
                var extra = {
                    event: event,
                    anchor: targetEl
                };
                exports.redirect(link, null, options, extra);
                dom.addClass(targetEl, visitedClassName);
            }
        }

        /**
         * Find the closes ancestor matching the tagName
         *
         * @private
         * @param {DOMElement} element The element from which to find
         * @param {string} tagName The tagName to find
         * @return {DOMElement} The closest ancester matching the tagName
         */
        function closest(element, tagName) {
            var parent = element;
            while (parent !== null && parent.tagName !== tagName.toUpperCase()) {
                parent = parent.parentNode;
            }
            return parent;
        }

        /**
         *  Action init, call this to start the action
         *
         *  @param {Object} options key/value pairs to config the action, calling action.config() internally
         *  @static
         * */
        exports.start = function (options) {
            if (arguments.length) {
                exports.config(options);
            }
            document.body.addEventListener('click', onAnchorClick);
            router.start();
        };

        /**
         * Stop superframe redirects
         */
        exports.stop = function () {
            document.body.removeEventListener('click', onAnchorClick);
            router.stop();
            router.clear();
        };

        /**
         * Destroy the action, eliminate side effects:
         * DOM event listeners, cache namespaces, external states
         */
        exports.destroy = function () {
            exports.stop();
            cache.destroy('pages');
            services.destroy();
            exports.pages = pages = undefined;
            services.unRegisterAll();
        };

        /**
         *  Update page, reset or replace current state accordingly
         *
         *  @static
         *  @param {string} url The URL to update
         *  @param {string} query The query string to update
         *  @param {Object} options The router options to update
         *  @param {Object} data The extended data to update, typically contains `container`, `page`, and `view`
         *  @return {Object} the action object
         * */
        exports.update = function (url, query, options, data) {
            options = options ? options : {};

            // use silent mode
            if (!options.hasOwnProperty('silent')) {
                options.silent = true;
            }

            var prevUrl = router.ignoreRoot(location.pathname + location.search);
            var currentUrl = router.ignoreRoot(url);
            var currentPath = (currentUrl || '').replace(/\?.*/, '');
            var routerOptions = router.getState();

            var transition = {
                from: {
                    url: prevUrl
                },
                to: {
                    url: currentUrl,
                    path: currentPath
                },
                extra: data
            };
            return exports.partialUpdate(url, {
                replace: true,
                state: routerOptions,
                transition: transition,
                to: data && data.container && data.container.get(0),
                query: query,
                options: options
            });
        };

        /**
         * Update partial content
         *
         * @param {string} [url=null] The url to update to, do not change url if null
         * @param {string} [options=] Update options
         * @param {string} [options.from=] The container element or the selector of the container element in the DOM of the retrieved HTML
         * @param {string} [options.to=] The container element or the selector of the container element in the current DOM
         * @param {string} [options.fromUrl=url] The url of the HTML to be retrieved
         * @param {boolean} [options.replace=false] Whether or not to replace the contents of container element
         * @return {Promise} A promise resolves when update finished successfully, rejected otherwise
         */
        exports.partialUpdate = function (url, options) {
            var currUrl = router.ignoreRoot(location.pathname + location.search);
            var page = pages.get(currUrl);
            transferPageTo(url, options.query);

            options = _.assign({}, {
                fromUrl: url,
                replace: false,
                routerOptions: {},
                page: page
            }, options);

            var service = services.getOrCreate(url);
            var pending = service.partialUpdate(url, options);
            options.routerOptions.silent = true;

            // postpone URL change until fetch request is sent
            router.reset(url || location.href, options.query, options.routerOptions);

            return Promise.resolve(pending);
        };

        exports.init();

        return exports;
    }
    return actionFactory;
});
;
    // FIXME remove dependants to this
    /**
 * @file service.js service base class, service base lifecycle
 * @author taoqingqian01
 * @module service
 */

define('sfr/service', ['require'], function (require) {

    /**
     * a base/sample  service instance
     *
     * @constructor
     * @alias module:service
     */
    var service = function () {};

    /**
     * Called when service created
     *
     * @example
     * function(){
     *     // do initialization here
     *     this.onClick = function(){};
     * }
     */
    service.prototype.create = function () {};

    /**
     * Called when service attached
     *
     * @example
     * function(){
     *     // do stuff on global click
     *     $(window).on('click', this.onClick);
     * }
     */
    service.prototype.attach = function () {};

    /**
     * Called when service dettached
     *
     * @example
     * function(){
     *     // remove global listeners
     *     $(window).off('click', this.onClick);
     * }
     */
    service.prototype.detach = function () {};

    /**
     * Called when service destroy requested
     *
     * @example
     * function(){
     *     this.onClick = null;
     * }
     */
    service.prototype.destroy = function () {};

    /**
     * Called when service update requested
     *
     * @example
     * function(){
     *     // you may want to redraw your layout
     *     var rect = calcLayoutRect();
     *     this.redraw(rect);
     * }
     */
    service.prototype.update = function () {};

    return service;
});
;
    /**
 * @file Services Service factory for service instances / legacy static services
 * @author harttle<yangjvn@126.com>
 */

define('sfr/services', ['require', 'sfr/lang/map', 'sfr/lang/underscore', 'sfr/lang/assert', 'sfr/utils/logger', 'sfr/utils/cache'], function (require) {
    var Map = require('sfr/lang/map');
    var _ = require('sfr/lang/underscore');
    var assert = require('sfr/lang/assert');
    var logger = require('sfr/utils/logger');
    var cache = require('sfr/utils/cache');

    return function (router) {
        // 所有已经存在的 Service 实例：
        // * 对于新 Service 为对应 Service 类的实例
        // * 对于旧 Service 就是 Service 类本身
        var serviceInstances;
        var serviceClasses;

        var actionDispatcher;
        var url2id;
        var exports = {
            init: init,
            destroy: destroy,
            register: register,
            unRegister: unRegister,
            getServiceClass: getServiceClass,
            isRegistered: isRegistered,
            unRegisterAll: unRegisterAll,
            getOrCreate: getOrCreate,
            setInstanceLimit: setInstanceLimit,
            serviceClasses: null
        };
        var id = 0;

        function setInstanceLimit(n) {
            return exports.serviceInstances.setLimit(n);
        }

        function init(dispatcher) {
            url2id = new Map();
            actionDispatcher = dispatcher;
            serviceClasses = exports.serviceClasses = new Map();
            serviceInstances = exports.serviceInstances = cache.create('services', {
                onRemove: function (service, url, evicted) {
                    _.isFunction(service.destroy) && service.destroy(url, evicted);
                },
                limit: 8
            });
        }

        function destroy() {
            cache.destroy('services');
        }

        function register(pathPattern, service) {
            assert(pathPattern, 'invalid path pattern');
            assert(!serviceClasses.has(pathPattern), 'path already registerd');

            router.add(pathPattern, actionDispatcher);
            serviceClasses.set(pathPattern, service);

            logger.log('service registered to: ' + pathPattern);
        }

        function isRegistered(pathPattern) {
            return serviceClasses.has(pathPattern);
        }

        function unRegisterAll(pathPattern) {
            serviceClasses.keys().forEach(unRegister);
            serviceClasses.clear();
        }

        function unRegister(pathPattern) {
            assert(pathPattern, 'invalid path pattern');
            assert(isRegistered(pathPattern), 'path not registered');
            router.remove(pathPattern);
            serviceClasses.delete(pathPattern);
            logger.log('service unregistered from: ' + pathPattern);
        }

        function getService(url) {
            var id = url2id.get(url);
            if (id === undefined) {
                return undefined;
            }
            return serviceInstances.get(id);
        }

        function getServiceClass(pathPattern) {
            return serviceClasses.get(pathPattern);
        }

        function addInstance(url, instance) {
            var instanceId = id++;
            url2id.set(url, instanceId);
            instance.id = instanceId;
            serviceInstances.set(instanceId, instance);
            return instance;
        }

        // 由于目前还是 URL 索引页面，ignoreCache 为同样 URL 创建新的页面仍不可行
        function getOrCreate(url, pathPattern, ignoreCache) {
            // return if exist
            var service = getService(url);
            if (service) {
                return service;
            }

            // use static service instance
            if (arguments.length < 2) {
                pathPattern = router.pathPattern(url);
            }
            var Service = getServiceClass(pathPattern);
            if (Service) {
                var instance = Service.instancEnabled ? new Service(url) : Service;
                return addInstance(url, instance);
            }
        }

        return exports;
    };
});
;
    /**
 * @file resource.js REST resource CRUD utility
 * @author harttle<yangjun14@baidu.com>
 * @module resource
 */
define('sfr/resource', ['require', 'sfr/utils/http', 'sfr/lang/underscore'], function (require) {
    var http = require('sfr/utils/http');
    var _ = require('sfr/lang/underscore');

    /**
     * The REST resource CRUD utility
     *
     * @constructor
     * @alias module:resource
     * @param {string} url The RESTful url pattern
     */
    function Resource(url) {
        this.url = url;
    }
    Resource.prototype = {

        /**
         * Get the URL for the given optionsions
         *
         * @param {Object} options A set of key/value pairs to configure the URL query.
         * @return {string} A string of URL.
         */
        'getUrl': function (options) {
            var url = this.url;
            // replace slugs with properties
            _.forOwn(options, function (v, k) {
                url = url.replace(':' + k, v);
            });
            // remove remaining slugs
            url = url.replace(/:[a-zA-Z]\w*/g, '');
            return url;
        },

        /**
         * Create an Object from `obj` with the given `options`.
         *
         * @param {Object} obj A plain Object to be created on the server.
         * @param {Object} options A set of key/value pairs to configure the URL query.
         * @return {Promise} A promise resolves when `obj` is created successful,
         * and rejects whenever there is an error.
         */
        'create': function (obj, options) {
            var url = this.getUrl(options);
            return http.post(url, obj);
        },

        /**
         * Query Objects with the given `options`.
         *
         * @param {Object} options A set of key/value pairs to configure the URL query.
         * @return {Promise} A promise resolves when retrieved successful,
         * and rejects whenever there is an error.
         */
        'query': function (options) {
            var url = this.getUrl(options);
            return http.get(url);
        },

        /**
         * Update the object specified by `obj` with the given `options`.
         *
         * @param {Object} obj A plain object to update with.
         * @param {Object} options A set of key/value pairs to configure the URL query.
         * @return {Promise} A promise resolves when `obj` is updated successful,
         * and rejects whenever there is an error.
         */
        'update': function (obj, options) {
            var url = this.getUrl(options);
            return http.put(url, obj);
        },

        /**
         * Delete objects with the given `options`.
         *
         * @param {Object} options A set of key/value pairs to configure the URL query.
         * @return {Promise} A promise resolves when `obj` is deleted successful, and rejects whenever there is an error.
         */
        'delete': function (options) {
            var url = this.getUrl(options);
            return http.delete(url);
        }
    };

    Resource.prototype.constructor = Resource;

    return Resource;
});
;
    /**
 * @file view.js View prototype for service implementations
 * @author harttle <yangjun14@baidu.com>
 * @module view
 */

define('sfr/view', ['require'], function (require) {

    /**
     * Create a new view instance
     *
     * @alias module:view
     * @constructor
     */
    var View = function () {
        this._init();
    };

    View.prototype = {
        constructor: View,

        // eslint-disable-next-line
        _init: function () {},

        /**
         * Initialize properties
         * */
        set: function () {},

        /**
         * Get properties
         */
        get: function () {},

        /**
         * Called when view created
         */
        create: function () {},

        /**
         *  Render the DOM, called when render requested. Override this to render your HTML
         * */
        render: function () {},

        /**
         *  Update the view, called when update requested. Override this to update or re-render your HTML.
         * */
        update: function () {},

        /**
         * Callback when view attached to DOM
         */
        attach: function () {},

        /**
         * Callback when view detached from DOM
         */
        detach: function () {},

        /**
         * Destroy the view, called when destroy requested.
         * */
        destroy: function () {},

        /**
         * Bind an event to the view.
         *
         * @param {string} name The name of the event
         * @param {Function} callback The callback when the event triggered
         * */
        on: function (name, callback) {},

        /**
         * Unbind the given event
         *
         * @param {string} name The event name to unbind
         * */
        off: function (name) {}
    };

    return View;
});
;
    /**
 * @file doc.js Root document container for all SF pages
 * @author harttle<yangjun14@baidu.com>
 */

define('sfr/doc', ['require'], function (require) {

    function docFactory(mainDoc) {
        var doc = mainDoc.querySelector('#sfr-app');
        if (!doc) {
            doc = mainDoc.createElement('div');
            doc.setAttribute('id', 'sfr-app');
        }

        doc.ensureAttached = ensureAttached;
        doc.ensureAttached();

        function ensureAttached() {
            var result = mainDoc.querySelector('#sfr-app');
            if (!result) {
                mainDoc.body.appendChild(doc);
            }
        }

        return doc;
    }

    return docFactory;
});
;
    /**
 * @file config.js DI assembly configuration
 * @author harttle<yangjun14@baidu.com>
 */
define('sfr/config', ['require', 'sfr/action', 'sfr/router/router', 'sfr/view', 'sfr/service', 'sfr/services', 'sfr/resource', 'sfr/doc', 'sfr/utils/cache', 'sfr/utils/http', 'sfr/utils/url', 'sfr/utils/di', 'sfr/utils/emitter', 'sfr/lang/assert', 'sfr/lang/underscore', 'sfr/lang/promise', 'sfr/lang/map', 'sfr/utils/logger'], function (require) {
    var config = {
        // core
        action: {
            type: 'factory',
            module: require('sfr/action'),
            args: [
                'router',
                'location',
                'history',
                'doc',
                'emitter',
                'services'
            ]
        },
        router: {
            type: 'factory',
            module: require('sfr/router/router')
        },
        view: {
            type: 'value',
            module: require('sfr/view')
        },
        service: {
            type: 'value',
            module: require('sfr/service')
        },
        services: {
            type: 'factory',
            args: ['router'],
            module: require('sfr/services')
        },
        resource: {
            type: 'value',
            module: require('sfr/resource')
        },
        doc: {
            type: 'factory',
            module: require('sfr/doc'),
            args: ['document']
        },
        // Utils
        cache: {
            type: 'value',
            module: require('sfr/utils/cache')
        },
        http: {
            type: 'value',
            module: require('sfr/utils/http')
        },
        url: {
            type: 'value',
            module: require('sfr/utils/url')
        },
        di: {
            type: 'value',
            module: require('sfr/utils/di')
        },
        emitter: {
            type: 'value',
            module: require('sfr/utils/emitter')
        },
        // Language Enhancements
        assert: {
            type: 'value',
            module: require('sfr/lang/assert')
        },
        // eslint-disable-next-line
        _: {
            type: 'value',
            module: require('sfr/lang/underscore')
        },
        promise: {
            type: 'value',
            module: require('sfr/lang/promise')
        },
        map: {
            type: 'value',
            module: require('sfr/lang/map')
        },
        // DOM/BOM APIs
        window: {
            type: 'value',
            value: window
        },
        document: {
            type: 'value',
            value: window.document
        },
        location: {
            type: 'value',
            value: window.location
        },
        history: {
            type: 'value',
            value: window.history
        },
        logger: {
            type: 'value',
            module: require('sfr/utils/logger')
        }
    };
    return config;
});
;

    define('sfr', ['sfr/utils/di', 'sfr/config'], function (DI, config) {
        var di = new DI(config);

        Object.keys(config).forEach(di.resolve, di);
        return di.container;
    });
})();
