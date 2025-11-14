---
title: MCP
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba MCP协议介绍"
---

## 模型上下文协议(MCP)

模型上下文协议（MCP）是一个标准化协议，使 AI 模型能够以结构化的方式与外部工具和资源交互。 它支持多种传输机制，以在不同环境中提供灵活性。

MCP Java SDK 提供了模型上下文协议的 Java 实现，通过同步和异步通信模式实现与 AI 模型和工具的标准化交互。

`Spring AI MCP` 通过 Spring Boot 集成扩展了 MCP Java SDK，提供了 客户端 和 服务器 启动器。 使用 Spring Initializer 引导具有 MCP 支持的 AI 应用程序。

### MCP Java SDK 架构

提示：本节提供了 MCP Java SDK 架构 的概述。 对于 Spring AI MCP 集成，请参阅 Spring AI MCP 启动器 文档。

Java MCP 实现遵循三层架构：

![MCP.png](../../../../../../../public/img/user/ai/tutorials/basics/MCP.png)

- **客户端/服务器层：** McpClient 处理客户端操作，而 McpServer 管理服务器端协议操作。两者都使用 McpSession 进行通信管理。

- **会话层（McpSession）：** 通过 DefaultMcpSession 实现管理通信模式和状态。

- **传输层（McpTransport）：** 处理 JSON-RPC 消息的序列化和反序列化，支持多种传输实现。

MCP 客户端

---

![MCP-client.png](../../../../../../../public/img/user/ai/tutorials/basics/MCP-client.png)

MCP 客户端是模型上下文协议（MCP）架构中的关键组件，负责建立和管理与 MCP 服务器的连接。它实现了协议的客户端部分，处理：

- 协议版本协商以确保与服务器的兼容性

- 能力协商以确定可用功能

- 消息传输和 JSON-RPC 通信

- 工具发现和执行

- 资源访问和管理

- 提示系统交互

- 可选功能：

    - 根管理

    - 采样支持

- 同步和异步操作

- 传输选项：

    - 基于 Stdio 的传输用于基于进程的通信

    - 基于 Java HttpClient 的 SSE 客户端传输

    - WebFlux SSE 客户端传输用于反应式 HTTP 流

MCP服务器

---
![MCP-server.png](../../../../../../../public/img/user/ai/tutorials/basics/MCP-server.png)

MCP 服务器是模型上下文协议（MCP）架构中的基础组件，为客户端提供工具、资源和功能。它实现了协议的服务器端，负责：

- 服务器端协议操作实现

  - 工具暴露和发现

  - 基于 URI 的资源管理

  - 提示模板提供和处理

  - 与客户端的能力协商

  - 结构化日志和通知

- 并发客户端连接管理

- 同步和异步 API 支持

- 传输实现：

  - 基于 Stdio 的传输用于基于进程的通信

  - 基于 Servlet 的 SSE 服务器传输

  - 基于 WebFlux 的 SSE 服务器传输用于反应式 HTTP 流

  - 基于 WebMVC 的 SSE 服务器传输用于基于 Servlet 的 HTTP 流

有关使用低级 MCP 客户端/服务器 API 的详细实现指南，请参阅 MCP Java SDK 文档。 对于使用 Spring Boot 的简化设置，请使用下面描述的 MCP 启动器。

### Spring AI MCP 集成

Spring AI 通过以下 Spring Boot 启动器提供 MCP 集成：

#### 客户端启动器

- `spring-ai-starter-mcp-client` - 提供 STDIO 和基于 HTTP 的 SSE 支持的核心启动器

- `spring-ai-starter-mcp-client-webflux` - 基于 WebFlux 的 SSE 传输实现

#### 服务器启动器

- `spring-ai-starter-mcp-server` - 具有 STDIO 传输支持的核心服务器

- `spring-ai-starter-mcp-server-webmvc` - 基于 Spring MVC 的 SSE 传输实现

- `spring-ai-starter-mcp-server-webflux` - 基于 WebFlux 的 SSE 传输实现

