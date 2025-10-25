---
title: Subgraphs
description: Spring AI Alibaba subgraph functionality
---

# Subgraphs

Subgraphs allow complex multi-agent workflows to be decomposed into smaller, more manageable components, supporting modular design and reuse.

## Core Concepts

### Subgraph Types
- **Functional Subgraphs**: Independent graphs implementing specific functionality
- **Parallel Subgraphs**: Subgraphs that can execute in parallel
- **Conditional Subgraphs**: Subgraphs selected for execution based on conditions
- **Recursive Subgraphs**: Subgraphs that can call themselves

### Subgraph Characteristics
- **Independence**: Subgraphs have their own state and context
- **Reusability**: Subgraphs can be reused in multiple places
- **Composability**: Subgraphs can be nested and composed
- **Testability**: Subgraphs can be tested independently

## Basic Configuration

```java
@Configuration
@EnableSubgraphs
public class SubgraphConfig {
    
    @Bean
    public SubgraphManager subgraphManager() {
        return SubgraphManager.builder()
            .subgraphRegistry(subgraphRegistry())
            .executionContext(executionContext())
            .isolationLevel(IsolationLevel.ISOLATED)
            .build();
    }
    
    @Bean
    public SubgraphRegistry subgraphRegistry() {
        return new InMemorySubgraphRegistry();
    }
}
```

## Creating Subgraphs

### Simple Subgraph

```java
@Component
public class DataProcessingSubgraph {
    
    @SubgraphDefinition(name = "data-validation")
    public StateGraph createDataValidationSubgraph() {
        return StateGraph.builder(DataValidationState.class)
            .addNode("check_format", this::checkFormat)
            .addNode("validate_content", this::validateContent)
            .addNode("sanitize_data", this::sanitizeData)
            .addEdge("check_format", "validate_content")
            .addEdge("validate_content", "sanitize_data")
            .setEntryPoint("check_format")
            .setFinishPoint("sanitize_data")
            .build();
    }
    
    private DataValidationState checkFormat(DataValidationState state) {
        String data = state.getRawData();
        boolean isValidFormat = dataFormatValidator.validate(data);
        
        return state.withFormatValid(isValidFormat);
    }
    
    private DataValidationState validateContent(DataValidationState state) {
        if (!state.isFormatValid()) {
            throw new InvalidDataFormatException("Data format validation failed");
        }
        
        String data = state.getRawData();
        ValidationResult result = contentValidator.validate(data);
        
        return state.withValidationResult(result);
    }
    
    private DataValidationState sanitizeData(DataValidationState state) {
        String cleanData = dataSanitizer.sanitize(state.getRawData());
        return state.withCleanData(cleanData);
    }
}
```

### Parameterized Subgraph

```java
@Component
public class ParameterizedSubgraph {
    
    @SubgraphDefinition(name = "model-inference")
    public StateGraph createModelInferenceSubgraph(
            @SubgraphParameter("model") String modelName,
            @SubgraphParameter("temperature") double temperature,
            @SubgraphParameter("maxTokens") int maxTokens) {
        
        return StateGraph.builder(InferenceState.class)
            .addNode("prepare_input", state -> prepareInput(state, modelName))
            .addNode("run_inference", state -> runInference(state, temperature, maxTokens))
            .addNode("process_output", this::processOutput)
            .addEdge("prepare_input", "run_inference")
            .addEdge("run_inference", "process_output")
            .setEntryPoint("prepare_input")
            .setFinishPoint("process_output")
            .build();
    }
    
    private InferenceState prepareInput(InferenceState state, String modelName) {
        String formattedInput = inputFormatter.format(state.getRawInput(), modelName);
        return state.withFormattedInput(formattedInput);
    }
    
    private InferenceState runInference(InferenceState state, double temperature, int maxTokens) {
        ChatOptions options = ChatOptionsBuilder.builder()
            .withTemperature(temperature)
            .withMaxTokens(maxTokens)
            .build();
        
        String result = chatClient.prompt()
            .user(state.getFormattedInput())
            .options(options)
            .call()
            .content();
        
        return state.withInferenceResult(result);
    }
}
```

## Subgraph Invocation

### Calling Subgraphs in Main Graph

```java
@Component
public class MainWorkflow {
    
    @Autowired
    private SubgraphManager subgraphManager;
    
    public StateGraph createMainWorkflow() {
        return StateGraph.builder(MainWorkflowState.class)
            .addNode("collect_data", this::collectData)
            .addNode("validate_data", this::callDataValidationSubgraph)
            .addNode("process_data", this::callDataProcessingSubgraph)
            .addNode("generate_report", this::generateReport)
            .addEdge("collect_data", "validate_data")
            .addEdge("validate_data", "process_data")
            .addEdge("process_data", "generate_report")
            .setEntryPoint("collect_data")
            .setFinishPoint("generate_report")
            .build();
    }
    
    private MainWorkflowState callDataValidationSubgraph(MainWorkflowState state) {
        // Prepare subgraph input
        DataValidationState subgraphInput = DataValidationState.builder()
            .rawData(state.getCollectedData())
            .build();
        
        // Call subgraph
        SubgraphExecution execution = subgraphManager.executeSubgraph(
            "data-validation", 
            subgraphInput
        );
        
        // Wait for subgraph completion
        DataValidationState result = execution.waitForCompletion(Duration.ofMinutes(5));
        
        // Merge result into main state
        return state.withValidatedData(result.getCleanData());
    }
    
    private MainWorkflowState callDataProcessingSubgraph(MainWorkflowState state) {
        // Call multiple subgraphs in parallel
        List<CompletableFuture<ProcessingResult>> futures = new ArrayList<>();
        
        for (String dataChunk : splitData(state.getValidatedData())) {
            CompletableFuture<ProcessingResult> future = CompletableFuture.supplyAsync(() -> {
                ProcessingState input = ProcessingState.builder()
                    .dataChunk(dataChunk)
                    .build();
                
                SubgraphExecution execution = subgraphManager.executeSubgraph(
                    "data-processing", 
                    input
                );
                
                return execution.waitForCompletion(Duration.ofMinutes(10));
            });
            
            futures.add(future);
        }
        
        // Wait for all subgraphs to complete
        List<ProcessingResult> results = futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());
        
        return state.withProcessingResults(results);
    }
}
```

### Dynamic Subgraph Invocation

```java
@Service
public class DynamicSubgraphService {
    
    @Autowired
    private SubgraphRegistry subgraphRegistry;
    
    public <T> T executeSubgraphByName(String subgraphName, Object input, Class<T> outputType) {
        SubgraphDefinition definition = subgraphRegistry.getSubgraph(subgraphName);
        
        if (definition == null) {
            throw new SubgraphNotFoundException("Subgraph not found: " + subgraphName);
        }
        
        SubgraphExecution execution = subgraphManager.executeSubgraph(subgraphName, input);
        Object result = execution.waitForCompletion(Duration.ofMinutes(30));
        
        return outputType.cast(result);
    }
    
    public <T> CompletableFuture<T> executeSubgraphAsync(String subgraphName, Object input, Class<T> outputType) {
        return CompletableFuture.supplyAsync(() -> 
            executeSubgraphByName(subgraphName, input, outputType));
    }
    
    public List<String> getAvailableSubgraphs() {
        return subgraphRegistry.getAllSubgraphNames();
    }
    
    public SubgraphMetadata getSubgraphMetadata(String subgraphName) {
        SubgraphDefinition definition = subgraphRegistry.getSubgraph(subgraphName);
        
        return SubgraphMetadata.builder()
            .name(definition.getName())
            .description(definition.getDescription())
            .inputType(definition.getInputType())
            .outputType(definition.getOutputType())
            .parameters(definition.getParameters())
            .estimatedDuration(definition.getEstimatedDuration())
            .build();
    }
}
```

## Subgraph State Management

### State Isolation

```java
@Component
public class SubgraphStateManager {
    
    private final Map<String, SubgraphContext> subgraphContexts = new ConcurrentHashMap<>();
    
    public SubgraphContext createSubgraphContext(String executionId, String subgraphName) {
        SubgraphContext context = SubgraphContext.builder()
            .executionId(executionId)
            .subgraphName(subgraphName)
            .isolatedState(new HashMap<>())
            .parentContext(getCurrentContext())
            .createdAt(Instant.now())
            .build();
        
        subgraphContexts.put(executionId, context);
        return context;
    }
    
    public void setSubgraphState(String executionId, String key, Object value) {
        SubgraphContext context = subgraphContexts.get(executionId);
        if (context != null) {
            context.getIsolatedState().put(key, value);
        }
    }
    
    public <T> T getSubgraphState(String executionId, String key, Class<T> type) {
        SubgraphContext context = subgraphContexts.get(executionId);
        if (context != null) {
            Object value = context.getIsolatedState().get(key);
            return type.isInstance(value) ? type.cast(value) : null;
        }
        return null;
    }
    
    public void inheritFromParent(String executionId, String key) {
        SubgraphContext context = subgraphContexts.get(executionId);
        if (context != null && context.getParentContext() != null) {
            Object value = context.getParentContext().get(key);
            if (value != null) {
                context.getIsolatedState().put(key, value);
            }
        }
    }
    
    public void cleanupSubgraphContext(String executionId) {
        subgraphContexts.remove(executionId);
    }
}
```

### State Transfer

```java
@Component
public class SubgraphStateTransfer {
    
    public <T> T transferStateToSubgraph(Object parentState, Class<T> subgraphStateType) {
        StateTransferRule rule = getTransferRule(parentState.getClass(), subgraphStateType);
        return rule.transfer(parentState, subgraphStateType);
    }
    
    public <T> T transferStateFromSubgraph(Object subgraphState, Object parentState, Class<T> parentStateType) {
        StateTransferRule rule = getTransferRule(subgraphState.getClass(), parentStateType);
        return rule.merge(subgraphState, parentState, parentStateType);
    }
    
    private StateTransferRule getTransferRule(Class<?> sourceType, Class<?> targetType) {
        String ruleKey = sourceType.getName() + "->" + targetType.getName();
        
        return transferRules.computeIfAbsent(ruleKey, key -> {
            // Use reflection or configuration to create transfer rules
            return createDefaultTransferRule(sourceType, targetType);
        });
    }
    
    private StateTransferRule createDefaultTransferRule(Class<?> sourceType, Class<?> targetType) {
        return new ReflectionBasedTransferRule(sourceType, targetType);
    }
}
```

## Subgraph Composition

### Sequential Composition

```java
@Component
public class SequentialSubgraphComposition {
    
    public StateGraph composeSequentially(List<String> subgraphNames, String compositionName) {
        StateGraphBuilder<CompositeState> builder = StateGraph.builder(CompositeState.class);
        
        String previousNode = null;
        
        for (int i = 0; i < subgraphNames.size(); i++) {
            String subgraphName = subgraphNames.get(i);
            String nodeName = "subgraph_" + i;
            
            builder.addNode(nodeName, state -> executeSubgraphInComposition(state, subgraphName));
            
            if (previousNode != null) {
                builder.addEdge(previousNode, nodeName);
            } else {
                builder.setEntryPoint(nodeName);
            }
            
            previousNode = nodeName;
        }
        
        if (previousNode != null) {
            builder.setFinishPoint(previousNode);
        }
        
        StateGraph compositeGraph = builder.build();
        
        // Register composite subgraph
        subgraphRegistry.registerSubgraph(compositionName, compositeGraph);
        
        return compositeGraph;
    }
    
    private CompositeState executeSubgraphInComposition(CompositeState state, String subgraphName) {
        Object subgraphInput = extractSubgraphInput(state, subgraphName);
        
        SubgraphExecution execution = subgraphManager.executeSubgraph(subgraphName, subgraphInput);
        Object result = execution.waitForCompletion(Duration.ofMinutes(15));
        
        return mergeSubgraphResult(state, subgraphName, result);
    }
}
```

### Parallel Composition

```java
@Component
public class ParallelSubgraphComposition {
    
    public StateGraph composeInParallel(List<String> subgraphNames, String compositionName) {
        return StateGraph.builder(CompositeState.class)
            .addNode("dispatch", this::dispatchToParallelSubgraphs)
            .addNode("collect", this::collectFromParallelSubgraphs)
            .addEdge("dispatch", "collect")
            .setEntryPoint("dispatch")
            .setFinishPoint("collect")
            .build();
    }
    
    private CompositeState dispatchToParallelSubgraphs(CompositeState state) {
        List<String> subgraphNames = state.getParallelSubgraphs();
        List<CompletableFuture<SubgraphResult>> futures = new ArrayList<>();
        
        for (String subgraphName : subgraphNames) {
            CompletableFuture<SubgraphResult> future = CompletableFuture.supplyAsync(() -> {
                Object input = extractSubgraphInput(state, subgraphName);
                SubgraphExecution execution = subgraphManager.executeSubgraph(subgraphName, input);
                Object result = execution.waitForCompletion(Duration.ofMinutes(20));
                
                return SubgraphResult.builder()
                    .subgraphName(subgraphName)
                    .result(result)
                    .executionTime(execution.getExecutionTime())
                    .build();
            });
            
            futures.add(future);
        }
        
        return state.withParallelFutures(futures);
    }
    
    private CompositeState collectFromParallelSubgraphs(CompositeState state) {
        List<CompletableFuture<SubgraphResult>> futures = state.getParallelFutures();
        
        List<SubgraphResult> results = futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());
        
        return state.withParallelResults(results);
    }
}
```

## Subgraph Monitoring

### Execution Monitoring

```java
@Component
public class SubgraphMonitoring {
    
    @EventListener
    public void onSubgraphStart(SubgraphStartEvent event) {
        SubgraphExecution execution = SubgraphExecution.builder()
            .executionId(event.getExecutionId())
            .subgraphName(event.getSubgraphName())
            .parentExecutionId(event.getParentExecutionId())
            .startTime(event.getTimestamp())
            .status(ExecutionStatus.RUNNING)
            .build();
        
        subgraphExecutionRepository.save(execution);
        
        // Send monitoring metrics
        meterRegistry.counter("subgraph.executions.started", 
            "subgraph", event.getSubgraphName()).increment();
    }
    
    @EventListener
    public void onSubgraphComplete(SubgraphCompleteEvent event) {
        SubgraphExecution execution = subgraphExecutionRepository
            .findById(event.getExecutionId())
            .orElseThrow(() -> new ExecutionNotFoundException(event.getExecutionId()));
        
        execution.setEndTime(event.getTimestamp());
        execution.setStatus(event.isSuccess() ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED);
        execution.setResult(event.getResult());
        
        subgraphExecutionRepository.save(execution);
        
        // Record execution time
        Duration executionTime = Duration.between(execution.getStartTime(), execution.getEndTime());
        meterRegistry.timer("subgraph.execution.duration", 
            "subgraph", event.getSubgraphName()).record(executionTime);
    }
    
    public SubgraphMetrics getSubgraphMetrics(String subgraphName, Duration period) {
        Instant since = Instant.now().minus(period);
        
        List<SubgraphExecution> executions = subgraphExecutionRepository
            .findBySubgraphNameAndStartTimeAfter(subgraphName, since);
        
        return SubgraphMetrics.builder()
            .subgraphName(subgraphName)
            .totalExecutions(executions.size())
            .successfulExecutions(countSuccessful(executions))
            .failedExecutions(countFailed(executions))
            .averageExecutionTime(calculateAverageExecutionTime(executions))
            .successRate(calculateSuccessRate(executions))
            .build();
    }
}
```

## Subgraph Testing

### Unit Testing

```java
@ExtendWith(SpringExtension.class)
@SpringBootTest
public class DataValidationSubgraphTest {
    
    @Autowired
    private SubgraphManager subgraphManager;
    
    @Test
    public void testDataValidationSubgraph() {
        // Prepare test data
        DataValidationState input = DataValidationState.builder()
            .rawData("test data")
            .build();
        
        // Execute subgraph
        SubgraphExecution execution = subgraphManager.executeSubgraph("data-validation", input);
        DataValidationState result = execution.waitForCompletion(Duration.ofSeconds(30));
        
        // Verify results
        assertThat(result.isFormatValid()).isTrue();
        assertThat(result.getCleanData()).isNotNull();
        assertThat(result.getValidationResult().isValid()).isTrue();
    }
    
    @Test
    public void testDataValidationSubgraphWithInvalidData() {
        DataValidationState input = DataValidationState.builder()
            .rawData("invalid data format")
            .build();
        
        assertThatThrownBy(() -> {
            SubgraphExecution execution = subgraphManager.executeSubgraph("data-validation", input);
            execution.waitForCompletion(Duration.ofSeconds(30));
        }).isInstanceOf(InvalidDataFormatException.class);
    }
}
```

## Configuration Options

```properties
# Subgraph configuration
spring.ai.subgraphs.enabled=true
spring.ai.subgraphs.isolation-level=ISOLATED
spring.ai.subgraphs.max-concurrent=10

# Execution configuration
spring.ai.subgraphs.execution.timeout=30m
spring.ai.subgraphs.execution.retry-attempts=3
spring.ai.subgraphs.execution.async=true

# Monitoring configuration
spring.ai.subgraphs.monitoring.enabled=true
spring.ai.subgraphs.monitoring.metrics.enabled=true
spring.ai.subgraphs.monitoring.tracing.enabled=true

# Registry configuration
spring.ai.subgraphs.registry.type=memory
spring.ai.subgraphs.registry.auto-discovery=true
spring.ai.subgraphs.registry.cache-enabled=true
```

## Best Practices

### 1. Design Principles
- Keep subgraph functionality focused
- Design clear input/output interfaces
- Implement proper error handling

### 2. Performance Optimization
- Use parallel execution appropriately
- Implement state transfer optimization
- Monitor subgraph performance

### 3. Maintainability
- Provide comprehensive documentation
- Implement thorough testing
- Version subgraph definitions

### 4. Reusability
- Design generic subgraphs
- Support parameterized configuration
- Build subgraph libraries

## Next Steps

- [Explore Playground](/docs/1.0.0.3/playground/studio/)
- [Learn about JManus](/docs/1.0.0.3/playground/jmanus/)
- [Understand DeepResearch](/docs/1.0.0.3/playground/deepresearch/)
