---
title: What is Spring AI Alibaba?
keywords: [Spring AI Alibaba, Agent Framework, AI Application Development, Multi-Agent, Graph]
description: "Spring AI Alibaba is an AI framework based on Spring AI, deeply integrated with the Bailian platform, supporting ChatBot, workflow, and multi-agent application development modes."
---

## Overview

Spring AI Alibaba is an AI framework based on Spring AI, deeply integrated with the Bailian platform, supporting ChatBot, workflow, and multi-agent application development modes. It is specifically designed for Java developers, providing a complete solution from single-agent to multi-agent systems.

![Spring AI Alibaba Architecture](/img/user/ai/overview/1.0.0/spring-ai-alibaba-architecture.png)

## Core Features

Spring AI Alibaba provides the following core capabilities to help developers quickly build Agent, Workflow, or Multi-agent applications:

### 1. Graph-based Multi-Agent Framework

With Spring AI Alibaba Graph, developers can quickly build workflows and multi-agent applications without worrying about process orchestration and context memory management. Key features include:

- **Declarative API**: Connect nodes through directed graphs to create customizable execution flows
- **Pre-built Components**: Built-in ReAct Agent, Supervisor, and other common agent patterns
- **Visual Support**: Support for automatic Graph code generation from Dify DSL and visual debugging
- **Streaming**: Native support for streaming output and processing
- **Human-in-the-loop**: Support for state modification and execution recovery through human confirmation nodes
- **Persistence**: Support for memory and persistent storage, including process snapshots
- **Parallel Processing**: Support for nested branches and parallel branches

### 2. Enterprise-ready AI Ecosystem Integration

Spring AI Alibaba solves key pain points in enterprise agent deployment through deep integration with Alibaba Cloud ecosystem:

#### Model Service Integration
- **Bailian DashScope**: Deep integration with Tongyi Qianwen and other mainstream models
- **Multi-model Support**: Support for Qwen, DeepSeek, and other model series
- **Unified Interface**: Access different model services through standardized APIs

#### Data and Tool Integration
- **Bailian RAG Knowledge Base**: Leverage Bailian platform's data parsing, chunking, and vectorization capabilities
- **MCP Integration**: Enterprise-level MCP (Model Context Protocol) integration, including Nacos MCP Registry for distributed registration and discovery
- **Tool Calling**: Support for rich tool calling and external system integration

#### Observability and Monitoring
- **ARMS Integration**: Deep integration with Alibaba Cloud Application Real-Time Monitoring Service
- **Langfuse Support**: Support for mainstream AI observability products
- **Tracing**: Complete AI application call chain tracing

### 3. General-purpose Agent Products and Platforms

The community explores general-purpose agent products with autonomous planning capabilities based on Spring AI Alibaba framework:

- **JManus**: Complete general-purpose agent platform implementation
- **DeepResearch**: Deep research agent supporting complex research tasks
- **NL2SQL**: Natural language to SQL automatic generation service
- **Zero-code Building**: Provide developers with flexible choices from low-code, high-code to zero-code agent building

## Relationship with Spring AI

Spring AI is an open-source framework maintained by the official Spring community, focusing on underlying atomic capability abstractions for AI development and seamless integration with the Spring Boot ecosystem.

Spring AI Alibaba is built on Spring AI and, while inheriting all its core capabilities, provides:

- **Higher-level Abstractions**: Graph framework for multi-agent orchestration
- **Enterprise Solutions**: Complete production environment deployment and operations solutions
- **Alibaba Cloud Ecosystem Integration**: Deep integration with Bailian, ARMS, Nacos, etc.
- **Best Practices**: Practice summaries based on enterprise agent building processes

## Technical Architecture

### Core Components

1. **ChatClient**: Fluent API for communicating with AI models, supporting synchronous and reactive programming
2. **Graph Framework**: State graph-based workflow and multi-agent orchestration engine
3. **StateGraph**: State graph defining nodes and edges
4. **Node System**: Nodes encapsulating specific operations or model calls
5. **OverAllState**: Global state management throughout the process

### Design Philosophy

- **Declarative Programming**: Define agent behavior through configuration rather than coding
- **Modular Design**: Components can be used independently and combined
- **Enterprise Considerations**: Production environment requirements considered from the design phase
- **Ecosystem Integration**: Deep integration with Spring and Alibaba Cloud ecosystems

## Use Cases

### Single-Agent Applications
- Chatbots
- Intelligent customer service
- Content generation assistants
- Code assistants

### Workflow Applications
- Document processing workflows
- Data analysis pipelines
- Content moderation processes
- Business process automation

### Multi-Agent Applications
- Collaborative problem solving
- Complex task decomposition
- Expert system integration
- Intelligent decision support

## Quick Start

Add Spring AI Alibaba dependency to your project:

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

Configure your API key:

```properties
spring.ai.dashscope.api-key=your-api-key
```

Now you can start building your first agent application!

## Community and Support

- **Official Website**: [https://java2ai.com](https://java2ai.com)
- **GitHub Repository**: [https://github.com/alibaba/spring-ai-alibaba](https://github.com/alibaba/spring-ai-alibaba)
- **Examples Repository**: [https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)
- **Playground Experience**: Complete frontend UI + backend implementation examples

Spring AI Alibaba is committed to providing Java developers with the best AI application development experience, making agent development simple yet powerful.
