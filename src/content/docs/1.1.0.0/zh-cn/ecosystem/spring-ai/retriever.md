---
title: 文档检索 (Document Retriever)
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba文档检索"
---

## 核心概念
文档检索（`DocumentRetriever`）是一种信息检索技术，旨在从大量未结构化或半结构化文档中快速找到与特定查询相关的文档或信息。文档检索通常以在线(online)方式运行。

`DocumentRetriever`通常基于向量搜索。它将用户的查询问题(query)转化为Embeddings后，在存储文档中进行相似性搜索，返回相关的片段。片段的用途之一是作为提示词(prompt)的一部分，发送给大模型(LLM)汇总处理后，作为答案呈现给用户。

`DocumentRetriever API`提供了简单、灵活的方式，供开发者使用自定义的检索系统。

## API介绍
本节介绍DocumentRetriever的接口和类。
### DocumentRetriever
```java
public interface DocumentRetriever extends Function<String, List<Document>> {
    List<Document> retrieve(String query);

    default List<Document> apply(String query) {
        return this.retrieve(query);
    }
}
```
DocumentRetriever API简单地将用户的查询作为输入，返回文档片段(`Document`)的列表。

通过`retrieve`方法，用户可以执行自定义的检索步骤。

#### Document
`Document`表示一个文档片段，它包含一个文本内容，以及一个或多个元数据。
```java
@JsonIgnoreProperties({"contentFormatter"})
public class Document implements MediaContent {
    public static final ContentFormatter DEFAULT_CONTENT_FORMATTER = DefaultContentFormatter.defaultConfig();
    public static final String EMPTY_TEXT = "";
    private final String id;
    private Map<String, Object> metadata;
    private final String content;
    private final Collection<Media> media;
    @JsonProperty(
            index = 100
    )
    private float[] embedding;
    @JsonIgnore
    private ContentFormatter contentFormatter;

    @JsonCreator(
            mode = Mode.PROPERTIES
    )
    // other methods omitted
}
```
## 示例用法
Spring AI Alibaba已经集成了`阿里云百炼平台`，接下来介绍基于阿里云百炼平台调用 DocumentRetriever API。

### 准备工作
由于百炼平台仅支持云端检索，因此在开始之前，参考如下链接获取API-KEY：[获取API-KEY](https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key)。
然后，在项目环境中设置API-KEY，有两种方式：

- 方式一：设置`configuration properties：spring.ai.dashscope.api-key` 为上述API-KEY。
- 方式二：设置环境变量`export SPRING_AI_DASHSCOPE_API_KEY=<YOUR API  KEY>`

### Auto-configuration
Spring AI 为 DashScopeDocumentRetriever 提供了 Spring Boot 的自动配置。要启用此功能，请将以下依赖项添加到您项目的 Maven`pom.xml`文件中：
```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>${version}</version>
</dependency>
```
或者添加到您的Gradle`build.gradle`文件中：
```gradle
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter'
}
```
#### Retriever Properties
前缀`spring.ai.dashscope`是用于配置连接至 DashScope 的属性前缀。

| Property                       | Action          | Default |
|:-------------------------------|:----------------|---------|
| `spring.ai.dashscope.api-key`  | 来自百炼平台的API KEY  | -       |


```tips
所有以 spring.ai.dashscope 开头的属性都可以在构造DashScopeDocumentRetriever时传入Runtime Options来覆盖。
```

### Runtime Options
`DashScopeDocumentRetrieverOptions`提供了DashScopeDocumentRetriever的配置信息，它通过构建器创建选项。

在构造`DashScopeDocumentRetriever`时，通过将一个`DashScopeDocumentRetrieverOptions`实例传入，已完成配置。

例如，使用指定的知识库：
```java
DocumentRetriever retriever = new DashScopeDocumentRetriever(dashscopeApi,
        DashScopeDocumentRetrieverOptions.builder()
                .withIndexName("spring-ai知识库")
                .build());
```
### 示例代码
该示例将创建一个`DashScopeDocumentRetriever`实例，在指定的知识库上执行检索操作。以下是简单的`@Controller`类的示例，它使用了该 DashScopeDocumentRetriever 实例。
```properties
spring.ai.dashscope.api-key=YOUR_API_KEY
```
```java
@RestController
public class RetrieverController {

    private final DocumentRetriever documentRetriever;

    @Autowired
    public RetrieverController(DocumentRetriever documentRetriever) {
        this.documentRetriever = documentRetriever;
    }

    @GetMapping("/ai/retrieve")
    public List<Document> retrieve(@RequestParam(value = "message", defaultValue = "What's spring ai") String message) {
        return this.documentRetriever.retrieve(message);
    }
}
```

### Manual Configuration
如果您不希望使用 Spring Boot 的 Auto-configuration，可以在应用程序中手动配置`DashScopeDocumentRetriever`。为此，请将`spring.ai.dashscope`依赖项添加到您项目的 Maven`pom.xml`文件中：
```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-core</artifactId>
</dependency>
```

或者添加到您的Gradle`build.gradle`文件中：
```gradle
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-core'
}
```
```note
spring-ai-dashcope 依赖项还提供了对 DashScopeChatModel 的访问。有关 DashScopeChatModel 的更多信息，请参考 DashScope Chat Client部分。
```

接下来，创建一个`DocumentRetriever`实例，并使用它检索文档片段：
```java
var dashScopeApi = new DashScopeApi(System.getenv("DASHSCOPE_API_KEY"));
DocumentRetriever retriever = new DashScopeDocumentRetriever(dashScopeApi,
        DashScopeDocumentRetrieverOptions.builder()
                .withIndexName("spring-ai知识库")
                .build());

List<Document> documentList = retriever.retrieve("What's spring ai");
```
