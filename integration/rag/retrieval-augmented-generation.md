# Retrieval Augmented Generation

Retrieval Augmented Generation (RAG) 是一种有用的技术，用于克服大型语言模型的局限性，这些模型在处理长文本内容、事实准确性和上下文感知方面存在困难。

Spring AI 通过提供模块化架构支持 RAG，允许您自己构建自定义 RAG 流程，或使用 `Advisor` API 使用开箱即用的 RAG 流程。

注意：在 [概念](concepts.adoc#concept-rag) 部分了解更多关于 Retrieval Augmented Generation 的信息。

## Advisors

Spring AI 使用 `Advisor` API 为常见的 RAG 流程提供开箱即用的支持。

要使用 `QuestionAnswerAdvisor` 或 `VectorStoreChatMemoryAdvisor`，您需要将 `spring-ai-advisors-vector-store` 依赖项添加到您的项目：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-advisors-vector-store</artifactId>
</dependency>
```

### QuestionAnswerAdvisor

向量数据库存储 AI 模型不知道的数据。当用户问题发送到 AI 模型时，`QuestionAnswerAdvisor` 会查询向量数据库以查找与用户问题相关的文档。

向量数据库的响应会附加到用户文本，为 AI 模型提供上下文以生成响应。

假设您已经将数据加载到 `VectorStore` 中，您可以通过向 `ChatClient` 提供 `QuestionAnswerAdvisor` 的实例来执行 Retrieval Augmented Generation (RAG)。

```java
ChatResponse response = ChatClient.builder(chatModel)
        .build().prompt()
        .advisors(QuestionAnswerAdvisor.builder(vectorStore).build())
        .user(userText)
        .call()
        .chatResponse();
```

在此示例中，`QuestionAnswerAdvisor` 将对 Vector Database 中的所有文档执行相似性搜索。要限制搜索的文档类型，`SearchRequest` 接受一个类似 SQL 的过滤表达式，该表达式可在所有 `VectorStores` 之间移植。

此过滤表达式可以在创建 `QuestionAnswerAdvisor` 时配置，因此将始终应用于所有 `ChatClient` 请求，或者可以在运行时按请求提供。

以下是如何创建 `QuestionAnswerAdvisor` 的实例，其中阈值为 `0.8` 并返回前 `6` 个结果。

```java
var qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
        .searchRequest(SearchRequest.builder().similarityThreshold(0.8d).topK(6).build())
        .build();
```

#### 动态过滤表达式

使用 `FILTER_EXPRESSION` advisor 上下文参数在运行时更新 `SearchRequest` 过滤表达式：

```java
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore)
        .searchRequest(SearchRequest.builder().build())
        .build())
    .build();

// Update filter expression at runtime
String content = this.chatClient.prompt()
    .user("Please answer my question XYZ")
    .advisors(a -> a.param(QuestionAnswerAdvisor.FILTER_EXPRESSION, "type == 'Spring'"))
    .call()
    .content();
```

`FILTER_EXPRESSION` 参数允许您根据提供的表达式动态过滤搜索结果。

#### 自定义模板

`QuestionAnswerAdvisor` 使用默认模板来增强用户问题与检索到的文档。您可以通过 `.promptTemplate()` builder 方法提供自己的 `PromptTemplate` 对象来自定义此行为。

注意：这里提供的 `PromptTemplate` 自定义 advisor 如何将检索到的上下文与用户查询合并。这与在 `ChatClient` 本身上配置 `TemplateRenderer`（使用 `.templateRenderer()`）不同，后者影响 advisor 运行*之前*初始用户/系统提示内容的渲染。有关客户端级模板渲染的更多详细信息，请参阅 [ChatClient Prompt Templates](api/chatclient.adoc#_prompt_templates)。

自定义 `PromptTemplate` 可以使用任何 `TemplateRenderer` 实现（默认情况下，它使用基于 https://www.stringtemplate.org/[StringTemplate] 引擎的 `StPromptTemplate`）。重要要求是模板必须包含以下两个占位符：

* 一个 `query` 占位符来接收用户问题。
* 一个 `question_answer_context` 占位符来接收检索到的上下文。

```java
PromptTemplate customPromptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            <query>

            Context information is below.

			---------------------
			<question_answer_context>
			---------------------

			Given the context information and no prior knowledge, answer the query.

			Follow these rules:

			1. If the answer is not in the context, just say that you don't know.
			2. Avoid statements like "Based on the context..." or "The provided information...".
            """)
    .build();

    String question = "Where does the adventure of Anacletus and Birba take place?";

    QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
        .promptTemplate(customPromptTemplate)
        .build();

    String response = ChatClient.builder(chatModel).build()
        .prompt(question)
        .advisors(qaAdvisor)
        .call()
        .content();
```

注意：`QuestionAnswerAdvisor.Builder.userTextAdvise()` 方法已弃用，建议使用 `.promptTemplate()` 以获得更灵活的自定义。

### RetrievalAugmentationAdvisor

Spring AI 包含一个 [RAG 模块库](api/retrieval-augmented-generation.adoc#modules)，您可以使用它来构建自己的 RAG 流程。
`RetrievalAugmentationAdvisor` 是一个 `Advisor`，为最常见的 RAG 流程提供开箱即用的实现，基于模块化架构。

要使用 `RetrievalAugmentationAdvisor`，您需要将 `spring-ai-rag` 依赖项添加到您的项目：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-rag</artifactId>
</dependency>
```

#### 顺序 RAG 流程

##### Naive RAG

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

默认情况下，`RetrievalAugmentationAdvisor` 不允许检索到的上下文为空。当发生这种情况时，它会指示模型不要回答用户查询。您可以按如下方式允许空上下文。

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

`VectorStoreDocumentRetriever` 接受 `FilterExpression` 以根据元数据过滤搜索结果。
您可以在实例化 `VectorStoreDocumentRetriever` 时提供一个，或者在运行时按请求提供一个，使用 `FILTER_EXPRESSION` advisor 上下文参数。

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

有关更多信息，请参阅 [VectorStoreDocumentRetriever](api/retrieval-augmented-generation.adoc#_vectorstoredocumentretriever)。

##### Advanced RAG

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

您还可以使用 `DocumentPostProcessor` API 在将检索到的文档传递给模型之前对它们进行后处理。例如，您可以使用这样的接口根据文档与查询的相关性对检索到的文档执行重新排序，删除不相关或冗余的文档，或压缩每个文档的内容以减少噪音和冗余。

## Modules

Spring AI 实现了一个模块化 RAG 架构，其灵感来自论文 "https://arxiv.org/abs/2407.21059[Modular RAG: Transforming RAG Systems into LEGO-like Reconfigurable Frameworks]" 中详述的模块化概念。

### Pre-Retrieval

Pre-Retrieval 模块负责处理用户查询以获得最佳的检索结果。

#### Query Transformation

用于转换输入查询的组件，使其更有效地用于检索任务，解决诸如格式不良的查询、模糊术语、复杂词汇或不支持的语言等挑战。

重要提示：使用 `QueryTransformer` 时，建议将 `ChatClient.Builder` 配置为低温度（例如，0.0），以确保更确定性和准确的结果，提高检索质量。大多数聊天模型的默认温度通常对于最佳查询转换来说太高，导致检索效果降低。

##### CompressionQueryTransformer

`CompressionQueryTransformer` 使用大型语言模型将对话历史和后续查询压缩为捕获对话本质的独立查询。

当对话历史很长且后续查询与对话上下文相关时，此转换器很有用。

```java
Query query = Query.builder()
        .text("And what is its second largest city?")
        .history(new UserMessage("What is the capital of Denmark?"),
                new AssistantMessage("Copenhagen is the capital of Denmark."))
        .build();

QueryTransformer queryTransformer = CompressionQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示可以通过 builder 中可用的 `promptTemplate()` 方法进行自定义。

##### RewriteQueryTransformer

`RewriteQueryTransformer` 使用大型语言模型重写用户查询，以便在查询目标系统（如向量存储或网络搜索引擎）时提供更好的结果。

当用户查询冗长、模糊或包含可能影响搜索结果质量的不相关信息时，此转换器很有用。

```java
Query query = new Query("I'm studying machine learning. What is an LLM?");

QueryTransformer queryTransformer = RewriteQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示可以通过 builder 中可用的 `promptTemplate()` 方法进行自定义。

##### TranslationQueryTransformer

`TranslationQueryTransformer` 使用大型语言模型将查询翻译为目标语言，该语言由用于生成文档嵌入的嵌入模型支持。如果查询已经是目标语言，则保持不变。如果查询的语言未知，也保持不变。

当嵌入模型在特定语言上训练且用户查询使用不同语言时，此转换器很有用。

```java
Query query = new Query("Hvad er Danmarks hovedstad?");

QueryTransformer queryTransformer = TranslationQueryTransformer.builder()
        .chatClientBuilder(chatClientBuilder)
        .targetLanguage("english")
        .build();

Query transformedQuery = queryTransformer.transform(query);
```

此组件使用的提示可以通过 builder 中可用的 `promptTemplate()` 方法进行自定义。

#### Query Expansion

用于将输入查询扩展为查询列表的组件，通过提供替代查询公式或通过将复杂问题分解为更简单的子查询来解决格式不良的查询等挑战。

##### MultiQueryExpander

`MultiQueryExpander` 使用大型语言模型将查询扩展为多个语义上不同的变体，以捕获不同的视角，这对于检索额外的上下文信息和增加找到相关结果的机会很有用。

```java
MultiQueryExpander queryExpander = MultiQueryExpander.builder()
    .chatClientBuilder(chatClientBuilder)
    .numberOfQueries(3)
    .build();
List<Query> queries = queryExpander.expand(new Query("How to run a Spring Boot app?"));
```

默认情况下，`MultiQueryExpander` 在扩展查询列表中包含原始查询。您可以通过 builder 中的 `includeOriginal` 方法禁用此行为。

```java
MultiQueryExpander queryExpander = MultiQueryExpander.builder()
    .chatClientBuilder(chatClientBuilder)
    .includeOriginal(false)
    .build();
```

此组件使用的提示可以通过 builder 中可用的 `promptTemplate()` 方法进行自定义。

### Retrieval

Retrieval 模块负责查询向量存储等数据系统并检索最相关的文档。

#### Document Search

负责从底层数据源（如搜索引擎、向量存储、数据库或知识图谱）检索 `Documents` 的组件。

##### VectorStoreDocumentRetriever

`VectorStoreDocumentRetriever` 从向量存储中检索与输入查询语义相似的文档。它支持基于元数据的过滤、相似性阈值和 top-k 结果。

```java
DocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
    .vectorStore(vectorStore)
    .similarityThreshold(0.73)
    .topK(5)
    .filterExpression(new FilterExpressionBuilder()
        .eq("genre", "fairytale")
        .build())
    .build();
List<Document> documents = retriever.retrieve(new Query("What is the main character of the story?"));
```

过滤表达式可以是静态的或动态的。对于动态过滤表达式，您可以传递 `Supplier`。

```java
DocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
    .vectorStore(vectorStore)
    .filterExpression(() -> new FilterExpressionBuilder()
        .eq("tenant", TenantContextHolder.getTenantIdentifier())
        .build())
    .build();
List<Document> documents = retriever.retrieve(new Query("What are the KPIs for the next semester?"));
```

您还可以通过 `Query` API 提供特定于请求的过滤表达式，使用 `FILTER_EXPRESSION` 参数。
如果同时提供了特定于请求和特定于检索器的过滤表达式，则特定于请求的过滤表达式优先。

```java
Query query = Query.builder()
    .text("Who is Anacletus?")
    .context(Map.of(VectorStoreDocumentRetriever.FILTER_EXPRESSION, "location == 'Whispering Woods'"))
    .build();
List<Document> retrievedDocuments = documentRetriever.retrieve(query);
```

#### Document Join

用于将基于多个查询和来自多个数据源检索到的文档组合成单个文档集合的组件。作为连接过程的一部分，它还可以处理重复文档和互惠排名策略。

##### ConcatenationDocumentJoiner

`ConcatenationDocumentJoiner` 通过将基于多个查询和来自多个数据源检索到的文档连接成单个文档集合来组合它们。在重复文档的情况下，保留第一次出现。每个文档的分数保持不变。

```java
Map<Query, List<List<Document>>> documentsForQuery = ...
DocumentJoiner documentJoiner = new ConcatenationDocumentJoiner();
List<Document> documents = documentJoiner.join(documentsForQuery);
```

### Post-Retrieval

Post-Retrieval 模块负责处理检索到的文档以获得最佳的生成结果。

#### Document Post-Processing

用于基于查询对检索到的文档进行后处理的组件，解决诸如*中间丢失*、模型的上下文长度限制以及需要减少检索信息中的噪音和冗余等挑战。

例如，它可以根据文档与查询的相关性对文档进行排名，删除不相关或冗余的文档，或压缩每个文档的内容以减少噪音和冗余。

### Generation

Generation 模块负责基于用户查询和检索到的文档生成最终响应。

#### Query Augmentation

用于增强输入查询的组件，提供额外的数据，用于为大型语言模型提供必要的上下文以回答用户查询。

##### ContextualQueryAugmenter

`ContextualQueryAugmenter` 使用提供的文档内容中的上下文数据增强用户查询。

```java
QueryAugmenter queryAugmenter = ContextualQueryAugmenter.builder().build();
```

默认情况下，`ContextualQueryAugmenter` 不允许检索到的上下文为空。当发生这种情况时，它会指示模型不要回答用户查询。

您可以启用 `allowEmptyContext` 选项，以允许模型在检索到的上下文为空时生成响应。

```java
QueryAugmenter queryAugmenter = ContextualQueryAugmenter.builder()
        .allowEmptyContext(true)
        .build();
```

此组件使用的提示可以通过 builder 中可用的 `promptTemplate()` 和 `emptyContextPromptTemplate()` 方法进行自定义。
