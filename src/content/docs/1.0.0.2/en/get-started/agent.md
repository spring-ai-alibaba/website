---
title: Agents
keywords: [Spring AI Alibaba,agent,multi-agent,multiagent]
description: ""
---



## Playground Agent

The Spring AI Alibaba official community has developed an agent Playground example with complete `frontend UI + backend` functionality, helping developers quickly experience chat, multi-turn conversations, image generation, document summarization, multimodal capabilities, tool calling, MCP integration, RAG knowledge base, and all other core framework capabilities.

### Quick Start

Run the following Docker command to quickly deploy and experience the Playground locally:

```shell
docker run -d -p 8080:8080 \
  -e AI_DASHSCOPE_API_KEY=your_api_key \
  --name spring-ai-alibaba-playground \
  sca-registry.cn-hangzhou.cr.aliyuncs.com/spring-ai-alibaba/playground:1.0.0.2-x
```

Open your browser and visit http://localhost:8080 to view the frontend page:

![Spring Ai Alibaba Playground](/img/user/ai/practices/playground/image-20250607164742879.png)

As an AI agent application, Playground relies on large language models and other online services, requiring access credentials specified through environment variables. To enable all Playground capabilities, you need to specify environment variables for Baidu Translation, Alibaba Cloud Information Retrieval Service, and other tool access credentials. For details, see [Playground Complete Deployment Documentation](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground#%E5%BC%80%E5%90%AF%E6%9B%B4%E5%A4%9A%E7%BB%84%E4%BB%B6).

### Source Code Explanation

Developers can [clone the Playground source code](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground) and adjust it according to their business needs to quickly build their own AI applications, avoiding the burden of developing frontend and backend from scratch.

Please refer to [Best Practices](../practices/usecase/playground/) for more source code details about the Playground project.

## Multi-Agent Systems
We call AI applications developed based on Spring AI's `ChatClient` single-agent applications, and the Playground mentioned above is a typical example.

For more complex AI application scenarios, developers can use [Spring AI Alibaba Graph](../tutorials/graph/whats-spring-ai-alibaba-graph/) to develop multi-agent applications. Spring AI Alibaba Graph can be used to develop both workflow applications and multi-agent applications. Compared to the [workflow](./workflow/) model, although the multi-agent model also follows specific processes, it has more autonomy and flexibility in the entire decision-making and execution process.

> The challenges faced by single agents, the definition of multi-agent systems, and solution approaches are detailed in the [【Overview】-【From Chatbots and Workflows to Multi-Agent Systems】](../overview/) section.

The community has developed multiple agent products and platforms with autonomous planning capabilities based on Spring AI Alibaba Graph. Currently released products include JManus, DeepResearch, and ChatBI (NL2SQL).

Links to these agent products are provided below. Developers can directly deploy them or adapt and modify them based on their needs:
* [JManus](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-jmanus), a general-purpose agent product implemented in Java with an excellent frontend UI interface.
* [DeepResearch](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-deepresearch), a DeepResearch product implemented based on Spring AI Alibaba Graph.
* [ChatBI (NL2SQL)](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-nl2sql), a lightweight, efficient, and extensible NL2SQL agent framework that allows Java programmers to quickly build natural language-based data query systems.
