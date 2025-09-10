---
title: 可观测性 (Observability)
description: 学习如何通过 Spring AI Alibaba Graph Observation Starter 快速启用可观测性功能，实现自动化的监控、指标收集和分布式链路追踪。
---

随着 Agent 工作流变得越来越复杂，理解其内部发生了什么、诊断问题以及监控性能变得至关重要。SAA Graph 提供了完整的可观测性（Observability）解决方案，通过 **Spring Boot Starter** 的方式让您能够**零配置**地启用企业级监控能力。

## 快速上手：三步启用自动观测

为 SAA Graph 应用添加企业级的监控能力，只需简单三步。

### 第 1 步：添加依赖

在您的 `pom.xml` 中添加观测性 starter 和 Actuator：

```xml
<dependencies>
    <!-- SAA Graph 观测性 Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-graph-observation</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>
    
    <!-- Spring Boot Actuator，用于暴露监控端点 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    
     <!-- (可选) 如果你需要将链路追踪数据导出到 Langfuse 等系统 -->
     <dependency>
         <groupId>io.micrometer</groupId>
         <artifactId>micrometer-tracing-bridge-otel</artifactId>
     </dependency>
</dependencies>
```

### 第 2 步：开启配置

在 `application.yml` 中确保观测性功能已开启（默认即为开启），并暴露监控端点：

```yaml
# SAA Graph 观测性配置
spring:
  ai:
    alibaba:
      graph:
        observation:
          enabled: true  # 默认即为 true，可省略

# Spring Boot Actuator 配置
management:
  endpoints:
    web:
      exposure:
        include: "*"  # 暴露所有监控端点，如 prometheus, health
  # (可选) 链路追踪配置
  tracing:
    sampling:
      probability: 1.0 
```

### 第 3 步：注入 `CompileConfig`

Starter 会自动创建一个配置好了观测性功能的 `CompileConfig` Bean。您只需在编译图的地方注入并使用它即可。

```java
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MyGraphConfiguration {

    @Bean
    public CompiledGraph compiledGraph(
            StateGraph myStateGraph, 
            // ✨ 关键：直接从 Spring 上下文注入配置好的 CompileConfig
            CompileConfig observationCompileConfig) {
        
        // 使用这个自动配置的 CompileConfig 来编译图
        return myStateGraph.compile(observationCompileConfig);
    }
    
    @Bean
    public StateGraph myStateGraph() {
        // ... 在这里定义您的 StateGraph
        return new StateGraph(...);
    }
}
```

完成以上三步后，您的 SAA Graph 应用就已经具备了完整的可观测性能力。**无需修改任何业务代码**。

## 开箱即用的观测能力

启用观测性 Starter 后，您将自动获得以下强大能力：

### 📊 指标 (Metrics) 收集

Starter 会自动记录图执行过程中的关键性能指标，并以 Micrometer 的格式暴露出来。

- **`spring.ai.alibaba.graph`**: 图执行的总次数、成功率、平均耗时。
- **`spring.ai.alibaba.graph.node`**: **每个节点**的调用次数、执行时间、成功/失败状态。
- **`spring.ai.alibaba.graph.edge`**: 边的执行次数和路由统计。

您可以通过 Actuator 端点轻松查看这些指标：
```bash
# 查看所有 SAA Graph 相关的指标名称
curl http://localhost:8080/actuator/metrics | grep spring.ai.alibaba.graph

# 查看特定节点的详细统计信息
curl "http://localhost:8080/actuator/metrics/spring.ai.alibaba.graph.node?tag=nodeId:analyze_user_intent"
```

### 🔗 分布式链路追踪 (Distributed Tracing)

每一次图的执行都会被记录为一条完整的分布式链路，您可以在 Langfuse 等工具中进行可视化分析。

追踪的层次结构：
- **Graph Span** (`spring.ai.alibaba.graph`): 整个图的执行会成为一个父级的 Span (Trace)。
- **Node Spans** (`spring.ai.alibaba.graph.node`): 图中的每个节点执行时，都会创建一个子 Span，并自动关联到父 Span。这个 Span 会包含节点的 ID、输入/输出状态的摘要、耗时和执行结果（成功/失败）。
- **自动关联**: 如果节点内部执行了其他被追踪的操作（如调用 `ChatClient`、发送 HTTP 请求、查询数据库），这些操作的 Span 会被自动挂载到当前节点的 Span 之下，形成一条清晰完整的调用链。

这对于诊断复杂工作流中的性能瓶颈和错误根源至关重要。

## 与 Langfuse 集成

Langfuse 是一个强大的 LLM 应用观测平台，特别适合跟踪和分析 Agent 工作流。SAA Graph 可以轻松与 Langfuse 集成，为您提供专业的 AI 应用监控能力。

### 配置 Langfuse 集成

1. **添加 OpenTelemetry 依赖**:
   ```xml
   <!-- OpenTelemetry 链路追踪支持 -->
   <dependency>
       <groupId>io.opentelemetry.instrumentation</groupId>
       <artifactId>opentelemetry-spring-boot-starter</artifactId>
       <version>2.9.0</version>
   </dependency>
   
   <!-- Micrometer 桥接器 -->
   <dependency>
       <groupId>io.micrometer</groupId>
       <artifactId>micrometer-tracing-bridge-otel</artifactId>
   </dependency>
   
   <!-- OTLP 导出器 -->
   <dependency>
       <groupId>io.opentelemetry</groupId>
       <artifactId>opentelemetry-exporter-otlp</artifactId>
   </dependency>
   ```

2. **配置 application.yml**:
   ```yaml
   spring:
     ai:
       alibaba:
         graph:
           observation:
             enabled: true

   management:
     endpoints:
       web:
         exposure:
           include: "*"
     tracing:
       sampling:
         probability: 1.0
     observations:
       annotations:
         enabled: true

   # Langfuse 配置
   otel:
     service:
       name: my-saa-graph-app
     resource:
       attributes:
         deployment.environment: development
     traces:
       exporter: otlp
       sampler: always_on
     metrics:
       exporter: otlp
     logs:
       exporter: none  # Langfuse 暂不支持 logs
     exporter:
       otlp:
         endpoint: "https://cloud.langfuse.com/api/public/otel"
         headers:
           Authorization: "Basic <your-langfuse-credentials>"
         protocol: http/protobuf
   ```

3. **获取 Langfuse 认证信息**:
   - 登录 [Langfuse Cloud](https://cloud.langfuse.com)
   - 创建项目并获取 Public Key 和 Secret Key
   - 将它们组合为 Base64 编码: `echo -n "pk-lf-xxx:sk-lf-xxx" | base64`
   - 替换上面配置中的 `<your-langfuse-credentials>`

### 在 Langfuse 中查看观测数据

配置完成后，启动您的应用并执行一些图操作。然后在 Langfuse 中您将看到：

1. **Traces 视图**: 每次图执行都会生成一个 Trace，显示完整的执行时间线
2. **Sessions 视图**: 可以按 `threadId` 查看用户会话的所有图执行
3. **Performance 视图**: 分析各个节点的执行性能和瓶颈
4. **Metrics 仪表盘**: 查看图的整体执行统计和趋势

特别地，Langfuse 会自动识别 SAA Graph 的层次结构：
- Graph 执行会显示为顶层的 Generation 或 Span
- 每个 Node 会显示为子 Span，包含输入输出的详细信息
- 如果 Node 内部调用了 LLM（如 `ChatClient`），这些调用会被正确标记为 LLM Generation

## 高级配置

### 自定义生命周期监听器 (`GraphLifecycleListener`)

如果您有超出标准指标和追踪的自定义监控需求（例如，每次节点执行失败时发送一条钉钉消息），可以实现 `GraphLifecycleListener` 接口，并将其注册为一个 Spring Bean。观测性 Starter 会自动发现并应用它。

```java
import com.alibaba.cloud.ai.graph.GraphLifecycleListener;
import org.springframework.stereotype.Component;

@Component // ✨ 注册为 Spring Bean
public class CustomGraphMonitor implements GraphLifecycleListener {

    @Override
    public void onError(String nodeId, Map<String, Object> state, Throwable ex, RunnableConfig config) {
        // 在这里实现您的自定义错误处理逻辑
        System.out.printf("警报: 节点 '%s' 在会话 '%s' 中执行失败!%n", nodeId, config.getThreadId());
        // dingTalkAlerter.sendAlert(...);
    }
    
    // ... 您也可以实现 onStart, before, after, onComplete 等其他方法
}
```


