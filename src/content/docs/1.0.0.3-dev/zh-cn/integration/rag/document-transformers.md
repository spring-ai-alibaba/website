---
title: 文档转换器 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

在 RAG 流程中，原始文档的处理和转换是影响最终质量的关键环节。Spring AI Alibaba (SAA) 提供了一套强大的文档转换器工具，帮助您将各种格式的文档转换为最适合向量化和检索的结构化内容。

## 文档转换器概览

文档转换器在 RAG 流程中处于**文档读取**和**文本分割**之间的重要位置：

```
原始文档 → DocumentReader → Document对象 → DocumentTransformer → 优化后的Document → TextSplitter → 文档片段
```

SAA 提供的转换器可以：
*   **智能内容提取**: 从复杂文档中提取关键信息
*   **格式标准化**: 将不同格式的内容统一为标准结构
*   **内容增强**: 通过AI对内容进行语义增强和优化
*   **噪音过滤**: 移除无关的格式信息和冗余内容

## 核心转换器组件

### 1. DashScopeDocumentTransformer (百炼文档转换器)

`DashScopeDocumentTransformer` 是 SAA 提供的核心文档转换器，它利用阿里云百炼平台的强大AI能力，对文档内容进行智能分析和转换。

**核心能力**:
*   **智能摘要**: 为长文档生成准确的摘要
*   **关键词提取**: 自动识别文档的核心关键词
*   **内容分类**: 为文档内容进行主题分类
*   **语言优化**: 优化文档的表达方式以提高检索效果

**基本使用示例**:

```java
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentTransformer;
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentTransformerOptions;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DocumentTransformationService {

    private final DashScopeDocumentTransformer documentTransformer;

    public DocumentTransformationService(DashScopeDocumentTransformer documentTransformer) {
        this.documentTransformer = documentTransformer;
    }

    public List<Document> transformDocuments(List<Document> originalDocuments) {
        // 配置转换选项
        DashScopeDocumentTransformerOptions options = DashScopeDocumentTransformerOptions.builder()
                .withEnhanceMode("summary_keywords") // 启用摘要和关键词提取
                .withLanguage("zh") // 指定语言为中文
                .build();

        // 应用转换器
        return documentTransformer.apply(originalDocuments);
    }
}
```

**高级配置示例**:

```java
@Configuration
public class DocumentTransformerConfig {

    @Bean
    public DashScopeDocumentTransformer customDocumentTransformer(DashScopeApi dashScopeApi) {
        DashScopeDocumentTransformerOptions options = DashScopeDocumentTransformerOptions.builder()
                // 转换模式配置
                .withEnhanceMode("full") // 完整增强模式
                .withSummaryLength(200) // 摘要长度限制
                .withKeywordCount(10) // 提取关键词数量
                
                // 内容过滤配置
                .withRemoveHeaders(true) // 移除标题格式
                .withRemoveFooters(true) // 移除页脚信息
                .withMinContentLength(50) // 最小内容长度阈值
                
                // 语义增强配置
                .withSemanticEnhancement(true) // 启用语义增强
                .withConceptExpansion(true) // 启用概念扩展
                
                .build();

        return new DashScopeDocumentTransformer(dashScopeApi, options);
    }
}
```

### 2. 高级文本分割器

除了基础的 `TokenTextSplitter`，SAA 还提供了更智能的文本分割器来配合文档转换器使用。

#### RecursiveCharacterTextSplitter (递归字符文本分割器)

这是一个更智能的文本分割器，它会尝试在语义边界处进行分割，而不是简单地按字符数分割。

```java
import com.alibaba.cloud.ai.transformer.splitter.RecursiveCharacterTextSplitter;

@Service
public class AdvancedTextSplittingService {

    public List<Document> splitDocumentsRecursively(List<Document> documents) {
        RecursiveCharacterTextSplitter splitter = RecursiveCharacterTextSplitter.builder()
                .withChunkSize(1000) // 每个块的目标大小
                .withChunkOverlap(200) // 块之间的重叠大小
                .withSeparators(Arrays.asList("\n\n", "\n", "。", "！", "？", "；")) // 分割分隔符优先级
                .withKeepSeparator(true) // 保留分隔符
                .build();

        return splitter.apply(documents);
    }
}
```

#### SentenceSplitter (句子分割器)

针对中文文档优化的句子级别分割器，能够准确识别中文句子边界。

```java
import com.alibaba.cloud.ai.transformer.splitter.SentenceSplitter;

@Service
public class SentenceSplittingService {

    public List<Document> splitBySentences(List<Document> documents) {
        SentenceSplitter splitter = SentenceSplitter.builder()
                .withMaxSentencesPerChunk(5) // 每个块最多包含的句子数
                .withMinSentencesPerChunk(2) // 每个块最少包含的句子数
                .withPreserveParagraphs(true) // 尽量保持段落完整性
                .withLanguage("zh") // 中文语言支持
                .build();

        return splitter.apply(documents);
    }
}
```

## 完整的文档处理流水线

以下是一个集成文档转换器和高级分割器的完整处理流水线示例：

```java
import org.springframework.ai.document.DocumentReader;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

@Service
public class AdvancedDocumentProcessingPipeline {

    private final DashScopeDocumentTransformer documentTransformer;
    private final VectorStore vectorStore;

    public AdvancedDocumentProcessingPipeline(
            DashScopeDocumentTransformer documentTransformer,
            VectorStore vectorStore) {
        this.documentTransformer = documentTransformer;
        this.vectorStore = vectorStore;
    }

    public void processDocument(String filePath, String documentId) {
        try {
            // 1. 读取原始文档
            DocumentReader reader = new PagePdfDocumentReader(new FileSystemResource(filePath));
            List<Document> originalDocuments = reader.get();

            // 2. 添加文档元数据
            for (Document doc : originalDocuments) {
                doc.getMetadata().put("documentId", documentId);
                doc.getMetadata().put("filePath", filePath);
                doc.getMetadata().put("processedAt", Instant.now().toString());
            }

            // 3. 应用文档转换器进行内容增强
            List<Document> transformedDocuments = documentTransformer.apply(originalDocuments);

            // 4. 使用递归字符分割器进行智能分割
            RecursiveCharacterTextSplitter splitter = RecursiveCharacterTextSplitter.builder()
                    .withChunkSize(800)
                    .withChunkOverlap(150)
                    .withSeparators(Arrays.asList("\n\n", "\n", "。", "！", "？"))
                    .build();

            List<Document> splitDocuments = splitter.apply(transformedDocuments);

            // 5. 为每个分割后的文档块添加额外的元数据
            for (int i = 0; i < splitDocuments.size(); i++) {
                Document doc = splitDocuments.get(i);
                doc.getMetadata().put("chunkIndex", i);
                doc.getMetadata().put("totalChunks", splitDocuments.size());
                
                // 如果转换器生成了摘要和关键词，保存到元数据中
                if (doc.getMetadata().containsKey("summary")) {
                    doc.getMetadata().put("hassSummary", true);
                }
            }

            // 6. 存储到向量数据库
            vectorStore.add(splitDocuments);

            logger.info("成功处理文档 {}, 生成 {} 个文档块", filePath, splitDocuments.size());

        } catch (Exception e) {
            logger.error("处理文档失败: {}", filePath, e);
            throw new RuntimeException("文档处理失败", e);
        }
    }
}
```

## 文档转换最佳实践

### 1. 选择合适的转换策略

不同类型的文档需要不同的转换策略：

```java
@Service
public class DocumentTypeBasedTransformation {

    public List<Document> transformByDocumentType(List<Document> documents, String documentType) {
        DashScopeDocumentTransformerOptions.Builder optionsBuilder = 
            DashScopeDocumentTransformerOptions.builder();

        switch (documentType.toLowerCase()) {
            case "technical":
                // 技术文档：保留专业术语，提取关键概念
                optionsBuilder
                    .withEnhanceMode("keywords_concepts")
                    .withPreserveTechnicalTerms(true)
                    .withConceptExpansion(true);
                break;
                
            case "legal":
                // 法律文档：保持原文准确性，添加摘要
                optionsBuilder
                    .withEnhanceMode("summary_only")
                    .withPreserveOriginalText(true)
                    .withSummaryLength(300);
                break;
                
            case "news":
                // 新闻文档：提取关键事实和人物
                optionsBuilder
                    .withEnhanceMode("facts_entities")
                    .withEntityExtraction(true)
                    .withFactExtraction(true);
                break;
                
            default:
                // 通用文档：标准增强模式
                optionsBuilder.withEnhanceMode("standard");
        }

        DashScopeDocumentTransformer transformer = 
            new DashScopeDocumentTransformer(dashScopeApi, optionsBuilder.build());
        
        return transformer.apply(documents);
    }
}
```

### 2. 性能优化

文档转换可能是一个耗时的过程，以下是一些优化建议：

```java
@Service
public class OptimizedDocumentTransformation {

    private final AsyncTaskExecutor taskExecutor;

    @Async
    public CompletableFuture<List<Document>> transformDocumentsAsync(List<Document> documents) {
        // 批量处理文档以提高效率
        List<List<Document>> batches = partitionDocuments(documents, 10); // 每批10个文档
        
        List<CompletableFuture<List<Document>>> futures = batches.stream()
                .map(batch -> CompletableFuture.supplyAsync(() -> 
                    documentTransformer.apply(batch), taskExecutor))
                .collect(Collectors.toList());

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .flatMap(List::stream)
                        .collect(Collectors.toList()));
    }

    private List<List<Document>> partitionDocuments(List<Document> documents, int batchSize) {
        return IntStream.range(0, (documents.size() + batchSize - 1) / batchSize)
                .mapToObj(i -> documents.subList(
                    i * batchSize, 
                    Math.min((i + 1) * batchSize, documents.size())))
                .collect(Collectors.toList());
    }
}
```

### 3. 质量监控

监控转换质量确保系统的稳定性：

```java
@Component
public class TransformationQualityMonitor {

    private final MeterRegistry meterRegistry;

    public List<Document> monitoredTransform(List<Document> documents) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            List<Document> transformed = documentTransformer.apply(documents);
            
            // 记录转换成功率
            meterRegistry.counter("document.transformation.success").increment();
            
            // 记录内容质量指标
            double avgContentLength = transformed.stream()
                    .mapToInt(doc -> doc.getText().length())
                    .average()
                    .orElse(0.0);
            
            meterRegistry.gauge("document.transformation.avg_content_length", avgContentLength);
            
            return transformed;
            
        } catch (Exception e) {
            meterRegistry.counter("document.transformation.error").increment();
            throw e;
        } finally {
            sample.stop(Timer.builder("document.transformation.duration")
                    .register(meterRegistry));
        }
    }
}
```

通过合理使用 SAA 提供的文档转换器和高级分割器，您可以显著提升 RAG 系统的文档处理质量，从而改善最终的检索和生成效果。
