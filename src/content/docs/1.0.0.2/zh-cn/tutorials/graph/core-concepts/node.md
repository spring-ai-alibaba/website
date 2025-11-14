---
title: Node - 节点
keywords: [Spring AI,Node,节点,AsyncNodeAction,异步处理]
description: "深入理解 Node 的执行模型、类型体系和核心架构。"
---

## 什么是 Node

**Node是Spring AI Alibaba Graph工作流的基本执行单元**，封装具体的业务逻辑或AI操作。每个Node都是一个独立的处理模块，接收当前状态作为输入，执行特定的业务逻辑，并将结果返回给工作流。

**核心设计理念**：Node采用函数式编程模型，每个节点都是一个纯函数，通过输入状态产生输出结果。这种设计确保了节点的可测试性、可复用性和组合性，为复杂工作流的构建提供了坚实基础。

## Node核心架构

**Node的架构设计遵循单一职责原则和异步优先的理念**，通过清晰的接口定义和灵活的实现方式，为不同类型的业务逻辑提供统一的执行框架。**每个Node都具有全局唯一的标识符**，这个标识符不仅用于节点的区分和定位，还是工作流路由、监控和调试的重要依据。

```java
// 核心Node实体
public class Node {
    private final String id;                                    // 节点唯一标识
    private final ActionFactory actionFactory;                 // 动作工厂
    
    // 动作工厂接口
    public interface ActionFactory {
        AsyncNodeActionWithConfig apply(CompileConfig config) throws GraphStateException;
    }
    
    // 核心构造器
    public Node(String id, ActionFactory actionFactory) {
        this.id = id;
        this.actionFactory = actionFactory;
    }
    
    // 获取执行动作
    public ActionFactory actionFactory() {
        return actionFactory;
    }
    
    // 判断是否为并行节点
    public boolean isParallel() {
        return false; // 默认为非并行，ParallelNode重写此方法返回true
    }
}
```

## Node执行模型

**Node采用异步优先的执行模型**，所有节点操作都基于CompletableFuture实现，确保工作流的高性能和良好的可扩展性。

![Node执行模型](/img/user/ai/tutorials/graph/core-concepts/node/nodeaction.svg)

### 异步执行框架

**Node的异步执行模型建立在四个核心接口之上**：

#### 1. AsyncNodeAction - 基础异步接口

```java
@FunctionalInterface
public interface AsyncNodeAction extends Function<OverAllState, CompletableFuture<Map<String, Object>>> {
    /**
     * 异步执行节点逻辑
     * @param state 当前工作流状态
     * @return 异步执行结果
     */
    CompletableFuture<Map<String, Object>> apply(OverAllState state);
    
    // 静态工厂方法：同步转异步
    static AsyncNodeAction node_async(NodeAction syncAction) {
        return state -> {
            CompletableFuture<Map<String, Object>> result = new CompletableFuture<>();
            try {
                result.complete(syncAction.apply(state));
            } catch (Exception e) {
                result.completeExceptionally(e);
            }
            return result;
        };
    }
}
```

**设计特点**：
- **函数式接口**：支持Lambda表达式和方法引用，简化代码编写
- **异步返回**：使用CompletableFuture确保非阻塞执行

#### 2. AsyncNodeActionWithConfig - 配置感知接口

```java
public interface AsyncNodeActionWithConfig extends BiFunction<OverAllState, RunnableConfig, CompletableFuture<Map<String, Object>>> {
    
    /**
     * 异步执行节点逻辑（带配置）
     * @param state 当前工作流状态
     * @param config 执行配置
     * @return 异步执行结果
     */
    CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config);
    
    // 静态工厂方法：同步转异步（带配置）
    static AsyncNodeActionWithConfig node_async(NodeActionWithConfig syncAction) {
        return (state, config) -> {
            CompletableFuture<Map<String, Object>> result = new CompletableFuture<>();
            try {
                result.complete(syncAction.apply(state, config));
            } catch (Exception e) {
                result.completeExceptionally(e);
            }
            return result;
        };
    }
    
    // 静态工厂方法：将AsyncNodeAction适配为AsyncNodeActionWithConfig
    static AsyncNodeActionWithConfig of(AsyncNodeAction action) {
        return (state, config) -> action.apply(state);
    }
}
```

#### 3. NodeAction - 同步接口

```java
@FunctionalInterface
public interface NodeAction {
    /**
     * 同步执行节点逻辑
     * @param state 当前工作流状态
     * @return 状态更新映射
     * @throws Exception 执行异常
     */
    Map<String, Object> apply(OverAllState state) throws Exception;
}
```

#### 4. NodeActionWithConfig - 带配置的同步接口

```java
@FunctionalInterface
public interface NodeActionWithConfig {
    /**
     * 同步执行节点逻辑（带配置）
     * @param state 当前工作流状态
     * @param config 执行配置
     * @return 状态更新映射
     * @throws Exception 执行异常
     */
    Map<String, Object> apply(OverAllState state, RunnableConfig config) throws Exception;
}
```

### 执行生命周期

**每个Node的执行遵循标准化的生命周期流程**，由CompiledGraph中的AsyncNodeGenerator负责管理：

```java
// AsyncNodeGenerator中的节点执行逻辑
private CompletableFuture<Data<Output>> evaluateAction(AsyncNodeActionWithConfig action, OverAllState withState) {
    doListeners(NODE_BEFORE, null);
    return action.apply(withState, config).thenApply(updateState -> {
        try {
            // 1. 更新状态
            this.currentState = OverAllState.updateState(currentState, updateState, keyStrategyMap);
            this.overAllState.updateState(updateState);
            
            // 2. 确定下一个节点
            var nextNodeCommand = nextNodeId(currentNodeId, overAllState, currentState, config);
            nextNodeId = nextNodeCommand.gotoNode();
            this.currentState = nextNodeCommand.update();
            
            // 3. 构建输出
            return Data.of(getNodeOutput());
        } catch (Exception e) {
            throw new CompletionException(e);
        }
    }).whenComplete((outputData, throwable) -> doListeners(NODE_AFTER, null));
}
```

## Node类型体系

**Spring AI Alibaba Graph框架提供了不同类型的Node实现**，每种类型都针对特定的架构需求进行设计。

### 1. 普通节点 - 基础执行单元

**普通节点是最基本的节点类型**，通过实现NodeAction或AsyncNodeAction接口来封装业务逻辑：

```java
// 创建普通业务节点
StateGraph stateGraph = new StateGraph("示例工作流", stateFactory)
    .addNode("data_processor", state -> {
        // 获取输入数据
        String input = (String) state.value("user_input")
            .orElseThrow(() -> new IllegalStateException("输入数据缺失"));
        
        // 执行业务逻辑
        return CompletableFuture.supplyAsync(() -> {
            String processedData = processBusinessLogic(input);
            
            Map<String, Object> result = new HashMap<>();
            result.put("processed_data", processedData);
            result.put("processing_timestamp", System.currentTimeMillis());
            result.put("processing_status", "completed");
            
            return result;
        });
    });
```

**普通节点特性**：
- **灵活性高**：可以实现任意的业务逻辑
- **组合性强**：易于与其他节点组合构建复杂工作流
- **扩展性好**：支持同步和异步两种实现方式

### 2. 并行节点 - 高性能处理

**并行节点支持多个子任务的并发执行**，是框架提供的高性能处理能力：

```java
// 定义并行子任务
List<AsyncNodeActionWithConfig> parallelActions = List.of(
    AsyncNodeActionWithConfig.of(state -> {
        String text = (String) state.value("user_input").orElse("");
        return CompletableFuture.supplyAsync(() -> 
            Map.of("sentiment", analyzeSentiment(text)));
    }),
    AsyncNodeActionWithConfig.of(state -> {
        String text = (String) state.value("user_input").orElse("");
        return CompletableFuture.supplyAsync(() -> 
            Map.of("intent", recognizeIntent(text)));
    }),
    AsyncNodeActionWithConfig.of(state -> {
        String text = (String) state.value("user_input").orElse("");
        return CompletableFuture.supplyAsync(() -> 
            Map.of("entities", extractEntities(text)));
    })
);

// 定义状态合并策略
Map<String, KeyStrategy> channels = Map.of(
    "sentiment", new ReplaceStrategy(),
    "intent", new ReplaceStrategy(),
    "entities", new ReplaceStrategy()
);

// 创建并行节点（框架内部实现）
ParallelNode parallelAnalysis = new ParallelNode("parallel_analysis", parallelActions, channels);

stateGraph.addNode("parallel_analysis", parallelAnalysis);
```

**并行节点内部实现**：

```java
public class ParallelNode extends Node {
    public static final String PARALLEL_PREFIX = "__PARALLEL__";
    
    record AsyncParallelNodeAction(List<AsyncNodeActionWithConfig> actions,
                                  Map<String, KeyStrategy> channels) implements AsyncNodeActionWithConfig {
        
        @Override
        public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
            var futures = actions.stream().map(action -> action.apply(state, config))
                .toArray(CompletableFuture[]::new);
            
            return CompletableFuture.allOf(futures)
                .thenApply(v -> {
                    // 合并所有结果
                    Map<String, Object> mergedResult = new HashMap<>();
                    for (CompletableFuture<Map<String, Object>> future : futures) {
                        Map<String, Object> result = future.join();
                        // 使用KeyStrategy合并状态
                        mergedResult = OverAllState.updateState(mergedResult, result, channels);
                    }
                    return mergedResult;
                });
        }
    }
    
    @Override
    public final boolean isParallel() {
        return true;
    }
}
```

**并行执行的核心优势**：
- **性能提升**：多个任务并发执行，显著减少总执行时间
- **资源优化**：充分利用多核CPU和网络资源
- **结果合并**：自动合并所有子任务的执行结果

### 3. 子图节点 - 模块化架构

**子图节点支持工作流的模块化设计**，是框架提供的组合能力：

```java
// 创建数据预处理子图
public StateGraph createDataPreprocessingSubGraph() {
    KeyStrategyFactory subStateFactory = () -> Map.of(
        "cleaned_data", new ReplaceStrategy(),
        "validation_errors", new AppendStrategy()
    );
    
    return new StateGraph("数据预处理", subStateFactory)
        .addNode("data_cleaner", state -> {
            String rawData = (String) state.value("raw_input").orElse("");
            return CompletableFuture.completedFuture(
                Map.of("cleaned_data", cleanData(rawData)));
        })
        .addNode("data_validator", state -> {
            String cleanedData = (String) state.value("cleaned_data").orElse("");
            List<String> errors = validateData(cleanedData);
            return CompletableFuture.completedFuture(
                Map.of("validation_errors", errors));
        })
        .addEdge(START, "data_cleaner")
        .addEdge("data_cleaner", "data_validator")
        .addEdge("data_validator", END);
                        }

// 在主工作流中使用子图
StateGraph mainWorkflow = new StateGraph("主工作流", mainStateFactory)
    .addNode("preprocessor", createDataPreprocessingSubGraph()) // 直接添加子图
    .addNode("main_processor", node_async(mainProcessorNode))
    .addEdge(START, "preprocessor")
    .addEdge("preprocessor", "main_processor")
    .addEdge("main_processor", END);
```

**子图节点的内部实现**：

```java
// 子图节点实现
public class SubStateGraphNode extends Node {
    private final StateGraph subGraph;
    
    public SubStateGraphNode(String id, StateGraph subGraph) {
        super(id, (config) -> {
            // 在运行时编译子图
            CompiledGraph compiledSubGraph = subGraph.compile(config);
            return new SubGraphAction(compiledSubGraph);
        });
        this.subGraph = subGraph;
    }
}

// 子图执行动作
public record SubCompiledGraphNodeAction(CompiledGraph subGraph) implements AsyncNodeActionWithConfig {
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        CompletableFuture<Map<String, Object>> future = new CompletableFuture<>();
        
        try {
            final Map<String, Object> input = state.data();
            var generator = subGraph.stream(input, config);
            
            future.complete(Map.of("_subgraph", generator));
        } catch (Exception e) {
            future.completeExceptionally(e);
        }
        
        return future;
    }
}
```

**子图节点特性**：
- **模块化设计**：将复杂工作流分解为可管理的模块
- **代码复用**：子图可以在多个工作流中重复使用
- **独立测试**：子图可以独立测试和验证
- **层次结构**：支持嵌套的子图结构

### 4. 命令节点 - 内部路由控制

**命令节点是框架内部使用的特殊节点类型**，主要用于条件路由和流程控制：

```java
public class CommandNode extends Node {
    private final Map<String, String> mappings;
    private final AsyncCommandAction action;
    
    public CommandNode(String id, AsyncCommandAction action, Map<String, String> mappings) {
        super(id, (config) -> new AsyncCommandNodeActionWithConfig(action, mappings));
        this.mappings = mappings;
        this.action = action;
    }
    
    public record AsyncCommandNodeActionWithConfig(AsyncCommandAction action,
                                                  Map<String, String> mappings) implements AsyncNodeActionWithConfig {
    @Override
        public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
            return CompletableFuture.completedFuture(Map.of("command", action, "mappings", mappings));
        }
    }
}
```

## 预置节点工具箱

**Spring AI Alibaba Graph提供了丰富的预置节点**，这些节点是基于框架核心架构构建的业务特化实现，开箱即用：

### 主要预置节点类型

- **LlmNode**：大语言模型调用节点，支持提示词模板、流式输出等
- **ToolNode**：工具调用节点，让AI能够调用外部API和函数
- **QuestionClassifierNode**：智能分类节点，基于LLM的文本分类
- **KnowledgeRetrievalNode**：知识检索节点，支持向量检索和重排序
- **ParameterParsingNode**：参数解析节点，从自然语言中提取结构化参数
- **CodeExecutorNode**：代码执行节点，支持Python、JavaScript等语言
- **HumanNode**：人机协作节点，支持人工干预和审批流程

### 预置节点特性

- **开箱即用**：无需编写复杂的业务逻辑，配置即可使用
- **高度优化**：针对AI场景进行了专门优化
- **配置灵活**：支持丰富的配置选项适应不同需求
- **扩展友好**：基于框架接口，易于扩展和定制

**详细的预置节点使用指南请参考文档的预置组件部分。**

## 流式处理支持

**Node原生支持流式处理**，特别适合需要实时响应的AI应用场景：

```java
public class StreamingCapableNode implements AsyncNodeActionWithConfig {
    
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        return CompletableFuture.supplyAsync(() -> {
            // 创建流式生成器
            AsyncGenerator<NodeOutput> streamGenerator = createStreamingGenerator(state);
                
                Map<String, Object> result = new HashMap<>();
            result.put("stream_generator", streamGenerator);
            result.put("response_type", "streaming");
            
                return result;
        });
    }
    
    private AsyncGenerator<NodeOutput> createStreamingGenerator(OverAllState state) {
        return new AsyncGenerator<NodeOutput>() {
            private boolean hasMore = true;
            
            @Override
            public Data<NodeOutput> next() {
                if (hasMore) {
                    String chunk = generateNextChunk();
                    if (chunk != null) {
                        return Data.of(new StreamingNodeOutput(chunk));
                    } else {
                        hasMore = false;
                        return Data.done();
                    }
                } else {
                    return Data.done();
                }
            }
        };
    }
}
```

**流式处理的应用场景**：
- **实时聊天**：逐字符显示AI回复，提升交互体验
- **长文档生成**：实时显示生成进度，避免用户等待
- **数据处理管道**：实时反馈处理状态和中间结果
