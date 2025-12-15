# Transformers (ONNX) Embeddings

`TransformersEmbeddingModel` 是一个 `EmbeddingModel` 实现，它使用选定的 https://www.sbert.net/[sentence transformer] 本地计算 https://www.sbert.net/examples/applications/computing-embeddings/README.html#sentence-embeddings-with-transformers[sentence embeddings]。

您可以使用任何 link:https://huggingface.co/spaces/mteb/leaderboard[HuggingFace Embedding model]。

它使用 https://www.sbert.net/docs/pretrained_models.html[预训练] transformer 模型，序列化为 https://onnx.ai/[Open Neural Network Exchange (ONNX)] 格式。

https://djl.ai/[Deep Java Library] 和 Microsoft https://onnxruntime.ai/docs/get-started/with-java.html[ONNX Java Runtime] 库用于运行 ONNX 模型并在 Java 中计算 embeddings。

## 先决条件

要在 Java 中运行，我们需要将*Tokenizer 和 Transformer Model*序列化为 `ONNX` 格式。

使用 optimum-cli 序列化 - 实现此目的的一种快速方法是使用 https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model#exporting-a-model-to-onnx-using-the-cli[optimum-cli] 命令行工具。
以下代码片段准备一个 python 虚拟环境，安装所需的包，并使用 `optimum-cli` 序列化（例如，导出）指定的模型：

```bash
python3 -m venv venv
source ./venv/bin/activate
(venv) pip install --upgrade pip
(venv) pip install optimum onnx onnxruntime sentence-transformers
(venv) optimum-cli export onnx --model sentence-transformers/all-MiniLM-L6-v2 onnx-output-folder
```

该代码片段将 https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2[sentence-transformers/all-MiniLM-L6-v2] transformer 导出到 `onnx-output-folder` 文件夹。后者包括 embedding 模型使用的 `tokenizer.json` 和 `model.onnx` 文件。

您可以选择任何 huggingface transformer 标识符或提供直接文件路径来代替 all-MiniLM-L6-v2。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 ONNX Transformer Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-transformers</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-transformers'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。
请参阅 [Artifact Repositories](getting-started.adoc#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

要配置它，请使用 `spring.ai.embedding.transformer.*` 属性。

例如，将此添加到您的 _application.properties_ 文件中，以使用 https://huggingface.co/intfloat/e5-small-v2[intfloat/e5-small-v2] 文本 embedding 模型配置客户端：

```properties
spring.ai.embedding.transformer.onnx.modelUri=https://huggingface.co/intfloat/e5-small-v2/resolve/main/model.onnx
spring.ai.embedding.transformer.tokenizer.uri=https://huggingface.co/intfloat/e5-small-v2/raw/main/tokenizer.json
```

支持的属性完整列表如下：

### Embedding 属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=transformers（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 transformers 的值）

进行此更改是为了允许配置多个模型。
====

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.embedding.transformer.enabled (已移除且不再有效) | 启用 Transformer Embedding 模型。 | true |
| spring.ai.model.embedding | 启用 Transformer Embedding 模型。 | transformers |
| spring.ai.embedding.transformer.tokenizer.uri | 由 ONNX 引擎创建的预训练 HuggingFaceTokenizer 的 URI（例如 tokenizer.json）。 | onnx/all-MiniLM-L6-v2/tokenizer.json |
| spring.ai.embedding.transformer.tokenizer.options | HuggingFaceTokenizer 选项，如 '`addSpecialTokens`'、'`modelMaxLength`'、'`truncation`'、'`padding`'、'`maxLength`'、'`stride`'、'`padToMultipleOf`'。留空以回退到默认值。 | empty |
| spring.ai.embedding.transformer.cache.enabled | 启用远程 Resource 缓存。 | true |
| spring.ai.embedding.transformer.cache.directory | 缓存远程资源（如 ONNX 模型）的目录路径 | ${java.io.tmpdir}/spring-ai-onnx-model |
| spring.ai.embedding.transformer.onnx.modelUri | 现有的、预训练的 ONNX 模型。 | onnx/all-MiniLM-L6-v2/model.onnx |
| spring.ai.embedding.transformer.onnx.modelOutputName | ONNX 模型的输出节点名称，我们将使用它进行 embedding 计算。 | last_hidden_state |
| spring.ai.embedding.transformer.onnx.gpuDeviceId | 要执行的 GPU 设备 ID。仅在 >= 0 时适用。否则忽略。（需要额外的 onnxruntime_gpu 依赖） | -1 |
| spring.ai.embedding.transformer.metadataMode | 指定文档内容和元数据的哪些部分将用于计算 embeddings。 | NONE |

### 错误和特殊情况

[注意]
====
如果您看到类似 `Caused by: ai.onnxruntime.OrtException: Supplied array is ragged,..` 的错误，您还需要在 `application.properties` 中启用 tokenizer padding，如下所示：

```properties
spring.ai.embedding.transformer.tokenizer.options.padding=true
```
====

[注意]
====
如果您收到类似 `The generative output names don't contain expected: last_hidden_state. Consider one of the available model outputs: token_embeddings, ....` 的错误，您需要根据您的模型将模型输出名称设置为正确的值。
请考虑错误消息中列出的名称。
例如：

```properties
spring.ai.embedding.transformer.onnx.modelOutputName=token_embeddings
```
====

[注意]
====
如果您收到类似 `ai.onnxruntime.OrtException: Error code - ORT_FAIL - message: Deserialize tensor onnx::MatMul_10319 failed.GetFileLength for ./model.onnx_data failed:Invalid fd was supplied: -1` 的错误，
这意味着您的模型大于 2GB 并序列化为两个文件：`model.onnx` 和 `model.onnx_data`。

`model.onnx_data` 称为 link:https://onnx.ai/onnx/repo-docs/ExternalData.html#external-data[External Data]，并且应该在 `model.onnx` 的同一目录下。

目前唯一的解决方法是在运行 Boot 应用程序的文件夹中复制大型 `model.onnx_data`。
====

[注意]
====
如果您收到类似 `ai.onnxruntime.OrtException: Error code - ORT_EP_FAIL - message: Failed to find CUDA shared provider` 的错误，
这意味着您正在使用 GPU 参数 `spring.ai.embedding.transformer.onnx.gpuDeviceId`，但缺少 onnxruntime_gpu 依赖。
```xml
<dependency>
    <groupId>com.microsoft.onnxruntime</groupId>
    <artifactId>onnxruntime_gpu</artifactId>
</dependency>
```
请根据 CUDA 版本选择适当的 onnxruntime_gpu 版本（link:https://onnxruntime.ai/docs/get-started/with-java.html[ONNX Java Runtime]）。
====

## 手动配置

如果您不使用 Spring Boot，可以手动配置 Onnx Transformers Embedding Model。
为此，请将 `spring-ai-transformers` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-transformers</artifactId>
</dependency>
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

然后创建一个新的 `TransformersEmbeddingModel` 实例，并使用 `setTokenizerResource(tokenizerJsonUri)` 和 `setModelResource(modelOnnxUri)` 方法设置导出的 `tokenizer.json` 和 `model.onnx` 文件的 URI。（支持 `classpath:`、`file:` 或 `https:` URI 模式）。

如果未明确设置模型，`TransformersEmbeddingModel` 默认为 https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2[sentence-transformers/all-MiniLM-L6-v2]：

| Dimensions | Avg. performance | Speed | Size |
|------------|-------------------|-------|------|
| 384 | 58.80 | 14200 sentences/sec | 80MB |

以下代码片段说明了如何手动使用 `TransformersEmbeddingModel`：

```java
TransformersEmbeddingModel embeddingModel = new TransformersEmbeddingModel();

// (optional) defaults to classpath:/onnx/all-MiniLM-L6-v2/tokenizer.json
embeddingModel.setTokenizerResource("classpath:/onnx/all-MiniLM-L6-v2/tokenizer.json");

// (optional) defaults to classpath:/onnx/all-MiniLM-L6-v2/model.onnx
embeddingModel.setModelResource("classpath:/onnx/all-MiniLM-L6-v2/model.onnx");

// (optional) defaults to ${java.io.tmpdir}/spring-ai-onnx-model
// Only the http/https resources are cached by default.
embeddingModel.setResourceCacheDirectory("/tmp/onnx-zoo");

// (optional) Set the tokenizer padding if you see an errors like:
// "ai.onnxruntime.OrtException: Supplied array is ragged, ..."
embeddingModel.setTokenizerOptions(Map.of("padding", "true"));

embeddingModel.afterPropertiesSet();

List<List<Double>> embeddings = this.embeddingModel.embed(List.of("Hello world", "World is big"));
```

注意：如果您手动创建 `TransformersEmbeddingModel` 实例，必须在设置属性后并在使用客户端之前调用 `afterPropertiesSet()` 方法。

第一次 `embed()` 调用会下载大型 ONNX 模型并将其缓存在本地文件系统上。
因此，第一次调用可能比平时花费更长时间。
使用 `#setResourceCacheDirectory(<path>)` 方法设置存储 ONNX 模型的本地文件夹。
默认缓存文件夹是 `${java.io.tmpdir}/spring-ai-onnx-model`。

更方便（且推荐）的是将 TransformersEmbeddingModel 创建为 `Bean`。
这样您就不必手动调用 `afterPropertiesSet()`。

```java
@Bean
public EmbeddingModel embeddingModel() {
   return new TransformersEmbeddingModel();
}
```
