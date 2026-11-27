---
title: 快速开始
description: 学习如何使用 Spring AI Alibaba Studio 可视化的与 Agent 通信
keywords: [Studio, Agent Chat, UI, Spring AI Alibaba]
---

# 快速开始

Agent Chat UI provides a visualized way for developers to chat with any Spring AI Alibaba developed Agents.

![Agent Chat UI](/img/chatui/agent-chat-ui.gif)

## Quick Experience

1. Down Example

```shell
git clone https://github.com/alibaba/spring-ai-alibaba.git

cd examples/deepresearch
```

2. Start agent

```shell
export AI_DASHSCOPE_API_KEY=your_dashscope_api_key
export JINA_API_KEY=your_jina_api_key  # Optional

mvn spring-boot:run
```

3. Chat with agent

Visit `http://localhost:3000`.

## How Agent Chat UI Works

### Embedded mode

The ui can work in a embedded mode with any of your Spring Boot applications.

Just add the following dependency to your agent project:

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-studio</artifactId>
	<version>2.1.0.0</version>
</dependency>
```

Run your agent, visit `http:localhost:{your-port}/chatui/index.html`, and now you can chat with you agent.

### Standalone mode

First, clone the repository,

```bash
git clone https://github.com/alibaba/spring-ai-alibaba.git

cd spring-ai-alibaba/spring-ai-alibaba-studio/agent-chat-ui
```

Install dependencies:

```bash
pnpm install
# or
# npm install
```

Run the app:

```bash
pnpm dev
# or
# npm run dev
```

The app will be available at `http://localhost:3000`.

By default, the UI connects to your backend Agent at `http://localhost:8080`, you can change the address at `.env.development` file.

```properties
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:8080
# The agent to call in the backend application, backend application should register agent as required, check examples for how to configure.
NEXT_PUBLIC_APP_NAME=research_agent
NEXT_PUBLIC_USER_ID=user-001
```

## 类型化 SSE 接口

自定义前端可使用包含事件流的 2.1.x 构建提供的 SSE 接口。新版路径保留原请求体，事件负载使用运行 ID、交付序号、作用域和类型化数据。

| 操作 | POST 路径 | 请求字段 |
| --- | --- | --- |
| 执行 Agent | `/run_sse/v2` | `appName`、`threadId`、`userId`、`newMessage` |
| 恢复 Agent 审批 | `/resume_sse/v2` | 原来的 `appName`、`threadId`、`userId`，以及本次 `interruptionId` 与 `toolFeedbacks` |
| 执行 Graph | `/graph_run_sse/v2` | `graphName`、`threadId`、`userId`，以及 `inputs` 或 `newMessage` |

```bash
curl -N 'http://localhost:8080/run_sse/v2' \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -d '{
    "appName": "research_agent",
    "threadId": "research-42",
    "userId": "user-001",
    "newMessage": {"messageType": "user", "content": "比较两个研究方向"}
  }'
```

每帧的 `event:` 是 `model_delta`、`tool_delta`、`run_paused` 等事件名，`id:` 由 `runId` 和交付序号组成。`data:` 为 JSON，其中 `scope.namespace` 标识事件来源。收到 `run_paused` 时，从负载读取中断 ID。并行暂停时，从 `pendingInterruptions` 选择要反馈的中断。恢复后会收到新的 `runId`。

默认响应省略推理内容、工具参数与输出以及状态字段值。需要显示这些内容时，按需使用 `reasoning=true`、`toolPayload=true` 或重复的 `stateKey` 查询参数，例如 `?stateKey=answer&stateKey=summary`。

[Graph 运行事件](../graph-core/core/streaming.md#类型化运行事件) · [人工审批与反馈格式](../agent-framework/advanced/human-in-the-loop.md)

