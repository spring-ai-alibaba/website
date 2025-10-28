---
title: 检索增强生成RAG（Retrieval-Augmented Generation）
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba RAG"
---

## 检索增强生成

检索增强生成（RAG）是一种有用的技术，可以克服大型语言模型在处理长文本内容、事实准确性和上下文感知方面的局限性。

Spring AI 通过提供模块化架构来支持 RAG，允许您自己构建自定义 RAG 流程或使用 Advisor API 使用开箱即用的 RAG 流程。

### advisor

Spring AI 使用 `Advisor API` 为常见的 RAG 流程提供开箱即用的支持。

要使用 `QuestionAnswerAdvisor` 或 `RetrievalAugmentationAdvisor`，您需要将 `spring-ai-advisors-vector-store` 依赖项添加到您的项目中：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-advisors-vector-store</artifactId>
</dependency>
```

#### QuestionAnswerAdvisor

向量数据库存储 AI 模型不知道的数据。当用户问题发送到 AI 模型时，`QuestionAnswerAdvisor` 会查询向量数据库以获取与用户问题相关的文档。

向量数据库的响应会附加到用户文本中，为 AI 模型提供生成响应的上下文。

假设您已经将数据加载到 `VectorStore` 中，您可以通过向 `ChatClient` 提供 `QuestionAnswerAdvisor` 的实例来执行检索增强生成（RAG）。

```java
ChatResponse response = ChatClient.builder(chatModel)
        .build().prompt()
        .advisors(new QuestionAnswerAdvisor(vectorStore))
        .user(userText)
        .call()
        .chatResponse();
```

在此示例中，`QuestionAnswerAdvisor` 将对向量数据库中的所有文档执行相似性搜索。要限制搜索的文档类型，`SearchRequest` 接受一个类似 SQL 的过滤表达式，该表达式在所有 `VectorStores` 中都是可移植的。

此过滤表达式可以在创建 `QuestionAnswerAdvisor` 时配置，因此将始终应用于所有 `ChatClient` 请求，或者可以在运行时按请求提供。

以下是创建 `QuestionAnswerAdvisor` 实例的方法，其中阈值为 `0.8`，并返回前 `6` 个结果。

```java
var qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
        .searchRequest(SearchRequest.builder().similarityThreshold(0.8d).topK(6).build())
        .build();
```

##### 动态过滤表达式

使用 `FILTER_EXPRESSION` 顾问上下文参数在运行时更新 `SearchRequest` 过滤表达式：

```java
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore)
        .searchRequest(SearchRequest.builder().build())
        .build())
    .build();

// 在运行时更新过滤表达式
String content = this.chatClient.prompt()
    .user("请回答我的问题 XYZ")
    .advisors(a -> a.param(QuestionAnswerAdvisor.FILTER_EXPRESSION, "type == 'Spring'"))
    .call()
    .content();
```

`FILTER_EXPRESSION` 参数允许您根据提供的表达式动态过滤搜索结果。

#### 自定义模板

`QuestionAnswerAdvisor` 使用默认模板来增强用户问题与检索到的文档。您可以通过 `.promptTemplate()` 构建器方法提供自己的 `PromptTemplate` 对象来自定义此行为。

注意：这里提供的 `PromptTemplate` 自定义顾问如何将检索到的上下文与用户查询合并。这与在 `ChatClient` 本身上配置 `TemplateRenderer`（使用 `.templateRenderer()`）不同，后者影响顾问运行*之前*的初始用户/系统提示词内容的渲染。有关客户端级模板渲染的更多详细信息，请参阅 ChatClient 提示词模板。

自定义 `PromptTemplate` 可以使用任何 `TemplateRenderer` 实现（默认情况下，它使用基于 StringTemplate 引擎的 `StPromptTemplate`）。重要要求是模板必须包含以下两个占位符：

- 一个 query 占位符，用于接收用户问题。

- 一个 question_answer_context 占位符，用于接收检索到的上下文。

```java
PromptTemplate customPromptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            上下文信息如下。

			---------------------
			<question_answer_context>
			---------------------

			根据上下文信息且没有先验知识，回答查询。

			遵循以下规则：

			1. 如果答案不在上下文中，只需说你不知道。
			2. 避免使用"根据上下文..."或"提供的信息..."等语句。
            """)
    .build();

    String question = "Anacletus 和 Birba 的冒险发生在哪里？";

    QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
        .promptTemplate(customPromptTemplate)
        .build();

    String response = ChatClient.builder(chatModel).build()
        .prompt(question)
        .advisors(qaAdvisor)
        .call()
        .content();
```

注意：`QuestionAnswerAdvisor.Builder.userTextAdvise()` 方法已被弃用，建议使用 `.promptTemplate()` 以获得更灵活的定制。

#### RetrievalAugmentationAdvisor

Spring AI 包含一个 RAG 模块库，您可以使用它来构建自己的 RAG 流程。 `RetrievalAugmentationAdvisor` 是一个 `Advisor`，为最常见的 RAG 流程提供开箱即用的实现， 基于模块化架构。

##### 顺序RAG流程

朴素RAG：

```java
Advisor retrievalAugmentationAdvisor = RetrievalAugmentationAdvisor.builder()
        .documentRetriever(VectorStoreDocumentRetriever.builder()
                .similarityThreshold(0.50)
                .vectorStore(vectorStore)
                .build())
        .build();

String answer = chatClient.prompt()
        .advisors(retrievalAugmentationAdvisor)
        .user(question)
        .call()
        .content();
```

默认情况下，`RetrievalAugmentationAdvisor` 不允许检索到的上下文为空。当发生这种情况时， 它会指示模型不要回答用户查询。您可以按如下方式允许空上下文。

```java
Advisor retrievalAugmentationAdvisor = RetrievalAugmentationAdvisor.builder()
        .documentRetriever(VectorStoreDocumentRetriever.builder()
                .similarityThreshold(0.50)
                .vectorStore(vectorStore)
                .build())
        .queryAugmenter(ContextualQueryAugmenter.builder()
                .allowEmptyContext(true)
                .build())
        .build();

String answer = chatClient.prompt()
        .advisors(retrievalAugmentationAdvisor)
        .user(question)
        .call()
        .content();
```

`VectorStoreDocumentRetriever` 接受 `FilterExpression` 来根据元数据过滤搜索结果。 您可以在实例化 `VectorStoreDocumentRetriever` 时提供一个，或者在运行时按请求提供， 使用 FILTER_EXPRESSION 顾问上下文参数。

```java
Advisor retrievalAugmentationAdvisor = RetrievalAugmentationAdvisor.builder()
        .documentRetriever(VectorStoreDocumentRetriever.builder()
                .similarityThreshold(0.50)
                .vectorStore(vectorStore)
                .build())
        .build();

String answer = chatClient.prompt()
        .advisors(retrievalAugmentationAdvisor)
        .advisors(a -> a.param(VectorStoreDocumentRetriever.FILTER_EXPRESSION, "type == 'Spring'"))
        .user(question)
        .call()
        .content();
```

##### 高级RAG

```java
Advisor retrievalAugmentationAdvisor = RetrievalAugmentationAdvisor.builder()
        .queryTransformers(RewriteQueryTransformer.builder()
                .chatClientBuilder(chatClientBuilder.build().mutate())
                .build())
        .documentRetriever(VectorStoreDocumentRetriever.builder()
                .similarityThreshold(0.50)
                .vectorStore(vectorStore)
                .build())
        .build();

String answer = chatClient.prompt()
        .advisors(retrievalAugmentationAdvisor)
        .user(question)
        .call()
        .content();
```

您还可以使用 `DocumentPostProcessor` API 在将检索到的文档传递给模型之前对其进行后处理。例如，您可以使用这样的接口来根据文档与查询的相关性对检索到的文档进行重新排序，删除不相关或冗余的文档，或压缩每个文档的内容以减少噪声和冗余。

### 模块

Spring AI 实现了一个模块化 RAG 架构，其灵感来自论文 ["Modular RAG: Transforming RAG Systems into LEGO-like Reconfigurable Frameworks"](https://arxiv.org/abs/2407.21059)中详细说明的模块化概念。

#### 预检索

预检索模块负责处理用户查询，以实现最佳的检索结果。

##### 查询转换

一个用于转换输入查询的组件，使其更有效地用于检索任务，解决诸如 查询格式不佳、术语模糊、复杂词汇或不支持的语言等挑战。

重要：使用 QueryTransformer 时，建议将 `ChatClient.Builder` 配置为低温度（例如，0.0），以确保更确定性和准确的结果，提高检索质量。大多数聊天模型的默认温度通常对于最佳查询转换来说太高，导致检索效果降低。

`CompressionQueryTransformer`

`CompressionQueryTransformer` 使用大型语言模型将对话历史和后续查询压缩成一个独立的查询，捕捉对话的本质。

当对话历史很长且后续查询与对话上下文相关时，此转换器很有用。

```java
Query query = Query.builder()
        .text("它的第二大城市是什么？")
        .history(new UserMessage("丹麦的首都是什么？"),
                new AssistantMessage("哥本哈根是丹麦的首都。"))
        .build();

QueryTransformer queryTransformer = CompressionQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示词可以通过构建器中可用的 `promptTemplate()` 方法进行自定义。

`RewriteQueryTransformer`

`RewriteQueryTransformer` 使用大型语言模型重写用户查询，以在查询目标系统（如向量存储或网络搜索引擎）时提供更好的结果。

当用户查询冗长、模糊或包含可能影响搜索结果质量的不相关信息时，此转换器很有用。

```java
Query query = new Query("我正在学习机器学习。什么是 LLM？");

QueryTransformer queryTransformer = RewriteQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示词可以通过构建器中可用的 `promptTemplate()` 方法进行自定义。

`TranslationQueryTransformer`

`TranslationQueryTransformer` 使用大型语言模型将查询翻译成目标语言，该语言由用于生成文档嵌入的嵌入模型支持。如果查询已经在目标语言中， 则保持不变。如果查询的语言未知，也保持不变。

当嵌入模型在特定语言上训练，而用户查询使用不同语言时，此转换器很有用。

```java
Query query = new Query("Hvad er Danmarks hovedstad?");

QueryTransformer queryTransformer = TranslationQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .targetLanguage("english")
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示词可以通过构建器中可用的 `promptTemplate()` 方法进行自定义。

##### 查询扩展

一个用于将输入查询扩展为查询列表的组件，通过提供替代查询表述或通过将复杂问题分解为更简单的子查询来解决查询格式不佳等挑战。

`MultiQueryExpander`

`MultiQueryExpander` 使用大型语言模型将查询扩展为多个语义多样化的变体 以捕捉不同的视角，有助于检索额外的上下文信息并增加找到相关结果的机会。

```MultiQueryExpander queryExpander = MultiQueryExpander.builder()
    .chatClientBuilder(chatClientBuilder)
    .numberOfQueries(3)
    .build();
List<Query> queries = queryExpander.expand(new Query("如何运行 Spring Boot 应用？"));```
```

默认情况下，`MultiQueryExpander` 在扩展查询列表中包含原始查询。您可以通过构建器中的 `includeOriginal` 方法禁用此行为。

```java
MultiQueryExpander queryExpander = MultiQueryExpander.builder()
    .chatClientBuilder(chatClientBuilder)
    .includeOriginal(false)
    .build();
```

此组件使用的提示词可以通过构建器中可用的 `promptTemplate()` 方法进行自定义。

#### 检索

检索模块负责查询数据系统（如向量存储）并检索最相关的文档。

##### 文档搜索

负责从底层数据源（如搜索引擎、向量存储、数据库或知识图谱）检索 `Documents` 的组件。

`VectorStoreDocumentRetriever`

`VectorStoreDocumentRetriever` 从向量存储中检索与输入查询语义相似的文档。它支持基于元数据、相似性阈值和 top-k 结果的过滤。

```java
DocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
    .vectorStore(vectorStore)
    .similarityThreshold(0.73)
    .topK(5)
    .filterExpression(new FilterExpressionBuilder()
        .eq("genre", "fairytale")
        .build())
    .build();
List<Document> documents = retriever.retrieve(new Query("故事的主要角色是什么？"));
```

过滤表达式可以是静态的或动态的。对于动态过滤表达式，您可以传递一个 `Supplier`

```java
DocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
    .vectorStore(vectorStore)
    .filterExpression(() -> new FilterExpressionBuilder()
        .eq("tenant", TenantContextHolder.getTenantIdentifier())
        .build())
    .build();
List<Document> documents = retriever.retrieve(new Query("下学期的 KPI 是什么？"));
```

您还可以通过 `Query` API 提供特定于请求的过滤表达式，使用 `FILTER_EXPRESSION` 参数。 如果同时提供了特定于请求和特定于检索器的过滤表达式，则特定于请求的过滤表达式优先。

```java
Query query = Query.builder()
    .text("Anacletus 是谁？")
    .context(Map.of(VectorStoreDocumentRetriever.FILTER_EXPRESSION, "location == 'Whispering Woods'"))
    .build();
List<Document> retrievedDocuments = documentRetriever.retrieve(query);
```

##### 文档连接

一个用于将基于多个查询和从多个数据源检索的文档组合成单个文档集合的组件。作为连接过程的一部分，它还可以处理重复文档和互惠排名策略。

`ConcatenationDocumentJoiner`
`ConcatenationDocumentJoiner` 通过将基于多个查询和从多个数据源检索的文档连接成单个文档集合来组合它们。在重复文档的情况下，保留第一次出现。每个文档的分数保持不变。

```java
Map<Query, List<List<Document>>> documentsForQuery = ...
DocumentJoiner documentJoiner = new ConcatenationDocumentJoiner();
List<Document> documents = documentJoiner.join(documentsForQuery);
```

#### 后检索

后检索模块负责处理检索到的文档，以实现最佳的生成结果。

##### 文档后处理

一个用于基于查询对检索到的文档进行后处理的组件，解决诸如_中间丢失_、模型的上下文长度限制以及需要减少检索信息中的噪声和冗余等挑战。

例如，它可以根据文档与查询的相关性对文档进行排名，删除不相关或冗余的文档，或压缩每个文档的内容以减少噪声和冗余。

#### 生成

生成模块负责基于用户查询和检索到的文档生成最终响应。

##### 查询增强

一个用于用额外数据增强输入查询的组件，有助于为大型语言模型提供回答用户查询所需的上下文。

`ContextualQueryAugmenter`
`ContextualQueryAugmenter` 用提供的文档内容中的上下文数据增强用户查询。

```java
QueryAugmenter queryAugmenter = ContextualQueryAugmenter.builder().build();
```
默认情况下，`ContextualQueryAugmenter` 不允许检索到的上下文为空。当发生这种情况时， 它会指示模型不要回答用户查询。

您可以启用 `allowEmptyContext` 选项，允许模型在检索到的上下文为空时也生成响应。

```java
QueryAugmenter queryAugmenter = ContextualQueryAugmenter.builder()
        .allowEmptyContext(true)
        .build();
```

此组件使用的提示词可以通过构建器中可用的 `promptTemplate()` 和 `emptyContextPromptTemplate()` 方法进行自定义。

