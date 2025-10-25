---
title: Context Management
description: Spring AI Alibaba multi-agent context management
---

# Context Management

Context management in multi-agent systems ensures that agents have access to relevant information and maintain awareness of their environment, conversation history, and execution state.

## Context Types

### 1. Execution Context
Information about the current execution state, including variables, progress, and metadata.

### 2. Conversation Context
Historical conversation data, user preferences, and interaction patterns.

### 3. Agent Context
Agent-specific information including capabilities, configuration, and state.

### 4. Global Context
System-wide information accessible to all agents.

## Basic Configuration

```java
@Configuration
@EnableContextManagement
public class ContextConfig {
    
    @Bean
    public ContextManager contextManager() {
        return ContextManager.builder()
            .executionContextStore(executionContextStore())
            .conversationContextStore(conversationContextStore())
            .agentContextStore(agentContextStore())
            .globalContextStore(globalContextStore())
            .build();
    }
    
    @Bean
    public ExecutionContextStore executionContextStore() {
        return new RedisExecutionContextStore(redisTemplate());
    }
    
    @Bean
    public ConversationContextStore conversationContextStore() {
        return new DatabaseConversationContextStore(dataSource());
    }
}
```

## Execution Context

### Context Creation and Management

```java
@Service
public class ExecutionContextService {
    
    @Autowired
    private ContextManager contextManager;
    
    public ExecutionContext createExecutionContext(String executionId, Map<String, Object> initialData) {
        ExecutionContext context = ExecutionContext.builder()
            .executionId(executionId)
            .data(new ConcurrentHashMap<>(initialData))
            .createdAt(Instant.now())
            .lastUpdated(Instant.now())
            .build();
        
        contextManager.saveExecutionContext(context);
        return context;
    }
    
    public void updateContext(String executionId, String key, Object value) {
        ExecutionContext context = contextManager.getExecutionContext(executionId);
        if (context != null) {
            context.getData().put(key, value);
            context.setLastUpdated(Instant.now());
            contextManager.saveExecutionContext(context);
            
            // Notify context change
            publishContextChangeEvent(executionId, key, value);
        }
    }
    
    public <T> T getContextValue(String executionId, String key, Class<T> type) {
        ExecutionContext context = contextManager.getExecutionContext(executionId);
        if (context != null) {
            Object value = context.getData().get(key);
            if (type.isInstance(value)) {
                return type.cast(value);
            }
        }
        return null;
    }
    
    public void mergeContext(String executionId, Map<String, Object> additionalData) {
        ExecutionContext context = contextManager.getExecutionContext(executionId);
        if (context != null) {
            context.getData().putAll(additionalData);
            context.setLastUpdated(Instant.now());
            contextManager.saveExecutionContext(context);
        }
    }
}
```

### Context Inheritance

```java
@Component
public class ContextInheritanceService {
    
    public ExecutionContext createChildContext(String parentExecutionId, String childExecutionId) {
        ExecutionContext parentContext = contextManager.getExecutionContext(parentExecutionId);
        
        if (parentContext == null) {
            throw new ContextNotFoundException("Parent context not found: " + parentExecutionId);
        }
        
        // Create child context with inherited data
        Map<String, Object> inheritedData = new HashMap<>();
        
        // Copy inheritable data
        for (Map.Entry<String, Object> entry : parentContext.getData().entrySet()) {
            if (isInheritable(entry.getKey())) {
                inheritedData.put(entry.getKey(), entry.getValue());
            }
        }
        
        ExecutionContext childContext = ExecutionContext.builder()
            .executionId(childExecutionId)
            .parentExecutionId(parentExecutionId)
            .data(new ConcurrentHashMap<>(inheritedData))
            .createdAt(Instant.now())
            .lastUpdated(Instant.now())
            .build();
        
        contextManager.saveExecutionContext(childContext);
        return childContext;
    }
    
    private boolean isInheritable(String key) {
        // Define inheritance rules
        return !key.startsWith("_private") && 
               !key.equals("executionId") &&
               !key.equals("nodeId");
    }
    
    public void propagateContextChange(String executionId, String key, Object value) {
        if (isPropagatable(key)) {
            List<String> childExecutions = findChildExecutions(executionId);
            
            for (String childId : childExecutions) {
                executionContextService.updateContext(childId, key, value);
            }
        }
    }
}
```

## Conversation Context

### Context Tracking

```java
@Service
public class ConversationContextService {
    
    @Autowired
    private ConversationContextRepository contextRepository;
    
    public void updateConversationContext(String conversationId, String userId, ConversationUpdate update) {
        ConversationContext context = contextRepository.findByConversationId(conversationId)
            .orElse(ConversationContext.builder()
                .conversationId(conversationId)
                .userId(userId)
                .data(new HashMap<>())
                .createdAt(Instant.now())
                .build());
        
        // Update context data
        context.getData().putAll(update.getData());
        context.setLastUpdated(Instant.now());
        
        // Track conversation flow
        if (update.getCurrentIntent() != null) {
            context.setCurrentIntent(update.getCurrentIntent());
        }
        
        if (update.getCurrentTopic() != null) {
            context.setCurrentTopic(update.getCurrentTopic());
        }
        
        contextRepository.save(context);
    }
    
    public ConversationSummary getConversationSummary(String conversationId) {
        ConversationContext context = contextRepository.findByConversationId(conversationId)
            .orElse(null);
        
        if (context == null) {
            return ConversationSummary.empty();
        }
        
        return ConversationSummary.builder()
            .conversationId(conversationId)
            .userId(context.getUserId())
            .currentIntent(context.getCurrentIntent())
            .currentTopic(context.getCurrentTopic())
            .contextData(context.getData())
            .lastUpdated(context.getLastUpdated())
            .build();
    }
    
    public void trackUserPreferences(String userId, Map<String, Object> preferences) {
        UserPreferences userPrefs = userPreferencesRepository.findByUserId(userId)
            .orElse(UserPreferences.builder()
                .userId(userId)
                .preferences(new HashMap<>())
                .build());
        
        userPrefs.getPreferences().putAll(preferences);
        userPrefs.setUpdatedAt(Instant.now());
        
        userPreferencesRepository.save(userPrefs);
    }
}
```

### Context-aware Responses

```java
@Component
public class ContextAwareResponseService {
    
    @Autowired
    private ChatClient chatClient;
    
    @Autowired
    private ConversationContextService contextService;
    
    public String generateContextAwareResponse(String conversationId, String message) {
        ConversationSummary context = contextService.getConversationSummary(conversationId);
        
        String contextualPrompt = buildContextualPrompt(message, context);
        
        return chatClient.prompt()
            .user(contextualPrompt)
            .call()
            .content();
    }
    
    private String buildContextualPrompt(String message, ConversationSummary context) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("User message: ").append(message).append("\n\n");
        
        if (context.getCurrentIntent() != null) {
            prompt.append("Current conversation intent: ").append(context.getCurrentIntent()).append("\n");
        }
        
        if (context.getCurrentTopic() != null) {
            prompt.append("Current topic: ").append(context.getCurrentTopic()).append("\n");
        }
        
        if (!context.getContextData().isEmpty()) {
            prompt.append("Conversation context:\n");
            context.getContextData().forEach((key, value) -> 
                prompt.append("- ").append(key).append(": ").append(value).append("\n"));
        }
        
        prompt.append("\nPlease provide a contextually appropriate response.");
        
        return prompt.toString();
    }
}
```

## Agent Context

### Agent State Management

```java
@Service
public class AgentContextService {
    
    private final Map<String, AgentContext> agentContexts = new ConcurrentHashMap<>();
    
    public void initializeAgentContext(String agentId, AgentConfiguration config) {
        AgentContext context = AgentContext.builder()
            .agentId(agentId)
            .configuration(config)
            .state(AgentState.IDLE)
            .capabilities(config.getCapabilities())
            .metadata(new HashMap<>())
            .createdAt(Instant.now())
            .lastUpdated(Instant.now())
            .build();
        
        agentContexts.put(agentId, context);
    }
    
    public void updateAgentState(String agentId, AgentState newState) {
        AgentContext context = agentContexts.get(agentId);
        if (context != null) {
            context.setState(newState);
            context.setLastUpdated(Instant.now());
            
            // Publish state change event
            publishAgentStateChangeEvent(agentId, newState);
        }
    }
    
    public void setAgentMetadata(String agentId, String key, Object value) {
        AgentContext context = agentContexts.get(agentId);
        if (context != null) {
            context.getMetadata().put(key, value);
            context.setLastUpdated(Instant.now());
        }
    }
    
    public AgentContext getAgentContext(String agentId) {
        return agentContexts.get(agentId);
    }
    
    public List<AgentContext> getAgentsByState(AgentState state) {
        return agentContexts.values().stream()
            .filter(context -> context.getState() == state)
            .collect(Collectors.toList());
    }
}
```

### Capability Context

```java
@Component
public class CapabilityContextService {
    
    public void registerCapability(String agentId, Capability capability) {
        AgentContext context = agentContextService.getAgentContext(agentId);
        if (context != null) {
            context.getCapabilities().add(capability);
            
            // Update capability index
            capabilityIndex.addCapability(agentId, capability);
        }
    }
    
    public List<String> findAgentsWithCapability(String capabilityName) {
        return capabilityIndex.findAgentsByCapability(capabilityName);
    }
    
    public boolean hasCapability(String agentId, String capabilityName) {
        AgentContext context = agentContextService.getAgentContext(agentId);
        return context != null && 
               context.getCapabilities().stream()
                   .anyMatch(cap -> cap.getName().equals(capabilityName));
    }
    
    public CapabilityMatch findBestCapabilityMatch(String requiredCapability, Map<String, Object> requirements) {
        List<String> candidateAgents = findAgentsWithCapability(requiredCapability);
        
        return candidateAgents.stream()
            .map(agentId -> evaluateCapabilityMatch(agentId, requiredCapability, requirements))
            .max(Comparator.comparing(CapabilityMatch::getScore))
            .orElse(null);
    }
}
```

## Global Context

### System-wide Information

```java
@Service
public class GlobalContextService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    private static final String GLOBAL_CONTEXT_PREFIX = "global:context:";
    
    public void setGlobalValue(String key, Object value, Duration ttl) {
        String redisKey = GLOBAL_CONTEXT_PREFIX + key;
        
        GlobalContextEntry entry = GlobalContextEntry.builder()
            .value(value)
            .setBy("system")
            .timestamp(Instant.now())
            .build();
        
        redisTemplate.opsForValue().set(redisKey, entry, ttl);
        
        // Notify all agents of global context change
        publishGlobalContextChangeEvent(key, value);
    }
    
    public <T> T getGlobalValue(String key, Class<T> type) {
        String redisKey = GLOBAL_CONTEXT_PREFIX + key;
        GlobalContextEntry entry = (GlobalContextEntry) redisTemplate.opsForValue().get(redisKey);
        
        if (entry != null && type.isInstance(entry.getValue())) {
            return type.cast(entry.getValue());
        }
        
        return null;
    }
    
    public void setSystemStatus(SystemStatus status) {
        setGlobalValue("system.status", status, Duration.ofMinutes(5));
    }
    
    public void setMaintenanceMode(boolean enabled) {
        setGlobalValue("system.maintenance", enabled, Duration.ofHours(24));
    }
    
    public Map<String, Object> getAllGlobalContext() {
        Set<String> keys = redisTemplate.keys(GLOBAL_CONTEXT_PREFIX + "*");
        Map<String, Object> result = new HashMap<>();
        
        for (String key : keys) {
            GlobalContextEntry entry = (GlobalContextEntry) redisTemplate.opsForValue().get(key);
            if (entry != null) {
                String contextKey = key.substring(GLOBAL_CONTEXT_PREFIX.length());
                result.put(contextKey, entry.getValue());
            }
        }
        
        return result;
    }
}
```

## Context Synchronization

### Multi-agent Context Sync

```java
@Component
public class ContextSynchronizationService {
    
    @EventListener
    public void onContextChange(ContextChangeEvent event) {
        if (event.isSyncRequired()) {
            synchronizeContext(event);
        }
    }
    
    private void synchronizeContext(ContextChangeEvent event) {
        switch (event.getContextType()) {
            case EXECUTION:
                synchronizeExecutionContext(event);
                break;
            case CONVERSATION:
                synchronizeConversationContext(event);
                break;
            case AGENT:
                synchronizeAgentContext(event);
                break;
            case GLOBAL:
                synchronizeGlobalContext(event);
                break;
        }
    }
    
    private void synchronizeExecutionContext(ContextChangeEvent event) {
        String executionId = event.getExecutionId();
        List<String> relatedAgents = findRelatedAgents(executionId);
        
        for (String agentId : relatedAgents) {
            notifyAgentOfContextChange(agentId, event);
        }
    }
    
    private void notifyAgentOfContextChange(String agentId, ContextChangeEvent event) {
        AgentContext agentContext = agentContextService.getAgentContext(agentId);
        if (agentContext != null && agentContext.getState() == AgentState.ACTIVE) {
            // Send context update to agent
            messagingTemplate.convertAndSend("/topic/agent/" + agentId + "/context", event);
        }
    }
}
```

## Context Validation

### Context Integrity Checks

```java
@Component
public class ContextValidationService {
    
    public ValidationResult validateExecutionContext(String executionId) {
        ExecutionContext context = contextManager.getExecutionContext(executionId);
        
        if (context == null) {
            return ValidationResult.failure("Context not found");
        }
        
        List<ValidationError> errors = new ArrayList<>();
        
        // Check required fields
        if (context.getData().get("userId") == null) {
            errors.add(new ValidationError("Missing required field: userId"));
        }
        
        // Check data consistency
        if (!isDataConsistent(context.getData())) {
            errors.add(new ValidationError("Data consistency check failed"));
        }
        
        // Check context age
        if (isContextStale(context)) {
            errors.add(new ValidationError("Context is stale"));
        }
        
        return errors.isEmpty() ? 
            ValidationResult.success() : 
            ValidationResult.failure(errors);
    }
    
    private boolean isDataConsistent(Map<String, Object> data) {
        // Implement consistency checks
        return true;
    }
    
    private boolean isContextStale(ExecutionContext context) {
        Duration age = Duration.between(context.getLastUpdated(), Instant.now());
        return age.toHours() > 24;
    }
}
```

## Configuration Options

```properties
# Context management configuration
spring.ai.context.enabled=true
spring.ai.context.validation.enabled=true
spring.ai.context.synchronization.enabled=true

# Execution context configuration
spring.ai.context.execution.store=redis
spring.ai.context.execution.ttl=24h
spring.ai.context.execution.inheritance=true

# Conversation context configuration
spring.ai.context.conversation.store=database
spring.ai.context.conversation.retention-days=90
spring.ai.context.conversation.user-preferences=true

# Agent context configuration
spring.ai.context.agent.store=memory
spring.ai.context.agent.capability-index=true
spring.ai.context.agent.state-tracking=true

# Global context configuration
spring.ai.context.global.store=redis
spring.ai.context.global.ttl=1h
spring.ai.context.global.broadcast=true
```

## Best Practices

### 1. Context Design
- Define clear context boundaries
- Use appropriate context types for different scenarios
- Implement context inheritance carefully
- Design for scalability

### 2. Data Management
- Keep context data minimal and relevant
- Implement proper data validation
- Use appropriate data types
- Consider data privacy requirements

### 3. Performance Optimization
- Cache frequently accessed context data
- Use asynchronous context updates
- Implement context cleanup strategies
- Monitor context storage usage

### 4. Synchronization
- Minimize context synchronization overhead
- Use event-driven updates
- Implement conflict resolution strategies
- Ensure eventual consistency

## Next Steps

- [Learn about Human-in-the-Loop](/docs/1.0.0.3/multi-agent/human-in-the-loop/)
- [Understand Durable Execution & Time Travel](/docs/1.0.0.3/multi-agent/state-context-management/durable-execution/)
- [Explore Subgraphs](/docs/1.0.0.3/multi-agent/subgraphs/)
