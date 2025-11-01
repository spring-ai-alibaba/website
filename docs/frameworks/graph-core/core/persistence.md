---
title: 持久化
description: 使用 Spring AI Alibaba Graph 框架持久化和管理工作流状态，实现跨执行的状态保持
keywords: [Spring AI Alibaba, Checkpoint, 检查点, 持久化, 状态管理, 工作流状态]
---

# 持久化

Spring AI Alibaba Graph 具有内置的持久化层，通过检查点（Checkpointers）实现。当您使用检查点编译图时，检查点会在每个超级步骤（super-step）保存图状态的`检查点`。这些检查点保存到一个`线程`（thread）中，可以在图执行后访问。由于`线程`允许在执行后访问图的状态，因此几个强大的功能都成为可能，包括人在回路中（human-in-the-loop）、内存、时间旅行和容错能力。下面，我们将详细讨论这些概念。

<img src="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=966566aaae853ed4d240c2d0d067467c" alt="Checkpoints" data-og-width="2316" width="2316" data-og-height="748" height="748" data-path="oss/images/checkpoints.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=7bb8525bfcd22b3903b3209aa7497f47 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e8d07fc2899b9a13c7b00eb9b259c3c9 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=46a2f9ed3b131a7c78700711e8c314d6 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=c339bd49757810dad226e1846f066c94 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=8333dfdb9d766363f251132f2dfa08a1 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=33ba13937eed043ba4a7a87b36d3046f 2500w" />

## 线程（Threads）

线程是分配给检查点器保存的每个检查点的唯一 ID 或线程标识符。它包含一系列运行的累积状态。当执行运行时，图的底层状态将被持久化到线程。

当使用检查点调用图时，您**必须**在配置的 `configurable` 部分指定一个 `thread_id`。

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("1")
    .build();
```

可以检索线程的当前和历史状态。要持久化状态，必须在执行运行之前创建线程。

## 检查点（Checkpoints）

线程在特定时间点的状态称为检查点。检查点是在每个超级步骤保存的图状态快照，由 `StateSnapshot` 对象表示，具有以下关键属性：

* `config`: 与此检查点关联的配置。
* `metadata`: 与此检查点关联的元数据。
* `values`: 此时状态通道的值。
* `next`: 图中下一个要执行的节点名称元组。
* `tasks`: 包含有关下一个要执行的任务的信息的 `PregelTask` 对象元组。

检查点是持久化的，可以用于在稍后的时间恢复线程的状态。

让我们看看当一个简单的图被调用时保存了哪些检查点：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

// 定义状态策略
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("foo", new ReplaceStrategy());
    keyStrategyMap.put("bar", new AppendStrategy());
    return keyStrategyMap;
};

// 定义节点操作
var nodeA = node_async(state -> {
    return Map.of("foo", "a", "bar", List.of("a"));
});

var nodeB = node_async(state -> {
    return Map.of("foo", "b", "bar", List.of("b"));
});

// 创建图
StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("node_a", nodeA)
    .addNode("node_b", nodeB)
    .addEdge(START, "node_a")
    .addEdge("node_a", "node_b")
    .addEdge("node_b", END);

// 配置检查点
SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, new MemorySaver())
    .build();

// 编译图
CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);

// 运行图
RunnableConfig config = RunnableConfig.builder()
    .threadId("1")
    .build();

Map<String, Object> input = new HashMap<>();
input.put("foo", "");

graph.invoke(input, config);
```

运行图后，我们期望看到恰好 4 个检查点：

* 空检查点，`START` 作为下一个要执行的节点
* 带有用户输入 `{'foo': '', 'bar': []}` 和 `node_a` 作为下一个要执行的节点的检查点
* 带有 `node_a` 的输出 `{'foo': 'a', 'bar': ['a']}` 和 `node_b` 作为下一个要执行的节点的检查点
* 带有 `node_b` 的输出 `{'foo': 'b', 'bar': ['a', 'b']}` 且没有下一个要执行的节点的检查点

请注意，`bar` 通道值包含两个节点的输出，因为我们对 `bar` 通道使用了追加策略（AppendStrategy）。

### 获取状态

当与保存的图状态交互时，您**必须**指定一个[线程标识符](#线程threads)。您可以通过调用 `graph.getState(config)` 来查看图的*最新*状态。这将返回一个 `StateSnapshot` 对象，该对象对应于与配置中提供的线程 ID 关联的最新检查点，或者如果提供了检查点 ID，则对应于该线程的检查点。

```java
// 获取最新的状态快照
RunnableConfig config = RunnableConfig.builder()
    .threadId("1")
    .build();
StateSnapshot stateSnapshot = graph.getState(config);

// 获取特定 checkpoint_id 的状态快照
RunnableConfig configWithCheckpoint = RunnableConfig.builder()
    .threadId("1")
    .checkpointId("1ef663ba-28fe-6528-8002-5a559208592c")
    .build();
StateSnapshot specificSnapshot = graph.getState(configWithCheckpoint);
```

### 获取状态历史

您可以通过调用 `graph.getStateHistory(config)` 来获取给定线程的图执行的完整历史记录。这将返回与配置中提供的线程 ID 关联的 `StateSnapshot` 对象列表。重要的是，检查点将按时间顺序排序，最近的检查点/`StateSnapshot` 在列表的第一个位置。

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("1")
    .build();

List<StateSnapshot> history = graph.getStateHistory(config);
for (StateSnapshot snapshot : history) {
    System.out.println("State: " + snapshot.state());
    System.out.println("Next nodes: " + snapshot.next());
}
```

<img src="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=38ffff52be4d8806b287836295a3c058" alt="State" data-og-width="2692" width="2692" data-og-height="1056" height="1056" data-path="oss/images/get_state.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e932acac5021614d0eb99b90e54be004 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=2eaf153fd49ba728e1d679c12bb44b6f 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=0ac091c7dbe8b1f0acff97615a3683ee 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=9921a482f1c4f86316fca23a5150b153 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=9412cd906f6d67a9fe1f50a5d4f4c674 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=ccc5118ed85926bda3715c81ce728fcc 2500w" />

### 重放（Replay）

也可以重放先前的图执行。如果我们使用 `thread_id` 和 `checkpoint_id` 调用图的 `invoke` 方法，那么我们将*重放*之前执行的步骤（在对应于 `checkpoint_id` 的检查点*之前*），并且只执行检查点*之后*的步骤。

* `thread_id` 是线程的 ID。
* `checkpoint_id` 是指线程内特定检查点的标识符。

当调用图时，您必须将这些作为配置的 `configurable` 部分传递：

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("1")
    .checkpointId("0c62ca34-ac19-445d-bbb0-5b4984975b2a")
    .build();

graph.invoke(null, config);
```

重要的是，Spring AI Alibaba Graph 知道某个特定步骤是否之前已执行过。如果已执行，框架只是*重放*图中的该特定步骤，而不重新执行该步骤，但仅适用于提供的 `checkpoint_id` *之前*的步骤。`checkpoint_id` *之后*的所有步骤都将被执行（即新的分支），即使它们之前已被执行。

<img src="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=d7b34b85c106e55d181ae1f4afb50251" alt="Replay" data-og-width="2276" width="2276" data-og-height="986" height="986" data-path="oss/images/re_play.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=627d1fb4cb0ce3e5734784cc4a841cca 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=ab462e9559619778d1bdfced578ee0ba 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=7cc304a2a0996e22f783e9a5f7a69f89 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=b322f66ef96d6734dcac38213104f080 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=922f1b014b33fae4fda1e576d57a9983 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=efae9196c69a2908846c9d23ad117a90 2500w" />

### 更新状态

除了从特定`检查点`重放图之外，我们还可以*编辑*图状态。我们使用 `graph.updateState()` 来实现此目的。此方法接受三个不同的参数：

#### `config`

配置应包含 `thread_id` 指定要更新的线程。当只传递 `thread_id` 时，我们更新（或分叉）当前状态。可选地，如果我们包含 `checkpoint_id` 字段，那么我们分叉该选定的检查点。

#### `values`

这些是将用于更新状态的值。请注意，此更新的处理方式与来自节点的任何更新的处理方式完全相同。这意味着这些值将传递给状态策略函数（如果为图状态中的某些通道定义了它们）。这意味着 `updateState` 不会自动覆盖每个通道的通道值，而只会覆盖没有归约器的通道。让我们通过一个示例来说明。

假设您使用以下 schema 定义了图的状态：

```java
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("foo", new ReplaceStrategy());  // 替换策略
    keyStrategyMap.put("bar", new AppendStrategy());   // 追加策略
    return keyStrategyMap;
};
```

现在假设图的当前状态是

```
{"foo": 1, "bar": ["a"]}
```

如果您按如下方式更新状态：

```java
Map<String, Object> updates = new HashMap<>();
updates.put("foo", 2);
updates.put("bar", List.of("b"));

graph.updateState(config, updates);
```

那么图的新状态将是：

```
{"foo": 2, "bar": ["a", "b"]}
```

`foo` 键（通道）被完全更改（因为该通道没有指定归约器，所以 `updateState` 覆盖它）。但是，为 `bar` 键指定了归约器（AppendStrategy），因此它将 `"b"` 追加到 `bar` 的状态。

#### `asNode`

在调用 `updateState` 时，您可以选择指定的最后一件事是 `asNode`。如果您提供了它，更新将被应用为好像它来自节点 `asNode`。如果未提供 `asNode`，它将设置为最后一个更新状态的节点（如果不模糊）。这很重要，因为下一步要执行的步骤取决于最后一个给出更新的节点，因此这可以用于控制接下来执行哪个节点。

<img src="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=a52016b2c44b57bd395d6e1eac47aa36" alt="Update" data-og-width="3705" width="3705" data-og-height="2598" height="2598" data-path="oss/images/checkpoints_full_story.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=06de1669d4d62f0e8013c4ffef021437 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=b149bed4f842c4f179e55247a426befe 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=58cfc0341a77e179ce443a89d667784c 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=29776799d5a22c3aec7d4a45f675ba14 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=5600d9dd7c52dda79e4eb240c344f84a 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e428c9c4fc060579c0b7fead1d4a54cb 2500w" />

## 内存存储（Memory Store）

<img src="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=354526fb48c5eb11b4b2684a2df40d6c" alt="Model of shared state" data-og-width="1482" width="1482" data-og-height="777" height="777" data-path="oss/images/shared_state.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=1965b83f077aea6301b95b59a9a1e318 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=02898a7498e355e04919ac4121678179 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=4ef92e64d1151922511c78afde7abdca 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=abddd799a170aa9af9145574e46cff6f 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=14025324ecb0c462ee1919033d2ae9c5 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=a4f7989c4392a7ba8160f559d6fd8942 2500w" />

状态 schema 指定了在执行图时填充的一组键。如上所述，状态可以由检查点器在每个图步骤写入线程，从而实现状态持久化。

但是，如果我们想在*跨线程*保留某些信息怎么办？考虑聊天机器人的情况，我们希望在该用户的*所有*聊天对话（例如线程）中保留有关用户的特定信息！

仅使用检查点器，我们无法跨线程共享信息。这就是对内存存储接口的需求。作为说明，我们可以定义一个内存存储来存储跨线程的用户信息。

## 检查点器实现

Spring AI Alibaba 提供了多种检查点器实现：

### MemorySaver

内存检查点器，将检查点保存在内存中：

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, new MemorySaver())
    .build();
```

### PostgreSqlSaver

PostgreSQL 数据库检查点器，详见 [PostgreSQL 检查点持久化](./checkpoint-postgres.md)。

### RedisSaver

Redis 检查点器，将检查点保存到 Redis 中。

通过这些检查点器，您可以实现状态的持久化、人在回路中、时间旅行等强大功能。
