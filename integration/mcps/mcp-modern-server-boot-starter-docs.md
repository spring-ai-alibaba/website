# Modern MCP 2026-07-28

Spring AI 2.1 使用 MCP Java SDK 2.2.0 系列支持 MCP 2026-07-28。客户端通过 `server/discover` 获取能力，每个请求携带协议版本和客户端能力，服务端无需维护初始化握手或会话。HTTP 请求使用 POST，响应可以是 JSON 或用于进度与结果的短时 SSE 流。

## 启动服务端

在 [版本对照](/docs/versions) 对应的 Spring AI BOM 下，WebMVC 使用 `org.springframework.ai:spring-ai-starter-mcp-server-webmvc`，WebFlux 使用 `org.springframework.ai:spring-ai-starter-mcp-server-webflux`：

```yaml
spring:
  ai:
    mcp:
      server:
        protocol: MODERN
        type: SYNC
        modern:
          mcp-endpoint: /mcp
```

现有 `@McpTool`、`@McpResource`、`@McpPrompt`、`@McpComplete` 和 `ToolCallback` 可用于 Modern 服务端。声明 `McpModernRequestContext` 可读取请求元数据。异步服务将 `type` 改为 `ASYNC`，处理器可返回 `Mono`。STDIO 使用 `spring.ai.mcp.server.stdio=true` 和通用的 `spring-ai-starter-mcp-server`。

## 客户端同时连接新旧服务

加入 `org.springframework.ai:spring-ai-starter-mcp-client` 或对应的 WebFlux starter。按连接声明协议：

```yaml
spring:
  ai:
    mcp:
      client:
        type: SYNC
        streamable-http:
          connections:
            legacy-inventory:
              url: http://localhost:8081
              endpoint: /mcp
            modern-catalog:
              url: http://localhost:8082
              endpoint: /mcp
              protocol: MODERN
```

Modern 连接会把 `endpoint` 追加到 `url`。若 `url` 已包含 `/mcp`，需调整配置以避免请求到 `/mcp/mcp`。同步和异步模式分别由自动配置的同步、异步 Tool Callback Provider 聚合两种协议的工具。升级时分别检查两类连接的工具列表和实际调用。

## 迁移现有处理器

- 服务器发起的 elicitation、sampling 和 roots 请求使用多轮往返。返回 `InputRequiredResult`，客户端收集输入后携带 `inputResponses` 和服务端签发的 `requestState` 重试。多副本部署时共享用于密封状态的密钥。
- 进度通过同步或异步 notifier 推送。列表变化和资源更新通过 `subscriptions/listen` 接收。
- HTTP 网关应保留 `Mcp-Method`、`MCP-Protocol-Version` 及适用方法的 `Mcp-Name`，并按原协议处理请求和响应。

接入注册、发现与路由参见 [Nacos MCP](nacos/nacos-mcp.md)。属性、能力协商与迁移示例见 [Spring AI Modern MCP 服务端](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-modern-server-boot-starter-docs.html) 和 [客户端参考](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)。
