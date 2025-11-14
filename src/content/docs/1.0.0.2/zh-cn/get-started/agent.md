---
title: 智能体
keywords: [Spring AI Alibaba,智能体,agent,多智能体,multi-agent,multiagent]
description: ""
---

## Playground 智能体

Spring AI Alibaba 官方社区开发了一个包含完整 `前端 UI +后端` 的智能体 Playground 示例，可帮助开发者快速体验聊天、多轮对话、图片生成、文档总结、多模态、工具调用、MCP 集成、RAG 知识库等所有框架核心能力。

### 快速体验

运行以下 Docker 命令，可以在本地快速部署并体验 Playground：

```shell
docker run -d -p 8080:8080 \
  -e AI_DASHSCOPE_API_KEY=your_api_key \
  --name spring-ai-alibaba-playground \
  sca-registry.cn-hangzhou.cr.aliyuncs.com/spring-ai-alibaba/playground:1.0.0.2-x
```

打开浏览器访问 http://localhost:8080 查看前端页面：

![Spring Ai Alibaba Playground](/img/user/ai/practices/playground/image-20250607164742879.png)

Playground 作为一个 AI 智能体应用，依赖大模型等在线服务，需要通过环境变量指定访问凭证。如果要开启 Playground 全部能力，需要通过环境变量指定百度翻译、阿里云信息检索服务等工具访问凭证，具体请查看 [查看 Playground 完整部署文档](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground)。

### 源码讲解

开发者可以通过 [克隆 Playground 源码](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground) 并按照自己的业务需求调整，快速搭建一套自己的 AI 应用，免去从头开发前后端的负担。

请参考 [最佳实践](../practices/usecase/playground/) 了解关于 Playground 项目的更多源码说明。

## 多智能体
我们把基于 Spring AI `ChatClient` 开发的 AI 应用叫做单智能体应用，上文中的 Playground 就是一个典型案例。

对于一些复杂的 AI 应用场景，开发者可以使用 [Spring AI Alibaba Graph](../tutorials/graph/whats-spring-ai-alibaba-graph/) 开发多智能体应用。Spring AI Alibaba Graph 既可以用于开发工作流应用，也可以用于开发多智能体应用。相比于[工作流](./workflow/)模式，多智能体模式虽也遵循特定的流程，但是在整个决策、执行流程上具备更多的自主性和灵活性。

> 关于单智能体面临的挑战、多智能体定义以及解决方式等，在 [【概览】-【从聊天机器人、工作流到多智能体】](../overview/) 一节中有详细介绍。

社区基于 Spring AI Alibaba Graph 开发了多款具备自主规划能力的智能体产品与平台，目前已经发布的包括 JManus、DeepResearch、ChatBI（NL2SQL） 三款产品。

相关智能体产品链接如下，开发者可直接部署应用或在此基础上进行适配改造：

* [JManus](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-jmanus)，一款基于 Java 实现的，包含良好的前端 UI 交互界面的通用智能体产品；
* [DeepResearch](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-deepresearch)，一款基于 Spring AI Alibaba Graph 实现的 DeepResearch 产品；
* [ChatBI（NL2SQL）](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-nl2sql)，一款轻量、高效、可扩展的 NL2SQL 智能体框架，让 Java 程序员可以快速构建基于自然语言的数据查询系统。
