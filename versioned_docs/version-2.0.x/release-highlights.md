---
title: 2.0.x 新特性与迁移
---

# 升级到 2.0.3.0

本版本使用 Spring AI 2.0.3、Spring Boot 4.1.3 和 Spring Framework 7.0.11。先更新 Boot 与 [三个 BOM](versions.md)，再验证项目自定义的模型、工具和连接配置。

## Agent 工具与流式输出

- **请求级工具选择。** ReactAgent 根据 ChatClient Advisor 处理完成后的请求调度工具。显式空列表禁用该次请求的工具，同名时 Agent 注册的工具优先。允许的工具名随 Graph checkpoint 保存，恢复后继续生效。
- **每轮调用预算。** 在 `ReactAgent.builder()` 上通过 `.toolCallLimits(40, 150)` 控制单工具调用次数和总次数，串行与并行执行共用计数。任一参数可设为 `-1` 以关闭对应限制。
- **推理和用量。** DeepSeek 的消息类型与 reasoning 在流式聚合及人机协同后的上下文中保留。最终 Graph 流事件携带最近一次有效用量。DashScope HTTP 与 SDK 累计多轮工具对话的用量。
- **工具解析。** Spring AI 默认按请求回调解析工具。确实依赖应用级共享解析时，可设置 `spring.ai.tools.resolution.fallback.enabled=true`。请核对实际暴露给模型的工具列表。

[Agent 工具指南](frameworks/agent-framework/tutorials/tools.md) · [Alibaba 发布说明](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.0.3.0)

## 模型与 RAG 迁移

- OpenAI 可通过 `OpenAiChatOptions.builder().strict(true)` 启用严格工具 schema；兼容端点需要关闭历史推理回放时可设 `.replayReasoningContent(false)`。Nacos 的 `model.json` 支持相同选项。
- 将 `Media.Builder.data(Object)` 改为具体的 `byte[]`、`String`、`URI`、`URL` 或 `Resource` 重载。Anthropic 和 Bedrock Converse 的输入用量已计入缓存读写 token，应用应移除重复累加。
- Spring AI 的 `TikaDocumentReader` 默认最多抽取 1,000 万字符。批量导入时可传入显式限制并处理超限失败。Extensions 的邮件读取在附件超限时保留邮件正文和其他附件。
- `SemanticCacheAdvisor` 需要 `SemanticCacheScopeResolver`。按可信的租户或用户标识隔离缓存，自定义缓存需实现带上下文的读写接口和带 TTL 的写入接口。

[Spring AI 2.0 迁移指南](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-0.html) · [Extensions 发布说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.0.3.0)

## Nacos、MCP 与 A2A

Nacos Config 和 A2A 使用 Nacos Client 3.3.0，MSE 客户端扩展为 1.0.7。MCP Java SDK 2.1.0 支持通过 SSE 和 Streamable HTTP 调用工具。升级有历史 A2A 数据的 Nacos 3.1.x 或 3.2.x 服务端时，按 Nacos 指南迁移数据。

[Nacos MCP 网关](/integration/2.0.x/mcps/nacos/nacos-gateway-mcp) · [Nacos 服务端升级指南](https://nacos.io/en/docs/latest/manual/admin/upgrading/) · [Spring AI 2.0.3 发布说明](https://github.com/spring-projects/spring-ai/releases/tag/v2.0.3)
