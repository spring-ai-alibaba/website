# Anthropic Claude Chat

使用 Spring AI BOM 管理 `org.springframework.ai:spring-ai-starter-model-anthropic`。Spring AI 2.1 的 `AnthropicChatModel` 基于 Anthropic Java SDK 3.x，支持标准和流式调用。

```properties
spring.ai.model.chat=anthropic
spring.ai.anthropic.api-key=${ANTHROPIC_API_KEY}
spring.ai.anthropic.chat.model=claude-haiku-4-5
spring.ai.anthropic.chat.max-tokens=2048
```

注入 `ChatClient.Builder` 后，按选用的模型注册应用工具或提供图片和 PDF。Anthropic 的服务端工具、提示词缓存和思考选项通过 `AnthropicChatOptions` 配置。多轮回放时应保存完整 `AssistantMessage`，以便传回思考片段及签名。用法见 [Anthropic 模型参考](https://docs.spring.io/spring-ai/reference/api/chat/anthropic-chat.html) 和 [Session Memory](../../chatclient.md#session-memory)。

## 升级已有应用

- 通过 `AnthropicChatModel` 接入的应用继续使用相同 starter。手动构建模型时可使用模型构建器或注入 SDK 客户端。
- 仍在使用旧 `AnthropicApi` DTO 的调用应迁移到模型选项，或使用 Anthropic SDK 对应的类型。
- 如应用定制了 SDK 的 HTTP 请求或响应处理，按 3.x SDK 签名更新；如模型限制采样参数，从应用配置移除对应采样设置。

[Spring AI Anthropic Java SDK 迁移指南](https://docs.spring.io/spring-ai/reference/api/chat/anthropic-migration.html)
