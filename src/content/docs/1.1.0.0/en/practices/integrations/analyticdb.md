---
title: spring-ai-alibaba-analyticdb-store Usage Guide
keywords: [Spring Ai Alibaba, VectorStore, Analyticdb]
description: "Spring Ai Alibaba adaptation for Analyticdb vector database"
---

### 1. Add Maven Dependency
```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-analyticdb-store</artifactId>
    <version>${spring.ai.alibaba.version}</version>
</dependency>
```

### 2. Configure Connection Parameters
Configure AnalyticDB connection information in application.properties:
```properties
# Basic connection configuration
spring.ai.vectorstore.analytic.accessKeyId=your-access-key-id
spring.ai.vectorstore.analytic.accessKeySecret=your-access-key-secret
spring.ai.vectorstore.analytic.regionId=cn-beijing
spring.ai.vectorstore.analytic.dbInstanceId=your-db-instance-id

# Account permission configuration
spring.ai.vectorstore.analytic.managerAccount=admin-account
spring.ai.vectorstore.analytic.managerAccountPassword=admin-password
spring.ai.vectorstore.analytic.namespace=your-namespace
spring.ai.vectorstore.analytic.namespacePassword=namespace-password

# Collection configuration
spring.ai.vectorstore.analytic.collectName=doc_collection
spring.ai.vectorstore.analytic.metrics=cosine  # Similarity calculation method

# Search parameters
spring.ai.vectorstore.analytic.defaultTopK=10
spring.ai.vectorstore.analytic.defaultSimilarityThreshold=0.8
```

### 3. Automatic Configuration Usage
Spring Boot will automatically configure the VectorStore instance:
```java
@Autowired
private VectorStore analyticDbVectorStore;
```

### 4. Core Operation Examples
#### 4.1 Adding Documents
```java
List<Document> documents = List.of(
    new Document("1", "Spring AI core content", Map.of("category", "framework")),
    new Document("2", "Machine learning algorithm analysis", Map.of("category", "algorithm"))
);

analyticDbVectorStore.add(documents);
```

#### 4.2 Similarity Search
```java
SearchRequest request = SearchRequest.builder()
    .query("artificial intelligence framework")
    .topK(5)
    .similarityThreshold(0.75)
    .build();

List<Document> results = analyticDbVectorStore.similaritySearch(request);
```

#### 4.3 Deleting Documents
```java
// Delete by ID
analyticDbVectorStore.delete(List.of("doc1", "doc2"));

// Delete by filter condition
Filter.Expression filter = Filter.expression("category == 'obsolete'");
analyticDbVectorStore.delete(filter);
```

### 5. Advanced Configuration
#### 5.1 Custom Filter Conditions
Support for complex filter expressions:
```java
Filter.Expression complexFilter = Filter.and(
    Filter.expression("author == 'John'"), 
    Filter.expression("version >= 2.0")
);

SearchRequest request = SearchRequest.builder()
    .query("distributed systems")
    .filter(complexFilter)
    .build();
```

#### 5.2 Monitoring Integration
Default integration with Micrometer observation:
```java
@Bean
public ObservationRegistry observationRegistry() {
    return TestObservationRegistry.create();
}
```

### 6. Configuration Options Description
| Configuration Item | Description | Default Value |
|--------|------|--------|
| collectName | Collection name | Required |
| metrics | Similarity calculation method (cosine/l2) | cosine |
| defaultTopK | Default number of results returned | 4 |
| defaultSimilarityThreshold | Default similarity threshold | 0.0 |
| readTimeout | Request timeout (ms) | 60000 |

### Notes
1. Ensure network access to AnalyticDB instance
2. Collection dimensions need to be consistent with the Embedding model output dimensions
3. HTTPS is recommended for production environments
4. BatchingStrategy is recommended for optimizing performance in batch operations
