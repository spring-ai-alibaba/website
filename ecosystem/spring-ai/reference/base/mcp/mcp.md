---
sidebar_position: 11
---

# MCP 基础开发

# Model Context Protocol（MCP）概览

## 介绍

Model Context Protocol（MCP）是一种标准化协议，使 AI 模型能够以结构化方式与外部系统交互，例如工具、数据库、API 或文件系统。MCP 定义了一致的通信模式、传输机制和资源访问方式，使模型能够在受控、安全、可扩展的环境中使用外部能力。

Spring AI 通过 MCP Java SDK 提供对 MCP 的全面支持，包括 MCP 客户端（Client）和 MCP 服务器（Server）两端的实现，并在 Spring Boot 中提供简化开发的自动配置与注解编程模型。

---

## MCP Java SDK

Spring AI 的 MCP Java SDK 包含构建 MCP 客户端和服务器所需的所有核心组件，分为三个主要层次：
![mcp-1](/img/blog/base/mcp/mcp-1.png)

### 客户端与服务器层（Client / Server Layer）

- **McpClient**：负责与 MCP 服务器通信，包括协议协商、功能协商、工具调用、资源访问等。
- **McpServer**：负责暴露工具（tools）、资源（resources）、提示（prompts）等功能，并处理来自客户端的请求。

### 会话层（Session Layer）

Session 负责管理客户端与服务器之间的连接与状态。

- 可以是有状态的（stateful）或无状态的（stateless）。
- 同时支持同步（sync）和异步（async）两种模式。
- 客户端对应 **McpClientSession**，服务器对应 **McpServerSession**。

### 传输层（Transport Layer）

传输层负责 JSON-RPC 消息的编码与传输。

SDK 支持多种传输方式，包括：

- **STDIO**
- **SSE（Server-Sent Events）**
- **Streamable HTTP**
- **Stateless Streamable HTTP**

通过这些不同的传输机制，MCP 可以适配命令行工具、Web 服务器、微服务架构等多种运行环境。

---

## MCP 客户端（Client）

MCP 客户端负责连接服务器并发起请求，包括：

- 协商协议版本与服务器能力
- 列出并调用服务器工具（tools）
- 访问服务器资源（resources）
- 使用提示模板（prompts）进行消息生成
- 处理根（roots）、采样（sampling）、进度（progress）和结构化日志

客户端支持多种通信模式：

- 同步调用
- 异步调用
- 多种传输层选择（STDIO、SSE、Streamable-HTTP 等）

![mcp-2](/img/blog/base/mcp/mcp-2.png)

---

## MCP 服务器（Server）

MCP 服务器负责向客户端暴露能力，例如：

- **工具（Tools）**：可触发的函数，模型可调用
- **资源（Resources）**：可通过 URI 访问的内容
- **提示（Prompts）**：带参数化的提示模板
- **通知（Notifications）**：资源变化、日志等事件推送

服务器还负责：

- 管理多个客户端连接（并发会话）
- 执行能力协商（capability negotiation）
- JSON-RPC 消息处理
- 结构化日志与进度事件发送

服务器支持同步与异步实现，并兼容所有 MCP 传输机制。

![mcp-3](/img/blog/base/mcp/mcp-3.png)

---

## Spring AI 与 MCP 的整合

Spring AI 提供 MCP 的 Spring Boot 启动器，极大简化了开发：

### MCP 客户端启动器

- `spring-ai-starter-mcp-client`：支持 STDIO、Servlet-SSE、Streamable HTTP、Stateless Streamable HTTP
- `spring-ai-starter-mcp-client-webflux`：基于 WebFlux 的 SSE 和 Streamable HTTP

启动器提供自动配置，包括会话、传输、客户端实例等。

### MCP 服务端启动器

<table>
<tr>
<th>protocol</th>
<th>Server Type</th>
<th>Dependency</th>
<th>Property</th>
</tr>
<tr>
<td>STDIO</td>
<td><a href="https://docs.spring.io/spring-ai/reference/api/mcp/mcp-stdio-sse-server-boot-starter-docs.html">Standard Input/Output (STDIO)</a></td>
<td>spring-ai-starter-mcp-server</td>
<td>spring.ai.mcp.server.stido=true</td>
</tr>
<tr>
<td rowspan="3">WebMVC</td>
<td>SSE WebMCV</td>
<td rowspan="3">spring-ai-starter-mcp-server-webmvc</td>
<td>spring.ai.mcp.server.protocol=SSE or empty</td>
</tr>
<tr>
<td>Streamable-HTTP WebMVC</td>
<td>spring.ai.mcp.server.protocol=STREAMABLE</td>
</tr>
<tr>
<td>Stateless WebMVC</td>
<td>spring.ai.mcp.server.protocol=STATELESS</td>
</tr>
<tr>
<td rowspan="3">WebFlux</td>
<td>SSE WebFlux</td>
<td rowspan="3">spring-ai-starter-mcp-server-webflux</td>
<td>spring.ai.mcp.server.protocol=SSE or empty</td>
</tr>
<tr>
<td>Streamable-HTTP WebFlux</td>
<td>spring.ai.mcp.server.protocol=STREAMABLE</td>
</tr>
<tr>
<td>Stateless WebFlux</td>
<td>spring.ai.mcp.server.protocol=STATELESS</td>
</tr>
</table>


- STDIO：
- WebMVC：
- WebFlux：

---

## MCP 注解（Annotations）

Spring AI 提供注解来声明 MCP 功能，让开发者使用简单的 Java 类即可实现服务器能力。

**服务器端注解：**

- `@McpTool`：声明一个可被模型调用的工具
- `@McpResource`：声明可通过 URI 访问的资源
- `@McpPrompt`：声明提示模板
- `@McpComplete`：声明基于提示的补全功能

注解方法可注入以下上下文对象：

- `McpSyncServerExchange` / `McpAsyncServerExchange`
- `McpTransportContext`
- `McpMeta`（包含调用的 metadata）

**客户端注解：**

- `@McpLogging`
- `@McpSampling`
- `@McpElicitation`
- `@McpProgress`

注解模块还支持：

- 自动 JSON Schema 生成
- AOT 编译支持
- Spring Boot 自动扫描与注册

---

## 各协议分析

### STDIO：本地进程通信的简单方案

描述：STDIO 协议是 Spring AI MCP Server 最基础的传输实现，它基于标准输入/输出流进行通信，无需网络协议支持。在技术实现上，客户端直接启动并管理服务器进程，通过向服务器标准输入(stdin)写入消息，从标准输出(stdout)读取消息完成交互

优势：

- 简单和安全性：数据传输完全在进程内存中进行，避免了网络传输的安全风险
- 无需网络配置：开发者只需通过命令行启动服务进程即可开始通信
- 低延迟低场景：适合需要快速响应的本地工具调用

劣势：

- 仅支持本地通信：无法跨网络或分布式环境使用
- 并发处理限制：采用同步机制，单线程处理请求，难以应对高并发场景
- 资源管理问题：每次请求都需要重建连接，无法有效复用资源

### SSE：传统 HTTP 流式传输的单向方案

描述：SSE 协议是 Spring AI 早期版本中主流的远程传输方案，基于 HTML5 标准的服务器发送事件技术。在 Spring AI 框架中，SSE 分为两种实现方式：WebMVC 模式（基于 Servlet API）和 WebFlux 模式（基于响应式编程）

特点：服务器向客户端单向推送数据，允许服务器在建立连接后随时发送实时更新，无需客户端反复发起请求

优势：

- 实时推送能力：支持长连接保持，适合需要持续更新的场景
- 实现复杂度低：客户端只需通过浏览器原生支持的 EventSource 对象即可实现连接
- 传统环境集成方便：适合与现有 Spring MVC 项目无缝衔接

#### 

劣势：

- 高并发资源消耗：每个连接需占用约 80KB 内存，万级并发时可能导致服务器资源耗尽
- 连接稳定性差：在弱网环境下中断率高达 15%-30%，且不支持断线自动恢复
- 架构扩展性限制：强制要求服务器维护粘性会话，在负载均衡场景下增加了配置复杂度

### Streamable HTTP：平衡性能与状态的创新方案

描述 Streamable HTTP 协议是 MCP 协议在 2025 年 3 月的重大升级，它取代了原有的 HTTP+SSE 作为默认传输方式。Streamable HTTP 的核心创新在于统一了请求/响应端点，支持按需流式传输和会话管理，同时保留了 HTTP 协议的简洁性

特点：在高并发场景下，TCP 连接数仅为几十条，远低于 SSE 的上千条，显著降低了服务器资源压力。响应时间方面，Streamable HTTP 在 1000 并发用户测试中平均响应时间为 7.5ms，而 SSE 飙升至 1511ms，性能提升近 200 倍

### Stateless Streamable HTTP：无状态设计的极致优化

描述：Stateless Streamable HTTP 是 Streamable HTTP 的无状态变体，它通过移除会话状态管理，进一步优化了资源利用率和扩展性。Stateless 模式的核心理念是将状态管理责任从服务器转移到客户端，每次请求都包含完整的上下文信息

资源效率优势

- 内存消耗降至 5KB/请求以下，且在空闲状态下资源占用趋近于零
- 水平扩展能力强：请求可在服务器集群中任意路由，无需复杂的粘性会话机制
- 网络兼容性好：完全遵循标准 HTTP 语义，能更好地穿透企业防火墙

实现复杂度

- 客户端实现复杂：会话状态完全由客户端管理，增加了客户端实现复杂度
- 复杂交互处理困难：对于需要持续会话的复杂交互，可能导致客户端代码臃肿
- 断线重连要求高：客户端需主动传递所有必要信息，增加了实现难度

### 适用场景总结

<table>
<tr>
<th>场景</th>
<th>推荐协议</th>
<th>推荐理由</th>
</tr>
<tr>
<td>本地开发与调试场景<br/><br/></td>
<td>STDIO</td>
<td>无需网络配置，实现简单，适合快速验证工具逻辑和本地调试。例如，开发一个天气查询工具时，可以通过STDIO协议快速启动服务进程并测试工具功能</td>
</tr>
<tr>
<td>传统Servlet应用的实时通知</td>
<td>WebMVC模式的SSE</td>
<td>与现有Spring MVC项目无缝集成，适合简单的实时通知场景，如聊天室消息推送。但需注意高并发场景下的性能问题</td>
</tr>
<tr>
<td>高性能流式交互场景</td>
<td>WebFlux模式的Streamable HTTP</td>
<td>在高并发场景下性能优势明显，同时支持会话状态管理和断线重连。例如，实现一个AI对话系统，用户发送查询后，系统以流形式返回处理结果</td>
</tr>
<tr>
<td>大规模分布式系统</td>
<td>WebFlux模式的Stateless Streamable HTTP</td>
<td>无状态设计使请求可在集群中自由路由，支持真正的线性扩展。例如，微服务架构中的工具调用服务，每个请求都是独立的</td>
</tr>
</table>



