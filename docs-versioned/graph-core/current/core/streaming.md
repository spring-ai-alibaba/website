---
title: 流式输出
description: 使用 Spring AI Alibaba Graph 框架实现工作流的流式输出，支持节点级别和 LLM 级别的流式处理
keywords: [Spring AI Alibaba, Graph, 流式输出, AsyncGenerator, Streaming, 节点流式]
---

# 流式输出

Spring AI Alibaba Graph 内置了对流式处理的一流支持。它使用 [java-async-generator] 库来实现此功能。以下是从图运行中流式返回输出的不同方式。

## 流式图输出 (_.stream()_)

`.stream()` 是一个用于从图运行中流式返回输出的方法。它返回一个 [AsyncGenerator]，您必须在其上迭代以获取执行步骤的序列，作为 [NodeOutput] 类的实例，该类基本上报告执行的**节点名称**和结果**状态**。

### 流的组合（嵌入和组合）

[AsyncGenerator] 支持嵌入（即可组合），它可以暂停主迭代以执行嵌套的 [AsyncGenerator]，然后恢复主迭代。
基于此功能，我们可以从节点操作中返回一个 [AsyncGenerator]，该生成器将嵌入到图的主生成器中，其结果将从 `.stream()` 给出的同一迭代器中获取，使子流式处理成为无缝体验。

### 流式 LLM tokens（使用 Spring AI）

要使用 Spring AI 从 AI 调用中实现流式 LLM tokens，我们使用 Spring AI 的流式能力，示例如下：

```java
ChatClient chatClient = chatClientBuilder.build();

Flux<ChatResponse> chatResponseFlux = chatClient.prompt()
    .user("给我讲一个笑话")
    .stream()
    .chatResponse();

chatResponseFlux.subscribe(
    response -> {
        // 处理每个 token
        String content = response.getResult().getOutput().getContent();
        System.out.print(content);
    },
    error -> {
        // 处理错误
        System.err.println("错误: " + error.getMessage());
    },
    () -> {
        // 完成处理
        System.out.println("\n流式处理完成");
    }
);
```

### StreamingChatGenerator

**Spring AI Alibaba** 提供了一个实用类 [StreamingChatGenerator]，可以将 Spring AI 的流式响应转换为 [AsyncGenerator]。以下是代码片段：

```java
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.springframework.ai.chat.model.ChatResponse;
import reactor.core.publisher.Flux;

Flux<ChatResponse> chatResponseFlux = chatClient.prompt()
    .user("给我讲一个笑话")
    .stream()
    .chatResponse();

AsyncGenerator<? extends NodeOutput> generator = StreamingChatGenerator.builder()
    .startingNode("joke_node")
    .startingState(state)
    .mapResult(response -> {
        String content = response.getResult().getOutput().getContent();
        return Map.of("content", content);
    })
    .build(chatResponseFlux);

for (var r : generator) {
    log.info("{}", r);
}

log.info("结果: {}", generator.resultValue().orElse(null));
```

当我们构建 [StreamingChatGenerator] 时，我们必须提供一个映射函数 `Function<ChatResponse, Map<String,Object>>`，该函数将在流完成时被调用，以将完成结果转换为表示**部分状态结果**的 `Map`，这正是 **Spring AI Alibaba Graph** 期望的结果。

### 在节点操作中整合所有内容

现在我们准备实现一个 **Spring AI Alibaba Graph 节点操作**，下面是一个代表性的代码片段：

```java
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.bsc.async.AsyncGenerator;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import reactor.core.publisher.Flux;

public class StreamingNode implements NodeAction {

    private final ChatClient chatClient;

    public StreamingNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String query = (String) state.value("query").orElse("");

        // 获取流式响应
        Flux<ChatResponse> chatResponseFlux = chatClient.prompt()
            .user(query)
            .stream()
            .chatResponse();

        // 创建流式生成器
        AsyncGenerator<? extends NodeOutput> generator = StreamingChatGenerator.builder()
            .startingNode("ai_response")
            .startingState(state)
            .mapResult(response -> {
                String content = response.getResult().getOutput().getContent();
                return Map.of("ai_response", content);
            })
            .build(chatResponseFlux);

        // 返回嵌入的生成器
        return Map.of("ai_response", generator);
    }
}
```

完整的实现可以参考 [graph 目录中的 streaming 示例](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/graph/stream-node)。

[java-async-generator]: https://github.com/bsorrentino/java-async-generator
[AsyncGenerator]: https://bsorrentino.github.io/java-async-generator/apidocs/org/bsc/async/AsyncGenerator.html
[NodeOutput]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph/src/main/java/com/alibaba/cloud/ai/graph/NodeOutput.java
[StreamingChatGenerator]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph/src/main/java/com/alibaba/cloud/ai/graph/streaming/StreamingChatGenerator.java
