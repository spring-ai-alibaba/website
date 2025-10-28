---
title: 流式输出与图中断
description: 学习如何在Spring AI Alibaba中使用流式输出并实现图中断功能
keywords: [流式输出, Streaming, 中断, Interrupt, Graph中断, Spring AI Alibaba]
---


本示例展示如何在 Spring AI Alibaba Graph 中使用流式输出，并在需要时中断执行。

## 初始化配置

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = LoggerFactory.getLogger("StreamingInterrupt");
```

## 流式输出节点

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.OverAllState;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;
import java.util.Map;

class StreamingNode implements NodeAction {

    private final ChatClient chatClient;

    public StreamingNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = (String) state.value("query")
            .orElseThrow(() -> new IllegalStateException("No query found"));

        log.info("Processing query: {}", query);

        // 使用流式输出
        Flux<String> contentFlux = chatClient.prompt()
            .user(query)
            .stream()
            .content();

        // 收集所有内容块并实时输出
        StringBuilder fullContent = new StringBuilder();
        contentFlux.subscribe(
            chunk -> {
                System.out.print(chunk); // 实时输出每个 chunk
                fullContent.append(chunk);
            }
        );

        // 等待流完成
        String result = contentFlux.collectList()
            .block()
            .stream()
            .collect(java.util.stream.Collectors.joining());

        System.out.println(); // 换行

        return Map.of("response", result);
    }
}
```

## 带中断的流式输出

```java
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;

class InterruptibleStreamingNode implements NodeAction {

    private final ChatClient chatClient;
    private volatile boolean shouldStop = false;

    public InterruptibleStreamingNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public void interrupt() {
        this.shouldStop = true;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = (String) state.value("query")
            .orElseThrow();

        shouldStop = false; // 重置中断标志

        Flux<String> contentFlux = chatClient.prompt()
            .user(query)
            .stream()
            .content();

        StringBuilder fullContent = new StringBuilder();

        // 处理流式输出，支持中断
        contentFlux.subscribe(
            chunk -> {
                if (shouldStop) {
                    log.info("Stream interrupted!");
                    return;
                }
                System.out.print(chunk);
                fullContent.append(chunk);
            },
            error -> log.error("Error during streaming", error),
            () -> log.info("Streaming completed")
        );

        // 等待完成或中断
        try {
            String result = contentFlux
                .takeUntil(chunk -> shouldStop) // 中断条件
                .collectList()
                .block()
                .stream()
                .collect(java.util.stream.Collectors.joining());

            return Map.of(
                "response", result,
                "interrupted", shouldStop
            );
        } catch (Exception e) {
            log.error("Error", e);
            return Map.of("error", e.getMessage());
        }
    }
}
```

## 构建带中断的 Graph

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;
import java.util.HashMap;

// 配置状态
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("query", new ReplaceStrategy());
    strategies.put("response", new ReplaceStrategy());
    strategies.put("interrupted", new ReplaceStrategy());
    return strategies;
};

// 创建可中断的流式节点
var streamingNode = new InterruptibleStreamingNode(chatClientBuilder);

// 后续处理节点
var summaryNode = nodeasync(state -> {
    String response = (String) state.value("response").orElse("");
    Boolean interrupted = (Boolean) state.value("interrupted").orElse(false);

    if (interrupted) {
        log.info("Skipping summary due to interruption");
    } else {
        log.info("Creating summary for: {}", response);
    }

    return Map.of("summary", interrupted ? "Interrupted" : "Summary created");
});

// 构建 Graph
var workflow = new StateGraph(keyStrategyFactory)
    .addNode("streaming", nodeasync(streamingNode))
    .addNode("summary", summaryNode)
    .addEdge(StateGraph.START, "streaming")
    .addEdge("streaming", "summary")
    .addEdge("summary", StateGraph.END);

// 配置 checkpoint 支持中断恢复
var checkpointer = new MemorySaver();
var compileConfig = CompileConfig.builder()
    .checkpointSaver(checkpointer)
    .interruptBefore("summary") // 在 summary 前可以中断
    .build();

var app = workflow.compile(compileConfig);
```

## 测试流式输出

```java
var config = RunnableConfig.builder()
    .threadId("streaming-session-1")
    .build();

// 在新线程中执行
Thread executionThread = new Thread(() -> {
    try {
        var result = app.invoke(
            Map.of("query", "Generate a long UUID explanation for me"),
            config
        );
        log.info("Final result: {}", result.value("response").orElse(""));
    } catch (Exception e) {
        log.error("Error during execution", e);
    }
});

executionThread.start();

// 3秒后中断
Thread.sleep(3000);
log.info("Interrupting stream...");
streamingNode.interrupt();

executionThread.join();
```

**输出**:
```
Processing query: Generate a long UUID explanation for me
A UUID (Universally Unique Identifier) is a 128-bit...
Interrupting stream...
Stream interrupted!
Skipping summary due to interruption
```

## 使用 Checkpoint 中断和恢复

```java
// 第一次执行
var config = RunnableConfig.builder()
    .threadId("checkpoint-session")
    .build();

// 执行到 summary 前中断
for (var output : app.stream(Map.of("query", "Explain UUID"), config)) {
    log.info("Output: {}", output);
}

// 检查状态
var state = app.getState(config);
log.info("Next node: {}", state.getNext());
log.info("Current response: {}", state.state().get("response"));

// 用户可以决定是否继续
boolean shouldContinue = true; // 或基于用户输入

if (shouldContinue) {
    // 继续执行
    var finalResult = app.invoke(null, config);
    log.info("Final result: {}", finalResult.value("summary").orElse(""));
} else {
    // 放弃执行
    log.info("User cancelled execution");
}
```

## 完整示例

```java
public class StreamingInterruptExample {

    public static void main(String[] args) throws Exception {
        // 配置
        ChatClient.Builder builder = ChatClient.builder(chatModel);
        var streamingNode = new InterruptibleStreamingNode(builder);

        // 构建 Graph（如上所示）
        var app = workflow.compile(compileConfig);

        // 并发执行和中断演示
        ExecutorService executor = Executors.newSingleThreadExecutor();

        var config = RunnableConfig.builder()
            .threadId("demo")
            .build();

        Future<?> future = executor.submit(() -> {
            app.invoke(Map.of("query", "Write a long story"), config);
        });

        // 等待一段时间后中断
        Thread.sleep(2000);
        log.info("Sending interrupt signal...");
        streamingNode.interrupt();

        // 等待完成
        future.get();
        executor.shutdown();
    }
}
```

## 关键要点

1. **流式输出**: 使用 `Flux<String>` 实现实时输出
2. **可中断**: 通过标志位或 `takeUntil` 实现中断
3. **Checkpoint 中断**: 使用 `interruptBefore` 在节点前中断
4. **状态恢复**: 中断后可以检查状态并决定是否继续

## 应用场景

- 长文本生成的提前终止
- 用户取消操作
- 超时控制
- 资源限制保护
- 交互式内容生成

## 相关文档

- [流式输出](/workflow/graph/streaming) - 流式输出详解
- [等待用户输入](/workflow/examples/wait-user-input) - 中断和恢复
- [Checkpoint 机制](/workflow/graph/checkpoint) - Checkpoint 详解


**Initialize Logger**


```java
try( var file = new java.io.FileInputStream("./logging.properties")) {
    java.util.logging.LogManager.getLogManager().readConfiguration( file );
}

var log = org.slf4j.LoggerFactory.getLogger("issue118");
```

## Use StreamingChatGenerator in Agent

### Define Graph State


```java
import org.bsc.langgraph4j.prebuilt.MessagesState;
import dev.langchain4j.data.message.ChatMessage;

class State extends MessagesState<ChatMessage> {
    public State( Map<String, Object> initData ) {
        super( initData );
    }
}
```

### Setup Graph


```java

import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.ollama.OllamaStreamingChatModel;
import org.bsc.langgraph4j.action.NodeAction;
import org.bsc.langgraph4j.langchain4j.generators.StreamingChatGenerator;
import org.bsc.langgraph4j.langchain4j.serializer.std.LC4jStateSerializer;
import org.bsc.langgraph4j.streaming.StreamingOutput;
import org.bsc.langgraph4j.StateGraph;
import java.util.Map;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;


var model = OllamaStreamingChatModel.builder()
        .baseUrl("http://localhost:11434")
        .temperature(0.0)
        .logRequests(true)
        .logResponses(true)
        .modelName("llama3.1:latest")
        .build();

NodeAction<State> calculationNode = state -> {

        log.trace("calculationNode: {}", state.messages());

        var generator = StreamingChatGenerator.<State>builder()
        .mapResult(response -> Map.of("messages", response.aiMessage()))
        .startingNode("calculation")
        .startingState(state)
        .build();

        var request = ChatRequest.builder()
        .messages(state.messages())
        .build();

        model.chat(request, generator.handler());

        return Map.of("_streaming_messages", generator);
};

NodeAction<State> summaryNode = state -> {
        log.trace("summaryNode: {}", state.messages());

        var lastMessage = state.lastMessage().orElseThrow();

        return Map.of();
};

var stateSerializer = new LC4jStateSerializer<State>(State::new);

// Define Graph
var workflow = new StateGraph<State>(State.SCHEMA, stateSerializer)
        .addNode("calculation", node_async(calculationNode))
        .addNode("summary", node_async(summaryNode))
        .addEdge(START, "calculation")
        .addEdge("calculation", "summary" )
        .addEdge("summary", END);



```

### Execute Graph


```java

var app = workflow.compile();

for( var out : app.stream( Map.of( "messages", UserMessage.from( "generate a UUID for me")) ) ) {
        
        if( out instanceof StreamingOutput streaming ) {
                log.info( "StreamingOutput{node={}, chunk={} }", streaming.node(), streaming.chunk() );
        }
        else {
                log.info( "{} - {}", out.node(), out.state().lastMessage().orElseThrow() );
        }
}
```

```
    START 
    __START__ - UserMessage { name = null contents = [TextContent { text = "generate a UUID for me" }] } 
    StreamingOutput{node=calculation, chunk=` } 
    StreamingOutput{node=calculation, chunk=4 } 
    StreamingOutput{node=calculation, chunk=c } 
    StreamingOutput{node=calculation, chunk=9 } 
    StreamingOutput{node=calculation, chunk=f } 
    StreamingOutput{node=calculation, chunk=2 } 
    StreamingOutput{node=calculation, chunk=e } 
    StreamingOutput{node=calculation, chunk=5 } 
    StreamingOutput{node=calculation, chunk=d } 
    StreamingOutput{node=calculation, chunk=- } 
    StreamingOutput{node=calculation, chunk=1 } 
    StreamingOutput{node=calculation, chunk=b } 
    StreamingOutput{node=calculation, chunk=3 } 
    StreamingOutput{node=calculation, chunk=a } 
    StreamingOutput{node=calculation, chunk=- } 
    StreamingOutput{node=calculation, chunk=4 } 
    StreamingOutput{node=calculation, chunk=c } 
    StreamingOutput{node=calculation, chunk=6 } 
    StreamingOutput{node=calculation, chunk=f } 
    StreamingOutput{node=calculation, chunk=-b } 
    StreamingOutput{node=calculation, chunk=7 } 
    StreamingOutput{node=calculation, chunk=a } 
    StreamingOutput{node=calculation, chunk=8 } 
    StreamingOutput{node=calculation, chunk=- } 
    StreamingOutput{node=calculation, chunk=0 } 
    StreamingOutput{node=calculation, chunk=e } 
    StreamingOutput{node=calculation, chunk=92 } 
    StreamingOutput{node=calculation, chunk=c } 
    StreamingOutput{node=calculation, chunk=43 } 
    StreamingOutput{node=calculation, chunk=f } 
    StreamingOutput{node=calculation, chunk=4 } 
    StreamingOutput{node=calculation, chunk=c } 
    StreamingOutput{node=calculation, chunk=55 } 
    StreamingOutput{node=calculation, chunk=` } 
    StreamingOutput{node=calculation, chunk= } 
    calculation - AiMessage { text = "`4c9f2e5d-1b3a-4c6f-b7a8-0e92c43f4c55`" toolExecutionRequests = null } 
    summary - AiMessage { text = "`4c9f2e5d-1b3a-4c6f-b7a8-0e92c43f4c55`" toolExecutionRequests = null } 
    __END__ - AiMessage { text = "`4c9f2e5d-1b3a-4c6f-b7a8-0e92c43f4c55`" toolExecutionRequests = null } 
```
