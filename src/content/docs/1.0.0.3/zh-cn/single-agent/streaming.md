---
title: Streaming
keywords: ["Spring AI", "Streaming", "Reactive", "Flux", "Asynchronous", "Real-time"]
description: "学习如何使用流式响应进行实时 AI 交互"
---

# Streaming

*本内容参考自 Spring AI 官方文档*

流式处理允许您在 AI 模型生成响应时实时接收响应，而不是等待完整的响应。这对于长响应或当您想要向用户提供即时反馈时特别有用。

## 基本流式处理

### 流式字符串内容

`stream()` 方法让您获得异步响应，如下所示：

```java
Flux<String> output = chatClient.prompt()
    .user("告诉我一个笑话")
    .stream()
    .content();
```

### 流式 ChatResponse

您也可以使用 `Flux<ChatResponse> chatResponse()` 方法流式传输 ChatResponse：

```java
Flux<ChatResponse> responseStream = chatClient.prompt()
    .user("解释量子计算")
    .stream()
    .chatResponse();
```

### 带上下文的流式处理

您可以使用 `chatClientResponse()` 访问额外的执行上下文：

```java
Flux<ChatClientResponse> contextStream = chatClient.prompt()
    .user("什么是机器学习？")
    .stream()
    .chatClientResponse();
```

## Web 集成

### 服务器发送事件（SSE）

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

### WebFlux 集成

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

## 高级流式模式

### 缓冲和窗口化

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
            .buffer(Duration.ofMillis(100))  // 缓冲 100ms
            .map(chunks -> String.join("", chunks));
    }

    public Flux<String> streamWithWindow(String prompt) {
        return chatClient.prompt()
            .user(prompt)
            .stream()
            .content()
            .window(10)  // 10 个项目的窗口
            .flatMap(window -> window.collectList())
            .map(chunks -> String.join("", chunks));
    }
}
```

### 流中的错误处理

```java
public Flux<String> streamWithErrorHandling(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .onErrorResume(throwable -> {
            log.error("流式处理错误：", throwable);
            return Flux.just("发生错误：" + throwable.getMessage());
        })
        .timeout(Duration.ofSeconds(30))
        .onErrorReturn("请求超时，请稍后重试");
}
```

### 带背压的流式处理

```java
public Flux<String> streamWithBackpressure(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .onBackpressureBuffer(1000)  // 缓冲最多 1000 个项目
        .publishOn(Schedulers.boundedElastic());
}
```

## 结构化输出流式处理

虽然直接实体流式处理尚不可用，但您可以聚合流式内容并转换它：

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

## 实时聊天实现

### WebSocket 集成

```java
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatClient chatClient;

    public ChatWebSocketHandler(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket 连接已建立：{}", session.getId());
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
                        log.error("发送消息错误", e);
                    }
                },
                error -> log.error("流式处理错误", error),
                () -> {
                    try {
                        session.sendMessage(new TextMessage("[DONE]"));
                    } catch (IOException e) {
                        log.error("发送完成消息错误", e);
                    }
                }
            );
    }
}
```

### 配置

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

## 性能考虑

### 连接管理

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

### 内存管理

```java
public Flux<String> streamWithMemoryManagement(String prompt) {
    return chatClient.prompt()
        .user(prompt)
        .stream()
        .content()
        .limitRate(100)  // 限制为每秒 100 个项目
        .onBackpressureDrop()  // 如果消费者跟不上则丢弃项目
        .doOnNext(content -> {
            // 立即处理内容以避免内存堆积
            processContent(content);
        });
}
```

## 实现注意事项

> **重要**：流式处理仅通过 Reactive 堆栈支持。因此，命令式应用程序必须包含 Reactive 堆栈（例如 spring-boot-starter-webflux）。

- 流式响应在 AI 模型生成时交付
- 内置 advisors 对流式调用执行非阻塞操作
- 用于 advisor 流式调用的 Reactor Scheduler 可以通过每个 Advisor 类上的 Builder 进行配置
- 适当的错误处理和超时配置对于生产使用至关重要

## 下一步

- 学习 [Chat Client API](../chat-client/) 进行基本交互
- 探索 [Advisors](../advisors/) 进行带上下文的增强流式处理
- 查看 [Observability](../observability/) 进行流式性能监控
