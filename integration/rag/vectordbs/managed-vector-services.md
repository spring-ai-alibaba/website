# AWS 托管向量检索

Amazon S3 Vectors 和 Amazon Bedrock Knowledge Base 均可为 Spring AI 应用提供检索。应用需要自行写入和维护向量时，使用 S3 Vectors。文档已由 Bedrock Knowledge Base 管理时，可直接查询托管知识库。

## S3 Vectors

添加 `org.springframework.ai:spring-ai-starter-vector-store-s3`，并为应用提供配置了 AWS 凭据及区域的 `S3VectorsClient` Bean 和 `EmbeddingModel` Bean。向量桶与索引应与应用的 AWS 区域和嵌入模型一致：

```properties
spring.ai.vectorstore.s3.vector-bucket-name=my-vector-bucket
spring.ai.vectorstore.s3.index-name=my-document-index
```

`S3VectorStore` 支持写入、相似度检索和元数据过滤。部署前确认索引的距离度量、向量维度及可过滤元数据。建索引与过滤语义见 [Spring AI S3 Vector Store](https://docs.spring.io/spring-ai/reference/api/vectordbs/s3-vector-store.html)。

## Bedrock Knowledge Base

添加 `org.springframework.ai:spring-ai-starter-vector-store-bedrock-knowledgebase`。用 AWS SDK 标准凭据链认证，配置已有知识库的 ID：

```properties
spring.ai.vectorstore.bedrock-knowledge-base.knowledge-base-id=${BEDROCK_KNOWLEDGE_BASE_ID}
spring.ai.vectorstore.bedrock-knowledge-base.region=us-east-1
spring.ai.vectorstore.bedrock-knowledge-base.top-k=5
```

这个适配器通过 `VectorStore` 提供只读检索。文档写入和删除由知识库数据源同步负责。可按后端能力配置元数据过滤、混合搜索和托管重排。详见 [Spring AI Amazon Bedrock Knowledge Base](https://docs.spring.io/spring-ai/reference/api/vectordbs/bedrock-knowledge-base.html)。
