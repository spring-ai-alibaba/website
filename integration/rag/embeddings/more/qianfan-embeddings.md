# 百度千帆 Embedding

Spring AI 2.1 BOM 不再管理独立的千帆嵌入模块。保留已有索引时，请使用原嵌入模型及其当前服务接口。更换为 [DashScope Embedding](../dashscope-embeddings.md) 等其他模型时，用新模型重新生成文档向量并切换索引。
