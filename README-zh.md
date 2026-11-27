# Spring AI Alibaba Documentation Website

Spring AI Alibaba 项目的官方文档网站，基于 Docusaurus 构建。

## 快速开始

确保本地已经安装了 npm。之后执行 `make install && make preview`。

## 文档版本

`2.1.x` 是默认版本，维护在 `docs`、`agents-docs`、`integration` 和 `ecosystem`。历史版本 `1.x` 和 `2.0.x` 的文档和侧栏位于各区的 `*_versioned_docs`、`*_versioned_sidebars`，框架文档不带目录前缀。

按页面示例所用 API 的版本选择源文件。同一文档区内使用相对链接，历史版跨文档区链接包含版本号。最新版本保留无版本前缀的 URL。英文译文位于 `i18n/en`，没有译文的页面显示站点默认语言。

## 中英文启动

默认中文： `make preview`
英文：`make preview-en`

## 构建并启动

`make build && make serve`

## 提交之前

在提交之前，执行 `make npm-lint && make markdown`，确保 github CI 顺利通过。
（PS：可能需要安装 ci 工具，运行 `make help` 查看修复命令和安装格式化工具。

## 有用的提示

1. docusaurus makdown 特性，合理运用，会使文档结构更好更利于阅读：https://docusaurus.io/zh-CN/docs/markdown-features/react；
2. `make pangu-lint f=${file path}`：盘古之白自动添加，文档排版更清晰利于阅读；
3. 中文文档写作指南：https://github.com/stars/yuluo-yx/lists/docs
