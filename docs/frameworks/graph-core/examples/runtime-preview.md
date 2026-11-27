---
title: "运行时新能力"
description: "试用任务级恢复、节点重试、检查点分支和子图状态边界。"
---

# 运行时新能力

本页 API 需要从包含相应实现的源码构建 Graph Core，已发布的 `2.1.0.0` 依赖缺少这些 API。并行任务检查点、节点执行策略和 `forkState` 已进入主分支。子图输入输出键和 `RemoveByValue` 需要包含运行时增强的实现分支。示例位于 `examples/documentation/src/preview/java`。[子图运行时增强](https://github.com/alibaba/spring-ai-alibaba/pull/5059)

## 从源码运行

在包含所需 API 和示例的 Spring AI Alibaba 源码根目录运行。类路径优先加载本地构建的 Graph Core。

```bash
mvn -q -pl :spring-ai-alibaba-graph-core -am -DskipTests package
mvn -q -f examples/documentation/pom.xml test-compile dependency:build-classpath \
  -Dmdep.outputFile=target/graph-example-classpath.txt

graph_jar="$(find spring-ai-alibaba-graph-core/target -maxdepth 1 \
  -name 'spring-ai-alibaba-graph-core-*.jar' ! -name '*-sources.jar' \
  ! -name '*-javadoc.jar' | head -n 1)"
example_cp="$graph_jar:examples/documentation/target/classes:$(cat examples/documentation/target/graph-example-classpath.txt)"
preview="examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples"
java -cp "$example_cp" "$preview/DurableParallelExample.java"
java -cp "$example_cp" "$preview/CheckpointForkExample.java"
java -cp "$example_cp" "$preview/SubgraphStateBoundaryExample.java"
```

## 并行任务检查点

派发节点读取运行输入 `items`，每个元素生成一个 `Send`，再用 `MultiCommand.dispatch` 交给同一个 worker。启用 `taskCheckpoints(true)` 并配置保存器后，恢复会复用已经保存的派发计划和成功任务的写入，重新执行未完成任务。分支复杂时可用 `addParallelJoin(forkId, joinId)` 明确汇合目标。

```java title="DurableParallelExample.java"
private static CompileConfig durableConfig(Path directory) {
	var saver = FileSystemSaver.builder().targetFolder(directory).build();
	return CompileConfig.builder().saverConfig(SaverConfig.builder().register(saver).build())
			.taskCheckpoints(true).build();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/DurableParallelExample.java)

```java title="DurableParallelExample.java"
public static void resumeDispatch(Path directory) throws Exception {
	var dispatchCalls = new AtomicInteger();
	var leftCalls = new AtomicInteger();
	var rightCalls = new AtomicInteger();
	var definition = new StateGraph(() -> Map.of("results", new AppendStrategy()))
			.addNode("dispatch", node_async((state, config) -> {
				dispatchCalls.incrementAndGet();
				List<?> items = state.value("items", List.class).orElseThrow();
				var sends = items.stream().map(item -> new Send("worker", Map.of("item", item))).toList();
				return MultiCommand.dispatch(sends, Map.of());
			}), Map.of("worker", "worker"))
			.addNode("worker", (state, config) -> {
				var item = state.value("item", String.class).orElseThrow();
				if ("left".equals(item)) {
					leftCalls.incrementAndGet();
				}
				else if (rightCalls.incrementAndGet() == 1) {
					throw new WorkerUnavailableException();
				}
				return CompletableFuture.completedFuture(Map.of("results", List.of(item)));
			})
			.addEdge(START, "dispatch").addEdge("worker", END);

	var executor = Executors.newFixedThreadPool(2);
	try {
		var run = RunnableConfig.builder().threadId("dispatch-" + UUID.randomUUID())
				.defaultParallelExecutor(executor).build();
		try {
			definition.compile(durableConfig(directory)).stream(Map.of("items", List.of("left", "right")), run)
					.blockLast(Duration.ofSeconds(5));
		}
		catch (WorkerUnavailableException expected) {
			System.out.println("Right worker needs another attempt");
		}
		var result = definition.compile(durableConfig(directory)).stream(Map.of(), run.withResume())
				.blockLast(Duration.ofSeconds(5));
		System.out.println("Results: " + result.state().value("results").orElseThrow());
		System.out.println("Dispatches: " + dispatchCalls.get());
		System.out.printf("Calls: left=%d, right=%d%n", leftCalls.get(), rightCalls.get());
	}
	finally {
		executor.shutdown();
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/DurableParallelExample.java)

预期结果为 `Results: [left, right]`、`Dispatches: 1` 和 `Calls: left=1, right=2`。多个并行任务等待审批时，可从 `InterruptionMetadata.pendingInterruptions()` 选择具体项，使用 `RunnableConfig.Builder.addHumanFeedback(...)` 传入带中断 ID 的反馈。对外部系统的写入仍需使用幂等键。

## 节点超时和重试

`NodeExecutionPolicy` 可以设置单次尝试超时、最大尝试次数、两次尝试间隔和可重试异常。最大次数包含第一次调用。节点动作在交付结果前失败时可以重试。返回的流在消费时出错会向订阅者传播。示例预期输出 `Attempts: 2, same task ID: true`，业务也可以使用 `taskId` 作为幂等键的一部分。

```java title="DurableParallelExample.java"
public static void retryNode() throws Exception {
	var taskIds = new ArrayList<String>();
	var policy = new NodeExecutionPolicy(Duration.ofSeconds(2), 2, Duration.ofMillis(25),
			WorkerUnavailableException.class::isInstance, false);
	var graph = new StateGraph()
			.addNode("work", (state, config) -> {
				taskIds.add(config.taskId().orElseThrow());
				if (taskIds.size() == 1) {
					return CompletableFuture.failedFuture(new WorkerUnavailableException());
				}
				return CompletableFuture.completedFuture(Map.of("complete", true));
			})
			.addEdge(START, "work").addEdge("work", END)
			.compile(CompileConfig.builder().nodePolicy("work", policy).build());

	graph.stream(Map.of()).blockLast(Duration.ofSeconds(5));
	System.out.printf("Attempts: %d, same task ID: %s%n", taskIds.size(), taskIds.get(0).equals(taskIds.get(1)));
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/DurableParallelExample.java)

## 从检查点创建分支

`forkState` 根据选定检查点和状态修订创建新检查点，原检查点仍可按 ID 查询。使用返回的配置执行新分支。示例原格式仍是 `html`，新分支渲染为 `text`。

```java title="CheckpointForkExample.java"
public static void main(String[] args) throws Exception {
	var graph = TimeTravelExample.createGraph(MemorySaver.builder().build());
	var thread = RunnableConfig.builder().threadId("report-fork").build();
	graph.invoke(Map.of("format", "html"), thread).orElseThrow();
	var draft = TimeTravelExample.findDraft(graph, thread);

	var fork = graph.forkState(draft.config(), Map.of("format", "text"), null);
	var original = graph.getState(draft.config());
	var result = graph.invoke(Map.of(), fork).orElseThrow();
	System.out.println("Original format: " + original.state().value("format").orElseThrow());
	System.out.println("Fork: " + result.value("steps").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointForkExample.java)

## 按值删除和子图状态边界

`StateGraph.addNode(id, child, inputKeys, outputKeys)` 在子图首次启动时选择输入。子图恢复时从自己的检查点加载状态。父图只应用选定键的写入，并按自己的策略归并。对外提供子图事件时，可以用 `NodeOutput.isSubGraph()` 识别嵌套事件，由应用选择展示字段。`RemoveByValue.of("Aa")` 按相等性删除首个匹配项，即使列表中有哈希相同的 `"BB"`。

```java title="SubgraphStateBoundaryExample.java"
public static void resumeChildWithSelectedState() throws Exception {
	var saver = SaverConfig.builder().register(MemorySaver.builder().build()).build();
	var child = new StateGraph(() -> Map.of("notes", new AppendStrategy()))
			.addNode("prepare", node_async(state -> Map.of(
					"notes", List.of(RemoveByValue.of("Aa"), "prepared"),
					"internal", state.value("request").orElseThrow())))
			.addNode("finish", node_async(state -> Map.of("notes", List.of("finished"))))
			.addEdge(START, "prepare").addEdge("prepare", "finish").addEdge("finish", END)
			.compile(CompileConfig.builder().saverConfig(saver).interruptAfter("prepare").build());

	var parent = new StateGraph(() -> Map.of("notes", new AppendStrategy()))
			.addNode("child", child, Set.of("request", "notes"), Set.of("notes"))
			.addEdge(START, "child").addEdge("child", END)
			.compile(CompileConfig.builder().saverConfig(saver).build());

	var run = RunnableConfig.builder().threadId("subgraph-approval").build();
	parent.stream(Map.of("request", "review", "notes", List.of("BB", "Aa"), "internal", "parent"), run)
			.blockLast();
	var result = parent.invoke(Map.of(), run.withResume()).orElseThrow();
	System.out.println("Notes: " + result.value("notes").orElseThrow());
	System.out.println("Internal: " + result.value("internal").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/preview/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/SubgraphStateBoundaryExample.java)

预期输出 `Notes: [BB, prepared, finished]` 和 `Internal: parent`。
