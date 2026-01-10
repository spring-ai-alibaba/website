# Google GenAI Chat

[Google GenAI API](https://ai.google.dev/gemini-api/docs) 允许开发人员通过 Gemini Developer API 或 Vertex AI 使用 Google 的 Gemini 模型构建生成式 AI 应用程序。
Google GenAI API 支持 multimodal prompts 作为输入，输出 text 或 code。
multimodal model 能够处理来自多种模态的信息，包括图像、视频和文本。例如，您可以向模型发送一盘饼干的照片，并要求它为您提供这些饼干的配方。

Gemini 是由 Google DeepMind 开发的生成式 AI 模型系列，专为 multimodal 用例设计。Gemini API 让您可以访问 [Gemini 2.0 Flash](https://ai.google.dev/gemini-api/docs/models#gemini-2.0-flash)、[Gemini 2.0 Flash-Lite](https://ai.google.dev/gemini-api/docs/models#gemini-2.0-flash-lite) 和 [Gemini Pro](https://ai.google.dev/gemini-api/docs/models) 模型。

此实现提供两种身份验证模式：

- **Gemini Developer API**: 使用 API key 进行快速原型设计和开发
- **Vertex AI**: 使用 Google Cloud credentials 进行具有企业功能的生产部署

[Gemini API Reference](https://ai.google.dev/api)

## Prerequisites

选择以下身份验证方法之一：

### Option 1: Gemini Developer API (API Key)

- 从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取 API key
- 将 API key 设置为环境变量或在应用程序属性中设置

### Option 2: Vertex AI (Google Cloud)

- 安装适合您操作系统的 [gcloud](https://cloud.google.com/sdk/docs/install) CLI。
- 通过运行以下命令进行身份验证。
将 `PROJECT_ID` 替换为您的 Google Cloud project ID，将 `ACCOUNT` 替换为您的 Google Cloud 用户名。

```
gcloud config set project <PROJECT_ID> &&
gcloud auth application-default login <ACCOUNT>
```

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Google GenAI Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-google-genai</artifactId>
</dependency>
```

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-google-genai'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=google-genai（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 google-genai 不匹配的值）
>
> 此更改是为了允许配置多个模型。

#### Connection Properties

前缀 `spring.ai.google.genai` 是用于连接到 Google GenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.chat | 启用 Chat Model 客户端 | google-genai |
| spring.ai.google.genai.api-key | Gemini Developer API 的 API key。提供时，客户端使用 Gemini Developer API 而不是 Vertex AI。 | - |
| spring.ai.google.genai.project-id | Google Cloud Platform project ID（Vertex AI 模式必需） | - |
| spring.ai.google.genai.location | Google Cloud 区域（Vertex AI 模式必需） | - |
| spring.ai.google.genai.credentials-uri | Google Cloud credentials 的 URI。提供时，它用于创建 `GoogleCredentials` 实例进行身份验证。 | - |

#### Chat Model Properties

前缀 `spring.ai.google.genai.chat` 是用于配置 Google GenAI Chat 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.google.genai.chat.options.model | 支持的 [Google GenAI Chat models](https://ai.google.dev/gemini-api/docs/models) 包括 `gemini-2.0-flash`、`gemini-2.0-flash-lite`、`gemini-pro` 和 `gemini-1.5-flash`。 | gemini-2.0-flash |
| spring.ai.google.genai.chat.options.response-mime-type | 生成的候选文本的输出响应 mimetype。 | `text/plain`:（默认）文本输出或 `application/json`: JSON 响应。 |
| spring.ai.google.genai.chat.options.google-search-retrieval | 使用 Google search Grounding 功能 | `true` 或 `false`，默认 `false`。 |
| spring.ai.google.genai.chat.options.temperature | 控制输出的随机性。值可以在 [0.0,1.0] 范围内（包含）。接近 1.0 的值将产生更多样化的响应，而接近 0.0 的值通常会导致生成器的响应不那么令人惊讶。 | 0.7 |
| spring.ai.google.genai.chat.options.top-k | 采样时要考虑的最大 tokens 数。生成器使用组合的 Top-k 和 nucleus sampling。Top-k sampling 考虑 topK 最可能的 tokens 集合。 | - |
| spring.ai.google.genai.chat.options.top-p | 采样时要考虑的最大累积概率。生成器使用组合的 Top-k 和 nucleus sampling。Nucleus sampling 考虑概率总和至少为 topP 的最小 tokens 集合。 | - |
| spring.ai.google.genai.chat.options.candidate-count | 要返回的生成响应消息数。此值必须在 [1, 8] 范围内（包含）。默认为 1。 | 1 |
| spring.ai.google.genai.chat.options.max-output-tokens | 要生成的最大 tokens 数。 | - |
| spring.ai.google.genai.chat.options.frequency-penalty | 用于减少重复的频率惩罚。 | - |
| spring.ai.google.genai.chat.options.presence-penalty | 用于减少重复的存在惩罚。 | - |
| spring.ai.google.genai.chat.options.thinking-budget | 思考过程的思考预算。 | - |
| spring.ai.google.genai.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.google.genai.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.google.genai.chat.options.internal-tool-execution-enabled | 如果为 true，应执行 tool execution，否则将模型的响应返回给用户。默认为 null，但如果为 null，将考虑 `ToolCallingChatOptions.DEFAULT_TOOL_EXECUTION_ENABLED`（为 true） | - |
| spring.ai.google.genai.chat.options.safety-settings | 用于控制安全过滤器的安全设置列表，如 [Google GenAI Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings) 所定义。每个安全设置可以有一个 method、threshold 和 category。 | - |

> **提示：** 所有前缀为 `spring.ai.google.genai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime options [[chat-options]]

[GoogleGenAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-google-genai/src/main/java/org/springframework/ai/google/genai/GoogleGenAiChatOptions.java) 提供模型配置，例如 temperature、topK 等。

在启动时，可以使用 `GoogleGenAiChatModel(client, options)` 构造函数或 `spring.ai.google.genai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        GoogleGenAiChatOptions.builder()
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 `GoogleGenAiChatOptions` 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Tool Calling

Google GenAI 模型支持 tool calling（function calling）功能，允许模型在对话过程中使用工具。
以下是如何定义和使用基于 `@Tool` 的工具的示例：

```java

public class WeatherService {

    @Tool(description = "Get the weather in location")
    public String weatherByLocation(@ToolParam(description= "City or state name") String location) {
        ...
    }
}

String response = ChatClient.create(this.chatModel)
        .prompt("What's the weather like in Boston?")
        .tools(new WeatherService())
        .call()
        .content();
```

您也可以使用 java.util.function beans 作为工具：

```java
@Bean
@Description("Get the weather in location. Return temperature in 36°F or 36°C format.")
public Function<Request, Response> weatherFunction() {
    return new MockWeatherService();
}

String response = ChatClient.create(this.chatModel)
        .prompt("What's the weather like in Boston?")
        .toolNames("weatherFunction")
        .inputType(Request.class)
        .call()
        .content();
```

在 [Tools](tools) 文档中查找更多信息。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种（输入）来源的信息的能力，包括 `text`、`pdf`、`images`、`audio` 和其他数据格式。

### Image, Audio, Video

Google 的 Gemini AI 模型通过理解和集成文本、代码、音频、图像和视频来支持此功能。
有关更多详细信息，请参阅博客文章 [Introducing Gemini](https://blog.google/technology/ai/google-gemini-ai/#introducing-gemini)。

Spring AI 的 `Message` 接口通过引入 Media 类型来支持 multimodal AI 模型。
此类型包含消息中媒体附件的数据和信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `java.lang.Object` 来存储原始媒体数据。

以下是从 [GoogleGenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-google-genai/src/test/java/org/springframework/ai/google/genai/GoogleGenAiChatModelIT.java) 中提取的简单代码示例，演示了用户文本与图像的组合。

```java
byte[] data = new ClassPathResource("/vertex-test.png").getContentAsByteArray();

var userMessage = UserMessage.builder()
			.text("Explain what do you see o this picture?")
			.media(List.of(new Media(MimeTypeUtils.IMAGE_PNG, data)))
			.build();

ChatResponse response = chatModel.call(new Prompt(List.of(this.userMessage)));
```

### PDF

Google GenAI 提供对 PDF 输入类型的支持。
使用 `application/pdf` 媒体类型将 PDF 文件附加到消息：

```java
var pdfData = new ClassPathResource("/spring-ai-reference-overview.pdf");

var userMessage = UserMessage.builder()
			.text("You are a very professional document summarization specialist. Please summarize the given document.")
			.media(List.of(new Media(new MimeType("application", "pdf"), pdfData)))
			.build();

var response = this.chatModel.call(new Prompt(List.of(userMessage)));
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-google-genai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 Google GenAI chat model：

### Using Gemini Developer API (API Key)

```properties
spring.ai.google.genai.api-key=YOUR_API_KEY
spring.ai.google.genai.chat.options.model=gemini-2.0-flash
spring.ai.google.genai.chat.options.temperature=0.5
```

### Using Vertex AI

```properties
spring.ai.google.genai.project-id=PROJECT_ID
spring.ai.google.genai.location=LOCATION
spring.ai.google.genai.chat.options.model=gemini-2.0-flash
spring.ai.google.genai.chat.options.temperature=0.5
```

> **提示：** 将 `project-id` 替换为您的 Google Cloud Project ID，`location` 是 Google Cloud Region，如 `us-central1`、`europe-west1` 等...

> **注意：**
> 每个模型都有自己支持的区域集，您可以在模型页面找到支持的区域列表。
> 例如，model=`gemini-2.5-flash` 目前仅在 `us-central1` 区域可用，您必须设置 location=`us-central1`，遵循模型页面 [Gemini 2.5 Flash - Supported Regions](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)。

这将创建一个 `GoogleGenAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final GoogleGenAiChatModel chatModel;

    @Autowired
    public ChatController(GoogleGenAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
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

[GoogleGenAiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-google-genai/src/main/java/org/springframework/ai/google/genai/GoogleGenAiChatModel.java) 实现了 `ChatModel` 并使用 `com.google.genai.Client` 连接到 Google GenAI 服务。

将 `spring-ai-google-genai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-google-genai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-google-genai'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `GoogleGenAiChatModel` 并将其用于文本生成：

### Using API Key

```java
Client genAiClient = Client.builder()
    .apiKey(System.getenv("GOOGLE_API_KEY"))
    .build();

var chatModel = new GoogleGenAiChatModel(genAiClient,
    GoogleGenAiChatOptions.builder()
        .model(ChatModel.GEMINI_2_0_FLASH)
        .temperature(0.4)
    .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));
```

### Using Vertex AI

```java
Client genAiClient = Client.builder()
    .project(System.getenv("GOOGLE_CLOUD_PROJECT"))
    .location(System.getenv("GOOGLE_CLOUD_LOCATION"))
    .vertexAI(true)
    .build();

var chatModel = new GoogleGenAiChatModel(genAiClient,
    GoogleGenAiChatOptions.builder()
        .model(ChatModel.GEMINI_2_0_FLASH)
        .temperature(0.4)
    .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));
```

`GoogleGenAiChatOptions` 提供 chat 请求的配置信息。
`GoogleGenAiChatOptions.Builder` 是一个流畅的选项构建器。

## Migration from Vertex AI Gemini

如果您当前使用 Vertex AI Gemini 实现（`spring-ai-vertex-ai-gemini`），您可以以最少的更改迁移到 Google GenAI：

### Key Differences

1. **SDK**: Google GenAI 使用新的 `com.google.genai.Client` 而不是 `com.google.cloud.vertexai.VertexAI`
2. **Authentication**: 支持 API key 和 Google Cloud credentials
3. **Package Names**: 类在 `org.springframework.ai.google.genai` 中，而不是 `org.springframework.ai.vertexai.gemini`
4. **Property Prefix**: 使用 `spring.ai.google.genai` 而不是 `spring.ai.vertex.ai.gemini`

### When to Use Google GenAI vs Vertex AI Gemini

**在以下情况下使用 Google GenAI：**
- 您想使用 API keys 进行快速原型设计
- 您需要来自 Developer API 的最新 Gemini 功能
- 您希望在 API key 和 Vertex AI 模式之间灵活切换

**在以下情况下使用 Vertex AI Gemini：**
- 您有现有的 Vertex AI 基础设施
- 您需要特定的 Vertex AI 企业功能
- 您的组织要求仅 Google Cloud 部署

## Low-level Java Client [[low-level-api]]

Google GenAI 实现基于新的 Google GenAI Java SDK 构建，该 SDK 提供了用于访问 Gemini 模型的现代、简化的 API。

