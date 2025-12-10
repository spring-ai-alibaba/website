---
sidebar_position: 1
---

# DashScope

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入阿里云 DashScope 系列模型。在开始学习之前，请确保您已经了解相关概念。

## DashScope 平台

灵积通过灵活、易用的模型 API 服务，让各种模态模型的能力，都能方便的为 AI 开发者所用。通过灵积 API，开发者不仅可以直接集成大模型的强大能力，也可以对模型进行训练微调，实现模型定制化。

## Spring AI Alibaba 接入

1. 引入 `spring-ai-alibaba-starter-dashscope`：

   ```xml
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
   ```

2. 配置 application.yml：

    ```yml
    spring:
      ai:
        dashscope:
          api-key: ${AI_DASHSCOPE_API_KEY}
    ```

## 使用 ChatModel

1. 注入 ChatModel：(假设类名为 DashScopeChatModelController)

    ```JAVA
    private final ChatModel dashScopeChatModel;

	public DashScopeChatModelController(ChatModel chatModel) {
		this.dashScopeChatModel = chatModel;
	}
    ```

2. 编写 Controller 接口：

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

## 动态设置 DashScope Options

Spring AI Alibaba 的运行时 Options 同 Spring AI。分为 Runtime Options 和 Default Options。在 `application.yml` 中配置的 options 参数为 Default Options。

优先级顺序为：`Runtime Options` > `Default Options`。

即您可以在模型运行时，动态设置模型参数，包括本次请求使用的模型等参数信息。

```java
@GetMapping("/custom/chat")
public String customChat() {

    // Note: model must be set when use options build.
    DashScopeChatOptions customOptions = DashScopeChatOptions.builder()
            .withTopP(0.7)
            .withTopK(50)
            .withTemperature(0.8)
            .withModel("xxx")
            .build();

    return dashScopeChatModel.call(new Prompt(DEFAULT_PROMPT, customOptions)).getResult().getOutput().getContent();
}
```
