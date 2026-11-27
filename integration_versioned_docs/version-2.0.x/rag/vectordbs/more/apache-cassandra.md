# Apache Cassandra Vector Store

本节将指导您设置 `CassandraVectorStore` 来存储文档嵌入并执行相似性搜索。

## What is Apache Cassandra?

[Apache Cassandra®](https://cassandra.apache.org) 是一个真正的开源分布式数据库，以线性可扩展性、经过验证的容错性和低延迟而闻名，使其成为任务关键型事务数据的完美平台。

其向量相似性搜索（VSS）基于 JVector 库，确保一流的性能和相关性。

在 Apache Cassandra 中进行向量搜索就像这样简单：

```sql
SELECT content FROM table ORDER BY content_vector ANN OF query_embedding;
```

有关此的更多文档可以在[这里](https://cassandra.apache.org/doc/latest/cassandra/getting-started/vector-search-quickstart.html)阅读。

此 Spring AI Vector Store 设计用于全新的 RAG 应用程序，并且能够在现有数据和表之上进行改造。

该存储还可以用于现有数据库中的非 RAG 用例，例如语义搜索、地理邻近搜索等。

存储将根据其配置自动创建或增强 schema。如果您不想进行 schema 修改，请使用 `initializeSchema` 配置存储。

使用 spring-boot-autoconfigure 时，`initializeSchema` 默认为 `false`，符合 Spring Boot 标准，您必须通过在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入 schema 创建/修改。

## What is JVector?

[JVector](https://github.com/jbellis/jvector) 是一个纯 Java 嵌入式向量搜索引擎。

它通过以下特点从其他 HNSW 向量相似性搜索实现中脱颖而出：

* **算法快速**。JVector 使用受 DiskANN 和相关研究启发的先进图算法，提供高召回率和低延迟。
* **实现快速**。JVector 使用 Panama SIMD API 来加速索引构建和查询。
* **内存高效**。JVector 使用产品量化压缩向量，使它们可以在搜索期间保留在内存中。
* **磁盘感知**。JVector 的磁盘布局设计为在查询时执行最少的必要 iops。
* **并发**。索引构建线性扩展到至少 32 个线程。线程数加倍，构建时间减半。
* **增量**。在构建索引时查询它。添加向量和能够在搜索结果中找到它之间没有延迟。
* **易于嵌入**。API 设计用于轻松嵌入，由在生产中使用它的人员设计。

## Prerequisites

1. 用于计算文档嵌入的 `EmbeddingModel` 实例。这通常配置为 Spring Bean。有多个选项可用：

- `Transformers Embedding` - 在您的本地环境中计算嵌入。默认是通过 ONNX 和 all-MiniLM-L6-v2 Sentence Transformers。这可以直接使用。
- 如果您想使用 OpenAI 的 Embeddings - 使用 OpenAI 嵌入端点。您需要在 [OpenAI Signup](https://platform.openai.com/signup) 创建账户，并在 [API Keys](https://platform.openai.com/account/api-keys) 生成 api-key 令牌。
- 还有更多选择，请参阅 `Embeddings API` 文档。

2. 从版本 5.0-beta1 开始的 Apache Cassandra 实例
a. [DIY Quick Start](https://cassandra.apache.org/_/quickstart.html)
b. 对于托管产品，[Astra DB](https://astra.datastax.com/) 提供健康的免费层产品。

## Dependencies

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

> **提示：** 对于依赖管理，我们建议使用 Spring AI BOM，如 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分所述。

将这些依赖项添加到您的项目：

* 仅 Cassandra Vector Store：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-cassandra-store</artifactId>
</dependency>
```

* 或者，对于 RAG 应用程序中所需的一切（使用默认的 ONNX Embedding Model）：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-cassandra</artifactId>
</dependency>
```

## Configuration Properties

您可以在 Spring Boot 配置中使用以下属性来自定义 Apache Cassandra 向量存储。

| Property | Default Value |
|----------|---------------|
| `spring.ai.vectorstore.cassandra.keyspace` | springframework |
| `spring.ai.vectorstore.cassandra.table` | ai_vector_store |
| `spring.ai.vectorstore.cassandra.initialize-schema` | false |
| `spring.ai.vectorstore.cassandra.index-name` | |
| `spring.ai.vectorstore.cassandra.content-column-name` | content |
| `spring.ai.vectorstore.cassandra.embedding-column-name` | embedding |
| `spring.ai.vectorstore.cassandra.fixed-thread-pool-executor-size` | 16 |

## Usage

### Basic Usage

创建一个 CassandraVectorStore 实例作为 Spring Bean：

```java
@Bean
public VectorStore vectorStore(CqlSession session, EmbeddingModel embeddingModel) {
    return CassandraVectorStore.builder(embeddingModel)
        .session(session)
        .keyspace("my_keyspace")
        .table("my_vectors")
        .build();
}
```

一旦您有了向量存储实例，您可以添加文档并执行搜索：

```java
// 添加文档
vectorStore.add(List.of(
    new Document("1", "content1", Map.of("key1", "value1")),
    new Document("2", "content2", Map.of("key2", "value2"))
));

// 使用过滤器搜索
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query("search text")
        .withTopK(5)
        .withSimilarityThreshold(0.7f)
        .withFilterExpression("metadata.key1 == 'value1'")
);
```

### Advanced Configuration

对于更复杂的用例，您可以在 Spring Bean 中配置其他设置：

```java
@Bean
public VectorStore vectorStore(CqlSession session, EmbeddingModel embeddingModel) {
    return CassandraVectorStore.builder(embeddingModel)
        .session(session)
        .keyspace("my_keyspace")
        .table("my_vectors")
        // 配置主键
        .partitionKeys(List.of(
            new SchemaColumn("id", DataTypes.TEXT),
            new SchemaColumn("category", DataTypes.TEXT)
        ))
        .clusteringKeys(List.of(
            new SchemaColumn("timestamp", DataTypes.TIMESTAMP)
        ))
        // 添加带有可选索引的元数据列
        .addMetadataColumns(
            new SchemaColumn("category", DataTypes.TEXT, SchemaColumnTags.INDEXED),
            new SchemaColumn("score", DataTypes.DOUBLE)
        )
        // 自定义列名
        .contentColumnName("text")
        .embeddingColumnName("vector")
        // 性能调优
        .fixedThreadPoolExecutorSize(32)
        // Schema 管理
        .initializeSchema(true)
        // 自定义批处理策略
        .batchingStrategy(new TokenCountBatchingStrategy())
        .build();
}
```

### Connection Configuration

有两种方法可以配置到 Cassandra 的连接：

* 使用注入的 CqlSession（推荐）：

```java
@Bean
public VectorStore vectorStore(CqlSession session, EmbeddingModel embeddingModel) {
    return CassandraVectorStore.builder(embeddingModel)
        .session(session)
        .keyspace("my_keyspace")
        .table("my_vectors")
        .build();
}
```

* 在构建器中直接使用连接详细信息：

```java
@Bean
public VectorStore vectorStore(EmbeddingModel embeddingModel) {
    return CassandraVectorStore.builder(embeddingModel)
        .contactPoint(new InetSocketAddress("localhost", 9042))
        .localDatacenter("datacenter1")
        .keyspace("my_keyspace")
        .build();
}
```

### Metadata Filtering

您可以将通用的、可移植的元数据过滤器与 CassandraVectorStore 一起使用。要使元数据列可搜索，它们必须是主键或 SAI 索引。要使非主键列被索引，请使用 `SchemaColumnTags.INDEXED` 配置元数据列。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.builder().query("The World")
        .topK(5)
        .filterExpression("country in ['UK', 'NL'] && year >= 2020").build());
```

或使用表达式 DSL 以编程方式：

```java
Filter.Expression f = new FilterExpressionBuilder()
    .and(
        f.in("country", "UK", "NL"), 
        f.gte("year", 2020)
    ).build();

vectorStore.similaritySearch(
    SearchRequest.builder().query("The World")
        .topK(5)
        .filterExpression(f).build());
```

可移植的过滤器表达式会自动转换为 [CQL queries](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/index.html)。

## Advanced Example: Vector Store on top of Wikipedia Dataset

以下示例演示如何在现有 schema 上使用存储。这里我们使用来自 [colbert-wikipedia-data](https://github.com/datastax-labs/colbert-wikipedia-data) 项目的 schema，该项目附带完整的维基百科数据集，已为您准备好向量化。

首先，在 Cassandra 数据库中创建 schema：

```bash
wget https://s.apache.org/colbert-wikipedia-schema-cql -O colbert-wikipedia-schema.cql
cqlsh -f colbert-wikipedia-schema.cql
```

然后使用构建器模式配置存储：

```java
@Bean
public VectorStore vectorStore(CqlSession session, EmbeddingModel embeddingModel) {
    List<SchemaColumn> partitionColumns = List.of(
        new SchemaColumn("wiki", DataTypes.TEXT),
        new SchemaColumn("language", DataTypes.TEXT),
        new SchemaColumn("title", DataTypes.TEXT)
    );

    List<SchemaColumn> clusteringColumns = List.of(
        new SchemaColumn("chunk_no", DataTypes.INT),
        new SchemaColumn("bert_embedding_no", DataTypes.INT)
    );

    List<SchemaColumn> extraColumns = List.of(
        new SchemaColumn("revision", DataTypes.INT),
        new SchemaColumn("id", DataTypes.INT)
    );

    return CassandraVectorStore.builder()
        .session(session)
        .embeddingModel(embeddingModel)
        .keyspace("wikidata")
        .table("articles")
        .partitionKeys(partitionColumns)
        .clusteringKeys(clusteringColumns)
        .contentColumnName("body")
        .embeddingColumnName("all_minilm_l6_v2_embedding")
        .indexName("all_minilm_l6_v2_ann")
        .initializeSchema(false)
        .addMetadataColumns(extraColumns)
        .primaryKeyTranslator((List<Object> primaryKeys) -> {
            if (primaryKeys.isEmpty()) {
                return "test§¶0";
            }
            return String.format("%s§¶%s", primaryKeys.get(2), primaryKeys.get(3));
        })
        .documentIdTranslator((id) -> {
            String[] parts = id.split("§¶");
            String title = parts[0];
            int chunk_no = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            return List.of("simplewiki", "en", title, chunk_no, 0);
        })
        .build();
}

@Bean
public EmbeddingModel embeddingModel() {
    // 默认是 ONNX all-MiniLM-L6-v2，这是我们想要的
    return new TransformersEmbeddingModel();
}
```

### Loading the Complete Wikipedia Dataset

要加载完整的维基百科数据集：

1. 从 https://s.apache.org/simplewiki-sstable-tar 下载 `simplewiki-sstable.tar`（这需要一段时间，文件有数十 GB）

2. 加载数据：

```bash
tar -xf simplewiki-sstable.tar -C ${CASSANDRA_DATA}/data/wikidata/articles-*/
nodetool import wikidata articles ${CASSANDRA_DATA}/data/wikidata/articles-*/
```

> **注意：**
> * 如果此表中有现有数据，请检查 tarball 的文件在执行 `tar` 时不会覆盖现有的 sstables。
> * `nodetool import` 的替代方法是重新启动 Cassandra。
> * 如果索引有任何失败，它们将自动重建。

## Accessing the Native Client

Cassandra Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Cassandra 客户端（`CqlSession`）的访问：

```java
CassandraVectorStore vectorStore = context.getBean(CassandraVectorStore.class);
Optional<CqlSession> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    CqlSession session = nativeClient.get();
    // 使用原生客户端进行 Cassandra 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Cassandra 特定功能和操作。

