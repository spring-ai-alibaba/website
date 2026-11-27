# Hugging Face Chat

Spring AI 2.1 BOM 不再管理独立 Hugging Face Chat 模块。对于可通过 Ollama 加载的 GGUF 聊天模型，使用 [Ollama 聊天接入](../ollama-chat.md#huggingface-models)。若使用 Hugging Face 托管推理，需要先确认该提供方的端点支持 Chat Completions，再按 [OpenAI 兼容接入](../openai-compatible.md) 配置。
