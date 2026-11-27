---
sidebar_position: 5
---

# OpenAi 兼容模型

在本章节中，我们将学习如何使用 Spring AI Alibaba 接入类 OpenAI API 系列模型，**只要您使用的模型兼容 OpenAi 通信协议，都可以使用本文描述的方法进行介入。**


## OpenAi API 系列模型接入

OpenAi API 兼容模型指的是提供了 OpenAI API 兼容的一系列大模型，例如 DashScope 服务平台模型、DeepSeek 等均提供 OpenAi 兼容的 API 和接入方式。

## 在项目中引入依赖

需要在项目中接入具有 OpenAI API 规范的大模型时，只需要引入 `spring-ai-openai-spring-boot-starter` 即可。下面以 DeepSeek 为例演示如何进入具有类 OpenAI API 系列模型的接入。

### 引入 `spring-ai-starter-model-openai`

    ```xml
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
    ```


### 配置 `application.yml`

    ```yaml
    spring:
      application:
      name: spring-ai-alibaba-openai-compatible-chat-model-example

      ai:
        openai:
          api-key: ${OPENAI_API_KEY}
          base-url: ${OPENAI_BASE_URL}
          chat:
            options:
              model: ${MODEL_NAME}
    ```

请注意，根据使用的模型服务平台不同，您需要为 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `model` 指定为对应平台的值。


## 使用 DashScope 平台

如果您使用的，则需要根据 [阿里云 DashScope 平台](https://bailian.console.aliyun.com/?apiKey=1&tab=api#/api/?type=model&url=2712576) 相关参数进行配置，示例如下：

    ```shell
    export OPENAI_API_KEY=your-api-key-get-from-dashscope
    export OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode
    export MODEL_NAME=qwen-max
    ```

## 使用 DeepSeek 平台


如果您使用的，则需要根据 [DeepSeek 平台](https://api-docs.deepseek.com/zh-cn/) 相关参数进行配置，示例如下：


    ```shell
    export OPENAI_API_KEY=your-api-key-get-from-deepseek
    export OPENAI_BASE_URL=https://api.deepseek.com
    export MODEL_NAME=deepseek-chat
    ```

## 声明 ChatModel

不论您使用的是 DeepSeek、DashScope 或其他任何平台提供的 OpenAi 兼容 API 接入模式，接下来都可以直接使用 ChatModel 实例，ChatModel 实例后台将自动基于 OpenAI 协议工作。

    ```java
    private final ChatModel deepSeekChatModel;

    public DeepSeekChatModelController (ChatModel chatModel) {
        this.deepSeekChatModel = chatModel;
    }
    ```

4. 编写 Controller 控制器

直接使用 ChatModel 或者配合 Spring AI Alibaba 中的 Agent 及 Graph Workflow 使用都可以。

    ```java
    @GetMapping("/simple/chat")
    public String simpleChat () {

        return deepSeekChatModel.call(new Prompt(prompt)).getResult().getOutput().getContent();
    }
    ```
