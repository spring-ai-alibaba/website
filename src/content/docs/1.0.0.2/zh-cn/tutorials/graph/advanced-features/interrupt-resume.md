---
title: 中断与恢复机制
keywords: [Spring AI,中断,恢复,CheckpointSaver,内核机制]
description: "深入理解 Spring AI Alibaba Graph 中断与恢复的内核实现机制和核心使用方法。"
---

## 什么是中断与恢复机制

**中断与恢复机制是Spring AI Alibaba Graph的核心控制基础设施**，提供在工作流执行过程中的精确暂停和恢复能力。该机制通过检查点（Checkpoint）系统实现状态持久化，确保工作流能够在任意指定节点前后安全中断，并从精确位置恢复执行。

**核心设计理念**：中断与恢复机制采用了分离式架构设计，将中断控制逻辑与状态持久化机制解耦。通过CompileConfig进行编译时配置，CompiledGraph进行运行时检查，CheckpointSaver进行状态管理，实现了高效、可靠的工作流控制能力。

## 内核架构设计

**中断与恢复机制基于三层架构模式**：配置层（CompileConfig）、执行层（CompiledGraph）和持久化层（CheckpointSaver）。

![中断流程](img\user\ai\tutorials\graph\advanced-features\interrupt-resume\interrupt.svg)

### 配置层：CompileConfig

CompileConfig负责定义中断点和持久化策略，在编译时确定中断行为：

```java
public class CompileConfig {
    // 中断配置
    private Set<String> interruptsBefore = Set.of();
    private Set<String> interruptsAfter = Set.of();
    
    // 持久化配置
    private SaverConfig saverConfig = new SaverConfig().register(MEMORY, new MemorySaver());
    
    // 线程释放标志
    private boolean releaseThread = false;
    
    // 获取中断配置
    public Set<String> interruptsBefore() { return interruptsBefore; }
    public Set<String> interruptsAfter() { return interruptsAfter; }
    
    // 获取检查点保存器
    public Optional<BaseCheckpointSaver> checkpointSaver() {
        return ofNullable(saverConfig.get());
    }
}
```

### 执行层：中断检查机制

CompiledGraph在执行过程中通过以下核心方法进行中断检查：

```java
// 来自CompiledGraph的实际中断检查逻辑
private boolean shouldInterruptBefore(String nodeId, String previousNodeId) {
    if (previousNodeId == null) { // 防止恢复时的错误中断
        return false;
    }
    return compileConfig.interruptsBefore().contains(nodeId);
}

private boolean shouldInterruptAfter(String nodeId, String previousNodeId) {
    if (nodeId == null) { // 防止恢复时的错误中断
        return false;
    }
    return compileConfig.interruptsAfter().contains(nodeId);
}
```

### 持久化层：CheckpointSaver

CheckpointSaver提供了状态持久化的标准接口，支持多种存储后端：

```java
public interface BaseCheckpointSaver {
    // 列出所有检查点
    Collection<Checkpoint> list(RunnableConfig config);
    
    // 获取最新检查点
    Optional<Checkpoint> get(RunnableConfig config);
    
    // 保存检查点
    RunnableConfig put(RunnableConfig config, Checkpoint checkpoint) throws Exception;
    
    // 清除检查点
    boolean clear(RunnableConfig config);
    
    // 释放资源
    default Tag release(RunnableConfig config) throws Exception { return null; }
}
```

## 状态序列化机制

**状态序列化是中断与恢复机制的核心基础设施**，负责将运行时状态转换为可持久化的数据格式，并确保恢复时的完整性。

### StateSerializer架构

StateSerializer提供了状态序列化的标准接口：

```java
public abstract class StateSerializer<T> implements Serializer<T> {
    private final AgentStateFactory<T> stateFactory;
    
    protected StateSerializer(AgentStateFactory<T> stateFactory) {
        this.stateFactory = stateFactory;
    }
    
    // 状态工厂获取
    public final AgentStateFactory<T> stateFactory() { return stateFactory; }
    
    // 从数据创建状态
    public final T stateOf(Map<String, Object> data) {
        return stateFactory.apply(data);
    }
    
    // 状态克隆
    public final T cloneObject(Map<String, Object> data) throws IOException, ClassNotFoundException {
        return cloneObject(stateFactory().apply(data));
    }
}
```

### 内置序列化器

#### JacksonStateSerializer

框架提供了基于Jackson的JSON序列化器：

```java
public abstract class JacksonStateSerializer extends PlainTextStateSerializer {
    protected final ObjectMapper objectMapper;
    
    protected JacksonStateSerializer(AgentStateFactory<OverAllState> stateFactory) {
        this(stateFactory, new ObjectMapper());
        this.objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);
    }
    
    @Override
    public String mimeType() { return "application/json"; }
    
    @Override
    public void write(OverAllState object, ObjectOutput out) throws IOException {
        String json = objectMapper.writeValueAsString(object);
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        out.writeInt(jsonBytes.length);
        out.write(jsonBytes);
    }
    
    @Override
    public OverAllState read(ObjectInput in) throws IOException, ClassNotFoundException {
        int length = in.readInt();
        byte[] jsonBytes = new byte[length];
        in.readFully(jsonBytes);
        String json = new String(jsonBytes, StandardCharsets.UTF_8);
        return objectMapper.readValue(json, getStateType());
    }
}
```

#### 默认序列化器

StateGraph使用内置的Jackson序列化器作为默认实现：

```java
// StateGraph内部的默认序列化器
static class JacksonSerializer extends JacksonStateSerializer {
    public JacksonSerializer() {
        super(OverAllState::new);
    }
    
    ObjectMapper getObjectMapper() {
        return objectMapper;
    }
}
```

### 何时需要自定义序列化器

**默认的JacksonStateSerializer适用于大多数场景**，但在以下情况下需要考虑自定义序列化器：

#### 业务场景判断

| 场景 | 默认序列化器 | 自定义序列化器 | 原因 |
|------|------------|--------------|------|
| 简单数据类型 | ✅ 推荐 | ❌ 不需要 | String、Number、List、Map等基础类型 |
| 复杂业务对象 | ⚠️ 可能有问题 | ✅ 推荐 | Plan、SearchEnum等业务特定类型 |
| Spring AI Message | ❌ 无法处理 | ✅ 必需 | UserMessage、AssistantMessage等 |
| 大数据量状态 | ⚠️ 性能问题 | ✅ 推荐 | 超过1MB的状态数据 |

### 自定义序列化器实现

基于DeepResearch项目的实践，展示如何实现业务特定的序列化器：

#### 完整自定义序列化器

```java
public class DeepResearchStateSerializer extends PlainTextStateSerializer {
    protected final ObjectMapper objectMapper;
    
    public DeepResearchStateSerializer(AgentStateFactory<OverAllState> stateFactory) {
        this(stateFactory, new ObjectMapper());
    }
    
    protected DeepResearchStateSerializer(AgentStateFactory<OverAllState> stateFactory, 
                                   ObjectMapper objectMapper) {
        super(stateFactory);
        this.objectMapper = objectMapper;
        
        // 注册消息反序列化器
        SimpleModule messageModule = new SimpleModule();
        messageModule.addDeserializer(Message.class, new MessageDeserializer());
        objectMapper.registerModule(messageModule);
        
        // 注册状态反序列化器
        SimpleModule stateModule = new SimpleModule();
        stateModule.addDeserializer(OverAllState.class, 
            new DeepResearchDeserializer(objectMapper));
        objectMapper.registerModule(stateModule);
        
        // 其他配置
        objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);
        objectMapper.registerModule(new JavaTimeModule());
    }
    
    @Override
    public String mimeType() { return "application/json"; }
    
    @Override
    public void write(OverAllState object, ObjectOutput out) throws IOException {
        String json = objectMapper.writeValueAsString(object);
        
        // 使用字节数组避免UTF长度限制（适用于大数据量场景）
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        out.writeInt(jsonBytes.length);
        out.write(jsonBytes);
    }
    
    @Override
    public OverAllState read(ObjectInput in) throws IOException {
        // 读取字节数组避免UTF长度限制
        int length = in.readInt();
        byte[] jsonBytes = new byte[length];
        in.readFully(jsonBytes);
        String json = new String(jsonBytes, StandardCharsets.UTF_8);
        return objectMapper.readValue(json, OverAllState.class);
    }
}
```

#### 业务对象反序列化器

```java
public class DeepResearchDeserializer extends JsonDeserializer<OverAllState> {
    private final ObjectMapper objectMapper;
    
    public DeepResearchDeserializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Override
    public OverAllState deserialize(JsonParser p, DeserializationContext ctxt) 
            throws IOException {
        ObjectNode node = objectMapper.readTree(p);
        
        Map<String, Object> data = objectMapper.convertValue(
            node.get("data"), new TypeReference<>() {});
        Map<String, Object> newData = new HashMap<>();
        
        // 处理业务特定对象
        Plan currentPlan = objectMapper.convertValue(data.get("current_plan"), Plan.class);
        newData.put("current_plan", currentPlan);
        
        SearchEnum searchEnum = objectMapper.convertValue(
            data.get("search_engine"), SearchEnum.class);
        newData.put("search_engine", searchEnum);
        
        // 处理其他数据
        data.forEach((key, value) -> {
            if (!newData.containsKey(key)) {
                newData.put(key, value);
            }
        });
        
        return new OverAllState(newData);
    }
}
```

### 序列化器集成

#### 在StateGraph中使用自定义序列化器

```java
// 使用自定义序列化器创建StateGraph
StateGraph stateGraph = new StateGraph(
    "deep_research", 
    keyStrategyFactory,
    new DeepResearchStateSerializer(OverAllState::new)
);
```

#### 在CompileConfig中配置序列化器

自定义序列化器会自动用于CheckpointSaver的状态持久化：

```java
// FileSystemSaver会使用StateGraph配置的序列化器
CompileConfig config = CompileConfig.builder()
    .saverConfig(SaverConfig.builder()
        .register(SaverConstant.FILE, new FileSystemSaver(
            Paths.get("/tmp/checkpoints"), 
            stateGraph.getStateSerializer()  // 使用自定义序列化器
        ))
        .type(SaverConstant.FILE)
        .build())
    .build();
```

## 检查点（Checkpoint）数据结构

**Checkpoint是状态持久化的核心数据结构**，封装了执行状态的完整快照：

```java
public class Checkpoint implements Serializable {
    private String id = UUID.randomUUID().toString();           // 唯一标识
    private Map<String, Object> state = null;                   // 状态数据
    private String nodeId = null;                               // 当前节点ID
    private String nextNodeId = null;                           // 下一个节点ID
    
    // 状态更新机制
    public Checkpoint updateState(Map<String, Object> values, 
                                Map<String, KeyStrategy> keyStrategyMap) {
        Map<String, Object> newState = OverAllState.updateState(this.state, values, keyStrategyMap);
        return new Checkpoint().setState(newState).setNodeId(this.nodeId).setNextNodeId(this.nextNodeId);
    }
}
```

## 中断机制实现

### 编译时中断配置

在StateGraph编译阶段配置中断点：

```java
// 基础中断配置
CompileConfig config = CompileConfig.builder()
    .interruptBefore("node1", "node2")        // 在指定节点执行前中断
    .interruptAfter("node3", "node4")         // 在指定节点执行后中断
    .saverConfig(SaverConfig.builder()
        .register(SaverConstant.MEMORY, new MemorySaver())
        .type(SaverConstant.MEMORY)
        .build())
    .build();

CompiledGraph compiledGraph = stateGraph.compile(config);
```

### 运行时中断检查

CompiledGraph在每个节点执行时进行中断检查：

```java
// 来自AsyncNodeGenerator.next()的实际执行逻辑
@Override
public Data<NodeOutput> next() {
    try {
        // 检查前一个节点的执行后中断
        if (shouldInterruptAfter(currentNodeId, nextNodeId)) {
            return Data.done(currentNodeId);  // 中断并返回当前节点ID
        }

        // 检查下一个节点的执行前中断
        if (shouldInterruptBefore(nextNodeId, currentNodeId)) {
            return Data.done(nextNodeId);     // 中断并返回下一个节点ID
        }

        // 继续正常执行
        currentNodeId = nextNodeId;
        var action = nodes.get(currentNodeId);
        return evaluateAction(action, this.overAllState).get();
    }
    catch (Exception e) {
        return Data.error(e);
    }
}
```

### 检查点保存机制

每个节点执行完成后自动创建检查点：

```java
// 来自CompiledGraph的检查点保存逻辑
private Optional<Checkpoint> addCheckpoint(RunnableConfig config, String nodeId, 
                                         Map<String, Object> state, String nextNodeId) throws Exception {
    if (compileConfig.checkpointSaver().isPresent()) {
        // 1. 创建检查点（内部会自动进行状态克隆）
        var cp = Checkpoint.builder()
            .nodeId(nodeId)
            .state(cloneState(state))
            .nextNodeId(nextNodeId)
            .build();
        
        // 2. 持久化检查点
        compileConfig.checkpointSaver().get().put(config, cp);
        return Optional.of(cp);
    }
    return Optional.empty();
}
```

## 恢复机制实现

### 状态恢复逻辑

CompiledGraph提供了完整的状态恢复机制：

```java
// AsyncNodeGenerator的恢复构造逻辑
protected AsyncNodeGenerator(OverAllState overAllState, RunnableConfig config) throws GraphRunnerException {
    if (overAllState.isResume()) {
        // 1. 恢复模式：从检查点加载状态
        BaseCheckpointSaver saver = compileConfig.checkpointSaver()
            .orElseThrow(() -> new IllegalStateException("Resume request requires CheckpointSaver"));
        
        // 2. 获取最新检查点
        Checkpoint startCheckpoint = saver.get(config)
            .orElseThrow(() -> new IllegalStateException("Resume request without saved checkpoint"));

        // 3. 恢复执行状态
        this.currentState = startCheckpoint.getState();
        this.nextNodeId = startCheckpoint.getNextNodeId();
        this.currentNodeId = null;
        this.config = config.withCheckPointId(null);
        this.overAllState = overAllState.input(this.currentState);
        
        log.trace("RESUME FROM {}", startCheckpoint.getNodeId());
    } else {
        // 正常启动模式
        this.currentState = getInitialState(overAllState.data(), config);
        this.nextNodeId = null;
        this.currentNodeId = START;
        this.config = config;
    }
}
```

### 状态一致性保障

框架通过状态克隆机制确保数据一致性：

```java
// 状态克隆实现
OverAllState cloneState(Map<String, Object> data) throws IOException, ClassNotFoundException {
    return stateGraph.getStateSerializer().cloneObject(data);
}

// 状态合并机制
Map<String, Object> getInitialState(Map<String, Object> inputs, RunnableConfig config) {
    return compileConfig.checkpointSaver()
        .flatMap(saver -> saver.get(config))
        .map(cp -> OverAllState.updateState(cp.getState(), inputs, keyStrategyMap))
        .orElseGet(() -> OverAllState.updateState(new HashMap<>(), inputs, keyStrategyMap));
}
```

## CheckpointSaver实现

### 内存存储：MemorySaver

适用于开发和单机环境的轻量级实现：

```java
public class MemorySaver implements BaseCheckpointSaver {
    // 线程安全的内存存储
    final ConcurrentHashMap<String, LinkedList<Checkpoint>> _checkpointsByThread = new ConcurrentHashMap<>();
    final ConcurrentHashMap<String, ReentrantLock> _locksByThread = new ConcurrentHashMap<>();
    
    @Override
    public Optional<Checkpoint> get(RunnableConfig config) {
        var threadId = config.threadId().orElse(THREAD_ID_DEFAULT);
        Lock lock = getLock(threadId);
        lock.lock();
        try {
            final LinkedList<Checkpoint> checkpoints = getCheckpoints(config);
            // 支持按ID查找特定检查点
            if (config.checkPointId().isPresent()) {
                return config.checkPointId()
                    .flatMap(id -> checkpoints.stream()
                        .filter(checkpoint -> checkpoint.getId().equals(id))
                        .findFirst());
            }
            // 返回最新检查点
            return getLast(checkpoints, config);
        }
        finally {
            lock.unlock();
        }
    }
}
```

### Redis存储：RedisSaver

适用于分布式环境的高可用实现：

```java
public class RedisSaver implements BaseCheckpointSaver {
    private RedissonClient redisson;
    private final ObjectMapper objectMapper;
    
    @Override
    public RunnableConfig put(RunnableConfig config, Checkpoint checkpoint) throws Exception {
        Optional<String> configOption = config.threadId();
        if (configOption.isPresent()) {
            // 1. 获取分布式锁
            RLock lock = redisson.getLock(LOCK_PREFIX + configOption.get());
            boolean tryLock = false;
            try {
                tryLock = lock.tryLock(2, TimeUnit.MILLISECONDS);
                if (tryLock) {
                    // 2. 读取现有检查点
                    RBucket<String> bucket = redisson.getBucket(PREFIX + configOption.get());
                    String content = bucket.get();
                    
                    // 3. 更新检查点列表
                    LinkedList<Checkpoint> checkpoints = content == null ? 
                        new LinkedList<>() : 
                        objectMapper.readValue(content, new TypeReference<>() {});
                    
                    checkpoints.push(checkpoint);
                    
                    // 4. 持久化更新
                    bucket.set(objectMapper.writeValueAsString(checkpoints));
                }
                return RunnableConfig.builder(config).checkPointId(checkpoint.getId()).build();
            }
            finally {
                if (tryLock) lock.unlock();
            }
        }
        throw new IllegalArgumentException("threadId is required");
    }
}
```

### 文件系统存储：FileSystemSaver

适用于本地持久化的可靠实现：

```java
public class FileSystemSaver implements BaseCheckpointSaver {
    private final Path targetFolder;
    private final Serializer<Checkpoint> serializer;
    private final MemorySaver memorySaver = new MemorySaver();
    
    // 构造函数接受自定义序列化器
    public FileSystemSaver(Path targetFolder, StateSerializer stateSerializer) {
        this.targetFolder = targetFolder;
        this.serializer = new CheckPointSerializer(stateSerializer);  // 使用自定义序列化器
        this.memorySaver = new MemorySaver();
    }
    
    @Override
    public RunnableConfig put(RunnableConfig config, Checkpoint checkpoint) throws Exception {
        // 1. 内存缓存更新
        RunnableConfig result = memorySaver.put(config, checkpoint);
        
        // 2. 文件系统持久化（使用自定义序列化器）
        File targetFile = getFile(config);
        serialize(memorySaver.getCheckpoints(config), targetFile);
        
        return result;
    }
    
    private void serialize(LinkedList<Checkpoint> checkpoints, File outFile) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(outFile.toPath()))) {
            oos.writeInt(checkpoints.size());
            for (Checkpoint checkpoint : checkpoints) {
                serializer.write(checkpoint, oos);  // 使用配置的序列化器
            }
        }
    }
}
```

