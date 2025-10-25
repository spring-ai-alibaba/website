---
title: 高级Advisor组件 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

除了基础的 `RetrievalRerankAdvisor`，Spring AI Alibaba (SAA) 还提供了一系列高级的 Advisor 组件，用于处理更复杂的 RAG 场景和业务需求。这些 Advisor 可以单独使用，也可以组合使用以构建更强大的 RAG 流水线。

## Advisor 架构概览

SAA 的 Advisor 架构基于 Spring AI 的 ChatClient Advisor 机制，提供了灵活的扩展点：

```
用户请求 → [Advisor Chain] → 大语言模型 → [Advisor Chain] → 最终响应
           ↑                                    ↑
        before()                            after()
```

每个 Advisor 都可以在请求**前**和响应**后**进行处理，形成一个强大的处理链条。

## 核心高级 Advisor 组件

### 1. DashScopeDocumentAnalysisAdvisor (文档分析顾问)

`DashScopeDocumentAnalysisAdvisor` 专门用于处理需要上传文档并使用 `qwen-long` 模型进行分析的场景。它可以智能地处理文档上传和文件引用。

**核心能力**:
*   **文档上传**: 自动上传本地文件或URL资源到DashScope
*   **文件引用**: 在对话中通过文件ID引用上传的文档
*   **长上下文处理**: 利用qwen-long模型处理超长文档内容
*   **智能降级**: 无文档时自动转为普通对话模式

**使用示例**:

```java
import com.alibaba.cloud.ai.advisor.DashScopeDocumentAnalysisAdvisor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.model.ApiKey;
import org.springframework.core.io.FileSystemResource;

@Service
public class DocumentAnalysisService {

    private final ChatClient chatClient;

    public DocumentAnalysisService(ChatClient.Builder chatClientBuilder, ApiKey apiKey) {
        // 创建文档分析顾问
        DashScopeDocumentAnalysisAdvisor analysisAdvisor = 
            new DashScopeDocumentAnalysisAdvisor(apiKey);

        this.chatClient = chatClientBuilder
                .defaultAdvisors(analysisAdvisor)
                .build();
    }

    public String analyzeDocument(String question, String filePath) {
        return chatClient.prompt()
                .user(question)
                .advisors(advisorSpec -> 
                    advisorSpec.param(DashScopeDocumentAnalysisAdvisor.RESOURCE, 
                                     new FileSystemResource(filePath)))
                .call()
                .content();
    }

    public String chatWithoutDocument(String question) {
        // 不提供resource参数时，自动转为普通对话
        return chatClient.prompt()
                .user(question)
                .call()
                .content();
    }
}
```

**自定义执行顺序**:

```java
@Configuration
public class DocumentAnalysisConfig {

    @Bean
    public DashScopeDocumentAnalysisAdvisor documentAnalysisAdvisor(ApiKey apiKey) {
        // 指定执行顺序，数字越小越早执行
        return new DashScopeDocumentAnalysisAdvisor(0, apiKey);
    }
}
```

**上传响应处理**:

```java
@Service
public class AdvancedDocumentService {

    public String analyzeWithUploadInfo(String question, String filePath) {
        ChatResponse response = chatClient.prompt()
                .user(question)
                .advisors(advisorSpec -> 
                    advisorSpec.param(DashScopeDocumentAnalysisAdvisor.RESOURCE, 
                                     new FileSystemResource(filePath)))
                .call()
                .chatResponse();

        // 获取上传响应信息
        Object uploadResponse = response.getMetadata()
                .get(DashScopeDocumentAnalysisAdvisor.UPLOAD_RESPONSE);

        if (uploadResponse instanceof ResponseEntity uploadEntity) {
            if (uploadEntity.getBody() instanceof DashScopeDocumentAnalysisAdvisor.UploadResponse uploadResp) {
                logger.info("文件上传成功: ID={}, 文件名={}, 大小={}字节", 
                           uploadResp.id(), uploadResp.filename(), uploadResp.bytes());
            }
        }

        return response.getResult().getOutput().getText();
    }
}
```

### 2. DocumentRetrievalAdvisor (文档检索顾问)

`DocumentRetrievalAdvisor` 提供了灵活的文档检索策略，支持单个或多个检索器的组合使用。

**核心特点**:
*   **单检索器模式**: 使用单个DocumentRetriever进行检索
*   **多检索器组合**: 自动创建CompositeDocumentRetriever组合多个检索器
*   **自定义合并策略**: 支持多种结果合并策略
*   **灵活的Prompt模板**: 可自定义文档上下文的组织方式

**基础用法**:

```java
import com.alibaba.cloud.ai.advisor.DocumentRetrievalAdvisor;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;

@Service
public class BasicRetrievalService {

    public ChatClient createBasicRetrievalClient(ChatClient.Builder builder) {
        // 创建向量检索器
        VectorStoreDocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
                .vectorStore(vectorStore)
                .topK(5)
                .similarityThreshold(0.7)
                .build();

        // 创建文档检索顾问
        DocumentRetrievalAdvisor advisor = new DocumentRetrievalAdvisor(retriever);

        return builder.defaultAdvisors(advisor).build();
    }
}
```

**多检索器组合用法**:

```java
@Service
public class MultiRetrieverService {

    public ChatClient createMultiRetrieverClient(ChatClient.Builder builder) {
        // 创建多个检索器
        List<DocumentRetriever> retrievers = List.of(
            vectorStoreRetriever,
            keywordRetriever,
            temporalRetriever
        );

        // 使用默认配置组合多个检索器
        DocumentRetrievalAdvisor advisor = new DocumentRetrievalAdvisor(retrievers);

        return builder.defaultAdvisors(advisor).build();
    }

    public ChatClient createCustomMergeClient(ChatClient.Builder builder) {
        List<DocumentRetriever> retrievers = List.of(
            vectorStoreRetriever,
            keywordRetriever
        );

        // 自定义合并策略和参数
        DocumentRetrievalAdvisor advisor = new DocumentRetrievalAdvisor(
            retrievers,
            CompositeDocumentRetriever.ResultMergeStrategy.ROUND_ROBIN, // 轮询合并
            8, // 每个检索器最多返回8个结果
            customPromptTemplate, // 自定义Prompt模板
            1 // 执行顺序
        );

        return builder.defaultAdvisors(advisor).build();
    }
}
```

**自定义Prompt模板**:

```java
@Configuration
public class RetrievalAdvisorConfig {

    @Bean
    public PromptTemplate customRetrievalPromptTemplate() {
        return new PromptTemplate("""
            用户问题: {query}
            
            参考文档内容:
            {question_answer_context}
            
            请基于以上参考文档回答用户问题。如果文档中没有相关信息，请明确说明。
            """);
    }

    @Bean
    public DocumentRetrievalAdvisor customRetrievalAdvisor(
            DocumentRetriever retriever,
            PromptTemplate customPromptTemplate) {
        
        return new DocumentRetrievalAdvisor(retriever, customPromptTemplate, 0);
    }
}
```

### 3. CompositeDocumentRetriever (复合文档检索器)

`CompositeDocumentRetriever` 是一个强大的检索器组合工具，支持多种合并策略和错误处理机制。

**合并策略**:
*   **SIMPLE_MERGE**: 简单合并，按检索器顺序排列结果
*   **SCORE_BASED**: 基于文档评分排序（推荐）
*   **ROUND_ROBIN**: 轮询方式交替选择各检索器的结果

**使用示例**:

```java
import com.alibaba.cloud.ai.advisor.CompositeDocumentRetriever;

@Service
public class CompositeRetrievalService {

    // 使用Builder模式创建复合检索器
    public CompositeDocumentRetriever createAdvancedRetriever() {
        return CompositeDocumentRetriever.builder()
                .addRetriever(vectorStoreRetriever)
                .addRetriever(keywordRetriever)
                .addRetriever(temporalRetriever)
                .maxResultsPerRetriever(10) // 每个检索器最多返回10个结果
                .mergeStrategy(CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED)
                .build();
    }

    // 不同合并策略的对比示例
    public void demonstrateStrategies(Query query) {
        List<DocumentRetriever> retrievers = List.of(
            vectorStoreRetriever, keywordRetriever
        );

        // 简单合并 - 保持检索器顺序
        CompositeDocumentRetriever simpleMerge = new CompositeDocumentRetriever(
            retrievers, 5, CompositeDocumentRetriever.ResultMergeStrategy.SIMPLE_MERGE
        );

        // 评分排序 - 按文档相关性得分排序
        CompositeDocumentRetriever scoreBased = new CompositeDocumentRetriever(
            retrievers, 5, CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED
        );

        // 轮询合并 - 各检索器结果交替出现，保证多样性
        CompositeDocumentRetriever roundRobin = new CompositeDocumentRetriever(
            retrievers, 5, CompositeDocumentRetriever.ResultMergeStrategy.ROUND_ROBIN
        );

        List<Document> simpleResults = simpleMerge.retrieve(query);
        List<Document> scoreResults = scoreBased.retrieve(query);
        List<Document> roundRobinResults = roundRobin.retrieve(query);
    }
}
```

**错误处理和容错机制**:

```java
@Service
public class RobustRetrievalService {

    public CompositeDocumentRetriever createRobustRetriever() {
        // 组合多个可能不稳定的检索器
        List<DocumentRetriever> retrievers = List.of(
            primaryRetriever,      // 主要检索器
            secondaryRetriever,    // 备用检索器
            fallbackRetriever      // 兜底检索器
        );

        // CompositeDocumentRetriever 会自动处理单个检索器的异常
        // 确保至少有一个检索器能正常工作
        return CompositeDocumentRetriever.builder()
                .retrievers(retrievers)
                .maxResultsPerRetriever(8)
                .mergeStrategy(CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED)
                .build();
    }
}
```

## 实际应用场景

### 1. 混合检索策略

结合向量检索和关键词检索，提高检索的全面性：

```java
@Service
public class HybridSearchService {

    public ChatClient createHybridSearchClient(ChatClient.Builder builder) {
        // 创建混合检索器
        CompositeDocumentRetriever hybridRetriever = CompositeDocumentRetriever.builder()
                .addRetriever(vectorStoreRetriever) // 语义检索
                .addRetriever(keywordRetriever)     // 关键词检索
                .maxResultsPerRetriever(6)
                .mergeStrategy(CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED)
                .build();

        DocumentRetrievalAdvisor advisor = new DocumentRetrievalAdvisor(hybridRetriever);

        return builder.defaultAdvisors(advisor).build();
    }
}
```

### 2. 文档上传分析场景

使用DashScopeDocumentAnalysisAdvisor处理用户上传的文档：

```java
@RestController
@RequestMapping("/api/document")
public class DocumentAnalysisController {

    private final ChatClient chatClient;

    public DocumentAnalysisController(ChatClient.Builder builder, ApiKey apiKey) {
        DashScopeDocumentAnalysisAdvisor advisor = new DashScopeDocumentAnalysisAdvisor(apiKey);
        this.chatClient = builder.defaultAdvisors(advisor).build();
    }

    @PostMapping("/analyze")
    public String analyzeUploadedDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("question") String question) throws IOException {
        
        // 将上传的文件保存到临时位置
        Path tempFile = Files.createTempFile("upload", file.getOriginalFilename());
        file.transferTo(tempFile.toFile());

        try {
            return chatClient.prompt()
                    .user(question)
                    .advisors(spec -> spec.param(
                        DashScopeDocumentAnalysisAdvisor.RESOURCE,
                        new FileSystemResource(tempFile.toFile())))
                    .call()
                    .content();
        } finally {
            // 清理临时文件
            Files.deleteIfExists(tempFile);
        }
    }
}
```

### 3. 多源检索与智能降级

创建具有智能降级能力的多源检索系统：

```java
@Service
public class IntelligentRetrievalService {

    public DocumentRetrievalAdvisor createIntelligentAdvisor() {
        // 按优先级排列的检索器列表
        List<DocumentRetriever> prioritizedRetrievers = List.of(
            highQualityRetriever,    // 高质量数据源
            standardRetriever,       // 标准数据源
            broadRetriever          // 广泛数据源（兜底）
        );

        // 使用轮询策略确保各个数据源都被利用
        return new DocumentRetrievalAdvisor(
            prioritizedRetrievers,
            CompositeDocumentRetriever.ResultMergeStrategy.ROUND_ROBIN,
            5 // 每个检索器贡献5个结果
        );
    }
}
```

### 4. Advisor组合使用

将多个Advisor组合使用，实现复杂的RAG流水线：

```java
@Service
public class AdvancedRagPipelineService {

    public ChatClient createAdvancedPipeline(ChatClient.Builder builder, ApiKey apiKey) {
        // 1. 文档分析顾问 - 处理文档上传
        DashScopeDocumentAnalysisAdvisor documentAdvisor = 
            new DashScopeDocumentAnalysisAdvisor(0, apiKey); // 优先级0，最先执行

        // 2. 文档检索顾问 - 多源检索
        List<DocumentRetriever> retrievers = List.of(
            vectorStoreRetriever,
            keywordRetriever
        );
        DocumentRetrievalAdvisor retrievalAdvisor = new DocumentRetrievalAdvisor(
            retrievers,
            CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED,
            8,
            customPromptTemplate,
            1 // 优先级1，在文档分析后执行
        );

        return builder
                .defaultAdvisors(documentAdvisor, retrievalAdvisor)
                .build();
    }
}
```

## 性能优化与最佳实践

### 1. 检索器性能监控

```java
@Component
public class RetrievalPerformanceMonitor {

    private final MeterRegistry meterRegistry;

    public DocumentRetriever createMonitoredRetriever(DocumentRetriever originalRetriever, String name) {
        return new DocumentRetriever() {
            @Override
            public List<Document> retrieve(Query query) {
                Timer.Sample sample = Timer.start(meterRegistry);
                try {
                    List<Document> results = originalRetriever.retrieve(query);
                    
                    // 记录成功指标
                    meterRegistry.counter("retrieval.success", "retriever", name).increment();
                    meterRegistry.gauge("retrieval.result_count", Tags.of("retriever", name), results.size());
                    
                    return results;
                } catch (Exception e) {
                    meterRegistry.counter("retrieval.error", "retriever", name).increment();
                    throw e;
                } finally {
                    sample.stop(Timer.builder("retrieval.duration")
                            .tag("retriever", name)
                            .register(meterRegistry));
                }
            }
        };
    }
}
```

### 2. 资源管理最佳实践

```java
@Service
public class ResourceManagementService {

    @PreDestroy
    public void cleanup() {
        // 清理上传的临时文件
        cleanupTempFiles();
        
        // 关闭检索器连接
        closeRetrieverConnections();
    }

    public String safeDocumentAnalysis(Resource resource, String question) {
        try {
            return chatClient.prompt()
                    .user(question)
                    .advisors(spec -> spec.param(
                        DashScopeDocumentAnalysisAdvisor.RESOURCE, resource))
                    .call()
                    .content();
        } catch (Exception e) {
            logger.error("文档分析失败: {}", e.getMessage(), e);
            // 降级到普通对话模式
            return chatClient.prompt()
                    .user("抱歉，文档分析遇到问题。请重新表述您的问题：" + question)
                    .call()
                    .content();
        }
    }
}
```

### 3. 配置最佳实践

```java
@Configuration
public class AdvisorOptimizationConfig {

    @Bean
    @Primary
    public DocumentRetrievalAdvisor optimizedRetrievalAdvisor() {
        // 根据业务需求调整检索器配置
        VectorStoreDocumentRetriever primaryRetriever = VectorStoreDocumentRetriever.builder()
                .vectorStore(vectorStore)
                .topK(8) // 适中的检索数量
                .similarityThreshold(0.75) // 较高的相似度阈值
                .build();

        // 创建后备检索器，降低阈值增加召回
        VectorStoreDocumentRetriever fallbackRetriever = VectorStoreDocumentRetriever.builder()
                .vectorStore(vectorStore)
                .topK(5)
                .similarityThreshold(0.5) // 较低的阈值
                .build();

        CompositeDocumentRetriever composite = CompositeDocumentRetriever.builder()
                .addRetriever(primaryRetriever)
                .addRetriever(fallbackRetriever)
                .maxResultsPerRetriever(6)
                .mergeStrategy(CompositeDocumentRetriever.ResultMergeStrategy.SCORE_BASED)
                .build();

        return new DocumentRetrievalAdvisor(composite);
    }
}
```

通过合理组合使用这些高级 Advisor 组件，您可以构建出功能强大、高度定制化的 RAG 系统，满足各种复杂的业务需求。这些组件的设计遵循了Spring的依赖注入和配置原则，确保了良好的可测试性和可维护性。
