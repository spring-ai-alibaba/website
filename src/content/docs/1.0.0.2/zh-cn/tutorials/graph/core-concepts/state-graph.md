---
title: StateGraph - 状态图
keywords: [Spring AI,StateGraph,状态图,工作流设计]
description: "深入理解 StateGraph 的设计理念、生命周期和使用方法，掌握工作流构建。"
---

## 什么是 StateGraph

**StateGraph是工作流的声明式定义组件**，负责定义工作流的完整结构和执行逻辑。StateGraph采用声明式API设计，开发者通过简洁的代码描述复杂的业务流程，而无需关心底层的执行细节。

**核心设计理念**：StateGraph将复杂的工作流抽象为节点和边的组合，每个节点代表一个具体的操作，边定义了操作之间的流转关系。这种抽象使开发者能够专注于业务逻辑的设计，而将执行机制的实现交由框架处理。

## StateGraph生命周期

StateGraph的生命周期遵循"设计-验证-编译-执行"的标准流程，通过明确的阶段划分，确保工作流从设计到执行的每个环节都可控和可验证。

### 核心生命周期阶段

**StateGraph经历四个标准的生命周期阶段**：

1. **构建阶段（Building）** - 通过构造函数创建StateGraph实例，然后添加节点和边，逐步构建完整的工作流结构
2. **验证阶段（Validation）** - 调用`compile()`时自动执行图结构验证，确保完整性和正确性
3. **编译阶段（Compilation）** - 生成优化的CompiledGraph执行实例，准备运行时环境
4. **执行阶段（Execution）** - 通过CompiledGraph运行工作流逻辑，处理业务数据

![生命周期](img\user\ai\tutorials\graph\core-concepts\state-graph\life-cycle.svg)

## StateGraph核心架构设计

**StateGraph采用组合模式的架构设计**，通过核心数据结构和特殊节点机制的组合，为复杂工作流提供基础支撑。

### 核心数据结构

```java
public class StateGraph {
    // 核心容器：节点和边的集中管理
    final Nodes nodes = new Nodes();                          // 节点集合管理器
    final Edges edges = new Edges();                          // 边集合管理器
    
    // 系统级特殊节点：框架内置的控制节点
    public static final String START = "__START__";           // 执行起点标识
    public static final String END = "__END__";               // 执行终点标识
    public static final String ERROR = "__ERROR__";           // 错误处理标识
    public static final String NODE_BEFORE = "__NODE_BEFORE__";  // 节点前置钩子
    public static final String NODE_AFTER = "__NODE_AFTER__";    // 节点后置钩子
    
    // 核心配置组件
    private KeyStrategyFactory keyStrategyFactory;            // 键策略工厂
    private OverAllStateFactory overAllStateFactory;          // 状态工厂（已废弃）
    private final PlainTextStateSerializer stateSerializer;  // 状态序列化器
    private String name;                                       // 图名称
}
```

### 构造函数设计

**StateGraph提供多种构造函数以适应不同的使用场景**：

```java
// 完整参数构造函数
public StateGraph(String name, KeyStrategyFactory keyStrategyFactory, PlainTextStateSerializer stateSerializer)

// 带名称的基础构造函数
public StateGraph(String name, KeyStrategyFactory keyStrategyFactory)

// 仅策略工厂的构造函数
public StateGraph(KeyStrategyFactory keyStrategyFactory)

// 默认构造函数
public StateGraph()
```

### 特殊节点机制

**StateGraph通过五个预定义特殊节点实现流程控制**：

- **START节点**：工作流的统一入口点，确保执行流程有明确的起始位置。每个StateGraph都必须定义从START开始的边
- **END节点**：工作流的标准终止点，标识正常执行路径的结束。支持多个节点指向END，为复杂分支流程提供统一的汇聚点
- **ERROR节点**：专门用于异常情况的处理和错误路径的定义，为工作流的容错机制提供支持
- **NODE_BEFORE节点**：节点前置钩子，用于在节点执行前进行预处理操作
- **NODE_AFTER节点**：节点后置钩子，用于在节点执行后进行后处理操作

## 节点管理机制

**StateGraph的节点管理系统通过统一的接口支持多种类型的节点**，同时保证类型安全和执行效率。

### 节点管理操作流程

**节点管理遵循严格的验证和注册流程**，确保每个添加的节点都能正确集成到工作流中：

1. **节点标识符验证** - 检查节点ID的有效性和唯一性
2. **节点类型匹配** - 验证节点实现与接口的兼容性
3. **重复性检查** - 确保不存在重复的节点定义
4. **集合注册** - 将验证通过的节点加入管理集合

![节点管理机制](img\user\ai\tutorials\graph\core-concepts\state-graph\node.svg)

### 节点类型支持

**StateGraph通过类型化的API设计支持以下核心节点类型**：

#### 1. 异步节点（AsyncNodeAction）

```java
// 添加异步节点
public StateGraph addNode(String id, AsyncNodeAction action) throws GraphStateException {
    return addNode(id, AsyncNodeActionWithConfig.of(action));
}

// 使用示例
stateGraph.addNode("process_data", state -> {
    // 处理业务逻辑
    Map<String, Object> result = new HashMap<>();
    result.put("processed", true);
    return CompletableFuture.completedFuture(result);
});
```

#### 2. 配置感知节点（AsyncNodeActionWithConfig）

```java
// 添加带配置的节点
public StateGraph addNode(String id, AsyncNodeActionWithConfig actionWithConfig) throws GraphStateException {
    Node node = new Node(id, (config) -> actionWithConfig);
    return addNode(id, node);
}

// 使用示例
stateGraph.addNode("llm_node", (state, config) -> {
    // 使用配置进行处理
    return llmService.process(state, config);
});
```

#### 3. 命令节点（CommandNode）

```java
// 添加命令节点 - 支持内置映射的高级节点类型
public StateGraph addNode(String id, AsyncCommandAction action, Map<String, String> mappings) 
        throws GraphStateException {
    return addNode(id, new CommandNode(id, action, mappings));
}

// 使用示例
Map<String, String> routingMappings = Map.of(
    "positive", "positive_handler",
    "negative", "negative_handler"
);
stateGraph.addNode("router", routerAction, routingMappings);
```

#### 4. 子图节点（SubGraph）

```java
// 添加CompiledGraph子图节点
public StateGraph addNode(String id, CompiledGraph subGraph) throws GraphStateException {
    var node = new SubCompiledGraphNode(id, subGraph);
    return addNode(id, node);
}

// 添加StateGraph子图节点（编译时会自动编译子图）
public StateGraph addNode(String id, StateGraph subGraph) throws GraphStateException {
    subGraph.validateGraph(); // 先验证子图
    var node = new SubStateGraphNode(id, subGraph);
    return addNode(id, node);
}

// 使用示例
StateGraph subWorkflow = createSubWorkflow();
stateGraph.addNode("sub_process", subWorkflow);
```

## 边管理系统

**边管理是StateGraph实现路由控制的核心机制**，通过静态边和条件边的组合，为工作流提供从简单的线性流程到复杂的动态分支的完整支持。

![边管理机制](img\user\ai\tutorials\graph\core-concepts\state-graph\edge.svg)

### 边管理处理方式

**边管理系统采用分类处理方式**，针对静态边和条件边的不同特点，提供专门的处理逻辑和验证机制。

### 静态边管理

**静态边是工作流中最基础的连接方式**，提供确定性的节点转换关系：

```java
// 添加静态边
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

// 使用示例
stateGraph.addEdge("source_node", "target_node");
stateGraph.addEdge(START, "first_node");
stateGraph.addEdge("last_node", END);
```

### 条件边管理

**条件边用于实现基于运行时状态的动态路由决策**：

```java
// 添加条件边
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

// 使用示例
stateGraph.addConditionalEdges(
    "classifier_node",                        // 源节点
    AsyncCommandAction.of(decisionMaker),     // 条件判断器
    Map.of(                                   // 路由映射
        "positive", "positive_handler",
        "negative", "negative_handler",
        "neutral", "neutral_handler"
    )
);
```

## 图验证机制

**StateGraph的验证机制确保工作流结构的正确性和完整性**，通过多层次的验证检查，在编译阶段发现和解决潜在问题。

![图验证机制](img\user\ai\tutorials\graph\core-concepts\state-graph\validate.svg)

### 验证执行时机

**验证在调用compile()方法时自动执行**，确保只有结构正确的图才能进入执行阶段：

```java
public CompiledGraph compile(CompileConfig config) throws GraphStateException {
    Objects.requireNonNull(config, "config cannot be null");
    
    validateGraph(); // 自动执行验证
    
    return new CompiledGraph(this, config);
}
```

### 核心验证检查

**StateGraph的validateGraph()方法执行以下关键验证**：

#### 1. 入口点验证
检查是否存在从START开始的边：
```java
var edgeStart = edges.edgeBySourceId(START).orElseThrow(Errors.missingEntryPoint::exception);
```

#### 2. 边和节点一致性验证
确保所有边引用的节点都存在：
```java
for (Edge edge : edges.elements) {
    edge.validate(nodes);  // 验证边的源节点和目标节点是否存在
}
```

#### 3. 命令节点映射验证
验证CommandNode的映射目标是否有效：
```java
for (CommandNode commandNode : commandNodeList) {
    for (String key : commandNode.getMappings().keySet()) {
        if (!nodes.anyMatchById(key)) {
            throw Errors.missingNodeInEdgeMapping.exception(commandNode.id(), key);
        }
    }
}
```

#### 4. 边级别验证
每个边都会执行自身的验证逻辑：
```java
edgeStart.validate(nodes);    // 验证起始边
validateNode(nodes);          // 验证节点映射
```

### 常见验证错误

**验证机制会检测并报告以下常见错误**：

1. **缺少入口点**：未定义从START开始的边
2. **节点引用错误**：边指向不存在的节点
3. **重复节点定义**：同一ID被多次使用
4. **无效边标识符**：使用END作为源节点
5. **空映射错误**：条件边的映射为空
6. **命令节点映射错误**：CommandNode映射到不存在的节点



