---
title: Observability
description: Spring AI Alibaba observability features
---

# Observability

Observability is key to ensuring stable operation of AI applications, quick problem identification, and performance optimization. Spring AI Alibaba provides comprehensive observability solutions.

## Core Components

### 1. Metrics Monitoring
Collect and display application performance metrics.

### 2. Logging
Record detailed execution logs.

### 3. Distributed Tracing
Track complete request paths through the system.

### 4. Alerting
Timely notifications for exceptional situations.

## Basic Configuration

### Configure Observability

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

### Custom Metrics

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

### Using Metrics

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

## Structured Logging

### Structured Logger

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

### Sensitive Information Sanitization

```java
@Component
public class LogSanitizer {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b\\d{3}-\\d{3}-\\d{4}\\b");
    
    public String sanitize(String message) {
        String sanitized = message;
        
        // Sanitize emails
        sanitized = EMAIL_PATTERN.matcher(sanitized).replaceAll("***@***.***");
        
        // Sanitize phone numbers
        sanitized = PHONE_PATTERN.matcher(sanitized).replaceAll("***-***-****");
        
        return sanitized;
    }
}
```

## Distributed Tracing

### Configure Tracing

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

### Custom Tracing

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
            // Process chat request
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
            // Call model
            return chatClient.prompt().user(message).call().content();
        } finally {
            childSpan.end();
        }
    }
}
```

## ARMS Integration

### Configure ARMS

```properties
# ARMS configuration
spring.ai.observability.arms.enabled=true
spring.ai.observability.arms.app-name=spring-ai-app
spring.ai.observability.arms.license-key=${ARMS_LICENSE_KEY}
spring.ai.observability.arms.endpoint=https://arms-apm.cn-hangzhou.aliyuncs.com
```

### ARMS Monitoring

```java
@Component
public class ArmsMonitoring {
    
    @Autowired
    private ArmsAgent armsAgent;
    
    @EventListener
    public void onChatEvent(ChatEvent event) {
        // Send custom event to ARMS
        armsAgent.addCustomEvent("chat_event", Map.of(
            "sessionId", event.getSessionId(),
            "model", event.getModel(),
            "duration", event.getDuration().toMillis(),
            "success", event.isSuccess()
        ));
    }
    
    @Scheduled(fixedRate = 60000) // Execute every minute
    public void reportMetrics() {
        // Report custom metrics
        armsAgent.recordMetric("chat.qps", getCurrentQPS());
        armsAgent.recordMetric("chat.latency.p99", getP99Latency());
        armsAgent.recordMetric("chat.error.rate", getErrorRate());
    }
}
```

## Langfuse Integration

### Configure Langfuse

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

### Using Langfuse

```java
@Component
public class LangfuseTracing {
    
    @Autowired
    private LangfuseClient langfuseClient;
    
    public String traceChatWithLangfuse(String sessionId, String message) {
        // Create trace
        Trace trace = langfuseClient.createTrace(
            TraceRequest.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .name("chat_conversation")
                .build()
        );
        
        // Create generation
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
            
            // Update generation
            langfuseClient.updateGeneration(
                generation.getId(),
                GenerationUpdateRequest.builder()
                    .output(response)
                    .endTime(Instant.now())
                    .build()
            );
            
            return response;
        } catch (Exception e) {
            // Record error
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

## Alert System

### Configure Alerts

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

### Custom Alert Rules

```java
@Component
public class AlertRules {
    
    @Autowired
    private AlertManager alertManager;
    
    @EventListener
    public void checkErrorRate(MetricEvent event) {
        if ("chat.error.rate".equals(event.getMetricName())) {
            double errorRate = event.getValue();
            
            if (errorRate > 0.1) { // Error rate exceeds 10%
                alertManager.sendAlert(
                    Alert.builder()
                        .level(AlertLevel.CRITICAL)
                        .title("High Chat Error Rate")
                        .message("Current error rate: " + (errorRate * 100) + "%")
                        .timestamp(Instant.now())
                        .build()
                );
            }
        }
    }
    
    @Scheduled(fixedRate = 300000) // Check every 5 minutes
    public void checkResponseTime() {
        double avgResponseTime = metricsService.getAverageResponseTime();
        
        if (avgResponseTime > 5000) { // Response time exceeds 5 seconds
            alertManager.sendAlert(
                Alert.builder()
                    .level(AlertLevel.WARNING)
                    .title("High Response Time")
                    .message("Average response time: " + avgResponseTime + "ms")
                    .timestamp(Instant.now())
                    .build()
            );
        }
    }
}
```

## Configuration Options

```properties
# Observability configuration
spring.ai.observability.enabled=true
spring.ai.observability.metrics.enabled=true
spring.ai.observability.tracing.enabled=true
spring.ai.observability.logging.enabled=true

# Metrics configuration
spring.ai.observability.metrics.export.prometheus.enabled=true
spring.ai.observability.metrics.export.prometheus.step=PT1M

# Tracing configuration
spring.ai.observability.tracing.zipkin.endpoint=http://localhost:9411/api/v2/spans
spring.ai.observability.tracing.sampling.probability=0.1

# Logging configuration
spring.ai.observability.logging.level=INFO
spring.ai.observability.logging.sanitize=true
```

## Best Practices

### 1. Metrics Design
- Choose meaningful metrics
- Avoid high cardinality labels
- Set reasonable sampling rates

### 2. Log Management
- Use structured logging
- Implement sensitive information sanitization
- Set appropriate log levels

### 3. Tracing Optimization
- Control tracing overhead
- Select critical path tracing
- Set reasonable sampling strategies

### 4. Alert Strategy
- Set reasonable thresholds
- Avoid alert storms
- Establish alert escalation mechanisms

## Next Steps

- [Learn Multi-Agent Systems](/docs/1.0.0.3/multi-agent/agents/)
- [Explore Graph Framework](/docs/1.0.0.3/multi-agent/graph/)
- [Understand Playground](/docs/1.0.0.3/playground/studio/)
