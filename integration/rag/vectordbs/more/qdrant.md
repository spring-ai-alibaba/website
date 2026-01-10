# Qdrant

本节将指导您设置 Qdrant `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Qdrant](https://www.qdrant.tech/) 是一个开源的高性能向量搜索引擎/数据库。它使用 HNSW（Hierarchical Navigable Small World）算法进行高效的 k-NN 搜索操作，并为基于元数据的查询提供高级过滤功能。

## Prerequisites

* Qdrant 实例：按照 Qdrant 文档中的[安装说明](https://qdrant.tech/documentation/guides/installation/)设置 Qdrant 实例。
* 如果需要，为 [EmbeddingModel](embeddings#available-implementations) 提供一个 API key，用于生成 `QdrantVectorStore` 存储的嵌入。

> **注意：** 建议提前使用适当的维度和配置[创建](https://qdrant.tech/documentation/concepts/collections/#create-a-collection) Qdrant collection。
> 如果未创建 collection，`QdrantVectorStore` 将尝试使用 `Cosine` 相似性和配置的 `EmbeddingModel` 的维度创建一个。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Qdrant Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-qdrant</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-qdrant'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

请查看 [configuration parameters](#qdrant-vectorstore-properties) 列表以了解向量存储的默认值和配置选项。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在构建器中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `QdrantVectorStore` 作为向量存储。

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Qdrant
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#qdrant-vectorstore-properties}

要连接到 Qdrant 并使用 `QdrantVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    vectorstore:
      qdrant:
        host: <qdrant host>
        port: <qdrant grpc port>
        api-key: <qdrant api key>
        collection-name: <collection name>
        use-tls: false
        initialize-schema: true
```

以 `spring.ai.vectorstore.qdrant.*` 开头的属性用于配置 `QdrantVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.qdrant.host` | Qdrant 服务器的主机 | `localhost` |
| `spring.ai.vectorstore.qdrant.port` | Qdrant 服务器的 gRPC 端口 | `6334` |
| `spring.ai.vectorstore.qdrant.api-key` | 用于身份验证的 API key | - |
| `spring.ai.vectorstore.qdrant.collection-name` | 要使用的 collection 名称 | `vector_store` |
| `spring.ai.vectorstore.qdrant.use-tls` | 是否使用 TLS(HTTPS) | `false` |
| `spring.ai.vectorstore.qdrant.initialize-schema` | 是否初始化 schema | `false` |

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Qdrant 向量存储。为此，您需要将 `spring-ai-qdrant-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-qdrant-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-qdrant-store'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

创建 Qdrant 客户端 bean：

```java
@Bean
public QdrantClient qdrantClient() {
    QdrantGrpcClient.Builder grpcClientBuilder =
        QdrantGrpcClient.newBuilder(
            "<QDRANT_HOSTNAME>",
            <QDRANT_GRPC_PORT>,
            <IS_TLS>);
    grpcClientBuilder.withApiKey("<QDRANT_API_KEY>");

    return new QdrantClient(grpcClientBuilder.build());
}
```

然后使用构建器模式创建 `QdrantVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(QdrantClient qdrantClient, EmbeddingModel embeddingModel) {
    return QdrantVectorStore.builder(qdrantClient, embeddingModel)
        .collectionName("custom-collection")     // 可选：默认为 "vector_store"
        .initializeSchema(true)                  // 可选：默认为 false
        .batchingStrategy(new TokenCountBatchingStrategy()) // 可选：默认为 TokenCountBatchingStrategy
        .build();
}

// 这可以是任何 EmbeddingModel 实现
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#metadata-filters) 与 Qdrant 存储一起使用。

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
        b.in("author", "john", "jill"),
        b.eq("article_type", "blog")).build()).build());
```

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Qdrant [过滤器表达式](https://qdrant.tech/documentation/concepts/filtering/)。

## Accessing the Native Client

Qdrant Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Qdrant 客户端（`QdrantClient`）的访问：

```java
QdrantVectorStore vectorStore = context.getBean(QdrantVectorStore.class);
Optional<QdrantClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    QdrantClient client = nativeClient.get();
    // 使用原生客户端进行 Qdrant 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Qdrant 特定功能和操作。

