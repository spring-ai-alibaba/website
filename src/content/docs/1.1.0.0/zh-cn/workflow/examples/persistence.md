---
title: 为图添加持久化（记忆）
description: 学习如何使用Checkpointer为StateGraph提供持久化记忆，跨多个交互共享上下文
keywords: [持久化, Persistence, 记忆, Checkpointer, MemorySaver, StateGraph, 状态持久化]
---

# 为图添加持久化（"记忆"）

许多 AI 应用程序需要记忆来跨多个交互共享上下文。在 Spring AI Alibaba 中，通过 [`Checkpointers`] 为任何 [`StateGraph`] 提供记忆。

[`StateGraph`]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/src/main/java/com/alibaba/cloud/ai/graph/StateGraph.java
[`Checkpointers`]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/src/main/java/com/alibaba/cloud/ai/graph/checkpoint/Checkpoint.java
[`Checkpointer`]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/src/main/java/com/alibaba/cloud/ai/graph/checkpoint/Checkpoint.java
[`MemorySaver`]: https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/src/main/java/com/alibaba/cloud/ai/graph/checkpoint/savers/MemorySaver.java

## 配置持久化

在创建任何 Spring AI Alibaba 工作流时，您可以通过以下方式设置持久化：

1. 创建一个 [`Checkpointer`]，例如 [`MemorySaver`]
2. 在编译图时通过配置传递您的 [`Checkpointers`]

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;

// 创建内存持久化器
var checkpointer = new MemorySaver();

// 编译图时配置持久化
var compileConfig = CompileConfig.builder()
    .checkpointSaver(checkpointer)
    .build();

CompiledGraph graph = stateGraph.compile(compileConfig);
```

## 状态定义

状态是一个数据结构，在图中的所有节点之间共享。Spring AI Alibaba 使用 `OverAllState`：

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import java.util.Map;
import java.util.HashMap;

// 配置状态键策略
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
    keyStrategyHashMap.put("messages", new AppendStrategy());
    keyStrategyHashMap.put("user_input", new ReplaceStrategy());
    return keyStrategyHashMap;
};
```

## 序列化器

Spring AI Alibaba 使用 JSON 序列化器来处理状态持久化：

```java
import com.alibaba.cloud.ai.graph.serializer.plain_text.PlainTextStateSerializer;

// Spring AI Alibaba 默认使用 JSON 序列化
var stateSerializer = new PlainTextStateSerializer();
```

## 完整示例

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

// 创建 Graph
StateGraph builder = new StateGraph(keyStrategyFactory)
    .addNode("step1", nodeasync(state -> {
        return Map.of("messages", "Step 1 result");
    }))
    .addNode("step2", nodeasync(state -> {
        return Map.of("messages", "Step 2 result");
    }))
    .addEdge(StateGraph.START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", StateGraph.END);

// 配置持久化
var checkpointer = new MemorySaver();
var compileConfig = CompileConfig.builder()
    .checkpointSaver(checkpointer)
    .build();

CompiledGraph graph = builder.compile(compileConfig);

// 第一次执行 - 使用 threadId 标识会话
var config1 = RunnableConfig.builder()
    .threadId("conversation-1")
    .build();

graph.invoke(Map.of("messages", "初始输入"), config1);

// 第二次执行 - 使用相同的 threadId，状态会被保留
graph.invoke(Map.of("messages", "后续输入"), config1);

// 新会话 - 使用不同的 threadId
var config2 = RunnableConfig.builder()
    .threadId("conversation-2")
    .build();

graph.invoke(Map.of("messages", "新会话输入"), config2);
```

## 检索和管理状态

```java
// 获取当前状态
StateSnapshot snapshot = graph.getState(config1);
System.out.println("Current state: " + snapshot.state());

// 获取状态历史
List<StateSnapshot> history = graph.getStateHistory(config1);
history.forEach(s -> System.out.println("Historical state: " + s));
```

## 关键特性

1. **会话隔离**: 使用不同的 `threadId` 创建独立的会话
2. **状态恢复**: 相同 `threadId` 可以恢复之前的状态
3. **历史追踪**: 可以查看状态的历史版本
4. **内存高效**: `MemorySaver` 适合开发和测试
5. **可扩展**: 可以实现自定义 `Checkpointer` 用于持久化存储

## 应用场景

- 多轮对话记忆
- 工作流状态恢复
- A/B 测试对比
- 错误恢复和重试
- 审计和调试

## 相关文档

- [等待用户输入](/workflow/examples/wait-user-input) - 中断和恢复示例
- [时光旅行](/workflow/examples/time-travel) - 状态历史导航
- [快速入门](/workflow/graph/quick-guide) - Graph 基础使用

```

## Test function calling


```java
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.agent.tool.ToolSpecifications;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;

var llm = new LLM();

var tools = ToolSpecifications.toolSpecificationsFrom( SearchTool.class );

## 测试函数调用

var request = ChatRequest.builder()
                .messages( userMessage )
                .build();

var result = model.chat(request );

result.aiMessage();
```




    AiMessage { text = "I'm unable to provide real-time weather forecasts. For the most accurate and up-to-date weather information, please check a reliable weather website or app." toolExecutionRequests = null }



## Define the graph

We can now put it all together. We will run it first without a checkpointer:



```java
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.StateGraph.END;
import org.bsc.langgraph4j.StateGraph;
import org.bsc.langgraph4j.action.EdgeAction;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import org.bsc.langgraph4j.action.NodeAction;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
## 定义图

我们现在可以将所有内容放在一起。我们将首先在没有 checkpointer 的情况下运行它：
EdgeAction<MessageState> routeMessage = state -> {
  
  var lastMessage = state.lastMessage();
  
  if ( !lastMessage.isPresent()) return "exit";

  var message = (AiMessage)lastMessage.get();

  // If tools should be called
  if ( message.hasToolExecutionRequests() ) return "next";
  
  // If no tools are called, we can finish (respond to the user)
  return "exit";
};

// Call Model
NodeAction<MessageState> callModel = state -> {
  

  var request = ChatRequest.builder()
                .messages( state.messages() )
                .build();

  var response = model.chat(request );

  return Map.of( "messages", response.aiMessage() );
};

var searchTool = new SearchTool();


// Invoke Tool 
NodeAction<MessageState> invokeTool = state -> {

  var lastMessage = (AiMessage)state.lastMessage()
                          .orElseThrow( () -> ( new IllegalStateException( "last message not found!")) );

  var executionRequest = lastMessage.toolExecutionRequests().get(0);

  var executor = new DefaultToolExecutor( searchTool, executionRequest );

  var result = executor.execute( executionRequest, null );

  return Map.of( "messages", AiMessage.from( result ) );
};

// Define Graph

var workflow = new StateGraph<MessageState> ( MessageState.SCHEMA, stateSerializer )
  .addNode("agent", node_async(callModel) )
  .addNode("tools", node_async(invokeTool) )
  .addEdge(START, "agent")
  .addConditionalEdges("agent", edge_async(routeMessage), Map.of( "next", "tools", "exit", END ))
  .addEdge("tools", "agent");

var graph = workflow.compile();
```


```java

Map<String,Object> inputs = Map.of( "messages", AiMessage.from("Hi I'm Bartolo, niced to meet you.") );

var result = graph.stream( inputs );

for( var r : result ) {
  System.out.println( r.node() );
  if( r.node().equals("agent")) {
    System.out.println( r.state() );
  }
}
```

    __START__
    agent
    {messages=[AiMessage { text = "Hi I'm Bartolo, niced to meet you." toolExecutionRequests = null }, AiMessage { text = "Hello Bartolo, nice to meet you too! How can I assist you today?" toolExecutionRequests = null }]}
    __END__



```java

Map<String,Object> inputs = Map.of( "messages", AiMessage.from("Remember my name?") );

var result = graph.stream( inputs );

for( var r : result ) {
  System.out.println( r.node() );
  if( r.node().equals("agent")) {
    System.out.println( r.state() );
  }
}
```

    __START__
    agent
    {messages=[AiMessage { text = "Remember my name?" toolExecutionRequests = null }, AiMessage { text = "I'm sorry, but I don't have the ability to remember personal information or previous interactions. How can I assist you today?" toolExecutionRequests = null }]}
    __END__


## Add Memory

Let's try it again with a checkpointer. We will use the
[`MemorySaver`],
which will "save" checkpoints in-memory.

[`MemorySaver`]: https://langgraph4j.github.io/langgraph4j/apidocs/org/bsc/langgraph4j/checkpoint/MemorySaver.html


```java
import org.bsc.langgraph4j.checkpoint.MemorySaver; 
import org.bsc.langgraph4j.CompileConfig; 

// Here we only save in-memory
var memory = new MemorySaver();

var compileConfig = CompileConfig.builder()
                    .checkpointSaver(memory)
                    .build();

var persistentGraph = workflow.compile( compileConfig );
```


```java
import org.bsc.langgraph4j.RunnableConfig;

var runnableConfig =  RunnableConfig.builder()
                .threadId("conversation-num-1" )
                .build();

Map<String,Object> inputs = Map.of( "messages", AiMessage.from("Hi I'm Bartolo, niced to meet you.") );

var result = persistentGraph.stream( inputs, runnableConfig );

for( var r : result ) {
  System.out.println( r.node() );
  if( r.node().equals("agent")) {
    System.out.println( r.state().lastMessage().orElse(null) );
  }
}
```

    __START__
    agent
    AiMessage { text = "Hello Bartolo, nice to meet you too! How can I assist you today?" toolExecutionRequests = null }
    __END__



```java

Map<String,Object> inputs = Map.of( "messages", AiMessage.from("Remember my name?") );

var result = persistentGraph.stream( inputs, runnableConfig );

for( var r : result ) {
  System.out.println( r.node() );
  if( r.node().equals("agent")) {
    System.out.println( r.state().lastMessage().orElse(null) );
  }
}
```

    __START__
    agent
    AiMessage { text = "I'm sorry, but I can't remember personal information like names between interactions. However, I'm here to help with any questions or information you need!" toolExecutionRequests = null }
    __END__


## New Conversational Thread

If we want to start a new conversation, we can pass in a different
**`thread_id`**. Poof! All the memories are gone (just kidding, they'll always
live in that other thread)!



```java
runnableConfig =  RunnableConfig.builder()
                .threadId("conversation-2" )
                .build();
```


```java
inputs = Map.of( "messages", AiMessage.from("you know my name?") );

var result = persistentGraph.stream( inputs, runnableConfig );

for( var r : result ) {
  System.out.println( r.node() );
  if( r.node().equals("agent")) {
    System.out.println( r.state().lastMessage().orElse(null) );
  }
}
```

    __START__
    agent
    AiMessage { text = "No, I don't know your name. I don't have access to personal data about users unless it has been shared with me in the course of our conversation. If you have any questions or need assistance, feel free to ask!" toolExecutionRequests = null }
    __END__

