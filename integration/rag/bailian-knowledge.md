---
title: 百炼知识库
description: 使用百炼业务空间 Knowledge API 实现检索、文档上传和流式问答。
---

# 百炼知识库

Extensions 2.1.0.0 的 `DashScopeRagApi` 使用百炼 Knowledge API（原 RAG API）。检索与文档管理走业务空间的知识库接口，托管问答走发布后的知识服务接口。准备同一业务空间的 API Key、业务空间 ID，以及知识库 ID 或已发布的知识 Agent ID。

[百炼 Knowledge API 概览](https://docs.bailian.console.aliyun.com/zh/model-studio/rag-api-overview)

## 在 Spring Boot 中配置

引入 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`，使用[版本页](/docs/versions)上的 Extensions BOM。下面的配置自动注入 `DashScopeRagApi`。

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      workspace-id: ${BAILIAN_WORKSPACE_ID}
      rag:
        enabled: true
```

默认业务空间主机为 `https://{workspace_id}.cn-beijing.maas.aliyuncs.com`。部署在其他地域时，使用对应业务空间的端点，通过接受 `URI` 的构造方法创建 client。

## 检索并增强自有提示词

```java
List<Document> documents = ragApi.retrieve(indexId, question, 5, List.of());

DocumentRetriever retriever =
    DashScopeRagDocumentRetriever.forIndex(ragApi, indexId, 5, List.of());

var advisor = RetrievalAugmentationAdvisor.builder()
    .documentRetriever(retriever)
    .build();

String answer = chatClient.prompt().user(question).advisors(advisor).call().content();
```

`retrieve` 的过滤配置遵循百炼的 `search_filters`，多个 OR 条件可通过 `_operator` 和 `_conditions` 表达。应用已发布为知识服务时，也可以使用 `DashScopeRagDocumentRetriever.forService(ragApi, agentId, filters)`。

[SearchFilters 语法](https://docs.bailian.console.aliyun.com/zh/model-studio/rag-api-overview) · [Spring AI RAG Advisor](retrieval-augmented-generation.md)

## 导入文档

```java
String fileId = ragApi.upload(resource, category, List.of("manual"));
var job = ragApi.submitImport(indexId, List.of(fileId));
var documents = ragApi.awaitImport(
    indexId, job.ingestionId(), Duration.ofMinutes(5), Duration.ofSeconds(2));
```

上传返回数据中心文件 ID。提交导入后保存任务 ID，在作业完成后再检索。删除知识库中的内容使用 `deleteDocuments(indexId, documentIds)` 和知识库文档 ID。删除数据中心文件使用 `deleteFile(fileId)`。

## 调用托管流式问答

```java
Flux<DashScopeRagApi.ChatEvent> events = ragApi.chat(
    agentId, List.of(new DashScopeRagApi.ChatMessage("user", question)), List.of());
```

逐条处理 SSE 事件的 `event()` 和 `payload()`。多轮问答传入完整会话消息，可传入 `KnowledgeBaseFilters` 限制使用的知识库及范围。已有旧版 RAG 应用迁移时，先确认当前 ID 对应知识库还是发布后的知识 Agent，再选择对应接口。

[Extensions 使用说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0#bailian-workspace-rag-api)
