---
title: 边 (Edge) 与路由
description: 学习如何使用边来连接 StateGraph 中的节点，并通过条件路由实现复杂的、动态的智能流程控制。
---

在前面的章节中，我们已经学会了如何创建 `StateGraph` 的“点”（节点）。现在，我们将学习如何用“线”（边）将这些点连接起来，从而定义工作流的执行顺序和逻辑分支。

“边”决定了在一个节点执行完毕后，流程应该走向何方。SAA Graph 提供了两种定义边的方式：**顺序边**和**条件边**，它们共同构成了 `StateGraph` 强大的路由能力。

## 入口与出口：`START` 和 `END`

在定义边之前，我们需要了解两个特殊的字符串常量，它们是每个图的逻辑起点和终点：
-   `StateGraph.START`: 这是一个特殊的源节点名，代表工作流的入口。您创建的第一条边通常都是从 `START` 开始的。
-   `StateGraph.END`: 这是一个特殊的目标节点名。当流程被导向 `END` 时，整个图的本次执行就宣告结束。

## `addEdge`: 创建顺序边

`addEdge` 是创建边的最基本方式。它会在两个节点之间建立一条**无条件的、确定性的连接**。当源节点执行完毕后，流程总是会流向目标节点。这对于构建线性的、一步接一步的工作流非常有用。

**语法**:
```java
stateGraph.addEdge(String sourceNodeName, String targetNodeName);
```

**示例**:
在《StateGraph 基础》中，我们已经见过它的用法：
```java
// 定义流程：START -> greeter -> exclaimer -> END
stateGraph.addEdge(StateGraph.START, "greeter");
stateGraph.addEdge("greeter", "exclaimer");
stateGraph.addEdge("exclaimer", StateGraph.END);
```
这个定义创建了一个简单的顺序流程，执行路径是固定不变的。

## `addConditionalEdges`: 实现智能路由

`addConditionalEdges` 是 `StateGraph` 最强大的功能之一，它允许您实现**动态的、基于当前状态的条件路由**。这正是构建“智能”流程的关键所在。

与 `addEdge` 不同，`addConditionalEdges` 不是连接到一个固定的目标节点，而是连接到一个**路由函数** (`EdgeAction`)。这个函数会在源节点执行完毕后被调用，它负责检查当前的 `OverAllState`，并以编程方式返回一个字符串，这个字符串就是下一个目标节点的名称。

**`EdgeAction` 接口**:
```java
@FunctionalInterface
public interface EdgeAction {
    String apply(OverAllState state) throws Exception;
}
```

**语法**:
```java
stateGraph.addConditionalEdges(
    String sourceNodeName, 
    EdgeAction routingFunction,
    Map<String, String> targetNodeMap
);
```
-   `sourceNodeName`: 源节点的名称。
-   `routingFunction`: 路由函数。它接收 `OverAllState`，返回一个 key。
-   `targetNodeMap`: 一个 `Map<String, String>`，用于将路由函数返回的 key 映射到实际的目标节点名称。

**示例**: 构建一个 ReAct Agent 的核心逻辑

一个基本的 ReAct Agent 的逻辑可以被描述为：
1.  **Agent (LLM)** 进行思考。
2.  **检查思考结果**：
    *   如果结果中包含工具调用，则下一步去执行**工具 (Tool)**。
    *   如果结果中不包含工具调用（意味着是最终答案），则**结束 (END)**。
3.  **工具**执行完毕后，返回**Agent**，让其根据工具结果进行下一步思考。

下面我们用 `addConditionalEdges` 来实现这个逻辑：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.node.LlmNode;
import com.alibaba.cloud.ai.graph.node.ToolNode;
import com.alibaba.cloud.ai.graph.action.AsyncEdgeAction;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

// ... 假设 llmNode 和 toolNode 已创建 ...
LlmNode agentNode = ...
ToolNode toolNode = ...

// 创建状态策略工厂
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, com.alibaba.cloud.ai.graph.KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", new AppendStrategy());
    return strategies;
};

StateGraph reactGraph = new StateGraph(keyStrategyFactory)
    .addNode("agent", agentNode)
    .addNode("tool", toolNode);

// 1. 从 START 开始，总是先进入 agent 节点
reactGraph.addEdge(StateGraph.START, "agent");

// 2. tool 节点执行完后，总是返回 agent 节点
reactGraph.addEdge("tool", "agent");

// 3. agent 节点执行完后，进入条件路由
reactGraph.addConditionalEdges(
    "agent", // 源节点
    edge_async((state) -> { // 路由函数
        // 从状态中获取最后一轮的 AssistantMessage
        AssistantMessage lastMessage = state.value("messages", List.class)
            .map(messages -> (List<Message>) messages)
            .map(messages -> (AssistantMessage) messages.get(messages.size() - 1))
            .orElseThrow();

        // 检查是否包含工具调用
        if (lastMessage.getToolCalls() != null && !lastMessage.getToolCalls().isEmpty()) {
            // 如果有，则返回 "continue" 这个 key
            return "continue";
        } else {
            // 如果没有，则返回 "end" 这个 key
            return "end";
        }
    }),
    // 路由 key 到目标节点的映射
    Map.of(
        "continue", "tool", // "continue" key 映射到 "tool" 节点
        "end", StateGraph.END // "end" key 映射到 END，结束流程
    )
);

// ... 编译和执行 ...
```
在这个例子中，`addConditionalEdges` 赋予了我们的图大脑。它不再是僵化的线性流程，而是能够根据 LLM 的输出动态地决定是继续调用工具循环，还是将最终答案输出并结束流程。这正是所有高级 Agent 模式（如 ReAct, Flow, Reflect）的实现基础。

通过组合使用顺序边和条件边，您可以构建出任意复杂的、能够适应不同情况的智能工作流。
