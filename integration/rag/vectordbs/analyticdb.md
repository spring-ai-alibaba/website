# AnalyticDB

本节将指导您设置 AnalyticDB `VectorStore` 来存储文档嵌入并执行相似性搜索。

[AnalyticDB](https://www.aliyun.com/product/ads) 是阿里云提供的云原生数据仓库服务，支持向量检索功能。AnalyticDB 向量数据库提供了高效的向量存储和相似性搜索能力，适用于大规模向量数据的存储和检索场景。

## Prerequisites

首先，您需要：

1. 一个 AnalyticDB 实例，并已启用向量数据库功能
2. 阿里云访问凭证（AccessKeyId 和 AccessKeySecret）
3. 数据库实例 ID、区域 ID、管理账号和密码
4. 命名空间（Namespace）和命名空间密码
5. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
   - 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `AnalyticDbVectorStore` 存储的嵌入。

在启动时，`AnalyticDbVectorStore` 会自动初始化向量数据库、创建命名空间（如果不存在）和集合（Collection）。

## Auto-Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 AnalyticDB VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-analyticdb</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-store-analyticdb'
}
```

向量存储实现可以为您初始化所需的 schema，但您必须通过在 `application.properties` 文件中设置 `spring.ai.vectorstore.analytic.enabled=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

Vector Store 还需要一个 `EmbeddingModel` 实例来计算文档的嵌入。
您可以选择一个可用的 [EmbeddingModel 实现](api/embeddings#available-implementations)。

例如，要使用 [OpenAI EmbeddingModel](api/embeddings/openai-embeddings)，请将以下依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。
> 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

要连接和配置 `AnalyticDbVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
  ai:
    vectorstore:
      analytic:
        enabled: true
        collect-name: my_collection
        access-key-id: <your-access-key-id>
        access-key-secret: <your-access-key-secret>
        region-id: cn-hangzhou
        db-instance-id: <your-db-instance-id>
        manager-account: <your-manager-account>
        manager-account-password: <your-manager-account-password>
        namespace: <your-namespace>
        namespace-password: <your-namespace-password>
        metrics: cosine
        read-timeout: 60000
        user-agent: index
        default-top-k: 4
        default-similarity-threshold: 0.0
```

> **提示：** 查看 [configuration parameters](#analyticdb-properties) 列表以了解默认值和配置选项。

现在您可以在应用程序中自动装配 `VectorStore` 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List<Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 AnalyticDB
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

## Configuration properties {#analyticdb-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 AnalyticDB 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.analytic.enabled` | 是否启用 AnalyticDB 向量存储 | `true` |
| `spring.ai.vectorstore.analytic.collect-name` | 集合（Collection）名称 | - |
| `spring.ai.vectorstore.analytic.access-key-id` | 阿里云访问密钥 ID | - |
| `spring.ai.vectorstore.analytic.access-key-secret` | 阿里云访问密钥 Secret | - |
| `spring.ai.vectorstore.analytic.region-id` | 区域 ID | - |
| `spring.ai.vectorstore.analytic.db-instance-id` | 数据库实例 ID | - |
| `spring.ai.vectorstore.analytic.manager-account` | 管理账号 | - |
| `spring.ai.vectorstore.analytic.manager-account-password` | 管理账号密码 | - |
| `spring.ai.vectorstore.analytic.namespace` | 命名空间 | - |
| `spring.ai.vectorstore.analytic.namespace-password` | 命名空间密码 | - |
| `spring.ai.vectorstore.analytic.metrics` | 相似度度量方式（cosine、l2 等） | `cosine` |
| `spring.ai.vectorstore.analytic.read-timeout` | 读取超时时间（毫秒） | `60000` |
| `spring.ai.vectorstore.analytic.user-agent` | 用户代理 | `index` |
| `spring.ai.vectorstore.analytic.default-top-k` | 默认返回的相似文档数量 | `4` |
| `spring.ai.vectorstore.analytic.default-similarity-threshold` | 默认相似度阈值 | `0.0` |

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](api/vectordbs#_metadata_filters) 与 AnalyticDB 存储一起使用。

例如，您可以使用文本表达式语言：

```java
vectorStore.similaritySearch(
    SearchRequest.builder()
    .query("The World")
    .topK(TOP_K)
    .similarityThreshold(SIMILARITY_THRESHOLD)
    .filterExpression("author in ['john', 'jill'] && article_type == 'blog'").build());
```

或使用 `Filter.Expression` DSL 以编程方式：

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();

vectorStore.similaritySearch(SearchRequest.builder()
    .query("The World")
    .topK(TOP_K)
    .similarityThreshold(SIMILARITY_THRESHOLD)
    .filterExpression(b.and(
        b.in("author","john", "jill"),
        b.eq("article_type", "blog")).build()).build());
```

> **注意：** 这些过滤器表达式被转换为 AnalyticDB 的 JSON 路径表达式，以实现高效的元数据过滤。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 `AnalyticDbVectorStore`。
为此，您需要将 AnalyticDB 客户端依赖项添加到您的项目：

```xml
<dependency>
	<groupId>com.aliyun</groupId>
	<artifactId>gpdb20160503</artifactId>
	<version>3.0.0</version>
</dependency>

<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-store-analyticdb</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

要在应用程序中配置 AnalyticDB，您可以使用以下设置：

```java
@Bean
public Client analyticdbClient() throws Exception {
    Map<String, Object> params = new HashMap<>();
    params.put("accessKeyId", "<your-access-key-id>");
    params.put("accessKeySecret", "<your-access-key-secret>");
    params.put("regionId", "cn-hangzhou");
    params.put("readTimeout", 60000);
    params.put("userAgent", "index");
    Config clientConfig = Config.build(params);
    return new Client(clientConfig);
}

@Bean
public VectorStore vectorStore(Client client, EmbeddingModel embeddingModel) {
    AnalyticDbConfig config = new AnalyticDbConfig()
        .setAccessKeyId("<your-access-key-id>")
        .setAccessKeySecret("<your-access-key-secret>")
        .setRegionId("cn-hangzhou")
        .setDbInstanceId("<your-db-instance-id>")
        .setManagerAccount("<your-manager-account>")
        .setManagerAccountPassword("<your-manager-account-password>")
        .setNamespace("<your-namespace>")
        .setNamespacePassword("<your-namespace-password>")
        .setMetrics("cosine")
        .setReadTimeout(60000)
        .setUserAgent("index");
    
    return AnalyticDbVectorStore.builder("my_collection", config, client, embeddingModel)
        .defaultTopK(4)                    // 可选：默认为 4
        .defaultSimilarityThreshold(0.0)    // 可选：默认为 0.0
        .batchingStrategy(new TokenCountBatchingStrategy()) // 可选：默认为 TokenCountBatchingStrategy
        .build();
}
```
