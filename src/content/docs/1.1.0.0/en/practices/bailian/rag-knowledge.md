---
title: Integrating Bailian Knowledge Base with Local RAG Applications
keywords: [Spring AI,Qwen,Bailian Knowledge Base]
description: "Use Spring AI Alibaba to integrate Bailian RAG knowledge base, connecting your Spring Boot application to large language models."
---

Alibaba Cloud Bailian is a visual AI agent application development platform that also provides RAG knowledge base management capabilities. In simple terms, you can upload private data to the Bailian platform, leveraging its data parsing, slicing, and vectorization capabilities to preprocess data for vector storage. The processed data can then be used for subsequent intelligent agent application retrieval, commonly known as the RAG pattern.

In this example, we first create a knowledge base on the Bailian platform, upload our documents to the knowledge base, and complete slicing and vector storage. Then, we use Spring AI Alibaba to develop an agent application that retrieves information from the Bailian knowledge base using the RAG pattern.

![knowledge-architecture.png](/img/user/ai/practices/bailian-knowledge/architecture.png)

## Creating a Bailian Knowledge Base

Depending on your scenario, there are two ways to create a Bailian knowledge base:
1. Access the Bailian console and upload the knowledge base and documents through the visual web interface.
2. Write code in a Spring Boot or Spring AI project to call APIs for creating knowledge bases and uploading documents.

### Creating a Knowledge Base via Bailian Console

Open the Bailian console, access the "Data Management" menu on the left side, and upload private domain data via the "Import Data" button:

![agent-architecture.png](/img/user/ai/practices/bailian-knowledge/import-data.png)

Access the "Knowledge Index" menu on the left side and complete the vectorization of the previously uploaded data by clicking "Create Knowledge Base":

![agent-architecture.png](/img/user/ai/practices/bailian-knowledge/embedding-data.png)

> Note: Remember the `Knowledge Base Name` you enter here, as it will be used as a unique index for subsequent RAG knowledge retrieval.

### Creating a Knowledge Base via API

If you don't want to manually operate the Bailian console, you can use the `DocumentReader` interface implementation `DashScopeDocumentCloudReader` and the `VectorStore` implementation `DashScopeCloudStore` in Spring AI Alibaba to upload local data to Bailian and complete data vectorization.

Here's the relevant code:

```java
public void importDocuments() {
	String path = "absolute-path-to-your-file";

	// 1. import and split documents
	DocumentReader reader = new DashScopeDocumentCloudReader(path, dashscopeApi, null);
	List<Document> documentList = reader.get();
	logger.info("{} documents loaded and split", documentList.size());

	// 1. add documents to DashScope cloud storage
	VectorStore vectorStore = new DashScopeCloudStore(dashscopeApi, new DashScopeStoreOptions(indexName));
	vectorStore.add(documentList);
	logger.info("{} documents added to dashscope cloud vector store", documentList.size());
}
```

> Note: The `indexName` value used in the code above will serve as a unique index for subsequent RAG knowledge retrieval.

## Creating a RAG Agent Application

After completing the knowledge base, we can develop our own RAG application. Similarly, we have two approaches to develop our application:
1. Continue development in the Bailian console, which provides a visual platform for agent application development and deployment, making it easy to create hosted applications.
2. Use the Spring AI Alibaba framework to develop applications, which is typically suitable for scenarios where you need to integrate RAG into legacy Java applications or need more flexible control over application retrieval behavior.

Below we focus on explaining how to develop RAG applications using the Spring AI Alibaba framework, simulating the development process of a legacy Java application integrating with large language models.

To allow a Spring Boot application to access large language models and use knowledge bases in Bailian, we first need to add the Spring AI Alibaba dependency:

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter</artifactId>
	<version>${spring-ai-alibaba.version}</version>
</dependency>
```

Next, we need to obtain the model API key and other necessary information from the Bailian platform:

```yaml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```

* api-key: Required, the key for accessing the model service.
* workspace-id: Optional, defaults to using the default business space. If the application was created in a separate business space, you need to specify this.

Next is the standard process for developing RAG applications using the Spring AI Alibaba framework. To establish a connection with Bailian during the retrieval phase, we need to specify the Bailian knowledge base retrieval component `DashScopeDocumentRetriever`.

```java
private static final String indexName = "Microservice";

DocumentRetriever retriever = new DashScopeDocumentRetriever(dashscopeApi,
				DashScopeDocumentRetrieverOptions.builder().withIndexName(indexName).build());
```

The `indexName` needs to be specified as the name of the knowledge base you created in Bailian, as described in the previous section.

As shown in the following code snippet, we use `ChatClient` to call the model service, where the `DocumentRetrievalAdvisor` aspect is responsible for intercepting user requests and appending the knowledge base context retrieved by the `retriever` to the user's prompt before sending it to the large language model.

```java
ChatClient chatClient = builder
		.defaultAdvisors(new DocumentRetrievalAdvisor(retriever))
		.build();

String content = chatClient.prompt().user(message).stream().chatResponse();
```

> For the complete source code of the example project, please check the Github repository [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-rag-example).
