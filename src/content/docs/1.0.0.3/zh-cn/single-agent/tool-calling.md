---
title: 工具调用 (Tool Calling)
keywords: ["Spring AI", "Tool Calling", "Function Calling", "External Tools", "API Integration"]
description: "学习如何使用 Spring AI 的工具调用功能集成外部工具和函数。"
---

# 工具调用 (Tool Calling)

*本内容参考自 Spring AI 官方文档*

工具调用（也称为函数调用）是 Spring AI 中的一个强大功能，允许 AI 模型与外部系统、API 和函数进行交互。这个功能使 AI 模型能够执行超越文本生成的操作，如检索实时数据、执行计算或与数据库交互。

## 概述

Spring AI 中的工具调用使 AI 模型能够：
- 调用外部 API 和服务
- 执行自定义函数
- 检索实时数据
- 执行计算
- 与数据库交互
- 访问系统资源

工作流程如下：
1. **函数定义**：定义 AI 模型可以调用的函数
2. **函数注册**：向 AI 模型注册函数
3. **模型决策**：AI 模型根据用户输入决定何时调用函数
4. **函数执行**：Spring AI 执行函数并返回结果
5. **响应生成**：AI 模型使用函数结果生成最终响应

## 核心概念

### Function 接口

在 Spring AI 中，工具使用标准的 `java.util.function.Function` 接口实现：

```java
public interface Function<T, R> {
    R apply(T t);
}
```

### 函数注册

函数可以通过多种方式向 ChatClient 注册：

```java
// 方法 1：使用函数 bean 名称
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunctions("weatherFunction", "timeFunction")
    .build();

// 方法 2：使用函数实例
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultFunction("getCurrentWeather", "获取当前天气", weatherFunction)
    .build();

// 方法 3：运行时注册
String response = chatClient.prompt()
    .user("天气怎么样？")
    .functions("weatherFunction")
    .call()
    .content();
```

## 基本使用

### 1. 使用 @Tool 注解

最简单的工具定义方式是使用 `@Tool` 注解：

```java
@Component
public class DateTimeTools {
    
    @Tool("获取当前日期和时间")
    public String getCurrentDateTime() {
        return LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
    
    @Tool("设置闹钟")
    public String setAlarm(@ToolParam(description = "ISO-8601 格式的时间") String time) {
        LocalDateTime alarmTime = LocalDateTime.parse(time, DateTimeFormatter.ISO_DATE_TIME);
        System.out.println("闹钟已设置为: " + alarmTime);
        return "闹钟设置成功，时间：" + alarmTime;
    }
}
```

### 2. 注册和使用工具

```java
@RestController
public class ChatController {
    
    private final ChatClient chatClient;
    private final DateTimeTools dateTimeTools;
    
    @GetMapping("/chat-with-tools")
    public String chatWithTools(@RequestParam String message) {
        return chatClient.prompt()
            .user(message)
            .tools(dateTimeTools)  // 注册工具实例
            .call()
            .content();
    }
    
    @GetMapping("/chat-with-tool-names")
    public String chatWithToolNames(@RequestParam String message) {
        return chatClient.prompt()
            .user(message)
            .tools("getCurrentDateTime", "setAlarm")  // 通过名称注册
            .call()
            .content();
    }
}
```

### 3. 复杂参数工具

```java
public class WeatherTools {
    
    @Tool("获取指定城市的天气信息")
    public WeatherInfo getWeather(WeatherRequest request) {
        // 调用天气 API
        return weatherService.getWeather(request.getCity(), request.getDays());
    }
    
    public record WeatherRequest(
        @ToolParam(description = "城市名称") String city,
        @ToolParam(description = "预报天数", required = false) Integer days
    ) {}
    
    public record WeatherInfo(
        String city,
        String temperature,
        String description,
        String humidity
    ) {}
}
```

## 高级工具定义

### 1. 使用 ToolCallback 接口

对于更复杂的工具逻辑，可以实现 `ToolCallback` 接口：

```java
@Component
public class DatabaseQueryTool implements ToolCallback {
    
    private final JdbcTemplate jdbcTemplate;
    
    @Override
    public ToolDefinition getToolDefinition() {
        return ToolDefinition.builder()
            .name("queryDatabase")
            .description("执行数据库查询")
            .inputSchema("""
                {
                    "type": "object",
                    "properties": {
                        "sql": {
                            "type": "string",
                            "description": "要执行的 SQL 查询语句"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "结果限制数量",
                            "default": 10
                        }
                    },
                    "required": ["sql"]
                }
                """)
            .build();
    }
    
    @Override
    public String call(String toolInput, ToolContext toolContext) {
        try {
            QueryRequest request = JsonParser.fromJson(toolInput, QueryRequest.class);
            
            // 安全检查
            if (!isSafeQuery(request.sql())) {
                return "错误：不允许执行此类 SQL 语句";
            }
            
            List<Map<String, Object>> results = jdbcTemplate.queryForList(
                request.sql() + " LIMIT " + request.limit()
            );
            
            return JsonParser.toJson(results);
            
        } catch (Exception e) {
            return "查询执行失败：" + e.getMessage();
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

### 2. 函数式工具定义

```java
@Configuration
public class ToolConfiguration {
    
    @Bean
    public ToolCallback calculatorTool() {
        return FunctionToolCallback.builder("calculator", this::calculate)
            .description("执行数学计算")
            .inputType(CalculationRequest.class)
            .build();
    }
    
    @Bean
    public ToolCallback translatorTool() {
        return FunctionToolCallback.builder("translator", this::translate)
            .description("翻译文本")
            .inputType(TranslationRequest.class)
            .build();
    }
    
    private CalculationResult calculate(CalculationRequest request, ToolContext context) {
        try {
            double result = evaluateExpression(request.expression());
            return new CalculationResult(result, "计算成功");
        } catch (Exception e) {
            return new CalculationResult(0, "计算错误：" + e.getMessage());
        }
    }
    
    private TranslationResult translate(TranslationRequest request, ToolContext context) {
        // 调用翻译服务
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

## 内置工具集成

### 1. 天气工具

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
    .user("北京今天天气怎么样？")
    .tools("weatherService")
    .call()
    .content();
```

### 2. 翻译工具

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
    .user("请帮我把'感谢您使用本产品'翻译成英语和日语")
    .tools("aliTranslateService")
    .call()
    .content();
```

### 3. 时间工具

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-time</artifactId>
</dependency>
```

```java
String response = chatClient.prompt()
    .user("现在几点了？")
    .tools("timeService")
    .call()
    .content();
```

## 工具上下文和状态管理

### 1. 使用 ToolContext

```java
@Component
public class SessionAwareTool {
    
    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();
    
    @Tool("获取用户信息")
    public String getUserInfo(String userId, ToolContext context) {
        String sessionId = (String) context.getContext().get("sessionId");
        UserSession session = sessions.get(sessionId);
        
        if (session == null) {
            return "用户会话不存在";
        }
        
        return "用户 " + userId + " 的信息：" + session.getUserInfo(userId);
    }
    
    @Tool("更新用户状态")
    public String updateUserStatus(String userId, String status, ToolContext context) {
        String sessionId = (String) context.getContext().get("sessionId");
        UserSession session = sessions.computeIfAbsent(sessionId, k -> new UserSession());
        
        session.updateUserStatus(userId, status);
        return "用户状态已更新";
    }
}
```

### 2. 有状态工具调用

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

## 工具安全和验证

### 1. 输入验证

```java
@Component
public class SecureFileOperationTool {
    
    private final Set<String> allowedPaths = Set.of("/tmp", "/uploads");
    
    @Tool("读取文件内容")
    public String readFile(@ToolParam(description = "文件路径") String filePath) {
        // 路径验证
        if (!isPathAllowed(filePath)) {
            return "错误：不允许访问此路径";
        }
        
        // 文件存在性检查
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            return "错误：文件不存在";
        }
        
        try {
            return Files.readString(path);
        } catch (IOException e) {
            return "错误：读取文件失败 - " + e.getMessage();
        }
    }
    
    private boolean isPathAllowed(String filePath) {
        Path path = Paths.get(filePath).normalize();
        return allowedPaths.stream()
            .anyMatch(allowed -> path.startsWith(Paths.get(allowed)));
    }
}
```

### 2. 权限控制

```java
@Component
public class PermissionAwareTool {
    
    @Tool("执行管理员操作")
    public String adminOperation(String operation, ToolContext context) {
        String userRole = (String) context.getContext().get("userRole");
        
        if (!"ADMIN".equals(userRole)) {
            return "错误：权限不足，需要管理员权限";
        }
        
        return executeAdminOperation(operation);
    }
    
    @Tool("执行用户操作")
    public String userOperation(String operation, ToolContext context) {
        String userId = (String) context.getContext().get("userId");
        
        if (userId == null) {
            return "错误：用户未认证";
        }
        
        return executeUserOperation(operation, userId);
    }
}
```

## 异步和批量工具调用

### 1. 异步工具执行

```java
@Component
public class AsyncTool {
    
    private final TaskExecutor taskExecutor;
    
    @Tool("异步处理任务")
    public String processAsync(String taskData) {
        String taskId = UUID.randomUUID().toString();
        
        taskExecutor.execute(() -> {
            try {
                // 长时间运行的任务
                processLongRunningTask(taskData, taskId);
            } catch (Exception e) {
                log.error("异步任务执行失败: {}", taskId, e);
            }
        });
        
        return "任务已提交，任务ID：" + taskId;
    }
    
    @Tool("查询任务状态")
    public String getTaskStatus(String taskId) {
        TaskStatus status = taskStatusService.getStatus(taskId);
        return JsonParser.toJson(status);
    }
}
```

### 2. 批量操作工具

```java
@Component
public class BatchOperationTool {
    
    @Tool("批量处理数据")
    public String batchProcess(BatchRequest request) {
        List<String> results = new ArrayList<>();
        
        for (String item : request.items()) {
            try {
                String result = processItem(item);
                results.add("成功: " + result);
            } catch (Exception e) {
                results.add("失败: " + e.getMessage());
            }
        }
        
        return "批量处理完成，结果：\n" + String.join("\n", results);
    }
    
    public record BatchRequest(List<String> items, String operation) {}
}
```

## 工具调用监控和调试

### 1. 工具调用日志

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
        logger.info("工具调用开始: {} 输入: {}", toolName, toolInput);
        
        long startTime = System.currentTimeMillis();
        try {
            String result = delegate.call(toolInput, toolContext);
            long duration = System.currentTimeMillis() - startTime;
            
            logger.info("工具调用成功: {} 耗时: {}ms 输出: {}", 
                       toolName, duration, result);
            return result;
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("工具调用失败: {} 耗时: {}ms 错误: {}", 
                        toolName, duration, e.getMessage(), e);
            throw e;
        }
    }
}
```

### 2. 工具性能监控

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

## 最佳实践

### 1. 工具设计原则

- **单一职责**：每个工具专注于一个特定功能
- **幂等性**：相同输入应产生相同输出
- **错误处理**：优雅处理异常情况
- **输入验证**：严格验证输入参数
- **安全考虑**：实施适当的权限控制

### 2. 性能优化

```java
@Configuration
public class ToolOptimizationConfig {
    
    @Bean
    public ToolCallback cachedWeatherTool() {
        return new CachedToolWrapper(
            new WeatherTool(),
            Duration.ofMinutes(10)  // 缓存10分钟
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

### 3. 错误处理策略

```java
@Component
public class RobustTool {
    
    @Tool("可靠的数据处理")
    public String processData(String data) {
        try {
            return doProcessData(data);
        } catch (ValidationException e) {
            return "输入验证失败：" + e.getMessage();
        } catch (ServiceUnavailableException e) {
            return "服务暂时不可用，请稍后重试";
        } catch (Exception e) {
            log.error("数据处理失败", e);
            return "处理失败，请联系管理员";
        }
    }
}
```

## 最佳实践

### 函数设计原则

1. **单一职责**：每个函数应该有一个明确的单一目的
2. **清晰文档**：为所有参数使用 `@JsonPropertyDescription`
3. **错误处理**：优雅地处理错误并返回有意义的消息
4. **验证**：在处理之前验证所有输入
5. **安全性**：永远不要在没有适当授权的情况下暴露敏感操作

### 性能优化

```java
@Component("cachedWeatherFunction")
@Description("带缓存的天气获取")
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

## 下一步

- 学习 [Chat Memory](../chat-memory/) 进行对话上下文管理
- 探索 [Multimodality](../multimodality/) 进行多模态工具
- 查看 [Structured Output](../structured-output/) 进行工具响应格式化
