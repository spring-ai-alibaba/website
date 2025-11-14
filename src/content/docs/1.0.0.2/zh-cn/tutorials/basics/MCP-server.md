---
title: MCP客户端启动器
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba MCP客户端启动器"
---

## MCP服务器启动器

Spring AI MCP（模型上下文协议）服务器启动器为在 Spring Boot 应用程序中设置 MCP 服务器提供自动配置。它使 MCP 服务器功能能够与 Spring Boot 的自动配置系统无缝集成。

MCP 服务器启动器提供：

- MCP 服务器组件的自动配置

- 支持同步和异步操作模式

- 多种传输层选项

- 灵活的工具、资源和提示规范

- 变更通知功能

### 启动器

>Spring AI 自动配置和启动器模块的构件名称发生了重大变化。 请参阅 [升级说明](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

根据您的传输需求选择以下启动器之一：

#### 标准 MCP 服务器

具有 `STDIO` 服务器传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mcp-server-spring-boot-starter</artifactId>
</dependency>
```

- 适用于命令行和桌面工具

- 不需要额外的 Web 依赖项

启动器激活 `McpServerAutoConfiguration` 自动配置，负责：

- 配置基本服务器组件

- 处理工具、资源和提示规范

- 管理服务器功能和变更通知

- 提供同步和异步服务器实现

#### WebMVC 服务器传输

具有基于 Spring MVC 的 `SSE`（服务器发送事件）服务器传输和可选的 `STDIO` 传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

启动器激活 `McpWebMvcServerAutoConfiguration` 和 `McpServerAutoConfiguration` 自动配置，提供：

使用 Spring MVC 的基于 HTTP 的传输（`WebMvcSseServerTransportProvider`）

自动配置的 SSE 端点

可选的 STDIO 传输（通过设置 `spring.ai.mcp.server.stdio=true` 启用）

包含 `spring-boot-starter-web` 和 `mcp-spring-webmvc` 依赖项

#### WebFlux 服务器传输

具有基于 Spring WebFlux 的 `SSE`（服务器发送事件）服务器传输和可选的 `STDIO` 传输的完整 MCP 服务器功能支持。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

启动器激活 `McpWebFluxServerAutoConfiguration` 和 `McpServerAutoConfiguration` 自动配置，提供：

使用 Spring WebFlux 的反应式传输（`WebFluxSseServerTransportProvider`）

自动配置的反应式 SSE 端点

可选的 `STDIO` 传输（通过设置 `spring.ai.mcp.server.stdio=true` 启用）

包含 `spring-boot-starter-webflux` 和 `mcp-spring-webflux` 依赖项

### 配置属性

所有属性都以 `spring.ai.mcp.server` 为前缀：

| 属性                             | 描述                                                                                                                                        | 默认值          |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| `enabled`                      | 启用/禁用 MCP 服务器                                                                                                                             | true         |
| `stdio`                        | 启用/禁用 stdio 传输                                                                                                                            | false        |
| `name`                         | 用于标识的服务器名称                                                                                                                                | mcp-server   |
| `version`                      | 服务器版本                                                                                                                                     | 1.0.0        |
| `instructions`                 | 可选说明，为客户端提供与此服务器交互的指导                                                                                                                     | null         |
| `type`                         | 服务器类型（SYNC/ASYNC）                                                                                                                         | SYNC         |
| `capabilities.resource`        | 启用/禁用资源功能                                                                                                                                 | true         |
| `capabilities.tool`            | 启用/禁用工具功能                                                                                                                                 | true         |
| `capabilities.prompt`          | 启用/禁用提示功能                                                                                                                                 | true         |
| `capabilities.completion`      | 启用/禁用完成功能                                                                                                                                 | true         |
| `resource-change-notification` | 启用资源变更通知                                                                                                                                  | true         |
| `prompt-change-notification`   | 启用提示变更通知                                                                                                                                  | true         |
| `tool-change-notification`     | 启用工具变更通知                                                                                                                                  | true         |
| `tool-response-mime-type`      | （可选）每个工具名称的响应 MIME 类型。例如 spring.ai.mcp.server.tool-response-mime-type.generateImage=image/png 将 image/png mime 类型与 generateImage() 工具名称关联 | -            |
| `sse-message-endpoint`         | 用于 Web 传输的自定义 SSE 消息端点路径，供客户端发送消息使用                                                                                                       | /mcp/message |
| `sse-endpoint`                 | 用于 Web 传输的自定义 SSE 端点路径                                                                                                                    | /sse         |
| `base-url`                     | 可选的 URL 前缀。例如 base-url=/api/v1 意味着客户端应该访问 /api/v1 + sse-endpoint 的 sse 端点，消息端点是 /api/v1 + sse-message-endpoint                            | -            |
| `request-timeout`              | 等待服务器响应的超时时间。适用于通过客户端发出的所有请求，包括工具调用、资源访问和提示操作。                                                                                            | 20 秒         |

### 同步/异步服务器类型

- **同步服务器** - 使用 `McpSyncServer` 实现的默认服务器类型。 它设计用于应用程序中的简单请求-响应模式。 要启用此服务器类型，在配置中设置 `spring.ai.mcp.server.type=SYNC`。 激活时，它会自动处理同步工具规范的配置。

- **异步服务器** - 异步服务器实现使用 `McpAsyncServer`，针对非阻塞操作进行了优化。 要启用此服务器类型，使用 `spring.ai.mcp.server.type=ASYNC` 配置您的应用程序。 此服务器类型自动设置具有内置 Project Reactor 支持的异步工具规范。

### 服务器功能

MCP 服务器支持四种主要功能类型，可以单独启用或禁用：

- **工具** - 使用 `spring.ai.mcp.server.capabilities.tool=true|false` 启用/禁用工具功能

- **资源** - 使用 `spring.ai.mcp.server.capabilities.resource=true|false` 启用/禁用资源功能

- **提示** - 使用 `spring.ai.mcp.server.capabilities.prompt=true|false` 启用/禁用提示功能

- **完成** - 使用 `spring.ai.mcp.server.capabilities.completion=true|false` 启用/禁用完成功能

默认情况下，所有功能都已启用。禁用功能将阻止服务器向客户端注册和暴露相应的功能。

### 传输选项

MCP 服务器支持三种传输机制，每种都有其专用的启动器：

- 标准输入/输出（STDIO）- `spring-ai-starter-mcp-server`

- Spring MVC（服务器发送事件）- `spring-ai-starter-mcp-server-webmvc`

- Spring WebFlux（反应式 SSE）- `spring-ai-starter-mcp-server-webflux`

### 特性和功能

MCP 服务器启动器允许服务器向客户端暴露工具、资源和提示。 它自动将注册为 Spring bean 的自定义功能处理器转换为基于服务器类型的同步/异步规范：

#### 工具

允许服务器暴露可由语言模型调用的工具。MCP 服务器启动器提供：

- 变更通知支持

- Spring AI 工具 根据服务器类型自动转换为同步/异步规范

- 通过 Spring bean 自动工具规范：

```java
@Bean
public ToolCallbackProvider myTools(...) {
    List<ToolCallback> tools = ...
    return ToolCallbackProvider.from(tools);
}
```

或者使用低级API：

```java
@Bean
public List<McpServerFeatures.SyncToolSpecification> myTools(...) {
    List<McpServerFeatures.SyncToolSpecification> tools = ...
    return tools;
}
```

自动配置将自动检测并注册来自以下来源的所有工具回调： * 单个 `ToolCallback` bean * `ToolCallback` bean 列表 * `ToolCallbackProvider` bean

工具按名称去重，使用每个工具名称的第一个出现。

##### 工具上下文支持

支持 工具上下文，允许将上下文信息传递给工具调用。它在 `exchange` 键下包含一个 `McpSyncServerExchange` 实例，可通过 `McpToolUtils.getMcpExchange(toolContext)` 访问。请参阅此 [示例](https://github.com/spring-projects/spring-ai-examples/blob/3fab8483b8deddc241b1e16b8b049616604b7767/model-context-protocol/sampling/mcp-weather-webmvc-server/src/main/java/org/springframework/ai/mcp/sample/server/WeatherService.java#L59-L126)，演示了 `exchange.loggingNotification(…)` 和 `exchange.createMessage(…)`。

#### 资源管理

为服务器向客户端暴露资源提供标准化方式。

- 静态和动态资源规范

- 可选的变更通知

- 支持资源模板

- 在同步/异步资源规范之间自动转换

- 通过 Spring bean 自动资源规范：

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

#### 提示管理

为服务器向客户端暴露提示模板提供标准化方式。

- 变更通知支持

- 模板版本控制

- 在同步/异步提示规范之间自动转换

- 通过 Spring bean 自动提示规范：

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

#### 完成管理

为服务器向客户端暴露完成功能提供标准化方式。

- 支持同步和异步完成规范

- 通过 Spring bean 自动注册：

```java
@Bean
public List<McpServerFeatures.SyncCompletionSpecification> myCompletions() {
    var completion = new McpServerFeatures.SyncCompletionSpecification(
        "code-completion",
        "Provides code completion suggestions",
        (exchange, request) -> {
            // 返回完成建议的实现
            return new McpSchema.CompletionResult(List.of(
                new McpSchema.Completion("suggestion1", "First suggestion"),
                new McpSchema.Completion("suggestion2", "Second suggestion")
            ));
        }
    );

    return List.of(completion);
}
```

#### 根变更消费者

当根发生变更时，支持 `listChanged` 的客户端发送根变更通知。

- 支持监控根变更

- 为反应式应用程序自动转换为异步消费者

- 通过 Spring bean 可选注册

```java
@Bean
public BiConsumer<McpSyncServerExchange, List<McpSchema.Root>> rootsChangeHandler() {
    return (exchange, roots) -> {
        logger.info("Registering root resources: {}", roots);
    };
}
```

### 使用示例

#### 标准 STDIO 服务器配置

```yaml
# 使用 spring-ai-starter-mcp-server
spring:
  ai:
    mcp:
      server:
        name: stdio-mcp-server
        version: 1.0.0
        type: SYNC
```

#### WebMVC 服务器配置

```yaml
# 使用 spring-ai-starter-mcp-server-webmvc
spring:
  ai:
    mcp:
      server:
        name: webmvc-mcp-server
        version: 1.0.0
        type: SYNC
        instructions: "此服务器提供天气信息工具和资源"
        sse-message-endpoint: /mcp/messages
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true
```

#### WebFlux 服务器配置

```yaml
# 使用 spring-ai-starter-mcp-server-webflux
spring:
  ai:
    mcp:
      server:
        name: webflux-mcp-server
        version: 1.0.0
        type: ASYNC  # 推荐用于反应式应用程序
        instructions: "此反应式服务器提供天气信息工具和资源"
        sse-message-endpoint: /mcp/messages
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true
```

#### 创建带有 MCP 服务器的 Spring Boot 应用程序

```java
@Service
public class WeatherService {

    @Tool(description = "通过城市名称获取天气信息")
    public String getWeather(String cityName) {
        // 实现
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

自动配置将自动将工具回调注册为 MCP 工具。 您可以有多个产生 ToolCallbacks 的 bean。自动配置将合并它们。
