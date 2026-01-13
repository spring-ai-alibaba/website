# Chat Models 对比

此表格对比了 Spring AI 支持的各种 Chat Models，详细说明了它们的功能：

- [Multimodality](../multimodals/multimodality): 模型可以处理的输入类型（例如，text、image、audio、video）。
- [Tools/Function Calling](../toolcalls/tool-calls): 模型是否支持 function calling 或 tool use。
- Streaming: 模型是否提供 streaming 响应。
- Retry: 是否支持 retry 机制。
- Observability: 用于监控和调试的功能。
- Built-in JSON: 原生支持 JSON 输出。
- Local deployment: 模型是否可以在本地运行。
- OpenAI API Compatibility: 模型是否与 OpenAI 的 API 兼容。

| Provider | Multimodality | Tools/Functions | Streaming | Retry | Observability | Built-in JSON | Local | OpenAI API Compatible |
|----------|---------------|-----------------|-----------|-------|---------------|---------------|-------|----------------------|
| [DashScope](dashScope) | text, pdf, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [Qwen](qwq) | text, pdf, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | x |
| [Anthropic Claude](https://docs.spring.io/spring-ai/reference/api/chat/anthropic-chat.html) | text, pdf, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [Azure OpenAI](more/azure-openai-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [DeepSeek (OpenAI-proxy)](deepseek-chat) | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Google GenAI](more/google-genai-chat) | text, pdf, image, audio, video | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| [Google VertexAI Gemini](gemini-chat) | text, pdf, image, audio, video | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [Groq (OpenAI-proxy)](more/groq-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [HuggingFace](more/huggingface) | text | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| [Mistral AI](more/mistralai-chat) | text, image, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [MiniMax](more/minimax-chat) | text | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [Moonshot AI](more/moonshot-chat) | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | |
| [NVIDIA (OpenAI-proxy)](more/nvidia-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [OCI GenAI/Cohere](more/oci-genai/cohere-chat) | text | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| [Ollama](ollama-chat) | text, image | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [OpenAI SDK (Official)](more/openai-sdk-chat) | In: text, image, audio<br/>Out: text, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [OpenAI](openai-chat) | In: text, image, audio<br/>Out: text, audio | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| [Perplexity (OpenAI-proxy)](more/perplexity-chat) | text | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| [QianFan](https://docs.spring.io/spring-ai/reference/api/chat/qianfan-chat.html) | text | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [ZhiPu AI](more/zhipuai-chat) | text, image, docs | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| [Amazon Bedrock Converse](more/bedrock-converse) | text, image, video, docs (pdf, html, md, docx ...) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

