---
title: 短期状态管理
description: 运行时状态和短期记忆管理
---

# 短期状态管理

短期状态管理是多智能体系统中处理单次执行或单个会话内状态的核心机制。它包括运行时状态维护、短期记忆管理和检查点机制，确保智能体在执行过程中能够有效地维护和使用临时状态信息。

## 运行时状态

**运行时状态**是智能体在单次执行过程中维护的动态数据，通过 Spring AI Alibaba 的 `OverAllState` 对象进行管理。

### KeyStrategy 配置

```java
@Configuration
public class StateConfiguration {

    @Bean
    public KeyStrategyFactory chatKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();

            // 配置不同类型的状态键和更新策略
            strategies.put("messages", new AppendStrategy());        // 消息追加
            strategies.put("user_input", new ReplaceStrategy());     // 用户输入替换
            strategies.put("ai_response", new ReplaceStrategy());    // AI响应替换
            strategies.put("session_data", new ReplaceStrategy());   // 会话数据替换
            strategies.put("step_count", new ReplaceStrategy());     // 步骤计数替换

            return strategies;
        };
    }

    // 使用 KeyStrategyFactoryBuilder 简化配置
    @Bean
    public KeyStrategyFactory simpleKeyStrategyFactory() {
        return new KeyStrategyFactoryBuilder()
            .addStrategy("messages", KeyStrategy.APPEND)
            .addStrategy("user_input", KeyStrategy.REPLACE)
            .addStrategy("ai_response", KeyStrategy.REPLACE)
            .addStrategy("step_count", KeyStrategy.REPLACE)
            .build();
    }
}
```

### 状态操作

```java
@Component
public class StateManager {

    public NodeAction createStateUpdateNode() {
        return (state) -> {
            // 读取当前状态
            List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());
            int stepCount = (Integer) state.value("step_count").orElse(0);
            String userInput = (String) state.value("user_input").orElse("");

            // 处理用户输入
            String aiResponse = "处理结果: " + userInput;

            // 返回状态更新
            return Map.of(
                "step_count", stepCount + 1,
                "ai_response", aiResponse,
                "messages", List.of("User: " + userInput, "AI: " + aiResponse),
                "processed_at", Instant.now().toString()
            );
        };
    }

    public Map<String, Object> getStateSnapshot(OverAllState state) {
        return Map.of(
            "messages", state.value("messages").orElse(List.of()),
            "user_input", state.value("user_input").orElse(""),
            "ai_response", state.value("ai_response").orElse(""),
            "step_count", state.value("step_count").orElse(0)
        );
    }
}
```

## 短期记忆

**短期记忆**让智能体能够记住单个线程或对话中的先前交互，通过线程范围的检查点进行持久化。

### 基本短期记忆实现

```java
@Service
public class ShortTermMemoryService {

    private final CompiledGraph compiledGraph;

    public ShortTermMemoryService(CompiledGraph compiledGraph) {
        this.compiledGraph = compiledGraph;
    }

    public void addMessage(String threadId, String message) {
        // 创建运行时配置
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        // 获取当前状态
        StateSnapshot stateSnapshot = compiledGraph.getState(config);
        List<String> messages = new ArrayList<>();

        if (stateSnapshot != null && stateSnapshot.getState() != null) {
            messages = (List<String>) stateSnapshot.getState().getOrDefault("messages", new ArrayList<>());
        }

        // 添加新消息
        messages.add(message);

        // 管理消息长度
        messages = manageMessageLength(messages);

        // 更新状态
        Map<String, Object> updates = Map.of("messages", messages);
        compiledGraph.updateState(config, updates);
    }

    private List<String> manageMessageLength(List<String> messages) {
        int maxMessages = 20;
        if (messages.size() <= maxMessages) {
            return messages;
        }

        // 保留最近的消息
        return messages.subList(messages.size() - maxMessages, messages.size());
    }

    public List<String> getMessages(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        StateSnapshot stateSnapshot = compiledGraph.getState(config);
        if (stateSnapshot != null && stateSnapshot.getState() != null) {
            return (List<String>) stateSnapshot.getState().getOrDefault("messages", new ArrayList<>());
        }

        return new ArrayList<>();
    }

    public void clearMessages(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        // 清空消息历史
        Map<String, Object> updates = Map.of("messages", new ArrayList<>());
        compiledGraph.updateState(config, updates);
    }

    public int getMessageCount(String threadId) {
        List<String> messages = getMessages(threadId);
        return messages.size();
    }
}
```

### 智能消息管理

> **注意**: 以下智能消息总结功能可以基于现有的 ChatClient 实现，是推荐的最佳实践。

```java
@Service
public class IntelligentMessageManager {

    private final ChatClient chatClient;

    public IntelligentMessageManager(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public List<String> summarizeOldMessages(List<String> messages, int keepRecentCount) {
        if (messages.size() <= keepRecentCount + 5) {
            return messages;
        }

        // 需要总结的消息和保留的消息
        List<String> toSummarize = messages.subList(0, messages.size() - keepRecentCount);
        List<String> toKeep = messages.subList(messages.size() - keepRecentCount, messages.size());

        // 生成总结
        String summary = generateConversationSummary(toSummarize);

        // 构建新的消息列表
        List<String> result = new ArrayList<>();

        if (!summary.isEmpty()) {
            result.add("对话总结：" + summary);
        }

        result.addAll(toKeep);

        return result;
    }

    private String generateConversationSummary(List<String> messages) {
        if (messages.isEmpty()) {
            return "";
        }

        String conversationText = String.join("\n", messages);

        String prompt = String.format("""
            请总结以下对话的关键信息和上下文：

            %s

            请提供一个简洁的总结，包含重要的事实、决定和上下文信息。
            """, conversationText);

        try {
            return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        } catch (Exception e) {
            System.err.println("生成对话总结失败: " + e.getMessage());
            return "对话包含 " + messages.size() + " 条消息";
        }
    }
}
```

## 检查点机制

检查点机制确保短期状态的持久化和恢复能力。

### 检查点配置

```java
@Configuration
public class CheckpointConfiguration {

    @Bean
    public StateGraph chatStateGraph(KeyStrategyFactory keyStrategyFactory) {
        return new StateGraph(keyStrategyFactory)
            .addNode("process_message", this::processMessage)
            .addNode("generate_response", this::generateResponse)
            .addEdge(StateGraph.START, "process_message")
            .addEdge("process_message", "generate_response")
            .addEdge("generate_response", StateGraph.END);
    }

    @Bean
    public CompiledGraph createGraphWithCheckpoints(StateGraph chatStateGraph) {
        // 配置内存检查点保存器
        MemorySaver memorySaver = new MemorySaver();

        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, memorySaver)
            .type(SaverConstant.MEMORY)
            .build();

        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .build();

        return chatStateGraph.compile(compileConfig);
    }

    // Redis 检查点保存器配置（可选）
    @Bean
    @ConditionalOnProperty(name = "spring.ai.alibaba.checkpoint.type", havingValue = "redis")
    public CompiledGraph createGraphWithRedisCheckpoints(StateGraph chatStateGraph, RedissonClient redissonClient) {
        RedisSaver redisSaver = new RedisSaver(redissonClient);

        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.REDIS, redisSaver)
            .type(SaverConstant.REDIS)
            .build();

        CompileConfig compileConfig = CompileConfig.builder()
            .saverConfig(saverConfig)
            .build();

        return chatStateGraph.compile(compileConfig);
    }

    private NodeAction processMessage = state -> {
        List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());
        int stepCount = (Integer) state.value("step_count").orElse(0);

        // 处理消息逻辑
        return Map.of(
            "step_count", stepCount + 1,
            "processed_at", Instant.now().toString(),
            "processed_messages", messages.size()
        );
    };

    private NodeAction generateResponse = state -> {
        // 生成响应逻辑
        return Map.of(
            "response_generated", true,
            "generated_at", Instant.now().toString()
        );
    };
}
```

### 状态查询和恢复

```java
@Service
public class StateQueryService {

    private final CompiledGraph compiledGraph;

    public StateQueryService(CompiledGraph compiledGraph) {
        this.compiledGraph = compiledGraph;
    }

    public StateSnapshot getCurrentState(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        return compiledGraph.getState(config);
    }

    public List<Checkpoint> getCheckpointHistory(String threadId) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        // 获取检查点历史（需要访问底层的 CheckpointSaver）
        return compiledGraph.getCompileConfig()
            .checkpointSaver()
            .map(saver -> saver.list(config))
            .orElse(List.of());
    }

    public void updateState(String threadId, Map<String, Object> updates) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        compiledGraph.updateState(config, updates);
    }

    public Optional<OverAllState> resumeFromThread(String threadId, Map<String, Object> inputs) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        // 从线程恢复执行
        return compiledGraph.invoke(inputs, config);
    }

    public Stream<NodeOutput> streamFromThread(String threadId, Map<String, Object> inputs) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId(threadId)
            .build();

        // 流式执行
        return compiledGraph.stream(inputs, config).stream();
    }
}
```

## 实际应用示例

### 聊天机器人短期状态管理

```java
@RestController
@RequestMapping("/chat")
public class ChatBotController {

    private final CompiledGraph chatGraph;
    private final ShortTermMemoryService memoryService;

    public ChatBotController(CompiledGraph chatGraph, ShortTermMemoryService memoryService) {
        this.chatGraph = chatGraph;
        this.memoryService = memoryService;
    }

    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> processUserMessage(
            @RequestParam String threadId,
            @RequestParam String message) {
        try {
            // 添加用户消息到短期记忆
            memoryService.addMessage(threadId, "User: " + message);

            // 创建执行配置
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            // 准备输入状态
            Map<String, Object> input = Map.of(
                "user_input", message,
                "timestamp", Instant.now().toString()
            );

            // 执行图
            Optional<OverAllState> result = chatGraph.invoke(input, config);

            if (result.isPresent()) {
                String aiResponse = (String) result.get().value("ai_response").orElse("无响应");

                // 添加AI响应到短期记忆
                memoryService.addMessage(threadId, "AI: " + aiResponse);

                return ResponseEntity.ok(Map.of(
                    "response", aiResponse,
                    "threadId", threadId,
                    "messageCount", memoryService.getMessageCount(threadId)
                ));
            }

            return ResponseEntity.ok(Map.of("error", "处理消息时出现问题"));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "系统暂时不可用"));
        }
    }

    @DeleteMapping("/session/{threadId}")
    public ResponseEntity<Map<String, Object>> clearSession(@PathVariable String threadId) {
        try {
            // 清除短期记忆
            memoryService.clearMessages(threadId);

            // 重置状态
            RunnableConfig config = RunnableConfig.builder()
                .threadId(threadId)
                .build();

            Map<String, Object> clearState = Map.of(
                "messages", List.of(),
                "step_count", 0,
                "user_input", "",
                "ai_response", ""
            );

            chatGraph.updateState(config, clearState);

            return ResponseEntity.ok(Map.of("status", "session_cleared"));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "清除会话失败"));
        }
    }

    @GetMapping("/session/{threadId}")
    public ResponseEntity<Map<String, Object>> getSessionInfo(@PathVariable String threadId) {
        try {
            StateSnapshot stateSnapshot = chatGraph.getState(RunnableConfig.builder().threadId(threadId).build());
            List<String> messages = memoryService.getMessages(threadId);

            return ResponseEntity.ok(Map.of(
                "threadId", threadId,
                "messageCount", messages.size(),
                "messages", messages,
                "state", stateSnapshot != null ? stateSnapshot.getState() : Map.of()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "获取会话信息失败"));
        }
    }
}
```

## 配置选项

```properties
# 检查点保存器类型配置
spring.ai.alibaba.checkpoint.type=memory
# spring.ai.alibaba.checkpoint.type=redis
# spring.ai.alibaba.checkpoint.type=filesystem

# Redis 配置（当使用 Redis 检查点保存器时）
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.database=0

# 文件系统配置（当使用文件系统检查点保存器时）
spring.ai.alibaba.checkpoint.filesystem.path=./checkpoints

# 应用配置
app.chat.max-messages=20
app.chat.auto-summarize=true
app.chat.summary-threshold=30
```

### 完整配置示例

```java
@Configuration
@EnableConfigurationProperties
public class ChatConfiguration {

    @Value("${app.chat.max-messages:20}")
    private int maxMessages;

    @Value("${app.chat.auto-summarize:true}")
    private boolean autoSummarize;

    @Bean
    public KeyStrategyFactory keyStrategyFactory() {
        return new KeyStrategyFactoryBuilder()
            .addStrategy("messages", KeyStrategy.APPEND)
            .addStrategy("user_input", KeyStrategy.REPLACE)
            .addStrategy("ai_response", KeyStrategy.REPLACE)
            .addStrategy("step_count", KeyStrategy.REPLACE)
            .build();
    }

    @Bean
    public StateGraph chatStateGraph(KeyStrategyFactory keyStrategyFactory, ChatClient.Builder chatClientBuilder) {
        ChatClient chatClient = chatClientBuilder.build();

        NodeAction chatNode = state -> {
            String userInput = (String) state.value("user_input").orElse("");
            List<String> messages = (List<String>) state.value("messages").orElse(new ArrayList<>());

            // 调用 AI 模型
            String aiResponse = chatClient.prompt()
                .user(userInput)
                .call()
                .content();

            return Map.of(
                "ai_response", aiResponse,
                "messages", List.of("User: " + userInput, "AI: " + aiResponse)
            );
        };

        return new StateGraph(keyStrategyFactory)
            .addNode("chat", chatNode)
            .addEdge(StateGraph.START, "chat")
            .addEdge("chat", StateGraph.END);
    }
}
```

## 下一步

- [长期状态管理](./long-term-state.md) - 了解跨会话的持久状态管理
- [持久执行](./durable-execution.md) - 学习持久执行机制
- [上下文工程](./context-engineering.md) - 掌握上下文管理技巧
