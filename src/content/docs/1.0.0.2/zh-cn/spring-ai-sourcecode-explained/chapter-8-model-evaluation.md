---
title: 第八章：多模型评估篇
keywords: [Spring AI, Spring AI Alibaba, 源码解读]
description: "测试 AI 应用程序需要评估生成的内容，以确保 AI 模型没有产生幻觉响应。本篇利用千问系列的qwen-max 模型生成响应，利用 qwen-plus 模型进行评估"
---

- 作者：影子, Spring AI Alibaba Committer
- 本文档基于 Spring AI 1.0.0 版本，Spring AI Alibaba 1.0.0.2 版本
- 本章是多模型评估的快速上手 + 源码解读

## 模型评估快速上手

> 测试 AI 模型想响应的结果，确保未产生幻觉

以下是用 qwen-max 模型生成响应，利用 qwen-plus 模型进行评估

实战代码可见：[https://github.com/GTyingzi/spring-ai-tutorial](https://github.com/GTyingzi/spring-ai-tutorial) 下的 rag 目录下 rag-evaluation 模块

### pom.xml

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-rag</artifactId>
    </dependency>

</dependencies>
```

### application.yml

```yaml
server:
  port: 8080

spring:
  application:
    name: rag-evaluation

  ai:
    dashscope:
      api-key: ${DASHSCOPEAPIKEY}
      chat:
        options:
          model: qwen-max
      embedding:
        options:
          model: text-embedding-v1
```

### config

```java
package com.spring.ai.tutorial.rag.evaluation.config;

import com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeChatProperties;
import com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeConnectionProperties;
import com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeConnectionUtils;
import com.alibaba.cloud.ai.autoconfigure.dashscope.ResolvedConnectionProperties;
import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.observation.ChatModelObservationConvention;
import org.springframework.ai.model.tool.DefaultToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionEligibilityPredicate;
import org.springframework.ai.model.tool.autoconfigure.ToolCallingAutoConfiguration;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryAutoConfiguration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.web.client.RestClientAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.function.client.WebClientAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Objects;

@ConditionalOnClass({DashScopeApi.class})
@AutoConfiguration(
        after = {RestClientAutoConfiguration.class, SpringAiRetryAutoConfiguration.class, ToolCallingAutoConfiguration.class}
)
@ImportAutoConfiguration(
        classes = {SpringAiRetryAutoConfiguration.class, RestClientAutoConfiguration.class, ToolCallingAutoConfiguration.class, WebClientAutoConfiguration.class}
)
@EnableConfigurationProperties({DashScopeConnectionProperties.class, DashScopeChatProperties.class})
public class ChatModelAutoConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(ChatModelAutoConfiguration.class);

    @Bean(name = "qwen-max")
    public DashScopeChatModel qwenMaxChatModel(RetryTemplate retryTemplate, ToolCallingManager toolCallingManager, DashScopeChatProperties chatProperties, ResponseErrorHandler responseErrorHandler, DashScopeConnectionProperties commonProperties, ObjectProvider<ObservationRegistry> observationRegistry, ObjectProvider<WebClient.Builder> webClientBuilderProvider, ObjectProvider<RestClient.Builder> restClientBuilderProvider, ObjectProvider<ChatModelObservationConvention> observationConvention, ObjectProvider<ToolExecutionEligibilityPredicate> dashscopeToolExecutionEligibilityPredicate) {
        chatProperties.getOptions().setModel("qwen-max");
        DashScopeApi dashscopeApi = this.dashscopeChatApi(commonProperties, chatProperties, (RestClient.Builder)restClientBuilderProvider.getIfAvailable(RestClient::builder), (WebClient.Builder)webClientBuilderProvider.getIfAvailable(WebClient::builder), responseErrorHandler, "chat");
        DashScopeChatModel dashscopeModel = DashScopeChatModel.builder().dashScopeApi(dashscopeApi).retryTemplate(retryTemplate).toolCallingManager(toolCallingManager).defaultOptions(chatProperties.getOptions()).observationRegistry((ObservationRegistry)observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP)).toolExecutionEligibilityPredicate((ToolExecutionEligibilityPredicate)dashscopeToolExecutionEligibilityPredicate.getIfUnique(DefaultToolExecutionEligibilityPredicate::new)).build();
        Objects.requireNonNull(dashscopeModel);
        observationConvention.ifAvailable(dashscopeModel::setObservationConvention);

        logger.info("load qwenMaxChatModel success");
        return dashscopeModel;
    }

    private DashScopeApi dashscopeChatApi(DashScopeConnectionProperties commonProperties, DashScopeChatProperties chatProperties, RestClient.Builder restClientBuilder, WebClient.Builder webClientBuilder, ResponseErrorHandler responseErrorHandler, String modelType) {
        ResolvedConnectionProperties resolved = DashScopeConnectionUtils.resolveConnectionProperties(commonProperties, chatProperties, modelType);
        return DashScopeApi.builder().apiKey(resolved.apiKey()).headers(resolved.headers()).baseUrl(resolved.baseUrl()).webClientBuilder(webClientBuilder).workSpaceId(resolved.workspaceId()).restClientBuilder(restClientBuilder).responseErrorHandler(responseErrorHandler).build();
    }

    @Bean(name = "qwen-plus")
    public DashScopeChatModel qwenPlusChatModel(RetryTemplate retryTemplate, ToolCallingManager toolCallingManager, DashScopeChatProperties chatProperties, ResponseErrorHandler responseErrorHandler, DashScopeConnectionProperties commonProperties, ObjectProvider<ObservationRegistry> observationRegistry, ObjectProvider<WebClient.Builder> webClientBuilderProvider, ObjectProvider<RestClient.Builder> restClientBuilderProvider, ObjectProvider<ChatModelObservationConvention> observationConvention, ObjectProvider<ToolExecutionEligibilityPredicate> dashscopeToolExecutionEligibilityPredicate) {
        chatProperties.getOptions().setModel("qwen-plus");
        DashScopeApi dashscopeApi = this.dashscopeChatApi(commonProperties, chatProperties, (RestClient.Builder)restClientBuilderProvider.getIfAvailable(RestClient::builder), (WebClient.Builder)webClientBuilderProvider.getIfAvailable(WebClient::builder), responseErrorHandler, "chat");
        DashScopeChatModel dashscopeModel = DashScopeChatModel.builder().dashScopeApi(dashscopeApi).retryTemplate(retryTemplate).toolCallingManager(toolCallingManager).defaultOptions(chatProperties.getOptions()).observationRegistry((ObservationRegistry)observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP)).toolExecutionEligibilityPredicate((ToolExecutionEligibilityPredicate)dashscopeToolExecutionEligibilityPredicate.getIfUnique(DefaultToolExecutionEligibilityPredicate::new)).build();
        Objects.requireNonNull(dashscopeModel);
        observationConvention.ifAvailable(dashscopeModel::setObservationConvention);

        logger.info("load qwenPlusChatModel success");
        return dashscopeModel;
    }

}
```

### controller

```java
package com.spring.ai.tutorial.rag.evaluation.controller;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.evaluation.RelevancyEvaluator;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.evaluation.EvaluationRequest;
import org.springframework.ai.evaluation.EvaluationResponse;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rag/evaluation")
public class RagEvaluationController {

    private static final Logger logger = LoggerFactory.getLogger(RagEvaluationController.class);
    private final SimpleVectorStore simpleVectorStore;
    private final DashScopeChatModel qwenMaxChatModel;
    private final DashScopeChatModel qwenPlusChatModel;

    public RagEvaluationController(EmbeddingModel embeddingModel, @Qualifier("qwen-max")DashScopeChatModel qwenMaxChatModel,
                                   @Qualifier("qwen-plus")DashScopeChatModel qwenPlusChatModel) {
        this.simpleVectorStore = SimpleVectorStore
                .builder(embeddingModel).build();
        this.qwenMaxChatModel = qwenMaxChatModel;
        this.qwenPlusChatModel = qwenPlusChatModel;
    }

    @GetMapping("/add")
    public void add() {
        logger.info("start add data");
        HashMap<String, Object> map = new HashMap<>();
        map.put("year", 2025);
        map.put("name", "yingzi");
        List<Document> documents = List.of(
                new Document("你的姓名是影子，湖南邵阳人，25年硕士毕业于北京科技大学，曾先后在百度、理想、快手实习，曾发表过一篇自然语言处理的sci，现在是一名AI研发工程师"),
                new Document("你的姓名是影子，专业领域包含的数学、前后端、大数据、自然语言处理", Map.of("year", 2024)),
                new Document("你姓名是影子，爱好是发呆、思考、运动", map));
        simpleVectorStore.add(documents);
    }

    @GetMapping("/evaluate")
    public String evaluate(@RequestParam(value = "query", defaultValue = "你好，请告诉我影子这个人的身份信息") String query) {
        logger.info("start evaluate");
        RetrievalAugmentationAdvisor retrievalAugmentationAdvisor = RetrievalAugmentationAdvisor.builder()
                .documentRetriever(VectorStoreDocumentRetriever.builder()
                        .vectorStore(simpleVectorStore)
                        .build())
                .build();

        ChatResponse chatResponse = ChatClient.builder(qwenMaxChatModel)
                .build().prompt(query).advisors(retrievalAugmentationAdvisor).call().chatResponse();

        EvaluationRequest evaluationRequest = new EvaluationRequest(
                // The original user question
                query,
                // The retrieved context from the RAG flow
                chatResponse.getMetadata().get(RetrievalAugmentationAdvisor.DOCUMENTCONTEXT),
                // The AI model's response
                chatResponse.getResult().getOutput().getText()
        );
        logger.info("evaluate request: {}", evaluationRequest);

        RelevancyEvaluator evaluator = new RelevancyEvaluator(ChatClient.builder(qwenPlusChatModel));
        EvaluationResponse evaluationResponse = evaluator.evaluate(evaluationRequest);
        boolean pass = evaluationResponse.isPass();
        logger.info("evaluate result: {}", pass);
        return chatResponse.getResult().getOutput().getText();
    }
}
```

#### 效果

导入数据到向量数据库中，利用 qwen-max 模型生成内容，同时再利用 qwen-plus 模型进行校验幻觉

![](/img/user/ai/spring-ai-explained-sourcecode/YdBwbHRCxoYcMWxRBIYcsFArnye.png)



## 模型评估源码篇

### EvaluationRequest

封装评估请求的信息类

- String userText：用户输入文本
- List<Document> dataList：额外的上下文知识
- String responseContent：AI 模型响应内容

```java
package org.springframework.ai.evaluation;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.ai.document.Document;

public class EvaluationRequest {
    private final String userText;
    private final List<Document> dataList;
    private final String responseContent;

    public EvaluationRequest(String userText, String responseContent) {
        this(userText, Collections.emptyList(), responseContent);
    }

    public EvaluationRequest(List<Document> dataList, String responseContent) {
        this("", dataList, responseContent);
    }

    public EvaluationRequest(String userText, List<Document> dataList, String responseContent) {
        this.userText = userText;
        this.dataList = dataList;
        this.responseContent = responseContent;
    }

    public String getUserText() {
        return this.userText;
    }

    public List<Document> getDataList() {
        return this.dataList;
    }

    public String getResponseContent() {
        return this.responseContent;
    }

    public String toString() {
        String var10000 = this.userText;
        return "EvaluationRequest{userText='" + var10000 + "', dataList=" + String.valueOf(this.dataList) + ", chatResponse=" + this.responseContent + "}";
    }

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        } else if (!(o instanceof EvaluationRequest)) {
            return false;
        } else {
            EvaluationRequest that = (EvaluationRequest)o;
            return Objects.equals(this.userText, that.userText) && Objects.equals(this.dataList, that.dataList) && Objects.equals(this.responseContent, that.responseContent);
        }
    }

    public int hashCode() {
        return Objects.hash(new Object[]{this.userText, this.dataList, this.responseContent});
    }
}
```

### EvaluationResponse

封装模型评估结果的标准响应类

- boolean pass：评估是否通过
- float score：相关性得分
- String feedback：自然语言形式提供评估结果的详细解释，辅助人工复核或调试
- Map<String, Object> metadata：存储与评估相关的附加信息

```java
package org.springframework.ai.evaluation;

import java.util.Map;
import java.util.Objects;

public class EvaluationResponse {
    private final boolean pass;
    private final float score;
    private final String feedback;
    private final Map<String, Object> metadata;

    public EvaluationResponse(boolean pass, float score, String feedback, Map<String, Object> metadata) {
        this.pass = pass;
        this.score = score;
        this.feedback = feedback;
        this.metadata = metadata;
    }

    public EvaluationResponse(boolean pass, String feedback, Map<String, Object> metadata) {
        this.pass = pass;
        this.score = 0.0F;
        this.feedback = feedback;
        this.metadata = metadata;
    }

    public boolean isPass() {
        return this.pass;
    }

    public float getScore() {
        return this.score;
    }

    public String getFeedback() {
        return this.feedback;
    }

    public Map<String, Object> getMetadata() {
        return this.metadata;
    }

    public String toString() {
        boolean var10000 = this.pass;
        return "EvaluationResponse{pass=" + var10000 + ", score=" + this.score + ", feedback='" + this.feedback + "', metadata=" + String.valueOf(this.metadata) + "}";
    }

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        } else if (!(o instanceof EvaluationResponse)) {
            return false;
        } else {
            EvaluationResponse that = (EvaluationResponse)o;
            return this.pass == that.pass && Float.compare(this.score, that.score) == 0 && Objects.equals(this.feedback, that.feedback) && Objects.equals(this.metadata, that.metadata);
        }
    }

    public int hashCode() {
        return Objects.hash(new Object[]{this.pass, this.score, this.feedback, this.metadata});
    }
}
```

### Evaluator

为自定义评估器提供统一的接口

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>evaluate<br/></td><td>执行评估的核心逻辑<br/></td></tr>
<tr>
<td>doGetSupportingData<br/></td><td>提取额外的上下文知识<br/></td></tr>
</table>


```java
package org.springframework.ai.evaluation;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.ai.document.Document;
import org.springframework.util.StringUtils;

@FunctionalInterface
public interface Evaluator {
    EvaluationResponse evaluate(EvaluationRequest evaluationRequest);

    default String doGetSupportingData(EvaluationRequest evaluationRequest) {
        List<Document> data = evaluationRequest.getDataList();
        return (String)data.stream().map(Document::getText).filter(StringUtils::hasText).collect(Collectors.joining(System.lineSeparator()));
    }
}
```

#### RelevancyEvaluator

相关性评估器，用于判断模型生成的响应是否与用户查询和上下文数据一致

- `ChatClient.Builder chatClientBuilder`：客户端的建造者
- `PromptTemplate promptTemplate`：相关性的提示词模版

evaluate 方法的核心逻辑如下：

1. 从 EvaluationRequest 提取响应内容和上下文数据
2. 使用 promptTemplate 渲染完整提示词
3. 通过 chatClientBuilder 构建聊天客户端并调用模型
4. 解析模型输出，判断是否为 "YES" 来决定评估结果

```java
package org.springframework.ai.chat.evaluation;

import java.util.Collections;
import java.util.Map;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.evaluation.EvaluationRequest;
import org.springframework.ai.evaluation.EvaluationResponse;
import org.springframework.ai.evaluation.Evaluator;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

public class RelevancyEvaluator implements Evaluator {
    private static final PromptTemplate DEFAULTPROMPTTEMPLATE = new PromptTemplate("\tYour task is to evaluate if the response for the query\n\tis in line with the context information provided.\n\n\tYou have two options to answer. Either YES or NO.\n\n\tAnswer YES, if the response for the query\n\tis in line with context information otherwise NO.\n\n\tQuery:\n\t{query}\n\n\tResponse:\n\t{response}\n\n\tContext:\n\t{context}\n\n\tAnswer:\n");
    private final ChatClient.Builder chatClientBuilder;
    private final PromptTemplate promptTemplate;

    public RelevancyEvaluator(ChatClient.Builder chatClientBuilder) {
        this(chatClientBuilder, (PromptTemplate)null);
    }

    private RelevancyEvaluator(ChatClient.Builder chatClientBuilder, @Nullable PromptTemplate promptTemplate) {
        Assert.notNull(chatClientBuilder, "chatClientBuilder cannot be null");
        this.chatClientBuilder = chatClientBuilder;
        this.promptTemplate = promptTemplate != null ? promptTemplate : DEFAULTPROMPTTEMPLATE;
    }

    public EvaluationResponse evaluate(EvaluationRequest evaluationRequest) {
        String response = evaluationRequest.getResponseContent();
        String context = this.doGetSupportingData(evaluationRequest);
        String userMessage = this.promptTemplate.render(Map.of("query", evaluationRequest.getUserText(), "response", response, "context", context));
        String evaluationResponse = this.chatClientBuilder.build().prompt().user(userMessage).call().content();
        boolean passing = false;
        float score = 0.0F;
        if (evaluationResponse != null && evaluationResponse.toLowerCase().contains("yes")) {
            passing = true;
            score = 1.0F;
        }

        return new EvaluationResponse(passing, score, "", Collections.emptyMap());
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private ChatClient.Builder chatClientBuilder;
        private PromptTemplate promptTemplate;

        private Builder() {
        }

        public Builder chatClientBuilder(ChatClient.Builder chatClientBuilder) {
            this.chatClientBuilder = chatClientBuilder;
            return this;
        }

        public Builder promptTemplate(PromptTemplate promptTemplate) {
            this.promptTemplate = promptTemplate;
            return this;
        }

        public RelevancyEvaluator build() {
            return new RelevancyEvaluator(this.chatClientBuilder, this.promptTemplate);
        }
    }
}
```
