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

子图要跨执行暂停和恢复时，为父图和子图配置检查点器。用父图的 `threadId` 恢复整条流程。需要指定输入键和回写键时，参见[按值删除和子图状态边界](runtime-preview.md#按值删除和子图状态边界)。键名不同或需要转换数据时，参见[通过 NodeAction 调用子图](subgraph-as-nodeaction.md)。
