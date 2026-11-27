---
title: "内存管理"
description: "区分工作流线程的短期状态和跨会话的 Store。"
---

# 内存管理

| 需要保存的数据 | 入口 | 常用键 |
| --- | --- | --- |
| 本轮状态、执行位置、同一会话的消息历史 | `BaseCheckpointSaver` | `threadId` |
| 跨会话共享的偏好、业务资料、缓存 | `Store` | namespace 和业务 key |

## 短期内存

在 `CompileConfig` 注册保存器，为 `messages` 选择追加策略。同一会话继续聊天时用同一个 `threadId` 从 `START` 执行新一轮。节点需要把保存的消息转换为 Spring AI 的 `Message` 并交给模型，历史才会进入本轮请求。

```java title="MemoryExample.java"
static List<Message> toChatMessages(List<Map<String, String>> messages) {
	return messages.stream()
			.map(MemoryExample::toChatMessage)
			.toList();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/MemoryExample.java)

`MemoryExample.addShortTermMemory(ChatClient.Builder)` 展示两轮请求。想先验证同一会话续写和不同会话隔离，可运行无需模型的[对话持久化示例](../examples/persistence.md)。长时间保留会话时，在业务层控制传给模型的历史长度。

## 长期内存

示例用 `RunnableConfig.builder().store(store)` 注入 Store，节点从 `config.store()` 读取。命名空间建议包含租户或业务域，业务键使用用户或对象 ID。把业务数据写入 Store 与保存工作流检查点是各自独立的操作。

`MemoryExample.readUserProfile()` 演示按用户 ID 查询配置。`cacheWithStore()` 展示按业务键缓存计算结果。两者均可用本地 `MemoryStore` 运行。部署时可根据保留需求换成持久化 Store。`combinedMemoryExample(ChatClient.Builder)` 展示同时使用短期状态和长期 Store。[完整示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/core/MemoryExample.java)

如果整个应用重启后仍需续跑，使用[磁盘检查点](../examples/long-time-running-task.md)或 [Redis 检查点](../examples/checkpoint-redis.md)。
