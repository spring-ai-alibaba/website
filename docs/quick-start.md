---
title: 快速开始
description: 快速开始指南，帮助你在几分钟内从简单配置到功能完整的ReactAgent，包括环境要求和依赖配置
keywords: [ReactAgent, 快速开始, Quick Start, Spring AI Alibaba, Agent Framework, DashScope, 入门教程]
---

# ReactAgent 快速开始

跟随快速开始，学习如何开发一个具备完整功能的 ReactAgent 智能体。

## 前置条件

### 环境要求

* JDK 17+
* Maven 3.8+
* 选择你的 LLM 提供商并获取 API-KEY（如阿里云百炼的 DashScope）

### 添加依赖

在你的项目中添加以下 Maven 依赖：

```xml
<dependencies>
  <!-- Spring AI Alibaba Agent Framework -->
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-agent-framework</artifactId>
    <version>1.1.0.0-M5</version>
  </dependency>

  <!-- DashScope ChatModel 支持（如果使用其他模型，请参考文档选择对应的 starter） -->
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    <version>1.1.0.0-M5</version>
  </dependency>
</dependencies>
```

### 配置 API Key

在使用之前，需要配置你的 API Key。推荐通过环境变量设置：

```bash
export AI_DASHSCOPE_API_KEY=your_api_key_here
```

你也可以在应用配置文件中设置（不推荐在生产环境中硬编码）：

```yaml
# application.yml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```

**获取 API Key**：

* DashScope（阿里云百炼）：访问 [https://bailian.console.aliyun.com/?apiKey=1&tab=api#/api](https://bailian.console.aliyun.com/?apiKey=1&tab=api#/api)
* 其他模型提供商请参考对应的文档

## 构建一个基础 Agent

首先创建一个简单的 agent，它可以回答问题并调用工具。该 agent 将使用 DashScope 大模型、一个天气查询工具、以及简单的系统提示词。

```java

// 初始化 ChatModel
DashScopeApi dashScopeApi = DashScopeApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

ChatModel chatModel = DashScopeChatModel.builder()
    .dashScopeApi(dashScopeApi)
    .build();

// 定义天气查询工具
public class WeatherTool implements BiFunction<String, ToolContext, String> {
    @Override
    public String apply(String city, ToolContext toolContext) {
        return "It's always sunny in " + city + "!";
    }
}

ToolCallback weatherTool = FunctionToolCallback.builder("get_weather", new WeatherTool())
    .description("Get weather for a given city")
    .inputType(String.class)
    .build();

// 创建 agent
ReactAgent agent = ReactAgent.builder()
    .name("weather_agent")
    .model(chatModel)
    .tools(weatherTool)
    .systemPrompt("You are a helpful assistant")
    .saver(new MemorySaver())
    .build();

// 运行 agent
AssistantMessage response = agent.call("what is the weather in San Francisco");
System.out.println(response.getText());
```

## 构建一个真实的 Agent

接下来，构建一个实用的天气预报 agent，演示关键的生产概念：

1. **详细的 System Prom** - 获得更好的 agent 行为
2. **创建工具** - 与外部数据集成
3. **模型配置** - 获得一致的响应
4. **结构化输出** - 获得可预测的结果
5. **对话记忆** - 实现类似聊天的交互
6. **创建和运行 agent** - 创建一个功能完整的 agent

让我们逐步完成每个步骤：

### 1. 定义系统提示

系统提示定义了 agent 的角色和行为。保持具体和可操作：

```java
String SYSTEM_PROMPT = """
    You are an expert weather forecaster, who speaks in puns.

    You have access to two tools:

    - get_weather_for_location: use this to get the weather for a specific location
    - get_user_location: use this to get the user's location

    If a user asks you for the weather, make sure you know the location.
    If you can tell from the question that they mean wherever they are,
    use the get_user_location tool to find their location.
    """;
```

### 2. 创建工具

工具让模型能够通过调用你定义的函数与外部系统交互。工具可以依赖运行时上下文，也可以与 agent 的记忆交互。

注意下面的 `getUserLocation` 工具如何使用运行时上下文（通过 `ToolContext`）：

```java
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.function.BiFunction;

// 天气查询工具
public class WeatherForLocationTool implements BiFunction<String, ToolContext, String> {
    @Override
    public String apply(
        @ToolParam(description = "The city name") String city,
        ToolContext toolContext) {
        return "It's always sunny in " + city + "!";
    }
}

// 用户位置工具 - 使用上下文
public class UserLocationTool implements BiFunction<String, ToolContext, String> {
    @Override
    public String apply(
        @ToolParam(description = "User query") String query,
        ToolContext toolContext) {
        // 从上下文中获取用户信息
        String userId = (String) toolContext.getContext().get("user_id");
        return "1".equals(userId) ? "Florida" : "San Francisco";
    }
}

// 创建工具回调
ToolCallback getWeatherTool = FunctionToolCallback
    .builder("getWeatherForLocation", new WeatherForLocationTool())
    .description("Get weather for a given city")
    .inputType(String.class)
    .build();

ToolCallback getUserLocationTool = FunctionToolCallback
    .builder("getUserLocation", new UserLocationTool())
    .description("Retrieve user location based on user ID")
    .inputType(String.class)
    .build();
```

**提示**: 工具应该有良好的文档：它们的名称、描述和参数名称都会成为模型提示的一部分。Spring AI 的 `FunctionToolCallback` 支持通过 `@ToolParam` 注解添加元数据，并支持通过 `ToolContext` 参数进行运行时注入。

### 3. 配置模型

为你的用例配置合适的大语言模型参数：

```java
import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import org.springframework.ai.chat.model.ChatModel;

DashScopeApi dashScopeApi = DashScopeApi.builder()
    .apiKey(System.getenv("AI_DASHSCOPE_API_KEY"))
    .build();

ChatModel chatModel = DashScopeChatModel.builder()
    .dashScopeApi(dashScopeApi)
    .defaultOptions(DashScopeChatOptions.builder()
        // Note: model must be set when use options build.
        .withModel(DashScopeChatModel.DEFAULT_MODEL_NAME)
        .withTemperature(0.5)
        .withMaxToken(1000)
        .build())
    .build();
```

根据不同的模型选择，增加依赖

```xml
<!-- DashScope-->
<dependency>
 <groupId>com.alibaba.cloud.ai</groupId>
 <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
 <version>1.1.0.0-M5</version>
</dependency>

<!-- OpenAI-->
<dependency>
 <groupId>org.springframework.ai</groupId>
 <artifactId>spring-ai-starter-model-openai</artifactId>
 <version>1.1.0-M3</version>
</dependency>
```

### 4. 定义响应格式

如果你需要 agent 响应匹配特定的模式，可以定义结构化响应格式。

```java
// 使用 Java 类定义响应格式
public class ResponseFormat {
    // 一个双关语响应（始终必需）
    private String punnyResponse;

    // 如果可用的话，关于天气的任何有趣信息
    private String weatherConditions;

    // Getters and Setters
    public String getPunnyResponse() {
        return punnyResponse;
    }

    public void setPunnyResponse(String punnyResponse) {
        this.punnyResponse = punnyResponse;
    }

    public String getWeatherConditions() {
        return weatherConditions;
    }

    public void setWeatherConditions(String weatherConditions) {
        this.weatherConditions = weatherConditions;
    }
}
```

### 5. 添加记忆

为你的 agent 添加记忆以维持跨交互的状态。这允许 agent 记住之前的对话和上下文，在多次调用之间，使用同一个 `threadId` 即可加载之前的对话记录。

```java
ReactAgent agent = ReactAgent.builder()
    .name("weather_agent")
    //...
    .saver(new MemorySaver())
    .build();
```

在调用的时候，

```java
RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();

// 第一次调用
AssistantMessage response = agent.call("what is the weather in San Francisco today.", runnableConfig);

// 第二次调用
AssistantMessage response = agent.call("How about the weather tomorrow", runnableConfig);
```

**注意**: 在生产环境中，使用持久化的 CheckPointer 将数据保存到数据库。更多详情参见 [内存管理](/docs/frameworks/agent-framework/tutorials/memory/) 文档。

### 6. 创建和运行 Agent

现在用所有组件组装你的 agent 并运行它！

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.chat.messages.AssistantMessage;

import java.util.HashMap;
import java.util.Map;

// 创建 agent
ReactAgent agent = ReactAgent.builder()
    .name("weather_pun_agent")
    .model(chatModel)
    .systemPrompt(SYSTEM_PROMPT)
    .tools(getUserLocationTool, getWeatherTool)
    .outputType(ResponseFormat.class)
    .saver(new MemorySaver())
    .build();

// threadId 是给定对话的唯一标识符
RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).addMetadata("user_id", "1").build();

// 第一次调用
AssistantMessage response = agent.call("what is the weather outside?", runnableConfig);
System.out.println(response.getText());
// 输出类似：
// Florida is still having a 'sun-derful' day! The sunshine is playing
// 'ray-dio' hits all day long! I'd say it's the perfect weather for
// some 'solar-bration'!

// 注意我们可以使用相同的 threadId 继续对话
response = agent.call("thank you!", runnableConfig);
System.out.println(response.getText());
// 输出类似：
// You're 'thund-erfully' welcome! It's always a 'breeze' to help you
// stay 'current' with the weather.
```

## 查看完整示例代码
完整示例代码请查看仓库：[https://github.com/spring-ai-alibaba/examples](https://github.com/spring-ai-alibaba/examples)

## 开启高级功能

### 使用 outputSchema 定义输出格式

除了使用 `outputType`，你还可以使用 `outputSchema` 来定义自定义的 JSON 格式：

```java
String customSchema = """
    请按照以下JSON格式输出：
    {
        "title": "标题",
        "content": "内容",
        "style": "风格"
    }
    """;

ReactAgent agent = ReactAgent.builder()
    .name("schema_agent")
    .model(chatModel)
    .saver(new MemorySaver())
    .outputSchema(customSchema)
    .build();

AssistantMessage message = agent.call("帮我写一首关于春天的诗歌。");
System.out.println(message.getText());
```

### 使用 invoke 方法获取完整状态

如果需要访问完整的 agent 状态（不仅仅是最后的消息），可以使用 `invoke` 方法：

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import java.util.Optional;

Optional<OverAllState> result = agent.invoke("帮我写一首诗。");

if (result.isPresent()) {
    OverAllState state = result.get();
    // 访问消息历史
    List<Message> messages = state.value("messages", new ArrayList<>());
    // 访问其他状态信息
    System.out.println(state);
}
```

### 配置最大迭代次数

为防止无限循环，可以配置最大迭代次数：

```java
ReactAgent agent = ReactAgent.builder()
    .name("my_agent")
    .model(chatModel)
    .maxIterations(5)  // 默认为 10
    .saver(new MemorySaver())
    .build();
```

### 使用 Hooks 扩展功能

ReactAgent 支持通过 Hooks 扩展功能，例如人机协同、工具注入等：

```java
import com.alibaba.cloud.ai.graph.agent.hook.Hook;
import com.alibaba.cloud.ai.graph.agent.hook.hip.HumanInTheLoopHook;

// 创建 hook
Hook humanInTheLoopHook = HumanInTheLoopHook.builder()
 .approvalOn("getWeatherTool", ToolConfig.builder().description("Please confirm tool execution.")
 .build();

ReactAgent agent = ReactAgent.builder()
    .name("my_agent")
    .model(chatModel)
    .hooks(humanInTheLoopHook)
    .saver(new MemorySaver())
    .build();
```

## 下一步

现在你已经创建了一个基础的 ReactAgent，你可以：

* 探索更多的工具集成
* 学习如何使用不同的 Checkpoint 实现对话持久化
* 了解如何使用 Hooks 扩展 agent 功能
* 学习如何创建多 agent 系统
