---
title: 上下文工程
description: 上下文管理的高级技巧和最佳实践
---

# 上下文工程

**上下文工程**是构建动态系统的实践，这些系统以正确的格式提供正确的信息和工具，以便 AI 应用程序能够完成任务。有效的上下文工程是构建智能多智能体系统的关键技能。

## 上下文分类体系

上下文可以沿着两个关键维度进行特征化：

### 按可变性分类

| 类型 | 特征 | 示例 | 管理方式 |
|------|------|------|----------|
| **静态上下文** | 执行期间不变 | 用户元数据、工具定义、配置信息 | `RunnableConfig.metadata` |
| **动态上下文** | 执行期间可变 | 对话历史、中间结果、状态变化 | `OverAllState` 对象 |

### 按生命周期分类

| 类型 | 生命周期 | 示例 | 存储方式 |
|------|----------|------|----------|
| **运行时上下文** | 单次执行 | 当前对话、临时计算结果 | 内存状态 |
| **会话级上下文** | 单个会话 | 会话历史、用户偏好 | 检查点保存器 |
| **跨会话上下文** | 多个会话 | 用户档案、学习记忆 | 持久存储 |

> **注意**: 运行时上下文指的是本地上下文：您的代码运行所需的数据和依赖项。它不是指 LLM 上下文（传递到 LLM 提示中的数据）或"上下文窗口"（可以传递给 LLM 的最大令牌数）。运行时上下文可以用来优化 LLM 上下文。

## 静态运行时上下文

静态运行时上下文表示不可变数据，在运行开始时通过 `RunnableConfig` 的 `metadata` 传递给应用程序。

### 上下文配置

```java
@Service
public class ContextService {

    public RunnableConfig createUserContext(String userId, String userName, Map<String, Object> preferences) {
        return RunnableConfig.builder()
            .threadId(generateThreadId(userId))
            .addMetadata("userId", userId)
            .addMetadata("userName", userName)
            .addMetadata("userRole", getUserRole(userId))
            .addMetadata("organizationId", getOrganizationId(userId))
            .addMetadata("preferences", preferences)
            .addMetadata("timestamp", Instant.now().toString())
            .build();
    }

    public RunnableConfig createSessionContext(String sessionId, String userId) {
        return RunnableConfig.builder()
            .threadId(sessionId)
            .addMetadata("sessionId", sessionId)
            .addMetadata("userId", userId)
            .addMetadata("sessionStartTime", Instant.now().toString())
            .build();
    }

    private String generateThreadId(String userId) {
        return userId + ":" + System.currentTimeMillis();
    }

    private String getUserRole(String userId) {
        // 获取用户角色的逻辑
        return "user"; // 占位符实现
    }

    private String getOrganizationId(String userId) {
        // 获取组织ID的逻辑
        return "org_default"; // 占位符实现
    }
}
    private List<String> availableTools;
    private Map<String, Object> systemConfig;

    public ContextSchema(String userName, String userId) {
        this.userName = userName;
        this.userId = userId;
        this.userPreferences = new HashMap<>();
        this.availableTools = new ArrayList<>();
        this.systemConfig = new HashMap<>();
    }

    // getters and setters
    public String getUserName() { return userName; }
    public String getUserId() { return userId; }
    public String getOrganizationId() { return organizationId; }
    public Map<String, Object> getUserPreferences() { return userPreferences; }
    public List<String> getAvailableTools() { return availableTools; }
    public Map<String, Object> getSystemConfig() { return systemConfig; }
    
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }
}
```

### 上下文注入

```java
@Component
public class ContextInjectionService {
    
    public RunnableConfig createContextualConfig(String threadId, String userId) {
        // 构建用户上下文
        ContextSchema context = buildUserContext(userId);
        
        return RunnableConfig.builder()
            .threadId(threadId)
            .addMetadata("userContext", context)
            .addMetadata("userName", context.getUserName())
            .addMetadata("userId", context.getUserId())
            .addMetadata("organizationId", context.getOrganizationId())
            .addMetadata("userPreferences", context.getUserPreferences())
            .addMetadata("availableTools", context.getAvailableTools())
            .addMetadata("systemConfig", context.getSystemConfig())
            .build();
    }
    
    private ContextSchema buildUserContext(String userId) {
        // 从数据库或缓存获取用户信息
        User user = userService.getUser(userId);
        Organization org = organizationService.getOrganization(user.getOrganizationId());
        
        ContextSchema context = new ContextSchema(user.getName(), userId);
        context.setOrganizationId(user.getOrganizationId());
        
        // 设置用户偏好
        context.getUserPreferences().put("language", user.getPreferredLanguage());
        context.getUserPreferences().put("timezone", user.getTimezone());
        context.getUserPreferences().put("theme", user.getTheme());
        context.getUserPreferences().put("notification_enabled", user.isNotificationEnabled());
        
        // 设置可用工具
        context.getAvailableTools().addAll(getAvailableTools(user, org));
        
        // 设置系统配置
        context.getSystemConfig().put("max_tokens", org.getMaxTokens());
        context.getSystemConfig().put("model_version", org.getPreferredModel());
        
        return context;
    }
    
    private List<String> getAvailableTools(User user, Organization org) {
        List<String> tools = new ArrayList<>();
        
        // 基于用户角色和组织权限确定可用工具
        if (user.hasRole("ADMIN")) {
            tools.addAll(List.of("user_management", "system_config", "analytics"));
        }
        
        if (org.hasFeature("ADVANCED_SEARCH")) {
            tools.add("advanced_search");
        }
        
        if (org.hasFeature("EXTERNAL_API")) {
            tools.add("external_api_access");
        }
        
        return tools;
    }
}
```

### 在智能体中使用静态上下文

```java
@Component
public class ContextAwareAgent {

    @Autowired
    private ChatClient chatClient;

    public NodeActionWithConfig createContextAwareChatNode() {
        return (state, config) -> {
            // 从配置中获取上下文信息
            String userName = (String) config.metadata("userName").orElse("用户");
            String language = getLanguageFromConfig(config);
            List<String> availableTools = getAvailableToolsFromConfig(config);

            // 构建上下文感知的系统提示
            String systemMessage = buildContextualSystemMessage(userName, language, availableTools);

            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemMessage));

            // 从状态中获取消息历史
            List<Message> stateMessages = state.value("messages", List.class).orElse(List.of());
            messages.addAll(stateMessages);

            ChatResponse response = chatClient.prompt()
                .messages(messages)
                .call();

            return Map.of("messages", List.of(response.getResult().getOutput()));
        };
    }
    
    private String getLanguageFromConfig(RunnableConfig config) {
        Map<String, Object> userPreferences = (Map<String, Object>) config.metadata("userPreferences").orElse(Map.of());
        return (String) userPreferences.getOrDefault("language", "zh-CN");
    }
    
    private List<String> getAvailableToolsFromConfig(RunnableConfig config) {
        return (List<String>) config.metadata("availableTools").orElse(List.of());
    }
    
    private String buildContextualSystemMessage(String userName, String language, List<String> availableTools) {
        StringBuilder systemMessage = new StringBuilder();
        
        if ("zh-CN".equals(language)) {
            systemMessage.append("您是一个有用的助手。请称呼用户为 ").append(userName).append("。");
            if (!availableTools.isEmpty()) {
                systemMessage.append(" 您可以使用以下工具：").append(String.join("、", availableTools)).append("。");
            }
        } else {
            systemMessage.append("You are a helpful assistant. Please address the user as ").append(userName).append(".");
            if (!availableTools.isEmpty()) {
                systemMessage.append(" You have access to the following tools: ").append(String.join(", ", availableTools)).append(".");
            }
        }
        
        return systemMessage.toString();
    }
}
```

## 动态运行时上下文

动态运行时上下文表示可以在单次运行期间演变的可变数据，通过 `OverAllState` 对象进行管理。

### 动态上下文状态工厂

```java
public class DynamicContextStateFactory {

    public static OverAllStateFactory createContextAwareStateFactory() {
        return () -> {
            OverAllState state = new OverAllState();
            
            // 注册各种上下文相关的状态键
            state.registerKeyAndStrategy("messages", new AppendStrategy());
            state.registerKeyAndStrategy("currentContext", new ReplaceStrategy());
            state.registerKeyAndStrategy("contextHistory", new AppendStrategy());
            state.registerKeyAndStrategy("userIntent", new ReplaceStrategy());
            state.registerKeyAndStrategy("sessionMetrics", new MergeStrategy());
            state.registerKeyAndStrategy("temporaryData", new ReplaceStrategy());
            
            // 初始化上下文
            state.update("currentContext", new HashMap<>());
            state.update("contextHistory", new ArrayList<>());
            state.update("sessionMetrics", Map.of(
                "startTime", Instant.now().toString(),
                "messageCount", 0,
                "toolUsageCount", 0
            ));
            
            return state;
        };
    }
}
```

### 上下文感知节点

```java
@Component
public class ContextAwareNodes {

    public NodeAction createContextAnalysisNode() {
        return (state) -> {
            // 分析当前上下文
            List<Message> messages = state.value("messages", List.class).orElse(List.of());
            Map<String, Object> currentContext = state.value("currentContext", Map.class).orElse(new HashMap<>());
            
            // 提取用户意图
            String userIntent = extractUserIntent(messages);
            
            // 更新上下文
            Map<String, Object> updatedContext = new HashMap<>(currentContext);
            updatedContext.put("lastIntent", userIntent);
            updatedContext.put("messageCount", messages.size());
            updatedContext.put("lastActivity", Instant.now().toString());
            
            // 记录上下文历史
            Map<String, Object> contextSnapshot = Map.of(
                "timestamp", Instant.now().toString(),
                "intent", userIntent,
                "messageCount", messages.size()
            );
            
            return Map.of(
                "userIntent", userIntent,
                "currentContext", updatedContext,
                "contextHistory", List.of(contextSnapshot)
            );
        };
    }
    
    public NodeAction createContextAdaptationNode() {
        return (state) -> {
            // 根据上下文调整行为
            String userIntent = state.value("userIntent", String.class).orElse("");
            Map<String, Object> currentContext = state.value("currentContext", Map.class).orElse(new HashMap<>());
            
            // 基于上下文调整响应策略
            String responseStrategy = determineResponseStrategy(userIntent, currentContext);
            
            // 更新会话指标
            Map<String, Object> sessionMetrics = state.value("sessionMetrics", Map.class).orElse(new HashMap<>());
            sessionMetrics.put("lastAdaptation", Instant.now().toString());
            sessionMetrics.put("responseStrategy", responseStrategy);
            
            return Map.of(
                "responseStrategy", responseStrategy,
                "sessionMetrics", sessionMetrics
            );
        };
    }
    
    private String extractUserIntent(List<Message> messages) {
        if (messages.isEmpty()) {
            return "unknown";
        }
        
        Message lastMessage = messages.get(messages.size() - 1);
        String content = lastMessage.getContent().toLowerCase();
        
        // 简单的意图识别逻辑
        if (content.contains("帮助") || content.contains("help")) {
            return "help_request";
        } else if (content.contains("查询") || content.contains("search")) {
            return "information_query";
        } else if (content.contains("创建") || content.contains("create")) {
            return "creation_request";
        } else {
            return "general_conversation";
        }
    }
    
    private String determineResponseStrategy(String userIntent, Map<String, Object> context) {
        switch (userIntent) {
            case "help_request":
                return "detailed_guidance";
            case "information_query":
                return "factual_response";
            case "creation_request":
                return "step_by_step";
            default:
                return "conversational";
        }
    }
}
```

## 跨会话上下文

跨会话上下文表示跨多个对话或会话的持久、可变数据，需要通过自定义存储实现进行管理。

### 跨会话上下文存储

```java
@Service
public class CrossSessionContextManager {

    @Autowired
    private LongTermMemoryStore memoryStore;

    @Autowired
    private ChatClient chatClient;

    // 保存用户会话上下文
    public void saveSessionContext(String userId, String sessionId, Map<String, Object> context) {
        String namespace = "session_contexts:" + userId;
        
        Map<String, Object> contextData = new HashMap<>(context);
        contextData.put("sessionId", sessionId);
        contextData.put("savedAt", Instant.now().toString());
        
        memoryStore.put(namespace, sessionId, contextData);
    }

    // 获取用户的历史会话上下文
    public List<Map<String, Object>> getUserSessionContexts(String userId, int limit) {
        String namespace = "session_contexts:" + userId;
        return memoryStore.search(namespace, null, null)
            .stream()
            .sorted((a, b) -> {
                String timeA = (String) a.getOrDefault("savedAt", "");
                String timeB = (String) b.getOrDefault("savedAt", "");
                return timeB.compareTo(timeA); // 降序排列
            })
            .limit(limit)
            .collect(Collectors.toList());
    }

    // 分析用户行为模式
    public Map<String, Object> analyzeUserBehaviorPattern(String userId) {
        List<Map<String, Object>> sessionContexts = getUserSessionContexts(userId, 50);
        
        if (sessionContexts.isEmpty()) {
            return Map.of("pattern", "new_user");
        }
        
        // 分析用户偏好
        Map<String, Integer> intentCounts = new HashMap<>();
        Map<String, Integer> toolUsageCounts = new HashMap<>();
        int totalSessions = sessionContexts.size();
        
        for (Map<String, Object> context : sessionContexts) {
            // 统计意图分布
            String intent = (String) context.getOrDefault("primaryIntent", "unknown");
            intentCounts.merge(intent, 1, Integer::sum);
            
            // 统计工具使用
            List<String> toolsUsed = (List<String>) context.getOrDefault("toolsUsed", List.of());
            for (String tool : toolsUsed) {
                toolUsageCounts.merge(tool, 1, Integer::sum);
            }
        }
        
        // 确定主要模式
        String primaryIntent = intentCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("unknown");
        
        String mostUsedTool = toolUsageCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("none");
        
        return Map.of(
            "totalSessions", totalSessions,
            "primaryIntent", primaryIntent,
            "mostUsedTool", mostUsedTool,
            "intentDistribution", intentCounts,
            "toolUsageDistribution", toolUsageCounts,
            "analyzedAt", Instant.now().toString()
        );
    }

    // 生成个性化建议
    public List<String> generatePersonalizedSuggestions(String userId) {
        Map<String, Object> behaviorPattern = analyzeUserBehaviorPattern(userId);
        String primaryIntent = (String) behaviorPattern.getOrDefault("primaryIntent", "unknown");
        
        List<String> suggestions = new ArrayList<>();
        
        switch (primaryIntent) {
            case "help_request":
                suggestions.add("您可以尝试使用帮助文档功能");
                suggestions.add("考虑查看常见问题解答");
                break;
            case "information_query":
                suggestions.add("您可能对高级搜索功能感兴趣");
                suggestions.add("尝试使用过滤器来精确查找信息");
                break;
            case "creation_request":
                suggestions.add("查看模板库可能会帮助您快速开始");
                suggestions.add("考虑使用批量创建功能");
                break;
            default:
                suggestions.add("探索更多功能来提高效率");
                suggestions.add("查看用户指南了解最佳实践");
        }
        
        return suggestions;
    }
}
```

## 上下文优化策略

### 上下文压缩

```java
@Component
public class ContextCompressionService {
    
    @Autowired
    private ChatClient chatClient;
    
    public Map<String, Object> compressContext(Map<String, Object> context, int maxSize) {
        String contextJson = JsonUtils.toJson(context);
        
        if (contextJson.length() <= maxSize) {
            return context;
        }
        
        // 使用 LLM 压缩上下文
        String prompt = String.format("""
            请压缩以下上下文信息，保留最重要的内容：
            
            原始上下文：%s
            
            目标大小：不超过 %d 字符
            请以 JSON 格式返回压缩后的上下文。
            """, contextJson, maxSize);
        
        try {
            String compressedJson = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            return JsonUtils.fromJson(compressedJson, Map.class);
        } catch (Exception e) {
            log.warn("上下文压缩失败，使用截断策略: {}", e.getMessage());
            return truncateContext(context, maxSize);
        }
    }
    
    private Map<String, Object> truncateContext(Map<String, Object> context, int maxSize) {
        Map<String, Object> truncated = new HashMap<>();
        int currentSize = 0;
        
        // 按优先级保留上下文项
        String[] priorityKeys = {"userId", "userName", "currentIntent", "lastActivity"};
        
        for (String key : priorityKeys) {
            if (context.containsKey(key)) {
                String value = JsonUtils.toJson(context.get(key));
                if (currentSize + value.length() <= maxSize) {
                    truncated.put(key, context.get(key));
                    currentSize += value.length();
                }
            }
        }
        
        return truncated;
    }
}
```

## 配置选项

```properties
# 上下文管理配置
spring.ai.alibaba.context.enabled=true
spring.ai.alibaba.context.cache-enabled=true
spring.ai.alibaba.context.max-context-size=5MB
spring.ai.alibaba.context.compression-threshold=1MB
spring.ai.alibaba.context.cleanup-interval=1h

# 跨会话上下文配置
spring.ai.alibaba.context.cross-session.enabled=true
spring.ai.alibaba.context.cross-session.max-sessions=100
spring.ai.alibaba.context.cross-session.retention-period=30d

# 上下文分析配置
spring.ai.alibaba.context.analysis.enabled=true
spring.ai.alibaba.context.analysis.batch-size=50
spring.ai.alibaba.context.analysis.update-interval=6h
```

## 下一步

- [实践指南](./best-practices.md) - 掌握状态与上下文管理的最佳实践
- [人机协作](../human-in-the-loop.md) - 了解人机协作模式
- [持久执行与时间旅行](./durable-execution.md) - 学习持久执行和时间旅行功能
