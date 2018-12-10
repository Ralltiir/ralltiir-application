# 最佳实践

在这里我们将引导开发者体验 Ralltiir Application 的开发最佳实践，在完成我们的步骤后，就会实现一个 Ralltiir Application 应用。

## 安装

在官方示例中我们给出了 Ralltiir Application Demo，可以按照以下命令进行安装。

```bash
npm i -g apmjs
git clone https://github.com/Ralltiir/ralltiir-application-demo.git
cd ralltiir-application-demo
npm install
apmjs install
```

## 运行

可以执行如下命令运行 Ralltiir Application Demo。

```bash
npm start
```

在浏览器中打开 http://localhost:8080/ralltiir-application-demo/home 就能看到 Ralltiir Application Demo 运行的效果，接着就可以按照官方示例进行开发了。如果你想深入学习 Ralltiir Application 以获得更多的了解，推荐你参考 [基础指南][basic-guide] 和 [高级教程][advanced] 两部分的内容。

## 代码组织

Ralltiir Application Demo 的代码组织目录如下所示。

```
.
├── errors
│   ├── bad-body.html                
│   ├── bad-head.html                
├── .gitignore                        
├── README.md
├── amd-lock.json
├── common.css                        通用样式
├── common.js							调试/模块引入/Service 注册/引导启动
├── custom-transition-style.html
├── disable-dispatch.html             
├── disable-dispatch.js
├── error-handling.html
├── favicon.ico                        
├── home.html							模板入口文件
├── lifecycle.css
├── lifecycle.html                      
├── package-lock.json
├── package.json
├── partial-update-advanced.html
├── partial-update.html
├── partial-update.js
├── performance.html
├── postmessage-1.html
├── postmessage-2.html
├── scroll-restore.html
├── shell-1.html
└── shell-2.html                       
```

[basic-guide]: https://ralltiir.github.io/ralltiir-application/basic-guide/
[advanced]: https://ralltiir.github.io/ralltiir-application/advanced/
