---
title: "MCP Router: 智能路由"
description: "学习如何使用 Spring AI Alibaba MCP Router 作为 AI Agent 的智能工具网关，实现服务的语义搜索、动态路由和统一调用。"
---

# MCP Router: 智能路由

## 概述

**MCP Router** 是 Spring AI Alibaba 提供的一个强大的**智能工具网关**。它位于您的 AI Agent 和庞大的分布式 MCP 服务生态之间，扮演着交通枢纽和智能调度员的角色。

### 为什么需要 MCP Router？

想象一下，您的企业中有数十甚至上百个 MCP 工具服务（天气查询、数据库操作、订单管理、文件处理等），如果让 AI Agent 直接管理和发现这些服务，将会非常复杂。MCP Router 正是为解决这一挑战而生，它为 Agent 提供了简化的统一入口，并带来了三大核心能力：

1.  **服务的语义搜索**: Agent 无需知道具体服务的名称。它可以用自然语言描述任务（例如“我需要查一下数据库里的用户信息”），Router 会利用内置的向量数据库，**智能地**找到并推荐最匹配的 MCP 服务及其工具。
2.  **动态路由与代理**: Agent 只需告诉 Router 要调用哪个服务的哪个工具，Router 会负责从 Nacos 动态发现该服务的健康实例，并将请求**代理**过去。这使得 Agent 无需关心服务的实际网络地址、负载均衡或健康状态。
3.  **统一的工具视图**: Router 向 Agent 暴露了一组固定的、功能强大的元工具（如 `searchMcpServer`, `useTool`），极大地简化了 Agent 的逻辑。

## 核心架构

```mermaid
graph TD
    subgraph "AI 应用层"
        Agent[LLM Agent]
    end
    
    subgraph "MCP Router 网关层"
        RouterService[McpRouterService] --> VectorStore[向量数据库<br/>(用于语义搜索)]
        RouterService --> ProxyService[服务代理<br/>(用于工具调用)]
        ProxyService --> ServiceDiscovery[Nacos 服务发现]
    end
    
    subgraph "Nacos 注册中心"
        Nacos
    end
    
    subgraph "分布式 MCP 服务生态"
        Weather[天气服务]
        Database[数据库服务]
        File[文件服务]
        Custom[...]
    end
    
    Agent -- "使用 'searchMcpServer', 'useTool' 等元工具" --> RouterService
    ServiceDiscovery --> Nacos
    
    Weather -- "注册" --> Nacos
    Database -- "注册" --> Nacos
    File -- "注册" --> Nacos
    Custom -- "注册" --> Nacos
```

## 快速上手

### 1. 添加依赖

在您的 AI Agent 应用的 `pom.xml` 中，添加 MCP Router 的 starter 依赖。

```xml
<dependencies>
    <!-- 核心依赖：MCP Router -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-router</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>
    
    <!-- DashScope LLM -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
</dependencies>
```
> **注意**: `spring-ai-alibaba-starter-mcp-router` 已经传递依赖了 Nacos Discovery，您无需重复引入。

### 2. 启用并配置 Router

在 `application.yml` 中，启用 Router 并配置 Nacos 地址。

```yaml
spring:
  application:
    name: mcp-router-demo
  # 1. 配置 DashScope 和 Nacos
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-max-latest
    # SAA 为 MCP Nacos 提供的专属配置
    alibaba:
      mcp:
        nacos:
          server-addr: 127.0.0.1:  8848
          username: nacos
          password: nacos
          client:
            enabled: true

  # 2. 启用并配置 MCP Router
  ai:
    alibaba:
      mcp:
        router:
          enabled: true
          # （可选）预加载的服务列表，Router 启动时会自动初始化它们
          service-names: ["calculator-server", "weather-server"]
          update-interval: 30000 # 从 Nacos 更新服务列表的间隔
          vector-store:
            similarity-threshold: 0.2
```

### 3. 将 Router 工具注册给 Agent

`McpRouterService` 包含了 Router 提供的所有核心元工具。我们需要做的就是将这个 Service Bean 注册到我们的 `ChatClient` 或 `Agent` 中。

```java
@SpringBootApplication
@EnableDiscoveryClient
public class McpRouterApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpRouterApplication.class, args);
    }

    @Bean
    public CommandLineRunner demoRunner(ChatClient.Builder chatClientBuilder,
                                       McpRouterService mcpRouterService) {
        return args -> {
            var chatClient = chatClientBuilder
                // 关键：将 McpRouterService 中所有 @Tool 方法注册为 Agent 的可用工具
                .defaultTools(new MethodToolCallbackProvider(mcpRouterService))
                .build();

            runRouterDemo(chatClient);
        };
    }

    private void runRouterDemo(ChatClient chatClient) {
        String question = "我需要查询天气，请帮我找一个相关的服务，然后告诉我北京的天气怎么样？";
        System.out.println("提问: " + question);
        System.out.println("回答: " + chatClient.prompt(question).call().content());
    }
}
```
**发生了什么？**
1.  Agent 收到问题后，首先会思考如何解决“找一个相关的服务”。
2.  它发现 `McpRouterService` 提供了 `searchMcpServer` 工具，描述是“语义搜索MCP服务”。
3.  Agent 调用 `searchMcpServer("天气查询")`。
4.  Router 在其向量数据库中进行搜索，返回了 `weather-server` 的信息。
5.  Agent 知道了 `weather-server` 的存在，并从中了解到它有一个 `getWeather` 工具。
6.  Agent 接着调用 `useTool("weather-server", "getWeather", "{\"location\":\"北京\"}")`。
7.  Router 收到请求，从 Nacos 找到 `weather-server` 的一个健康实例，并将请求代理过去。
8.  `weather-server` 返回结果，通过 Router 最终传递给 Agent。
9.  Agent 总结最终答案返回给用户。

## Router 核心元工具详解

MCP Router 向 Agent 暴露了一组功能强大的元工具，Agent 通过调用这些工具来与整个 MCP 服务生态系统交互。

### 1. `searchMcpServer`

根据自然语言描述，从已注册的服务中进行语义搜索，返回最相关的服务列表。

- **Agent 调用示例**: `searchMcpServer(description="一个能操作数据库的服务", keywords="database,sql,query", limit=3)`
- **返回 (JSON 字符串)**: 包含服务名称、描述、相似度分数、提供的工具列表等信息的服务列表。

```json
{
  "success": true,
  "results": [
    {
      "serverName": "database-query-server",
      "description": "提供 SQL 数据库查询功能",
      "similarity": 0.92,
      "tools": ["executeQuery", "getSchema"]
    }
  ]
}
```

### 2. `useTool`

执行指定 MCP 服务中的特定工具。这是最核心的工具调用方法。

- **Agent 调用示例**: `useTool(serviceName="weather-server", toolName="getWeatherForecast", parameters="{\"location\":\"北京\",\"days\":3}")`
- **返回 (JSON 字符串)**: 包含工具执行结果的详细信息。

```json
{
  "success": true,
  "serviceName": "weather-server",
  "toolName": "getWeatherForecast",
  "result": {
    "type": "text",
    "content": "北京未来3天天气预报..."
  }
}
```

### 3. `addMcpServer`

手动从 Nacos 中加载一个服务并使其在 Router 中可用。通常在 `searchMcpServer` 找到服务后，Agent 会调用此方法来“激活”该服务。

- **Agent 调用示例**: `addMcpServer(serviceName="database-query-server")`
- **返回 (JSON 字符串)**: 包含服务的详细信息、所有工具的定义以及如何使用这些工具的指南。

### 4. `getAllMcpServers`

获取当前 Router 已加载的所有服务的列表。

- **Agent 调用示例**: `getAllMcpServers()`
- **返回 (JSON 字符串)**: 当前可用服务的列表。

### 5. `debugMcpService`

对指定服务进行健康检查和连接诊断，用于排查问题。

- **Agent 调用示例**: `debugMcpService(serviceName="weather-server")`
- **返回 (JSON 字符串)**: 详细的诊断报告，包括 Nacos 状态、网络可达性、连接池状态等。

## 高级配置

您可以在 `application.yml` 的 `spring.ai.alibaba.mcp.router` 前缀下对 Router 的行为进行详细配置。

### 向量存储配置
```yaml
spring:
  ai:
    alibaba:
      mcp:
        router:
          vector-store:
            # 内置的基于内存的简单向量存储，无需额外依赖
            type: simple
            # 搜索时返回结果的最低相似度阈值
            similarity-threshold: 0.2
            # 向量维度，需要与 Embedding 模型的输出维度一致
            embedding-dimensions: 1536
```

### 代理与连接池配置
```yaml
spring:
  ai:
    alibaba:
      mcp:
        router:
          proxy:
            connection-pool:
              # 对每个 MCP Server 的最大连接数
              max-size: 20
              max-wait: 10000 # 获取连接的最大等待时间 (毫秒)
            request:
              timeout: 30000  # 工具调用的请求超时 (毫秒)
              retry-attempts: 3 # 失败重试次数
```

## 下一步

- **[Nacos 服务注册与发现](./nacos-registry)**: 深入了解 MCP 服务端如何注册到 Nacos，以及动态配置等高级玩法。
