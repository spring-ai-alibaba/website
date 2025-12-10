---
title: 并行流式输出
description: 使用 Spring AI Alibaba Graph 实现并行节点的流式输出，每个并行节点可以独立产生流式输出并保持各自的节点 ID
keywords: [Spring AI Alibaba, Graph, 并行流式, Parallel Streaming, 节点流式, Flux]
---

# 并行流式输出

并行流式输出允许在并行分支中使用 `Flux` 实现流式输出。每个并行节点可以独立产生流式输出，并保持各自的节点 ID，便于区分不同节点的输出。

## 核心概念

在并行流式输出中：

- **Flux 流式输出**：节点可以直接返回 `Flux<T>` 类型的流式数据，系统会自动处理流式输出
- **节点 ID 保持**：每个并行节点的流式输出会保持各自的节点 ID
- **独立流式处理**：每个并行节点可以独立产生和处理流式数据

## 实现示例

### 示例 1: 并行节点流式输出

<Code
  language="java"
  title="并行节点流式输出示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ParallelStreamingExample.java"
>
{`import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.AsyncNodeAction;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import com.alibaba.cloud.ai.graph.streaming.StreamingOutput;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

import reactor.core.publisher.Flux;

import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.StateGraph.START;

/**
 * 并行流式输出示例
 * 演示如何在并行分支中使用 Flux 实现流式输出
 * 每个并行节点可以独立产生流式输出，并保持各自的节点 ID
 */
public class ParallelStreamingExample {

    /**
     * 示例 1: 并行节点流式输出 - 每个节点保持独立的节点 ID
     *
     * 演示如何创建多个并行节点，每个节点返回 Flux 流式输出
     * 流式输出会保持各自的节点 ID，便于区分不同节点的输出
     */
    public static void parallelStreamingWithNodeIdPreservation() throws GraphStateException {
        // 定义状态策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
            keyStrategyMap.put("messages", new AppendStrategy());
            keyStrategyMap.put("parallel_results", new AppendStrategy());
            return keyStrategyMap;
        };

        // 并行节点 1 - 返回 Flux 流式输出
        AsyncNodeAction node1 = state -> {
            System.out.println("Node1 executing on thread: " + Thread.currentThread().getName());

            // 创建流式数据
            Flux<String> stream1 = Flux.just("节点1-块1", "节点1-块2", "节点1-块3")
                    .delayElements(Duration.ofMillis(50))
                    .doOnNext(chunk ->
                            System.out.println("Node1 streaming emitting on thread: " + Thread.currentThread().getName())
                    );

            return CompletableFuture.completedFuture(Map.of("stream1", stream1));
        };

        // 并行节点 2 - 返回 Flux 流式输出
        AsyncNodeAction node2 = state -> {
            System.out.println("Node2 executing on thread: " + Thread.currentThread().getName());

            // 创建流式数据（延迟时间不同，模拟不同的处理速度）
            Flux<String> stream2 = Flux.just("节点2-块1", "节点2-块2", "节点2-块3")
                    .delayElements(Duration.ofMillis(75))
                    .doOnNext(chunk ->
                            System.out.println("Node2 streaming emitting on thread: " + Thread.currentThread().getName())
                    );

            return CompletableFuture.completedFuture(Map.of("stream2", stream2));
        };

        // 合并节点 - 接收并行节点的结果
        AsyncNodeAction mergeNode = state -> {
            System.out.println("\n合并节点接收到状态: " + state.data());
            return CompletableFuture.completedFuture(
                    Map.of("messages", "所有并行节点已完成，结果已合并")
            );
        };

        // 构建图：两个并行节点从 START 开始，都汇聚到 merge 节点
        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("node1", node1)
                .addNode("node2", node2)
                .addNode("merge", mergeNode)
                .addEdge(START, "node1")      // 并行分支 1
                .addEdge(START, "node2")      // 并行分支 2
                .addEdge("node1", "merge")    // 汇聚到合并节点
                .addEdge("node2", "merge")    // 汇聚到合并节点
                .addEdge("merge", END);

        // 编译图
        CompiledGraph graph = stateGraph.compile(
                CompileConfig.builder()
                        .build()
        );

        // 创建配置
        RunnableConfig config = RunnableConfig.builder()
                .threadId("parallel_streaming_thread")
                .build();

        // 跟踪每个节点产生的流式输出数量
        Map<String, Integer> nodeStreamCounts = new HashMap<>();
        AtomicInteger totalChunks = new AtomicInteger(0);

        System.out.println("开始并行流式输出...\n");

        // 执行流式图并处理输出
        graph.stream(Map.of("input", "test"), config)
                .doOnNext(output -> {
                    if (output instanceof StreamingOutput<?> streamingOutput) {
                        // 处理流式输出
                        String nodeId = streamingOutput.node();
                        String chunk = streamingOutput.chunk();

                        // 统计每个节点的流式输出
                        nodeStreamCounts.merge(nodeId, 1, Integer::sum);
                        totalChunks.incrementAndGet();

                        // 实时打印流式内容，显示节点 ID
                        System.out.println("[流式输出] 节点: " + nodeId +
                                ", 内容: " + chunk);
                    }
                    else {
                        // 处理普通节点输出
                        String nodeId = output.node();
                        Map<String, Object> state = output.state().data();
                        System.out.println("\n[节点完成] " + nodeId +
                                ", 状态: " + state);
                    }
                })
                .doOnComplete(() -> {
                    System.out.println("\n=== 并行流式输出完成 ===");
                    System.out.println("总流式块数: " + totalChunks.get());
                    System.out.println("各节点流式输出统计: " + nodeStreamCounts);
                })
                .doOnError(error -> {
                    System.err.println("流式输出错误: " + error.getMessage());
                    error.printStackTrace();
                })
                .blockLast(); // 阻塞等待流完成
    }
}`}
</Code>

### 示例 2: 单个节点的流式输出

<Code
  language="java"
  title="单个节点的流式输出示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ParallelStreamingExample.java"
>
{`/**
 * 示例 2: 单个节点的流式输出
 *
 * 演示单个节点使用 Flux 产生流式输出
 */
public static void singleNodeStreaming() throws GraphStateException {
    // 定义状态策略
    KeyStrategyFactory keyStrategyFactory = () -> {
        Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
        keyStrategyMap.put("messages", new AppendStrategy());
        keyStrategyMap.put("stream_result", new AppendStrategy());
        return keyStrategyMap;
    };

    // 单个流式节点
    AsyncNodeAction streamingNode = state -> {
        // 创建流式数据
        Flux<String> dataStream = Flux.just("块1", "块2", "块3", "块4", "块5")
                .delayElements(Duration.ofMillis(100));


        return CompletableFuture.completedFuture(Map.of("stream_output", dataStream));
    };

    // 构建图
    StateGraph stateGraph = new StateGraph(keyStrategyFactory)
            .addNode("streaming_node", streamingNode)
            .addEdge(START, "streaming_node")
            .addEdge("streaming_node", END);

    // 编译图
    CompiledGraph graph = stateGraph.compile(
            CompileConfig.builder()
                    .build()
    );

    // 创建配置
    RunnableConfig config = RunnableConfig.builder()
            .threadId("single_streaming_thread")
            .build();

    System.out.println("开始单节点流式输出...\n");

    AtomicInteger streamCount = new AtomicInteger(0);
    String[] lastNodeId = new String[1];

    // 执行流式图
    graph.stream(Map.of("input", "test"), config)
            .filter(output -> output instanceof StreamingOutput)
            .map(output -> (StreamingOutput<?>) output)
            .doOnNext(streamingOutput -> {
                streamCount.incrementAndGet();
                lastNodeId[0] = streamingOutput.node();
                System.out.println("[流式输出] 节点: " + streamingOutput.node() +
                        ", 内容: " + streamingOutput.chunk());
            })
            .doOnComplete(() -> {
                System.out.println("\n=== 单节点流式输出完成 ===");
                System.out.println("节点 ID: " + lastNodeId[0]);
                System.out.println("流式块数: " + streamCount.get());
            })
            .doOnError(error -> {
                System.err.println("流式输出错误: " + error.getMessage());
            })
            .blockLast();
}`}
</Code>

## 关键特性

1. **直接使用 Flux**：节点可以直接返回 `Flux<T>` 类型的流式数据，系统会自动识别并处理
2. **节点 ID 保持**：每个并行节点的流式输出会保持各自的节点 ID，便于区分不同节点的输出
3. **独立流式处理**：每个并行节点可以独立产生和处理流式数据，互不干扰
4. **结果统计**：可以统计每个节点产生的流式输出数量，便于监控和调试
5. **实时输出**：流式输出可以实时打印，提供良好的用户体验

## 使用场景

- **并行数据处理**：多个节点同时处理不同的数据流
- **实时反馈**：需要实时向用户展示处理进度的场景
- **多源数据聚合**：从多个数据源并行获取数据并聚合
- **流式 AI 响应**：多个 AI 节点并行生成响应

## 最佳实践

1. **直接返回 Flux**：在节点中直接返回 `Flux<T>` 类型的数据，系统会自动识别并处理为流式输出
2. **节点 ID 命名**：为每个并行节点使用清晰、有意义的节点 ID，便于区分不同节点的输出
3. **延迟控制**：使用 `delayElements()` 合理设置流式数据的延迟，避免过快或过慢
4. **错误处理**：在流式处理中添加适当的错误处理逻辑，使用 `doOnError()` 处理异常
5. **结果统计**：使用统计机制跟踪流式输出的进度和数量，便于监控和调试
6. **线程信息**：可以在节点中添加线程信息输出，便于理解并行执行的机制

通过并行流式输出，您可以构建高效、实时的并行处理系统，提供良好的用户体验。

