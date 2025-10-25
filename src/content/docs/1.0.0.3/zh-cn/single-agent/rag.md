---
title: 检索增强生成 (RAG)
keywords: ["Spring AI Alibaba", "RAG", "检索增强生成", "VectorStore", "QuestionAnswerAdvisor", "向量数据库"]
description: "深入了解 Spring AI Alibaba 的检索增强生成（RAG）功能，包括向量存储、文档检索、知识库构建等核心概念和实践。"
---

## 概述

检索增强生成（Retrieval-Augmented Generation，RAG）是一种强大的技术，通过结合外部知识库和大语言模型的生成能力，有效解决了模型在处理长文本内容、事实准确性和上下文感知方面的局限性。Spring AI Alibaba 提供了完整的 RAG 解决方案，支持从简单的问答系统到复杂的知识检索应用。

## RAG 工作原理

### 1. 基本流程

![RAG 工作流程](/img/user/ai/tutorials/basics/rag-workflow.png)

1. **文档预处理**：将原始文档分块、清洗和向量化
2. **向量存储**：将文档向量存储到向量数据库
3. **查询处理**：用户查询转换为向量表示
4. **相似性检索**：在向量数据库中检索相关文档
5. **上下文增强**：将检索到的文档作为上下文
6. **生成回答**：模型基于上下文生成最终答案

### 2. 核心组件

- **EmbeddingModel**：文本向量化模型
- **VectorStore**：向量数据库存储
- **DocumentRetriever**：文档检索器
- **QuestionAnswerAdvisor**：问答增强器
- **RetrievalAugmentationAdvisor**：检索增强顾问

## 快速开始

### 1. 添加依赖

```xml
<dependencies>
    <!-- Spring AI Alibaba Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter</artifactId>
    </dependency>
    
    <!-- Vector Store Advisor -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-advisors-vector-store</artifactId>
    </dependency>
    
    <!-- 选择向量数据库实现 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-elasticsearch-store</artifactId>
    </dependency>
</dependencies>
```

### 2. 基本配置

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      embedding:
        options:
          model: text-embedding-v1
    vectorstore:
      elasticsearch:
        index-name: knowledge-base
        similarity: cosine
        dimensions: 1536
  elasticsearch:
    uris: http://localhost:9200
```

### 3. 简单 RAG 实现

```java
@Service
public class SimpleRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    
    public SimpleRAGService(ChatClient.Builder chatClientBuilder, VectorStore vectorStore) {
        this.chatClient = chatClientBuilder.build();
        this.vectorStore = vectorStore;
    }
    
    public String askQuestion(String question) {
        return chatClient.prompt()
            .user(question)
            .advisors(new QuestionAnswerAdvisor(vectorStore))
            .call()
            .content();
    }
}
```

## 文档处理和向量化

### 1. 文档加载和分块

```java
@Service
public class DocumentProcessingService {
    
    private final VectorStore vectorStore;
    private final EmbeddingModel embeddingModel;
    
    public void loadDocuments(String filePath) {
        // 加载文档
        Resource resource = new FileSystemResource(filePath);
        DocumentReader documentReader = new TextResourceDocumentReader(resource);
        List<Document> documents = documentReader.get();
        
        // 文档分块
        TokenTextSplitter textSplitter = new TokenTextSplitter(500, 100, 5, 10000, true);
        List<Document> chunks = textSplitter.apply(documents);
        
        // 添加元数据
        chunks.forEach(chunk -> {
            chunk.getMetadata().put("source", filePath);
            chunk.getMetadata().put("timestamp", System.currentTimeMillis());
            chunk.getMetadata().put("type", "knowledge_base");
        });
        
        // 存储到向量数据库
        vectorStore.add(chunks);
    }
    
    public void loadFromUrl(String url) {
        // 从网页加载文档
        PagePdfDocumentReader pdfReader = new PagePdfDocumentReader(url);
        List<Document> documents = pdfReader.get();
        
        // 处理和存储
        processAndStore(documents, "web", url);
    }
    
    private void processAndStore(List<Document> documents, String type, String source) {
        // 清洗文档内容
        documents = documents.stream()
            .map(this::cleanDocument)
            .filter(doc -> doc.getContent().length() > 50) // 过滤太短的文档
            .collect(Collectors.toList());
        
        // 分块处理
        TokenTextSplitter splitter = new TokenTextSplitter(400, 50, 5, 8000, true);
        List<Document> chunks = splitter.apply(documents);
        
        // 添加元数据
        chunks.forEach(chunk -> {
            chunk.getMetadata().put("type", type);
            chunk.getMetadata().put("source", source);
            chunk.getMetadata().put("processed_at", LocalDateTime.now().toString());
        });
        
        vectorStore.add(chunks);
    }
    
    private Document cleanDocument(Document document) {
        String content = document.getContent()
            .replaceAll("\\s+", " ")  // 规范化空白字符
            .replaceAll("[\\x00-\\x1F\\x7F]", "")  // 移除控制字符
            .trim();
        
        return new Document(content, document.getMetadata());
    }
}
```

### 2. 批量文档处理

```java
@Component
public class BatchDocumentProcessor {
    
    private final VectorStore vectorStore;
    private final TaskExecutor taskExecutor;
    
    @Async
    public CompletableFuture<Void> processBatch(List<String> filePaths) {
        List<CompletableFuture<Void>> futures = filePaths.stream()
            .map(this::processFileAsync)
            .collect(Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }
    
    @Async
    public CompletableFuture<Void> processFileAsync(String filePath) {
        try {
            processFile(filePath);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("处理文件失败: {}", filePath, e);
            return CompletableFuture.failedFuture(e);
        }
    }
    
    private void processFile(String filePath) {
        // 文件处理逻辑
        Resource resource = new FileSystemResource(filePath);
        
        // 根据文件类型选择不同的读取器
        DocumentReader reader = createDocumentReader(resource);
        List<Document> documents = reader.get();
        
        // 处理和存储
        processDocuments(documents, filePath);
    }
    
    private DocumentReader createDocumentReader(Resource resource) {
        String filename = resource.getFilename();
        if (filename.endsWith(".pdf")) {
            return new PagePdfDocumentReader(resource);
        } else if (filename.endsWith(".docx")) {
            return new TikaDocumentReader(resource);
        } else {
            return new TextResourceDocumentReader(resource);
        }
    }
}
```

## 高级 RAG 功能

### 1. 自定义检索策略

```java
@Service
public class AdvancedRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    
    public String advancedSearch(String question, String category) {
        // 构建搜索请求
        SearchRequest searchRequest = SearchRequest.builder()
            .topK(5)
            .similarityThreshold(0.7)
            .filterExpression("type == '" + category + "'")
            .build();
        
        // 自定义提示词模板
        String customPrompt = """
            基于以下检索到的相关文档回答问题。
            
            相关文档：
            {question_answer_context}
            
            问题：{question}
            
            请根据文档内容提供准确、详细的回答。如果文档中没有相关信息，请明确说明。
            """;
        
        PromptTemplate promptTemplate = new PromptTemplate(customPrompt);
        
        return chatClient.prompt()
            .user(question)
            .advisors(new QuestionAnswerAdvisor(vectorStore, searchRequest, promptTemplate))
            .call()
            .content();
    }
    
    public String hybridSearch(String question) {
        // 使用 RetrievalAugmentationAdvisor 进行高级检索
        Advisor retrievalAdvisor = RetrievalAugmentationAdvisor.builder()
            .queryTransformers(
                // 查询重写
                RewriteQueryTransformer.builder()
                    .chatClientBuilder(chatClient.mutate())
                    .build(),
                // 查询扩展
                ExpandQueryTransformer.builder()
                    .chatClientBuilder(chatClient.mutate())
                    .build()
            )
            .documentRetriever(
                VectorStoreDocumentRetriever.builder()
                    .vectorStore(vectorStore)
                    .similarityThreshold(0.6)
                    .topK(8)
                    .build()
            )
            .documentPostProcessors(
                // 文档重排序
                DocumentRanker.builder()
                    .chatClientBuilder(chatClient.mutate())
                    .build()
            )
            .build();
        
        return chatClient.prompt()
            .user(question)
            .advisors(retrievalAdvisor)
            .call()
            .content();
    }
}
```

### 2. 多模态 RAG

```java
@Service
public class MultimodalRAGService {
    
    private final ChatClient chatClient;
    private final VectorStore textVectorStore;
    private final VectorStore imageVectorStore;
    
    public String multimodalSearch(String question, MultipartFile image) {
        List<Document> relevantDocs = new ArrayList<>();
        
        // 文本检索
        SearchRequest textSearch = SearchRequest.builder()
            .topK(3)
            .similarityThreshold(0.7)
            .build();
        relevantDocs.addAll(textVectorStore.similaritySearch(textSearch.withQuery(question)));
        
        // 图像检索（如果提供了图像）
        if (image != null && !image.isEmpty()) {
            // 图像向量化和检索
            SearchRequest imageSearch = SearchRequest.builder()
                .topK(2)
                .similarityThreshold(0.6)
                .build();
            relevantDocs.addAll(imageVectorStore.similaritySearch(imageSearch.withQuery(question)));
        }
        
        // 构建多模态上下文
        String context = relevantDocs.stream()
            .map(doc -> "文档: " + doc.getContent())
            .collect(Collectors.joining("\n\n"));
        
        String prompt = String.format("""
            基于以下多模态上下文信息回答问题：
            
            %s
            
            问题：%s
            """, context, question);
        
        return chatClient.prompt()
            .user(prompt)
            .call()
            .content();
    }
}
```

### 3. 实时 RAG 更新

```java
@Service
public class RealTimeRAGService {
    
    private final VectorStore vectorStore;
    private final RedisTemplate<String, Object> redisTemplate;
    
    @EventListener
    public void handleDocumentUpdate(DocumentUpdateEvent event) {
        // 删除旧文档
        if (event.getOldDocumentId() != null) {
            vectorStore.delete(List.of(event.getOldDocumentId()));
        }
        
        // 添加新文档
        if (event.getNewDocument() != null) {
            vectorStore.add(List.of(event.getNewDocument()));
        }
        
        // 清除相关缓存
        clearRelatedCache(event.getCategory());
    }
    
    public String searchWithCache(String question, String category) {
        String cacheKey = "rag:" + category + ":" + DigestUtils.md5DigestAsHex(question.getBytes());
        
        // 尝试从缓存获取
        String cachedResult = (String) redisTemplate.opsForValue().get(cacheKey);
        if (cachedResult != null) {
            return cachedResult;
        }
        
        // 执行检索
        String result = performSearch(question, category);
        
        // 缓存结果
        redisTemplate.opsForValue().set(cacheKey, result, Duration.ofHours(1));
        
        return result;
    }
    
    private void clearRelatedCache(String category) {
        Set<String> keys = redisTemplate.keys("rag:" + category + ":*");
        if (!keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
```

## 向量数据库集成

### 1. Elasticsearch 集成

```yaml
spring:
  ai:
    vectorstore:
      elasticsearch:
        index-name: knowledge-base
        similarity: cosine
        dimensions: 1536
        mapping-json: |
          {
            "properties": {
              "content": {"type": "text"},
              "metadata": {"type": "object"},
              "embedding": {
                "type": "dense_vector",
                "dims": 1536,
                "similarity": "cosine"
              }
            }
          }
  elasticsearch:
    uris: http://localhost:9200
    username: elastic
    password: password
```

### 2. AnalyticDB 集成

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-analyticdb-store</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      analyticdb:
        host: your-analyticdb-host
        port: 5432
        database: your-database
        username: your-username
        password: your-password
        table-name: vector_store
        dimensions: 1536
```

### 3. TableStore 集成

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tablestore-store</artifactId>
</dependency>
```

```java
@Configuration
public class TableStoreConfig {
    
    @Bean
    public VectorStore tablestoreVectorStore() {
        // 初始化 TableStore 客户端
        SyncClient client = new SyncClient(endpoint, accessKeyId, accessKeySecret, instanceName);
        
        // 创建知识库
        KnowledgeStoreImpl knowledgeStore = KnowledgeStoreImpl.builder()
            .client(client)
            .embeddingDimension(1536)
            .build();
        
        return TablestoreVectorStore.builder(knowledgeStore, embeddingModel)
            .initializeTable(true)
            .build();
    }
}
```

## RAG 性能优化

### 1. 检索优化

```java
@Service
public class OptimizedRAGService {
    
    public String optimizedSearch(String question) {
        // 多阶段检索
        SearchRequest initialSearch = SearchRequest.builder()
            .topK(20)  // 初始检索更多文档
            .similarityThreshold(0.5)  // 较低的阈值
            .build();
        
        List<Document> candidates = vectorStore.similaritySearch(initialSearch.withQuery(question));
        
        // 重排序
        List<Document> reranked = rerankDocuments(question, candidates);
        
        // 选择最相关的文档
        List<Document> finalDocs = reranked.stream()
            .limit(5)
            .collect(Collectors.toList());
        
        // 构建上下文
        String context = finalDocs.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\n\n"));
        
        return generateAnswer(question, context);
    }
    
    private List<Document> rerankDocuments(String question, List<Document> documents) {
        // 使用重排序模型或算法
        return documents.stream()
            .sorted((d1, d2) -> {
                double score1 = calculateRelevanceScore(question, d1);
                double score2 = calculateRelevanceScore(question, d2);
                return Double.compare(score2, score1);
            })
            .collect(Collectors.toList());
    }
    
    private double calculateRelevanceScore(String question, Document document) {
        // 实现相关性评分算法
        // 可以考虑关键词匹配、语义相似度等因素
        return semanticSimilarity(question, document.getContent());
    }
}
```

### 2. 缓存策略

```java
@Configuration
@EnableCaching
public class RAGCacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        RedisCacheManager.Builder builder = RedisCacheManager
            .RedisCacheManagerBuilder
            .fromConnectionFactory(redisConnectionFactory())
            .cacheDefaults(cacheConfiguration());
        
        return builder.build();
    }
    
    private RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(2))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}

@Service
public class CachedRAGService {
    
    @Cacheable(value = "rag-results", key = "#question + '_' + #category")
    public String searchWithCache(String question, String category) {
        return performActualSearch(question, category);
    }
    
    @CacheEvict(value = "rag-results", allEntries = true)
    public void clearCache() {
        // 清除所有缓存
    }
}
```

## 评估和监控

### 1. RAG 质量评估

```java
@Component
public class RAGEvaluator {
    
    public EvaluationResult evaluateRAG(List<TestCase> testCases) {
        List<TestResult> results = new ArrayList<>();
        
        for (TestCase testCase : testCases) {
            String answer = ragService.search(testCase.getQuestion());
            
            // 计算各种指标
            double relevanceScore = calculateRelevance(answer, testCase.getExpectedAnswer());
            double faithfulnessScore = calculateFaithfulness(answer, testCase.getContext());
            double answerCorrectness = calculateCorrectness(answer, testCase.getExpectedAnswer());
            
            results.add(new TestResult(testCase, answer, relevanceScore, faithfulnessScore, answerCorrectness));
        }
        
        return new EvaluationResult(results);
    }
    
    private double calculateRelevance(String answer, String expected) {
        // 使用语义相似度模型计算相关性
        return semanticSimilarityModel.similarity(answer, expected);
    }
    
    private double calculateFaithfulness(String answer, String context) {
        // 检查答案是否忠实于检索到的上下文
        return faithfulnessChecker.check(answer, context);
    }
}
```

### 2. 性能监控

```java
@Component
public class RAGMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Timer searchTimer;
    private final Counter searchCounter;
    private final Gauge cacheHitRate;
    
    public RAGMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.searchTimer = Timer.builder("rag.search.duration")
            .description("RAG search duration")
            .register(meterRegistry);
        this.searchCounter = Counter.builder("rag.search.count")
            .description("RAG search count")
            .register(meterRegistry);
        this.cacheHitRate = Gauge.builder("rag.cache.hit.rate")
            .description("RAG cache hit rate")
            .register(meterRegistry, this, RAGMetrics::getCacheHitRate);
    }
    
    public String timedSearch(String question) {
        return searchTimer.recordCallable(() -> {
            searchCounter.increment();
            return ragService.search(question);
        });
    }
    
    private double getCacheHitRate() {
        // 计算缓存命中率
        return cacheManager.getCacheHitRate();
    }
}
```

## 最佳实践

### 1. 文档质量优化

- **内容清洗**：移除噪音数据、格式化文本
- **合理分块**：根据内容特点选择合适的分块策略
- **元数据丰富**：添加有用的元数据信息
- **定期更新**：保持知识库内容的时效性

### 2. 检索策略优化

- **多阶段检索**：粗检索 + 精排序
- **混合检索**：结合向量检索和关键词检索
- **查询优化**：查询重写、扩展、分解
- **结果过滤**：基于元数据和业务规则过滤

### 3. 系统架构优化

- **缓存机制**：合理使用缓存提升性能
- **异步处理**：文档处理和索引构建异步化
- **负载均衡**：分布式部署和负载均衡
- **监控告警**：完善的监控和告警机制

## 总结

RAG 是构建智能问答和知识检索系统的核心技术。Spring AI Alibaba 提供了完整的 RAG 解决方案，从文档处理到向量存储，从检索优化到结果生成，为开发者提供了强大而灵活的工具集。

关键要点：
- 选择合适的向量数据库和嵌入模型
- 优化文档处理和分块策略
- 实施多阶段检索和重排序
- 建立完善的评估和监控体系
- 持续优化检索质量和系统性能
