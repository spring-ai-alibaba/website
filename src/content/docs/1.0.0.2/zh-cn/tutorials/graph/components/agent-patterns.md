---
title: Agent模式
keywords: [Spring AI,Agent模式,ReactAgent,ReflectAgent,人机协作Agent]
description: "掌握 Spring AI Alibaba Graph 的预定义Agent模式，快速构建智能化应用。"
---

## Graph预定义组件：Agent模式

**Spring AI Alibaba Graph提供了多种预定义Agent模式**，这些Agent代表了AI工作流设计的最佳实践。每种Agent都针对特定的应用场景进行了优化，开发者可以直接使用或作为自定义Agent的起点。

### 核心设计原则

**1. 组合优于继承**
- Agent通过组合预定义节点实现复杂功能
- 内部封装StateGraph，对外提供简洁API
- 支持插件式的Hook机制扩展功能

**2. 状态管理标准化**
- 统一的KeyStrategyFactory配置
- 标准化的消息流转格式
- 一致的状态更新机制

**3. 编译时优化**
- 提前编译StateGraph提升性能
- 支持中断与恢复的高级特性
- 内置错误处理和容错机制

## ReactAgent - 反应式Agent

**ReactAgent是最经典的AI Agent模式**，实现了"思考-行动-观察"的循环机制。它能够根据当前情况动态选择合适的工具，通过多轮交互解决复杂问题。

### 核心特性

- **动态工具选择**：根据问题自动选择合适的工具
- **迭代问题解决**：支持多轮交互直到问题解决
- **灵活的Hook机制**：支持前置/后置处理钩子
- **智能终止条件**：自动判断何时结束推理循环

### ReactAgent核心配置

ReactAgent通过Builder模式提供灵活的配置：

```java
ReactAgent agent = ReactAgent.builder()
    .name("智能助手")
    .chatClient(chatClient)
    .resolver(toolCallbackResolver)
    .maxIterations(10)
    .state(() -> {
        HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
        keyStrategyHashMap.put("messages", new AppendStrategy());
        return keyStrategyHashMap;
    })
    .shouldContinueFunction(state -> {
        // 自定义终止条件检查
        List<Message> messages = (List<Message>) state.value("messages").orElseThrow();
        AssistantMessage lastMessage = (AssistantMessage) messages.get(messages.size() - 1);
        
        // 检查是否达到预期目标
        return !lastMessage.getText().contains("任务完成");
    })
    .preLlmHook(state -> {
        // LLM调用前预处理
        return Map.of("timestamp", System.currentTimeMillis());
    })
    .postLlmHook(state -> {
        // LLM调用后处理  
        return Map.of("processed", true);
    })
    .preToolHook(state -> {
        // 工具调用前准备
        return Map.of("tool_context", "prepared");
    })
    .postToolHook(state -> {
        // 工具调用后清理
        return Map.of("tool_result", "collected");
    })
    .build();
```

### 高级配置with Hook机制

```java
ReactAgent advancedAgent = ReactAgent.builder()
    .name("advanced_research_agent")
    .chatClient(chatClient)
    .resolver(toolCallbackResolver)  // 使用工具解析器
    .maxIterations(15)
    .state(() -> {
        Map<String, KeyStrategy> strategies = new HashMap<>();
        strategies.put("messages", new AppendStrategy());
        strategies.put("iteration_count", new ReplaceStrategy());
        return strategies;
    })
    .shouldContinueFunction(state -> {
        // 自定义终止条件
        Integer iterations = (Integer) state.value("iteration_count").orElse(0);
        List<Message> messages = (List<Message>) state.value("messages").orElse(List.of());
        return iterations < 10 && messages.size() < 50; // 实际的终止条件
    })
    // Hook机制扩展
    .preLlmHook(state -> {
        // LLM调用前的预处理
        List<?> messages = (List<?>) state.value("messages").orElse(List.of());
        logger.info("准备调用LLM，当前消息数：{}", messages.size());
        return Map.of("context_prepared", true);
    })
    .postLlmHook(state -> {
        // LLM调用后的处理
        Integer count = (Integer) state.value("iteration_count").orElse(0);
        return Map.of("iteration_count", count + 1, "llm_processed", true);
    })
    .preToolHook(state -> {
        // 工具调用前的准备
        String toolContext = "Timestamp: " + System.currentTimeMillis();
        return Map.of("tool_context", toolContext);
    })
    .postToolHook(state -> {
        // 工具调用后的清理
        return Map.of("tool_result_processed", true);
    })
    .build();
```

### 内部图结构

ReactAgent内部构建的StateGraph结构：

```java
// ReactAgent内部的图结构
private StateGraph initGraph() throws GraphStateException {
    StateGraph graph = new StateGraph(name, keyStrategyFactory);
    
    // 添加节点
    if (preLlmHook != null) {
        graph.addNode("preLlm", node_async(preLlmHook));
    }
    graph.addNode("llm", node_async(this.llmNode));
    if (postLlmHook != null) {
        graph.addNode("postLlm", node_async(postLlmHook));
    }
    
    if (preToolHook != null) {
        graph.addNode("preTool", node_async(preToolHook));
    }
    graph.addNode("tool", node_async(this.toolNode));
    if (postToolHook != null) {
        graph.addNode("postTool", node_async(postToolHook));
    }
    
    // 构建边和条件逻辑
    if (preLlmHook != null) {
        graph.addEdge(START, "preLlm").addEdge("preLlm", "llm");
    } else {
        graph.addEdge(START, "llm");
    }
    
    // 核心思考逻辑
    if (postLlmHook != null) {
        graph.addEdge("llm", "postLlm")
            .addConditionalEdges("postLlm", edge_async(this::think),
                Map.of("continue", preToolHook != null ? "preTool" : "tool", 
                       "end", END));
    } else {
        graph.addConditionalEdges("llm", edge_async(this::think),
            Map.of("continue", preToolHook != null ? "preTool" : "tool", 
                   "end", END));
    }
    
    // 工具执行流程
    if (preToolHook != null) {
        graph.addEdge("preTool", "tool");
    }
    if (postToolHook != null) {
        graph.addEdge("tool", "postTool")
            .addEdge("postTool", preLlmHook != null ? "preLlm" : "llm");
    } else {
        graph.addEdge("tool", preLlmHook != null ? "preLlm" : "llm");
    }
    
    return graph;
}
```

### 核心思考逻辑

```java
private String think(OverAllState state) {
    // 检查迭代次数限制
    if (iterations > max_iterations) {
        return "end";
    }
    
    // 自定义终止条件
    if (shouldContinueFunc != null && !shouldContinueFunc.apply(state)) {
        return "end";
    }
    
    // 检查是否需要工具调用
    List<Message> messages = (List<Message>) state.value("messages").orElseThrow();
    AssistantMessage lastMessage = (AssistantMessage) messages.get(messages.size() - 1);
    
    if (lastMessage.hasToolCalls()) {
        return "continue";  // 需要工具调用
    }
    
    return "end";  // 任务完成
}
```

### 子图适配器模式

ReactAgent可以作为其他工作流的子节点使用：

```java
// 将ReactAgent作为子图节点
StateGraph parentWorkflow = new StateGraph("parent_workflow", keyStrategyFactory)
    .addNode("data_preparation", dataPreparationNode)
    .addNode("react_analysis", reactAgent.asAsyncNodeAction("input_data", "analysis_result"))
    .addNode("report_generation", reportGenerationNode)
    .addEdge(START, "data_preparation")
    .addEdge("data_preparation", "react_analysis")
    .addEdge("react_analysis", "report_generation")
    .addEdge("report_generation", END);
```

## ReactAgentWithHuman - 人机协作Agent

**ReactAgentWithHuman扩展了ReactAgent**，增加了人机交互能力。它能够在需要时主动暂停执行，等待人类专家的输入和指导。

### 核心特性

- **智能中断机制**：支持条件中断和强制中断
- **人类反馈集成**：无缝集成人类专家的建议
- **状态恢复能力**：中断后可以完整恢复执行状态
- **灵活的交互策略**：支持多种人机协作模式

### 基础配置

```java
ReactAgentWithHuman humanAgent = ReactAgentWithHuman.builder()
    .name("human_assisted_agent")
    .prompt("你是一个需要人类协助的AI分析师")
    .chatClient(chatClient)
    .tools(List.of(complexAnalysisTools))
    .maxIterations(20)
    .shouldInterruptFunction(state -> {
        // 复杂决策时需要人类介入
        List<Message> messages = (List<Message>) state.value("messages").orElse(List.of());
        return messages.size() > 5; // 简单的消息数量判断
    })
    .build();
```

### 内部图结构

```java
// ReactAgentWithHuman的简化图结构
private StateGraph initGraph() throws GraphStateException {
    StateGraph graph = new StateGraph(name, keyStrategyFactory)
        .addNode("agent", node_async(this.llmNode))
        .addNode("human", node_async(this.humanNode))  // 人机交互节点
        .addNode("tool", node_async(this.toolNode))
        .addEdge(START, "agent")
        .addEdge("agent", "human")
        .addConditionalEdges("human", edge_async(humanNode::think),
            Map.of("agent", "agent", "tool", "tool", "end", END))
        .addEdge("tool", "agent");
    
    return graph;
}
```

### HumanNode核心实现

```java
@Override
public Map<String, Object> apply(OverAllState state) throws GraphRunnerException {
    var shouldInterrupt = interruptStrategy.equals("always")
        || (interruptStrategy.equals("conditioned") && interruptCondition.apply(state));
    
    if (shouldInterrupt) {
        interrupt(state);  // 触发中断
        Map<String, Object> data = Map.of();
        
        if (state.humanFeedback() != null) {
            if (stateUpdateFunc != null) {
                data = stateUpdateFunc.apply(state);
            } else {
                // 默认处理：过滤并更新状态
                data = state.humanFeedback().data();
                Map<String, Object> filtered = data.entrySet().stream()
                    .filter(e -> state.value(e.getKey()).isPresent())
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
                data = filtered;
            }
        }
        
        state.withoutResume();
        return data;
    }
    return Map.of();
}
```

### 人机交互示例

```java
// 执行时的人机交互
CompileConfig config = CompileConfig.builder()
    .interruptBefore("human")
    .saverConfig(SaverConfig.builder()
        .register(SaverConstant.MEMORY, new MemorySaver())
        .build())
    .build();

CompiledGraph compiledAgent = humanAgent.getAndCompileGraph(config);

// 首次执行 - 会在人机交互节点中断
try {
    OverAllState result = compiledAgent.invoke(Map.of(
        "messages", List.of(new UserMessage("分析这个复杂的商业案例"))
    )).get();
} catch (NodeInterruptException e) {
    // 处理中断，准备人类反馈
    logger.info("Agent请求人类协助：{}", e.getMessage());
}

// 提供人类反馈并恢复执行
HumanFeedback feedback = new HumanFeedback(
    Map.of(
        "expert_advice", "建议专注于财务风险分析",
        "additional_context", "考虑宏观经济因素"
    ),
    "agent"  // 下一个节点
);

OverAllState finalResult = compiledAgent.resume(feedback, 
    RunnableConfig.builder().threadId("human-session-1").build()).get();
```

## ReflectAgent - 反思Agent

**ReflectAgent实现了自我反思和迭代改进的能力**，它能够评估自己的输出质量，并在必要时进行反思和改进。

### 核心特性

- **自我评估能力**：能够评判自己的输出质量
- **迭代改进机制**：基于反思结果进行优化
- **灵活的反思策略**：支持自定义反思逻辑
- **收敛控制**：智能的迭代终止条件

### 基础配置

```java
// 创建图节点
LlmNode analysisNode = LlmNode.builder()
    .chatClient(chatClient)
    .systemPromptTemplate("你是一个数据分析专家，请分析以下数据并给出结论")
    .messagesKey("messages")
    .build();

LlmNode reflectionNode = LlmNode.builder()
    .chatClient(chatClient)
    .systemPromptTemplate("""
        请评估以下分析结果的质量：
        1. 逻辑是否严密
        2. 结论是否有说服力  
        3. 是否需要改进
        
        如果需要改进，请提供具体建议。
        """)
    .messagesKey("messages")
    .build();

// 创建反思Agent
ReflectAgent reflectAgent = ReflectAgent.builder()
    .name("data_analysis_reflector")
    .graph(analysisNode)
    .reflection(reflectionNode)
    .maxIterations(5)
    .build();
```

### 内部图结构

```java
public StateGraph createReflectionGraph(NodeAction graph, NodeAction reflection, int maxIterations) 
        throws GraphStateException {
    
    StateGraph stateGraph = new StateGraph(() -> {
        HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
        keyStrategyHashMap.put(MESSAGES, new ReplaceStrategy());
        keyStrategyHashMap.put(ITERATION_NUM, new ReplaceStrategy());
        return keyStrategyHashMap;
    })
    .addNode("graph", node_async(graph))           // 主要图节点
    .addNode("reflection", node_async(reflection)) // 反思节点
    .addEdge(START, "graph")
    .addConditionalEdges("graph", edge_async(this::graphCount),
        Map.of("reflection", "reflection", END, END))
    .addConditionalEdges("reflection", edge_async(this::apply),
        Map.of("graph", "graph", END, END));
    
    return stateGraph;
}
```

### 核心控制逻辑

**1. 图计数逻辑**
```java
public String graphCount(OverAllState state) throws Exception {
    Optional<Object> iterationNumOptional = state.value(ITERATION_NUM);
    
    if (!iterationNumOptional.isPresent()) {
        // 初始化迭代计数器
        state.updateState(Map.of(ITERATION_NUM, 1));
    } else {
        Integer iterationNum = (Integer) iterationNumOptional.get();
        
        if (iterationNum >= maxIterations) {
            // 达到最大迭代次数
            state.updateState(Map.of(ITERATION_NUM, 0));
            this.printMessage(state);
            return END;
        }
        
        // 增加迭代计数
        state.updateState(Map.of(ITERATION_NUM, iterationNum + 1));
    }
    
    return "reflection";
}
```

**2. 反思决策逻辑**
```java
public String apply(OverAllState state) throws Exception {
    List<Message> messages = (List<Message>) state.value(MESSAGES).get();
    
    if (messages.isEmpty()) {
        return END;
    }
    
    // 检查最后一条消息类型
    if (messages.get(messages.size() - 1).getMessageType().equals(MessageType.ASSISTANT)) {
        // 如果是助手消息且表明任务完成，则结束
        return END;
    }
    
    // 继续反思循环
    return "graph";
}
```
