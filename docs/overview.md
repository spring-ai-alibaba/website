---
sidebar_position: 1
title: 概览
description: Spring AI Alibaba 是构建 Agent 智能体应用最简单的方式，基于 Spring AI 与阿里云通义模型深度集成，提供 ReactAgent、Graph 工作流、多智能体编排等核心能力
keywords: [Spring AI Alibaba, Agent Framework, ReactAgent, Graph Core, 智能体, AI应用开发, 阿里云通义, Java AI框架, 多智能体系统]
---

# 概览

**我们非常高兴的宣布，Spring AI Alibaba 1.1 正式发布!**

Spring AI Alibaba 是构建 Agent 智能体应用最简单的方式，只需不到 10 行代码就可以构建您的智能体应用。

![Architecture](/img/agent/overview/architecture-new.png)

> **注意！** Spring Ai Alibaba 深度集成 Spring AI 生态，它是一个专为多智能体系统和工作流编排设计的项目。因此，Spring Ai Alibaba 中的 `ReactAgent` 实际上运行在 Graph Runtime 之上，其设计目标主要是完成工作流和多智能体编排功能。

> 如果您正在寻找更高级的 ReactAgent 范式来构建模型驱动的智能体，请参阅我们近期发布的 **<a href="https://github.com/agentscope-ai/agentscope-java">AgentScope</a>** 项目。Spring Ai Alibaba 的ReactAgent部分将继续得到维护，并持续接收问题修复和关键安全补丁，我们将更专注于Spring Ai 集成与多智能体协同。

Spring AI Alibaba 项目从架构上包含如下三层：

* **Agent Framework**，是一个以 ReactAgent 设计理念为核心的 Agent 开发框架，使开发者能够构建具备自动上下文工程和人机交互等核心能力的Agent。
* **Graph**，graph 是一个低级别的工作流和多代理协调框架，能够帮助开发者实现复杂的应用程序编排，它具备丰富的预置节点和简化的图状态定义，Graph 是 Agent Framework 的底层运行时基座。
* **Augmented LLM**，以 Spring AI 框架底层原子抽象为基础，为构建大型语言模型（LLM）应用提供基础抽象，例如模型（Model）、工具（Tool）、多模态组件（MCP）、消息（Message）、向量存储（Vector Store）等。

## 设计原则
我们推荐您使用 Agent Framework 内置的 `ReactAgent` 抽象快速构建 Agent 应用。

如果您需要组合 Multi-agent，Agent Framework 还预置了如 `SequentialAgent（顺序代理）` 、`ParallelAgent（并行代理）` 、`RoutingAgent（路由代理）` 和 `LoopAgent（循环代理）` 等基础多智能体工作流模式。

对于一些开发场景而言，直接使用 `Graph API` 也是可行的，它能为应用开发提供更灵活的编排、更直接的状态控制，适用于需要超高可靠性、大量自定义逻辑、需要精确控制延迟时的场景。

## 安装

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-agent-framework</artifactId>
    <version>1.1.0.0-RC2</version>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    <version>1.1.0.0-RC2</version>
</dependency>
```

## 创建 Agent

```java
import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.CompileConfig;

import org.springframework.ai.chat.model.ChatModel;

public class AgentExample {

    public static void main(String[] args) throws Exception {
        // 创建模型实例
        DashScopeApi dashScopeApi = DashScopeApi.builder()
            .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
            .build();
        ChatModel chatModel = DashScopeChatModel.builder()
            .dashScopeApi(dashScopeApi)
            .build();

        // 创建 Agent
        ReactAgent agent = ReactAgent.builder()
            .name("weather_agent")
            .model(chatModel)
            .instruction("You are a helpful weather forecast assistant.")
            .build();

        // 运行 Agent
        agent.call("what is the weather in Hangzhou?");
    }
}
```

## 核心功能

* **ReactAgent**：构建具有推理和行动能力的智能代理，遵循 ReAct（推理 + 行动）范式，用于迭代解决问题。

* **多代理编排**：使用内置模式（包括 `SequentialAgent1、`ParallelAgent`、`LlmRoutingAgent`和`LoopAgent`）组合多个代理，以执行复杂的任务。

* **上下文工程**：内置快速工程、上下文管理和对话流控制的最佳实践，以提高代理的可靠性和性能。

* **人机协同**：将人工反馈和审批步骤无缝集成到代理工作流程中，从而实现关键工具和操作的监督执行。

* **流式传输支持**：代理响应的实时流式传输

* **错误处理**：强大的错误恢复和重试机制

* **基于图的工作流**：基于图的工作流运行时和 API，用于条件路由、嵌套图、并行执行和状态管理。可将工作流导出为 PlantUML 和 Mermaid 格式。

* **A2A 支持**：通过 Nacos 集成支持代理间通信，实现跨服务的分布式代理协调和协作。

* **丰富的模型、工具和 MCP 支持**：利用 Spring AI 的核心概念，支持多种 LLM 提供程序（DashScope、OpenAI 等）、工具调用和模型上下文协议 (MCP)。
