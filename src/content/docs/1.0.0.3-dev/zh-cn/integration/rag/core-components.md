---
title: 核心组件与架构 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

## SAA RAG 架构概览

在 Spring AI Alibaba (SAA) 中构建 RAG 应用，本质上是遵循一个清晰、模块化的流程，将多个核心组件串联起来，以实现从原始数据到智能问答的完整链路。理解这些组件以及它们之间的协作方式，是深入使用和定制 RAG 应用的关键。

一个典型的 SAA RAG 应用的数据处理和问答流程如下图所示：

![SAA RAG Architecture](https://img.alicdn.com/imgextra/i4/O1CN01fBfE9E1u0D8YJ7f9K_!!6000000005971-2-tps-1554-712.png)

### 数据处理（ETL）流程

这是 RAG 的准备阶段，目的是将您的非结构化知识（如 PDF, Word, Markdown 文档）处理成 AI 模型可以理解和检索的格式。

1.  **读取 (Read)**: `DocumentReader` 组件负责从各种数据源（本地文件、URL、对象存储等）读取原始文档。
2.  **分割 (Split)**: `TextSplitter` 组件将加载的长文档，按照特定策略（如按 Token 数量、按章节）分割成更小的文本块（`Document` 对象）。这对于后续的向量化和精确检索至关重要。
3.  **向量化与存储 (Embed & Store)**:
    *   `EmbeddingModel` 将分割后的每个文本块转换为一个高维向量（一串数字）。这个向量能够捕捉文本的语义信息。
    *   `VectorStore` (向量数据库) 负责接收这些文本块及其对应的向量，并将它们存储起来。向量数据库的核心能力是能够进行高效的相似度检索。

### 问答（Inference）流程

这是 RAG 的应用阶段，系统接收用户问题并生成答案。

1.  **用户提问**: 用户输入一个查询（Query）。
2.  **向量检索 (Retrieve)**: 系统首先将用户的查询也通过 `EmbeddingModel` 转换为一个向量。然后，`Retriever` 组件（通常是 `VectorStoreRetriever`）会在 `VectorStore` 中，根据向量的相似度，检索出与查询向量最接近的若干个文档块。
3.  **重排 (Rerank)**: **这是 SAA RAG 的一个核心增强点**。`RerankModel` 会对初步检索出的文档块列表进行二次排序。它会更精细地计算每个文档块与原始查询之间的相关性得分，从而将最相关的结果排在最前面，并过滤掉相关性不高的“噪音”。
4.  **增强与生成 (Augment & Generate)**:
    *   系统将经过重排后的、最相关的文档块内容，与用户的原始问题，一起填充到一个预设的提示模板（Prompt Template）中。
    *   这个包含了丰富上下文的“增强版”提示，最终被发送给 `ChatModel` (大语言模型)。
    *   `ChatModel` 基于这些上下文信息，生成一个精准、详细且忠于原文的回答。

在 SAA 中，**`RetrievalRerankAdvisor`** 组件优雅地封装了上述流程中的**检索、重排、增强**这三个关键步骤，极大地简化了开发者的工作。

## 核心组件详解

下面我们详细介绍构成 SAA RAG 应用的各个核心组件。

### Document

`Document` 是 Spring AI 中处理数据的基本单元。它不仅仅是一个简单的字符串，而是一个包含了**文本内容 (Content)** 和 **元数据 (Metadata)** 的对象。

*   **Content**: 文档的原始文本内容。
*   **Metadata**: 一组键值对，用于描述文档的附加信息，例如：
    *   文件名
    *   文档来源 URL
    *   章节标题
    *   文档创建日期
    *   自定义标签（如 `fileId`, `category` 等）

在 RAG 应用中，`Metadata` 至关重要。它不仅可以用于在检索时进行精确过滤（例如，只在指定的文件中进行检索），还可以在生成答案时为模型提供额外的上下文。

### DocumentReader

`DocumentReader` 是数据加载的入口，负责从不同的数据源读取数据并将其转换为 `Document` 对象列表。Spring AI 生态提供了多种 `DocumentReader` 实现，SAA 完全兼容并可以无缝使用它们。

*   `PagePdfDocumentReader`: 用于读取 PDF 文件，并将每一页转换为一个 `Document` 对象。
*   `TikaDocumentReader`: 基于 Apache Tika 库，功能强大，能够解析数百种文件格式（如 Word, Excel, PPT, HTML 等）。
*   `JsonReader`: 用于读取 JSON 文件，并可根据 JSON 路径表达式（JsonPath）提取特定字段作为 `Document` 内容。

在后续的【文档读取器】章节中，我们将详细介绍 SAA 提供的扩展实现。

### TextSplitter

由于大语言模型的上下文窗口长度有限，并且为了提高检索的精确度，我们不能将整篇长文档直接进行向量化。`TextSplitter` 的作用就是将一个大的 `Document` 对象分割成一组小的、逻辑上连贯的 `Document` 对象。

*   `TokenTextSplitter`: 这是最常用的一种分割器。它会根据 Token 的数量来分割文本，确保每个文本块的大小都不会超过语言模型的处理上限。开发者可以自定义 ` chunkSize` (每个块的大小) 和 `chunkOverlap` (块之间的重叠大小，用于保持上下文的连续性)。

### EmbeddingModel

`EmbeddingModel` (向量模型) 是 RAG 的核心引擎之一。它负责将任意长度的文本，映射到一个固定维度的向量空间中，生成能够代表文本语义的向量。

*   **接口**: `org.springframework.ai.embedding.EmbeddingModel`
*   **SAA 实现**: 当您引入 `spring-ai-alibaba-starter-dashscope` 时，SAA 会自动为您配置一个 `DashScopeEmbeddingModel` 的 Bean。这个实现会调用阿里云通义千问的 `text-embedding-v2` 或 `text-embedding-v1` 模型来完成向量化。您无需手动调用 API，只需将文本传递给这个 Bean 即可。

### VectorStore

`VectorStore` (向量数据库) 是 RAG 应用的“外部记忆库”。它专门用于存储文本块及其对应的向量，并提供高效的相似度检索功能。

*   **核心接口**: `org.springframework.ai.vectorstore.VectorStore`
*   **核心方法**:
    *   `add(List<Document> documents)`: 将一组 `Document` 进行向量化并存入数据库。
    *   `delete(Filter.Expression filterExpression)`: 根据元数据过滤条件删除文档。
    *   `similaritySearch(SearchRequest request)`: 这是最核心的检索方法，根据用户查询，返回最相似的 `Document` 列表。

SAA 兼容 Spring AI 支持的所有 `VectorStore` 实现（如 `PgVectorStore`, `MilvusVectorStore` 等），并特别增强了对阿里云向量数据库（如 AnalyticDB, OpenSearch）的支持。我们将在【向量存储】章节中详细介绍。

### Retriever

`Retriever` (检索器) 是一个更高层次的抽象，它定义了如何根据用户查询来获取相关 `Document` 的逻辑。

*   **接口**: `org.springframework.ai.document.retriever.Retriever`
*   **标准实现**: `VectorStoreRetriever` 是最基础和常用的实现，它的内部逻辑就是调用 `VectorStore` 的 `similaritySearch` 方法。

### RerankModel (SAA 特有)

`RerankModel` (重排模型) 是 SAA 提供的一个重要增强组件，用于解决传统向量检索（也称“召回”）可能不够精确的问题。向量检索速度快，范围广，但有时返回的结果并不完全符合用户的意图。`RerankModel` 在此基础上进行二次精排。

*   **目的**: 对 `Retriever` 初步召回的文档列表进行重新排序，将语义上与用户查询最相关的文档排在最前面，同时可以过滤掉相关性得分较低的文档。
*   **接口**: `com.alibaba.cloud.ai.model.RerankModel`
*   **SAA 实现**: SAA 提供了 `DashScopeRerankModel`，它会调用通义千问的 Rerank API 来计算查询与每个文档之间的精确相关性得分。

### RetrievalRerankAdvisor (SAA 特有)

`RetrievalRerankAdvisor` 是 SAA 提供的一个高级工具，它将“检索-重排-增强”这个 RAG 的最佳实践流程，封装成一个可直接作用于 `ChatClient` 的“顾问” (Advisor)。

*   **定位**: 一个实现了 `Advisor` 接口的类，用于在 `ChatClient` 调用前后增加额外的处理逻辑。
*   **工作流程**: 当您将 `RetrievalRerankAdvisor` 添加到 `ChatClient` 中时，它会在调用大语言模型**之前**，自动完成以下所有工作：
    1.  使用内部的 `Retriever` 组件进行初步文档检索。
    2.  将检索结果交给内部的 `RerankModel` 进行二次精排和过滤。
    3.  将精排后的文档内容，与用户的原始问题，一起填充到您指定的 `SystemPromptTemplate` 中。
*   **优势**: 极大地简化了代码。您无需手动编写调用 `Retriever` 和 `RerankModel` 的模板代码，只需在构建 `ChatClient` 时“挂上”这个 Advisor，即可轻松实现一个带有重排功能的、效果更优的 RAG 应用。这正是我们在【RAG 快速上手】中使用的便捷方式。
