---
title: 持久化与人机交互
description: 学习如何使用 SAA Graph 的持久化、恢复与人机交互机制，构建能够中断、容错和断点续传的健壮 Agent 工作流。
---

在真实的业务场景中，Agent 工作流可能需要长时间运行，或者在执行过程中等待外部输入（如人类审批）。如果在这期间服务重启或发生故障，我们希望工作流能够从中断的地方继续，而不是从头开始。

SAA Graph 的**持久化与恢复 (Persistence & Resuming)** 机制正是为此而生。它通过将工作流的当前状态保存为**检查点 (Checkpoint)**，实现了强大的断点续传和容错能力，是构建企业级应用和实现复杂人机交互的基础。

## 第一部分：持久化与恢复

### 核心应用场景

-   **长流程任务**: 对于需要数分钟甚至数小时才能完成的复杂任务，可以分步保存进度，即使服务重启也能从上一个检查点恢复。
-   **容错能力**: 在关键业务流程中，每一步都保存检查点。如果某个节点执行失败，可以在修复问题后从失败前的状态恢复，而无需重跑整个流程。
-   **人机交互的基础**: 将当前状态持久化，暂停执行并等待人类输入，然后再从暂停点恢复。

### 实现持久化的三要素

1.  **`Checkpointer` (状态存储器)**: 负责**存储和读取**检查点的组件。它定义了工作流状态被保存在**哪里**（内存、Redis、文件系统等）。
2.  **`CompileConfig` (编译时配置)**: 在编译 `StateGraph` 时，必须提供一个 `Checkpointer` 来**启用**持久化功能。您还可以在这里配置**自动中断点**。
3.  **`RunnableConfig` (运行时标识)**: 在执行图时，您必须通过 `.threadId()` 提供一个**唯一的会话 ID**。这个 ID 是区分不同工作流实例的关键。

### 完整示例：中断与恢复

下面的示例将完整地演示一个工作流如何中断，然后在下一次调用时从中断点自动恢复。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.checkpoint.StateSnapshot;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.consts.SaverConstant;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Map;
import java.util.Optional;

public class PersistenceExample {

    public static void main(String[] args) throws Exception {
        // 1. 定义一个简单的两步工作流
        StateGraph stateGraph = new StateGraph(() -> Map.of("step_result", new ReplaceStrategy()))
            .addNode("step_A", (state) -> {
                System.out.println("--- 正在执行步骤 A ---");
                return Map.of("step_result", "A 的结果");
            })
            .addNode("step_B", (state) -> {
                System.out.println("--- 正在执行步骤 B ---");
                String fromA = state.value("step_result", String.class).orElse("");
                return Map.of("step_result", fromA + " + B 的结果");
            })
            .addEdge(StateGraph.START, "step_A")
            .addEdge("step_A", "step_B")
            .addEdge("step_B", StateGraph.END);

        // 2. 配置持久化与中断点
        // 这里使用 MemorySaver 用于演示，生产环境推荐使用 RedisSaver
        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, new MemorySaver())
            .type(SaverConstant.MEMORY)
            .build();
        
        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .interruptAfter("step_A") // ✨ 在 step_A 执行完毕后，流程自动中断
            .build();

        CompiledGraph compiledGraph = stateGraph.compile(compileConfig);
        
        // 3. 第一次执行：使用唯一的 threadId 启动，并触发中断
        String conversationId = "user-12345";
        RunnableConfig runConfig = RunnableConfig.builder().threadId(conversationId).build();
        
        System.out.println("【第一次调用】启动工作流，预期在 A 之后中断...");
        Optional<OverAllState> firstResult = compiledGraph.invoke(Map.of(), runConfig);
        
        // 因为流程中断，firstResult 会是 empty
        System.out.println("第一次调用完成。流程是否结束: " + firstResult.isEmpty());
        
        // 我们可以通过 getState() 查看保存的检查点
        StateSnapshot currentState = compiledGraph.getState(runConfig);
        System.out.println("检查点已保存。下一节点: " + currentState.next().get(0) + ", 当前状态值: " + currentState.values());
        System.out.println("============================================\n");

        // 4. 第二次执行：使用相同的 threadId，工作流将自动从检查点恢复
        System.out.println("【第二次调用】使用相同的 threadId，预期从 B 开始恢复执行...");
        
        // 注意：无需再次传入初始输入，因为状态已从检查点恢复
        Optional<OverAllState> finalResult = compiledGraph.invoke(Map.of(), runConfig);

        System.out.println("第二次调用完成。流程是否结束: " + finalResult.isPresent());
        String finalStepResult = finalResult
                .flatMap(state -> state.value("step_result", String.class))
                .orElse("未能获取最终结果");
        System.out.println("最终结果: " + finalStepResult);
    }
}
```

### 多种存储方式 (`Checkpointer`)

SAA Graph 支持多种检查点存储方式，以适应不同的部署环境：

| 存储方式 | 实现类 | 优点 | 缺点 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **内存** | `MemorySaver` | 高性能, 无外部依赖 | 服务重启后数据丢失 | 开发测试, 单机环境 |
| **Redis** | `RedisSaver` | 分布式, 高可用 | 需 Redis 基础设施 | 生产环境, 集群部署 |
| **文件系统** | `FileSystemSaver` | 本地持久化 | 不支持分布式 | 单机生产环境 |

### 深入探讨：自定义状态序列化器

> **何时需要?** 当您的 `OverAllState` 中包含**自定义的业务对象** (如 `Invoice`, `UserDTO`) 或 Spring AI 的 `Message` 类型时，为了能正确地持久化和恢复，您**必须**提供一个自定义的状态序列化器。

SAA Graph 允许您通过继承 `PlainTextStateSerializer` 并利用 Jackson 的类型信息保存功能，轻松实现一个能处理几乎所有复杂对象的通用序列化器。

```java
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.IOException;
import java.util.Map;

public class GenericObjectSerializer extends PlainTextStateSerializer {

    private final ObjectMapper mapper;

    public GenericObjectSerializer() {
        super(OverAllState::new);
        this.mapper = new ObjectMapper();
        
        // ✨ 核心配置：启用默认类型处理。
        // 这会在序列化的JSON中加入"@class"属性，指明对象的具体类型，
        // 从而让 Jackson 在反序列化时能够准确地恢复任何复杂对象。
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
    }
    
    @Override
    public String serialize(OverAllState state) throws IOException {
        return mapper.writeValueAsString(state.data());
    }

    @Override
    public OverAllState deserialize(String data) throws IOException {
        Map<String, Object> rawMap = mapper.readValue(data, new TypeReference<>() {});
        return stateFactory().apply(rawMap);
    }
    
    // (下方的 write, read, cloneObject 方法是为了完整实现接口，通常保持不变)
    @Override
    public void write(OverAllState obj, ObjectOutput out) throws IOException {
        out.writeUTF(serialize(obj));
    }
    @Override
    public OverAllState read(ObjectInput in) throws IOException {
        return deserialize(in.readUTF());
    }
    @Override
    public OverAllState cloneObject(OverAllState state) throws IOException {
        return deserialize(serialize(state));
    }
}

// ✨ 如何使用: 在构建 StateGraph 时将其传入
StateGraph stateGraph = new StateGraph(
    keyStrategyFactory,
    new GenericObjectSerializer() // 注入自定义序列化器
);
```

---

## 第二部分：人机交互 (Human-in-the-Loop)

SAA Graph 内置了强大的人机交互机制，它正是**基于持久化与中断功能**实现的。通过 `HumanFeedback` 类和相关 API，您可以实现工作流在关键节点暂停，等待人类输入，然后基于人类的反馈继续执行不同的分支。

### 核心流程

1.  **中断**: 工作流执行到一个需要人类输入的节点（例如 `wait_for_approval`），然后使用 `interruptAfter()` 编译时配置，使流程在此处暂停。状态被自动持久化。
2.  **等待**: 后端暴露 API，前端可以查询某个 `threadId` 的状态，如果发现流程已中断，则渲染审批界面给用户。
3.  **反馈**: 用户提交审批意见（同意/拒绝/附加评论）。前端调用后端 API，将这些信息封装成一个 `HumanFeedback` 对象。
4.  **恢复**: 后端使用 `withHumanFeedback()` 将反馈注入 `OverAllState`，然后使用 `withResume()` 和相同的 `threadId` 再次调用 `.invoke()`。工作流从中断点恢复，此时节点可以从 `OverAllState` 中读取到人类反馈，并据此进行条件路由。

### `HumanFeedback` 对象

这是封装人类反馈的核心类：

```java
public static class HumanFeedback {
    private Map<String, Object> data;          // 人类提供的反馈数据 (如评论、决策)
    private String nextNodeId;                 // ✨ 关键：指定恢复后要跳转到的**逻辑边名称**
    // ...
}
```

### 完整示例：一个审批工作流

#### 1. 设计带中断和条件路由的工作流

```java
import com.alibaba.cloud.ai.graph.*;
import com.alibaba.cloud.ai.graph.OverAllState.HumanFeedback;

public static CompiledGraph createApprovalWorkflow() throws GraphStateException {
    StateGraph graph = new StateGraph(/* ... KeyStrategyFactory ... */);
    
    graph.addNode("receive_request", /* ... 节点逻辑 ... */);
    graph.addNode("wait_for_approval", (state) -> {
        System.out.println("⏸️ 工作流暂停，等待人类审批...");
        state.setInterruptMessage("Waiting for human approval");
        return Map.of();
    });
    graph.addNode("handle_approved", /* ... 批准逻辑 ... */);
    graph.addNode("handle_rejected", /* ... 拒绝逻辑 ... */);
    
    graph.setEntryPoint("receive_request");
    graph.addEdge("receive_request", "wait_for_approval");
    
    // ✨ 核心：从 wait_for_approval 节点出发的条件边
    // 这个路由函数会检查状态中的 HumanFeedback，并根据其 nextNodeId 决定走向
    graph.addConditionalEdges("wait_for_approval", 
        (state) -> state.humanFeedback() != null ? state.humanFeedback().nextNodeId() : "wait_for_approval",
        Map.of(
            "approved", "handle_approved", // 如果 feedback.nextNodeId == "approved"
            "rejected", "handle_rejected"  // 如果 feedback.nextNodeId == "rejected"
        )
    );
    
    graph.addEdge("handle_approved", StateGraph.END);
    graph.addEdge("handle_rejected", StateGraph.END);
    
    // 编译时配置：在 wait_for_approval 节点后中断
    CompileConfig config = CompileConfig.builder()
        .saverConfig(new SaverConfig().register("memory", new MemorySaver()))
        .interruptAfter("wait_for_approval") // 在此节点执行后中断
        .build();
        
    return graph.compile(config);
}
```

#### 2. 运行、中断、提供反馈、恢复

```java
// ... (main method setup)
CompiledGraph workflow = createApprovalWorkflow();
String threadId = "approval-session-001";
RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();

// 1. 第一次执行：运行直到中断点
System.out.println("=== 步骤 1: 运行直到需要人类审批 ===");
workflow.invoke(Map.of("user_request", "申请..."), config);
System.out.println("🔄 工作流已中断，等待人类审批...\n");

// 2. 模拟人类审批，并创建 HumanFeedback 对象
System.out.println("=== 步骤 2: 人类决定批准请求 ===");
HumanFeedback approvalFeedback = new HumanFeedback(
    Map.of("comments", "业务需求合理，批准。"), // 附加数据
    "approved"                               // ✨ 指定路由到 "approved" 这条边
);

// 3. 注入反馈并恢复执行
System.out.println("=== 步骤 3: 注入反馈并恢复工作流 ===");
Optional<OverAllState> approvedResult = workflow
    .withResume()                           // 标记为恢复模式
    .withHumanFeedback(approvalFeedback)    // 提供人类反馈
    .invoke(Map.of(), config);              // 从中断点继续执行

if (approvedResult.isPresent()) {
    System.out.println("✅ 工作流完成，最终结果: " + approvedResult.get().value("final_result").orElse(""));
}
```

### 人机交互的最佳实践

-   **超时处理**: 在生产环境中，应有一个独立的任务来检查长时间未处理的中断，并执行超时逻辑（如自动拒绝或通知管理员）。
-   **反馈验证**: 在后端接收到前端传来的 `HumanFeedback` 数据后，应进行严格的验证，确保数据格式正确、用户有权限等。
-   **状态隔离**: 严格使用 `threadId` 来隔离不同用户、不同会话的工作流状态。

通过组合使用持久化、中断和 `HumanFeedback` 机制，您可以构建出功能强大、体验优秀的人机协作 AI 系统。

