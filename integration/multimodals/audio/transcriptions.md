# Transcription API

Spring AI 通过 `TranscriptionModel` 接口为 Speech-to-Text 转录提供统一的 API。这允许您编写可在不同转录提供者之间工作的可移植代码。

## Supported Providers

- [OpenAI's Whisper API](transcriptions/openai-transcriptions.md)
- [Azure OpenAI Whisper API](transcriptions/azure-openai-transcriptions.md)
- [DashScope Transcription API](transcriptions/dashscope-transcriptions.md)

## Common Interface

所有转录提供者实现以下共享接口：

### TranscriptionModel

`TranscriptionModel` 接口提供将音频转换为文本的方法：

```java
public interface TranscriptionModel extends Model<AudioTranscriptionPrompt, AudioTranscriptionResponse> {

    /**
     * Transcribes the audio from the given prompt.
     */
    AudioTranscriptionResponse call(AudioTranscriptionPrompt transcriptionPrompt);

    /**
     * A convenience method for transcribing an audio resource.
     */
    default String transcribe(Resource resource) {
        AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(resource);
        return this.call(prompt).getResult().getOutput();
    }

    /**
     * A convenience method for transcribing an audio resource with options.
     */
    default String transcribe(Resource resource, AudioTranscriptionOptions options) {
        AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(resource, options);
        return this.call(prompt).getResult().getOutput();
    }
}
```

### AudioTranscriptionPrompt

`AudioTranscriptionPrompt` 类封装输入音频和选项：

```java
Resource audioFile = new FileSystemResource("/path/to/audio.mp3");
AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(
    audioFile,
    options
);
```

### AudioTranscriptionResponse

`AudioTranscriptionResponse` 类包含转录的文本和元数据：

```java
AudioTranscriptionResponse response = model.call(prompt);
String transcribedText = response.getResult().getOutput();
AudioTranscriptionResponseMetadata metadata = response.getMetadata();
```

## Writing Provider-Agnostic Code

共享转录接口的主要好处之一是能够编写可在任何转录提供者上工作而无需修改的代码。实际的提供者（OpenAI、Azure OpenAI 等）由您的 Spring Boot 配置确定，允许您在不更改应用程序代码的情况下切换提供者。

### Basic Service Example

共享接口允许您编写可在任何转录提供者上工作的代码：

```java
@Service
public class TranscriptionService {

    private final TranscriptionModel transcriptionModel;

    public TranscriptionService(TranscriptionModel transcriptionModel) {
        this.transcriptionModel = transcriptionModel;
    }

    public String transcribeAudio(Resource audioFile) {
        return transcriptionModel.transcribe(audioFile);
    }

    public String transcribeWithOptions(Resource audioFile, AudioTranscriptionOptions options) {
        AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile, options);
        AudioTranscriptionResponse response = transcriptionModel.call(prompt);
        return response.getResult().getOutput();
    }
}
```

此服务可与 OpenAI、Azure OpenAI 或任何其他转录提供者无缝协作，实际实现由您的 Spring Boot 配置确定。

## Provider-Specific Features

虽然共享接口提供了可移植性，但每个提供者还通过提供者特定的选项类（例如 `OpenAiAudioTranscriptionOptions`、`AzureOpenAiAudioTranscriptionOptions`）提供特定功能。这些类实现 `AudioTranscriptionOptions` 接口，同时添加提供者特定的功能。

有关提供者特定功能的详细信息，请参阅各个提供者文档页面。
