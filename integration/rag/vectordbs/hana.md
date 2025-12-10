# SAP HANA Cloud

## Prerequisites

* 您需要一个 SAP HANA Cloud vector engine 账户 - 请参阅 [SAP HANA Cloud vector engine - provision a trial account](api/vectordbs/hanadb-provision-a-trial-account) 指南以创建试用账户。
* 如果需要，为 [EmbeddingModel](api/embeddings#available-implementations) 提供一个 API key，用于生成向量存储存储的嵌入。

## Auto-configuration

Spring AI 不为 SAP Hana 向量存储提供专用模块。
用户需要在应用程序中使用 Spring AI 中 SAP Hana 向量存储的标准向量存储模块 `spring-ai-hanadb-store` 提供自己的配置。

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

请查看 [HanaCloudVectorStore Properties](#hanacloudvectorstore-properties) 列表以了解向量存储的默认值和配置选项。

> **提示：** 请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将 Maven Central 和/或 Snapshot Repositories 添加到您的构建文件中。

此外，您需要一个配置的 `EmbeddingModel` bean。请参阅 [EmbeddingModel](api/embeddings#available-implementations) 部分了解更多信息。

## HanaCloudVectorStore Properties {#hanacloudvectorstore-properties}

您可以在 Spring Boot 配置中使用以下属性来自定义 SAP Hana 向量存储。
它使用 `spring.datasource.*` 属性来配置 Hana 数据源，使用 `spring.ai.vectorstore.hanadb.*` 属性来配置 Hana 向量存储。

| Property | Description | Default value |
|----------|-------------|---------------|
| `spring.datasource.driver-class-name` | 驱动程序类名 | com.sap.db.jdbc.Driver |
| `spring.datasource.url` | Hana 数据源 URL | - |
| `spring.datasource.username` | Hana 数据源用户名 | - |
| `spring.datasource.password` | Hana 数据源密码 | - |
| `spring.ai.vectorstore.hanadb.top-k` | TODO | - |
| `spring.ai.vectorstore.hanadb.table-name` | TODO | - |
| `spring.ai.vectorstore.hanadb.initialize-schema` | 是否初始化所需的 schema | `false` |

## Build a Sample RAG application

展示如何设置一个使用 SAP Hana Cloud 作为向量数据库并利用 OpenAI 实现 RAG 模式的项目

* 在 SAP Hana DB 中创建一个表 `CRICKET_WORLD_CUP`：

```sql
CREATE TABLE CRICKET_WORLD_CUP (
    _ID VARCHAR2(255) PRIMARY KEY,
    CONTENT CLOB,
    EMBEDDING REAL_VECTOR(1536)
)
```

* 在您的 `pom.xml` 中添加以下依赖项

您可以将属性 `spring-ai-version` 设置为 `<spring-ai-version>1.0.0-SNAPSHOT</spring-ai-version>`：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai-version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pdf-document-reader</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-hana</artifactId>
</dependency>

<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <version>1.18.30</version>
    <scope>provided</scope>
</dependency>
```

* 在 `application.properties` 文件中添加以下属性：

```yaml
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.embedding.options.model=text-embedding-ada-002

spring.datasource.driver-class-name=com.sap.db.jdbc.Driver
spring.datasource.url=${HANA_DATASOURCE_URL}
spring.datasource.username=${HANA_DATASOURCE_USERNAME}
spring.datasource.password=${HANA_DATASOURCE_PASSWORD}

spring.ai.vectorstore.hanadb.tableName=CRICKET_WORLD_CUP
spring.ai.vectorstore.hanadb.topK=3
```

### Create an `Entity` class named `CricketWorldCup` that extends from `HanaVectorEntity`:

```java
package com.interviewpedia.spring.ai.hana;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.jackson.Jacksonized;
import org.springframework.ai.vectorstore.hanadb.HanaVectorEntity;

@Entity
@Table(name = "CRICKET_WORLD_CUP")
@Data
@Jacksonized
@NoArgsConstructor
public class CricketWorldCup extends HanaVectorEntity {
    @Column(name = "content")
    private String content;
}
```

* 创建一个实现 `HanaVectorRepository` 接口的 `Repository`，名为 `CricketWorldCupRepository`：

```java
package com.interviewpedia.spring.ai.hana;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.ai.vectorstore.hanadb.HanaVectorRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CricketWorldCupRepository implements HanaVectorRepository<CricketWorldCup> {
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void save(String tableName, String id, String embedding, String content) {
        String sql = String.format("""
                INSERT INTO %s (_ID, EMBEDDING, CONTENT)
                VALUES(:_id, TO_REAL_VECTOR(:embedding), :content)
                """, tableName);

		this.entityManager.createNativeQuery(sql)
                .setParameter("_id", id)
                .setParameter("embedding", embedding)
                .setParameter("content", content)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int deleteEmbeddingsById(String tableName, List<String> idList) {
        String sql = String.format("""
                DELETE FROM %s WHERE _ID IN (:ids)
                """, tableName);

        return this.entityManager.createNativeQuery(sql)
                .setParameter("ids", idList)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int deleteAllEmbeddings(String tableName) {
        String sql = String.format("""
                DELETE FROM %s
                """, tableName);

        return this.entityManager.createNativeQuery(sql).executeUpdate();
    }

    @Override
    public List<CricketWorldCup> cosineSimilaritySearch(String tableName, int topK, String queryEmbedding) {
        String sql = String.format("""
                SELECT TOP :topK * FROM %s
                ORDER BY COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR(:queryEmbedding)) DESC
                """, tableName);

        return this.entityManager.createNativeQuery(sql, CricketWorldCup.class)
                .setParameter("topK", topK)
                .setParameter("queryEmbedding", queryEmbedding)
                .getResultList();
    }
}
```

* 现在，创建一个 REST Controller 类 `CricketWorldCupHanaController`，并将 `ChatModel` 和 `VectorStore` 作为依赖项自动装配
在此控制器类中，创建以下 REST 端点：

    - `/ai/hana-vector-store/cricket-world-cup/purge-embeddings` - 从 Vector Store 中清除所有嵌入
    - `/ai/hana-vector-store/cricket-world-cup/upload` - 上传 Cricket_World_Cup.pdf，以便将其数据作为嵌入存储在 SAP Hana Cloud Vector DB 中
    - `/ai/hana-vector-store/cricket-world-cup` - 使用 [SAP Hana DB 中的 Cosine_Similarity](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide/vectors-vector-embeddings-and-metrics) 实现 `RAG`

```java
package com.interviewpedia.spring.ai.hana;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.hanadb.HanaCloudVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@RestController
@Slf4j
public class CricketWorldCupHanaController {
    private final VectorStore hanaCloudVectorStore;
    private final ChatModel chatModel;

    @Autowired
    public CricketWorldCupHanaController(ChatModel chatModel, VectorStore hanaCloudVectorStore) {
        this.chatModel = chatModel;
        this.hanaCloudVectorStore = hanaCloudVectorStore;
    }

    @PostMapping("/ai/hana-vector-store/cricket-world-cup/purge-embeddings")
    public ResponseEntity<String> purgeEmbeddings() {
        int deleteCount = ((HanaCloudVectorStore) this.hanaCloudVectorStore).purgeEmbeddings();
        log.info("{} embeddings purged from CRICKET_WORLD_CUP table in Hana DB", deleteCount);
        return ResponseEntity.ok().body(String.format("%d embeddings purged from CRICKET_WORLD_CUP table in Hana DB", deleteCount));
    }

    @PostMapping("/ai/hana-vector-store/cricket-world-cup/upload")
    public ResponseEntity<String> handleFileUpload(@RequestParam("pdf") MultipartFile file) throws IOException {
        Resource pdf = file.getResource();
        Supplier<List<Document>> reader = new PagePdfDocumentReader(pdf);
        Function<List<Document>, List<Document>> splitter = new TokenTextSplitter();
        List<Document> documents = splitter.apply(reader.get());
        log.info("{} documents created from pdf file: {}", documents.size(), pdf.getFilename());
		this.hanaCloudVectorStore.accept(documents);
        return ResponseEntity.ok().body(String.format("%d documents created from pdf file: %s",
                documents.size(), pdf.getFilename()));
    }

    @GetMapping("/ai/hana-vector-store/cricket-world-cup")
    public Map<String, String> hanaVectorStoreSearch(@RequestParam(value = "message") String message) {
        var documents = this.hanaCloudVectorStore.similaritySearch(message);
        var inlined = documents.stream().map(Document::getText).collect(Collectors.joining(System.lineSeparator()));
        var similarDocsMessage = new SystemPromptTemplate("Based on the following: {documents}")
                .createMessage(Map.of("documents", inlined));

        var userMessage = new UserMessage(message);
        Prompt prompt = new Prompt(List.of(similarDocsMessage, userMessage));
        String generation = this.chatModel.call(prompt).getResult().getOutput().getContent();
        log.info("Generation: {}", generation);
        return Map.of("generation", generation);
    }
}
```

由于 HanaDB 向量存储支持不提供 autoconfiguration 模块，您还需要在应用程序中提供向量存储 bean，如下所示，作为示例。

```java
@Bean
public VectorStore hanaCloudVectorStore(CricketWorldCupRepository cricketWorldCupRepository,
        EmbeddingModel embeddingModel) {

    return HanaCloudVectorStore.builder(cricketWorldCupRepository, embeddingModel)
        .tableName("CRICKET_WORLD_CUP")
        .topK(1)
        .build();
}
```

* 使用来自 wikipedia 的 `contextual` pdf 文件

转到 [wikipedia](https://en.wikipedia.org/wiki/Cricket_World_Cup) 并[下载](https://en.wikipedia.org/w/index.php?title=Special:DownloadAsPdf&page=Cricket_World_Cup&action=show-download-screen) `Cricket World Cup` 页面作为 PDF 文件。

![wikipedia](hanadb/wikipedia.png)

使用我们在上一步中创建的文件上传 REST 端点上传此 PDF 文件。

