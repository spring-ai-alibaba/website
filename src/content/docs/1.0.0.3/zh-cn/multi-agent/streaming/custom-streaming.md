---
title: 自定义流式数据
description: 从节点和工具发送自定义流式数据
---

# 自定义流式数据

Spring AI Alibaba Graph 允许您从节点和工具内部发送自定义用户定义的数据，提供灵活的进度报告和状态更新机制。

## 工具更新

要在工具执行时流式传输更新，您可以使用 [getStreamWriter](../../../api-reference/config/#getStreamWriter)：

**工具类定义：**

```java
import com.alibaba.cloud.ai.graph.config.StreamWriter;
import com.alibaba.cloud.ai.graph.config.GraphConfig;

@Component
public class WeatherTool {

    public String getWeather(String city) {
        StreamWriter writer = GraphConfig.getStreamWriter();
        // 流式传输任意数据
        writer.write(Map.of("message", "正在查找城市数据: " + city));
        return city + " 总是阳光明媚！";
    }
}
```

**同步使用：**

```java
// 在图中使用此工具
for (StreamEvent chunk : graph.stream(
        Map.of("messages", List.of(Map.of("role", "user", "content", "天气如何？"))),
        StreamConfig.builder().streamMode("custom").build())) {
    System.out.println(chunk);
    System.out.println();
}
```

**异步使用：**

```java
// 异步使用此工具
graph.streamAsync(
        Map.of("messages", List.of(Map.of("role", "user", "content", "天气如何？"))),
        StreamConfig.builder().streamMode("custom").build())
    .subscribe(chunk -> {
        System.out.println(chunk);
        System.out.println();
    });
```

!!! Note "注意"

    如果您在工具内部添加 `getStreamWriter`，您将无法在 Spring AI Alibaba Graph 执行上下文之外调用该工具。

## 流式传输自定义数据

要从 Spring AI Alibaba Graph 节点或工具内部发送自定义用户定义的数据，请按照以下步骤操作：

1. 使用 `getStreamWriter()` 访问流写入器并发出自定义数据。
2. 在调用 `.stream()` 或 `.streamAsync()` 时设置 `streamMode="custom"` 以在流中获取自定义数据。您可以组合多种模式（例如，`["updates", "custom"]`），但至少一种必须是 `"custom"`。

**在节点中使用：**

```java
import com.alibaba.cloud.ai.graph.config.StreamWriter;
import com.alibaba.cloud.ai.graph.config.GraphConfig;

public class State {
    private String query;
    private String answer;

    // 构造函数、getter 和 setter
}

NodeAction customNode = state -> {
    StreamWriter writer = GraphConfig.getStreamWriter();  // 获取流写入器
    writer.write(Map.of("custom_key", "在节点内生成自定义数据")); // 发出自定义数据
    return Map.of("answer", "some data");
};

CompiledGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("node", node_async(customNode))
    .addEdge(START, "node")
    .compile();

Map<String, Object> inputs = Map.of("query", "example");

// 使用
for (StreamEvent chunk : graph.stream(inputs, StreamConfig.builder()
        .streamMode("custom")  // 设置为 custom 模式
        .build())) {
    System.out.println(chunk);
}
```

**在工具中使用：**

```java
import com.alibaba.cloud.ai.graph.config.StreamWriter;
import com.alibaba.cloud.ai.graph.config.GraphConfig;

@Component
public class DatabaseTool {

    public String queryDatabase(String query) {
        StreamWriter writer = GraphConfig.getStreamWriter(); // 获取流写入器
        writer.write(Map.of("data", "已检索 0/100 条记录", "type", "progress")); // 发出进度更新

        // 执行查询
        String result = performQuery(query);

        writer.write(Map.of("data", "已检索 100/100 条记录", "type", "progress")); // 发出完成状态
        return result;
    }
}

// 在图中使用此工具
for (StreamEvent chunk : graph.stream(inputs, StreamConfig.builder()
        .streamMode("custom")  // 设置为 custom 模式
        .build())) {
    System.out.println(chunk);
}
```

## LLM 令牌流式传输

使用 `messages` 流式模式从图的任何部分**逐令牌**流式传输大语言模型（LLM）输出，包括节点、工具、子图或任务。

来自 [`messages` 模式](#supported-stream-modes)的流式输出是一个元组 `(message_chunk, metadata)`，其中：

- `message_chunk`：来自 LLM 的令牌或消息段。
- `metadata`：包含图节点和 LLM 调用详细信息的字典。

> 如果您的 LLM 不作为 Spring AI 集成提供，您可以使用 `custom` 模式流式传输其输出。请参阅[与任何 LLM 一起使用](#use-with-any-llm)了解详细信息。

!!! warning "异步需要手动配置"

    在 Java 中使用异步代码时，您必须显式传递 `RunnableConfig` 到 `invokeAsync()` 以启用正确的流式传输。

API 参考：[ChatClient](../../../api-reference/chat/#ChatClient) | [StateGraph](../../../api-reference/graph/#StateGraph) | [START](../../../api-reference/graph/#START)

```java
import com.alibaba.cloud.ai.chat.ChatClient;
import com.alibaba.cloud.ai.graph.StateGraph;
import static com.alibaba.cloud.ai.graph.StateGraph.*;

public class MyState {
    private String topic;
    private String joke = "";

    // 构造函数、getter 和 setter
}

@Autowired
private ChatClient chatClient;

NodeAction callModel = state -> {
    String topic = (String) state.value("topic").orElse("");

    // 调用 LLM 生成关于主题的笑话
    String response = chatClient.prompt()  // (1)!
        .user("Generate a joke about " + topic)
        .call()
        .content();

    return Map.of("joke", response);
};

CompiledGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("callModel", node_async(callModel))
    .addEdge(START, "callModel")
    .compile();

// 流式传输 LLM 令牌
for (StreamEvent event : graph.stream(  // (2)!
        Map.of("topic", "ice cream"),
        StreamConfig.builder()
            .streamMode("messages")
            .build())) {

    if (event instanceof MessageStreamEvent) {
        MessageStreamEvent msgEvent = (MessageStreamEvent) event;
        if (msgEvent.getContent() != null) {
            System.out.print(msgEvent.getContent() + "|");
        }
    }
}
```

1. 注意，即使使用 `.call()` 而不是 `.stream()` 运行 LLM，也会发出消息事件。
2. "messages" 流式模式返回一个迭代器，其中包含元组 `(message_chunk, metadata)`，其中 `message_chunk` 是 LLM 流式传输的令牌，`metadata` 是包含调用 LLM 的图节点信息和其他信息的字典。

## 实际应用示例

### 进度报告工具

```java
@Component
public class DataProcessingTool {
    
    public String processLargeDataset(String datasetPath) {
        StreamWriter writer = GraphConfig.getStreamWriter();
        
        // 模拟数据处理
        int totalRecords = 1000;
        for (int i = 0; i < totalRecords; i += 100) {
            // 处理数据批次
            processBatch(i, Math.min(i + 100, totalRecords));
            
            // 发送进度更新
            writer.write(Map.of(
                "type", "progress",
                "processed", i + 100,
                "total", totalRecords,
                "percentage", (i + 100) * 100 / totalRecords
            ));
        }
        
        return "数据处理完成";
    }
}
```

### 状态更新节点

```java
NodeAction statusUpdateNode = state -> {
    StreamWriter writer = GraphConfig.getStreamWriter();
    
    // 发送状态更新
    writer.write(Map.of(
        "status", "开始处理",
        "timestamp", System.currentTimeMillis()
    ));
    
    // 执行业务逻辑
    String result = performBusinessLogic();
    
    // 发送完成状态
    writer.write(Map.of(
        "status", "处理完成",
        "result", result,
        "timestamp", System.currentTimeMillis()
    ));
    
    return Map.of("result", result);
};
```

## 下一步

- [性能优化](./performance) - 优化流式处理性能
- [智能体流式处理](./agent-streaming) - 学习智能体流式处理
- [工作流流式处理](./workflow-streaming) - 了解工作流流式处理
