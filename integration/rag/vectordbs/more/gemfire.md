# GemFire Vector Store

本节将指导您设置 `GemFireVectorStore` 来存储文档嵌入并执行相似性搜索。

[GemFire](https://tanzu.vmware.com/gemfire) 是一个分布式、内存中的键值存储，以极快的速度执行读写操作。它提供高可用的并行消息队列、持续可用性，以及可以动态扩展而无需停机的事件驱动架构。随着数据大小需求的增加以支持高性能、实时应用程序，GemFire 可以轻松线性扩展。

[GemFire VectorDB](https://docs.vmware.com/en/VMware-GemFire-VectorDB/1.0/gemfire-vectordb/overview.html) 扩展了 GemFire 的功能，作为一个多功能的向量数据库，可以高效地存储、检索和执行向量相似性搜索。

## Prerequisites

1. 启用了 GemFire VectorDB 扩展的 GemFire 集群
- [安装 GemFire VectorDB 扩展](https://docs.vmware.com/en/VMware-GemFire-VectorDB/1.0/gemfire-vectordb/install.html)

2. 用于计算文档嵌入的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](embeddings#available-implementations) 部分了解更多信息。
在您的机器上本地运行的选项是 [ONNX](embeddings/onnx) 和 all-MiniLM-L6-v2 Sentence Transformers。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

将 GemFire VectorStore Spring Boot starter 添加到您项目的 Maven 构建文件 `pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-gemfire</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 文件

```xml
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-gemfire'
}
```

### Configuration properties

您可以在 Spring Boot 配置中使用以下属性来进一步配置 `GemFireVectorStore`。

| Property | Default value |
|----------|---------------|
| `spring.ai.vectorstore.gemfire.host` | localhost |
| `spring.ai.vectorstore.gemfire.port` | 8080 |
| `spring.ai.vectorstore.gemfire.initialize-schema` | `false` |
| `spring.ai.vectorstore.gemfire.index-name` | spring-ai-gemfire-store |
| `spring.ai.vectorstore.gemfire.beam-width` | 100 |
| `spring.ai.vectorstore.gemfire.max-connections` | 16 |
| `spring.ai.vectorstore.gemfire.vector-similarity-function` | COSINE |
| `spring.ai.vectorstore.gemfire.fields` | [] |
| `spring.ai.vectorstore.gemfire.buckets` | 0 |

## Manual Configuration

要仅使用 `GemFireVectorStore`，而不使用 Spring Boot 的 Auto-configuration，请将以下依赖项添加到您项目的 Maven `pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-gemfire-store</artifactId>
</dependency>
```

对于 Gradle 用户，在您的 `build.gradle` 文件的 dependencies 块下添加以下内容以仅使用 `GemFireVectorStore`：

```xml
dependencies {
    implementation 'org.springframework.ai:spring-ai-gemfire-store'
}
```

## Usage

以下是一个示例，创建 `GemfireVectorStore` 实例而不是使用 AutoConfiguration

```java
@Bean
public GemFireVectorStore vectorStore(EmbeddingModel embeddingModel) {
    return GemFireVectorStore.builder(embeddingModel)
        .host("localhost")
        .port(7071)
        .indexName("my-vector-index")
        .fields(new String[] {"country", "year", "activationDate"}) // 可选：用于元数据过滤的字段
        .initializeSchema(true)
        .build();
}
```

> **注意：**
> 默认配置连接到 `localhost:8080` 的 GemFire 集群

- 在您的应用程序中，创建一些文档：

```java
List<Document> documents = List.of(
   new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("country", "UK", "year", 2020)),
   new Document("The World is Big and Salvation Lurks Around the Corner", Map.of()),
   new Document("You walk forward facing the past and you turn back toward the future.", Map.of("country", "NL", "year", 2023)));
```

- 将文档添加到向量存储：

```java
vectorStore.add(documents);
```

- 使用相似性搜索检索文档：

```java
List<Document> results = vectorStore.similaritySearch(
   SearchRequest.builder().query("Spring").topK(5).build());
```

您应该检索到包含文本 "Spring AI rocks!!" 的文档。

您还可以使用相似性阈值限制结果数量：

```java
List<Document> results = vectorStore.similaritySearch(
   SearchRequest.builder().query("Spring").topK(5)
      .similarityThreshold(0.5d).build());
```

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](vectordbs#metadata-filters) 与 GemFire VectorStore 一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThreshold(0.7)
        .filterExpression("country == 'BG' && year >= 2020").build());
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThreshold(0.7)
        .filterExpression(b.and(
                b.eq("country", "BG"),
                b.gte("year", 2020)).build()).build());
```

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 GemFire VectorDB 查询格式。

例如，这个可移植的过滤器表达式：

```sql
country == 'BG' && year >= 2020
```

转换为专有的 GemFire VectorDB 过滤器格式：

```
country:BG AND year:[2020 TO *]
```

GemFire VectorStore 支持广泛的过滤器操作：

* **相等**: `country == 'BG'` → `country:BG`
* **不等**: `city != 'Sofia'` → `city: NOT Sofia`
* **大于**: `year > 2020` → `year:{2020 TO *]`
* **大于或等于**: `year >= 2020` → `year:[2020 TO *]`
* **小于**: `year < 2025` → `year:[* TO 2025}`
* **小于或等于**: `year <= 2025` → `year:[* TO 2025]`
* **IN**: `country in ['BG', 'NL']` → `country:(BG OR NL)`
* **NOT IN**: `country nin ['BG', 'NL']` → `NOT country:(BG OR NL)`
* **AND/OR**: 用于组合条件的逻辑运算符
* **分组**: 使用括号进行复杂表达式
* **日期过滤**: ISO 8601 格式的日期值（例如，`2024-01-07T14:29:12Z`）

> **重要：**
> 要在 GemFire VectorStore 中使用元数据过滤，您必须在创建向量存储时指定可以过滤的元数据字段。这通过构建器中的 `fields` 参数完成：
>
> ```java
> GemFireVectorStore.builder(embeddingModel)
>     .fields(new String[] {"country", "year", "activationDate"})
>     .build();
> ```
>
> 或通过配置属性：
>
> ```properties
> spring.ai.vectorstore.gemfire.fields=country,year,activationDate
> ```

