---
title: 可观测性 (Observability)
description: Spring AI Alibaba 可观测性功能
---

# 可观测性 (Observability)

可观测性是确保 AI 应用稳定运行的关键。Spring AI Alibaba 提供了全面的可观测性解决方案，包括监控、日志、追踪和告警。

## 核心组件

### 1. 指标监控 (Metrics)
收集和展示应用性能指标。

### 2. 日志记录 (Logging)
记录详细的执行日志。

### 3. 链路追踪 (Tracing)
追踪请求在系统中的完整路径。

### 4. 告警通知 (Alerting)
在异常情况下及时通知。

## 指标监控

### 基本配置

```java
@Configuration
@EnableMetrics
public class MetricsConfig {
    
    @Bean
    public MeterRegistry meterRegistry() {
        return new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
    }
    
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}
```

### 自定义指标

```java
@Component
public class ChatMetrics {
    
    private final Counter chatRequestsTotal;
    private final Timer chatResponseTime;
    private final Gauge activeConnections;
    
    public ChatMetrics(MeterRegistry meterRegistry) {
        this.chatRequestsTotal = Counter.builder("chat.requests.total")
            .description("Total chat requests")
            .register(meterRegistry);
            
        this.chatResponseTime = Timer.builder("chat.response.time")
            .description("Chat response time")
            .register(meterRegistry);
            
        this.activeConnections = Gauge.builder("chat.connections.active")
            .description("Active chat connections")
            .register(meterRegistry, this, ChatMetrics::getActiveConnections);
    }
    
    public void recordRequest(String model, boolean success) {
        chatRequestsTotal.increment(
            Tags.of(
                "model", model,
                "status", success ? "success" : "error"
            )
        );
    }
    
    public void recordResponseTime(Duration duration, String model) {
        chatResponseTime.record(duration, Tags.of("model", model));
    }
    
    private double getActiveConnections() {
        return connectionManager.getActiveConnectionCount();
    }
}
```

### 使用指标

```java
@RestController
public class ChatController {
    
    @Autowired
    private ChatClient chatClient;
    
    @Autowired
    private ChatMetrics chatMetrics;
    
    @PostMapping("/chat")
    @Timed(name = "chat.request", description = "Chat request processing time")
    public String chat(@RequestParam String message) {
        Timer.Sample sample = Timer.start();
        
        try {
            String response = chatClient.prompt()
                .user(message)
                .call()
                .content();
            
            chatMetrics.recordRequest("qwen", true);
            return response;
            
        } catch (Exception e) {
            chatMetrics.recordRequest("qwen", false);
            throw e;
        } finally {
            sample.stop(chatMetrics.getChatResponseTime());
        }
    }
}
```

## 日志记录

### 结构化日志

```java
@Component
public class StructuredLogger {
    
    private static final Logger logger = LoggerFactory.getLogger(StructuredLogger.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public void logChatRequest(String sessionId, String message, String model) {
        try {
            Map<String, Object> logData = Map.of(
                "event", "chat_request",
                "sessionId", sessionId,
                "model", model,
                "messageLength", message.length(),
                "timestamp", Instant.now()
            );
            
            logger.info(objectMapper.writeValueAsString(logData));
        } catch (Exception e) {
            logger.error("Failed to log chat request", e);
        }
    }
    
    public void logChatResponse(String sessionId, String response, Duration processingTime) {
        try {
            Map<String, Object> logData = Map.of(
                "event", "chat_response",
                "sessionId", sessionId,
                "responseLength", response.length(),
                "processingTimeMs", processingTime.toMillis(),
                "timestamp", Instant.now()
            );
            
            logger.info(objectMapper.writeValueAsString(logData));
        } catch (Exception e) {
            logger.error("Failed to log chat response", e);
        }
    }
}
```

### 敏感信息脱敏

```java
@Component
public class LogSanitizer {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b\\d{3}-\\d{3}-\\d{4}\\b");
    
    public String sanitize(String message) {
        String sanitized = message;
        
        // 脱敏邮箱
        sanitized = EMAIL_PATTERN.matcher(sanitized).replaceAll("***@***.***");
        
        // 脱敏电话
        sanitized = PHONE_PATTERN.matcher(sanitized).replaceAll("***-***-****");
        
        return sanitized;
    }
}
```

## 链路追踪

### 配置追踪

```java
@Configuration
public class TracingConfig {
    
    @Bean
    public Sender sender() {
        return OkHttpSender.create("http://localhost:9411/api/v2/spans");
    }
    
    @Bean
    public AsyncReporter<Span> spanReporter() {
        return AsyncReporter.create(sender());
    }
    
    @Bean
    public Tracing tracing() {
        return Tracing.newBuilder()
            .localServiceName("spring-ai-app")
            .spanReporter(spanReporter())
            .build();
    }
}
```

### 自定义追踪

```java
@Component
public class ChatTracing {
    
    @Autowired
    private Tracing tracing;
    
    public String traceChat(String message) {
        Tracer tracer = tracing.tracer();
        Span span = tracer.nextSpan()
            .name("chat.process")
            .tag("message.length", String.valueOf(message.length()))
            .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            // 处理聊天请求
            String response = processChatMessage(message);
            
            span.tag("response.length", String.valueOf(response.length()));
            span.tag("status", "success");
            
            return response;
        } catch (Exception e) {
            span.tag("error", e.getMessage());
            span.tag("status", "error");
            throw e;
        } finally {
            span.end();
        }
    }
    
    private String processChatMessage(String message) {
        Span childSpan = tracing.tracer().nextSpan()
            .name("model.call")
            .start();
        
        try (Tracer.SpanInScope ws = tracing.tracer().withSpanInScope(childSpan)) {
            // 调用模型
            return chatClient.prompt().user(message).call().content();
        } finally {
            childSpan.end();
        }
    }
}
```

## ARMS 集成

### 配置 ARMS

```properties
# ARMS 配置
spring.ai.observability.arms.enabled=true
spring.ai.observability.arms.app-name=spring-ai-app
spring.ai.observability.arms.license-key=${ARMS_LICENSE_KEY}
spring.ai.observability.arms.endpoint=https://arms-apm.cn-hangzhou.aliyuncs.com
```

### ARMS 监控

```java
@Component
public class ArmsMonitoring {
    
    @Autowired
    private ArmsAgent armsAgent;
    
    @EventListener
    public void onChatEvent(ChatEvent event) {
        // 发送自定义事件到 ARMS
        armsAgent.addCustomEvent("chat_event", Map.of(
            "sessionId", event.getSessionId(),
            "model", event.getModel(),
            "duration", event.getDuration().toMillis(),
            "success", event.isSuccess()
        ));
    }
    
    @Scheduled(fixedRate = 60000) // 每分钟执行一次
    public void reportMetrics() {
        // 报告自定义指标
        armsAgent.recordMetric("chat.qps", getCurrentQPS());
        armsAgent.recordMetric("chat.latency.p99", getP99Latency());
        armsAgent.recordMetric("chat.error.rate", getErrorRate());
    }
}
```

## Langfuse 集成

### 配置 Langfuse

```java
@Configuration
public class LangfuseConfig {
    
    @Bean
    public LangfuseClient langfuseClient() {
        return LangfuseClient.builder()
            .publicKey("${langfuse.public-key}")
            .secretKey("${langfuse.secret-key}")
            .baseUrl("${langfuse.base-url}")
            .build();
    }
}
```

### 使用 Langfuse

```java
@Component
public class LangfuseTracing {
    
    @Autowired
    private LangfuseClient langfuseClient;
    
    public String traceChatWithLangfuse(String sessionId, String message) {
        // 创建 trace
        Trace trace = langfuseClient.createTrace(
            TraceRequest.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .name("chat_conversation")
                .build()
        );
        
        // 创建 generation
        Generation generation = langfuseClient.createGeneration(
            GenerationRequest.builder()
                .traceId(trace.getId())
                .name("chat_response")
                .model("qwen-max")
                .input(message)
                .build()
        );
        
        try {
            String response = chatClient.prompt().user(message).call().content();
            
            // 更新 generation
            langfuseClient.updateGeneration(
                generation.getId(),
                GenerationUpdateRequest.builder()
                    .output(response)
                    .endTime(Instant.now())
                    .build()
            );
            
            return response;
        } catch (Exception e) {
            // 记录错误
            langfuseClient.updateGeneration(
                generation.getId(),
                GenerationUpdateRequest.builder()
                    .level("ERROR")
                    .statusMessage(e.getMessage())
                    .endTime(Instant.now())
                    .build()
            );
            throw e;
        }
    }
}
```

## 告警系统

### 配置告警

```java
@Configuration
public class AlertConfig {
    
    @Bean
    public AlertManager alertManager() {
        return AlertManager.builder()
            .emailNotifier(emailNotifier())
            .webhookNotifier(webhookNotifier())
            .build();
    }
    
    @Bean
    public EmailNotifier emailNotifier() {
        return EmailNotifier.builder()
            .smtpHost("smtp.example.com")
            .smtpPort(587)
            .username("alerts@example.com")
            .password("password")
            .build();
    }
}
```

### 自定义告警规则

```java
@Component
public class AlertRules {
    
    @Autowired
    private AlertManager alertManager;
    
    @EventListener
    public void checkErrorRate(MetricEvent event) {
        if ("chat.error.rate".equals(event.getMetricName())) {
            double errorRate = event.getValue();
            
            if (errorRate > 0.1) { // 错误率超过 10%
                alertManager.sendAlert(
                    Alert.builder()
                        .level(AlertLevel.CRITICAL)
                        .title("聊天错误率过高")
                        .message("当前错误率: " + (errorRate * 100) + "%")
                        .timestamp(Instant.now())
                        .build()
                );
            }
        }
    }
    
    @Scheduled(fixedRate = 300000) // 每5分钟检查一次
    public void checkResponseTime() {
        double avgResponseTime = metricsService.getAverageResponseTime();
        
        if (avgResponseTime > 5000) { // 响应时间超过 5 秒
            alertManager.sendAlert(
                Alert.builder()
                    .level(AlertLevel.WARNING)
                    .title("响应时间过长")
                    .message("平均响应时间: " + avgResponseTime + "ms")
                    .timestamp(Instant.now())
                    .build()
            );
        }
    }
}
```

## 仪表板

### Grafana 集成

```yaml
# docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### 自定义仪表板

```java
@RestController
public class DashboardController {
    
    @Autowired
    private MetricsService metricsService;
    
    @GetMapping("/api/dashboard/metrics")
    public DashboardMetrics getDashboardMetrics() {
        return DashboardMetrics.builder()
            .totalRequests(metricsService.getTotalRequests())
            .averageResponseTime(metricsService.getAverageResponseTime())
            .errorRate(metricsService.getErrorRate())
            .activeUsers(metricsService.getActiveUsers())
            .topModels(metricsService.getTopModels())
            .build();
    }
    
    @GetMapping("/api/dashboard/health")
    public HealthStatus getHealthStatus() {
        return HealthStatus.builder()
            .status(healthService.getOverallStatus())
            .components(healthService.getComponentStatus())
            .lastUpdated(Instant.now())
            .build();
    }
}
```

## 配置选项

```properties
# 可观测性配置
spring.ai.observability.enabled=true
spring.ai.observability.metrics.enabled=true
spring.ai.observability.tracing.enabled=true
spring.ai.observability.logging.enabled=true

# 指标配置
spring.ai.observability.metrics.export.prometheus.enabled=true
spring.ai.observability.metrics.export.prometheus.step=PT1M

# 追踪配置
spring.ai.observability.tracing.zipkin.endpoint=http://localhost:9411/api/v2/spans
spring.ai.observability.tracing.sampling.probability=0.1

# 日志配置
spring.ai.observability.logging.level=INFO
spring.ai.observability.logging.sanitize=true
```

## 最佳实践

### 1. 指标设计
- 选择有意义的指标
- 避免高基数标签
- 设置合理的采样率

### 2. 日志管理
- 使用结构化日志
- 实施敏感信息脱敏
- 设置合理的日志级别

### 3. 追踪优化
- 控制追踪开销
- 选择关键路径追踪
- 设置合理的采样策略

### 4. 告警策略
- 设置合理的阈值
- 避免告警风暴
- 建立告警升级机制

## 下一步

- [学习多智能体](/docs/1.0.0.3/multi-agent/agents/)
- [探索 Graph 框架](/docs/1.0.0.3/multi-agent/graph/)
- [了解 Playground](/docs/1.0.0.3/playground/studio/)
