# Document Reader 使用指南

Spring AI Alibaba 提供了丰富的 Document Reader 扩展实现，支持从各种数据源读取文档内容。本文档将详细介绍 Document Reader 的使用方法，并列出所有支持的扩展实现。

## 目录

- [概述](#概述)
- [详细使用说明](#详细使用说明)
- [支持的扩展实现](#支持的扩展实现)

## 概述

Document Reader 是 Spring AI 中用于从不同数据源读取文档的核心接口。Spring AI Alibaba 扩展了该接口，提供了多种数据源的实现，包括：

- 本地文件格式（Office 文档、PDF 等）
- 云存储服务（腾讯云 COS、阿里云 OSS 等）
- 数据库（MySQL、MongoDB、SQLite、Elasticsearch 等）
- 在线平台（GitHub、GitLab、语雀、Notion、Bilibili、YouTube 等）
- 其他数据源（邮件、归档文件等）

## 详细使用说明

### POI Document Reader 示例

`PoiDocumentReader` 使用 Apache POI 库解析 Microsoft Office 文件，支持多种文件格式，包括：
- **Word 文档**：`.doc`, `.docx`
- **PowerPoint 演示文稿**：`.ppt`, `.pptx`
- **Excel 电子表格**：`.xls`, `.xlsx`

#### 依赖配置

使用 Maven 添加依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-document-reader-poi</artifactId>
    <version>${version}</version>
</dependency>
```

#### 基本使用

##### 示例 1：读取单个 Word 文档

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.document.Document;
import org.springframework.ai.document.DocumentReader;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WordDocumentService {

    public List<Document> readWordDocument(String filePath) {
        // 使用文件路径创建 Reader
        DocumentReader reader = new PoiDocumentReader(filePath);
        
        // 读取文档内容
        List<Document> documents = reader.get();
        
        return documents;
    }
}
```

##### 示例 2：使用 Resource 对象

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.document.Document;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ClassPathResource;

import java.util.List;

public class DocumentReaderExample {

    public List<Document> readFromClasspath() {
        // 从 classpath 读取资源
        Resource resource = new ClassPathResource("documents/sample.docx");
        
        // 创建 Reader
        PoiDocumentReader reader = new PoiDocumentReader(resource);
        
        // 读取文档
        return reader.get();
    }
}
```

##### 示例 3：自定义文本格式化

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.reader.ExtractedTextFormatter;

public class FormattedDocumentReader {

    public List<Document> readWithFormatting(String filePath) {
        // 创建自定义的文本格式化器
        ExtractedTextFormatter formatter = ExtractedTextFormatter.builder()
            .withNumberOfTopTextLinesToDelete(0)
            .withNumberOfBottomTextLinesToDelete(0)
            .build();
        
        // 使用格式化器创建 Reader
        PoiDocumentReader reader = new PoiDocumentReader(filePath, formatter);
        
        return reader.get();
    }
}
```

##### 示例 4：读取 Excel 文件

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.document.Document;

public class ExcelReaderExample {

    public void readExcelFile(String excelPath) {
        PoiDocumentReader reader = new PoiDocumentReader(excelPath);
        List<Document> documents = reader.get();
        
        // Excel 文件会按工作表（Sheet）组织内容
        for (Document doc : documents) {
            System.out.println("Content: " + doc.getText());
            System.out.println("Metadata: " + doc.getMetadata());
        }
    }
}
```

##### 示例 5：在 Spring Boot 应用中使用

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DocumentProcessingService {

    @Autowired
    private VectorStore vectorStore;

    public void processDocument(String filePath) {
        // 1. 读取文档
        PoiDocumentReader reader = new PoiDocumentReader(filePath);
        List<Document> documents = reader.get();
        
        // 2. 处理文档（例如：文本分割）
        // TextSplitter splitter = new TokenTextSplitter();
        // List<Document> splitDocuments = splitter.transform(documents);
        
        // 3. 存储到向量数据库
        // vectorStore.write(splitDocuments);
    }
}
```

#### 元数据

`PoiDocumentReader` 会在每个 Document 的元数据中添加以下信息：

- `source`: 文档的源路径或 URI

#### 注意事项

1. **文件格式支持**：确保文件格式在 Apache POI 的支持范围内
2. **内存使用**：处理大型文件时注意内存使用情况
3. **异常处理**：建议在生产环境中添加适当的异常处理逻辑
4. **编码问题**：某些旧格式的 Office 文档可能存在编码问题

#### 完整示例：RAG 集成

```java
import com.alibaba.cloud.ai.reader.poi.PoiDocumentReader;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RAGDocumentLoader {

    private final VectorStore vectorStore;
    private final TokenTextSplitter textSplitter;

    public RAGDocumentLoader(VectorStore vectorStore, TokenTextSplitter textSplitter) {
        this.vectorStore = vectorStore;
        this.textSplitter = textSplitter;
    }

    public void loadDocumentToRAG(String filePath) {
        // 1. 读取文档
        PoiDocumentReader reader = new PoiDocumentReader(filePath);
        List<Document> documents = reader.get();
        
        // 2. 文本分割（将大文档分割成小块）
        List<Document> splitDocuments = textSplitter.transform(documents);
        
        // 3. 存储到向量数据库
        vectorStore.write(splitDocuments);
        
        System.out.println("成功加载 " + splitDocuments.size() + " 个文档块到向量数据库");
    }
    
    public List<Document> searchSimilarDocuments(String query) {
        // 从向量数据库检索相似文档
        return vectorStore.similaritySearch(query);
    }
}
```

## 支持的扩展实现

下表列出了 Spring AI Alibaba 提供的所有 Document Reader 扩展实现：

| 模块名称 | ArtifactId | 支持的数据源/格式 | 说明 |
|---------|-----------|-----------------|------|
| **Archive** | `spring-ai-alibaba-starter-document-reader-archive` | ZIP, TAR, JAR 等归档文件 | 从归档文件中提取并读取文档 |
| **ArXiv** | `spring-ai-alibaba-starter-document-reader-arxiv` | ArXiv 学术论文 | 从 ArXiv 平台读取学术论文内容 |
| **Bilibili** | `spring-ai-alibaba-starter-document-reader-bilibili` | Bilibili 视频 | 读取 Bilibili 视频信息和字幕内容 |
| **ChatGPT Data** | `spring-ai-alibaba-starter-document-reader-chatgpt-data` | ChatGPT 导出数据 | 读取 ChatGPT 导出的对话数据 |
| **Elasticsearch** | `spring-ai-alibaba-starter-document-reader-elasticsearch` | Elasticsearch 索引 | 从 Elasticsearch 索引中读取文档 |
| **Email** | `spring-ai-alibaba-starter-document-reader-email` | 邮件文件（.eml, .mbox） | 读取邮件文件内容 |
| **GitBook** | `spring-ai-alibaba-starter-document-reader-gitbook` | GitBook 文档 | 从 GitBook 平台读取文档 |
| **GitHub** | `spring-ai-alibaba-starter-document-reader-github` | GitHub 仓库 | 从 GitHub 仓库读取文件和代码 |
| **GitLab** | `spring-ai-alibaba-starter-document-reader-gitlab` | GitLab 仓库 | 从 GitLab 仓库读取文件和代码 |
| **GPT Repo** | `spring-ai-alibaba-starter-document-reader-gpt-repo` | GPT 仓库 | 从 GPT 仓库读取文档 |
| **HuggingFace FS** | `spring-ai-alibaba-starter-document-reader-huggingface-fs` | HuggingFace 文件系统 | 从 HuggingFace 文件系统读取文档 |
| **LarkSuite** | `spring-ai-alibaba-starter-document-reader-larksuite` | 飞书文档 | 从飞书（LarkSuite）平台读取文档 |
| **Mbox** | `spring-ai-alibaba-starter-document-reader-mbox` | Mbox 邮件格式 | 读取 Mbox 格式的邮件文件 |
| **MongoDB** | `spring-ai-alibaba-starter-document-reader-mongodb` | MongoDB 数据库 | 从 MongoDB 数据库读取文档 |
| **MySQL** | `spring-ai-alibaba-starter-document-reader-mysql` | MySQL 数据库 | 从 MySQL 数据库读取数据并转换为文档 |
| **Notion** | `spring-ai-alibaba-starter-document-reader-notion` | Notion 页面 | 从 Notion 平台读取页面内容 |
| **Obsidian** | `spring-ai-alibaba-starter-document-reader-obsidian` | Obsidian 笔记 | 从 Obsidian 笔记库读取 Markdown 文件 |
| **OneNote** | `spring-ai-alibaba-starter-document-reader-onenote` | OneNote 笔记 | 读取 Microsoft OneNote 笔记内容 |
| **POI** | `spring-ai-alibaba-starter-document-reader-poi` | DOC, DOCX, PPT, PPTX, XLS, XLSX | 使用 Apache POI 读取 Microsoft Office 文档 |
| **SQLite** | `spring-ai-alibaba-starter-document-reader-sqlite` | SQLite 数据库 | 从 SQLite 数据库读取数据 |
| **Tencent COS** | `spring-ai-alibaba-starter-document-reader-tencent-cos` | 腾讯云对象存储 | 从腾讯云 COS 读取存储的文档 |
| **YouTube** | `spring-ai-alibaba-starter-document-reader-youtube` | YouTube 视频 | 读取 YouTube 视频信息和字幕 |
| **YuQue** | `spring-ai-alibaba-starter-document-reader-yuque` | 语雀文档 | 从语雀平台读取文档内容 |

### 使用说明

所有 Document Reader 实现都遵循相同的使用模式：

1. **添加依赖**：在 `pom.xml` 或 `build.gradle` 中添加相应的依赖
2. **创建 Reader**：使用相应的 Reader 类创建实例
3. **读取文档**：调用 `get()` 方法获取 `List<Document>`
4. **处理文档**：对读取的文档进行进一步处理（如文本分割、向量化等）

### 通用接口

所有 Document Reader 都实现了 `DocumentReader` 接口：

```java
public interface DocumentReader extends Supplier<List<Document>> {
    List<Document> get();
}
```

### 依赖版本

请根据项目需要选择合适的版本。建议使用最新的稳定版本，并确保与 Spring AI 核心库版本兼容。

### 更多信息

- 每个 Reader 的具体使用方法和配置选项，请参考各模块的文档
- 对于需要认证的数据源（如 GitHub、Notion 等），请确保正确配置访问凭证
- 某些 Reader 可能需要额外的依赖（如数据库驱动、API 客户端等）

---

**注意**：本文档基于当前可用的实现。随着项目的发展，可能会有新的 Reader 实现添加或现有实现的更新。建议定期查看项目文档以获取最新信息。
