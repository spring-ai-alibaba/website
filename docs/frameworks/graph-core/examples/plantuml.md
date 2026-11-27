---
title: "PlantUML 和 Mermaid 图表"
description: "从图定义生成可嵌入文档的流程图。"
---

# PlantUML 和 Mermaid 图表

调用 `getGraph(type, title)` 可生成流程图。它从图的定义读取节点和边，可以在评审编排结构时使用。

```java title="PlantUmlExample.java"
public static void generatePlantUmlFromGraph() throws GraphStateException {
	KeyStrategyFactory keyStrategyFactory = () -> {
		HashMap<String, KeyStrategy> strategies = new HashMap<>();
		strategies.put("result", new ReplaceStrategy());
		return strategies;
	};

	// 构建一个简单的 Graph
	StateGraph graph = new StateGraph(keyStrategyFactory)
			.addNode("step1", node_async(state -> Map.of("result", "Step 1")))
			.addNode("step2", node_async(state -> Map.of("result", "Step 2")))
			.addNode("step3", node_async(state -> Map.of("result", "Step 3")))
			.addEdge(START, "step1")
			.addEdge("step1", "step2")
			.addEdge("step2", "step3")
			.addEdge("step3", END);

	CompiledGraph compiledGraph = graph.compile();

	// 生成 PlantUML 表示
	GraphRepresentation representation = compiledGraph.getGraph(
			GraphRepresentation.Type.PLANTUML,
			"My Workflow"
	);

	// 显示 PlantUML 代码
	System.out.println("PlantUML representation:");
	System.out.println(representation.content());
	System.out.println("Mermaid representation:");
	System.out.println(compiledGraph.getGraph(GraphRepresentation.Type.MERMAID, "My Workflow").content());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/PlantUmlExample.java)

运行 `PlantUmlExample`，把 `@startuml` 到 `@enduml` 的内容交给 PlantUML，或将 Mermaid 输出放入支持它的 Markdown 渲染器。调试时可以把图和[实际执行流](../core/streaming.md)对照，查看声明的路径与本次选择的分支。
