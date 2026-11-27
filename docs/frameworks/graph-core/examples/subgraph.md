---
title: "子图"
description: "选择展开、原生嵌入或状态适配的组合方式。"
---

# 子图

| 需要 | 组合方式 | 状态与生命周期 |
| --- | --- | --- |
| 把一组步骤纳入父图 | [嵌入 StateGraph](subgraph-as-stategraph.md) | 编译时展开，使用父图状态和执行配置。 |
| 复用可独立运行的图 | [嵌入 CompiledGraph](subgraph-as-compiledgraph.md) | 作为独立子图运行，父图可消费子图输出。 |
| 转换字段名、构造输入或归一化输出 | [通过 NodeAction 调用子图](subgraph-as-nodeaction.md) | 父节点显式控制输入映射、调用和回写。 |

## 嵌入已编译的子图

```java title="SubgraphExample.java"
public static void addCompiledSubgraphAsNode() throws GraphStateException {
	KeyStrategyFactory keyStrategyFactory = () -> {
		Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
		keyStrategyMap.put("sharedData", new ReplaceStrategy());
		keyStrategyMap.put("results", new AppendStrategy());
		return keyStrategyMap;
	};

	// 创建子图
	var childNode1 = node_async(state -> {
		String data = (String) state.value("sharedData").orElse("");
		return Map.of("results", List.of("Child processed: " + data));
	});

	StateGraph childGraph = new StateGraph(keyStrategyFactory)
			.addNode("child_node1", childNode1)
			.addEdge(START, "child_node1")
			.addEdge("child_node1", END);

	CompiledGraph compiledChild = childGraph.compile();

	// 创建父图
	var parentNode1 = node_async(state -> {
		return Map.of("sharedData", "Parent data");
	});

	StateGraph parentGraph = new StateGraph(keyStrategyFactory)
			.addNode("parent_node1", parentNode1)
			.addNode("call_child", compiledChild)
			.addEdge(START, "parent_node1")
			.addEdge("parent_node1", "call_child")
			.addEdge("call_child", END);

	CompiledGraph compiledParent = parentGraph.compile();
	var result = compiledParent.invoke(Map.of()).orElseThrow();
	System.out.println(result.value("results").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphExample.java)

## 观察嵌套输出

`SubgraphExample.streamSubgraph()` 流式执行父图。从 `NodeOutput.isSubGraph()` 可以识别来自内嵌执行的事件。运行 `SubgraphExample` 可同时查看原生嵌入、手动映射、图结构和子图流。[完整示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphExample.java)

共享状态的键要使用一致的语义。需要按键限制原生子图接收和回写的状态时，见[按值删除和子图状态边界](runtime-preview.md#按值删除和子图状态边界)。
