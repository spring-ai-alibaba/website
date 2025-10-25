---
title: 监控与调试 (Monitoring & Debugging)
keywords: [Spring AI Alibaba, 可观测性, 监控, 调试, ARMS, Langfuse, OpenTelemetry]
description: "了解 Spring AI Alibaba 的监控与调试能力，包括 ARMS 集成、Langfuse 支持、链路追踪等企业级可观测性解决方案。"
---

## 概述

在 AI 应用的生产环境中，可观测性是确保系统稳定运行的关键能力。Spring AI Alibaba 提供了完整的监控与调试解决方案，帮助开发者和运维人员：

- **性能监控**：实时监控模型调用性能和资源使用情况
- **错误追踪**：快速定位和解决系统异常
- **成本控制**：监控 Token 使用量和 API 调用成本
- **质量评估**：评估模型输出质量和用户满意度
- **链路追踪**：完整的请求链路可视化

## 核心可观测性能力

### 1. 自动埋点

Spring AI Alibaba 在关键节点自动进行埋点，无需手动添加监控代码：

- **模型调用**：记录每次 LLM 调用的延迟、Token 使用量、成本等
- **工具调用**：监控外部工具和 API 的调用情况
- **向量检索**：追踪 RAG 系统中的向量搜索性能
- **Graph 执行**：监控多智能体系统的执行流程
- **MCP 通信**：记录模型上下文协议的交互过程

### 2. 指标收集

框架自动收集多维度的性能指标：

```java
// 自动收集的指标示例
- ai.model.call.duration          // 模型调用耗时
- ai.model.call.tokens.input      // 输入 Token 数量
- ai.model.call.tokens.output     // 输出 Token 数量
- ai.tool.call.duration           // 工具调用耗时
- ai.vector.search.duration       // 向量搜索耗时
- ai.graph.node.execution.time    // Graph 节点执行时间
```

### 3. 链路追踪

基于 OpenTelemetry 标准，提供完整的分布式链路追踪：

```java
@RestController
public class ChatController {
    
    private final ChatClient chatClient;
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        // 自动生成 Trace，包含完整的调用链路
        return chatClient.prompt()
            .user(message)
            .tools(weatherTool)  // 工具调用也会被追踪
            .call()
            .content();
    }
}
```

## ARMS 集成

阿里云应用实时监控服务（ARMS）为 Spring AI Alibaba 提供了企业级的可观测性支持。

### 1. 快速接入

#### 添加依赖

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

#### 配置 OpenTelemetry

```java
@Configuration
public class ObservabilityConfig {
    
    @Bean
    public OpenTelemetry openTelemetry() {
        // 使用 GlobalOpenTelemetry 获取 Java Agent 中的 SDK 实例
        return GlobalOpenTelemetry.get();
    }
}
```

#### 应用配置

```properties
# 启用 ARMS 可观测性
spring.ai.alibaba.arms.enabled=true

# 应用信息
spring.application.name=my-ai-application

# DashScope 配置
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
```

### 2. Java Agent 配置

下载并配置 Aliyun Java Agent：

```bash
# 启动参数
-javaagent:/path/to/aliyun-java-agent.jar
-Darms.licenseKey=${YOUR_LICENSE_KEY}
-Darms.appName=my-ai-application
```

### 3. Kubernetes 部署

对于 K8S 环境，可以使用 ack-onepilot：

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

### 4. 监控效果

ARMS 控制台将显示：

- **应用拓扑图**：可视化应用依赖关系
- **调用链路**：详细的请求执行路径
- **性能指标**：响应时间、吞吐量、错误率
- **AI 专项指标**：Token 使用量、模型调用成本
- **异常分析**：自动检测和分析异常模式

## Langfuse 集成

Langfuse 是专门为 LLM 应用设计的可观测性平台，Spring AI Alibaba 提供了原生支持。

### 1. 云端服务配置

#### 注册和配置

1. 在 [Langfuse Cloud](https://cloud.langfuse.com) 注册账户
2. 创建新项目并获取 API 密钥
3. 配置 Base64 编码的凭据：

```bash
# 编码凭据
echo -n "public_key:secret_key" | base64
```

#### 应用配置

```yaml
# OpenTelemetry 配置
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

### 2. 本地部署

```yaml
# 本地 Langfuse 配置
otel:
  exporter:
    otlp:
      endpoint: "http://localhost:3000/api/public/otel"
      headers:
        Authorization: "Basic ${YOUR_BASE64_ENCODED_CREDENTIALS}"
```

### 3. 监控功能

Langfuse 提供专业的 LLM 监控能力：

- **会话追踪**：完整的对话历史和上下文
- **Prompt 管理**：版本化的 Prompt 模板管理
- **成本分析**：详细的 Token 使用和成本统计
- **质量评估**：模型输出质量评分和分析
- **用户反馈**：集成用户评价和反馈机制

## 自定义监控

### 1. 自定义指标

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

### 2. 自定义 Span

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
            // 业务逻辑处理
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

### 3. 健康检查

```java
@Component
public class AIHealthIndicator implements HealthIndicator {
    
    private final ChatClient chatClient;
    
    @Override
    public Health health() {
        try {
            // 简单的健康检查
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

## 调试工具

### 1. 日志配置

```properties
# 启用详细日志
logging.level.org.springframework.ai=DEBUG
logging.level.com.alibaba.cloud.ai=DEBUG

# 特定组件日志
logging.level.org.springframework.ai.chat=TRACE
logging.level.org.springframework.ai.tool=DEBUG
```

### 2. 开发环境调试

```java
@Configuration
@Profile("dev")
public class DebugConfig {
    
    @Bean
    public ChatClient debugChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultAdvisors(
                new SimpleLoggerAdvisor(),  // 日志记录
                new DebugAdvisor()          // 调试信息
            )
            .build();
    }
}
```

### 3. Graph 可视化调试

```java
@Configuration
public class GraphDebugConfig {
    
    @Bean
    public CompiledGraph debugGraph(StateGraph stateGraph) throws GraphStateException {
        return stateGraph.compile(CompileConfig.builder()
            .checkpointer(new MemoryCheckpointer())  // 启用检查点
            .debug(true)                             // 启用调试模式
            .build());
    }
}
```

## 性能优化

### 1. 监控指标

定期检查以下关键指标：

- **响应时间**：P95、P99 响应时间
- **吞吐量**：每秒请求数（RPS）
- **错误率**：4xx、5xx 错误比例
- **资源使用**：CPU、内存、网络使用率
- **Token 消耗**：输入/输出 Token 比例

### 2. 性能调优

```properties
# 连接池配置
spring.ai.dashscope.chat.options.timeout=30s
spring.ai.dashscope.chat.options.max-retries=3

# 缓存配置
spring.cache.type=redis
spring.cache.redis.time-to-live=3600s

# 线程池配置
spring.task.execution.pool.core-size=10
spring.task.execution.pool.max-size=50
```

### 3. 告警配置

```yaml
# ARMS 告警规则示例
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

## 最佳实践

### 1. 监控策略

- **分层监控**：应用层、框架层、基础设施层
- **关键指标**：专注于业务关键指标
- **实时告警**：设置合理的告警阈值
- **定期回顾**：定期分析监控数据和趋势

### 2. 调试技巧

- **渐进式调试**：从简单到复杂逐步排查
- **日志分析**：充分利用结构化日志
- **链路追踪**：使用分布式追踪定位问题
- **性能分析**：定期进行性能基准测试

### 3. 生产环境注意事项

- **敏感信息**：避免在日志中记录敏感数据
- **性能影响**：监控系统本身的性能开销
- **数据保留**：合理设置监控数据保留期
- **权限控制**：严格控制监控数据访问权限

## 总结

Spring AI Alibaba 的监控与调试能力为 AI 应用提供了全方位的可观测性支持。通过 ARMS 和 Langfuse 的集成，开发者可以：

- 实时监控应用性能和健康状态
- 快速定位和解决问题
- 优化成本和资源使用
- 提升用户体验和系统稳定性

建议在项目初期就集成监控能力，建立完善的可观测性体系，为应用的长期稳定运行提供保障。
