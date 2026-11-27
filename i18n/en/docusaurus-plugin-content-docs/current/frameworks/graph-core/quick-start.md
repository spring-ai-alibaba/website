---
title: "Graph Core Quick Start"
description: "Run a Java workflow with state and conditional routing."
---

# Graph Core Quick Start

`QuickStartExample` routes a support ticket to billing or help. Each node receives the current state and returns its updates. The `steps` key uses `AppendStrategy` to record the path.

```java title="QuickStartExample.java"
public static CompiledGraph createTicketGraph() throws GraphStateException {
	return new StateGraph(() -> Map.of("steps", new AppendStrategy()))
			.addNode("classify", node_async(state -> {
				String request = state.value("request", String.class).orElseThrow();
				String route = request.contains("退款") ? "billing" : "help";
				return Map.of("route", route, "steps", List.of("classify"));
			}))
			.addNode("billing", node_async(state -> Map.of("reply", "已转账单处理", "steps", List.of("billing"))))
			.addNode("help", node_async(state -> Map.of("reply", "请查看帮助中心", "steps", List.of("help"))))
			.addEdge(START, "classify")
			.addConditionalEdges("classify", edge_async(state -> state.value("route", String.class).orElseThrow()),
					Map.of("billing", "billing", "help", "help"))
			.addEdge("billing", END)
			.addEdge("help", END)
			.compile();
}
```

[Example source](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/QuickStartExample.java)

## Run the example {#run-the-example}

From the Spring AI Alibaba repository, use JDK 17 or newer and Maven. The local example runs with no model credentials.

```bash
mvn -q -f examples/documentation/pom.xml test-compile dependency:build-classpath \
  -Dmdep.outputFile=target/graph-example-classpath.txt

example_cp="examples/documentation/target/classes:$(cat examples/documentation/target/graph-example-classpath.txt)"
java -cp "$example_cp" com.alibaba.cloud.ai.examples.documentation.graph.QuickStartExample
```

The log includes `steps=[classify, billing]`. The same class includes a model-backed email workflow. Set `AI_DASHSCOPE_API_KEY` and append `--live` to the command to run it.

For a standalone Maven application, add `com.alibaba.cloud.ai:spring-ai-alibaba-graph-core`. Use `invoke` for the final state and `stream` for intermediate events. See [troubleshooting](troubleshooting.md) for compilation, streaming, and resume issues.
