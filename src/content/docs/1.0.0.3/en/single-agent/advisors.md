---
title: Advisors
keywords: ["Spring AI", "Advisors", "RAG", "Chat Memory", "Logging", "Context Enhancement"]
description: "Learn how to use Advisors to enhance AI interactions with context, memory, and logging capabilities"
---

# Advisors

*This content is referenced from Spring AI documentation*

The Advisors API provides a flexible and powerful way to intercept, modify, and enhance AI-driven interactions in your Spring applications.

A common pattern when calling an AI model with user text is to append or augment the prompt with contextual data.

This contextual data can be of different types. Common types include:

- **Your own data**: This is data the AI model hasn't been trained on. Even if the model has seen similar data, the appended contextual data takes precedence in generating the response.
- **Conversational history**: The chat model's API is stateless. If you tell the AI model your name, it won't remember it in subsequent interactions. Conversational history must be sent with each request to ensure previous interactions are considered when generating a response.

## Advisor Configuration in ChatClient

The ChatClient fluent API provides an AdvisorSpec interface for configuring advisors. This interface offers methods to add parameters, set multiple parameters at once, and add one or more advisors to the chain.

```java
interface AdvisorSpec {
    AdvisorSpec param(String k, Object v);
    AdvisorSpec params(Map<String, Object> p);
    AdvisorSpec advisors(Advisor... advisors);
    AdvisorSpec advisors(List<Advisor> advisors);
}
```

> **Note**: The order in which advisors are added to the chain is crucial, as it determines the sequence of their execution. Each advisor modifies the prompt or the context in some way, and the changes made by one advisor are passed on to the next in the chain.

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

In this configuration, the MessageChatMemoryAdvisor will be executed first, adding the conversation history to the prompt. Then, the QuestionAnswerAdvisor will perform its search based on the user's question and the added conversation history, potentially providing more relevant results.

## Question Answer Advisor

The QuestionAnswerAdvisor is designed to implement the Retrieval Augmented Generation (RAG) pattern. It retrieves relevant documents from a vector store based on the user's query and adds them to the prompt context.

### Basic Usage

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

### Advanced Configuration

```java
QuestionAnswerAdvisor questionAnswerAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
    .searchRequest(SearchRequest.defaults()
        .withTopK(5)
        .withSimilarityThreshold(0.7))
    .userTextAdvise("""
        Context information is below.
        ---------------------
        {context}
        ---------------------
        Given the context information and not prior knowledge, answer the query.
        Query: {query}
        Answer:
        """)
    .build();
```

## Message Chat Memory Advisor

The MessageChatMemoryAdvisor maintains conversation history across multiple interactions.

### Basic Usage

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

### Configuration Options

```java
MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory)
    .chatMemoryRetrieveSize(20)  // Number of messages to retrieve
    .order(100)                  // Execution order
    .build();
```

## Simple Logger Advisor

The SimpleLoggerAdvisor is an advisor that logs the request and response data of the ChatClient. This can be useful for debugging and monitoring your AI interactions.

> **Note**: Spring AI supports observability for LLM and vector store interactions. Refer to the Observability guide for more information.

### Basic Usage

To enable logging, add the SimpleLoggerAdvisor to the advisor chain when creating your ChatClient. It's recommended to add it toward the end of the chain:

```java
ChatResponse response = ChatClient.create(chatModel).prompt()
        .advisors(new SimpleLoggerAdvisor())
        .user("Tell me a joke?")
        .call()
        .chatResponse();
```

### Configuration

To see the logs, set the logging level for the advisor package to DEBUG:

```properties
logging.level.org.springframework.ai.chat.client.advisor=DEBUG
```

Add this to your application.properties or application.yaml file.

### Custom Logging

You can customize what data from AdvisedRequest and ChatResponse is logged by using the following constructor:

```java
SimpleLoggerAdvisor(
    Function<ChatClientRequest, String> requestToString,
    Function<ChatResponse, String> responseToString,
    int order
)
```

Example usage:

```java
SimpleLoggerAdvisor customLogger = new SimpleLoggerAdvisor(
    request -> "Custom request: " + request.prompt().getUserMessage(),
    response -> "Custom response: " + response.getResult(),
    0
);
```

This allows you to tailor the logged information to your specific needs.

> **Warning**: Be cautious about logging sensitive information in production environments.

## Custom Advisors

You can create custom advisors by implementing the Advisor interface:

```java
public class CustomAdvisor implements Advisor {

    @Override
    public AdvisedRequest adviseRequest(AdvisedRequest request, Map<String, Object> context) {
        // Modify the request before it's sent to the AI model
        String originalUserText = request.userText();
        String enhancedUserText = "Enhanced: " + originalUserText;
        
        return AdvisedRequest.from(request)
            .withUserText(enhancedUserText)
            .build();
    }

    @Override
    public ChatResponse adviseResponse(ChatResponse response, Map<String, Object> context) {
        // Modify the response after it's received from the AI model
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

## Combining Multiple Advisors

You can combine multiple advisors to create sophisticated AI interactions:

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

## Next Steps

- Learn about [Chat Memory](../chat-memory/) for conversation management
- Explore [RAG](../rag/) for document-based question answering
- Check out [Observability](../observability/) for monitoring AI interactions
