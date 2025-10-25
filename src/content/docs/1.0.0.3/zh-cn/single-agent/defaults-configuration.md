---
title: 默认配置 (Defaults and Configuration)
keywords: ["Spring AI", "Configuration", "Defaults", "ChatClient Builder", "System Prompts", "Options"]
description: "学习如何使用默认配置和高级配置选项配置 ChatClient"
---

# 默认配置 (Defaults and Configuration)

*本内容参考自 Spring AI 官方文档*

在 @Configuration 类中创建具有默认配置的 ChatClient 可以简化运行时代码。通过设置默认值，您在调用 ChatClient 时只需指定用户文本，无需为每个请求设置系统文本和其他选项。

## 默认系统文本

在以下示例中，我们将配置系统文本始终以海盗的声音回复。为了避免在运行时代码中重复系统文本，我们将在 @Configuration 类中创建一个 ChatClient 实例。

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("你是一个友好的聊天机器人，用海盗的声音回答问题")
                .build();
    }
}
```

和一个 @RestController 来调用它：

```java
@RestController
class AIController {

    private final ChatClient chatClient;

    AIController(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @GetMapping("/ai/simple")
    public Map<String, String> completion(@RequestParam(value = "message", defaultValue = "告诉我一个笑话") String message) {
        return Map.of("completion", this.chatClient.prompt().user(message).call().content());
    }
}
```

当通过 curl 调用应用程序端点时，结果是：

```bash
❯ curl localhost:8080/ai/simple
{"completion":"为什么海盗去喜剧俱乐部？为了听一些 arrr 级笑话！Arrr，伙计！"}
```

## 带参数的默认系统文本

在以下示例中，我们将在系统文本中使用占位符，在运行时而不是设计时指定完成的声音。

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("你是一个友好的聊天机器人，用 {voice} 的声音回答问题")
                .build();
    }
}
```

```java
@RestController
class AIController {
    private final ChatClient chatClient;

    AIController(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @GetMapping("/ai")
    Map<String, String> completion(@RequestParam(value = "message", defaultValue = "告诉我一个笑话") String message, String voice) {
        return Map.of("completion",
                this.chatClient.prompt()
                        .system(sp -> sp.param("voice", voice))
                        .user(message)
                        .call()
                        .content());
    }
}
```

当通过 httpie 调用应用程序端点时，结果是：

```bash
http localhost:8080/ai voice=='罗伯特·德尼罗'
{
    "completion": "你在跟我说话吗？好吧，这里有个笑话：为什么自行车不能自己站立？因为它太累了！经典，对吧？"
}
```

## 其他默认值

在 ChatClient.Builder 级别，您可以指定默认提示词配置。

### 默认选项

```java
@Configuration
public class ChatClientConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(0.7)
                .maxTokens(1000)
                .build())
            .build();
    }
}
```

### 默认函数

```java
@Configuration
public class FunctionConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultFunction("getCurrentWeather", "获取当前天气", this::getCurrentWeather)
            .defaultFunctions("timeFunction", "calculatorFunction")
            .build();
    }

    private WeatherResponse getCurrentWeather(WeatherRequest request) {
        // 实现
        return new WeatherResponse(request.location(), 22.0, "晴天");
    }
}
```

### 默认用户文本

```java
@Configuration
public class UserDefaultsConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultUser("请提供有用且详细的响应。")
            .defaultUser(u -> u
                .text("上下文：{context}")
                .param("context", "您是专家助手"))
            .build();
    }
}
```

### 默认 Advisors

```java
@Configuration
public class AdvisorConfig {

    @Bean
    public ChatClient chatClient(
            ChatClient.Builder builder,
            VectorStore vectorStore,
            ChatMemory chatMemory) {
        
        return builder
            .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(chatMemory).build(),
                QuestionAnswerAdvisor.builder(vectorStore).build()
            )
            .build();
    }
}
```

## 运行时覆盖

您可以在运行时使用不带 default 前缀的相应方法覆盖这些默认值：

```java
@Service
public class FlexibleChatService {

    private final ChatClient chatClient;

    public FlexibleChatService(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    public String chatWithOverrides(String userMessage) {
        return chatClient.prompt()
            .options(ChatOptions.builder()
                .temperature(0.9)  // 覆盖默认温度
                .build())
            .system("你是一个创意作家")  // 覆盖默认系统
            .user(userMessage)
            .functions("specialFunction")  // 覆盖默认函数
            .call()
            .content();
    }
}
```

## 模型特定选项

### OpenAI 选项

```java
@Configuration
public class OpenAIConfig {

    @Bean
    public ChatClient openAiChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(OpenAiChatOptions.builder()
                .model("gpt-4")
                .temperature(0.7)
                .maxTokens(2000)
                .topP(0.9)
                .frequencyPenalty(0.0)
                .presencePenalty(0.0)
                .build())
            .build();
    }
}
```

### Anthropic 选项

```java
@Configuration
public class AnthropicConfig {

    @Bean
    public ChatClient anthropicChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(AnthropicChatOptions.builder()
                .model("claude-3-sonnet-20240229")
                .temperature(0.7)
                .maxTokens(1500)
                .topP(0.9)
                .build())
            .build();
    }
}
```

## 模板渲染器配置

### 自定义模板渲染器

```java
@Configuration
public class TemplateConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .templateRenderer(StTemplateRenderer.builder()
                .startDelimiterToken('<')
                .endDelimiterToken('>')
                .build())
            .defaultSystem("你是一个名为 <name> 的有用助手")
            .build();
    }
}
```

### 无操作模板渲染器

```java
@Configuration
public class NoTemplateConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .templateRenderer(new NoOpTemplateRenderer())
            .build();
    }
}
```

## 环境特定配置

### 开发配置

```java
@Configuration
@Profile("dev")
public class DevChatConfig {

    @Bean
    public ChatClient devChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(0.9)  // 开发时更有创意
                .build())
            .defaultAdvisors(new SimpleLoggerAdvisor())  // 启用日志记录
            .build();
    }
}
```

### 生产配置

```java
@Configuration
@Profile("prod")
public class ProdChatConfig {

    @Bean
    public ChatClient prodChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(0.3)  // 生产时更确定性
                .maxTokens(500)    // 限制令牌使用
                .build())
            .build();
    }
}
```

## 配置属性

### Application Properties

```properties
# 模型配置
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4
spring.ai.openai.chat.options.temperature=0.7
spring.ai.openai.chat.options.max-tokens=1000

# ChatClient 配置
spring.ai.chat.client.enabled=true

# 可观测性
management.tracing.enabled=true
management.metrics.export.prometheus.enabled=true
```

### YAML 配置

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4
          temperature: 0.7
          max-tokens: 1000
    chat:
      client:
        enabled: true

management:
  tracing:
    enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

## 条件配置

```java
@Configuration
public class ConditionalConfig {

    @Bean
    @ConditionalOnProperty(name = "app.ai.rag.enabled", havingValue = "true")
    public ChatClient ragEnabledChatClient(
            ChatClient.Builder builder,
            VectorStore vectorStore) {
        
        return builder
            .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore).build())
            .build();
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.rag.enabled", havingValue = "false", matchIfMissing = true)
    public ChatClient simpleChatClient(ChatClient.Builder builder) {
        return builder.build();
    }
}
```

## 最佳实践

### 1. 关注点分离

```java
@Configuration
public class ChatClientConfiguration {

    @Bean
    @Primary
    public ChatClient defaultChatClient(ChatClient.Builder builder) {
        return builder
            .defaultSystem("你是一个有用的助手")
            .build();
    }

    @Bean
    @Qualifier("creative")
    public ChatClient creativeChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder().temperature(0.9).build())
            .defaultSystem("你是一个创意写作助手")
            .build();
    }

    @Bean
    @Qualifier("analytical")
    public ChatClient analyticalChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder().temperature(0.1).build())
            .defaultSystem("你是一个专注于事实和数据的分析助手")
            .build();
    }
}
```

### 2. 配置验证

```java
@Configuration
@Validated
public class ValidatedChatConfig {

    @Bean
    public ChatClient chatClient(
            ChatClient.Builder builder,
            @Value("${app.ai.temperature:0.7}") @DecimalMin("0.0") @DecimalMax("2.0") double temperature,
            @Value("${app.ai.max-tokens:1000}") @Min(1) @Max(4000) int maxTokens) {
        
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build())
            .build();
    }
}
```

## 下一步

- 学习 [Chat Client API](../chat-client/) 进行基本使用
- 探索 [Advisors](../advisors/) 进行增强功能
- 查看 [Streaming](../streaming/) 进行实时响应
