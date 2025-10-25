---
title: Migrating from 1.0.0.2 to 1.0.0.3
keywords: ["Spring AI Alibaba", "Migration Guide", "Version Upgrade", "1.0.0.2", "1.0.0.3"]
description: "Detailed migration guide to help you upgrade from Spring AI Alibaba 1.0.0.2 to 1.0.0.3."
---

## Overview

Spring AI Alibaba 1.0.0.3 brings many new features and improvements, along with some breaking changes. This guide will help you smoothly migrate from version 1.0.0.2 to 1.0.0.3.

## Major Changes

### 1. Dependency Version Updates

```xml
<!-- Old version (1.0.0.2) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0.2</version>
</dependency>

<!-- New version (1.0.0.3) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0.3</version>
</dependency>
```

### 2. Spring AI Core Version Upgrade

Spring AI Alibaba 1.0.0.3 is built on the latest Spring AI core version, bringing the following changes:

- Improved ChatClient API
- New Advisor architecture
- Enhanced observability support
- Improved error handling mechanisms

## Breaking Changes

### 1. ChatClient API Changes

#### Old Version API

```java
// 1.0.0.2 version
@Service
public class OldChatService {
    
    private final ChatModel chatModel;
    
    public String chat(String message) {
        return ChatClient.create(chatModel)
            .prompt()
            .user(message)
            .call()
            .content();
    }
}
```

#### New Version API

```java
// 1.0.0.3 version
@Service
public class NewChatService {
    
    private final ChatClient chatClient;
    
    public NewChatService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }
    
    public String chat(String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }
}
```

### 2. Configuration Property Changes

#### Old Version Configuration

```yaml
# 1.0.0.2 version
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus
        options:
          temperature: 0.7
```

#### New Version Configuration

```yaml
# 1.0.0.3 version
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-plus
          temperature: 0.7
```

### 3. Function Calling Migration to Tool Calling

#### Old Version Function Calling

```java
// 1.0.0.2 version
@Component
public class WeatherFunction implements Function<WeatherRequest, WeatherResponse> {
    
    @Override
    public WeatherResponse apply(WeatherRequest request) {
        // Get weather information
        return getWeatherInfo(request.getCity());
    }
}

// Usage
String response = ChatClient.create(chatModel)
    .prompt("What's the weather like in Beijing today?")
    .functions("weatherFunction")
    .call()
    .content();
```

#### New Version Tool Calling

```java
// 1.0.0.3 version
@Component
public class WeatherTools {
    
    @Tool("Get weather information for specified city")
    public WeatherResponse getWeather(
        @ToolParam(description = "City name") String city) {
        // Get weather information
        return getWeatherInfo(city);
    }
}

// Usage
String response = chatClient.prompt()
    .user("What's the weather like in Beijing today?")
    .tools(weatherTools)
    .call()
    .content();
```

## Migration Steps

### Step 1: Update Dependencies

1. Update version numbers in `pom.xml` or `build.gradle`
2. Refresh dependencies

```bash
# Maven
mvn clean compile

# Gradle
./gradlew clean build
```

### Step 2: Update Configuration Files

1. Check and update `application.yml` or `application.properties`
2. Remove deprecated configuration items
3. Add new configuration items

```yaml
# New configuration items
spring:
  ai:
    alibaba:
      observability:
        enabled: true
      retry:
        max-attempts: 3
        backoff:
          initial-interval: 1000
          multiplier: 2.0
```

### Step 3: Update Code

#### 3.1 Update ChatClient Usage

```java
// Old version
@Service
public class ChatService {
    
    private final ChatModel chatModel;
    
    public String chat(String message) {
        return ChatClient.create(chatModel)
            .prompt()
            .user(message)
            .call()
            .content();
    }
}

// New version
@Service
public class ChatService {
    
    private final ChatClient chatClient;
    
    public ChatService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
            .defaultSystem("You are a helpful assistant")
            .build();
    }
    
    public String chat(String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }
}
```

#### 3.2 Migrate Function to Tool

```java
// Old version Function
@Component
public class CalculatorFunction implements Function<CalculationRequest, CalculationResult> {
    
    @Override
    public CalculationResult apply(CalculationRequest request) {
        double result = evaluate(request.getExpression());
        return new CalculationResult(result);
    }
}

// New version Tool
@Component
public class CalculatorTool {
    
    @Tool("Perform mathematical calculations")
    public CalculationResult calculate(
        @ToolParam(description = "Mathematical expression") String expression) {
        double result = evaluate(expression);
        return new CalculationResult(result);
    }
}
```

#### 3.3 Update RAG Implementation

```java
// Old version RAG
@Service
public class OldRAGService {
    
    private final ChatModel chatModel;
    private final VectorStore vectorStore;
    
    public String search(String query) {
        List<Document> documents = vectorStore.similaritySearch(query);
        String context = documents.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\n"));
        
        return ChatClient.create(chatModel)
            .prompt()
            .system("Answer the question based on the following context:\n" + context)
            .user(query)
            .call()
            .content();
    }
}

// New version RAG
@Service
public class NewRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    
    public String search(String query) {
        return chatClient.prompt()
            .user(query)
            .advisors(new QuestionAnswerAdvisor(vectorStore))
            .call()
            .content();
    }
}
```

### Step 4: Test and Validate

1. Run unit tests
2. Perform integration tests
3. Verify functionality completeness

```java
@SpringBootTest
public class MigrationTest {
    
    @Autowired
    private ChatClient chatClient;
    
    @Test
    public void testBasicChat() {
        String response = chatClient.prompt()
            .user("Hello")
            .call()
            .content();
        
        assertThat(response).isNotEmpty();
    }
    
    @Test
    public void testToolCalling() {
        String response = chatClient.prompt()
            .user("Calculate 2 + 3")
            .tools("calculatorTool")
            .call()
            .content();
        
        assertThat(response).contains("5");
    }
}
```

## New Feature Usage

### 1. Enhanced Observability

```java
@Configuration
public class ObservabilityConfig {
    
    @Bean
    public ChatClientCustomizer observabilityCustomizer() {
        return builder -> builder
            .defaultAdvisors(new ObservationAdvisor())
            .build();
    }
}
```

### 2. Improved Error Handling

```java
@Service
public class RobustChatService {
    
    private final ChatClient chatClient;
    
    public String chatWithRetry(String message) {
        return chatClient.prompt()
            .user(message)
            .advisors(new RetryAdvisor(3, Duration.ofSeconds(1)))
            .call()
            .content();
    }
}
```

### 3. New Advisor Architecture

```java
@Component
public class CustomAdvisor implements RequestResponseAdvisor {
    
    @Override
    public AdvisedRequest adviseRequest(AdvisedRequest request, Map<String, Object> context) {
        // Request preprocessing
        return request;
    }
    
    @Override
    public ChatResponse adviseResponse(ChatResponse response, Map<String, Object> context) {
        // Response post-processing
        return response;
    }
}
```

## Common Issues

### Q1: Compilation Error: ChatClient.create method not found

**Problem**: Compilation error after upgrade, indicating `ChatClient.create` method not found.

**Solution**: Use dependency injection to get ChatClient instance:

```java
// Wrong way
ChatClient client = ChatClient.create(chatModel);

// Correct way
@Autowired
private ChatClient chatClient;
```

### Q2: Functions not working

**Problem**: Original Function calls no longer work.

**Solution**: Migrate to new Tool Calling API:

```java
// Old version
.functions("myFunction")

// New version
.tools("myTool")
```

### Q3: Configuration properties not taking effect

**Problem**: Original configuration properties no longer take effect.

**Solution**: Check and update configuration property structure:

```yaml
# Old version
spring.ai.dashscope.chat.model: qwen-plus

# New version
spring.ai.dashscope.chat.options.model: qwen-plus
```

### Q4: RAG performance degradation

**Problem**: RAG query performance degrades after upgrade.

**Solution**: Use new Advisor architecture to optimize performance:

```java
// Use QuestionAnswerAdvisor
.advisors(new QuestionAnswerAdvisor(vectorStore, searchRequest))

// Or use RetrievalAugmentationAdvisor
.advisors(RetrievalAugmentationAdvisor.builder()
    .documentRetriever(retriever)
    .build())
```

## Performance Optimization Recommendations

### 1. Use Connection Pool

```yaml
spring:
  ai:
    dashscope:
      connection:
        pool-size: 10
        timeout: 30s
```

### 2. Enable Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public ChatClientCustomizer cachingCustomizer() {
        return builder -> builder
            .defaultAdvisors(new CachingAdvisor())
            .build();
    }
}
```

### 3. Optimize Batch Processing

```java
@Service
public class BatchProcessingService {
    
    public List<String> processBatch(List<String> messages) {
        return messages.parallelStream()
            .map(this::processMessage)
            .collect(Collectors.toList());
    }
}
```

## Summary

Spring AI Alibaba 1.0.0.3 brings many improvements and new features. Although there are some breaking changes, you can smoothly complete the upgrade with this migration guide.

Key migration points:
- Update dependency versions
- Use new ChatClient API
- Migrate Functions to Tools
- Update configuration properties
- Leverage new Advisor architecture
- Enable enhanced observability features

Recommendations during migration:
1. Migrate gradually, module by module
2. Thoroughly test each functionality
3. Monitor performance changes
4. Leverage new features to improve application quality
