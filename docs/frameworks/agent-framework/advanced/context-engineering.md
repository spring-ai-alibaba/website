---
title: 上下文工程（Context Engineering）
description: 管理 Agent 的模型预算、会话压缩、工具归档、按需加载和子 Agent 上下文
keywords:
  [
    上下文工程,
    Context Engineering,
    Agent可靠性,
    模型上下文,
    工具上下文,
    生命周期上下文,
    LLM优化,
  ]
---

## 概述

构建 Agent 的难点在于使其足够可靠、效果足够好。虽然我们可以很容易写一个 Agent 示例，但要做一个能在生产环境中稳定使用、能解决实际问题的 Agent 并不容易。

### 为什么 Agent 会失败？

当 Agent 失败时，通常是因为 Agent 内部的 LLM 调用采取了错误的操作或者没有按我们预期的执行。LLM 失败的原因有两个：

1. 底层 LLM 能力不足
2. 没有向 LLM 传递"正确"的上下文

大多数情况下 —— 实际上是第二个原因导致 Agent 不可靠。

**上下文工程**是以正确的格式提供正确的信息和工具，使 LLM 能够完成任务。这是 AI 工程师的首要工作。缺乏"正确"的上下文是更可靠 Agent 的头号障碍，Spring AI Alibaba 的 Agent 抽象专门设计用于优化上下文工程。

### Agent 循环

典型的 Agent 循环由两个主要步骤组成：

1. **模型调用** - 使用提示和可用工具调用 LLM，返回响应或执行工具的请求
2. **工具执行** - 执行 LLM 请求的工具，返回工具结果

![reactagent](/img/agent/agents/reactagent.png)

此循环持续进行，直到 LLM 决定任务完成并退出。

### 你可以控制什么

要构建可靠的 Agent，你需要控制 Agent 循环每个步骤发生的事情，以及步骤之间发生的事情。

| 上下文类型                               | 你控制的内容                                                | 瞬态或持久 |
| ---------------------------------------- | ----------------------------------------------------------- | ---------- |
| **[模型上下文](#模型上下文model-context)**         | 模型调用中包含什么（指令、消息历史、工具、响应格式） | 单次请求 |
| **[工具上下文](#工具上下文tool-context)**          | 工具可以访问和产生什么（对状态、存储、运行时上下文的读/写） | 由数据载体决定 |
| **[生命周期上下文](#生命周期上下文lifecycle-context)** | 模型和工具调用之间发生什么（摘要、防护栏、日志等） | 由数据载体决定 |

> - 瞬态上下文。LLM 在单次调用中看到的内容。你可以修改消息、工具或提示，而不改变状态中保存的内容。
> - 持久上下文。跨轮次保存在状态中的内容。生命周期钩子和工具写入会永久修改它。

### 数据源

在整个过程中，你的 Agent 访问（读/写）不同的数据源：

| 数据源            | 别名     | 范围     | 示例                                          |
| ----------------- | -------- | -------- | --------------------------------------------- |
| **运行时上下文**  | 调用参数 | 本次调用 | 已认证的用户 ID、业务域、权限或运行配置 |
| **状态（State）** | 短期记忆 | 线程范围 | 当前消息、业务进度、工具结果 |
| **存储（Store）** | 长期记忆 | 跨会话   | 用户偏好、提取的见解、记忆、历史数据          |

### 工作原理

在 Spring AI Alibaba 中，**Hook**和**Interceptor**是实现上下文工程的机制。

它们允许你挂接到 Agent 生命周期的任何步骤并：

- 更新上下文
- 跳转到 Agent 生命周期的不同步骤

在本指南中，你将看到频繁使用 Hook 和 Interceptor API 作为上下文工程的手段。

## 管理上下文窗口和会话状态 {#context-management}

将模型请求、会话状态、运行时配置和长期存储分别配置，便于在缩小模型输入的同时保留恢复所需的数据。

| 需求 | 配置 | 生效范围 |
| --- | --- | --- |
| 模型容量、路由与回退 | `ModelCapacity`、`ContextWindowPolicy`、`ModelRoutingPolicy`、`ModelFallbackInterceptor` | 每次实际模型调用 |
| 压缩旧对话 | `CheckpointContextCompaction` 和 checkpoint saver | 同一会话的后续模型请求 |
| 归档长工具结果 | `ToolResultArchive` 和 Store | 按所有者、会话和 Agent 隔离 |
| 控制发送给模型的工具 | `ToolSelectionInterceptor` 和 `DeferredToolCatalog` | 单次请求的筛选与当前执行的工具加载 |
| 委派任务 | `AgentToolContext` | 单次子 Agent 委派 |
| 按需读取知识 | `SkillsAgentHook` 和 `LongTermMemoryTools` | 已注册的 Skills 和应用解析的记忆命名空间 |

### 为不同模型设置预算和回退 {#capacity-routing-fallback}

按实际部署配置共享上下文窗口、独立输入上限和输出预留。框架使用独立输入上限与扣除输出预算后的窗口大小中较小的值，在系统提示、消息、工具定义和 Advisor 变更生效后校验最终输入。例如，下面用两个不同预算配置同一 Agent。

```java
var compactBudget = ContextWindowPolicy.builder(new ModelCapacity(8192, 6000, 1024)).build();
var wideBudget = ContextWindowPolicy.builder(new ModelCapacity(32768, 24000, 2048)).build();

var routing = ModelRoutingPolicy.builder("general")
    .route("general", new ModelTarget(wideModel, wideBudget))
    .route("compact", new ModelTarget(compactModel, compactBudget))
    .selector(request -> "inventory".equals(request.getContext().get("workload"))
        ? "compact" : "general")
    .build();

var agent = ReactAgent.builder()
    .name("inventory")
    .modelRouting(routing)
    .interceptors(ModelFallbackInterceptor.builder()
        .addFallbackModel(wideModel, wideBudget)
        .build())
    .build();
```

路由在本次执行中选定，暂停恢复时沿用已保存的路由。回退模型按自己的原生选项和预算重新组装请求。如果主模型输入超限，备用模型需要显式配置预算才能接手。流式调用只在首个响应片段发出前回退。

应用可以通过 `inputOverflowDetector` 识别适配器返回的窗口超限异常。以 Spring AI 原生 OpenAI Chat Completions 为例，可匹配异常原因链中的 `OpenAIServiceException` 和 `context_length_exceeded`。在同一模型上重试之前，框架要求能生成更小的请求，且最多重试一次。

### 保存摘要和归档工具结果 {#checkpoint-and-archive}

为 Agent 配置 saver、旧轮次压缩策略和归档 Store。压缩触发阈值用于决定何时尝试生成摘要，模型输入的硬上限仍由模型预算控制。

```java
var archive = ToolResultArchive.builder(new FileSystemStore(dataDir.resolve("archives")))
    .ownerScope(config -> config.metadata("tenant").filter(String.class::isInstance)
        .map(String.class::cast).orElse(""))
    .thresholdChars(4000)
    .pageSizeChars(1000)
    .build();

var agent = ReactAgent.builder()
    .name("inventory")
    .model(model)
    .saver(FileSystemSaver.builder().targetFolder(dataDir.resolve("checkpoints")).build())
    .checkpointContextCompaction(CheckpointContextCompaction.builder(summarizer, 6000)
        .keepRecentTurns(2)
        .build())
    .toolResultArchive(archive)
    .build();

var config = RunnableConfig.builder()
    .threadId(threadId)
    .addMetadata("tenant", authenticatedTenant)
    .build();
```

- 压缩只处理已完成的旧轮次，保留最近轮次及工具调用与结果的配对。checkpoint 仍保存原始历史、摘要和重建模型输入所需的锚点。
- 归档写入成功后，模型收到预览和引用。调用 `read_archived_tool_result` 时传入 `reference` 和 `page`，从第 1 页读取并跟随返回的 `nextPage`。
- 应用重建 Agent 后，使用同一个 `threadId`、所有者及持久化目录即可继续会话。审批暂停时，传入从中断记录生成的反馈和空输入来继续待执行任务。详见[人工审批与恢复](./human-in-the-loop.md)。

### 先发现工具，再加载定义 {#deferred-tools}

向 `DeferredToolCatalog` 注册名称、描述和回调工厂。首次请求提供常驻工具，以及目录的 `search_tools` 和 `load_tools` 入口。模型先用描述搜索，加载后才在后续请求中看到延迟工具的定义。加载状态属于当前执行，不同任务可以分别选择需要的工具。

```java
var catalog = DeferredToolCatalog.builder()
    .tool("inventory_lookup", "查询库存明细", inventoryCallbackFactory)
    .build();
var selector = ToolSelectionInterceptor.builder()
    .selectionModel(selectionModel)
    .maxTools(4)
    .maxToolSchemaTokens(2000)
    .alwaysInclude(ToolResultArchive.READ_TOOL_NAME)
    .build();

var agent = ReactAgent.builder()
    .name("inventory")
    .model(model)
    .toolResultArchive(archive)
    .deferredTools(catalog)
    .interceptors(selector)
    .build();
```

选择器按相关性筛选可用工具，并保留已配置的必选工具和发现入口。工具定义的预算是估算值，所有最终输入仍受模型窗口限制。在同一批工具调用中，刚完成加载的工具要等到下一次模型请求绑定后才可执行。

### 隔离子 Agent 的上下文 {#delegated-context}

使用 `AgentTool.create(child)` 时，子 Agent 从独立执行开始，模型收到委派任务和子 Agent 自己的指令。若业务需要共享数据，在注册工具时明确列出状态键、运行时元数据和回传字段。

```java
var delegation = AgentToolContext.builder()
    .stateKeys("case_id")
    .metadataKeys("tenant")
    .outputKeys("review")
    .maxContextCharacters(4096)
    .build();
var analystTool = AgentTool.create(analyst, delegation);
```

这里的 `case_id` 作为参考数据进入子 Agent 的请求和图状态，`tenant` 供子 Agent 的运行时使用。父 Agent 通过工具结果接收最终答案和已选输出，子 Agent 的中间消息仍保存在自己的会话。详见[将子 Agent 注册为工具](./agent-tool.md)。

### 按需加载 Skills 和长期记忆 {#skills-and-memory}

```java
var skills = SkillsAgentHook.builder()
    .skillRegistry(registry)
    .onDemand(5, 2048)
    .build();

var memoryTools = LongTermMemoryTools.builder()
    .store(memoryStore)
    .namespace(config -> config.metadata("tenant").filter(String.class::isInstance)
        .map(String.class::cast)
        .map(tenant -> List.of("inventory", tenant))
        .orElseGet(List::of))
    .maxSearchResults(5)
    .pageCharacters(2048)
    .build();

var analyst = ReactAgent.builder()
    .name("inventory_analyst")
    .model(model)
    .hooks(List.of(skills))
    .tools(memoryTools.tools())
    .outputKey("review")
    .build();
```

启用按需模式后，`search_skills` 返回简短描述，`read_skill` 按已注册名称读取正文。成功读取可激活当前执行的关联工具。长期记忆的 `search_memory` 返回键，`read_memory` 在应用确定的精确命名空间内读取。两类正文工具都返回 `nextOffset` 供续读。命名空间应从应用认证得到的身份解析，缺少身份时返回空列表即可拒绝访问。

### 运行可重复的示例 {#run-context-examples}

从 Spring AI Alibaba 仓库根目录运行分项示例，依次验证模型预算回退、checkpoint 和归档回读，以及子 Agent 对按需上下文的访问。示例使用本地模型响应，无需配置 API 密钥。

```bash
mvn -B -pl :spring-ai-alibaba-bom,:spring-ai-alibaba-agent-framework -am -DskipTests install
mvn -B -f examples/documentation/pom.xml -Dtest=ContextManagementRecipesTest test
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextManagementRecipes.java) · [运行说明](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation#context-management-recipes)

## 模型上下文（Model Context）

控制每次模型调用中包含的内容——指令、可用工具、使用哪个模型以及输出格式。这些决策直接影响可靠性和成本。

<div class="card-group" cols="2">
  <div class="card">
    <div class="card__header">
      <div class="card__icon">💬</div>
      <div class="card__title">系统提示</div>
    </div>
    <div class="card__body">开发者对LLM的基础指令。</div>
  </div>

  <div class="card">
    <div class="card__header">
      <div class="card__icon">💭</div>
      <div class="card__title">消息</div>
    </div>
    <div class="card__body">发送给LLM的完整消息列表（对话历史）。</div>
  </div>

  <div class="card">
    <div class="card__header">
      <div class="card__icon">🔧</div>
      <div class="card__title">工具</div>
    </div>
    <div class="card__body">Agent可以访问以采取行动的工具。</div>
  </div>

  <div class="card">
    <div class="card__header">
      <div class="card__icon">🧠</div>
      <div class="card__title">模型</div>
    </div>
    <div class="card__body">要调用的实际模型（包括配置）。</div>
  </div>

  <div class="card">
    <div class="card__header">
      <div class="card__icon">📋</div>
      <div class="card__title">响应格式</div>
    </div>
    <div class="card__body">模型最终响应的架构规范。</div>
  </div>
</div>

所有这些类型的模型上下文都可以从**状态**（短期记忆）、**存储**（长期记忆）或**运行时上下文**（静态配置）中获取。

### 系统提示（System Prompt）

系统提示设置 LLM 的行为和能力。不同的用户、上下文或对话阶段需要不同的指令。成功的 Agent 利用记忆、偏好和配置为对话的当前状态提供正确的指令。

#### 基于状态的动态提示

<Code
  language="java"
  title="基于状态的动态提示示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelInterceptor;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelRequest;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelResponse;
import org.springframework.ai.chat.messages.Message;

// 创建一个模型拦截器，根据对话长度调整系统提示
class StateAwarePromptInterceptor extends ModelInterceptor {
    @Override
    public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
        List<Message> messages = request.getMessages();
        int messageCount = messages.size();

        // 基础提示
        String basePrompt = "你是一个有用的助手。";

        // 根据消息数量调整提示
        if (messageCount > 10) {
            basePrompt += "\n这是一个长对话 - 请尽量保持精准简捷。";
        }

        // 更新系统消息（参考 TodoListInterceptor 的实现方式）
        SystemMessage enhancedSystemMessage;
        if (request.getSystemMessage() == null) {
            enhancedSystemMessage = new SystemMessage(basePrompt);
        } else {
            enhancedSystemMessage = new SystemMessage(
                request.getSystemMessage().getText() + "\n\n" + basePrompt
            );
        }

        // 创建增强的请求
        ModelRequest enhancedRequest = ModelRequest.builder(request)
            .systemMessage(enhancedSystemMessage)
            .build();

        // 调用处理器
        return handler.call(enhancedRequest);
    }

    @Override
    public String getName() {
        return "StateAwarePromptInterceptor";
    }
}

// 使用拦截器创建Agent
ReactAgent agent = ReactAgent.builder()
    .name("context_aware_agent")
    .model(chatModel)
    .interceptors(new StateAwarePromptInterceptor())
    .build();`}
</Code>

#### 基于存储的个性化提示

对于语言、回复格式等已知业务键，可以从应用认证结果派生命名空间，使用 `Store.getItem(namespace, key)` 读取，并把允许的结构化字段转换为本次请求的参考数据。设置字段和长度上限，让最终请求的预算覆盖这些内容。应用配置继续提供系统指令。

需要模型根据任务选择记忆时，注册 `LongTermMemoryTools`，让模型先搜索键，再按需读取数据。读写示例和命名空间规则见 [Agent 记忆管理](./memory.md)。

### 消息历史（Messages）

控制发送给 LLM 的消息列表。你可以：

- 过滤或修改消息
- 添加上下文或摘要
- 压缩长对话

#### 消息过滤

> 请注意这里的消息过滤只对当前这一次调用有效，不会影响整体持久存储的短期记忆，也就是下次推理调用过程不会感知到这里的过滤动作。

<Code
  language="java"
  title="MessageFilterInterceptor 消息过滤示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`class MessageFilterInterceptor extends ModelInterceptor {
    private final int maxMessages;

    public MessageFilterInterceptor(int maxMessages) {
        this.maxMessages = maxMessages;
    }

    @Override
    public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
        List<Message> messages = request.getMessages();

        // 只保留最近的N条消息
        if (messages.size() > maxMessages) {
            List<Message> filtered = new ArrayList<>();

            // 添加系统消息
            messages.stream()
                .filter(m -> m instanceof SystemMessage)
                .findFirst()
                .ifPresent(filtered::add);

            // 添加最近的消息
            int startIndex = Math.max(0, messages.size() - maxMessages + 1);
            filtered.addAll(messages.subList(startIndex, messages.size()));

            messages = filtered;
        }

        ModelRequest enhancedRequest = ModelRequest.builder(request)
            .messages(messages)
            .build();

        return handler.call(enhancedRequest);
    }

    @Override
    public String getName() {
        return "MessageFilterInterceptor";
    }
}`}
</Code>

> **瞬时消息更新 VS 持久消息更新**
>
> 1. 上述示例使用 `ModelInterceptor` 来实现临时更新 —— 修改单次调用时发送给模型的消息内容，而不会改变状态中保存的数据。
> 2. 对于需要持久更新状态的情况（例如生命周期上下文中的摘要示例），请使用如 ModelHook 等生命周期钩子来永久更新对话历史。更多详情请参阅 Hook & Interceptor 文档。

### 工具（Tools）

动态控制 Agent 可以访问哪些工具。

#### 基于上下文的工具选择

<Code
  language="java"
  title="ContextualToolInterceptor 基于上下文的工具选择示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`class ContextualToolInterceptor extends ModelInterceptor {
    private final Map<String, List<ToolCallback>> roleBasedTools;

    public ContextualToolInterceptor(Map<String, List<ToolCallback>> roleBasedTools) {
        this.roleBasedTools = roleBasedTools;
    }

    @Override
    public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
        // 从上下文获取用户角色
        String userRole = getUserRole(request);

        // 根据角色选择工具
        List<ToolCallback> allowedTools = roleBasedTools.getOrDefault(
            userRole,
            Collections.emptyList()
        );

        // 更新工具选项（注：实际实现需要根据框架API调整）
        // 这里展示概念性代码
        System.out.println("为角色 " + userRole + " 选择了 " + allowedTools.size() + " 个工具");

        return handler.call(request);
    }

    private String getUserRole(ModelRequest request) {
        // 从请求上下文提取用户角色
        return "user"; // 简化示例
    }

    @Override
    public String getName() {
        return "ContextualToolInterceptor";
    }
}

// 配置基于角色的工具
Map<String, List<ToolCallback>> roleTools = Map.of(
    "admin", List.of(readTool, writeTool, deleteTool),
    "user", List.of(readTool),
    "guest", List.of()
);

ReactAgent agent = ReactAgent.builder()
    .name("role_based_agent")
    .model(chatModel)
    .interceptors(new ContextualToolInterceptor(roleTools))
    .build();`}
</Code>

### 模型选择（Model）

根据任务复杂度、运行时标识或用户偏好选择模型时，用 `ModelRoutingPolicy` 注册目标和各自的预算。选择器返回已注册的路由名，框架在同一请求链上调用目标模型。[模型容量、路由与回退配置](#capacity-routing-fallback)

### 响应格式（Response Format）

使用结构化输出控制模型响应格式。

<Code
  language="java"
  title="响应格式控制示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`// 在Agent级别设置输出格式
ReactAgent agent = ReactAgent.builder()
    .name("structured_agent")
    .model(chatModel)
    .outputType(MyResponseClass.class) // 或 .outputSchema(jsonSchema)
    .build();

// 也可以在Interceptor中动态调整
class DynamicFormatInterceptor extends ModelInterceptor {
    @Override
    public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
        // 根据请求内容决定输出格式
        String outputSchema = determineOutputSchema(request);

        // 在消息中添加格式说明
        List<Message> updatedMessages = addFormatInstructions(
            request.getMessages(),
            outputSchema
        );

        ModelRequest enhancedRequest = ModelRequest.builder(request)
            .messages(updatedMessages)
            .build();

        return handler.call(enhancedRequest);
    }

    private String determineOutputSchema(ModelRequest request) {
        // 实现输出格式决定逻辑
        return "";
    }

    private List<Message> addFormatInstructions(List<Message> messages, String schema) {
        // 实现格式说明添加逻辑
        return messages;
    }

    @Override
    public String getName() {
        return "DynamicFormatInterceptor";
    }
}`}
</Code>

## 工具上下文（Tool Context）

控制工具可以访问和修改的内容。

### 工具中访问状态

<Code
  language="java"
  title="StatefulTool 工具中访问状态示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`class StatefulTool implements Function<StatefulTool.Request, StatefulTool.Response> {
    public record Request(String query) {}
    public record Response(String result) {}

    @Override
    public Response apply(Request request, ToolContext toolContext) {
        // 从 Agent 持久状态读取信息
        OverAllState currentState = (OverAllState) toolContext.getContext().get("state");
        // 'messages' can be any key persisted in short memory
        Optional<Object> messages = currentState.value("messages");

        // 从 Agent 运行上下文读取信息
        RunnableConfig config = (RunnableConfig) toolContext.getContext().get("config");
        Optional<Object> userContext = config.metadata("user_context_key");

        // 使用状态信息处理请求
        String result = processWithContext(request.query(), messages, userContext);

        return new Response(result);
    }

    private String processWithContext(String query, Optional<Object> messages, Optional<Object> userContext) {
        // 实现处理逻辑
        return "处理结果";
    }
}`}
</Code>

### 工具修改状态

<Code
  language="java"
  title="StateModifyingTool 工具修改状态示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`class StateModifyingTool implements Function<StateModifyingTool.Request, StateModifyingTool.Response> {
    public record Request(String data) {}
    public record Response(String status) {}

    @Override
    public Response apply(Request request, ToolContext toolContext) {
        // 从 Agent 持久状态读取信息
        Map<String, Object> extraState = (Map<String, Object>) toolContext.getContext().get("extraState");

        // 处理数据
        String processed = process(request.data());

        // extraState 是一个特殊设计，更新到 extraState 中的值会被持久化到 State 状态中，并被后续的 Loop 节点看到。
        extraState.put("processed_data", processed);

        return new Response("数据已处理并保存到状态");
    }

    private String process(String data) {
        // 实现处理逻辑
        return "处理后的数据";
    }
}`}
</Code>

## 生命周期上下文（Lifecycle Context）

使用 Hook 在 Agent 生命周期的不同阶段执行操作。

### Hook 位置

Spring AI Alibaba 支持以下 Hook 位置：

- `BEFORE_AGENT` - Agent 开始之前
- `AFTER_AGENT` - Agent 完成之后
- `BEFORE_MODEL` - 模型调用之前
- `AFTER_MODEL` - 模型调用之后

### 自定义 Hook 示例

<Code
  language="java"
  title="LoggingHook 自定义Hook示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`import com.alibaba.cloud.ai.graph.agent.hook.Hook;
import com.alibaba.cloud.ai.graph.agent.hook.HookPosition;
import com.alibaba.cloud.ai.graph.agent.hook.ModelHook;

class LoggingHook extends ModelHook {
    @Override
    public String getName() {
        return "logging_hook";
    }

    @Override
    public HookPosition[] getHookPositions() {
        return new HookPosition[]{
            HookPosition.BEFORE_MODEL,
            HookPosition.AFTER_MODEL
        };
    }

    @Override
    public CompletableFuture<Map<String, Object>> beforeModel(OverAllState state, RunnableConfig config) {
        // 在模型调用前记录
        List<?> messages = (List<?>) state.value("messages").orElse(List.of());
        System.out.println("模型调用前 - 消息数: " + messages.size());
        return CompletableFuture.completedFuture(Map.of());
    }

    @Override
    public CompletableFuture<Map<String, Object>> afterModel(OverAllState state, RunnableConfig config) {
        // 在模型调用后记录
        System.out.println("模型调用后 - 响应已生成");
        return CompletableFuture.completedFuture(Map.of());
    }
}

// 使用Hook
ReactAgent agent = ReactAgent.builder()
    .name("logged_agent")
    .model(chatModel)
    .hooks(new LoggingHook())
    .build();`}
</Code>

### 消息摘要 Hook

如果需要保留原始历史并在重建 Agent 后继续使用摘要，使用[基于 checkpoint 的会话压缩](#checkpoint-and-archive)。

<Code
  language="java"
  title="SummarizationHook 消息摘要Hook示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/ContextEngineeringExample.java"
>
{`import com.alibaba.cloud.ai.graph.agent.hook.HookPosition;
import com.alibaba.cloud.ai.graph.agent.hook.HookPositions;
import com.alibaba.cloud.ai.graph.agent.hook.messages.AgentCommand;
import com.alibaba.cloud.ai.graph.agent.hook.messages.MessagesModelHook;
import com.alibaba.cloud.ai.graph.agent.hook.messages.UpdatePolicy;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@HookPositions({HookPosition.BEFORE_MODEL})
class SummarizationHook extends MessagesModelHook {
    private final ChatModel summarizationModel;
    private final int triggerLength;

    public SummarizationHook(ChatModel model, int triggerLength) {
        this.summarizationModel = model;
        this.triggerLength = triggerLength;
    }

    @Override
    public String getName() {
        return "summarization_hook";
    }

    @Override
    public AgentCommand beforeModel(List<Message> previousMessages, RunnableConfig config) {
        if (previousMessages.size() > triggerLength) {
            // 生成对话摘要
            String summary = generateSummary(previousMessages);

            // 查找是否已存在 SystemMessage（保留它，不修改）
            SystemMessage existingSystemMessage = null;
            for (Message msg : previousMessages) {
                if (msg instanceof SystemMessage) {
                    existingSystemMessage = (SystemMessage) msg;
                    break;
                }
            }

            // 创建包含摘要的上下文消息（使用 UserMessage 而不是 SystemMessage）
            // 这样可以将摘要作为对话上下文的一部分，而不修改系统提示
            UserMessage summaryContextMessage = new UserMessage(
                "【上下文摘要】之前的对话摘要：" + summary
            );

            // 保留最近的几条消息
            int recentCount = Math.min(5, previousMessages.size());
            List<Message> recentMessages = previousMessages.subList(
                previousMessages.size() - recentCount,
                previousMessages.size()
            );

            // 构建新的消息列表
            List<Message> newMessages = new ArrayList<>();
            
            // 保留原有的 SystemMessage（如果存在）
            if (existingSystemMessage != null) {
                newMessages.add(existingSystemMessage);
            }
            
            // 添加摘要上下文消息
            newMessages.add(summaryContextMessage);
            
            // 添加最近的消息，排除旧的 SystemMessage（如果存在）
            for (Message msg : recentMessages) {
                if (msg != existingSystemMessage) {
                    newMessages.add(msg);
                }
            }

            // 使用 REPLACE 策略替换消息列表
            return new AgentCommand(newMessages, UpdatePolicy.REPLACE);
        }

        // 如果消息数量未超过阈值，返回原始消息（不进行修改）
        return new AgentCommand(previousMessages);
    }

    private String generateSummary(List<Message> messages) {
        // 使用另一个模型生成摘要
        String conversation = messages.stream()
            .map(Message::getText)
            .collect(Collectors.joining("\n"));

        // 简化示例：返回固定摘要
        return "之前讨论了多个主题...";
    }
}`}
</Code>

## 相关文档

- [Hooks](../tutorials/hooks.md) - Hook 机制详解
- [Interceptors](../tutorials/hooks.md) - 拦截器详解
- [Agents](../tutorials/agents.md) - Agent 基础概念
- [Memory](./memory.md) - 状态和记忆管理
