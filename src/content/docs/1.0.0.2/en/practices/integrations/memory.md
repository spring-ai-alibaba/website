---
title: Memory Chat Memory Integration
keywords: [Spring AI Alibaba, Memory, Chat Memory, Chat Memory]
description: "Spring AI Alibaba Chat Memory module, supporting multiple storage backends"
---

## Basic Usage

The Spring AI Alibaba Memory module is an extended implementation built on top of Spring AI's Memory functionality, providing support for multiple storage backends, allowing AI applications to "remember" previous interactions, thus providing a more coherent and personalized user experience.

### 1. Add Maven Dependencies

Select appropriate storage backend dependencies as needed:

```xml
<!-- Redis Storage -->        
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-redis</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

```xml
<!-- JDBC Storage (supports MySQL, PostgreSQL, etc.) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-jdbc</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

```xml
<!-- MongoDB Storage -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-mongodb</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

```xml
<!-- Elasticsearch Storage -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-elasticsearch</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

```xml
<!-- Tablestore Storage -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-tablestore</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

```xml
<!-- Memcached Storage -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-memcached</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

### 2. Configure Connection Parameters

Configure the connection information for the selected storage backend in application.yml:

#### Redis Configuration Example
```yaml
spring:
  ai:
    memory:
      redis:
        mode: standalone
        client-type: lettuce
        host: localhost
        port: 6379
```

#### JDBC Configuration Example
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/chat_memory
    username: root
    password: password
    driver-class-name: com.mysql.cj.jdbc.Driver
    
  ai:
    memory:
      jdbc:
        enabled: true
```

#### MongoDB Configuration Example
```yaml
spring:
  ai:
    memory:
      mongodb:
        host: localhost
        port: 27017
        database: chat_memory
```

### 3. Using the Memory Module

Use the Memory module to manage conversation history in code:

```java
@RestController
public class ChatController {
    
    @Autowired
    private ChatMemoryRepository chatMemoryRepository;
    
    @PostMapping("/chat")
    public String chat(@RequestParam String message, @RequestParam String conversationId) {
        // Build a memory component with a message window, keeping at most the last 10 messages
        ChatMemory chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(10)
                .build();
                
        // Create ChatClient and use memory functionality
        ChatClient chatClient = ChatClient.builder(chatModel)
                .defaultAdvisors(
                    new SimpleLoggerAdvisor(),
                    MessageChatMemoryAdvisor.builder(chatMemory)
                        .conversationId(conversationId)
                        .build())
                .build();
                
        // Initiate AI model call and enable memory functionality
        return chatClient.prompt()
                .user(message)
                .call()
                .chatResponse()
                .getResult()
                .getOutput()
                .getText();
    }
}
```

## Core Concepts

### ChatMemory
ChatMemory is an interface for managing chat memory, responsible for saving and retrieving conversation history. Spring AI Alibaba uses the MessageWindowChatMemory implementation, which maintains a fixed-size message window.

### ChatMemoryRepository
ChatMemoryRepository is the repository interface for actually storing and retrieving conversation history. Spring AI Alibaba provides multiple implementations supporting different storage backends.

## Supported Storage Backends

| Storage Type | Maven Dependency | Description |
|---------|------------|------|
| Redis | `spring-ai-alibaba-starter-memory-redis` | High-performance in-memory database, supporting multiple clients (Jedis, Lettuce, Redisson) |
| JDBC | `spring-ai-alibaba-starter-memory-jdbc` | Relational database storage, supporting MySQL, PostgreSQL, Oracle, etc. |
| MongoDB | `spring-ai-alibaba-starter-memory-mongodb` | Document database, suitable for unstructured data storage |
| Elasticsearch | `spring-ai-alibaba-starter-memory-elasticsearch` | Search engine, supporting full-text search and complex queries |
| Tablestore | `spring-ai-alibaba-starter-memory-tablestore` | Alibaba Cloud Table Store, high concurrency, automatic sharding |
| Memcached | `spring-ai-alibaba-starter-memory-memcached` | Distributed memory caching system |

## Use Cases

### 1. Conversation Context Preservation
The most important role of the Memory module is to maintain conversation context. Without memory functionality, each conversation is independent, and the AI cannot understand the user's continuous intent.

```java
// User's first round of conversation
// User: "Hello, my name is Zhang San"
// AI: "Hello Zhang San! How can I help you?"

// User's second round of conversation
// User: "What did I just say?"
// AI: "You just said 'Hello, my name is Zhang San', telling me your name is Zhang San."
```

### 2. Personalized Experience
By storing user's historical interaction data, the AI system can:
- Learn user preferences
- Provide customized recommendations
- Remember user's historical choices

### 3. Enterprise Applications
In enterprise applications, the Memory module can help implement:
- Historical conversation viewing in customer service systems
- Personalized services in intelligent assistants
- Customer preference recording in sales systems

## Advanced Configuration

### Custom Message Window Size
```java
ChatMemory chatMemory = MessageWindowChatMemory.builder()
        .chatMemoryRepository(chatMemoryRepository)
        .maxMessages(20)  // Keep the last 20 messages
        .build();
```

### Multi-Conversation Management
Manage multiple independent conversations through different conversationIds:

```java
// Conversation 1
String conversationId1 = "user1-session1";
chatMemory.put(conversationId1, new UserMessage("Hello"));

// Conversation 2
String conversationId2 = "user2-session1";
chatMemory.put(conversationId2, new UserMessage("Hello"));
```

## Relationship with Spring AI

The Memory module of Spring AI Alibaba is an extended implementation built on top of Spring AI's Memory functionality:

1. **Compatibility**: Fully compatible with Spring AI's ChatMemory and ChatMemoryRepository interfaces
2. **Extensibility**: Provides multiple enterprise-level storage backend implementations based on Spring AI
3. **Ease of Use**: Provides Spring Boot auto-configuration to simplify usage

Spring AI basic usage:
```java
// Using default in-memory storage
ChatMemory chatMemory = MessageWindowChatMemory.builder()
    .maxMessages(10)
    .build();
```

Spring AI Alibaba extended usage:
```java
// Using Redis storage
ChatMemory chatMemory = MessageWindowChatMemory.builder()
    .chatMemoryRepository(redisChatMemoryRepository)
    .maxMessages(10)
    .build();
```

## Best Practices

1. **Choose the appropriate storage backend**:
   - High performance requirements: Redis
   - Persistence requirements: JDBC
   - Document storage: MongoDB
   - Search capabilities: Elasticsearch
   - Alibaba Cloud environment: Tablestore

2. **Set message window size appropriately**:
   - Too small: Loss of context information
   - Too large: Impact on performance and cost

3. **Properly manage conversationId**:
   - Use unique conversationId for each user session
   - Consider session expiration and cleanup strategies

4. **Reference examples**:
   - [Chat Memory Example Project](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-memory-example)
