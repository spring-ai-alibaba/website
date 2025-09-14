---
title: RAG 快速上手 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

## 什么是 RAG

检索增强生成（Retrieval Augmented Generation，简称 RAG）是一种强大的人工智能技术范式，它将预训练的大语言模型（LLM）与外部知识库进行结合，从而生成更精准、更相关、更可靠的回答。

想象一下，当您向一个标准的大语言模型提问时，它的回答完全依赖于其训练数据中的“记忆”。如果训练数据截止到某个日期，那么模型将无法回答关于之后发生的任何事情的问题。同样，对于一些非常专业或私有的领域知识（例如，您公司的内部技术文档），标准模型也一无所知。

RAG 通过以下三个核心步骤解决了这个问题：

1.  **检索 (Retrieve)**: 当用户提出问题时，系统不会立刻将问题发送给语言模型。相反，它首先会在一个外部知识库（通常是向量数据库）中检索与问题最相关的信息片段。
2.  **增强 (Augment)**: 系统将检索到的信息片段与用户的原始问题结合在一起，形成一个更丰富、上下文更明确的“增强版”提示（Prompt）。
3.  **生成 (Generate)**: 最后，将这个增强后的提示发送给大语言模型。由于模型获得了额外的、高度相关的上下文信息，它能够生成一个远比没有这些信息时更准确、更详细的回答。

通过这种方式，RAG 赋予了语言模型“开卷考试”的能力，极大地扩展了其知识边界，并有效减少了 AI “幻觉”（即模型捏造事实）的现象。

## SAA RAG 的优势

Spring AI Alibaba (SAA) 在 Spring AI 的基础上，为构建 RAG 应用提供了更强大、更便捷的能力，尤其是在与阿里云生态的结合方面：

*   **与阿里云服务的无缝集成**: SAA 深度集成了阿里云的多种服务，例如通义千问（DashScope）提供的强大语言模型和向量模型，以及 AnalyticDB、OpenSearch 等高性能向量数据库。
*   **开箱即用的高级功能**: SAA 提供了一些标准 Spring AI 中没有的高级组件，例如 `RetrievalRerankAdvisor`，它可以将检索与重排（Reranking）无缝结合，进一步提升检索结果的质量。
*   **简化的开发体验**: SAA 遵循 Spring Boot 的自动配置理念，您只需添加相应的 Starter 依赖并进行少量配置，即可快速构建一个完整的 RAG 应用。

本篇快速上手将带您一步步构建一个完整的 RAG 应用，该应用能够读取 PDF 文档，并回答关于该文档的任何问题。

## 环境准备

在开始之前，请确保您的开发环境中已安装以下软件：

*   **JDK 17 或更高版本**
*   **Maven 3.6+ 或 Gradle 8.0+**
*   **Docker**: 用于快速启动一个支持 `pgvector` 插件的 PostgreSQL 数据库实例。

## 第零步：获取Dashscope API-KEY

在使用本示例之前，您首先需要前往[通义千问官网创建并获取API-KEY](https://help.aliyun.com/zh/dashscope/developer-reference/activate-dashscope-and-create-an-api-key?spm=a2c4g.11186623.0.0.6d3642b5xG0l33)。

之后，请将获取到的API-KEY设置为环境变量 `DASH_SCOPE_API_KEY`。

## 第一步：项目初始化

您可以通过 [Spring Initializr](https://start.spring.io/) 创建一个新的 Spring Boot 项目，并添加 `Web` 和 `JDBC API` 依赖。

然后，在您的 `pom.xml` 文件中，引入 SAA RAG 所需的核心依赖：

```xml
<dependencies>
    <!-- Spring Boot Web Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring AI Alibaba DashScope Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>

    <!-- Spring AI PDF Document Reader -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-pdf-document-reader</artifactId>
    </dependency>

    <!-- Spring AI PGVector Store Starter -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-pgvector-store</artifactId>
    </dependency>
</dependencies>

<!-- Spring AI and SAA BOM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-bom</artifactId>
            <version>${saa.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

**依赖说明**:

*   `spring-ai-alibaba-starter-dashscope`: 这是 SAA 的核心 Starter，它自动配置了与通义千问模型（包括聊天和向量模型）交互所需的所有 Beans。
*   `spring-ai-pdf-document-reader`: Spring AI 提供的标准文档读取器，用于解析 PDF 文件。
*   `spring-ai-pgvector-store`: Spring AI 提供的 `VectorStore` 实现，用于与 PostgreSQL `pgvector` 扩展进行交互。

## 第二步：启动并配置向量数据库

为了存储文档的向量表示，我们需要一个向量数据库。这里我们使用带有 `pgvector` 扩展的 PostgreSQL。

您可以使用 Docker 方便地启动一个本地数据库实例：

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_DB=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```
> **注意**: 启动容器后，您需要手动登录到数据库，并执行 `CREATE EXTENSION vector;` 来启用 `pgvector` 扩展。

接着，在您的 `src/main/resources/application.yml` 文件中配置数据库连接和 SAA 相关参数：

```yaml
spring:
  application:
    name: rag-quickstart-app

  # JDBC and Vector Store Configuration
  datasource:
    url: jdbc:postgresql://127.0.0.1:5432/postgres
    username: postgres
    password: mysecretpassword

  ai:
    # DashScope Model Configuration
    dashscope:
      api-key: ${DASH_SCOPE_API_KEY}
    
    # PGVector Store Configuration
    vectorstore:
      pgvector:
        # 向量维度必须与您使用的Embedding模型输出维度一致。
        # DashScope text-embedding-v1 模型的维度是 1536
        dimensions: 1536
        index-type: hnsw
        distance-type: cosine_distance
```
> **重要提示**:
> - 我们通过 `${DASH_SCOPE_API_KEY}` 来引用之前设置的环境变量。
> - `spring.ai.vectorstore.pgvector.dimensions` 必须与您使用的 Embedding 模型输出的维度完全匹配。通义千问的 `text-embedding-v1` 模型输出维度是 **1536**。

## 第三步：编写 RAG 核心逻辑

现在，我们来编写 RAG 应用的核心逻辑。为了简单起见，我们将所有逻辑都放在一个 REST Controller 中。

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.document.DocumentReader;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import com.alibaba.cloud.ai.advisor.RetrievalRerankAdvisor;
import com.alibaba.cloud.ai.model.RerankModel;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/ai")
public class RagController {

    private final VectorStore vectorStore;
    private final ChatModel chatModel;
    private final RerankModel rerankModel;

    // 将要被向量化的文档资源
    @Value("classpath:/documents/spring-ai-alibaba-quickstart.pdf")
    private Resource documentResource;

    // System Prompt 模板资源
    @Value("classpath:/prompts/system-qa.st")
    private Resource systemResource;

    public RagController(VectorStore vectorStore, ChatModel chatModel, RerankModel rerankModel) {
        this.vectorStore = vectorStore;
        this.chatModel = chatModel;
        this.rerankModel = rerankModel;
    }

    /**
     * 第一部分：文档处理与向量化 (ETL)
     */
    @GetMapping("/rag/etl")
    public String loadAndVectorize() {
        // 1. 加载 PDF 文档
        DocumentReader reader = new PagePdfDocumentReader(documentResource);
        List<Document> documents = reader.get();

        // 2. 将长文档分割成小块
        List<Document> splitDocuments = new TokenTextSplitter().apply(documents);
        
        // 3. 调用 Embedding Model 生成向量，并存入向量数据库
        vectorStore.add(splitDocuments);

        return "Successfully loaded " + splitDocuments.size() + " document fragments.";
    }

    /**
     * 第二部分：检索、增强与生成
     */
    @GetMapping(value = "/rag/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChatResponse> rag(
        @RequestParam(value = "message", defaultValue = "How to get started with Spring AI Alibaba?") String message
    ) throws IOException {

        // 定义检索请求，这里我们希望返回最相关的2个文档块
        SearchRequest searchRequest = SearchRequest.builder().withTopK(2).build();
        
        // 读取 System Prompt 模板
        String promptTemplate = systemResource.getContentAsString(StandardCharsets.UTF_8);

        // 使用 SAA 特有的 RetrievalRerankAdvisor 构建 ChatClient
        return ChatClient.builder(chatModel)
                .defaultAdvisors(new RetrievalRerankAdvisor(vectorStore, rerankModel, searchRequest, new SystemPromptTemplate(promptTemplate), 0.1))
                .build()
                .prompt()
                .user(message)
                .stream()
                .chatResponse();
    }
}
```
> **代码解释**:
>
> - **依赖注入**: 我们通过构造函数注入了 `VectorStore`, `ChatModel` 和 SAA 特有的 `RerankModel`。这些都是由 SAA Starter 自动配置的。
> - **文档加载 (ETL)**:
>   - `/rag/etl` 端点负责**文档的提取、转换和加载**。
>   - `PagePdfDocumentReader` 负责读取和解析 PDF 内容。
>   - `TokenTextSplitter` 将文档分割成更小的、适合向量化的文本块。
>   - `vectorStore.add()` 是最关键的一步，它在内部会自动调用通义千问的 Embedding 模型，将文本块转换为向量，然后将这些向量和原文一并存储到我们配置的 PGVector 数据库中。
> - **问答 (Chat)**:
>   - `/rag/chat` 端点负责接收用户问题并生成回答。
>   - `ChatClient` 是 Spring AI 1.0.0.M2 之后推荐的、用于与 AI 模型交互的流式客户端。
>   - `RetrievalRerankAdvisor`: 这是 **SAA 的核心亮点**。它是一个 Advisor（顾问），为 `ChatClient` 的调用过程提供了增强。它会自动执行以下操作：
>       1.  **检索 (Retrieve)**: 根据用户问题，从 `vectorStore` 中检索出 `topK` 个最相似的文档块。
>       2.  **重排 (Rerank)**: 调用 `rerankModel` 对检索到的文档块进行重新排序，将最相关的文档排在最前面，并过滤掉相关性低于阈值（在这里是 `0.1`）的文档。
>       3.  **增强 (Augment)**: 将经过重排后的、最相关的文档内容与用户的原始问题，一起填充到 `system-qa.st` 这个系统提示模板中。
>       4.  **生成 (Generate)**: 将最终生成的、包含丰富上下文的 Prompt 发送给 `chatModel`，得到最终的回答。

### 准备 Prompt 模板

在 `src/main/resources/prompts/` 目录下，创建一个名为 `system-qa.st` 的文件，内容如下：

```
{query}

Context information is below, surrounded by ---------------------
---------------------
{question_answer_context}
---------------------
Given the context and provided history information and not prior knowledge,
reply to the user comment. If the answer is not in the context, inform
the user that you can't answer the question.
```
> **模板解释**:
> - 这是一个 StringTemplate 格式的模板。
> - `{question_answer_context}` 和 `{query}` 是占位符。`RetrievalRerankAdvisor` 会自动将检索到的文档内容填充到 `{question_answer_context}`，将用户问题填充到 `{query}`。

## 第四步：运行并测试

1.  **准备文档**: 在 `src/main/resources/documents/` 目录下，放入一个您想要进行问答的 PDF 文件，例如 `spring-ai-alibaba-quickstart.pdf`。
2.  **启动应用**: 运行您的 Spring Boot 主程序。
3.  **ETL**: 首先，我们需要将文档内容加载到向量数据库。在浏览器或使用 `curl` 访问以下 URL：

    ```bash
    curl http://localhost:8080/ai/rag/etl
    ```
    您应该会收到一条成功加载了多少文档片段的消息。

4.  **提问**: 现在，您可以开始提问了！向聊天端点发送一个 GET 请求，`message` 参数就是您的问题。

    ```bash
    curl -N http://localhost:8080/ai/rag/chat?message="how to get start with spring ai alibaba?"
    ```
    您将会看到一个以流式（Server-Sent Events）返回的、基于您提供的 PDF 文档内容的回答。

恭喜！您已经成功构建并运行了您的第一个由 Spring AI Alibaba 驱动的 RAG 应用！
