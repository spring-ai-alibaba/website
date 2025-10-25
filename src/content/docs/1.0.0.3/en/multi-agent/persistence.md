---
title: Persistence
description: Spring AI Alibaba multi-agent persistence
---

# Persistence

Persistence is an important component of multi-agent systems, ensuring that agent states, conversation history, and execution progress can be reliably saved and restored.

## Persistence Types

### 1. State Persistence
Save agent execution states to support interruption recovery.

### 2. Conversation Persistence
Save complete conversation history and context.

### 3. Knowledge Persistence
Save agent-learned knowledge and experience.

### 4. Configuration Persistence
Save agent configurations and settings.

## State Persistence

### Basic Configuration

```java
@Configuration
public class PersistenceConfig {
    
    @Bean
    public StateStore stateStore() {
        return new RedisStateStore(redisTemplate());
    }
    
    @Bean
    public CheckpointManager checkpointManager() {
        return new DatabaseCheckpointManager(dataSource());
    }
}
```

### State Saving

```java
@Component
public class StatePersistenceService {
    
    @Autowired
    private StateStore stateStore;
    
    public void saveState(String executionId, OverallState state) {
        StateSnapshot snapshot = StateSnapshot.builder()
            .executionId(executionId)
            .state(state)
            .timestamp(Instant.now())
            .version(generateVersion())
            .build();
        
        stateStore.save(executionId, snapshot);
    }
    
    public OverallState loadState(String executionId) {
        StateSnapshot snapshot = stateStore.load(executionId);
        return snapshot != null ? snapshot.getState() : null;
    }
    
    public List<StateSnapshot> getStateHistory(String executionId) {
        return stateStore.getHistory(executionId);
    }
}
```

## Checkpoint Mechanism

### Automatic Checkpoints

```java
@Component
public class AutoCheckpointService {
    
    @Autowired
    private CheckpointManager checkpointManager;
    
    @EventListener
    public void onNodeCompletion(NodeCompletionEvent event) {
        if (shouldCreateCheckpoint(event)) {
            Checkpoint checkpoint = Checkpoint.builder()
                .executionId(event.getExecutionId())
                .nodeId(event.getNodeId())
                .state(event.getState())
                .timestamp(Instant.now())
                .build();
            
            checkpointManager.createCheckpoint(checkpoint);
        }
    }
    
    private boolean shouldCreateCheckpoint(NodeCompletionEvent event) {
        // Checkpoint creation strategy
        return event.getNodeId().endsWith("_checkpoint") || 
               event.getExecutionTime().toSeconds() > 30;
    }
}
```

### Manual Checkpoints

```java
@Service
public class ManualCheckpointService {
    
    public String createCheckpoint(String executionId, String description) {
        GraphExecution execution = executionRegistry.getExecution(executionId);
        OverallState currentState = execution.getCurrentState();
        
        Checkpoint checkpoint = Checkpoint.builder()
            .id(UUID.randomUUID().toString())
            .executionId(executionId)
            .state(currentState)
            .description(description)
            .timestamp(Instant.now())
            .build();
        
        checkpointManager.createCheckpoint(checkpoint);
        return checkpoint.getId();
    }
    
    public void restoreFromCheckpoint(String checkpointId) {
        Checkpoint checkpoint = checkpointManager.getCheckpoint(checkpointId);
        
        GraphExecution execution = executionRegistry.getExecution(checkpoint.getExecutionId());
        execution.restoreState(checkpoint.getState());
    }
}
```

## Database Persistence

### Entity Definitions

```java
@Entity
@Table(name = "agent_executions")
public class AgentExecution {
    @Id
    private String id;
    
    @Column(name = "graph_id")
    private String graphId;
    
    @Column(name = "current_node")
    private String currentNode;
    
    @Column(name = "state", columnDefinition = "jsonb")
    private Map<String, Object> state;
    
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    // getters and setters
}

@Entity
@Table(name = "execution_checkpoints")
public class ExecutionCheckpoint {
    @Id
    private String id;
    
    @Column(name = "execution_id")
    private String executionId;
    
    @Column(name = "node_id")
    private String nodeId;
    
    @Column(name = "state", columnDefinition = "jsonb")
    private Map<String, Object> state;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    // getters and setters
}
```

### Repository Implementation

```java
@Repository
public interface AgentExecutionRepository extends JpaRepository<AgentExecution, String> {
    List<AgentExecution> findByGraphIdAndStatus(String graphId, ExecutionStatus status);
    List<AgentExecution> findByStatusAndCreatedAtBefore(ExecutionStatus status, Instant before);
}

@Repository
public interface ExecutionCheckpointRepository extends JpaRepository<ExecutionCheckpoint, String> {
    List<ExecutionCheckpoint> findByExecutionIdOrderByCreatedAtDesc(String executionId);
    Optional<ExecutionCheckpoint> findFirstByExecutionIdOrderByCreatedAtDesc(String executionId);
}
```

### Service Implementation

```java
@Service
@Transactional
public class DatabasePersistenceService {
    
    @Autowired
    private AgentExecutionRepository executionRepository;
    
    @Autowired
    private ExecutionCheckpointRepository checkpointRepository;
    
    public void saveExecution(GraphExecution execution) {
        AgentExecution entity = new AgentExecution();
        entity.setId(execution.getId());
        entity.setGraphId(execution.getGraphId());
        entity.setCurrentNode(execution.getCurrentNode());
        entity.setState(execution.getState().toMap());
        entity.setStatus(execution.getStatus());
        entity.setUpdatedAt(Instant.now());
        
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(Instant.now());
        }
        
        executionRepository.save(entity);
    }
    
    public GraphExecution loadExecution(String executionId) {
        AgentExecution entity = executionRepository.findById(executionId)
            .orElseThrow(() -> new ExecutionNotFoundException(executionId));
        
        return GraphExecution.builder()
            .id(entity.getId())
            .graphId(entity.getGraphId())
            .currentNode(entity.getCurrentNode())
            .state(OverallState.fromMap(entity.getState()))
            .status(entity.getStatus())
            .build();
    }
}
```

## Redis Persistence

### Redis Configuration

```java
@Configuration
public class RedisPersistenceConfig {
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
    
    @Bean
    public RedisStateStore redisStateStore(RedisTemplate<String, Object> redisTemplate) {
        return new RedisStateStore(redisTemplate);
    }
}
```

### Redis State Storage

```java
@Component
public class RedisStateStore implements StateStore {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String STATE_PREFIX = "agent:state:";
    private static final String HISTORY_PREFIX = "agent:history:";
    
    public RedisStateStore(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @Override
    public void save(String executionId, StateSnapshot snapshot) {
        String key = STATE_PREFIX + executionId;
        redisTemplate.opsForValue().set(key, snapshot, Duration.ofHours(24));
        
        // Save to history
        String historyKey = HISTORY_PREFIX + executionId;
        redisTemplate.opsForList().rightPush(historyKey, snapshot);
        redisTemplate.expire(historyKey, Duration.ofDays(7));
    }
    
    @Override
    public StateSnapshot load(String executionId) {
        String key = STATE_PREFIX + executionId;
        return (StateSnapshot) redisTemplate.opsForValue().get(key);
    }
    
    @Override
    public List<StateSnapshot> getHistory(String executionId) {
        String historyKey = HISTORY_PREFIX + executionId;
        List<Object> history = redisTemplate.opsForList().range(historyKey, 0, -1);
        
        return history.stream()
            .map(obj -> (StateSnapshot) obj)
            .collect(Collectors.toList());
    }
}
```

## Conversation Persistence

### Conversation Storage

```java
@Service
public class ConversationPersistenceService {
    
    @Autowired
    private ConversationRepository conversationRepository;
    
    @Autowired
    private MessageRepository messageRepository;
    
    public void saveMessage(String conversationId, Message message) {
        ConversationMessage entity = ConversationMessage.builder()
            .id(UUID.randomUUID().toString())
            .conversationId(conversationId)
            .messageType(message.getMessageType().name())
            .content(message.getContent())
            .metadata(message.getMetadata())
            .timestamp(Instant.now())
            .build();
        
        messageRepository.save(entity);
        
        // Update conversation last activity time
        updateConversationActivity(conversationId);
    }
    
    public List<Message> loadConversationHistory(String conversationId) {
        List<ConversationMessage> messages = messageRepository
            .findByConversationIdOrderByTimestamp(conversationId);
        
        return messages.stream()
            .map(this::toMessage)
            .collect(Collectors.toList());
    }
    
    private Message toMessage(ConversationMessage entity) {
        MessageType type = MessageType.valueOf(entity.getMessageType());
        
        switch (type) {
            case USER:
                return new UserMessage(entity.getContent(), entity.getMetadata());
            case ASSISTANT:
                return new AssistantMessage(entity.getContent(), entity.getMetadata());
            case SYSTEM:
                return new SystemMessage(entity.getContent(), entity.getMetadata());
            default:
                throw new IllegalArgumentException("Unknown message type: " + type);
        }
    }
}
```

## Knowledge Persistence

### Vector Database

```java
@Service
public class VectorKnowledgePersistence {
    
    @Autowired
    private VectorStore vectorStore;
    
    @Autowired
    private EmbeddingModel embeddingModel;
    
    public void saveKnowledge(String agentId, String content, Map<String, Object> metadata) {
        Document document = new Document(content);
        document.getMetadata().putAll(metadata);
        document.getMetadata().put("agentId", agentId);
        document.getMetadata().put("timestamp", Instant.now());
        
        vectorStore.add(List.of(document));
    }
    
    public List<Document> searchKnowledge(String agentId, String query, int limit) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(limit)
                .withSimilarityThreshold(0.7)
                .withFilterExpression("agentId == '" + agentId + "'")
        );
    }
    
    public void updateKnowledge(String documentId, String newContent) {
        // Delete old document
        vectorStore.delete(List.of(documentId));
        
        // Add new document
        Document newDocument = new Document(newContent);
        newDocument.getMetadata().put("updated", Instant.now());
        vectorStore.add(List.of(newDocument));
    }
}
```

## Configuration Persistence

### Configuration Management

```java
@Service
public class ConfigurationPersistenceService {
    
    @Autowired
    private AgentConfigRepository configRepository;
    
    public void saveAgentConfig(String agentId, AgentConfiguration config) {
        AgentConfigEntity entity = AgentConfigEntity.builder()
            .agentId(agentId)
            .configuration(config.toMap())
            .version(generateVersion())
            .createdAt(Instant.now())
            .build();
        
        configRepository.save(entity);
    }
    
    public AgentConfiguration loadAgentConfig(String agentId) {
        AgentConfigEntity entity = configRepository
            .findFirstByAgentIdOrderByCreatedAtDesc(agentId)
            .orElseThrow(() -> new ConfigNotFoundException(agentId));
        
        return AgentConfiguration.fromMap(entity.getConfiguration());
    }
    
    public List<AgentConfiguration> getConfigHistory(String agentId) {
        List<AgentConfigEntity> entities = configRepository
            .findByAgentIdOrderByCreatedAtDesc(agentId);
        
        return entities.stream()
            .map(entity -> AgentConfiguration.fromMap(entity.getConfiguration()))
            .collect(Collectors.toList());
    }
}
```

## Data Cleanup

### Automatic Cleanup

```java
@Component
public class DataCleanupService {
    
    @Scheduled(cron = "0 0 2 * * ?") // Execute daily at 2 AM
    public void cleanupOldData() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(30));
        
        // Clean expired execution records
        List<AgentExecution> expiredExecutions = executionRepository
            .findByStatusAndCreatedAtBefore(ExecutionStatus.COMPLETED, cutoff);
        
        for (AgentExecution execution : expiredExecutions) {
            cleanupExecution(execution.getId());
        }
        
        // Clean expired checkpoints
        checkpointRepository.deleteByCreatedAtBefore(cutoff);
        
        log.info("Cleaned up {} expired executions", expiredExecutions.size());
    }
    
    private void cleanupExecution(String executionId) {
        // Delete state snapshots
        stateStore.delete(executionId);
        
        // Delete checkpoints
        checkpointRepository.deleteByExecutionId(executionId);
        
        // Delete execution records
        executionRepository.deleteById(executionId);
    }
}
```

## Backup and Recovery

### Data Backup

```java
@Service
public class BackupService {
    
    public void createBackup(String backupName) {
        BackupMetadata metadata = BackupMetadata.builder()
            .name(backupName)
            .timestamp(Instant.now())
            .build();
        
        // Backup execution data
        List<AgentExecution> executions = executionRepository.findAll();
        backupExecutions(metadata, executions);
        
        // Backup checkpoint data
        List<ExecutionCheckpoint> checkpoints = checkpointRepository.findAll();
        backupCheckpoints(metadata, checkpoints);
        
        // Backup configuration data
        List<AgentConfigEntity> configs = configRepository.findAll();
        backupConfigs(metadata, configs);
        
        saveBackupMetadata(metadata);
    }
    
    public void restoreBackup(String backupName) {
        BackupMetadata metadata = loadBackupMetadata(backupName);
        
        // Restore data
        restoreExecutions(metadata);
        restoreCheckpoints(metadata);
        restoreConfigs(metadata);
        
        log.info("Backup restored: {}", backupName);
    }
}
```

## Configuration Options

```properties
# Persistence configuration
spring.ai.persistence.enabled=true
spring.ai.persistence.type=database

# Database configuration
spring.ai.persistence.database.auto-checkpoint=true
spring.ai.persistence.database.checkpoint-interval=5m

# Redis configuration
spring.ai.persistence.redis.ttl=24h
spring.ai.persistence.redis.history-size=100

# Cleanup configuration
spring.ai.persistence.cleanup.enabled=true
spring.ai.persistence.cleanup.retention-days=30
spring.ai.persistence.cleanup.schedule=0 0 2 * * ?

# Backup configuration
spring.ai.persistence.backup.enabled=true
spring.ai.persistence.backup.schedule=0 0 3 * * SUN
spring.ai.persistence.backup.retention-count=4
```

## Best Practices

### 1. Storage Strategy
- Choose appropriate storage backends
- Design reasonable data models
- Implement data sharding strategies

### 2. Performance Optimization
- Use connection pooling
- Implement caching mechanisms
- Optimize query performance

### 3. Data Security
- Implement data encryption
- Set access controls
- Regular data backups

### 4. Monitoring and Maintenance
- Monitor storage usage
- Regular cleanup of expired data
- Verify backup integrity

## Next Steps

- [Learn about Durable Execution](/docs/1.0.0.3/multi-agent/durable-execution/)
- [Understand Memory Management](/docs/1.0.0.3/multi-agent/memory/)
- [Explore Context Management](/docs/1.0.0.3/multi-agent/context/)
