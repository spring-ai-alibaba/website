---
title: "持久化执行"
description: "用文件检查点恢复失败节点。"
---

# 持久化执行

把长任务拆成可恢复的步骤。示例先准备产物，发布节点第一次执行时模拟失败。第二次用同一目录创建 `FileSystemSaver`，以原来的 `threadId` 和 `withResume()` 从发布节点继续。

```java title="LongTimeRunningTaskExample.java"
public static List<?> recoverFromCheckpoint(Path directory) throws GraphStateException {
	var run = RunnableConfig.builder().threadId("publish-" + UUID.randomUUID()).build();
	var first = createGraph(directory, true);
	try {
		first.stream(Map.of(), run).blockLast(Duration.ofSeconds(5));
	}
	catch (PublishUnavailableException expected) {
		System.out.println("Last saved node: " + first.getState(run).node());
	}

	var restarted = createGraph(directory, false);
	var result = restarted.stream(Map.of(), run.withResume()).blockLast(Duration.ofSeconds(5));
	return result.state().value("steps", List.class).orElseThrow();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/LongTimeRunningTaskExample.java)

运行 `LongTimeRunningTaskExample`，预期输出 `Last saved node: prepare` 和 `Steps: [prepared, published]`。可传入保存目录，省略时使用临时目录。

节点可能在完成外部写入后、保存检查点前退出。为外部请求提供业务幂等键，确保重试安全。应用可分别观察失败错误和人工暂停事件，决定重试或等待审批。

并行任务检查点和节点重试策略见[运行时新能力](runtime-preview.md)。
