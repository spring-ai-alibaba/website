---
title: StateGraph 基础
description: 学习 SAA Graph 的核心引擎 StateGraph，了解它是如何定义、编译和执行一个智能流程的。
---

在【构建智能体】的【Agent 模式】章节中，我们学习了如何使用 `ReactAgent`、`FlowAgent` 等高层 API 快速构建智能体。现在，我们将深入到这些 API 的底层，探索它们共同依赖的核心引擎——`StateGraph`。

`StateGraph` 是所有智能流程的“蓝图”。无论多么复杂的 Agent，其内部的逻辑流转、状态管理和任务调度都是通过 `StateGraph` 来定义和执行的。掌握了 `StateGraph`，您就拥有了创建任何自定义 Agent 或复杂工作流的能力。

## 核心隐喻：智能流程的状态机

您可以将 `StateGraph` 理解为一个**“能够管理状态的智能流程图”**。它由两种基本元素构成：
-   **节点 (Nodes)**: 代表工作流中的一个“步骤”或“动作”，例如调用一次 LLM、执行一个工具或一段业务逻辑。
-   **边 (Edges)**: 代表节点之间的“连接”，它定义了工作流的走向，即完成一个节点后应该去往哪个节点。

与传统的工作流引擎不同，`StateGraph` 的核心特点是它拥有一个**统一的状态管理器**，使得在整个流程中共享和更新数据变得异常简单和强大。

## 两大核心对象：`StateGraph` 与 `CompiledGraph`

理解 `StateGraph` 的第一步，是区分“蓝图”和“引擎”这两个核心对象：

1.  **`StateGraph` (蓝图)**: 这是您用来**定义**工作流的对象。您可以调用它的 `.addNode()` 和 `.addEdge()` 等方法来描绘您的流程图。它本身是不可执行的，仅仅是一个静态的结构定义。
2.  **`CompiledGraph` (引擎)**: 这是**可执行**的对象。您必须通过调用 `stateGraph.compile()` 方法，将“蓝图”编译成一个高效、优化的“引擎”。所有实际的运行操作，如 `.invoke()` (同步执行) 和 `.stream()` (流式执行)，都是在这个 `CompiledGraph` 实例上完成的。

这个“定义 -> 编译 -> 执行”的生命周期是使用 `StateGraph` 的基础。

## 核心数据载体：`OverAllState` 与 `KeyStrategy`

`StateGraph` 的强大之处在于其状态管理机制。

-   **`OverAllState`**: 这是整个图共享的“记忆黑板”。它本质上是一个线程安全的 `Map<String, Object>`。图中的任何一个节点都可以读取 `OverAllState` 中任意 key 的数据，并且可以在执行完毕后，将新的数据写入 `OverAllState`，供后续节点使用。
-   **`KeyStrategy` (状态更新策略)**: 当一个节点要向 `OverAllState` 中写入一个已存在的 key 时，会发生什么？是覆盖、追加还是忽略？这就是 `KeyStrategy` 的作用。在定义 `StateGraph` 时，您可以为每个 key 指定一个更新策略。
    -   `ReplaceStrategy()`: **替换策略**。新值会完全覆盖旧值。
    -   `AppendStrategy()`: **追加策略**。如果旧值和新值都是 `List`，则会将新值 `List` 中的所有元素追加到旧值 `List` 的末尾。这对于处理像对话历史 (`messages`) 这样的场景非常有用。

## 完整的生命周期示例

下面，我们将通过一个最简单的例子，完整地展示“定义 -> 编译 -> 执行”的生命周期。

**场景**: 创建一个简单的问候流程。第一个节点生成问候语，第二个节点将感叹号附加到问候语上。

### 1. 定义 (Define)

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class SimpleGraphExample {

    public static void main(String[] args) throws Exception {
        // 定义状态更新策略：greeting 使用替换策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
            keyStrategyMap.put("greeting", new ReplaceStrategy());
            return keyStrategyMap;
        };

        // ① 定义 StateGraph 蓝图
        StateGraph stateGraph = new StateGraph(keyStrategyFactory);

        // 定义节点 1: 生成问候语
        stateGraph.addNode("greeter", (state) -> {
            System.out.println("Executing greeter node...");
            return Map.of("greeting", "Hello, SAA Graph");
        });

        // 定义节点 2: 添加感叹号
        stateGraph.addNode("exclaimer", (state) -> {
            System.out.println("Executing exclaimer node...");
            String currentGreeting = state.value("greeting", String.class).orElse("");
            return Map.of("greeting", currentGreeting + "!");
        });

        // 定义流程：START -> greeter -> exclaimer -> END
        stateGraph.addEdge(StateGraph.START, "greeter");
        stateGraph.addEdge("greeter", "exclaimer");
        stateGraph.addEdge("exclaimer", StateGraph.END);
```

### 2. 编译 (Compile)

```java
        // ② 将蓝图编译成可执行的引擎
        CompiledGraph compiledGraph = stateGraph.compile();
```

### 3. 执行 (Execute)

```java
        // ③ 同步执行引擎
        // 初始输入为空，因为我们的流程不依赖外部输入
        Map<String, Object> initialInput = Collections.emptyMap();
        Optional<OverAllState> finalStateOptional = compiledGraph.invoke(initialInput);

        // 从最终状态中提取结果
        String finalGreeting = finalStateOptional.get().value("greeting", String.class).orElse("");
        
        System.out.println("Final Result: " + finalGreeting);
    }
}
```

**运行结果**:
```
Executing greeter node...
Executing exclaimer node...
Final Result: Hello, SAA Graph!
```

这个简单的例子完整地展示了 `StateGraph` 的核心生命周期。在接下来的章节中，我们将深入学习如何开发更强大的自定义节点，以及如何使用“边”来实现复杂的条件路由，从而构建出真正智能的 Agent。
