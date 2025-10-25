---
title: Monitoring and Observability
keywords: ["Spring AI Alibaba", "Monitoring", "Observability", "Metrics", "Tracing", "Logging"]
description: "Deep dive into Spring AI Alibaba's monitoring and observability features, including metrics collection, distributed tracing, logging, and core concepts and practices."
---

## Overview

Spring AI Alibaba provides comprehensive monitoring and observability capabilities to help developers gain deep insights into AI application runtime status, performance, and problem diagnosis. By integrating technologies like Spring Boot Actuator, Micrometer, and OpenTelemetry, it achieves comprehensive monitoring of AI applications.

## Core Monitoring Metrics

### 1. Model Call Metrics

Spring AI Alibaba automatically collects key metrics for model calls:

```java
// Automatically collected metrics include:
// - spring.ai.chat.client.calls.total: Total number of calls
// - spring.ai.chat.client.calls.duration: Call duration
// - spring.ai.chat.client.tokens.input: Input token count
// - spring.ai.chat.client.tokens.output: Output token count
// - spring.ai.chat.client.errors.total: Error count

@RestController
public class MonitoredChatController {
    
    private final ChatClient chatClient;
    private final MeterRegistry meterRegistry;
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        // Custom metrics collection
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            String response = chatClient.prompt()
                .user(message)
                .call()
                .content();
            
            // Record successful call
            Counter.builder("custom.chat.success")
                .tag("endpoint", "/chat")
                .register(meterRegistry)
                .increment();
            
            return response;
            
        } catch (Exception e) {
            // Record failed call
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

### 2. Tool Call Monitoring

```java
@Component
public class MonitoredToolService {
    
    private final MeterRegistry meterRegistry;
    
    @Tool("Get weather information")
    public String getWeather(String city) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            String weather = callWeatherAPI(city);
            
            // Record successful tool call
            Counter.builder("tool.calls.total")
                .tag("tool", "weather")
                .tag("status", "success")
                .register(meterRegistry)
                .increment();
            
            return weather;
            
        } catch (Exception e) {
            // Record failed tool call
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

### 3. RAG System Monitoring

```java
@Service
public class MonitoredRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final MeterRegistry meterRegistry;
    
    public String search(String query) {
        // Monitor vector retrieval
        Timer.Sample retrievalSample = Timer.start(meterRegistry);
        List<Document> documents;
        
        try {
            documents = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query(query)
                    .topK(5)
                    .build()
            );
            
            // Record retrieval result count
            Gauge.builder("rag.retrieval.documents.count")
                .register(meterRegistry, documents, List::size);
            
        } finally {
            retrievalSample.stop(Timer.builder("rag.retrieval.duration")
                .register(meterRegistry));
        }
        
        // Monitor generation process
        Timer.Sample generationSample = Timer.start(meterRegistry);
        
        try {
            String context = documents.stream()
                .map(Document::getContent)
                .collect(Collectors.joining("\n"));
            
            String response = chatClient.prompt()
                .system("Answer the question based on the following context:\n" + context)
                .user(query)
                .call()
                .content();
            
            // Record context length
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

## Distributed Tracing

### 1. Enable Tracing

```yaml
# application.yml
management:
  tracing:
    enabled: true
    sampling:
      probability: 1.0  # Sampling rate, recommend lower for production
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans

spring:
  application:
    name: spring-ai-app
```

### 2. Custom Spans

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
            // Preprocessing phase
            Span preprocessSpan = tracer.nextSpan()
                .name("ai.preprocess")
                .start();
            
            try (Tracer.SpanInScope preprocessScope = tracer.withSpanInScope(preprocessSpan)) {
                String processedInput = preprocessInput(input);
                preprocessSpan.tag("processed.length", String.valueOf(processedInput.length()));
                
                // Model call phase
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

## Logging

### 1. Structured Logging

```java
@Service
public class StructuredLoggingService {
    
    private final Logger logger = LoggerFactory.getLogger(StructuredLoggingService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public String processWithLogging(String input) {
        String requestId = UUID.randomUUID().toString();
        
        // Request start log
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
            
            // Request success log
            logEvent("request.completed", Map.of(
                "requestId", requestId,
                "resultLength", result.length(),
                "duration", calculateDuration(),
                "status", "success"
            ));
            
            return result;
            
        } catch (Exception e) {
            // Request failure log
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

### 2. Sensitive Data Masking

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
        
        // Mask emails
        sanitized = emailPattern.matcher(sanitized)
            .replaceAll(match -> maskEmail(match.group()));
        
        // Mask phones
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

## Health Checks

### 1. Custom Health Indicators

```java
@Component
public class AIServiceHealthIndicator implements HealthIndicator {
    
    private final ChatClient chatClient;
    
    @Override
    public Health health() {
        try {
            // Test model connection
            String testResponse = chatClient.prompt()
                .user("Health check")
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

### 2. Vector Store Health Check

```java
@Component
public class VectorStoreHealthIndicator implements HealthIndicator {
    
    private final VectorStore vectorStore;
    
    @Override
    public Health health() {
        try {
            // Test vector store connection
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

## Alerting and Notifications

### 1. Metrics-based Alerting

```java
@Component
public class AIMetricsAlertService {
    
    private final MeterRegistry meterRegistry;
    private final NotificationService notificationService;
    
    @Scheduled(fixedRate = 60000) // Check every minute
    public void checkMetrics() {
        // Check error rate
        double errorRate = getErrorRate();
        if (errorRate > 0.05) { // Error rate exceeds 5%
            sendAlert("High Error Rate", 
                     "AI service error rate is " + (errorRate * 100) + "%");
        }
        
        // Check response time
        double avgResponseTime = getAverageResponseTime();
        if (avgResponseTime > 5000) { // Response time exceeds 5 seconds
            sendAlert("High Response Time", 
                     "AI service average response time is " + avgResponseTime + "ms");
        }
        
        // Check token usage
        double tokenUsage = getTokenUsage();
        if (tokenUsage > 1000000) { // Token usage exceeds 1 million
            sendAlert("High Token Usage", 
                     "Token usage in last hour: " + tokenUsage);
        }
    }
    
    private void sendAlert(String title, String message) {
        notificationService.sendAlert(AlertLevel.WARNING, title, message);
    }
}
```

## Performance Analysis

### 1. Performance Benchmarking

```java
@Component
public class AIPerformanceBenchmark {
    
    private final ChatClient chatClient;
    private final MeterRegistry meterRegistry;
    
    @Scheduled(cron = "0 0 2 * * ?") // Execute daily at 2 AM
    public void runBenchmark() {
        List<String> testQueries = loadTestQueries();
        
        for (String query : testQueries) {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            try {
                String response = chatClient.prompt()
                    .user(query)
                    .call()
                    .content();
                
                // Record performance metrics
                sample.stop(Timer.builder("benchmark.query.duration")
                    .tag("query.type", classifyQuery(query))
                    .register(meterRegistry));
                
                // Record response quality metrics
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

## Monitoring Dashboard

### 1. Grafana Dashboard Configuration

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

### 2. Custom Monitoring Endpoints

```java
@RestController
@RequestMapping("/monitoring")
public class MonitoringController {
    
    private final MeterRegistry meterRegistry;
    private final AIServiceHealthIndicator healthIndicator;
    
    @GetMapping("/metrics/summary")
    public Map<String, Object> getMetricsSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        // Get call statistics
        Counter callCounter = meterRegistry.find("spring.ai.chat.client.calls.total").counter();
        summary.put("totalCalls", callCounter != null ? callCounter.count() : 0);
        
        // Get average response time
        Timer responseTimer = meterRegistry.find("spring.ai.chat.client.calls.duration").timer();
        summary.put("avgResponseTime", responseTimer != null ? responseTimer.mean(TimeUnit.MILLISECONDS) : 0);
        
        // Get error rate
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

## Best Practices

### 1. Monitoring Strategy

- **Layered Monitoring**: Application layer, service layer, infrastructure layer
- **Key Metrics**: Response time, error rate, throughput, resource usage
- **Alert Configuration**: Set reasonable alert thresholds to avoid alert fatigue
- **Data Retention**: Set appropriate data retention policies based on requirements

### 2. Performance Optimization

- **Metric Sampling**: Appropriately reduce sampling rates in high-concurrency scenarios
- **Asynchronous Processing**: Use asynchronous methods to collect and send monitoring data
- **Batch Operations**: Send metric data in batches to reduce network overhead
- **Caching Strategy**: Use caching appropriately to reduce redundant calculations

### 3. Security Considerations

- **Data Masking**: Ensure sensitive information is not logged
- **Access Control**: Restrict access to monitoring data
- **Data Encryption**: Use encryption when transmitting and storing monitoring data
- **Audit Logs**: Record monitoring system operation logs

## Summary

Spring AI Alibaba provides a complete monitoring and observability solution, helping developers comprehensively understand AI application runtime status through metrics collection, distributed tracing, logging, and other means.

Key Points:
- Automatically collect core AI metrics
- Support custom monitoring and tracing
- Provide health checks and alerting mechanisms
- Integrate with mainstream monitoring tools and platforms
- Follow monitoring best practices to ensure system observability
