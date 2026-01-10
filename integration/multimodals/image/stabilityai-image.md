# Stability AI Image Generation

Spring AI 支持 Stability AI 的 [text to image generation model](https://platform.stability.ai/docs/api-reference#tag/v1generation)。

## Prerequisites

您需要创建一个 Stability AI API key 来访问他们的 AI 模型。按照他们的 [Getting Started documentation](https://platform.stability.ai/docs/getting-started/authentication) 获取您的 API key。

Spring AI 项目定义了一个名为 `spring.ai.stabilityai.api-key` 的配置属性，您应该将其设置为从 Stability AI 获得的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.stabilityai.api-key=<your-stabilityai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    stabilityai:
      api-key: ${STABILITYAI_API_KEY}
```

```bash
# In your environment or .env file
export STABILITYAI_API_KEY=<your-stabilityai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("STABILITYAI_API_KEY");
```

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Stability AI Image Generation Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-stability-ai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-stability-ai'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Image Generation Properties

前缀 `spring.ai.stabilityai` 用作允许您连接到 Stability AI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.stabilityai.base-url | 连接的 URL | https://api.stability.ai/v1 |
| spring.ai.stabilityai.api-key | API Key | - |

> **NOTE**
> 
> 图像自动配置的启用和禁用现在通过前缀为 `spring.ai.model.image` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.image=stabilityai（默认启用）
> 
> 要禁用，spring.ai.model.image=none（或任何与 stabilityai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.stabilityai.image` 是允许您配置 Stability AI 的 `ImageModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.stabilityai.image.enabled (已移除且不再有效) | 启用 Stability AI 图像模型 | true |
| spring.ai.model.image | 启用 Stability AI 图像模型 | stabilityai |
| spring.ai.stabilityai.image.base-url | 可选覆盖 spring.ai.openai.base-url 以提供特定 url | `https://api.stability.ai/v1` |
| spring.ai.stabilityai.image.api-key | 可选覆盖 spring.ai.openai.api-key 以提供特定 api-key | - |
| spring.ai.stabilityai.image.option.n | 要生成的图像数量。必须在 1 到 10 之间 | 1 |
| spring.ai.stabilityai.image.option.model | 在 Stability AI 中使用的引擎/模型。模型作为路径参数在 URL 中传递 | `stable-diffusion-v1-6` |
| spring.ai.stabilityai.image.option.width | 要生成的图像宽度（以像素为单位），以 64 的倍数递增。应用特定于引擎的维度验证 | 512 |
| spring.ai.stabilityai.image.option.height | 要生成的图像高度（以像素为单位），以 64 的倍数递增。应用特定于引擎的维度验证 | 512 |
| spring.ai.stabilityai.image.option.responseFormat | 返回生成的图像的格式。必须是 "application/json" 或 "image/png" | - |
| spring.ai.stabilityai.image.option.cfg_scale | 扩散过程对 prompt 文本的严格程度。范围：0 到 35 | 7 |
| spring.ai.stabilityai.image.option.clip_guidance_preset | 传入样式预设以引导图像模型朝向特定样式。此样式预设列表可能会更改 | `NONE` |
| spring.ai.stabilityai.image.option.sampler | 用于扩散过程的采样器。如果省略此值，将自动选择适当的采样器 | - |
| spring.ai.stabilityai.image.option.seed | 随机噪声种子（省略此选项或使用 0 表示随机种子）。有效范围：0 到 4294967295 | 0 |
| spring.ai.stabilityai.image.option.steps | 要运行的扩散步数。有效范围：10 到 50 | 30 |
| spring.ai.stabilityai.image.option.style_preset | 传入样式预设以引导图像模型朝向特定样式。此样式预设列表可能会更改 | - |

## Runtime Options

[StabilityAiImageOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-stabilityai/src/main/java/org/springframework/ai/stabilityai/api/StabilityAiImageOptions.java) 提供模型配置，例如要使用的模型、样式、大小等。

在启动时，可以使用 `StabilityAiImageModel(StabilityAiApi stabilityAiApi, StabilityAiImageOptions options)` 构造函数配置默认选项。或者，使用前面描述的 `spring.ai.openai.image.options.*` 属性。

在运行时，您可以通过向 `ImagePrompt` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，要覆盖 Stability AI 特定选项（如质量和要创建的图像数量），请使用以下代码示例：

```java
ImageResponse response = stabilityaiImageModel.call(
        new ImagePrompt("A light cream colored mini golden doodle",
        StabilityAiImageOptions.builder()
                .stylePreset("cinematic")
                .N(4)
                .height(1024)
                .width(1024).build())

);
```

> **TIP**: 除了模型特定的 [StabilityAiImageOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-stabilityai/src/main/java/org/springframework/ai/stabilityai/api/StabilityAiImageOptions.java)，您可以使用可移植的 [ImageOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptions.java) 实例，使用 [ImageOptionsBuilder#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptionsBuilder.java) 创建。
