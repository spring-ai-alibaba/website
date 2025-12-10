# Azure OpenAI Chat

Azure 的 OpenAI 产品，由 ChatGPT 提供支持，超越了传统的 OpenAI 功能，提供具有增强功能的 AI 驱动的文本生成。Azure 提供额外的 AI 安全性和负责任的 AI 功能，如他们最近的更新[这里](https://techcommunity.microsoft.com/t5/ai-azure-ai-services-blog/announcing-new-ai-safety-amp-responsible-ai-features-in-azure/ba-p/3983686)所强调的。

Azure 为 Java 开发人员提供了通过将 AI 与一系列 Azure 服务集成来充分利用 AI 潜力的机会，其中包括 AI 相关资源，如 Azure 上的 Vector Stores。

## Prerequisites

Azure OpenAI 客户端提供三种连接选项：使用 Azure API key、使用 OpenAI API Key 或使用 Microsoft Entra ID。

### Azure API Key & Endpoint

要使用 API key 访问模型，请从 [Azure Portal](https://portal.azure.com) 上的 Azure OpenAI Service 部分获取您的 Azure OpenAI `endpoint` 和 `api-key`。

Spring AI 定义了两个配置属性：

1. `spring.ai.azure.openai.api-key`: 将其设置为从 Azure 获得的 `API Key` 的值。
2. `spring.ai.azure.openai.endpoint`: 将其设置为在 Azure 中配置模型时获得的 endpoint URL。

您可以在 `application.properties` 或 `application.yml` 文件中设置这些配置属性：

```properties
spring.ai.azure.openai.api-key=<your-azure-api-key>
spring.ai.azure.openai.endpoint=<your-azure-endpoint-url>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    azure:
      openai:
        api-key: ${AZURE_OPENAI_API_KEY}
        endpoint: ${AZURE_OPENAI_ENDPOINT}
```

```bash
# In your environment or .env file
export AZURE_OPENAI_API_KEY=<your-azure-openai-api-key>
export AZURE_OPENAI_ENDPOINT=<your-azure-openai-endpoint-url>
```

### OpenAI Key

要使用 OpenAI 服务（而非 Azure）进行身份验证，请提供 OpenAI API key。这将自动将 endpoint 设置为 https://api.openai.com/v1。

使用此方法时，将 `spring.ai.azure.openai.chat.options.deployment-name` 属性设置为您希望使用的 [OpenAI model](https://platform.openai.com/docs/models) 的名称。

在您的应用程序配置中：

```properties
spring.ai.azure.openai.openai-api-key=<your-azure-openai-key>
spring.ai.azure.openai.chat.options.deployment-name=<openai-model-name>
```

使用 SpEL 的环境变量：

```yaml
# In application.yml
spring:
  ai:
    azure:
      openai:
        openai-api-key: ${AZURE_OPENAI_API_KEY}
        chat:
          options:
            deployment-name: ${AZURE_OPENAI_MODEL_NAME}
```

```bash
# In your environment or .env file
export AZURE_OPENAI_API_KEY=<your-openai-key>
export AZURE_OPENAI_MODEL_NAME=<openai-model-name>
```

### Microsoft Entra ID

对于使用 Microsoft Entra ID（以前称为 Azure Active Directory）的无密钥身份验证，仅设置 `spring.ai.azure.openai.endpoint` 配置属性，而不设置上面提到的 api-key 属性。

仅找到 endpoint 属性时，您的应用程序将评估几种不同的选项来检索凭据，并将使用 token credentials 创建 `OpenAIClient` 实例。

> **注意：** 不再需要创建 `TokenCredential` bean；它会自动为您配置。

### Deployment Name

要使用 Azure AI 应用程序，您需要通过 [Azure AI Portal](https://oai.azure.com/portal) 创建 Azure AI Deployment。
在 Azure 中，每个客户端必须指定一个 `Deployment Name` 才能连接到 Azure OpenAI 服务。
重要的是要注意，`Deployment Name` 与您选择部署的模型不同。
例如，名为 'MyAiDeployment' 的部署可以配置为使用 GPT 3.5 Turbo 模型或 GPT 4.0 模型。

要开始使用，请按照以下步骤使用默认设置创建部署：

   Deployment Name: `gpt-4o`
   Model Name: `gpt-4o`

此 Azure 配置与 Spring Boot Azure AI Starter 及其 Autoconfiguration 功能的默认配置一致。
如果您使用不同的 Deployment Name，请确保相应地更新配置属性：

```
spring.ai.azure.openai.chat.options.deployment-name=<my deployment name>
```

Azure OpenAI 和 OpenAI 的不同部署结构导致 Azure OpenAI 客户端库中有一个名为 `deploymentOrModelName` 的属性。
这是因为在 OpenAI 中没有 `Deployment Name`，只有 `Model Name`。

> **注意：** 属性 `spring.ai.azure.openai.chat.options.model` 已重命名为 `spring.ai.azure.openai.chat.options.deployment-name`。

> **注意：** 如果您决定连接到 `OpenAI` 而不是 `Azure OpenAI`，通过设置 `spring.ai.azure.openai.openai-api-key=<Your OpenAI Key>` 属性，那么 `spring.ai.azure.openai.chat.options.deployment-name` 将被视为 [OpenAI model](https://platform.openai.com/docs/models) 名称。

#### Access the OpenAI Model

您可以将客户端配置为直接使用 `OpenAI` 而不是 `Azure OpenAI` 部署的模型。
为此，您需要设置 `spring.ai.azure.openai.openai-api-key=<Your OpenAI Key>` 而不是 `spring.ai.azure.openai.api-key=<Your Azure OpenAi Key>`。

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Azure OpenAI Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-azure-openai</artifactId>
</dependency>
```

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-azure-openai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

Azure OpenAI Chat Client 使用 Azure SDK 提供的 [OpenAIClientBuilder](https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/openai/azure-ai-openai/src/main/java/com/azure/ai/openai/OpenAIClientBuilder.java) 创建。Spring AI 允许通过提供 [AzureOpenAIClientBuilderCustomizer](https://github.com/spring-projects/spring-ai/blob/main/auto-configurations/models/spring-ai-autoconfigure-model-azure-openai/src/main/java/org/springframework/ai/model/azure/openai/autoconfigure/AzureOpenAIClientBuilderCustomizer.java) beans 来自定义构建器。

例如，可以使用自定义器来更改默认响应超时：

```java
@Configuration
public class AzureOpenAiConfig {

	@Bean
	public AzureOpenAIClientBuilderCustomizer responseTimeoutCustomizer() {
		return openAiClientBuilder -> {
			HttpClientOptions clientOptions = new HttpClientOptions()
					.setResponseTimeout(Duration.ofMinutes(5));
			openAiClientBuilder.httpClient(HttpClient.createDefault(clientOptions));
		};
	}

}
```

### Chat Properties

前缀 `spring.ai.azure.openai` 是用于配置与 Azure OpenAI 连接的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.azure.openai.api-key | 来自 Azure AI OpenAI `Resource Management` 下的 `Keys and Endpoint` 部分的 Key | - |
| spring.ai.azure.openai.endpoint | 来自 Azure AI OpenAI `Resource Management` 下的 `Keys and Endpoint` 部分的 endpoint | - |
| spring.ai.azure.openai.openai-api-key | （非 Azure）OpenAI API key。用于与 OpenAI 服务进行身份验证，而不是 Azure OpenAI。这将自动将 endpoint 设置为 https://api.openai.com/v1。使用 `api-key` 或 `openai-api-key` 属性。使用此配置时，`spring.ai.azure.openai.chat.options.deployment-name` 被视为 [OpenAi Model](https://platform.openai.com/docs/models) 名称。 | - |
| spring.ai.azure.openai.custom-headers | 要包含在 API 请求中的自定义 headers 映射。映射中的每个条目代表一个 header，其中 key 是 header 名称，value 是 header 值。 | Empty map |

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=azure-openai（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 azure-openai 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.azure.openai.chat` 是用于配置 Azure OpenAI 的 `ChatModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.azure.openai.chat.enabled (Removed and no longer valid) | 启用 Azure OpenAI chat model。 | true |
| spring.ai.model.chat | 启用 Azure OpenAI chat model。 | azure-openai |
| spring.ai.azure.openai.chat.options.deployment-name | 与 Azure 一起使用时，这指的是您可以在 https://oai.azure.com/portal 找到的模型的 "Deployment Name"。重要的是要注意，在 Azure OpenAI 部署中，"Deployment Name" 与模型本身不同。围绕这些术语的混淆源于使 Azure OpenAI 客户端库与原始 OpenAI endpoint 兼容的意图。Azure OpenAI 和 Sam Altman 的 OpenAI 提供的部署结构存在显著差异。要作为此 completions 请求的一部分提供的部署模型名称。 | gpt-4o |
| spring.ai.azure.openai.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。*用于非推理模型（例如，gpt-4o、gpt-3.5-turbo）。不能与 maxCompletionTokens 一起使用。* | - |
| spring.ai.azure.openai.chat.options.maxCompletionTokens | 可以为 completion 生成的 tokens 数量的上限，包括可见输出 tokens 和推理 tokens。*推理模型（例如，o1、o3、o4-mini 系列）必需。不能与 maxTokens 一起使用。* | - |
| spring.ai.azure.openai.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。不建议为同一个 completions 请求修改 temperature 和 top_p，因为这两个设置的交互很难预测。 | 0.7 |
| spring.ai.azure.openai.chat.options.topP | 除了 temperature 之外，还有一种称为 nucleus sampling 的采样方法。此值使模型考虑具有提供的概率质量的 tokens 结果。 | - |
| spring.ai.azure.openai.chat.options.logitBias | GPT token IDs 和 bias scores 之间的映射，影响特定 tokens 出现在 completions 响应中的概率。Token IDs 通过外部 tokenizer 工具计算，而 bias scores 位于 -100 到 100 的范围内，最小值和最大值分别对应于完全禁止或独占选择 token。给定 bias score 的确切行为因模型而异。 | - |
| spring.ai.azure.openai.chat.options.user | 操作调用者或最终用户的标识符。这可用于跟踪或速率限制目的。 | - |
| spring.ai.azure.openai.chat.options.stream-usage | （仅用于 streaming）设置为添加包含整个请求的 token 使用统计信息的额外块。此块的 `choices` 字段是一个空数组，所有其他块也将包含一个 usage 字段，但值为 null。 | false |
| spring.ai.azure.openai.chat.options.n | 应为 chat completions 响应生成的 chat completions 选择数量。 | - |
| spring.ai.azure.openai.chat.options.stop | 将结束 completions 生成的文本序列集合。 | - |
| spring.ai.azure.openai.chat.options.presencePenalty | 影响生成的 tokens 基于其在生成文本中的现有存在而出现的概率的值。正值将使 tokens 在已存在时不太可能出现，并增加模型输出新主题的可能性。 | - |
| spring.ai.azure.openai.chat.options.responseFormat.type | 与 `GPT-4o`、`GPT-4o mini`、`GPT-4 Turbo` 以及所有比 `gpt-3.5-turbo-1106` 更新的 `GPT-3.5 Turbo` 模型兼容。`JSON_OBJECT` 类型启用 JSON mode，这保证了模型生成的消息是有效的 JSON。`JSON_SCHEMA` 类型启用 Structured Outputs，这保证了模型将匹配您提供的 JSON schema。`JSON_SCHEMA` 类型还需要设置 `responseFormat.schema` 属性。 | - |
| spring.ai.azure.openai.chat.options.responseFormat.schema | 响应格式 JSON schema。仅适用于 `responseFormat.type=JSON_SCHEMA` | - |
| spring.ai.azure.openai.chat.options.frequencyPenalty | 影响生成的 tokens 基于其在生成文本中的累积频率而出现的概率的值。正值将使 tokens 随着其频率增加而不太可能出现，并降低模型逐字重复相同语句的可能性。 | - |
| spring.ai.azure.openai.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.azure.openai.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.azure.openai.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |

> **提示：** 所有前缀为 `spring.ai.azure.openai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 <<chat-options>> 在运行时覆盖。

### Token Limit Parameters: Model-Specific Usage

Azure OpenAI 对 token 限制参数有模型特定的要求：

| Model Family | Required Parameter | Notes |
|--------------|-------------------|-------|
| **Reasoning Models**<br>(o1, o3, o4-mini series) | `maxCompletionTokens` | 这些模型仅接受 `maxCompletionTokens`。使用 `maxTokens` 将导致 API 错误。 |
| **Non-Reasoning Models**<br>(gpt-4o, gpt-3.5-turbo, etc.) | `maxTokens` | 传统模型使用 `maxTokens` 进行输出限制。使用 `maxCompletionTokens` 可能导致 API 错误。 |

> **重要：** 参数 `maxTokens` 和 `maxCompletionTokens` 是**互斥的**。同时设置这两个参数将导致 Azure OpenAI 的 API 错误。Spring AI Azure OpenAI 客户端在您设置另一个参数时会自动清除先前设置的参数，并显示警告消息。

示例：对推理模型使用 maxCompletionTokens

```java
var options = AzureOpenAiChatOptions.builder()
    .deploymentName("o1-preview")
    .maxCompletionTokens(500)  // Required for reasoning models
    .build();
```

示例：对非推理模型使用 maxTokens

```java
var options = AzureOpenAiChatOptions.builder()
    .deploymentName("gpt-4o")
    .maxTokens(500)  // Required for non-reasoning models
    .build();
```

## Runtime Options [[chat-options]]

[AzureOpenAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-azure-openai/src/main/java/org/springframework/ai/azure/openai/AzureOpenAiChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `AzureOpenAiChatModel(api, options)` 构造函数或 `spring.ai.azure.openai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        AzureOpenAiChatOptions.builder()
            .deploymentName("gpt-4o")
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 [AzureOpenAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-azure-openai/src/main/java/org/springframework/ai/azure/openai/AzureOpenAiChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Function Calling

您可以将自定义 Java functions 注册到 AzureOpenAiChatModel，并让模型智能地选择输出包含参数以调用一个或多个已注册 functions 的 JSON 对象。
这是一种将 LLM 功能与外部工具和 APIs 连接的强大技术。
了解更多关于 [Tool Calling](api/tools)。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。
目前，Azure OpenAI `gpt-4o` 模型提供 multimodal 支持。

Azure OpenAI 可以在消息中包含 base64 编码的图像或图像 URL 列表。
Spring AI 的 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 接口通过引入 [Media](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-commons/src/main/java/org/springframework/ai/content/Media.java) 类型来促进 multimodal AI 模型。
此类型包含消息中媒体附件的数据和详细信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `java.lang.Object` 来存储原始媒体数据。

以下是从 [OpenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/c9a3e66f90187ce7eae7eb78c462ec622685de6c/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/chat/OpenAiChatModelIT.java#L293) 中摘取的代码示例，说明了使用 `GPT_4_O` 模型将用户文本与图像融合。

```java
URL url = new URL("https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png");
String response = ChatClient.create(chatModel).prompt()
        .options(AzureOpenAiChatOptions.builder().deploymentName("gpt-4o").build())
        .user(u -> u.text("Explain what do you see on this picture?").media(MimeTypeUtils.IMAGE_PNG, this.url))
        .call()
        .content();
```

> **提示：** 您也可以传递多个图像。

它将 `multimodal.test.png` 图像作为输入：

![multimodal.test.png](multimodal.test.png)

以及文本消息 "Explain what do you see on this picture?"，并生成如下响应：

```
This is an image of a fruit bowl with a simple design. The bowl is made of metal with curved wire edges that
create an open structure, allowing the fruit to be visible from all angles. Inside the bowl, there are two
yellow bananas resting on top of what appears to be a red apple. The bananas are slightly overripe, as
indicated by the brown spots on their peels. The bowl has a metal ring at the top, likely to serve as a handle
for carrying. The bowl is placed on a flat surface with a neutral-colored background that provides a clear
view of the fruit inside.
```

您也可以传入 classpath resource 而不是 URL，如下面的示例所示

```java
Resource resource = new ClassPathResource("multimodality/multimodal.test.png");

String response = ChatClient.create(chatModel).prompt()
    .options(AzureOpenAiChatOptions.builder()
    .deploymentName("gpt-4o").build())
    .user(u -> u.text("Explain what do you see on this picture?")
    .media(MimeTypeUtils.IMAGE_PNG, this.resource))
    .call()
    .content();
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-azure-openai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 OpenAi chat model：

```properties
spring.ai.azure.openai.api-key=YOUR_API_KEY
spring.ai.azure.openai.endpoint=YOUR_ENDPOINT
spring.ai.azure.openai.chat.options.deployment-name=gpt-4o
spring.ai.azure.openai.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 和 `endpoint` 替换为您的 Azure OpenAI 凭据。

这将创建一个 `AzureOpenAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final AzureOpenAiChatModel chatModel;

    @Autowired
    public ChatController(AzureOpenAiChatModel chatModel) {
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

[AzureOpenAiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-azure-openai/src/main/java/org/springframework/ai/azure/openai/AzureOpenAiChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 [Azure OpenAI Java Client](https://learn.microsoft.com/en-us/java/api/overview/azure/ai-openai-readme?view=azure-java-preview) 连接。

要启用它，请将 `spring-ai-azure-openai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-azure-openai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```gradle
dependencies {
    implementation 'org.springframework.ai:spring-ai-azure-openai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** `spring-ai-azure-openai` 依赖项还提供对 `AzureOpenAiChatModel` 的访问。有关 `AzureOpenAiChatModel` 的更多信息，请参阅 [Azure OpenAI Chat](../chat/azure-openai-chat.html) 部分。

接下来，创建一个 `AzureOpenAiChatModel` 实例并使用它生成文本响应：

```java
var openAIClientBuilder = new OpenAIClientBuilder()
  .credential(new AzureKeyCredential(System.getenv("AZURE_OPENAI_API_KEY")))
  .endpoint(System.getenv("AZURE_OPENAI_ENDPOINT"));

var openAIChatOptions = AzureOpenAiChatOptions.builder()
  .deploymentName("gpt-5")
  .temperature(0.4)
  .maxCompletionTokens(200)
  .build();

var chatModel = AzureOpenAiChatModel.builder()
				.openAIClientBuilder(openAIClientBuilder)
				.defaultOptions(openAIChatOptions)
				.build();

ChatResponse response = chatModel.call(
  new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> streamingResponses = chatModel.stream(
  new Prompt("Generate the names of 5 famous pirates."));
```

> **注意：** `gpt-4o` 实际上是 Azure AI Portal 中显示的 `Deployment Name`。

