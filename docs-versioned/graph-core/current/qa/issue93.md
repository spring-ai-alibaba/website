---
title: Function Calling 工具使用示例
description: 使用 Spring AI Alibaba 实现工具调用的完整示例
keywords: [Function Calling, 工具调用, Spring AI Alibaba, Tool, LLM工具]
---


本示例展示如何在 Spring AI Alibaba Graph 中使用 Function Calling 功能。

## 初始化配置

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;

private static final Logger log = LoggerFactory.getLogger("ToolCalling");
```

## 定义工具函数

```java
import java.util.function.Function;

public class SearchTool implements Function<SearchTool.Request, String> {

    public record Request(String query) {}

    @Override
    public String apply(Request request) {
        log.info("Searching for: {}", request.query());
        // 实际应用中应该调用真实的搜索 API
        return "Cold, with a low of 13 degrees";
    }
}
```

## 使用 ChatClient 进行 Function Calling

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.model.function.FunctionCallback;
import org.springframework.ai.model.function.FunctionCallbackWrapper;

// 创建工具函数
SearchTool searchTool = new SearchTool();

// 包装为 FunctionCallback
FunctionCallback searchCallback = FunctionCallbackWrapper.builder(searchTool)
    .withName("search")
    .withDescription("Use to surf the web, fetch current information, check the weather, and retrieve other information.")
    .build();

// 配置 ChatClient
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunctions(searchCallback)
    .build();

// 执行查询
String response = chatClient.prompt()
    .user("How is the weather in New York today?")
    .call()
    .content();

log.info("Response: {}", response);
```

## 在 Graph 节点中使用 Function Calling

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.OverAllState;
import org.springframework.ai.chat.client.ChatClient;
import java.util.Map;

class ToolCallingNode implements NodeAction {

    private final ChatClient chatClient;

    public ToolCallingNode(ChatClient.Builder chatClientBuilder, SearchTool tool) {
        // 配置工具
        FunctionCallback callback = FunctionCallbackWrapper.builder(tool)
            .withName("search")
            .withDescription("Search for information")
            .build();

        this.chatClient = chatClientBuilder
            .defaultFunctions(callback)
            .build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = (String) state.value("query")
            .orElseThrow(() -> new IllegalStateException("No query found"));

        // LLM 会自动决定是否调用工具
        String response = chatClient.prompt()
            .user(query)
            .call()
            .content();

        return Map.of("response", response);
    }
}
```

## 构建完整的 Graph

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
    return strategies;
};

// 创建工具和节点
SearchTool searchTool = new SearchTool();
var toolNode = nodeasync(new ToolCallingNode(chatClientBuilder, searchTool));

// 构建 Graph
var workflow = new StateGraph(keyStrategyFactory)
    .addNode("agent", toolNode)
    .addEdge(StateGraph.START, "agent")
    .addEdge("agent", StateGraph.END);

var app = workflow.compile();

// 执行
var result = app.invoke(Map.of("query", "How is the weather in New York today?"));
log.info("Final response: {}", result.value("response").orElse(""));
```

**输出**:
```
Searching for: weather in New York today
Final response: The current weather in New York is cold, with the temperature expected to drop to a low of 13 degrees.
```

## 多工具支持

```java
// 定义多个工具
class WeatherTool implements Function<WeatherTool.Request, String> {
    public record Request(String location) {}

    @Override
    public String apply(Request request) {
        return "Weather in " + request.location() + ": Sunny, 22°C";
    }
}

class CalculatorTool implements Function<CalculatorTool.Request, String> {
    public record Request(String expression) {}

    @Override
    public String apply(Request request) {
        // 简化的计算器
        return "Result: 42";
    }
}

// 配置多个工具
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunctions(
        FunctionCallbackWrapper.builder(new WeatherTool())
            .withName("get_weather")
            .withDescription("Get weather information")
            .build(),
        FunctionCallbackWrapper.builder(new CalculatorTool())
            .withName("calculate")
            .withDescription("Perform calculations")
            .build()
    )
    .build();
```

## 关键要点

1. **自动工具选择**: LLM 根据用户问题自动决定调用哪个工具
2. **类型安全**: 使用 Java Record 定义工具输入参数
3. **简洁API**: Spring AI 提供简洁的 Function Calling API
4. **可组合**: 可以在 Graph 节点中灵活使用工具

## 应用场景

- 天气查询系统
- 知识库检索
- 计算器和数学运算
- API 调用和数据获取
- 多步骤任务编排

## 相关文档

- [Spring AI Function Calling](https://docs.spring.io/spring-ai/reference/api/functions.html) - Spring AI 官方文档
- [快速入门](/workflow/graph/quick-guide) - Graph 基础使用
- [节点操作](/workflow/graph/node-action) - NodeAction 详解


**Initialize Logger**


```java
try( var file = new java.io.FileInputStream("./logging.properties")) {
    java.util.logging.LogManager.getLogManager().readConfiguration( file );
}

var log = org.slf4j.LoggerFactory.getLogger("default");

```


```java
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.ollama.OllamaStreamingChatModel;
import org.bsc.langgraph4j.action.AsyncEdgeAction;
import org.bsc.langgraph4j.action.AsyncNodeAction;
import org.bsc.langgraph4j.action.EdgeAction;
import org.bsc.langgraph4j.action.NodeAction;
import org.bsc.langgraph4j.langchain4j.generators.StreamingChatGenerator;
import org.bsc.langgraph4j.langchain4j.serializer.std.ChatMesssageSerializer;
import org.bsc.langgraph4j.langchain4j.serializer.std.ToolExecutionRequestSerializer;
import org.bsc.langgraph4j.langchain4j.tool.ToolNode;
import org.bsc.langgraph4j.prebuilt.MessagesState;
import org.bsc.langgraph4j.prebuilt.MessagesStateGraph;
import org.bsc.langgraph4j.serializer.std.ObjectStreamStateSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

static class SearchTool {
    @Tool("Use to surf the web, fetch current information, check the weather, and retrieve other information.")
    String execQuery(@P("The query to use in your search.") String query) {
        return "Cold, with a low of 13 degrees";
    }
}

void testToolsStreamingChat( String modelName ) throws Exception {
    // Setup streaming model
    var model = OllamaStreamingChatModel.builder()
            .baseUrl("http://localhost:11434")
            .temperature(0.5)
            .logRequests(true)
            .logResponses(true)
            .modelName( modelName )
            //.modelName("qwen2.5:7b")
            //.modelName("llama3.1:latest")
            .build();

    // Setup tools
    var tools = ToolNode.builder()
            .specification(new SearchTool())
            .build();

    // Setup serializers
    ObjectStreamStateSerializer<MessagesState<ChatMessage>> stateSerializer = new ObjectStreamStateSerializer<>(MessagesState::new);
    stateSerializer.mapper()
            .register(dev.langchain4j.agent.tool.ToolExecutionRequest.class, new ToolExecutionRequestSerializer())
            .register(ChatMessage.class, new ChatMesssageSerializer());

    // Define graph
    NodeAction<MessagesState<ChatMessage>> callModel = state -> {
        var generator = StreamingChatGenerator.<MessagesState<ChatMessage>>builder()
                .mapResult(response -> Map.of("messages", response.aiMessage()))
                .startingNode("agent")
                .startingState(state)
                .build();

        var parameters = ChatRequestParameters.builder()
                .toolSpecifications(tools.toolSpecifications())
                .build();
        var request = ChatRequest.builder()
                .messages(state.messages())
                .parameters(parameters)
                .build();

        model.chat(request, generator.handler());

        return Map.of("_streaming_messages", generator);
    };

    EdgeAction<MessagesState<ChatMessage>> routeMessage = state -> {
        var lastMessage = state.lastMessage()
                .orElseThrow(() -> new IllegalStateException("last message not found!"));

        if (lastMessage instanceof AiMessage message) {
            if (message.hasToolExecutionRequests()) {
                return "next";
            }
        }

        return "exit";
    };

    NodeAction<MessagesState<ChatMessage>> invokeTool = state -> {
        var lastMessage = state.lastMessage()
                .orElseThrow(() -> new IllegalStateException("last message not found!"));

        if (lastMessage instanceof AiMessage lastAiMessage) {
            var result = tools.execute(lastAiMessage.toolExecutionRequests(), null)
                    .orElseThrow(() -> new IllegalStateException("no tool found!"));

            return Map.of("messages", result);
        }

        throw new IllegalStateException("invalid last message");
    };

    var workflow = new MessagesStateGraph<>(stateSerializer)
            .addNode("agent", node_async(callModel))
            .addNode("tools", node_async(invokeTool))
            .addEdge(START, "agent")
            .addConditionalEdges("agent",
                    edge_async(routeMessage),
                    Map.of("next", "tools", "exit", END))
            .addEdge("tools", "agent");

    var app = workflow.compile();

    var output = app.stream(Map.of("messages", UserMessage.from("How is the weather in New York today?")));
    for (var out : output) {
        log.info("StreamingOutput: {}", out);
    }
}


```


```java
testToolsStreamingChat("qwen2.5:7b");
```

    START 
    StreamingOutput: NodeOutput{node=__START__, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}, chunk=} 
    ToolExecutionRequest id is null! 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}, chunk=} 
    ToolExecutionRequest id is null! 
    execute: execQuery 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }]}} 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=tools, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=The current weather in New York is cold, with the temperature expected to drop to a low of 13 degrees.} 
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = "The current weather in New York is cold, with the temperature expected to drop to a low of 13 degrees." toolExecutionRequests = null }]}} 
    StreamingOutput: NodeOutput{node=__END__, state={messages=[AiMessage { text = "The current weather in New York is cold, with the temperature expected to drop to a low of 13 degrees." toolExecutionRequests = null }]}} 



```java

testToolsStreamingChat("llama3.1:latest");
```

    START 
    StreamingOutput: NodeOutput{node=__START__, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}, chunk=} 
    ToolExecutionRequest id is null! 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[UserMessage { name = null contents = [TextContent { text = "How is the weather in New York today?" }] }]}, chunk=} 
    ToolExecutionRequest id is null! 
    execute: execQuery 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }]}} 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=tools, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "weather in New York today"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    execute: execQuery 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "New York weather forecast for the next 5 days"
    }" }] }]}} 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=tools, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "New York weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "New York weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "New York weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    execute: execQuery 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "London weather forecast for the next 5 days"
    }" }] }]}} 
    ToolExecutionRequest id is null! 
    ToolExecutionResultMessage id is null! 
    StreamingOutput: NodeOutput{node=tools, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "London weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}} 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "London weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    StreamingOutput: StreamingOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "execQuery", arguments = "{
      "query" : "London weather forecast for the next 5 days"
    }" }] }, ToolExecutionResultMessage { id = null toolName = "execQuery" text = "Cold, with a low of 13 degrees" }]}, chunk=} 
    ToolExecutionRequest id is null! 
    execute: getCurrencyRate 
    java.lang.IllegalStateException: no tool found! 
    java.util.concurrent.ExecutionException: java.lang.IllegalStateException: no tool found!
    	at java.base/java.util.concurrent.CompletableFuture.reportGet(CompletableFuture.java:396)
    	at java.base/java.util.concurrent.CompletableFuture.get(CompletableFuture.java:2073)
    	at org.bsc.langgraph4j.CompiledGraph$AsyncNodeGenerator.next(CompiledGraph.java:613)
    	at org.bsc.async.AsyncGenerator$WithEmbed.next(AsyncGenerator.java:101)
    	at org.bsc.async.InternalIterator.next(AsyncGenerator.java:398)
    	at REPL.$JShell$43.testToolsStreamingChat($JShell$43.java:97)
    	at REPL.$JShell$45.do_it$($JShell$45.java:14)
    	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
    	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
    	at java.base/java.lang.reflect.Method.invoke(Method.java:568)
    	at org.rapaio.jupyter.kernel.core.java.RapaioExecutionControl.lambda$execute$1(RapaioExecutionControl.java:58)
    	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:264)
    	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
    	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
    	at java.base/java.lang.Thread.run(Thread.java:833)
    Caused by: java.lang.IllegalStateException: no tool found!
    	at REPL.$JShell$43.lambda$testToolsStreamingChat$5($JShell$43.java:77)
    	at java.base/java.util.Optional.orElseThrow(Optional.java:403)
    	at REPL.$JShell$43.lambda$testToolsStreamingChat$6($JShell$43.java:77)
    	at org.bsc.langgraph4j.action.AsyncNodeAction.lambda$node_async$0(AsyncNodeAction.java:36)
    	at org.bsc.langgraph4j.action.AsyncNodeActionWithConfig.lambda$of$1(AsyncNodeActionWithConfig.java:53)
    	at org.bsc.langgraph4j.CompiledGraph$AsyncNodeGenerator.evaluateAction(CompiledGraph.java:517)
    	... 14 more
    
    StreamingOutput: NodeOutput{node=agent, state={messages=[AiMessage { text = null toolExecutionRequests = [ToolExecutionRequest { id = null, name = "getCurrencyRate", arguments = "{
      "amount" : "1000",
      "from_currency" : "USD",
      "to_currency" : "EUR"
    }" }] }]}} 
    ToolExecutionRequest id is null! 
    execute: getCurrencyRate 
    java.lang.IllegalStateException: no tool found! 
    java.util.concurrent.ExecutionException: java.lang.IllegalStateException: no tool found!
    	at java.base/java.util.concurrent.CompletableFuture.reportGet(CompletableFuture.java:396)
    	at java.base/java.util.concurrent.CompletableFuture.get(CompletableFuture.java:2073)
    	at org.bsc.langgraph4j.CompiledGraph$AsyncNodeGenerator.next(CompiledGraph.java:613)
    	at org.bsc.async.AsyncGenerator$WithEmbed.next(AsyncGenerator.java:101)
    	at org.bsc.async.InternalIterator.next(AsyncGenerator.java:398)
    	at REPL.$JShell$43.testToolsStreamingChat($JShell$43.java:97)
    	at REPL.$JShell$45.do_it$($JShell$45.java:14)
    	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
    	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
    	at java.base/java.lang.reflect.Method.invoke(Method.java:568)
    	at org.rapaio.jupyter.kernel.core.java.RapaioExecutionControl.lambda$execute$1(RapaioExecutionControl.java:58)
    	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:264)
    	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
    	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
    	at java.base/java.lang.Thread.run(Thread.java:833)
    Caused by: java.lang.IllegalStateException: no tool found!
    	at REPL.$JShell$43.lambda$testToolsStreamingChat$5($JShell$43.java:77)
    	at java.base/java.util.Optional.orElseThrow(Optional.java:403)
    	at REPL.$JShell$43.lambda$testToolsStreamingChat$6($JShell$43.java:77)
    	at org.bsc.langgraph4j.action.AsyncNodeAction.lambda$node_async$0(AsyncNodeAction.java:36)
    	at org.bsc.langgraph4j.action.AsyncNodeActionWithConfig.lambda$of$1(AsyncNodeActionWithConfig.java:53)
    	at org.bsc.langgraph4j.CompiledGraph$AsyncNodeGenerator.evaluateAction(CompiledGraph.java:517)
    	... 14 more
    



    java.util.concurrent.CompletionException: java.util.concurrent.ExecutionException: java.lang.IllegalStateException: no tool found!
    

       at java.base/java.util.concurrent.CompletableFuture.reportJoin(CompletableFuture.java:413)

       at java.base/java.util.concurrent.CompletableFuture.join(CompletableFuture.java:2118)

       at org.bsc.async.InternalIterator.next(AsyncGenerator.java:400)

       at .testToolsStreamingChat(#43:84)

    |    void testToolsStreamingChat( String modelName ) throws Exception {

    |        // Setup streaming model

    |        var model = OllamaStreamingChatModel.builder()

    |                .baseUrl("http://localhost:11434")

    |                .temperature(0.5)

    |                .logRequests(true)

    |                .logResponses(true)

    |                .modelName( modelName )

    |                //.modelName("qwen2.5:7b")

    |                //.modelName("llama3.1:latest")

    |                .build();

    |    

    |        // Setup tools

    |        var tools = ToolNode.builder()

    |                .specification(new SearchTool())

    |                .build();

    |    

    |        // Setup serializers

    |        ObjectStreamStateSerializer<MessagesState<ChatMessage>> stateSerializer = new ObjectStreamStateSerializer<>(MessagesState::new);

    |        stateSerializer.mapper()

    |                .register(dev.langchain4j.agent.tool.ToolExecutionRequest.class, new ToolExecutionRequestSerializer())

    |                .register(ChatMessage.class, new ChatMesssageSerializer());

    |    

    |        // Define graph

    |        NodeAction<MessagesState<ChatMessage>> callModel = state -> {

    |            var generator = StreamingChatGenerator.<MessagesState<ChatMessage>>builder()

    |                    .mapResult(response -> Map.of("messages", response.aiMessage()))

    |                    .startingNode("agent")

    |                    .startingState(state)

    |                    .build();

    |    

    |            var parameters = ChatRequestParameters.builder()

    |                    .toolSpecifications(tools.toolSpecifications())

    |                    .build();

    |            var request = ChatRequest.builder()

    |                    .messages(state.messages())

    |                    .parameters(parameters)

    |                    .build();

    |    

    |            model.chat(request, generator.handler());

    |    

    |            return Map.of("_streaming_messages", generator);

    |        };

    |    

    |        EdgeAction<MessagesState<ChatMessage>> routeMessage = state -> {

    |            var lastMessage = state.lastMessage()

    |                    .orElseThrow(() -> new IllegalStateException("last message not found!"));

    |    

    |            if (lastMessage instanceof AiMessage message) {

    |                if (message.hasToolExecutionRequests()) {

    |                    return "next";

    |                }

    |            }

    |    

    |            return "exit";

    |        };

    |    

    |        NodeAction<MessagesState<ChatMessage>> invokeTool = state -> {

    |            var lastMessage = state.lastMessage()

    |                    .orElseThrow(() -> new IllegalStateException("last message not found!"));

    |    

    |            if (lastMessage instanceof AiMessage lastAiMessage) {

    |                var result = tools.execute(lastAiMessage.toolExecutionRequests(), null)

    |                        .orElseThrow(() -> new IllegalStateException("no tool found!"));

    |    

    |                return Map.of("messages", result);

    |            }

    |    

    |            throw new IllegalStateException("invalid last message");

    |        };

    |    

    |        var workflow = new MessagesStateGraph<>(stateSerializer)

    |                .addNode("agent", node_async(callModel))

    |                .addNode("tools", node_async(invokeTool))

    |                .addEdge(START, "agent")

    |                .addConditionalEdges("agent",

    |                        edge_async(routeMessage),

    |                        Map.of("next", "tools", "exit", END))

    |                .addEdge("tools", "agent");

    |    

    |        var app = workflow.compile();

    |    

    |        var output = app.stream(Map.of("messages", UserMessage.from("How is the weather in New York today?")));

    |-->     for (var out : output) {

    |            log.info("StreamingOutput: {}", out);

    |        }

    |    }

       at .(#45:1)

    |--> testToolsStreamingChat("llama3.1:latest");

