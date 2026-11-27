# OpenAI Image Generation

Spring AI 支持来自 OpenAI 的 DALL-E 图像生成模型。

## Prerequisites

您需要创建一个 OpenAI API key 来访问 ChatGPT 模型。

在 [OpenAI signup page](https://platform.openai.com/signup) 创建账户，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.openai.api-key` 的配置属性，您应该将其设置为从 openai.com 获得的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.openai.api-key=<your-openai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
```

```bash
# In your environment or .env file
export OPENAI_API_KEY=<your-openai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("OPENAI_API_KEY");
```

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 OpenAI Image Generation Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Image Generation Properties

#### Connection Properties

前缀 `spring.ai.openai` 用作允许您连接到 OpenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai.base-url | 连接的 URL | https://api.openai.com |
| spring.ai.openai.api-key | API Key | - |
| spring.ai.openai.organization-id | 可选，您可以指定用于 API 请求的组织 | - |
| spring.ai.openai.project-id | 可选，您可以指定用于 API 请求的项目 | - |

> **TIP**: 对于属于多个组织的用户（或通过其旧版用户 API key 访问其项目），可选地，您可以指定用于 API 请求的组织和项目。
> 这些 API 请求的使用量将计入指定的组织和项目。

#### Retry Properties

前缀 `spring.ai.retry` 用作允许您配置 OpenAI Image 客户端的重试机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.retry.max-attempts | 最大重试尝试次数 | 10 |
| spring.ai.retry.backoff.initial-interval | 指数退避策略的初始睡眠持续时间 | 2 sec. |
| spring.ai.retry.backoff.multiplier | 退避间隔乘数 | 5 |
| spring.ai.retry.backoff.max-interval | 最大退避持续时间 | 3 min. |
| spring.ai.retry.on-client-errors | 如果为 false，抛出 NonTransientAiException，并且不对 `4xx` 客户端错误代码尝试重试 | false |
| spring.ai.retry.exclude-on-http-codes | 不应触发重试的 HTTP 状态代码列表（例如，抛出 NonTransientAiException） | empty |
| spring.ai.retry.on-http-codes | 应触发重试的 HTTP 状态代码列表（例如，抛出 TransientAiException） | empty |

#### Configuration Properties

> **NOTE**
> 
> 图像自动配置的启用和禁用现在通过前缀为 `spring.ai.model.image` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.image=openai（默认启用）
> 
> 要禁用，spring.ai.model.image=none（或任何与 openai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.openai.image` 是允许您配置 OpenAI 的 `ImageModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai.image.enabled (已移除且不再有效) | 启用 OpenAI 图像模型 | true |
| spring.ai.model.image | 启用 OpenAI 图像模型 | openai |
| spring.ai.openai.image.base-url | 可选覆盖 spring.ai.openai.base-url 以提供特定于聊天的 url | - |
| spring.ai.openai.image.api-key | 可选覆盖 spring.ai.openai.api-key 以提供特定于聊天的 api-key | - |
| spring.ai.openai.image.organization-id | 可选，您可以指定用于 API 请求的组织 | - |
| spring.ai.openai.image.project-id | 可选，您可以指定用于 API 请求的项目 | - |
| spring.ai.openai.image.options.n | 要生成的图像数量。必须在 1 到 10 之间。对于 dall-e-3，仅支持 n=1 | - |
| spring.ai.openai.image.options.model | 用于图像生成的模型 | OpenAiImageApi.DEFAULT_IMAGE_MODEL |
| spring.ai.openai.image.options.quality | 将生成的图像质量。HD 创建具有更精细细节和更大一致性的图像。此参数仅支持 dall-e-3 | - |
| spring.ai.openai.image.options.response_format | 返回生成的图像的格式。必须是 URL 或 b64_json 之一 | - |
| spring.ai.openai.image.options.size | 生成的图像大小。对于 dall-e-2，必须是 256x256、512x512 或 1024x1024 之一。对于 dall-e-3 模型，必须是 1024x1024、1792x1024 或 1024x1792 之一 | - |
| spring.ai.openai.image.options.size_width | 生成的图像宽度。对于 dall-e-2，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai.image.options.size_height | 生成的图像高度。对于 dall-e-2，必须是 256、512 或 1024 之一 | - |
| spring.ai.openai.image.options.style | 生成的图像样式。必须是 vivid 或 natural 之一。Vivid 使模型倾向于生成超真实和戏剧性的图像。Natural 使模型产生更自然、不那么超真实的图像。此参数仅支持 dall-e-3 | - |
| spring.ai.openai.image.options.user | 代表您的最终用户的唯一标识符，可以帮助 OpenAI 监控和检测滥用 | - |

> **NOTE**: 您可以覆盖通用的 `spring.ai.openai.base-url`、`spring.ai.openai.api-key`、`spring.ai.openai.organization-id` 和 `spring.ai.openai.project-id` 属性。
> 如果设置了 `spring.ai.openai.image.base-url`、`spring.ai.openai.image.api-key`、`spring.ai.openai.image.organization-id` 和 `spring.ai.openai.image.project-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 OpenAI 账户，这很有用。

> **TIP**: 所有以 `spring.ai.openai.image.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

[OpenAiImageOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiImageOptions.java) 提供模型配置，例如要使用的模型、质量、大小等。

在启动时，可以使用 `OpenAiImageModel(OpenAiImageApi openAiImageApi)` 构造函数和 `withDefaultOptions(OpenAiImageOptions defaultOptions)` 方法配置默认选项。或者，使用前面描述的 `spring.ai.openai.image.options.*` 属性。

在运行时，您可以通过向 `ImagePrompt` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，要覆盖 OpenAI 特定选项（如质量和要创建的图像数量），请使用以下代码示例：

```java
ImageResponse response = openaiImageModel.call(
        new ImagePrompt("A light cream colored mini golden doodle",
        OpenAiImageOptions.builder()
                .quality("hd")
                .N(4)
                .height(1024)
                .width(1024).build())

);
```

> **TIP**: 除了模型特定的 [OpenAiImageOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiImageOptions.java)，您可以使用可移植的 [ImageOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptions.java) 实例，使用 [ImageOptionsBuilder#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptionsBuilder.java) 创建。
