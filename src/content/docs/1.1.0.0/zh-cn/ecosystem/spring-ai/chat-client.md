---
title: ChatClient
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba聊天客户端。"
---

## Chat Client API

### 关于ChatClient

ChatClient提供了一个流畅的API用于与AI模型进行通信。它同时支持同步和流式编程模型。

> 关于ChatClient中命令式和响应式编程模型组合使用的相关说明，请参阅本文档底部的**实现说明**部分。

流畅的API提供了构建Prompt各个组成部分的方法，这些Prompt将作为输入传递给AI模型。从API的角度来看，Prompt包含了一系列消息。AI模型处理两种主要类型的消息:用户消息(来自用户的直接输入)和系统消息(由系统生成以指导对话)。这些消息通常包含占位符，这些占位符会在运行时根据用户输入进行替换，以定制AI模型对用户输入的响应。还可以指定Prompt选项，例如要使用的AI模型名称和控制生成输出随机性或创造性的温度设置。

### 创建ChatClient

ChatClient是使用`ChatClient.Builder`对象创建的。您可以为任何ChatModel Spring Boot自动配置获取一个自动配置的`ChatClient.Builder`实例，或者以编程方式创建一个。

#### 使用自动配置的ChatClient.Builder

在最简单的用例中，Spring AI提供了Spring Boot自动配置，为您创建一个原型`ChatClient.Builder` bean，您可以将其注入到您的类中。以下是一个简单的示例，展示如何获取对简单用户请求的`String`响应:

```java
@RestController 
class MyController { 
    private final ChatClient chatClient; 
    
    public MyController (ChatClient.Builder chatClientBuilder) { 
        this.chatClient = chatClientBuilder.build(); 
    } 
    
    @GetMapping("/ai") 
    String generation (String userInput) { 
        return this.chatClient.prompt() 
            .user(userInput) 
            .call() 
            .content(); 
    }
}
```

在这个简单的示例中，用户输入设置了用户消息的内容。`call()`方法向AI模型发送请求，`content()`方法返回AI模型的响应作为`String`。

#### 使用多个聊天模型

在单个应用程序中使用多个聊天模型有几种场景:

- 为不同类型的任务使用不同的模型(例如，使用强大的模型进行复杂推理，使用更快、更便宜的模型处理简单任务)
- 当一个模型服务不可用时实现回退机制
- 对不同的模型或配置进行A/B测试
- 根据用户偏好提供模型选择
- 组合专业模型(一个用于代码生成，另一个用于创意内容等)

默认情况下，Spring AI自动配置单个`ChatClient.Builder` bean。但是，您可能需要在应用程序中使用多个聊天模型。以下是处理这种情况的方法:

在所有情况下，您都需要通过设置属性`spring.ai.chat.client.enabled=false`来禁用`ChatClient.Builder`自动配置。这允许您手动创建多个ChatClient实例。

##### 使用单个模型类型的多个ChatClient

本节介绍一个常见用例，您需要创建多个ChatClient实例，它们都使用相同的基础模型类型但具有不同的配置。

```java
// 以编程方式创建ChatClient实例
ChatModel myChatModel = ... // 已由Spring Boot自动配置
ChatClient chatClient = ChatClient.create(myChatModel);

// 或使用构建器以获得更多控制
ChatClient.Builder builder = ChatClient.builder(myChatModel);
ChatClient customChatClient = builder 
    .defaultSystemPrompt("你是一个乐于助人的助手。") 
    .build();
```

##### 不同模型类型的ChatClient

当使用多个AI模型时，您可以为每个模型定义单独的`ChatClient` bean:

```java
@Configuration 
public class ChatClientConfig { 
    @Bean 
    public ChatClient openAiChatClient (OpenAiChatModel chatModel) { 
        return ChatClient.create(chatModel); 
    } 
    
    @Bean 
    public ChatClient anthropicChatClient (AnthropicChatModel chatModel) { 
        return ChatClient.create(chatModel); 
    }
}
```

然后，您可以使用`@Qualifier`注解将这些bean注入到应用程序组件中:

```java
@Configuration 
public class ChatClientExample { 
    @Bean 
    CommandLineRunner cli ( 
        @Qualifier("openAiChatClient") ChatClient openAiChatClient, 
        @Qualifier("anthropicChatClient") ChatClient anthropicChatClient) { 
        return args -> { 
            var scanner = new Scanner(System.in); 
            ChatClient chat; 
            
            // 模型选择
            System.out.println("\n选择您的AI模型:"); 
            System.out.println("1. OpenAI"); 
            System.out.println("2. Anthropic"); 
            System.out.print("输入您的选择(1 或 2):"); 
            String choice = scanner.nextLine().trim(); 
            
            if (choice.equals("1")) { 
                chat = openAiChatClient; 
                System.out.println("使用OpenAI模型"); 
            } else { 
                chat = anthropicChatClient; 
                System.out.println("使用Anthropic模型"); 
            } 
            
            // 使用选定的聊天客户端
            System.out.print("\n输入您的问题:"); 
            String input = scanner.nextLine(); 
            String response = chat.prompt(input).call().content(); 
            System.out.println("助手:" + response); 
            scanner.close(); 
        }; 
    }
}
```

##### 多个OpenAI兼容的API端点

`OpenAiApi`和`OpenAiChatModel`类提供了`mutate()`方法，允许您创建具有不同属性的现有实例的变体。这在需要与多个OpenAI兼容的API一起工作时特别有用。

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
            // 为Groq (Llama3)派生新的OpenAiApi
            OpenAiApi groqApi = baseOpenAiApi.mutate() 
                .baseUrl("https://api.groq.com/openai") 
                .apiKey(System.getenv("GROQ_API_KEY")) 
                .build(); 
                
            // 为OpenAI GPT-4派生新的OpenAiApi
            OpenAiApi gpt4Api = baseOpenAiApi.mutate() 
                .baseUrl("https://api.openai.com") 
                .apiKey(System.getenv("OPENAI_API_KEY")) 
                .build(); 
                
            // 为Groq派生新的OpenAiChatModel
            OpenAiChatModel groqModel = baseChatModel.mutate() 
                .openAiApi(groqApi) 
                .defaultOptions(OpenAiChatOptions.builder().model("llama3-70b-8192").temperature(0.5).build()) 
                .build(); 
                
            // 为GPT-4派生新的OpenAiChatModel
            OpenAiChatModel gpt4Model = baseChatModel.mutate() 
                .openAiApi(gpt4Api) 
                .defaultOptions(OpenAiChatOptions.builder().model("gpt-4").temperature(0.7).build()) 
                .build(); 
                
            // 两个模型的简单提示
            String prompt = "法国的首都是什么?"; 
            String groqResponse = ChatClient.builder(groqModel).build().prompt(prompt).call().content(); 
            String gpt4Response = ChatClient.builder(gpt4Model).build().prompt(prompt).call().content(); 
            
            logger.info("Groq (Llama3) 响应:{}", groqResponse); 
            logger.info("OpenAI GPT-4 响应:{}", gpt4Response); 
        } catch (Exception e) { 
            logger.error("多客户端流程中的错误", e); 
        } 
    }
}
```

### ChatClient流畅API

`ChatClient`流畅API允许您使用重载的prompt方法以三种不同的方式创建提示:

- **`prompt()`**: 这个无参数方法让您开始使用流畅API，允许您构建用户、系统和其他提示部分。
- **`prompt(Prompt prompt)`**: 这个方法接受一个Prompt参数，让您传入使用Prompt的非流畅API创建的Prompt实例。
- **`prompt(String content)`**: 这是一个类似于前一个重载的便捷方法。它接受用户的文本内容。

### ChatClient响应

`ChatClient` API提供了几种使用流畅API格式化AI模型响应的方法。

#### 返回ChatResponse

AI模型的响应是一个由`ChatResponse`类型定义的丰富结构。它包括有关如何生成响应的元数据，还可以包含多个响应，称为`Generations`，每个都有自己的元数据。元数据包括用于创建响应的令牌数量(每个令牌大约是一个单词的3/4)。这些信息很重要，因为托管AI模型根据每个请求使用的令牌数量收费。

以下示例通过调用`call()`方法后的`chatResponse()`返回包含元数据的`ChatResponse`对象:

```java
ChatResponse chatResponse = chatClient.prompt() 
    .user("给我讲个笑话") 
    .call() 
    .chatResponse();
```

#### 返回实体

您通常希望返回一个从返回的`String`映射的实体类。`entity()`方法提供了这个功能。

例如，给定Java record:

```java
record ActorFilms (String actor, List<String> movies) {}
```

您可以使用`entity()`方法轻松地将AI模型的输出映射到这个record，如下所示:

```java
ActorFilms actorFilms = chatClient.prompt() 
    .user("生成一个随机演员的电影作品。") 
    .call() 
    .entity(ActorFilms.class);
```

还有一个重载的`entity`方法，签名为`entity(ParameterizedTypeReference<T> type)`，允许您指定泛型列表等类型:

```java
List<ActorFilms> actorFilms = chatClient.prompt() 
    .user("生成汤姆·汉克斯和比尔·默瑞的5部电影作品。") 
    .call() 
    .entity(new ParameterizedTypeReference<List<ActorFilms>>() {});
```

#### 流式响应

`stream()`方法让您可以获得异步响应，如下所示:

```java
Flux<String> output = chatClient.prompt() 
    .user("给我讲个笑话") 
    .stream() 
    .content();
```

您还可以使用方法`Flux<ChatResponse> chatResponse()`流式传输`ChatResponse`。

在未来，我们将提供一个便捷方法，让您使用响应式`stream()`方法返回Java实体。同时，您应该使用结构化输出转换器显式转换聚合响应，如下所示。这也演示了流畅API中参数的使用，这将在文档的后面部分详细讨论。

```java
var converter = new BeanOutputConverter<>(new ParameterizedTypeReference<List<ActorsFilms>>() {});
Flux<String> flux = this.chatClient.prompt() 
    .user(u -> u.text(""" 
        生成一个随机演员的电影作品。 
        {format} 
        """) 
        .param("format", this.converter.getFormat())) 
    .stream() 
    .content();
String content = this.flux.collectList().block().stream().collect(Collectors.joining());
List<ActorFilms> actorFilms = this.converter.convert(this.content);
```

### 提示模板

`ChatClient`流畅API允许您提供带有变量的用户和系统文本作为模板，这些变量在运行时被替换。

```java
String answer = ChatClient.create(chatModel).prompt() 
    .user(u -> u 
        .text("告诉我5部由{composer}作曲的电影原声带") 
        .param("composer", "John Williams")) 
    .call() 
    .content();
```

在内部，ChatClient使用PromptTemplate类来处理用户和系统文本，并使用给定的`TemplateRenderer`实现替换变量。默认情况下，Spring AI使用`StTemplateRenderer`实现，它基于Terence Parr开发的开源String Template引擎。Spring AI还提供了`NoOpTemplateRenderer`用于不需要模板处理的情况。

**注意**: 直接在`ChatClient`上配置的`TemplateRenderer`(通过`.templateRenderer()`)仅适用于直接在`ChatClient`构建器链中定义的提示内容(例如，通过`.user()`、`.system()`)。它不会影响Advisors内部使用的模板，如`QuestionAnswerAdvisor`，它们有自己的模板自定义机制(参见自定义Advisor模板)。

如果您想使用不同的模板引擎，您可以直接向ChatClient提供`TemplateRenderer`接口的自定义实现。您也可以继续使用默认的`StTemplateRenderer`，但使用自定义配置。

例如，默认情况下，模板变量由{}语法标识。如果您计划在提示中包含JSON，您可能想使用不同的语法以避免与JSON语法冲突。例如，您可以使用`<`和`>`分隔符。

```java
String answer = ChatClient.create(chatModel).prompt() 
    .user(u -> u 
        .text("告诉我5部由<composer>作曲的电影原声带") 
        .param("composer", "John Williams"))
    .templateRenderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build()) 
    .call() 
    .content();
```

### call()返回值

在`ChatClient`上指定`call()`方法后，响应类型有几种不同的选项。

- **`String content()`**: 返回响应的String内容
- **`ChatResponse chatResponse()`**: 返回包含多个生成以及有关响应的元数据的ChatResponse对象，例如创建响应使用了多少令牌。
- **`ChatClientResponse chatClientResponse()`**: 返回一个ChatClientResponse对象，其中包含ChatResponse对象和ChatClient执行上下文，让您可以访问在执行advisors期间使用的其他数据(例如，在RAG流程中检索的相关文档)。
- **`entity()`** 返回Java类型
    - **`entity(ParameterizedTypeReference<T> type)`**: 用于返回实体类型的Collection。
    - **`entity(Class<T> type)`**: 用于返回特定的实体类型。
    - **`entity(StructuredOutputConverter<T> structuredOutputConverter)`**: 用于指定`StructuredOutputConverter`的实例，将String转换为实体类型。

您也可以调用`stream()`方法而不是`call()`。

### stream()返回值

在`ChatClient`上指定`stream()`方法后，响应类型有几种选项:

- **`Flux<String> content()`**: 返回AI模型生成的字符串的Flux。
- **`Flux<ChatResponse> chatResponse()`**: 返回`ChatResponse`对象的Flux，其中包含有关响应的其他元数据。
- **`Flux<ChatClientResponse> chatClientResponse()`**: 返回`ChatClientResponse`对象的Flux，其中包含ChatResponse对象和ChatClient执行上下文，让您可以访问在执行advisors期间使用的其他数据(例如，在RAG流程中检索的相关文档)。

### 使用默认值

在`@Configuration`类中创建带有默认系统文本的`ChatClient`可以简化运行时代码。通过设置默认值，您只需要在调用`ChatClient`时指定用户文本，无需在运行时代码路径中为每个请求设置系统文本。

#### 默认系统文本

在以下示例中，我们将配置系统文本始终以海盗的声音回答。为了避免在运行时代码中重复系统文本，我们将在`@Configuration`类中创建一个`ChatClient`实例。

```java
@Configuration 
class Config { 
    @Bean 
    ChatClient chatClient (ChatClient.Builder builder) { 
        return builder.defaultSystem("你是一个友好的聊天机器人，用海盗的声音回答问题") 
            .build(); 
    }
}
```

以及一个调用它的`@RestController`:

```java
@RestController 
class AIController { 
    private final ChatClient chatClient; 
    
    AIController(ChatClient chatClient) { 
        this.chatClient = chatClient; 
    } 
    
    @GetMapping("/ai/simple") 
    public Map<String, String> completion (@RequestParam(value = "message", defaultValue = "给我讲个笑话") String message) { 
        return Map.of("completion", this.chatClient.prompt().user(message).call().content()); 
    }
}
```

当通过`curl`调用应用程序端点时，结果是:

```bash
❯ curl localhost:8080/ai/simple
{"completion":"为什么海盗去喜剧俱乐部?为了听一些arrr-rated笑话!啊，伙计!"}
```

#### 带参数的默认系统文本

在以下示例中，我们将在系统文本中使用占位符，以便在运行时而不是设计时指定完成的声音。

```java
@Configuration 
class Config { 
    @Bean 
    ChatClient chatClient (ChatClient.Builder builder) { 
        return builder.defaultSystem("你是一个友好的聊天机器人，用{voice}的声音回答问题") 
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
    Map<String, String> completion (@RequestParam(value = "message", defaultValue = "给我讲个笑话") String message, String voice) { 
        return Map.of("completion", this.chatClient.prompt() 
            .system(sp -> sp.param("voice", voice)) 
            .user(message) 
            .call() 
            .content()); 
    }
}
```

当通过httpie调用应用程序端点时，结果是:

```bash
http localhost:8080/ai voice=='Robert DeNiro'
{ 
  "completion": "你在跟我说话吗?好吧，给你讲个笑话:为什么自行车不能自己站起来?因为它太累了!经典，对吧?"
}
```

#### 其他默认值

在`ChatClient.Builder`级别，您可以指定默认的提示配置。

- **`defaultOptions(ChatOptions chatOptions)`**: 传入`ChatOptions`类中定义的便携选项或特定于模型的选项，如`OpenAiChatOptions`中的选项。有关特定于模型的ChatOptions实现的更多信息，请参阅JavaDocs。
- **`defaultFunction(String name, String description, java.util.function.Function<I, O> function)`**: name用于在用户文本中引用函数。description解释函数的用途，帮助AI模型选择正确的函数以获得准确的响应。function参数是模型在需要时将执行的Java函数实例。
- **`defaultFunctions(String…​ functionNames)`**: 在应用程序上下文中定义的java.util.Function的bean名称。
- **`defaultUser(String text)`**, **`defaultUser(Resource text)`**, **`defaultUser(Consumer<UserSpec> userSpecConsumer)`**: 这些方法让您定义用户文本。Consumer<UserSpec>允许您使用lambda来指定用户文本和任何默认参数。
- **`defaultAdvisors(Advisor…​ advisor)`**: Advisors允许修改用于创建Prompt的数据。QuestionAnswerAdvisor实现通过将提示附加与用户文本相关的上下文信息来启用Retrieval Augmented Generation模式。
- **`defaultAdvisors(Consumer<AdvisorSpec> advisorSpecConsumer)`**: 此方法允许您定义一个`Consumer`来使用`AdvisorSpec`配置多个advisors。Advisors可以修改用于创建最终Prompt的数据。`Consumer<AdvisorSpec>`让您指定一个lambda来添加advisors，如`QuestionAnswerAdvisor`，它通过将提示附加基于用户文本的相关上下文信息来支持`Retrieval Augmented Generation`。

您可以在运行时使用不带default前缀的相应方法覆盖这些默认值。

- `options(ChatOptions chatOptions)`
- `function(String name, String description, java.util.function.Function<I, O> function)`
- `functions(String… functionNames)`
- `user(String text), user(Resource text), user(Consumer<UserSpec> userSpecConsumer)`
- `advisors(Advisor… advisor)`
- `advisors(Consumer<AdvisorSpec> advisorSpecConsumer)`

### Advisors

Advisors API提供了一种灵活而强大的方式来拦截、修改和增强Spring应用程序中的AI驱动交互。在调用带有用户文本的AI模型时，一个常见的模式是将提示附加或增强上下文数据。这种上下文数据可以是不同类型的。常见类型包括:

- **您自己的数据**: 这是AI模型没有训练过的数据。即使模型见过类似的数据，附加的上下文数据在生成响应时也会优先考虑。
- **对话历史**: 聊天模型的API是无状态的。如果您告诉AI模型您的名字，它不会在后续交互中记住。必须随每个请求发送对话历史，以确保在生成响应时考虑之前的交互。

#### ChatClient中的Advisor配置

ChatClient流畅API提供了一个`AdvisorSpec`接口用于配置advisors。这个接口提供了添加参数、一次性设置多个参数以及向链中添加一个或多个advisors的方法。

```java
interface AdvisorSpec { 
    AdvisorSpec param(String k, Object v); 
    AdvisorSpec params(Map<String, Object> p); 
    AdvisorSpec advisors(Advisor... advisors); 
    AdvisorSpec advisors(List<Advisor> advisors);
}
```

**重要**: 将advisors添加到链中的顺序至关重要，因为它决定了它们的执行顺序。每个advisor都以某种方式修改提示或上下文，一个advisor所做的更改会传递给链中的下一个。

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

在此配置中，`MessageChatMemoryAdvisor`将首先执行，将对话历史添加到提示中。然后，`QuestionAnswerAdvisor`将基于用户的问题和添加的对话历史执行其搜索，可能提供更相关的结果。

检索增强生成请参阅检索增强生成指南。

#### 日志记录

`SimpleLoggerAdvisor`是一个记录`ChatClient`的`request`和`response`数据的advisor。这对于调试和监控您的AI交互很有用。

**提示**: Spring AI支持LLM和向量存储交互的可观察性。有关更多信息，请参阅可观察性指南。

要启用日志记录，在创建ChatClient时将`SimpleLoggerAdvisor`添加到advisor链中。建议将其添加到链的末尾:

```java
ChatResponse response = ChatClient.create(chatModel).prompt() 
    .advisors(new SimpleLoggerAdvisor()) 
    .user("给我讲个笑话?") 
    .call() 
    .chatResponse();
```

要查看日志，将advisor包的日志级别设置为`DEBUG`:

```properties
logging.level.org.springframework.ai.chat.client.advisor=DEBUG
```

将此添加到您的`application.properties`或`application.yaml`文件中。

您可以通过使用以下构造函数自定义从`AdvisedRequest`和`ChatResponse`记录的哪些数据:

```java
SimpleLoggerAdvisor( 
    Function<AdvisedRequest, String> requestToString, 
    Function<ChatResponse, String> responseToString
)
```

使用示例:

```java
SimpleLoggerAdvisor customLogger = new SimpleLoggerAdvisor( 
    request -> "自定义请求:" + request.userText, 
    response -> "自定义响应:" + response.getResult()
);
```

这允许您根据特定需求定制记录的信息。

**提示**: 在生产环境中要小心记录敏感信息。

#### 聊天内存

`ChatMemory`接口表示聊天对话内存的存储。它提供了向对话添加消息、从对话中检索消息以及清除对话历史的方法。目前有一个内置实现:`MessageWindowChatMemory`。

`MessageWindowChatMemory`是一个聊天内存实现，它维护一个最大指定大小(默认:20条消息)的消息窗口。当消息数量超过此限制时，较旧的消息会被逐出，但系统消息会被保留。如果添加了新的系统消息，所有以前的系统消息都会从内存中删除。这确保了对话始终有最新的上下文可用，同时保持内存使用有界。

`MessageWindowChatMemory`由`ChatMemoryRepository`抽象支持，它提供了聊天对话内存的存储实现。有几种实现可用，包括`InMemoryChatMemoryRepository`、`JdbcChatMemoryRepository`、`CassandraChatMemoryRepository`和`Neo4jChatMemoryRepository`。

有关更多详细信息和用法示例，请参阅聊天内存文档。

### 实现说明

`ChatClient`中命令式和响应式编程模型的组合使用是API的一个独特方面。通常，应用程序要么是响应式的，要么是命令式的，但不是两者都是。

- 当自定义Model实现的HTTP客户端交互时，必须同时配置RestClient和WebClient。
- 由于Spring Boot 3.4中的一个错误，必须设置"spring.http.client.factory=jdk"属性。否则，它默认设置为"reactor"，这会破坏某些AI工作流，如ImageModel。
- 流式传输仅通过响应式堆栈支持。命令式应用程序必须包含响应式堆栈(例如spring-boot-starter-webflux)。
- 非流式传输仅通过Servlet堆栈支持。响应式应用程序必须包含Servlet堆栈(例如spring-boot-starter-web)，并期望某些调用是阻塞的。
- 工具调用是命令式的，导致阻塞工作流。这也导致部分/中断的Micrometer观察(例如，ChatClient spans和工具调用spans没有连接，第一个因此保持不完整)。
- 内置的advisors对标准调用执行阻塞操作，对流式调用执行非阻塞操作。用于advisor流式调用的Reactor Scheduler可以通过每个Advisor类上的Builder进行配置。

### 开始使用

Advisors API
