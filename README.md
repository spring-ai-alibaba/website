# 📚 Docusaurus 文档网站模板

> Tips：所有代码都由 ai 生成，外加一些修改优化，可以构建并部署！
> 基于 Docusaurus 3 构建的现代化文档网站模板，支持中英文双语，内置智能搜索系统和动效设计

[![Built with Docusaurus](https://img.shields.io/badge/Built%20with-Docusaurus-brightgreen.svg)](https://docusaurus.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 核心特性

🌍 **多语言支持** - 完整的中英文双语支持，一键切换  
🔍 **智能搜索** - 本地搜索 + AI 向量搜索双重搜索系统  
🎨 **美观主题** - 浅色奶油色 + 深色星夜主题  
🌟 **动效设计** - 流星雨背景 + 浮动云朵动画  
📱 **响应式设计** - 完美适配桌面端和移动端  
⚙️ **一键配置** - 统一配置文件，自动同步所有设置  

## 🚀 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/your-username/docs-website-tmpl.git
cd docs-website-tmpl

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm start

# 4. 浏览器自动打开 http://localhost:3000
```

### 环境要求
- Node.js 18+
- npm 或 yarn

## 🌍 多语言支持

本模板完整支持中英文双语，用户可通过导航栏右上角的语言切换器切换语言。

### 访问方式
- **中文版本**：`http://localhost:3000/`  
- **英文版本**：`http://localhost:3000/en/`

### 多语言开发命令

```bash
# 开发模式
npm start          # 默认中文
npm run start:en   # 英文版本
npm run start:zh   # 中文版本

# 构建
npm run build      # 构建所有语言
npm run build:en   # 只构建英文
npm run build:zh   # 只构建中文

# 翻译管理
npm run write-translations        # 生成翻译文件
npm run write-translations:en     # 生成英文翻译
```

### 添加多语言内容

**英文文档**：在 `i18n/en/docusaurus-plugin-content-docs/current/` 创建对应的 `.md` 文件

**英文博客**：在 `i18n/en/docusaurus-plugin-content-blog/` 创建博客文章

## ⚙️ 配置项目

**🎯 一键配置** - 只需编辑根目录的 `project.config.ts`：

```typescript
const projectConfig: ProjectConfig = {
  title: '你的项目名称',
  tagline: '你的项目描述',
  
  author: {
    name: '你的姓名',
    email: 'your.email@example.com',
  },
  
  github: {
    username: 'your-username',
    repoName: 'your-repo-name',
  },
  
  deployment: {
    url: 'https://your-domain.com',
    baseUrl: '/',
  },
}
```

配置完成后运行 `npm run build` 即可生效！

## 📁 项目结构

```
docs-website-tmpl/
├── docs/                    # 中文文档
├── blog/                    # 中文博客
├── i18n/                    # 多语言翻译文件
│   ├── zh-Hans/            # 中文翻译
│   └── en/                 # 英文翻译和内容
├── src/
│   ├── components/         # React 组件
│   ├── css/               # 自定义样式
│   └── pages/             # 自定义页面
├── static/img/            # 静态资源
├── docusaurus.config.ts   # Docusaurus 配置
├── project.config.ts      # 项目配置（重要！）
└── sidebars.ts           # 侧边栏配置
```

## 📝 添加内容

### 添加文档页面

1. 在 `docs/` 创建 `.md` 文件
2. 添加 frontmatter：
   ```markdown
   ---
   sidebar_position: 1
   title: 页面标题
   ---
   
   # 内容标题
   
   页面内容...
   ```

### 添加博客文章

1. 在 `blog/` 创建 `YYYY-MM-DD-title.md` 文件
2. 添加 frontmatter：
   ```markdown
   ---
   slug: article-slug
   title: 文章标题
   authors: [author-name]
   tags: [tag1, tag2]
   ---
   
   文章摘要...
   
   <!--truncate-->
   
   详细内容...
   ```

## 🔍 搜索配置

### 本地搜索
自动启用. 使用 Fuze.js 实现，效果不好，建议 https://www.algolia.com/ 。

### AI 向量搜索（调试中）
编辑 `project.config.ts` 启用：

```typescript
search: {
  enableVectorSearch: true,
  pinecone: {
    apiKey: 'your-pinecone-api-key',
    environment: 'your-environment',
    indexName: 'your-index'
  }
}
```

## 📦 常用命令

```bash
npm start             # 开发服务器
npm run build         # 构建生产版本
npm run serve         # 预览构建结果
npm run clear         # 清除缓存
npm run lint          # 代码检查
npm run typecheck     # 类型检查
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
