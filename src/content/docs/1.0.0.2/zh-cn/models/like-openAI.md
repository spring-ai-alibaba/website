---
title: 类 OpenAI API
keywords: [Spring AI,OpenAI API,Spring AI Alibaba]
description: "Spring AI 接入类 OpenAI API 系列模型"
---

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入类 OpenAI API 系列模型。在开始学习之前，请确保您已经了解相关概念。

1. [Chat Client](../tutorials/basics/chat-client.md)；
2. [Chat Model](../tutorials/basics/chat-model.md)；
3. [Spring AI Alibaba 快速开始](../get-started.md)；
4. 本章节的代码您可以在 [Spring AI Alibaba Example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-example) 仓库找到。

> 本示例主要演示如何以 ChatModel 形式接入。关于如何使用 ChatClient，请参考 Github 代码仓库示例。

## 类 OpenAI API 系列模型接入

类 OpenAI API 模型指的是提供了 OpenAI API 兼容的一系列大模型，例如 DashScope 服务平台模型，DeepSeek 等。

## Spring AI Alibaba 接入

需要在项目中接入具有 OpenAI API 规范的大模型时，只需要引入 `spring-ai-openai-spring-boot-starter` 即可。下面以 DeepSeek 为例演示如何进入具有类 OpenAI API 系列模型的接入。

1. 引入 `spring-ai-openai-spring-boot-starter`

    ```xml
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
        <version>1.0.0-M6</version>
    </dependency>
    ```

2. 配置 `application.yml`

    ```yaml
    spring:
      application:
      name: spring-ai-alibaba-deepseek-chat-model-example

      ai:
        openai:
          api-key: ${AI_OPENAI_API_KEY}
          base-url: ${AI_OPENAI_BASE_URL}
          chat:
            options:
              model: deepseek-r1
    ```

3. 注入 ChatModel

    ```java
    private final ChatModel deepSeekChatModel;

    public DeepSeekChatModelController (ChatModel chatModel) {
        this.deepSeekChatModel = chatModel;
    }
    ```

4. 编写 Controller 控制器

    ```java
    @GetMapping("/simple/chat")
    public String simpleChat () {

        return deepSeekChatModel.call(new Prompt(prompt)).getResult().getOutput().getContent();
    }
    ```
