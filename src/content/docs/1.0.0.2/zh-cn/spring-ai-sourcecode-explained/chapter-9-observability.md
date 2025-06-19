---
title: 第九章：观测篇
keywords: [Spring AI, Spring AI Alibaba, 源码解读]
description: "基于 Spring 生态系统中的可观察性功能构建，提供对 AI 相关工作的监控能力，包括：ChatClient、Advisor、ChatModel、EmbeddingModel、Tool、VectorStore 等"
---

- 作者：影子, Spring AI Alibaba Committer
- 本文档基于 Spring AI 1.0.0 版本，Spring AI Alibaba 1.0.0.2 版本
- 本章是观测篇的快速上手 + 源码解读

## 观测篇 - 快速上手

> 为其核心组件提供指标和跟踪功能，包括：ChtClient、Advisor、ChatModel、EmbeddingModel、Tool、VectorStore 等

以下实现了自定义的 ChtClient、ChatModel、Tool、EmbeddingModel 的观测处理器

实战代码可见：[https://github.com/GTyingzi/spring-ai-tutorial](https://github.com/GTyingzi/spring-ai-tutorial) 下的 Observability 模块



### pom.xml

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

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-tool</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-vector-store</artifactId>
    </dependency>

</dependencies>
```

### application.yml

```yaml
server:
  port: 8080

spring:
  application:
    name: observability

  ai:
    openai:
      api-key: ${DASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
      embedding:
        options:
          model: text-embedding-v1
```

### config

自定义提供 ObservationRegistry 的 Bean，加载自定义的 ChatClient、ChatModel、Tool、EmbeddingModel 的观测处理器

```java
package com.spring.ai.tutorial.observability.config;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.chat.client.observation.ChatClientObservationContext;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.observation.ChatModelObservationContext;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.observation.EmbeddingModelObservationContext;
import org.springframework.ai.observation.AiOperationMetadata;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.observation.ToolCallingObservationContext;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;

@Configuration
public class ObservationConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(ObservationConfiguration.class);

    @Bean
    @ConditionalOnMissingBean(name = "observationRegistry")
    public ObservationRegistry observationRegistry(
            ObjectProvider<ObservationHandler<?>> observationHandlerObjectProvider) {
        ObservationRegistry observationRegistry = ObservationRegistry.create();
        ObservationRegistry.ObservationConfig observationConfig = observationRegistry.observationConfig();
        observationHandlerObjectProvider.orderedStream().forEach(handler -> {
            Type[] genericInterfaces = handler.getClass().getGenericInterfaces();
            for (Type type : genericInterfaces) {
                if (type instanceof ParameterizedType parameterizedType
                        && parameterizedType.getRawType() instanceof Class<?> clazz
                        && ObservationHandler.class.isAssignableFrom(clazz)) {

                    Type actualTypeArgument = parameterizedType.getActualTypeArguments()[0];
                    logger.info("load observation handler, supports context type: {}", actualTypeArgument);
                }
            }

            // 将handler添加到observationRegistry中
            observationConfig.observationHandler(handler);
        });
        return observationRegistry;
    }

    /**
     * 监听chat client调用
     */
    @Bean
    ObservationHandler<ChatClientObservationContext> chatClientObservationContextObservationHandler() {
        logger.info("ChatClientObservation start");
        return new ObservationHandler<>() {

            @Override
            public boolean supportsContext(Observation.Context context) {
                return context instanceof ChatClientObservationContext;
            }

            @Override
            public void onStart(ChatClientObservationContext context) {
                ChatClientRequest request = context.getRequest();
                List<? extends Advisor> advisors = context.getAdvisors();
                boolean stream = context.isStream();
                logger.info("💬ChatClientObservation start: ChatClientRequest : {}, Advisors : {}, stream : {}",
                        request, advisors, stream);
            }

            @Override
            public void onStop(ChatClientObservationContext context) {
                ObservationHandler.super.onStop(context);
            }
        };
    }

    /**
     * 监听chat model调用
     */
    @Bean
    ObservationHandler<ChatModelObservationContext> chatModelObservationContextObservationHandler() {
        logger.info("ChatModelObservation start");
        return new ObservationHandler<>() {

            @Override
            public boolean supportsContext(Observation.Context context) {
                return context instanceof ChatModelObservationContext;
            }

            @Override
            public void onStart(ChatModelObservationContext context) {
                AiOperationMetadata operationMetadata = context.getOperationMetadata();
                Prompt request = context.getRequest();
                logger.info("🤖ChatModelObservation start: AiOperationMetadata : {}",
                        operationMetadata);
                logger.info("🤖ChatModelObservation start: Prompt : {}",
                        request);
            }

            @Override
            public void onStop(ChatModelObservationContext context) {
                ChatResponse response = context.getResponse();
                logger.info("🤖ChatModelObservation start: ChatResponse : {}",
                        response);
            }
        };
    }

    /**
     * 监听工具调用
     */
    @Bean
    public ObservationHandler<ToolCallingObservationContext> toolCallingObservationContextObservationHandler() {
        logger.info("ToolCallingObservation start");
        return new ObservationHandler<>() {
            @Override
            public boolean supportsContext(Observation.Context context) {
                return context instanceof ToolCallingObservationContext;
            }

            @Override
            public void onStart(ToolCallingObservationContext context) {
                ToolDefinition toolDefinition = context.getToolDefinition();
                logger.info("🔨ToolCalling start: {} - {}", toolDefinition.name(), context.getToolCallArguments());
            }

            @Override
            public void onStop(ToolCallingObservationContext context) {
                ToolDefinition toolDefinition = context.getToolDefinition();
                logger.info("✅ToolCalling done: {} - {}", toolDefinition.name(), context.getToolCallResult());
            }
        };
    }

    /**
     * 监听embedding model调用
     */
    @Bean
    public ObservationHandler<EmbeddingModelObservationContext> embeddingModelObservationContextObservationHandler() {
        logger.info("EmbeddingModelObservation start");
        return new ObservationHandler<>() {
            @Override
            public boolean supportsContext(Observation.Context context) {
                return context instanceof EmbeddingModelObservationContext;
            }

            @Override
            public void onStart(EmbeddingModelObservationContext context) {
                logger.info("📚EmbeddingModelObservation start: {} - {}", context.getOperationMetadata().operationType(),
                        context.getOperationMetadata().provider());
            }
        };
    }


}
```

### controller

#### ChatController

```java
package com.spring.ai.tutorial.observability.controller;

import com.spring.ai.tutorial.observability.tools.TimeTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder
                .build();
    }

    @GetMapping("/call")
    public String call(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？")String query) {
        return chatClient.prompt(query).call().content();
    }

    /**
     * 调用工具版 - method
     */
    @GetMapping("/call/tool-method")
    public String callToolMethod(@RequestParam(value = "query", defaultValue = "请告诉我现在北京时间几点了") String query) {
        return chatClient.prompt(query).tools(new TimeTools()).call().content();
    }
}
```

#### VectorSimpleController

```java
package com.spring.ai.tutorial.observability.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/vector/simple")
public class VectorSimpleController {
    private static final Logger logger = LoggerFactory.getLogger(VectorSimpleController.class);

    private final SimpleVectorStore simpleVectorStore;

    public VectorSimpleController(EmbeddingModel embeddingModel) {
        this.simpleVectorStore = SimpleVectorStore
                .builder(embeddingModel).build();
    }

    @GetMapping("/add")
    public void add() {
        logger.info("start add data");

        HashMap<String, Object> map = new HashMap<>();
        map.put("year", 2025);
        map.put("name", "yingzi");
        List<Document> documents = List.of(
                new Document("The World is Big and Salvation Lurks Around the Corner"),
                new Document("You walk forward facing the past and you turn back toward the future.", Map.of("year", 2024)),
                new Document("Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!! Spring AI rocks!!", map),
                new Document("1", "test content", map));
        simpleVectorStore.add(documents);
    }

    @GetMapping("/search")
    public List<Document> search() {
        logger.info("start search data");
        return simpleVectorStore.similaritySearch(SearchRequest
                .builder()
                .query("Spring")
                .topK(2)
                .build());
    }

}
```

#### 效果

项目初始化阶段加载对应的观测处理器
![](/img/user/ai/spring-ai-explained-sourcecode/LLr8bbI5FozdDwxJ2KXcfNKNnK9.png)

简单调用/chat/call 接口，发现触发了 ChatClient、ChatModel 两个观测器
![](/img/user/ai/spring-ai-explained-sourcecode/RUJhb5LCAoSREVxOwRacjWjKnld.png)

再调用下/chat/call/tool-method 接口触发工具，可见观测到了工具的入参、工具返回结果
![](/img/user/ai/spring-ai-explained-sourcecode/MrtZbJjnoo9b73xuLoSceQmNnjb.png)

再观测下嵌入模型
![](/img/user/ai/spring-ai-explained-sourcecode/XhBHbSvfgoQvaJxjQZ6ckjW4ntd.png)

## 观测源码篇

> 观测的实现机制：通过实现 ObservationHandler<?>，提供对应的观测，再将ObservationHandler<?>注入 ObservationRegistry 中，就能实现了监听
![](/img/user/ai/spring-ai-explained-sourcecode/观测篇.png)

### ObservationConvention

```java
package io.micrometer.observation;

import io.micrometer.common.KeyValues;
import io.micrometer.common.lang.Nullable;

public interface ObservationConvention<T extends Observation.Context> extends KeyValuesConvention {
    ObservationConvention<Observation.Context> EMPTY = (context) -> false;

    default KeyValues getLowCardinalityKeyValues(T context) {
        return KeyValues.empty();
    }

    default KeyValues getHighCardinalityKeyValues(T context) {
        return KeyValues.empty();
    }

    boolean supportsContext(Observation.Context var1);

    @Nullable
    default String getName() {
        return null;
    }

    @Nullable
    default String getContextualName(T context) {
        return null;
    }
}
```

### ChatModel 下的观测

#### pom.xml 文件

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-autoconfigure-model-chat-observation</artifactId>
</dependency>

<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-model</artifactId>
</dependency>
```

#### ChatObservationProperties

聊天模型观测功能的配置属性类

- `boolean logCompletion`：记录聊天模型的完成内容
- `boolean logPrompt`：记录聊天模型的提示内容
- `boolean includeErrorLogging`：记录聊天模型交互中的错误信息

```java
package org.springframework.ai.model.chat.observation.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.chat.observations")
public class ChatObservationProperties {
    public static final String CONFIGPREFIX = "spring.ai.chat.observations";
    private boolean logCompletion = false;
    private boolean logPrompt = false;
    private boolean includeErrorLogging = false;

    public boolean isLogCompletion() {
        return this.logCompletion;
    }

    public void setLogCompletion(boolean logCompletion) {
        this.logCompletion = logCompletion;
    }

    public boolean isLogPrompt() {
        return this.logPrompt;
    }

    public void setLogPrompt(boolean logPrompt) {
        this.logPrompt = logPrompt;
    }

    public boolean isIncludeErrorLogging() {
        return this.includeErrorLogging;
    }

    public void setIncludeErrorLogging(boolean includeErrorLogging) {
        this.includeErrorLogging = includeErrorLogging;
    }
}
```

#### ChatObservationAutoConfiguration

自动装配和聊天模型的观测处理器，如日志、错误处理、指标等

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td><br/></td><td>chatModelMeterObservationHandler<br/></td><td>对外提供ChatModelMeterObservationHandler的Bean，用于收集聊天模型的指标数据，用于监控和分析<br/></td></tr>
<tr>
<td rowspan="2">TracerPresentObservationConfiguration（Tracer类存在）<br/><br/></td><td>chatModelPromptContentObservationHandler<br/></td><td>条件：配置 log-prompt=true 或 log-completion=true<br/>提供的Bean：TracingAwareLoggingObservationHandler<br/>作用：记录聊天模型的提示内容或完成内容，并与追踪系统集成<br/></td></tr>
<tr>
<td>errorLoggingObservationHandler<br/></td><td>条件：配置 include-error-logging=true<br/>提供的Bean：ErrorLoggingObservationHandler<br/>作用：记录聊天模型交互中的错误信息<br/></td></tr>
<tr>
<td rowspan="2">TracerNotPresentObservationConfiguration（Tracer类不存在）<br/></td><td>chatModelPromptContentObservationHandler<br/></td><td>条件：配置 log-prompt=true <br/>提供的Bean：ChatModelPromptContentObservationHandler<br/>作用：记录聊天模型的提示内容<br/></td></tr>
<tr>
<td>chatModelCompletionObservationHandler<br/></td><td>条件：配置 log-completion=true <br/>提供的Bean：ChatModelCompletionObservationHandler<br/>作用：记录聊天模型的完成内容<br/></td></tr>
</table>


```java
package org.springframework.ai.model.chat.observation.autoconfigure;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.tracing.Tracer;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.observation.AdvisorObservationContext;
import org.springframework.ai.chat.client.observation.ChatClientObservationContext;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.observation.ChatModelCompletionObservationHandler;
import org.springframework.ai.chat.observation.ChatModelMeterObservationHandler;
import org.springframework.ai.chat.observation.ChatModelObservationContext;
import org.springframework.ai.chat.observation.ChatModelPromptContentObservationHandler;
import org.springframework.ai.embedding.observation.EmbeddingModelObservationContext;
import org.springframework.ai.image.observation.ImageModelObservationContext;
import org.springframework.ai.model.observation.ErrorLoggingObservationHandler;
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

@AutoConfiguration(
    afterName = {"org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration"}
)
@ConditionalOnClass({ChatModel.class})
@EnableConfigurationProperties({ChatObservationProperties.class})
public class ChatObservationAutoConfiguration {
    private static final Logger logger = LoggerFactory.getLogger(ChatObservationAutoConfiguration.class);

    private static void logPromptContentWarning() {
        logger.warn("You have enabled logging out the prompt content with the risk of exposing sensitive or private information. Please, be careful!");
    }

    private static void logCompletionWarning() {
        logger.warn("You have enabled logging out the completion content with the risk of exposing sensitive or private information. Please, be careful!");
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean({MeterRegistry.class})
    ChatModelMeterObservationHandler chatModelMeterObservationHandler(ObjectProvider<MeterRegistry> meterRegistry) {
        return new ChatModelMeterObservationHandler((MeterRegistry)meterRegistry.getObject());
    }

    @Configuration(
        proxyBeanMethods = false
    )
    @ConditionalOnClass({Tracer.class})
    @ConditionalOnBean({Tracer.class})
    static class TracerPresentObservationConfiguration {
        @Bean
        @ConditionalOnMissingBean(
            value = {ChatModelPromptContentObservationHandler.class},
            name = {"chatModelPromptContentObservationHandler"}
        )
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.observations",
            name = {"log-prompt"},
            havingValue = "true"
        )
        TracingAwareLoggingObservationHandler<ChatModelObservationContext> chatModelPromptContentObservationHandler(Tracer tracer) {
            ChatObservationAutoConfiguration.logPromptContentWarning();
            return new TracingAwareLoggingObservationHandler(new ChatModelPromptContentObservationHandler(), tracer);
        }

        @Bean
        @ConditionalOnMissingBean(
            value = {ChatModelCompletionObservationHandler.class},
            name = {"chatModelCompletionObservationHandler"}
        )
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.observations",
            name = {"log-completion"},
            havingValue = "true"
        )
        TracingAwareLoggingObservationHandler<ChatModelObservationContext> chatModelCompletionObservationHandler(Tracer tracer) {
            ChatObservationAutoConfiguration.logCompletionWarning();
            return new TracingAwareLoggingObservationHandler(new ChatModelCompletionObservationHandler(), tracer);
        }

        @Bean
        @ConditionalOnMissingBean
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.observations",
            name = {"include-error-logging"},
            havingValue = "true"
        )
        ErrorLoggingObservationHandler errorLoggingObservationHandler(Tracer tracer) {
            return new ErrorLoggingObservationHandler(tracer, List.of(EmbeddingModelObservationContext.class, ImageModelObservationContext.class, ChatModelObservationContext.class, ChatClientObservationContext.class, AdvisorObservationContext.class));
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
            prefix = "spring.ai.chat.observations",
            name = {"log-prompt"},
            havingValue = "true"
        )
        ChatModelPromptContentObservationHandler chatModelPromptContentObservationHandler() {
            ChatObservationAutoConfiguration.logPromptContentWarning();
            return new ChatModelPromptContentObservationHandler();
        }

        @Bean
        @ConditionalOnMissingBean
        @ConditionalOnProperty(
            prefix = "spring.ai.chat.observations",
            name = {"log-completion"},
            havingValue = "true"
        )
        ChatModelCompletionObservationHandler chatModelCompletionObservationHandler() {
            ChatObservationAutoConfiguration.logCompletionWarning();
            return new ChatModelCompletionObservationHandler();
        }
    }
}
```

##### ChatModelPromptContentObservationHandler

ChatModel 的模型请求 Prompt 的观测处理器

```java
package org.springframework.ai.chat.observation;

import java.util.List;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.content.Content;
import org.springframework.ai.observation.ObservabilityHelper;
import org.springframework.util.CollectionUtils;

public class ChatModelPromptContentObservationHandler implements ObservationHandler<ChatModelObservationContext> {

    private static final Logger logger = LoggerFactory.getLogger(ChatModelPromptContentObservationHandler.class);

    @Override
    public void onStop(ChatModelObservationContext context) {
       logger.info("Chat Model Prompt Content:\n{}", ObservabilityHelper.concatenateStrings(prompt(context)));
    }

    private List<String> prompt(ChatModelObservationContext context) {
       if (CollectionUtils.isEmpty(context.getRequest().getInstructions())) {
          return List.of();
       }

       return context.getRequest().getInstructions().stream().map(Content::getText).toList();
    }

    @Override
    public boolean supportsContext(Observation.Context context) {
       return context instanceof ChatModelObservationContext;
    }

}
```

##### ChatModelCompletionObservationHandler

ChatModel 的模型响应完成的观测处理器

```java
package org.springframework.ai.chat.observation;

import java.util.List;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.observation.ObservabilityHelper;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

public class ChatModelCompletionObservationHandler implements ObservationHandler<ChatModelObservationContext> {

    private static final Logger logger = LoggerFactory.getLogger(ChatModelCompletionObservationHandler.class);

    @Override
    public void onStop(ChatModelObservationContext context) {
       logger.info("Chat Model Completion:\n{}", ObservabilityHelper.concatenateStrings(completion(context)));
    }

    private List<String> completion(ChatModelObservationContext context) {
       if (context.getResponse() == null || context.getResponse().getResults() == null
             || CollectionUtils.isEmpty(context.getResponse().getResults())) {
          return List.of();
       }

       if (!StringUtils.hasText(context.getResponse().getResult().getOutput().getText())) {
          return List.of();
       }

       return context.getResponse()
          .getResults()
          .stream()
          .filter(generation -> generation.getOutput() != null
                && StringUtils.hasText(generation.getOutput().getText()))
          .map(generation -> generation.getOutput().getText())
          .toList();
    }

    @Override
    public boolean supportsContext(Observation.Context context) {
       return context instanceof ChatModelObservationContext;
    }

}
```

#### ModelObservationContext

封装 AI 模型交互过程的类

- `REQ request`：泛型，AI 模型的请求对象
- `RES response`：泛型，AI 模型的返回对象
- `AiOperationMetadata operationMetadata`：操作的元数据，包括操作类型和提供者信息

```java
package org.springframework.ai.model.observation;

import io.micrometer.observation.Observation;

import org.springframework.ai.observation.AiOperationMetadata;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;


public class ModelObservationContext<REQ, RES> extends Observation.Context {

    private final REQ request;

    private final AiOperationMetadata operationMetadata;

    @Nullable
    private RES response;

    public ModelObservationContext(REQ request, AiOperationMetadata operationMetadata) {
       Assert.notNull(request, "request cannot be null");
       Assert.notNull(operationMetadata, "operationMetadata cannot be null");
       this.request = request;
       this.operationMetadata = operationMetadata;
    }

    public REQ getRequest() {
       return this.request;
    }

    public AiOperationMetadata getOperationMetadata() {
       return this.operationMetadata;
    }

    @Nullable
    public RES getResponse() {
       return this.response;
    }

    public void setResponse(RES response) {
       Assert.notNull(response, "response cannot be null");
       this.response = response;
    }

}
```

##### ChatModelObservationContext

会话模型观测功能的上下文类

```java
package org.springframework.ai.chat.observation;

import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.observation.ModelObservationContext;
import org.springframework.ai.observation.AiOperationMetadata;
import org.springframework.ai.observation.conventions.AiOperationType;

public class ChatModelObservationContext extends ModelObservationContext<Prompt, ChatResponse> {

    ChatModelObservationContext(Prompt prompt, String provider) {
       super(prompt,
             AiOperationMetadata.builder().operationType(AiOperationType.CHAT.value()).provider(provider).build());
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private Prompt prompt;

       private String provider;

       private Builder() {
       }

       public Builder prompt(Prompt prompt) {
          this.prompt = prompt;
          return this;
       }

       public Builder provider(String provider) {
          this.provider = provider;
          return this;
       }

       public ChatModelObservationContext build() {
          return new ChatModelObservationContext(this.prompt, this.provider);
       }

    }

}
```

#### ModelUsageMetricsGenerator

```java
package org.springframework.ai.model.observation;

import java.util.ArrayList;
import java.util.List;

import io.micrometer.common.KeyValue;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.observation.Observation;

import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.observation.conventions.AiObservationMetricAttributes;
import org.springframework.ai.observation.conventions.AiObservationMetricNames;
import org.springframework.ai.observation.conventions.AiTokenType;

public final class ModelUsageMetricsGenerator {

    private static final String DESCRIPTION = "Measures number of input and output tokens used";

    private ModelUsageMetricsGenerator() {
    }

    public static void generate(Usage usage, Observation.Context context, MeterRegistry meterRegistry) {

       if (usage.getPromptTokens() != null) {
          Counter.builder(AiObservationMetricNames.TOKENUSAGE.value())
             .tag(AiObservationMetricAttributes.TOKENTYPE.value(), AiTokenType.INPUT.value())
             .description(DESCRIPTION)
             .tags(createTags(context))
             .register(meterRegistry)
             .increment(usage.getPromptTokens());
       }

       if (usage.getCompletionTokens() != null) {
          Counter.builder(AiObservationMetricNames.TOKENUSAGE.value())
             .tag(AiObservationMetricAttributes.TOKENTYPE.value(), AiTokenType.OUTPUT.value())
             .description(DESCRIPTION)
             .tags(createTags(context))
             .register(meterRegistry)
             .increment(usage.getCompletionTokens());
       }

       if (usage.getTotalTokens() != null) {
          Counter.builder(AiObservationMetricNames.TOKENUSAGE.value())
             .tag(AiObservationMetricAttributes.TOKENTYPE.value(), AiTokenType.TOTAL.value())
             .description(DESCRIPTION)
             .tags(createTags(context))
             .register(meterRegistry)
             .increment(usage.getTotalTokens());
       }

    }

    private static List<Tag> createTags(Observation.Context context) {
       List<Tag> tags = new ArrayList<>();
       for (KeyValue keyValue : context.getLowCardinalityKeyValues()) {
          tags.add(Tag.of(keyValue.getKey(), keyValue.getValue()));
       }
       return tags;
    }

}
```

#### ChatModelObservationConvention

ChatModel 角度下的观测接口类

```java
package org.springframework.ai.chat.observation;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationConvention;


public interface ChatModelObservationConvention extends ObservationConvention<ChatModelObservationContext> {

    @Override
    default boolean supportsContext(Observation.Context context) {
       return context instanceof ChatModelObservationContext;
    }

}
```

##### DefaultChatModelObservationConvention

默认定义 ChatModel 观测约定的实现类，主要用于生成 Micrometer 观察功能所需的上下文信息和关键值

- `String DEFAULTNAME`：默认观测名称为"genai.client.operation"
- `KeyValue REQUESTMODELNONE`：请求为空的默认值
- `KeyValue RESPONSEMODELNONE`：响应模型为空的默认值

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td><br/></td><td>getContextualName<br/></td><td>操作元数据和请求选项生成上下文名称<br/></td></tr>
<tr>
<td><br/></td><td>getLowCardinalityKeyValues<br/><br/></td><td>生成低粒度的关键值，包括操作类型、提供者、请求模型和响应模型<br/></td></tr>
<tr>
<td><br/></td><td>getHighCardinalityKeyValues<br/><br/></td><td>生成高粒度的关键值，包括请求选项（如温度、工具名称）和响应信息（如令牌使用情况）<br/></td></tr>
<tr>
<td rowspan="4">低粒度关键值<br/></td><td>aiOperationType<br/></td><td>操作类型<br/></td></tr>
<tr>
<td>aiProvider<br/></td><td>模型提供者<br/></td></tr>
<tr>
<td>requestModel<br/></td><td>生成请求模型名称<br/></td></tr>
<tr>
<td>responseModel<br/></td><td>生成响应模型名称<br/></td></tr>
<tr>
<td rowspan="13">高粒度关键值<br/></td><td>requestFrequencyPenalty<br/></td><td>请求频率惩罚设置<br/></td></tr>
<tr>
<td>requestMaxTokens<br/></td><td>请求最大令牌数<br/></td></tr>
<tr>
<td>requestPresencePenalty<br/></td><td>请求存在惩罚设置<br/></td></tr>
<tr>
<td>requestStopSequences<br/></td><td>请求停止序列<br/></td></tr>
<tr>
<td>requestTemperature<br/></td><td>请求温度设置<br/></td></tr>
<tr>
<td>requestTools<br/></td><td>请求工具名称<br/></td></tr>
<tr>
<td>requestTopK<br/></td><td>请求 topk 采样设置<br/></td></tr>
<tr>
<td>requestTopP<br/></td><td>请求 topp 采样设置<br/></td></tr>
<tr>
<td>responseFinishReasons<br/></td><td>响应完成原因<br/></td></tr>
<tr>
<td>responseId<br/></td><td>响应唯一标识符<br/></td></tr>
<tr>
<td>usageInputTokens<br/></td><td>输入令牌使用量<br/></td></tr>
<tr>
<td>usageOutputTokens<br/></td><td>输出令牌使用量<br/></td></tr>
<tr>
<td>usageTotalTokens<br/></td><td>总令牌使用量<br/></td></tr>
</table>


```java
package org.springframework.ai.chat.observation;

import java.util.HashSet;
import java.util.Set;
import java.util.StringJoiner;

import io.micrometer.common.KeyValue;
import io.micrometer.common.KeyValues;

import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

public class DefaultChatModelObservationConvention implements ChatModelObservationConvention {

    public static final String DEFAULTNAME = "genai.client.operation";

    private static final KeyValue REQUESTMODELNONE = KeyValue
       .of(ChatModelObservationDocumentation.LowCardinalityKeyNames.REQUESTMODEL, KeyValue.NONEVALUE);

    private static final KeyValue RESPONSEMODELNONE = KeyValue
       .of(ChatModelObservationDocumentation.LowCardinalityKeyNames.RESPONSEMODEL, KeyValue.NONEVALUE);

    @Override
    public String getName() {
       return DEFAULTNAME;
    }

    @Override
    public String getContextualName(ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (StringUtils.hasText(options.getModel())) {
          return "%s %s".formatted(context.getOperationMetadata().operationType(), options.getModel());
       }
       return context.getOperationMetadata().operationType();
    }

    @Override
    public KeyValues getLowCardinalityKeyValues(ChatModelObservationContext context) {
       return KeyValues.of(aiOperationType(context), aiProvider(context), requestModel(context),
             responseModel(context));
    }

    protected KeyValue aiOperationType(ChatModelObservationContext context) {
       return KeyValue.of(ChatModelObservationDocumentation.LowCardinalityKeyNames.AIOPERATIONTYPE,
             context.getOperationMetadata().operationType());
    }

    protected KeyValue aiProvider(ChatModelObservationContext context) {
       return KeyValue.of(ChatModelObservationDocumentation.LowCardinalityKeyNames.AIPROVIDER,
             context.getOperationMetadata().provider());
    }

    protected KeyValue requestModel(ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (StringUtils.hasText(options.getModel())) {
          return KeyValue.of(ChatModelObservationDocumentation.LowCardinalityKeyNames.REQUESTMODEL,
                options.getModel());
       }
       return REQUESTMODELNONE;
    }

    protected KeyValue responseModel(ChatModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && StringUtils.hasText(context.getResponse().getMetadata().getModel())) {
          return KeyValue.of(ChatModelObservationDocumentation.LowCardinalityKeyNames.RESPONSEMODEL,
                context.getResponse().getMetadata().getModel());
       }
       return RESPONSEMODELNONE;
    }

    @Override
    public KeyValues getHighCardinalityKeyValues(ChatModelObservationContext context) {
       var keyValues = KeyValues.empty();
       // Request
       keyValues = requestFrequencyPenalty(keyValues, context);
       keyValues = requestMaxTokens(keyValues, context);
       keyValues = requestPresencePenalty(keyValues, context);
       keyValues = requestStopSequences(keyValues, context);
       keyValues = requestTemperature(keyValues, context);
       keyValues = requestTools(keyValues, context);
       keyValues = requestTopK(keyValues, context);
       keyValues = requestTopP(keyValues, context);
       // Response
       keyValues = responseFinishReasons(keyValues, context);
       keyValues = responseId(keyValues, context);
       keyValues = usageInputTokens(keyValues, context);
       keyValues = usageOutputTokens(keyValues, context);
       keyValues = usageTotalTokens(keyValues, context);
       return keyValues;
    }

    // Request

    protected KeyValues requestFrequencyPenalty(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getFrequencyPenalty() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTFREQUENCYPENALTY.asString(),
                String.valueOf(options.getFrequencyPenalty()));
       }
       return keyValues;
    }

    protected KeyValues requestMaxTokens(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getMaxTokens() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTMAXTOKENS.asString(),
                String.valueOf(options.getMaxTokens()));
       }
       return keyValues;
    }

    protected KeyValues requestPresencePenalty(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getPresencePenalty() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTPRESENCEPENALTY.asString(),
                String.valueOf(options.getPresencePenalty()));
       }
       return keyValues;
    }

    protected KeyValues requestStopSequences(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (!CollectionUtils.isEmpty(options.getStopSequences())) {
          StringJoiner stopSequencesJoiner = new StringJoiner(", ", "[", "]");
          options.getStopSequences().forEach(value -> stopSequencesJoiner.add("\"" + value + "\""));
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTSTOPSEQUENCES.asString(),
                stopSequencesJoiner.toString());
       }
       return keyValues;
    }

    protected KeyValues requestTemperature(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getTemperature() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTTEMPERATURE.asString(),
                String.valueOf(options.getTemperature()));
       }
       return keyValues;
    }

    protected KeyValues requestTools(KeyValues keyValues, ChatModelObservationContext context) {
       if (!(context.getRequest().getOptions() instanceof ToolCallingChatOptions options)) {
          return keyValues;
       }

       Set<String> toolNames = new HashSet<>(options.getToolNames());
       toolNames.addAll(options.getToolCallbacks().stream().map(tc -> tc.getToolDefinition().name()).toList());

       if (!CollectionUtils.isEmpty(toolNames)) {
          StringJoiner toolNamesJoiner = new StringJoiner(", ", "[", "]");
          toolNames.forEach(value -> toolNamesJoiner.add("\"" + value + "\""));
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTTOOLNAMES.asString(),
                toolNamesJoiner.toString());
       }
       return keyValues;
    }

    protected KeyValues requestTopK(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getTopK() != null) {
          return keyValues.and(ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTTOPK.asString(),
                String.valueOf(options.getTopK()));
       }
       return keyValues;
    }

    protected KeyValues requestTopP(KeyValues keyValues, ChatModelObservationContext context) {
       ChatOptions options = context.getRequest().getOptions();
       if (options.getTopP() != null) {
          return keyValues.and(ChatModelObservationDocumentation.HighCardinalityKeyNames.REQUESTTOPP.asString(),
                String.valueOf(options.getTopP()));
       }
       return keyValues;
    }

    // Response

    protected KeyValues responseFinishReasons(KeyValues keyValues, ChatModelObservationContext context) {
       if (context.getResponse() != null && !CollectionUtils.isEmpty(context.getResponse().getResults())) {
          var finishReasons = context.getResponse()
             .getResults()
             .stream()
             .filter(generation -> StringUtils.hasText(generation.getMetadata().getFinishReason()))
             .map(generation -> generation.getMetadata().getFinishReason())
             .toList();
          if (CollectionUtils.isEmpty(finishReasons)) {
             return keyValues;
          }
          StringJoiner finishReasonsJoiner = new StringJoiner(", ", "[", "]");
          finishReasons.forEach(finishReason -> finishReasonsJoiner.add("\"" + finishReason + "\""));
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.RESPONSEFINISHREASONS.asString(),
                finishReasonsJoiner.toString());
       }
       return keyValues;
    }

    protected KeyValues responseId(KeyValues keyValues, ChatModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && StringUtils.hasText(context.getResponse().getMetadata().getId())) {
          return keyValues.and(ChatModelObservationDocumentation.HighCardinalityKeyNames.RESPONSEID.asString(),
                context.getResponse().getMetadata().getId());
       }
       return keyValues;
    }

    protected KeyValues usageInputTokens(KeyValues keyValues, ChatModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null
             && context.getResponse().getMetadata().getUsage().getPromptTokens() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.USAGEINPUTTOKENS.asString(),
                String.valueOf(context.getResponse().getMetadata().getUsage().getPromptTokens()));
       }
       return keyValues;
    }

    protected KeyValues usageOutputTokens(KeyValues keyValues, ChatModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null
             && context.getResponse().getMetadata().getUsage().getCompletionTokens() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.USAGEOUTPUTTOKENS.asString(),
                String.valueOf(context.getResponse().getMetadata().getUsage().getCompletionTokens()));
       }
       return keyValues;
    }

    protected KeyValues usageTotalTokens(KeyValues keyValues, ChatModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null
             && context.getResponse().getMetadata().getUsage().getTotalTokens() != null) {
          return keyValues.and(
                ChatModelObservationDocumentation.HighCardinalityKeyNames.USAGETOTALTOKENS.asString(),
                String.valueOf(context.getResponse().getMetadata().getUsage().getTotalTokens()));
       }
       return keyValues;
    }

}
```

#### 代码定位

在 ChatModel 实现类里内部 new 的对象，而不是自动注入
![](/img/user/ai/spring-ai-explained-sourcecode/MhfubcxL0ovyyhxoa1yckO7inVd.png)

将数据导入 ChatModelObservationContext 中
![](/img/user/ai/spring-ai-explained-sourcecode/RFMrbs2AKo6vrgxg85scD8XQnbh.png)

### ChatClient 下的观测

#### ChatClientObservationConvention

ChatClient 角度下的观测接口类

```java
package org.springframework.ai.chat.client.observation;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationConvention;

public interface ChatClientObservationConvention extends ObservationConvention<ChatClientObservationContext> {
    default boolean supportsContext(Observation.Context context) {
        return context instanceof ChatClientObservationContext;
    }
}
```

##### DefaultChatClientObservationConvention

默认定义 ChatClient 观测约定的实现类，主要用于生成 Micrometer 观察功能所需的上下文信息和关键值

- String name：观测名称，默认为"spring.ai.chat.client"

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td><br/></td><td>getContextualName<br/></td><td>操作元数据生成上下文名称，格式为 provider + CHATCLIENT<br/></td></tr>
<tr>
<td><br/></td><td>getLowCardinalityKeyValues<br/></td><td>生成低粒度的关键值，包括操作类型、提供者、Spring AI 类型和流模式<br/></td></tr>
<tr>
<td><br/></td><td>getHighCardinalityKeyValues<br/></td><td> 生成高粒度的关键值，包括顾问列表、会话 ID 和工具名称<br/></td></tr>
<tr>
<td rowspan="4">低粒度<br/></td><td>aiOperationType<br/></td><td>操作类型<br/></td></tr>
<tr>
<td>aiProvider<br/></td><td>提供者<br/></td></tr>
<tr>
<td>springAiKind<br/></td><td>SpringAI类型<br/></td></tr>
<tr>
<td>stream<br/></td><td>流模式<br/></td></tr>
<tr>
<td rowspan="3">高粒度<br/></td><td>advisors<br/></td><td>顾问列表<br/></td></tr>
<tr>
<td>conversationId<br/></td><td>会话ID<br/></td></tr>
<tr>
<td>tools<br/></td><td>工具名称<br/></td></tr>
</table>


```java
package org.springframework.ai.chat.client.observation;

import io.micrometer.common.KeyValue;
import io.micrometer.common.KeyValues;
import java.util.ArrayList;
import java.util.List;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.chat.client.observation.ChatClientObservationDocumentation.HighCardinalityKeyNames;
import org.springframework.ai.chat.observation.ChatModelObservationDocumentation.LowCardinalityKeyNames;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.observation.ObservabilityHelper;
import org.springframework.ai.observation.conventions.SpringAiKind;
import org.springframework.lang.Nullable;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

public class DefaultChatClientObservationConvention implements ChatClientObservationConvention {
    public static final String DEFAULTNAME = "spring.ai.chat.client";
    private final String name;

    public DefaultChatClientObservationConvention() {
        this("spring.ai.chat.client");
    }

    public DefaultChatClientObservationConvention(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }

    @Nullable
    public String getContextualName(ChatClientObservationContext context) {
        return "%s %s".formatted(context.getOperationMetadata().provider(), SpringAiKind.CHATCLIENT.value());
    }

    public KeyValues getLowCardinalityKeyValues(ChatClientObservationContext context) {
        return KeyValues.of(new KeyValue[]{this.aiOperationType(context), this.aiProvider(context), this.springAiKind(), this.stream(context)});
    }

    protected KeyValue aiOperationType(ChatClientObservationContext context) {
        return KeyValue.of(LowCardinalityKeyNames.AIOPERATIONTYPE, context.getOperationMetadata().operationType());
    }

    protected KeyValue aiProvider(ChatClientObservationContext context) {
        return KeyValue.of(LowCardinalityKeyNames.AIPROVIDER, context.getOperationMetadata().provider());
    }

    protected KeyValue springAiKind() {
        return KeyValue.of(org.springframework.ai.chat.client.observation.ChatClientObservationDocumentation.LowCardinalityKeyNames.SPRINGAIKIND, SpringAiKind.CHATCLIENT.value());
    }

    protected KeyValue stream(ChatClientObservationContext context) {
        return KeyValue.of(org.springframework.ai.chat.client.observation.ChatClientObservationDocumentation.LowCardinalityKeyNames.STREAM, "" + context.isStream());
    }

    public KeyValues getHighCardinalityKeyValues(ChatClientObservationContext context) {
        KeyValues keyValues = KeyValues.empty();
        keyValues = this.advisors(keyValues, context);
        keyValues = this.conversationId(keyValues, context);
        keyValues = this.tools(keyValues, context);
        return keyValues;
    }

    protected KeyValues advisors(KeyValues keyValues, ChatClientObservationContext context) {
        if (CollectionUtils.isEmpty(context.getAdvisors())) {
            return keyValues;
        } else {
            List<String> advisorNames = context.getAdvisors().stream().map(Advisor::getName).toList();
            return keyValues.and(HighCardinalityKeyNames.CHATCLIENTADVISORS.asString(), ObservabilityHelper.concatenateStrings(advisorNames));
        }
    }

    protected KeyValues conversationId(KeyValues keyValues, ChatClientObservationContext context) {
        if (CollectionUtils.isEmpty(context.getRequest().context())) {
            return keyValues;
        } else {
            Object conversationIdValue = context.getRequest().context().get("chatmemoryconversationid");
            if (conversationIdValue instanceof String) {
                String conversationId = (String)conversationIdValue;
                if (StringUtils.hasText(conversationId)) {
                    return keyValues.and(HighCardinalityKeyNames.CHATCLIENTCONVERSATIONID.asString(), conversationId);
                }
            }

            return keyValues;
        }
    }

    protected KeyValues tools(KeyValues keyValues, ChatClientObservationContext context) {
        if (context.getRequest().prompt().getOptions() == null) {
            return keyValues;
        } else {
            ChatOptions var4 = context.getRequest().prompt().getOptions();
            if (var4 instanceof ToolCallingChatOptions) {
                ToolCallingChatOptions options = (ToolCallingChatOptions)var4;
                ArrayList var6 = new ArrayList(options.getToolNames());
                List toolCallbacks = options.getToolCallbacks();
                if (CollectionUtils.isEmpty(var6) && CollectionUtils.isEmpty(toolCallbacks)) {
                    return keyValues;
                } else {
                    toolCallbacks.forEach((toolCallback) -> var6.add(toolCallback.getToolDefinition().name()));
                    return keyValues.and(HighCardinalityKeyNames.CHATCLIENTTOOLNAMES.asString(), ObservabilityHelper.concatenateStrings(var6.stream().sorted().toList()));
                }
            } else {
                return keyValues;
            }
        }
    }
}
```

#### 代码定位

在 DefaultChatClient 内部 new 的对象，而不是自动注入
![](/img/user/ai/spring-ai-explained-sourcecode/WlSGblismo4r8Ax1fQbcd4NxnUe.png)

### 工具下的观测

#### ToolCallingObservationContext

工具调用的观测类

- `ToolDefinition toolDefinition`：工具的定义信息
- `ToolMetadata toolMetadata`：工具的元数据信息
- `String toolCallArguments`：工具调用时传递的参数
- `String toolCallResult`：工具调用的结果

```java
package org.springframework.ai.tool.observation;

import io.micrometer.observation.Observation;

import org.springframework.ai.observation.AiOperationMetadata;
import org.springframework.ai.observation.conventions.AiOperationType;
import org.springframework.ai.observation.conventions.AiProvider;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

public final class ToolCallingObservationContext extends Observation.Context {

    private final AiOperationMetadata operationMetadata = new AiOperationMetadata(AiOperationType.FRAMEWORK.value(),
          AiProvider.SPRINGAI.value());

    private final ToolDefinition toolDefinition;

    private final ToolMetadata toolMetadata;

    private final String toolCallArguments;

    @Nullable
    private String toolCallResult;

    private ToolCallingObservationContext(ToolDefinition toolDefinition, ToolMetadata toolMetadata,
          @Nullable String toolCallArguments, @Nullable String toolCallResult) {
       Assert.notNull(toolDefinition, "toolDefinition cannot be null");
       Assert.notNull(toolMetadata, "toolMetadata cannot be null");

       this.toolDefinition = toolDefinition;
       this.toolMetadata = toolMetadata;
       this.toolCallArguments = toolCallArguments != null ? toolCallArguments : "{}";
       this.toolCallResult = toolCallResult;
    }

    public AiOperationMetadata getOperationMetadata() {
       return this.operationMetadata;
    }

    public ToolDefinition getToolDefinition() {
       return this.toolDefinition;
    }

    public ToolMetadata getToolMetadata() {
       return this.toolMetadata;
    }

    public String getToolCallArguments() {
       return this.toolCallArguments;
    }

    @Nullable
    public String getToolCallResult() {
       return this.toolCallResult;
    }

    public void setToolCallResult(@Nullable String toolCallResult) {
       this.toolCallResult = toolCallResult;
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private ToolDefinition toolDefinition;

       private ToolMetadata toolMetadata = ToolMetadata.builder().build();

       private String toolCallArguments;

       @Nullable
       private String toolCallResult;

       private Builder() {
       }

       public Builder toolDefinition(ToolDefinition toolDefinition) {
          this.toolDefinition = toolDefinition;
          return this;
       }

       public Builder toolMetadata(ToolMetadata toolMetadata) {
          this.toolMetadata = toolMetadata;
          return this;
       }

       public Builder toolCallArguments(String toolCallArguments) {
          this.toolCallArguments = toolCallArguments;
          return this;
       }

       public Builder toolCallResult(@Nullable String toolCallResult) {
          this.toolCallResult = toolCallResult;
          return this;
       }

       public ToolCallingObservationContext build() {
          return new ToolCallingObservationContext(this.toolDefinition, this.toolMetadata, this.toolCallArguments,
                this.toolCallResult);
       }

    }

}
```

#### 代码定位
![](/img/user/ai/spring-ai-explained-sourcecode/ZYBabH4B1oUzxrxiXkecelyhnuc.png)

### EmbeddingModel 下的观测

#### pom.xml 文件

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-autoconfigure-model-embedding-observation</artifactId>
</dependency>

<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-model</artifactId>
</dependency>
```

#### EmbeddingObservationAutoConfiguration

EmbeddingModel 的自动注入观测类

自动注入 EmbeddingModelMeterObservationHandler 的 Bean

```java
package org.springframework.ai.model.embedding.observation.autoconfigure;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.observation.EmbeddingModelMeterObservationHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration(
    afterName = {"org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration"}
)
@ConditionalOnClass({EmbeddingModel.class})
public class EmbeddingObservationAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean({MeterRegistry.class})
    EmbeddingModelMeterObservationHandler embeddingModelMeterObservationHandler(ObjectProvider<MeterRegistry> meterRegistry) {
        return new EmbeddingModelMeterObservationHandler((MeterRegistry)meterRegistry.getObject());
    }
}
```

##### EmbeddingModelMeterObservationHandler

EmbeddingModel 的观测处理器

```java
package org.springframework.ai.embedding.observation;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;

import org.springframework.ai.model.observation.ModelUsageMetricsGenerator;

public class EmbeddingModelMeterObservationHandler implements ObservationHandler<EmbeddingModelObservationContext> {

    private final MeterRegistry meterRegistry;

    public EmbeddingModelMeterObservationHandler(MeterRegistry meterRegistry) {
       this.meterRegistry = meterRegistry;
    }

    @Override
    public void onStop(EmbeddingModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null) {
          ModelUsageMetricsGenerator.generate(context.getResponse().getMetadata().getUsage(), context,
                this.meterRegistry);
       }
    }

    @Override
    public boolean supportsContext(Observation.Context context) {
       return context instanceof EmbeddingModelObservationContext;
    }

}
```

#### EmbeddingModelObservationContext

嵌入模型观测功能的上下文类

```java
package org.springframework.ai.embedding.observation;

import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.model.observation.ModelObservationContext;
import org.springframework.ai.observation.AiOperationMetadata;
import org.springframework.ai.observation.conventions.AiOperationType;

public class EmbeddingModelObservationContext extends ModelObservationContext<EmbeddingRequest, EmbeddingResponse> {

    EmbeddingModelObservationContext(EmbeddingRequest embeddingRequest, String provider) {
       super(embeddingRequest,
             AiOperationMetadata.builder()
                .operationType(AiOperationType.EMBEDDING.value())
                .provider(provider)
                .build());
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private EmbeddingRequest embeddingRequest;

       private String provider;

       private Builder() {
       }

       public Builder embeddingRequest(EmbeddingRequest embeddingRequest) {
          this.embeddingRequest = embeddingRequest;
          return this;
       }

       public Builder provider(String provider) {
          this.provider = provider;
          return this;
       }

       public EmbeddingModelObservationContext build() {
          return new EmbeddingModelObservationContext(this.embeddingRequest, this.provider);
       }

    }

}
```

#### EmbeddingModelObservationConvention

EmbeddingModel 角度下的观测接口类

```java
package org.springframework.ai.embedding.observation;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationConvention;

public interface EmbeddingModelObservationConvention extends ObservationConvention<EmbeddingModelObservationContext> {

    @Override
    default boolean supportsContext(Observation.Context context) {
       return context instanceof EmbeddingModelObservationContext;
    }

}
```

##### DefaultEmbeddingModelObservationConvention

默认定义 EmbeddingModel 观测约定的实现类，主要用于生成 Micrometer 观察功能所需的上下文信息和关键值

- `String DEFAULTNAME`：默认观测名称为"genai.client.operation"
- `KeyValue REQUESTMODELNONE`：请求为空的默认值
- `KeyValue RESPONSEMODELNONE`：响应模型为空的默认值

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td><br/></td><td>getContextualName<br/></td><td>操作元数据生成上下文名称，格式为 provider + CHATCLIENT<br/></td></tr>
<tr>
<td><br/></td><td>getLowCardinalityKeyValues<br/></td><td>生成低粒度的关键值，包括操作类型、提供者、Spring AI 类型和流模式<br/></td></tr>
<tr>
<td><br/></td><td>getHighCardinalityKeyValues<br/></td><td> 生成高粒度的关键值，包括顾问列表、会话 ID 和工具名称<br/></td></tr>
<tr>
<td rowspan="4">低粒度<br/></td><td>aiOperationType<br/></td><td>操作类型<br/></td></tr>
<tr>
<td>aiProvider<br/></td><td>提供者<br/></td></tr>
<tr>
<td>requestModel<br/></td><td>请求模型名称<br/></td></tr>
<tr>
<td>responseModel<br/></td><td>响应模型名称<br/></td></tr>
<tr>
<td rowspan="3">高粒度<br/></td><td>requestEmbeddingDimension<br/></td><td>嵌入维度<br/></td></tr>
<tr>
<td>usageInputTokens<br/></td><td>输入令牌使用量<br/></td></tr>
<tr>
<td>usageTotalTokens<br/></td><td>总令牌使用量<br/></td></tr>
</table>


```java
package org.springframework.ai.embedding.observation;

import io.micrometer.common.KeyValue;
import io.micrometer.common.KeyValues;

import org.springframework.util.StringUtils;

public class DefaultEmbeddingModelObservationConvention implements EmbeddingModelObservationConvention {

    public static final String DEFAULTNAME = "genai.client.operation";

    private static final KeyValue REQUESTMODELNONE = KeyValue
       .of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.REQUESTMODEL, KeyValue.NONEVALUE);

    private static final KeyValue RESPONSEMODELNONE = KeyValue
       .of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.RESPONSEMODEL, KeyValue.NONEVALUE);

    @Override
    public String getName() {
       return DEFAULTNAME;
    }

    @Override
    public String getContextualName(EmbeddingModelObservationContext context) {
       if (StringUtils.hasText(context.getRequest().getOptions().getModel())) {
          return "%s %s".formatted(context.getOperationMetadata().operationType(),
                context.getRequest().getOptions().getModel());
       }
       return context.getOperationMetadata().operationType();
    }

    @Override
    public KeyValues getLowCardinalityKeyValues(EmbeddingModelObservationContext context) {
       return KeyValues.of(aiOperationType(context), aiProvider(context), requestModel(context),
             responseModel(context));
    }

    protected KeyValue aiOperationType(EmbeddingModelObservationContext context) {
       return KeyValue.of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.AIOPERATIONTYPE,
             context.getOperationMetadata().operationType());
    }

    protected KeyValue aiProvider(EmbeddingModelObservationContext context) {
       return KeyValue.of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.AIPROVIDER,
             context.getOperationMetadata().provider());
    }

    protected KeyValue requestModel(EmbeddingModelObservationContext context) {
       if (StringUtils.hasText(context.getRequest().getOptions().getModel())) {
          return KeyValue.of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.REQUESTMODEL,
                context.getRequest().getOptions().getModel());
       }
       return REQUESTMODELNONE;
    }

    protected KeyValue responseModel(EmbeddingModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && StringUtils.hasText(context.getResponse().getMetadata().getModel())) {
          return KeyValue.of(EmbeddingModelObservationDocumentation.LowCardinalityKeyNames.RESPONSEMODEL,
                context.getResponse().getMetadata().getModel());
       }
       return RESPONSEMODELNONE;
    }

    @Override
    public KeyValues getHighCardinalityKeyValues(EmbeddingModelObservationContext context) {
       var keyValues = KeyValues.empty();
       // Request
       keyValues = requestEmbeddingDimension(keyValues, context);
       // Response
       keyValues = usageInputTokens(keyValues, context);
       keyValues = usageTotalTokens(keyValues, context);
       return keyValues;
    }

    // Request

    protected KeyValues requestEmbeddingDimension(KeyValues keyValues, EmbeddingModelObservationContext context) {
       if (context.getRequest().getOptions().getDimensions() != null) {
          return keyValues
             .and(EmbeddingModelObservationDocumentation.HighCardinalityKeyNames.REQUESTEMBEDDINGDIMENSIONS
                .asString(), String.valueOf(context.getRequest().getOptions().getDimensions()));
       }
       return keyValues;
    }

    // Response

    protected KeyValues usageInputTokens(KeyValues keyValues, EmbeddingModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null
             && context.getResponse().getMetadata().getUsage().getPromptTokens() != null) {
          return keyValues.and(
                EmbeddingModelObservationDocumentation.HighCardinalityKeyNames.USAGEINPUTTOKENS.asString(),
                String.valueOf(context.getResponse().getMetadata().getUsage().getPromptTokens()));
       }
       return keyValues;
    }

    protected KeyValues usageTotalTokens(KeyValues keyValues, EmbeddingModelObservationContext context) {
       if (context.getResponse() != null && context.getResponse().getMetadata() != null
             && context.getResponse().getMetadata().getUsage() != null
             && context.getResponse().getMetadata().getUsage().getTotalTokens() != null) {
          return keyValues.and(
                EmbeddingModelObservationDocumentation.HighCardinalityKeyNames.USAGETOTALTOKENS.asString(),
                String.valueOf(context.getResponse().getMetadata().getUsage().getTotalTokens()));
       }
       return keyValues;
    }

}
```

#### 代码定位
![](/img/user/ai/spring-ai-explained-sourcecode/TW7Qb3N7posrKYxC1eHcSEdWnkb.png)

### VectorStore 下的观测

#### pom.xml 文件

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-autoconfigure-vector-store-observation</artifactId>
</dependency>

<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-model</artifactId>
</dependency>
```

#### VectorStoreObservationProperties

向量数据库观测功能的配置属性类

```java
package org.springframework.ai.vectorstore.observation.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.vectorstore.observations")
public class VectorStoreObservationProperties {
    public static final String CONFIGPREFIX = "spring.ai.vectorstore.observations";
    private boolean logQueryResponse = false;

    public boolean isLogQueryResponse() {
        return this.logQueryResponse;
    }

    public void setLogQueryResponse(boolean logQueryResponse) {
        this.logQueryResponse = logQueryResponse;
    }
}
```

#### VectorStoreObservationAutoConfiguration

向量观测的自动配置类

- TracerPresentObservationConfiguration（类路径存在 Tracer）：对外提供 TracingAwareLoggingObservationHandler 的 Bean
- TracerNotPresentObservationConfiguration（类路径不存在 Tracer）：对外提供 VectorStoreQueryResponseObservationHandler 的 Bean

```java
package org.springframework.ai.vectorstore.observation.autoconfigure;

import io.micrometer.tracing.Tracer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.observation.TracingAwareLoggingObservationHandler;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.observation.VectorStoreObservationContext;
import org.springframework.ai.vectorstore.observation.VectorStoreQueryResponseObservationHandler;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@AutoConfiguration(
    afterName = {"org.springframework.boot.actuate.autoconfigure.observation.ObservationAutoConfiguration"}
)
@ConditionalOnClass({VectorStore.class})
@EnableConfigurationProperties({VectorStoreObservationProperties.class})
public class VectorStoreObservationAutoConfiguration {
    private static final Logger logger = LoggerFactory.getLogger(VectorStoreObservationAutoConfiguration.class);

    private static void logQueryResponseContentWarning() {
        logger.warn("You have enabled logging out of the query response content with the risk of exposing sensitive or private information. Please, be careful!");
    }

    @Configuration(
        proxyBeanMethods = false
    )
    @ConditionalOnClass({Tracer.class})
    @ConditionalOnBean({Tracer.class})
    static class TracerPresentObservationConfiguration {
        @Bean
        @ConditionalOnMissingBean(
            value = {VectorStoreQueryResponseObservationHandler.class},
            name = {"vectorStoreQueryResponseObservationHandler"}
        )
        @ConditionalOnProperty(
            prefix = "spring.ai.vectorstore.observations",
            name = {"log-query-response"},
            havingValue = "true"
        )
        TracingAwareLoggingObservationHandler<VectorStoreObservationContext> vectorStoreQueryResponseObservationHandler(Tracer tracer) {
            VectorStoreObservationAutoConfiguration.logQueryResponseContentWarning();
            return new TracingAwareLoggingObservationHandler(new VectorStoreQueryResponseObservationHandler(), tracer);
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
            prefix = "spring.ai.vectorstore.observations",
            name = {"log-query-response"},
            havingValue = "true"
        )
        VectorStoreQueryResponseObservationHandler vectorStoreQueryResponseObservationHandler() {
            VectorStoreObservationAutoConfiguration.logQueryResponseContentWarning();
            return new VectorStoreQueryResponseObservationHandler();
        }
    }
}
```

##### VectorStoreQueryResponseObservationHandler

VectorStore 的观测处理器

```java
package org.springframework.ai.vectorstore.observation;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.observation.ObservabilityHelper;
import org.springframework.util.CollectionUtils;

public class VectorStoreQueryResponseObservationHandler implements ObservationHandler<VectorStoreObservationContext> {
    private static final Logger logger = LoggerFactory.getLogger(VectorStoreQueryResponseObservationHandler.class);

    public void onStop(VectorStoreObservationContext context) {
        logger.info("Vector Store Query Response:\n{}", ObservabilityHelper.concatenateStrings(this.documents(context)));
    }

    private List<String> documents(VectorStoreObservationContext context) {
        return CollectionUtils.isEmpty(context.getQueryResponse()) ? List.of() : context.getQueryResponse().stream().map(Document::getText).toList();
    }

    public boolean supportsContext(Observation.Context context) {
        return context instanceof VectorStoreObservationContext;
    }
}
```

#### VectorStoreObservationContext

存储向量存储操作相关元数据的上下文类

- String databaseSystem：数据库系统的名称
- String operationName：操作的名称，例如添加、删除或查询
- String collectionName：集合的名称，用于标识操作的目标集合
- Integer dimensions：量的维度
- String fieldName：字段名称
- String namespace：命名空间，用于区分不同的存储区域
- String similarityMetric：似度度量方法，用于查询操作
- SearchRequest queryRequest：查询请求的详细信息
- List<Document> queryResponse：查询操作的响应结果

```java
package org.springframework.ai.vectorstore.observation;

import io.micrometer.observation.Observation;
import java.util.List;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

public class VectorStoreObservationContext extends Observation.Context {
    private final String databaseSystem;
    private final String operationName;
    @Nullable
    private String collectionName;
    @Nullable
    private Integer dimensions;
    @Nullable
    private String fieldName;
    @Nullable
    private String namespace;
    @Nullable
    private String similarityMetric;
    @Nullable
    private SearchRequest queryRequest;
    @Nullable
    private List<Document> queryResponse;

    public VectorStoreObservationContext(String databaseSystem, String operationName) {
        Assert.hasText(databaseSystem, "databaseSystem cannot be null or empty");
        Assert.hasText(operationName, "operationName cannot be null or empty");
        this.databaseSystem = databaseSystem;
        this.operationName = operationName;
    }

    public static Builder builder(String databaseSystem, String operationName) {
        return new Builder(databaseSystem, operationName);
    }

    public static Builder builder(String databaseSystem, Operation operation) {
        return builder(databaseSystem, operation.value);
    }

    public String getDatabaseSystem() {
        return this.databaseSystem;
    }

    public String getOperationName() {
        return this.operationName;
    }

    @Nullable
    public String getCollectionName() {
        return this.collectionName;
    }

    public void setCollectionName(@Nullable String collectionName) {
        this.collectionName = collectionName;
    }

    @Nullable
    public Integer getDimensions() {
        return this.dimensions;
    }

    public void setDimensions(@Nullable Integer dimensions) {
        this.dimensions = dimensions;
    }

    @Nullable
    public String getFieldName() {
        return this.fieldName;
    }

    public void setFieldName(@Nullable String fieldName) {
        this.fieldName = fieldName;
    }

    @Nullable
    public String getNamespace() {
        return this.namespace;
    }

    public void setNamespace(@Nullable String namespace) {
        this.namespace = namespace;
    }

    @Nullable
    public String getSimilarityMetric() {
        return this.similarityMetric;
    }

    public void setSimilarityMetric(@Nullable String similarityMetric) {
        this.similarityMetric = similarityMetric;
    }

    @Nullable
    public SearchRequest getQueryRequest() {
        return this.queryRequest;
    }

    public void setQueryRequest(@Nullable SearchRequest queryRequest) {
        this.queryRequest = queryRequest;
    }

    @Nullable
    public List<Document> getQueryResponse() {
        return this.queryResponse;
    }

    public void setQueryResponse(@Nullable List<Document> queryResponse) {
        this.queryResponse = queryResponse;
    }

    public static enum Operation {
        ADD("add"),
        DELETE("delete"),
        QUERY("query");

        public final String value;

        private Operation(String value) {
            this.value = value;
        }

        public String value() {
            return this.value;
        }
    }

    public static class Builder {
        private final VectorStoreObservationContext context;

        public Builder(String databaseSystem, String operationName) {
            this.context = new VectorStoreObservationContext(databaseSystem, operationName);
        }

        public Builder collectionName(String collectionName) {
            this.context.setCollectionName(collectionName);
            return this;
        }

        public Builder dimensions(Integer dimensions) {
            this.context.setDimensions(dimensions);
            return this;
        }

        public Builder fieldName(@Nullable String fieldName) {
            this.context.setFieldName(fieldName);
            return this;
        }

        public Builder namespace(String namespace) {
            this.context.setNamespace(namespace);
            return this;
        }

        public Builder queryRequest(SearchRequest request) {
            this.context.setQueryRequest(request);
            return this;
        }

        public Builder queryResponse(List<Document> documents) {
            this.context.setQueryResponse(documents);
            return this;
        }

        public Builder similarityMetric(String similarityMetric) {
            this.context.setSimilarityMetric(similarityMetric);
            return this;
        }

        public VectorStoreObservationContext build() {
            return this.context;
        }
    }
}
```

#### VectorStoreObservationConvention

向量观测接口类

```java
package org.springframework.ai.vectorstore.observation;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationConvention;

public interface VectorStoreObservationConvention extends ObservationConvention<VectorStoreObservationContext> {
    default boolean supportsContext(Observation.Context context) {
        return context instanceof VectorStoreObservationContext;
    }
}
```

##### DefaultVectorStoreObservationConvention

默认的向量存储操作观察约定的实现类

- String name：观测名称，默认为"db.vector.client.operation"

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td><br/></td><td>getContextualName<br/></td><td>根据数据库系统和操作名称生成上下文名称，格式为 databaseSystem + operationName<br/></td></tr>
<tr>
<td><br/></td><td>getLowCardinalityKeyValues<br/></td><td>生成低粒度的关键值，包括 Spring AI 类型、数据库系统和操作名称<br/></td></tr>
<tr>
<td><br/></td><td>getHighCardinalityKeyValues<br/></td><td>生成高粒度的关键值，包括集合名称、维度、字段名称、命名空间、查询内容、相似度度量等<br/></td></tr>
<tr>
<td rowspan="3">低粒度<br/></td><td>dbOperationName<br/></td><td>操作名称<br/></td></tr>
<tr>
<td>dbSystem<br/></td><td>数据库系统<br/></td></tr>
<tr>
<td>springAiKind<br/></td><td>SpringAI类型<br/></td></tr>
<tr>
<td rowspan="9">高粒度<br/></td><td>collectionName<br/></td><td>集合名词<br/></td></tr>
<tr>
<td>dimensions<br/></td><td>向量纬度<br/></td></tr>
<tr>
<td>fieldName<br/></td><td>字段名称<br/></td></tr>
<tr>
<td>metadataFilter<br/></td><td>查询过滤条件<br/></td></tr>
<tr>
<td>namespace<br/></td><td>命名空间<br/></td></tr>
<tr>
<td>queryContent<br/></td><td>查询内容<br/></td></tr>
<tr>
<td>similarityMetric<br/></td><td>相似性度量<br/></td></tr>
<tr>
<td>similarityThreshold<br/></td><td>相似度阈值<br/></td></tr>
<tr>
<td>topK<br/></td><td>生产查询结果的TopK关键值<br/></td></tr>
</table>


```java
package org.springframework.ai.vectorstore.observation;

import io.micrometer.common.KeyValue;
import io.micrometer.common.KeyValues;
import org.springframework.ai.observation.conventions.SpringAiKind;
import org.springframework.ai.vectorstore.observation.VectorStoreObservationDocumentation.HighCardinalityKeyNames;
import org.springframework.ai.vectorstore.observation.VectorStoreObservationDocumentation.LowCardinalityKeyNames;
import org.springframework.lang.Nullable;
import org.springframework.util.StringUtils;

public class DefaultVectorStoreObservationConvention implements VectorStoreObservationConvention {
    public static final String DEFAULTNAME = "db.vector.client.operation";
    private final String name;

    public DefaultVectorStoreObservationConvention() {
        this("db.vector.client.operation");
    }

    public DefaultVectorStoreObservationConvention(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }

    @Nullable
    public String getContextualName(VectorStoreObservationContext context) {
        return "%s %s".formatted(context.getDatabaseSystem(), context.getOperationName());
    }

    public KeyValues getLowCardinalityKeyValues(VectorStoreObservationContext context) {
        return KeyValues.of(new KeyValue[]{this.springAiKind(), this.dbSystem(context), this.dbOperationName(context)});
    }

    protected KeyValue springAiKind() {
        return KeyValue.of(LowCardinalityKeyNames.SPRINGAIKIND, SpringAiKind.VECTORSTORE.value());
    }

    protected KeyValue dbSystem(VectorStoreObservationContext context) {
        return KeyValue.of(LowCardinalityKeyNames.DBSYSTEM, context.getDatabaseSystem());
    }

    protected KeyValue dbOperationName(VectorStoreObservationContext context) {
        return KeyValue.of(LowCardinalityKeyNames.DBOPERATIONNAME, context.getOperationName());
    }

    public KeyValues getHighCardinalityKeyValues(VectorStoreObservationContext context) {
        KeyValues keyValues = KeyValues.empty();
        keyValues = this.collectionName(keyValues, context);
        keyValues = this.dimensions(keyValues, context);
        keyValues = this.fieldName(keyValues, context);
        keyValues = this.metadataFilter(keyValues, context);
        keyValues = this.namespace(keyValues, context);
        keyValues = this.queryContent(keyValues, context);
        keyValues = this.similarityMetric(keyValues, context);
        keyValues = this.similarityThreshold(keyValues, context);
        keyValues = this.topK(keyValues, context);
        return keyValues;
    }

    protected KeyValues collectionName(KeyValues keyValues, VectorStoreObservationContext context) {
        return StringUtils.hasText(context.getCollectionName()) ? keyValues.and(HighCardinalityKeyNames.DBCOLLECTIONNAME.asString(), context.getCollectionName()) : keyValues;
    }

    protected KeyValues dimensions(KeyValues keyValues, VectorStoreObservationContext context) {
        return context.getDimensions() != null && context.getDimensions() > 0 ? keyValues.and(HighCardinalityKeyNames.DBVECTORDIMENSIONCOUNT.asString(), "" + context.getDimensions()) : keyValues;
    }

    protected KeyValues fieldName(KeyValues keyValues, VectorStoreObservationContext context) {
        return StringUtils.hasText(context.getFieldName()) ? keyValues.and(HighCardinalityKeyNames.DBVECTORFIELDNAME.asString(), context.getFieldName()) : keyValues;
    }

    protected KeyValues metadataFilter(KeyValues keyValues, VectorStoreObservationContext context) {
        return context.getQueryRequest() != null && context.getQueryRequest().getFilterExpression() != null ? keyValues.and(HighCardinalityKeyNames.DBVECTORQUERYFILTER.asString(), context.getQueryRequest().getFilterExpression().toString()) : keyValues;
    }

    protected KeyValues namespace(KeyValues keyValues, VectorStoreObservationContext context) {
        return StringUtils.hasText(context.getNamespace()) ? keyValues.and(HighCardinalityKeyNames.DBNAMESPACE.asString(), context.getNamespace()) : keyValues;
    }

    protected KeyValues queryContent(KeyValues keyValues, VectorStoreObservationContext context) {
        return context.getQueryRequest() != null && StringUtils.hasText(context.getQueryRequest().getQuery()) ? keyValues.and(HighCardinalityKeyNames.DBVECTORQUERYCONTENT.asString(), context.getQueryRequest().getQuery()) : keyValues;
    }

    protected KeyValues similarityMetric(KeyValues keyValues, VectorStoreObservationContext context) {
        return StringUtils.hasText(context.getSimilarityMetric()) ? keyValues.and(HighCardinalityKeyNames.DBSEARCHSIMILARITYMETRIC.asString(), context.getSimilarityMetric()) : keyValues;
    }

    protected KeyValues similarityThreshold(KeyValues keyValues, VectorStoreObservationContext context) {
        return context.getQueryRequest() != null && context.getQueryRequest().getSimilarityThreshold() >= (double)0.0F ? keyValues.and(HighCardinalityKeyNames.DBVECTORQUERYSIMILARITYTHRESHOLD.asString(), String.valueOf(context.getQueryRequest().getSimilarityThreshold())) : keyValues;
    }

    protected KeyValues topK(KeyValues keyValues, VectorStoreObservationContext context) {
        return context.getQueryRequest() != null && context.getQueryRequest().getTopK() > 0 ? keyValues.and(HighCardinalityKeyNames.DBVECTORQUERYTOPK.asString(), "" + context.getQueryRequest().getTopK()) : keyValues;
    }
}
```

#### 代码定位
![](/img/user/ai/spring-ai-explained-sourcecode/Gnqkb2uUMoY10pxgsG9cF1Ucn5c.png)
