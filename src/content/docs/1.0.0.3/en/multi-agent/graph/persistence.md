---
title: Persistence
keywords: ["Spring AI Alibaba", "Graph", "Persistence", "Checkpoints", "State Recovery"]
description: "Learn how to use Spring AI Alibaba Graph's persistence features for state saving, checkpoints, and failure recovery."
---

## Overview

Persistence is one of the core features of Spring AI Alibaba Graph, allowing you to save graph execution state, implement checkpoints, failure recovery, and manage long-running tasks.

### Why Do We Need Persistence?

In complex AI workflows, persistence solves several critical problems:

1. **Failure Recovery** — Resume execution from the last saved state after system failures or restarts
2. **Long-running Tasks** — Support tasks that run for extended periods, avoiding timeouts and restarts
3. **Human-in-the-loop** — Save state when human intervention is needed, then continue after human input
4. **Cost Control** — Avoid repeating expensive early steps due to later failures
5. **Debugging and Testing** — Ability to restart from specific states for debugging purposes

## Checkpoint System

### 1. Checkpoint Saver Types

Spring AI Alibaba Graph supports multiple checkpoint savers:

```java
import com.alibaba.cloud.ai.graph.checkpoint.*;

// 1. Memory saver - for development and testing
@Bean
public CheckpointSaver memoryCheckpointSaver() {
    return new MemoryCheckpointSaver();
}

// 2. File saver - for single-machine deployment
@Bean
public CheckpointSaver fileCheckpointSaver() {
    return FileCheckpointSaver.builder()
        .directory("./checkpoints")
        .enableCompression(true)
        .maxCheckpoints(100)
        .build();
}

// 3. Database saver - for production environments
@Bean
public CheckpointSaver databaseCheckpointSaver(DataSource dataSource) {
    return DatabaseCheckpointSaver.builder()
        .dataSource(dataSource)
        .tableName("graph_checkpoints")
        .enableEncryption(true)
        .build();
}

// 4. Redis saver - for distributed environments
@Bean
public CheckpointSaver redisCheckpointSaver(RedisTemplate<String, Object> redisTemplate) {
    return RedisCheckpointSaver.builder()
        .redisTemplate(redisTemplate)
        .keyPrefix("graph:checkpoint:")
        .ttl(Duration.ofDays(7))
        .build();
}
```

### 2. Configure Checkpoint Strategy

```java
import com.alibaba.cloud.ai.graph.checkpoint.CheckpointConfig;

@Configuration
public class CheckpointConfiguration {
    
    @Bean
    public CheckpointConfig checkpointConfig() {
        return CheckpointConfig.builder()
            .saveFrequency(CheckpointFrequency.AFTER_EACH_NODE)  // Save after each node
            .enableAutoSave(true)                               // Enable auto-save
            .maxRetries(3)                                      // Max retry attempts
            .compressionLevel(6)                                // Compression level
            .enableMetadata(true)                               // Save metadata
            .build();
    }
    
    @Bean
    public CompiledGraph persistentGraph(CheckpointSaver checkpointSaver, 
                                       CheckpointConfig checkpointConfig) {
        return new StateGraph(keyStrategyFactory)
            .addNode("step1", node_async(step1Action))
            .addNode("step2", node_async(step2Action))
            .addNode("step3", node_async(step3Action))
            
            .addEdge(START, "step1")
            .addEdge("step1", "step2")
            .addEdge("step2", "step3")
            .addEdge("step3", END)
            
            .compile(CompileConfig.builder()
                .checkpointSaver(checkpointSaver)
                .checkpointConfig(checkpointConfig)
                .build());
    }
}
```

## Basic Persistence Operations

### 1. Save and Load Checkpoints

```java
import com.alibaba.cloud.ai.graph.checkpoint.Checkpoint;
import com.alibaba.cloud.ai.graph.checkpoint.CheckpointMetadata;

@Service
public class GraphPersistenceService {
    
    @Autowired
    private CompiledGraph persistentGraph;
    
    @Autowired
    private CheckpointSaver checkpointSaver;
    
    // Execute graph with automatic checkpoint saving
    public String executeWithCheckpoints(String sessionId, Map<String, Object> input) {
        try {
            Optional<OverAllState> result = persistentGraph.invoke(
                input, 
                RunnableConfig.builder()
                    .configurable(Map.of("thread_id", sessionId))
                    .build()
            );
            
            return result.map(state -> 
                state.value("final_result", String.class).orElse("No result")
            ).orElse("Execution failed");
            
        } catch (Exception e) {
            // Even if execution fails, checkpoints are saved
            System.out.println("Execution failed, but can resume from checkpoint: " + e.getMessage());
            throw e;
        }
    }
    
    // Resume execution from checkpoint
    public String resumeFromCheckpoint(String sessionId) {
        try {
            // Get latest checkpoint
            Optional<Checkpoint> latestCheckpoint = checkpointSaver.getLatest(sessionId);
            
            if (latestCheckpoint.isPresent()) {
                Checkpoint checkpoint = latestCheckpoint.get();
                System.out.println("Resuming from checkpoint: " + checkpoint.getMetadata().getNodeId());
                
                // Continue execution from checkpoint
                Optional<OverAllState> result = persistentGraph.invoke(
                    checkpoint.getState().data(),
                    RunnableConfig.builder()
                        .configurable(Map.of("thread_id", sessionId))
                        .build()
                );
                
                return result.map(state -> 
                    state.value("final_result", String.class).orElse("No result")
                ).orElse("Resume execution failed");
            } else {
                return "No checkpoint found";
            }
            
        } catch (Exception e) {
            System.err.println("Failed to resume from checkpoint: " + e.getMessage());
            throw e;
        }
    }
    
    // List all checkpoints
    public List<CheckpointMetadata> listCheckpoints(String sessionId) {
        return checkpointSaver.list(sessionId);
    }
    
    // Delete checkpoints
    public void deleteCheckpoints(String sessionId) {
        checkpointSaver.delete(sessionId);
    }
}
```

### 2. Manual Checkpoint Management

```java
public class ManualCheckpointNode implements NodeAction {
    
    @Autowired
    private CheckpointSaver checkpointSaver;
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        String sessionId = state.value("session_id", String.class).orElse("default");
        
        try {
            // Perform some critical operation
            Object importantResult = performCriticalOperation(state);
            
            // Manually create checkpoint
            Checkpoint checkpoint = Checkpoint.builder()
                .sessionId(sessionId)
                .state(state)
                .metadata(CheckpointMetadata.builder()
                    .nodeId("manual_checkpoint")
                    .timestamp(System.currentTimeMillis())
                    .description("Checkpoint after critical operation completion")
                    .build())
                .build();
            
            checkpointSaver.save(checkpoint);
            
            return Map.of(
                "important_result", importantResult,
                "checkpoint_saved", true
            );
            
        } catch (Exception e) {
            // Save error state checkpoint even if operation fails
            Checkpoint errorCheckpoint = Checkpoint.builder()
                .sessionId(sessionId)
                .state(state)
                .metadata(CheckpointMetadata.builder()
                    .nodeId("error_checkpoint")
                    .timestamp(System.currentTimeMillis())
                    .description("Operation failed: " + e.getMessage())
                    .error(true)
                    .build())
                .build();
            
            checkpointSaver.save(errorCheckpoint);
            throw e;
        }
    }
}
```

## Advanced Persistence Features

### 1. Conditional Checkpoints

```java
import com.alibaba.cloud.ai.graph.checkpoint.CheckpointCondition;

public class ConditionalCheckpointNode implements NodeAction {
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        Object result = performOperation(state);
        
        // Only save checkpoint when specific conditions are met
        CheckpointCondition condition = CheckpointCondition.builder()
            .saveIf(s -> {
                // Only save checkpoint when processing high-importance data
                return s.value("importance_level", String.class)
                    .map("high"::equals)
                    .orElse(false);
            })
            .description("High importance data processing checkpoint")
            .build();
        
        // Apply conditional checkpoint
        CheckpointContext.current().setCondition(condition);
        
        return Map.of("result", result);
    }
}
```

### 2. Incremental Checkpoints

```java
public class IncrementalCheckpointNode implements NodeAction {
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        List<String> items = state.value("items", List.class).orElse(List.of());
        List<String> processedItems = new ArrayList<>();
        
        for (int i = 0; i < items.size(); i++) {
            String item = items.get(i);
            String processed = processItem(item);
            processedItems.add(processed);
            
            // Save incremental checkpoint every 10 items
            if ((i + 1) % 10 == 0) {
                CheckpointContext.current().saveIncremental(Map.of(
                    "processed_items", new ArrayList<>(processedItems),
                    "current_index", i + 1,
                    "progress", (i + 1) * 100 / items.size()
                ));
            }
        }
        
        return Map.of("processed_items", processedItems);
    }
}
```

## Database Persistence Configuration

### 1. Database Schema

```sql
-- Checkpoints table
CREATE TABLE graph_checkpoints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(255) NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    version_name VARCHAR(255),
    state_data LONGTEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_session_id (session_id),
    INDEX idx_session_node (session_id, node_id),
    INDEX idx_session_version (session_id, version_name),
    INDEX idx_created_at (created_at)
);

-- Checkpoint metadata table
CREATE TABLE checkpoint_metadata (
    checkpoint_id BIGINT,
    key_name VARCHAR(255),
    value_data TEXT,
    
    FOREIGN KEY (checkpoint_id) REFERENCES graph_checkpoints(id) ON DELETE CASCADE,
    INDEX idx_checkpoint_key (checkpoint_id, key_name)
);
```

### 2. JPA Entity Configuration

```java
import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "graph_checkpoints")
public class CheckpointEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id", nullable = false)
    private String sessionId;
    
    @Column(name = "node_id", nullable = false)
    private String nodeId;
    
    @Column(name = "version_name")
    private String versionName;
    
    @Lob
    @Column(name = "state_data", nullable = false)
    private String stateData;
    
    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors, getters and setters
}

@Repository
public interface CheckpointRepository extends JpaRepository<CheckpointEntity, Long> {
    
    List<CheckpointEntity> findBySessionIdOrderByCreatedAtDesc(String sessionId);
    
    Optional<CheckpointEntity> findBySessionIdAndVersionName(String sessionId, String versionName);
    
    @Query("SELECT c FROM CheckpointEntity c WHERE c.sessionId = :sessionId " +
           "ORDER BY c.createdAt DESC LIMIT 1")
    Optional<CheckpointEntity> findLatestBySessionId(@Param("sessionId") String sessionId);
    
    void deleteBySessionId(String sessionId);
}
```

## Performance Optimization

### 1. Checkpoint Compression and Serialization

```java
@Component
public class OptimizedCheckpointSaver implements CheckpointSaver {
    
    private final ObjectMapper objectMapper;
    private final Compressor compressor;
    
    public OptimizedCheckpointSaver() {
        this.objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .registerModule(new JavaTimeModule());
        this.compressor = new GzipCompressor();
    }
    
    @Override
    public void save(Checkpoint checkpoint) {
        try {
            // Serialize state
            String stateJson = objectMapper.writeValueAsString(checkpoint.getState().data());
            
            // Compress data
            byte[] compressedData = compressor.compress(stateJson.getBytes(StandardCharsets.UTF_8));
            
            // Save to storage
            saveCompressedCheckpoint(checkpoint.getSessionId(), compressedData, checkpoint.getMetadata());
            
        } catch (Exception e) {
            throw new CheckpointException("Failed to save checkpoint", e);
        }
    }
    
    @Override
    public Optional<Checkpoint> getLatest(String sessionId) {
        try {
            return loadLatestCompressedCheckpoint(sessionId)
                .map(this::decompressAndDeserialize);
        } catch (Exception e) {
            throw new CheckpointException("Failed to load checkpoint", e);
        }
    }
}
```

## Best Practices

### 1. Checkpoint Strategy Selection

- **Frequent saving** vs **Performance considerations**: Find balance between data safety and performance
- **Critical nodes**: Save checkpoints after important computation nodes
- **Long operations**: Save checkpoints before and after time-consuming operations
- **User interaction points**: Save checkpoints before nodes requiring user input

### 2. Storage Management

- **Regular cleanup**: Delete expired checkpoints to save storage space
- **Compression strategy**: Use compression for large state objects to reduce storage requirements
- **Backup mechanism**: Create backups for important checkpoints
- **Monitoring and alerts**: Monitor checkpoint save failures and storage space usage

## Next Steps

- [Durable Execution](./durable-execution) - Learn about durable execution and failure recovery
- [Human-in-the-loop](./human-in-the-loop) - Learn how to integrate human intervention in workflows
- [Durable Execution & Time Travel](../durable-execution) - Explore state rollback and branching features
