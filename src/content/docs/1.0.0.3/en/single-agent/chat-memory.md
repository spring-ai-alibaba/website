---
title: Chat Memory
keywords: ["Spring AI", "Chat Memory", "Conversation History", "Memory Management", "Context Retention"]
description: "Learn how to implement and manage chat memory in Spring AI for maintaining conversation context and history."
---

# Chat Memory

*This content is referenced from Spring AI documentation*

Chat Memory is a crucial feature in Spring AI that enables AI models to maintain conversation context and remember previous interactions. This capability is essential for building natural, coherent conversational AI applications that can reference past exchanges and maintain continuity across multiple turns.

## Overview

Chat Memory allows AI models to:
- **Remember Context**: Retain information from previous messages in a conversation
- **Maintain Continuity**: Reference earlier parts of the conversation
- **Personalize Responses**: Adapt responses based on conversation history
- **Handle Multi-turn Dialogues**: Support complex, extended conversations

The ChatMemory interface represents a storage for chat conversation memory. It provides methods to add messages to a conversation, retrieve messages from a conversation, and clear the conversation history.

## Core Concepts

### ChatMemory Interface

The `ChatMemory` interface is the foundation of memory management in Spring AI:

```java
public interface ChatMemory {

    void add(String conversationId, List<Message> messages);

    void add(String conversationId, Message message);

    List<Message> get(String conversationId, int lastN);

    void clear(String conversationId);
}
```

### MessageChatMemory Implementation

Spring AI provides the `MessageChatMemory` implementation that maintains a window of messages up to a specified maximum size:

```java
public class MessageChatMemory implements ChatMemory {

    private final ChatMemoryRepository repository;
    private final int maxSize;

    public MessageChatMemory(ChatMemoryRepository repository, int maxSize) {
        this.repository = repository;
        this.maxSize = maxSize;
    }

    // Implementation details...
}
```

## Basic Memory Implementation

### Simple In-Memory Chat

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
        // Add user message to memory
        chatMemory.add(conversationId, new UserMessage(userMessage));

        // Get conversation history
        List<Message> messages = chatMemory.get(conversationId, 10);

        // Create prompt with history
        Prompt prompt = new Prompt(messages);

        // Get AI response
        ChatResponse response = chatClient.call(prompt);
        String aiMessage = response.getResult().getOutput().getContent();

        // Add AI response to memory
        chatMemory.add(conversationId, new AssistantMessage(aiMessage));

        return aiMessage;
    }

    public void clearConversation(String conversationId) {
        chatMemory.clear(conversationId);
    }
}
```

### Using MessageChatMemoryAdvisor

The `MessageChatMemoryAdvisor` provides a convenient way to integrate chat memory with ChatClient:

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

## Memory Repository Implementations

### InMemoryChatMemoryRepository

For simple use cases and testing:

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

For persistent storage using JDBC:

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

### Custom Repository Implementation

```java
@Component
public class CustomChatMemoryRepository implements ChatMemoryRepository {

    private final ConversationMessageRepository messageRepository;

    public CustomChatMemoryRepository(ConversationMessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @Override
    public void save(String conversationId, List<Message> messages) {
        List<ConversationMessage> entities = messages.stream()
            .map(message -> toEntity(conversationId, message))
            .collect(Collectors.toList());

        messageRepository.saveAll(entities);
    }

    @Override
    public List<Message> load(String conversationId, int lastN) {
        Pageable pageable = PageRequest.of(0, lastN, Sort.by("timestamp").descending());
        List<ConversationMessage> entities = messageRepository
            .findByConversationIdOrderByTimestampDesc(conversationId, pageable);

        return entities.stream()
            .map(this::toMessage)
            .collect(Collectors.toList());
    }

    @Override
    public void delete(String conversationId) {
        messageRepository.deleteByConversationId(conversationId);
    }

    private ConversationMessage toEntity(String conversationId, Message message) {
        ConversationMessage entity = new ConversationMessage();
        entity.setConversationId(conversationId);
        entity.setContent(message.getContent());
        entity.setMessageType(message.getMessageType());
        entity.setTimestamp(LocalDateTime.now());
        return entity;
    }

    private Message toMessage(ConversationMessage entity) {
        return switch (entity.getMessageType()) {
            case USER -> new UserMessage(entity.getContent());
            case ASSISTANT -> new AssistantMessage(entity.getContent());
            case SYSTEM -> new SystemMessage(entity.getContent());
            default -> throw new IllegalArgumentException("Unknown message type: " + entity.getMessageType());
        };
    }
}

@Entity
@Table(name = "conversation_messages")
public class ConversationMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "message_type")
    @Enumerated(EnumType.STRING)
    private MessageType messageType;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    // Constructors, getters, setters
}
```

## Advanced Memory Features

### Token-Aware Memory Management

```java
@Service
public class TokenAwareChatService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final TokenCountingService tokenCounter;
    private final int maxTokens;

    public TokenAwareChatService(ChatClient.Builder builder,
                                ChatMemory chatMemory,
                                TokenCountingService tokenCounter,
                                @Value("${chat.memory.max-tokens:4000}") int maxTokens) {
        this.chatClient = builder.build();
        this.chatMemory = chatMemory;
        this.tokenCounter = tokenCounter;
        this.maxTokens = maxTokens;
    }

    public String chat(String conversationId, String userMessage) {
        // Add user message
        chatMemory.add(conversationId, new UserMessage(userMessage));

        // Get messages within token limit
        List<Message> messages = getMessagesWithinTokenLimit(conversationId);

        // Get AI response
        Prompt prompt = new Prompt(messages);
        ChatResponse response = chatClient.call(prompt);
        String aiMessage = response.getResult().getOutput().getContent();

        // Add AI response
        chatMemory.add(conversationId, new AssistantMessage(aiMessage));

        return aiMessage;
    }

    private List<Message> getMessagesWithinTokenLimit(String conversationId) {
        List<Message> allMessages = chatMemory.get(conversationId, 100);
        List<Message> result = new ArrayList<>();
        int totalTokens = 0;

        // Add messages from most recent, staying within token limit
        for (int i = allMessages.size() - 1; i >= 0; i--) {
            Message message = allMessages.get(i);
            int messageTokens = tokenCounter.countTokens(message.getContent());

            if (totalTokens + messageTokens <= maxTokens) {
                result.add(0, message); // Add to beginning to maintain order
                totalTokens += messageTokens;
            } else {
                break;
            }
        }

        return result;
    }
}

@Service
public class TokenCountingService {

    public int countTokens(String text) {
        // Simple approximation: 1 token ≈ 4 characters
        // Use a proper tokenizer in production (e.g., tiktoken for OpenAI)
        return text.length() / 4;
    }
}
```

### Conversation Summarization

```java
@Service
public class SummarizingChatService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final int summarizationThreshold;

    public SummarizingChatService(ChatClient.Builder builder,
                                 ChatMemory chatMemory,
                                 @Value("${chat.memory.summarization-threshold:20}") int threshold) {
        this.chatClient = builder.build();
        this.chatMemory = chatMemory;
        this.summarizationThreshold = threshold;
    }

    public String chat(String conversationId, String userMessage) {
        // Check if summarization is needed
        List<Message> allMessages = chatMemory.get(conversationId, 1000);

        if (allMessages.size() > summarizationThreshold) {
            summarizeOldMessages(conversationId, allMessages);
        }

        // Add user message
        chatMemory.add(conversationId, new UserMessage(userMessage));

        // Get recent messages for context
        List<Message> recentMessages = chatMemory.get(conversationId, 10);

        // Get AI response
        Prompt prompt = new Prompt(recentMessages);
        ChatResponse response = chatClient.call(prompt);
        String aiMessage = response.getResult().getOutput().getContent();

        // Add AI response
        chatMemory.add(conversationId, new AssistantMessage(aiMessage));

        return aiMessage;
    }

    private void summarizeOldMessages(String conversationId, List<Message> messages) {
        // Take older messages for summarization (first half)
        int splitPoint = messages.size() / 2;
        List<Message> oldMessages = messages.subList(0, splitPoint);

        // Create conversation text
        String conversationText = oldMessages.stream()
            .map(msg -> msg.getMessageType() + ": " + msg.getContent())
            .collect(Collectors.joining("\n"));

        // Generate summary
        String summaryPrompt = """
            Please summarize the following conversation, focusing on:
            1. Key topics discussed
            2. Important decisions made
            3. User preferences mentioned
            4. Ongoing context that should be remembered

            Conversation:
            %s

            Provide a concise summary:
            """.formatted(conversationText);

        String summary = chatClient.prompt()
            .user(summaryPrompt)
            .call()
            .content();

        // Clear old messages and add summary
        chatMemory.clear(conversationId);
        chatMemory.add(conversationId, new SystemMessage("Previous conversation summary: " + summary));

        // Add back recent messages
        List<Message> recentMessages = messages.subList(splitPoint, messages.size());
        for (Message message : recentMessages) {
            chatMemory.add(conversationId, message);
        }
    }
}
```

## REST API Integration

### Chat Controller with Memory

```java
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final AdvisorBasedChatService chatService;
    private final ChatMemory chatMemory;

    public ChatController(AdvisorBasedChatService chatService, ChatMemory chatMemory) {
        this.chatService = chatService;
        this.chatMemory = chatMemory;
    }

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request) {
        try {
            String response = chatService.chat(request.conversationId(), request.message());
            return ResponseEntity.ok(new ChatResponse(response, request.conversationId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ChatResponse("Error processing message", request.conversationId()));
        }
    }

    @GetMapping("/conversation/{conversationId}/history")
    public ResponseEntity<List<Message>> getConversationHistory(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "20") int limit) {

        List<Message> messages = chatMemory.get(conversationId, limit);
        return ResponseEntity.ok(messages);
    }

    @DeleteMapping("/conversation/{conversationId}")
    public ResponseEntity<Void> clearConversation(@PathVariable String conversationId) {
        chatMemory.clear(conversationId);
        return ResponseEntity.ok().build();
    }

    public record ChatRequest(String conversationId, String message) {}
    public record ChatResponse(String message, String conversationId) {}
}
```

## Configuration and Best Practices

### Memory Configuration

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

### Memory Cleanup Service

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

    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupOldMessages() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);

        List<ConversationMessage> oldMessages = messageRepository
            .findByTimestampBefore(cutoffDate);

        if (!oldMessages.isEmpty()) {
            messageRepository.deleteAll(oldMessages);
            logger.info("Cleaned up {} old messages", oldMessages.size());
        }
    }
}
```

## Best Practices

### Memory Size Management

1. **Set appropriate limits**: Configure maximum message count and token limits
2. **Use summarization**: Implement conversation summarization for long conversations
3. **Clean up old data**: Regularly remove old conversation data
4. **Monitor memory usage**: Track memory consumption and performance

### Performance Optimization

1. **Use caching**: Implement Redis or in-memory caching for frequently accessed conversations
2. **Async operations**: Use asynchronous processing for database operations
3. **Pagination**: Implement pagination for large conversation histories
4. **Indexing**: Add proper database indexes for conversation queries

## Next Steps

- Learn about [Tool Calling](../tool-calling/) for enhanced AI capabilities
- Explore [Multimodality](../multimodality/) for rich media conversations
- Check out [Structured Output](../structured-output/) for formatted responses
    
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

## Advanced Features

### Memory Summarization

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
        
        // Generate historical summary
        List<Message> oldMessages = allMessages.subList(0, SUMMARY_THRESHOLD);
        String summary = generateSummary(oldMessages);
        
        // Keep summary and recent messages
        List<Message> result = new ArrayList<>();
        result.add(new SystemMessage("Conversation summary: " + summary));
        result.addAll(allMessages.subList(SUMMARY_THRESHOLD, allMessages.size()));
        
        return result;
    }
    
    private String generateSummary(List<Message> messages) {
        String conversation = messages.stream()
                .map(Message::getContent)
                .collect(Collectors.joining("\n"));
        
        return chatClient.prompt()
                .user("Please summarize the key points of the following conversation:\n" + conversation)
                .call()
                .content();
    }
}
```

### Vector Memory

```java
@Service
public class VectorChatMemoryService {
    
    @Autowired
    private VectorStore vectorStore;
    
    @Autowired
    private EmbeddingModel embeddingModel;
    
    public void addMessage(String conversationId, Message message) {
        // Create document
        Document document = new Document(message.getContent());
        document.getMetadata().put("conversationId", conversationId);
        document.getMetadata().put("messageType", message.getMessageType().name());
        document.getMetadata().put("timestamp", System.currentTimeMillis());
        
        // Store in vector database
        vectorStore.add(List.of(document));
    }
    
    public List<Message> searchRelevantMessages(String conversationId, String query, int limit) {
        // Vector search
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

## Configuration Options

```properties
# Memory configuration
spring.ai.chat.memory.enabled=true
spring.ai.chat.memory.type=redis
spring.ai.chat.memory.max-messages=100
spring.ai.chat.memory.ttl=7d

# Redis configuration
spring.ai.chat.memory.redis.host=localhost
spring.ai.chat.memory.redis.port=6379
spring.ai.chat.memory.redis.database=0

# Summary configuration
spring.ai.chat.memory.summary.enabled=true
spring.ai.chat.memory.summary.threshold=20
spring.ai.chat.memory.summary.max-length=500
```

## Best Practices

### 1. Choose Appropriate Memory Type
- Short-term conversations: Use buffer memory
- Long-term conversations: Use summary memory
- Knowledge retrieval: Use vector memory

### 2. Manage Memory Size
- Set reasonable message count limits
- Regularly clean expired conversations
- Use summaries to compress history

### 3. Privacy and Security
- Sanitize sensitive information
- Set data expiration times
- Implement access controls

### 4. Performance Optimization
- Use caching to reduce database access
- Process memory storage asynchronously
- Improve efficiency with batch operations

## Next Steps

- [Learn Tool Calling](/docs/1.0.0.3/single-agent/tool-calling/)
- [Understand Model Evaluation](/docs/1.0.0.3/single-agent/model-evaluation/)
- [Explore Observability](/docs/1.0.0.3/single-agent/observability/)
