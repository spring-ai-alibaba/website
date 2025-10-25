---
title: Memory Management
description: Spring AI Alibaba multi-agent memory management
---

# Memory Management

Memory management in multi-agent systems enables agents to store, retrieve, and share information across conversations and executions, providing context-aware and personalized experiences.

## Memory Types

### 1. Short-term Memory
Temporary storage for current conversation or task context.

### 2. Long-term Memory
Persistent storage for knowledge, experiences, and learned patterns.

### 3. Shared Memory
Memory space accessible by multiple agents for collaboration.

### 4. Episodic Memory
Storage of specific events and experiences with temporal context.

## Basic Configuration

```java
@Configuration
@EnableMemoryManagement
public class MemoryConfig {
    
    @Bean
    public MemoryManager memoryManager() {
        return MemoryManager.builder()
            .shortTermMemory(shortTermMemory())
            .longTermMemory(longTermMemory())
            .sharedMemory(sharedMemory())
            .episodicMemory(episodicMemory())
            .build();
    }
    
    @Bean
    public ShortTermMemory shortTermMemory() {
        return new InMemoryShortTermMemory();
    }
    
    @Bean
    public LongTermMemory longTermMemory() {
        return new VectorLongTermMemory(vectorStore(), embeddingModel());
    }
}
```

## Short-term Memory

### Conversation Context

```java
@Component
public class ConversationMemory {
    
    private final Map<String, ConversationContext> contexts = new ConcurrentHashMap<>();
    
    public void storeMessage(String conversationId, Message message) {
        ConversationContext context = contexts.computeIfAbsent(
            conversationId, 
            id -> new ConversationContext(id)
        );
        
        context.addMessage(message);
        
        // Limit context size
        if (context.getMessages().size() > 50) {
            context.trimToSize(30);
        }
    }
    
    public List<Message> getRecentMessages(String conversationId, int limit) {
        ConversationContext context = contexts.get(conversationId);
        if (context == null) {
            return Collections.emptyList();
        }
        
        List<Message> messages = context.getMessages();
        int start = Math.max(0, messages.size() - limit);
        return messages.subList(start, messages.size());
    }
    
    public void clearConversation(String conversationId) {
        contexts.remove(conversationId);
    }
}
```

### Working Memory

```java
@Component
public class WorkingMemory {
    
    private final Map<String, Map<String, Object>> workingData = new ConcurrentHashMap<>();
    
    public void store(String executionId, String key, Object value) {
        workingData.computeIfAbsent(executionId, id -> new ConcurrentHashMap<>())
                   .put(key, value);
    }
    
    public <T> T retrieve(String executionId, String key, Class<T> type) {
        Map<String, Object> data = workingData.get(executionId);
        if (data != null) {
            Object value = data.get(key);
            if (type.isInstance(value)) {
                return type.cast(value);
            }
        }
        return null;
    }
    
    public void clearExecution(String executionId) {
        workingData.remove(executionId);
    }
    
    public Map<String, Object> getAllData(String executionId) {
        return workingData.getOrDefault(executionId, Collections.emptyMap());
    }
}
```

## Long-term Memory

### Vector-based Knowledge Storage

```java
@Service
public class VectorMemoryService {
    
    @Autowired
    private VectorStore vectorStore;
    
    @Autowired
    private EmbeddingModel embeddingModel;
    
    public void storeKnowledge(String agentId, String content, Map<String, Object> metadata) {
        Document document = new Document(content);
        document.getMetadata().putAll(metadata);
        document.getMetadata().put("agentId", agentId);
        document.getMetadata().put("timestamp", Instant.now());
        document.getMetadata().put("type", "knowledge");
        
        vectorStore.add(List.of(document));
    }
    
    public List<Document> searchKnowledge(String agentId, String query, int limit) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(limit)
                .withSimilarityThreshold(0.7)
                .withFilterExpression("agentId == '" + agentId + "' && type == 'knowledge'")
        );
    }
    
    public void storeExperience(String agentId, Experience experience) {
        String content = String.format("""
            Situation: %s
            Action: %s
            Result: %s
            Outcome: %s
            """, 
            experience.getSituation(),
            experience.getAction(),
            experience.getResult(),
            experience.getOutcome()
        );
        
        Map<String, Object> metadata = Map.of(
            "agentId", agentId,
            "type", "experience",
            "success", experience.isSuccessful(),
            "timestamp", experience.getTimestamp()
        );
        
        storeKnowledge(agentId, content, metadata);
    }
    
    public List<Experience> findSimilarExperiences(String agentId, String situation) {
        List<Document> documents = vectorStore.similaritySearch(
            SearchRequest.query(situation)
                .withTopK(5)
                .withSimilarityThreshold(0.8)
                .withFilterExpression("agentId == '" + agentId + "' && type == 'experience'")
        );
        
        return documents.stream()
            .map(this::documentToExperience)
            .collect(Collectors.toList());
    }
}
```

### Structured Knowledge Base

```java
@Entity
@Table(name = "agent_knowledge")
public class AgentKnowledge {
    @Id
    private String id;
    
    @Column(name = "agent_id")
    private String agentId;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "key_name")
    private String key;
    
    @Column(name = "value", columnDefinition = "jsonb")
    private Map<String, Object> value;
    
    @Column(name = "confidence")
    private Double confidence;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    // getters and setters
}

@Service
public class StructuredKnowledgeService {
    
    @Autowired
    private AgentKnowledgeRepository knowledgeRepository;
    
    public void storeKnowledge(String agentId, String category, String key, Object value, double confidence) {
        AgentKnowledge knowledge = AgentKnowledge.builder()
            .id(UUID.randomUUID().toString())
            .agentId(agentId)
            .category(category)
            .key(key)
            .value(objectToMap(value))
            .confidence(confidence)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        
        knowledgeRepository.save(knowledge);
    }
    
    public Optional<AgentKnowledge> getKnowledge(String agentId, String category, String key) {
        return knowledgeRepository.findByAgentIdAndCategoryAndKey(agentId, category, key);
    }
    
    public List<AgentKnowledge> getKnowledgeByCategory(String agentId, String category) {
        return knowledgeRepository.findByAgentIdAndCategory(agentId, category);
    }
    
    public void updateKnowledge(String agentId, String category, String key, Object newValue, double confidence) {
        Optional<AgentKnowledge> existing = getKnowledge(agentId, category, key);
        
        if (existing.isPresent()) {
            AgentKnowledge knowledge = existing.get();
            knowledge.setValue(objectToMap(newValue));
            knowledge.setConfidence(confidence);
            knowledge.setUpdatedAt(Instant.now());
            knowledgeRepository.save(knowledge);
        } else {
            storeKnowledge(agentId, category, key, newValue, confidence);
        }
    }
}
```

## Shared Memory

### Inter-agent Communication

```java
@Component
public class SharedMemoryService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    private static final String SHARED_PREFIX = "shared:memory:";
    
    public void shareData(String teamId, String key, Object data, Duration ttl) {
        String redisKey = SHARED_PREFIX + teamId + ":" + key;
        
        SharedMemoryEntry entry = SharedMemoryEntry.builder()
            .data(data)
            .sharedBy(getCurrentAgentId())
            .timestamp(Instant.now())
            .build();
        
        redisTemplate.opsForValue().set(redisKey, entry, ttl);
        
        // Notify other agents
        notifyAgents(teamId, key, "data_shared");
    }
    
    public <T> Optional<T> getSharedData(String teamId, String key, Class<T> type) {
        String redisKey = SHARED_PREFIX + teamId + ":" + key;
        SharedMemoryEntry entry = (SharedMemoryEntry) redisTemplate.opsForValue().get(redisKey);
        
        if (entry != null && type.isInstance(entry.getData())) {
            return Optional.of(type.cast(entry.getData()));
        }
        
        return Optional.empty();
    }
    
    public void subscribeToSharedMemory(String teamId, SharedMemoryListener listener) {
        String pattern = SHARED_PREFIX + teamId + ":*";
        
        redisTemplate.execute((RedisCallback<Void>) connection -> {
            connection.pSubscribe(new MessageListener() {
                @Override
                public void onMessage(Message message, byte[] pattern) {
                    String key = extractKeyFromChannel(new String(message.getChannel()));
                    listener.onDataChanged(teamId, key);
                }
            }, pattern.getBytes());
            return null;
        });
    }
    
    private void notifyAgents(String teamId, String key, String event) {
        String channel = SHARED_PREFIX + teamId + ":" + key;
        redisTemplate.convertAndSend(channel, event);
    }
}
```

### Collaborative Knowledge Building

```java
@Service
public class CollaborativeKnowledgeService {
    
    @Autowired
    private SharedMemoryService sharedMemoryService;
    
    @Autowired
    private ChatClient chatClient;
    
    public void contributeKnowledge(String teamId, String topic, String contribution, String agentId) {
        // Get existing knowledge
        Optional<CollaborativeKnowledge> existing = sharedMemoryService
            .getSharedData(teamId, "knowledge:" + topic, CollaborativeKnowledge.class);
        
        CollaborativeKnowledge knowledge;
        if (existing.isPresent()) {
            knowledge = existing.get();
            knowledge.addContribution(agentId, contribution);
        } else {
            knowledge = CollaborativeKnowledge.builder()
                .topic(topic)
                .contributions(new HashMap<>())
                .build();
            knowledge.addContribution(agentId, contribution);
        }
        
        // Synthesize knowledge if multiple contributions exist
        if (knowledge.getContributions().size() > 1) {
            String synthesized = synthesizeKnowledge(knowledge);
            knowledge.setSynthesizedKnowledge(synthesized);
        }
        
        // Share updated knowledge
        sharedMemoryService.shareData(teamId, "knowledge:" + topic, knowledge, Duration.ofHours(24));
    }
    
    private String synthesizeKnowledge(CollaborativeKnowledge knowledge) {
        String prompt = String.format("""
            Synthesize the following knowledge contributions about "%s":
            
            %s
            
            Please provide a comprehensive and coherent synthesis that combines the best insights from all contributions.
            """,
            knowledge.getTopic(),
            knowledge.getContributions().entrySet().stream()
                .map(entry -> "Agent " + entry.getKey() + ": " + entry.getValue())
                .collect(Collectors.joining("\n\n"))
        );
        
        return chatClient.prompt()
            .user(prompt)
            .call()
            .content();
    }
}
```

## Episodic Memory

### Event Storage and Retrieval

```java
@Service
public class EpisodicMemoryService {
    
    @Autowired
    private EpisodeRepository episodeRepository;
    
    public void recordEpisode(String agentId, Episode episode) {
        EpisodeEntity entity = EpisodeEntity.builder()
            .id(UUID.randomUUID().toString())
            .agentId(agentId)
            .type(episode.getType())
            .description(episode.getDescription())
            .context(episode.getContext())
            .outcome(episode.getOutcome())
            .timestamp(episode.getTimestamp())
            .tags(episode.getTags())
            .build();
        
        episodeRepository.save(entity);
    }
    
    public List<Episode> findEpisodesByTimeRange(String agentId, Instant start, Instant end) {
        List<EpisodeEntity> entities = episodeRepository
            .findByAgentIdAndTimestampBetween(agentId, start, end);
        
        return entities.stream()
            .map(this::entityToEpisode)
            .collect(Collectors.toList());
    }
    
    public List<Episode> findSimilarEpisodes(String agentId, String description, int limit) {
        // Use vector search for semantic similarity
        List<Document> documents = vectorStore.similaritySearch(
            SearchRequest.query(description)
                .withTopK(limit)
                .withSimilarityThreshold(0.7)
                .withFilterExpression("agentId == '" + agentId + "' && type == 'episode'")
        );
        
        return documents.stream()
            .map(this::documentToEpisode)
            .collect(Collectors.toList());
    }
    
    public List<Episode> findEpisodesByPattern(String agentId, EpisodePattern pattern) {
        return episodeRepository.findByAgentIdAndTypeAndOutcome(
            agentId, pattern.getType(), pattern.getOutcome()
        ).stream()
        .map(this::entityToEpisode)
        .collect(Collectors.toList());
    }
}
```

## Memory Optimization

### Memory Consolidation

```java
@Service
public class MemoryConsolidationService {
    
    @Autowired
    private ChatClient chatClient;
    
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void consolidateMemories() {
        List<String> activeAgents = getActiveAgents();
        
        for (String agentId : activeAgents) {
            consolidateAgentMemories(agentId);
        }
    }
    
    private void consolidateAgentMemories(String agentId) {
        // Get recent episodes
        Instant yesterday = Instant.now().minus(Duration.ofDays(1));
        List<Episode> recentEpisodes = episodicMemoryService
            .findEpisodesByTimeRange(agentId, yesterday, Instant.now());
        
        if (recentEpisodes.size() > 10) {
            // Consolidate into patterns and insights
            String consolidationPrompt = String.format("""
                Analyze the following episodes and extract patterns, insights, and learnings:
                
                %s
                
                Please provide:
                1. Common patterns
                2. Key insights
                3. Lessons learned
                4. Recommendations for future actions
                """,
                recentEpisodes.stream()
                    .map(Episode::getDescription)
                    .collect(Collectors.joining("\n"))
            );
            
            String insights = chatClient.prompt()
                .user(consolidationPrompt)
                .call()
                .content();
            
            // Store consolidated insights
            structuredKnowledgeService.storeKnowledge(
                agentId, "insights", "daily_consolidation_" + LocalDate.now(), insights, 0.9
            );
        }
    }
}
```

### Memory Cleanup

```java
@Component
public class MemoryCleanupService {
    
    @Scheduled(cron = "0 0 3 * * ?") // Daily at 3 AM
    public void cleanupOldMemories() {
        cleanupShortTermMemory();
        cleanupLowConfidenceKnowledge();
        cleanupOldEpisodes();
    }
    
    private void cleanupShortTermMemory() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(24));
        
        // Clean up old conversation contexts
        conversationMemory.cleanupOldContexts(cutoff);
        
        // Clean up working memory for completed executions
        workingMemory.cleanupCompletedExecutions();
    }
    
    private void cleanupLowConfidenceKnowledge() {
        List<AgentKnowledge> lowConfidenceKnowledge = knowledgeRepository
            .findByConfidenceLessThan(0.3);
        
        for (AgentKnowledge knowledge : lowConfidenceKnowledge) {
            if (knowledge.getCreatedAt().isBefore(Instant.now().minus(Duration.ofDays(30)))) {
                knowledgeRepository.delete(knowledge);
            }
        }
    }
    
    private void cleanupOldEpisodes() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(90));
        episodeRepository.deleteByTimestampBefore(cutoff);
    }
}
```

## Configuration Options

```properties
# Memory management configuration
spring.ai.memory.enabled=true
spring.ai.memory.short-term.max-size=1000
spring.ai.memory.short-term.ttl=24h

# Long-term memory configuration
spring.ai.memory.long-term.vector-store=pinecone
spring.ai.memory.long-term.embedding-model=text-embedding-ada-002
spring.ai.memory.long-term.similarity-threshold=0.7

# Shared memory configuration
spring.ai.memory.shared.enabled=true
spring.ai.memory.shared.redis.ttl=24h
spring.ai.memory.shared.notification=true

# Episodic memory configuration
spring.ai.memory.episodic.enabled=true
spring.ai.memory.episodic.retention-days=90
spring.ai.memory.episodic.auto-consolidation=true

# Memory optimization
spring.ai.memory.optimization.consolidation.enabled=true
spring.ai.memory.optimization.consolidation.schedule=0 0 2 * * ?
spring.ai.memory.optimization.cleanup.enabled=true
spring.ai.memory.optimization.cleanup.schedule=0 0 3 * * ?
```

## Best Practices

### 1. Memory Design
- Choose appropriate memory types for different use cases
- Design efficient memory access patterns
- Implement proper memory lifecycle management
- Balance memory size with performance

### 2. Data Organization
- Use meaningful categories and keys
- Implement proper indexing strategies
- Design for scalability
- Consider data relationships

### 3. Performance Optimization
- Implement caching strategies
- Use asynchronous operations where possible
- Monitor memory usage
- Optimize query patterns

### 4. Privacy and Security
- Implement data encryption for sensitive information
- Set appropriate access controls
- Comply with data retention policies
- Audit memory access patterns

## Next Steps

- [Learn about Context Management](/docs/1.0.0.3/multi-agent/context/)
- [Understand Human-in-the-Loop](/docs/1.0.0.3/multi-agent/human-in-the-loop/)
- [Explore Durable Execution & Time Travel](/docs/1.0.0.3/multi-agent/durable-execution/)
