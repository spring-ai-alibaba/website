# Azure OpenAI Chat 迁移

Spring AI 2.1.0 已将原 `spring-ai-azure-openai` 模块并入 `spring-ai-openai`。将 Starter 改为 `org.springframework.ai:spring-ai-starter-model-openai`，将 `AzureOpenAiChatModel` 改为 `OpenAiChatModel`，并把连接配置迁移到 `spring.ai.openai`。在模型配置中使用当前属性名，如 `spring.ai.openai.chat.model`。
Azure 连接需同时核对资源端点、部署名和所选身份认证。

[当前模型接入指南](../openai-chat.md) · [Spring AI 2.0 迁移说明](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-0.html)
