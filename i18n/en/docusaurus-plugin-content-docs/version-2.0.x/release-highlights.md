---
title: 2.0.x highlights and migration
---

# Upgrade to 2.0.3.0

Align [the BOMs](versions.md) with Spring AI 2.0.3, Spring Boot 4.1.3, and Spring Framework 7.0.11.

- ReactAgent dispatches callbacks from the final request after advisors select tools. An empty list disables tool dispatch for that request. Per-turn limits default to 40 calls per tool and 150 total. Configure them with `ReactAgent.builder().toolCallLimits(perTool, total)`.
- Graph preserves DeepSeek reasoning and final token usage. DashScope HTTP and SDK accumulate token usage across tool rounds. Remove manual addition of cache reads and writes for Anthropic and Bedrock Converse.
- OpenAI exposes strict tool schemas and a reasoning replay toggle. Switch custom media builders to a typed `Media.Builder.data` overload.
- Spring AI’s Tika reader defaults to 10 million extracted characters. A semantic cache advisor needs a scope resolver that derives a trusted tenant or user scope.
- Nacos Client 3.3.0 and MCP Java SDK 2.1.0 support the Nacos Config, A2A and legacy SSE and Streamable HTTP flows.

[Alibaba release](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.0.3.0) · [Spring AI 2.0 upgrade guide](https://docs.spring.io/spring-ai/reference/2.1-SNAPSHOT/upgrading/spring-ai-2-0.html)
