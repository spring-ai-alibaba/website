# ZhiPuAI Image Generation

Spring AI 支持来自 ZhiPuAI 的 CogView 图像生成模型。

## Prerequisites

您需要创建一个 ZhiPuAI API 来访问 ZhiPu AI 语言模型。

在 [ZhiPu AI registration page](https://open.bigmodel.cn/login) 创建账户，并在 [API Keys page](https://open.bigmodel.cn/usercenter/apikeys) 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.zhipuai.api-key` 的配置属性，您应该将其设置为从 API Keys 页面获得的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.zhipuai.api-key=<your-zhipuai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    zhipuai:
      api-key: ${ZHIPUAI_API_KEY}
```

```bash
# In your environment or .env file
export ZHIPUAI_API_KEY=<your-zhipuai-api-key>
```

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("ZHIPUAI_API_KEY");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 存储库中。
请参考 [Artifact Repositories](getting-started.md#artifact-repositories) 部分，将这些存储库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单）以确保在整个项目中使用一致版本的 Spring AI。请参考 [Dependency Management](getting-started.md#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 ZhiPuAI Chat Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-zhipuai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-zhipuai'
}
```

> **TIP**: 请参考 [Dependency Management](getting-started.md#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Image Generation Properties

> **NOTE**
> 
> 图像自动配置的启用和禁用现在通过前缀为 `spring.ai.model.image` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.image=stabilityai（默认启用）
> 
> 要禁用，spring.ai.model.image=none（或任何与 stabilityai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.zhipuai.image` 是允许您配置 ZhiPuAI 的 `ImageModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.image.enabled (已移除且不再有效) | 启用 ZhiPuAI 图像模型 | true |
| spring.ai.model.image | 启用 ZhiPuAI 图像模型 | zhipuai |
| spring.ai.zhipuai.image.base-url | 可选覆盖 spring.ai.zhipuai.base-url 以提供特定于聊天的 url | - |
| spring.ai.zhipuai.image.api-key | 可选覆盖 spring.ai.zhipuai.api-key 以提供特定于聊天的 api-key | - |
| spring.ai.zhipuai.image.options.model | 用于图像生成的模型 | cogview-3 |
| spring.ai.zhipuai.image.options.user | 代表您的最终用户的唯一标识符，可以帮助 ZhiPuAI 监控和检测滥用 | - |

#### Connection Properties

前缀 `spring.ai.zhipuai` 用作允许您连接到 ZhiPuAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.base-url | 连接的 URL | https://open.bigmodel.cn/api/paas |
| spring.ai.zhipuai.api-key | API Key | - |

#### Configuration Properties

#### Retry Properties

前缀 `spring.ai.retry` 用作允许您配置 ZhiPuAI Image 客户端的重试机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.retry.max-attempts | 最大重试尝试次数 | 10 |
| spring.ai.retry.backoff.initial-interval | 指数退避策略的初始睡眠持续时间 | 2 sec. |
| spring.ai.retry.backoff.multiplier | 退避间隔乘数 | 5 |
| spring.ai.retry.backoff.max-interval | 最大退避持续时间 | 3 min. |
| spring.ai.retry.on-client-errors | 如果为 false，抛出 NonTransientAiException，并且不对 `4xx` 客户端错误代码尝试重试 | false |
| spring.ai.retry.exclude-on-http-codes | 不应触发重试的 HTTP 状态代码列表（例如，抛出 NonTransientAiException） | empty |
| spring.ai.retry.on-http-codes | 应触发重试的 HTTP 状态代码列表（例如，抛出 TransientAiException） | empty |

## Runtime Options

[ZhiPuAiImageOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiImageOptions.java) 提供模型配置，例如要使用的模型、质量、大小等。

在启动时，可以使用 `ZhiPuAiImageModel(ZhiPuAiImageApi zhiPuAiImageApi)` 构造函数和 `withDefaultOptions(ZhiPuAiImageOptions defaultOptions)` 方法配置默认选项。或者，使用前面描述的 `spring.ai.zhipuai.image.options.*` 属性。

在运行时，您可以通过向 `ImagePrompt` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，要覆盖 ZhiPuAI 特定选项（如质量和要创建的图像数量），请使用以下代码示例：

```java
ImageResponse response = zhiPuAiImageModel.call(
        new ImagePrompt("A light cream colored mini golden doodle",
        ZhiPuAiImageOptions.builder()
                .quality("hd")
                .N(4)
                .height(1024)
                .width(1024).build())

);
```

> **TIP**: 除了模型特定的 [ZhiPuAiImageOptions](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiImageOptions.java)，您可以使用可移植的 [ImageOptions](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptions.java) 实例，使用 [ImageOptionsBuilder#builder()](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageOptionsBuilder.java) 创建。
