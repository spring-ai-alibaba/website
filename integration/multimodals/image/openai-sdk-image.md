# OpenAI SDK Image Generation (Official)

Spring AI 通过 OpenAI Java SDK 支持 OpenAI 的 DALL-E 图像生成模型，提供与 OpenAI 服务（包括 Microsoft Foundry 和 GitHub Models）的强大且官方维护的集成。

> **NOTE**: 此实现使用来自 OpenAI 的官方 [OpenAI Java SDK](https://github.com/openai/openai-java)。有关替代的 Spring AI 实现，请参阅 [OpenAI Image Generation](openai-image.md)。

DALL-E 是来自 OpenAI 的最先进的图像生成模型，可以从自然语言描述创建逼真的图像和艺术作品。

OpenAI SDK 模块根据您提供的基础 URL 自动检测服务提供者（OpenAI、Microsoft Foundry 或 GitHub Models）。

## Authentication

使用基础 URL 和 API Key 进行身份验证。该实现通过 Spring Boot 属性或环境变量提供灵活的配置选项。

### Using OpenAI

如果您直接使用 OpenAI，请在 [OpenAI signup page](https://platform.openai.com/signup) 创建账户，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 API key。

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

### Using Microsoft Foundry

当使用 Microsoft Foundry URL 时，Microsoft Foundry 会自动检测。您可以使用属性配置它：

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

**Passwordless Authentication (Recommended for Azure):**

Microsoft Foundry 支持无密码身份验证，无需提供 API key，在 Azure 上运行时更安全。

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

### Using GitHub Models

当使用 GitHub Models 基础 URL 时，GitHub Models 会自动检测。您需要创建一个具有 `models:read` 范围的 GitHub Personal Access Token (PAT)。

```properties
spring.ai.openai-sdk.base-url=https://models.inference.ai.azure.com
spring.ai.openai-sdk.api-key=github_pat_XXXXXXXXXXX
```

或使用环境变量：

```bash
export OPENAI_BASE_URL=https://models.inference.ai.azure.com
export OPENAI_API_KEY=github_pat_XXXXXXXXXXX
```

> **TIP**: 为了在处理敏感信息（如 API keys）时增强安全性，您可以在属性中使用 Spring Expression Language (SpEL)：

```properties
spring.ai.openai-sdk.api-key=${OPENAI_API_KEY}
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 存储库中。
请参考 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些存储库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单）以确保在整个项目中使用一致版本的 Spring AI。请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## Auto-configuration

Spring AI 为 OpenAI SDK Image Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

**Maven:**

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai-sdk</artifactId>
</dependency>
```

**Gradle:**

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai-sdk'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Configuration Properties

#### Connection Properties

前缀 `spring.ai.openai-sdk` 用作允许您配置 OpenAI SDK 客户端的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.base-url | 连接的 URL。如果未设置，则从 `OPENAI_BASE_URL` 环境变量自动检测 | https://api.openai.com/v1 |
| spring.ai.openai-sdk.api-key | API Key。如果未设置，则从 `OPENAI_API_KEY` 环境变量自动检测 | - |
| spring.ai.openai-sdk.organization-id | 可选，指定用于 API 请求的组织 | - |
| spring.ai.openai-sdk.timeout | 请求超时持续时间 | - |
| spring.ai.openai-sdk.max-retries | 失败请求的最大重试尝试次数 | - |
| spring.ai.openai-sdk.proxy | OpenAI 客户端的代理设置（Java `Proxy` 对象） | - |
| spring.ai.openai-sdk.custom-headers | 要在请求中包含的自定义 HTTP 标头。标头名称到标头值的映射 | - |

#### Microsoft Foundry Properties

OpenAI SDK 实现为 Microsoft Foundry 提供原生支持，具有自动配置：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.microsoft-foundry | 启用 Microsoft Foundry 模式。如果基础 URL 包含 `openai.azure.com`、`cognitiveservices.azure.com` 或 `.openai.microsoftFoundry.com`，则自动检测 | false |
| spring.ai.openai-sdk.microsoft-deployment-name | Microsoft Foundry 部署名称。如果未指定，将使用模型名称。也可通过别名 `deployment-name` 访问 | - |
| spring.ai.openai-sdk.microsoft-foundry-service-version | Microsoft Foundry API 服务版本 | - |
| spring.ai.openai-sdk.credential | 用于无密码身份验证的凭据对象（需要 `com.azure:azure-identity` 依赖项） | - |

> **TIP**: Microsoft Foundry 支持无密码身份验证。添加 `com.azure:azure-identity` 依赖项，当未提供 API key 时，实现将自动尝试使用环境中的 Azure 凭据。

#### GitHub Models Properties

提供对 GitHub Models 的原生支持：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.github-models | 启用 GitHub Models 模式。如果基础 URL 包含 `models.github.ai` 或 `models.inference.ai.azure.com`，则自动检测 | false |

> **TIP**: GitHub Models 需要具有 `models:read` 范围的 Personal Access Token。通过 `OPENAI_API_KEY` 环境变量或 `spring.ai.openai-sdk.api-key` 属性设置它。

#### Image Model Properties

前缀 `spring.ai.openai-sdk.image` 是用于配置图像模型实现的属性前缀：

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai-sdk.image.options.model | 用于图像生成的模型。可用模型：`dall-e-2`、`dall-e-3`。有关更多信息，请参阅 [models](https://platform.openai.com/docs/models) 页面 | `dall-e-3` |
| spring.ai.openai-sdk.image.options.n | 要生成的图像数量。必须在 1 到 10 之间。对于 `dall-e-3`，仅支持 n=1 | - |
| spring.ai.openai-sdk.image.options.quality | 将生成的图像质量。`hd` 创建具有更精细细节和更大一致性的图像。此参数仅支持 `dall-e-3`。可用值：`standard`、`hd` | - |
| spring.ai.openai-sdk.image.options.response-format | 返回生成的图像的格式。必须是 `url` 或 `b64_json` 之一 | - |
| spring.ai.openai-sdk.image.options.size | 生成的图像大小。对于 `dall-e-2`，必须是 `256x256`、`512x512` 或 `1024x1024` 之一。对于 `dall-e-3` 模型，必须是 `1024x1024`、`1792x1024` 或 `1024x1792` 之一 | - |
| spring.ai.openai-sdk.image.options.width | 生成的图像宽度。对于 `dall-e-2`，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai-sdk.image.options.height | 生成的图像高度。对于 `dall-e-2`，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai-sdk.image.options.style | 生成的图像样式。必须是 `vivid` 或 `natural` 之一。Vivid 使模型倾向于生成超真实和戏剧性的图像。Natural 使模型产生更自然、不那么超真实的图像。此参数仅支持 `dall-e-3` | - |
| spring.ai.openai-sdk.image.options.user | 代表您的最终用户的唯一标识符，可以帮助 OpenAI 监控和检测滥用 | - |

> **TIP**: 所有以 `spring.ai.openai-sdk.image.options` 为前缀的属性都可以通过在 `ImagePrompt` 调用中添加特定于请求的 [image-options](#runtime-options) 在运行时覆盖。

## Runtime Options

[OpenAiSdkImageOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkImageOptions.java) 提供 OpenAI 配置，例如要使用的模型、质量、大小、样式和要生成的图像数量。

也可以使用 `spring.ai.openai-sdk.image.options` 属性配置默认选项。

在启动时，使用 `OpenAiSdkImageModel` 构造函数设置用于所有图像生成请求的默认选项。
在运行时，您可以使用 `OpenAiSdkImageOptions` 实例作为 `ImagePrompt` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型和质量：

```java
ImageResponse response = imageModel.call(
    new ImagePrompt("A light cream colored mini golden doodle",
        OpenAiSdkImageOptions.builder()
            .model("dall-e-3")
            .quality("hd")
            .N(1)
            .width(1024)
            .height(1024)
            .style("vivid")
        .build()));
```

> **TIP**: 除了模型特定的 [OpenAiSdkImageOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkImageOptions.java)，您可以使用可移植的 [ImageOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptions.java) 实例，使用 [ImageOptionsBuilder#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptionsBuilder.java) 创建。

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-openai-sdk` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件来配置 OpenAI SDK 图像模型：

```properties
spring.ai.openai-sdk.api-key=YOUR_API_KEY
spring.ai.openai-sdk.image.options.model=dall-e-3
```

> **TIP**: 将 `api-key` 替换为您的 OpenAI 凭据。

这将创建一个 `OpenAiSdkImageModel` 实现，您可以将其注入到您的类中。
以下是一个使用图像模型的简单 `@RestController` 类示例。

```java
@RestController
public class ImageController {

    private final ImageModel imageModel;

    @Autowired
    public ImageController(ImageModel imageModel) {
        this.imageModel = imageModel;
    }

    @GetMapping("/ai/image")
    public Map<String, Object> generateImage(
            @RequestParam(value = "prompt", defaultValue = "A light cream colored mini golden doodle") String prompt) {
        ImageResponse response = this.imageModel.call(
            new ImagePrompt(prompt,
                OpenAiSdkImageOptions.builder()
                    .quality("hd")
                    .N(1)
                    .width(1024)
                    .height(1024)
                .build()));
        
        String imageUrl = response.getResult().getOutput().getUrl();
        return Map.of("url", imageUrl);
    }
}
```

## Manual Configuration

[OpenAiSdkImageModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai-sdk/src/main/java/org/springframework/ai/openaisdk/OpenAiSdkImageModel.java) 实现 `ImageModel` 并使用官方 OpenAI Java SDK 连接到 OpenAI 服务。

如果您不使用 Spring Boot 自动配置，可以手动配置 OpenAI SDK Image Model。
为此，请将 `spring-ai-openai-sdk` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-sdk</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai-sdk'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

> **NOTE**: `spring-ai-openai-sdk` 依赖项还提供对 `OpenAiSdkChatModel` 和 `OpenAiSdkEmbeddingModel` 的访问。
> 有关 `OpenAiSdkChatModel` 的更多信息，请参阅 [OpenAI SDK Chat](../../chatmodels/more/openai-sdk-chat.md) 部分。

接下来，创建一个 `OpenAiSdkImageModel` 实例并使用它生成图像：

```java
var imageOptions = OpenAiSdkImageOptions.builder()
    .model("dall-e-3")
    .quality("hd")
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

var imageModel = new OpenAiSdkImageModel(imageOptions);

ImageResponse response = imageModel.call(
    new ImagePrompt("A light cream colored mini golden doodle",
        OpenAiSdkImageOptions.builder()
            .N(1)
            .width(1024)
            .height(1024)
        .build()));
```

`OpenAiSdkImageOptions` 提供图像生成请求的配置信息。
选项类提供了一个 `builder()` 用于轻松创建选项。

### Microsoft Foundry Configuration

对于 Microsoft Foundry：

```java
var imageOptions = OpenAiSdkImageOptions.builder()
    .baseUrl("https://your-resource.openai.azure.com")
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .deploymentName("dall-e-3")
    .azureOpenAIServiceVersion(AzureOpenAIServiceVersion.V2024_10_01_PREVIEW)
    .azure(true)  // Enables Microsoft Foundry mode
    .build();

var imageModel = new OpenAiSdkImageModel(imageOptions);
```

> **TIP**: Microsoft Foundry 支持无密码身份验证。将 `com.azure:azure-identity` 依赖项添加到您的项目。如果您不提供 API key，实现将自动尝试使用环境中的 Azure 凭据。

### GitHub Models Configuration

对于 GitHub Models：

```java
var imageOptions = OpenAiSdkImageOptions.builder()
    .baseUrl("https://models.inference.ai.azure.com")
    .apiKey(System.getenv("GITHUB_TOKEN"))
    .model("dall-e-3")
    .githubModels(true)
    .build();

var imageModel = new OpenAiSdkImageModel(imageOptions);
```

## Observability

OpenAI SDK 实现通过 Micrometer 支持 Spring AI 的可观测性功能。
所有图像模型操作都经过检测以进行监控和跟踪。

## Additional Resources

* [Official OpenAI Java SDK](https://github.com/openai/openai-java)
* [OpenAI Images API Documentation](https://platform.openai.com/docs/api-reference/images)
* [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/images)
* [OpenAI Models](https://platform.openai.com/docs/models)
* [Microsoft Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/)
* [GitHub Models](https://github.com/marketplace/models)
