# Image Model API

`Spring Image Model API` 旨在为与各种专门用于图像生成的 [AI Models](concepts.md#_models) 交互提供一个简单且可移植的接口，允许开发者在不同的图像相关模型之间切换，只需最少的代码更改。
此设计符合 Spring 的模块化和可互换性理念，确保开发者能够快速调整应用程序以适应不同的图像处理相关 AI 能力。

此外，通过 `ImagePrompt` 用于输入封装和 `ImageResponse` 用于输出处理等配套类的支持，Image Model API 统一了与专门用于图像生成的 AI Models 的通信。
它管理请求准备和响应解析的复杂性，为图像生成功能提供直接且简化的 API 交互。

Spring Image Model API 构建在 Spring AI `Generic Model API` 之上，提供图像特定的抽象和实现。

## API Overview

本节提供了 Spring Image Model API 接口和相关类的指南。

## Image Model

这是 [ImageModel](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageModel.java) 接口定义：

```java
@FunctionalInterface
public interface ImageModel extends Model<ImagePrompt, ImageResponse> {

	ImageResponse call(ImagePrompt request);

}
```

### ImagePrompt

[ImagePrompt](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImagePrompt.java) 是一个 `ModelRequest`，它封装了一个 [ImageMessage](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageMessage.java) 对象列表和可选的模型请求选项。
以下列表显示了 `ImagePrompt` 类的截断版本，不包括构造函数和其他实用方法：

```java
public class ImagePrompt implements ModelRequest<List<ImageMessage>> {

    private final List<ImageMessage> messages;

	private ImageOptions imageModelOptions;

    @Override
	public List<ImageMessage> getInstructions() {...}

	@Override
	public ImageOptions getOptions() {...}

    // constructors and utility methods omitted
}
```

#### ImageMessage

`ImageMessage` 类封装了要使用的文本以及文本在影响生成的图像时应具有的权重。对于支持权重的模型，它们可以是正数或负数。

```java
public class ImageMessage {

	private String text;

	private Float weight;

    public String getText() {...}

	public Float getWeight() {...}

   // constructors and utility methods omitted
}
```

#### ImageOptions

表示可以传递给图像生成模型的选项。`ImageOptions` 接口扩展了 `ModelOptions` 接口，用于定义可以传递给 AI 模型的少量可移植选项。

`ImageOptions` 接口定义如下：

```java
public interface ImageOptions extends ModelOptions {

	Integer getN();

	String getModel();

	Integer getWidth();

	Integer getHeight();

	String getResponseFormat(); // openai - url or base64 : stability ai byte[] or base64

}
```

此外，每个模型特定的 ImageModel 实现都可以有自己的选项，可以传递给 AI 模型。例如，OpenAI Image Generation 模型有自己的选项，如 `quality`、`style` 等。

这是一个强大的功能，允许开发者在启动应用程序时使用模型特定的选项，然后使用 `ImagePrompt` 在运行时覆盖它们。

### ImageResponse

`ImageResponse` 类的结构如下：

```java
public class ImageResponse implements ModelResponse<ImageGeneration> {

	private final ImageResponseMetadata imageResponseMetadata;

	private final List<ImageGeneration> imageGenerations;

	@Override
	public ImageGeneration getResult() {
		// get the first result
	}

	@Override
	public List<ImageGeneration> getResults() {...}

	@Override
	public ImageResponseMetadata getMetadata() {...}

    // other methods omitted

}
```

[ImageResponse](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageResponse.java) 类保存 AI Model 的输出，每个 `ImageGeneration` 实例包含由单个 prompt 产生的多个输出中的一个。

`ImageResponse` 类还携带一个 `ImageResponseMetadata` 对象，保存有关 AI Model 响应的元数据。

### ImageGeneration

最后，[ImageGeneration](https://github.com/spring-projects/spring-ai/blob/main/spring-ai-model/src/main/java/org/springframework/ai/image/ImageGeneration.java) 类从 `ModelResult` 扩展而来，表示输出响应和与此结果相关的元数据：

```java
public class ImageGeneration implements ModelResult<Image> {

	private ImageGenerationMetadata imageGenerationMetadata;

	private Image image;

    @Override
	public Image getOutput() {...}

	@Override
	public ImageGenerationMetadata getMetadata() {...}

    // other methods omitted

}
```

## Available Implementations

为以下 Model 提供者提供了 `ImageModel` 实现：

* [OpenAI Image Generation](openai-image.md)
* [Azure OpenAI Image Generation](azure-openai-image.md)
* [QianFan Image Generation](qianfan-image.md)
* [StabilityAI Image Generation](stabilityai-image.md)
* [ZhiPuAI Image Generation](zhipuai-image.md)
* [DashScope Image Generation](dashscope-image.md)

## API Docs

您可以在[这里](https://docs.spring.io/spring-ai/docs/current-SNAPSHOT/)找到 Javadoc。

## Feedback and Contributions

项目的 [GitHub discussions](https://github.com/spring-projects/spring-ai/discussions) 是发送反馈的好地方。
