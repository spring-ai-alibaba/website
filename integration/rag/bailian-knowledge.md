---
title: 百炼知识库
description: 使用 Spring AI Alibaba 连接百炼单库检索、多库检索服务、文档导入和托管流式问答。
---

# 百炼知识库

Extensions 2.1.0.0 的 `DashScopeRagApi` 使用百炼业务空间的 Knowledge API。若应用负责模型生成，可把百炼接成 Spring AI `DocumentRetriever`，在 Advisor、Graph 和 Agent 中共享。若希望由百炼完成检索和生成，可调用发布后的知识问答服务。

| 场景 | Java 入口 | 所需 ID |
| --- | --- | --- |
| 按库检索切片 | `ragApi.retrieve` 或 `DashScopeRagDocumentRetriever.forIndex` | 知识库 ID（`index_id`） |
| 按已发布策略检索，可跨库检索与重排 | `ragApi.search` 或 `DashScopeRagDocumentRetriever.forService` | 知识检索服务 ID（`agent_id`） |
| 调用托管流式问答 | `ragApi.chat` | 知识问答服务 ID（`agent_id`） |

在百炼控制台准备同一业务空间的 API Key 和业务空间 ID。按库检索前先创建知识库并等待文档导入完成。使用服务检索或问答时，先在对应页面绑定知识库、配置策略并发布服务。知识检索服务和知识问答服务都使用 `agent_id` 字段，各自使用对应的服务 ID。

[百炼 Knowledge API 概览](https://help.aliyun.com/zh/model-studio/rag-api-overview) · [创建知识检索服务](https://help.aliyun.com/zh/model-studio/rag-knowledge-retrieval)

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

默认业务空间主机为 `https://{workspace_id}.cn-beijing.maas.aliyuncs.com`，请求使用 API Key Bearer 鉴权。需要指定工作空间网关时可设置 `spring.ai.dashscope.rag.base-url`，或使用接受 `URI` 的构造方法自行配置 HTTP 客户端。

阿里云百炼 OpenAPI SDK 的 `Retrieve` 使用 AccessKey 签名，端点和请求格式另有约定。已有应用若使用 `BailianDocumentRetriever`，可继续沿用其 SDK 配置。本文的 `DashScopeRagDocumentRetriever` 使用上述 API Key 配置。

[OpenAPI Retrieve](https://help.aliyun.com/zh/model-studio/api-bailian-2023-12-29-retrieve) · [百炼与 Spring AI Alibaba 的接入方式](https://help.aliyun.com/zh/model-studio/spring-ai-alibaba-integrate-knowledge-base)

## 检索并增强自有提示词

```java
import java.util.List;

import com.alibaba.cloud.ai.dashscope.rag.DashScopeRagDocumentRetriever;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.retrieval.search.DocumentRetriever;

// 单库检索
DocumentRetriever retriever =
    DashScopeRagDocumentRetriever.forIndex(ragApi, indexId, 5, List.of());

// 或接入已发布的知识检索服务
DocumentRetriever serviceRetriever =
    DashScopeRagDocumentRetriever.forService(ragApi, searchServiceId, List.of());

var advisor = RetrievalAugmentationAdvisor.builder()
    .documentRetriever(retriever)
    .build();

String answer = chatClient.prompt().user(question).advisors(advisor).call().content();
```

按库检索传入 `topK` 和过滤条件。多库权重、路由、重排和召回数量在知识检索服务发布时配置。若需通过服务接口发送图片查询，使用 `ragApi.search` 的 `images` 参数。示例中的 `DocumentRetriever` 接收文本查询。

把 `retriever` 传给 [Graph 混合 RAG](/docs/frameworks/graph-core/examples/rag-workflow) 的检索节点，或包装为 [Agentic RAG 检索工具](/docs/frameworks/agent-framework/advanced/rag#agentic-rag)。通过 `Document.getId()`、`getMetadata()` 和 `getScore()` 获取百炼响应中可用的证据字段，按实际返回的库、文档和切片信息生成引用。

### 过滤检索范围

按库检索的 `search_filters` 可用 `_operator` 和 `_conditions` 对同一字段做 OR。字段名称和值要与知识库实际的可过滤元数据一致，多个顶层子分组之间按 AND 组合。

```java
List<Map<String, Object>> filters = List.of(Map.of(
    "_operator", "OR",
    "_conditions", List.of(
        Map.of("department", "support"),
        Map.of("department", "research")
    )
));
var documents = ragApi.retrieve(indexId, question, 5, filters);
```

知识检索服务可以通过 `new DashScopeRagApi.KnowledgeBaseFilters(indexId, filters)` 为指定知识库传入过滤条件。调用方从服务端的授权上下文确定允许查询的知识库和过滤范围。两个检索器工厂使用创建时提供的过滤条件。应用需要按请求过滤时，可从授权上下文构造检索器，或用自定义 `DocumentRetriever` 按请求调用 `ragApi`。

[SearchFilters 语法](https://help.aliyun.com/zh/model-studio/how-to-use-search-filters) · [知识检索接口](https://help.aliyun.com/zh/model-studio/knowledge/)

## 用同一个知识库运行 Graph 和 ReactAgent {#run-bailian-rag}

仓库的 `examples/bailian-rag` 是可独立运行的 Maven 示例。Graph 节点和 ReactAgent 的 `search_knowledge` 工具共用一个 `DashScopeRagDocumentRetriever`，并在输出中把实际引用的 `[E1]` 映射回来源名称和百炼切片 ID。

1. 准备 JDK 17+、Maven、北京地域的百炼文档知识库，以及同一业务空间下可调用模型和检索的 API Key。等待文件导入完成。
2. 从库中选一个已有答案的问题、命中切片里的原文短语，以及一个会命中其他主题的初始检索词。下例可以用两份文档准备，一份写入「标准版设备享受 12 个月保修」，另一份写入电子发票抬头和税号的办理说明。
3. 在 Spring AI Alibaba 仓库根目录配置环境变量并启动。可选的 `BAILIAN_RAG_MODEL` 默认为 `qwen-plus`，也可指定同空间内支持工具调用的模型。

```bash
export DASHSCOPE_API_KEY='<百炼 API Key>'
export BAILIAN_WORKSPACE_ID='<业务空间 ID>'
export BAILIAN_INDEX_ID='<知识库 ID>'
export BAILIAN_RAG_QUESTION='标准版设备的保修期是多久？'
export BAILIAN_RAG_EVIDENCE='12 个月'
export BAILIAN_RAG_INITIAL_QUERY='电子发票抬头和税号'

mvn -B -f examples/bailian-rag/pom.xml compile exec:java
```

| 输出中的场景 | 验证结果 | 检索次数 |
| --- | --- | --- |
| `graph.direct` | 首次命中，`answered`，引用对应到本次命中的切片 | 1 |
| `graph.rewrite` | 首次证据不匹配，模型改写查询后命中，`answered` 并带引用 | 2 |
| `graph.insufficient` | 两次检索均缺少证据，`insufficient_evidence` | 2 |
| `agent.search` | Agent 调用检索工具，`answered` 并带引用 | 1 |
| `agent.insufficient` | 工具返回空证据，Agent 输出 `insufficient_evidence` | 1 |
| `agent.greeting` | Agent 回应问候，无需检索 | 0 |

示例保留每次检索的首条结果，用短语匹配让证据判断可重复。若初始检索词已命中目标片段，换成同库内另一主题的查询，再运行以触发重查。若回答引用了本轮证据中不存在的标识，示例会以错误退出。可用 `mvn -B -f examples/bailian-rag/pom.xml test` 运行无需凭据的本地测试。

[示例源码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/bailian-rag) · [Graph 混合 RAG](/docs/frameworks/graph-core/examples/rag-workflow) · [Agentic RAG](/docs/frameworks/agent-framework/advanced/rag#agentic-rag)

## 导入文档

```java
String fileId = ragApi.upload(resource, category, List.of("manual"));
var job = ragApi.submitImport(indexId, List.of(fileId));
var documents = ragApi.awaitImport(
    indexId, job.ingestionId(), Duration.ofMinutes(5), Duration.ofSeconds(2));
```

上传返回数据中心文件 ID。提交导入后保存任务 ID `ingestionId`，在作业完成且文件导入成功后再检索。轮询超时后可以用原任务 ID 查询状态。删除知识库中的内容使用 `deleteDocuments(indexId, documentIds)` 和知识库文档 ID。删除数据中心文件使用 `deleteFile(fileId)`。

## 调用托管流式问答

```java
Flux<DashScopeRagApi.ChatEvent> events = ragApi.chat(
    chatServiceId, List.of(new DashScopeRagApi.ChatMessage("user", question)), List.of());
```

逐条处理 SSE 事件的 `event()` 和 `payload()`。多轮问答传入会话消息，可用 `KnowledgeBaseFilters` 限制检索范围。直接把托管回答流转发给应用的调用方即可。

## 排查常见问题

| 现象 | 检查项 |
| --- | --- |
| Spring 容器里没有 `DashScopeRagApi` | 检查 DashScope Starter、`spring.ai.dashscope.rag.enabled` 和 API Key 配置 |
| 认证失败或找不到知识库 | 检查 API Key 与网关是否属于同一业务空间，确认权限、地域和 ID 类型 |
| 知识检索服务不可用 | 检查是否已绑定正确的知识库并发布当前服务 |
| 请求成功但没有切片 | 核对导入状态、数据类型、过滤条件和召回配置，先在控制台验证已知命中问题 |

`DashScopeRagApi.RagApiException` 提供 `getCode()` 和 `getRequestId()`。处理错误时保留请求 ID，分别记录空命中、鉴权失败和服务超时。

[Extensions 使用说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0#bailian-workspace-rag-api)
