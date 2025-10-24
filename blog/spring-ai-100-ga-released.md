---
title: Spring AI 1.0 GA 正式发布！Spring AI Alibaba 正式版也马上来了！
tags: [Spring AI, Spring AI Alibaba, 正式版, 1.0 GA]
description: Spring AI 1.0 GA 版本正式发布，在 Spring AI 迭代期间，Spring AI Alibaba 就在积极的参与讨论、贡献与适配，目前 Spring AI Alibaba 1.0 GA 版本相关开发工作也已经基本就绪，支持从聊天机器人、工作流到多智能体的 AI 应用开发，预计将于本周内正式发布。。
authors: [chickenlj]
date: "2025-05-21"
slug: spring-ai-100-ga-released
category: article
---

北京时间 2025 年 5 月 20 日，Spring AI 官方团队宣布 1.0 GA 版本正式发布。在过去的近一年时间，Spring AI Alibaba 一直与 Spring AI 社区有深度沟通与合作，期间发布了多个 Milestone 版本，并在此基础上构建了以 agent、multi-agent、企业级生态（如阿里云百炼集成、可观测集成、分布式MCP、Nacos、Higress）、通用智能体（如JManus、DeepResearch）等为特色的框架与解决方案。

<!-- truncate -->

在 Spring AI 1.0 GA 版本开发期间，Spring AI Alibaba 就在积极的参与讨论、贡献与适配，目前 Spring AI Alibaba 1.0 GA 版本相关开发工作也已经基本就绪，支持从聊天机器人、工作流到多智能体的 AI 应用开发，预计将于本周内正式发布。

在 Spring AI Alibaba 1.0 GA 版本发布之前，接下来，我们先一起来看一下 Spring AI 1.0 GA 版本都包含哪些新功能。

## 两件有意思的事情
第一件事，是 Spring AI 官方发布了全新 LOGO：

![](https://raw.githubusercontent.com/spring-io/spring-io-static/refs/heads/main/blog/tzolov/20250520/spring-ai-logo.png)

第二件事，Spring AI 官方目前并没有将 1.0.0 的二进制包推送到 Maven 中央仓库，而是选择继续推送到 Spring 自己维护的 Maven 库。因此，1.0.0 版本的开发者目前还是需要在项目中增加以下仓库配置，以便在 Maven Central 中找到依赖包。

```xml
 <dependencyManagement>
	<dependencies>
		<dependency>
			<groupId>org.springframework.ai</groupId>
			<artifactId>spring-ai-bom</artifactId>
			<version>1.0.0</version>
			<type>pom</type>
			<scope>import</scope>
		</dependency>
	</dependencies>
</dependencyManagement>
```

## 开启 Spring AI 1.0 GA 之旅

接下来，让我们来了解一下 Spring AI 1.0 GA 功能集。

Spring AI 的核心是`ChatClient`，这是一种**可移植且易于使用的 API**，是与 AI 模型交互的主要接口。

Spring AI 的 ChatClient 支持调用**20 个**AI 模型，包括 Anthropic、OpenAI、Ollama 等。它支持多模态输入和输出（前提是底层模型能支持）以及结构化响应 —— 通常以 JSON 格式呈现，以便于在应用程序中处理输出。

有关 AI 模型功能集的详细比较，请访问官方参考文档中的[ChatModel Comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html)

### 提示（Prompt）

创建正确的 Prompt（即传递给模型的内容）是一项重要技能。有几种模式可以充分利用 AI 模型，从而获得最佳结果。
您可以参考 [Prompt示例](https://docs.spring.io/spring-ai/reference/api/prompt.html) 学习如何在 Spring AI 中编写正确的 Prompt。

### 模型增强（The Augmented LLM）

然而，现实世界中 AI 应用程序对大模型的需求，超越了与无状态人工智能模型 API 的简单请求/响应交互。

要构建高效的 AI 应用程序，一系列支持功能至关重要。[模型增强](https://www.anthropic.com/engineering/building-effective-agents) 的概念（如下图所示）正是为此而生，它为基础模型添加了数据检索（RAG）、对话记忆（Memory）和工具调用（Tool）等功能。这些功能允许您将自己的数据和外部 API 直接引入模型的推理过程。

![the augmented LLM](/img/blog/springai-ga/augmented-llm-concept.png)

在 Spring AI 中实现此模式的关键是 `Advisor`。

### 顾问（Advisors）

Spring AI ChatClient 的一个关键特性是 Advisor API。这是一个拦截器链设计模式，允许你通过注入检索数据（Retrieval Context）和对话历史（Chat Memory）来修改传入的 Prompt。


现在让我们深入了解 AI 应用开发中模型增强模式的每个组成部分。

### 检索（Retrieval）

在 AI 应用程序中检索数据的核心是数据库，而矢量数据库是最常见的数据库。Spring AI 提供了一个可移植的矢量存储抽象，支持从 Azure Cosmos DB 到 Weaviate 的**20 种**不同的矢量数据库。

使用这些数据库的一个常见挑战是，每个数据库都有自己独特的元数据过滤查询语言。Spring AI 使用一种可移植的过滤器表达式语言解决了这个问题，该语言使用熟悉的类似 SQL 的语法。如果您达到了这种抽象的极限，可以回退到原生查询。

Spring AI 包含一个轻量级、可配置的**ETL（提取、转换、加载）框架**，可简化将数据导入向量存储的过程。它通过可插拔组件支持各种输入源`DocumentReader`，包括**本地文件系统**、**网页**、**GitHub 存储库**、**AWS S3**、**Azure Blob 存储**、**Google Cloud Storage**、**Kafka**、**MongoDB**和**兼容 JDBC 的数据库**。这让您可以轻松地将几乎任何地方的内容引入 RAG 管道，并内置了对分块、元数据丰富和嵌入生成的支持。

Spring AI 还支持检索增强生成 (RAG) 模式，该模式使 AI 模型能够根据您传入的数据生成响应。您可以先使用简单的方法`QuestionAnswerAdvisor` 将相关上下文注入提示中，也可以使用 扩展至更复杂、更模块化的 RAG 管道，以满足您的应用需求`RetrievalAugmentationAdvisor`。


### 记忆（ChatMemory）

对话历史记录是创建 AI 聊天应用程序的重要组成部分。Spring AI 通过`ChatMemory`接口支持这一点，该接口管理消息的存储和检索。该`MessageWindowChatMemory`实现在滑动窗口中维护最后 N 条消息，并随着对话的进展进行自我更新。它委托给一个`ChatMemoryRepository`，我们目前为 JDBC、Cassandra 和 Neo4j 提供存储库实现，并且正在开发更多版本。

另一种方法是使用`VectorStoreChatMemoryAdvisor`。它不仅仅记住最新消息，还使用向量搜索从过去的对话中检索语义最相似的消息。


### 工具（Tool）

**Spring AI 可以轻松通过工具**扩展模型的功能——自定义函数，让 AI 检索外部信息或执行实际操作。工具调用\*\*（也称为**函数调用**`gpt-4`）由 OpenAI 于 2023 年 6 月首次广泛引入，并在和模型中发布了函数调用功能`gpt-3.5-turbo`。

工具可以获取当前天气、查询数据库或返回最新新闻，帮助模型解答训练数据以外的问题。它们还可以触发工作流、发送电子邮件或更新系统，从而将模型转变为应用程序中的活跃参与者。定义工具很简单：使用`@Tool`注解来声明方法，使用 动态注册 Bean `@Bean`，或以编程方式创建它们以实现完全控制。

### 评估（Evaluation）

创建 AI 应用程序充满乐趣，但如何知道它是否有效呢？遗憾的是，它并不像编写传统的单元测试或集成测试并查看测试结果那样简单。我们需要根据一系列标准评估 AI 模型的响应。例如，答案是否与提出的问题相关？它是否产生了幻觉？答案是否基于提供的事实？

为了解决这个问题，我们应该从所谓的 “vibe checks” 开始。顾名思义，这是手动检查答案，并运用自己的判断来确定答案是否正确。当然，这很耗时，因此有一套不断发展的技术来帮助实现这一过程的自动化。

Spring AI 可以轻松检查 AI 生成内容的准确性和相关性。它配备了灵活的`Evaluator`界面和两个方便的内置评估器：

*   **RelevancyEvaluator** – 帮助您确定 AI 的响应是否与用户的问题和检索到的上下文真正匹配。它非常适合测试 RAG 流程，并使用可自定义的提示来询问另一个模型：“根据检索到的内容，这个响应是否合理？”

*   **FactCheckingEvaluator** – 根据提供的上下文验证 AI 的响应是否符合事实。它的工作原理是要求模型判断某个语句是否在逻辑上得到文档的支持。您可以使用 Bespoke 的 Minicheck（通过 Ollama）等小型模型来运行此模型，这比每次检查都使用 GPT-4 之类的工具要便宜得多。


然而，这并非灵丹妙药。Hugging Face “LLM as judges” 排行榜的首席维护者[Clémentine Fourrier](https://clefourrier.github.io/) 警告说，**“LLM as judges” 并非灵丹妙药**。在接受[Latent Space Podcast](https://deepcast.fm/episode/benchmarks-201-why-leaderboards-arenas-llm-as-judge)采访时，她概述了几个关键问题：

*   **模式崩溃和位置偏差**：法学硕士评委通常青睐来自同一系列模型的答案或显示的第一个答案。
*   **冗长偏见**：​​无论准确性如何，模型对较长的答案的评价更为有利。
*   **评分较差**：排名比评分更可靠；即便如此，可重复性也很弱。
*   **过度自信偏见**：人们和模型通常更喜欢自信的答案，即使是错误的。


### 可观测性（Observability）

在生产环境中运行 AI 时，为了确保有良好的效果，你还需要**可观测性**。Spring AI 可以轻松观测模型的运行情况、性能以及成本。

Spring AI 与**Micrometer**集成，提供有关关键指标的详细遥测，例如：

*   **模型延迟**——你的模型需要多长时间才能做出反应（不仅仅是情感上的）。

*   **令牌使用情况**——每个请求的输入/输出令牌，因此您可以跟踪和优化成本。

*   **工具调用和检索**——了解您的模型何时充当有用的助手，而不是仅仅在您的矢量存储上免费加载。


**您还可以通过Micrometer Tracing**获得全面的 tracing 支持，其中包含模型交互中每个主要步骤的 span。您还可以获取有助于故障排除的日志消息，以便查看用户提示或向量存储响应的内容。

### 模型上下文协议（MCP）

[模型上下文协议](https://modelcontextprotocol.io/introduction)(MCP) 于 2024 年 11 月问世。它迅速走红，因为它为 AI 模型与外部工具、提示和资源交互提供了一种标准化的方式。MCP 是一种面向客户端-服务器的协议，一旦构建了 MCP 服务器，就可以轻松地将其应用于您的应用程序，无论 MCP 服务器是用什么编程语言编写的，MCP 客户端是用什么编程语言编写的。

这在工具领域确实取得了长足的进步，尽管 MCP 并不局限于工具。现在，您可以使用“开箱即用”的 MCP 服务器来实现特定功能，例如与 GitHub 交互，而无需自己编写代码。从 AI 工具的角度来看，它就像一个工具类库，您可以轻松将其添加到您的应用程序中。

Spring AI 团队在 MCP 规范发布后不久就开始支持该规范，并将这些代码捐赠给 Anthropic作为 [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk)的基础。Spring AI 围绕此基础提供了丰富的功能。

#### MCP 客户端

Spring AI 通过其客户端启动模块，简化了模型上下文协议 (MCP) 工具的使用。添加 \`spring-ai-starter-mcp-client\` 依赖项，即可快速连接远程 MCP 服务器。Spring Boot 的自动配置功能可处理繁重的工作，因此您的客户端无需过多的样板代码即可调用 MCP 服务器公开的工具，让您专注于构建高效的 AI 工作流。Spring 让您可以轻松连接到 MCP 服务器提供的 stdio 和基于 HTTP 的 SSE 端点。

#### MCP 服务器

Spring AI 凭借其专用的启动模块和基于注解的直观方法，简化了 MCP 服务器的创建。只需添加`spring-ai-starter-mcp-server`依赖项，即可快速将 Spring 组件转换为符合 MCP 标准的服务器。

该框架使用 @Tool 注解提供简洁的语法，将方法公开为工具。参数会自动转换为适当的 MCP 格式，并且框架会处理所有底层协议细节——传输、序列化和错误处理。只需极少的配置，您的 Spring 应用程序就可以将其功能公开为 stdio 和基于 HTTP 的 SSE 端点。

另请查看 Spring 生态系统中已开始使用专用服务器来拥抱 MCP 的项目：

*   [Spring Batch MCP Server](https://github.com/fmbenhassine/spring-batch-lab/tree/main/sandbox/spring-batch-mcp-server)公开批处理操作，允许 AI 助手查询作业状态、查看步骤详细信息并分析指标以优化工作流程。
*   [Spring Cloud Config MCP Server](https://github.com/ryanjbaxter/spring-cloud-config/tree/mcp-server)通过工具实现可通过 AI 访问的配置管理，以跨环境检索、更新和刷新配置并处理敏感值加密。

这些服务器将 Spring 的企业功能带入不断发展的 MCP 生态系统

### MCP 和安全

在企业环境中，您希望对哪些数据作为上下文呈现给 LLM 以及哪些 API（尤其是那些修改数据/状态的 API）拥有一定程度的控制权，这不足为奇。MCP 规范通过 OAuth 解决了这些问题。Spring Security 和 Spring Authorization Server 可以满足您的需求。Spring Security 专家 Daniel 在他的博客[《使用 Spring AI 和 OAuth2 进行 MCP 授权实践》](https://spring.io/blog/2025/05/19/spring-ai-mcp-client-oauth2)中详细介绍了如何保护 MCP 应用程序。

## 智能体（Agent）


2025年是智能体之年，价值百万美元的问题是“如何定义智能体”，好吧，我来回答一下 :)。智能体的核心是“利用人工智能模型与环境交互，以解决用户定义的任务”。高效的智能体会结合规划、记忆和行动来完成用户分配的任务。

智能体有两大类：

**工作流**代表了一种更可控的方法，其中 LLM 和工具通过预定义的路径进行编排。这些工作流具有规范性，引导 AI 按照既定的操作顺序实现可预测的结果。

**相比之下，具有自主决策的智能体**允许 LLM 自主规划和执行完成任务的处理步骤。这些代理无需明确指示，即可自行确定路径，决定使用哪些工具以及使用顺序。

虽然完全自主的智能体因其灵活性而颇具吸引力，但工作流对于定义明确的任务而言，提供了更好的可预测性和一致性。这些方法之间的选择取决于您的具体需求和风险承受能力。

### 工作流（workflow）

Spring AI 支持几种构建代理行为的工作流模式：在下图中，每个 llm 框都是前面显示的“增强型 llm”图。

1.  [**评估器优化器**](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/evaluator-optimizer)——该模型分析自身的反应，并通过结构化的自我评估过程对其进行改进。

![增强法学硕士](https://raw.githubusercontent.com/spring-io/spring-io-static/refs/heads/main/blog/tzolov/20250520/anthropic-augmented-llm-agents.png)

2.  [**路由**](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/routing-workflow)——此模式能够根据用户请求和上下文的分类将输入智能路由到专门的处理程序。

3.  [**Orchestrator Workers——**](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/orchestrator-workers)这种模式是一种灵活的方法，用于处理需要动态任务分解和专门处理的复杂任务

4.  [**链接**](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/chain-workflow)——该模式将复杂的任务分解为一系列步骤，其中每个 LLM 调用都会处理前一个调用的输出。

5.  [**并行化**](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/parallelization-worflow)——该模式对于需要并行执行 LLM 调用并自动进行输出聚合的情况很有用。


这些模式可以使用 Spring AI 的聊天模型和工具执行功能来实现，其中框架可以处理大部分底层复杂性。

[您可以在Spring AI 示例存储库](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns)和我们的参考文档的[构建有效代理](https://docs.spring.io/spring-ai/reference/api/effective-agents.html)部分中找到更多信息。

### 自主决策的智能体（Agent）

Spring AI 还支持通过模型上下文协议 (MCP) 开发自主代理。正在孵化的[Spring MCP Agent](https://github.com/tzolov/spring-mcp-agent) 项目演示了如何创建以下代理：

1.  接受用户指令并自主确定最佳方法
2.  通过 MCP 动态发现并利用可用工具
3.  维护执行记忆以跟踪进度和决策
4.  根据结果​​递归地完善策略

## 未来展望

Spring AI 是一款非常优秀的 AI 应用开发框架，它专为 Java 开发者而设计，帮助 Java 开发者快速构建具备智能化的应用，很高兴看到 Spring AI 在今天达成正式 GA 版本。

Spring AI Alibaba 1.0 GA 版本相关开发工作也已经基本就绪，包含 Qwen、DashScope 等基础能力适配，支持从聊天机器人、工作流到多智能体的 AI 应用开发，提供企业级 MCP 分布式部署方案，发布了 JManus、nl2sql、DeepResearch 等通用智能体产品，预计将于本周接下来的几天正式发布，敬请期待。
