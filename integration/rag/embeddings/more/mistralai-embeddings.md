# Mistral AI Embeddings

Spring AI 支持 Mistral AI 的文本 embeddings 模型。
Embeddings 是文本的向量表示，通过它们在高维向量空间中的位置捕获段落的语义含义。Mistral AI Embeddings API 提供最先进的文本 embeddings，可用于许多 NLP 任务。

## 可用模型

Mistral AI 提供两个 embedding 模型，每个都针对不同的用例进行了优化：

| Model | Dimensions | Use Case | Description |
|-------|------------|----------|-------------|
| `mistral-embed` | 1024 | General text | 适用于语义搜索、聚类和文本相似性任务的通用 embedding 模型。适合自然语言内容。 |
| `codestral-embed` | 1536 | Code | 专门针对代码相似性、代码搜索和代码仓库的检索增强生成 (RAG) 进行优化的 embedding 模型。提供专门为理解代码语义而设计的高维 embeddings。 |

选择模型时：

* 对于一般文本内容（如文档、文章或用户查询），使用 `mistral-embed`
* 在处理代码、技术文档或构建代码感知的 RAG 系统时，使用 `codestral-embed`

## 先决条件

您需要创建一个 API 来访问 MistralAI embeddings 模型。

在 https://auth.mistral.ai/ui/registration[MistralAI 注册页面] 创建账户，并在 https://console.mistral.ai/api-keys/[API Keys 页面] 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.mistralai.api-key` 的配置属性，您应该将其设置为从 console.mistral.ai 获取的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.mistralai.api-key=<your-mistralai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    mistralai:
      api-key: ${MISTRALAI_API_KEY}
```

```bash
# In your environment or .env file
export MISTRALAI_API_KEY=<your-mistralai-api-key>
```

您还可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("MISTRALAI_API_KEY");
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

Spring AI 为 MistralAI Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-mistral-ai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-mistral-ai'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

#### Retry 属性

前缀 `spring.ai.retry` 用作允许您配置 Mistral AI Embedding 模型的重试机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.retry.max-attempts | 最大重试次数。 | 10 |
| spring.ai.retry.backoff.initial-interval | 指数退避策略的初始睡眠持续时间。 | 2 sec. |
| spring.ai.retry.backoff.multiplier | 退避间隔乘数。 | 5 |
| spring.ai.retry.backoff.max-interval | 最大退避持续时间。 | 3 min. |
| spring.ai.retry.on-client-errors | 如果为 false，抛出 NonTransientAiException，并且不对 `4xx` 客户端错误代码尝试重试 | false |
| spring.ai.retry.exclude-on-http-codes | 不应触发重试的 HTTP 状态代码列表（例如，抛出 NonTransientAiException）。 | empty |
| spring.ai.retry.on-http-codes | 应触发重试的 HTTP 状态代码列表（例如，抛出 TransientAiException）。 | empty |

#### 连接属性

前缀 `spring.ai.mistralai` 用作允许您连接到 MistralAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.mistralai.base-url | 要连接到的 URL | https://api.mistral.ai |
| spring.ai.mistralai.api-key | API Key | - |

#### 配置属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=mistral（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 mistral 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.mistralai.embedding` 是配置 MistralAI 的 `EmbeddingModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.mistralai.embedding.enabled (已移除且不再有效) | 启用 OpenAI embedding 模型。 | true |
| spring.ai.model.embedding | 启用 OpenAI embedding 模型。 | mistral |
| spring.ai.mistralai.embedding.base-url | 可选覆盖 spring.ai.mistralai.base-url 以提供 embedding 特定的 url | - |
| spring.ai.mistralai.embedding.api-key | 可选覆盖 spring.ai.mistralai.api-key 以提供 embedding 特定的 api-key | - |
| spring.ai.mistralai.embedding.metadata-mode | 文档内容提取模式。 | EMBED |
| spring.ai.mistralai.embedding.options.model | 要使用的模型 | mistral-embed |
| spring.ai.mistralai.embedding.options.encodingFormat | 返回 embeddings 的格式。可以是 float 或 base64。 | - |

注意：您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.mistralai.base-url` 和 `spring.ai.mistralai.api-key`。
如果设置了 `spring.ai.mistralai.embedding.base-url` 和 `spring.ai.mistralai.embedding.api-key` 属性，它们优先于通用属性。
同样，如果设置了 `spring.ai.mistralai.chat.base-url` 和 `spring.ai.mistralai.chat.api-key` 属性，它们优先于通用属性。
如果您想为不同的模型和不同的模型端点使用不同的 MistralAI 账户，这很有用。

提示：所有前缀为 `spring.ai.mistralai.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-mistral-ai/src/main/java/org/springframework/ai/mistralai/MistralAiEmbeddingOptions.java[MistralAiEmbeddingOptions.java] 提供 MistralAI 配置，例如要使用的模型等。

也可以使用 `spring.ai.mistralai.embedding.options` 属性配置默认选项。

在启动时使用 `MistralAiEmbeddingModel` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `MistralAiEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
// Using mistral-embed for general text
EmbeddingResponse textEmbeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        MistralAiEmbeddingOptions.builder()
            .withModel("mistral-embed")
        .build()));

// Using codestral-embed for code
EmbeddingResponse codeEmbeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("public class HelloWorld {}", "def hello_world():"),
        MistralAiEmbeddingOptions.builder()
            .withModel("codestral-embed")
        .build()));
```

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.mistralai.api-key=YOUR_API_KEY
spring.ai.mistralai.embedding.options.model=mistral-embed
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
        var embeddingResponse = this.embeddingModel.embedForResponse(List.of(message));
        return Map.of("embedding", embeddingResponse);
    }
}
```

## 手动配置

如果您不使用 Spring Boot，可以手动配置 OpenAI Embedding Model。
为此，请将 `spring-ai-mistral-ai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mistral-ai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-mistral-ai'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

注意：`spring-ai-mistral-ai` 依赖项还提供对 `MistralAiChatModel` 的访问。
有关 `MistralAiChatModel` 的更多信息，请参阅 [MistralAI Chat Client](../../../chatmodels/more/mistralai-chat) 部分。

接下来，创建一个 `MistralAiEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var mistralAiApi = new MistralAiApi(System.getenv("MISTRAL_AI_API_KEY"));

var embeddingModel = new MistralAiEmbeddingModel(this.mistralAiApi,
        MistralAiEmbeddingOptions.builder()
                .withModel("mistral-embed")
                .withEncodingFormat("float")
                .build());

EmbeddingResponse embeddingResponse = this.embeddingModel
        .embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

`MistralAiEmbeddingOptions` 提供 embedding 请求的配置信息。
options 类提供了一个 `builder()` 以便轻松创建选项。
