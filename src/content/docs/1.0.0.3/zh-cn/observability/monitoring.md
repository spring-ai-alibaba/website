---
title: 监控和观测
keywords: ["Spring AI Alibaba", "监控", "观测", "Metrics", "Tracing", "Logging"]
description: "深入了解 Spring AI Alibaba 的监控和观测功能，包括指标收集、链路追踪、日志记录等核心概念和实践。"
---

## 概述

Spring AI Alibaba 提供了全面的监控和观测能力，帮助开发者深入了解 AI 应用的运行状态、性能表现和问题诊断。通过集成 Spring Boot Actuator、Micrometer、OpenTelemetry 等技术，实现了对 AI 应用的全方位监控。

## 核心监控指标

### 1. 模型调用指标

Spring AI Alibaba 自动收集模型调用的关键指标：

```java
// 自动收集的指标包括：
// - spring.ai.chat.client.calls.total: 总调用次数
// - spring.ai.chat.client.calls.duration: 调用耗时
// - spring.ai.chat.client.tokens.input: 输入 token 数量
// - spring.ai.chat.client.tokens.output: 输出 token 数量
// - spring.ai.chat.client.errors.total: 错误次数

@RestController
public class MonitoredChatController {
    
    private final ChatClient chatClient;
    private final MeterRegistry meterRegistry;
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        // 自定义指标收集
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            String response = chatClient.prompt()
                .user(message)
                .call()
                .content();
            
            // 记录成功调用
            Counter.builder("custom.chat.success")
                .tag("endpoint", "/chat")
                .register(meterRegistry)
                .increment();
            
            return response;
            
        } catch (Exception e) {
            // 记录失败调用
            Counter.builder("custom.chat.error")
                .tag("endpoint", "/chat")
                .tag("error", e.getClass().getSimpleName())
                .register(meterRegistry)
                .increment();
            
            throw e;
        } finally {
            sample.stop(Timer.builder("custom.chat.duration")
                .tag("endpoint", "/chat")
                .register(meterRegistry));
        }
    }
}
```

### 2. 工具调用监控

```java
@Component
public class MonitoredToolService {
    
    private final MeterRegistry meterRegistry;
    
    @Tool("获取天气信息")
    public String getWeather(String city) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            String weather = callWeatherAPI(city);
            
            // 记录工具调用成功
            Counter.builder("tool.calls.total")
                .tag("tool", "weather")
                .tag("status", "success")
                .register(meterRegistry)
                .increment();
            
            return weather;
            
        } catch (Exception e) {
            // 记录工具调用失败
            Counter.builder("tool.calls.total")
                .tag("tool", "weather")
                .tag("status", "error")
                .tag("error_type", e.getClass().getSimpleName())
                .register(meterRegistry)
                .increment();
            
            throw e;
        } finally {
            sample.stop(Timer.builder("tool.calls.duration")
                .tag("tool", "weather")
                .register(meterRegistry));
        }
    }
}
```

### 3. RAG 系统监控

```java
@Service
public class MonitoredRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final MeterRegistry meterRegistry;
    
    public String search(String query) {
        // 监控向量检索
        Timer.Sample retrievalSample = Timer.start(meterRegistry);
        List<Document> documents;
        
        try {
            documents = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query(query)
                    .topK(5)
                    .build()
            );
            
            // 记录检索结果数量
            Gauge.builder("rag.retrieval.documents.count")
                .register(meterRegistry, documents, List::size);
            
        } finally {
            retrievalSample.stop(Timer.builder("rag.retrieval.duration")
                .register(meterRegistry));
        }
        
        // 监控生成过程
        Timer.Sample generationSample = Timer.start(meterRegistry);
        
        try {
            String context = documents.stream()
                .map(Document::getContent)
                .collect(Collectors.joining("\n"));
            
            String response = chatClient.prompt()
                .system("基于以下上下文回答问题：\n" + context)
                .user(query)
                .call()
                .content();
            
            // 记录上下文长度
            Gauge.builder("rag.context.length")
                .register(meterRegistry, context, String::length);
            
            return response;
            
        } finally {
            generationSample.stop(Timer.builder("rag.generation.duration")
                .register(meterRegistry));
        }
    }
}
```

## 链路追踪

### 1. 启用链路追踪

```yaml
# application.yml
management:
  tracing:
    enabled: true
    sampling:
      probability: 1.0  # 采样率，生产环境建议调低
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans

spring:
  application:
    name: spring-ai-app
```

### 2. 自定义 Span

```java
@Service
public class TracedAIService {
    
    private final ChatClient chatClient;
    private final Tracer tracer;
    
    public String processRequest(String input) {
        Span span = tracer.nextSpan()
            .name("ai.process.request")
            .tag("input.length", String.valueOf(input.length()))
            .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            // 预处理阶段
            Span preprocessSpan = tracer.nextSpan()
                .name("ai.preprocess")
                .start();
            
            try (Tracer.SpanInScope preprocessScope = tracer.withSpanInScope(preprocessSpan)) {
                String processedInput = preprocessInput(input);
                preprocessSpan.tag("processed.length", String.valueOf(processedInput.length()));
                
                // 模型调用阶段
                Span modelSpan = tracer.nextSpan()
                    .name("ai.model.call")
                    .tag("model", "qwen-plus")
                    .start();
                
                try (Tracer.SpanInScope modelScope = tracer.withSpanInScope(modelSpan)) {
                    String response = chatClient.prompt()
                        .user(processedInput)
                        .call()
                        .content();
                    
                    modelSpan.tag("response.length", String.valueOf(response.length()));
                    return response;
                    
                } finally {
                    modelSpan.end();
                }
            } finally {
                preprocessSpan.end();
            }
        } catch (Exception e) {
            span.tag("error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### 3. Graph 工作流追踪

```java
@Configuration
public class TracedGraphWorkflow {
    
    @Bean
    public CompiledGraph tracedWorkflow(ChatClient chatClient, Tracer tracer) throws GraphStateException {
        KeyStrategyFactory stateFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", new ReplaceStrategy());
            strategies.put("result", new ReplaceStrategy());
            return strategies;
        };
        
        // 带追踪的节点
        NodeAction tracedNodeAction = state -> {
            Span span = tracer.nextSpan()
                .name("graph.node.execution")
                .tag("node.id", "processor")
                .start();
            
            try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
                String input = (String) state.value("input").orElse("");
                span.tag("input.length", String.valueOf(input.length()));
                
                String result = chatClient.prompt()
                    .user("处理：" + input)
                    .call()
                    .content();
                
                span.tag("result.length", String.valueOf(result.length()));
                return Map.of("result", result);
                
            } finally {
                span.end();
            }
        };
        
        StateGraph workflow = new StateGraph(stateFactory)
            .addNode("processor", node_async(tracedNodeAction))
            .addEdge(START, "processor")
            .addEdge("processor", END);
        
        return workflow.compile();
    }
}
```

## 日志记录

### 1. 结构化日志

```java
@Service
public class StructuredLoggingService {
    
    private final Logger logger = LoggerFactory.getLogger(StructuredLoggingService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public String processWithLogging(String input) {
        String requestId = UUID.randomUUID().toString();
        
        // 请求开始日志
        logEvent("request.started", Map.of(
            "requestId", requestId,
            "inputLength", input.length(),
            "timestamp", Instant.now().toString()
        ));
        
        try {
            String result = chatClient.prompt()
                .user(input)
                .call()
                .content();
            
            // 请求成功日志
            logEvent("request.completed", Map.of(
                "requestId", requestId,
                "resultLength", result.length(),
                "duration", calculateDuration(),
                "status", "success"
            ));
            
            return result;
            
        } catch (Exception e) {
            // 请求失败日志
            logEvent("request.failed", Map.of(
                "requestId", requestId,
                "error", e.getMessage(),
                "errorType", e.getClass().getSimpleName(),
                "duration", calculateDuration(),
                "status", "error"
            ));
            
            throw e;
        }
    }
    
    private void logEvent(String event, Map<String, Object> data) {
        try {
            String jsonLog = objectMapper.writeValueAsString(Map.of(
                "event", event,
                "data", data
            ));
            logger.info(jsonLog);
        } catch (Exception e) {
            logger.error("Failed to log event: " + event, e);
        }
    }
}
```

### 2. 敏感信息脱敏

```java
@Component
public class SensitiveDataLogger {
    
    private final Logger logger = LoggerFactory.getLogger(SensitiveDataLogger.class);
    private final Pattern emailPattern = Pattern.compile("[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}");
    private final Pattern phonePattern = Pattern.compile("\\b\\d{3}-\\d{3}-\\d{4}\\b");
    
    public void logUserInput(String input) {
        String sanitizedInput = sanitizeInput(input);
        
        logger.info("User input received: {}", sanitizedInput);
    }
    
    private String sanitizeInput(String input) {
        String sanitized = input;
        
        // 脱敏邮箱
        sanitized = emailPattern.matcher(sanitized)
            .replaceAll(match -> maskEmail(match.group()));
        
        // 脱敏电话
        sanitized = phonePattern.matcher(sanitized)
            .replaceAll(match -> maskPhone(match.group()));
        
        return sanitized;
    }
    
    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex > 2) {
            return email.substring(0, 2) + "***" + email.substring(atIndex);
        }
        return "***" + email.substring(atIndex);
    }
    
    private String maskPhone(String phone) {
        return phone.substring(0, 3) + "-***-" + phone.substring(8);
    }
}
```

## 健康检查

### 1. 自定义健康检查

```java
@Component
public class AIServiceHealthIndicator implements HealthIndicator {
    
    private final ChatClient chatClient;
    
    @Override
    public Health health() {
        try {
            // 测试模型连接
            String testResponse = chatClient.prompt()
                .user("健康检查")
                .call()
                .content();
            
            if (testResponse != null && !testResponse.isEmpty()) {
                return Health.up()
                    .withDetail("model", "available")
                    .withDetail("lastCheck", Instant.now())
                    .withDetail("responseLength", testResponse.length())
                    .build();
            } else {
                return Health.down()
                    .withDetail("model", "no response")
                    .withDetail("lastCheck", Instant.now())
                    .build();
            }
            
        } catch (Exception e) {
            return Health.down()
                .withDetail("model", "error")
                .withDetail("error", e.getMessage())
                .withDetail("lastCheck", Instant.now())
                .build();
        }
    }
}
```

### 2. 向量数据库健康检查

```java
@Component
public class VectorStoreHealthIndicator implements HealthIndicator {
    
    private final VectorStore vectorStore;
    
    @Override
    public Health health() {
        try {
            // 测试向量数据库连接
            List<Document> testResults = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query("test")
                    .topK(1)
                    .build()
            );
            
            return Health.up()
                .withDetail("vectorStore", "available")
                .withDetail("lastCheck", Instant.now())
                .withDetail("testResultCount", testResults.size())
                .build();
                
        } catch (Exception e) {
            return Health.down()
                .withDetail("vectorStore", "error")
                .withDetail("error", e.getMessage())
                .withDetail("lastCheck", Instant.now())
                .build();
        }
    }
}
```

## 告警和通知

### 1. 基于指标的告警

```java
@Component
public class AIMetricsAlertService {
    
    private final MeterRegistry meterRegistry;
    private final NotificationService notificationService;
    
    @Scheduled(fixedRate = 60000) // 每分钟检查一次
    public void checkMetrics() {
        // 检查错误率
        double errorRate = getErrorRate();
        if (errorRate > 0.05) { // 错误率超过 5%
            sendAlert("High Error Rate", 
                     "AI service error rate is " + (errorRate * 100) + "%");
        }
        
        // 检查响应时间
        double avgResponseTime = getAverageResponseTime();
        if (avgResponseTime > 5000) { // 响应时间超过 5 秒
            sendAlert("High Response Time", 
                     "AI service average response time is " + avgResponseTime + "ms");
        }
        
        // 检查 Token 使用量
        double tokenUsage = getTokenUsage();
        if (tokenUsage > 1000000) { // Token 使用量超过 100 万
            sendAlert("High Token Usage", 
                     "Token usage in last hour: " + tokenUsage);
        }
    }
    
    private void sendAlert(String title, String message) {
        notificationService.sendAlert(AlertLevel.WARNING, title, message);
    }
}
```

### 2. 异常监控

```java
@Component
@EventListener
public class AIExceptionMonitor {
    
    private final NotificationService notificationService;
    private final MeterRegistry meterRegistry;
    
    @EventListener
    public void handleAIException(AIExceptionEvent event) {
        // 记录异常指标
        Counter.builder("ai.exceptions.total")
            .tag("type", event.getException().getClass().getSimpleName())
            .tag("service", event.getServiceName())
            .register(meterRegistry)
            .increment();
        
        // 发送告警
        if (isCriticalException(event.getException())) {
            notificationService.sendAlert(
                AlertLevel.CRITICAL,
                "Critical AI Service Exception",
                "Service: " + event.getServiceName() + 
                ", Error: " + event.getException().getMessage()
            );
        }
    }
    
    private boolean isCriticalException(Exception e) {
        return e instanceof ModelConnectionException ||
               e instanceof AuthenticationException ||
               e instanceof RateLimitException;
    }
}
```

## 性能分析

### 1. 性能基准测试

```java
@Component
public class AIPerformanceBenchmark {
    
    private final ChatClient chatClient;
    private final MeterRegistry meterRegistry;
    
    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨 2 点执行
    public void runBenchmark() {
        List<String> testQueries = loadTestQueries();
        
        for (String query : testQueries) {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            try {
                String response = chatClient.prompt()
                    .user(query)
                    .call()
                    .content();
                
                // 记录性能指标
                sample.stop(Timer.builder("benchmark.query.duration")
                    .tag("query.type", classifyQuery(query))
                    .register(meterRegistry));
                
                // 记录响应质量指标
                double qualityScore = evaluateResponseQuality(query, response);
                Gauge.builder("benchmark.response.quality")
                    .tag("query.type", classifyQuery(query))
                    .register(meterRegistry, qualityScore, Double::doubleValue);
                
            } catch (Exception e) {
                Counter.builder("benchmark.errors.total")
                    .tag("error.type", e.getClass().getSimpleName())
                    .register(meterRegistry)
                    .increment();
            }
        }
    }
}
```

### 2. 资源使用监控

```java
@Component
public class ResourceMonitor {
    
    private final MeterRegistry meterRegistry;
    
    @PostConstruct
    public void setupResourceMonitoring() {
        // 监控 JVM 内存使用
        new JvmMemoryMetrics().bindTo(meterRegistry);
        
        // 监控 GC 性能
        new JvmGcMetrics().bindTo(meterRegistry);
        
        // 监控线程池状态
        new JvmThreadMetrics().bindTo(meterRegistry);
        
        // 自定义资源监控
        Gauge.builder("ai.memory.usage")
            .register(meterRegistry, this, ResourceMonitor::getAIMemoryUsage);
    }
    
    private double getAIMemoryUsage() {
        // 计算 AI 相关组件的内存使用
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        return (double) (totalMemory - freeMemory) / totalMemory;
    }
}
```

## 监控仪表板

### 1. Grafana 仪表板配置

```json
{
  "dashboard": {
    "title": "Spring AI Alibaba Monitoring",
    "panels": [
      {
        "title": "Model Call Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(spring_ai_chat_client_calls_total[5m])",
            "legendFormat": "Calls/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(spring_ai_chat_client_calls_duration_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Token Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(spring_ai_chat_client_tokens_input_total[5m])",
            "legendFormat": "Input tokens/sec"
          },
          {
            "expr": "rate(spring_ai_chat_client_tokens_output_total[5m])",
            "legendFormat": "Output tokens/sec"
          }
        ]
      }
    ]
  }
}
```

### 2. 自定义监控端点

```java
@RestController
@RequestMapping("/monitoring")
public class MonitoringController {
    
    private final MeterRegistry meterRegistry;
    private final AIServiceHealthIndicator healthIndicator;
    
    @GetMapping("/metrics/summary")
    public Map<String, Object> getMetricsSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        // 获取调用统计
        Counter callCounter = meterRegistry.find("spring.ai.chat.client.calls.total").counter();
        summary.put("totalCalls", callCounter != null ? callCounter.count() : 0);
        
        // 获取平均响应时间
        Timer responseTimer = meterRegistry.find("spring.ai.chat.client.calls.duration").timer();
        summary.put("avgResponseTime", responseTimer != null ? responseTimer.mean(TimeUnit.MILLISECONDS) : 0);
        
        // 获取错误率
        Counter errorCounter = meterRegistry.find("spring.ai.chat.client.errors.total").counter();
        double errorRate = callCounter != null && callCounter.count() > 0 ? 
            (errorCounter != null ? errorCounter.count() : 0) / callCounter.count() : 0;
        summary.put("errorRate", errorRate);
        
        return summary;
    }
    
    @GetMapping("/health/detailed")
    public Map<String, Object> getDetailedHealth() {
        Health health = healthIndicator.health();
        
        Map<String, Object> result = new HashMap<>();
        result.put("status", health.getStatus().getCode());
        result.put("details", health.getDetails());
        
        return result;
    }
}
```

## 最佳实践

### 1. 监控策略

- **分层监控**：应用层、服务层、基础设施层
- **关键指标**：响应时间、错误率、吞吐量、资源使用
- **告警设置**：合理设置告警阈值，避免告警疲劳
- **数据保留**：根据需求设置合适的数据保留策略

### 2. 性能优化

- **指标采样**：在高并发场景下适当降低采样率
- **异步处理**：使用异步方式收集和发送监控数据
- **批量操作**：批量发送指标数据减少网络开销
- **缓存策略**：合理使用缓存减少重复计算

### 3. 安全考虑

- **数据脱敏**：确保敏感信息不被记录到日志中
- **访问控制**：限制监控数据的访问权限
- **数据加密**：传输和存储监控数据时使用加密
- **审计日志**：记录监控系统的操作日志

## 总结

Spring AI Alibaba 提供了完整的监控和观测解决方案，通过指标收集、链路追踪、日志记录等手段，帮助开发者全面了解 AI 应用的运行状态。

关键要点：
- 自动收集核心 AI 指标
- 支持自定义监控和追踪
- 提供健康检查和告警机制
- 集成主流监控工具和平台
- 遵循监控最佳实践确保系统可观测性
