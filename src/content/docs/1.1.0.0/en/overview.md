---
title: Spring AI Alibaba Overview
keywords: [What's Spring AI Alibaba, Spring AI Alibab Introduction, Spring AI Introduction]
description: "Spring AI Alibaba is an AI framework based on Spring AI, deeply integrated with the Bailian platform, supporting ChatBot, workflow, and multi-agent application development modes."
---
## What is Spring AI Alibaba
<font style="color:rgb(53, 56, 65);">Spring AI Alibaba is an AI framework based on Spring AI, deeply integrated with the Bailian platform, supporting ChatBot, workflow, and multi-agent application development modes.</font>

![spring ai alibaba architecture.png](/img/user/ai/overview/1.0.0/spring-ai-alibaba-architecture.png)

<font style="color:rgb(53, 56, 65);">In version 1.0,</font><font style="color:#080808;background-color:#ffffff;">Spring AI Alibaba provides the following core capabilities, allowing developers to quickly build their own Agent, Workflow, or Multi-agent applications.</font>

1. **<font style="color:rgb(23, 26, 29);">Graph multi-agent framework.</font>**<font style="color:rgb(23, 26, 29);">Based on Spring AI Alibaba Graph, developers can quickly build workflow and multi-agent applications without worrying about process orchestration, context memory management, and other underlying implementations. Through the combination of Graph with low-code and self-planning agents, it provides developers with more flexible options from low-code, high-code to zero-code for building agents.</font>
2. **<font style="color:rgb(23, 26, 29);">Through AI ecosystem integration, solving pain points in enterprise agent deployment.</font>**<font style="color:rgb(23, 26, 29);">Spring AI Alibaba supports deep integration with the Bailian platform, providing model access and RAG knowledge base solutions; supports seamless integration with observability products like ARMS and Langfuse; supports enterprise-level MCP integration, including Nacos MCP Registry for distributed registration and discovery, automatic Router routing, etc.</font>
3. **<font style="color:rgb(53, 56, 65);">Exploring general-purpose agent products and platforms with autonomous planning capabilities.</font>**<font style="color:rgb(53, 56, 65);">The community has released the JManus agent based on the Spring AI Alibaba framework. Beyond matching OpenManus's general agent capabilities, our goal is to explore applications of autonomous planning in agent development based on JManus,</font><font style="color:rgb(23, 26, 29);">providing developers with more flexible options from low-code, high-code to zero-code for building agents</font><font style="color:rgb(23, 26, 29);">.</font>

### Relationship and Differences with Spring AI
Spring AI is an open-source framework maintained by the official Spring community, initially releasing its first Milestone version in May 2024, with the first 1.0 GA version officially released in May 2025. Spring AI focuses on the underlying atomic capability abstractions for AI development and seamless integration with the Spring Boot ecosystem, such as model communication (ChatModel), prompting (Prompt), retrieval-augmented generation (RAG), memory (ChatMemory), tools (Tool), model context protocol (MCP), etc., helping Java developers quickly build AI applications.

<font style="color:rgb(53, 56, 65);">Since its official open-source release in September 2024, Spring AI Alibaba has maintained deep communication and cooperation with the Spring AI community, releasing multiple Milestone versions and establishing deep cooperation relationships with many enterprise customers. Through these interactions, we have observed the advantages and limitations of low-code development models, as well as the increasing customer demands for chatbots, single agents, and multi-agent architectural solutions as business complexity increases. We have also witnessed the challenges in transitioning agent development from simple demos to production deployments.</font>

## Quick Start
### Developing Your First Spring AI Alibaba Application
Add the following dependencies to your Spring Boot project to start your AI agent development journey.

```xml
	<dependencyManagement>
		<dependencies>
			<dependency>
				<groupId>com.alibaba.cloud.ai</groupId>
				<artifactId>spring-ai-alibaba-bom</artifactId>
				<version>1.0.0.2</version>
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

You can refer to our [Quick Start](https://java2ai.com/) published on the official website to learn how to develop Chatbot, agent, or workflow applications. In general, depending on different scenarios, you can choose to use two core components: `ChatClient` or `Spring AI Alibaba Graph` to develop AI applications.

### Experience the Official Playground Example
The Spring AI Alibaba official community has developed a **comprehensive agent Playground example with "front-end UI + backend implementation"**. The example is developed using Spring AI Alibaba and allows you to experience all core framework capabilities including chatbots, multi-turn conversations, image generation, multimodal, tool calls, MCP integration, RAG knowledge base, and more.

The overall interface effect after running is shown below:

![spring ai alibaba playground.png](/img/user/ai/overview/1.0.0/playground.png)

You can [deploy the Playground example locally](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground) and access it through a browser to experience it, or copy the source code and adapt it according to your business requirements to quickly build your own AI application.

For more examples and to learn more about the Spring AI Alibaba framework usage through source code examples, please refer to our official example repository:

[https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)

## Starting the Spring AI Alibaba 1.0 Journey
### Supporting All Core Features of Spring AI
Spring AI Alibaba is built on Spring AI, so Spring AI Alibaba inherits all atomic capability abstractions from Spring AI, and has expanded and enriched core components adapters such as models, vector storage, memory, and RAG, enabling it to connect to Alibaba Cloud's AI ecosystem.

Regarding the Spring AI 1.0 GA version, the Spring AI official blog provides detailed explanations, including some core design concepts of the framework and specific usage methods. The following is our interpretation based on the official blog, which you are welcome to consult as needed:

+ Spring AI Core Features Explained
    - [Prompt](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E6%8F%90%E7%A4%BAprompt)
    - [The Augmented LLM](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E6%A8%A1%E5%9E%8B%E5%A2%9E%E5%BC%BAthe-augmented-llm)
    - [Advisors](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E9%A1%BE%E9%97%AEadvisors)
    - [Retrieval](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E6%A3%80%E7%B4%A2retrieval)
    - [ChatMemory](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E8%AE%B0%E5%BF%86chatmemory)
    - [Tool](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E5%B7%A5%E5%85%B7tool)
    - [Evaluation](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E8%AF%84%E4%BC%B0evaluation)
    - [Observability](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E5%8F%AF%E8%A7%82%E6%B5%8B%E6%80%A7observability)
    - [Model Context Protocol (MCP)](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#%E6%A8%A1%E5%9E%8B%E4%B8%8A%E4%B8%8B%E6%96%87%E5%8D%8F%E8%AE%AEmcp)
        * [MCP Client](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#mcp-%E5%AE%A2%E6%88%B7%E7%AB%AF)
        * [MCP Server](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#mcp-%E6%9C%8D%E5%8A%A1%E5%99%A8)
    - [MCP and Security](https://java2ai.com/blog/spring-ai-100-ga-released/?spm=5176.29160081.0.0.2856aa5c2PwbQU#mcp-%E5%92%8C%E5%AE%89%E5%85%A8)

For information about Spring AI Alibaba and Alibaba Cloud AI ecosystem integration, please refer to the official documentation.

### Spring AI Alibaba Graph Multi-Agent Framework
Spring AI Alibaba Graph is one of the community's core implementations and represents a key design philosophy difference from Spring AI, which only focuses on atomic abstractions. Spring AI Alibaba aims to help developers build intelligent agent applications more easily. Based on Graph, developers can build workflows and multi-agent applications. Spring AI Alibaba Graph's design philosophy draws inspiration from Langgraph, so to some extent it can be understood as a Java version of Langgraph implementation. The community has added a large number of pre-configured Nodes and simplified the State definition process, making it easier for developers to write workflows and multi-agent applications that are equivalent to low-code platforms.

Spring AI Alibaba Graph core capabilities:

+ Support for Multi-agent, with built-in ReAct Agent, Supervisor, and other conventional agent models
+ Support for workflows, with built-in workflow nodes aligned with mainstream low-code platforms
+ Native support for Streaming
+ Human-in-the-loop through human confirmation nodes, supporting state modification and execution recovery
+ Support for memory and persistent storage
+ Support for process snapshots
+ Support for nested branches and parallel branches
+ PlantUML and Mermaid visualization export

For specific usage of Graph, please stay tuned for official documentation updates. In the following sections, we will introduce the officially released [general-purpose agent platform implemented based on Spring AI Alibaba](/#). You can consider these official agent implementations as best practices for Graph.

### Enterprise-level AI Application Ecosystem Integration
In the process of deploying agents in production, users need to solve various issues such as agent effectiveness evaluation, MCP tool integration, Prompt management, Token context, visual Tracing, etc. Spring AI Alibaba provides comprehensive enterprise-level production solutions for agents through deep integration with Nacos3, Higress AI Gateway, Alibaba Cloud ARMS, Alibaba Cloud vector retrieval database, Bailian agent platform, etc., accelerating the transition of agents from demos to production deployments.

![spring ai alibaba ecosystem.png](/img/user/ai/overview/1.0.0/spring-ai-alibaba-ecosystem.png)

1. **Enterprise-level MCP Deployment and Proxy Solution**

Spring AI Alibaba MCP, through integration with Nacos MCP Registry, supports distributed deployment of MCP Servers and load-balanced calls. For existing Spring Cloud, Dubbo, and other applications, it supports zero-code modification to implement API-to-MCP service publishing. Developers can develop their own MCP Server service proxies through Spring AI Alibaba MCP to support automatic loading of Nacos central MCP metadata.

2. **AI Gateway Integration to Enhance Model Call Stability and Flexibility**

If you use Higress as a backend model proxy, you can access the Higress AI model proxy service through the OpenAI standard interface by simply using `spring-ai-starter-model-openai`.

If you have existing API services and need to make them available without code modification, you can use Higress as a proxy solution from API to MCP service.

3. **Reduce Enterprise Data Integration Costs and Improve AI Data Application Effects**

**a. Bailian RAG Knowledge Base**

<font style="color:rgb(53, 56, 65);">Bailian is a visual AI agent application development platform that provides RAG knowledge base management capabilities. Simply put, you can upload private data to the Bailian platform and leverage its data parsing, slicing, vectorization, and other capabilities to achieve data vector preprocessing. The processed data can be used for subsequent retrieval by Spring AI Alibaba agent applications, leveraging the powerful data processing capabilities of the Bailian platform.</font>

**b. Bailian Xiyan ChatBI, Automatic Generation from Natural Language to SQL**

The Spring AI Alibaba Nl2sql module, based on large model ChatBI technology, helps users easily implement natural language interactive data analysis, understand user database schemas, and automatically generate SQL query statements. Whether it's simple condition filtering or complex aggregation statistics and multi-table joins, it can accurately generate the corresponding SQL statements.

4. **Observability and Effect Evaluation, Accelerating Agents from Demo to Production**

Spring AI has built-in SDK default tracking points at multiple key nodes to record metrics and tracing information during operation, including model calls, vector retrieval, tool calls, and other key links. Spring AI tracing information is compatible with OpenTelemetry, so it can theoretically integrate with mainstream open-source platforms like Langfuse or Alibaba Cloud ARMS.

## From Chatbots and Workflows to Multi-Agents
### ChatBot
AI application development is not just about stateless large model API calls. Due to the pre-training characteristics of large models, AI applications also need integration capabilities such as domain data retrieval (RAG), conversation memory (Memory), and tool calls (Tool). These external integrations are collectively referred to as the Augmented LLM mode, which allows developers to bring their own data and external APIs directly into the model's inference process.

![spring ai alibaba chatbot](/img/user/ai/overview/1.0.0/chatbot.png)

> This figure is from Anthropic's "Building Effective AI Agents" article

ChatClient is the core component in Spring AI, which developers can use to develop their own chatbots or agent applications. ChatClient supports the augmented model mode, mounting external data and services such as Retrieval, Tools, and Memory for model calls.

```java
Flux<String> response = chatClient.prompt(query)
        .tools(toolCallbacks)
        .advisors(new QuestionAnswerAdvisor())
        .stream()
        .content();
```

<font style="color:rgb(38, 38, 38);">Here we refer to AI applications developed with ChatClient as single-agent applications, which might be our ideal agent development model as it is simple and direct, providing all tools and context information to the model, allowing the model to continuously make decisions and iterate until it completes the task. However, things are far from that simple. The capabilities of models are still far from what we desire. When we provide too much context or too many tools to the model, the overall effectiveness deteriorates, and sometimes the direction of events can seriously deviate from our expectations. Therefore, we consider breaking down complex problems, and currently, there are two commonly used patterns:</font> **<font style="color:rgb(38, 38, 38);">workflows and multi-agents</font>**<font style="color:rgb(38, 38, 38);">.</font>

### Workflow
**<font style="color:rgb(38, 38, 38);">Workflow</font>**<font style="color:rgb(38, 38, 38);"> is an approach that artificially decomposes tasks in a relatively fixed manner, breaking down a large task into a fixed process with multiple branches. The advantage of workflows is their strong determinism; the model serves more as a classification and decision-making component in the process, making it more suitable for application scenarios with strong categorical attributes such as intent recognition. Workflows also have obvious disadvantages: they require developers to have a deep understanding of business processes. The entire process is designed by humans, and the model's role is mainly for content generation, summarization, and classification identification, which doesn't maximize the model's reasoning capabilities. That's why many criticize this approach as not being intelligent enough.</font>

<font style="color:rgb(38, 38, 38);">Using Spring AI Alibaba Graph, you can easily develop workflows by declaring different nodes and connecting them into a flowchart.</font>

![spring ai alibaba workflow](/img/user/ai/overview/1.0.0/workflow.png)

<font style="color:rgb(38, 38, 38);">It's worth noting that Spring AI Alibaba Graph provides a large number of pre-configured nodes that align with mainstream low-code platforms like Dify and Bailian. Typical nodes include LlmNode (large model node), QuestionClassifierNode (question classification node), ToolNode (tool node), etc., freeing users from the burden of repetitive development and definition, allowing them to focus on process connection.</font>

For example, the above is a visually designed "User Review Classification System" workflow, with the corresponding Spring AI Alibaba Graph code as follows:

```java
StateGraph stateGraph = new StateGraph("Consumer Service Workflow Demo", stateFactory)
			.addNode("feedback_classifier", node_async(feedbackClassifier))
			.addNode("specific_question_classifier", node_async(specificQuestionClassifier))
			.addNode("recorder", node_async(new RecordingNode()))

			.addEdge(START, "feedback_classifier")
			.addConditionalEdges("feedback_classifier",edge_async(new CustomerServiceController.FeedbackQuestionDispatcher()),Map.of("positive", "recorder", "negative", "specific_question_classifier"))
			.addConditionalEdges("specific_question_classifier",edge_async(new CustomerServiceController.SpecificQuestionDispatcher()),Map.of("after-sale", "recorder", "transportation", "recorder", "quality", "recorder", "others","recorder"))
			.addEdge("recorder", END);
```

### Multi-Agent
Another solution for complex task decomposition is **multi-agent**. Compared to workflows, while multi-agents also follow specific processes, they have more autonomy and flexibility in the entire decision-making and execution process. Multiple sub-agents complete tasks through communication and collaboration. In the industry, there are various common multi-agent communication models; the following figure shows several typical examples:

![spring ai alibaba multi-agent](/img/user/ai/overview/1.0.0/multi-agent.png)

> Image from Langchain's official blog

Spring AI Alibaba Graph can be used to develop various multi-agent patterns. The official community has currently released several agent products developed based on Spring AI Alibaba Graph, including the general-purpose agent JManus, the DeepResearch agent, AgentScope, and others.

## Building the Next-Generation General-Purpose Agent Platform
Spring AI Alibaba positions itself as an agent framework centered around `ChatClient` and `Graph` abstractions, along with ecosystem integrations surrounding the framework, to help users quickly build enterprise-level AI agents.

With the rapid development of general-purpose agent patterns, the community is also exploring agent products and platforms with autonomous planning capabilities based on Spring AI Alibaba. Currently, two products, JManus and DeepResearch, have been released. Through agent products like JManus, the community is exploring the unlimited potential of agents in solving open-ended problems in daily life and work efficiency. At the same time, the community continues to explore vertical domains such as agent development platforms and deep search, aiming to provide developers with zero-code agent development experiences based on natural language, beyond low-code platforms and high-code frameworks.

### JManus Agent Platform
When we first released JManus, we positioned it as a completely Java-based, fully open-source implementation of OpenManus, a general-purpose AI Agent product based on Spring AI Alibaba, including a well-designed front-end UI interactive interface.

As we explored general-purpose agents more deeply, we adjusted our product positioning for the JManus general-purpose agent. The emergence of Manus has given people unlimited imagination for the autonomous planning and execution capabilities of general-purpose agents, which excel at solving open-ended problems and can be widely applied in daily life and work scenarios. However, in practice, people have realized that completely relying on the automatic planning mode of general-purpose agents makes it difficult to solve some highly deterministic enterprise scenarios, given the current and foreseeable future model capabilities. The typical characteristic of enterprise-level business scenarios is determinism; we need customized tools and sub-agents, as well as stable and deterministic planning and processes. Therefore, we hope that JManus can become an agent development platform, allowing users to build their own vertical domain agent implementations in the most intuitive and low-cost way.

![spring ai alibaba jmanus](/img/user/ai/overview/1.0.0/jmanus.png)

Currently, JManus has the following core capabilities:

+ **<font style="color:#3b3b3b;background-color:#f8f8f8;">Complete implementation of OpenManus multi-agent product</font>**<font style="color:#3b3b3b;background-color:#f8f8f8;">
</font><font style="color:#3b3b3b;background-color:#f8f8f8;">JManus fully delivers the OpenManus product capabilities, allowing users to use the product features through the UI interface. JManus can help users complete problem-solving based on automatic planning mode.</font>
+ **<font style="color:#3b3b3b;background-color:#f8f8f8;">Seamless support for MCP (Model Context Protocol) tool integration</font>**<font style="color:#3b3b3b;background-color:#f8f8f8;">
</font><font style="color:#3b3b3b;background-color:#f8f8f8;">This means that Agents can not only call local or cloud-based large language models but also deeply interact with various external services, APIs, databases, etc., greatly expanding application scenarios and capability boundaries.</font>
+ **<font style="color:#3b3b3b;background-color:#f8f8f8;">Native support for PLAN-ACT mode</font>**<font style="color:#3b3b3b;background-color:#f8f8f8;">
</font><font style="color:#3b3b3b;background-color:#f8f8f8;">Enables Agents to have capabilities for complex reasoning, step-by-step execution, and dynamic adjustment, suitable for multi-turn conversations, complex decision-making, automated processes, and other advanced AI application scenarios.</font>
+ **<font style="color:#3b3b3b;background-color:#f8f8f8;">Support for configuring Agents through the UI interface</font>**<font style="color:#3b3b3b;background-color:#f8f8f8;">
</font><font style="color:#3b3b3b;background-color:#f8f8f8;">Developers and operations personnel don't need to modify underlying code; they can simply perform operations on the intuitive Web management interface to flexibly adjust Agent parameters, models, and tools, and can also adjust task planning, greatly enhancing usability and operational efficiency.</font>
+ **<font style="color:#3b3b3b;background-color:#f8f8f8;">Automatic generation of SAA-based agent projects</font>**

<font style="color:#3b3b3b;background-color:#f8f8f8;">Users interact with JManus through natural language, generate planning, and consolidate it into fixed solutions for specific vertical directions. If you don't want to limit the runtime to the platform, we are exploring deep integration with low-code platforms and framework scaffolding, supporting the conversion of planning into Spring AI Alibaba projects with equivalent capabilities.</font>

<font style="background-color:#f8f8f8;">The JManus agent platform is still under continuous development and construction. Please follow</font>[<font style="background-color:#f8f8f8;"> the official repository source code</font>](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-jmanus/)<font style="background-color:#f8f8f8;"> and subsequent release updates.</font>

### DeepResearch Agent
<font style="color:rgb(31, 35, 40);">DeepResearch is a Deep Research agent developed based on Spring AI Alibaba Graph, including a complete front-end Web UI (under development) and backend implementation. DeepResearch supports a series of carefully designed tools such as Web Search, Crawling, Python script engine, etc., which can leverage large model and tool capabilities to help users complete various in-depth research reports.</font>

<font style="color:rgb(31, 35, 40);">Below is the DeepResearch multi-agent application architecture:</font>

![spring ai alibaba deepresearch](/img/user/ai/overview/1.0.0/deepresearch.png)
