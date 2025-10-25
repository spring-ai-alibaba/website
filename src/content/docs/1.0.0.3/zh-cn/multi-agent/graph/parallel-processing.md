---
title: "并行处理"
description: "学习 Spring AI Alibaba Graph 的并行处理功能，包括真正的并行执行、扇出-扇入模式和异步支持。"
---

在现代 AI 应用开发中，性能优化是一个关键考虑因素。当工作流包含多个独立的处理步骤时，串行执行往往会成为性能瓶颈。Spring AI Alibaba Graph 的并行处理功能通过允许多个节点同时执行，显著提升了工作流的执行效率。

## 并行执行概述

Spring AI Alibaba Graph 提供了真正的并行执行能力，这意味着多个节点可以在不同的线程中同时运行，而不是简单的异步调用。这种并行处理机制在以下场景中能够带来显著的性能提升：

**适用场景：**
- **独立任务并行处理**：当工作流包含多个相互独立的处理步骤时，如同时进行文本分析和图像处理
- **扇出-扇入模式**：需要将单一输入分发到多个处理节点，然后汇总结果的场景
- **资源密集型操作**：充分利用多核处理器和线程池资源，提高整体吞吐量

**性能优势：**
相比串行执行，并行处理可以将总执行时间从各个步骤时间的总和，减少到最慢步骤的执行时间，在某些场景下能够实现数倍的性能提升。

### 并行执行的核心概念

理解以下核心概念对于有效使用并行处理功能至关重要：

**扇出 (Fan-out)**
扇出是指将一个节点的输出同时分发到多个后续节点。这些后续节点可以并行执行，每个节点处理相同的输入数据或输入数据的不同方面。

**扇入 (Fan-in)**
扇入是扇出的逆过程，指将多个并行节点的执行结果汇聚到一个节点中。汇聚节点通常负责合并、整理或进一步处理这些并行结果。

**真正并行**
与简单的异步调用不同，Spring AI Alibaba Graph 实现了真正的并行执行，即多个节点在不同的线程中同时运行，充分利用多核处理器的计算能力。

**状态合并**
在并行执行过程中，多个节点可能同时更新共享状态。框架通过 KeyStrategy 机制确保状态更新的正确性和一致性，避免并发冲突。

## 基本并行执行模式

### 扇出-扇入模式

扇出-扇入是最常见且最实用的并行处理模式。在这种模式下，工作流从一个节点开始，将输出分发到多个并行节点进行处理，最后将所有并行结果汇聚到一个节点中进行合并或后续处理。

这种模式的典型应用场景包括：
- **多维度数据分析**：对同一份数据进行不同类型的分析（如情感分析和关键词提取）
- **多服务调用**：同时调用多个外部服务获取不同类型的信息
- **多算法比较**：使用不同算法处理相同问题，然后比较结果

以下示例展示了如何配置一个基本的扇出-扇入并行工作流：

```java
@Configuration
public class ParallelProcessingConfiguration {

    @Bean
    public StateGraph parallelAnalysisGraph(ChatModel chatModel) {
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultAdvisors(new SimpleLoggerAdvisor())
            .build();

        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("inputText", KeyStrategy.REPLACE);
            strategies.put("sentiment", KeyStrategy.REPLACE);
            strategies.put("keywords", KeyStrategy.REPLACE);
            strategies.put("analysis", KeyStrategy.REPLACE);
            return strategies;
        };

        StateGraph graph = new StateGraph("ParallelAnalysis", keyStrategyFactory)
            // 注册节点
            .addNode("input", node_async(new InputNode()))
            .addNode("sentiment", node_async(new SentimentAnalysisNode(chatClient)))
            .addNode("keyword", node_async(new KeywordExtractionNode(chatClient)))
            .addNode("merge", node_async(new MergeResultsNode()))

            // 扇出：从 input 分发到两个并行节点
            .addEdge(START, "input")
            .addEdge("input", "sentiment")  // 并行分支 1
            .addEdge("input", "keyword")    // 并行分支 2

            // 扇入：两个并行节点的结果合并到 merge 节点
            .addEdge("sentiment", "merge")
            .addEdge("keyword", "merge")

            // 结束
            .addEdge("merge", END);

        return graph;
    }
}
```

### 节点实现示例

在上述配置中，我们定义了四个关键节点，每个节点都有特定的职责。以下是这些节点的具体实现：

```java
// 输入预处理节点
static class InputNode implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        String text = (String) state.value("inputText").orElse("");
        // 预处理输入文本
        return Map.of("inputText", text.trim());
    }
}

// 情感分析节点（并行执行）
static class SentimentAnalysisNode implements NodeAction {
    private final ChatClient chatClient;

    public SentimentAnalysisNode(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String text = (String) state.value("inputText").orElse("");

        String sentiment = chatClient.prompt()
            .user("分析以下文本的情感倾向（正面/负面/中性）：" + text)
            .call()
            .content();

        return Map.of("sentiment", sentiment);
    }
}

// 关键词提取节点（并行执行）
static class KeywordExtractionNode implements NodeAction {
    private final ChatClient chatClient;

    public KeywordExtractionNode(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String text = (String) state.value("inputText").orElse("");

        String keywords = chatClient.prompt()
            .user("从以下文本中提取关键词，用逗号分隔：" + text)
            .call()
            .content();

        return Map.of("keywords", Arrays.asList(keywords.split(",\\s*")));
    }
}

// 结果合并节点
static class MergeResultsNode implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        String sentiment = (String) state.value("sentiment").orElse("unknown");
        List<?> keywords = (List<?>) state.value("keywords").orElse(List.of());

        Map<String, Object> analysis = Map.of(
            "sentiment", sentiment,
            "keywords", keywords,
            "timestamp", Instant.now()
        );

        return Map.of("analysis", analysis);
    }
}
```

## 并行执行的实际应用

### 服务层集成

在实际应用中，并行工作流通常需要通过服务层进行封装，以便与应用的其他组件集成。以下示例展示了如何创建一个服务来使用并行分析工作流：

```java
@Service
public class ParallelAnalysisService {

    @Autowired
    private CompiledGraph parallelAnalysisGraph;

    public AnalysisResult analyzeText(String inputText) {
        Map<String, Object> initialState = Map.of("inputText", inputText);

        Optional<OverAllState> result = parallelAnalysisGraph.invoke(initialState);

        if (result.isPresent()) {
            OverAllState state = result.get();
            Map<String, Object> analysis = (Map<String, Object>) state.value("analysis").orElse(Map.of());

            return new AnalysisResult(
                (String) analysis.get("sentiment"),
                (List<String>) analysis.get("keywords"),
                (Instant) analysis.get("timestamp")
            );
        }

        return new AnalysisResult("unknown", List.of(), Instant.now());
    }

    public static class AnalysisResult {
        private final String sentiment;
        private final List<String> keywords;
        private final Instant timestamp;

        public AnalysisResult(String sentiment, List<String> keywords, Instant timestamp) {
            this.sentiment = sentiment;
            this.keywords = keywords;
            this.timestamp = timestamp;
        }

        // getters...
        public String getSentiment() { return sentiment; }
        public List<String> getKeywords() { return keywords; }
        public Instant getTimestamp() { return timestamp; }
    }
}
```

### 多层并行处理

对于更复杂的业务场景，可能需要实现多层并行处理。这种模式允许在工作流的不同阶段都使用并行执行，进一步提升性能。

多层并行处理的典型特征：
- **分层设计**：工作流被分为多个层次，每个层次内部可以并行执行
- **级联优化**：上层的并行结果可以作为下层并行处理的输入
- **资源管理**：需要合理配置线程池以避免资源竞争

以下示例展示了一个包含内容扩展和翻译的多层并行处理工作流：

```java
@Configuration
public class ComplexParallelConfiguration {

    @Bean
    public StateGraph complexParallelGraph(ChatClient.Builder chatClientBuilder) {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("query", KeyStrategy.REPLACE);
            strategies.put("expander_content", KeyStrategy.REPLACE);
            strategies.put("translate_content", KeyStrategy.REPLACE);
            strategies.put("final_result", KeyStrategy.REPLACE);
            return strategies;
        };

        StateGraph graph = new StateGraph(keyStrategyFactory)
            // 分发节点
            .addNode("dispatcher", node_async(new DispatcherNode()))

            // 并行处理节点
            .addNode("expander", node_async(new ExpanderNode(chatClientBuilder)))
            .addNode("translator", node_async(new TranslatorNode(chatClientBuilder)))

            // 收集节点
            .addNode("collector", node_async(new CollectorNode()))

            // 构建并行边
            .addEdge(START, "dispatcher")
            .addEdge("dispatcher", "expander")    // 并行分支 1
            .addEdge("dispatcher", "translator")  // 并行分支 2
            .addEdge("expander", "collector")     // 汇聚
            .addEdge("translator", "collector")   // 汇聚
            .addEdge("collector", END);

        return graph;
    }
}
```

**多层并行处理的应用场景：**

- **多任务并行处理**：需要对同一输入进行不同类型的处理，如内容分析和格式转换
- **内容处理管道**：对文本、图像、音频等多媒体内容进行并行处理
- **数据分析工作流**：同时进行多种分析任务，如统计分析、趋势分析和异常检测
- **性能关键应用**：需要充分利用多核处理器资源的高性能计算场景

## Map-Reduce 模式 (开发中)

### 功能概述

Map-Reduce 是一种强大的并行处理模式，特别适用于需要对大量数据项进行相同处理的场景。与固定的扇出-扇入模式不同，Map-Reduce 模式可以根据输入数据的数量动态创建并行任务。

> **开发状态**：Send API 和动态 Map-Reduce 功能目前正在开发中，将在未来版本中提供完整支持。

**Map-Reduce 模式的优势：**
- **动态扩展**：根据数据量自动调整并行度
- **负载均衡**：智能分配任务到不同的处理节点
- **容错处理**：支持任务失败重试和结果聚合
- **资源优化**：根据系统资源动态调整执行策略

### 预期的 Map-Reduce 用法

```java
// 注意：以下代码展示了计划中的 Send API 用法，目前尚未实现
@Configuration
public class MapReduceWorkflow {

    @Bean
    public CompiledGraph mapReduceGraph() {
        // Map-Reduce 路由逻辑（开发中）
        EdgeAction mapReduceRouting = state -> {
            List<String> subjects = state.value("subjects", List.class).orElse(new ArrayList<>());

            // 为每个主题创建一个 Send 对象（开发中）
            return subjects.stream()
                .map(subject -> new Send("generate_joke", Map.of("subject", subject)))
                .collect(Collectors.toList());
        };

        // 图构建逻辑...
    }
}
```

### 当前的替代方案

在 Send API 完全可用之前，开发者可以使用 Java 的并行流（Parallel Streams）结合现有的节点机制来实现类似的批量处理功能。这种方法虽然不如原生 Map-Reduce 模式灵活，但在许多场景下已经能够满足需求：

```java
@Configuration
public class CurrentMapReduceAlternative {

    @Bean
    public StateGraph batchProcessingGraph(ChatClient.Builder chatClientBuilder) {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input_items", KeyStrategy.REPLACE);
            strategies.put("processed_items", KeyStrategy.APPEND);
            strategies.put("final_result", KeyStrategy.REPLACE);
            return strategies;
        };

        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("batch_processor", node_async(new BatchProcessorNode(chatClientBuilder)))
            .addNode("result_aggregator", node_async(new ResultAggregatorNode()))

            .addEdge(START, "batch_processor")
            .addEdge("batch_processor", "result_aggregator")
            .addEdge("result_aggregator", END);

        return graph;
    }
}

// 批处理节点实现
static class BatchProcessorNode implements NodeAction {
    private final ChatClient chatClient;

    public BatchProcessorNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        List<String> items = state.value("input_items", List.class).orElse(new ArrayList<>());

        // 使用并行流处理多个项目
        List<String> processedItems = items.parallelStream()
            .map(item -> {
                try {
                    return chatClient.prompt()
                        .user("处理这个项目：" + item)
                        .call()
                        .content();
                } catch (Exception e) {
                    return "处理失败：" + item;
                }
            })
            .collect(Collectors.toList());

        return Map.of("processed_items", processedItems);
    }
}
```

## 异步支持

### 异步执行机制

Spring AI Alibaba Graph 在设计上原生支持异步操作，这是实现高性能并行处理的基础。框架中的所有节点默认都是异步执行的，这意味着：

- **非阻塞执行**：节点执行不会阻塞主线程，提高系统响应性
- **资源优化**：通过线程池管理，有效利用系统资源
- **可扩展性**：支持高并发场景下的大量并行任务
- **错误隔离**：单个节点的异常不会影响其他并行节点的执行

### 异步节点配置

配置异步节点非常简单，只需要使用 `node_async()` 方法包装节点动作即可。以下示例展示了异步节点的基本配置模式：

```java
@Configuration
public class AsyncNodeExample {

    @Bean
    public StateGraph asyncProcessingGraph(ChatClient.Builder chatClientBuilder) {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("processed_data", KeyStrategy.REPLACE);
            strategies.put("processing_time", KeyStrategy.REPLACE);
            return strategies;
        };

        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("async_processor", node_async(new AsyncProcessorNode(chatClientBuilder)))
            .addNode("result_formatter", node_async(new ResultFormatterNode()))

            .addEdge(START, "async_processor")
            .addEdge("async_processor", "result_formatter")
            .addEdge("result_formatter", END);

        return graph;
    }
}

// 异步处理节点
static class AsyncProcessorNode implements NodeAction {
    private final ChatClient chatClient;

    public AsyncProcessorNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String input = state.value("input", String.class).orElse("");
        long startTime = System.currentTimeMillis();

        // 异步调用 LLM
        String response = chatClient.prompt()
            .user("处理以下输入并提供详细分析：" + input)
            .call()
            .content();

        long processingTime = System.currentTimeMillis() - startTime;

        return Map.of(
            "processed_data", response,
            "processing_time", processingTime
        );
    }
}

// 结果格式化节点
static class ResultFormatterNode implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        String processedData = state.value("processed_data", String.class).orElse("");
        Long processingTime = state.value("processing_time", Long.class).orElse(0L);

        String formattedResult = String.format(
            "处理结果：%s\n处理时间：%d ms",
            processedData,
            processingTime
        );

        return Map.of("final_result", formattedResult);
    }
}
```

### 流式处理支持

除了基本的异步执行外，Spring AI Alibaba Graph 还提供了流式处理功能，允许开发者实时监控工作流的执行进度。这对于长时间运行的并行任务特别有用：

```java
@Service
public class AsyncGraphService {

    @Autowired
    private CompiledGraph asyncProcessingGraph;

    public String processSync(String input) {
        // 同步调用图（内部仍然是异步执行）
        Optional<OverAllState> result = asyncProcessingGraph.invoke(Map.of("input", input));

        return result.map(state ->
            state.value("final_result", String.class).orElse("无结果")
        ).orElse("执行失败");
    }

    public void demonstrateAsyncStreaming() {
        // 流式执行，实时获取节点执行结果
        RunnableConfig config = RunnableConfig.builder().build();

        AsyncGenerator<NodeOutput> stream = asyncProcessingGraph.stream(
            Map.of("input", "测试数据"),
            config
        );

        stream.subscribe(new GeneratorSubscriber<NodeOutput>() {
            @Override
            public void onNext(NodeOutput nodeOutput) {
                System.out.println("节点 '" + nodeOutput.nodeId() + "' 完成");

                // 检查处理时间
                Long processingTime = nodeOutput.state()
                    .value("processing_time", Long.class).orElse(0L);
                if (processingTime > 0) {
                    System.out.println("处理时间: " + processingTime + "ms");
                }
            }

            @Override
            public void onError(Throwable error) {
                System.err.println("执行错误: " + error.getMessage());
            }

            @Override
            public void onComplete() {
                System.out.println("异步流式执行完成");
            }
        });
    }
}
```

## 并行处理最佳实践

### 状态管理策略

在并行处理中，正确的状态管理是确保数据一致性和避免竞争条件的关键。Spring AI Alibaba Graph 通过 KeyStrategy 机制提供了灵活的状态管理选项：

**KeyStrategy 选择指南：**
- **REPLACE**：适用于单一值存储，如分析结果、配置参数
- **APPEND**：适用于收集多个结果，如日志信息、错误列表
- **MERGE**：适用于复杂对象合并，如嵌套数据结构

以下示例展示了针对并行处理优化的状态管理配置：

```java
@Configuration
public class ParallelStateConfig {

    @Bean
    public KeyStrategyFactory parallelKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();

            // 输入数据使用替换策略
            strategies.put("input", KeyStrategy.REPLACE);

            // 并行处理结果使用追加策略收集
            strategies.put("parallel_results", KeyStrategy.APPEND);

            // 最终结果使用替换策略
            strategies.put("final_result", KeyStrategy.REPLACE);

            // 错误信息使用追加策略收集所有错误
            strategies.put("errors", KeyStrategy.APPEND);

            return strategies;
        };
    }
}
```

### 异常处理策略

并行执行环境中的异常处理需要特别注意，因为单个节点的失败不应该影响整个工作流的执行。推荐采用以下异常处理策略：

**异常处理原则：**
- **优雅降级**：节点失败时提供默认值或备选方案
- **错误隔离**：防止单个节点异常传播到其他并行节点
- **状态记录**：记录异常信息以便后续分析和调试
- **重试机制**：对于临时性错误，实现智能重试逻辑

```java
// 健壮的并行节点实现
static class RobustParallelNode implements NodeAction {
    private final ChatClient chatClient;

    public RobustParallelNode(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        try {
            String input = state.value("input", String.class).orElse("");

            String result = chatClient.prompt()
                .user("处理输入：" + input)
                .call()
                .content();

            return Map.of(
                "parallel_results", result,
                "status", "success"
            );
        } catch (Exception e) {
            // 记录错误但不中断整个流程
            return Map.of(
                "errors", "节点执行失败: " + e.getMessage(),
                "status", "failed"
            );
        }
    }
}
```

### 性能监控与优化

对于并行处理工作流，性能监控是识别瓶颈和优化机会的重要手段。建议集成以下监控指标：

**关键监控指标：**
- **执行时间**：各个节点和整体工作流的执行时间
- **并行度**：实际并行执行的节点数量
- **资源利用率**：CPU、内存和线程池的使用情况
- **成功率**：节点执行成功和失败的统计信息

以下示例展示了如何在节点中集成性能监控：

```java
// 带性能监控的节点
static class MonitoredNode implements NodeAction {
    private final ChatClient chatClient;
    private final MeterRegistry meterRegistry;

    public MonitoredNode(ChatClient chatClient, MeterRegistry meterRegistry) {
        this.chatClient = chatClient;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            String input = state.value("input", String.class).orElse("");

            String result = chatClient.prompt()
                .user("处理输入：" + input)
                .call()
                .content();

            // 记录成功指标
            meterRegistry.counter("graph.node.success", "node", "monitored").increment();

            return Map.of("result", result);
        } catch (Exception e) {
            // 记录失败指标
            meterRegistry.counter("graph.node.failure", "node", "monitored").increment();
            throw e;
        } finally {
            // 记录执行时间
            sample.stop(Timer.builder("graph.node.duration")
                .tag("node", "monitored")
                .register(meterRegistry));
        }
    }
}
```

## 管道模式（Pipeline Pattern）

### 管道模式概述

管道模式是一种将复杂处理过程分解为一系列简单、专门化步骤的设计模式。每个步骤专注于特定的数据转换或处理任务，步骤之间通过标准化的接口进行数据传递。

**管道模式的优势：**
- **模块化设计**：每个处理步骤独立，便于开发、测试和维护
- **可重用性**：单个处理步骤可以在不同的管道中重复使用
- **可扩展性**：容易添加、删除或修改处理步骤
- **并行优化**：某些步骤可以并行执行，提高整体性能

以下示例展示了一个典型的数据处理管道：

```java
@Configuration
public class DataProcessingPipeline {

    @Bean
    public CompiledGraph dataProcessingWorkflow() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("raw_data", KeyStrategy.REPLACE);
            strategies.put("cleaned_data", KeyStrategy.REPLACE);
            strategies.put("transformed_data", KeyStrategy.REPLACE);
            strategies.put("validated_data", KeyStrategy.REPLACE);
            strategies.put("processing_log", KeyStrategy.APPEND);
            return strategies;
        };

        // 数据清洗节点
        NodeAction cleaningAction = state -> {
            Object rawData = state.value("raw_data", Object.class).orElse(null);
            Object cleanedData = performDataCleaning(rawData);

            return Map.of(
                "cleaned_data", cleanedData,
                "processing_log", "数据清洗完成: " + System.currentTimeMillis()
            );
        };

        // 数据转换节点
        NodeAction transformationAction = state -> {
            Object cleanedData = state.value("cleaned_data", Object.class).orElse(null);
            Object transformedData = performDataTransformation(cleanedData);

            return Map.of(
                "transformed_data", transformedData,
                "processing_log", "数据转换完成: " + System.currentTimeMillis()
            );
        };

        // 数据验证节点
        NodeAction validationAction = state -> {
            Object transformedData = state.value("transformed_data", Object.class).orElse(null);

            if (isValidData(transformedData)) {
                return Map.of(
                    "validated_data", transformedData,
                    "processing_log", "数据验证通过: " + System.currentTimeMillis()
                );
            } else {
                return Map.of(
                    "error", "数据验证失败",
                    "processing_log", "数据验证失败: " + System.currentTimeMillis()
                );
            }
        };

        return new StateGraph(keyStrategyFactory)
            .addNode("cleaning", node_async(cleaningAction))
            .addNode("transformation", node_async(transformationAction))
            .addNode("validation", node_async(validationAction))

            .addEdge(START, "cleaning")
            .addEdge("cleaning", "transformation")
            .addEdge("transformation", "validation")
            .addEdge("validation", END)

            .compile();
    }

    private Object performDataCleaning(Object rawData) {
        // 实现数据清洗逻辑
        return rawData;
    }

    private Object performDataTransformation(Object cleanedData) {
        // 实现数据转换逻辑
        return cleanedData;
    }

    private boolean isValidData(Object data) {
        // 实现数据验证逻辑
        return data != null;
    }
}
```

## 下一步

- 学习状态管理：[状态管理](../state-management)
- 了解控制流：[控制流](../control-flow)
- 查看完整示例：[示例项目](../examples)
- 返回总览：[概览](../overview)
