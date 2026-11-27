# DashScope Image Generation

Spring AI Alibaba 支持来自阿里云 DashScope 的图像生成模型，包括通义万相（Wanx）和通义千问图像（Qwen Image）系列模型。

## Prerequisites

您需要使用阿里云 DashScope 创建 API Key 才能访问 DashScope 图像生成模型。

在 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建账户，并在 [API Keys 页面](https://dashscope.console.aliyun.com/apiKey) 生成 API Key。

Spring AI Alibaba 项目定义了一个名为 `spring.ai.dashscope.api-key` 的配置属性，您应将其设置为从 DashScope 控制台获得的 `API Key` 值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.dashscope.api-key=<your-dashscope-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

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

您也可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("AI_DASHSCOPE_API_KEY");
```

## Auto-configuration

Spring AI Alibaba 为 DashScope Image Generation Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

### Image Generation Properties

#### Connection Properties

前缀 `spring.ai.dashscope` 用作允许您连接到 DashScope 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.dashscope.base-url | 连接的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.api-key | API Key | - |
| spring.ai.dashscope.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |

> **TIP**: 对于属于多个工作空间的用户，您可以可选地指定用于 API 请求的工作空间 ID。
> 这些 API 请求的使用量将计入指定工作空间的使用量。

#### Retry Properties

前缀 `spring.ai.retry` 用作允许您配置 DashScope Image 客户端的重试机制的属性前缀。

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
> 要启用，spring.ai.model.image=dashscope
> 
> 要禁用，spring.ai.model.image=none（或任何与 dashscope 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.dashscope.image` 是允许您配置 DashScope 的 `ImageModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.image | 启用 DashScope 图像模型 | dashscope |
| spring.ai.dashscope.image.base-url | 可选覆盖 `spring.ai.dashscope.base-url` 以提供图像特定的 URL | - |
| spring.ai.dashscope.image.api-key | 可选覆盖 `spring.ai.dashscope.api-key` 以提供图像特定的 API Key | - |
| spring.ai.dashscope.image.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |
| spring.ai.dashscope.image.options.model | 用于图像生成的模型。可用模型：`qwen-image`（默认）、`qwen-image-plus`、`qwen-image-edit`、`qwen-mt-image`、`wan2.2-t2i-plus`、`wan2.2-t2i-flash`、`wanx2.1-imageedit`、`wan2.2-t2i-preview` | qwen-image |
| spring.ai.dashscope.image.options.n | 要生成的图像数量。必须在 1 到 4 之间 | 1 |
| spring.ai.dashscope.image.options.width | 生成的图像宽度。必须是 720、1024 或 1280 之一 | - |
| spring.ai.dashscope.image.options.height | 生成的图像高度。必须是 720、1024 或 1280 之一 | - |
| spring.ai.dashscope.image.options.size | 生成的图像大小。必须是 `1024*1024`、`720*1280` 或 `1280*720` 之一 | - |
| spring.ai.dashscope.image.options.style | 生成的图像样式。必须是 `photography`、`portrait`、`3d cartoon`、`anime`、`oil painting`、`watercolor`、`sketch`、`chinese painting`、`flat illustration`、`auto` 之一 | - |
| spring.ai.dashscope.image.options.seed | 用于生成的随机种子。必须在 0 到 4294967290 之间 | - |
| spring.ai.dashscope.image.options.ref-img | 参考图像 URL。支持 jpg、png、tiff、webp 格式 | - |
| spring.ai.dashscope.image.options.ref-strength | 参考强度。必须在 0.0 到 1.0 之间 | - |
| spring.ai.dashscope.image.options.ref-mode | 参考模式。必须是 `repaint` 或 `refonly` 之一 | - |
| spring.ai.dashscope.image.options.negative-prompt | 负面提示词 | - |
| spring.ai.dashscope.image.options.prompt-extend | 是否启用提示词扩展 | - |
| spring.ai.dashscope.image.options.watermark | 是否添加水印 | - |
| spring.ai.dashscope.image.options.function | 功能类型 | - |
| spring.ai.dashscope.image.options.base-image-url | 基础图像 URL（用于图像编辑） | - |
| spring.ai.dashscope.image.options.mask-image-url | 遮罩图像 URL（用于图像编辑） | - |
| spring.ai.dashscope.image.options.sketch-image-url | 草图图像 URL（用于图像生成） | - |
| spring.ai.dashscope.image.options.sketch-weight | 草图权重 | - |
| spring.ai.dashscope.image.options.sketch-extraction | 是否启用草图提取 | - |
| spring.ai.dashscope.image.options.sketch-color | 草图颜色（二维数组） | - |
| spring.ai.dashscope.image.options.mask-color | 遮罩颜色（二维数组） | - |
| spring.ai.dashscope.image.options.response-format | 返回生成的图像的格式。必须是 `url` 或 `b64_json` 之一 | url |

> **NOTE**: 您可以覆盖通用的 `spring.ai.dashscope.base-url`、`spring.ai.dashscope.api-key`、`spring.ai.dashscope.work-space-id` 属性。
> 如果设置了 `spring.ai.dashscope.image.base-url`、`spring.ai.dashscope.image.api-key`、`spring.ai.dashscope.image.work-space-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 DashScope 账户，这很有用。

> **TIP**: 所有以 `spring.ai.dashscope.image.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

`DashScopeImageOptions` 类提供在进行图像生成请求时使用的选项。
在启动时，使用 `spring.ai.dashscope.image` 指定的选项，但您可以在运行时覆盖这些选项。

`DashScopeImageOptions` 类实现 `ImageOptions` 接口，提供可移植和 DashScope 特定的配置选项。

例如，要覆盖 DashScope 特定选项（如样式和要创建的图像数量），请使用以下代码示例：

```java
DashScopeImageOptions imageOptions = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .n(2)
    .width(1024)
    .height(1024)
    .style("photography")
    .seed(12345)
    .build();

ImagePrompt imagePrompt = new ImagePrompt("A beautiful sunset over the ocean", imageOptions);
ImageResponse response = dashScopeImageModel.call(imagePrompt);
```

## Manual Configuration

将 `spring-ai-alibaba-dashscope` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-dashscope</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-dashscope'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

接下来，创建一个 `DashScopeImageModel`：

```java
var dashScopeImageApi = DashScopeImageApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var dashScopeImageModel = new DashScopeImageModel(dashScopeImageApi);

var imageOptions = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .n(1)
    .width(1024)
    .height(1024)
    .style("photography")
    .build();

var imagePrompt = new ImagePrompt("A light cream colored mini golden doodle", imageOptions);
ImageResponse response = dashScopeImageModel.call(imagePrompt);

List<ImageGeneration> images = response.getResults();
```

## Supported Models

DashScope 支持多种图像生成模型：

### Qwen Image 系列
- `qwen-image` - 通义千问图像生成模型（默认）
- `qwen-image-plus` - 增强版通义千问图像生成模型
- `qwen-image-edit` - 通义千问图像编辑模型
- `qwen-mt-image` - 通义千问多语言图像生成模型

### Wanx 系列
- `wan2.2-t2i-plus` - 通义万相文本到图像增强版
- `wan2.2-t2i-flash` - 通义万相文本到图像快速版
- `wanx2.1-imageedit` - 通义万相图像编辑模型
- `wan2.2-t2i-preview` - 通义万相文本到图像预览版

更多模型信息请参考 [DashScope 模型列表](https://help.aliyun.com/zh/model-studio/getting-started/models)。

## Advanced Features

### Image-to-Image Generation

使用参考图像进行图像生成，可以基于现有图像生成新图像：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .refImg("https://example.com/reference-image.jpg")
    .refStrength(0.7f)  // 参考强度 0.0-1.0
    .refMode("repaint")  // 或 "refonly"
    .build();

ImagePrompt prompt = new ImagePrompt("Generate a similar image with different colors", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

### Image Editing

使用基础图像和遮罩图像进行图像编辑：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE_EDIT.getValue())
    .baseImageUrl("https://example.com/base-image.jpg")
    .maskImageUrl("https://example.com/mask-image.png")
    .build();

ImagePrompt prompt = new ImagePrompt("Replace the background with a beach scene", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

### Sketch-to-Image Generation

使用草图图像生成最终图像：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .sketchImageUrl("https://example.com/sketch.jpg")
    .sketchWeight(80)  // 草图权重
    .sketchExtraction(true)  // 启用草图提取
    .build();

ImagePrompt prompt = new ImagePrompt("A detailed illustration based on the sketch", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

### Style Control

通过样式参数控制生成图像的风格：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .style("anime")  // 可选：photography, portrait, 3d cartoon, anime, oil painting, watercolor, sketch, chinese painting, flat illustration, auto
    .build();

ImagePrompt prompt = new ImagePrompt("A beautiful landscape", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

### Negative Prompt

使用负面提示词来排除不想要的元素：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .negativePrompt("blurry, low quality, distorted")
    .build();

ImagePrompt prompt = new ImagePrompt("A high-quality portrait photo", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

### Seed for Reproducibility

使用种子值来获得可重现的结果：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .seed(12345)  // 固定种子值
    .build();

ImagePrompt prompt = new ImagePrompt("A futuristic city", options);
ImageResponse response = dashScopeImageModel.call(prompt);
// 使用相同的种子和提示词会生成相似的结果
```

### Watermark

为生成的图像添加水印：

```java
DashScopeImageOptions options = DashScopeImageOptions.builder()
    .model(DashScopeModel.ImageModel.QWEN_IMAGE.getValue())
    .watermark(true)
    .build();

ImagePrompt prompt = new ImagePrompt("A professional product photo", options);
ImageResponse response = dashScopeImageModel.call(prompt);
```

## Asynchronous Image Generation

DashScope 图像生成采用异步任务模式。当您调用 `call()` 方法时，系统会：

1. 提交图像生成任务并获取 `taskId`
2. 轮询任务状态直到完成
3. 返回生成的图像结果

任务状态包括：
- `SUCCEEDED` - 任务成功完成
- `FAILED` - 任务失败
- `UNKNOWN` - 未知状态

您可以通过响应元数据获取任务相关信息：

```java
ImageResponse response = dashScopeImageModel.call(imagePrompt);
ImageResponseMetadata metadata = response.getMetadata();

String taskStatus = (String) metadata.get("taskStatus");
String requestId = (String) metadata.get("requestId");
Integer imageCount = (Integer) metadata.get("imageCount");
```

## Example Code

完整的示例代码可以参考项目中的测试文件，展示了如何使用 DashScope Image API 的各种功能。
