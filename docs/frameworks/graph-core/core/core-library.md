---
title: "核心概念"
description: "理解状态更新、路由、图编译和状态序列化。"
---

# 核心概念

| 组件 | 职责 |
| --- | --- |
| `StateGraph` | 声明节点、边和状态键策略。 |
| `CompiledGraph` | 校验图结构后提供执行、流式消费和检查点查询入口。 |
| `OverAllState` | 节点接收到的当前状态。节点返回的 Map 表示本次更新。 |
| `CompileConfig` | 配置检查点器、中断位置和递归上限。 |
| `RunnableConfig` | 指定某次执行的会话、检查点和并行配置。 |

## 状态和 KeyStrategy

状态键可以有各自的合并策略。`ReplaceStrategy` 写入最新值，`AppendStrategy` 将新元素加入列表。实现自定义 `KeyStrategy` 时，按旧值和写入值计算结果，并保持输入对象可安全复用。并行分支和子图应返回状态增量，避免重新追加从父图收到的历史列表。

```java title="CoreLibraryExample.java"
public static KeyStrategyFactory createKeyStrategyFactory() {
	return () -> {
		Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
		keyStrategyMap.put("messages", new AppendStrategy());
		return keyStrategyMap;
	};
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/CoreLibraryExample.java)

删除整个键可以返回 `OverAllState.MARK_FOR_REMOVAL`。已有的 `RemoveByHash` 按哈希匹配列表元素。需要按相等性删除首个元素时，可在支持新 API 的源码中使用 [RemoveByValue](../examples/runtime-preview.md#按值删除和子图状态边界)。

## 节点和边

`START` 是入口，`END` 是终点。用 `addEdge` 固定下一步，用 `addConditionalEdges` 根据状态选择路由。路由键与真实节点名由映射绑定。循环要定义可达的退出分支，并按业务步数设置 `recursionLimit`。

```java title="CoreLibraryExample.java"
public static void conditionalEdgesExample() throws GraphStateException {
	KeyStrategyFactory keyStrategyFactory = createKeyStrategyFactory();

	var workflow = new StateGraph(keyStrategyFactory)
			.addNode("nodeA", node_async(state -> Map.of("data", "A")))
			.addNode("nodeB", node_async(state -> Map.of("data", "B")))
			.addNode("nodeC", node_async(state -> Map.of("data", "C")))
			.addEdge(START, "nodeA")
			.addConditionalEdges("nodeA", edge_async(state -> "nodeB"),
					Map.of("nodeB", "nodeB", "nodeC", "nodeC"))
			.addEdge("nodeB", END)
			.addEdge("nodeC", END);

	CompiledGraph graph = workflow.compile();
	System.out.println("Route result: " + graph.invoke(Map.of()).orElseThrow().value("data").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/CoreLibraryExample.java)

## 序列化

运行期间，Graph Core 会复制状态并将其交给节点或写入检查点。状态里优先存放字符串、数值、列表、Map 和可由所选序列化器读写的业务对象。模型客户端、连接、线程池等运行期依赖应通过节点构造参数或运行配置传入。自定义状态类型应使用同一序列化器验证写入、读回和恢复。

示例用默认序列化器将一个 Java record 写入状态，下一节点再用类型化的 `value` 读取。

```java title="CoreLibraryExample.java"
public record TicketStatus(String name, int priority) {
}

public static String serializableStateExample() throws GraphStateException {
	var graph = new StateGraph()
			.addNode("save", node_async(state -> Map.of("ticket", new TicketStatus("open", 2))))
			.addNode("read", node_async(state -> {
				var ticket = state.value("ticket", TicketStatus.class).orElseThrow();
				return Map.of("summary", ticket.name() + " (priority " + ticket.priority() + ")");
			}))
			.addEdge(START, "save").addEdge("save", "read").addEdge("read", END).compile();
	return graph.invoke(Map.of()).orElseThrow().value("summary", String.class).orElseThrow();
}
```

运行 `com.alibaba.cloud.ai.examples.documentation.graph.core.CoreLibraryExample`，预期输出 `open (priority 2)`。[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/CoreLibraryExample.java)

## 记录节点生命周期

通过 `CompileConfig.withLifecycleListener(...)` 注册 `GraphLifecycleListener`。示例分别记录节点执行前、成功后和出错时的回调。可以用节点名和执行配置关联日志，状态更新则由节点或条件边返回。

```java title="GraphLifecycleExample.java"
public static List<String> trace(boolean fail) throws GraphStateException {
	var events = new ArrayList<String>();
	var listener = new GraphLifecycleListener() {
		@Override
		public void before(String nodeId, Map<String, Object> state, RunnableConfig config, Long time) {
			events.add("before:" + nodeId);
		}

		@Override
		public void after(String nodeId, Map<String, Object> state, RunnableConfig config, Long time) {
			events.add("after:" + nodeId);
		}

		@Override
		public void onError(String nodeId, Map<String, Object> state, Throwable error, RunnableConfig config) {
			events.add("error:" + nodeId);
		}
	};

	var graph = new StateGraph()
			.addNode("work", node_async(state -> {
				if (fail) {
					throw new WorkFailedException();
				}
				return Map.of("processed", true);
			}))
			.addEdge(START, "work").addEdge("work", END)
			.compile(CompileConfig.builder().withLifecycleListener(listener).build());

	try {
		graph.stream(Map.of()).blockLast(Duration.ofSeconds(5));
	}
	catch (WorkFailedException expected) {
		// The same error is visible to the stream subscriber.
	}
	return List.copyOf(events);
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/GraphLifecycleExample.java)

运行 `GraphLifecycleExample`，对比成功的 `[before:work, after:work]` 和失败的 `[before:work, error:work]`。在并行图中，监听器写入的共享记录需要支持并发。需要限制尝试次数或配置重试时，参见[节点超时和重试](../examples/runtime-preview.md#节点超时和重试)。

需要跨执行保存状态时，见[持久化](persistence.md)。需要跨会话复用业务数据时，见[内存管理](memory.md)。
