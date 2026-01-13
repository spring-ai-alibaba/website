# Ollama Embeddings

使用 https://ollama.ai/[Ollama] 您可以在本地运行各种 https://ollama.com/search?c=embedding[AI Models] 并从它们生成 embeddings。
embedding 是浮点数（列表）的向量。
两个向量之间的距离衡量它们的相关性。
小距离表示高相关性，大距离表示低相关性。

`OllamaEmbeddingModel` 实现利用 Ollama https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings[Embeddings API] 端点。

## 先决条件

您首先需要访问 Ollama 实例。有几种选项，包括以下：

* link:https://ollama.com/download[下载并安装 Ollama] 到您的本地机器。
* 配置并 xref:api/testcontainers.adoc[通过 Testcontainers 运行 Ollama]。
* 通过 xref:api/cloud-bindings.adoc[Kubernetes Service Bindings] 绑定到 Ollama 实例。

您可以从 https://ollama.com/search?c=embedding[Ollama 模型库] 拉取要在应用程序中使用的模型：

```shellscript
ollama pull <model-name>
```

您还可以拉取数千个免费的 link:https://huggingface.co/models?library=gguf&sort=trending[GGUF Hugging Face Models] 中的任何一个：

```shellscript
ollama pull hf.co/<username>/<model-repository>
```

或者，您可以启用自动下载任何所需模型的选项：xref:auto-pulling-models[Auto-pulling Models]。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 Azure Ollama Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到您的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

[tabs]
======
Maven::
+
```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-model-ollama</artifactId>
</dependency>
```

Gradle::
+
```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-ollama'
}
```
======

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。
Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 Repositories 部分，将这些仓库添加到您的构建系统。

### 基本属性

前缀 `spring.ai.ollama` 是配置与 Ollama 连接的属性前缀

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.ollama.base-url | Ollama API 服务器运行的基础 URL。 | `+http://localhost:11434+` |

以下是用于初始化 Ollama 集成和 xref:auto-pulling-models[auto-pulling models] 的属性。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.ollama.init.pull-model-strategy | 是否在启动时拉取模型以及如何拉取。 | `never` |
| spring.ai.ollama.init.timeout | 等待模型被拉取的时间。 | `5m` |
| spring.ai.ollama.init.max-retries | 模型拉取操作的最大重试次数。 | `0` |
| spring.ai.ollama.init.embedding.include | 在初始化任务中包含此类型的模型。 | `true` |
| spring.ai.ollama.init.embedding.additional-models | 除了通过默认属性配置的模型之外，还要初始化的其他模型。 | `[]` |

### Embedding 属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=ollama（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 ollama 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.ollama.embedding.options` 是配置 Ollama embedding 模型的属性前缀。
它包括 Ollama 请求（高级）参数，如 `model`、`keep-alive` 和 `truncate`，以及 Ollama 模型 `options` 属性。

以下是 Ollama embedding 模型的高级请求参数：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.ollama.embedding.enabled (已移除且不再有效) | 启用 Ollama embedding 模型自动配置。 | true |
| spring.ai.model.embedding | 启用 Ollama embedding 模型自动配置。 | ollama |
| spring.ai.ollama.embedding.options.model | 要使用的 https://github.com/ollama/ollama?tab=readme-ov-file#model-library[支持的模型] 的名称。您可以使用专用的 https://ollama.com/search?c=embedding[Embedding Model] 类型 | mxbai-embed-large |
| spring.ai.ollama.embedding.options.keep_alive | 控制模型在请求后保持在内存中的时间 | 5m |
| spring.ai.ollama.embedding.options.truncate | 截断每个输入的末尾以适合上下文长度。如果为 false 且上下文长度超出，则返回错误。 | true |

其余的 `options` 属性基于 link:https://github.com/ollama/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values[Ollama Valid Parameters and Values] 和 link:https://github.com/ollama/ollama/blob/main/api/types.go[Ollama Types]。默认值基于：link:https://github.com/ollama/ollama/blob/b538dc3858014f94b099730a592751a5454cab0a/api/types.go#L364[Ollama type defaults]。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.ollama.embedding.options.numa | 是否使用 NUMA。 | false |
| spring.ai.ollama.embedding.options.num-ctx | 设置用于生成下一个 token 的上下文窗口大小。 | 2048 |
| spring.ai.ollama.embedding.options.num-batch | 提示处理最大批次大小。 | 512 |
| spring.ai.ollama.embedding.options.num-gpu | 要发送到 GPU(s) 的层数。在 macOS 上，默认值为 1 以启用 metal 支持，0 以禁用。这里的 1 表示 NumGPU 应该动态设置 | -1 |
| spring.ai.ollama.embedding.options.main-gpu | 使用多个 GPU 时，此选项控制哪个 GPU 用于小张量，对于这些张量，在所有 GPU 之间拆分计算的开销不值得。相关的 GPU 将使用稍多的 VRAM 来存储临时结果的暂存缓冲区。 | 0 |
| spring.ai.ollama.embedding.options.low-vram | - | false |
| spring.ai.ollama.embedding.options.f16-kv | - | true |
| spring.ai.ollama.embedding.options.logits-all | 返回所有 token 的 logits，而不仅仅是最后一个。要启用 completions 返回 logprobs，这必须为 true。 | - |
| spring.ai.ollama.embedding.options.vocab-only | 仅加载词汇表，不加载权重。 | - |
| spring.ai.ollama.embedding.options.use-mmap | 默认情况下，模型被映射到内存中，这允许系统根据需要仅加载模型的必要部分。但是，如果模型大于您的总 RAM 量，或者如果您的系统可用内存不足，使用 mmap 可能会增加页面调出的风险，从而对性能产生负面影响。禁用 mmap 会导致加载时间变慢，但如果您不使用 mlock，可能会减少页面调出。请注意，如果模型大于总 RAM 量，关闭 mmap 将阻止模型加载。 | null |
| spring.ai.ollama.embedding.options.use-mlock | 将模型锁定在内存中，防止在内存映射时被交换出去。这可以提高性能，但通过需要更多 RAM 来运行并可能减慢加载时间（因为模型加载到 RAM 中）来换取内存映射的一些优势。 | false |
| spring.ai.ollama.embedding.options.num-thread | 设置计算期间要使用的线程数。默认情况下，Ollama 会检测此值以获得最佳性能。建议将此值设置为系统具有的物理 CPU 核心数（而不是逻辑核心数）。0 = 让运行时决定 | 0 |
| spring.ai.ollama.embedding.options.num-keep | - | 4 |
| spring.ai.ollama.embedding.options.seed | 设置用于生成的随机数种子。将此设置为特定数字将使模型为相同的提示生成相同的文本。 | -1 |
| spring.ai.ollama.embedding.options.num-predict | 生成文本时预测的最大 token 数。(-1 = 无限生成，-2 = 填充上下文) | -1 |
| spring.ai.ollama.embedding.options.top-k | 减少生成无意义的概率。较高的值（例如，100）将给出更多样化的答案，而较低的值（例如，10）将更加保守。 | 40 |
| spring.ai.ollama.embedding.options.top-p | 与 top-k 一起工作。较高的值（例如，0.95）将导致更多样化的文本，而较低的值（例如，0.5）将生成更专注和保守的文本。 | 0.9 |
| spring.ai.ollama.embedding.options.min-p | top_p 的替代方案，旨在确保质量和多样性的平衡。参数 p 表示 token 被考虑的最小概率，相对于最可能的 token 的概率。例如，p=0.05 且最可能的 token 概率为 0.9，则值小于 0.045 的 logits 被过滤掉。 | 0.0 |
| spring.ai.ollama.embedding.options.tfs-z | 使用尾部自由采样来减少输出中不太可能的 token 的影响。较高的值（例如，2.0）将减少更多影响，而值为 1.0 则禁用此设置。 | 1.0 |
| spring.ai.ollama.embedding.options.typical-p | - | 1.0 |
| spring.ai.ollama.embedding.options.repeat-last-n | 设置模型回看多远以防止重复。（默认值：64，0 = 禁用，-1 = num_ctx） | 64 |
| spring.ai.ollama.embedding.options.temperature | 模型的温度。增加温度将使模型回答更具创造性。 | 0.8 |
| spring.ai.ollama.embedding.options.repeat-penalty | 设置对重复的惩罚强度。较高的值（例如，1.5）将更强烈地惩罚重复，而较低的值（例如，0.9）将更加宽松。 | 1.1 |
| spring.ai.ollama.embedding.options.presence-penalty | - | 0.0 |
| spring.ai.ollama.embedding.options.frequency-penalty | - | 0.0 |
| spring.ai.ollama.embedding.options.mirostat | 启用 Mirostat 采样以控制困惑度。（默认值：0，0 = 禁用，1 = Mirostat，2 = Mirostat 2.0） | 0 |
| spring.ai.ollama.embedding.options.mirostat-tau | 控制输出的一致性和多样性之间的平衡。较低的值将导致更专注和一致的文本。 | 5.0 |
| spring.ai.ollama.embedding.options.mirostat-eta | 影响算法对生成文本反馈的响应速度。较低的学习率将导致调整较慢，而较高的学习率将使算法更具响应性。 | 0.1 |
| spring.ai.ollama.embedding.options.penalize-newline | - | true |
| spring.ai.ollama.embedding.options.stop | 设置要使用的停止序列。遇到此模式时，LLM 将停止生成文本并返回。可以通过在 modelfile 中指定多个单独的 stop 参数来设置多个停止模式。 | - |
| spring.ai.ollama.embedding.options.functions | 函数列表，由其名称标识，以在单个提示请求中启用函数调用。具有这些名称的函数必须存在于 functionCallbacks 注册表中。 | - |

提示：所有前缀为 `spring.ai.ollama.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-ollama/src/main/java/org/springframework/ai/ollama/api/OllamaEmbeddingOptions.java[OllamaEmbeddingOptions.java] 提供 Ollama 配置，例如要使用的模型、低级 GPU 和 CPU 调优等。

重要提示：`OllamaOptions` 类已被弃用。对于 chat 模型，请使用 `OllamaChatOptions`，对于 embedding 模型，请使用 `OllamaEmbeddingOptions`。新类提供类型安全、特定于模型的配置选项。

也可以使用 `spring.ai.ollama.embedding.options` 属性配置默认选项。

在启动时使用 `OllamaEmbeddingModel(OllamaApi ollamaApi, OllamaEmbeddingOptions defaultOptions)` 来配置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `OllamaEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        OllamaEmbeddingOptions.builder()
            .model("Different-Embedding-Model-Deployment-Name"))
            .truncates(false)
            .build());
```

## Auto-pulling Models

Spring AI Ollama 可以在 Ollama 实例中不可用时自动拉取模型。
此功能对于开发和测试以及将应用程序部署到新环境特别有用。

提示：您还可以按名称拉取数千个免费的 link:https://huggingface.co/models?library=gguf&sort=trending[GGUF Hugging Face Models] 中的任何一个。

有三种拉取模型的策略：

* `always`（在 `PullModelStrategy.ALWAYS` 中定义）：始终拉取模型，即使它已经可用。有助于确保您使用的是模型的最新版本。
* `when_missing`（在 `PullModelStrategy.WHEN_MISSING` 中定义）：仅在模型尚不可用时拉取。这可能导致使用模型的旧版本。
* `never`（在 `PullModelStrategy.NEVER` 中定义）：从不自动拉取模型。

警告：由于下载模型时可能出现延迟，不建议在生产环境中使用自动拉取。相反，请考虑提前评估和预下载必要的模型。

所有通过配置属性和默认选项定义的模型都可以在启动时自动拉取。
您可以使用配置属性配置拉取策略、超时和最大重试次数：

```yaml
spring:
  ai:
    ollama:
      init:
        pull-model-strategy: always
        timeout: 60s
        max-retries: 1
```

警告：应用程序在 Ollama 中所有指定的模型可用之前不会完成初始化。根据模型大小和互联网连接速度，这可能会显著减慢应用程序的启动时间。

您可以在启动时初始化其他模型，这对于在运行时动态使用的模型很有用：

```yaml
spring:
  ai:
    ollama:
      init:
        pull-model-strategy: always
        embedding:
          additional-models:
            - mxbai-embed-large
            - nomic-embed-text
```

如果您只想将拉取策略应用于特定类型的模型，可以从初始化任务中排除 embedding 模型：

```yaml
spring:
  ai:
    ollama:
      init:
        pull-model-strategy: always
        embedding:
          include: false
```

此配置将拉取策略应用于除 embedding 模型之外的所有模型。

## HuggingFace Models

Ollama 可以开箱即用地访问所有 https://huggingface.co/models?library=gguf&sort=trending[GGUF Hugging Face] Embedding 模型。
您可以通过名称拉取这些模型中的任何一个：`ollama pull hf.co/<username>/<model-repository>` 或配置自动拉取策略：xref:auto-pulling-models[Auto-pulling Models]：

```properties
spring.ai.ollama.embedding.options.model=hf.co/mixedbread-ai/mxbai-embed-large-v1
spring.ai.ollama.init.pull-model-strategy=always
```

- `spring.ai.ollama.embedding.options.model`：指定要使用的 https://huggingface.co/models?library=gguf&sort=trending[Hugging Face GGUF model]。
- `spring.ai.ollama.init.pull-model-strategy=always`：（可选）在启动时启用自动模型拉取。
对于生产，您应该预下载模型以避免延迟：`ollama pull hf.co/mixedbread-ai/mxbai-embed-large-v1`。

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

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

如果您不使用 Spring Boot，可以手动配置 `OllamaEmbeddingModel`。
为此，请将 spring-ai-ollama 依赖项添加到项目的 Maven pom.xml 或 Gradle `build.gradle` 构建文件中：

[tabs]
======
Maven::
+
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-ollama</artifactId>
</dependency>
```

Gradle::
+
```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-ollama'
}
```
======

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

注意：`spring-ai-ollama` 依赖项还提供对 `OllamaChatModel` 的访问。
有关 `OllamaChatModel` 的更多信息，请参阅 [Ollama Chat Client](../../chatmodels/ollama-chat) 部分。

接下来，创建一个 `OllamaEmbeddingModel` 实例，并使用专用的 `chroma/all-minilm-l6-v2-f32` embedding 模型计算两个输入文本的 embeddings：

```java
var ollamaApi = OllamaApi.builder().build();

var embeddingModel = new OllamaEmbeddingModel(this.ollamaApi,
        OllamaEmbeddingOptions.builder()
			.model(OllamaModel.MISTRAL.id())
            .build());

EmbeddingResponse embeddingResponse = this.embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        OllamaEmbeddingOptions.builder()
            .model("chroma/all-minilm-l6-v2-f32"))
            .truncate(false)
            .build());
```

`OllamaEmbeddingOptions` 提供所有 embedding 请求的配置信息。
