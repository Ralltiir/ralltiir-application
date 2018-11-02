# Ralltiir Application

[![Build Status](https://travis-ci.org/Ralltiir/ralltiir-application.svg?branch=travis-ci)](https://travis-ci.org/Ralltiir/ralltiir-application)
[![Coverage Status](https://coveralls.io/repos/github/Ralltiir/ralltiir-application/badge.png?branch=travis-ci)](https://coveralls.io/github/Ralltiir/ralltiir-application?branch=travis-ci)

Ralltiir Application 是以 Ralltiir 为框架核心的的应用程序，是一种适合构建前端单页异步场景产品的一系列技术解决方案。通过 Ralltiir 引擎的能力，可以提高页面渲染速度，控制页面的入场、渲染和退场行为，并且拥有低成本的传统 Web 页面接入方式。

Documentation：[Ralltiir Application Doc][rt-app-doc]。

Live Demo: <https://ralltiir.github.io/ralltiir-application-demo/home>

## 安装

推荐通过 npm 进行安装和使用。
```bash
npm install --save ralltiir-application
```

## 快速开始

Ralltiir Application 可以将传统的 Web 页面稍加修改，再配合适当的服务器配置，就构建成为能够实现跨域的单页异步应用程序。

### 页面结构

Ralltiir Application 是一个运行在浏览器中的异步应用程序，首先在页面中必须包含一个 `#sfr-app` 元素，然后定义一个 `.rt-view` 来包含（服务器端渲染的）当前页内容。 其中 `.rt-head` 用来包含头部内容（导航栏），`.rt-body` 用来包含页面主体内容。

示例结构如下：

```html
<div id="sfr-app">
    <div class="rt-view">
        <div class="rt-head">
            <div class="rt-back"></div>
            <div class="rt-actions"></div>
            <div class="rt-center">
                <span class="rt-title"></span>
                <span class="rt-subtitle"></span>
            </div>
        </div>
        <div class="rt-body"></div>
    </div>
</div>
```

### 注册 Service

Service 是处理页面下载和渲染等逻辑的载体。可以将一个 Service 注册到一个 URL 模式。 在 Ralltiir 打开这个 URL 时，就会调用对应 Service 的生命周期函数来完成下载和渲染。

现在编写两个页面，其 URL 分别为 `/home` 和 `/profile`。 然后在入口页面注册这两个 URL：

```javascript
var rt = require('ralltiir');
var Service = require('ralltiir-application/service');

rt.services.register('/home', {title: {html: '主页标题'}}, Service);
rt.services.register('/profile', {title: {html: '个人页标题'}}, Service);

// 启动 Ralltiir
rt.action.start();
```

### 路由跳转

在 `/home` 页面添加到 `/profile` 的链接：

```html
<a href="profile" data-sf-href="/profile">前往个人页</a>
```

点击该链接即可从 `/home` 页异步打开 `/profile` 页面。

## 版本发布

首先执行安装所有依赖：

```bash
npm insatll && apmjs install
```

接着使用 npm version 发布到 npm 和 Github，例如发布一个 patch 版本：

```bash
npm version patch
npm publish
```

## 文档部署

首先执行安装 gitbook 所需依赖：

```bash
npm run doc:install
```

可以在本地进行文档预览：

```bash
npm run doc:preview
```

部署到 github.io：

```bash
npm run doc:deploy
```

## API

API 使用方法请参考：[Ralltiir API][rt-api-wiki]。


## Contributions

The Ralltiir Team

[rt-app-doc]: https://ralltiir.github.io/ralltiir/get-started/html-structure.html
[rt-api-wiki]: https://ralltiir.github.io/ralltiir/api/action.html