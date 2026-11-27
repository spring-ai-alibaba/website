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

运行 `SubgraphAsNodeActionExample`，预期输出 `Final:SubStep1:Input Data->SubStep2`。同步 `invoke` 适合把子图调用视为一个完整步骤。

## 在包装节点中透传子图事件

包装节点需要动态选择子图或转换数据时，可通过 `RunnableConfig.runChild` 调用子图。父图用 `streamEvents` 订阅并启用嵌套事件后，可以在父节点写回最终结果前接收子节点的模型增量。

```java
var parent = new StateGraph("workflow", Map::of)
    .addNode("compose", (state, config) -> {
        config.streamWriter().tryEmit("progress", "Writing the draft");
        return config.runChild(child, Map.of("topic", state.value("input", String.class).orElseThrow()))
            .map(result -> Map.<String, Object>of("answer",
                result.state().value("draft", AssistantMessage.class).orElseThrow().getText()))
            .toFuture();
    })
    .addEdge(START, "compose").addEdge("compose", END).compile();
```

示例中的子图用 `draft` 存放最终消息，父节点只提交 `answer`。订阅时启用 `CUSTOM` 通道可接收 `progress`。每次 `runChild` 调用都有独立的运行身份。如果希望引擎为这个调用边界管理 checkpoint 暂停和恢复，请使用[带输入输出映射的 CompiledGraph 节点](subgraph-as-compiledgraph.md#映射状态并恢复子图)。

[可运行的 GraphEventStreamingExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/GraphEventStreamingExample.java) · [类型化运行事件](../core/streaming.md#类型化运行事件)
