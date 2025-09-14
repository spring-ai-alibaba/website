---
title: 流式响应
description: 学习如何使用 StateGraph 的流式执行模式，实时获取 Agent 在每个执行步骤的输出，构建具有实时反馈的用户体验。
---

在很多交互式 AI 应用中，用户期望获得实时的反馈，而不是在提交请求后长时间地等待最终结果。例如，在与聊天机器人对话时，我们希望看到文字以“打字机”的效果逐字或逐句流出。SAA Graph 通过其强大的流式响应（Streaming）功能，完美地支持了这类场景。

## `stream()` vs `invoke()`：执行模式的核心区别

`CompiledGraph` 提供了两种核心的执行方法，理解它们的区别是掌握流式响应的第一步：

1.  **`.invoke()` (同步执行)**: 这是一个阻塞式调用。它会完整地执行整个图，直到流程到达 `END` 节点，然后**一次性**返回包含了**最终状态**的 `OverAllState` 对象。它适用于后台任务或不需要实时反馈的场景。
2.  **`.stream()` (流式执行)**: 这是一个非阻塞式调用。它会**立即**返回一个 `AsyncGenerator<NodeOutput>` 对象，这是一个异步迭代器。您可以立刻开始从这个迭代器中消费数据，它会实时地、**增量地**产生图在执行过程中**每一个节点**的输出，直到流程结束。

## 流式响应的核心组件

要理解流式处理，需要熟悉以下三个核心组件：

1.  **`AsyncGenerator<NodeOutput>`**: 这是您从 `.stream()` 方法中获取到的核心对象。可以把它想象成一个“数据管道”的出口，您可以异步地、一个接一个地从这个管道里取出数据包，而不用一次性接收所有数据。
2.  **`NodeOutput`**: 这就是管道里流动的“数据包”。每个 `NodeOutput` 对象都代表了图中一个节点执行完毕后的事件快照，包含了两个关键信息：
    -   `.node()`: 产生此数据包的**节点名称** (String)。
    -   `.state()`: 该节点执行完毕后，整个图的**状态快照** (`OverAllState`)。
3.  **`StreamingOutput`**: 这是一个特殊的“数据包”子类型。当产生输出的节点是 `LlmNode` 或其他基于 `ChatClient` 的流式节点时，`NodeOutput` 的实际类型通常是 `StreamingOutput`。它除了包含节点名和状态外，还额外提供了 `.chunk()` 方法，让您可以直接获取到 LLM 生成的 token 块（`String`）。

## 消费端：如何处理流式响应

下面的示例展示了在 Spring Boot Web 应用中，如何创建一个 Controller 来处理流式请求，并将 `StateGraph` 的执行结果以 Server-Sent Events (SSE) 的方式实时推送到前端。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.async.AsyncGenerator;
import com.alibaba.cloud.ai.graph.streaming.StreamingOutput;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.HashMap;
import java.util.Map;

@RestController
public class StreamingController {

    private final CompiledGraph compiledGraph; // 注入编译好的图

    public StreamingController(CompiledGraph compiledGraph) {
        this.compiledGraph = compiledGraph;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(
            @RequestParam(defaultValue = "你好，介绍一下自己") String query) {
        
        // 1. 配置本次运行。对于流式应用，通常也需要 threadId 来追踪状态。
        RunnableConfig config = RunnableConfig.builder().threadId("user_session").build();
        Map<String, Object> input = Map.of("query", query);
        
        // 2. 创建一个 Sink，作为从 StateGraph 到 Web Flux 的桥梁。
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().unicast().onBackpressureBuffer();
        
        // 3. 调用 .stream()，立即获取异步生成器（数据管道）。
        AsyncGenerator<NodeOutput> generator = compiledGraph.stream(input, config);
        
        // 4. 使用 forEachAsync 异步地消费管道中的每一个数据包。
        //    这会在一个单独的线程中执行，不会阻塞当前 Controller 线程。
        generator.forEachAsync(output -> {
            String content;
            // 检查数据包是否是特殊的 StreamingOutput 类型
            if (output instanceof StreamingOutput streamingOutput) {
                // 如果是，直接获取 LLM 的 token 块
                content = streamingOutput.chunk();
            } else {
                // 如果是普通节点，可以报告其执行状态
                content = "节点 '" + output.node() + "' 执行完成";
            }
            // 将内容包装成 SSE 事件，推送到 Sink 中
            sink.tryEmitNext(ServerSentEvent.builder(content).build());
        }).thenAccept(v -> {
            // 5. 当管道数据耗尽时（isDone() 为 true），关闭 Sink。
            sink.tryEmitComplete();
        }).exceptionally(e -> {
            // 6. 如果发生异常，则将错误推送到 Sink。
            sink.tryEmitError(e);
            return null;
        });

        // 7. 将 Sink 转换为 Flux<ServerSentEvent<String>> 并返回。
        return sink.asFlux();
    }
}
```

## 生产端：如何创建流式节点

`LlmNode` 天然支持流式输出。如果您想让自己的**自定义节点**也能够产生流式数据，核心在于让该节点的 `NodeAction` 返回一个包含 `AsyncGenerator` 实例的 `Map`。

`StreamingChatGenerator` 是一个关键的辅助工具类，它可以方便地将一个标准的 `Flux<ChatResponse>`（由 Spring AI `ChatClient` 的 `.stream()` 方法产生）适配为 `StateGraph` 所需的 `AsyncGenerator`。

```java
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.async.AsyncGenerator;
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import reactor.core.publisher.Flux;

import java.util.Map;

public class StreamingChatNode implements NodeAction {

    private final ChatClient chatClient;

    public StreamingChatNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = state.value("query", "");
        
        // 1. 调用 ChatClient 的流式方法，获取一个标准的 Reactor Flux 流。
        Flux<ChatResponse> chatResponseFlux = this.chatClient
            .prompt()
            .user(query)
            .stream()
            .chatResponse();

        // 2. 使用 StreamingChatGenerator 作为“适配器”来包装这个 Flux 流。
        AsyncGenerator<? extends NodeOutput> generator = StreamingChatGenerator.builder()
            .startingNode("chat_stream")  // 定义这个流的逻辑来源节点名
            .startingState(state)         // 传入当前状态，以便每个 NodeOutput 都包含它
            .mapResult(response -> {
                // 3. 定义当流结束时，如何将最终的完整响应映射回 OverAllState。
                String fullText = response.getResult().getOutput().getText();
                return Map.of("chat_response", fullText);
            })
            .build(chatResponseFlux); // 将 Flux<ChatResponse> 转换为 AsyncGenerator<NodeOutput>

        // 4. 返回一个 Map，其 value 是转换后的 AsyncGenerator。
        //    StateGraph 的执行引擎会识别这个特殊值，并开始将生成器中的内容流式地推送到下游。
        return Map.of("chat_response", generator);
    }
}
```

通过这种生产端和消费端的配合，您可以轻松构建出响应迅速、用户体验极佳的 AI 应用，让用户能够实时“看到”Agent 的思考和执行过程。
