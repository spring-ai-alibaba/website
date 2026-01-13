# Elasticsearch

本节将指导您设置 Elasticsearch `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Elasticsearch](https://www.elastic.co/elasticsearch) 是一个基于 Apache Lucene 库的开源搜索和分析引擎。

## Prerequisites

正在运行的 Elasticsearch 实例。以下选项可用：

* [Docker](https://hub.docker.com/_/elasticsearch/)
* [Self-Managed Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html#elasticsearch-install-packages)
* [Elastic Cloud](https://www.elastic.co/cloud/elasticsearch-service/signup?page=docs&placement=docs-body)

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Elasticsearch Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件：

**Maven:**

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-elasticsearch</artifactId>
</dependency>
```

**Gradle:**

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-elasticsearch'
}
```

> **注意：**
> 对于 spring-boot 版本 3.3.0 之前，需要显式添加版本 > 8.13.3 的 elasticsearch-java 依赖项，否则使用的旧版本将与执行的查询不兼容：
>
> **Maven:**
>
> ```xml
> <dependency>
>     <groupId>co.elastic.clients</groupId>
>     <artifactId>elasticsearch-java</artifactId>
>     <version>8.13.3</version>
> </dependency>
> ```
>
> **Gradle:**
>
> ```groovy
> dependencies {
>     implementation 'co.elastic.clients:elasticsearch-java:8.13.3'
> }
> ```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。
或者，您可以选择退出初始化，并使用 Elasticsearch 客户端手动创建索引，如果索引需要高级映射或额外配置，这可能很有用。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

请查看 [configuration parameters](#elasticsearchvector-properties) 列表以了解向量存储的默认值和配置选项。
这些属性也可以通过配置 `ElasticsearchVectorStoreOptions` bean 来设置。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](../embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `ElasticsearchVectorStore` 作为向量存储。

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Elasticsearch
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#elasticsearchvector-properties}

要连接到 Elasticsearch 并使用 `ElasticsearchVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  elasticsearch:
    uris: <elasticsearch instance URIs>
    username: <elasticsearch username>
    password: <elasticsearch password>
  ai:
    vectorstore:
      elasticsearch:
        initialize-schema: true
        index-name: custom-index
        dimensions: 1536
        similarity: cosine
```

以 `spring.elasticsearch.*` 开头的 Spring Boot 属性用于配置 Elasticsearch 客户端：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.elasticsearch.connection-timeout` | 与 Elasticsearch 通信时使用的连接超时。 | `1s` |
| `spring.elasticsearch.password` | 用于 Elasticsearch 身份验证的密码。 | - |
| `spring.elasticsearch.username` | 用于 Elasticsearch 身份验证的用户名。 | - |
| `spring.elasticsearch.uris` | 要使用的 Elasticsearch 实例的逗号分隔列表。 | `http://localhost:9200` |
| `spring.elasticsearch.path-prefix` | 添加到发送到 Elasticsearch 的每个请求路径的前缀。 | - |
| `spring.elasticsearch.restclient.sniffer.delay-after-failure` | 失败后安排的嗅探执行的延迟。 | `1m` |
| `spring.elasticsearch.restclient.sniffer.interval` | 连续普通嗅探执行之间的间隔。 | `5m` |
| `spring.elasticsearch.restclient.ssl.bundle` | SSL bundle 名称。 | - |
| `spring.elasticsearch.socket-keep-alive` | 是否在客户端和 Elasticsearch 之间启用 socket keep alive。 | `false` |
| `spring.elasticsearch.socket-timeout` | 与 Elasticsearch 通信时使用的 socket 超时。 | `30s` |

以 `spring.ai.vectorstore.elasticsearch.*` 开头的属性用于配置 `ElasticsearchVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.elasticsearch.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.elasticsearch.index-name` | 存储向量的索引名称 | `spring-ai-document-index` |
| `spring.ai.vectorstore.elasticsearch.dimensions` | 向量中的维度数 | `1536` |
| `spring.ai.vectorstore.elasticsearch.similarity` | 要使用的相似性函数 | `cosine` |
| `spring.ai.vectorstore.elasticsearch.embedding-field-name` | 要搜索的向量字段名称 | `embedding` |

以下相似性函数可用：

* `cosine` - 默认值，适用于大多数用例。测量向量之间的余弦相似度。
* `l2_norm` - 向量之间的欧几里得距离。较低的值表示更高的相似度。
* `dot_product` - 对于归一化向量（例如，OpenAI 嵌入）的最佳性能。

有关每个函数的更多详细信息，请参阅 Elasticsearch 文档中关于 [dense vectors](https://www.elastic.co/guide/en/elasticsearch/reference/master/dense-vector.html#dense-vector-params) 的部分。

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Elasticsearch 一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(SearchRequest.builder()
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

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Elasticsearch [Query string query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html)。

例如，这个可移植的过滤器表达式：

```sql
author in ['john', 'jill'] && 'article_type' == 'blog'
```

转换为专有的 Elasticsearch 过滤器格式：

```
(metadata.author:john OR jill) AND metadata.article_type:blog
```

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Elasticsearch 向量存储。为此，您需要将 `spring-ai-elasticsearch-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-elasticsearch-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-elasticsearch-store'
}
```

创建 Elasticsearch `RestClient` bean。
阅读 [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/current/java-rest-low-usage-initialization.html) 以获取有关自定义 RestClient 配置的更多深入信息。

```java
@Bean
public RestClient restClient() {
    return RestClient.builder(new HttpHost("<host>", 9200, "http"))
        .setDefaultHeaders(new Header[]{
            new BasicHeader("Authorization", "Basic <encoded username and password>")
        })
        .build();
}
```

然后使用构建器模式创建 `ElasticsearchVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(RestClient restClient, EmbeddingModel embeddingModel) {
    ElasticsearchVectorStoreOptions options = new ElasticsearchVectorStoreOptions();
    options.setIndexName("custom-index");    // 可选：默认为 "spring-ai-document-index"
    options.setSimilarity(COSINE);           // 可选：默认为 COSINE
    options.setDimensions(1536);             // 可选：默认为模型维度或 1536

    return ElasticsearchVectorStore.builder(restClient, embeddingModel)
        .options(options)                     // 可选：使用自定义选项
        .initializeSchema(true)               // 可选：默认为 false
        .batchingStrategy(new TokenCountBatchingStrategy()) // 可选：默认为 TokenCountBatchingStrategy
        .build();
}

// 这可以是任何 EmbeddingModel 实现
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

## Accessing the Native Client

Elasticsearch Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Elasticsearch 客户端（`ElasticsearchClient`）的访问：

```java
ElasticsearchVectorStore vectorStore = context.getBean(ElasticsearchVectorStore.class);
Optional<ElasticsearchClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    ElasticsearchClient client = nativeClient.get();
    // 使用原生客户端进行 Elasticsearch 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Elasticsearch 特定功能和操作。

