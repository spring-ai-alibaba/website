# OpenAI SDK Chat (Official)

Spring AI 通过 OpenAI Java SDK 支持 OpenAI 的语言模型，提供与 OpenAI 服务（包括 Microsoft Foundry 和 GitHub Models）的稳健且官方维护的集成。

> **注意：** 此实现使用来自 OpenAI 的官方 [OpenAI Java SDK](https://github.com/openai/openai-java)。对于替代的 Spring AI 实现，请参阅 [OpenAI Chat](chat/openai-chat)。

OpenAI SDK 模块根据您提供的 base URL 自动检测服务提供商（OpenAI、Microsoft Foundry 或 GitHub Models）。

## Authentication

身份验证使用 base URL 和 API Key 完成。该实现通过 Spring Boot 属性或环境变量提供灵活的配置选项。

### Using OpenAI

如果您直接使用 OpenAI，请在 [OpenAI signup page](https://platform.openai.com/signup) 创建账户，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 API key。

base URL 不需要设置，因为它默认为 `https://api.openai.com/v1`：

```properties
spring.ai.openai-sdk.api-key=<your-openai-api-key>
# base-url is optional, defaults to https://api.openai.com/v1
```

或使用环境变量：

```bash
export OPENAI_API_KEY=<your-openai-api-key>
# OPENAI_BASE_URL is optional, defaults to https://api.openai.com/v1
```

### Using Microsoft Foundry

使用 Microsoft Foundry URL 时会自动检测 Microsoft Foundry。您可以使用属性配置它：

```properties
spring.ai.openai-sdk.base-url=https://<your-deployment-url>.openai.azure.com
spring.ai.openai-sdk.api-key=<your-api-key>
spring.ai.openai-sdk.microsoft-deployment-name=<your-deployment-name>
```

或使用环境变量：

```bash
export OPENAI_BASE_URL=https://<your-deployment-url>.openai.azure.com
export OPENAI_API_KEY=<your-api-key>
```

**Passwordless Authentication (Recommended for Azure):**

Microsoft Foundry 支持无密码身份验证，无需提供 API key，这在 Azure 上运行时更安全。

要启用无密码身份验证，请添加 `com.azure:azure-identity` 依赖项：

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

然后配置时不使用 API key：

```properties
spring.ai.openai-sdk.base-url=https://<your-deployment-url>.openai.azure.com
spring.ai.openai-sdk.microsoft-deployment-name=<your-deployment-name>
# No api-key needed - will use Azure credentials from environment
```

### Using GitHub Models

使用 GitHub Models base URL 时会自动检测 GitHub Models。您需要创建一个具有 `models:read` 范围的 GitHub Personal Access Token (PAT)。

```properties
spring.ai.openai-sdk.base-url=https://models.inference.ai.azure.com
spring.ai.openai-sdk.api-key=github_pat_XXXXXXXXXXX
```

或使用环境变量：

```bash
export OPENAI_BASE_URL=https://models.inference.ai.azure.com
export OPENAI_API_KEY=github_pat_XXXXXXXXXXX
```

> **提示：** 为了在处理敏感信息（如 API keys）时增强安全性，您可以在属性中使用 Spring Expression Language (SpEL)：

```properties
spring.ai.openai-sdk.api-key=${OPENAI_API_KEY}
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

Spring AI 为 OpenAI SDK Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai-sdk</artifactId>
</dependency>
```

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai-sdk'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Configuration Properties

#### Connection Properties

前缀 `spring.ai.openai-sdk` 是用于配置 OpenAI SDK 客户端的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.base-url | 要连接到的 URL。如果未设置，则从 `OPENAI_BASE_URL` 环境变量自动检测。 | https://api.openai.com/v1 |
| spring.ai.openai-sdk.api-key | API Key。如果未设置，则从 `OPENAI_API_KEY` 环境变量自动检测。 | - |
| spring.ai.openai-sdk.organization-id | 可选指定用于 API 请求的组织。 | - |
| spring.ai.openai-sdk.timeout | 请求超时持续时间。 | - |
| spring.ai.openai-sdk.max-retries | 失败请求的最大重试次数。 | - |
| spring.ai.openai-sdk.proxy | OpenAI 客户端的代理设置（Java `Proxy` 对象）。 | - |
| spring.ai.openai-sdk.custom-headers | 要在请求中包含的自定义 HTTP headers。header 名称到 header 值的映射。 | - |

#### Microsoft Foundry (Azure OpenAI) Properties

OpenAI SDK 实现为 Microsoft Foundry (Azure OpenAI) 提供原生支持，并自动配置：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.microsoft-foundry | 启用 Microsoft Foundry 模式。如果 base URL 包含 `openai.azure.com`、`cognitiveservices.azure.com` 或 `.openai.microsoftFoundry.com`，则自动检测。 | false |
| spring.ai.openai-sdk.microsoft-deployment-name | Microsoft Foundry 部署名称。如果未指定，将使用模型名称。也可通过别名 `deployment-name` 访问。 | - |
| spring.ai.openai-sdk.microsoft-foundry-service-version | Microsoft Foundry API 服务版本。 | - |
| spring.ai.openai-sdk.credential | 用于无密码身份验证的凭据对象（需要 `com.azure:azure-identity` 依赖项）。 | - |

> **提示：** Microsoft Foundry 支持无密码身份验证。添加 `com.azure:azure-identity` 依赖项，当未提供 API key 时，实现将自动尝试使用环境中的 Azure 凭据。

#### GitHub Models Properties

提供对 GitHub Models 的原生支持：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.github-models | 启用 GitHub Models 模式。如果 base URL 包含 `models.github.ai` 或 `models.inference.ai.azure.com`，则自动检测。 | false |

> **提示：** GitHub Models 需要一个具有 `models:read` 范围的 Personal Access Token。通过 `OPENAI_API_KEY` 环境变量或 `spring.ai.openai-sdk.api-key` 属性设置它。

#### Chat Model Properties

前缀 `spring.ai.openai-sdk.chat` 是用于配置 chat model 实现的属性前缀：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.chat.options.model | 要使用的 OpenAI chat model 名称。您可以在以下模型之间选择：`gpt-5-mini`、`gpt-4o`、`gpt-4o-mini`、`gpt-4-turbo`、`o1`、`o3-mini` 等。有关更多信息，请参阅 [models](https://platform.openai.com/docs/models) 页面。 | `gpt-5-mini` |
| spring.ai.openai-sdk.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。不建议为同一个 completions 请求修改 `temperature` 和 `top_p`，因为这两个设置的交互很难预测。 | 1.0 |
| spring.ai.openai-sdk.chat.options.frequency-penalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止文本中现有频率对新 tokens 进行惩罚，降低模型逐字重复同一行的可能性。 | 0.0 |
| spring.ai.openai-sdk.chat.options.logit-bias | 修改指定 tokens 出现在 completion 中的可能性。 | - |
| spring.ai.openai-sdk.chat.options.logprobs | 是否返回输出 tokens 的 log probabilities。 | false |
| spring.ai.openai-sdk.chat.options.top-logprobs | 介于 0 和 5 之间的整数，指定在每个 token 位置返回的最可能的 tokens 数量。需要 `logprobs` 为 true。 | - |
| spring.ai.openai-sdk.chat.options.max-tokens | 要生成的最大 tokens 数。*用于非推理模型*（例如，gpt-4o、gpt-3.5-turbo）。*不能用于推理模型*（例如，o1、o3、o4-mini 系列）。*与 maxCompletionTokens 互斥*。 | - |
| spring.ai.openai-sdk.chat.options.max-completion-tokens | 可以为 completion 生成的 tokens 数量的上限，包括可见输出 tokens 和推理 tokens。*推理模型必需*（例如，o1、o3、o4-mini 系列）。*不能用于非推理模型*。*与 maxTokens 互斥*。 | - |
| spring.ai.openai-sdk.chat.options.n | 为每个输入消息生成多少个 chat completion 选择。 | 1 |
| spring.ai.openai-sdk.chat.options.output-modalities | 输出模态列表。可以包括 "text" 和 "audio"。 | - |
| spring.ai.openai-sdk.chat.options.output-audio | 音频输出参数。使用 `AudioParameters`，包含 voice（ALLOY、ASH、BALLAD、CORAL、ECHO、FABLE、ONYX、NOVA、SAGE、SHIMMER）和 format（MP3、FLAC、OPUS、PCM16、WAV、AAC）。 | - |
| spring.ai.openai-sdk.chat.options.presence-penalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现新 tokens 进行惩罚。 | 0.0 |
| spring.ai.openai-sdk.chat.options.response-format.type | 响应格式类型：`TEXT`、`JSON_OBJECT` 或 `JSON_SCHEMA`。 | TEXT |
| spring.ai.openai-sdk.chat.options.response-format.json-schema | 当类型为 `JSON_SCHEMA` 时用于结构化输出的 JSON schema。 | - |
| spring.ai.openai-sdk.chat.options.seed | 如果指定，系统将尽最大努力进行确定性采样以获得可重现的结果。 | - |
| spring.ai.openai-sdk.chat.options.stop | 最多 4 个序列，API 将停止生成更多 tokens。 | - |
| spring.ai.openai-sdk.chat.options.top-p | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法。 | - |
| spring.ai.openai-sdk.chat.options.user | 代表您的最终用户的唯一标识符，可以帮助 OpenAI 监控和检测滥用。 | - |
| spring.ai.openai-sdk.chat.options.parallel-tool-calls | 是否在工具使用期间启用并行 function calling。 | true |
| spring.ai.openai-sdk.chat.options.reasoning-effort | 约束推理模型在推理上的努力：`low`、`medium` 或 `high`。 | - |
| spring.ai.openai-sdk.chat.options.verbosity | 控制模型响应的详细程度。 | - |
| spring.ai.openai-sdk.chat.options.store | 是否存储此 chat completion 请求的输出以供在 OpenAI 的模型蒸馏或评估产品中使用。 | false |
| spring.ai.openai-sdk.chat.options.metadata | 开发人员定义的标签和值，用于在仪表板中过滤 completions。 | - |
| spring.ai.openai-sdk.chat.options.service-tier | 指定要使用的延迟层级：`auto`、`default`、`flex` 或 `priority`。 | - |
| spring.ai.openai-sdk.chat.options.stream-options.include-usage | 是否在 streaming 响应中包含使用统计信息。 | false |
| spring.ai.openai-sdk.chat.options.stream-options.include-obfuscation | 是否在 streaming 响应中包含混淆。 | false |
| spring.ai.openai-sdk.chat.options.tool-choice | 控制模型调用哪个（如果有）function。 | - |
| spring.ai.openai-sdk.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 将把 tool calls 代理到客户端进行手动处理。如果为 true（默认值），Spring AI 将在内部处理 function calls。 | true |

> **注意：**
> 使用 GPT-5 模型（如 `gpt-5`、`gpt-5-mini` 和 `gpt-5-nano`）时，不支持 `temperature` 参数。
> 这些模型针对推理进行了优化，不使用 temperature。
> 指定 temperature 值将导致错误。
> 相比之下，对话模型（如 `gpt-5-chat`）确实支持 `temperature` 参数。

> **提示：** 所有前缀为 `spring.ai.openai-sdk.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

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
        OpenAiSdkChatOptions.builder()
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
        OpenAiSdkChatOptions.builder()
            .model("o1-preview")
            .maxCompletionTokens(1000)  // Use maxCompletionTokens for reasoning models
        .build()
    ));
```

## Runtime Options [[chat-options]]

[OpenAiSdkChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkChatOptions.java) 类提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `OpenAiSdkChatModel(options)` 构造函数或 `spring.ai.openai-sdk.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        OpenAiSdkChatOptions.builder()
            .model("gpt-4o")
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 [OpenAiSdkChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Tool Calling

您可以将自定义 Java functions 或 methods 注册到 `OpenAiSdkChatModel`，并让 OpenAI 模型智能地选择输出包含参数以调用一个或多个已注册 functions/tools 的 JSON 对象。
这是一种将 LLM 功能与外部工具和 APIs 连接的强大技术。
了解更多关于 [Tool Calling](tools)。

使用示例：

```java
var chatOptions = OpenAiSdkChatOptions.builder()
    .toolCallbacks(List.of(
        FunctionToolCallback.builder("getCurrentWeather", new WeatherService())
            .description("Get the weather in location")
            .inputType(WeatherService.Request.class)
            .build()))
    .build();

ChatResponse response = chatModel.call(
    new Prompt("What's the weather like in San Francisco?", chatOptions));
```

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。

### Vision

提供 vision multimodal 支持的 OpenAI 模型包括 `gpt-4`、`gpt-4o` 和 `gpt-4o-mini`。
请参阅 [Vision](https://platform.openai.com/docs/guides/vision) 指南了解更多信息。

Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。

以下是一个代码示例，说明了用户文本与图像的融合：

```java
var imageResource = new ClassPathResource("/multimodal.test.png");

var userMessage = new UserMessage(
    "Explain what do you see on this picture?",
    List.of(new Media(MimeTypeUtils.IMAGE_PNG, imageResource)));

ChatResponse response = chatModel.call(
    new Prompt(userMessage, 
        OpenAiSdkChatOptions.builder()
            .model("gpt-4o")
            .build()));
```

或使用图像 URL：

```java
var userMessage = new UserMessage(
    "Explain what do you see on this picture?",
    List.of(Media.builder()
        .mimeType(MimeTypeUtils.IMAGE_PNG)
        .data(URI.create("https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png"))
        .build()));

ChatResponse response = chatModel.call(new Prompt(userMessage));
```

> **提示：** 您也可以传递多个图像。

### Audio

提供音频输入支持的 OpenAI 模型包括 `gpt-4o-audio-preview`。
请参阅 [Audio](https://platform.openai.com/docs/guides/audio) 指南了解更多信息。

Spring AI 支持 base64 编码的音频文件与消息。
目前，OpenAI 支持以下媒体类型：`audio/mp3` 和 `audio/wav`。

音频输入示例：

```java
var audioResource = new ClassPathResource("speech1.mp3");

var userMessage = new UserMessage(
    "What is this recording about?",
    List.of(new Media(MimeTypeUtils.parseMimeType("audio/mp3"), audioResource)));

ChatResponse response = chatModel.call(
    new Prompt(userMessage,
        OpenAiSdkChatOptions.builder()
            .model("gpt-4o-audio-preview")
            .build()));
```

### Output Audio

`gpt-4o-audio-preview` 模型可以生成音频响应。

生成音频输出的示例：

```java
var userMessage = new UserMessage("Tell me a joke about Spring Framework");

ChatResponse response = chatModel.call(
    new Prompt(userMessage,
        OpenAiSdkChatOptions.builder()
            .model("gpt-4o-audio-preview")
            .outputModalities(List.of("text", "audio"))
            .outputAudio(new AudioParameters(Voice.ALLOY, AudioResponseFormat.WAV))
            .build()));

String text = response.getResult().getOutput().getContent(); // audio transcript
byte[] waveAudio = response.getResult().getOutput().getMedia().get(0).getDataAsByteArray(); // audio data
```

## Structured Outputs

OpenAI 提供自定义 [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) APIs，确保您的模型生成严格符合您提供的 `JSON Schema` 的响应。

### Configuration

您可以使用 `OpenAiSdkChatOptions` 构建器以编程方式设置响应格式：

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

Prompt prompt = new Prompt(
    "how can I solve 8x + 7 = -23",
    OpenAiSdkChatOptions.builder()
        .model("gpt-4o-mini")
        .responseFormat(ResponseFormat.builder()
            .type(ResponseFormat.Type.JSON_SCHEMA)
            .jsonSchema(jsonSchema)
            .build())
        .build());

ChatResponse response = chatModel.call(prompt);
```

### Integrating with BeanOutputConverter

您可以利用现有的 [BeanOutputConverter](structured-output-converter#_bean_output_converter) 工具：

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
String jsonSchema = outputConverter.getJsonSchema();

Prompt prompt = new Prompt(
    "how can I solve 8x + 7 = -23",
    OpenAiSdkChatOptions.builder()
        .model("gpt-4o-mini")
        .responseFormat(ResponseFormat.builder()
            .type(ResponseFormat.Type.JSON_SCHEMA)
            .jsonSchema(jsonSchema)
            .build())
        .build());

ChatResponse response = chatModel.call(prompt);
MathReasoning mathReasoning = outputConverter.convert(
    response.getResult().getOutput().getContent());
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-openai-sdk` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以配置 OpenAI SDK chat model：

```properties
spring.ai.openai-sdk.api-key=YOUR_API_KEY
spring.ai.openai-sdk.chat.options.model=gpt-5-mini
spring.ai.openai-sdk.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 OpenAI 凭据。

这将创建一个 `OpenAiSdkChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@RestController` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final OpenAiSdkChatModel chatModel;

    @Autowired
    public ChatController(OpenAiSdkChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map<String,String> generate(
            @RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", chatModel.call(message));
    }

    @GetMapping("/ai/generateStream")
    public Flux<ChatResponse> generateStream(
            @RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        Prompt prompt = new Prompt(new UserMessage(message));
        return chatModel.stream(prompt);
    }
}
```

## Manual Configuration

[OpenAiSdkChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkChatModel.java) 实现了 `ChatModel` 并使用官方 OpenAI Java SDK 连接到 OpenAI 服务。

将 `spring-ai-openai-sdk` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-sdk</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai-sdk'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `OpenAiSdkChatModel` 并将其用于文本生成：

```java
var chatOptions = OpenAiSdkChatOptions.builder()
    .model("gpt-4o")
    .temperature(0.7)
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

var chatModel = new OpenAiSdkChatModel(chatOptions);

ChatResponse response = chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> response = chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

### Microsoft Foundry Configuration

对于 Microsoft Foundry：

```java
var chatOptions = OpenAiSdkChatOptions.builder()
    .baseUrl("https://your-resource.openai.azure.com")
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .deploymentName("gpt-4")
    .azureOpenAIServiceVersion(AzureOpenAIServiceVersion.V2024_10_01_PREVIEW)
    .azure(true)  // Enables Microsoft Foundry mode
    .build();

var chatModel = new OpenAiSdkChatModel(chatOptions);
```

> **提示：** Microsoft Foundry 支持无密码身份验证。将 `com.azure:azure-identity` 依赖项添加到您的项目中。如果您不提供 API key，实现将自动尝试使用环境中的 Azure 凭据。

### GitHub Models Configuration

对于 GitHub Models：

```java
var chatOptions = OpenAiSdkChatOptions.builder()
    .baseUrl("https://models.inference.ai.azure.com")
    .apiKey(System.getenv("GITHUB_TOKEN"))
    .model("gpt-4o")
    .githubModels(true)
    .build();

var chatModel = new OpenAiSdkChatModel(chatOptions);
```

## Key Differences from Spring AI OpenAI

此实现与 [Spring AI OpenAI](chat/openai-chat) 实现在几个方面有所不同：

| Aspect | Official OpenAI SDK | Existing OpenAI |
|--------|---------------------|-----------------|
| **HTTP Client** | OkHttp（通过官方 SDK） | Spring RestClient/WebClient |
| **API Updates** | 通过 SDK 更新自动 | 手动维护 |
| **Azure Support** | 原生支持无密码身份验证 | 手动 URL 构造 |
| **GitHub Models** | 原生支持 | 不支持 |
| **Audio/Moderation** | 尚未支持 | 完全支持 |
| **Retry Logic** | SDK 管理（指数退避） | Spring Retry（可自定义） |
| **Dependencies** | 官方 OpenAI SDK | Spring WebFlux |

**何时使用 OpenAI SDK：**

* 您正在启动一个新项目
* 您主要使用 Microsoft Foundry 或 GitHub Models
* 您希望从 OpenAI 获得自动 API 更新
* 您不需要音频转录或审核功能
* 您更喜欢官方 SDK 支持

**何时使用 Spring AI OpenAI：**

* 您有一个使用它的现有项目
* 您需要音频转录或审核功能
* 您需要细粒度的 HTTP 控制
* 您需要原生 Spring reactive 支持
* 您需要自定义重试策略

## Observability

OpenAI SDK 实现通过 Micrometer 支持 Spring AI 的 observability 功能。
所有 chat model 操作都经过检测以进行监控和跟踪。

## Limitations

OpenAI SDK 实现中尚未支持以下功能：

* 音频语音生成（TTS）
* 音频转录
* Moderation API
* File API 操作

这些功能在 [Spring AI OpenAI](chat/openai-chat) 实现中可用。

## Additional Resources

* [Official OpenAI Java SDK](https://github.com/openai/openai-java)
* [OpenAI Chat API Documentation](https://platform.openai.com/docs/api-reference/chat)
* [OpenAI Models](https://platform.openai.com/docs/models)
* [Microsoft Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/)
* [GitHub Models](https://github.com/marketplace/models)

