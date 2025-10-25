---
title: "控制流"
description: "学习 Spring AI Alibaba Graph 的控制流功能，包括条件分支、循环控制和 Command API。"
---

本文档介绍 Spring AI Alibaba Graph 的控制流功能，包括条件分支、循环控制和 Command API。

## 条件分支

条件分支是 Graph 框架的核心特性之一，它允许根据运行时的状态动态选择执行路径。这种模式在以下场景中非常有用：

- **智能路由**：根据输入内容的特征选择不同的处理策略
- **错误处理**：根据错误类型选择不同的恢复策略
- **业务规则**：根据业务规则动态调整处理流程
- **A/B 测试**：根据用户特征选择不同的算法或模型

### 条件分支的工作原理

条件分支通过以下组件实现：

1. **分类节点**：分析输入并生成分类结果
2. **路由逻辑**：基于分类结果决定下一个节点
3. **处理节点**：针对不同分类的专门处理逻辑

现在让我们创建一个包含条件分支的图，根据输入内容选择不同的处理路径：

```java
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

@Configuration
public class ConditionalGraphExample {

    @Bean
    public CompiledGraph conditionalWorkflow() throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("category", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            return strategies;
        };

        // 分类节点
        NodeAction classifierAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String category;

            if (input.contains("紧急")) {
                category = "urgent";
            } else if (input.contains("普通")) {
                category = "normal";
            } else {
                category = "unknown";
            }

            System.out.println("分类结果: " + category);
            return Map.of("category", category);
        };

        // 紧急处理节点
        NodeAction urgentAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String result = "紧急处理: " + input;
            System.out.println("执行紧急处理");
            return Map.of("result", result);
        };

        // 普通处理节点
        NodeAction normalAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String result = "普通处理: " + input;
            System.out.println("执行普通处理");
            return Map.of("result", result);
        };

        // 默认处理节点
        NodeAction defaultAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String result = "默认处理: " + input;
            System.out.println("执行默认处理");
            return Map.of("result", result);
        };

        // 路由逻辑
        EdgeAction routingLogic = state -> {
            String category = state.value("category", String.class).orElse("unknown");
            return category; // 直接返回分类结果作为下一个节点名
        };

        // 构建条件图
        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("classifier", node_async(classifierAction))
            .addNode("urgent", node_async(urgentAction))
            .addNode("normal", node_async(normalAction))
            .addNode("unknown", node_async(defaultAction))

            .addEdge(START, "classifier")
            .addConditionalEdges("classifier", edge_async(routingLogic), Map.of(
                "urgent", "urgent",
                "normal", "normal",
                "unknown", "unknown"
            ))
            .addEdge("urgent", END)
            .addEdge("normal", END)
            .addEdge("unknown", END);

        return graph.compile();
    }
}
```

### 条件入口点

条件入口点让您可以根据自定义逻辑从不同节点开始。您可以从虚拟的 `START` 节点使用 `addConditionalEdges`：

```java
// 定义入口路由逻辑
EdgeAction entryRoutingLogic = state -> {
    String userType = (String) state.value("user_type").orElse("guest");
    return userType.equals("admin") ? "admin_handler" : "user_handler";
};

// 添加条件入口点
.addConditionalEdges(START, edge_async(entryRoutingLogic), Map.of(
    "admin_handler", "admin_handler",
    "user_handler", "user_handler"
))
```

## Command API

`Command` 是 Spring AI Alibaba Graph 的一个强大特性，它允许节点在执行过程中同时更新状态和控制流程。这种设计提供了比传统条件边更灵活的控制方式。

### Command 的优势

与传统的条件边相比，Command 具有以下优势：

1. **原子操作**：在一个操作中同时更新状态和决定下一步，避免了状态不一致
2. **简化逻辑**：减少了额外的路由节点，使图结构更加简洁
3. **动态决策**：可以基于复杂的业务逻辑动态决定下一个节点
4. **错误处理**：可以在出错时直接跳转到错误处理节点

### Command 的使用场景

- **复杂的业务决策**：需要基于多个条件进行复杂判断的场景
- **早期退出**：在满足特定条件时直接结束流程
- **错误恢复**：在检测到错误时跳转到恢复流程
- **动态工作流**：根据运行时信息动态构建执行路径

Spring AI Alibaba Graph 支持使用 `Command` 对象在节点内部直接控制流程：

```java
import com.alibaba.cloud.ai.graph.action.Command;
import com.alibaba.cloud.ai.graph.action.CommandAction;

@Configuration
public class CommandGraphExample {

    @Bean
    public CompiledGraph commandWorkflow() throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("decision", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            return strategies;
        };

        // 使用 Command 的决策节点
        CommandAction decisionAction = (state, config) -> {
            String input = state.value("input", String.class).orElse("");

            // 根据输入内容决定下一步
            if (input.contains("A")) {
                return new Command("process_a", Map.of("decision", "选择路径A"));
            } else if (input.contains("B")) {
                return new Command("process_b", Map.of("decision", "选择路径B"));
            } else {
                return new Command(END, Map.of("decision", "直接结束"));
            }
        };

        // 处理A节点
        NodeAction processAAction = state -> {
            System.out.println("执行路径A处理");
            return Map.of("result", "路径A的结果");
        };

        // 处理B节点
        NodeAction processBAction = state -> {
            System.out.println("执行路径B处理");
            return Map.of("result", "路径B的结果");
        };

        // 构建使用Command的图
        StateGraph graph = new StateGraph(keyStrategyFactory)
                .addNode("decision", decisionAction)  // CommandAction 直接添加
                .addNode("process_a", node_async(processAAction))
                .addNode("process_b", node_async(processBAction))

                .addEdge(START, "decision")
                // Command 节点会自动路由，不需要显式添加条件边
                .addEdge("process_a", END)
                .addEdge("process_b", END);

        return graph.compile();
    }
}
```

### 何时使用 Command 而不是条件边？

- 当您需要**既**更新图状态**又**路由到不同节点时，使用 `Command`。例如，在实现多智能体切换时，重要的是路由到不同的智能体并向该智能体传递一些信息。
- 使用条件边在不更新状态的情况下有条件地在节点之间路由。

### 在父图中导航到节点

如果您使用子图，您可能希望从子图内的节点导航到不同的子图（即父图中的不同节点）。为此，您可以在 `Command` 中指定 `graph=Command.PARENT`：

```java
NodeAction parentNavigationNode = state -> {
    return Command.builder()
        .update(Map.of("foo", "bar"))
        .goto("other_subgraph")  // 父图中的节点
        .graph(Command.PARENT)
        .build();
};
```

## 创建和控制循环

当创建带有循环的图时，我们需要一个终止执行的机制。这通常通过添加条件边来实现，一旦达到某个终止条件就路由到 END 节点。

您还可以在调用或流式传输图时设置图递归限制。递归限制设置图在引发错误之前允许执行的超级步数。

### 基本循环控制

```java
import com.alibaba.cloud.ai.graph.errors.GraphRecursionException;

@Configuration
public class LoopControlExample {

    @Bean
    public CompiledGraph loopGraph() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("counter", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.APPEND);
            return strategies;
        };

        NodeAction incrementAction = state -> {
            Integer counter = state.value("counter", Integer.class).orElse(0);
            counter++;
            
            System.out.println("计数器: " + counter);
            return Map.of(
                "counter", counter,
                "result", List.of("步骤 " + counter)
            );
        };

        // 终止条件：计数器达到5时停止
        EdgeAction terminationCondition = state -> {
            Integer counter = state.value("counter", Integer.class).orElse(0);
            return counter >= 5 ? END : "increment";
        };

        return new StateGraph(keyStrategyFactory)
            .addNode("increment", node_async(incrementAction))
            .addEdge(START, "increment")
            .addConditionalEdges("increment", edge_async(terminationCondition))
            .compile();
    }
}
```

### 递归限制控制

```java
@Service
public class LoopControlService {

    @Autowired
    private CompiledGraph loopGraph;

    public void demonstrateRecursionLimit() {
        try {
            // 设置递归限制为3步
            RunnableConfig config = RunnableConfig.builder()
                .recursionLimit(3)
                .build();
                
            Optional<OverAllState> result = loopGraph.invoke(
                Map.of("counter", 0), 
                config
            );
            
            result.ifPresent(state -> {
                System.out.println("最终计数器: " + state.value("counter", Integer.class).orElse(0));
            });
            
        } catch (GraphRecursionException e) {
            System.out.println("达到递归限制: " + e.getMessage());
            
            // 可以获取达到限制时的状态
            OverAllState finalState = e.getFinalState();
            System.out.println("限制时的计数器: " + 
                finalState.value("counter", Integer.class).orElse(0));
        }
    }

    public void demonstrateGracefulTermination() {
        // 不设置递归限制，让循环自然终止
        Optional<OverAllState> result = loopGraph.invoke(Map.of("counter", 0));
        
        result.ifPresent(state -> {
            Integer finalCounter = state.value("counter", Integer.class).orElse(0);
            List<String> results = state.value("result", List.class).orElse(new ArrayList<>());
            
            System.out.println("循环完成，最终计数器: " + finalCounter);
            System.out.println("执行步骤: " + results);
        });
    }
}
```

## 复杂控制流示例

### 客户服务工作流

让我们构建一个完整的客户服务处理工作流，展示多种控制流特性的组合使用：

```java
@Configuration
public class CustomerServiceWorkflow {

    @Autowired
    private ChatClient chatClient;

    @Bean
    public CompiledGraph customerServiceGraph() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("category", KeyStrategy.REPLACE);
            strategies.put("priority", KeyStrategy.REPLACE);
            strategies.put("solution", KeyStrategy.REPLACE);
            strategies.put("satisfaction", KeyStrategy.REPLACE);
            return strategies;
        };

        // 问题分类节点
        NodeAction classifyAction = state -> {
            String input = state.value("input", String.class).orElse("");

            String classification = chatClient.prompt()
                .system("你是客服分类专家，请将客户问题分类为：technical（技术问题）、billing（账单问题）、general（一般咨询）")
                .user("客户问题：" + input)
                .call()
                .content();

            return Map.of("category", classification.toLowerCase().trim());
        };

        // 优先级评估节点
        NodeAction priorityAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String category = state.value("category", String.class).orElse("");

            String priority;
            if (input.contains("紧急") || input.contains("无法使用")) {
                priority = "high";
            } else if (category.equals("billing")) {
                priority = "medium";
            } else {
                priority = "low";
            }

            return Map.of("priority", priority);
        };

        // 技术问题处理
        NodeAction technicalAction = state -> {
            String input = state.value("input", String.class).orElse("");

            String solution = chatClient.prompt()
                .system("你是技术支持专家，请提供详细的技术解决方案")
                .user("技术问题：" + input)
                .call()
                .content();

            return Map.of("solution", "技术解决方案：" + solution);
        };

        // 账单问题处理
        NodeAction billingAction = state -> {
            String input = state.value("input", String.class).orElse("");

            String solution = chatClient.prompt()
                .system("你是账单专家，请协助解决账单相关问题")
                .user("账单问题：" + input)
                .call()
                .content();

            return Map.of("solution", "账单解决方案：" + solution);
        };

        // 一般咨询处理
        NodeAction generalAction = state -> {
            String input = state.value("input", String.class).orElse("");

            String solution = chatClient.prompt()
                .system("你是客服代表，请提供友好的帮助")
                .user("客户咨询：" + input)
                .call()
                .content();

            return Map.of("solution", "咨询回复：" + solution);
        };

        // 满意度调查
        NodeAction surveyAction = state -> {
            String solution = state.value("solution", String.class).orElse("");
            System.out.println("解决方案已提供：" + solution);
            System.out.println("请客户评价满意度...");

            return Map.of("satisfaction", "待评价");
        };

        // 路由逻辑
        EdgeAction categoryRouter = state -> {
            String category = state.value("category", String.class).orElse("general");
            return category;
        };

        // 构建完整的客服工作流
        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("classify", node_async(classifyAction))
            .addNode("priority", node_async(priorityAction))
            .addNode("technical", node_async(technicalAction))
            .addNode("billing", node_async(billingAction))
            .addNode("general", node_async(generalAction))
            .addNode("survey", node_async(surveyAction))

            .addEdge(START, "classify")
            .addEdge("classify", "priority")
            .addConditionalEdges("priority", edge_async(categoryRouter), Map.of(
                "technical", "technical",
                "billing", "billing",
                "general", "general"
            ))
            .addEdge("technical", "survey")
            .addEdge("billing", "survey")
            .addEdge("general", "survey")
            .addEdge("survey", END);

        return graph.compile();
    }
}
```

## 下一步

- 学习并行处理：[并行处理](./parallel-processing)
- 了解可视化和调试：[可视化和调试](./visualization-debugging)
- 返回高级配置：[高级配置](./advanced-config)
