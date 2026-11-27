# Couchbase

本节将指导您设置 `CouchbaseSearchVectorStore` 来使用 Couchbase 存储文档嵌入并执行相似性搜索。

[Couchbase](https://docs.couchbase.com/server/current/vector-search/vector-search.html) 是一个分布式 JSON 文档数据库，具有关系型 DBMS 的所有所需功能。除其他功能外，它允许用户使用基于向量的存储和检索来查询信息。

## Prerequisites

正在运行的 Couchbase 实例。以下选项可用：
Couchbase
* [Docker](https://hub.docker.com/_/couchbase/)
* [Capella - Couchbase as a Service](https://cloud.couchbase.com/)
* [Install Couchbase locally](https://www.couchbase.com/downloads/?family=couchbase-server)
* [Couchbase Kubernetes Operator](https://www.couchbase.com/downloads/?family=open-source-kubernetes)

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Couchbase Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-couchbase</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-couchbase-store-spring-boot-starter'
}
```

> **注意：** Couchbase Vector search 仅在起始版本 7.6 和 Java SDK 版本 3.6.0 中可用

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Milestone 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以使用默认选项为您初始化配置的 bucket、scope、collection 和搜索索引，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

请查看 [configuration parameters](#couchbasevector-properties) 列表以了解向量存储的默认值和配置选项。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](../../embeddings#available-implementations) 部分了解更多信息。

现在您可以在应用程序中自动装配 `CouchbaseSearchVectorStore` 作为向量存储。

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Qdrant
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = vectorStore.similaritySearch(SearchRequest.query("Spring").withTopK(5));
```

## Configuration Properties {#couchbasevector-properties}

要连接到 Couchbase 并使用 `CouchbaseSearchVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.properties` 提供配置：

```properties
spring.ai.openai.api-key=<key>
spring.couchbase.connection-string=<conn_string>
spring.couchbase.username=<username>
spring.couchbase.password=<password>
```

如果您更喜欢使用环境变量来处理敏感信息（如密码或 API key），您有多个选项：

### Option 1: Using Spring Expression Language (SpEL)

您可以使用自定义环境变量名称，并在应用程序配置中使用 SpEL 引用它们：

```yaml
# 在 application.yml 中
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
  couchbase:
    connection-string: ${COUCHBASE_CONN_STRING}
    username: ${COUCHBASE_USER}
    password: ${COUCHBASE_PASSWORD}
```

```bash
# 在您的环境或 .env 文件中
export OPENAI_API_KEY=<api-key>
export COUCHBASE_CONN_STRING=<couchbase connection string like couchbase://localhost>
export COUCHBASE_USER=<couchbase username>
export COUCHBASE_PASSWORD=<couchbase password>
```

### Option 2: Accessing Environment Variables Programmatically

或者，您可以在 Java 代码中访问环境变量：

```java
String apiKey = System.getenv("OPENAI_API_KEY");
```

这种方法使您在命名环境变量时具有灵活性，同时将敏感信息排除在应用程序配置文件之外。

> **注意：** 如果您选择创建 shell 脚本以便将来工作，请确保在启动应用程序之前通过 "sourcing" 文件来运行它，即 `source <your_script_name>.sh`。

Spring Boot 的 Couchbase Cluster auto-configuration 功能将创建一个 bean 实例，该实例将由 `CouchbaseSearchVectorStore` 使用。

以 `spring.couchbase.*` 开头的 Spring Boot 属性用于配置 Couchbase 集群实例：

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.couchbase.connection-string` | Couchbase 连接字符串 | `couchbase://localhost` |
| `spring.couchbase.password` | 用于 Couchbase 身份验证的密码。 | - |
| `spring.couchbase.username` | 用于 Couchbase 身份验证的用户名。 | - |
| `spring.couchbase.env.io.minEndpoints` | 每个节点的最小 socket 数。 | 1 |
| `spring.couchbase.env.io.maxEndpoints` | 每个节点的最大 socket 数。 | 12 |
| `spring.couchbase.env.io.idleHttpConnectionTimeout` | HTTP 连接在关闭并从池中删除之前可以保持空闲的时间长度。 | 1s |
| `spring.couchbase.env.ssl.enabled` | 是否启用 SSL 支持。如果提供了 "bundle"，除非另有指定，否则会自动启用。 | - |
| `spring.couchbase.env.ssl.bundle` | SSL bundle 名称。 | - |
| `spring.couchbase.env.timeouts.connect` | Bucket 连接超时。 | 10s |
| `spring.couchbase.env.timeouts.disconnect` | Bucket 断开连接超时。 | 10s |
| `spring.couchbase.env.timeouts.key-value` | 特定 key-value 操作的超时。 | 2500ms |
| `spring.couchbase.env.timeouts.key-value` | 具有持久性级别的特定 key-value 操作的超时。 | 10s |
| `spring.couchbase.env.timeouts.key-value-durable` | 具有持久性级别的特定 key-value 操作的超时。 | 10s |
| `spring.couchbase.env.timeouts.query` | SQL++ 查询操作超时。 | 75s |
| `spring.couchbase.env.timeouts.view` | 常规和地理空间视图操作超时。 | 75s |
| `spring.couchbase.env.timeouts.search` | 搜索服务的超时。 | 75s |
| `spring.couchbase.env.timeouts.analytics` | 分析服务的超时。 | 75s |
| `spring.couchbase.env.timeouts.management` | 管理操作的超时。 | 75s |

以 `spring.ai.vectorstore.couchbase.*` 前缀开头的属性用于配置 `CouchbaseSearchVectorStore`。

| Property | Description | Default Value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.couchbase.index-name` | 存储向量的索引名称。 | spring-ai-document-index |
| `spring.ai.vectorstore.couchbase.bucket-name` | Couchbase Bucket 的名称，scope 的父级。 | default |
| `spring.ai.vectorstore.couchbase.scope-name` | Couchbase scope 的名称，collection 的父级。搜索查询将在 scope 上下文中执行。 | _default_ |
| `spring.ai.vectorstore.couchbase.collection-name` | 存储文档的 Couchbase collection 名称。 | _default_ |
| `spring.ai.vectorstore.couchbase.dimensions` | 向量中的维度数。 | 1536 |
| `spring.ai.vectorstore.couchbase.similarity` | 要使用的相似性函数。 | `dot_product` |
| `spring.ai.vectorstore.couchbase.optimization` | 要使用的相似性函数。 | `recall` |
| `spring.ai.vectorstore.couchbase.initialize-schema` | 是否初始化所需的 schema | `false` |

以下相似性函数可用：

* l2_norm
* dot_product

以下索引优化可用：

* recall
* latency

有关每个的更多详细信息，请参阅 Couchbase 文档中关于 [vector searches](https://docs.couchbase.com/server/current/search/child-field-options-reference.html) 的部分。

## Metadata Filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Couchbase 存储一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.defaults()
    .query("The World")
    .topK(TOP_K)
    .filterExpression("author in ['john', 'jill'] && article_type == 'blog'"));
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.defaults()
    .query("The World")
    .topK(TOP_K)
    .filterExpression(b.and(
        b.in("author","john", "jill"),
        b.eq("article_type", "blog")).build()));
```

> **注意：** 这些过滤器表达式被转换为等效的 Couchbase SQL++ 过滤器。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 Couchbase 向量存储。为此，您需要将 `spring-ai-couchbase-store` 添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-couchbase-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-couchbase-store'
}
```

创建 Couchbase `Cluster` bean。
阅读 [Couchbase Documentation](https://docs.couchbase.com/java-sdk/current/hello-world/start-using-sdk.html) 以获取有关自定义 Cluster 实例配置的更多深入信息。

```java
@Bean
public Cluster cluster() {
    return Cluster.connect("couchbase://localhost", "username", "password");
}
```

然后使用构建器模式创建 `CouchbaseSearchVectorStore` bean：

```java
@Bean
public VectorStore couchbaseSearchVectorStore(Cluster cluster,
                                              EmbeddingModel embeddingModel,
                                              Boolean initializeSchema) {
    return CouchbaseSearchVectorStore
            .builder(cluster, embeddingModel)
            .bucketName("test")
            .scopeName("test")
            .collectionName("test")
            .initializeSchema(initializeSchema)
            .build();
}

// 这可以是任何 EmbeddingModel 实现。
@Bean
public EmbeddingModel embeddingModel() {
    return new OpenAiEmbeddingModel(OpenAiApi.builder().apiKey(this.openaiKey).build());
}
```

## Limitations

> **注意：** 必须激活以下 Couchbase 服务：Data、Query、Index、Search。虽然 Data 和 Search 可能足够，但 Query 和 Index 对于支持完整的元数据过滤机制是必需的。

