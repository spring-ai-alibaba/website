# Chat Models 对比

此表格对比了 Spring AI 支持的各种 Chat Models，详细说明了它们的功能：

- [Multimodality](api/multimodality): 模型可以处理的输入类型（例如，text、image、audio、video）。
- [Tools/Function Calling](api/tools): 模型是否支持 function calling 或 tool use。
- Streaming: 模型是否提供 streaming 响应。
- Retry: 是否支持 retry 机制。
- [Observability](observability/index): 用于监控和调试的功能。
- [Built-in JSON](api/structured-output-converter#_built_in_json_mode): 原生支持 JSON 输出。
- Local deployment: 模型是否可以在本地运行。
- OpenAI API Compatibility: 模型是否与 OpenAI 的 API 兼容。

| Provider | Multimodality | Tools/Functions | Streaming | Retry | Observability | Built-in JSON | Local | OpenAI API Compatible |
|----------|---------------|-----------------|-----------|-------|---------------|---------------|-------|----------------------|
| [Anthropic Claude](api/chat/anthropic-chat) | text, pdf, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [Azure OpenAI](api/chat/azure-openai-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [DeepSeek (OpenAI-proxy)](api/chat/deepseek-chat) | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Google GenAI](api/chat/google-genai-chat) | text, pdf, image, audio, video | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| [Google VertexAI Gemini](api/chat/vertexai-gemini-chat) | text, pdf, image, audio, video | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [Groq (OpenAI-proxy)](api/chat/groq-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [HuggingFace](api/chat/huggingface) | text | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| [Mistral AI](api/chat/mistralai-chat) | text, image, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [MiniMax](api/chat/minimax-chat) | text | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [Moonshot AI](api/chat/moonshot-chat) | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | |
| [NVIDIA (OpenAI-proxy)](api/chat/nvidia-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [OCI GenAI/Cohere](api/chat/oci-genai/cohere-chat) | text | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| [Ollama](api/chat/ollama-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [OpenAI SDK (Official)](api/chat/openai-sdk-chat) | In: text, image, audio<br>Out: text, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [OpenAI](api/chat/openai-chat) | In: text, image, audio<br>Out: text, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [Perplexity (OpenAI-proxy)](api/chat/perplexity-chat) | text | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [QianFan](api/chat/qianfan-chat) | text | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [ZhiPu AI](api/chat/zhipuai-chat) | text, image, docs | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [Amazon Bedrock Converse](api/chat/bedrock-converse) | text, image, video, docs (pdf, html, md, docx ...) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

