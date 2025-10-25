---
title: "MCP 快速上手"
description: "通过一个本地 Quick-Start 和一个分布式 Nacos 示例，快速构建您的第一个 MCP 服务器和客户端。"
---

# MCP 快速上手

本指南将通过两个循序渐进示例，带您快速上手 Spring AI Alibaba MCP：

1.  **本地 STDIO 示例**: 在 5 分钟内，于您的本地机器上构建并运行一个简单的 MCP Server 和 Client，理解 MCP 的基本工作流程。
2.  **分布式 Nacos 示例**: 学习如何将 MCP 与 Nacos 服务注册中心集成，构建一个更健壮的、可用于生产环境的分布式 AI 工具服务。

## 前置条件

在开始之前，请确保您的开发环境满足以下要求：

- JDK 17 或更高版本
- Maven 3.6+ 或 Gradle 7+
- 一个有效的[通义千问 DashScope API Key](https://dashscope.console.aliyun.com/)
- （可选，用于分布式示例）本地运行的 Nacos 服务器 2.2.0+

## 示例一：本地 STDIO 通信

STDIO (标准输入/输出) 是最简单的 MCP 通信方式，它允许您的 AI 应用 (Client) 直接通过进程通信调用本地的工具 (Server)，非常适合本地开发和快速原型验证。

### 1. 创建 MCP Server

MCP Server 是一个独立的 Spring Boot 应用，它封装了具体的工具能力。

**a. 创建项目并添加依赖**

首先，创建一个名为 `my-mcp-server` 的新 Maven 项目。然后，更新 `pom.xml` 文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.5</version>
        <relativePath/>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>my-mcp-server</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <java.version>17</java.version>
        <spring-ai-alibaba.version>1.0.0.3-SNAPSHOT</spring-ai-alibaba.version>
    </properties>
    
    <dependencies>
        <!-- 核心依赖：MCP Server (STDIO 模式) -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-mcp-server</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```
**代码解释:**
- **`<parent>`**: 我们使用 `spring-boot-starter-parent` 来管理依赖版本，请注意我们已将其更新至 `3.4.5`。
- **`spring-ai-starter-mcp-server-stdio`**: 这是实现 STDIO 模式 MCP Server 的核心依赖。

**b. 编写工具代码**

创建一个 `GreetingService.java` 类，用于提供具体的工具方法。

```java
package com.example;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class GreetingService {

    @Tool(description = "生成个性化的问候语")
    public String greet(@ToolParam(description = "对方的名字") String name) {
        String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        return String.format("你好 %s! 现在是 %s。很高兴认识你！", name, currentTime);
    }

    @Tool(description = "获取当前日期和时间")
    public String getCurrentTime() {
        return "当前时间: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
```
**代码解释:**
- **`@Tool`**: 将一个方法标记为可供 AI 调用的工具。`description` 属性至关重要，LLM 会根据它来理解工具的功能。
- **`@ToolParam`**: 描述工具的输入参数。

**c. 配置并启动 Server**

创建主应用类 `MyMcpServerApplication.java`，并将工具注册到 Spring 上下文中。

```java
package com.example;

import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MyMcpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyMcpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider myTools(GreetingService greetingService) {
        // 将 GreetingService 中所有标记了 @Tool 注解的方法注册为工具
        return MethodToolCallbackProvider.builder()
            .toolObjects(greetingService)
            .build();
    }
}
```

最后，在 `src/main/resources/application.yml` 中添加配置：

```yaml
spring:
  # 必须禁用 Web 环境，因为 STDIO 模式不需要启动 Web 服务器
  main:
    web-application-type: none
    banner-mode: off
  ai:
    mcp:
      server:
        name: my-greeting-server
        version: 1.0.0

# 关键：必须禁用控制台日志，以确保 STDIO 信道纯净
logging:
  pattern:
    console: ""
```

**d. 构建 Server**

在 `my-mcp-server` 项目根目录下，执行构建命令：
```bash
mvn clean package -DskipTests
```
构建成功后，您会在 `target/` 目录下找到 `my-mcp-server-1.0.0.jar`。

### 2. 创建 MCP Client

MCP Client 是 AI 应用的核心，它负责发现并调用 MCP Server 提供的工具。

**a. 创建项目并添加依赖**

创建一个新的 Maven 项目 `my-mcp-client`，并更新 `pom.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.5</version>
        <relativePath/>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>my-mcp-client</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <java.version>17</java.version>
        <spring-ai-alibaba.version>1.0.0.3-SNAPSHOT</spring-ai-alibaba.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.alibaba.cloud.ai</groupId>
                <artifactId>spring-ai-alibaba-bom</artifactId>
                <version>${spring-ai-alibaba.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
    
    <dependencies>
        <!-- 核心依赖：MCP Client -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-mcp-client</artifactId>
        </dependency>
        
        <!-- DashScope LLM -->
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        </dependency>
    </dependencies>
    
    <!-- ... build section ... -->
</project>
```
**代码解释:**
- **`<dependencyManagement>`**: 我们引入了 `spring-ai-alibaba-bom` 来统一管理 SAA 相关依赖的版本。
- **`spring-ai-starter-mcp-client`**: MCP Client 的核心依赖。
- **`spring-ai-alibaba-starter-dashscope`**: 与通义千问模型交互的依赖。

**b. 编写 Client 应用**

创建主应用类 `MyMcpClientApplication.java`，它将通过 `ChatClient` 调用 MCP 工具。

```java
package com.example;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MyMcpClientApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyMcpClientApplication.class, args);
    }

    @Bean
    public CommandLineRunner runDemo(
        ChatClient.Builder chatClientBuilder, 
        ToolCallbackProvider tools, // Spring 会自动注入 MCP Client 提供的工具
        ConfigurableApplicationContext context) {

        return args -> {
            var chatClient = chatClientBuilder
                .defaultToolCallbacks(tools) // 将 MCP 工具注册到 ChatClient
                .build();

            System.out.println("=== MCP 快速上手演示 ===\n");

            String question1 = "请用你的工具向“张三”问好";
            System.out.println("提问: " + question1);
            System.out.println("回答: " + chatClient.prompt(question1).call().content());

            System.out.println("\n" + "=".repeat(50) + "\n");

            String question2 = "现在几点了？";
            System.out.println("提问: " + question2);
            System.out.println("回答: " + chatClient.prompt(question2).call().content());

            context.close();
        };
    }
}
```

**c. 配置 Client**

在 `src/main/resources/application.yml` 中配置 AI 模型和 MCP Client：

```yaml
spring:
  application:
    name: my-mcp-client
  ai:
    # 配置你的 DashScope API Key
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-max-latest
    # 配置 MCP Client
    mcp:
      client:
        stdio:
          # 指向一个 JSON 文件，该文件定义了如何启动 MCP Server
          servers-configuration: classpath:mcp-servers-config.json
```

**d. 创建 Server 配置文件**

在 `src/main/resources` 目录下，创建 `mcp-servers-config.json` 文件。这个文件告诉 MCP Client 如何启动我们之前构建的 `my-mcp-server`。

```json
{
  "mcpServers": {
    "weather": {
      "command": "java",
      "args": [
        "-Dspring.ai.mcp.server.stdio=true",
        "-Dspring.main.web-application-type=none",
        "-Dlogging.pattern.console=",
        "-jar", 
        "../server/mcp-stdio-server-example/target/mcp-stdio-server-example-1.0.0-SNAPSHOT.jar"
      ],
      "timeout": 30000,
      "env": {}
    }
  }
}
```
**重要提示:**
- **`-Dspring.ai.mcp.server.stdio=true`**: 启用 STDIO 传输模式
- **`-Dspring.main.web-application-type=none`**: 禁用 Web 环境
- **`-Dlogging.pattern.console=`**: 禁用控制台日志以保证 STDIO 通信信道的纯净
- **路径**: 这里的 jar 路径是一个**相对路径**。请根据您的实际项目结构进行调整，也可以使用绝对路径

### 3. 运行演示

**a. 设置环境变量**
```bash
export AI_DASHSCOPE_API_KEY=your-dashscope-api-key
```

**b. 运行客户端**
确保您已经构建了 `my-mcp-server`。然后，在 `my-mcp-client` 项目根目录下，运行：
```bash
mvn spring-boot:run
```

**c. 查看输出**
您应该能看到类似以下的输出，证明 Client 成功通过 STDIO 启动了 Server 并调用了其中的工具：

```
=== MCP 快速上手演示 ===

提问: 请用你的工具向“张三”问好
回答: 你好 张三! 现在是 2024-01-15 10:30:45。很高兴认识你！

==================================================

提问: 现在几点了？
回答: 当前时间: 2024-01-15 10:30:46
```

---

## 示例二：集成 Nacos 实现分布式服务

在生产环境中，我们通常会将工具作为独立的微服务部署。通过 Nacos，MCP 可以实现服务的自动注册与发现，构建一个可扩展、高可用的分布式工具生态。

### 1. 启动 Nacos

如果您本地没有 Nacos 环境，可以使用 Docker 快速启动一个单机版 Nacos：
```bash
docker run --name nacos-standalone -e MODE=standalone -p 8848:8848 -d nacos/nacos-server:2.2.3
```
访问 `http://localhost:8848/nacos`，使用默认用户名/密码 `nacos/nacos` 登录。

### 2. 创建 Nacos MCP Server

**a. 添加依赖**
创建一个新的 Maven 项目 `nacos-mcp-server`。`pom.xml` 的主要依赖如下：
```xml
<properties>
    <spring-ai-alibaba.version>1.0.0.3-SNAPSHOT</spring-ai-alibaba.version>
</properties>

<dependencyManagement>
    <!-- ... SAA BOM ... -->
</dependencyManagement>

<dependencies>
    <!-- 核心依赖：MCP Nacos Server -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-registry</artifactId>
    </dependency>
    
    <!-- 需要 Web 环境来暴露 SSE 端点 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

**b. 编写工具代码**
创建一个 `CalculatorService.java`：
```java
package com.example;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

@Service
class CalculatorService {
    @Tool(description = "计算两个数字的和")
    public double add(@ToolParam(description = "第一个数") double a,
                     @ToolParam(description = "第二个数") double b) {
        return a + b;
    }

    @Tool(description = "计算两个数字的积")
    public double multiply(@ToolParam(description = "第一个数") double a,
                          @ToolParam(description = "第二个数") double b) {
        return a * b;
    }
}
```

**c. 配置 Nacos**
在 `application.yml` 中配置服务信息和 Nacos 地址。
```yaml
server:
  port: 9001

spring:
  application:
    name: calculator-mcp-server
  # MCP Server 配置
  ai:
    mcp:
      server:
        name: calculator-server
        version: 1.0.0
        # 对于 Web 服务，推荐使用 ASYNC 模式
        type: ASYNC
        instructions: "一个提供基本数学运算的计算器服务"
        # 暴露 SSE 通信端点
        sse-message-endpoint: /mcp/messages
        capabilities:
          tool: true
  # Nacos Client for MCP 配置
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        username: nacos
        password: nacos
  # SAA Nacos for MCP 配置
  ai:
    alibaba:
      mcp:
        nacos:
          registry:
            enabled: true
            service-group: mcp-server
```

### 3. 创建 Nacos MCP Client

**a. 添加依赖**
创建 `nacos-mcp-client` 项目，`pom.xml` 主要依赖如下：
```xml
<dependencies>
    <!-- SAA MCP Nacos Starter (包含了 MCP Client) -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-registry</artifactId>
    </dependency>
    
    <!-- DashScope LLM -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
</dependencies>
```

**b. 配置 Nacos Client**
在 `application.yml` 中配置 Nacos 服务发现：
```yaml
spring:
  application:
    name: nacos-mcp-client
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
    alibaba:
      mcp:
        # Nacos Client for MCP 配置
        nacos:
          server-addr: 127.0.0.1:8848
          username: nacos
          password: nacos
        # MCP Client 配置
        client:
          sse:
            # 需要发现的服务列表
            servers:
              - calculator-server
            # 启用服务发现
            discovery:
              enabled: true
              # 服务列表刷新间隔
              refresh-interval: 30000
server:
  port: 9002
```

**c. 编写 Client 应用**
`NacosMcpClientApplication.java` 与本地示例类似，只是提问的内容不同：
```java
package com.example;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class NacosMcpClientApplication {

    public static void main(String[] args) {
        SpringApplication.run(NacosMcpClientApplication.class, args);
    }

    @Bean
    public CommandLineRunner runDemo(ChatClient.Builder chatClientBuilder, ToolCallbackProvider tools) {
        return args -> {
            var chatClient = chatClientBuilder.defaultToolCallbacks(tools).build();
            String question = "帮我计算 (123 + 456) * 2 的结果";
            System.out.println("提问: " + question);
            System.out.println("回答: " + chatClient.prompt(question).call().content());
        };
    }
}
```

### 4. 运行 Nacos 演示

**a. 依次启动服务**
1.  启动 Nacos Server。
2.  启动 `nacos-mcp-server` 应用。
3.  启动 `nacos-mcp-client` 应用。

**b. 检查 Nacos 控制台**
登录 Nacos 控制台，在“服务管理” -> “服务列表”中，您应该能看到名为 `calculator-server` 的服务已成功注册。

**c. 查看客户端输出**
Client 应用在启动后会自动从 Nacos 发现 `calculator-server`，连接并调用其工具，然后输出计算结果。

## 下一步

恭喜！您已经掌握了 MCP 的两种核心使用方式。现在，您可以继续深入学习：

- **[MCP 协议基础](./protocol-basics)**: 深入理解 MCP 的架构、设计理念和核心原语。
- **[Nacos 服务注册](./nacos-registry)**: 了解更多关于 Nacos 集成的高级特性，如动态配置、健康检查等。
- **[MCP Router 智能路由](./mcp-router)**: 学习如何使用 MCP Router 实现服务的语义搜索和智能路由。
- **[示例代码仓库](https://github.com/alibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example)**: 获取本文档所有示例的完整可运行代码。
