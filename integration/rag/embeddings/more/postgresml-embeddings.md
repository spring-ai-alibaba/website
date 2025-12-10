# PostgresML Embeddings

Spring AI 支持 PostgresML 文本 embeddings 模型。

Embeddings 是文本的数值表示。
它们用于将单词和句子表示为向量，即数字数组。
Embeddings 可用于通过使用距离度量比较数值向量的相似性来查找相似的文本片段，或者可以用作其他机器学习模型的输入特征，因为大多数算法不能直接使用文本。

许多预训练的 LLM 可用于在 PostgresML 中从文本生成 embeddings。
您可以浏览所有可用的 https://huggingface.co/models?library=sentence-transformers[models] 以在 Hugging Face 上找到最佳解决方案。

## 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started.adoc#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 Azure PostgresML Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-postgresml-embedding</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-postgresml-embedding'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

使用 `spring.ai.postgresml.embedding.options.*` 属性来配置您的 `PostgresMlEmbeddingModel`。

### Embedding 属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=postgresml（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 postgresml 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.postgresml.embedding` 是配置 PostgresML embeddings 的 `EmbeddingModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.postgresml.embedding.enabled (已移除且不再有效) | 启用 PostgresML embedding 模型。 | true |
| spring.ai.model.embedding | 启用 PostgresML embedding 模型。 | postgresml |
| spring.ai.postgresml.embedding.create-extension | 执行 SQL 'CREATE EXTENSION IF NOT EXISTS pgml' 以启用扩展 | false |
| spring.ai.postgresml.embedding.options.transformer | 用于 embedding 的 Hugging Face transformer 模型。 | distilbert-base-uncased |
| spring.ai.postgresml.embedding.options.kwargs | 其他 transformer 特定选项。 | empty map |
| spring.ai.postgresml.embedding.options.vectorType | 用于 embedding 的 PostgresML 向量类型。支持两个选项：`PG_ARRAY` 和 `PG_VECTOR`。 | PG_ARRAY |
| spring.ai.postgresml.embedding.options.metadataMode | 文档元数据聚合模式 | EMBED |

提示：所有前缀为 `spring.ai.postgresml.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

使用 https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/postgresml/PostgresMlEmbeddingOptions.java[PostgresMlEmbeddingOptions.java] 来配置 `PostgresMlEmbeddingModel` 的选项，例如要使用的模型等。

在启动时，您可以将 `PostgresMlEmbeddingOptions` 传递给 `PostgresMlEmbeddingModel` 构造函数，以配置用于所有 embedding 请求的默认选项。

在运行时，您可以使用 `EmbeddingRequest` 中的 `PostgresMlEmbeddingOptions` 来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
            PostgresMlEmbeddingOptions.builder()
                .transformer("intfloat/e5-small")
                .vectorType(VectorType.PG_ARRAY)
                .kwargs(Map.of("device", "gpu"))
                .build()));
```

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.postgresml.embedding.options.transformer=distilbert-base-uncased
spring.ai.postgresml.embedding.options.vectorType=PG_ARRAY
spring.ai.postgresml.embedding.options.metadataMode=EMBED
spring.ai.postgresml.embedding.options.kwargs.device=cpu
```

```java
@RestController
public class EmbeddingController {

    private final EmbeddingModel embeddingModel;

    @Autowired
    public EmbeddingController(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @GetMapping("/ai/embedding")
    public Map embed(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        EmbeddingResponse embeddingResponse = this.embeddingModel.embedForResponse(List.of(message));
        return Map.of("embedding", embeddingResponse);
    }
}
```

## 手动配置

如果不使用 Spring Boot 自动配置，您可以手动创建 `PostgresMlEmbeddingModel`。
为此，请将 `spring-ai-postgresml` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-postgresml</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-postgresml'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 `PostgresMlEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var jdbcTemplate = new JdbcTemplate(dataSource); // your posgresml data source

PostgresMlEmbeddingModel embeddingModel = new PostgresMlEmbeddingModel(this.jdbcTemplate,
        PostgresMlEmbeddingOptions.builder()
            .transformer("distilbert-base-uncased") // huggingface transformer model name.
            .vectorType(VectorType.PG_VECTOR) //vector type in PostgreSQL.
            .kwargs(Map.of("device", "cpu")) // optional arguments.
            .metadataMode(MetadataMode.EMBED) // Document metadata mode.
            .build());

embeddingModel.afterPropertiesSet(); // initialize the jdbc template and database.

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

注意：手动创建时，必须在设置属性后并在使用客户端之前调用 `afterPropertiesSet()`。
更方便（且推荐）的是将 PostgresMlEmbeddingModel 创建为 `@Bean`。
这样您就不必手动调用 `afterPropertiesSet()`：

```java
@Bean
public EmbeddingModel embeddingModel(JdbcTemplate jdbcTemplate) {
    return new PostgresMlEmbeddingModel(jdbcTemplate,
        PostgresMlEmbeddingOptions.builder()
             ....
            .build());
}
```
