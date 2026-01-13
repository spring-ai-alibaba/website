# Chroma

本节将指导您设置 Chroma VectorStore 来存储文档嵌入并执行相似性搜索。

[Chroma](https://docs.trychroma.com/) 是开源嵌入数据库。它提供工具来存储文档嵌入、内容和元数据，并搜索这些嵌入，包括元数据过滤。

## Prerequisites

1. 访问 ChromaDB。兼容 [Chroma Cloud](https://trychroma.com/signup)，或者 【run Chroma Locally,setup local ChromaDB】 附录显示了如何使用 Docker 容器在本地设置数据库。
   - 对于 Chroma Cloud：您需要从 Chroma Cloud 仪表板获取 API key、tenant name 和 database name。
   - 对于本地 ChromaDB：除了启动容器外，无需额外配置。

2. 用于计算文档嵌入的 `EmbeddingModel` 实例。有多个选项可用：
- 如果需要，为 [EmbeddingModel](../../embeddings#available-implementations) 提供一个 API key，用于生成 `ChromaVectorStore` 存储的嵌入。

在启动时，如果尚未配置，`ChromaVectorStore` 会创建所需的 collection。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Chroma Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-chroma</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-chroma'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

向量存储实现可以为您初始化所需的 schema，但您必须通过在适当的构造函数中指定 `initializeSchema` 布尔值或在 `application.properties` 文件中设置 `...initialize-schema=true` 来选择加入。

> **注意：** 这是一个破坏性更改！在 Spring AI 的早期版本中，此 schema 初始化默认发生。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](../../embeddings#available-implementations) 部分了解更多信息。

以下是所需 bean 的示例：

```java
@Bean
public EmbeddingModel embeddingModel() {
    // 可以是任何其他 EmbeddingModel 实现。
    return new OpenAiEmbeddingModel(OpenAiApi.builder().apiKey(System.getenv("OPENAI_API_KEY")).build());
}
```

要连接到 Chroma，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 `_application.properties_` 提供简单配置：

```properties
# Chroma Vector Store 连接属性
spring.ai.vectorstore.chroma.client.host=<your Chroma instance host>  // 对于 Chroma Cloud: api.trychroma.com
spring.ai.vectorstore.chroma.client.port=<your Chroma instance port> // 对于 Chroma Cloud: 443
spring.ai.vectorstore.chroma.client.key-token=<your access token (if configure)> // 对于 Chroma Cloud: 使用 API key
spring.ai.vectorstore.chroma.client.username=<your username (if configure)>
spring.ai.vectorstore.chroma.client.password=<your password (if configure)>

# Chroma Vector Store tenant 和 database 属性（Chroma Cloud 必需）
spring.ai.vectorstore.chroma.tenant-name=<your tenant name> // 默认: SpringAiTenant
spring.ai.vectorstore.chroma.database-name=<your database name> // 默认: SpringAiDatabase

# Chroma Vector Store collection 属性
spring.ai.vectorstore.chroma.initialize-schema=<true or false>
spring.ai.vectorstore.chroma.collection-name=<your collection name>

# Chroma Vector Store 配置属性

# 如果使用 OpenAI auto-configuration，则为 OpenAI API key。
spring.ai.openai.api.key=<OpenAI Api-key>
```

请查看 [configuration parameters](#_configuration_properties) 列表以了解向量存储的默认值和配置选项。

现在您可以在应用程序中自动装配 Chroma Vector Store 并使用它

```java
@Autowired VectorStore vectorStore;

// ...

List <Document> documents = List.of(
    new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
    new Document("The World is Big and Salvation Lurks Around the Corner"),
    new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));

// 添加文档
vectorStore.add(documents);

// 检索与查询相似的文档
List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Spring").topK(5).build());
```

### Configuration properties

您可以在 Spring Boot 配置中使用以下属性来自定义向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.chroma.client.host` | 服务器连接主机 | http://localhost |
| `spring.ai.vectorstore.chroma.client.port` | 服务器连接端口 | `8000` |
| `spring.ai.vectorstore.chroma.client.key-token` | 访问令牌（如果配置） | - |
| `spring.ai.vectorstore.chroma.client.username` | 访问用户名（如果配置） | - |
| `spring.ai.vectorstore.chroma.client.password` | 访问密码（如果配置） | - |
| `spring.ai.vectorstore.chroma.tenant-name` | Tenant（Chroma Cloud 必需） | `SpringAiTenant` |
| `spring.ai.vectorstore.chroma.database-name` | 数据库名称（Chroma Cloud 必需） | `SpringAiDatabase` |
| `spring.ai.vectorstore.chroma.collection-name` | Collection 名称 | `SpringAiCollection` |
| `spring.ai.vectorstore.chroma.initialize-schema` | 是否初始化所需的 schema（如果不存在则创建 tenant/database/collection） | `false` |

> **注意：**
> 对于使用[静态 API 令牌身份验证](https://docs.trychroma.com/usage-guide#static-api-token-authentication)保护的 ChromaDB，使用 `ChromaApi#withKeyToken(<Your Token Credentials>)` 方法设置您的凭据。查看 `ChromaWhereIT` 以获取示例。
>
> 对于使用[基本身份验证](https://docs.trychroma.com/usage-guide#basic-authentication)保护的 ChromaDB，使用 `ChromaApi#withBasicAuth(<your user>, <your password>)` 方法设置您的凭据。查看 `BasicAuthChromaWhereIT` 以获取示例。

### Chroma Cloud Configuration

对于 Chroma Cloud，您需要提供来自 Chroma Cloud 实例的 tenant 和 database 名称。以下是示例配置：

```properties
# Chroma Cloud 连接
spring.ai.vectorstore.chroma.client.host=api.trychroma.com
spring.ai.vectorstore.chroma.client.port=443
spring.ai.vectorstore.chroma.client.key-token=<your-chroma-cloud-api-key>

# Chroma Cloud tenant 和 database（必需）
spring.ai.vectorstore.chroma.tenant-name=<your-tenant-id>
spring.ai.vectorstore.chroma.database-name=<your-database-name>

# Collection 配置
spring.ai.vectorstore.chroma.collection-name=my-collection
spring.ai.vectorstore.chroma.initialize-schema=true
```

> **注意：**
> 对于 Chroma Cloud：
> - 主机应为 `api.trychroma.com`
> - 端口应为 `443` (HTTPS)
> - 您必须通过 `key-token` 提供您的 API key
> - tenant 和 database 名称必须与您的 Chroma Cloud 配置匹配
> - 设置 `initialize-schema=true` 以在不存在时自动创建 collection（它不会重新创建现有的 tenant/database）

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 ChromaVector 存储一起使用。

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
                            b.in("john", "jill"),
                            b.eq("article_type", "blog")).build()).build());
```

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Chroma `where` [过滤器表达式](https://docs.trychroma.com/usage-guide#using-where-filters)。

例如，这个可移植的过滤器表达式：

```sql
author in ['john', 'jill'] && article_type == 'blog'
```

转换为专有的 Chroma 格式

```json
{"$and":[
	{"author": {"$in": ["john", "jill"]}},
	{"article_type":{"$eq":"blog"}}]
}
```

## Manual Configuration

如果您更喜欢手动配置 Chroma Vector Store，可以通过在 Spring Boot 应用程序中创建 `ChromaVectorStore` bean 来实现。

将这些依赖项添加到您的项目：
* Chroma VectorStore。

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-chroma-store</artifactId>
</dependency>
```

* OpenAI：计算嵌入所需。您可以使用任何其他嵌入模型实现。

```xml
<dependency>
 <groupId>org.springframework.ai</groupId>
 <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Sample Code

创建一个具有适当 ChromaDB 授权配置的 `RestClient.Builder` 实例，并使用它创建 `ChromaApi` 实例：

```java
@Bean
public RestClient.Builder builder() {
    return RestClient.builder().requestFactory(new SimpleClientHttpRequestFactory());
}


@Bean
public ChromaApi chromaApi(RestClient.Builder restClientBuilder) {
   String chromaUrl = "http://localhost:8000";
   ChromaApi chromaApi = new ChromaApi(chromaUrl, restClientBuilder);
   return chromaApi;
}
```

通过将 Spring Boot OpenAI starter 添加到您的项目来集成 OpenAI 的嵌入。这为您提供了 Embeddings 客户端的实现：

```java
@Bean
public VectorStore chromaVectorStore(EmbeddingModel embeddingModel, ChromaApi chromaApi) {
 return ChromaVectorStore.builder(chromaApi, embeddingModel)
    .tenantName("your-tenant-name") // 默认: SpringAiTenant
    .databaseName("your-database-name") // 默认: SpringAiDatabase
    .collectionName("TestCollection")
    .initializeSchema(true)
    .build();
}
```

在您的主代码中，创建一些文档：

```java
List<Document> documents = List.of(
 new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", Map.of("meta1", "meta1")),
 new Document("The World is Big and Salvation Lurks Around the Corner"),
 new Document("You walk forward facing the past and you turn back toward the future.", Map.of("meta2", "meta2")));
```

将文档添加到您的向量存储：

```java
vectorStore.add(documents);
```

最后，检索与查询相似的文档：

```java
List<Document> results = vectorStore.similaritySearch("Spring");
```

如果一切顺利，您应该检索到包含文本 "Spring AI rocks!!" 的文档。

### Run Chroma Locally

```shell
docker run -it --rm --name chroma -p 8000:8000 ghcr.io/chroma-core/chroma:1.0.0
```

在 `http://localhost:8000/api/v1` 启动 chroma 存储

