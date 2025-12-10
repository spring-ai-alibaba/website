# MariaDB Vector Store

本节将指导您设置 `MariaDBVectorStore` 来存储文档嵌入并执行相似性搜索。

[MariaDB Vector](https://mariadb.org/projects/mariadb-vector/) 是 MariaDB 11.7 的一部分，支持存储和搜索机器学习生成的嵌入。
它使用向量索引提供高效的向量相似性搜索功能，支持余弦相似性和欧几里得距离度量。

## Prerequisites

* 正在运行的 MariaDB (11.7+) 实例。以下选项可用：
** [Docker](https://hub.docker.com/_/mariadb) 镜像
** [MariaDB Server](https://mariadb.org/download/)
** [MariaDB SkySQL](https://mariadb.com/products/skysql/)
* 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `MariaDBVectorStore` 存储的嵌入。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 MariaDB Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-mariadb</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-mariadb'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

此外，您需要一个配置的 `EmbeddingModel` bean。
请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

例如，要使用 [OpenAI EmbeddingModel](api/embeddings/openai-embeddings)，请添加以下依赖项：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

现在您可以在应用程序中自动装配 `MariaDBVectorStore`：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 MariaDB
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#mariadbvector-properties}

要连接到 MariaDB 并使用 `MariaDBVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  datasource:
    url: jdbc:mariadb://localhost/db
    username: myUser
    password: myPassword
  ai:
    vectorstore:
      mariadb:
        initialize-schema: true
        distance-type: COSINE
        dimensions: 1536
```

> **提示：** 如果您通过 [Docker Compose](https://docs.spring.io/spring-boot/reference/features/dev-services.html#features.dev-services.docker-compose) 或 [Testcontainers](https://docs.spring.io/spring-boot/reference/features/dev-services.html#features.dev-services.testcontainers) 将 MariaDB Vector 作为 Spring Boot dev service 运行，则无需配置 URL、用户名和密码，因为它们由 Spring Boot 自动配置。

以 `spring.ai.vectorstore.mariadb.*` 开头的属性用于配置 `MariaDBVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.mariadb.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.mariadb.distance-type` | 搜索距离类型。使用 `COSINE`（默认）或 `EUCLIDEAN`。如果向量归一化到长度 1，您可以使用 `EUCLIDEAN` 以获得最佳性能。 | `COSINE` |
| `spring.ai.vectorstore.mariadb.dimensions` | 嵌入维度。如果未明确指定，将从提供的 `EmbeddingModel` 检索维度。 | `1536` |
| `spring.ai.vectorstore.mariadb.remove-existing-vector-store-table` | 在启动时删除现有的向量存储表。 | `false` |
| `spring.ai.vectorstore.mariadb.schema-name` | 向量存储 schema 名称 | `null` |
| `spring.ai.vectorstore.mariadb.table-name` | 向量存储表名称 | `vector_store` |
| `spring.ai.vectorstore.mariadb.schema-validation` | 启用 schema 和表名验证，以确保它们是有效且存在的对象。 | `false` |

> **提示：** 如果您配置自定义 schema 和/或表名，请考虑通过设置 `spring.ai.vectorstore.mariadb.schema-validation=true` 来启用 schema 验证。
> 这确保了名称的正确性，并降低了 SQL 注入攻击的风险。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 MariaDB 向量存储。
为此，您需要将以下依赖项添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>

<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mariadb-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

然后使用构建器模式创建 `MariaDBVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
    return MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)                      // 可选：默认为 1536
        .distanceType(MariaDBDistanceType.COSINE) // 可选：默认为 COSINE
        .schemaName("mydb")                    // 可选：默认为 null
        .vectorTableName("custom_vectors")     // 可选：默认为 "vector_store"
        .contentFieldName("text")             // 可选：默认为 "content"
        .embeddingFieldName("embedding")      // 可选：默认为 "embedding"
        .idFieldName("doc_id")                // 可选：默认为 "id"
        .metadataFieldName("meta")           // 可选：默认为 "metadata"
        .initializeSchema(true)               // 可选：默认为 false
        .schemaValidation(true)              // 可选：默认为 false
        .removeExistingVectorStoreTable(false) // 可选：默认为 false
        .maxDocumentBatchSize(10000)         // 可选：默认为 10000
        .build();
}

// 这可以是任何 EmbeddingModel 实现
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](api/vectordbs#metadata-filters) 与 MariaDB Vector 存储一起使用。

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

> **注意：** 这些过滤器表达式会自动转换为等效的 MariaDB JSON 路径表达式。

## Similarity Scores

MariaDB Vector Store 自动计算从相似性搜索返回的文档的相似性分数。
这些分数提供了每个文档与您的搜索查询匹配程度的标准化度量。

### Score Calculation

相似性分数使用公式 `score = 1.0 - distance` 计算，其中：

* Score：`0.0` 和 `1.0` 之间的值，其中 `1.0` 表示完全相似，`0.0` 表示不相似
* Distance：使用配置的距离类型（`COSINE` 或 `EUCLIDEAN`）计算的原始距离值

这意味着距离较小（更相似）的文档将具有更高的分数，使结果更直观易懂。

### Accessing Scores

您可以通过 `getScore()` 方法访问每个文档的相似性分数：

```java
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.builder()
        .query("Spring AI")
        .topK(5)
        .build());

for (Document doc : results) {
    double score = doc.getScore();  // 0.0 和 1.0 之间的值
    System.out.println("Document: " + doc.getText());
    System.out.println("Similarity Score: " + score);
}
```

### Search Results Ordering

搜索结果按相似性分数降序自动排序（最高分数在前）。
这确保了最相关的文档出现在结果的顶部。

### Distance Metadata

除了相似性分数外，原始距离值仍然在文档元数据中可用：

```java
for (Document doc : results) {
    double score = doc.getScore();
    float distance = (Float) doc.getMetadata().get("distance");

    System.out.println("Score: " + score + ", Distance: " + distance);
}
```

### Similarity Threshold

在搜索请求中使用相似性阈值时，将阈值指定为分数值（`0.0` 到 `1.0`）而不是距离：

```java
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.builder()
        .query("Spring AI")
        .topK(10)
        .similarityThreshold(0.8)  // 仅返回分数 >= 0.8 的文档
        .build());
```

这使得阈值值一致且直观 - 更高的值意味着更严格的搜索，只返回高度相似的文档。

## Accessing the Native Client

MariaDB Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 JDBC 客户端（`JdbcTemplate`）的访问：

```java
MariaDBVectorStore vectorStore = context.getBean(MariaDBVectorStore.class);
Optional<JdbcTemplate> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    JdbcTemplate jdbc = nativeClient.get();
    // 使用原生客户端进行 MariaDB 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 MariaDB 特定功能和操作。

