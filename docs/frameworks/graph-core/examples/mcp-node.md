---
title: "为指定节点配置 MCP 工具"
description: "从 ToolCallbackProvider 选择节点工具。"
---

# 为指定节点配置 MCP 工具

在 Spring Boot 应用中配置 Spring AI MCP Client starter 和可访问的 MCP Server。向示例的 `createGraph` 传入应用已配置的 `ChatClient.Builder`、`ToolCallbackProvider` 和允许的工具名。

```java title="McpNodeExample.java"
public static CompiledGraph createGraph(ChatClient.Builder builder, ToolCallbackProvider provider,
		Set<String> allowedTools) throws GraphStateException {
	var tools = Arrays.stream(provider.getToolCallbacks())
			.filter(tool -> allowedTools.contains(tool.getToolDefinition().name()))
			.collect(Collectors.toUnmodifiableSet());
	var selectedNames = tools.stream().map(tool -> tool.getToolDefinition().name()).collect(Collectors.toSet());
	if (!selectedNames.equals(allowedTools) || tools.isEmpty()) {
		throw new IllegalArgumentException("Check the allowed MCP tool names");
	}
	return new StateGraph()
			.addNode("mcp", node_async(new McpNode(builder.clone(), tools)))
			.addEdge(START, "mcp").addEdge("mcp", END).compile();
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/McpNodeExample.java)

节点为自己的客户端配置选中的工具。工具名使用 `getToolDefinition().name()` 返回的名称。缺少预期的工具时，示例在建图阶段就给出错误。

```java title="McpNodeExample.java"
public static String runQuery(CompiledGraph graph, String query) {
	return graph.invoke(Map.of("query", query)).orElseThrow().value("mcpcontent", String.class).orElseThrow();
}
```

在已经配置好模型和 MCP 工具的应用中调用 `runQuery`，从图状态的 `mcpcontent` 读取结果。

运行需连接模型和 MCP 服务。按调用方身份校验工具权限，为跨服务调用配置超时。[节点实现](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/McpNodeExample.java)。
