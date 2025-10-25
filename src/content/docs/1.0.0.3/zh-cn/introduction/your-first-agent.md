---
title: 您的第一个智能体 (Your First Agent)
keywords: [Spring AI Alibaba, 智能体开发, ChatClient, 快速开始]
description: "学习如何使用 Spring AI Alibaba 创建您的第一个智能体应用，从项目设置到运行测试的完整指南。"
---

## 概述

本指南将带您一步步创建您的第一个 Spring AI Alibaba 智能体应用。我们将从最简单的聊天机器人开始，然后逐步添加更多功能，让您快速掌握智能体开发的基础知识。

## 前置条件

在开始之前，请确保您的开发环境满足以下要求：

- **JDK 17 或更高版本**
- **Maven 3.6+ 或 Gradle 7.0+**
- **阿里云 DashScope API Key**（[获取地址](https://dashscope.console.aliyun.com/)）

## 第一步：创建 Spring Boot 项目

### 1. 初始化项目

使用 Spring Initializr 创建一个新的 Spring Boot 项目：

```bash
curl https://start.spring.io/starter.zip \
  -d dependencies=web \
  -d javaVersion=17 \
  -d bootVersion=3.2.0 \
  -d groupId=com.example \
  -d artifactId=my-first-agent \
  -d name=my-first-agent \
  -d packageName=com.example.agent \
  -o my-first-agent.zip

unzip my-first-agent.zip
cd my-first-agent
```

### 2. 添加 Spring AI Alibaba 依赖

在 `pom.xml` 中添加 Spring AI Alibaba 的依赖管理和启动器：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-bom</artifactId>
            <version>1.0.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- Spring Boot Web Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring AI Alibaba DashScope Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
</dependencies>
```

## 第二步：配置应用

### 1. 配置 API 密钥

在 `src/main/resources/application.properties` 中添加您的 DashScope API 密钥：

```properties
# DashScope API 配置
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY:your-api-key-here}

# 可选：配置模型参数
spring.ai.dashscope.chat.options.model=qwen-turbo
spring.ai.dashscope.chat.options.temperature=0.7
spring.ai.dashscope.chat.options.max-tokens=1000

# 应用配置
server.port=8080
```

### 2. 设置环境变量

为了安全起见，建议通过环境变量设置 API 密钥：

```bash
export DASHSCOPE_API_KEY=your-actual-api-key
```

## 第三步：创建您的第一个智能体

### 1. 创建聊天控制器

创建 `src/main/java/com/example/agent/controller/ChatController.java`：

```java
package com.example.agent.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/simple")
    public String simpleChat(@RequestParam(defaultValue = "你好！") String message) {
        return chatClient.prompt()
                .user(message)
                .call()
                .content();
    }

    @PostMapping("/conversation")
    public String conversation(@RequestBody ChatRequest request) {
        return chatClient.prompt()
                .user(request.getMessage())
                .call()
                .content();
    }
}
```

### 2. 创建请求对象

创建 `src/main/java/com/example/agent/model/ChatRequest.java`：

```java
package com.example.agent.model;

public class ChatRequest {
    private String message;

    // 构造函数
    public ChatRequest() {}

    public ChatRequest(String message) {
        this.message = message;
    }

    // Getter 和 Setter
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
```

## 第四步：运行和测试

### 1. 启动应用

```bash
./mvnw spring-boot:run
```

### 2. 测试智能体

使用 curl 或浏览器测试您的智能体：

```bash
# 简单聊天测试
curl "http://localhost:8080/api/chat/simple?message=你好，请介绍一下自己"

# POST 请求测试
curl -X POST http://localhost:8080/api/chat/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "给我讲一个有趣的故事"}'
```

## 第五步：增强您的智能体

### 1. 添加流式响应

更新控制器以支持流式响应：

```java
@GetMapping(value = "/stream", produces = "text/plain")
public Flux<String> streamChat(@RequestParam String message) {
    return chatClient.prompt()
            .user(message)
            .stream()
            .content();
}
```

### 2. 添加聊天记忆

首先添加记忆依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-spring-boot-starter</artifactId>
</dependency>
```

然后创建带记忆的聊天服务：

```java
@Service
public class ChatService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public ChatService(ChatClient.Builder chatClientBuilder) {
        this.chatMemory = new InMemoryChatMemory();
        this.chatClient = chatClientBuilder
                .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
                .build();
    }

    public String chatWithMemory(String message, String conversationId) {
        return chatClient.prompt()
                .user(message)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
                .call()
                .content();
    }
}
```

### 3. 添加系统提示词

创建一个专业的智能体角色：

```java
@GetMapping("/assistant")
public String assistantChat(@RequestParam String message) {
    String systemPrompt = """
        你是一个专业的 Java 开发助手，专门帮助开发者解决 Spring AI Alibaba 相关的问题。
        请用友好、专业的语调回答问题，并在适当时提供代码示例。
        如果问题超出你的专业范围，请诚实地说明并建议用户寻求其他帮助。
        """;

    return chatClient.prompt()
            .system(systemPrompt)
            .user(message)
            .call()
            .content();
}
```

## 第六步：错误处理和最佳实践

### 1. 添加异常处理

```java
@ControllerAdvice
public class ChatExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("智能体服务暂时不可用，请稍后重试：" + e.getMessage());
    }
}
```

### 2. 添加请求验证

```java
@PostMapping("/conversation")
public String conversation(@Valid @RequestBody ChatRequest request) {
    if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
        throw new IllegalArgumentException("消息内容不能为空");
    }
    
    return chatClient.prompt()
            .user(request.getMessage())
            .call()
            .content();
}
```

## 下一步

恭喜！您已经成功创建了第一个 Spring AI Alibaba 智能体。现在您可以：

1. **探索工具调用**：让智能体能够调用外部 API 和服务
2. **集成 RAG**：为智能体添加知识库检索能力
3. **构建多智能体系统**：使用 Graph 框架创建复杂的工作流
4. **添加多模态支持**：处理图片、音频等多种输入类型

## 完整示例代码

您可以在我们的官方示例仓库中找到完整的代码：

- **GitHub 仓库**：[https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)
- **Playground 体验**：[本地部署指南](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground)

## 常见问题

### Q: 如何获取 DashScope API Key？
A: 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)，注册并创建 API Key。

### Q: 支持哪些模型？
A: 支持通义千问系列模型，包括 qwen-turbo、qwen-plus、qwen-max 等。

### Q: 如何处理 API 调用限制？
A: 可以通过配置重试机制和错误处理来优雅地处理 API 限制。

开始您的智能体开发之旅吧！
