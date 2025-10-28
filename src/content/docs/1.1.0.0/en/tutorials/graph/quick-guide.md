---
title: Quick Start
keywords: [Spring AI,Tongyi Qianwen,Bailian,Intelligent Agent Applications]
description: "The first introductory example of Spring AI Alibaba Graph, building the prototype of an agent workflow"
---

Framework code address: [https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-graph](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-graph)

Below is the simplest graph example, which implements expansion of several similar queries based on a user's question.

The practical code can be found at: [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) under the graph directory. This chapter's code is in the simple module.

### pom.xml

Here we use version 1.0.0.3-SNAPSHOT. There are some changes in StateGraph definition compared to 1.0.0.2

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

Fields stored in OverAllState:

- query: user's question
- expandernumber: number of expansions
- expandercontent: expansion content

Define ExpanderNode, with edges connecting: START -> expander -> END

```java
package com.spring.ai.tutorial.graph.config;

import com.alibaba.cloud.ai.graph.GraphRepresentation;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.spring.ai.tutorial.graph.node.ExpanderNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

@Configuration
public class GraphConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(GraphConfiguration.class);

    @Bean
    public StateGraph simpleGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();

            // User input
            keyStrategyHashMap.put("query", new ReplaceStrategy());
            keyStrategyHashMap.put("expandernumber", new ReplaceStrategy());
            keyStrategyHashMap.put("expandercontent", new ReplaceStrategy());
            return keyStrategyHashMap;
        };

        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("expander", nodeasync(new ExpanderNode(chatClientBuilder)))
                .addEdge(StateGraph.START, "expander")
                .addEdge("expander", StateGraph.END);

        // Add PlantUML printing
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

- PromptTemplate DEFAULTPROMPTTEMPLATE: prompt for text expansion
- ChatClient chatClient: client for calling the AI model
- Integer NUMBER: default expansion of 3 similar questions

The response content from the AI model is finally returned to the expandercontent field

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

### controller

```java
package com.spring.ai.tutorial.graph.controller;

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
@RequestMapping("/graph")
public class SimpleGraphController {

    private static final Logger logger = LoggerFactory.getLogger(SimpleGraphController.class);

    private final CompiledGraph compiledGraph;

    public SimpleGraphController(@Qualifier("simpleGraph") StateGraph stateGraph) throws GraphStateException {
        this.compiledGraph = stateGraph.compile();
    }

    @GetMapping(value = "/expand")
    public Map<String, Object> expand(@RequestParam(value = "query", defaultValue = "你好，很高兴认识你，能简单介绍一下自己吗？", required = false) String query,
                                                @RequestParam(value = "expandernumber", defaultValue = "3", required = false) Integer  expanderNumber,
                                                @RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId){
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        Map<String, Object> objectMap = new HashMap<>();
        objectMap.put("query", query);
        objectMap.put("expandernumber", expanderNumber);
        Optional<OverAllState> invoke = this.compiledGraph.invoke(objectMap, runnableConfig);
        return invoke.map(OverAllState::data).orElse(new HashMap<>());
    }}
```

#### Effect
![](/img/user/ai/tutorials/graph/HD8hbyfCyomfSvx0NMcceVthnZc.png)
```

</file>

### /Users/ken/aliware/mse/ai/spring-ai-alibaba-website/src/content/docs/1.0.0.2/en/tutorials/graph/parallel-node.md

Now I'll create the English version of the parallel node document:

<file>
```markdown
// filepath: /Users/ken/aliware/mse/ai/spring-ai-alibaba-website/src/content/docs/1.0.0.2/en/tutorials/graph/parallel-node.md
---
title: Parallel Node Execution
keywords: [Spring AI,Tongyi Qianwen,Bailian,Intelligent Agent Applications]
description: "Spring AI Alibaba Graph's parallel node execution example"
---

> In Graph, when the current node doesn't depend on upstream node results, it can be processed in parallel

The practical code can be found at: [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) under the graph directory. This chapter is in the parallel-node module.

### pom.xml

Here we use version 1.0.0.3-SNAPSHOT. There are some changes in StateGraph definition compared to 1.0.0.2

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

Fields stored in OverAllState:

- query: user's question
- expandernumber: number of expansions
- expandercontent: expansion content
- translatelanguage: target language for translation
- translatecontent: translated content
- mergeresult: result after merging expansion node and translation node

Define ExpanderNode, TranslateNode, and internally define MergeResultsNode

The edges connect as follows:

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

            // User input
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

        // Add PlantUML printing
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

- PromptTemplate DEFAULTPROMPTTEMPLATE: prompt for text expansion
- ChatClient chatClient: client for calling the AI model
- Integer NUMBER: default expansion of 3 similar questions

The response content from the AI model is finally returned to the expandercontent field

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

- PromptTemplate DEFAULTPROMPTTEMPLATE: prompt for text translation
- ChatClient chatClient: client for calling the AI model
- String TARGETLANGUAGE: default translation language is English

The response content from the AI model is finally returned to the translatecontent field

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

Places the results processed by ExpanderNode and TranslateNode into the mergeresult field

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

#### Effect
![](/img/user/ai/tutorials/graph/X9yHbGypQoTzvixzyA6cNNwkn7d.png)
```

</file>

### /Users/ken/aliware/mse/ai/spring-ai-alibaba-website/src/content/docs/1.0.0.2/en/tutorials/graph/human-in-the-loop.md

Finally, I'll create the English version of the human-in-the-loop document:

<file>
```markdown
// filepath: /Users/ken/aliware/mse/ai/spring-ai-alibaba-website/src/content/docs/1.0.0.2/en/tutorials/graph/human-in-the-loop.md
---
title: Human Feedback
keywords: [Spring AI,Tongyi Qianwen,Bailian,Intelligent Agent Applications]
description: "Human feedback is a common scenario when building agent workflows. This article introduces how to use Spring AI Alibaba Graph to build workflows with interruption -> human feedback intervention -> seamless continuation of the remaining process"
---

## Human Feedback Recovery Case
> In real business scenarios, human intervention is often encountered. Different human operations will affect different workflow paths.

The following implements a simple case that includes three nodes: expansion node, human node, and translation node.

- Expansion node: AI model streams the expansion output based on the question
- Human node: Decides whether to end directly or continue to execute the translation node based on user feedback
- Translation node: Translates the question into English

The practical code can be found at: [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) under the graph directory. This chapter's code is in the human-node module.

### pom.xml

Here we use version 1.0.0.3-SNAPSHOT. There are some changes in StateGraph definition compared to 1.0.0.2

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

Fields stored in OverAllState:

- query: user's question
- expandernumber: number of expansions
- expandercontent: expansion content
- feedback: human feedback content
- humannextnode: next node after human feedback
- translatelanguage: target language for translation, default is English
- translatecontent: translated content

Define ExpanderNode, with edges connecting:

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
            // User input
            keyStrategyHashMap.put("query", new ReplaceStrategy());
            keyStrategyHashMap.put("threadid", new ReplaceStrategy());

            keyStrategyHashMap.put("expandernumber", new ReplaceStrategy());
            keyStrategyHashMap.put("expandercontent", new ReplaceStrategy());

            // Human feedback
            keyStrategyHashMap.put("feedback", new ReplaceStrategy());
            keyStrategyHashMap.put("humannextnode", new ReplaceStrategy());

            // Whether translation is needed
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

        // Add PlantUML printing
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

The next edge of the human node is a conditional edge, controlled by HumanFeedbackDispatcher to determine which node to jump to next

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

- CompileConfig.builder().saverConfig(saverConfig).interruptBefore("humanfeedback"): Interrupts the flow before the human feedback node
- Sinks.Many<ServerSentEvent<String>> sink: Receives Stream data

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

- ExecutorService executor: Configure thread pool to get stream flow

Write the results to the sink

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
                // Normal completion
                sink.tryEmitComplete();
            }).exceptionally(e -> {
                sink.tryEmitError(e);
                return null;
            });
        });
    }
}
```

#### Effect

Call the expand interface, stream output && interrupt flow to get final result
![](/img/user/ai/tutorials/graph/PoNhbwWV0oa0QixIMsHcsdYFn8f.png)

Then call the resume interface, restore state to continue the flow and handle subsequent logic
![](/img/user/ai/tutorials/graph/HPNUbeoWioKO3px26yccElXWnre.png)
```

</file>
