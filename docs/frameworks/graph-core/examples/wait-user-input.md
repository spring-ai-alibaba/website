---
title: 等待用户输入
description: 实现工作流中等待用户输入的功能，使用中断机制实现人工介入
keywords: [用户输入, Wait User Input, 交互式流程, 中断, 人工介入, Checkpoint]
---

# 等待用户输入

本示例展示如何在 Spring AI Alibaba Graph 中实现等待用户输入的交互式工作流。

## 定义带中断的 Graph

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edgeasync;

// 定义状态类
public class InteractiveState extends OverAllState {

    public InteractiveState(Map<String, Object> initData) {
        super(initData);
    }

    public Optional<String> humanFeedback() {
        return value("human_feedback");
    }

    public Optional<String> messages() {
        return value("messages");
    }
}

// 定义节点
var step1 = nodeasync(state -> {
    return Map.of("messages", "Step 1");
});

var humanFeedback = nodeasync(state -> {
    return Map.of(); // 等待用户输入，不修改状态
});

var step3 = nodeasync(state -> {
    return Map.of("messages", "Step 3");
});

// 定义条件边
var evalHumanFeedback = edgeasync(state -> {
    var feedback = ((InteractiveState)state).humanFeedback().orElse("unknown");
    return (feedback.equals("next") || feedback.equals("back")) ? feedback : "unknown";
});

// 配置 KeyStrategyFactory
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
    keyStrategyHashMap.put("messages", new AppendStrategy());
    keyStrategyHashMap.put("human_feedback", new ReplaceStrategy());
    return keyStrategyHashMap;
};

// 构建 Graph
StateGraph builder = new StateGraph(keyStrategyFactory)
    .addNode("step_1", step1)
    .addNode("human_feedback", humanFeedback)
    .addNode("step_3", step3)
    .addEdge(StateGraph.START, "step_1")
    .addEdge("step_1", "human_feedback")
    .addConditionalEdges("human_feedback", evalHumanFeedback,
        Map.of("back", "step_1", "next", "step_3", "unknown", "human_feedback"))
    .addEdge("step_3", StateGraph.END);

// 配置内存保存器和中断点
var saver = new MemorySaver();

var compileConfig = CompileConfig.builder()
    .checkpointSaver(saver)
    .interruptBefore("human_feedback") // 在 human_feedback 节点前中断
    .build();

CompiledGraph graph = builder.compile(compileConfig);
```

## 执行 Graph 直到中断

```java
// 初始输入
Map<String, Object> initialInput = Map.of("messages", "Step 0");

// 配置线程 ID
var invokeConfig = RunnableConfig.builder()
    .threadId("Thread1")
    .build();

// 运行 Graph 直到第一个中断点
for (var event : graph.stream(initialInput, invokeConfig)) {
    System.out.println(event);
}
```

**输出**:
```
NodeOutput{node=__START__, state={messages=[Step 0]}}
NodeOutput{node=step_1, state={messages=[Step 0, Step 1]}}
```

## 等待用户输入并更新状态

```java
// 检查当前状态
System.out.printf("--State before update--\n%s\n", graph.getState(invokeConfig));

// 模拟用户输入
var userInput = "back"; // "back" 表示返回上一个节点
System.out.printf("\n--User Input--\n用户选择: '%s'\n\n", userInput);

// 更新状态（模拟 human_feedback 节点的输出）
var updateConfig = graph.updateState(invokeConfig, Map.of("human_feedback", userInput), null);

// 检查更新后的状态
System.out.printf("--State after update--\n%s\n", graph.getState(invokeConfig));

// 检查下一个要执行的节点
System.out.printf("\ngetNext()\n\twith invokeConfig:[%s]\n\twith updateConfig:[%s]\n",
    graph.getState(invokeConfig).getNext(),
    graph.getState(updateConfig).getNext());
```

**输出**:
```
--State before update--
StateSnapshot{node=step_1, state={messages=[Step 0, Step 1]}, config=RunnableConfig{ threadId=Thread1, nextNode=human_feedback }}

--User Input--
用户选择: 'back'

--State after update--
StateSnapshot{node=step_1, state={messages=[Step 0, Step 1], human_feedback=back}, config=RunnableConfig{ threadId=Thread1, nextNode=human_feedback }}

getNext()
	with invokeConfig:[human_feedback]
	with updateConfig:[human_feedback]
```

## 继续执行 Graph

```java
// 继续执行 Graph
for (var event : graph.stream(null, updateConfig)) {
    System.out.println(event);
}
```

**输出**:
```
NodeOutput{node=human_feedback, state={messages=[Step 0, Step 1], human_feedback=back}}
NodeOutput{node=step_1, state={messages=[Step 0, Step 1], human_feedback=back}}
```

## 第二次等待用户输入

```java
var userInput = "next"; // "next" 表示继续下一个节点
System.out.printf("\n--User Input--\n用户选择: '%s'\n", userInput);

// 更新状态
var updateConfig = graph.updateState(invokeConfig, Map.of("human_feedback", userInput), null);

System.out.printf("\ngetNext()\n\twith invokeConfig:[%s]\n\twith updateConfig:[%s]\n",
    graph.getState(invokeConfig).getNext(),
    graph.getState(updateConfig).getNext());
```

## 继续执行直到完成

```java
// 继续执行 Graph
for (var event : graph.stream(null, updateConfig)) {
    System.out.println(event);
}
```

**输出**:
```
NodeOutput{node=human_feedback, state={messages=[Step 0, Step 1], human_feedback=next}}
NodeOutput{node=step_3, state={messages=[Step 0, Step 1, Step 3], human_feedback=next}}
NodeOutput{node=__END__, state={messages=[Step 0, Step 1, Step 3], human_feedback=next}}
```

## 应用场景

- 需要人工审核的审批流程
- 需要用户确认的关键操作
- 交互式对话系统
- 多步骤表单填写

## 相关文档

- [Checkpoint 机制](../core/checkpoint-postgres) - 状态持久化
- [快速入门](../quick-start) - Graph 基础使用

