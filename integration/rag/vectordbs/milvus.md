# Milvus

[Milvus](https://milvus.io/) 是一个开源向量数据库，在数据科学和机器学习领域获得了广泛关注。其突出特点之一是对向量索引和查询的强大支持。Milvus 采用最先进的算法来加速搜索过程，使其在检索相似向量方面非常高效，即使在处理大量数据集时也是如此。

## Prerequisites

* 正在运行的 Milvus 实例。以下选项可用：
** [Milvus Standalone](https://milvus.io/docs/install_standalone-docker.md)：Docker、Operator、Helm、DEB/RPM、Docker Compose。
** [Milvus Cluster](https://milvus.io/docs/install_cluster-milvusoperator.md)：Operator、Helm。
* 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成 `MilvusVectorStore` 存储的嵌入。

## Dependencies

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

然后将 Milvus VectorStore boot starter 依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-starter-vector-store-milvus</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-milvus'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。
> 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

Vector Store 还需要一个 `EmbeddingModel` 实例来计算文档的嵌入。
您可以选择一个可用的 [EmbeddingModel 实现](api/embeddings#available-implementations)。

要连接和配置 `MilvusVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `application.yml` 提供简单配置：

```yaml
spring:
	ai:
		vectorstore:
			milvus:
				client:
					host: "localhost"
					port: 19530
					username: "root"
					password: "milvus"
				databaseName: "default"
				collectionName: "vector_store"
				embeddingDimension: 1536
				indexType: IVF_FLAT
				metricType: COSINE
```

> **提示：** 查看 [configuration parameters](#milvus-properties) 列表以了解默认值和配置选项。

现在您可以在应用程序中自动装配 Milvus Vector Store 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 将文档添加到 Milvus Vector Store
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

### Manual Configuration

不使用 Spring Boot auto-configuration，您可以手动配置 `MilvusVectorStore`。
要将以下依赖项添加到您的项目：

```xml
<dependency>
	<groupId>org.springframework.ai</groupId>
	<artifactId>spring-ai-milvus-store</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

要在应用程序中配置 MilvusVectorStore，您可以使用以下设置：

```java
	@Bean
	public VectorStore vectorStore(MilvusServiceClient milvusClient, EmbeddingModel embeddingModel) {
		return MilvusVectorStore.builder(milvusClient, embeddingModel)
				.collectionName("test_vector_store")
				.databaseName("default")
				.indexType(IndexType.IVF_FLAT)
				.metricType(MetricType.COSINE)
				.batchingStrategy(new TokenCountBatchingStrategy())
				.initializeSchema(true)
				.build();
	}

	@Bean
	public MilvusServiceClient milvusClient() {
		return new MilvusServiceClient(ConnectParam.newBuilder()
			.withAuthorization("minioadmin", "minioadmin")
			.withUri(milvusContainer.getEndpoint())
			.build());
	}
```

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Milvus 存储一起使用。

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

> **注意：** 这些过滤器表达式被转换为等效的 Milvus 过滤器。

## Using MilvusSearchRequest

MilvusSearchRequest 扩展了 SearchRequest，允许您使用 Milvus 特定的搜索参数，例如原生表达式和搜索参数 JSON。

```java
MilvusSearchRequest request = MilvusSearchRequest.milvusBuilder()
    .query("sample query")
    .topK(5)
    .similarityThreshold(0.7)
    .nativeExpression("metadata[\"age\"] > 30") // 如果同时设置了 filterExpression，则覆盖它
    .filterExpression("age <= 30") // 如果设置了 nativeExpression，则被忽略
    .searchParamsJson("{\"nprobe\":128}")
    .build();
List results = vectorStore.similaritySearch(request);
```

这在使用 Milvus 特定的搜索功能时提供了更大的灵活性。

## Importance of `nativeExpression` and `searchParamsJson` in `MilvusSearchRequest`

这两个参数增强了 Milvus 搜索精度并确保最佳查询性能：

*nativeExpression*：使用 Milvus 的原生过滤表达式启用额外的过滤功能。
[Milvus Filtering](https://milvus.io/docs/boolean.md)

示例：

```java
MilvusSearchRequest request = MilvusSearchRequest.milvusBuilder()
    .query("sample query")
    .topK(5)
    .nativeExpression("metadata['category'] == 'science'")
    .build();
```

*searchParamsJson*：在使用 IVF_FLAT（Milvus 的默认索引）时，对于调整搜索行为至关重要。
[Milvus Vector Index](https://milvus.io/docs/index.md?tab=floating)

默认情况下，`IVF_FLAT` 需要设置 `nprobe` 才能获得准确的结果。如果未指定，`nprobe` 默认为 `1`，这可能导致召回率低甚至零搜索结果。

示例：

```java
MilvusSearchRequest request = MilvusSearchRequest.milvusBuilder()
    .query("sample query")
    .topK(5)
    .searchParamsJson("{\"nprobe\":128}")
    .build();
```

使用 `nativeExpression` 确保高级过滤，而 `searchParamsJson` 防止由于默认 `nprobe` 值过低而导致的无效搜索。

## Milvus VectorStore properties {#milvus-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 Milvus 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| spring.ai.vectorstore.milvus.database-name | 要使用的 Milvus 数据库名称。 | default |
| spring.ai.vectorstore.milvus.collection-name | 存储向量的 Milvus collection 名称 | vector_store |
| spring.ai.vectorstore.milvus.initialize-schema | 是否初始化 Milvus 后端 | false |
| spring.ai.vectorstore.milvus.embedding-dimension | 要存储在 Milvus collection 中的向量维度。 | 1536 |
| spring.ai.vectorstore.milvus.index-type | 要为 Milvus collection 创建的索引类型。 | IVF_FLAT |
| spring.ai.vectorstore.milvus.metric-type | 用于 Milvus collection 的度量类型。 | COSINE |
| spring.ai.vectorstore.milvus.index-parameters | 用于 Milvus collection 的索引参数。 | {"nlist":1024} |
| spring.ai.vectorstore.milvus.id-field-name | collection 的 ID 字段名称 | doc_id |
| spring.ai.vectorstore.milvus.auto-id | 布尔标志，指示 ID 字段是否使用 auto-id | false |
| spring.ai.vectorstore.milvus.content-field-name | collection 的内容字段名称 | content |
| spring.ai.vectorstore.milvus.metadata-field-name | collection 的元数据字段名称 | metadata |
| spring.ai.vectorstore.milvus.embedding-field-name | collection 的嵌入字段名称 | embedding |
| spring.ai.vectorstore.milvus.client.host | 主机的名称或地址。 | localhost |
| spring.ai.vectorstore.milvus.client.port | 连接端口。 | 19530 |
| spring.ai.vectorstore.milvus.client.uri | Milvus 实例的 uri | - |
| spring.ai.vectorstore.milvus.client.token | 用作识别和身份验证目的的密钥的令牌。 | - |
| spring.ai.vectorstore.milvus.client.connect-timeout-ms | 客户端通道的连接超时值。超时值必须大于零。 | 10000 |
| spring.ai.vectorstore.milvus.client.keep-alive-time-ms | 客户端通道的 keep-alive 时间值。keep-alive 值必须大于零。 | 55000 |
| spring.ai.vectorstore.milvus.client.keep-alive-timeout-ms | 客户端通道的 keep-alive 超时值。超时值必须大于零。 | 20000 |
| spring.ai.vectorstore.milvus.client.rpc-deadline-ms | 您愿意等待服务器回复的截止时间。通过设置截止时间，客户端在遇到由网络波动引起的快速 RPC 失败时会等待。截止时间值必须大于或等于零。 | 0 |
| spring.ai.vectorstore.milvus.client.client-key-path | tls 双向身份验证的 client.key 路径，仅在 "secure" 为 true 时生效 | - |
| spring.ai.vectorstore.milvus.client.client-pem-path | tls 双向身份验证的 client.pem 路径，仅在 "secure" 为 true 时生效 | - |
| spring.ai.vectorstore.milvus.client.ca-pem-path | tls 双向身份验证的 ca.pem 路径，仅在 "secure" 为 true 时生效 | - |
| spring.ai.vectorstore.milvus.client.server-pem-path | tls 单向身份验证的 server.pem 路径，仅在 "secure" 为 true 时生效。 | - |
| spring.ai.vectorstore.milvus.client.server-name | 设置 SSL 主机名检查的目标名称覆盖，仅在 "secure" 为 True 时生效。注意：此值传递给 grpc.ssl_target_name_override | - |
| spring.ai.vectorstore.milvus.client.secure | 保护此连接的身份验证，设置为 True 以启用 TLS。 | false |
| spring.ai.vectorstore.milvus.client.idle-timeout-ms | 客户端通道的空闲超时值。超时值必须大于零。 | 24h |
| spring.ai.vectorstore.milvus.client.username | 此连接的用户名和密码。 | root |
| spring.ai.vectorstore.milvus.client.password | 此连接的密码。 | milvus |

## Starting Milvus Store

在 `src/test/resources/` 文件夹中运行：

```bash
docker-compose up
```

要清理环境：

```bash
docker-compose down; rm -Rf ./volumes
```

然后在 [http://localhost:19530](http://localhost:19530) 连接到向量存储，或用于管理 [http://localhost:9001](http://localhost:9001)（用户：`minioadmin`，密码：`minioadmin`）

## Troubleshooting

如果 Docker 抱怨资源问题，则执行：

```bash
docker system prune --all --force --volumes
```

## Accessing the Native Client

Milvus Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Milvus 客户端（`MilvusServiceClient`）的访问：

```java
MilvusVectorStore vectorStore = context.getBean(MilvusVectorStore.class);
Optional<MilvusServiceClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    MilvusServiceClient client = nativeClient.get();
    // 使用原生客户端进行 Milvus 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Milvus 特定功能和操作。

