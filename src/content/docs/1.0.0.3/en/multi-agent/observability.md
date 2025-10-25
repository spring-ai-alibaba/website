---
title: Observability
description: Spring AI Alibaba multi-agent observability
---

# Observability

Observability is crucial for ensuring stable operation of multi-agent systems, quick problem identification, and performance optimization. Spring AI Alibaba provides comprehensive observability solutions.

## Core Components

### 1. Metrics Monitoring
- Execution performance metrics
- Resource usage metrics
- Business metrics
- Custom metrics

### 2. Logging
- Structured logging
- Distributed tracing
- Error logging
- Audit logging

### 3. Distributed Tracing
- Cross-agent tracing
- Execution path visualization
- Performance bottleneck identification
- Dependency analysis

### 4. Alerting
- Real-time alerts
- Alert escalation
- Notification channels
- Alert suppression

## Basic Configuration

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

## Multi-Agent Metrics

### Execution Metrics

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

### Collaboration Metrics

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

## Distributed Tracing

### Cross-Agent Tracing

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

### Execution Path Visualization

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

## Structured Logging

### Multi-Agent Logging

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

## Real-time Monitoring

### Monitoring Dashboard

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

### Real-time Event Streaming

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

## Alert System

### Intelligent Alerting

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
        // Use AI to determine if alert is needed
        String analysisPrompt = String.format("""
            Analyze the following metric anomaly and determine if an alert should be triggered:
            
            Metric Name: %s
            Current Value: %s
            Threshold: %s
            Historical Trend: %s
            
            Consider:
            1. Severity of the anomaly
            2. Impact on the system
            3. Historical patterns
            4. Current system state
            
            Please answer: Should alert (true/false) and reason.
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
            Generate alert information for the following metric anomaly:
            
            Metric: %s
            Anomaly Value: %s
            Impact Scope: %s
            
            Please provide:
            1. Alert title
            2. Problem description
            3. Possible causes
            4. Suggested actions
            5. Severity level
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

## Performance Analysis

### Performance Bottleneck Identification

```java
@Service
public class PerformanceAnalysisService {
    
    @Autowired
    private ChatClient chatClient;
    
    public PerformanceAnalysisReport analyzePerformance(String timeRange) {
        // Collect performance data
        PerformanceData data = collectPerformanceData(timeRange);
        
        // Use AI to analyze performance bottlenecks
        String analysisPrompt = String.format("""
            Analyze the following multi-agent system performance data and identify bottlenecks and optimization recommendations:
            
            Execution Time Distribution: %s
            Resource Usage: %s
            Error Rate Statistics: %s
            Collaboration Latency: %s
            
            Please provide:
            1. Main performance bottlenecks
            2. Root cause analysis
            3. Optimization recommendations
            4. Priority ranking
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
spring.ai.observability.metrics.custom.enabled=true

# Tracing configuration
spring.ai.observability.tracing.zipkin.endpoint=http://localhost:9411/api/v2/spans
spring.ai.observability.tracing.sampling.probability=0.1
spring.ai.observability.tracing.baggage.enabled=true

# Logging configuration
spring.ai.observability.logging.structured=true
spring.ai.observability.logging.level=INFO
spring.ai.observability.logging.include-trace-id=true

# Alerting configuration
spring.ai.observability.alerting.enabled=true
spring.ai.observability.alerting.intelligent=true
spring.ai.observability.alerting.channels=email,webhook,slack

# Monitoring configuration
spring.ai.observability.monitoring.dashboard.enabled=true
spring.ai.observability.monitoring.real-time.enabled=true
spring.ai.observability.monitoring.retention-days=30
```

## Best Practices

### 1. Metrics Design
- Choose meaningful business metrics
- Avoid high cardinality labels
- Implement layered monitoring

### 2. Tracing Strategy
- Set reasonable sampling rates
- Trace critical paths
- Include context information

### 3. Log Management
- Use structured logging
- Include trace identifiers
- Implement log aggregation

### 4. Alert Optimization
- Set reasonable thresholds
- Implement alert suppression
- Provide actionable information

## Next Steps

- [Learn about Durable Execution & Time Travel](/docs/1.0.0.3/multi-agent/durable-execution/)
- [Understand Subgraphs](/docs/1.0.0.3/multi-agent/subgraphs/)
- [Explore Playground](/docs/1.0.0.3/playground/studio/)
