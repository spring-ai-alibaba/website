# MiniMax Chat

Spring AI 2.1 通过 MiniMax 的 Anthropic 兼容端点接入聊天模型。使用 Spring AI BOM 和 `org.springframework.ai:spring-ai-starter-model-anthropic`：

```properties
spring.ai.model.chat=anthropic
spring.ai.anthropic.api-key=${MINIMAX_API_KEY}
spring.ai.anthropic.base-url=https://api.minimax.io/anthropic
spring.ai.anthropic.chat.model=MiniMax-M3
```

构造 [ChatClient](../../chatclient.md) 后按常规方式使用。工具、流式输出和多模态需按当前 MiniMax 模型及 API 的支持范围启用。参见 [Spring AI MiniMax 接入](https://docs.spring.io/spring-ai/reference/api/chat/minimax-chat.html) 和 [MiniMax Anthropic 兼容 API](https://platform.minimax.io/docs/api-reference/text-anthropic-api)。
