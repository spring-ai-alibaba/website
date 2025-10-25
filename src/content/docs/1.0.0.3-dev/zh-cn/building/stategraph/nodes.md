---
title: 节点 (Node) 开发
description: 学习如何创建 StateGraph 中的基本工作单元——节点，包括自定义业务节点和 SAA 提供的强大 AI 节点。
---

在上一章《StateGraph 基础》中，我们了解了 `StateGraph` 的整体结构和生命周期。现在，我们将聚焦于构成这个图的最小、也是最核心的执行单元——**节点 (Node)**。

节点是您工作流中的具体“动作”或“步骤”。SAA Graph 的设计极其灵活，任何一段符合特定函数签名的代码，都可以被轻松地封装成一个节点。

## `NodeAction` 接口：节点的通用契约

在 SAA Graph 中，所有节点都遵循一个简单的函数契约：它们接收当前的 `OverAllState` 作为输入，并返回一个 `Map<String, Object>` 作为输出。这个 Map 中的键值对将会根据您在 `StateGraph` 中定义的 `KeyStrategy` 更新到 `OverAllState` 中。

这个契约由 `NodeAction` 接口定义，它是一个函数式接口：

```java
@FunctionalInterface
public interface NodeAction {
    Map<String, Object> apply(OverAllState state) throws Exception;
}
```

这意味着，任何 Lambda 表达式、方法引用或实现了 `apply` 方法的类，只要其签名与 `(OverAllState) -> Map<String, Object>` 匹配，都可以作为一个节点添加到您的 `StateGraph` 中。

## 创建自定义业务节点

掌握了 `NodeAction` 接口后，创建自定义节点就变得非常简单。您可以将任何业务逻辑封装成一个节点。

**示例**: 假设我们需要一个节点，用于从 `OverAllState` 中获取用户名和产品名，然后生成一个订单号。

### 1. 将业务逻辑封装成一个方法

首先，我们创建一个普通的 Java 类和方法来处理这个逻辑。

```java
import com.alibaba.cloud.ai.graph.OverAllState;

import java.util.Map;

public class OrderService {

    public Map<String, Object> generateOrderId(OverAllState state) {
        // 从 OverAllState 中安全地提取输入
        String userName = state.value("userName", String.class).orElse("UnknownUser");
        String productName = state.value("productName", String.class).orElse("UnknownProduct");

        // 执行业务逻辑
        String orderId = "ORD-" + userName.toUpperCase() + "-" + productName.hashCode() + "-" + System.currentTimeMillis();

        // 将结果以 Map 的形式返回
        return Map.of("orderId", orderId);
    }
}
```

### 2. 在 `StateGraph` 中注册为节点

然后，在构建 `StateGraph` 时，我们可以直接通过方法引用的方式将这个方法注册为一个节点。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Map;
import java.util.HashMap;

OrderService orderService = new OrderService();

// 创建状态策略工厂
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, com.alibaba.cloud.ai.graph.KeyStrategy> strategies = new HashMap<>();
    strategies.put("orderId", new ReplaceStrategy());
    return strategies;
};

StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("generate_order_id", orderService::generateOrderId)
    .addEdge(StateGraph.START, "generate_order_id");

// ... 编译和执行 ...
CompiledGraph compiledGraph = stateGraph.compile();
Map<String, Object> initialInput = Map.of(
    "userName", "Alice",
    "productName", "SuperWidget"
);
OverAllState finalState = compiledGraph.invoke(initialInput).get();

System.out.println("Generated Order ID: " + finalState.value("orderId", String.class).orElse(""));
```

## 预置的 AI 节点：`LlmNode` 与 `ToolNode`

除了自定义节点，SAA Graph 还提供了两个功能极其强大的预置节点，用于处理最常见的 AI 任务。使用它们可以极大地简化您的 Agent 开发。

### `LlmNode`: 与大语言模型对话

`LlmNode` 封装了与 Spring AI `ChatClient` 的所有交互细节。您只需通过其 `Builder` 提供 `ChatClient` 和一个提示词模板，就可以创建一个能够调用 LLM 的节点。

**核心配置**:
-   `.chatClient()`: 必需，提供用于与 LLM 通信的 `ChatClient` 实例。
-   `.systemPromptTemplate()` / `.userPromptTemplate()`: 系统和用户提示词模板。
-   `.messagesKey()`: 从 `OverAllState` 的哪个 key 读取输入的对话历史（默认为 `messages`）。
-   `.outputKey()`: 将 LLM 的回复写入到 `OverAllState` 的哪个 key（默认为 `messages`）。

**示例**:
```java
import com.alibaba.cloud.ai.graph.node.LlmNode;
import org.springframework.ai.chat.client.ChatClient;

// ...

ChatClient chatClient = ... // 从 Spring Context 获取 ChatClient

LlmNode llmNode = LlmNode.builder()
    .chatClient(chatClient)
    .systemPromptTemplate("根据以下信息写一个总结：{userInfo}")
    .messagesKey("userInfo") // 从 userInfo 这个 key 读取输入
    .outputKey("summary")    // 将结果写入 summary 这个 key
    .build();

stateGraph.addNode("summarizer", llmNode);
```

### `ToolNode`: 执行工具

`ToolNode` 封装了调用一个或多个 Spring AI `ToolCallback` 的逻辑。它会自动从 `OverAllState` 的上一轮 `AssistantMessage` 中解析出工具调用请求，执行它们，并将执行结果封装成 `ToolMessage` 返回。

**核心配置**:
-   `.toolCallbacks()`: 必需，一个 `List<ToolCallback>`，包含了所有可供此节点执行的工具。
-   `.messagesKey()`: 从 `OverAllState` 的哪个 key 读取包含工具调用请求的 `AssistantMessage`（默认为 `messages`）。
-   `.outputKey()`: 将包含工具执行结果的 `ToolMessage` 写入到 `OverAllState` 的哪个 key（默认为 `messages`）。

**示例**:
```java
import com.alibaba.cloud.ai.graph.node.ToolNode;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

// ...

// 假设 weatherTool 和 calculatorTool 是两个实现了 ToolCallback 的 Bean
ToolCallback weatherTool = ... 
ToolCallback calculatorTool = ...

ToolNode toolNode = ToolNode.builder()
    .toolCallbacks(List.of(weatherTool, calculatorTool))
    .build(); // 使用默认的 messages key

stateGraph.addNode("tool_executor", toolNode);
```

通过组合使用自定义业务节点以及强大的 `LlmNode` 和 `ToolNode`，您可以灵活地构建出任何复杂的、包含业务逻辑和 AI 能力的智能流程。在下一章，我们将学习如何使用“边”来将这些节点连接起来，实现真正的流程控制。
