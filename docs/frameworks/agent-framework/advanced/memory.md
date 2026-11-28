---
title: Agent 记忆管理
description: 使用 ReactAgent 的 checkpoint 延续同一会话，为 Agent 配置按作用域隔离的跨会话召回与显式写入。
keywords: [Agent Memory, ReactAgent, Checkpoint, Store, LongTermMemoryTools, 记忆管理]
---

# Agent 记忆管理

| 要解决的问题 | 使用的能力 | 作用域 |
| --- | --- | --- |
| 继续聊天或恢复暂停的工具 | Graph checkpoint | 同一 `threadId` |
| 控制模型读取的历史长度 | 请求编辑或 checkpoint 摘要 | 单次请求或同一线程 |
| 在新会话读取用户偏好 | `Store` 与 `LongTermMemoryTools` | 应用授权的命名空间 |
| 保存、更正和删除语言或回复格式 | `PreferenceMemory` | 应用授权的命名空间及偏好键 |
| 管理直接使用 ChatClient 的对话 | Spring AI Session Memory | 同一 `sessionId` |

对于需要重启后继续的会话，可以[在 checkpoint 中保存摘要和归档引用](./context-engineering.md#checkpoint-and-archive)。如果需要让模型自行搜索并读取当前身份可访问的资料，可以[注册按需长期记忆工具](./context-engineering.md#skills-and-memory)。

[会话记忆入门](../tutorials/memory.md) · [上下文工程](./context-engineering.md)

## 线程状态与上下文窗口

`ReactAgent` 使用 Graph state 中的 `messages` 和其他状态键。配置 saver 后，同一 `threadId` 的新调用继承工作流状态。审批完成后继续待执行的工具时，沿用同一线程并按中断记录提交反馈。应用负责校验线程归属，在线程、租户和用户之间建立稳定映射。

模型上下文过长时，先明确需要控制的范围。

| 目标 | 用法 | 行为 |
| --- | --- | --- |
| 缩短本次输入 | `ContextEditingInterceptor` 或自定义 `ModelInterceptor` | 编辑模型请求的视图。后续步骤仍可从 Graph state 读取历史。 |
| 后续模型调用沿用旧轮次摘要 | `CheckpointContextCompaction` | 达到阈值时尝试总结已完成的旧轮次，保存摘要记录。原历史仍由 checkpoint 保留。 |
| 修改后续步骤读取的消息状态 | `MessagesModelHook` 与 `UpdatePolicy.REPLACE` | 显式替换当前 `messages`。旧检查点和归档按各自的保留策略管理。 |

请求编辑和状态替换都要保留必要的指令、当前用户请求，以及工具调用和对应的全部结果。待执行或待审批的工具仍需要原始调用上下文。为模型单独设置输入预算。摘要的触发阈值决定何时尝试生成摘要，模型预算决定请求能否发送。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.context.CheckpointContextCompaction;
import com.alibaba.cloud.ai.graph.checkpoint.savers.file.FileSystemSaver;

var compaction = CheckpointContextCompaction.builder(summarizer, 6000)
    .keepRecentTurns(2)
    .build();
var agent = ReactAgent.builder()
    .name("support")
    .model(chatModel)
    .saver(FileSystemSaver.builder().targetFolder(checkpointDir).build())
    .checkpointContextCompaction(compaction)
    .build();
```

`summarizer` 是用于生成摘要的 `ChatModel`，`checkpointDir` 是用于在本地重启后续跑的目录。多实例部署时，根据部署拓扑选择持久化 saver，并串行处理同一线程的执行。大工具结果可用 `ToolResultArchive` 保存，再用 `read_archived_tool_result` 回读引用。归档访问与跨会话偏好访问分别授权。

[人工审批与恢复](./human-in-the-loop.md) · [压缩、归档和按需加载示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextManagementRecipes.java)

### 在工具中读写线程状态

用 `ToolContextHelper.getState(toolContext)` 查看工具执行时的状态，通过 `getStateForUpdate(toolContext)` 提交变更。在 Hook 的 `getKeyStrategys()` 中为自定义键注册合并规则，例如为 `notes` 注册 `AppendStrategy`。工具节点会随工具结果提交成功的更新，失败工具的暂存更新会被丢弃。并行工具的同键更新按注册的策略和调用顺序合并。串行工具在同批次对同一个键的更新保留最后一次成功更新。

重建 Agent 后，可用 `agent.getCurrentState(config)` 查看 checkpoint 中的状态。操作前验证 `threadId` 归属。[线程笔记和审批示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MemoryExample.java)

## 在新会话中按需读取记忆

`StoreItem` 用命名空间和业务键标识结构化文档。下面的例子为支持业务保存语言偏好。同一用户的两个线程使用同一份偏好。另一个用户拥有独立的命名空间。

示例中的 `tenantId`、`userId` 来自应用认证和授权结果，`firstThreadId`、`secondThreadId` 是由应用生成并验证归属的两个内部线程 ID。

```java
import java.util.List;
import java.util.Map;

import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.memory.LongTermMemoryTools;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.store.StoreItem;
import com.alibaba.cloud.ai.graph.store.stores.MemoryStore;

var store = new MemoryStore();
var namespace = List.of(tenantId, "support", userId, "preferences");
store.putItem(StoreItem.of(namespace, "reply_language", Map.of("language", "中文")));

var memory = LongTermMemoryTools.builder()
    .store(store)
    .namespace(config -> config.metadata("tenantId")
        .filter(String.class::isInstance).map(String.class::cast)
        .filter(tenant -> !tenant.isBlank())
        .flatMap(tenant -> config.metadata("userId")
            .filter(String.class::isInstance).map(String.class::cast)
            .filter(user -> !user.isBlank())
            .map(user -> List.of(tenant, "support", user, "preferences")))
        .orElseGet(List::of))
    .maxSearchResults(5)
    .pageCharacters(1024)
    .maxCallsPerToolPerTurn(8)
    .build();

var agent = ReactAgent.builder()
    .name("support")
    .model(chatModel)
    .saver(new MemorySaver())
    .tools(memory.tools())
    .build();

var first = RunnableConfig.builder().threadId(firstThreadId)
    .addMetadata("tenantId", tenantId).addMetadata("userId", userId).build();
var second = RunnableConfig.builder().threadId(secondThreadId)
    .addMetadata("tenantId", tenantId).addMetadata("userId", userId).build();

agent.call("我正在处理 Atlas 项目的工单。", first);
var reply = agent.call("请读取我的 reply_language 偏好，再用该语言回复。", second);
```

`search_memory` 根据文本查询返回有限数量的键。内置工具按键排序，匹配方式由所用 Store 决定。使用 `MemoryStore` 时，查询匹配键或值中的文本。`read_memory` 接收键和可选 `offset`，返回 `content` 和可用于续读的 `nextOffset`。已知业务键时可以直接调用读取工具。应用需要确定性读取的配置时，可直接用 `Store.getItem(namespace, key)`，再把所需字段作为当前请求的数据传给模型。

工具在每次调用时解析精确命名空间，缺少有效身份时返回空命名空间即可拒绝访问。将租户、业务域和用户 ID 放在独立的命名空间片段中。片段不能包含斜杠、反斜杠或控制字符，也不能使用 `.` 或 `..`。使用 `RunnableConfig.builder().store(store)` 按调用注入后端时，可以省略工具 Builder 的 `.store(store)`。子 Agent 需要应用授予的身份和可用工具。按[子 Agent 委派](./agent-tool.md)传递允许的上下文。

`maxQueryCharacters` 限制单次搜索的长度，默认 1024 个 UTF-16 代码单元。`maxCallsPerToolPerTurn` 分别限制每轮的搜索次数与读取次数，并与 Agent 的 `toolCallLimits` 共同生效。审批恢复继续沿用同一轮的计数。页面大小限制单次读取结果，最后进入模型的内容仍受模型请求预算约束。

搜索未命中时返回空列表。读取不存在的键时返回条目不可用。存储或作用域解析发生异常时，工具返回暂时不可用，模型可以继续当前任务。可通过 `.observationRegistry(registry)` 记录 `saa.agent.memory` 的操作耗时和结果类别。观测上下文提供命中数量、页大小及分页状态，诊断不包含查询文本、记忆正文或身份。

`MemoryStore` 和 `MemorySaver` 都在进程内保存数据。需要在进程重启后保留两类记忆时，分别配置持久化 Store 和 saver。

## 显式保存、更正和删除偏好

使用 `PreferenceMemory` 保存用户明确选择的语言和回复格式。应用通过可信运行配置解析命名空间并授予读写权限。同一个用户换线程后仍可读取当前值。

| 偏好键 | 工具参数 | 允许值 |
| --- | --- | --- |
| `REPLY_LANGUAGE` | `reply_language` | 默认允许 `zh-CN` 和 `en-US`，可用 `languageTags(...)` 配置应用的允许列表。 |
| `REPLY_FORMAT` | `reply_format` | `paragraphs`、`bullets` 和 `markdown`。 |

### 配置数据源和授权

传入可开独立 JDBC 连接的 PostgreSQL 或 H2 `DataSource`，并在应用初始化或迁移时调用 `initializeSchema()` 创建偏好和操作回执表。`authenticatedNamespace` 从应用验证的租户和用户身份派生命名空间。`canChangePreferences` 按当前权限授权每次变更。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.memory.PreferenceMemory;
import com.alibaba.cloud.ai.graph.agent.memory.PreferenceMemory.ToolWritePermit;

var preferences = PreferenceMemory.builder(dataSource)
    .namespace(authenticatedNamespace)
    .authorizeWrites(canChangePreferences)
    .toolWritePermit(run -> run.metadata("approvedPreferenceWrite")
        .filter(ToolWritePermit.class::isInstance).map(ToolWritePermit.class::cast)
        .orElse(null))
    .build();
preferences.initializeSchema();

var agent = ReactAgent.builder()
    .name("support")
    .model(chatModel)
    .saver(checkpointSaver)
    .tools(preferences.tools())
    .build();
```

将 `preferences.tools()` 注册给 Agent，即可调用 `read_preference` 读取固定业务键的值和版本。配置 `toolWritePermit(...)` 后，还会注册需要人工审批的 `save_preference`。应用也可以直接调用 Java API 管理偏好。

### 通过应用发起保存、更正和删除

在界面上读取当前值时保留其版本。用户确认保存或更正时，传入该版本以及本次操作的唯一 ID。以下调用展示两种偏好的保存、跨线程读取、更正和删除。应用收到每项回执后，根据状态决定如何响应。

```java
import static com.alibaba.cloud.ai.graph.agent.memory.PreferenceMemory.Key.REPLY_FORMAT;
import static com.alibaba.cloud.ai.graph.agent.memory.PreferenceMemory.Key.REPLY_LANGUAGE;

var languageSaved = preferences.save(writeConfig, REPLY_LANGUAGE, "zh-CN",
    displayedLanguageVersion, saveLanguageId);
var formatSaved = preferences.save(writeConfig, REPLY_FORMAT, "bullets",
    displayedFormatVersion, saveFormatId);

var language = preferences.read(otherThreadConfig, REPLY_LANGUAGE);
var format = preferences.read(otherThreadConfig, REPLY_FORMAT);
var corrected = preferences.save(writeConfig, REPLY_LANGUAGE, "en-US",
    language.version(), correctLanguageId);
var deleted = preferences.delete(writeConfig, REPLY_FORMAT, format.version(), deleteFormatId);
```

- `SAVED` 和 `DELETED` 表示数据库已经提交。重试同一操作时复用原 ID、原版本和原参数。`replayed=true` 表示这是原操作的回执。读取当前偏好以确认后来发生的更正或删除。
- `VERSION_CONFLICT` 表示偏好在本次操作提交前已变化。读取最新版本，取得用户确认后，用新的操作 ID 提交更正。`OPERATION_CONFLICT` 表示同一作用域内已有操作使用该 ID，但参数不同。
- 版本 `0` 表示该偏好从未变更。删除会清除当前值并递增版本，保留删除版本与幂等回执。旧版本的变更无法把已删除的值写回。

读取接口会立即反映已经提交的更正和删除。已出现在旧线程中的工具结果继续由该线程的 checkpoint 保留策略管理。

### 审批工具保存与失败恢复

Agent 收到用户明确保存偏好的请求并调用 `save_preference` 后，会暂停等待审批。应用先验证线程归属及审核者权限，再从已保存的中断选出待审批调用。下面展示只有一项待审的批次。应用应在保存审核决定时，为该操作生成并保留稳定的 `operationId`，复跑时复用原许可的数据。需要跨进程恢复时，为 Agent 配置持久化 `checkpointSaver`。

```java
import java.util.List;
import java.util.Map;

import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata.ToolFeedback;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata.ToolFeedback.FeedbackResult;

var pending = agent.getPendingInterruption(threadConfig).orElseThrow();
var approved = ToolFeedback.builder(pending.toolFeedbacks().get(0))
    .result(FeedbackResult.APPROVED).build();
var permit = preferences.permitSave(threadConfig, pending, approved, operationId);
var authorized = RunnableConfig.builder(threadConfig)
    .addMetadata("approvedPreferenceWrite", permit).build();
var feedback = InterruptionMetadata.builder(pending).toolFeedbacks(List.of(approved)).build();
var output = agent.invokeAndGetOutput(Map.of(),
    RunnableConfig.builder(authorized).addHumanFeedback(feedback).build());
```

许可绑定已审参数、线程、执行 ID、工具调用 ID 和命名空间。工具执行及恢复时会再次检查当前写权限。撤销权限或切换主体后，旧许可无法继续写入。

偏好更新与操作回执在同一数据库事务中提交。Graph 使用自己的检查点。若偏好已提交、工具检查点保存失败，按当前权限重建运行配置并从审核记录恢复原许可，再从最新检查点以空输入调用 `withResume()`。再次执行工具会返回原回执，期间其他线程提交的更正或删除继续有效。应用按回执的状态确认保存结果。[人工审批与恢复](./human-in-the-loop.md)

通用 `LongTermMemoryTools` 仍可读取已有 Store 记录。使用 `PreferenceMemory` 接管偏好时，由应用校验旧值，再通过显式保存 API 导入。

[RAG 与知识库](./rag.md) · [Graph Store 与 checkpoint](../../graph-core/core/memory.md)

