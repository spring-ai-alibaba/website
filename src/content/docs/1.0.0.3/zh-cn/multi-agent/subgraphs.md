---
title: 子图 (Subgraphs)
description: Spring AI Alibaba 子图功能
---

# 子图 (Subgraphs)

子图是 Spring AI Alibaba Graph 中的重要概念，它允许将一个完整的 StateGraph 作为另一个图中的节点使用。这是模块化设计和组合模式在图工作流中的体现，使您能够构建具有多个可重用组件的复杂系统。

## 子图的核心价值

子图提供了强大的模块化能力，主要应用场景包括：

- **构建多智能体系统**：每个智能体可以是一个独立的子图，具有自己的内部逻辑和状态管理
- **代码复用**：将通用的处理逻辑封装为子图，在多个父图中重复使用
- **团队协作**：不同团队可以独立开发各自的子图模块，只需要约定好接口规范
- **分层架构**：将复杂的业务流程分解为多个层次，每个层次用子图表示

## 使用子图

Spring AI Alibaba 支持两种方式添加子图：

### 1. 添加未编译的子图

直接将 StateGraph 作为节点添加到父图中：

```java
// 创建子图
StateGraph childGraph = new StateGraph(() -> Map.of("messages", KeyStrategy.APPEND))
    .addNode("step1", node_async(state -> Map.of("messages", "child:step1")))
    .addNode("step2", node_async(state -> Map.of("messages", "child:step2")))
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", END);

// 添加到父图
StateGraph parentGraph = new StateGraph(() -> Map.of("messages", KeyStrategy.APPEND))
    .addNode("main1", node_async(state -> Map.of("messages", "main1")))
    .addNode("subgraph", childGraph)  // 直接添加未编译的子图
    .addNode("main2", node_async(state -> Map.of("messages", "main2")))
    .addEdge(START, "main1")
    .addEdge("main1", "subgraph")
    .addEdge("subgraph", "main2")
    .addEdge("main2", END);
```

### 2. 添加已编译的子图

先编译子图，然后添加到父图中：

```java
// 编译子图
CompiledGraph compiledChild = childGraph.compile();

// 添加到父图
StateGraph parentGraph = new StateGraph(() -> Map.of("messages", KeyStrategy.APPEND))
    .addNode("main1", node_async(state -> Map.of("messages", "main1")))
    .addNode("subgraph", compiledChild)  // 添加已编译的子图
    .addNode("main2", node_async(state -> Map.of("messages", "main2")))
    .addEdge(START, "main1")
    .addEdge("main1", "subgraph")
    .addEdge("subgraph", "main2")
    .addEdge("main2", END);
```

:::tip
子图内的节点会自动添加前缀，格式为 `{子图节点ID}-{内部节点ID}`。例如：`subgraph-step1`、`subgraph-step2`。
:::

### 执行结果

子图内的节点会自动添加前缀，执行顺序如下：

```
执行节点: main1
执行节点: subgraph-step1  // 子图节点自动添加前缀
执行节点: subgraph-step2
执行节点: main2

最终状态: {messages=[main1, child:step1, child:step2, main2]}
```

## 状态转换

当子图使用不同的状态结构时，需要通过包装节点处理状态转换：

```java
// 子图使用不同的状态键
StateGraph dataSubgraph = new StateGraph(() ->
    Map.of("raw_data", KeyStrategy.REPLACE,
           "processed_data", KeyStrategy.REPLACE))
    .addNode("clean", node_async(state -> {
        String rawData = state.value("raw_data", String.class).orElse("");
        return Map.of("processed_data", rawData.trim().toLowerCase());
    }))
    .addEdge(START, "clean")
    .addEdge("clean", END);

// 父图通过包装节点调用子图
StateGraph mainGraph = new StateGraph(() ->
    Map.of("user_input", KeyStrategy.REPLACE,
           "result", KeyStrategy.REPLACE))
    .addNode("process", node_async((state) -> {
        // 1. 状态转换：主图 -> 子图
        String userInput = state.value("user_input", String.class).orElse("");
        Map<String, Object> subInput = Map.of("raw_data", userInput);

        // 2. 调用子图
        CompiledGraph subgraph = dataSubgraph.compile();
        Optional<OverAllState> subResult = subgraph.invoke(subInput);

        // 3. 状态转换：子图 -> 主图
        if (subResult.isPresent()) {
            String processed = subResult.get().value("processed_data", String.class).orElse("");
            return Map.of("result", "处理结果: " + processed);
        }
        return Map.of("result", "处理失败");
    }))
    .addEdge(START, "process")
    .addEdge("process", END);
```

## 子图中断

子图支持中断机制，当子图内的节点被中断时，会抛出异常：

```java
// 创建带中断的子图
CompileConfig subConfig = CompileConfig.builder()
    .saverConfig(SaverConfig.builder()
        .register(SaverEnum.MEMORY.getValue(), new MemorySaver())
        .build())
    .interruptAfter("step1")  // 在 step1 后中断
    .build();

CompiledGraph compiledSubgraph = subgraph.compile(subConfig);

// 在父图中使用
StateGraph parentGraph = new StateGraph(() -> Map.of("messages", KeyStrategy.APPEND))
    .addNode("main", node_async(state -> Map.of("messages", "main")))
    .addNode("sub", compiledSubgraph)
    .addEdge(START, "main")
    .addEdge("main", "sub")
    .addEdge("sub", END);

try {
    parentGraph.compile().invoke(Map.of());
} catch (Exception e) {
    // 处理子图中断异常
    System.out.println("子图执行中断");
}
```

## 嵌套子图

子图内部可以包含其他子图：

```java
// 内层子图
StateGraph innerGraph = new StateGraph()
    .addNode("inner_step", node_async(state -> Map.of("messages", "inner_step")))
    .addEdge(START, "inner_step")
    .addEdge("inner_step", END);

// 中间层子图
StateGraph middleGraph = new StateGraph()
    .addNode("middle_step1", node_async(state -> Map.of("messages", "middle_step1")))
    .addNode("inner_subgraph", innerGraph)  // 嵌套子图
    .addNode("middle_step2", node_async(state -> Map.of("messages", "middle_step2")))
    .addEdge(START, "middle_step1")
    .addEdge("middle_step1", "inner_subgraph")
    .addEdge("inner_subgraph", "middle_step2")
    .addEdge("middle_step2", END);

// 外层父图
StateGraph parentGraph = new StateGraph()
    .addNode("parent_step1", node_async(state -> Map.of("messages", "parent_step1")))
    .addNode("middle_subgraph", middleGraph)
    .addNode("parent_step2", node_async(state -> Map.of("messages", "parent_step2")))
    .addEdge(START, "parent_step1")
    .addEdge("parent_step1", "middle_subgraph")
    .addEdge("middle_subgraph", "parent_step2")
    .addEdge("parent_step2", END);

// 节点ID格式：middle_subgraph-inner_subgraph-inner_step
```

## 配置继承

未编译的子图会继承父图的编译配置：

```java
// 父图配置
CompileConfig config = CompileConfig.builder()
    .saverConfig(SaverConfig.builder()
        .register(SaverEnum.MEMORY.getValue(), new MemorySaver())
        .build())
    .build();

// 子图继承父图配置
StateGraph parentGraph = new StateGraph()
    .addNode("main", node_async(state -> Map.of("step", "main")))
    .addNode("subgraph", childGraph)  // 继承父图配置
    .addEdge(START, "main")
    .addEdge("main", "subgraph")
    .addEdge("subgraph", END);

CompiledGraph compiled = parentGraph.compile(config);
```

已编译的子图使用自己的配置：

```java
// 子图独立配置
CompiledGraph compiledSubgraph = childGraph.compile(subConfig);

// 在父图中使用
StateGraph parentGraph = new StateGraph()
    .addNode("subgraph", compiledSubgraph)  // 使用独立配置
    .addEdge(START, "subgraph")
    .addEdge("subgraph", END);
```
