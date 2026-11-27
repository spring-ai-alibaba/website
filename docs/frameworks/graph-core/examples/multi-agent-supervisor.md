---
title: "多智能体监督者模式"
description: "用监督节点路由工作项并结束循环。"
---

# 多智能体监督者模式

监督者读取当前消息，选择研究节点、编码节点，或结束执行。工作节点将结果追加到共享的 `messages`，再交回监督者。每个工作节点有自己的工具配置。

```java title="MultiAgentSupervisorExample.java"
public CompiledGraph createSupervisorGraph() throws GraphStateException {
	// 定义状态管理策略
	KeyStrategyFactory keyStrategyFactory = () -> {
		HashMap<String, KeyStrategy> strategies = new HashMap<>();
		strategies.put("messages", new AppendStrategy());
		strategies.put("next", new ReplaceStrategy());
		return strategies;
	};

	// 创建 agents
	String[] members = {"researcher", "coder"};
	SupervisorNode supervisor = new SupervisorNode(chatModel, members);
	ResearcherNode researcher = new ResearcherNode(chatModelWithTool);
	CoderNode coder = new CoderNode(chatModelWithTool);

	// 构建 StateGraph
	StateGraph workflow = new StateGraph(keyStrategyFactory)
			.addNode("supervisor", node_async(supervisor))
			.addNode("researcher", node_async(researcher))
			.addNode("coder", node_async(coder))
			.addEdge(START, "supervisor")
			.addConditionalEdges(
					"supervisor",
					edge_async(state -> {
						String next = (String) state.value("next").orElse("FINISH");
						return next;
					}),
					Map.of(
							"FINISH", END,
							"researcher", "researcher",
							"coder", "coder"
					)
			)
			.addEdge("researcher", "supervisor")
			.addEdge("coder", "supervisor");

	return workflow.compile(CompileConfig.builder().recursionLimit(12).build());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/MultiAgentSupervisorExample.java)

设置 `AI_DASHSCOPE_API_KEY` 后运行 `MultiAgentSupervisorExample`。示例会调用实际模型。搜索与代码工具使用固定演示结果，分支选择会随模型输出变化。

监督者循环需要明确的 `FINISH` 路由。示例还设置了 `recursionLimit`，用于约束执行步数。要将各角色组合成模块，参见[子图](subgraph.md)。
