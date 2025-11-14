---
title: 流式透传
keywords: [Spring AI,流式透传,AsyncGenerator,StreamingOutput,流式处理]
description: "深入理解 Spring AI Alibaba Graph 的流式透传机制和实时数据流处理"
---

## 什么是流式透传

**流式透传是Spring AI Alibaba Graph的核心流处理能力**，它允许节点产生的数据以流的形式实时传递给客户端，而不需要等待整个工作流执行完成。这种机制特别适合大模型文本生成、实时数据处理等需要即时反馈的场景。

**核心设计理念**：流式透传采用了异步生成器模式，通过`AsyncGenerator`接口实现数据的异步产生和消费。框架在内核层面支持流式数据的无缝传递，确保从节点内部的流式输出到最终客户端的流式响应，整个链路保持高效和一致。

## 核心实现机制

### AsyncGenerator接口

**AsyncGenerator是流式透传的核心抽象**，它定义了异步数据生成的标准接口：

```java
public interface AsyncGenerator<E> extends Iterable<E>, AsyncGeneratorOperators<E> {
    
    /**
     * 异步数据容器，包含实际数据、嵌套生成器和结果值
     */
    class Data<E> {
        final CompletableFuture<E> data;
        final Embed<E> embed;
        final Object resultValue;
        
        public boolean isDone() {
            return data == null && embed == null;
        }
        
        public boolean isError() {
            return data != null && data.isCompletedExceptionally();
        }
        
        public Optional<Object> resultValue() {
            return resultValue == null ? Optional.empty() : Optional.of(resultValue);
        }
    }
    
    /**
     * 获取下一个异步数据元素
     */
    Data<E> next();
    
    /**
     * 转换为CompletableFuture
     */
    default CompletableFuture<Object> toCompletableFuture() {
        final Data<E> next = next();
        if (next.isDone()) {
            return completedFuture(next.resultValue);
        }
        return next.data.thenCompose(v -> toCompletableFuture());
    }
    
    /**
     * 转换为Java Stream（同步阻塞）
     */
    default Stream<E> stream() {
        return StreamSupport.stream(
            Spliterators.spliteratorUnknownSize(iterator(), Spliterator.ORDERED), 
            false
        );
    }
}
```

### StreamingOutput数据类型

**StreamingOutput是流式数据的载体**，它继承自NodeOutput并包含实时数据块：

```java
public class StreamingOutput extends NodeOutput {
    private final String chunk;
    
    public StreamingOutput(String chunk, String node, OverAllState state) {
        super(node, state);
        this.chunk = chunk;
    }
    
    public String chunk() {
        return chunk;
    }
    
    @Override
    public String toString() {
        return format("StreamingOutput{node=%s, state=%s, chunk=%s}", 
                     node(), state(), chunk());
    }
}
```

### StreamingChatGenerator实现

**StreamingChatGenerator专门处理聊天模型的流式输出**，它将Reactor Flux转换为AsyncGenerator：

```java
public interface StreamingChatGenerator {
    
    class Builder {
        private Function<ChatResponse, Map<String, Object>> mapResult;
        private String startingNode;
        private OverAllState startingState;
        
        public AsyncGenerator<? extends NodeOutput> build(Flux<ChatResponse> flux) {
            Objects.requireNonNull(flux, "flux cannot be null");
            Objects.requireNonNull(mapResult, "mapResult cannot be null");
            
            var result = new AtomicReference<ChatResponse>(null);
            
            // 消息合并逻辑
            Consumer<ChatResponse> mergeMessage = (response) -> {
                result.updateAndGet(lastResponse -> {
                    if (lastResponse == null) {
                        return response;
                    }
                    
                    var currentMessage = response.getResult().getOutput();
                    if (currentMessage.hasToolCalls()) {
                        return response;
                    }
                    
                    var lastMessage = lastResponse.getResult().getOutput();
                    
                    // 合并文本内容
                    var newMessage = new AssistantMessage(
                        Objects.requireNonNull(ofNullable(currentMessage.getText())
                            .map(text -> lastMessage.getText().concat(text))
                            .orElse(lastMessage.getText())),
                        currentMessage.getMetadata(),
                        currentMessage.getToolCalls(),
                        currentMessage.getMedia()
                    );
                    
                    var newGeneration = new Generation(newMessage, response.getResult().getMetadata());
                    return new ChatResponse(List.of(newGeneration), response.getMetadata());
                });
            };
            
            // 处理Flux并转换为StreamingOutput
            var processedFlux = flux.doOnNext(mergeMessage::accept)
                .map(next -> new StreamingOutput(
                    next.getResult().getOutput().getText(), 
                    startingNode, 
                    startingState
                ));
            
            // 转换为AsyncGenerator
            return FlowGenerator.fromPublisher(
                FlowAdapters.toFlowPublisher(processedFlux),
                () -> mapResult.apply(result.get())
            );
        }
    }
}
```

## 流式透传的执行流程

### CompiledGraph流式执行

**CompiledGraph.stream()是流式透传的入口点**：

```java
public class CompiledGraph {
    
    /**
     * 创建流式输出的AsyncGenerator
     */
    public AsyncGenerator<NodeOutput> stream(Map<String, Object> inputs, RunnableConfig config)
            throws GraphRunnerException {
        Objects.requireNonNull(config, "config cannot be null");
        final AsyncNodeGenerator<NodeOutput> generator = new AsyncNodeGenerator<>(stateCreate(inputs), config);
        
        return new AsyncGenerator.WithEmbed<>(generator);
    }
}
```

### AsyncNodeGenerator的流式处理

**AsyncNodeGenerator是执行引擎，负责协调流式数据的产生和传递**：

```java
public class AsyncNodeGenerator<Output extends NodeOutput> implements AsyncGenerator<Output> {
    
    @Override
    public Data<Output> next() {
        try {
            // 检查迭代次数和结束条件
            if (++iteration > maxIterations) {
                return Data.error(new IllegalStateException("Maximum iterations reached"));
            }
            
            if (nextNodeId == null && currentNodeId == null) {
                return releaseThread().map(Data::<Output>done)
                    .orElseGet(() -> Data.done(currentState));
            }
            
            // 执行节点并处理返回结果
            currentNodeId = nextNodeId;
            var action = nodes.get(currentNodeId);
            
            return Data.of(evaluateAction(action, overAllState));
            
        } catch (Exception e) {
            return Data.error(e);
        }
    }
    
    /**
     * 处理节点输出中的AsyncGenerator
     */
    private Optional<Data<Output>> getEmbedGenerator(Map<String, Object> partialState) {
        // 提取所有AsyncGenerator实例
        List<AsyncGenerator<Output>> asyncNodeGenerators = new ArrayList<>();
        var generatorEntries = partialState.entrySet().stream()
            .filter(e -> {
                Object value = e.getValue();
                if (value instanceof AsyncGenerator) {
                    return true;
                }
                if (value instanceof Collection collection) {
                    collection.forEach(o -> {
                        if (o instanceof AsyncGenerator<?>) {
                            asyncNodeGenerators.add((AsyncGenerator<Output>) o);
                        }
                    });
                }
                return false;
            })
            .collect(Collectors.toList());
        
        if (generatorEntries.isEmpty() && asyncNodeGenerators.isEmpty()) {
            return Optional.empty();
        }
        
        // 创建合适的生成器（单个或合并）
        AsyncGenerator<Output> generator = AsyncGeneratorUtils.createAppropriateGenerator(
            generatorEntries, asyncNodeGenerators, keyStrategyMap
        );
        
        // 创建数据处理逻辑
        return Optional.of(Data.composeWith(generator.map(n -> {
            n.setSubGraph(true);
            return n;
        }), data -> processGeneratorOutput(data, partialState, generatorEntries)));
    }
}
```

### 多流合并机制

**AsyncGeneratorUtils提供了多个流式输出的智能合并**：

```java
public class AsyncGeneratorUtils {
    
    /**
     * 创建合并的生成器，智能处理多个流式输出
     */
    public static <T> AsyncGenerator<T> createMergedGenerator(
        List<AsyncGenerator<T>> generators,
        Map<String, KeyStrategy> keyStrategyMap
    ) {
        return new AsyncGenerator<>() {
            private final StampedLock lock = new StampedLock();
            private AtomicInteger pollCounter = new AtomicInteger(0);
            private Map<String, Object> mergedResult = new HashMap<>();
            private final List<AsyncGenerator<T>> activeGenerators = 
                new CopyOnWriteArrayList<>(generators);
            
            @Override
            public AsyncGenerator.Data<T> next() {
                while (true) {
                    // 乐观读锁检查
                    long stamp = lock.tryOptimisticRead();
                    boolean empty = activeGenerators.isEmpty();
                    if (!lock.validate(stamp)) {
                        stamp = lock.readLock();
                        try {
                            empty = activeGenerators.isEmpty();
                        } finally {
                            lock.unlockRead(stamp);
                        }
                    }
                    if (empty) {
                        return AsyncGenerator.Data.done(mergedResult);
                    }
                    
                    // 轮询策略选择Generator
                    final AsyncGenerator<T> current;
                    long writeStamp = lock.writeLock();
                    try {
                        final int size = activeGenerators.size();
                        if (size == 0) return AsyncGenerator.Data.done(mergedResult);
                        
                        int currentIdx = pollCounter.updateAndGet(i -> (i + 1) % size);
                        current = activeGenerators.get(currentIdx);
                    } finally {
                        lock.unlockWrite(writeStamp);
                    }
                    
                    // 无锁状态下执行Generator
                    AsyncGenerator.Data<T> data = current.next();
                    
                    // 处理结果并更新状态
                    writeStamp = lock.writeLock();
                    try {
                        if (!activeGenerators.contains(current)) {
                            continue;
                        }
                        
                        if (data.isDone() || data.isError()) {
                            handleCompletedGenerator(current, data);
                            if (activeGenerators.isEmpty()) {
                                return AsyncGenerator.Data.done(mergedResult);
                            }
                            continue;
                        }
                        
                        handleCompletedGenerator(current, data);
                        return data;
                    } finally {
                        lock.unlockWrite(writeStamp);
                    }
                }
            }
            
            private void handleCompletedGenerator(AsyncGenerator<T> generator, AsyncGenerator.Data<T> data) {
                // 移除完成的Generator
                if (data.isDone() || data.isError()) {
                    activeGenerators.remove(generator);
                }
                
                // 使用KeyStrategy合并结果
                data.resultValue().ifPresent(result -> {
                    if (result instanceof Map) {
                        Map<String, Object> mapResult = (Map<String, Object>) result;
                        mergedResult = OverAllState.updateState(mergedResult, mapResult, keyStrategyMap);
                    }
                });
            }
        };
    }
}
```

## Web层集成实现

### Controller流式响应

**Spring MVC Controller流式接口实现案例**：

```java
@RestController
@RequestMapping("/graph-stream")
public class GraphStreamController {
    
    private final CompiledGraph compiledGraph;
    
    /**
     * Server-Sent Events (SSE)
     */
    @PostMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamSSE(@RequestBody Map<String, Object> inputData) 
            throws Exception {
        
        CompiledGraph compiledGraph = workflow.compile();
        String threadId = UUID.randomUUID().toString();
        
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().unicast().onBackpressureBuffer();
        
        AsyncGenerator<NodeOutput> generator = compiledGraph.stream(inputData,
            RunnableConfig.builder().threadId(threadId).build());
        
        CompletableFuture.runAsync(() -> {
            generator.forEachAsync(output -> {
                try {
                    if (output instanceof StreamingOutput) {
                        StreamingOutput streamingOutput = (StreamingOutput) output;
                        sink.tryEmitNext(ServerSentEvent.builder(
                            JSON.toJSONString(streamingOutput.chunk())
                        ).build());
                    } else {
                        sink.tryEmitNext(ServerSentEvent.builder(
                            JSON.toJSONString(output.state().value("messages"))
                        ).build());
                    }
                } catch (Exception e) {
                    throw new CompletionException(e);
                }
            }).thenRun(() -> sink.tryEmitComplete())
              .exceptionally(ex -> {
                  sink.tryEmitError(ex);
                  return null;
              });
        });
        
        return sink.asFlux()
            .doOnCancel(() -> System.out.println("Client disconnected"))
            .doOnError(e -> System.err.println("Streaming error: " + e));
    }

}
```
