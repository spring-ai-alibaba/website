# MCP Server Boot Starter

[Model Context Protocol (MCP) Servers](https://modelcontextprotocol.io/docs/learn/server-concepts) 是通过标准化协议接口向 AI 应用程序暴露特定功能的程序。
每个服务器为特定领域提供聚焦的功能。

Spring AI MCP Server Boot Starters 为在 Spring Boot 应用程序中设置 [MCP Servers](https://modelcontextprotocol.io/docs/learn/server-concepts) 提供自动配置。
它们使 MCP 服务器功能与 Spring Boot 的自动配置系统无缝集成。

MCP Server Boot Starters 提供：

* MCP 服务器组件的自动配置，包括工具、资源和 prompts
* 支持不同的 MCP 协议版本，包括 STDIO、SSE、Streamable-HTTP 和无状态服务器
* 支持同步和异步操作模式
* 多种传输层选项
* 灵活的工具、资源和 prompt 规范
* 变更通知功能
* [基于注解的服务器开发](mcp/mcp-annotations-server.adoc)，具有自动 bean 扫描和注册

## MCP Server Boot Starters

MCP 服务器支持多种协议和传输机制。
使用专用的 starter 和正确的 `spring.ai.mcp.server.protocol` 属性来配置您的服务器：

### STDIO

| Server Type | Dependency | Property |
| --- | --- | --- |
| [Standard Input/Output (STDIO)](mcp-stdio-sse-server-boot-starter-docs) | `spring-ai-starter-mcp-server` | `spring.ai.mcp.server.stdio=true` |

### WebMVC

| Server Type | Dependency | Property |
| --- | --- | --- |
| [SSE WebMVC](mcp-stdio-sse-server-boot-starter-docs#_sse_webmvc_serve) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=SSE` or empty |
| [Streamable-HTTP WebMVC](mcp-streamable-http-server-boot-starter-docs#_streamable_http_webmvc_server) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=STREAMABLE` |
| [Stateless WebMVC](mcp-stateless-server-boot-starter-docs#_stateless_webmvc_server) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=STATELESS` |

### WebMVC (Reactive)

| Server Type | Dependency | Property |
| --- | --- | --- |
| [SSE WebFlux](mcp-stdio-sse-server-boot-starter-docs#_sse_webflux_serve) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=SSE` or empty |
| [Streamable-HTTP WebFlux](mcp-streamable-http-server-boot-starter-docs#_streamable_http_webflux_server) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=STREAMABLE` |
| [Stateless WebFlux](mcp-stateless-server-boot-starter-docs#_stateless_webflux_server) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=STATELESS` |

## Server Capabilities

根据服务器和传输类型，MCP 服务器可以支持各种功能，例如：

* **Tools** - 允许服务器暴露可由语言模型调用的工具
* **Resources** - 为服务器向客户端暴露资源提供标准化方式
* **Prompts** - 为服务器向客户端暴露 prompt 模板提供标准化方式
* **Utility/Completions** - 为服务器为 prompts 和资源 URI 提供参数自动完成建议提供标准化方式
* **Utility/Logging** - 为服务器向客户端发送结构化日志消息提供标准化方式
* **Utility/Progress** - 通过通知消息对长时间运行的操作进行可选的进度跟踪
* **Utility/Ping** - 服务器报告其状态的可选健康检查机制

默认情况下，所有功能都已启用。禁用功能将阻止服务器向客户端注册和暴露相应的功能。

## Server Protocols

MCP 提供多种协议类型，包括：

* [**STDIO**](mcp-stdio-sse-server-boot-starter-docs) - 进程内（例如，服务器在主机应用程序内运行）协议。通信通过标准输入和标准输出进行。要启用 `STDIO`，请设置 `spring.ai.mcp.server.stdio=true`。
* [**SSE**](mcp-stdio-sse-server-boot-starter-docs#_sse_webmvc_server) - 用于实时更新的 Server-sent events 协议。服务器作为独立进程运行，可以处理多个客户端连接。
* [**Streamable-HTTP**](mcp-streamable-http-server-boot-starter-docs) - [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) 允许 MCP 服务器作为独立进程运行，可以使用 HTTP POST 和 GET 请求处理多个客户端连接，并可选地使用 Server-Sent Events (SSE) 流式传输多个服务器消息。它取代了 SSE 传输。要启用 `STREAMABLE` 协议，请设置 `spring.ai.mcp.server.protocol=STREAMABLE`。
* [**Stateless**](mcp-stateless-server-boot-starter-docs) - 无状态 MCP 服务器专为简化部署而设计，在请求之间不维护会话状态。
它们非常适合微服务架构和云原生部署。要启用 `STATELESS` 协议，请设置 `spring.ai.mcp.server.protocol=STATELESS`。

## Sync/Async Server API Options

MCP Server API 支持命令式（即同步）和响应式（例如异步）编程模型。

* **Synchronous Server** - 使用 `McpSyncServer` 实现的默认服务器类型。
它专为应用程序中的简单请求-响应模式而设计。
要启用此服务器类型，请在配置中设置 `spring.ai.mcp.server.type=SYNC`。
激活后，它会自动处理同步工具规范的配置。

**注意：** SYNC 服务器将仅注册同步 MCP 带注解的方法。异步方法将被忽略。

* **Asynchronous Server** - 异步服务器实现使用 `McpAsyncServer`，并针对非阻塞操作进行了优化。
要启用此服务器类型，请使用 `spring.ai.mcp.server.type=ASYNC` 配置应用程序。
此服务器类型自动设置异步工具规范，并内置 Project Reactor 支持。

**注意：** ASYNC 服务器将仅注册异步 MCP 带注解的方法。同步方法将被忽略。

## MCP Server Annotations

MCP Server Boot Starters 为基于注解的服务器开发提供全面支持，允许您使用声明式 Java 注解而不是手动配置来创建 MCP 服务器。

### Key Annotations

* [**@McpTool**](annotations/mcp-annotations-server#_mcptool) - 将方法标记为 MCP 工具，自动生成 JSON schema
* [**@McpResource**](annotations/mcp-annotations-server#_mcpresource) - 通过 URI 模板提供资源访问
* [**@McpPrompt**](annotations/mcp-annotations-server#_mcpprompt) - 为 AI 交互生成 prompt 消息
* [**@McpComplete**](annotations/mcp-annotations-server#_mcpcomplete) - 为 prompts 提供自动完成功能

### Special Parameters

注解系统支持[特殊参数类型](annotations/mcp-annotations-special-params)，提供额外的上下文：

* **`McpMeta`** - 访问来自 MCP 请求的元数据
* **`@McpProgressToken`** - 接收长时间运行操作的进度令牌
* **`McpSyncServerExchange`/`McpAsyncServerExchange`** - 用于高级操作的完整服务器上下文
* **`McpTransportContext`** - 用于无状态操作的轻量级上下文
* **`CallToolRequest`** - 用于灵活工具的动态 schema 支持

### Simple Example

```java
@Component
public class CalculatorTools {

    @McpTool(name = "add", description = "Add two numbers together")
    public int add(
            @McpToolParam(description = "First number", required = true) int a,
            @McpToolParam(description = "Second number", required = true) int b) {
        return a + b;
    }

    @McpResource(uri = "config://{key}", name = "Configuration")
    public String getConfig(String key) {
        return configData.get(key);
    }
}
```

### Auto-Configuration

通过 Spring Boot 自动配置，带注解的 beans 会自动检测并注册：

```java
@SpringBootApplication
public class McpServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }
}
```

自动配置将：

1. 扫描带有 MCP 注解的 beans
2. 创建适当的规范
3. 将它们注册到 MCP 服务器
4. 根据配置处理同步和异步实现

### Configuration Properties

配置服务器注解扫描器：

```yaml
spring:
  ai:
    mcp:
      server:
        type: SYNC  # or ASYNC
        annotation-scanner:
          enabled: true
```

## Example Applications

* [Weather Server (SSE WebFlux)](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-webflux-server) - 带有 WebFlux 传输的 Spring AI MCP Server Boot Starter
* [Weather Server (STDIO)](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-stdio-server) - 带有 STDIO 传输的 Spring AI MCP Server Boot Starter
* [Weather Server Manual Configuration](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/manual-webflux-server) - 不使用自动配置但使用 Java SDK 手动配置服务器的 Spring AI MCP Server Boot Starter

