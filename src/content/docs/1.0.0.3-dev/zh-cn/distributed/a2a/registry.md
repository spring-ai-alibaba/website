---
title: "快速入门：构建你的第一个 A2A 智能体"
description: "学习如何使用 Spring AI Alibaba A2A 模块将一个本地智能体暴露为标准的、可被其他智能体发现和调用的服务。"
---

# 快速入门：构建你的第一个 A2A 智能体

本文是一个循序渐进的教程，将指导您完成以下目标：
1.  创建一个简单的、基于 SAA Graph 的本地智能体。
2.  使用 A2A 模块将其能力通过标准的 JSON-RPC 接口暴露出去。
3.  启动并测试您的第一个 A2A 智能体服务。

## 前置条件

- 您已经完成了 **[环境准备](../../get-started/setup)**，并拥有一个可以正常运行的 Spring Boot 3.x 项目。
- 您已了解 **[第一个智能体](../../get-started/first-agent)** 的基本构建方法。
- 您已拥有一个可用的大模型 API Key，并已在环境中配置。

## 1. 添加 A2A 相关依赖

在您的 `pom.xml` 文件中，确保您已添加 `spring-ai-alibaba-a2a-common` 依赖。这个依赖提供了实现 A2A Agent Server 的核心功能。

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-a2a-common</artifactId>
    <version>${spring-ai-alibaba.version}</version>
</dependency>

<!-- A2A 模块基于 Web 环境 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

## 2. 创建一个本地智能体

首先，我们创建一个简单的“天气智能体”，它能够回答关于天气的问题。这部分与“第一个智能体”教程中的步骤类似。

### a. 创建天气工具

```java
package com.example.a2ademo.tool;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.function.Function;

@Configuration
public class WeatherTool {

    @Bean
    @Description("获取指定城市的天气信息")
    public Function<WeatherRequest, WeatherResponse> weatherFunction() {
        return request -> new WeatherResponse("今天 " + request.city() + " 的天气是晴天。");
    }

    public record WeatherRequest(String city) {}
    public record WeatherResponse(String weather) {}
}
```

### b. 创建智能体服务

创建一个 `AgentService` 来封装 `ReactAgent` 的创建和 `AgentCard` 的定义。`AgentCard` 是智能体向外暴露的“名片”。

```java
package com.example.a2ademo.agent;

import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.model.Edge;
import com.alibaba.cloud.ai.graph.model.Graph;
import com.alibaba.cloud.ai.graph.model.Node;
import io.a2a.spec.AgentCard;
import io.a2a.spec.ContactInfo;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class AgentService {

    private final ReactAgent weatherAgent;
    private final AgentCard agentCard;

    public AgentService(ChatClient.Builder chatClientBuilder, List<ToolCallback> toolCallbacks) {
        // 1. 构建 ReactAgent
        this.weatherAgent = ReactAgent.builder()
                .chatClient(chatClientBuilder.build())
                .tools(toolCallbacks)
                .name("WeatherAgent")
                .instruction("你是一个天气查询助手，使用工具来回答用户关于天气的问题。")
                .build();

        // 2. 定义 AgentCard
        this.agentCard = AgentCard.builder()
                .name("weather-agent")
                .version("1.0.0")
                .description("一个可以查询天气信息的智能体")
                .capabilities(List.of("weather-query"))
                .contact(ContactInfo.builder()
                        .endpoint("http://localhost:8080/a2a") // A2A 消息端点
                        .protocols(List.of("jsonrpc"))
                        .build())
                .build();
    }

    public AgentCard getAgentCard() {
        return agentCard;
    }

    public ReactAgent getAgent() {
        return weatherAgent;
    }
}
```
**代码解释:**
- `AgentCard` 中定义了智能体的唯一名称 `name`、能力 `capabilities` 和联系方式 `contact`。这些信息将帮助其他智能体发现并与之通信。
- `contact.endpoint` 指向了我们稍后将要配置的 A2A 消息处理端点。

## 3. 配置 A2A 服务端点

现在，我们需要将创建的 `ReactAgent` 包装成一个标准的 A2A 服务。这需要我们手动配置一些核心的 Bean。

创建一个 `A2aConfiguration.java` 文件：

```java
package com.example.a2ademo.config;

import com.alibaba.cloud.ai.a2a.A2aServerProperties;
import com.alibaba.cloud.ai.a2a.route.JsonRpcA2aRouterProvider;
import com.alibaba.cloud.ai.a2a.server.DefaultA2aServerExecutorProvider;
import com.alibaba.cloud.ai.a2a.server.GraphAgentExecutor;
import com.alibaba.cloud.ai.a2a.server.JsonRpcA2aRequestHandler;
import com.example.a2ademo.agent.AgentService;
import io.a2a.server.requesthandlers.JSONRPCHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

@Configuration
public class A2aConfiguration {

    // 步骤 1: 创建 Agent 执行器
    // 将 SAA Graph Agent 包装成 A2A 协议能够理解的执行器
    @Bean
    public GraphAgentExecutor graphAgentExecutor(AgentService agentService) {
        return new GraphAgentExecutor(agentService.getAgent());
    }

    // 步骤 2: 创建 JSON-RPC 核心处理器
    // 这是 io.a2a SDK 的核心类，负责处理具体的 JSON-RPC 方法
    @Bean
    public JSONRPCHandler jsonRpcHandler(GraphAgentExecutor executor, AgentService agentService) {
        return JSONRPCHandler.builder()
            .withAgentCard(agentService.getAgentCard())
            .withAgentExecutor(executor)
            .withExecutorService(new DefaultA2aServerExecutorProvider().getA2aServerExecutor())
            .build();
    }
    
    // 步骤 3: 创建 SAA A2A 请求处理器
    // 这是 SAA 提供的适配器，将 Spring Web 请求转换为 JSON-RPC 处理器能理解的格式
    @Bean
    public JsonRpcA2aRequestHandler a2aRequestHandler(JSONRPCHandler jsonRpcHandler) {
        return new JsonRpcA2aRequestHandler(jsonRpcHandler);
    }

    // 步骤 4: 创建并暴露 HTTP 路由
    // 使用 Spring WebFlux 的 Functional Endpoint 方式暴露 A2A 的标准端点
    @Bean
    public RouterFunction<ServerResponse> a2aRoutes(
            JsonRpcA2aRequestHandler handler, 
            A2aServerProperties properties) {
        
        JsonRpcA2aRouterProvider routerProvider = new JsonRpcA2aRouterProvider(
                properties.getAgentCardUrl(), 
                properties.getMessageUrl()
        );
        return routerProvider.getRouter(handler);
    }
}
```
**代码解释:**
- 这个配置类是连接 SAA Graph Agent 和 A2A 协议的桥梁。
- **`GraphAgentExecutor`**: 适配器，将 A2A 的 `execute` 请求转发给 `ReactAgent` 的 `invoke` 方法。
- **`JSONRPCHandler`**: `io.a2a` 库的核心，它需要 `AgentCard` 来响应发现请求，需要 `AgentExecutor` 来处理消息请求。
- **`JsonRpcA2aRequestHandler`**: SAA 提供的适配器，用于对接 Spring Web 环境。
- **`RouterFunction`**: 定义了两个 HTTP 端点 (`/.well-known/agent.json` 和 `/a2a`) 并将它们指向我们的处理器。

## 4. 配置 application.yml

最后，在 `application.yml` 中添加 A2A 服务的相关配置。

```yaml
# 基础服务配置
server:
  port: 8080
  
# SAA DashScope 模型配置
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-max

    # SAA A2A 服务器配置
    alibaba:
      a2a:
        server:
          # Agent Card 发现端点
          agent-card-url: /.well-known/agent.json
          # 消息处理端点  
          message-url: /a2a
```

## 5. 运行和测试

现在，启动您的 Spring Boot 应用。应用成功启动后，您的天气智能体就已经作为一个标准的 A2A 服务运行在 8080 端口了。

我们可以使用 `curl` 来模拟其他智能体与它进行交互。

### a. 发现智能体 (获取 Agent Card)

打开一个终端，执行以下命令：
```bash
curl http://localhost:8080/.well-known/agent.json
```
您应该会看到类似如下的 JSON 输出，这正是我们在 `AgentService` 中定义的 `AgentCard`：
```json
{
  "name": "weather-agent",
  "version": "1.0.0",
  "description": "一个可以查询天气信息的智能体",
  "capabilities": ["weather-query"],
  "contact": {
    "endpoint": "http://localhost:8080/a2a",
    "protocols": ["jsonrpc"]
  },
  "metadata": null
}
```

### b. 与智能体通信 (发送消息)

接下来，模拟一个客户端智能体向它提问。我们发送一个符合 JSON-RPC 2.0 规范的 `sendMessage` 请求到 `/a2a` 端点。

```bash
curl -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "parts": [
          {
            "kind": "text", 
            "text": "北京今天天气怎么样？"
          }
        ]
      }
    },
    "id": "1"
  }'
```
服务器会接收这个请求，`ReactAgent` 将会被调用，它会使用 `weatherFunction` 工具来找到答案，然后通过 JSON-RPC 响应返回结果。您会看到类似如下的输出：
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "task": {
      "id": "...",
      "contextId": "...",
      "status": {
        "state": "COMPLETED",
        ...
      },
      ...
      "artifacts": [
        {
          "kind": "text",
          "text": "今天 北京 的天气是晴天。"
        }
      ]
    }
  }
}
```
**结果解释:**
- `result.task.artifacts[0].text` 中包含了智能体最终的答复。这表明我们的 A2A 服务成功地处理了外部请求。

恭喜！您已经成功构建并运行了您的第一个 A2A 智能体。它现在已经准备好被其他智能体发现和调用了。

## 下一步

- **[与 Nacos 集成](./registry)**: 学习如何将您的 A2A 智能体注册到 Nacos，实现动态的服务发现。
- **[跨智能体通信模式](./communication)**: 探索如何构建一个 A2A 客户端来调用其他智能体，并了解更复杂的通信模式。
