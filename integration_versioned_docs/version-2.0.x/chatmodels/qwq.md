---
sidebar_position: 6
---

# QWQ 32B

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入阿里云开源 QWQ 系列模型。

## QWQ 32B

基于 Qwen2.5 模型训练的 QwQ 推理模型，通过强化学习大幅度提升了模型推理能力。模型数学代码等核心指标（AIME 24/25、LiveCodeBench）以及部分通用指标（IFEval、LiveBench等）达到DeepSeek-R1 满血版水平。

## Spring AI Alibaba 接入

1. 引入 `spring-ai-alibaba-starter-dashscope`：

我们可以使用 dashscope api 适配器接入开源 Qwen 系列模型，引入如下依赖

   ```xml
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
   ```

2. 配置 application.yml：

    ```yml
    server:
      port: 10002

    spring:
      application:
        name: spring-ai-alibaba-qwq-chat-client-example

    ai:
      dashscope:
        api-key: ${AI_DASHSCOPE_API_KEY}

        chat:
          options:
          model: qwq-plus
    ```

## 使用 ChatModel

3. 注入 ChatClient (假设类名为 QWQChatClientController)

    ```JAVA
	public QWQChatClientController(ChatModel chatModel) {

		this.chatModel = chatModel;

		// 构造时，可以设置 ChatClient 的参数
		// {@link org.springframework.ai.chat.client.ChatClient};
		this.chatClient = ChatClient.builder(chatModel)
				// 实现 Logger 的 Advisor
				.defaultAdvisors(
						new SimpleLoggerAdvisor()
				)
				// 设置 ChatClient 中 ChatModel 的 Options 参数
				.defaultOptions(
						DashScopeChatOptions.builder()
								.topP(0.7)
								.model("qwq-plus")
				)
				.build();
	}
    ```

4. 编写 Controller 接口：

    ```java
	@GetMapping("/stream/chat")
	public Flux<String> streamChat(HttpServletResponse response) {

		response.setCharacterEncoding("UTF-8");

		return chatClient.prompt(DEFAULT_PROMPT)
				.stream()
				.content();
	}
    ```

至此，已经完成了 QWQ 32B 模型的基本接入。现在您已经可以和 QWQ 32B 模型对话了。

## 获取 QWQ 32B 模型的思考输出

> Spring AI Alibaba 1.0.0-M6.1 版本支持获取 DeepSeek-r1 和 QWQ 32B 模型的思维链。

### 编写 ReasoningContentAdvisor

```java
public class ReasoningContentAdvisor implements BaseAdvisor {

	private static final Logger logger = LoggerFactory.getLogger(ReasoningContentAdvisor.class);

	private final int order;

	public ReasoningContentAdvisor(Integer order) {
		this.order = order != null ? order : 0;
	}

	@NotNull
	@Override
	public AdvisedRequest before(@NotNull AdvisedRequest request) {

		return request;
	}

	@NotNull
	@Override
	public AdvisedResponse after(AdvisedResponse advisedResponse) {

		ChatResponse resp = advisedResponse.response();
		if (Objects.isNull(resp)) {

			return advisedResponse;
		}

		logger.debug(String.valueOf(resp.getResults().get(0).getOutput().getMetadata()));
		String reasoningContent = String.valueOf(resp.getResults().get(0).getOutput().getMetadata().get("reasoningContent"));

		if (StringUtils.hasText(reasoningContent)) {
			List<Generation> thinkGenerations = resp.getResults().stream()
					.map(generation -> {
						AssistantMessage output = generation.getOutput();
						AssistantMessage thinkAssistantMessage = new AssistantMessage(
									String.format("<think>%s</think>", reasoningContent) + output.getText(),
								output.getMetadata(),
								output.getToolCalls(),
								output.getMedia()
						);
						return new Generation(thinkAssistantMessage, generation.getMetadata());
					}).toList();

			ChatResponse thinkChatResp = ChatResponse.builder().from(resp).generations(thinkGenerations).build();
			return AdvisedResponse.from(advisedResponse).response(thinkChatResp).build();

		}

		return advisedResponse;
	}

	@Override
	public int getOrder() {

		return this.order;
	}

}
```

### 注入 ReasoningContentAdvisor

```java
public QWQChatClientController(ChatModel chatModel) {

    this.chatModel = chatModel;

    // ...
            .defaultAdvisors(
                    new MessageChatMemoryAdvisor(new InMemoryChatMemory()),

                    // 整合 QWQ 的思考过程到输出中
                    new ReasoningContentAdvisor(0)
            )
            // ...
}
```

### 请求接口查看输出

```shell
$ curl http://localhost:10002/qwq/chat-client/stream/chat

<think>好的，用户让我</think>
<think>介绍自己，我之前</think>
<think>已经回答过一次了</think>
<think>，现在又问</think>
<think>同样的问题。用户</think>
<think>可能是想再确认一下</think>
<think>我的功能，或者需要</think>
<think>更详细的介绍？</think>
<think>也有可能他们想</think>
<think>测试我的一致性hink>
<think>又全面，同时保持简洁</think>
<think>。首先，回顾之前的回答</think>
<think>，已经涵盖了基本</think>
<think>功能、支持的语言、应用场景</think>
<think>。这次可能需要添加</think>
<think>一些信息，比如</think>
<think>最近的更新或者</think>
<think>更多例子，让用户</think>
<think>觉得有新内容</think>
<think>。不过根据指示</think>
<think>，不能编造新</think>
<think>功能，所以只能</think>
<think>在原有基础上调整</think>
<think>结构或补充细节。</think>
<think>用户可能希望了解我的应用场景</think>
<think>，或者想确认</think>
<think>我的能力是否符合他们的</think>
<think>需求。需要强调</think>
<think>我的多语能力和</think>
<think>具体应用实例，比如编程</think>
<think>、逻辑推理等。</think>
<think>另外，可以加入</think>
<think>一些鼓励用户提问的</think> >
<think>语句，促进进一步互动</think>
<think>。检查是否有需要</think>
<think>避免的内容，比如不</think>
<think>提及未实现的功能。</think>
<think>确保语气友好，使用</think>
<think>表情符号增加亲切</think>
<think>。最后，保持回答自然</think>
<think>流畅，避免重复之前的</think>
<think>结构，但信息</think>
<think>要准确一致。</think>

你好！我是是义千问（Qwen），阿里巴巴集团旗下的超大规模语言模型。我能够帮助你完成各种任务，比如：

- **回答问题**：无论是常识、专业知识，还是复杂问题，我都会尽力为你解答。
- **创作文字**：写故事、公文、邮件、剧本、诗歌等，我都可以尝试。
- **逻辑与编程**：解决数学问题、编写代码、进行逻辑推理。
- **多语言支持**：除了中文，我还支持英文、德语、法语、西班牙语等多种语言。
- **表达观点与互动**：聊日常话题、玩游戏，甚至讨论观点。

我的目标是成为一位全能的AI助手，无论你需要学习、工作还是娱乐上的帮助，我都会用友好且实用的方式回应你。有什么需要我帮忙的吗？😊
```

## 注意事项

QWQ 32B 目前仍有许多限制，在开发时需要注意：

1. 模型调用方式

QWQ 模型目前只支持 Stream 调用。如果使用非 Stream 调用时会出现如下错误：

```
400 - {"code":"InvalidParameter","message":"This model only support stream mode, please enable the stream parameter to access the model."}
```

2. QWQ 模型的其他限制

2.1 不支持功能

    - 工具调用（Function Call）
    - 结构化输出（JSON Mode）
    - 前缀续写（Partial Mode）
    - 上下文缓存（Context Cache）

2.2 不支持的参数

    - temperature
    - top_p
    - presence_penalty
    - frequency_penalty
    - logprobs
    - top_logprobs

设置这些参数都不会生效，即使没有输出错误提示。

3. System Message

为了达到模型的最佳推理效果，不建议设置 System Message。

## 参考文档：

- QWQ 32B 模型文档：https://help.aliyun.com/zh/model-studio/getting-started/models
- 错误码文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code
