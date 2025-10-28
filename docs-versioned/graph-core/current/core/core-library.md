---
title: 核心库概念指南
description: 深入了解 Spring AI Alibaba Graph 核心概念，包括状态管理、节点和边的定义
keywords: [Spring AI Alibaba, Graph, 核心概念, State, Nodes, Edges, 状态管理, 工作流]
---

# 核心库：概念指南

## 图（Graphs）

Spring AI Alibaba Graph 将智能体工作流建模为图。您可以使用三个关键组件来定义智能体的行为：

1. [State](#state状态)：共享的数据结构，表示应用程序的当前快照。它由 `OverAllState` 对象表示。

2. [Nodes](#节点nodes)：一个**函数式接口** (`AsyncNodeAction`)，编码智能体的逻辑。它们接收当前的 `State` 作为输入，执行一些计算或副作用，并返回更新后的 `State`。

3. [Edges](#边edges)：一个**函数式接口** (`AsyncEdgeAction`)，根据当前的 `State` 确定接下来执行哪个 `Node`。它们可以是条件分支或固定转换。

通过组合 `Nodes` 和 `Edges`，您可以创建复杂的循环工作流，随时间演化 `State`。真正的力量来自于 Spring AI Alibaba 如何管理 `State`。
需要强调的是：`Nodes` 和 `Edges` 就像函数一样 - 它们可以包含 LLM 调用或只是 Java 代码。

简而言之：_节点完成工作，边决定下一步做什么_。

### StateGraph

`StateGraph` 类是使用的主要图类。它通过用户定义的状态策略进行参数化。

### 编译图

要构建您的图，首先定义 [state](#state状态)，然后添加 [nodes](#节点nodes) 和 [edges](#边edges)，最后编译它。编译图是什么意思？为什么需要编译？

编译是一个非常简单的步骤。它提供了对图结构的一些基本检查（没有孤立节点等）。这也是您可以指定运行时参数（如检查点器和中断点）的地方。您只需调用 `.compile()` 方法来编译图：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;

// 编译您的图
CompiledGraph graph = stateGraph.compile();
```

在使用图之前，您**必须**编译它。


The first thing you do when you define a graph is define the `State` of the graph. The `State` consists of the [schema of the graph](#schema) as well as [reducer](#reducers) functions which specify how to apply updates to the state. The schema of the `State` will be the input schema to all `Nodes` and `Edges` in the graph, and should be defined using a map of  [`Channel`] object. All `Nodes` will emit updates to the `State` which are then applied using the specified `reducer` function.

### Schema
## State（状态）
The way to specify the schema of a graph is by defining map of [Channel] objects where each key is an item in the state.
定义图时首先要做的是定义图的 `State`。`State` 由[图的 schema](#schema) 以及 [reducer](#reducers) 函数组成，reducer 函数指定如何将更新应用于状态。`State` 的 schema 将是图中所有 `Nodes` 和 `Edges` 的输入 schema，应使用 `KeyStrategyFactory` 定义。所有 `Nodes` 将发出对 `State` 的更新，然后使用指定的 `reducer` 函数应用这些更新。

### Schema（模式）

在 Spring AI Alibaba 中，可以通过 `KeyStrategyFactory` 定义状态的更新策略。每个键都可以指定自己的更新策略（如替换或追加）。
如果没有为某个键指定策略，则默认假定该键的所有更新都应覆盖它。
**Example A:**
### Reducers（归约器）
```java
[Reducers][KeyStrategy] 是理解如何将节点的更新应用到 `State` 的关键。`State` 中的每个键都有自己独立的 reducer 函数。如果没有显式指定 reducer 函数，则假定该键的所有更新都应覆盖它。让我们看几个例子来更好地理解它们。

**示例 A:**
            "messages", Channels.appender(ArrayList::new)
    );
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;

private static KeyStrategyFactory createKeyStrategyFactory() {
    return () -> {
        Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
        keyStrategyMap.put("messages", new AppendStrategy());
        return keyStrategyMap;
    };

### AppenderChannel
var graphBuilder = new StateGraph(createKeyStrategyFactory());

<a id="remove-messages"></a>
### AppendStrategy（追加策略）

#### 删除消息

[AppendStrategy] 支持通过 [RemoveByHash] 删除消息。

Langgraph4j provides a Built in [AppederChannel.RemoveIdentifier] named [RemoveByHash] that allow to remove messages comparing their `hashCode`, below an example of its usage:

Spring AI Alibaba 提供了内置的 [RemoveByHash]，允许通过比较其 `hashCode` 来删除消息，下面是其用法示例：
var workflow = new StateGraph<>(MessagesState.SCHEMA, MessagesState::new)
        .addNode("agent_1", node_async(state -> Map.of("messages", "message1")))
import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import com.alibaba.cloud.ai.graph.state.RemoveByHash;

var workflow = new StateGraph(createKeyStrategyFactory())
        .addNode("agent_3", node_async(state ->
            Map.of("messages", ReplaceAllWith.of( List.of("a1", "a2"))) // this replace current messages values with ["a1", "a2"]
        ))
            Map.of("messages", RemoveByHash.of("message2.1")) // 从消息值中删除 "message2.1"
        .addEdge("agent_2", "agent_3")
        .addEdge(START, "agent_1")
        .addEdge("agent_3", END);

```

### Custom Reducer

You can also specify a custom reducer for a particular state property

**Example B:**

```java
static class MyState extends AgentState {

    static Map<String, Channel<?>> SCHEMA = Map.of(
            "property", Channel.<String>of( ( oldValue, newValue ) -> newValue.toUpperCase() )
    );
}

var graphBuilder = new StateGraph<>( MessagesState.SCHEMA, MyState::new)
### 自定义 Reducer
```
您也可以为特定的状态属性指定自定义的 reducer
### Serializer
**示例 B:**
During graph execution the state needs to be serialized (mostly for cloning purpose) also for providing ability to persist the state across different executions. To do this we have provided a new streighforward implementation based on [Serializer] interface.

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;

private static KeyStrategyFactory createCustomKeyStrategyFactory() {
    return () -> {
        Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
        keyStrategyMap.put("property", (oldValue, newValue) ->
            ((String) newValue).toUpperCase()
        );
        return keyStrategyMap;
    };
```

1. Manage nullable value in serialization process
### 序列化器（Serializer）
- [x] Allow to plug also different serialization techniques
在图执行期间，状态需要被序列化（主要用于克隆目的），同时也为跨不同执行持久化状态提供能力。Spring AI Alibaba 提供了基于 [PlainTextStateSerializer] 接口的直接实现。
Currently the main class for state's serialization using built-in java stream is [ObjectStreamStateSerializer]. It is also available an abstraction allowing to plug serialization techniques text based like `JSON` and/or `YAML` that is [PlainTextStateSerializer].
#### 为什么需要序列化框架？
There are several provided Serializers out-of-the-box:
1. 不依赖不安全的标准序列化框架
2. 允许为第三方（非可序列化）类实现序列化
3. 尽可能避免类加载问题
4. 在序列化过程中管理可空值
 class | description
#### 特性
`MapSerializer` | built-in `Map<String,Object>` serializer
- [x] 允许使用 Java 内置标准二进制序列化技术进行序列化
- [x] 允许插入不同的序列化技术
`AiMessageSerializer` | langchain4j `AiMessage` Serializer
当前，使用内置 Java 流进行状态序列化的主要类是 [PlainTextStateSerializer]。它支持基于文本的序列化技术，如 `JSON` 和 `YAML`。

```java
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

public class State extends AgentState {

  public State(Map<String, Object> initData) {
    super( initData  );
  }

  Optional<String> input() { return value("input"); } 
  Optional<String> results() { return value("results"); } 
 
}

AsyncNodeAction<State> myNode = node_async(state -> {
    System.out.println( "In myNode: " );
    return Map.of( results: "Hello " + state.input().orElse( "" ) );  
});

AsyncNodeAction<State> myOtherNode = node_async(state -> state);
```

## 节点（Nodes）
var builder = new StateGraph( State::new )
在 Spring AI Alibaba 中，节点通常是一个**函数式接口** ([AsyncNodeAction])，其参数是 [state](#state)，您可以使用 [addNode] 方法将这些节点添加到图中：

Since [AsyncNodeAction] is designed to work with [CompletableFuture], you can use `node_async` static method that adapt it to a simpler syncronous scenario. 

### `START` Node

```java
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import com.alibaba.cloud.ai.graph.StateGraph;
import java.util.Map;

var myNode = node_async(state -> {
    System.out.println("In myNode: ");
    String input = (String) state.value("input").orElse("");
    return Map.of("results", "Hello " + input);
import static org.bsc.langgraph4j.StateGraph.END;

var myOtherNode = node_async(state -> Map.of());
var builder = new StateGraph()
  .addNode("myOtherNode", myOtherNode);
```

## Edges

- **Normal Edges**: 
由于 [AsyncNodeAction] 设计用于与 [CompletableFuture] 一起工作，您可以使用 `node_async` 静态方法将其适配为更简单的同步场景。
- **Conditional Edges**:
  > Call a function to determine which node(s) to go to next.
- **Entry Point**: 
  > Which node to call first when user input arrives.
- **Conditional Entry Point**: 
  > Call a function to determine which node(s) to call first when user input arrives.

<!-- 👉 PARALLEL
 A node can have MULTIPLE outgoing edges. If a node has multiple out-going edges, **all** of those destination nodes will be executed in parallel as a part of the next superstep. -->

### Normal Edges

If you **always** want to go from node A to node B, you can use the [addEdge] method directly.

### `START` 节点
// add a normal edge
`START` 节点是一个特殊节点，表示将用户输入发送到图的节点。引用此节点的主要目的是确定首先应该调用哪些节点。

```java
import static com.alibaba.cloud.ai.graph.StateGraph.START;
```

### Conditional Edges

If you want to **optionally** route to 1 or more edges (or optionally terminate), you can use the [addConditionalEdges] method. This method accepts the name of a node and a **Functional Interface** ([AsyncEdgeAction]) that will be used as " routing function" to call after that node is executed:


### `END` 节点
graph.addConditionalEdges("nodeA", routingFunction, Map.of( "first": "nodeB", "second": "nodeC" ) );
`END` 节点是一个特殊节点，表示终端节点。当您想要表示哪些边在完成后没有任何操作时，会引用此节点。

Similar to nodes, the `routingFunction` accept the current `state` of the graph and return a string value.
import static com.alibaba.cloud.ai.graph.StateGraph.END;
<!-- By default, the return value `routingFunction` is used as the name of the node (or an array of nodes) to send the state to next. All those nodes will be run in parallel as a part of the next superstep. -->

You must provide an object that maps the `routingFunction`'s output to the name of the next node.
## 边（Edges）
<a id="entry-point"></a>
边定义了逻辑如何路由以及图如何决定停止。这是智能体工作方式和不同节点之间如何通信的重要部分。有几种关键类型的边：

- **普通边（Normal Edges）**：
  > 直接从一个节点到下一个节点。
- **条件边（Conditional Edges）**：
  > 调用函数来确定接下来要去哪个节点。
- **入口点（Entry Point）**：
  > 当用户输入到达时首先调用哪个节点。
- **条件入口点（Conditional Entry Point）**：
  > 调用函数来确定当用户输入到达时首先调用哪个节点。

```java
### 普通边
import static org.bsc.langgraph4j.utils.CollectionsUtils.mapOf;
如果您**总是**想从节点 A 到节点 B，可以直接使用 [addEdge] 方法。
graph.addConditionalEdges(START, routingFunction, Map.of( "first": "nodeB", "second": "nodeC" ) );
```
// 添加普通边
You must provide an object that maps the `routingFunction`'s output to the name of the next node.

<!-- 
## `Send`
### 条件边
By default, `Nodes` and `Edges` are defined ahead of time and operate on the same shared state. However, there can be cases where the exact edges are not known ahead of time and/or you may want different versions of `State` to exist at the same time. A common of example of this is with `map-reduce` design patterns. In this design pattern, a first node may generate an array of objects, and you may want to apply some other node to all those objects. The number of objects may be unknown ahead of time (meaning the number of edges may not be known) and the input `State` to the downstream `Node` should be different (one for each generated object).
如果您想**有选择地**路由到一个或多个边（或有选择地终止），可以使用 [addConditionalEdges] 方法。此方法接受节点的名称和一个**函数式接口** ([AsyncEdgeAction])，该接口将用作"路由函数"，在该节点执行后调用：
To support this design pattern, LangGraph4j supports returning [Send](/langgraphjs/reference/classes/langgraph.Send.html) objects from conditional edges. `Send` takes two arguments: first is the name of the node, and second is the state to pass to that node.

import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;
  return state.subjects.map((subject) => new Send("generate_joke", { subject }));
graph.addConditionalEdges("nodeA", edge_async(state -> "nodeB"),
    Map.of("nodeB", "nodeB", "nodeC", "nodeC"));
```

与节点类似，`routingFunction` 接受图的当前 `state` 并返回一个字符串值。
```
您必须提供一个对象，将 `routingFunction` 的输出映射到下一个节点的名称。

## Checkpointer
### 入口点
LangGraph4j has a built-in persistence layer, implemented through [Checkpointers]. When you use a checkpointer with a graph, you can interact with the state of that graph. When you use a checkpointer with a graph, you can interact with and manage the graph's state. The checkpointer saves a _checkpoint_ of the graph state at every step, enabling several powerful capabilities:
入口点是图启动时运行的第一个节点。您可以使用虚拟 `START` 节点的 [addEdge] 方法到第一个要执行的节点来指定进入图的位置。
First, checkpointers facilitate **human-in-the-loop workflows**<!--[human-in-the-loop workflows](agentic_concepts.md#human-in-the-loop)--> workflows by allowing humans to inspect, interrupt, and approve steps. Checkpointers are needed for these workflows as the human has to be able to view the state of a graph at any point in time, and the graph has to be to resume execution after the human has made any updates to the state.

```java
import static com.alibaba.cloud.ai.graph.StateGraph.START;
```

See [this guide](../how-tos/persistence.ipynb) for how to add a checkpointer to your graph.


## Threads
### 条件入口点
Threads enable the checkpointing of multiple different runs, making them essential for multi-tenant chat applications and other scenarios where maintaining separate states is necessary. A thread is a unique ID assigned to a series of checkpoints saved by a checkpointer. When using a checkpointer, you must specify a `thread_id` when running the graph.
条件入口点允许您根据自定义逻辑从不同的节点开始。您可以从虚拟 `START` 节点使用 [addConditionalEdges] 来实现此目的。
`thread_id` is simply the ID of a thread. This is always required

```java
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

graph.addConditionalEdges(START, edge_async(state -> "nodeB"),
    Map.of("nodeB", "nodeB", "nodeC", "nodeC"));
var config = RunnableConfig.builder()
                                  .threadId("a")
您必须提供一个对象，将 `routingFunction` 的输出映射到下一个节点的名称。
graph.invoke(inputs, config);
```

See [this guide](../how-tos/persistence.ipynb) for how to use threads.

<a id="checkpointer-state"></a>

## Checkpointer state

When interacting with the checkpointer state, you must specify a [thread identifier](#threads). Each checkpoint saved by the checkpointer has two properties:

- **state**: This is the value of the state at this point in time.
- **nextNodeId**: This is the Idenfier of the node to execute next in the graph.


<a id="get-state"></a>

## Checkpointer（检查点）

Spring AI Alibaba 具有内置的持久化层，通过 Checkpointers 实现。当您将 checkpointer 与图一起使用时，可以与图的状态进行交互。checkpointer 在每一步保存图状态的_检查点_，实现几个强大的功能：

首先，checkpointers 通过允许人类检查、中断和批准步骤来促进**人机协作工作流**。这些工作流需要 checkpointers，因为人类必须能够在任何时间点查看图的状态，并且图必须能够在人类对状态进行任何更新后恢复执行。

其次，它允许在交互之间保持"记忆"。您可以使用 checkpointers 创建线程并在图执行后保存线程的状态。在重复的人类交互（如对话）的情况下，任何后续消息都可以发送到该检查点，它将保留之前的记忆。

有关如何向图添加 checkpointer 的信息，请参阅[此指南](../examples/persistence.md)。

## 线程（Threads）
### Update state
线程支持对多个不同运行进行检查点，这对于多租户聊天应用程序和其他需要维护独立状态的场景至关重要。线程是分配给 checkpointer 保存的一系列检查点的唯一 ID。使用 checkpointer 时，必须在运行图时指定 `thread_id`。
You can also interact with the state directly and update it using [graph.updateState(config,values,asNode)].  This takes three different components:
`thread_id` 只是线程的 ID。这始终是必需的。
- `config`
在调用图时，您必须将这些作为配置的可配置部分传递。
- `asNode`

```java
import com.alibaba.cloud.ai.graph.RunnableConfig;
```
**`config`**

                           .threadId("a")
                           .build();
**`values`**

These are the values that will be used to update the state. Note that this update is treated exactly as any update from a node is treated. This means that these values will be passed to the [reducer](#reducers) functions that are part of the state. So this does NOT automatically overwrite the state. 
有关如何使用线程的信息，请参阅[此指南](../examples/persistence.md)。
**`asNode`**

## Checkpointer 状态

与 checkpointer 状态交互时，必须指定[线程标识符](#threads)。checkpointer 保存的每个检查点都有两个属性：
The final thing you specify when calling `updateState` is `asNode`. This update will be applied as if it came from node `asNode`. If `asNode` is null, it will be set to the last node that updated the state, if not ambiguous.
- **state**：这是此时的状态值。
- **nextNodeId**：这是图中接下来要执行的节点的标识符。

## Configuration

### 获取状态

您可以通过调用 `graph.getState(config)` 来获取 checkpointer 的状态。配置应包含 `thread_id`，并将为该线程获取状态。

```typescript
const config = { configurable: { llm: "anthropic" }};
```

### 获取状态历史

```
await graph.invoke(inputs, config);
```

您还可以调用 `graph.getStateHistory(config)` 来获取图的历史记录列表。配置应包含 `thread_id`，并将为该线程获取状态历史记录。

You can then access and use this configuration inside a node:
### 更新状态

您还可以直接与状态交互并使用 `graph.updateState(config, values, asNode)` 更新它。这需要三个不同的组件：
```
  const llmType = config?.configurable?.llm;
  let llm: BaseChatModel;
  if (llmType) {
    const llm = getLlm(llmType);
  }
  ...
};
```
配置应包含指定要更新哪个线程的 `thread_id`。

See [this guide](/langgraph4j/how-tos/langgraph4j-howtos/configuration.html) for a full breakdown on configuration 
这些是将用于更新状态的值。请注意，此更新的处理方式与节点的任何更新完全相同。这意味着这些值将传递给作为状态一部分的 [reducer](#reducers) 函数。因此，这不会自动覆盖状态。

## Breakpoints (AKA interruptions )

调用 `updateState` 时指定的最后一件事是 `asNode`。此更新将应用为好像它来自节点 `asNode`。如果 `asNode` 为 null，它将被设置为更新状态的最后一个节点。
wait for external input before proceeding.

To set breakpoints before or after certain nodes execute. This can be used to wait for human approval before continuing. These can be set when you ["compile" a graph](#compiling-your-graph). 

### Static definition 

You can set breakpoints either _before_ a node executes (using `interruptBefore`) or _after_ a node executes (using `interruptAfter`) adding them on `CompileConfig`.

```java
var compileConfig = CompileConfig.builder()
                    .checkpointSaver(saver)
                    .interruptBefore( "tools")
                    .build();
```

### Dynamic definition

The `org.bsc.langgraph4j.action.InterruptableAction<State>` interface is the core component that enables this functionality. Any node action that implements this interface can conditionally interrupt the graph's execution.

The heart of the interface is the interrupt method:

```java
public interface InterruptableAction<State extends AgentState> {
   /**
    * Determines whether the graph execution should be interrupted at the current node.
    *
    * @param nodeId The identifier of the current node being processed.
    * @param state  The current state of the agent.
    * @return An {@link Optional} containing {@link InterruptionMetadata} if the execution
    *         should be interrupted. Returns an empty {@link Optional} to continue execution.
   */
   Optional<InterruptionMetadata<State>> interrupt(String nodeId, State state );
}
```

**Here’s how it works**:

 * When the graph is about to execute a node, it first checks if the node's action implements InterruptableAction.
 * If it does, the interrupt(String nodeId, State state) method is called.
 * If the method returns a non-empty `Optional<InterruptionMetadata>`, the graph's execution is paused. The InterruptionMetadata object contains information about the
  interruption, which can be sent to an external system or user for review.
 * If the method returns an empty Optional, the node executes normally, and the graph continues its execution without interruption.

---- 

You **MUST** use a [checkpoiner](#checkpointer) when using breakpoints. This is because your graph needs to be able to resume execution.

In order to resume execution, you can just invoke your graph with `GraphInput.resume()` as the input.

```java
// Initial run of graph
graph.stream(inputs, config);

// Let's assume it hit a breakpoint somewhere, you can then resume by passing in None
graph.stream(GraphInput.resume(), config);
```

### Achieve InterruptionMetadata object after interruption

It is most important understand that the **nodes iterator holds the final result of graph execution**. In the case of interruption the `InterruptionMetadata` instance will be set as iterator's result so you can achieve it using : `AsyncGenerator.resultValue(generator)` as shown below
 
```java
var generator = app.stream( inputs );
for (var i : iterator) {
   System.out.println(i);
}
var resultValue = AsyncGenerator.resultValue(generator).orElse(null);

```
> `resultValue` is a generic `Object` that in case of interruptions is an instance of InterruptionMetadata



See [Wait for user Input (HITL)](../how-tos/wait-user-input.ipynb) for a full walkthrough of how to add breakpoints.

## Visualization

It's often nice to be able to visualize graphs, especially as they get more complex. LangGraph4j comes with several built-in ways to visualize graphs using diagram-as-code tools such as [PlantUML] and [Mermaid] through the [graph.getGraph] method. 

```java
// for PlantUML
GraphRepresentation result = app.getGraph(GraphRepresentation.Type.PLANTUML);

System.out.println(result.getContent());

// for Mermaid
GraphRepresentation result = app.getGraph(GraphRepresentation.Type.MERMAID);
System.out.println(result.getContent());

```

<!-- 
There are several different streaming modes that LangGraph4j supports:

- ["values"](/langgraph4j/how-tos/langgraph4j-howtos/stream-values.html): This streams the full value of the state after each step of the graph.
- ["updates](/langgraph4j/how-tos/langgraph4j-howtos/stream-updates.html): This streams the updates to the state after each step of the graph. If multiple updates are made in the same step (e.g. multiple nodes are run) then those updates are streamed separately.

In addition, you can use the [streamEvents](https://v02.api.js.langchain.com/classes/langchain_core_runnables.Runnable.html#streamEvents) method to stream back events that happen _inside_ nodes. This is useful for [streaming tokens of LLM calls](/langgraph4j/how-tos/langgraph4j-howtos/streaming-tokens-without-langchain.html). -->

[Mermaid]: https://mermaid.js.org
[java-async-generator]: https://github.com/bsorrentino/java-async-generator

[PlainTextStateSerializer]: /langgraph4j/apidocs/org/bsc/langgraph4j/serializer/plain_text/PlainTextStateSerializer.html
[ObjectStreamStateSerializer]: /langgraph4j/apidocs/org/bsc/langgraph4j/serializer/std/ObjectStreamStateSerializer.html
[RemoveByHash]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/RemoveByHash.html
[RemoveIdentifier]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/AppenderChannel.RemoveIdentifier.html
[Serializer]: /langgraph4j/apidocs/org/bsc/langgraph4j/serializer/Serializer.html
[Reducer]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/Reducer.html
[AgentState]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/AgentState.html
[StateGraph]: /langgraph4j/apidocs/org/bsc/langgraph4j/StateGraph.html
[Channel]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/Channel.html
[AsyncNodeAction]: /langgraph4j/apidocs/org/bsc/langgraph4j/action/AsyncNodeAction.html
[AsyncEdgeAction]: /langgraph4j/apidocs/org/bsc/langgraph4j/action/AsyncEdgeAction.html
[AppenderChannel]: /langgraph4j/apidocs/org/bsc/langgraph4j/state/AppenderChannel.html
[addNode]: /langgraph4j/apidocs/org/bsc/langgraph4j/StateGraph.html#addNode(java.lang.String,org.bsc.langgraph4j.action.AsyncNodeAction)
## 可视化
[addConditionalEdges]: /langgraph4j/apidocs/org/bsc/langgraph4j/StateGraph.html#addConditionalEdges(java.lang.String,org.bsc.langgraph4j.action.AsyncEdgeAction,java.util.Map)
能够可视化图通常很有用，尤其是当它们变得更复杂时。Spring AI Alibaba 提供了几种内置方式，通过 `graph.getGraph` 方法使用图表即代码工具（如 [PlantUML] 和 [Mermaid]）可视化图。
[Checkpointers]: /langgraph4j/apidocs/org/bsc/langgraph4j/checkpoint/BaseCheckpointSaver.html
[graph.updateState(config,values,asNode)]: /langgraph4j/apidocs/org/bsc/langgraph4j/CompiledGraph.html#updateState(org.bsc.langgraph4j.RunnableConfig,java.util.Map,java.lang.String)
import com.alibaba.cloud.ai.graph.GraphRepresentation;

// 对于 PlantUML
[graph.getGraph]: /langgraph4j/apidocs/org/bsc/langgraph4j/CompiledGraph.html#getGraph(org.bsc.langgraph4j.GraphRepresentation.Type(java.lang.String)
