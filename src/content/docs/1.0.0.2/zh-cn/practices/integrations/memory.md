---
title: Memory 对话记忆模块集成
keywords: [Spring AI Alibaba, Memory, Chat Memory, 对话记忆]
description: "Spring AI Alibaba 对话记忆模块，支持多种存储后端"
---

## 基本使用方法

Spring AI Alibaba Memory 模块是基于 Spring AI 的 Memory 功能构建的扩展实现，提供了多种存储后端支持，使得 AI 应用能够"记住"之前的交互，从而提供更连贯、更个性化的用户体验。

### 1. 添加Maven依赖

根据需要选择合适的存储后端依赖：

```xml
<!-- Redis 存储 -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-redis</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>

<!-- JDBC 存储 (支持 MySQL、PostgreSQL 等) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-jdbc</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>

<!-- MongoDB 存储 -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-mongodb</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>

<!-- Elasticsearch 存储 -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-elasticsearch</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>

<!-- Tablestore 存储 -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-tablestore</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>

<!-- Memcached 存储 -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-memory-memcached</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

### 2. 配置连接参数

在 application.yml 中配置所选存储后端的连接信息：

#### Redis 配置示例
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

#### JDBC 配置示例
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

#### MongoDB 配置示例
```yaml
spring:
  ai:
    memory:
      mongodb:
        host: localhost
        port: 27017
        database: chat_memory
```

### 3. 使用 Memory 模块

在代码中使用 Memory 模块管理对话历史：

```java
@RestController
public class ChatController {
    
    @Autowired
    private ChatMemoryRepository chatMemoryRepository;
    
    @PostMapping("/chat")
    public String chat(@RequestParam String message, @RequestParam String conversationId) {
        // 构建带消息窗口的记忆组件，最多保留最近10条消息
        ChatMemory chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(10)
                .build();
                
        // 创建 ChatClient 并使用记忆功能
        ChatClient chatClient = ChatClient.builder(chatModel)
                .defaultAdvisors(
                    new SimpleLoggerAdvisor(),
                    MessageChatMemoryAdvisor.builder(chatMemory)
                        .conversationId(conversationId)
                        .build())
                .build();
                
        // 发起 AI 模型调用，并启用记忆功能
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

## 核心概念

### ChatMemory
ChatMemory 是管理对话内存的接口，负责保存和检索对话历史。Spring AI Alibaba 使用 MessageWindowChatMemory 实现，它维护一个固定大小的消息窗口。

### ChatMemoryRepository
ChatMemoryRepository 是实际存储和检索对话历史的存储库接口。Spring AI Alibaba 提供了多种实现，支持不同的存储后端。

## 支持的存储后端

| 存储类型 | Maven 依赖 | 说明 |
|---------|------------|------|
| Redis | `spring-ai-alibaba-starter-memory-redis` | 高性能内存数据库，支持多种客户端（Jedis、Lettuce、Redisson） |
| JDBC | `spring-ai-alibaba-starter-memory-jdbc` | 关系型数据库存储，支持 MySQL、PostgreSQL、Oracle 等 |
| MongoDB | `spring-ai-alibaba-starter-memory-mongodb` | 文档数据库，适合非结构化数据存储 |
| Elasticsearch | `spring-ai-alibaba-starter-memory-elasticsearch` | 搜索引擎，支持全文检索和复杂查询 |
| Tablestore | `spring-ai-alibaba-starter-memory-tablestore` | 阿里云表格存储，高并发、自动分片 |
| Memcached | `spring-ai-alibaba-starter-memory-memcached` | 分布式内存缓存系统 |

## 使用场景

### 1. 对话上下文保持
Memory 模块最重要的作用是保持对话的上下文。没有记忆功能，每次对话都是独立的，AI 无法理解用户的连续意图。

```java
// 用户第一轮对话
// User: "你好，我叫张三"
// AI: "你好张三！有什么我可以帮你的吗？"

// 用户第二轮对话
// User: "我刚才说什么来着？"
// AI: "你刚才说'你好，我叫张三'，告诉我你的名字是张三。"
```

### 2. 个性化体验
通过存储用户的历史交互数据，AI 系统可以：
- 学习用户偏好
- 提供定制化建议
- 记住用户的历史选择

### 3. 企业级应用
在企业级应用中，Memory 模块可以帮助实现：
- 客服系统的历史对话查看
- 智能助手的个性化服务
- 销售系统的客户偏好记录

## 高级配置

### 自定义消息窗口大小
```java
ChatMemory chatMemory = MessageWindowChatMemory.builder()
        .chatMemoryRepository(chatMemoryRepository)
        .maxMessages(20)  // 保留最近20条消息
        .build();
```

### 多对话管理
通过不同的 conversationId 管理多个独立的对话：

```java
// 对话1
String conversationId1 = "user1-session1";
chatMemory.put(conversationId1, new UserMessage("你好"));

// 对话2
String conversationId2 = "user2-session1";
chatMemory.put(conversationId2, new UserMessage("你好"));
```

## 与 Spring AI 的关系

Spring AI Alibaba 的 Memory 模块是基于 Spring AI 的 Memory 功能构建的扩展实现：

1. **兼容性**：完全兼容 Spring AI 的 ChatMemory 和 ChatMemoryRepository 接口
2. **扩展性**：在 Spring AI 基础上提供了多种企业级存储后端实现
3. **易用性**：提供 Spring Boot 自动配置，简化使用

Spring AI 基础用法：
```java
// 使用默认的内存存储
ChatMemory chatMemory = MessageWindowChatMemory.builder()
    .maxMessages(10)
    .build();
```

Spring AI Alibaba 扩展用法：
```java
// 使用 Redis 存储
ChatMemory chatMemory = MessageWindowChatMemory.builder()
    .chatMemoryRepository(redisChatMemoryRepository)
    .maxMessages(10)
    .build();
```

## 最佳实践

1. **选择合适的存储后端**：
   - 高性能要求：Redis
   - 持久化要求：JDBC
   - 文档存储：MongoDB
   - 搜索能力：Elasticsearch
   - 阿里云环境：Tablestore

2. **合理设置消息窗口大小**：
   - 过小：丢失上下文信息
   - 过大：影响性能和成本

3. **正确管理 conversationId**：
   - 每个用户会话使用唯一的 conversationId
   - 考虑会话过期和清理策略

4. **参考案例**：
   - [Chat Memory 示例项目](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-memory-example)
   
