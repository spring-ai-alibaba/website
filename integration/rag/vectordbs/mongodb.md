# MongoDB Atlas

本节将指导您设置 MongoDB Atlas 作为向量存储以与 Spring AI 一起使用。

## What is MongoDB Atlas?

[MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) 是 MongoDB 提供的完全托管的云数据库，可在 AWS、Azure 和 GCP 中使用。
Atlas 支持对 MongoDB 文档数据进行原生 Vector Search 和全文搜索。

[MongoDB Atlas Vector Search](https://www.mongodb.com/products/platform/atlas-vector-search) 允许您将嵌入存储在 MongoDB 文档中，创建向量搜索索引，并使用近似最近邻算法（Hierarchical Navigable Small Worlds）执行 KNN 搜索。
您可以在 MongoDB 聚合阶段使用 `$vectorSearch` 聚合运算符对向量嵌入执行搜索。

## Prerequisites

* 运行 MongoDB 版本 6.0.11、7.0.2 或更高版本的 Atlas 集群。要开始使用 MongoDB Atlas，您可以按照[此处](https://www.mongodb.com/docs/atlas/getting-started/)的说明进行操作。确保您的 IP 地址包含在 Atlas 项目的[访问列表](https://www.mongodb.com/docs/atlas/security/ip-access-list/#std-label-access-list)中。
* 启用了 Vector Search 的正在运行的 MongoDB Atlas 实例
* 配置了向量搜索索引的 Collection
* 具有 id（字符串）、content（字符串）、metadata（文档）和 embedding（向量）字段的 Collection schema
* 索引和 collection 操作的适当访问权限

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 MongoDB Atlas Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-mongodb-atlas</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-mongodb-atlas'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `spring.ai.vectorstore.mongodb.initialize-schema=true` 来选择加入。
或者，您可以选择退出初始化，并使用 MongoDB Atlas UI、Atlas Administration API 或 Atlas CLI 手动创建索引，如果索引需要高级映射或额外配置，这可能很有用。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

请查看 [configuration parameters](#mongodbvector-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `MongoDBAtlasVectorStore` 作为向量存储：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 MongoDB Atlas
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#mongodbvector-properties}

要连接到 MongoDB Atlas 并使用 `MongoDBAtlasVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  data:
    mongodb:
      uri: <mongodb atlas connection string>
      database: <database name>
  ai:
    vectorstore:
      mongodb:
        initialize-schema: true
        collection-name: custom_vector_store
        index-name: custom_vector_index
        path-name: custom_embedding
        metadata-fields-to-filter: author,year
```

以 `spring.ai.vectorstore.mongodb.*` 开头的属性用于配置 `MongoDBAtlasVectorStore`：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.mongodb.initialize-schema` | 是否初始化所需的 schema | `false` |
| `spring.ai.vectorstore.mongodb.collection-name` | 存储向量的 collection 名称 | `vector_store` |
| `spring.ai.vectorstore.mongodb.index-name` | 向量搜索索引的名称 | `vector_index` |
| `spring.ai.vectorstore.mongodb.path-name` | 存储向量的路径 | `embedding` |
| `spring.ai.vectorstore.mongodb.metadata-fields-to-filter` | 可用于过滤的元数据字段的逗号分隔列表 | empty list |

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 MongoDB Atlas 向量存储。为此，您需要将 `spring-ai-mongodb-atlas-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mongodb-atlas-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-mongodb-atlas-store'
}
```

创建 `MongoTemplate` bean：

```java
@Bean
public MongoTemplate mongoTemplate() {
    return new MongoTemplate(MongoClients.create("<mongodb atlas connection string>"), "<database name>");
}
```

然后使用构建器模式创建 `MongoDBAtlasVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(MongoTemplate mongoTemplate, EmbeddingModel embeddingModel) {
    return MongoDBAtlasVectorStore.builder(mongoTemplate, embeddingModel)
        .collectionName("custom_vector_store")           // 可选：默认为 "vector_store"
        .vectorIndexName("custom_vector_index")          // 可选：默认为 "vector_index"
        .pathName("custom_embedding")                    // 可选：默认为 "embedding"
        .numCandidates(500)                             // 可选：默认为 200
        .metadataFieldsToFilter(List.of("author", "year")) // 可选：默认为空列表
        .initializeSchema(true)                         // 可选：默认为 false
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

您可以将通用的、可移植的 [metadata filters](vectordbs#metadata-filters) 与 MongoDB Atlas 一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThreshold(0.7)
        .filterExpression("author in ['john', 'jill'] && article_type == 'blog'").build());
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThreshold(0.7)
        .filterExpression(b.and(
                b.in("author", "john", "jill"),
                b.eq("article_type", "blog")).build()).build());
```

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 MongoDB Atlas 过滤器表达式。

例如，这个可移植的过滤器表达式：

```sql
author in ['john', 'jill'] && article_type == 'blog'
```

转换为专有的 MongoDB Atlas 过滤器格式：

```json
{
  "$and": [
    {
      "$or": [
        { "metadata.author": "john" },
        { "metadata.author": "jill" }
      ]
    },
    {
      "metadata.article_type": "blog"
    }
  ]
}
```

## Tutorials and Code Examples

要开始使用 Spring AI 和 MongoDB：

* 请参阅 [Getting Started guide for Spring AI Integration](https://www.mongodb.com/docs/atlas/atlas-vector-search/ai-integrations/spring-ai/#std-label-spring-ai)。
* 有关使用 Spring AI 和 MongoDB 演示检索增强生成（RAG）的综合代码示例，请参阅此[详细教程](https://www.mongodb.com/developer/languages/java/retrieval-augmented-generation-spring-ai/)。

## Accessing the Native Client

MongoDB Atlas Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 MongoDB 客户端（`MongoClient`）的访问：

```java
MongoDBAtlasVectorStore vectorStore = context.getBean(MongoDBAtlasVectorStore.class);
Optional<MongoClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    MongoClient client = nativeClient.get();
    // 使用原生客户端进行 MongoDB 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 MongoDB 特定功能和操作。

