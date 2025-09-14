---
title: 百炼 RAG 集成 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

在前面的章节中，我们分别介绍了用于构建 RAG 应用的各个核心组件，例如 `DocumentReader`、`VectorStore` 和 `Retriever`。这为我们提供了极大的灵活性，可以自由组合不同的组件来搭建符合自己需求的 RAG 系统。

然而，搭建和维护一个生产级别的 RAG 系统，仍然会面临诸多挑战：
*   **ETL 流程复杂**: 文档解析、文本分割、向量化等一系列数据处理流程，需要开发者投入大量精力进行开发和维护。
*   **数据库运维**: 向量数据库的选型、部署、扩容和性能调优，是一项复杂的系统工程。
*   **算法调优**: 检索和重排算法的效果，直接决定了 RAG 的最终质量，而算法的持续优化需要专业的知识积累。

为了解决这些痛点，Spring AI Alibaba (SAA) 提供了与**阿里云百炼（Bailian）大模型平台**的深度集成。百炼 RAG 是一个**全托管、开箱即用**的 RAG 解决方案，它将复杂的 ETL、存储和检索算法封装为简单的 API 调用，让您可以更专注于业务逻辑的开发。

## 百炼 RAG 的核心优势

将您的 RAG 应用建立在百炼之上，可以获得以下核心优势：

*   **全托管与免运维**: 您无需关心底层向量数据库的运维和扩容，百炼平台会为您处理好一切。
*   **云端智能 ETL**: 利用百炼强大的文档解析服务，在云端完成对各类复杂文档（PDF, Word, PPT 等）的解析和处理，极大地简化了应用端的数据处理逻辑。
*   **内置先进算法**: 百炼 RAG 内置了阿里巴巴达摩院自研的高性能检索与重排算法，能够提供比通用方案更优的开箱即用效果。
*   **与通义千问无缝集成**: 整个 RAG 流程与通义千问大模型无缝衔接，形成了一个从知识处理到智能生成的闭环解决方案。

在 SAA 中，与百炼 RAG 服务的集成，主要通过两个核心组件来实现：`DashScopeDocumentCloudReader` 和 `DashScopeCloudStore`。

## 端到端工作流程

下面，我们将通过一个完整的示例，展示如何使用 SAA 组件，实现一个端到端的百炼 RAG 应用。

### 第一步：云端文档解析

首先，我们使用 `DashScopeDocumentCloudReader` 将本地文档上传到百炼平台进行解析。这个过程不仅会解析出文档的文本内容，还会返回一个唯一的 `fileId`，作为该文档在百炼平台上的标识。

```java
import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentCloudReader;
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentCloudReaderOptions;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BailianEtlService {

    private final DashScopeApi dashScopeApi;

    @Autowired
    public BailianEtlService(DashScopeApi dashScopeApi) {
        this.dashScopeApi = dashScopeApi;
    }

    public List<Document> processDocumentInCloud(String filePath) {
        
        // 可选：配置云端解析参数，例如指定解析模式
        DashScopeDocumentCloudReaderOptions options = DashScopeDocumentCloudReaderOptions.builder()
                .withParseFmtType("text")
                .build();

        // 创建 Reader 实例
        DashScopeDocumentCloudReader reader = new DashScopeDocumentCloudReader(
            filePath, 
            dashScopeApi, 
            options
        );

        // 调用 get() 方法，触发上传、云端解析和结果下载
        // 返回的 Document 对象的 ID 就是百炼平台的 fileId
        return reader.get();
    }
}
```
> **重要提示**: `DashScopeDocumentCloudReader` 在调用 `get()` 方法时，内部会**同步轮询**百炼平台的解析状态。对于非常大的文件，这个过程可能会比较耗时。

### 第二步：将文档加入 RAG 索引

在获取到云端解析后的 `Document` 列表（每个 `Document` 都带有一个 `fileId`）之后，我们使用 `DashScopeCloudStore` 将它们加入到您在百炼平台上指定的 RAG 索引中。

```java
import com.alibaba.cloud.ai.dashscope.rag.DashScopeCloudStore;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BailianIndexingService {

    private final DashScopeCloudStore vectorStore;

    @Autowired
    public BailianIndexingService(DashScopeCloudStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void addDocumentsToIndex(List<Document> documentsFromCloudReader) {
        // 直接调用 add 方法即可
        // SAA 会将 Document ID (即 fileId) 提交给百炼 RAG 服务
        vectorStore.add(documentsFromCloudReader);
    }
}
```

### 第三步：进行检索问答

一旦文档被加入索引，您就可以通过 `DashScopeCloudStore` 的 `similaritySearch` 方法，进行检索问答。

```java
import com.alibaba.cloud.ai.dashscope.rag.DashScopeCloudStore;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BailianQueryService {

    private final DashScopeCloudStore vectorStore;

    public BailianQueryService(DashScopeCloudStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public List<Document> query(String userQuestion) {
        SearchRequest searchRequest = SearchRequest.builder()
                .withQuery(userQuestion)
                .withTopK(3) // 指定希望返回最相关的 3 个结果
                .build();
        
        // 底层会调用百炼 RAG 的检索和重排服务
        return vectorStore.similaritySearch(searchRequest);
    }
}
```
此时，`DashScopeCloudStore` 会将您的查询和索引配置，一并发送给百炼 RAG 服务。百炼会完成**检索、重排**等所有复杂操作，并将最终的、最相关的文档块返回给您。

之后，您可以将这些文档块与用户问题一起，构建成最终的 Prompt，交给 `ChatModel` 生成答案。

## 配置总览

要启用完整的百炼 RAG 集成方案，您需要在 `application.yml` 中进行如下配置：

```yaml
spring:
  ai:
    alibaba:
      dashscope:
        # 您的通义千问 API Key
        api-key: ${DASH_SCOPE_API_KEY}
        
        rag:
          # 启用百炼 RAG 功能
          enabled: true
          # 指定您在百炼平台上创建的 RAG 索引/知识库的名称
          index-name: "your_bailian_rag_index_name"
          
          # 可选：配置检索时的默认参数
          retriever-options:
            rerank-top-n: 5 # 指定默认返回 Top 5 结果
```

通过以上三步和简单的配置，您就可以利用 SAA，将一个功能强大、性能优越、且无需运维的托管式 RAG 能力，轻松集成到您的 Spring Boot 应用中。
