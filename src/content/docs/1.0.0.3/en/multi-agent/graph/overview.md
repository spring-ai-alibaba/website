---
title: Graph Overview
keywords: ["Spring AI Alibaba", "Graph", "StateGraph", "Multi-Agent", "Workflow"]
description: "Deep dive into the core concepts of Spring AI Alibaba Graph framework, including StateGraph, Node, Edge, CompiledGraph and other fundamental components."
---

## Overview

Spring AI Alibaba Graph is a **state graph workflow framework** for Java developers, designed for building complex multi-step AI applications. It models application logic as a **StateGraph**, where each node represents a computation step and edges define transitions between states.

### Why Do We Need a Graph Framework?

When building complex AI applications, we often encounter the following challenges:

1. **Complex Control Flow**: Need to dynamically decide next steps based on intermediate results
2. **State Management**: Multiple steps need to share and pass complex state information
3. **Parallel Processing**: Some tasks can be executed in parallel to improve efficiency
4. **Error Recovery**: Need to recover from checkpoints when execution fails
5. **Human-in-the-Loop**: Need human intervention at critical decision points
6. **Observability**: Need to monitor and debug complex execution flows

Traditional chain-based approaches (like LangChain's Chain) are simple to use but fall short when handling complex control flows. The Graph framework addresses these issues through:

### Core Features

- **State-Driven Architecture**: Pass data between nodes through shared state, avoiding complex parameter passing
- **Flexible Control Flow**: Support conditional branching, loops, and dynamic routing for complex business logic
- **Native Parallel Support**: Multiple nodes can execute in parallel, significantly improving processing efficiency
- **Persistence and Recovery**: Support checkpoint mechanisms for pausing and resuming execution at any point
- **Human-in-the-Loop**: Built-in interruption mechanisms for human intervention at critical points
- **Powerful Observability**: Provide detailed execution monitoring, visualization, and debugging capabilities
- **Spring Ecosystem Integration**: Fully integrated with Spring Boot, supporting dependency injection and configuration management

### Use Cases

The Graph framework is particularly suitable for:

- **Multi-step Data Processing Pipelines**: Data processing tasks requiring multiple collaborative steps
- **Intelligent Decision Systems**: Decision systems that dynamically adjust execution paths based on intermediate results
- **Complex AI Workflows**: Complex applications involving multiple AI model collaborations
- **Human-Machine Collaboration Processes**: Business processes requiring human review or intervention at key points
- **Long-running Tasks**: Long-running tasks that need interruption and resumption support

Compared to traditional chain-based approaches, the Graph framework can handle more complex control flows, including loops, conditional branches, and parallel execution, making it ideal for building sophisticated AI workflows.

## Core Concepts

### 1. StateGraph (State Graph)

StateGraph is the core class for defining workflows, representing application logic as a directed graph:

- **Nodes**: Represent computation steps, can be LLM calls, tool execution, or any custom logic
- **Edges**: Define transitions between nodes, can be unconditional or state-based conditional transitions
- **State**: Data structure shared throughout the graph execution
- **Entry and Exit**: Use `START` and `END` constants to define graph beginning and end

```java
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

StateGraph workflow = new StateGraph(keyStrategyFactory)
    .addNode("classifier", node_async(classifierAction))
    .addNode("processor", node_async(processorAction))
    .addNode("recorder", node_async(recorderAction))

    .addEdge(START, "classifier")
    .addConditionalEdges("classifier", edge_async(routingLogic), Map.of(
        "positive", "recorder",
        "negative", "processor"
    ))
    .addEdge("processor", "recorder")
    .addEdge("recorder", END);
```

### 2. Node

Nodes are computational units in the graph. Each node receives the current state as input, performs some operation, and returns state updates. Nodes can be:

- **LLM Nodes**: Call large language models for inference
- **Tool Nodes**: Execute external tools or functions
- **Condition Nodes**: Make decisions based on state
- **Data Processing Nodes**: Transform or aggregate data

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;

// Define a simple node action
NodeAction classifierAction = state -> {
    String input = state.value("input", String.class).orElse("");

    // Call LLM for classification
    String classification = chatClient.prompt()
        .user("Please classify the following text sentiment (positive/negative): " + input)
        .call()
        .content();

    // Return state update
    return Map.of("classification", classification.toLowerCase().trim());
};

// Convert sync action to async node
.addNode("classifier", node_async(classifierAction))
```

### 3. Edge

Edge represents transition relationships between nodes, supporting:

- **Static Edges**: Fixed node transitions
- **Conditional Edges**: Dynamically determine next node based on state
- **Parallel Edges**: Execute multiple branches simultaneously

```java
// Static edge
.addEdge("nodeA", "nodeB")

// Conditional edge
.addConditionalEdges("classifier", edge_async(dispatcher), Map.of(
    "category1", "handler1",
    "category2", "handler2",
    "default", "defaultHandler"
))

// Parallel edge
.addEdge("start", List.of("branch1", "branch2", "branch3"))
```

### 4. OverAllState (Global State)

OverAllState is a global state object that spans the entire workflow, supporting:

- **Data Passing**: Share data between nodes
- **State Management**: Support different merge strategies
- **Checkpoint Resume**: Support checkpoints and state recovery
- **Serialization**: Support state persistence

```java
// State factory definition
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("input", new ReplaceStrategy());           // Replace strategy
    strategies.put("messages", new AppendStrategy());         // Append strategy
    strategies.put("results", new MergeStrategy());           // Merge strategy
    return strategies;
};
```

### 5. CompiledGraph

CompiledGraph is the executable version of StateGraph, responsible for:

- **Node Execution**: Execute nodes according to graph structure
- **State Flow**: Manage state passing between nodes
- **Result Output**: Support synchronous and streaming output
- **Interrupt Resume**: Support execution interruption and recovery
- **Parallel Processing**: Support parallel node execution

```java
CompiledGraph app = workflow.compile();

// Synchronous execution
Optional<OverAllState> result = app.invoke(Map.of("input", "user input"));

// Streaming execution
Flux<OverAllState> stream = app.stream(Map.of("input", "user input"));
```

## Understanding State Management in Depth

State management is at the core of the Graph framework. Understanding how state works is crucial for building efficient workflows.

### State Lifecycle

1. **Initialization**: When the graph starts executing, state is initialized with input data
2. **Propagation**: State is passed between nodes, with each node able to read the complete state
3. **Updates**: After node execution, state updates are returned and merged into global state according to strategies
4. **Persistence**: When checkpoints are configured, state is periodically saved
5. **Termination**: When graph execution completes, final state is returned as the result

### State Design Patterns

#### 1. Layered State Pattern

Organize state by functionality layers for better management and maintenance:

```java
KeyStrategyFactory layeredStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // Input layer: Raw input data
    strategies.put("raw_input", KeyStrategy.REPLACE);
    strategies.put("user_context", KeyStrategy.REPLACE);

    // Processing layer: Intermediate processing results
    strategies.put("parsed_data", KeyStrategy.REPLACE);
    strategies.put("analysis_results", KeyStrategy.MERGE);

    // Output layer: Final results
    strategies.put("final_output", KeyStrategy.REPLACE);
    strategies.put("metadata", KeyStrategy.MERGE);

    // Logging layer: Execution logs and debug info
    strategies.put("execution_log", KeyStrategy.APPEND);
    strategies.put("performance_metrics", KeyStrategy.APPEND);

    return strategies;
};
```

#### 2. Versioned State Pattern

For scenarios requiring state change tracking:

```java
NodeAction versionedAction = state -> {
    // Get current version
    Integer version = state.value("version", Integer.class).orElse(0);

    // Save historical version
    Map<String, Object> currentSnapshot = Map.of(
        "version", version,
        "timestamp", System.currentTimeMillis(),
        "data", state.value("data", Object.class).orElse(null)
    );

    // Execute processing logic
    Object processedData = processData(state);

    return Map.of(
        "data", processedData,
        "version", version + 1,
        "history", currentSnapshot  // Use APPEND strategy to save history
    );
};
```

### State Debugging Techniques

#### 1. State Snapshots

Save state snapshots at key nodes for debugging:

```java
NodeAction debuggableAction = state -> {
    // Save input snapshot
    Map<String, Object> inputSnapshot = new HashMap<>(state.data());

    try {
        // Execute business logic
        Object result = performBusinessLogic(state);

        return Map.of(
            "result", result,
            "debug_info", Map.of(
                "input_snapshot", inputSnapshot,
                "execution_time", System.currentTimeMillis(),
                "success", true
            )
        );
    } catch (Exception e) {
        return Map.of(
            "error", e.getMessage(),
            "debug_info", Map.of(
                "input_snapshot", inputSnapshot,
                "error_time", System.currentTimeMillis(),
                "success", false
            )
        );
    }
};
```

## Simple Example

Let's demonstrate these concepts with a simple example:

```java
import com.alibaba.cloud.ai.graph.*;
import com.alibaba.cloud.ai.graph.action.*;
import static com.alibaba.cloud.ai.graph.StateGraph.*;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

@Configuration
public class SimpleGraphExample {

    @Bean
    public CompiledGraph simpleWorkflow() {
        // Define state strategies
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            strategies.put("execution_log", KeyStrategy.APPEND);
            return strategies;
        };

        // Define node action
        NodeAction processAction = state -> {
            String input = state.value("input", String.class).orElse("");
            String processed = "Processed result: " + input.toUpperCase();

            return Map.of(
                "result", processed,
                "execution_log", "Process node completed: " + System.currentTimeMillis()
            );
        };

        // Build graph
        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("process", node_async(processAction))
            .addEdge(START, "process")
            .addEdge("process", END);

        return graph.compile();
    }
}
```

This simple example demonstrates:
- How to define state strategies
- How to create node actions
- How to build and compile graphs
- How to use different state update strategies

## Next Steps

Now that you understand the core concepts of Spring AI Alibaba Graph, you can learn:

- [Basic Usage](./basic-usage) - Detailed API usage guide and practical examples
- [Streaming](./streaming) - How to implement real-time streaming output
- [Persistence](./persistence) - Checkpoints and state recovery
- [Human-in-the-loop](./human-in-the-loop) - Integrating human intervention in workflows
