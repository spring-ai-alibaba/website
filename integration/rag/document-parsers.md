# Document Parser 使用指南

Spring AI Alibaba 提供了丰富的 Document Parser 扩展实现，支持解析各种文档格式。本文档将详细介绍 Document Parser 的使用方法，并列出所有支持的扩展实现。

## 目录

- [概述](#概述)
- [详细使用说明](#详细使用说明)
- [支持的扩展实现](#支持的扩展实现)

## 概述

Document Parser 是 Spring AI Alibaba 中用于解析不同格式文档的核心接口。与 Document Reader 不同，Parser 专注于从输入流中解析文档内容，通常与 Document Reader 配合使用，将原始文档转换为 Spring AI 的 `Document` 对象。

Spring AI Alibaba 扩展了该接口，提供了多种格式的解析实现，包括：

- 文档格式（PDF、Markdown、YAML、HTML 等）
- 办公文档（通过 Tika 支持多种 Office 格式）
- 多模态内容（图像 OCR、语音转文字）
- 特殊格式（BibTeX、PDF 表格等）
- 批量处理（目录解析）

## 详细使用说明

### Tika Document Parser 示例

`TikaDocumentParser` 使用 Apache Tika 库自动检测并解析各种文档格式。Tika 是一个强大的文档解析工具，支持超过 1000 种文件格式，包括：

- **PDF**：提取文本、元数据等
- **Microsoft Office**：Word (`.doc`, `.docx`)、PowerPoint (`.ppt`, `.pptx`)、Excel (`.xls`, `.xlsx`)
- **HTML/XML**：解析网页和 XML 文件
- **图片**：提取图像元数据或通过 OCR 解析图片中的文本
- **文本文件**：纯文本、Markdown 等
- **其他格式**：邮件格式（EML、MSG）、RTF、OpenDocument 等

有关支持的格式的完整列表，请参阅 [Apache Tika 文档](https://tika.apache.org/2.9.1/formats.html)。

#### 依赖配置

使用 Maven 添加依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-document-parser-tika</artifactId>
    <version>${version}</version>
</dependency>
```

#### 基本使用

##### 示例 1：简单解析

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import com.alibaba.cloud.ai.document.DocumentParser;
import org.springframework.ai.document.Document;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.InputStream;
import java.util.List;

@Component
public class DocumentParsingService {

    public List<Document> parseDocument(String filePath) {
        // 创建 Tika Parser
        DocumentParser parser = new TikaDocumentParser();
        
        // 读取文件输入流
        Resource resource = new ClassPathResource(filePath);
        try (InputStream inputStream = resource.getInputStream()) {
            // 解析文档
            return parser.parse(inputStream);
        }
    }
}
```

##### 示例 2：自定义文本格式化

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import org.springframework.ai.reader.ExtractedTextFormatter;

public class FormattedDocumentParser {

    public List<Document> parseWithFormatting(InputStream inputStream) {
        // 创建自定义的文本格式化器
        ExtractedTextFormatter formatter = ExtractedTextFormatter.builder()
            .withNumberOfTopTextLinesToDelete(0)
            .withNumberOfBottomTextLinesToDelete(0)
            .build();
        
        // 使用格式化器创建 Parser
        TikaDocumentParser parser = new TikaDocumentParser(formatter);
        
        return parser.parse(inputStream);
    }
}
```

##### 示例 3：高级配置

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;

import java.util.function.Supplier;

public class AdvancedTikaParser {

    public List<Document> parseWithCustomConfig(InputStream inputStream) {
        // 自定义 Parser 供应商
        Supplier<AutoDetectParser> parserSupplier = AutoDetectParser::new;
        
        // 自定义 ContentHandler（可以设置写入限制）
        Supplier<BodyContentHandler> handlerSupplier = () -> 
            new BodyContentHandler(100000); // 限制 100KB
        
        // 自定义 Metadata
        Supplier<Metadata> metadataSupplier = Metadata::new;
        
        // 自定义 ParseContext
        Supplier<ParseContext> contextSupplier = ParseContext::new;
        
        // 创建配置好的 Parser
        TikaDocumentParser parser = new TikaDocumentParser(
            parserSupplier,
            handlerSupplier,
            metadataSupplier,
            contextSupplier
        );
        
        return parser.parse(inputStream);
    }
}
```

##### 示例 4：解析不同格式的文档

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import org.springframework.ai.document.Document;

public class MultiFormatParser {

    private final TikaDocumentParser parser = new TikaDocumentParser();

    public void parseWordDocument(InputStream inputStream) {
        List<Document> documents = parser.parse(inputStream);
        // 处理 Word 文档内容
        documents.forEach(doc -> {
            System.out.println("Content: " + doc.getText());
        });
    }

    public void parseExcelFile(InputStream inputStream) {
        List<Document> documents = parser.parse(inputStream);
        // Excel 文件内容会按工作表组织
        documents.forEach(doc -> {
            System.out.println("Sheet Content: " + doc.getText());
        });
    }

    public void parsePdfFile(InputStream inputStream) {
        List<Document> documents = parser.parse(inputStream);
        // PDF 内容会被提取为文本
        documents.forEach(doc -> {
            System.out.println("PDF Content: " + doc.getText());
        });
    }

    public void parseHtmlFile(InputStream inputStream) {
        List<Document> documents = parser.parse(inputStream);
        // HTML 内容会被提取为纯文本
        documents.forEach(doc -> {
            System.out.println("HTML Content: " + doc.getText());
        });
    }
}
```

##### 示例 5：与 Document Reader 配合使用

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import com.alibaba.cloud.ai.reader.yuque.YuQueDocumentReader;
import com.alibaba.cloud.ai.reader.yuque.YuQueResource;
import org.springframework.ai.document.Document;

public class ReaderWithParserExample {

    public List<Document> loadFromYuQue() {
        // 创建 Tika Parser
        TikaDocumentParser parser = new TikaDocumentParser();
        
        // 创建语雀资源
        YuQueResource resource = YuQueResource.builder()
            .yuQueToken("your-token")
            .resourcePath("your-resource-path")
            .build();
        
        // 使用 Parser 创建 Reader
        YuQueDocumentReader reader = new YuQueDocumentReader(resource, parser);
        
        // 读取文档
        return reader.get();
    }
}
```

##### 示例 6：在 Spring Boot 应用中使用

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

@Service
public class DocumentProcessingService {

    @Autowired
    private VectorStore vectorStore;

    @Autowired
    private TokenTextSplitter textSplitter;

    private final TikaDocumentParser parser = new TikaDocumentParser();

    public void processUploadedFile(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            // 1. 解析文档
            List<Document> documents = parser.parse(inputStream);
            
            // 2. 文本分割
            List<Document> splitDocuments = textSplitter.transform(documents);
            
            // 3. 存储到向量数据库
            vectorStore.write(splitDocuments);
            
            System.out.println("成功处理并存储 " + splitDocuments.size() + " 个文档块");
        } catch (Exception e) {
            throw new RuntimeException("处理文件失败", e);
        }
    }
}
```

#### 元数据

`TikaDocumentParser` 解析的文档默认不包含额外的元数据。如果需要元数据，可以使用自定义的 `Metadata` 供应商来提取文档的元数据信息。

#### 注意事项

1. **格式支持**：确保文件格式在 Apache Tika 的支持范围内
2. **内存使用**：处理大型文件时注意内存使用情况，可以通过 `BodyContentHandler` 设置写入限制
3. **异常处理**：空文件或损坏的文件可能会抛出异常，建议添加适当的异常处理
4. **性能考虑**：对于大量文件的批量处理，考虑使用线程池或异步处理
5. **编码问题**：某些旧格式的文档可能存在编码问题，Tika 会尝试自动检测编码

#### 完整示例：RAG 集成

```java
import com.alibaba.cloud.ai.parser.tika.TikaDocumentParser;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
public class RAGDocumentProcessor {

    private final VectorStore vectorStore;
    private final TokenTextSplitter textSplitter;
    private final TikaDocumentParser parser;

    public RAGDocumentProcessor(VectorStore vectorStore, TokenTextSplitter textSplitter) {
        this.vectorStore = vectorStore;
        this.textSplitter = textSplitter;
        this.parser = new TikaDocumentParser();
    }

    public void processDocumentForRAG(InputStream inputStream) {
        // 1. 解析文档
        List<Document> documents = parser.parse(inputStream);
        
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

下表列出了 Spring AI Alibaba 提供的所有 Document Parser 扩展实现：

| 模块名称 | ArtifactId | 支持的格式 | 说明 |
|---------|-----------|----------|------|
| **Apache PDFBox** | `spring-ai-alibaba-starter-document-parser-apache-pdfbox` | PDF | 使用 Apache PDFBox 解析 PDF 文档，支持按页或按段落解析 |
| **BibTeX** | `spring-ai-alibaba-starter-document-parser-bibtex` | BibTeX | 解析 BibTeX 学术引用文件，可提取引用信息和关联的 PDF 文件 |
| **BS HTML** | `spring-ai-alibaba-starter-document-parser-bshtml` | HTML | 使用 JSoup 解析 HTML 文档，提取文本和元数据 |
| **Directory** | `spring-ai-alibaba-starter-document-parser-directory` | 目录中的多种格式 | 批量解析目录中的文件，支持 glob 模式匹配、递归扫描、采样等功能 |
| **Markdown** | `spring-ai-alibaba-starter-document-parser-markdown` | Markdown | 解析 Markdown 文档，支持代码块、引用、标题等结构化元素 |
| **Multi-Modality** | `spring-ai-alibaba-starter-document-parser-multi-modality` | 图像、音频 | 使用阿里云 DashScope 进行图像 OCR 和语音转文字（STT） |
| **PDF Tables** | `spring-ai-alibaba-starter-document-parser-pdf-tables` | PDF 表格 | 使用 Tabula 从 PDF 中提取表格数据 |
| **Tika** | `spring-ai-alibaba-starter-document-parser-tika` | 1000+ 种格式 | 使用 Apache Tika 自动检测并解析多种文档格式（PDF、Office、HTML 等） |
| **YAML** | `spring-ai-alibaba-starter-document-parser-yaml` | YAML | 解析 YAML 配置文件，支持转换为结构化文档 |

### 使用说明

所有 Document Parser 实现都遵循相同的使用模式：

1. **添加依赖**：在 `pom.xml` 或 `build.gradle` 中添加相应的依赖
2. **创建 Parser**：使用相应的 Parser 类创建实例
3. **解析文档**：调用 `parse(InputStream)` 方法获取 `List<Document>`
4. **处理文档**：对解析的文档进行进一步处理（如文本分割、向量化等）

### 通用接口

所有 Document Parser 都实现了 `DocumentParser` 接口：

```java
public interface DocumentParser {
    List<Document> parse(InputStream inputStream);
}
```

### Parser 与 Reader 的区别

- **Document Reader**：负责从数据源（文件、数据库、API 等）读取文档，通常返回 `List<Document>`
- **Document Parser**：负责解析特定格式的文档内容，将输入流转换为 `List<Document>`

在实际使用中，Parser 通常与 Reader 配合使用：
- Reader 负责从数据源获取原始内容（如从语雀、GitHub 等平台获取）
- Parser 负责解析这些内容的格式（如 PDF、Word、Markdown 等）

### 依赖版本

请根据项目需要选择合适的版本。建议使用最新的稳定版本，并确保与 Spring AI 核心库版本兼容。

### 更多信息

- 每个 Parser 的具体使用方法和配置选项，请参考各模块的文档
- 对于需要 API Key 的 Parser（如 Multi-Modality），请确保正确配置访问凭证
- 某些 Parser 可能需要额外的依赖（如数据库驱动、API 客户端等）
- 对于批量处理场景，建议使用 Directory Parser 或结合线程池进行并发处理

---

**注意**：本文档基于当前可用的实现。随着项目的发展，可能会有新的 Parser 实现添加或现有实现的更新。建议定期查看项目文档以获取最新信息。
