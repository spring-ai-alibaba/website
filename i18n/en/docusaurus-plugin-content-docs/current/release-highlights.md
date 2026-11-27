---
title: 2.1.x highlights and migration
---

# Upgrade to 2.1.0.0

Align the [Alibaba, Extensions, and Spring AI BOMs](versions.md) with Spring Boot 4.2.0. Use Spring AI 2.1.0 and MCP Java SDK 2.2.0.

- ReactAgent dispatches the tools on the final model request. Tool metadata or a policy can pause a batch for approval, and Graph can resume approved or edited calls from a checkpoint. Defaults are 40 calls per tool and 150 total per turn.
- Preserve ordered Message Parts when editing history or persisting messages. Graph and Studio carry reasoning, media, provider payloads and tool errors through streaming and checkpoint resume. Incomplete tool arguments are available for display.
- Spring AI deprecates `ChatMemory` in favor of Session Memory, an event log with compaction, recall, and JDBC persistence. Opt in with `LlmNode.builder().sessionMemory(sessionService, sessionIdKey)` and set a conversation-specific session ID in Graph state.
- `QuestionClassifierNode` accepts a `DecisionModel` for typed routing. OpenAI users can enable the Responses API with `spring.ai.openai.chat.api=responses`.
- Configure Modern MCP per connection alongside existing Streamable HTTP and SSE connections. Nacos supports registration, discovery and gateway routing across the protocols.
- Extensions updates DashScope native model routing, image, audio and video generation, and the [Bailian Knowledge API](/integration/rag/bailian-knowledge). AnalyticDB, OceanBase, Alibaba OpenSearch, Tablestore and Tair support [precomputed embeddings](/integration/rag/vectordbs/precomputed-embeddings). Tika extraction is capped by default.

[Alibaba release](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.1.0.0) · [Spring AI GA blog](https://spring.io/blog/2026/11/20/spring-ai-2-1-0-GA-available-now/) · [Spring AI upgrade guide](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-1.html)
