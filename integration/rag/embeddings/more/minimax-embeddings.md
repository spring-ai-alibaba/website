# MiniMax Embedding

Spring AI 2.1 BOM 不再管理独立的 MiniMax 嵌入模块。MiniMax 的 [Anthropic 兼容接入](../../../chatmodels/more/minimax-chat.md) 提供聊天能力。要保留已有 MiniMax 向量索引，请按提供方当前支持的嵌入 API 继续生成相同模型的向量，并使用 [预计算向量接口](../../vectordbs/precomputed-embeddings.md) 接入支持的存储。
