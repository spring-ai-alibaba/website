---
title: 子图 Subgraphs
description: 学习如何使用子图实现多智能体系统和组件复用，实现团队协作开发和模块化设计
keywords: [Spring AI Alibaba, Subgraphs, 子图, 多智能体, Multi-agent, 组件复用, 模块化, Graph封装]
---

# 子图（Subgraphs）

子图是在另一个图中用作节点的图。这只不过是封装和组合的概念，应用于 Spring AI Alibaba Graph。

## 使用子图的原因

使用子图的一些原因包括：

* **构建多智能体系统**：每个智能体可以是一个独立的子图
* **组件复用**：当您想在多个图中重用一组节点时，这些节点可能共享某些状态，您可以在子图中定义一次，然后在多个父图中使用它们
* **团队协作**：当您希望不同的团队独立地在图的不同部分上工作时，您可以将每个部分定义为子图，只要遵守子图接口（输入和输出 schema），就可以在不了解子图任何细节的情况下构建父图

## 如何添加子图

有三种方法可以将子图添加到父图中：

### 1. 添加编译的子图作为节点

当父图和子图共享状态时，这种方式很有用。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;

// 创建子图
StateGraph childGraph = new StateGraph(keyStrategyFactory)
    .addNode("child_node", childNode)
    .addEdge(START, "child_node")
    .addEdge("child_node", END);

CompiledGraph compiledChild = childGraph.compile();

// 将编译的子图添加到父图
StateGraph parentGraph = new StateGraph(keyStrategyFactory)
    .addNode("subgraph", state -> {
        // 调用子图
        return compiledChild.invoke(state.data(),
            RunnableConfig.builder().build());
    })
    .addEdge(START, "subgraph")
    .addEdge("subgraph", END);
```

### 2. 在节点操作中调用子图

当父图和子图具有不同的状态 schema，需要在调用子图之前或之后转换状态时，这种方式很有用。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import org.bsc.async.AsyncGenerator;

StateGraph parentGraph = new StateGraph(parentKeyStrategyFactory)
    .addNode("transform_and_call_subgraph", state -> {
        // 转换父状态到子图状态
        Map<String, Object> subgraphInput = Map.of(
            "subgraphKey", state.value("parentKey").orElse("")
        );

        // 调用子图并处理流式输出
        AsyncGenerator<NodeOutput> stream = compiledChildGraph.stream(
            subgraphInput,
            RunnableConfig.builder().build()
        );

        // 处理流式输出
        for (NodeOutput output : stream) {
            System.out.println("Subgraph output: " + output);
        }

        // 转换子图结果回父状态
        return Map.of("parentKey", "processed");
    })
    .addEdge(START, "transform_and_call_subgraph")
    .addEdge("transform_and_call_subgraph", END);
```

### 3. 添加状态子图

当父图和子图紧密相关，共享一切时，这种方式最有效。子图会与父图合并，创建无缝集成。

```java
// 注意：在 Spring AI Alibaba Graph 当前版本中，
// 子图主要通过编译后的形式集成
// 状态级别的深度合并需要手动管理状态共享
```

## 作为编译图使用

创建子图节点的最简单方法是直接使用编译的子图。这样做时，**父图和子图状态 schema 至少要共享一个键，它们可以使用该键进行通信**，这一点很重要。如果您的图和子图不共享任何键，您应该编写一个调用子图的操作（见上文）。

### 注意事项

* 如果您向子图节点传递额外的键（即，除了共享键之外），子图节点将忽略它们。同样，如果您从子图返回额外的键，父图将忽略它们。
* 支持中断

### 示例：共享状态的子图

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

// 定义共享状态策略
KeyStrategyFactory sharedKeyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("sharedData", new ReplaceStrategy());
    keyStrategyMap.put("results", new AppendStrategy());
    return keyStrategyMap;
};

// 创建子图
var childNode1 = node_async(state -> {
    String data = (String) state.value("sharedData").orElse("");
    return Map.of("results", List.of("Child processed: " + data));
});

StateGraph childGraph = new StateGraph(sharedKeyStrategyFactory)
    .addNode("child_node1", childNode1)
    .addEdge(START, "child_node1")
    .addEdge("child_node1", END);

CompiledGraph compiledChild = childGraph.compile();

// 创建父图
var parentNode1 = node_async(state -> {
    return Map.of("sharedData", "Parent data");
});

StateGraph parentGraph = new StateGraph(sharedKeyStrategyFactory)
    .addNode("parent_node1", parentNode1)
    .addNode("call_child", state -> {
        return compiledChild.invoke(state.data(),
            RunnableConfig.builder().build());
    })
    .addEdge(START, "parent_node1")
    .addEdge("parent_node1", "call_child")
    .addEdge("call_child", END);

CompiledGraph compiledParent = parentGraph.compile();

// 执行
Map<String, Object> result = compiledParent.invoke(
    Map.of("sharedData", "Initial"),
    RunnableConfig.builder().build()
);
```

## 作为节点操作使用

您可能想要定义一个具有完全不同 schema 的子图。在这种情况下，您可以创建一个调用子图的节点函数。此函数需要在调用子图之前将输入（父）状态转换为子图状态，并在从节点返回状态更新之前将结果转换回父状态。

### 注意事项

* 中断支持由您自己实现

### 示例：不同状态的子图

```java
// 父图状态
KeyStrategyFactory parentKeyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("parentData", new ReplaceStrategy());
    keyStrategyMap.put("processedResult", new ReplaceStrategy());
    return keyStrategyMap;
};

// 子图状态（完全不同）
KeyStrategyFactory childKeyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("childInput", new ReplaceStrategy());
    keyStrategyMap.put("childOutput", new ReplaceStrategy());
    return keyStrategyMap;
};

// 创建子图
var childProcessor = node_async(state -> {
    String input = (String) state.value("childInput").orElse("");
    String output = "Processed: " + input;
    return Map.of("childOutput", output);
});

StateGraph childGraph = new StateGraph(childKeyStrategyFactory)
    .addNode("processor", childProcessor)
    .addEdge(START, "processor")
    .addEdge("processor", END);

CompiledGraph compiledChild = childGraph.compile();

// 父图中的转换节点
var transformAndCallChild = node_async(state -> {
    // 1. 从父状态提取数据
    String parentData = (String) state.value("parentData").orElse("");

    // 2. 转换为子图输入
    Map<String, Object> childInput = Map.of("childInput", parentData);

    // 3. 调用子图
    Map<String, Object> childResult = compiledChild.invoke(
        childInput,
        RunnableConfig.builder().build()
    );

    // 4. 转换子图输出回父状态
    String childOutput = (String) childResult.get("childOutput");
    return Map.of("processedResult", childOutput);
});

// 创建父图
StateGraph parentGraph = new StateGraph(parentKeyStrategyFactory)
    .addNode("call_child_with_transform", transformAndCallChild)
    .addEdge(START, "call_child_with_transform")
    .addEdge("call_child_with_transform", END);

CompiledGraph compiledParent = parentGraph.compile();
```

## 可视化

能够可视化图是很重要的，特别是当它们变得更加复杂时。Spring AI Alibaba Graph 提供了 `StateGraph.getGraph()` 方法来获取可视化格式（即图即代码表示，如 PlantUML）：

```java
import com.alibaba.cloud.ai.graph.GraphRepresentation;

StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("node1", node1)
    .addNode("node2", node2)
    .addEdge(START, "node1")
    .addEdge("node1", "node2")
    .addEdge("node2", END);

// 获取 PlantUML 表示
GraphRepresentation representation = stateGraph.getGraph(
    GraphRepresentation.Type.PLANTUML,
    "My Graph"
);

System.out.println(representation.content());
```

## 流式处理

在添加编译的子图时，流式处理会自动启用。您可以通过 `stream()` 方法获取子图的流式输出：

```java
import com.alibaba.cloud.ai.graph.NodeOutput;
import org.bsc.async.AsyncGenerator;

// 执行父图并获取流式输出
AsyncGenerator<NodeOutput> stream = compiledParent.stream(
    inputData,
    RunnableConfig.builder().threadId("parent-thread").build()
);

// 处理流式输出
for (NodeOutput output : stream) {
    System.out.println("Node: " + output.node());
    System.out.println("State: " + output.state());
}
```

## 多智能体系统示例

子图在构建多智能体系统时特别有用：

```java
// 研究智能体子图
StateGraph researcherGraph = new StateGraph(agentKeyStrategyFactory)
    .addNode("research", researchNode)
    .addNode("summarize", summarizeNode)
    .addEdge(START, "research")
    .addEdge("research", "summarize")
    .addEdge("summarize", END);

CompiledGraph researcherAgent = researcherGraph.compile();

// 写作智能体子图
StateGraph writerGraph = new StateGraph(agentKeyStrategyFactory)
    .addNode("outline", outlineNode)
    .addNode("write", writeNode)
    .addEdge(START, "outline")
    .addEdge("outline", "write")
    .addEdge("write", END);

CompiledGraph writerAgent = writerGraph.compile();

// 协调器（父图）
StateGraph coordinatorGraph = new StateGraph(coordinatorKeyStrategyFactory)
    .addNode("researcher", state ->
        researcherAgent.invoke(state.data(), RunnableConfig.builder().build()))
    .addNode("writer", state ->
        writerAgent.invoke(state.data(), RunnableConfig.builder().build()))
    .addEdge(START, "researcher")
    .addEdge("researcher", "writer")
    .addEdge("writer", END);

CompiledGraph multiAgentSystem = coordinatorGraph.compile();

// 执行多智能体系统
Map<String, Object> result = multiAgentSystem.invoke(
    Map.of("topic", "AI的未来"),
    RunnableConfig.builder().threadId("multi-agent-session").build()
);
```

## 最佳实践

1. **明确接口**：定义清晰的输入和输出 schema，便于团队协作。
2. **状态隔离**：当子图需要独立状态时，使用转换节点。
3. **错误处理**：在调用子图时添加适当的错误处理。
4. **文档化**：为每个子图编写清晰的文档，说明其用途和接口。
5. **测试**：独立测试每个子图，然后测试整个系统。

通过子图，您可以构建模块化、可维护和可扩展的复杂 AI 工作流系统。
