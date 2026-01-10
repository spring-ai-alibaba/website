# Azure AI Service

本节将指导您设置 `AzureVectorStore` 来使用 Azure AI Search Service 存储文档嵌入并执行相似性搜索。

[Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search/) 是一个多功能云托管云信息检索系统，是 Microsoft 更大的 AI 平台的一部分。除其他功能外，它允许用户使用基于向量的存储和检索来查询信息。

## Prerequisites

1. Azure Subscription：您需要一个 [Azure subscription](https://azure.microsoft.com/en-us/free/) 才能使用任何 Azure 服务。
2. Azure AI Search Service：创建一个 [AI Search service](https://portal.azure.com/#create/Microsoft.Search)。创建服务后，从 `Settings` 下的 `Keys` 部分获取管理员 apiKey，并从 `Overview` 部分下的 `Url` 字段检索端点。
3. （可选）Azure OpenAI Service：创建一个 Azure [OpenAI service](https://portal.azure.com/#create/Microsoft.AIServicesOpenAI)。**注意：** 您可能需要填写单独的表格才能访问 Azure Open AI 服务。创建服务后，从 `Resource Management` 下的 `Keys and Endpoint` 部分获取端点和 apiKey。

## Configuration

在启动时，如果您通过在构造函数中将相关的 `initialize-schema` `boolean` 属性设置为 `true` 或在 Spring Boot 中在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入，`AzureVectorStore` 可以尝试在您的 AI Search 服务实例中创建新索引。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

或者，您可以手动创建索引。

要设置 AzureVectorStore，您需要从上述先决条件中检索的设置以及您的索引名称：

* Azure AI Search Endpoint
* Azure AI Search Key
* （可选）Azure OpenAI API Endpoint
* （可选）Azure OpenAI API Key

您可以将这些值作为 OS 环境变量提供。

```bash
export AZURE_AI_SEARCH_API_KEY=<My AI Search API Key>
export AZURE_AI_SEARCH_ENDPOINT=<My AI Search Index>
export OPENAI_API_KEY=<My Azure AI API Key> (Optional)
```

> **注意：**
> 您可以用任何支持 Embeddings 接口的有效 OpenAI 实现替换 Azure Open AI 实现。例如，您可以使用 Spring AI 的 Open AI 或 `TransformersEmbedding` 实现来进行嵌入，而不是 Azure 实现。

## Dependencies

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

将这些依赖项添加到您的项目：

### 1. Select an Embeddings interface implementation. You can choose between:

**OpenAI Embedding:**

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

**Azure AI Embedding:**

```xml
<dependency>
 <groupId>org.springframework.ai</groupId>
 <artifactId>spring-ai-starter-model-azure-openai</artifactId>
</dependency>
```

**Local Sentence Transformers Embedding:**

```xml
<dependency>
 <groupId>org.springframework.ai</groupId>
 <artifactId>spring-ai-starter-model-transformers</artifactId>
</dependency>
```

### 2. Azure (AI Search) Vector Store

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-azure-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

## Configuration Properties

您可以在 Spring Boot 配置中使用以下属性来自定义 Azure 向量存储。

| Property | Default value |
|----------|---------------|
| `spring.ai.vectorstore.azure.url` | |
| `spring.ai.vectorstore.azure.api-key` | |
| `spring.ai.vectorstore.azure.useKeylessAuth` | false |
| `spring.ai.vectorstore.azure.initialize-schema` | false |
| `spring.ai.vectorstore.azure.index-name` | spring_ai_azure_vector_store |
| `spring.ai.vectorstore.azure.default-top-k` | 4 |
| `spring.ai.vectorstore.azure.default-similarity-threshold` | 0.0 |
| `spring.ai.vectorstore.azure.embedding-property` | embedding |
| `spring.ai.vectorstore.azure.index-name` | spring-ai-document-index |

## Sample Code

要在应用程序中配置 Azure `SearchIndexClient`，您可以使用以下代码：

```java
@Bean
public SearchIndexClient searchIndexClient() {
  return new SearchIndexClientBuilder().endpoint(System.getenv("AZURE_AI_SEARCH_ENDPOINT"))
    .credential(new AzureKeyCredential(System.getenv("AZURE_AI_SEARCH_API_KEY")))
    .buildClient();
}
```

要创建向量存储，您可以通过注入上面示例中创建的 `SearchIndexClient` bean 以及由 Spring AI 库提供的实现所需 Embeddings 接口的 `EmbeddingModel` 来使用以下代码。

```java
@Bean
public VectorStore vectorStore(SearchIndexClient searchIndexClient, EmbeddingModel embeddingModel) {

  return AzureVectorStore.builder(searchIndexClient, embeddingModel)
    .initializeSchema(true)
    // 定义要在相似性搜索过滤器中使用的元数据字段。
    .filterMetadataFields(List.of(MetadataField.text("country"), MetadataField.int64("year"),
            MetadataField.date("activationDate")))
    .defaultTopK(5)
    .defaultSimilarityThreshold(0.7)
    .indexName("spring-ai-document-index")
    .build();
}
```

> **注意：**
> 您必须明确列出过滤器表达式中使用的任何元数据键的所有元数据字段名称和类型。上面的列表注册了可过滤的元数据字段：类型为 `TEXT` 的 `country`、类型为 `INT64` 的 `year` 和类型为 `BOOLEAN` 的 `active`。
>
> 如果可过滤的元数据字段扩展了新条目，您必须（重新）上传/更新具有此元数据的文档。

在您的主代码中，创建一些文档：

```java
List<Document> documents = List.of(
	new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("country", "BG", "year", 2020)),
	new Document("The World is Big and Salvation Lurks Around the Corner"),
	new Document("You walk forward facing the past and you turn back toward the future.", Map.of("country", "NL", "year", 2023)));
```

将文档添加到您的向量存储：

```java
vectorStore.add(documents);
```

最后，检索与查询相似的文档：

```java
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.builder()
      .query("Spring")
      .topK(5).build());
```

如果一切顺利，您应该检索到包含文本 "Spring AI rocks!!" 的文档。

### Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 AzureVectorStore 一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
   SearchRequest.builder()
      .query("The World")
      .topK(TOP_K)
      .similarityThreshold(SIMILARITY_THRESHOLD)
      .filterExpression("country in ['UK', 'NL'] && year >= 2020").build());
```

或使用表达式 DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(
    SearchRequest.builder()
      .query("The World")
      .topK(TOP_K)
      .similarityThreshold(SIMILARITY_THRESHOLD)
      .filterExpression(b.and(
         b.in("country", "UK", "NL"),
         b.gte("year", 2020)).build()).build());
```

可移植的过滤器表达式会自动转换为专有的 Azure Search [OData filters](https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter)。例如，以下可移植的过滤器表达式：

```sql
country in ['UK', 'NL'] && year >= 2020
```

转换为以下 Azure OData [filter expression](https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter)：

```graphql
$filter search.in(meta_country, 'UK,NL', ',') and meta_year ge 2020
```

## Accessing the Native Client

Azure Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Azure Search 客户端（`SearchClient`）的访问：

```java
AzureVectorStore vectorStore = context.getBean(AzureVectorStore.class);
Optional<SearchClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    SearchClient client = nativeClient.get();
    // 使用原生客户端进行 Azure Search 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Azure Search 特定功能和操作。

