# MCP Annotations

Spring AI MCP Annotations 模块为 Java 中的 [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/spec) 服务器和客户端提供基于注解的方法处理。
它通过使用 Java 注解的简洁声明式方法简化了 MCP 服务器方法和客户端处理器的创建和注册。

MCP Annotations 使开发者能够使用声明式注解创建和注册 MCP 操作处理器。
这种方法通过减少样板代码和提高可维护性来简化 MCP 服务器和客户端功能的实现。

该库构建在 [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk) 之上，为实现 MCP 服务器和客户端提供更高级的、基于注解的编程模型。

## Architecture

MCP Annotations 模块包括：

### Server Annotations

对于 MCP 服务器，提供以下注解：

* `@McpTool` - 实现 MCP 工具，自动生成 JSON schema
* `@McpResource` - 通过 URI 模板提供资源访问
* `@McpPrompt` - 生成 prompt 消息
* `@McpComplete` - 提供自动完成功能

### Client Annotations

对于 MCP 客户端，提供以下注解：

* `@McpLogging` - 处理日志消息通知
* `@McpSampling` - 处理 sampling 请求
* `@McpElicitation` - 处理用于收集额外信息的 elicitation 请求
* `@McpProgress` - 处理长时间运行操作期间的进度通知
* `@McpToolListChanged` - 处理工具列表变更通知
* `@McpResourceListChanged` - 处理资源列表变更通知
* `@McpPromptListChanged` - 处理 prompt 列表变更通知

### Special Parameters and Annotations

* `McpSyncRequestContext` - 用于同步操作的特殊参数类型，提供统一的接口来访问 MCP 请求上下文，包括原始请求、服务器交换（用于有状态操作）、传输上下文（用于无状态操作），以及用于日志记录、进度、sampling 和 elicitation 的便捷方法。此参数会自动注入并从 JSON schema 生成中排除。**支持 Complete、Prompt、Resource 和 Tool 方法。**
* `McpAsyncRequestContext` - 用于异步操作的特殊参数类型，提供与 `McpSyncRequestContext` 相同的统一接口，但使用响应式（基于 Mono）的返回类型。此参数会自动注入并从 JSON schema 生成中排除。**支持 Complete、Prompt、Resource 和 Tool 方法。**
* `McpTransportContext` - 用于无状态操作的特殊参数类型，提供对传输级上下文的轻量级访问，无需完整的服务器交换功能。此参数会自动注入并从 JSON schema 生成中排除
* `@McpProgressToken` - 标记方法参数以接收请求中的进度令牌。此参数会自动注入并从生成的 JSON schema 中排除。**注意：** 使用 `McpSyncRequestContext` 或 `McpAsyncRequestContext` 时，可以通过 `ctx.request().progressToken()` 访问进度令牌，而无需使用此注解。
* `McpMeta` - 提供对来自 MCP 请求、通知和结果的元数据访问的特殊参数类型。此参数会自动注入，并从参数计数限制和 JSON schema 生成中排除。**注意：** 使用 `McpSyncRequestContext` 或 `McpAsyncRequestContext` 时，可以通过 `ctx.requestMeta()` 获取元数据。

## Getting Started

### Dependencies

将 MCP annotations 依赖添加到项目中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mcp-annotations</artifactId>
</dependency>
```

使用任何 MCP Boot Starters 时，MCP annotations 会自动包含：

* `spring-ai-starter-mcp-client`
* `spring-ai-starter-mcp-client-webflux`
* `spring-ai-starter-mcp-server`
* `spring-ai-starter-mcp-server-webflux`
* `spring-ai-starter-mcp-server-webmvc`

### Configuration

使用 MCP Boot Starters 时，注解扫描默认启用。可以使用以下属性配置扫描行为：

#### Client Annotation Scanner

```yaml
spring:
  ai:
    mcp:
      client:
        annotation-scanner:
          enabled: true  # Enable/disable annotation scanning
```

#### Server Annotation Scanner

```yaml
spring:
  ai:
    mcp:
      server:
        annotation-scanner:
          enabled: true  # Enable/disable annotation scanning
```

## Quick Example

以下是一个使用 MCP annotations 创建计算器工具的简单示例：

```java
@Component
public class CalculatorTools {

    @McpTool(name = "add", description = "Add two numbers together")
    public int add(
            @McpToolParam(description = "First number", required = true) int a,
            @McpToolParam(description = "Second number", required = true) int b) {
        return a + b;
    }

    @McpTool(name = "multiply", description = "Multiply two numbers")
    public double multiply(
            @McpToolParam(description = "First number", required = true) double x,
            @McpToolParam(description = "Second number", required = true) double y) {
        return x * y;
    }
}
```

以及一个简单的日志客户端处理器：

```java
@Component
public class LoggingHandler {

    @McpLogging(clients = "my-server")
    public void handleLoggingMessage(LoggingMessageNotification notification) {
        System.out.println("Received log: " + notification.level() + 
                          " - " + notification.data());
    }
}
```

通过 Spring Boot 自动配置，这些带注解的 beans 会自动检测并注册到 MCP 服务器或客户端。

## Documentation

* [Client Annotations](mcp-annotations-client) - 客户端注解的详细指南
* [Server Annotations](mcp-annotations-server) - 服务器端注解的详细指南
* [Special Parameters](mcp-annotations-special-params) - 特殊参数类型指南
* [Examples](mcp-annotations-examples) - 综合示例和用例


