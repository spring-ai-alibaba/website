---
title: 子图条件路由示例
description: 使用 Spring AI Alibaba 实现子图的条件路由示例
keywords: [子图, Subgraph, 条件路由, Conditional Edge, Spring AI Alibaba]
---


本示例展示如何在 Spring AI Alibaba Graph 中使用条件边来路由到不同的子图。

## 初始化配置

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = LoggerFactory.getLogger("SubgraphRouting");
```

## 定义状态

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import java.util.Map;
import java.util.Optional;

class RoutingState extends OverAllState {

    public RoutingState(Map<String, Object> initData) {
        super(initData);
    }

    public Optional<String> intent() {
        return value("intent");
    }

    public Optional<String> step() {
        return value("step");
    }
}
```

## 定义子图

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;
import java.util.HashMap;

// 配置子图状态策略
KeyStrategyFactory subKeyFactory = () -> {
    HashMap<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("step", new ReplaceStrategy());
    strategies.put("intent", new ReplaceStrategy());
    return strategies;
};

// SubGraph1 - 用于解释意图
StateGraph subGraph1 = new StateGraph(subKeyFactory)
    .addNode("work", nodeasync(state -> {
        log.info("SubGraph1 working...");
        return Map.of("step", "work1");
    }))
    .addEdge(StateGraph.START, "work")
    .addEdge("work", StateGraph.END);

// SubGraph2 - 用于查询意图
StateGraph subGraph2 = new StateGraph(subKeyFactory)
    .addNode("work", nodeasync(state -> {
        log.info("SubGraph2 working...");
        return Map.of("step", "work2");
    }))
    .addEdge(StateGraph.START, "work")
    .addEdge("work", StateGraph.END);
```

## 定义意图识别节点

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;

class IntentRecognizeNode implements NodeAction {

    private String intent;

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public String getIntent() {
        return intent;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        log.info("Recognizing intent: {}", intent);
        return Map.of("intent", intent);
    }
}
```

## 方式 1: 使用 StateGraph 作为子图

```java
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edgeasync;

var intentNode = new IntentRecognizeNode();

// 主图定义
var mainGraph = new StateGraph(subKeyFactory)
    .addNode("intent_recognize", nodeasync(intentNode))
    .addNode("subAgent1", subGraph1)  // 直接使用 StateGraph
    .addNode("subAgent2", subGraph2)
    .addEdge(StateGraph.START, "intent_recognize")
    .addConditionalEdges("intent_recognize",
        edgeasync(state ->
            ((RoutingState)state).intent().orElseThrow()
        ),
        Map.of(
            "explain", "subAgent1",
            "query", "subAgent2"
        ))
    .addEdge("subAgent1", StateGraph.END)
    .addEdge("subAgent2", StateGraph.END);

var workflow = mainGraph.compile();

// 测试 EXPLAIN 路由
log.info("=== Testing EXPLAIN route ===");
intentNode.setIntent("explain");
for (var output : workflow.stream(Map.of("input", "explain me"))) {
    log.info("{}", output);
}

// 测试 QUERY 路由
log.info("=== Testing QUERY route ===");
intentNode.setIntent("query");
for (var output : workflow.stream(Map.of("input", "search for"))) {
    log.info("{}", output);
}
```

**输出 EXPLAIN**:
```
=== Testing EXPLAIN route ===
START
NodeOutput{node=__START__, state={input=explain me}}
Recognizing intent: explain
NodeOutput{node=intent_recognize, state={input=explain me, intent=explain}}
SubGraph1 working...
NodeOutput{node=subAgent1-work, state={input=explain me, step=work1, intent=explain}}
NodeOutput{node=__END__, state={input=explain me, step=work1, intent=explain}}
```

**输出 QUERY**:
```
=== Testing QUERY route ===
START
NodeOutput{node=__START__, state={input=search for}}
Recognizing intent: query
NodeOutput{node=intent_recognize, state={input=search for, intent=query}}
SubGraph2 working...
NodeOutput{node=subAgent2-work, state={input=search for, step=work2, intent=query}}
NodeOutput{node=__END__, state={input=search for, step=work2, intent=query}}
```

## 方式 2: 使用 CompiledGraph 作为子图

```java
// 预编译子图
var compiledSubGraph1 = subGraph1.compile();
var compiledSubGraph2 = subGraph2.compile();

var intentNode = new IntentRecognizeNode();

// 主图定义 - 使用编译后的子图
var mainGraph = new StateGraph(subKeyFactory)
    .addNode("intent_recognize", nodeasync(intentNode))
    .addNode("subAgent1", nodeasync(state -> {
        // 手动调用编译后的子图
        var result = compiledSubGraph1.invoke(state.data());
        return result.data();
    }))
    .addNode("subAgent2", nodeasync(state -> {
        var result = compiledSubGraph2.invoke(state.data());
        return result.data();
    }))
    .addEdge(StateGraph.START, "intent_recognize")
    .addConditionalEdges("intent_recognize",
        edgeasync(state ->
            ((RoutingState)state).intent().orElseThrow()
        ),
        Map.of(
            "explain", "subAgent1",
            "query", "subAgent2"
        ))
    .addEdge("subAgent1", StateGraph.END)
    .addEdge("subAgent2", StateGraph.END);

var workflow = mainGraph.compile();

// 测试（与方式 1 相同）
intentNode.setIntent("explain");
for (var output : workflow.stream(Map.of("input", "explain me"))) {
    log.info("{}", output);
}
```

## 动态子图选择

```java
// 更复杂的路由逻辑
class SmartIntentNode implements NodeAction {

    private final ChatClient chatClient;

    public SmartIntentNode(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String input = (String) state.value("input").orElse("");

        // 使用 LLM 识别意图
        String intent = chatClient.prompt()
            .system("Identify if the user wants to 'explain' or 'query'. Return only one word.")
            .user(input)
            .call()
            .content()
            .toLowerCase()
            .trim();

        return Map.of("intent", intent.contains("explain") ? "explain" : "query");
    }
}
```

## 关键要点

1. **子图嵌套**: 可以将 StateGraph 或 CompiledGraph 作为节点嵌入主图
2. **条件路由**: 使用 `addConditionalEdges` 根据状态动态选择子图
3. **状态共享**: 子图可以访问和修改主图的状态
4. **性能优化**: 使用 CompiledGraph 可以提高性能

## 应用场景

- 意图路由系统
- 多技能 Agent 编排
- 工作流动态分支
- 模块化任务处理

## 相关文档

- [子图作为 StateGraph](/workflow/examples/subgraph-as-stategraph) - 子图详细说明
- [子图作为 CompiledGraph](/workflow/examples/subgraph-as-compiledgraph) - 编译后子图
- [条件边](/workflow/graph/conditional-edges) - 条件边详解

**Initialize Logger**


```java
try( var file = new java.io.FileInputStream("./logging.properties")) {
    java.util.logging.LogManager.getLogManager().readConfiguration( file );
}

var log = org.slf4j.LoggerFactory.getLogger("AdaptiveRag");

```

## State declaration


```java
import org.bsc.langgraph4j.action.NodeAction;
import org.bsc.langgraph4j.state.AgentState;
import org.bsc.langgraph4j.StateGraph;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

import java.util.Map;
import java.util.Optional;

class State extends AgentState {

    public State(Map<String, Object> initData) {
        super(initData);
    }

    public Optional<String> intent() {
        return  value("intent");
    }
}

```

## Subgraph definitions


```java
// SubGraph1 Definition
StateGraph<State> subGraph1 = new StateGraph<>( State::new )
            .addNode("work", node_async(state -> Map.of("step", "work1")))
            .addEdge(START, "work")
            .addEdge("work", END)
            ;

// SubGraph2 Definition
StateGraph<State> subGraph2 = new StateGraph<>( State::new )
            .addNode("work", node_async(state -> Map.of("step", "work2")))
            .addEdge(START, "work")
            .addEdge("work", END)
            ;

```

## IntentRecognize node declaration


```java
class IntentRecognizeNode implements NodeAction<State> {

    String intent;

    public void setIntent( String intent ) {
        this.intent = intent;
    }

    public String getIntent() {
        return intent;
    }

    @Override
    public Map<String, Object> apply(State state) {
        return Map.of( "intent", intent );
    }

}

```

## Using Subgraph as StateGraph


```java
var intentRecognizeNode = new IntentRecognizeNode();

// MainGraph Definition
var graph = new StateGraph<>( State::new )
        .addNode("intent_recognize", node_async(intentRecognizeNode))
        .addNode("subAgent1", subGraph1 )
        .addNode("subAgent2", subGraph2 )
        .addEdge(START, "intent_recognize")
        .addConditionalEdges("intent_recognize",
                edge_async( state ->
                        state.intent().orElseThrow() ),
                Map.of("explain", "subAgent1",
                        "query", "subAgent2"
                )
        )
        .addEdge("subAgent1", END)
        .addEdge("subAgent2", END)
        ;

var workflow = graph.compile();

// System.out.println( workflow.getGraph( GraphRepresentation.Type.PLANTUML, "", false ));

// EXPLAIN
log.info( "EXPLAIN");
intentRecognizeNode.setIntent("explain");
for( var output : workflow.stream( Map.of("input", "explain me") ) ) {
       log.info( "{}", output );
}

// QUERY
log.info( "QUERY");
intentRecognizeNode.setIntent("query");
for( var output : workflow.stream( Map.of("input", "search for") ) ) {
        log.info( "{}", output );
}
         

```

```
    EXPLAIN 
    START 
    NodeOutput{node=__START__, state={input=explain me}} 
    NodeOutput{node=intent_recognize, state={input=explain me, intent=explain}} 
    NodeOutput{node=subAgent1-work, state={input=explain me, step=work1, intent=explain}} 
    NodeOutput{node=__END__, state={input=explain me, step=work1, intent=explain}} 
    QUERY 
    START 
    NodeOutput{node=__START__, state={input=search for}} 
    NodeOutput{node=intent_recognize, state={input=search for, intent=query}} 
    NodeOutput{node=subAgent2-work, state={input=search for, step=work2, intent=query}} 
    NodeOutput{node=__END__, state={input=search for, step=work2, intent=query}} 
```

## Using Subgraph as CompiledGraph


```java
var intentRecognizeNode = new IntentRecognizeNode();

// MainGraph Definition
var graph = new StateGraph<>( State::new )
        .addNode("intent_recognize", node_async(intentRecognizeNode))
        .addNode("subAgent1", subGraph1.compile() )
        .addNode("subAgent2", subGraph2.compile() )
        .addEdge(START, "intent_recognize")
        .addConditionalEdges("intent_recognize",
                edge_async( state ->
                        state.intent().orElseThrow() ),
                Map.of("explain", "subAgent1",
                        "query", "subAgent2"
                )
        )
        .addEdge("subAgent1", END)
        .addEdge("subAgent2", END)
        ;

var workflow = graph.compile();

// System.out.println( workflow.getGraph( GraphRepresentation.Type.PLANTUML, "", false ));

// EXPLAIN
log.info( "EXPLAIN");
intentRecognizeNode.setIntent("explain");
for( var output : workflow.stream( Map.of("input", "explain me") ) ) {
       log.info( "{}", output );
}

// QUERY
log.info( "QUERY");
intentRecognizeNode.setIntent("query");
for( var output : workflow.stream( Map.of("input", "search for") ) ) {
        log.info( "{}", output );
}
         

```

```
    EXPLAIN 
    START 
    NodeOutput{node=__START__, state={input=explain me}} 
    START 
    NodeOutput{node=intent_recognize, state={input=explain me, intent=explain}} 
    NodeOutput{node=__START__, state={input=explain me, intent=explain}} 
    NodeOutput{node=work, state={input=explain me, step=work1, intent=explain}} 
    NodeOutput{node=__END__, state={input=explain me, step=work1, intent=explain}} 
    NodeOutput{node=subAgent1, state={input=explain me, step=work1, intent=explain}} 
    NodeOutput{node=__END__, state={input=explain me, step=work1, intent=explain}} 
    QUERY 
    START 
    NodeOutput{node=__START__, state={input=search for}} 
    START 
    NodeOutput{node=intent_recognize, state={input=search for, intent=query}} 
    NodeOutput{node=__START__, state={input=search for, intent=query}} 
    NodeOutput{node=work, state={input=search for, step=work2, intent=query}} 
    NodeOutput{node=__END__, state={input=search for, step=work2, intent=query}} 
    NodeOutput{node=subAgent2, state={input=search for, step=work2, intent=query}} 
    NodeOutput{node=__END__, state={input=search for, step=work2, intent=query}} 
```
