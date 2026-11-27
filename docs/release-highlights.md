---
title: 2.1.x 新特性与迁移
---

# 升级到 2.1.0.0

更新 Spring AI Alibaba 和 Extensions 为 2.1.0.0、Spring AI 为 2.1.0，并使用 Spring Boot 4.2.0。完整依赖组合见[版本与依赖](versions.md)。

## Agent 与 Graph

- [工具审批和调用预算](frameworks/agent-framework/advanced/human-in-the-loop.md#工具级审批与恢复)支持按工具声明确认。一个批次可以混合批准、修改与拒绝。Graph 从 checkpoint 恢复时再次核对可用回调，即使提供商缺失或重复工具调用 ID，各项人工决策也能分别保留。
- [Message Parts](frameworks/agent-framework/tutorials/messages.md#读取与保留-message-parts)携带有序文本、媒体、推理、工具调用与结果。Graph 流式聚合、checkpoint 和 Studio 保持这些内容，旧 checkpoint 仍可读取。流式参数片段可用于展示，只有完整调用才会分发。
- [Session Memory](frameworks/agent-framework/tutorials/memory.md#在-llmnode-中使用-session-memory)记录追加式会话事件，支持按轮压缩、`conversation_search` 召回与 JDBC 持久化。Spring AI 将 `ChatMemory` 标记为废弃。
- [DecisionModel](frameworks/agent-framework/tutorials/models.md#使用-decisionmodel-分类和路由)提供有类型的选择、判断和评分。Graph 分类节点可直接使用它，RAG 也可使用基于决策的文档过滤和重排。
- Graph 保留原始结束原因、`FinishReasonCategory` 和最终用量。受内容过滤拦截的输出跳过工具分发。自定义路由应把类型化拒答交还调用者处理。

[Spring AI Alibaba 发布说明](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.1.0.0) · [Spring AI GA 博客](https://spring.io/blog/2026/11/20/spring-ai-2-1-0-GA-available-now/)

## 模型与协议

- Spring AI 的 [OpenAI Responses](/integration/chatmodels/openai-chat#responses-api) 支持托管工具和加密推理回放，通过 `spring.ai.openai.chat.api=responses` 启用。
- [Modern MCP](/integration/mcps/mcp-client-boot-starter-docs#modern-mcp-2026-07-28) 支持同步、异步，使用 MCP Java SDK 2.2.0。Nacos 注册、发现、路由和网关可让 Modern、Streamable HTTP、SSE 服务并存。Graph MCP 节点按目标服务选择协议。
- [DashScope](/integration/chatmodels/dashScope#百炼模型路由与多轮推理)的 HTTP 和 SDK 实现保留有序消息、流式工具和推理。已适配的 Qwen、GLM、Kimi 型号根据模型选择原生端点。

[Spring AI 2.1 迁移指南](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-1.html)

## 百炼多模态、知识检索与向量存储

- [百炼多模态](/integration/multimodals/dashscope-multimodal)覆盖图像生成与编辑、Wan 视频、Qwen 语音识别与合成，以及 CosyVoice 合成。
- [百炼知识库](/integration/rag/bailian-knowledge)使用业务空间 Knowledge API，支持知识检索、文件导入和流式问答。可将知识库作为 `DocumentRetriever` 接入自己的 RAG 流程。
- [预计算向量](/integration/rag/vectordbs/precomputed-embeddings)可直接写入 AnalyticDB、OceanBase、阿里云 OpenSearch、Tablestore 和 Tair，并用同维度向量检索。
- Extensions [Tika 解析器](/integration/rag/document-parsers#tika-提取上限)默认限制为每份文档 1,000 万字符，可在构造时传入明确上限。

[Extensions 发布说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.1.0.0)
