---
title: 持久化与恢复 (Persistence & Resuming)
description: 学习如何使用 SAA Graph 的持久化与恢复机制，构建能够中断、容错和断点续传的健壮 Agent 工作流。
---

在真实的业务场景中，Agent 工作流可能需要长时间运行，或者在执行过程中等待外部输入（如人类审批）。如果在这期间服务重启或发生故障，我们希望工作流能够从中断的地方继续，而不是从头开始。

SAA Graph 的**持久化与恢复 (Persistence & Resuming)** 机制正是为此而生。它通过将工作流的当前状态保存为**检查点 (Checkpoint)**，实现了强大的断点续传和容错能力。

## 核心应用场景

-   **长流程任务**: 对于需要数分钟甚至数小时才能完成的复杂任务（如深度研究、报告生成），可以分步保存进度，即使服务重启也能从上一个检查点恢复。
-   **人机交互**: 当 Agent 需要人类批准或提供额外信息时，可以将当前状态持久化，暂停执行并等待人类输入，然后再从暂停点恢复。这是实现“人机交互”模式的技术基础。
-   **容错能力**: 在关键业务流程中，每一步都保存检查点。如果某个节点执行失败，可以在修复问题后从失败前的状态恢复，而无需重跑整个流程。

## 实现持久化的三要素

要启用持久化与恢复功能，您需要理解并配置以下三个核心组件：

1.  **`Checkpointer` (状态存储器)**: 这是负责**存储和读取**检查点的组件。它定义了工作流状态被保存在**哪里**。
2.  **`CompileConfig` (编译时配置)**: 在编译 `StateGraph` 时，您必须提供一个 `Checkpointer` 来**启用**持久化功能。您还可以在这里配置**自动中断点**。
3.  **`RunnableConfig` (运行时标识)**: 在执行图时，您必须通过 `.threadId()` 提供一个**唯一的会话 ID**。这个 ID 是区分不同工作流实例的关键。

## 完整示例：中断与恢复

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
        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, new MemorySaver())
            .type(SaverConstant.MEMORY)
            .build();
        
        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .interruptAfter("step_A") // 在 step_A 执行完毕后，流程自动中断
            .build();

        CompiledGraph compiledGraph = stateGraph.compile(compileConfig);
        
        // 3. 第一次执行：触发中断
        String conversationId = "user-12345";
        RunnableConfig runConfig = RunnableConfig.builder().threadId(conversationId).build();
        
        System.out.println("【第一次调用】启动工作流，预期在 A 之后中断...");
        Optional<OverAllState> firstResult = compiledGraph.invoke(Map.of(), runConfig);
        
        System.out.println("第一次调用完成。流程是否结束: " + firstResult.isEmpty());
        
        StateSnapshot currentState = compiledGraph.getState(runConfig);
        System.out.println("检查点已保存。下一节点: " + currentState.next().get(0) + ", 当前状态值: " + currentState.values());
        System.out.println("============================================\n");

        // 4. 第二次执行：自动恢复
        System.out.println("【第二次调用】使用相同的 threadId，预期从 B 开始恢复执行...");
        
        // 仅需使用相同的 threadId 再次调用 invoke
        Optional<OverAllState> finalResult = compiledGraph.invoke(Map.of(), runConfig);

        System.out.println("第二次调用完成。流程是否结束: " + finalResult.isPresent());
        System.out.println("最终结果: " + finalResult.get().value("step_result", String.class).orElse(""));
    }
}
```

**预期输出**:
```
【第一次调用】启动工作流，预期在 A 之后中断...
--- 正在执行步骤 A ---
第一次调用完成。流程是否结束: true
检查点已保存。下一节点: step_B, 当前状态值: {step_result=A 的结果}
============================================

【第二次调用】使用相同的 threadId，预期从 B 开始恢复执行...
--- 正在执行步骤 B ---
第二次调用完成。流程是否结束: true
最终结果: A 的结果 + B 的结果
```

## 多种存储方式 (`Checkpointer`)

SAA Graph 支持多种检查点存储方式，以适应不同的部署环境：

| 存储方式 | 实现类 | 优点 | 缺点 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **内存** | `MemorySaver` | 高性能, 无外部依赖 | 服务重启后数据丢失 | 开发测试, 单机环境 |
| **Redis** | `RedisSaver` | 分布式, 高可用 | 需 Redis 基础设施 | 生产环境, 集群部署 |
| **文件系统** | `FileSystemSaver` | 本地持久化 | 不支持分布式 | 单机生产环境 |

**配置示例**:
```java
// 使用 RedisSaver
SaverConfig redisSaverConfig = SaverConfig.builder()
    .register(SaverConstant.REDIS, new RedisSaver(redisTemplate)) // 注入 RedisTemplate
    .type(SaverConstant.REDIS)
    .build();

// 在编译时使用
CompileConfig redisCompileConfig = CompileConfig.builder()
    .saverConfig(redisSaverConfig)
    .build();
```

## 高级检查点管理

#### 查看状态历史

您可以获取某个会话（`threadId`）的所有历史检查点快照。
```java
import com.alibaba.cloud.ai.graph.checkpoint.StateSnapshot;
import java.util.Collection;

// ...
RunnableConfig config = RunnableConfig.builder().threadId(conversationId).build();
Collection<StateSnapshot> history = compiledGraph.getStateHistory(config);

for (StateSnapshot snapshot : history) {
    System.out.println(
        "节点: " + snapshot.next() + 
        ", 时间: " + snapshot.createdAt() + 
        ", 状态: " + snapshot.values()
    );
}
```

#### 更新已保存的状态

在某些高级场景下，您可能需要在工作流中断时，从外部更新其状态。例如，在人类审批后，将审批结果注入到工作流状态中。
```java
// config 包含了要更新的 threadId
RunnableConfig configToUpdate = RunnableConfig.builder().threadId(conversationId).build();

// 更新状态，并可以选择性地指定下一个执行节点
RunnableConfig updatedConfig = compiledGraph.updateState(
    configToUpdate,
    Map.of("human_approval", "approved", "reason", "Looks good."),
    "execute_plan" // (可选) 指定下一个要执行的节点
);

// 下一次使用该 threadId 调用 invoke 时，将从更新后的状态和指定的新起点开始
compiledGraph.invoke(Map.of(), updatedConfig);
```

## 深入探讨：自定义状态序列化器

### 场景：当工作流需要传递复杂业务对象时

默认的序列化器可以很好地处理字符串、数字等基本数据类型。但是，假设您的 Agent 工作流需要处理一个自定义的 `Invoice` (发票) 对象，如果直接将其放入 `OverAllState` 并启用持久化，默认配置在恢复时将无法识别这个对象，从而导致失败。

**在以下场景，您必须使用自定义序列化器：**
-   状态中包含**自定义的业务对象** (如 `Invoice`, `UserDTO` 等)。
-   状态中包含 Spring AI 的 `Message` 类型 (如 `UserMessage`, `AssistantMessage`)。
-   状态中包含任何第三方库中不支持标准序列化的复杂对象。

### 一个简单而强大的实现

SAA Graph 允许您通过继承 `PlainTextStateSerializer` 并利用 Jackson 的类型信息保存功能，轻松实现一个能处理几乎所有复杂对象的通用序列化器。

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.serializer.plain_text.PlainTextStateSerializer;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.ObjectInput;
import java.io.ObjectOutput;
import java.util.Map;

/**
 * 一个通用的自定义状态序列化器，能够处理复杂业务对象。
 */
public class GenericObjectSerializer extends PlainTextStateSerializer {

    private final ObjectMapper mapper;

    public GenericObjectSerializer() {
        super(OverAllState::new);
        this.mapper = createObjectMapper();
    }

    private ObjectMapper createObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        
        // ✨ 核心配置：启用默认类型处理。
        // 这会在序列化的JSON中加入"@class"属性，指明对象的具体类型，
        // 从而让 Jackson 在反序列化时能够准确地恢复任何复杂对象。
        objectMapper.activateDefaultTyping(
            objectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        objectMapper.configure(
            com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, 
            false
        );
        
        return objectMapper;
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
```

### 完整使用示例

下面的示例将演示如何使用 `GenericObjectSerializer` 来持久化和恢复一个自定义的 `Invoice` 对象。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.consts.SaverConstant;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import java.util.Map;
import java.util.Optional;

// 1. 定义一个需要被持久化的自定义业务对象
class Invoice {
    public String invoiceId;
    public double amount;
    public String customerName;
    // Jackson 要求有一个无参构造函数用于反序列化
    public Invoice() {} 
    public Invoice(String id, double amt, String name) {
        this.invoiceId = id;
        this.amount = amt;
        this.customerName = name;
    }
    @Override
    public String toString() {
        return "Invoice(id=" + invoiceId + ", amount=" + amount + ")";
    }
}

public class CustomSerializerUsageExample {
    
    public static void main(String[] args) throws Exception {
        // 2. 创建自定义序列化器实例
        GenericObjectSerializer customSerializer = new GenericObjectSerializer();
        
        // 3. 在构建 StateGraph 时注入序列化器
        StateGraph stateGraph = new StateGraph(
            () -> Map.of("invoice_data", new ReplaceStrategy()),
            customSerializer
        );
        
        stateGraph
            .addNode("create_invoice", (state) -> {
                System.out.println("--- 节点: 创建发票 ---");
                Invoice newInvoice = new Invoice("INV-001", 199.99, "AI Corp");
                return Map.of("invoice_data", newInvoice);
            })
            .addNode("process_invoice", (state) -> {
                System.out.println("--- 节点: 处理发票 ---");
                Invoice invoice = state.value("invoice_data", Invoice.class).orElse(null);
                System.out.println("成功恢复发票对象: " + invoice);
                return Map.of("invoice_data", "处理完成: " + invoice.invoiceId);
            })
            .addEdge(StateGraph.START, "create_invoice")
            .addEdge("create_invoice", "process_invoice")
            .addEdge("process_invoice", StateGraph.END);
        
        // 4. 配置持久化，并在创建发票后中断
        SaverConfig saverConfig = SaverConfig.builder().register(SaverConstant.MEMORY, new MemorySaver()).type(SaverConstant.MEMORY).build();
        CompileConfig compileConfig = CompileConfig.builder().saverConfig(saverConfig).interruptAfter("create_invoice").build();
        CompiledGraph compiledGraph = stateGraph.compile(compileConfig);
        
        String threadId = "invoice-workflow-1";
        RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();
        
        // 5. 第一次执行：创建 Invoice 对象并中断，状态被自动序列化保存
        System.out.println("【第一次调用】启动工作流...");
        compiledGraph.invoke(Map.of(), config);
        System.out.println("工作流已中断，包含 Invoice 对象的状态已保存。\n");
        
        // 6. 第二次执行：自动从检查点恢复，Invoice 对象被成功反序列化
        System.out.println("【第二次调用】恢复工作流...");
        Optional<OverAllState> result = compiledGraph.invoke(Map.of(), config);
        
        System.out.println("\n✅ 工作流完成，自定义序列化器测试成功!");
        System.out.println("最终结果: " + result.get().value("invoice_data").orElse(""));
    }
}
```

