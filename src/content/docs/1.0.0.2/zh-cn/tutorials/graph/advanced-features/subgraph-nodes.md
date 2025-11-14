---
title: 子图节点
keywords: [Spring AI,子图节点,SubGraphNode,模块化,工作流组合]
description: "深入理解 Spring AI Alibaba Graph 的子图节点机制和模块化工作流设计"
---

## 什么是子图节点

**子图节点是Spring AI Alibaba Graph的模块化组件**，允许将复杂的工作流分解为可重用的子模块。子图节点就像函数调用一样，可以在主工作流中调用预定义的子工作流，实现代码复用和模块化设计。

**核心设计理念**：子图节点采用了组合模式（Composite Pattern），将复杂的工作流分解为更小、更专注的子工作流。每个子图都是一个独立的StateGraph，具备完整的生命周期管理，可以独立测试、验证和部署。

## 子图节点类型

Spring AI Alibaba Graph提供了两种类型的子图节点，分别适用于不同的使用场景。

### SubStateGraphNode - 未编译子图节点

**SubStateGraphNode用于包装未编译的StateGraph**，在运行时进行动态编译：

```java
public class SubStateGraphNode extends Node implements SubGraphNode {
    private final StateGraph subGraph;
    
    public SubStateGraphNode(String id, StateGraph subGraph) {
        super(id);  // 继承Node类的基础构造
        this.subGraph = subGraph;
    }
    
    public StateGraph subGraph() {
        return subGraph;
    }
    
    public String formatId(String nodeId) {
        return SubGraphNode.formatId(id(), nodeId);
    }
}
```

**适用场景**：
- 开发阶段需要频繁修改子图结构
- 子图需要根据运行时条件动态配置
- 子图的编译配置依赖于父图的CompileConfig

**使用示例**：

```java
// 定义文档处理子图
StateGraph documentProcessingSubGraph = new StateGraph("文档处理子图", stateFactory)
    .addNode("extractor", node_async(documentExtractorNode))
    .addNode("analyzer", node_async(documentAnalyzerNode))
    .addEdge(START, "extractor")
    .addEdge("extractor", "analyzer")
    .addEdge("analyzer", END);

// 添加到主工作流
StateGraph mainWorkflow = new StateGraph("主工作流", stateFactory)
    .addNode("classifier", node_async(classifierNode))
    .addNode("document_processor", documentProcessingSubGraph)  // SubStateGraphNode
    .addNode("reporter", node_async(reporterNode))
    .addEdge(START, "classifier")
    .addEdge("classifier", "document_processor")
    .addEdge("document_processor", "reporter")
    .addEdge("reporter", END);
```

### SubCompiledGraphNode - 预编译子图节点

**SubCompiledGraphNode用于包装已编译的CompiledGraph**，提供更高的执行效率：

```java
public class SubCompiledGraphNode extends Node implements SubGraphNode {
    private final CompiledGraph subGraph;
    
    public SubCompiledGraphNode(String id, CompiledGraph subGraph) {
        super(id, (config) -> new SubCompiledGraphNodeAction(subGraph));
        this.subGraph = subGraph;
    }
    
    public StateGraph subGraph() {
        return subGraph.stateGraph;
    }
}
```

**适用场景**：
- 子图结构稳定，无需频繁修改
- 需要最佳的执行性能
- 子图可以独立编译和优化

**使用示例**：

```java
// 预编译子图
StateGraph subStateGraph = createDocumentProcessingGraph();
CompiledGraph compiledSubGraph = subStateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);

// 添加到主工作流
StateGraph mainWorkflow = new StateGraph("主工作流", stateFactory)
    .addNode("classifier", node_async(classifierNode))
    .addNode("document_processor", compiledSubGraph)  // SubCompiledGraphNode
    .addNode("reporter", node_async(reporterNode))
    .addEdge(START, "classifier")
    .addEdge("classifier", "document_processor")
    .addEdge("document_processor", "reporter")
    .addEdge("reporter", END);
```

## 子图执行机制

### 编译时处理

**子图的编译处理是一个复杂的图展开过程**，框架会自动将子图的节点和边合并到主图中：

```java
// 来自CompiledGraph的实际编译逻辑
var subgraphNodes = stateGraph.nodes.onlySubStateGraphNodes();

for (var subgraphNode : subgraphNodes) {
    var sgWorkflow = subgraphNode.subGraph();
    
    // 处理START节点
    var sgEdgeStart = sgWorkflow.edges.edgeBySourceId(START).orElseThrow();
    var sgEdgeStartTarget = sgEdgeStart.target();
    var sgEdgeStartRealTargetId = subgraphNode.formatId(sgEdgeStartTarget.id());
    
    // 更新边的目标指向
    var edgesWithSubgraphTargetId = edges.edgesByTargetId(subgraphNode.id());
    for (var edgeWithSubgraphTargetId : edgesWithSubgraphTargetId) {
        var newEdge = edgeWithSubgraphTargetId.withSourceAndTargetIdsUpdated(
            subgraphNode, 
            Function.identity(),
            id -> new EdgeValue(subgraphNode.formatId(sgEdgeStartTarget.id()))
        );
        edges.elements.remove(edgeWithSubgraphTargetId);
        edges.elements.add(newEdge);
    }
}
```

### 节点ID格式化

**子图节点使用特殊的ID格式化机制**，确保子图内节点的唯一性：

```java
public interface SubGraphNode {
    String PREFIX_FORMAT = "%s-%s";
    
    static String formatId(String subGraphNodeId, String nodeId) {
        return format(PREFIX_FORMAT, subGraphNodeId, nodeId);
    }
}
```

**示例**：如果子图节点ID为"doc_processor"，子图内节点ID为"extractor"，则最终节点ID为"doc_processor-extractor"。

### 运行时执行

**SubCompiledGraphNodeAction负责子图的实际执行**：

```java
public record SubCompiledGraphNodeAction(CompiledGraph subGraph) 
    implements AsyncNodeActionWithConfig {
    
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        CompletableFuture<Map<String, Object>> future = new CompletableFuture<>();
        
        try {
            // 确定输入数据
            final Map<String, Object> input = (subGraph.compileConfig.checkpointSaver().isPresent()) 
                ? Map.of()  // 检查点模式下使用空输入
                : state.data();  // 普通模式下传递完整状态
                
            // 执行子图并返回AsyncGenerator
            var generator = subGraph.stream(input, config);
            future.complete(Map.of("_subgraph", generator));
            
        } catch (Exception e) {
            future.completeExceptionally(e);
        }
        
        return future;
    }
}
```

![编译子图运行](img\user\ai\tutorials\graph\advanced-features\subgraph-nodes\flow.svg)

## 状态管理机制

### 状态隔离与传递

**子图具有独立的状态空间**，但可以通过输入参数接收父图的状态数据：

```java
// 状态传递示例
public class DocumentProcessingSubGraph {
    
    public static StateGraph create() {
        KeyStrategyFactory stateFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            // 子图独立的状态键
            strategies.put("document_path", new ReplaceStrategy());
            strategies.put("extracted_text", new ReplaceStrategy());
            strategies.put("analysis_result", new ReplaceStrategy());
            return strategies;
        };
        
        return new StateGraph("文档处理子图", stateFactory)
            .addNode("document_extractor", node_async(extractorNode))
            .addNode("document_analyzer", node_async(analyzerNode))
            .addEdge(START, "document_extractor")
            .addEdge("document_extractor", "document_analyzer")
            .addEdge("document_analyzer", END);
    }
}
```

### 状态输出处理

**子图的输出通过AsyncGenerator流式返回**，框架会自动处理状态合并：

```java
// 子图输出处理机制
var generator = subGraph.stream(input, config);

// 输出包装在特殊键中
Map<String, Object> result = Map.of("_subgraph", generator);

// 框架会自动展开和处理AsyncGenerator
```

