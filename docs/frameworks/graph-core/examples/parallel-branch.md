---
title: "并行节点定义"
description: "构建分叉与汇合，并配置执行器。"
---

# 并行节点定义

从同一节点添加多条出边以并行执行。各分支需要到达共同的汇合点。并行写同一个键时，为它选择合适的 `KeyStrategy`，或分配独立输出键。

```java title="ParallelBranchExample.java"
public static CompiledGraph createParallelBranchGraph() throws GraphStateException {
	KeyStrategyFactory keyStrategyFactory = () -> {
		HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
		keyStrategyHashMap.put("messages", new AppendStrategy());
		return keyStrategyHashMap;
	};

	// 构建并行 Graph
	StateGraph workflow = new StateGraph(keyStrategyFactory)
			.addNode("A", makeNode("A"))
			.addNode("A1", makeNode("A1"))
			.addNode("A2", makeNode("A2"))
			.addNode("A3", makeNode("A3"))
			.addNode("B", makeNode("B"))
			.addNode("C", makeNode("C"))
			.addEdge("A", "A1")    // A 到 A1
			.addEdge("A", "A2")    // A 到 A2（并行）
			.addEdge("A", "A3")    // A 到 A3（并行）
			.addEdge("A1", "B")    // A1 汇聚到 B
			.addEdge("A2", "B")    // A2 汇聚到 B
			.addEdge("A3", "B")    // A3 汇聚到 B
			.addEdge("B", "C")
			.addEdge(START, "A")
			.addEdge("C", END);

	return workflow.compile();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ParallelBranchExample.java)

## 控制执行器和聚合

```java title="ParallelBranchExample.java"
public static void executeParallelGraph(CompiledGraph compiledGraph) {
	var executor = Executors.newFixedThreadPool(3);
	try {
		var run = RunnableConfig.builder().addParallelNodeExecutor("A", executor).build();
		var result = compiledGraph.stream(Map.of(), run).blockLast(Duration.ofSeconds(5));
		System.out.println("Messages: " + result.state().value("messages").orElseThrow());
	}
	finally {
		executor.shutdown();
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ParallelBranchExample.java)

运行 `ParallelBranchExample`，主示例输出 `Messages: [A, A1, A2, A3, B, C]`。`addParallelNodeExecutor("A", executor)` 以分叉节点为配置键，应用负责关闭自建执行器。默认 `ALL_OF` 等待全部分支。`ANY_OF` 适用于只需首个成功结果的场景，外部副作用仍需由业务管理。

参见[并行流式输出](parallel-streaming.md)。显式汇合点、动态派发和任务级恢复见[运行时新能力](runtime-preview.md#并行任务检查点)。
