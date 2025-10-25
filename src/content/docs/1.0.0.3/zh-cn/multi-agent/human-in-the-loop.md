---
title: 人机协作 (Human-in-the-loop)
description: Spring AI Alibaba 人机协作机制
---

# 人机协作 (Human-in-the-loop)

在实际业务场景中，完全自动化的智能体往往无法满足所有需求。有时我们需要在关键决策点引入人工干预，比如审核敏感操作、修正错误输出或提供额外信息。Spring AI Alibaba 提供了完整的人机协作机制，让您可以在工作流的任意节点暂停执行，等待人工处理后再继续。

## 核心概念

人机协作的核心是在自动化流程中引入人工决策点。当工作流执行到需要人工干预的节点时，系统会自动暂停执行并保存当前状态，等待人工提供反馈后再继续执行。这种机制特别适用于：

- **审批流程**：重要操作需要人工确认
- **内容审核**：AI生成的内容需要人工校对
- **异常处理**：自动化流程遇到异常时需要人工介入
- **质量控制**：确保输出结果符合业务要求

Spring AI Alibaba 提供了两种实现方式：

### 动态中断 (HumanNode)
这是生产环境推荐的方式。通过 `HumanNode` 可以根据运行时的业务逻辑动态决定是否需要人工干预。它支持条件判断，只在满足特定条件时才会中断执行。

### 静态中断 (Breakpoints)
主要用于开发和调试阶段。在编译时预设中断点，工作流执行到指定节点时会自动暂停，方便开发者检查执行状态和调试问题。

## 使用 HumanNode

`HumanNode` 是实现人机协作的核心组件。它可以智能地判断何时需要人工干预，并提供灵活的反馈处理机制。

### 工作原理

`HumanNode` 的工作流程分为四个阶段：

1. **中断判断**：根据配置的策略（always 或 conditioned）决定是否需要中断
2. **状态保存**：将当前执行状态持久化到存储中
3. **等待反馈**：抛出中断异常，暂停工作流执行
4. **恢复执行**：接收到人工反馈后，更新状态并继续执行

这种设计确保了工作流的状态一致性，即使在长时间等待人工反馈的情况下，也能准确恢复到中断点继续执行。

### 基本用法

创建和使用 `HumanNode` 需要以下几个步骤：

```java
// 1. 创建 HumanNode
public HumanNode createReviewNode() {
    return HumanNode.builder()
        .interruptStrategy("always") // 总是中断
        .stateUpdateFunc(this::handleReviewResult)
        .build();
}

// 2. 处理人工反馈
private Map<String, Object> handleReviewResult(OverAllState state) {
    if (state.humanFeedback() != null) {
        Map<String, Object> feedback = state.humanFeedback().data();
        boolean approved = (Boolean) feedback.getOrDefault("approved", false);
        return Map.of("review_status", approved ? "通过" : "拒绝");
    }
    return Map.of();
}

// 3. 配置工作流
@Bean
public CompiledGraph createWorkflow() {
    StateGraph workflow = new StateGraph()
        .addNode("review", createReviewNode())
        .addEdge(START, "review")
        .addEdge("review", END);

    CompileConfig config = CompileConfig.builder()
        .saverConfig(SaverConfig.builder()
            .register(SaverConstant.MEMORY, new MemorySaver())
            .build())
        .build();

    return workflow.compile(config);
}

// 4. 启动和恢复
public void startProcess() {
    RunnableConfig config = RunnableConfig.builder()
        .threadId("thread_123")
        .build();

    try {
        graph.invoke(Map.of("content", "待审核内容"), config);
    } catch (GraphRunnerException e) {
        if (e.getMessage().contains("interrupt")) {
            // 工作流已暂停，等待人工处理
        }
    }
}

public void submitFeedback(String threadId, boolean approved) {
    RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();

    StateSnapshot snapshot = graph.getState(config);
    OverAllState state = snapshot.state();
    state.withResume();
    state.withHumanFeedback(new OverAllState.HumanFeedback(
        Map.of("approved", approved), null
    ));

    graph.invoke(state, config); // 恢复执行
}
```

上面的示例展示了人机协作的完整流程：

1. **创建 HumanNode**：配置中断策略和反馈处理函数
2. **配置工作流**：将 HumanNode 集成到工作流中，并启用状态持久化
3. **启动流程**：调用 `invoke` 方法启动工作流，捕获中断异常
4. **提供反馈**：通过 `withHumanFeedback` 方法提供人工反馈
5. **恢复执行**：重新调用 `invoke` 方法继续执行

### 中断策略

`HumanNode` 支持两种中断策略，可以根据业务需求灵活选择：

#### 总是中断 (always)
这种策略下，每次执行到该节点都会中断，适用于必须人工确认的场景，如重要操作的审批、敏感内容的审核等。

#### 条件中断 (conditioned)
这种策略更加智能，只有在满足特定条件时才会中断。通过 `interruptCondition` 函数可以定义复杂的业务逻辑，实现精确的中断控制。

```java
// 按条件中断
public HumanNode createConditionalNode() {
    return HumanNode.builder()
        .interruptStrategy("conditioned")
        .interruptCondition(state -> {
            String type = state.value("content_type", String.class).orElse("");
            return "sensitive".equals(type); // 只有敏感内容才需要审核
        })
        .stateUpdateFunc(this::handleReview)
        .build();
}
```

条件中断特别适用于以下场景：
- **内容分类审核**：只有敏感或高风险内容才需要人工审核
- **金额阈值控制**：超过一定金额的交易才需要人工确认
- **异常情况处理**：只有在检测到异常时才需要人工介入

## 状态管理

人机协作的关键在于状态的正确管理。Spring AI Alibaba 通过 CheckpointSaver 机制确保状态的持久化和一致性。

### 状态持久化
当工作流在 `HumanNode` 处中断时，系统会自动将当前状态保存到配置的存储中（如内存、数据库或Redis）。这确保了即使应用重启，也能从中断点准确恢复执行。

### 状态恢复
恢复执行时，系统会重新加载保存的状态，并从 `HumanNode` 开始重新执行。需要注意的是，这是重新执行整个节点，而不是从精确的中断位置继续，因此要避免在 `HumanNode` 中包含有副作用的操作。

### 反馈处理
人工反馈通过 `stateUpdateFunc` 函数处理，该函数接收当前状态和人工反馈数据，返回需要更新的状态字段。这种设计提供了最大的灵活性，可以根据反馈内容进行复杂的状态更新。

## 使用静态中断

静态中断是一种编译时配置的调试工具，主要用于开发阶段的问题排查和性能分析。与动态中断不同，静态中断的位置在编译时就已确定，不能根据运行时条件动态调整。

### 配置方式

静态中断通过 `CompileConfig` 进行配置，支持在节点执行前后设置断点：

```java
CompileConfig config = CompileConfig.builder()
    .saverConfig(SaverConfig.builder()
        .register(SaverEnum.MEMORY.getValue(), new MemorySaver())
        .build())
    .interruptAfter("nodeB")  // 在 nodeB 执行后中断
    .interruptBefore("nodeC") // 在 nodeC 执行前中断
    .build();

CompiledGraph graph = workflow.compile(config);

// 执行到断点
graph.stream(Map.of(), config);

// 继续执行
graph.stream(null, config);
```

静态中断的配置选项说明：

- **interruptAfter**：在指定节点执行完成后中断，用于检查节点的输出结果
- **interruptBefore**：在指定节点执行前中断，用于检查输入参数和状态
- **interruptBeforeEdge**：控制是否在条件边缘评估前中断，这对调试条件路由很有用

