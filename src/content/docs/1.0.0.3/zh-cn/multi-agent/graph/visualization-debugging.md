---
title: "可视化和调试"
description: "学习 Spring AI Alibaba Graph 的可视化和调试功能，包括图可视化、流式监控、检查点和中断机制。"
---

Spring AI Alibaba Graph 提供了完整的可视化和调试工具链，帮助开发者更好地理解、监控和调试复杂的 AI 工作流。本文档将介绍这些功能的使用方法和最佳实践。

## 图可视化

### 支持的可视化格式

Spring AI Alibaba Graph 支持生成两种主流的图表格式，帮助开发者直观地理解工作流结构：

**PlantUML 格式**
- 适合生成高质量的文档图表
- 支持丰富的样式和布局选项
- 可以轻松集成到文档系统中

**Mermaid 格式**
- 适合在线展示和交互式查看
- 广泛支持各种 Markdown 编辑器
- 便于在 Web 应用中嵌入展示

### 基本可视化用法

可以在工作流配置完成后生成可视化图表：

```java
@Configuration
public class GraphVisualizationExample {

    @Bean
    public StateGraph visualizableWorkflow() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            return strategies;
        };

        StateGraph graph = new StateGraph("示例工作流", keyStrategyFactory)
            .addNode("preprocess", node_async(state -> {
                String input = state.value("input", String.class).orElse("");
                return Map.of("processed_input", input.trim());
            }))
            .addNode("analyze", node_async(state -> {
                String input = state.value("processed_input", String.class).orElse("");
                return Map.of("analysis_result", "分析结果: " + input);
            }))
            .addNode("postprocess", node_async(state -> {
                String result = state.value("analysis_result", String.class).orElse("");
                return Map.of("result", result + " [已处理]");
            }))

            .addEdge(START, "preprocess")
            .addEdge("preprocess", "analyze")
            .addEdge("analyze", "postprocess")
            .addEdge("postprocess", END);

        // 生成并打印可视化图表
        printVisualization(graph);

        return graph;
    }

    private void printVisualization(StateGraph graph) {
        // 生成 PlantUML 图表
        GraphRepresentation plantuml = graph.getGraph(
            GraphRepresentation.Type.PLANTUML,
            "示例工作流"
        );

        // 生成 Mermaid 图表
        GraphRepresentation mermaid = graph.getGraph(
            GraphRepresentation.Type.MERMAID,
            "示例工作流"
        );

        System.out.println("=== PlantUML 图表 ===");
        System.out.println(plantuml.content());

        System.out.println("\n=== Mermaid 图表 ===");
        System.out.println(mermaid.content());
    }
}
```

## 流式执行和实时监控

### 流式执行的优势

流式执行是 Spring AI Alibaba Graph 的核心特性之一，它提供了以下优势：

- **实时反馈**：用户可以立即看到处理进度，提升用户体验
- **早期发现问题**：可以在问题发生时立即发现，而不是等到最后
- **资源优化**：可以根据中间结果动态调整资源分配
- **调试便利**：便于观察每个节点的执行情况和状态变化

### 流式执行实现

Spring AI Alibaba Graph 支持通过 `stream()` 方法进行流式执行：

```java
@Service
public class StreamingMonitorService {

    @Autowired
    private CompiledGraph workflow;

    public void executeWithStreaming(String input) {
        RunnableConfig config = RunnableConfig.builder().build();

        // 流式执行，实时获取每个节点的输出
        AsyncGenerator<NodeOutput> stream = workflow.stream(
            Map.of("input", input),
            config
        );

        stream.subscribe(new GeneratorSubscriber<NodeOutput>() {
            @Override
            public void onNext(NodeOutput nodeOutput) {
                System.out.println("✅ 节点 '" + nodeOutput.nodeId() + "' 执行完成");
                System.out.println("📊 当前状态: " + nodeOutput.state().data());

                // 可以根据节点ID进行特定处理
                switch (nodeOutput.nodeId()) {
                    case "preprocess":
                        System.out.println("🔄 预处理完成");
                        break;
                    case "analyze":
                        String result = nodeOutput.state()
                            .value("analysis_result", String.class).orElse("");
                        System.out.println("🔍 分析结果: " + result);
                        break;
                    case "postprocess":
                        System.out.println("✨ 后处理完成");
                        break;
                }
            }

            @Override
            public void onError(Throwable error) {
                System.err.println("❌ 执行错误: " + error.getMessage());
            }

            @Override
            public void onComplete() {
                System.out.println("🎉 工作流执行完成");
            }
        });
    }
}
```

## 检查点和状态恢复

### 检查点机制概述

检查点（Checkpoint）是 Spring AI Alibaba Graph 的关键特性，它允许在图执行过程中保存状态快照，并在需要时从这些快照恢复执行。

**检查点的核心价值：**
- **容错能力**：系统故障时可以从最近的检查点恢复
- **长时间任务支持**：分段执行，避免资源浪费
- **调试和实验**：从特定状态开始重复执行
- **成本控制**：避免重复执行昂贵的前期步骤

### 支持的检查点存储方式

Spring AI Alibaba Graph 提供多种检查点保存策略：

**MemorySaver（内存保存器）**
- 适用于开发和测试环境
- 数据存储在内存中，重启后丢失
- 性能最高，适合快速原型开发

**RedisSaver（Redis 保存器）**
- 适用于分布式环境
- 支持高并发访问
- 数据持久化，支持集群部署

**MongoSaver（MongoDB 保存器）**
- 适用于需要复杂查询的场景
- 支持事务操作
- 适合大规模数据存储

### 检查点配置示例

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

@Configuration
public class CheckpointGraphExample {

    @Bean
    public CompiledGraph checkpointWorkflow() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("step", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            return strategies;
        };

        // 配置内存检查点保存器
        MemorySaver memorySaver = new MemorySaver();

        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, memorySaver)
            .type(SaverConstant.MEMORY)
            .build();

        CompileConfig config = CompileConfig.builder()
            .saverConfig(saverConfig)
            .build();

        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("step1", node_async(state -> {
                System.out.println("📝 执行步骤1");
                return Map.of("step", "1", "result", "步骤1完成");
            }))
            .addNode("step2", node_async(state -> {
                System.out.println("📝 执行步骤2");
                return Map.of("step", "2", "result", "步骤2完成");
            }))
            .addNode("step3", node_async(state -> {
                System.out.println("📝 执行步骤3");
                return Map.of("step", "3", "result", "步骤3完成");
            }))

            .addEdge(START, "step1")
            .addEdge("step1", "step2")
            .addEdge("step2", "step3")
            .addEdge("step3", END);

        return graph.compile(config);
    }
}
```

### 检查点操作示例

```java
@Service
public class CheckpointService {

    @Autowired
    private CompiledGraph checkpointWorkflow;

    public void demonstrateCheckpoints() {
        RunnableConfig config = RunnableConfig.builder()
            .threadId("demo-thread-001")
            .build();

        // 执行工作流（会自动保存检查点）
        Optional<OverAllState> result = checkpointWorkflow.invoke(
            Map.of("input", "测试数据"),
            config
        );

        // 获取状态历史
        Collection<StateSnapshot> history = checkpointWorkflow.getStateHistory(config);
        System.out.println("📚 检查点历史记录数量: " + history.size());

        // 打印每个检查点的信息
        history.forEach(snapshot -> {
            System.out.println("🔖 检查点ID: " + snapshot.config().checkPointId().orElse("N/A"));
            System.out.println("📍 节点ID: " + snapshot.nodeId());
            System.out.println("📊 状态数据: " + snapshot.state().data());
        });
    }
}
```

## 中断和恢复机制

### 中断机制概述

中断和恢复是 Spring AI Alibaba Graph 支持人机协作的核心机制。它允许工作流在执行过程中暂停，等待外部输入或人工干预，然后无缝继续执行。

**中断的典型应用场景：**
- **人工审核**：在关键决策点需要人工确认或修改
- **外部依赖**：等待外部系统的响应或用户的输入
- **质量控制**：在重要步骤后进行质量检查
- **合规要求**：某些业务流程需要人工监督和确认

### 中断类型和配置

Spring AI Alibaba Graph 支持两种类型的中断：

**interruptBefore（节点前中断）**
- 在指定节点执行前暂停
- 适用于需要预先验证或准备的场景

**interruptAfter（节点后中断）**
- 在指定节点执行后暂停
- 适用于需要审核结果或后续处理的场景

### 中断配置示例

```java
@Configuration
public class InterruptibleGraphExample {

    @Bean
    public CompiledGraph interruptibleWorkflow() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("analysis", KeyStrategy.REPLACE);
            strategies.put("review_result", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            return strategies;
        };

        // 配置检查点保存器和中断点
        MemorySaver memorySaver = new MemorySaver();
        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, memorySaver)
            .type(SaverConstant.MEMORY)
            .build();

        CompileConfig config = CompileConfig.builder()
            .saverConfig(saverConfig)
            .interruptBefore("human_review")  // 在人工审核前中断
            .build();

        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("analyze", node_async(state -> {
                String input = state.value("input", String.class).orElse("");
                System.out.println("🔍 正在分析: " + input);

                return Map.of(
                    "analysis", "分析完成: " + input,
                    "needs_review", input.contains("重要")
                );
            }))
            .addNode("human_review", node_async(state -> {
                System.out.println("👤 等待人工审核...");
                // 这里会被中断，等待外部恢复
                return Map.of("review_result", "审核通过");
            }))
            .addNode("finalize", node_async(state -> {
                String analysis = state.value("analysis", String.class).orElse("");
                String review = state.value("review_result", String.class).orElse("");

                return Map.of("result", "最终结果: " + analysis + " + " + review);
            }))

            .addEdge(START, "analyze")
            .addEdge("analyze", "human_review")
            .addEdge("human_review", "finalize")
            .addEdge("finalize", END);

        return graph.compile(config);
    }
}
```

### 中断和恢复的使用示例

```java
@Service
public class InterruptibleService {

    @Autowired
    private CompiledGraph interruptibleWorkflow;

    public String processWithInterruption(String input) {
        RunnableConfig config = RunnableConfig.builder()
            .threadId("interrupt-demo-" + System.currentTimeMillis())
            .build();

        try {
            // 第一次执行，会在 human_review 前中断
            Optional<OverAllState> result = interruptibleWorkflow.invoke(
                Map.of("input", input),
                config
            );

            if (result.isPresent()) {
                System.out.println("⏸️ 工作流在人工审核前中断");

                // 获取中断时的状态
                OverAllState interruptedState = result.get();
                System.out.println("📊 中断时状态: " + interruptedState.data());

                // 模拟人工审核过程
                System.out.println("👤 模拟人工审核...");
                Thread.sleep(1000); // 模拟审核时间

                // 添加人工反馈并恢复执行
                OverAllState.HumanFeedback feedback = new OverAllState.HumanFeedback(
                    Map.of("review_result", "人工审核通过"),
                    "review_result"
                );
                interruptedState.withHumanFeedback(feedback);

                // 从中断点恢复执行
                Optional<OverAllState> finalResult = interruptibleWorkflow.invoke(
                    Map.of(),
                    config
                );

                return finalResult.map(state ->
                    state.value("result", String.class).orElse("无结果")
                ).orElse("执行失败");
            }

            return "未中断，直接完成";

        } catch (Exception e) {
            System.err.println("❌ 执行出错: " + e.getMessage());
            return "执行出错: " + e.getMessage();
        }
    }
}
```

## 下一步

- 学习状态管理：[状态管理](../state-management)
- 了解控制流：[控制流](../control-flow)
- 查看并行处理：[并行处理](../parallel-processing)
- 返回总览：[概览](../overview)
