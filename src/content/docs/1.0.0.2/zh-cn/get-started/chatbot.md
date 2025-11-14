---
title: 聊天机器人
keywords: [Spring AI Alibaba,ChatBot,智能体,agent,聊天机器人]
description: "本文介绍如何使用 Spring AI Alibaba 开发一个基于通义模型服务的智能聊天应用。"
---

本文介绍如何使用 Spring AI Alibaba 开发一个基于通义模型服务的智能体聊天应用

## 快速体验示例

> 注意：因为 Spring AI Alibaba 基于 Spring Boot 3.x 开发，因此本地 JDK 版本要求为 17 及以上。

1. 下载项目

    运行以下命令下载源码，进入 helloworld 示例目录：

    ```shell
    git clone --depth=1 https://github.com/springaialibaba/spring-ai-alibaba-examples.git
    cd spring-ai-alibaba-examples/spring-ai-alibaba-helloworld
    ```

2. 运行项目

    首先，需要获取一个合法的 `API-KEY` 并设置 `AI_DASHSCOPE_API_KEY` 环境变量，可跳转 <a target="_blank" href="https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key">阿里云百炼平台</a> 了解如何获取 `API-KEY`。

    ```shell
    export AI_DASHSCOPE_API_KEY=${REPLACE-WITH-VALID-API-KEY}
    ```

3. 启动示例应用并访问

	```shell
	./mvnw spring-boot:run
	```

    访问 `http://localhost:18080/helloworld/simple/chat?query=给我讲一个笑话吧` ，向通义模型提问并得到回答。

## 示例开发指南

### 模型对话能力

以上示例本质上就是一个普通的 Spring Boot 应用，我们来通过源码解析看一下具体的开发流程。

1. 添加依赖

    首先，需要在项目中添加 `spring-ai-alibaba-starter` 依赖，它将通过 Spring Boot 自动装配机制初始化与阿里云通义大模型通信的 `ChatClient`、`ChatModel` 相关实例。

    ```xml
    <dependencyManagement>
      <dependencies>
        <dependency>
          <groupId>com.alibaba.cloud.ai</groupId>
          <artifactId>spring-ai-alibaba-bom</artifactId>
          <version>1.0.0.2</version>
          <type>pom</type>
          <scope>import</scope>
        </dependency>
      </dependencies>
    </dependencyManagement>

    <dependencies>
      <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
      </dependency>
    </dependencies>
    ```

2. 注入 ChatClient

    接下来，在普通 Controller Bean 中注入 `ChatClient` 实例，这样你的 Bean 就具备与 AI 大模型智能对话的能力了。

    ```java
    @RestController
    @RequestMapping("/helloworld")
    public class HelloworldController {
      private static final String DEFAULT_PROMPT = "你是一个博学的智能聊天助手，请根据用户提问回答！";

      private final ChatClient dashScopeChatClient;

      public HelloworldController(ChatClient.Builder chatClientBuilder) {
        this.dashScopeChatClient = chatClientBuilder
            .defaultSystem(DEFAULT_PROMPT)
            // 实现 Logger 的 Advisor
            .defaultAdvisors(
                new SimpleLoggerAdvisor()
            )
            // 设置 ChatClient 中 ChatModel 的 Options 参数
            .defaultOptions(
                DashScopeChatOptions.builder()
                    .withTopP(0.7)
                    .build()
            )
            .build();
      }

      /**
      * ChatClient 简单调用
      */
      @GetMapping("/simple/chat")
      public String simpleChat(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query) {

        return dashScopeChatClient.prompt(query).call().content();
      }
    }
    ```

以上示例中，ChatClient 使用默认参数调用大模型，Spring AI Alibaba 还支持通过 `DashScopeChatOptions` 调整与模型对话时的参数，`DashScopeChatOptions` 支持两种不同维度的配置方式：

1. 全局默认值，即 `ChatClient` 实例初始化参数

    `application.yaml` 文件中指定 `spring.ai.dashscope.chat.options.*` 或调用构造函数 `ChatClient.Builder.defaultOptions(options)`、`DashScopeChatModel(api, options)` 完成配置初始化。

2. 每次 Prompt 调用前动态指定

    ```java
    String result = dashScopeChatClient
      .prompt(query)
      .options(DashScopeChatOptions.builder().withTopP(0.8).build())
      .call()
      .content();
    ```

    关于 `DashScopeChatOptions` 配置项的详细说明，请查看参考手册。

    此外，模型还支持流式调用，这样的数据返回前端会产生“打字机”效果：

    ```java
      /**
      * ChatClient 流式调用
      */
      @GetMapping("/stream/chat")
      public Flux<String> streamChat(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query, HttpServletResponse response) {

        response.setCharacterEncoding("UTF-8");
        return dashScopeChatClient.prompt(query).stream().content();
      }
    ```

### 增加聊天记忆能力

以上的代码是不具有记忆的，在每一次调用AI模型，并不会携带上次调用信息。

一种解决办法是在调用大模型的过程中，由开发者编写的代码来维护多轮的对话记忆，这样会大大增加项目的代码量。

Spring AI Alibaba 提供了 `jdbc`、`redis`、`elasticsearch` 插件可以让聊天机器人拥有“记忆”。下面以 MySQL 为例，演示如何快速编写一个带有记忆的聊天机器人。

1. 添加依赖

    ```xml
    <dependency>
      <groupId>com.alibaba.cloud.ai</groupId>
      <artifactId>spring-ai-alibaba-starter-memory-jdbc</artifactId>
      <version>1.0.0.2</version>
    </dependency>
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <version>8.0.32</version>
    </dependency>
    ```

2. 配置数据库连接

    ```yaml
    spring:
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://localhost:3306/chatMemory?useUnicode=true&characterEncoding=UTF-8
        username: root
        password: root
    ```

3. 实例化 `ChatMemoryRepository` 对象和 `ChatMemory` 对象

    ```java
    // 构造 ChatMemoryRepository 和 ChatMemory
    ChatMemoryRepository chatMemoryRepository = MysqlChatMemoryRepository.mysqlBuilder()
        .jdbcTemplate(jdbcTemplate)
        .build();
    ChatMemory chatMemory = MessageWindowChatMemory.builder()
        .chatMemoryRepository(chatMemoryRepository)
        .build();
    ```

4. 构造 ChatClient 时通过 `.defaultAdvisors()` 注册 `MessageChatMemoryAdvisor`

    ```java
    public HelloworldController(JdbcTemplate jdbcTemplate, ChatClient.Builder chatClientBuilder) {
        // 构造 ChatMemoryRepository 和 ChatMemory
        ChatMemoryRepository chatMemoryRepository = MysqlChatMemoryRepository.mysqlBuilder()
            .jdbcTemplate(jdbcTemplate)
            .build();
        ChatMemory chatMemory = MessageWindowChatMemory.builder()
            .chatMemoryRepository(chatMemoryRepository)
            .build();
        this.dashScopeChatClient = chatClientBuilder
            .defaultSystem(DEFAULT_PROMPT)
            .defaultAdvisors(new SimpleLoggerAdvisor())
            // 注册Advisor
            .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
            .defaultOptions(
                    DashScopeChatOptions.builder()
                            .withTopP(0.7)
                            .build()
            )
            .build();
    }
    ```

5. 每次调用大模型时通过`.advisors()`传递当前会话ID

    ```java
    @GetMapping("/simple/chat")
    public String simpleChat(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query,
                            @RequestParam(value = "chat-id", defaultValue = "1") String chatId) {

        return dashScopeChatClient.prompt(query)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, chatId))
                .call().content();
    }
    ```

这样，大模型就会获取会话ID的历史消息记录。

## 学习更多示例

学习更多 Spring AI Alibaba 框架用法，请参考 Spring AI Alibaba 社区的官方示例源码仓库：

[https://github.com/springaialibaba/spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples)
