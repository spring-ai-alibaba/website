---
title: Durable Execution
description: Spring AI Alibaba durable execution capabilities
---

# Durable Execution

Durable execution ensures that multi-agent workflows can survive system failures, restarts, and interruptions while maintaining consistency and reliability.

## Core Concepts

### Durability Guarantees
- **Fault Tolerance**: Automatic recovery from system failures
- **State Persistence**: Reliable state storage and recovery
- **Execution Continuity**: Seamless resumption after interruptions
- **Consistency**: Maintaining data consistency across failures

### Key Components
- **Checkpoint Manager**: Manages execution checkpoints
- **State Store**: Persistent state storage
- **Recovery Engine**: Handles failure recovery
- **Transaction Manager**: Ensures transactional consistency

## Basic Configuration

```java
@Configuration
@EnableDurableExecution
public class DurableExecutionConfig {
    
    @Bean
    public DurableExecutionManager durableExecutionManager() {
        return DurableExecutionManager.builder()
            .checkpointStore(checkpointStore())
            .stateStore(stateStore())
            .recoveryEngine(recoveryEngine())
            .checkpointInterval(Duration.ofMinutes(5))
            .build();
    }
    
    @Bean
    public CheckpointStore checkpointStore() {
        return new DatabaseCheckpointStore(dataSource());
    }
    
    @Bean
    public StateStore stateStore() {
        return new RedisStateStore(redisTemplate());
    }
}
```

## Checkpoint Management

### Automatic Checkpointing

```java
@Component
public class AutoCheckpointService {
    
    @Autowired
    private DurableExecutionManager executionManager;
    
    @EventListener
    public void onNodeCompletion(NodeCompletionEvent event) {
        if (shouldCreateCheckpoint(event)) {
            createCheckpoint(event.getExecutionId(), event.getNodeId(), event.getState());
        }
    }
    
    @EventListener
    public void onStateChange(StateChangeEvent event) {
        if (isSignificantChange(event)) {
            createCheckpoint(event.getExecutionId(), event.getCurrentNode(), event.getNewState());
        }
    }
    
    private void createCheckpoint(String executionId, String nodeId, OverallState state) {
        Checkpoint checkpoint = Checkpoint.builder()
            .executionId(executionId)
            .nodeId(nodeId)
            .state(state)
            .timestamp(Instant.now())
            .version(generateVersion())
            .build();
        
        executionManager.saveCheckpoint(checkpoint);
    }
    
    private boolean shouldCreateCheckpoint(NodeCompletionEvent event) {
        return event.getNodeId().endsWith("_checkpoint") || 
               event.getExecutionTime().toSeconds() > 60 ||
               event.isLongRunningOperation();
    }
}
```

### Manual Checkpointing

```java
@Service
public class ManualCheckpointService {
    
    @Autowired
    private DurableExecutionManager executionManager;
    
    public String createCheckpoint(String executionId, String description) {
        GraphExecution execution = executionManager.getExecution(executionId);
        
        Checkpoint checkpoint = Checkpoint.builder()
            .id(UUID.randomUUID().toString())
            .executionId(executionId)
            .nodeId(execution.getCurrentNode())
            .state(execution.getCurrentState())
            .description(description)
            .timestamp(Instant.now())
            .manual(true)
            .build();
        
        executionManager.saveCheckpoint(checkpoint);
        return checkpoint.getId();
    }
    
    public List<Checkpoint> getCheckpoints(String executionId) {
        return executionManager.getCheckpoints(executionId);
    }
    
    public void deleteCheckpoint(String checkpointId) {
        executionManager.deleteCheckpoint(checkpointId);
    }
}
```

## Failure Recovery

### Automatic Recovery

```java
@Component
public class AutoRecoveryService {
    
    @Autowired
    private DurableExecutionManager executionManager;
    
    @EventListener
    public void onSystemStartup(ApplicationReadyEvent event) {
        recoverInterruptedExecutions();
    }
    
    @EventListener
    public void onExecutionFailure(ExecutionFailureEvent event) {
        if (isRecoverable(event)) {
            scheduleRecovery(event.getExecutionId());
        }
    }
    
    private void recoverInterruptedExecutions() {
        List<String> interruptedExecutions = executionManager.findInterruptedExecutions();
        
        for (String executionId : interruptedExecutions) {
            try {
                recoverExecution(executionId);
            } catch (Exception e) {
                log.error("Failed to recover execution: {}", executionId, e);
            }
        }
    }
    
    private void recoverExecution(String executionId) {
        Checkpoint latestCheckpoint = executionManager.getLatestCheckpoint(executionId);
        
        if (latestCheckpoint != null) {
            GraphExecution execution = executionManager.createExecution(executionId);
            execution.restoreFromCheckpoint(latestCheckpoint);
            execution.resume();
            
            log.info("Recovered execution {} from checkpoint at node {}", 
                executionId, latestCheckpoint.getNodeId());
        }
    }
}
```

### Manual Recovery

```java
@Service
public class ManualRecoveryService {
    
    public RecoveryResult recoverFromCheckpoint(String checkpointId) {
        Checkpoint checkpoint = executionManager.getCheckpoint(checkpointId);
        
        if (checkpoint == null) {
            return RecoveryResult.failure("Checkpoint not found: " + checkpointId);
        }
        
        try {
            GraphExecution execution = executionManager.getExecution(checkpoint.getExecutionId());
            
            if (execution.getStatus() == ExecutionStatus.RUNNING) {
                execution.pause();
            }
            
            execution.restoreFromCheckpoint(checkpoint);
            execution.resume();
            
            return RecoveryResult.success("Execution recovered from checkpoint");
            
        } catch (Exception e) {
            log.error("Failed to recover from checkpoint: {}", checkpointId, e);
            return RecoveryResult.failure("Recovery failed: " + e.getMessage());
        }
    }
    
    public RecoveryResult recoverToSpecificNode(String executionId, String nodeId) {
        List<Checkpoint> checkpoints = executionManager.getCheckpoints(executionId);
        
        Checkpoint targetCheckpoint = checkpoints.stream()
            .filter(cp -> cp.getNodeId().equals(nodeId))
            .max(Comparator.comparing(Checkpoint::getTimestamp))
            .orElse(null);
        
        if (targetCheckpoint == null) {
            return RecoveryResult.failure("No checkpoint found for node: " + nodeId);
        }
        
        return recoverFromCheckpoint(targetCheckpoint.getId());
    }
}
```

## State Persistence

### Transactional State Management

```java
@Service
@Transactional
public class TransactionalStateService {
    
    @Autowired
    private StateStore stateStore;
    
    @Autowired
    private CheckpointStore checkpointStore;
    
    public void saveStateWithCheckpoint(String executionId, OverallState state, String nodeId) {
        try {
            // Save state
            stateStore.save(executionId, state);
            
            // Create checkpoint
            Checkpoint checkpoint = Checkpoint.builder()
                .executionId(executionId)
                .nodeId(nodeId)
                .state(state)
                .timestamp(Instant.now())
                .build();
            
            checkpointStore.save(checkpoint);
            
            log.debug("Saved state and checkpoint for execution: {}", executionId);
            
        } catch (Exception e) {
            log.error("Failed to save state and checkpoint", e);
            throw new StateTransactionException("Transaction failed", e);
        }
    }
    
    public OverallState loadStateWithValidation(String executionId) {
        OverallState state = stateStore.load(executionId);
        
        if (state == null) {
            // Try to recover from latest checkpoint
            Checkpoint latestCheckpoint = checkpointStore.getLatest(executionId);
            if (latestCheckpoint != null) {
                state = latestCheckpoint.getState();
                log.info("Recovered state from checkpoint for execution: {}", executionId);
            }
        }
        
        return state;
    }
}
```

### Distributed State Consistency

```java
@Component
public class DistributedStateManager {
    
    @Autowired
    private List<StateStore> stateStores;
    
    public void saveStateDistributed(String executionId, OverallState state) {
        List<CompletableFuture<Void>> futures = stateStores.stream()
            .map(store -> CompletableFuture.runAsync(() -> store.save(executionId, state)))
            .collect(Collectors.toList());
        
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();
        } catch (Exception e) {
            log.error("Failed to save state to all stores", e);
            throw new DistributedStateException("Distributed save failed", e);
        }
    }
    
    public OverallState loadStateWithConsensus(String executionId) {
        Map<OverallState, Integer> stateVotes = new HashMap<>();
        
        for (StateStore store : stateStores) {
            try {
                OverallState state = store.load(executionId);
                if (state != null) {
                    stateVotes.merge(state, 1, Integer::sum);
                }
            } catch (Exception e) {
                log.warn("Failed to load state from store: {}", store.getClass().getSimpleName(), e);
            }
        }
        
        // Return state with majority consensus
        return stateVotes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(null);
    }
}
```

## Execution Continuity

### Seamless Resumption

```java
@Service
public class ExecutionContinuityService {
    
    @Autowired
    private DurableExecutionManager executionManager;
    
    public void resumeExecution(String executionId) {
        GraphExecution execution = executionManager.getExecution(executionId);
        
        if (execution.getStatus() == ExecutionStatus.INTERRUPTED) {
            // Validate state consistency
            if (validateStateConsistency(execution)) {
                execution.resume();
                log.info("Resumed execution: {}", executionId);
            } else {
                // Recover from latest checkpoint
                recoverAndResume(executionId);
            }
        }
    }
    
    private boolean validateStateConsistency(GraphExecution execution) {
        try {
            OverallState currentState = execution.getCurrentState();
            String currentNode = execution.getCurrentNode();
            
            // Validate state integrity
            return stateValidator.validate(currentState, currentNode);
            
        } catch (Exception e) {
            log.warn("State validation failed for execution: {}", execution.getId(), e);
            return false;
        }
    }
    
    private void recoverAndResume(String executionId) {
        Checkpoint latestCheckpoint = executionManager.getLatestCheckpoint(executionId);
        
        if (latestCheckpoint != null) {
            GraphExecution execution = executionManager.getExecution(executionId);
            execution.restoreFromCheckpoint(latestCheckpoint);
            execution.resume();
            
            log.info("Recovered and resumed execution: {}", executionId);
        } else {
            log.error("No checkpoint available for recovery: {}", executionId);
        }
    }
}
```

### Progress Tracking

```java
@Component
public class ProgressTrackingService {
    
    @EventListener
    public void onNodeStart(NodeStartEvent event) {
        updateProgress(event.getExecutionId(), event.getNodeId(), ProgressStatus.STARTED);
    }
    
    @EventListener
    public void onNodeComplete(NodeCompletionEvent event) {
        updateProgress(event.getExecutionId(), event.getNodeId(), ProgressStatus.COMPLETED);
    }
    
    @EventListener
    public void onNodeError(NodeErrorEvent event) {
        updateProgress(event.getExecutionId(), event.getNodeId(), ProgressStatus.FAILED);
    }
    
    private void updateProgress(String executionId, String nodeId, ProgressStatus status) {
        ExecutionProgress progress = ExecutionProgress.builder()
            .executionId(executionId)
            .nodeId(nodeId)
            .status(status)
            .timestamp(Instant.now())
            .build();
        
        progressRepository.save(progress);
        
        // Broadcast progress update
        messagingTemplate.convertAndSend("/topic/progress/" + executionId, progress);
    }
    
    public ExecutionSummary getExecutionSummary(String executionId) {
        List<ExecutionProgress> progressList = progressRepository.findByExecutionId(executionId);
        
        long completedNodes = progressList.stream()
            .filter(p -> p.getStatus() == ProgressStatus.COMPLETED)
            .count();
        
        long totalNodes = progressList.size();
        double completionPercentage = totalNodes > 0 ? (double) completedNodes / totalNodes * 100 : 0;
        
        return ExecutionSummary.builder()
            .executionId(executionId)
            .totalNodes(totalNodes)
            .completedNodes(completedNodes)
            .completionPercentage(completionPercentage)
            .lastUpdate(progressList.stream()
                .max(Comparator.comparing(ExecutionProgress::getTimestamp))
                .map(ExecutionProgress::getTimestamp)
                .orElse(null))
            .build();
    }
}
```

## Error Handling and Retry

### Intelligent Retry Mechanism

```java
@Component
public class IntelligentRetryService {
    
    @Retryable(
        value = {TransientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void executeWithRetry(String executionId, String nodeId, Runnable operation) {
        try {
            operation.run();
        } catch (Exception e) {
            if (isRetryable(e)) {
                log.warn("Retryable error in execution {} at node {}: {}", 
                    executionId, nodeId, e.getMessage());
                throw new TransientException("Retryable error", e);
            } else {
                log.error("Non-retryable error in execution {} at node {}", 
                    executionId, nodeId, e);
                throw e;
            }
        }
    }
    
    @Recover
    public void recover(TransientException e, String executionId, String nodeId, Runnable operation) {
        log.error("All retry attempts failed for execution {} at node {}", executionId, nodeId);
        
        // Create error checkpoint
        createErrorCheckpoint(executionId, nodeId, e);
        
        // Notify administrators
        notificationService.sendAlert("Execution failed after retries", executionId, nodeId, e);
    }
    
    private boolean isRetryable(Exception e) {
        return e instanceof ConnectException ||
               e instanceof SocketTimeoutException ||
               e instanceof HttpRetryException ||
               (e.getMessage() != null && e.getMessage().contains("rate limit"));
    }
}
```

## Configuration Options

```properties
# Durable execution configuration
spring.ai.durable-execution.enabled=true
spring.ai.durable-execution.checkpoint-interval=5m
spring.ai.durable-execution.auto-recovery=true

# Checkpoint configuration
spring.ai.durable-execution.checkpoint.store=database
spring.ai.durable-execution.checkpoint.compression=true
spring.ai.durable-execution.checkpoint.retention-days=30

# State persistence configuration
spring.ai.durable-execution.state.store=redis
spring.ai.durable-execution.state.ttl=7d
spring.ai.durable-execution.state.replication=3

# Recovery configuration
spring.ai.durable-execution.recovery.max-attempts=3
spring.ai.durable-execution.recovery.delay=10s
spring.ai.durable-execution.recovery.timeout=300s

# Monitoring configuration
spring.ai.durable-execution.monitoring.enabled=true
spring.ai.durable-execution.monitoring.progress-tracking=true
spring.ai.durable-execution.monitoring.alerts=true
```

## Best Practices

### 1. Checkpoint Strategy
- Create checkpoints at logical boundaries
- Balance checkpoint frequency with performance
- Include sufficient context in checkpoints
- Validate checkpoint integrity

### 2. State Management
- Design stateless operations where possible
- Minimize state size
- Use immutable state objects
- Implement state validation

### 3. Error Handling
- Distinguish between retryable and non-retryable errors
- Implement exponential backoff
- Provide meaningful error messages
- Log sufficient debugging information

### 4. Performance Optimization
- Use asynchronous checkpoint creation
- Implement checkpoint compression
- Clean up old checkpoints regularly
- Monitor checkpoint storage usage

## Time Travel ⏱️

Time travel functionality allows developers to trace back the execution history of multi-agent systems, view states at any point in time, and support recovery from historical states.

When working with non-deterministic systems based on model decisions (e.g., LLM-driven agents), it can be useful to examine their decision-making process in detail:

1. 🤔 **Understanding reasoning**: Analyze the steps that led to successful outcomes.
2. 🐞 **Debugging errors**: Identify where and why errors occurred.
3. 🔍 **Exploring alternatives**: Test different paths to discover better solutions.

Spring AI Alibaba provides time travel functionality to support these use cases. Specifically, you can restore execution from previous checkpoints—either replaying the same state or modifying it to explore alternatives. In all cases, restoring past execution creates new branches in history.

### Time Travel Core Concepts

#### Time Point Snapshots
- **State Snapshots**: Complete system state at specific time points
- **Incremental Snapshots**: Changes relative to the previous snapshot
- **Automatic Snapshots**: System-generated snapshots
- **Manual Snapshots**: User-created snapshots

#### Timeline Management
- **Linear Timeline**: Single execution timeline
- **Branching Timeline**: Support for multiple execution branches
- **Merged Timeline**: Merging branches back to main timeline

### Time Travel Configuration

```java
@Configuration
@EnableTimeTravel
public class TimeTravelConfig {

    @Bean
    public TimeTravelManager timeTravelManager() {
        return TimeTravelManager.builder()
            .snapshotStore(snapshotStore())
            .snapshotInterval(Duration.ofMinutes(5))
            .maxSnapshots(100)
            .compressionEnabled(true)
            .build();
    }

    @Bean
    public SnapshotStore snapshotStore() {
        return new DatabaseSnapshotStore(dataSource());
    }
}
```

### Using Time Travel

To use time travel in Spring AI Alibaba:

1. **Run the graph**: Use `invoke` or `stream` methods to run the graph with initial input.
2. **Identify checkpoints in existing thread**: Use `getStateHistory()` method to retrieve execution history for a specific `threadId` and locate the desired `checkpointId`.
   Alternatively, set interrupts before nodes where you want execution to pause. Then you can find the latest checkpoint recorded to that interrupt.
3. **Update graph state (optional)**: Use `updateState` method to modify the graph state at the checkpoint and restore execution from the alternative state.
4. **Resume execution from checkpoint**: Use `invoke` or `stream` methods with `null` input and configuration containing appropriate `threadId` and `checkpointId`.

### Time Travel Examples

#### State Snapshots

```java
@Component
public class AutoSnapshotService {

    @Autowired
    private TimeTravelManager timeTravelManager;

    @EventListener
    public void onNodeCompletion(NodeCompletionEvent event) {
        if (shouldCreateSnapshot(event)) {
            createSnapshot(event.getExecutionId(), "Auto snapshot after " + event.getNodeId());
        }
    }

    @EventListener
    public void onStateChange(StateChangeEvent event) {
        if (isSignificantChange(event)) {
            createSnapshot(event.getExecutionId(), "State change: " + event.getChangeDescription());
        }
    }

    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void createPeriodicSnapshots() {
        List<String> activeExecutions = executionManager.getActiveExecutionIds();

        for (String executionId : activeExecutions) {
            createSnapshot(executionId, "Periodic snapshot");
        }
    }

    private void createSnapshot(String executionId, String description) {
        try {
            GraphExecution execution = executionManager.getExecution(executionId);

            Snapshot snapshot = Snapshot.builder()
                .id(UUID.randomUUID().toString())
                .executionId(executionId)
                .timestamp(Instant.now())
                .description(description)
                .state(execution.getCurrentState())
                .nodeId(execution.getCurrentNode())
                .metadata(execution.getMetadata())
                .build();

            timeTravelManager.saveSnapshot(snapshot);

        } catch (Exception e) {
            log.error("Failed to create snapshot for execution: {}", executionId, e);
        }
    }
}
```

#### Time Travel Restoration

```java
@Service
public class TimeTravelService {

    @Autowired
    private TimeTravelManager timeTravelManager;

    @Autowired
    private GraphExecutionManager executionManager;

    public void restoreToSnapshot(String snapshotId) {
        Snapshot snapshot = timeTravelManager.getSnapshot(snapshotId);

        if (snapshot == null) {
            throw new SnapshotNotFoundException("Snapshot not found: " + snapshotId);
        }

        GraphExecution execution = executionManager.getExecution(snapshot.getExecutionId());

        try {
            // Pause current execution
            execution.pause();

            // Restore state from snapshot
            execution.restoreState(snapshot.getState());
            execution.setCurrentNode(snapshot.getNodeId());

            // Create new branch for continued execution
            String branchId = createExecutionBranch(execution, snapshot);

            // Resume execution from restored state
            execution.resume();

            log.info("Successfully restored to snapshot: {} in branch: {}", snapshotId, branchId);

        } catch (Exception e) {
            log.error("Failed to restore to snapshot: {}", snapshotId, e);
            execution.resume(); // Resume original execution
            throw new StateRestorationException("Failed to restore state", e);
        }
    }

    public void restoreToTimepoint(String executionId, Instant timepoint) {
        Snapshot nearestSnapshot = findNearestSnapshot(executionId, timepoint);

        if (nearestSnapshot == null) {
            throw new NoSnapshotFoundException("No snapshot found near timepoint: " + timepoint);
        }

        restoreToSnapshot(nearestSnapshot.getId());
    }
}
```

### Time Travel Best Practices

#### 1. Snapshot Strategy
- Create snapshots at key decision points
- Set reasonable snapshot intervals
- Implement snapshot compression
- Clean up expired snapshots regularly

#### 2. State Update Strategy
- Carefully modify state to ensure consistency and validity
- Test alternative paths using time travel
- Add appropriate comments and logs for state modifications

#### 3. Performance Optimization
- Use asynchronous processing to save checkpoints and reduce latency
- Enable checkpoint compression to save storage space
- Automatically clean up expired checkpoints and historical records

#### 4. Debugging and Monitoring
- Visualize execution history using tools to visualize execution paths and state changes
- Monitor resource usage and track checkpoint storage resource consumption
- Handle exceptions properly during time travel processes

### Time Travel Configuration Options

```properties
# Time travel configuration
spring.ai.time-travel.enabled=true
spring.ai.time-travel.auto-snapshot.enabled=true
spring.ai.time-travel.auto-snapshot.interval=5m

# Snapshot storage configuration
spring.ai.time-travel.snapshot.store=database
spring.ai.time-travel.snapshot.compression.enabled=true
spring.ai.time-travel.snapshot.max-count=100

# Performance configuration
spring.ai.time-travel.performance.async-save=true
spring.ai.time-travel.performance.batch-size=10
spring.ai.time-travel.performance.cleanup-interval=1h

# Debug configuration
spring.ai.time-travel.debug.enabled=true
spring.ai.time-travel.debug.breakpoints.enabled=true
spring.ai.time-travel.debug.session-timeout=1h
```

## Next Steps

- [Learn about Memory Management](/docs/1.0.0.3/multi-agent/memory/)
- [Understand Context Management](/docs/1.0.0.3/multi-agent/context/)
- [Explore Human-in-the-Loop](/docs/1.0.0.3/multi-agent/human-in-the-loop/)
