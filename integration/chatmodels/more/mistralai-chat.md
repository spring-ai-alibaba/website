# Mistral AI Chat

Spring AI 支持来自 Mistral AI 的各种 AI 语言模型。您可以与 Mistral AI 语言模型交互，并基于 Mistral 模型创建多语言对话助手。

> **提示：** Mistral AI 还提供 OpenAI API 兼容的 endpoint。
> 请查看 [OpenAI API compatibility](_openai_api_compatibility) 部分，了解如何使用 [Spring AI OpenAI](chat/openai-chat) 集成与 Mistral endpoint 通信。

## Prerequisites

您需要使用 Mistral AI 创建 API 才能访问 Mistral AI 语言模型。

在 [Mistral AI registration page](https://auth.mistral.ai/ui/registration) 创建账户，并在 [API Keys page](https://console.mistral.ai/api-keys/) 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.mistralai.api-key` 的配置属性，您应将其设置为从 console.mistral.ai 获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.mistralai.api-key=<your-mistralai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    mistralai:
      api-key: ${MISTRALAI_API_KEY}
```

```bash
# In your environment or .env file
export MISTRALAI_API_KEY=<your-mistralai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("MISTRALAI_API_KEY");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Mistral AI Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-mistral-ai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-mistral-ai'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

#### Retry Properties

前缀 `spring.ai.retry` 是用于配置 Mistral AI chat model 的 retry 机制的属性前缀。

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

前缀 `spring.ai.mistralai` 是用于连接到 OpenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.mistralai.base-url | 要连接到的 URL | https://api.mistral.ai |
| spring.ai.mistralai.api-key | API Key | - |

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=mistral（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 mistral 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.mistralai.chat` 是用于配置 Mistral AI 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.mistralai.chat.enabled (Removed and no longer valid) | 启用 Mistral AI chat model。 | true |
| spring.ai.model.chat | 启用 Mistral AI chat model。 | mistral |
| spring.ai.mistralai.chat.base-url | 可选覆盖 `spring.ai.mistralai.base-url` 属性以提供 chat 特定的 URL。 | - |
| spring.ai.mistralai.chat.api-key | 可选覆盖 `spring.ai.mistralai.api-key` 以提供 chat 特定的 API Key。 | - |
| spring.ai.mistralai.chat.options.model | 要使用的 Mistral AI Chat model | `open-mistral-7b`、`open-mixtral-8x7b`、`open-mixtral-8x22b`、`mistral-small-latest`、`mistral-large-latest` |
| spring.ai.mistralai.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。不建议为同一个 completions 请求修改 `temperature` 和 `top_p`，因为这两个设置的交互很难预测。 | 0.8 |
| spring.ai.mistralai.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。 | - |
| spring.ai.mistralai.chat.options.safePrompt | 指示是否在所有对话之前注入安全 prompt。 | false |
| spring.ai.mistralai.chat.options.randomSeed | 此功能处于 Beta 阶段。如果指定，我们的系统将尽最大努力进行确定性采样，以便使用相同的 seed 和参数重复请求应返回相同的结果。 | - |
| spring.ai.mistralai.chat.options.stop | 如果检测到此 token，则停止生成。或者在提供数组时检测到这些 tokens 之一。 | - |
| spring.ai.mistralai.chat.options.topP | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法，其中模型考虑具有 top_p 概率质量的 tokens 结果。因此，0.1 意味着只考虑包含 top 10% 概率质量的 tokens。我们通常建议修改此值或 `temperature`，但不要同时修改两者。 | - |
| spring.ai.mistralai.chat.options.responseFormat | 指定模型必须输出的格式的对象。设置为 `{ "type": "json_object" }` 启用 JSON mode，这保证了模型生成的消息是有效的 JSON。 | - |
| spring.ai.mistralai.chat.options.tools | 模型可以调用的工具列表。目前，仅支持 functions 作为工具。使用此选项提供模型可能为其生成 JSON 输入的 functions 列表。 | - |
| spring.ai.mistralai.chat.options.toolChoice | 控制模型调用哪个（如果有）function。`none` 意味着模型不会调用 function，而是生成消息。`auto` 意味着模型可以在生成消息或调用 function 之间进行选择。通过 `{"type: "function", "function": {"name": "my_function"}}` 指定特定 function 会强制模型调用该 function。当没有 functions 时，`none` 是默认值。如果存在 functions，`auto` 是默认值。 | - |
| spring.ai.mistralai.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.mistralai.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.mistralai.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |

> **注意：** 您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.mistralai.base-url` 和 `spring.ai.mistralai.api-key`。
> 如果设置了 `spring.ai.mistralai.chat.base-url` 和 `spring.ai.mistralai.chat.api-key` 属性，则优先于通用属性。
> 如果您想对不同的模型和不同的模型端点使用不同的 Mistral AI 账户，这很有用。

> **提示：** 所有前缀为 `spring.ai.mistralai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime Options [[chat-options]]

[MistralAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/MistralAiChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `MistralAiChatModel(api, options)` 构造函数或 `spring.ai.mistralai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        MistralAiChatOptions.builder()
            .model(MistralAiApi.ChatModel.LARGE.getValue())
            .temperature(0.5)
        .build()
    ));
```

> **提示：** 除了模型特定的 [MistralAiChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/MistralAiChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Function Calling

您可以将自定义 Java functions 注册到 `MistralAiChatModel`，并让 Mistral AI 模型智能地选择输出包含参数以调用一个或多个已注册 functions 的 JSON 对象。
这是一种将 LLM 功能与外部工具和 APIs 连接的强大技术。
了解更多关于 [Tool Calling](tools)。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。
Mistral AI 支持文本和视觉模态。

### Vision

提供 vision multimodal 支持的 Mistral AI 模型包括 `pixtral-large-latest`。
请参阅 [Vision](https://docs.mistral.ai/capabilities/vision/) 指南了解更多信息。

Mistral AI [User Message API](https://docs.mistral.ai/api/#tag/chat/operation/chat_completion_v1_chat_completions_post) 可以在消息中包含 base64 编码的图像或图像 URL 列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-client-chat/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。

以下是从 `MistralAiChatModelIT.java` 中摘取的代码示例，说明了用户文本与图像的融合。

```java
var imageResource = new ClassPathResource("/multimodal.test.png");

var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG, this.imageResource));

ChatResponse response = chatModel.call(new Prompt(this.userMessage,
        ChatOptions.builder().model(MistralAiApi.ChatModel.PIXTRAL_LARGE.getValue()).build()));
```

或图像 URL 等效方式：

```java
var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG,
                URI.create("https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png")));

ChatResponse response = chatModel.call(new Prompt(this.userMessage,
        ChatOptions.builder().model(MistralAiApi.ChatModel.PIXTRAL_LARGE.getValue()).build()));
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

## OpenAI API Compatibility

Mistral 与 OpenAI API 兼容，您可以使用 [Spring AI OpenAI](chat/openai-chat) 客户端与 Mistrial 通信。
为此，您需要将 OpenAI base URL 配置为 Mistral AI 平台：`spring.ai.openai.chat.base-url=https://api.mistral.ai`，并选择 Mistral 模型：`spring.ai.openai.chat.options.model=mistral-small-latest` 并设置 Mistral AI API key：`spring.ai.openai.chat.api-key=<YOUR MISTRAL API KEY`。

查看 [MistralWithOpenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/chat/proxy/MistralWithOpenAiChatModelIT.java) 测试以了解通过 Spring AI OpenAI 使用 Mistral 的示例。

## Sample Controller (Auto-configuration)

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-mistral-ai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 Mistral AI chat model：

```properties
spring.ai.mistralai.api-key=YOUR_API_KEY
spring.ai.mistralai.chat.options.model=mistral-small
spring.ai.mistralai.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 Mistral AI 凭据。

这将创建一个 `MistralAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@RestController` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final MistralAiChatModel chatModel;

    @Autowired
    public ChatController(MistralAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map<String,String> generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", this.chatModel.call(message));
    }

    @GetMapping("/ai/generateStream")
	public Flux<ChatResponse> generateStream(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        var prompt = new Prompt(new UserMessage(message));
        return this.chatModel.stream(prompt);
    }
}
```

## Manual Configuration

[MistralAiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/MistralAiChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 【low-level-api】 连接到 Mistral AI 服务。

将 `spring-ai-mistral-ai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mistral-ai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-mistral-ai'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `MistralAiChatModel` 并将其用于文本生成：

```java
var mistralAiApi = new MistralAiApi(System.getenv("MISTRAL_AI_API_KEY"));

var chatModel = new MistralAiChatModel(this.mistralAiApi, MistralAiChatOptions.builder()
                .model(MistralAiApi.ChatModel.LARGE.getValue())
                .temperature(0.4)
                .maxTokens(200)
                .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> response = this.chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

`MistralAiChatOptions` 提供 chat 请求的配置信息。
`MistralAiChatOptions.Builder` 是一个流畅的选项构建器。

### Low-level MistralAiApi Client [[low-level-api]]

[MistralAiApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/api/MistralAiApi.java) 为 [Mistral AI API](https://docs.mistral.ai/api/) 提供轻量级 Java 客户端。

以下是如何以编程方式使用 API 的简单示例：

```java
MistralAiApi mistralAiApi = new MistralAiApi(System.getenv("MISTRAL_AI_API_KEY"));

ChatCompletionMessage chatCompletionMessage =
    new ChatCompletionMessage("Hello world", Role.USER);

// Sync request
ResponseEntity<ChatCompletion> response = this.mistralAiApi.chatCompletionEntity(
    new ChatCompletionRequest(List.of(this.chatCompletionMessage), MistralAiApi.ChatModel.LARGE.getValue(), 0.8, false));

// Streaming request
Flux<ChatCompletionChunk> streamResponse = this.mistralAiApi.chatCompletionStream(
        new ChatCompletionRequest(List.of(this.chatCompletionMessage), MistralAiApi.ChatModel.LARGE.getValue(), 0.8, true));
```

请参阅 [MistralAiApi.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/api/MistralAiApi.java) 的 JavaDoc 了解更多信息。

#### MistralAiApi Samples

* [MistralAiApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/test/java/org/springframework/ai/mistralai/api/MistralAiApiIT.java) 测试提供了一些如何使用轻量级库的一般示例。
* [PaymentStatusFunctionCallingIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/test/java/org/springframework/ai/mistralai/api/tool/PaymentStatusFunctionCallingIT.java) 测试展示了如何使用 low-level API 调用 tool functions。
基于 [Mistral AI Function Calling](https://docs.mistral.ai/guides/function-calling/) 教程。

## Mistral AI OCR

Spring AI 支持使用 Mistral AI 进行 Optical Character Recognition (OCR)。这允许您从文档中提取文本和图像数据。

## Prerequisites

您需要使用 Mistral AI 创建 API 才能访问 Mistral AI 语言模型。
在 [Mistral AI registration page](https://auth.mistral.ai/ui/registration) 创建账户，并在 [API Keys page](https://console.mistral.ai/api-keys/) 生成 token。

### Add Dependencies

要使用 Mistral AI OCR API，您需要将 `spring-ai-mistral-ai` 依赖项添加到您的项目中。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mistral-ai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-mistral-ai'
}
```

### Low-level MistralOcrApi Client

[MistralOcrApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/api/MistralOcrApi.java) 为 [Mistral AI OCR API](https://docs.mistral.ai/api/#tag/OCR) 提供轻量级 Java 客户端。

以下是如何以编程方式使用 API 的简单示例：

```java
MistralOcrApi mistralAiApi = new MistralOcrApi(System.getenv("MISTRAL_AI_API_KEY"));

String documentUrl = "https://arxiv.org/pdf/2201.04234";
MistralOcrApi.OCRRequest request = new MistralOcrApi.OCRRequest(
        MistralOcrApi.OCRModel.MISTRAL_OCR_LATEST.getValue(), "test_id",
        new MistralOcrApi.OCRRequest.DocumentURLChunk(documentUrl), List.of(0, 1, 2), true, 5, 50);

ResponseEntity<MistralOcrApi.OCRResponse> response = mistralAiApi.ocr(request);
```

请参阅 [MistralOcrApi.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/api/MistralOcrApi.java) 的 JavaDoc 了解更多信息。

#### MistralOcrApi Sample

* [MistralOcrApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/test/java/org/springframework/ai/mistralai/api/MistralOcrApiIT.java) 测试提供了一些如何使用轻量级库的一般示例。

