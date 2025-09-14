---
title: ReAct 模式
description: 深入了解并定制化 SAA 中的 ReAct 智能体。
---

在【快速入门】中，我们已经初步体验了 `ReactAgent` 的强大功能。`ReactAgent` 是 SAA 中对业界流行的 **ReAct (Reasoning and Acting)** 思想的核心实现。它通过“**思考 -> 行动**”的循环，让大模型能够像人一样，自主地规划步骤、使用工具，并最终得出结论。

本章节将深入 `ReactAgent` 的内部机制，向您展示如何通过其丰富的 `Builder` API 进行深度定制，以满足更复杂的业务需求。

## ReAct 的工作流程

在深入 API 之前，我们先简单回顾一下 `ReactAgent` 的内部工作流，这有助于您更好地理解各个定制化选项的作用。当您调用 `reactAgent.invoke()` 时，内部会发生以下步骤：

1.  **思考 (Reasoning)**: 大模型接收到您的初始问题后，会进行第一轮“思考”。它会分析问题，并判断是应该直接回答，还是需要借助工具来获取额外信息。
2.  **行动 (Acting)**: 如果大模型认为需要使用工具，它会生成一个或多个“工具调用”（Tool Call）请求。SAA 框架会解析这些请求，并执行您提供的相应工具函数。
3.  **观察 (Observation)**: 工具执行的结果会被返回给大模型。
4.  **再次思考**: 大模型“观察”到工具的结果后，会结合原始问题和新信息，进行新一轮的“思考”。
5.  **循环或结束**: 如果此时信息足够得出最终答案，大模型就会生成最终回复；如果信息依然不足，它会重复第 2-4 步，进行新一轮的工具调用。这个循环会持续进行，直到问题被解决或达到最大迭代次数。

理解了这个流程后，我们来看看如何通过代码来影响和控制这个流程。

## `ReactAgent.Builder` 详解

所有 `ReactAgent` 的定制化都是通过其 `Builder` 完成的。我们在【快速入门】中已经使用了其中最核心的几个方法，现在我们来探索更多高级选项。

### 1. 核心构造参数

这部分是构建一个 `ReactAgent` 的基础。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

// ...
List<ToolCallback> toolCallbacks = ...;
ChatClient chatClient = ...;

ReactAgent agent = ReactAgent.builder()
    // 必需：用于与 LLM 交互的客户端
    .chatClient(chatClient) 
    // 必需：Agent 可以使用的工具列表
    .tools(toolCallbacks) 
    // 可选：Agent 的名称
    .name("MyAdvancedAgent")
    // 可选：Agent 功能的简短描述
    .description("An agent that can do X and Y.") 
    // 可选：给 Agent 的系统级指令 (System Prompt)
    .instruction("You are a helpful assistant. Use tools to answer questions.") 
    .build();
```

### 2. 控制执行流程

您可以精细地控制 ReAct 的循环过程。

-   `.maxIterations(int maxIterations)`: 设置“思考->行动”循环的最大次数。这非常重要，可以防止 Agent 陷入无限循环或执行过多昂贵的工具调用，从而控制成本和执行时间。默认值为 10。

```java
ReactAgent agent = ReactAgent.builder()
    .chatClient(chatClient)
    .tools(toolCallbacks)
    // 最多只进行 3 轮工具调用
    .maxIterations(3) 
    .build();
```

### 3. 生命周期钩子 (Lifecycle Hooks)

这是 `ReactAgent` 最强大的定制化功能之一。您可以在 ReAct 流程的关键节点注入自己的业务逻辑，而无需修改 Agent 的核心代码。所有钩子都是一个 `NodeAction`，它是一个函数式接口，接收当前的 `OverAllState` 并返回一个 `Map` 来更新状态。

-   `.preLlmHook(NodeAction hook)`: 在**每次**调用大模型进行“思考”**之前**执行。您可以在这里修改即将发送给 LLM 的 `messages`。
-   `.postLlmHook(NodeAction hook)`: 在**每次**调用大模型“思考”完成**之后**执行。您可以在这里检查 LLM 的回复，例如进行内容审查或记录日志。
-   `.preToolHook(NodeAction hook)`: 在框架**准备**执行工具调用**之前**执行。您可以访问到 LLM 生成的工具调用请求。
-   `.postToolHook(NodeAction hook)`: 在所有工具调用**执行完毕之后**执行。您可以访问到所有工具的返回结果。

#### 示例：使用钩子记录 Agent 的思考过程

让我们通过一个例子，来为我们的天气智能体增加日志记录功能。我们希望在每次它决定调用工具时，都能在控制台打印出它想调用哪个工具以及参数是什么。

```java
package com.example.saademo.agent;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class AdvancedAgentService {

    private static final Logger logger = LoggerFactory.getLogger(AdvancedAgentService.class);
    private final ReactAgent weatherAgent;

    public AdvancedAgentService(ChatClient.Builder chatClientBuilder, List<ToolCallback> toolCallbacks) throws GraphStateException {
        ChatClient chatClient = chatClientBuilder.build();

        // 定义一个工具调用前的钩子
        NodeAction logToolCallHook = (state) -> {
            // 从状态中获取消息列表
            List<Message> messages = state.value("messages", List.class).orElse(Collections.emptyList());
            if (!messages.isEmpty()) {
                Message lastMessage = messages.get(messages.size() - 1);
                // 检查最后一条消息是否是带有工具调用的助手消息
                if (lastMessage instanceof AssistantMessage assistantMessage && assistantMessage.hasToolCalls()) {
                    logger.info("Agent is about to call tools: {}", assistantMessage.getToolCalls());
                }
            }
            // 钩子必须返回一个 Map，如果没有状态更新，则返回空 Map
            return Collections.emptyMap();
        };

        this.weatherAgent = ReactAgent.builder()
                .chatClient(chatClient)
                .tools(toolCallbacks)
                .instruction("你是一个天气查询助手。")
                // 注册我们的日志钩子
                .preToolHook(logToolCallHook)
                .build();
    }
    
    // ... chat 方法 ...
}
```

现在，当您再次运行应用并调用天气查询接口时，您将会在应用的控制台日志中看到类似下面的输出，这清晰地展示了 Agent 的“思考”过程：

```
INFO com.example.saademo.agent.AdvancedAgentService : Agent is about to call tools: [ToolCall[id='...', name='weatherFunction', arguments='{"city":"北京"}']]
```

通过这种方式，您可以轻松地为 Agent 增加日志、审计、权限校验等各种横切功能。

### 4. 自定义输入与输出 (Input & Output Keys)

在默认情况下，`ReactAgent` 期望的输入和产生的输出都存放在 `OverAllState` 的 `"messages"` 键中。但在更复杂的 `StateGraph` 工作流中，您可能需要将 `ReactAgent` 作为一个子图节点，接收来自其他节点的特定输入，并将其结果输出到特定键上。

-   `.inputKey(String key)`: 指定从 `OverAllState` 的哪个键读取输入消息列表。默认为 `"messages"`。
-   `.outputKey(String key)`: 指定将包含最终回复的消息列表写入到 `OverAllState` 的哪个键。默认为 `"messages"`。

这些高级选项的用法将在【底层核心：StateGraph】章节中结合实际的工作流编排例子进行详细介绍。
