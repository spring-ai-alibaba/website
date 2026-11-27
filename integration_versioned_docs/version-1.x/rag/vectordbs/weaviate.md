# Weaviate

本节将指导您设置 Weaviate VectorStore 来存储文档嵌入并执行相似性搜索。

[Weaviate](https://weaviate.io/) 是一个开源向量数据库，允许您存储数据对象和来自您喜欢的 ML 模型的向量嵌入，并可以无缝扩展到数十亿个数据对象。
它提供工具来存储文档嵌入、内容和元数据，并搜索这些嵌入，包括元数据过滤。

## Prerequisites

* 正在运行的 Weaviate 实例。以下选项可用：
** [Weaviate Cloud Service](https://console.weaviate.cloud/)（需要账户创建和 API key）
** [Docker container](https://weaviate.io/developers/weaviate/installation/docker)
* 如果需要，为 [EmbeddingModel](../embeddings#available-implementations) 提供一个 API key，用于生成 `WeaviateVectorStore` 存储的嵌入。

## Dependencies

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

将 Weaviate Vector Store 依赖项添加到您的项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-weaviate-store</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-weaviate-store'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

## Configuration

要连接到 Weaviate 并使用 `WeaviateVectorStore`，您需要提供实例的访问详细信息。
可以通过 Spring Boot 的 _application.properties_ 提供配置：

```properties
spring.ai.vectorstore.weaviate.host=<host_of_your_weaviate_instance>
spring.ai.vectorstore.weaviate.scheme=<http_or_https>
spring.ai.vectorstore.weaviate.api-key=<your_api_key>
# 如果需要 API key，例如 OpenAI
spring.ai.openai.api-key=<api-key>
```

如果您更喜欢使用环境变量来处理敏感信息（如 API key），您有多个选项：

### Option 1: Using Spring Expression Language (SpEL)

您可以使用自定义环境变量名称并在应用程序配置中引用它们：

```yaml
# 在 application.yml 中
spring:
  ai:
    vectorstore:
      weaviate:
        host: ${WEAVIATE_HOST}
        scheme: ${WEAVIATE_SCHEME}
        api-key: ${WEAVIATE_API_KEY}
    openai:
      api-key: ${OPENAI_API_KEY}
```

```bash
# 在您的环境或 .env 文件中
export WEAVIATE_HOST=<host_of_your_weaviate_instance>
export WEAVIATE_SCHEME=<http_or_https>
export WEAVIATE_API_KEY=<your_api_key>
export OPENAI_API_KEY=<api-key>
```

### Option 2: Accessing Environment Variables Programmatically

或者，您可以在 Java 代码中访问环境变量：

```java
String weaviateApiKey = System.getenv("WEAVIATE_API_KEY");
String openAiApiKey = System.getenv("OPENAI_API_KEY");
```

> **注意：** 如果您选择创建 shell 脚本来管理环境变量，请确保在启动应用程序之前通过 "sourcing" 文件来运行它，即 `source <your_script_name>.sh`。

## Auto-configuration

Spring AI 为 Weaviate Vector Store 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到您项目的 Maven `pom.xml` 文件：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-weaviate</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-weaviate'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

请查看 [configuration parameters](#_weaviatevectorstore_properties) 列表以了解向量存储的默认值和配置选项。

> **提示：** 请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

此外，您需要一个配置的 `EmbeddingModel` bean。
请参阅 [EmbeddingModel](../embeddings#available-implementations) 部分了解更多信息。

以下是所需 bean 的示例：

```java
@Bean
public EmbeddingModel embeddingModel() {
    // 从安全源或环境变量检索 API key
    String apiKey = System.getenv("OPENAI_API_KEY");

    // 可以是任何其他 EmbeddingModel 实现
    return new OpenAiEmbeddingModel(OpenAiApi.builder().apiKey(apiKey).build());
}
```

现在您可以在应用程序中自动装配 `WeaviateVectorStore` 作为向量存储。

## Manual Configuration

不使用 Spring Boot auto-configuration，您可以使用构建器模式手动配置 `WeaviateVectorStore`：

```java
@Bean
public WeaviateClient weaviateClient() {
    return new WeaviateClient(new Config("http", "localhost:8080"));
}

@Bean
public VectorStore vectorStore(WeaviateClient weaviateClient, EmbeddingModel embeddingModel) {
    return WeaviateVectorStore.builder(weaviateClient, embeddingModel)
        .options(options)                              // 可选：使用自定义选项
        .consistencyLevel(ConsistentLevel.QUORUM)      // 可选：默认为 ConsistentLevel.ONE
        .filterMetadataFields(List.of(                 // 可选：可在过滤器中使用的字段
            MetadataField.text("country"),
            MetadataField.number("year")))
        .build();
}
```

## Metadata filtering

您可以将通用的、可移植的 [metadata filters](https://docs.spring.io/spring-ai/reference/api/vectordbs.html#_metadata_filters) 与 Weaviate 存储一起使用。

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

> **注意：** 这些（可移植的）过滤器表达式会自动转换为专有的 Weaviate [where filters](https://weaviate.io/developers/weaviate/api/graphql/filters)。

例如，这个可移植的过滤器表达式：

```sql
country in ['UK', 'NL'] && year >= 2020
```

转换为专有的 Weaviate GraphQL 过滤器格式：

```graphql
operator: And
operands:
    [{
        operator: Or
        operands:
            [{
                path: ["meta_country"]
                operator: Equal
                valueText: "UK"
            },
            {
                path: ["meta_country"]
                operator: Equal
                valueText: "NL"
            }]
    },
    {
        path: ["meta_year"]
        operator: GreaterThanEqual
        valueNumber: 2020
    }]
```

## Run Weaviate in Docker

要快速开始使用本地 Weaviate 实例，您可以在 Docker 中运行它：

```bash
docker run -it --rm --name weaviate \
    -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
    -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
    -e QUERY_DEFAULTS_LIMIT=25 \
    -e DEFAULT_VECTORIZER_MODULE=none \
    -e CLUSTER_HOSTNAME=node1 \
    -p 8080:8080 \
    semitechnologies/weaviate:1.22.4
```

这将在 http://localhost:8080 启动一个可访问的 Weaviate 实例。

## WeaviateVectorStore properties

您可以在 Spring Boot 配置中使用以下属性来自定义 Weaviate 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.ai.vectorstore.weaviate.host` | Weaviate 服务器的主机 | localhost:8080 |
| `spring.ai.vectorstore.weaviate.scheme` | 连接模式 | http |
| `spring.ai.vectorstore.weaviate.api-key` | 用于身份验证的 API key | |
| `spring.ai.vectorstore.weaviate.object-class` | 用于存储文档的类名。 | SpringAiWeaviate |
| `spring.ai.vectorstore.weaviate.content-field-name` | 内容的字段名称 | content |
| `spring.ai.vectorstore.weaviate.meta-field-prefix` | 元数据的字段前缀 | meta_ |
| `spring.ai.vectorstore.weaviate.consistency-level` | 一致性和速度之间的期望权衡 | ConsistentLevel.ONE |
| `spring.ai.vectorstore.weaviate.filter-field` | 配置可在过滤器中使用的元数据字段。格式：spring.ai.vectorstore.weaviate.filter-field.\<field-name\>=\<field-type\> | |

> **提示：** 对象类名应以大写字母开头，字段名应以小写字母开头。
> 请参阅 [data-object-concepts](https://weaviate.io/developers/weaviate/concepts/data#data-object-concepts)

## Accessing the Native Client

Weaviate Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Weaviate 客户端（`WeaviateClient`）的访问：

```java
WeaviateVectorStore vectorStore = context.getBean(WeaviateVectorStore.class);
Optional<WeaviateClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    WeaviateClient client = nativeClient.get();
    // 使用原生客户端进行 Weaviate 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Weaviate 特定功能和操作。

