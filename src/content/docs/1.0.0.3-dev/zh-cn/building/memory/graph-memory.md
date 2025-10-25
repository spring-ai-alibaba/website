---
title: "Graph Memory (Store & StateGraph)"
description: "使用 Store 系统为 AI Agent 提供强大的长期记忆，并与 StateGraph 无缝集成。"
---

在 Spring AI Alibaba (SAA) 中，**Graph Memory** 是一套专为构建复杂、有状态智能体而设计的先进记忆解决方案。它主要由两部分组成：

1.  **`Store` 系统**：一个功能强大的**长期记忆**模块，专为 AI Agent 设计，提供跨会话、可持久化、可搜索的记忆存储能力。它可以**独立使用**，也可以与 StateGraph 集成。
2.  **`OverAllState`**：StateGraph 框架内的**短期、运行时记忆**核心。它负责在图的执行过程中传递状态。

本文档将重点介绍 **`Store` 长期记忆系统**，并简要说明其如何与 `StateGraph` 的运行时记忆无缝集成。关于 `StateGraph` 自身的详细信息，请参考其[专门的文档](../stategraph/basics.md)。

## `Store`：AI Agent 的长期记忆系统

`Store` 是一个为 AI Agent 设计的、生产就绪的长期记忆解决方案。它解决了在多次交互或长时间运行后，如何持久化、管理和检索智能体记忆的核心问题。

与简单的键值存储不同，`Store` 提供了构建企业级 AI 应用所需的高级功能。

### `Store` 核心特性

- **跨会话持久化**：智能体的记忆可以在应用重启或多次会话后依然保留。
- **层次化命名空间**：通过类似文件路径的命名空间（如 `["users", "user123", "preferences"]`）来组织复杂的记忆结构，实现多租户和多智能体的数据隔离。
- **多种存储后端**：
    - **`MemoryStore`**：用于快速原型和测试。
    - **`DatabaseStore`**：基于 JDBC，提供 ACID 保证，适用于生产环境。
    - **`RedisStore`**：适用于高并发场景的分布式缓存。
    - **`MongoStore`**：适用于存储复杂的、非结构化的记忆数据。
    - **`FileSystemStore`**：简单的文件持久化方案。
- **强大的搜索与过滤**：支持按命名空间、关键词、自定义元数据进行复杂查询，并支持分页和排序。
- **结构化数据存储**：支持直接存储和检索复杂的 `Map` 对象，无需手动序列化。

### 独立使用与配置

`Store` 可以完全脱离 `StateGraph`，在任何 Spring Boot 应用中作为独立的记忆组件使用。

#### 1. 添加依赖
首先，确保您已添加 `spring-ai-alibaba-graph-core` 依赖。

#### 2. 配置 `Store` Bean
根据您的需求，在 Spring 配置中创建一个 `Store` Bean。

**示例：使用 `DatabaseStore`**
```java
@Configuration
public class MemoryConfig {

    @Bean
    public Store databaseStore(DataSource dataSource) {
        // 指定数据源和一个表名
        return new DatabaseStore(dataSource, "ai_agent_memory");
    }
}
```
*注意：`DatabaseStore` 会在启动时自动检查并创建指定的表。*

#### 3. 在业务逻辑中使用 `Store`
现在，您可以将 `Store` 注入到任何服务中来管理记忆。

**场景：管理用户画像和偏好**
```java
@Service
public class UserProfileService {

    private final Store userMemoryStore;

    @Autowired
    public UserProfileService(Store userMemoryStore) {
        this.userMemoryStore = userMemoryStore;
    }

    // 更新用户偏好
    public void updateUserPreferences(String userId, Map<String, Object> preferences) {
        StoreItem preferencesItem = StoreItem.of(
            List.of("users", userId, "profiles"), // 命名空间
            "preferences",                         // 键
            preferences                            // 值 (Map对象)
        );
        userMemoryStore.putItem(preferencesItem);
    }

    // 获取用户偏好
    public Optional<Map<String, Object>> getUserPreferences(String userId) {
        return userMemoryStore.getItem(
            List.of("users", userId, "profiles"), 
            "preferences"
        ).map(StoreItem::getValue);
    }
}
```

### 高级业务场景示例

#### 场景1：跨会话的长任务恢复

假设一个智能体需要执行一个耗时很长的分析任务。我们可以使用 `Store` 来保存任务的中间步骤，即使用户关闭了会话，下次回来时也能从中断点继续。

```java
@Service
public class LongTaskService {

    private final Store taskStore;

    public void executeTask(String taskId, String userId) {
        // 1. 尝试从 Store 中恢复任务状态
        Optional<Map<String, Object>> lastState = taskStore.getItem(
            List.of("long_tasks", userId), 
            taskId
        ).map(StoreItem::getValue);

        int currentStep = (int) lastState.map(s -> s.get("step")).orElse(0);

        // 2. 从上次的步骤继续执行
        for (int step = currentStep; step < 10; step++) {
            // ... 执行任务步骤 ...

            // 3. 将当前状态保存到 Store
            Map<String, Object> currentState = Map.of(
                "step", step + 1,
                "status", "in_progress",
                "updatedAt", System.currentTimeMillis()
            );
            taskStore.putItem(StoreItem.of(List.of("long_tasks", userId), taskId, currentState));
        }
        
        // 4. 任务完成后更新最终状态
        taskStore.putItem(StoreItem.of(List.of("long_tasks", userId), taskId, Map.of("status", "completed")));
    }
}
```

#### 场景2：多智能体协作与记忆共享

在一个多智能体团队中，`Store` 可以作为共享的“白板”，让智能体协同工作。

```java
@Service
public class MultiAgentCollaborationService {

    private final Store sharedMemory;

    // 分析师 Agent 保存其发现
    public void analystAgentSaveChanges(String teamId, Map<String, Object> findings) {
        String findingId = "finding-" + UUID.randomUUID();
        StoreItem findingItem = StoreItem.of(
            List.of("teams", teamId, "shared_findings"),
            findingId,
            findings
        );
        sharedMemory.putItem(findingItem);
    }

    // 报告生成 Agent 读取所有发现来撰写报告
    public String reportWriterAgentGenerateReport(String teamId) {
        StoreSearchRequest searchRequest = StoreSearchRequest.builder()
            .namespace("teams", teamId, "shared_findings")
            .sortFields(List.of("createdAt"))
            .limit(100)
            .build();
            
        List<StoreItem> findings = sharedMemory.searchItems(searchRequest).getItems();
        
        // ... 基于所有发现生成报告 ...
        return "Generated report content...";
    }
}
```

## 与 `StateGraph` 的集成

当在 `StateGraph` 环境中使用时，`Store` 作为 `OverAllState` 的一个可选组件，为其提供了长期记忆的能力。

```java
// 1. 创建 StateGraph 时注入 Store
Store myStore = new DatabaseStore(dataSource, "graph_memory");
StateGraph stateGraph = StateGraph.builder(myStore).build();

// 2. 在 NodeAction 中通过 OverAllState 访问 Store
@Component
public class MyNode implements NodeAction {
    
    @Override
    public Map<String, Object> apply(OverAllState state) {
        Store store = state.getStore(); // 获取注入的 Store 实例
        
        // 使用 Store 读取或写入长期记忆
        String userId = state.value("user_id").orElseThrow();
        store.putItem(StoreItem.of(
            List.of("user_sessions", userId),
            "last_node",
            Map.of("nodeName", "MyNode")
        ));
        
        return Map.of();
    }
}
```

在这种模式下，`OverAllState` 负责处理图执行过程中的**运行时状态**，而 `Store` 则负责处理需要**跨会话持久化**的长期记忆。

## Store 存储方案选择指南

### 存储后端对比

| 存储类型 | 适用场景 | 性能 | 持久化 | 扩展性 | 开发复杂度 |
|---------|----------|------|--------|--------|-----------|
| **MemoryStore** | 开发测试、临时缓存 | 极高 | 无 | 低 | 极低 |
| **DatabaseStore** | 企业级应用、ACID要求 | 中等 | 完全 | 中等 | 低 |
| **RedisStore** | 高并发、分布式缓存 | 高 | 可选 | 高 | 中等 |
| **MongoStore** | 复杂数据、文档存储 | 高 | 完全 | 高 | 中等 |
| **FileSystemStore** | 简单持久化、小规模 | 中等 | 完全 | 低 | 低 |

### 选择建议

```java
// 1. 开发和测试环境
@Profile("dev")
@Bean
public Store devStore() {
    return new MemoryStore(); // 快速启动，无需外部依赖
}

// 2. 生产环境 - 关键业务数据
@Profile("prod")
@Bean
public Store prodStore(DataSource dataSource) {
    return new DatabaseStore(dataSource, "ai_memory"); // ACID保证，备份恢复
}

// 3. 高并发场景
@Bean
public Store highConcurrencyStore(RedisTemplate<String, Object> redisTemplate) {
    return new RedisStore(redisTemplate, "ai:memory:"); // 高性能，集群支持
}

// 4. 复杂数据结构
@Bean
public Store complexDataStore(MongoTemplate mongoTemplate) {
    return new MongoStore(mongoTemplate, "ai_memory"); // 灵活schema，查询强大
}
```

## 下一步

- 学习 [StateGraph 状态管理](../stategraph/state-management) 的高级特性
- 查看 SAA 提供的 [预定义节点](../stategraph/predefined-nodes)
- 对比 [ChatClient Memory](./chatclient-memory) 的简单使用方式
