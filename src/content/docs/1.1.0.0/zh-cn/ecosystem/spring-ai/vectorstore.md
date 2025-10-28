---
title: 向量存储(Vector Store)
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba向量存储介绍"
---

## 向量数据库

向量数据库是一种专门类型的数据库，在 AI 应用中扮演着重要角色。

在向量数据库中，查询与传统关系型数据库不同。 它们不是进行精确匹配，而是执行相似性搜索。 当给定一个向量作为查询时，向量数据库会返回与查询向量"相似"的向量。 关于这种相似性如何在高层次上计算的更多细节，请参见 [向量相似性](https://doc.spring4all.com/spring-ai/reference/api/vectordbs/understand-vectordbs.html#vectordbs-similarity)。

向量数据库用于将你的数据与 AI 模型集成。 使用它们的第一步是将数据加载到向量数据库中。 然后，当用户查询要发送到 AI 模型时，首先检索一组相似的文档。 这些文档随后作为用户问题的上下文，与用户的查询一起发送到 AI 模型。 这种技术被称为 [检索增强生成 (RAG)](https://doc.spring4all.com/spring-ai/reference/concepts.html#concept-rag)。

以下各节描述了 Spring AI 用于使用多个向量数据库实现的接口和一些高级示例用法。

最后一节旨在揭开向量数据库中相似性搜索底层方法的神秘面纱。

### API 概述

Spring AI 通过 `VectorStore` 接口提供了与向量数据库交互的抽象 API。以下是 `VectorStore` 接口的定义:

```java
public interface VectorStore extends DocumentWriter { 
    default String getName () { 
        return this.getClass().getSimpleName(); 
    } 
    
    void add (List<Document> documents); 
    
    void delete (List<String> idList); 
    
    void delete (Filter.Expression filterExpression); 
    
    default void delete (String filterExpression) { ... }; 
    
    List<Document> similaritySearch (String query); 
    
    List<Document> similaritySearch (SearchRequest request); 
    
    default <T> Optional<T> getNativeClient () { 
        return Optional.empty(); 
    }
}
```

以及相关的 `SearchRequest` 构建器:

```java
public class SearchRequest { 
    public static final double SIMILARITY_THRESHOLD_ACCEPT_ALL = 0.0; 
    public static final int DEFAULT_TOP_K = 4; 
    
    private String query = ""; 
    private int topK = DEFAULT_TOP_K; 
    private double similarityThreshold = SIMILARITY_THRESHOLD_ACCEPT_ALL; 
    @Nullable 
    private Filter.Expression filterExpression; 
    
    public static Builder from (SearchRequest originalSearchRequest) { 
        return builder()
            .query(originalSearchRequest.getQuery()) 
            .topK(originalSearchRequest.getTopK()) 
            .similarityThreshold(originalSearchRequest.getSimilarityThreshold()) 
            .filterExpression(originalSearchRequest.getFilterExpression()); 
    } 
    
    public static class Builder { 
        private final SearchRequest searchRequest = new SearchRequest(); 
        
        public Builder query (String query) { 
            Assert.notNull(query, "Query can not be null."); 
            this.searchRequest.query = query; 
            return this; 
        } 
        
        public Builder topK (int topK) { 
            Assert.isTrue(topK >= 0, "TopK should be positive."); 
            this.searchRequest.topK = topK; 
            return this; 
        } 
        
        public Builder similarityThreshold (double threshold) { 
            Assert.isTrue(threshold >= 0 && threshold <= 1, "Similarity threshold must be in [0,1] range."); 
            this.searchRequest.similarityThreshold = threshold; 
            return this; 
        } 
        
        public Builder similarityThresholdAll () { 
            this.searchRequest.similarityThreshold = 0.0; 
            return this; 
        } 
        
        public Builder filterExpression (@Nullable Filter.Expression expression) { 
            this.searchRequest.filterExpression = expression; 
            return this; 
        } 
        
        public Builder filterExpression (@Nullable String textExpression) { 
            this.searchRequest.filterExpression = (textExpression != null) 
                ? new FilterExpressionTextParser().parse(textExpression) : null; 
            return this; 
        } 
        
        public SearchRequest build () { 
            return this.searchRequest; 
        } 
    } 
    
    public String getQuery () {...} 
    public int getTopK () {...} 
    public double getSimilarityThreshold () {...} 
    public Filter.Expression getFilterExpression () {...}
}
```

要将数据插入向量数据库，需要将其封装在 `Document` 对象中。 `Document` 类封装了来自数据源（如 PDF 或 Word 文档）的内容，并包含以字符串形式表示的文本。 它还包含以键值对形式存储的元数据，包括文件名等详细信息。

在插入向量数据库时，文本内容使用嵌入模型转换为数值数组或 `float[]`，称为向量嵌入。嵌入模型，如 [Word2Vec](https://en.wikipedia.org/wiki/Word2vec)、[GLoVE](https://en.wikipedia.org/wiki/GloVe_(machine_learning)) 和 [BERT](https://en.wikipedia.org/wiki/BERT_(language_model))，或 OpenAI 的 `text-embedding-ada-002`，用于将单词、句子或段落转换为这些向量嵌入。

向量数据库的作用是存储和促进这些嵌入的相似性搜索。它本身不生成嵌入。对于创建向量嵌入，应该使用 `EmbeddingModel`。

接口中的 `similaritySearch` 方法允许检索与给定查询字符串相似的文档。这些方法可以通过使用以下参数进行微调：

- `k`：一个整数，指定要返回的相似文档的最大数量。这通常被称为"top K"搜索，或"K 最近邻"（KNN）。
- `threshold`：一个范围从 0 到 1 的双精度值，其中值越接近 1 表示相似度越高。默认情况下，如果你设置阈值为 0.75，例如，只返回相似度高于此值的文档。
- `Filter.Expression`：一个用于传递流畅 DSL（领域特定语言）表达式的类，其功能类似于 SQL 中的"where"子句，但它仅适用于 `Document` 的元数据键值对。
- `filterExpression`：基于 ANTLR4 的外部 DSL，接受字符串形式的过滤表达式。例如，对于元数据键如 country、year 和 `isActive`，你可以使用如下表达式：`country == 'UK' && year >= 2020 && isActive == true.`

有关 `Filter.Expression` 的更多信息，请参见 [元数据过滤器](https://doc.spring4all.com/spring-ai/reference/api/vectordbs.html#metadata-filters) 部分。

### 模式初始化

一些向量存储需要在使用前初始化其后端模式。默认情况下不会为你初始化。你必须通过传递适当的构造函数参数布尔值来选择加入，或者如果使用 `Spring Boot`，在 `application.properties` 或 `application.yml` 中将适当的 `initialize-schema` 属性设置为 `true`。

### 批处理策略

在使用向量存储时，通常需要嵌入大量文档。 虽然一次性嵌入所有文档似乎很简单，但这种方法可能会导致问题。 嵌入模型将文本作为令牌处理，并且有最大令牌限制，通常称为上下文窗口大小。 这个限制限制了可以在单个嵌入请求中处理的文本量。 尝试在一次调用中嵌入太多令牌可能会导致错误或截断的嵌入。

为了解决这个令牌限制，Spring AI 实现了批处理策略。 这种方法将大型文档集分解成适合嵌入模型最大上下文窗口的较小批次。 批处理不仅解决了令牌限制问题，还可以提高性能并更有效地使用 API 速率限制。

Spring AI 通过 `BatchingStrategy` 接口提供此功能，该接口允许基于其令牌计数处理子批次中的文档。

#### 核心 BatchingStrategy 接口

```java
public interface BatchingStrategy { 
    List<List<Document>> batch(List<Document> documents);
}
```

#### 默认实现

Spring AI 提供了一个名为 `TokenCountBatchingStrategy` 的默认实现。此策略基于文档的令牌计数进行批处理，确保每个批次不超过计算的最大输入令牌计数。

`TokenCountBatchingStrategy` 的主要特点：

1. 使用 OpenAI 的最大输入令牌计数（8191）作为默认上限。
2. 包含保留百分比（默认 10%）以为潜在开销提供缓冲。
3. 计算实际最大输入令牌计数为：`actualMaxInputTokenCount = originalMaxInputTokenCount * (1 - RESERVE_PERCENTAGE)`

该策略估计每个文档的令牌计数，将它们分组为不超过最大输入令牌计数的批次，如果单个文档超过此限制则抛出异常。

你还可以自定义 `TokenCountBatchingStrategy` 以更好地满足你的特定需求。这可以通过在 Spring Boot `@Configuration` 类中创建具有自定义参数的新实例来完成。

以下是创建自定义` TokenCountBatchingStrategy bean` 的示例:

```java
@Configuration 
public class EmbeddingConfig { 
    @Bean 
    public BatchingStrategy customTokenCountBatchingStrategy () { 
        return new TokenCountBatchingStrategy( 
            EncodingType.CL100K_BASE, // 指定编码类型 
            8000, // 设置最大输入令牌计数 
            0.1 // 设置保留百分比
        ); 
    }
}
```

在此配置中：

1. `EncodingType.CL100K_BASE`：指定用于令牌化的编码类型。此编码类型由 `JTokkitTokenCountEstimator` 使用以准确估计令牌计数。
2. `8000`：设置最大输入令牌计数。此值应小于或等于你的嵌入模型的最大上下文窗口大小。
3. `0.1`：设置保留百分比。从最大输入令牌计数中保留的令牌百分比。这为处理过程中潜在的令牌计数增加创建了缓冲。

默认情况下，此构造函数使用 `Document.DEFAULT_CONTENT_FORMATTER` 进行内容格式化，使用 `MetadataMode.NONE` 进行元数据处理。如果你需要自定义这些参数，可以使用带有附加参数的完整构造函数。

一旦定义，这个自定义 `TokenCountBatchingStrategy` bean 将被你的应用程序中的 `EmbeddingModel` 实现自动使用，替换默认策略。

`TokenCountBatchingStrategy` 内部使用 `TokenCountEstimator`（特别是 `JTokkitTokenCountEstimator`）来计算令牌计数以进行高效批处理。这确保了基于指定编码类型的准确令牌估计。

此外，`TokenCountBatchingStrategy` 通过允许你传入自己的 `TokenCountEstimator` 接口实现来提供灵活性。此功能使你能够使用针对特定需求定制的自定义令牌计数策略。例如：

```java
TokenCountEstimator customEstimator = new YourCustomTokenCountEstimator();
TokenCountBatchingStrategy strategy = new TokenCountBatchingStrategy(
		this.customEstimator,
    8000,  // maxInputTokenCount
    0.1,   // reservePercentage
    Document.DEFAULT_CONTENT_FORMATTER,
    MetadataMode.NONE
);
```

#### 使用自动截断

一些嵌入模型，如 Vertex AI 文本嵌入，支持 `auto_truncate` 功能。启用后，模型会静默截断超过最大大小的文本输入并继续处理；禁用时，它会为过大的输入抛出明确的错误。

在使用自动截断的批处理策略时，你必须将批处理策略配置为比模型实际最大值高得多的输入令牌计数。这可以防止批处理策略对大型文档引发异常，允许嵌入模型在内部处理截断。

##### 自动截断的配置

启用自动截断时，将批处理策略的最大输入令牌计数设置得比模型的实际限制高得多。这可以防止批处理策略对大型文档引发异常，允许嵌入模型在内部处理截断。

以下是使用 Vertex AI 的自动截断和自定义 `BatchingStrategy` 的配置示例:

```java
@Configuration 
public class AutoTruncationEmbeddingConfig { 
    @Bean 
    public VertexAiTextEmbeddingModel vertexAiEmbeddingModel ( 
        VertexAiEmbeddingConnectionDetails connectionDetails) { 
        VertexAiTextEmbeddingOptions options = VertexAiTextEmbeddingOptions.builder() 
            .model(VertexAiTextEmbeddingOptions.DEFAULT_MODEL_NAME) 
            .autoTruncate(true) // 启用自动截断
            .build(); 
        return new VertexAiTextEmbeddingModel(connectionDetails, options); 
    } 
    
    @Bean 
    public BatchingStrategy batchingStrategy () { 
        // 仅当嵌入模型中启用了自动截断时才使用高令牌限制。 
        // 设置比模型实际支持的令牌计数高得多 
        // (例如，当 Vertex AI 仅支持最多 20,000 时设置为 132,900) 
        return new TokenCountBatchingStrategy( 
            EncodingType.CL100K_BASE, 132900, // 人为设置的高限制 
            0.1 // 10% 保留
        ); 
    } 
    
    @Bean 
    public VectorStore vectorStore (JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel, BatchingStrategy batchingStrategy) { 
        return PgVectorStore.builder(jdbcTemplate, embeddingModel) 
            // 此处省略其他属性
            .build(); 
    }
}
```

在此配置中：

1. 嵌入模型启用了自动截断，允许它优雅地处理过大的输入。
2. 批处理策略使用人为设置的高令牌限制（132,900），这比实际模型限制（20,000）大得多。
3. 向量存储使用配置的嵌入模型和自定义 `BatchingStrategy` bean。

##### 为什么这样做有效

这种方法有效是因为：

1. `TokenCountBatchingStrategy` 检查是否有任何单个文档超过配置的最大值，如果超过则抛出 `IllegalArgumentException`。
2. 通过在批处理策略中设置非常高的限制，我们确保此检查永远不会失败。
3. 超过模型限制的文档或批次会被嵌入模型的自动截断功能静默截断和处理。

##### 最佳实践

使用自动截断时：

- 将批处理策略的最大输入令牌计数设置为至少比模型的实际限制高 5-10 倍，以避免批处理策略过早引发异常。
- 监控你的日志以获取来自嵌入模型的截断警告（注意：并非所有模型都记录截断事件）。
- 考虑静默截断对嵌入质量的影响。
- 使用示例文档测试以确保截断的嵌入仍然满足你的要求。
- 为未来的维护者记录此配置，因为它是非标准的。

警告：虽然自动截断可以防止错误，但它可能导致不完整的嵌入。长文档末尾的重要信息可能会丢失。如果你的应用程序需要嵌入所有内容，请在嵌入前将文档分割成较小的块。

#### Spring Boot 自动配置

如果你使用 Spring Boot 自动配置，你必须提供一个自定义 `BatchingStrategy` bean 来覆盖 Spring AI 附带的默认策略：

```java
@Bean 
public BatchingStrategy customBatchingStrategy () { 
    // 此 bean 将覆盖默认的 BatchingStrategy 
    return new TokenCountBatchingStrategy( 
        EncodingType.CL100K_BASE, 132900, // 比模型的实际限制高得多 
        0.1
    );
}
```

此 bean 在你的应用程序上下文中的存在将自动替换所有向量存储使用的默认批处理策略。

#### 自定义实现

虽然 `TokenCountBatchingStrategy` 提供了强大的默认实现，但你可以自定义批处理策略以适应特定需求。 这可以通过 Spring Boot 的自动配置来完成。

要自定义批处理策略，在你的 Spring Boot 应用程序中定义一个 `BatchingStrategy` bean：

```java
@Configuration 
public class EmbeddingConfig { 
    @Bean 
    public BatchingStrategy customBatchingStrategy () { 
        return new CustomBatchingStrategy(); 
    }
}
```

然后，这个自定义 `BatchingStrategy` 将被你的应用程序中的 `EmbeddingModel` 实现自动使用。

注意：Spring AI 支持的向量存储配置为使用默认的 `TokenCountBatchingStrategy`。 SAP Hana 向量存储目前未配置批处理。

### VectorStore 实现

以下是 `VectorStore` 接口的可用实现:

- Azure Vector Search - Azure 向量存储。
- Apache Cassandra - Apache Cassandra 向量存储。
- Chroma Vector Store - Chroma 向量存储。
- Elasticsearch Vector Store - Elasticsearch 向量存储。
- GemFire Vector Store - GemFire 向量存储。
- MariaDB Vector Store - MariaDB 向量存储。
- Milvus Vector Store - Milvus 向量存储。
- MongoDB Atlas Vector Store - MongoDB Atlas 向量存储。
- Neo4j Vector Store - Neo4j 向量存储。
- OpenSearch Vector Store - OpenSearch 向量存储。
- Oracle Vector Store - Oracle Database 向量存储。
- PgVector Store - PostgreSQL/PGVector 向量存储。
- Pinecone Vector Store - PineCone 向量存储。
- Qdrant Vector Store - Qdrant 向量存储。
- Redis Vector Store - Redis 向量存储。
- SAP Hana Vector Store - SAP HANA 向量存储。
- Typesense Vector Store - Typesense 向量存储。
- Weaviate Vector Store - Weaviate 向量存储。
- SimpleVectorStore - 一个简单的持久化向量存储实现，适合教育目的。

### 示例用法

#### 加载数据到向量存储

要为向量数据库计算嵌入，你需要选择一个与使用的高级 AI 模型匹配的嵌入模型。

例如，对于 OpenAI 的 ChatGPT，我们使用 `OpenAiEmbeddingModel` 和名为 `text-embedding-ada-002` 的模型。

Spring Boot starter 的 OpenAI 自动配置使 `EmbeddingModel` 的实现可用于 Spring 应用程序上下文中的依赖注入。

将数据加载到向量存储中的一般用法是在批处理类作业中完成的，首先将数据加载到 Spring AI 的 `Document` 类中，然后调用 `save` 方法。

给定一个表示 JSON 文件的源文件的 `String` 引用，其中包含我们要加载到向量数据库中的数据，我们使用 Spring AI 的 `JsonReader` 来加载 JSON 中的特定字段，将它们分割成小块，然后将这些小块传递给向量存储实现。 `VectorStore` 实现计算嵌入并将 JSON 和嵌入存储在向量数据库中：

```java
@Autowired
VectorStore vectorStore; 

void load (String sourceFile) { 
    JsonReader jsonReader = new JsonReader(
        new FileSystemResource(sourceFile), 
        "price", "name", "shortDescription", "description", "tags"
    ); 
    List<Document> documents = jsonReader.get(); 
    this.vectorStore.add(documents); 
}
```

#### 相似性搜索

```java
String question = <question from user> 
List<Document> similarDocuments = store.similaritySearch(this.question);
```

可以将其他选项传递到 `similaritySearch` 方法中，以定义要检索的文档数量和相似性搜索的阈值。

### 元数据过滤器

本节描述了你可以用于查询结果的各种过滤器。

#### 过滤器字符串

你可以将类似 SQL 的过滤表达式作为 `String` 传递给 `similaritySearch` 重载之一。

示例:

- "country == 'BG'"
- "genre == 'drama' && year >= 2020"
- "genre in ['comedy', 'documentary', 'drama']"

#### Filter.Expression

你可以使用 `FilterExpressionBuilder` 创建一个 `Filter.Expression` 实例，它提供了一个流畅的 API。简单例子:

```java
FilterExpressionBuilder b = new FilterExpressionBuilder();
Expression expression = this.b.eq("country", "BG").build();
```

复杂表达式示例:

```java
EQUALS: '=='
MINUS : '-'
PLUS: '+'
GT: '>'
GE: '>='
LT: '<'
LE: '<='
NE: '!='
```

你可以通过使用以下运算符组合表达式：

```text
AND: 'AND' | 'and' | '&&';
OR: 'OR' | 'or' | '||';
```

考虑以下示例：

```java
Expression exp = b.and(b.eq("genre", "drama"), b.gte("year", 2020)).build();
```

使用 IN 和 NOT 运算符:

```text
IN: 'IN' | 'in';
NIN: 'NIN' | 'nin';
NOT: 'NOT' | 'not';
```

```java
Expression exp = b.and(
    b.in("genre", "drama", "documentary"), 
    b.not(b.lt("year", 2020))
).build();
```

### 从向量存储中删除文档

Vector Store 接口提供了多种删除文档的方法，允许你通过特定文档 ID 或使用过滤表达式删除数据。

#### 通过文档 ID 删除

删除文档的最简单方法是提供文档 ID 列表：

```java
void delete(List<String> idList);
```

此方法删除 ID 与提供的列表匹配的所有文档。 如果列表中的任何 ID 在存储中不存在，它将被忽略。

示例用法

```java
// 创建并添加文档
Document document = new Document("The World is Big", 
    Map.of("country", "Netherlands"));
vectorStore.add(List.of(document));

// 通过 ID 删除文档
vectorStore.delete(List.of(document.getId()));
```

#### 通过过滤表达式删除

对于更复杂的删除条件，你可以使用过滤表达式：

```java
void delete(Filter.Expression filterExpression);
```

此方法接受一个 `Filter.Expression` 对象，该对象定义了应删除哪些文档的条件。 当你需要基于文档的元数据属性删除文档时，这特别有用。

示例用法

```java
// 创建具有不同元数据的测试文档
Document bgDocument = new Document("The World is Big", 
    Map.of("country", "Bulgaria"));
Document nlDocument = new Document("The World is Big", 
    Map.of("country", "Netherlands"));

// 将文档添加到存储中
vectorStore.add(List.of(bgDocument, nlDocument));

// 使用过滤表达式删除保加利亚的文档
Filter.Expression filterExpression = new Filter.Expression( 
    Filter.ExpressionType.EQ, 
    new Filter.Key("country"), 
    new Filter.Value("Bulgaria")
);
vectorStore.delete(filterExpression);
```

#### 通过字符串过滤表达式删除

为了方便，你还可以使用基于字符串的过滤表达式删除文档：

```java
void delete(String filterExpression);
```

此方法在内部将提供的字符串过滤器转换为 `Filter.Expression` 对象。 当你有字符串格式的过滤条件时，这很有用。

示例用法

```java
// 创建并添加文档
Document bgDocument = new Document("The World is Big", 
    Map.of("country", "Bulgaria"));
Document nlDocument = new Document("The World is Big", 
    Map.of("country", "Netherlands"));
vectorStore.add(List.of(bgDocument, nlDocument));

// 使用字符串过滤器删除保加利亚文档
vectorStore.delete("country == 'Bulgaria'");

// 验证剩余文档
SearchRequest request = SearchRequest.builder()
    .query("World")
    .topK(5)
    .build();
List<Document> results = vectorStore.similaritySearch(request);
// results 将只包含荷兰文档
```

#### 调用删除 API 时的错误处理

所有删除方法在发生错误时都可能抛出异常：

最佳实践是将删除操作包装在 try-catch 块中：

示例用法

```java
try { 
    vectorStore.delete("country == 'Bulgaria'");
}
catch (Exception e) { 
    logger.error("Invalid filter expression", e);
}
```

#### 文档版本控制用例

一个常见的场景是管理文档版本，你需要上传文档的新版本同时删除旧版本。以下是使用过滤表达式处理这种情况的方法：

示例用法

```java
// 创建初始文档（v1）并添加版本元数据
Document documentV1 = new Document(
    "AI and Machine Learning Best Practices",
    Map.of(
        "docId", "AIML-001",
        "version", "1.0",
        "lastUpdated", "2024-01-01"
    )
);

// 将 v1 添加到向量存储
vectorStore.add(List.of(documentV1));

// 创建同一文档的更新版本（v2）
Document documentV2 = new Document(
    "AI and Machine Learning Best Practices - Updated",
    Map.of(
        "docId", "AIML-001",
        "version", "2.0",
        "lastUpdated", "2024-02-01"
    )
);

// 首先，使用过滤表达式删除旧版本
Filter.Expression deleteOldVersion = new Filter.Expression(
    Filter.ExpressionType.AND,
    Arrays.asList(
        new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("docId"),
            new Filter.Value("AIML-001")
        ),
        new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("version"),
            new Filter.Value("1.0")
        )
    )
);
vectorStore.delete(deleteOldVersion);

// 添加新版本
vectorStore.add(List.of(documentV2));

// 验证只存在 v2
SearchRequest request = SearchRequest.builder()
    .query("AI and Machine Learning")
    .filterExpression("docId == 'AIML-001'")
    .build();
List<Document> results = vectorStore.similaritySearch(request);
// results 将只包含文档的 v2 版本
```

你也可以使用字符串过滤表达式完成相同的操作：

示例用法

```java
// 使用字符串过滤器删除旧版本
vectorStore.delete("docId == 'AIML-001' AND version == '1.0'");

// 添加新版本
vectorStore.add(List.of(documentV2));
```

### 删除文档时的性能考虑

- 当你确切知道要删除哪些文档时，通过 ID 列表删除通常更快。
- 基于过滤器的删除可能需要扫描索引以查找匹配的文档；但是，这是向量存储实现特定的。
- 大型删除操作应该分批进行，以避免系统过载。
- 考虑在基于文档属性删除时使用过滤表达式，而不是先收集 ID。
