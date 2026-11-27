# Google VertexAI Multimodal Embeddings

注意：实验性。仅用于实验目的。尚不兼容 `VectorStores`。

Vertex AI 支持两种类型的 embeddings 模型：文本和多模态。
本文档介绍如何使用 Vertex AI link:https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings[Multimodal embeddings API] 创建多模态 embedding。

多模态 embeddings 模型根据您提供的输入生成 1408 维向量，输入可以包括图像、文本和视频数据的组合。
然后，embedding 向量可用于后续任务，如图像分类或视频内容审核。

图像 embedding 向量和文本 embedding 向量在相同的语义空间中，具有相同的维度。
因此，这些向量可以互换用于用例，如按文本搜索图像，或按图像搜索视频。

注意：VertexAI Multimodal API 施加了 link:https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings#api-limits[以下限制]。

提示：对于仅文本 embedding 用例，我们建议使用 xref:api/embeddings/vertexai-embeddings-text.adoc[Vertex AI text-embeddings model] 代替。

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

要启用，spring.ai.model.embedding.multimodal=vertexai（默认启用）

要禁用，spring.ai.model.embedding.multimodal=none（或任何不匹配 vertexai 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.vertex.ai.embedding.multimodal` 是允许您配置 VertexAI Multimodal Embedding 的 embedding 模型实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.vertex.ai.embedding.multimodal.enabled (已移除且不再有效) | 启用 Vertex AI Embedding API 模型。 | true |
| spring.ai.model.embedding.multimodal=vertexai | 启用 Vertex AI Embedding API 模型。 | vertexai |
| spring.ai.vertex.ai.embedding.multimodal.options.model | 您可以使用以下模型获取多模态 embeddings： | multimodalembedding@001 |
| spring.ai.vertex.ai.embedding.multimodal.options.dimensions | 指定较低维度的 embeddings。默认情况下，embedding 请求为数据类型返回 1408 个浮点向量。您还可以为文本和图像数据指定较低维度的 embeddings（128、256 或 512 个浮点向量）。 | 1408 |
| spring.ai.vertex.ai.embedding.multimodal.options.video-start-offset-sec | 视频段的开始偏移（以秒为单位）。如果未指定，则使用 max(0, endOffsetSec - 120) 计算。 | - |
| spring.ai.vertex.ai.embedding.multimodal.options.video-end-offset-sec | 视频段的结束偏移（以秒为单位）。如果未指定，则使用 min(video length, startOffSec + 120) 计算。如果同时指定了 startOffSec 和 endOffSec，则 endOffsetSec 调整为 min(startOffsetSec+120, endOffsetSec)。 | - |
| spring.ai.vertex.ai.embedding.multimodal.options.video-interval-sec | 将生成 embedding 的视频间隔。interval_sec 的最小值为 4。如果间隔小于 4，则返回 InvalidArgumentError。间隔的最大值没有限制。但是，如果间隔大于 min(video length, 120s)，则会影响生成的 embeddings 的质量。默认值：16。 | - |

## 手动配置

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-vertex-ai-embedding/src/main/java/org/springframework/ai/vertexai/embedding/VertexAiMultimodalEmbeddingModel.java[VertexAiMultimodalEmbeddingModel] 实现 `DocumentEmbeddingModel`。

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

接下来，创建一个 `VertexAiMultimodalEmbeddingModel` 并将其用于 embeddings 生成：

```java
VertexAiEmbeddingConnectionDetails connectionDetails = 
    VertexAiEmbeddingConnectionDetails.builder()
        .projectId(System.getenv(<VERTEX_AI_GEMINI_PROJECT_ID>))
        .location(System.getenv(<VERTEX_AI_GEMINI_LOCATION>))
        .build();

VertexAiMultimodalEmbeddingOptions options = VertexAiMultimodalEmbeddingOptions.builder()
    .model(VertexAiMultimodalEmbeddingOptions.DEFAULT_MODEL_NAME)
    .build();

var embeddingModel = new VertexAiMultimodalEmbeddingModel(this.connectionDetails, this.options);

Media imageMedial = new Media(MimeTypeUtils.IMAGE_PNG, new ClassPathResource("/test.image.png"));
Media videoMedial = new Media(new MimeType("video", "mp4"), new ClassPathResource("/test.video.mp4"));

var document = new Document("Explain what do you see on this video?", List.of(this.imageMedial, this.videoMedial), Map.of());

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));

DocumentEmbeddingRequest embeddingRequest = new DocumentEmbeddingRequest(List.of(this.document),
        EmbeddingOptions.EMPTY);

EmbeddingResponse embeddingResponse = multiModelEmbeddingModel.call(this.embeddingRequest);

assertThat(embeddingResponse.getResults()).hasSize(3);
```
