---
title: 状态管理 (KeyStrategy)
description: 深入理解 StateGraph 的核心状态管理机制 OverAllState 与 KeyStrategy，学习如何精确控制工作流中的数据合并行为，避免常见的数据覆盖问题。
---

在 SAA Graph 中，所有的数据都存储在一个名为 `OverAllState` 的中央状态容器中。工作流中的每个节点都会读取这个容器中的数据，并在执行完毕后将新的数据写回。

那么，当一个节点尝试写入一个已经存在的键（Key）时，新的数据应该如何与旧的数据合并呢？是直接覆盖，还是追加到后面？**`KeyStrategy`** 正是用于定义这种合并行为的核心机制。

精确地理解和配置 `KeyStrategy` 对于构建健壮、可预测的工作流至关重要。

## `OverAllState`：中央状态容器

`OverAllState` 本质上是一个 `Map<String, Object>` 的封装。它在整个图的执行过程中流动，所有节点共享同一个 `OverAllState` 实例。

当一个节点执行完毕并返回一个新的 `Map<String, Object>` 作为其输出时，`StateGraph` 会在内部调用 `OverAllState.updateState()` 方法，将节点返回的这个新 Map 合并到主 `OverAllState` 中。合并的过程会逐一对每个键应用其预定义的 `KeyStrategy`。

## `KeyStrategy`：定义合并策略

`KeyStrategy` 是一个简单的函数式接口，它定义了当新旧值同时存在时应如何处理。

```java
public interface KeyStrategy {
    Object apply(Object oldValue, Object newValue);
}
```

SAA Graph 内置了三种核心策略：`ReplaceStrategy`、`AppendStrategy` 和 `MergeStrategy`。

### `ReplaceStrategy` (替换策略)

最简单、最常用的策略。逻辑是：**无论旧值是什么，都直接用新值覆盖它**。

**适用场景**:
-   几乎所有单值状态的管理，例如：`user_input`, `classification_result`, `final_answer` 等。
-   当您需要用一个全新的集合替换旧的集合时。
-   这是绝大多数键的默认选择。

### `AppendStrategy` (追加策略)

逻辑是**将新值追加到旧值的后面**。它的行为会根据值的类型智能调整：

-   **`List` + `List`**: 将新 `List` 中的*所有元素*追加到旧 `List` 的末尾。
-   **`List` + `非 List`**: 将这个新值*作为一个元素*追加到旧 `List` 的末尾。
-   **`String` + `String`**: 将新字符串拼接到旧字符串的末尾。
-   **`null` + `新值`**: 创建一个新 `List` 并将新值添加进去。

**适用场景**:
-   **对话历史 (`messages`)**: 最典型的场景。`LlmNode` 或 `ToolNode` 产生的新消息，会被追加到 `messages` 列表中，形成完整的对话历史。
-   **日志或步骤记录**: 记录工作流的执行步骤，形成执行轨迹。
-   **累积结果**: 将多个并行分支的结果收集到一个列表中。

### `MergeStrategy` (合并策略)

逻辑是**智能合并两个值**，特别适合处理 `Map` 类型的数据。

-   **`Map` + `Map`**: 创建一个新 `Map`，包含旧 `Map` 的所有键值对，然后将新 `Map` 的键值对合并进去（如果键冲突，新值会覆盖旧值）。
-   **其他情况**: 行为类似于 `ReplaceStrategy`，直接返回新值。

**适用场景**:
-   **配置合并**: 不同节点产生不同的配置参数，需要将它们合并到一个 `config` 对象中。
-   **元数据聚合**: 收集和合并来自多个节点的元数据信息。
-   **结果汇总**: 当多个节点产生的结果需要以键值对的形式组织在一起时。

## 基础配置方式

在构建 `StateGraph` 时，您必须提供一个 `KeyStrategyFactory`。这是一个工厂，用于创建一个包含所有键及其对应策略的 `Map`。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import java.util.HashMap;
import java.util.Map;

// ...

// 推荐使用 KeyStrategy 接口中定义的静态常量，使代码更简洁
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    
    // 使用静态常量，代码更简洁
    strategies.put("messages", KeyStrategy.APPEND);
    strategies.put("config", KeyStrategy.MERGE);
    strategies.put("metadata", KeyStrategy.MERGE);
    strategies.put("user_query", KeyStrategy.REPLACE);
    strategies.put("search_results", KeyStrategy.REPLACE);
    strategies.put("final_summary", KeyStrategy.REPLACE);
    
    return strategies;
};

// 在构建 StateGraph 时传入
StateGraph stateGraph = new StateGraph(keyStrategyFactory);
```

> **最佳实践**:
> - **显式定义**: 强烈建议为您工作流中的每一个重要键都显式定义一个 `KeyStrategy`，这能让状态行为清晰可预测。
> - **`messages`**: 对话历史 `messages` 键，几乎总是应该使用 `AppendStrategy`。
> - **配置/元数据**: `config`、`metadata` 等键，推荐使用 `MergeStrategy`，以逐步构建完整信息。
> - **默认选择**: 对于不确定或临时使用的键，`ReplaceStrategy` 通常是最安全的选择。

## 高级配置：使用 `KeyStrategyFactoryBuilder`

当工作流的 `KeyStrategy` 配置变得复杂时，手动管理一个巨大的 `Map` 会变得非常繁琐。为此，SAA Graph 提供了一个强大的构建器 `KeyStrategyFactoryBuilder`，支持**链式调用、默认策略、模式匹配、条件策略**等高级功能。

> **何时使用?** 对于任何非玩具项目，我们都**强烈推荐**使用 Builder 来管理您的策略，这会让配置更具结构性、可读性和可维护性。

### 基础用法

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;

// 使用 Builder 简化配置
KeyStrategyFactory factory = KeyStrategy.builder()
    .addStrategy("messages", KeyStrategy.APPEND)
    .addStrategy("config", KeyStrategy.MERGE)
    .addStrategy("metadata", KeyStrategy.MERGE)
    .defaultStrategy(KeyStrategy.REPLACE) // ✨ 设置默认策略，无需为每个其他键单独配置
    .build();

StateGraph graph = new StateGraph(factory);
```

### 模式匹配策略

您可以使用正则表达式或前缀/后缀匹配来批量配置策略：

```java
KeyStrategyFactory factory = KeyStrategy.builder()
    // 所有以 "temp_" 开头的键都使用替换策略
    .addPrefixStrategy("temp_", KeyStrategy.REPLACE)
    
    // 所有以 "_history" 结尾的键都使用追加策略
    .addSuffixStrategy("_history", KeyStrategy.APPEND)
    
    // 包含 "config" 的键都使用合并策略
    .addContainsStrategy("config", KeyStrategy.MERGE)
    
    // 使用正则表达式：所有 "step_数字" 格式的键使用追加策略
    .addPatternStrategy("step_\\d+", KeyStrategy.APPEND)
    
    .defaultStrategy(KeyStrategy.REPLACE)
    .build();
```

### 条件策略 (Predicate)

基于键的名称或其他特征来动态决定策略：

```java
KeyStrategyFactory factory = KeyStrategy.builder()
    // 长度超过10个字符的键使用合并策略
    .addPredicateStrategy(key -> key.length() > 10, KeyStrategy.MERGE)
    
    // 包含特定关键词的键使用追加策略
    .addPredicateStrategy(key -> key.contains("log") || key.contains("trace"), KeyStrategy.APPEND)
    
    .defaultStrategy(KeyStrategy.REPLACE)
    .build();
```

### 复杂示例：智能 Agent 工作流配置

```java
KeyStrategyFactory intelligentAgentFactory = KeyStrategy.builder()
    // === 核心数据流 ===
    .addStrategy("messages", KeyStrategy.APPEND)           // 对话历史记录
    .addStrategy("conversation_context", KeyStrategy.APPEND) // 对话上下文信息

    // === 配置与元数据 (使用模式匹配) ===
    .addSuffixStrategy("_config", KeyStrategy.MERGE)       // e.g., "llm_config", "tool_config"
    .addSuffixStrategy("_metadata", KeyStrategy.MERGE)     // e.g., "user_metadata"
    .addContainsStrategy("setting", KeyStrategy.MERGE)     // e.g., "api_settings"

    // === 日志与追踪 (使用模式匹配) ===
    .addPrefixStrategy("log_", KeyStrategy.APPEND)         // e.g., "log_info", "log_error"
    .addPrefixStrategy("trace_", KeyStrategy.APPEND)       // e.g., "trace_agent_thought"
    .addSuffixStrategy("_steps", KeyStrategy.APPEND)       // e.g., "execution_steps"

    // === 临时与缓存数据 (使用模式匹配) ===
    .addPrefixStrategy("temp_", KeyStrategy.REPLACE)       // e.g., "temp_variable"
    .addPrefixStrategy("cache_", KeyStrategy.REPLACE)      // e.g., "cache_user_profile"

    // === 更精细的规则 ===
    .addPatternStrategy("step_\\d+_result", KeyStrategy.APPEND)  // e.g., "step_1_result"
    .addPredicateStrategy(
        key -> key.startsWith("parallel_") && key.endsWith("_results"), // e.g., "parallel_search_results"
        KeyStrategy.APPEND
    )
    
    // === 默认回退策略 ===
    .defaultStrategy(KeyStrategy.REPLACE)
    .build();

StateGraph smartGraph = new StateGraph(intelligentAgentFactory);
```

## 示例：策略如何影响最终状态

让我们看一个例子，来直观感受不同策略带来的差异。

-   **`node_A` 输出**: `Map.of("data", List.of("A"), "log", "Step A.", "config", Map.of("timeout", 5000))`
-   **`node_B` 输出**: `Map.of("data", List.of("B"), "log", "Step B.", "config", Map.of("retries", 3))`

#### 场景 1: 所有键都使用 `ReplaceStrategy`

-   执行 `node_A` 后，`OverAllState` 为: `{ data: ["A"], log: "Step A.", config: {timeout: 5000} }`
-   执行 `node_B` 后，`node_B` 的输出会**完全覆盖** `node_A` 的输出。
-   **最终状态**: `{ data: ["B"], log: "Step B.", config: {retries: 3} }`

#### 场景 2: `data`/`log` 使用 `AppendStrategy`, `config` 使用 `ReplaceStrategy`

-   执行 `node_A` 后，`OverAllState` 为: `{ data: ["A"], log: "Step A.", config: {timeout: 5000} }`
-   执行 `node_B` 后：
    -   `data`: `["B"]` 追加到 `["A"]` -> `["A", "B"]`
    -   `log`: `"Step B."` 拼接至 `"Step A."` -> `"Step A.Step B."`
    -   `config`: `{retries: 3}` 替换 `{timeout: 5000}`
-   **最终状态**: `{ data: ["A", "B"], log: "Step A.Step B.", config: {retries: 3} }`

#### 场景 3: `data`/`log` 使用 `AppendStrategy`, `config` 使用 `MergeStrategy`

-   执行 `node_A` 后，`OverAllState` 为: `{ data: ["A"], log: "Step A.", config: {timeout: 5000} }`
-   执行 `node_B` 后：
    -   `data`: 追加 -> `["A", "B"]`
    -   `log`: 拼接 -> `"Step A.Step B."`
    -   `config`: `{retries: 3}` 与 `{timeout: 5000}` 合并 -> `{timeout: 5000, retries: 3}`
-   **最终状态**: `{ data: ["A", "B"], log: "Step A.Step B.", config: {timeout: 5000, retries: 3} }`
