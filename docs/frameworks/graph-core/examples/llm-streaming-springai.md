---
title: "Spring AI 模型流式集成"
description: "让图消费 ChatClient 的 ChatResponse 流。"
---

# Spring AI 模型流式集成

节点调用 `stream().chatResponse()` 并返回 `Flux<ChatResponse>`。图运行时聚合模型消息，后续节点可以从 `messages` 读取完整结果。把 `messages` 配为 `AppendStrategy` 可保留历史消息。

```java title="LlmStreamingSpringAiExample.java"
public static class StreamingAgentNode implements NodeAction {

	private final ChatClient chatClient;

	public StreamingAgentNode(ChatClient.Builder builder) {
		this.chatClient = builder.build();
	}

	@Override
	public Map<String, Object> apply(OverAllState state) {
		String userMessage = (String) state.value("query").orElse("Hello");

		// 使用流式输出
		var responses = chatClient.prompt()
				.user(userMessage)
				.stream()
				.chatResponse();

		return Map.of("messages", responses);
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/LlmStreamingSpringAiExample.java)

在应用中为节点提供已配置的 `ChatClient.Builder`。输入键为 `query`，聚合结果写入 `messages`。应用通过 `graph.stream` 消费文本片段和状态事件。`useStreamingChatClient(ChatClient)` 则展示直接消费 Spring AI 文本流的用法。

运行 `LlmStreamingSpringAiExample` 默认使用本地片段。设置 `AI_DASHSCOPE_API_KEY` 并追加 `--live` 时，示例通过 `streamGraph` 运行真实模型。

参见[本地流式示例](../core/streaming.md#本地运行流式节点)。
