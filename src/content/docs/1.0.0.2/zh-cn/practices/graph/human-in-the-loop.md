---
title: 人类反馈
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "在构建agent工作流中，人类反馈是很常见的场景，本期介绍如何利用Spring Ai Alibaba Graph构建工作流时，中断 -> 人类反馈介入 -> 无缝衔接剩下流程"
---

## 人类反馈复原案例
> 在实际业务场景中，经常会遇到人类介入的场景，人类的不同操作将影响工作流不同的走向

以下实现一个简单案例：包含三个节点，扩展节点、人类节点、翻译节点

- 扩展节点：AI 模型流式对问题进行扩展输出
- 人类节点：通过对用户的反馈，决定是直接结束，还是接着执行翻译节点
- 翻译节点：将问题翻译为其他英文

实战代码可见：[spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) 下的 graph 目录，本章代码为其 human-node 模块

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
    name: human-node
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
- feedback：人类反馈的内容
- humannextnode：人类反馈后的下一个节点
- translatelanguage：翻译的目标语言，默认为英文
- translatecontent：翻译的内容

定义 ExpanderNode，边的连接为：

```bash
START -> expander -> humanfeedback
humanfeedback -> translate
humanfeedback -> END
translate -> END
```

```java
package com.spring.ai.tutorial.graph.human.config;

import com.alibaba.cloud.ai.graph.GraphRepresentation;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.AsyncEdgeAction;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.spring.ai.tutorial.graph.human.dispatcher.HumanFeedbackDispatcher;
import com.spring.ai.tutorial.graph.human.node.ExpanderNode;
import com.spring.ai.tutorial.graph.human.node.HumanFeedbackNode;
import com.spring.ai.tutorial.graph.human.node.TranslateNode;
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
public class GraphHumanConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(GraphHumanConfiguration.class);

    @Bean
    public StateGraph humanGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
            // 用户输入
            keyStrategyHashMap.put("query", new ReplaceStrategy());
            keyStrategyHashMap.put("threadid", new ReplaceStrategy());

            keyStrategyHashMap.put("expandernumber", new ReplaceStrategy());
            keyStrategyHashMap.put("expandercontent", new ReplaceStrategy());

            // 人类反馈
            keyStrategyHashMap.put("feedback", new ReplaceStrategy());
            keyStrategyHashMap.put("humannextnode", new ReplaceStrategy());

            // 是否需要翻译
            keyStrategyHashMap.put("translatelanguage", new ReplaceStrategy());
            keyStrategyHashMap.put("translatecontent", new ReplaceStrategy());
            return keyStrategyHashMap;
        };

        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("expander", nodeasync(new ExpanderNode(chatClientBuilder)))
                .addNode("translate", nodeasync(new TranslateNode(chatClientBuilder)))
                .addNode("humanfeedback", nodeasync(new HumanFeedbackNode()))

                .addEdge(StateGraph.START, "expander")
                .addEdge("expander", "humanfeedback")
                .addConditionalEdges("humanfeedback", AsyncEdgeAction.edgeasync((new HumanFeedbackDispatcher())), Map.of(
                        "translate", "translate", StateGraph.END, StateGraph.END))
                .addEdge("translate", StateGraph.END);

        // 添加 PlantUML 打印
        GraphRepresentation representation = stateGraph.getGraph(GraphRepresentation.Type.PLANTUML,
                "human flow");
        logger.info("\n=== expander UML Flow ===");
        logger.info(representation.content());
        logger.info("==================================\n");

        return stateGraph;
    }
}
```

### node

#### ExpanderNode

```java
package com.spring.ai.tutorial.graph.human.node;

import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.async.AsyncGenerator;
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.PromptTemplate;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author yingzi
 * @since 2025/6/13
 */

public class ExpanderNode implements NodeAction {

    private static final Logger logger = LoggerFactory.getLogger(ExpanderNode.class);

    private static final PromptTemplate DEFAULTPROMPTTEMPLATE = new PromptTemplate("You are an expert at information retrieval and search optimization.\nYour task is to generate {number} different versions of the given query.\n\nEach variant must cover different perspectives or aspects of the topic,\nwhile maintaining the core intent of the original query. The goal is to\nexpand the search space and improve the chances of finding relevant information.\n\nDo not explain your choices or add any other text.\nProvide the query variants separated by newlines.\n\nOriginal query: {query}\n\nQuery variants:\n");

    private final ChatClient chatClient;

    private final Integer NUMBER = 3;

    public ExpanderNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        logger.info("expander node is running.");

        String query = state.value("query", "");
        Integer expanderNumber = state.value("expandernumber", this.NUMBER);

        Flux<ChatResponse> chatResponseFlux = this.chatClient.prompt().user((user) -> user.text(DEFAULTPROMPTTEMPLATE.getTemplate()).param("number", expanderNumber).param("query", query)).stream().chatResponse();

        AsyncGenerator<? extends NodeOutput> generator = StreamingChatGenerator.builder()
                .startingNode("expanderllmstream")
                .startingState(state)
                .mapResult(response -> {
                    String text = response.getResult().getOutput().getText();
                    List<String> queryVariants = Arrays.asList(text.split("\n"));
                    return Map.of("expandercontent", queryVariants);
                }).build(chatResponseFlux);
        return Map.of("expandercontent", generator);
    }

}
```

#### HumanFeedbackNode

```java
package com.spring.ai.tutorial.graph.human.node;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * @author yingzi
 * @since 2025/6/19
 */

public class HumanFeedbackNode implements NodeAction {

    private static final Logger logger = LoggerFactory.getLogger(HumanFeedbackNode.class);

    @Override
    public Map<String, Object> apply(OverAllState state) {
        logger.info("humanfeedback node is running.");
        HashMap<String, Object> resultMap = new HashMap<>();
        String nextStep = StateGraph.END;

        Map<String, Object> feedBackData = state.humanFeedback().data();
        boolean feedback = (boolean) feedBackData.getOrDefault("feedback", true);
        if (feedback) {
            nextStep = "translate";
        }

        resultMap.put("humannextnode", nextStep);
        logger.info("humanfeedback node -> {} node", nextStep);
        return resultMap;
    }
}
```

#### TranslateNode

```java
package com.spring.ai.tutorial.graph.human.node;

import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.alibaba.cloud.ai.graph.async.AsyncGenerator;
import com.alibaba.cloud.ai.graph.streaming.StreamingChatGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.PromptTemplate;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author yingzi
 * @since 2025/6/13
 */

public class TranslateNode implements NodeAction {

    private static final Logger logger = LoggerFactory.getLogger(ExpanderNode.class);

    private static final PromptTemplate DEFAULTPROMPTTEMPLATE = new PromptTemplate("Given a user query, translate it to {targetLanguage}.\nIf the query is already in {targetLanguage}, return it unchanged.\nIf you don't know the language of the query, return it unchanged.\nDo not add explanations nor any other text.\n\nOriginal query: {query}\n\nTranslated query:\n");

    private final ChatClient chatClient;

    private final String  TARGETLANGUAGE= "English";

    public TranslateNode(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        logger.info("translate node is running.");

        String query = state.value("query", "");
        String targetLanguage = state.value("translatelanguage", TARGETLANGUAGE);

        Flux<ChatResponse> chatResponseFlux = this.chatClient.prompt().user((user) -> user.text(DEFAULTPROMPTTEMPLATE.getTemplate()).param("targetLanguage", targetLanguage).param("query", query)).stream().chatResponse();
        AsyncGenerator<? extends NodeOutput> generator = StreamingChatGenerator.builder()
                .startingNode("translatellmstream")
                .startingState(state)
                .mapResult(response -> {
                    String text = response.getResult().getOutput().getText();
                    List<String> queryVariants = Arrays.asList(text.split("\n"));
                    return Map.of("translatecontent", queryVariants);
                }).build(chatResponseFlux);
        return Map.of("translatecontent", generator);
    }
}
```

### edge

人类节点的下一个边是条件边，由 HumanFeedbackDispatcher 控制下一步跳转到哪一个节点

```java
package com.spring.ai.tutorial.graph.human.dispatcher;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.action.EdgeAction;

/**
 * @author yingzi
 * @since 2025/6/19
 */

public class HumanFeedbackDispatcher implements EdgeAction {
    @Override
    public String apply(OverAllState state) throws Exception {
        return (String) state.value("humannextnode", StateGraph.END);
    }
}
```

### controller

#### GraphHumanController

- CompileConfig.builder().saverConfig(saverConfig).interruptBefore("humanfeedback"）：在人类反馈节点前断流
- Sinks.Many<ServerSentEvent<String>> sink：接收 Stream 数据

```java
package com.spring.ai.tutorial.graph.human.controller;

import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.async.AsyncGenerator;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.StateSnapshot;
import com.spring.ai.tutorial.graph.human.controller.GraphProcess.GraphProcess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.HashMap;
import java.util.Map;

/**
 * @author yingzi
 * @since 2025/6/13
 */
@RestController
@RequestMapping("/graph/human")
public class GraphHumanController {

    private static final Logger logger = LoggerFactory.getLogger(GraphHumanController.class);

    private final CompiledGraph compiledGraph;

    @Autowired
    public GraphHumanController(@Qualifier("humanGraph") StateGraph stateGraph) throws GraphStateException {
        SaverConfig saverConfig = SaverConfig.builder().register(SaverConstant.MEMORY, new MemorySaver()).build();
        this.compiledGraph = stateGraph
                .compile(CompileConfig.builder().saverConfig(saverConfig).interruptBefore("humanfeedback").build());    }

    @GetMapping(value = "/expand", produces = MediaType.TEXTEVENTSTREAMVALUE)
    public Flux<ServerSentEvent<String>> expand(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？", required = false) String query,
                                                @RequestParam(value = "expandernumber", defaultValue = "3", required = false) Integer expanderNumber,
                                                @RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId) throws GraphRunnerException {
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        Map<String, Object> objectMap = new HashMap<>();
        objectMap.put("query", query);
        objectMap.put("expandernumber", expanderNumber);

        GraphProcess graphProcess = new GraphProcess(this.compiledGraph);
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().unicast().onBackpressureBuffer();
        AsyncGenerator<NodeOutput> resultFuture = compiledGraph.stream(objectMap, runnableConfig);
        graphProcess.processStream(resultFuture, sink);

        return sink.asFlux()
                .doOnCancel(() -> logger.info("Client disconnected from stream"))
                .doOnError(e -> logger.error("Error occurred during streaming", e));
    }

    @GetMapping(value = "/resume", produces = MediaType.TEXTEVENTSTREAMVALUE)
    public Flux<ServerSentEvent<String>> resume(@RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId,
                                      @RequestParam(value = "feedback", defaultValue = "true", required = false) boolean feedBack) throws GraphRunnerException {
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        StateSnapshot stateSnapshot = this.compiledGraph.getState(runnableConfig);
        OverAllState state = stateSnapshot.state();
        state.withResume();

        Map<String, Object> objectMap = new HashMap<>();
        objectMap.put("feedback", feedBack);

        state.withHumanFeedback(new OverAllState.HumanFeedback(objectMap, ""));

        // Create a unicast sink to emit ServerSentEvents
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().unicast().onBackpressureBuffer();
        GraphProcess graphProcess = new GraphProcess(this.compiledGraph);
        AsyncGenerator<NodeOutput> resultFuture = compiledGraph.streamFromInitialNode(state, runnableConfig);
        graphProcess.processStream(resultFuture, sink);

        return sink.asFlux()
                .doOnCancel(() -> logger.info("Client disconnected from stream"))
                .doOnError(e -> logger.error("Error occurred during streaming", e));    }
}
```

##### GraphProcess

- ExecutorService executor：配置线程池，获取 stream 流

将结果写入到 sink 中

```java
package com.spring.ai.tutorial.graph.stream.controller.GraphProcess;

import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.streaming.StreamingOutput;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import org.bsc.async.AsyncGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GraphProcess {

    private static final Logger logger = LoggerFactory.getLogger(GraphProcess.class);

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private CompiledGraph compiledGraph;

    public GraphProcess(CompiledGraph compiledGraph) {
        this.compiledGraph = compiledGraph;
    }

    public void processStream(AsyncGenerator<NodeOutput> generator, Sinks.Many<ServerSentEvent<String>> sink) {
        executor.submit(() -> {
            generator.forEachAsync(output -> {
                try {
                    logger.info("output = {}", output);
                    String nodeName = output.node();
                    String content;
                    if (output instanceof StreamingOutput streamingOutput) {
                        content = JSON.toJSONString(Map.of(nodeName, streamingOutput.chunk()));
                    } else {
                        JSONObject nodeOutput = new JSONObject();
                        nodeOutput.put("data", output.state().data());
                        nodeOutput.put("node", nodeName);
                        content = JSON.toJSONString(nodeOutput);
                    }
                    sink.tryEmitNext(ServerSentEvent.builder(content).build());
                } catch (Exception e) {
                    throw new CompletionException(e);
                }
            }).thenAccept(v -> {
                // 正常完成
                sink.tryEmitComplete();
            }).exceptionally(e -> {
                sink.tryEmitError(e);
                return null;
            });
        });
    }
}
```

#### 效果

调用 expand 接口，流式输出 && 断流得到最终结果
![](/img/user/ai/tutorials/graph/PoNhbwWV0oa0QixIMsHcsdYFn8f.png)

再调用 resume 接口，状态恢复续上流，接着走后续逻辑
![](/img/user/ai/tutorials/graph/HPNUbeoWioKO3px26yccElXWnre.png)
