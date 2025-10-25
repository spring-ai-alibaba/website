---
title: 什么是 Spring AI Alibaba？
keywords: [Spring AI Alibaba, 智能体框架, AI 应用开发, 多智能体, Graph]
description: "Spring AI Alibaba 是一款以 Spring AI 为基础，深度集成百炼平台，支持 ChatBot、工作流、多智能体应用开发模式的 AI 框架。"
---

## 概述

Spring AI Alibaba 是一款以 Spring AI 为基础，深度集成百炼平台，支持 ChatBot、工作流、多智能体应用开发模式的 AI 框架。它专为 Java 开发者设计，提供了从单智能体到多智能体系统的完整解决方案。

![Spring AI Alibaba 架构图](/img/user/ai/overview/1.0.0/spring-ai-alibaba-architecture.png)

## 核心特性

Spring AI Alibaba 提供以下核心能力，帮助开发者快速构建自己的 Agent、Workflow 或 Multi-agent 应用：

### 1. Graph 多智能体框架

基于 Spring AI Alibaba Graph，开发者可以快速构建工作流、多智能体应用，无需关心流程编排、上下文记忆管理等底层实现。主要特性包括：

- **声明式 API**：通过有向图的形式连接节点，创建可定制的执行流程
- **预定义组件**：内置 ReAct Agent、Supervisor 等常见智能体模式
- **可视化支持**：支持 Dify DSL 自动生成 Graph 代码，支持 Graph 可视化调试
- **流式处理**：原生支持流式输出和处理
- **人机协作**：通过人类确认节点，支持状态修改和执行恢复
- **持久化**：支持记忆与持久存储，支持流程快照
- **并行处理**：支持嵌套分支、并行分支

### 2. 企业级 AI 生态集成

Spring AI Alibaba 通过与阿里云生态的深度集成，解决企业智能体落地过程中的关键痛点：

#### 模型服务集成
- **百炼 DashScope**：深度集成通义千问等主流模型
- **多模型支持**：支持 Qwen、DeepSeek 等多种模型系列
- **统一接口**：通过标准化 API 访问不同模型服务

#### 数据与工具集成
- **百炼 RAG 知识库**：利用百炼平台的数据解析、切片、向量化能力
- **MCP 集成**：企业级的 MCP（模型上下文协议）集成，包括 Nacos MCP Registry 分布式注册与发现
- **工具调用**：支持丰富的工具调用和外部系统集成

#### 可观测性与监控
- **ARMS 集成**：与阿里云应用实时监控服务深度集成
- **Langfuse 支持**：支持主流 AI 可观测产品
- **链路追踪**：完整的 AI 应用调用链路追踪

### 3. 通用智能体产品与平台

社区基于 Spring AI Alibaba 框架探索具备自主规划能力的通用智能体产品：

- **JManus**：完整的通用智能体平台实现
- **DeepResearch**：深度研究智能体，支持复杂的研究任务
- **NL2SQL**：自然语言到 SQL 的自动生成服务
- **零代码构建**：为开发者提供从低代码、高代码到零代码构建智能体的灵活选择

## 与 Spring AI 的关系

Spring AI 是 Spring 官方社区维护的开源框架，专注于 AI 能力构建的底层原子能力抽象以及与 Spring Boot 生态的无缝集成。

Spring AI Alibaba 基于 Spring AI 构建，在继承其所有核心能力的基础上，提供了：

- **更高层次的抽象**：Graph 框架用于多智能体编排
- **企业级解决方案**：完整的生产环境部署和运维方案
- **阿里云生态集成**：与百炼、ARMS、Nacos 等深度集成
- **最佳实践**：基于企业智能体构建过程的实践总结

## 技术架构

### 核心组件

1. **ChatClient**：与 AI 模型通信的 Fluent API，支持同步和响应式编程
2. **Graph 框架**：基于状态图的工作流和多智能体编排引擎
3. **StateGraph**：定义节点和边的状态图
4. **Node 系统**：封装具体操作或模型调用的节点
5. **OverAllState**：贯穿流程的全局状态管理

### 设计理念

- **声明式编程**：通过配置而非编码定义智能体行为
- **模块化设计**：组件可独立使用和组合
- **企业级考量**：从设计之初就考虑生产环境的需求
- **生态集成**：与 Spring 和阿里云生态深度融合

## 应用场景

### 单智能体应用
- 聊天机器人
- 智能客服
- 内容生成助手
- 代码助手

### 工作流应用
- 文档处理流程
- 数据分析管道
- 内容审核流程
- 业务流程自动化

### 多智能体应用
- 协作式问题解决
- 复杂任务分解
- 专家系统集成
- 智能决策支持

## 快速开始

添加 Spring AI Alibaba 依赖到您的项目：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-bom</artifactId>
            <version>1.0.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
</dependencies>
```

配置您的 API 密钥：

```properties
spring.ai.dashscope.api-key=your-api-key
```

现在您可以开始构建您的第一个智能体应用了！

## 社区与支持

- **官网**：[https://java2ai.com](https://java2ai.com)
- **GitHub 仓库**：[https://github.com/alibaba/spring-ai-alibaba](https://github.com/alibaba/spring-ai-alibaba)
- **示例仓库**：[https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)
- **Playground 体验**：完整的前端 UI + 后端实现示例

Spring AI Alibaba 致力于为 Java 开发者提供最佳的 AI 应用开发体验，让智能体开发变得简单而强大。
