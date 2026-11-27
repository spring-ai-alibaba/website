---
title: "时光旅行与检查点分支"
description: "从真实检查点 ID 重放，比较编辑前后的结果。"
---

# 时光旅行与检查点分支

先把报告图跑完，再从 `getStateHistory` 获取 `draft` 节点的真实检查点。重放从检查点记录的下一步开始，本例从 `render` 继续。外部工具与模型调用可能再次执行。

```java title="TimeTravelExample.java"
public static void replayAndEdit(CompiledGraph graph) throws Exception {
	var thread = RunnableConfig.builder().threadId("report-" + UUID.randomUUID()).build();
	graph.invoke(Map.of("format", "html"), thread).orElseThrow();
	var draft = findDraft(graph, thread);
	System.out.println("Saved draft: " + draft.config().checkPointId().orElseThrow());

	var replay = graph.invoke(Map.of(), draft.config()).orElseThrow();
	System.out.println("Replay: " + replay.value("steps").orElseThrow());

	var update = graph.updateState(draft.config(), Map.of("format", "text"));
	var edited = graph.invoke(Map.of(), update).orElseThrow();
	System.out.println("Edited replay: " + edited.value("steps").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/TimeTravelExample.java)

运行 `TimeTravelExample` 会输出原格式的 `[drafted, rendered:html]` 和编辑后的 `[drafted, rendered:text]`。换用同一个 Redis 实例也可重放，见 [TimeTravelRedisExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/TimeTravelRedisExample.java)。

`updateState` 用于编辑当前选中的状态。需要保留原检查点并新增一个不同 ID 的分支时，用 `forkState`，见[运行时新能力](runtime-preview.md#从检查点创建分支)。按照保存器的历史保留策略管理分支。
