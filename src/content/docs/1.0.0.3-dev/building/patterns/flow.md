---
title: 流程模式 (Flow)
description: 使用 FlowAgent 构建可预测、可组合的确定性工作流。
---

在上一章节中，我们学习了 `ReactAgent`，它像一个拥有自主意识的员工，能够动态地思考和行动。然而，在许多业务场景中，我们需要的是一个严格遵守预设流程的“流水线”——任务必须按照固定的顺序、分支或并行逻辑来执行。

这就是 **Flow 模式** 发挥作用的地方。

`FlowAgent` 是 SAA 提供的一套用于构建工作流智能体的强大工具。它允许您将多个独立的 Agent（可以是 `ReactAgent` 或其他 `FlowAgent`）像乐高积木一样组合起来，定义它们之间的执行顺序、数据流转和控制逻辑。

**`FlowAgent` vs. `ReactAgent`**

| 特性 | `ReactAgent` (自主员工) | `FlowAgent` (流水线工头) |
| :--- | :--- | :--- |
| **核心思想** | **自主决策 (Autonomy)** | **流程编排 (Orchestration)** |
| **执行逻辑** | 动态、非确定性，由 LLM 在每一步实时决定下一步做什么。 | 预定义、确定性，严格按照您设计的流程图执行。 |
| **适用场景** | 探索性任务，需要 Agent 自主规划和使用工具，如智能问答、研究分析。 | 业务流程固化的任务，如订单处理、数据ETL、多步骤报告生成。 |

## Flow 模式的四种核心实现

`FlowAgent` 不是一个单一的类，而是一个系列的 Agent 模式的统称。SAA 为您预置了四种核心的 Flow 实现，可以满足绝大多数工作流编排需求：

1.  **`SequentialAgent` (顺序流)**: 像一条直线，让多个 Agent 按顺序依次执行。
2.  **`ParallelAgent` (并行流)**: 像一个分叉路口，让多个 Agent 同时执行，最后再将结果汇总。
3.  **`LlmRoutingAgent` (路由流)**: 像一个智能调度员，利用 LLM 根据输入内容，动态地决定接下来应该走哪条支线流程。
4.  **`LoopAgent` (循环流)**: 像一个循环体，可以按次数、按条件或按集合对某个流程进行反复执行。

接下来，我们将通过构建一个“AI 旅游规划师”的例子，来逐一学习并应用这四种模式。

## 1. 顺序流 (`SequentialAgent`)

这是最基础也是最常用的 Flow 模式。它将多个子 Agent 串联起来，前一个 Agent 的输出可以作为后一个 Agent 的输入。

**场景**: 我们的旅游规划师首先需要“**① 确定旅游城市**”，然后根据城市“**② 生成该城市的必游景点列表**”。这两个步骤是严格的先后关系。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.flow.agent.SequentialAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;
import java.util.Map;

// 假设我们已经创建了两个 ReactAgent
// agent1: 用于和用户对话，确定想去的城市
ReactAgent chooseCityAgent = ReactAgent.builder()
    .name("ChooseCityAgent")
    .description("与用户对话，确定他们想去的城市，并输出城市名称。")
    .chatClient(chatClient)
    .instruction("你是一个旅游顾问，友好地询问用户想去哪个城市。只输出最终确认的城市名，不要有其他多余的话。")
    //  定义输出键，以便下游 Agent 接收
    .outputKey("cityName") 
    .build();

// agent2: 根据城市名，查找必游景点
ReactAgent findAttractionsAgent = ReactAgent.builder()
    .name("FindAttractionsAgent")
    .description("根据城市名称，生成一个必游景点的 JSON 数组字符串。")
    .chatClient(chatClient)
    .tools(List.of(new AttractionSearchTool())) // 假设有一个查询景点的工具
    .instruction("你是一个旅游信息查询助手。")
    // 定义输入键，接收上游 Agent 的输出
    .inputKey("cityName")
    .outputKey("attractionsJson")
    .build();

// 使用 SequentialAgent 将它们串联起来
SequentialAgent planInitialIdeas = SequentialAgent.builder()
    .name("PlanInitialIdeasFlow")
    .agents(chooseCityAgent, findAttractionsAgent)
    .build();

// 执行顺序流
try {
    Map<String, Object> finalResult = planInitialIdeas.invoke(
        Map.of("messages", "你好，我想去旅游，有什么推荐吗？")
    ).get().data();

    // finalResult 中将会包含 attractionsJson 的结果
    System.out.println(finalResult.get("attractionsJson"));
} catch (GraphStateException | GraphRunnerException e) {
    e.printStackTrace();
}
```

**核心要点**:
-   `SequentialAgent` 通过 `.agents()` 方法接收多个 `BaseAgent` 参数，并会严格按照参数的顺序执行。
-   **数据流转**: 通过为子 Agent 设置 `.inputKey()` 和 `.outputKey()`，我们构建了一条数据管道。`chooseCityAgent` 将结果写入 `"cityName"`，`findAttractionsAgent` 从 `"cityName"` 读取数据，实现了 Agent 间的自动数据传递。

## 2. 并行智能体 (`ParallelAgent`)

`ParallelAgent` 用于并行执行多个智能体，然后将它们的结果进行合并。这对于需要同时从多个独立来源收集信息或执行多个独立子任务的场景至关重要。

#### 高级配置

`ParallelAgent` 提供了丰富的配置选项以应对复杂的并行需求：
-   **`maxConcurrency`**: 设置最大并发数。例如，如果有 10 个 Agent，但 `maxConcurrency` 设置为 3，那么框架将分批执行，每一批最多 3 个 Agent 并行。
-   **`MergeStrategy`**: 定义如何合并来自不同并行分支的结果。这是一个函数式接口 `(Map<String, OverAllState>) -> Map<String, Object>`，您可以实现自定义逻辑。

#### 核心示例：并行搜索并自定义合并结果

假设旅行计划需要同时搜索“航班信息”和“酒店信息”，并且我们希望将两者的结果合并为一个定制的 JSON 对象。

**步骤 1: 实现自定义合并策略**
```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.agent.flow.agent.MergeStrategy;

import java.util.Map;

public class CustomTravelMergeStrategy implements MergeStrategy {
    @Override
    public Map<String, Object> merge(Map<String, OverAllState> agentStates) {
        // 从各自 Agent 的最终状态中提取结果
        String flightResult = agentStates.get("flight_search_agent")
                .value("flight_info", String.class)
                .orElse("未能查询到航班信息");

        String hotelResult = agentStates.get("hotel_search_agent")
                .value("hotel_info", String.class)
                .orElse("未能查询到酒店信息");

        // 将结果合并为一个自定义结构
        Map<String, String> travelPlan = Map.of(
                "flight", flightResult,
                "hotel", hotelResult
        );

        // 将合并后的结果放入最终状态的 "travel_plan" 字段
        return Map.of("travel_plan", travelPlan);
    }
}
```

**步骤 2: 构建 `ParallelAgent`**
```java
// 假设 flightSearchAgent 和 hotelSearchAgent 已经定义好
ParallelAgent parallelSearchAgent = ParallelAgent.builder()
        .name("parallel_search_agent")
        .agents(flightSearchAgent, hotelSearchAgent)
        .maxConcurrency(2) // 设置最大并发数为 2
        .mergeStrategy(new CustomTravelMergeStrategy()) // 应用自定义合并策略
        .build();

// 执行
OverAllState finalState = parallelSearchAgent.invoke(
    Map.of("destination", "北京", "date", "2025-10-01")
);

// finalState.value("travel_plan") 将会得到包含航班和酒店信息的 Map
```

> **底层探究**: `ParallelAgent` 的强大能力构建于 SAA Graph 的原生[并行执行](../advanced/parallel-execution)机制之上。当您需要更精细地控制并行流程的拓扑结构时，可以直接使用 `StateGraph` 来构建。

### 3. 大语言模型路由智能体 (`LlmRoutingAgent`)

`LlmRoutingAgent` 根据用户的输入，利用大语言模型（LLM）的决策能力，从多个候选的智能体中选择一个最合适的来执行。

```java
// 假设 weatherAgent 和 calculatorAgent 已经定义好
LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
        .name("smart_router")
        .chatModel(chatModel) // 提供用于决策的 ChatModel
        .agents(weatherAgent, calculatorAgent)
        .build();

// LLM 会根据问题内容决定调用 weatherAgent
routingAgent.invoke(Map.of("input", "今天上海天气怎么样?"));

// LLM 会根据问题内容决定调用 calculatorAgent
routingAgent.invoke(Map.of("input", "计算 1024 * 768"));
```

### 4. 循环智能体 (`LoopAgent`)

`LoopAgent` 重复执行一个或多个智能体，直到满足特定条件为止。它支持多种循环模式 (`LoopAgent.Mode`)：
-   `WHILE`: 先判断条件，再执行。
-   `DO_WHILE`: 先执行一次，再判断条件。
-   `REPEAT`: 固定次数循环。

```java
// 该 Agent 用于评估研究论文的质量，返回一个包含 "score" 和 "critique" 的 Map
BaseAgent paperReviewAgent = ...;

LoopAgent iterativeReviewer = LoopAgent.builder()
        .name("iterative_reviewer")
        .loopMode(LoopAgent.LoopMode.WHILE)
        .agents(paperReviewAgent)
        .maxLoops(5) // 最多循环 5 次，防止死循环
        .condition((state) -> {
            // 从上次 paperReviewAgent 的执行状态中获取分数
            int score = state.value("score", Integer.class).orElse(0);
            // 当分数低于 90 时，继续循环
            return score < 90;
        })
        .build();
```

## 综合应用：打造完整的 AI 旅游规划师

现在，我们可以将以上所有模式组合起来，构建一个完整的、强大的旅游规划工作流：

```java
// 将所有子 Agent 实例化 (此处省略 builder 代码)
// ...

// ★ Step 1 & 2: 顺序流 - 先确定城市，再查景点
SequentialAgent planInitialIdeas = SequentialAgent.builder()
    .name("PlanInitialIdeasFlow")
    .agents(chooseCityAgent, findAttractionsAgent)
    .outputKey("initialPlan") // 将整个初步规划的结果输出
    .build();

// ★ Step 3: 循环流 - 为每个景点写介绍
LoopAgent describeAllAttractions = LoopAgent.builder()
    .name("DescribeAllAttractionsLoop")
    .agents(attractionDescriberAgent)
    .loopMode(LoopAgent.LoopMode.JSON_ARRAY)
    .inputKey("attractionsJson")
    .outputKey("allDescriptions")
    .build();

// ★ Step 4: 并行流 - 同时查天气和酒店
ParallelAgent searchParallel = ParallelAgent.builder()
    .name("SearchParallelFlow")
    .agents(weatherAgent, hotelRouter) // hotelRouter 本身是一个路由流
    .outputKey("searchResult")
    .build();

// ★ Step 5: 最终的顺序总装流
SequentialAgent finalItineraryPlanner = SequentialAgent.builder()
    .name("FinalItineraryPlanner")
    .agents(
        planInitialIdeas, 
        describeAllAttractions, 
        searchParallel, 
        finalSummaryAgent // 最后一个 Agent，用于汇总所有信息生成最终报告
    )
    .build();

// 执行最终的 Agent
Map<String, Object> finalItinerary = finalItineraryPlanner.invoke(
    Map.of("messages", "我想去一个美食多的城市，比如成都，预算比较充足")
).get().data();
```

通过这种声明式、可组合的方式，我们用 Flow 模式构建了一个复杂的、多步骤的、包含并行和智能路由的 AI 应用，而无需编写一行复杂的命令式控制代码。这就是 SAA Flow 模式的强大之处。
