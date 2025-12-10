# Prompts

Prompts 是指导 AI model 生成特定输出的输入。
这些 prompts 的设计和措辞显著影响 model 的响应。

在 Spring AI 中与 AI model 交互的最低级别，处理 prompts 在某种程度上类似于在 Spring MVC 中管理"View"。
这涉及创建带有动态内容占位符的广泛文本。
然后根据用户请求或应用程序中的其他代码替换这些占位符。
另一个类比是包含某些表达式占位符的 SQL 语句。

随着 Spring AI 的发展，它将引入更高级别的抽象来与 AI model 交互。
本节中描述的基础类在角色和功能方面可以比作 JDBC。
例如，`ChatModel` 类类似于 JDK 中的核心 JDBC 库。
`ChatClient` 类可以比作 `JdbcClient`，构建在 `ChatModel` 之上，并通过 `Advisor` 提供更高级的构造
来考虑与 model 的过去交互，用附加的上下文文档增强 prompt，并引入 agentic 行为。

在 AI 领域内，prompts 的结构随着时间的推移而演变。
最初，prompts 是简单的字符串。
随着时间的推移，它们发展到包括特定输入的占位符，如"USER:"，AI model 可以识别。
OpenAI 通过在处理之前将多个消息字符串分类为不同的角色，为 prompts 引入了更多结构。

## API 概述

### Prompt

通常使用 `ChatModel` 的 `call()` 方法，该方法接受 `Prompt` 实例并返回 `ChatResponse`。

`Prompt` 类充当一系列有序的 `Message` 对象和请求 `ChatOptions` 的容器。
每个 `Message` 在 prompt 中体现一个独特的角色，在其内容和意图上有所不同。
这些角色可以包含各种元素，从用户查询到 AI 生成的响应再到相关的背景信息。
这种安排使得与 AI model 的复杂和详细交互成为可能，因为 prompt 由多个消息构成，每个消息在对话中扮演特定和定义的角色。

以下是 Prompt 类的截断版本，为简洁起见省略了构造函数和其他实用方法：

```java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions chatOptions;
}
```

### Message

`Message` 接口封装了 `Prompt` 文本内容、元数据属性集合以及称为 `MessageType` 的分类。

接口定义如下：

```java
public interface Content {

	String getContent();

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

`Message` 接口的各种实现对应于 AI model 可以处理的不同类别的消息。
Models 根据对话角色区分消息类别。

![Spring AI Message API](spring-ai-message-api.jpg)

这些角色由 `MessageType` 有效映射，如下所述。

#### 角色

每条消息都被分配一个特定的角色。
这些角色对消息进行分类，为 AI model 阐明 prompt 每个部分的上下文和目的。
这种结构化方法增强了与 AI 通信的细微差别和有效性，因为 prompt 的每个部分在交互中都扮演着独特和定义的角色。

主要角色是：

* System Role：指导 AI 的行为和响应风格，设置 AI 如何解释和回复输入的参数或规则。这类似于在开始对话之前向 AI 提供指令。
* User Role：表示用户的输入——他们对 AI 的问题、命令或陈述。这个角色是基础的，因为它构成了 AI 响应的基础。
* Assistant Role：AI 对用户输入的响应。
不仅仅是答案或反应，它对于维护对话流程至关重要。
通过跟踪 AI 的先前响应（其"Assistant Role"消息），系统确保连贯和上下文相关的交互。
Assistant 消息还可能包含 Function Tool Call 请求信息。
它就像 AI 中的一个特殊功能，在需要时用于执行特定功能，如计算、获取数据或其他不仅仅是对话的任务。
* Tool/Function Role：Tool/Function Role 专注于返回附加信息以响应 Tool Call Assistant Messages。

角色在 Spring AI 中表示为枚举，如下所示

```java
public enum MessageType {

	USER("user"),

	ASSISTANT("assistant"),

	SYSTEM("system"),

	TOOL("tool");

    ...
}
```

### PromptTemplate

Spring AI 中 prompt 模板化的关键组件是 `PromptTemplate` 类，旨在促进创建结构化 prompts，然后将其发送到 AI model 进行处理

```java
public class PromptTemplate implements PromptTemplateActions, PromptTemplateMessageActions {

    // Other methods to be discussed later
}
```

此类使用 `TemplateRenderer` API 来渲染模板。默认情况下，Spring AI 使用 `StTemplateRenderer` 实现，它基于 Terence Parr 开发的开源 [StringTemplate](https://www.stringtemplate.org/) 引擎。模板变量由 `{}` 语法标识，但您也可以配置分隔符以使用其他语法。

```java
public interface TemplateRenderer extends BiFunction<String, Map<String, Object>, String> {

	@Override
	String apply(String template, Map<String, Object> variables);

}
```

Spring AI 使用 `TemplateRenderer` 接口来处理将变量替换到模板字符串中的实际操作。
默认实现使用 StringTemplate。
如果您需要自定义逻辑，可以提供自己的 `TemplateRenderer` 实现。
对于不需要模板渲染的场景（例如，模板字符串已经完整），您可以使用提供的 `NoOpTemplateRenderer`。

使用带有 '<' 和 '>' 分隔符的自定义 StringTemplate 渲染器的示例

```java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            Tell me the names of 5 movies whose soundtrack was composed by <composer>.
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "John Williams"));
```

此类实现的接口支持 prompt 创建的不同方面：

`PromptTemplateStringActions` 专注于创建和渲染 prompt 字符串，代表 prompt 生成的最基本形式。

`PromptTemplateMessageActions` 专门用于通过生成和操作 `Message` 对象来创建 prompt。

`PromptTemplateActions` 旨在返回 `Prompt` 对象，可以传递给 `ChatModel` 以生成响应。

虽然这些接口可能不会在许多项目中广泛使用，但它们显示了 prompt 创建的不同方法。

实现的接口是

```java
public interface PromptTemplateStringActions {

	String render();

	String render(Map<String, Object> model);

}
```

方法 `String render()`：将 prompt 模板渲染为最终字符串格式，无需外部输入，适用于没有占位符或动态内容的模板。

方法 `String render(Map<String, Object> model)`：增强渲染功能以包含动态内容。它使用 `Map<String, Object>`，其中 map 键是 prompt 模板中的占位符名称，值是待插入的动态内容。

```java
public interface PromptTemplateMessageActions {

	Message createMessage();

    Message createMessage(List<Media> mediaList);

	Message createMessage(Map<String, Object> model);

}
```

方法 `Message createMessage()`：创建没有附加数据的 `Message` 对象，用于静态或预定义的消息内容。

方法 `Message createMessage(List<Media> mediaList)`：创建具有静态文本和媒体内容的 `Message` 对象。

方法 `Message createMessage(Map<String, Object> model)`：扩展消息创建以集成动态内容，接受 `Map<String, Object>`，其中每个条目表示消息模板中的占位符及其对应的动态值。

```java
public interface PromptTemplateActions extends PromptTemplateStringActions {

	Prompt create();

	Prompt create(ChatOptions modelOptions);

	Prompt create(Map<String, Object> model);

	Prompt create(Map<String, Object> model, ChatOptions modelOptions);

}
```

方法 `Prompt create()`：生成没有外部数据输入的 `Prompt` 对象，适用于静态或预定义的 prompts。

方法 `Prompt create(ChatOptions modelOptions)`：生成没有外部数据输入且具有聊天请求特定选项的 `Prompt` 对象。

方法 `Prompt create(Map<String, Object> model)`：扩展 prompt 创建功能以包含动态内容，接受 `Map<String, Object>`，其中每个 map 条目是 prompt 模板中的占位符及其关联的动态值。

方法 `Prompt create(Map<String, Object> model, ChatOptions modelOptions)`：扩展 prompt 创建功能以包含动态内容，接受 `Map<String, Object>`，其中每个 map 条目是 prompt 模板中的占位符及其关联的动态值，以及聊天请求的特定选项。

## 使用示例

下面显示了一个来自 [AI Workshop on PromptTemplates](https://github.com/Azure-Samples/spring-ai-azure-workshop/blob/main/2-README-prompt-templating.md) 的简单示例。

```java
PromptTemplate promptTemplate = new PromptTemplate("Tell me a {adjective} joke about {topic}");

Prompt prompt = promptTemplate.create(Map.of("adjective", adjective, "topic", topic));

return chatModel.call(prompt).getResult();
```

下面显示了另一个来自 [AI Workshop on Roles](https://github.com/Azure-Samples/spring-ai-azure-workshop/blob/main/3-README-prompt-roles.md) 的示例。

```java
String userText = """
    Tell me about three famous pirates from the Golden Age of Piracy and why they did.
    Write at least a sentence for each pirate.
    """;

Message userMessage = new UserMessage(userText);

String systemText = """
  You are a helpful AI assistant that helps people find information.
  Your name is {name}
  You should reply to the user's request with your name and also in the style of a {voice}.
  """;

SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemText);
Message systemMessage = systemPromptTemplate.createMessage(Map.of("name", name, "voice", voice));

Prompt prompt = new Prompt(List.of(userMessage, systemMessage));

List<Generation> response = chatModel.call(prompt).getResults();
```

这显示了如何通过使用 `SystemPromptTemplate` 创建具有系统角色的 `Message` 并传入占位符值来构建 `Prompt` 实例。
然后，具有 `user` 角色的消息与具有 `system` 角色的消息组合形成 prompt。
然后将 prompt 传递给 ChatModel 以获得生成响应。

### 使用自定义模板渲染器

您可以通过实现 `TemplateRenderer` 接口并将其传递给 `PromptTemplate` 构造函数来使用自定义模板渲染器。您也可以继续使用默认的 `StTemplateRenderer`，但使用自定义配置。

默认情况下，模板变量由 `{}` 语法标识。如果您计划在 prompt 中包含 JSON，您可能希望使用不同的语法以避免与 JSON 语法冲突。例如，您可以使用 `<` 和 `>` 分隔符。

```java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            Tell me the names of 5 movies whose soundtrack was composed by <composer>.
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "John Williams"));
```

### 使用资源而不是原始字符串

Spring AI 支持 `org.springframework.core.io.Resource` 抽象，因此您可以将 prompt 数据放在可以直接在 `PromptTemplate` 中使用的文件中。
例如，您可以在 Spring 管理的组件中定义一个字段来检索 `Resource`。

```java
@Value("classpath:/prompts/system-message.st")
private Resource systemResource;
```

然后直接将该资源传递给 `SystemPromptTemplate`。

```java
SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemResource);
```

## Prompt Engineering

在生成式 AI 中，创建 prompts 对开发人员来说是一项关键任务。
这些 prompts 的质量和结构显著影响 AI 输出的有效性。
投入时间和精力设计周到的 prompts 可以大大改善 AI 的结果。

分享和讨论 prompts 是 AI 社区中的常见做法。
这种协作方法不仅创建了共享的学习环境，还导致识别和使用高效的 prompts。

该领域的研究通常涉及分析和比较不同的 prompts 以评估它们在各种情况下的有效性。
例如，一项重要的研究表明，以"Take a deep breath and work on this problem step by step"开始 prompt 显著提高了问题解决效率。
这突出了精心选择的语言对生成式 AI 系统性能的影响。

掌握 prompts 的最有效使用，特别是在 AI 技术快速发展的背景下，是一个持续的挑战。
您应该认识到 prompt engineering 的重要性，并考虑使用来自社区和研究的见解来改进 prompt 创建策略。

### 创建有效的 prompts

在开发 prompts 时，重要的是整合几个关键组件以确保清晰度和有效性：

* *指令*：向 AI 提供清晰和直接的指令，类似于您如何与人交流。这种清晰度对于帮助 AI"理解"期望的内容至关重要。

* *外部上下文*：在必要时包括相关的背景信息或对 AI 响应的特定指导。这种"外部上下文"为 prompt 提供了框架，并帮助 AI 掌握整体场景。

* *用户输入*：这是直接的部分——用户的直接请求或问题，构成 prompt 的核心。

* *输出指示器*：这方面可能很棘手。它涉及指定 AI 响应的所需格式，例如 JSON。但是，请注意 AI 可能并不总是严格遵守此格式。例如，它可能在实际 JSON 数据之前添加诸如"here is your JSON"之类的短语，或者有时生成不准确的类似 JSON 的结构。

在制作 prompts 时，向 AI 提供预期问题和答案格式的示例可能非常有益。
这种做法有助于 AI"理解"查询的结构和意图，从而产生更精确和相关的响应。
虽然本文档没有深入探讨这些技术，但它们为在 AI prompt engineering 中进一步探索提供了起点。

以下是进一步研究的资源列表。

#### 简单技术

* [文本摘要](https://www.promptingguide.ai/introduction/examples.en#text-summarization)：将大量文本减少为简洁的摘要，捕获关键点和主要思想，同时省略不太重要的细节。

* [问答](https://www.promptingguide.ai/introduction/examples.en#question-answering)：专注于从提供的文本中得出特定答案，基于用户提出的问题。它是关于精确定位和提取相关信息以响应查询。

* [文本分类](https://www.promptingguide.ai/introduction/examples.en#text-classification)：系统地将文本分类到预定义的类别或组中，分析文本并根据其内容将其分配到最合适的类别。

* [对话](https://www.promptingguide.ai/introduction/examples.en#conversation)：创建交互式对话，其中 AI 可以与用户进行来回交流，模拟自然对话流程。

* [代码生成](https://www.promptingguide.ai/introduction/examples.en#code-generation)：基于特定的用户需求或描述生成功能代码片段，将自然语言指令转换为可执行代码。

#### 高级技术

* [Zero-shot](https://www.promptingguide.ai/techniques/zeroshot)、[Few-shot Learning](https://www.promptingguide.ai/techniques/fewshot)：使 model 能够在特定问题类型几乎没有或没有先前示例的情况下做出准确的预测或响应，使用学习的泛化来理解和执行新任务。

* [Chain-of-Thought](https://www.promptingguide.ai/techniques/cot)：链接多个 AI 响应以创建连贯和上下文感知的对话。它帮助 AI 维护讨论的线索，确保相关性和连续性。

* [ReAct (Reason + Act)](https://www.promptingguide.ai/techniques/react)：在这种方法中，AI 首先分析（推理）输入，然后确定最合适的行动或响应过程。它结合了理解和决策。

#### Microsoft Guidance

* [Prompt 创建和优化框架](https://github.com/microsoft/guidance)：Microsoft 提供了一种开发和改进 prompts 的结构化方法。此框架指导用户创建有效的 prompts，从 AI model 中引出所需的响应，优化交互以提高清晰度和效率。

## Tokens

Tokens 在 AI model 如何处理文本方面至关重要，充当将单词（如我们所理解的）转换为 AI model 可以处理的格式的桥梁。
这种转换发生在两个阶段：单词在输入时转换为 tokens，然后这些 tokens 在输出时转换回单词。

Tokenization（将文本分解为 tokens 的过程）是 AI model 如何理解和处理语言的基础。
AI model 使用这种 tokenized 格式来理解和响应 prompts。

为了更好地理解 tokens，将它们视为单词的一部分。通常，一个 token 代表大约四分之三的单词。例如，莎士比亚的完整作品，总共大约 900,000 个单词，将转换为大约 120 万个 tokens。

使用 [OpenAI Tokenizer UI](https://platform.openai.com/tokenizer) 进行实验，看看单词如何转换为 tokens。

Tokens 除了在 AI 处理中的技术作用外，还具有实际意义，特别是在计费和 model 功能方面：

* 计费：AI model 服务通常根据 token 使用情况计费。输入（prompt）和输出（响应）都计入总 token 数，使较短的 prompts 更具成本效益。

* Model 限制：不同的 AI model 具有不同的 token 限制，定义了它们的"上下文窗口"——它们一次可以处理的最大信息量。例如，GPT-3 的限制是 4K tokens，而其他 model（如 Claude 2 和 Meta Llama 2）的限制是 100K tokens，一些研究 model 可以处理多达 100 万个 tokens。

* 上下文窗口：model 的 token 限制决定了其上下文窗口。超过此限制的输入不会被 model 处理。仅发送用于处理的最小有效信息集至关重要。例如，在询问"Hamlet"时，不需要包含莎士比亚所有其他作品的 tokens。

* 响应元数据：来自 AI model 的响应的元数据包括使用的 token 数量，这是管理使用和成本的重要信息。
