---
title: "流式输出"
description: "用 Reactor 消费类型化运行事件、模型增量、节点进度及子图状态。"
---

# 流式输出

Graph Core 提供类型化运行事件和节点输出两种流式入口。两种入口每次订阅都执行一次图。如果同一次运行需要同时消费多种事件，可使用 `eventRun`。

## 选择执行入口

| 需要 | 入口 |
| --- | --- |
| 按事件类型和调用路径消费模型、进度、状态及子图事件 | `streamEvents` |
| 在同一次执行中读取多个流式视图和最终结果 | `eventRun` |
| 节点输出、模型文本片段、人工暂停 | `stream` |
| 随执行观察检查点快照 | `streamSnapshots`，并配置检查点器 |
| 底层响应和完成结果 | `graphResponseStream` |
| 同步获取最终状态 | `invoke` |

## 类型化运行事件

`CompiledGraph.streamEvents(inputs, config, options)` 返回 `Flux<RunEvent>`。这里的事件 API 需要使用包含 `streamEvents` 的 2.1.x 构建，示例可用当前框架源码运行。

```java
var options = StreamOptions.defaults().withNested(true);
Flux<RunEvent> events = graph.streamEvents(Map.of("input", "Spring AI"), config, options);
```

每条事件有 `type()`、`data()`、`runId()`、`sequence()` 和 `scope()`。在同一运行内，`sequence()` 按交付顺序递增。`scope().namespace()` 描述从根图到当前节点、工具或子图的调用路径。按路径段的 `id()` 区分同名分支和重复调用，按 `ModelDelta.modelCallId()` 归并一次模型调用的增量。

| 通道 | 常用事件 |
| --- | --- |
| `LIFECYCLE` | 图和节点的开始、完成、失败或暂停 |
| `MESSAGES` | `MODEL_DELTA` 和 `MODEL_COMPLETED`，分别携带内容增量和最终模型消息及用量 |
| `TOOLS` | 工具实际执行时的开始、输出增量和终态 |
| `CUSTOM` | 节点或工具发送的业务进度 |
| `UPDATES` / `VALUES` | 已提交的有序写入和完整状态快照 |
| `CHECKPOINTS` | 配置检查点器后发出的 `CHECKPOINT_SAVED` |

`StreamOptions.defaults()` 选择根图的生命周期和模型事件。用 `withNested(true)` 接收子图和子 Agent 事件。按需启用推理内容、模型工具参数以及全量状态快照。根终态始终可读。用 `event.scope().root()` 区分根终态与子图完成事件，根 `RUN_COMPLETED` 的负载是 `RunEvent.State`，`RUN_PAUSED` 提供中断信息，`RUN_FAILED` 提供执行错误。订阅建立或事件交付本身发生错误时，通过 Reactor 的 `onError` 处理。

`eventRun(inputs, config, options)` 返回一个显式启动的 `RunStream`。在 `start()` 前注册需要的 `messages()`、`toolCalls()`、`values()` 或 `subgraphs()`。各视图共享同一次执行，`output()` 可重复读取根终态。子图视图可以读取有限窗口内的近期事件，跟不上的订阅会收到错误。关闭运行句柄会取消执行。

用同一 `threadId` 和检查点恢复图时，恢复会生成新的 `runId`。SSE 事件序号用于标识当前运行内的交付顺序，检查点用来恢复执行进度。

[可运行的 GraphEventStreamingExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/GraphEventStreamingExample.java)

## 本地运行流式节点

`stream(inputs, config)` 返回 `Flux<NodeOutput>`。使用该入口时，通过 `StreamingOutput.node()` 识别节点，通过 `chunk()` 读取文本片段，通过最终状态读取聚合结果。人工审批流可以用 `InterruptionMetadata` 表示需要反馈的节点。

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

类型化事件流中，通过 `RunnableConfig.streamWriter()` 发送命名进度，订阅选项需包含 `CUSTOM`。例如，在节点内调用 `config.streamWriter().tryEmit("progress", "Writing the draft")`，客户端从 `RunEvent.Custom` 读取名称和值。检查 `tryEmit` 的返回值可判断写入是否成功，包括通道未启用、缓冲区满和作用域已关闭的情况。需要持久化的数据随节点返回值提交。

使用 `stream()` 时，节点也可以通过 Flux 发送自定义对象，订阅者从 `StreamingOutput.getOriginData()` 读取。示例里，两个 `Progress` 对象用于显示进度，节点用 `GraphResponse.done(updates)` 提交汇总节点需要的 `processedCount`。

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
