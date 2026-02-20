# 一文讲透 Spring AI Alibaba 与 AgentScope 的定位与区别

### 一、Spring AI Alibaba 开源的初衷是什么？

我们团队早期开源了 Apache Dubbo 和 Spring Cloud Alibaba，因此较深刻的理解应用开发框架对加速开发应用所起到的不可替代的作用。

2023-2024年期间，我们看到 LangChain 和 Dify 为开发者们提供了极大便利，以较低的门槛开发 AI 应用。彼时，仍缺少一个能提供本地化服务的专门面向 Java 开发者的 AI 应用开发框架，并且，我们确信，Java 开发者是 AI 应用生态不可或缺的群体，能加速 AI 在各行业的落地。

但仅靠我们团队，要从0开发一个面向 Java 开发者的 AI 应用开发框架，难度很大。幸运的是，Spring AI 在2024 年2月发布了第一个公开可用版本（0.8.0），因此我们基于 Spring AI 进一步向上做了抽象和功能增强，在2024 年9月开源了 Spring AI Alibaba，希望借助本地化服务、阿里巴巴的实践经验积累，以较快的演进节奏和国内活跃的贡献者社区，更好的服务 Java 开发者。

![admin](/img/blog/saa-agentscope/img.png)

### 二、Spring AI Alibaba 开源过程中，有哪些收获、有哪些挑战？

Spring AI 的核心目标是连接企业的数据和 API 与 AI 模型，简化 AI 集成。包含模型接入、函数调用、MCP 调用和发现、对话记忆和 RAG、可观测等功能。Spring AI Alibaba 在其基础之上做了非常多的探索，包括：

* Spring AI Extensions：将 Spring AI 的能力和阿里云的模型、工具、RAG、异步消息、网关、可观测等云原生基础设施进行了适配，并提供了最佳实践。

* Spring AI Alibaba Graph：提供 Agentic、Multi-Agent 编排能力，包括 SupervisorAgent、SequentialAgent、LoopAgent 等，内置上下文工程、Human In The Loop 等核心能力。

* Spring AI Alibaba Graph：侧重 Workflow 形态的工作流编排，在很多企业级业务场景实现了规模化落地。

* Spring AI Alibaba Admin：是我们在 Agent 开发提效方面的一类探索，包含了提示词维护、可观测、评估，其中，提示词维护是基于 Nacos，可观测能力建设则是基于 LoongSuite。

在开源的过程中，我们逐步观察到，开放框架呈现出两种不同的发展趋势。一种是以 Spring AI Alibaba 为代表的，以 Graph 为核心设计理念的应用框架，强调工作流编排在 AI 应用开发过程中的重要性。一种是 AgentScope 为代表的，以 Agentic 为核心设计理念的应用框架，最大化利用基础大模型的能力。

我们认为，这两种不同的设计理念都会是企业的主流选择。因此，若干月前，我们开始评估和推进与 AgentScope 的合作，以推出 AgentScope-Java。

![admin](/img/blog/saa-agentscope/img_1.png)

### 三、AgentScope 是什么？

AgentScope 是由阿里巴巴通义实验室在2024年2月开源的多智能体开发框架，旨在为开发者提供一种简单、高效、可扩展的方式来构建基于大语言模型的智能体应用。AgentScope 的架构主要包括三层：核心框架 (Agent 构建与编排)、Runtime (安全运行时)、Studio (可视化监控与评估)。AgentScope 拥有强大的算法和工程团队，面向全球开发者提供开源服务。其中，截止v1.0.7，核心框架仓库已发布21个版本，获得1.5w star。

* GitHub：[https://github.com/agentscope-ai/](https://github.com/agentscope-ai/agentscope)

* 官网：[https://agentscope.io/](https://agentscope.io/)

* Disord：[https://discord.gg/Rnf2JCSKZp](https://discord.gg/Rnf2JCSKZp)

* 钉钉群：105130040570

AgentScope-Java 是我们和 AgentScope 共同推出的面向 Java 开发群体智能体开发框架，同时共享以上社区资源，Java 开发者们若遇到使用问题，可以通过以上方式联系到我们。

![admin](/img/blog/saa-agentscope/img_2.png)

### 四、AgentScope-Java 和 Spring AI Alibaba 有哪些不同？

Spring AI Alibaba 是在 Spring AI 的基础上进行抽象，正如它名字中“Spring”、“Alibaba” 所体现的：项目由 Spring 开源社区、Alibaba 开源社区共同维护，Spring AI Alibaba 侧重智能体开发与 Spring 生态的无缝集成，以及阿里云基础大模型和其他开源能力的集成（例如 Qwen 大模型、Higress AI 网关、Nacos 等）。

AgentScope 是一个以 Agentic 为核心设计理念的应用框架，提供包括 ReactAgent、Memory、Context Engineering 等核心 Agent 能力。其中，AgentScope-Java 遵循同样的 Agentic 设计思想，面向 Java 开发者。

两者都在独立发展，Spring AI Alibaba 的主要目标是向上游的 Spring AI 实现对齐，AgentScope 因为是阿里云自主研发的 Agent 开发框架，在路线规划、迭代速度、本地化服务上都会更加自主可控。

未来，Spring AI Alibaba 生态将会在底层全面支持 AgentScope，提供 AgentScope Starter、AgentScope Runtime Starter，实现 AgentScope 与 Spring 生态的集成。如果您打算构建面向以 Agentic 为核心设计理念的AI应用，推荐使用 AgentScope-Java 版，如果您打算基于 Workflow 构建 AI 应用，推荐使用 Spring AI Alibaba。

![admin](/img/blog/saa-agentscope/img_3.png)

### 五、Spring AI Alibaba 未来是否继续投入？

是的，会持续投入的。主要体现在以下两个方向：

* 跟进 Spring AI 的演进，持续发版解决企业应用过程中遇到的问题。

* 对底层进行升级，支持 AgentScope，做好阿里云、AgentScope 与 Spring 生态连接，提供企业级智能体解决方案。

* 全面升级 Admin 平台，打造企业级 Agent 构建与交付平台。

![admin](/img/blog/saa-agentscope/img_4.png)

### 六、AgentScope-Java 的开源路线图？

AgentScope Java 自 2025 年 9 月开源（[https://github.com/agentscope-ai/agentscope-java](https://github.com/agentscope-ai/agentscope-java)）以来，当前 v0.2 版本已具备 ReActAgent 核心能力。

我们计划于 11 月底发布 v1.0 版本，届时将新增 RAG、Plan、Tracing、Evaluation 及 Studio 等全套功能，标志着框架正式生产可用；Runtime v1.0 也将同步上线，提供涵盖安全沙箱、A2A Agent 在内的企业级落地方案。随后在 12 月，我们将进一步推出基于 ReMe 的上下文管理与基于 Trinity-RFT 的强化学习最佳实践。

在技术演进层面，我们正持续探索更高效、智能的上下文工程与多 Agent 协同范式，致力于支撑更强大的 AI 应用构建。 此外，针对 Agent 流量呈现的“二八定律”特征（头部 20% 的 Agent 承载了 80% 的流量），我们在架构上全力推进 Serverless 化，通过实现毫秒级冷启动与混合部署，帮助开发者在应对高并发的同时，显著降低部署成本并提升效率。

![admin](/img/blog/saa-agentscope/img_5.png)
