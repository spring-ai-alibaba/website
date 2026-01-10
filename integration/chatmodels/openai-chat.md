---
sidebar_position: 4
---


# OpenAI Chat

Spring AI 支持来自 OpenAI 的各种 AI 语言模型，OpenAI 是 ChatGPT 背后的公司，通过创建行业领先的文本生成模型和 embeddings，在激发人们对 AI 驱动的文本生成的兴趣方面发挥了重要作用。

## Prerequisites

您需要使用 OpenAI 创建 API 才能访问 ChatGPT 模型。

在 [OpenAI signup page](https://platform.openai.com/signup) 创建账户，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.openai.api-key` 的配置属性，您应将其设置为从 openai.com 获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.openai.api-key=<your-openai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
```

```bash
# In your environment or .env file
export OPENAI_API_KEY=<your-openai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("OPENAI_API_KEY");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 OpenAI Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

#### Retry Properties

前缀 `spring.ai.retry` 是用于配置 OpenAI chat model 的 retry 机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.retry.max-attempts | 最大重试次数。 | 10 |
| spring.ai.retry.backoff.initial-interval | 指数退避策略的初始睡眠持续时间。 | 2 sec. |
| spring.ai.retry.backoff.multiplier | 退避间隔乘数。 | 5 |
| spring.ai.retry.backoff.max-interval | 最大退避持续时间。 | 3 min. |
| spring.ai.retry.on-client-errors | 如果为 false，抛出 NonTransientAiException，并且不对 `4xx` 客户端错误代码尝试重试 | false |
| spring.ai.retry.exclude-on-http-codes | 不应触发重试的 HTTP 状态代码列表（例如，抛出 NonTransientAiException）。 | empty |
| spring.ai.retry.on-http-codes | 应触发重试的 HTTP 状态代码列表（例如，抛出 TransientAiException）。 | empty |

#### Connection Properties

前缀 `spring.ai.openai` 是用于连接到 OpenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai.base-url | 要连接到的 URL | https://api.openai.com |
| spring.ai.openai.api-key | API Key | - |
| spring.ai.openai.organization-id | 可选地，您可以指定用于 API 请求的组织。 | - |
| spring.ai.openai.project-id | 可选地，您可以指定用于 API 请求的项目。 | - |

> **提示：** 对于属于多个组织的用户（或通过其传统用户 API key 访问其项目），您可以可选地指定用于 API 请求的组织和项目。
> 这些 API 请求的使用量将计入指定组织和项目的使用量。

#### User-Agent Header

Spring AI 自动向 OpenAI 发送带有 `User-Agent: spring-ai` header 的所有请求。
这有助于 OpenAI 识别来自 Spring AI 的请求，用于分析和支持目的。
此 header 会自动发送，不需要 Spring AI 用户进行配置。

如果您是构建 OpenAI 兼容服务的 API 提供商，可以通过读取服务器上传入请求的 `User-Agent` HTTP header 来跟踪 Spring AI 的使用情况。

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=openai（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 openai 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.openai.chat` 是用于配置 OpenAI 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai.chat.enabled (Removed and no longer valid) | 启用 OpenAI chat model。 | true |
| spring.ai.model.chat | 启用 OpenAI chat model。 | openai |
| spring.ai.openai.chat.base-url | 可选覆盖 `spring.ai.openai.base-url` 属性以提供 chat 特定的 URL。 | - |
| spring.ai.openai.chat.completions-path | 要附加到 base URL 的路径。 | `/v1/chat/completions` |
| spring.ai.openai.chat.api-key | 可选覆盖 `spring.ai.openai.api-key` 以提供 chat 特定的 API Key。 | - |
| spring.ai.openai.chat.organization-id | 可选地，您可以指定用于 API 请求的组织。 | - |
| spring.ai.openai.chat.project-id | 可选地，您可以指定用于 API 请求的项目。 | - |
| spring.ai.openai.chat.options.model | 要使用的 OpenAI chat model 名称。您可以在以下模型之间选择：`gpt-4o`、`gpt-4o-mini`、`gpt-4-turbo`、`gpt-3.5-turbo` 等。有关更多信息，请参阅 [models](https://platform.openai.com/docs/models) 页面。 | `gpt-4o-mini` |
| spring.ai.openai.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。不建议为同一个 completions 请求修改 `temperature` 和 `top_p`，因为这两个设置的交互很难预测。 | 0.8 |
| spring.ai.openai.chat.options.frequencyPenalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止文本中现有频率对新 tokens 进行惩罚，降低模型逐字重复同一行的可能性。 | 0.0f |
| spring.ai.openai.chat.options.logitBias | 修改指定 tokens 出现在 completion 中的可能性。 | - |
| spring.ai.openai.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。*用于非推理模型*（例如，gpt-4o、gpt-3.5-turbo）。*不能用于推理模型*（例如，o1、o3、o4-mini 系列）。*与 maxCompletionTokens 互斥* - 同时设置两者将导致 API 错误。 | - |
| spring.ai.openai.chat.options.maxCompletionTokens | 可以为 completion 生成的 tokens 数量的上限，包括可见输出 tokens 和推理 tokens。*推理模型必需*（例如，o1、o3、o4-mini 系列）。*不能用于非推理模型*（例如，gpt-4o、gpt-3.5-turbo）。*与 maxTokens 互斥* - 同时设置两者将导致 API 错误。 | - |
| spring.ai.openai.chat.options.n | 为每个输入消息生成多少个 chat completion 选择。请注意，您将根据所有选择中生成的 tokens 数收费。保持 `n` 为 1 以最小化成本。 | 1 |
| spring.ai.openai.chat.options.store | 是否存储此 chat completion 请求的输出以供在我们的模型中使用 | false |
| spring.ai.openai.chat.options.metadata | 用于在 chat completion 仪表板中过滤 completions 的开发人员定义的标签和值 | empty map |
| spring.ai.openai.chat.options.output-modalities | 您希望模型为此请求生成的输出类型。大多数模型能够生成文本，这是默认值。`gpt-4o-audio-preview` 模型也可以用于生成音频。要请求此模型生成文本和音频响应，您可以使用：`text`、`audio`。不支持 streaming。 | - |
| spring.ai.openai.chat.options.output-audio | 音频生成的音频参数。当通过 `output-modalities`: `audio` 请求音频输出时必需。需要 `gpt-4o-audio-preview` 模型，并且不支持 streaming completions。 | - |
| spring.ai.openai.chat.options.presencePenalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现新 tokens 进行惩罚，增加模型讨论新主题的可能性。 | - |
| spring.ai.openai.chat.options.responseFormat.type | 与 `GPT-4o`、`GPT-4o mini`、`GPT-4 Turbo` 以及所有比 `gpt-3.5-turbo-1106` 更新的 `GPT-3.5 Turbo` 模型兼容。`JSON_OBJECT` 类型启用 JSON mode，这保证了模型生成的消息是有效的 JSON。`JSON_SCHEMA` 类型启用 [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)，这保证了模型将匹配您提供的 JSON schema。JSON_SCHEMA 类型还需要设置 `responseFormat.schema` 属性。 | - |
| spring.ai.openai.chat.options.responseFormat.name | 响应格式 schema 名称。仅适用于 `responseFormat.type=JSON_SCHEMA` | custom_schema |
| spring.ai.openai.chat.options.responseFormat.schema | 响应格式 JSON schema。仅适用于 `responseFormat.type=JSON_SCHEMA` | - |
| spring.ai.openai.chat.options.responseFormat.strict | 响应格式 JSON schema 遵守严格性。仅适用于 `responseFormat.type=JSON_SCHEMA` | - |
| spring.ai.openai.chat.options.seed | 此功能处于 Beta 阶段。如果指定，我们的系统将尽最大努力进行确定性采样，以便使用相同的 seed 和参数重复请求应返回相同的结果。 | - |
| spring.ai.openai.chat.options.stop | 最多 4 个序列，API 将停止生成更多 tokens。 | - |
| spring.ai.openai.chat.options.topP | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法，其中模型考虑具有 `top_p` 概率质量的 tokens 结果。因此，0.1 意味着只考虑包含 top 10% 概率质量的 tokens。我们通常建议修改此值或 `temperature`，但不要同时修改两者。 | - |
| spring.ai.openai.chat.options.tools | 模型可以调用的工具列表。目前，仅支持 functions 作为工具。使用此选项提供模型可能为其生成 JSON 输入的 functions 列表。 | - |
| spring.ai.openai.chat.options.toolChoice | 控制模型调用哪个（如果有）function。`none` 意味着模型不会调用 function，而是生成消息。`auto` 意味着模型可以在生成消息或调用 function 之间进行选择。通过 `{"type: "function", "function": {"name": "my_function"}}` 指定特定 function 会强制模型调用该 function。当没有 functions 时，`none` 是默认值。如果存在 functions，`auto` 是默认值。 | - |
| spring.ai.openai.chat.options.user | 代表您的最终用户的唯一标识符，可以帮助 OpenAI 监控和检测滥用。 | - |
| spring.ai.openai.chat.options.stream-usage | （仅用于 streaming）设置为添加包含整个请求的 token 使用统计信息的额外块。此块的 `choices` 字段是一个空数组，所有其他块也将包含一个 usage 字段，但值为 null。 | false |
| spring.ai.openai.chat.options.parallel-tool-calls | 是否在工具使用期间启用 [parallel function calling](https://platform.openai.com/docs/guides/function-calling/parallel-function-calling)。 | true |
| spring.ai.openai.chat.options.prompt-cache-key | OpenAI 用于优化类似请求的缓存命中率的缓存 key。改善延迟并降低成本。在缓存目的上替换已弃用的 `user` 字段。[Learn more](https://platform.openai.com/docs/guides/prompt-caching)。 | - |
| spring.ai.openai.chat.options.safety-identifier | 帮助 OpenAI 检测违反使用策略的用户的稳定标识符。应该是哈希值（例如，哈希用户名或电子邮件）。在安全跟踪上替换已弃用的 `user` 字段。[Learn more](https://platform.openai.com/docs/guides/safety-best-practices#safety-identifiers)。 | - |
| spring.ai.openai.chat.options.http-headers | 要添加到 chat completion 请求的可选 HTTP headers。要覆盖 `api-key`，您需要使用 `Authorization` header key，并且必须在 key 值前加上 `Bearer` 前缀。 | - |
| spring.ai.openai.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.openai.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.openai.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |
| spring.ai.openai.chat.options.service-tier | 指定用于服务请求的 [processing type](https://platform.openai.com/docs/api-reference/responses/create#responses_create-service_tier)。 | - |
| spring.ai.openai.chat.options.extra-body | 要包含在请求中的其他参数。接受任何键值对，这些键值对被展平到 JSON 请求的顶层。用于与支持标准 OpenAI API 之外参数的 OpenAI 兼容服务器（vLLM、Ollama 等）一起使用。官方 OpenAI API 会忽略未知参数。有关详细信息，请参阅 【openai-compatible-servers】。 | - |

> **注意：**
> 使用 GPT-5 模型（如 `gpt-5`、`gpt-5-mini` 和 `gpt-5-nano`）时，不支持 `temperature` 参数。
> 这些模型针对推理进行了优化，不使用 temperature。
> 指定 temperature 值将导致错误。
> 相比之下，对话模型（如 `gpt-5-chat`）确实支持 `temperature` 参数。

> **注意：** 您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.openai.base-url` 和 `spring.ai.openai.api-key`。
> 如果设置了 `spring.ai.openai.chat.base-url` 和 `spring.ai.openai.chat.api-key` 属性，则优先于通用属性。
> 如果您想对不同的模型和不同的模型端点使用不同的 OpenAI 账户，这很有用。

> **提示：** 所有前缀为 `spring.ai.openai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

### Token Limit Parameters: Model-Specific Usage

OpenAI 提供两个互斥的参数来控制 token 生成限制：

| Parameter | Use Case | Compatible Models |
|-----------|----------|-------------------|
| `maxTokens` | 非推理模型 | gpt-4o、gpt-4o-mini、gpt-4-turbo、gpt-3.5-turbo |
| `maxCompletionTokens` | 推理模型 | o1、o1-mini、o1-preview、o3、o4-mini 系列 |

> **重要：** 这些参数是**互斥的**。同时设置两者将导致 OpenAI 的 API 错误。

#### Usage Examples

**对于非推理模型（gpt-4o、gpt-3.5-turbo）：**

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Explain quantum computing in simple terms.",
        OpenAiChatOptions.builder()
            .model("gpt-4o")
            .maxTokens(150)  // Use maxTokens for non-reasoning models
        .build()
    ));
```

**对于推理模型（o1、o3 系列）：**

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Solve this complex math problem step by step: ...",
        OpenAiChatOptions.builder()
            .model("o1-preview")
            .maxCompletionTokens(1000)  // Use maxCompletionTokens for reasoning models
        .build()
    ));
```

**Builder Pattern Validation:**
OpenAI ChatOptions 构建器使用 "last-set-wins" 方法自动强制执行互斥性：

```java
// This will automatically clear maxTokens and use maxCompletionTokens
OpenAiChatOptions options = OpenAiChatOptions.builder()
    .maxTokens(100)           // Set first
    .maxCompletionTokens(200) // This clears maxTokens and logs a warning
    .build();

// Result: maxTokens = null, maxCompletionTokens = 200
```

## Runtime Options [[chat-options]]

[OpenAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatOptions.java) 类提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `OpenAiChatModel(api, options)` 构造函数或 `spring.ai.openai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        OpenAiChatOptions.builder()
            .model("gpt-4o")
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 [OpenAiChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Function Calling

您可以将自定义 Java functions 注册到 `OpenAiChatModel`，并让 OpenAI 模型智能地选择输出包含参数以调用一个或多个已注册 functions 的 JSON 对象。
这是一种将 LLM 功能与外部工具和 APIs 连接的强大技术。
了解更多关于 [Tool Calling](tools)。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。
OpenAI 支持文本、视觉和音频输入模态。

### Vision

提供 vision multimodal 支持的 OpenAI 模型包括 `gpt-4`、`gpt-4o` 和 `gpt-4o-mini`。
请参阅 [Vision](https://platform.openai.com/docs/guides/vision) 指南了解更多信息。

OpenAI [User Message API](https://platform.openai.com/docs/api-reference/chat/create#chat-create-messages) 可以在消息中包含 base64 编码的图像或图像 URL 列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。

以下是从 [OpenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/c9a3e66f90187ce7eae7eb78c462ec622685de6c/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/chat/OpenAiChatModelIT.java#L293) 中摘取的代码示例，说明了使用 `gpt-4o` 模型将用户文本与图像融合。

```java
var imageResource = new ClassPathResource("/multimodal.test.png");

var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG, this.imageResource));

ChatResponse response = chatModel.call(new Prompt(this.userMessage,
        OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_O.getValue()).build()));
```

> **提示：** GPT_4_VISION_PREVIEW 将从 2024 年 6 月 17 日起仅继续向此模型的现有用户提供。如果您不是现有用户，请使用 GPT_4_O 或 GPT_4_TURBO 模型。更多详细信息[这里](https://platform.openai.com/docs/deprecations/2024-06-06-gpt-4-32k-and-vision-preview-models)

或使用 `gpt-4o` 模型的图像 URL 等效方式：

```java
var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG,
                URI.create("https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png")));

ChatResponse response = chatModel.call(new Prompt(this.userMessage,
        OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_O.getValue()).build()));
```

> **提示：** 您也可以传递多个图像。

该示例显示模型将 `multimodal.test.png` 图像作为输入：

![multimodal.test.png](/img/integration/multimodal.test.png)

以及文本消息 "Explain what do you see on this picture?"，并生成如下响应：

```
This is an image of a fruit bowl with a simple design. The bowl is made of metal with curved wire edges that
create an open structure, allowing the fruit to be visible from all angles. Inside the bowl, there are two
yellow bananas resting on top of what appears to be a red apple. The bananas are slightly overripe, as
indicated by the brown spots on their peels. The bowl has a metal ring at the top, likely to serve as a handle
for carrying. The bowl is placed on a flat surface with a neutral-colored background that provides a clear
view of the fruit inside.
```

### Audio

提供音频输入 multimodal 支持的 OpenAI 模型包括 `gpt-4o-audio-preview`。
请参阅 [Audio](https://platform.openai.com/docs/guides/audio) 指南了解更多信息。

OpenAI [User Message API](https://platform.openai.com/docs/api-reference/chat/create#chat-create-messages) 可以在消息中包含 base64 编码的音频文件列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。
目前，OpenAI 仅支持以下媒体类型：`audio/mp3` 和 `audio/wav`。

以下是从 [OpenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/c9a3e66f90187ce7eae7eb78c462ec622685de6c/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/chat/OpenAiChatModelIT.java#L442) 中摘取的代码示例，说明了使用 `gpt-4o-audio-preview` 模型将用户文本与音频文件融合。

```java
var audioResource = new ClassPathResource("speech1.mp3");

var userMessage = new UserMessage("What is this recording about?",
        List.of(new Media(MimeTypeUtils.parseMimeType("audio/mp3"), audioResource)));

ChatResponse response = chatModel.call(new Prompt(List.of(userMessage),
        OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_O_AUDIO_PREVIEW).build()));
```

> **提示：** 您也可以传递多个音频文件。

### Output Audio

提供音频输入 multimodal 支持的 OpenAI 模型包括 `gpt-4o-audio-preview`。
请参阅 [Audio](https://platform.openai.com/docs/guides/audio) 指南了解更多信息。

OpenAI [Assistant Message API](https://platform.openai.com/docs/api-reference/chat/create#chat-create-messages) 可以在消息中包含 base64 编码的音频文件列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。
目前，OpenAI 仅支持以下音频类型：`audio/mp3` 和 `audio/wav`。

以下是一个代码示例，说明了使用 `gpt-4o-audio-preview` 模型响应用户文本以及音频字节数组：

```java
var userMessage = new UserMessage("Tell me joke about Spring Framework");

ChatResponse response = chatModel.call(new Prompt(List.of(userMessage),
        OpenAiChatOptions.builder()
            .model(OpenAiApi.ChatModel.GPT_4_O_AUDIO_PREVIEW)
            .outputModalities(List.of("text", "audio"))
            .outputAudio(new AudioParameters(Voice.ALLOY, AudioResponseFormat.WAV))
            .build()));

String text = response.getResult().getOutput().getContent(); // audio transcript

byte[] waveAudio = response.getResult().getOutput().getMedia().get(0).getDataAsByteArray(); // audio data
```

您必须在 `OpenAiChatOptions` 中指定 `audio` 模态以生成音频输出。
`AudioParameters` 类提供音频输出的 voice 和音频格式。

## Structured Outputs

OpenAI 提供自定义 [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) APIs，确保您的模型生成严格符合您提供的 `JSON Schema` 的响应。
除了现有的 Spring AI 模型无关的 [Structured Output Converter](structured-output-converter) 之外，这些 APIs 还提供增强的控制和精度。

> **注意：** 目前，OpenAI 支持 [subset of the JSON Schema language](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas) 格式。

### Configuration

Spring AI 允许您使用 `OpenAiChatOptions` 构建器以编程方式配置响应格式，或通过应用程序属性配置。

#### Using the Chat Options Builder

您可以使用 `OpenAiChatOptions` 构建器以编程方式设置响应格式，如下所示：

```java
String jsonSchema = """
        {
            "type": "object",
            "properties": {
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "explanation": { "type": "string" },
                            "output": { "type": "string" }
                        },
                        "required": ["explanation", "output"],
                        "additionalProperties": false
                    }
                },
                "final_answer": { "type": "string" }
            },
            "required": ["steps", "final_answer"],
            "additionalProperties": false
        }
        """;

Prompt prompt = new Prompt("how can I solve 8x + 7 = -23",
        OpenAiChatOptions.builder()
            .model(ChatModel.GPT_4_O_MINI)
            .responseFormat(new ResponseFormat(ResponseFormat.Type.JSON_SCHEMA, this.jsonSchema))
            .build());

ChatResponse response = this.openAiChatModel.call(this.prompt);
```

> **注意：** 遵守 OpenAI [subset of the JSON Schema language](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas) 格式。

#### Integrating with BeanOutputConverter Utilities

您可以利用现有的 [BeanOutputConverter](structured-output-converter#_bean_output_converter) 工具自动从您的域对象生成 JSON Schema，然后将结构化响应转换为域特定的实例：

```java
record MathReasoning(
    @JsonProperty(required = true, value = "steps") Steps steps,
    @JsonProperty(required = true, value = "final_answer") String finalAnswer) {

    record Steps(
        @JsonProperty(required = true, value = "items") Items[] items) {

        record Items(
            @JsonProperty(required = true, value = "explanation") String explanation,
            @JsonProperty(required = true, value = "output") String output) {
        }
    }
}

var outputConverter = new BeanOutputConverter<>(MathReasoning.class);

var jsonSchema = this.outputConverter.getJsonSchema();

Prompt prompt = new Prompt("how can I solve 8x + 7 = -23",
        OpenAiChatOptions.builder()
            .model(ChatModel.GPT_4_O_MINI)
            .responseFormat(new ResponseFormat(ResponseFormat.Type.JSON_SCHEMA, this.jsonSchema))
            .build());

ChatResponse response = this.openAiChatModel.call(this.prompt);
String content = this.response.getResult().getOutput().getContent();

MathReasoning mathReasoning = this.outputConverter.convert(this.content);
```

> **注意：** 虽然这对于 JSON Schema 是可选的，但 OpenAI [mandates](https://platform.openai.com/docs/guides/structured-outputs/all-fields-must-be-required#all-fields-must-be-required) 必需字段以使结构化响应正常工作。Kotlin 反射用于根据类型的可空性和参数的默认值推断哪些属性是必需的或不是必需的，因此对于大多数用例，不需要 `@get:JsonProperty(required = true)`。`@get:JsonProperty(value = "custom_name")` 可用于自定义属性名称。确保使用此 `@get:` 语法在相关的 getters 上生成注释，请参阅 [related documentation](https://kotlinlang.org/docs/annotations.html#annotation-use-site-targets)。

#### Configuring via Application Properties

或者，当使用 OpenAI auto-configuration 时，您可以通过以下应用程序属性配置所需的响应格式：

```properties
spring.ai.openai.api-key=YOUR_API_KEY
spring.ai.openai.chat.options.model=gpt-4o-mini

spring.ai.openai.chat.options.response-format.type=JSON_SCHEMA
spring.ai.openai.chat.options.response-format.name=MySchemaName
spring.ai.openai.chat.options.response-format.schema={"type":"object","properties":{"steps":{"type":"array","items":{"type":"object","properties":{"explanation":{"type":"string"},"output":{"type":"string"}},"required":["explanation","output"],"additionalProperties":false}},"final_answer":{"type":"string"}},"required":["steps","final_answer"],"additionalProperties":false}
spring.ai.openai.chat.options.response-format.strict=true
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-openai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 OpenAi chat model：

```properties
spring.ai.openai.api-key=YOUR_API_KEY
spring.ai.openai.chat.options.model=gpt-4o
spring.ai.openai.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 OpenAI 凭据。

这将创建一个 `OpenAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@RestController` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final OpenAiChatModel chatModel;

    @Autowired
    public ChatController(OpenAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map<String,String> generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", this.chatModel.call(message));
    }

    @GetMapping("/ai/generateStream")
	public Flux<ChatResponse> generateStream(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        Prompt prompt = new Prompt(new UserMessage(message));
        return this.chatModel.stream(prompt);
    }
}
```

## Manual Configuration

[OpenAiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 【low-level-api】 连接到 OpenAI 服务。

将 `spring-ai-openai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `OpenAiChatModel` 并将其用于文本生成：

```java
var openAiApi = OpenAiApi.builder()
            .apiKey(System.getenv("OPENAI_API_KEY"))
            .build();
var openAiChatOptions = OpenAiChatOptions.builder()
            .model("gpt-3.5-turbo")
            .temperature(0.4)
            .maxTokens(200)
            .build();
var chatModel = new OpenAiChatModel(this.openAiApi, this.openAiChatOptions);

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> response = this.chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

`OpenAiChatOptions` 提供 chat 请求的配置信息。
`OpenAiApi.Builder` 和 `OpenAiChatOptions.Builder` 分别是 API 客户端和 chat 配置的流畅选项构建器。

## Low-level OpenAiApi Client [[low-level-api]]

[OpenAiApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/api/OpenAiApi.java) 为 [OpenAI Chat API](https://platform.openai.com/docs/api-reference/chat) 提供轻量级 Java 客户端。

以下类图说明了 `OpenAiApi` chat 接口和构建块：

![openai-chat-api.jpg](/img/integration/openai-chat-api.jpg)

以下是如何以编程方式使用 API 的简单示例：

```java
OpenAiApi openAiApi = OpenAiApi.builder()
            .apiKey(System.getenv("OPENAI_API_KEY"))
            .build();

ChatCompletionMessage chatCompletionMessage =
    new ChatCompletionMessage("Hello world", Role.USER);

// Sync request
ResponseEntity<ChatCompletion> response = this.openAiApi.chatCompletionEntity(
    new ChatCompletionRequest(List.of(this.chatCompletionMessage), "gpt-3.5-turbo", 0.8, false));

// Streaming request
Flux<ChatCompletionChunk> streamResponse = this.openAiApi.chatCompletionStream(
        new ChatCompletionRequest(List.of(this.chatCompletionMessage), "gpt-3.5-turbo", 0.8, true));
```

请参阅 [OpenAiApi.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/api/OpenAiApi.java) 的 JavaDoc 了解更多信息。

### Low-level API Examples

* [OpenAiApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/api/OpenAiApiIT.java) 测试提供了一些如何使用轻量级库的一般示例。
* [OpenAiApiToolFunctionCallIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/api/tool/OpenAiApiToolFunctionCallIT.java) 测试展示了如何使用 low-level API 调用 tool functions。
基于 [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling/parallel-function-calling) 教程。

## Low-level OpenAiFileApi Client [[low-level-file-api]]

[OpenAiFileApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/api/OpenAiFileApi.java) 为 [OpenAI File API](https://platform.openai.com/docs/api-reference/files) 提供轻量级 Java 客户端，支持文件管理操作，例如上传、列出、检索、删除文件和访问文件内容。

以下是如何以编程方式使用 API 的简单示例：

```java
OpenAiFileApi openAiFileApi = OpenAiFileApi.builder()
			.apiKey(new SimpleApiKey(System.getenv("OPENAI_API_KEY")))
			.build();

// Upload a file
byte[] fileBytes = Files.readAllBytes(Paths.get("evals.jsonl")); 
OpenAiFileApi.UploadFileRequest uploadRequest = OpenAiFileApi.UploadFileRequest.builder()
			.file(fileBytes)
			.fileName("evals-data.jsonl")
			.purpose(OpenAiFileApi.Purpose.EVALS)
			.build();
ResponseEntity<OpenAiFileApi.FileObject> uploadResponse = openAiFileApi.uploadFile(uploadRequest);

// List files
OpenAiFileApi.ListFileRequest listRequest = OpenAiFileApi.ListFileRequest.builder()
			.purpose(OpenAiFileApi.Purpose.EVALS)
			.build();
ResponseEntity<OpenAiFileApi.FileObjectResponse> listResponse = openAiFileApi.listFiles(listRequest);

// Retrieve file information
ResponseEntity<OpenAiFileApi.FileObject> fileInfo = openAiFileApi.retrieveFile("file-id");

// Delete a file
ResponseEntity<OpenAiFileApi.DeleteFileResponse> deleteResponse = openAiFileApi.deleteFile("file-id");

// Retrieve file content
ResponseEntity<String> fileContent = openAiFileApi.retrieveFileContent("file-id");
```

### Low-level File API Examples

* [OpenAiFileApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/api/OpenAiFileApiIT.java) 测试提供了一些如何使用轻量级 file api 库的一般示例。

## API Key Management

Spring AI 通过 `ApiKey` 接口及其实现提供灵活的 API key 管理。默认实现 `SimpleApiKey` 适用于大多数用例，但您也可以为更复杂的场景创建自定义实现。

### Default Configuration

默认情况下，Spring Boot auto-configuration 将使用 `spring.ai.openai.api-key` 属性创建 API key bean：

```properties
spring.ai.openai.api-key=your-api-key-here
```

### Custom API Key Configuration

您可以使用构建器模式创建具有自己的 `ApiKey` 实现的 `OpenAiApi` 自定义实例：

```java
ApiKey customApiKey = new ApiKey() {
    @Override
    public String getValue() {
        // Custom logic to retrieve API key
        return "your-api-key-here";
    }
};

OpenAiApi openAiApi = OpenAiApi.builder()
    .apiKey(customApiKey)
    .build();

// Create a chat model with the custom OpenAiApi instance
OpenAiChatModel chatModel = OpenAiChatModel.builder()
    .openAiApi(openAiApi)
    .build();
// Build the ChatClient using the custom chat model
ChatClient openAiChatClient = ChatClient.builder(chatModel).build();
```

这在您需要以下情况时很有用：

* 从安全密钥存储中检索 API key
* 动态轮换 API keys
* 实现自定义 API key 选择逻辑

## Using Extra Parameters with OpenAI-Compatible Servers [[openai-compatible-servers]]

OpenAI 兼容的推理服务器（如 vLLM、Ollama 等）通常支持标准 OpenAI API 定义之外的其他参数。
例如，这些服务器可能接受 `top_k`、`repetition_penalty` 或其他官方 OpenAI API 不认识的采样控制参数。

`extraBody` 选项允许您向这些服务器传递任意参数。
在 `extraBody` 中提供的任何键值对都包含在 JSON 请求的顶层，使您能够利用服务器特定功能，同时使用 Spring AI 的 OpenAI 客户端。

> **重要：**
> `extraBody` 参数用于与 OpenAI 兼容的服务器，而不是官方 OpenAI API。
> 虽然官方 OpenAI API 会忽略未知参数，但它们在那里没有用处。
> 请始终查阅您特定服务器的文档以确定支持哪些参数。

### Configuration with Properties

您可以使用 Spring Boot 属性配置额外参数。
`spring.ai.openai.chat.options.extra-body` 下的每个属性都成为请求中的顶级参数：

```properties
spring.ai.openai.base-url=http://localhost:8000/v1
spring.ai.openai.chat.options.model=meta-llama/Llama-3-8B-Instruct
spring.ai.openai.chat.options.temperature=0.7
spring.ai.openai.chat.options.extra-body.top_k=50
spring.ai.openai.chat.options.extra-body.repetition_penalty=1.1
```

此配置将产生如下 JSON 请求：

```json
{
  "model": "meta-llama/Llama-3-8B-Instruct",
  "temperature": 0.7,
  "top_k": 50,
  "repetition_penalty": 1.1,
  "messages": [...]
}
```

### Runtime Configuration with Builder

您也可以使用选项构建器在运行时指定额外参数：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Tell me a creative story",
        OpenAiChatOptions.builder()
            .model("meta-llama/Llama-3-8B-Instruct")
            .temperature(0.7)
            .extraBody(Map.of(
                "top_k", 50,
                "repetition_penalty", 1.1,
                "frequency_penalty", 0.5
            ))
            .build()
    ));
```

### Example: vLLM Server

在 vLLM 上运行 Llama 模型时，您可能希望使用 vLLM 特定的采样参数：

```properties
spring.ai.openai.base-url=http://localhost:8000/v1
spring.ai.openai.chat.options.model=meta-llama/Llama-3-70B-Instruct
spring.ai.openai.chat.options.extra-body.top_k=40
spring.ai.openai.chat.options.extra-body.top_p=0.95
spring.ai.openai.chat.options.extra-body.repetition_penalty=1.05
spring.ai.openai.chat.options.extra-body.min_p=0.05
```

请参阅 [vLLM documentation](https://docs.vllm.ai/en/latest/) 以获取支持的采样参数的完整列表。

### Example: Ollama Server

通过 OpenAI 兼容的 endpoint 使用 Ollama 时，您可以传递 Ollama 特定的参数：

```java
OpenAiChatOptions options = OpenAiChatOptions.builder()
    .model("llama3.2")
    .extraBody(Map.of(
        "num_predict", 100,
        "top_k", 40,
        "repeat_penalty", 1.1
    ))
    .build();

ChatResponse response = chatModel.call(new Prompt("Generate text", options));
```

请查阅 [Ollama API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) 以获取可用参数。

> **注意：**
> `extraBody` 参数接受任何 `Map<String, Object>`，允许您传递目标服务器支持的任何参数。
> Spring AI 不会验证这些参数 - 它们直接传递给服务器。
> 这种设计为与各种 OpenAI 兼容实现一起工作提供了最大的灵活性。

### Reasoning Content from Reasoning Models

一些支持推理模型的 OpenAI 兼容服务器（如 DeepSeek R1、带有推理解析器的 vLLM）通过其 API 响应中的 `reasoning_content` 字段公开模型的内部 chain of thought。
此字段包含模型用于得出最终答案的逐步推理过程。

Spring AI 将此字段从 JSON 响应映射到 AssistantMessage metadata 中的 `reasoningContent` key。

> **重要：**
> **关于 `reasoning_content` 可用性的重要区别：**
>
> * **OpenAI 兼容服务器**（DeepSeek、vLLM）：在 Chat Completions API 响应中公开 `reasoning_content` ✅
> * **官方 OpenAI 模型**（GPT-5、o1、o3）：在 Chat Completions API 响应中**不**公开推理文本 ❌
>
> 官方 OpenAI 推理模型在使用 Chat Completions API 时隐藏 chain-of-thought 内容。
> 它们仅在 usage 统计信息中公开 `reasoning_tokens` 计数。
> 要从官方 OpenAI 模型访问实际推理文本，您必须使用 OpenAI 的 Responses API（此客户端目前不支持的单独 endpoint）。
>
> **回退行为：** 当服务器不提供 `reasoning_content` 时（例如，官方 OpenAI Chat Completions），`reasoningContent` metadata 字段将为空字符串。

#### Accessing Reasoning Content

使用兼容服务器时，您可以从响应 metadata 访问推理内容。

**直接使用 ChatModel：**

```java
// Configure to use DeepSeek R1 or vLLM with a reasoning model
ChatResponse response = chatModel.call(
    new Prompt("Which number is larger: 9.11 or 9.8?")
);

// Get the assistant message
AssistantMessage message = response.getResult().getOutput();

// Access the reasoning content from metadata
String reasoning = message.getMetadata().get("reasoningContent");
if (reasoning != null && !reasoning.isEmpty()) {
    System.out.println("Model's reasoning process:");
    System.out.println(reasoning);
}

// The final answer is in the regular content
System.out.println("\nFinal answer:");
System.out.println(message.getContent());
```

**使用 ChatClient：**

```java
ChatClient chatClient = ChatClient.create(chatModel);

String result = chatClient.prompt()
    .user("Which number is larger: 9.11 or 9.8?")
    .call()
    .chatResponse()
    .getResult()
    .getOutput()
    .getContent();

// To access reasoning content with ChatClient, retrieve the full response
ChatResponse response = chatClient.prompt()
    .user("Which number is larger: 9.11 or 9.8?")
    .call()
    .chatResponse();

AssistantMessage message = response.getResult().getOutput();
String reasoning = message.getMetadata().get("reasoningContent");
```

#### Streaming Reasoning Content

使用 streaming 响应时，推理内容像常规消息内容一样跨块累积：

```java
Flux<ChatResponse> responseFlux = chatModel.stream(
    new Prompt("Solve this logic puzzle...")
);

StringBuilder reasoning = new StringBuilder();
StringBuilder answer = new StringBuilder();

responseFlux.subscribe(chunk -> {
    AssistantMessage message = chunk.getResult().getOutput();

    // Accumulate reasoning if present
    String reasoningChunk = message.getMetadata().get("reasoningContent");
    if (reasoningChunk != null) {
        reasoning.append(reasoningChunk);
    }

    // Accumulate the final answer
    if (message.getContent() != null) {
        answer.append(message.getContent());
    }
});
```

#### Example: DeepSeek R1

DeepSeek R1 是一个公开其内部推理过程的推理模型：

```properties
spring.ai.openai.api-key=${DEEPSEEK_API_KEY}
spring.ai.openai.base-url=https://api.deepseek.com
spring.ai.openai.chat.options.model=deepseek-reasoner
```

当您向 DeepSeek R1 发出请求时，响应将包括推理内容（模型的思考过程）和最终答案。

请参阅 [DeepSeek API documentation](https://api-docs.deepseek.com/guides/reasoning_model) 以获取有关推理模型的更多详细信息。

#### Example: vLLM with Reasoning Parser

vLLM 在配置了推理解析器时支持推理模型：

```bash
vllm serve deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B \
    --enable-reasoning \
    --reasoning-parser deepseek_r1
```

```properties
spring.ai.openai.base-url=http://localhost:8000/v1
spring.ai.openai.chat.options.model=deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B
```

请查阅 [vLLM reasoning outputs documentation](https://docs.vllm.ai/en/latest/features/reasoning_outputs.html) 以获取支持的推理模型和解析器。

> **注意：**
> `reasoning_content` 的可用性完全取决于您使用的推理服务器。
> 并非所有 OpenAI 兼容服务器都公开推理内容，即使在使用支持推理的模型时也是如此。
> 请始终参考您服务器的 API 文档以了解响应中可用的字段。

