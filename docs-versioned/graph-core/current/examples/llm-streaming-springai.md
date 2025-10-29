---
title: Spring AI Alibaba LLM 流式集成
description: 学习如何在 Spring AI Alibaba Graph 中使用 LLM 流式输出功能
keywords: [LLM Streaming, 流式输出, Spring AI Alibaba, Graph, 流式响应, 实时响应]
---

# Spring AI Alibaba Graph 中的 LLM 流式输出

## 初始化配置
**Initialize Logger**

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
    java.util.logging.LogManager.getLogManager().readConfiguration( file );
private static final Logger log = LoggerFactory.getLogger("llm-streaming");

var log = org.slf4j.LoggerFactory.getLogger("llm-streaming");
```

## 使用流式 ChatClient
## How to use StreamingChatGenerator
Spring AI Alibaba 支持通过 `ChatClient` 进行流式输出。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import org.reactivestreams.Publisher;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.tool.function.FunctionToolCallback;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.function.UnaryOperator;

import static java.util.Optional.ofNullable;
import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

enum AiModel {

        OPENAI_GPT_4O_MINI(
                OpenAiChatModel.builder()
                        .openAiApi(OpenAiApi.builder()
                                .baseUrl("https://api.openai.com")
                                .apiKey(System.getenv("OPENAI_API_KEY"))
                                .build())
                        .defaultOptions(OpenAiChatOptions.builder()
                                .model("gpt-4o-mini")
                                .logprobs(false)
                                .temperature(0.1)
// 配置 ChatClient（使用通义千问）
ChatClient chatClient = ChatClient.builder(chatModel)
        .defaultSystem("You are a helpful AI Assistant answering questions.")

for( var item : generator ) {
// 使用流式输出
Flux<ChatResponse> flux = chatClient.prompt()
        .user("tell me a joke")

        .chatResponse();
    Received: StreamingOutput{node=agent, state=null, chunk=Sure}
// 订阅流式响应
flux.subscribe(
    response -> {
        String content = response.getResult().getOutput().getContent();
        System.out.println("Chunk: " + content);
    },
    error -> log.error("Error: ", error),
    () -> log.info("Stream completed")
);
    Received: StreamingOutput{node=agent, state=null, chunk= light}
// 或者使用 Reactor 的阻塞式处理
flux.collectList().block().forEach(response -> {
    System.out.println("Received: " + response.getResult().getOutput().getContent());
});
```

```
    Received: StreamingOutput{node=agent, state=null, chunk=:

    }
    Received: StreamingOutput{node=agent, state=null, chunk=Why}
    Received: StreamingOutput{node=agent, state=null, chunk= don}
    Received: StreamingOutput{node=agent, state=null, chunk='t}
    Received: StreamingOutput{node=agent, state=null, chunk= scientists}
    Received: StreamingOutput{node=agent, state=null, chunk= trust}
    Received: StreamingOutput{node=agent, state=null, chunk= atoms}
    Received: StreamingOutput{node=agent, state=null, chunk=?

    }
    Received: StreamingOutput{node=agent, state=null, chunk=Because}
    Received: StreamingOutput{node=agent, state=null, chunk= they}
    Received: StreamingOutput{node=agent, state=null, chunk= make}
    Received: StreamingOutput{node=agent, state=null, chunk= up}
    Received: StreamingOutput{node=agent, state=null, chunk= everything}
    Received: StreamingOutput{node=agent, state=null, chunk=!}
    Received: StreamingOutput{node=agent, state=null, chunk=}
```

## Use StreamingChatGenerator in Agent Executor

## Set up the agent's tools



```java
public class WeatherTool {

**输出示例**:
```
Chunk: Sure
Chunk: ,
Chunk:  here
Chunk: 's
Chunk:  a
Chunk:  joke
Chunk:  for
Chunk:  you
Chunk: :

Chunk: Why
Chunk:  don
Chunk: 't
Chunk:  scientists
Chunk:  trust
Chunk:  atoms
Chunk: ?

Chunk: Because
Chunk:  they
Chunk:  make
Chunk:  up
Chunk:  everything
Chunk: !
Stream completed
```

var state = result.stream()
## 在 Graph 节点中使用流式输出
                }
### 定义工具函数
                        System.out.println(s.node());
                }
import java.util.function.Function;
        .reduce((a, b) -> b)
public class WeatherTool implements Function<WeatherTool.Request, String> {

    public record Request(String location) {}

    @Override
    public String apply(Request request) {
        // 实际应用中，这里应该调用真实的天气 API
log.info( "result: {}", state.lastMessage()
                                .map(AssistantMessage.class::cast)
                                .map(AssistantMessage::getText)
                                .orElseThrow() );
```
### 创建带流式输出的 Graph 节点
    START
参考 [节点流式输出文档](../core/streaming) 获取完整示例。
    callAgent

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;
    agent
public class StreamingAgentNode implements NodeAction {

    private final ChatClient chatClient;

    public StreamingAgentNode(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String userMessage = (String) state.value("query").orElse("Hello");

        // 使用流式输出
        Flux<String> contentFlux = chatClient.prompt()
            .user(userMessage)
            .stream()
            .content();

        // 收集所有内容块
        StringBuilder fullContent = new StringBuilder();
        contentFlux.subscribe(
            chunk -> {
                System.out.print(chunk); // 实时输出
                fullContent.append(chunk);
            }
        );

        // 等待流完成并返回结果
        String result = contentFlux.collectList()
            .block()
            .stream()
            .collect(Collectors.joining());

        return Map.of("answer", result);
    }
}
```

### 配置和运行

```java
// 配置 Graph
StateGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("agent", nodeasync(new StreamingAgentNode(chatClientBuilder)))
    .addEdge(StateGraph.START, "agent")
    .addEdge("agent", StateGraph.END);

CompiledGraph compiledGraph = graph.compile();

// 执行
Map<String, Object> input = Map.of("query", "Weather in Napoli?");
OverAllState result = compiledGraph.invoke(input);

System.out.println("Final result: " + result.value("answer").orElse(""));
```

**输出示例**:
```
The weather in Napoli is currently cold, with a low of 13 degrees Celsius.
Final result: The weather in Napoli is currently cold, with a low of 13 degrees Celsius.
```

## 相关文档

- [节点流式输出](../core/streaming) - 完整的流式输出示例
- [快速入门](../quick-start) - Graph 基础使用
- [Spring AI 文档](https://docs.spring.io/spring-ai/reference/) - Spring AI 官方文档
