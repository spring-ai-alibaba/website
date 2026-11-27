---
title: "子图作为 CompiledGraph"
description: "在父图中复用已编译的子图并观察嵌套执行。"
---

# 子图作为 CompiledGraph

先定义并编译子图，再调用 `parent.addNode("subgraph", compiledChild)`。示例让父图写入 `input`，子图处理后写入 `output`，父图的 `finalize` 读取该输出。

```java title="SubgraphAsCompiledGraphExample.java"
public static CompiledGraph useInParentGraph(CompiledGraph compiledSubGraph) throws GraphStateException {
	KeyStrategyFactory parentKeyFactory = () -> {
		HashMap<String, KeyStrategy> strategies = new HashMap<>();
		strategies.put("input", new ReplaceStrategy());
		strategies.put("output", new ReplaceStrategy());
		return strategies;
	};

	StateGraph parentGraph = new StateGraph(parentKeyFactory)
			.addNode("prepare", node_async(state ->
					Map.of("input", "hello world")))
			.addNode("subgraph", compiledSubGraph)
			.addNode("finalize", node_async(state -> {
				String result = state.value("output", String.class).orElseThrow();
				return Map.of("final", "Done: " + result);
			}))
			.addEdge(START, "prepare")
			.addEdge("prepare", "subgraph")
			.addEdge("subgraph", "finalize")
			.addEdge("finalize", END);

	return parentGraph.compile();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphAsCompiledGraphExample.java)

运行 `SubgraphAsCompiledGraphExample`，预期输出 `Done: Processed: HELLO WORLD`。示例也复用同一个 `CompiledGraph` 实例作为多个节点，为每个位置分配自己的节点 ID。

## 映射状态并恢复子图

父图和子图使用不同的状态键时，可以在挂载时提供输入和输出映射。下例把父图的 `input` 传为子图的 `topic`，再把子图的 `draft` 映射为父图的 `answer`。输出映射也会作用于子图已提交的单步写入，因此要能接收缺少 `draft` 的部分更新。

```java
parent.addNode("compose", child,
    state -> Map.of("topic", state.value("input", String.class).orElseThrow()),
    write -> write.get("draft") instanceof AssistantMessage draft
        ? Map.of("answer", draft.getText()) : Map.of());
```

要跨执行恢复，为父图和子图配置检查点器。用父图的 `threadId` 续跑。示例在子图的 `draft` 节点前暂停，接收根 `RUN_PAUSED` 后用空输入和 `run.withResume()` 继续执行。如果是需要用户反馈的暂停，则使用对应的中断 ID 提交反馈。

```java
var options = StreamOptions.defaults().withNested(true);
var run = RunnableConfig.builder().threadId("draft-42").build();
var paused = graph.streamEvents(Map.of("input", "Spring AI"), run, options)
    .blockLast(Duration.ofSeconds(5));
if (paused != null && paused.type() == RunEvent.Type.RUN_PAUSED) {
    var completed = graph.streamEvents(Map.of(), run.withResume(), options)
        .blockLast(Duration.ofSeconds(5));
}
```

[可运行的 GraphEventStreamingExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/GraphEventStreamingExample.java) · [按值删除和子图状态边界](runtime-preview.md#按值删除和子图状态边界) · [通过 NodeAction 动态调用子图](subgraph-as-nodeaction.md)
