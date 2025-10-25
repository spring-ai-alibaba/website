---
title: Tool Calling
keywords: ["Spring AI", "Tool Calling", "Function Calling", "External Tools", "API Integration"]
description: "Learn how to integrate external tools and functions with Spring AI using tool calling capabilities."
---

# Tool Calling

*This content is referenced from Spring AI documentation*

Tool Calling (also known as Function Calling) is a powerful feature in Spring AI that allows AI models to interact with external systems, APIs, and functions. This capability enables AI models to perform actions beyond text generation, such as retrieving real-time data, executing calculations, or interacting with databases.

## Overview

Tool calling in Spring AI enables AI models to:
- Call external APIs and services
- Execute custom functions
- Retrieve real-time data
- Perform calculations
- Interact with databases
- Access system resources

The process works as follows:
1. **Function Definition**: Define functions that the AI model can call
2. **Function Registration**: Register functions with the AI model
3. **Model Decision**: AI model decides when to call functions based on user input
4. **Function Execution**: Spring AI executes the function and returns results
5. **Response Generation**: AI model uses function results to generate final response

## Core Concepts

### Function Interface

In Spring AI, tools are implemented as Java functions using the standard `java.util.function.Function` interface:

```java
public interface Function<T, R> {
    R apply(T t);
}
```

### Function Registration

Functions can be registered with ChatClient in several ways:

```java
// Method 1: Using function bean names
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunctions("weatherFunction", "timeFunction")
    .build();

// Method 2: Using function instances
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunction("getCurrentWeather", "Get current weather", weatherFunction)
    .build();

// Method 3: Runtime registration
String response = chatClient.prompt()
    .user("What's the weather like?")
    .functions("weatherFunction")
    .call()
    .content();
```

## Basic Tool Implementation

### Simple Function Tool

```java
@Component("weatherFunction")
@Description("Get the current weather for a given location")
public class WeatherFunction implements Function<WeatherFunction.Request, WeatherFunction.Response> {

    public record Request(
        @JsonPropertyDescription("The city and state, e.g. San Francisco, CA")
        String location,
        @JsonPropertyDescription("Temperature unit")
        Unit unit
    ) {}

    public record Response(double temperature, Unit unit, String description) {}

    public enum Unit { CELSIUS, FAHRENHEIT }

    @Override
    public Response apply(Request request) {
        // Simulate weather API call
        double temperature = request.unit == Unit.CELSIUS ? 20.0 : 68.0;
        return new Response(temperature, request.unit, "Sunny");
    }
}
```

### Usage with ChatClient

```java
@Service
public class WeatherService {

    private final ChatClient chatClient;

    public WeatherService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultFunctions("weatherFunction")
            .build();
    }

    public String getWeatherInfo(String userQuery) {
        return chatClient.prompt()
            .user(userQuery)
            .call()
            .content();
    }
}

// Example usage:
// weatherService.getWeatherInfo("What's the weather like in San Francisco?")
// The AI will automatically call the weatherFunction and use the result
```

### Function with External API

```java
@Component("newsFunction")
@Description("Get latest news articles")
public class NewsFunction implements Function<NewsFunction.Request, NewsFunction.Response> {

    private final RestTemplate restTemplate;
    private final String apiKey;

    public NewsFunction(RestTemplate restTemplate, @Value("${news.api.key}") String apiKey) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
    }

    public record Request(
        @JsonPropertyDescription("News category (technology, business, sports, etc.)")
        String category,
        @JsonPropertyDescription("Number of articles to retrieve (max 10)")
        int limit
    ) {}

    public record Response(List<Article> articles) {}

    public record Article(String title, String description, String url) {}

    @Override
    public Response apply(Request request) {
        try {
            String url = String.format(
                "https://newsapi.org/v2/top-headlines?category=%s&pageSize=%d&apiKey=%s",
                request.category(),
                Math.min(request.limit(), 10),
                apiKey
            );

            NewsApiResponse apiResponse = restTemplate.getForObject(url, NewsApiResponse.class);

            List<Article> articles = apiResponse.articles().stream()
                .map(a -> new Article(a.title(), a.description(), a.url()))
                .collect(Collectors.toList());

            return new Response(articles);
        } catch (Exception e) {
            return new Response(List.of(
                new Article("Error", "Failed to fetch news: " + e.getMessage(), "")
            ));
        }
    }

    // Helper record for API response
    private record NewsApiResponse(List<NewsArticle> articles) {}
    private record NewsArticle(String title, String description, String url) {}
}
```

## Advanced Tool Features

### Multiple Tool Integration

```java
@Service
public class MultiToolService {

    private final ChatClient chatClient;

    public MultiToolService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultFunctions("weatherFunction", "newsFunction", "calculatorFunction")
            .build();
    }

    public String handleComplexQuery(String userQuery) {
        return chatClient.prompt()
            .user(userQuery)
            .call()
            .content();
    }
}

// Example: "What's the weather in New York and show me the latest tech news?"
// The AI will automatically call both weatherFunction and newsFunction
```

### Database Query Tool

```java
@Component("userQueryFunction")
@Description("Query user information from database")
public class UserQueryFunction implements Function<UserQueryFunction.Request, UserQueryFunction.Response> {

    private final UserRepository userRepository;

    public UserQueryFunction(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record Request(
        @JsonPropertyDescription("The user ID to query")
        Long userId
    ) {}

    public record Response(String name, String email, String status, String message) {}

    @Override
    public Response apply(Request request) {
        try {
            User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new RuntimeException("User not found"));

            return new Response(
                user.getName(),
                user.getEmail(),
                user.getStatus(),
                "User found successfully"
            );
        } catch (Exception e) {
            return new Response(null, null, null, "Error: " + e.getMessage());
        }
    }
}
```

### Calculator Tool

```java
@Component("calculatorFunction")
@Description("Perform mathematical calculations")
public class CalculatorFunction implements Function<CalculatorFunction.Request, CalculatorFunction.Response> {

    public record Request(
        @JsonPropertyDescription("Mathematical expression to evaluate (e.g., '2 + 3 * 4')")
        String expression
    ) {}

    public record Response(String expression, double result, boolean success, String message) {}

    @Override
    public Response apply(Request request) {
        try {
            // Simple expression evaluator (use a proper library like exp4j in production)
            double result = evaluateExpression(request.expression());

            return new Response(
                request.expression(),
                result,
                true,
                "Calculation successful"
            );
        } catch (Exception e) {
            return new Response(
                request.expression(),
                0.0,
                false,
                "Error: " + e.getMessage()
            );
        }
    }

    private double evaluateExpression(String expression) {
        // Implement safe expression evaluation
        // For production, use libraries like exp4j or similar

        // Simple example for basic operations
        if (expression.contains("+")) {
            String[] parts = expression.split("\\+");
            return Double.parseDouble(parts[0].trim()) + Double.parseDouble(parts[1].trim());
        }
        // Add more operations as needed

        return Double.parseDouble(expression.trim());
    }
}
```

## Configuration and Registration

### Function Configuration

```java
@Configuration
public class FunctionConfiguration {

    @Bean
    public ChatClient functionEnabledChatClient(
            ChatModel chatModel,
            WeatherFunction weatherFunction,
            NewsFunction newsFunction,
            CalculatorFunction calculatorFunction) {

        return ChatClient.builder(chatModel)
            .defaultSystem("""
                You are a helpful assistant with access to various tools and functions.
                Use the available functions when needed to provide accurate and up-to-date information.
                Always explain what functions you're using and why.
                """)
            .defaultFunctions("weatherFunction", "newsFunction", "calculatorFunction")
            .build();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### Dynamic Function Registration

```java
@Service
public class DynamicFunctionService {

    private final ChatClient.Builder chatClientBuilder;
    private final Map<String, Function<?, ?>> availableFunctions;

    public DynamicFunctionService(ChatClient.Builder builder) {
        this.chatClientBuilder = builder;
        this.availableFunctions = new HashMap<>();
        initializeFunctions();
    }

    private void initializeFunctions() {
        availableFunctions.put("weather", new WeatherFunction());
        availableFunctions.put("calculator", new CalculatorFunction());
        availableFunctions.put("news", new NewsFunction(new RestTemplate(), "api-key"));
    }

    public String processWithSelectedFunctions(String userQuery, List<String> enabledFunctions) {
        ChatClient chatClient = chatClientBuilder
            .defaultFunctions(enabledFunctions.toArray(String[]::new))
            .build();

        return chatClient.prompt()
            .user(userQuery)
            .call()
            .content();
    }
}
```

## Error Handling and Security

### Safe Function Implementation

```java
@Component("safeCalculatorFunction")
@Description("Perform safe mathematical calculations")
public class SafeCalculatorFunction implements Function<SafeCalculatorFunction.Request, SafeCalculatorFunction.Response> {

    private static final Logger logger = LoggerFactory.getLogger(SafeCalculatorFunction.class);
    private static final int MAX_EXPRESSION_LENGTH = 100;

    public record Request(String expression) {}
    public record Response(boolean success, Double result, String message) {}

    @Override
    public Response apply(Request request) {
        try {
            validateExpression(request.expression());
            double result = evaluateExpression(request.expression());

            logger.info("Successfully calculated: {} = {}", request.expression(), result);
            return new Response(true, result, "Calculation successful");

        } catch (IllegalArgumentException e) {
            logger.warn("Invalid expression: {}", request.expression());
            return new Response(false, null, "Invalid expression: " + e.getMessage());

        } catch (Exception e) {
            logger.error("Calculation error for expression: {}", request.expression(), e);
            return new Response(false, null, "Calculation failed: " + e.getMessage());
        }
    }

    private void validateExpression(String expression) {
        if (expression == null || expression.trim().isEmpty()) {
            throw new IllegalArgumentException("Expression cannot be empty");
        }

        if (expression.length() > MAX_EXPRESSION_LENGTH) {
            throw new IllegalArgumentException("Expression too long");
        }

        // Check for dangerous operations
        String[] dangerousPatterns = {"System", "Runtime", "Process", "File", "Class"};
        for (String pattern : dangerousPatterns) {
            if (expression.contains(pattern)) {
                throw new IllegalArgumentException("Unsafe expression detected");
            }
        }
    }

    private double evaluateExpression(String expression) {
        // Implement safe expression evaluation
        // Use a proper math expression library in production
        return 0.0; // Placeholder
    }
}
```

### Access Control

```java
@Component("secureUserQueryFunction")
@Description("Query user information with access control")
public class SecureUserQueryFunction implements Function<SecureUserQueryFunction.Request, SecureUserQueryFunction.Response> {

    private final UserRepository userRepository;
    private final SecurityService securityService;

    public SecureUserQueryFunction(UserRepository userRepository, SecurityService securityService) {
        this.userRepository = userRepository;
        this.securityService = securityService;
    }

    public record Request(
        @JsonPropertyDescription("The user ID to query")
        Long userId,
        @JsonPropertyDescription("The ID of the user making the request")
        String requesterId
    ) {}

    public record Response(boolean authorized, String name, String email, String message) {}

    @Override
    public Response apply(Request request) {
        try {
            // Check authorization
            if (!securityService.canAccessUser(request.requesterId(), request.userId())) {
                return new Response(false, null, null, "Access denied");
            }

            User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new RuntimeException("User not found"));

            return new Response(true, user.getName(), user.getEmail(), "User found");

        } catch (Exception e) {
            return new Response(false, null, null, "Error: " + e.getMessage());
        }
    }
}
```

## Testing Functions

### Unit Testing

```java
@ExtendWith(MockitoExtension.class)
class WeatherFunctionTest {

    @Mock
    private WeatherApiClient weatherApiClient;

    @InjectMocks
    private WeatherFunction weatherFunction;

    @Test
    void shouldReturnWeatherInfo() {
        // Given
        WeatherFunction.Request request = new WeatherFunction.Request("San Francisco, CA", WeatherFunction.Unit.CELSIUS);

        // When
        WeatherFunction.Response response = weatherFunction.apply(request);

        // Then
        assertThat(response.temperature()).isEqualTo(20.0);
        assertThat(response.unit()).isEqualTo(WeatherFunction.Unit.CELSIUS);
        assertThat(response.description()).isEqualTo("Sunny");
    }
}
```

### Integration Testing

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.ai.openai.api-key=test-key",
    "news.api.key=test-news-key"
})
class FunctionCallingIntegrationTest {

    @Autowired
    private ChatClient chatClient;

    @Test
    void shouldCallWeatherFunctionAndGenerateResponse() {
        // When
        String response = chatClient.prompt()
            .user("What's the weather like in San Francisco?")
            .functions("weatherFunction")
            .call()
            .content();

        // Then
        assertThat(response).isNotEmpty();
        assertThat(response).containsIgnoringCase("San Francisco");
    }
}
```

## Best Practices

### Function Design Principles

1. **Single Responsibility**: Each function should have a clear, single purpose
2. **Clear Documentation**: Use `@JsonPropertyDescription` for all parameters
3. **Error Handling**: Always handle errors gracefully and return meaningful messages
4. **Validation**: Validate all inputs before processing
5. **Security**: Never expose sensitive operations without proper authorization

### Performance Optimization

```java
@Component("cachedWeatherFunction")
@Description("Get weather with caching")
public class CachedWeatherFunction implements Function<CachedWeatherFunction.Request, CachedWeatherFunction.Response> {

    private final WeatherApiClient weatherApiClient;
    private final Cache<String, WeatherData> weatherCache;

    public CachedWeatherFunction(WeatherApiClient weatherApiClient) {
        this.weatherApiClient = weatherApiClient;
        this.weatherCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .build();
    }

    @Override
    public Response apply(Request request) {
        WeatherData weatherData = weatherCache.get(request.location(),
            location -> weatherApiClient.getWeather(location));

        return new Response(
            weatherData.temperature(),
            request.unit(),
            weatherData.description()
        );
    }
}
```

## Next Steps

- Learn about [Chat Memory](../chat-memory/) for conversation context
- Explore [Multimodality](../multimodality/) for multi-modal tools
- Check out [Structured Output](../structured-output/) for tool response formatting
```
    public String call(String toolInput, ToolContext toolContext) {
        try {
            QueryRequest request = JsonParser.fromJson(toolInput, QueryRequest.class);
            
            // Security check
            if (!isSafeQuery(request.sql())) {
                return "Error: This type of SQL statement is not allowed";
            }
            
            List<Map<String, Object>> results = jdbcTemplate.queryForList(
                request.sql() + " LIMIT " + request.limit()
            );
            
            return JsonParser.toJson(results);
            
        } catch (Exception e) {
            return "Query execution failed: " + e.getMessage();
        }
    }
    
    private boolean isSafeQuery(String sql) {
        String upperSql = sql.toUpperCase().trim();
        return upperSql.startsWith("SELECT") && 
               !upperSql.contains("DELETE") && 
               !upperSql.contains("UPDATE") && 
               !upperSql.contains("INSERT") && 
               !upperSql.contains("DROP");
    }
    
    public record QueryRequest(String sql, Integer limit) {}
}
```

### 2. Functional Tool Definition

```java
@Configuration
public class ToolConfiguration {
    
    @Bean
    public ToolCallback calculatorTool() {
        return FunctionToolCallback.builder("calculator", this::calculate)
            .description("Perform mathematical calculations")
            .inputType(CalculationRequest.class)
            .build();
    }
    
    @Bean
    public ToolCallback translatorTool() {
        return FunctionToolCallback.builder("translator", this::translate)
            .description("Translate text")
            .inputType(TranslationRequest.class)
            .build();
    }
    
    private CalculationResult calculate(CalculationRequest request, ToolContext context) {
        try {
            double result = evaluateExpression(request.expression());
            return new CalculationResult(result, "Calculation successful");
        } catch (Exception e) {
            return new CalculationResult(0, "Calculation error: " + e.getMessage());
        }
    }
    
    private TranslationResult translate(TranslationRequest request, ToolContext context) {
        // Call translation service
        String translatedText = translationService.translate(
            request.text(), 
            request.fromLang(), 
            request.toLang()
        );
        return new TranslationResult(translatedText);
    }
    
    public record CalculationRequest(String expression) {}
    public record CalculationResult(double result, String message) {}
    public record TranslationRequest(String text, String fromLang, String toLang) {}
    public record TranslationResult(String translatedText) {}
}
```

## Built-in Tool Integration

### 1. Weather Tool

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-weather</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    alibaba:
      toolcalling:
        weather:
          enabled: true
          api-key: ${WEATHER_API_KEY}
```

```java
String response = chatClient.prompt()
    .user("What's the weather like in Beijing today?")
    .tools("weatherService")
    .call()
    .content();
```

### 2. Translation Tool

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-alitranslate</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    alibaba:
      toolcalling:
        alitranslate:
          enabled: true
          access-key-id: ${ALITRANSLATE_ACCESS_KEY_ID}
          secret-key: ${ALITRANSLATE_ACCESS_KEY_SECRET}
```

```java
String response = chatClient.prompt()
    .user("Please help me translate 'Thank you for using this product' to English and Japanese")
    .tools("aliTranslateService")
    .call()
    .content();
```

### 3. Time Tool

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-time</artifactId>
</dependency>
```

```java
String response = chatClient.prompt()
    .user("What time is it now?")
    .tools("timeService")
    .call()
    .content();
```

## Tool Context and State Management

### 1. Using ToolContext

```java
@Component
public class SessionAwareTool {
    
    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();
    
    @Tool("Get user information")
    public String getUserInfo(String userId, ToolContext context) {
        String sessionId = (String) context.getContext().get("sessionId");
        UserSession session = sessions.get(sessionId);
        
        if (session == null) {
            return "User session does not exist";
        }
        
        return "User " + userId + " information: " + session.getUserInfo(userId);
    }
    
    @Tool("Update user status")
    public String updateUserStatus(String userId, String status, ToolContext context) {
        String sessionId = (String) context.getContext().get("sessionId");
        UserSession session = sessions.computeIfAbsent(sessionId, k -> new UserSession());
        
        session.updateUserStatus(userId, status);
        return "User status updated";
    }
}
```

### 2. Stateful Tool Calling

```java
@Service
public class StatefulChatService {
    
    private final ChatClient chatClient;
    private final SessionAwareTool sessionTool;
    
    public String chatWithSession(String message, String sessionId) {
        Map<String, Object> toolContext = Map.of("sessionId", sessionId);
        
        return chatClient.prompt()
            .user(message)
            .tools(sessionTool)
            .advisors(advisorSpec -> advisorSpec
                .param("toolContext", toolContext))
            .call()
            .content();
    }
}
```

## Tool Security and Validation

### 1. Input Validation

```java
@Component
public class SecureFileOperationTool {
    
    private final Set<String> allowedPaths = Set.of("/tmp", "/uploads");
    
    @Tool("Read file content")
    public String readFile(@ToolParam(description = "File path") String filePath) {
        // Path validation
        if (!isPathAllowed(filePath)) {
            return "Error: Access to this path is not allowed";
        }
        
        // File existence check
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            return "Error: File does not exist";
        }
        
        try {
            return Files.readString(path);
        } catch (IOException e) {
            return "Error: Failed to read file - " + e.getMessage();
        }
    }
    
    private boolean isPathAllowed(String filePath) {
        Path path = Paths.get(filePath).normalize();
        return allowedPaths.stream()
            .anyMatch(allowed -> path.startsWith(Paths.get(allowed)));
    }
}
```

### 2. Permission Control

```java
@Component
public class PermissionAwareTool {
    
    @Tool("Execute admin operation")
    public String adminOperation(String operation, ToolContext context) {
        String userRole = (String) context.getContext().get("userRole");
        
        if (!"ADMIN".equals(userRole)) {
            return "Error: Insufficient permissions, admin role required";
        }
        
        return executeAdminOperation(operation);
    }
    
    @Tool("Execute user operation")
    public String userOperation(String operation, ToolContext context) {
        String userId = (String) context.getContext().get("userId");
        
        if (userId == null) {
            return "Error: User not authenticated";
        }
        
        return executeUserOperation(operation, userId);
    }
}
```

## Asynchronous and Batch Tool Calling

### 1. Asynchronous Tool Execution

```java
@Component
public class AsyncTool {
    
    private final TaskExecutor taskExecutor;
    
    @Tool("Process task asynchronously")
    public String processAsync(String taskData) {
        String taskId = UUID.randomUUID().toString();
        
        taskExecutor.execute(() -> {
            try {
                // Long-running task
                processLongRunningTask(taskData, taskId);
            } catch (Exception e) {
                log.error("Async task execution failed: {}", taskId, e);
            }
        });
        
        return "Task submitted, task ID: " + taskId;
    }
    
    @Tool("Query task status")
    public String getTaskStatus(String taskId) {
        TaskStatus status = taskStatusService.getStatus(taskId);
        return JsonParser.toJson(status);
    }
}
```

### 2. Batch Operation Tools

```java
@Component
public class BatchOperationTool {
    
    @Tool("Batch process data")
    public String batchProcess(BatchRequest request) {
        List<String> results = new ArrayList<>();
        
        for (String item : request.items()) {
            try {
                String result = processItem(item);
                results.add("Success: " + result);
            } catch (Exception e) {
                results.add("Failed: " + e.getMessage());
            }
        }
        
        return "Batch processing completed, results:\n" + String.join("\n", results);
    }
    
    public record BatchRequest(List<String> items, String operation) {}
}
```

## Tool Calling Monitoring and Debugging

### 1. Tool Call Logging

```java
@Component
public class LoggingToolWrapper implements ToolCallback {
    
    private final ToolCallback delegate;
    private final Logger logger = LoggerFactory.getLogger(LoggingToolWrapper.class);
    
    public LoggingToolWrapper(ToolCallback delegate) {
        this.delegate = delegate;
    }
    
    @Override
    public ToolDefinition getToolDefinition() {
        return delegate.getToolDefinition();
    }
    
    @Override
    public String call(String toolInput, ToolContext toolContext) {
        String toolName = getToolDefinition().name();
        logger.info("Tool call started: {} Input: {}", toolName, toolInput);
        
        long startTime = System.currentTimeMillis();
        try {
            String result = delegate.call(toolInput, toolContext);
            long duration = System.currentTimeMillis() - startTime;
            
            logger.info("Tool call succeeded: {} Duration: {}ms Output: {}", 
                       toolName, duration, result);
            return result;
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Tool call failed: {} Duration: {}ms Error: {}", 
                        toolName, duration, e.getMessage(), e);
            throw e;
        }
    }
}
```

### 2. Tool Performance Monitoring

```java
@Component
public class ToolMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Timer toolCallTimer;
    private final Counter toolCallCounter;
    
    public ToolMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.toolCallTimer = Timer.builder("tool.call.duration")
            .description("Tool call duration")
            .register(meterRegistry);
        this.toolCallCounter = Counter.builder("tool.call.count")
            .description("Tool call count")
            .register(meterRegistry);
    }
    
    public String timedToolCall(ToolCallback tool, String input, ToolContext context) {
        return toolCallTimer.recordCallable(() -> {
            toolCallCounter.increment(Tags.of("tool", tool.getToolDefinition().name()));
            return tool.call(input, context);
        });
    }
}
```

## Best Practices

### 1. Tool Design Principles

- **Single Responsibility**: Each tool focuses on one specific function
- **Idempotency**: Same input should produce same output
- **Error Handling**: Gracefully handle exceptional situations
- **Input Validation**: Strictly validate input parameters
- **Security Considerations**: Implement appropriate permission controls

### 2. Performance Optimization

```java
@Configuration
public class ToolOptimizationConfig {
    
    @Bean
    public ToolCallback cachedWeatherTool() {
        return new CachedToolWrapper(
            new WeatherTool(),
            Duration.ofMinutes(10)  // Cache for 10 minutes
        );
    }
    
    @Bean
    public TaskExecutor toolExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("tool-");
        executor.initialize();
        return executor;
    }
}
```

### 3. Error Handling Strategy

```java
@Component
public class RobustTool {
    
    @Tool("Reliable data processing")
    public String processData(String data) {
        try {
            return doProcessData(data);
        } catch (ValidationException e) {
            return "Input validation failed: " + e.getMessage();
        } catch (ServiceUnavailableException e) {
            return "Service temporarily unavailable, please try again later";
        } catch (Exception e) {
            log.error("Data processing failed", e);
            return "Processing failed, please contact administrator";
        }
    }
}
```

## Summary

Tool calling is a powerful feature of Spring AI Alibaba that enables AI models to interact with the real world. By properly designing and using tools, you can build feature-rich and practical AI applications.

Key Points:
- Use @Tool annotation to quickly define tools
- Implement complex tool logic through ToolCallback interface
- Emphasize tool security and input validation
- Implement appropriate monitoring and logging
- Follow best practices to ensure tool reliability and performance
