---
title: 1.x highlights and migration
---

# Spring AI Alibaba 1.1.2.2

This line aligns Spring AI 1.1.2 with Spring Boot 3.5.8. Use the [1.x BOMs](versions.md) in Boot 3 applications.

ReactAgent supports skills that load on demand. The multi-agent examples cover supervisors, routing, handoffs, and subagents. Use `spring-ai-alibaba-starter-agentscope` to compose AgentScope Java agents in Graph. The published multimodal examples cover images, inline media and a voice pipeline using DashScope ASR and CosyVoice.

Extensions 1.1.2.3 adds the DashScope SDK starter, Bailian SDK retrieval, multimodal embeddings, and additional MCP gateway configuration. [Extensions 1.1.2.3 release](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v1.1.2.3)

When moving to 2.x, align the application’s Boot version and all AI BOMs together. Verify custom model code, the callbacks exposed per request, MCP connections, and persisted graph checkpoints.

[Spring AI Alibaba 1.1.2.2 release](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v1.1.2.2)
