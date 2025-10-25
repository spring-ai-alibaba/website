---
title: "Chat Memory：让你的 AI 拥有记忆"
description: "使用 Spring AI Alibaba 为你的 AI 应用增加强大的、生产就绪的对话记忆能力。"
---

如何让你的 AI 聊天机器人记住之前的对话，进行有上下文的、连贯的交流？

这正是 **“记忆”** 在 AI 应用中的核心作用。Spring AI 提供了标准的 `ChatMemory` 接口来解决这个问题，而 **Spring AI Alibaba (SAA) 则通过提供丰富的、经过生产环境验证的 `ChatMemoryRepository` 实现，将其提升到了企业级水准**。

本文档将引导你从一个最简单的示例开始，逐步掌握如何为你的 AI 应用配置和使用各种强大的记忆后端。

## 5分钟快速上手：使用 H2 数据库

让我们从一个最简单的场景开始：无需安装任何外部数据库（如 Redis、MongoDB），只需添加两个 Maven 依赖，就能立即运行一个具备对话记忆功能的应用。

### 1. 添加依赖

在你的 `pom.xml` 中，加入 `spring-ai-alibaba-starter-memory-jdbc` 和 H2 数据库的依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-jdbc</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 2. 配置 `application.yaml`

配置一个使用 H2 内存数据库的数据源。SAA 的 `ChatMemory` 会自动检测到 JDBC 的 starter 并创建所需的表。

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb  # 使用 H2 内存模式
    driverClassName: org.h2.Driver
    username: sa
    password: ''
```

### 3. 注入并使用 `JdbcChatMemoryRepository`

现在，`JdbcChatMemoryRepository` 已经被自动配置好了，你可以直接在你的代码中注入并使用它。

```java
@RestController
public class ChatController {

    private final ChatClient chatClient;
    private final JdbcChatMemoryRepository memoryRepository;

    @Autowired
    public ChatController(ChatClient.Builder builder, JdbcChatMemoryRepository memoryRepository) {
        this.chatClient = builder.build();
        this.memoryRepository = memoryRepository;
    }

    @GetMapping("/chat/{sessionId}")
    public String chat(@PathVariable String sessionId, @RequestParam String message) {
        
        // 1. 为当前会话构建一个 ChatMemory 实例
        // MessageWindowChatMemory 是一种只保留最近 N 条消息的记忆类型
        ChatMemory chatMemory = MessageWindowChatMemory.builder()
            .chatMemoryRepository(memoryRepository, sessionId) // 传入 Repository 和会话 ID
            .maxMessages(50) // 设置最大消息数量
            .build();

        // 2. 在 Prompt 中使用 ChatMemory
        return chatClient.prompt()
            .user(message)
            .chatMemory(chatMemory) // 将记忆实例传递给 Prompt
            .call()
            .content();
    }
}
```

就这样！现在，当你多次调用 `/chat/some-session-id?message=...` 时，AI 将会记住这个会话之前的对话内容。

## 核心工作原理

理解了上面的例子后，我们来看看其背后的工作机制。SAA 的 `ChatMemory` 遵循一个清晰的架构：

`ChatClient` -> `ChatMemory` -> `ChatMemoryRepository` -> **存储后端 (Redis, DB, etc.)**

1.  **`ChatClient`**：你与 AI 模型交互的入口。
2.  **`ChatMemory`**：一个标准的 Spring AI 接口，它像一个“临时笔记本”，在单次请求中持有对话历史。
3.  **`ChatMemoryRepository`**：这是 SAA 提供的核心组件。它负责将 `ChatMemory` 中的“临时笔记”真正地**读取**和**写入**到后端的持久化存储中。
4.  **存储后端**：如 Redis、MongoDB 或数据库，是记忆数据最终存放的地方。

SAA 的价值在于提供了多种 `ChatMemoryRepository` 的实现，你只需要通过 Maven 依赖和 YAML 配置，就能轻松切换不同的持久化方案。

## 选择合适的生产级后端

当你的应用准备好部署到生产环境时，H2 内存数据库就不再适用了。SAA 提供了丰富的生产级存储后端供你选择。

| 存储类型 | 模块 | 适用场景 | 主要特性 |
|---------|------|----------|----------|
| **Redis** | `spring-ai-alibaba-starter-memory-redis` | 高性能缓存，分布式会话 | 支持单机/集群，多客户端 |
| **MongoDB** | `spring-ai-alibaba-starter-memory-mongodb` | 复杂的对话数据存储 | 高速读写，灵活 Schema |
| **Elasticsearch** | `spring-ai-alibaba-starter-memory-elasticsearch` | 对话历史全文检索 | 分布式，强大的检索能力 |
| **Tablestore** | `spring-ai-alibaba-starter-memory-tablestore` | 阿里云原生，大规模应用 | 通义 App 同款，成熟稳定 |
| **JDBC** | `spring-ai-alibaba-starter-memory-jdbc` | 传统关系数据库集成 | 事务支持，SQL 查询 |
| **Memcached** | `spring-ai-alibaba-starter-memory-memcached` | 分布式缓存 | 高性能，简单易用 |
| **Mem0** | `spring-ai-alibaba-starter-memory-mem0` | AI 专用记忆管理 | 智能记忆生命周期管理 |

下面是一些常用后端的配置和使用示例。

### Redis - 高性能缓存方案

**最常见的选择，适用于需要高性能和分布式会话的绝大多数场景。**

1.  **依赖**:
    ```xml
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-memory-redis</artifactId>
    </dependency>
    ```

2.  **配置** (以单机为例):
    ```yaml
    spring:
      ai:
        memory:
          redis:
            mode: standalone
            client-type: lettuce  # jedis, lettuce, redisson
            host: localhost
            port: 6379
    ```

3.  **使用**:
    ```java
    // 与 H2 示例完全相同，只需将 JdbcChatMemoryRepository 替换为 RedisChatMemoryRepository
    @Autowired
    public ChatController(ChatClient.Builder builder, RedisChatMemoryRepository memoryRepository) {
        // ...
    }
    ```

### MongoDB - 灵活的文档存储方案

**当你的对话数据结构复杂，或希望对记忆内容进行更灵活的查询时，MongoDB 是一个好选择。**

1.  **依赖**:
    ```xml
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-memory-mongodb</artifactId>
    </dependency>
    ```

2.  **配置**:
    ```yaml
    spring:
      ai:
        memory:
          mongodb:
            host: localhost
            port: 27017
            database: ai_memory
    ```

3.  **使用**:
    ```java
    // 与 H2 示例完全相同，只需将 JdbcChatMemoryRepository 替换为 MongoDBChatMemoryRepository
    @Autowired
    public ChatController(ChatClient.Builder builder, MongoDBChatMemoryRepository memoryRepository) {
        // ...
    }
    ```

## 企业级特性

SAA 的 `ChatMemory` 还提供了一些高级功能，以满足复杂的企业级应用需求。

### 多存储混合使用

**场景**：你想用 Redis 实现快速的短期记忆，同时将完整的对话历史归档到 MongoDB 以便长期分析。

`ChatMemory` 的设计允许你通过标准的 Spring `@Bean` 和 `@Qualifier` 来实现这一点。

```java
@Configuration
public class MultiStorageConfig {
    
    // 注意：这里没有指定 @Primary，我们需要在使用时明确选择
    @Bean("redisMemoryRepo")
    public RedisChatMemoryRepository redisChatMemoryRepository(/*... a redis connection factory ...*/) {
        // 手动配置或依赖自动配置
    }

    @Bean("mongoMemoryRepo")
    public MongoDBChatMemoryRepository mongoDBChatMemoryRepository(/*... a mongo client ...*/) {
        // 手动配置或依赖自动配置
    }
}

@Service
public class HybridMemoryService {
    
    private final ChatClient chatClient;
    private final ChatMemoryRepository shortTermRepo; // Redis
    private final ChatMemoryRepository longTermRepo;  // MongoDB
    
    public HybridMemoryService(ChatClient.Builder builder,
                               @Qualifier("redisMemoryRepo") ChatMemoryRepository shortTermRepo,
                               @Qualifier("mongoMemoryRepo") ChatMemoryRepository longTermRepo) {
        this.chatClient = builder.build();
        this.shortTermRepo = shortTermRepo;
        this.longTermRepo = longTermRepo;
    }

    public String chatWithHybridMemory(String sessionId, String message) {
        // 1. 使用 Redis 进行实时对话
        ChatMemory shortTermMemory = new MessageWindowChatMemory(shortTermRepo, sessionId, 20);
        
        String response = chatClient.prompt()
            .user(message)
            .chatMemory(shortTermMemory)
            .call()
            .content();
            
        // 2. 将完整的对话历史异步保存到 MongoDB
        var messagesToPersist = List.of(new UserMessage(message), new AssistantMessage(response));
        longTermRepo.add(sessionId, messagesToPersist);
        
        return response;
    }
}
```

### 多租户隔离

**场景**：在一个 SaaS 应用中，你需要为不同的租户（用户或公司）提供独立的对话记忆，确保数据隔离。

你可以通过动态选择 `ChatMemoryRepository` 实例来实现。

```java
@Service
public class MultiTenantMemoryService {
    
    private final ChatClient chatClient;
    private final Map<String, ChatMemoryRepository> tenantRepositories;
    
    public MultiTenantMemoryService(ChatClient.Builder builder,
                                    // 假设你为不同级别的租户配置了不同的数据库实例
                                    @Qualifier("premiumMongoRepo") MongoDBChatMemoryRepository premiumRepo,
                                    @Qualifier("standardRedisRepo") RedisChatMemoryRepository standardRepo) {
        this.chatClient = builder.build();
        this.tenantRepositories = Map.of(
            "tenant-premium", premiumRepo,
            "tenant-standard", standardRepo
        );
    }
    
    public String chat(String tenantId, String sessionId, String message) {
        // 1. 根据 tenantId 动态选择 Repository
        ChatMemoryRepository repository = tenantRepositories.get(tenantId);
        if (repository == null) {
            throw new IllegalArgumentException("Unknown tenant: " + tenantId);
        }
        
        // 2. 使用选定的 Repository 创建 ChatMemory
        ChatMemory memory = new MessageWindowChatMemory(repository, sessionId);
            
        return chatClient.prompt()
            .user(message)
            .chatMemory(memory)
            .call()
            .content();
    }
}
```

## 与 Spring AI 的关系

本文档聚焦于 SAA 提供的 **增强功能**，特别是丰富的 `ChatMemoryRepository` 社区实现。SAA 的所有记忆管理功能都建立在 Spring AI 的核心抽象之上，并与之完全兼容。

我们强烈建议您首先阅读 **[Spring AI 官方参考文档](https://docs.spring.io/spring-ai/reference/components/memory.html)**，以理解 `ChatMemory`、`MessageWindowChatMemory` 等核心接口和类的基础概念。在此基础上，您可以更轻松地利用 SAA 提供的企业级存储后端来增强您的 AI 应用。

## 相关链接

- 探索 [Graph Memory](./graph-memory) 以处理更复杂的、超越对话历史的状态管理需求。
- 查看 [模型集成文档](../../integration/model-integration) 了解 DashScope 的完整功能。