# Perplexity Chat

[Perplexity AI](https://perplexity.ai/) 提供独特的 AI 服务，将其语言模型与实时搜索功能集成。它提供多种模型并支持 conversational AI 的 streaming 响应。

Spring AI 通过重用现有的 [OpenAI](../openai-chat) 客户端与 Perplexity AI 集成。要开始使用，您需要获取 [Perplexity API Key](https://docs.perplexity.ai/guides/getting-started)，配置 base URL，并选择支持的 [models](https://docs.perplexity.ai/guides/model-cards) 之一。

![spring-ai-perplexity-integration.jpg](/img/integration/spring-ai-perplexity-integration.jpg)

> **注意：** Perplexity API 与 OpenAI API 不完全兼容。
> Perplexity 将实时网络搜索结果与其语言模型响应相结合。
> 与 OpenAI 不同，Perplexity 不暴露 `toolCalls` - `function call` 机制。
> 此外，目前 Perplexity 不支持 multimodal messages。

查看 [PerplexityWithOpenAiChatModelIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/chat/proxy/PerplexityWithOpenAiChatModelIT.java) 测试以了解在 Spring AI 中使用 Perplexity 的示例。

## Prerequisites

* **创建 API Key**：
访问[这里](https://docs.perplexity.ai/guides/getting-started)创建 API Key。
在您的 Spring AI 项目中使用 `spring.ai.openai.api-key` 属性配置它。

* **设置 Perplexity Base URL**：
将 `spring.ai.openai.base-url` 属性设置为 `+https://api.perplexity.ai+`。

* **选择 Perplexity Model**：
使用 `spring.ai.openai.chat.model=<model name>` 属性指定模型。
请参阅 [Supported Models](https://docs.perplexity.ai/guides/model-cards) 了解可用选项。

* **设置 chat completions path**：
将 `spring.ai.openai.chat.completions-path` 设置为 `/chat/completions`。
请参阅 [chat completions api](https://docs.perplexity.ai/api-reference/chat-completions) 了解更多详细信息。

您可以在 `application.properties` 文件中设置这些配置属性：

```properties
spring.ai.openai.api-key=<your-perplexity-api-key>
spring.ai.openai.base-url=https://api.perplexity.ai
spring.ai.openai.chat.model=llama-3.1-sonar-small-128k-online
spring.ai.openai.chat.completions-path=/chat/completions
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    openai:
      api-key: ${PERPLEXITY_API_KEY}
      base-url: ${PERPLEXITY_BASE_URL}
      chat:
        model: ${PERPLEXITY_MODEL}
        completions-path: ${PERPLEXITY_COMPLETIONS_PATH}
```

```bash
# In your environment or .env file
export PERPLEXITY_API_KEY=<your-perplexity-api-key>
export PERPLEXITY_BASE_URL=https://api.perplexity.ai
export PERPLEXITY_MODEL=llama-3.1-sonar-small-128k-online
export PERPLEXITY_COMPLETIONS_PATH=/chat/completions
```

您也可以在应用程序代码中以编程方式设置这些配置：

```java
// Retrieve configuration from secure sources or environment variables
String apiKey = System.getenv("PERPLEXITY_API_KEY");
String baseUrl = System.getenv("PERPLEXITY_BASE_URL");
String model = System.getenv("PERPLEXITY_MODEL");
String completionsPath = System.getenv("PERPLEXITY_COMPLETIONS_PATH");
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

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
}
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
| spring.ai.openai.base-url | 要连接到的 URL。必须设置为 `+https://api.perplexity.ai+` | - |
| spring.ai.openai.chat.api-key | 您的 Perplexity API Key | - |

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
| spring.ai.model.chat | 启用 OpenAI chat model。 | openai |
| spring.ai.openai.chat.model | 支持的 [Perplexity models](https://docs.perplexity.ai/guides/model-cards) 之一。示例：`llama-3.1-sonar-small-128k-online`。 | - |
| spring.ai.openai.chat.base-url | 可选覆盖 spring.ai.openai.base-url 以提供 chat 特定的 url。必须设置为 `+https://api.perplexity.ai+` | - |
| spring.ai.openai.chat.completions-path | 必须设置为 `/chat/completions` | `/v1/chat/completions` |
| spring.ai.openai.chat.options.temperature | 响应中的随机性量，值在 0（包含）和 2（不包含）之间。较高的值更加随机，较低的值更加确定性。必需范围：`0 < x < 2`。 | 0.2 |
| spring.ai.openai.chat.options.frequencyPenalty | 大于 0 的乘法惩罚。大于 1.0 的值会根据到目前为止文本中现有频率对新 tokens 进行惩罚，降低模型逐字重复同一行的可能性。值为 1.0 表示无惩罚。与 presence_penalty 不兼容。必需范围：`x > 0`。 | 1 |
| spring.ai.openai.chat.options.maxTokens | API 返回的最大 completion tokens 数。max_tokens 中请求的 tokens 总数加上在 messages 中发送的 prompt tokens 数不得超过请求模型的上下文窗口 token 限制。如果未指定，则模型将生成 tokens，直到它达到其 stop token 或其上下文窗口的末尾。 | - |
| spring.ai.openai.chat.options.presencePenalty | 介于 -2.0 和 2.0 之间的值。正值会根据到目前为止是否出现新 tokens 进行惩罚，增加模型讨论新主题的可能性。与 `frequency_penalty` 不兼容。必需范围：`-2 < x < 2` | 0 |
| spring.ai.openai.chat.options.topP | nucleus sampling 阈值，值在 0 和 1 之间（包含）。对于每个后续 token，模型考虑具有 top_p 概率质量的 tokens 结果。我们建议修改 top_k 或 top_p，但不要同时修改两者。必需范围：`0 < x < 1` | 0.9 |
| spring.ai.openai.chat.options.stream-usage | （仅用于 streaming）设置为添加包含整个请求的 token 使用统计信息的额外块。此块的 `choices` 字段是一个空数组，所有其他块也将包含一个 usage 字段，但值为 null。 | false |

> **提示：** 所有前缀为 `spring.ai.openai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime Options [[chat-options]]

[OpenAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `OpenAiChatModel(api, options)` 构造函数或 `spring.ai.openai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        OpenAiChatOptions.builder()
            .model("llama-3.1-sonar-large-128k-online")
            .temperature(0.4)
        .build()
    ));
```

> **提示：** 除了模型特定的 [OpenAiChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Function Calling

> **注意：** Perplexity 不支持显式 function calling。相反，它将搜索结果直接集成到响应中。

## Multimodal

> **注意：** 目前，Perplexity API 不支持媒体内容。

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-openai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 OpenAi chat model：

```properties
spring.ai.openai.api-key=<PERPLEXITY_API_KEY>
spring.ai.openai.base-url=https://api.perplexity.ai
spring.ai.openai.chat.completions-path=/chat/completions
spring.ai.openai.chat.options.model=llama-3.1-sonar-small-128k-online
spring.ai.openai.chat.options.temperature=0.7

# The Perplexity API doesn't support embeddings, so we need to disable it.
spring.ai.openai.embedding.enabled=false
```

> **提示：** 将 `api-key` 替换为您的 Perplexity Api key。

这将创建一个 `OpenAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final OpenAiChatModel chatModel;

    @Autowired
    public ChatController(OpenAiChatModel chatModel) {
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

## Supported Models

Perplexity 支持多个针对搜索增强 conversational AI 优化的模型。请参阅 [Supported Models](https://docs.perplexity.ai/guides/model-cards) 了解详细信息。

## References

* [Documentation Home](https://docs.perplexity.ai/home)
* [API Reference](https://docs.perplexity.ai/api-reference/chat-completions)
* [Getting Started](https://docs.perplexity.ai/guides/getting-started)
* [Rate Limits](https://docs.perplexity.ai/guides/rate-limits)

