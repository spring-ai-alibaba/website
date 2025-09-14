---
title: 文档读取器 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

`DocumentReader` 是 RAG 应用数据处理流程的起点，负责从各种异构的数据源中加载数据，并将它们统一转换为 Spring AI 标准的 `Document` 格式。理解并善用不同的 `DocumentReader`，是构建强大 RAG 应用的基础。

## Spring AI 核心读取器概览

Spring AI Alibaba (SAA) 完全兼容并继承了 Spring AI 社区提供的丰富 `DocumentReader` 生态。在开始介绍 SAA 的特有实现之前，我们先简要回顾一下 Spring AI 官方提供的一些常用 `DocumentReader`：

*   **`PagePdfDocumentReader`**: 用于读取 PDF 文件。它会将 PDF 的每一页解析为一个独立的 `Document` 对象，页码等信息会存储在元数据中。
    *   **适用场景**: 处理结构化的 PDF 报告、书籍、论文等。

*   **`TikaDocumentReader`**: 这是一个功能极其强大的读取器，底层依赖于 Apache Tika。它可以自动检测并解析上百种常见的文件格式，包括：
    *   微软 Office 套件 (Word, Excel, PowerPoint)
    *   HTML, XML
    *   纯文本文件
    *   以及更多...
    *   **适用场景**: 需要统一处理多种不同格式的本地文件或上传文件。我们在【快速上手】章节中，处理用户上传文件的示例就是使用了这个读取器。

*   **`JsonReader`**: 专门用于读取 JSON 文件。它可以将整个 JSON 文件或根据 [JsonPath](https://github.com/json-path/JsonPath) 表达式提取出的特定部分，转换为 `Document` 对象。
    *   **适用场景**: 将结构化的 JSON 数据（如 API 返回结果、配置文件）纳入 RAG 的知识体系。

*   **`FileSystemDocumentReader`**: 用于读取指定文件目录下的所有文件。
    *   **适用场景**: 批量导入一个文件夹内的全部文档。

## SAA 扩展的读取器

除了上述核心读取器，SAA 社区和核心模块也提供了一系列强大的 `DocumentReader` 扩展实现，极大地丰富了 RAG 应用的数据源接入能力。

### 核心模块

*   **`DashScopeDocumentCloudReader`**: 该 Reader 可以将文档上传到百炼平台进行解析，并获取解析后的文档内容。
    *   **适用场景**: 需要借助百炼平台的文档解析能力，对文档进行预处理。

### 社区贡献模块

> 以下读取器由 SAA 社区贡献和维护，提供了与众多第三方服务的集成。

*   **数据库读取器**:
    *   **`MongodbDocumentReader`**: 从 MongoDB 数据库中读取文档。
    *   **`MySQLDocumentReader`**: 从 MySQL 数据库中读取文档。
    *   **`SQLiteDocumentReader`**: 从 SQLite 数据库中读取文档。
    *   **`ElasticsearchDocumentReader`**: 从 Elasticsearch 中读取文档。

*   **在线服务与内容平台读取器**:
    *   **`YuQueDocumentReader`**: 从**语雀**知识库中读取文档。
    *   **`BilibiliDocumentReader`**: 读取 **Bilibili** 视频的字幕或音频转录内容。
    *   **`YoutubeDocumentReader`**: 读取 **YouTube** 视频的字幕或音频转录内容。
    *   **`ArxivDocumentReader`**: 读取全球最大的预印本论文库 **ArXiv** 上的论文。
    *   **`GitbookDocumentReader`**: 读取 **Gitbook** 格式的在线文档。
    *   **`NotionDocumentReader`**: 读取 **Notion** 页面内容。
    *   **`ObsidianDocumentReader`**: 读取 **Obsidian** 笔记库中的 Markdown 文件。
    *   **`OneNoteDocumentReader`**: 读取 **OneNote** 笔记内容。

*   **代码与开发平台读取器**:
    *   **`GitHubDocumentReader`**: 读取 **GitHub** 仓库中的文件、Issue、Pull Request 等。
    *   **`GitLabDocumentReader`**: 读取 **GitLab** 仓库中的内容。
    *   **`GptRepoDocumentReader`**: 读取实现了特定接口的 **Git** 仓库内容。

*   **办公与协作工具读取器**:
    *   **`FeiShuDocumentReader`**: 读取**飞书**文档。
    *   **`TencentCosDocumentReader`**: 读取**腾讯云对象存储 (COS)** 中的文件。

*   **文件格式与协议读取器**:
    *   **`PoiDocumentReader`**: 基于 Apache POI，专门用于处理微软 Office (Word, Excel, PowerPoint) 文档。
    *   **`ArchiveDocumentReader`**: 用于读取压缩文件（如 .zip, .tar.gz）中的内容。
    *   **`EmlEmailDocumentReader` / `MsgEmailDocumentReader` / `MboxDocumentReader`**: 用于读取不同格式的电子邮件文件。

*   **AI 与数据平台读取器**:
    *   **`HuggingFaceFSDocumentReader`**: 读取 **Hugging Face Hub** 上的数据集或文件。
    *   **`ChatGptDataDocumentReader`**: 读取 ChatGPT 导出的用户数据。

## 使用示例 (以 `YuQueDocumentReader` 为例)

大多数社区 `DocumentReader` 的使用方式都非常相似。您通常需要：

1.  **添加对应的 Starter 依赖**。
2.  **在 `application.yml` 中配置必要的认证信息和参数**。
3.  **在代码中注入并使用它**。

以下是如何使用 `YuQueDocumentReader` 从语雀加载文档的示例：

### 1. 添加依赖

在您的 `pom.xml` 中添加 `spring-ai-alibaba-starter-document-reader-yuque` 依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-document-reader-yuque</artifactId>
</dependency>
```

### 2. 配置参数

在 `application.yml` 中配置您的语雀 Token、知识库 ID 等信息：

```yaml
spring:
  ai:
    alibaba:
      document-reader:
        yuque:
          token: "YOUR_YUQUE_TOKEN"
          repo-id: "YOUR_YUQUE_REPO_ID"
          base-url: "https://www.yuque.com/api/v2/"
```

### 3. 注入和使用

然后，您就可以像使用任何其他 `DocumentReader` 一样，在您的代码中注入并调用它：

```java
import com.alibaba.cloud.ai.reader.yuque.YuQueDocumentReader;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class YuqueIngestionService {

    private final YuQueDocumentReader yuqueReader;

    @Autowired
    public YuqueIngestionService(YuQueDocumentReader yuqueReader) {
        this.yuqueReader = yuqueReader;
    }

    public List<Document> loadDocumentsFromYuque() {
        // 直接调用 get() 方法即可加载整个知识库的文档
        return yuqueReader.get();
    }
}
```

通过这种方式，您可以轻松地将来自不同数据源的知识，统一整合到您的 RAG 应用中，构建一个全面而强大的知识库。
