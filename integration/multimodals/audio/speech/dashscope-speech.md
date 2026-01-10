# DashScope Text-to-Speech (TTS)

## Introduction

DashScope Audio API 提供基于阿里云灵积模型的 TTS (text-to-speech) 语音端点，使用户能够：

- 为书面内容生成语音音频
- 生成多种语言的语音音频
- 使用流式传输提供实时音频输出
- 支持多种语音模型和音色选择

## Prerequisites

您需要使用阿里云 DashScope 创建 API Key 才能访问 DashScope TTS 模型。

在 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建账户，并在 [API Keys 页面](https://dashscope.console.aliyun.com/apiKey) 生成 API Key。

Spring AI Alibaba 项目定义了一个名为 `spring.ai.dashscope.api-key` 的配置属性，您应将其设置为从 DashScope 控制台获得的 `API Key` 值。

## Auto-configuration

Spring AI Alibaba 为 DashScope Text-to-Speech Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

## Speech Properties

### Connection Properties

前缀 `spring.ai.dashscope` 用作允许您连接到 DashScope 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.dashscope.base-url | 连接的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.api-key | API Key | - |
| spring.ai.dashscope.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |

> **TIP**: 对于属于多个工作空间的用户，您可以可选地指定用于 API 请求的工作空间 ID。
> 这些 API 请求的使用量将计入指定工作空间的使用量。

### Configuration Properties

> **NOTE**
> 
> 音频语音自动配置的启用和禁用现在通过前缀为 `spring.ai.model.audio.speech` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.audio.speech=dashscope
> 
> 要禁用，spring.ai.model.audio.speech=none（或任何与 dashscope 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.dashscope.audio.speech` 用作允许您配置 DashScope Text-to-Speech 客户端的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.audio.speech | 启用 Audio Speech Model | dashscope |
| spring.ai.dashscope.audio.speech.base-url | 连接的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.audio.speech.api-key | API Key | - |
| spring.ai.dashscope.audio.speech.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |
| spring.ai.dashscope.audio.speech.options.model | 用于生成音频的模型 ID。可用模型：`cosyvoice-v1`（默认）、`cosyvoice-v2`、`cosyvoice-v3`、`cosyvoice-v3-plus` 以及各种 `sambert-*` 系列模型 | cosyvoice-v1 |
| spring.ai.dashscope.audio.speech.options.voice | 用于合成的语音。不同模型支持不同的音色，例如 `longhua`、`zhiqi`、`zhichu` 等 | longhua |
| spring.ai.dashscope.audio.speech.options.response-format | 音频输出的格式。支持的格式有 `mp3`、`wav`、`pcm` | mp3 |
| spring.ai.dashscope.audio.speech.options.speed | 语音合成的速度。可接受的范围是从 0.5 到 2.0 | 1.0 |
| spring.ai.dashscope.audio.speech.options.sample-rate | 合成音频的采样率 | 48000 |
| spring.ai.dashscope.audio.speech.options.volume | 合成音频的音量。范围：0-100 | 50 |
| spring.ai.dashscope.audio.speech.options.pitch | 合成音频的音调。范围：0.5-2.0 | 1.0 |
| spring.ai.dashscope.audio.speech.options.request-text-type | 输入文本类型。支持 `PlainText` 或 `SSML` | PlainText |
| spring.ai.dashscope.audio.speech.options.enable-ssml | 是否启用 SSML。当设置为 true 时，仅允许发送一次文本，支持纯文本或包含 SSML 的文本 | false |
| spring.ai.dashscope.audio.speech.options.enable-word-timestamp | 是否启用词级别时间戳 | false |
| spring.ai.dashscope.audio.speech.options.enable-phoneme-timestamp | 是否启用音素级别时间戳 | false |
| spring.ai.dashscope.audio.speech.options.bit-rate | 音频比特率 | - |
| spring.ai.dashscope.audio.speech.options.seed | 用于生成的随机种子，用于影响可重现性 | - |
| spring.ai.dashscope.audio.speech.options.language-hints | 合成文本语言提示 | - |
| spring.ai.dashscope.audio.speech.options.instruction | 设置提示词。仅 `cosyvoice-v3` 和 `cosyvoice-v3-plus` 支持此功能。目前仅支持情绪 | - |

> **NOTE**: 您可以覆盖通用的 `spring.ai.dashscope.base-url`、`spring.ai.dashscope.api-key`、`spring.ai.dashscope.work-space-id` 属性。
> 如果设置了 `spring.ai.dashscope.audio.speech.base-url`、`spring.ai.dashscope.audio.speech.api-key`、`spring.ai.dashscope.audio.speech.work-space-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 DashScope 账户，这很有用。

> **TIP**: 所有以 `spring.ai.dashscope.audio.speech.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

`DashScopeAudioSpeechOptions` 类提供在进行 text-to-speech 请求时使用的选项。
在启动时，使用 `spring.ai.dashscope.audio.speech` 指定的选项，但您可以在运行时覆盖这些选项。

`DashScopeAudioSpeechOptions` 类实现 `TextToSpeechOptions` 接口，提供可移植和 DashScope 特定的配置选项。

例如：

```java
DashScopeAudioSpeechOptions speechOptions = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V1.getValue())
    .voice("longhua")
    .responseFormat(DashScopeAudioSpeechApi.ResponseFormat.MP3)
    .speed(1.0)
    .sampleRate(48000)
    .volume(50)
    .pitch(1.0)
    .build();

TextToSpeechPrompt speechPrompt = new TextToSpeechPrompt("Hello, this is a text-to-speech example.", speechOptions);
TextToSpeechResponse response = dashScopeAudioSpeechModel.call(speechPrompt);
```

## Manual Configuration

将 `spring-ai-alibaba-dashscope` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-dashscope</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-dashscope'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI Alibaba BOM 添加到您的构建文件中。

接下来，创建一个 `DashScopeAudioSpeechModel`：

```java
var dashScopeAudioSpeechApi = DashScopeAudioSpeechApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var dashScopeAudioSpeechModel = new DashScopeAudioSpeechModel(dashScopeAudioSpeechApi);

var speechOptions = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V1.getValue())
    .voice("longhua")
    .responseFormat(DashScopeAudioSpeechApi.ResponseFormat.MP3)
    .speed(1.0)
    .sampleRate(48000)
    .volume(50)
    .build();

var speechPrompt = new TextToSpeechPrompt("Hello, this is a text-to-speech example.", speechOptions);
TextToSpeechResponse response = dashScopeAudioSpeechModel.call(speechPrompt);

byte[] responseAsBytes = response.getResult().getOutput();
```

## Streaming Real-time Audio

Speech API 支持使用 WebSocket 进行实时音频流式传输。这意味着音频可以在完整文件生成并可用之前播放。

`DashScopeAudioSpeechModel` 实现 `StreamingTextToSpeechModel` 接口，提供标准和流式传输功能。

```java
var dashScopeAudioSpeechApi = DashScopeAudioSpeechApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var dashScopeAudioSpeechModel = new DashScopeAudioSpeechModel(dashScopeAudioSpeechApi);

DashScopeAudioSpeechOptions speechOptions = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V1.getValue())
    .voice("longhua")
    .speed(1.0)
    .responseFormat(DashScopeAudioSpeechApi.ResponseFormat.MP3)
    .build();

TextToSpeechPrompt speechPrompt = new TextToSpeechPrompt("Today is a wonderful day to build something people love!", speechOptions);

Flux<TextToSpeechResponse> responseStream = dashScopeAudioSpeechModel.stream(speechPrompt);

// You can also stream raw audio bytes directly
Flux<byte[]> audioByteStream = dashScopeAudioSpeechModel.stream("Hello, world!");
```

## Supported Models

DashScope 支持多种 TTS 模型：

### CosyVoice 系列
- `cosyvoice-v1` - 基础版本，支持多种音色
- `cosyvoice-v2` - 增强版本
- `cosyvoice-v3` - 支持情绪控制
- `cosyvoice-v3-plus` - 增强版，支持情绪控制

### Sambert 系列
Sambert 系列提供了多种预定义音色，每个音色对应一个模型：
- `sambert-zhinan-v1`、`sambert-zhiqi-v1`、`sambert-zhichu-v1` 等中文音色
- `sambert-camila-v1`、`sambert-perla-v1` 等多语言音色

更多模型信息请参考 [DashScope 模型列表](https://help.aliyun.com/zh/model-studio/getting-started/models)。

## Advanced Features

### SSML Support

DashScope 支持 SSML (Speech Synthesis Markup Language) 来精确控制语音合成的各个方面：

```java
DashScopeAudioSpeechOptions options = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V1.getValue())
    .enableSsml(true)
    .requestTextType(DashScopeAudioSpeechApi.RequestTextType.SSML)
    .build();

String ssmlText = "<speak>Hello, <break time='500ms'/> this is a test.</speak>";
TextToSpeechPrompt prompt = new TextToSpeechPrompt(ssmlText, options);
TextToSpeechResponse response = dashScopeAudioSpeechModel.call(prompt);
```

### Emotion Control (cosyvoice-v3/v3-plus)

`cosyvoice-v3` 和 `cosyvoice-v3-plus` 支持通过 `instruction` 参数控制情绪：

```java
DashScopeAudioSpeechOptions options = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V3.getValue())
    .instruction("happy")  // 设置情绪为开心
    .build();

TextToSpeechPrompt prompt = new TextToSpeechPrompt("I'm so excited!", options);
TextToSpeechResponse response = dashScopeAudioSpeechModel.call(prompt);
```

### Timestamp Support

DashScope 支持词级别和音素级别的时间戳：

```java
DashScopeAudioSpeechOptions options = DashScopeAudioSpeechOptions.builder()
    .model(DashScopeModel.AudioModel.COSYVOICE_V1.getValue())
    .enableWordTimestamp(true)
    .enablePhonemeTimestamp(true)
    .build();

TextToSpeechPrompt prompt = new TextToSpeechPrompt("Hello world", options);
TextToSpeechResponse response = dashScopeAudioSpeechModel.call(prompt);
// 时间戳信息会在响应的元数据中
```

## Example Code

完整的示例代码可以参考项目中的测试文件，展示了如何使用 DashScope TTS API 的各种功能。
