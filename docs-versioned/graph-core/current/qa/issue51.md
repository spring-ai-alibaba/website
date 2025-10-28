---
title: 条件路由使用案例
description: 基于Spring AI Alibaba实现条件路由的Agent编排示例
keywords: [条件路由, Agent编排, Spring AI Alibaba, 智能路由, Graph工作流]
---

本示例展示如何使用 Spring AI Alibaba Graph 实现基于 LLM 决策的条件路由。

## 初始化配置

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;

private static final Logger log = LoggerFactory.getLogger("ConditionalRouting");
```

## 定义状态

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import java.util.Map;
import java.util.Optional;

public class MyAgentState extends OverAllState {

    public MyAgentState(Map<String, Object> initData) {
        super(initData);
    }

    public Optional<String> input() {
        return value("input");
    }

    public Optional<String> orchestratorOutcome() {
        return value("orchestrator_outcome");
    }
}
```

## 定义编排 Agent

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import java.util.Map;

class OrchestratorAgent implements NodeAction {

    private final ChatClient chatClient;

    public OrchestratorAgent(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }
 
    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {

        var input = ((MyAgentState)state).input()
            .orElseThrow(() -> new IllegalArgumentException("input is not provided!"));

        String systemPrompt = """
            You are a helpful assistant. Evaluate the user request and if the request concerns
            a story return 'story_teller' otherwise 'greeting'
            """;

        String userPrompt = "{input}";

        PromptTemplate promptTemplate = new PromptTemplate(userPrompt);
        Map<String, Object> params = Map.of("input", input);

        String result = chatClient.prompt()
            .system(systemPrompt)
            .user(promptTemplate.create(params).getContents())
            .call()
            .content();

        return Map.of("orchestrator_outcome", result.trim());
    }
}


```


```java
import com.alibaba.cloud.ai.graph.action.EdgeAction;

class RouteOrchestratorOutcome implements EdgeAction<MyAgentState> {
## 定义路由边

    public String apply(MyAgentState state) throws Exception {
        
        var orchestrationOutcome = state.orchestratorOutcome()
class RouteOrchestratorOutcome implements EdgeAction {

    @Override
    public String apply(OverAllState state) throws Exception {
    }
        var orchestrationOutcome = ((MyAgentState)state).orchestratorOutcome()
            .orElseThrow(() -> new IllegalArgumentException("orchestration outcome is not provided!"));
```
        // 根据 LLM 的输出决定路由
        if (orchestrationOutcome.toLowerCase().contains("story")) {
            return "story_teller";
        } else {
            return "greeting";
        }

class StoryTellerAgent implements NodeAction<MyAgentState> {

    public Map<String, Object> apply(MyAgentState state) throws Exception {
## 定义 Story Teller Agent
        log.info( "Story Teller Agent invoked");
        return Map.of();
class StoryTellerAgent implements NodeAction {
}
    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        log.info("Story Teller Agent invoked");

```java
class GreetingAgent implements NodeAction<MyAgentState> {

    public Map<String, Object> apply(MyAgentState state) throws Exception {
## 定义 Greeting Agent
        log.info( "Greeting Agent invoked");
        return Map.of();
class GreetingAgent implements NodeAction {
}
    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        log.info("Greeting Agent invoked");

```java
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;
import com.alibaba.cloud.ai.graph.StateGraph;
## 构建 Graph
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;
import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edgeasync;
var model = OpenAiChatModel.builder()
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import org.springframework.ai.openai.OpenAiChatModel;
import java.util.HashMap;
        .maxRetries(2)
// 配置 ChatClient
ChatClient.Builder chatClientBuilder = ChatClient.builder(chatModel);

// 配置 KeyStrategyFactory
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("input", new ReplaceStrategy());
    strategies.put("orchestrator_outcome", new ReplaceStrategy());
    return strategies;
};
                .addConditionalEdges("orchestrator_agent",
// 创建节点
var orchestratorAgent = nodeasync(new OrchestratorAgent(chatClientBuilder));
var storyTellerAgent = nodeasync(new StoryTellerAgent());
var greetingAgent = nodeasync(new GreetingAgent());
var routeOrchestratorOutcome = edgeasync(new RouteOrchestratorOutcome());

// 构建工作流
var workflow = new StateGraph(keyStrategyFactory)
    .addNode("orchestrator_agent", orchestratorAgent)
    .addNode("story_teller_agent", storyTellerAgent)
    .addNode("greetings_agent", greetingAgent)
    .addConditionalEdges("orchestrator_agent",
        routeOrchestratorOutcome,
        Map.of(
            "story_teller", "story_teller_agent",
            "greeting", "greetings_agent"
        ))
    .addEdge(StateGraph.START, "orchestrator_agent")
    .addEdge("story_teller_agent", StateGraph.END)
    .addEdge("greetings_agent", StateGraph.END);
```java
var app = workflow.compile();

for( var node : app.stream( Map.of( "input", "tell me a xmas story"))) {
## 测试示例 1 - Story Teller 路由
    log.info( "{}", node );
}
for (var node : app.stream(Map.of("input", "tell me a xmas story"))) {
    log.info("{}", node);
    Story Teller Agent invoked
    NodeOutput{node=orchestrator_agent, state={input=tell me a xmas story, orchestrator_outcome=story_teller}} 
    NodeOutput{node=story_teller_agent, state={input=tell me a xmas story, orchestrator_outcome=story_teller}} 
**输出**:
```
START
NodeOutput{node=__START__, state={input=tell me a xmas story}}
Story Teller Agent invoked
NodeOutput{node=orchestrator_agent, state={input=tell me a xmas story, orchestrator_outcome=story_teller}}
NodeOutput{node=story_teller_agent, state={input=tell me a xmas story, orchestrator_outcome=story_teller}}
NodeOutput{node=__END__, state={input=tell me a xmas story, orchestrator_outcome=story_teller}}
```
    log.info( "{}", node );
## 测试示例 2 - Greeting 路由
```

for (var node : app.stream(Map.of("input", "hi there"))) {
    log.info("{}", node);
    Greeting Agent invoked
    NodeOutput{node=orchestrator_agent, state={input=hi there, orchestrator_outcome=greeting}} 
    NodeOutput{node=greetings_agent, state={input=hi there, orchestrator_outcome=greeting}} 
**输出**:
```
START
NodeOutput{node=__START__, state={input=hi there}}
Greeting Agent invoked
NodeOutput{node=orchestrator_agent, state={input=hi there, orchestrator_outcome=greeting}}
NodeOutput{node=greetings_agent, state={input=hi there, orchestrator_outcome=greeting}}
NodeOutput{node=__END__, state={input=hi there, orchestrator_outcome=greeting}}
```

## 关键要点

1. **LLM 驱动路由**: 使用 LLM 分析用户输入并决定路由方向
2. **条件边**: 通过 `addConditionalEdges` 实现动态路由
3. **状态管理**: 使用 `OverAllState` 在节点间传递数据
4. **类型安全**: 通过自定义状态类提供类型安全的访问方法

## 应用场景

- 意图识别和路由
- 多技能 Agent 编排
- 工作流动态分支
- 智能客服路由

## 相关文档

- [条件边](/workflow/graph/conditional-edges) - 条件边详解
- [快速入门](/workflow/graph/quick-guide) - Graph 基础使用
- [状态管理](/workflow/graph/state-management) - 状态管理
