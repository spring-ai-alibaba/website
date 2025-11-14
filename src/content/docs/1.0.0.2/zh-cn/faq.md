---
title: 常见问题解答
keywords: [Spring AI Alibaba,FAQ]
description: "Spring AI Alibaba 使用过程中的常见问题汇总与解决方案指引。"
---

## Maven 构建过程中，`spring-ai` 依赖包下载失败
在 1.0.0 版本及之前，由于 Spring AI 官方包尚未发布到中央仓库，而是发布到了 Spring 自己维护的仓库，因此需要做如下配置：

```xml
```

如果您增加以上配置后仍旧报错，请检查 ~/.m2/settings.xml 中是否配置了 mirror 代理，有 mirror 代理的话加上类似如下配置：

```xml
<!-- ~/.m2/settings.xml -->

```

## 怎么确定 Spring AI Alibaba 与 Spring AI、Spring Boot 版本的兼容关系
Spring AI Alibaba 使用四位版本号的版本管理方式，前三位版本号与 Spring AI 主版本对应，Spring AI Alibaba 社区在前三位主版本基础上持续迭代第四位版本号。

以下为部分版本对应关系，新版发布版本依此类推:

| Spring AI Alibaba | Spring AI | Spring Boot |
| --- | --- | --- |
| 1.0.0.2 | 1.0.0 | 3.4.5 |
| 1.0.0-M6.1 | 1.0.0-M6 | 3.4.2 |

## Spring AI 与 Spring AI Alibaba 有什么差异？
Spring AI 定位 AI 应用开发底层框架，提供了 AI 开发需要的底层原子抽象，包括模型适配、工具定义、向量数据库存取等；Spring AI Alibaba 定位 AI 智能体开发框架，提供了基于图算法的智能体编程 Graph 框架，让开发者更容易开发工作流、multi-agent 应用。为方便理解，举个不完全正确的类比例子，如果说 Spring AI 是 LangChain 生态中的 Langchain 框架的话，则 Spring AI Alibaba 则是 Langchain 生态中的 Langraph 框架。

除了框架本身外，Spring AI Alibaba 是阿里云基于 Spring AI 框架的企业级智能体开发最佳实践与整体解决方案输出，与阿里开源生态、阿里云平台服务等深度集成，包含：
* 与百炼 Dashscope 模型服务集成，支持 Qwen、Deepseek 等主流模型系列
* 与百炼智能体应用平台 AgentScope 集成，提供低代码、高代码双向转换，提升研发效率
* 与百炼析言 ChatBI 集成，提供自然语言到 SQL 的自动生成开源框架与服务
* 与阿里云云产品集成，包括向量检索库AnalyticDB、向量检索库OpenSearch、信息检索服务 IQS 等
* 与开源 Nacos、Higress 生态集成，提供 MCP 注册中心、MCP 智能路由、Prompt管理、模型代理等能力
* 提供前沿方向的智能体产品实现与整体解决方案，包括 JManus、DeepResearch、NL2SQL 等。
* 提供 AI 应用开发的完整配套生态，包括本地开发工具、项目构建平台等。


## 有没有主流 Java AI 框架的选型对比

以下是当前主流 Java AI 框架对比情况。

| **对比维度** | **Spring AI Alibaba** | **Spring AI** | **LangChain4J** |
| --- | --- | --- | --- |
| **Spring Boot 集成** | 原生支持 | 原生支持 | 社区适配 |
| **文本模型** | 主流模型，可扩展 | 主流模型，可扩展 | 主流模型，可扩展 |
| **音视频、多模态、向量模型** | 支持 | 支持 | 支持 |
| **RAG** | 模块化 RAG | 模块化 RAG | 模块化 RAG |
| **向量数据库** | 主流向量数据库      阿里云ADB、OpenSearch等 | 主流向量数据库 | 主流向量数据库 |
| **MCP 支持** | 支持      Nacos MCP Registry 支持 | 支持 | 支持 |
| **函数调用** | 支持（20+官方工具集成） | 支持 | 支持 |
| **提示词模版** | 硬编码，无声明式注解 | 硬编码，无声明式注解 | 声明式注解 |
| **提示词管理** | Nacos 配置中心 | 无 | 无 |
| **Chat Memory** | 优化版JDBC、Redis、ElasticSearch | JDBC、Neo4j、Cassandra | 多种实现适配 |
| **可观测性** | 支持，可接入阿里云ARMS | 支持 | 部分支持 |
| **工作流 Workflow** | 支持，兼容 Dify、百炼 DSL | 无 | 无 |
| **多智能体 Multi-agent** | 支持，官方通用智能体实现 | 无 | 无 |
| **模型评测** | 支持 | 支持 | 支持 |
| **社区活跃度与文档健全性** | 官方社区，活跃度高 | 官方社区，活跃度高 | 个人发起社区 |
| **开发提效组件** | 丰富，包括调试、代码生成工具等 | 无 | 无 |
| **Example 仓库** | 丰富，活跃度高 | 较少 | 丰富，活跃度高 |
