# DashScope Transcriptions

Spring AI Alibaba 支持 [DashScope 的语音转文字模型](https://help.aliyun.com/zh/model-studio/paraformer)。

## Prerequisites

您需要使用阿里云 DashScope 创建 API Key 才能访问 DashScope 转录模型。

在 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建账户，并在 [API Keys 页面](https://dashscope.console.aliyun.com/apiKey) 生成 API Key。

Spring AI Alibaba 项目定义了一个名为 `spring.ai.dashscope.api-key` 的配置属性，您应将其设置为从 DashScope 控制台获得的 `API Key` 值。

导出环境变量是设置该配置属性的一种方法：

```bash
export AI_DASHSCOPE_API_KEY=<your-dashscope-api-key>
```

## Auto-configuration

Spring AI Alibaba 为 DashScope Transcription Client 提供 Spring Boot 自动配置。
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

### Transcription Properties

#### Connection Properties

前缀 `spring.ai.dashscope` 用作允许您连接到 DashScope 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.dashscope.base-url | 连接的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.api-key | API Key | - |
| spring.ai.dashscope.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |

> **TIP**: 对于属于多个工作空间的用户，您可以可选地指定用于 API 请求的工作空间 ID。
> 这些 API 请求的使用量将计入指定工作空间的使用量。

#### Configuration Properties

> **NOTE**
> 
> 音频转录自动配置的启用和禁用现在通过前缀为 `spring.ai.model.audio.transcription` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.audio.transcription=dashscope
> 
> 要禁用，spring.ai.model.audio.transcription=none（或任何与 dashscope 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.dashscope.audio.transcription` 用作允许您配置 DashScope 转录模型的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.audio.transcription | 启用 DashScope Audio Transcription Model | dashscope |
| spring.ai.dashscope.audio.transcription.base-url | 连接的 URL | https://dashscope.aliyuncs.com |
| spring.ai.dashscope.audio.transcription.api-key | API Key | - |
| spring.ai.dashscope.audio.transcription.work-space-id | 可选，您可以指定用于 API 请求的工作空间 ID | - |
| spring.ai.dashscope.audio.transcription.options.model | 用于转录的模型 ID。可用模型：`paraformer-v1`、`paraformer-8k-v1`、`paraformer-v2`、`paraformer-8k-v2`、`paraformer-mtl-v1`、`paraformer-realtime-v1`、`paraformer-realtime-8k-v1`、`paraformer-realtime-v2`、`paraformer-realtime-8k-v2`、`fun-asr`、`fun-asr-mtl`、`fun-asr-realtime`、`gummy-realtime-v1`、`gummy-chat-v1` | paraformer-v1 |
| spring.ai.dashscope.audio.transcription.options.format | 音频格式。支持的格式：`pcm`、`wav`、`mp3`、`opus`、`speex`、`aac`、`amr` | pcm |
| spring.ai.dashscope.audio.transcription.options.sample-rate | 音频采样率 | - |
| spring.ai.dashscope.audio.transcription.options.vocabulary-id | 自定义热词表 ID | - |
| spring.ai.dashscope.audio.transcription.options.resource-id | 资源 ID（用于 paraformer 系列模型） | - |
| spring.ai.dashscope.audio.transcription.options.channel-id | 声道 ID 列表 | [0] |
| spring.ai.dashscope.audio.transcription.options.disfluency-removal-enabled | 是否启用流畅度移除 | false |
| spring.ai.dashscope.audio.transcription.options.timestamp-alignment-enabled | 是否启用时间戳对齐 | false |
| spring.ai.dashscope.audio.transcription.options.special-word-filter | 特殊词过滤 | - |
| spring.ai.dashscope.audio.transcription.options.language-hints | 语言提示列表 | ["zh", "en"] |
| spring.ai.dashscope.audio.transcription.options.diarization-enabled | 是否启用说话人分离 | false |
| spring.ai.dashscope.audio.transcription.options.speaker-count | 说话人数量 | - |
| spring.ai.dashscope.audio.transcription.options.semantic-punctuation-enabled | 是否启用语义标点 | false |
| spring.ai.dashscope.audio.transcription.options.max-sentence-silence | 最大句子静音时长（毫秒） | 800 |
| spring.ai.dashscope.audio.transcription.options.multi-threshold-mode-enabled | 是否启用多阈值模式 | false |
| spring.ai.dashscope.audio.transcription.options.punctuation-prediction-enabled | 是否启用标点预测 | true |
| spring.ai.dashscope.audio.transcription.options.heartbeat | 是否启用心跳 | false |
| spring.ai.dashscope.audio.transcription.options.inverse-text-normalization-enabled | 是否启用逆文本规范化 | true |
| spring.ai.dashscope.audio.transcription.options.source-language | 源语言 | - |
| spring.ai.dashscope.audio.transcription.options.transcription-enabled | 是否启用转录 | true |
| spring.ai.dashscope.audio.transcription.options.translation-enabled | 是否启用翻译 | false |
| spring.ai.dashscope.audio.transcription.options.translation-target-languages | 翻译目标语言列表 | - |
| spring.ai.dashscope.audio.transcription.options.max-end-silence | 最大结束静音时长（毫秒） | 800 |

> **NOTE**: 您可以覆盖通用的 `spring.ai.dashscope.base-url`、`spring.ai.dashscope.api-key`、`spring.ai.dashscope.work-space-id` 属性。
> 如果设置了 `spring.ai.dashscope.audio.transcription.base-url`、`spring.ai.dashscope.audio.transcription.api-key`、`spring.ai.dashscope.audio.transcription.work-space-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 DashScope 账户，这很有用。

> **TIP**: 所有以 `spring.ai.dashscope.audio.transcription.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

`DashScopeAudioTranscriptionOptions` 类提供在进行转录时使用的选项。
在启动时，使用 `spring.ai.dashscope.audio.transcription` 指定的选项，但您可以在运行时覆盖这些选项。

例如：

```java
DashScopeAudioTranscriptionOptions transcriptionOptions = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
    .languageHints(List.of("zh", "en"))
    .disfluencyRemovalEnabled(false)
    .punctuationPredictionEnabled(true)
    .build();

AudioTranscriptionPrompt transcriptionRequest = new AudioTranscriptionPrompt(audioFile, transcriptionOptions);
AudioTranscriptionResponse response = dashScopeTranscriptionModel.call(transcriptionRequest);
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

接下来，创建一个 `DashScopeAudioTranscriptionModel`

```java
var dashScopeAudioTranscriptionApi = DashScopeAudioTranscriptionApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var dashScopeAudioTranscriptionModel = new DashScopeAudioTranscriptionModel(
    dashScopeAudioTranscriptionApi,
    DashScopeAudioTranscriptionOptions.builder()
        .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
        .build()
);

var transcriptionOptions = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
    .languageHints(List.of("zh", "en"))
    .punctuationPredictionEnabled(true)
    .build();

var audioFile = new FileSystemResource("/path/to/your/resource/speech/audio.wav");

AudioTranscriptionPrompt transcriptionRequest = new AudioTranscriptionPrompt(audioFile, transcriptionOptions);
AudioTranscriptionResponse response = dashScopeAudioTranscriptionModel.call(transcriptionRequest);

String transcribedText = response.getResult().getOutput();
```

## Streaming Real-time Transcription

DashScope 支持使用 WebSocket 进行实时音频转录。这对于需要实时处理音频流的场景非常有用。

`DashScopeAudioTranscriptionModel` 实现了流式转录功能：

```java
var dashScopeAudioTranscriptionApi = DashScopeAudioTranscriptionApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

var dashScopeAudioTranscriptionModel = new DashScopeAudioTranscriptionModel(
    dashScopeAudioTranscriptionApi,
    DashScopeAudioTranscriptionOptions.builder()
        .model(DashScopeModel.AudioModel.PARAFORMER_REALTIME_V1.getValue())
        .format(DashScopeAudioTranscriptionApi.AudioFormat.PCM)
        .sampleRate(16000)
        .build()
);

Resource audioResource = new FileSystemResource("/path/to/audio.pcm");
AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioResource);

Flux<AudioTranscriptionResponse> responseStream = dashScopeAudioTranscriptionModel.stream(prompt);

responseStream.subscribe(response -> {
    String text = response.getResult().getOutput();
    // 处理实时转录结果
    System.out.println("Transcribed: " + text);
});
```

## Supported Models

DashScope 支持多种转录模型：

### Paraformer 系列（非实时）
- `paraformer-v1` - 通用语音识别模型
- `paraformer-8k-v1` - 8kHz 采样率版本
- `paraformer-v2` - 增强版本
- `paraformer-8k-v2` - 8kHz 采样率增强版本
- `paraformer-mtl-v1` - 多任务学习版本

### Paraformer 系列（实时）
- `paraformer-realtime-v1` - 实时语音识别模型
- `paraformer-realtime-8k-v1` - 8kHz 采样率实时版本
- `paraformer-realtime-v2` - 实时增强版本
- `paraformer-realtime-8k-v2` - 8kHz 采样率实时增强版本

### FunASR 系列
- `fun-asr` - FunASR 通用模型
- `fun-asr-mtl` - FunASR 多任务学习版本
- `fun-asr-realtime` - FunASR 实时版本

### Gummy 系列
- `gummy-realtime-v1` - Gummy 实时模型
- `gummy-chat-v1` - Gummy 对话模型

更多模型信息请参考 [DashScope 模型列表](https://help.aliyun.com/zh/model-studio/getting-started/models)。

## Advanced Features

### Custom Vocabulary

使用自定义热词表可以提高特定领域术语的识别准确率：

```java
DashScopeAudioTranscriptionOptions options = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
    .vocabularyId("your-vocabulary-id")  // 在 DashScope 控制台创建的热词表 ID
    .build();

AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile, options);
AudioTranscriptionResponse response = dashScopeTranscriptionModel.call(prompt);
```

### Speaker Diarization

启用说话人分离功能，可以识别不同说话人的内容：

```java
DashScopeAudioTranscriptionOptions options = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
    .diarizationEnabled(true)
    .speakerCount(2)  // 指定说话人数量
    .build();

AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile, options);
AudioTranscriptionResponse response = dashScopeTranscriptionModel.call(prompt);
```

### Translation

部分模型支持在转录的同时进行翻译：

```java
DashScopeAudioTranscriptionOptions options = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_MTL_V1.getValue())
    .translationEnabled(true)
    .translationTargetLanguages(List.of("en"))  // 翻译目标语言
    .build();

AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile, options);
AudioTranscriptionResponse response = dashScopeTranscriptionModel.call(prompt);
```

### Resource ID (for Paraformer models)

对于 Paraformer 系列模型，可以使用 resource-id 替代 vocabulary-id：

```java
DashScopeAudioTranscriptionOptions options = DashScopeAudioTranscriptionOptions.builder()
    .model(DashScopeModel.AudioModel.PARAFORMER_V1.getValue())
    .resourceId("your-resource-id")  // 资源 ID
    .build();

AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile, options);
AudioTranscriptionResponse response = dashScopeTranscriptionModel.call(prompt);
```

## Example Code

完整的示例代码可以参考项目中的测试文件，展示了如何使用 DashScope Transcription API 的各种功能。
