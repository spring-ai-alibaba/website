---
title: 并行执行 (Parallel Execution)
description: 了解 SAA Graph 如何通过图的拓扑结构自动实现节点的并行执行，以提升复杂工作流的性能和效率。
---

在构建复杂的 Agent 工作流时，我们经常会遇到可以同时处理的独立任务。例如，在处理用户请求时，可能需要同时进行“意图识别”、“实体提取”和“情感分析”。如果串行执行这些任务，会大大增加总响应时间。

SAA Graph 提供了**隐式的并行执行**能力。您无需编写任何多线程或异步代码，只需通过定义图的拓扑结构，引擎就能自动识别并并发执行没有相互依赖关系的节点。

### 核心理念：拓扑驱动的并行

SAA Graph 的并行机制是“拓扑驱动”的，这意味着并行行为完全由您定义的节点和边的关系决定。其核心规则是：

> 如果多个节点连接到同一个父节点，并且它们之间没有直接或间接的依赖关系，那么这些节点就可以被并行执行。

最常见的并行模式是“分发-收集”（Scatter-Gather）：
1.  **分发 (Scatter)**: 一个起始节点（如 `START`）将相同的输入分发给多个并行的处理分支。
2.  **并行处理**: 每个分支独立、并发地执行其任务。
3.  **收集 (Gather)**: 一个或多个后续节点等待所有或部分并行分支完成后，收集它们的结果进行合并或进一步处理。

### 核心示例：多维度查询增强

让我们通过一个实际场景来理解并行执行。假设我们希望在执行搜索前，对用户的原始查询进行“多维度增强”：
1.  **分支一（扩展）**: 将原始查询扩展成多个相似但不同角度的问题。
2.  **分支二（翻译）**: 将原始查询翻译成英文，以进行跨语言搜索。

这两个任务互不依赖，可以完美地并行执行。

#### 1. 定义并行拓扑结构

实现上述场景的关键在于图的定义。我们让 `START` 节点同时连接到 `expander`（扩展器）和 `translator`（翻译器）两个节点。这两个节点处理完成后，再将结果都汇集到 `merge`（合并）节点。

```java
// 在 Spring @Configuration 类中
@Bean
public StateGraph parallelGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
    // ... (省略 KeyStrategyFactory 的定义)

    StateGraph stateGraph = new StateGraph(keyStrategyFactory)
            .addNode("expander", new ExpanderNode(chatClientBuilder))
            .addNode("translator", new TranslatorNode(chatClientBuilder))
            .addNode("merge", new MergeNode());

    // ✨ 核心：让 START 同时连接到两个独立节点，触发并行
    stateGraph.addEdge(StateGraph.START, "expander");
    stateGraph.addEdge(StateGraph.START, "translator");

    // ✨ 核心：让两个并行分支的结果都汇入 merge 节点
    stateGraph.addEdge("expander", "merge");
    stateGraph.addEdge("translator", "merge");

    stateGraph.addEdge("merge", StateGraph.END);

    return stateGraph;
}
```
当这个图被执行时，`expander` 和 `translator` 节点将在独立的线程中同时运行。

#### 2. 实现并行节点

并行节点的实现与普通节点完全相同。您只需关注单个节点的业务逻辑，无需关心线程管理。

**`ExpanderNode.java`**:
```java
public class ExpanderNode implements NodeAction {
    // ... (省略 PromptTemplate 定义)
    private final ChatClient chatClient;

    public ExpanderNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String query = state.value("query", "");
        // ... 调用 LLM 进行查询扩展 ...
        String expandedQueries = this.chatClient.prompt()... .call().content();
        return Map.of("expanded_content", expandedQueries);
    }
}
```

**`TranslatorNode.java`**:
```java
public class TranslatorNode implements NodeAction {
    // ... (省略 PromptTemplate 定义)
    private final ChatClient chatClient;

    public TranslatorNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String query = state.value("query", "");
        // ... 调用 LLM 进行查询翻译 ...
        String translatedQuery = this.chatClient.prompt()... .call().content();
        return Map.of("translated_content", translatedQuery);
    }
}
```

#### 3. 实现收集节点

`merge` 节点负责等待 `expander` 和 `translator` 都执行完毕，然后从 `OverAllState` 中读取它们各自的输出，并将其合并成最终结果。

**`MergeNode.java`**:
```java
private static class MergeNode implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        // 此时，两个并行分支的结果都已经写入了 OverAllState
        Object expandedContent = state.value("expanded_content").orElse("N/A");
        String translatedContent = state.value("translated_content", "N/A");

        return Map.of("final_result", Map.of(
                "expanded", expandedContent,
                "translated", translatedContent
        ));
    }
}
```

#### 4. 执行图

执行并行图的调用方式与串行图完全一样。引擎会自动处理并发逻辑。

```java
// 在 Spring @RestController 中
@GetMapping("/enrich-query")
public Map<String, Object> enrichQuery(@RequestParam String query) {
    // ... (假设 compiledGraph 已经通过 stateGraph.compile() 创建)
    
    Optional<OverAllState> result = this.compiledGraph.invoke(Map.of("query", query));

    return result.map(OverAllState::data).orElse(Map.of());
}
```

当调用 `/enrich-query` 端点时，您会观察到两个对 LLM 的调用是几乎同时发出的，大大缩短了总处理时间。

### 高级配置：自定义线程池

默认情况下，SAA Graph 使用 Java 的 `ForkJoinPool.commonPool()` 来执行并行任务。对于大多数场景，这已经足够了。但在需要精细控制线程资源（例如，避免与 Web 服务器的线程池冲突，或为 AI 任务设置专用资源）的生产环境中，您可以为并行节点指定自定义的 `Executor`。

#### 自动生成的并行节点

当您在 `StateGraph` 中让一个源节点连接到多个目标节点时（如上面例子中的 `START` 连接到 `expander` 和 `translator`），SAA Graph 编译器会**自动检测**这种模式，并在编译时创建一个特殊的 `ParallelNode` 来管理并行执行。

这个自动生成的并行节点的 ID 遵循固定格式：**`__PARALLEL__(源节点ID)`**

- 对于从 `START` 出发的并行分支：`__PARALLEL__(START)`  
- 对于从 `nodeA` 出发的并行分支：`__PARALLEL__(nodeA)`

这可以通过 `RunnableConfig` 来配置：

```java
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

// 1. 创建一个或多个自定义的 Executor
Executor customExecutor = Executors.newFixedThreadPool(4);

// 2. 在执行时，通过 RunnableConfig 注入
RunnableConfig config = RunnableConfig.builder()
        .threadId("my-thread-1")
        // ✨ 正确的做法：为自动生成的并行节点指定 Executor
        .addParallelNodeExecutor("__PARALLEL__(START)", customExecutor)
        .build();

// 3. 调用 invoke
compiledGraph.invoke(Map.of("query", query), config);

// 4. 记得在使用完毕后关闭自定义线程池
// customExecutor.shutdown(); (如果 Executor 是 ExecutorService)
```

### 与 `ParallelAgent` 的关系

正如“子图”是 `SequentialAgent` 的底层实现基础一样，我们在这里手动构建的“分发-收集”并行图，正是 [`FlowAgent` 模式](../patterns/flow)中 `ParallelAgent` 的底层实现原理。

-   **`StateGraph` 并行 (本章内容)**: 提供了最底层、最灵活的并行控制。您可以通过任意方式组合节点和边，构建出复杂的并行、条件、循环混合的工作流。这是**追求极致灵活性**时的选择。
-   **`ParallelAgent` (高层 API)**: 专门针对“将一组独立的 Agent 并行执行，然后合并结果”这一常见场景进行了封装。它隐藏了图的构建细节，让您可以更快速地实现并行任务。这是**追求开发效率**时的选择。

当您的需求可以通过 `ParallelAgent` 满足时，我们推荐使用这个更高层的抽象。当您需要构建非对称、带条件判断或更复杂的并行逻辑时，可以直接使用 `StateGraph` 来获得完全的控制。

通过合理利用并行执行，您可以构建出响应更快、资源利用率更高的复杂智能 Agent。
