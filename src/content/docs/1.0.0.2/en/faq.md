---
title: Frequently Asked Questions
keywords: [Spring AI Alibaba, FAQ]
description: "A compilation of common questions and solution guidance encountered when using Spring AI Alibaba."
---

## How to Determine the Compatibility Between Spring AI Alibaba and Spring AI, Spring Boot Versions
Spring AI Alibaba uses a four-digit versioning system. The first three digits correspond to the main version of Spring AI, and the Spring AI Alibaba community continuously iterates on the fourth digit based on the main version.

Below is a partial version correspondence table, with new versions following this pattern:

| Spring AI Alibaba | Spring AI | Spring Boot |
| --- | --- | --- |
| 1.0.0.2 | 1.0.0 | 3.4.5 |
| 1.0.0-M6.1 | 1.0.0-M6 | 3.4.2 |

## What are the Differences Between Spring AI and Spring AI Alibaba?
Spring AI is positioned as the underlying framework for AI application development, providing atomic abstractions needed for AI development, including model adaptation, tool definition, vector database access, etc. Spring AI Alibaba is positioned as an AI agent development framework, offering a Graph framework based on graph algorithms, making it easier for developers to create workflows and multi-agent applications. To illustrate with an imperfect analogy, if Spring AI is the Langchain framework in the LangChain ecosystem, then Spring AI Alibaba is the Langraph framework.

In addition to the framework itself, Spring AI Alibaba is Alibaba Cloud's enterprise-level best practice and comprehensive solution for AI agent development based on the Spring AI framework, deeply integrated with Alibaba's open-source ecosystem and Alibaba Cloud platform services, including:
* Integration with BAI Dashscope model services, supporting mainstream model series such as Qwen and Deepseek
* Integration with BAI AgentScope intelligent agent application platform, providing low-code and high-code bidirectional conversion to enhance development efficiency
* Integration with BAI Xiyu ChatBI, offering an open-source framework and service for natural language to SQL automatic generation
* Integration with Alibaba Cloud products, including vector retrieval databases AnalyticDB, OpenSearch, information retrieval service IQS, etc.
* Integration with open-source Nacos, Higress ecosystems, providing MCP registration center, MCP intelligent routing, prompt management, model proxy, etc.
* Providing cutting-edge intelligent agent product implementations and comprehensive solutions, including JManus, DeepResearch, NL2SQL, etc.
* Providing a complete supporting ecosystem for AI application development, including local development tools, project build platforms, etc.


## Is There a Comparison of Mainstream Java AI Frameworks

Below is a comparison of current mainstream Java AI frameworks.

| **Comparison Dimension** | **Spring AI Alibaba** | **Spring AI** | **LangChain4J** |
| --- | --- | --- | --- |
| **Spring Boot Integration** | Native support | Native support | Community adaptation |
| **Text Models** | Mainstream models, extensible | Mainstream models, extensible | Mainstream models, extensible |
| **Audio/Video, Multimodal, Vector Models** | Supported | Supported | Supported |
| **RAG** | Modular RAG | Modular RAG | Modular RAG |
| **Vector Databases** | Mainstream vector databases      Alibaba Cloud ADB, OpenSearch, etc. | Mainstream vector databases | Mainstream vector databases |
| **MCP Support** | Supported      Nacos MCP Registry support | Supported | Supported |
| **Function Calls** | Supported (20+ official tool integrations) | Supported | Supported |
| **Prompt Templates** | Hard-coded, no declarative annotations | Hard-coded, no declarative annotations | Declarative annotations |
| **Prompt Management** | Nacos configuration center | None | None |
| **Chat Memory** | Optimized JDBC, Redis, Elasticsearch | JDBC, Neo4j, Cassandra | Multiple implementations adapted |
| **Observability** | Supported, can integrate with Alibaba Cloud ARMS | Supported | Partially supported |
| **Workflow** | Supported, compatible with Dify, BAI DSL | None | None |
| **Multi-agent** | Supported, official general agent implementation | None | None |
| **Model Evaluation** | Supported | Supported | Supported |
| **Community Activity and Documentation Completeness** | Official community, high activity | Official community, high activity | Community initiated by individuals |
| **Development Efficiency Components** | Rich, including debugging, code generation tools, etc. | None | None |
| **Example Repositories** | Rich, high activity | Fewer | Rich, high activity |
