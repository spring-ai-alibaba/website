---
title: Streaming
keywords: ["Spring AI Alibaba", "Graph", "Streaming", "Real-time", "Output"]
description: "Learn how to use Spring AI Alibaba Graph's streaming capabilities for real-time workflow output and progress monitoring."
---

Spring AI Alibaba Graph implements a powerful streaming system that provides real-time updates, enabling responsive and transparent user experiences.

Spring AI Alibaba Graph's streaming system allows you to get live feedback from graph execution. There are three main categories of data you can stream:

1. **Workflow progress** — get state updates after each graph node is executed
2. **LLM tokens** — stream language model tokens as they're generated
3. **Custom updates** — emit user-defined signals (e.g., "Fetched 10/100 records")

## Spring AI Alibaba Graph Streaming Capabilities

- **Stream LLM tokens** — capture token streams from anywhere: inside nodes, subgraphs, or tools
- **Emit progress notifications from tools** — send custom updates or progress signals directly from tool functions
- **Stream from subgraphs** — include outputs from both the parent graph and any nested subgraphs
- **Use any LLM** — stream tokens from any LLM, even if it's not a Spring AI model using custom streaming mode
- **Multiple streaming modes** — choose from different streaming modes: `values` (full state), `updates` (state deltas), `messages` (LLM tokens + metadata), `custom` (arbitrary user data), or `debug` (detailed traces)

## Supported Stream Modes

Pass one or more of the following stream modes as a list to the [`stream()`](../../api-reference/graph/#stream) or [`streamAsync()`](../../api-reference/graph/#streamAsync) methods:

| Mode       | Description                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values`   | Stream the full values of the state after each step of the graph.                                                                                                           |
| `updates`  | Stream the updates to the state after each step of the graph. If multiple updates are made in the same step (e.g. multiple nodes are run) then they will be streamed separately. |
| `custom`   | Stream custom data from inside graph nodes.                                                                                                                                 |
| `messages` | Stream 2-tuples of (LLM token, metadata) from any graph node that calls an LLM.                                                                                            |
| `debug`    | Stream as much information as possible throughout the execution of the graph.                                                                                               |

## Basic Streaming

### 1. Simple State Streaming

The most basic streaming is listening to state changes during graph execution:

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import reactor.core.publisher.Flux;

@Service
public class StreamingService {
    
    @Autowired
    private CompiledGraph customerServiceGraph;
    
    public Flux<NodeOutput> processCustomerRequest(String input) {
        Map<String, Object> initialState = Map.of("input", input);
        
        // Stream graph execution, get real-time output from each node
        return customerServiceGraph.stream(initialState)
            .doOnNext(nodeOutput -> {
                System.out.println("Node '" + nodeOutput.nodeId() + "' completed");
                System.out.println("Execution time: " + nodeOutput.executionTime() + "ms");
                System.out.println("Current state: " + nodeOutput.state().data());
            });
    }
}
```

### 2. Reactive Web Endpoints

Integrate streaming with Spring WebFlux to provide real-time updates to frontend:

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/graph")
public class GraphStreamingController {
    
    @Autowired
    private StreamingService streamingService;
    
    @PostMapping(value = "/process", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> processWithStreaming(
            @RequestBody Map<String, Object> request) {
        
        String input = (String) request.get("input");
        
        return streamingService.processCustomerRequest(input)
            .map(nodeOutput -> ServerSentEvent.<Map<String, Object>>builder()
                .id(nodeOutput.nodeId())
                .event("node_complete")
                .data(Map.of(
                    "nodeId", nodeOutput.nodeId(),
                    "executionTime", nodeOutput.executionTime(),
                    "state", nodeOutput.state().data(),
                    "timestamp", System.currentTimeMillis()
                ))
                .build())
            .onErrorResume(error -> Flux.just(
                ServerSentEvent.<Map<String, Object>>builder()
                    .event("error")
                    .data(Map.of("error", error.getMessage()))
                    .build()
            ));
    }
}
```

## Advanced Streaming Patterns

### 1. Custom Progress Streaming

Emit custom progress updates from within nodes:

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.streaming.StreamingContext;

public class DataProcessingNode implements NodeAction {
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        StreamingContext streamingContext = StreamingContext.current();
        
        List<String> dataItems = state.value("data_items", List.class).orElse(List.of());
        List<String> processedItems = new ArrayList<>();
        
        for (int i = 0; i < dataItems.size(); i++) {
            String item = dataItems.get(i);
            
            // Emit progress update
            streamingContext.emit("progress", Map.of(
                "current", i + 1,
                "total", dataItems.size(),
                "percentage", (i + 1) * 100 / dataItems.size(),
                "message", "Processing item: " + item
            ));
            
            // Simulate processing time
            String processedItem = processItem(item);
            processedItems.add(processedItem);
            
            // Add delay to demonstrate streaming effect
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        
        // Emit completion signal
        streamingContext.emit("completion", Map.of(
            "message", "Data processing completed",
            "processed_count", processedItems.size()
        ));
        
        return Map.of("processed_items", processedItems);
    }
    
    private String processItem(String item) {
        // Actual data processing logic
        return item.toUpperCase();
    }
}
```

### 2. LLM Token Streaming

Stream tokens generated by LLMs:

```java
import com.alibaba.cloud.ai.chat.ChatClient;
import com.alibaba.cloud.ai.chat.StreamingChatClient;

public class LLMStreamingNode implements NodeAction {
    
    @Autowired
    private StreamingChatClient streamingChatClient;
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        String prompt = state.value("prompt", String.class).orElse("");
        StreamingContext streamingContext = StreamingContext.current();
        
        StringBuilder fullResponse = new StringBuilder();
        
        // Stream LLM call
        streamingChatClient.prompt()
            .user(prompt)
            .stream()
            .subscribe(
                token -> {
                    fullResponse.append(token);
                    // Emit token stream
                    streamingContext.emit("llm_token", Map.of(
                        "token", token,
                        "accumulated", fullResponse.toString()
                    ));
                },
                error -> {
                    streamingContext.emit("llm_error", Map.of(
                        "error", error.getMessage()
                    ));
                },
                () -> {
                    streamingContext.emit("llm_complete", Map.of(
                        "final_response", fullResponse.toString()
                    ));
                }
            );
        
        return Map.of("llm_response", fullResponse.toString());
    }
}
```

## Streaming Configuration

### 1. Streaming Strategy Configuration

```java
import com.alibaba.cloud.ai.graph.streaming.StreamingConfig;
import com.alibaba.cloud.ai.graph.streaming.StreamingMode;

@Configuration
public class GraphStreamingConfiguration {
    
    @Bean
    public StreamingConfig streamingConfig() {
        return StreamingConfig.builder()
            .mode(StreamingMode.ENHANCED)  // Enhanced mode with more metadata
            .bufferSize(100)               // Buffer size
            .enableCustomEvents(true)      // Enable custom events
            .enableProgressTracking(true)  // Enable progress tracking
            .enableTokenStreaming(true)    // Enable token streaming
            .build();
    }
    
    @Bean
    public CompiledGraph streamingEnabledGraph() {
        return new StateGraph(keyStrategyFactory)
            .addNode("data_processing", new DataProcessingNode())
            .addNode("llm_processing", new LLMStreamingNode())
            .addEdge(START, "data_processing")
            .addEdge("data_processing", "llm_processing")
            .addEdge("llm_processing", END)
            .compile(CompileConfig.builder()
                .streamingConfig(streamingConfig())
                .build());
    }
}
```

### 2. Streaming Listeners

```java
import com.alibaba.cloud.ai.graph.streaming.StreamingListener;

@Component
public class GraphStreamingListener implements StreamingListener {
    
    @Override
    public void onNodeStart(String nodeId, OverAllState state) {
        System.out.println("Node started: " + nodeId);
    }
    
    @Override
    public void onNodeComplete(String nodeId, OverAllState state, long executionTime) {
        System.out.println("Node completed: " + nodeId + " (took: " + executionTime + "ms)");
    }
    
    @Override
    public void onCustomEvent(String eventType, Map<String, Object> eventData) {
        switch (eventType) {
            case "progress":
                Integer current = (Integer) eventData.get("current");
                Integer total = (Integer) eventData.get("total");
                System.out.println("Progress update: " + current + "/" + total);
                break;
            case "llm_token":
                String token = (String) eventData.get("token");
                System.out.print(token);  // Print tokens in real-time
                break;
            case "completion":
                String message = (String) eventData.get("message");
                System.out.println("\nCompleted: " + message);
                break;
        }
    }
    
    @Override
    public void onError(String nodeId, Throwable error) {
        System.err.println("Node execution error: " + nodeId + " - " + error.getMessage());
    }
}
```

## Frontend Integration Example

### JavaScript Client

```javascript
// Connect to streaming endpoint
const eventSource = new EventSource('/api/graph/process', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: 'user input' })
});

// Listen for node completion events
eventSource.addEventListener('node_complete', function(event) {
    const data = JSON.parse(event.data);
    console.log('Node completed:', data.nodeId);
    
    // Update UI
    updateProgressBar(data.nodeId);
    displayNodeResult(data.state);
});

// Listen for custom events
eventSource.addEventListener('progress', function(event) {
    const data = JSON.parse(event.data);
    updateProgressIndicator(data.current, data.total);
});

eventSource.addEventListener('llm_token', function(event) {
    const data = JSON.parse(event.data);
    appendTokenToOutput(data.token);
});

// Error handling
eventSource.addEventListener('error', function(event) {
    const data = JSON.parse(event.data);
    displayError(data.error);
    eventSource.close();
});

// Cleanup when connection closes
eventSource.onclose = function() {
    console.log('Streaming connection closed');
};
```

## Performance Optimization

### 1. Streaming Performance Tuning

```java
@Configuration
public class StreamingPerformanceConfig {
    
    @Bean
    public StreamingConfig optimizedStreamingConfig() {
        return StreamingConfig.builder()
            .bufferSize(1000)                    // Increase buffer size
            .batchSize(10)                       // Batch send events
            .flushInterval(Duration.ofMillis(50)) // Flush interval
            .enableCompression(true)             // Enable compression
            .maxConcurrentStreams(100)           // Max concurrent streams
            .build();
    }
}
```

### 2. Memory Management

```java
public class MemoryEfficientStreamingNode implements NodeAction {
    
    @Override
    public Map<String, Object> execute(OverAllState state) {
        StreamingContext context = StreamingContext.current();
        
        // Use streaming for large datasets to avoid memory overflow
        Stream<String> dataStream = getLargeDataStream();
        
        AtomicInteger counter = new AtomicInteger(0);
        List<String> results = dataStream
            .peek(item -> {
                int count = counter.incrementAndGet();
                if (count % 100 == 0) {  // Send progress every 100 items
                    context.emit("progress", Map.of(
                        "processed", count,
                        "message", "Processed " + count + " items"
                    ));
                }
            })
            .map(this::processItem)
            .collect(Collectors.toList());
        
        return Map.of("results", results);
    }
}
```

## Best Practices

### 1. Streaming Design Principles

- **Appropriate granularity**: Don't send updates too frequently to avoid performance issues
- **Meaningful events**: Only send progress information that's valuable to users
- **Error handling**: Ensure errors in streaming are gracefully propagated
- **Resource management**: Clean up streaming connections promptly to avoid resource leaks

### 2. User Experience Considerations

- **Progress indication**: Provide clear progress indicators for long-running tasks
- **Real-time feedback**: Let users know the system is working
- **Error recovery**: Provide reconnection mechanisms when streaming connections are interrupted
- **Performance balance**: Find the right balance between real-time updates and performance

## Next Steps

- [Persistence](./persistence) - Learn how to persist graph state
- [Human-in-the-loop](./human-in-the-loop) - Understand how to integrate human intervention in workflows
- [Subgraphs](./subgraphs) - Build reusable subgraph components
