---
title: 人机交互模式 (Human-in-the-Loop)
description: 学习如何使用 ReactAgentWithHuman 和底层的中断恢复机制，构建需要人类审批、反馈和协作的智能 Agent。
---

虽然 Agent 的目标是自动化，但在许多关键场景下，引入人类智慧和决策是不可或缺的。例如：
-   **危险操作确认**: 在执行发送邮件、删除数据、调用付费 API 等敏感操作前，需要得到用户的明确批准。
-   **模糊指令澄清**: 当用户的指令不明确时，Agent 可以暂停并请求用户提供更多信息。
-   **结果修正与迭代**: Agent 生成初步结果后，可以交由人类审核和修正，然后继续下一步。

SAA 提供了强大的**人机交互 (Human-in-the-Loop)** 功能，让您能够轻松地在 Agent 的工作流中设置“暂停点”，等待人类的输入，然后再从暂停点继续执行。

**技术基础**: 人机交互模式底层依赖于 SAA Graph 的**[持久化与恢复](../advanced/persistence)**能力。在学习本章前，请确保您已了解该机制，并为您的图配置了 `Checkpointer`。

## 高层 API: `ReactAgentWithHuman`

对于大多数人机交互场景，SAA 提供了 `ReactAgentWithHuman` 这一便捷的高层 API。它继承自 `ReactAgent`，并额外增加了在特定条件下中断以等待人类反馈的能力。其核心思想是在 ReAct 的“思考-行动”循环中加入一个“中断检查”步骤。

### 核心示例：危险工具调用审批

我们将构建一个场景：Agent 被要求发送一封邮件。在真正调用“发送邮件”这个“危险”工具前，它必须暂停并等待用户的批准。

#### 1. 定义中断条件 (`shouldInterruptFunction`)

这是实现人机交互最关键的一步。我们需要定义一个函数，它会在 `ReactAgent` 的每个内部循环之后被调用，以判断当前是否应该中断。这个函数接收当前的 `OverAllState` 作为输入，返回一个 `Boolean` 值。

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;

public class InterruptConditions {

    /**
     * 定义一个中断条件：当 Agent 的最新一条思考结果 (AssistantMessage)
     * 包含对名为 "sendEmail" 的工具调用时，就应该中断。
     */
    public static Function<OverAllState, Boolean> needsEmailConfirmation() {
        return (state) -> state.value("messages", List.class)
                .map(messages -> (List<Message>) messages)
                .flatMap(messages -> messages.isEmpty() ? Optional.empty() : Optional.of(messages.get(messages.size() - 1)))
                .filter(lastMessage -> lastMessage instanceof AssistantMessage)
                .map(lastMessage -> (AssistantMessage) lastMessage)
                .map(assistantMessage -> assistantMessage.getToolCalls().stream()
                        .anyMatch(toolCall -> "sendEmail".equals(toolCall.getName())))
                .orElse(false);
    }
}
```

#### 2. 构建 Agent 并管理交互流程

与标准的 `ReactAgent` 不同, `ReactAgentWithHuman` 本身不直接用于调用，它更像一个预置了人机交互逻辑的“图构建器”。我们需要先构建它，然后编译成一个可执行的 `CompiledGraph` 来管理整个交互流程。

以下是一个完整的、可运行的示例：

```java
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.agent.ReactAgentWithHuman;
import com.alibaba.cloud.ai.graph.checkpoint.StateSnapshot;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.consts.SaverConstant;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import org.springframework.ai.chat.messages.UserMessage;
// ... (此处省略部分 import，包括 ChatClient, Tool 等的模拟类)

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Scanner;

public class HumanInteractionExample {

    public static void main(String[] args) throws Exception {
        // --- 准备工作：模拟所需的组件 ---
        // (在真实 Spring 项目中，这些组件会通过 @Bean 注入)
        var chatClient = mockChatClient(); // 模拟的 ChatClient
        var sendEmailTool = mockSendEmailTool(); // 模拟的邮件工具
        
        // --- 1. 配置持久化 ---
        // 人机交互必须依赖持久化来保存中断时的状态
        SaverConfig saverConfig = SaverConfig.builder()
            .register(SaverConstant.MEMORY, new MemorySaver()).type(SaverConstant.MEMORY).build();
        CompileConfig compileConfig = CompileConfig.builder().saverConfig(saverConfig).build();

        // --- 2. 构建 ReactAgentWithHuman ---
        ReactAgentWithHuman humanConfirmAgent = ReactAgentWithHuman.builder()
            .name("HumanConfirmAgent")
            .chatClient(chatClient)
            .tools(List.of(sendEmailTool))
            .compileConfig(compileConfig) // ✨ 关键：提供包含 Checkpointer 的编译配置
            .shouldInterruptFunction(InterruptConditions.needsEmailConfirmation()) // ✨ 关键：设置中断条件
            .build();

        // --- 3. 编译得到可执行的图 ---
        CompiledGraph compiledGraph = humanConfirmAgent.getAndCompileGraph();

        // --- 4. 开始交互流程 ---
        String threadId = "email-approval-flow-1";
        RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();
        
        // 步骤 A: 用户发起请求，触发中断
        System.out.println("USER: '帮我给 a@b.com 发邮件，内容是 C。'");
        Optional<OverAllState> firstResult = compiledGraph.invoke(
            Map.of("messages", List.of(new UserMessage("帮我给 a@b.com 发邮件，内容是 C。"))),
            config
        );

        System.out.println("\nAGENT: 流程已暂停。我准备调用 sendEmail 工具，需要您的批准。");
        System.out.println("流程是否已结束: " + firstResult.isPresent()); // false, 因为中断了

        // 步骤 B: 等待人类决策
        System.out.print("USER (You): 是否批准? (yes/no): ");
        String humanInput = new Scanner(System.in).nextLine();

        // 步骤 C: 根据人类输入恢复或终止流程
        if ("yes".equalsIgnoreCase(humanInput)) {
            System.out.println("\nUSER: '好的，继续。'");
            
            // ✨ 关键：再次调用 invoke，使用相同的 threadId，即可自动从上次中断的位置恢复
            Optional<OverAllState> finalResult = compiledGraph.invoke(Map.of(), config);
            
            System.out.println("\nAGENT: 流程已恢复并执行完毕。");
            System.out.println("流程是否已结束: " + finalResult.isPresent());
            finalResult.ifPresent(state -> System.out.println("最终结果: " + state.value("messages").orElse("")));

        } else {
            System.out.println("USER: '操作已取消。'");
        }
    }
    // ... mockChatClient() 和 mockSendEmailTool() 的模拟实现 ...
}
```

### 核心要点
-   **`ReactAgentWithHuman` 是构建器**: 它用于定义和配置一个具备人机交互能力的图，而不是直接调用。
-   **必须配置持久化**: 人机交互的“暂停”和“继续”能力依赖于检查点机制，因此必须在 `CompileConfig` 中提供 `SaverConfig`。
-   **执行依赖 `CompiledGraph`**: 真正的执行、中断和恢复都通过编译后的 `CompiledGraph` 对象来完成。
-   **恢复是自动的**: 只要使用相同的 `threadId` 再次调用 `invoke`，工作流就会自动从上一个中断点加载状态并继续执行。

## 高级用法：直接使用 `HumanNode`

`ReactAgentWithHuman` 是一个高层封装。如果您想在自定义的 `StateGraph` 工作流中实现更灵活的人机交互，可以直接使用底层的 `HumanNode`。

`HumanNode` 支持多种中断策略，并能自定义接收到人类反馈后的状态更新逻辑。

```java
import com.alibaba.cloud.ai.graph.node.HumanNode;

// ...
// 示例：一个只有在输入内容过长时才需要人类审批的节点
HumanNode conditionalApprovalNode = new HumanNode(
    "conditioned", // 中断策略：条件中断
    (state) -> { // 中断条件判断
        String content = state.value("content", String.class).orElse("");
        return content.length() > 500; // 内容超过500字符时中断
    },
    (state) -> { // 状态更新逻辑
        // 从 state.humanFeedback() 获取人类输入，并更新到状态中
        OverAllState.HumanFeedback feedback = state.humanFeedback();
        if (feedback != null) {
            boolean approved = (Boolean) feedback.data().getOrDefault("approved", false);
            return Map.of("approval_status", approved ? "人工批准" : "人工拒绝");
        }
        return Map.of();
    }
);

// 在 StateGraph 中添加这个节点
stateGraph.addNode("human_check", conditionalApprovalNode);
// ...
```
这种方式提供了最大的灵活性，让您可以将人机交互逻辑无缝集成到任何复杂的业务流程图中。关于 `HumanNode` 的更多生产级用法，可以参考如何在 Web 应用中实现人机交互的 API。
