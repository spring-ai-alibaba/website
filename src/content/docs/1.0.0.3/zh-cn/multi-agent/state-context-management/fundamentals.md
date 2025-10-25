---
title: 基础概念
description: 状态与上下文管理的基础概念和原理
---

# 基础概念

理解状态与上下文管理的基础概念是构建高效多智能体系统的前提。本节将深入介绍核心概念、设计原理和技术架构。

## 状态 (State)

**状态**是智能体在执行过程中维护的数据集合，在 Spring AI Alibaba 中通过 `OverAllState` 类实现，代表了系统在特定时间点的完整信息快照。

### 状态的特征

1. **可序列化**：状态必须能够被序列化和反序列化，以支持持久化和传输
2. **版本化**：状态支持版本管理，可以追踪变更历史
3. **可恢复**：状态可以从持久存储中恢复，确保系统的连续性

### OverAllState - 全局状态

Spring AI Alibaba 使用 `OverAllState` 作为核心状态容器：

```java
// 创建状态实例
Map<String, Object> stateData = Map.of(
    "input", "用户输入",
    "messages", new ArrayList<String>(),
    "current_step", "agent_1"
);
OverAllState state = new OverAllState(stateData);

// 访问状态值
Optional<String> input = state.value("input");
Optional<List<String>> messages = state.value("messages", List.class);

// 状态数据
Map<String, Object> data = state.data();
```

### 状态更新策略

Spring AI Alibaba 提供了多种状态更新策略，通过 `KeyStrategy` 接口实现：

```java
// 替换策略 - 直接替换值
KeyStrategy replaceStrategy = new ReplaceStrategy();

// 追加策略 - 用于列表追加
KeyStrategy appendStrategy = new AppendStrategy();

// 配置状态策略
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("input", replaceStrategy);
    strategies.put("messages", appendStrategy);
    strategies.put("steps", replaceStrategy);
    return strategies;
};
```

## 上下文 (Context)

**上下文**是智能体执行任务所需的环境信息，在 Spring AI Alibaba 中主要通过 `RunnableConfig` 来管理。

### RunnableConfig - 运行时配置

`RunnableConfig` 是 Spring AI Alibaba 中管理执行上下文的核心类：

```java
// 创建运行时配置
RunnableConfig config = RunnableConfig.builder()
    .threadId("session_123")                    // 线程标识
    .addMetadata("userId", "user_456")          // 用户元数据
    .addMetadata("requestId", UUID.randomUUID().toString())  // 请求ID
    .build();

// 在工作流中使用
CompiledGraph app = workflow.compile();
Optional<OverAllState> result = app.invoke(inputs, config);
```

### 上下文类型

#### 静态上下文
通过 `RunnableConfig.metadata` 存储不变的环境信息：

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("thread_1")
    .addMetadata("userId", "user_123")
    .addMetadata("userName", "张三")
    .addMetadata("userRole", "admin")
    .addMetadata("apiKey", "sk-xxx")
    .build();
```

#### 动态上下文
通过 `OverAllState` 存储执行期间变化的信息：

```java
// 在节点中更新动态上下文
NodeAction updateContext = state -> {
    // 获取当前消息历史
    List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());

    // 添加新消息
    messages.add("新的处理结果");

    // 返回更新的状态
    return Map.of(
        "messages", messages,
        "last_update", Instant.now().toString(),
        "processing_step", "completed"
    );
};
```

## 记忆 (Memory)

**记忆**是智能体学习和适应能力的基础。Spring AI Alibaba 提供了多种记忆存储实现。

### 短期记忆管理

在 StateGraph 中管理短期记忆：

```java
// 配置消息追加策略
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", new AppendStrategy());  // 消息追加
    strategies.put("user_input", new ReplaceStrategy()); // 输入替换
    return strategies;
};

// 在节点中管理消息历史
NodeAction chatNode = state -> {
    List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());
    String userInput = (String) state.value("user_input").orElse("");

    // 添加用户消息
    messages.add("User: " + userInput);

    // 调用 AI 模型处理
    String aiResponse = callAIModel(userInput, messages);
    messages.add("Assistant: " + aiResponse);

    // 限制消息历史长度
    if (messages.size() > 20) {
        messages = messages.subList(messages.size() - 20, messages.size());
    }

    return Map.of("messages", messages, "ai_response", aiResponse);
};
```

### 长期记忆存储

> **注意**: 以下高级记忆功能正在开发中，当前版本可以通过自定义实现来支持。

```java
// 自定义记忆存储接口（开发中）
public interface MemoryStore {
    void put(String namespace, String key, Map<String, Object> value);
    List<MemoryItem> search(String namespace, String query);
    void delete(String namespace, String key);
}

// 基于向量数据库的语义记忆（开发中）
@Service
public class SemanticMemoryService {

    @Autowired
    private VectorStore vectorStore;  // 使用现有的向量存储

    public void storeMemory(String userId, String content, Map<String, Object> metadata) {
        // 当前可以通过向量存储实现
        Document document = new Document(content, metadata);
        vectorStore.add(List.of(document));
    }

    public List<Document> searchMemory(String userId, String query, int limit) {
        // 使用向量搜索查找相关记忆
        return vectorStore.similaritySearch(SearchRequest.query(query).withTopK(limit));
    }
}
```

## 线程 (Thread)

**线程**是组织和管理状态的逻辑单元，每个线程维护独立的执行上下文。在 Spring AI Alibaba 中通过 `threadId` 来标识和管理。

### 线程特征

1. **唯一标识**：每个线程有唯一的 `threadId`
2. **状态隔离**：不同线程的状态相互独立
3. **生命周期管理**：支持线程的创建、暂停、恢复和销毁

### 线程使用示例

```java
// 创建带线程ID的配置
String threadId = UUID.randomUUID().toString();
RunnableConfig config = RunnableConfig.builder()
    .threadId(threadId)
    .build();

// 在同一线程中执行多次调用
CompiledGraph app = workflow.compile(compileConfig);

// 第一次调用
Map<String, Object> inputs1 = Map.of("input", "第一个问题");
Optional<OverAllState> result1 = app.invoke(inputs1, config);

// 第二次调用 - 会继承之前的状态
Map<String, Object> inputs2 = Map.of("input", "第二个问题");
Optional<OverAllState> result2 = app.invoke(inputs2, config);

// 获取线程当前状态
StateSnapshot snapshot = app.getState(config);
System.out.println("当前状态: " + snapshot.getState());
System.out.println("下一个节点: " + snapshot.next());
```

### 线程状态管理

```java
@Service
public class ThreadService {

    private final CompiledGraph compiledGraph;

    public ThreadService(CompiledGraph compiledGraph) {
        this.compiledGraph = compiledGraph;
    }

    public String createThread() {
        return UUID.randomUUID().toString();
    }

    public StateSnapshot getThreadState(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();
        return compiledGraph.getState(config);
    }

    public void updateThreadState(String threadId, Map<String, Object> updates) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();
        compiledGraph.updateState(config, updates);
    }
}
```

## 检查点 (Checkpoint)

**检查点**是状态在特定时间点的快照，用于状态恢复和历史追踪。Spring AI Alibaba 提供了多种检查点保存器实现。

### 检查点保存器

```java
// 内存检查点保存器（适用于开发和测试）
MemorySaver memorySaver = new MemorySaver();

// 文件系统检查点保存器
Path checkpointDir = Paths.get("./checkpoints");
FileSystemSaver fileSystemSaver = new FileSystemSaver(checkpointDir);

// Redis 检查点保存器（适用于分布式环境）
RedissonClient redisson = Redisson.create(config);
RedisSaver redisSaver = new RedisSaver(redisson);

// 版本化内存保存器（支持版本管理）
VersionedMemorySaver versionedSaver = new VersionedMemorySaver();
```

### 配置检查点保存器

```java
// 配置检查点保存器
var saver = new MemorySaver();
var compileConfig = CompileConfig.builder()
    .saverConfig(SaverConfig.builder()
        .register(SaverConstant.MEMORY, saver)
        .type(SaverConstant.MEMORY)
        .build())
    .build();

// 编译工作流
CompiledGraph app = workflow.compile(compileConfig);

// 执行时会自动保存检查点
RunnableConfig config = RunnableConfig.builder()
    .threadId("thread_1")
    .build();
Optional<OverAllState> result = app.invoke(inputs, config);
```

### 检查点操作

```java
// 获取检查点历史
List<Checkpoint> checkpoints = saver.list(config);

// 获取最新检查点
Optional<Checkpoint> latest = saver.get(config);

// 手动保存检查点
Checkpoint checkpoint = Checkpoint.builder()
    .state(currentState.data())
    .nodeId("current_node")
    .nextNodeId("next_node")
    .build();
saver.put(config, checkpoint);
```

## 状态更新策略

Spring AI Alibaba 提供多种状态更新策略，通过 `KeyStrategy` 接口实现：

### 内置策略

```java
// 替换策略 - 直接替换值
KeyStrategy replaceStrategy = new ReplaceStrategy();

// 追加策略 - 用于列表追加
KeyStrategy appendStrategy = new AppendStrategy();

// 使用 KeyStrategyFactoryBuilder 简化配置
KeyStrategyFactory keyStrategyFactory = new KeyStrategyFactoryBuilder()
    .addStrategy("input", KeyStrategy.REPLACE)      // 替换策略
    .addStrategy("messages", KeyStrategy.APPEND)    // 追加策略
    .addStrategy("steps", KeyStrategy.REPLACE)      // 替换策略
    .build();
```

### 自定义策略

```java
// 自定义合并策略
KeyStrategy mergeStrategy = (currentValue, newValue) -> {
    if (currentValue instanceof Map && newValue instanceof Map) {
        Map<String, Object> result = new HashMap<>((Map<String, Object>) currentValue);
        result.putAll((Map<String, Object>) newValue);
        return result;
    }
    return newValue;
};

// 自定义计数策略
KeyStrategy countStrategy = (currentValue, newValue) -> {
    int current = (Integer) currentValue;
    int increment = (Integer) newValue;
    return current + increment;
};

// 配置自定义策略
KeyStrategyFactory customFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("user_profile", mergeStrategy);
    strategies.put("visit_count", countStrategy);
    return strategies;
};
```

## 完整示例

以下是一个完整的状态与上下文管理示例：

```java
@Configuration
public class StateGraphConfiguration {

    @Bean
    public StateGraph chatWorkflow() {
        // 配置状态更新策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("messages", new AppendStrategy());
            strategies.put("user_input", new ReplaceStrategy());
            strategies.put("ai_response", new ReplaceStrategy());
            return strategies;
        };

        // 创建状态图
        StateGraph workflow = new StateGraph(keyStrategyFactory)
            .addNode("chat", chatNode())
            .addEdge(StateGraph.START, "chat")
            .addEdge("chat", StateGraph.END);

        return workflow;
    }

    @Bean
    public CompiledGraph compiledGraph(StateGraph chatWorkflow) {
        // 配置检查点保存器
        MemorySaver saver = new MemorySaver();
        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(SaverConfig.builder()
                .register(SaverConstant.MEMORY, saver)
                .type(SaverConstant.MEMORY)
                .build())
            .build();

        return chatWorkflow.compile(compileConfig);
    }

    private NodeAction chatNode() {
        return state -> {
            String userInput = (String) state.value("user_input").orElse("");
            List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());

            // 处理用户输入
            String aiResponse = "AI回复: " + userInput;

            return Map.of(
                "messages", List.of("User: " + userInput, "AI: " + aiResponse),
                "ai_response", aiResponse
            );
        };
    }
}
```

## 下一步

现在您已经了解了状态与上下文管理的基础概念，接下来可以深入学习具体的实现：

- [短期状态管理](./short-term-state.md) - 运行时状态和短期记忆的具体实现
- [长期状态管理](./long-term-state.md) - 持久化和长期记忆的管理方法
- [持久执行](./durable-execution.md) - 持久执行的机制和最佳实践
