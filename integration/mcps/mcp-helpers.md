# MCP Utilities

MCP utilities 为将 Model Context Protocol 与 Spring AI 应用程序集成提供基础支持。
这些 utilities 使 Spring AI 的工具系统与 MCP 服务器之间能够无缝通信，支持同步和异步操作。
它们通常用于程序化的 MCP Client 和 Server 配置和交互。
要获得更简化的配置，请考虑使用 boot starters。

## ToolCallback Utility

### Tool Callback Adapter

将 MCP 工具适配到 Spring AI 的工具接口，支持同步和异步执行。

**Sync:**

```java
McpSyncClient mcpClient = // obtain MCP client
Tool mcpTool = // obtain MCP tool definition
ToolCallback callback = new SyncMcpToolCallback(mcpClient, mcpTool);

// Use the tool through Spring AI's interfaces
ToolDefinition definition = callback.getToolDefinition();
String result = callback.call("{\"param\": \"value\"}");
```

**Async:**

```java
McpAsyncClient mcpClient = // obtain MCP client
Tool mcpTool = // obtain MCP tool definition
ToolCallback callback = new AsyncMcpToolCallback(mcpClient, mcpTool);

// Use the tool through Spring AI's interfaces
ToolDefinition definition = callback.getToolDefinition();
String result = callback.call("{\"param\": \"value\"}");
```

### Tool Callback Providers

从 MCP 客户端发现并提供 MCP 工具。

**Sync:**

```java
McpSyncClient mcpClient = // obtain MCP client
ToolCallbackProvider provider = new SyncMcpToolCallbackProvider(mcpClient);

// Get all available tools
ToolCallback[] tools = provider.getToolCallbacks();
```

对于多个客户端：

```java
List<McpSyncClient> clients = // obtain list of clients
List<ToolCallback> callbacks = SyncMcpToolCallbackProvider.syncToolCallbacks(clients);
```

对于动态选择客户端子集：

```java
@Autowired
private List<McpSyncClient> mcpSyncClients;

public ToolCallbackProvider buildProvider(Set<String> allowedServerNames) {
    // Filter by server.name().
    List<McpSyncClient> selected = mcpSyncClients.stream()
        .filter(c -> allowedServerNames.contains(c.getServerInfo().name()))
        .toList();

    return new SyncMcpToolCallbackProvider(selected);
}
```

**Async:**

```java
McpAsyncClient mcpClient = // obtain MCP client
ToolCallbackProvider provider = new AsyncMcpToolCallbackProvider(mcpClient);

// Get all available tools
ToolCallback[] tools = provider.getToolCallbacks();
```

对于多个客户端：

```java
List<McpAsyncClient> clients = // obtain list of clients
Flux<ToolCallback> callbacks = AsyncMcpToolCallbackProvider.asyncToolCallbacks(clients);
```

## McpToolUtils

### ToolCallbacks to ToolSpecifications

将 Spring AI 工具回调转换为 MCP 工具规范：

**Sync:**

```java
List<ToolCallback> toolCallbacks = // obtain tool callbacks
List<SyncToolSpecifications> syncToolSpecs = McpToolUtils.toSyncToolSpecifications(toolCallbacks);
```

然后可以使用 `McpServer.SyncSpecification` 注册工具规范：

```java
McpServer.SyncSpecification syncSpec = ...
syncSpec.tools(syncToolSpecs);
```

**Async:**

```java
List<ToolCallback> toolCallbacks = // obtain tool callbacks
List<AsyncToolSpecification> asyncToolSpecifications = McpToolUtils.toAsyncToolSpecifications(toolCallbacks);
```

然后可以使用 `McpServer.AsyncSpecification` 注册工具规范：

```java
McpServer.AsyncSpecification asyncSpec = ...
asyncSpec.tools(asyncToolSpecifications);
```

### MCP Clients to ToolCallbacks

从 MCP 客户端获取工具回调。

**Sync:**

```java
List<McpSyncClient> syncClients = // obtain sync clients
List<ToolCallback> syncCallbacks = McpToolUtils.getToolCallbacksFromSyncClients(syncClients);
```

**Async:**

```java
List<McpAsyncClient> asyncClients = // obtain async clients
List<ToolCallback> asyncCallbacks = McpToolUtils.getToolCallbacksFromAsyncClients(asyncClients);
```

## Native Image Support

`McpHints` 类为 MCP schema 类提供 GraalVM native image hints。
在构建 native images 时，此类会自动注册 MCP schema 类的所有必要反射 hints。

