# Chat Client API

`ChatClient` 提供了一个用于与 AI Model 通信的流式 API。
它支持同步和流式两种编程模型。

> **NOTE:**
> 请参阅本文档底部的 [实现说明](#implementation-notes)，了解 `ChatClient` 中命令式和响应式编程模型结合使用的相关信息。

流式 API 提供了用于构建传递给 AI model 作为输入的 [Prompt](prompt#_prompt) 的各个组成部分的方法。
`Prompt` 包含用于指导 AI model 输出和行为的指令文本。从 API 的角度来看，prompts 由消息集合组成。

AI model 处理两种主要类型的消息：用户消息（来自用户的直接输入）和系统消息（由系统生成以指导对话）。

这些消息通常包含占位符，这些占位符在运行时根据用户输入进行替换，以自定义 AI model 对用户输入的响应。

还可以指定 Prompt 选项，例如要使用的 AI Model 名称和控制生成输出随机性或创造性的 temperature 设置。

## 创建 ChatClient

`ChatClient` 使用 `ChatClient.Builder` 对象创建。
您可以为任何 [ChatModel](chatmodel) Spring Boot 自动配置获取自动配置的 `ChatClient.Builder` 实例，或以编程方式创建一个。

### 使用自动配置的 ChatClient.Builder

在最简单的用例中，Spring AI 提供 Spring Boot 自动配置，为您创建一个原型 `ChatClient.Builder` bean，以便注入到您的类中。
以下是一个简单的示例，展示如何获取对简单用户请求的 `String` 响应。

```java
@RestController
class MyController {

    private final ChatClient chatClient;

    public MyController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/ai")
    String generation(String userInput) {
        return this.chatClient.prompt()
            .user(userInput)
            .call()
            .content();
    }
}
```

在这个简单示例中，用户输入设置用户消息的内容。
`call()` 方法向 AI model 发送请求，`content()` 方法将 AI model 的响应作为 `String` 返回。

### 使用多个 Chat Model

在单个应用程序中，您可能需要使用多个 chat model 的场景包括：

* 为不同类型的任务使用不同的模型（例如，为复杂推理使用强大的模型，为简单任务使用更快、更便宜的模型）
* 当一个 model 服务不可用时实现回退机制
* 对不同的模型或配置进行 A/B 测试
* 根据用户偏好为用户提供模型选择
* 组合专用模型（一个用于代码生成，另一个用于创意内容等）

默认情况下，Spring AI 自动配置单个 `ChatClient.Builder` bean。
但是，您可能需要在应用程序中使用多个 chat model。
以下是处理此场景的方法：

在所有情况下，您需要通过设置属性 `spring.ai.chat.client.enabled=false` 来禁用 `ChatClient.Builder` 自动配置。

这允许您手动创建多个 `ChatClient` 实例。

#### 使用单一 Model 类型的多个 ChatClient

本节介绍一个常见用例，您需要创建多个 ChatClient 实例，它们都使用相同的基础 model 类型但具有不同的配置。

```java
// Create ChatClient instances programmatically
ChatModel myChatModel = ... // already autoconfigured by Spring Boot
ChatClient chatClient = ChatClient.create(myChatModel);

// Or use the builder for more control
ChatClient.Builder builder = ChatClient.builder(myChatModel);
ChatClient customChatClient = builder
    .defaultSystemPrompt("You are a helpful assistant.")
    .build();
```

#### 不同 Model 类型的 ChatClient

在使用多个 AI model 时，您可以为每个 model 定义单独的 `ChatClient` bean：

```java
import org.springframework.ai.chat.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatClientConfig {
    
    @Bean
    public ChatClient openAiChatClient(OpenAiChatModel chatModel) {
        return ChatClient.create(chatModel);
    }
    
    @Bean
    public ChatClient anthropicChatClient(AnthropicChatModel chatModel) {
        return ChatClient.create(chatModel);
    }
}
```

然后，您可以使用 `@Qualifier` 注解将这些 bean 注入到应用程序组件中：

```java

@Configuration
public class ChatClientExample {
    
    @Bean
    CommandLineRunner cli(
            @Qualifier("openAiChatClient") ChatClient openAiChatClient,
            @Qualifier("anthropicChatClient") ChatClient anthropicChatClient) {
        
        return args -> {
            var scanner = new Scanner(System.in);
            ChatClient chat;
            
            // Model selection
            System.out.println("\nSelect your AI model:");
            System.out.println("1. OpenAI");
            System.out.println("2. Anthropic");
            System.out.print("Enter your choice (1 or 2): ");
            
            String choice = scanner.nextLine().trim();
            
            if (choice.equals("1")) {
                chat = openAiChatClient;
                System.out.println("Using OpenAI model");
            } else {
                chat = anthropicChatClient;
                System.out.println("Using Anthropic model");
            }
            
            // Use the selected chat client
            System.out.print("\nEnter your question: ");
            String input = scanner.nextLine();
            String response = chat.prompt(input).call().content();
            System.out.println("ASSISTANT: " + response);
            
            scanner.close();
        };
    }
}
```

#### 多个 OpenAI 兼容的 API 端点

`OpenAiApi` 和 `OpenAiChatModel` 类提供了一个 `mutate()` 方法，允许您创建具有不同属性的现有实例的变体。
当您需要与多个 OpenAI 兼容的 API 一起工作时，这特别有用。

```java

@Service
public class MultiModelService {
    
    private static final Logger logger = LoggerFactory.getLogger(MultiModelService.class);
    
    @Autowired
    private OpenAiChatModel baseChatModel;
    
    @Autowired
    private OpenAiApi baseOpenAiApi;
    
    public void multiClientFlow() {
        try {
            // Derive a new OpenAiApi for Groq (Llama3)
            OpenAiApi groqApi = baseOpenAiApi.mutate()
                .baseUrl("https://api.groq.com/openai")
                .apiKey(System.getenv("GROQ_API_KEY"))
                .build();
            
            // Derive a new OpenAiApi for OpenAI GPT-4
            OpenAiApi gpt4Api = baseOpenAiApi.mutate()
                .baseUrl("https://api.openai.com")
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .build();
            
            // Derive a new OpenAiChatModel for Groq
            OpenAiChatModel groqModel = baseChatModel.mutate()
                .openAiApi(groqApi)
                .defaultOptions(OpenAiChatOptions.builder().model("llama3-70b-8192").temperature(0.5).build())
                .build();
            
            // Derive a new OpenAiChatModel for GPT-4
            OpenAiChatModel gpt4Model = baseChatModel.mutate()
                .openAiApi(gpt4Api)
                .defaultOptions(OpenAiChatOptions.builder().model("gpt-4").temperature(0.7).build())
                .build();
            
            // Simple prompt for both models
            String prompt = "What is the capital of France?";
            
            String groqResponse = ChatClient.builder(groqModel).build().prompt(prompt).call().content();
            String gpt4Response = ChatClient.builder(gpt4Model).build().prompt(prompt).call().content();
            
            logger.info("Groq (Llama3) response: {}", groqResponse);
            logger.info("OpenAI GPT-4 response: {}", gpt4Response);
        }
        catch (Exception e) {
            logger.error("Error in multi-client flow", e);
        }
    }
}
```

## ChatClient 流式 API

`ChatClient` 流式 API 允许您使用重载的 `prompt` 方法以三种不同的方式创建 prompt，以启动流式 API：

* `prompt()`：此无参数方法让您开始使用流式 API，允许您构建用户、系统和其他 prompt 部分。

* `prompt(Prompt prompt)`：此方法接受 `Prompt` 参数，允许您传入使用 Prompt 的非流式 API 创建的 `Prompt` 实例。

* `prompt(String content)`：这是一个便捷方法，类似于前一个重载。它接受用户的文本内容。

## ChatClient 响应

`ChatClient` API 提供了多种方式来格式化来自 AI Model 的响应，使用流式 API。

### 返回 ChatResponse

来自 AI model 的响应是由类型 [ChatResponse](chatmodel#ChatResponse) 定义的丰富结构。
它包括有关如何生成响应的元数据，还可以包含多个响应，称为 [Generation](chatmodel#Generation)s，每个都有自己的元数据。
元数据包括用于创建响应的 token 数量（每个 token 大约相当于 3/4 个单词）。
此信息很重要，因为托管 AI model 根据每个请求使用的 token 数量收费。

以下示例通过在 `call()` 方法后调用 `chatResponse()` 来返回包含元数据的 `ChatResponse` 对象。

```java
ChatResponse chatResponse = chatClient.prompt()
    .user("Tell me a joke")
    .call()
    .chatResponse();
```

### 返回实体

您通常希望返回从返回的 `String` 映射的实体类。
`entity()` 方法提供此功能。

例如，给定 Java record：

```java
record ActorFilms(String actor, List<String> movies) {}
```

您可以使用 `entity()` 方法轻松将 AI model 的输出映射到此 record，如下所示：

```java
ActorFilms actorFilms = chatClient.prompt()
    .user("Generate the filmography for a random actor.")
    .call()
    .entity(ActorFilms.class);
```

还有一个重载的 `entity` 方法，签名 `entity(ParameterizedTypeReference<T> type)`，允许您指定类型，例如泛型 List：

```java
List<ActorFilms> actorFilms = chatClient.prompt()
    .user("Generate the filmography of 5 movies for Tom Hanks and Bill Murray.")
    .call()
    .entity(new ParameterizedTypeReference<List<ActorFilms>>() {});
```

#### 原生结构化输出

随着更多 AI model 原生支持结构化输出，您可以通过在调用 `ChatClient` 时使用 `AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT` advisor 参数来利用此功能。
您可以使用 `ChatClient.Builder` 上的 `defaultAdvisors()` 方法为所有调用全局设置此参数，或按调用设置，如下所示：

```java
ActorFilms actorFilms = chatClient.prompt()
    .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
    .user("Generate the filmography for a random actor.")
    .call()
    .entity(ActorFilms.class);
```

> **NOTE:** 某些 AI model（如 OpenAI）不原生支持对象数组。
> 在这种情况下，您可以使用 Spring AI 默认的结构化输出转换。

### 流式响应

`stream()` 方法让您获得异步响应，如下所示：

```java

Flux<String> output = chatClient.prompt()
    .user("Tell me a joke")
    .stream()
    .content();
```

您还可以使用 `Flux<ChatResponse> chatResponse()` 方法流式传输 `ChatResponse`。

将来，我们将提供一个便捷方法，让您使用响应式 `stream()` 方法返回 Java 实体。
同时，您应该使用 [Structured Output Converter](structured-output-converter#StructuredOutputConverter) 显式转换聚合响应，如下所示。
这也演示了流式 API 中参数的使用，将在文档的后续部分中更详细地讨论。

```java
var converter = new BeanOutputConverter<>(new ParameterizedTypeReference<List<ActorsFilms>>() {});

Flux<String> flux = this.chatClient.prompt()
    .user(u -> u.text("""
                        Generate the filmography for a random actor.
                        {format}
                      """)
            .param("format", this.converter.getFormat()))
    .stream()
    .content();

String content = this.flux.collectList().block().stream().collect(Collectors.joining());

List<ActorsFilms> actorFilms = this.converter.convert(this.content);
```

## Prompt 模板

`ChatClient` 流式 API 允许您提供用户和系统文本作为模板，其中包含在运行时替换的变量。

```java
String answer = ChatClient.create(chatModel).prompt()
    .user(u -> u
            .text("Tell me the names of 5 movies whose soundtrack was composed by {composer}")
            .param("composer", "John Williams"))
    .call()
    .content();
```

在内部，ChatClient 使用 `PromptTemplate` 类来处理用户和系统文本，并使用给定的 `TemplateRenderer` 实现将变量替换为运行时提供的值。
默认情况下，Spring AI 使用 `StTemplateRenderer` 实现，它基于 Terence Parr 开发的开源 [StringTemplate](https://www.stringtemplate.org/) 引擎。

Spring AI 还提供了一个 `NoOpTemplateRenderer`，用于不需要模板处理的情况。

> **NOTE:** 直接在 `ChatClient` 上配置的 `TemplateRenderer`（通过 `.templateRenderer()`）仅适用于在 `ChatClient` 构建器链中直接定义的 prompt 内容（例如，通过 `.user()`、`.system()`）。
> 它*不会*影响 [Advisors](rag/retrieval-augmented-generation#_questionansweradvisor)（如 `QuestionAnswerAdvisor`）内部使用的模板，它们有自己的模板自定义机制（请参阅 [自定义 Advisor 模板](rag/retrieval-augmented-generation#_custom_template)）。

如果您想使用不同的模板引擎，可以直接向 ChatClient 提供 `TemplateRenderer` 接口的自定义实现。您也可以继续使用默认的 `StTemplateRenderer`，但使用自定义配置。

例如，默认情况下，模板变量由 `{}` 语法标识。
如果您计划在 prompt 中包含 JSON，您可能希望使用不同的语法以避免与 JSON 语法冲突。例如，您可以使用 `<` 和 `>` 分隔符。

```java
String answer = ChatClient.create(chatModel).prompt()
    .user(u -> u
            .text("Tell me the names of 5 movies whose soundtrack was composed by <composer>")
            .param("composer", "John Williams"))
    .templateRenderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .call()
    .content();
```

## call() 返回值

在 `ChatClient` 上指定 `call()` 方法后，响应类型有几种不同的选项。

* `String content()`：返回响应的 String 内容
* `ChatResponse chatResponse()`：返回包含多个 generations 以及响应元数据的 `ChatResponse` 对象，例如用于创建响应的 token 数量。
* `ChatClientResponse chatClientResponse()`：返回包含 `ChatResponse` 对象和 ChatClient 执行上下文的 `ChatClientResponse` 对象，让您可以访问在执行 advisors 期间使用的其他数据（例如，在 RAG 流程中检索到的相关文档）。
* `entity()` 返回 Java 类型
** `entity(ParameterizedTypeReference<T> type)`：用于返回 `Collection` 实体类型。
** `entity(Class<T> type)`：用于返回特定实体类型。
** `entity(StructuredOutputConverter<T> structuredOutputConverter)`：用于指定 `StructuredOutputConverter` 实例以将 `String` 转换为实体类型。
* `responseEntity()` 返回 `ChatResponse` 和 Java 类型。当您需要在单个调用中访问完整的 AI model 响应（包含元数据和 generations）和结构化输出实体时，这很有用。
** `responseEntity(Class<T> type)`：用于返回包含完整 `ChatResponse` 对象和特定实体类型的 `ResponseEntity`。
** `responseEntity(ParameterizedTypeReference<T> type)`：用于返回包含完整 `ChatResponse` 对象和 `Collection` 实体类型的 `ResponseEntity`。
** `responseEntity(StructuredOutputConverter<T> structuredOutputConverter)`：用于返回包含完整 `ChatResponse` 对象和使用指定 `StructuredOutputConverter` 转换的实体的 `ResponseEntity`。

您也可以调用 `stream()` 方法而不是 `call()`。

> **NOTE:** 调用 `call()` 方法实际上不会触发 AI model 执行。相反，它只是指示 Spring AI 是否使用同步或流式调用。
> 实际的 AI model 调用发生在调用 `content()`、`chatResponse()` 和 `responseEntity()` 等方法时。

## stream() 返回值

在 `ChatClient` 上指定 `stream()` 方法后，响应类型有几个选项：

* `Flux<String> content()`：返回 AI model 正在生成的字符串的 `Flux`。
* `Flux<ChatResponse> chatResponse()`：返回包含响应附加元数据的 `ChatResponse` 对象的 `Flux`。
* `Flux<ChatClientResponse> chatClientResponse()`：返回包含 `ChatResponse` 对象和 ChatClient 执行上下文的 `ChatClientResponse` 对象的 `Flux`，让您可以访问在执行 advisors 期间使用的其他数据（例如，在 RAG 流程中检索到的相关文档）。

## 消息元数据

ChatClient 支持向用户和系统消息添加元数据。
元数据提供有关消息的附加上下文和信息，可供 AI model 或下游处理使用。

### 向用户消息添加元数据

您可以使用 `metadata()` 方法向用户消息添加元数据：

```java
// Adding individual metadata key-value pairs
String response = chatClient.prompt()
    .user(u -> u.text("What's the weather like?")
        .metadata("messageId", "msg-123")
        .metadata("userId", "user-456")
        .metadata("priority", "high"))
    .call()
    .content();

// Adding multiple metadata entries at once
Map<String, Object> userMetadata = Map.of(
    "messageId", "msg-123",
    "userId", "user-456",
    "timestamp", System.currentTimeMillis()
);

String response = chatClient.prompt()
    .user(u -> u.text("What's the weather like?")
        .metadata(userMetadata))
    .call()
    .content();
```

### 向系统消息添加元数据

同样，您可以向系统消息添加元数据：

```java
// Adding metadata to system messages
String response = chatClient.prompt()
    .system(s -> s.text("You are a helpful assistant.")
        .metadata("version", "1.0")
        .metadata("model", "gpt-4"))
    .user("Tell me a joke")
    .call()
    .content();
```

### 默认元数据支持

您还可以在 ChatClient 构建器级别配置默认元数据：

```java
@Configuration
class Config {
    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultSystem(s -> s.text("You are a helpful assistant")
                .metadata("assistantType", "general")
                .metadata("version", "1.0"))
            .defaultUser(u -> u.text("Default user context")
                .metadata("sessionId", "default-session"))
            .build();
    }
}
```

### 元数据验证

ChatClient 验证元数据以确保数据完整性：

* 元数据键不能为 null 或空
* 元数据值不能为 null
* 传递 Map 时，键和值都不能包含 null 元素

```java
// This will throw an IllegalArgumentException
chatClient.prompt()
    .user(u -> u.text("Hello")
        .metadata(null, "value"))  // Invalid: null key
    .call()
    .content();

// This will also throw an IllegalArgumentException
chatClient.prompt()
    .user(u -> u.text("Hello")
        .metadata("key", null))    // Invalid: null value
    .call()
    .content();
```

### 访问元数据

元数据包含在生成的 UserMessage 和 SystemMessage 对象中，可以通过消息的 `getMetadata()` 方法访问。
这在处理 advisors 中的消息或检查对话历史时特别有用。

## 使用默认值

在 `@Configuration` 类中使用默认系统文本创建 `ChatClient` 可以简化运行时代码。
通过设置默认值，您只需要在调用 `ChatClient` 时指定用户文本，从而无需在运行时代码路径中为每个请求设置系统文本。

### 默认系统文本

在以下示例中，我们将配置系统文本以始终以海盗的声音回复。
为了避免在运行时代码中重复系统文本，我们将在 `@Configuration` 类中创建一个 `ChatClient` 实例。

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("You are a friendly chat bot that answers question in the voice of a Pirate")
                .build();
    }

}
```

以及调用它的 `@RestController`：

```java
@RestController
class AIController {

	private final ChatClient chatClient;

	AIController(ChatClient chatClient) {
		this.chatClient = chatClient;
	}

	@GetMapping("/ai/simple")
	public Map<String, String> completion(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
		return Map.of("completion", this.chatClient.prompt().user(message).call().content());
	}
}
```

通过 curl 调用应用程序端点时，结果是：

```bash
❯ curl localhost:8080/ai/simple
{"completion":"Why did the pirate go to the comedy club? To hear some arrr-rated jokes! Arrr, matey!"}
```

### 带参数的默认系统文本

在以下示例中，我们将在系统文本中使用占位符，以便在运行时而不是设计时指定完成的声音。

```java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("You are a friendly chat bot that answers question in the voice of a {voice}")
                .build();
    }

}
```

```java
@RestController
class AIController {
	private final ChatClient chatClient;

	AIController(ChatClient chatClient) {
		this.chatClient = chatClient;
	}

	@GetMapping("/ai")
	Map<String, String> completion(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message, String voice) {
		return Map.of("completion",
				this.chatClient.prompt()
						.system(sp -> sp.param("voice", voice))
						.user(message)
						.call()
						.content());
	}

}
```

通过 httpie 调用应用程序端点时，结果是：

```bash
http localhost:8080/ai voice=='Robert DeNiro'
{
    "completion": "You talkin' to me? Okay, here's a joke for ya: Why couldn't the bicycle stand up by itself? Because it was two tired! Classic, right?"
}
```

### 其他默认值

在 `ChatClient.Builder` 级别，您可以指定默认 prompt 配置。

* `defaultOptions(ChatOptions chatOptions)`：传入 `ChatOptions` 类中定义的便携选项或模型特定选项，例如 `OpenAiChatOptions` 中的选项。
有关模型特定 `ChatOptions` 实现的更多信息，请参阅 JavaDocs。

* `defaultFunction(String name, String description, java.util.function.Function<I, O> function)`：`name` 用于在用户文本中引用函数。
`description` 解释函数的用途，帮助 AI model 选择正确的函数以获得准确的响应。
`function` 参数是 model 在必要时将执行的 Java 函数实例。

* `defaultFunctions(String... functionNames)`：应用程序上下文中定义的 `java.util.Function` 的 bean 名称。

* `defaultUser(String text)`、`defaultUser(Resource text)`、`defaultUser(Consumer<UserSpec> userSpecConsumer)`：这些方法让您定义用户文本。
`Consumer<UserSpec>` 允许您使用 lambda 指定用户文本和任何默认参数。

* `defaultAdvisors(Advisor... advisor)`：Advisors 允许修改用于创建 `Prompt` 的数据。
`QuestionAnswerAdvisor` 实现通过将 prompt 附加与用户文本相关的上下文信息来启用 `Retrieval Augmented Generation` 模式。

* `defaultAdvisors(Consumer<AdvisorSpec> advisorSpecConsumer)`：此方法允许您定义一个 `Consumer` 以使用 `AdvisorSpec` 配置多个 advisors。Advisors 可以修改用于创建最终 `Prompt` 的数据。
`Consumer<AdvisorSpec>` 让您指定一个 lambda 来添加 advisors，例如 `QuestionAnswerAdvisor`，它通过基于用户文本将 prompt 附加相关上下文信息来支持 `Retrieval Augmented Generation`。

您可以使用不带 `default` 前缀的相应方法在运行时覆盖这些默认值。

* `options(ChatOptions chatOptions)`

* `function(String name, String description,
java.util.function.Function<I, O> function)`

* `functions(String... functionNames)`

* `user(String text)`、`user(Resource text)`、`user(Consumer<UserSpec> userSpecConsumer)`

* `advisors(Advisor... advisor)`

* `advisors(Consumer<AdvisorSpec> advisorSpecConsumer)`

## Advisors

[Advisors API](advisors) 提供了一种灵活而强大的方式来拦截、修改和增强 Spring 应用程序中的 AI 驱动交互。

在使用用户文本调用 AI model 时，一个常见模式是将 prompt 附加或增强上下文数据。

此上下文数据可以是不同类型。常见类型包括：

* **您自己的数据**：这是 AI model 未训练过的数据。
即使 model 见过类似的数据，附加的上下文数据在生成响应时也会优先考虑。

* **对话历史**：chat model 的 API 是无状态的。
如果您告诉 AI model 您的名字，它不会在后续交互中记住它。
对话历史必须随每个请求发送，以确保在生成响应时考虑先前的交互。

### ChatClient 中的 Advisor 配置

ChatClient 流式 API 提供了一个 `AdvisorSpec` 接口用于配置 advisors。
此接口提供添加参数、一次设置多个参数以及向链中添加一个或多个 advisors 的方法。

```java
interface AdvisorSpec {
    AdvisorSpec param(String k, Object v);
    AdvisorSpec params(Map<String, Object> p);
    AdvisorSpec advisors(Advisor... advisors);
    AdvisorSpec advisors(List<Advisor> advisors);
}
```

> **IMPORTANT:** 将 advisors 添加到链中的顺序至关重要，因为它决定了它们的执行顺序。
> 每个 advisor 以某种方式修改 prompt 或上下文，一个 advisor 所做的更改会传递给链中的下一个。

```java
ChatClient.builder(chatModel)
    .build()
    .prompt()
    .advisors(
        MessageChatMemoryAdvisor.builder(chatMemory).build(),
        QuestionAnswerAdvisor.builder(vectorStore).build()
    )
    .user(userText)
    .call()
    .content();
```

在此配置中，`MessageChatMemoryAdvisor` 将首先执行，将对话历史添加到 prompt。
然后，`QuestionAnswerAdvisor` 将基于用户的问题和添加的对话历史执行搜索，可能提供更相关的结果。

[了解 Question Answer Advisor](retrieval-augmented-generation.adoc#_questionansweradvisor)

### Retrieval Augmented Generation

请参阅 [Retrieval Augmented Generation](retrieval-augmented-generation.adoc) 指南。

### 日志记录

`SimpleLoggerAdvisor` 是一个记录 `ChatClient` 的 `request` 和 `response` 数据的 advisor。
这对于调试和监控您的 AI 交互很有用。

> **TIP:** Spring AI 支持 LLM 和向量存储交互的可观测性。
> 请参阅 [可观测性](observability/index.adoc) 指南以获取更多信息。

要启用日志记录，请在创建 ChatClient 时将 `SimpleLoggerAdvisor` 添加到 advisor 链中。
建议将其添加到链的末尾：

```java
ChatResponse response = ChatClient.create(chatModel).prompt()
        .advisors(new SimpleLoggerAdvisor())
        .user("Tell me a joke?")
        .call()
        .chatResponse();
```

要查看日志，请将 advisor 包的日志级别设置为 `DEBUG`：

```
logging.level.org.springframework.ai.chat.client.advisor=DEBUG
```

将此添加到您的 `application.properties` 或 `application.yaml` 文件中。

您可以使用以下构造函数自定义从 `AdvisedRequest` 和 `ChatResponse` 记录的数据：

```java
SimpleLoggerAdvisor(
    Function<ChatClientRequest, String> requestToString,
    Function<ChatResponse, String> responseToString,
    int order
)
```

使用示例：

```java
SimpleLoggerAdvisor customLogger = new SimpleLoggerAdvisor(
    request -> "Custom request: " + request.prompt().getUserMessage(),
    response -> "Custom response: " + response.getResult(),
    0
);
```

这允许您根据特定需求定制记录的信息。

> **TIP:** 在生产环境中记录敏感信息时要小心。

## Chat Memory

`ChatMemory` 接口表示聊天对话记忆的存储。
它提供向对话添加消息、从对话检索消息和清除对话历史的方法。

目前有一个内置实现：`MessageWindowChatMemory`。

`MessageWindowChatMemory` 是一个聊天记忆实现，它维护最多指定最大大小（默认值：20 条消息）的消息窗口。
当消息数量超过此限制时，较旧的消息会被逐出，但系统消息会被保留。
如果添加新的系统消息，所有先前的系统消息都会从记忆中删除。
这确保对话始终可以使用最新的上下文，同时保持内存使用有界。

`MessageWindowChatMemory` 由 `ChatMemoryRepository` 抽象支持，该抽象为聊天对话记忆提供存储实现。
有多个实现可用，包括 `InMemoryChatMemoryRepository`、`JdbcChatMemoryRepository`、`CassandraChatMemoryRepository` 和 `Neo4jChatMemoryRepository`。

有关更多详细信息和使用示例，请参阅 [Chat Memory](chat-memory.adoc) 文档。

## 实现说明

`ChatClient` 中命令式和响应式编程模型的结合使用是 API 的一个独特方面。
通常，应用程序要么是响应式的，要么是命令式的，但不是两者兼而有之。

* 在自定义 Model 实现的 HTTP 客户端交互时，必须配置 RestClient 和 WebClient。

> **IMPORTANT:**
> 由于 Spring Boot 3.4 中的一个 bug，必须设置 "spring.http.client.factory=jdk" 属性。
> 否则，它默认设置为 "reactor"，这会破坏某些 AI 工作流，如 ImageModel。

* 流式传输仅通过响应式堆栈支持。
因此，命令式应用程序必须包含响应式堆栈（例如 spring-boot-starter-webflux）。
* 非流式传输仅通过 Servlet 堆栈支持。
因此，响应式应用程序必须包含 Servlet 堆栈（例如 spring-boot-starter-web），并期望某些调用是阻塞的。
* Tool calling 是命令式的，导致阻塞工作流。
这也会导致部分/中断的 Micrometer 观察（例如，ChatClient spans 和 tool calling spans 未连接，第一个因此保持不完整）。
* 内置 advisors 对标准调用执行阻塞操作，对流式调用执行非阻塞操作。
用于 advisor 流式调用的 Reactor Scheduler 可以通过每个 Advisor 类上的 Builder 进行配置。
