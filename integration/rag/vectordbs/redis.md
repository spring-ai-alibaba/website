# Redis

本节将指导您设置 `RedisVectorStore` 来存储文档嵌入并执行相似性搜索。

[Redis](https://redis.io) 是一个开源（BSD 许可）的内存数据结构存储，用作数据库、缓存、消息代理和流引擎。Redis 提供字符串、哈希、列表、集合、带范围查询的有序集合、位图、超对数、地理空间索引和流等数据结构。

[Redis Search and Query](https://redis.io/docs/interact/search-and-query/) 扩展了 Redis OSS 的核心功能，允许您将 Redis 用作向量数据库：

* 在哈希或 JSON 文档中存储向量和关联的元数据
* 检索向量
* 执行向量搜索

## Prerequisites

1. Redis Stack 实例
- [Redis Cloud](https://app.redislabs.com/#/)（推荐）
- [Docker](https://hub.docker.com/r/redis/redis-stack) 镜像 _redis/redis-stack:latest_

2. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
- 如果需要，为 [EmbeddingModel](embeddings#available-implementations) 提供一个 API key，用于生成 `RedisVectorStore` 存储的嵌入。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Redis Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-redis</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-redis'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

请查看 [configuration parameters](#redisvector-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `RedisVectorStore` 作为向量存储。

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Redis
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#redisvector-properties}

要连接到 Redis 并使用 `RedisVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  data:
    redis:
      url: <redis instance url>
  ai:
    vectorstore:
      redis:
        initialize-schema: true
        index-name: custom-index
        prefix: custom-prefix
```

对于 redis 连接配置，或者，可以通过 Spring Boot 的 _application.properties_ 提供简单配置：

```properties
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.data.redis.username=default
spring.data.redis.password=
```

以 `spring.ai.vectorstore.redis.*` 开头的属性用于配置 `RedisVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.redis.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.redis.index-name` | 存储向量的索引名称 | `spring-ai-index` |
| `spring.ai.vectorstore.redis.prefix` | Redis 键的前缀 | `embedding:` |

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#metadata-filters) 与 Redis 一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(TOP_K)
        .similarityThreshold(SIMILARITY_THRESHOLD)
        .filterExpression("country in ['UK', 'NL'] && year >= 2020").build());
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(TOP_K)
        .similarityThreshold(SIMILARITY_THRESHOLD)
        .filterExpression(b.and(
                b.in("country", "UK", "NL"),
                b.gte("year", 2020)).build()).build());
```

> **注意：** 这些（可移植的）过滤器表达式会自动转换为 [Redis search queries](https://redis.io/docs/interact/search-and-query/query/)。

例如，这个可移植的过滤器表达式：

```sql
country in ['UK', 'NL'] && year >= 2020
```

转换为专有的 Redis 过滤器格式：

```
@country:{UK | NL} @year:[2020 inf]
```

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Redis 向量存储。为此，您需要将 `spring-ai-redis-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-redis-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-redis-store'
}
```

创建 `JedisPooled` bean：

```java
@Bean
public JedisPooled jedisPooled() {
    return new JedisPooled("<host>", 6379);
}
```

然后使用构建器模式创建 `RedisVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(JedisPooled jedisPooled, EmbeddingModel embeddingModel) {
    return RedisVectorStore.builder(jedisPooled, embeddingModel)
        .indexName("custom-index")                // 可选：默认为 "spring-ai-index"
        .prefix("custom-prefix")                  // 可选：默认为 "embedding:"
        .metadataFields(                         // 可选：定义用于过滤的元数据字段
            MetadataField.tag("country"),
            MetadataField.numeric("year"))
        .initializeSchema(true)                   // 可选：默认为 false
        .batchingStrategy(new TokenCountBatchingStrategy()) // 可选：默认为 TokenCountBatchingStrategy
        .build();
}

// 这可以是任何 EmbeddingModel 实现
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

> **注意：**
> 您必须明确列出过滤器表达式中使用的任何元数据字段的所有元数据字段名称和类型（`TAG`、`TEXT` 或 `NUMERIC`）。
> 上面的 `metadataFields` 注册了可过滤的元数据字段：类型为 `TAG` 的 `country`，类型为 `NUMERIC` 的 `year`。

## Accessing the Native Client

Redis Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Redis 客户端（`JedisPooled`）的访问：

```java
RedisVectorStore vectorStore = context.getBean(RedisVectorStore.class);
Optional<JedisPooled> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    JedisPooled jedis = nativeClient.get();
    // 使用原生客户端进行 Redis 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Redis 特定功能和操作。

