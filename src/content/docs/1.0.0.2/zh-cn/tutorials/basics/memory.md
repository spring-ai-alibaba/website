---
title: 对话记忆
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba对话记忆"
---

## 聊天内存

### 概述

大型语言模型(LLMs)是无状态的，这意味着它们不保留有关先前交互的信息。当您想要在多个交互中维护上下文或状态时，这可能是一个限制。为了解决这个问题，Spring AI 提供了聊天内存功能，允许您存储和检索与 LLM 的多个交互中的信息。

`ChatMemory` 抽象允许您实现各种类型的内存来支持不同的用例。消息的底层存储由 `ChatMemoryRepository` 处理，其唯一职责是存储和检索消息。由 `ChatMemory` 实现决定保留哪些消息以及何时删除它们。策略示例可能包括保留最后 N 条消息、保留特定时间段的消息或保留达到特定令牌限制的消息。

在选择内存类型之前，了解聊天内存和聊天历史之间的区别很重要：

- **聊天内存**：大型语言模型保留并用于在整个对话中保持上下文感知的信息。
- **聊天历史**：整个对话历史，包括用户和模型之间交换的所有消息。

`ChatMemory` 抽象旨在管理*聊天内存*。它允许您存储和检索与当前对话上下文相关的消息。但是，它不适合存储*聊天历史*。如果您需要维护所有交换消息的完整记录，您应该考虑使用不同的方法，例如依赖 Spring Data 来高效存储和检索完整的聊天历史。

### 快速开始

Spring AI 自动配置一个 `ChatMemory` bean，您可以直接在应用程序中使用它。默认情况下，它使用内存存储库来存储消息(`InMemoryChatMemoryRepository`)和 `MessageWindowChatMemory` 实现来管理对话历史。如果已经配置了不同的存储库(例如 Cassandra、JDBC 或 Neo4j)，Spring AI 将使用该存储库。

```java
@Autowired
ChatMemory chatMemory;
```

以下部分将详细描述 Spring AI 中可用的不同内存类型和存储库。

### 内存类型

`ChatMemory` 抽象允许您实现各种类型的内存以适应不同的用例。内存类型的选择会显著影响应用程序的性能和行为。本节描述了 Spring AI 提供的内置内存类型及其特性。

#### 消息窗口聊天内存

`MessageWindowChatMemory` 维护一个最大指定大小的消息窗口。当消息数量超过最大值时，会删除较旧的消息，同时保留系统消息。默认窗口大小为 20 条消息。

```java
MessageWindowChatMemory memory = MessageWindowChatMemory.builder() 
    .maxMessages(10) 
    .build();
```

这是 Spring AI 用于自动配置 `ChatMemory` bean 的默认消息类型。

### 内存存储

Spring AI 提供 `ChatMemoryRepository` 抽象用于存储聊天内存。本节描述了 Spring AI 提供的内置存储库以及如何使用它们，但您也可以根据需要实现自己的存储库。

#### 内存存储库

`InMemoryChatMemoryRepository` 使用 `ConcurrentHashMap` 在内存中存储消息。

默认情况下，如果没有配置其他存储库，Spring AI 会自动配置一个类型为 `InMemoryChatMemoryRepository` 的 `ChatMemoryRepository` bean，您可以直接在应用程序中使用它。

```java
@Autowired
ChatMemoryRepository chatMemoryRepository;
```

如果您想手动创建 `InMemoryChatMemoryRepository`，可以这样做：

```java
ChatMemoryRepository repository = new InMemoryChatMemoryRepository();
```

#### JdbcChatMemoryRepository

`JdbcChatMemoryRepository` 是一个内置实现，使用 JDBC 在关系数据库中存储消息。它开箱即用地支持多个数据库，适合需要持久存储聊天内存的应用程序。

##### 依赖配置

**Maven**:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-chat-memory-repository-jdbc</artifactId>
</dependency>
```

**Gradle**:

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-chat-memory-repository-jdbc'
}
```

##### 使用方式

Spring AI 为 `JdbcChatMemoryRepository` 提供自动配置，您可以直接在应用程序中使用它：

```java
@Autowired
JdbcChatMemoryRepository chatMemoryRepository;

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

如果您想手动创建 `JdbcChatMemoryRepository`，可以通过提供 `JdbcTemplate` 实例和 `JdbcChatMemoryRepositoryDialect` 来实现：

```java
ChatMemoryRepository chatMemoryRepository = JdbcChatMemoryRepository.builder() 
    .jdbcTemplate(jdbcTemplate) 
    .dialect(new PostgresChatMemoryDialect()) 
    .build();

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

##### 支持的数据库和方言抽象

Spring AI 通过方言抽象支持多个关系数据库。以下数据库开箱即用地支持：

- PostgreSQL
- MySQL / MariaDB
- SQL Server
- HSQLDB

当使用 `JdbcChatMemoryRepositoryDialect.from(DataSource)` 时，可以从 JDBC URL 自动检测正确的方言。您可以通过实现 `JdbcChatMemoryRepositoryDialect` 接口来扩展对其他数据库的支持。

##### 配置属性

| 属性                                                    | 描述                                                         | 默认值                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| spring.ai.chat.memory.repository.jdbc.initialize-schema | 控制何时初始化架构。值: embedded(默认)、always、never。      | embedded                                                     |
| spring.ai.chat.memory.repository.jdbc.schema            | 用于初始化的架构脚本的位置。支持 classpath: URL 和平台占位符。 | classpath:org/springframework/ai/chat/memory/repository/jdbc/schema-@@platform@@.sql |
| spring.ai.chat.memory.repository.jdbc.platform          | 如果在初始化脚本中使用了 @@platform@@ 占位符，则使用的平台。 | 自动检测                                                     |

##### 架构初始化

自动配置将在启动时自动创建 `SPRING_AI_CHAT_MEMORY` 表，使用特定于供应商的 SQL 脚本。默认情况下，架构初始化仅针对嵌入式数据库(H2、HSQL、Derby 等)运行。

您可以使用 `spring.ai.chat.memory.repository.jdbc.initialize-schema` 属性控制架构初始化：

```properties
spring.ai.chat.memory.repository.jdbc.initialize-schema = embedded # 仅用于嵌入式数据库(默认)
spring.ai.chat.memory.repository.jdbc.initialize-schema = always # 始终初始化
spring.ai.chat.memory.repository.jdbc.initialize-schema = never # 从不初始化(与 Flyway/Liquibase 一起使用时很有用)
```

要覆盖架构脚本位置，请使用：

```properties
spring.ai.chat.memory.repository.jdbc.schema = classpath:/custom/path/schema-mysql.sql
```

##### 扩展方言

要添加对新数据库的支持，请实现 `JdbcChatMemoryRepositoryDialect` 接口并提供用于选择、插入和删除消息的 SQL。然后，您可以将自定义方言传递给存储库构建器：

```java
ChatMemoryRepository chatMemoryRepository = JdbcChatMemoryRepository.builder() 
    .jdbcTemplate(jdbcTemplate) 
    .dialect(new MyCustomDbDialect()) 
    .build();
```

#### CassandraChatMemoryRepository

`CassandraChatMemoryRepository` 使用 Apache Cassandra 存储消息。它适合需要持久存储聊天内存的应用程序，特别是在可用性、持久性、扩展性方面，以及利用生存时间(TTL)功能时。

`CassandraChatMemoryRepository` 具有时间序列架构，保留所有过去的聊天窗口记录，对治理和审计很有价值。建议将生存时间设置为某个值，例如三年。

##### 依赖配置

**Maven**:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-chat-memory-repository-cassandra</artifactId>
</dependency>
```

**Gradle**:

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-chat-memory-repository-cassandra'
}
```

##### 使用方式

Spring AI 为 `CassandraChatMemoryRepository` 提供自动配置，您可以直接在应用程序中使用它：

```java
@Autowired
CassandraChatMemoryRepository chatMemoryRepository;

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

如果您想手动创建 `CassandraChatMemoryRepository`，可以通过提供 `CassandraChatMemoryRepositoryConfig` 实例来实现：

```java
ChatMemoryRepository chatMemoryRepository = CassandraChatMemoryRepository 
    .create(CassandraChatMemoryConfig.builder().withCqlSession(cqlSession));

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

##### 配置属性

| 属性                                              | 描述                                     | 默认值          |
| ------------------------------------------------- | ---------------------------------------- | --------------- |
| spring.cassandra.contactPoints                    | 用于启动集群发现的主机                   | 127.0.0.1       |
| spring.cassandra.port                             | 用于连接的 Cassandra 原生协议端口        | 9042            |
| spring.cassandra.localDatacenter                  | 要连接的 Cassandra 数据中心              | datacenter1     |
| spring.ai.chat.memory.cassandra.time-to-live      | 在 Cassandra 中写入的消息的生存时间(TTL) |                 |
| spring.ai.chat.memory.cassandra.keyspace          | Cassandra 键空间                         | springframework |
| spring.ai.chat.memory.cassandra.messages-column   | Cassandra 消息列名                       | springframework |
| spring.ai.chat.memory.cassandra.table             | Cassandra 表                             | ai_chat_memory  |
| spring.ai.chat.memory.cassandra.initialize-schema | 是否在启动时初始化架构。                 | true            |

##### 架构初始化

自动配置将自动创建 `ai_chat_memory` 表。您可以通过将属性 `spring.ai.chat.memory.repository.cassandra.initialize-schema` 设置为 `false` 来禁用架构初始化。

#### Neo4j ChatMemoryRepository

`Neo4jChatMemoryRepository` 是一个内置实现，使用 Neo4j 将聊天消息作为节点和关系存储在属性图数据库中。它适合想要利用 Neo4j 的图功能进行聊天内存持久化的应用程序。

##### 依赖配置

**Maven**:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-chat-memory-repository-neo4j</artifactId>
</dependency>
```

**Gradle**:

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-chat-memory-repository-neo4j'
}
```

##### 使用方式

Spring AI 为 `Neo4jChatMemoryRepository` 提供自动配置，您可以直接在应用程序中使用它：

```java
@Autowired
Neo4jChatMemoryRepository chatMemoryRepository;

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

如果您想手动创建 `Neo4jChatMemoryRepository`，可以通过提供 Neo4j Driver 实例来实现：

```java
ChatMemoryRepository chatMemoryRepository = Neo4jChatMemoryRepository.builder() 
    .driver(driver) 
    .build();

ChatMemory chatMemory = MessageWindowChatMemory.builder() 
    .chatMemoryRepository(chatMemoryRepository) 
    .maxMessages(10) 
    .build();
```

##### 配置属性

| 属性                                                     | 描述                                       | 默认值       |
| -------------------------------------------------------- | ------------------------------------------ | ------------ |
| spring.ai.chat.memory.repository.neo4j.sessionLabel      | 存储对话会话的节点的标签                   | Session      |
| spring.ai.chat.memory.repository.neo4j.messageLabel      | 存储消息的节点的标签                       | Message      |
| spring.ai.chat.memory.repository.neo4j.toolCallLabel     | 存储工具调用的节点的标签(例如在助手消息中) | ToolCall     |
| spring.ai.chat.memory.repository.neo4j.metadataLabel     | 存储消息元数据的节点的标签                 | Metadata     |
| spring.ai.chat.memory.repository.neo4j.toolResponseLabel | 存储工具响应的节点的标签                   | ToolResponse |
| spring.ai.chat.memory.repository.neo4j.mediaLabel        | 存储与消息关联的媒体的节点的标签           | Media        |

##### 索引初始化

Neo4j 存储库将自动确保为会话 ID 和消息索引创建索引，以优化性能。如果您使用自定义标签，也将为这些标签创建索引。不需要架构初始化，但您应该确保您的 Neo4j 实例可以被您的应用程序访问。

### 聊天客户端中的内存

使用 ChatClient API 时，您可以提供 `ChatMemory` 实现来维护多个交互之间的对话上下文。

Spring AI 提供了几个内置的 Advisors，您可以使用它们来根据您的需求配置 `ChatClient` 的内存行为。

> **警告**: 目前，在执行工具调用时与大型语言模型交换的中间消息不会存储在内存中。这是当前实现的限制，将在未来的版本中解决。如果您需要存储这些消息，请参阅用户控制的工具执行的说明。

- `MessageChatMemoryAdvisor`：此 advisor 使用提供的 `ChatMemory` 实现管理对话内存。在每次交互时，它从内存中检索对话历史并将其作为消息集合包含在提示中。
- `PromptChatMemoryAdvisor`：此 advisor 使用提供的 `ChatMemory` 实现管理对话内存。在每次交互时，它从内存中检索对话历史并将其作为纯文本附加到系统提示中。
- `VectorStoreChatMemoryAdvisor`：此 advisor 使用提供的 `VectorStore` 实现管理对话内存。在每次交互时，它从向量存储中检索对话历史并将其作为纯文本附加到系统消息中。

例如，如果您想将 `MessageWindowChatMemory` 与 `MessageChatMemoryAdvisor` 一起使用，可以这样配置：

```java
ChatMemory chatMemory = MessageWindowChatMemory.builder().build();

ChatClient chatClient = ChatClient.builder(chatModel) 
    .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build()) 
    .build();
```

当对 `ChatClient` 执行调用时，内存将由 `MessageChatMemoryAdvisor` 自动管理。对话历史将根据指定的会话 ID 从内存中检索：

```java
String conversationId = "007";

chatClient.prompt() 
    .user("Do I have license to code?") 
    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId)) 
    .call() 
    .content();
```

#### PromptChatMemoryAdvisor 自定义模板

`PromptChatMemoryAdvisor` 使用默认模板来增强系统消息与检索到的对话内存。您可以通过 `.promptTemplate()` 构建器方法提供自己的 `PromptTemplate` 对象来自定义此行为。

> **注意**: 这里提供的 `PromptTemplate` 自定义 advisor 如何将检索到的内存与系统消息合并。这与在 `ChatClient` 本身上配置 `TemplateRenderer`(使用 `.templateRenderer()`)不同，后者影响 advisor 运行之前初始用户/系统提示内容的渲染。有关客户端级模板渲染的更多详细信息，请参阅 ChatClient 提示模板。

自定义 `PromptTemplate` 可以使用任何 `TemplateRenderer` 实现(默认情况下，它使用基于 `StringTemplate` 引擎的 `StPromptTemplate`)。重要要求是模板必须包含以下两个占位符：

- 一个 `instructions` 占位符，用于接收原始系统消息。
- 一个 `memory` 占位符，用于接收检索到的对话内存。

#### VectorStoreChatMemoryAdvisor 自定义模板

`VectorStoreChatMemoryAdvisor` 使用默认模板来增强系统消息与检索到的对话内存。您可以通过 `.promptTemplate()` 构建器方法提供自己的 `PromptTemplate` 对象来自定义此行为。

> **注意**: 这里提供的 `PromptTemplate` 自定义 advisor 如何将检索到的内存与系统消息合并。这与在 `ChatClient` 本身上配置 `TemplateRenderer`(使用 `.templateRenderer()`)不同，后者影响 advisor 运行之前初始用户/系统提示内容的渲染。有关客户端级模板渲染的更多详细信息，请参阅 ChatClient 提示模板。

自定义 `PromptTemplate` 可以使用任何 `TemplateRenderer` 实现(默认情况下，它使用基于 `StringTemplate` 引擎的 `StPromptTemplate`)。重要要求是模板必须包含以下两个占位符：

- 一个 `instructions` 占位符，用于接收原始系统消息。
- 一个 `long_term_memory` 占位符，用于接收检索到的对话内存。

### 聊天模型中的内存

如果您直接使用 `ChatModel` 而不是 `ChatClient`，您可以显式管理内存：

```java
// 创建内存实例
ChatMemory chatMemory = MessageWindowChatMemory.builder().build();
String conversationId = "007";

// 第一次交互
UserMessage userMessage1 = new UserMessage("My name is James Bond");
chatMemory.add(conversationId, userMessage1);
ChatResponse response1 = chatModel.call(new Prompt(chatMemory.get(conversationId)));
chatMemory.add(conversationId, response1.getResult().getOutput());

// 第二次交互
UserMessage userMessage2 = new UserMessage("What is my name?");
chatMemory.add(conversationId, userMessage2);
ChatResponse response2 = chatModel.call(new Prompt(chatMemory.get(conversationId)));
chatMemory.add(conversationId, response2.getResult().getOutput());

// 响应将包含 "James Bond"
```
