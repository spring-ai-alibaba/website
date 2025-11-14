---
title: 并行处理
keywords: [Spring AI,并行处理,ParallelNode,MergedGenerator,并行流式]
description: "深入理解 Spring AI Alibaba Graph 的并行处理机制"
---

## 并行节点与流式处理

**Spring AI Alibaba Graph提供了强大的并行处理能力**，能够同时执行多个节点任务，显著提升工作流的处理效率。框架不仅支持简单的并行执行，还实现了复杂的并行流式处理合并机制。

### 核心技术特点

- **自动并行检测**：编译时自动识别多目标边并转换为ParallelNode
- **真正的并行执行**：基于CompletableFuture.allOf()实现真正的并行处理
- **智能流式合并**：自动合并多个并行分支的AsyncGenerator输出
- **状态一致性保障**：通过KeyStrategy确保并行结果的正确合并

![并行节点](img\user\ai\tutorials\graph\advanced-features\parallel\parallel.svg)

## 并行节点的两种创建方式

Spring AI Alibaba Graph提供了两种创建并行节点的方式，这两种方式在底层实现上有所不同，但都能实现并行处理的效果。

### 方式一：直接创建ParallelNode

直接创建一个ParallelNode实例，并将其注册到StateGraph中：

```java
// 创建并行任务列表
List<AsyncNodeActionWithConfig> parallelActions = List.of(
    node_async(new DataProcessingNode1()),
    node_async(new DataProcessingNode2()),
    node_async(new DataProcessingNode3())
);

// 定义状态合并策略
Map<String, KeyStrategy> channels = Map.of(
    "results", new AppendStrategy(),
    "metadata", new ReplaceStrategy()
);

// 创建并行节点
ParallelNode parallelNode = new ParallelNode(
    "data_processing",           // 节点内部ID  
    parallelActions,            // 并行任务列表
    channels                    // KeyStrategy映射
);

// 添加到StateGraph
stateGraph.addNode("parallel_tasks", parallelNode);
```

### 方式二：通过StateGraph描述并行边

**这是更常用的方式**，通过添加多个指向相同目标的边来定义并行结构：

```java
StateGraph workflow = new StateGraph(keyStrategyFactory)
    .addNode("source", node_async(sourceNode))
    .addNode("task1", node_async(task1Node))
    .addNode("task2", node_async(task2Node))
    .addNode("task3", node_async(task3Node))
    .addNode("merger", node_async(mergerNode))
    
    // 创建并行分支 - 从source到多个任务
    .addEdge("source", "task1")
    .addEdge("source", "task2")
    .addEdge("source", "task3")
    
    // 汇聚到merger节点
    .addEdge("task1", "merger")
    .addEdge("task2", "merger")
    .addEdge("task3", "merger")
    
    .addEdge(START, "source")
    .addEdge("merger", END);
```

### 编译时转换机制

当StateGraph编译时，框架会自动检测并行边模式，并在内部创建ParallelNode：

```java
// CompiledGraph编译过程中的实际处理逻辑
for (var e : processedData.edges().elements) {
    var targets = e.targets();
    if (targets.size() == 1) {
        // 单目标边，直接添加
        edges.put(e.sourceId(), targets.get(0));
    }
    else {
        // 多目标边，检测并行模式
        Supplier<Stream<EdgeValue>> parallelNodeStream = () -> targets.stream()
            .filter(target -> nodes.containsKey(target.id()));
        
        var parallelNodeTargets = parallelNodeStream.get()
            .map(target -> target.id())
            .collect(Collectors.toSet());
        
        // 验证并行目标的一致性
        if (parallelNodeTargets.size() > 1) {
            throw Errors.illegalMultipleTargetsOnParallelNode.exception(
                e.sourceId(), parallelNodeTargets);
        }
        
        // 获取所有并行节点的Action
        var actions = parallelNodeStream.get()
            .map(target -> nodes.get(target.id()))
            .toList();
        
        // 创建ParallelNode并替换原有节点
        var parallelNode = new ParallelNode(e.sourceId(), actions, keyStrategyMap);
        nodes.put(parallelNode.id(), parallelNode.actionFactory().apply(compileConfig));
        edges.put(e.sourceId(), new EdgeValue(parallelNode.id()));
        edges.put(parallelNode.id(), new EdgeValue(parallelNodeTargets.iterator().next()));
    }
}
```

## 并行节点的内部执行机制

**ParallelNode的核心实现**基于CompletableFuture.allOf()，实现真正的并行执行：

### AsyncParallelNodeAction实现

```java
public class ParallelNode extends Node {
    public static final String PARALLEL_PREFIX = "__PARALLEL__";
    
    record AsyncParallelNodeAction(
        List<AsyncNodeActionWithConfig> actions,
        Map<String, KeyStrategy> channels
    ) implements AsyncNodeActionWithConfig {
        
        @Override
        public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
            Map<String, Object> partialMergedStates = new HashMap<>();
            Map<String, Object> asyncGenerators = new HashMap<>();
            
            // 并行执行所有Action
            var futures = actions.stream()
                .map(action -> action.apply(state, config)
                    .thenApply(partialState -> {
                        // 分离普通结果和AsyncGenerator
                        partialState.forEach((key, value) -> {
                            if (value instanceof AsyncGenerator<?> || value instanceof GeneratorSubscriber) {
                                ((List) asyncGenerators.computeIfAbsent(key, k -> new ArrayList<>())).add(value);
                            } else {
                                partialMergedStates.put(key, value);
                            }
                        });
                        // 立即更新状态
                        state.updateState(partialMergedStates);
                        return action;
                    }))
                .toList()
                .toArray(new CompletableFuture[0]);
            
            // 等待所有任务完成
            return CompletableFuture.allOf(futures)
                .thenApply((p) -> CollectionUtils.isEmpty(asyncGenerators) 
                    ? state.data() 
                    : asyncGenerators);
        }
    }
    
    public ParallelNode(String id, List<AsyncNodeActionWithConfig> actions, Map<String, KeyStrategy> channels) {
        super(format("%s(%s)", PARALLEL_PREFIX, id), (config) -> new AsyncParallelNodeAction(actions, channels));
    }
    
    @Override
    public final boolean isParallel() {
        return true;
    }
}
```

## 并行流式处理的合并机制

**核心挑战**：当多个并行分支都产生流式输出时，如何将这些异步流合并成统一的输出流？

Spring AI Alibaba Graph通过`AsyncGeneratorUtils.createMergedGenerator`在**框架内核中**解决了这个复杂问题。

### 流式合并架构

![流式合并架构图](/img/user/ai/tutorials/graph/advanced-features/streaming/streaming.svg)

### MergedGenerator核心实现

**AsyncGeneratorUtils.createMergedGenerator**是框架内核的核心算法，实现了多个异步流的智能合并：

```java
public static <T> AsyncGenerator<T> createMergedGenerator(
    List<AsyncGenerator<T>> generators,
    Map<String, KeyStrategy> keyStrategyMap) {
    
    return new AsyncGenerator<>() {
        // 使用StampedLock优化并发性能
        private final StampedLock lock = new StampedLock();
        private AtomicInteger pollCounter = new AtomicInteger(0);
        private Map<String, Object> mergedResult = new HashMap<>();
        private final List<AsyncGenerator<T>> activeGenerators = new CopyOnWriteArrayList<>(generators);
        
        @Override
        public AsyncGenerator.Data<T> next() {
            while (true) {
                // 乐观读锁快速检查
                long stamp = lock.tryOptimisticRead();
                boolean empty = activeGenerators.isEmpty();
                if (!lock.validate(stamp)) {
                    stamp = lock.readLock();
                    try {
                        empty = activeGenerators.isEmpty();
                    } finally {
                        lock.unlockRead(stamp);
                    }
                }
                if (empty) {
                    return AsyncGenerator.Data.done(mergedResult);
                }
                
                // 轮询策略选择Generator
                final AsyncGenerator<T> current;
                long writeStamp = lock.writeLock();
                try {
                    final int size = activeGenerators.size();
                    if (size == 0) return AsyncGenerator.Data.done(mergedResult);
                    
                    int currentIdx = pollCounter.updateAndGet(i -> (i + 1) % size);
                    current = activeGenerators.get(currentIdx);
                } finally {
                    lock.unlockWrite(writeStamp);
                }
                
                // 在无锁状态下执行Generator
                AsyncGenerator.Data<T> data = current.next();
                
                // 处理结果并更新状态
                writeStamp = lock.writeLock();
                try {
                    if (!activeGenerators.contains(current)) {
                        continue;
                    }
                    
                    if (data.isDone() || data.isError()) {
                        handleCompletedGenerator(current, data);
                        if (activeGenerators.isEmpty()) {
                            return AsyncGenerator.Data.done(mergedResult);
                        }
                        continue;
                    }
                    
                    handleCompletedGenerator(current, data);
                    return data;
                } finally {
                    lock.unlockWrite(writeStamp);
                }
            }
        }
        
        private void handleCompletedGenerator(AsyncGenerator<T> generator, AsyncGenerator.Data<T> data) {
            // 移除完成的Generator
            if (data.isDone() || data.isError()) {
                activeGenerators.remove(generator);
            }
            
            // 使用KeyStrategy合并结果
            data.resultValue().ifPresent(result -> {
                if (result instanceof Map) {
                    Map<String, Object> mapResult = (Map<String, Object>) result;
                    mergedResult = OverAllState.updateState(mergedResult, mapResult, keyStrategyMap);
                }
            });
        }
    };
}
```

### 核心算法特点

- **轮询机制**：通过pollCounter实现公平的轮询调度
- **StampedLock优化**：使用乐观读锁提高并发性能  
- **状态合并**：通过KeyStrategy实现灵活的状态合并策略
- **线程安全**：CopyOnWriteArrayList确保并发访问的安全性

## 重要使用注意事项

### 并行目标约束

并行节点的所有分支**必须汇聚到同一个目标节点**，否则编译会失败：

```java
// ✅ 正确：所有并行分支汇聚到同一个节点
.addEdge("source", "task1")
.addEdge("source", "task2") 
.addEdge("source", "task3")
.addEdge("task1", "merger")  // 全部指向merger
.addEdge("task2", "merger")
.addEdge("task3", "merger")

// ❌ 错误：并行分支指向不同目标
.addEdge("source", "task1")
.addEdge("source", "task2")
.addEdge("task1", "target1")  // 指向target1
.addEdge("task2", "target2")  // 指向target2 - 编译失败！
```

### 条件边限制

**并行节点不支持条件边**：

```java
// ❌ 错误：并行节点使用条件边会导致编译失败
.addEdge("source", "task1")
.addEdge("source", "task2")
.addConditionalEdges("source", condition, mappings)  // 不支持！
```
