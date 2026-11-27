# OpenAI SDK Embeddings (Official)

Spring AI 通过 OpenAI Java SDK 支持 OpenAI 的文本 embeddings 模型，提供与 OpenAI 服务（包括 Microsoft Foundry 和 GitHub Models）的强大且官方维护的集成。

注意：此实现使用来自 OpenAI 的官方 link:https://github.com/openai/openai-java[OpenAI Java SDK]。有关替代的 Spring AI 实现，请参阅 [OpenAI Embeddings](../openai-embeddings)。

OpenAI 的文本 embeddings 测量文本字符串的相关性。
embedding 是浮点数（列表）的向量。两个向量之间的距离衡量它们的相关性。小距离表示高相关性，大距离表示低相关性。

OpenAI SDK 模块根据您提供的基础 URL 自动检测服务提供商（OpenAI、Microsoft Foundry 或 GitHub Models）。

## 身份验证

身份验证使用基础 URL 和 API Key 完成。该实现通过 Spring Boot 属性或环境变量提供灵活的配置选项。

### 使用 OpenAI

如果您直接使用 OpenAI，请在 https://platform.openai.com/signup[OpenAI 注册页面] 创建账户，并在 https://platform.openai.com/account/api-keys[API Keys 页面] 生成 API key。

基础 URL 不需要设置，因为它默认为 `https://api.openai.com/v1`：

```properties
spring.ai.openai-sdk.api-key=<your-openai-api-key>
# base-url is optional, defaults to https://api.openai.com/v1
```

或使用环境变量：

```bash
export OPENAI_API_KEY=<your-openai-api-key>
# OPENAI_BASE_URL is optional, defaults to https://api.openai.com/v1
```

### 使用 Microsoft Foundry

使用 Microsoft Foundry URL 时会自动检测 Microsoft Foundry。您可以使用属性配置它：

```properties
spring.ai.openai-sdk.base-url=https://<your-deployment-url>.openai.azure.com
spring.ai.openai-sdk.api-key=<your-api-key>
spring.ai.openai-sdk.microsoft-deployment-name=<your-deployment-name>
```

或使用环境变量：

```bash
export OPENAI_BASE_URL=https://<your-deployment-url>.openai.azure.com
export OPENAI_API_KEY=<your-api-key>
```

**无密码身份验证（推荐用于 Azure）：**

Microsoft Foundry 支持无密码身份验证，无需提供 API key，这在 Azure 上运行时更安全。

要启用无密码身份验证，请添加 `com.azure:azure-identity` 依赖项：

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

然后配置时不使用 API key：

```properties
spring.ai.openai-sdk.base-url=https://<your-deployment-url>.openai.azure.com
spring.ai.openai-sdk.microsoft-deployment-name=<your-deployment-name>
# No api-key needed - will use Azure credentials from environment
```

### 使用 GitHub Models

使用 GitHub Models 基础 URL 时会自动检测 GitHub Models。您需要创建一个具有 `models:read` 范围的 GitHub Personal Access Token (PAT)。

```properties
spring.ai.openai-sdk.base-url=https://models.inference.ai.azure.com
spring.ai.openai-sdk.api-key=github_pat_XXXXXXXXXXX
```

或使用环境变量：

```bash
export OPENAI_BASE_URL=https://models.inference.ai.azure.com
export OPENAI_API_KEY=github_pat_XXXXXXXXXXX
```

提示：为了在处理敏感信息（如 API keys）时增强安全性，您可以在属性中使用 Spring Expression Language (SpEL)：

```properties
spring.ai.openai-sdk.api-key=${OPENAI_API_KEY}
```

### 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

Spring AI 为 OpenAI SDK Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

[tabs]
======
Maven::
+
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai-sdk</artifactId>
</dependency>
```

Gradle::
+
```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai-sdk'
}
```
======

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### 配置属性

#### 连接属性

前缀 `spring.ai.openai-sdk` 用作允许您配置 OpenAI SDK 客户端的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.base-url | 要连接到的 URL。如果未设置，则从 `OPENAI_BASE_URL` 环境变量自动检测。 | https://api.openai.com/v1 |
| spring.ai.openai-sdk.api-key | API Key。如果未设置，则从 `OPENAI_API_KEY` 环境变量自动检测。 | - |
| spring.ai.openai-sdk.organization-id | 可选地指定用于 API 请求的组织。 | - |
| spring.ai.openai-sdk.timeout | 请求超时持续时间。 | - |
| spring.ai.openai-sdk.max-retries | 失败请求的最大重试次数。 | - |
| spring.ai.openai-sdk.proxy | OpenAI 客户端的代理设置（Java `Proxy` 对象）。 | - |
| spring.ai.openai-sdk.custom-headers | 要在请求中包含的自定义 HTTP 标头。标头名称到标头值的映射。 | - |

#### Microsoft Foundry 属性

OpenAI SDK 实现为 Microsoft Foundry 提供自动配置的本地支持：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.microsoft-foundry | 启用 Microsoft Foundry 模式。如果基础 URL 包含 `openai.azure.com`、`cognitiveservices.azure.com` 或 `.openai.microsoftFoundry.com`，则自动检测。 | false |
| spring.ai.openai-sdk.microsoft-deployment-name | Microsoft Foundry 部署名称。如果未指定，将使用模型名称。也可通过别名 `deployment-name` 访问。 | - |
| spring.ai.openai-sdk.microsoft-foundry-service-version | Microsoft Foundry API 服务版本。 | - |
| spring.ai.openai-sdk.credential | 用于无密码身份验证的凭据对象（需要 `com.azure:azure-identity` 依赖项）。 | - |

提示：Microsoft Foundry 支持无密码身份验证。添加 `com.azure:azure-identity` 依赖项，当未提供 API key 时，实现将自动尝试使用环境中的 Azure 凭据。

#### GitHub Models 属性

提供对 GitHub Models 的本地支持：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.github-models | 启用 GitHub Models 模式。如果基础 URL 包含 `models.github.ai` 或 `models.inference.ai.azure.com`，则自动检测。 | false |

提示：GitHub Models 需要具有 `models:read` 范围的 Personal Access Token。通过 `OPENAI_API_KEY` 环境变量或 `spring.ai.openai-sdk.api-key` 属性设置它。

#### Embedding Model 属性

前缀 `spring.ai.openai-sdk.embedding` 是配置 embedding 模型实现的属性前缀：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.embedding.metadata-mode | 文档内容提取模式。 | EMBED |
| spring.ai.openai-sdk.embedding.options.model | 要使用的模型。您可以选择以下模型：`text-embedding-ada-002`、`text-embedding-3-small`、`text-embedding-3-large`。有关更多信息，请参阅 https://platform.openai.com/docs/models[models] 页面。 | `text-embedding-ada-002` |
| spring.ai.openai-sdk.embedding.options.user | 代表您的最终用户的唯一标识符，可以帮助 OpenAI 监控和检测滥用。 | - |
| spring.ai.openai-sdk.embedding.options.dimensions | 结果输出 embeddings 应具有的维度数。仅在 `text-embedding-3` 及更高版本的模型中支持。 | - |

提示：所有前缀为 `spring.ai.openai-sdk.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkEmbeddingOptions.java[OpenAiSdkEmbeddingOptions.java] 提供 OpenAI 配置，例如要使用的模型、维度和用户标识符。

也可以使用 `spring.ai.openai-sdk.embedding.options` 属性配置默认选项。

在启动时使用 `OpenAiSdkEmbeddingModel` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `OpenAiSdkEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        OpenAiSdkEmbeddingOptions.builder()
            .model("text-embedding-3-large")
            .dimensions(1024)
        .build()));
```

提示：除了特定于模型的 https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkEmbeddingOptions.java[OpenAiSdkEmbeddingOptions] 之外，您还可以使用可移植的 link:https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/embedding/EmbeddingOptions.java[EmbeddingOptions] 实例，使用 builder 创建。

## 示例 Controller

https://start.spring.io/[创建] 一个新的 Spring Boot 项目，并将 `spring-ai-openai-sdk` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加 `application.properties` 文件以配置 OpenAI SDK embedding 模型：

```properties
spring.ai.openai-sdk.api-key=YOUR_API_KEY
spring.ai.openai-sdk.embedding.options.model=text-embedding-ada-002
```

提示：将 `api-key` 替换为您的 OpenAI 凭据。

这将创建一个 `OpenAiSdkEmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 embedding 模型的简单 `@RestController` 类示例。

```java
@RestController
public class EmbeddingController {

    private final EmbeddingModel embeddingModel;

    @Autowired
    public EmbeddingController(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @GetMapping("/ai/embedding")
    public Map<String, Object> embed(
            @RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        EmbeddingResponse embeddingResponse = this.embeddingModel.embedForResponse(List.of(message));
        return Map.of("embedding", embeddingResponse);
    }
}
```

## 手动配置

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkEmbeddingModel.java[OpenAiSdkEmbeddingModel] 实现 `EmbeddingModel` 并使用官方 OpenAI Java SDK 连接到 OpenAI 服务。

如果您不使用 Spring Boot 自动配置，可以手动配置 OpenAI SDK Embedding Model。
为此，请将 `spring-ai-openai-sdk` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-sdk</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai-sdk'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

注意：`spring-ai-openai-sdk` 依赖项还提供对 `OpenAiSdkChatModel` 和 `OpenAiSdkImageModel` 的访问。
有关 `OpenAiSdkChatModel` 的更多信息，请参阅 [OpenAI SDK Chat](../../../chatmodels/more/openai-sdk-chat) 部分。

接下来，创建一个 `OpenAiSdkEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var embeddingOptions = OpenAiSdkEmbeddingOptions.builder()
    .model("text-embedding-ada-002")
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

var embeddingModel = new OpenAiSdkEmbeddingModel(embeddingOptions);

EmbeddingResponse embeddingResponse = embeddingModel
    .embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

`OpenAiSdkEmbeddingOptions` 提供 embedding 请求的配置信息。
options 类提供了一个 `builder()` 以便轻松创建选项。

### Microsoft Foundry 配置

对于 Microsoft Foundry：

```java
var embeddingOptions = OpenAiSdkEmbeddingOptions.builder()
    .baseUrl("https://your-resource.openai.azure.com")
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .deploymentName("text-embedding-ada-002")
    .azureOpenAIServiceVersion(AzureOpenAIServiceVersion.V2024_10_01_PREVIEW)
    .azure(true)  // Enables Microsoft Foundry mode
    .build();

var embeddingModel = new OpenAiSdkEmbeddingModel(embeddingOptions);
```

提示：Microsoft Foundry 支持无密码身份验证。将 `com.azure:azure-identity` 依赖项添加到您的项目。如果您不提供 API key，实现将自动尝试使用环境中的 Azure 凭据。

### GitHub Models 配置

对于 GitHub Models：

```java
var embeddingOptions = OpenAiSdkEmbeddingOptions.builder()
    .baseUrl("https://models.inference.ai.azure.com")
    .apiKey(System.getenv("GITHUB_TOKEN"))
    .model("text-embedding-3-large")
    .githubModels(true)
    .build();

var embeddingModel = new OpenAiSdkEmbeddingModel(embeddingOptions);
```

## Observability

OpenAI SDK 实现通过 Micrometer 支持 Spring AI 的 observability 功能。
所有 embedding 模型操作都经过检测以进行监控和跟踪。

## 其他资源

* link:https://github.com/openai/openai-java[Official OpenAI Java SDK]
* link:https://platform.openai.com/docs/api-reference/embeddings[OpenAI Embeddings API Documentation]
* link:https://platform.openai.com/docs/models[OpenAI Models]
* link:https://learn.microsoft.com/en-us/azure/ai-foundry/[Microsoft Foundry Documentation]
* link:https://github.com/marketplace/models[GitHub Models]
