---
title: 子图 (SubGraphs)
description: 学习如何使用子图来模块化地构建和组织复杂的工作流，提升 Agent 的可维护性和可重用性。
---

随着 Agent 工作流变得越来越复杂，将所有逻辑都放在一个巨大的图中会使其难以管理、测试和复用。SAA Graph 提供了**子图 (SubGraphs)** 功能，允许您将一个完整的 `StateGraph` 封装成一个独立的节点，嵌入到另一个“父”图中。

这就像在编程语言中调用一个函数或导入一个模块：它能帮助您将复杂的任务分解为更小、更专注、可独立测试和可重用的单元。

## 子图：高层 Agent 模式的基石

在深入了解如何手动构建子图之前，理解其在 SAA 框架中的定位至关重要。**子图是构成 `FlowAgent` 等高层 Agent 模式的底层核心技术**。

当您使用 `SequentialAgent` 来串联多个 Agent，或使用 `ParallelAgent` 来并发执行它们时，框架在底层实际上就是将每一个独立的 Agent 封装成一个子图，然后将这些子图连接起来，形成一个更大的、可执行的 `StateGraph`。

因此，学习子图不仅能让您构建自定义的复杂工作流，更能让您深刻理解 SAA 中各种 Agent 模式的工作原理，从而在需要时突破这些模式的限制，实现更高阶的定制。

## 如何使用子图

在 SAA Graph 中，任何一个 `StateGraph` 或 `CompiledGraph` 的实例，都可以被直接当作一个节点添加到另一个 `StateGraph` 中。

下面我们通过一个简洁、可直接运行的示例来演示这个过程。

### 核心示例

假设我们要构建一个工作流：第一步准备数据，第二步调用一个通用的“文本分析”子流程，最后结束。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

public class SubGraphSimpleExample {

    public static void main(String[] args) throws Exception {
        // === 1. 定义子图 (Text Analysis SubGraph) ===
        // 这个子图负责接收 'input' 并产生 'analysis_result'。
        KeyStrategyFactory subGraphKSF = () -> Map.of("analysis_result", new ReplaceStrategy());

        StateGraph textAnalysisSubGraph = new StateGraph(subGraphKSF)
            .addNode("analyzer", (state) -> {
                String input = state.value("input", String.class).orElse("");
                System.out.println("子图 'analyzer' 节点正在执行，输入: " + input);
                return Map.of("analysis_result", "分析结果: " + input);
            })
            .addEdge(StateGraph.START, "analyzer")
            .addEdge("analyzer", StateGraph.END);

        // === 2. 定义主图 (Main Graph) ===
        KeyStrategyFactory mainGraphKSF = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", new ReplaceStrategy());
            // 定义 'analysis_result'键，用于从子图接收结果
            strategies.put("analysis_result", new ReplaceStrategy());
            return strategies;
        };
        StateGraph mainGraph = new StateGraph(mainGraphKSF);

        // === 3. 将子图作为一个节点添加到主图中 ===
        mainGraph.addNode("preparer", (state) -> {
            System.out.println("主图 'preparer' 节点正在执行...");
            return Map.of("input", "你好，子图！");
        });

        // ✨ 关键步骤: 直接将 StateGraph 实例作为节点添加
        mainGraph.addNode("text_analyzer_subgraph", textAnalysisSubGraph);

        // 定义主图流程
        mainGraph.addEdge(StateGraph.START, "preparer");
        mainGraph.addEdge("preparer", "text_analyzer_subgraph");
        mainGraph.addEdge("text_analyzer_subgraph", StateGraph.END);

        // === 4. 编译并运行主图 ===
        CompiledGraph compiledGraph = mainGraph.compile();
        Optional<OverAllState> finalState = compiledGraph.invoke(Map.of());

        // 从最终状态中获取子图的输出
        String result = finalState.get().value("analysis_result", String.class).orElse("无结果");
        System.out.println("主图执行完毕，最终结果: " + result);
    }
}
```
**预期输出**:
```
主图 'preparer' 节点正在执行...
子图 'analyzer' 节点正在执行，输入: 你好，子图！
主图执行完毕，最终结果: 分析结果: 你好，子图！
```

## 子图的状态管理

-   **状态传递**: 当父图执行到子图节点时，它会将自己**当前的完整状态 (`OverAllState`)** 传递给子图作为其初始状态。在上面的例子中，`preparer` 节点产生的 `input` 被自动传递给了 `text_analyzer_subgraph` 子图。
-   **状态合并**: 子图执行完毕后，其**最终的状态**会被合并回父图的状态中。父图会根据自己的 `KeyStrategy` 来决定如何合并。在例子中，子图产生的 `analysis_result` 被成功合并回主图，并最终被打印出来。

## 两种模式：动态子图 vs 预编译子图

SAA Graph 提供了两种方式来使用子图，以适应不同场景的需求：

### 1. 动态子图 (传入 `StateGraph`)

-   **方式**: 正如上面的例子所示，直接将一个 `StateGraph` 对象作为节点添加到父图中。
-   **工作原理**: 在父图被编译时，子图的节点和边会被“展开”并合并到父图的结构中。

### 2. 预编译子图 (传入 `CompiledGraph`)

-   **方式**: 您可以先将子图独立编译，然后将得到的 `CompiledGraph` 对象作为节点添加到父图中。这对于性能优化和发布稳定的、可重用的工作流组件非常有用。
-   **代码示例**:
    ```java
    // ... (假设 textAnalysisSubGraph 的定义和之前一样)

    // 1. 独立编译子图，得到一个可执行的组件
    CompiledGraph compiledTextAnalysisSubGraph = textAnalysisSubGraph.compile();

    // 2. 在主图中，添加已编译的子图实例
    mainGraph.addNode("text_analyzer_subgraph", compiledTextAnalysisSubGraph);

    // ... (主图的其他部分和执行逻辑保持不变)
    ```
-   **工作原理**: 父图在运行时，会像调用一个普通的 `NodeAction` 一样来 `invoke` 这个预编译的子图，而无需在每次执行时都重新编译它。

通过灵活运用子图，您可以构建出结构清晰、高度模块化且易于维护的复杂 AI 应用。
