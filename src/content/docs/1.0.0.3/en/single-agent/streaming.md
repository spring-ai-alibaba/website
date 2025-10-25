---
title: Streaming
keywords: ["Spring AI", "Streaming", "Reactive", "Flux", "Asynchronous", "Real-time"]
description: "Learn how to use streaming responses for real-time AI interactions with Spring AI"
---

# Streaming

*This content is referenced from Spring AI documentation*

Streaming allows you to receive AI model responses in real-time as they are generated, rather than waiting for the complete response. This is particularly useful for long responses or when you want to provide immediate feedback to users.

## Basic Streaming

### Streaming String Content

The `stream()` method lets you get an asynchronous response as shown below:

```java
Flux<String> output = chatClient.prompt()
    .user("Tell me a joke")
    .stream()
    .content();
```

### Streaming ChatResponse

You can also stream the ChatResponse using the method `Flux<ChatResponse> chatResponse()`:

```java
Flux<ChatResponse> responseStream = chatClient.prompt()
    .user("Explain quantum computing")
    .stream()
    .chatResponse();
```

### Streaming with Context

You can access additional execution context with `chatClientResponse()`:

```java
Flux<ChatClientResponse> contextStream = chatClient.prompt()
    .user("What is machine learning?")
    .stream()
    .chatClientResponse();
```

## Web Integration

### Server-Sent Events (SSE)

```java
@RestController
public class StreamingController {

    private final ChatClient chatClient;

    public StreamingController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamResponse(@RequestParam String message) {
        return chatClient.prompt()
            .user(message)
            .stream()
            .content();
    }
}
```

### WebFlux Integration

```java
@RestController
public class ReactiveController {

    private final ChatClient chatClient;

    public ReactiveController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @PostMapping("/chat/stream")
    public Flux<ServerSentEvent<String>> streamChat(@RequestBody ChatRequest request) {
        return chatClient.prompt()
            .user(request.getMessage())
            .stream()
            .content()
            .map(content -> ServerSentEvent.<String>builder()
                .data(content)
                .build());
    }
}
```

## Advanced Streaming Patterns

### Buffering and Windowing

```java
@Service
public class StreamingService {

    private final ChatClient chatClient;

    public StreamingService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public Flux<String> streamWithBuffer(String prompt) {
        return chatClient.prompt()
            .user(prompt)
            .stream()
            .content()
            .buffer(Duration.ofMillis(100))  // Buffer for 100ms
            .map(chunks -> String.join("", chunks));
    }

    public Flux<String> streamWithWindow(String prompt) {
        return chatClient.prompt()
            .user(prompt)
            .stream()
            .content()
            .window(10)  // Window of 10 items
            .flatMap(window -> window.collectList())
            .map(chunks -> String.join("", chunks));
    }
}
```

### Error Handling in Streams

```java
public Flux<String> streamWithErrorHandling(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .onErrorResume(throwable -> {
            log.error("Streaming error: ", throwable);
            return Flux.just("Error occurred: " + throwable.getMessage());
        })
        .timeout(Duration.ofSeconds(30))
        .onErrorReturn("Request timeout, please try again later");
}
```

### Streaming with Backpressure

```java
public Flux<String> streamWithBackpressure(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .onBackpressureBuffer(1000)  // Buffer up to 1000 items
        .publishOn(Schedulers.boundedElastic());
}
```

## Structured Output Streaming

While direct entity streaming is not yet available, you can aggregate streamed content and convert it:

```java
@Service
public class StructuredStreamingService {

    private final ChatClient chatClient;

    public StructuredStreamingService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public Mono<List<ActorFilms>> streamAndConvert(String prompt) {
        var converter = new BeanOutputConverter<>(
            new ParameterizedTypeReference<List<ActorFilms>>() {});

        return chatClient.prompt()
            .user(u -> u.text(prompt + " {format}")
                       .param("format", converter.getFormat()))
            .stream()
            .content()
            .collectList()
            .map(chunks -> String.join("", chunks))
            .map(converter::convert);
    }
}

record ActorFilms(String actor, List<String> movies) {}
```

## Real-time Chat Implementation

### WebSocket Integration

```java
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatClient chatClient;

    public ChatWebSocketHandler(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket connection established: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String userMessage = message.getPayload();
        
        chatClient.prompt()
            .user(userMessage)
            .stream()
            .content()
            .subscribe(
                content -> {
                    try {
                        session.sendMessage(new TextMessage(content));
                    } catch (IOException e) {
                        log.error("Error sending message", e);
                    }
                },
                error -> log.error("Streaming error", error),
                () -> {
                    try {
                        session.sendMessage(new TextMessage("[DONE]"));
                    } catch (IOException e) {
                        log.error("Error sending completion message", e);
                    }
                }
            );
    }
}
```

### Configuration

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatWebSocketHandler;

    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler) {
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatWebSocketHandler, "/chat")
                .setAllowedOrigins("*");
    }
}
```

## Performance Considerations

### Connection Management

```java
@Configuration
public class StreamingConfiguration {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(
                HttpClient.create()
                    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
                    .responseTimeout(Duration.ofMinutes(2))
                    .doOnConnected(conn -> 
                        conn.addHandlerLast(new ReadTimeoutHandler(120))
                            .addHandlerLast(new WriteTimeoutHandler(120)))
            ));
    }
}
```

### Memory Management

```java
public Flux<String> streamWithMemoryManagement(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .limitRate(100)  // Limit to 100 items per second
        .onBackpressureDrop()  // Drop items if consumer can't keep up
        .doOnNext(content -> {
            // Process content immediately to avoid memory buildup
            processContent(content);
        });
}
```

## Implementation Notes

> **Important**: Streaming is only supported via the Reactive stack. Imperative applications must include the Reactive stack for this reason (e.g. spring-boot-starter-webflux).

- Streaming responses are delivered as they are generated by the AI model
- The built-in advisors perform non-blocking operations for streaming calls
- The Reactor Scheduler used for advisor streaming calls can be configured via the Builder on each Advisor class
- Proper error handling and timeout configuration are essential for production use

## Next Steps

- Learn about [Chat Client API](../chat-client/) for basic interactions
- Explore [Advisors](../advisors/) for enhanced streaming with context
- Check out [Observability](../observability/) for monitoring streaming performance
