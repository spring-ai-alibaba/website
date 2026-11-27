---
title: 工具与工具调用
description: 使用 Spring AI 2.1 定义工具、绑定请求、执行调用、审批和恢复，并将工具接入 ReactAgent。
keywords: [Tool Calling, ToolCallback, ToolCallingAdvisor, ToolCallingManager, ReactAgent]
---

# 工具与工具调用

Spring AI 2.1 的工具流程由应用控制。模型输出工具名和参数，应用依据本次请求的工具列表执行回调，再把结果作为消息交回模型。使用 `ChatClient` 时，`ToolCallingAdvisor` 负责多轮循环，`ToolCallingManager` 负责每批调用的解析、确认、执行和结果。使用底层 `ChatModel` 时，应用应读取调用请求并自行驱动循环。

[Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

## 定义与绑定工具

用 `@Tool` 描述普通方法，`@ToolParam` 描述模型填充的参数。工具描述、参数类型和 JSON Schema 会提供给模型。工具方法仍应在执行时校验参数和访问权限。

```java
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

class WeatherTools {

    @Tool(description = "Return the example weather for a city")
    String currentWeather(@ToolParam(description = "City name") String city) {
        return city + ": sunny, 25°C";
    }

}
```

```java
import org.springframework.ai.chat.client.ChatClient;

var client = ChatClient.create(chatModel);
var reply = client.prompt("What is the weather in Beijing?")
    .tools(new WeatherTools())
    .call()
    .chatResponse();
```

`tools(Object...)` 可接受带 `@Tool` 的对象、`ToolCallback` 或 `ToolCallbackProvider`。用 `defaultTools(...)` 设置客户端的默认工具。在请求中提供工具时，请求的工具集合整体替换客户端默认集合，按实际需要传入本次允许的回调。迁移时将 `toolCallbacks(...)` 和 `defaultToolCallbacks(...)` 改为 `tools(...)` 和 `defaultTools(...)`。

| 定义方式 | 使用场景 |
| --- | --- |
| `@Tool`、`@ToolParam` | 应用拥有方法实现，希望通过注解生成工具定义 |
| `FunctionToolCallback` | 将函数包装为工具，显式指定名称、描述、输入类型或 JSON Schema |
| `MethodToolCallback` | 手动选择反射方法、接收对象和工具元数据 |
| `ToolCallbackProvider` | 由 MCP 等来源提供一组回调 |

```java
import org.springframework.ai.tool.function.FunctionToolCallback;

record WeatherRequest(String city) {}

var callback = FunctionToolCallback.builder("currentWeather",
        (WeatherRequest request) -> request.city() + ": sunny, 25°C")
    .description("Return the example weather for a city")
    .inputType(WeatherRequest.class)
    .build();
```

需要单独提取方法工具时，用 `org.springframework.ai.support.ToolCallbacks` 的 `from(new WeatherTools())` 生成回调。工具返回值由 `ToolCallResultConverter` 转为模型可消费的结果，可按工具自定义转换。设置 `@Tool(returnDirect = true)` 或 `ToolMetadata.builder().returnDirect(true)` 后，整批工具都满足直接返回条件时，循环可将结果直接交给应用。

### 自定义方法工具与 JSON Schema

同一个方法也可以通过 `MethodToolCallback.builder()` 包装。提供 `toolMethod` 和实例方法的 `toolObject`，必要时设定 `ToolDefinition`、`ToolMetadata` 或结果转换器。函数工具可用 `.inputSchema(schema)` 提供自定义 Schema。类型推断与 Schema 明确给出了模型侧的入参协议，执行仍由回调实现负责。

### 工具上下文

用 `.toolContext(Map.of("tenantId", tenantId))` 把服务端掌控的上下文传给工具。方法增加 `ToolContext` 参数后，可通过 `getContext()` 读取。该上下文不进入暴露给模型的 JSON Schema。租户与用户标识应来自已验证的请求上下文。

Spring AI 默认只执行请求绑定的回调。动态按名称找回调时，使用受控的 `ToolCallbackResolver`。若旧应用依赖 Resolver 回退，需显式开启 `spring.ai.tools.resolution.fallback.enabled=true`，并约束 Resolver 可返回的工具。工具较多时也可先用请求级筛选或 [Tool Search Tool](https://docs.spring.io/spring-ai/reference/api/tools/tool-search-tool.html) 缩小候选范围。

## 工具循环、异常与预算

`ChatClient` 默认注册工具 Advisor。需要自定义管理器时，显式配置 `ToolCallingAdvisor`。例如为天气工具设置较低的预算。

```java
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor;
import org.springframework.ai.model.tool.ToolCallLimitBehavior;
import org.springframework.ai.model.tool.ToolCallingManager;

var manager = ToolCallingManager.builder()
    .maxCallsPerTool(40)
    .maxCallsPerTool("currentWeather", 3)
    .maxTotalToolCalls(150)
    .onLimitExceeded(ToolCallLimitBehavior.RETURN_ERROR_RESPONSE)
    .build();

var client = ChatClient.builder(chatModel)
    .defaultAdvisors(ToolCallingAdvisor.builder().toolCallingManager(manager).build())
    .build();
```

默认上限为每个工具 40 次、单个用户轮次总计 150 次。Spring Boot 配置在 `spring.ai.tools.limits` 下，支持 `max-calls-per-tool-default`、`max-calls-per-tool.<name>`、`excluded-tools` 和 `max-total-tool-calls`。相应上限可设为 `-1` 关闭。

- 默认的 `THROW` 会报告 `ToolCallLimitExceededException`。使用工具 Advisor 时，超限可作为本轮的终止响应交给应用。
- `RETURN_ERROR_RESPONSE` 把超限结果交回模型，适合希望模型根据失败信息继续回答的流程。
- 自定义回调执行出错时，可抛出 `ToolExecutionException`，由 `ToolExecutionExceptionProcessor` 决定如何反馈。记录工具调用的耗时与失败即可定位执行问题。输入和结果可能含敏感信息，按场景决定是否采集。

### 直接调用 ChatModel

向 `Prompt` 传入当前提供商的完整工具选项。模型只返回工具请求，工具管理器负责执行。下例展示其中一次往返。

```java
var options = DashScopeChatOptions.builder()
    .model("qwen-plus")
    .toolCallbacks(List.of(callback))
    .build();
var prompt = new Prompt("What is the weather in Beijing?", options);
var reply = chatModel.call(prompt);

if (reply.hasToolCalls()) {
    var executed = manager.executeToolCalls(prompt, reply);
    if (!executed.returnDirect()) {
        reply = chatModel.call(new Prompt(executed.conversationHistory(), options));
    }
}
```

完整的自管循环应处理终止、`returnDirect()`、审批和每轮上限。 `conversationHistory()` 保留原历史、助手的调用消息和工具结果。流式响应的未完成参数可用于展示，执行时只使用完整调用。详见 [Message Parts](messages.md#读取与保留-message-parts)。

## 调用确认与恢复

Spring AI 2.1 可用 `@Tool(requiresConfirmation = true)` 或 `ToolMetadata.builder().requiresConfirmation(true)` 声明审批。也可以通过 `spring.ai.tools.confirmation.tools` 或 `ToolCallConfirmationPolicy` 指定现有工具。一个调用需要确认时，整批暂停，批次中的其他调用也不会提前执行。

```java
import org.springframework.ai.model.tool.ToolCallDecisions;

class ReviewTools {

    @Tool(description = "Prepare a local review note", requiresConfirmation = true)
    String prepareReviewNote(String title) {
        return "Prepared review note: " + title;
    }

}

ChatResponse paused = client.prompt("Prepare two review notes")
    .tools(new ReviewTools())
    .call()
    .chatResponse();

List<String> pending = ToolCallDecisions.awaitingDecision(paused);
if (!pending.isEmpty()) {
    List<String> keys = ToolCallDecisions.toolCallKeys(paused.getResult().getOutput());
    // Persist the reply and its ordered calls before presenting the approval UI.
}
```

应用用 `pending` 识别需要审批的调用。读取同步 `chatResponse()` 或流的最后一个 `ChatResponse`，这样可以获取待审批元数据。审批键通常是工具调用 ID，缺失或重复时按位置区分。保存原始回复与调用顺序，并为本批每项调用收集决定。

```java
import org.springframework.ai.model.tool.ToolCallDecision;

// The application reloaded an approved batch with exactly two calls.
var keys = ToolCallDecisions.toolCallKeys(paused.getResult().getOutput());
var decisions = ToolCallDecisions.of(
    ToolCallDecision.allow(keys.get(0)),
    ToolCallDecision.deny(keys.get(1), "Skipped by reviewer"));
var result = manager.executeToolCalls(originalPrompt, paused, decisions);
```

`originalPrompt` 应包含当前轮已执行的工具结果和请求实际绑定的回调。恢复时管理器只使用这些回调，不做 Resolver 回退。拒绝会产生工具结果。自行维护对话时，把 `result.conversationHistory()` 作为后续输入。使用 [Session Memory](memory.md) 时，恢复请求只提交新的工具结果，复用原会话 ID，历史由 Advisor 加载。需要在暂停前保留多轮工具交换时，把记忆 Advisor 放到工具循环内部。

[Spring AI 工具确认](https://docs.spring.io/spring-ai/reference/api/tools/tool-call-confirmation.html)

## 在 ReactAgent 中使用工具

```java
var agent = ReactAgent.builder()
    .name("weather-agent")
    .model(chatModel)
    .methodTools(new WeatherTools())
    .toolCallLimits(3, 10)
    .build();

AssistantMessage reply = agent.call("What is the weather in Beijing?");
```

ReactAgent 通过 Graph 调度工具，使用 `.tools(callbacks)`、`.methodTools(objects)` 或 `.toolCallbackProviders(providers)` 提供工具。运行时 Advisor 可以筛选请求工具，Graph 据最终请求执行。工具需要使用状态时，从 `ToolContext` 读取 Agent 传入的状态与配置，状态更新按 Agent 的 Hook 和状态合并规则提交。

ReactAgent 的人工审批通过 Graph checkpoint 暂停和恢复。使用同一个 `threadId` 提交批准、编辑或拒绝的 Graph 反馈。普通 ChatClient 的 `ToolCallDecisions` 适用于 Spring AI 工具循环。ReactAgent 则使用 [Graph 人机协同](../advanced/human-in-the-loop.md) 的恢复流程。

远程工具可通过 MCP 的 `ToolCallbackProvider` 注册。见 [MCP 客户端](/integration/mcps/mcp-client-boot-starter-docs) 和 [DashScope 扩展工具](/integration/toolcalls/tool-calls)。

[可运行的 ToolsExample](https://github.com/alibaba/spring-ai-alibaba/blob/e01219fd20ecfff2dd9d1a1facfe58e5349c3e07/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)
