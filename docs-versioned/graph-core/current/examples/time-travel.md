---
title: 时光旅行 - 状态历史回溯
description: 学习如何在Spring AI Alibaba Graph中实现时光旅行，回溯和恢复历史状态
keywords: [时光旅行, Time Travel, 状态历史, 回溯, Checkpoint, StateHistory]
---

# 时光旅行 - 状态历史回溯

Spring AI Alibaba Graph 支持时光旅行功能，允许您查看和恢复 Graph 执行的历史状态。

## 配置 Checkpoint

要启用时光旅行，需要配置 Checkpointer：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateSnapshot;
import java.util.List;

// 创建 Checkpointer
var checkpointer = new MemorySaver();

// 配置持久化
var compileConfig = CompileConfig.builder()
    .checkpointSaver(checkpointer)
    .build();

CompiledGraph graph = stateGraph.compile(compileConfig);
```

## 执行 Graph 并生成历史

```java
// 配置线程 ID
var config = RunnableConfig.builder()
    .threadId("conversation-1")
    .build();

// 执行 Graph
Map<String, Object> input = Map.of("query", "Hello");
OverAllState result = graph.invoke(input, config);

// 再次执行
result = graph.invoke(Map.of("query", "Follow-up question"), config);
```

## 查看状态历史

```java
// 获取所有历史状态
List<StateSnapshot> history = graph.getStateHistory(config);

System.out.println("State history:");
for (int i = 0; i < history.size(); i++) {
    StateSnapshot snapshot = history.get(i);
    System.out.printf("Step %d: %s\n", i, snapshot.state());
    System.out.printf("  Checkpoint ID: %s\n", snapshot.config().checkpointId());
    System.out.printf("  Node: %s\n", snapshot.node());
}
```

**输出示例**:
```
State history:
Step 0: {query=Follow-up question, answer=Response to follow-up}
  Checkpoint ID: abc123
  Node: answer_node
Step 1: {query=Hello, answer=Initial response}
  Checkpoint ID: def456
  Node: answer_node
Step 2: {query=Hello}
  Checkpoint ID: ghi789
  Node: __START__
```

## 回溯到历史状态

```java
// 获取特定的历史状态
StateSnapshot historicalSnapshot = history.get(1);

// 使用历史状态的 checkpoint ID 创建新配置
var historicalConfig = RunnableConfig.builder()
    .threadId("conversation-1")
    .checkpointId(historicalSnapshot.config().checkpointId())
    .build();

// 从历史状态继续执行
OverAllState restored = graph.invoke(
    Map.of("query", "New question from historical state"),
    historicalConfig
);
```

## 分支创建

基于历史状态创建新的执行分支：

```java
// 从历史状态创建新分支
var branchConfig = RunnableConfig.builder()
    .threadId("conversation-1-branch")  // 新的线程 ID
    .checkpointId(historicalSnapshot.config().checkpointId())
    .build();

// 在新分支上执行
OverAllState branchResult = graph.invoke(
    Map.of("query", "Alternative path"),
    branchConfig
);
```

## 应用场景

1. **A/B 测试**: 从相同起点测试不同路径
2. **错误恢复**: 回溯到错误发生前的状态
3. **调试分析**: 检查每个步骤的状态变化
4. **用户撤销**: 允许用户撤销操作
5. **实验对比**: 比较不同决策的结果

## 状态快照信息

`StateSnapshot` 包含以下信息：

```java
public interface StateSnapshot {
    // 状态数据
    Map<String, Object> state();

    // 检查点配置
    RunnableConfig config();

    // 执行的节点名称
    String node();

    // 下一个要执行的节点
    String getNext();
}
```

## 完整示例

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

// 构建 Graph
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", new AppendStrategy());
    strategies.put("step", new ReplaceStrategy());
    return strategies;
};

StateGraph builder = new StateGraph(keyStrategyFactory)
    .addNode("step1", nodeasync(state ->
        Map.of("messages", "Step 1", "step", 1)))
    .addNode("step2", nodeasync(state ->
        Map.of("messages", "Step 2", "step", 2)))
    .addNode("step3", nodeasync(state ->
        Map.of("messages", "Step 3", "step", 3)))
    .addEdge(StateGraph.START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", "step3")
    .addEdge("step3", StateGraph.END);

// 配置持久化
var checkpointer = new MemorySaver();
var compileConfig = CompileConfig.builder()
    .checkpointSaver(checkpointer)
    .build();

CompiledGraph graph = builder.compile(compileConfig);

// 执行
var config = RunnableConfig.builder()
    .threadId("demo")
    .build();

graph.invoke(Map.of(), config);

// 查看历史
List<StateSnapshot> history = graph.getStateHistory(config);
history.forEach(snapshot -> {
    System.out.println("State: " + snapshot.state());
    System.out.println("Node: " + snapshot.node());
    System.out.println("---");
});

// 回溯到 step1
StateSnapshot step1Snapshot = history.stream()
    .filter(s -> "step1".equals(s.node()))
    .findFirst()
    .orElseThrow();

var replayConfig = RunnableConfig.builder()
    .threadId("demo")
    .checkpointId(step1Snapshot.config().checkpointId())
    .build();

// 从 step1 重新执行
graph.invoke(Map.of(), replayConfig);
```

## 注意事项

1. **性能考虑**: 历史记录会占用内存，生产环境建议使用持久化存储
2. **数据一致性**: 确保状态数据可序列化
3. **版本兼容**: Graph 结构改变时历史状态可能不兼容
4. **清理策略**: 定期清理旧的历史记录

## 相关文档

- [持久化](./persistence) - 状态持久化
- [等待用户输入](./wait-user-input) - 中断和恢复
- [Checkpoint 机制](../core/checkpoint-postgres) - 检查点详解
- [快速入门](../quick-start) - Graph 基础使用

