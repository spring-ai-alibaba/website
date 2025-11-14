---
title: MCP客户端启动器
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba MCP客户端启动器"
---

## MCP客户端启动器

Spring AI MCP（模型上下文协议）客户端启动器为 Spring Boot 应用程序中的 MCP 客户端功能提供自动配置。它支持同步和异步客户端实现，并提供多种传输选项。

MCP 客户端启动器提供：

- 多个客户端实例的管理

- 自动客户端初始化（如果启用）

- 支持多个命名传输

- 与 Spring AI 的工具执行框架集成

- 适当的生命周期管理，在应用程序上下文关闭时自动清理资源

- 通过自定义器实现可自定义的客户端创建

### 启动器

> Spring AI 自动配置和启动器模块的构件名称发生了重大变化。 请参阅 [升级说明](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

#### 标准 MCP 客户端

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>
```

标准启动器通过 `STDIO`（进程内）和/或 `SSE`（远程）传输同时连接到一个或多个 `MCP` 服务器。 `SSE` 连接使用基于 HttpClient 的传输实现。 每个到 MCP 服务器的连接都会创建一个新的 MCP 客户端实例。 您可以选择 `SYNC` 或 `ASYNC` MCP 客户端（注意：不能混合使用同步和异步客户端）。 对于生产部署，我们建议使用基于 WebFlux 的 SSE 连接，即 `spring-ai-starter-mcp-client-webflux`。

#### WebFlux客户端

##### 通用属性

通用属性以 `spring.ai.mcp.client` 为前缀：

| 属性                         | 描述                                          | 默认值                  |
|----------------------------|---------------------------------------------|----------------------|
| `enabled`                  | 启用/禁用 MCP 客户端                               | true                 |
| `name`                     | MCP 客户端实例的名称（用于兼容性检查）                       | spring-ai-mcp-client |
| `version`                  | MCP 客户端实例的版本                                | 1.0.0                |
| `initialized`              | 是否在创建时初始化客户端                                | true                 |
| `request-timeout`          | MCP 客户端请求的超时时间                              | 20s                  |
| `type`                     | 客户端类型（SYNC 或 ASYNC）。所有客户端必须是同步或异步的；不支持混合使用  | SYNC                 |
| `root-change-notification` | 为所有客户端启用/禁用根变更通知                            | true                 |
| `toolcallback.enabled`     | 启用/禁用 MCP 工具回调与 Spring AI 工具执行框架的集成         | true                 |


##### Stdio传输属性

标准 I/O 传输的属性以 `spring.ai.mcp.client.stdio` 为前缀：

| 属性                           | 描述                      | 默认值 |
|------------------------------|-------------------------|-----|
| `servers-configuration`      | 包含 MCP 服务器配置的 JSON 格式资源 | -   |
| `connections`                | 命名 stdio 连接配置的映射        | -   |
| `connections.[name].command` | 要执行的 MCP 服务器命令          | -   |
| `connections.[name].args`    | 命令参数列表                  | -   |
| `connections.[name].env`     | 服务器进程的环境变量映射            | -   |

配置示例：

```yaml
spring:
  ai:
    mcp:
      client:
        stdio:
          root-change-notification: true
          connections:
            server1:
              command: /path/to/server
              args:
                - --port=8080
                - --mode=production
              env:
                API_KEY: your-api-key
                DEBUG: "true"
```

或者，您可以使用外部 JSON 文件配置 stdio 连接，使用 [Claude Desktop 格式](https://modelcontextprotocol.io/quickstart/user)：

```yaml
spring:
  ai:
    mcp:
      client:
        stdio:
          servers-configuration: classpath:mcp-servers.json
```

Claude Desktop 格式如下：

```yaml
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ]
    }
  }
}
```

目前，Claude Desktop 格式仅支持 STDIO 连接类型。

#### SSE 传输属性

服务器发送事件（SSE）传输的属性以 `spring.ai.mcp.client.sse` 为前缀：

| 属性                                | 描述                           | 默认值  |
|-----------------------------------|------------------------------|------|
| `connections`                     | 命名 SSE 连接配置的映射               | -    |
| `connections.[name].url`          | 与 MCP 服务器进行 SSE 通信的基本 URL 端点 | -    |
| `connections.[name].sse-endpoint` | 用于连接的 sse 端点（作为 url 后缀）      | /sse |

配置示例：

```yaml
spring:
  ai:
    mcp:
      client:
        sse:
          connections:
            server1:
              url: http://localhost:8080
            server2:
              url: http://otherserver:8081
              sse-endpoint: /custom-sse
```

### 特性

#### 同步/异步客户端类型

启动器支持两种类型的客户端：

- 同步 - 默认客户端类型，适用于具有阻塞操作的传统请求-响应模式

- 异步 - 适用于具有非阻塞操作的反应式应用程序，使用 `spring.ai.mcp.client.type=ASYNC` 配置

#### 客户端自定义

自动配置通过回调接口提供广泛的客户端规范自定义功能。这些自定义器允许您配置 MCP 客户端行为的各个方面，从请求超时到事件处理和消息处理。

##### 自定义类型
以下自定义选项可用：
- 请求配置 - 设置自定义请求超时

- 自定义采样处理器 - 服务器通过客户端从 LLM 请求 LLM 采样（completions 或 generations）的标准化方式。此流程允许客户端保持对模型访问、选择和权限的控制，同时使服务器能够利用 AI 功能 — 无需服务器 API 密钥。

- 文件系统（根）访问 - 客户端向服务器公开文件系统 roots 的标准化方式。 Roots 定义了服务器可以在文件系统中操作的边界，允许它们了解可以访问哪些目录和文件。 服务器可以从支持根变更的客户端请求根列表，并在该列表更改时接收通知。

- 事件处理器 - 当发生特定服务器事件时通知客户端的处理器：

  - 工具变更通知 - 当可用服务器工具列表更改时

  - 资源变更通知 - 当可用服务器资源列表更改时

  - 提示变更通知 - 当可用服务器提示列表更改时

- 日志处理器 - 服务器向客户端发送结构化日志消息的标准化方式。 客户端可以通过设置最小日志级别来控制日志详细程度

您可以根据应用程序的需求实现 `McpSyncClientCustomizer` 用于同步客户端，或 `McpAsyncClientCustomizer` 用于异步客户端。

###### 同步代码示例：

```java
@Component
public class CustomMcpSyncClientCustomizer implements McpSyncClientCustomizer {
    @Override
    public void customize(String serverConfigurationName, McpClient.SyncSpec spec) {

        // 自定义请求超时配置
        spec.requestTimeout(Duration.ofSeconds(30));

        // 设置此客户端可以访问的根 URI。
        spec.roots(roots);

        // 设置用于处理消息创建请求的自定义采样处理器。
        spec.sampling((CreateMessageRequest messageRequest) -> {
            // 处理采样
            CreateMessageResult result = ...
            return result;
        });

        // 添加一个消费者，在可用工具更改时（例如添加或删除工具）通知。
        spec.toolsChangeConsumer((List<McpSchema.Tool> tools) -> {
            // 处理工具变更
        });

        // 添加一个消费者，在可用资源更改时（例如添加或删除资源）通知。
        spec.resourcesChangeConsumer((List<McpSchema.Resource> resources) -> {
            // 处理资源变更
        });

        // 添加一个消费者，在可用提示更改时（例如添加或删除提示）通知。
        spec.promptsChangeConsumer((List<McpSchema.Prompt> prompts) -> {
            // 处理提示变更
        });

        // 添加一个消费者，在从服务器接收日志消息时通知。
        spec.loggingConsumer((McpSchema.LoggingMessageNotification log) -> {
            // 处理日志消息
        });
    }
}
```

###### 异步代码示例：

```java
@Component
public class CustomMcpAsyncClientCustomizer implements McpAsyncClientCustomizer {
    @Override
    public void customize(String serverConfigurationName, McpClient.AsyncSpec spec) {
        // 自定义异步客户端配置
        spec.requestTimeout(Duration.ofSeconds(30));
    }
}
```

`serverConfigurationName` 参数是正在应用自定义器的服务器配置的名称，MCP 客户端将为其创建。

MCP 客户端自动配置会自动检测并应用在应用程序上下文中找到的任何自定义器。

#### 传输支持

自动配置支持多种传输类型：

- 标准 I/O（Stdio）（由 `spring-ai-starter-mcp-client` 激活）

- SSE HTTP（由 `spring-ai-starter-mcp-client` 激活）

- SSE WebFlux（由 `spring-ai-starter-mcp-client-webflux` 激活）

#### 与Spring AI集成

启动器可以配置与 Spring AI 工具执行框架集成的工具回调，允许 MCP 工具作为 AI 交互的一部分使用。默认情况下启用此集成，可以通过设置 `spring.ai.mcp.client.toolcallback.enabled=false` 属性来禁用。

### 使用示例

将适当的启动器依赖项添加到您的项目中，并在 `application.properties` 或 `application.yml` 中配置客户端：

```yaml
spring:
  ai:
    mcp:
      client:
        enabled: true
        name: my-mcp-client
        version: 1.0.0
        request-timeout: 30s
        type: SYNC  # 或 ASYNC 用于反应式应用程序
        sse:
          connections:
            server1:
              url: http://localhost:8080
            server2:
              url: http://otherserver:8081
        stdio:
          root-change-notification: false
          connections:
            server1:
              command: /path/to/server
              args:
                - --port=8080
                - --mode=production
              env:
                API_KEY: your-api-key
                DEBUG: "true"
```

MCP客户端bean将自动配置并可用于注入：

```java
@Autowired
private List<McpSyncClient> mcpSyncClients;  // 用于同步客户端

// 或

@Autowired
private List<McpAsyncClient> mcpAsyncClients;  // 用于异步客户端
```

当启用工具回调时（默认行为），所有 MCP 客户端的已注册 MCP 工具都作为 `ToolCallbackProvider` 实例提供：

```java
@Autowired
private SyncMcpToolCallbackProvider toolCallbackProvider;
ToolCallback[] toolCallbacks = toolCallbackProvider.getToolCallbacks();
```
