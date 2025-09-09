---
title: 反思模式 (Reflect)
description: 构建能够审视、评估和修正自身工作的智能体，实现更复杂的推理和任务完成能力。
---

`ReflectAgent` 模式引入了一种强大的“反思”机制，它允许一个 Agent 在完成任务的每一步后停下来，审视自己的工作成果，并决定下一步是继续、修正还是宣布完成。这种模式模仿了人类在解决复杂问题时的“思考-行动-反思”循环，能够显著提升 Agent 在多步骤、长链条任务中的表现和准确性。

与 `ReactAgent` 不同，`ReflectAgent` 本身并不是一个直接执行任务的 Agent。它更像一个**元 Agent** 或**编排器**，负责协调两个核心组件的循环协作：

1.  **执行器 (Executor)**: 一个负责执行具体任务的 Agent（通常是一个 `ReactAgent` 实例）。它接收指令，进行思考、调用工具，并产出初步的结果。
2.  **反思器 (Reflector)**: 一个负责评估执行器工作的 Agent。它会审视执行器的输出，判断结果是否满足要求、是否存在错误，并生成“反思”或“反馈”，指导执行器进行下一步操作。

这个“执行-反思”的循环会持续进行，直到反思器认为任务已圆满完成，或达到预设的最大迭代次数。

## `ReflectAgent` 的核心优势

-   **自我修正**: 当执行器产生的结果不理想时，反思器可以识别问题并指导其进行修正，而不是直接返回一个错误的结果。
-   **复杂推理**: 对于需要多步骤规划和迭代的任务（如编写和调试代码、撰写长篇报告），反思模式能够将复杂问题分解，逐步优化，最终得到更高质量的输出。
-   **鲁棒性**: 通过持续的反馈循环，可以有效减少错误的累积，提升整个任务流程的稳定性和成功率。

## 如何构建一个 `ReflectAgent`

构建一个 `ReflectAgent` 的关键在于定义好“执行器”和“反思器”。

### 1. 定义执行器 Agent

执行器通常是一个配置了相关工具的 `ReactAgent`。它的任务是完成具体的工作。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class ExecutorConfiguration {

    @Bean
    public ReactAgent executorAgent(ChatClient.Builder builder) throws GraphStateException {
        // 假设这是一个可以写代码和运行代码的工具
        CodeExecutionTool codeTool = new CodeExecutionTool();
        
        return ReactAgent.builder()
                .name("CodeExecutorAgent")
                .chatClient(builder.build())
                .tools(List.of(codeTool))
                .instruction("你是一个初级程序员，负责根据需求编写并执行代码。尽你最大的努力完成任务。")
                .build();
    }
}
```

### 2. 定义反思器 Agent

反思器是一个更简单的 Agent，它不执行工具调用，只负责评估。通常，我们会使用一个 `LlmNode` 来实现，它会接收执行器的输出，并根据一个特定的提示词（Prompt）给出评估意见。

```java
import com.alibaba.cloud.ai.graph.node.LlmNode;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReflectorConfiguration {

    @Bean
    public LlmNode reflectorAgent(ChatClient.Builder builder) {
        // 反思器的提示词，用于指导它如何评估工作
        String reflectorPrompt = """
            你是一名资深的代码评审专家。
            你将收到一段包含了代码执行结果的对话历史。
            你的任务是：
            1. 检查代码是否正确实现了用户需求。
            2. 检查代码执行结果是否成功，有无错误。
            3. 如果代码有误或结果不符合预期，请提出具体的修改意见。
            4. 如果任务已成功完成，请在最后明确地说"任务完成"。
            
            这是当前的对话历史：
            {messages}
            """;
        
        return LlmNode.builder()
                .chatClient(builder.build())
                .systemPromptTemplate(reflectorPrompt)
                .messagesKey("messages")
                .outputKey("messages")
                .build();
    }
}
```

### 3. 组装 `ReflectAgent`

最后，我们将执行器和反思器组装成一个 `ReflectAgent`。

```java
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.ReflectAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.node.LlmNode;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ReflectionService {

    private final CompiledGraph reflectionGraph;

    public ReflectionService(ReactAgent executorAgent, LlmNode reflectorAgent) throws GraphStateException {
        // 将 Agent 转换为 StateGraph 可执行的 NodeAction
        NodeAction executorNode = executorAgent.asNodeAction();
        NodeAction reflectorNode = reflectorAgent;

        // 构建 ReflectAgent
        ReflectAgent reflectAgent = ReflectAgent.builder()
                .graph(executorNode)
                .reflection(reflectorNode)
                .maxIterations(5) // 设置最大反思循环次数
                .build();

        // 编译最终的图
        this.reflectionGraph = reflectAgent.getAndCompileGraph();
    }

    public String executeWithReflection(String query) {
        OverAllState finalState = this.reflectionGraph.invoke(Map.of("messages", query))
                .orElseThrow();
        
        // 从最终状态中提取最后一轮对话的结果
        List<Message> messages = finalState.value("messages", List.class).orElse(Collections.emptyList());
        return messages.isEmpty() ? "No result." : messages.get(messages.size() - 1).getContent();
    }
}
```

现在，当调用 `reflectionService.executeWithReflection("用 Python 写一个函数，计算 1 到 100 的和并打印结果。")` 时：
1.  **第一次执行**: `executorAgent`（初级程序员）可能会写出代码并执行，但可能会犯一些小错误。
2.  **第一次反思**: `reflectorAgent`（代码评审专家）会收到执行结果，发现错误，并给出修改意见，例如“代码逻辑正确，但你没有打印结果，请加上 `print` 语句”。
3.  **第二次执行**: `executorAgent` 接收到修改意见，修正代码，重新执行。
4.  **第二次反思**: `reflectorAgent` 检查新的结果，发现一切正常，于是回复“任务完成”。
5.  循环结束，`ReflectAgent` 返回最终的、经过修正的正确结果。
