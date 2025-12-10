# Chat Model API

Chat Model API 为开发人员提供了将 AI 驱动的聊天完成功能集成到其应用程序中的能力。它利用预训练的语言模型，如 GPT（Generative Pre-trained Transformer），生成对自然语言用户输入类似人类的响应。

API 通常通过向 AI model 发送 prompt 或部分对话来工作，然后 AI model 根据其训练数据和对自然语言模式的理解生成完成或对话的延续。然后将完成的响应返回给应用程序，应用程序可以将其呈现给用户或用于进一步处理。

`Spring AI Chat Model API` 设计为与各种 [AI Models](concepts.adoc#_models) 交互的简单且可移植的接口，允许开发人员以最少的代码更改在不同 model 之间切换。
这种设计符合 Spring 的模块化和可互换性理念。

此外，借助 `Prompt`（用于输入封装）和 `ChatResponse`（用于输出处理）等配套类的帮助，Chat Model API 统一了与 AI Models 的通信。
它管理请求准备和响应解析的复杂性，提供直接和简化的 API 交互。

您可以在 [可用实现](chatmodel.adoc#_available_implementations) 部分找到有关可用实现的更多信息，以及在 [Chat Models 比较](chat/comparison.adoc) 部分找到详细比较。

## API 概述

本节提供 Spring AI Chat Model API 接口和相关类的指南。

### ChatModel

这是 [ChatModel](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/model/ChatModel.java) 接口定义：

```java
public interface ChatModel extends Model<Prompt, ChatResponse>, StreamingChatModel {

	default String call(String message) {...}

    @Override
	ChatResponse call(Prompt prompt);
}
```

带有 `String` 参数的 `call()` 方法简化了初始使用，避免了更复杂的 `Prompt` 和 `ChatResponse` 类的复杂性。
在实际应用程序中，更常见的是使用接受 `Prompt` 实例并返回 `ChatResponse` 的 `call()` 方法。

### StreamingChatModel

这是 [StreamingChatModel](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/model/StreamingChatModel.java) 接口定义：

```java
public interface StreamingChatModel extends StreamingModel<Prompt, ChatResponse> {

    default Flux<String> stream(String message) {...}

    @Override
	Flux<ChatResponse> stream(Prompt prompt);
}
```

`stream()` 方法接受 `String` 或 `Prompt` 参数，类似于 `ChatModel`，但它使用响应式 Flux API 流式传输响应。

### Prompt

[Prompt](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-client-chat/src/main/java/org/springframework/ai/chat/prompt/Prompt.java) 是一个 `ModelRequest`，它封装了 [Message](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/messages/Message.java) 对象列表和可选的 model 请求选项。
以下列表显示了 `Prompt` 类的截断版本，不包括构造函数和其他实用方法：

```java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions modelOptions;

	@Override
	public ChatOptions getOptions() {...}

	@Override
	public List<Message> getInstructions() {...}

    // constructors and utility methods omitted
}
```

#### Message

`Message` 接口封装了 `Prompt` 文本内容、元数据属性集合以及称为 `MessageType` 的分类。

接口定义如下：

```java
public interface Content {

	String getText();

	Map<String, Object> getMetadata();
}

public interface Message extends Content {

	MessageType getMessageType();
}
```

多模态消息类型还实现 `MediaContent` 接口，提供 `Media` 内容对象列表。

```java
public interface MediaContent extends Content {

	Collection<Media> getMedia();

}
```

`Message` 接口有各种实现，对应于 AI model 可以处理的消息类别：

![Spring AI Message API](/img/integration/spring-ai-message-api.jpg)

聊天完成端点根据对话角色区分消息类别，由 `MessageType` 有效映射。

例如，OpenAI 识别不同对话角色的消息类别，如 `system`、`user`、`function` 或 `assistant`。

虽然术语 `MessageType` 可能暗示特定的消息格式，但在此上下文中，它有效地指定了消息在对话中扮演的角色。

对于不使用特定角色的 AI model，`UserMessage` 实现充当标准类别，通常表示用户生成的查询或指令。
要了解实际应用以及 `Prompt` 和 `Message` 之间的关系，特别是在这些角色或消息类别的上下文中，请参阅 [Prompts](prompt.adoc) 部分中的详细说明。

#### Chat Options

表示可以传递给 AI model 的选项。`ChatOptions` 类是 `ModelOptions` 的子类，用于定义可以传递给 AI model 的少量可移植选项。
`ChatOptions` 类定义如下：

```java
public interface ChatOptions extends ModelOptions {

	String getModel();
	Float getFrequencyPenalty();
	Integer getMaxTokens();
	Float getPresencePenalty();
	List<String> getStopSequences();
	Float getTemperature();
	Integer getTopK();
	Float getTopP();
	ChatOptions copy();

}
```

此外，每个模型特定的 ChatModel/StreamingChatModel 实现都可以有自己的选项，可以传递给 AI model。例如，OpenAI Chat Completion model 有自己的选项，如 `logitBias`、`seed` 和 `user`。

这是一个强大的功能，允许开发人员在启动应用程序时使用模型特定选项，然后使用 `Prompt` 请求在运行时覆盖它们。

Spring AI 提供了一个复杂的系统来配置和使用 Chat Models。
它允许在启动时设置默认配置，同时还提供在每个请求的基础上覆盖这些设置的灵活性。
这种方法使开发人员能够轻松地使用不同的 AI model 并根据需要调整参数，所有这些都在 Spring AI 框架提供的统一接口内。

以下流程图说明了 Spring AI 如何处理 Chat Models 的配置和执行，结合启动和运行时选项：

![Chat Options Flow](/img/integration/chat-options-flow.jpg)

1. 启动配置 - ChatModel/StreamingChatModel 使用"启动"Chat Options 初始化。
这些选项在 ChatModel 初始化期间设置，旨在提供默认配置。
2. 运行时配置 - 对于每个请求，Prompt 可以包含运行时 Chat Options：这些可以覆盖启动选项。
3. 选项合并过程 - "合并选项"步骤合并启动和运行时选项。
如果提供了运行时选项，它们优先于启动选项。
4. 输入处理 - "转换输入"步骤将输入指令转换为本机、模型特定的格式。
5. 输出处理 - "转换输出"步骤将 model 的响应转换为标准化的 `ChatResponse` 格式。

启动和运行时选项的分离允许全局配置和特定于请求的调整。

### ChatResponse

`ChatResponse` 类的结构如下：

```java
public class ChatResponse implements ModelResponse<Generation> {

    private final ChatResponseMetadata chatResponseMetadata;
	private final List<Generation> generations;

	@Override
	public ChatResponseMetadata getMetadata() {...}

    @Override
	public List<Generation> getResults() {...}

    // other methods omitted
}
```

[ChatResponse](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/model/ChatResponse.java) 类保存 AI Model 的输出，每个 `Generation` 实例包含来自单个 prompt 的潜在多个输出之一。

`ChatResponse` 类还携带有关 AI Model 响应的 `ChatResponseMetadata` 元数据。

### Generation

最后，[Generation](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/chat/model/Generation.java) 类从 `ModelResult` 扩展，表示 model 输出（assistant 消息）和相关元数据：

```java
public class Generation implements ModelResult<AssistantMessage> {

	private final AssistantMessage assistantMessage;
	private ChatGenerationMetadata chatGenerationMetadata;

	@Override
	public AssistantMessage getOutput() {...}

	@Override
	public ChatGenerationMetadata getMetadata() {...}

    // other methods omitted
}
```

## 可用实现

此图说明了统一的接口 `ChatModel` 和 `StreamingChatModel` 用于与来自不同提供商的各种 AI chat model 交互，允许轻松集成和在不同 AI 服务之间切换，同时为客户端应用程序维护一致的 API。

![Spring AI Chat Completions Clients](/img/integration/spring-ai-chat-completions-clients.jpg)

* [OpenAI Chat Completion](chat/openai-chat.adoc)（支持流式传输、多模态和 function-calling）
* [Microsoft Azure Open AI Chat Completion](chat/azure-openai-chat.adoc)（支持流式传输和 function-calling）
* [Ollama Chat Completion](chat/ollama-chat.adoc)（支持流式传输、多模态和 function-calling）
* [Hugging Face Chat Completion](chat/huggingface.adoc)（不支持流式传输）
* [Google Vertex AI Gemini Chat Completion](chat/vertexai-gemini-chat.adoc)（支持流式传输、多模态和 function-calling）
* [Amazon Bedrock](bedrock.adoc)
* [Mistral AI Chat Completion](chat/mistralai-chat.adoc)（支持流式传输和 function-calling）
* [Anthropic Chat Completion](chat/anthropic-chat.adoc)（支持流式传输和 function-calling）

> **TIP:** 在 [Chat Models 比较](chat/comparison.adoc) 部分查找可用 Chat Models 的详细比较。

## Chat Model API

Spring AI Chat Model API 构建在 Spring AI `Generic Model API` 之上，提供 Chat 特定的抽象和实现。
这允许轻松集成和在不同 AI 服务之间切换，同时为客户端应用程序维护一致的 API。
以下类图说明了 Spring AI Chat Model API 的主要类和接口。

![Spring AI Chat API](/img/integration/spring-ai-chat-api.jpg)
