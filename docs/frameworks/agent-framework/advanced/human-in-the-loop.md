---
title: 人工介入（Human-in-the-Loop）
description: 为 ReactAgent 配置条件审批，提交批准、编辑、拒绝或人工回答，并从检查点恢复执行。
keywords:
  [人工介入, HITL, Human-in-the-Loop, 工具审批, 中断恢复, Hook]
---

# 人工介入（Human-in-the-Loop）

`HumanInTheLoopHook` 在模型生成工具调用后、工具执行前检查审批策略。如果一轮中有调用需要审查，Agent 会暂停整个工具批次，返回 `InterruptionMetadata` 并保存检查点。应用可以在收到人工决策后恢复同一会话。

## 中断决策类型

| 决策 | Java 枚举 | 恢复后的行为 |
| --- | --- | --- |
| `approve` | `APPROVED` | 使用原参数执行工具。 |
| `edit` | `EDITED` | 使用 `arguments(...)` 提供的新参数执行同一个工具。参数须为合法 JSON，并符合该工具的输入要求。 |
| `reject` | `REJECTED` | 跳过该调用，将 `description(...)` 提供的拒绝理由作为工具错误结果返回给模型。 |
| `respond` | `RESPONDED` | 跳过工具回调，将 `response(...)` 提供的非空白人工回答作为工具结果返回给模型。适合澄清问题或收集用户选择。 |

默认允许批准、编辑和拒绝。使用 `ToolConfig.Builder.allowedDecisions(...)` 为工具指定可用决策。人工回答需要显式启用。

## 配置中断

将 Hook 注册到 `ReactAgent`，配置检查点保存器，并为每个会话传入稳定的 `threadId`。以下示例通过 `when(...)` 检查调用参数，只在模拟发布公告时要求审批。只有 JSON 中显式的布尔值 `"preview": true` 可以直接通过这条审批策略。

```java
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata.ToolFeedback.FeedbackResult;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.hip.HumanInTheLoopHook;
import com.alibaba.cloud.ai.graph.agent.hook.hip.ToolConfig;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.function.FunctionToolCallback;

record PublishNotice(String content, boolean preview) {}

var publishNotice = FunctionToolCallback.builder("publish_notice",
        (PublishNotice request) -> (request.preview() ? "预览 " : "模拟发布 ") + request.content())
    .description("将公告生成预览或模拟发布，preview 字段指定是否仅预览")
    .inputType(PublishNotice.class)
    .build();

var argumentsReader = new ObjectMapper().reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
var review = HumanInTheLoopHook.builder()
    .approvalOn("publish_notice", ToolConfig.builder()
        .description("请审核要发布的公告")
        .allowedDecisions(FeedbackResult.APPROVED, FeedbackResult.REJECTED)
        .when(request -> {
            String arguments = request.getArguments();
            if (arguments == null || arguments.isBlank()) {
                return true;
            }
            try {
                var preview = argumentsReader.readTree(arguments).path("preview");
                return !preview.isBoolean() || !preview.booleanValue();
            }
            catch (JsonProcessingException ex) {
                return true;
            }
        })
        .build())
    .build();

ReactAgent agent = ReactAgent.builder()
    .name("publication_agent")
    .model(chatModel)
    .tools(publishNotice)
    .hooks(review)
    .saver(new MemorySaver())
    .build();
```

省略 `when(...)` 时，这个 Hook 会审核该工具的每次调用。谓词可以通过 `ToolCallRequest` 读取调用参数、运行元数据和执行上下文。工具元数据中的 `requiresConfirmation` 也能独立触发审批。

`MemorySaver` 适合本地示例和测试。需要跨进程重启恢复时，请使用 Redis、PostgreSQL 等持久化检查点保存器。

## 响应中断

应用从 `toolFeedbacks()` 读取待审调用，为审查者展示工具名称、参数、说明和 `getAllowedDecisions()`。保存批次的 `interruptionId()` 和每个调用的 `getId()`，同一工具在一轮中可能被调用多次。

```java
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata.ToolFeedback;

var config = RunnableConfig.builder().threadId("publication-session").build();
var output = agent.invokeAndGetOutput("模拟发布公告「周五发布新版本」。", config).orElseThrow();

if (output instanceof InterruptionMetadata interruption) {
    System.out.println(interruption.interruptionId().orElseThrow());
    for (ToolFeedback request : interruption.toolFeedbacks()) {
        System.out.printf("%s %s %s %s %s%n", request.getId(), request.getName(),
            request.getArguments(), request.getDescription(), request.getAllowedDecisions());
    }
}
```

`getToolsAutomaticallyApproved()` 列出同批次中无需人工审批的调用。这些调用与审核通过的调用一起在批次恢复后执行。

### 提交批次决策

每个待审调用都需要一条明确的决策。同一批次可以混合批准、编辑、拒绝与人工回答，具体取决于每项允许的决策。以下代码假定审核者已经选择批准示例中的所有发布调用。

```java
var decisions = interruption.toolFeedbacks().stream()
    .map(request -> ToolFeedback.builder(request).result(FeedbackResult.APPROVED).build())
    .toList();

var feedback = InterruptionMetadata.builder(interruption)
    .toolFeedbacks(decisions)
    .build();
var resumeConfig = RunnableConfig.builder(config).addHumanFeedback(feedback).build();
var next = agent.invokeAndGetOutput("", resumeConfig).orElseThrow();
```

`InterruptionMetadata.builder(interruption)` 保留本次中断的 ID，`ToolFeedback.builder(request)` 保留对应的调用 ID 和工具名称。恢复使用原 `threadId` 和空输入，新一轮工具调用可能再次暂停。

若只提交了部分决策，Agent 会返回原审批批次，应用需要重新提交完整批次。重复或未知的调用 ID、与当前批次不匹配的中断 ID，以及未获允许的决策都会在工具执行前报错。使用 `config.withResume()` 可以在未提交决策时重新获取待审批次。

### 提交编辑或拒绝

在允许编辑的工具上，按调用 ID 查找审查项并提交新的 JSON 参数。拒绝时可附上理由，模型会收到该理由并继续处理任务。

```java
var edited = ToolFeedback.builder(sqlRequest)
    .result(FeedbackResult.EDITED)
    .arguments("{\"query\":\"SELECT * FROM records LIMIT 10\"}")
    .build();

var rejected = ToolFeedback.builder(deleteRequest)
    .result(FeedbackResult.REJECTED)
    .description("请先归档数据。")
    .build();
```

将编辑或拒绝决策与同批次其余调用的决策一起传给 `toolFeedbacks(decisions)`。

## 用人工回答继续执行

将 `ask_user` 配置为仅允许 `RESPONDED`。调用参数可以包含问题和选项，供应用展示。收到用户选择后，按调用 ID 把回答交给对应的工具调用。

```java
record Question(String question, List<String> options) {}

var askUser = FunctionToolCallback.builder("ask_user", (Question question) -> {
        throw new IllegalStateException("The answer must come from the user");
    })
    .description("需要用户做选择时，提交问题和选项")
    .inputType(Question.class)
    .build();

var review = HumanInTheLoopHook.builder()
    .approvalOn("ask_user", ToolConfig.builder()
        .description("请回答 Agent 的问题")
        .allowedDecisions(FeedbackResult.RESPONDED)
        .build())
    .build();
```

用 `tools(askUser)` 和 `hooks(review)` 创建 Agent。下例从应用收集的 `answersByCallId` 读取每个问题的人工回答。

```java
var answers = interruption.toolFeedbacks().stream()
    .map(request -> ToolFeedback.builder(request)
        .result(FeedbackResult.RESPONDED)
        .response(answersByCallId.get(request.getId()))
        .build())
    .toList();

var feedback = InterruptionMetadata.builder(interruption).toolFeedbacks(answers).build();
var resumeConfig = RunnableConfig.builder(config).addHumanFeedback(feedback).build();
var next = agent.invokeAndGetOutput("", resumeConfig).orElseThrow();
```

## Workflow 中嵌套 Agent 的人工中断

使用 `qaAgent.asNode(...)` 将启用了 HITL 的 Agent 加入 `StateGraph`。给嵌套 Agent 配置检查点保存器，并在外层工作流的 `CompileConfig` 中注册保存器。示例使用同一个保存器实例。

通过外层 `CompiledGraph` 启动和恢复工作流。恢复时沿用工作流的 `threadId`，传入该次中断的反馈和空输入。

```java
var output = compiledGraph.invokeAndGetOutput(Map.of("input", question), config).orElseThrow();
if (output instanceof InterruptionMetadata interruption) {
    var feedback = InterruptionMetadata.builder(interruption).toolFeedbacks(decisions).build();
    var resumeConfig = RunnableConfig.builder(config).addHumanFeedback(feedback).build();
    var next = compiledGraph.invokeAndGetOutput(Map.of(), resumeConfig).orElseThrow();
}
```

如果并行执行返回多个独立中断，读取 `pendingInterruptions()` 并针对目标中断提交决策。每次恢复都使用目标中断自己的 ID。

## 工具级审批与恢复

Spring AI 2.1 的 `@Tool(requiresConfirmation = true)` 可以声明某个工具始终需要确认。`ReactAgent` 会读取工具元数据，显式配置 `HumanInTheLoopHook` 时也会应用对应的决策限制。

框架会将审批批次及已批准的调用参数保存到检查点。使用持久化保存器时，可以在审批期间重启进程，也可以从审批完成后、工具分发前的检查点继续。恢复执行还会核对本轮允许的工具和当前注册的回调。

```java
ReactAgent agent = ReactAgent.builder()
    .name("operations")
    .model(chatModel)
    .tools(operations)
    .saver(checkpointSaver)
    .toolCallLimits(40, 150)
    .build();
```

`toolCallLimits` 的两个参数分别限制一次用户轮次内实际分发的单工具调用数和总调用数，串行与并行执行适用同一规则。被拒绝或由人工回答的调用不消耗执行预算。将参数设为 `-1` 可关闭对应限制。使用自定义 ChatClient 时，确保最终模型请求保留需要暴露的工具回调，显式空列表会禁用本次请求的工具。

## 完整示例

`HumanInTheLoopExample` 的 `main` 会依次演示条件审批、四类决策、多工具批次和嵌套工作流。请使用包含上述 HITL API 的框架源码构建示例，运行时设置 `AI_DASHSCOPE_API_KEY`。使用 2.1.0.0 发布包时，可以查阅该版本对应的示例。 [完整 Java 示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/HumanInTheLoopExample.java) · [2.1.0.0 示例](https://github.com/alibaba/spring-ai-alibaba/blob/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/HumanInTheLoopExample.java)

## 相关文档

- [Hooks](../tutorials/hooks.md)
- [记忆与检查点保存器](./memory.md)
- [Agent 基础](../tutorials/agents.md)
