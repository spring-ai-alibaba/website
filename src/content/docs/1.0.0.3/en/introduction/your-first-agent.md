---
title: Your First Agent
keywords: [Spring AI Alibaba, Agent Development, ChatClient, Quick Start]
description: "Learn how to create your first agent application using Spring AI Alibaba, from project setup to running tests - a complete guide."
---

## Overview

This guide will walk you through creating your first Spring AI Alibaba agent application step by step. We'll start with the simplest chatbot and gradually add more features to help you quickly master the basics of agent development.

## Prerequisites

Before getting started, ensure your development environment meets the following requirements:

- **JDK 17 or higher**
- **Maven 3.6+ or Gradle 7.0+**
- **Alibaba Cloud DashScope API Key** ([Get it here](https://dashscope.console.aliyun.com/))

## Step 1: Create Spring Boot Project

### 1. Initialize Project

Create a new Spring Boot project using Spring Initializr:

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

### 2. Add Spring AI Alibaba Dependencies

Add Spring AI Alibaba dependency management and starter to your `pom.xml`:

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

## Step 2: Configure Application

### 1. Configure API Key

Add your DashScope API key to `src/main/resources/application.properties`:

```properties
# DashScope API Configuration
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY:your-api-key-here}

# Optional: Configure model parameters
spring.ai.dashscope.chat.options.model=qwen-turbo
spring.ai.dashscope.chat.options.temperature=0.7
spring.ai.dashscope.chat.options.max-tokens=1000

# Application Configuration
server.port=8080
```

### 2. Set Environment Variable

For security, it's recommended to set the API key via environment variable:

```bash
export DASHSCOPE_API_KEY=your-actual-api-key
```

## Step 3: Create Your First Agent

### 1. Create Chat Controller

Create `src/main/java/com/example/agent/controller/ChatController.java`:

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
    public String simpleChat(@RequestParam(defaultValue = "Hello!") String message) {
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

### 2. Create Request Object

Create `src/main/java/com/example/agent/model/ChatRequest.java`:

```java
package com.example.agent.model;

public class ChatRequest {
    private String message;

    // Constructors
    public ChatRequest() {}

    public ChatRequest(String message) {
        this.message = message;
    }

    // Getters and Setters
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
```

## Step 4: Run and Test

### 1. Start Application

```bash
./mvnw spring-boot:run
```

### 2. Test Your Agent

Test your agent using curl or browser:

```bash
# Simple chat test
curl "http://localhost:8080/api/chat/simple?message=Hello, please introduce yourself"

# POST request test
curl -X POST http://localhost:8080/api/chat/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me an interesting story"}'
```

## Step 5: Enhance Your Agent

### 1. Add Streaming Response

Update the controller to support streaming responses:

```java
@GetMapping(value = "/stream", produces = "text/plain")
public Flux<String> streamChat(@RequestParam String message) {
    return chatClient.prompt()
            .user(message)
            .stream()
            .content();
}
```

### 2. Add Chat Memory

First, add memory dependency:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-spring-boot-starter</artifactId>
</dependency>
```

Then create a chat service with memory:

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

### 3. Add System Prompt

Create a professional agent role:

```java
@GetMapping("/assistant")
public String assistantChat(@RequestParam String message) {
    String systemPrompt = """
        You are a professional Java development assistant specializing in Spring AI Alibaba.
        Please answer questions in a friendly, professional tone and provide code examples when appropriate.
        If a question is outside your expertise, please be honest and suggest seeking other help.
        """;

    return chatClient.prompt()
            .system(systemPrompt)
            .user(message)
            .call()
            .content();
}
```

## Step 6: Error Handling and Best Practices

### 1. Add Exception Handling

```java
@ControllerAdvice
public class ChatExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Agent service temporarily unavailable, please try again later: " + e.getMessage());
    }
}
```

### 2. Add Request Validation

```java
@PostMapping("/conversation")
public String conversation(@Valid @RequestBody ChatRequest request) {
    if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
        throw new IllegalArgumentException("Message content cannot be empty");
    }
    
    return chatClient.prompt()
            .user(request.getMessage())
            .call()
            .content();
}
```

## Next Steps

Congratulations! You've successfully created your first Spring AI Alibaba agent. Now you can:

1. **Explore Tool Calling**: Enable your agent to call external APIs and services
2. **Integrate RAG**: Add knowledge base retrieval capabilities to your agent
3. **Build Multi-Agent Systems**: Use the Graph framework to create complex workflows
4. **Add Multimodal Support**: Handle images, audio, and other input types

## Complete Example Code

You can find the complete code in our official examples repository:

- **GitHub Repository**: [https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)
- **Playground Experience**: [Local Deployment Guide](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground)

## FAQ

### Q: How do I get a DashScope API Key?
A: Visit [Alibaba Cloud DashScope Console](https://dashscope.console.aliyun.com/), register and create an API Key.

### Q: Which models are supported?
A: Supports Tongyi Qianwen series models including qwen-turbo, qwen-plus, qwen-max, etc.

### Q: How do I handle API rate limits?
A: You can configure retry mechanisms and error handling to gracefully handle API limits.

Start your agent development journey!
