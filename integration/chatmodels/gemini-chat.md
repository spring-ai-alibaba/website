---
sidebar_position: 7
---

# VertexAI Gemini Chat

[Vertex AI Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/overview) 允许开发人员使用 Gemini 模型构建生成式 AI 应用程序。
Vertex AI Gemini API 支持 multimodal prompts 作为输入，输出 text 或 code。
multimodal model 是能够处理来自多种模态的信息的模型，包括图像、视频和文本。例如，您可以向模型发送一盘饼干的照片，并要求它为您提供这些饼干的配方。

Gemini 是由 Google DeepMind 开发的生成式 AI 模型系列，专为 multimodal 用例设计。Gemini API 让您可以访问 [Gemini 2.0 Flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash) 和 [Gemini 2.0 Flash-Lite](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite)。
有关 Vertex AI Gemini API 模型的规范，请参阅 [Model information](https://cloud.google.com/vertex-ai/generative-ai/docs/models#gemini-models)。

[Gemini API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference)

## Prerequisites

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

Spring AI 为 VertexAI Gemini Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-vertex-ai-gemini</artifactId>
</dependency>
```

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-vertex-ai-gemini'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=vertexai（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 vertexai 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.vertex.ai.gemini` 是用于连接到 VertexAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.chat | 启用 Chat Model 客户端 | vertexai |
| spring.ai.vertex.ai.gemini.project-id | Google Cloud Platform project ID | - |
| spring.ai.vertex.ai.gemini.location | 区域 | - |
| spring.ai.vertex.ai.gemini.credentials-uri | Vertex AI Gemini credentials 的 URI。提供时，它用于创建 `GoogleCredentials` 实例以对 `VertexAI` 进行身份验证。 | - |
| spring.ai.vertex.ai.gemini.api-endpoint | Vertex AI Gemini API endpoint。 | - |
| spring.ai.vertex.ai.gemini.scopes |  | - |
| spring.ai.vertex.ai.gemini.transport | API transport。GRPC 或 REST。 | GRPC |

前缀 `spring.ai.vertex.ai.gemini.chat` 是用于配置 VertexAI Gemini Chat 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.vertex.ai.gemini.chat.options.model | 支持的 [Vertex AI Gemini Chat model](https://cloud.google.com/vertex-ai/generative-ai/docs/models#gemini-models) 包括 `gemini-2.0-flash`、`gemini-2.0-flash-lite` 以及新的 `gemini-2.5-pro-preview-03-25`、`gemini-2.5-flash-preview-04-17` 模型。 | gemini-2.0-flash |
| spring.ai.vertex.ai.gemini.chat.options.response-mime-type | 生成的候选文本的输出响应 mimetype。 | `text/plain`:（默认）文本输出或 `application/json`: JSON 响应。 |
| spring.ai.vertex.ai.gemini.chat.options.response-schema | 字符串，包含 OpenAPI 格式的输出响应 schema，如 [JSON schemas](https://ai.google.dev/gemini-api/docs/structured-output#json-schemas) 中所述。 | - |
| spring.ai.vertex.ai.gemini.chat.options.google-search-retrieval | 使用 Google search Grounding 功能 | `true` 或 `false`，默认 `false`。 |
| spring.ai.vertex.ai.gemini.chat.options.temperature | 控制输出的随机性。值可以在 [0.0,1.0] 范围内（包含）。接近 1.0 的值将产生更多样化的响应，而接近 0.0 的值通常会导致生成器的响应不那么令人惊讶。此值指定后端在调用生成器时使用的默认值。 | 0.7 |
| spring.ai.vertex.ai.gemini.chat.options.top-k | 采样时要考虑的最大 tokens 数。生成器使用组合的 Top-k 和 nucleus sampling。Top-k sampling 考虑 topK 最可能的 tokens 集合。 | - |
| spring.ai.vertex.ai.gemini.chat.options.top-p | 采样时要考虑的最大累积概率。生成器使用组合的 Top-k 和 nucleus sampling。Nucleus sampling 考虑概率总和至少为 topP 的最小 tokens 集合。 | - |
| spring.ai.vertex.ai.gemini.chat.options.candidate-count | 要返回的生成响应消息数。此值必须在 [1, 8] 范围内（包含）。默认为 1。 | 1 |
| spring.ai.vertex.ai.gemini.chat.options.max-output-tokens | 要生成的最大 tokens 数。 | - |
| spring.ai.vertex.ai.gemini.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.vertex.ai.gemini.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.vertex.ai.gemini.chat.options.internal-tool-execution-enabled | 如果为 true，应执行 tool execution，否则将模型的响应返回给用户。默认为 null，但如果为 null，将考虑 `ToolCallingChatOptions.DEFAULT_TOOL_EXECUTION_ENABLED`（为 true） | - |
| spring.ai.vertex.ai.gemini.chat.options.safety-settings | 用于控制安全过滤器的安全设置列表，如 [Vertex AI Safety Filters](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters) 所定义。每个安全设置可以有一个 method、threshold 和 category。 | - |

> **提示：** 所有前缀为 `spring.ai.vertex.ai.gemini.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime options [[chat-options]]

[VertexAiGeminiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-vertex-ai-gemini/src/main/java/org/springframework/ai/vertexai/gemini/VertexAiGeminiChatOptions.java) 提供模型配置，例如 temperature、topK 等。

在启动时，可以使用 `VertexAiGeminiChatModel(api, options)` 构造函数或 `spring.ai.vertex.ai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        VertexAiGeminiChatOptions.builder()
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 `VertexAiGeminiChatOptions` 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Tool Calling

Vertex AI Gemini 模型支持 tool calling（在 Google Gemini 上下文中，它称为 `function calling`）功能，允许模型在对话过程中使用工具。
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

以下是从 [VertexAiGeminiChatModelIT#multiModalityTest()](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-vertex-ai-gemini/src/test/java/org/springframework/ai/vertexai/gemini/VertexAiGeminiChatModelIT.java) 中提取的简单代码示例，演示了用户文本与图像的组合。

```java
byte[] data = new ClassPathResource("/vertex-test.png").getContentAsByteArray();

var userMessage = new UserMessage("Explain what do you see on this picture?",
        List.of(new Media(MimeTypeUtils.IMAGE_PNG, this.data)));

ChatResponse response = chatModel.call(new Prompt(List.of(this.userMessage)));
```

### PDF

最新的 Vertex Gemini 提供对 PDF 输入类型的支持。
使用 `application/pdf` 媒体类型将 PDF 文件附加到消息：

```java
var pdfData = new ClassPathResource("/spring-ai-reference-overview.pdf");

var userMessage = new UserMessage(
        "You are a very professional document summarization specialist. Please summarize the given document.",
        List.of(new Media(new MimeType("application", "pdf"), pdfData)));

var response = this.chatModel.call(new Prompt(List.of(userMessage)));
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-vertex-ai-gemini` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 VertexAi chat model：

```properties
spring.ai.vertex.ai.gemini.project-id=PROJECT_ID
spring.ai.vertex.ai.gemini.location=LOCATION
spring.ai.vertex.ai.gemini.chat.options.model=gemini-2.0-flash
spring.ai.vertex.ai.gemini.chat.options.temperature=0.5
```

> **提示：** 将 `project-id` 替换为您的 Google Cloud Project ID，`location` 是 Google Cloud Region，如 `us-central1`、`europe-west1` 等...

> **注意：**
> 每个模型都有自己支持的区域集，您可以在模型页面找到支持的区域列表。
>
> 例如，model=`gemini-2.5-flash` 目前仅在 `us-central1` 区域可用，您必须设置 location=`us-central1`，遵循模型页面 [Gemini 2.5 Flash - Supported Regions](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)。

这将创建一个 `VertexAiGeminiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final VertexAiGeminiChatModel chatModel;

    @Autowired
    public ChatController(VertexAiGeminiChatModel chatModel) {
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

[VertexAiGeminiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-vertex-ai-gemini/src/main/java/org/springframework/ai/vertexai/gemini/VertexAiGeminiChatModel.java) 实现了 `ChatModel` 并使用 `VertexAI` 连接到 Vertex AI Gemini 服务。

将 `spring-ai-vertex-ai-gemini` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-vertex-ai-gemini</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-vertex-ai-gemini'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `VertexAiGeminiChatModel` 并将其用于文本生成：

```java
VertexAI vertexApi =  new VertexAI(projectId, location);

var chatModel = new VertexAiGeminiChatModel(this.vertexApi,
    VertexAiGeminiChatOptions.builder()
        .model(ChatModel.GEMINI_2_0_FLASH)
        .temperature(0.4)
    .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));
```

`VertexAiGeminiChatOptions` 提供 chat 请求的配置信息。
`VertexAiGeminiChatOptions.Builder` 是一个流畅的选项构建器。

## Low-level Java Client [[low-level-api]]

以下类图说明了 Vertex AI Gemini 原生 Java API：

![vertex-ai-gemini-native-api.jpg](/img/integration/vertex-ai-gemini-native-api.jpg)

