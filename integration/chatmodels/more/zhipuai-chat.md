# ZhiPu AI Chat

Spring AI 支持来自 ZhiPu AI 的各种 AI 语言模型。您可以与 ZhiPu AI 语言模型交互，并基于 ZhiPuAI 模型创建多语言对话助手。

如果您不是中文用户，可以访问 ZhiPuAI 的国际站点 [Z.ai](https://z.ai/model-api)

## Prerequisites

您需要使用 ZhiPuAI 创建 API 才能访问 ZhiPu AI 语言模型。

在 [ZhiPu AI registration page](https://open.bigmodel.cn/login)（或 [Z.ai registration page](https://chat.z.ai/auth)）创建账户，并在 [API Keys page](https://open.bigmodel.cn/usercenter/apikeys)（或 [Z.ai API Keys page](https://z.ai/manage-apikey/apikey-list)）生成 token。

Spring AI 项目定义了一个名为 `spring.ai.zhipuai.api-key` 的配置属性，您应将其设置为从 API Keys 页面获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.zhipuai.api-key=<your-zhipuai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    zhipuai:
      api-key: ${ZHIPUAI_API_KEY}
```

```bash
# In your environment or .env file
export ZHIPUAI_API_KEY=<your-zhipuai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("ZHIPUAI_API_KEY");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 ZhiPuAI Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-zhipuai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-zhipuai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

#### Retry Properties

前缀 `spring.ai.retry` 是用于配置 ZhiPu AI chat model 的 retry 机制的属性前缀。

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

前缀 `spring.ai.zhipuai` 是用于连接到 ZhiPuAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.base-url | 要连接到的 ZhiPuAI API 的 URL。如果您使用 Z.ai Platform，需要将其设置为 `https://api.z.ai/api/paas`。 | `https://open.bigmodel.cn/api/paas` |
| spring.ai.zhipuai.api-key | API Key | - |

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=zhipuai（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 zhipuai 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.zhipuai.chat` 是用于配置 ZhiPuAI 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.chat.enabled (Removed and no longer valid) | 启用 ZhiPuAI chat model。 | true |
| spring.ai.model.chat | 启用 ZhiPuAI chat model。 | zhipuai |
| spring.ai.zhipuai.chat.base-url | 可选覆盖 spring.ai.zhipuai.base-url 以提供 chat 特定的 url。如果您使用 Z.ai Platform，需要将其设置为 `https://api.z.ai/api/paas`。 | `https://open.bigmodel.cn/api/paas` |
| spring.ai.zhipuai.chat.api-key | 可选覆盖 spring.ai.zhipuai.api-key 以提供 chat 特定的 api-key。 | - |
| spring.ai.zhipuai.chat.options.model | 要使用的 ZhiPuAI Chat model。您可以在以下模型之间选择：`glm-4.6`、`glm-4.5`、`glm-4-air` 等。 | `glm-4-air` |
| spring.ai.zhipuai.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。 | - |
| spring.ai.zhipuai.chat.options.temperature | 要使用的采样 temperature，介于 0 和 1 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如 0.2）将使输出更加聚焦和确定性。我们通常建议修改此值或 top_p，但不要同时修改两者。 | 0.7 |
| spring.ai.zhipuai.chat.options.topP | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法，其中模型考虑具有 top_p 概率质量的 tokens 结果。因此，0.1 意味着只考虑包含 top 10% 概率质量的 tokens。我们通常建议修改此值或 temperature，但不要同时修改两者。 | 1.0 |
| spring.ai.zhipuai.chat.options.stop | 模型将停止生成由 stop 指定的字符，目前仅支持 ["stop_word1"] 格式的单个停止词 | - |
| spring.ai.zhipuai.chat.options.user | 代表您的最终用户的唯一标识符，可以帮助 ZhiPuAI 监控和检测滥用。 | - |
| spring.ai.zhipuai.chat.options.requestId | 由客户端传递的参数，必须确保唯一性。用于区分每个请求的唯一标识符。如果客户端不提供，平台将默认生成。 | - |
| spring.ai.zhipuai.chat.options.doSample | 当 do_sample 设置为 true 时，启用采样策略。如果 do_sample 为 false，采样策略参数 temperature 和 top_p 将不会生效。 | true |
| spring.ai.zhipuai.chat.options.response-format.type | 控制模型输出的格式。设置为 `json_object` 以确保消息是有效的 JSON 对象。可用选项：`text` 或 `json_object`。 | - |
| spring.ai.zhipuai.chat.options.thinking.type | 控制是否启用大模型的 chain of thought。可用选项：`enabled` 或 `disabled`。 | - |
| spring.ai.zhipuai.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.zhipuai.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.zhipuai.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |

> **注意：** 您可以为 `ChatModel` 实现覆盖通用的 `spring.ai.zhipuai.base-url` 和 `spring.ai.zhipuai.api-key`。
> 如果设置了 `spring.ai.zhipuai.chat.base-url` 和 `spring.ai.zhipuai.chat.api-key` 属性，则优先于通用属性。
> 如果您想对不同的模型和不同的模型端点使用不同的 ZhiPuAI 账户，这很有用。

> **提示：** 所有前缀为 `spring.ai.zhipuai.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime Options [[chat-options]]

[ZhiPuAiChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `ZhiPuAiChatModel(api, options)` 构造函数或 `spring.ai.zhipuai.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        ZhiPuAiChatOptions.builder()
            .model(ZhiPuAiApi.ChatModel.GLM_4_Air.getValue())
            .temperature(0.5)
        .build()
    ));
```

> **提示：** 除了模型特定的 [ZhiPuAiChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-zhipuai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 ZhiPuAi chat model：

```properties
spring.ai.zhipuai.api-key=YOUR_API_KEY
spring.ai.zhipuai.chat.options.model=glm-4-air
spring.ai.zhipuai.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 ZhiPuAI 凭据。

这将创建一个 `ZhiPuAiChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final ZhiPuAiChatModel chatModel;

    @Autowired
    public ChatController(ZhiPuAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", this.chatModel.call(message));
    }

    @GetMapping(value = "/ai/generateStream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public Flux<ChatResponse> generateStream(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        var prompt = new Prompt(new UserMessage(message));
        return this.chatModel.stream(prompt);
    }
}
```

## Manual Configuration

[ZhiPuAiChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 【low-level-api】 连接到 ZhiPuAI 服务。

将 `spring-ai-zhipuai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-zhipuai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-zhipuai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `ZhiPuAiChatModel` 并将其用于文本生成：

```java
var zhiPuAiApi = new ZhiPuAiApi(System.getenv("ZHIPU_AI_API_KEY"));

var chatModel = new ZhiPuAiChatModel(this.zhiPuAiApi, ZhiPuAiChatOptions.builder()
                .model(ZhiPuAiApi.ChatModel.GLM_4_Air.getValue())
                .temperature(0.4)
                .maxTokens(200)
                .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> streamResponse = this.chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

`ZhiPuAiChatOptions` 提供 chat 请求的配置信息。
`ZhiPuAiChatOptions.Builder` 是一个流畅的选项构建器。

### Low-level ZhiPuAiApi Client [[low-level-api]]

[ZhiPuAiApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/api/ZhiPuAiApi.java) 为 [ZhiPu AI API](https://open.bigmodel.cn/dev/api) 提供轻量级 Java 客户端。

以下是如何以编程方式使用 API 的简单示例：

```java
ZhiPuAiApi zhiPuAiApi =
    new ZhiPuAiApi(System.getenv("ZHIPU_AI_API_KEY"));

ChatCompletionMessage chatCompletionMessage =
    new ChatCompletionMessage("Hello world", Role.USER);

// Sync request
ResponseEntity<ChatCompletion> response = this.zhiPuAiApi.chatCompletionEntity(
    new ChatCompletionRequest(List.of(this.chatCompletionMessage), ZhiPuAiApi.ChatModel.GLM_4_Air.getValue(), 0.7, false));

// Streaming request
Flux<ChatCompletionChunk> streamResponse = this.zhiPuAiApi.chatCompletionStream(
        new ChatCompletionRequest(List.of(this.chatCompletionMessage), ZhiPuAiApi.ChatModel.GLM_4_Air.getValue(), 0.7, true));
```

请参阅 [ZhiPuAiApi.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/api/ZhiPuAiApi.java) 的 JavaDoc 了解更多信息。

#### ZhiPuAiApi Samples

* [ZhiPuAiApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/test/java/org/springframework/ai/zhipuai/api/ZhiPuAiApiIT.java) 测试提供了一些如何使用轻量级库的一般示例。

