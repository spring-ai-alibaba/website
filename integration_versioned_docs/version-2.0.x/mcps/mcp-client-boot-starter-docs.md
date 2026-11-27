# MCP Client Boot Starter

Spring AI MCP (Model Context Protocol) Client Boot Starter 为 Spring Boot 应用程序中的 MCP 客户端功能提供自动配置。
它支持同步和异步客户端实现，并提供多种传输选项。

MCP Client Boot Starter 提供：

* 多个客户端实例的管理
* 自动客户端初始化（如果启用）
* 支持多个命名传输（STDIO、Http/SSE 和 Streamable HTTP）
* 与 Spring AI 的工具执行框架集成
* 工具过滤功能，用于选择性包含/排除工具
* 可自定义的工具名称前缀生成，以避免命名冲突
* 适当的生命周期管理，在应用程序上下文关闭时自动清理资源
* 通过 customizers 自定义客户端创建

## Starters

### Standard MCP Client

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>
```

标准 starter 通过 `STDIO`（进程内）、`SSE`、`Streamable-HTTP` 和 `Stateless Streamable-HTTP` 传输同时连接到一个或多个 MCP 服务器。
SSE 和 Streamable-Http 传输使用基于 JDK HttpClient 的传输实现。
每个到 MCP 服务器的连接都会创建一个新的 MCP 客户端实例。
您可以选择 `SYNC` 或 `ASYNC` MCP 客户端（注意：不能混合使用同步和异步客户端）。
对于生产部署，我们建议使用基于 WebFlux 的 SSE 和 StreamableHttp 连接，使用 `spring-ai-starter-mcp-client-webflux`。

### WebFlux Client

WebFlux starter 提供与标准 starter 类似的功能，但使用基于 WebFlux 的 Streamable-Http、Stateless Streamable-HTTP 和 SSE 传输实现。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client-webflux</artifactId>
</dependency>
```

## Configuration Properties

### Common Properties

通用属性以 `spring.ai.mcp.client` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP client | `true` |
| `name` | Name of the MCP client instance | `spring-ai-mcp-client` |
| `version` | Version of the MCP client instance | `1.0.0` |
| `initialized` | Whether to initialize clients on creation | `true` |
| `request-timeout` | Timeout duration for MCP client requests | `20s` |
| `type` | Client type (SYNC or ASYNC). All clients must be either sync or async; mixing is not supported | `SYNC` |
| `root-change-notification` | Enable/disable root change notifications for all clients | `true` |
| `toolcallback.enabled` | Enable/disable the MCP tool callback integration with Spring AI's tool execution framework | `true` |

### MCP Annotations Properties

MCP Client Annotations 提供了一种使用 Java 注解实现 MCP 客户端处理器的声明式方法。
客户端 mcp-annotations 属性以 `spring.ai.mcp.client.annotation-scanner` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `enabled` | Enable/disable the MCP client annotations auto-scanning | `true` |

### Stdio Transport Properties

标准 I/O 传输的属性以 `spring.ai.mcp.client.stdio` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `servers-configuration` | Resource containing the MCP servers configuration in JSON format | - |
| `connections` | Map of named stdio connection configurations | - |
| `connections.[name].command` | The command to execute for the MCP server | - |
| `connections.[name].args` | List of command arguments | - |
| `connections.[name].env` | Map of environment variables for the server process | - |

Example configuration:

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

或者，您可以使用外部 JSON 文件配置 stdio 连接，使用 [Claude Desktop format](https://modelcontextprotocol.io/quickstart/user)：

```yaml
spring:
  ai:
    mcp:
      client:
        stdio:
          servers-configuration: classpath:mcp-servers.json
```

Claude Desktop 格式如下所示：

```json
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

### Windows STDIO Configuration

> **重要提示：** 在 Windows 上，像 `npx`、`npm` 和 `node` 这样的命令是作为**批处理文件**（`.cmd`）实现的，而不是原生可执行文件。Java 的 `ProcessBuilder` 无法直接执行批处理文件，需要 `cmd.exe /c` 包装器。

#### Why Windows Needs Special Handling

当 Java 的 `ProcessBuilder`（由 `StdioClientTransport` 内部使用）尝试在 Windows 上生成进程时，它只能执行：

* 原生可执行文件（`.exe` 文件）
* `cmd.exe` 可用的系统命令

像 `npx.cmd`、`npm.cmd` 甚至 `python.cmd`（来自 Microsoft Store）这样的 Windows 批处理文件需要 `cmd.exe` shell 来执行它们。

#### Solution: cmd.exe Wrapper

使用 `cmd.exe /c` 包装批处理文件命令：

**Windows Configuration:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\username\\Desktop"
      ]
    }
  }
}
```

**Linux/macOS Configuration:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop"
      ]
    }
  }
}
```

#### Cross-Platform Programmatic Configuration

对于需要在不同平台上工作而无需单独配置文件应用程序，在 Spring Boot 应用程序中使用 OS 检测：

```java
@Bean(destroyMethod = "close")
@ConditionalOnMissingBean(McpSyncClient.class)
public McpSyncClient mcpClient() {
    ServerParameters stdioParams;

    if (isWindows()) {
        // Windows: cmd.exe /c npx approach
        var winArgs = new ArrayList<>(Arrays.asList(
            "/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "target"));
        stdioParams = ServerParameters.builder("cmd.exe")
                .args(winArgs)
                .build();
    } else {
        // Linux/Mac: direct npx approach
        stdioParams = ServerParameters.builder("npx")
                .args("-y", "@modelcontextprotocol/server-filesystem", "target")
                .build();
    }

    return McpClient.sync(new StdioClientTransport(stdioParams, McpJsonMapper.createDefault()))
            .requestTimeout(Duration.ofSeconds(10))
            .build()
            .initialize();
}

private static boolean isWindows() {
    return System.getProperty("os.name").toLowerCase().contains("win");
}
```

**注意：** 使用 `@Bean` 进行程序化配置时，添加 `@ConditionalOnMissingBean(McpSyncClient.class)` 以避免与来自 JSON 文件的自动配置冲突。

#### Path Considerations

**Relative paths** (recommended for portability):

```json
{
  "command": "cmd.exe",
  "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "target"]
}
```

MCP 服务器根据应用程序的工作目录解析相对路径。

**Absolute paths** (Windows requires backslashes or escaped forward slashes):

```json
{
  "command": "cmd.exe",
  "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\username\\project\\target"]
}
```

#### Common Windows Batch Files Requiring cmd.exe

* `npx.cmd`, `npm.cmd` - Node package managers
* `python.cmd` - Python (Microsoft Store installation)
* `pip.cmd` - Python package manager
* `mvn.cmd` - Maven wrapper
* `gradle.cmd` - Gradle wrapper
* Custom `.cmd` or `.bat` scripts

#### Reference Implementation

查看 [Spring AI Examples - Filesystem](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/filesystem) 以获取完整的跨平台 MCP 客户端实现，该实现自动检测 OS 并适当配置客户端。

### Streamable-HTTP Transport Properties

用于连接到 Streamable-HTTP 和 Stateless Streamable-HTTP MCP 服务器。

Streamable-HTTP 传输的属性以 `spring.ai.mcp.client.streamable-http` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `connections` | Map of named Streamable-HTTP connection configurations | - |
| `connections.[name].url` | Base URL endpoint for Streamable-Http communication with the MCP server | - |
| `connections.[name].endpoint` | the streamable-http endpoint (as url suffix) to use for the connection | `/mcp` |

Example configuration:

```yaml
spring:
  ai:
    mcp:
      client:
        streamable-http:
          connections:
            server1:
              url: http://localhost:8080
            server2:
              url: http://otherserver:8081
              endpoint: /custom-sse
```

### SSE Transport Properties

Server-Sent Events (SSE) 传输的属性以 `spring.ai.mcp.client.sse` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `connections` | Map of named SSE connection configurations | - |
| `connections.[name].url` | Base URL endpoint for SSE communication with the MCP server | - |
| `connections.[name].sse-endpoint` | the sse endpoint (as url suffix) to use for the connection | `/sse` |

Example configurations:

```yaml
spring:
  ai:
    mcp:
      client:
        sse:
          connections:
            # Simple configuration using default /sse endpoint
            server1:
              url: http://localhost:8080
            # Custom SSE endpoint
            server2:
              url: http://otherserver:8081
              sse-endpoint: /custom-sse
            # Complex URL with path and token (like MCP Hub)
            mcp-hub:
              url: http://localhost:3000
              sse-endpoint: /mcp-hub/sse/cf9ec4527e3c4a2cbb149a85ea45ab01
            # SSE endpoint with query parameters
            api-server:
              url: https://api.example.com
              sse-endpoint: /v1/mcp/events?token=abc123&format=json
```

#### URL Splitting Guidelines

当您有一个完整的 SSE URL 时，将其拆分为基础 URL 和端点路径：

| Full URL | Configuration |
| --- | --- |
| `http://localhost:3000/mcp-hub/sse/token123` | `url: http://localhost:3000` + `sse-endpoint: /mcp-hub/sse/token123` |
| `https://api.service.com/v2/events?key=secret` | `url: https://api.service.com` + `sse-endpoint: /v2/events?key=secret` |
| `http://localhost:8080/sse` | `url: http://localhost:8080` + `sse-endpoint: /sse` (or omit for default) |

#### Troubleshooting SSE Connections

*404 Not Found Errors:*

* 验证 URL 拆分：确保基础 `url` 仅包含 scheme、host 和 port
* 检查 `sse-endpoint` 以 `/` 开头并包含完整路径和查询参数
* 在浏览器或 curl 中直接测试完整 URL 以确认其可访问

### Streamable Http Transport Properties

Streamable Http 传输的属性以 `spring.ai.mcp.client.streamable-http` 为前缀：

| Property | Description | Default Value |
| --- | --- | --- |
| `connections` | Map of named Streamable Http connection configurations | - |
| `connections.[name].url` | Base URL endpoint for Streamable-Http communication with the MCP server | - |
| `connections.[name].endpoint` | the streamable-http endpoint (as url suffix) to use for the connection | `/mcp` |

Example configuration:

```yaml
spring:
  ai:
    mcp:
      client:
        streamable-http:
          connections:
            server1:
              url: http://localhost:8080
            server2:
              url: http://otherserver:8081
              endpoint: /custom-sse
```

## Features

### Sync/Async Client Types

starter 支持两种类型的客户端：

* Synchronous - 默认客户端类型（`spring.ai.mcp.client.type=SYNC`），适用于具有阻塞操作的传统请求-响应模式

**注意：** SYNC 客户端将仅注册同步 MCP 带注解的方法。异步方法将被忽略。

* Asynchronous - 适用于具有非阻塞操作的响应式应用程序，使用 `spring.ai.mcp.client.type=ASYNC` 配置

**注意：** ASYNC 客户端将仅注册异步 MCP 带注解的方法。同步方法将被忽略。

### Client Customization

自动配置通过回调接口提供广泛的客户端规范自定义功能。这些 customizers 允许您配置 MCP 客户端行为的各个方面，从请求超时到事件处理和消息处理。

#### Customization Types

以下自定义选项可用：

* *Request Configuration* - 设置自定义请求超时
* [*Custom Sampling Handlers*](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling) - 服务器通过客户端从 LLM 请求 LLM sampling（`completions` 或 `generations`）的标准化方式。此流程允许客户端保持对模型访问、选择和权限的控制，同时使服务器能够利用 AI 能力——无需服务器 API 密钥。
* [*File system (Roots) Access*](https://modelcontextprotocol.io/specification/2025-06-18/client/roots) - 客户端向服务器暴露文件系统 `roots` 的标准化方式。
Roots 定义了服务器可以在文件系统内操作的边界，允许它们了解可以访问哪些目录和文件。
服务器可以从支持客户端请求 roots 列表，并在该列表更改时接收通知。
* [*Elicitation Handlers*](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) - 服务器在交互期间通过客户端从用户请求额外信息的标准化方式。
* *Event Handlers* - 客户端处理器，在发生某些服务器事件时被通知：
  - Tools change notifications - 当可用服务器工具列表更改时
  - Resources change notifications - 当可用服务器资源列表更改时
  - Prompts change notifications - 当可用服务器 prompts 列表更改时
  - [*Logging Handlers*](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging) - 服务器向客户端发送结构化日志消息的标准化方式。
  - [*Progress Handlers*](https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress) - 服务器向客户端发送结构化进度消息的标准化方式。

客户端可以通过设置最小日志级别来控制日志详细程度

#### Client Customization Example

您可以根据应用程序的需求实现 `McpSyncClientCustomizer`（用于同步客户端）或 `McpAsyncClientCustomizer`（用于异步客户端）。

**Sync:**

```java
@Component
public class CustomMcpSyncClientCustomizer implements McpSyncClientCustomizer {
    @Override
    public void customize(String serverConfigurationName, McpClient.SyncSpec spec) {

        // Customize the request timeout configuration
        spec.requestTimeout(Duration.ofSeconds(30));

        // Sets the root URIs that this client can access.
        spec.roots(roots);

        // Sets a custom sampling handler for processing message creation requests.
        spec.sampling((CreateMessageRequest messageRequest) -> {
            // Handle sampling
            CreateMessageResult result = ...
            return result;
        });

        // Sets a custom elicitation handler for processing elicitation requests.
        spec.elicitation((ElicitRequest request) -> {
          // handle elicitation
          return new ElicitResult(ElicitResult.Action.ACCEPT, Map.of("message", request.message()));
        });

        // Adds a consumer to be notified when progress notifications are received.
        spec.progressConsumer((ProgressNotification progress) -> {
         // Handle progress notifications
        });

        // Adds a consumer to be notified when the available tools change, such as tools
        // being added or removed.
        spec.toolsChangeConsumer((List<McpSchema.Tool> tools) -> {
            // Handle tools change
        });

        // Adds a consumer to be notified when the available resources change, such as resources
        // being added or removed.
        spec.resourcesChangeConsumer((List<McpSchema.Resource> resources) -> {
            // Handle resources change
        });

        // Adds a consumer to be notified when the available prompts change, such as prompts
        // being added or removed.
        spec.promptsChangeConsumer((List<McpSchema.Prompt> prompts) -> {
            // Handle prompts change
        });

        // Adds a consumer to be notified when logging messages are received from the server.
        spec.loggingConsumer((McpSchema.LoggingMessageNotification log) -> {
            // Handle log messages
        });
    }
}
```

**Async:**

```java
@Component
public class CustomMcpAsyncClientCustomizer implements McpAsyncClientCustomizer {
    @Override
    public void customize(String serverConfigurationName, McpClient.AsyncSpec spec) {
        // Customize the async client configuration
        spec.requestTimeout(Duration.ofSeconds(30));
    }
}
```

`serverConfigurationName` 参数是应用 customizer 并为其创建 MCP 客户端的服务器配置名称。

MCP 客户端自动配置会自动检测并应用在应用程序上下文中找到的任何 customizers。

### Transport Support

自动配置支持多种传输类型：

* Standard I/O (Stdio)（由 `spring-ai-starter-mcp-client` 和 `spring-ai-starter-mcp-client-webflux` 激活）
* (HttpClient) HTTP/SSE 和 Streamable-HTTP（由 `spring-ai-starter-mcp-client` 激活）
* (WebFlux) HTTP/SSE 和 Streamable-HTTP（由 `spring-ai-starter-mcp-client-webflux` 激活）

### Tool Filtering

MCP Client Boot Starter 通过 `McpToolFilter` 接口支持对发现的工具进行过滤。这允许您根据自定义条件（如 MCP 连接信息或工具属性）选择性地包含或排除工具。

要实现工具过滤，创建一个实现 `McpToolFilter` 接口的 bean：

```java
@Component
public class CustomMcpToolFilter implements McpToolFilter {

    @Override
    public boolean test(McpConnectionInfo connectionInfo, McpSchema.Tool tool) {
        // Filter logic based on connection information and tool properties
        // Return true to include the tool, false to exclude it

        // Example: Exclude tools from a specific client
        if (connectionInfo.clientInfo().name().equals("restricted-client")) {
            return false;
        }

        // Example: Only include tools with specific names
        if (tool.name().startsWith("allowed_")) {
            return true;
        }

        // Example: Filter based on tool description or other properties
        if (tool.description() != null &&
            tool.description().contains("experimental")) {
            return false;
        }

        return true; // Include all other tools by default
    }
}
```

`McpConnectionInfo` record 提供对以下内容的访问：

* `clientCapabilities` - MCP 客户端的能力
* `clientInfo` - 关于 MCP 客户端的信息（名称和版本）
* `initializeResult` - 来自 MCP 服务器的初始化结果

过滤器会自动检测并应用于同步和异步 MCP 工具回调提供程序。
如果未提供自定义过滤器，默认情况下会包含所有发现的工具。

**注意：** 在应用程序上下文中应只定义一个 `McpToolFilter` bean。
如果需要多个过滤器，请将它们组合到单个复合过滤器实现中。

### Tool Name Prefix Generation

MCP Client Boot Starter 通过 `McpToolNamePrefixGenerator` 接口支持可自定义的工具名称前缀生成。此功能通过在工具名称中添加唯一前缀，帮助在集成来自多个 MCP 服务器的工具时避免命名冲突。

默认情况下，如果未提供自定义 `McpToolNamePrefixGenerator` bean，starter 使用 `DefaultMcpToolNamePrefixGenerator`，它确保所有 MCP 客户端连接中的唯一工具名称。默认生成器：

* 跟踪所有现有连接和工具名称以确保唯一性
* 通过将非字母数字字符替换为下划线来格式化工具名称（例如，`my-tool` 变为 `my_tool`）
* 当在不同连接中检测到重复的工具名称时，添加计数器前缀（例如，`alt_1_toolName`、`alt_2_toolName`）
* 是线程安全的并保持幂等性 - 相同的（客户端、服务器、工具）组合始终获得相同的唯一名称
* 确保最终名称不超过 64 个字符（必要时从开头截断）

例如：
* 工具 `search` 的第一次出现 → `search`
* 来自不同连接的工具 `search` 的第二次出现 → `alt_1_search`
* 带有特殊字符的工具 `my-special-tool` → `my_special_tool`

您可以通过提供自己的实现来自定义此行为：

```java
@Component
public class CustomToolNamePrefixGenerator implements McpToolNamePrefixGenerator {

    @Override
    public String prefixedToolName(McpConnectionInfo connectionInfo, Tool tool) {
        // Custom logic to generate prefixed tool names

        // Example: Use server name and version as prefix
        String serverName = connectionInfo.initializeResult().serverInfo().name();
        String serverVersion = connectionInfo.initializeResult().serverInfo().version();
        return serverName + "_v" + serverVersion.replace(".", "_") + "_" + tool.name();
    }
}
```

`McpConnectionInfo` record 提供有关 MCP 连接的全面信息：

* `clientCapabilities` - MCP 客户端的能力
* `clientInfo` - 关于 MCP 客户端的信息（名称、标题和版本）
* `initializeResult` - 来自 MCP 服务器的初始化结果，包括服务器信息

#### Built-in Prefix Generators

框架提供几个内置的前缀生成器：

* `DefaultMcpToolNamePrefixGenerator` - 通过跟踪重复项并在需要时添加计数器前缀来确保唯一工具名称（如果未提供自定义 bean，则默认使用）
* `McpToolNamePrefixGenerator.noPrefix()` - 返回没有任何前缀的工具名称（如果多个服务器提供同名工具，可能会导致冲突）

要完全禁用前缀并使用原始工具名称（如果使用多个 MCP 服务器，不推荐），将 no-prefix 生成器注册为 bean：

```java
@Configuration
public class McpConfiguration {

    @Bean
    public McpToolNamePrefixGenerator mcpToolNamePrefixGenerator() {
        return McpToolNamePrefixGenerator.noPrefix();
    }
}
```

前缀生成器通过 Spring 的 `ObjectProvider` 机制自动检测并应用于同步和异步 MCP 工具回调提供程序。
如果未提供自定义生成器 bean，则自动使用 `DefaultMcpToolNamePrefixGenerator`。

**警告：** 当使用 `McpToolNamePrefixGenerator.noPrefix()` 与多个 MCP 服务器时，重复的工具名称将导致 `IllegalStateException`。默认的 `DefaultMcpToolNamePrefixGenerator` 通过自动向重复工具名称添加唯一前缀来防止这种情况。

### Tool Context to MCP Meta Converter

MCP Client Boot Starter 通过 `ToolContextToMcpMetaConverter` 接口支持将 Spring AI 的 [ToolContext](../toolcalls/tool-calls#_tool_context) 转换为 MCP 工具调用元数据的可自定义转换。
此功能允许您将额外的上下文信息（例如用户 ID、密钥令牌）作为元数据与 LLM 生成的调用参数一起传递。

例如，您可以将 MCP `progressToken` 传递到工具上下文中的 [MCP Progress Flow](https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress#progress-flow) 以跟踪长时间运行操作的进度：

```java
ChatModel chatModel = ...

String response = ChatClient.create(chatModel)
        .prompt("Tell me more about the customer with ID 42")
        .toolContext(Map.of("progressToken", "my-progress-token"))
        .call()
        .content();
```

默认情况下，如果未提供自定义转换器 bean，starter 使用 `ToolContextToMcpMetaConverter.defaultConverter()`，它：

* 过滤掉 MCP 交换键（`McpToolUtils.TOOL_CONTEXT_MCP_EXCHANGE_KEY`）
* 过滤掉具有 null 值的条目
* 将所有其他上下文条目作为元数据传递

您可以通过提供自己的实现来自定义此行为：

```java
@Component
public class CustomToolContextToMcpMetaConverter implements ToolContextToMcpMetaConverter {

    @Override
    public Map<String, Object> convert(ToolContext toolContext) {
        if (toolContext == null || toolContext.getContext() == null) {
            return Map.of();
        }

        // Custom logic to convert tool context to MCP metadata
        Map<String, Object> metadata = new HashMap<>();

        // Example: Add custom prefix to all keys
        for (Map.Entry<String, Object> entry : toolContext.getContext().entrySet()) {
            if (entry.getValue() != null) {
                metadata.put("app_" + entry.getKey(), entry.getValue());
            }
        }

        // Example: Add additional metadata
        metadata.put("timestamp", System.currentTimeMillis());
        metadata.put("source", "spring-ai");

        return metadata;
    }
}
```

#### Built-in Converters

框架提供内置转换器：

* `ToolContextToMcpMetaConverter.defaultConverter()` - 过滤掉 MCP 交换键和 null 值（如果未提供自定义 bean，则默认使用）
* `ToolContextToMcpMetaConverter.noOp()` - 返回空映射，有效地禁用上下文到元数据的转换

要完全禁用上下文到元数据的转换：

```java
@Configuration
public class McpConfiguration {

    @Bean
    public ToolContextToMcpMetaConverter toolContextToMcpMetaConverter() {
        return ToolContextToMcpMetaConverter.noOp();
    }
}
```

转换器通过 Spring 的 `ObjectProvider` 机制自动检测并应用于同步和异步 MCP 工具回调。
如果未提供自定义转换器 bean，则自动使用默认转换器。

### Disable the MCP ToolCallback Auto-Configuration

MCP ToolCallback 自动配置默认启用，但可以使用 `spring.ai.mcp.client.toolcallback.enabled=false` 属性禁用。

禁用后，不会从可用的 MCP 工具创建 `ToolCallbackProvider` bean。

## MCP Client Annotations

MCP Client Boot Starter 自动检测并注册带注解的方法以处理各种 MCP 客户端操作：

* *@McpLogging* - 处理来自 MCP 服务器的日志消息通知
* *@McpSampling* - 处理来自 MCP 服务器的 LLM completions 的 sampling 请求
* *@McpElicitation* - 处理用于从用户收集额外信息的 elicitation 请求
* *@McpProgress* - 处理长时间运行操作的进度通知
* *@McpToolListChanged* - 处理服务器工具列表更改时的通知
* *@McpResourceListChanged* - 处理服务器资源列表更改时的通知
* *@McpPromptListChanged* - 处理服务器 prompt 列表更改时的通知

Example usage:

```java
@Component
public class McpClientHandlers {

    @McpLogging(clients = "server1")
    public void handleLoggingMessage(LoggingMessageNotification notification) {
        System.out.println("Received log: " + notification.level() +
                          " - " + notification.data());
    }

    @McpSampling(clients = "server1")
    public CreateMessageResult handleSamplingRequest(CreateMessageRequest request) {
        // Process the request and generate a response
        String response = generateLLMResponse(request);

        return CreateMessageResult.builder()
            .role(Role.ASSISTANT)
            .content(new TextContent(response))
            .model("gpt-4")
            .build();
    }

    @McpProgress(clients = "server1")
    public void handleProgressNotification(ProgressNotification notification) {
        double percentage = notification.progress() * 100;
        System.out.println(String.format("Progress: %.2f%% - %s",
            percentage, notification.message()));
    }

    @McpToolListChanged(clients = "server1")
    public void handleToolListChanged(List<McpSchema.Tool> updatedTools) {
        System.out.println("Tool list updated: " + updatedTools.size() + " tools available");
        // Update local tool registry
        toolRegistry.updateTools(updatedTools);
    }
}
```

注解支持同步和异步实现，可以使用 `clients` 参数为特定客户端配置：

```java
@McpLogging(clients = "server1")
public void handleServer1Logs(LoggingMessageNotification notification) {
    // Handle logs from specific server
    logToFile("server1.log", notification);
}

@McpSampling(clients = "server1")
public Mono<CreateMessageResult> handleAsyncSampling(CreateMessageRequest request) {
    return Mono.fromCallable(() -> {
        String response = generateLLMResponse(request);
        return CreateMessageResult.builder()
            .role(Role.ASSISTANT)
            .content(new TextContent(response))
            .model("gpt-4")
            .build();
    }).subscribeOn(Schedulers.boundedElastic());
}
```

有关所有可用注解及其使用模式的详细信息，请参阅 [MCP Client Annotations](annotations/mcp-annotations-client) 文档。

## Usage Example

将适当的 starter 依赖项添加到项目中，并在 `application.properties` 或 `application.yml` 中配置客户端：

```yaml
spring:
  ai:
    mcp:
      client:
        enabled: true
        name: my-mcp-client
        version: 1.0.0
        request-timeout: 30s
        type: SYNC  # or ASYNC for reactive applications
        sse:
          connections:
            server1:
              url: http://localhost:8080
            server2:
              url: http://otherserver:8081
        streamable-http:
          connections:
            server3:
              url: http://localhost:8083
              endpoint: /mcp
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

MCP 客户端 beans 将自动配置并可用于注入：

```java
@Autowired
private List<McpSyncClient> mcpSyncClients;  // For sync client

// OR

@Autowired
private List<McpAsyncClient> mcpAsyncClients;  // For async client
```

当启用工具回调时（默认行为），所有 MCP 客户端注册的 MCP 工具作为 `ToolCallbackProvider` 实例提供：

```java
@Autowired
private SyncMcpToolCallbackProvider toolCallbackProvider;
ToolCallback[] toolCallbacks = toolCallbackProvider.getToolCallbacks();
```

## Example Applications

- [Brave Web Search Chatbot](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/web-search/brave-chatbot) - 一个使用 Model Context Protocol 与 Web 搜索服务器交互的聊天机器人。
- [Default MCP Client Starter](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/client-starter/starter-default-client) - 使用默认 `spring-ai-starter-mcp-client` MCP Client Boot Starter 的简单示例。
- [WebFlux MCP Client Starter](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/client-starter/starter-webflux-client) - 使用 `spring-ai-starter-mcp-client-webflux` MCP Client Boot Starter 的简单示例。

## Additional Resources

* [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/)
* [Model Context Protocol Specification](https://modelcontextprotocol.github.io/specification/)
* [Spring Boot Auto-configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.developing-auto-configuration)

