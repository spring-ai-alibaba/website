---
title: 会话记忆
description: 使用 Spring AI 2.1 Session Memory 管理多轮对话、工具历史、压缩和召回，区分 Graph checkpoint。
keywords: [Session Memory, ChatMemory, SessionService, ChatClient, ReactAgent, Checkpoint]
---

# 会话记忆

Spring AI 2.1 的 Session API 用事件日志记录多轮对话。应用在每个请求中传入会话 ID，`SessionMemoryAdvisor` 读取可用于当前推理的历史并保存新消息，`SessionTurnAdvisor` 记录轮次并负责可选的上下文压缩。新会话可从 Session API 开始，Spring AI 2.1 已将 `ChatMemory` 和 `ChatMemoryRepository` 标记为废弃，已有应用可按迁移指南逐步升级。

| 组件 | 保存什么 |
| --- | --- |
| Spring AI Session Memory | 会话、消息、工具交换以及压缩等事件 |
| Alibaba Graph checkpoint | 工作流状态、执行位置、暂停与恢复所需信息 |
| 应用长期存储或知识库 | 跨会话的业务数据和可检索知识 |

[Spring AI Session API](https://docs.spring.io/spring-ai/reference/api/session.html)

## 让 ChatClient 记住同一会话

用 Spring AI 2.1 的 BOM 对齐 `org.springframework.ai:spring-ai-session-advisor`。该模块集成了 ChatClient Advisor 和 Session API。下例使用内存仓库，适合在开发环境验证多轮对话。

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.session.DefaultSessionService;
import org.springframework.ai.session.InMemorySessionRepository;
import org.springframework.ai.session.advisor.SessionAdvisors;

var repository = InMemorySessionRepository.builder().build();
var service = DefaultSessionService.builder().sessionRepository(repository).build();

var client = ChatClient.builder(chatModel)
    .defaultAdvisors(SessionAdvisors.builder(service).build())
    .build();

client.prompt("My project is Atlas.")
    .advisors(SessionAdvisors.session(sessionId))
    .call()
    .chatResponse();

var reply = client.prompt("What is my project?")
    .advisors(SessionAdvisors.session(sessionId))
    .call()
    .chatResponse();
```

在同一对话的请求中复用会话 ID，应用应验证会话归属后再将 ID 交给 Advisor。发送当前请求的新消息即可，Advisor 会载入先前历史。启动前保存在系统配置中的指令、业务状态和长期知识，可通过独立的应用逻辑提供。

## 工具历史和 Session 事件

`SessionService.getMessages(sessionId)` 读取消息历史，`getActiveMessages(sessionId)` 读取压缩后用于推理的视图，`getEvents(sessionId)` 还包括轮次与压缩事件。工具回复应保存完整 [Message Parts](messages.md#读取与保留-message-parts)。

使用默认的 `SessionAdvisors` 组合时，记忆 Advisor 位于 Spring AI 工具循环内，能够保存模型与工具的每次交换。若应用显式创建 `ToolCallingAdvisor` 并让记忆负责重建历史，可用 `.disableInternalConversationHistory()` 让工具循环交由记忆维护上下文。

工具暂停后，从会话存储取得当前轮的消息和工具结果，并附上原请求授权的回调，交给工具管理器执行审批决定。恢复 ChatClient 时只提交新产生的结果消息，并复用同一会话 ID。见 [调用确认与恢复](tools.md#调用确认与恢复)。

## 压缩与召回

会话历史较长时，可以按完结轮次触发压缩。窗口策略把最近的轮次保留在活跃视图中，适合避免把长历史全部传给模型。旧事件可供应用搜索或按保留策略管理。

```java
import org.springframework.ai.session.compaction.TurnCountTrigger;
import org.springframework.ai.session.compaction.WindowCompactionStrategy;
import org.springframework.ai.session.tool.SessionRecallTools;

var memoryAdvisors = SessionAdvisors.builder(service)
    .compaction(new TurnCountTrigger(20),
        WindowCompactionStrategy.builder().lastTurns(10).build())
    .sessionIdInToolContext(true)
    .build();

var client = ChatClient.builder(chatModel)
    .defaultAdvisors(memoryAdvisors)
    .defaultTools(SessionRecallTools.builder(service).build())
    .build();
```

`conversation_search` 提供当前会话的关键词检索，适用于召回已离开活跃窗口的信息。上例通过 Turn Advisor 传递已验证的会话 ID，工具可从 `ToolContext` 读取。也可以只在需要召回的请求显式传入工具上下文。启用前应考虑所有可能接收该上下文的工具。

[轮次与压缩](https://docs.spring.io/spring-ai/reference/api/session/compaction.html) · [会话召回](https://docs.spring.io/spring-ai/reference/api/session/recall.html)

## 持久化与 ChatMemory 迁移

Spring Boot 应用可用 `spring-ai-starter-model-session-jdbc` 和配置好的 `DataSource` 持久化事件，按数据库和环境初始化会话表，再注入 `SessionService`。内存示例在进程重启后会丢失历史。

迁移既有对话时，确定旧 `conversationId` 到新 `sessionId` 的映射，并明确并行读写阶段的归属。使用 Alibaba Extensions 的情况下，可调用 `LegacyChatMemorySessionImporter.importConversation(repository, conversationId, target)`，其中 `target` 是带显式 ID 的 `CreateSessionRequest`。同一来源和目标可重试导入。应用应核对消息顺序、工具结果和会话归属，再切换流量。

[JDBC Session Repository](https://docs.spring.io/spring-ai/reference/api/session/jdbc.html) · [ChatMemory 迁移](https://docs.spring.io/spring-ai/reference/api/chat-memory.html) · [Extensions 会话导入](https://github.com/spring-ai-alibaba/spring-ai-extensions/tree/v2.1.0.0#chatmemory)

## ReactAgent 的 Graph checkpoint

`ReactAgent` 可用 `MemorySaver` 做进程内 checkpoint。用同一 `threadId` 继续同一工作流，生产持久化可选项目支持的外部 Saver。对工具审批、恢复执行和其他工作流状态，同样使用 Graph 的线程和 checkpoint。

```java
var agent = ReactAgent.builder()
    .name("project-agent")
    .model(chatModel)
    .saver(new MemorySaver())
    .build();

var config = RunnableConfig.builder().threadId(threadId).build();
agent.call("My project is Atlas.", config);
var reply = agent.call("What is my project?", config);
```

需裁剪、总结或编辑 Agent 状态时，用 Graph 支持的消息 Hook 和状态更新规则。对工具消息应保持调用及对应结果完整。详见 [Agent 记忆与上下文管理](../advanced/memory.md)。

## 在 LlmNode 中使用 Session Memory

在 Graph 的模型节点里可显式启用 Spring AI 会话历史。将当前问题和非空会话 ID 提前写入 Graph state，并为后续轮次复用已验证的会话 ID。

```java
import com.alibaba.cloud.ai.graph.node.LlmNode;

var node = LlmNode.builder()
    .chatClient(chatClient)
    .userPromptTemplateKey("question")
    .sessionMemory(sessionService, "conversationId")
    .outputKey("answer")
    .build();
```

Graph checkpoint 可以继续保存工作流状态。已经由 Session Advisor 加载历史时，节点输入保持为当前请求，可避免把整段历史送入模型两次。

[可运行的 MemoryExample](https://github.com/alibaba/spring-ai-alibaba/blob/e01219fd20ecfff2dd9d1a1facfe58e5349c3e07/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/MemoryExample.java)
