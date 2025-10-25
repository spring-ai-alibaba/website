# 文档版本管理

本项目为 Agent Framework 和 Graph Core 文档实现了多版本支持。

## 功能特性

- ✅ 支持多版本文档管理
- ✅ 版本切换下拉框（仅在 Agent Framework 和 Graph Core 页面显示）
- ✅ 独立的版本化文档目录
- ✅ Make 命令管理版本

## 目录结构

```
docs-versioned/
├── agent-framework/
│   ├── current/           # 当前开发版本（2.0.x）
│   ├── 1.x/              # 1.x 版本文档
│   └── ...
└── graph-core/
    ├── current/           # 当前开发版本（2.0.x）
    ├── 1.x/              # 1.x 版本文档
    └── ...
```

## Make 命令使用

### 查看帮助

```bash
make version-help
```

### 初始化版本化文档

首次设置时运行：

```bash
make version-init
```

### 创建新版本

当需要发布新版本时，将当前版本保存为快照：

```bash
# 为 Agent Framework 创建 1.0 版本
make version-create-agent VERSION=1.0

# 为 Graph Core 创建 1.0 版本
make version-create-graph VERSION=1.0
```

### 列出所有版本

```bash
# 列出所有框架的版本
make version-list

# 仅列出 Agent Framework 的版本
make version-list-agent

# 仅列出 Graph Core 的版本
make version-list-graph
```

### 删除版本

```bash
# 删除 Agent Framework 的 1.0 版本
make version-delete-agent VERSION=1.0

# 删除 Graph Core 的 1.0 版本
make version-delete-graph VERSION=1.0
```

注意：不能删除 `current` 版本。

### 同步当前文档

如果你在 `docs/frameworks` 中编辑了文档，可以同步到版本化目录：

```bash
make version-sync-current
```

## 版本配置

### 添加新版本到配置

1. 创建版本目录和文档：
   ```bash
   make version-create-agent VERSION=1.5
   ```

2. 更新 `docusaurus.config.ts` 中的版本配置：
   ```typescript
   {
     id: 'agent-framework',
     // ...
     versions: {
       current: {
         label: '2.0.x (Current)',
         path: 'current',
         banner: 'none',
       },
       '1.5': {
         label: '1.5.x',
         path: '1.5',
         banner: 'none',
       },
       '1.0': {
         label: '1.0.x',
         path: '1.0',
         banner: 'unmaintained',
       },
     },
   }
   ```

3. 更新 `src/components/VersionDropdown/index.tsx` 中的版本列表：
   ```typescript
   const frameworkVersions: Record<string, Version[]> = {
     'agent-framework': [
       { name: 'current', label: '2.0.x (Current)', path: 'current', banner: 'none', badge: true },
       { name: '1.5', label: '1.5.x', path: '1.5', banner: 'none' },
       { name: '1.0', label: '1.0.x', path: '1.0', banner: 'unmaintained' },
     ],
     // ...
   }
   ```

## 版本切换器

版本切换器会自动在以下页面显示：
- `/docs/frameworks/agent-framework/**`
- `/docs/frameworks/graph-core/**`

在其他文档页面（如 Admin、Extensions、智能体等），版本切换器会自动隐藏。

### 版本切换器位置

版本切换器显示在导航栏右侧，位于"社区"下拉框和"语言选择"之间。

## 工作流程

### 日常开发

1. 在 `docs-versioned/{framework}/current/` 中编辑文档
2. 提交更改

### 发布新版本

1. 确保 `current` 版本的文档是最新的
2. 创建版本快照：
   ```bash
   make version-create-agent VERSION=1.5
   make version-create-graph VERSION=1.5
   ```
3. 更新配置文件（见上文）
4. 提交更改
5. 部署网站

### 维护旧版本

1. 直接编辑 `docs-versioned/{framework}/{version}/` 中的文档
2. 提交更改
3. 部署网站

## 最佳实践

1. **版本命名**：使用简单的版本号，如 `1.0`, `1.5`, `2.0`，而不是完整的语义化版本号
2. **保持同步**：定期运行 `make version-sync-current` 确保版本化目录与源文档同步
3. **版本策略**：
   - `current`: 始终是最新的开发版本
   - 使用 `badge: true` 标记最新稳定版本
   - 使用 `banner: 'unmaintained'` 标记不再维护的版本
4. **文档结构**：确保所有版本的文档结构保持一致，便于版本切换

## 故障排查

### 版本切换器不显示

检查：
1. 是否在正确的页面路径（`/docs/frameworks/agent-framework/**` 或 `/docs/frameworks/graph-core/**`）
2. 浏览器控制台是否有错误
3. 版本配置是否正确

### 版本切换后 404

检查：
1. 版本目录是否存在
2. `docusaurus.config.ts` 中的版本配置是否正确
3. 文档文件是否存在于对应版本目录中

### 样式问题

检查：
1. `styles.module.css` 是否正确加载
2. CSS 变量是否在当前主题中定义

## 技术实现

### 核心组件

- **VersionDropdown**: React 组件，提供版本选择 UI
- **Portal 渲染**: 使用 React Portal 将组件渲染到导航栏
- **路由检测**: 根据当前路径自动显示/隐藏版本切换器
- **Docusaurus 插件**: 使用多实例文档插件管理不同框架的版本

### 文件说明

- `docusaurus.config.ts`: 配置多实例文档插件
- `sidebars-agent-framework.ts`: Agent Framework 的侧边栏配置
- `sidebars-graph-core.ts`: Graph Core 的侧边栏配置
- `src/components/VersionDropdown/`: 版本切换器组件
- `src/theme/Root.tsx`: 主题根组件，挂载版本切换器
- `tools/make/Makefile.version.mk`: 版本管理 Make 命令

## 参考资料

- [Docusaurus 多实例文档](https://docusaurus.io/docs/docs-multi-instance)
- [Docusaurus 版本管理](https://docusaurus.io/docs/versioning)
