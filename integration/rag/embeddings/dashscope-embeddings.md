# DashScope Embeddings

Spring AI Alibaba 支持阿里云 DashScope 的文本 embeddings 模型。
DashScope 的文本 embeddings 测量文本字符串的相关性。
embedding 是浮点数（列表）的向量。两个向量之间的距离衡量它们的相关性。小距离表示高相关性，大距离表示低相关性。

## 先决条件

您需要使用阿里云 DashScope 创建 API Key 才能访问 DashScope embeddings 模型。

在 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建账户，并在 [API Keys 页面](https://dashscope.console.aliyun.com/apiKey) 生成 API Key。

Spring AI Alibaba 项目定义了一个名为 `spring.ai.dashscope.api-key` 的配置属性，您应将其设置为从 DashScope 控制台获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.dashscope.api-key=<your-dashscope-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```

```bash
# In your environment or .env file
export AI_DASHSCOPE_API_KEY=<your-dashscope-api-key>
```

您还可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("AI_DASHSCOPE_API_KEY");
```

### 添加仓库和 BOM

Spring AI Alibaba 工件发布在 Maven Central 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI Alibaba 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI Alibaba。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建系统。

## 自动配置

Spring AI Alibaba 为 DashScope Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope'
}
```

提示：请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件。

### Embedding 属性

#### Retry 属性

前缀 `spring.ai.retry` 用作允许您配置 DashScope Embedding 模型的重试机制的属性前缀。

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

前缀 `spring.ai.dashscope` 用作允许您连接到 DashScope 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.dashscope.base-url | 要连接到的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.api-key | API Key | - |
| spring.ai.dashscope.work-space-id | 可选地，您可以指定用于 API 请求的工作空间 ID。 | - |

提示：对于属于多个工作空间的用户，您可以可选地指定用于 API 请求的工作空间 ID。
这些 API 请求的使用将计入指定工作空间的使用量。

#### 配置属性

> **注意**
> 
> 现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。
>
> 要启用，spring.ai.model.embedding=dashscope
>
> 要禁用，spring.ai.model.embedding=none（或任何不匹配 dashscope 的值）
>
> 进行此更改是为了允许配置多个模型。

前缀 `spring.ai.dashscope.embedding` 是配置 DashScope 的 `EmbeddingModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.embedding | 启用 DashScope embedding 模型。 | dashscope |
| spring.ai.dashscope.embedding.base-url | 可选覆盖 `spring.ai.dashscope.base-url` 以提供 embedding 特定的 url | - |
| spring.ai.dashscope.embedding.api-key | 可选覆盖 `spring.ai.dashscope.api-key` 以提供 embedding 特定的 api-key | - |
| spring.ai.dashscope.embedding.work-space-id | 可选地，您可以指定用于 API 请求的工作空间 ID。 | - |
| spring.ai.dashscope.embedding.metadata-mode | 文档内容提取模式。 | EMBED |
| spring.ai.dashscope.embedding.options.model | 要使用的模型。可用模型：`text-embedding-v2`（默认）、`text-embedding-v1`、`text-embedding-v3`、`text-embedding-v4`、`qwen2.5-vl-embedding`、`tongyi-embedding-vision-plus` | text-embedding-v2 |
| spring.ai.dashscope.embedding.options.text-type | 文本类型。可以是 `query` 或 `document`。用于区分查询文本和文档文本，以优化 embedding 质量 | document |
| spring.ai.dashscope.embedding.options.dimensions | 结果输出 embeddings 应具有的维度数。不同模型支持不同的维度：`text-embedding-v3` 支持 1,024（默认）、768、512、256、128 或 64；`text-embedding-v4` 支持 2,048、1,536、1,024（默认）、768、512、256、128 或 64 | - |

注意：您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.dashscope.base-url` 和 `spring.ai.dashscope.api-key`。
如果设置了 `spring.ai.dashscope.embedding.base-url` 和 `spring.ai.dashscope.embedding.api-key` 属性，它们优先于通用属性。
同样，如果设置了 `spring.ai.dashscope.chat.base-url` 和 `spring.ai.dashscope.chat.api-key` 属性，它们优先于通用属性。
如果您想为不同的模型和不同的模型端点使用不同的 DashScope 账户，这很有用。

提示：所有前缀为 `spring.ai.dashscope.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的选项在运行时覆盖。

## 运行时选项

`DashScopeEmbeddingOptions` 提供 DashScope 配置，例如要使用的模型、文本类型、维度等。

也可以使用 `spring.ai.dashscope.embedding.options` 属性配置默认选项。

在启动时使用 `DashScopeEmbeddingModel` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `DashScopeEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称和文本类型：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        DashScopeEmbeddingOptions.builder()
            .model(DashScopeModel.EmbeddingModel.EMBEDDING_V3.getValue())
            .textType(DashScopeModel.EmbeddingTextType.QUERY.getValue())
            .dimensions(512)
            .build()));
```

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.dashscope.api-key=YOUR_API_KEY
spring.ai.dashscope.embedding.options.model=text-embedding-v2
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

如果您不使用 Spring Boot，可以手动配置 DashScope Embedding Model。
为此，请将 `spring-ai-alibaba-dashscope` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-dashscope</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-dashscope'
}
```

提示：请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件。

注意：`spring-ai-alibaba-dashscope` 依赖项还提供对 `DashScopeChatModel` 的访问。
有关 `DashScopeChatModel` 的更多信息，请参阅 [DashScope Chat Client](../chatmodels/dashScope.md) 部分。

接下来，创建一个 `DashScopeEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var dashScopeApi = DashScopeApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var embeddingModel = new DashScopeEmbeddingModel(
    dashScopeApi,
    MetadataMode.EMBED,
    DashScopeEmbeddingOptions.builder()
        .model(DashScopeModel.EmbeddingModel.EMBEDDING_V2.getValue())
        .textType(DashScopeModel.EmbeddingTextType.DOCUMENT.getValue())
        .build(),
    RetryUtils.DEFAULT_RETRY_TEMPLATE);

EmbeddingResponse embeddingResponse = embeddingModel
    .embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

`DashScopeEmbeddingOptions` 提供 embedding 请求的配置信息。
api 和 options 类提供了一个 `builder()` 以便轻松创建选项。

## Supported Models

DashScope 支持多种 embedding 模型：

### Text Embedding 系列
- `text-embedding-v1` - 基础版本，维度：1536
- `text-embedding-v2` - 增强版本（默认），维度：1536
- `text-embedding-v3` - 支持自定义维度：1,024（默认）、768、512、256、128 或 64
- `text-embedding-v4` - 支持自定义维度：2,048、1,536、1,024（默认）、768、512、256、128 或 64

### Vision Embedding 系列
- `qwen2.5-vl-embedding` - 通义千问多模态 embedding 模型
- `tongyi-embedding-vision-plus` - 通义多模态 embedding 增强版

更多模型信息请参考 [DashScope 模型列表](https://help.aliyun.com/zh/model-studio/getting-started/models)。

## Text Type

DashScope 支持两种文本类型，用于区分查询文本和文档文本，以优化 embedding 质量：

- `query` - 用于查询文本，通常较短，用于搜索和匹配
- `document` - 用于文档文本（默认），通常较长，用于被搜索的内容

```java
// 为查询文本生成 embedding
DashScopeEmbeddingOptions queryOptions = DashScopeEmbeddingOptions.builder()
    .model(DashScopeModel.EmbeddingModel.EMBEDDING_V2.getValue())
    .textType(DashScopeModel.EmbeddingTextType.QUERY.getValue())
    .build();

EmbeddingResponse queryEmbedding = embeddingModel.call(
    new EmbeddingRequest(List.of("What is AI?"), queryOptions));

// 为文档文本生成 embedding
DashScopeEmbeddingOptions docOptions = DashScopeEmbeddingOptions.builder()
    .model(DashScopeModel.EmbeddingModel.EMBEDDING_V2.getValue())
    .textType(DashScopeModel.EmbeddingTextType.DOCUMENT.getValue())
    .build();

EmbeddingResponse docEmbedding = embeddingModel.call(
    new EmbeddingRequest(List.of("Artificial Intelligence is..."), docOptions));
```

## Custom Dimensions

`text-embedding-v3` 和 `text-embedding-v4` 支持自定义维度，允许您根据应用需求调整 embedding 向量的维度：

```java
// 使用 text-embedding-v3 生成 512 维的 embedding
DashScopeEmbeddingOptions options = DashScopeEmbeddingOptions.builder()
    .model(DashScopeModel.EmbeddingModel.EMBEDDING_V3.getValue())
    .dimensions(512)  // 可选：1024（默认）、768、512、256、128、64
    .build();

EmbeddingResponse response = embeddingModel.call(
    new EmbeddingRequest(List.of("Sample text"), options));
```

## Example Code

完整的示例代码可以参考项目中的测试文件，展示了如何使用 DashScope Embedding API 的各种功能。
