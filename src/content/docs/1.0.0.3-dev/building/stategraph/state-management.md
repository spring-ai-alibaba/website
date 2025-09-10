---
title: 状态管理 (KeyStrategy 与 Channel)
description: 深入理解 StateGraph 的核心状态管理机制 OverAllState、KeyStrategy 与 Channel，学习如何精确控制工作流中的数据合并与转换行为。
---

在 SAA Graph 中，所有的数据都存储在一个名为 `OverAllState` 的中央状态容器中。工作流中的每个节点都会读取这个容器中的数据，并在执行完毕后将新的数据写回。

那么，当一个节点尝试写入一个已经存在的键（Key）时，新的数据应该如何与旧的数据合并呢？是直接覆盖，还是追加到后面，或是进行更复杂的逻辑合并？精确地控制这种行为，对于构建健壮、可预测的工作流至关重要。

本文将由浅入深，介绍 SAA Graph 提供的从基础到高级的状态管理工具：`KeyStrategy` 和 `Channel` 系统。

## `KeyStrategy`：三大核心合并策略

`KeyStrategy` 是一个简单的函数式接口，定义了当新旧值同时存在时应如何处理。SAA Graph 内置了三种最核心、最常用的策略。

### `ReplaceStrategy` (替换策略)
最简单、最常用的策略。逻辑是：**无论旧值是什么，都直接用新值覆盖它**。

- **适用场景**: 绝大多数单值状态的管理，如 `user_input`, `final_answer` 等。

### `AppendStrategy` (追加策略)
逻辑是**将新值追加到旧值的后面**。它的行为会根据值的类型智能调整：

-   **`List` + `List`**: 将新 `List` 中的*所有元素*追加到旧 `List` 的末尾。
-   **`List` + `非 List`**: 将这个新值*作为一个元素*追加到旧 `List` 的末尾。
-   **`String` + `String`**: 将新字符串拼接到旧字符串的末尾。
-   **`null` + `新值`**: 创建一个新 `List` 并将新值添加进去。

- **适用场景**: 对话历史 (`messages`)、日志记录、累积多个分支的结果。

### `MergeStrategy` (合并策略)
逻辑是**智能合并两个值**，特别适合处理 `Map` 类型的数据。

-   **`Map` + `Map`**: 创建一个新 `Map`，包含旧 `Map` 的所有键值对，然后将新 `Map` 的键值对合并进去（如果键冲突，新值会覆盖旧值）。
-   **其他情况**: 行为类似于 `ReplaceStrategy`，直接返回新值。

- **适用场景**: 合并不同节点产生的配置 (`config`) 或元数据 (`metadata`)。

## 配置方式一：基础 `KeyStrategyFactory`

在构建 `StateGraph` 时，您必须提供一个 `KeyStrategyFactory`。最基础的方式是直接创建一个 `Map`。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import java.util.HashMap;
import java.util.Map;

// 推荐使用 KeyStrategy 接口中定义的静态常量，使代码更简洁
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    
    strategies.put("messages", KeyStrategy.APPEND);
    strategies.put("config", KeyStrategy.MERGE);
    strategies.put("user_query", KeyStrategy.REPLACE);
    
    return strategies;
};

StateGraph stateGraph = new StateGraph(keyStrategyFactory);
```

## 配置方式二（推荐）：高级 `KeyStrategyFactoryBuilder`

当工作流的 `KeyStrategy` 配置变得复杂时，手动管理 `Map` 会非常繁琐。为此，SAA Graph 提供了强大的 `KeyStrategyFactoryBuilder`。

> 对于任何正式项目，我们都**强烈推荐**使用 Builder 来管理您的策略，这会让配置更具结构性、可读性和可维护性。

### 基础用法与默认策略

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;

KeyStrategyFactory factory = KeyStrategy.builder()
    .addStrategy("messages", KeyStrategy.APPEND)
    .addStrategy("config", KeyStrategy.MERGE)
    .addStrategy("metadata", KeyStrategy.MERGE)
    .defaultStrategy(KeyStrategy.REPLACE) // ✨ 设置默认策略，无需为每个其他键单独配置
    .build();
```

### 模式匹配与条件策略

您可以使用正则表达式、前缀/后缀匹配或自定义逻辑来批量配置策略：

```java
KeyStrategyFactory factory = KeyStrategy.builder()
    // 所有以 "_history" 结尾的键都使用追加策略
    .addSuffixStrategy("_history", KeyStrategy.APPEND)
    // 使用正则表达式：所有 "step_数字" 格式的键使用追加策略
    .addPatternStrategy("step_\\d+", KeyStrategy.APPEND)
    // 基于键的名称特征来动态决定策略
    .addPredicateStrategy(key -> key.contains("log") || key.contains("trace"), KeyStrategy.APPEND)
    .defaultStrategy(KeyStrategy.REPLACE)
    .build();
```

## 便捷工具：`OverAllStateBuilder`

`OverAllStateBuilder` 提供了一个**链式API**，让您可以更直观、更安全地构建初始状态对象，同时配置策略。

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.OverAllStateBuilder;
import com.alibaba.cloud.ai.graph.KeyStrategy;

// 使用建造者模式，链式创建状态对象
OverAllState initialState = OverAllStateBuilder.builder()
    .putData("user_id", "12345") // 设置单个数据
    .putData("session_token", "abc-def-ghi")
    .withKeyStrategy("messages", KeyStrategy.APPEND) // 配置单个策略
    .withKeyStrategy("config", KeyStrategy.MERGE)
    .build();

// 您也可以批量设置数据和策略
Map<String, Object> initialData = Map.of("task", "image_generation");
Map<String, KeyStrategy> strategies = Map.of("image_params", KeyStrategy.MERGE);

OverAllState stateWithBatchData = OverAllStateBuilder.builder()
    .withData(initialData)
    .withKeyStrategies(strategies)
    .build();
```

## 终极武器：使用 `Channel` 系统进行精细化状态控制

> **何时使用 Channel？** 当基础的 `KeyStrategy` 无法满足您的复杂状态管理需求时。例如：
> - 需要从列表中**删除**特定元素。
> - 需要比 `MergeStrategy` 更复杂的**自定义合并逻辑**。
> - 需要为某个状态提供**动态的默认值**。

`Channel` 是对 `KeyStrategy` 的高级抽象，它将状态的“合并逻辑”、“默认值”甚至“更新行为”都封装在了一起。

### `AppenderChannel`：智能列表管理

`AppenderChannel` 是专门为列表管理设计的，它最强大的功能是支持**元素删除**。

```java
import com.alibaba.cloud.ai.graph.state.AppenderChannel;
import com.alibaba.cloud.ai.graph.state.RemoveByHash;
import java.util.List;

// 创建一个智能列表 Channel
AppenderChannel<String> messageChannel = AppenderChannel.of(ArrayList::new);

// 当前消息列表
List<String> currentMessages = List.of("msg1", "msg2", "msg3", "msg2");

// ✨ 核心功能：使用 RemoveByHash 删除特定值的元素
// 这会返回一个特殊的 RemoveIdentifier 对象
var removeMsg2 = RemoveByHash.of("msg2");

// 更新时，Channel 会识别这个特殊对象并执行删除逻辑
Object result = messageChannel.update("messages", currentMessages, removeMsg2);
// 结果: ["msg1", "msg3", "msg2"] (只删除第一个匹配的 "msg2")

// 您甚至可以在一次更新中混合添加和删除操作
List<Object> mixedOperations = List.of(
    "new_message_1",
    RemoveByHash.of("msg1"),  // 删除 "msg1"
    "new_message_2"
);
Object mixedResult = messageChannel.update("messages", currentMessages, mixedOperations);
// 结果: ["msg2", "msg3", "msg2", "new_message_1", "new_message_2"]
```

### 自定义 `Reducer`：定义你自己的合并逻辑

`Reducer` 是 `Channel` 的核心，它就是一个函数 `(oldValue, newValue) -> mergedValue`，让您可以完全自定义合并行为。

#### 示例：智能数值聚合

假设您需要聚合统计数据，有的需要累加，有的需要取最大值。

```java
import com.alibaba.cloud.ai.graph.state.Channel;
import com.alibaba.cloud.ai.graph.state.Reducer;

// 1. 创建一个智能统计聚合器 Reducer
Reducer<Map<String, Integer>> statsReducer = (oldStats, newStats) -> {
    Map<String, Integer> merged = new HashMap<>(oldStats);
    newStats.forEach((key, value) -> {
        if (key.startsWith("count_")) { // 计数类指标：累加
            merged.merge(key, value, Integer::sum);
        } else if (key.startsWith("max_")) { // 最大值类指标：取最大
            merged.merge(key, value, Integer::max);
        } else { // 其他指标：直接替换
            merged.put(key, value);
        }
    });
    return merged;
};

// 2. 使用 Reducer 创建 Channel
Channel<Map<String, Integer>> statsChannel = Channel.of(statsReducer);

// 3. 将 Channel 包装成 KeyStrategy 在 StateGraph 中使用
KeyStrategy statsStrategy = (oldValue, newValue) -> 
    statsChannel.update("stats", oldValue, newValue);

KeyStrategyFactory factory = KeyStrategy.builder()
    .addStrategy("stats_data", statsStrategy)
    .defaultStrategy(KeyStrategy.REPLACE)
    .build();
```

通过 `Channel` 和 `Reducer`，您可以为工作流的状态管理实现任何复杂度的自定义逻辑，是构建高级 AI 应用的强大工具。
