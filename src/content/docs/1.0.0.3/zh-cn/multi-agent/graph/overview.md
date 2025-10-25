---
title: Graph 概览
keywords: ["Spring AI Alibaba", "Graph", "StateGraph", "多智能体", "工作流"]
description: "深入了解 Spring AI Alibaba Graph 框架的核心概念，包括 StateGraph、Node、Edge、CompiledGraph 等基础组件。"
---

## 概述

Spring AI Alibaba Graph 是一款面向 Java 开发者的**状态图工作流框架**，专为构建复杂的多步骤 AI 应用而设计。它将应用逻辑建模为**状态图（StateGraph）**，其中每个节点代表一个计算步骤，边定义了状态之间的转换。

### 为什么需要 Graph 框架？

在构建复杂的 AI 应用时，我们经常遇到以下挑战：

1. **复杂的控制流**：需要根据中间结果动态决定下一步操作
2. **状态管理**：多个步骤之间需要共享和传递复杂的状态信息
3. **并行处理**：某些任务可以并行执行以提高效率
4. **错误恢复**：需要在执行失败时能够从检查点恢复
5. **人机协作**：在关键决策点需要人工干预
6. **可观测性**：需要监控和调试复杂的执行流程

传统的链式调用（如 LangChain 的 Chain）虽然简单易用，但在处理复杂的控制流时显得力不从心。Graph 框架通过以下方式解决了这些问题：

### 核心特性

- **状态驱动的架构**：通过共享状态在节点间传递数据，避免了复杂的参数传递
- **灵活的控制流**：支持条件分支、循环和动态路由，能够处理复杂的业务逻辑
- **原生并行支持**：多个节点可以并行执行，显著提高处理效率
- **持久化和恢复**：支持检查点机制，可以在任意点暂停和恢复执行
- **人机协作**：内置中断机制，支持在关键点进行人工干预
- **强大的可观测性**：提供详细的执行监控、可视化和调试能力
- **Spring 生态集成**：完全集成 Spring Boot，支持依赖注入和配置管理

### 适用场景

Graph 框架特别适合以下场景：

- **多步骤数据处理管道**：需要多个步骤协作完成的数据处理任务
- **智能决策系统**：根据中间结果动态调整执行路径的决策系统
- **复杂的 AI 工作流**：涉及多个 AI 模型协作的复杂应用
- **人机协作流程**：需要在关键点进行人工审核或干预的业务流程
- **长时间运行的任务**：需要支持中断和恢复的长时间运行任务

与传统的链式调用相比，Graph 框架能够处理更复杂的控制流，包括循环、条件分支和并行执行，使其成为构建复杂 AI 工作流的理想选择。

## 核心概念

### 1. StateGraph（状态图）

StateGraph 是定义工作流的核心类，它将应用逻辑表示为一个有向图：

- **节点（Nodes）**：代表计算步骤，可以是 LLM 调用、工具执行或任何自定义逻辑
- **边（Edges）**：定义节点之间的转换，可以是无条件的或基于状态的条件转换
- **状态（State）**：在整个图执行过程中共享的数据结构
- **入口和出口**：使用 `START` 和 `END` 常量定义图的开始和结束

```java
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

StateGraph workflow = new StateGraph(keyStrategyFactory)
    .addNode("classifier", node_async(classifierAction))
    .addNode("processor", node_async(processorAction))
    .addNode("recorder", node_async(recorderAction))

    .addEdge(START, "classifier")
    .addConditionalEdges("classifier", edge_async(routingLogic), Map.of(
        "positive", "recorder",
        "negative", "processor"
    ))
    .addEdge("processor", "recorder")
    .addEdge("recorder", END);
```

### 2. Node（节点）

节点是图中的计算单元，代表工作流中的一个具体步骤。每个节点接收当前状态作为输入，执行某些操作，然后返回状态更新。这种设计使得节点具有以下特点：

#### 节点的特性

- **无状态设计**：节点本身不保存状态，所有数据都通过状态对象传递
- **纯函数特性**：相同的输入总是产生相同的输出，便于测试和调试
- **异步执行**：支持异步操作，不会阻塞整个工作流
- **错误隔离**：单个节点的错误不会影响其他节点

#### 节点类型

根据功能不同，节点可以分为以下几类：

- **LLM 节点**：调用大语言模型进行推理、生成、分类等操作
- **工具节点**：执行外部工具、API 调用或系统集成
- **条件节点**：基于状态进行决策，通常与条件边配合使用
- **数据处理节点**：转换、聚合或验证数据
- **人工节点**：需要人工干预的节点，用于人机协作场景

#### 节点实现

Spring AI Alibaba Graph 提供了两种节点接口：

1. **NodeAction**：同步节点接口，适用于简单的计算操作
2. **AsyncNodeAction**：异步节点接口，适用于 I/O 密集型操作

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.action.AsyncNodeAction;

// 同步节点示例
NodeAction classifierAction = state -> {
    String input = state.value("input", String.class).orElse("");

    // 调用 LLM 进行分类
    String classification = chatClient.prompt()
        .user("请对以下文本进行情感分类（positive/negative）：" + input)
        .call()
        .content();

    // 返回状态更新
    return Map.of("classification", classification.toLowerCase().trim());
};

// 异步节点示例
AsyncNodeAction asyncProcessorAction = state -> {
    return CompletableFuture.supplyAsync(() -> {
        // 执行耗时操作
        String result = performLongRunningOperation(state);
        return Map.of("result", result);
    });
};

// 将同步动作转换为异步节点（推荐方式）
.addNode("classifier", node_async(classifierAction))

// 直接使用异步节点
.addNode("processor", asyncProcessorAction)
```

#### 节点缓存

Spring AI Alibaba Graph 支持基于节点输入的任务/节点缓存。要使用缓存：

- 在编译图时指定缓存
- 为节点指定缓存策略。每个缓存策略支持：
  - `keyFunction`：用于基于节点输入生成缓存键，默认为输入的哈希值
  - `ttl`：缓存的生存时间（秒）。如果未指定，缓存永不过期

```java
import com.alibaba.cloud.ai.graph.cache.InMemoryCache;
import com.alibaba.cloud.ai.graph.cache.CachePolicy;

// 定义昂贵的计算节点
NodeAction expensiveAction = state -> {
    // 模拟昂贵的计算
    try {
        Thread.sleep(2000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }

    Integer x = state.value("x", Integer.class).orElse(0);
    return Map.of("result", x * 2);
};

// 构建带缓存的图
StateGraph workflow = new StateGraph(keyStrategyFactory)
    .addNode("expensive_node", node_async(expensiveAction),
             CachePolicy.builder().ttl(Duration.ofSeconds(3)).build())
    .addEdge(START, "expensive_node")
    .addEdge("expensive_node", END);

// 编译时指定缓存
CompiledGraph app = workflow.compile(CompileConfig.builder()
    .cache(new InMemoryCache())
    .build());

// 第一次运行需要 2 秒
app.invoke(Map.of("x", 5));

// 第二次运行使用缓存，立即返回
app.invoke(Map.of("x", 5));
```

#### 运行时上下文

创建图时，您可以指定运行时上下文模式，用于传递给节点的运行时上下文。这对于传递不属于图状态的信息很有用，例如模型名称或数据库连接等依赖项。

```java
@Component
public class ContextAwareGraph {

    // 定义上下文模式
    public static class RuntimeContext {
        private String llmProvider = "qwen";
        private String userId;

        // getters and setters
    }

    // 使用上下文的节点
    NodeAction contextAwareAction = (state, context) -> {
        RuntimeContext ctx = (RuntimeContext) context;
        String provider = ctx.getLlmProvider();
        String userId = ctx.getUserId();

        // 根据上下文选择不同的处理逻辑
        String result = processWithProvider(state, provider, userId);

        return Map.of("result", result);
    };
}
```

#### 节点最佳实践

- **保持简单**：每个节点应该专注于一个明确的任务
- **错误处理**：在节点内部处理可预期的错误，返回错误状态而不是抛出异常
- **幂等性**：确保节点可以安全地重复执行
- **性能考虑**：对于 I/O 密集型操作，使用异步节点以提高并发性
- **缓存策略**：对于计算密集型节点，考虑使用缓存
- **上下文使用**：合理利用运行时上下文传递依赖信息

### 3. Edge（边）

边定义了节点之间的转换逻辑。Spring AI Alibaba Graph 支持两种类型的边：

#### 普通边（Normal Edges）
普通边定义了无条件的转换，总是从一个节点转到另一个节点：

```java
// 从 START 到第一个节点
.addEdge(START, "first_node")

// 从一个节点到另一个节点
.addEdge("node_a", "node_b")

// 从节点到 END
.addEdge("final_node", END)
```

#### 条件边（Conditional Edges）
条件边根据当前状态动态决定下一个节点：

```java
import com.alibaba.cloud.ai.graph.action.EdgeAction;

// 定义路由逻辑
EdgeAction routingLogic = state -> {
    String classification = (String) state.value("classification").orElse("");
    return classification.equals("positive") ? "positive_handler" : "negative_handler";
};

// 添加条件边
.addConditionalEdges("classifier", edge_async(routingLogic), Map.of(
    "positive_handler", "positive_handler",
    "negative_handler", "negative_handler"
))
```

#### 条件入口点

条件入口点让您可以根据自定义逻辑从不同节点开始。您可以从虚拟的 `START` 节点使用 `addConditionalEdges`：

```java
// 定义入口路由逻辑
EdgeAction entryRoutingLogic = state -> {
    String userType = (String) state.value("user_type").orElse("guest");
    return userType.equals("admin") ? "admin_handler" : "user_handler";
};

// 添加条件入口点
.addConditionalEdges(START, edge_async(entryRoutingLogic), Map.of(
    "admin_handler", "admin_handler",
    "user_handler", "user_handler"
))
```

#### Send 对象

默认情况下，节点和边是预先定义的，并在相同的共享状态上操作。但是，在某些情况下，确切的边可能事先不知道，和/或您可能希望同时存在不同版本的状态。一个常见的例子是 map-reduce 设计模式。在这种设计模式中，第一个节点可能生成对象列表，您可能希望将其他节点应用于所有这些对象。对象的数量可能事先未知（意味着边的数量可能未知），下游节点的输入状态应该不同（每个生成的对象一个）。

为了支持这种设计模式，Spring AI Alibaba Graph 支持从条件边返回 `Send` 对象。`Send` 接受两个参数：第一个是节点的名称，第二个是要传递给该节点的状态。

```java
import com.alibaba.cloud.ai.graph.Send;

// 定义 map-reduce 路由逻辑
EdgeAction mapReduceRouting = state -> {
    List<String> subjects = state.value("subjects", List.class).orElse(new ArrayList<>());

    // 为每个主题创建一个 Send 对象
    return subjects.stream()
        .map(subject -> new Send("generate_joke", Map.of("subject", subject)))
        .collect(Collectors.toList());
};

// 添加 map-reduce 条件边
.addConditionalEdges("node_a", edge_async(mapReduceRouting))
```

#### Command 对象

结合控制流（边）和状态更新（节点）可能很有用。例如，您可能希望在同一个节点中既执行状态更新又决定下一个要去的节点。Spring AI Alibaba Graph 通过从节点函数返回 `Command` 对象提供了这样做的方法：

```java
import com.alibaba.cloud.ai.graph.Command;

// 结合状态更新和控制流的节点
NodeAction commandNode = state -> {
    // 执行业务逻辑
    String foo = state.value("foo", String.class).orElse("");

    if ("bar".equals(foo)) {
        // 既更新状态又指定下一个节点
        return Command.builder()
            .update(Map.of("foo", "baz"))
            .goto("my_other_node")
            .build();
    } else {
        // 只更新状态，使用默认路由
        return Command.builder()
            .update(Map.of("foo", "updated"))
            .build();
    }
};
```

#### 何时使用 Command 而不是条件边？

- 当您需要**既**更新图状态**又**路由到不同节点时，使用 `Command`。例如，在实现多智能体切换时，重要的是路由到不同的智能体并向该智能体传递一些信息。
- 使用条件边在不更新状态的情况下有条件地在节点之间路由。

#### 在父图中导航到节点

如果您使用子图，您可能希望从子图内的节点导航到不同的子图（即父图中的不同节点）。为此，您可以在 `Command` 中指定 `graph=Command.PARENT`：

```java
NodeAction parentNavigationNode = state -> {
    return Command.builder()
        .update(Map.of("foo", "bar"))
        .goto("other_subgraph")  // 父图中的节点
        .graph(Command.PARENT)
        .build();
};
```

#### 在工具内部使用

一个常见的用例是从工具内部更新图状态。例如，在客户支持应用程序中，您可能希望在对话开始时根据客户的账号或 ID 查找客户信息。

#### 人机协作

`Command` 是人机协作工作流的重要组成部分：当使用 `interrupt()` 收集用户输入时，然后使用 `Command` 提供输入并通过 `Command.resume("用户输入")` 恢复执行。
```
```

### 4. OverAllState（全局状态）

OverAllState 是 Spring AI Alibaba Graph 的核心概念之一，它是在整个图执行过程中共享的状态对象。与传统的参数传递方式不同，状态对象提供了一种更加灵活和强大的数据管理方式。

#### 状态的核心特性

- **全局共享**：所有节点都可以访问和修改状态，实现数据的全局共享
- **类型安全**：支持泛型访问，在编译时就能发现类型错误
- **策略驱动**：每个键可以配置不同的更新策略，控制数据如何合并
- **序列化支持**：支持状态的持久化和恢复，实现检查点功能
- **线程安全**：内置并发控制，支持多线程安全访问
- **版本管理**：支持状态的版本控制，便于调试和回滚

#### Reducers（状态更新策略）

Reducers 是理解节点更新如何应用到状态的关键。状态中的每个键都有自己独立的 reducer 函数。如果没有明确指定 reducer 函数，则假定对该键的所有更新都应该覆盖它。

#### 默认 Reducer

Spring AI Alibaba Graph 提供了多种状态更新策略：

1. **REPLACE（替换）**：新值完全替换旧值，适用于单一值的更新（默认行为）
2. **APPEND（追加）**：新值追加到现有列表中，适用于消息、日志等场景
3. **MERGE（合并）**：将新的 Map 与现有 Map 合并，适用于复杂对象的部分更新

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;

// 示例 A：默认 Reducer（全部使用 REPLACE）
KeyStrategyFactory defaultFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("foo", KeyStrategy.REPLACE);
    strategies.put("bar", KeyStrategy.REPLACE);
    return strategies;
};

// 假设输入状态为 {"foo": 1, "bar": ["hi"]}
// 第一个节点返回 {"foo": 2}，状态变为 {"foo": 2, "bar": ["hi"]}
// 第二个节点返回 {"bar": ["bye"]}，状态变为 {"foo": 2, "bar": ["bye"]}

// 示例 B：混合 Reducer
KeyStrategyFactory mixedFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("foo", KeyStrategy.REPLACE);
    strategies.put("bar", KeyStrategy.APPEND);  // 使用追加策略
    return strategies;
};

// 假设输入状态为 {"foo": 1, "bar": ["hi"]}
// 第一个节点返回 {"foo": 2}，状态变为 {"foo": 2, "bar": ["hi"]}
// 第二个节点返回 {"bar": ["bye"]}，状态变为 {"foo": 2, "bar": ["hi", "bye"]}
```

#### 在图状态中使用消息

##### 为什么使用消息？

大多数现代 LLM 提供商都有一个聊天模型接口，接受消息列表作为输入。Spring AI 的 `ChatClient` 特别接受 `Message` 对象列表作为输入。这些消息有多种形式，如 `UserMessage`（用户输入）或 `AssistantMessage`（LLM 响应）。

##### 在图中使用消息

在许多情况下，将先前的对话历史作为消息列表存储在图状态中是有帮助的。为此，我们可以向图状态添加一个存储 `Message` 对象列表的键（通道），并使用 reducer 函数对其进行注释。reducer 函数对于告诉图如何在每次状态更新时更新状态中的 `Message` 对象列表至关重要。

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;

// 定义包含消息的状态策略
KeyStrategyFactory messageStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // 基础数据使用替换策略
    strategies.put("input", KeyStrategy.REPLACE);
    strategies.put("user_id", KeyStrategy.REPLACE);

    // 消息使用追加策略，支持消息历史
    strategies.put("messages", KeyStrategy.APPEND);

    // 其他数据
    strategies.put("analysis_results", KeyStrategy.MERGE);

    return strategies;
};

// 在节点中处理消息
NodeAction messageProcessingAction = state -> {
    // 读取现有消息
    List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
    String input = state.value("input", String.class).orElse("");

    // 添加用户消息
    UserMessage userMessage = new UserMessage(input);

    // 调用 LLM
    String response = chatClient.prompt()
        .messages(messages)
        .user(input)
        .call()
        .content();

    // 创建助手消息
    AssistantMessage assistantMessage = new AssistantMessage(response);

    // 返回状态更新（消息会被追加到现有列表）
    return Map.of(
        "messages", List.of(userMessage, assistantMessage),
        "last_response", response
    );
};
```

#### 多种状态模式

通常，所有图节点都使用单一模式进行通信。这意味着它们将读取和写入相同的状态通道。但是，在某些情况下我们希望对此有更多控制：

- 内部节点可以传递图的输入/输出中不需要的信息
- 我们可能还希望为图使用不同的输入/输出模式

```java
// 定义不同的状态类
public class InputState {
    private String userInput;
    // getters and setters
}

public class OutputState {
    private String graphOutput;
    // getters and setters
}

public class OverallState {
    private String foo;
    private String userInput;
    private String graphOutput;
    // getters and setters
}

public class PrivateState {
    private String bar;
    // getters and setters
}

// 节点可以读取和写入不同的状态模式
NodeAction node1 = (state) -> {
    // 从 InputState 读取，写入 OverallState
    String userInput = ((InputState) state).getUserInput();
    return Map.of("foo", userInput + " name");
};

NodeAction node2 = (state) -> {
    // 从 OverallState 读取，写入 PrivateState
    String foo = ((OverallState) state).getFoo();
    return Map.of("bar", foo + " is");
};

NodeAction node3 = (state) -> {
    // 从 PrivateState 读取，写入 OutputState
    String bar = ((PrivateState) state).getBar();
    return Map.of("graphOutput", bar + " Lance");
};
```

#### 状态设计最佳实践

1. **合理的键命名**：使用清晰、一致的键名，避免冲突
2. **策略选择**：根据数据特性选择合适的更新策略
3. **数据分层**：区分临时数据、中间结果和最终输出
4. **消息管理**：对于聊天应用，合理使用消息追加策略
5. **模式设计**：根据需要使用不同的输入/输出模式
6. **大小控制**：避免在状态中存储过大的对象，考虑使用引用
7. **版本兼容**：考虑状态结构的向后兼容性

### 5. CompiledGraph（已编译图）

CompiledGraph 是 StateGraph 编译后的可执行版本，它是图的运行时表示。编译过程会对图进行验证、优化，并生成高效的执行计划。

#### 编译过程

编译过程包括以下步骤：

1. **图结构验证**：检查图的完整性，确保没有孤立节点或无效边
2. **拓扑排序**：分析节点依赖关系，确定执行顺序
3. **并行优化**：识别可以并行执行的节点，生成并行执行计划
4. **资源分配**：为执行分配必要的资源和线程池
5. **监控注入**：注入监控和观测代码

#### 执行模式

CompiledGraph 支持多种执行模式：

1. **同步执行（invoke）**：阻塞执行，等待完整结果
2. **流式执行（stream）**：实时返回中间结果，支持响应式编程
3. **异步执行**：非阻塞执行，返回 Future 对象

#### 高级特性

- **检查点支持**：可以在任意节点保存状态，支持中断和恢复
- **中断机制**：支持在指定节点前后中断执行，实现人机协作
- **错误恢复**：支持从失败点重新开始执行
- **性能监控**：内置性能指标收集和监控
- **可视化支持**：生成图的可视化表示，便于调试

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.CompileConfig;

// 基础编译
CompiledGraph app = workflow.compile();

// 带配置的编译
CompileConfig config = CompileConfig.builder()
    .interruptBefore("human_review")           // 在人工审核前中断
    .interruptAfter("critical_decision")       // 在关键决策后中断
    .withLifecycleListener(lifecycleListener)  // 添加生命周期监听器
    .build();

CompiledGraph advancedApp = workflow.compile(config);

// 同步执行 - 等待完整结果
Optional<OverAllState> result = app.invoke(Map.of("input", "用户输入"));
if (result.isPresent()) {
    String output = result.get().value("final_result", String.class).orElse("");
    System.out.println("最终结果: " + output);
}

// 流式执行 - 实时获取中间结果
app.stream(Map.of("input", "用户输入"))
   .subscribe(nodeOutput -> {
       System.out.println("节点 '" + nodeOutput.nodeId() + "' 执行完成");
       System.out.println("执行时间: " + nodeOutput.executionTime() + "ms");
       System.out.println("当前状态: " + nodeOutput.state().data());

       // 可以根据节点类型进行特殊处理
       if ("critical_node".equals(nodeOutput.nodeId())) {
           // 处理关键节点的输出
           handleCriticalNodeOutput(nodeOutput);
       }
   });

// 异步执行
CompletableFuture<Optional<OverAllState>> futureResult =
    CompletableFuture.supplyAsync(() -> app.invoke(Map.of("input", "用户输入")));
```

#### 递归限制

递归限制设置图在单次执行期间可以执行的最大超级步数。一旦达到限制，Spring AI Alibaba Graph 将抛出 `GraphRecursionException`。默认情况下，此值设置为 25 步。递归限制可以在运行时在任何图上设置，并通过配置传递给 `.invoke`/`.stream`：

```java
// 设置递归限制
app.invoke(Map.of("input", "用户输入"),
          InvokeConfig.builder().recursionLimit(5).build());
```

#### 图迁移

Spring AI Alibaba Graph 可以轻松处理图定义（节点、边和状态）的迁移，即使在使用检查点器跟踪状态时也是如此：

- 对于图末尾的线程（即未中断），您可以更改图的整个拓扑（即所有节点和边，删除、添加、重命名等）
- 对于当前中断的线程，我们支持除重命名/删除节点之外的所有拓扑更改（因为该线程现在可能即将进入不再存在的节点）
- 对于修改状态，我们对添加和删除键具有完全的向后和向前兼容性
- 重命名的状态键在现有线程中丢失其保存的状态
- 类型以不兼容方式更改的状态键目前可能在具有更改前状态的线程中引起问题

#### 可视化

能够可视化图通常很有用，特别是当它们变得更复杂时。Spring AI Alibaba Graph 提供了几种内置的可视化图的方法：

```java
// 生成图的可视化表示
CompiledGraph app = workflow.compile();

// 生成 Mermaid 图表
String mermaidDiagram = app.generateMermaidDiagram();
System.out.println(mermaidDiagram);

// 生成 DOT 格式图表
String dotDiagram = app.generateDotDiagram();
System.out.println(dotDiagram);
```

#### 性能考虑

- **线程池配置**：合理配置线程池大小以平衡性能和资源消耗
- **内存管理**：监控状态对象大小，避免内存泄漏
- **并行度控制**：根据系统资源调整并行执行的节点数量
- **缓存策略**：对于重复计算，考虑使用缓存机制
- **递归限制**：根据应用需求设置合适的递归限制
- **状态设计**：优化状态结构以提高序列化/反序列化性能

## 深入理解状态管理

状态管理是 Graph 框架的核心，理解状态的工作原理对于构建高效的工作流至关重要。

### 状态的生命周期

1. **初始化**：图开始执行时，使用输入数据初始化状态
2. **传播**：状态在节点间传递，每个节点都可以读取完整的状态
3. **更新**：节点执行后返回状态更新，根据策略合并到全局状态
4. **持久化**：在配置了检查点的情况下，状态会被定期保存
5. **终止**：图执行完成后，最终状态作为结果返回

### 状态设计模式

#### 1. 分层状态模式

将状态按照功能分层，便于管理和维护：

```java
KeyStrategyFactory layeredStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // 输入层：原始输入数据
    strategies.put("raw_input", KeyStrategy.REPLACE);
    strategies.put("user_context", KeyStrategy.REPLACE);

    // 处理层：中间处理结果
    strategies.put("parsed_data", KeyStrategy.REPLACE);
    strategies.put("analysis_results", KeyStrategy.MERGE);

    // 输出层：最终结果
    strategies.put("final_output", KeyStrategy.REPLACE);
    strategies.put("metadata", KeyStrategy.MERGE);

    // 日志层：执行日志和调试信息
    strategies.put("execution_log", KeyStrategy.APPEND);
    strategies.put("performance_metrics", KeyStrategy.APPEND);

    return strategies;
};
```

#### 2. 版本化状态模式

对于需要跟踪状态变化的场景：

```java
NodeAction versionedAction = state -> {
    // 获取当前版本
    Integer version = state.value("version", Integer.class).orElse(0);

    // 保存历史版本
    Map<String, Object> currentSnapshot = Map.of(
        "version", version,
        "timestamp", System.currentTimeMillis(),
        "data", state.value("data", Object.class).orElse(null)
    );

    // 执行处理逻辑
    Object processedData = processData(state);

    return Map.of(
        "data", processedData,
        "version", version + 1,
        "history", currentSnapshot  // 使用 APPEND 策略保存历史
    );
};
```

### 状态调试技巧

#### 1. 状态快照

在关键节点保存状态快照，便于调试：

```java
NodeAction debuggableAction = state -> {
    // 保存输入快照
    Map<String, Object> inputSnapshot = new HashMap<>(state.data());

    try {
        // 执行业务逻辑
        Object result = performBusinessLogic(state);

        return Map.of(
            "result", result,
            "debug_info", Map.of(
                "input_snapshot", inputSnapshot,
                "execution_time", System.currentTimeMillis(),
                "success", true
            )
        );
    } catch (Exception e) {
        return Map.of(
            "error", e.getMessage(),
            "debug_info", Map.of(
                "input_snapshot", inputSnapshot,
                "error_time", System.currentTimeMillis(),
                "success", false
            )
        );
    }
};
```

#### 2. 状态验证

在节点执行前后验证状态的完整性：

```java
NodeAction validatedAction = state -> {
    // 前置验证
    validateInputState(state);

    // 执行业务逻辑
    Map<String, Object> updates = performBusinessLogic(state);

    // 后置验证
    validateOutputUpdates(updates);

    return updates;
};

private void validateInputState(OverAllState state) {
    // 检查必需的字段
    if (!state.value("input", String.class).isPresent()) {
        throw new IllegalStateException("Missing required field: input");
    }

    // 检查数据格式
    String input = state.value("input", String.class).get();
    if (input.trim().isEmpty()) {
        throw new IllegalArgumentException("Input cannot be empty");
    }
}
```

## 简单示例

让我们通过一个简单的例子来演示这些概念：

```java
import com.alibaba.cloud.ai.graph.*;
import com.alibaba.cloud.ai.graph.action.*;
import static com.alibaba.cloud.ai.graph.StateGraph.*;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

@Configuration
public class SimpleGraphExample {

    @Bean
    public CompiledGraph simpleWorkflow() {
        // 定义状态策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            strategies.put("execution_log", KeyStrategy.APPEND);
            return strategies;
        };

        // 定义节点动作
        NodeAction processAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String processed = "处理结果: " + input.toUpperCase();

            return Map.of(
                "result", processed,
                "execution_log", "处理节点执行完成: " + System.currentTimeMillis()
            );
        };

        // 构建图
        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("process", node_async(processAction))
            .addEdge(START, "process")
            .addEdge("process", END);

        return graph.compile();
    }
}
```

这个简单的例子展示了：
- 如何定义状态策略
- 如何创建节点动作
- 如何构建和编译图
- 如何使用不同的状态更新策略

## 下一步

现在您已经了解了 Spring AI Alibaba Graph 的核心概念，接下来可以学习：

### 基础使用
- [基础用法](../basic-usage) - 详细的 API 使用指南和实际示例
- [流式处理](../streaming) - 如何实现实时的流式输出和响应式编程

### 高级功能
- [持久化](../persistence) - 检查点和状态恢复机制
- [人机协作](../human-in-the-loop) - 在工作流中集成人工干预
- [持久执行与时间旅行](./state-context-management/durable-execution) - 持久执行机制和时间旅行功能
- [子图](../subgraphs) - 构建模块化和可重用的图组件

### 实际应用
- [多智能体系统](../multi-agent) - 构建协作的智能体系统
- [内存管理](../memory) - 长期记忆和上下文管理
- [持久化执行](../durable-execution) - 长时间运行的可靠任务执行

### 开发工具
- [Playground Studio](../../playground/studio) - 可视化图开发和调试工具
- [JManus](../../playground/jmanus) - 图管理和监控平台
