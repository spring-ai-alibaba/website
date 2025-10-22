---
sidebar_position: 2
---

# 快速开始指南 🚀

几分钟内启动并运行项目！本指南将引导完成有效使用项目的基本步骤。

## 基本使用

### 步骤 1: 初始化项目

首先，创建一个新的项目实例：

```javascript title="main.js"
import { YourProject } from 'your-project-name'

// 创建新实例
const project = new YourProject({
  name: '我的超棒项目',
  theme: 'dual',
  features: ['responsive', 'search', 'darkMode']
})
```

### 步骤 2: 配置设置

设置项目配置：

```javascript title="config.js"
const config = {
  // 基本设置
  title: '项目文档',
  description: '为项目提供精美文档',
  
  // 主题设置
  theme: {
    primary: '#2563eb',
    secondary: '#60a5fa',
    mode: 'dual' // 'light', 'dark', 或 'dual'
  },
  
  // 功能
  features: {
    search: true,
    toc: true,
    breadcrumbs: true,
    editLinks: true
  }
}

export default config
```

### 步骤 3: 添加内容

创建第一个内容：

```markdown title="docs/hello-world.md"
# 你好，世界！

这是第一个文档。可以使用以下内容编写：

- **Markdown** 进行格式化
- `代码块` 用于示例
- 表格、列表等等！

## 代码示例

```javascript
function greet(name) {
  return `你好, ${name}！`
}

console.log(greet('世界'))
```
```

### 步骤 4: 开始开发

在本地运行项目：

```bash
# 启动开发服务器
npm start

# 站点将在 http://localhost:3000 打开
```

## 项目结构

以下是项目应该如何组织：

```
your-project/
├── docs/                   # 文档文件
│   ├── intro.md
│   ├── getting-started/
│   ├── api/
│   └── examples/
├── src/                    # 源代码 (如果适用)
├── static/                 # 静态资源
│   ├── img/
│   └── files/
├── package.json
├── docusaurus.config.js    # 配置
└── sidebars.js            # 导航结构
```

## 基本命令

以下是将使用的最重要命令：

```bash
# 开发
npm start              # 启动开发服务器
npm run build         # 构建生产版本
npm run serve         # 预览生产构建

# 内容管理
npm run clear         # 清除缓存
npm run write-translations  # 提取可翻译字符串
npm run write-heading-ids   # 添加标题 ID
```

## 创建第一个页面

让我们创建一个简单的页面：

1. **创建文件** `docs/my-first-page.md`：

```markdown title="docs/my-first-page.md"
---
sidebar_position: 3
title: 我的第一个页面
description: 这是我的第一个自定义页面
---

# 我的第一个页面 🎉

欢迎来到的第一个自定义页面！在这里可以：

## 添加内容

使用 Markdown 编写任何想要的内容：

- 列表
- **粗体文本**
- *斜体文本* 
- [链接](https://example.com)

## 添加代码

```python
def hello_world():
    print("来自第一个页面的问候！")
    
hello_world()
```

## 添加提示框

:::tip
这是给用户的有用提示！
:::

:::warning
重要警告清楚地突出显示。
:::

:::info
附加信息很容易高亮显示。
:::
```

2. **更新侧边栏** 在 `sidebars.js` 中：

```javascript title="sidebars.js"
const sidebars = {
  tutorialSidebar: [
    'intro',
    'my-first-page', // 在这里添加新页面
    {
      type: 'category',
      label: '入门指南',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
      ],
    },
    // ... 其他部分
  ],
}
```

3. **查看页面** 在 `http://localhost:3000/docs/my-first-page`

## 自定义主题

### 颜色

编辑 `src/css/custom.css` 来更改颜色：

```css title="src/css/custom.css"
:root {
  /* 更改主色调 */
  --ifm-color-primary: #your-color;
  --ifm-color-primary-dark: #your-darker-color;
  --ifm-color-primary-light: #your-lighter-color;
}
```

### Logo

替换 `static/img/` 中的 logo 文件：

- `logo.png` - 主 logo (浅色主题)
- `logo-dark.png` - 深色主题的 logo
- `favicon.ico` - 浏览器图标

### 导航

更新 `docusaurus.config.js`：

```javascript title="docusaurus.config.js"
module.exports = {
  title: '项目名称',
  tagline: '精彩标语',
  
  themeConfig: {
    navbar: {
      title: '项目',
      logo: {
        alt: 'Logo',
        src: 'img/logo.png',
        srcDark: 'img/logo-dark.png',
      },
      items: [
        // 添加导航项目
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: '文档',
        },
        // ... 更多项目
      ],
    },
  },
}
```

## 添加交互式组件

可以在 Markdown 中添加 React 组件：

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## 交互式示例

<Tabs>
  <TabItem value="js" label="JavaScript" default>
    ```javascript
    const greeting = "你好，世界！"
    console.log(greeting)
    ```
  </TabItem>
  
  <TabItem value="python" label="Python">
    ```python
    greeting = "你好，世界！"
    print(greeting)
    ```
  </TabItem>
  
  <TabItem value="go" label="Go">
    ```go
    package main
    import "fmt"
    
    func main() {
        greeting := "你好，世界！"
        fmt.Println(greeting)
    }
    ```
  </TabItem>
</Tabs>

## 下一步是什么？

现在已经掌握了基础知识：

1. 📚 **了解更多**: 阅读 [配置指南](./configuration.md)
2. 🎨 **自定义**: 探索 [API 文档](../api/overview.md)  
3. 🔧 **示例**: 查看 [使用示例](../examples/basic-usage.md)
4. 🤝 **贡献**: 查看 [贡献指南](../contributing/how-to-contribute.md)

## 获取帮助

需要帮助？我们随时为提供支持：

- 📖 **文档**: 浏览我们的完整文档
- 💬 **社区**: 加入 GitHub 上的讨论
- 🐛 **问题**: 报告错误或请求功能
- 📧 **支持**: 联系我们的团队

:::success 恭喜！🎉
已成功设置项目！开始构建令人惊叹的文档吧。
:::

---

**下一步:** 了解 [配置选项](./configuration.md) →
