---
title: 百炼图像、视频与音频
description: 选择 Extensions 2.1.0.0 的百炼多模态模型和 API。
---

# 百炼图像、视频与音频

引入 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope` 并使用 Extensions 2.1.0.0 BOM。模型名和输入格式应与业务空间开通的能力一致。以下示例模型由该版本适配。

| 任务 | 接口 | 模型示例 |
| --- | --- | --- |
| 图像生成和编辑 | `DashScopeImageModel`、`DashScopeImageOptions` | `wan2.6-t2i`、`wan2.7-image` |
| 文生视频和图生视频 | `DashScopeVideoModel`、`DashScopeVideoOptions` | `wan2.7-t2v`、`wan2.7-i2v` |
| 语音识别 | `DashScopeAudioTranscriptionModel` | `qwen3-asr-flash`、`qwen3-asr-flash-filetrans` |
| 语音合成 | `DashScopeAudioSpeechModel` | `qwen-tts-latest`、`cosyvoice-v3.5-flash` |

## 图像与视频

图像编辑输入参考图时，用目标模型支持的图片字段，单图可从 `DashScopeImageOptions.builder().baseImageUrl(url)` 开始。视频请求使用 `DashScopeVideoOptions` 的输入和任务参数，选择生视频的文本、图片或参考媒体。异步生成接受任务后需要等待完成，再将返回的媒体 URL 转交应用。

[图像选项](image/dashscope-image.md) · [视频模型源码](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0/models/spring-ai-alibaba-dashscope/src/main/java/com/alibaba/cloud/ai/dashscope/video)

## 语音识别和合成

按音频来源选择支持短音频、文件转写或实时会话的模型，传入其支持的资源。流式合成会逐段返回音频，生成完整文件时消费全部音频增量，并按输出编码组装。CosyVoice 的音色与 Qwen 的音色各自对应模型，请在切换模型时同时确认音色和编码参数。

[语音识别](audio/transcriptions/dashscope-transcriptions.md) · [语音合成](audio/speech/dashscope-speech.md)

## 在 Agent 中传递媒体

Graph 工具结果可携带 URL 或内联 Base64。构造 Spring AI `Media` 时，使用与输入类型对应的 `.data(URI)`、`.data(String)` 或 `.data(byte[])` 等重载，并设置 MIME 类型。在历史记录中保留有序 `MediaPart` 和其他消息部分，以确保后续轮次仍能看到关联媒体。

[有序消息](../chatmodels/dashScope.md) · [百炼模型文档](https://docs.bailian.console.aliyun.com/zh/model-studio/qwen-api-via-dashscope)
