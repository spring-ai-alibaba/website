---
title: 流式处理性能优化
description: 优化 Spring AI Alibaba Graph 流式处理性能
---

# 流式处理性能优化

本文档介绍如何优化 Spring AI Alibaba Graph 的流式处理性能，包括缓存、压缩、配置调优等策略。

## 流式缓存

通过缓存流式数据可以显著提高重复请求的性能：

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

## 流式压缩

通过批量处理和压缩可以减少网络传输开销：

```java
@Component
public class StreamingCompression {
    
    public Flux<String> compressedStream(Flux<String> source) {
        return source
            .buffer(Duration.ofMillis(100)) // 批量处理
            .filter(batch -> !batch.isEmpty())
            .map(batch -> String.join("", batch))
            .filter(content -> !content.trim().isEmpty());
    }
}
```

## 背压控制

实现背压控制以防止内存溢出：

```java
@Component
public class BackpressureController {
    
    public Flux<StreamEvent> controlledStream(Flux<StreamEvent> source) {
        return source
            .onBackpressureBuffer(1000) // 设置缓冲区大小
            .publishOn(Schedulers.boundedElastic(), 32) // 限制并发
            .doOnError(throwable -> {
                if (throwable instanceof OverflowException) {
                    log.warn("流式处理背压溢出: {}", throwable.getMessage());
                }
            });
    }
}
```

## 连接池优化

优化HTTP连接池以提高并发性能：

```java
@Configuration
public class StreamingConfiguration {
    
    @Bean
    public WebClient webClient() {
        ConnectionProvider provider = ConnectionProvider.builder("streaming")
            .maxConnections(500)
            .maxIdleTime(Duration.ofSeconds(20))
            .maxLifeTime(Duration.ofSeconds(60))
            .pendingAcquireTimeout(Duration.ofSeconds(60))
            .evictInBackground(Duration.ofSeconds(120))
            .build();
            
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(
                HttpClient.create(provider)
                    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
                    .responseTimeout(Duration.ofSeconds(30))
            ))
            .build();
    }
}
```

## 内存管理

优化内存使用以处理大量流式数据：

```java
@Component
public class MemoryOptimizedStreaming {
    
    private final AtomicLong memoryUsage = new AtomicLong(0);
    private final long maxMemoryUsage = 100 * 1024 * 1024; // 100MB
    
    public Flux<StreamEvent> memoryAwareStream(Flux<StreamEvent> source) {
        return source
            .doOnNext(event -> {
                long eventSize = estimateEventSize(event);
                if (memoryUsage.addAndGet(eventSize) > maxMemoryUsage) {
                    // 触发内存清理
                    System.gc();
                    memoryUsage.set(0);
                }
            })
            .doOnComplete(() -> memoryUsage.set(0))
            .doOnError(error -> memoryUsage.set(0));
    }
    
    private long estimateEventSize(StreamEvent event) {
        // 估算事件大小的简单实现
        return event.toString().length() * 2; // 假设每个字符2字节
    }
}
```

## 配置选项

通过配置文件优化流式处理性能：

```properties
# 流式处理配置
spring.ai.streaming.enabled=true
spring.ai.streaming.buffer-size=1024
spring.ai.streaming.timeout=30s

# WebSocket 配置
spring.ai.streaming.websocket.enabled=true
spring.ai.streaming.websocket.max-sessions=1000
spring.ai.streaming.websocket.message-size-limit=64KB

# SSE 配置
spring.ai.streaming.sse.enabled=true
spring.ai.streaming.sse.heartbeat-interval=30s
spring.ai.streaming.sse.connection-timeout=60s

# 背压控制
spring.ai.streaming.backpressure.strategy=buffer
spring.ai.streaming.backpressure.buffer-size=10000
spring.ai.streaming.backpressure.overflow-strategy=drop_latest

# 线程池配置
spring.ai.streaming.thread-pool.core-size=10
spring.ai.streaming.thread-pool.max-size=50
spring.ai.streaming.thread-pool.queue-capacity=1000
```

## 监控和指标

实现监控以跟踪流式处理性能：

```java
@Component
public class StreamingMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Counter streamEventCounter;
    private final Timer streamLatencyTimer;
    private final Gauge activeStreamsGauge;
    
    public StreamingMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.streamEventCounter = Counter.builder("streaming.events.total")
            .description("Total number of streaming events")
            .register(meterRegistry);
        this.streamLatencyTimer = Timer.builder("streaming.latency")
            .description("Streaming event latency")
            .register(meterRegistry);
        this.activeStreamsGauge = Gauge.builder("streaming.active.count")
            .description("Number of active streams")
            .register(meterRegistry, this, StreamingMetrics::getActiveStreamCount);
    }
    
    public Flux<StreamEvent> instrumentedStream(Flux<StreamEvent> source) {
        return source
            .doOnNext(event -> {
                streamEventCounter.increment();
                // 记录其他指标
            })
            .doOnSubscribe(subscription -> {
                Timer.Sample sample = Timer.start(meterRegistry);
                // 开始计时
            });
    }
    
    private double getActiveStreamCount() {
        // 返回当前活跃流的数量
        return 0.0; // 实际实现需要跟踪活跃流
    }
}
```

## 错误处理和重试

实现健壮的错误处理和重试机制：

```java
@Component
public class ResilientStreaming {
    
    public Flux<StreamEvent> resilientStream(Flux<StreamEvent> source) {
        return source
            .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                .maxBackoff(Duration.ofSeconds(10))
                .filter(throwable -> isRetryableError(throwable)))
            .onErrorResume(throwable -> {
                log.error("流式处理失败: {}", throwable.getMessage());
                return Flux.just(createErrorEvent(throwable));
            })
            .timeout(Duration.ofMinutes(5))
            .doOnError(TimeoutException.class, ex -> 
                log.warn("流式处理超时: {}", ex.getMessage()));
    }
    
    private boolean isRetryableError(Throwable throwable) {
        return throwable instanceof ConnectException ||
               throwable instanceof SocketTimeoutException ||
               (throwable instanceof WebClientResponseException &&
                ((WebClientResponseException) throwable).getStatusCode().is5xxServerError());
    }
    
    private StreamEvent createErrorEvent(Throwable throwable) {
        return StreamEvent.builder()
            .type("error")
            .data(Map.of("message", throwable.getMessage()))
            .build();
    }
}
```

## 最佳实践

### 1. 性能优化
- 合理设置缓冲区大小
- 实施背压控制
- 使用流式压缩
- 优化连接池配置

### 2. 错误处理
- 实现优雅的错误恢复
- 提供错误重试机制
- 记录详细的错误日志
- 设置合理的超时时间

### 3. 资源管理
- 及时清理连接
- 监控内存使用
- 限制并发连接数
- 实现资源池化

### 4. 用户体验
- 提供实时进度反馈
- 实现平滑的内容展示
- 支持暂停和恢复
- 优化首字节时间

### 5. 监控和调试
- 实施全面的指标收集
- 设置性能告警
- 记录关键事件
- 提供调试工具

## 性能测试

```java
@Component
public class StreamingPerformanceTest {
    
    @Autowired
    private StreamingService streamingService;
    
    public void performanceTest() {
        int concurrentStreams = 100;
        int eventsPerStream = 1000;
        
        List<Flux<StreamEvent>> streams = IntStream.range(0, concurrentStreams)
            .mapToObj(i -> streamingService.createStream("test-" + i))
            .collect(Collectors.toList());
            
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        
        Flux.merge(streams)
            .take(concurrentStreams * eventsPerStream)
            .blockLast();
            
        stopWatch.stop();
        
        double throughput = (concurrentStreams * eventsPerStream) / 
                           (stopWatch.getTotalTimeSeconds());
        
        log.info("流式处理吞吐量: {} events/second", throughput);
    }
}
```

## 下一步

- [智能体流式处理](./agent-streaming) - 学习智能体流式处理
- [工作流流式处理](./workflow-streaming) - 了解工作流流式处理
- [自定义流式数据](./custom-streaming) - 发送自定义流式数据
