---
title: "流式输出"
description: "用 Reactor Flux 消费节点进度、模型片段和完成状态。"
---

# 流式输出

`CompiledGraph.stream(inputs, config)` 返回 Reactor 的 `Flux<NodeOutput>`。一次订阅驱动一次执行。应用负责在同一订阅上处理数据、错误和终止事件。

## 选择执行入口

| 需要 | 入口 |
| --- | --- |
| 节点输出、模型文本片段、人工暂停 | `stream` |
| 随执行观察检查点快照 | `streamSnapshots`，并配置检查点器 |
| 底层响应和完成结果 | `graphResponseStream` |
| 同步获取最终状态 | `invoke` |

收到 `StreamingOutput` 后，可用 `node()` 关联节点，用 `chunk()` 读取非空文本片段。没有文本的事件仍可以携带状态或生命周期信息。终止时用最终状态读取合并后的数据。人工审批流可用 `InterruptionMetadata` 判断当前需要反馈。

## 本地运行流式节点

示例用两个预置的 Spring AI `ChatResponse` 片段模拟模型。Graph Core 对同一节点的片段做聚合，下游可以在 `messages` 里读取完整的 `AssistantMessage`。

```java title="StreamingExample.java"
public static String runLocalStream() throws GraphStateException {
	var chunks = Flux.just("Spring", " AI").map(StreamingExample::responseChunk);
	var graph = new StateGraph(() -> Map.of("messages", new AppendStrategy()))
			.addNode("answer", AsyncNodeAction.node_async(state -> Map.of("messages", chunks)))
			.addEdge(START, "answer").addEdge("answer", END).compile();

	var end = graph.stream(Map.of())
			.doOnNext(output -> {
				if (output instanceof StreamingOutput<?> token && token.chunk() != null) {
					System.out.printf("%s: %s%n", token.node(), token.chunk());
				}
			})
			.blockLast(Duration.ofSeconds(5));
	var messages = end.state().value("messages", List.class).orElseThrow();
	return ((AssistantMessage) messages.get(messages.size() - 1)).getText();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/StreamingExample.java)

预期结果是 `Final answer: Spring AI`。入口为 `com.alibaba.cloud.ai.examples.documentation.graph.core.StreamingExample`。在命令行中用一次有界的 `blockLast` 等待结果。在响应式服务中，将同一条 Flux 返回给下游，或为订阅注册错误处理。

## 发送业务进度

处理批量任务时，节点可以通过 Flux 发送自定义业务对象。订阅者从 `StreamingOutput.getOriginData()` 读取进度。节点在正常完成时用 `GraphResponse.done(updates)` 提交下游需要的状态。在示例里，两个 `Progress` 事件用于显示进度，`processedCount` 交给汇总节点。

```java title="ProgressStreamingExample.java"
public record Progress(String item, int completed, int total) {
}

public static int streamProgress() throws GraphStateException {
	List<String> files = List.of("report.csv", "summary.csv");
	var graph = new StateGraph()
			.addNode("process", node_async(state -> {
				var progress = Flux.range(0, files.size())
						.map(index -> new Progress(files.get(index), index + 1, files.size()));
				var commit = GraphResponse.<NodeOutput>done(Map.of("processedCount", files.size()));
				return Map.of("progress", Flux.<Object>concat(progress, Flux.just(commit)));
			}))
			.addNode("summarize", node_async(state -> {
				int count = state.value("processedCount", Integer.class).orElseThrow();
				return Map.of("summaryCount", count);
			}))
			.addEdge(START, "process").addEdge("process", "summarize").addEdge("summarize", END)
			.compile();

	var end = graph.stream(Map.of())
			.doOnNext(output -> {
				if (output instanceof StreamingOutput<?> stream && stream.getOriginData() instanceof Progress event) {
					System.out.printf("%s %d/%d %s%n", stream.node(), event.completed(), event.total(), event.item());
				}
			})
			.blockLast(Duration.ofSeconds(5));
	return end.state().value("summaryCount", Integer.class).orElseThrow();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ProgressStreamingExample.java)

运行 `ProgressStreamingExample` 后会收到两条文件进度，最终输出 `Processed: 2`。需要在检查点中保存的业务信息，应通过完成事件写入状态。

接入实际模型见 [Spring AI 流式集成](../examples/llm-streaming-springai.md)。并行输出按节点 ID 区分，见[并行流式输出](../examples/parallel-streaming.md)。客户端断开时可以[取消订阅](../examples/cancellation.md)。
