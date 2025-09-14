---
title: "MCP 集成模式"
description: "探索 Spring AI Alibaba MCP 的多种集成模式，包括基于 WebFlux 的响应式服务、与 NodeJS 生态的集成等。"
---

# MCP 集成模式

在 [MCP 快速上手](./mcp-quickstart) 指南中，我们学习了如何通过 STDIO 和 Nacos 构建基本的 MCP 服务。本文将深入探讨更多高级的集成模式，帮助您将 MCP 应用于更广泛的场景。

## 模式一：WebFlux 响应式服务

当您的工具需要处理高并发请求或与响应式系统集成时，使用 WebFlux 和 SSE (Server-Sent Events) 是理想的选择。

### 1. 创建 WebFlux MCP Server

**a. 添加依赖**

在您的 Maven 项目中，添加 `spring-boot-starter-webflux` 和 `spring-ai-starter-mcp-server-webflux` 依赖。

```xml
<dependencies>
    <!-- MCP Server (WebFlux for SSE) -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
    </dependency>
    
    <!-- Spring Boot WebFlux -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
</dependencies>
```

**b. 编写工具代码**

我们以一个提供天气查询的 `OpenMeteoService` 为例。

```java
@Service
public class OpenMeteoService {

    private final RestClient restClient;

    public OpenMeteoService() {
        this.restClient = RestClient.builder()
            .baseUrl("https://api.open-meteo.com/v1")
            .defaultHeader("Accept", "application/json")
            .build();
    }

    @Tool(description = "获取指定经纬度的天气预报")
    public String getWeatherForecastByLocation(
        @ToolParam(description = "纬度") double latitude,
        @ToolParam(description = "经度") double longitude) {
        
        // 调用第三方天气 API
        var weatherData = restClient.get()
            .uri("/forecast?latitude={lat}&longitude={lon}&current=temperature_2m", latitude, longitude)
            .retrieve()
            .body(Map.class);

        return "经纬度 " + latitude + ", " + longitude + " 的当前气温是: " + weatherData.get("current");
    }
}
```

**c. 配置 Server**

在 `application.yml` 中，将 `type` 设置为 `ASYNC` 并指定 SSE 端点。

```yaml
server:
  port: 8080

spring:
  ai:
    mcp:
      server:
        name: webflux-weather-server
        version: 1.0.0
        # 关键：设置为 ASYNC 以支持响应式
        type: ASYNC
        # 关键：定义 SSE 消息端点
        sse-message-endpoint: /mcp/messages
        capabilities:
          tool: true
```
启动该应用后，一个基于 WebFlux 的 MCP Server 就在 8080 端口的 `/mcp/messages` 路径上等待客户端连接了。

### 2. 创建 WebFlux MCP Client

Client 端可以通过 Nacos 自动发现并连接到这个 WebFlux Server。相关配置请参考 [MCP 快速上手](./mcp-quickstart) 中的 Nacos 示例。Client 的配置会自动处理与 SSE 端点的连接，您无需进行额外的特定于 WebFlux 的配置。

## 模式二：与 NodeJS 生态集成

MCP 是一个开放协议，不限于 Java 生态。一个强大的用例是让 Java Agent 与 NodeJS 生态中的工具进行交互。官方提供了多个基于 NodeJS 的 MCP Server 实现，例如文件系统、SQLite 等。

本示例将演示如何让我们的 Java Agent 与一个 NodeJS 实现的 **文件系统 MCP Server** 进行通信。

### 1. 前置条件

请确保您的环境中已安装 [Node.js](https://nodejs.org/) 和 `npx`。

### 2. 创建手动集成 Client

**a. 核心逻辑**

这次我们不使用 Spring Boot 的自动配置，而是手动创建一个 `McpSyncClient` 实例来连接 NodeJS Server。

```java
@SpringBootApplication
public class FileSystemMcpApplication {

    public static void main(String[] args) {
        SpringApplication.run(FileSystemMcpApplication.class, args);
    }

    @Bean
    public CommandLineRunner runDemo(ChatClient.Builder chatClientBuilder,
                                    McpSyncClient mcpClient, // 注入我们手动创建的 Client
                                    ConfigurableApplicationContext context) {
        return args -> {
            var chatClient = chatClientBuilder
                // 关键：将 McpSyncClient 包装成 ToolCallbackProvider
                .defaultToolCallbacks(new SyncMcpToolCallbackProvider(mcpClient))
                .build();

            // 准备一个测试文件
            Path testFilePath = Paths.get(System.getProperty("user.dir"), "test.txt");
            Files.write(testFilePath, "Hello MCP World!".getBytes());

            // 示例1: 让 Agent 读取文件内容
            String question1 = "请帮我读取 " + testFilePath + " 文件的内容";
            System.out.println("提问: " + question1);
            System.out.println("回答: " + chatClient.prompt(question1).call().content());

            context.close();
        };
    }

    @Bean(destroyMethod = "close")
    public McpSyncClient mcpClient() {
        // 关键：定义如何启动 NodeJS Server
        var stdioParams = ServerParameters.builder("npx")
            // 使用 npx 自动下载并运行 @modelcontextprotocol/server-filesystem
            // 第二个参数是文件系统的根目录
            .args("-y", "@modelcontextprotocol/server-filesystem", System.getProperty("user.dir"))
            .build();

        // 手动构建一个同步的、基于 STDIO 的 MCP Client
        var mcpClient = McpClient.sync(new StdioClientTransport(stdioParams))
            .requestTimeout(Duration.ofSeconds(10))
            .build();

        // 初始化连接
        mcpClient.initialize();
        return mcpClient;
    }
}
```
**代码解释:**
- **`mcpClient()` Bean**:
  - 我们没有使用 `application.yml` 来配置 Client，而是通过代码手动构建。
  - `ServerParameters.builder("npx")`: 定义了启动 Server 的命令。`npx -y @modelcontextprotocol/server-filesystem` 会自动下载并运行官方提供的文件系统 Server。
  - `McpClient.sync(...)`: 创建一个同步的 MCP Client 实例。
- **`runDemo(...)`**:
  - `SyncMcpToolCallbackProvider`: 这是一个适配器，它将一个 `McpSyncClient` 实例包装成 Spring AI 的 `ToolCallbackProvider`，这样 `ChatClient` 就能像使用普通工具一样使用 MCP 服务了。

**b. 运行和测试**

只需一个简单的 `application.yml` 来配置 API Key：
```yaml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```
运行 `FileSystemMcpApplication`，您将看到 Agent 成功调用了 NodeJS 的文件服务，并读取了 `test.txt` 的内容。

## 模式三：集成 SQLite 数据库

与文件系统类似，我们也可以通过 MCP 与 SQLite 数据库进行交互，这展示了 MCP 在数据操作方面的潜力。

### 1. 准备数据库

首先，创建一个测试用的 SQLite 数据库文件。
```bash
# 创建一个名为 test.db 的数据库文件
sqlite3 test.db

# 在 sqlite3 命令行中执行以下 SQL
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
```

### 2. 创建 Client

Client 端的代码与文件系统示例非常相似，只需修改 `mcpClient()` Bean 的启动参数即可。

```java
@Bean(destroyMethod = "close")
public McpSyncClient mcpClient() {
    // 获取 test.db 文件的绝对路径
    String dbPath = Paths.get(System.getProperty("user.dir"), "test.db").toString();
    
    var stdioParams = ServerParameters.builder("npx")
        // 关键：将 Server 切换为 @modelcontextprotocol/server-sqlite
        .args("-y", "@modelcontextprotocol/server-sqlite", dbPath)
        .build();

    var mcpClient = McpClient.sync(new StdioClientTransport(stdioParams))
        .requestTimeout(Duration.ofSeconds(10))
        .build();

    mcpClient.initialize();
    return mcpClient;
}

// 在 CommandLineRunner 中，可以提问关于数据库的问题
// ...
String question = "请查询 users 表中的所有数据";
// ...
```
这个示例展示了 MCP 的强大之处：您的 Java Agent 无需任何 JDBC 驱动或数据库客户端库，仅通过标准的 MCP 协议，就能够与一个完全不同的技术栈（NodeJS + SQLite）进行复杂的数据库查询交互。

## 下一步

- **[MCP Router 智能路由](./mcp-router)**: 学习如何构建一个可以智能发现和路由到不同 MCP 服务的路由层。
