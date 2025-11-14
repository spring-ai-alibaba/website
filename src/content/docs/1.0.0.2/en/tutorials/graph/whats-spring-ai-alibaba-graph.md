---
title: What is Spring AI Alibaba Graph
keywords: [Spring AI, Qwen, Bailian, Agent Application]
description: "Spring AI integrated with Qwen, developing Java AI applications using Spring AI."
---
> Graph module documentation is continuously being updated, please stay tuned for documentation progress

Spring AI Alibaba Graph is one of the core implementations in the community and represents a key distinction from Spring AI's focus on lower-level atomic abstractions. Spring AI Alibaba aims to help developers build agent applications more easily. With Graph, developers can build workflows and multi-agent applications. The design philosophy of Spring AI Alibaba Graph draws inspiration from Langgraph, so it can be understood to some extent as a Java version of Langgraph. The community has added numerous pre-configured Nodes on this foundation and simplified the State definition process, making it easier for developers to write workflows and multi-agent applications comparable to low-code platforms.

## Graph Overview
The core concepts of the framework include: **StateGraph** (state graph, used to define nodes and edges), **Node** (encapsulating specific operations or model calls), **Edge** (representing transition relationships between nodes), and **OverAllState** (global state, sharing data throughout the process). These designs enable developers to conveniently manage states and logical transitions in workflows.

The following code snippet is an example of a multi-agent architecture developed using Graph (excerpted from the actual implementation of Spring AI Alibaba DeepResearch):

```java
StateGraph stateGraph = new StateGraph("deep research", keyStrategyFactory,
				new DeepResearchStateSerializer(OverAllState::new))
			.addNode("coordinator", node_async(new CoordinatorNode(chatClientBuilder)))
			.addNode("background_investigator", node_async(new BackgroundInvestigationNode(tavilySearchService)))
			.addNode("planner", node_async((new PlannerNode(chatClientBuilder))))
			.addNode("human_feedback", node_async(new HumanFeedbackNode()))
			.addNode("research_team", node_async(new ResearchTeamNode()))
			.addNode("researcher", node_async(new ResearcherNode(researchAgent)))
			.addNode("coder", node_async(new CoderNode(coderAgent)))
			.addNode("reporter", node_async((new ReporterNode(chatClientBuilder))))

			.addEdge(START, "coordinator")
			.addConditionalEdges("coordinator", edge_async(new CoordinatorDispatcher()),
					Map.of("background_investigator", "background_investigator", "planner", "planner", END, END))
			.addEdge("background_investigator", "planner")
			.addConditionalEdges("planner", edge_async(new PlannerDispatcher()),
					Map.of("reporter", "reporter", "human_feedback", "human_feedback", "planner", "planner",
							"research_team", "research_team", END, END))
			.addConditionalEdges("human_feedback", edge_async(new HumanFeedbackDispatcher()),
					Map.of("planner", "planner", "research_team", "research_team", END, END))
			.addConditionalEdges("research_team", edge_async(new ResearchTeamDispatcher()),
					Map.of("reporter", "reporter", "researcher", "researcher", "coder", "coder"))
			.addConditionalEdges("researcher", edge_async(new ResearcherDispatcher()),
					Map.of("research_team", "research_team"))
			.addConditionalEdges("coder", edge_async(new CoderDispatcher()), Map.of("research_team", "research_team"))
			.addEdge("reporter", END);
```

## Core Features

+ Supports Multi-agent, with built-in ReAct Agent, Supervisor, and other standard agent patterns
+ Supports workflows, with built-in workflow nodes aligned with mainstream low-code platforms
+ Native Streaming support
+ Human-in-the-loop, supporting state modification and execution resumption through human confirmation nodes
+ Supports memory and persistent storage
+ Supports process snapshots
+ Supports nested branches and parallel branches
+ PlantUML, Mermaid visualization export
