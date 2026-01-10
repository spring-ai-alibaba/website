# Text-To-Speech (TTS) API

Spring AI 通过 `TextToSpeechModel` 和 `StreamingTextToSpeechModel` 接口为 Text-To-Speech (TTS) 提供统一的 API。这允许您编写可在不同 TTS 提供者之间工作的可移植代码。

## Supported Providers

- [OpenAI's Speech API](speech/openai-speech.md)
<!-- - [Eleven Labs Text-To-Speech API](speech/elevenlabs-speech.md) -->
- [DashScope Text-To-Speech API](speech/dashscope-speech.md)

## Common Interface

所有 TTS 提供者实现以下共享接口：

### TextToSpeechModel

`TextToSpeechModel` 接口提供将文本转换为语音的方法：

```java
public interface TextToSpeechModel extends Model<TextToSpeechPrompt, TextToSpeechResponse>, StreamingTextToSpeechModel {

    /**
     * Converts text to speech with default options.
     */
    default byte[] call(String text) {
        // Default implementation
    }

    /**
     * Converts text to speech with custom options.
     */
    TextToSpeechResponse call(TextToSpeechPrompt prompt);

    /**
     * Returns the default options for this model.
     */
    default TextToSpeechOptions getDefaultOptions() {
        // Default implementation
    }
}
```

### StreamingTextToSpeechModel

`StreamingTextToSpeechModel` 接口提供实时流式传输音频的方法：

```java
@FunctionalInterface
public interface StreamingTextToSpeechModel extends StreamingModel<TextToSpeechPrompt, TextToSpeechResponse> {

    /**
     * Streams text-to-speech responses with metadata.
     */
    Flux<TextToSpeechResponse> stream(TextToSpeechPrompt prompt);

    /**
     * Streams audio bytes for the given text.
     */
    default Flux<byte[]> stream(String text) {
        // Default implementation
    }
}
```

### TextToSpeechPrompt

`TextToSpeechPrompt` 类封装输入文本和选项：

```java
TextToSpeechPrompt prompt = new TextToSpeechPrompt(
    "Hello, this is a text-to-speech example.",
    options
);
```

### TextToSpeechResponse

`TextToSpeechResponse` 类包含生成的音频和元数据：

```java
TextToSpeechResponse response = model.call(prompt);
byte[] audioBytes = response.getResult().getOutput();
TextToSpeechResponseMetadata metadata = response.getMetadata();
```

## Writing Provider-Agnostic Code

共享 TTS 接口的主要好处之一是能够编写可在任何 TTS 提供者上工作而无需修改的代码。实际的提供者（OpenAI、ElevenLabs 等）由您的 Spring Boot 配置确定，允许您在不更改应用程序代码的情况下切换提供者。

### Basic Service Example

共享接口允许您编写可在任何 TTS 提供者上工作的代码：

```java
@Service
public class NarrationService {

    private final TextToSpeechModel textToSpeechModel;

    public NarrationService(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    public byte[] narrate(String text) {
        // Works with any TTS provider
        return textToSpeechModel.call(text);
    }

    public byte[] narrateWithOptions(String text, TextToSpeechOptions options) {
        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text, options);
        TextToSpeechResponse response = textToSpeechModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

此服务可与 OpenAI、ElevenLabs 或任何其他 TTS 提供者无缝协作，实际实现由您的 Spring Boot 配置确定。

### Advanced Example: Multi-Provider Support

您可以构建同时支持多个 TTS 提供者的应用程序：

```java
@Service
public class MultiProviderNarrationService {

    private final Map<String, TextToSpeechModel> providers;

    public MultiProviderNarrationService(List<TextToSpeechModel> models) {
        // Spring will inject all available TextToSpeechModel beans
        this.providers = models.stream()
            .collect(Collectors.toMap(
                model -> model.getClass().getSimpleName(),
                model -> model
            ));
    }

    public byte[] narrateWithProvider(String text, String providerName) {
        TextToSpeechModel model = providers.get(providerName);
        if (model == null) {
            throw new IllegalArgumentException("Unknown provider: " + providerName);
        }
        return model.call(text);
    }

    public Set<String> getAvailableProviders() {
        return providers.keySet();
    }
}
```

### Streaming Audio Example

共享接口还支持实时音频生成的流式传输：

```java
@Service
public class StreamingNarrationService {

    private final TextToSpeechModel textToSpeechModel;

    public StreamingNarrationService(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    public Flux<byte[]> streamNarration(String text) {
        // TextToSpeechModel extends StreamingTextToSpeechModel
        return textToSpeechModel.stream(text);
    }

    public Flux<TextToSpeechResponse> streamWithMetadata(String text, TextToSpeechOptions options) {
        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text, options);
        return textToSpeechModel.stream(prompt);
    }
}
```

### REST Controller Example

使用与提供者无关的 TTS 构建 REST API：

```java
@RestController
@RequestMapping("/api/tts")
public class TextToSpeechController {

    private final TextToSpeechModel textToSpeechModel;

    public TextToSpeechController(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    @PostMapping(value = "/synthesize", produces = "audio/mpeg")
    public ResponseEntity<byte[]> synthesize(@RequestBody SynthesisRequest request) {
        byte[] audio = textToSpeechModel.call(request.text());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("audio/mpeg"))
            .header("Content-Disposition", "attachment; filename=\"speech.mp3\"")
            .body(audio);
    }

    @GetMapping(value = "/stream", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public Flux<byte[]> streamSynthesis(@RequestParam String text) {
        return textToSpeechModel.stream(text);
    }

    record SynthesisRequest(String text) {}
}
```

### Configuration-Based Provider Selection

使用 Spring profiles 或属性在提供者之间切换：

```yaml
# application-openai.yml
spring:
  ai:
    model:
      audio:
        speech: openai
    openai:
      api-key: ${OPENAI_API_KEY}
      audio:
        speech:
          options:
            model: gpt-4o-mini-tts
            voice: alloy

# application-elevenlabs.yml
spring:
  ai:
    model:
      audio:
        speech: elevenlabs
    elevenlabs:
      api-key: ${ELEVENLABS_API_KEY}
      tts:
        options:
          model-id: eleven_turbo_v2_5
          voice-id: your_voice_id
```

然后激活所需的提供者：

```bash
# Use OpenAI
java -jar app.jar --spring.profiles.active=openai

# Use ElevenLabs
java -jar app.jar --spring.profiles.active=elevenlabs
```

### Using Portable Options

为了最大可移植性，仅使用通用 `TextToSpeechOptions` 接口方法：

```java
@Service
public class PortableNarrationService {

    private final TextToSpeechModel textToSpeechModel;

    public PortableNarrationService(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    public byte[] createPortableNarration(String text) {
        // Use provider's default options for maximum portability
        TextToSpeechOptions defaultOptions = textToSpeechModel.getDefaultOptions();
        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text, defaultOptions);
        TextToSpeechResponse response = textToSpeechModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

### Working with Provider-Specific Features

当您需要提供者特定功能时，您仍然可以在保持可移植代码库的同时使用它们：

```java
@Service
public class FlexibleNarrationService {

    private final TextToSpeechModel textToSpeechModel;

    public FlexibleNarrationService(TextToSpeechModel textToSpeechModel) {
        this.textToSpeechModel = textToSpeechModel;
    }

    public byte[] narrate(String text, TextToSpeechOptions baseOptions) {
        TextToSpeechOptions options = baseOptions;

        // Apply provider-specific optimizations if available
        if (textToSpeechModel instanceof OpenAiAudioSpeechModel) {
            options = OpenAiAudioSpeechOptions.builder()
                .from(baseOptions)
                .model("gpt-4o-tts")  // OpenAI-specific: use high-quality model
                .speed(1.0)
                .build();
        } else if (textToSpeechModel instanceof ElevenLabsTextToSpeechModel) {
            // ElevenLabs-specific options could go here
        }

        TextToSpeechPrompt prompt = new TextToSpeechPrompt(text, options);
        TextToSpeechResponse response = textToSpeechModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

### Best Practices for Portable Code

1. **依赖接口**：始终注入 `TextToSpeechModel` 而不是具体实现
2. **使用通用选项**：坚持使用 `TextToSpeechOptions` 接口方法以获得最大可移植性
3. **优雅处理元数据**：不同的提供者返回不同的元数据；通用地处理它
4. **使用多个提供者进行测试**：确保您的代码至少与两个 TTS 提供者一起工作
5. **记录提供者假设**：如果您依赖特定的提供者行为，请清楚地记录它

## Provider-Specific Features

虽然共享接口提供了可移植性，但每个提供者还通过提供者特定的选项类（例如 `OpenAiAudioSpeechOptions`、`ElevenLabsSpeechOptions`）提供特定功能。这些类实现 `TextToSpeechOptions` 接口，同时添加提供者特定的功能。
