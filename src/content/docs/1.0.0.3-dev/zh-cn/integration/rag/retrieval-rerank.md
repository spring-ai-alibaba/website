---
title: 检索与重排 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

在 RAG 流程中，将用户的查询（Query）与知识库中的海量文档进行匹配，并找出最相关的若干信息片段，是决定最终答案质量的最关键一步。这个过程通常分为两个阶段：**检索 (Retrieval)** 和 **重排 (Reranking)**。

Spring AI Alibaba (SAA) 在 Spring AI 的基础上，对这两个环节都提供了强大的支持和增强。

## 基本检索：召回相关信息

检索，也常被称为"召回"（Recall），其目标是从庞大的向量数据库中，快速、广泛地找出可能与用户问题相关的一个文档集合。

### VectorStoreRetriever

在 Spring AI 中，最基础和核心的检索器是 `VectorStoreRetriever`。它的工作原理非常直观：

1.  接收一个字符串形式的用户查询。
2.  在内部调用 `EmbeddingModel` 将该查询字符串转换为向量。
3.  调用 `VectorStore` 的 `similaritySearch` 方法，在数据库中找出与查询向量最相似的 Top-K 个文档向量。
4.  返回这些向量所对应的 `Document` 对象列表。

**使用示例**:

```java
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.VectorStoreRetriever;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BasicRetrievalService {

    private final VectorStoreRetriever retriever;

    // 直接注入 VectorStore，Spring AI 会自动创建一个 VectorStoreRetriever
    public BasicRetrievalService(VectorStore vectorStore) {
        this.retriever = new VectorStoreRetriever(vectorStore);
    }

    public List<Document> retrieve(String query) {
        // 直接调用 retrieve 方法即可
        return this.retriever.retrieve(query);
    }
}
```

`VectorStoreRetriever` 能够快速地从海量数据中"召回"一个候选集，但它的主要依据是向量的"距离"，有时可能无法完全捕捉到用户查询的细微语义差别。为了进一步提升结果的精准度，我们就需要引入"重排"。

## 重排 (Reranking)：优选最佳答案

重排，也称为"精排"，是在检索之后的一个可选但强烈推荐的步骤。它的目标是对初步检索出的文档列表进行二次的、更精细的排序。

### 为什么需要重排？

想象一下，用户查询"最新的 AI Agent 框架有哪些？"，向量检索可能会返回包含"AI"、"Agent"、"框架"这些关键词的很多文档，例如一篇介绍 Spring AI 历史的文章、一篇关于 LangChain Agent 的教程、以及一篇最新的 SAA Agent 功能发布公告。从向量相似度来看，它们可能都很高，但显然，SAA 的发布公告才是最符合用户"最新"这个意图的答案。

`RerankModel` 正是为了解决这个问题而生。它不再仅仅比较向量的几何距离，而是会调用一个更复杂的模型，来**计算用户原始查询字符串与每个候选文档的文本内容之间的"语义相关性得分"**。基于这个得分，它可以将真正最匹配的文档排到最前面。

### SAA 的 RerankModel

SAA 提供了 `RerankModel` 接口和基于通义千问的 `DashScopeRerankModel` 实现，让您可以在 RAG 流程中轻松加入重排能力。

*   **核心优势**:
    *   **提升精度**: 显著提升返回给大语言模型的上下文质量，从而生成更准确的答案。
    *   **过滤噪音**: 可以设定一个相关性得分阈值，过滤掉相关性不高的文档，避免它们干扰大语言模型的判断。
    *   **节约成本**: 通过向大语言模型提供更少但更精华的上下文，可以减少 Token 的消耗，从而降低 API 调用成本。

**手动使用 RerankModel 的示例**:

```java
import com.alibaba.cloud.ai.model.RerankModel;
import com.alibaba.cloud.ai.model.RerankRequest;
import com.alibaba.cloud.ai.model.RerankResponse;
import com.alibaba.cloud.ai.document.DocumentWithScore;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ManualRerankService {

    private final RerankModel rerankModel;

    public ManualRerankService(RerankModel rerankModel) {
        this.rerankModel = rerankModel;
    }

    public List<DocumentWithScore> rerankDocuments(String query, List<Document> candidates) {
        // 构建重排请求
        RerankRequest request = RerankRequest.builder()
                .withQuery(query)
                .withInstructions(candidates)
                .build();

        // 调用重排模型
        RerankResponse response = rerankModel.call(request);

        // 返回带有相关性得分的文档列表，已按得分从高到低排序
        return response.getDocuments();
    }
}
```

## 高级检索策略

结合基本检索和重排，SAA 提供了一套灵活的工具，帮助您构建高级的检索流程。

### 1. 最佳实践：使用 RetrievalRerankAdvisor

在【核心组件】章节中我们已经介绍过，`RetrievalRerankAdvisor` 是 SAA 封装的"检索-重排"最佳实践。它将 `VectorStoreRetriever` 和 `RerankModel` 的协同工作流程，无缝集成到了 `ChatClient` 中。

这是在 SAA 中实现高质量 RAG 的**首选方式**。

**回顾一下【快速上手】中的代码**:

```java
// ...
import com.alibaba.cloud.ai.advisor.RetrievalRerankAdvisor;
import com.alibaba.cloud.ai.model.RerankModel;

@RestController
public class RagController {

    // ... (注入 VectorStore, ChatModel, RerankModel)

    @GetMapping("/rag/chat")
    public Flux<ChatResponse> rag(String message) throws IOException {

        SearchRequest searchRequest = SearchRequest.builder()
            .withTopK(5) // 1. 初步召回 5 个文档
            .build();
        
        String promptTemplate = "..."; // System Prompt

        return ChatClient.builder(chatModel)
                .defaultAdvisors(new RetrievalRerankAdvisor(
                    vectorStore, 
                    rerankModel, 
                    searchRequest, 
                    new SystemPromptTemplate(promptTemplate),
                    0.1 // 2. 重排后，只保留相关性得分 > 0.1 的文档
                ))
                .build()
                .prompt()
                .user(message)
                .stream()
                .chatResponse();
    }
}
```

在这个例子中，`RetrievalRerankAdvisor` 自动完成了：
1.  **检索**: 从 `vectorStore` 中初步召回 5 个最相似的文档。
2.  **重排**: 调用 `rerankModel` 对这 5 个文档进行打分和排序。
3.  **过滤**: 丢弃相关性得分低于 0.1 的文档。
4.  **增强**: 将最终剩下的、最相关的文档填充到 Prompt 模板中。

整个过程对开发者透明，代码非常简洁。

### 2. 元数据过滤 (Metadata Filtering)

在很多场景下，我们不仅需要进行语义相似度搜索，还需要根据文档的元数据进行精确的条件过滤。例如：

*   只在指定的文件（`fileId`）中搜索。
*   只搜索某个特定类别（`category`）的文档。
*   只搜索发布日期（`publish_date`）在某个范围内的文档。

Spring AI 提供了强大的**过滤表达式 (Filter Expression)** 功能来实现这一点。您可以在 `SearchRequest` 中构建一个过滤条件。

**使用示例**:

假设我们的文档在存储时，都附加了 `fileId` 和 `category` 两个元数据字段。

```java
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FilteredRetrievalService {

    private final VectorStore vectorStore;

    public FilteredRetrievalService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public List<Document> searchWithFilter(String query, String targetFileId, String targetCategory) {
        
        FilterExpressionBuilder builder = new FilterExpressionBuilder();

        // 构建过滤表达式： (fileId == 'file-001') AND (category IN ['tech', 'news'])
        Filter.Expression expression = builder.and(
            builder.eq("fileId", targetFileId),
            builder.in("category", targetCategory, "news")
        ).build();

        SearchRequest searchRequest = SearchRequest.builder()
                .withQuery(query)
                .withTopK(5)
                .withFilterExpression(expression) // 应用过滤表达式
                .build();

        return vectorStore.similaritySearch(searchRequest);
    }
}
```

**支持的操作符**:

`FilterExpressionBuilder` 支持丰富的操作符来构建复杂的过滤逻辑：

*   **等于**: `eq()`
*   **不等于**: `ne()`
*   **大于/大于等于**: `gt()`, `gte()`
*   **小于/小于等于**: `lt()`, `lte()`
*   **包含**: `in()`
*   **不包含**: `nin()`
*   **逻辑与**: `and()`
*   **逻辑或**: `or()`

### 3. 将过滤与重排结合

您还可以将元数据过滤与 `RetrievalRerankAdvisor` 结合使用，实现更加精准的检索效果：

```java
@GetMapping("/rag/chat-with-filter")
public Flux<ChatResponse> ragWithFilter(
    @RequestParam String message,
    @RequestParam String fileId
) throws IOException {

    // 构建包含过滤条件的搜索请求
    FilterExpressionBuilder builder = new FilterExpressionBuilder();
    Filter.Expression expression = builder.eq("fileId", fileId).build();
    
    SearchRequest searchRequest = SearchRequest.builder()
        .withQuery(message)
        .withTopK(5)
        .withFilterExpression(expression) // 只在指定文件中搜索
        .build();
    
    String promptTemplate = systemResource.getContentAsString(StandardCharsets.UTF_8);

    return ChatClient.builder(chatModel)
            .defaultAdvisors(new RetrievalRerankAdvisor(
                vectorStore, 
                rerankModel, 
                searchRequest, 
                new SystemPromptTemplate(promptTemplate),
                0.1
            ))
            .build()
            .prompt()
            .user(message)
            .stream()
            .chatResponse();
}
```

通过将语义检索、元数据过滤与重排相结合，您可以构建出功能强大、结果精准的 RAG 检索系统。
