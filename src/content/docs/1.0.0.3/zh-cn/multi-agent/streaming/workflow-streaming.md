---
title: 工作流流式处理
description: 从 Spring AI Alibaba Graph 工作流中流式输出数据
---

# 工作流流式处理

从工作流流式传输数据可以提供实时的执行状态和进度反馈。

## 基本用法示例

Spring AI Alibaba Graph 图公开了 [`.stream()`](../../../api-reference/graph/#stream)（同步）和 [`.streamAsync()`](../../../api-reference/graph/#streamAsync)（异步）方法，以产生流式输出作为迭代器。

**同步方式：**

```java
// 同步
for (StreamEvent chunk : graph.stream(inputs, StreamConfig.builder()
        .streamMode("updates")
        .build())) {
    System.out.println(chunk);
}
```

**异步方式：**

```java
// 异步
graph.streamAsync(inputs, StreamConfig.builder()
        .streamMode("updates")
        .build())
    .subscribe(chunk -> System.out.println(chunk));
```

## 扩展示例：流式传输更新

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import static com.alibaba.cloud.ai.graph.StateGraph.*;

public class StreamingUpdatesExample {

    public static class State {
        private String topic;
        private String joke;

        // 构造函数、getter 和 setter
    }

    public static NodeAction refineTopic = state -> {
        String topic = (String) state.value("topic").orElse("");
        return Map.of("topic", topic + " and cats");
    };

    public static NodeAction generateJoke = state -> {
        String topic = (String) state.value("topic").orElse("");
        return Map.of("joke", "This is a joke about " + topic);
    };

    public static void main(String[] args) {
        CompiledGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("refineTopic", node_async(refineTopic))
            .addNode("generateJoke", node_async(generateJoke))
            .addEdge(START, "refineTopic")
            .addEdge("refineTopic", "generateJoke")
            .addEdge("generateJoke", END)
            .compile();

        // 流式执行
        for (StreamEvent chunk : graph.stream(
                Map.of("topic", "ice cream"),
                StreamConfig.builder()
                    .streamMode("updates")
                    .build())) {
            System.out.println(chunk);
        }
    }
}
```

输出：
```
{'refineTopic': {'topic': 'ice cream and cats'}}
{'generateJoke': {'joke': 'This is a joke about ice cream and cats'}}
```

## 流式传输多种模式

您可以将列表作为 `streamMode` 参数传递，以一次流式传输多种模式。

流式输出将是 `(mode, chunk)` 的元组，其中 `mode` 是流式模式的名称，`chunk` 是该模式流式传输的数据。

**同步方式：**

```java
// 同步
for (StreamEvent event : graph.stream(inputs, StreamConfig.builder()
        .streamModes(List.of("updates", "custom"))
        .build())) {
    String mode = event.getMode();
    Object chunk = event.getChunk();
    System.out.println("模式: " + mode + ", 数据: " + chunk);
}
```

**异步方式：**

```java
// 异步
graph.streamAsync(inputs, StreamConfig.builder()
        .streamModes(List.of("updates", "custom"))
        .build())
    .subscribe(event -> {
        String mode = event.getMode();
        Object chunk = event.getChunk();
        System.out.println("模式: " + mode + ", 数据: " + chunk);
    });
```

## 流式传输图状态

使用流式模式 `updates` 和 `values` 来流式传输图在执行时的状态。

- `updates` 流式传输图每个步骤后状态的**更新**。
- `values` 流式传输图每个步骤后状态的**完整值**。

API 参考：[StateGraph](../../../api-reference/graph/#StateGraph) | [START](../../../api-reference/graph/#START) | [END](../../../api-reference/graph/#END)

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import static com.alibaba.cloud.ai.graph.StateGraph.*;

public class State {
    private String topic;
    private String joke;

    // 构造函数、getter 和 setter
}

NodeAction refineTopic = state -> {
    String topic = (String) state.value("topic").orElse("");
    return Map.of("topic", topic + " and cats");
};

NodeAction generateJoke = state -> {
    String topic = (String) state.value("topic").orElse("");
    return Map.of("joke", "This is a joke about " + topic);
};

CompiledGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("refineTopic", node_async(refineTopic))
    .addNode("generateJoke", node_async(generateJoke))
    .addEdge(START, "refineTopic")
    .addEdge("refineTopic", "generateJoke")
    .addEdge("generateJoke", END)
    .compile();
```

**使用 `updates` 模式：**

使用此模式仅流式传输每个步骤后节点返回的**状态更新**。流式输出包括节点的名称以及更新。

```java
for (StreamEvent chunk : graph.stream(
        Map.of("topic", "ice cream"),
        StreamConfig.builder()
            .streamMode("updates")
            .build())) {
    System.out.println(chunk);
}
```

**使用 `values` 模式：**

使用此模式流式传输每个步骤后图的**完整状态**。

```java
for (StreamEvent chunk : graph.stream(
        Map.of("topic", "ice cream"),
        StreamConfig.builder()
            .streamMode("values")
            .build())) {
    System.out.println(chunk);
}
```

## 流式传输子图输出

要在流式输出中包含来自[子图](../subgraphs)的输出，您可以在父图的 `.stream()` 方法中设置 `subgraphs=true`。这将流式传输来自父图和任何子图的输出。

输出将作为元组 `(namespace, data)` 流式传输，其中 `namespace` 是一个元组，包含调用子图的节点的路径，例如 `("parent_node:<task_id>", "child_node:<task_id>")`。

```java
for (StreamEvent chunk : graph.stream(
        Map.of("foo", "foo"),
        StreamConfig.builder()
            .streamMode("updates")
            .subgraphs(true)  // 设置 subgraphs=true 以流式传输子图输出
            .build())) {
    System.out.println(chunk);
}
```

## 调试模式

使用 `debug` 流式模式在图的执行过程中流式传输尽可能多的信息。流式输出包括节点的名称以及完整状态。

```java
for (StreamEvent chunk : graph.stream(
        Map.of("topic", "ice cream"),
        StreamConfig.builder()
            .streamMode("debug")
            .build())) {
    System.out.println(chunk);
}
```

## 下一步

- [自定义流式数据](./custom-streaming) - 发送自定义流式数据
- [性能优化](./performance) - 优化流式处理性能
