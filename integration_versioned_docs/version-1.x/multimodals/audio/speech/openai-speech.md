# OpenAI Text-to-Speech (TTS)

## Introduction

Audio API 提供基于 OpenAI 的 TTS (text-to-speech) 模型的语音端点，使用户能够：

- 为书面博客文章配音。
- 生成多种语言的语音音频。
- 使用流式传输提供实时音频输出。

## Prerequisites

1. 创建 OpenAI 账户并获取 API key。您可以在 [OpenAI signup page](https://platform.openai.com/signup) 注册，并在 [API Keys page](https://platform.openai.com/account/api-keys) 生成 API key。
2. 将 `spring-ai-openai` 依赖项添加到项目的构建文件中。有关更多信息，请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分。

## Auto-configuration

> **NOTE**
> 
> Spring AI 自动配置、starter 模块的 artifact 名称发生了重大变化。
> 请参考 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 OpenAI Text-to-Speech Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

## Speech Properties

### Connection Properties

前缀 `spring.ai.openai` 用作允许您连接到 OpenAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.openai.base-url | 连接的 URL | https://api.openai.com |
| spring.ai.openai.api-key | API Key | - |
| spring.ai.openai.organization-id | 可选，您可以指定用于 API 请求的组织 | - |
| spring.ai.openai.project-id | 可选，您可以指定用于 API 请求的项目 | - |

> **TIP**: 对于属于多个组织的用户（或通过其旧版用户 API key 访问其项目），可选地，您可以指定用于 API 请求的组织和项目。
> 这些 API 请求的使用量将计入指定的组织和项目。

### Configuration Properties

> **NOTE**
> 
> 音频语音自动配置的启用和禁用现在通过前缀为 `spring.ai.model.audio.speech` 的顶级属性进行配置。
> 
> 要启用，spring.ai.model.audio.speech=openai（默认启用）
> 
> 要禁用，spring.ai.model.audio.speech=none（或任何与 openai 不匹配的值）
> 
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.openai.audio.speech` 用作允许您配置 OpenAI Text-to-Speech 客户端的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.audio.speech | 启用 Audio Speech Model | openai |
| spring.ai.openai.audio.speech.base-url | 连接的 URL | https://api.openai.com |
| spring.ai.openai.audio.speech.api-key | API Key | - |
| spring.ai.openai.audio.speech.organization-id | 可选，您可以指定用于 API 请求的组织 | - |
| spring.ai.openai.audio.speech.project-id | 可选，您可以指定用于 API 请求的项目 | - |
| spring.ai.openai.audio.speech.options.model | 用于生成音频的模型 ID。可用模型：`gpt-4o-mini-tts`（默认，针对速度和成本优化）、`gpt-4o-tts`（更高质量）、`tts-1`（旧版，针对速度优化）或 `tts-1-hd`（旧版，针对质量优化） | gpt-4o-mini-tts |
| spring.ai.openai.audio.speech.options.voice | 用于合成的语音。对于 OpenAI 的 TTS API，所选模型的可用语音之一：alloy、echo、fable、onyx、nova 和 shimmer | alloy |
| spring.ai.openai.audio.speech.options.response-format | 音频输出的格式。支持的格式有 mp3、opus、aac、flac、wav 和 pcm | mp3 |
| spring.ai.openai.audio.speech.options.speed | 语音合成的速度。可接受的范围是从 0.25（最慢）到 4.0（最快） | 1.0 |

> **NOTE**: 您可以覆盖通用的 `spring.ai.openai.base-url`、`spring.ai.openai.api-key`、`spring.ai.openai.organization-id` 和 `spring.ai.openai.project-id` 属性。
> 如果设置了 `spring.ai.openai.audio.speech.base-url`、`spring.ai.openai.audio.speech.api-key`、`spring.ai.openai.audio.speech.organization-id` 和 `spring.ai.openai.audio.speech.project-id` 属性，它们优先于通用属性。
> 如果您想为不同的模型和不同的模型端点使用不同的 OpenAI 账户，这很有用。

> **TIP**: 所有以 `spring.ai.openai.audio.speech.options` 为前缀的属性都可以在运行时覆盖。

## Runtime Options

`OpenAiAudioSpeechOptions` 类提供在进行 text-to-speech 请求时使用的选项。
在启动时，使用 `spring.ai.openai.audio.speech` 指定的选项，但您可以在运行时覆盖这些选项。

`OpenAiAudioSpeechOptions` 类实现 `TextToSpeechOptions` 接口，提供可移植和 OpenAI 特定的配置选项。

例如：

```java
OpenAiAudioSpeechOptions speechOptions = OpenAiAudioSpeechOptions.builder()
    .model("gpt-4o-mini-tts")
    .voice(OpenAiAudioApi.SpeechRequest.Voice.ALLOY)
    .responseFormat(OpenAiAudioApi.SpeechRequest.AudioResponseFormat.MP3)
    .speed(1.0)
    .build();

TextToSpeechPrompt speechPrompt = new TextToSpeechPrompt("Hello, this is a text-to-speech example.", speechOptions);
TextToSpeechResponse response = openAiAudioSpeechModel.call(speechPrompt);
```

## Manual Configuration

将 `spring-ai-openai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai</artifactId>
</dependency>
```

或添加到 Gradle `build.gradle` 构建文件中：

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-openai'
}
```

> **TIP**: 请参考 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `OpenAiAudioSpeechModel`：

```java
var openAiAudioApi = new OpenAiAudioApi()
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

var openAiAudioSpeechModel = new OpenAiAudioSpeechModel(openAiAudioApi);

var speechOptions = OpenAiAudioSpeechOptions.builder()
    .responseFormat(OpenAiAudioApi.SpeechRequest.AudioResponseFormat.MP3)
    .speed(1.0)
    .model(OpenAiAudioApi.TtsModel.GPT_4_O_MINI_TTS.value)
    .build();

var speechPrompt = new TextToSpeechPrompt("Hello, this is a text-to-speech example.", speechOptions);
TextToSpeechResponse response = openAiAudioSpeechModel.call(speechPrompt);

// Accessing metadata (rate limit info)
OpenAiAudioSpeechResponseMetadata metadata = (OpenAiAudioSpeechResponseMetadata) response.getMetadata();

byte[] responseAsBytes = response.getResult().getOutput();
```

## Streaming Real-time Audio

Speech API 支持使用分块传输编码进行实时音频流式传输。这意味着音频可以在完整文件生成并可用之前播放。

`OpenAiAudioSpeechModel` 实现 `StreamingTextToSpeechModel` 接口，提供标准和流式传输功能。

```java
var openAiAudioApi = new OpenAiAudioApi()
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

var openAiAudioSpeechModel = new OpenAiAudioSpeechModel(openAiAudioApi);

OpenAiAudioSpeechOptions speechOptions = OpenAiAudioSpeechOptions.builder()
    .voice(OpenAiAudioApi.SpeechRequest.Voice.ALLOY)
    .speed(1.0)
    .responseFormat(OpenAiAudioApi.SpeechRequest.AudioResponseFormat.MP3)
    .model(OpenAiAudioApi.TtsModel.GPT_4_O_MINI_TTS.value)
    .build();

TextToSpeechPrompt speechPrompt = new TextToSpeechPrompt("Today is a wonderful day to build something people love!", speechOptions);

Flux<TextToSpeechResponse> responseStream = openAiAudioSpeechModel.stream(speechPrompt);

// You can also stream raw audio bytes directly
Flux<byte[]> audioByteStream = openAiAudioSpeechModel.stream("Hello, world!");
```

## Migration Guide

如果您正在从已弃用的 `SpeechModel` 和 `SpeechPrompt` 类升级，本指南提供了迁移到新共享接口的详细说明。

### Breaking Changes Summary

此迁移包括以下破坏性更改：

1. **已移除的类**：已从 `org.springframework.ai.openai.audio.speech` 包中移除六个已弃用的类
2. **包更改**：核心 TTS 类已移至 `org.springframework.ai.audio.tts` 包
3. **类型更改**：`speed` 参数在所有 OpenAI TTS 组件中从 `Float` 更改为 `Double`
4. **接口层次结构**：`TextToSpeechModel` 现在扩展 `StreamingTextToSpeechModel`

### Class Mapping Reference

| Deprecated (Removed) | New Interface |
|---------------------|---------------|
| `SpeechModel` | `TextToSpeechModel` |
| `StreamingSpeechModel` | `StreamingTextToSpeechModel` |
| `SpeechPrompt` | `TextToSpeechPrompt` |
| `SpeechResponse` | `TextToSpeechResponse` |
| `SpeechMessage` | `TextToSpeechMessage` |
| `Speech` (in `org.springframework.ai.openai.audio.speech`) | `Speech` (in `org.springframework.ai.audio.tts`) |

### Step-by-Step Migration Instructions

#### Step 1: Update Imports

将所有从旧的 `org.springframework.ai.openai.audio.speech` 包的导入替换为新的共享接口：

```text
Find:    import org.springframework.ai.openai.audio.speech.SpeechModel;
Replace: import org.springframework.ai.audio.tts.TextToSpeechModel;

Find:    import org.springframework.ai.openai.audio.speech.StreamingSpeechModel;
Replace: import org.springframework.ai.audio.tts.StreamingTextToSpeechModel;

Find:    import org.springframework.ai.openai.audio.speech.SpeechPrompt;
Replace: import org.springframework.ai.audio.tts.TextToSpeechPrompt;

Find:    import org.springframework.ai.openai.audio.speech.SpeechResponse;
Replace: import org.springframework.ai.audio.tts.TextToSpeechResponse;

Find:    import org.springframework.ai.openai.audio.speech.SpeechMessage;
Replace: import org.springframework.ai.audio.tts.TextToSpeechMessage;

Find:    import org.springframework.ai.openai.audio.speech.Speech;
Replace: import org.springframework.ai.audio.tts.Speech;
```

#### Step 2: Update Type References

替换代码中的所有类型引用：

```text
Find:    SpeechModel
Replace: TextToSpeechModel

Find:    StreamingSpeechModel
Replace: StreamingTextToSpeechModel

Find:    SpeechPrompt
Replace: TextToSpeechPrompt

Find:    SpeechResponse
Replace: TextToSpeechResponse

Find:    SpeechMessage
Replace: TextToSpeechMessage
```

#### Step 3: Update Speed Parameter (Float → Double)

`speed` 参数已从 `Float` 更改为 `Double`。更新所有出现的位置：

```text
Find:    .speed(1.0f)
Replace: .speed(1.0)

Find:    .speed(0.5f)
Replace: .speed(0.5)

Find:    Float speed
Replace: Double speed
```

如果您有包含 Float 值的序列化数据或配置文件，也需要更新它们：

```json
// Before
{
  "speed": 1.0
}

// After (no code change needed for JSON, but be aware of type change in Java)
{
  "speed": 1.0
}
```

#### Step 4: Update Bean Declarations

如果您有 Spring Boot 自动配置或手动 bean 定义：

```java
// Before
@Bean
public SpeechModel speechModel(OpenAiAudioApi audioApi) {
    return new OpenAiAudioSpeechModel(audioApi);
}

// After
@Bean
public TextToSpeechModel textToSpeechModel(OpenAiAudioApi audioApi) {
    return new OpenAiAudioSpeechModel(audioApi);
}
```

### Code Migration Examples

#### Example 1: Basic Text-to-Speech Conversion

**Before (deprecated):**

```java
import org.springframework.ai.openai.audio.speech.*;

@Service
public class OldNarrationService {

    private final SpeechModel speechModel;

    public OldNarrationService(SpeechModel speechModel) {
        this.speechModel = speechModel;
    }

    public byte[] createNarration(String text) {
        SpeechPrompt prompt = new SpeechPrompt(text);
        SpeechResponse response = speechModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

**After (using shared interfaces):**

```java
import org.springframework.ai.audio.tts.*;
import org.springframework.ai.openai.OpenAiAudioSpeechModel;

@Service
public class NarrationService {

    private final TextToSpeechModel textToSpeechModel;

    public NarrationService(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    public byte[] createNarration(String text) {
        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text);
        TextToSpeechResponse response = textToSpeechModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

#### Example 2: Text-to-Speech with Custom Options

**Before (deprecated):**

```java
import org.springframework.ai.openai.audio.speech.*;
import org.springframework.ai.openai.api.OpenAiAudioApi;

SpeechModel model = new OpenAiAudioSpeechModel(audioApi);

OpenAiAudioSpeechOptions options = OpenAiAudioSpeechOptions.builder()
    .model("tts-1")
    .voice(OpenAiAudioApi.SpeechRequest.Voice.NOVA)
    .speed(1.0f)  // Float value
    .responseFormat(OpenAiAudioApi.SpeechRequest.AudioResponseFormat.MP3)
    .build();

SpeechPrompt prompt = new SpeechPrompt("Hello, world!", options);
SpeechResponse response = model.call(prompt);
byte[] audio = response.getResult().getOutput();
```

**After (using shared interfaces):**

```java
import org.springframework.ai.audio.tts.*;
import org.springframework.ai.openai.OpenAiAudioSpeechModel;
import org.springframework.ai.openai.OpenAiAudioSpeechOptions;
import org.springframework.ai.openai.api.OpenAiAudioApi;

TextToSpeechModel model = new OpenAiAudioSpeechModel(audioApi);

OpenAiAudioSpeechOptions options = OpenAiAudioSpeechOptions.builder()
    .model("tts-1")
    .voice(OpenAiAudioApi.SpeechRequest.Voice.NOVA)
    .speed(1.0)  // Double value
    .responseFormat(OpenAiAudioApi.SpeechRequest.AudioResponseFormat.MP3)
    .build();

TextToSpeechPrompt prompt = new TextToSpeechPrompt("Hello, world!", options);
TextToSpeechResponse response = model.call(prompt);
byte[] audio = response.getResult().getOutput();
```

#### Example 3: Streaming Text-to-Speech

**Before (deprecated):**

```java
import org.springframework.ai.openai.audio.speech.*;
import reactor.core.publisher.Flux;

StreamingSpeechModel model = new OpenAiAudioSpeechModel(audioApi);
SpeechPrompt prompt = new SpeechPrompt("Stream this text");

Flux<SpeechResponse> stream = model.stream(prompt);
stream.subscribe(response -> {
    byte[] audioChunk = response.getResult().getOutput();
    // Process audio chunk
});
```

**After (using shared interfaces):**

```java
import org.springframework.ai.audio.tts.*;
import org.springframework.ai.openai.OpenAiAudioSpeechModel;
import reactor.core.publisher.Flux;

TextToSpeechModel model = new OpenAiAudioSpeechModel(audioApi);
TextToSpeechPrompt prompt = new TextToSpeechPrompt("Stream this text");

Flux<TextToSpeechResponse> stream = model.stream(prompt);
stream.subscribe(response -> {
    byte[] audioChunk = response.getResult().getOutput();
    // Process audio chunk
});
```

#### Example 4: Dependency Injection with Spring Boot

**Before (deprecated):**

```java
@RestController
public class OldSpeechController {

    private final SpeechModel speechModel;

    @Autowired
    public OldSpeechController(SpeechModel speechModel) {
        this.speechModel = speechModel;
    }

    @PostMapping("/narrate")
    public ResponseEntity<byte[]> narrate(@RequestBody String text) {
        SpeechPrompt prompt = new SpeechPrompt(text);
        SpeechResponse response = speechModel.call(prompt);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("audio/mpeg"))
            .body(response.getResult().getOutput());
    }
}
```

**After (using shared interfaces):**

```java
@RestController
public class SpeechController {

    private final TextToSpeechModel textToSpeechModel;

    @Autowired
    public SpeechController(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    @PostMapping("/narrate")
    public ResponseEntity<byte[]> narrate(@RequestBody String text) {
        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text);
        TextToSpeechResponse response = textToSpeechModel.call(prompt);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("audio/mpeg"))
            .body(response.getResult().getOutput());
    }
}
```

### Spring Boot Configuration Changes

Spring Boot 自动配置属性保持不变。您的 `application.properties` 或 `application.yml` 文件不需要更改。

但是，如果您有显式的 bean 引用或限定符，请更新它们：

```java
// Before
@Qualifier("speechModel")

// After
@Qualifier("textToSpeechModel")
```

### Benefits of the Migration

- **可移植性**：编写一次代码，轻松在 OpenAI、ElevenLabs 或其他 TTS 提供者之间切换
- **一致性**：与 ChatModel 和其他 Spring AI 抽象相同的模式
- **类型安全**：通过适当的接口实现改进类型层次结构
- **面向未来**：新的 TTS 提供者将自动与您的现有代码一起工作
- **标准化**：所有 TTS 提供者的 `speed` 参数使用一致的 `Double` 类型

### Common Migration Issues and Solutions

#### Issue 1: Compilation Error - Cannot Find Symbol SpeechModel

**Error:**

```
error: cannot find symbol SpeechModel
```

**Solution:** 按照 Step 1 中的说明更新您的导入，将 `SpeechModel` 更改为 `TextToSpeechModel`。

#### Issue 2: Type Mismatch - Float Cannot Be Converted to Double

**Error:**

```
error: incompatible types: float cannot be converted to Double
```

**Solution:** 从浮点字面量中删除 `f` 后缀（例如，将 `1.0f` 更改为 `1.0`）。

#### Issue 3: Bean Creation Error at Runtime

**Error:**

```
NoSuchBeanDefinitionException: No qualifying bean of type 'SpeechModel'
```

**Solution:** 更新您的依赖注入以使用 `TextToSpeechModel` 而不是 `SpeechModel`。

## Example Code

* [OpenAiSpeechModelIT.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-openai/src/test/java/org/springframework/ai/openai/audio/speech/OpenAiSpeechModelIT.java) 测试提供了一些如何使用该库的通用示例。
