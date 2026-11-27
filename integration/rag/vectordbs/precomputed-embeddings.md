---
title: 预计算向量
description: 将已有嵌入向量写入五种阿里云向量库，并直接执行向量相似度检索。
---

# 写入与检索预计算向量

Extensions 2.1.0.0 支持在 [AnalyticDB](analyticdb.md)、[OceanBase](oceanbase.md)、[阿里云 OpenSearch](opensearch.md)、[Tablestore](more/tablestore.md) 和 [Tair](tair.md) 中使用预计算的向量。适用于离线批处理或由外部服务统一生成嵌入的场景。

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.EmbeddedDocument;
import org.springframework.ai.vectorstore.SearchRequest;

// indexVector 和 queryVector 由应用提前生成。
var document = new Document("Spring AI Alibaba 支持预计算向量。");
vectorStore.upsert(List.of(new EmbeddedDocument(document, indexVector)));

var matches = vectorStore.similaritySearch(
    queryVector,
    SearchRequest.builder().topK(5).similarityThreshold(0.75).build());
```

- 根据实际后端配置索引维度。写入向量、查询向量和索引维度必须一致，向量库会在操作时校验。
- 文档向量和查询向量应来自同一嵌入模型及版本，以便计算有意义的相似度。
- `SearchRequest` 负责设置 Top K、阈值和后端支持的元数据过滤。查询向量由单独的 `float[]` 参数提供。
- 两条预计算路径直接使用传入向量，跳过 `EmbeddingModel` 推理。文本 `add` 和文本 `similaritySearch` 继续使用配置的嵌入模型。

## 对齐后端索引维度

| 向量库 | 确认维度的位置 |
| --- | --- |
| AnalyticDB | `spring.ai.vectorstore.analyticdb.dimensions` 或已有集合的向量维度 |
| OceanBase | `spring.ai.vectorstore.oceanbase.dimension` 或表中向量列的维度 |
| 阿里云 OpenSearch | `spring.ai.vectorstore.opensearch.dimensions`，应与服务端向量字段一致 |
| Tablestore | 知识库索引的向量维度，由 `KnowledgeStoreImpl.getEmbeddingDimension()` 提供 |
| Tair | `spring.ai.vectorstore.tair.options.dimensions` 或已有索引的 `dimension` |

预计算写入前校验批次中每条向量。查询向量维度不匹配时，修正应用的生成配置或切换到同维度的索引，再重试。使用自动配置时，向量库 Bean 仍可能需要 `EmbeddingModel` 作为构造依赖，以支持普通文本路径。

[Extensions 2.1.0.0 发布说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.1.0.0)
