---
title: 百炼图像、视频与音频
description: 选择 Extensions 2.1.0.0 的百炼多模态模型和 API。
---

# 百炼图像、视频与音频

引入 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope` 并使用 Extensions 2.1.0.0 BOM。模型名和输入格式应与业务空间开通的能力一致。以下示例模型由该版本适配。

| 任务 | 接口 | 模型示例 |
| --- | --- | --- |
| 图像生成和编辑 | `DashScopeImageModel`、`DashScopeImageOptions` | `qwen-image-3.0-pro`、`qwen-image-3.0`、`wan2.7-image-pro` |
| 文生视频和图生视频 | `DashScopeVideoModel`、`DashScopeVideoOptions` | `wan3.0-video`、`wan2.7-t2v`、`wan2.7-i2v` |
| 语音识别 | `DashScopeAudioTranscriptionModel` | `qwen-audio-3.1-asr-flash`、`qwen-audio-3.1-asr-flash-filetrans` |
| 语音合成 | `DashScopeAudioSpeechModel` | `qwen-audio-3.1-tts-plus`、`qwen-audio-3.1-tts-flash`、`cosyvoice-v3.5-flash` |

## 图像与视频

Qwen Image 3.0 Pro 和 Qwen Image 3.0 同步返回 Base64 时可通过 `getB64Json()` 取图像。生成时省略参考图，编辑时可以通过 `baseImageUrl` 或 `images` 提供目标模型支持的参考图。

```java
var options = DashScopeImageOptions.builder()
    .model("qwen-image-3.0-pro")
    .baseImageUrl(referenceImageUrl)
    .responseFormat("b64_json")
    .build();

var image = imageModel.call(new ImagePrompt("保留主体，改用浅色背景", options))
    .getResult().getOutput();
String base64Image = image.getB64Json();
```

Wan 3.0 可用 `DashScopeVideoOptions` 的 `parameters` 指定 `resolution` 和 `ratio`，通过 `InputOptions.media` 提供参考媒体。适配器会按任务 ID 轮询完成，成功后从视频模型响应获取媒体 URL。

[图像选项](image/dashscope-image.md) · [视频模型源码](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0/models/spring-ai-alibaba-dashscope/src/main/java/com/alibaba/cloud/ai/dashscope/video)

## 语音识别和合成

短音频可用 `qwen-audio-3.1-asr-flash`，长文件用 `qwen-audio-3.1-asr-flash-filetrans` 并提供百炼可读取的文件 URL。实时转写使用 `qwen-audio-3.1-asr-flash-streaming` 和对应实时会话协议。

Qwen Audio 3.1 可以使用 `qwen-audio-3.1-tts-plus` 生成完整语音，低延迟场景可选择 `qwen-audio-3.1-tts-flash`。CosyVoice 3.5 使用为所选模型克隆或设计的音色。通过流式合成生成完整文件时，消费全部音频增量，并按输出编码组装。

[语音识别](audio/transcriptions/dashscope-transcriptions.md) · [语音合成](audio/speech/dashscope-speech.md)

## 在 Agent 中传递媒体

构造 Spring AI `Media` 时，使用与输入类型对应的 `.data(URI)`、`.data(String)` 或 `.data(byte[])` 等重载，并设置 MIME 类型。DashScope 工具消息接收文本，因此工具返回的媒体 URL 或 Base64 可用于应用展示。模型需要感知实际媒体时，由工具或图节点另发一条带 `Media` 的模型请求。在历史中保留完整的有序消息部分，持久化文件时可保存稳定的制品引用。

[多模态 Agent](/docs/frameworks/agent-framework/tutorials/multimodality) · [Graph 多模态工作流](/docs/frameworks/graph-core/examples/multimodal-workflow) · [百炼模型文档](https://docs.bailian.console.aliyun.com/zh/model-studio/qwen-api-via-dashscope)
