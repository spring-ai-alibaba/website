---
title: 并行执行 (Parallel Execution)
description: 学习如何通过定义 StateGraph 的拓扑结构来实现节点的并行执行，以提升 Agent 处理独立任务的效率。
---

在许多复杂的 Agent 工作流中，多个任务之间并没有严格的先后依赖关系，可以同时处理。例如，在处理用户请求时，Agent 可能需要**同时**进行信息检索、调用工具和生成初步思考。如果串行执行这些任务，会不必要地延长总响应时间。

SAA Graph 的执行引擎能够自动识别图中可以并行的路径，并以多线程方式并发执行它们，从而显著提升效率。

## 并行执行的核心原理

在 SAA Graph 中，并行执行并非由某个特殊的 API 或节点类型来启用，而是**由图的拓扑结构决定的**。

其核心原理非常简单：**如果从同一个父节点出发，连接了多个子节点，那么这些子节点将被并行执行。**

执行引擎在遇到这种“分叉”结构时，会为每个分支创建一个独立的执行任务，并让它们在线程池中并发运行。

## 生产级并行模式：分发-收集 (Dispatcher-Collector)

虽然最简单的并行可以从 `START` 节点直接分叉，但在实际应用中，一种更健壮和可扩展的模式是**“分发-收集”**模式：

1.  **分发节点 (Dispatcher)**: 作为并行任务的起点。它负责接收输入，进行预处理，并为即将开始的并行任务设置初始状态。
2.  **并行任务 (Parallel Tasks)**: 多个独立的业务节点，它们从 `Dispatcher` 节点分叉出去，并同时执行。
3.  **收集节点 (Collector)**: 作为并行任务的终点。它会等待所有并行的分支都执行完毕，然后收集、验证和合并结果，并根据结果决定工作流的下一步走向。

下面的示例将完整地展示如何使用 SAA Graph 来实现这个强大的模式。

### 核心示例

该示例将构建一个包含分发器、两个并行任务（文本翻译和内容扩展）以及一个收集器的完整工作流。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.dispatcher.CollectorDispatcher;
import org.springframework.ai.chat.client.ChatClient;

import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

public class ParallelExecutionExample {

    public static void main(String[] args) throws Exception {
        // === 1. 定义状态策略 ===
        // 定义了工作流中所有可能用到的状态字段及其更新策略。
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("query", new ReplaceStrategy());
            strategies.put("translate_language", new ReplaceStrategy());
            strategies.put("translate_content", new ReplaceStrategy());
            strategies.put("expander_content", new ReplaceStrategy());
            strategies.put("expand_status", new ReplaceStrategy());
            strategies.put("translate_status", new ReplaceStrategy());
            strategies.put("collector_next_node", new ReplaceStrategy());
            return strategies;
        };

        // === 2. 构建并行图 ===
        // 定义了四个核心节点，并用边将它们连接起来。
        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
            .addNode("dispatcher", node_async(new DispatcherNode()))
            .addNode("translator", node_async(new TranslatorNode()))
            .addNode("expander", node_async(new ExpanderNode()))
            .addNode("collector", node_async(new CollectorNode()))
            
            // === 3. 定义图的拓扑结构 ===
            .addEdge(START, "dispatcher")
            // 从 dispatcher 同时分叉到两个并行任务
            .addEdge("dispatcher", "translator")
            .addEdge("dispatcher", "expander")
            // 两个并行任务都汇聚到 collector
            .addEdge("translator", "collector")
            .addEdge("expander", "collector")
            // 条件边：根据收集器的决策决定下一步是结束(END)还是重试(dispatcher)
            .addConditionalEdges("collector", edge_async(new CollectorDispatcher()),
                Map.of("dispatcher", "dispatcher", END, END));

        // === 4. 执行并行图 ===
        System.out.println("开始执行并行图...");
        long startTime = System.currentTimeMillis();

        CompiledGraph compiledGraph = stateGraph.compile();
        Optional<OverAllState> finalState = compiledGraph.invoke(Map.of(
            "query", "Hello, this is a test message",
            "translate_language", "中文"
        ));

        long endTime = System.currentTimeMillis();
        System.out.println("图执行完毕。总耗时: " + (endTime - startTime) + " ms");

        // 打印最终结果
        if (finalState.isPresent()) {
            OverAllState state = finalState.get();
            System.out.println("翻译结果: " + state.value("translate_content", String.class).orElse("无"));
            System.out.println("扩展结果: " + state.value("expander_content", String.class).orElse("无"));
        }
    }

    // === 节点实现: 分发器 ===
    static class DispatcherNode implements NodeAction {
        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            System.out.println("分发器开始执行... (线程: " + Thread.currentThread().getName() + ")");
            Map<String, Object> updated = new HashMap<>();
            updated.put("expand_status", "assigned");
            updated.put("translate_status", "assigned");
            System.out.println("分发器执行完毕，启动并行任务。");
            return updated;
        }
    }

    // === 节点实现: 翻译器 (并行任务1) ===
    static class TranslatorNode implements NodeAction {
        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            System.out.println("翻译任务开始执行... (线程: " + Thread.currentThread().getName() + ")");
            String query = state.value("query", String.class).orElse("");
            String language = state.value("translate_language", String.class).orElse("中文");
            Thread.sleep(1000); // 模拟翻译处理时间
            String result = String.format("将 '%s' 翻译为%s的结果", query, language);
            System.out.println("翻译任务执行完毕。");
            return Map.of("translate_content", result);
        }
    }

    // === 节点实现: 扩展器 (并行任务2) ===
    static class ExpanderNode implements NodeAction {
        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            System.out.println("扩展任务开始执行... (线程: " + Thread.currentThread().getName() + ")");
            String query = state.value("query", String.class).orElse("");
            Thread.sleep(1200); // 模拟扩展处理时间
            String result = String.format("对 '%s' 进行扩展和变体生成的结果", query);
            System.out.println("扩展任务执行完毕。");
            return Map.of("expander_content", result);
        }
    }

    // === 节点实现: 收集器 ===
    static class CollectorNode implements NodeAction {
        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            System.out.println("收集器开始执行，等待所有并行任务完成...");
            String nextStep = END;
            // 检查所有并行任务是否都已完成
            boolean translateDone = state.value("translate_content").isPresent();
            boolean expandDone = state.value("expander_content").isPresent();
            
            if (translateDone && expandDone) {
                System.out.println("所有并行任务已成功完成，流程结束。");
                nextStep = END;
            } else {
                System.out.println("部分任务未完成，将重新分发。");
                nextStep = "dispatcher";  // 如果有任务未完成，重新分发
            }
            return Map.of("collector_next_node", nextStep);
        }
    }

    // === 边实现: 收集器的决策逻辑 ===
    static class CollectorDispatcher implements com.alibaba.cloud.ai.graph.action.EdgeAction {
        @Override
        public String apply(OverAllState state) throws Exception {
            // 根据 CollectorNode 写入的状态，返回下一个节点的名称
            return state.value("collector_next_node", String.class).orElse(END);
        }
    }
}
```

## 收集器节点：并行流程的“质控中心”

在并行流程中，收集器节点（示例中的 `CollectorNode`）扮演着至关重要的角色：

1.  **同步等待**: 它会**等待所有指向它的上游并行分支全部执行完成**后，才会开始执行，起到了“屏障”或“同步点”的作用。
2.  **结果验证**: 在节点内部，您可以编写逻辑来检查所有并行任务是否都产生了预期的输出。
3.  **流程控制**: 基于验证结果，它可以动态地决定工作流的下一步走向——是成功汇入下一阶段，还是在某些任务失败时进行重试（如示例中返回 `dispatcher`）或进入异常处理流程。

这使得收集器不仅是结果的合并点，更是整个并行流程的**质量控制与决策中心**。

## 与 `ParallelAgent` 的关系

正如“子图”是 `SequentialAgent` 的基石一样，**“分发-收集”的并行图结构是 `ParallelAgent` 模式的底层实现基础**。

当您使用 `ParallelAgent` 来组合多个 Agent 或 `Tool` 时，`FlowAgent` 框架在幕后会自动为您构建一个类似于我们上面手动创建的并行 `StateGraph`。`ParallelAgent` 提供了一个更高层、更方便的抽象，但理解其底层的并行图原理，能让您在遇到更复杂的场景时，有能力构建高度定制化的并行工作流。

## 高级配置：自定义线程池

默认情况下，SAA Graph 使用一个公共的 `ForkJoinPool` 来执行所有并行任务。但在生产环境中，您可能希望对资源进行更精细的控制，例如：
- 为不同优先级的并行任务分配不同的线程池。
- 隔离 I/O 密集型和 CPU 密集型任务，防止它们相互干扰。

SAA Graph 允许您通过 `RunnableConfig` 在**每次执行时**为特定的并行“分叉点”指定一个自定义的线程池。

```java
import com.alibaba.cloud.ai.graph.RunnableConfig;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
// ... 其他 import

public class CustomThreadPoolExample {
    public static void main(String[] args) throws Exception {
        // (假设 stateGraph 和 compiledGraph 的定义和之前的示例一样)
        StateGraph stateGraph = createParallelGraph(); // 这是一个代表之前示例中图定义的方法
        CompiledGraph compiledGraph = stateGraph.compile();

        // === 创建并指定自定义线程池 ===
        ExecutorService customExecutor = Executors.newFixedThreadPool(4);

        RunnableConfig config = RunnableConfig.builder()
            .threadId("custom_session")
            // 为 dispatcher 节点（分叉点）配置线程池
            // 这意味着从 dispatcher 分支出去的所有并行任务 (translator, expander)
            // 都将在这个自定义线程池中执行。
            .addParallelNodeExecutor("dispatcher", customExecutor)
            .build();

        // === 执行时传入带有自定义配置的 config ===
        compiledGraph.invoke(Map.of(/*... initial data ...*/), config);

        // 在应用关闭时，记得清理资源
        customExecutor.shutdown();
    }
}
```
