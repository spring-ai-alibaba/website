# Google VertexAI Text Embeddings

Vertex AI 支持两种类型的 embeddings 模型：文本和多模态。
本文档介绍如何使用 Vertex AI link:https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api[Text embeddings API] 创建文本 embedding。

Vertex AI 文本 embeddings API 使用密集向量表示。
与倾向于直接将单词映射到数字的稀疏向量不同，密集向量旨在更好地表示文本的含义。
在生成式 AI 中使用密集向量 embeddings 的好处是，您不必搜索直接单词或语法匹配，而是可以更好地搜索与查询含义一致的段落，即使这些段落不使用相同的语言。

## 先决条件

- 安装适合您操作系统的 link:https://cloud.google.com/sdk/docs/install[gcloud] CLI。
- 通过运行以下命令进行身份验证。
将 `PROJECT_ID` 替换为您的 Google Cloud 项目 ID，将 `ACCOUNT` 替换为您的 Google Cloud 用户名。

```bash
gcloud config set project <PROJECT_ID> &&
gcloud auth application-default login <ACCOUNT>
```

### 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 VertexAI Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-vertex-ai-embedding</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-vertex-ai-embedding'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

前缀 `spring.ai.vertex.ai.embedding` 用作允许您连接到 VertexAI Embedding API 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.vertex.ai.embedding.project-id | Google Cloud Platform 项目 ID | - |
| spring.ai.vertex.ai.embedding.location | 区域 | - |
| spring.ai.vertex.ai.embedding.apiEndpoint | Vertex AI Embedding API 端点。 | - |

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding.text=vertexai（默认启用）

要禁用，spring.ai.model.embedding.text=none（或任何不匹配 vertexai 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.vertex.ai.embedding.text` 是允许您配置 VertexAI Text Embedding 的 embedding 模型实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.vertex.ai.embedding.text.enabled (已移除且不再有效) | 启用 Vertex AI Embedding API 模型。 | true |
| spring.ai.model.embedding.text | 启用 Vertex AI Embedding API 模型。 | vertexai |
| spring.ai.vertex.ai.embedding.text.options.model | 这是要使用的 link:https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings#supported-models[Vertex Text Embedding model] | text-embedding-004 |
| spring.ai.vertex.ai.embedding.text.options.task-type | 预期的下游应用程序，以帮助模型产生更高质量的 embeddings。可用的 link:https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api#request_body[task-types] | `RETRIEVAL_DOCUMENT` |
| spring.ai.vertex.ai.embedding.text.options.title | 可选标题，仅在 task_type=RETRIEVAL_DOCUMENT 时有效。 | - |
| spring.ai.vertex.ai.embedding.text.options.dimensions | 结果输出 embeddings 应具有的维度数。支持模型版本 004 及更高版本。您可以使用此参数来减少 embedding 大小，例如，用于存储优化。 | - |
| spring.ai.vertex.ai.embedding.text.options.auto-truncate | 设置为 true 时，输入文本将被截断。设置为 false 时，如果输入文本长于模型支持的最大长度，则返回错误。 | true |

## 示例 Controller

https://start.spring.io/[创建] 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-vertex-ai-embedding` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加 `application.properties` 文件，以启用和配置 VertexAi chat 模型：

```properties
spring.ai.vertex.ai.embedding.project-id=<YOUR_PROJECT_ID>
spring.ai.vertex.ai.embedding.location=<YOUR_PROJECT_LOCATION>
spring.ai.vertex.ai.embedding.text.options.model=text-embedding-004
```

这将创建一个 `VertexAiTextEmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 embedding 模型进行 embeddings 生成的简单 `@Controller` 类示例。

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

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-vertex-ai-embedding/src/main/java/org/springframework/ai/vertexai/embedding/VertexAiTextEmbeddingModel.java[VertexAiTextEmbeddingModel] 实现 `EmbeddingModel`。

将 `spring-ai-vertex-ai-embedding` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-vertex-ai-embedding</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-vertex-ai-embedding'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 `VertexAiTextEmbeddingModel` 并将其用于文本生成：

```java
VertexAiEmbeddingConnectionDetails connectionDetails =
    VertexAiEmbeddingConnectionDetails.builder()
        .projectId(System.getenv(<VERTEX_AI_GEMINI_PROJECT_ID>))
        .location(System.getenv(<VERTEX_AI_GEMINI_LOCATION>))
        .build();

VertexAiTextEmbeddingOptions options = VertexAiTextEmbeddingOptions.builder()
    .model(VertexAiTextEmbeddingOptions.DEFAULT_MODEL_NAME)
    .build();

var embeddingModel = new VertexAiTextEmbeddingModel(this.connectionDetails, this.options);

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

### 从 Google Service Account 加载凭据

要以编程方式从 Service Account json 文件加载 GoogleCredentials，您可以使用以下方法：

```java
GoogleCredentials credentials = GoogleCredentials.fromStream(<INPUT_STREAM_TO_CREDENTIALS_JSON>)
        .createScoped("https://www.googleapis.com/auth/cloud-platform");
credentials.refreshIfExpired();

VertexAiEmbeddingConnectionDetails connectionDetails =
    VertexAiEmbeddingConnectionDetails.builder()
        .projectId(System.getenv(<VERTEX_AI_GEMINI_PROJECT_ID>))
        .location(System.getenv(<VERTEX_AI_GEMINI_LOCATION>))
        .apiEndpoint(endpoint)
        .predictionServiceSettings(
            PredictionServiceSettings.newBuilder()
                .setEndpoint(endpoint)
                .setCredentialsProvider(FixedCredentialsProvider.create(credentials))
                .build());
```
