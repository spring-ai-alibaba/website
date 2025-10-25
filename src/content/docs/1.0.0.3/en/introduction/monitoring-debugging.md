---
title: Monitoring & Debugging
keywords: [Spring AI Alibaba, Observability, Monitoring, Debugging, ARMS, Langfuse, OpenTelemetry]
description: "Learn about Spring AI Alibaba's monitoring and debugging capabilities, including ARMS integration, Langfuse support, distributed tracing, and enterprise-grade observability solutions."
---

## Overview

In AI application production environments, observability is a critical capability for ensuring stable system operation. Spring AI Alibaba provides a complete monitoring and debugging solution to help developers and operations teams:

- **Performance Monitoring**: Real-time monitoring of model call performance and resource usage
- **Error Tracking**: Quickly locate and resolve system exceptions
- **Cost Control**: Monitor token usage and API call costs
- **Quality Assessment**: Evaluate model output quality and user satisfaction
- **Distributed Tracing**: Complete request chain visualization

## Core Observability Capabilities

### 1. Automatic Instrumentation

Spring AI Alibaba automatically instruments key points without requiring manual monitoring code:

- **Model Calls**: Record latency, token usage, and costs for each LLM call
- **Tool Calls**: Monitor external tool and API invocations
- **Vector Retrieval**: Track vector search performance in RAG systems
- **Graph Execution**: Monitor multi-agent system execution flows
- **MCP Communication**: Record Model Context Protocol interactions

### 2. Metrics Collection

The framework automatically collects multi-dimensional performance metrics:

```java
// Example of automatically collected metrics
- ai.model.call.duration          // Model call duration
- ai.model.call.tokens.input      // Input token count
- ai.model.call.tokens.output     // Output token count
- ai.tool.call.duration           // Tool call duration
- ai.vector.search.duration       // Vector search duration
- ai.graph.node.execution.time    // Graph node execution time
```

### 3. Distributed Tracing

Based on OpenTelemetry standards, providing complete distributed tracing:

```java
@RestController
public class ChatController {
    
    private final ChatClient chatClient;
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        // Automatically generates traces with complete call chains
        return chatClient.prompt()
            .user(message)
            .tools(weatherTool)  // Tool calls are also traced
            .call()
            .content();
    }
}
```

## ARMS Integration

Alibaba Cloud Application Real-Time Monitoring Service (ARMS) provides enterprise-grade observability support for Spring AI Alibaba.

### 1. Quick Integration

#### Add Dependencies

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-arms-observation</artifactId>
</dependency>

<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
```

#### Configure OpenTelemetry

```java
@Configuration
public class ObservabilityConfig {
    
    @Bean
    public OpenTelemetry openTelemetry() {
        // Use GlobalOpenTelemetry to get SDK instance from Java Agent
        return GlobalOpenTelemetry.get();
    }
}
```

#### Application Configuration

```properties
# Enable ARMS observability
spring.ai.alibaba.arms.enabled=true

# Application information
spring.application.name=my-ai-application

# DashScope configuration
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
```

### 2. Java Agent Configuration

Download and configure Aliyun Java Agent:

```bash
# Startup parameters
-javaagent:/path/to/aliyun-java-agent.jar
-Darms.licenseKey=${YOUR_LICENSE_KEY}
-Darms.appName=my-ai-application
```

### 3. Kubernetes Deployment

For K8S environments, use ack-onepilot:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-application
spec:
  template:
    metadata:
      labels:
        arms.prometheus.io/scrape: "true"
        arms.appName: "my-ai-application"
    spec:
      containers:
      - name: app
        image: my-ai-app:latest
        env:
        - name: DASHSCOPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: dashscope-api-key
```

### 4. Monitoring Results

ARMS console will display:

- **Application Topology**: Visualized application dependencies
- **Call Chains**: Detailed request execution paths
- **Performance Metrics**: Response time, throughput, error rates
- **AI-specific Metrics**: Token usage, model call costs
- **Exception Analysis**: Automatic detection and analysis of exception patterns

## Langfuse Integration

Langfuse is an observability platform specifically designed for LLM applications, with native support from Spring AI Alibaba.

### 1. Cloud Service Configuration

#### Registration and Setup

1. Register an account at [Langfuse Cloud](https://cloud.langfuse.com)
2. Create a new project and obtain API keys
3. Configure Base64-encoded credentials:

```bash
# Encode credentials
echo -n "public_key:secret_key" | base64
```

#### Application Configuration

```yaml
# OpenTelemetry configuration
otel:
  service:
    name: my-ai-application
  resource:
    attributes:
      deployment.environment: production
  traces:
    exporter: otlp
    sampler: always_on
  metrics:
    exporter: otlp
  exporter:
    otlp:
      endpoint: "https://cloud.langfuse.com/api/public/otel"
      headers:
        Authorization: "Basic ${YOUR_BASE64_ENCODED_CREDENTIALS}"
```

### 2. Local Deployment

```yaml
# Local Langfuse configuration
otel:
  exporter:
    otlp:
      endpoint: "http://localhost:3000/api/public/otel"
      headers:
        Authorization: "Basic ${YOUR_BASE64_ENCODED_CREDENTIALS}"
```

### 3. Monitoring Features

Langfuse provides professional LLM monitoring capabilities:

- **Session Tracking**: Complete conversation history and context
- **Prompt Management**: Versioned prompt template management
- **Cost Analysis**: Detailed token usage and cost statistics
- **Quality Assessment**: Model output quality scoring and analysis
- **User Feedback**: Integrated user evaluation and feedback mechanisms

## Custom Monitoring

### 1. Custom Metrics

```java
@Component
public class CustomMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Counter businessLogicCounter;
    private final Timer businessLogicTimer;
    
    public CustomMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.businessLogicCounter = Counter.builder("ai.business.operations")
            .description("Business logic operations count")
            .register(meterRegistry);
        this.businessLogicTimer = Timer.builder("ai.business.duration")
            .description("Business logic execution time")
            .register(meterRegistry);
    }
    
    public void recordBusinessOperation() {
        businessLogicCounter.increment();
    }
    
    public void recordBusinessDuration(Duration duration) {
        businessLogicTimer.record(duration);
    }
}
```

### 2. Custom Spans

```java
@Service
public class CustomTracing {
    
    private final Tracer tracer;
    
    public CustomTracing(Tracer tracer) {
        this.tracer = tracer;
    }
    
    public String processWithTracing(String input) {
        Span span = tracer.nextSpan()
            .name("custom.processing")
            .tag("input.length", String.valueOf(input.length()))
            .start();
            
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            // Business logic processing
            String result = doProcessing(input);
            
            span.tag("output.length", String.valueOf(result.length()));
            return result;
        } catch (Exception e) {
            span.tag("error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### 3. Health Checks

```java
@Component
public class AIHealthIndicator implements HealthIndicator {
    
    private final ChatClient chatClient;
    
    @Override
    public Health health() {
        try {
            // Simple health check
            String response = chatClient.prompt("ping").call().content();
            
            return Health.up()
                .withDetail("model", "available")
                .withDetail("response_time", "< 1s")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("model", "unavailable")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

## Debugging Tools

### 1. Logging Configuration

```properties
# Enable detailed logging
logging.level.org.springframework.ai=DEBUG
logging.level.com.alibaba.cloud.ai=DEBUG

# Component-specific logging
logging.level.org.springframework.ai.chat=TRACE
logging.level.org.springframework.ai.tool=DEBUG
```

### 2. Development Environment Debugging

```java
@Configuration
@Profile("dev")
public class DebugConfig {
    
    @Bean
    public ChatClient debugChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultAdvisors(
                new SimpleLoggerAdvisor(),  // Logging
                new DebugAdvisor()          // Debug information
            )
            .build();
    }
}
```

### 3. Graph Visualization Debugging

```java
@Configuration
public class GraphDebugConfig {
    
    @Bean
    public CompiledGraph debugGraph(StateGraph stateGraph) throws GraphStateException {
        return stateGraph.compile(CompileConfig.builder()
            .checkpointer(new MemoryCheckpointer())  // Enable checkpoints
            .debug(true)                             // Enable debug mode
            .build());
    }
}
```

## Performance Optimization

### 1. Monitoring Metrics

Regularly check these key metrics:

- **Response Time**: P95, P99 response times
- **Throughput**: Requests per second (RPS)
- **Error Rate**: 4xx, 5xx error percentages
- **Resource Usage**: CPU, memory, network utilization
- **Token Consumption**: Input/output token ratios

### 2. Performance Tuning

```properties
# Connection pool configuration
spring.ai.dashscope.chat.options.timeout=30s
spring.ai.dashscope.chat.options.max-retries=3

# Cache configuration
spring.cache.type=redis
spring.cache.redis.time-to-live=3600s

# Thread pool configuration
spring.task.execution.pool.core-size=10
spring.task.execution.pool.max-size=50
```

### 3. Alert Configuration

```yaml
# ARMS alert rules example
alerts:
  - name: "AI Model High Latency"
    condition: "ai_model_call_duration_p95 > 5000"
    action: "send_notification"
  
  - name: "High Error Rate"
    condition: "error_rate > 0.05"
    action: "send_alert"
  
  - name: "Token Usage Spike"
    condition: "token_usage_rate > 1000"
    action: "send_warning"
```

## Best Practices

### 1. Monitoring Strategy

- **Layered Monitoring**: Application layer, framework layer, infrastructure layer
- **Key Metrics**: Focus on business-critical metrics
- **Real-time Alerts**: Set reasonable alert thresholds
- **Regular Reviews**: Periodically analyze monitoring data and trends

### 2. Debugging Techniques

- **Progressive Debugging**: Troubleshoot from simple to complex
- **Log Analysis**: Make full use of structured logging
- **Distributed Tracing**: Use distributed tracing to locate issues
- **Performance Analysis**: Regular performance benchmarking

### 3. Production Environment Considerations

- **Sensitive Information**: Avoid logging sensitive data
- **Performance Impact**: Monitor the performance overhead of monitoring systems
- **Data Retention**: Set reasonable monitoring data retention periods
- **Access Control**: Strictly control access to monitoring data

## Summary

Spring AI Alibaba's monitoring and debugging capabilities provide comprehensive observability support for AI applications. Through ARMS and Langfuse integration, developers can:

- Monitor application performance and health in real-time
- Quickly locate and resolve issues
- Optimize costs and resource usage
- Improve user experience and system stability

We recommend integrating monitoring capabilities from the early stages of your project to establish a comprehensive observability system that ensures long-term stable operation of your applications.
