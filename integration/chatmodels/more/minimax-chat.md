# MiniMax Chat

Spring AI 支持来自 MiniMax 的各种 AI 语言模型。您可以与 MiniMax 语言模型交互，并基于 MiniMax 模型创建多语言对话助手。

## Prerequisites

您需要使用 MiniMax 创建 API 才能访问 MiniMax 语言模型。

在 [MiniMax registration page](https://www.minimaxi.com/login) 创建账户，并在 [API Keys page](https://www.minimaxi.com/user-center/basic-information/interface-key) 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.minimax.api-key` 的配置属性，您应将其设置为从 API Keys 页面获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.minimax.api-key=<your-minimax-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    minimax:
      api-key: ${MINIMAX_API_KEY}
```

```bash
# In your environment or .env file
export MINIMAX_API_KEY=<your-minimax-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("MINIMAX_API_KEY");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 MiniMax Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-minimax</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-minimax'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

#### Retry Properties

前缀 `spring.ai.retry` 是用于配置 MiniMax chat model 的 retry 机制的属性前缀。

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

前缀 `spring.ai.minimax` 是用于连接到 MiniMax 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.minimax.base-url | 要连接到的 URL | https://api.minimax.chat |
| spring.ai.minimax.api-key | API Key | - |

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=minimax（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 minimax 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.minimax.chat` 是用于配置 MiniMax 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.minimax.chat.enabled (Removed and no longer valid) | 启用 MiniMax chat model。 | true |
| spring.ai.model.chat | 启用 MiniMax chat model。 | minimax |
| spring.ai.minimax.chat.base-url | 可选覆盖 spring.ai.minimax.base-url 以提供 chat 特定的 url | https://api.minimax.chat |
| spring.ai.minimax.chat.api-key | 可选覆盖 spring.ai.minimax.api-key 以提供 chat 特定的 api-key | - |
| spring.ai.minimax.chat.options.model | 要使用的 MiniMax Chat model | `abab6.5g-chat`（`abab5.5-chat`、`abab5.5s-chat`、`abab6.5-chat`、`abab6.5g-chat`、`abab6.5t-chat` 和 `abab6.5s-chat` 指向最新模型版本） |
| spring.ai.minimax.chat.options.maxTokens | 在 chat completion 中生成的最大 tokens 数。输入 tokens 和生成 tokens 的总长度受模型上下文长度的限制。 | - |
| spring.ai.minimax.chat.options.temperature | 用于控制生成 completions 的明显创造力的采样 temperature。较高的值将使输出更加随机，而较低的值将使结果更加聚焦和确定性。不建议为同一个 completions 请求修改 temperature 和 top_p，因为这两个设置的交互很难预测。 | 0.7 |
| spring.ai.minimax.chat.options.topP | 除了 temperature 采样之外，还有一种称为 nucleus sampling 的替代方法，其中模型考虑具有 top_p 概率质量的 tokens 结果。因此，0.1 意味着只考虑包含 top 10% 概率质量的 tokens。我们通常建议修改此值或 temperature，但不要同时修改两者。 | 1.0 |
| spring.ai.minimax.chat.options.n | 为每个输入消息生成多少个 chat completion 选择。请注意，您将根据所有选择中生成的 tokens 数收费。默认值为 1，不能大于 5。具体来说，当 temperature 非常小且接近 0 时，我们只能返回 1 个结果。如果此时 n 已设置且 >1，服务将返回非法输入参数 (invalid_request_error) | 1 |
| spring.ai.minimax.chat.options.presencePenalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现新 tokens 进行惩罚，增加模型讨论新主题的可能性。 | 0.0f |
| spring.ai.minimax.chat.options.frequencyPenalty | 介于 -2.0 和 2.0 之间的数字。正值会根据到目前为止文本中现有频率对新 tokens 进行惩罚，降低模型逐字重复同一行的可能性。 | 0.0f |
| spring.ai.minimax.chat.options.stop | 模型将停止生成由 stop 指定的字符，目前仅支持 ["stop_word1"] 格式的单个停止词 | - |
| spring.ai.minimax.chat.options.tool-names | 按名称标识的工具列表，用于在单个 prompt 请求中启用 function calling。具有这些名称的工具必须存在于 ToolCallback 注册表中。 | - |
| spring.ai.minimax.chat.options.tool-callbacks | 要注册到 ChatModel 的 Tool Callbacks。 | - |
| spring.ai.minimax.chat.options.internal-tool-execution-enabled | 如果为 false，Spring AI 不会在内部处理 tool calls，而是将它们代理到客户端。然后客户端负责处理 tool calls，将它们分派到适当的 function，并返回结果。如果为 true（默认值），Spring AI 将在内部处理 function calls。仅适用于支持 function calling 的 chat models | true |

> **注意：** 您可以为 `ChatModel` 实现覆盖通用的 `spring.ai.minimax.base-url` 和 `spring.ai.minimax.api-key`。
> 如果设置了 `spring.ai.minimax.chat.base-url` 和 `spring.ai.minimax.chat.api-key` 属性，则优先于通用属性。
> 如果您想对不同的模型和不同的模型端点使用不同的 MiniMax 账户，这很有用。

> **提示：** 所有前缀为 `spring.ai.minimax.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 `chat-options` 在运行时覆盖。

## Runtime Options [[chat-options]]

[MiniMaxChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/MiniMaxChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `MiniMaxChatModel(api, options)` 构造函数或 `spring.ai.minimax.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        MiniMaxChatOptions.builder()
            .model(MiniMaxApi.ChatModel.ABAB_6_5_S_Chat.getValue())
            .temperature(0.5)
        .build()
    ));
```

> **提示：** 除了模型特定的 [MiniMaxChatOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/MiniMaxChatOptions.java) 之外，您还可以使用可移植的 [ChatOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/ChatOptions.java) 实例，该实例使用 [ChatOptions#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/prompt/DefaultChatOptionsBuilder.java) 创建。

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-minimax` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 MiniMax chat model：

```properties
spring.ai.minimax.api-key=YOUR_API_KEY
spring.ai.minimax.chat.options.model=abab6.5g-chat
spring.ai.minimax.chat.options.temperature=0.7
```

> **提示：** 将 `api-key` 替换为您的 MiniMax 凭据。

这将创建一个 `MiniMaxChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final MiniMaxChatModel chatModel;

    @Autowired
    public ChatController(MiniMaxChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
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

[MiniMaxChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/MiniMaxChatModel.java) 实现了 `ChatModel` 和 `StreamingChatModel`，并使用 【low-level-api】 连接到 MiniMax 服务。

将 `spring-ai-minimax` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-minimax</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-minimax'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `MiniMaxChatModel` 并将其用于文本生成：

```java
var miniMaxApi = new MiniMaxApi(System.getenv("MINIMAX_API_KEY"));

var chatModel = new MiniMaxChatModel(this.miniMaxApi, MiniMaxChatOptions.builder()
                .model(MiniMaxApi.ChatModel.ABAB_6_5_S_Chat.getValue())
                .temperature(0.4)
                .maxTokens(200)
                .build());

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

// Or with streaming responses
Flux<ChatResponse> streamResponse = this.chatModel.stream(
    new Prompt("Generate the names of 5 famous pirates."));
```

`MiniMaxChatOptions` 提供 chat 请求的配置信息。
`MiniMaxChatOptions.Builder` 是一个流畅的选项构建器。

### Low-level MiniMaxApi Client [[low-level-api]]

[MiniMaxApi](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/api/MiniMaxApi.java) 为 [MiniMax API](https://www.minimaxi.com/document/guides/chat-model/V2) 提供轻量级 Java 客户端。

以下是如何以编程方式使用 API 的简单示例：

```java
MiniMaxApi miniMaxApi =
    new MiniMaxApi(System.getenv("MINIMAX_API_KEY"));

ChatCompletionMessage chatCompletionMessage =
    new ChatCompletionMessage("Hello world", Role.USER);

// Sync request
ResponseEntity<ChatCompletion> response = this.miniMaxApi.chatCompletionEntity(
    new ChatCompletionRequest(List.of(this.chatCompletionMessage), MiniMaxApi.ChatModel.ABAB_6_5_S_Chat.getValue(), 0.7, false));

// Streaming request
Flux<ChatCompletionChunk> streamResponse = this.miniMaxApi.chatCompletionStream(
    new ChatCompletionRequest(List.of(this.chatCompletionMessage), MiniMaxApi.ChatModel.ABAB_6_5_S_Chat.getValue(), 0.7, true));
```

请参阅 [MiniMaxApi.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/api/MiniMaxApi.java) 的 JavaDoc 了解更多信息。

### WebSearch chat [[web-search]]

MiniMax 模型支持 web search 功能。web search 功能允许您在网络上搜索信息并在 chat 响应中返回结果。

有关 web search，请参阅 [MiniMax ChatCompletion](https://platform.minimaxi.com/document/ChatCompletion%20v2) 了解更多信息。

以下是如何使用 web search 的简单示例：

```java
UserMessage userMessage = new UserMessage(
        "How many gold medals has the United States won in total at the 2024 Olympics?");

List<Message> messages = new ArrayList<>(List.of(this.userMessage));

List<MiniMaxApi.FunctionTool> functionTool = List.of(MiniMaxApi.FunctionTool.webSearchFunctionTool());

MiniMaxChatOptions options = MiniMaxChatOptions.builder()
    .model(MiniMaxApi.ChatModel.ABAB_6_5_S_Chat.value)
    .tools(this.functionTool)
    .build();


// Sync request
ChatResponse response = chatModel.call(new Prompt(this.messages, this.options));

// Streaming request
Flux<ChatResponse> streamResponse = chatModel.stream(new Prompt(this.messages, this.options));
```

#### MiniMaxApi Samples

* [MiniMaxApiIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/test/java/org/springframework/ai/minimax/api/MiniMaxApiIT.java) 测试提供了一些如何使用轻量级库的一般示例。
* [MiniMaxApiToolFunctionCallIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/test/java/org/springframework/ai/minimax/api/MiniMaxApiToolFunctionCallIT.java) 测试展示了如何使用 low-level API 调用 tool functions。

