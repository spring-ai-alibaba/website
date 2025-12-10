# Tablestore

本节将指导您设置 Tablestore `VectorStore` 来存储文档嵌入并执行相似性搜索。

[Table Store](https://www.aliyun.com/product/ots)（表格存储）是阿里云提供的 NoSQL 数据存储服务，支持向量检索功能。Tablestore 向量数据库提供了高效的向量存储和相似性搜索能力，适用于大规模向量数据的存储和检索场景。

## Prerequisites

首先，您需要：

1. 一个 Tablestore 实例，并已启用向量检索功能
2. Tablestore 访问凭证和配置信息
3. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
   - 如果需要，为 [EmbeddingModel](embeddings#available-implementations) 提供一个 API key，用于生成 `TablestoreVectorStore` 存储的嵌入。

向量存储实现可以为您初始化所需的表结构，但您必须通过设置 `initializeTable=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此表初始化默认发生。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 Tablestore VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-tablestore</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-tablestore'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

请查看 [configuration parameters](#tablestore-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `TablestoreVectorStore` 作为向量存储：

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Tablestore
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration Properties {#tablestore-properties}

要连接到 Tablestore 并使用 `TablestoreVectorStore`，您需要配置 `KnowledgeStoreImpl` 实例。
Tablestore 向量存储的配置主要通过 `KnowledgeStoreImpl` 进行，该实现封装了 Tablestore 的向量检索功能。

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#metadata-filters) 与 Tablestore 一起使用。

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

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Tablestore 过滤器表达式。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Tablestore 向量存储。为此，您需要将 `spring-ai-alibaba-starter-store-tablestore` 添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-tablestore</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-tablestore'
}
```

创建 `KnowledgeStoreImpl` bean：

```java
@Bean
public KnowledgeStoreImpl knowledgeStore() {
    // 配置 KnowledgeStoreImpl
    // 需要提供 Tablestore 的连接信息和配置
    return new KnowledgeStoreImpl(/* 配置参数 */);
}
```

然后使用构建器模式创建 `TablestoreVectorStore` bean：

```java
@Bean
public VectorStore vectorStore(KnowledgeStoreImpl knowledgeStore, EmbeddingModel embeddingModel) {
    return TablestoreVectorStore.builder(knowledgeStore, embeddingModel)
        .initializeTable(true)                         // 可选：默认为 false
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

Tablestore Vector Store 实现通过 `getKnowledgeStore()` 方法提供对底层原生 Tablestore 客户端（`KnowledgeStoreImpl`）的访问：

```java
TablestoreVectorStore vectorStore = context.getBean(TablestoreVectorStore.class);
KnowledgeStoreImpl knowledgeStore = vectorStore.getKnowledgeStore();
// 使用原生客户端进行 Tablestore 特定操作
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Tablestore 特定功能和操作。
