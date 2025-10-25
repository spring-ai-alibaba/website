# Spring AI Alibaba Documentation Website

这是 Spring AI Alibaba 项目的官方文档网站，基于 Docusaurus 构建。

## ✨ 特性

- 📚 完整的文档体系
- 🌐 多语言支持（中文、英文）
- 🎨 精美的主题设计（亮色/暗色模式）
- 📝 博客系统
- 🔍 搜索功能
- 📱 响应式设计
- **🔄 多版本文档支持**（Agent Framework & Graph Core）

## 🚀 快速开始

### 安装依赖

```bash
npm install
# 或
make install
```

### 启动开发服务器

```bash
npm start
# 或
make preview
```

访问 http://localhost:3000 查看网站。

### 构建生产版本

```bash
npm run build
# 或
make build
```

### 本地预览生产构建

```bash
npm run serve
# 或
make serve
```

## 📖 多版本文档

本项目为 **Agent Framework** 和 **Graph Core** 提供了完整的多版本文档支持。

### 快速使用

```bash
# 查看版本管理帮助
make version-help

# 列出所有版本
make version-list

# 创建新版本
make version-create-agent VERSION=2.0
make version-create-graph VERSION=2.0
```

### 相关文档

- 📘 [快速开始](./QUICKSTART_VERSIONING.md) - 快速上手多版本文档
- 📙 [实现文档](./VERSIONING_IMPLEMENTATION.md) - 完整的实现细节
- 📗 [视觉指南](./VERSIONING_GUIDE.md) - 图解说明
- 📕 [详细说明](./docs-versioned/README.md) - 版本管理详细文档

## 🛠️ Make 命令

### 通用命令

```bash
make help              # 显示所有可用命令
make install           # 安装依赖
make preview           # 启动开发服务器
make build             # 构建生产版本
make serve             # 预览生产构建
```

### 版本管理命令

```bash
make version-help                        # 版本管理帮助
make version-init                        # 初始化版本化结构
make version-list                        # 列出所有版本
make version-create-agent VERSION=x.x   # 创建 Agent Framework 版本
make version-create-graph VERSION=x.x   # 创建 Graph Core 版本
make version-delete-agent VERSION=x.x   # 删除 Agent Framework 版本
make version-delete-graph VERSION=x.x   # 删除 Graph Core 版本
make version-sync-current                # 同步当前文档
```

### 代码检查命令

```bash
make markdown          # Markdown 格式检查
make markdown-fix      # 修复 Markdown 格式
make yamllint          # YAML 格式检查
make codespell         # 拼写检查
make checklinks        # 检查断链
make pnpm-lint         # TypeScript/JavaScript 检查
make pnpm-lint-fix     # 修复 TypeScript/JavaScript
```

## 📁 项目结构

```
website/
├── blog/                      # 博客文章
├── docs/                      # 主文档
│   ├── agents/               # 智能体文档
│   ├── frameworks/           # 框架文档
│   │   ├── admin/           # Admin（非版本化）
│   │   └── extensions/      # Extensions（非版本化）
│   └── intro.md             # 介绍页面
├── docs-versioned/           # 版本化文档
│   ├── agent-framework/     # Agent Framework 多版本
│   │   ├── current/        # 当前开发版本
│   │   └── 1.x/            # 1.x 版本
│   └── graph-core/          # Graph Core 多版本
│       ├── current/
│       └── 1.x/
├── src/                      # 源代码
│   ├── components/          # React 组件
│   │   └── VersionDropdown/ # 版本选择器
│   ├── css/                 # 样式文件
│   ├── pages/               # 自定义页面
│   └── theme/               # 主题覆盖
├── static/                   # 静态资源
├── tools/                    # 工具脚本
│   └── make/                # Make 命令
│       ├── Makefile.core.mk
│       └── Makefile.version.mk
├── docusaurus.config.ts     # Docusaurus 配置
├── sidebars.ts              # 主侧边栏配置
├── sidebars-agent-framework.ts  # Agent Framework 侧边栏
├── sidebars-graph-core.ts       # Graph Core 侧边栏
└── package.json             # 项目依赖
```

## 🎯 文档编写指南

### 主文档

编辑 `docs/` 目录下的文件：

```bash
docs/
├── intro.md                           # 介绍
├── agents/                            # 智能体
│   ├── dataagent/
│   ├── jmanus/
│   └── deepresearch/
└── frameworks/                        # 框架
    ├── admin/                         # 非版本化
    └── extensions/                    # 非版本化
```

### 版本化文档

编辑 `docs-versioned/` 目录下的文件：

```bash
docs-versioned/
├── agent-framework/
│   └── current/                       # 编辑这里
│       ├── quick-start.md
│       ├── core-concepts/
│       ├── guides/
│       └── api/
└── graph-core/
    └── current/                       # 编辑这里
        └── ...
```

### 博客文章

在 `blog/` 目录下创建 Markdown 文件：

```markdown
---
title: 文章标题
date: 2025-01-01
authors: [author1]
tags: [tag1, tag2]
---

文章内容...
```

## 🌐 多语言支持

### 目录结构

```
i18n/
├── en/                      # 英文翻译
│   ├── docusaurus-plugin-content-docs/
│   └── docusaurus-plugin-content-blog/
└── zh-Hans/                 # 简体中文翻译
    └── ...
```

### 启动特定语言

```bash
npm run start:en     # 英文
npm run start:zh     # 简体中文
```

### 构建特定语言

```bash
npm run build:en     # 英文
npm run build:zh     # 简体中文
```

## 🎨 主题定制

### 颜色主题

- **亮色模式**: Paper Cream Theme（纸质奶油色）
- **暗色模式**: Starry Night Theme（星空主题）

### 自定义样式

编辑 `src/css/custom.css` 来定制样式。

### 组件覆盖

在 `src/theme/` 目录下覆盖 Docusaurus 组件。

## 🔧 开发工作流

### 日常开发

1. 启动开发服务器：`npm start`
2. 编辑文档或代码
3. 浏览器自动刷新
4. 提交更改

### 发布新版本文档

1. 创建版本快照
   ```bash
   make version-create-agent VERSION=2.0
   make version-create-graph VERSION=2.0
   ```

2. 更新配置文件
   - `docusaurus.config.ts`
   - `src/components/VersionDropdown/index.tsx`

3. 测试并提交
   ```bash
   npm start
   # 测试功能
   git add .
   git commit -m "docs: 发布 2.0 版本"
   ```

### 代码检查

提交前运行检查：

```bash
make markdown-fix      # 修复 Markdown 格式
make pnpm-lint-fix     # 修复代码格式
make yamllint          # 检查 YAML
```

## 📚 相关资源

### 官方文档

- [Docusaurus 官方文档](https://docusaurus.io/)
- [Docusaurus 多实例文档](https://docusaurus.io/docs/docs-multi-instance)
- [Docusaurus 版本管理](https://docusaurus.io/docs/versioning)

### 项目文档

- [快速开始 - 多版本](./QUICKSTART_VERSIONING.md)
- [实现文档](./VERSIONING_IMPLEMENTATION.md)
- [视觉指南](./VERSIONING_GUIDE.md)
- [版本管理详细说明](./docs-versioned/README.md)

## 🤝 贡献指南

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

### 提交规范

使用 Conventional Commits 格式：

```
docs: 更新快速开始文档
feat: 添加新功能
fix: 修复错误
style: 样式调整
```

## 📄 许可证

见 [LICENSE](./LICENSE) 文件。

## 🙋 获取帮助

- 📖 查看文档：访问 [网站](https://spring-ai-alibaba.github.io/website/)
- 💬 讨论：[GitHub Discussions](https://github.com/spring-ai-alibaba/website/discussions)
- 🐛 报告问题：[GitHub Issues](https://github.com/spring-ai-alibaba/website/issues)

## 🎉 致谢

感谢所有为本项目做出贡献的开发者！

---

**开始探索吧！** 🚀
