# Google GenAI 图像、语音与转录

Spring AI 2.1 的 Google GenAI 集成可以使用 Gemini Developer API 或 Vertex AI。 [Google GenAI Chat](../chatmodels/more/google-genai-chat.md) 使用图像、音频和视频作为聊天输入。独立生成图像、合成语音和转录音频有各自的模型接口与 starter。

## 依赖与连接

使用 Spring AI BOM，按需要添加以下 `org.springframework.ai` starter：

| 功能 | Starter | 选择器 | 模型属性 |
| --- | --- | --- | --- |
| 图像生成 | `spring-ai-starter-model-google-genai-image` | `spring.ai.model.image=google-genai` | `spring.ai.google.genai.image.model` |
| 文本转语音 | `spring-ai-starter-model-google-genai-tts` | `spring.ai.model.audio.speech=google-genai` | `spring.ai.google.genai.tts.model` |
| 音频转录 | `spring-ai-starter-model-google-genai-transcription` | `spring.ai.model.audio.transcription=google-genai` | `spring.ai.google.genai.transcription.model` |

Gemini Developer API 使用应用环境中的 API key。Vertex AI 使用项目、区域和 Application Default Credentials（ADC），也可为适用接口配置凭据资源地址。模型可用性依账号、地区和端点而异。

```properties
spring.ai.google.genai.api-key=${GOOGLE_API_KEY}
spring.ai.model.image=google-genai
spring.ai.google.genai.image.model=gemini-2.5-flash-image
spring.ai.model.audio.speech=google-genai
spring.ai.google.genai.tts.model=gemini-2.5-flash-tts
spring.ai.model.audio.transcription=google-genai
spring.ai.google.genai.transcription.model=gemini-3.5-transcribe
```

## 调用

注入对应的 `ImageModel`、`TextToSpeechModel` 或 `TranscriptionModel`。下例中的 `audioResource` 是包含音频的 Spring `Resource`：

```java
import org.springframework.ai.audio.transcription.AudioTranscriptionPrompt;
import org.springframework.ai.audio.tts.TextToSpeechPrompt;
import org.springframework.ai.image.ImagePrompt;

var image = imageModel.call(new ImagePrompt("一张用于环保活动的蓝绿色海报"));
var speech = ttsModel.call(new TextToSpeechPrompt("欢迎参加本周的志愿活动。"));
String transcript = transcriptionModel.call(new AudioTranscriptionPrompt(audioResource))
        .getResult()
        .getOutput();
```

根据图像响应中的 URL 或 Base64 选择后续处理方式。音频格式、声线、多人语音设置和转录限制详见 [图像](https://docs.spring.io/spring-ai/reference/api/image/google-genai-image.html)、[语音合成](https://docs.spring.io/spring-ai/reference/api/audio/speech/google-genai-speech.html) 和 [转录](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/google-genai-transcriptions.html) 参考。
