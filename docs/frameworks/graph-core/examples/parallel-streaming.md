---
title: "并行流式输出"
description: "保留分支标识并在汇合点读取完整结果。"
---

# 并行流式输出

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
