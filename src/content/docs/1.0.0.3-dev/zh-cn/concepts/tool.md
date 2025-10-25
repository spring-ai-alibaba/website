---
title: "工具 (Tool)"
description: "理解工具 (Tool) 的概念、Function Calling 的基本原理，以及如何在 SAA 中为智能体赋予与外部世界交互的能力。"
---

## 什么是工具？

如果说 LLM 是智能体的“大脑”，负责思考和推理，那么**工具 (Tool)** 就是智能体的**“手和脚”**，负责与外部世界进行交互和执行具体任务。

对于 Java 开发者来说，理解工具最简单的方式是：**一个工具就是一个可以被 LLM 动态发现并调用的 Java 方法。**

通常，这个方法被封装在一个 Spring Bean 中（例如，一个 `@Service`），实现了某个具体的业务逻辑，比如：
-   查询数据库获取订单信息。
-   调用外部天气 API 获取天气预报。
-   在文件系统中读写文件。
-   发送一封电子邮件。

## Function Calling 原理

智能体使用工具的过程，通常被称为 **Function Calling**。这个过程并非是 LLM 直接执行了我们的 Java 代码，而是一个两阶段的协作流程：

1.  **第一阶段：LLM 的“决策”**
    *   **我们 (开发者)**：在发起请求时，不仅向 LLM 提供了用户的问题，还提供了一份“可用的工具清单”（即一组 Java 方法的签名和功能描述）。
    *   **LLM**：分析用户的问题，并判断是否需要调用某个工具来回答。如果需要，LLM 的返回结果**不是最终答案**，而是一个结构化的**调用请求**（例如，一个 JSON 对象），其中包含了它决定调用的方法名称和根据用户问题解析出的参数。

2.  **第二阶段：我们代码的“执行”**
    *   **我们的应用 (SAA/Spring AI)**：接收到 LLM 返回的调用请求，解析出方法名和参数。
    *   **执行**：在我们的 JVM 中，实际执行对应的 Java 方法，并获得返回值。
    *   **返回结果**：将方法的返回值作为**工具反馈 (Tool Feedback)**，再次发送给 LLM。
    *   **LLM**：最后，LLM 会根据这个工具返回的结果，生成一段通顺的、人类可读的最终答案。

这个“决策”与“执行”分离的模式，赋予了 Agent 巨大的能力，使其能够利用我们现有的任何代码来解决现实世界的问题。

## 一个简单的工具调用示例

在 SAA/Spring AI 中定义和使用一个工具非常简单。

### 步骤 1: 定义一个工具 Bean

创建一个标准的 Spring Bean，其中包含你希望 LLM 能够调用的方法。关键在于，你需要通过 `@Bean` 的 `description` 属性，用自然语言清晰地描述这个方法是做什么的。

```java
import java.util.function.Function;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

@Configuration
public class ToolConfiguration {

    @Bean
    @Description("获取指定地点的当前天气信息") // 这是给 LLM 看的“方法注释”
    public Function<WeatherRequest, WeatherResponse> currentWeather() {
        return request -> {
            // 在这里实现调用真实天气 API 的业务逻辑
            System.out.println("调用天气 API，城市：" + request.city());
            return new WeatherResponse(request.city() + "现在是晴天，25摄氏度。");
        };
    }

    public record WeatherRequest(String city) {}
    public record WeatherResponse(String weather) {}
}
```

### 步骤 2: 配置模型以启用工具调用

为了让模型知道有可用的工具，你需要在 `application.yml` 中配置 `ChatClient`，告知它自动启用工具（Function Calling）。

```yaml
spring:
  ai:
    dashscope:
      chat:
        options:
          # 将 function_call 设置为 auto，模型将自行决定何时调用工具
          function-calling-mode: auto
```

### 步骤 3: 直接调用并让模型自主决策

配置完成后，你不再需要在每次调用时手动指定 `.function()`。Spring AI 会自动将所有被声明为工具的 `@Bean` 注册到模型中。你只需要像平常一样发起请求，模型会根据你的问题，自主判断是否需要调用工具。

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {

    private final ChatClient chatClient;

    public AssistantService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String askAssistant(String message) {
        // 无需再手动 .function("currentWeather")
        // 模型会根据问题 "今天上海天气怎么样？" 自动决策并调用工具
        return chatClient.prompt()
                .user(message)
                .call()
                .content();
    }
}
```
现在，当你调用 `askAssistant("今天上海天气怎么样？")` 时，Spring AI 和大模型会自动完成整个 Function Calling 流程。如果你问一个与天气无关的问题，比如“给我讲个笑话”，模型则会直接回答，不会调用工具。

> **背后发生了什么？**
>
> 当 `function-calling-mode` 设为 `auto` 时，Spring AI 会扫描 Spring 应用上下文中所有类型为 `java.util.function.Function` 且带有 `@Description` 注解的 `@Bean`，将它们的方法签名和描述作为工具列表提供给大模型，从而实现了工具的自动发现和调用。

## 进一步阅读

SAA 的工具调用能力构建于 Spring AI 之上。Spring AI 提供了更丰富的工具定义方式、多工具调用、流式调用等高级功能。

> 我们强烈建议您阅读 [Spring AI 官方关于工具调用的文档](https://docs.spring.io/spring-ai/reference/api/tools.html) 以了解全部功能。
