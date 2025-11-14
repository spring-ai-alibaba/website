---
title: 多节点并行执行
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba Graph的第多节点并行执行示例"
---

> Graph 中，当前节点不依赖上游节点的结果，可并行处理

实战代码可见：[spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) 下的 graph 目录，本章为其 parallel-node 模块

### pom.xml

这里使用 1.0.0.3-SNAPSHOT。在定义 StateGraph 方面和 1.0.0.2 有些变动

```xml
<properties>
    <spring-ai-alibaba.version>1.0.0.3-SNAPSHOT</spring-ai-alibaba.version>
</properties>

<dependencies>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-graph-core</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

### application.yml

```yaml
server:
  port: 8080
spring:
  application:
    name: simple
  ai:
    openai:
      api-key: ${AIDASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
```

### config

OverAllState 中存储的字段

- query：用户的问题
- expandernumber：扩展的数量
- expandercontent：扩展的内容
- translatelanguage：翻译的目标语言
- translatecontent：翻译的内容
- mergeresult：合并扩展节点、翻译节点后的结果

定义 ExpanderNode、TranslateNode、内部定义 MergeResultsNode

边的连接为：

```java
START -> expander -> merge
START -> translate -> merge

merge -> END
```

```java
package com.spring.ai.tutorial.graph.parallel.config;

import com.alibaba.cloud.ai.graph.GraphRepresentation;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.spring.ai.tutorial.graph.parallel.node.ExpanderNode;
import com.spring.ai.tutorial.graph.parallel.node.TranslateNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

/**
 * @author yingzi
 * @since 2025/6/13
 */
@Configuration
public class ParallelGraphConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(ParallelGraphConfiguration.class);

    @Bean
    public StateGraph parallelGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();

            // 用户输入
            keyStrategyHashMap.put("query", new ReplaceStrategy());

            keyStrategyHashMap.put("expandernumber", new ReplaceStrategy());
            keyStrategyHashMap.put("expandercontent", new ReplaceStrategy());

            keyStrategyHashMap.put("translatelanguage", new ReplaceStrategy());
            keyStrategyHashMap.put("translatecontent", new ReplaceStrategy());

            keyStrategyHashMap.put("mergeresult", new ReplaceStrategy());

            return keyStrategyHashMap;
        };

        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("expander", nodeasync(new ExpanderNode(chatClientBuilder)))
                .addNode("translate", nodeasync(new TranslateNode(chatClientBuilder)))
                .addNode("merge", nodeasync(new MergeResultsNode()))

                .addEdge(StateGraph.START, "expander")
                .addEdge(StateGraph.START, "translate")
                .addEdge("translate", "merge")
                .addEdge("expander", "merge")

                .addEdge("merge", StateGraph.END);

        // 添加 PlantUML 打印
        GraphRepresentation representation = stateGraph.getGraph(GraphRepresentation.Type.PLANTUML,
                "expander flow");
        logger.info("\n=== expander UML Flow ===");
        logger.info(representation.content());
        logger.info("==================================\n");

        return stateGraph;
    }

    private record MergeResultsNode() implements NodeAction {
        @Override
        public Map<String, Object> apply(OverAllState state) {
            Object expanderContent = state.value("expandercontent").orElse("unknown");
            String translateContent = (String) state.value("translatecontent").orElse("");

            return Map.of("mergeresult", Map.of("expandercontent", expanderContent,
                    "translatecontent", translateContent));
        }
    }
}
```

### node

#### ExpanderNode

- PromptTemplate DEFAULTPROMPTTEMPLATE：扩展文本的提示词
- ChatClient chatClient：调用 AI 模型的 client 端
- Integer NUMBER：默认扩展为 3 条相似问题

最后将 AI 模型的响应内容返回给给到字段 expandercontent 中

```java
package com.spring.ai.tutorial.graph.node;

import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.bsc.async.AsyncGenerator;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.PromptTemplate;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class ExpanderNode implements NodeAction {

    private static final PromptTemplate DEFAULTPROMPTTEMPLATE = new PromptTemplate("You are an expert at information retrieval and search optimization.\nYour task is to generate {number} different versions of the given query.\n\nEach variant must cover different perspectives or aspects of the topic,\nwhile maintaining the core intent of the original query. The goal is to\nexpand the search space and improve the chances of finding relevant information.\n\nDo not explain your choices or add any other text.\nProvide the query variants separated by newlines.\n\nOriginal query: {query}\n\nQuery variants:\n");

    private final ChatClient chatClient;

    private final Integer NUMBER = 3;

    public ExpanderNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = state.value("query", "");
        Integer expanderNumber = state.value("expandernumber", this.NUMBER);


        Flux<String> streamResult = this.chatClient.prompt().user((user) -> user.text(DEFAULTPROMPTTEMPLATE.getTemplate()).param("number", expanderNumber).param("query", query)).stream().content();
        String result = streamResult.reduce("", (acc, item) -> acc + item).block();
        List<String> queryVariants = Arrays.asList(result.split("\n"));

        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("expandercontent", queryVariants);
        return resultMap;
    }
}
```

#### TranslateNode

- PromptTemplate DEFAULTPROMPTTEMPLATE：翻译文本的提示词
- ChatClient chatClient：调用 AI 模型的 client 端
- String TARGETLANGUAGE：默认翻译为英文

最后将 AI 模型的响应内容返回给给到字段 translatecontent 中

```java
package com.spring.ai.tutorial.graph.parallel.node;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.Map;


public class TranslateNode implements NodeAction {

    private static final PromptTemplate DEFAULTPROMPTTEMPLATE = new PromptTemplate("Given a user query, translate it to {targetLanguage}.\nIf the query is already in {targetLanguage}, return it unchanged.\nIf you don't know the language of the query, return it unchanged.\nDo not add explanations nor any other text.\n\nOriginal query: {query}\n\nTranslated query:\n");

    private final ChatClient chatClient;

    private final String  TARGETLANGUAGE= "English";

    public TranslateNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        String query = state.value("query", "");
        String targetLanguage = state.value("translatelanguage", TARGETLANGUAGE);

        Flux<String> streamResult = this.chatClient.prompt().user((user) -> user.text(DEFAULTPROMPTTEMPLATE.getTemplate()).param("targetLanguage", targetLanguage).param("query", query)).stream().content();
        String result = streamResult.reduce("", (acc, item) -> acc + item).block();

        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("translatecontent", result);
        return resultMap;
    }
}
```

#### MergeResultsNode

将 ExpanderNode、TranslateNode 处理得到的结果塞入 mergeresult 字段中

```java
private record MergeResultsNode() implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        Object expanderContent = state.value("expandercontent").orElse("unknown");
        String translateContent = (String) state.value("translatecontent").orElse("");

        return Map.of("mergeresult", Map.of("expandercontent", expanderContent,
                "translatecontent", translateContent));
    }
}
```

### controller

```java
package com.spring.ai.tutorial.graph.parallel.controller;

import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/graph/parallel")
public class ParallelController {

    private static final Logger logger = LoggerFactory.getLogger(ParallelController.class);

    private final CompiledGraph compiledGraph;

    public ParallelController(@Qualifier("parallelGraph") StateGraph stateGraph) throws GraphStateException {
        this.compiledGraph = stateGraph.compile();
    }

    @GetMapping(value = "/expand-translate")
    public Map<String, Object> expandAndTranslate(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？", required = false) String query,
                                      @RequestParam(value = "expandernumber", defaultValue = "3", required = false) Integer  expanderNumber,
                                      @RequestParam(value = "translatelanguage", defaultValue = "english", required = false) String translateLanguage,
                                      @RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId){
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        Map<String, Object> objectMap = new HashMap<>();
        objectMap.put("query", query);
        objectMap.put("expandernumber", expanderNumber);
        objectMap.put("translatelanguage", translateLanguage);

        Optional<OverAllState> invoke = this.compiledGraph.invoke(objectMap, runnableConfig);

        return invoke.map(OverAllState::data).orElse(new HashMap<>());
    }

}
```

#### 效果
![](/img/user/ai/tutorials/graph/X9yHbGypQoTzvixzyA6cNNwkn7d.png)
