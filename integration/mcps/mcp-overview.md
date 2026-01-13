# Model Context Protocol (MCP)

> **提示：初次使用 MCP？** 请从我们的 [MCP 入门指南](mcp-client-boot-starter-docs) 开始，快速了解并查看实践示例。

[Model Context Protocol](https://modelcontextprotocol.org/docs/concepts/architecture) (MCP) 是一个标准化协议，使 AI 模型能够以结构化的方式与外部工具和资源交互。
可以将其视为 AI 模型与现实世界之间的桥梁——允许它们通过一致的接口访问数据库、API、文件系统和其他外部服务。
它支持多种传输机制，以在不同环境中提供灵活性。

[MCP Java SDK](https://modelcontextprotocol.io/sdk/java/mcp-overview) 提供了 Model Context Protocol 的 Java 实现，通过同步和异步通信模式实现与 AI 模型和工具的标准化交互。

Spring AI 通过专用的 Boot Starters 和 MCP Java Annotations 全面支持 MCP，使构建能够无缝连接到外部系统的复杂 AI 驱动应用程序变得前所未有的简单。
这意味着 Spring 开发者可以参与 MCP 生态系统的两个方面——构建消费 MCP 服务器的 AI 应用程序，以及创建将基于 Spring 的服务暴露给更广泛 AI 社区的 MCP 服务器。
使用 [Spring Initializer](https://start.spring.io) 引导支持 MCP 的 AI 应用程序。

## MCP Java SDK 架构

> **提示：** 本节概述了 [MCP Java SDK 架构](https://modelcontextprotocol.io/sdk/java/mcp-overview)。
> 有关 Spring AI MCP 集成，请参考 [Spring AI MCP Boot Starters](#spring-ai-mcp-集成) 文档。

Java MCP 实现遵循三层架构，将关注点分离以提高可维护性和灵活性：

.MCP Stack Architecture
![MCP Stack Architecture](/img/integration/mcp/mcp-stack.svg)

### Client/Server Layer (Top)

顶层处理主要应用程序逻辑和协议操作：

* *McpClient* - 管理客户端操作和服务器连接
* *McpServer* - 处理服务器端协议操作和客户端请求
* 两个组件都利用下面的会话层进行通信管理

### Session Layer (Middle)

中间层管理通信模式并维护连接状态：

* *McpSession* - 核心会话管理接口
* *McpClientSession* - 客户端特定的会话实现
* *McpServerSession* - 服务器端特定的会话实现

### Transport Layer (Bottom)

底层处理实际的消息传输和序列化：

* *McpTransport* - 管理 JSON-RPC 消息序列化和反序列化
* 支持多种传输实现（STDIO、HTTP/SSE、Streamable-HTTP 等）
* 为所有更高级别的通信提供基础

| [MCP Client](https://modelcontextprotocol.io/sdk/java/mcp-client) |
| --- |
| MCP Client 是 Model Context Protocol (MCP) 架构中的关键组件，负责建立和管理与 MCP 服务器的连接。它实现协议的客户端，处理：<br/><br/>* 协议版本协商以确保与服务器的兼容性<br/>* 能力协商以确定可用功能<br/>* 消息传输和 JSON-RPC 通信<br/>* 工具发现和执行<br/>* 资源访问和管理<br/>* Prompt 系统交互<br/>* 可选功能：<br/>** Roots 管理<br/>** Sampling 支持<br/>* 同步和异步操作<br/>* 传输选项：<br/>** 基于 Stdio 的传输，用于基于进程的通信<br/>** 基于 Java HttpClient 的 SSE 客户端传输<br/>** WebFlux SSE 客户端传输，用于响应式 HTTP 流式传输<br/><br/>![Java MCP Client Architecture](/img/integration/mcp/java-mcp-client-architecture.jpg) |

| [MCP Server](https://modelcontextprotocol.io/sdk/java/mcp-server) |
| --- |
| MCP Server 是 Model Context Protocol (MCP) 架构中的基础组件，向客户端提供工具、资源和能力。它实现协议的服务器端，负责：<br/><br/>* 服务器端协议操作实现<br/>** 工具暴露和发现<br/>** 基于 URI 的资源管理<br/>** Prompt 模板提供和处理<br/>** 与客户端的能力协商<br/>** 结构化日志记录和通知<br/>* 并发客户端连接管理<br/>* 同步和异步 API 支持<br/>* 传输实现：<br/>** Stdio、Streamable-HTTP、Stateless Streamable-HTTP、SSE<br/><br/>![Java MCP Server Architecture](/img/integration/mcp/java-mcp-server-architecture.jpg) |

有关使用低级 MCP Client/Server API 的详细实现指导，请参考 [MCP Java SDK 文档](https://modelcontextprotocol.io/sdk/java/mcp-overview)。
要使用 Spring Boot 进行简化设置，请使用下面描述的 MCP Boot Starters。

## Spring AI MCP 集成

Spring AI 通过以下 Spring Boot starters 提供 MCP 集成：

### [Client Starters](mcp-client-boot-starter-docs)

* `spring-ai-starter-mcp-client` - 核心 starter，提供 `STDIO`、基于 Servlet 的 `Streamable-HTTP`、`Stateless Streamable-HTTP` 和 `SSE` 支持
* `spring-ai-starter-mcp-client-webflux` - 基于 WebFlux 的 `Streamable-HTTP`、`Stateless Streamable-HTTP` 和 `SSE` 传输实现

### [Server Starters](mcp-server-boot-starter-docs)

#### STDIO

| Server Type | Dependency | Property |
| --- | --- | --- |
| [Standard Input/Output (STDIO)](mcp-stdio-sse-server-boot-starter-docs) | `spring-ai-starter-mcp-server` | `spring.ai.mcp.server.stdio=true` |

#### WebMVC

| Server Type | Dependency | Property |
| --- | --- | --- |
| [SSE WebMVC](mcp-stdio-sse-server-boot-starter-docs#_sse_webmvc_serve) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=SSE` or empty |
| [Streamable-HTTP WebMVC](mcp-streamable-http-server-boot-starter-docs#_streamable_http_webmvc_server) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=STREAMABLE` |
| [Stateless Streamable-HTTP WebMVC](mcp-stateless-server-boot-starter-docs#_stateless_webmvc_server) | `spring-ai-starter-mcp-server-webmvc` | `spring.ai.mcp.server.protocol=STATELESS` |

#### WebMVC (Reactive)

| Server Type | Dependency | Property |
| --- | --- | --- |
| [SSE WebFlux](mcp-stdio-sse-server-boot-starter-docs#_sse_webflux_serve) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=SSE` or empty |
| [Streamable-HTTP WebFlux](mcp-streamable-http-server-boot-starter-docs#_streamable_http_webflux_server) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=STREAMABLE` |
| [Stateless Streamable-HTTP WebFlux](mcp-stateless-server-boot-starter-docs#_stateless_webflux_server) | `spring-ai-starter-mcp-server-webflux` | `spring.ai.mcp.server.protocol=STATELESS` |

## [Spring AI MCP Annotations](annotations/mcp-annotations-overview)

除了程序化的 MCP 客户端和服务器配置外，Spring AI 还通过 [MCP Annotations](annotations/mcp-annotations-overview) 模块为 MCP 服务器和客户端提供基于注解的方法处理。
这种方法使用简洁的声明式编程模型和 Java 注解简化了 MCP 操作的创建和注册。

MCP Annotations 模块使开发者能够：

* 使用简单的注解创建 MCP 工具、资源和 prompts
* 以声明方式处理客户端通知和请求
* 减少样板代码并提高可维护性
* 自动为工具参数生成 JSON schemas
* 访问特殊参数和上下文信息

主要功能包括：

* [Server Annotations](annotations/mcp-annotations-server): `@McpTool`、`@McpResource`、`@McpPrompt`、`@McpComplete`
* [Client Annotations](annotations/mcp-annotations-client): `@McpLogging`、`@McpSampling`、`@McpElicitation`、`@McpProgress`
* [Special Parameters](annotations/mcp-annotations-special-params): `McpSyncServerExchange`、`McpAsyncServerExchange`、`McpTransportContext`、`McpMeta`
* *Automatic Discovery*: 具有可配置包包含/排除的注解扫描
* *Spring Boot Integration*: 与 MCP Boot Starters 无缝集成

## 其他资源

* [MCP Annotations 文档](annotations/mcp-annotations-overview)
* [MCP Client Boot Starters 文档](mcp-client-boot-starter-docs)
* [MCP Server Boot Starters 文档](mcp-server-boot-starter-docs)
* [MCP Utilities 文档](mcp-helpers)
* [Model Context Protocol 规范](https://modelcontextprotocol.github.io/specification/)

