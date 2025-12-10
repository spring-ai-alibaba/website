## Streamable-HTTP MCP Servers

[Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) 允许 MCP 服务器作为独立进程运行，可以使用 HTTP POST 和 GET 请求处理多个客户端连接，并可选地使用 Server-Sent Events (SSE) 流式传输多个服务器消息。它取代了 SSE 传输。

这些服务器随规范版本 [2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26) 引入，非常适合需要通知客户端有关工具、资源或 prompts 动态更改的应用程序。

> **提示：** 设置 `spring.ai.mcp.server.protocol=STREAMABLE` 属性

> **提示：** 使用 [Streamable-HTTP clients](api/mcp/mcp-client-boot-starter-docs#_streamable_http_transport_properties) 连接到 Streamable-HTTP 服务器。

### Streamable-HTTP WebMVC Server

使用 `spring-ai-starter-mcp-server-webmvc` 依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

并将 `spring.ai.mcp.server.protocol` 属性设置为 `STREAMABLE`。

* 具有 Spring MVC Streamable 传输的完整 MCP 服务器功能
* 支持工具、资源、prompts、completion、logging、progression、ping、root-changes 功能
* 持久连接管理

### Streamable-HTTP WebFlux Server

使用 `spring-ai-starter-mcp-server-webflux` 依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

并将 `spring.ai.mcp.server.protocol` 属性设置为 `STREAMABLE`。

* 具有 WebFlux Streamable 传输的响应式 MCP 服务器
* 支持工具、资源、prompts、completion、logging、progression、ping、root-changes 功能
* 非阻塞、持久连接管理

## Configuration Properties

### Common Properties

所有通用属性以 `spring.ai.mcp.server` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `enabled` | Enable/disable the streamable MCP server | `true` |
| `protocol` | MCP server protocol | Must be set to `STREAMABLE` to enable the streamable server |
| `tool-callback-converter` | Enable/disable the conversion of Spring AI ToolCallbacks into MCP Tool specs | `true` |
| `name` | Server name for identification | `mcp-server` |
| `version` | Server version | `1.0.0` |
| `instructions` | Optional instructions for client interaction | `null` |
| `type` | Server type (SYNC/ASYNC) | `SYNC` |
| `capabilities.resource` | Enable/disable resource capabilities | `true` |
| `capabilities.tool` | Enable/disable tool capabilities | `true` |
| `capabilities.prompt` | Enable/disable prompt capabilities | `true` |
| `capabilities.completion` | Enable/disable completion capabilities | `true` |
| `resource-change-notification` | Enable resource change notifications | `true` |
| `prompt-change-notification` | Enable prompt change notifications | `true` |
| `tool-change-notification` | Enable tool change notifications | `true` |
| `tool-response-mime-type` | Response MIME type per tool name | `-` |
| `request-timeout` | Request timeout duration | `20 seconds` |

### MCP Annotations Properties

MCP Server Annotations 提供了一种使用 Java 注解实现 MCP 服务器处理器的声明式方法。

服务器 mcp-annotations 属性以 `spring.ai.mcp.server.annotation-scanner` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP server annotations auto-scanning | `true` |

### Streamable-HTTP Properties

所有 streamable-HTTP 属性以 `spring.ai.mcp.server.streamable-http` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `mcp-endpoint` | Custom MCP endpoint path | `/mcp` |
| `keep-alive-interval` | Connection keep-alive interval | `null` (disabled) |
| `disallow-delete` | Disallow delete operations | `false` |

## Features and Capabilities

MCP 服务器支持四种主要功能类型，可以单独启用或禁用：

- **Tools** - 使用 `spring.ai.mcp.server.capabilities.tool=true|false` 启用/禁用工具功能
- **Resources** - 使用 `spring.ai.mcp.server.capabilities.resource=true|false` 启用/禁用资源功能
- **Prompts** - 使用 `spring.ai.mcp.server.capabilities.prompt=true|false` 启用/禁用 prompt 功能
- **Completions** - 使用 `spring.ai.mcp.server.capabilities.completion=true|false` 启用/禁用 completion 功能

默认情况下，所有功能都已启用。禁用功能将阻止服务器向客户端注册和暴露相应的功能。

MCP Server Boot Starter 允许服务器向客户端暴露工具、资源和 prompts。
它根据服务器类型自动将注册为 Spring beans 的自定义功能处理器转换为同步/异步规范：

### [Tools](https://modelcontextprotocol.io/specification/2025-03-26/server/tools)

允许服务器暴露可由语言模型调用的工具。MCP Server Boot Starter 提供：

* 变更通知支持
* [Spring AI Tools](api/tools.adoc) 根据服务器类型自动转换为同步/异步规范
* 通过 Spring beans 自动工具规范：

```java
@Bean
public ToolCallbackProvider myTools(...) {
    List<ToolCallback> tools = ...
    return ToolCallbackProvider.from(tools);
}
```

或使用低级 API：

```java
@Bean
public List<McpServerFeatures.SyncToolSpecification> myTools(...) {
    List<McpServerFeatures.SyncToolSpecification> tools = ...
    return tools;
}
```

自动配置将自动检测并注册来自以下内容的所有工具回调：

- 单个 `ToolCallback` beans
- `ToolCallback` beans 列表
- `ToolCallbackProvider` beans

工具按名称去重，使用每个工具名称的第一次出现。

> **提示：** 您可以通过将 `tool-callback-converter` 设置为 `false` 来禁用所有工具回调的自动检测和注册。

#### Tool Context Support

支持 [ToolContext](api/tools.adoc#_tool_context)，允许将上下文信息传递给工具调用。它在 `exchange` 键下包含一个 `McpSyncServerExchange` 实例，可通过 `McpToolUtils.getMcpExchange(toolContext)` 访问。请参阅此[示例](https://github.com/spring-projects/spring-ai-examples/blob/3fab8483b8deddc241b1e16b8b049616604b7767/model-context-protocol/sampling/mcp-weather-webmvc-server/src/main/java/org/springframework/ai/mcp/sample/server/WeatherService.java#L59-L126)，演示 `exchange.loggingNotification(...)` 和 `exchange.createMessage(...)`。

### [Resources](https://modelcontextprotocol.io/specification/2025-03-26/server/resources/)

为服务器向客户端暴露资源提供标准化方式。

* 静态和动态资源规范
* 可选的变更通知
* 支持资源模板
* 同步/异步资源规范之间的自动转换
* 通过 Spring beans 自动资源规范：

```java
@Bean
public List<McpServerFeatures.SyncResourceSpecification> myResources(...) {
    var systemInfoResource = new McpSchema.Resource(...);
    var resourceSpecification = new McpServerFeatures.SyncResourceSpecification(systemInfoResource, (exchange, request) -> {
        try {
            var systemInfo = Map.of(...);
            String jsonContent = new ObjectMapper().writeValueAsString(systemInfo);
            return new McpSchema.ReadResourceResult(
                    List.of(new McpSchema.TextResourceContents(request.uri(), "application/json", jsonContent)));
        }
        catch (Exception e) {
            throw new RuntimeException("Failed to generate system info", e);
        }
    });

    return List.of(resourceSpecification);
}
```

### [Prompts](https://modelcontextprotocol.io/specification/2025-03-26/server/prompts/)

为服务器向客户端暴露 prompt 模板提供标准化方式。

* 变更通知支持
* 模板版本控制
* 同步/异步 prompt 规范之间的自动转换
* 通过 Spring beans 自动 prompt 规范：

```java
@Bean
public List<McpServerFeatures.SyncPromptSpecification> myPrompts() {
    var prompt = new McpSchema.Prompt("greeting", "A friendly greeting prompt",
        List.of(new McpSchema.PromptArgument("name", "The name to greet", true)));

    var promptSpecification = new McpServerFeatures.SyncPromptSpecification(prompt, (exchange, getPromptRequest) -> {
        String nameArgument = (String) getPromptRequest.arguments().get("name");
        if (nameArgument == null) { nameArgument = "friend"; }
        var userMessage = new PromptMessage(Role.USER, new TextContent("Hello " + nameArgument + "! How can I assist you today?"));
        return new GetPromptResult("A personalized greeting message", List.of(userMessage));
    });

    return List.of(promptSpecification);
}
```

### [Completions](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/completion/)

为服务器向客户端暴露 completion 功能提供标准化方式。

* 支持同步和异步 completion 规范
* 通过 Spring beans 自动注册：

```java
@Bean
public List<McpServerFeatures.SyncCompletionSpecification> myCompletions() {
    var completion = new McpServerFeatures.SyncCompletionSpecification(
        new McpSchema.PromptReference(
					"ref/prompt", "code-completion", "Provides code completion suggestions"),
        (exchange, request) -> {
            // Implementation that returns completion suggestions
            return new McpSchema.CompleteResult(List.of("python", "pytorch", "pyside"), 10, true);
        }
    );

    return List.of(completion);
}
```

### [Logging](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging/)

为服务器向客户端发送结构化日志消息提供标准化方式。
从工具、资源、prompt 或 completion 调用处理器内部，使用提供的 `McpSyncServerExchange`/`McpAsyncServerExchange` `exchange` 对象发送日志消息：

```java
(exchange, request) -> {
        exchange.loggingNotification(LoggingMessageNotification.builder()
            .level(LoggingLevel.INFO)
            .logger("test-logger")
            .data("This is a test log message")
            .build());
}
```

在 MCP 客户端上，您可以注册[日志消费者](api/mcp/mcp-client-boot-starter-docs#_customization_types)来处理这些消息：

```java
mcpClientSpec.loggingConsumer((McpSchema.LoggingMessageNotification log) -> {
    // Handle log messages
});
```

### [Progress](https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress)

为服务器向客户端发送进度更新提供标准化方式。
从工具、资源、prompt 或 completion 调用处理器内部，使用提供的 `McpSyncServerExchange`/`McpAsyncServerExchange` `exchange` 对象发送进度通知：

```java
(exchange, request) -> {
        exchange.progressNotification(ProgressNotification.builder()
            .progressToken("test-progress-token")
            .progress(0.25)
            .total(1.0)
            .message("tool call in progress")
            .build());
}
```

MCP 客户端可以接收进度通知并相应地更新其 UI。
为此，它需要注册一个进度消费者。

```java
mcpClientSpec.progressConsumer((McpSchema.ProgressNotification progress) -> {
    // Handle progress notifications
});
```

### [Root List Changes](https://modelcontextprotocol.io/specification/2025-03-26/client/roots#root-list-changes)

当 roots 更改时，支持 `listChanged` 的客户端会发送 root 变更通知。

* 支持监控 root 变更
* 自动转换为响应式应用程序的异步消费者
* 通过 Spring beans 可选注册

```java
@Bean
public BiConsumer<McpSyncServerExchange, List<McpSchema.Root>> rootsChangeHandler() {
    return (exchange, roots) -> {
        logger.info("Registering root resources: {}", roots);
    };
}
```

### [Ping](https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/ping/)

服务器验证其客户端是否仍然存活的 ping 机制。
从工具、资源、prompt 或 completion 调用处理器内部，使用提供的 `McpSyncServerExchange`/`McpAsyncServerExchange` `exchange` 对象发送 ping 消息：

```java
(exchange, request) -> {
        exchange.ping();
}
```

### Keep Alive

服务器可以可选地定期向连接的客户端发送 ping 以验证连接健康。

默认情况下，keep-alive 被禁用。
要启用 keep-alive，请在配置中设置 `keep-alive-interval` 属性：

```yaml
spring:
  ai:
    mcp:
      server:
        streamable-http:
          keep-alive-interval: 30s
```

**注意：** 目前，对于 streamable-http 服务器，keep-alive 机制仅适用于 [Listening for Messages from the Server (SSE)](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#listening-for-messages-from-the-server) 连接。

## Usage Examples

### Streamable HTTP Server Configuration

```yaml
# Using spring-ai-starter-mcp-server-streamable-webmvc
spring:
  ai:
    mcp:
      server:
        protocol: STREAMABLE
        name: streamable-mcp-server
        version: 1.0.0
        type: SYNC
        instructions: "This streamable server provides real-time notifications"
        resource-change-notification: true
        tool-change-notification: true
        prompt-change-notification: true
        streamable-http:
          mcp-endpoint: /api/mcp
          keep-alive-interval: 30s
```

### Creating a Spring Boot Application with MCP Server

```java
@Service
public class WeatherService {

    @Tool(description = "Get weather information by city name")
    public String getWeather(String cityName) {
        // Implementation
    }
}

@SpringBootApplication
public class McpServerApplication {

    private static final Logger logger = LoggerFactory.getLogger(McpServerApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

	@Bean
	public ToolCallbackProvider weatherTools(WeatherService weatherService) {
		return MethodToolCallbackProvider.builder().toolObjects(weatherService).build();
	}
}
```

自动配置将自动将工具回调注册为 MCP 工具。
您可以有多个产生 ToolCallbacks 的 beans，自动配置会将它们合并。

