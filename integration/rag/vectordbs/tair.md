# Tair

本节将指导您设置 Tair `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Tair](https://www.aliyun.com/product/tair) 是阿里云提供的兼容 Redis 的内存数据库服务，支持向量检索功能。Tair 向量数据库提供了高效的向量存储和相似性搜索能力，适用于大规模向量数据的存储和检索场景。

## Prerequisites

首先，您需要：

1. 一个 Tair 实例，并已启用向量检索功能
2. Tair 连接信息（主机、端口、密码等）
3. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
   - 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `TairVectorStore` 存储的嵌入。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 Tair VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-tair</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-tair'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

请查看 [configuration parameters](#tair-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `TairVectorStore` 作为向量存储：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Tair
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#tair-properties}

要连接到 Tair 并使用 `TairVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    vectorstore:
      tair:
        index-name: spring_ai_tair_vector_store
        dimensions: 1536
        index-algorithm: HNSW
        distance-method: L2
        index-params:
          - ef_construct
          - "100"
          - M
          - "16"
        expire-seconds: 600
```

以 `spring.ai.vectorstore.tair.*` 开头的属性用于配置 `TairVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.tair.index-name` | 向量索引名称 | `spring_ai_tair_vector_store` |
| `spring.ai.vectorstore.tair.dimensions` | 向量维度 | `1536` |
| `spring.ai.vectorstore.tair.index-algorithm` | 索引算法（FLAT、HNSW） | `HNSW` |
| `spring.ai.vectorstore.tair.distance-method` | 距离计算方法（L2、IP、JACCARD） | `L2` |
| `spring.ai.vectorstore.tair.index-params` | 索引参数列表 | `["ef_construct", "100", "M", "16"]` |
| `spring.ai.vectorstore.tair.expire-seconds` | 索引过期时间（秒） | `600` |

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Tair 向量存储。为此，您需要将 `spring-ai-alibaba-starter-store-tair` 添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-tair</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-tair'
}
```

创建 `TairVectorApi` bean：

```java
@Bean
public TairVectorApi tairVectorApi() {
    // 配置 Tair 连接
    // 需要提供 Tair 的主机、端口、密码等连接信息
    return new TairVectorApi(/* 配置参数 */);
}
```

然后使用构建器模式创建 `TairVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(TairVectorApi tairVectorApi, EmbeddingModel embeddingModel) {
    TairVectorStoreOptions options = new TairVectorStoreOptions();
    options.setIndexName("custom_index");
    options.setDimensions(1536);
    options.setIndexAlgorithm(IndexAlgorithm.HNSW);
    options.setDistanceMethod(DistanceMethod.L2);
    options.setExpireSeconds(600);
    
    return TairVectorStore.builder(tairVectorApi, embeddingModel)
        .options(options)
        .batchingStrategy(new TokenCountBatchingStrategy())
        .build();
}

// 这可以是任何 EmbeddingModel 实现
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(new OpenAiApi(System.getenv("OPENAI_API_KEY")));
}
```

## Accessing the Native Client

Tair Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Tair 客户端（`TairVectorApi`）的访问：

```java
TairVectorStore vectorStore = context.getBean(TairVectorStore.class);
Optional<TairVectorApi> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    TairVectorApi api = nativeClient.get();
    // 使用原生客户端进行 Tair 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Tair 特定功能和操作。

> **注意：** Tair Vector Store 目前不支持通过 ID 删除文档的操作。如果需要删除功能，请使用原生客户端直接操作。
