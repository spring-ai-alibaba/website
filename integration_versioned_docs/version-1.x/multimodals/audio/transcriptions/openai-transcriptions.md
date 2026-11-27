# OpenAI Transcriptions

Spring AI 支持 [OpenAI's Transcription model](https://platform.openai.com/docs/api-reference/audio/createTranscription)。

## Prerequisites

您需要创建一个 OpenAI API key 来访问 ChatGPT 模型。
在 [OpenAI signup page](https://platform.openai.com/signup) 创建账户，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 token。
Spring AI 项目定义了一个名为 `spring.ai.openai.api-key` 的配置属性，您应该将其设置为从 openai.com 获得的 `API Key` 的值。
导出环境变量是设置该配置属性的一种方法：

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 OpenAI Transcription Client 提供 Spring Boot 自动配置。
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

### Transcription Properties

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

#### Configuration Properties

> **NOTE**
> 
> 音频转录自动配置的启用和禁用现在通过前缀为 `spring.ai.model.audio.transcription` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.audio.transcription=openai（默认启用）
> 
> 要禁用，spring.ai.model.audio.transcription=none（或任何与 openai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.openai.audio.transcription` 用作允许您配置 OpenAI 转录模型的重试机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.audio.transcription | 启用 OpenAI Audio Transcription Model | openai |
| spring.ai.openai.audio.transcription.base-url | 连接的 URL | https://api.openai.com |
| spring.ai.openai.audio.transcription.api-key | API Key | - |
| spring.ai.openai.audio.transcription.organization-id | 可选，您可以指定用于 API 请求的组织 | - |
| spring.ai.openai.audio.transcription.project-id | 可选，您可以指定用于 API 请求的项目 | - |
| spring.ai.openai.audio.transcription.options.model | 用于转录的模型 ID。可用模型：`gpt-4o-transcribe`（由 GPT-4o 驱动的 speech-to-text）、`gpt-4o-mini-transcribe`（由 GPT-4o mini 驱动的 speech-to-text）或 `whisper-1`（通用语音识别模型，默认） | whisper-1 |
| spring.ai.openai.audio.transcription.options.response-format | 转录输出的格式，选项之一：json、text、srt、verbose_json 或 vtt | json |
| spring.ai.openai.audio.transcription.options.prompt | 可选文本，用于指导模型的样式或继续先前的音频段。prompt 应与音频语言匹配 | - |
| spring.ai.openai.audio.transcription.options.language | 输入音频的语言。以 ISO-639-1 格式提供输入语言将提高准确性和延迟 | - |
| spring.ai.openai.audio.transcription.options.temperature | 采样温度，介于 0 和 1 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如 0.2）将使其更加专注和确定性。如果设置为 0，模型将使用对数概率自动增加温度，直到达到某些阈值 | 0 |
| spring.ai.openai.audio.transcription.options.timestamp_granularities | 要为此转录填充的时间戳粒度。response_format 必须设置为 verbose_json 才能使用时间戳粒度。支持以下选项之一或两者：word 或 segment。注意：段时间戳没有额外的延迟，但生成单词时间戳会产生额外的延迟 | segment |

> **NOTE**: 您可以覆盖通用的 `spring.ai.openai.base-url`、`spring.ai.openai.api-key`、`spring.ai.openai.organization-id` 和 `spring.ai.openai.project-id` 属性。
> 如果设置了 `spring.ai.openai.audio.transcription.base-url`、`spring.ai.openai.audio.transcription.api-key`、`spring.ai.openai.audio.transcription.organization-id` 和 `spring.ai.openai.audio.transcription.project-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 OpenAI 账户，这很有用。

> **TIP**: 所有以 `spring.ai.openai.transcription.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

`OpenAiAudioTranscriptionOptions` 类提供在进行转录时使用的选项。
在启动时，使用 `spring.ai.openai.audio.transcription` 指定的选项，但您可以在运行时覆盖这些选项。

例如：

```java
OpenAiAudioApi.TranscriptResponseFormat responseFormat = OpenAiAudioApi.TranscriptResponseFormat.VTT;

OpenAiAudioTranscriptionOptions transcriptionOptions = OpenAiAudioTranscriptionOptions.builder()
    .language("en")
    .prompt("Ask not this, but ask that")
    .temperature(0f)
    .responseFormat(this.responseFormat)
    .build();
AudioTranscriptionPrompt transcriptionRequest = new AudioTranscriptionPrompt(audioFile, this.transcriptionOptions);
AudioTranscriptionResponse response = openAiTranscriptionModel.call(this.transcriptionRequest);
```

## Manual Configuration

将 `spring-ai-openai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `OpenAiAudioTranscriptionModel`

```java
var openAiAudioApi = new OpenAiAudioApi(System.getenv("OPENAI_API_KEY"));

var openAiAudioTranscriptionModel = new OpenAiAudioTranscriptionModel(this.openAiAudioApi);

var transcriptionOptions = OpenAiAudioTranscriptionOptions.builder()
    .responseFormat(TranscriptResponseFormat.TEXT)
    .temperature(0f)
    .build();

var audioFile = new FileSystemResource("/path/to/your/resource/speech/jfk.flac");

AudioTranscriptionPrompt transcriptionRequest = new AudioTranscriptionPrompt(this.audioFile, this.transcriptionOptions);
AudioTranscriptionResponse response = openAiTranscriptionModel.call(this.transcriptionRequest);
```

## Example Code

* [OpenAiTranscriptionModelIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/audio/transcription/OpenAiTranscriptionModelIT.java) 测试提供了一些如何使用该库的通用示例。
