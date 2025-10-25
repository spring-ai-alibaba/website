---
title: Chat Client API
keywords: ["Spring AI", "ChatClient", "Chat Client", "Fluent API", "AI Model"]
description: "学习如何使用 Chat Client API 进行对话式 AI 交互"
---

# Chat Client API

*本内容参考自 Spring AI 官方文档*

ChatClient 提供了一个流式 API，用于与 AI 模型进行通信。它支持同步和流式编程模型。

> **注意**：请参阅本文档底部的[实现注意事项](#implementation-notes)，了解在 ChatClient 中结合使用命令式和响应式编程模型的相关信息。

流式 API 具有构建传递给 AI 模型作为输入的 Prompt 组成部分的方法。Prompt 包含指导 AI 模型输出和行为的指令文本。从 API 的角度来看，提示词由消息集合组成。

AI 模型处理两种主要类型的消息：用户消息（来自用户的直接输入）和系统消息（由系统生成以指导对话）。

这些消息通常包含占位符，这些占位符在运行时根据用户输入进行替换，以自定义 AI 模型对用户输入的响应。

还可以指定提示词选项，例如要使用的 AI 模型的名称和控制生成输出的随机性或创造性的温度设置。

## 创建 ChatClient

ChatClient 使用 ChatClient.Builder 对象创建。您可以为任何 ChatModel Spring Boot 自动配置获取自动配置的 ChatClient.Builder 实例，或以编程方式创建一个。

### 使用自动配置的 ChatClient.Builder

在最简单的用例中，Spring AI 提供 Spring Boot 自动配置，为您创建一个原型 ChatClient.Builder bean 以注入到您的类中。以下是检索对简单用户请求的字符串响应的简单示例。

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

在这个简单示例中，用户输入设置用户消息的内容。`call()` 方法向 AI 模型发送请求，`content()` 方法将 AI 模型的响应作为字符串返回。

### 使用多个聊天模型

在单个应用程序中可能需要使用多个聊天模型的几种场景：

- 为不同类型的任务使用不同的模型
- 当一个模型服务不可用时实现回退机制
- A/B 测试不同的模型或配置

```java
@Configuration
public class ChatClientConfig {

    @Bean
    public ChatClient openAiChatClient(OpenAiChatModel chatModel) {
        return ChatClient.create(chatModel);
    }

    @Bean
    public ChatClient ollamaChatClient(OllamaChatModel chatModel) {
        return ChatClient.create(chatModel);
    }
}
```

## ChatClient 流式 API

ChatClient 流式 API 允许您使用重载的 prompt 方法以三种不同的方式创建提示词来启动流式 API：

- `prompt()`：此无参数方法让您开始使用流式 API，允许您构建用户、系统和提示词的其他部分。
- `prompt(Prompt prompt)`：此方法接受 Prompt 参数，让您传入使用 Prompt 的非流式 API 创建的 Prompt 实例。
- `prompt(String content)`：这是一个便利方法，类似于前一个重载。它接受用户的文本内容。

## ChatClient 响应

ChatClient API 提供了几种使用流式 API 格式化 AI 模型响应的方法。

### 返回 ChatResponse

AI 模型的响应是由 `ChatResponse` 类型定义的丰富结构。它包含有关响应如何生成的元数据，还可以包含多个响应（称为 Generations），每个响应都有自己的元数据。元数据包括用于创建响应的令牌数量（每个令牌大约是 3/4 个单词）。这些信息很重要，因为托管的 AI 模型根据每个请求使用的令牌数量收费。

通过在 `call()` 方法后调用 `chatResponse()` 来返回包含元数据的 `ChatResponse` 对象的示例如下所示。

```java
ChatResponse chatResponse = chatClient.prompt()
    .user("告诉我一个笑话")
    .call()
    .chatResponse();
```

### 返回实体

您经常希望返回从返回的字符串映射的实体类。`entity()` 方法提供了此功能。

例如，给定 Java 记录：

```java
record ActorFilms(String actor, List<String> movies) {}
```

您可以使用 `entity()` 方法轻松将 AI 模型的输出映射到此记录，如下所示：

```java
ActorFilms actorFilms = chatClient.prompt()
    .user("为一个随机演员生成电影作品。")
    .call()
    .entity(ActorFilms.class);
```

还有一个重载的 entity 方法，签名为 `entity(ParameterizedTypeReference<T> type)`，让您指定泛型列表等类型：

```java
List<ActorFilms> actorFilms = chatClient.prompt()
    .user("为汤姆·汉克斯和比尔·默里生成 5 部电影的电影作品。")
    .call()
    .entity(new ParameterizedTypeReference<List<ActorFilms>>() {});
```

## 响应类型

在 ChatClient 上指定 `call()` 方法后，响应类型有几个选项：

- `String content()`：返回响应的字符串内容
- `ChatResponse chatResponse()`：返回包含多个生成和响应元数据的 ChatResponse 对象，包括令牌使用信息
- `ChatClientResponse chatClientResponse()`：返回包含 ChatResponse 对象和 ChatClient 执行上下文的 ChatClientResponse 对象，让您访问 advisors 执行期间使用的其他数据
- `entity()` 方法返回 Java 类型：
  - `entity(Class<T> type)`：用于返回特定实体类型
  - `entity(ParameterizedTypeReference<T> type)`：用于返回实体类型的集合
  - `entity(StructuredOutputConverter<T> structuredOutputConverter)`：用于指定自定义转换器

对于流式响应，使用 `stream()` 方法而不是 `call()`。有关详细信息，请参阅 [Streaming](../streaming/) 文档。

有关配置默认值和高级配置选项的信息，请参阅 [Defaults and Configuration](../defaults-configuration/) 文档。

有关使用 Advisors 通过上下文、记忆和日志功能增强 AI 交互的信息，请参阅 [Advisors](../advisors/) 文档。

## 实现注意事项

在 ChatClient 中结合使用命令式和响应式编程模型是 API 的一个独特方面。通常，应用程序要么是响应式的，要么是命令式的，但不会两者兼而有之。

> **注意**：在自定义模型实现的 HTTP 客户端交互时，必须配置 RestClient 和 WebClient。

> **重要**：由于 Spring Boot 3.4 中的错误，必须设置 "spring.http.client.factory=jdk" 属性。否则，默认设置为 "reactor"，这会破坏某些 AI 工作流程，如 ImageModel。

- 流式处理仅通过 Reactive 堆栈支持。因此，命令式应用程序必须包含 Reactive 堆栈（例如 spring-boot-starter-webflux）。
- 非流式处理仅通过 Servlet 堆栈支持。响应式应用程序必须包含 Servlet 堆栈（例如 spring-boot-starter-web）并期望某些调用是阻塞的。
- 工具调用是命令式的，导致阻塞工作流程。这也导致部分/中断的 Micrometer 观察（例如，ChatClient 跨度和工具调用跨度未连接，第一个因此保持不完整）。
- 内置 advisors 对标准调用执行阻塞操作，对流式调用执行非阻塞操作。用于 advisor 流式调用的 Reactor Scheduler 可以通过每个 Advisor 类上的 Builder 进行配置。

## 下一步

- 学习 [Prompts](../prompts/) 进行高级提示词工程
- 探索 [Tool Calling](../tool-calling/) 进行函数集成
- 查看 [Multimodality](../multimodality/) 进行图像和音频支持
- 了解 [Chat Memory](../chat-memory/) 进行对话管理
- 参阅 [Advisors](../advisors/) 进行增强的 AI 交互
- 查看 [Streaming](../streaming/) 进行实时响应
- 配置 [Defaults and Configuration](../defaults-configuration/) 进行高级设置
