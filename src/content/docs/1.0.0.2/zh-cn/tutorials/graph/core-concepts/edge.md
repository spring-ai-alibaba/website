---
title: Edge - 边
keywords: [Spring AI,Edge,边,路由,条件判断]
description: "深入理解 Edge 的路由机制、条件判断和智能分支控制。"
---

## 什么是 Edge

**Edge是Spring AI Alibaba Graph中的路由控制组件**，负责定义工作流中节点之间的转换关系和执行顺序。Edge不仅提供静态的节点连接，还支持基于运行时状态的动态路由决策，是实现复杂工作流控制逻辑的核心基础设施。

**核心功能定位**：Edge承载着工作流的控制流逻辑，通过静态边和条件边的有机结合，为从简单的线性流程到复杂的智能决策树提供完整的路由控制能力。Edge的设计遵循了分离关注点的原则，将路由逻辑与业务逻辑解耦，提高了工作流的可维护性和可扩展性。

## Edge核心架构设计

**Edge的架构设计采用了组合模式和策略模式的结合**，通过清晰的数据结构分层和灵活的路由策略，为不同复杂度的工作流场景提供统一的路由控制接口。

### 数据结构层次

Spring AI Alibaba Graph中的边系统由以下核心数据结构组成：

```java
// Edge类 - 边的容器和管理单元
public record Edge(String sourceId, List<EdgeValue> targets) {
    // 单目标边构造器
    public Edge(String sourceId, EdgeValue target) {
        this(sourceId, List.of(target));
    }
    
    // 并行边检查
    public boolean isParallel() {
        return targets.size() > 1;
    }
    
    // 获取单目标边的目标
    public EdgeValue target() {
        if (isParallel()) {
            throw new IllegalStateException(format("Edge '%s' is parallel", sourceId));
        }
        return targets.get(0);
    }
}

// EdgeValue类 - 边的值定义和路由目标
public record EdgeValue(String id, EdgeCondition value) {
    // 静态边构造器
    public EdgeValue(String id) {
        this(id, null);
    }
    
    // 条件边构造器
    public EdgeValue(EdgeCondition value) {
        this(null, value);
    }
}

// EdgeCondition类 - 条件边的决策逻辑封装
public record EdgeCondition(AsyncCommandAction action, Map<String, String> mappings) {
    @Override
    public String toString() {
        return format("EdgeCondition[ %s, mapping=%s]", action != null ? "action" : "null", mappings);
    }
}
```

### 边的类型体系

**Edge支持三种基本类型**，每种类型都有其特定的适用场景和实现机制：

- **静态边（Static Edge）**：预定义的固定路由，执行效率高，适用于确定性的流程控制
- **条件边（Conditional Edge）**：基于状态的动态路由，灵活性强，适用于复杂的业务逻辑分支
- **并行边（Parallel Edge）**：同源多目标路由，支持并发执行，适用于可并行处理的工作流分支

## 静态边机制

**静态边是最基础的连接方式**，提供确定性的节点转换关系，构成工作流的主要骨架。静态边在编译阶段就确定了路由关系，运行时直接进行节点跳转，具有最高的执行效率。

```java
// 添加静态边的API
public StateGraph addEdge(String sourceId, String targetId) throws GraphStateException {
    if (Objects.equals(sourceId, END)) {
        throw Errors.invalidEdgeIdentifier.exception(END);
    }
    
    var newEdge = new Edge(sourceId, new EdgeValue(targetId));
    
    // 支持并行边：同一源节点指向多个目标
    int index = edges.elements.indexOf(newEdge);
    if (index >= 0) {
        var newTargets = new ArrayList<>(edges.elements.get(index).targets());
        newTargets.add(newEdge.target());
        edges.elements.set(index, new Edge(sourceId, newTargets));
    } else {
        edges.elements.add(newEdge);
    }
    
    return this;
}
```

**使用示例**：

```java
StateGraph workflow = new StateGraph("示例工作流", stateFactory)
    .addNode("start_node", node_async(startAction))
    .addNode("process_node", node_async(processAction))
    .addNode("end_node", node_async(endAction))
    
    // 添加静态边
    .addEdge(START, "start_node")
    .addEdge("start_node", "process_node")
    .addEdge("process_node", "end_node")
    .addEdge("end_node", END);
```

## 条件边机制

**条件边是Edge智能化路由能力的核心体现**，通过AsyncCommandAction实现基于运行时状态的动态路由决策。条件边的设计允许工作流根据数据内容、处理结果或外部条件动态选择执行路径。

### 条件边的执行机制

**条件边的执行遵循"状态解析-条件评估-映射查找-路由跳转"的四阶段处理流程**：

1. **状态解析阶段**：将当前状态数据转换为OverAllState对象
2. **条件评估阶段**：执行AsyncCommandAction，分析当前状态并返回路由决策
3. **映射查找阶段**：根据评估结果在mappings中查找对应的目标节点
4. **路由跳转阶段**：执行状态更新并跳转到映射表中指定的目标节点

![条件边执行机制](/img/user/ai/tutorials/graph/core-concepts/edge/condition.svg)

```java
// 添加条件边的API
public StateGraph addConditionalEdges(String sourceId, AsyncCommandAction condition, Map<String, String> mappings) 
        throws GraphStateException {
    if (Objects.equals(sourceId, END)) {
        throw Errors.invalidEdgeIdentifier.exception(END);
    }
    if (mappings == null || mappings.isEmpty()) {
        throw Errors.edgeMappingIsEmpty.exception(sourceId);
    }
    
    var newEdge = new Edge(sourceId, new EdgeValue(new EdgeCondition(condition, mappings)));
    
    if (edges.elements.contains(newEdge)) {
        throw Errors.duplicateConditionalEdgeError.exception(sourceId);
    } else {
        edges.elements.add(newEdge);
    }
    return this;
}
```

**条件评估的核心处理逻辑**：

```java
// CompiledGraph中的条件边处理逻辑
private Command nextNodeId(EdgeValue route, Map<String, Object> state, String nodeId, RunnableConfig config) 
        throws Exception {
    if (route == null) {
        throw RunnableErrors.missingEdge.exception(nodeId);
    }
    
    // 静态边处理
    if (route.id() != null) {
        return new Command(route.id(), state);
    }
    
    // 条件边处理
    if (route.value() != null) {
        OverAllState derefState = stateGraph.getStateFactory().apply(state);
        
        // 执行条件动作
        var command = route.value().action().apply(derefState, config).get();
        var newRoute = command.gotoNode();
        
        // 在映射中查找目标节点
        String result = route.value().mappings().get(newRoute);
        if (result == null) {
            throw RunnableErrors.missingNodeInEdgeMapping.exception(nodeId, newRoute);
        }
        
        // 更新状态
        var currentState = OverAllState.updateState(state, command.update(), keyStrategyMap);
        return new Command(result, currentState);
    }
    
    throw RunnableErrors.executionError.exception(format("invalid edge value for nodeId: [%s] !", nodeId));
}
```

**使用示例**：

```java
// 定义条件判断逻辑
public class FeedbackDispatcher implements AsyncCommandAction {
    @Override
    public CompletableFuture<Command> apply(OverAllState state, RunnableConfig config) {
        return CompletableFuture.supplyAsync(() -> {
            String classifierOutput = (String) state.value("classifier_output").orElse("");
            
            // 根据分类结果决定路由
            if (classifierOutput.contains("positive")) {
                return new Command("positive");
            } else {
                return new Command("negative");
            }
        });
    }
}

// 使用条件边
StateGraph workflow = new StateGraph("客户服务工作流", stateFactory)
    .addNode("classifier", node_async(classifierNode))
    .addNode("positive_handler", node_async(positiveHandler))
    .addNode("negative_handler", node_async(negativeHandler))
    
    .addEdge(START, "classifier")
    .addConditionalEdges("classifier", 
        new FeedbackDispatcher(),
        Map.of("positive", "positive_handler", 
               "negative", "negative_handler"))
    .addEdge("positive_handler", END)
    .addEdge("negative_handler", END);
```

## 并行边机制

**并行边机制支持同一源节点指向多个目标节点的并发执行模式**。当检测到并行边时，框架会自动创建ParallelNode来协调多个目标节点的并发执行，并处理结果的合并和状态的同步。

### 并行边编译处理

**并行边在编译阶段会经过特殊的处理和优化**：

```java
// CompiledGraph编译时的并行边处理逻辑
for (var e : processedData.edges().elements) {
    var targets = e.targets();
    if (targets.size() == 1) {
        edges.put(e.sourceId(), targets.get(0));
    } else {
        // 并行边处理逻辑
        Supplier<Stream<EdgeValue>> parallelNodeStream = () -> targets.stream()
            .filter(target -> nodes.containsKey(target.id()));

        var parallelNodeTargets = parallelNodeEdges.stream()
            .map(ee -> ee.target().id())
            .collect(Collectors.toSet());

        // 检查并行边的约束条件
        if (parallelNodeTargets.size() > 1) {
            var conditionalEdges = parallelNodeEdges.stream()
                .filter(ee -> ee.target().value() != null)
                .toList();
            if (!conditionalEdges.isEmpty()) {
                throw Errors.unsupportedConditionalEdgeOnParallelNode.exception(e.sourceId(),
                        conditionalEdges.stream().map(Edge::sourceId).toList());
            }
            throw Errors.illegalMultipleTargetsOnParallelNode.exception(e.sourceId(), parallelNodeTargets);
        }

        var actions = parallelNodeStream.get()
            .map(target -> nodes.get(target.id()))
            .toList();

        // 创建ParallelNode
        var parallelNode = new ParallelNode(e.sourceId(), actions, keyStrategyMap);
        
        nodes.put(parallelNode.id(), parallelNode.actionFactory().apply(compileConfig));
        edges.put(e.sourceId(), new EdgeValue(parallelNode.id()));
        edges.put(parallelNode.id(), new EdgeValue(parallelNodeTargets.iterator().next()));
    }
}
```

### 并行边的约束条件

**并行边的使用存在以下技术约束**：

1. **目标一致性约束**：所有并行分支最终必须汇聚到同一个目标节点
2. **条件边排斥约束**：并行边不支持条件边，所有分支都必须是静态边
3. **状态合并约束**：并行执行的结果需要通过键策略进行状态合并

**使用示例**：

```java
// 创建并行边
StateGraph workflow = new StateGraph("并行处理工作流", stateFactory)
    .addNode("source", node_async(sourceAction))
    .addNode("task1", node_async(task1Action))
    .addNode("task2", node_async(task2Action))
    .addNode("task3", node_async(task3Action))
    .addNode("merger", node_async(mergerAction))
    
    // 从source创建三条并行边
    .addEdge("source", "task1")
    .addEdge("source", "task2")
    .addEdge("source", "task3")
    
    // 汇聚到merger
    .addEdge("task1", "merger")
    .addEdge("task2", "merger")
    .addEdge("task3", "merger")
    
    .addEdge(START, "source")
    .addEdge("merger", END);
```

## 边的验证机制

**Edge类内置了完善的验证机制**，确保图结构的正确性和一致性，在编译阶段提前发现和报告配置错误。

### 验证规则体系

```java
public void validate(StateGraph.Nodes nodes) throws GraphStateException {
    // 验证源节点存在性
    if (!Objects.equals(sourceId(), START) && !nodes.anyMatchById(sourceId())) {
        throw Errors.missingNodeReferencedByEdge.exception(sourceId());
    }
    
    // 并行边重复目标检查
    if (isParallel()) {
        Set<String> duplicates = targets.stream()
            .collect(Collectors.groupingBy(EdgeValue::id, Collectors.counting()))
            .entrySet().stream()
            .filter(entry -> entry.getValue() > 1)
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());
        if (!duplicates.isEmpty()) {
            throw Errors.duplicateEdgeTargetError.exception(sourceId(), duplicates);
        }
    }
    
    // 验证每个目标
    for (EdgeValue target : targets) {
        validate(target, nodes);
    }
}

private void validate(EdgeValue target, StateGraph.Nodes nodes) throws GraphStateException {
    if (target.id() != null) {
        // 静态边：验证目标节点存在
        if (!Objects.equals(target.id(), StateGraph.END) && !nodes.anyMatchById(target.id())) {
            throw Errors.missingNodeReferencedByEdge.exception(target.id());
        }
    } else if (target.value() != null) {
        // 条件边：验证映射中的所有目标节点
        for (String nodeId : target.value().mappings().values()) {
            if (!Objects.equals(nodeId, StateGraph.END) && !nodes.anyMatchById(nodeId)) {
                throw Errors.missingNodeInEdgeMapping.exception(sourceId(), nodeId);
            }
        }
    } else {
        throw Errors.invalidEdgeTarget.exception(sourceId());
    }
}
```

### 常见验证错误类型

1. **缺少节点引用错误**：边指向不存在的节点
2. **重复边目标错误**：并行边中有重复的目标节点
3. **空映射错误**：条件边的映射为空
4. **无效边标识符错误**：使用END作为源节点
5. **并行边条件冲突错误**：在并行边中使用条件边

## 动作接口体系

### AsyncCommandAction接口

**AsyncCommandAction是条件边的核心接口**，定义了动态路由决策的标准契约：

```java
public interface AsyncCommandAction extends BiFunction<OverAllState, RunnableConfig, CompletableFuture<Command>> {
    
    // 静态工厂方法：同步转异步
    static AsyncCommandAction node_async(CommandAction syncAction) {
        return (state, config) -> {
            var result = new CompletableFuture<Command>();
            try {
                result.complete(syncAction.apply(state, config));
            } catch (Exception e) {
                result.completeExceptionally(e);
            }
            return result;
        };
    }
    
    // 从AsyncEdgeAction转换
    static AsyncCommandAction of(AsyncEdgeAction action) {
        return (state, config) -> action.apply(state).thenApply(Command::new);
    }
}
```

### Command类

**Command类封装路由决策结果和状态更新**：

```java
public record Command(String gotoNode, Map<String, Object> update) {
    public Command {
        Objects.requireNonNull(gotoNode, "gotoNode cannot be null");
        Objects.requireNonNull(update, "update cannot be null");
    }
    
    // 只指定目标节点，无状态更新
    public Command(String gotoNode) {
        this(gotoNode, Map.of());
    }
}
```

### EdgeAction和AsyncEdgeAction

**简化的边动作接口，提供更轻量级的条件判断能力**：

```java
// 同步边动作
@FunctionalInterface
public interface EdgeAction {
    String apply(OverAllState state) throws Exception;
}

// 异步边动作
@FunctionalInterface
public interface AsyncEdgeAction extends Function<OverAllState, CompletableFuture<String>> {
    CompletableFuture<String> apply(OverAllState state);
    
    // 同步转异步工厂方法
    static AsyncEdgeAction edge_async(EdgeAction syncAction) {
        return state -> {
            CompletableFuture<String> result = new CompletableFuture<>();
            try {
                result.complete(syncAction.apply(state));
            } catch (Exception e) {
                result.completeExceptionally(e);
            }
            return result;
        };
    }
}
```

## 边的管理与查询

### Edges容器类

**StateGraph内部使用Edges类管理所有边的集合**：

```java
public static class Edges {
    public final List<Edge> elements;
    
    public Edges(Collection<Edge> elements) {
        this.elements = new LinkedList<>(elements);
    }
    
    public Edges() {
        this.elements = new LinkedList<>();
    }
    
    // 根据源节点ID查找边
    public Optional<Edge> edgeBySourceId(String sourceId) {
        return elements.stream()
            .filter(e -> Objects.equals(e.sourceId(), sourceId))
            .findFirst();
    }
    
    // 根据目标节点ID查找边
    public List<Edge> edgesByTargetId(String targetId) {
        return elements.stream()
            .filter(e -> e.anyMatchByTargetId(targetId))
            .toList();
    }
}
```

### 边查询方法

```java
public class Edge {
    // 检查是否匹配指定目标ID
    public boolean anyMatchByTargetId(String targetId) {
        return targets().stream().anyMatch(v -> 
            (v.id() != null) ? Objects.equals(v.id(), targetId) 
                             : v.value().mappings().containsValue(targetId)
        );
    }
    
    // 获取所有目标
    public List<EdgeValue> targets() {
        return targets;
    }
}
```
