# OpenAI SDK Image 迁移

Spring AI 2.0.3 已将原 `spring-ai-openai-sdk` 模块并入 `spring-ai-openai`。将 Starter 改为 `org.springframework.ai:spring-ai-starter-model-openai`，将 `OpenAiSdkImageModel` 改为 `OpenAiImageModel`，并把连接配置迁移到 `spring.ai.openai`。在模型配置中使用当前属性名，如 `spring.ai.openai.chat.model`。

[当前模型接入指南](openai-image.md) · [Spring AI 2.0 迁移说明](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-0.html)
