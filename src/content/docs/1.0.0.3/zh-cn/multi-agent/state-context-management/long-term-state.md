---
title: 长期状态管理
description: 持久化和长期记忆管理
---

# 长期状态管理

长期状态管理是多智能体系统中处理跨会话、跨时间的持久状态的核心机制。它包括持久化存储、长期记忆管理和跨会话上下文维护，确保智能体能够在长时间运行中保持连续性和学习能力。

## 长期记忆 Store

长期记忆是指跨任务、跨会话的持久化记忆存储，它允许系统在不同对话或会话之间保留和检索结构化信息。Spring AI Alibaba 基于 Store 接口提供了强大的长期记忆管理能力。

Store 接口专门用于管理长期记忆数据，如用户偏好、历史交互、学习到的知识等。与 CheckpointSaver 专注于图状态的短期持久化不同，Store 提供跨会话、跨任务的持久化记忆存储能力。
### Store 核心概念

Store 提供了跨会话、跨任务的持久化记忆存储能力，主要特性包括：

- **层次化命名空间**：使用 `["users", "user123", "preferences"]` 这样的路径组织数据
- **结构化存储**：存储 Map 格式的复杂数据
- **搜索和查询**：支持按命名空间、内容搜索数据
- **多种实现**：内存、文件系统、Redis、MongoDB 等后端

### 选择合适的 Store 实现

根据你的应用场景选择合适的 Store 实现：

```java
// 开发和测试环境
Store store = new MemoryStore();

// 单机部署，需要持久化
Store store = new FileSystemStore("/app/data/store");

// 分布式环境，高性能需求
Store store = new RedisStore("myapp:");

// 大规模数据，复杂查询
Store store = new MongoStore("user_memories");
```

### 在图中配置和使用 Store

```java
@Configuration
public class GraphWithStoreConfig {

    @Bean
    public Store memoryStore() {
        // 选择合适的 Store 实现
        return new MemoryStore();
        // return new FileSystemStore("/app/data/store");
        // return new RedisStore("app:");
        // return new MongoStore("app_store");
    }

    @Bean
    public CompiledGraph createGraphWithStore(Store store) {
        // 创建 StateGraph 实例
        StateGraph workflow = new StateGraph()
                .addNode("agent", new AgentNode())
                .addNode("memory_manager", new MemoryManagerNode())
                .addEdge(START, "agent")
                .addEdge("agent", "memory_manager")
                .addEdge("memory_manager", END);

        // 编译时配置 Store
        CompileConfig compileConfig = CompileConfig.builder()
                .saverConfig(SaverConfig.builder()
                    .type(SaverConstant.MEMORY)
                    .register(SaverConstant.MEMORY, new MemorySaver())
                    .build())
                .store(store)  // 关键：在编译时配置 Store
                .build();

        return workflow.compile(compileConfig);
    }

    /**
     * 智能体节点 - 演示如何在节点中访问和使用 Store
     *
     * 节点实现 NodeAction 接口，接收 OverAllState 参数并返回状态更新。
     * Store 实例通过 OverAllState 直接获取，确保访问的线程安全性。
     */
    public class AgentNode implements NodeAction {

        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            // 直接从 OverAllState 获取 Store 实例
            // Store 在图编译时配置，在节点执行时可通过状态对象访问
            Store store = state.getStore();
            String userId = state.value("user_id", "");

            if (store != null && !userId.isEmpty()) {
                // 读取用户的语言偏好
                // 使用层次化命名空间组织数据：["users", userId, "preferences"]
                Optional<StoreItem> preference = store.getItem(
                    List.of("users", userId, "preferences"),
                    "language"
                );

                // 基于用户偏好生成个性化响应
                String preferredLanguage = preference
                    .map(item -> (String) item.getValue().get("value"))
                    .orElse("zh-CN");

                // 记录用户交互历史
                StoreItem interaction = StoreItem.of(
                    List.of("users", userId, "interactions"),
                    "session_" + System.currentTimeMillis(),
                    Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "input", state.value("input", ""),
                        "language", preferredLanguage
                    )
                );
                store.putItem(interaction);

                String response = generateResponse(state.data(), preferredLanguage);
                return Map.of("messages", response, "language", preferredLanguage);
            }

            return Map.of("messages", "Hello!", "language", "zh-CN");
        }

        private String generateResponse(Map<String, Object> stateData, String language) {
            // 实现响应生成逻辑
            return "Generated response in " + language;
        }
    }

    /**
     * 记忆管理节点 - 演示如何保存长期记忆
     *
     * 这个节点专门负责处理长期记忆的保存和更新，体现了关注点分离的设计原则。
     * 通过独立的记忆管理节点，可以统一处理所有的长期记忆操作。
     */
    public class MemoryManagerNode implements NodeAction {

        @Override
        public Map<String, Object> apply(OverAllState state) throws Exception {
            // 直接从 OverAllState 获取 Store 实例
            Store store = state.getStore();

            if (store == null) {
                return Map.of(); // Store 未配置，跳过记忆管理
            }

            String userId = state.value("user_id", "");
            String sessionId = state.value("session_id", "session_" + System.currentTimeMillis());

            // 提取并保存会话摘要
            // 会话摘要是重要的长期记忆，用于后续的上下文理解
            Map<String, Object> summary = extractSessionSummary(state.data());
            StoreItem summaryItem = StoreItem.of(
                List.of("users", userId, "sessions", sessionId),
                "summary",
                summary
            );
            store.putItem(summaryItem);

            // 基于当前交互更新用户偏好
            // 这是一个学习过程，系统会根据用户行为调整偏好设置
            updateUserPreferences(store, userId, state.data());

            // 保存关键实体和概念
            extractAndSaveEntities(store, userId, state.data());

            return Map.of("memory_updated", true); // 标记记忆已更新
        }

        private Map<String, Object> extractSessionSummary(Map<String, Object> stateData) {
            // 实现会话摘要提取逻辑
            String messages = (String) stateData.getOrDefault("messages", "");
            return Map.of(
                "summary", "Session summary: " + messages.substring(0, Math.min(100, messages.length())),
                "timestamp", System.currentTimeMillis(),
                "messageCount", 1
            );
        }

        private void updateUserPreferences(Store store, String userId, Map<String, Object> stateData) {
            // 基于用户行为更新偏好
            String language = (String) stateData.get("language");
            if (language != null) {
                StoreItem langPref = StoreItem.of(
                    List.of("users", userId, "preferences"),
                    "language",
                    Map.of("value", language, "updatedAt", System.currentTimeMillis())
                );
                store.putItem(langPref);
            }
        }

        private void extractAndSaveEntities(Store store, String userId, Map<String, Object> stateData) {
            // 提取并保存重要实体和概念
            // 这里可以集成 NER（命名实体识别）或其他 AI 服务
            String input = (String) stateData.getOrDefault("input", "");
            if (!input.isEmpty()) {
                StoreItem entityItem = StoreItem.of(
                    List.of("users", userId, "entities"),
                    "entity_" + System.currentTimeMillis(),
                    Map.of(
                        "text", input,
                        "extractedAt", System.currentTimeMillis(),
                        "type", "user_input"
                    )
                );
                store.putItem(entityItem);
            }
        }
    }
}
```

### 常用操作示例

#### 存储和检索用户数据

```java
// 存储用户偏好
StoreItem preferences = StoreItem.of(
    List.of("users", "user123", "preferences"),
    "ui_settings",
    Map.of("theme", "dark", "language", "zh-CN")
);
store.putItem(preferences);

// 检索用户偏好
Optional<StoreItem> item = store.getItem(
    List.of("users", "user123", "preferences"),
    "ui_settings"
);
```

#### 搜索历史交互

```java
// 搜索用户最近的交互记录
StoreSearchRequest request = StoreSearchRequest.builder()
    .namespace("users", "user123", "interactions")
    .sortBy("createdAt")
    .ascending(false)  // 最新的在前
    .limit(20)
    .build();

StoreSearchResult result = store.searchItems(request);
List<StoreItem> recentInteractions = result.getItems();
```

#### 管理会话记忆

```java
// 保存会话摘要
StoreItem sessionSummary = StoreItem.of(
    List.of("users", userId, "sessions", sessionId),
    "summary",
    Map.of(
        "summary", "用户询问了关于AI的问题",
        "topics", List.of("AI", "技术"),
        "timestamp", System.currentTimeMillis()
    )
);
store.putItem(sessionSummary);

// 清理过期会话
long oneWeekAgo = System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000;
StoreSearchRequest expiredSessions = StoreSearchRequest.builder()
    .namespace("users", userId, "sessions")
    .filter(Map.of("timestamp", Map.of("$lt", oneWeekAgo)))
    .build();

for (StoreItem item : store.searchItems(expiredSessions).getItems()) {
    store.deleteItem(item.getNamespace(), item.getKey());
}
```

## 下一步

- [持久执行](./durable-execution.md) - 了解持久执行机制
- [上下文工程](./context-engineering.md) - 学习上下文管理技巧
- [基础概念](./fundamentals.md) - 回顾状态管理基础
