---
sidebar_position: 1
---

# 安装指南 📦

本指南将帮助安装和设置项目文档网站。

## 先决条件 

开始之前，请确保系统上已安装以下内容：

- Node.js 版本 18.0 或更高
- npm 或 yarn 包管理器
- Git（用于版本控制）

### 检查环境

可以通过运行这些命令来验证安装：

```bash
node --version
# 应输出 v18.0.0 或更高版本

npm --version  
# 应输出 8.0.0 或更高版本
```

## 安装方法

### 方法 1: 使用 npm (推荐)

```bash
# 直接从 npm 安装
npm install -g your-project-name

# 或在项目中本地安装
npm install your-project-name
```

### 方法 2: 从 GitHub 克隆

```bash
# 克隆仓库
git clone https://github.com/your-username/your-project-name.git

# 导航到项目目录
cd your-project-name

# 安装依赖
npm install
```

### 方法 3: 使用 Yarn

```bash
# 使用 yarn 安装
yarn add your-project-name

# 或全局安装
yarn global add your-project-name
```

## 验证

安装后，验证一切是否正常工作：

```bash
# 检查命令是否可用
your-project-name --version

# 运行基础测试
your-project-name --help
```

应该看到类似的输出：

```
Your Project Name v1.0.0
用法: your-project-name [选项]

选项:
  -h, --help     显示帮助
  -v, --version  显示版本
```

## 开发环境设置

如果计划为项目做贡献或进行大量自定义，请设置开发环境：

```bash
# 克隆仓库
git clone https://github.com/your-username/your-project-name.git
cd your-project-name

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 配置

安装后，可能需要配置项目：

### 基本配置

在项目根目录创建配置文件 `config.json`：

```json title="config.json"
{
  "name": "项目",
  "version": "1.0.0",
  "theme": "dual",
  "features": {
    "darkMode": true,
    "search": true,
    "responsive": true
  }
}
```

### 环境变量

在 `.env` 中设置环境变量：

```bash title=".env"
PROJECT_NAME=your-project-name
NODE_ENV=development
PORT=3000
```

## 常见安装问题

### 问题: Node.js 版本不匹配

```bash
# 错误: 不支持 Node.js 版本
# 解决方案: 更新 Node.js
nvm install 18
nvm use 18
```

### 问题: 权限错误

```bash
# 错误: EACCES 权限被拒绝
# 解决方案: 使用 npx 或修复 npm 权限
npx your-project-name

# 或修复 npm 权限
sudo chown -R $(whoami) ~/.npm
```

### 问题: 端口已被占用

```bash
# 错误: 端口 3000 已被使用
# 解决方案: 使用不同端口
PORT=3001 npm start
```

## 下一步

现在已安装了项目：

1. 📖 阅读 [快速开始指南](./quickstart.md)
2. ⚙️ 了解 [配置](./configuration.md) 
3. 🎨 探索 [API 文档](../api/overview.md)
4. 🛠️ 查看 [示例](../examples/basic-usage.md)

## 获取帮助

如果在安装过程中遇到任何问题：

- 📚 查看我们的 [故障排除指南](../troubleshooting/common-issues.md)
- 💬 加入我们的 [社区讨论](https://github.com/your-username/your-project-name/discussions)
- 🐛 在 [GitHub Issues](https://github.com/your-username/your-project-name/issues) 报告错误

:::tip 成功!
🎉 **安装完成！** 已准备好开始使用项目构建。
:::

---

**下一步:** 在 [配置指南](./configuration.md) 中学习如何配置项目 →
