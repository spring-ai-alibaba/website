# Docker Model Runner Chat

在 [Spring AI BOM](/docs/versions) 下添加 `org.springframework.ai:spring-ai-starter-model-openai`，使用 Chat Completions API。模型名按服务提供方的当前目录或部署标签设置。

```properties
spring.ai.model.chat=openai
spring.ai.openai.chat.api=chat-completions
spring.ai.openai.chat.api-key=test
spring.ai.openai.chat.base-url=http://localhost:12434/engines/v1
spring.ai.openai.chat.model=ai/gemma3:4B-F16
spring.ai.model.embedding=none
```

注入 `ChatClient.Builder`，然后构造客户端：

```java
String answer = chatClientBuilder.build().prompt()
        .user("给出三个便于执行的库存检查步骤。")
        .call()
        .content();
```

启用 Model Runner 的 TCP 端点并拉取相同标签的模型。使用预先启动的远端服务时，把基础地址换成其实际的 OpenAI 兼容 API 根地址。 如需在同一应用配置其他提供方的嵌入模型，使用其独立连接配置和对应的 `spring.ai.model.embedding` 选择器。

[Spring AI Docker Model Runner Chat](https://docs.spring.io/spring-ai/reference/api/chat/dmr-chat.html) · [提供方文档](https://docs.docker.com/ai/model-runner/)
