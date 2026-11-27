---
title: 模型
description: 使用 Spring AI 2.1 ChatModel、ChatClient、模型选项、流式响应和 DecisionModel 构建智能体。
keywords: [ChatModel, ChatClient, ChatOptions, DecisionModel, DashScope, Spring AI]
---

# 模型

Spring AI 用 `Model<Request, Response>` 表达一次模型调用。聊天模型接收 `Prompt` 并返回 `ChatResponse`，决策、嵌入和多模态模型各有对应的输入、结果和选项。使用 Spring AI Alibaba 2.1.x 时，通过 [BOM](/docs/versions) 对齐 Spring AI 2.1.0 和 Extensions。

| 接口 | 适合的场景 |
| --- | --- |
| `ChatModel` | 直接控制传给模型的消息、提供商选项和同步或流式结果 |
| `ChatClient` | 使用模板、Advisor、会话历史、工具循环和结构化结果 |
| `ReactAgent` | 在 Graph 中运行模型、工具与 Hooks，管理 Agent 状态和 checkpoint |
| `DecisionModel` | 获取有类型的判断、选择或评分及其概率 |

[Spring AI Chat Model](https://docs.spring.io/spring-ai/reference/api/chatmodel.html) · [ChatClient](https://docs.spring.io/spring-ai/reference/api/chatclient.html)

## 配置模型

使用 DashScope 时，在 BOM 下引入 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`。Starter 在 Spring Boot 应用中提供模型和 `ChatClient.Builder`。优先用配置绑定凭证和默认选项，并通过构造器注入 Builder。

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus
        temperature: 0.5
```

[DashScope HTTP 与 SDK 选项](/integration/chatmodels/dashScope) · [其他提供商](/integration/chatmodels/comparison)

## Prompt、选项与请求覆盖

`Prompt` 由有序的 [消息](messages.md) 和可选的 `ChatOptions` 构成。直接调用模型时，非空的请求选项作为该次调用的实际配置，按提供商类型构建。需要在已有配置上改动时，从模型的 `getOptions()` 取得选项，并用不可变对象的 `mutate()` 构建变体。

```java
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

var options = DashScopeChatOptions.builder()
    .model("qwen-plus")
    .temperature(0.3)
    .build();

var response = chatModel.call(new Prompt(
    List.of(new SystemMessage("Answer concisely"), new UserMessage("What is Spring AI?")),
    options));
```

用 ChatClient 的 `.options(...)` 或 `.defaultOptions(...)` 时传入 **选项 Builder**。客户端将显式设置的值与模型默认选项合并，并在运行 Advisor 前准备请求。选项实例不再通过 Setter 改写。

```java
var response = chatClient.prompt("What is Spring AI?")
    .options(DashScopeChatOptions.builder().temperature(0.2))
    .call()
    .chatResponse();
```

常见迁移包括 `getDefaultOptions()` 改为 `getOptions()`、带 `.options` 的旧配置项迁移到模型属性层，以及将旧的模型内部工具开关迁移到 [工具 Advisor](tools.md)。

## 读取响应、结束状态和用量

`ChatResponse.getResults()` 返回生成结果集合。每个 `Generation` 包含 `AssistantMessage` 和该结果的元数据。响应级元数据包含提供商响应标识和 `Usage`。如果需要判断未生成内容、工具请求、过滤和截断等状态，读取完整响应。

```java
import org.springframework.ai.chat.model.GuardrailRefusal;

if (GuardrailRefusal.isRefusal(response)) {
    // Handle the returned refusal as an application outcome.
    String explanation = GuardrailRefusal.text(response);
}
else if (response.getResult() != null) {
    var metadata = response.getResult().getMetadata();
    var category = metadata.getFinishReasonCategory();
    var rawReason = metadata.getFinishReason();
    var usage = response.getMetadata().getUsage();
}
```

归一化 `FinishReasonCategory` 适合跨提供商判断。原始值适合诊断或特定提供商分支。模型拒答和格式校验失败应进入不同的处理逻辑，否则会对已被拒绝的请求重复重试。Token 用量按提供商口径读取，工具循环返回汇总用量时避免把各轮或各流式片段再次累加。

## 流式输出与多轮请求

```java
// Text-only UI.
Flux<String> text = chatClient.prompt("Summarize the topic").stream().content();

// Full events, including tool calls and usage.
Flux<ChatResponse> events = chatClient.prompt("Summarize the topic")
    .stream()
    .chatResponse();
```

应用只在实际需要的一条流上发起请求。使用 `ChatModel.stream(Prompt)` 时，分片可以携带部分消息块或只有元数据。需要完整消息和最终用量时，聚合这条流，详见 [消息与流式聚合](messages.md#流式参数与聚合)。对话历史由应用或 [Session Memory](memory.md) 提供。多轮调用要保留系统消息、用户消息、助手内容与对应的工具结果。

Spring AI 2.1 的 OpenAI starter 可通过 `spring.ai.openai.chat.api=responses` 选择 Responses API。接入支持的提供商和模型后，可使用其托管工具和加密推理回放。应用应保留原始 Message Parts。详见 [OpenAI Responses](/integration/chatmodels/openai-chat#responses-api)。

## 使用 DecisionModel 分类和路由

判断使用 `YesNoQuestion`，分类使用 `ChoiceQuestion`，评分使用 `ScoreQuestion`。同一 `DecisionPrompt` 可以提交多个具名问题。通过问题键取回有类型的答案，应用按配置的提供商、概率和拒答处理规则作出业务决策。

```java
import org.springframework.ai.decision.DecisionPrompt;
import org.springframework.ai.decision.question.ChoiceQuestion;

var route = ChoiceQuestion.builder()
    .text("Which team should handle the request?")
    .option("billing", "Invoices, charges and refunds")
    .option("support", "Technical issues")
    .build();

var decision = decisionModel.call(DecisionPrompt.builder()
    .text("Where is my invoice?")
    .question("route", route)
    .build());

if (!decision.isRefused("route")) {
    var answer = decision.getChoice("route");
    String routeId = answer.getValue();
    Double probability = answer.getProbability();
}
```

Spring AI 2.1 提供 OpenAI、Ollama 和 System One 实现。使用百炼时，对应配置见 [百炼 Decision Model](/integration/chatmodels/dashScope#百炼-decision-model)。Graph 可用 `QuestionClassifierNode.builder().decisionModel(decisionModel)`，并将有类型的选项标识作为下游路由键。

## 在 ReactAgent 中使用 ChatModel

```java
var agent = ReactAgent.builder()
    .name("assistant")
    .model(chatModel)
    .systemPrompt("Answer concisely")
    .build();

AssistantMessage reply = agent.call("What is Spring AI?");
```

模型选择决定可用的媒体、结构化输出和工具能力。ReactAgent 负责 Agent 工具和状态循环。对需要解析为 Java 类型的输出，见 [结构化输出](structured-output.md)。

[Spring AI Decision Model](https://docs.spring.io/spring-ai/reference/api/decision.html) · [可运行的 ModelsExample](https://github.com/alibaba/spring-ai-alibaba/blob/e01219fd20ecfff2dd9d1a1facfe58e5349c3e07/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ModelsExample.java)
