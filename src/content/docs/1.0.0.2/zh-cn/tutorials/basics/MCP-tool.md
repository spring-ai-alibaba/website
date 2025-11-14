---
title: MCP 工具类
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba MCP 工具类"
---

## MCP工具类

MCP 工具类为将模型上下文协议与 Spring AI 应用程序集成提供基础支持。 这些工具类实现了 Spring AI 的工具系统与 MCP 服务器之间的无缝通信，支持同步和异步操作。 它们通常用于编程式 MCP 客户端和服务器配置及交互。 对于更简化的配置，请考虑使用启动器。

### 工具回调工具类

#### 工具回调适配器

将 MCP 工具适配到 Spring AI 的工具接口，支持同步和异步执行。

同步操作：

```java
McpSyncClient mcpClient = // 获取 MCP 客户端
        Tool mcpTool = // 获取 MCP 工具定义
ToolCallback callback = new SyncMcpToolCallback(mcpClient, mcpTool);

// 通过 Spring AI 的接口使用工具
ToolDefinition definition = callback.getToolDefinition();
String result = callback.call("{\"param\": \"value\"}");
```

异步操作：

```java
McpAsyncClient mcpClient = // 获取 MCP 客户端
Tool mcpTool = // 获取 MCP 工具定义
ToolCallback callback = new AsyncMcpToolCallback(mcpClient, mcpTool);

// 通过 Spring AI 的接口使用工具
ToolDefinition definition = callback.getToolDefinition();
String result = callback.call("{\"param\": \"value\"}");
```

#### 工具回调提供者

从 MCP 客户端发现和提供 MCP 工具。

同步操作：

```java
McpSyncClient mcpClient = // 获取 MCP 客户端
ToolCallbackProvider provider = new SyncMcpToolCallbackProvider(mcpClient);

// 获取所有可用工具
ToolCallback[] tools = provider.getToolCallbacks();
```

异步操作：

```java
McpAsyncClient mcpClient = // 获取 MCP 客户端
ToolCallbackProvider provider = new AsyncMcpToolCallbackProvider(mcpClient);

// 获取所有可用工具
ToolCallback[] tools = provider.getToolCallbacks();
```

对于多个客户端：

```java
List<McpAsyncClient> clients = // 获取客户端列表
Flux<ToolCallback> callbacks = AsyncMcpToolCallbackProvider.asyncToolCallbacks(clients);
```

### McpToolUtils

#### 工具回调到工具规范

将 Spring AI 工具回调转换为 MCP 工具规范：

同步操作：

```java
List<ToolCallback> toolCallbacks = // 获取工具回调
List<SyncToolSpecifications> syncToolSpecs = McpToolUtils.toSyncToolSpecifications(toolCallbacks);
```

异步操作：

```java
List<ToolCallback> toolCallbacks = // 获取工具回调
List<AsyncToolSpecification> asyncToolSpecifications = McpToolUtils.toAsyncToolSpecifications(toolCallbacks);
```

然后您可以使用 `McpServer.AsyncSpecification` 注册工具规范：

```java
McpServer.AsyncSpecification asyncSpec = ...
asyncSpec.tools(asyncToolSpecifications);
```

#### MCP 客户端到工具回调

从 MCP 客户端获取工具回调

同步操作：

```java
List<McpSyncClient> syncClients = // 获取同步客户端
List<ToolCallback> syncCallbacks = McpToolUtils.getToolCallbacksFromSyncClients(syncClients);
```

异步操作：

```java
List<McpAsyncClient> asyncClients = // 获取异步客户端
List<ToolCallback> asyncCallbacks = McpToolUtils.getToolCallbacksFromAsyncClients(asyncClients);
```

### 原生镜像支持

`McpHints` 类为 MCP 模式类提供 GraalVM 原生镜像提示。 在构建原生镜像时，此类会自动注册 MCP 模式类的所有必要反射提示。

