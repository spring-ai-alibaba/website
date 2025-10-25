---
title: Defaults and Configuration
keywords: ["Spring AI", "Configuration", "Defaults", "ChatClient Builder", "System Prompts", "Options"]
description: "Learn how to configure ChatClient with defaults and advanced configuration options"
---

# Defaults and Configuration

*This content is referenced from Spring AI documentation*

Creating a ChatClient with default configurations in an @Configuration class simplifies runtime code. By setting defaults, you only need to specify the user text when calling ChatClient, eliminating the need to set system text and other options for each request.

## Default System Text

In the following example, we will configure the system text to always reply in a pirate's voice. To avoid repeating the system text in runtime code, we will create a ChatClient instance in a @Configuration class.

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("You are a friendly chat bot that answers question in the voice of a Pirate")
                .build();
    }
}
```

and a @RestController to invoke it:

```java
@RestController
class AIController {

    private final ChatClient chatClient;

    AIController(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @GetMapping("/ai/simple")
    public Map<String, String> completion(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("completion", this.chatClient.prompt().user(message).call().content());
    }
}
```

When calling the application endpoint via curl, the result is:

```bash
❯ curl localhost:8080/ai/simple
{"completion":"Why did the pirate go to the comedy club? To hear some arrr-rated jokes! Arrr, matey!"}
```

## Default System Text with Parameters

In the following example, we will use a placeholder in the system text to specify the voice of the completion at runtime instead of design time.

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("You are a friendly chat bot that answers question in the voice of a {voice}")
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
    Map<String, String> completion(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message, String voice) {
        return Map.of("completion",
                this.chatClient.prompt()
                        .system(sp -> sp.param("voice", voice))
                        .user(message)
                        .call()
                        .content());
    }
}
```

When calling the application endpoint via httpie, the result is:

```bash
http localhost:8080/ai voice=='Robert DeNiro'
{
    "completion": "You talkin' to me? Okay, here's a joke for ya: Why couldn't the bicycle stand up by itself? Because it was two tired! Classic, right?"
}
```

## Other Defaults

At the ChatClient.Builder level, you can specify the default prompt configuration.

### Default Options

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

### Default Functions

```java
@Configuration
public class FunctionConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultFunction("getCurrentWeather", "Get current weather", this::getCurrentWeather)
            .defaultFunctions("timeFunction", "calculatorFunction")
            .build();
    }

    private WeatherResponse getCurrentWeather(WeatherRequest request) {
        // Implementation
        return new WeatherResponse(request.location(), 22.0, "Sunny");
    }
}
```

### Default User Text

```java
@Configuration
public class UserDefaultsConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultUser("Please provide a helpful and detailed response.")
            .defaultUser(u -> u
                .text("Context: {context}")
                .param("context", "You are an expert assistant"))
            .build();
    }
}
```

### Default Advisors

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

## Runtime Overrides

You can override these defaults at runtime using the corresponding methods without the default prefix:

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
                .temperature(0.9)  // Override default temperature
                .build())
            .system("You are a creative writer")  // Override default system
            .user(userMessage)
            .functions("specialFunction")  // Override default functions
            .call()
            .content();
    }
}
```

## Model-Specific Options

### OpenAI Options

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

### Anthropic Options

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

## Template Renderer Configuration

### Custom Template Renderer

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
            .defaultSystem("You are a helpful assistant named <name>")
            .build();
    }
}
```

### No-Op Template Renderer

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

## Environment-Specific Configuration

### Development Configuration

```java
@Configuration
@Profile("dev")
public class DevChatConfig {

    @Bean
    public ChatClient devChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(0.9)  // More creative for development
                .build())
            .defaultAdvisors(new SimpleLoggerAdvisor())  // Enable logging
            .build();
    }
}
```

### Production Configuration

```java
@Configuration
@Profile("prod")
public class ProdChatConfig {

    @Bean
    public ChatClient prodChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder()
                .temperature(0.3)  // More deterministic for production
                .maxTokens(500)    // Limit token usage
                .build())
            .build();
    }
}
```

## Configuration Properties

### Application Properties

```properties
# Model configuration
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4
spring.ai.openai.chat.options.temperature=0.7
spring.ai.openai.chat.options.max-tokens=1000

# ChatClient configuration
spring.ai.chat.client.enabled=true

# Observability
management.tracing.enabled=true
management.metrics.export.prometheus.enabled=true
```

### YAML Configuration

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

## Conditional Configuration

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

## Best Practices

### 1. Separation of Concerns

```java
@Configuration
public class ChatClientConfiguration {

    @Bean
    @Primary
    public ChatClient defaultChatClient(ChatClient.Builder builder) {
        return builder
            .defaultSystem("You are a helpful assistant")
            .build();
    }

    @Bean
    @Qualifier("creative")
    public ChatClient creativeChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder().temperature(0.9).build())
            .defaultSystem("You are a creative writing assistant")
            .build();
    }

    @Bean
    @Qualifier("analytical")
    public ChatClient analyticalChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(ChatOptions.builder().temperature(0.1).build())
            .defaultSystem("You are an analytical assistant focused on facts and data")
            .build();
    }
}
```

### 2. Configuration Validation

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

## Next Steps

- Learn about [Chat Client API](../chat-client/) for basic usage
- Explore [Advisors](../advisors/) for enhanced functionality
- Check out [Streaming](../streaming/) for real-time responses
