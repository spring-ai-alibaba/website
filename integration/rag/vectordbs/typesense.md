# Typesense

本节将指导您设置 `TypesenseVectorStore` 来存储文档嵌入并执行相似性搜索。

[Typesense](https://typesense.org) 是一个开源容错搜索引擎，针对即时亚 50 毫秒搜索进行了优化，同时提供直观的开发人员体验。它提供向量搜索功能，允许您存储和查询高维向量以及常规搜索数据。

## Prerequisites

* 正在运行的 Typesense 实例。以下选项可用：
** [Typesense Cloud](https://typesense.org/docs/guide/install-typesense.html)（推荐）
** [Docker](https://hub.docker.com/r/typesense/typesense/) 镜像 _typesense/typesense:latest_
* 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `TypesenseVectorStore` 存储的嵌入。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Typesense Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-typesense</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-typesense'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

请查看 [configuration parameters](#_configuration_properties) 列表以了解向量存储的默认值和配置选项。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `TypesenseVectorStore` 作为向量存储：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Typesense
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

### Configuration Properties

要连接到 Typesense 并使用 `TypesenseVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    vectorstore:
      typesense:
        initialize-schema: true
        collection-name: vector_store
        embedding-dimension: 1536
        client:
          protocol: http
          host: localhost
          port: 8108
          api-key: xyz
```

以 `spring.ai.vectorstore.typesense.*` 开头的属性用于配置 `TypesenseVectorStore`：

| Property |Description |Default Value |
|----------|------------|--------------|
| `spring.ai.vectorstore.typesense.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.typesense.collection-name` | 存储向量的 collection 名称 | `vector_store` |
| `spring.ai.vectorstore.typesense.embedding-dimension` | 向量中的维度数 | `1536` |
| `spring.ai.vectorstore.typesense.client.protocol` | HTTP 协议 | `http` |
| `spring.ai.vectorstore.typesense.client.host` | 主机名 | `localhost` |
| `spring.ai.vectorstore.typesense.client.port` | 端口 | `8108` |
| `spring.ai.vectorstore.typesense.client.api-key` | API Key | `xyz` |

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Typesense 向量存储。为此，您需要将 `spring-ai-typesense-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-typesense-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-typesense-store'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

创建 Typesense `Client` bean：

```java
@Bean
public Client typesenseClient() {
    List<Node> nodes = new ArrayList<>();
    nodes.add(new Node("http", "localhost", "8108"));
    Configuration configuration = new Configuration(nodes, Duration.ofSeconds(5), "xyz");
    return new Client(configuration);
}
```

然后使用构建器模式创建 `TypesenseVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(Client client, EmbeddingModel embeddingModel) {
    return TypesenseVectorStore.builder(client, embeddingModel)
        .collectionName("custom_vectors")     // 可选：默认为 "vector_store"
        .embeddingDimension(1536)            // 可选：默认为 1536
        .initializeSchema(true)              // 可选：默认为 false
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

您可以将通用的可移植 [metadata filters](api/vectordbs#metadata-filters) 与 Typesense 存储一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.builder()
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

> **注意：** 这些（可移植的）过滤器表达式会自动转换为 [Typesense Search Filters](https://typesense.org/docs/0.24.0/api/search.html#filter-parameters)。

例如，这个可移植的过滤器表达式：

```sql
country in ['UK', 'NL'] && year >= 2020
```

转换为专有的 Typesense 过滤器格式：

```
country: ['UK', 'NL'] && year: >=2020
```

> **注意：**
> 如果您没有按预期顺序检索文档或搜索结果不符合预期，请检查您使用的嵌入模型。
>
> 嵌入模型可能对搜索结果产生重大影响（即，如果您的数据是西班牙语，请确保使用西班牙语或多语言嵌入模型）。

## Accessing the Native Client

Typesense Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Typesense 客户端（`Client`）的访问：

```java
TypesenseVectorStore vectorStore = context.getBean(TypesenseVectorStore.class);
Optional<Client> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    Client client = nativeClient.get();
    // 使用原生客户端进行 Typesense 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Typesense 特定功能和操作。

