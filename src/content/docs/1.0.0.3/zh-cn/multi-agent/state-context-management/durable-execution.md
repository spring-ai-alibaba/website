---
title: 持久执行
description: Spring AI Alibaba Graph 的持久执行机制，支持工作流的可靠性和容错能力
---

# 持久执行

持久执行是 Spring AI Alibaba Graph 的核心特性之一，它通过检查点机制确保工作流能够在中断后从最后保存的状态恢复执行。这一特性对于构建可靠的 AI 工作流系统至关重要，特别是在需要人机协作、长时间运行任务或面临系统故障风险的场景中。

## 核心概念

**持久执行**是指工作流在执行过程中定期保存其状态快照（检查点），使得工作流能够：

- **容错恢复**：在系统故障或异常中断后从最近的检查点恢复
- **人机协作**：支持工作流暂停等待人工干预，然后继续执行
- **长时间任务**：将复杂任务分解为多个阶段，避免因单点失败导致全部重做
- **状态追踪**：提供完整的执行历史记录，便于调试和审计

Spring AI Alibaba Graph 通过内置的检查点保存器（Checkpoint Saver）实现持久执行，支持多种存储后端，确保状态数据的可靠性和一致性。

> **重要提示**：当您为 Spring AI Alibaba Graph 配置了检查点保存器时，持久执行功能会自动启用。工作流将在每个节点执行后自动保存状态，无需额外配置。

## 基本配置要求

要启用持久执行功能，需要满足以下基本要求：

### 1. 配置检查点保存器

Spring AI Alibaba Graph 支持多种检查点保存器：

- **MemorySaver**：内存存储，适用于开发和测试
- **RedisSaver**：Redis 存储，适用于分布式环境
- **MongoSaver**：MongoDB 存储，适用于需要复杂查询的场景

### 2. 指定线程标识符

每个工作流执行实例需要唯一的线程标识符（threadId），用于区分不同的执行上下文和状态存储。

### 3. 设计确定性节点

确保节点执行的幂等性和一致性，以支持可靠的状态恢复。

## 配置示例

### 基本持久执行配置

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.checkpoint.savers.RedisSaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

@Configuration
public class DurableExecutionConfig {

    @Bean
    public KeyStrategyFactory durableKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("messages", KeyStrategy.APPEND);
            strategies.put("current_step", KeyStrategy.REPLACE);
            strategies.put("progress", KeyStrategy.REPLACE);
            strategies.put("execution_id", KeyStrategy.REPLACE);
            return strategies;
        };
    }

    @Bean
    public StateGraph durableStateGraph(KeyStrategyFactory keyStrategyFactory) {
        return new StateGraph("持久执行示例", keyStrategyFactory)
            .addNode("step1", node_async(this::executeStep1))
            .addNode("step2", node_async(this::executeStep2))
            .addNode("step3", node_async(this::executeStep3))
            .addEdge(StateGraph.START, "step1")
            .addEdge("step1", "step2")
            .addEdge("step2", "step3")
            .addEdge("step3", StateGraph.END);
    }

    @Bean
    public CompiledGraph createDurableGraph(StateGraph durableStateGraph) {
        // 配置 Redis 检查点保存器
        RedisSaver redisSaver = new RedisSaver(redissonClient());

        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.REDIS, redisSaver)
            .type(SaverConstant.REDIS)
            .build();

        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .build();

        return durableStateGraph.compile(compileConfig);
    }

    // 节点执行逻辑
    private Map<String, Object> executeStep1(OverAllState state) {
        String executionId = state.value("execution_id", String.class)
            .orElse(UUID.randomUUID().toString());

        System.out.println("📝 执行步骤1，执行ID: " + executionId);

        return Map.of(
            "current_step", "step1_completed",
            "progress", 33,
            "execution_id", executionId,
            "messages", List.of("Step 1 completed at " + Instant.now())
        );
    }

    private Map<String, Object> executeStep2(OverAllState state) {
        String executionId = state.value("execution_id", String.class).orElse("");

        System.out.println("📝 执行步骤2，执行ID: " + executionId);

        return Map.of(
            "current_step", "step2_completed",
            "progress", 66,
            "execution_id", executionId,
            "messages", List.of("Step 2 completed at " + Instant.now())
        );
    }

    private Map<String, Object> executeStep3(OverAllState state) {
        String executionId = state.value("execution_id", String.class).orElse("");

        System.out.println("📝 执行步骤3，执行ID: " + executionId);

        return Map.of(
            "current_step", "step3_completed",
            "progress", 100,
            "execution_id", executionId,
            "messages", List.of("Step 3 completed at " + Instant.now())
        );
    }

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        config.useSingleServer().setAddress("redis://localhost:6379");
        return Redisson.create(config);
    }
}
```

### 内存存储配置（开发测试用）

```java
@Configuration
@Profile("dev")
public class MemoryDurableExecutionConfig {

    @Bean
    public CompiledGraph createMemoryDurableGraph(StateGraph durableStateGraph) {
        // 配置内存检查点保存器
        MemorySaver memorySaver = new MemorySaver();

        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, memorySaver)
            .type(SaverConstant.MEMORY)
            .build();

        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .build();

        return durableStateGraph.compile(compileConfig);
    }
}
```

## 确定性设计原则

持久执行的可靠性依赖于工作流的确定性设计。当工作流从检查点恢复时，系统会重新执行从检查点到中断点之间的所有步骤，因此确保节点执行的一致性和幂等性至关重要。

### 核心设计原则

#### 1. 幂等性设计

节点应该设计为幂等的，即多次执行产生相同的结果：

```java
@Component
public class IdempotentProcessingNode implements NodeAction {

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String input = state.value("input", String.class).orElse("");
        String processedKey = "processed_" + input.hashCode();

        // 检查是否已经处理过
        if (state.value(processedKey, Boolean.class).orElse(false)) {
            System.out.println("⏭️ 跳过已处理的数据: " + input);
            return Map.of(); // 已处理，返回空更新
        }

        // 执行处理逻辑
        String result = performProcessing(input);

        System.out.println("✅ 处理完成: " + input + " -> " + result);

        return Map.of(
            "result", result,
            processedKey, true  // 标记已处理
        );
    }

    private String performProcessing(String input) {
        // 实际的处理逻辑
        return "processed_" + input;
    }
}
```

#### 2. 避免副作用

将具有副作用的操作（如外部 API 调用、文件写入等）设计为可重复执行：

```java
@Component
public class SafeApiCallNode implements NodeAction {

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String url = state.value("api_url", String.class).orElse("");
        String cacheKey = "api_result_" + url.hashCode();

        // 检查缓存，避免重复调用
        String cachedResult = redisTemplate.opsForValue().get(cacheKey);
        if (cachedResult != null) {
            System.out.println("📋 使用缓存结果: " + cacheKey);
            return Map.of("api_result", cachedResult);
        }

        try {
            // 执行 API 调用
            String result = restTemplate.getForObject(url, String.class);

            // 缓存结果
            redisTemplate.opsForValue().set(cacheKey, result, Duration.ofHours(1));

            System.out.println("🌐 API 调用完成: " + url);
            return Map.of("api_result", result);

        } catch (Exception e) {
            System.err.println("❌ API 调用失败: " + e.getMessage());
            return Map.of(
                "api_result", "",
                "error", e.getMessage()
            );
        }
    }
}
```

#### 3. 状态一致性

确保状态更新的原子性和一致性：

```java
@Component
public class ConsistentStateUpdateNode implements NodeAction {

    @Override
    public Map<String, Object> apply(OverAllState state) {
        try {
            // 获取当前状态
            int currentStep = state.value("current_step", Integer.class).orElse(0);
            List<String> processedItems = state.value("processed_items", List.class)
                .orElse(new ArrayList<>());

            // 执行业务逻辑
            String newItem = processBusinessLogic(state);

            // 原子性更新状态
            Map<String, Object> updates = new HashMap<>();
            updates.put("current_step", currentStep + 1);
            updates.put("processed_items", List.of(newItem)); // 使用 APPEND 策略
            updates.put("last_update_time", Instant.now().toString());

            System.out.println("📊 状态更新: 步骤 " + (currentStep + 1));
            return updates;

        } catch (Exception e) {
            // 错误状态也要保持一致
            return Map.of(
                "error_occurred", true,
                "error_message", e.getMessage(),
                "error_time", Instant.now().toString()
            );
        }
    }

    private String processBusinessLogic(OverAllState state) {
        // 业务逻辑处理
        return "processed_item_" + System.currentTimeMillis();
    }
}
```

## 检查点保存策略

Spring AI Alibaba Graph 目前支持自动检查点保存，在每个节点执行完成后自动保存状态。未来版本将支持更灵活的保存策略配置。

### 当前实现

目前的检查点保存机制：

- **自动保存**：每个节点执行完成后自动创建检查点
- **状态完整性**：保存完整的状态数据和执行上下文
- **线程隔离**：不同线程的检查点独立存储和管理

```java
@Service
public class CheckpointDemoService {

    @Autowired
    private CompiledGraph durableGraph;

    public void demonstrateCheckpoints() {
        RunnableConfig config = RunnableConfig.builder()
            .threadId("demo-thread-" + System.currentTimeMillis())
            .build();

        // 执行工作流 - 自动保存检查点
        Optional<OverAllState> result = durableGraph.invoke(
            Map.of("input", "测试数据"),
            config
        );

        // 查看检查点历史
        Collection<StateSnapshot> history = durableGraph.getStateHistory(config);
        System.out.println("📚 检查点数量: " + history.size());

        history.forEach(snapshot -> {
            System.out.println("🔖 节点: " + snapshot.nodeId());
            System.out.println("📊 状态: " + snapshot.state().data());
        });
    }
}
```

### 计划中的持久性模式

> **开发状态**：以下持久性模式正在开发中，将在未来版本中提供。

**计划支持的模式：**

- **`immediate`**：每个节点执行后立即同步保存
- **`batch`**：批量保存多个节点的状态更新
- **`conditional`**：基于条件决定是否保存检查点
- **`manual`**：手动控制检查点保存时机

```java
// 未来版本的配置方式（开发中）
CompileConfig config = CompileConfig.builder()
    .saverConfig(saverConfig)
    .checkpointStrategy(CheckpointStrategy.IMMEDIATE)  // 开发中
    .checkpointInterval(Duration.ofMinutes(5))         // 开发中
    .build();
```

## 工作流恢复机制

### 故障恢复

Spring AI Alibaba Graph 支持从系统故障或异常中断中自动恢复工作流执行：

```java
@Service
public class DurableExecutionService {

    private static final Logger log = LoggerFactory.getLogger(DurableExecutionService.class);

    @Autowired
    private CompiledGraph durableGraph;

    /**
     * 从故障中恢复工作流执行
     */
    public Optional<OverAllState> resumeFromFailure(String threadId) {
        try {
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            // 检查是否存在检查点
            Optional<StateSnapshot> lastState = durableGraph.stateOf(config);
            if (lastState.isEmpty()) {
                log.warn("⚠️ 未找到线程 {} 的检查点", threadId);
                return Optional.empty();
            }

            log.info("🔄 从检查点恢复工作流，线程ID: {}", threadId);
            log.info("📍 恢复点: {}", lastState.get().nodeId());

            // 使用 null 输入从最后检查点恢复
            Optional<OverAllState> result = durableGraph.invoke(null, config);

            if (result.isPresent()) {
                log.info("✅ 工作流恢复成功: {}", threadId);
            } else {
                log.warn("⚠️ 工作流恢复完成但无结果: {}", threadId);
            }

            return result;

        } catch (Exception e) {
            log.error("❌ 工作流恢复失败，线程ID: " + threadId, e);
            return Optional.empty();
        }
    }

    /**
     * 检查工作流状态
     */
    public WorkflowStatus checkWorkflowStatus(String threadId) {
        try {
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            Optional<StateSnapshot> stateSnapshot = durableGraph.stateOf(config);
            if (stateSnapshot.isEmpty()) {
                return WorkflowStatus.NOT_FOUND;
            }

            StateSnapshot snapshot = stateSnapshot.get();
            String nodeId = snapshot.nodeId();

            if (StateGraph.END.equals(nodeId)) {
                return WorkflowStatus.COMPLETED;
            } else if (StateGraph.START.equals(nodeId)) {
                return WorkflowStatus.STARTED;
            } else {
                return WorkflowStatus.IN_PROGRESS;
            }

        } catch (Exception e) {
            log.error("检查工作流状态失败，线程ID: " + threadId, e);
            return WorkflowStatus.ERROR;
        }
    }

    public enum WorkflowStatus {
        NOT_FOUND, STARTED, IN_PROGRESS, COMPLETED, ERROR
    }
}
```

### 状态管理和查询

```java
@Service
public class WorkflowStateManager {

    private static final Logger log = LoggerFactory.getLogger(WorkflowStateManager.class);

    @Autowired
    private CompiledGraph durableGraph;

    /**
     * 获取当前工作流状态
     */
    public Optional<StateSnapshot> getCurrentState(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        return durableGraph.stateOf(config);
    }

    /**
     * 获取完整的执行历史
     */
    public Collection<StateSnapshot> getExecutionHistory(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        return durableGraph.getStateHistory(config);
    }

    /**
     * 检查工作流是否已完成
     */
    public boolean isWorkflowCompleted(String threadId) {
        Optional<StateSnapshot> state = getCurrentState(threadId);
        return state.map(s -> StateGraph.END.equals(s.nodeId())).orElse(false);
    }

    /**
     * 检查工作流是否失败
     */
    public boolean isWorkflowFailed(String threadId) {
        Optional<StateSnapshot> state = getCurrentState(threadId);
        if (state.isPresent()) {
            OverAllState currentState = state.get().state();
            return currentState.value("error", Boolean.class).orElse(false);
        }
        return false;
    }

    /**
     * 更新工作流状态
     */
    public RunnableConfig updateWorkflowState(String threadId, Map<String, Object> updates) {
        try {
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            RunnableConfig newConfig = durableGraph.updateState(config, updates, null);
            log.info("📝 状态更新成功，线程ID: {}", threadId);
            return newConfig;

        } catch (Exception e) {
            log.error("状态更新失败，线程ID: " + threadId, e);
            throw new RuntimeException("状态更新失败", e);
        }
    }

    /**
     * 标记工作流为失败状态
     */
    public void markWorkflowAsFailed(String threadId, String errorMessage) {
        Map<String, Object> updates = Map.of(
            "error", true,
            "error_message", errorMessage,
            "failed_at", Instant.now().toString()
        );

        updateWorkflowState(threadId, updates);
        log.error("❌ 工作流标记为失败，线程ID: {}，错误: {}", threadId, errorMessage);
    }

    /**
     * 打印执行历史摘要
     */
    public void printExecutionSummary(String threadId) {
        Collection<StateSnapshot> history = getExecutionHistory(threadId);

        System.out.println("📋 执行历史摘要 - 线程ID: " + threadId);
        System.out.println("📊 总检查点数: " + history.size());

        history.forEach(snapshot -> {
            System.out.printf("  🔖 节点: %-15s | 检查点ID: %s%n",
                snapshot.nodeId(),
                snapshot.config().checkPointId().orElse("N/A"));
        });
    }
}
```

## 时间旅行调试

时间旅行调试是持久执行的重要特性，允许开发者查看工作流在任何时间点的状态，这对于调试复杂工作流和理解执行行为非常有价值。

### 核心概念

当使用基于模型决策的非确定性系统（例如，由 LLM 驱动的智能体）时，详细检查其决策过程具有重要价值：

1. **🤔 理解推理**：分析导致成功结果的步骤序列
2. **🐞 调试错误**：识别错误发生的位置和根本原因
3. **🔍 探索替代方案**：测试不同路径以发现更优解决方案
4. **📊 性能分析**：评估不同执行路径的效率

Spring AI Alibaba Graph 通过检查点机制提供时间旅行功能，支持从任意历史状态恢复和重新执行工作流。

### 时间旅行操作流程

使用时间旅行功能的标准流程：

1. **运行工作流**：使用 `invoke` 或 `stream` 方法执行初始工作流
2. **查看执行历史**：使用 `getStateHistory()` 检索特定线程的完整执行历史
3. **选择目标检查点**：根据调试需求选择合适的历史状态点
4. **修改状态（可选）**：使用 `updateState` 修改检查点状态以探索替代路径
5. **恢复执行**：从选定的检查点继续执行工作流

### 历史状态查看和分析

```java
@Service
public class TimeTravelDebugger {

    private static final Logger log = LoggerFactory.getLogger(TimeTravelDebugger.class);

    @Autowired
    private CompiledGraph durableGraph;

    /**
     * 分析工作流执行历史
     */
    public void analyzeExecutionHistory(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        Collection<StateSnapshot> history = durableGraph.getStateHistory(config);

        System.out.println("🕰️ === 工作流执行历史分析 ===");
        System.out.println("📋 线程ID: " + threadId);
        System.out.println("📊 总步骤数: " + history.size());
        System.out.println();

        int stepNumber = 0;
        for (StateSnapshot snapshot : history) {
            System.out.printf("📍 步骤 %d:%n", stepNumber++);
            System.out.println("  🏷️  节点: " + snapshot.nodeId());
            System.out.println("  🔖 检查点ID: " + snapshot.config().checkPointId().orElse("N/A"));
            System.out.println("  📊 状态数据: " + formatStateData(snapshot.state().data()));
            System.out.println("  ⏰ 创建时间: " + snapshot.createdAt().orElse("N/A"));
            System.out.println();
        }
    }

    /**
     * 获取特定步骤的状态快照
     */
    public Optional<StateSnapshot> getStateAtStep(String threadId, int stepNumber) {
        Collection<StateSnapshot> history = getExecutionHistory(threadId);

        if (stepNumber < 0 || stepNumber >= history.size()) {
            log.warn("⚠️ 无效的步骤号: {}，总步骤数: {}", stepNumber, history.size());
            return Optional.empty();
        }

        return history.stream()
            .skip(stepNumber)
            .findFirst();
    }

    /**
     * 比较两个时间点的状态差异
     */
    public void compareStates(String threadId, int step1, int step2) {
        Optional<StateSnapshot> state1 = getStateAtStep(threadId, step1);
        Optional<StateSnapshot> state2 = getStateAtStep(threadId, step2);

        if (state1.isEmpty() || state2.isEmpty()) {
            System.out.println("❌ 无法获取指定步骤的状态");
            return;
        }

        System.out.printf("🔍 状态比较: 步骤 %d vs 步骤 %d%n", step1, step2);
        System.out.println("📍 节点: " + state1.get().nodeId() + " -> " + state2.get().nodeId());

        Map<String, Object> data1 = state1.get().state().data();
        Map<String, Object> data2 = state2.get().state().data();

        // 分析状态变化
        analyzeStateChanges(data1, data2);
    }

    private void analyzeStateChanges(Map<String, Object> before, Map<String, Object> after) {
        // 找出新增的键
        Set<String> newKeys = new HashSet<>(after.keySet());
        newKeys.removeAll(before.keySet());
        if (!newKeys.isEmpty()) {
            System.out.println("➕ 新增字段: " + newKeys);
        }

        // 找出删除的键
        Set<String> removedKeys = new HashSet<>(before.keySet());
        removedKeys.removeAll(after.keySet());
        if (!removedKeys.isEmpty()) {
            System.out.println("➖ 删除字段: " + removedKeys);
        }

        // 找出修改的键
        before.keySet().stream()
            .filter(after::containsKey)
            .filter(key -> !Objects.equals(before.get(key), after.get(key)))
            .forEach(key -> {
                System.out.printf("🔄 字段变更 %s: %s -> %s%n",
                    key, before.get(key), after.get(key));
            });
    }

    private Collection<StateSnapshot> getExecutionHistory(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        return durableGraph.getStateHistory(config);
    }

    private String formatStateData(Map<String, Object> data) {
        if (data.isEmpty()) {
            return "{}";
        }

        return data.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + entry.getValue())
            .collect(Collectors.joining(", ", "{", "}"));
    }
}
```

### 状态分支和实验

时间旅行的一个重要应用是创建执行分支，用于实验不同的决策路径：

```java
@Service
public class ExecutionBranchingService {

    @Autowired
    private CompiledGraph durableGraph;

    /**
     * 从特定检查点创建新的执行分支
     */
    public String createBranchFromCheckpoint(String originalThreadId, int stepNumber, String branchSuffix) {
        Optional<StateSnapshot> targetState = getStateAtStep(originalThreadId, stepNumber);
        if (targetState.isEmpty()) {
            throw new IllegalArgumentException("无法找到步骤 " + stepNumber + " 的状态");
        }

        String newThreadId = originalThreadId + "_branch_" + branchSuffix;

        // 创建新的配置，使用目标状态作为起点
        RunnableConfig newConfig = RunnableConfig.builder()
            .threadId(newThreadId)
            .build();

        // 将目标状态复制到新线程
        durableGraph.updateState(newConfig, targetState.get().state().data(), null);

        System.out.println("🌿 创建执行分支: " + originalThreadId + " -> " + newThreadId);
        System.out.println("📍 分支起点: 步骤 " + stepNumber + "，节点 " + targetState.get().nodeId());

        return newThreadId;
    }

    /**
     * 修改状态并继续执行
     */
    public Optional<OverAllState> executeWithModifiedState(String threadId, Map<String, Object> stateModifications) {
        try {
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            // 应用状态修改
            RunnableConfig updatedConfig = durableGraph.updateState(config, stateModifications, null);

            // 从修改后的状态继续执行
            Optional<OverAllState> result = durableGraph.invoke(null, updatedConfig);

            System.out.println("🔄 状态修改并继续执行完成");
            return result;

        } catch (Exception e) {
            System.err.println("❌ 执行失败: " + e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 并行测试多个分支
     */
    public Map<String, OverAllState> testMultipleBranches(String originalThreadId, int branchPoint,
                                                          Map<String, Map<String, Object>> branchModifications) {
        Map<String, OverAllState> results = new HashMap<>();

        for (Map.Entry<String, Map<String, Object>> branch : branchModifications.entrySet()) {
            String branchName = branch.getKey();
            Map<String, Object> modifications = branch.getValue();

            try {
                // 创建分支
                String branchThreadId = createBranchFromCheckpoint(originalThreadId, branchPoint, branchName);

                // 执行分支
                Optional<OverAllState> result = executeWithModifiedState(branchThreadId, modifications);

                if (result.isPresent()) {
                    results.put(branchName, result.get());
                    System.out.println("✅ 分支 " + branchName + " 执行成功");
                } else {
                    System.out.println("❌ 分支 " + branchName + " 执行失败");
                }

            } catch (Exception e) {
                System.err.println("❌ 分支 " + branchName + " 创建失败: " + e.getMessage());
            }
        }

        return results;
    }

    private Optional<StateSnapshot> getStateAtStep(String threadId, int stepNumber) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        Collection<StateSnapshot> history = durableGraph.getStateHistory(config);

        return history.stream()
            .skip(stepNumber)
            .findFirst();
    }
}
```

## 下一步

- [状态管理](./state-management) - 深入了解状态管理机制
- [人机协作](../human-in-the-loop) - 学习人机协作模式
- [可视化调试](../graph/visualization-debugging) - 掌握调试和监控技巧
- [最佳实践](./best-practices) - 了解开发最佳实践
