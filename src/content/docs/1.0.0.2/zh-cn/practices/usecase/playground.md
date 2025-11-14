---
title: Playground
keywords: [Spring AI Alibaba, Spring AI Alibaba Playground]
description: "Spring AI Alibaba Playground"
---

Spring AI Alibaba Playground 是 Spring AI Alibaba 社区以 Spring AI Alibaba 和 Spring AI 为框架搭建的 AI 应用。包含完善的前端 UI + 后端实现，具备对话，图片生成，工具调用，RAG，MCP 等众多 AI 相关功能。在 playground 的基础之上，您可以快速复刻出一个属于自己的 AI 应用。其中工具调用，MCP 集成，聊天模型切换等功能亦可为您搭建自己的 AI 应用提供参考。

Playground 代码地址：https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground

项目首页预览：

![image-20250607164742879](/img/user/ai/practices/playground/image-20250607164742879.png)

本篇文章中，内容较多。涉及运行，项目介绍，配置介绍等。分为三个部分介绍 Spring AI Alibaba Playground，您可以根据自己的需要跳转到不同章节浏览。

---

## 目录

1. [本地运行](#local_run)
2. [配置介绍](#config)
3. [项目介绍](#project)

---

## <span id="local_run">1. 本地运行</span>

> 本章节中，将主要介绍如何在本地启动 Playground 项目。

### 1. 1 下载源码

Playground 代码地址：https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground

playground 项目位于 spring-ai-alibaba-example 仓库下，被设计为一个独立的项目，不依赖于 spring-ai-alibaba-example pom 管理。这意味着您需要使用 IDEA 单独打开 playground 项目目录。而不是在 example 根目录下直接启动。

> PS: 如果直接启动需要配置 IDEA 的运行工作目录，请参考 README 描述：https://github.com/springaialibaba/spring-ai-alibaba-examples/blob/main/spring-ai-alibaba-playground/README.md

### 1.2 配置变更

#### 1.2.1 MCP 配置变更

因为 playground 项目引入了 mcp stdio 的方式来演示 Spring AI 如何接入 MCP 服务。因此当您的启动环境为 windows 时，需要安装并配置启动 MCP Server 需要的环境。

以下面的 MCP Server json 配置文件为例：

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": [
                "/c",
                "npx",
                "-y",
                "@modelcontextprotocol/server-github"
            ],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token"
            }
        }
    }
}
```

您需要安装 NPX 工具，如果在 Windows 系统启动，需要变更 command 为 `npx.cmd`。否则会启动失败。

#### 1.2.2 数据库文件变更

Playground 使用 SQLite 作为 Chat Memory 的存储数据库。在项目启动时，会自动在 `src/main/resources` 目录下创建 saa.db 的数据库文件，如果启动时没有自动创建，出现启动失败错误时。您需要手动创建此文件。

#### 1.2.3 前端打包

playground 前端项目采用打包编译到 jar 包中一起启动方式运行，因此在启动后端时，需要运行 `mvn clean package`。确保前端项目正确打包编译，您可以在 `target/classes/static` 路径下看到前端资源文件。

#### 1.2.4 可观测集成

Playground 项目中集成了 Spring AI 的可观测功能，如果您不想观察 AI 应用运行中的一些指标数据，您可以忽略此步骤。

> PS: 因为 AI 大模型应用的观测数据中包含用户的输入等信息，在生产部署时，请**确保敏感信息选项关闭**。

在 spring-ai-alibaba-example 仓库 docker-compose 目录准备了 AI 应用常用的工具 docker-compose 启动文件，您可以参考启动 [zipkin](https://github.com/springaialibaba/spring-ai-alibaba-examples/blob/main/docker-compose/zipkin/docker-compose.yml)。

可观测实现参考：https://java2ai.com/blog/spring-ai-alibaba-observability-arms/?spm=5176.29160081.0.0.2856aa5cenvkmu

#### 1.2.5 apiKey 配置

Playground 项目集成了 RAG，向量数据库和 Function Call 等功能，因此在启动之初您应该配置对应的 ak。

> PS: playgrond 中所有的 key 都通过 env 的方式注入，如果配置了 env 之后，项目仍然获取不到 ak，请**重启 IDEA**

1. DashScope 大模型 ak：AI 应用使用
2. 阿里云 IQS 信息检索服务 ak：模块化 RAG 示例，web search 使用
3. 阿里云 Analytic 项目数据库 ak：RAG 使用；
4. 百度翻译和百度地图 ak：Function Call 调用使用；
5. Github 个人 secret：MCP Server 演示使用。

关于 AK 的获取方式自行搜索，这里不在过多赘述。

### 1.3 启动并访问

如果上面的配置步骤全部完成，在 playground 项目启动之后，在浏览器输入 `http://localhost:8080` 您将会看到文章开始时的首页页面。

![image-20250607171739807](/img/user/ai/practices/playground/\image-20250607171739807.png)

> PS: 如果体验对应的 Function Call 或者 MCP 功能时，**请确保配置了对应的服务 AK 且 AK 有效**。
>
> **此项目仅作为演示使用，一些功能初具形状，尚不完善。欢迎贡献代码并完善项目！🚀**

---

## <span id="config">2. 配置介绍</span>

playground 项目作为一个较完善的 AI 应用项目，涉及较多的配置文件，在此章节中将一一说明。

### 2.1 resources 配置

resource 目录配置文件如下：

```text
resources
├── application-dev.yml
├── application-prod.yml
├── application.yml
├── banner.txt
├── db
├── logback-spring.xml
├── mcp-config.yml
├── mcp-libs
├── models.yaml
└── rag
```

1. db 为 saa.db 目录，主要为 playground 的 chat memory 提供存储支持；
2. mcp-libs：MCP Stdio 的服务 jar 目录；
3. rag：RAG 功能的知识库文档目录，在项目启动时，将自动向量化文档并存入向量数据库；
4. mcp-config.yaml：palyground 项目增强的 mcp-server 配置；
5. application-*.yml：项目启动配置。

#### 2.1.1 MCP Config 增强

解决的问题：在 playground 中使用 MCP Stdio 的方式来集成和演示 MCP 功能，在涉及到本地服务时，例如以下配置：

```json
{
    "mcpServers": {
        "weather": {
            "command": "java",
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-Dlogging.pattern.console=",
                "-jar",
                "D:\\open_sources\\spring-ai-alibaba-examples\\spring-ai-alibaba-mcp-example\\spring-ai-alibaba-mcp-build-example\\mcp-stdio-server-example\\target\\mcp-stdio-server-example-1.0.0.jar"
            ],
            "env": {}
        }
    }
}
```

在二进制文件配置时，必须要求使用绝对路径配置且 json 配置较难理解。因此 playground 在配置做了增强，将 json 转为了语义清晰的 yml 方式定义。细节请参考 [MCP](#mcp-config)

### 2.2 pom.xml 配置

此章节部分将主要介绍核心依赖，其他依赖请参考：https://github.com/springaialibaba/spring-ai-alibaba-examples/blob/main/spring-ai-alibaba-playground/pom.xml

```xml
<dependencies>

    <!-- Chat Memory 功能实现时需要此依赖项 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- playground 文本总结功能依赖 tika 对输入的各类文本进行解析 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-tika-document-reader</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <!-- Spring AI MCP client 相关依赖-->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-client</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-mcp-client</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

	<!-- Spring AI OpenAI Starter -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <!-- Spring AI RAG markdown 文本读入解析 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-markdown-document-reader</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <!-- Spring AI 向量数据库 Advisors -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-advisors-vector-store</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <!-- Spring AI Alibaba DashScope starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>

    <!-- Spring AI Alibaba Memory 实现 -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-memory</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>

    <!-- Spring AI Alibaba analyticdb 向量数据库集成 -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-store-analyticdb</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>

    <!-- DB，为 ChatMemory 和 playground 提供存储支持 -->
    <dependency>
        <groupId>org.xerial</groupId>
        <artifactId>sqlite-jdbc</artifactId>
        <version>${sqlite-jdbc.version}</version>
    </dependency>

    <dependency>
        <groupId>org.hibernate.orm</groupId>
        <artifactId>hibernate-community-dialects</artifactId>
        <version>${hibernate.version}</version>
    </dependency>

    <!-- Playground 可观测集成 -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-brave</artifactId>
        <version>${micrometr.version}</version>
        <exclusions>
            <exclusion>
                <artifactId>slf4j-api</artifactId>
                <groupId>org.slf4j</groupId>
            </exclusion>
        </exclusions>
    </dependency>
    
</dependencies>

<!-- Spring AI 和 Spring AI Alibaba 依赖管理 -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-bom</artifactId>
            <version>${spring-ai-alibaba.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

---

## <span id="project">3. 项目介绍</span>

在 playground 中集成了较多功能，RAG，MCP，Function Call 等。此章节中将主要对 RAG Web Search，MCP 调用，Function Call 拆分介绍。以便能够基于此 playground 搭建符合自己需求的 AI 应用。

### 3.1 RAG 实现

RAG 仍然是当今最流行的 AI 应用结合私有知识库的方式。通过 RAG 能够构建问答机器人，专业领域助手等。

在 playground 项目中，使用的向量数据库是 analyticdb 和基于内存的 SimpleVectorStore。**您可以替换为任意您想使用的向量数据库**。

#### 3.1.1 向量数据库初始化

初始化配置代码位于：com/alibaba/cloud/ai/application/config/rag

```java
@Bean
CommandLineRunner ingestTermOfServiceToVectorStore(VectorStoreDelegate vectorStoreDelegate) {
    return args -> {
       String type = System.getenv("VECTOR_STORE_TYPE");
       VectorStoreInitializer initializer = new VectorStoreInitializer();
       initializer.init(vectorStoreDelegate.getVectorStore(type));
    };
}
```

通过 VECTOR_STORE_TYPE 的方式来选择使用那种类型的向量数据库，VectorStoreDelegate 代码如下：其作用是通过 type 的值返回向量数据库的实例 bean。

> PS：在这里您可以替换为您所使用的向量数据库来构建 RAG 功能。

```java
public class VectorStoreDelegate {

    private VectorStore simpleVectorStore;

    private VectorStore analyticdbVectorStore;

    public VectorStoreDelegate(VectorStore simpleVectorStore, VectorStore analyticdbVectorStore) {
       this.simpleVectorStore = simpleVectorStore;
       this.analyticdbVectorStore = analyticdbVectorStore;
    }

    public VectorStore getVectorStore(String vectorStoreType) {

       if (Objects.equals(vectorStoreType, "analyticdb") && analyticdbVectorStore != null) {
          return analyticdbVectorStore;
       }

       return simpleVectorStore;
    }
}
```

#### 3.1.2 RAG 文档初始化

在 VectorStoreInitializer 中将 resources/rag 下的 md 文档向量化并加载到向量数据库中：

```java
public void init(VectorStore vectorStore) throws Exception {
    List<MarkdownDocumentReader> markdownDocumentReaderList = loadMarkdownDocuments();

    int size = 0;
    if (markdownDocumentReaderList.isEmpty()) {
        logger.warn("No markdown documents found in the directory.");
        return;
    }

    logger.debug("Start to load markdown documents into vector store......");
    for (MarkdownDocumentReader markdownDocumentReader : markdownDocumentReaderList) {
        List<Document> documents = new TokenTextSplitter(2000, 1024, 10, 10000, true).transform(markdownDocumentReader.get());
        size += documents.size();

        // 拆分 documents 列表为最大 25 个元素的子列表
        for (int i = 0; i < documents.size(); i += 25) {
            int end = Math.min(i + 25, documents.size());
            List<Document> subList = documents.subList(i, end);
            vectorStore.add(subList);
        }
    }
    logger.debug("Load markdown documents into vector store successfully. Load {} documents.", size);
}
```

#### 3.1.3 构建 Service 

在业务代码中注入向量数据库 bean，即可完成 RAG 功能的实现。

```java
@Service
public class SAARAGService {

    private final ChatClient client;

    private final VectorStoreDelegate vectorStoreDelegate;

    private String vectorStoreType;

    public SAARAGService(
          VectorStoreDelegate vectorStoreDelegate,
          SimpleLoggerAdvisor simpleLoggerAdvisor,
          MessageChatMemoryAdvisor messageChatMemoryAdvisor,
          @Qualifier("dashscopeChatModel") ChatModel chatModel,
          @Qualifier("systemPromptTemplate") PromptTemplate systemPromptTemplate
    ) {
       this.vectorStoreType = System.getenv("VECTOR_STORE_TYPE");
       this.vectorStoreDelegate = vectorStoreDelegate;
       this.client = ChatClient.builder(chatModel)
             .defaultSystem(
                   systemPromptTemplate.getTemplate()
             ).defaultAdvisors(
                   messageChatMemoryAdvisor,
                   simpleLoggerAdvisor
             ).build();
    }

    public Flux<String> ragChat(String chatId, String prompt) {

       return client.prompt()
             .user(prompt)
             .advisors(memoryAdvisor -> memoryAdvisor
                   .param(ChatMemory.CONVERSATION_ID, chatId)
             ).advisors(
                   QuestionAnswerAdvisor
                         .builder(vectorStoreDelegate.getVectorStore(vectorStoreType))
                         .searchRequest(
                               SearchRequest.builder()
                                     // TODO all documents retrieved from ADB are under 0.1
//                                   .similarityThreshold(0.6d)
                                     .topK(6)
                                     .build()
                         )
                         .build()
             ).stream()
             .content();
    }

}
```

RAG 实现文章参考：https://java2ai.com/blog/spring-ai-alibaba-rag-ollama/?spm=5176.29160081.0.0.2856aa5cenvkmu

### 3.2 Web Search  功能实现

在 Qwen 模型中，可以通过 `enable_search` 开启模型的联网搜索能力。在 playground 通过 Module RAG 的方式来集成联网搜索功能。

#### 3.2.1 Module RAG 介绍

<img src="https://java2ai.com/img/blog/module-rag/module-rag.png">

Spring AI 实现了模块化 RAG 架构，架构的灵感来自于论文“[模块化 RAG：将 RAG 系统转变为类似乐高的可重构框架](https://arxiv.org/abs/2407.21059)”中详述的模块化概念。将 RAG 分为三步：

**Pre-Retrieval**

> 增强和转换用户输入，使其更有效地执行检索任务，解决格式不正确的查询、query 语义不清晰、或不受支持的语言等。

1. QueryAugmenter 查询增强：使用附加的上下文数据信息增强用户 query，提供大模型回答问题时的必要上下文信息；
2. QueryTransformer 查询改写：因为用户的输入通常是片面的，关键信息较少，不便于大模型理解和回答问题。因此需要使用 prompt 调优手段或者大模型改写用户 query；
3. QueryExpander 查询扩展：将用户 query 扩展为多个语义不同的变体以获得不同视角，有助于检索额外的上下文信息并增加找到相关结果的机会。

**Retrieval**

> 负责查询向量存储等数据系统并检索和用户 query 相关性最高的 Document。

1. DocumentRetriever：检索器，根据 QueryExpander 使用不同的数据源进行检索，例如 搜索引擎、向量存储、数据库或知识图等；
2. DocumentJoiner：将从多个 query 和从多个数据源检索到的 Document 合并为一个 Document 集合；

**Post-Retrieval**

> 负责处理检索到的 Document 以获得最佳的输出结果，解决模型中的*中间丢失*和上下文长度限制等。
>
> **PS：Spring AI 在 1.0.0 中弃用了 DocumentRanker。您可以实现 DocumentPostProcessor 接口来实现此功能。Playground 待补充。**

**生成**

生成用户 Query 对应的大模型输出。

#### 3.2.2 数据来源

联网搜索，顾名思义。就是将网络上的数据通过实时搜索的方式获取到并交给大模型来获得最新得消息咨询。playground 项目中使用了阿里云的 IQS，信息检索服务作为联网搜索的数据源。您可以使用搜索引擎服务替换 IQS。

IIQS 搜索实现如下：其本质为请求服务接口或调用 SDK。

```java
public GenericSearchResult search(String query) {

    // String encodeQ = URLEncoder.encode(query, StandardCharsets.UTF_8);
    ResponseEntity<GenericSearchResult> resultResponseEntity = run(query);

    return genericSearchResult(resultResponseEntity);
}

private ResponseEntity<GenericSearchResult> run(String query) {

    return this.restClient.get()
        .uri(
        "/search/genericSearch?query={query}&timeRange={timeRange}",
        query,
        TIME_RANGE
    ).retrieve()
        .toEntity(GenericSearchResult.class);
}

}
```

#### 3.2.3 数据加工

在这一步中，将搜索引擎获取到的数据进行清洗并转为 Spring AI 的 Document 文档。

```java
public List<Document> getData(GenericSearchResult respData) throws URISyntaxException {

		List<Document> documents = new ArrayList<>();

		Map<String, Object> metadata = getQueryMetadata(respData);

		for (ScorePageItem pageItem : respData.getPageItems()) {

			Map<String, Object> pageItemMetadata = getPageItemMetadata(pageItem);
			Double score = getScore(pageItem);
			String text = getText(pageItem);

			if (Objects.equals("", text)) {

				Media media = getMedia(pageItem);
				Document document = new Document.Builder()
						.metadata(metadata)
						.metadata(pageItemMetadata)
						.media(media)
						.score(score)
						.build();

				documents.add(document);
				break;
			}

			Document document = new Document.Builder()
					.metadata(metadata)
					.metadata(pageItemMetadata)
					.text(text)
					.score(score)
					.build();

			documents.add(document);
		}

		return documents;
	}

	private Double getScore(ScorePageItem pageItem) {

		return pageItem.getScore();
	}

	// .... 省略数据清洗代码

	// 限制联网搜索的文档数，提高联网搜索响应速度
	public List<Document> limitResults(List<Document> documents, int minResults) {

		int limit = Math.min(documents.size(), minResults);

		return documents.subList(0, limit);
	}

}
```

#### 3.2.4 Module RAG 流程

接下来，便是使用 Module RAG API 处理用户 Prompt。使其更符合大模型的输入输出，获得更好的效果

具体代码参考：https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground/src/main/java/com/alibaba/cloud/ai/application/rag

#### 3.2.5 Web Search 服务类

1. 在构造方法中注入相关 Bean；
2. 在 ChatClient 中通过 RetrievalAugmentationAdvisor 引入 advisor 实现模块化 RAG 的联网搜索功能。

```java
public SAAWebSearchService(
       DataClean dataCleaner,
       QueryExpander queryExpander,
       IQSSearchEngine searchEngine,
       QueryTransformer queryTransformer,
       SimpleLoggerAdvisor simpleLoggerAdvisor,
       @Qualifier("dashscopeChatModel") ChatModel chatModel,
       @Qualifier("queryArgumentPromptTemplate") PromptTemplate queryArgumentPromptTemplate
) {

    this.queryTransformer = queryTransformer;
    this.queryExpander = queryExpander;
    this.queryArgumentPromptTemplate = queryArgumentPromptTemplate;

    // reasoning content for DeepSeek-r1 is integrated into the output
    this.reasoningContentAdvisor = new ReasoningContentAdvisor(1);

    // Build chatClient
    this.chatClient = ChatClient.builder(chatModel)
          .defaultOptions(
                DashScopeChatOptions.builder()
                      .withModel(DEFAULT_WEB_SEARCH_MODEL)
                      // stream 模式下是否开启增量输出
                      .withIncrementalOutput(true)
                      .build())
          .build();

    // 日志
    this.simpleLoggerAdvisor = simpleLoggerAdvisor;

    this.webSearchRetriever = WebSearchRetriever.builder()
          .searchEngine(searchEngine)
          .dataCleaner(dataCleaner)
          .maxResults(2)
          .build();
}

//Handle user input
public Flux<String> chat(String prompt) {

    return chatClient.prompt()
          .advisors(
             createRetrievalAugmentationAdvisor(),
             reasoningContentAdvisor,
             simpleLoggerAdvisor
          ).user(prompt)
          .stream()
          .content();
}

private RetrievalAugmentationAdvisor createRetrievalAugmentationAdvisor() {

    return RetrievalAugmentationAdvisor.builder()
          .documentRetriever(webSearchRetriever)
          .queryTransformers(queryTransformer)
          .queryAugmenter(
                new CustomContextQueryAugmenter(
                      queryArgumentPromptTemplate,
                      null,
                      true)
          ).queryExpander(queryExpander)
          .documentJoiner(new ConcatenationDocumentJoiner())
          .build();
}
```

Web Search 实现文章参考：https://java2ai.com/blog/spring-ai-alibaba-module-rag/?spm=5176.29160081.0.0.2856aa5cenvkmu&source=blog/

Spring AI RAG：https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html#_advisors

### <span id="mcp-config">3.3 MCP  集成</span>

#### 3.3.1 MCP Config 增强

为了解决 MCP Stdio json 配置文件难以理解和本地 MCP Server 二进制文件需要绝对路径的问题。在 playground 中对 MCP Stdio 配置做了增强处理。

其主要步骤是将 McpStdioClientProperties 属性配置重写，以便在后续 MCP Client 初始化使用增强的 MCP 配置。

```java
@Component
public class CustomMcpStdioTransportConfigurationBeanPostProcessor implements BeanPostProcessor {

	private static final Logger logger = LoggerFactory.getLogger(CustomMcpStdioTransportConfigurationBeanPostProcessor.class);

	private final ObjectMapper objectMapper;

	private final McpStdioClientProperties mcpStdioClientProperties;

	public CustomMcpStdioTransportConfigurationBeanPostProcessor(
			ObjectMapper objectMapper,
			McpStdioClientProperties mcpStdioClientProperties
	) {
		this.objectMapper = objectMapper;
		this.mcpStdioClientProperties = mcpStdioClientProperties;
	}

	@NotNull
	@Override
	public Object postProcessAfterInitialization(@NotNull Object bean, @NotNull String beanName) throws BeansException {

		if (bean instanceof StdioTransportAutoConfiguration) {

			logger.debug("增强 McpStdioTransportConfiguration bean start: {}", beanName);

			McpServerConfig mcpServerConfig;
			try {
				mcpServerConfig = McpServerUtils.getMcpServerConfig();

				// Handle the jar relative path issue in the configuration file.
				for (Map.Entry<String, McpStdioClientProperties.Parameters> entry : mcpServerConfig.getMcpServers()
						.entrySet()) {

					if (entry.getValue() != null && entry.getValue().command().startsWith("java")) {

						McpStdioClientProperties.Parameters serverConfig = entry.getValue();
						String oldMcpLibsPath = McpServerUtils.getLibsPath(serverConfig.args());
						String rewriteMcpLibsAbsPath = getMcpLibsAbsPath(McpServerUtils.getLibsPath(serverConfig.args()));
						if (rewriteMcpLibsAbsPath != null) {
							serverConfig.args().remove(oldMcpLibsPath);
							serverConfig.args().add(rewriteMcpLibsAbsPath);
						}
					}
				}

				String msc = objectMapper.writeValueAsString(mcpServerConfig);
				logger.debug("Registry McpServer config: {}", msc);

				// write mcp client
				mcpStdioClientProperties.setServersConfiguration(new ByteArrayResource(msc.getBytes()));
				((StdioTransportAutoConfiguration) bean).stdioTransports(this.mcpStdioClientProperties);
			}
			catch (IOException e) {
				throw new SAAAppException(e.getMessage());
			}

			logger.debug("增强 McpStdioTransportConfiguration bean end: {}", beanName);
		}

		return bean;
	}

}
```

在 MCPServerUtils 中读取 mcp-config.yaml 配置并转为 McpServerConfig。

```java
public static McpServerConfig getMcpServerConfig() throws IOException {

    ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
    InputStream resourceAsStream = ModelsUtils.class.getClassLoader().getResourceAsStream(MCP_CONFIG_FILE_PATH);

    McpServerConfig mcpServerConfig = mapper.readValue(resourceAsStream, McpServerConfig.class);
    mcpServerConfig.getMcpServers().forEach((key, parameters) -> {
       Map<String, String> env = parameters.env();
       if (Objects.nonNull(env)) {
          env.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty() &&
                      entry.getValue().startsWith("${") && entry.getValue().endsWith("}"))
                .forEach(entry -> {
                   String envKey = entry.getValue().substring(2, entry.getValue().length() - 1);
                   String envValue = System.getenv(envKey);
                   // allow env is null.
                   if (envValue != null && !envValue.isEmpty()) {
                      env.put(entry.getKey(), envValue);
                   }
                });
       }
    });


    return mcpServerConfig;
}
```

#### 3.3.2 MCP Server 工具回显

为了便于展示 MCP Client 如何调用 MCP Server 的 tools 和展示 MCP Server 中有哪些 Tools，playground 中做了特殊处理。

自定义 MCP Server 存放 MCP Server 的 tools 信息用于浏览器显示：

```java
public class McpServer {

	private String id;

	private String name;

	private String desc;

	private Map<String, String> env;

	private List<Tools> toolList;
}
```

因为 Spring AI 的 SyncMcpToolCallback 中的 MCPClient 没有对外暴露获取 MCP Server 的相关属性，只有 Tools 定义。playground 对 SyncMcpToolCallback 做了包装处理：

```java
public class SyncMcpToolCallbackWrapper {

	private final SyncMcpToolCallback callback;

	public SyncMcpToolCallbackWrapper(SyncMcpToolCallback callback) {
		this.callback = callback;
	}

	public McpSyncClient getMcpClient() {

		try {
			Field field = SyncMcpToolCallback.class.getDeclaredField("mcpClient");
			field.setAccessible(true);
			return (McpSyncClient) field.get(callback);
		} catch (NoSuchFieldException | IllegalAccessException e) {
			throw new RuntimeException(e);
		}
	}

}
```

在 MCPServerUtils 中做了 MCP Server 容器的初始化操作：

```java
public static void initMcpServerContainer(ToolCallbackProvider toolCallbackProvider) throws IOException {

    McpServerConfig mcpServerConfig = McpServerUtils.getMcpServerConfig();
    Map<String, String> mcpServerDescMap = initMcpServerDescMap();

    mcpServerConfig.getMcpServers().forEach((key, parameters) -> {

        List<McpServer.Tools> toolsList = new ArrayList<>();
        for (ToolCallback toolCallback : toolCallbackProvider.getToolCallbacks()) {

            // todo: 拿不到 mcp client, 先用包装器拿吧
            SyncMcpToolCallback mcpToolCallback = (SyncMcpToolCallback) toolCallback;
            SyncMcpToolCallbackWrapper syncMcpToolCallbackWrapper = new SyncMcpToolCallbackWrapper(mcpToolCallback);
            String currentMcpServerName = syncMcpToolCallbackWrapper.getMcpClient().getServerInfo().name();

            // 按照 mcp server name 聚合 mcp server tools
            if (Objects.equals(key, currentMcpServerName)) {
                McpServer.Tools tool = new McpServer.Tools();
                tool.setDesc(toolCallback.getToolDefinition().description());
                tool.setName(toolCallback.getToolDefinition().name());
                tool.setParams(toolCallback.getToolDefinition().inputSchema());

                toolsList.add(tool);
            }
        }

        McpServerContainer.addServer(McpServer.builder()
                                     .id(getId())
                                     .name(key)
                                     .env(parameters.env())
                                     .desc(mcpServerDescMap.get(key))
                                     .toolList(toolsList)
                                     .build()
                                    );
    });

}
```

MCP Server 工具回显效果如下：您可以在 resource 下的 mcp-config.yaml 中添加更多 MCP Server。

![image-20250607190058038](/img/user/ai/practices/playground/\image-20250607190058038.png)

#### 3.3.3 MCP 工具调用

完成上面一系列的初始化操作之后，接下来便是编写 MCP Service 类：为了能够获取 MCP Server Tools 的执行信息，这里使用了 Spring AI Tools 的 internalToolExecutionEnabled API。来收集大模型的工具入参和执行结果等，在前端做调用展示。

为了收集 MCP Tools 调用过程中的信息。Playground 项目编写了 ToolCallResp 类来收集一些信息：

```java
public class ToolCallResp {

    /**
     * Tool 的执行状态
     */
    private ToolState status;

    /**
     * Tool Name
     */
    private String toolName;

    /**
     * Tool 执行参数
     */
    private String toolParameters;

    /**
     * Tool 执行结果
     */
    private String toolResult;

    /**
     * 工具执行开始的时间戳
     */
    private LocalDateTime toolStartTime;

    /**
     * 工具执行完成的时间戳
     */
    private LocalDateTime toolEndTime;

    /**
     * 工具执行的错误信息
     */
    private String errorMessage;

    /**
     * 工具执行输入
     */
    private String toolInput;

    /**
     * 工具执行耗时
     */
    private Long toolCostTime;
    /**
     * Tool 记录tool返回的中间结果
     */
    private String toolResponse;
}
```

MCP Service 实现：

```java
@Service
public class SAAMcpService {

	private final ChatClient chatClient;

	private final ObjectMapper objectMapper;

	private final ToolCallbackProvider tools;

	private final ToolCallingManager toolCallingManager;

	private final McpStdioClientProperties mcpStdioClientProperties;

	private static final Logger logger = LoggerFactory.getLogger(SAAMcpService.class);

	public SAAMcpService(
			ObjectMapper objectMapper,
			ToolCallbackProvider tools,
			SimpleLoggerAdvisor simpleLoggerAdvisor,
			ToolCallingManager toolCallingManager,
			McpStdioClientProperties mcpStdioClientProperties,
			@Qualifier("openAiChatModel") ChatModel chatModel
	) throws IOException {

		this.objectMapper = objectMapper;
		this.mcpStdioClientProperties = mcpStdioClientProperties;

		// Initialize chat client with non-blocking configuration
		this.chatClient = ChatClient.builder(chatModel)
				.defaultAdvisors(
						simpleLoggerAdvisor
				).defaultToolCallbacks(tools)
				.build();
		this.tools = tools;
		this.toolCallingManager = toolCallingManager;

		McpServerUtils.initMcpServerContainer(tools);
	}

	public ToolCallResp chat(String prompt) {

		// manual run tools flag
		ChatOptions chatOptions = ToolCallingChatOptions.builder()
				.toolCallbacks(tools.getToolCallbacks())
				.internalToolExecutionEnabled(false)
				.build();

		ChatResponse response = chatClient.prompt(new Prompt(prompt, chatOptions))
				.call().chatResponse();

		logger.debug("ChatResponse: {}", response);
		assert response != null;
		List<AssistantMessage.ToolCall> toolCalls = response.getResult().getOutput().getToolCalls();
		logger.debug("ToolCalls: {}", toolCalls);
		String responseByLLm = response.getResult().getOutput().getText();
		logger.debug("Response by LLM: {}", responseByLLm);

		// execute tools with no chat memory messages.
		var tcr = ToolCallResp.TCR();
		if (!toolCalls.isEmpty()) {

			tcr = ToolCallResp.startExecute(
					responseByLLm,
					toolCalls.get(0).name(),
					toolCalls.get(0).arguments()
			);
			tcr.setToolParameters(toolCalls.get(0).arguments());
			logger.debug("Start ToolCallResp: {}", tcr);
			ToolExecutionResult toolExecutionResult = null;

			try {
				toolExecutionResult = toolCallingManager.executeToolCalls(new Prompt(prompt, chatOptions), response);

				tcr.setToolEndTime(LocalDateTime.now());
			}
			catch (Exception e) {

				tcr.setStatus(ToolCallResp.ToolState.FAILURE);
				tcr.setErrorMessage(e.getMessage());
				tcr.setToolEndTime(LocalDateTime.now());
				tcr.setToolCostTime((long) (tcr.getToolEndTime().getNano() - tcr.getToolStartTime().getNano()));
				logger.error("Error ToolCallResp: {}, msg: {}", tcr, e.getMessage());
				// throw new RuntimeException("Tool execution failed, please check the logs for details.");
			}

			String llmCallResponse = "";
			if (Objects.nonNull(toolExecutionResult)) {
				ChatResponse finalResponse = chatClient.prompt().messages(toolExecutionResult.conversationHistory())
						.call().chatResponse();
				if (finalResponse != null) {
					llmCallResponse = finalResponse.getResult().getOutput().getText();
				}

				StringBuilder sb = new StringBuilder();
				toolExecutionResult.conversationHistory().stream()
						.filter(message -> message instanceof ToolResponseMessage)
						.forEach(message -> {
							ToolResponseMessage toolResponseMessage = (ToolResponseMessage) message;
							toolResponseMessage.getResponses().forEach(tooResponse -> {
								sb.append(tooResponse.responseData());
							});
						});
				tcr.setToolResponse(sb.toString());
			}

			tcr.setStatus(ToolCallResp.ToolState.SUCCESS);
			tcr.setToolResult(llmCallResponse);
			tcr.setToolCostTime((long) (tcr.getToolEndTime().getNano() - tcr.getToolStartTime().getNano()));
			logger.debug("End ToolCallResp: {}", tcr);
		}
		else {
			logger.debug("ToolCalls is empty, no tool execution needed.");
			tcr.setToolResult(responseByLLm);
		}

		return tcr;
	}

	public ToolCallResp run(String id, Map<String, String> envs, String prompt) throws IOException {

		Optional<McpServer> runMcpServer = McpServerContainer.getServerById(id);
		if (runMcpServer.isEmpty()) {
			logger.error("McpServer not found, id: {}", id);
			return ToolCallResp.TCR();
		}

		String runMcpServerName = runMcpServer.get().getName();
		var mcpServerConfig = McpServerUtils.getMcpServerConfig();
		McpStdioClientProperties.Parameters parameters = new McpStdioClientProperties.Parameters(
				mcpServerConfig.getMcpServers().get(runMcpServerName).command(),
				mcpServerConfig.getMcpServers().get(runMcpServerName).args(),
				envs
		);

		if (parameters.command().startsWith("java")) {
			String oldMcpLibsPath = McpServerUtils.getLibsPath(parameters.args());
			String rewriteMcpLibsAbsPath = getMcpLibsAbsPath(McpServerUtils.getLibsPath(parameters.args()));

			parameters.args().remove(oldMcpLibsPath);
			parameters.args().add(rewriteMcpLibsAbsPath);
		}

		String mcpServerConfigJSON = objectMapper.writeValueAsString(mcpServerConfig);
		mcpStdioClientProperties.setServersConfiguration(new ByteArrayResource(mcpServerConfigJSON.getBytes()));

		return chat(prompt);
	}

}
```

Function Call 参考：https://docs.spring.io/spring-ai/reference/api/tools.html

MCP Server 文章参考：https://java2ai.com/blog/spring-ai-alibaba-mcp/?spm=5176.29160081.0.0.2856aa5cenvkmu

### 3.4 Function Call 集成

playground 中实现了 Function Call 的功能，和 MCP 一样，支持调用状态显示。工具浏览器回显同理。

#### 3.4.1 Function Tools 初始化

您可以通过使用 Spring AI Alibaba 的提供的 Tool Calling Starter 来引入工具，也可以像 Playground 一样，通过 FunctionToolCallback 来自定义工具。

Playground Tools: https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground/src/main/java/com/alibaba/cloud/ai/application/tools

Tools 初始化代码如下：

```java
public List<ToolCallback> getTools() {

    return List.of(buildBaiduTranslateTools(), buildBaiduMapTools());
}

private ToolCallback buildBaiduTranslateTools() {

    return FunctionToolCallback
          .builder(
                "BaiduTranslateService",
                new BaiduTranslateTools(ak, sk, restClientbuilder, responseErrorHandler)
          ).description("Baidu translation function for general text translation.")
          .inputSchema(
                """
                      {
                         "type": "object",
                         "properties": {
                            "Request": {
                               "type": "object",
                               "properties": {
                                  "q": {
                                     "type": "string",
                                     "description": "Content that needs to be translated."
                                  },
                                  "from": {
                                     "type": "string",
                                     "description": "Source language that needs to be translated."
                                  },
                                  "to": {
                                     "type": "string",
                                     "description": "Target language to translate into."
                                  }
                               },
                               "required": ["q", "from", "to"],
                               "description": "Request object to translate text to a target language."
                            },
                            "Response": {
                               "type": "object",
                               "properties": {
                                  "translatedText": {
                                     "type": "string",
                                     "description": "The translated text."
                                  }
                               },
                               "required": ["translatedText"],
                               "description": "Response object for the translation function, containing the translated text."
                            }
                         },
                         "required": ["Request", "Response"]
                      }
                      """
          ).inputType(BaiduTranslateTools.BaiduTranslateToolRequest.class)
          .toolMetadata(ToolMetadata.builder().returnDirect(false).build())
          .build();
}
```

#### 3.4.2 Function Tools 调用

完成了工具引入或定义之后。接下来，便可以在 service 中使用这些 Tools 来增强大模型的能力。工具调用代码和 MCP Server Tools 类似。

```java
public class SAAToolsService {

	private static final Logger logger = LoggerFactory.getLogger(SAAToolsService.class);

	private final ChatClient chatClient;

	private final ToolCallingManager toolCallingManager;

	private final ToolsInit toolsInit;

	public SAAToolsService(
			ToolsInit toolsInit,
			ToolCallingManager toolCallingManager,
			SimpleLoggerAdvisor simpleLoggerAdvisor,
			MessageChatMemoryAdvisor messageChatMemoryAdvisor,
			@Qualifier("openAiChatModel") ChatModel chatModel
	) {

		this.toolsInit = toolsInit;
		this.toolCallingManager = toolCallingManager;

		this.chatClient = ChatClient.builder(chatModel)
				.defaultAdvisors(
						simpleLoggerAdvisor
//						messageChatMemoryAdvisor
				).build();
	}

	public ToolCallResp chat(String prompt) {

		// manual run tools flag
		ChatOptions chatOptions = ToolCallingChatOptions.builder()
				.toolCallbacks(toolsInit.getTools())
				.internalToolExecutionEnabled(false)
				.build();
		Prompt userPrompt = new Prompt(prompt, chatOptions);

		ChatResponse response = chatClient.prompt(userPrompt)
				.call().chatResponse();

		logger.debug("ChatResponse: {}", response);
		assert response != null;
		List<AssistantMessage.ToolCall> toolCalls = response.getResult().getOutput().getToolCalls();
		logger.debug("ToolCalls: {}", toolCalls);
		String responseByLLm = response.getResult().getOutput().getText();
		logger.debug("Response by LLM: {}", responseByLLm);

		// execute tools with no chat memory messages.
		var tcr = ToolCallResp.TCR();
		if (!toolCalls.isEmpty()) {

			tcr = ToolCallResp.startExecute(
					responseByLLm,
					toolCalls.get(0).name(),
					toolCalls.get(0).arguments()
			);
			logger.debug("Start ToolCallResp: {}", tcr);
			ToolExecutionResult toolExecutionResult = null;

			try {
				toolExecutionResult = toolCallingManager.executeToolCalls(new Prompt(prompt, chatOptions), response);

				tcr.setToolEndTime(LocalDateTime.now());
			}
			catch (Exception e) {

				tcr.setStatus(ToolCallResp.ToolState.FAILURE);
				tcr.setErrorMessage(e.getMessage());
				tcr.setToolEndTime(LocalDateTime.now());
				tcr.setToolCostTime((long) (tcr.getToolEndTime().getNano() - tcr.getToolStartTime().getNano()));
				logger.error("Error ToolCallResp: {}, msg: {}", tcr, e.getMessage());
				// throw new RuntimeException("Tool execution failed, please check the logs for details.");
			}

			String llmCallResponse = "";
			if (Objects.nonNull(toolExecutionResult)) {
//				ToolResponseMessage toolResponseMessage = (ToolResponseMessage) toolExecutionResult.conversationHistory()
//						.get(toolExecutionResult.conversationHistory().size() - 1);
//				llmCallResponse = toolResponseMessage.getResponses().get(0).responseData();
				ChatResponse finalResponse = chatClient.prompt().messages(toolExecutionResult.conversationHistory()).call().chatResponse();
				llmCallResponse = finalResponse.getResult().getOutput().getText();
			}

			tcr.setStatus(ToolCallResp.ToolState.SUCCESS);
			tcr.setToolResult(llmCallResponse);
			tcr.setToolCostTime((long) (tcr.getToolEndTime().getNano() - tcr.getToolStartTime().getNano()));
			logger.debug("End ToolCallResp: {}", tcr);
		}
		else {
			logger.debug("ToolCalls is empty, no tool execution needed.");
			tcr.setToolResult(responseByLLm);
		}

		return tcr;
	}

}
```

Function Tools 集成文章参考：https://java2ai.com/blog/spring-ai-toolcalling/?spm=5176.29160081.0.0.2856aa5cenvkmu

### 3.5 前端页面

Playground 前端页面使用 React 实现，为上述功能提供了一套基本的前端界面，**您可以参考以下关键信息做一些自定义修改**.

#### 3.5.1 数据持久化

部分业务场景需要将数据持久化以便于查询历史记录，生产环境使用时推荐使用服务端存储记录，但 Playground 出于效果演示目的，目前默认将所有历史数据保存到客户端本地，相关实现参考如下代码:

```ts
/**
 * 处理消息发送的完整流程
 * @param text - 消息文本
 * @param sendRequest - 发送请求的函数
 * @param createMessage - 创建消息对象的函数
 */
const processSendMessage = async <T extends BaseMessage>({
    text,
    sendRequest,
    createMessage,
}: {
    text: string;
    sendRequest: (text: string, timestamp: number, message: T) => Promise<void>;
    createMessage: (text: string, timestamp: number) => T;
}) => {
    if (!text.trim() || !activeConversation) return;

    const userTimestamp = Date.now();
    const userMessage = createMessage(text, userTimestamp);
    
    // 存储用户数据到客户端本地，生产环境可省略该步骤由服务端存储
    updateActiveConversation({
        ...activeConversation,
        messages: [
        ...activeConversation.messages,
        userMessage,
    ] as T[],
    });

    try {
        await sendRequest(text, userTimestamp, userMessage);
    } catch (error) {
        console.error("error:", error);
    }
};

```

#### 3.5.2 消息文本样式自定义渲染

对话气泡组件支持富文本样式渲染，并且具备较好的拓展性，您可以参考如下代码对任意标签做自定义样式拓展：

```tsx
/**
 * 获取自定义渲染配置
 * @param style - css 样式
 */
const getMarkdownRenderConfig = (styles: Record<string, string>) => {
  
  return {
    div: ({ children }) => {
        return <pre className={styles.codeBlock}>{children}</pre>
    },
    code: ({ children, className }) => {
        return <code className={styles.codeInline}>{children}</code>
    },
    think: ({ children }) => {
        return  <div className={styles.thinkTag}>{children}</div>;
    },
    tool: ({ children }) => {
        return <div className={styles.toolTag}>{children}</div>;
    },
  };
};
```

您也可以通过正则匹配等方式进行语法分析，将特定格式的字符串修改为由自定义标签包裹的形式，再由上述方式设置其渲染样式，实现可交互表单、图表等复杂样式。

## 4. 总结

Spring AI Alibaba 官方社区开发了一个**包含完整 `前端UI+后端实现` 的智能体 Playground 示例**。未来社区会持续更新维护。以此来演示 Spring AI 和 Spring AI Alibaba 的最新功能。
