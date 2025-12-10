## Stateless Streamable-HTTP MCP Servers

Stateless Streamable-HTTP MCP 服务器专为简化部署而设计，在请求之间不维护会话状态。
这些服务器非常适合微服务架构和云原生部署。

> **提示：** 设置 `spring.ai.mcp.server.protocol=STATELESS` 属性

> **提示：** 使用 [Streamable-HTTP clients](api/mcp/mcp-client-boot-starter-docs#_streamable_http_transport_properties) 连接到无状态服务器。

**注意：** 无状态服务器不支持向 MCP 客户端发送消息请求（例如，elicitation、sampling、ping）。

### Stateless WebMVC Server

使用 `spring-ai-starter-mcp-server-webmvc` 依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

并将 `spring.ai.mcp.server.protocol` 属性设置为 `STATELESS`。

```
spring.ai.mcp.server.protocol=STATELESS
```

- 使用 Spring MVC 传输的无状态操作
- 无会话状态管理
- 简化的部署模型
- 针对云原生环境优化

### Stateless WebFlux Server

使用 `spring-ai-starter-mcp-server-webflux` 依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

并将 `spring.ai.mcp.server.protocol` 属性设置为 `STATELESS`。

- 使用 WebFlux 传输的响应式无状态操作
- 无会话状态管理
- 非阻塞请求处理
- 针对高吞吐量场景优化

## Configuration Properties

### Common Properties

所有通用属性以 `spring.ai.mcp.server` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `enabled` | Enable/disable the stateless MCP server | `true` |
| `protocol` | MCP server protocol | Must be set to `STATELESS` to enable the stateless server |
| `tool-callback-converter` | Enable/disable the conversion of Spring AI ToolCallbacks into MCP Tool specs | `true` |
| `name` | Server name for identification | `mcp-server` |
| `version` | Server version | `1.0.0` |
| `instructions` | Optional instructions for client interaction | `null` |
| `type` | Server type (SYNC/ASYNC) | `SYNC` |
| `capabilities.resource` | Enable/disable resource capabilities | `true` |
| `capabilities.tool` | Enable/disable tool capabilities | `true` |
| `capabilities.prompt` | Enable/disable prompt capabilities | `true` |
| `capabilities.completion` | Enable/disable completion capabilities | `true` |
| `tool-response-mime-type` | Response MIME type per tool name | `-` |
| `request-timeout` | Request timeout duration | `20 seconds` |

### MCP Annotations Properties

MCP Server Annotations 提供了一种使用 Java 注解实现 MCP 服务器处理器的声明式方法。

服务器 mcp-annotations 属性以 `spring.ai.mcp.server.annotation-scanner` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP server annotations auto-scanning | `true` |

### Stateless Connection Properties

所有连接属性以 `spring.ai.mcp.server.stateless` 为前缀：

| Property | Description | Default |
| --- | --- | --- |
| `mcp-endpoint` | Custom MCP endpoint path | `/mcp` |
| `disallow-delete` | Disallow delete operations | `false` |

## Features and Capabilities

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
public List<McpStatelessServerFeatures.SyncToolSpecification> myTools(...) {
    List<McpStatelessServerFeatures.SyncToolSpecification> tools = ...
    return tools;
}
```

自动配置将自动检测并注册来自以下内容的所有工具回调：

- 单个 `ToolCallback` beans
- `ToolCallback` beans 列表
- `ToolCallbackProvider` beans

工具按名称去重，使用每个工具名称的第一次出现。

> **提示：** 您可以通过将 `tool-callback-converter` 设置为 `false` 来禁用所有工具回调的自动检测和注册。

**注意：** Tool Context Support 不适用于无状态服务器。

### [Resources](https://modelcontextprotocol.io/specification/2025-03-26/server/resources/)

为服务器向客户端暴露资源提供标准化方式。

* 静态和动态资源规范
* 可选的变更通知
* 支持资源模板
* 同步/异步资源规范之间的自动转换
* 通过 Spring beans 自动资源规范：

```java
@Bean
public List<McpStatelessServerFeatures.SyncResourceSpecification> myResources(...) {
    var systemInfoResource = new McpSchema.Resource(...);
    var resourceSpecification = new McpStatelessServerFeatures.SyncResourceSpecification(systemInfoResource, (context, request) -> {
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
public List<McpStatelessServerFeatures.SyncPromptSpecification> myPrompts() {
    var prompt = new McpSchema.Prompt("greeting", "A friendly greeting prompt",
        List.of(new McpSchema.PromptArgument("name", "The name to greet", true)));

    var promptSpecification = new McpStatelessServerFeatures.SyncPromptSpecification(prompt, (context, getPromptRequest) -> {
        String nameArgument = (String) getPromptRequest.arguments().get("name");
        if (nameArgument == null) { nameArgument = "friend"; }
        var userMessage = new PromptMessage(Role.USER, new TextContent("Hello " + nameArgument + "! How can I assist you today?"));
        return new GetPromptResult("A personalized greeting message", List.of(userMessage));
    });

    return List.of(promptSpecification);
}
```

### [Completion](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/completion/)

为服务器向客户端暴露 completion 功能提供标准化方式。

* 支持同步和异步 completion 规范
* 通过 Spring beans 自动注册：

```java
@Bean
public List<McpStatelessServerFeatures.SyncCompletionSpecification> myCompletions() {
    var completion = new McpStatelessServerFeatures.SyncCompletionSpecification(
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

## Usage Examples

### Stateless Server Configuration

```yaml
spring:
  ai:
    mcp:
      server:
        protocol: STATELESS
        name: stateless-mcp-server
        version: 1.0.0
        type: ASYNC
        instructions: "This stateless server is optimized for cloud deployments"
        streamable-http:          
          mcp-endpoint: /api/mcp
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

