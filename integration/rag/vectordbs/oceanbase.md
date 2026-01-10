# OceanBase

本节将指导您设置 OceanBase `VectorStore` 来存储文档嵌入并执行相似性搜索。

[OceanBase](https://www.oceanbase.com/) 是蚂蚁集团自主研发的分布式关系数据库，支持向量数据类型和向量相似性搜索。OceanBase 提供了高效的向量存储和检索能力，适用于大规模向量数据的存储和查询场景。

## Prerequisites

首先，您需要：

1. 一个运行中的 OceanBase 数据库实例，支持 VECTOR 数据类型
2. 数据库连接信息（URL、用户名、密码）
3. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
   - 如果需要，为 [EmbeddingModel](embeddings#available-implementations) 提供一个 API key，用于生成 `OceanBaseVectorStore` 存储的嵌入。

在启动时，如果表不存在，`OceanBaseVectorStore` 将自动创建所需的表结构。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 OceanBase VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-oceanbase</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-oceanbase'
}
```

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `spring.ai.vectorstore.oceanbase.enabled=true` 来选择加入。

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

要连接和配置 `OceanBaseVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    vectorstore:
      oceanbase:
        enabled: true
        url: jdbc:oceanbase://localhost:2883/test
        username: root
        password: <your-password>
        table-name: vector_store
        default-top-k: 4
        default-similarity-threshold: 0.0
```

> **提示：** 查看 [configuration parameters](#oceanbase-properties) 列表以了解默认值和配置选项。

现在您可以在应用程序中自动装配 `VectorStore` 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 OceanBase
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration properties {#oceanbase-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 OceanBase 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.oceanbase.enabled` | 是否启用 OceanBase 向量存储 | `true` |
| `spring.ai.vectorstore.oceanbase.url` | OceanBase 数据库连接 URL | - |
| `spring.ai.vectorstore.oceanbase.username` | 数据库用户名 | - |
| `spring.ai.vectorstore.oceanbase.password` | 数据库密码 | - |
| `spring.ai.vectorstore.oceanbase.table-name` | 向量存储表名称 | - |
| `spring.ai.vectorstore.oceanbase.default-top-k` | 默认返回的相似文档数量 | `4` |
| `spring.ai.vectorstore.oceanbase.default-similarity-threshold` | 默认相似度阈值 | `0.0` |

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#_metadata_filters) 与 OceanBase 存储一起使用。

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

> **注意：** 这些过滤器表达式被转换为 SQL WHERE 子句，以实现高效的元数据过滤。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 `OceanBaseVectorStore`。
为此，您需要将 OceanBase 客户端依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.oceanbase</groupId>
	<artifactId>oceanbase-client</artifactId>
	<version>2.4.13</version>
</dependency>

<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-oceanbase</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

要在应用程序中配置 OceanBase，您可以使用以下设置：

```java
@Bean
public DataSource oceanbaseDataSource() {
    DriverManagerDataSource dataSource = new DriverManagerDataSource();
    dataSource.setUrl("jdbc:oceanbase://localhost:2883/test");
    dataSource.setUsername("root");
    dataSource.setPassword("<your-password>");
    return dataSource;
}

@Bean
public VectorStore vectorStore(DataSource dataSource, EmbeddingModel embeddingModel) {
    return OceanBaseVectorStore.builder("vector_store", dataSource, embeddingModel)
        .defaultTopK(4)                    // 可选：默认为 4
        .defaultSimilarityThreshold(0.0)    // 可选：默认为 0.0
        .batchingStrategy(new TokenCountBatchingStrategy()) // 可选：默认为 TokenCountBatchingStrategy
        .build();
}
```
