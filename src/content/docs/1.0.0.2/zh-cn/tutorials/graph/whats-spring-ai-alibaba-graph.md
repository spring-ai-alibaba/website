---
title: Spring AI Alibaba Graph 简介
keywords: [Spring AI,通义千问,百炼,智能体应用,LangGraph,Java]
description: "Spring AI Alibaba Graph 帮助开发者更容易构建智能体应用和工作流。"
---

## 什么是 Spring AI Alibaba Graph

Spring AI Alibaba Graph 是社区核心实现之一，也是整个框架在设计理念上区别于 Spring AI 只做底层原子抽象的地方。Spring AI Alibaba 期望帮助开发者更容易的构建智能体应用，基于 Graph 开发者可以构建工作流、多智能体应用。

### 设计理念与 LangGraph 对齐

Spring AI Alibaba Graph 在设计理念上借鉴 LangGraph，因此在一定程度上可以理解为是 **Java 版的 LangGraph 实现**。如果您熟悉 LangGraph 的开发模式，那么使用 Spring AI Alibaba Graph 将会非常顺手。

**主要对齐特性：**
- **状态图模型**：与 LangGraph 相同的 StateGraph 概念
- **节点和边**：相同的工作流构建方式
- **状态管理**：类似的状态传递和合并机制
- **条件路由**：相同的条件分支处理逻辑

社区在 LangGraph 基础上增加了大量预置 Node、简化了 State 定义过程等，让开发者更容易编写对等低代码平台的工作流、多智能体等。

## 核心特性

Spring AI Alibaba Graph具有以下核心特性：

### Java生态深度集成
- **Spring原生支持**：完整的依赖注入、配置管理、监控观测

### 丰富的预置组件
- **10+ 预定义节点类型**：QuestionClassifierNode、LlmNode、ToolNode、KnowledgeRetrievalNode等
- **多种Agent模式**：内置React、Reflection等智能体模式
- **简化的State管理**：统一的状态定义和合并策略

### 声明式API设计
- **类似LangGraph的API**：Java开发者更容易上手
- **链式调用**：简洁的流式API，代码更加优雅
- **条件分支**：支持复杂的条件逻辑和并行处理

### 支持特性
- **观测性支持**：完整的指标收集、链路追踪
- **中断/恢复机制**：支持检查点、状态恢复、错误处理
- **人机协作**：Human-in-the-loop支持，支持修改状态、恢复执行
- **流式透传**：原生支持Stream流式输出透传
- **复杂结构**：支持子图/并行分支
- **可视化导出**：支持PlantUML、Mermaid可视化导出
- **状态记忆**：支持记忆和持久化存储

## 快速预览：客户评价分类系统

让我们通过一个具体示例了解Spring AI Alibaba Graph的使用方式。这个示例展示了如何构建一个客户评价分类系统：

### 系统架构图

![系统架构图](/img/user/ai/tutorials/graph/introduction/customer-service-workflow.svg)

### 核心代码实现

```java
@Configuration
public class CustomerServiceWorkflow {
    
    @Bean
    public StateGraph customerServiceGraph(ChatModel chatModel) {
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultAdvisors(new SimpleLoggerAdvisor())
            .build();
        
        // 评价分类器 - 区分正面/负面评价
        QuestionClassifierNode feedbackClassifier = QuestionClassifierNode.builder()
            .chatClient(chatClient)
            .inputTextKey("input")
            .outputKey("classifier_output")
            .categories(List.of("positive feedback", "negative feedback"))
            .build();
        
        // 问题细分器 - 对负面评价进行细分
        QuestionClassifierNode specificQuestionClassifier = QuestionClassifierNode.builder()
            .chatClient(chatClient)
            .inputTextKey("input")
            .outputKey("classifier_output")
            .categories(List.of("after-sale service", "transportation", "product quality", "others"))
            .build();
        
        // 状态工厂定义 - 简化的状态管理
        KeyStrategyFactory stateFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", new ReplaceStrategy());
            strategies.put("classifier_output", new ReplaceStrategy());
            strategies.put("solution", new ReplaceStrategy());
            return strategies;
        };
        
        // 构建工作流 - 声明式API
        return new StateGraph("客户服务评价处理", stateFactory)
            .addNode("feedback_classifier", node_async(feedbackClassifier))
            .addNode("specific_question_classifier", node_async(specificQuestionClassifier))
            .addNode("recorder", node_async(new RecordingNode()))
            .addEdge(START, "feedback_classifier")
            .addConditionalEdges("feedback_classifier",
                edge_async(new FeedbackQuestionDispatcher()),
                Map.of("positive", "recorder", "negative", "specific_question_classifier"))
            .addEdge("recorder", END);
    }
}
```

### 核心特性展示

这个示例展示了Spring AI Alibaba Graph的核心特性：
- **预置组件**：使用QuestionClassifierNode快速实现分类功能
- **简化状态管理**：通过KeyStrategyFactory统一管理状态
- **Spring Boot集成**：通过@Configuration和@Bean完成依赖注入

## 适用场景

Spring AI Alibaba Graph特别适合以下场景：

### 智能体应用
- **客服机器人**：多轮对话、问题分类、知识检索
- **代码助手**：代码分析、自动修复、测试生成
- **文档处理**：内容提取、分析、总结、翻译

### 工作流编排
- **业务流程自动化**：审批流程、数据处理流水线
- **内容生产流水线**：写作、审核、发布的完整流程
- **数据分析流水线**：数据清洗、分析、报告生成

### 多智能体协作
- **团队协作模拟**：不同角色的AI协作完成复杂任务
- **专家系统**：多个专业领域AI的协调工作
- **研究助手**：调研、分析、报告生成的协作流程

## 完整示例

🔗 [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-graph-example) 仓库包含了大量完整的可运行Graph功能示例和应用，您可以参考以快速上手 Spring AI Alibaba Graph 的开发。
