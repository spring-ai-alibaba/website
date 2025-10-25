---
title: DashScope
keywords: [Spring AI,通义千问,百炼,DashScope]
description: "Spring AI Alibaba 接入 DashScope 模型"
---

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入阿里云 DashScope 系列模型。在开始学习之前，请确保您已经了解相关概念。

1. [Chat Client](../tutorials/basics/chat-client.md)；
2. [Chat Model](../tutorials/basics/chat-model.md)；
3. [Spring AI Alibaba 快速开始](../get-started.md)；
4. 本章节的代码您可以在 [Spring AI Alibaba Example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-example) 仓库找到。

> 本示例主要演示如何以 ChatModel 形式接入。关于如何使用 ChatClient，请参考 Github 代码仓库示例。

## DashScope 平台

灵积通过灵活、易用的模型 API 服务，让各种模态模型的能力，都能方便的为 AI 开发者所用。通过灵积 API，开发者不仅可以直接集成大模型的强大能力，也可以对模型进行训练微调，实现模型定制化。

## Spring AI Alibaba 接入

1. 引入 `spring-ai-alibaba-starter`：

    ```xml
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <version>3.3.4</version>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter</artifactId>
        <version>1.0.0-M5.1</version>
    </dependency>
    ```

2. 配置 application.yml：

    ```yml
    spring:
      ai:
        dashscope:
          api-key: ${AI_DASHSCOPE_API_KEY}
    ```

3. 注入 ChatModel：(假设类名为 DashScopeChatModelController)

    ```JAVA
    private final ChatModel dashScopeChatModel;

	public DashScopeChatModelController(ChatModel chatModel) {
		this.dashScopeChatModel = chatModel;
	}
    ```
    
4. 编写 Controller 接口：

    ```java
    @GetMapping("/simple/chat")
	public String simpleChat() {

		return dashScopeChatModel.call(new Prompt(DEFAULT_PROMPT)).getResult().getOutput().getContent();
	}

	/**
	 * Stream 流式调用。可以使大模型的输出信息实现打字机效果。
	 * @return Flux<String> types.
	 */
	@GetMapping("/stream/chat")
	public Flux<String> streamChat(HttpServletResponse response) {

		// 避免返回乱码
		response.setCharacterEncoding("UTF-8");

		Flux<ChatResponse> stream = dashScopeChatModel.stream(new Prompt(DEFAULT_PROMPT));
		return stream.map(resp -> resp.getResult().getOutput().getContent());
	}
    ```

至此，已经完成了 DashScope 的基本接入。现在您已经可以和 DashScope 模型对话了。

## 进阶使用

### 动态设置 DashScope Options 

Spring AI Alibaba 的运行时 Options 同 Spring AI。分为 Runtime Options 和 Default Options。在 `application.yml` 中配置的 options 参数为 Default Options。

优先级顺序为：`Runtime Options` > `Default Options`。

既您可以在模型运行时，动态设置模型参数，包括本次请求使用的模型等参数信息。

```java
@GetMapping("/custom/chat")
public String customChat() {

    DashScopeChatOptions customOptions = DashScopeChatOptions.builder()
            .withTopP(0.7)
            .withTopK(50)
            .withTemperature(0.8)
            .withModel("xxx")
            .build();

    return dashScopeChatModel.call(new Prompt(DEFAULT_PROMPT, customOptions)).getResult().getOutput().getContent();
}
```

### 结构化返回

在模型请求中，您可以指定模型的返回格式。使模型返回您需要的数据格式。

目前支持的输出格式为：`TEXT` 和 `JSON_OBJECT`。

您可以通过指定以下 Options 参数实现：

```java
public XXXontroller(ChatModel chatModel) {

    DashScopeResponseFormat responseFormat = new DashScopeResponseFormat();
    responseFormat.setType(DashScopeResponseFormat.Type.JSON_OBJECT);

    this.chatModel = chatModel;
    this.dashScopeChatClient = ChatClient.builder(chatModel)
            .defaultOptions(
                    DashScopeChatOptions.builder()
                            .withTopP(0.7)
                            .withResponseFormat(responseFormat)
                            .build()
            )
            .build();
}
```
