---
title: DocumentReader RAG Data Source Integration
keywords: [Spring Ai Alibaba, DocumentReader, Document Reading, RAG]
description: "Spring Ai Alibaba plugin and tool ecosystem, this document mainly covers different DocumentReader implementations and usage methods for integrating different private domain data in RAG."
---

## Basic Usage
The Spring AI Alibaba official community provides many DocumentReader plugin extensions. In RAG scenarios, when integrating private domain data from different sources and formats, these plugins are very useful as they help developers quickly read data, avoiding the trouble of repetitive development.

Taking Lark/Feishu document library as an example, here's the basic usage of the official community DocumentReader implementation for data integration:

1. **Add Maven dependency**

```xml
<dependency>
  <groupId>com.alibaba.cloud.ai</groupId>
  <artifactId>feishu-document-reader</artifactId>
  <version>${spring.ai.alibaba.version}</version>
</dependency>
```

2. **Write code to read documents and write to vector database**

```java
FeiShuResource feiShuResource = FeiShuResource.builder()
			.appId("xxxxx")
			.appSecret("xxxxxxx")
			.build();
FeiShuDocumentReader reader = new FeiShuDocumentReader(feishuResourcde);

List<Document> documentList = reader.get();

TokenTextSplitter splitter = new TokenTextSplitter();
List<Document> chunks = splitter.apply(documentList);

vectorStore.add(chunks);
```


## Community Implementation List

| Name (Code Reference) | Maven Dependency | Description |
| --- | --- | --- |
| ArxivDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>arxiv-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | arXiv academic paper reader, supports paper metadata extraction, PDF download and content parsing |
| BilibiliDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>bilibili-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Bilibili video content parser, supports video information extraction and subtitle capture |
| ChatGptDataDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>chatgpt-data-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | ChatGPT conversation record parser, supports structured processing of exported data |
| EmailDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>email-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Email document parser, supports EML/MSG formats, can extract body text, attachments and metadata |
| FeiShuDocumentReader | ```xml <dependency>   <groupId>com.alibaba.cloud.ai</groupId>   <artifactId>feishu-document-reader</artifactId>   <version>${spring.ai.alibaba.version}</version> </dependency> ```  | Feishu/Lark document library reader, can be used in RAG scenarios to read document sources from Feishu and write them to vector databases.<br/><br/>Example address (if available) |
| GitHubDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>github-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | GitHub repository document parser, supports Markdown/README and other format capture |
| GitLabDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>gitlab-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | GitLab repository content reader, supports Issue and code repository document parsing |
| MongoDBDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>mongodb-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | MongoDB database connector, supports batch reading and querying of collection documents |
| MySQLDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>mysql-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | MySQL database reader, supports converting SQL query results into documents |
| NotionDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>notion-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Notion knowledge base integration tool, supports page content and block-level element parsing |
| TencentCOSDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>tencent-cos-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Tencent Cloud Object Storage integration tool, supports batch processing of COS document content |
| YouTubeDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>youtube-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | YouTube video content parser, supports video information and subtitle extraction |
| ObsidianDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>obsidian-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Obsidian note parser, supports Markdown files and bidirectional link processing |
| HuggingFaceFSDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>huggingface-fs-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | HuggingFace dataset file reader, supports JSONL format parsing |
| MboxDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>mbox-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Mbox mailbox file parser, supports multiple email content extraction |
| GitbookDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>gitbook-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Gitbook document reader, supports obtaining book content via API |
| ElasticsearchDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>es-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Elasticsearch document connector, supports single-node/cluster mode, HTTPS secure connection and basic authentication, provides document retrieval, ID query and custom search functions |
| YuQueDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>yuque-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Yuque knowledge base integration tool, supports obtaining document content via API and preserving source file path information |
| OneNoteDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>onenote-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | OneNote document parser, supports accessing notebook content and page structure via Microsoft Graph API |
| GptRepoDocumentReader | ```xml <dependency> <groupId>com.alibaba.cloud.ai</groupId> <artifactId>gpt-repo-document-reader</artifactId> <version>${spring.ai.alibaba.version}</version> </dependency> ``` | Git repository analysis tool, supports full code repository reading, file filtering and structured document generation |
