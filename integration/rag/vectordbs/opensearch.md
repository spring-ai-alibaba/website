# Alibaba OpenSearch

本节将指导您设置 Alibaba OpenSearch `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Alibaba OpenSearch](https://www.aliyun.com/product/opensearch) 是阿里云提供的智能搜索服务，支持向量检索功能。OpenSearch 提供了高效的向量存储和相似性搜索能力，适用于大规模向量数据的存储和检索场景。

## Prerequisites

首先，您需要：

1. 一个 Alibaba OpenSearch 实例
2. 实例 ID、端点（Endpoint）、访问用户名和密码
3. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
   - 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `OpenSearchVectorStore` 存储的嵌入。

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `spring.ai.alibaba.vectorstore.opensearch.initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 Alibaba OpenSearch VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-opensearch</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-opensearch'
}
```

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `spring.ai.alibaba.vectorstore.opensearch.enabled=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

请查看 [configuration parameters](#opensearch-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `OpenSearchVectorStore` 作为向量存储：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Alibaba OpenSearch
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#opensearch-properties}

要连接到 Alibaba OpenSearch 并使用 `OpenSearchVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    alibaba:
      vectorstore:
        opensearch:
          enabled: true
          instance-id: <your-instance-id>
          endpoint: <your-endpoint>
          access-user-name: <your-access-user-name>
          access-pass-word: <your-access-password>
          options:
            initialize-schema: true
            table-name: spring_ai_opensearch_vector_store
            primary-key-field: id
            index: saa_default_index
            similarity-function: cosinesimil
            output-fields:
              - content
              - metadata
            dimensions: 1536
            mapping-json: |
              {
                "name": "api",
                "partitionCount": 1,
                "primaryKey": "id",
                "fieldSchema": {
                  "id": "INT64",
                  "content": "STRING",
                  "metadata": "STRING",
                  "embedding": "MULTI_FLOAT"
                },
                "vectorIndex": [
                  {
                    "indexName": "saa_default_index",
                    "vectorField": "embedding",
                    "vectorIndexType": "hnsw",
                    "dimension": "1536",
                    "distanceType": "InnerProduct"
                  }
                ]
              }
```

以 `spring.ai.alibaba.vectorstore.opensearch.*` 开头的属性用于配置 `OpenSearchVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.alibaba.vectorstore.opensearch.enabled` | 是否启用 Alibaba OpenSearch 向量存储 | `false` |
| `spring.ai.alibaba.vectorstore.opensearch.instance-id` | OpenSearch 实例 ID | - |
| `spring.ai.alibaba.vectorstore.opensearch.endpoint` | OpenSearch 端点地址 | - |
| `spring.ai.alibaba.vectorstore.opensearch.access-user-name` | 访问用户名 | - |
| `spring.ai.alibaba.vectorstore.opensearch.access-pass-word` | 访问密码 | - |
| `spring.ai.alibaba.vectorstore.opensearch.options.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.alibaba.vectorstore.opensearch.options.table-name` | 存储向量的表名称 | `spring_ai_opensearch_vector_store` |
| `spring.ai.alibaba.vectorstore.opensearch.options.primary-key-field` | 主键字段名称 | `id` |
| `spring.ai.alibaba.vectorstore.opensearch.options.index` | 向量索引名称 | `saa_default_index` |
| `spring.ai.alibaba.vectorstore.opensearch.options.similarity-function` | 相似度函数（cosinesimil、l2 等） | `cosinesimil` |
| `spring.ai.alibaba.vectorstore.opensearch.options.output-fields` | 搜索结果输出的字段列表 | `["content", "metadata"]` |
| `spring.ai.alibaba.vectorstore.opensearch.options.dimensions` | 向量维度 | `1536` |
| `spring.ai.alibaba.vectorstore.opensearch.options.mapping-json` | 索引映射 JSON 配置 | - |

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Alibaba OpenSearch 向量存储。为此，您需要将 `spring-ai-alibaba-starter-store-opensearch` 添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-opensearch</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-opensearch'
}
```

创建 `OpenSearchApi` bean：

```java
@Bean
public OpenSearchApi openSearchApi() {
    OpenSearchVectorStoreProperties properties = new OpenSearchVectorStoreProperties();
    properties.setInstanceId("<your-instance-id>");
    properties.setEndpoint("<your-endpoint>");
    properties.setAccessUserName("<your-access-user-name>");
    properties.setAccessPassWord("<your-access-password>");
    return new OpenSearchApi(properties);
}
```

然后使用构建器模式创建 `OpenSearchVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(OpenSearchApi openSearchApi, EmbeddingModel embeddingModel) {
    OpenSearchVectorStoreOptions options = new OpenSearchVectorStoreOptions();
    options.setTableName("custom_vector_store");
    options.setPrimaryKeyField("id");
    options.setIndex("custom_index");
    options.setSimilarityFunction("cosinesimil");
    options.setDimensions(1536);
    options.setInitializeSchema(true);
    
    return OpenSearchVectorStore.builder(openSearchApi, embeddingModel)
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

Alibaba OpenSearch Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 OpenSearch 客户端（`OpenSearchApi`）的访问：

```java
OpenSearchVectorStore vectorStore = context.getBean(OpenSearchVectorStore.class);
Optional<OpenSearchApi> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    OpenSearchApi api = nativeClient.get();
    // 使用原生客户端进行 OpenSearch 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 OpenSearch 特定功能和操作。
