# Neo4j

本节将指导您设置 `Neo4jVectorStore` 来存储文档嵌入并执行相似性搜索。

[Neo4j](https://neo4j.com) 是一个开源 NoSQL 图数据库。
它是一个完全事务性的数据库（ACID），以图的形式存储数据，由节点组成，通过关系连接。
受现实世界结构的启发，它允许在复杂数据上实现高查询性能，同时对开发人员来说保持直观和简单。

[Neo4j's Vector Search](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/) 允许用户从大型数据集中查询向量嵌入。
嵌入是数据对象的数值表示，例如文本、图像、音频或文档。
嵌入可以存储在 _Node_ 属性上，可以使用 `db.index.vector.queryNodes()` 函数进行查询。
这些索引由 Lucene 提供支持，使用分层可导航小世界图（HNSW）对向量字段执行 k 近似最近邻（k-ANN）查询。

## Prerequisites

* 正在运行的 Neo4j (5.15+) 实例。以下选项可用：
** [Docker](https://hub.docker.com/_/neo4j) 镜像
** [Neo4j Desktop](https://neo4j.com/download/)
** [Neo4j Aura](https://neo4j.com/cloud/aura-free/)
** [Neo4j Server](https://neo4j.com/deployment-center/) 实例
* 如果需要，为 [EmbeddingModel](../embeddings#available-implementations) 提供一个 API key，用于生成 `Neo4jVectorStore` 存储的嵌入。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Neo4j Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-neo4j</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-neo4j'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

请查看 [Configuration Properties](#neo4jvector-properties) 列表以了解向量存储的默认值和配置选项。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](../embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `Neo4jVectorStore` 作为向量存储。

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Neo4j
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#neo4jvector-properties}

要连接到 Neo4j 并使用 `Neo4jVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  neo4j:
    uri: <neo4j instance URI>
    authentication:
      username: <neo4j username>
      password: <neo4j password>
  ai:
    vectorstore:
      neo4j:
        initialize-schema: true
        database-name: neo4j
        index-name: custom-index
        embedding-dimension: 1536
        distance-type: cosine
```

以 `spring.neo4j.*` 开头的 Spring Boot 属性用于配置 Neo4j 客户端：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.neo4j.uri` | 连接到 Neo4j 实例的 URI | `neo4j://localhost:7687` |
| `spring.neo4j.authentication.username` | 用于 Neo4j 身份验证的用户名 | `neo4j` |
| `spring.neo4j.authentication.password` | 用于 Neo4j 身份验证的密码 | - |

以 `spring.ai.vectorstore.neo4j.*` 开头的属性用于配置 `Neo4jVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.neo4j.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.neo4j.database-name` | 要使用的 Neo4j 数据库名称 | `neo4j` |
| `spring.ai.vectorstore.neo4j.index-name` | 存储向量的索引名称 | `spring-ai-document-index` |
| `spring.ai.vectorstore.neo4j.embedding-dimension` | 向量中的维度数 | `1536` |
| `spring.ai.vectorstore.neo4j.distance-type` | 要使用的距离函数 | `cosine` |
| `spring.ai.vectorstore.neo4j.label` | 用于文档节点的标签 | `Document` |
| `spring.ai.vectorstore.neo4j.embedding-property` | 用于存储嵌入的属性名称 | `embedding` |

以下距离函数可用：

* `cosine` - 默认值，适用于大多数用例。测量向量之间的余弦相似度。
* `euclidean` - 向量之间的欧几里得距离。较低的值表示更高的相似度。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Neo4j 向量存储。为此，您需要将 `spring-ai-neo4j-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-neo4j-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-neo4j-store'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

创建 Neo4j `Driver` bean。
阅读 [Neo4j Documentation](https://neo4j.com/docs/java-manual/current/client-applications/) 以获取有关自定义驱动程序配置的更多深入信息。

```java
@Bean
public Driver driver() {
    return GraphDatabase.driver("neo4j://<host>:<bolt-port>",
            AuthTokens.basic("<username>", "<password>"));
}
```

然后使用构建器模式创建 `Neo4jVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(Driver driver, EmbeddingModel embeddingModel) {
    return Neo4jVectorStore.builder(driver, embeddingModel)
        .databaseName("neo4j")                // 可选：默认为 "neo4j"
        .distanceType(Neo4jDistanceType.COSINE) // 可选：默认为 COSINE
        .embeddingDimension(1536)                      // 可选：默认为 1536
        .label("Document")                     // 可选：默认为 "Document"
        .embeddingProperty("embedding")        // 可选：默认为 "embedding"
        .indexName("custom-index")             // 可选：默认为 "spring-ai-document-index"
        .initializeSchema(true)                // 可选：默认为 false
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

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Neo4j 存储一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.builder()
        .query("The World")
        .topK(TOP_K)
        .similarityThreshold(SIMILARITY_THRESHOLD)
        .filterExpression("author in ['john', 'jill'] && 'article_type' == 'blog'").build());
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

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Neo4j `WHERE` [过滤器表达式](https://neo4j.com/developer/cypher/filtering-query-results/)。

例如，这个可移植的过滤器表达式：

```sql
author in ['john', 'jill'] && 'article_type' == 'blog'
```

转换为专有的 Neo4j 过滤器格式：

```
node.`metadata.author` IN ["john","jill"] AND node.`metadata.'article_type'` = "blog"
```

## Accessing the Native Client

Neo4j Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Neo4j 客户端（`Driver`）的访问：

```java
Neo4jVectorStore vectorStore = context.getBean(Neo4jVectorStore.class);
Optional<Driver> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    Driver driver = nativeClient.get();
    // 使用原生客户端进行 Neo4j 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Neo4j 特定功能和操作。

