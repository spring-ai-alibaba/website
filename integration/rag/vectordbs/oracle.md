# Oracle Database 23ai - AI Vector Search

Oracle Database 23ai (23.4+) 的 [AI Vector Search](https://docs.oracle.com/en/database/oracle/oracle-database/23/vecse/overview-ai-vector-search.html) 功能可作为 Spring AI `VectorStore` 使用，帮助您存储文档嵌入并执行相似性搜索。当然，所有其他功能也可用。

> **提示：** 【Run Oracle Database 23ai locally,Run Oracle Database 23ai locally】 附录显示了如何使用轻量级 Docker 容器启动数据库。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

首先将 Oracle Vector Store boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-vector-store-oracle</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-oracle'
}
```

如果您需要此向量存储为您初始化 schema，则需要在适当的构造函数中为 `initializeSchema` 布尔参数传递 true，或在 `application.properties` 文件中设置 `...initialize-schema=true`。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

Vector Store 还需要一个 `EmbeddingModel` 实例来计算文档的嵌入。
您可以选择一个可用的 [EmbeddingModel 实现](embeddings#available-implementations)。

例如，要使用 [OpenAI EmbeddingModel](embeddings/openai-embeddings)，请将以下依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。
> 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

要连接和配置 `OracleVectorStore`，您需要提供数据库的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  datasource:
    url: jdbc:oracle:thin:@//localhost:1521/freepdb1
    username: mlops
    password: mlops
  ai:
	vectorstore:
	  oracle:
		index-type: IVF
		distance-type: COSINE
		dimensions: 1536
```

> **提示：** 查看 [configuration parameters](#oracle-properties) 列表以了解默认值和配置选项。

现在您可以在应用程序中自动装配 `OracleVectorStore` 并使用它：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Oracle Vector Store
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration properties {#oracle-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 `OracleVectorStore`。

| Property| Description | Default value |
|---------|-------------|---------------|
| `spring.ai.vectorstore.oracle.index-type` | 最近邻搜索索引类型。选项有 `NONE` - 精确最近邻搜索，`IVF` - 倒排平面文件索引。它的构建时间更快，使用的内存比 HNSW 少，但查询性能较低（在速度-召回权衡方面）。`HNSW` - 创建多层图。它的构建时间比 IVF 慢，使用的内存比 IVF 多，但查询性能更好（在速度-召回权衡方面）。 | NONE |
| `spring.ai.vectorstore.oracle.distance-type` | 搜索距离类型，包括 `COSINE`（默认）、`DOT`、`EUCLIDEAN`、`EUCLIDEAN_SQUARED` 和 `MANHATTAN`。<br/><br/>注意：如果向量已归一化，您可以使用 `DOT` 或 `COSINE` 以获得最佳性能。 | COSINE |
| `spring.ai.vectorstore.oracle.forced-normalization` | 允许在插入和相似性搜索之前启用向量归一化（如果为 true）。<br/><br/>警告：将此设置为 true 是允许 [search request similarity threshold](vectordbs#api-overview) 的要求。<br/><br/>注意：如果向量已归一化，您可以使用 `DOT` 或 `COSINE` 以获得最佳性能。 | false |
| `spring.ai.vectorstore.oracle.dimensions` | 嵌入维度。如果未明确指定，OracleVectorStore 将允许最大值：65535。维度在表创建时设置到嵌入列。如果您更改维度，则必须重新创建表。 | 65535 |
| `spring.ai.vectorstore.oracle.remove-existing-vector-store-table` | 在启动时删除现有表。 | false |
| `spring.ai.vectorstore.oracle.initialize-schema` | 是否初始化所需的 schema。 | false |
| `spring.ai.vectorstore.oracle.search-accuracy` | 表示存在索引时请求的精度目标。默认禁用。您需要提供 [1,100] 范围内的整数来覆盖默认索引精度（95）。使用较低的精度提供近似相似性搜索，在速度与精度之间进行权衡。 | -1 (`DEFAULT_SEARCH_ACCURACY`) |

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 `OracleVectorStore` 一起使用。

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

> **注意：** 这些过滤器表达式被转换为等效的 `OracleVectorStore` 过滤器。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 `OracleVectorStore`。
为此，您需要将 Oracle JDBC 驱动程序和 `JdbcTemplate` auto-configuration 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>

<dependency>
	<groupId>com.oracle.database.jdbc</groupId>
	<artifactId>ojdbc11</artifactId>
	<scope>runtime</scope>
</dependency>

<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-oracle-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

要在应用程序中配置 `OracleVectorStore`，您可以使用以下设置：

```java
@Bean
public VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
    return OracleVectorStore.builder(jdbcTemplate, embeddingModel)
        .tableName("my_vectors")
        .indexType(OracleVectorStoreIndexType.IVF)
        .distanceType(OracleVectorStoreDistanceType.COSINE)
        .dimensions(1536)
        .searchAccuracy(95)
        .initializeSchema(true)
        .build();
}
```

## Run Oracle Database 23ai locally

```bash
docker run --rm --name oracle23ai -p 1521:1521 -e APP_USER=mlops -e APP_USER_PASSWORD=mlops -e ORACLE_PASSWORD=mlops gvenzl/oracle-free:23-slim
```

然后您可以使用以下方式连接到数据库：

```bash
sql mlops/mlops@localhost/freepdb1
```

## Accessing the Native Client

Oracle Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Oracle 客户端（`OracleConnection`）的访问：

```java
OracleVectorStore vectorStore = context.getBean(OracleVectorStore.class);
Optional<OracleConnection> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    OracleConnection connection = nativeClient.get();
    // 使用原生客户端进行 Oracle 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Oracle 特定功能和操作。

