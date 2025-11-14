---
title: Assigning MCP Tools to Specific Nodes
keywords: [Spring AI,Tongyi Qianwen,Bailian,Intelligent Agent Applications]
description: "When building agents, specific nodes in the Graph need additional capabilities provided by MCP, requiring assignment of specific MCPs to specific node nodes"
---

> Assign specific MCPs to specific node nodes

The practical code can be found at: [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) under the graph directory. This chapter's code is in the mcp-node module.

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

Note the configuration under spring.ai.graph.nodes, mapping node configuration to mcp services

```yaml
server:
  port: 8080
spring:
  application:
    name: mcp-node
  ai:
    openai:
      api-key: ${AIDASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
    mcp:
      client:
        enabled: true
        name: my-mcp-client
        version: 1.0.0
        request-timeout: 30s
        type: ASYNC  # or ASYNC for reactive applications
        sse:
          connections:
            server1:
              url: http://localhost:19000

    graph:
      nodes:
        node2servers:
          mcp-node:
            - server1
```

### config

#### McpNodeProperties

Class mapping node configuration to mcp services

```java
package com.spring.ai.tutorial.graph.mcp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;
import java.util.Set;

@ConfigurationProperties(prefix = McpNodeProperties.PREFIX)
public class McpNodeProperties {

    public static final String PREFIX = "spring.ai.graph.nodes";

    private Map<String, Set<String>> node2servers;

    public Map<String, Set<String>> getNode2servers() {
        return node2servers;
    }

    public void setNode2servers(Map<String, Set<String>> node2servers) {
        this.node2servers = node2servers;
    }
}
```

#### McpGaphConfiguration

Inject McpClientToolCallbackProvider for use in McpNode

```java
package com.spring.ai.tutorial.graph.mcp.config;

import com.alibaba.cloud.ai.graph.GraphRepresentation;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import com.spring.ai.tutorial.graph.mcp.node.McpNode;
import com.spring.ai.tutorial.graph.mcp.tool.McpClientToolCallbackProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

@Configuration
@EnableConfigurationProperties({ McpNodeProperties.class })
public class McpGaphConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(McpGaphConfiguration.class);

    @Autowired
    private McpClientToolCallbackProvider mcpClientToolCallbackProvider;

    @Bean
    public StateGraph mcpGraph(ChatClient.Builder chatClientBuilder) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () -> {
            HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();

            // User input
            keyStrategyHashMap.put("query", new ReplaceStrategy());
            keyStrategyHashMap.put("mcpcontent", new ReplaceStrategy());
            return keyStrategyHashMap;
        };

        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("mcp", nodeasync(new McpNode(chatClientBuilder, mcpClientToolCallbackProvider)))

                .addEdge(StateGraph.START, "mcp")
                .addEdge("mcp", StateGraph.END);

        // Add PlantUML printing
        GraphRepresentation representation = stateGraph.getGraph(GraphRepresentation.Type.PLANTUML,
                "mcp flow");
        logger.info("\n=== mcp UML Flow ===");
        logger.info(representation.content());
        logger.info("==================================\n");

        return stateGraph;
    }
}
```

### tool

#### McpClientToolCallbackProvider

Match corresponding ToolCallback provided by MCP based on node name

```java
package com.spring.ai.tutorial.graph.mcp.tool;

import com.spring.ai.tutorial.graph.mcp.config.McpNodeProperties;
import org.apache.commons.compress.utils.Lists;
import org.glassfish.jersey.internal.guava.Sets;
import org.springframework.ai.mcp.McpToolUtils;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class McpClientToolCallbackProvider {

    private final ToolCallbackProvider toolCallbackProvider;

    private final McpClientCommonProperties commonProperties;

    private final McpNodeProperties mcpNodeProperties;

    public McpClientToolCallbackProvider(ToolCallbackProvider toolCallbackProvider,
                                         McpClientCommonProperties commonProperties, McpNodeProperties mcpNodeProperties) {
        this.toolCallbackProvider = toolCallbackProvider;
        this.commonProperties = commonProperties;
        this.mcpNodeProperties = mcpNodeProperties;
    }

    public Set<ToolCallback> findToolCallbacks(String nodeName) {
        Set<ToolCallback> defineCallback = Sets.newHashSet();
        Set<String> mcpClients = mcpNodeProperties.getNode2servers().get(nodeName);
        if (mcpClients == null || mcpClients.isEmpty()) {
            return defineCallback;
        }

        List<String> exceptMcpClientNames = Lists.newArrayList();
        for (String mcpClient : mcpClients) {
            // my-mcp-client
            String name = commonProperties.getName();
            // mymcpclientserver1
            String prefixedMcpClientName = McpToolUtils.prefixedToolName(name, mcpClient);
            exceptMcpClientNames.add(prefixedMcpClientName);
        }

        ToolCallback[] toolCallbacks = toolCallbackProvider.getToolCallbacks();
        for (ToolCallback toolCallback : toolCallbacks) {
            ToolDefinition toolDefinition = toolCallback.getToolDefinition();
            // mymcpclientserver1getCityTimeMethod
            String name = toolDefinition.name();
            for (String exceptMcpClientName : exceptMcpClientNames) {
                if (name.startsWith(exceptMcpClientName)) {
                    defineCallback.add(toolCallback);
                }
            }
        }
        return defineCallback;
    }
}
```

### node

#### McpNode

Find the ToolCallback for the current node through McpClientToolCallbackProvider

```java
package com.spring.ai.tutorial.graph.mcp.node;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.action.NodeAction;
import com.spring.ai.tutorial.graph.mcp.tool.McpClientToolCallbackProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class McpNode implements NodeAction {

    private static final Logger logger = LoggerFactory.getLogger(McpNode.class);
    
    private static final String NODENAME = "mcp-node";

    private final ChatClient chatClient;

    public McpNode(ChatClient.Builder chatClientBuilder, McpClientToolCallbackProvider mcpClientToolCallbackProvider) {
        Set<ToolCallback> toolCallbacks = mcpClientToolCallbackProvider.findToolCallbacks(NODENAME);
        for (ToolCallback toolCallback : toolCallbacks) {
            logger.info("Mcp Node load ToolCallback: " + toolCallback.getToolDefinition().name());
        }

        this.chatClient = chatClientBuilder
                .defaultToolCallbacks(toolCallbacks.toArray(ToolCallback[]::new))
                .build();
    }


    @Override
    public Map<String, Object> apply(OverAllState state) {
        String query = state.value("query", "");
        Flux<String> streamResult = chatClient.prompt(query).stream().content();
        String result = streamResult.reduce("", (acc, item) -> acc + item).block();

        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("mcpcontent", result);

        return resultMap;
    }
}
```

### controller

#### McpController

```java
package com.spring.ai.tutorial.graph.mcp.controller;

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
@RequestMapping("/graph/mcp")
public class McpController {

    private static final Logger logger = LoggerFactory.getLogger(McpController.class);

    private final CompiledGraph compiledGraph;

    public McpController(@Qualifier("mcpGraph") StateGraph stateGraph) throws GraphStateException {
        this.compiledGraph = stateGraph.compile();
    }

    @GetMapping("/call")
    public Map<String, Object> call(@RequestParam(value = "query", defaultValue = "北京时间现在几点钟", required = false) String query,
                                      @RequestParam(value = "threadid", defaultValue = "yingzi", required = false) String threadId){
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        Map<String, Object> objectMap = new HashMap<>();
        objectMap.put("query", query);
        Optional<OverAllState> invoke = this.compiledGraph.invoke(objectMap, runnableConfig);
        return invoke.map(OverAllState::data).orElse(new HashMap<>());
    }

}
```

### MCP Server Service Provision

Provide an MCP Server service, which can be remote or local

Here we start a local MCP Server that provides a time service

### Effect

Start local MCP Server to provide time service
![](/img/user/ai/tutorials/graph/NivBbKqXooFsgexeeRrcIV0rnEf.png)

Call the interface, triggering the time service provided by the local MCP Server
![](/img/user/ai/tutorials/graph/LMPkbZ5heoHs2Qx604kcdiplnlc.png)
