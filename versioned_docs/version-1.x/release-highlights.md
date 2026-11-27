---
title: 1.x 新特性与迁移
---

# 从 1.1.2.2 开始

本版本线使用 Spring AI 1.1.2 和 Spring Boot 3.5.8。已有 Boot 3 应用可以沿用 1.x 的 [BOM 与 Starter](versions.md)。

## 智能体编排

- [Agent Skills](frameworks/agent-framework/tutorials/skills.md) 按需载入技能文件，让系统提示词先暴露技能描述。
- [多智能体](frameworks/agent-framework/advanced/multi-agent.md) 提供 Supervisor、Routing、Handoffs 和子 Agent。可把专用 Agent 包装成工具，也可以把它加入 Graph 工作流。
- `spring-ai-alibaba-starter-agentscope` 提供 `AgentScopeAgent`，可在 Graph 中编排 AgentScope Java 的 ReActAgent。语音示例串联 DashScope 语音识别、ReactAgent 和 CosyVoice 合成，也支持直接输入文本。

## Extensions 1.1.2.3

可通过 `spring-ai-alibaba-starter-dashscope-sdk` 使用 DashScope Java SDK，并用 `spring.ai.model.chat=dashscope-sdk` 选择聊天实现。这个补丁还增加百炼 SDK 知识库检索、多模态嵌入，并增强 Nacos MCP 网关配置。百炼检索使用本版本的 `BailianDocumentRetriever`。

[Extensions 1.1.2.3 发布说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v1.1.2.3)

## 升级到 2.x

计划迁移时先核对目标版本的 Spring Boot、Spring AI 和 Extensions 版本。在一个变更中统一 BOM，并检查自定义 ChatModel、工具回调、MCP 连接和 Graph checkpoint 的兼容性。升级到 2.0.x 后，工具执行使用最终请求上的回调，应用级回退需要显式开启。

[Spring AI Alibaba 1.1.2.2 发布说明](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v1.1.2.2) · [Spring AI 1.1.2 发布说明](https://github.com/spring-projects/spring-ai/releases/tag/v1.1.2)
