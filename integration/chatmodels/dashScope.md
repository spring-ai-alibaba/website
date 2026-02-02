---
sidebar_position: 1
---

# DashScope

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入阿里云 DashScope 系列模型。在开始学习之前，请确保您已经了解相关概念。

## DashScope 平台

灵积通过灵活、易用的模型 API 服务，让各种模态模型的能力，都能方便的为 AI 开发者所用。通过灵积 API，开发者不仅可以直接集成大模型的强大能力，也可以对模型进行训练微调，实现模型定制化。

## Prerequisites

您需要使用阿里云 DashScope 创建 API Key 才能访问 DashScope 模型。

在 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建账户，并在 [API Keys 页面](https://dashscope.console.aliyun.com/apiKey) 生成 API Key。

Spring AI Alibaba 项目定义了一个名为 `spring.ai.dashscope.api-key` 的配置属性，您应将其设置为从 DashScope 控制台获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.dashscope.api-key=<your-dashscope-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```

```bash
# In your environment or .env file
export AI_DASHSCOPE_API_KEY=<your-dashscope-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("AI_DASHSCOPE_API_KEY");
```

### Add Repositories and BOM

Spring AI Alibaba artifacts 发布在 Maven Central 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI Alibaba 提供了 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI Alibaba。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建系统中。

## Auto-configuration

Spring AI Alibaba 为 DashScope Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

### Chat Properties

#### Retry Properties

前缀 `spring.ai.retry` 是用于配置 DashScope chat model 的 retry 机制的属性前缀。

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

前缀 `spring.ai.dashscope` 是用于连接到 DashScope 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.dashscope.base-url | 要连接到的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.api-key | API Key | - |
| spring.ai.dashscope.work-space-id | 可选地，您可以指定用于 API 请求的工作空间 ID。 | - |

> **提示：** 对于属于多个工作空间的用户，您可以可选地指定用于 API 请求的工作空间 ID。
> 这些 API 请求的使用量将计入指定工作空间的使用量。

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=dashscope（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 dashscope 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.dashscope.chat` 是用于配置 DashScope 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.chat | 启用 DashScope chat model。 | dashscope |
| spring.ai.dashscope.chat.base-url | 可选覆盖 `spring.ai.dashscope.base-url` 属性以提供 chat 特定的 URL。 | - |
| spring.ai.dashscope.chat.completions-path | 要附加到 base URL 的路径。 | `/api/v1/services/aigc/text-generation/generation` |
| spring.ai.dashscope.chat.api-key | 可选覆盖 `spring.ai.dashscope.api-key` 以提供 chat 特定的 API Key。 | - |
| spring.ai.dashscope.chat.work-space-id | 可选地，您可以指定用于 API 请求的工作空间 ID。 | - |
| spring.ai.dashscope.chat.options.model | 要使用的 DashScope chat model 名称。您可以在以下模型之间选择：`qwen-plus`、`qwen-turbo`、`qwen-max`、`qwen-max-longcontext`、`qwen-vl-plus`、`qwen-vl-max` 等。有关更多信息，请参阅 [DashScope 模型列表](https://help.aliyun.com/zh/model-studio/getting-started/models)。 | `qwen-plus` |
| spring.ai.dashscope.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。范围：[0, 2)，系统默认：0.85。不建议为同一个 completions 请求修改 `temperature` 和 `top_p`，因为这两个设置的交互很难预测。 | 0.85 |
| spring.ai.dashscope.chat.options.topP | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法，其中模型考虑具有 `top_p` 概率质量的 tokens 结果。因此，0.1 意味着只考虑包含 top 10% 概率质量的 tokens。范围：(0, 1.0)，默认：0.8。我们通常建议修改此值或 `temperature`，但不要同时修改两者。 | 0.8 |
| spring.ai.dashscope.chat.options.topK | 采样候选池的大小（top-k）。例如，top_k = 50 意味着只考虑 50 个得分最高的 tokens 进行随机采样。较大的值增加随机性；较小的值增加确定性。注意：如果 top_k 为 null 或 > 100，则禁用 top-k，仅应用 top-p。默认值为 null（即禁用）。 | - |
| spring.ai.dashscope.chat.options.seed | 用于生成的随机种子，由用户控制以影响可重现性。Seed 支持无符号 64 位整数。当提供 seed 时，模型将尝试生成相同或相似的结果，但不保证完全可重现性。 | - |
| spring.ai.dashscope.chat.options.stop | 最多 4 个序列，API 将停止生成更多 tokens。支持传入字符串数组或 token_ids 数组。 | - |
| spring.ai.dashscope.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。 | - |
| spring.ai.dashscope.chat.options.maxInputTokens | 输入的最大 tokens 数。 | - |
| spring.ai.dashscope.chat.options.repetitionPenalty | 用于控制模型生成过程中的重复程度。增加 repetition_penalty 可以减少模型生成的重复程度。值为 1.0 表示无惩罚。默认值为 1.1。 | 1.1 |
| spring.ai.dashscope.chat.options.enableSearch | 模型内置了互联网搜索服务。此参数控制模型在生成文本时是否参考和使用互联网搜索结果。true：启用互联网搜索。false（默认）：禁用互联网搜索。 | false |
| spring.ai.dashscope.chat.options.searchOptions | 联网搜索的策略。仅在 enable_search 为 true 时生效。 | - |
| spring.ai.dashscope.chat.options.responseFormat | 模型可以指定返回内容的格式。有效值：`{"type": "text"}` 或 `{"type": "json_object"}`。 | - |
| spring.ai.dashscope.chat.options.incrementalOutput | 控制是否在流式输出模式下启用增量输出，即后续输出内容是否包含之前输出的内容。当设置为 true 时，将启用增量输出模式，后续输出不会包含之前输出的内容。您需要自己拼接整体输出。当设置为 false 时，后续输出将包含之前输出的内容。 | true |
| spring.ai.dashscope.chat.options.tools | 模型可以调用的工具列表。目前，仅支持 functions 作为工具。使用此选项提供模型可能为其生成 JSON 输入的 functions 列表。 | - |
| spring.ai.dashscope.chat.options.toolChoice | 控制模型调用哪个（如果有）function。`none` 意味着模型不会调用 function，而是生成消息。`auto` 意味着模型可以在生成消息或调用 function 之间进行选择。通过 `{"type": "function", "function": {"name": "my_function"}}` 指定特定 function 会强制模型调用该 function。当没有 functions 时，`none` 是默认值。如果存在 functions，`auto` 是默认值。 | - |
| spring.ai.dashscope.chat.options.parallelToolCalls | 是否在工具使用期间启用并行 function calling。 | - |
| spring.ai.dashscope.chat.options.enableThinking | 是否启用模型的思考过程。适用于 Qwen3 全系统模型。 | false |
| spring.ai.dashscope.chat.options.thinkingBudget | 思考过程的最大长度，在 enable_thinking 为 true 时生效，适用于 Qwen3 全系统模型。 | - |
| spring.ai.dashscope.chat.options.vlHighResolutionImages | 将 token 限制更改为 16384 用于 vl 模型，仅支持 vl 模型，包括 qwen-vl-max、qwen-vl-max-0809、qwen-vl-plus-0809。 | - |
| spring.ai.dashscope.chat.options.vlEnableImageHwOutput | 是否启用视觉语言模型的图像硬件输出。 | false |
| spring.ai.dashscope.chat.options.multiModel | 指示请求是否涉及多个模型。 | false |
| spring.ai.dashscope.chat.options.modalities | 您希望模型为此请求生成的输出类型。大多数模型能够生成文本，这是默认值。某些模型也可以用于生成音频。 | - |
| spring.ai.dashscope.chat.options.audio | 音频生成的音频参数。当通过 `modalities`: `audio` 请求音频输出时必需。 | - |
| spring.ai.dashscope.chat.options.asrOptions | 自动语音识别（ASR）选项。 | - |
| spring.ai.dashscope.chat.options.ocrOptions | OCR（光学字符识别）选项。 | - |
| spring.ai.dashscope.chat.options.logprobs | 是否返回每个输出 token 的对数概率。 | - |
| spring.ai.dashscope.chat.options.topLogProbs | 返回每个输出 token 的 top logprobs 数量。 | - |
| spring.ai.dashscope.chat.options.translationOptions | 翻译选项。 | - |
| spring.ai.dashscope.chat.options.outputFormat | 输出格式。 | - |
| spring.ai.dashscope.chat.options.streamOptions | 流式选项。 | - |
| spring.ai.dashscope.chat.options.httpHeaders | 要添加到 chat completion 请求的可选 HTTP headers。 | - |
| spring.ai.dashscope.chat.options.toolNames | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.dashscope.chat.options.toolCallbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.dashscope.chat.options.internalToolExecutionEnabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |

> **注意：** 您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.dashscope.base-url` 和 `spring.ai.dashscope.api-key`。
> 如果设置了 `spring.ai.dashscope.chat.base-url` 和 `spring.ai.dashscope.chat.api-key` 属性，则优先于通用属性。
> 如果您想对不同的模型和不同的模型端点使用不同的 DashScope 账户，这很有用。

> **提示：** 所有前缀为 `spring.ai.dashscope.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime Options [[chat-options]]

[DashScopeChatOptions.java](https://github.com/alibaba/spring-ai-alibaba/blob/main/dashscope/chat/DashScopeChatOptions.java) 类提供模型配置，例如要使用的模型、temperature、top_p、top_k 等。

在启动时，可以使用 `DashScopeChatModel(api, options)` 构造函数或 `spring.ai.dashscope.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        DashScopeChatOptions.builder()
            .model("qwen-max")
            .temperature(0.4)
            .topP(0.7)
            .topK(50)
            .build()
    ));
```

> **提示：** 除了模型特定的 [DashScopeChatOptions](https://github.com/alibaba/spring-ai-alibaba/blob/main/dashscope/chat/DashScopeChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Function Calling

您可以将自定义 Java functions 注册到 `DashScopeChatModel`，并让 DashScope 模型智能地选择输出包含参数以调用一个或多个已注册 functions 的 JSON 对象。
这是一种将 LLM 功能与外部工具和 APIs 连接的强大技术。
了解更多关于 [Tool Calling](../toolcalls/tool-calls)。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。
DashScope 支持文本、视觉、音频和视频输入模态。

### Vision

提供 vision multimodal 支持的 DashScope 模型包括 `qwen-vl-plus`、`qwen-vl-max` 等。
请参阅 [DashScope 视觉模型文档](https://help.aliyun.com/zh/model-studio/getting-started/models) 了解更多信息。

DashScope [User Message API](https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9) 可以在消息中包含 base64 编码的图像或图像 URL 列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。

以下代码示例说明了使用 `qwen-vl-plus` 模型将用户文本与图像融合：

```java
var imageResource = new ClassPathResource("/multimodal.test.png");

var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG, imageResource));

ChatResponse response = chatModel.call(new Prompt(userMessage,
        DashScopeChatOptions.builder().model("qwen-vl-plus").build()));
```

或使用图像 URL 等效方式：

```java
var userMessage = new UserMessage("Explain what do you see on this picture?",
        new Media(MimeTypeUtils.IMAGE_PNG,
                URI.create("https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png")));

ChatResponse response = chatModel.call(new Prompt(userMessage,
        DashScopeChatOptions.builder().model("qwen-vl-plus").build()));
```

> **提示：** 您也可以传递多个图像。

### Video

提供视频输入 multimodal 支持的 DashScope 模型包括支持视频理解的模型。
请参阅 [DashScope 模型文档](https://help.aliyun.com/zh/model-studio/getting-started/models) 了解更多信息。

DashScope [User Message API](https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9) 可以在消息中包含 base64 编码的视频文件列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。

以下代码示例说明了使用 DashScope 模型将用户文本与视频文件融合：

```java
import com.alibaba.cloud.ai.dashscope.chat.MessageFormat;
import com.alibaba.cloud.ai.dashscope.common.DashScopeApiConstants;

var videoResource = new ClassPathResource("sample-video.mp4");

var userMessage = new UserMessage("What is happening in this video?",
        List.of(new Media(MimeTypeUtils.parseMimeType("video/mp4"), videoResource)));

// 设置消息格式为 VIDEO
userMessage.getMetadata().put(DashScopeApiConstants.MESSAGE_FORMAT, MessageFormat.VIDEO);

ChatResponse response = chatModel.call(new Prompt(List.of(userMessage),
        DashScopeChatOptions.builder().model("qwen-vl-max").build()));
```

> **提示：** 您也可以传递多个视频文件。使用视频时，需要在消息的 metadata 中设置 `MESSAGE_FORMAT` 为 `MessageFormat.VIDEO`。

### Audio

提供音频输入 multimodal 支持的 DashScope 模型包括支持音频理解的模型。
请参阅 [DashScope 模型文档](https://help.aliyun.com/zh/model-studio/getting-started/models) 了解更多信息。

DashScope [User Message API](https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9) 可以在消息中包含 base64 编码的音频文件列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `org.springframework.core.io.Resource` 来存储原始媒体数据。

以下代码示例说明了使用 DashScope 模型将用户文本与音频文件融合：

```java
import com.alibaba.cloud.ai.dashscope.chat.MessageFormat;
import com.alibaba.cloud.ai.dashscope.common.DashScopeApiConstants;

var audioResource = new ClassPathResource("speech1.mp3");

var userMessage = new UserMessage("What is this recording about?",
        List.of(new Media(MimeTypeUtils.parseMimeType("audio/mp3"), audioResource)));

// 设置消息格式为 AUDIO
userMessage.getMetadata().put(DashScopeApiConstants.MESSAGE_FORMAT, MessageFormat.AUDIO);

ChatResponse response = chatModel.call(new Prompt(List.of(userMessage),
        DashScopeChatOptions.builder().model("qwen-audio-turbo").build()));
```

> **提示：** 您也可以传递多个音频文件。使用音频时，需要在消息的 metadata 中设置 `MESSAGE_FORMAT` 为 `MessageFormat.AUDIO`。

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-alibaba-starter-dashscope` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 DashScope chat model：

```properties
spring.ai.dashscope.api-key=YOUR_API_KEY
spring.ai.dashscope.chat.options.model=qwen-plus
spring.ai.dashscope.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 DashScope 凭据。

这将创建一个 `DashScopeChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@RestController` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final ChatModel chatModel;

    @Autowired
    public ChatController(ChatModel chatModel) {
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

[DashScopeChatModel](https://github.com/alibaba/spring-ai-alibaba/blob/main/dashscope/chat/DashScopeChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 `low-level-api` 连接到 DashScope 服务。

将 `spring-ai-alibaba-dashscope` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-dashscope</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-dashscope'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

接下来，创建一个 `DashScopeChatModel` 并将其用于文本生成：

```java
var dashScopeApi = DashScopeApi.builder()
            .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
            .build();
var dashScopeChatOptions = DashScopeChatOptions.builder()
            .model("qwen-plus")
            .temperature(0.4)
            .maxTokens(200)
            .build();
var chatModel = new DashScopeChatModel(dashScopeApi, dashScopeChatOptions, 
            toolCallingManager, retryTemplate, observationRegistry);

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> response = this.chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

`DashScopeChatOptions` 提供 chat 请求的配置信息。
`DashScopeApi.Builder` 和 `DashScopeChatOptions.Builder` 分别是 API 客户端和 chat 配置的流畅选项构建器。

## Low-level DashScopeApi Client [[low-level-api]]

[DashScopeApi](https://github.com/alibaba/spring-ai-alibaba/blob/main/dashscope/api/DashScopeApi.java) 为 [DashScope Chat API](https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9) 提供轻量级 Java 客户端。

以下是如何以编程方式使用 API 的简单示例：

```java
DashScopeApi dashScopeApi = DashScopeApi.builder()
            .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
            .build();

ChatCompletionMessage chatCompletionMessage =
    new ChatCompletionMessage("Hello world", ChatCompletionMessage.Role.USER);

// Sync request
ResponseEntity<ChatCompletion> response = this.dashScopeApi.chatCompletionEntity(
    new ChatCompletionRequest("qwen-plus", 
        new ChatCompletionRequestInput(List.of(chatCompletionMessage)), 
        new ChatCompletionRequestParameter(), false, false));

// Streaming request
Flux<ChatCompletionChunk> streamResponse = this.dashScopeApi.chatCompletionStream(
        new ChatCompletionRequest("qwen-plus",
            new ChatCompletionRequestInput(List.of(chatCompletionMessage)),
            new ChatCompletionRequestParameter(), true, false));
```

请参阅 [DashScopeApi.java](https://github.com/alibaba/spring-ai-alibaba/blob/main/dashscope/api/DashScopeApi.java) 的 JavaDoc 了解更多信息。

## API Key Management

Spring AI Alibaba 通过 `ApiKey` 接口及其实现提供灵活的 API key 管理。默认实现 `SimpleApiKey` 适用于大多数用例，但您也可以为更复杂的场景创建自定义实现。

### Default Configuration

默认情况下，Spring Boot auto-configuration 将使用 `spring.ai.dashscope.api-key` 属性创建 API key bean：

```properties
spring.ai.dashscope.api-key=your-api-key-here
```

### Custom API Key Configuration

您可以使用构建器模式创建具有自己的 `ApiKey` 实现的 `DashScopeApi` 自定义实例：

```java
ApiKey customApiKey = new ApiKey() {
    @Override
    public String getValue() {
        // Custom logic to retrieve API key
        return "your-api-key-here";
    }
};

DashScopeApi dashScopeApi = DashScopeApi.builder()
    .apiKey(customApiKey)
    .build();

// Create a chat model with the custom DashScopeApi instance
DashScopeChatModel chatModel = DashScopeChatModel.builder()
    .dashScopeApi(dashScopeApi)
    .build();
```

这在您需要以下情况时很有用：

* 从安全密钥存储中检索 API key
* 动态轮换 API keys
* 实现自定义 API key 选择逻辑

## Reasoning Content from Reasoning Models

一些支持推理模型的 DashScope 模型（如 Qwen3 系列）通过启用 `enable_thinking` 参数可以公开模型的内部 chain of thought。
此字段包含模型用于得出最终答案的逐步推理过程。

Spring AI Alibaba 将此字段从 JSON 响应映射到 AssistantMessage metadata 中的 `reasoningContent` key。

### Accessing Reasoning Content

使用支持推理的模型时，您可以从响应 metadata 访问推理内容。

**直接使用 ChatModel：**

```java
// Configure to use Qwen3 with thinking enabled
DashScopeChatOptions options = DashScopeChatOptions.builder()
    .model("qwen3")
    .enableThinking(true)
    .thinkingBudget(1000)
    .build();

ChatResponse response = chatModel.call(
    new Prompt("Which number is larger: 9.11 or 9.8?", options));

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

### Streaming Reasoning Content

使用 streaming 响应时，推理内容像常规消息内容一样跨块累积：

```java
DashScopeChatOptions options = DashScopeChatOptions.builder()
    .model("qwen3")
    .enableThinking(true)
    .thinkingBudget(1000)
    .build();

Flux<ChatResponse> responseFlux = chatModel.stream(
    new Prompt("Solve this logic puzzle...", options));

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

> **注意：**
> `reasoningContent` 的可用性完全取决于您使用的模型和是否启用了 `enable_thinking` 参数。
> 请始终参考 DashScope 模型文档以了解哪些模型支持推理功能。
