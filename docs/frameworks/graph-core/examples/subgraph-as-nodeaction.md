---
title: "子图作为节点操作"
description: "在 NodeAction 中显式映射父图和子图的状态。"
---

# 子图作为节点操作

父图使用 `data` 和 `processed`，子图使用 `input` 和 `result`。把转换放在包装节点中，只把父图契约需要的结果回写。这样也能避免把整个子图快照交给父图的追加策略。

```java title="SubgraphAsNodeActionExample.java"
public static class SubGraphNode implements NodeAction {

	private final CompiledGraph subGraph;

	public SubGraphNode(CompiledGraph subGraph) {
		this.subGraph = subGraph;
	}

	@Override
	public Map<String, Object> apply(OverAllState state) {
		// 从父状态提取子图需要的数据
		String input = (String) state.value("data").orElse("");

		// 执行子图
		Map<String, Object> subInput = Map.of("input", input);
		OverAllState subResult = subGraph.invoke(subInput).orElseThrow();

		// 返回结果给父图
		String result = subResult.value("result", String.class).orElseThrow();
		return Map.of("processed", result);
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphAsNodeActionExample.java)

运行 `SubgraphAsNodeActionExample`，预期输出 `Final:SubStep1:Input Data->SubStep2`。包装节点调用的是子图的同步 `invoke`，适合把调用视为一个完整步骤。需要让父图感知每个子节点的流或让引擎管理嵌套暂停时，使用[原生 CompiledGraph 嵌入](subgraph-as-compiledgraph.md)。
