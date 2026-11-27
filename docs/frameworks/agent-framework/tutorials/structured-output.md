---
title: Structured Output 结构化输出
description: 让 ReactAgent 自动选择模型原生 JSON Schema、工具调用或提示词，校验结果并返回 Java 对象。
keywords: [Structured Output, 结构化输出, JSON Schema, ReactAgent, ChatClient, outputSchema, outputType]
---

# Structured Output 结构化输出

结构化输出适合信息提取、分类和工作流路由。用 `outputType(Class<?>)` 声明 Java 类型，或用 `outputSchema(String)` 提供 JSON Schema。Agent 可先调用业务工具，准备好最终结果后再校验和转换。本页介绍 Spring AI Alibaba 2.1.x 主线的结构化输出 API。

## 获取 Java 对象

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;

record ContactInfo(String name, String email, String phone) {}

var agent = ReactAgent.builder()
    .name("contact_extractor")
    .model(chatModel)
    .outputType(ContactInfo.class)
    .build();

ContactInfo contact = agent.callStructured("""
    提取姓名、电子邮件和电话号码。
    联系人张三，zhangsan@example.com，13800138000
    """, ContactInfo.class);

System.out.println(contact.email());
```

`outputType` 使用 Spring AI 根据类型生成 JSON Schema。Schema 校验通过后，Agent 还会检查 JSON 能否转换为已配置的 Java 类型，包含 record 构造器执行的约束。`callStructured(..., Class<T>)` 返回对象。原有的 `call(...)` 仍返回 `AssistantMessage`，它的最终文本是通过校验的 JSON。

## 自动选择策略

默认的 `AUTO` 按下表顺序选择策略，根据每次模型调用的选项判断能力。模型明确报告当前能力不受支持时，Agent 会尝试后续策略。

| 优先级 | 策略 | 执行方式 |
| --- | --- | --- |
| 1 | `NATIVE` | 模型选项实现 Spring AI 的 `StructuredOutputChatOptions` 时，在请求选项中发送 JSON Schema。 |
| 2 | `TOOL` | 模型选项支持工具调用且 Schema 为对象时，增加一个内部结果工具。Agent 从该工具的参数读取并校验结果。 |
| 3 | `PROMPT` | 把 Schema 写入提示词，从模型的最终文本读取并校验 JSON。 |

模型服务对 JSON Schema 关键字、顶层形状以及原生输出与工具调用的组合可能有各自的限制。工具策略的结果工具只用于提交最终答案，业务工具仍按已有拦截器、审批和限额执行。顶层数组或标量在原生路径不可用时进入提示词路径。

Spring AI 的 `OpenAiChatModel` 支持原生路径，也可通过百炼的 OpenAI 兼容端点调用支持 JSON Schema 的千问模型。使用 `DashScopeChatModel` 时，原生路径需要采用已实现 `StructuredOutputChatOptions` 的 DashScope HTTP 适配器版本。具体支持范围见[百炼结构化输出](https://help.aliyun.com/zh/model-studio/qwen-structured-output)。

需要固定策略时，按场景显式设置 `structuredOutputStrategy`。例如，对支持工具调用的模型固定使用工具输出。

```java
import com.alibaba.cloud.ai.graph.agent.structured.StructuredOutputStrategy;

var toolOutputAgent = ReactAgent.builder()
    .name("contact_extractor")
    .model(chatModel)
    .outputType(ContactInfo.class)
    .structuredOutputStrategy(StructuredOutputStrategy.TOOL)
    .structuredOutputMaxRetries(1)
    .build();
```

显式设置 `NATIVE`、`TOOL` 或 `PROMPT` 会固定策略。固定策略无法执行时，调用会报告失败。

## 自定义 JSON Schema

`outputSchema` 可为字段增加值域、枚举、必填和额外字段约束。搭配 `outputType` 时，显式 Schema 用于约束和校验 JSON，Java 类型用于转换。

```java
import java.util.List;

enum Sentiment { POSITIVE, NEUTRAL, NEGATIVE }
record ProductReview(int rating, Sentiment sentiment, List<String> keyPoints) {}

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
    .outputSchema(schema)
    .outputType(ProductReview.class)
    .build();

ProductReview review = reviewAgent.callStructured(
    "分析评价：5 星。配送很快，价格偏高。", ProductReview.class);
```

如果从 `BeanOutputConverter` 取得 Schema，使用 `getJsonSchema()`，并用 `instruction` 设置额外的业务指令。只传普通格式说明的 `outputSchema` 用法继续作为提示词生效。需要类型化结果和校验时，请提供可解析的 JSON Schema 或配置 `outputType`。

## 校验与重试

- 默认允许 **2 次额外的纠错请求**。用 `structuredOutputMaxRetries(0)` 关闭纠错。模型能力降级独立于纠错次数。
- JSON 解析、Schema 校验或已配置 Java 类型的转换失败时，Agent 将错误反馈给模型重新生成最终结果。这些纠错请求在当前模型节点内完成，已执行的业务工具只执行原有次数。
- 纠错次数耗尽后，调用抛出 `StructuredOutputException`。模型拒答或内容被过滤时，可通过消息接口或图输出检查原始状态。认证、限流等服务异常沿调用链返回。

## 人工审批与流式读取

会暂停等待审批的 Agent 使用 `invokeAndGetOutput` 获取中断。完成审批并恢复执行后，用 `structuredOutput` 从已有图输出读取本次执行的结果。

```java
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata;

var output = agent.invokeAndGetOutput(input, config).orElseThrow();
if (output instanceof InterruptionMetadata interruption) {
    // 返回审批请求。提交决策并恢复执行后，从完成的输出读取结果。
}
else {
    ContactInfo contact = agent.structuredOutput(output, ContactInfo.class).orElseThrow();
}
```

流式调用会收集结构化模型轮次的响应，在结果通过校验后发出完整 JSON。可以在该次流执行完成后使用 `structuredOutput` 读取对象。等待审批时或本次执行未产生最终结构化答案时，该方法返回空的 `Optional`。

## 直接调用模型

独立提取任务也可以使用 Spring AI 的 `ChatClient.call().entity(...)`。对兼容的模型可在请求中启用原生 JSON Schema，并额外启用客户端校验。

```java
ContactInfo contact = chatClient.prompt()
    .user("提取联系人：张三，zhangsan@example.com，13800138000")
    .call()
    .entity(ContactInfo.class,
        spec -> spec.useProviderStructuredOutput().validateSchema());
```

## 相关文档

- [本版本的 Java 示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/StructuredOutputExample.java)
- [Spring AI 原生结构化输出](https://docs.spring.io/spring-ai/reference/api/structured-output/native.html)
- [Agent 基础](./agents.md) · [模型](./models.md) · [人工审批](../advanced/human-in-the-loop.md)
