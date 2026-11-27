---
title: "Graph 执行取消"
description: "用 Reactor 取消运行中的订阅。"
---

# Graph 执行取消

调用 `stream(...).subscribe(...)` 后，把得到的 `Disposable` 绑定到请求生命周期。用户点击停止或客户端断开时调用 `dispose()`。用 `doFinally` 区分 `CANCEL`、自然完成和错误。

```java title="CancellationExample.java"
public static SignalType cancelSubscription() throws GraphStateException, InterruptedException {
	var started = new CountDownLatch(1);
	var unfinished = new CompletableFuture<Map<String, Object>>();
	var graph = new StateGraph()
			.addNode("work", (state, config) -> {
				started.countDown();
				return unfinished;
			})
			.addEdge(START, "work")
			.addEdge("work", END)
			.compile();

	var termination = new CompletableFuture<SignalType>();
	var subscription = graph.stream(Map.of())
			.doFinally(termination::complete)
			.subscribe(output -> System.out.println(output.node()), termination::completeExceptionally);
	try {
		if (!started.await(5, TimeUnit.SECONDS)) {
			throw new IllegalStateException("The work node did not start");
		}
	}
	finally {
		subscription.dispose();
	}
	return termination.join();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CancellationExample.java)

运行 `CancellationExample`，预期输出 `Termination: cancel`。示例先确认节点已经开始，再取消同一条订阅。WebFlux 也可以直接返回 Flux，由 HTTP 响应生命周期管理订阅。正在执行的阻塞调用是否停止取决于客户端和节点的取消支持，已经发出的外部操作仍需由业务管理。

需要稍后继续时，参见[持久化执行](long-time-running-task.md)。需要把待审批信息交给客户端时，参见[人类反馈](human-in-the-loop.md)。
