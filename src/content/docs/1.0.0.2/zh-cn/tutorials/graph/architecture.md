---
title: 总体架构与设计理念
keywords: [Spring AI,通义千问,百炼,智能体应用,架构设计]
description: "深入理解 Spring AI Alibaba Graph 的整体架构设计和核心理念，掌握三阶段执行模式。"
---

## 总体架构与设计理念

Spring AI Alibaba Graph采用工作流模型，整个框架的数据流转遵循**构建→编译→执行**的三阶段模式。这种设计将工作流的定义、优化和执行完全分离，确保了系统的稳定性和高效性。

### 完整数据流转图

![完整数据流转图](/img/user/ai/tutorials/graph/architecture/complete-data-flow.svg)

### 核心执行流程详解

**数据流转的核心理念**：整个框架围绕**OverAllState**这个数据载体进行流转，每个节点都是状态的转换器，通过**AsyncNodeGenerator**这个状态机来驱动整个流程的执行。

![核心执行流程序列图](/img/user/ai/tutorials/graph/architecture/core-execution-sequence.svg)

### 关键数据结构流转

**StateGraph → CompiledGraph转换**：

![StateGraph到CompiledGraph转换图](/img/user/ai/tutorials/graph/architecture/stategraph-to-compiledgraph.svg)

**AsyncNodeGenerator执行机制**：

![AsyncNodeGenerator状态机图](/img/user/ai/tutorials/graph/architecture/asyncnodegenerator-statemachine.svg)

## 整体架构设计

基于上述数据流转机制，Spring AI Alibaba Graph的整体架构设计具有以下特点：

- **清晰的执行流程**：每个节点代表一个处理步骤，边表示数据流向
- **灵活的条件分支**：支持根据状态动态选择执行路径
- **并行处理能力**：多个节点可以并行执行，提高处理效率
- **状态可追溯**：完整的状态变化历史，便于调试和监控

**架构核心理念**：Spring AI Alibaba Graph将复杂的AI任务分解为可组合的原子操作，每个节点专注于单一职责，通过状态驱动的方式实现节点间的协调。这种设计让开发者可以像搭积木一样构建复杂的AI应用，既保证了系统的可维护性，又提供了足够的灵活性。

### 系统架构总览

![系统架构总览图](/img/user/ai/tutorials/graph/architecture/system-overview.svg)

## 核心组件关系

**组件职责说明**：
- **StateGraph**：工作流的架构师，负责定义整个流程的结构和规则
- **CompiledGraph**：工作流的指挥官，负责协调和管理整个执行过程
- **OverAllState**：工作流的记忆中心，负责存储和管理所有状态数据
- **Node**：工作流的执行单元，每个节点专注于特定的业务逻辑
- **Edge**：工作流的连接器，定义节点之间的转换关系和条件
- **AsyncNodeGenerator**：工作流的执行引擎，是推动整个流程运转的核心状态机

![核心组件关系图](/img/user/ai/tutorials/graph/architecture/core-components-relationship.svg)

## 核心设计理念

### 声明式编程模型

借鉴LangGraph的设计理念，Spring AI Alibaba Graph采用声明式编程模型，开发者只需要描述"做什么"，而无需关心"怎么做"：

```java
// 声明式定义工作流
StateGraph graph = new StateGraph("客户服务工作流", stateFactory)
    .addNode("feedback_classifier", node_async(feedbackClassifier))
    .addNode("specific_question_classifier", node_async(specificQuestionClassifier))
    .addNode("recorder", node_async(recorderNode))
    .addEdge(START, "feedback_classifier")
    .addConditionalEdges("feedback_classifier", 
        edge_async(new FeedbackQuestionDispatcher()),
        Map.of("positive", "recorder", "negative", "specific_question_classifier"))
    .addEdge("recorder", END);
```

### 状态驱动的执行模型

![状态管理流程图](/img/user/ai/tutorials/graph/architecture/state-management-flow.svg)

所有的数据流转都通过`OverAllState`进行管理，确保状态的一致性和可追溯性：

```java
// 状态工厂定义
KeyStrategyFactory stateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("input", new ReplaceStrategy());
    strategies.put("classifier_output", new ReplaceStrategy());
    strategies.put("solution", new ReplaceStrategy());
    return strategies;
};
```

### 异步优先的设计

框架优先支持异步处理，提高系统的吞吐量和响应性，同时还原生支持了**节点内模型流式透传**：

![异步执行模型图](/img/user/ai/tutorials/graph/architecture/async-execution-model.svg)

```java
// 异步节点定义
AsyncNodeAction asyncNode = node_async(new CustomNodeAction());

// 并行节点处理
public class ParallelNode extends Node {
    record AsyncParallelNodeAction(
        List<AsyncNodeActionWithConfig> actions,
        Map<String, KeyStrategy> channels
    ) implements AsyncNodeActionWithConfig {
        
        @Override
        public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
            var futures = actions.stream()
                .map(action -> action.apply(state, config))
                .toArray(CompletableFuture[]::new);
            
            return CompletableFuture.allOf(futures)
                .thenApply(v -> {
                    // 合并所有结果
                    Map<String, Object> result = new HashMap<>();
                    for (CompletableFuture<Map<String, Object>> future : futures) {
                        result.putAll(future.join());
                    }
                    return result;
                });
        }
    }
}
```

## Spring 生态集成

Spring AI Alibaba Graph与Spring生态深度集成，您可以轻松在您的Spring应用中引入AI模型工作流以开发智能Java应用。

### 依赖注入架构

![Spring Boot应用层架构图](/img/user/ai/tutorials/graph/architecture/spring-boot-integration.svg)

### 依赖注入支持

以下代码演示了Spring AI Alibaba Graph是如何被IOC容器所管理的：

```java
@Configuration
public class GraphConfiguration {
    
    @Bean
    public StateGraph workflowGraph(ChatModel chatModel) {
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultAdvisors(new SimpleLoggerAdvisor())
            .build();
        
        // 构建图定义...
        return stateGraph;
    }
    
    @Bean
    public CompiledGraph compiledGraph(StateGraph stateGraph, 
                                      ObservationRegistry observationRegistry) {
        return stateGraph.compile(CompileConfig.builder()
            .withLifecycleListener(new GraphObservationLifecycleListener(observationRegistry))
            .build());
    }
}
```

### 观测性集成

Spring AI Alibaba Graph基于Micrometer内置了可观测支持，可以无缝集成Spring Boot可观测性：

```java
@RestController
public class GraphController {
    
    public GraphController(@Qualifier("workflowGraph") StateGraph stateGraph,
                          ObjectProvider<ObservationRegistry> observationRegistry) {
        this.compiledGraph = stateGraph.compile(CompileConfig.builder()
            .withLifecycleListener(new GraphObservationLifecycleListener(
                observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP)))
            .build());
    }
}
```
