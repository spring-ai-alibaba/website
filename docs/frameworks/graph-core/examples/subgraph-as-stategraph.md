---
title: "子图作为 StateGraph"
description: "把子图定义编译进父图，共用执行状态和配置。"
---

# 子图作为 StateGraph

用 `addNode(id, childStateGraph)` 组装图定义。编译父图时会展开子图步骤，并为展开的节点生成带子图前缀的 ID。这个形式适合将多步流程拆成多个可维护的定义。

```java title="SubgraphAsStateGraphExample.java"
public static StateGraph createParentGraphWithDirectEmbedding() throws GraphStateException {
	KeyStrategyFactory keyFactory = () -> {
		HashMap<String, KeyStrategy> strategies = new HashMap<>();
		strategies.put("input", new ReplaceStrategy());
		strategies.put("output", new ReplaceStrategy());
		strategies.put("result", new ReplaceStrategy());
		return strategies;
	};

	StateGraph subGraph = createProcessingSubGraph();

	return new StateGraph(keyFactory)
			.addNode("prepare", node_async(state -> {
				return Map.of("input", "hello world");
			}))
			// 将子图作为节点添加
			.addNode("process", subGraph)
			.addNode("finalize", node_async(state -> {
				String output = state.value("output", String.class).orElseThrow();
				return Map.of("result", "Final: " + output);
			}))
			.addEdge(START, "prepare")
			.addEdge("prepare", "process")
			.addEdge("process", "finalize")
			.addEdge("finalize", END);
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphAsStateGraphExample.java)

运行 `SubgraphAsStateGraphExample`，直接嵌入路径输出 `Final: HELLO WORLD`。父图的 `prepare` 写入子图需要的 `input`，父图和展开后的步骤使用同一执行状态与编译配置。需要让子图保有独立的编译配置时，参见[子图作为 CompiledGraph](subgraph-as-compiledgraph.md)。
