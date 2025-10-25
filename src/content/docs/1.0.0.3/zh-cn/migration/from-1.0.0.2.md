---
title: 从 1.0.0.2 迁移到 1.0.0.3
keywords: ["Spring AI Alibaba", "迁移指南", "版本升级", "1.0.0.2", "1.0.0.3"]
description: "详细的迁移指南，帮助您从 Spring AI Alibaba 1.0.0.2 版本升级到 1.0.0.3 版本。"
---

## 概述

Spring AI Alibaba 1.0.0.3 版本带来了许多新功能和改进，同时也包含了一些破坏性变更。本指南将帮助您顺利从 1.0.0.2 版本迁移到 1.0.0.3 版本。

## 主要变更

### 1. 依赖版本更新

```xml
<!-- 旧版本 (1.0.0.2) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0.2</version>
</dependency>

<!-- 新版本 (1.0.0.3) -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0.3</version>
</dependency>
```

### 2. Spring AI 核心版本升级

Spring AI Alibaba 1.0.0.3 基于最新的 Spring AI 核心版本构建，带来了以下变更：

- ChatClient API 的改进
- 新的 Advisor 架构
- 增强的观测性支持
- 改进的错误处理机制

## 破坏性变更

### 1. ChatClient API 变更

#### 旧版本 API

```java
// 1.0.0.2 版本
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

#### 新版本 API

```java
// 1.0.0.3 版本
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

### 2. 配置属性变更

#### 旧版本配置

```yaml
# 1.0.0.2 版本
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus
        options:
          temperature: 0.7
```

#### 新版本配置

```yaml
# 1.0.0.3 版本
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-plus
          temperature: 0.7
```

### 3. Function Calling 迁移到 Tool Calling

#### 旧版本 Function Calling

```java
// 1.0.0.2 版本
@Component
public class WeatherFunction implements Function<WeatherRequest, WeatherResponse> {
    
    @Override
    public WeatherResponse apply(WeatherRequest request) {
        // 获取天气信息
        return getWeatherInfo(request.getCity());
    }
}

// 使用
String response = ChatClient.create(chatModel)
    .prompt("今天北京天气怎么样？")
    .functions("weatherFunction")
    .call()
    .content();
```

#### 新版本 Tool Calling

```java
// 1.0.0.3 版本
@Component
public class WeatherTools {
    
    @Tool("获取指定城市的天气信息")
    public WeatherResponse getWeather(
        @ToolParam(description = "城市名称") String city) {
        // 获取天气信息
        return getWeatherInfo(city);
    }
}

// 使用
String response = chatClient.prompt()
    .user("今天北京天气怎么样？")
    .tools(weatherTools)
    .call()
    .content();
```

## 迁移步骤

### 步骤 1：更新依赖

1. 更新 `pom.xml` 或 `build.gradle` 中的版本号
2. 刷新依赖

```bash
# Maven
mvn clean compile

# Gradle
./gradlew clean build
```

### 步骤 2：更新配置文件

1. 检查并更新 `application.yml` 或 `application.properties`
2. 移除已废弃的配置项
3. 添加新的配置项

```yaml
# 新增的配置项
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

### 步骤 3：更新代码

#### 3.1 更新 ChatClient 使用方式

```java
// 旧版本
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

// 新版本
@Service
public class ChatService {
    
    private final ChatClient chatClient;
    
    public ChatService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
            .defaultSystem("你是一个有用的助手")
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

#### 3.2 迁移 Function 到 Tool

```java
// 旧版本 Function
@Component
public class CalculatorFunction implements Function<CalculationRequest, CalculationResult> {
    
    @Override
    public CalculationResult apply(CalculationRequest request) {
        double result = evaluate(request.getExpression());
        return new CalculationResult(result);
    }
}

// 新版本 Tool
@Component
public class CalculatorTool {
    
    @Tool("执行数学计算")
    public CalculationResult calculate(
        @ToolParam(description = "数学表达式") String expression) {
        double result = evaluate(expression);
        return new CalculationResult(result);
    }
}
```

#### 3.3 更新 RAG 实现

```java
// 旧版本 RAG
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
            .system("基于以下上下文回答问题：\n" + context)
            .user(query)
            .call()
            .content();
    }
}

// 新版本 RAG
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

### 步骤 4：测试验证

1. 运行单元测试
2. 进行集成测试
3. 验证功能完整性

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
            .user("计算 2 + 3")
            .tools("calculatorTool")
            .call()
            .content();
        
        assertThat(response).contains("5");
    }
}
```

## 新功能使用

### 1. 增强的观测性

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

### 2. 改进的错误处理

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

### 3. 新的 Advisor 架构

```java
@Component
public class CustomAdvisor implements RequestResponseAdvisor {
    
    @Override
    public AdvisedRequest adviseRequest(AdvisedRequest request, Map<String, Object> context) {
        // 请求预处理
        return request;
    }
    
    @Override
    public ChatResponse adviseResponse(ChatResponse response, Map<String, Object> context) {
        // 响应后处理
        return response;
    }
}
```

## 常见问题

### Q1: 编译错误：找不到 ChatClient.create 方法

**问题**：升级后出现编译错误，提示找不到 `ChatClient.create` 方法。

**解决方案**：使用依赖注入的方式获取 ChatClient 实例：

```java
// 错误的方式
ChatClient client = ChatClient.create(chatModel);

// 正确的方式
@Autowired
private ChatClient chatClient;
```

### Q2: Function 不工作了

**问题**：原来的 Function 调用不再工作。

**解决方案**：迁移到新的 Tool Calling API：

```java
// 旧版本
.functions("myFunction")

// 新版本
.tools("myTool")
```

### Q3: 配置属性不生效

**问题**：原来的配置属性不再生效。

**解决方案**：检查并更新配置属性结构：

```yaml
# 旧版本
spring.ai.dashscope.chat.model: qwen-plus

# 新版本
spring.ai.dashscope.chat.options.model: qwen-plus
```

### Q4: RAG 性能下降

**问题**：升级后 RAG 查询性能下降。

**解决方案**：使用新的 Advisor 架构优化性能：

```java
// 使用 QuestionAnswerAdvisor
.advisors(new QuestionAnswerAdvisor(vectorStore, searchRequest))

// 或使用 RetrievalAugmentationAdvisor
.advisors(RetrievalAugmentationAdvisor.builder()
    .documentRetriever(retriever)
    .build())
```

## 性能优化建议

### 1. 使用连接池

```yaml
spring:
  ai:
    dashscope:
      connection:
        pool-size: 10
        timeout: 30s
```

### 2. 启用缓存

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

### 3. 优化批处理

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

## 总结

Spring AI Alibaba 1.0.0.3 版本带来了许多改进和新功能。虽然存在一些破坏性变更，但通过本迁移指南，您可以顺利完成升级。

主要迁移要点：
- 更新依赖版本
- 使用新的 ChatClient API
- 迁移 Function 到 Tool
- 更新配置属性
- 利用新的 Advisor 架构
- 启用增强的观测性功能

建议在迁移过程中：
1. 逐步迁移，分模块进行
2. 充分测试每个功能点
3. 关注性能变化
4. 利用新功能提升应用质量
