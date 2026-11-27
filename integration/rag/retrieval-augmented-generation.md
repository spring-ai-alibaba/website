---
title: RAG 检索组件与 Advisor
description: 了解 Spring AI 模块化检索组件、数据接入和 Spring AI Alibaba 的 RAG 编排入口。
---

# RAG 检索组件与 Advisor

检索增强生成（RAG）在回答问题时把知识源中的相关证据提供给模型。Spring AI 提供统一的 `Query`、`Document` 和模块化检索 API。Spring AI Alibaba 在此基础上提供 Graph 和 Agent 编排，以及百炼等知识源集成。

## 从知识源到回答

| 要解决的问题 | 接入方式 |
| --- | --- |
| 将应用文件建成可检索索引 | [ETL](etl-pipeline.md) 读取、解析和切分文档，通过[嵌入模型](embeddings.md)和 `VectorStore` 写入索引 |
| 查询现有知识库或搜索服务 | 用 `DocumentRetriever` 把搜索结果映射为 Spring AI `Document`。已有百炼知识库可使用[百炼检索器](bailian-knowledge.md) |
| 每次回答前固定检索 | 使用 [`QuestionAnswerAdvisor`](#questionansweradvisor) 或 [`RetrievalAugmentationAdvisor`](#retrievalaugmentationadvisor) |
| 按证据质量决定重查、生成或拒答 | 用 [Graph 混合 RAG](/docs/frameworks/graph-core/examples/rag-workflow) 编排检索和条件边 |
| 让 Agent 按任务选择搜索源或反复检索 | 将同一个检索器包装为 [Agent 工具](/docs/frameworks/agent-framework/advanced/rag#agentic-rag) |

自建索引时，上传文档和在线问答是两个独立流程。现有托管知识库由平台负责索引和召回，同一个检索器可以用于 Advisor、Graph 节点和 Agent 工具。运行时保留来源、文档 ID 或切片 ID，以便把生成结果追溯到原始证据。

[Spring AI RAG 参考](https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html) · [两步、Agentic 与混合 RAG](/docs/frameworks/agent-framework/advanced/rag)

## Advisors

Spring AI 使用 `Advisor` API 为常见的 RAG 流程提供开箱即用的支持。

要使用 `QuestionAnswerAdvisor` 或 `VectorStoreChatMemoryAdvisor`，您需要将 `spring-ai-vector-store-advisor` 依赖项添加到您的项目：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-vector-store-advisor</artifactId>
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

#### 自定义模板 {#custom-template}

`QuestionAnswerAdvisor` 使用默认模板来增强用户问题与检索到的文档。您可以通过 `.promptTemplate()` builder 方法提供自己的 `PromptTemplate` 对象来自定义此行为。

注意：这里提供的 `PromptTemplate` 自定义 advisor 如何将检索到的上下文与用户查询合并。这与在 `ChatClient` 本身上配置 `TemplateRenderer`（使用 `.templateRenderer()`）不同，后者影响 advisor 运行*之前*初始用户/系统提示内容的渲染。有关客户端级模板渲染的更多详细信息，请参阅 [ChatClient Prompt Templates](../chatclient#prompt-模板)。

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

Spring AI 包含一个 [RAG 模块库](#modules)，您可以使用它来构建自己的 RAG 流程。
`RetrievalAugmentationAdvisor` 是一个 `Advisor`，为最常见的 RAG 流程提供开箱即用的实现，基于模块化架构。

要使用 `RetrievalAugmentationAdvisor`，您需要将 `spring-ai-rag` 依赖项添加到您的项目：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-rag</artifactId>
</dependency>
```

Advisor 依次转换问题、扩展查询、检索、合并、后处理并注入上下文。可用 `.call().chatClientResponse().context().get(RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT)` 读取传给模型的文档。需要用户可见的引用时，在提示中提供可引用的 ID，并在响应后按实际命中校验。

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

有关更多信息，请参阅 [VectorStoreDocumentRetriever](#vectorstoredocumentretriever)。

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

## Spring AI 2.1 检索组件

- 如果业务需要对候选文档做注入筛查、相关性判断或质量重排，使用 [Decision Model 文档后处理](decision-post-processors.md)，把筛查和排序接在 `RetrievalAugmentationAdvisor` 的检索环节之后。
- 如果嵌入已由离线任务或外部服务生成，使用 [预计算向量写入与检索](vectordbs/precomputed-embeddings.md)。`VectorStoreDocumentRetriever` 默认按查询文本发起检索，需要复用查询向量时可实现 `DocumentRetriever` 并调用向量重载。
- 如果接入托管知识库，可使用 [百炼知识库](bailian-knowledge.md) 或 [Amazon Bedrock Knowledge Base](vectordbs/managed-vector-services.md#bedrock-knowledge-base)，由对应服务执行索引与检索。

### 在 RAG 请求中启用语义缓存

若配置 Redis `SemanticCacheAdvisor`，2.1 要求提供 `SemanticCacheScopeResolver`。自动配置只有在找到该解析器 Bean 时才会注册 Advisor。作用域应覆盖身份或租户、权限、系统提示和影响答案的知识库或检索配置。作用域为空时跳过缓存。有细粒度权限的请求可以绕过共享缓存，避免复用其他权限上下文的答案。参见 [Spring AI 2.1 升级说明](https://docs.spring.io/spring-ai/reference/upgrade-notes.html)。

## Extensions 的 HyDE 与 Elasticsearch 混合检索 {#extensions-hyde-hybrid-search}

在 [版本对照](/docs/versions) 对应的 Extensions BOM 下添加 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-rag`。Elasticsearch 存储与向量配置见 [Elasticsearch 接入](vectordbs/elasticsearch.md)。Extensions 2.0.3.0 的发布验证覆盖 Elasticsearch 9.4.9 检索。索引中的向量维度须与当前嵌入模型一致。

- **HyDE** 用 `HyDeTransformer` 生成与问题对应的假设文档，再由 `HyDeRetriever` 通过向量库召回。将元数据过滤作为 `HyDeRetriever.FILTER_EXPRESSION` 放到查询上下文。
- **混合检索** 用 `HybridElasticsearchRetriever` 组合 BM25 与 KNN，可通过构建器的 `useRrf(true)` 启用 RRF 融合排序。构造时使用已有索引对应的 `ElasticsearchVectorStoreOptions`、`ElasticsearchClient` 和 `EmbeddingModel`。在查询上下文使用 `HybridElasticsearchRetriever.FILTER_EXPRESSION`。两个检索器都可携带 64 位整型元数据过滤。

```java
import com.alibaba.cloud.ai.rag.preretrieval.transformation.HyDeTransformer;
import com.alibaba.cloud.ai.rag.retrieval.search.HyDeRetriever;
import org.springframework.ai.rag.Query;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;

var retriever = HyDeRetriever.builder()
    .hyDeTransformer(HyDeTransformer.builder().chatClientBuilder(chatClientBuilder).build())
    .vectorStore(elasticsearchVectorStore)
    .topK(5)
    .build();

var filter = new FilterExpressionBuilder().eq("revision", 2_147_483_648L).build();
var query = Query.builder()
    .text(question)
    .context(Map.of(HyDeRetriever.FILTER_EXPRESSION, filter))
    .build();
var documents = retriever.retrieve(query);
```

使用混合检索时，在同一个查询位置换用 `HybridElasticsearchRetriever.FILTER_EXPRESSION`。数值字段按索引实际映射传入，避免先把 long 值转换为 int。可把所选检索器交给 `RetrievalAugmentationAdvisor`。

[Extensions RAG 模块](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0/rag/spring-ai-alibaba-rag)

## 使用百炼托管知识库

已有百炼知识库时，可以直接通过 [DashScopeRagDocumentRetriever](bailian-knowledge.md) 接入 `RetrievalAugmentationAdvisor`，由业务空间 Knowledge API 完成检索。应用自行管理向量索引时，可按需使用 [预计算向量](vectordbs/precomputed-embeddings.md)。

## Modules

各模块可通过 Java API 单独调用，也可由 `RetrievalAugmentationAdvisor` 组合运行。

| 阶段 | 接口 | 常用实现与用途 |
| --- | --- | --- |
| 查询转换 | `QueryTransformer` | 压缩对话、改写问题、翻译检索词 |
| 扩展查询 | `QueryExpander` | `MultiQueryExpander` 产生多个查询，扩大覆盖范围 |
| 检索 | `DocumentRetriever` | `VectorStoreDocumentRetriever`、百炼检索器，也可包装搜索或数据库查询 |
| 合并 | `DocumentJoiner` | `ConcatenationDocumentJoiner` 按文档 ID 去重并按分数排序 |
| 文档后处理 | `DocumentPostProcessor` | [Decision Model](decision-post-processors.md) 过滤、评分或重排，也可压缩上下文 |
| 查询增强 | `QueryAugmenter` | `ContextualQueryAugmenter` 生成模型所需的上下文 |

不同来源的分数尺度可能不同。跨源合并时可按排名融合或统一重排，给各来源保留可区分的文档 ID，便于去重和引用。

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

多租户应用应由服务端将授权条件与业务条件组合，再放入请求上下文。Advisor 可以在线程池中运行检索。应用如果使用线程本地上下文读取身份，应确认执行器能传播该上下文，或直接传入根据授权生成的过滤表达式。

```java
Query query = Query.builder()
    .text("Who is Anacletus?")
    .context(Map.of(VectorStoreDocumentRetriever.FILTER_EXPRESSION, "location == 'Whispering Woods'"))
    .build();
List<Document> retrievedDocuments = retriever.retrieve(query);
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
