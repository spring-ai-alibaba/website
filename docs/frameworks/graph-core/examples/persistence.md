---
title: "为图添加持久化记忆"
description: "保存多轮消息并按线程隔离会话。"
---

# 为图添加持久化记忆

示例的 `answer` 节点回显最后一条消息。`AppendStrategy` 累积消息，`MemorySaver` 让同一个 `threadId` 在新一轮执行时读取之前的状态。

```java title="PersistenceExample.java"
public static CompiledGraph createGraphWithCheckpointer() throws GraphStateException {
	var saverConfig = SaverConfig.builder().register(MemorySaver.builder().build()).build();
	return new StateGraph(() -> Map.of("messages", new AppendStrategy()))
			.addNode("answer", node_async(state -> {
				var messages = state.value("messages", List.class).orElseThrow();
				return Map.of("messages", List.of("Echo: " + messages.get(messages.size() - 1)));
			}))
			.addEdge(START, "answer").addEdge("answer", END)
			.compile(CompileConfig.builder().saverConfig(saverConfig).build());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/PersistenceExample.java)

## 验证多会话隔离

```java title="PersistenceExample.java"
public static void multiSessionIsolation(CompiledGraph graph) {
	var alice = RunnableConfig.builder().threadId("alice").build();
	var bob = RunnableConfig.builder().threadId("bob").build();
	graph.invoke(Map.of("messages", List.of("Hello")), alice).orElseThrow();
	graph.invoke(Map.of("messages", List.of("Good morning")), bob).orElseThrow();

	var secondTurn = graph.invoke(Map.of("messages", List.of("One more question")), alice).orElseThrow();
	System.out.println("Alice: " + secondTurn.value("messages").orElseThrow());
	System.out.println("Bob: " + graph.getState(bob).state().value("messages").orElseThrow());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/PersistenceExample.java)

运行 `com.alibaba.cloud.ai.examples.documentation.graph.examples.PersistenceExample`。Alice 的历史包含两次请求和应答，Bob 的历史只有自己的请求和应答。加入模型时，需要把保存的消息传入模型请求，参见[内存管理](../core/memory.md)。需要跨进程保存时可以改用 [RedisSaver](checkpoint-redis.md)。
