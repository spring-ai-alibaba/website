# Chat Models 对比

下表以 Spring AI 2.1 的接口为基准。媒体类型、工具调用及输出格式还取决于所用模型、API 端点和账号权限。原生 JSON 模式和 JSON Schema 约束有各自的能力要求，相关用法见 [结构化输出](../chatclient.md) 和 [Spring AI 原生结构化输出参考](https://docs.spring.io/spring-ai/reference/api/structured-output/native.html)。

| 接入 | 主要输入 | 工具调用 | 流式响应 | 备注 |
| --- | --- | --- | --- | --- |
| [Anthropic Claude](more/anthropic-chat.md) | 文本、PDF、图像 | 支持 | 支持 | Anthropic API |
| [DeepSeek OpenAI 兼容端点](https://docs.spring.io/spring-ai/reference/api/chat/deepseek-chat.html) | 文本 | 支持 | 支持 | 参见 [原生 DeepSeek 接入](deepseek-chat.md) |
| [Google GenAI](more/google-genai-chat.md) | 文本、PDF、图像、音频、视频 | 支持 | 支持 | Gemini Developer API 或 Vertex AI |
| [Groq](more/groq-chat.md) | 文本、图像 | 支持 | 支持 | OpenAI 兼容端点 |
| [Mistral AI](more/mistralai-chat.md) | 文本、图像、音频 | 支持 | 支持 | 模型能力随端点而异 |
| [MiniMax](more/minimax-chat.md) | 文本、图像 | 支持 | 支持 | Anthropic 兼容端点 |
| [NVIDIA](more/nvidia-chat.md) | 文本、图像 | 支持 | 支持 | OpenAI 兼容端点 |
| [Ollama](ollama-chat.md) | 文本、图像 | 支持 | 支持 | 可本地部署 |
| [OpenAI Chat Completions](openai-chat.md) | 文本、图像、音频 | 支持 | 支持 | 支持文本和音频输出，可接部分兼容端点 |
| [OpenAI Responses](openai-responses.md) | 文本、图像、PDF | 支持 | 支持 | 支持文本和图像输出、服务端工具 |
| [Perplexity](more/perplexity-chat.md) | 文本 | — | 支持 | OpenAI 兼容端点 |
| [Qxotic jinfer](https://docs.spring.io/spring-ai/reference/api/chat/jinfer-chat.html) | 文本、图像、音频、视频，取决于本地模型 | 支持 | 支持 | JVM 内推理 |
| [Amazon Bedrock Converse](more/bedrock-converse.md) | 文本、图像、视频、文档 | 支持 | 支持 | 支持的媒体格式随模型而异 |

完整的重试、可观测性、原生 JSON、本地部署以及协议兼容性见 [Spring AI Chat Models 对照表](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html)。

## 阿里云百炼

[DashScope](dashScope.md) 由 Spring AI Alibaba Extensions 提供。可通过百炼原生 DashScope API 或 OpenAI 兼容 API 调用 Qwen、GLM、Kimi 等模型，具体入口依据模型文档确定。需要图像或音视频的场景，参见 [DashScope 多模态](../multimodals/dashscope-multimodal.md)。需要分类、明确选项或等级评分的场景，参见 [Decision Models](../decision-models/overview.md)。

## 旧版集成迁移

| 旧接入 | 2.1.x 入口 |
| --- | --- |
| Vertex AI Gemini Chat | [Google GenAI 的 Vertex AI 模式](gemini-chat.md) |
| 独立 Azure OpenAI、OpenAI SDK | [Azure / Microsoft Foundry](more/azure-openai-chat.md) 与 [统一 OpenAI 模块](more/openai-sdk-chat.md) |
| 独立 MiniMax | [Anthropic 兼容模式](more/minimax-chat.md) |
| Hugging Face、OCI GenAI、千帆、智谱 | 各自的 [Hugging Face](more/huggingface.md)、[OCI](more/oci-genai/cohere-chat.md)、[千帆](../multimodals/image/qianfan-image.md)、[智谱](more/zhipuai-chat.md) 迁移说明 |
