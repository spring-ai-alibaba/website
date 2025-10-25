---
title: 第一章：chat 初体验
keywords: [Spring AI, Spring AI Alibaba, 源码解读]
description: "本章介绍了 Spring AI Chat 功能的快速上手方法，包括项目依赖配置、`application.yml` 设置（并提及了使用阿里百炼进行 OpenAI 兼容替换的方案），并通过 `ChatController` 和 `ChatOptionController` 示例代码演示了基本的聊天调用（call）、流式响应（stream）以及如何配置聊天参数（如 temperature）。此外，章节还初步探讨了 `ChatClient` 和 `ChatModel` 的自动注入机制，提到了相关的配置类如 `ChatClientBuilderProperties` 和 `ChatClientBuilderConfigurer`。"
---

- 作者：影子, Spring AI Alibaba Committer
- 本文档基于 Spring AI 1.0.0 版本，Spring AI Alibaba 1.0.0.2 版本
- 本章包含：chat快速上手 + 源码解读（ChatClient + ChatModel 自动注入、ChatClient 调用链路）

## chat快速上手 

> 通过自然语言的句子和 AI 模型进行会话交流，以下实现了 chat 的典型案例：Call、Stream，ChatOptions设置。实战代码可见：https://github.com/GTyingzi/spring-ai-tutorial下的chat

### pom 文件

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
    </dependency>

</dependencies>
```

### application.yml

```yml
server:
  port: 8080

spring:
  application:
    name: advisor-base

  ai:
    openai:      
      api-key: ${DASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
```

OPENAI 由于封禁的原因，国内无法很好的获取其 api-key，国内厂商阿里的百炼可进行平替，只需要替换对应的 api-key、base-url 即可，同时可选对应的模型

资料地址：[大模型服务平台百炼：如何获取 API Key](https://help.aliyun.com/zh/model-studio/get-api-key)

### controller

#### ChatController

```java
package com.spring.ai.tutorial.chat.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/call")
    public String call(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query) {
        return chatClient.prompt(query).call().content();
    }

  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> stream(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query) {
        return chatClient.prompt(query).stream().content();
    }
}
```

##### 效果

call 调用

![](/img/user/ai/spring-ai-explained-sourcecode/IEW6bwFVUofWMBxF6nRcIDv6nCb.png)

stream 调用

![](/img/user/ai/spring-ai-explained-sourcecode/VGlCbtPntodJ08xBChbcsY3gnPd.png)

#### ChatOptionController

```java
package com.spring.ai.tutorial.chat.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author yingzi
 * @date 2025/5/24 16:52
 */
@RestController
@RequestMapping("/chat/option")
public class ChatOptionController {

    private final ChatClient chatClient;

    public ChatOptionController(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultOptions(
                        OpenAiChatOptions.builder()
                                .temperature(0.9)
                                .build()
                )
                .build();
    }

    @GetMapping("/call")
    public String call(@RequestParam(value = "query", defaultValue = "你好，请为我创造一首以“影子”为主题的诗")String query) {
        return chatClient.prompt(query).call().content();
    }

    @GetMapping("/call/temperature")
    public String callOption(@RequestParam(value = "query", defaultValue = "你好，请为我创造一首以“影子”为主题的诗")String query) {
        return chatClient.prompt(query)
                .options(
                        OpenAiChatOptions.builder()
                                .temperature(0.0)
                                .build()
                )
                .call().content();
    }
}
```

chatClient 全局配置 temperature=0.9

- /call：使用的是 temperature=0.9
- /call/temperature：当前请求覆盖配置，temperature=0.0

##### 效果

/call 接口的 temperature=0.9

![](/img/user/ai/spring-ai-explained-sourcecode/QHmfbObZOoSjsxxDzREcVEq0nVd.png)

/call/temperature 接口的 temperature=0.0

![](/img/user/ai/spring-ai-explained-sourcecode/IYlsbQN6LoNL8hxzWz3ceJCFnQf.png)



## ChatClient + ChatModel 自动注入篇

> [!TIP]
> 配置 pom 文件后，自动注入 ChatModel、ChatClient.Builder 的原理

### pom.xml 文件

入 ChatClient 依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
</dependency>
```

选择 chat 模型，这里使用 openai

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
</dependency>
```

### ChatClient 自动注入

![](/img/user/ai/spring-ai-explained-sourcecode/chatClient自动注入.png)



#### ChatClientBuilderProperties

类的作用：

- 控制是否提供 ChatClient.Builder 聊天客户端构建器的 Bean，默认为 true
- 配置观测日志的行为，如是否记录提示词内容

```java
package org.springframework.ai.model.chat.client.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.chat.client")
public class ChatClientBuilderProperties {
    public static final String CONFIGPREFIX = "spring.ai.chat.client";
    private boolean enabled = true;
    private final Observations observations = new Observations();

    public Observations getObservations() {
        return this.observations;
    }

    public boolean isEnabled() {
        return this.enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public static class Observations {
        private boolean logPrompt = false;

        public boolean isLogPrompt() {
            return this.logPrompt;
        }

        public void setLogPrompt(boolean logPrompt) {
            this.logPrompt = logPrompt;
        }
    }
}
```

#### ChatClientBuilderConfigurer

类的作用：

- 用于对 ChatClient.Builder 聊天客户端构建器进行扩展性配置
- 通过注册不同的 ChatClientCustomizer 实现，可动态调整聊天客户端

```java
package org.springframework.ai.model.chat.client.autoconfigure;

import java.util.List;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClientCustomizer;

public class ChatClientBuilderConfigurer {
    private List<ChatClientCustomizer> customizers;

    void setChatClientCustomizers(List<ChatClientCustomizer> customizers) {
        this.customizers = customizers;
    }

    public ChatClient.Builder configure(ChatClient.Builder builder) {
        this.applyCustomizers(builder);
        return builder;
    }

    private void applyCustomizers(ChatClient.Builder builder) {
        if (this.customizers != null) {
            for(ChatClientCustomizer customizer : this.customizers) {
                customizer.customize(builder);
            }
        }

    }
}
```

##### ChatClientCustomizer

可通过实现 ChatClientCustomizer 函数式接口，自定义调整 ChatClient.Builder 的相关配置

```java
package org.springframework.ai.chat.client;

@FunctionalInterface
public interface ChatClientCustomizer {
    void customize(ChatClient.Builder chatClientBuilder);
}
```

#### ChatClientAutoConfiguration

类上重点注解说明

1. 在 ObservationAutoConfiguration 类之后加载，确保观测基础设施已就绪
2. 当 ChatClient 类在类路径上时才启用该自动配置
3. 启用 ChatClientBuilderProperties 配置属性的支持，将配置文件中的 `spring.ai.chat.client.*` 映射到该类实例
4. 只有当配置项 `spring.ai.chat.client.enabled=true` 时，才启用该自动配置，默认为 true

对外提供 Bean

1. ChatClientBuilderConfigurer：从容器中获取所有 ChatClientCustomizer 实例，配置 ChatClient.Builder 信息
2. ChatClient.Builder：使用 ChatModel 初始化 ChatClient.Builder，再

   - @Scope("prototype")：每次注入都会生成新实例

内部配置配 TracerPresentObservationConfiguration、TracerNotPresentObservationConfiguration

- 配置项：`spring.ai.chat.client.observations.log-prompt=true`
- 当项目中存在 Tracer 时，启用带追踪能力的日志记录处理器

  - 注册带有追踪能力的日志处理器，用于记录提示词内容，输出安全警告日志
- 当项目中不存在 Tracer 时，启用普通日志处理器

  - 未使用追踪框架的情况下，仅记录提示词内容，输出安全警告日志

```java
package org.springframework.ai.model.chat.client.autoconfigure;

import io.micrometer.observation.ObservationRegistry;
import io.micrometer.tracing.Tracer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClientCustomizer;
import org.springframework.ai.chat.client.observation.ChatClientObservationContext;
import org.springframework.ai.chat.client.observation.ChatClientObservationConvention;
import org.springframework.ai.chat.client.observation.ChatClientPromptContentObservationHandler;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.observation.TracingAwareLoggingObservationHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

@AutoConfiguration(
    afterName = {"org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration"}
)
@ConditionalOnClass({ChatClient.class})
@EnableConfigurationProperties({ChatClientBuilderProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.chat.client",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class ChatClientAutoConfiguration {
    private static final Logger logger = LoggerFactory.getLogger(ChatClientAutoConfiguration.class);

    private static void logPromptContentWarning() {
        logger.warn("You have enabled logging out the ChatClient prompt content with the risk of exposing sensitive or private information. Please, be careful!");
    }

    @Bean
    @ConditionalOnMissingBean
    ChatClientBuilderConfigurer chatClientBuilderConfigurer(ObjectProvider<ChatClientCustomizer> customizerProvider) {
        ChatClientBuilderConfigurer configurer = new ChatClientBuilderConfigurer();
        configurer.setChatClientCustomizers(customizerProvider.orderedStream().toList());
        return configurer;
    }

    @Bean
    @Scope("prototype")
    @ConditionalOnMissingBean
    ChatClient.Builder chatClientBuilder(ChatClientBuilderConfigurer chatClientBuilderConfigurer, ChatModel chatModel, ObjectProvider<ObservationRegistry> observationRegistry, ObjectProvider<ChatClientObservationConvention> observationConvention) {
        ChatClient.Builder builder = ChatClient.builder(chatModel, (ObservationRegistry)observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP), (ChatClientObservationConvention)observationConvention.getIfUnique(() -> null));
        return chatClientBuilderConfigurer.configure(builder);
    }

    @Configuration(
        proxyBeanMethods = false
    )
    @ConditionalOnClass({Tracer.class})
    @ConditionalOnBean({Tracer.class})
    static class TracerPresentObservationConfiguration {
        @Bean
        @ConditionalOnMissingBean(
            value = {ChatClientPromptContentObservationHandler.class},
            name = {"chatClientPromptContentObservationHandler"}
        )
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.client.observations",
            name = {"log-prompt"},
            havingValue = "true"
        )
        TracingAwareLoggingObservationHandler<ChatClientObservationContext> chatClientPromptContentObservationHandler(Tracer tracer) {
            ChatClientAutoConfiguration.logPromptContentWarning();
            return new TracingAwareLoggingObservationHandler(new ChatClientPromptContentObservationHandler(), tracer);
        }
    }

    @Configuration(
        proxyBeanMethods = false
    )
    @ConditionalOnMissingClass({"io.micrometer.tracing.Tracer"})
    static class TracerNotPresentObservationConfiguration {
        @Bean
        @ConditionalOnMissingBean
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.client.observations",
            name = {"log-prompt"},
            havingValue = "true"
        )
        ChatClientPromptContentObservationHandler chatClientPromptContentObservationHandler() {
            ChatClientAutoConfiguration.logPromptContentWarning();
            return new ChatClientPromptContentObservationHandler();
        }
    }
}
```

### ChatModel 自动注入

#### OpenAiParentProperties

从 OpenAI 的开发者平台获取，基础配置信息

- apiKey（必填）：密钥
- baseUrl（选填）：调用 url，若没填会自动填充，详情可见 OpenAiConnectionProperties 类的DEFAULTBASEURL字段
- projectId（选填）：项目 Id
- organizationId（选填）：组织 Id

```java
package org.springframework.ai.model.openai.autoconfigure;

class OpenAiParentProperties {
    private String apiKey;
    private String baseUrl;
    private String projectId;
    private String organizationId;

    public String getApiKey() {
        return this.apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }
}
```

#### OpenAiConnectionProperties

Connection 配置类，默认 baseUrl 为DEFAULTBASEURL，若配置文件有 baseUrl 配置则会覆盖

```java
package org.springframework.ai.model.openai.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.openai")
public class OpenAiConnectionProperties extends OpenAiParentProperties {
    public static final String CONFIGPREFIX = "spring.ai.openai";
    public static final String DEFAULTBASEURL = "https://api.openai.com";

    public OpenAiConnectionProperties() {
        super.setBaseUrl("https://api.openai.com");
    }
}
```

### OpenAiChatProperties

Chat 配置类。

- 配置 Chat Model，默认为“gpt-4o-mini”
- 配置 Chat 接口路径，默认为“/v1/chat/completions”
- 配置 temperature，默认为 0.7（值范围一般在 0～1，部分模型会大于 1）

  - 值越低输出越确定（0，代表每次相同输入产生相同输出）
  - 值越高随机性越强（产生更开放或不常见的回答，适用于创意写作等场景）

```java
package org.springframework.ai.model.openai.autoconfigure;

import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

@ConfigurationProperties("spring.ai.openai.chat")
public class OpenAiChatProperties extends OpenAiParentProperties {
    public static final String CONFIGPREFIX = "spring.ai.openai.chat";
    public static final String DEFAULTCHATMODEL = "gpt-4o-mini";
    public static final String DEFAULTCOMPLETIONSPATH = "/v1/chat/completions";
    private static final Double DEFAULTTEMPERATURE = 0.7;
    private String completionsPath = "/v1/chat/completions";
    @NestedConfigurationProperty
    private OpenAiChatOptions options;

    public OpenAiChatProperties() {
        this.options = OpenAiChatOptions.builder().model("gpt-4o-mini").temperature(DEFAULTTEMPERATURE).build();
    }

    public OpenAiChatOptions getOptions() {
        return this.options;
    }

    public void setOptions(OpenAiChatOptions options) {
        this.options = options;
    }

    public String getCompletionsPath() {
        return this.completionsPath;
    }

    public void setCompletionsPath(String completionsPath) {
        this.completionsPath = completionsPath;
    }
}
```

#### OpenAiChatAutoConfiguration

类上重点注解说明

1. 确保网络客户端（RestClient、WebClient）、重试机制、工具调用就绪后再注入
2. 当类路径有 OpenAiApi 类时才启用该自动配置
3. 启用 OpenAiConnectionProperties、OpenAiChatProperties 配置属性的支持
4. 只有当配置项 `spring.ai.model.chat.openai=true` 时，才会启用该自动配置，默认为 true

对外提供了 OpenAiChatModel 的 Bean

- 使用 openAiApi 方法构建底层 API 实例，通过 OpenAiChatModel.builder()构建 Chat 模型，另外配置了默认选项、工具调用、重试策略、观测注册表
- openAiApi 侧封装了 OpenAI API 的构建逻辑，包括基础 URL、API Key、请求头、请求路径、HTTP 客户端等配置

  - 注：非公开 Bean

```java
package org.springframework.ai.model.openai.autoconfigure;

import io.micrometer.observation.ObservationRegistry;
import java.util.Objects;
import org.springframework.ai.chat.observation.ChatModelObservationConvention;
import org.springframework.ai.model.SimpleApiKey;
import org.springframework.ai.model.tool.DefaultToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.autoconfigure.ToolCallingAutoConfiguration;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryAutoConfiguration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.web.client.RestClientAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.function.client.WebClientAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

@AutoConfiguration(
    after = {RestClientAutoConfiguration.class, WebClientAutoConfiguration.class, SpringAiRetryAutoConfiguration.class, ToolCallingAutoConfiguration.class}
)
@ConditionalOnClass({OpenAiApi.class})
@EnableConfigurationProperties({OpenAiConnectionProperties.class, OpenAiChatProperties.class})
@ConditionalOnProperty(
    name = {"spring.ai.model.chat"},
    havingValue = "openai",
    matchIfMissing = true
)
@ImportAutoConfiguration(
    classes = {SpringAiRetryAutoConfiguration.class, RestClientAutoConfiguration.class, WebClientAutoConfiguration.class, ToolCallingAutoConfiguration.class}
)
public class OpenAiChatAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public OpenAiChatModel openAiChatModel(OpenAiConnectionProperties commonProperties, OpenAiChatProperties chatProperties, ObjectProvider<RestClient.Builder> restClientBuilderProvider, ObjectProvider<WebClient.Builder> webClientBuilderProvider, ToolCallingManager toolCallingManager, RetryTemplate retryTemplate, ResponseErrorHandler responseErrorHandler, ObjectProvider<ObservationRegistry> observationRegistry, ObjectProvider<ChatModelObservationConvention> observationConvention, ObjectProvider<ToolExecutionEligibilityPredicate> openAiToolExecutionEligibilityPredicate) {
        OpenAiApi openAiApi = this.openAiApi(chatProperties, commonProperties, (RestClient.Builder)restClientBuilderProvider.getIfAvailable(RestClient::builder), (WebClient.Builder)webClientBuilderProvider.getIfAvailable(WebClient::builder), responseErrorHandler, "chat");
        OpenAiChatModel chatModel = OpenAiChatModel.builder().openAiApi(openAiApi).defaultOptions(chatProperties.getOptions()).toolCallingManager(toolCallingManager).toolExecutionEligibilityPredicate((ToolExecutionEligibilityPredicate)openAiToolExecutionEligibilityPredicate.getIfUnique(DefaultToolExecutionEligibilityPredicate::new)).retryTemplate(retryTemplate).observationRegistry((ObservationRegistry)observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP)).build();
        Objects.requireNonNull(chatModel);
        observationConvention.ifAvailable(chatModel::setObservationConvention);
        return chatModel;
    }

    private OpenAiApi openAiApi(OpenAiChatProperties chatProperties, OpenAiConnectionProperties commonProperties, RestClient.Builder restClientBuilder, WebClient.Builder webClientBuilder, ResponseErrorHandler responseErrorHandler, String modelType) {
        OpenAIAutoConfigurationUtil.ResolvedConnectionProperties resolved = OpenAIAutoConfigurationUtil.resolveConnectionProperties(commonProperties, chatProperties, modelType);
        return OpenAiApi.builder().baseUrl(resolved.baseUrl()).apiKey(new SimpleApiKey(resolved.apiKey())).headers(resolved.headers()).completionsPath(chatProperties.getCompletionsPath()).embeddingsPath("/v1/embeddings").restClientBuilder(restClientBuilder).webClientBuilder(webClientBuilder).responseErrorHandler(responseErrorHandler).build();
    }
}
```

#### 工具类：OpenAIAutoConfigurationUtil

1. 校验 apiKey、baseUrl 最后拼接到 OpenAiApi 时不为空
2. 根据 projectId、organizationId 设置请求头

```java
package org.springframework.ai.model.openai.autoconfigure;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jetbrains.annotations.NotNull;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;

public final class OpenAIAutoConfigurationUtil {
    private OpenAIAutoConfigurationUtil() {
    }

    @NotNull
    public static ResolvedConnectionProperties resolveConnectionProperties(OpenAiParentProperties commonProperties, OpenAiParentProperties modelProperties, String modelType) {
        String baseUrl = StringUtils.hasText(modelProperties.getBaseUrl()) ? modelProperties.getBaseUrl() : commonProperties.getBaseUrl();
        String apiKey = StringUtils.hasText(modelProperties.getApiKey()) ? modelProperties.getApiKey() : commonProperties.getApiKey();
        String projectId = StringUtils.hasText(modelProperties.getProjectId()) ? modelProperties.getProjectId() : commonProperties.getProjectId();
        String organizationId = StringUtils.hasText(modelProperties.getOrganizationId()) ? modelProperties.getOrganizationId() : commonProperties.getOrganizationId();
        Map<String, List<String>> connectionHeaders = new HashMap();
        if (StringUtils.hasText(projectId)) {
            connectionHeaders.put("OpenAI-Project", List.of(projectId));
        }

        if (StringUtils.hasText(organizationId)) {
            connectionHeaders.put("OpenAI-Organization", List.of(organizationId));
        }

        Assert.hasText(baseUrl, "OpenAI base URL must be set.  Use the connection property: spring.ai.openai.base-url or spring.ai.openai." + modelType + ".base-url property.");
        Assert.hasText(apiKey, "OpenAI API key must be set. Use the connection property: spring.ai.openai.api-key or spring.ai.openai." + modelType + ".api-key property.");
        return new ResolvedConnectionProperties(baseUrl, apiKey, CollectionUtils.toMultiValueMap(connectionHeaders));
    }

    public static record ResolvedConnectionProperties(String baseUrl, String apiKey, MultiValueMap<String, String> headers) {
    }
}
```





## ChatClient 解读

> ChatClient 端设置 advisors、ChatOptions、用户提示信息、系统提示信息、工具等信息，构建 DefaultChatClient.DefaultChatClientRequestSpec，再利用 DefaultChatClientUtils 将其转换为 ChatClientRequest

AdvisorChain 链调用一系列的增强器Advisor，每个增强器输入是 ChatClientRequest，输出 ChatClientResponse（其中必定会用到的是 ChatModelCallAdvisor 或 ChatModelStreamAdvisor）

### ChatClient

类的说明：面向对话式 AI 模型的客户端接口，提供了系列的 API 与 AI 会话模型交互，该接口封装了请求构建、调用、响应处理等流畅，支持同步、流式调用

方法说明

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>create（静态方法）<br/></td><td>由ChatModel、观测信息等创建 ChatClient 实例<br/></td></tr>
<tr>
<td>builder（静态方法）<br/></td><td>由ChatModel、观测信息等创建 ChatClient.Builder实例<br/></td></tr>
<tr>
<td>mutate<br/></td><td>复制当前客户端配置，生成新的ChatClient.Builder实例<br/></td></tr>
<tr>
<td>prompt<br/></td><td>构建ChatClientRequestSpec实例<br/></td></tr>
</table>


内部接口类说明

<table>
<tr>
<td>接口类<br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td rowspan="11">Builder<br/>（全局的ChatClient配置）<br/></td><td>defaultAdvisors<br/></td><td>设置advisors<br/></td></tr>
<tr>
<td>defaultOptions<br/></td><td>设置ChatOptions<br/></td></tr>
<tr>
<td>defaultUser<br/></td><td>设置用户提示信息<br/></td></tr>
<tr>
<td>defaultSystem<br/></td><td>设置系统提示信息<br/></td></tr>
<tr>
<td>defaultTemplateRenderer<br/></td><td>设置模版渲染器，用于处理字符串的占位符<br/></td></tr>
<tr>
<td>defaultToolNames<br/></td><td>根据工具名称获取工具配置<br/></td></tr>
<tr>
<td>defaultTools<br/></td><td>根据实例获取工具配置<br/></td></tr>
<tr>
<td>defaultToolCallbacks<br/></td><td>根据ToolCallback获取工具配置<br/></td></tr>
<tr>
<td>defaultToolContext<br/></td><td>工具的上下文<br/></td></tr>
<tr>
<td>clone<br/></td><td>复制当前客户端配置，生成新的ChatClient.Builder实例<br/></td></tr>
<tr>
<td>build<br/></td><td>构建最终的ChatClient实例<br/></td></tr>
<tr>
<td rowspan="13">ChatClientRequestSpec<br/>（当前的ChatClient配置）<br/></td><td>advisors<br/></td><td>设置advisors<br/></td></tr>
<tr>
<td>options<br/></td><td>设置ChatOptions<br/></td></tr>
<tr>
<td>user<br/></td><td>设置用户提示信息<br/></td></tr>
<tr>
<td>system<br/></td><td>设置系统提示信息<br/></td></tr>
<tr>
<td>templateRenderer<br/></td><td>设置模版渲染器，用于处理字符串的占位符<br/></td></tr>
<tr>
<td>toolNames<br/></td><td>根据工具名称获取工具配置<br/></td></tr>
<tr>
<td>tools<br/></td><td>根据实例获取工具配置<br/></td></tr>
<tr>
<td>toolCallbacks<br/></td><td>根据ToolCallback获取工具配置<br/></td></tr>
<tr>
<td>toolContext<br/></td><td>工具的上下文<br/></td></tr>
<tr>
<td>mutate<br/></td><td>复制当前客户端配置，生成新的ChatClient.Builder实例<br/></td></tr>
<tr>
<td>messages<br/></td><td>添加Message<br/></td></tr>
<tr>
<td>call<br/></td><td>同步调用<br/></td></tr>
<tr>
<td>stream<br/></td><td>流式调用<br/></td></tr>
<tr>
<td rowspan="4">PromptUserSpec<br/>（用户提示信息的构建规范）<br/></td><td>text<br/></td><td>设置用户文本内容<br/></td></tr>
<tr>
<td>param<br/></td><td>设置参数<br/></td></tr>
<tr>
<td>params<br/></td><td>设置参数<br/></td></tr>
<tr>
<td>media<br/></td><td>设置多媒体内容（如图片）<br/></td></tr>
<tr>
<td rowspan="3">PromptSystemSpec<br/>（系统提示信息的构建规范）<br/></td><td>text<br/></td><td>设置系统指令<br/></td></tr>
<tr>
<td>param<br/></td><td>设置参数<br/></td></tr>
<tr>
<td>params<br/></td><td>设置参数<br/></td></tr>
<tr>
<td rowspan="2">AdvisorSpec<br/>（设置增强器）<br/></td><td>param<br/></td><td>设置增强器中会用到的一些参数配置<br/></td></tr>
<tr>
<td>advisors<br/></td><td>添加增强器<br/></td></tr>
<tr>
<td rowspan="5">CallResponseSpec<br/></td><td>entity<br/></td><td>将响应体转换为指定类型<br/></td></tr>
<tr>
<td>chatClientResponse<br/></td><td>原始响应对象+请求时的上下文内容<br/></td></tr>
<tr>
<td>chatResponse<br/></td><td>原始的响应对象<br/></td></tr>
<tr>
<td>content<br/></td><td>响应的文本内容<br/></td></tr>
<tr>
<td>responseEntity<br/></td><td>获取封装了响应头和body的对象<br/></td></tr>
<tr>
<td><br/></td><td>chatClientResponse<br/></td><td>流式的原始响应对象+请求时的上下文内容<br/></td></tr>
<tr>
<td>StreamResponseSpec<br/></td><td>chatResponse<br/></td><td>流式的原始的响应对象<br/></td></tr>
<tr>
<td><br/></td><td>content<br/></td><td>流式的响应的文本内容<br/></td></tr>
</table>


```java
public interface ChatClient {
    static ChatClient create(ChatModel chatModel) {
        return create(chatModel, ObservationRegistry.NOOP);
    }

    static ChatClient create(ChatModel chatModel, ObservationRegistry observationRegistry) {
        return create(chatModel, observationRegistry, (ChatClientObservationConvention)null);
    }

    static ChatClient create(ChatModel chatModel, ObservationRegistry observationRegistry, @Nullable ChatClientObservationConvention observationConvention) {
        Assert.notNull(chatModel, "chatModel cannot be null");
        Assert.notNull(observationRegistry, "observationRegistry cannot be null");
        return builder(chatModel, observationRegistry, observationConvention).build();
    }

    static Builder builder(ChatModel chatModel) {
        return builder(chatModel, ObservationRegistry.NOOP, (ChatClientObservationConvention)null);
    }

    static Builder builder(ChatModel chatModel, ObservationRegistry observationRegistry, @Nullable ChatClientObservationConvention customObservationConvention) {
        Assert.notNull(chatModel, "chatModel cannot be null");
        Assert.notNull(observationRegistry, "observationRegistry cannot be null");
        return new DefaultChatClientBuilder(chatModel, observationRegistry, customObservationConvention);
    }

    ChatClientRequestSpec prompt();

    ChatClientRequestSpec prompt(String content);

    ChatClientRequestSpec prompt(Prompt prompt);

    Builder mutate();

    public interface AdvisorSpec {
        AdvisorSpec param(String k, Object v);

        AdvisorSpec params(Map<String, Object> p);

        AdvisorSpec advisors(Advisor... advisors);

        AdvisorSpec advisors(List<Advisor> advisors);
    }

    public interface Builder {
        Builder defaultAdvisors(Advisor... advisor);

        Builder defaultAdvisors(Consumer<AdvisorSpec> advisorSpecConsumer);

        Builder defaultAdvisors(List<Advisor> advisors);

        Builder defaultOptions(ChatOptions chatOptions);

        Builder defaultUser(String text);

        Builder defaultUser(Resource text, Charset charset);

        Builder defaultUser(Resource text);

        Builder defaultUser(Consumer<PromptUserSpec> userSpecConsumer);

        Builder defaultSystem(String text);

        Builder defaultSystem(Resource text, Charset charset);

        Builder defaultSystem(Resource text);

        Builder defaultSystem(Consumer<PromptSystemSpec> systemSpecConsumer);

        Builder defaultTemplateRenderer(TemplateRenderer templateRenderer);

        Builder defaultToolNames(String... toolNames);

        Builder defaultTools(Object... toolObjects);

        Builder defaultToolCallbacks(ToolCallback... toolCallbacks);

        Builder defaultToolCallbacks(List<ToolCallback> toolCallbacks);

        Builder defaultToolCallbacks(ToolCallbackProvider... toolCallbackProviders);

        Builder defaultToolContext(Map<String, Object> toolContext);

        Builder clone();

        ChatClient build();
    }

    public interface CallPromptResponseSpec {
        String content();

        List<String> contents();

        ChatResponse chatResponse();
    }

    public interface CallResponseSpec {
        @Nullable
        <T> T entity(ParameterizedTypeReference<T> type);

        @Nullable
        <T> T entity(StructuredOutputConverter<T> structuredOutputConverter);

        @Nullable
        <T> T entity(Class<T> type);

        ChatClientResponse chatClientResponse();

        @Nullable
        ChatResponse chatResponse();

        @Nullable
        String content();

        <T> ResponseEntity<ChatResponse, T> responseEntity(Class<T> type);

        <T> ResponseEntity<ChatResponse, T> responseEntity(ParameterizedTypeReference<T> type);

        <T> ResponseEntity<ChatResponse, T> responseEntity(StructuredOutputConverter<T> structuredOutputConverter);
    }

    public interface ChatClientRequestSpec {
        Builder mutate();

        ChatClientRequestSpec advisors(Consumer<AdvisorSpec> consumer);

        ChatClientRequestSpec advisors(Advisor... advisors);

        ChatClientRequestSpec advisors(List<Advisor> advisors);

        ChatClientRequestSpec messages(Message... messages);

        ChatClientRequestSpec messages(List<Message> messages);

        <T extends ChatOptions> ChatClientRequestSpec options(T options);

        ChatClientRequestSpec toolNames(String... toolNames);

        ChatClientRequestSpec tools(Object... toolObjects);

        ChatClientRequestSpec toolCallbacks(ToolCallback... toolCallbacks);

        ChatClientRequestSpec toolCallbacks(List<ToolCallback> toolCallbacks);

        ChatClientRequestSpec toolCallbacks(ToolCallbackProvider... toolCallbackProviders);

        ChatClientRequestSpec toolContext(Map<String, Object> toolContext);

        ChatClientRequestSpec system(String text);

        ChatClientRequestSpec system(Resource textResource, Charset charset);

        ChatClientRequestSpec system(Resource text);

        ChatClientRequestSpec system(Consumer<PromptSystemSpec> consumer);

        ChatClientRequestSpec user(String text);

        ChatClientRequestSpec user(Resource text, Charset charset);

        ChatClientRequestSpec user(Resource text);

        ChatClientRequestSpec user(Consumer<PromptUserSpec> consumer);

        ChatClientRequestSpec templateRenderer(TemplateRenderer templateRenderer);

        CallResponseSpec call();

        StreamResponseSpec stream();
    }

    public interface PromptSystemSpec {
        PromptSystemSpec text(String text);

        PromptSystemSpec text(Resource text, Charset charset);

        PromptSystemSpec text(Resource text);

        PromptSystemSpec params(Map<String, Object> p);

        PromptSystemSpec param(String k, Object v);
    }

    public interface PromptUserSpec {
        PromptUserSpec text(String text);

        PromptUserSpec text(Resource text, Charset charset);

        PromptUserSpec text(Resource text);

        PromptUserSpec params(Map<String, Object> p);

        PromptUserSpec param(String k, Object v);

        PromptUserSpec media(Media... media);

        PromptUserSpec media(MimeType mimeType, URL url);

        PromptUserSpec media(MimeType mimeType, Resource resource);
    }

    public interface StreamPromptResponseSpec {
        Flux<ChatResponse> chatResponse();

        Flux<String> content();
    }

    public interface StreamResponseSpec {
        Flux<ChatClientResponse> chatClientResponse();

        Flux<ChatResponse> chatResponse();

        Flux<String> content();
    }
}
```

#### DefaultChatClient

ChatClient 接口的默认实现类，用于构建和执行与 AI 聊天模型交互的请求

1. 内部类 DefaultChatClientRequestSpec 实现了 ChatClient.ChatClientRequestSpec：新增 ChatModelCallAdvisor

```typescript
public static class DefaultChatClientRequestSpec implements ChatClient.ChatClientRequestSpec {

        private BaseAdvisorChain buildAdvisorChain() {
            this.advisors.add(ChatModelCallAdvisor.builder().chatModel(this.chatModel).build());
            this.advisors.add(ChatModelStreamAdvisor.builder().chatModel(this.chatModel).build());
            return DefaultAroundAdvisorChain.builder(this.observationRegistry).pushAll(this.advisors).templateRenderer(this.templateRenderer).build();
        }
    }
```

1. 内部类 DefaultPromptSystemSpec 实现 ChatClient.PromptSystemSpec：设置用户文本内容、参数
2. 内部类 DefaultPromptSystemSpec 实现 ChatClient.PromptSystemSpec：设置系统文本内容、参数
3. 内部类 DefaultAdvisorSpec 实现 ChatClient.AdvisorSpec：设置 Advisor，及其 advisor 中用到的参数
4. 内部类 DefaultCallResponseSpec 实现 ChatClient.CallResponseSpec：通过 doGetObservableChatClientResponse 方法发起请求，调用一系列的 BaseAdvisorChain

```java
public static class DefaultCallResponseSpec implements ChatClient.CallResponseSpec {
    private final ChatClientRequest request;
    private final BaseAdvisorChain advisorChain;
    private final ObservationRegistry observationRegistry;
    private final ChatClientObservationConvention observationConvention;


    private ChatClientResponse doGetObservableChatClientResponse(ChatClientRequest chatClientRequest, @Nullable String outputFormat) {
    if (outputFormat != null) {
        chatClientRequest.context().put(ChatClientAttributes.OUTPUTFORMAT.getKey(), outputFormat);
    }

    ChatClientObservationContext observationContext = ChatClientObservationContext.builder().request(chatClientRequest).advisors(this.advisorChain.getCallAdvisors()).stream(false).format(outputFormat).build();
    Observation observation = ChatClientObservationDocumentation.AICHATCLIENT.observation(this.observationConvention, DefaultChatClient.DEFAULTCHATCLIENTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry);
    ChatClientResponse chatClientResponse = (ChatClientResponse)observation.observe(() -> this.advisorChain.nextCall(chatClientRequest));
    return chatClientResponse != null ? chatClientResponse : ChatClientResponse.builder().build();
    }
}
```

1. 内部类 DefaultStreamResponseSpec 实现 ChatClient.StreamResponseSpec：通过 doGetObservableFluxChatResponse 方法发起请求，调用一系列的 BaseAdvisorChain

```java
public static class DefaultStreamResponseSpec implements ChatClient.StreamResponseSpec {
    private final ChatClientRequest request;
    private final BaseAdvisorChain advisorChain;
    private final ObservationRegistry observationRegistry;
    private final ChatClientObservationConvention observationConvention;

    private Flux<ChatClientResponse> doGetObservableFluxChatResponse(ChatClientRequest chatClientRequest) {
        return Flux.deferContextual((contextView) -> {
            ChatClientObservationContext observationContext = ChatClientObservationContext.builder().request(chatClientRequest).advisors(this.advisorChain.getStreamAdvisors()).stream(true).build();
            Observation observation = ChatClientObservationDocumentation.AICHATCLIENT.observation(this.observationConvention, DefaultChatClient.DEFAULTCHATCLIENTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry);
            observation.parentObservation((Observation)contextView.getOrDefault("micrometer.observation", (Object)null)).start();
            Flux var10000 = this.advisorChain.nextStream(chatClientRequest);
            Objects.requireNonNull(observation);
            return var10000.doOnError(observation::error).doFinally((s) -> observation.stop()).contextWrite((ctx) -> ctx.put("micrometer.observation", observation));
        });
    }
}
```

完整代码如下

```java
package org.springframework.ai.chat.client;

public class DefaultChatClient implements ChatClient {
    private static final ChatClientObservationConvention DEFAULTCHATCLIENTOBSERVATIONCONVENTION = new DefaultChatClientObservationConvention();
    private static final TemplateRenderer DEFAULTTEMPLATERENDERER = StTemplateRenderer.builder().build();
    private final DefaultChatClientRequestSpec defaultChatClientRequest;

    public DefaultChatClient(DefaultChatClientRequestSpec defaultChatClientRequest) {
        Assert.notNull(defaultChatClientRequest, "defaultChatClientRequest cannot be null");
        this.defaultChatClientRequest = defaultChatClientRequest;
    }

    public ChatClient.ChatClientRequestSpec prompt() {
        return new DefaultChatClientRequestSpec(this.defaultChatClientRequest);
    }

    public ChatClient.ChatClientRequestSpec prompt(String content) {
        Assert.hasText(content, "content cannot be null or empty");
        return this.prompt(new Prompt(content));
    }

    public ChatClient.ChatClientRequestSpec prompt(Prompt prompt) {
        Assert.notNull(prompt, "prompt cannot be null");
        DefaultChatClientRequestSpec spec = new DefaultChatClientRequestSpec(this.defaultChatClientRequest);
        if (prompt.getOptions() != null) {
            spec.options(prompt.getOptions());
        }

        if (prompt.getInstructions() != null) {
            spec.messages(prompt.getInstructions());
        }

        return spec;
    }

    public ChatClient.Builder mutate() {
        return this.defaultChatClientRequest.mutate();
    }

    public static class DefaultPromptUserSpec implements ChatClient.PromptUserSpec {
        private final Map<String, Object> params = new HashMap();
        private final List<Media> media = new ArrayList();
        @Nullable
        private String text;

        public ChatClient.PromptUserSpec media(Media... media) {
            Assert.notNull(media, "media cannot be null");
            Assert.noNullElements(media, "media cannot contain null elements");
            this.media.addAll(Arrays.asList(media));
            return this;
        }

        public ChatClient.PromptUserSpec media(MimeType mimeType, URL url) {
            Assert.notNull(mimeType, "mimeType cannot be null");
            Assert.notNull(url, "url cannot be null");

            try {
                this.media.add(Media.builder().mimeType(mimeType).data(url.toURI()).build());
                return this;
            } catch (URISyntaxException e) {
                throw new RuntimeException(e);
            }
        }

        public ChatClient.PromptUserSpec media(MimeType mimeType, Resource resource) {
            Assert.notNull(mimeType, "mimeType cannot be null");
            Assert.notNull(resource, "resource cannot be null");
            this.media.add(Media.builder().mimeType(mimeType).data(resource).build());
            return this;
        }

        public ChatClient.PromptUserSpec text(String text) {
            Assert.hasText(text, "text cannot be null or empty");
            this.text = text;
            return this;
        }

        public ChatClient.PromptUserSpec text(Resource text, Charset charset) {
            Assert.notNull(text, "text cannot be null");
            Assert.notNull(charset, "charset cannot be null");

            try {
                this.text(text.getContentAsString(charset));
                return this;
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        public ChatClient.PromptUserSpec text(Resource text) {
            Assert.notNull(text, "text cannot be null");
            this.text(text, Charset.defaultCharset());
            return this;
        }

        public ChatClient.PromptUserSpec param(String key, Object value) {
            Assert.hasText(key, "key cannot be null or empty");
            Assert.notNull(value, "value cannot be null");
            this.params.put(key, value);
            return this;
        }

        public ChatClient.PromptUserSpec params(Map<String, Object> params) {
            Assert.notNull(params, "params cannot be null");
            Assert.noNullElements(params.keySet(), "param keys cannot contain null elements");
            Assert.noNullElements(params.values(), "param values cannot contain null elements");
            this.params.putAll(params);
            return this;
        }

        @Nullable
        protected String text() {
            return this.text;
        }

        protected Map<String, Object> params() {
            return this.params;
        }

        protected List<Media> media() {
            return this.media;
        }
    }

    public static class DefaultPromptSystemSpec implements ChatClient.PromptSystemSpec {
        private final Map<String, Object> params = new HashMap();
        @Nullable
        private String text;

        public ChatClient.PromptSystemSpec text(String text) {
            Assert.hasText(text, "text cannot be null or empty");
            this.text = text;
            return this;
        }

        public ChatClient.PromptSystemSpec text(Resource text, Charset charset) {
            Assert.notNull(text, "text cannot be null");
            Assert.notNull(charset, "charset cannot be null");

            try {
                this.text(text.getContentAsString(charset));
                return this;
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        public ChatClient.PromptSystemSpec text(Resource text) {
            Assert.notNull(text, "text cannot be null");
            this.text(text, Charset.defaultCharset());
            return this;
        }

        public ChatClient.PromptSystemSpec param(String key, Object value) {
            Assert.hasText(key, "key cannot be null or empty");
            Assert.notNull(value, "value cannot be null");
            this.params.put(key, value);
            return this;
        }

        public ChatClient.PromptSystemSpec params(Map<String, Object> params) {
            Assert.notNull(params, "params cannot be null");
            Assert.noNullElements(params.keySet(), "param keys cannot contain null elements");
            Assert.noNullElements(params.values(), "param values cannot contain null elements");
            this.params.putAll(params);
            return this;
        }

        @Nullable
        protected String text() {
            return this.text;
        }

        protected Map<String, Object> params() {
            return this.params;
        }
    }

    public static class DefaultAdvisorSpec implements ChatClient.AdvisorSpec {
        private final List<Advisor> advisors = new ArrayList();
        private final Map<String, Object> params = new HashMap();

        public ChatClient.AdvisorSpec param(String key, Object value) {
            Assert.hasText(key, "key cannot be null or empty");
            Assert.notNull(value, "value cannot be null");
            this.params.put(key, value);
            return this;
        }

        public ChatClient.AdvisorSpec params(Map<String, Object> params) {
            Assert.notNull(params, "params cannot be null");
            Assert.noNullElements(params.keySet(), "param keys cannot contain null elements");
            Assert.noNullElements(params.values(), "param values cannot contain null elements");
            this.params.putAll(params);
            return this;
        }

        public ChatClient.AdvisorSpec advisors(Advisor... advisors) {
            Assert.notNull(advisors, "advisors cannot be null");
            Assert.noNullElements(advisors, "advisors cannot contain null elements");
            this.advisors.addAll(List.of(advisors));
            return this;
        }

        public ChatClient.AdvisorSpec advisors(List<Advisor> advisors) {
            Assert.notNull(advisors, "advisors cannot be null");
            Assert.noNullElements(advisors, "advisors cannot contain null elements");
            this.advisors.addAll(advisors);
            return this;
        }

        public List<Advisor> getAdvisors() {
            return this.advisors;
        }

        public Map<String, Object> getParams() {
            return this.params;
        }
    }

    public static class DefaultCallResponseSpec implements ChatClient.CallResponseSpec {
        private final ChatClientRequest request;
        private final BaseAdvisorChain advisorChain;
        private final ObservationRegistry observationRegistry;
        private final ChatClientObservationConvention observationConvention;

        public DefaultCallResponseSpec(ChatClientRequest chatClientRequest, BaseAdvisorChain advisorChain, ObservationRegistry observationRegistry, ChatClientObservationConvention observationConvention) {
            Assert.notNull(chatClientRequest, "chatClientRequest cannot be null");
            Assert.notNull(advisorChain, "advisorChain cannot be null");
            Assert.notNull(observationRegistry, "observationRegistry cannot be null");
            Assert.notNull(observationConvention, "observationConvention cannot be null");
            this.request = chatClientRequest;
            this.advisorChain = advisorChain;
            this.observationRegistry = observationRegistry;
            this.observationConvention = observationConvention;
        }

        public <T> ResponseEntity<ChatResponse, T> responseEntity(Class<T> type) {
            Assert.notNull(type, "type cannot be null");
            return this.doResponseEntity(new BeanOutputConverter(type));
        }

        public <T> ResponseEntity<ChatResponse, T> responseEntity(ParameterizedTypeReference<T> type) {
            Assert.notNull(type, "type cannot be null");
            return this.doResponseEntity(new BeanOutputConverter(type));
        }

        public <T> ResponseEntity<ChatResponse, T> responseEntity(StructuredOutputConverter<T> structuredOutputConverter) {
            Assert.notNull(structuredOutputConverter, "structuredOutputConverter cannot be null");
            return this.doResponseEntity(structuredOutputConverter);
        }

        protected <T> ResponseEntity<ChatResponse, T> doResponseEntity(StructuredOutputConverter<T> outputConverter) {
            Assert.notNull(outputConverter, "structuredOutputConverter cannot be null");
            ChatResponse chatResponse = this.doGetObservableChatClientResponse(this.request, outputConverter.getFormat()).chatResponse();
            String responseContent = getContentFromChatResponse(chatResponse);
            if (responseContent == null) {
                return new ResponseEntity(chatResponse, (Object)null);
            } else {
                T entity = (T)outputConverter.convert(responseContent);
                return new ResponseEntity(chatResponse, entity);
            }
        }

        @Nullable
        public <T> T entity(ParameterizedTypeReference<T> type) {
            Assert.notNull(type, "type cannot be null");
            return (T)this.doSingleWithBeanOutputConverter(new BeanOutputConverter(type));
        }

        @Nullable
        public <T> T entity(StructuredOutputConverter<T> structuredOutputConverter) {
            Assert.notNull(structuredOutputConverter, "structuredOutputConverter cannot be null");
            return (T)this.doSingleWithBeanOutputConverter(structuredOutputConverter);
        }

        @Nullable
        public <T> T entity(Class<T> type) {
            Assert.notNull(type, "type cannot be null");
            BeanOutputConverter<T> outputConverter = new BeanOutputConverter(type);
            return (T)this.doSingleWithBeanOutputConverter(outputConverter);
        }

        @Nullable
        private <T> T doSingleWithBeanOutputConverter(StructuredOutputConverter<T> outputConverter) {
            ChatResponse chatResponse = this.doGetObservableChatClientResponse(this.request, outputConverter.getFormat()).chatResponse();
            String stringResponse = getContentFromChatResponse(chatResponse);
            return (T)(stringResponse == null ? null : outputConverter.convert(stringResponse));
        }

        public ChatClientResponse chatClientResponse() {
            return this.doGetObservableChatClientResponse(this.request);
        }

        @Nullable
        public ChatResponse chatResponse() {
            return this.doGetObservableChatClientResponse(this.request).chatResponse();
        }

        @Nullable
        public String content() {
            ChatResponse chatResponse = this.doGetObservableChatClientResponse(this.request).chatResponse();
            return getContentFromChatResponse(chatResponse);
        }

        private ChatClientResponse doGetObservableChatClientResponse(ChatClientRequest chatClientRequest) {
            return this.doGetObservableChatClientResponse(chatClientRequest, (String)null);
        }

        private ChatClientResponse doGetObservableChatClientResponse(ChatClientRequest chatClientRequest, @Nullable String outputFormat) {
            if (outputFormat != null) {
                chatClientRequest.context().put(ChatClientAttributes.OUTPUTFORMAT.getKey(), outputFormat);
            }

            ChatClientObservationContext observationContext = ChatClientObservationContext.builder().request(chatClientRequest).advisors(this.advisorChain.getCallAdvisors()).stream(false).format(outputFormat).build();
            Observation observation = ChatClientObservationDocumentation.AICHATCLIENT.observation(this.observationConvention, DefaultChatClient.DEFAULTCHATCLIENTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry);
            ChatClientResponse chatClientResponse = (ChatClientResponse)observation.observe(() -> this.advisorChain.nextCall(chatClientRequest));
            return chatClientResponse != null ? chatClientResponse : ChatClientResponse.builder().build();
        }

        @Nullable
        private static String getContentFromChatResponse(@Nullable ChatResponse chatResponse) {
            return (String)Optional.ofNullable(chatResponse).map(ChatResponse::getResult).map(Generation::getOutput).map(AbstractMessage::getText).orElse((Object)null);
        }
    }

    public static class DefaultStreamResponseSpec implements ChatClient.StreamResponseSpec {
        private final ChatClientRequest request;
        private final BaseAdvisorChain advisorChain;
        private final ObservationRegistry observationRegistry;
        private final ChatClientObservationConvention observationConvention;

        public DefaultStreamResponseSpec(ChatClientRequest chatClientRequest, BaseAdvisorChain advisorChain, ObservationRegistry observationRegistry, ChatClientObservationConvention observationConvention) {
            Assert.notNull(chatClientRequest, "chatClientRequest cannot be null");
            Assert.notNull(advisorChain, "advisorChain cannot be null");
            Assert.notNull(observationRegistry, "observationRegistry cannot be null");
            Assert.notNull(observationConvention, "observationConvention cannot be null");
            this.request = chatClientRequest;
            this.advisorChain = advisorChain;
            this.observationRegistry = observationRegistry;
            this.observationConvention = observationConvention;
        }

        private Flux<ChatClientResponse> doGetObservableFluxChatResponse(ChatClientRequest chatClientRequest) {
            return Flux.deferContextual((contextView) -> {
                ChatClientObservationContext observationContext = ChatClientObservationContext.builder().request(chatClientRequest).advisors(this.advisorChain.getStreamAdvisors()).stream(true).build();
                Observation observation = ChatClientObservationDocumentation.AICHATCLIENT.observation(this.observationConvention, DefaultChatClient.DEFAULTCHATCLIENTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry);
                observation.parentObservation((Observation)contextView.getOrDefault("micrometer.observation", (Object)null)).start();
                Flux var10000 = this.advisorChain.nextStream(chatClientRequest);
                Objects.requireNonNull(observation);
                return var10000.doOnError(observation::error).doFinally((s) -> observation.stop()).contextWrite((ctx) -> ctx.put("micrometer.observation", observation));
            });
        }

        public Flux<ChatClientResponse> chatClientResponse() {
            return this.doGetObservableFluxChatResponse(this.request);
        }

        public Flux<ChatResponse> chatResponse() {
            return this.doGetObservableFluxChatResponse(this.request).mapNotNull(ChatClientResponse::chatResponse);
        }

        public Flux<String> content() {
            return this.doGetObservableFluxChatResponse(this.request).mapNotNull(ChatClientResponse::chatResponse).map((r) -> r.getResult() != null && r.getResult().getOutput() != null && r.getResult().getOutput().getText() != null ? r.getResult().getOutput().getText() : "").filter(StringUtils::hasLength);
        }
    }

    public static class DefaultChatClientRequestSpec implements ChatClient.ChatClientRequestSpec {
        private final ObservationRegistry observationRegistry;
        private final ChatClientObservationConvention observationConvention;
        private final ChatModel chatModel;
        private final List<Media> media;
        private final List<String> toolNames;
        private final List<ToolCallback> toolCallbacks;
        private final List<Message> messages;
        private final Map<String, Object> userParams;
        private final Map<String, Object> systemParams;
        private final List<Advisor> advisors;
        private final Map<String, Object> advisorParams;
        private final Map<String, Object> toolContext;
        private TemplateRenderer templateRenderer;
        @Nullable
        private String userText;
        @Nullable
        private String systemText;
        @Nullable
        private ChatOptions chatOptions;

        DefaultChatClientRequestSpec(DefaultChatClientRequestSpec ccr) {
            this(ccr.chatModel, ccr.userText, ccr.userParams, ccr.systemText, ccr.systemParams, ccr.toolCallbacks, ccr.messages, ccr.toolNames, ccr.media, ccr.chatOptions, ccr.advisors, ccr.advisorParams, ccr.observationRegistry, ccr.observationConvention, ccr.toolContext, ccr.templateRenderer);
        }

        public DefaultChatClientRequestSpec(ChatModel chatModel, @Nullable String userText, Map<String, Object> userParams, @Nullable String systemText, Map<String, Object> systemParams, List<ToolCallback> toolCallbacks, List<Message> messages, List<String> toolNames, List<Media> media, @Nullable ChatOptions chatOptions, List<Advisor> advisors, Map<String, Object> advisorParams, ObservationRegistry observationRegistry, @Nullable ChatClientObservationConvention observationConvention, Map<String, Object> toolContext, @Nullable TemplateRenderer templateRenderer) {
            this.media = new ArrayList();
            this.toolNames = new ArrayList();
            this.toolCallbacks = new ArrayList();
            this.messages = new ArrayList();
            this.userParams = new HashMap();
            this.systemParams = new HashMap();
            this.advisors = new ArrayList();
            this.advisorParams = new HashMap();
            this.toolContext = new HashMap();
            Assert.notNull(chatModel, "chatModel cannot be null");
            Assert.notNull(userParams, "userParams cannot be null");
            Assert.notNull(systemParams, "systemParams cannot be null");
            Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
            Assert.notNull(messages, "messages cannot be null");
            Assert.notNull(toolNames, "toolNames cannot be null");
            Assert.notNull(media, "media cannot be null");
            Assert.notNull(advisors, "advisors cannot be null");
            Assert.notNull(advisorParams, "advisorParams cannot be null");
            Assert.notNull(observationRegistry, "observationRegistry cannot be null");
            Assert.notNull(toolContext, "toolContext cannot be null");
            this.chatModel = chatModel;
            this.chatOptions = chatOptions != null ? chatOptions.copy() : (chatModel.getDefaultOptions() != null ? chatModel.getDefaultOptions().copy() : null);
            this.userText = userText;
            this.userParams.putAll(userParams);
            this.systemText = systemText;
            this.systemParams.putAll(systemParams);
            this.toolNames.addAll(toolNames);
            this.toolCallbacks.addAll(toolCallbacks);
            this.messages.addAll(messages);
            this.media.addAll(media);
            this.advisors.addAll(advisors);
            this.advisorParams.putAll(advisorParams);
            this.observationRegistry = observationRegistry;
            this.observationConvention = observationConvention != null ? observationConvention : DefaultChatClient.DEFAULTCHATCLIENTOBSERVATIONCONVENTION;
            this.toolContext.putAll(toolContext);
            this.templateRenderer = templateRenderer != null ? templateRenderer : DefaultChatClient.DEFAULTTEMPLATERENDERER;
        }

        @Nullable
        public String getUserText() {
            return this.userText;
        }

        public Map<String, Object> getUserParams() {
            return this.userParams;
        }

        @Nullable
        public String getSystemText() {
            return this.systemText;
        }

        public Map<String, Object> getSystemParams() {
            return this.systemParams;
        }

        @Nullable
        public ChatOptions getChatOptions() {
            return this.chatOptions;
        }

        public List<Advisor> getAdvisors() {
            return this.advisors;
        }

        public Map<String, Object> getAdvisorParams() {
            return this.advisorParams;
        }

        public List<Message> getMessages() {
            return this.messages;
        }

        public List<Media> getMedia() {
            return this.media;
        }

        public List<String> getToolNames() {
            return this.toolNames;
        }

        public List<ToolCallback> getToolCallbacks() {
            return this.toolCallbacks;
        }

        public Map<String, Object> getToolContext() {
            return this.toolContext;
        }

        public TemplateRenderer getTemplateRenderer() {
            return this.templateRenderer;
        }

        public ChatClient.Builder mutate() {
            DefaultChatClientBuilder builder = (DefaultChatClientBuilder)ChatClient.builder(this.chatModel, this.observationRegistry, this.observationConvention).defaultTemplateRenderer(this.templateRenderer).defaultToolCallbacks(this.toolCallbacks).defaultToolContext(this.toolContext).defaultToolNames(StringUtils.toStringArray(this.toolNames));
            if (StringUtils.hasText(this.userText)) {
                builder.defaultUser((u) -> u.text(this.userText).params(this.userParams).media((Media[])this.media.toArray(new Media[0])));
            }

            if (StringUtils.hasText(this.systemText)) {
                builder.defaultSystem((s) -> s.text(this.systemText).params(this.systemParams));
            }

            if (this.chatOptions != null) {
                builder.defaultOptions(this.chatOptions);
            }

            builder.addMessages(this.messages);
            return builder;
        }

        public ChatClient.ChatClientRequestSpec advisors(Consumer<ChatClient.AdvisorSpec> consumer) {
            Assert.notNull(consumer, "consumer cannot be null");
            DefaultAdvisorSpec advisorSpec = new DefaultAdvisorSpec();
            consumer.accept(advisorSpec);
            this.advisorParams.putAll(advisorSpec.getParams());
            this.advisors.addAll(advisorSpec.getAdvisors());
            return this;
        }

        public ChatClient.ChatClientRequestSpec advisors(Advisor... advisors) {
            Assert.notNull(advisors, "advisors cannot be null");
            Assert.noNullElements(advisors, "advisors cannot contain null elements");
            this.advisors.addAll(Arrays.asList(advisors));
            return this;
        }

        public ChatClient.ChatClientRequestSpec advisors(List<Advisor> advisors) {
            Assert.notNull(advisors, "advisors cannot be null");
            Assert.noNullElements(advisors, "advisors cannot contain null elements");
            this.advisors.addAll(advisors);
            return this;
        }

        public ChatClient.ChatClientRequestSpec messages(Message... messages) {
            Assert.notNull(messages, "messages cannot be null");
            Assert.noNullElements(messages, "messages cannot contain null elements");
            this.messages.addAll(List.of(messages));
            return this;
        }

        public ChatClient.ChatClientRequestSpec messages(List<Message> messages) {
            Assert.notNull(messages, "messages cannot be null");
            Assert.noNullElements(messages, "messages cannot contain null elements");
            this.messages.addAll(messages);
            return this;
        }

        public <T extends ChatOptions> ChatClient.ChatClientRequestSpec options(T options) {
            Assert.notNull(options, "options cannot be null");
            this.chatOptions = options;
            return this;
        }

        public ChatClient.ChatClientRequestSpec toolNames(String... toolNames) {
            Assert.notNull(toolNames, "toolNames cannot be null");
            Assert.noNullElements(toolNames, "toolNames cannot contain null elements");
            this.toolNames.addAll(List.of(toolNames));
            return this;
        }

        public ChatClient.ChatClientRequestSpec toolCallbacks(ToolCallback... toolCallbacks) {
            Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
            Assert.noNullElements(toolCallbacks, "toolCallbacks cannot contain null elements");
            this.toolCallbacks.addAll(List.of(toolCallbacks));
            return this;
        }

        public ChatClient.ChatClientRequestSpec toolCallbacks(List<ToolCallback> toolCallbacks) {
            Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
            Assert.noNullElements(toolCallbacks, "toolCallbacks cannot contain null elements");
            this.toolCallbacks.addAll(toolCallbacks);
            return this;
        }

        public ChatClient.ChatClientRequestSpec tools(Object... toolObjects) {
            Assert.notNull(toolObjects, "toolObjects cannot be null");
            Assert.noNullElements(toolObjects, "toolObjects cannot contain null elements");
            this.toolCallbacks.addAll(Arrays.asList(ToolCallbacks.from(toolObjects)));
            return this;
        }

        public ChatClient.ChatClientRequestSpec toolCallbacks(ToolCallbackProvider... toolCallbackProviders) {
            Assert.notNull(toolCallbackProviders, "toolCallbackProviders cannot be null");
            Assert.noNullElements(toolCallbackProviders, "toolCallbackProviders cannot contain null elements");

            for(ToolCallbackProvider toolCallbackProvider : toolCallbackProviders) {
                this.toolCallbacks.addAll(List.of(toolCallbackProvider.getToolCallbacks()));
            }

            return this;
        }

        public ChatClient.ChatClientRequestSpec toolContext(Map<String, Object> toolContext) {
            Assert.notNull(toolContext, "toolContext cannot be null");
            Assert.noNullElements(toolContext.keySet(), "toolContext keys cannot contain null elements");
            Assert.noNullElements(toolContext.values(), "toolContext values cannot contain null elements");
            this.toolContext.putAll(toolContext);
            return this;
        }

        public ChatClient.ChatClientRequestSpec system(String text) {
            Assert.hasText(text, "text cannot be null or empty");
            this.systemText = text;
            return this;
        }

        public ChatClient.ChatClientRequestSpec system(Resource text, Charset charset) {
            Assert.notNull(text, "text cannot be null");
            Assert.notNull(charset, "charset cannot be null");

            try {
                this.systemText = text.getContentAsString(charset);
                return this;
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        public ChatClient.ChatClientRequestSpec system(Resource text) {
            Assert.notNull(text, "text cannot be null");
            return this.system(text, Charset.defaultCharset());
        }

        public ChatClient.ChatClientRequestSpec system(Consumer<ChatClient.PromptSystemSpec> consumer) {
            Assert.notNull(consumer, "consumer cannot be null");
            DefaultPromptSystemSpec systemSpec = new DefaultPromptSystemSpec();
            consumer.accept(systemSpec);
            this.systemText = StringUtils.hasText(systemSpec.text()) ? systemSpec.text() : this.systemText;
            this.systemParams.putAll(systemSpec.params());
            return this;
        }

        public ChatClient.ChatClientRequestSpec user(String text) {
            Assert.hasText(text, "text cannot be null or empty");
            this.userText = text;
            return this;
        }

        public ChatClient.ChatClientRequestSpec user(Resource text, Charset charset) {
            Assert.notNull(text, "text cannot be null");
            Assert.notNull(charset, "charset cannot be null");

            try {
                this.userText = text.getContentAsString(charset);
                return this;
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        public ChatClient.ChatClientRequestSpec user(Resource text) {
            Assert.notNull(text, "text cannot be null");
            return this.user(text, Charset.defaultCharset());
        }

        public ChatClient.ChatClientRequestSpec user(Consumer<ChatClient.PromptUserSpec> consumer) {
            Assert.notNull(consumer, "consumer cannot be null");
            DefaultPromptUserSpec us = new DefaultPromptUserSpec();
            consumer.accept(us);
            this.userText = StringUtils.hasText(us.text()) ? us.text() : this.userText;
            this.userParams.putAll(us.params());
            this.media.addAll(us.media());
            return this;
        }

        public ChatClient.ChatClientRequestSpec templateRenderer(TemplateRenderer templateRenderer) {
            Assert.notNull(templateRenderer, "templateRenderer cannot be null");
            this.templateRenderer = templateRenderer;
            return this;
        }

        public ChatClient.CallResponseSpec call() {
            BaseAdvisorChain advisorChain = this.buildAdvisorChain();
            return new DefaultCallResponseSpec(DefaultChatClientUtils.toChatClientRequest(this), advisorChain, this.observationRegistry, this.observationConvention);
        }

        public ChatClient.StreamResponseSpec stream() {
            BaseAdvisorChain advisorChain = this.buildAdvisorChain();
            return new DefaultStreamResponseSpec(DefaultChatClientUtils.toChatClientRequest(this), advisorChain, this.observationRegistry, this.observationConvention);
        }

        private BaseAdvisorChain buildAdvisorChain() {
            this.advisors.add(ChatModelCallAdvisor.builder().chatModel(this.chatModel).build());
            this.advisors.add(ChatModelStreamAdvisor.builder().chatModel(this.chatModel).build());
            return DefaultAroundAdvisorChain.builder(this.observationRegistry).pushAll(this.advisors).templateRenderer(this.templateRenderer).build();
        }
    }
}
```

### DefaultChatClientUtils

类作用：用来将 DefaultChatClient.DefaultChatClientRequestSpec 转换为 ChatClientRequest

1. 处理系统提示
2. 处理用户提示
3. 处理工具调用选项

```java
package org.springframework.ai.chat.client;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

final class DefaultChatClientUtils {
    private DefaultChatClientUtils() {
    }

    static ChatClientRequest toChatClientRequest(DefaultChatClient.DefaultChatClientRequestSpec inputRequest) {
        Assert.notNull(inputRequest, "inputRequest cannot be null");
        List<Message> processedMessages = new ArrayList();
        String processedSystemText = inputRequest.getSystemText();
        if (StringUtils.hasText(processedSystemText)) {
            if (!CollectionUtils.isEmpty(inputRequest.getSystemParams())) {
                processedSystemText = PromptTemplate.builder().template(processedSystemText).variables(inputRequest.getSystemParams()).renderer(inputRequest.getTemplateRenderer()).build().render();
            }

            processedMessages.add(new SystemMessage(processedSystemText));
        }

        if (!CollectionUtils.isEmpty(inputRequest.getMessages())) {
            processedMessages.addAll(inputRequest.getMessages());
        }

        String processedUserText = inputRequest.getUserText();
        if (StringUtils.hasText(processedUserText)) {
            if (!CollectionUtils.isEmpty(inputRequest.getUserParams())) {
                processedUserText = PromptTemplate.builder().template(processedUserText).variables(inputRequest.getUserParams()).renderer(inputRequest.getTemplateRenderer()).build().render();
            }

            processedMessages.add(UserMessage.builder().text(processedUserText).media(inputRequest.getMedia()).build());
        }

        ChatOptions processedChatOptions = inputRequest.getChatOptions();
        if (processedChatOptions instanceof ToolCallingChatOptions toolCallingChatOptions) {
            if (!inputRequest.getToolNames().isEmpty()) {
                Set<String> toolNames = ToolCallingChatOptions.mergeToolNames(new HashSet(inputRequest.getToolNames()), toolCallingChatOptions.getToolNames());
                toolCallingChatOptions.setToolNames(toolNames);
            }

            if (!inputRequest.getToolCallbacks().isEmpty()) {
                List<ToolCallback> toolCallbacks = ToolCallingChatOptions.mergeToolCallbacks(inputRequest.getToolCallbacks(), toolCallingChatOptions.getToolCallbacks());
                ToolCallingChatOptions.validateToolCallbacks(toolCallbacks);
                toolCallingChatOptions.setToolCallbacks(toolCallbacks);
            }

            if (!CollectionUtils.isEmpty(inputRequest.getToolContext())) {
                Map<String, Object> toolContext = ToolCallingChatOptions.mergeToolContext(inputRequest.getToolContext(), toolCallingChatOptions.getToolContext());
                toolCallingChatOptions.setToolContext(toolContext);
            }
        }

        return ChatClientRequest.builder().prompt(Prompt.builder().messages(processedMessages).chatOptions(processedChatOptions).build()).context(new ConcurrentHashMap(inputRequest.getAdvisorParams())).build();
    }
}
```

### AdvisorChain

[AdvisorChain 链](https://ik3te1knhq.feishu.cn/wiki/KSvgwUyAXiwaZ1kAgSzcq7HdnQb)调用一系列的增强器 [Advisor 基础](https://ik3te1knhq.feishu.cn/wiki/SjjWwXPtOiCY2gkA7gic47FCn3d)，每个增强器输入是 ChatClientRequest，输出 ChatClientResponse（其中必定会用到的是 ChatModelCallAdvisor 或 ChatModelStreamAdvisor）

- ChatModelCallAdvisor 触发 ChatModel 的 call 方法
- ChatModelStreamAdvisor 触发 ChatModel 的 stream 方法

### ChatModel

```java
package org.springframework.ai.chat.model;

import java.util.Arrays;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.Model;
import reactor.core.publisher.Flux;

public interface ChatModel extends Model<Prompt, ChatResponse>, StreamingChatModel {
    default String call(String message) {
        Prompt prompt = new Prompt(new UserMessage(message));
        Generation generation = this.call(prompt).getResult();
        return generation != null ? generation.getOutput().getText() : "";
    }

    default String call(Message... messages) {
        Prompt prompt = new Prompt(Arrays.asList(messages));
        Generation generation = this.call(prompt).getResult();
        return generation != null ? generation.getOutput().getText() : "";
    }

    ChatResponse call(Prompt prompt);

    default ChatOptions getDefaultOptions() {
        return ChatOptions.builder().build();
    }

    default Flux<ChatResponse> stream(Prompt prompt) {
        throw new UnsupportedOperationException("streaming is not supported");
    }
}
```

不同厂商实现各种的 ChaModel，但实现逻辑基本以 OpenAI 作为官方实现

pom 引入对应依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
</dependency>
```

#### OpenAiChatModel

各字段说明

<table>
<tr>
<td>字段名<br/></td><td>类型<br/></td><td>描述<br/></td></tr>
<tr>
<td>defaultOptions<br/></td><td>OpenAiChatOptions<br/></td><td>请求参数配置，如temperature、最大 token 数等<br/></td></tr>
<tr>
<td>retryTemplate<br/></td><td>RetryTemplate<br/></td><td>用于执行重试逻辑，适用于网络不稳定或 API 限流等<br/></td></tr>
<tr>
<td>openAiApi<br/></td><td>OpenAiApi<br/></td><td>封装OpenAI官方API的调用接口<br/></td></tr>
<tr>
<td>observationRegistry<br/></td><td>ObservationRegistry<br/></td><td>用于注册和记录观测日志，便于监控和分析调用过程<br/></td></tr>
<tr>
<td>toolCallingManager<br/></td><td>ToolCallingManager<br/></td><td>工具调用管理器，用于解析并执行工具调<br/></td></tr>
<tr>
<td>toolExecutionEligibilityPredicate<br/></td><td>ToolExecutionEligibilityPredicate<br/></td><td>判断是否需要执行工具调用的断言函数<br/></td></tr>
<tr>
<td>observationConvention<br/></td><td>ChatModelObservationConvention<br/></td><td>自定义观测日志格式的约定对象<br/></td></tr>
</table>


对外暴露的方法

<table>
<tr>
<td>方法名<br/></td><td>描述<br/></td></tr>
<tr>
<td>call<br/></td><td>发起一次同步请求，返回完整的 ChatResponse，实际调用内部的internalCall方法<br/></td></tr>
<tr>
<td>internalCall<br/></td><td>1. 构建OpenAI请求对象<br/>2. 创建观测上下文<br/>3. 执行带观测的模型调用<br/>4. 执行OpenAI接口调用<br/>5. 解析模型返回的choices<br/>6. 将每个choice转换为Generation对象，构建完整的<br/>7. 提取限流信息（RateLimit）<br/>8. 计算token使用量<br/>9. 构建最终的ChatResponse并设置上下文<br/>10. 工具调用处理<br/></td></tr>
<tr>
<td>stream<br/></td><td>发起一次流式请求，返回Flux<ChatResponse>，实际调用内部的internalStream方法<br/></td></tr>
<tr>
<td>internalStream<br/></td><td>1. 使用Flux.deferContextual延迟执行，保持上下文一致性<br/>2. 构建OpenAI流式请求对象<br/>3. 发起流式 API 调用，获取 chunk 数据<br/>4. 创建角色映射表，解决 chunk 中 role 缺失问题<br/>5. 创建观测上下文<br/>6. 启动观测操作<br/>7. 将 chunk 转换为 ChatCompletion 标准格式<br/>8. 转换为 ChatResponse 并构建生成内<br/>9. 处理 usage 字段（仅最终 chunk 包含完整 usage）<br/>10. 工具调用处理<br/>11. 聚合消息流并设置响应<br/></td></tr>
<tr>
<td>getDefaultOptions<br/></td><td>回当前模型使用的默认请求参数，OpenAiChatOptions<br/></td></tr>
<tr>
<td>setObservationConvention<br/></td><td>设置自定义的观测日志格式化规则<br/></td></tr>
<tr>
<td>mutate<br/></td><td>复制OpenAiChatModel实例<br/></td></tr>
</table>


```java
package org.springframework.ai.openai;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.ChatGenerationMetadata;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.metadata.EmptyUsage;
import org.springframework.ai.chat.metadata.RateLimit;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.model.MessageAggregator;
import org.springframework.ai.chat.observation.ChatModelObservationContext;
import org.springframework.ai.chat.observation.ChatModelObservationConvention;
import org.springframework.ai.chat.observation.ChatModelObservationDocumentation;
import org.springframework.ai.chat.observation.DefaultChatModelObservationConvention;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.ai.model.ModelOptionsUtils;
import org.springframework.ai.model.tool.DefaultToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.ToolExecutionResult;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.openai.api.OpenAiApi.ChatCompletionMessage.Role;
import org.springframework.ai.openai.api.OpenAiApi.ChatCompletionMessage.MediaContent.InputAudio.Format;
import org.springframework.ai.openai.api.common.OpenAiApiConstants;
import org.springframework.ai.openai.metadata.support.OpenAiResponseHeaderExtractor;
import org.springframework.ai.retry.RetryUtils;
import org.springframework.ai.support.UsageCalculator;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

public class OpenAiChatModel implements ChatModel {
    private static final Logger logger = LoggerFactory.getLogger(OpenAiChatModel.class);
    private static final ChatModelObservationConvention DEFAULTOBSERVATIONCONVENTION = new DefaultChatModelObservationConvention();
    private static final ToolCallingManager DEFAULTTOOLCALLINGMANAGER = ToolCallingManager.builder().build();
    private final OpenAiChatOptions defaultOptions;
    private final RetryTemplate retryTemplate;
    private final OpenAiApi openAiApi;
    private final ObservationRegistry observationRegistry;
    private final ToolCallingManager toolCallingManager;
    private final ToolExecutionEligibilityPredicate toolExecutionEligibilityPredicate;
    private ChatModelObservationConvention observationConvention;

    public OpenAiChatModel(OpenAiApi openAiApi, OpenAiChatOptions defaultOptions, ToolCallingManager toolCallingManager, RetryTemplate retryTemplate, ObservationRegistry observationRegistry) {
        this(openAiApi, defaultOptions, toolCallingManager, retryTemplate, observationRegistry, new DefaultToolExecutionEligibilityPredicate());
    }

    public OpenAiChatModel(OpenAiApi openAiApi, OpenAiChatOptions defaultOptions, ToolCallingManager toolCallingManager, RetryTemplate retryTemplate, ObservationRegistry observationRegistry, ToolExecutionEligibilityPredicate toolExecutionEligibilityPredicate) {
        this.observationConvention = DEFAULTOBSERVATIONCONVENTION;
        Assert.notNull(openAiApi, "openAiApi cannot be null");
        Assert.notNull(defaultOptions, "defaultOptions cannot be null");
        Assert.notNull(toolCallingManager, "toolCallingManager cannot be null");
        Assert.notNull(retryTemplate, "retryTemplate cannot be null");
        Assert.notNull(observationRegistry, "observationRegistry cannot be null");
        Assert.notNull(toolExecutionEligibilityPredicate, "toolExecutionEligibilityPredicate cannot be null");
        this.openAiApi = openAiApi;
        this.defaultOptions = defaultOptions;
        this.toolCallingManager = toolCallingManager;
        this.retryTemplate = retryTemplate;
        this.observationRegistry = observationRegistry;
        this.toolExecutionEligibilityPredicate = toolExecutionEligibilityPredicate;
    }

    public ChatResponse call(Prompt prompt) {
        Prompt requestPrompt = this.buildRequestPrompt(prompt);
        return this.internalCall(requestPrompt, (ChatResponse)null);
    }

    public ChatResponse internalCall(Prompt prompt, ChatResponse previousChatResponse) {
        OpenAiApi.ChatCompletionRequest request = this.createRequest(prompt, false);
        ChatModelObservationContext observationContext = ChatModelObservationContext.builder().prompt(prompt).provider(OpenAiApiConstants.PROVIDERNAME).build();
        ChatResponse response = (ChatResponse)ChatModelObservationDocumentation.CHATMODELOPERATION.observation(this.observationConvention, DEFAULTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry).observe(() -> {
            ResponseEntity<OpenAiApi.ChatCompletion> completionEntity = (ResponseEntity)this.retryTemplate.execute((ctx) -> this.openAiApi.chatCompletionEntity(request, this.getAdditionalHttpHeaders(prompt)));
            OpenAiApi.ChatCompletion chatCompletion = (OpenAiApi.ChatCompletion)completionEntity.getBody();
            if (chatCompletion == null) {
                logger.warn("No chat completion returned for prompt: {}", prompt);
                return new ChatResponse(List.of());
            } else {
                List<OpenAiApi.ChatCompletion.Choice> choices = chatCompletion.choices();
                if (choices == null) {
                    logger.warn("No choices returned for prompt: {}", prompt);
                    return new ChatResponse(List.of());
                } else {
                    List<Generation> generations = choices.stream().map((choice) -> {
                        Map<String, Object> metadata = Map.of("id", chatCompletion.id() != null ? chatCompletion.id() : "", "role", choice.message().role() != null ? choice.message().role().name() : "", "index", choice.index(), "finishReason", choice.finishReason() != null ? choice.finishReason().name() : "", "refusal", StringUtils.hasText(choice.message().refusal()) ? choice.message().refusal() : "", "annotations", choice.message().annotations() != null ? choice.message().annotations() : List.of());
                        return this.buildGeneration(choice, metadata, request);
                    }).toList();
                    RateLimit rateLimit = OpenAiResponseHeaderExtractor.extractAiResponseHeaders(completionEntity);
                    OpenAiApi.Usage usage = chatCompletion.usage();
                    Usage currentChatResponseUsage = (Usage)(usage != null ? this.getDefaultUsage(usage) : new EmptyUsage());
                    Usage accumulatedUsage = UsageCalculator.getCumulativeUsage(currentChatResponseUsage, previousChatResponse);
                    ChatResponse chatResponse = new ChatResponse(generations, this.from(chatCompletion, rateLimit, accumulatedUsage));
                    observationContext.setResponse(chatResponse);
                    return chatResponse;
                }
            }
        });
        if (this.toolExecutionEligibilityPredicate.isToolExecutionRequired(prompt.getOptions(), response)) {
            ToolExecutionResult toolExecutionResult = this.toolCallingManager.executeToolCalls(prompt, response);
            return toolExecutionResult.returnDirect() ? ChatResponse.builder().from(response).generations(ToolExecutionResult.buildGenerations(toolExecutionResult)).build() : this.internalCall(new Prompt(toolExecutionResult.conversationHistory(), prompt.getOptions()), response);
        } else {
            return response;
        }
    }

    public Flux<ChatResponse> stream(Prompt prompt) {
        Prompt requestPrompt = this.buildRequestPrompt(prompt);
        return this.internalStream(requestPrompt, (ChatResponse)null);
    }

    public Flux<ChatResponse> internalStream(Prompt prompt, ChatResponse previousChatResponse) {
        return Flux.deferContextual((contextView) -> {
            OpenAiApi.ChatCompletionRequest request = this.createRequest(prompt, true);
            if (request.outputModalities() != null && request.outputModalities().stream().anyMatch((m) -> m.equals("audio"))) {
                logger.warn("Audio output is not supported for streaming requests. Removing audio output.");
                throw new IllegalArgumentException("Audio output is not supported for streaming requests.");
            } else if (request.audioParameters() != null) {
                logger.warn("Audio parameters are not supported for streaming requests. Removing audio parameters.");
                throw new IllegalArgumentException("Audio parameters are not supported for streaming requests.");
            } else {
                Flux<OpenAiApi.ChatCompletionChunk> completionChunks = this.openAiApi.chatCompletionStream(request, this.getAdditionalHttpHeaders(prompt));
                ConcurrentHashMap<String, String> roleMap = new ConcurrentHashMap();
                ChatModelObservationContext observationContext = ChatModelObservationContext.builder().prompt(prompt).provider(OpenAiApiConstants.PROVIDERNAME).build();
                Observation observation = ChatModelObservationDocumentation.CHATMODELOPERATION.observation(this.observationConvention, DEFAULTOBSERVATIONCONVENTION, () -> observationContext, this.observationRegistry);
                observation.parentObservation((Observation)contextView.getOrDefault("micrometer.observation", (Object)null)).start();
                Flux<ChatResponse> chatResponse = completionChunks.map(this::chunkToChatCompletion).switchMap((chatCompletion) -> Mono.just(chatCompletion).map((chatCompletion2) -> {
                        try {
                            String id = chatCompletion2.id() == null ? "NOID" : chatCompletion2.id();
                            List<Generation> generations = chatCompletion2.choices().stream().map((choice) -> {
                                if (choice.message().role() != null) {
                                    roleMap.putIfAbsent(id, choice.message().role().name());
                                }

                                Map<String, Object> metadata = Map.of("id", id, "role", roleMap.getOrDefault(id, ""), "index", choice.index(), "finishReason", choice.finishReason() != null ? choice.finishReason().name() : "", "refusal", StringUtils.hasText(choice.message().refusal()) ? choice.message().refusal() : "", "annotations", choice.message().annotations() != null ? choice.message().annotations() : List.of());
                                return this.buildGeneration(choice, metadata, request);
                            }).toList();
                            OpenAiApi.Usage usage = chatCompletion2.usage();
                            Usage currentChatResponseUsage = (Usage)(usage != null ? this.getDefaultUsage(usage) : new EmptyUsage());
                            Usage accumulatedUsage = UsageCalculator.getCumulativeUsage(currentChatResponseUsage, previousChatResponse);
                            return new ChatResponse(generations, this.from(chatCompletion2, (RateLimit)null, accumulatedUsage));
                        } catch (Exception e) {
                            logger.error("Error processing chat completion", e);
                            return new ChatResponse(List.of());
                        }
                    })).buffer(2, 1).map((bufferList) -> {
                    ChatResponse firstResponse = (ChatResponse)bufferList.get(0);
                    if (request.streamOptions() != null && request.streamOptions().includeUsage() && bufferList.size() == 2) {
                        ChatResponse secondResponse = (ChatResponse)bufferList.get(1);
                        if (secondResponse != null && secondResponse.getMetadata() != null) {
                            Usage usage = secondResponse.getMetadata().getUsage();
                            if (!UsageCalculator.isEmpty(usage)) {
                                return new ChatResponse(firstResponse.getResults(), this.from(firstResponse.getMetadata(), usage));
                            }
                        }
                    }

                    return firstResponse;
                });
                Flux var10000 = chatResponse.flatMap((response) -> this.toolExecutionEligibilityPredicate.isToolExecutionRequired(prompt.getOptions(), response) ? Flux.defer(() -> {
                        ToolExecutionResult toolExecutionResult = this.toolCallingManager.executeToolCalls(prompt, response);
                        return toolExecutionResult.returnDirect() ? Flux.just(ChatResponse.builder().from(response).generations(ToolExecutionResult.buildGenerations(toolExecutionResult)).build()) : this.internalStream(new Prompt(toolExecutionResult.conversationHistory(), prompt.getOptions()), response);
                    }).subscribeOn(Schedulers.boundedElastic()) : Flux.just(response));
                Objects.requireNonNull(observation);
                Flux<ChatResponse> flux = var10000.doOnError(observation::error).doFinally((s) -> observation.stop()).contextWrite((ctx) -> ctx.put("micrometer.observation", observation));
                MessageAggregator var11 = new MessageAggregator();
                Objects.requireNonNull(observationContext);
                return var11.aggregate(flux, observationContext::setResponse);
            }
        });
    }

    private MultiValueMap<String, String> getAdditionalHttpHeaders(Prompt prompt) {
        Map<String, String> headers = new HashMap(this.defaultOptions.getHttpHeaders());
        if (prompt.getOptions() != null) {
            ChatOptions var4 = prompt.getOptions();
            if (var4 instanceof OpenAiChatOptions) {
                OpenAiChatOptions chatOptions = (OpenAiChatOptions)var4;
                headers.putAll(chatOptions.getHttpHeaders());
            }
        }

        return CollectionUtils.toMultiValueMap((Map)headers.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, (e) -> List.of((String)e.getValue()))));
    }

    private Generation buildGeneration(OpenAiApi.ChatCompletion.Choice choice, Map<String, Object> metadata, OpenAiApi.ChatCompletionRequest request) {
        List<AssistantMessage.ToolCall> toolCalls = choice.message().toolCalls() == null ? List.of() : choice.message().toolCalls().stream().map((toolCall) -> new AssistantMessage.ToolCall(toolCall.id(), "function", toolCall.function().name(), toolCall.function().arguments())).toList();
        String finishReason = choice.finishReason() != null ? choice.finishReason().name() : "";
        ChatGenerationMetadata.Builder generationMetadataBuilder = ChatGenerationMetadata.builder().finishReason(finishReason);
        List<Media> media = new ArrayList();
        String textContent = choice.message().content();
        OpenAiApi.ChatCompletionMessage.AudioOutput audioOutput = choice.message().audioOutput();
        if (audioOutput != null) {
            String mimeType = String.format("audio/%s", request.audioParameters().format().name().toLowerCase());
            byte[] audioData = Base64.getDecoder().decode(audioOutput.data());
            Resource resource = new ByteArrayResource(audioData);
            Media.builder().mimeType(MimeTypeUtils.parseMimeType(mimeType)).data(resource).id(audioOutput.id()).build();
            media.add(Media.builder().mimeType(MimeTypeUtils.parseMimeType(mimeType)).data(resource).id(audioOutput.id()).build());
            if (!StringUtils.hasText(textContent)) {
                textContent = audioOutput.transcript();
            }

            generationMetadataBuilder.metadata("audioId", audioOutput.id());
            generationMetadataBuilder.metadata("audioExpiresAt", audioOutput.expiresAt());
        }

        if (Boolean.TRUE.equals(request.logprobs())) {
            generationMetadataBuilder.metadata("logprobs", choice.logprobs());
        }

        AssistantMessage assistantMessage = new AssistantMessage(textContent, metadata, toolCalls, media);
        return new Generation(assistantMessage, generationMetadataBuilder.build());
    }

    private ChatResponseMetadata from(OpenAiApi.ChatCompletion result, RateLimit rateLimit, Usage usage) {
        Assert.notNull(result, "OpenAI ChatCompletionResult must not be null");
        ChatResponseMetadata.Builder builder = ChatResponseMetadata.builder().id(result.id() != null ? result.id() : "").usage(usage).model(result.model() != null ? result.model() : "").keyValue("created", result.created() != null ? result.created() : 0L).keyValue("system-fingerprint", result.systemFingerprint() != null ? result.systemFingerprint() : "");
        if (rateLimit != null) {
            builder.rateLimit(rateLimit);
        }

        return builder.build();
    }

    private ChatResponseMetadata from(ChatResponseMetadata chatResponseMetadata, Usage usage) {
        Assert.notNull(chatResponseMetadata, "OpenAI ChatResponseMetadata must not be null");
        ChatResponseMetadata.Builder builder = ChatResponseMetadata.builder().id(chatResponseMetadata.getId() != null ? chatResponseMetadata.getId() : "").usage(usage).model(chatResponseMetadata.getModel() != null ? chatResponseMetadata.getModel() : "");
        if (chatResponseMetadata.getRateLimit() != null) {
            builder.rateLimit(chatResponseMetadata.getRateLimit());
        }

        return builder.build();
    }

    private OpenAiApi.ChatCompletion chunkToChatCompletion(OpenAiApi.ChatCompletionChunk chunk) {
        List<OpenAiApi.ChatCompletion.Choice> choices = chunk.choices().stream().map((chunkChoice) -> new OpenAiApi.ChatCompletion.Choice(chunkChoice.finishReason(), chunkChoice.index(), chunkChoice.delta(), chunkChoice.logprobs())).toList();
        return new OpenAiApi.ChatCompletion(chunk.id(), choices, chunk.created(), chunk.model(), chunk.serviceTier(), chunk.systemFingerprint(), "chat.completion", chunk.usage());
    }

    private DefaultUsage getDefaultUsage(OpenAiApi.Usage usage) {
        return new DefaultUsage(usage.promptTokens(), usage.completionTokens(), usage.totalTokens(), usage);
    }

    Prompt buildRequestPrompt(Prompt prompt) {
        OpenAiChatOptions runtimeOptions = null;
        if (prompt.getOptions() != null) {
            ChatOptions var4 = prompt.getOptions();
            if (var4 instanceof ToolCallingChatOptions) {
                ToolCallingChatOptions toolCallingChatOptions = (ToolCallingChatOptions)var4;
                runtimeOptions = (OpenAiChatOptions)ModelOptionsUtils.copyToTarget(toolCallingChatOptions, ToolCallingChatOptions.class, OpenAiChatOptions.class);
            } else {
                runtimeOptions = (OpenAiChatOptions)ModelOptionsUtils.copyToTarget(prompt.getOptions(), ChatOptions.class, OpenAiChatOptions.class);
            }
        }

        OpenAiChatOptions requestOptions = (OpenAiChatOptions)ModelOptionsUtils.merge(runtimeOptions, this.defaultOptions, OpenAiChatOptions.class);
        if (runtimeOptions != null) {
            if (runtimeOptions.getTopK() != null) {
                logger.warn("The topK option is not supported by OpenAI chat models. Ignoring.");
            }

            requestOptions.setHttpHeaders(this.mergeHttpHeaders(runtimeOptions.getHttpHeaders(), this.defaultOptions.getHttpHeaders()));
            requestOptions.setInternalToolExecutionEnabled((Boolean)ModelOptionsUtils.mergeOption(runtimeOptions.getInternalToolExecutionEnabled(), this.defaultOptions.getInternalToolExecutionEnabled()));
            requestOptions.setToolNames(ToolCallingChatOptions.mergeToolNames(runtimeOptions.getToolNames(), this.defaultOptions.getToolNames()));
            requestOptions.setToolCallbacks(ToolCallingChatOptions.mergeToolCallbacks(runtimeOptions.getToolCallbacks(), this.defaultOptions.getToolCallbacks()));
            requestOptions.setToolContext(ToolCallingChatOptions.mergeToolContext(runtimeOptions.getToolContext(), this.defaultOptions.getToolContext()));
        } else {
            requestOptions.setHttpHeaders(this.defaultOptions.getHttpHeaders());
            requestOptions.setInternalToolExecutionEnabled(this.defaultOptions.getInternalToolExecutionEnabled());
            requestOptions.setToolNames(this.defaultOptions.getToolNames());
            requestOptions.setToolCallbacks(this.defaultOptions.getToolCallbacks());
            requestOptions.setToolContext(this.defaultOptions.getToolContext());
        }

        ToolCallingChatOptions.validateToolCallbacks(requestOptions.getToolCallbacks());
        return new Prompt(prompt.getInstructions(), requestOptions);
    }

    private Map<String, String> mergeHttpHeaders(Map<String, String> runtimeHttpHeaders, Map<String, String> defaultHttpHeaders) {
        HashMap<String, String> mergedHttpHeaders = new HashMap(defaultHttpHeaders);
        mergedHttpHeaders.putAll(runtimeHttpHeaders);
        return mergedHttpHeaders;
    }

    OpenAiApi.ChatCompletionRequest createRequest(Prompt prompt, boolean stream) {
        List<OpenAiApi.ChatCompletionMessage> chatCompletionMessages = prompt.getInstructions().stream().map((message) -> {
            if (message.getMessageType() != MessageType.USER && message.getMessageType() != MessageType.SYSTEM) {
                if (message.getMessageType() == MessageType.ASSISTANT) {
                    AssistantMessage assistantMessage = (AssistantMessage)message;
                    List<OpenAiApi.ChatCompletionMessage.ToolCall> toolCalls = null;
                    if (!CollectionUtils.isEmpty(assistantMessage.getToolCalls())) {
                        toolCalls = assistantMessage.getToolCalls().stream().map((toolCall) -> {
                            OpenAiApi.ChatCompletionMessage.ChatCompletionFunction function = new OpenAiApi.ChatCompletionMessage.ChatCompletionFunction(toolCall.name(), toolCall.arguments());
                            return new OpenAiApi.ChatCompletionMessage.ToolCall(toolCall.id(), toolCall.type(), function);
                        }).toList();
                    }

                    OpenAiApi.ChatCompletionMessage.AudioOutput audioOutput = null;
                    if (!CollectionUtils.isEmpty(assistantMessage.getMedia())) {
                        Assert.isTrue(assistantMessage.getMedia().size() == 1, "Only one media content is supported for assistant messages");
                        audioOutput = new OpenAiApi.ChatCompletionMessage.AudioOutput(((Media)assistantMessage.getMedia().get(0)).getId(), (String)null, (Long)null, (String)null);
                    }

                    return List.of(new OpenAiApi.ChatCompletionMessage(assistantMessage.getText(), Role.ASSISTANT, (String)null, (String)null, toolCalls, (String)null, audioOutput, (List)null));
                } else if (message.getMessageType() == MessageType.TOOL) {
                    ToolResponseMessage toolMessage = (ToolResponseMessage)message;
                    toolMessage.getResponses().forEach((response) -> Assert.isTrue(response.id() != null, "ToolResponseMessage must have an id"));
                    return toolMessage.getResponses().stream().map((tr) -> new OpenAiApi.ChatCompletionMessage(tr.responseData(), Role.TOOL, tr.name(), tr.id(), (List)null, (String)null, (OpenAiApi.ChatCompletionMessage.AudioOutput)null, (List)null)).toList();
                } else {
                    throw new IllegalArgumentException("Unsupported message type: " + String.valueOf(message.getMessageType()));
                }
            } else {
                Object content = message.getText();
                if (message instanceof UserMessage) {
                    UserMessage userMessage = (UserMessage)message;
                    if (!CollectionUtils.isEmpty(userMessage.getMedia())) {
                        List<OpenAiApi.ChatCompletionMessage.MediaContent> contentList = new ArrayList(List.of(new OpenAiApi.ChatCompletionMessage.MediaContent(message.getText())));
                        contentList.addAll(userMessage.getMedia().stream().map(this::mapToMediaContent).toList());
                        content = contentList;
                    }
                }

                return List.of(new OpenAiApi.ChatCompletionMessage(content, Role.valueOf(message.getMessageType().name())));
            }
        }).flatMap(Collection::stream).toList();
        OpenAiApi.ChatCompletionRequest request = new OpenAiApi.ChatCompletionRequest(chatCompletionMessages, stream);
        OpenAiChatOptions requestOptions = (OpenAiChatOptions)prompt.getOptions();
        request = (OpenAiApi.ChatCompletionRequest)ModelOptionsUtils.merge(requestOptions, request, OpenAiApi.ChatCompletionRequest.class);
        List<ToolDefinition> toolDefinitions = this.toolCallingManager.resolveToolDefinitions(requestOptions);
        if (!CollectionUtils.isEmpty(toolDefinitions)) {
            request = (OpenAiApi.ChatCompletionRequest)ModelOptionsUtils.merge(OpenAiChatOptions.builder().tools(this.getFunctionTools(toolDefinitions)).build(), request, OpenAiApi.ChatCompletionRequest.class);
        }

        if (request.streamOptions() != null && !stream) {
            logger.warn("Removing streamOptions from the request as it is not a streaming request!");
            request = request.streamOptions((OpenAiApi.ChatCompletionRequest.StreamOptions)null);
        }

        return request;
    }

    private OpenAiApi.ChatCompletionMessage.MediaContent mapToMediaContent(Media media) {
        MimeType mimeType = media.getMimeType();
        if (MimeTypeUtils.parseMimeType("audio/mp3").equals(mimeType)) {
            return new OpenAiApi.ChatCompletionMessage.MediaContent(new OpenAiApi.ChatCompletionMessage.MediaContent.InputAudio(this.fromAudioData(media.getData()), Format.MP3));
        } else {
            return MimeTypeUtils.parseMimeType("audio/wav").equals(mimeType) ? new OpenAiApi.ChatCompletionMessage.MediaContent(new OpenAiApi.ChatCompletionMessage.MediaContent.InputAudio(this.fromAudioData(media.getData()), Format.WAV)) : new OpenAiApi.ChatCompletionMessage.MediaContent(new OpenAiApi.ChatCompletionMessage.MediaContent.ImageUrl(this.fromMediaData(media.getMimeType(), media.getData())));
        }
    }

    private String fromAudioData(Object audioData) {
        if (audioData instanceof byte[] bytes) {
            return Base64.getEncoder().encodeToString(bytes);
        } else {
            throw new IllegalArgumentException("Unsupported audio data type: " + audioData.getClass().getSimpleName());
        }
    }

    private String fromMediaData(MimeType mimeType, Object mediaContentData) {
        if (mediaContentData instanceof byte[] bytes) {
            return String.format("data:%s;base64,%s", mimeType.toString(), Base64.getEncoder().encodeToString(bytes));
        } else if (mediaContentData instanceof String text) {
            return text;
        } else {
            throw new IllegalArgumentException("Unsupported media data type: " + mediaContentData.getClass().getSimpleName());
        }
    }

    private List<OpenAiApi.FunctionTool> getFunctionTools(List<ToolDefinition> toolDefinitions) {
        return toolDefinitions.stream().map((toolDefinition) -> {
            OpenAiApi.FunctionTool.Function function = new OpenAiApi.FunctionTool.Function(toolDefinition.description(), toolDefinition.name(), toolDefinition.inputSchema());
            return new OpenAiApi.FunctionTool(function);
        }).toList();
    }

    public ChatOptions getDefaultOptions() {
        return OpenAiChatOptions.fromOptions(this.defaultOptions);
    }

    public String toString() {
        return "OpenAiChatModel [defaultOptions=" + String.valueOf(this.defaultOptions) + "]";
    }

    public void setObservationConvention(ChatModelObservationConvention observationConvention) {
        Assert.notNull(observationConvention, "observationConvention cannot be null");
        this.observationConvention = observationConvention;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Builder mutate() {
        return new Builder(this);
    }

    public OpenAiChatModel clone() {
        return this.mutate().build();
    }

    public static final class Builder {
        private OpenAiApi openAiApi;
        private OpenAiChatOptions defaultOptions;
        private ToolCallingManager toolCallingManager;
        private ToolExecutionEligibilityPredicate toolExecutionEligibilityPredicate;
        private RetryTemplate retryTemplate;
        private ObservationRegistry observationRegistry;

        public Builder(OpenAiChatModel model) {
            this.defaultOptions = OpenAiChatOptions.builder().model(OpenAiApi.DEFAULTCHATMODEL).temperature(0.7).build();
            this.toolExecutionEligibilityPredicate = new DefaultToolExecutionEligibilityPredicate();
            this.retryTemplate = RetryUtils.DEFAULTRETRYTEMPLATE;
            this.observationRegistry = ObservationRegistry.NOOP;
            this.openAiApi = model.openAiApi;
            this.defaultOptions = model.defaultOptions;
            this.toolCallingManager = model.toolCallingManager;
            this.toolExecutionEligibilityPredicate = model.toolExecutionEligibilityPredicate;
            this.retryTemplate = model.retryTemplate;
            this.observationRegistry = model.observationRegistry;
        }

        private Builder() {
            this.defaultOptions = OpenAiChatOptions.builder().model(OpenAiApi.DEFAULTCHATMODEL).temperature(0.7).build();
            this.toolExecutionEligibilityPredicate = new DefaultToolExecutionEligibilityPredicate();
            this.retryTemplate = RetryUtils.DEFAULTRETRYTEMPLATE;
            this.observationRegistry = ObservationRegistry.NOOP;
        }

        public Builder openAiApi(OpenAiApi openAiApi) {
            this.openAiApi = openAiApi;
            return this;
        }

        public Builder defaultOptions(OpenAiChatOptions defaultOptions) {
            this.defaultOptions = defaultOptions;
            return this;
        }

        public Builder toolCallingManager(ToolCallingManager toolCallingManager) {
            this.toolCallingManager = toolCallingManager;
            return this;
        }

        public Builder toolExecutionEligibilityPredicate(ToolExecutionEligibilityPredicate toolExecutionEligibilityPredicate) {
            this.toolExecutionEligibilityPredicate = toolExecutionEligibilityPredicate;
            return this;
        }

        public Builder retryTemplate(RetryTemplate retryTemplate) {
            this.retryTemplate = retryTemplate;
            return this;
        }

        public Builder observationRegistry(ObservationRegistry observationRegistry) {
            this.observationRegistry = observationRegistry;
            return this;
        }

        public OpenAiChatModel build() {
            return this.toolCallingManager != null ? new OpenAiChatModel(this.openAiApi, this.defaultOptions, this.toolCallingManager, this.retryTemplate, this.observationRegistry, this.toolExecutionEligibilityPredicate) : new OpenAiChatModel(this.openAiApi, this.defaultOptions, OpenAiChatModel.DEFAULTTOOLCALLINGMANAGER, this.retryTemplate, this.observationRegistry, this.toolExecutionEligibilityPredicate);
        }
    }
}
```

#### OpenAiApi

各字段说明

<table>
<tr>
<td>字段名<br/></td><td>类型<br/></td><td>描述<br/></td></tr>
<tr>
<td>baseUrl<br/></td><td>String<br/></td><td>OpenAI API 的基础 URL，默认为 "https://api.openai.com"<br/></td></tr>
<tr>
<td>apiKey<br/></td><td>ApiKey<br/></td><td>认证密钥<br/></td></tr>
<tr>
<td>headers<br/></td><td>MultiValueMap<String, String><br/></td><td>自定义 HTTP 请求头，例如用户自定义的身份信息等<br/></td></tr>
<tr>
<td>completionsPath<br/></td><td>String<br/></td><td>Chat Completion 接口路径，默认为 /v1/chat/completions<br/></td></tr>
<tr>
<td>embeddingsPath<br/></td><td>String<br/></td><td>Embedding 接口路径，默认为 /v1/embeddings<br/></td></tr>
<tr>
<td>responseErrorHandler<br/></td><td>ResponseErrorHandler<br/></td><td>响应错误处理器，默认处理异常逻辑<br/></td></tr>
<tr>
<td>restClient<br/></td><td>RestClient<br/></td><td>同步请求客户端，用于非流式请求<br/></td></tr>
<tr>
<td>webClient<br/></td><td>WebClient<br/></td><td>异步/响应式请求客户端，用于流式请求<br/></td></tr>
<tr>
<td>chunkMerger<br/></td><td>OpenAiStreamFunctionCallingHelper<br/></td><td>流式函数调用合并器，用于处理多个 chunk 中的 functioncall 数据<br/></td></tr>
</table>


对外暴露的方法

<table>
<tr>
<td>方法名<br/></td><td>描述<br/></td></tr>
<tr>
<td>chatCompletionEntity<br/></td><td>发送同步请求获取完整的 Chat Completion 响应<br/></td></tr>
<tr>
<td>chatCompletionStream<br/></td><td>发起流式请求，接收分块响应（chunk）<br/></td></tr>
<tr>
<td>embeddings<br/></td><td>调用 OpenAI Embedding 接口，生成文本或 token 数组的向量表示<br/></td></tr>
</table>


内部枚举类说明

<table>
<tr>
<td>枚举类<br/></td><td>描述<br/></td></tr>
<tr>
<td>ChatModel<br/></td><td>支持的聊天模型<br/></td></tr>
<tr>
<td>ChatCompletionFinishReason<br/></td><td>模型停止生成的原因<br/></td></tr>
<tr>
<td>EmbeddingModel<br/></td><td>支持的Embedding模型<br/></td></tr>
<tr>
<td>OutputModality<br/></td><td>模型输出的范式<br/></td></tr>
</table>


完整代码如下

```java
package org.springframework.ai.openai.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat.Feature;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.function.Predicate;
import org.springframework.ai.model.ApiKey;
import org.springframework.ai.model.ChatModelDescription;
import org.springframework.ai.model.ModelOptionsUtils;
import org.springframework.ai.model.NoopApiKey;
import org.springframework.ai.model.SimpleApiKey;
import org.springframework.ai.retry.RetryUtils;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class OpenAiApi {
    public static final ChatModel DEFAULTCHATMODEL;
    public static final String DEFAULTEMBEDDINGMODEL;
    private static final Predicate<String> SSEDONEPREDICATE;
    private final String baseUrl;
    private final ApiKey apiKey;
    private final MultiValueMap<String, String> headers;
    private final String completionsPath;
    private final String embeddingsPath;
    private final ResponseErrorHandler responseErrorHandler;
    private final RestClient restClient;
    private final WebClient webClient;
    private OpenAiStreamFunctionCallingHelper chunkMerger = new OpenAiStreamFunctionCallingHelper();

    public Builder mutate() {
        return new Builder(this);
    }

    public static Builder builder() {
        return new Builder();
    }

    public OpenAiApi(String baseUrl, ApiKey apiKey, MultiValueMap<String, String> headers, String completionsPath, String embeddingsPath, RestClient.Builder restClientBuilder, WebClient.Builder webClientBuilder, ResponseErrorHandler responseErrorHandler) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.headers = headers;
        this.completionsPath = completionsPath;
        this.embeddingsPath = embeddingsPath;
        this.responseErrorHandler = responseErrorHandler;
        Assert.hasText(completionsPath, "Completions Path must not be null");
        Assert.hasText(embeddingsPath, "Embeddings Path must not be null");
        Assert.notNull(headers, "Headers must not be null");
        Consumer<HttpHeaders> finalHeaders = (h) -> {
            if (!(apiKey instanceof NoopApiKey)) {
                h.setBearerAuth(apiKey.getValue());
            }

            h.setContentType(MediaType.APPLICATIONJSON);
            h.addAll(headers);
        };
        this.restClient = restClientBuilder.clone().baseUrl(baseUrl).defaultHeaders(finalHeaders).defaultStatusHandler(responseErrorHandler).build();
        this.webClient = webClientBuilder.clone().baseUrl(baseUrl).defaultHeaders(finalHeaders).build();
    }

    public static String getTextContent(List<ChatCompletionMessage.MediaContent> content) {
        return (String)content.stream().filter((c) -> "text".equals(c.type())).map(ChatCompletionMessage.MediaContent::text).reduce("", (a, b) -> a + b);
    }

    public ResponseEntity<ChatCompletion> chatCompletionEntity(ChatCompletionRequest chatRequest) {
        return this.chatCompletionEntity(chatRequest, new LinkedMultiValueMap());
    }

    public ResponseEntity<ChatCompletion> chatCompletionEntity(ChatCompletionRequest chatRequest, MultiValueMap<String, String> additionalHttpHeader) {
        Assert.notNull(chatRequest, "The request body can not be null.");
        Assert.isTrue(!chatRequest.stream(), "Request must set the stream property to false.");
        Assert.notNull(additionalHttpHeader, "The additional HTTP headers can not be null.");
        return ((RestClient.RequestBodySpec)((RestClient.RequestBodySpec)this.restClient.post().uri(this.completionsPath, new Object[0])).headers((headers) -> headers.addAll(additionalHttpHeader))).body(chatRequest).retrieve().toEntity(ChatCompletion.class);
    }

    public Flux<ChatCompletionChunk> chatCompletionStream(ChatCompletionRequest chatRequest) {
        return this.chatCompletionStream(chatRequest, new LinkedMultiValueMap());
    }

    public Flux<ChatCompletionChunk> chatCompletionStream(ChatCompletionRequest chatRequest, MultiValueMap<String, String> additionalHttpHeader) {
        Assert.notNull(chatRequest, "The request body can not be null.");
        Assert.isTrue(chatRequest.stream(), "Request must set the stream property to true.");
        AtomicBoolean isInsideTool = new AtomicBoolean(false);
        return ((WebClient.RequestBodySpec)((WebClient.RequestBodySpec)this.webClient.post().uri(this.completionsPath, new Object[0])).headers((headers) -> headers.addAll(additionalHttpHeader))).body(Mono.just(chatRequest), ChatCompletionRequest.class).retrieve().bodyToFlux(String.class).takeUntil(SSEDONEPREDICATE).filter(SSEDONEPREDICATE.negate()).map((content) -> (ChatCompletionChunk)ModelOptionsUtils.jsonToObject(content, ChatCompletionChunk.class)).map((chunk) -> {
            if (this.chunkMerger.isStreamingToolFunctionCall(chunk)) {
                isInsideTool.set(true);
            }

            return chunk;
        }).windowUntil((chunk) -> {
            if (isInsideTool.get() && this.chunkMerger.isStreamingToolFunctionCallFinish(chunk)) {
                isInsideTool.set(false);
                return true;
            } else {
                return !isInsideTool.get();
            }
        }).concatMapIterable((window) -> {
            Mono<ChatCompletionChunk> monoChunk = window.reduce(new ChatCompletionChunk((String)null, (List)null, (Long)null, (String)null, (String)null, (String)null, (String)null, (Usage)null), (previous, current) -> this.chunkMerger.merge(previous, current));
            return List.of(monoChunk);
        }).flatMap((mono) -> mono);
    }

    public <T> ResponseEntity<EmbeddingList<Embedding>> embeddings(EmbeddingRequest<T> embeddingRequest) {
        Assert.notNull(embeddingRequest, "The request body can not be null.");
        Assert.notNull(embeddingRequest.input(), "The input can not be null.");
        Assert.isTrue(embeddingRequest.input() instanceof String || embeddingRequest.input() instanceof List, "The input must be either a String, or a List of Strings or List of List of integers.");
        Object var3 = embeddingRequest.input();
        if (var3 instanceof List list) {
            Assert.isTrue(!CollectionUtils.isEmpty(list), "The input list can not be empty.");
            Assert.isTrue(list.size() <= 2048, "The list must be 2048 dimensions or less");
            Assert.isTrue(list.get(0) instanceof String || list.get(0) instanceof Integer || list.get(0) instanceof List, "The input must be either a String, or a List of Strings or list of list of integers.");
        }

        return ((RestClient.RequestBodySpec)this.restClient.post().uri(this.embeddingsPath, new Object[0])).body(embeddingRequest).retrieve().toEntity(new ParameterizedTypeReference<EmbeddingList<Embedding>>() {
        });
    }

    String getBaseUrl() {
        return this.baseUrl;
    }

    ApiKey getApiKey() {
        return this.apiKey;
    }

    MultiValueMap<String, String> getHeaders() {
        return this.headers;
    }

    String getCompletionsPath() {
        return this.completionsPath;
    }

    String getEmbeddingsPath() {
        return this.embeddingsPath;
    }

    ResponseErrorHandler getResponseErrorHandler() {
        return this.responseErrorHandler;
    }

    static {
        DEFAULTCHATMODEL = OpenAiApi.ChatModel.GPT4O;
        DEFAULTEMBEDDINGMODEL = OpenAiApi.EmbeddingModel.TEXTEMBEDDINGADA002.getValue();
        SSEDONEPREDICATE = "[DONE]"::equals;
    }

    public static enum ChatModel implements ChatModelDescription {
        O4MINI("o4-mini"),
        O3("o3"),
        O3MINI("o3-mini"),
        O1("o1"),
        O1MINI("o1-mini"),
        O1PRO("o1-pro"),
        GPT41("gpt-4.1"),
        GPT4O("gpt-4o"),
        CHATGPT4OLATEST("chatgpt-4o-latest"),
        GPT4OAUDIOPREVIEW("gpt-4o-audio-preview"),
        GPT41MINI("gpt-4.1-mini"),
        GPT41NANO("gpt-4.1-nano"),
        GPT4OMINI("gpt-4o-mini"),
        GPT4OMINIAUDIOPREVIEW("gpt-4o-mini-audio-preview"),
        GPT4OREALTIMEPREVIEW("gpt-4o-realtime-preview"),
        GPT4OMINIREALTIMEPREVIEW("gpt-4o-mini-realtime-preview\n"),
        GPT4TURBO("gpt-4-turbo"),
        GPT4("gpt-4"),
        GPT35TURBO("gpt-3.5-turbo"),
        GPT35TURBOINSTRUCT("gpt-3.5-turbo-instruct"),
        GPT4OSEARCHPREVIEW("gpt-4o-search-preview"),
        GPT4OMINISEARCHPREVIEW("gpt-4o-mini-search-preview");

        public final String value;

        private ChatModel(String value) {
            this.value = value;
        }

        public String getValue() {
            return this.value;
        }

        public String getName() {
            return this.value;
        }
    }

    public static enum ChatCompletionFinishReason {
        @JsonProperty("stop")
        STOP,
        @JsonProperty("length")
        LENGTH,
        @JsonProperty("contentfilter")
        CONTENTFILTER,
        @JsonProperty("toolcalls")
        TOOLCALLS,
        @JsonProperty("toolcall")
        TOOLCALL;
    }

    public static enum EmbeddingModel {
        TEXTEMBEDDING3LARGE("text-embedding-3-large"),
        TEXTEMBEDDING3SMALL("text-embedding-3-small"),
        TEXTEMBEDDINGADA002("text-embedding-ada-002");

        public final String value;

        private EmbeddingModel(String value) {
            this.value = value;
        }

        public String getValue() {
            return this.value;
        }
    }

    @JsonInclude(Include.NONNULL)
    public static class FunctionTool {
        @JsonProperty("type")
        private Type type;
        @JsonProperty("function")
        private Function function;

        public FunctionTool() {
            this.type = OpenAiApi.FunctionTool.Type.FUNCTION;
        }

        public FunctionTool(Type type, Function function) {
            this.type = OpenAiApi.FunctionTool.Type.FUNCTION;
            this.type = type;
            this.function = function;
        }

        public FunctionTool(Function function) {
            this(OpenAiApi.FunctionTool.Type.FUNCTION, function);
        }

        public Type getType() {
            return this.type;
        }

        public Function getFunction() {
            return this.function;
        }

        public void setType(Type type) {
            this.type = type;
        }

        public void setFunction(Function function) {
            this.function = function;
        }

        public static enum Type {
            @JsonProperty("function")
            FUNCTION;
        }

        @JsonInclude(Include.NONNULL)
        public static class Function {
            @JsonProperty("description")
            private String description;
            @JsonProperty("name")
            private String name;
            @JsonProperty("parameters")
            private Map<String, Object> parameters;
            @JsonProperty("strict")
            Boolean strict;
            @JsonIgnore
            private String jsonSchema;

            private Function() {
            }

            public Function(String description, String name, Map<String, Object> parameters, Boolean strict) {
                this.description = description;
                this.name = name;
                this.parameters = parameters;
                this.strict = strict;
            }

            public Function(String description, String name, String jsonSchema) {
                this(description, name, ModelOptionsUtils.jsonToMap(jsonSchema), (Boolean)null);
            }

            public String getDescription() {
                return this.description;
            }

            public String getName() {
                return this.name;
            }

            public Map<String, Object> getParameters() {
                return this.parameters;
            }

            public void setDescription(String description) {
                this.description = description;
            }

            public void setName(String name) {
                this.name = name;
            }

            public void setParameters(Map<String, Object> parameters) {
                this.parameters = parameters;
            }

            public Boolean getStrict() {
                return this.strict;
            }

            public void setStrict(Boolean strict) {
                this.strict = strict;
            }

            public String getJsonSchema() {
                return this.jsonSchema;
            }

            public void setJsonSchema(String jsonSchema) {
                this.jsonSchema = jsonSchema;
                if (jsonSchema != null) {
                    this.parameters = ModelOptionsUtils.jsonToMap(jsonSchema);
                }

            }
        }
    }

    public static enum OutputModality {
        @JsonProperty("audio")
        AUDIO,
        @JsonProperty("text")
        TEXT;
    }

    @JsonInclude(Include.NONNULL)
    public static record ChatCompletionRequest(List<ChatCompletionMessage> messages, String model, Boolean store, Map<String, String> metadata, Double frequencyPenalty, Map<String, Integer> logitBias, Boolean logprobs, Integer topLogprobs, Integer maxTokens, Integer maxCompletionTokens, Integer n, List<OutputModality> outputModalities, AudioParameters audioParameters, Double presencePenalty, ResponseFormat responseFormat, Integer seed, String serviceTier, List<String> stop, Boolean stream, StreamOptions streamOptions, Double temperature, Double topP, List<FunctionTool> tools, Object toolChoice, Boolean parallelToolCalls, String user, String reasoningEffort, WebSearchOptions webSearchOptions) {
        public ChatCompletionRequest(List<ChatCompletionMessage> messages, String model, Double temperature) {
            this(messages, model, (Boolean)null, (Map)null, (Double)null, (Map)null, (Boolean)null, (Integer)null, (Integer)null, (Integer)null, (Integer)null, (List)null, (AudioParameters)null, (Double)null, (ResponseFormat)null, (Integer)null, (String)null, (List)null, false, (StreamOptions)null, temperature, (Double)null, (List)null, (Object)null, (Boolean)null, (String)null, (String)null, (WebSearchOptions)null);
        }

        public ChatCompletionRequest(List<ChatCompletionMessage> messages, String model, AudioParameters audio, boolean stream) {
            this(messages, model, (Boolean)null, (Map)null, (Double)null, (Map)null, (Boolean)null, (Integer)null, (Integer)null, (Integer)null, (Integer)null, List.of(OpenAiApi.OutputModality.AUDIO, OpenAiApi.OutputModality.TEXT), audio, (Double)null, (ResponseFormat)null, (Integer)null, (String)null, (List)null, stream, (StreamOptions)null, (Double)null, (Double)null, (List)null, (Object)null, (Boolean)null, (String)null, (String)null, (WebSearchOptions)null);
        }

        public ChatCompletionRequest(List<ChatCompletionMessage> messages, String model, Double temperature, boolean stream) {
            this(messages, model, (Boolean)null, (Map)null, (Double)null, (Map)null, (Boolean)null, (Integer)null, (Integer)null, (Integer)null, (Integer)null, (List)null, (AudioParameters)null, (Double)null, (ResponseFormat)null, (Integer)null, (String)null, (List)null, stream, (StreamOptions)null, temperature, (Double)null, (List)null, (Object)null, (Boolean)null, (String)null, (String)null, (WebSearchOptions)null);
        }

        public ChatCompletionRequest(List<ChatCompletionMessage> messages, String model, List<FunctionTool> tools, Object toolChoice) {
            this(messages, model, (Boolean)null, (Map)null, (Double)null, (Map)null, (Boolean)null, (Integer)null, (Integer)null, (Integer)null, (Integer)null, (List)null, (AudioParameters)null, (Double)null, (ResponseFormat)null, (Integer)null, (String)null, (List)null, false, (StreamOptions)null, 0.8, (Double)null, tools, toolChoice, (Boolean)null, (String)null, (String)null, (WebSearchOptions)null);
        }

        public ChatCompletionRequest(List<ChatCompletionMessage> messages, Boolean stream) {
            this(messages, (String)null, (Boolean)null, (Map)null, (Double)null, (Map)null, (Boolean)null, (Integer)null, (Integer)null, (Integer)null, (Integer)null, (List)null, (AudioParameters)null, (Double)null, (ResponseFormat)null, (Integer)null, (String)null, (List)null, stream, (StreamOptions)null, (Double)null, (Double)null, (List)null, (Object)null, (Boolean)null, (String)null, (String)null, (WebSearchOptions)null);
        }

        public ChatCompletionRequest(@JsonProperty("messages") List<ChatCompletionMessage> messages, @JsonProperty("model") String model, @JsonProperty("store") Boolean store, @JsonProperty("metadata") Map<String, String> metadata, @JsonProperty("frequencypenalty") Double frequencyPenalty, @JsonProperty("logitbias") Map<String, Integer> logitBias, @JsonProperty("logprobs") Boolean logprobs, @JsonProperty("toplogprobs") Integer topLogprobs, @JsonProperty("maxtokens") Integer maxTokens, @JsonProperty("maxcompletiontokens") Integer maxCompletionTokens, @JsonProperty("n") Integer n, @JsonProperty("modalities") List<OutputModality> outputModalities, @JsonProperty("audio") AudioParameters audioParameters, @JsonProperty("presencepenalty") Double presencePenalty, @JsonProperty("responseformat") ResponseFormat responseFormat, @JsonProperty("seed") Integer seed, @JsonProperty("servicetier") String serviceTier, @JsonProperty("stop") List<String> stop, @JsonProperty("stream") Boolean stream, @JsonProperty("streamoptions") StreamOptions streamOptions, @JsonProperty("temperature") Double temperature, @JsonProperty("topp") Double topP, @JsonProperty("tools") List<FunctionTool> tools, @JsonProperty("toolchoice") Object toolChoice, @JsonProperty("paralleltoolcalls") Boolean parallelToolCalls, @JsonProperty("user") String user, @JsonProperty("reasoningeffort") String reasoningEffort, @JsonProperty("websearchoptions") WebSearchOptions webSearchOptions) {
            this.messages = messages;
            this.model = model;
            this.store = store;
            this.metadata = metadata;
            this.frequencyPenalty = frequencyPenalty;
            this.logitBias = logitBias;
            this.logprobs = logprobs;
            this.topLogprobs = topLogprobs;
            this.maxTokens = maxTokens;
            this.maxCompletionTokens = maxCompletionTokens;
            this.n = n;
            this.outputModalities = outputModalities;
            this.audioParameters = audioParameters;
            this.presencePenalty = presencePenalty;
            this.responseFormat = responseFormat;
            this.seed = seed;
            this.serviceTier = serviceTier;
            this.stop = stop;
            this.stream = stream;
            this.streamOptions = streamOptions;
            this.temperature = temperature;
            this.topP = topP;
            this.tools = tools;
            this.toolChoice = toolChoice;
            this.parallelToolCalls = parallelToolCalls;
            this.user = user;
            this.reasoningEffort = reasoningEffort;
            this.webSearchOptions = webSearchOptions;
        }

        public ChatCompletionRequest streamOptions(StreamOptions streamOptions) {
            return new ChatCompletionRequest(this.messages, this.model, this.store, this.metadata, this.frequencyPenalty, this.logitBias, this.logprobs, this.topLogprobs, this.maxTokens, this.maxCompletionTokens, this.n, this.outputModalities, this.audioParameters, this.presencePenalty, this.responseFormat, this.seed, this.serviceTier, this.stop, this.stream, streamOptions, this.temperature, this.topP, this.tools, this.toolChoice, this.parallelToolCalls, this.user, this.reasoningEffort, this.webSearchOptions);
        }

        @JsonProperty("messages")
        public List<ChatCompletionMessage> messages() {
            return this.messages;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("store")
        public Boolean store() {
            return this.store;
        }

        @JsonProperty("metadata")
        public Map<String, String> metadata() {
            return this.metadata;
        }

        @JsonProperty("frequencypenalty")
        public Double frequencyPenalty() {
            return this.frequencyPenalty;
        }

        @JsonProperty("logitbias")
        public Map<String, Integer> logitBias() {
            return this.logitBias;
        }

        @JsonProperty("logprobs")
        public Boolean logprobs() {
            return this.logprobs;
        }

        @JsonProperty("toplogprobs")
        public Integer topLogprobs() {
            return this.topLogprobs;
        }

        @JsonProperty("maxtokens")
        public Integer maxTokens() {
            return this.maxTokens;
        }

        @JsonProperty("maxcompletiontokens")
        public Integer maxCompletionTokens() {
            return this.maxCompletionTokens;
        }

        @JsonProperty("n")
        public Integer n() {
            return this.n;
        }

        @JsonProperty("modalities")
        public List<OutputModality> outputModalities() {
            return this.outputModalities;
        }

        @JsonProperty("audio")
        public AudioParameters audioParameters() {
            return this.audioParameters;
        }

        @JsonProperty("presencepenalty")
        public Double presencePenalty() {
            return this.presencePenalty;
        }

        @JsonProperty("responseformat")
        public ResponseFormat responseFormat() {
            return this.responseFormat;
        }

        @JsonProperty("seed")
        public Integer seed() {
            return this.seed;
        }

        @JsonProperty("servicetier")
        public String serviceTier() {
            return this.serviceTier;
        }

        @JsonProperty("stop")
        public List<String> stop() {
            return this.stop;
        }

        @JsonProperty("stream")
        public Boolean stream() {
            return this.stream;
        }

        @JsonProperty("streamoptions")
        public StreamOptions streamOptions() {
            return this.streamOptions;
        }

        @JsonProperty("temperature")
        public Double temperature() {
            return this.temperature;
        }

        @JsonProperty("topp")
        public Double topP() {
            return this.topP;
        }

        @JsonProperty("tools")
        public List<FunctionTool> tools() {
            return this.tools;
        }

        @JsonProperty("toolchoice")
        public Object toolChoice() {
            return this.toolChoice;
        }

        @JsonProperty("paralleltoolcalls")
        public Boolean parallelToolCalls() {
            return this.parallelToolCalls;
        }

        @JsonProperty("user")
        public String user() {
            return this.user;
        }

        @JsonProperty("reasoningeffort")
        public String reasoningEffort() {
            return this.reasoningEffort;
        }

        @JsonProperty("websearchoptions")
        public WebSearchOptions webSearchOptions() {
            return this.webSearchOptions;
        }

        public static class ToolChoiceBuilder {
            public static final String AUTO = "auto";
            public static final String NONE = "none";

            public static Object FUNCTION(String functionName) {
                return Map.of("type", "function", "function", Map.of("name", functionName));
            }
        }

        @JsonInclude(Include.NONNULL)
        public static record AudioParameters(Voice voice, AudioResponseFormat format) {
            public AudioParameters(@JsonProperty("voice") Voice voice, @JsonProperty("format") AudioResponseFormat format) {
                this.voice = voice;
                this.format = format;
            }

            @JsonProperty("voice")
            public Voice voice() {
                return this.voice;
            }

            @JsonProperty("format")
            public AudioResponseFormat format() {
                return this.format;
            }

            public static enum Voice {
                @JsonProperty("alloy")
                ALLOY,
                @JsonProperty("echo")
                ECHO,
                @JsonProperty("fable")
                FABLE,
                @JsonProperty("onyx")
                ONYX,
                @JsonProperty("nova")
                NOVA,
                @JsonProperty("shimmer")
                SHIMMER;
            }

            public static enum AudioResponseFormat {
                @JsonProperty("mp3")
                MP3,
                @JsonProperty("flac")
                FLAC,
                @JsonProperty("opus")
                OPUS,
                @JsonProperty("pcm16")
                PCM16,
                @JsonProperty("wav")
                WAV;
            }
        }

        @JsonInclude(Include.NONNULL)
        public static record StreamOptions(Boolean includeUsage) {
            public static StreamOptions INCLUDEUSAGE = new StreamOptions(true);

            public StreamOptions(@JsonProperty("includeusage") Boolean includeUsage) {
                this.includeUsage = includeUsage;
            }

            @JsonProperty("includeusage")
            public Boolean includeUsage() {
                return this.includeUsage;
            }
        }

        @JsonInclude(Include.NONNULL)
        public static record WebSearchOptions(SearchContextSize searchContextSize, UserLocation userLocation) {
            public WebSearchOptions(@JsonProperty("searchcontextsize") SearchContextSize searchContextSize, @JsonProperty("userlocation") UserLocation userLocation) {
                this.searchContextSize = searchContextSize;
                this.userLocation = userLocation;
            }

            @JsonProperty("searchcontextsize")
            public SearchContextSize searchContextSize() {
                return this.searchContextSize;
            }

            @JsonProperty("userlocation")
            public UserLocation userLocation() {
                return this.userLocation;
            }

            public static enum SearchContextSize {
                @JsonProperty("low")
                LOW,
                @JsonProperty("medium")
                MEDIUM,
                @JsonProperty("high")
                HIGH;
            }

            @JsonInclude(Include.NONNULL)
            public static record UserLocation(String type, Approximate approximate) {
                public UserLocation(@JsonProperty("type") String type, @JsonProperty("approximate") Approximate approximate) {
                    this.type = type;
                    this.approximate = approximate;
                }

                @JsonProperty("type")
                public String type() {
                    return this.type;
                }

                @JsonProperty("approximate")
                public Approximate approximate() {
                    return this.approximate;
                }

                @JsonInclude(Include.NONNULL)
                public static record Approximate(String city, String country, String region, String timezone) {
                    public Approximate(@JsonProperty("city") String city, @JsonProperty("country") String country, @JsonProperty("region") String region, @JsonProperty("timezone") String timezone) {
                        this.city = city;
                        this.country = country;
                        this.region = region;
                        this.timezone = timezone;
                    }

                    @JsonProperty("city")
                    public String city() {
                        return this.city;
                    }

                    @JsonProperty("country")
                    public String country() {
                        return this.country;
                    }

                    @JsonProperty("region")
                    public String region() {
                        return this.region;
                    }

                    @JsonProperty("timezone")
                    public String timezone() {
                        return this.timezone;
                    }
                }
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ChatCompletionMessage(Object rawContent, Role role, String name, String toolCallId, List<ToolCall> toolCalls, String refusal, AudioOutput audioOutput, List<Annotation> annotations) {
        public ChatCompletionMessage(Object content, Role role) {
            this(content, role, (String)null, (String)null, (List)null, (String)null, (AudioOutput)null, (List)null);
        }

        public ChatCompletionMessage(@JsonProperty("content") Object rawContent, @JsonProperty("role") Role role, @JsonProperty("name") String name, @JsonProperty("toolcallid") String toolCallId, @JsonProperty("toolcalls") @JsonFormat(with = {Feature.ACCEPTSINGLEVALUEASARRAY}) List<ToolCall> toolCalls, @JsonProperty("refusal") String refusal, @JsonProperty("audio") AudioOutput audioOutput, @JsonProperty("annotations") List<Annotation> annotations) {
            this.rawContent = rawContent;
            this.role = role;
            this.name = name;
            this.toolCallId = toolCallId;
            this.toolCalls = toolCalls;
            this.refusal = refusal;
            this.audioOutput = audioOutput;
            this.annotations = annotations;
        }

        public String content() {
            if (this.rawContent == null) {
                return null;
            } else {
                Object var2 = this.rawContent;
                if (var2 instanceof String) {
                    String text = (String)var2;
                    return text;
                } else {
                    throw new IllegalStateException("The content is not a string!");
                }
            }
        }

        @JsonProperty("content")
        public Object rawContent() {
            return this.rawContent;
        }

        @JsonProperty("role")
        public Role role() {
            return this.role;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("toolcallid")
        public String toolCallId() {
            return this.toolCallId;
        }

        @JsonProperty("toolcalls")
        @JsonFormat(
            with = {Feature.ACCEPTSINGLEVALUEASARRAY}
        )
        public List<ToolCall> toolCalls() {
            return this.toolCalls;
        }

        @JsonProperty("refusal")
        public String refusal() {
            return this.refusal;
        }

        @JsonProperty("audio")
        public AudioOutput audioOutput() {
            return this.audioOutput;
        }

        @JsonProperty("annotations")
        public List<Annotation> annotations() {
            return this.annotations;
        }

        public static enum Role {
            @JsonProperty("system")
            SYSTEM,
            @JsonProperty("user")
            USER,
            @JsonProperty("assistant")
            ASSISTANT,
            @JsonProperty("tool")
            TOOL;
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record MediaContent(String type, String text, ImageUrl imageUrl, InputAudio inputAudio) {
            public MediaContent(String text) {
                this("text", text, (ImageUrl)null, (InputAudio)null);
            }

            public MediaContent(ImageUrl imageUrl) {
                this("imageurl", (String)null, imageUrl, (InputAudio)null);
            }

            public MediaContent(InputAudio inputAudio) {
                this("inputaudio", (String)null, (ImageUrl)null, inputAudio);
            }

            public MediaContent(@JsonProperty("type") String type, @JsonProperty("text") String text, @JsonProperty("imageurl") ImageUrl imageUrl, @JsonProperty("inputaudio") InputAudio inputAudio) {
                this.type = type;
                this.text = text;
                this.imageUrl = imageUrl;
                this.inputAudio = inputAudio;
            }

            @JsonProperty("type")
            public String type() {
                return this.type;
            }

            @JsonProperty("text")
            public String text() {
                return this.text;
            }

            @JsonProperty("imageurl")
            public ImageUrl imageUrl() {
                return this.imageUrl;
            }

            @JsonProperty("inputaudio")
            public InputAudio inputAudio() {
                return this.inputAudio;
            }

            @JsonInclude(Include.NONNULL)
            public static record InputAudio(String data, Format format) {
                public InputAudio(@JsonProperty("data") String data, @JsonProperty("format") Format format) {
                    this.data = data;
                    this.format = format;
                }

                @JsonProperty("data")
                public String data() {
                    return this.data;
                }

                @JsonProperty("format")
                public Format format() {
                    return this.format;
                }

                public static enum Format {
                    @JsonProperty("mp3")
                    MP3,
                    @JsonProperty("wav")
                    WAV;
                }
            }

            @JsonInclude(Include.NONNULL)
            public static record ImageUrl(String url, String detail) {
                public ImageUrl(String url) {
                    this(url, (String)null);
                }

                public ImageUrl(@JsonProperty("url") String url, @JsonProperty("detail") String detail) {
                    this.url = url;
                    this.detail = detail;
                }

                @JsonProperty("url")
                public String url() {
                    return this.url;
                }

                @JsonProperty("detail")
                public String detail() {
                    return this.detail;
                }
            }
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record ToolCall(Integer index, String id, String type, ChatCompletionFunction function) {
            public ToolCall(String id, String type, ChatCompletionFunction function) {
                this((Integer)null, id, type, function);
            }

            public ToolCall(@JsonProperty("index") Integer index, @JsonProperty("id") String id, @JsonProperty("type") String type, @JsonProperty("function") ChatCompletionFunction function) {
                this.index = index;
                this.id = id;
                this.type = type;
                this.function = function;
            }

            @JsonProperty("index")
            public Integer index() {
                return this.index;
            }

            @JsonProperty("id")
            public String id() {
                return this.id;
            }

            @JsonProperty("type")
            public String type() {
                return this.type;
            }

            @JsonProperty("function")
            public ChatCompletionFunction function() {
                return this.function;
            }
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record ChatCompletionFunction(String name, String arguments) {
            public ChatCompletionFunction(@JsonProperty("name") String name, @JsonProperty("arguments") String arguments) {
                this.name = name;
                this.arguments = arguments;
            }

            @JsonProperty("name")
            public String name() {
                return this.name;
            }

            @JsonProperty("arguments")
            public String arguments() {
                return this.arguments;
            }
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record AudioOutput(String id, String data, Long expiresAt, String transcript) {
            public AudioOutput(@JsonProperty("id") String id, @JsonProperty("data") String data, @JsonProperty("expiresat") Long expiresAt, @JsonProperty("transcript") String transcript) {
                this.id = id;
                this.data = data;
                this.expiresAt = expiresAt;
                this.transcript = transcript;
            }

            @JsonProperty("id")
            public String id() {
                return this.id;
            }

            @JsonProperty("data")
            public String data() {
                return this.data;
            }

            @JsonProperty("expiresat")
            public Long expiresAt() {
                return this.expiresAt;
            }

            @JsonProperty("transcript")
            public String transcript() {
                return this.transcript;
            }
        }

        @JsonInclude(Include.NONNULL)
        public static record Annotation(String type, UrlCitation urlCitation) {
            public Annotation(@JsonProperty("type") String type, @JsonProperty("urlcitation") UrlCitation urlCitation) {
                this.type = type;
                this.urlCitation = urlCitation;
            }

            @JsonProperty("type")
            public String type() {
                return this.type;
            }

            @JsonProperty("urlcitation")
            public UrlCitation urlCitation() {
                return this.urlCitation;
            }

            @JsonInclude(Include.NONNULL)
            public static record UrlCitation(Integer endIndex, Integer startIndex, String title, String url) {
                public UrlCitation(@JsonProperty("endindex") Integer endIndex, @JsonProperty("startindex") Integer startIndex, @JsonProperty("title") String title, @JsonProperty("url") String url) {
                    this.endIndex = endIndex;
                    this.startIndex = startIndex;
                    this.title = title;
                    this.url = url;
                }

                @JsonProperty("endindex")
                public Integer endIndex() {
                    return this.endIndex;
                }

                @JsonProperty("startindex")
                public Integer startIndex() {
                    return this.startIndex;
                }

                @JsonProperty("title")
                public String title() {
                    return this.title;
                }

                @JsonProperty("url")
                public String url() {
                    return this.url;
                }
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ChatCompletion(String id, List<Choice> choices, Long created, String model, String serviceTier, String systemFingerprint, String object, Usage usage) {
        public ChatCompletion(@JsonProperty("id") String id, @JsonProperty("choices") List<Choice> choices, @JsonProperty("created") Long created, @JsonProperty("model") String model, @JsonProperty("servicetier") String serviceTier, @JsonProperty("systemfingerprint") String systemFingerprint, @JsonProperty("object") String object, @JsonProperty("usage") Usage usage) {
            this.id = id;
            this.choices = choices;
            this.created = created;
            this.model = model;
            this.serviceTier = serviceTier;
            this.systemFingerprint = systemFingerprint;
            this.object = object;
            this.usage = usage;
        }

        @JsonProperty("id")
        public String id() {
            return this.id;
        }

        @JsonProperty("choices")
        public List<Choice> choices() {
            return this.choices;
        }

        @JsonProperty("created")
        public Long created() {
            return this.created;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("servicetier")
        public String serviceTier() {
            return this.serviceTier;
        }

        @JsonProperty("systemfingerprint")
        public String systemFingerprint() {
            return this.systemFingerprint;
        }

        @JsonProperty("object")
        public String object() {
            return this.object;
        }

        @JsonProperty("usage")
        public Usage usage() {
            return this.usage;
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record Choice(ChatCompletionFinishReason finishReason, Integer index, ChatCompletionMessage message, LogProbs logprobs) {
            public Choice(@JsonProperty("finishreason") ChatCompletionFinishReason finishReason, @JsonProperty("index") Integer index, @JsonProperty("message") ChatCompletionMessage message, @JsonProperty("logprobs") LogProbs logprobs) {
                this.finishReason = finishReason;
                this.index = index;
                this.message = message;
                this.logprobs = logprobs;
            }

            @JsonProperty("finishreason")
            public ChatCompletionFinishReason finishReason() {
                return this.finishReason;
            }

            @JsonProperty("index")
            public Integer index() {
                return this.index;
            }

            @JsonProperty("message")
            public ChatCompletionMessage message() {
                return this.message;
            }

            @JsonProperty("logprobs")
            public LogProbs logprobs() {
                return this.logprobs;
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record LogProbs(List<Content> content, List<Content> refusal) {
        public LogProbs(@JsonProperty("content") List<Content> content, @JsonProperty("refusal") List<Content> refusal) {
            this.content = content;
            this.refusal = refusal;
        }

        @JsonProperty("content")
        public List<Content> content() {
            return this.content;
        }

        @JsonProperty("refusal")
        public List<Content> refusal() {
            return this.refusal;
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record Content(String token, Float logprob, List<Integer> probBytes, List<TopLogProbs> topLogprobs) {
            public Content(@JsonProperty("token") String token, @JsonProperty("logprob") Float logprob, @JsonProperty("bytes") List<Integer> probBytes, @JsonProperty("toplogprobs") List<TopLogProbs> topLogprobs) {
                this.token = token;
                this.logprob = logprob;
                this.probBytes = probBytes;
                this.topLogprobs = topLogprobs;
            }

            @JsonProperty("token")
            public String token() {
                return this.token;
            }

            @JsonProperty("logprob")
            public Float logprob() {
                return this.logprob;
            }

            @JsonProperty("bytes")
            public List<Integer> probBytes() {
                return this.probBytes;
            }

            @JsonProperty("toplogprobs")
            public List<TopLogProbs> topLogprobs() {
                return this.topLogprobs;
            }

            @JsonInclude(Include.NONNULL)
            @JsonIgnoreProperties(
                ignoreUnknown = true
            )
            public static record TopLogProbs(String token, Float logprob, List<Integer> probBytes) {
                public TopLogProbs(@JsonProperty("token") String token, @JsonProperty("logprob") Float logprob, @JsonProperty("bytes") List<Integer> probBytes) {
                    this.token = token;
                    this.logprob = logprob;
                    this.probBytes = probBytes;
                }

                @JsonProperty("token")
                public String token() {
                    return this.token;
                }

                @JsonProperty("logprob")
                public Float logprob() {
                    return this.logprob;
                }

                @JsonProperty("bytes")
                public List<Integer> probBytes() {
                    return this.probBytes;
                }
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Usage(Integer completionTokens, Integer promptTokens, Integer totalTokens, PromptTokensDetails promptTokensDetails, CompletionTokenDetails completionTokenDetails) {
        public Usage(Integer completionTokens, Integer promptTokens, Integer totalTokens) {
            this(completionTokens, promptTokens, totalTokens, (PromptTokensDetails)null, (CompletionTokenDetails)null);
        }

        public Usage(@JsonProperty("completiontokens") Integer completionTokens, @JsonProperty("prompttokens") Integer promptTokens, @JsonProperty("totaltokens") Integer totalTokens, @JsonProperty("prompttokensdetails") PromptTokensDetails promptTokensDetails, @JsonProperty("completiontokensdetails") CompletionTokenDetails completionTokenDetails) {
            this.completionTokens = completionTokens;
            this.promptTokens = promptTokens;
            this.totalTokens = totalTokens;
            this.promptTokensDetails = promptTokensDetails;
            this.completionTokenDetails = completionTokenDetails;
        }

        @JsonProperty("completiontokens")
        public Integer completionTokens() {
            return this.completionTokens;
        }

        @JsonProperty("prompttokens")
        public Integer promptTokens() {
            return this.promptTokens;
        }

        @JsonProperty("totaltokens")
        public Integer totalTokens() {
            return this.totalTokens;
        }

        @JsonProperty("prompttokensdetails")
        public PromptTokensDetails promptTokensDetails() {
            return this.promptTokensDetails;
        }

        @JsonProperty("completiontokensdetails")
        public CompletionTokenDetails completionTokenDetails() {
            return this.completionTokenDetails;
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record PromptTokensDetails(Integer audioTokens, Integer cachedTokens) {
            public PromptTokensDetails(@JsonProperty("audiotokens") Integer audioTokens, @JsonProperty("cachedtokens") Integer cachedTokens) {
                this.audioTokens = audioTokens;
                this.cachedTokens = cachedTokens;
            }

            @JsonProperty("audiotokens")
            public Integer audioTokens() {
                return this.audioTokens;
            }

            @JsonProperty("cachedtokens")
            public Integer cachedTokens() {
                return this.cachedTokens;
            }
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record CompletionTokenDetails(Integer reasoningTokens, Integer acceptedPredictionTokens, Integer audioTokens, Integer rejectedPredictionTokens) {
            public CompletionTokenDetails(@JsonProperty("reasoningtokens") Integer reasoningTokens, @JsonProperty("acceptedpredictiontokens") Integer acceptedPredictionTokens, @JsonProperty("audiotokens") Integer audioTokens, @JsonProperty("rejectedpredictiontokens") Integer rejectedPredictionTokens) {
                this.reasoningTokens = reasoningTokens;
                this.acceptedPredictionTokens = acceptedPredictionTokens;
                this.audioTokens = audioTokens;
                this.rejectedPredictionTokens = rejectedPredictionTokens;
            }

            @JsonProperty("reasoningtokens")
            public Integer reasoningTokens() {
                return this.reasoningTokens;
            }

            @JsonProperty("acceptedpredictiontokens")
            public Integer acceptedPredictionTokens() {
                return this.acceptedPredictionTokens;
            }

            @JsonProperty("audiotokens")
            public Integer audioTokens() {
                return this.audioTokens;
            }

            @JsonProperty("rejectedpredictiontokens")
            public Integer rejectedPredictionTokens() {
                return this.rejectedPredictionTokens;
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ChatCompletionChunk(String id, List<ChunkChoice> choices, Long created, String model, String serviceTier, String systemFingerprint, String object, Usage usage) {
        public ChatCompletionChunk(@JsonProperty("id") String id, @JsonProperty("choices") List<ChunkChoice> choices, @JsonProperty("created") Long created, @JsonProperty("model") String model, @JsonProperty("servicetier") String serviceTier, @JsonProperty("systemfingerprint") String systemFingerprint, @JsonProperty("object") String object, @JsonProperty("usage") Usage usage) {
            this.id = id;
            this.choices = choices;
            this.created = created;
            this.model = model;
            this.serviceTier = serviceTier;
            this.systemFingerprint = systemFingerprint;
            this.object = object;
            this.usage = usage;
        }

        @JsonProperty("id")
        public String id() {
            return this.id;
        }

        @JsonProperty("choices")
        public List<ChunkChoice> choices() {
            return this.choices;
        }

        @JsonProperty("created")
        public Long created() {
            return this.created;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("servicetier")
        public String serviceTier() {
            return this.serviceTier;
        }

        @JsonProperty("systemfingerprint")
        public String systemFingerprint() {
            return this.systemFingerprint;
        }

        @JsonProperty("object")
        public String object() {
            return this.object;
        }

        @JsonProperty("usage")
        public Usage usage() {
            return this.usage;
        }

        @JsonInclude(Include.NONNULL)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record ChunkChoice(ChatCompletionFinishReason finishReason, Integer index, ChatCompletionMessage delta, LogProbs logprobs) {
            public ChunkChoice(@JsonProperty("finishreason") ChatCompletionFinishReason finishReason, @JsonProperty("index") Integer index, @JsonProperty("delta") ChatCompletionMessage delta, @JsonProperty("logprobs") LogProbs logprobs) {
                this.finishReason = finishReason;
                this.index = index;
                this.delta = delta;
                this.logprobs = logprobs;
            }

            @JsonProperty("finishreason")
            public ChatCompletionFinishReason finishReason() {
                return this.finishReason;
            }

            @JsonProperty("index")
            public Integer index() {
                return this.index;
            }

            @JsonProperty("delta")
            public ChatCompletionMessage delta() {
                return this.delta;
            }

            @JsonProperty("logprobs")
            public LogProbs logprobs() {
                return this.logprobs;
            }
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Embedding(Integer index, float[] embedding, String object) {
        public Embedding(Integer index, float[] embedding) {
            this(index, embedding, "embedding");
        }

        public Embedding(@JsonProperty("index") Integer index, @JsonProperty("embedding") float[] embedding, @JsonProperty("object") String object) {
            this.index = index;
            this.embedding = embedding;
            this.object = object;
        }

        @JsonProperty("index")
        public Integer index() {
            return this.index;
        }

        @JsonProperty("embedding")
        public float[] embedding() {
            return this.embedding;
        }

        @JsonProperty("object")
        public String object() {
            return this.object;
        }
    }

    @JsonInclude(Include.NONNULL)
    public static record EmbeddingRequest<T>(T input, String model, String encodingFormat, Integer dimensions, String user) {
        public EmbeddingRequest(T input, String model) {
            this(input, model, "float", (Integer)null, (String)null);
        }

        public EmbeddingRequest(T input) {
            this(input, OpenAiApi.DEFAULTEMBEDDINGMODEL);
        }

        public EmbeddingRequest(@JsonProperty("input") T input, @JsonProperty("model") String model, @JsonProperty("encodingformat") String encodingFormat, @JsonProperty("dimensions") Integer dimensions, @JsonProperty("user") String user) {
            this.input = input;
            this.model = model;
            this.encodingFormat = encodingFormat;
            this.dimensions = dimensions;
            this.user = user;
        }

        @JsonProperty("input")
        public T input() {
            return this.input;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("encodingformat")
        public String encodingFormat() {
            return this.encodingFormat;
        }

        @JsonProperty("dimensions")
        public Integer dimensions() {
            return this.dimensions;
        }

        @JsonProperty("user")
        public String user() {
            return this.user;
        }
    }

    @JsonInclude(Include.NONNULL)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record EmbeddingList<T>(String object, List<T> data, String model, Usage usage) {
        public EmbeddingList(@JsonProperty("object") String object, @JsonProperty("data") List<T> data, @JsonProperty("model") String model, @JsonProperty("usage") Usage usage) {
            this.object = object;
            this.data = data;
            this.model = model;
            this.usage = usage;
        }

        @JsonProperty("object")
        public String object() {
            return this.object;
        }

        @JsonProperty("data")
        public List<T> data() {
            return this.data;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("usage")
        public Usage usage() {
            return this.usage;
        }
    }

    public static class Builder {
        private String baseUrl = "https://api.openai.com";
        private ApiKey apiKey;
        private MultiValueMap<String, String> headers = new LinkedMultiValueMap();
        private String completionsPath = "/v1/chat/completions";
        private String embeddingsPath = "/v1/embeddings";
        private RestClient.Builder restClientBuilder = RestClient.builder();
        private WebClient.Builder webClientBuilder = WebClient.builder();
        private ResponseErrorHandler responseErrorHandler;

        public Builder() {
            this.responseErrorHandler = RetryUtils.DEFAULTRESPONSEERRORHANDLER;
        }

        public Builder(OpenAiApi api) {
            this.responseErrorHandler = RetryUtils.DEFAULTRESPONSEERRORHANDLER;
            this.baseUrl = api.getBaseUrl();
            this.apiKey = api.getApiKey();
            this.headers = new LinkedMultiValueMap(api.getHeaders());
            this.completionsPath = api.getCompletionsPath();
            this.embeddingsPath = api.getEmbeddingsPath();
            this.restClientBuilder = api.restClient != null ? api.restClient.mutate() : RestClient.builder();
            this.webClientBuilder = api.webClient != null ? api.webClient.mutate() : WebClient.builder();
            this.responseErrorHandler = api.getResponseErrorHandler();
        }

        public Builder baseUrl(String baseUrl) {
            Assert.hasText(baseUrl, "baseUrl cannot be null or empty");
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder apiKey(ApiKey apiKey) {
            Assert.notNull(apiKey, "apiKey cannot be null");
            this.apiKey = apiKey;
            return this;
        }

        public Builder apiKey(String simpleApiKey) {
            Assert.notNull(simpleApiKey, "simpleApiKey cannot be null");
            this.apiKey = new SimpleApiKey(simpleApiKey);
            return this;
        }

        public Builder headers(MultiValueMap<String, String> headers) {
            Assert.notNull(headers, "headers cannot be null");
            this.headers = headers;
            return this;
        }

        public Builder completionsPath(String completionsPath) {
            Assert.hasText(completionsPath, "completionsPath cannot be null or empty");
            this.completionsPath = completionsPath;
            return this;
        }

        public Builder embeddingsPath(String embeddingsPath) {
            Assert.hasText(embeddingsPath, "embeddingsPath cannot be null or empty");
            this.embeddingsPath = embeddingsPath;
            return this;
        }

        public Builder restClientBuilder(RestClient.Builder restClientBuilder) {
            Assert.notNull(restClientBuilder, "restClientBuilder cannot be null");
            this.restClientBuilder = restClientBuilder;
            return this;
        }

        public Builder webClientBuilder(WebClient.Builder webClientBuilder) {
            Assert.notNull(webClientBuilder, "webClientBuilder cannot be null");
            this.webClientBuilder = webClientBuilder;
            return this;
        }

        public Builder responseErrorHandler(ResponseErrorHandler responseErrorHandler) {
            Assert.notNull(responseErrorHandler, "responseErrorHandler cannot be null");
            this.responseErrorHandler = responseErrorHandler;
            return this;
        }

        public OpenAiApi build() {
            Assert.notNull(this.apiKey, "apiKey must be set");
            return new OpenAiApi(this.baseUrl, this.apiKey, this.headers, this.completionsPath, this.embeddingsPath, this.restClientBuilder, this.webClientBuilder, this.responseErrorHandler);
        }
    }
}
```
