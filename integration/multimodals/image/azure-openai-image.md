# Azure OpenAI Image Generation

Spring AI 支持来自 Azure OpenAI 的 DALL-E 图像生成模型。

## Prerequisites

从 [Azure Portal](https://portal.azure.com) 的 Azure OpenAI Service 部分获取您的 Azure OpenAI `endpoint` 和 `api-key`。

Spring AI 定义了两个配置属性：

1. `spring.ai.azure.openai.api-key`：将其设置为从 Azure 获得的 `API Key` 的值。
2. `spring.ai.azure.openai.endpoint`：将其设置为在 Azure 中配置模型时获得的端点 URL。

您可以在 `application.properties` 文件中设置这些配置属性：

```properties
spring.ai.azure.openai.api-key=<your-azure-openai-api-key>
spring.ai.azure.openai.endpoint=<your-azure-openai-endpoint>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    azure:
      openai:
        api-key: ${AZURE_OPENAI_API_KEY}
        endpoint: ${AZURE_OPENAI_ENDPOINT}
```

```bash
# In your environment or .env file
export AZURE_OPENAI_API_KEY=<your-azure-openai-api-key>
export AZURE_OPENAI_ENDPOINT=<your-azure-openai-endpoint>
```

您也可以在应用程序代码中以编程方式设置这些配置：

```java
// Retrieve API key and endpoint from secure sources or environment variables
String apiKey = System.getenv("AZURE_OPENAI_API_KEY");
String endpoint = System.getenv("AZURE_OPENAI_ENDPOINT");
```

### Deployment Name

要运行 Azure AI 应用程序，请通过 [Azure AI Portal](https://oai.azure.com/portal) 创建 Azure AI Deployment。

在 Azure 中，每个客户端必须指定一个 `Deployment Name` 来连接到 Azure OpenAI 服务。

必须理解 `Deployment Name` 与您选择部署的模型不同。

例如，名为 'MyImgAiDeployment' 的部署可以配置为使用 `Dalle3` 模型或 `Dalle2` 模型。

现在，为了简单起见，您可以使用以下设置创建部署：

Deployment Name: `MyImgAiDeployment`
Model Name: `Dalle3`

此 Azure 配置将与 Spring Boot Azure AI Starter 及其自动配置功能的默认配置对齐。

如果您使用不同的 Deployment Name，请相应地更新配置属性：

```
spring.ai.azure.openai.image.options.deployment-name=<my deployment name>
```

Azure OpenAI 和 OpenAI 的不同部署结构导致 Azure OpenAI 客户端库中有一个名为 `deploymentOrModelName` 的属性。
这是因为在 OpenAI 中没有 `Deployment Name`，只有 `Model Name`。

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 存储库中。
请参考 [Artifact Repositories](getting-started.md#artifact-repositories) 部分，将这些存储库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单）以确保在整个项目中使用一致版本的 Spring AI。请参考 [Dependency Management](getting-started.md#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Azure OpenAI Chat Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-azure-openai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-azure-openai'
}
```

> **TIP**: 请参考 [Dependency Management](getting-started.md#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Image Generation Properties

> **NOTE**
> 
> 图像自动配置的启用和禁用现在通过前缀为 `spring.ai.model.image` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.image=azure-openai（默认启用）
> 
> 要禁用，spring.ai.model.image=none（或任何与 azure-openai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.openai.image` 是允许您配置 OpenAI 的 `ImageModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.azure.openai.image.enabled (已移除且不再有效) | 启用 OpenAI 图像模型 | true |
| spring.ai.model.image | 启用 OpenAI 图像模型 | azure-openai |
| spring.ai.azure.openai.image.options.n | 要生成的图像数量。必须在 1 到 10 之间。对于 dall-e-3，仅支持 n=1 | - |
| spring.ai.azure.openai.image.options.model | 用于图像生成的模型 | AzureOpenAiImageOptions.DEFAULT_IMAGE_MODEL |
| spring.ai.azure.openai.image.options.quality | 将生成的图像质量。HD 创建具有更精细细节和更大一致性的图像。此参数仅支持 dall-e-3 | - |
| spring.ai.azure.openai.image.options.response_format | 返回生成的图像的格式。必须是 URL 或 b64_json 之一 | - |
| spring.ai.openai.image.options.size | 生成的图像大小。对于 dall-e-2，必须是 256x256、512x512 或 1024x1024 之一。对于 dall-e-3 模型，必须是 1024x1024、1792x1024 或 1024x1792 之一 | - |
| spring.ai.openai.image.options.size_width | 生成的图像宽度。对于 dall-e-2，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai.image.options.size_height | 生成的图像高度。对于 dall-e-2，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai.image.options.style | 生成的图像样式。必须是 vivid 或 natural 之一。Vivid 使模型倾向于生成超真实和戏剧性的图像。Natural 使模型产生更自然、不那么超真实的图像。此参数仅支持 dall-e-3 | - |
| spring.ai.openai.image.options.user | 代表您的最终用户的唯一标识符，可以帮助 Azure OpenAI 监控和检测滥用 | - |

#### Connection Properties

前缀 `spring.ai.openai` 用作允许您连接到 Azure OpenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.azure.openai.endpoint | 连接的 URL | https://my-dalle3.openai.azure.com/ |
| spring.ai.azure.openai.apiKey | API Key | - |

## Runtime Options

[OpenAiImageOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiImageOptions.java) 提供模型配置，例如要使用的模型、质量、大小等。

在启动时，可以使用 `AzureOpenAiImageModel(OpenAiImageApi openAiImageApi)` 构造函数和 `withDefaultOptions(OpenAiImageOptions defaultOptions)` 方法配置默认选项。或者，使用前面描述的 `spring.ai.azure.openai.image.options.*` 属性。

在运行时，您可以通过向 `ImagePrompt` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，要覆盖 OpenAI 特定选项（如质量和要创建的图像数量），请使用以下代码示例：

```java
ImageResponse response = azureOpenaiImageModel.call(
        new ImagePrompt("A light cream colored mini golden doodle",
        OpenAiImageOptions.builder()
                .quality("hd")
                .N(4)
                .height(1024)
                .width(1024).build())

);
```

> **TIP**: 除了模型特定的 [AzureOpenAiImageOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-azure-openai/src/main/java/org/springframework/ai/azure/openai/AzureOpenAiImageOptions.java)，您可以使用可移植的 [ImageOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptions.java) 实例，使用 [ImageOptionsBuilder#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptionsBuilder.java) 创建。
