---
title: Structured Output 结构化输出
description: 用 ReactAgent 的输出格式提示、Java 类型转换和 ChatClient 的 JSON Schema 校验获取可消费的结构化结果。
keywords: [Structured Output, 结构化输出, JSON Schema, ReactAgent, ChatClient, outputSchema, outputType]
---

# Structured Output 结构化输出

结构化输出适合信息提取、分类和工作流路由。例如，从文本中提取联系人并将结果转为 Java 对象，供后续代码按字段处理。本页适用于 Spring AI Alibaba 2.0.x。

## 输出格式选项

| 场景 | 入口 | 结果 |
| --- | --- | --- |
| Agent 需要工具、工作流、会话状态或人工介入 | `ReactAgent.outputType(...)` 或 `outputSchema(...)` | `AssistantMessage` 中的最终文本，由应用转换和校验 |
| 直接调用模型并取得 Java 对象 | `ChatClient.call().entity(...)` | 转换后的 Java 对象 |
| 直接调用模型并对结构有更严格的要求 | `ChatClient` 的 `validateSchema()` 或 `useProviderStructuredOutput()` | 根据选择进行客户端校验、服务端约束或两者结合 |

## 输出类型策略

`outputType(Class<?>)` 根据可反序列化的 Java 类型生成格式提示。下面用 Java record 定义联系方式，并使用 `BeanOutputConverter` 转换最终消息。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.converter.BeanOutputConverter;

record ContactInfo(String name, String email, String phone) {}

var agent = ReactAgent.builder()
    .name("contact_extractor")
    .model(chatModel)
    .outputType(ContactInfo.class)
    .build();

var reply = agent.call("""
    提取姓名、电子邮件和电话号码。原文没有的联系方式用 null。
    联系人张三，zhangsan@example.com
    """);

var converter = new BeanOutputConverter<>(ContactInfo.class);
ContactInfo contact = converter.convert(reply.getText());
System.out.println(contact.email());
```

示例输出为 `zhangsan@example.com`。模型可能返回带 Markdown 围栏的 JSON，转换器可处理常见的文本包装。字段必填、数值范围和业务规则仍应在应用中明确校验。

## 输出 Schema 策略

`outputSchema(String)` 把传入的字符串作为格式提示追加到模型请求。可以传入 `BeanOutputConverter.getFormat()` 生成的格式指令，也可以手写指令和 JSON Schema。两项都配置时，显式 `outputSchema` 优先。

```java
String schema = """
    {
      "type": "object",
      "properties": {
        "rating": {"type": "integer", "minimum": 1, "maximum": 5},
        "sentiment": {"enum": ["POSITIVE", "NEUTRAL", "NEGATIVE"]},
        "keyPoints": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["rating", "sentiment", "keyPoints"],
      "additionalProperties": false
    }
    """;

var reviewAgent = ReactAgent.builder()
    .name("review_analyzer")
    .model(chatModel)
    .outputSchema("只返回符合以下 JSON Schema 的 JSON 对象。\n" + schema)
    .build();

var reply = reviewAgent.call("分析评价：5 星。配送很快，价格偏高。");
```

这份 Schema 描述了评分范围、情感枚举和数组形状。应用如需判定模型是否遵守全部 Schema 关键字，可以用 JSON Schema 校验器检查完整响应，再转换为业务类型。

`getFormat()` 返回适合加入提示词的指令，包含 JSON Schema。`getJsonSchema()` 返回 Schema 本身，适合交给校验器或模型的原生 Schema 选项。

## 工作原理

### Agent 状态与流式输出

`ReactAgent` 将输出格式用于提示词引导，保留原有的模型和工具执行流程。`call(...)` 返回 `AssistantMessage`。需要从状态取结果时，可以为 Agent 配置 `outputKey("contact")`，再从 `invokeAndGetOutput(...)` 的状态读取该键。这个键保存的也是消息，读取后使用对应的转换器。

```java
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata;
import org.springframework.ai.chat.messages.AssistantMessage;

var output = contactAgent.invokeAndGetOutput(input, config).orElseThrow();
if (output instanceof InterruptionMetadata interruption) {
    // 使用中断信息处理人工反馈，再恢复执行。
}
else {
    var message = output.state().value("contact", AssistantMessage.class).orElseThrow();
    ContactInfo contact = converter.convert(message.getText());
}
```

这里的 `contactAgent` 使用 `outputKey("contact")`，`converter` 的目标类型为 `ContactInfo`。人工介入和工作流暂停时，先完成恢复流程。流式调用在收到完整的最终文本后再解析，单个片段可能只有一个 JSON 字段的一部分。

### 工具调用与输出格式

工具的输入 Schema 用于生成和约束工具参数，`outputType` 和 `outputSchema` 用于引导最终文本。工具调用可能经过多轮后才有最终答复。需要模型原生 Schema 与工具调用同时生效时，请核对具体模型是否支持组合使用。

### 模型原生结构化输出

只需要调用模型并取得对象时，可以直接使用 Spring AI `ChatClient`。原生结构化输出通过服务端请求选项传入 Schema，具体支持取决于模型适配器和模型版本。JSON 对象模式主要约束输出为 JSON 对象，字段和取值约束由 JSON Schema 模式或客户端校验负责。

```java
ContactInfo contact = chatClient.prompt()
    .user("提取联系人：张三，zhangsan@example.com，13800138000")
    .call()
    .entity(ContactInfo.class,
        spec -> spec.useProviderStructuredOutput().validateSchema());
```

`useProviderStructuredOutput()` 请求服务端原生约束。对于不具备原生能力的模型选项，Spring AI `ChatClient` 会使用提示词引导。`validateSchema()` 会检查完整输出，在格式或结构校验失败时将错误反馈给模型并按次数上限重新生成。这些选项配置在 `ChatClient.entity(...)` 调用上。

`List<ContactInfo>` 等泛型结果可以通过 `entity(new ParameterizedTypeReference<List<ContactInfo>>() {})` 读取，前提是所选模型支持相应的输出形状。转换成功后，如果还需要原始响应和用量信息，可以使用 `responseEntity(...)` 同时获取响应与对象。

## 错误处理

| 情况 | 处理方式 |
| --- | --- |
| 输出为空、截断或无法解析 | 保留失败状态。独立、无副作用的提取步骤可以使用 `validateSchema()` 进行有界纠正。 |
| JSON 可解析但字段不符合规则 | 校验必填字段、范围和跨字段约束，例如评分必须在 1 到 5 之间。 |
| Agent 仍在调用工具或等待人工输入 | 等待 Agent 完成工具调用，或使用中断信息恢复。 |
| 模型拒答或内容被过滤 | 读取模型响应元数据，按拒答或过滤处理。 |

对 2.0.x 的模型拒答或过滤结果，可使用 `ChatClient.call().chatResponse()` 先检查响应元数据，再决定是否运行转换器。
如果前面的 Agent 工具会写入数据或产生其他外部副作用，将格式纠正放在独立的结果提取步骤，避免重跑已执行的工具。

## 相关文档

- [本版本的 Java 示例](https://github.com/alibaba/spring-ai-alibaba/blob/v2.0.3.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/StructuredOutputExample.java)
- [Spring AI 结构化输出](https://docs.spring.io/spring-ai/reference/2.0/api/structured-output.html)
- [Agent 基础](./agents.md) · [模型](./models.md) · [消息](./messages.md)
