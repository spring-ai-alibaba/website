# Multimodality API

> "所有自然连接的事物都应该组合在一起教授" - John Amos Comenius, "Orbis Sensualium Pictus", 1658

人类同时跨多种数据输入模式处理知识。
我们学习的方式，我们的经历都是多模态的。
我们不仅有视觉，还有音频和文本。

与这些原则相反，机器学习通常专注于处理单一模态的专用模型。
例如，我们开发了用于文本转语音或语音转文本等任务的音频模型，以及用于对象检测和分类等任务的计算机视觉模型。

然而，新一波多模态大语言模型开始出现。
示例包括 OpenAI 的 GPT-4o、Google 的 Vertex AI Gemini 1.5、Anthropic 的 Claude3，以及开源产品 Llama3.2、LLaVA 和 BakLLaVA 能够接受多种输入，包括文本图像、音频和视频，并通过整合这些输入生成文本响应。

> **NOTE:** 多模态大语言模型（LLM）功能使 model 能够处理和生成文本，并结合其他模态，如图像、音频或视频。

## Spring AI Multimodality

多模态是指 model 同时理解和处理来自各种来源的信息的能力，包括文本、图像、音频和其他数据格式。

Spring AI Message API 提供了支持多模态 LLM 所需的所有抽象。

![Spring AI Message API](/img/integration/spring-ai-message-api.jpg)

UserMessage 的 `content` 字段主要用于文本输入，而可选的 `media` 字段允许添加一个或多个不同模态的附加内容，如图像、音频和视频。
`MimeType` 指定模态类型。
根据使用的 LLM，`Media` 数据字段可以是作为 `Resource` 对象的原始媒体内容，也可以是内容的 `URI`。

> **NOTE:** media 字段目前仅适用于用户输入消息（例如，`UserMessage`）。它对系统消息没有意义。包含 LLM 响应的 `AssistantMessage` 仅提供文本内容。要生成非文本媒体输出，您应该使用专用的单模态 model 之一。

例如，我们可以将以下图片（`multimodal.test.png`）作为输入，并要求 LLM 解释它看到的内容。

![Multimodal Test Image](/img/integration/multimodal.test.png)

对于大多数多模态 LLM，Spring AI 代码看起来像这样：

```java
var imageResource = new ClassPathResource("/multimodal.test.png");

var userMessage = UserMessage.builder()
    .text("Explain what do you see in this picture?") // content
    .media(new Media(MimeTypeUtils.IMAGE_PNG, this.imageResource)) // media
    .build();

ChatResponse response = chatModel.call(new Prompt(this.userMessage));
```

或使用流式 [ChatClient](chatclient.adoc) API：

```java
String response = ChatClient.create(chatModel).prompt()
		.user(u -> u.text("Explain what do you see on this picture?")
				    .media(MimeTypeUtils.IMAGE_PNG, new ClassPathResource("/multimodal.test.png")))
		.call()
		.content();
```

并产生如下响应：

> This is an image of a fruit bowl with a simple design. The bowl is made of metal with curved wire edges that create an open structure, allowing the fruit to be visible from all angles. Inside the bowl, there are two yellow bananas resting on top of what appears to be a red apple. The bananas are slightly overripe, as indicated by the brown spots on their peels. The bowl has a metal ring at the top, likely to serve as a handle for carrying. The bowl is placed on a flat surface with a neutral-colored background that provides a clear view of the fruit inside.

Spring AI 为以下 chat model 提供多模态支持：

* [Anthropic Claude 3](chat/anthropic-chat.adoc#_multimodal)
* [AWS Bedrock Converse](chat/bedrock-converse.adoc#_multimodal)
* [Azure Open AI（例如 GPT-4o model）](chat/azure-openai-chat.adoc#_multimodal)
* [Mistral AI（例如 Mistral Pixtral model）](chat/mistralai-chat.adoc#_multimodal)
* [Ollama（例如 LLaVA、BakLLaVA、Llama3.2 model）](chat/ollama-chat.adoc#_multimodal)
* [OpenAI（例如 GPT-4 和 GPT-4o model）](chat/openai-chat.adoc#_multimodal)
* [Vertex AI Gemini（例如 gemini-1.5-pro-001、gemini-1.5-flash-001 model）](chat/vertexai-gemini-chat.adoc#_multimodal)
