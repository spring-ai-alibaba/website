## STDIO and SSE MCP Servers

STDIO 和 SSE MCP 服务器支持多种传输机制，每个都有专用的 starter。

> **提示：** 使用 [STDIO clients](api/mcp/mcp-client-boot-starter-docs#_stdio_transport_properties) 或 [SSE clients](api/mcp/mcp-client-boot-starter-docs#_sse_transport_properties) 连接到 STDIO 和 SSE 服务器。

### STDIO MCP Server

具有 `STDIO` 服务器传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server</artifactId>
</dependency>
```

* 适用于命令行和桌面工具
* 无需额外的 Web 依赖
* 基本服务器组件的配置
* 处理工具、资源和 prompt 规范
* 管理服务器功能和变更通知
* 支持同步和异步服务器实现

### SSE WebMVC Server

基于 Spring MVC 和可选的 `STDIO` 传输的 `SSE` (Server-Sent Events) 服务器传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

* 使用 Spring MVC 的基于 HTTP 的传输（`WebMvcSseServerTransportProvider`）
* 自动配置的 SSE 端点
* 可选的 `STDIO` 传输（通过设置 `spring.ai.mcp.server.stdio=true` 启用）
* 包含 `spring-boot-starter-web` 和 `mcp-spring-webmvc` 依赖

### SSE WebFlux Server

基于 Spring WebFlux 和可选的 `STDIO` 传输的 `SSE` (Server-Sent Events) 服务器传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

starter 激活 `McpWebFluxServerAutoConfiguration` 和 `McpServerAutoConfiguration` 自动配置以提供：

* 使用 Spring WebFlux 的响应式传输（`WebFluxSseServerTransportProvider`）
* 自动配置的响应式 SSE 端点
* 可选的 `STDIO` 传输（通过设置 `spring.ai.mcp.server.stdio=true` 启用）
* 包含 `spring-boot-starter-webflux` 和 `mcp-spring-webflux` 依赖

> **注意：**
> 由于 Spring Boot 的默认行为，当类路径上同时存在 `org.springframework.web.servlet.DispatcherServlet` 和 `org.springframework.web.reactive.DispatcherHandler` 时，Spring Boot 将优先使用 `DispatcherServlet`。因此，如果您的项目使用 `spring-boot-starter-web`，建议使用 `spring-ai-starter-mcp-server-webmvc` 而不是 `spring-ai-starter-mcp-server-webflux`。

## Configuration Properties

### Common Properties

所有通用属性以 `spring.ai.mcp.server` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP server | `true` |
| `tool-callback-converter` | Enable/disable the conversion of Spring AI ToolCallbacks into MCP Tool specs | `true` |
| `stdio` | Enable/disable STDIO transport | `false` |
| `name` | Server name for identification | `mcp-server` |
| `version` | Server version | `1.0.0` |
| `instructions` | Optional instructions to provide guidance to the client on how to interact with this server | `null` |
| `type` | Server type (SYNC/ASYNC) | `SYNC` |
| `capabilities.resource` | Enable/disable resource capabilities | `true` |
| `capabilities.tool` | Enable/disable tool capabilities | `true` |
| `capabilities.prompt` | Enable/disable prompt capabilities | `true` |
| `capabilities.completion` | Enable/disable completion capabilities | `true` |
| `resource-change-notification` | Enable resource change notifications | `true` |
| `prompt-change-notification` | Enable prompt change notifications | `true` |
| `tool-change-notification` | Enable tool change notifications | `true` |
| `tool-response-mime-type` | Optional response MIME type per tool name. For example, `spring.ai.mcp.server.tool-response-mime-type.generateImage=image/png` will associate the `image/png` MIME type with the `generateImage()` tool name | `-` |
| `request-timeout` | Duration to wait for server responses before timing out requests. Applies to all requests made through the client, including tool calls, resource access, and prompt operations | `20 seconds` |

### MCP Annotations Properties

MCP Server Annotations 提供了一种使用 Java 注解实现 MCP 服务器处理器的声明式方法。

服务器 mcp-annotations 属性以 `spring.ai.mcp.server.annotation-scanner` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP server annotations auto-scanning | `true` |

### SSE Properties

所有 SSE 属性以 `spring.ai.mcp.server` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `sse-message-endpoint` | Custom SSE message endpoint path for web transport to be used by the client to send messages | `/mcp/message` |
| `sse-endpoint` | Custom SSE endpoint path for web transport | `/sse` |
| `base-url` | Optional URL prefix. For example, `base-url=/api/v1` means that the client should access the SSE endpoint at `/api/v1` + `sse-endpoint` and the message endpoint is `/api/v1` + `sse-message-endpoint` | `-` |
| `keep-alive-interval` | Connection keep-alive interval | `null` (disabled) |

**注意：** 为了向后兼容，SSE 属性没有额外的后缀（如 `.sse`）。

## Features and Capabilities

MCP Server Boot Starter 允许服务器向客户端暴露工具、资源和 prompts。
它根据服务器类型自动将注册为 Spring beans 的自定义功能处理器转换为同步/异步规范：

### [Tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools/)

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

### [Resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources/)

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

### [Prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts/)

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

### [Completions](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/completions/)

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

### [Root List Changes](https://spec.modelcontextprotocol.io/specification/2024-11-05/client/roots/#root-list-changes)

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
        keep-alive-interval: 30s
```

## Usage Examples

### Standard STDIO Server Configuration

```yaml
# Using spring-ai-starter-mcp-server
spring:
  ai:
    mcp:
      server:
        name: stdio-mcp-server
        version: 1.0.0
        type: SYNC
```

### WebMVC Server Configuration

```yaml
# Using spring-ai-starter-mcp-server-webmvc
spring:
  ai:
    mcp:
      server:
        name: webmvc-mcp-server
        version: 1.0.0
        type: SYNC
        instructions: "This server provides weather information tools and resources"
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true
        # sse properties
        sse-message-endpoint: /mcp/messages
        keep-alive-interval: 30s
```

### WebFlux Server Configuration

```yaml
# Using spring-ai-starter-mcp-server-webflux
spring:
  ai:
    mcp:
      server:
        name: webflux-mcp-server
        version: 1.0.0
        type: ASYNC  # Recommended for reactive applications
        instructions: "This reactive server provides weather information tools and resources"
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true
        # sse properties
        sse-message-endpoint: /mcp/messages
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

## Example Applications

* [Weather Server (WebFlux)](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-webflux-server) - 带有 WebFlux 传输的 Spring AI MCP Server Boot Starter
* [Weather Server (STDIO)](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-stdio-server) - 带有 STDIO 传输的 Spring AI MCP Server Boot Starter
* [Weather Server Manual Configuration](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/manual-webflux-server) - 不使用自动配置但使用 Java SDK 手动配置服务器的 Spring AI MCP Server Boot Starter

