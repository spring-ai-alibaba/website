---
title: Tools 工具
description: 了解如何创建和使用Tools让Agent与外部系统交互，包括API、数据库和文件系统的集成方法
keywords: [Tools, 工具调用, FunctionToolCallback, API集成, 数据库交互, 外部系统, Agent工具]
---

# Tools

许多 AI 应用程序通过自然语言与用户交互。然而，某些业务场景需要模型使用结构化输入直接与外部系统（如 API、数据库或文件系统）进行交互。

Tools 是 [agents](./agents.md) 调用来执行操作的组件。它们通过定义良好的输入和输出让模型与外部世界交互，从而扩展模型的能力。Tools 封装了一个可调用的函数及其输入模式。我们可以把工具定义传递给兼容的 [models](./models.md)，允许模型决定是否调用工具以及使用什么参数。在这些场景中，工具调用使模型能够生成符合指定输入模式的请求。

> **注意：服务器端工具使用**
>
> 某些聊天模型（例如 OpenAI、Anthropic 和 Gemini）具有在服务器端执行的内置工具，如 Web 搜索和代码解释器。请参阅提供商概述以了解如何使用特定聊天模型访问这些工具。

## 创建工具

### 基础工具定义

Spring AI 提供了对从函数指定工具的内置支持，可以通过编程方式使用低级 `FunctionToolCallback` 实现，也可以动态地作为在运行时解析的 `@Bean`。

#### 编程方式规范：FunctionToolCallback

你可以通过编程方式构建 `FunctionToolCallback`，将函数类型（`Function`、`Supplier`、`Consumer` 或 `BiFunction`）转换为工具。

```java
import java.util.function.Function;

public class WeatherService implements Function<WeatherRequest, WeatherResponse> {
    public WeatherResponse apply(WeatherRequest request) {
        return new WeatherResponse(30.0, Unit.C);
    }
}

public enum Unit { C, F }
public record WeatherRequest(String location, Unit unit) {}
public record WeatherResponse(double temp, Unit unit) {}
```

`FunctionToolCallback.Builder` 允许你构建 `FunctionToolCallback` 实例并提供有关工具的关键信息：

* **name**: 工具的名称。AI 模型使用此名称在调用时识别工具。因此，在同一上下文中不允许有两个同名的工具。对于特定的聊天请求，名称在模型可用的所有工具中必须是唯一的。**必需**。
* **toolFunction**: 表示工具方法的函数对象（`Function`、`Supplier`、`Consumer` 或 `BiFunction`）。**必需**。
* **description**: 工具的描述，模型可以使用它来了解何时以及如何调用工具。如果未提供，将使用方法名称作为工具描述。但是，强烈建议提供详细描述，因为这对于模型理解工具的目的和使用方式至关重要。如果未提供良好的描述，可能导致模型在应该使用工具时不使用，或者使用不正确。
* **inputType**: 函数输入的类型。**必需**。
* **inputSchema**: 工具输入参数的 JSON schema。如果未提供，将根据 `inputType` 自动生成 schema。你可以使用 `@ToolParam` 注解提供有关输入参数的附加信息，例如描述或参数是必需还是可选。默认情况下，所有输入参数都被视为必需。
* **toolMetadata**: 定义附加设置的 `ToolMetadata` 实例，例如是否应将结果直接返回给客户端，以及要使用的结果转换器。你可以使用 `ToolMetadata.Builder` 类构建它。
* **toolCallResultConverter**: 用于将工具调用结果转换为字符串对象以发送回 AI 模型的 `ToolCallResultConverter` 实例。如果未提供，将使用默认转换器（`DefaultToolCallResultConverter`）。

```java
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

ToolCallback toolCallback = FunctionToolCallback
    .builder("currentWeather", new WeatherService())
    .description("Get the weather in location")
    .inputType(WeatherRequest.class)
    .build();
```

函数的输入和输出可以是 `Void` 或 POJO。输入和输出 POJO 必须是可序列化的，因为结果将被序列化并发送回模型。函数以及输入和输出类型必须是公共的。

**重要提示**：某些类型不受支持。有关更多详细信息，请参阅函数工具限制。

**添加工具到 ChatClient**：

使用编程规范方法时，你可以将 `FunctionToolCallback` 实例传递给 `ChatClient` 的 `toolCallbacks()` 方法。该工具仅对添加到的特定聊天请求可用。

```java
import org.springframework.ai.chat.client.ChatClient;

ToolCallback toolCallback = ...;

ChatClient.create(chatModel)
    .prompt("What's the weather like in Copenhagen?")
    .toolCallbacks(toolCallback)
    .call()
    .content();
```

**添加默认工具到 ChatClient**：

使用编程规范方法时，你可以通过将 `FunctionToolCallback` 实例传递给 `defaultToolCallbacks()` 方法将默认工具添加到 `ChatClient.Builder`。如果同时提供默认工具和运行时工具，运行时工具将完全覆盖默认工具。

```java
ChatModel chatModel = ...;
ToolCallback toolCallback = ...;

ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultToolCallbacks(toolCallback)
    .build();
```

**注意**：默认工具在从同一 `ChatClient.Builder` 构建的所有 `ChatClient` 实例执行的所有聊天请求中共享。它们对于跨不同聊天请求常用的工具很有用，但如果不小心使用也可能很危险，可能在不应该使用时使它们可用。

**添加工具到 ChatModel**：

使用编程规范方法时，你可以将 `FunctionToolCallback` 实例传递给 `ToolCallingChatOptions` 的 `toolCallbacks()` 方法。该工具仅对添加到的特定聊天请求可用。

```java
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;

ChatModel chatModel = ...;
ToolCallback toolCallback = ...;

ChatOptions chatOptions = ToolCallingChatOptions.builder()
    .toolCallbacks(toolCallback)
    .build();

Prompt prompt = new Prompt("What's the weather like in Copenhagen?", chatOptions);
chatModel.call(prompt);
```

#### 动态规范：@Bean

你可以将工具定义为 Spring beans，让 Spring AI 使用 `ToolCallbackResolver` 接口（通过 `SpringBeanToolCallbackResolver` 实现）在运行时动态解析它们，而不是以编程方式指定工具。此选项使你可以将任何 `Function`、`Supplier`、`Consumer` 或 `BiFunction` bean 用作工具。bean 名称将用作工具名称，Spring Framework 的 `@Description` 注解可用于为工具提供描述，供模型用来了解何时以及如何调用工具。

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import java.util.function.Function;

@Configuration(proxyBeanMethods = false)
class WeatherTools {

    WeatherService weatherService = new WeatherService();

    @Bean
    @Description("Get the weather in location")
    Function<WeatherRequest, WeatherResponse> currentWeather() {
        return weatherService;
    }
}
```

**重要提示**：某些类型不受支持。有关更多详细信息，请参阅函数工具限制。

工具输入参数的 JSON schema 将自动生成。你可以使用 `@ToolParam` 注解提供有关输入参数的附加信息，例如描述或参数是必需还是可选。默认情况下，所有输入参数都被视为必需。

```java
import org.springframework.ai.tool.annotation.ToolParam;

record WeatherRequest(
    @ToolParam(description = "The name of a city or a country") String location,
    Unit unit
) {}
```

此工具规范方法的缺点是不保证类型安全，因为工具解析是在运行时完成的。为了缓解这一问题，你可以使用 `@Bean` 注解显式指定工具名称并将值存储在常量中，以便你可以在聊天请求中使用它而不是硬编码工具名称。

```java
@Configuration(proxyBeanMethods = false)
class WeatherTools {

    public static final String CURRENT_WEATHER_TOOL = "currentWeather";

    @Bean(CURRENT_WEATHER_TOOL)
    @Description("Get the weather in location")
    Function<WeatherRequest, WeatherResponse> currentWeather() {
        // ...
    }
}
```

**添加工具到 ChatClient**（使用动态规范）：

```java
ChatClient.create(chatModel)
    .prompt("What's the weather like in Copenhagen?")
    .toolNames("currentWeather")
    .call()
    .content();
```

**添加默认工具到 ChatClient**（使用动态规范）：

```java
ChatModel chatModel = ...;

ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultToolNames("currentWeather")
    .build();
```

#### 函数工具限制

以下类型目前不支持作为用作工具的函数的输入或输出类型：

* 原始类型
* `Optional`
* 集合类型（例如 `List`、`Map`、`Array`、`Set`）
* 异步类型（例如 `CompletableFuture`、`Future`）
* 响应式类型（例如 `Flow`、`Mono`、`Flux`）

使用基于方法的工具规范方法支持原始类型和集合。

### 自定义工具属性

#### 自定义工具名称

默认情况下，工具名称来自函数名称。当你需要更具描述性的内容时，可以覆盖它：

```java
ToolCallback searchTool = FunctionToolCallback
    .builder("web_search", new SearchFunction())  // 自定义名称
    .description("Search the web for information")
    .inputType(String.class)
    .build();

System.out.println(searchTool.getName());  // web_search
```

#### 自定义工具描述

覆盖自动生成的工具描述以提供更清晰的模型指导：

```java
ToolCallback calculatorTool = FunctionToolCallback
    .builder("calculator", new CalculatorFunction())
    .description("Performs arithmetic calculations. Use this for any math problems.")
    .inputType(String.class)
    .build();
```

### 高级模式定义

使用 Java 类或 JSON schemas 定义复杂的输入：

**使用 Java 记录类（Record）**：

```java
import org.springframework.ai.tool.annotation.ToolParam;

public record WeatherInput(
    @ToolParam(description = "City name or coordinates") String location,
    @ToolParam(description = "Temperature unit preference") Unit units,
    @ToolParam(description = "Include 5-day forecast") boolean includeForecast
) {}

public enum Unit { CELSIUS, FAHRENHEIT }

public class WeatherFunction implements Function<WeatherInput, String> {
    @Override
    public String apply(WeatherInput input) {
        double temp = input.units() == Unit.CELSIUS ? 22 : 72;
        String result = String.format(
            "Current weather in %s: %.0f degrees %s",
            input.location(),
            temp,
            input.units().toString().substring(0, 1).toUpperCase()
        );

        if (input.includeForecast()) {
            result += "\nNext 5 days: Sunny";
        }

        return result;
    }
}

ToolCallback weatherTool = FunctionToolCallback
    .builder("get_weather", new WeatherFunction())
    .description("Get current weather and optional forecast")
    .inputType(WeatherInput.class)
    .build();
```

## 访问上下文

**为什么这很重要**：当工具可以访问 Agent 状态、运行时上下文和长期记忆时，它们最强大。这使工具能够做出上下文感知的决策、个性化响应并在对话中维护信息。

工具可以通过 `ToolContext` 参数访问运行时信息，该参数提供：

* **State（状态）** - 通过执行流动的可变数据（消息、计数器、自定义字段）
* **Context（上下文）** - 不可变配置，如用户 ID、会话详细信息或应用程序特定配置
* **Store（存储）** - 跨对话的持久长期记忆
* **Config（配置）** - 执行的 RunnableConfig
* **Tool Call ID** - 当前工具调用的 ID

### ToolContext

使用 `ToolContext` 在单个参数中访问所有运行时信息。只需将 `ToolContext` 添加到你的工具签名中，它将自动注入而不会暴露给 LLM。

**访问状态**：

工具可以使用 `ToolContext` 访问当前的 Graph 状态：

```java
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.chat.messages.Message;
import java.util.function.BiFunction;
import java.util.List;
import java.util.Map;

// 访问当前对话状态
public class ConversationSummaryTool implements BiFunction<String, ToolContext, String> {

    @Override
    public String apply(String input, ToolContext toolContext) {
        OverAllState state = (OverAllState) toolContext.getContext().get("state");
        RunnableConfig config = (RunnableConfig) toolContext.getContext().get("config");
        // update to `extraState` will be returned to the Agent loop.
        Map<String, Object> config = (Map<String, Object>) toolContext.getContext().get("extraState");

        // 从state中获取消息
        List<Message> messages = (List<Message>) state.get("messages", new ArrayList<>());

        if (messages == null) {
            return "No conversation history available";
        }

        long userMsgs = messages.stream()
            .filter(m -> m.getMessageType().getValue().equals("user"))
            .count();
        long aiMsgs = messages.stream()
            .filter(m -> m.getMessageType().getValue().equals("assistant"))
            .count();
        long toolMsgs = messages.stream()
            .filter(m -> m.getMessageType().getValue().equals("tool"))
            .count();

        return String.format(
            "Conversation has %d user messages, %d AI responses, and %d tool results",
            userMsgs, aiMsgs, toolMsgs
        );
    }
}

// 创建工具
ToolCallback summaryTool = FunctionToolCallback
    .builder("summarize_conversation", new ConversationSummaryTool())
    .description("Summarize the conversation so far")
    .inputType(String.class)
    .build();
```

**警告**：`toolContext` 参数对模型是隐藏的。对于上面的示例，模型只看到 `input` 在工具模式中 - `toolContext` **不**包含在请求中。

**更新状态**：

在 Spring AI Alibaba 中，你可以通过 Hook 或在工具执行后返回的信息来更新 Agent 的状态。

```java
// 在 Hook 中更新状态
import com.alibaba.cloud.ai.graph.agent.hook.ModelHook;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;

public class UpdateStateHook implements ModelHook {

    @Override
    public Map<String, Object> afterModel(OverAllState state, RunnableConfig config) {
        // 更新状态
        return Map.of(
            "user_name", "Alice",
            "last_updated", System.currentTimeMillis()
        );
    }
}
```

### Context（上下文）

通过 `ToolContext` 访问不可变配置和上下文数据，如用户 ID、会话详细信息或应用程序特定配置。

```java
import org.springframework.ai.chat.model.ToolContext;
import java.util.function.BiFunction;
import java.util.Map;

public class AccountInfoTool implements BiFunction<String, ToolContext, String> {

    private static final Map<String, Map<String, Object>> USER_DATABASE = Map.of(
        "user123", Map.of(
            "name", "Alice Johnson",
            "account_type", "Premium",
            "balance", 5000,
            "email", "alice@example.com"
        ),
        "user456", Map.of(
            "name", "Bob Smith",
            "account_type", "Standard",
            "balance", 1200,
            "email", "bob@example.com"
        )
    );

    @Override
    public String apply(String query, ToolContext toolContext) {
    	// 在agent调用时设置 user_id，在工具中可以拿到参数
    	// RunnableConfig config = RunnableConfig.builder().addMetadata("user_id", "1");
    	// agent.call("", config);
        RunnableConfig config = (RunnableConfig) toolContext.getContext().get("config");
        String userId = (String) config.metadata("user_id");

        if (userId == null) {
            return "User ID not provided";
        }

        Map<String, Object> user = USER_DATABASE.get(userId);
        if (user != null) {
            return String.format(
                "Account holder: %s\nType: %s\nBalance: $%d",
                user.get("name"),
                user.get("account_type"),
                user.get("balance")
            );
        }

        return "User not found";
    }
}

ToolCallback accountTool = FunctionToolCallback
    .builder("get_account_info", new AccountInfoTool())
    .description("Get the current user's account information")
    .inputType(String.class)
    .build();

// 在 ReactAgent 中使用
ReactAgent agent = ReactAgent.builder()
    .name("financial_assistant")
    .model(chatModel)
    .tools(accountTool)
    .systemPrompt("You are a financial assistant.")
    .build();

// 调用时传递上下文
// 注意：需要通过适当的方式传递上下文数据
RunnableConfig config = RunnableConfig.builder().addMetadata("user_id", "1");
agent.call("question", config);
```

### Memory（存储）

使用存储访问跨对话的持久数据。在 Spring AI Alibaba 中，你可以使用 checkpointer 来实现长期记忆。

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.RedisSaver;


// 配置持久化存储
RedisSaver redisSaver = new RedisSaver(redisConnectionFactory);

// 创建带有持久化记忆的 Agent
ReactAgent agent = ReactAgent.builder()
    .name("my_agent")
    .model(chatModel)
    .tools(saveUserInfoTool, getUserInfoTool)
    .saver(redisSaver)
    .build();

// 第一个会话：保存用户信息
RunnableConfig config1 = RunnableConfig.builder()
    .threadId("session_1")
    .build();

agent.call("Save user: userid: abc123, name: Foo, age: 25, email: foo@example.com", config1);

// 第二个会话：获取用户信息
RunnableConfig config2 = RunnableConfig.builder()
    .threadId("session_2")
    .build();

agent.call("Get user info for user with id 'abc123'", config2);
// 输出：Here is the user info for user with ID "abc123":
// - Name: Foo
// - Age: 25
// - Email: foo@example.com
```

## 内置工具


## 在 ReactAgent 中使用工具

在 ReactAgent 中使用工具非常简单：

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

// 创建工具
ToolCallback weatherTool = FunctionToolCallback
    .builder("get_weather", new WeatherFunction())
    .description("Get weather for a given city")
    .inputType(String.class)
    .build();

ToolCallback searchTool = FunctionToolCallback
    .builder("search", new SearchFunction())
    .description("Search for information")
    .inputType(String.class)
    .build();

// 创建带有工具的 Agent
ReactAgent agent = ReactAgent.builder()
    .name("my_agent")
    .model(chatModel)
    .tools(weatherTool, searchTool)
    .systemPrompt("You are a helpful assistant with access to weather and search tools.")
    .saver(new MemorySaver())
    .build();

// 使用 Agent
AssistantMessage response = agent.call("What's the weather like in San Francisco?");
System.out.println(response.getText());
```

## 相关资源

* [Agents 文档](./agents.md) - 了解如何在 Agent 中使用工具
* [Messages 文档](./messages.md) - 了解工具消息类型
* [Models 文档](./models.md) - 了解模型如何调用工具

