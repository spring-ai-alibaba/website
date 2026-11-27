---
title: "人类反馈"
description: "通过固定或动态中断实现审批和恢复。"
---

# 人类反馈

应用从流中识别 `InterruptionMetadata`，展示待审批状态，并保存本次执行的 `threadId`。收到决定后写回状态并恢复。

| 场景 | 入口 |
| --- | --- |
| 到达发布节点就暂停 | `CompileConfig.interruptBefore("publish")` |
| 缺少决策时才暂停 | `InterruptableAction.interrupt(...)` 返回 `InterruptionMetadata` |

```java title="HumanInTheLoopExample.java"
public static CompiledGraph createApprovalGraph(boolean dynamic) throws GraphStateException {
	var saver = SaverConfig.builder().register(MemorySaver.builder().build()).build();
	var compile = CompileConfig.builder().saverConfig(saver);
	var graph = new StateGraph()
			.addNode("prepare", node_async(state -> Map.of("draft", "Refund request")));
	if (dynamic) {
		graph.addNode("publish", new ApprovalAction());
	}
	else {
		graph.addNode("publish", node_async(HumanInTheLoopExample::publish));
		compile.interruptBefore("publish");
	}
	return graph.addEdge(START, "prepare").addEdge("prepare", "publish").addEdge("publish", END)
			.compile(compile.build());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/HumanInTheLoopExample.java)

示例给出固定的 `approved` 反馈。可以改成 `rejected` 验证拒绝路径。调用 `updateState` 后，用返回的配置定位到更新后的检查点。

```java title="HumanInTheLoopExample.java"
public static String approve(CompiledGraph graph, RunnableConfig thread) throws Exception {
	var last = graph.stream(Map.of(), thread).blockLast(Duration.ofSeconds(5));
	if (!(last instanceof InterruptionMetadata interruption)) {
		throw new IllegalStateException("Expected approval to be pending");
	}
	System.out.println("Review: " + interruption.state().value("draft").orElseThrow());

	var updated = graph.updateState(thread, Map.of("decision", "approved"));
	return graph.invoke(Map.of(), updated.withResume()).orElseThrow()
			.value("status", String.class).orElseThrow();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/HumanInTheLoopExample.java)

运行 `HumanInTheLoopExample` 会依次演练两种模式，分别输出 `Review: Refund request` 和 `Status: published`。跨进程等待审批时，使用持久化保存器，并按身份校验反馈归属。

## 循环等待反馈

反馈也可以让流程回到前序节点。下面的例子第一次提交 `back`，重新准备后再次暂停。第二次提交 `next`，图继续到终点。每轮使用同一个线程查找最新检查点，并用本轮 `updateState` 返回的配置恢复。

```java title="WaitUserInputExample.java"
public static List<?> runTwoRounds() throws Exception {
	var graph = createGraphWithInterrupt();
	var thread = RunnableConfig.builder().threadId("feedback-demo").build();
	var firstPause = graph.stream(Map.of(), thread).blockLast(Duration.ofSeconds(5));
	expectPause(firstPause);

	var back = graph.updateState(thread, Map.of("feedback", "back"));
	var secondPause = graph.stream(Map.of(), back.withResume()).blockLast(Duration.ofSeconds(5));
	expectPause(secondPause);

	var next = graph.updateState(thread, Map.of("feedback", "next"));
	var result = graph.invoke(Map.of(), next.withResume()).orElseThrow();
	return result.value("steps", List.class).orElseThrow();
}
```

运行 `WaitUserInputExample`，会看到两次等待事件和最终结果 `[prepared, prepared, finished]`。[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/WaitUserInputExample.java)

任务级检查点还支持按具体中断 ID 恢复并行任务，见[运行时新能力](runtime-preview.md#并行任务检查点)。
