---
title: Advisors
keywords: ["Spring AI", "Advisors", "RAG", "Chat Memory", "Logging", "Context Enhancement"]
description: "学习如何使用 Advisors 通过上下文、记忆和日志功能增强 AI 交互"
---

# Advisors

*本内容参考自 Spring AI 官方文档*

Advisors API 提供了一种灵活而强大的方式来拦截、修改和增强 Spring 应用程序中的 AI 驱动交互。

在使用用户文本调用 AI 模型时，一个常见的模式是在提示词中追加或增强上下文数据。

这些上下文数据可以是不同类型的。常见类型包括：

- **您自己的数据**：这是 AI 模型未经训练的数据。即使模型见过类似的数据，追加的上下文数据在生成响应时也会优先考虑。
- **对话历史**：聊天模型的 API 是无状态的。如果您告诉 AI 模型您的姓名，它在后续交互中不会记住。必须在每个请求中发送对话历史，以确保在生成响应时考虑之前的交互。

## ChatClient 中的 Advisor 配置

ChatClient 流式 API 提供了一个 AdvisorSpec 接口来配置 advisors。该接口提供了添加参数、一次设置多个参数以及向链中添加一个或多个 advisors 的方法。

```java
interface AdvisorSpec {
    AdvisorSpec param(String k, Object v);
    AdvisorSpec params(Map<String, Object> p);
    AdvisorSpec advisors(Advisor... advisors);
    AdvisorSpec advisors(List<Advisor> advisors);
}
```

> **注意**：向链中添加 advisors 的顺序至关重要，因为它决定了它们的执行顺序。每个 advisor 都会以某种方式修改提示词或上下文，一个 advisor 所做的更改会传递给链中的下一个。

```java
ChatClient.builder(chatModel)
    .build()
    .prompt()
    .advisors(
        MessageChatMemoryAdvisor.builder(chatMemory).build(),
        QuestionAnswerAdvisor.builder(vectorStore).build()
    )
    .user(userText)
    .call()
    .content();
```

在此配置中，MessageChatMemoryAdvisor 将首先执行，将对话历史添加到提示词中。然后，QuestionAnswerAdvisor 将基于用户的问题和添加的对话历史执行搜索，可能提供更相关的结果。

## Question Answer Advisor

QuestionAnswerAdvisor 旨在实现检索增强生成（RAG）模式。它根据用户的查询从向量存储中检索相关文档，并将它们添加到提示词上下文中。

### 基本用法

```java
@Service
public class RAGService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;

    public RAGService(ChatClient.Builder builder, VectorStore vectorStore) {
        this.vectorStore = vectorStore;
        this.chatClient = builder
            .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore).build())
            .build();
    }

    public String askQuestion(String question) {
        return chatClient.prompt()
            .user(question)
            .call()
            .content();
    }
}
```

### 高级配置

```java
QuestionAnswerAdvisor questionAnswerAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
    .searchRequest(SearchRequest.defaults()
        .withTopK(5)
        .withSimilarityThreshold(0.7))
    .userTextAdvise("""
        下面是上下文信息。
        ---------------------
        {context}
        ---------------------
        根据上下文信息而非先验知识，回答查询。
        查询：{query}
        答案：
        """)
    .build();
```

## Message Chat Memory Advisor

MessageChatMemoryAdvisor 在多次交互中维护对话历史。

### 基本用法

```java
@Service
public class ConversationalService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public ConversationalService(ChatClient.Builder builder, ChatMemory chatMemory) {
        this.chatMemory = chatMemory;
        this.chatClient = builder
            .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
            .build();
    }

    public String chat(String conversationId, String message) {
        return chatClient.prompt()
            .user(message)
            .advisors(advisorSpec -> advisorSpec
                .param(CHAT_MEMORY_CONVERSATION_ID_KEY, conversationId))
            .call()
            .content();
    }
}
```

### 配置选项

```java
MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory)
    .chatMemoryRetrieveSize(20)  // 要检索的消息数量
    .order(100)                  // 执行顺序
    .build();
```

## Simple Logger Advisor

SimpleLoggerAdvisor 是一个记录 ChatClient 请求和响应数据的 advisor。这对于调试和监控您的 AI 交互很有用。

> **注意**：Spring AI 支持 LLM 和向量存储交互的可观测性。有关更多信息，请参阅可观测性指南。

### 基本用法

要启用日志记录，在创建 ChatClient 时将 SimpleLoggerAdvisor 添加到 advisor 链中。建议将其添加到链的末尾：

```java
ChatResponse response = ChatClient.create(chatModel).prompt()
        .advisors(new SimpleLoggerAdvisor())
        .user("告诉我一个笑话？")
        .call()
        .chatResponse();
```

### 配置

要查看日志，将 advisor 包的日志级别设置为 DEBUG：

```properties
logging.level.org.springframework.ai.chat.client.advisor=DEBUG
```

将此添加到您的 application.properties 或 application.yaml 文件中。

### 自定义日志记录

您可以通过使用以下构造函数自定义从 AdvisedRequest 和 ChatResponse 记录的数据：

```java
SimpleLoggerAdvisor(
    Function<ChatClientRequest, String> requestToString,
    Function<ChatResponse, String> responseToString,
    int order
)
```

示例用法：

```java
SimpleLoggerAdvisor customLogger = new SimpleLoggerAdvisor(
    request -> "自定义请求：" + request.prompt().getUserMessage(),
    response -> "自定义响应：" + response.getResult(),
    0
);
```

这允许您根据特定需求定制记录的信息。

> **警告**：在生产环境中记录敏感信息时要谨慎。

## 自定义 Advisors

您可以通过实现 Advisor 接口创建自定义 advisors：

```java
public class CustomAdvisor implements Advisor {

    @Override
    public AdvisedRequest adviseRequest(AdvisedRequest request, Map<String, Object> context) {
        // 在发送到 AI 模型之前修改请求
        String originalUserText = request.userText();
        String enhancedUserText = "增强：" + originalUserText;
        
        return AdvisedRequest.from(request)
            .withUserText(enhancedUserText)
            .build();
    }

    @Override
    public ChatResponse adviseResponse(ChatResponse response, Map<String, Object> context) {
        // 在从 AI 模型接收后修改响应
        return response;
    }

    @Override
    public String getName() {
        return "CustomAdvisor";
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
```

## 组合多个 Advisors

您可以组合多个 advisors 来创建复杂的 AI 交互：

```java
@Configuration
public class AdvisorConfiguration {

    @Bean
    public ChatClient enhancedChatClient(
            ChatClient.Builder builder,
            VectorStore vectorStore,
            ChatMemory chatMemory) {
        
        return builder
            .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(chatMemory).build(),
                QuestionAnswerAdvisor.builder(vectorStore).build(),
                new SimpleLoggerAdvisor()
            )
            .build();
    }
}
```

## 下一步

- 学习 [Chat Memory](../chat-memory/) 进行对话管理
- 探索 [RAG](../rag/) 进行基于文档的问答
- 查看 [Observability](../observability/) 进行 AI 交互监控
