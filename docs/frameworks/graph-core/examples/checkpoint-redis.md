---
title: "Redis 检查点持久化"
description: "重建 Redis 客户端后读取检查点并恢复。"
---

# Redis 检查点持久化

`RedisSaver` 可以把检查点保存在应用进程之外。示例运行 `prepare` 后暂停，关闭第一个客户端，再用同一个 Redis 和 `threadId` 从 `commit` 继续。

## 配置 RedisSaver

```java title="CheckpointRedisExample.java"
public static CompiledGraph createGraph(RedissonClient client) throws GraphStateException {
	var saver = RedisSaver.builder().redisson(client).build();
	var compile = CompileConfig.builder().saverConfig(SaverConfig.builder().register(saver).build())
			.interruptAfter("prepare").build();
	return new StateGraph(() -> Map.of("steps", new AppendStrategy()))
			.addNode("prepare", node_async(state -> Map.of("steps", List.of("prepared"))))
			.addNode("commit", node_async(state -> Map.of("steps", List.of("committed"))))
			.addEdge(START, "prepare").addEdge("prepare", "commit").addEdge("commit", END)
			.compile(compile);
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointRedisExample.java)

## 重新连接并恢复

```java title="CheckpointRedisExample.java"
public static void reconnectAndResume(String address) throws GraphStateException {
	var thread = RunnableConfig.builder().threadId("redis-example-" + UUID.randomUUID()).build();
	var config = new Config();
	config.useSingleServer().setAddress(address);

	var initialClient = Redisson.create(config);
	try {
		createGraph(initialClient).stream(Map.of(), thread).blockLast(Duration.ofSeconds(10));
	}
	finally {
		initialClient.shutdown();
	}

	var newClient = Redisson.create(config);
	try {
		var graph = createGraph(newClient);
		System.out.println("Saved node: " + graph.getState(thread).node());
		var result = graph.invoke(Map.of(), thread.withResume()).orElseThrow();
		System.out.println("Steps: " + result.value("steps").orElseThrow());
	}
	finally {
		newClient.shutdown();
	}
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointRedisExample.java)

运行 `CheckpointRedisExample`。默认地址为 `redis://localhost:6379`，也可把 URI 作为参数传入。预期输出 `Saved node: prepare` 和 `Steps: [prepared, committed]`。示例为每次演练生成独立 ID，并关闭自己创建的 Redisson 客户端。

多个实例共享检查点时需使用一致的序列化配置。恢复前核对保存位置、`threadId` 和检查点保留策略。按 ID 重放见 [TimeTravelRedisExample](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/TimeTravelRedisExample.java) 和[时光旅行](time-travel.md)。
