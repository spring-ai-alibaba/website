# Pinecone

本节将指导您设置 Pinecone `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Pinecone](https://www.pinecone.io/) 是一个流行的基于云的向量数据库，允许您高效地存储和搜索向量。

## Prerequisites

1. Pinecone 账户：在开始之前，请注册一个 [Pinecone 账户](https://app.pinecone.io/)。
2. Pinecone 项目：注册后，生成 API key 并创建索引。您需要这些详细信息进行配置。
3. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
- 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `PineconeVectorStore` 存储的嵌入。

要设置 `PineconeVectorStore`，请从您的 Pinecone 账户收集以下详细信息：

* Pinecone API Key
* Pinecone Index Name
* Pinecone Namespace

> **注意：**
> 此信息在 Pinecone UI 门户中可用。
> Pinecone 免费版不支持 namespace。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Pinecone Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-pinecone</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-pinecone'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

以下是所需 bean 的示例：

```java
@Bean
public EmbeddingModel embeddingModel() {
    // 可以是任何其他 EmbeddingModel 实现。
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

要连接到 Pinecone，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 _application.properties_ 提供简单配置：

```properties
spring.ai.vectorstore.pinecone.apiKey=<your api key>
spring.ai.vectorstore.pinecone.index-name=<your index name>

# 如果需要 API key，例如 OpenAI
spring.ai.openai.api.key=<api-key>
```

请查看 [configuration parameters](#_configuration_properties) 列表以了解向量存储的默认值和配置选项。

现在您可以在应用程序中自动装配 Pinecone Vector Store 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 添加文档
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

### Configuration properties

您可以在 Spring Boot 配置中使用以下属性来自定义 Pinecone 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.pinecone.api-key` | Pinecone API Key | - |
| `spring.ai.vectorstore.pinecone.index-name` | Pinecone index name | - |
| `spring.ai.vectorstore.pinecone.namespace` | Pinecone namespace | - |
| `spring.ai.vectorstore.pinecone.content-field-name` | 用于存储原始文本内容的 Pinecone 元数据字段名称。 | `document_content` |
| `spring.ai.vectorstore.pinecone.distance-metadata-field-name` | 用于存储计算距离的 Pinecone 元数据字段名称。 | `distance` |
| `spring.ai.vectorstore.pinecone.server-side-timeout` |  | 20 sec. |

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Pinecone 存储一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.builder()
    .query("The World")
    .topK(TOP_K)
    .similarityThreshold(SIMILARITY_THRESHOLD)
    .filterExpression("author in ['john', 'jill'] && article_type == 'blog'").build());
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.builder()
    .query("The World")
    .topK(TOP_K)
    .similarityThreshold(SIMILARITY_THRESHOLD)
    .filterExpression(b.and(
        b.in("author","john", "jill"),
        b.eq("article_type", "blog")).build()).build());
```

> **注意：** 这些过滤器表达式被转换为等效的 Pinecone 过滤器。

## Manual Configuration

如果您更喜欢手动配置 `PineconeVectorStore`，可以使用 `PineconeVectorStore#Builder`。

将这些依赖项添加到您的项目：

* OpenAI：计算嵌入所需。

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

* Pinecone

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pinecone-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Sample Code

要在应用程序中配置 Pinecone，您可以使用以下设置：

```java
@Bean
public VectorStore pineconeVectorStore(EmbeddingModel embeddingModel) {
    return PineconeVectorStore.builder(embeddingModel)
            .apiKey(PINECONE_API_KEY)
            .indexName(PINECONE_INDEX_NAME)
            .namespace(PINECONE_NAMESPACE) // 免费版不支持 namespace。
            .contentFieldName(CUSTOM_CONTENT_FIELD_NAME) // 可选字段，用于存储原始内容。默认为 `document_content`
            .build();
}
```

在您的主代码中，创建一些文档：

```java
List<Document> documents = List.of(
	new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
	new Document("The World is Big and Salvation Lurks Around the Corner"),
	new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));
```

将文档添加到 Pinecone：

```java
vectorStore.add(documents);
```

最后，检索与查询相似的文档：

```java
List<Document> results = vectorStore.similaritySearch(SearchRequest.query("Spring").topK(5).build());
```

如果一切顺利，您应该检索到包含文本 "Spring AI rocks!!" 的文档。

## Accessing the Native Client

Pinecone Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Pinecone 客户端（`PineconeConnection`）的访问：

```java
PineconeVectorStore vectorStore = context.getBean(PineconeVectorStore.class);
Optional<PineconeConnection> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    PineconeConnection client = nativeClient.get();
    // 使用原生客户端进行 Pinecone 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Pinecone 特定功能和操作。

