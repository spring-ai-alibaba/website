# Prompts

Prompts  是引导 AI 模型生成特定输出的输入。这些  prompts 的设计和措辞会显著影响模型的响应。

在 Spring AI 中与 AI 模型交互的最低级别，处理 Spring AI 中的  prompts 有点类似于管理 Spring MVC 中的“视图”。这涉及创建包含动态内容占位符的大量文本。然后，这些占位符会根据用户请求或应用程序中的其他代码进行替换。另一个类比是包含特定表达式占位符的 SQL 语句。

随着 Spring AI 的发展，它将引入更高级别的抽象，以便与 AI 模型进行交互。本节中描述的基础类在角色和功能方面可以类比为 JDBC。`ChatModel`例如， 类类似于 JDK 中的核心 JDBC 库。 类`ChatClient`可以类比为`JdbcClient`，它构建于 之上，`ChatModel`并通过 提供更高级的构造，`Advisor` 以考虑过去与模型的交互，使用额外的上下文文档来扩充  prompts ，并引入代理行为。

在人工智能领域，  prompts 符的结构一直在不断发展。最初，  prompts 符只是简单的字符串。随着时间的推移，它们逐渐包含特定输入的占位符，例如“USER:”，而人工智能模型可以识别这些占位符。OpenAI 通过在人工智能模型处理多个消息字符串之前，将它们分类到不同的角色中，为  prompts 符引入了更丰富的结构。

## API 概述

### 迅速的

通常使用接受实例并返回的`call()`方法。`ChatModel``Prompt``ChatResponse`

该类`Prompt`充当一系列有序`Message`对象和一个请求的容器`ChatOptions`。每个对象`Message`在  prompts 中都体现出一个独特的角色，其内容和意图各不相同。这些角色可以涵盖各种元素，从用户查询到AI生成的响应，再到相关的背景信息。这种安排使得与AI模型进行复杂而细致的交互成为可能，因为  prompts 由多条消息构成，每条消息在对话中都被赋予了特定的角色。

下面是 Prompt 类的截断版本，为了简洁起见省略了构造函数和实用方法：



```java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions chatOptions;
}
```
### 信息

该`Message`接口封装了`Prompt`文本内容、元数据属性集合和称为的分类`MessageType`。

该接口定义如下：

```java
public interface Content {

	String getContent();

	Map<String, Object> getMetadata();
}

public interface Message extends Content {

	MessageType getMessageType();
}
```

多模式消息类型还实现了`MediaContent`提供内容对象列表的接口`Media`。

```java
public interface MediaContent extends Content {

	Collection<Media> getMedia();

}
```

接口的各种实现`Message`对应于 AI 模型可以处理的不同消息类别。模型根据对话角色区分消息类别。![image-20250515211443541](https://docs.spring.io/spring-ai/reference/_images/spring-ai-message-api.jpg)

这些角色由 有效映射`MessageType`，如下所述。

#### 角色

每条消息都被赋予了特定的角色。这些角色对消息进行分类，为AI模型明确  prompts 中每个部分的上下文和目的。这种结构化方法增强了与AI沟通的细微差别和有效性，因为  prompts 的每个部分在交互中都扮演着独特而明确的角色。

主要角色是：

- 系统角色：引导AI的行为和响应方式，设置AI如何解释和回复输入的参数或规则。这类似于在发起对话之前向AI提供指令。
- 用户角色：代表用户的输入——他们向AI提出的问题、命令或语句。这个角色至关重要，因为它构成了AI响应的基础。
- 助手角色：AI 对用户输入的响应。它不仅仅是一个答案或反应，对于维持对话的流畅性至关重要。通过追踪 AI 之前的响应（其“助手角色”消息），系统可以确保交互的连贯性以及与上下文的相关性。助手消息也可能包含功能工具调用请求信息。它就像 AI 中的一项特殊功能，在需要执行特定功能（例如计算、获取数据或其他不仅仅是对话的任务）时使用。
- 工具/功能角色：工具/功能角色专注于响应工具调用助手消息返回附加信息。

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

### Prompts 模板

Spring AI 中  prompts 模板的一个关键组件是`PromptTemplate`类，旨在促进结构化  prompts 的创建，然后将其发送到 AI 模型进行处理

```java
public class PromptTemplate implements PromptTemplateActions, PromptTemplateMessageActions {

    // Other methods to be discussed later
}
```

此类使用`TemplateRenderer`API 来渲染模板。默认情况下，Spring AI 使用`StTemplateRenderer`基于 Terence Parr 开发的开源[StringTemplate](https://www.stringtemplate.org/)引擎的实现。模板变量通过语法标识`{}`，但您也可以配置分隔符以使用其他语法。

```java
public interface TemplateRenderer extends BiFunction<String, Map<String, Object>, String> {

	@Override
	String apply(String template, Map<String, Object> variables);

}
```

Spring AI 使用`TemplateRenderer`接口来处理将变量实际替换到模板字符串中。默认实现使用[[StringTemplate\]](https://docs.spring.io/spring-ai/reference/api/prompt.html#StringTemplate)。如果需要自定义逻辑，可以提供自己的实现`TemplateRenderer`。对于不需要模板渲染的场景（例如，模板字符串已经完成），可以使用提供的`NoOpTemplateRenderer`。

使用带有“<”和“>”分隔符的自定义 StringTemplate 渲染器的示例

```java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            Tell me the names of 5 movies whose soundtrack was composed by <composer>.
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "John Williams"));
```

此类实现的接口支持  prompts 创建的不同方面：

`PromptTemplateStringActions`专注于创建和渲染  prompts 字符串，代表  prompts 生成的最基本形式。

`PromptTemplateMessageActions`适用于通过生成和操作`Message`对象进行快速创作。

`PromptTemplateActions`旨在返回`Prompt`对象，可以将其传递`ChatModel`给生成响应。

虽然这些界面可能在许多项目中没有被广泛使用，但它们展示了  prompts 创建的不同方法。

实现的接口有

```java
public interface PromptTemplateStringActions {

	String render();

	String render(Map<String, Object> model);

}
```

方法`String render()`：将  prompts 模板渲染为最终的字符串格式，无需外部输入，适用于没有占位符或动态内容的模板。

该方法`String render(Map<String, Object> model)`：增强渲染功能以包含动态内容。它使用一个`Map<String, Object>`映射，其中键是  prompts 模板中的占位符名称，值是要插入的动态内容。

```java
public interface PromptTemplateMessageActions {

	Message createMessage();

    Message createMessage(List<Media> mediaList);

	Message createMessage(Map<String, Object> model);

}
```

方法`Message createMessage()`：创建一个`Message`没有附加数据的对象，用于静态或预定义的消息内容。

方法`Message createMessage(List<Media> mediaList)`：创建一个`Message`具有静态文本和媒体内容的对象。

方法`Message createMessage(Map<String, Object> model)`：扩展消息创建以集成动态内容，接受`Map<String, Object>`每个条目代表消息模板中的占位符及其对应的动态值。

```java
public interface PromptTemplateActions extends PromptTemplateStringActions {

	Prompt create();

	Prompt create(ChatOptions modelOptions);

	Prompt create(Map<String, Object> model);

	Prompt create(Map<String, Object> model, ChatOptions modelOptions);

}
```

方法`Prompt create()`：`Prompt`无需外部数据输入即可生成对象，非常适合静态或预定义  prompts 。

方法`Prompt create(ChatOptions modelOptions)`：生成一个`Prompt`没有外部数据输入但带有聊天请求特定选项的对象。

方法`Prompt create(Map<String, Object> model)`：扩展  prompts 创建功能以包含动态内容，其中`Map<String, Object>`每个映射条目都是  prompts 模板中的占位符及其关联的动态值。

方法`Prompt create(Map<String, Object> model, ChatOptions modelOptions)`：扩展  prompts 创建功能以包含动态内容，其中`Map<String, Object>`每个映射条目都是  prompts 模板中的占位符及其关联的动态值，以及聊天请求的特定选项。

## 示例用法

下面是一个取自[PromptTemplates 人工智能研讨会的](https://github.com/Azure-Samples/spring-ai-azure-workshop/blob/main/2-README-prompt-templating.md)简单示例。

```java
PromptTemplate promptTemplate = new PromptTemplate("Tell me a {adjective} joke about {topic}");

Prompt prompt = promptTemplate.create(Map.of("adjective", adjective, "topic", topic));

return chatModel.call(prompt).getResult();已复制！
```

下面是从[角色人工智能研讨会中](https://github.com/Azure-Samples/spring-ai-azure-workshop/blob/main/3-README-prompt-roles.md)摘取的另一个示例。

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

这展示了如何`Prompt`使用`SystemPromptTemplate`创建一个`Message`带有系统角色的实例，并传入占位符值。然后将带有角色的消息`user`与角色本身的消息组合起来`system`形成  prompts 。之后，该  prompts 会被传递给 ChatModel 以获得生成的响应。

### 使用自定义模板渲染器

`TemplateRenderer`您可以通过实现接口并将其传递给构造函数来使用自定义模板渲染器`PromptTemplate`。您也可以继续使用默认的渲染器`StTemplateRenderer`，但使用自定义配置。

默认情况下，模板变量由语法标识`{}`。如果您计划在  prompts 中包含 JSON，则可能需要使用其他语法来避免与 JSON 语法冲突。例如，您可以使用`<`和`>`分隔符。

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

Spring AI 支持`org.springframework.core.io.Resource`抽象，因此您可以将  prompts 数据放入可直接在 中使用的文件中`PromptTemplate`。例如，您可以在 Spring 管理的组件中定义一个字段来检索`Resource`。

```java
@Value("classpath:/prompts/system-message.st")
private Resource systemResource;
```

然后将资源`SystemPromptTemplate`直接传递给。

```java
SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemResource);
```

## 快速工程

在生成式人工智能中，创建  prompts 对于开发人员来说是一项至关重要的任务。这些  prompts 的质量和结构会显著影响人工智能输出的有效性。投入时间和精力设计周到的  prompts 可以显著提升人工智能的成果。

分享和讨论  prompts 是人工智能社区的常见做法。这种协作方式不仅营造了共享的学习环境，还能帮助人们识别和使用高效的  prompts 。

该领域的研究通常涉及分析和比较不同的  prompts ，以评估它们在不同情况下的有效性。例如，一项重要的研究表明，以“深呼吸，一步一步解决这个问题”作为  prompts 开头，可以显著提高解决问题的效率。这凸显了精心选择的语言对生成式人工智能系统性能的影响。

掌握最有效的  prompts 使用方法，尤其是在人工智能技术飞速发展的今天，是一项持续的挑战。您应该认识到  prompts 工程的重要性，并考虑借鉴社区和研究的洞见来改进  prompts 创建策略。

### 创建有效的  prompts 

在制定  prompts 时，整合几个关键组件以确保清晰度和有效性非常重要：

- **指示**：向AI提供清晰直接的指令，类似于与人沟通的方式。这种清晰的指令对于帮助AI“理解”预期至关重要。
- **外部背景**：在必要时，包含相关的背景信息或AI响应的具体指导。这种“外部背景”构成了  prompts 的框架，并帮助AI掌握整体场景。
- **用户输入**：这是最直接的部分——用户的直接请求或问题构成  prompts 的核心。
- **输出指示符**：这方面可能比较棘手。它需要指定 AI 响应所需的格式，例如 JSON。但请注意，AI 可能并不总是严格遵循此格式。例如，它可能会将“这是你的 JSON”之类的短语添加到实际 JSON 数据之前，或者有时会生成不准确的类似 JSON 的结构。

在设计  prompts 时，为 AI 提供预期问答格式的示例非常有益。这种做法有助于 AI“理解”查询的结构和意图，从而提供更精确、更相关的响应。虽然本文档并未深入探讨这些技术，但它们为进一步探索 AI   prompts 工程提供了一个起点。

以下是需要进一步调查的资源列表。

#### 简单技巧

- **[文本摘要](https://www.promptingguide.ai/introduction/examples.en#text-summarization)**：
  将大量文本缩减为简洁的摘要，捕捉关键点和主要思想，同时省略不太重要的细节。
- **[问答](https://www.promptingguide.ai/introduction/examples.en#question-answering)**：
  专注于根据用户提出的问题，从提供的文本中获取具体答案。它旨在精准定位并提取相关信息以响应查询。
- **[文本分类](https://www.promptingguide.ai/introduction/examples.en#text-classification)**：
  系统地将文本分类到预定义的类别或组中，分析文本并根据其内容将其分配到最合适的类别。
- **[对话](https://www.promptingguide.ai/introduction/examples.en#conversation)**：
  创建交互式对话，让人工智能可以与用户进行来回交流，模拟自然的对话流程。
- **[代码生成](https://www.promptingguide.ai/introduction/examples.en#code-generation)**：
  根据特定的用户要求或描述生成功能代码片段，将自然语言指令转换为可执行代码。

#### 高级技术

- **[零样本](https://www.promptingguide.ai/techniques/zeroshot)、[少样本学习](https://www.promptingguide.ai/techniques/fewshot)**：
  使模型能够利用特定问题类型的极少或没有先前的示例做出准确的预测或响应，并使用学习到的概括来理解和执行新任务。
- **[思路链](https://www.promptingguide.ai/techniques/cot)**：
  将多个AI响应连接起来，创建连贯且符合语境的对话。它帮助AI保持讨论的线索，确保相关性和连续性。
- **[ReAct（推理 + 行动）](https://www.promptingguide.ai/techniques/react)**：
  在这种方法中，人工智能首先分析输入（推理），然后确定最合适的行动或响应方案。它将理解与决策结合在一起。

#### Microsoft 指导

- **[  prompts 创建和优化框架](https://github.com/microsoft/guidance)**：
  微软提供了一种结构化的方法来开发和完善  prompts 。该框架指导用户创建有效的  prompts ，以便从 AI 模型中获取所需的响应，并优化交互以提高清晰度和效率。

## 代币

标记在 AI 模型处理文本的过程中至关重要，它充当着将我们理解的单词转换为 AI 模型能够处理的格式的桥梁。这种转换分为两个阶段：输入时将单词转换为标记，然后在输出时将这些标记转换回单词。

标记化是将文本分解成标记的过程，它是 AI 模型理解和处理语言的基础。AI 模型运用这种标记化格式来理解并响应  prompts 。

为了更好地理解标记，可以将它们视为单词的一部分。通常，一个标记代表一个单词的四分之三左右。例如，莎士比亚全集共约 90 万字，翻译过来大约需要 120 万个标记。

试验[OpenAI Tokenizer UI](https://platform.openai.com/tokenizer)来查看单词如何转换为标记。

代币除了在人工智能处理中的技术作用外，还具有实际意义，特别是在计费和模型功能方面：

- 计费：AI 模型服务通常根据令牌使用情况计费。输入（  prompts ）和输出（响应）都会计入令牌总数，因此较短的  prompts 更具成本效益。
- 模型限制：不同的 AI 模型具有不同的令牌限制，这定义了它们的“上下文窗口”——即它们一次可以处理的最大信息量。例如，GPT-3 的限制为 4000 个令牌，而 Claude 2 和 Meta Llama 2 等其他模型的限制为 10 万个令牌，一些研究模型最多可以处理 100 万个令牌。
- 上下文窗口：模型的令牌限制决定了其上下文窗口。超过此限制的输入不会被模型处理。务必仅发送最少的有效信息集进行处理。例如，在查询《哈姆雷特》时，无需包含莎士比亚所有其他作品的令牌。
- 响应元数据：来自 AI 模型的响应的元数据包括使用的令牌数量，这是管理使用情况和成本的重要信息。
