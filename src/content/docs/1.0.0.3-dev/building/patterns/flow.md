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
    .subAgents(List.of(chooseCityAgent, findAttractionsAgent))
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
-   `SequentialAgent` 通过 `.subAgents()` 方法接收一个 `List<BaseAgent>`，并会严格按照列表的顺序执行。
-   **数据流转**: 通过为子 Agent 设置 `.inputKey()` 和 `.outputKey()`，我们构建了一条数据管道。`chooseCityAgent` 将结果写入 `"cityName"`，`findAttractionsAgent` 从 `"cityName"` 读取数据，实现了 Agent 间的自动数据传递。

## 2. 并行流 (`ParallelAgent`)

当多个任务之间没有依赖关系时，让它们并行执行可以大大缩短总耗时。

**场景**: 在确定了城市和景点后，规划师需要同时查询“**① 当地的天气**”和“**② 推荐的酒店**”。这两个任务可以并行进行。

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.ParallelAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;

// agent3: 查询天气
ReactAgent weatherAgent = ReactAgent.builder()
    .name("WeatherAgent")
    .description("查询指定城市的天气信息")
    .chatClient(chatClient)
    .inputKey("cityName")
    .outputKey("weatherInfo")
    .instruction("你是一个天气查询助手，根据城市名称提供天气信息。")
    .build();

// agent4: 查询酒店
ReactAgent hotelAgent = ReactAgent.builder()
    .name("HotelAgent")
    .description("查询指定城市的酒店推荐")
    .chatClient(chatClient)
    .inputKey("cityName")
    .outputKey("hotelInfo")
    .instruction("你是一个酒店推荐助手，根据城市名称推荐合适的酒店。")
    .build();

// 使用 ParallelAgent 并行执行
ParallelAgent searchParallel = ParallelAgent.builder()
    .name("SearchParallelFlow")
    .subAgents(List.of(weatherAgent, hotelAgent))
    .build();
    
// 执行并行流
try {
    Map<String, Object> parallelResult = searchParallel.invoke(
        Map.of("cityName", "杭州")
    ).get().data();

    // parallelResult 中将同时包含 weatherInfo 和 hotelInfo
    System.out.println(parallelResult.get("weatherInfo"));
    System.out.println(parallelResult.get("hotelInfo"));
} catch (GraphStateException | GraphRunnerException e) {
    e.printStackTrace();
}
```

**核心要点**:
-   **结果合并**: 默认情况下，`ParallelAgent` 会将所有子 Agent 的输出（根据它们各自的 `outputKey`）合并到一个 `Map` 中返回。
-   **MergeStrategy**: 您可以通过 `.mergeStrategy()` 方法指定不同的结果合并策略，例如 `ListMergeStrategy` (将所有结果合并成一个 List) 或 `ConcatenationMergeStrategy` (将所有字符串结果拼接起来)。
-   **约束**: 并行流中的所有子 Agent 必须拥有**唯一**的 `outputKey`，否则会因键冲突而出错。

## 3. 路由流 (`LlmRoutingAgent`)

路由流为确定性的工作流增加了一丝“智能”。它利用 LLM 的理解能力，在多个预设的分支中选择最合适的一个来执行。

**场景**: 我们的规划师需要根据用户的预算，决定是推荐“**① 经济型酒店**”还是“**② 豪华型酒店**”。

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.LlmRoutingAgent;
import org.springframework.ai.chat.model.ChatModel;

// agent5: 推荐经济型酒店
ReactAgent budgetHotelAgent = ReactAgent.builder()
    .name("BudgetHotelAgent")
    .description("为预算有限的旅客推荐经济实惠的酒店。") // 清晰的描述是路由判断的依据
    .chatClient(chatClient)
    .outputKey("hotelRecommendation")
    .instruction("你是一个经济型酒店推荐专家，专门为预算有限的旅客推荐性价比高的住宿。")
    .build();

// agent6: 推荐豪华型酒店
ReactAgent luxuryHotelAgent = ReactAgent.builder()
    .name("LuxuryHotelAgent")
    .description("为追求高端体验的旅客推荐豪华五星级酒店。") // 清晰的描述是路由判断的依据
    .chatClient(chatClient)
    .outputKey("hotelRecommendation")
    .instruction("你是一个豪华酒店推荐专家，专门为追求高端体验的旅客推荐五星级酒店。")
    .build();

// 使用 LlmRoutingAgent 进行智能路由
LlmRoutingAgent hotelRouter = LlmRoutingAgent.builder()
    .name("HotelRouter")
    .chatModel(chatModel) // 必须提供一个 ChatModel 用于决策
    .subAgents(List.of(budgetHotelAgent, luxuryHotelAgent))
    .build();

// 执行路由流
try {
    // 假设 userInput = "我的预算不多，帮我找个性价比高的酒店"
    String userInput = "我的预算不多，帮我找个性价比高的酒店";
    Map<String, Object> routingResult = hotelRouter.invoke(
        Map.of("messages", userInput)
    ).get().data();

    // LLM 会根据 userInput 和子 Agent 的 description，选择执行 budgetHotelAgent
    // routingResult 中会包含 hotelRecommendation 的结果
    System.out.println(routingResult.get("hotelRecommendation"));
} catch (GraphStateException | GraphRunnerException e) {
    e.printStackTrace();
}
```

**核心要点**:
-   **决策依据**: `LlmRoutingAgent` 将用户的输入和所有子 Agent 的 `.description()` 一起发送给 LLM，让 LLM 判断哪个子 Agent 的描述最符合用户的意图。因此，**为子 Agent 编写清晰、准确的 `description` 至关重要**。
-   **`chatModel`**: 必须通过 `.model()` 方法提供一个 `ChatModel` 实例，用于执行路由决策。

## 4. 循环流 (`LoopAgent`)

循环流让 Agent 能够执行重复性任务，是实现批处理、重试、迭代优化等高级功能的关键。

**场景**: 在生成了景点列表后，规划师需要“**为列表中的每一个景点，分别撰写一段详细的介绍**”。

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.LoopAgent;

// agent7: 为单个景点撰写介绍
ReactAgent attractionDescriberAgent = ReactAgent.builder()
    .name("AttractionDescriberAgent")
    .description("为单个景点撰写详细介绍")
    .chatClient(chatClient)
    .inputKey("attractionName")
    .outputKey("description")
    .instruction("你是一个导游，请为指定的景点写一段 100 字左右的生动介绍。")
    .build();

// 使用 LoopAgent 遍历景点列表
LoopAgent describeAllAttractions = LoopAgent.builder()
    .name("DescribeAllAttractionsLoop")
    .subAgents(List.of(attractionDescriberAgent)) // 定义循环体
    .loopMode(LoopAgent.LoopMode.JSON_ARRAY)    // 设置循环模式
    .inputKey("attractionsJson")                // 包含 JSON 数组的输入键
    .outputKey("allDescriptions")               // 收集所有循环结果的输出键
    .build();

// 执行循环流
try {
    String attractionsJson = "[\"西湖\", \"灵隐寺\", \"宋城\"]";
    Map<String, Object> loopResult = describeAllAttractions.invoke(
        Map.of("attractionsJson", attractionsJson)
    ).get().data();

    // loopResult.get("allDescriptions") 将会是一个包含三段景点介绍的 List
    System.out.println(loopResult.get("allDescriptions"));
} catch (GraphStateException | GraphRunnerException e) {
    e.printStackTrace();
}
```

**核心要点**:
-   **循环模式 (`.loopMode()`)**: `LoopAgent` 提供了多种强大的循环模式：
    -   `COUNT`: 按固定次数循环。
    -   `CONDITION`: 循环直到满足某个条件（通过 `.loopCondition()` 提供一个 `Predicate`）。非常适合实现“自我修正”：让一个 Agent 生成内容，另一个 Agent 评审，不满意就循环，直到评审通过。
    -   `ITERABLE`, `ARRAY`, `JSON_ARRAY`: 分别用于遍历 Java 集合、数组或 JSON 数组字符串。
-   **数据传递**: 在 `ITERABLE` 等模式下，`LoopAgent` 会将集合中的**每一个元素**依次放入一个临时的内部键中（默认为 `__iterator_item`），循环体内的子 Agent 通过 `.inputKey()` 从这个内部键读取数据。
-   **结果收集**: 循环体在每一次迭代中产生的输出，会被自动收集到一个 `List` 中，并最终放入您在 `.outputKey()` 中指定的键。

## 综合应用：打造完整的 AI 旅游规划师

现在，我们可以将以上所有模式组合起来，构建一个完整的、强大的旅游规划工作流：

```java
// 将所有子 Agent 实例化 (此处省略 builder 代码)
// ...

// ★ Step 1 & 2: 顺序流 - 先确定城市，再查景点
SequentialAgent planInitialIdeas = SequentialAgent.builder()
    .name("PlanInitialIdeasFlow")
    .subAgents(List.of(chooseCityAgent, findAttractionsAgent))
    .outputKey("initialPlan") // 将整个初步规划的结果输出
    .build();

// ★ Step 3: 循环流 - 为每个景点写介绍
LoopAgent describeAllAttractions = LoopAgent.builder()
    .name("DescribeAllAttractionsLoop")
    .subAgents(List.of(attractionDescriberAgent))
    .loopMode(LoopAgent.LoopMode.JSON_ARRAY)
    .inputKey("attractionsJson")
    .outputKey("allDescriptions")
    .build();

// ★ Step 4: 并行流 - 同时查天气和酒店
ParallelAgent searchParallel = ParallelAgent.builder()
    .name("SearchParallelFlow")
    .subAgents(List.of(weatherAgent, hotelRouter)) // hotelRouter 本身是一个路由流
    .outputKey("searchResult")
    .build();

// ★ Step 5: 最终的顺序总装流
SequentialAgent finalItineraryPlanner = SequentialAgent.builder()
    .name("FinalItineraryPlanner")
    .subAgents(List.of(
        planInitialIdeas, 
        describeAllAttractions, 
        searchParallel, 
        finalSummaryAgent // 最后一个 Agent，用于汇总所有信息生成最终报告
    ))
    .build();

// 执行最终的 Agent
Map<String, Object> finalItinerary = finalItineraryPlanner.invoke(
    Map.of("messages", "我想去一个美食多的城市，比如成都，预算比较充足")
).get().data();
```

通过这种声明式、可组合的方式，我们用 Flow 模式构建了一个复杂的、多步骤的、包含并行和智能路由的 AI 应用，而无需编写一行复杂的命令式控制代码。这就是 SAA Flow 模式的强大之处。
