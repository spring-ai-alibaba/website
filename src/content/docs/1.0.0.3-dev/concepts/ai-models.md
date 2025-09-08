---
title: "AI 模型 (AI Models)"
description: "为 Java 开发者介绍聊天模型、嵌入模型等 AI 模型的基本概念，以及如何在 SAA 中通过 Spring AI 使用它们。"
---

## 什么是 AI 模型？

对于习惯了确定性编程的 Java 开发者来说，可以将一个 AI 模型理解为一个**专用的、非确定性的远程服务（Service）**。

与传统的微服务类似，你可以通过 API 调用它。但它的特殊之处在于：

1.  **输入是“自然语言”**：你发送的不再是结构化的 JSON，而是被称为**提示词 (Prompt)** 的自然语言指令。
2.  **输出是非确定性的**：对于同一个输入，模型的每次输出都可能有些许不同，因为它是在“生成”内容，而非“查询”数据。
3.  **功能高度专业化**：不同类型的模型，如同不同职责的微服务，提供完全不同的能力。

## 模型的种类

在 SAA 和 Spring AI 的生态中，你主要会接触到以下几类模型：

### 1. 聊天模型 (Chat Models)

这是最核心、最常见的一类模型，负责理解和生成语言。智能体（Agent）的“大脑”和推理能力正是由它提供。

-   **核心职责**：进行多轮对话、回答问题、遵循指令、编写代码、进行逻辑推理。
-   **调用方式**：通过 `ChatClient` 接口进行交互。
-   **阿里云 DashScope 示例**：`qwen-turbo`, `qwen-plus`, `qwen-max`。

### 2. 嵌入模型 (Embedding Models)

这类模型充当“文本编码器”，它不直接回答问题，而是将任何文本（单词、句子、段落）转换成一个由数字组成的向量（Vector）。

-   **核心职责**：将文本语义化、向量化，用于计算文本之间的相似度。这是实现 RAG（检索增强生成）和知识库语义搜索的基础。
-   **调用方式**：通过 `EmbeddingClient` 接口进行交互。
-   **阿里云 DashScope 示例**：`text-embedding-v2`。

### 3. 文生图模型 (Image Generation Models)

这类模型接收一段文字描述，并据此生成一张全新的图片。

-   **核心职责**：根据文本提示（Prompt）创作图像。
-   **调用方式**：通过 `ImageClient` 接口进行交互。
-   **阿里云 DashScope 示例**：`wanx-v1`。

## 在 SAA 中使用模型

下面是一个使用 `ChatClient` 调用 DashScope `qwen-plus` 模型的典型示例。

### 步骤 1: 添加依赖

在你的 `pom.xml` 中，加入 DashScope 的 Spring Boot Starter。

```xml
<dependency>
    <groupId>com.alibaba.cloud.spring.ai</groupId>
    <artifactId>spring-ai-dashscope-spring-boot-starter</artifactId>
</dependency>
```

### 步骤 2: 配置 API Key 和模型

在你的 `application.yml` 或 `application.properties` 文件中，配置 DashScope 的 API Key 和所需的模型信息。

```yaml
spring:
  ai:
    dashscope:
      api-key: "sk-your-dashscope-api-key"
      chat:
        options:
          model: qwen-plus
```

### 步骤 3: 注入并使用 ChatClient

现在，你可以像使用任何其他 Spring Bean 一样，在你的 `@Service` 或 `@RestController` 中通过构造函数注入 `ChatClient` 并调用它。

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    private final ChatClient chatClient;

    // 使用构造函数注入 ChatClient.Builder
    @Autowired
    public ChatController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/ai/chat")
    public String chat(@RequestParam(value = "message", defaultValue = "给我讲个笑话") String message) {
        return chatClient.prompt()
                .user(message)
                .call()
                .content();
    }
}
```
这个简单的 `ChatController` 就实现了一个完整的调用流程，清晰地展示了 SAA/Spring AI 如何简化与大模型的交互。

## 集成更多模型

得益于 Spring AI 的开放设计，SAA 不仅限于使用阿里云的模型。你可以通过添加不同的 Starter 依赖和配置，无缝切换或同时使用来自 OpenAI, Azure, HuggingFace, Ollama 等众多厂商的模型。

> 想了解如何集成其他模型，请参考 [Spring AI 官方文档的模型集成部分](https://docs.spring.io/spring-ai/reference/api/index.html)。

