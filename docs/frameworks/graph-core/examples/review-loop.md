---
title: "条件循环与迭代修订"
description: "用 Command 同时写入审阅决定和路由，给迭代设置业务上限。"
---

# 条件循环与迭代修订

用一个发布说明的起草与审阅流程练习循环。示例的审阅节点使用固定规则，第二版达到通过条件。应用可以在同一位置接入业务校验或模型评分，沿用相同的路由。

```mermaid
flowchart LR
    start([START]) --> draft[起草新版]
    draft --> review[审阅]
    review -->|需要修订且有剩余次数| draft
    review -->|通过或预算用尽| finish([END])
```

## 在条件边记录决定

审阅节点写入 `accepted`。条件边返回 `Command`，同时选择下一步，并通过 `AppendStrategy` 记录本次决定。预算用尽时，图结束并写入 `manual_review`，应用可据此创建人工工单。

```java title="ReviewLoopExample.java"
public static CompiledGraph createGraph() throws GraphStateException {
	return new StateGraph(() -> Map.of("reviews", new AppendStrategy()))
			.addNode("draft", node_async(state -> {
				int version = state.value("version", Integer.class).orElse(0) + 1;
				return Map.of("version", version, "draft", "Release note v" + version);
			}))
			.addNode("review", node_async(state -> {
				// A deterministic stand-in for a reviewer.
				int version = state.value("version", Integer.class).orElseThrow();
				return Map.of("accepted", version >= 2);
			}))
			.addEdge(START, "draft")
			.addEdge("draft", "review")
			.addConditionalEdges("review", AsyncCommandAction.node_async((state, config) -> {
				int version = state.value("version", Integer.class).orElseThrow();
				int budget = state.value("reviewBudget", Integer.class).orElseThrow();
				boolean accepted = state.value("accepted", Boolean.class).orElseThrow();
				if (accepted) {
					return new Command("finish", Map.of("status", "approved", "reviews", List.of("approved")));
				}
				if (version >= budget) {
					return new Command("finish",
							Map.of("status", "manual_review", "reviews", List.of("budget_exhausted")));
				}
				return new Command("revise", Map.of("reviews", List.of("revision_requested")));
			}), Map.of("revise", "draft", "finish", END))
			.compile(CompileConfig.builder().recursionLimit(12).build());
}
```

[示例源码](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/ReviewLoopExample.java)

## 验证两种退出路径

按[运行仓库示例](/docs/frameworks/graph-core/quick-start#run-the-example)准备类路径后，运行 `ReviewLoopExample`。例子用独立的 `threadId` 执行两次，分别观察审阅通过和预算用尽。

```text
Budget 2: approved [revision_requested, approved]
Budget 1: manual_review [budget_exhausted]
```

`reviewBudget` 是本流程的业务规则。图的 `recursionLimit` 限制执行步数，可作为意外循环的防护。需要在当前流程暂停并等待人工反馈时，参见[人类反馈](human-in-the-loop.md)。
