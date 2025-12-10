# Google GenAI Text Embeddings

https://ai.google.dev/gemini-api/docs/embeddings[Google GenAI Embeddings API] 通过 Gemini Developer API 或 Vertex AI 使用 Google 的 embedding 模型提供文本 embedding 生成。
本文档介绍如何使用 Google GenAI Text embeddings API 创建文本 embeddings。

Google GenAI 文本 embeddings API 使用密集向量表示。
与倾向于直接将单词映射到数字的稀疏向量不同，密集向量旨在更好地表示文本的含义。
在生成式 AI 中使用密集向量 embeddings 的好处是，您不必搜索直接单词或语法匹配，而是可以更好地搜索与查询含义一致的段落，即使这些段落不使用相同的语言。

[注意]
====
目前，Google GenAI SDK 仅支持文本 embeddings。多模态 embeddings 支持待定，将在 SDK 中可用时添加。
====

此实现提供两种身份验证模式：

- **Gemini Developer API**：使用 API key 进行快速原型设计和开发
- **Vertex AI**：使用 Google Cloud 凭据进行具有企业功能的生产部署

## 先决条件

选择以下身份验证方法之一：

### 选项 1：Gemini Developer API (API Key)

- 从 https://aistudio.google.com/app/apikey[Google AI Studio] 获取 API key
- 将 API key 设置为环境变量或在应用程序属性中设置

### 选项 2：Vertex AI (Google Cloud)

- 安装适合您操作系统的 link:https://cloud.google.com/sdk/docs/install[gcloud] CLI。
- 通过运行以下命令进行身份验证。
将 `PROJECT_ID` 替换为您的 Google Cloud 项目 ID，将 `ACCOUNT` 替换为您的 Google Cloud 用户名。

```bash
gcloud config set project <PROJECT_ID> &&
gcloud auth application-default login <ACCOUNT>
```

### 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started.adoc#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 Google GenAI Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-google-genai-embedding</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-google-genai-embedding'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

#### 连接属性

前缀 `spring.ai.google.genai.embedding` 用作允许您连接到 Google GenAI Embedding API 的属性前缀。

[注意]
====
连接属性与 Google GenAI Chat 模块共享。如果您同时使用 chat 和 embeddings，只需使用 `spring.ai.google.genai` 前缀（用于 chat）或 `spring.ai.google.genai.embedding` 前缀（用于 embeddings）配置一次连接。
====

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.google.genai.embedding.api-key | Gemini Developer API 的 API key。提供时，客户端使用 Gemini Developer API 而不是 Vertex AI。 | - |
| spring.ai.google.genai.embedding.project-id | Google Cloud Platform 项目 ID（Vertex AI 模式必需） | - |
| spring.ai.google.genai.embedding.location | Google Cloud 区域（Vertex AI 模式必需） | - |
| spring.ai.google.genai.embedding.credentials-uri | Google Cloud 凭据的 URI。提供时，它用于创建 `GoogleCredentials` 实例进行身份验证。 | - |

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding.text=google-genai（默认启用）

要禁用，spring.ai.model.embedding.text=none（或任何不匹配 google-genai 的值）

进行此更改是为了允许配置多个模型。
====

#### 文本 Embedding 属性

前缀 `spring.ai.google.genai.embedding.text` 是允许您配置 Google GenAI Text Embedding 的 embedding 模型实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.embedding.text | 启用 Google GenAI Embedding API 模型。 | google-genai |
| spring.ai.google.genai.embedding.text.options.model | 要使用的 https://ai.google.dev/gemini-api/docs/models/gemini#text-embedding[Google GenAI Text Embedding model]。支持的模型包括 `text-embedding-004` 和 `text-multilingual-embedding-002` | text-embedding-004 |
| spring.ai.google.genai.embedding.text.options.task-type | 预期的下游应用程序，以帮助模型产生更高质量的 embeddings。可用的 link:https://ai.google.dev/api/embeddings#tasktype[task-types]：`RETRIEVAL_QUERY`、`RETRIEVAL_DOCUMENT`、`SEMANTIC_SIMILARITY`、`CLASSIFICATION`、`CLUSTERING`、`QUESTION_ANSWERING`、`FACT_VERIFICATION` | `RETRIEVAL_DOCUMENT` |
| spring.ai.google.genai.embedding.text.options.title | 可选标题，仅在 task_type=RETRIEVAL_DOCUMENT 时有效。 | - |
| spring.ai.google.genai.embedding.text.options.dimensions | 结果输出 embeddings 应具有的维度数。支持模型版本 004 及更高版本。您可以使用此参数来减少 embedding 大小，例如，用于存储优化。 | - |
| spring.ai.google.genai.embedding.text.options.auto-truncate | 设置为 true 时，输入文本将被截断。设置为 false 时，如果输入文本长于模型支持的最大长度，则返回错误。 | true |

## 示例 Controller

https://start.spring.io/[创建] 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-google-genai-embedding` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加 `application.properties` 文件，以启用和配置 Google GenAI embedding 模型：

### 使用 Gemini Developer API (API Key)

```properties
spring.ai.google.genai.embedding.api-key=YOUR_API_KEY
spring.ai.google.genai.embedding.text.options.model=text-embedding-004
```

### 使用 Vertex AI

```properties
spring.ai.google.genai.embedding.project-id=YOUR_PROJECT_ID
spring.ai.google.genai.embedding.location=YOUR_PROJECT_LOCATION
spring.ai.google.genai.embedding.text.options.model=text-embedding-004
```

这将创建一个 `GoogleGenAiTextEmbeddingModel` 实现，您可以将其注入到您的类中。
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

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-google-genai-embedding/src/main/java/org/springframework/ai/google/genai/text/GoogleGenAiTextEmbeddingModel.java[GoogleGenAiTextEmbeddingModel] 实现 `EmbeddingModel`。

将 `spring-ai-google-genai-embedding` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-google-genai-embedding</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-google-genai-embedding'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 `GoogleGenAiTextEmbeddingModel` 并将其用于文本 embeddings：

### 使用 API Key

```java
GoogleGenAiEmbeddingConnectionDetails connectionDetails =
    GoogleGenAiEmbeddingConnectionDetails.builder()
        .apiKey(System.getenv("GOOGLE_API_KEY"))
        .build();

GoogleGenAiTextEmbeddingOptions options = GoogleGenAiTextEmbeddingOptions.builder()
    .model(GoogleGenAiTextEmbeddingOptions.DEFAULT_MODEL_NAME)
    .taskType(TaskType.RETRIEVAL_DOCUMENT)
    .build();

var embeddingModel = new GoogleGenAiTextEmbeddingModel(connectionDetails, options);

EmbeddingResponse embeddingResponse = embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

### 使用 Vertex AI

```java
GoogleGenAiEmbeddingConnectionDetails connectionDetails =
    GoogleGenAiEmbeddingConnectionDetails.builder()
        .projectId(System.getenv("GOOGLE_CLOUD_PROJECT"))
        .location(System.getenv("GOOGLE_CLOUD_LOCATION"))
        .build();

GoogleGenAiTextEmbeddingOptions options = GoogleGenAiTextEmbeddingOptions.builder()
    .model(GoogleGenAiTextEmbeddingOptions.DEFAULT_MODEL_NAME)
    .taskType(TaskType.RETRIEVAL_DOCUMENT)
    .build();

var embeddingModel = new GoogleGenAiTextEmbeddingModel(connectionDetails, options);

EmbeddingResponse embeddingResponse = embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

## Task Types

Google GenAI embeddings API 支持不同的 task types，以针对特定用例优化 embeddings：

- `RETRIEVAL_QUERY`：针对检索系统中的搜索查询进行优化
- `RETRIEVAL_DOCUMENT`：针对检索系统中的文档进行优化
- `SEMANTIC_SIMILARITY`：针对测量文本之间的语义相似性进行优化
- `CLASSIFICATION`：针对文本分类任务进行优化
- `CLUSTERING`：针对聚类相似文本进行优化
- `QUESTION_ANSWERING`：针对问答系统进行优化
- `FACT_VERIFICATION`：针对事实验证任务进行优化

使用不同 task types 的示例：

```java
// For indexing documents
GoogleGenAiTextEmbeddingOptions docOptions = GoogleGenAiTextEmbeddingOptions.builder()
    .model("text-embedding-004")
    .taskType(TaskType.RETRIEVAL_DOCUMENT)
    .title("Product Documentation")  // Optional title for documents
    .build();

// For search queries
GoogleGenAiTextEmbeddingOptions queryOptions = GoogleGenAiTextEmbeddingOptions.builder()
    .model("text-embedding-004")
    .taskType(TaskType.RETRIEVAL_QUERY)
    .build();
```

## 维度缩减

对于模型版本 004 及更高版本，您可以减少 embedding 维度以进行存储优化：

```java
GoogleGenAiTextEmbeddingOptions options = GoogleGenAiTextEmbeddingOptions.builder()
    .model("text-embedding-004")
    .dimensions(256)  // Reduce from default 768 to 256 dimensions
    .build();
```

## 从 Vertex AI Text Embeddings 迁移

如果您当前使用 Vertex AI Text Embeddings 实现（`spring-ai-vertex-ai-embedding`），您可以以最少的更改迁移到 Google GenAI：

### 主要差异

1. **SDK**：Google GenAI 使用新的 `com.google.genai.Client` 而不是 Vertex AI SDK
2. **身份验证**：支持 API key 和 Google Cloud 凭据
3. **包名**：类在 `org.springframework.ai.google.genai.text` 中，而不是 `org.springframework.ai.vertexai.embedding`
4. **属性前缀**：使用 `spring.ai.google.genai.embedding` 而不是 `spring.ai.vertex.ai.embedding`
5. **连接详情**：使用 `GoogleGenAiEmbeddingConnectionDetails` 而不是 `VertexAiEmbeddingConnectionDetails`

### 何时使用 Google GenAI vs Vertex AI Text Embeddings

**在以下情况下使用 Google GenAI Embeddings：**
- 您想使用 API keys 进行快速原型设计
- 您需要 Developer API 的最新 embedding 功能
- 您希望在 API key 和 Vertex AI 模式之间灵活切换
- 您已经在使用 Google GenAI 进行 chat

**在以下情况下使用 Vertex AI Text Embeddings：**
- 您拥有现有的 Vertex AI 基础设施
- 您需要多模态 embeddings（目前仅在 Vertex AI 中可用）
- 您的组织需要仅 Google Cloud 部署
