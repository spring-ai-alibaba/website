---
title: Streaming
description: Spring AI Alibaba multi-agent streaming processing
---

# Streaming

Streaming processing allows multi-agent systems to process data streams in real-time, providing better user experience and system responsiveness. Spring AI Alibaba provides comprehensive streaming support.

## Streaming Overview

### Core Concepts
- **Streaming Output**: Real-time output of generated content
- **Streaming State**: Real-time state updates
- **Streaming Events**: Real-time event pushing
- **Backpressure Control**: Flow control handling

### Use Cases
- Real-time chat conversations
- Long text generation
- Complex task progress display
- Multi-agent collaboration visualization

## Basic Streaming

### Configure Streaming Support

```java
@Configuration
public class StreamingConfig {
    
    @Bean
    public ChatClient streamingChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultOptions(ChatOptionsBuilder.builder()
                .withStreamUsage(true)
                .build())
            .build();
    }
}
```

### Simple Streaming Chat

```java
@RestController
public class StreamingChatController {
    
    @Autowired
    private ChatClient chatClient;
    
    @GetMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(@RequestParam String message) {
        return chatClient.prompt()
            .user(message)
            .stream()
            .content()
            .map(content -> "data: " + content + "\n\n");
    }
    
    @GetMapping(value = "/chat/stream/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChatSSE(@RequestParam String message) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        chatClient.prompt()
            .user(message)
            .stream()
            .content()
            .subscribe(
                content -> {
                    try {
                        emitter.send(SseEmitter.event()
                            .name("message")
                            .data(content));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                },
                error -> emitter.completeWithError(error),
                () -> emitter.complete()
            );
        
        return emitter;
    }
}
```

## Graph Streaming Execution

### Streaming StateGraph

```java
@Component
public class StreamingGraph {
    
    public StateGraph createStreamingGraph() {
        return StateGraph.builder(OverallState.class)
            .addNode("analyzer", this::analyzeWithStreaming)
            .addNode("generator", this::generateWithStreaming)
            .addNode("reviewer", this::reviewWithStreaming)
            .addEdge("analyzer", "generator")
            .addEdge("generator", "reviewer")
            .setEntryPoint("analyzer")
            .setFinishPoint("reviewer")
            .build();
    }
    
    private OverallState analyzeWithStreaming(OverallState state) {
        // Send streaming status updates
        streamingService.emitStatus("Analyzing input...");
        
        String analysis = chatClient.prompt()
            .user("Analyze the following content: " + state.getInput())
            .stream()
            .content()
            .doOnNext(chunk -> streamingService.emitProgress("analysis", chunk))
            .collect(Collectors.joining())
            .block();
        
        return state.withAnalysis(analysis);
    }
}
```

### Streaming State Management

```java
@Service
public class StreamingStateService {
    
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    
    public SseEmitter createStream(String sessionId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(sessionId, emitter);
        
        emitter.onCompletion(() -> emitters.remove(sessionId));
        emitter.onTimeout(() -> emitters.remove(sessionId));
        emitter.onError(e -> emitters.remove(sessionId));
        
        return emitter;
    }
    
    public void emitStatus(String sessionId, String status) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("status")
                    .data(Map.of(
                        "type", "status",
                        "message", status,
                        "timestamp", Instant.now()
                    )));
            } catch (IOException e) {
                emitters.remove(sessionId);
            }
        }
    }
    
    public void emitProgress(String sessionId, String node, String content) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("progress")
                    .data(Map.of(
                        "type", "progress",
                        "node", node,
                        "content", content,
                        "timestamp", Instant.now()
                    )));
            } catch (IOException e) {
                emitters.remove(sessionId);
            }
        }
    }
}
```

## WebSocket Streaming

### WebSocket Configuration

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new StreamingWebSocketHandler(), "/ws/stream")
                .setAllowedOrigins("*");
    }
}

@Component
public class StreamingWebSocketHandler extends TextWebSocketHandler {
    
    @Autowired
    private ChatClient chatClient;
    
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        ChatRequest request = objectMapper.readValue(payload, ChatRequest.class);
        
        chatClient.prompt()
            .user(request.getMessage())
            .stream()
            .content()
            .subscribe(
                content -> sendMessage(session, "content", content),
                error -> sendMessage(session, "error", error.getMessage()),
                () -> sendMessage(session, "complete", "")
            );
    }
    
    private void sendMessage(WebSocketSession session, String type, String data) {
        try {
            Map<String, Object> response = Map.of(
                "type", type,
                "data", data,
                "timestamp", Instant.now()
            );
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (Exception e) {
            log.error("Failed to send WebSocket message", e);
        }
    }
}
```

## Reactive Streaming

### Reactor Integration

```java
@Service
public class ReactiveStreamingService {
    
    @Autowired
    private ChatClient chatClient;
    
    public Flux<StreamingResponse> processStreamingWorkflow(String input) {
        return Flux.just(input)
            .flatMap(this::analyzeStep)
            .flatMap(this::generateStep)
            .flatMap(this::reviewStep);
    }
    
    private Flux<StreamingResponse> analyzeStep(String input) {
        return chatClient.prompt()
            .user("Analyze: " + input)
            .stream()
            .content()
            .map(content -> StreamingResponse.builder()
                .step("analyze")
                .content(content)
                .timestamp(Instant.now())
                .build());
    }
    
    private Flux<StreamingResponse> generateStep(StreamingResponse previous) {
        return chatClient.prompt()
            .user("Generate content based on analysis: " + previous.getContent())
            .stream()
            .content()
            .map(content -> StreamingResponse.builder()
                .step("generate")
                .content(content)
                .timestamp(Instant.now())
                .build());
    }
}
```

### Backpressure Control

```java
@Component
public class BackpressureController {
    
    public Flux<String> controlledStream(String input) {
        return chatClient.prompt()
            .user(input)
            .stream()
            .content()
            .onBackpressureBuffer(1000) // Buffer size
            .onBackpressureDrop(dropped -> log.warn("Dropped content: {}", dropped))
            .limitRate(10); // Rate limiting
    }
    
    public Flux<String> adaptiveStream(String input) {
        return chatClient.prompt()
            .user(input)
            .stream()
            .content()
            .sample(Duration.ofMillis(100)) // Sampling interval
            .distinctUntilChanged(); // Deduplication
    }
}
```

## Multi-Agent Streaming Collaboration

### Collaborative Streaming

```java
@Component
public class CollaborativeStreaming {
    
    public Flux<CollaborationEvent> streamCollaboration(String task) {
        return Flux.create(sink -> {
            StateGraph graph = createCollaborativeGraph(sink);
            
            CompletableFuture.runAsync(() -> {
                try {
                    graph.invoke(new OverallState().withTask(task));
                    sink.complete();
                } catch (Exception e) {
                    sink.error(e);
                }
            });
        });
    }
    
    private StateGraph createCollaborativeGraph(FluxSink<CollaborationEvent> sink) {
        return StateGraph.builder(OverallState.class)
            .addNode("planner", state -> planWithStreaming(state, sink))
            .addNode("executor", state -> executeWithStreaming(state, sink))
            .addNode("reviewer", state -> reviewWithStreaming(state, sink))
            .addEdge("planner", "executor")
            .addEdge("executor", "reviewer")
            .setEntryPoint("planner")
            .setFinishPoint("reviewer")
            .build();
    }
    
    private OverallState planWithStreaming(OverallState state, FluxSink<CollaborationEvent> sink) {
        sink.next(CollaborationEvent.agentStarted("planner"));
        
        String plan = chatClient.prompt()
            .user("Create plan: " + state.getTask())
            .stream()
            .content()
            .doOnNext(chunk -> sink.next(CollaborationEvent.contentGenerated("planner", chunk)))
            .collect(Collectors.joining())
            .block();
        
        sink.next(CollaborationEvent.agentCompleted("planner"));
        return state.withPlan(plan);
    }
}
```

### Real-time Collaboration Monitoring

```java
@Component
public class CollaborationMonitor {
    
    private final Map<String, CollaborationSession> sessions = new ConcurrentHashMap<>();
    
    public void startMonitoring(String sessionId) {
        CollaborationSession session = new CollaborationSession(sessionId);
        sessions.put(sessionId, session);
        
        // Monitor agent status
        Flux.interval(Duration.ofSeconds(1))
            .takeWhile(tick -> sessions.containsKey(sessionId))
            .subscribe(tick -> {
                CollaborationStatus status = getCurrentStatus(sessionId);
                broadcastStatus(sessionId, status);
            });
    }
    
    private void broadcastStatus(String sessionId, CollaborationStatus status) {
        // Broadcast status to all subscribers
        messagingTemplate.convertAndSend("/topic/collaboration/" + sessionId, status);
    }
    
    @EventListener
    public void onAgentEvent(AgentEvent event) {
        String sessionId = event.getSessionId();
        CollaborationSession session = sessions.get(sessionId);
        
        if (session != null) {
            session.updateAgentStatus(event.getAgentId(), event.getStatus());
            
            CollaborationUpdate update = CollaborationUpdate.builder()
                .agentId(event.getAgentId())
                .status(event.getStatus())
                .timestamp(Instant.now())
                .build();
            
            messagingTemplate.convertAndSend("/topic/collaboration/" + sessionId + "/updates", update);
        }
    }
}
```

## Streaming Data Persistence

### Streaming State Persistence

```java
@Component
public class StreamingPersistence {
    
    @Autowired
    private StreamingStateRepository repository;
    
    public void persistStreamingState(String sessionId, String nodeId, String content) {
        StreamingState state = StreamingState.builder()
            .sessionId(sessionId)
            .nodeId(nodeId)
            .content(content)
            .timestamp(Instant.now())
            .build();
        
        repository.save(state);
    }
    
    public Flux<StreamingState> replaySession(String sessionId) {
        return repository.findBySessionIdOrderByTimestamp(sessionId)
            .delayElements(Duration.ofMillis(100)); // Simulate real-time playback
    }
}
```

## Performance Optimization

### Streaming Cache

```java
@Component
public class StreamingCache {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    public Flux<String> cachedStream(String key, Supplier<Flux<String>> streamSupplier) {
        return Flux.defer(() -> {
            List<String> cached = redisTemplate.opsForList().range(key, 0, -1);
            
            if (!cached.isEmpty()) {
                return Flux.fromIterable(cached)
                    .delayElements(Duration.ofMillis(50));
            } else {
                return streamSupplier.get()
                    .doOnNext(content -> redisTemplate.opsForList().rightPush(key, content))
                    .doOnComplete(() -> redisTemplate.expire(key, Duration.ofHours(1)));
            }
        });
    }
}
```

### Streaming Compression

```java
@Component
public class StreamingCompression {
    
    public Flux<String> compressedStream(Flux<String> source) {
        return source
            .buffer(Duration.ofMillis(100)) // Batch processing
            .filter(batch -> !batch.isEmpty())
            .map(batch -> String.join("", batch))
            .filter(content -> !content.trim().isEmpty());
    }
}
```

## Configuration Options

```properties
# Streaming configuration
spring.ai.streaming.enabled=true
spring.ai.streaming.buffer-size=1024
spring.ai.streaming.timeout=30s

# WebSocket configuration
spring.ai.streaming.websocket.enabled=true
spring.ai.streaming.websocket.max-sessions=1000

# SSE configuration
spring.ai.streaming.sse.enabled=true
spring.ai.streaming.sse.heartbeat-interval=30s

# Backpressure control
spring.ai.streaming.backpressure.strategy=buffer
spring.ai.streaming.backpressure.buffer-size=10000
```

## Best Practices

### 1. Performance Optimization
- Set reasonable buffer sizes
- Implement backpressure control
- Use streaming compression

### 2. Error Handling
- Implement graceful error recovery
- Provide error retry mechanisms
- Log detailed error information

### 3. Resource Management
- Clean up connections promptly
- Monitor memory usage
- Set reasonable timeout values

### 4. User Experience
- Provide real-time progress feedback
- Implement smooth content display
- Support pause and resume

## Next Steps

- [Learn about Persistence](/docs/1.0.0.3/multi-agent/persistence/)
- [Understand Durable Execution](/docs/1.0.0.3/multi-agent/durable-execution/)
- [Explore Memory Management](/docs/1.0.0.3/multi-agent/memory/)
