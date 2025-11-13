# Spring AI Alibaba Documentation Website

Spring AI Alibaba 项目的官方文档网站，基于 Docusaurus 构建。

## 快速开始

确保本地已经安装了 npm。之后执行 `make install && make preview`。

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
