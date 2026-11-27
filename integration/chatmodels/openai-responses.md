# OpenAI Responses API

Spring AI 2.1 在 `spring-ai-starter-model-openai` 中提供 `OpenAiResponsesChatModel`。Responses 支持服务端工具、推理内容及有序消息片段，适合需要跨工具调用保留模型输出的场景。两个端点的能力对照见 [Chat Models 对比](comparison.md)。

## 配置与调用

使用 [版本对照](/docs/versions) 中的 BOM 管理 `org.springframework.ai:spring-ai-starter-model-openai`：

```properties
spring.ai.model.chat=openai
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.api=responses
spring.ai.openai.responses.model=gpt-5-mini
```

`spring.ai.openai.chat.api` 默认为 `chat-completions`。设为 `responses` 后，自动配置从两个 OpenAI 聊天实现中选择 Responses。若同一应用同时声明两个 `ChatModel`，请指定主 Bean 或分别构造对应的 `ChatClient`。

```java
String answer = chatClient.prompt()
        .user("给出核对发票的三项检查要求。")
        .call()
        .content();
```

## 工具调用与继续对话

通过 `ChatClient.tools(...)` 注册应用工具，再由 `ToolCallingAdvisor` 执行。Web 搜索、文件搜索和图像生成等服务端工具由 OpenAI 执行，按模型支持情况通过 Responses 专用选项启用。参见 [Responses API 的工具与选项](https://docs.spring.io/spring-ai/reference/api/chat/openai-responses-chat.html)。

需要把模型响应发回同一个端点时，保留 `AssistantMessage` 及其 `getParts()`，以保存文本、工具调用、推理和提供方片段的顺序。只读 `ChatClient.content()` 可用于展示。跨请求需要持久化上下文时，使用支持 Message Parts 的 [Session Memory](../chatclient.md#session-memory) 存储。Spring AI 的 Responses 适配器使用无状态模式，由应用重新发送上下文。供应商专用片段需由支持该片段的端点解释。
