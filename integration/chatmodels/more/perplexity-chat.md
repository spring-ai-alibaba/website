# Perplexity Chat

在 [Spring AI BOM](/docs/versions) 下添加 `org.springframework.ai:spring-ai-starter-model-openai`，使用 Chat Completions API。模型名按服务提供方的当前目录或部署标签设置。

```properties
spring.ai.model.chat=openai
spring.ai.openai.chat.api=chat-completions
spring.ai.openai.chat.api-key=${PERPLEXITY_API_KEY}
spring.ai.openai.chat.base-url=https://api.perplexity.ai
spring.ai.openai.chat.model=${PERPLEXITY_CHAT_MODEL}
spring.ai.model.embedding=none
```

注入 `ChatClient.Builder`，然后构造客户端：

```java
String answer = chatClientBuilder.build().prompt()
        .user("给出三个便于执行的库存检查步骤。")
        .call()
        .content();
```

此接入面向文本搜索问答和流式输出。可从 `ChatResponse` 读取 Spring AI 所映射的响应元数据。 如需在同一应用配置其他提供方的嵌入模型，使用其独立连接配置和对应的 `spring.ai.model.embedding` 选择器。

[Spring AI Perplexity Chat](https://docs.spring.io/spring-ai/reference/api/chat/perplexity-chat.html) · [提供方文档](https://docs.perplexity.ai/guides/model-cards)
