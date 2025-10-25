---
title: 向量存储 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

`VectorStore` (向量数据库) 是 RAG 应用的“长期记忆”核心。在数据处理阶段，它负责存储文档块的文本内容及其对应的向量表示；在问答阶段，它接收用户的查询向量，并快速检索出语义上最相似的文档块，为大语言模型提供生成答案所需的上下文。

选择一个合适的 `VectorStore` 对 RAG 应用的性能、可扩展性和成本至关重要。

## Spring AI 核心支持

Spring AI Alibaba (SAA) 构建于 Spring AI 之上，因此它天然兼容 Spring AI 官方支持的所有 `VectorStore` 实现。这意味着您可以根据您的技术栈和偏好，自由选择市面上主流的向量数据库，例如：

*   **`PgVectorStore`**: 基于 PostgreSQL 数据库和 `pgvector` 扩展。
*   **`MilvusVectorStore`**: 对接开源的云原生向量数据库 Milvus。
*   **`ChromaVectorStore`**: 对接开源的向量数据库 ChromaDB。
*   **`RedisVectorStore`**: 使用 Redis Stack 作为向量数据库。
*   **`ElasticsearchVectorStore`**: 使用 Elasticsearch 作为向量数据库。
*   **`SimpleVectorStore`**: 一个基于本地 JSON 文件的简单实现，主要用于快速原型验证和测试，**不推荐在生产环境使用**。

您只需在项目中引入相应的 Spring AI Starter，SAA 便可以无缝地与其协同工作。

## SAA 增强与扩展

除了提供完全的兼容性，SAA 还针对阿里云生态和百炼大模型服务，提供了更深度、更便捷的集成方案。

### 1. DashScopeCloudStore：与百炼 RAG 服务无缝集成

`DashScopeCloudStore` 是 SAA 提供的一个重量级 `VectorStore` 实现。它并非一个简单的数据库连接器，而是直接与**阿里云百炼（Bailian）大模型平台的 RAG 服务**进行对接。

这是一种更高级的、托管式的 RAG 方案。您无需自行管理数据库、配置 ETL 流程或调优检索算法，而是将这些复杂的任务交给百炼平台。

**核心优势**:

*   **托管与免运维**: 您无需关心向量数据库的部署、扩容和维护。
*   **云端 ETL**: 文档的解析和处理可以由百炼平台在云端完成（通过 `DashScopeDocumentCloudReader`），减轻您应用端的负担。
*   **内置优化**: 百炼 RAG 服务内置了高效的检索和重排算法，通常能提供比手动搭建更好的开箱即用效果。
*   **一体化体验**: 从文档解析、向量化、存储到检索，与百炼大模型服务形成闭环。

**使用方法**:

#### (1) 配置

在 `application.yml` 中，配置 `DashScopeCloudStore`：

```yaml
spring:
  ai:
    alibaba:
      dashscope:
        rag:
          # 指定您在百炼平台上创建的 RAG 索引名称
          index-name: "your_bailian_rag_index_name"
          # 可选：配置检索参数
          retriever-options:
            rerank-top-n: 5 # 指定 Rerank 后返回 Top 5 结果
```

#### (2) 代码实现

`DashScopeCloudStore` 的使用方式与其他 `VectorStore` 完全一致。

```java
import com.alibaba.cloud.ai.dashscope.rag.DashScopeCloudStore;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BailianRagService {

    private final DashScopeCloudStore vectorStore;

    @Autowired
    public BailianRagService(DashScopeCloudStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    // 文档必须是 DashScopeDocumentCloudReader 的解析结果
    public void addDocuments(List<Document> documents) {
        vectorStore.add(documents);
    }

    public List<Document> search(String query) {
        // SearchRequest 中的 topK 会被 retriever-options 中的 rerank-top-n 覆盖
        return vectorStore.similaritySearch(
                SearchRequest.builder().withQuery(query).withTopK(10).build()
        );
    }
}
```
> **注意**: 使用 `DashScopeCloudStore` 时，`add` 方法接收的 `Document` 列表通常应来自 `DashScopeDocumentCloudReader`，因为其 `Document` ID 与百炼平台的文件 ID 相关联。

### 2. AnalyticDB for PostgreSQL (ADB-PG)

阿里云 AnalyticDB for PostgreSQL 是一个高性能、可扩展的云原生数据仓库，它兼容 `pgvector` 扩展，使其成为一个理想的企业级向量数据库解决方案。

SAA 通过标准的 Spring AI `PgVectorStore` Starter 来支持 ADB-PG。

**使用方法**:

#### (1) 添加依赖

在 `pom.xml` 中添加 `spring-ai-pgvector-store` 依赖。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
```

#### (2) 配置

在 `application.yml` 中，将 `spring.datasource.url` 指向您的 ADB-PG 实例的连接地址。

```yaml
spring:
  datasource:
    # 替换为您的 ADB-PG 连接信息
    url: jdbc:postgresql://<your-adb-pg-host>:<port>/<database>
    username: <your-username>
    password: <your-password>
  ai:
    vectorstore:
      pgvector:
        index-name: "saa_vector_store"
        dimensions: 1536 # 与您的 Embedding 模型维度保持一致
        distance-type: COSINE
```

### 3. Alibaba Cloud OpenSearch (LLM 向量版)

阿里云 OpenSearch LLM 向量检索版是基于 Apache Lucene 构建的，提供高性能、可扩展的向量检索能力。它兼容 Elasticsearch 的 API。

SAA 通过标准的 Spring AI `ElasticsearchVectorStore` Starter 来支持 OpenSearch。

**使用方法**:

#### (1) 添加依赖

在 `pom.xml` 中添加 `spring-ai-elasticsearch-store` 依赖。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-elasticsearch-store</artifactId>
</dependency>
```

#### (2) 配置

在 `application.yml` 中，配置 OpenSearch 的连接信息。

```yaml
spring:
  ai:
    vectorstore:
      elasticsearch:
        # 替换为您的 OpenSearch 实例连接信息
        uris: https://<your-opensearch-host>:<port>
        username: <your-username>
        password: <your-password>
        index-name: "saa_opensearch_index"
        dimensions: 1536 # 与您的 Embedding 模型维度保持一致
```
之后，您就可以像使用标准的 `ElasticsearchVectorStore` 一样，在代码中注入并使用 `VectorStore` 接口了。
