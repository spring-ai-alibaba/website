---
title: 创建并行节点执行分支
description: 学习如何创建并行分支以加速图执行，使用Fork-Join模型实现并行处理
keywords: [并行分支, Parallel Branch, Fork-Join, 并行执行, 并行节点, 性能优化]
---

# 创建并行节点执行分支

Spring AI Alibaba Graph 支持并行执行节点以加速图的整体执行。

## 并行执行限制

当前并行执行有以下限制：

* 仅支持 **Fork-Join** 模型

  ```
         ┌─┐
         │A│
         └─┘
          |
    ┌-----------┐
    |     |     |
  ┌──┐  ┌──┐  ┌──┐
  │A1│  │A2│  │A3│
  └──┘  └──┘  └──┘
    |     |     |
    └-----------┘
          |
         ┌─┐
         │B│
         └─┘
  ```

* 不允许使用**条件边**（Conditional Edges）

完整的并行节点示例请参考：[并行节点执行文档](/workflow/graph/parallel-node)

## 定义带并行分支的 Graph

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.AppendStrategy;
import java.util.Map;
import java.util.HashMap;

import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

// 创建简单的节点函数
public Map<String, Object> makeNode(String message) {
    return nodeasync(state -> Map.of("messages", message));
}

// 配置 KeyStrategyFactory
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> keyStrategyHashMap = new HashMap<>();
    keyStrategyHashMap.put("messages", new AppendStrategy());
    return keyStrategyHashMap;
};

// 构建并行 Graph
StateGraph workflow = new StateGraph(keyStrategyFactory)
    .addNode("A", makeNode("A"))
    .addNode("A1", makeNode("A1"))
    .addNode("A2", makeNode("A2"))
    .addNode("A3", makeNode("A3"))
    .addNode("B", makeNode("B"))
    .addNode("C", makeNode("C"))
    .addEdge("A", "A1")    // A 到 A1
    .addEdge("A", "A2")    // A 到 A2（并行）
    .addEdge("A", "A3")    // A 到 A3（并行）
    .addEdge("A1", "B")    // A1 汇聚到 B
    .addEdge("A2", "B")    // A2 汇聚到 B
    .addEdge("A3", "B")    // A3 汇聚到 B
    .addEdge("B", "C")
    .addEdge(StateGraph.START, "A")
    .addEdge("C", StateGraph.END);

CompiledGraph compiledGraph = workflow.compile();
```

## 执行并行 Graph

```java
// 执行 Graph
for (NodeOutput step : compiledGraph.stream(Map.of())) {
    System.out.println(step);
}
```

**输出示例**:
```
START
NodeOutput{node=__START__, state={messages=[]}}
NodeOutput{node=A, state={messages=[A]}}
NodeOutput{node=__PARALLEL__(A), state={messages=[A, A1, A2, A3]}}
NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
NodeOutput{node=C, state={messages=[A, A1, A2, A3, B, C]}}
NodeOutput{node=__END__, state={messages=[A, A1, A2, A3, B, C]}}
```

## 并行节点的执行顺序

在上面的示例中：
1. 节点 A 首先执行
2. 节点 A1、A2、A3 并行执行（Fork）
3. 等待所有并行节点完成后，节点 B 执行（Join）
4. 最后节点 C 执行

## 注意事项

- 并行节点必须独立，不能相互依赖
- 所有并行分支必须汇聚到同一个节点
- 在并行分支中不能使用条件边
- 使用 `AppendStrategy` 可以收集所有并行节点的结果

## 相关文档

- [并行节点执行](/workflow/graph/parallel-node) - 完整的并行节点示例
- [快速入门](/workflow/graph/quick-guide) - Graph 基础使用
- [状态管理](/workflow/graph/state-management) - 状态策略配置






    abfc2bdf-024d-4376-818e-886c8509209f




```java
for( var step : workflow.stream( Map.of() ) ) {
    System.out.println( step );
}
```

```
    START 


    NodeOutput{node=__START__, state={messages=[]}}
    NodeOutput{node=A, state={messages=[A]}}
    NodeOutput{node=__PARALLEL__(A), state={messages=[A, A1, A2, A3]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
    NodeOutput{node=B, state={messages=[A, A1, A2, A3, B]}}


    Maximum number of iterations (25) reached! 


    NodeOutput{node=A1, state={messages=[A, A1, A2, A3, B]}}
```

## Use compiled sub graph as parallel node

This example answer to issue **Will plan support multiple target on parallel node?** [#104](https://github.com/bsorrentino/langgraph4j/issues/104) 


```java
import org.bsc.langgraph4j.prebuilt.MessagesStateGraph;
import org.bsc.langgraph4j.prebuilt.MessagesState;
import org.bsc.langgraph4j.action.AsyncNodeAction;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;

AsyncNodeAction<MessagesState<String>> makeNode( String message ) {
    return node_async(state -> Map.of( "messages", message ) );
}

var subgraphA3 = new MessagesStateGraph<String>()
                .addNode("A3.1", makeNode("A3.1"))
                .addNode("A3.2", makeNode("A3.2"))
                .addEdge(START, "A3.1")
                .addEdge( "A3.1", "A3.2")
                .addEdge("A3.2", END)   
                .compile(); 
var subgraphA1 = new MessagesStateGraph<String>()
                .addNode("A1.1", makeNode("A1.1"))
                .addNode("A1.2", makeNode("A1.2"))
                .addEdge(START, "A1.1")
                .addEdge( "A1.1", "A1.2")
                .addEdge("A1.2", END)   
                .compile(); 

var workflow = new MessagesStateGraph<String>()
                .addNode("A", makeNode("A"))
                .addNode("A1", subgraphA1)
                .addNode("A2", makeNode("A2"))
                .addNode("A3", subgraphA3)
                .addNode("B", makeNode("B"))
                .addEdge("A", "A1")
                .addEdge("A", "A2")
                .addEdge("A", "A3")
                .addEdge("A1", "B")
                .addEdge("A2", "B")
                .addEdge("A3", "B")
                .addEdge(START, "A")
                .addEdge("B", END)                   
                .compile();

```


```java
import org.bsc.langgraph4j.GraphRepresentation;

var representation = workflow.getGraph( GraphRepresentation.Type.PLANTUML, "parallel branch",false );

display( plantUML2PNG( representation.getContent() ) )
```


    
![png](/img/graph/examples/parallel-branch_files/parallel-branch_16_0.png)
    





    e885507c-a8ad-4adc-a8bc-3659e5eb0742




```java
// workflow.getGraph( GraphRepresentation.Type.MERMAID, "parallel branch",false ).content();
```


```java
for( var step : workflow.stream( Map.of() ) ) {
    System.out.println( step );
}
```

```
    START 


    NodeOutput{node=__START__, state={messages=[]}}


    START 
    START 


    NodeOutput{node=A, state={messages=[A]}}
    NodeOutput{node=__PARALLEL__(A), state={messages=[A, A1.1, A1.2, A2, A3.1, A3.2]}}
    NodeOutput{node=B, state={messages=[A, A1.1, A1.2, A2, A3.1, A3.2, B]}}
    NodeOutput{node=__END__, state={messages=[A, A1.1, A1.2, A2, A3.1, A3.2, B]}}
```

```java
import org.bsc.langgraph4j.prebuilt.MessagesStateGraph;
import org.bsc.langgraph4j.prebuilt.MessagesState;
import org.bsc.langgraph4j.action.AsyncNodeAction;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;

AsyncNodeAction<MessagesState<String>> makeNode( String message ) {
    return node_async(state -> Map.of( "messages", message ) );
}

var subgraphA3 = new MessagesStateGraph<String>()
                .addNode("A3.1", makeNode("A3.1"))
                .addNode("A3.2", makeNode("A3.2"))
                .addEdge(START, "A3.1")
                .addEdge( "A3.1", "A3.2")
                .addEdge("A3.2", END)   
                .compile(); 

var subgraphA2 = new MessagesStateGraph<String>()
                .addNode("A2.1", makeNode("A2.1"))
                .addNode("A2.2", makeNode("A2.2"))
                .addEdge(START, "A2.1")
                .addEdge( "A2.1", "A2.2")
                .addEdge("A2.2", END)   
                .compile(); 

var subgraphA1 = new MessagesStateGraph<String>()
                .addNode("A1.1", makeNode("A1.1"))
                .addNode("A1.2", makeNode("A1.2"))
                .addEdge(START, "A1.1")
                .addEdge( "A1.1", "A1.2")
                .addEdge("A1.2", END)   
                .compile(); 

var workflow = new MessagesStateGraph<String>()
                .addNode("A", makeNode("A"))
                .addNode("A1", subgraphA1)
                .addNode("A2", subgraphA2)
                .addNode("A3", subgraphA3)
                .addNode("B", makeNode("B"))
                .addEdge("A", "A1")
                .addEdge("A", "A2")
                .addEdge("A", "A3")
                .addEdge("A1", "B")
                .addEdge("A2", "B")
                .addEdge("A3", "B")
                .addEdge(START, "A")
                .addEdge("B", END)                   
                .compile();

```


```java
import org.bsc.langgraph4j.GraphRepresentation;

var representation = workflow.getGraph( GraphRepresentation.Type.PLANTUML, "parallel branch",false );

display( plantUML2PNG( representation.getContent() ) )
```


    
![png](/img/graph/examples/parallel-branch_files/parallel-branch_20_0.png)
    





    0113f2c8-6566-425a-8018-4a621097b864




```java
for( var step : workflow.stream( Map.of() ) ) {
    System.out.println( step );
}
```

```
    START 


    NodeOutput{node=__START__, state={messages=[]}}


    START 
    START 
    START 


    NodeOutput{node=A, state={messages=[A]}}
    NodeOutput{node=__PARALLEL__(A), state={messages=[A, A1.1, A1.2, A2.1, A2.2, A3.1, A3.2]}}
    NodeOutput{node=B, state={messages=[A, A1.1, A1.2, A2.1, A2.2, A3.1, A3.2, B]}}
    NodeOutput{node=__END__, state={messages=[A, A1.1, A1.2, A2.1, A2.2, A3.1, A3.2, B]}}
```
