---
title: "基于Spring AI Alibaba + Nacos的分布式Multi-Agent构建指南"
description: "基于Spring AI Alibaba + Nacos的分布式Multi-Agent构建指南"
date: "2025-10-23"
category: "article"
keywords: ["SCA-AI"]
authors: "CH3CHO"
---

<font style="color:rgb(13, 18, 57);">作者：</font><font style="color:rgb(0, 0, 0);">如漫、席翁</font>

<font style="color:rgb(13, 18, 57);">AI Agent的构建模式正在从“单个智能体做所有事”走向“多个专精智能体协作”，以更好地拆解并解决复杂任务、更精准的选取和使用工具。A2A（Agent-to-Agent）协议作为统一的通信层，旨在为跨进程、跨语言的智能体互操作提供标准化语义与传输通道，</font><font style="color:rgb(53, 56, 65);">从而解决智能体数量增加引起的运维、管理和部署成本过高等问题。</font>

为了让开发者能够高效、便捷的构建分布式多智能体系统，同时更专注于Agent本身功能的构建和调试。Spring AI Alibaba与Nacos在今年的云栖大会上协同发布了1.0.0.4与3.1.0版本。

其中，Nacos 3.1.0 引入 A2A 了注册中心功能，提供了轻量化的 Agent 服务注册与发现能力；Spring AI Alibaba 通过集成 Nacos，提供了开箱即用的 Agent 注册、Agent 发现与负载均衡能力，让开发者能够快速构建使用 A2A 标准协议通信的分布式多智能体系统。

本文将针对 Spring AI Alibaba + Nacos 的分布式多智能体构建方案展开介绍，同时结合 Demo 说明快速开发方法与实际效果。<font style="color:#DF2A3F;"></font>

# 为什么需要分布式多智能体？
## 从单智能体到多智能体
随着开发者期望智能体解决的问题复杂性和专业性提高，伴随着工具数量的增加、多轮会话导致的消息上下文膨胀，我们发现单智能体很难作为一个“全面的超级专家”，来解决多种复合类型的问题。

为了有效解决这个问题，工程上提出了多智能体模式，在这种模式下，系统由多个具备一定自治能力的 Agent 组成，每个 Agent 有自己的角色、能力或工具使用范围。它们之间可以通过消息或上下文进行交互，协同完成复杂目标。多智能体模式具有较强的灵活性和适应性，在研究型问答、复杂数据分析或跨领域问题求解等复杂任务场景下能够取得更好的效果，已经得到越来越多开发者的青睐。

![](https://img.alicdn.com/imgextra/i1/O1CN01W5v6AC1wrqrysVImC_!!6000000006362-2-tps-1600-1316.png)

## 多智能体的分布式演进趋势
在过去的一段时间里，AI 应用框架支持的多智能体构建模式，主要以单进程、多线程模式为主。从代码形态上来看，多个 Agent 被实现在同一个仓库；从部署形态上来看，多个智能体被整合到一个服务中，每个智能体以线程的方式存在于服务内并互相通信。这种实现方式在原型验证阶段，能够快速实现并调试功能，但在企业级落地和持续生产迭代过程中，逐渐暴露出以下问题：

1. 组织协同困难。企业内部的组织主要以职能或领域划分，在一个多智能体系统中，交易智能体和搜索智能体作为领域专精智能体，更适合由支付团队和搜索团队独立维护，但在上述模式下，两个团队需要共同维护同一份代码、同一个服务，这些无疑会给跨团队协同带来极大的困难，更不符合企业组织拆分的初衷和原则。
2. 可用性难保证。由于所有智能体共享同一进程资源，一个智能体出现问题引起的服务崩溃，可能会导致其他智能体均不可用，无法有效隔离故障；同时，也无法按智能体维度进行水平扩缩容，难以实现细粒度的资源配额和限流。
3. 存在安全风险。<font style="color:rgb(13, 18, 57);">内存与上下文共享导致权限边界模糊，难以对不同智能体实施最小权限与数据隔离策略，存在一定的安全风险。</font>

因此，将多智能体系统拆解成分布式架构，一方面适配于组织架构、便于各自领域的智能体独立开发和迭代，一方面便于提升系统的整体可用性和安全性，正在逐渐成为复杂多智能体系统企业级落地的必要选择。

# 基于A2A协议的分布式多智能体构建方案
[Agent2Agent (A2A)](https://a2a-protocol.org/latest/) 协议是由 Google 开发并捐赠给 Linux 基金会的一项开放标准，旨在实现 AI Agent之间的无缝通信与协作，<font style="color:rgb(53, 56, 65);">从而解决智能体数量增加引起的运维、管理和部署成本过高等问题</font>，实现像构建微服务架构一样构建 Multi Agent 系统。

为了管理这些 Agent，Nacos 从 3.1.0 版本开始，提供了 Agent 注册中心（A2A Registry），实现Agent的注册、发现、命名空间隔离、版本管理等功能。Spring AI Alibaba 作为一款高代码 AI 应用开发框架，形态上天然适合构建分布式多智能体系统，从 1.0.0.4 版本开始，支持通过 Agentic API 便捷定义和构建 Agent，同时集成 Nacos 进行分布式 Agent 之间的 A2A 协议通信。

基于 Spring AI Alibaba + Nacos 的实现方案示意如下图所示。Server Agent 在启动时，会将 Agent 信息与端点信息注册到 Nacos 中；Client Agent 监听并获取 Agent 信息，同时发现对应 Agent 的端点列表；在需要访问 Server Agent 时，会通过负载均衡选取 Agent 端点，并采用 A2A 协议进行通信。

![](https://img.alicdn.com/imgextra/i1/O1CN01rLKobq1gU0OZzYDjf_!!6000000004144-2-tps-3243-2335.png)

# <font style="color:rgb(23, 24, 28);">快速开发指南</font>
## Demo介绍
为了方便开发者参考和使用，我们基于 Spring AI Alibaba + Nacos 构建并开源了“云边奶茶铺智能助手” 分布式多智能体 Demo，<font style="color:rgb(31, 35, 40);">让消费者一站式咨询、点单与反馈，持续根据用户行为和喜好推荐并下单产品, 从而实现“越来越懂我”，“越用越好用”的用户体验。</font>

<font style="color:rgb(31, 35, 40);">构建 Demo 所使用到的 AI 技术包括 A2A、MCP、RAG、Memory、Prompt 管理、AI 观测等，支持集成 Nacos、Higress AI 网关、Spring AI Alibaba Admin、百炼知识库 、Mem0 等。本文将主要围绕 A2A 能力展开介绍。</font>

:::warning
<font style="color:rgb(31, 35, 40);">Demo 工程地址请参见：</font>[spring-ai-alibaba-multi-agent-demo](https://github.com/spring-ai-alibaba/spring-ai-alibaba-multi-agent-demo)<font style="color:rgb(31, 35, 40);">。</font>

<font style="color:rgb(31, 35, 40);">完整的 Demo 效果演示和介绍，可以观看视频了解：</font>[分布式多智能体 Demo 演示——基于 Spring AI Alibaba Agentic API 构建](https://www.bilibili.com/video/BV12Kniz2EE6/)<font style="color:rgb(31, 35, 40);">。</font>

:::

Demo 的整体 Agent 依赖关系如下图所示。用户的会话首先会传递给 Supervisor Agent，Supervisor Agent 根据对话属性，委托 Consult Agent、Business Agent 和 Feedback Agent 子智能体处理不同类型的问题，这些子智能体通过多轮模型对话交互以及使用各自的工具完成任务后，将结果返回给 Supervisor Agent，并最终返回给用户。

四个 Agent 分别在不同的进程中独立部署，支持水平扩展。Supervisor Agent 与 Sub Agents 集成 Nacos 进行 Agent 注册与发现，并通过 A2A 协议进行分布式通信。

接下来，我们将以 Feedback Agent 与 Supervisor Agent 为例，分别介绍作为 AI 应用开发者，如何开发实现 A2A Server Agent 与 A2A Client Agent。

![](https://img.alicdn.com/imgextra/i1/O1CN01rqulNn1pQBdSDR20I_!!6000000005354-2-tps-5298-1406.png)

## 构建A2A Server Agent
以 Feedback Agent 为例，介绍使用 Spring AI Alibaba 构建 A2A Server Agent 的关键步骤。

+ 引入 Pom 依赖

```yaml
<!-- Spring AI Alibaba版本1.0.0.4及以上 -->
<properties>
    <spring.ai.alibaba.version>1.0.0.4</spring.ai.alibaba.version>
</properties>

<dependencies>
    <!-- 引入A2A Server starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-a2a-server</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>
    <!-- 引入A2A Nacos 注册中心 -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-a2a-registry</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>
    <!-- 引入A2A 百炼大模型客户端，可以用其他的spring ai大模型客户端代替，如openai -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>
</dependencies>
```

+ 构建 Agent

通过 Spring AI Alibaba 中定义的 Agentic API 快速定义及构建 Agent 运行逻辑，如下所示，使用几十行代码即可创建用于处理用户反馈的 ReAct Agent。

```yaml
@Configuration
public class FeedbackAgent {
    private static final Logger logger = LoggerFactory.getLogger(FeedbackAgent.class);

	@Autowired
	private FeedbackAgentPromptConfig promptConfig;
	
    @Bean
    public ReactAgent feedbackSubAgentBean(@Qualifier("dashscopeChatModel") ChatModel chatModel,
										   @Autowired(required = false)
										   @Qualifier("loadbalancedMcpSyncToolCallbacks")
										   ToolCallbackProvider toolsProvider) throws Exception {

		KeyStrategyFactory stateFactory = () -> {
			HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
			keyStrategyHashMap.put("messages", new ReplaceStrategy());
			return keyStrategyHashMap;
		};


		return ReactAgent.builder()
				.name("feedback_agent")
				.model(chatModel)
				.state(stateFactory)
				.description("用户反馈相关业务处理，支持从反馈中提取和记录用户偏好")
				.instruction(promptConfig.getFeedbackAgentInstruction())
				.inputKey("messages")
				.outputKey("messages")
				.tools(Arrays.asList(toolsProvider.getToolCallbacks()))
				.build();
	}
}
```

+ 配置 Agent 注册参数

```yaml
spring:
  ai:
    alibaba:
      a2a:
        # 配置Nacos的地址和用户名密码
        nacos:
          server-addr: ${NACOS_SERVER_ADDR:127.0.0.1:8848}
          username: ${NACOS_USERNAME:nacos}
          password: ${NACOS_PASSWORD:nacos}
        # 配置A2A server的额外信息，如版本号，agentCard中的Skills等
        server:
          version: 1.0.0
          card:
            # 配置Agent（AgentCard）的URL，若当前版本无可用端点，会使用此 URL
            url: http://localhost:9999/a2a
            name: feedback_agent
            description: 云边奶茶铺反馈处理助手
            provider:
              organization: 云边奶茶铺
              url: xxxxx
```

<font style="color:rgb(53, 56, 65);">启动A2A Server 后，即可在 Nacos 控制台上看到注册的Agent信息。如下图所示。</font>

![](https://img.alicdn.com/imgextra/i3/O1CN01cRfaXy1HV2tqaJjeH_!!6000000000762-2-tps-3314-402.png)

![](https://img.alicdn.com/imgextra/i1/O1CN01klqkIJ223MuLFTWsv_!!6000000007064-2-tps-3326-272.png)

Feedback Agent 的完整的代码实现请详见：[feedback-sub-agent](https://github.com/spring-ai-alibaba/spring-ai-alibaba-multi-agent-demo/tree/main/feedback-sub-agent)。

## 构建A2A Client Agent
以 Supervisor Agent 为例，介绍使用 Spring AI Alibaba 构建 Client Agent 的关键步骤。

+ 引入 Pom 依赖

```yaml
<properties>
  <spring.ai.alibaba.version>1.0.0.4</spring.ai.alibaba.version>
</properties>

<dependencies>
  <!-- 引入A2A Client starter -->
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-a2a-client</artifactId>
    <version>${spring-ai-alibaba.version}</version>
  </dependency>
  <!-- 引入A2A Nacos 注册中心 -->
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-a2a-registry</artifactId>
    <version>${spring-ai-alibaba.version}</version>
  </dependency>
  <!-- 引入A2A 百炼大模型客户端，可以用其他的spring ai大模型客户端代替，如openai -->
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    <version>${spring-ai-alibaba.version}</version>
  </dependency>
</dependencies>
```

+ 构建 Agent

通过 Spring AI Alibaba 中定义的 Agentic API 快速构建 A2aRemoteAgent 作为 Supervisor Agent 的 Sub Agent，其中 Agent 的 Card 和端点信息是从 Nacos 中发现并监听；接下来构建 LlmRoutingAgent 作为 Supervisor Agent。

```yaml
@Configuration
public class SupervisorAgent {
    @Autowired
    private SupervisorAgentPromptConfig promptConfig;

    @Bean
    public LlmRoutingAgent supervisorAgentBean(ChatModel chatModel,
                                               @Autowired AgentCardProvider agentCardProvider) throws Exception {
        KeyStrategyFactory stateFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
            keyStrategyHashMap.put("input", new ReplaceStrategy());
            keyStrategyHashMap.put("chat_id", new ReplaceStrategy());
            keyStrategyHashMap.put("user_id", new ReplaceStrategy());
            keyStrategyHashMap.put("messages", new ReplaceStrategy());
            return keyStrategyHashMap;
        };

        // 构建A2aRemoteAgent, AgentCard与端点信息实际是从Nacos发现并监听
        A2aRemoteAgent consultAgent = A2aRemoteAgent.builder()
                .name("consult_agent")
                .agentCardProvider(agentCardProvider)
                .build();

        A2aRemoteAgent feedbackAgent = A2aRemoteAgent.builder()
                .name("feedback_agent")
                .agentCardProvider(agentCardProvider)
                .build();
        A2aRemoteAgent orderAgent = A2aRemoteAgent.builder()
                .name("order_agent")
                .agentCardProvider(agentCardProvider)
                .build();

        // 构建Supervisor Agent, 将上述创建的A2aRemoteAgent作为Sub Agent注册
        return LlmRoutingAgent.builder()
                .name("supervisor_agent")
                .model(chatModel)
                .state(stateFactory)
                .description(promptConfig.getSupervisorAgentInstruction())
                .inputKey("input")
                .outputKey("messages")
                .subAgents(List.of(consultAgent, feedbackAgent, orderAgent))
                .build();
    }
}
```

+ 配置 Agent 发现参数

```yaml
spring:
  ai:
    alibaba:
      a2a:
        nacos:
          server-addr: ${NACOS_SERVER_ADDR:127.0.0.1:8848}
          username: ${NACOS_USERNAME:nacos}
          password: ${NACOS_PASSWORD:nacos}
          discovery:
            enabled: true  # 开启从Nacos中自动发现Agent
```

完成 Agent 定义和构建后，可以将 Supervisor Agent 暴露到 API 中以支持对话调用，Supervisor Agent 将会根据会话内容，将任务按需分派给通过 Nacos 发现的子智能体，并通过 A2A 协议通信。

Supervisor Agent 完整的代码实现请详见：[supervisor-agent](https://github.com/spring-ai-alibaba/spring-ai-alibaba-multi-agent-demo/tree/main/supervisor-agent)。

## 运行效果演示
将上文所述 Demo 的全部组件完整运行起来之后，即可在浏览器中打开页面并和云边奶茶铺智能助手进行对话。

![](https://img.alicdn.com/imgextra/i1/O1CN01T3lwA51vsTnSbVziE_!!6000000006228-2-tps-2642-1356.png)

让智能助手推荐奶茶产品时，Supervisor Agent 会基于 Nacos 的监听和发现，通过 A2A 协议调用 Consult Agent 服务的一个实例进行处理，Consult Agent 在模型驱动下，通过使用百炼知识库检索、数据库搜索、记忆检索等工具，获取用户画像和产品信息，并根据用户喜好生成推荐内容并返回结果。

![](https://img.alicdn.com/imgextra/i2/O1CN017o5ZVz1xEkflU0nh7_!!6000000006412-2-tps-2692-1342.png)

同样，让智能助手下订单或者查询订单时，Supervisor Agent 会基于 Nacos 的监听和发现，通过 A2A 协议调用 Order Agent 服务的一个实例进行处理，Order Agent 在模型驱动下，通过访问 Order Mcp Server 的一个实例调用创建订单、查询订单等工具，完成订单创建或查询，并返回结果。

![](https://img.alicdn.com/imgextra/i4/O1CN01ou8p1n1eZNoYUKBID_!!6000000003885-2-tps-2660-1322.png)

:::warning
更完整的 Demo 效果演示和介绍，可以进一步观看[分布式多智能体 Demo 演示——基于 Spring AI Alibaba Agentic API 构建](https://www.bilibili.com/video/BV12Kniz2EE6/)详细了解。

:::

# 讲在最后
无论从业务角度，还是技术角度来看，智能体的分布式架构都是必然选择。本文介绍了基于 Spring AI Alibaba + Nacos 的实现方案，帮助开发者快速构建分布式多智能体系统，实现智能体弹性伸缩与跨团队解耦。同时以“云边奶茶铺 Demo”为例介绍了具体开发方式。

目前，阿里云 MSE 商业版 Nacos 也已经支持了 A2A Registry 的能力，同时还具备 MCP Registry、Prompt 动态配置管理等能力，和开源 Nacos 相比，具有更高的可用性，更适用于企业级 AI 应用的构建。

此外，AgentScope Java 将于近期发布 1.0 版本，Spring AI Alibaba 后续会把内核升级为 AgentScope ，继续为 Java 开发者打造一个自动装配、开箱即用的 Agent 开发框架。

欢迎您一起参与探索并构建 Multi Agent 系统，让分布式多智能体加速走向更高规模的生产。


