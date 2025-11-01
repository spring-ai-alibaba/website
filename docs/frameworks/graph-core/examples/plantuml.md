---
title: PlantUML 图表可视化
description: 使用PlantUML可视化 Spring AI Alibaba Graph 工作流结构
keywords: [PlantUML, 图表, 可视化, UML, 流程图, Graph 可视化]
---

# PlantUML 图表可视化

Spring AI Alibaba Graph 支持将工作流导出为 PlantUML 格式，方便可视化和文档化。

## PlantUML 工具函数

```java
import net.sourceforge.plantuml.SourceStringReader;
import net.sourceforge.plantuml.FileFormatOption;
import net.sourceforge.plantuml.FileFormat;
import com.alibaba.cloud.ai.graph.GraphRepresentation;
import java.io.IOException;

static java.awt.Image plantUML2PNG(String code) throws IOException {
    var reader = new SourceStringReader(code);

    try (var imageOutStream = new java.io.ByteArrayOutputStream()) {
        var description = reader.outputImage(imageOutStream, 0, new FileFormatOption(FileFormat.PNG));
        var imageInStream = new java.io.ByteArrayInputStream(imageOutStream.toByteArray());
        return javax.imageio.ImageIO.read(imageInStream);
    }
}

// 从 GraphRepresentation 生成图像
static void displayDiagram(GraphRepresentation representation) throws IOException {
    var image = plantUML2PNG(representation.getContent());
    display(image);
}
```

## 简单示例

```java
var code = """
    @startuml
    title Spring AI Alibaba Graph
    START --> NodeA
    NodeA --> NodeB
    NodeB --> END
    @enduml
    """;

display(plantUML2PNG(code));
```

## 从 Graph 生成 PlantUML

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.GraphRepresentation;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.nodeasync;

// 构建一个简单的 Graph
StateGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("step1", nodeasync(state -> Map.of("result", "Step 1")))
    .addNode("step2", nodeasync(state -> Map.of("result", "Step 2")))
    .addNode("step3", nodeasync(state -> Map.of("result", "Step 3")))
    .addEdge(StateGraph.START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", "step3")
    .addEdge("step3", StateGraph.END);

CompiledGraph compiledGraph = graph.compile();

// 生成 PlantUML 表示
GraphRepresentation representation = compiledGraph.getGraph(
    GraphRepresentation.Type.PLANTUML,
    "My Workflow",
    false
);

// 显示图表
displayDiagram(representation);

// 或者直接获取 PlantUML 代码
System.out.println(representation.getContent());
```

## PlantUML 输出示例

```plantuml
@startuml
title My Workflow
START --> step1
step1 --> step2
step2 --> step3
step3 --> END
@enduml
```

## 应用场景

- **文档生成**: 自动生成工作流文档
- **调试分析**: 可视化理解 Graph 结构
- **团队协作**: 分享工作流设计
- **版本对比**: 比较不同版本的 Graph 结构

## 相关文档

- [快速入门](../quick-start) - Graph 基础使用
- [PlantUML 官方文档](https://plantuml.com/) - PlantUML 语法参考


