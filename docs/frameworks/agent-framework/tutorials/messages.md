---
title: 消息与 Message Parts
description: 构建 Spring AI 2.1 消息，保留有序文本、媒体、推理、工具请求和结果。
keywords: [Message, MessagePart, Prompt, AssistantMessage, ToolResponseMessage]
---

# 消息与 Message Parts

`Prompt` 用有序消息描述模型看到的对话。消息类型说明每条内容的来源，`MessagePart` 说明一条消息内部有什么内容。Spring AI 2.1 将文本、媒体、推理和工具交换放入有序部分，应用可以保留提供商需要回放的完整内容。

| 消息类型 | 内容 |
| --- | --- |
| `SystemMessage` | 面向模型的系统规则与角色 |
| `UserMessage` | 用户文本及模型支持的图片、音频等输入 |
| `AssistantMessage` | 模型生成的文本、推理、媒体或工具调用 |
| `ToolResponseMessage` | 应用执行工具后给模型的结果 |

```java
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

var prompt = new Prompt(List.of(
    new SystemMessage("Answer concisely."),
    new UserMessage("Explain how a tool call works.")
));
var reply = chatModel.call(prompt);
```

元数据是应用或提供商附加的数据，可用于跟踪来源和诊断。正文、媒体、工具交换和推理应保存在实际内容部分。将业务身份等运行参数通过应用上下文传递，可避免把它们混入模型看到的消息。

## 读取与保留 Message Parts

读取正文用 `getText()`。需要重放、审计或修改消息时，用 `getParts()` 取得原始顺序。助手消息的 `getReasoning()` 返回有序的 `ReasoningPart`，可按提供商返回的 `summary()` 或 `text()` 展示。不要把无可读内容的载荷转成正文。

| 部分 | 用途 |
| --- | --- |
| `TextPart` | 可读文本 |
| `MediaPart` | 带 MIME 类型的媒体 |
| `ReasoningPart` | 可读推理或摘要，以及可选的回放载荷 |
| `ToolCallPart` | 调用 ID、工具名和参数，可能携带提供商签名 |
| `ToolResultPart` | 调用对应的有序结果内容，含错误标记 |
| `UnknownPart` | 当前应用无法解释的提供商内容 |

```java
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.part.OpaquePayload;
import org.springframework.ai.chat.messages.part.ReasoningPart;
import org.springframework.ai.chat.messages.part.TextPart;
import org.springframework.ai.chat.messages.part.ToolCallPart;

var reasoning = new ReasoningPart(null, "Looking up the order",
    new OpaquePayload("example-provider", "reasoning", "opaque-example"), Map.of());

var assistant = AssistantMessage.builder()
    .part(reasoning)
    .part(TextPart.of("I will check the order."))
    .part(ToolCallPart.of(new AssistantMessage.ToolCall(
        "order-1", "function", "lookupOrder", "{\"orderId\":\"42\"}")))
    .build();

var revised = assistant.mutate().content("Checking order 42.").build();
```

示例载荷用于说明数据形状。实际应用应保留提供商返回的 `OpaquePayload` 和未知部分，并按其适用提供商回放。只改正文时用 `mutate().content(...)` 保留其余部分。需要跨轮或持久化时，保留消息类型、完整 parts 与所需元数据。单独保存 `getText()` 会丢失工具关联、媒体和回放数据。Graph 的 checkpoint 也可保留这些内容。

## 构造多模态消息

```java
import java.net.URI;
import org.springframework.ai.content.Media;
import org.springframework.util.MimeTypeUtils;

var image = Media.builder()
    .mimeType(MimeTypeUtils.IMAGE_PNG)
    .data(URI.create("https://example.com/diagram.png"))
    .build();

var user = UserMessage.builder()
    .text("Describe this diagram.")
    .media(image)
    .build();
```

`Media.Builder.data(...)` 使用 `URI`、`URL`、`String`、`byte[]` 或 `Resource` 等具体类型。音频、视频和图片所支持的格式、大小与传输方式由模型决定。使用百炼可从 [多模态接入](/integration/multimodals/dashscope-multimodal) 核对对应选项。

## 在历史中保留工具请求和结果

保持用户请求、助手工具调用、工具结果和随后助手回答的顺序。结果中使用相同的调用 ID。需要表达工具失败时，可以在结果部分保留错误状态。使用 `getResults()` 可以读取这些结构化结果，`getResponses()` 适合旧式文本结果视图。

```java
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.part.ToolResultPart;

var failure = ToolResponseMessage.builder()
    .result(new ToolResultPart("order-1", "lookupOrder",
        List.of(TextPart.of("Order not found")), true, null, Map.of()))
    .build();
```

工具 Advisor 会为执行结果构建响应消息。自行管理循环时，把工具结果与对应的助手调用一起传回模型。详见 [工具循环](tools.md#工具循环异常与预算)。

## 流式参数与聚合

提供商可用同一部分索引返回连续的工具参数增量。`StreamingParts.partIndex(part)` 和 `isPartial(part)` 可帮助展示增量。助手消息的 `getToolCalls()` 会跳过未完成部分。工具执行应等待完整调用，历史中保存聚合后的助手消息。

```java
import org.springframework.ai.chat.model.MessageAggregator;

var stream = new MessageAggregator().aggregate(chatModel.stream(prompt), complete -> {
    var finalReply = complete.getResult();
    var usage = complete.getMetadata().getUsage();
    // Store the full message and usage when present.
});
```

聚合器返回原流，订阅这条流以展示增量，完成回调可用于处理聚合结果。流事件可能只包含用量，直接读取 `chunk.getResult()` 前应判断结果是否存在。判断工具审批时读取工具 Advisor 的最后事件，因为待审批元数据位于该事件中。

[Spring AI 消息与 Prompt](https://docs.spring.io/spring-ai/reference/api/chatmodel.html) · [可运行的 MessagesExample](https://github.com/alibaba/spring-ai-alibaba/blob/e01219fd20ecfff2dd9d1a1facfe58e5349c3e07/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/MessagesExample.java)
