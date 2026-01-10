# PGvector

本节将指导您设置 PGvector `VectorStore` 来存储文档嵌入并执行相似性搜索。

[PGvector](https://github.com/pgvector/pgvector) 是 PostgreSQL 的开源扩展，支持存储和搜索机器学习生成的嵌入。它提供不同的功能，让用户识别精确和近似的最近邻。它设计为与其他 PostgreSQL 功能（包括索引和查询）无缝协作。

## Prerequisites

首先，您需要访问启用了 `vector`、`hstore` 和 `uuid-ossp` 扩展的 PostgreSQL 实例。

> **提示：** 您可以通过 [Docker Compose](docker-compose) 或 [Testcontainers](testcontainers) 将 PGvector 数据库作为 Spring Boot dev service 运行。或者，【Run Postgres & PGVector DB locally,setup local Postgres/PGVector】 附录显示了如何使用 Docker 容器在本地设置数据库。

在启动时，如果明确启用了 schema 初始化功能，`PgVectorStore` 将尝试安装所需的数据库扩展，并在不存在时创建所需的带索引的 `vector_store` 表。

或者，您可以手动执行此操作：


```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS vector_store (
	id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
	content text,
	metadata json,
	embedding vector(1536) // 1536 是默认的嵌入维度
);

CREATE INDEX ON vector_store USING HNSW (embedding vector_cosine_ops);
```

> **提示：** 如果您使用不同的维度，请将 `1536` 替换为实际的嵌入维度。PGvector 对 HNSW 索引最多支持 2000 个维度。

接下来，如果需要，为 [EmbeddingModel](embeddings#available-implementations) 提供一个 API key，用于生成 `PgVectorStore` 存储的嵌入。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 PgVectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-vector-store-pgvector</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-pgvector'
}
```

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

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

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。
> 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

要连接和配置 `PgVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/postgres
    username: postgres
    password: postgres
  ai:
	vectorstore:
	  pgvector:
		index-type: HNSW
		distance-type: COSINE_DISTANCE
		dimensions: 1536
		max-document-batch-size: 10000 # 可选：每批文档的最大数量
```

> **提示：** 如果您通过 [Docker Compose](https://docs.spring.io/spring-boot/reference/features/dev-services.html#features.dev-services.docker-compose) 或 [Testcontainers](https://docs.spring.io/spring-boot/reference/features/dev-services.html#features.dev-services.testcontainers) 将 PGvector 作为 Spring Boot dev service 运行，则无需配置 URL、用户名和密码，因为它们由 Spring Boot 自动配置。

> **提示：** 查看 [configuration parameters](#pgvector-properties) 列表以了解默认值和配置选项。

现在您可以在应用程序中自动装配 `VectorStore` 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 PGVector
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration properties {#pgvector-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 PGVector 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.pgvector.index-type` | 最近邻搜索索引类型。选项有 `NONE` - 精确最近邻搜索，`IVFFlat` - 索引将向量划分为列表，然后搜索最接近查询向量的那些列表的子集。它的构建时间更快，使用的内存比 HNSW 少，但查询性能较低（在速度-召回权衡方面）。`HNSW` - 创建多层图。它的构建时间比 IVFFlat 慢，使用的内存比 IVFFlat 多，但查询性能更好（在速度-召回权衡方面）。没有像 IVFFlat 那样的训练步骤，因此可以在表中没有任何数据的情况下创建索引。 | HNSW |
| `spring.ai.vectorstore.pgvector.distance-type` | 搜索距离类型。默认为 `COSINE_DISTANCE`。但如果向量归一化到长度 1，您可以使用 `EUCLIDEAN_DISTANCE` 或 `NEGATIVE_INNER_PRODUCT` 以获得最佳性能。 | COSINE_DISTANCE |
| `spring.ai.vectorstore.pgvector.dimensions` | 嵌入维度。如果未明确指定，PgVectorStore 将从提供的 `EmbeddingModel` 检索维度。维度在表创建时设置到嵌入列。如果您更改维度，则必须重新创建 vector_store 表。 | - |
| `spring.ai.vectorstore.pgvector.remove-existing-vector-store-table` | 在启动时删除现有的 `vector_store` 表。 | false |
| `spring.ai.vectorstore.pgvector.initialize-schema` | 是否初始化所需的 schema | false |
| `spring.ai.vectorstore.pgvector.schema-name` | 向量存储 schema 名称 | `public` |
| `spring.ai.vectorstore.pgvector.table-name` | 向量存储表名称 | `vector_store` |
| `spring.ai.vectorstore.pgvector.schema-validation` | 启用 schema 和表名验证，以确保它们是有效且存在的对象。 | false |
| `spring.ai.vectorstore.pgvector.max-document-batch-size` | 单批处理的最大文档数。 | 10000 |

> **提示：** 如果您配置自定义 schema 和/或表名，请考虑通过设置 `spring.ai.vectorstore.pgvector.schema-validation=true` 来启用 schema 验证。
> 这确保了名称的正确性，并降低了 SQL 注入攻击的风险。

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#_metadata_filters) 与 PgVector 存储一起使用。

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

> **注意：** 这些过滤器表达式被转换为 PostgreSQL JSON 路径表达式，以实现高效的元数据过滤。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 `PgVectorStore`。
为此，您需要将 PostgreSQL 连接和 `JdbcTemplate` auto-configuration 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>

<dependency>
	<groupId>org.postgresql</groupId>
	<artifactId>postgresql</artifactId>
	<scope>runtime</scope>
</dependency>

<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-pgvector-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

要在应用程序中配置 PgVector，您可以使用以下设置：

```java
@Bean
public VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
    return PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)                    // 可选：默认为模型维度或 1536
        .distanceType(COSINE_DISTANCE)       // 可选：默认为 COSINE_DISTANCE
        .indexType(HNSW)                     // 可选：默认为 HNSW
        .initializeSchema(true)              // 可选：默认为 false
        .schemaName("public")                // 可选：默认为 "public"
        .vectorTableName("vector_store")     // 可选：默认为 "vector_store"
        .maxDocumentBatchSize(10000)         // 可选：默认为 10000
        .build();
}
```

## Run Postgres & PGVector DB locally

```bash
docker run -it --rm --name postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres pgvector/pgvector
```

您可以像这样连接到服务器：

```bash
psql -U postgres -h localhost -p 5432
```

## Accessing the Native Client

PGVector Store 实现通过 `getNativeClient()` 方法提供对底层原生 JDBC 客户端（`JdbcTemplate`）的访问：

```java
PgVectorStore vectorStore = context.getBean(PgVectorStore.class);
Optional<JdbcTemplate> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    JdbcTemplate jdbc = nativeClient.get();
    // 使用原生客户端进行 PostgreSQL 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 PostgreSQL 特定功能和操作。

