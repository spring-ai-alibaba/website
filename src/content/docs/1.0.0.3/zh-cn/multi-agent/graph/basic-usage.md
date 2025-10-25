---
title: "基础用法"
description: "学习 Spring AI Alibaba Graph 的基础用法，包括状态定义、基本图构建和简单示例。"
---

本文档介绍 Spring AI Alibaba Graph 的基础用法，包括状态定义、基本图构建和简单示例。

## 定义和更新状态

在开始构建图之前，我们需要理解如何定义和更新状态。状态是图中所有节点共享的数据结构，它定义了图的模式并控制数据如何在节点间传递。

### 定义状态

Spring AI Alibaba Graph 中的状态可以是任何 Java 类，但通常我们使用 Map 或自定义的 Java 类。状态决定了图的输入和输出模式。

让我们从一个包含消息的简单示例开始：

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import org.springframework.ai.chat.messages.Message;

// 定义状态策略
KeyStrategyFactory messageStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", KeyStrategy.APPEND);  // 消息使用追加策略
    strategies.put("extra_field", KeyStrategy.REPLACE);  // 其他字段使用替换策略
    return strategies;
};
```

这个状态跟踪消息对象列表以及一个额外的整数字段。

### 更新状态

让我们构建一个包含单个节点的示例图。节点是一个 Java 函数，它读取图的状态并对其进行更新：

```java
import org.springframework.ai.chat.messages.AssistantMessage;

NodeAction simpleNode = state -> {
    List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
    AssistantMessage newMessage = new AssistantMessage("Hello!");
    
    // 返回状态更新
    List<Message> updatedMessages = new ArrayList<>(messages);
    updatedMessages.add(newMessage);
    
    return Map.of(
        "messages", updatedMessages,
        "extra_field", 10
    );
};
```

> **重要提示**：节点应该返回状态的更新，而不是直接修改状态。

让我们定义一个包含此节点的简单图：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import static com.alibaba.cloud.ai.graph.StateGraph.*;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

StateGraph graph = new StateGraph(messageStateFactory)
    .addNode("simple_node", node_async(simpleNode))
    .addEdge(START, "simple_node")
    .addEdge("simple_node", END);

CompiledGraph compiledGraph = graph.compile();
```

现在我们可以调用这个图：

```java
import org.springframework.ai.chat.messages.UserMessage;

Map<String, Object> input = Map.of(
    "messages", List.of(new UserMessage("Hi"))
);

Optional<OverAllState> result = compiledGraph.invoke(input);
result.ifPresent(state -> {
    List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
    messages.forEach(message -> System.out.println(message.getContent()));
});
```

### 使用 Reducers 处理状态更新

#### 什么是 Reducer？

在 Spring AI Alibaba Graph 中，**Reducer** 是一种状态更新策略，它决定了当节点返回新值时，如何将这些新值与现有状态进行合并。可以把它理解为"状态合并规则"。

#### 为什么需要 Reducer？

考虑一个聊天场景：
- 状态中有一个 `messages` 列表，包含对话历史
- 每个节点都可能添加新的消息
- 我们希望新消息**追加**到现有列表，而不是**替换**整个列表

#### 默认行为 vs Reducer 行为

**没有 Reducer 的情况（默认覆盖行为）：**

```java
// 假设当前状态：messages = [消息1, 消息2]
NodeAction nodeWithoutReducer = state -> {
    List<Message> currentMessages = state.value("messages", List.class).orElse(new ArrayList<>());

    // 手动处理追加逻辑
    List<Message> updatedMessages = new ArrayList<>(currentMessages);
    updatedMessages.add(new AssistantMessage("新消息"));

    return Map.of(
        "messages", updatedMessages  // 必须返回完整的列表
    );
};
// 结果：messages = [消息1, 消息2, 新消息]
```

**使用 Reducer 的情况（自动追加行为）：**

```java
// 1. 首先配置 Reducer 策略
KeyStrategyFactory reducerStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", KeyStrategy.APPEND);     // 自动追加新消息
    strategies.put("user_name", KeyStrategy.REPLACE);   // 替换用户名
    strategies.put("counters", KeyStrategy.MERGE);      // 合并计数器对象
    return strategies;
};

// 2. 节点代码大大简化
NodeAction nodeWithReducer = state -> {
    AssistantMessage newMessage = new AssistantMessage("新消息");

    return Map.of(
        "messages", List.of(newMessage),  // 只需返回新消息，框架自动追加
        "user_name", "Alice"              // 直接替换
    );
};
// 结果：messages = [消息1, 消息2, 新消息]（自动追加）
```

#### 可用的 KeyStrategy 类型

Spring AI Alibaba 提供了几种内置的状态更新策略：

```java
KeyStrategyFactory strategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // 1. APPEND - 追加到列表末尾
    strategies.put("messages", KeyStrategy.APPEND);

    // 2. REPLACE - 完全替换（默认行为）
    strategies.put("current_user", KeyStrategy.REPLACE);

    // 3. MERGE - 合并对象/Map
    strategies.put("metadata", KeyStrategy.MERGE);

    return strategies;
};
```

#### 实际应用示例

让我们看一个完整的聊天机器人示例：

```java
@Component
public class ChatBotExample {

    // 配置状态更新策略
    @Bean
    public KeyStrategyFactory chatKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("messages", KeyStrategy.APPEND);      // 消息追加
            strategies.put("user_info", KeyStrategy.MERGE);      // 用户信息合并
            strategies.put("current_topic", KeyStrategy.REPLACE); // 当前话题替换
            return strategies;
        };
    }

    // 用户输入节点
    NodeAction userInputNode = state -> {
        String userInput = (String) state.value("user_input").orElse("");
        UserMessage userMessage = new UserMessage(userInput);

        return Map.of(
            "messages", List.of(userMessage),  // 自动追加到消息列表
            "current_topic", extractTopic(userInput)  // 替换当前话题
        );
    };

    // AI 回复节点
    NodeAction aiResponseNode = state -> {
        List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
        String response = generateResponse(messages);
        AssistantMessage aiMessage = new AssistantMessage(response);

        return Map.of(
            "messages", List.of(aiMessage),  // 自动追加 AI 回复
            "user_info", Map.of(            // 合并用户信息
                "last_interaction", Instant.now(),
                "message_count", 1
            )
        );
    };

    private String extractTopic(String input) {
        // 简单的话题提取逻辑
        return input.length() > 10 ? "详细讨论" : "简单问答";
    }

    private String generateResponse(List<Message> messages) {
        // 简单的回复生成逻辑
        return "我理解了您的问题，让我来回答...";
    }
}
```

#### 关键优势

使用 Reducer 的主要优势：

1. **代码简化**：节点不需要手动处理状态合并逻辑
2. **一致性**：所有节点使用相同的状态更新规则
3. **可维护性**：状态更新逻辑集中管理
4. **错误减少**：避免手动合并时的常见错误

#### 注意事项

- 每个状态键只能有一个 KeyStrategy
- 如果没有指定 KeyStrategy，默认使用 REPLACE 行为
- APPEND 策略要求返回的值是 List 类型
- MERGE 策略要求返回的值是 Map 类型

### 状态字段规划

在构建复杂的图时，合理规划状态字段非常重要。建议按照功能和生命周期对状态字段进行分类：

```java
KeyStrategyFactory wellStructuredStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // 输入层：原始输入数据
    strategies.put("user_input", KeyStrategy.REPLACE);      // 用户输入
    strategies.put("session_id", KeyStrategy.REPLACE);      // 会话ID
    strategies.put("request_time", KeyStrategy.REPLACE);    // 请求时间

    // 处理层：中间处理结果
    strategies.put("processed_input", KeyStrategy.REPLACE); // 处理后的输入
    strategies.put("analysis_results", KeyStrategy.MERGE);  // 分析结果（可合并）
    strategies.put("intermediate_data", KeyStrategy.REPLACE); // 中间数据

    // 输出层：最终结果
    strategies.put("final_answer", KeyStrategy.REPLACE);    // 最终答案
    strategies.put("confidence_score", KeyStrategy.REPLACE); // 置信度分数
    strategies.put("response_metadata", KeyStrategy.MERGE); // 响应元数据

    // 日志层：执行日志和调试信息
    strategies.put("execution_log", KeyStrategy.APPEND);    // 执行日志
    strategies.put("performance_metrics", KeyStrategy.APPEND); // 性能指标

    return strategies;
};
```

### 完整的问答系统示例

下面是一个完整的问答系统示例，展示了如何合理组织状态字段：

```java
@Component
public class QuestionAnswerSystem {

    @Autowired
    private ChatClient chatClient;

    @Bean
    public KeyStrategyFactory qaStateFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("question", KeyStrategy.REPLACE);
            strategies.put("processed_question", KeyStrategy.REPLACE);
            strategies.put("answer", KeyStrategy.REPLACE);
            strategies.put("confidence", KeyStrategy.REPLACE);
            strategies.put("processing_steps", KeyStrategy.APPEND);
            return strategies;
        };
    }

    // 步骤1：预处理问题
    NodeAction preprocessQuestionNode = state -> {
        String question = (String) state.value("question").orElse("");
        String processedQuestion = question.trim().toLowerCase();

        return Map.of(
            "processed_question", processedQuestion,
            "processing_steps", "问题预处理完成"
        );
    };

    // 步骤2：生成答案
    NodeAction generateAnswerNode = state -> {
        String processedQuestion = (String) state.value("processed_question").orElse("");

        String answer = chatClient.prompt()
            .user("请回答以下问题：" + processedQuestion)
            .call()
            .content();

        // 简单的置信度计算
        double confidence = Math.min(0.9, answer.length() / 100.0);

        return Map.of(
            "answer", answer,
            "confidence", confidence,
            "processing_steps", "答案生成完成"
        );
    };

    @Bean
    public CompiledGraph qaWorkflow() {
        StateGraph graph = new StateGraph(qaStateFactory())
            .addNode("preprocess", node_async(preprocessQuestionNode))
            .addNode("generate_answer", node_async(generateAnswerNode))

            .addEdge(START, "preprocess")
            .addEdge("preprocess", "generate_answer")
            .addEdge("generate_answer", END);

        return graph.compile();
    }
}
```

### 使用问答系统

```java
@Service
public class QAService {

    @Autowired
    private CompiledGraph qaWorkflow;

    public QAResult askQuestion(String question) {
        Map<String, Object> initialState = Map.of("question", question);

        Optional<OverAllState> result = qaWorkflow.invoke(initialState);

        if (result.isPresent()) {
            OverAllState state = result.get();

            String answer = state.value("answer", String.class).orElse("无法生成答案");
            Double confidence = state.value("confidence", Double.class).orElse(0.0);
            List<String> steps = state.value("processing_steps", List.class).orElse(new ArrayList<>());

            return new QAResult(answer, confidence, steps);
        }

        return new QAResult("处理失败", 0.0, List.of("执行失败"));
    }

    // 结果类
    public static class QAResult {
        private final String answer;
        private final double confidence;
        private final List<String> processingSteps;

        public QAResult(String answer, double confidence, List<String> processingSteps) {
            this.answer = answer;
            this.confidence = confidence;
            this.processingSteps = processingSteps;
        }

        // getters...
        public String getAnswer() { return answer; }
        public double getConfidence() { return confidence; }
        public List<String> getProcessingSteps() { return processingSteps; }
    }
}
```

## 创建简单的线性图

线性图是最基础的图结构，节点按照固定的顺序依次执行。这种模式适用于：

- **数据处理管道**：数据需要经过多个步骤的转换和处理
- **工作流程**：业务流程有明确的先后顺序
- **验证链**：需要通过多个验证步骤的场景

让我们从最简单的例子开始 - 一个包含三个顺序执行节点的图：

```java
import com.alibaba.cloud.ai.graph.*;
import com.alibaba.cloud.ai.graph.action.*;
import static com.alibaba.cloud.ai.graph.StateGraph.*;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

@Configuration
public class LinearGraphExample {

    @Bean
    public CompiledGraph linearWorkflow() throws GraphStateException {
        // 定义状态策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("step1_result", KeyStrategy.REPLACE);
            strategies.put("step2_result", KeyStrategy.REPLACE);
            strategies.put("final_result", KeyStrategy.REPLACE);
            return strategies;
        };

        // 定义节点动作
        NodeAction step1Action = state -> {
            String input = state.value("input", String.class).orElse("");
            String result = "步骤1处理: " + input;
            System.out.println("执行步骤1: " + result);
            return Map.of("step1_result", result);
        };

        NodeAction step2Action = state -> {
            String step1Result = state.value("step1_result", String.class).orElse("");
            String result = "步骤2处理: " + step1Result;
            System.out.println("执行步骤2: " + result);
            return Map.of("step2_result", result);
        };

        NodeAction step3Action = state -> {
            String step2Result = state.value("step2_result", String.class).orElse("");
            String result = "步骤3处理: " + step2Result;
            System.out.println("执行步骤3: " + result);
            return Map.of("final_result", result);
        };

        // 构建线性图
        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("step1", node_async(step1Action))
            .addNode("step2", node_async(step2Action))
            .addNode("step3", node_async(step3Action))

            .addEdge(START, "step1")
            .addEdge("step1", "step2")
            .addEdge("step2", "step3")
            .addEdge("step3", END);

        return graph.compile();
    }
}
```

运行这个图：

```java
@Service
public class GraphService {

    @Autowired
    private CompiledGraph linearWorkflow;

    public String processLinear(String input) throws GraphRunnerException {
        Optional<OverAllState> result = linearWorkflow.invoke(Map.of("input", input));
        return result.map(state ->
            state.value("final_result", String.class).orElse("无结果")
        ).orElse("执行失败");
    }
}
```

## 构建 AI 对话系统：在图状态中使用消息

在前面的示例中，我们学习了如何使用基本的状态字段（如字符串、数字）来构建图。但在实际的 AI 应用中，我们经常需要构建**对话系统**，这就需要处理对话历史记录。

### 从简单状态到对话状态的演进

让我们回顾一下之前的问答系统示例。在那个例子中，我们只处理单轮问答：

```java
// 之前的简单问答：每次都是独立的问答，没有上下文
NodeAction simpleQANode = state -> {
    String question = (String) state.value("question").orElse("");
    String answer = chatClient.prompt()
        .user(question)  // 只发送当前问题，没有历史上下文
        .call()
        .content();

    return Map.of("answer", answer);
};
```

但在真实的 AI 应用中，我们通常需要**多轮对话**，AI 需要记住之前的对话内容：

```java
// 用户：你好，我叫张三
// AI：你好张三！很高兴认识你。
// 用户：我刚才说我叫什么名字？
// AI：你刚才说你叫张三。  <-- 这需要记住之前的对话
```

### 什么是 LLM 对话消息？

> **重要说明**：这里的"消息"指的是 **LLM 对话消息**（如 `UserMessage`、`AssistantMessage`），而不是异步消息队列（如 RabbitMQ、RocketMQ、Kafka 等）中的消息。两者是完全不同的概念。

为了实现多轮对话，我们需要使用 Spring AI 提供的对话消息类：

- **`UserMessage`**：表示用户的输入消息
- **`AssistantMessage`**：表示 AI 助手的回复消息
- **`SystemMessage`**：表示系统指令消息（如角色设定）

这些消息对象构成了对话的历史记录，LLM 可以基于这些历史来生成更准确的回复。

### 为什么需要在图状态中存储对话消息？

1. **保持对话上下文**：AI 需要记住之前说过的话
2. **支持多轮交互**：用户可以基于之前的对话继续提问
3. **提高回复质量**：有了上下文，AI 的回复更加准确和相关
4. **符合 LLM API 规范**：大多数 LLM 提供商的 API 都接受消息列表作为输入

### 在图中使用对话消息

现在我们知道了为什么需要对话消息，让我们看看如何在图状态中实现它。关键是要在状态中添加一个 `messages` 字段来存储对话历史，并使用 `APPEND` 策略来累积对话记录。

#### 步骤1：升级状态策略以支持对话消息

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
// 注意：这里导入的是 Spring AI 的对话消息类，不是消息队列的消息
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;

// 对比：之前的简单状态策略
KeyStrategyFactory simpleStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("question", KeyStrategy.REPLACE);  // 只有当前问题
    strategies.put("answer", KeyStrategy.REPLACE);    // 只有当前答案
    return strategies;
};

// 升级：支持对话历史的状态策略
KeyStrategyFactory conversationStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // 基础数据使用替换策略
    strategies.put("current_input", KeyStrategy.REPLACE);
    strategies.put("user_id", KeyStrategy.REPLACE);
    strategies.put("session_id", KeyStrategy.REPLACE);

    // 关键改进：添加对话消息历史
    // messages 字段存储 UserMessage、AssistantMessage 等对话消息对象
    strategies.put("messages", KeyStrategy.APPEND);  // 使用 APPEND 累积对话历史

    // 其他辅助数据
    strategies.put("conversation_metadata", KeyStrategy.MERGE);

    return strategies;
};
```

#### 步骤2：实现支持对话历史的节点

```java
// 对比：之前的简单问答节点（无历史记录）
NodeAction simpleQANode = state -> {
    String question = (String) state.value("question").orElse("");

    // 只发送当前问题，没有上下文
    String answer = chatClient.prompt()
        .user(question)
        .call()
        .content();

    return Map.of("answer", answer);
};

// 升级：支持对话历史的节点
NodeAction conversationNode = state -> {
    // 1. 读取现有的对话消息历史（不是消息队列中的消息）
    List<Message> conversationHistory = state.value("messages", List.class).orElse(new ArrayList<>());
    String currentInput = state.value("current_input", String.class).orElse("");

    // 2. 创建用户当前输入的消息对象
    UserMessage userMessage = new UserMessage(currentInput);

    // 3. 调用 LLM，关键：传入完整的对话历史
    String response = chatClient.prompt()
        .messages(conversationHistory)  // 传入历史对话，让 AI 有上下文
        .user(currentInput)             // 加上当前用户输入
        .call()
        .content();

    // 4. 创建 AI 助手的回复消息对象
    AssistantMessage assistantMessage = new AssistantMessage(response);

    // 5. 返回状态更新：新的对话消息会被追加到历史记录中
    return Map.of(
        "messages", List.of(userMessage, assistantMessage),  // 这两条消息会被追加
        "last_response", response,
        "conversation_metadata", Map.of(
            "last_interaction_time", Instant.now(),
            "message_count", conversationHistory.size() + 2
        )
    );
};
```

## 下一步

- 学习高级配置：[高级配置](./advanced-config)
- 了解控制流：[控制流](./control-flow)
- 返回总览：[概览](./overview)
