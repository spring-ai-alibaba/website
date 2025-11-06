---
title: 使用 Spring AI MCP Client Starter 实现 MCP Client
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "使用 Spring AI MCP Client Starter 实现 MCP Client"
---

## 案例3：使用 Spring AI MCP Client Starter 实现 MCP Client

在前面的案例中，我们看到了如何手动配置和初始化 MCP Client。Spring AI 提供了更简便的方式来使用 MCP，通过starter可以大大简化 MCP Client 的配置和使用。Spring AI MCP 支持两种不同的传输层实现：基于 stdio 的实现和基于 SSE 的实现。

### 传输层介绍

#### stdio 传输层

stdio（标准输入输出）传输层是MCP最基本的传输实现方式。它通过进程间通信（IPC）实现，具体工作原理如下：

1. **进程创建**：MCP Client 会启动一个子进程来运行 MCP Server
2. **通信机制**：
   - 使用标准输入（stdin）向 MCP Server 发送请求
   - 通过标准输出（stdout）接收 MCP Server 的响应
   - 标准错误（stderr）用于日志和错误信息
3. **优点**：
   - 简单可靠，无需网络配置
   - 适合本地部署场景
   - 进程隔离，安全性好
4. **缺点**：
   - 仅支持单机部署
   - 不支持跨网络访问
   - 每个 Client 需要独立启动 Server 进程

#### SSE 传输层

SSE（Server-Sent Events）传输层是基于HTTP的单向通信机制，专门用于 Server 向 Client 推送数据。其工作原理如下：

1. **连接建立**：
   - Client 通过HTTP建立与 Server 的持久连接
   - 使用`text/event-stream`内容类型
2. **通信机制**：
   - Server 可以主动向 Client 推送消息
   - 支持自动重连机制
   - 支持事件ID和自定义事件类型
3. **优点**：
   - 支持分布式部署
   - 可跨网络访问
   - 支持多客户端连接
   - 轻量级，使用标准HTTP协议
4. **缺点**：
   - 需要额外的网络配置
   - 相比stdio实现略微复杂
   - 需要考虑网络安全性

### 3.1 基于 stdio 的 MCP 客户端实现

基于 stdio 的实现是最常见的 MCP 客户端实现方式，它通过标准输入输出流与 MCP 服务器进行通信。这种方式适用于本地部署的 MCP 服务器，可以直接在同一台机器上启动 MCP 服务器进程。

#### 添加依赖

首先，在您的项目中添加 Spring AI MCP starter 依赖：

```xml
<!-- 添加Spring AI MCP starter依赖 -->
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
</dependency>
```

#### 配置 MCP Server

在`application.yml`中配置 MCP Server：

```yaml
spring:
  ai:
    dashscope:
      # 配置通义千问API密钥
      api-key: ${DASH_SCOPE_API_KEY}
    mcp:
      client:
        stdio:
          # 指定 MCP Server 配置文件路径（推荐）
          servers-configuration: classpath:/mcp-servers-config.json
          # 直接配置示例，和上边的配制二选一
          # connections:
          #   server1:
          #     command: java
          #     args:
          #       - -jar
          #       - /path/to/your/mcp-server.jar
```

这个配置文件设置了 MCP Client 的基本配置，包括 API 密钥和服务器配置文件的位置。你也可以选择直接在配置文件中定义服务器配置。

```json
{
    "mcpServers": {
        // 定义名为"weather"的 MCP Server
        "weather": {
            // 指定启动命令为java
            "command": "java",
            // 定义启动参数
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-jar",
                "/path/to/your/mcp-server.jar"
            ],
            // 环境变量配置（可选）
            "env": {}
        }
    }
}
```

这个 JSON 配置文件定义了 MCP Server 的详细配置，包括如何启动 Server 进程、需要传递的参数以及环境变量设置。

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        // 启动Spring Boot应用
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(
            ChatClient.Builder chatClientBuilder, 
            ToolCallbackProvider tools,
            ConfigurableApplicationContext context) {
        return args -> {
            // 构建ChatClient并注入MCP Tool
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // 定义用户输入
            String userInput = "北京的天气如何？";
            // 打印问题
            System.out.println("\n>>> QUESTION: " + userInput);
            // 调用LLM并打印响应
            System.out.println("\n>>> ASSISTANT: " + 
                chatClient.prompt(userInput).call().content());

            // 关闭应用上下文
            context.close();
        };
    }
}
```

这段代码展示了如何在 Spring Boot 应用中使用 MCP Client。它创建了一个命令行运行器，构建了 ChatClient 并注入了 MCP Tool，然后使用这个客户端发送查询并获取响应。

### 3.2 基于 SSE 的 MCP Client 实现

除了基于 stdio 的实现外，Spring AI Alibaba 还提供了基于 Server-Sent Events (SSE) 的 MCP Client 实现。这种方式适用于远程部署的 MCP Server，可以通过 HTTP 协议与 MCP Server 进行通信。

#### 添加依赖

首先，在您的项目中添加 Spring AI MCP Client Starter 依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>

```

#### 配置 MCP Client

在`application.yml`中配置 MCP Client：

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASH_SCOPE_API_KEY}
    mcp:
      client:
        sse:
          connections:
            server1:
              url: http://localhost:8080
```

#### 使用 MCP 客户端

使用方式与基于stdio的实现相同，只需注入`ToolCallbackProvider`和`ChatClient.Builder`：

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(ChatClient.Builder chatClientBuilder, 
                                                ToolCallbackProvider tools,
                                                ConfigurableApplicationContext context) {
        return args -> {
            // 构建ChatClient并注入MCP工具
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // 使用ChatClient与LLM交互
            String userInput = "北京的天气如何？";
            System.out.println("\n>>> QUESTION: " + userInput);
            System.out.println("\n>>> ASSISTANT: " + chatClient.prompt(userInput).call().content());

            context.close();
        };
    }
}
```

### 3.3 总结

使用Spring AI Alibaba 提供的 MCP Client Starter，可以大大简化 MCP Client 的配置和使用。您只需要添加相应的依赖，配置 MCP Server，然后注入`ToolCallbackProvider`和`ChatClient.Builder`即可使用 MCP 功能。

根据您的部署需求，可以选择基于stdio的实现或基于SSE的实现。基于stdio的实现适用于本地部署的 MCP Server，而基于SSE的实现适用于远程部署的 MCP Server。

> 完整示例代码可在以下链接查看：
> - [基于 stdio 的实现](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/client/mcp-stdio-client-example)
> - [基于 SSE 的实现](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/client/mcp-webflux-client-example)

