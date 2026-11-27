---
title: "并行流式输出"
description: "保留分支标识并在汇合点读取完整结果。"
---

# 并行流式输出

## 按运行作用域区分分支

使用 `streamEvents()` 时，读取 `RunEvent.scope().namespace()` 中的分支和节点作用域。并行分支的增量会交错，同一次模型调用的增量可以按 `modelCallId` 归并。采用 `ALL_OF` 时各分支都可以实时输出，汇合点提交合并后的父图状态。

```java
Flux<RunEvent> events = GraphEventStreamingExample.streamParallelBranches(NodeAggregationStrategy.ALL_OF);
```

采用 `ANY_OF` 时，只有选出的分支会交付输出。如果候选缓冲达到数量或字节上限，赢家发布时会有 `TRUNCATED` 事件。调试选择过程时，使用 `withCandidateLifecycle(true)` 查看候选的生命周期事件。

[可运行的 GraphEventStreamingExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/GraphEventStreamingExample.java)

## 使用 GraphFlux 输出节点片段

用 `GraphFlux.of(nodeId, key, flux)` 给每条流指定节点 ID 和输出键。客户端用 `StreamingOutput.node()` 分组展示，汇合节点从状态读取各分支已聚合的 `AssistantMessage`。

```java title="ParallelStreamingExample.java"
public static String parallelStreamingWithNodeIdPreservation() throws GraphStateException {
	var graph = new StateGraph(() -> Map.of("messages", new AppendStrategy()))
			.addNode("left", node_async(state -> Map.of("leftAnswer",
					GraphFlux.of("left", "leftAnswer",
							Flux.just("left", " ready").map(StreamingExample::responseChunk)))))
			.addNode("right", node_async(state -> Map.of("rightAnswer",
					GraphFlux.of("right", "rightAnswer",
							Flux.just("right", " ready").map(StreamingExample::responseChunk)))))
			.addNode("join", node_async(state -> {
				var left = state.value("leftAnswer", AssistantMessage.class).orElseThrow();
				var right = state.value("rightAnswer", AssistantMessage.class).orElseThrow();
				return Map.of("summary", left.getText() + " | " + right.getText());
			}))
			.addEdge(START, "left").addEdge(START, "right")
			.addEdge("left", "join").addEdge("right", "join").addEdge("join", END)
			.compile();

	var executor = Executors.newFixedThreadPool(2);
	try {
		var run = RunnableConfig.builder().addParallelNodeExecutor(START, executor).build();
		var result = graph.stream(Map.of(), run)
				.doOnNext(output -> {
					if (output instanceof StreamingOutput<?> chunk && chunk.chunk() != null) {
						System.out.printf("%s: %s%n", chunk.node(), chunk.chunk());
					}
				})
				.blockLast(Duration.ofSeconds(5));
		return result.state().value("summary", String.class).orElseThrow();
	}
	finally {
		executor.shutdown();
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ParallelStreamingExample.java)

运行 `ParallelStreamingExample`，会看到 `left` 和 `right` 的文本片段，最后输出 `left ready | right ready`。片段交错顺序取决于实际执行顺序。独立输出键让汇合节点能够分别读取结果。

命令行示例通过一次有界的 `blockLast` 等待结果。Web 应用可以直接把同一 Flux 返回给客户端。参见[流式输出](../core/streaming.md)。
