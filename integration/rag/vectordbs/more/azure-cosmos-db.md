# Azure Cosmos DB

本节将指导您设置 `CosmosDBVectorStore` 来存储文档嵌入并执行相似性搜索。

## What is Azure Cosmos DB?

[Azure Cosmos DB](https://azure.microsoft.com/en-us/services/cosmos-db/) 是 Microsoft 的全球分布式云原生数据库服务，专为任务关键型应用程序而设计。
它提供高可用性、低延迟以及水平扩展的能力，以满足现代应用程序的需求。
它从零开始构建，以全球分布、细粒度多租户和水平可扩展性为核心。
它是 Azure 中的基础服务，被 Microsoft 的大多数任务关键型应用程序在全球范围内使用，包括 Teams、Skype、Xbox Live、Office 365、Bing、Azure Active Directory、Azure Portal、Microsoft Store 等。
它还被数千个外部客户使用，包括 OpenAI 用于 ChatGPT 和其他任务关键型 AI 应用程序，这些应用程序需要弹性扩展、开箱即用的全球分布以及全球范围内的低延迟和高可用性。

## What is DiskANN?

DiskANN（基于磁盘的近似最近邻搜索）是 Azure Cosmos DB 中使用的一项创新技术，用于增强向量搜索的性能。
它通过对存储在 Cosmos DB 中的嵌入进行索引，实现跨高维数据的高效和可扩展的相似性搜索。

DiskANN 提供以下好处：

* **效率**：通过利用基于磁盘的结构，DiskANN 与传统方法相比，显著减少了查找最近邻所需的时间。
* **可扩展性**：它可以处理超过内存容量的大型数据集，使其适用于各种应用程序，包括机器学习和 AI 驱动的解决方案。
* **低延迟**：DiskANN 最小化搜索操作期间的延迟，确保应用程序即使在大数据量的情况下也能快速检索结果。

在 Spring AI for Azure Cosmos DB 的上下文中，向量搜索将创建并利用 DiskANN 索引，以确保相似性查询的最佳性能。

## Setting up Azure Cosmos DB Vector Store with Auto Configuration

以下代码演示如何使用 auto-configuration 设置 `CosmosDBVectorStore`：

```java
package com.example.demo;

import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Lazy;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootApplication
@EnableAutoConfiguration
public class DemoApplication implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoApplication.class);

    @Lazy
    @Autowired
    private VectorStore vectorStore;

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        Document document1 = new Document(UUID.randomUUID().toString(), "Sample content1", Map.of("key1", "value1"));
        Document document2 = new Document(UUID.randomUUID().toString(), "Sample content2", Map.of("key2", "value2"));
		this.vectorStore.add(List.of(document1, document2));
        List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Sample content").topK(1).build());

        log.info("Search results: {}", results);

        // 从向量存储中删除文档
		this.vectorStore.delete(List.of(document1.getId(), document2.getId()));
    }

    @Bean
    public ObservationRegistry observationRegistry() {
        return ObservationRegistry.create();
    }
}
```

## Auto Configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

将以下依赖项添加到您的 Maven 项目：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-azure-cosmos-db</artifactId>
</dependency>
```

## Configuration Properties

以下配置属性可用于 Cosmos DB 向量存储：

| Property | Description |
|----------|-------------|
| spring.ai.vectorstore.cosmosdb.databaseName | 要使用的 Cosmos DB 数据库名称。 |
| spring.ai.vectorstore.cosmosdb.containerName | 要使用的 Cosmos DB 容器名称。 |
| spring.ai.vectorstore.cosmosdb.partitionKeyPath | 分区键的路径。 |
| spring.ai.vectorstore.cosmosdb.metadataFields | 元数据字段的逗号分隔列表。 |
| spring.ai.vectorstore.cosmosdb.vectorStoreThroughput | 向量存储的吞吐量。 |
| spring.ai.vectorstore.cosmosdb.vectorDimensions | 向量的维度数。 |
| spring.ai.vectorstore.cosmosdb.endpoint | Cosmos DB 的端点。 |
| spring.ai.vectorstore.cosmosdb.key | Cosmos DB 的密钥（如果不存在密钥，将使用 [DefaultAzureCredential](https://learn.microsoft.com/azure/developer/java/sdk/authentication/credential-chains#defaultazurecredential-overview)）。 |

## Complex Searches with Filters

您可以在 Cosmos DB 向量存储中使用过滤器执行更复杂的搜索。
下面是一个演示如何在搜索查询中使用过滤器的示例。

```java
Map<String, Object> metadata1 = new HashMap<>();
metadata1.put("country", "UK");
metadata1.put("year", 2021);
metadata1.put("city", "London");

Map<String, Object> metadata2 = new HashMap<>();
metadata2.put("country", "NL");
metadata2.put("year", 2022);
metadata2.put("city", "Amsterdam");

Document document1 = new Document("1", "A document about the UK", this.metadata1);
Document document2 = new Document("2", "A document about the Netherlands", this.metadata2);

vectorStore.add(List.of(document1, document2));

FilterExpressionBuilder builder = new FilterExpressionBuilder();
List<Document> results = vectorStore.similaritySearch(SearchRequest.builder().query("The World")
    .topK(10)
    .filterExpression((this.builder.in("country", "UK", "NL")).build()).build());
```

## Setting up Azure Cosmos DB Vector Store without Auto Configuration

以下代码演示如何在不依赖 auto-configuration 的情况下设置 `CosmosDBVectorStore`。建议使用 [DefaultAzureCredential](https://learn.microsoft.com/azure/developer/java/sdk/authentication/credential-chains#defaultazurecredential-overview) 对 Azure Cosmos DB 进行身份验证。

```java
@Bean
public VectorStore vectorStore(ObservationRegistry observationRegistry) {
    // 创建 Cosmos DB 客户端
    CosmosAsyncClient cosmosClient = new CosmosClientBuilder()
            .endpoint(System.getenv("COSMOSDB_AI_ENDPOINT"))
            .credential(new DefaultAzureCredentialBuilder().build())
            .userAgentSuffix("SpringAI-CDBNoSQL-VectorStore")
            .gatewayMode()
            .buildAsyncClient();

    // 创建并配置向量存储
    return CosmosDBVectorStore.builder(cosmosClient, embeddingModel)
            .databaseName("test-database")
            .containerName("test-container")
            // 配置用于过滤的元数据字段
            .metadataFields(List.of("country", "year", "city"))
            // 设置分区键路径（可选）
            .partitionKeyPath("/id")
            // 配置性能设置
            .vectorStoreThroughput(1000)
            .vectorDimensions(1536)  // 匹配您的嵌入模型的维度
            // 添加自定义批处理策略（可选）
            .batchingStrategy(new TokenCountBatchingStrategy())
            // 添加用于指标的观察注册表
            .observationRegistry(observationRegistry)
            .build();
}

@Bean
public EmbeddingModel embeddingModel() {
    return new TransformersEmbeddingModel();
}
```

此配置显示了所有可用的构建器选项：

* `databaseName`：您的 Cosmos DB 数据库名称
* `containerName`：数据库中的容器名称
* `partitionKeyPath`：分区键的路径（例如，"/id"）
* `metadataFields`：将用于过滤的元数据字段列表
* `vectorStoreThroughput`：向量存储容器的吞吐量（RU/s）
* `vectorDimensions`：向量的维度数（应与您的嵌入模型匹配）
* `batchingStrategy`：批处理文档操作的策略（可选）

## Manual Dependency Setup

在您的 Maven 项目中添加以下依赖项：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-azure-cosmos-db-store</artifactId>
</dependency>
```

## Accessing the Native Client

Azure Cosmos DB Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Azure Cosmos DB 客户端（`CosmosClient`）的访问：

```java
CosmosDBVectorStore vectorStore = context.getBean(CosmosDBVectorStore.class);
Optional<CosmosClient> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    CosmosClient client = nativeClient.get();
    // 使用原生客户端进行 Azure Cosmos DB 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Azure Cosmos DB 特定功能和操作。

