---
title: 第一个智能体
description: 创建并运行您的第一个 SAA 智能体。
---

在上一篇文章中，我们已经成功搭建了 SAA 的开发环境。现在，让我们更进一步，构建一个能够使用工具（Tool）的简单智能体（Agent）。

本文将以创建一个“天气查询智能体”为例，向您展示 SAA Agent 的核心用法。这个智能体可以根据用户指定的城市，调用工具函数来查询并返回该城市的天气信息。

## 1. 定义一个工具 (Tool)

智能体的强大之处在于它们能够使用外部工具来获取信息或执行操作。在 Spring AI 中，我们可以通过创建一个带有特定注解的 Bean 来轻松定义一个工具。

首先，创建一个名为 `WeatherTool.java` 的类，并添加以下代码：

```java
package com.example.saademo.tool;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.function.Function;

@Configuration
public class WeatherTool {

    @Bean
    @Description("获取指定城市的天气信息")
    public Function<WeatherRequest, WeatherResponse> weatherFunction() {
        return request -> new WeatherResponse("今天 " + request.city() + " 的天气是晴天，温度为 25℃。");
    }

    public record WeatherRequest(String city) {}
    public record WeatherResponse(String weather) {}

}
```

代码解释:
-   `@Configuration`: 将这个类声明为 Spring 的一个配置类。
-   `@Bean`: Spring 会将 `weatherFunction` 方法的返回值注册为一个 Bean。
-   `@Description("获取指定城市的天气信息")`: 这是最关键的一步。Spring AI 会读取这个注解的内容，从而理解该工具的功能。当用户提问与天气相关的问题时，大模型就会知道应该调用这个工具。
-   `Function<WeatherRequest, WeatherResponse>`: 我们将工具定义为一个 `Function`。输入参数 `WeatherRequest` 和输出参数 `WeatherResponse` 都是 Java 17 的 `Record` 类型，用于清晰地定义工具的输入输出数据结构。大模型会自动根据用户问题和 `WeatherRequest` 的定义来提取参数，例如从“上海今天天气怎么样？”中提取出 `city="上海"`。

## 2. 创建智能体服务 (Agent Service)

接下来，我们需要创建一个服务来构建和管理我们的 `ReactAgent` 实例。`ReactAgent` 是 SAA Graph 模块提供的一种基于 ReAct (Reasoning and Acting) 思想的智能体实现。

创建一个名为 `AgentService.java` 的类:

```java
package com.example.saademo.agent;

import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AgentService {

    private final ReactAgent weatherAgent;

    public AgentService(ChatClient.Builder chatClientBuilder, List<ToolCallback> toolCallbacks) throws GraphStateException {
        ChatClient chatClient = chatClientBuilder.build();

        this.weatherAgent = ReactAgent.builder()
                .chatClient(chatClient)
                .tools(toolCallbacks)
                .name("WeatherAgent")
                .description("一个可以查询天气信息的智能体")
                .instruction("你是一个天气查询助手，使用工具来回答用户关于天气的问题。")
                .build();
    }

    public String chat(String query) {
        // 将用户输入包装在 "messages" 键中
        Map<String, Object> input = Map.of("messages", query);

        try {
            // 调用智能体并获取最终状态
            Optional<String> finalResponse = weatherAgent.invoke(input)
                    .flatMap(state -> state.value("messages", String.class));
            return finalResponse.orElse("对不起，我无法处理您的请求。");
        } catch (Exception e) {
            // 异常处理
            return "处理请求时发生错误: " + e.getMessage();
        }
    }
}
```

代码解释:
-   `@Service`: 将这个类声明为一个 Spring 服务。
-   我们通过构造函数注入了 `ChatClient.Builder` 和一个 `List<ToolCallback>`。Spring Boot 会自动发现所有 `ToolCallback` 类型的 Bean（包括我们上一步定义的 `weatherFunction`）并注入进来。
-   `ReactAgent.builder()`: 我们使用 Builder 模式来创建一个 `ReactAgent` 实例。
    -   `.chatClient(chatClient)`: 传入与大模型交互的客户端。
    -   `.tools(toolCallbacks)`: 注册所有可用的工具。
    -   `.instruction(...)`: 为智能体设置系统级的指令（System Prompt），指导其行为。
-   `chat(String query)` 方法:
    -   它接收用户的查询 `query`。
    -   `weatherAgent.invoke(input)`: 这是执行智能体的核心方法。它会启动一个 ReAct 流程：大模型进行思考 -> 判断是否需要调用工具 -> 调用工具 -> 将工具结果返回给大模型 -> 大模型总结出最终答案。
    -   `state.value("messages", String.class)`: 从智能体执行完毕后的最终状态中，提取键为 "messages" 的值，这里面包含了最终的答复。

## 3. 创建 API 端点

最后，我们需要创建一个 Controller 来通过 API 暴露我们的智能体服务。

创建 `AgentController.java`:

```java
package com.example.saademo.controller;

import com.example.saademo.agent.AgentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @GetMapping("/ai/agent/chat")
    public String agentChat(@RequestParam String query) {
        return agentService.chat(query);
    }
}
```
这段代码非常直接，它创建了一个 `/ai/agent/chat` 端点，并将收到的 `query` 参数传递给 `AgentService` 进行处理。

## 4. 运行和测试

完成了以上所有步骤后，您的项目目录结构应该如下所示：
```
src/main/java/com/example/saademo/
├── agent/
│   └── AgentService.java
├── controller/
│   └── AgentController.java
├── tool/
│   └── WeatherTool.java
└── SaaDemoApplication.java
```

现在，启动您的 Spring Boot 应用：
```bash
mvn spring-boot:run
```

应用启动后，打开终端，使用 `curl` 命令来测试我们的天气查询智能体：

```bash
curl 'http://localhost:8080/ai/agent/chat?query=北京今天天气怎么样？'
```

如果一切配置正确，您将会看到类似下面的输出：

```
"今天 北京 的天气是晴天，温度为 25℃。"
```

恭喜！您已经成功构建并运行了您的第一个 SAA 智能体。它成功地理解了您的意图，并调用了正确的工具来完成任务。

## 5. 下一步 (Next Steps)

您刚刚使用的是 SAA Graph 模块提供的 `ReactAgent`，它是一种通用且强大的智能体。但这仅仅是开始，您可以继续探索：

-   **深入了解 Agent 的工作原理**：想知道 `ReactAgent` 内部是如何进行思考和决策的吗？请前往我们的 **[构建智能体 -> StateGraph 基础](../building/state-graph-basics)** 章节，了解构建 Agent 的核心引擎。
-   **探索不同的 Agent 类型**：除了 `ReactAgent`，SAA 还提供了适用于固定流程的 `FlowAgent`、支持人工干预的 `ReactAgentWithHuman` 等。在 **构建智能体 -> 高级特性** 中发现它们。
-   **查看更多示例**：想了解在真实场景中如何使用 Agent 吗？请访问我们的 **[示例仓库](https://github.com/spring-ai-alibaba/spring-ai-alibaba-examples)**，那里有大量可运行的 Demo。
