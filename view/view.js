/**
 * @file    通用 view
 * @author  lizhaoming
 */
console.log('ha!')

define(function (require) {
    require('../utils/animation');
    var rt = require('ralltiir');
    var http = rt.http;
    var Naboo = require('../utils/naboo');
    var Renderer = require('./render');
    var _ = rt._;
    var action = rt.action;
    var Promise = rt.promise;
    var animationTimeMs = 300;
    var animationDelayMs = 0;
    var animationEase = 'ease';

    function View(options) {
        this.renderer = new Renderer();
        this.backOption = {
            html: '<i class="c-icon">&#xe750;</i>',
            onClick: action.back.bind(action)
        };
        this.defaultHeadOptions = options || {
            back: this.backOption
        };
    }

    View.prototype.setTemplateStream = function (promise) {
        this.resourceQueryPromise = promise;
    };

    View.prototype.render = function () {
        this.prepareRender();
        var view = this;
        if (this.streamRenderPromise) {
            return this.streamRenderPromise;
        }
        return this.streamRenderPromise = this.resourceQueryPromise
        .then(function (xhr) {
            return Promise.all([
                view.renderer.render(view.$head[0], xhr.data || '', {
                    replace: true,
                    from: '.rt-head',
                    render: view.updateHead.bind(view)
                }),
                view.renderer.render(view.$body[0], xhr.data || '', {
                    replace: true,
                    from: '.rt-body'
                })
            ]);
        })
        .then(function () {
            view.rendered = true;
        });
    };

    View.prototype.updateHead = function (container) {
        this.$head.html(container.innerHTML);
        if (history.length) {
            updateTitleBarElement(this.$head.find('.rt-back'), this.backOption);
        }
    };

    View.prototype.partialUpdate = function (url, options) {
        var renderer = this.renderer;
        var body = this.$body[0];
        var to = options.to ? body.querySelector(options.to) : body;

        if (options.replace) {
            var evt = new Event('rt.updating');
            evt.options = options
            to.dispatchEvent(evt);
        }

        return View
        .createTemplateStream(url, {
            'x-rt-partial': 'true',
            'x-rt-selector': options.from || ':root'
        })
        .then(function (xhr) {
            rt.action.reset(url, null, {silent: true});
            to.dispatchEvent(new Event('rt.willUpdate'));
            return renderer.render(to, xhr.data || '', {
                from: options.from,
                replace: options.replace
            })
            .then(function () {
                to.dispatchEvent(new Event('rt.updated'));
            });
        })
        .catch(function (e) {
            console.warn('partialUpdate Error, redirecting', e);
            location.href = url;
        });
    };

    function updateTitleBarElement($el, options) {
        if (_.has(options, 'html')) {
            $el.html(options.html);
        }
        if (_.has(options, 'onClick')) {
            $el.off('click').on('click', function () {
                var cb = _.get(options, 'onClick') || _.noop;
                cb();
            });
        }
    }

    View.prototype.setHead = function (desc) {
        desc = desc || {};
        var $head = this.$head;

        desc.back = history.length > 0 ? this.backOption : desc.back;
        updateTitleBarElement($head.find('.rt-back'), desc.back);
        updateTitleBarElement($head.find('.rt-title'), desc.title);
        updateTitleBarElement($head.find('.rt-subtitle'), desc.subtitle);

        if (desc.actions) {
            var $tool = $head.find('.rt-actions');
            $tool.empty();
            _.forEach(desc.actions, function (icon) {
                var $icon = $('<span>');
                updateTitleBarElement($icon, icon);
                $tool.append($icon);
            });
        }
    };

    View.prototype.parse = function ($el) {
        this.$view = $el;
        this.$head = $el.find('.rt-head');
        this.$body = $el.find('.rt-body');
        this.$view.addClass('active');
        this.$view.get(0).ralltiir = this;
        this.setHead(this.defaultHeadOptions);
        this.rendered = true;
    };

    View.prototype.renderFrame = function (opts) {
        if (this.frameRendered) {
            return false;
        }
        this.frameRendered = true;

        this.$view = $('<div class="rt-view active">');
        this.$body = $('<div class="rt-body">');
        this.$head = $([
            '<div class="rt-head">',
                '<div class="rt-back"></div>',
                '<div class="rt-actions"></div>',
                '<div class="rt-center">',
                    '<span class="rt-title"></span>',
                    '<span class="rt-subtitle"></span>',
                '</div>',
            '</div>'
        ].join(''));
        this.setHead(_.defaultsDeep(opts.head, this.defaultHeadOptions));

        this.$view.append(this.$head).append(this.$body);
        this.$view.get(0).ralltiir = this;

        $(rt.doc).append(this.$view);
    };

    // TODO 统一由 attach 操作，干掉 reAttach
    View.prototype.reAttach = function () {
        this.$view.addClass('active');
        rt.doc.appendChild(this.$view.get(0));
    };

    View.prototype.startEnterAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.enterAnimate) {
                var dom = self.$view[0];
                Naboo.enter(dom, animationTimeMs, animationEase, animationDelayMs).start(resolve);
            }
            else {
                self.$view.css({
                    'opacity': 1,
                    '-webkit-transform': 'none',
                    'transform': 'none'
                }).show();
                resolve();
            }
        });
    };

    View.prototype.prepareRender = function () {
        // 设为 static 的动作必须在动画结束后且原页面已销毁时进行操作
        // 否则会导致页面滚动位置的跳动
        this.$view.css({
            'position': 'static',
            '-webkit-transform': 'none',
            'transform': 'none',
            'min-height': $(window).height()
        });
    };

    View.prototype.attach = function () {
        this.$view.trigger('rt.attached');
        this.attached = true;
        //不使用restoreScrollState，因为要处理回退后再打开（scollX无记录）置顶的情况
        scrollTo(this.scrollX, this.scrollY);
    };

    View.prototype.beforeDetach = function (current, prev) {
        this.$body.trigger('rt.willDetach');
        // 对历史记录操作，不保存浏览位置
        if (['back', 'history'].indexOf(current.options.src) < 0) {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
        }
        this.$view.removeClass('active');
    };

    View.prototype.detach = function () {
        this.$view.trigger('rt.detached');
        this.$view.remove();
        this.attached = false;
    };

    View.prototype.startExitAnimate = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.exitAnimate) {
                var dom = self.$view[0];
                Naboo
                .exit(dom, animationTimeMs, animationEase, animationDelayMs)
                .start(function () {
                    resolve();
                });
            }
            else {
                self.$view.css({
                    'display': 'none',
                    '-webkit-transform': 'none',
                    'transform': 'none'
                });
                resolve();
            }
        });
    };

    View.prototype.destroy = function () {
        this.$view
        .trigger('rt.destroyed')
        .remove();
        delete this.$view;
        delete this.$head;
        delete this.$body;
    };

    View.prototype.restoreScrollState = function () {
        if (this.hasOwnProperty('scrollX')) {
            scrollTo(this.scrollX, this.scrollY);
        }
    };

    View.createTemplateStream = function (url, headers) {
        return http.ajax(url, {
            headers: _.assign(headers, {
                'x-rt': 'true'
            }),
            xhrFields: {
                withCredentials: true
            }
        });
    };

    return View;
});
