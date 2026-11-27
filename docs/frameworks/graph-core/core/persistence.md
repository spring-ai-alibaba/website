---
title: "持久化"
description: "配置检查点器，理解状态快照、新一轮执行和断点恢复。"
---

# 持久化

检查点器按 `threadId` 保存图状态及执行位置。同一个图可以服务多个会话，每个会话使用业务方可稳定重用的 ID。

## 配置检查点

示例使用 `MemorySaver`，并在 `review` 节点前暂停。需要跨进程保存时，可选择 `FileSystemSaver` 或 [RedisSaver](../examples/checkpoint-redis.md)。文件目录或 Redis 实例需要在恢复时继续可用。

```java title="PersistenceExample.java"
public static CompiledGraph createGraph() throws GraphStateException {
	var saver = SaverConfig.builder().register(MemorySaver.builder().build()).build();
	return new StateGraph(() -> Map.of("events", new AppendStrategy()))
			.addNode("review", node_async(state -> {
				var decision = state.value("decision", String.class).orElseThrow();
				return Map.of("events", List.of(decision));
			}))
			.addEdge(START, "review")
			.addEdge("review", END)
			.compile(CompileConfig.builder().saverConfig(saver).interruptBefore("review").build());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/PersistenceExample.java)

## 查询和恢复

```java title="PersistenceExample.java"
public static void inspectAndResume() throws Exception {
	var graph = createGraph();
	var thread = RunnableConfig.builder().threadId("approval-1").checkpointsNumRetained(20).build();

	graph.stream(Map.of("events", List.of("submitted")), thread).blockLast();
	var saved = graph.getState(thread);
	System.out.println("Checkpoint: " + saved.config().checkPointId().orElseThrow());

	var updated = graph.updateState(saved.config(), Map.of("decision", "approved"));
	var result = graph.invoke(Map.of(), updated.withResume()).orElseThrow();
	System.out.println(result.value("events").orElseThrow());

	graph.getStateHistory(thread).forEach(snapshot ->
			System.out.printf("%s %s%n", snapshot.node(), snapshot.config().checkPointId().orElseThrow()));
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/PersistenceExample.java)

| 操作 | 执行位置 |
| --- | --- |
| `invoke(inputs, thread)` | 使用该线程已有的状态作为基础，从 `START` 开始新一轮。 |
| `invoke(Map.of(), thread.withResume())` | 从最新检查点记录的位置继续。 |
| `invoke(Map.of(), snapshot.config())` | 从指定检查点记录的位置继续。 |
| `getState(config)` / `getStateHistory(config)` | 查询状态和历史。 |
| `updateState(config, values)` | 应用键策略并返回定位到新状态的配置。 |

暂停后需要修改状态时，优先使用 `updateState` 返回的配置继续执行。指定 `asNode` 会按该节点的出边重新求下一步，可用于有意调整路由。示例用 `checkpointsNumRetained(20)` 给支持保留策略的保存器设置每线程的历史上限。要从历史快照重放或保留原检查点创建新分支，见[时光旅行](../examples/time-travel.md)。

示例入口是 `com.alibaba.cloud.ai.examples.documentation.graph.core.PersistenceExample`。见[运行仓库示例](/docs/frameworks/graph-core/quick-start#run-the-example)。
