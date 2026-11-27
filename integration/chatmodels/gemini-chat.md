---
sidebar_position: 3
---

# Vertex AI Gemini Chat

原有 Vertex AI Gemini Chat 迁移到 [Google GenAI Chat](more/google-genai-chat.md)。在 Spring AI BOM 下使用 `org.springframework.ai:spring-ai-starter-model-google-genai`。使用 Vertex AI 时，在部署环境配置 Google Cloud 应用默认凭据（ADC），再设置项目和区域：

```properties
spring.ai.model.chat=google-genai
spring.ai.google.genai.project-id=${GOOGLE_CLOUD_PROJECT}
spring.ai.google.genai.location=global
spring.ai.google.genai.chat.model=gemini-2.5-flash
```

## Multimodal

聊天可接收图像、PDF、音频或视频，具体格式随模型而异。参见 [Google GenAI Chat 多模态示例](more/google-genai-chat.md#multimodal)。独立的图像生成、语音合成和转录见 [Google GenAI 多模态服务](../multimodals/google-genai.md)。
