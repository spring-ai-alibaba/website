---
title: 可观测性 (Observability)
description: Spring AI Alibaba 多智能体可观测性
---

# 可观测性 (Observability)

多智能体系统的可观测性是确保系统稳定运行、快速问题定位和性能优化的关键。Spring AI Alibaba 提供了全面的可观测性解决方案。

## 核心组件

### 1. 指标监控 (Metrics)
- 执行性能指标
- 资源使用指标
- 业务指标
- 自定义指标

### 2. 日志记录 (Logging)
- 结构化日志
- 分布式追踪
- 错误日志
- 审计日志

### 3. 链路追踪 (Tracing)
- 跨智能体追踪
- 执行路径可视化
- 性能瓶颈识别
- 依赖关系分析

### 4. 告警通知 (Alerting)
- 实时告警
- 告警升级
- 通知渠道
- 告警抑制

## 基本配置

```java
@Configuration
@EnableObservability
public class ObservabilityConfig {
    
    @Bean
    public MeterRegistry meterRegistry() {
        return new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
    }
    
    @Bean
    public Tracing tracing() {
        return Tracing.newBuilder()
            .localServiceName("spring-ai-multi-agent")
            .spanReporter(spanReporter())
            .build();
    }
    
    @Bean
    public ObservabilityManager observabilityManager() {
        return ObservabilityManager.builder()
            .meterRegistry(meterRegistry())
            .tracing(tracing())
            .alertManager(alertManager())
            .build();
    }
}
```

## 多智能体指标

### 执行指标

```java
@Component
public class MultiAgentMetrics {
    
    private final Counter agentExecutions;
    private final Timer executionDuration;
    private final Gauge activeAgents;
    private final Counter nodeExecutions;
    private final Timer nodeExecutionTime;
    
    public MultiAgentMetrics(MeterRegistry meterRegistry) {
        this.agentExecutions = Counter.builder("agent.executions.total")
            .description("Total agent executions")
            .register(meterRegistry);
            
        this.executionDuration = Timer.builder("agent.execution.duration")
            .description("Agent execution duration")
            .register(meterRegistry);
            
        this.activeAgents = Gauge.builder("agent.active.count")
            .description("Number of active agents")
            .register(meterRegistry, this, MultiAgentMetrics::getActiveAgentCount);
            
        this.nodeExecutions = Counter.builder("node.executions.total")
            .description("Total node executions")
            .register(meterRegistry);
            
        this.nodeExecutionTime = Timer.builder("node.execution.duration")
            .description("Node execution duration")
            .register(meterRegistry);
    }
    
    public void recordAgentExecution(String agentId, Duration duration, boolean success) {
        agentExecutions.increment(
            Tags.of(
                "agent_id", agentId,
                "status", success ? "success" : "error"
            )
        );
        
        executionDuration.record(duration, Tags.of("agent_id", agentId));
    }
    
    public void recordNodeExecution(String graphId, String nodeId, Duration duration, boolean success) {
        nodeExecutions.increment(
            Tags.of(
                "graph_id", graphId,
                "node_id", nodeId,
                "status", success ? "success" : "error"
            )
        );
        
        nodeExecutionTime.record(duration, 
            Tags.of("graph_id", graphId, "node_id", nodeId));
    }
    
    private double getActiveAgentCount() {
        return agentManager.getActiveAgentCount();
    }
}
```

### 协作指标

```java
@Component
public class CollaborationMetrics {
    
    private final Counter messagesSent;
    private final Counter messagesReceived;
    private final Timer collaborationLatency;
    private final Gauge teamSize;
    
    public CollaborationMetrics(MeterRegistry meterRegistry) {
        this.messagesSent = Counter.builder("collaboration.messages.sent")
            .description("Messages sent between agents")
            .register(meterRegistry);
            
        this.messagesReceived = Counter.builder("collaboration.messages.received")
            .description("Messages received by agents")
            .register(meterRegistry);
            
        this.collaborationLatency = Timer.builder("collaboration.latency")
            .description("Collaboration response latency")
            .register(meterRegistry);
            
        this.teamSize = Gauge.builder("team.size")
            .description("Team size")
            .register(meterRegistry, this, CollaborationMetrics::getAverageTeamSize);
    }
    
    public void recordMessageSent(String fromAgent, String toAgent, String messageType) {
        messagesSent.increment(
            Tags.of(
                "from_agent", fromAgent,
                "to_agent", toAgent,
                "message_type", messageType
            )
        );
    }
    
    public void recordCollaborationLatency(String teamId, Duration latency) {
        collaborationLatency.record(latency, Tags.of("team_id", teamId));
    }
    
    private double getAverageTeamSize() {
        return teamManager.getAverageTeamSize();
    }
}
```

## 分布式追踪

### 跨智能体追踪

```java
@Component
public class MultiAgentTracing {
    
    @Autowired
    private Tracing tracing;
    
    public Span startAgentExecution(String agentId, String taskType) {
        return tracing.tracer()
            .nextSpan()
            .name("agent.execution")
            .tag("agent.id", agentId)
            .tag("task.type", taskType)
            .start();
    }
    
    public Span startNodeExecution(String graphId, String nodeId, Span parentSpan) {
        return tracing.tracer()
            .nextSpan(parentSpan.context())
            .name("node.execution")
            .tag("graph.id", graphId)
            .tag("node.id", nodeId)
            .start();
    }
    
    public Span startCollaboration(String fromAgent, String toAgent, Span parentSpan) {
        return tracing.tracer()
            .nextSpan(parentSpan.context())
            .name("agent.collaboration")
            .tag("from.agent", fromAgent)
            .tag("to.agent", toAgent)
            .start();
    }
    
    public void recordExecutionResult(Span span, boolean success, String error) {
        span.tag("success", String.valueOf(success));
        if (!success && error != null) {
            span.tag("error", error);
        }
        span.end();
    }
}
```

### 执行路径可视化

```java
@Service
public class ExecutionPathService {
    
    @Autowired
    private SpanRepository spanRepository;
    
    public ExecutionPath getExecutionPath(String traceId) {
        List<Span> spans = spanRepository.findByTraceId(traceId);
        
        ExecutionPath path = ExecutionPath.builder()
            .traceId(traceId)
            .nodes(buildExecutionNodes(spans))
            .edges(buildExecutionEdges(spans))
            .totalDuration(calculateTotalDuration(spans))
            .build();
        
        return path;
    }
    
    private List<ExecutionNode> buildExecutionNodes(List<Span> spans) {
        return spans.stream()
            .map(span -> ExecutionNode.builder()
                .id(span.getSpanId())
                .name(span.getOperationName())
                .agentId(span.getTag("agent.id"))
                .nodeId(span.getTag("node.id"))
                .startTime(span.getStartTime())
                .duration(span.getDuration())
                .success(Boolean.parseBoolean(span.getTag("success")))
                .build())
            .collect(Collectors.toList());
    }
    
    private List<ExecutionEdge> buildExecutionEdges(List<Span> spans) {
        List<ExecutionEdge> edges = new ArrayList<>();
        
        Map<String, Span> spanMap = spans.stream()
            .collect(Collectors.toMap(Span::getSpanId, Function.identity()));
        
        for (Span span : spans) {
            if (span.getParentSpanId() != null) {
                Span parentSpan = spanMap.get(span.getParentSpanId());
                if (parentSpan != null) {
                    edges.add(ExecutionEdge.builder()
                        .from(parentSpan.getSpanId())
                        .to(span.getSpanId())
                        .type("execution")
                        .build());
                }
            }
        }
        
        return edges;
    }
}
```

## 结构化日志

### 多智能体日志

```java
@Component
public class MultiAgentLogger {
    
    private static final Logger logger = LoggerFactory.getLogger(MultiAgentLogger.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public void logAgentExecution(String agentId, String graphId, String nodeId, 
                                 ExecutionResult result) {
        try {
            Map<String, Object> logData = Map.of(
                "event", "agent_execution",
                "agent_id", agentId,
                "graph_id", graphId,
                "node_id", nodeId,
                "success", result.isSuccess(),
                "duration_ms", result.getDuration().toMillis(),
                "timestamp", Instant.now(),
                "trace_id", getCurrentTraceId()
            );
            
            logger.info(objectMapper.writeValueAsString(logData));
        } catch (Exception e) {
            logger.error("Failed to log agent execution", e);
        }
    }
    
    public void logCollaboration(String fromAgent, String toAgent, String messageType, 
                               Object messageContent) {
        try {
            Map<String, Object> logData = Map.of(
                "event", "agent_collaboration",
                "from_agent", fromAgent,
                "to_agent", toAgent,
                "message_type", messageType,
                "message_size", calculateMessageSize(messageContent),
                "timestamp", Instant.now(),
                "trace_id", getCurrentTraceId()
            );
            
            logger.info(objectMapper.writeValueAsString(logData));
        } catch (Exception e) {
            logger.error("Failed to log collaboration", e);
        }
    }
    
    public void logError(String agentId, String nodeId, Exception error) {
        try {
            Map<String, Object> logData = Map.of(
                "event", "agent_error",
                "agent_id", agentId,
                "node_id", nodeId,
                "error_type", error.getClass().getSimpleName(),
                "error_message", error.getMessage(),
                "stack_trace", getStackTrace(error),
                "timestamp", Instant.now(),
                "trace_id", getCurrentTraceId()
            );
            
            logger.error(objectMapper.writeValueAsString(logData));
        } catch (Exception e) {
            logger.error("Failed to log error", e);
        }
    }
    
    private String getCurrentTraceId() {
        return tracing.tracer().currentSpan() != null ? 
            tracing.tracer().currentSpan().context().traceId() : "unknown";
    }
}
```

## 实时监控

### 监控仪表板

```java
@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {
    
    @Autowired
    private MonitoringService monitoringService;
    
    @GetMapping("/dashboard")
    public ResponseEntity<MonitoringDashboard> getDashboard() {
        MonitoringDashboard dashboard = monitoringService.generateDashboard();
        return ResponseEntity.ok(dashboard);
    }
    
    @GetMapping("/agents/status")
    public ResponseEntity<List<AgentStatus>> getAgentStatus() {
        List<AgentStatus> statuses = monitoringService.getAgentStatuses();
        return ResponseEntity.ok(statuses);
    }
    
    @GetMapping("/executions/active")
    public ResponseEntity<List<ActiveExecution>> getActiveExecutions() {
        List<ActiveExecution> executions = monitoringService.getActiveExecutions();
        return ResponseEntity.ok(executions);
    }
    
    @GetMapping("/metrics/summary")
    public ResponseEntity<MetricsSummary> getMetricsSummary() {
        MetricsSummary summary = monitoringService.getMetricsSummary();
        return ResponseEntity.ok(summary);
    }
}

@Service
public class MonitoringService {
    
    public MonitoringDashboard generateDashboard() {
        return MonitoringDashboard.builder()
            .totalAgents(agentManager.getTotalAgentCount())
            .activeAgents(agentManager.getActiveAgentCount())
            .totalExecutions(executionManager.getTotalExecutionCount())
            .activeExecutions(executionManager.getActiveExecutionCount())
            .averageExecutionTime(metricsService.getAverageExecutionTime())
            .successRate(metricsService.getSuccessRate())
            .errorRate(metricsService.getErrorRate())
            .systemHealth(healthService.getSystemHealth())
            .build();
    }
    
    public List<AgentStatus> getAgentStatuses() {
        return agentManager.getAllAgents().stream()
            .map(agent -> AgentStatus.builder()
                .agentId(agent.getId())
                .name(agent.getName())
                .status(agent.getStatus())
                .lastActivity(agent.getLastActivity())
                .currentTask(agent.getCurrentTask())
                .performance(calculatePerformance(agent))
                .build())
            .collect(Collectors.toList());
    }
}
```

### 实时事件流

```java
@Component
public class RealTimeEventStream {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @EventListener
    public void onAgentExecution(AgentExecutionEvent event) {
        ExecutionUpdate update = ExecutionUpdate.builder()
            .agentId(event.getAgentId())
            .nodeId(event.getNodeId())
            .status(event.getStatus())
            .timestamp(event.getTimestamp())
            .build();
        
        messagingTemplate.convertAndSend("/topic/executions", update);
    }
    
    @EventListener
    public void onCollaboration(CollaborationEvent event) {
        CollaborationUpdate update = CollaborationUpdate.builder()
            .fromAgent(event.getFromAgent())
            .toAgent(event.getToAgent())
            .messageType(event.getMessageType())
            .timestamp(event.getTimestamp())
            .build();
        
        messagingTemplate.convertAndSend("/topic/collaboration", update);
    }
    
    @EventListener
    public void onError(ErrorEvent event) {
        ErrorUpdate update = ErrorUpdate.builder()
            .agentId(event.getAgentId())
            .nodeId(event.getNodeId())
            .errorType(event.getErrorType())
            .errorMessage(event.getErrorMessage())
            .timestamp(event.getTimestamp())
            .build();
        
        messagingTemplate.convertAndSend("/topic/errors", update);
    }
}
```

## 告警系统

### 智能告警

```java
@Component
public class IntelligentAlertingService {
    
    @Autowired
    private AlertManager alertManager;
    
    @Autowired
    private ChatClient chatClient;
    
    @EventListener
    public void onMetricThresholdExceeded(MetricThresholdEvent event) {
        if (shouldTriggerAlert(event)) {
            Alert alert = generateIntelligentAlert(event);
            alertManager.sendAlert(alert);
        }
    }
    
    private boolean shouldTriggerAlert(MetricThresholdEvent event) {
        // 使用AI判断是否需要告警
        String analysisPrompt = String.format("""
            分析以下指标异常，判断是否需要触发告警：
            
            指标名称：%s
            当前值：%s
            阈值：%s
            历史趋势：%s
            
            考虑因素：
            1. 异常的严重程度
            2. 对系统的影响
            3. 历史模式
            4. 当前系统状态
            
            请回答：是否需要告警（true/false）和原因。
            """, 
            event.getMetricName(),
            event.getCurrentValue(),
            event.getThreshold(),
            event.getHistoricalTrend()
        );
        
        AlertDecision decision = chatClient.prompt()
            .user(analysisPrompt)
            .call()
            .entity(AlertDecision.class);
        
        return decision.shouldAlert();
    }
    
    private Alert generateIntelligentAlert(MetricThresholdEvent event) {
        String alertPrompt = String.format("""
            为以下指标异常生成告警信息：
            
            指标：%s
            异常值：%s
            影响范围：%s
            
            请生成：
            1. 告警标题
            2. 问题描述
            3. 可能原因
            4. 建议操作
            5. 严重级别
            """, 
            event.getMetricName(),
            event.getCurrentValue(),
            event.getImpactScope()
        );
        
        AlertContent content = chatClient.prompt()
            .user(alertPrompt)
            .call()
            .entity(AlertContent.class);
        
        return Alert.builder()
            .title(content.getTitle())
            .description(content.getDescription())
            .severity(content.getSeverity())
            .possibleCauses(content.getPossibleCauses())
            .suggestedActions(content.getSuggestedActions())
            .timestamp(Instant.now())
            .build();
    }
}
```

## 性能分析

### 性能瓶颈识别

```java
@Service
public class PerformanceAnalysisService {
    
    @Autowired
    private ChatClient chatClient;
    
    public PerformanceAnalysisReport analyzePerformance(String timeRange) {
        // 收集性能数据
        PerformanceData data = collectPerformanceData(timeRange);
        
        // 使用AI分析性能瓶颈
        String analysisPrompt = String.format("""
            分析以下多智能体系统性能数据，识别瓶颈和优化建议：
            
            执行时间分布：%s
            资源使用情况：%s
            错误率统计：%s
            协作延迟：%s
            
            请提供：
            1. 主要性能瓶颈
            2. 根本原因分析
            3. 优化建议
            4. 优先级排序
            """, 
            data.getExecutionTimeDistribution(),
            data.getResourceUsage(),
            data.getErrorRateStats(),
            data.getCollaborationLatency()
        );
        
        PerformanceAnalysis analysis = chatClient.prompt()
            .user(analysisPrompt)
            .call()
            .entity(PerformanceAnalysis.class);
        
        return PerformanceAnalysisReport.builder()
            .timeRange(timeRange)
            .performanceData(data)
            .analysis(analysis)
            .generatedAt(Instant.now())
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
spring.ai.observability.metrics.custom.enabled=true

# 追踪配置
spring.ai.observability.tracing.zipkin.endpoint=http://localhost:9411/api/v2/spans
spring.ai.observability.tracing.sampling.probability=0.1
spring.ai.observability.tracing.baggage.enabled=true

# 日志配置
spring.ai.observability.logging.structured=true
spring.ai.observability.logging.level=INFO
spring.ai.observability.logging.include-trace-id=true

# 告警配置
spring.ai.observability.alerting.enabled=true
spring.ai.observability.alerting.intelligent=true
spring.ai.observability.alerting.channels=email,webhook,slack

# 监控配置
spring.ai.observability.monitoring.dashboard.enabled=true
spring.ai.observability.monitoring.real-time.enabled=true
spring.ai.observability.monitoring.retention-days=30
```

## 最佳实践

### 1. 指标设计
- 选择有意义的业务指标
- 避免高基数标签
- 实施分层监控

### 2. 追踪策略
- 合理设置采样率
- 追踪关键路径
- 包含上下文信息

### 3. 日志管理
- 使用结构化日志
- 包含追踪标识
- 实施日志聚合

### 4. 告警优化
- 设置合理阈值
- 实施告警抑制
- 提供可操作信息

## 下一步

- [了解持久执行与时间旅行](./state-context-management/durable-execution/)
- [学习子图](/docs/1.0.0.3/multi-agent/subgraphs/)
- [探索 Playground](/docs/1.0.0.3/playground/studio/)
