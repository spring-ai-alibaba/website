---
title: 智能体代理模式（Agent Agentic Patterns）
tags: [Spring AI,代理模式,智能体架构]
description: 使用 Spring AI 构建高效 Agent 代理。
authors: [Aias00]
slug: agent-agentic-patterns
date: "2025-06-15"
category: article
---

# AgentAgenticPatterns 简介
在最近的一篇研究报告[《构建高效代理》](https://www.anthropic.com/research/building-effective-agents) 中，Anthropic分享了关于构建高效大语言模型（LLM）代理的宝贵见解。这项研究特别有趣的地方在于，它强调简单性和可组合性，而非复杂的框架。让我们来探索如何利用Spring AI将这些原则转化为实际的实现。

<!-- truncate -->

## 什么是智能体
"智能体" 有多种定义方式。一些用户将智能体定义为完全自主的系统，这类系统能够长时间独立运行，使用各种工具完成复杂任务。还有一些人用这个术语描述遵循预定义工作流程、指令性更强的实施方案。在Anthropic的定义当中,将所有这些变体都归类为智能系统，但在架构上对工作流程和智能体做出了重要区分：

* 工作流：指通过预定义代码路径来协调大语言模型和工具的系统。
* 智能体：则是大语言模型能够动态指导自身流程和工具使用，对完成任务的方式保持控制权的系统。

关键的一点是，虽然完全自主的代理可能很有吸引力，但对于定义明确的任务，工作流通常能提供更好的可预测性和一致性。这与企业对可靠性和可维护性至关重要的要求完美契合。接下来，我们将详细探讨这两类智能系统。

# 代理系统
在使用大语言模型构建应用程序时，我们建议尽可能寻找最简单的解决方案，仅在必要时增加复杂性。这可能意味着根本无需构建智能系统。智能系统通常会用延迟和成本来换取更好的任务性能，应该考虑这种权衡在何种情况下是合理的。

当确实需要增加复杂性时，对于定义明确的任务，工作流程能提供可预测性和一致性。

而当大规模需要灵活性和基于模型的决策时，智能体则是更好的选择。然而，对于许多应用程序而言，通过检索和上下文示例优化单个大语言模型调用通常就已足够。

让我们通过五个基本模式来看看Spring AI是如何实现这些概念的，每个模式都适用于特定的用例：

## 链式工作流

这个模式就像工厂流水线——把复杂任务拆成一个个小工序，前一道工序的结果自动传给下一道。技术实现上用了"责任链"设计模式，支持随时增加新的处理环节。

![The prompt chaining workflow](/img/blog/agent-agentic-patterns/The-prompt-chaining-workflow.png)

### 使用场景
这个实现展示了几个关键原则：

* 需要分步骤完成的复杂任务（比如先查天气再规划行程最后生成攻略）
* 宁愿多花点时间也要保证准确率（像重要文件的多级审批）
* 后一步依赖前一步的结果（就像做菜必须按洗菜→切菜→炒菜的顺序）

以下是Spring AI实现的一个实际示例：

```java
public class ChainWorkflow {
    private final ChatClient chatClient;
    private final String[] systemPrompts;   

    // 通过一系列提示处理输入，其中每一步的输出成为链中下一个步骤的输入。
    public String chain(String userInput) {
        String response = userInput;
        for (String prompt : systemPrompts) {
            // 将系统提示与上一个响应结合
            String input = String.format("{%s}\n {%s}", prompt, response);
            // 通过大语言模型处理并捕获输出
            response = chatClient.prompt(input).call().content();
        }
        return response;
    }
}
```

## 并行化工作流

这个模式就像开了多个窗口同时干活——让多个大模型同时处理任务，最后把结果汇总起来。主要有两种方式：

* **分片处理**：把大任务拆成小任务，分给不同的大模型同时处理（类似分工作业）
* **投票机制**：让多个大模型同时处理同一个任务，最后投票选出最佳结果（像开会讨论）

![The parallelization workflow](/img/blog/agent-agentic-patterns/The-parallelization-workflow.png)

### 使用场景

并行化工作流模式展示了对多个大语言模型操作的高效并发处理。这种模式对于需要并行执行大语言模型调用并自动聚合输出的场景特别有用。

* 要处理一堆相似但互不干扰的任务（比如同时分析多个用户群体的数据）
* 需要多个任务独立运行（像工厂里的流水线作业）
* 任务能快速拆解且可以并行执行（比如同时生成多个产品描述）

以下是Spring AI实现的一个实际示例，比如要分析市场变化对四类利益群体的影响，我们可以让四个大模型同时开工：：

```java
List<String> parallelResponse = new ParallelizationWorkflow(chatClient)
   .parallel(
        "Analyze how market changes will impact this stakeholder group.",
        List.of(
            "Customers: ...",
            "Employees: ...",
            "Investors: ...",
            "Suppliers: ..."
        ),
        4
    );
```

## 路由工作流

路由模式实现了智能任务分配，能够针对不同类型的输入进行专门处理，这种模式专为复杂任务设计，不同类型的输入由专门的流程处理会更好。
这个模式就像智能分诊台——能自动识别问题类型，转给最专业的处理流程。技术实现上相当于给大模型装了个智能路由器，不同的问题自动走专用通道。

![The routing workflow](/img/blog/agent-agentic-patterns/The-routing-workflow.png)

### 使用场景

它使用大语言模型分析输入内容，并将其路由到最合适的专门提示或处理程序。

* 要处理五花八门的问题类型（比如客服系统同时接咨询、投诉、技术问题）
* 不同问题需要不同专家处理（像医院分内科/外科/急诊）
* 需要精准分类输入内容（像快递自动分拣系统）

以下是使用路由工作流的基本示例：

```java
@Autowired private ChatClient chatClient;

// 创建工作流
RoutingWorkflow workflow = new RoutingWorkflow(chatClient);

// 为不同类型的输入定义专门的提示
Map<String, String> routes = Map.of(
    "billing", "You are a billing specialist. Help resolve billing issues...",
    "technical", "You are a technical support engineer. Help solve technical problems...",
    "general", "You are a customer service representative. Help with general inquiries..."
);

// 处理输入
String input = "My account was charged twice last week";
String response = workflow.route(input, routes);
```

## 协调者-执行者

这个模式就像电影拍摄现场——导演（协调者）负责分镜头，各工种（执行者）专注自己的专业领域。技术实现上采用"中央指挥部+特种部队"的架构，既保持灵活又确保可控。

![The orchestrator workers workflow](/img/blog/agent-agentic-patterns/The-orchestrator-workers-workflow.png)

### 使用场景
当你的任务像建造摩天大楼需要多方协作时：

* 任务复杂到无法提前拆解（像应对突发事件的应急小组）
* 需要不同专业视角（像建筑设计需要结构/水电/装修多方配合）
* 解决方案需要动态调整（像军事行动中的实时战术变化）

实现使用Spring AI的ChatClient进行大语言模型交互，包括：

```java
public class OrchestratorWorkersWorkflow {
    public WorkerResponse process(String taskDescription) {
        // 1. 协调器分析任务并确定子任务
        OrchestratorResponse orchestratorResponse = //...

        // 2. 工作器并行处理子任务
        List<String> workerResponses = //...

        // 3. 结果合并为最终响应
        return new WorkerResponse(/*...*/);
    }
}

ChatClient chatClient = //... 初始化聊天客户端
OrchestratorWorkersWorkflow workflow = new OrchestratorWorkersWorkflow(chatClient);

// 处理任务
WorkerResponse response = workflow.process(
    "Generate both technical and user-friendly documentation for a REST API endpoint"
);

// 访问结果
System.out.println("Analysis: " + response.analysis());
System.out.println("Worker Outputs: " + response.workerResponses());
```

## 评估者-优化者

这个模式就像作家与编辑的协作——写手（生成者）负责创作初稿，编辑（评估者）逐字推敲提出修改意见。技术实现上采用"创作-反馈"循环机制，直到作品达到出版标准。

* **生成者大语言模型**：生成初始响应并根据反馈进行改进。
* **评估者大语言模型**：分析响应并提供详细的改进反馈。

![The evaluator-optimizer workflow](/img/blog/agent-agentic-patterns/The-evaluator-optimizer-workflow.png)

### 使用场景
评估者 - 优化者模式适用于需要多轮迭代以提高质量的任务。

* 有明确的品质标准（像学术论文需要同行评审）
* 迭代改进能显著提升价值（像广告文案的AB测试）
* 追求完美输出（像电影剧本的多次修订）

实现使用Spring AI的ChatClient进行大语言模型交互，包括：

```java
public class EvaluatorOptimizerWorkflow {
    public RefinedResponse loop(String task) {
        // 1. 生成初始解决方案
        Generation generation = generate(task, context);
    
        // 2. 评估解决方案
        EvaluationResponse evaluation = evaluate(generation.response(), task);
    
        // 3. 如果通过，返回解决方案
        // 4. 如果需要改进，结合反馈并生成新的解决方案
        // 5. 重复直到满意
        return new RefinedResponse(finalSolution, chainOfThought);
    }
}

ChatClient chatClient = //... 初始化聊天客户端
EvaluatorOptimizerWorkflow workflow = new EvaluatorOptimizerWorkflow(chatClient);

// 处理任务
RefinedResponse response = workflow.loop(
    "Create a Java class implementing a thread-safe counter"
);

// 访问结果
System.out.println("Final Solution: " + response.solution());
System.out.println("Evolution: " + response.chainOfThought());
```

## 结论

Anthropic的研究见解与Spring AI的实际实现相结合，为构建有效的基于大语言模型的系统提供了强大的框架。通过遵循这些模式和原则，开发人员可以创建健壮、可维护且高效的AI应用程序，在避免不必要复杂性的同时提供真正的价值。

关键是要记住，有时最简单的解决方案就是最有效的。从基本模式开始，彻底了解你的运用场景，只有在复杂性能显著提高系统性能或功能时才进行设计。
