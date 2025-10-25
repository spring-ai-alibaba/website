---
title: 聊天记忆 (Chat Memory)
keywords: ["Spring AI", "Chat Memory", "Conversation History", "Memory Management", "Context Retention"]
description: "学习如何在 Spring AI 中实现和管理聊天记忆以维护对话上下文和历史。"
---

# 聊天记忆 (Chat Memory)

*本内容参考自 Spring AI 官方文档*

聊天记忆是 Spring AI 中的一个关键功能，它使 AI 模型能够维护对话上下文并记住之前的交互。这个功能对于构建自然、连贯的对话式 AI 应用程序至关重要，这些应用程序可以引用过去的交流并在多轮对话中保持连续性。

## 概述

聊天记忆允许 AI 模型：
- **记住上下文**：保留对话中之前消息的信息
- **维护连续性**：引用对话的早期部分
- **个性化响应**：基于对话历史调整响应
- **处理多轮对话**：支持复杂的扩展对话

ChatMemory 接口表示聊天对话记忆的存储。它提供了向对话添加消息、从对话中检索消息以及清除对话历史的方法。

## 核心概念

### ChatMemory 接口

`ChatMemory` 接口是 Spring AI 中记忆管理的基础：

```java
public interface ChatMemory {

    void add(String conversationId, List<Message> messages);

    void add(String conversationId, Message message);

    List<Message> get(String conversationId, int lastN);

    void clear(String conversationId);
}
```

### MessageChatMemory 实现

Spring AI 提供了 `MessageChatMemory` 实现，它维护一个消息窗口，最多达到指定的最大大小：

```java
public class MessageChatMemory implements ChatMemory {

    private final ChatMemoryRepository repository;
    private final int maxSize;

    public MessageChatMemory(ChatMemoryRepository repository, int maxSize) {
        this.repository = repository;
        this.maxSize = maxSize;
    }

    // 实现细节...
}
```

## 基本记忆实现

### 简单内存聊天

```java
@Service
public class SimpleChatService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public SimpleChatService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
        this.chatMemory = new InMemoryChatMemoryRepository();
    }

    public String chat(String conversationId, String userMessage) {
        // 将用户消息添加到记忆
        chatMemory.add(conversationId, new UserMessage(userMessage));

        // 获取对话历史
        List<Message> messages = chatMemory.get(conversationId, 10);

        // 使用历史创建提示词
        Prompt prompt = new Prompt(messages);

        // 获取 AI 响应
        ChatResponse response = chatClient.call(prompt);
        String aiMessage = response.getResult().getOutput().getContent();

        // 将 AI 响应添加到记忆
        chatMemory.add(conversationId, new AssistantMessage(aiMessage));

        return aiMessage;
    }

    public void clearConversation(String conversationId) {
        chatMemory.clear(conversationId);
    }
}
```

### 使用 MessageChatMemoryAdvisor

`MessageChatMemoryAdvisor` 提供了一种将聊天记忆与 ChatClient 集成的便捷方式：

```java
@Service
public class AdvisorBasedChatService {

    private final ChatClient chatClient;

    public AdvisorBasedChatService(ChatClient.Builder builder, ChatMemory chatMemory) {
        this.chatClient = builder
            .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
            .build();
    }

    public String chat(String conversationId, String userMessage) {
        return chatClient.prompt()
            .user(userMessage)
            .advisors(advisorSpec -> advisorSpec.param(CHAT_MEMORY_CONVERSATION_ID_KEY, conversationId))
            .call()
            .content();
    }
}
```

## 记忆存储库实现

### InMemoryChatMemoryRepository

用于简单用例和测试：

```java
@Configuration
public class ChatMemoryConfig {

    @Bean
    public ChatMemory inMemoryChatMemory() {
        return new MessageChatMemory(new InMemoryChatMemoryRepository(), 20);
    }
}
```

### JdbcChatMemoryRepository

用于使用 JDBC 的持久化存储：

```java
@Configuration
public class PersistentChatMemoryConfig {

    @Bean
    public ChatMemory jdbcChatMemory(DataSource dataSource) {
        JdbcChatMemoryRepository repository = new JdbcChatMemoryRepository(dataSource);
        return new MessageChatMemory(repository, 50);
    }
}
```

## 记忆实现

### 内存记忆

```java
@Service
public class InMemoryChatMemoryService {
    
    private final Map<String, List<Message>> conversations = new ConcurrentHashMap<>();
    
    public void addMessage(String conversationId, Message message) {
        conversations.computeIfAbsent(conversationId, k -> new ArrayList<>())
                    .add(message);
    }
    
    public List<Message> getMessages(String conversationId) {
        return conversations.getOrDefault(conversationId, new ArrayList<>());
    }
    
    public void clearConversation(String conversationId) {
        conversations.remove(conversationId);
    }
}
```

### Redis 记忆

```java
@Service
public class RedisChatMemoryService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    private static final String CONVERSATION_PREFIX = "chat:conversation:";
    private static final Duration TTL = Duration.ofDays(7);
    
    public void addMessage(String conversationId, Message message) {
        String key = CONVERSATION_PREFIX + conversationId;
        redisTemplate.opsForList().rightPush(key, message);
        redisTemplate.expire(key, TTL);
    }
    
    public List<Message> getMessages(String conversationId) {
        String key = CONVERSATION_PREFIX + conversationId;
        List<Object> objects = redisTemplate.opsForList().range(key, 0, -1);
        return objects.stream()
                .map(obj -> (Message) obj)
                .collect(Collectors.toList());
    }
}
```

### 数据库记忆

```java
@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "conversation_id")
    private String conversationId;
    
    @Column(name = "message_type")
    private String messageType; // USER, ASSISTANT, SYSTEM
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // getters and setters
}

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    void deleteByConversationId(String conversationId);
}

@Service
public class DatabaseChatMemoryService {
    
    @Autowired
    private ChatMessageRepository repository;
    
    public void addMessage(String conversationId, Message message) {
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setConversationId(conversationId);
        chatMessage.setMessageType(message.getMessageType().name());
        chatMessage.setContent(message.getContent());
        chatMessage.setCreatedAt(LocalDateTime.now());
        
        repository.save(chatMessage);
    }
    
    public List<Message> getMessages(String conversationId) {
        return repository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::toMessage)
                .collect(Collectors.toList());
    }
    
    private Message toMessage(ChatMessage chatMessage) {
        MessageType type = MessageType.valueOf(chatMessage.getMessageType());
        switch (type) {
            case USER:
                return new UserMessage(chatMessage.getContent());
            case ASSISTANT:
                return new AssistantMessage(chatMessage.getContent());
            case SYSTEM:
                return new SystemMessage(chatMessage.getContent());
            default:
                throw new IllegalArgumentException("Unknown message type: " + type);
        }
    }
}
```

## 高级功能

### 记忆摘要

```java
@Service
public class SummaryChatMemoryService {
    
    @Autowired
    private ChatClient chatClient;
    
    private static final int MAX_MESSAGES = 20;
    private static final int SUMMARY_THRESHOLD = 15;
    
    public List<Message> getMessagesWithSummary(String conversationId) {
        List<Message> allMessages = getMessages(conversationId);
        
        if (allMessages.size() <= MAX_MESSAGES) {
            return allMessages;
        }
        
        // 生成历史摘要
        List<Message> oldMessages = allMessages.subList(0, SUMMARY_THRESHOLD);
        String summary = generateSummary(oldMessages);
        
        // 保留摘要和最近的消息
        List<Message> result = new ArrayList<>();
        result.add(new SystemMessage("对话摘要: " + summary));
        result.addAll(allMessages.subList(SUMMARY_THRESHOLD, allMessages.size()));
        
        return result;
    }
    
    private String generateSummary(List<Message> messages) {
        String conversation = messages.stream()
                .map(Message::getContent)
                .collect(Collectors.joining("\n"));
        
        return chatClient.prompt()
                .user("请总结以下对话的要点：\n" + conversation)
                .call()
                .content();
    }
}
```

### 向量记忆

```java
@Service
public class VectorChatMemoryService {
    
    @Autowired
    private VectorStore vectorStore;
    
    @Autowired
    private EmbeddingModel embeddingModel;
    
    public void addMessage(String conversationId, Message message) {
        // 创建文档
        Document document = new Document(message.getContent());
        document.getMetadata().put("conversationId", conversationId);
        document.getMetadata().put("messageType", message.getMessageType().name());
        document.getMetadata().put("timestamp", System.currentTimeMillis());
        
        // 存储到向量数据库
        vectorStore.add(List.of(document));
    }
    
    public List<Message> searchRelevantMessages(String conversationId, String query, int limit) {
        // 向量搜索
        List<Document> documents = vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(limit)
                .withSimilarityThreshold(0.7)
                .withFilterExpression("conversationId == '" + conversationId + "'")
        );
        
        return documents.stream()
                .map(this::toMessage)
                .collect(Collectors.toList());
    }
}
```

## 配置选项

```properties
# 记忆配置
spring.ai.chat.memory.enabled=true
spring.ai.chat.memory.type=redis
spring.ai.chat.memory.max-messages=100
spring.ai.chat.memory.ttl=7d

# Redis 配置
spring.ai.chat.memory.redis.host=localhost
spring.ai.chat.memory.redis.port=6379
spring.ai.chat.memory.redis.database=0

# 摘要配置
spring.ai.chat.memory.summary.enabled=true
spring.ai.chat.memory.summary.threshold=20
spring.ai.chat.memory.summary.max-length=500
```

## 配置和最佳实践

### 记忆配置

```yaml
# application.yml
spring:
  ai:
    chat:
      memory:
        max-size: 50
        max-tokens: 4000
        summarization-threshold: 30

  datasource:
    url: jdbc:postgresql://localhost:5432/chatdb
    username: chatuser
    password: chatpass

  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

### 记忆清理服务

```java
@Service
public class MemoryCleanupService {

    private final ConversationMessageRepository messageRepository;
    private final int retentionDays;

    public MemoryCleanupService(ConversationMessageRepository messageRepository,
                               @Value("${chat.memory.retention-days:30}") int retentionDays) {
        this.messageRepository = messageRepository;
        this.retentionDays = retentionDays;
    }

    @Scheduled(fixedRate = 3600000) // 每小时运行一次
    public void cleanupOldMessages() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);

        List<ConversationMessage> oldMessages = messageRepository
            .findByTimestampBefore(cutoffDate);

        if (!oldMessages.isEmpty()) {
            messageRepository.deleteAll(oldMessages);
            logger.info("清理了 {} 条旧消息", oldMessages.size());
        }
    }
}
```

## 最佳实践

### 记忆大小管理

1. **设置适当的限制**：配置最大消息数量和令牌限制
2. **使用摘要**：为长对话实现对话摘要
3. **清理旧数据**：定期删除旧的对话数据
4. **监控记忆使用**：跟踪记忆消耗和性能

### 性能优化

1. **使用缓存**：为频繁访问的对话实现 Redis 或内存缓存
2. **异步操作**：对数据库操作使用异步处理
3. **分页**：为大型对话历史实现分页
4. **索引**：为对话查询添加适当的数据库索引

## 下一步

- 学习 [Tool Calling](../tool-calling/) 增强 AI 功能
- 探索 [Multimodality](../multimodality/) 进行丰富的媒体对话
- 查看 [Structured Output](../structured-output/) 进行格式化响应
