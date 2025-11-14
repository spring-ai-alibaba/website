---
title: 节点流式输出
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Graph将多个节点连接在一起进行工作流编排，其中某个节点在调用AI模型时，该节点需要流式的将AI模型响应结果给到前端"
---

Graph将多个节点连接在一起进行工作流编排，其中某个节点在调用AI模型时，该节点需要流式的将AI模型响应结果给到前端

实战代码可见：[spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) 下的 graph 目录，本章代码为其 stream-node 模块

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

定义 ExpanderNode，边的连接为：START -> expander -> END

```java
package com.spring.ai.tutorial.graph.stream.config;

import com.alibaba.cloud.ai.graph.GraphRepresentation;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.spring.ai.tutorial.graph.stream.node.ExpanderNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

@Configuration
public class GraphNodeStreamConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(GraphNodeStreamConfiguration.class);

    @Bean
    public StateGraph streamGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();

            // 用户输入
            keyStrategyHashMap.put("query", new ReplaceStrategy());
            keyStrategyHashMap.put("expandernumber", new ReplaceStrategy());
            keyStrategyHashMap.put("expandercontent", new ReplaceStrategy());
            return keyStrategyHashMap;
        };

        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("expander", nodeasync(new ExpanderNode(chatClientBuilder)))
                .addEdge(StateGraph.START, "expander")
                .addEdge("expander", StateGraph.END);

        // 添加 PlantUML 打印
        GraphRepresentation representation = stateGraph.getGraph(GraphRepresentation.Type.PLANTUML,
                "expander flow");
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
package com.spring.ai.tutorial.graph.stream.node;

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

### controller

#### GraphStreamController

- Sinks.Many<ServerSentEvent<String>> sink：接收 Stream 数据

```java
package com.spring.ai.tutorial.graph.stream.controller;

import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.spring.ai.tutorial.graph.stream.controller.GraphProcess.GraphProcess;
import org.bsc.async.AsyncGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

@RestController
@RequestMapping("/graph/stream")
public class GraphStreamController {

    private static final Logger logger = LoggerFactory.getLogger(GraphStreamController.class);

    private final CompiledGraph compiledGraph;

    public GraphStreamController(@Qualifier("streamGraph")StateGraph stateGraph) throws GraphStateException {
        this.compiledGraph = stateGraph.compile();
    }

    @GetMapping(value = "/expand", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> expand(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？", required = false) String query,
                                                @RequestParam(value = "expandernumber", defaultValue = "3", required = false) Integer  expanderNumber,
                                                @RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId){
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
![](/img/user/ai/tutorials/graph/KHSBb6HzYogFBkx433jc4vfvnHh.png)
