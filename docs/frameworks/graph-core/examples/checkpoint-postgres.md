---
title: PostgreSQL 检查点持久化
description: 使用 PostgreSQL 数据库持久化和管理 Spring AI Alibaba Graph 工作流状态，实现跨执行的状态保持
keywords: [Spring AI Alibaba, PostgreSQL, Checkpoint, 检查点, 持久化, 状态管理, 工作流状态]
---

# PostgreSQL 检查点持久化

> 在 PostgreSQL 数据库中持久化和管理您的 Spring AI Alibaba Graph 工作流状态，确保持久性

## 概述

PostgreSQL 检查点持久化是 Spring AI Alibaba Graph 生态系统的一个模块，它使得工作流状态能够可靠地存储在 PostgreSQL 数据库中。这使您基于 LLM 的应用程序在执行之间保持状态——确保工作流进度不会丢失，并且可以在任何时候恢复或分析。

主要特性包括：
- **基于 PostgreSQL 的持久化**：所有工作流状态都存储在 PostgreSQL 数据库中，可以在进程重启或系统故障后保存。
- **状态缓存**：内存缓存用于状态数据，通过最小化工作流执行期间的数据库往返来优化性能。
- **Schema 自动配置**：内置服务可以轻松创建存储工作流状态所需的数据库 schema。

## 功能特性

- **持久化状态**：持久化 Spring AI Alibaba Graph 工作流的整个状态，允许随时继续或恢复。
- **性能缓存**：自动的内存缓存减少了数据库负载，加速重复的工作流调用。
- **简单的 Schema 初始化**：提供帮助服务在您的 PostgreSQL 实例中创建所需的表和结构。
- **无缝集成**：开箱即用地与 Spring AI Alibaba Graph 的状态管理和工作流 API 配合使用。

## 要求

- **PostgreSQL 数据库**：推荐版本 16.4 或更高。
- **Java 17+**
- **Spring AI Alibaba Graph 核心库**

## 快速开始

### 添加依赖

在您的项目构建配置中添加以下内容：

**Maven**
```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-graph-checkpoint-postgres</artifactId>
    <version>1.0.0.3-SNAPSHOT</version>
</dependency>
```

**Gradle**
```gradle
implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-graph-checkpoint-postgres:1.0.0.3-SNAPSHOT'
```

### 初始化 PostgreSqlSaver

PostgreSqlSaver 使用构建器模式进行配置。您需要提供数据库连接参数。

<Code
  language="java"
  title="初始化 PostgreSqlSaver" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.savers.PostgreSqlSaver;

// 初始化 PostgreSQL Saver
PostgreSqlSaver saver = new PostgreSqlSaver(
        "jdbc:postgresql://localhost:5432/graphdb",  // JDBC URL
        "username",                                    // 用户名
        "password"                                     // 密码
);

// 配置 Saver
SaverConfig saverConfig = SaverConfig.builder()
        .register(saver)
        .build();`}
</Code>

### 完整示例

以下是如何使用 PostgreSQL 检查点持久化来保存、重新加载和验证工作流状态的完整示例：

<Code
  language="java"
  title="完整示例" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.savers.PostgreSqlSaver;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.alibaba.cloud.ai.graph.state.StateSnapshot;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.alibaba.cloud.ai.graph.StateGraph.END;
import static com.alibaba.cloud.ai.graph.StateGraph.START;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

public class PostgresCheckpointExample {

    public void testCheckpointWithPostgreSQL() throws Exception {
        // 初始化 PostgreSQL Saver
        PostgreSqlSaver saver = new PostgreSqlSaver(
                "jdbc:postgresql://localhost:5432/graphdb",
                "admin",
                "password"
        );

        SaverConfig saverConfig = SaverConfig.builder()
                .register(saver)
                .build();

        // 定义状态策略
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
            keyStrategyMap.put("input", new ReplaceStrategy());
            keyStrategyMap.put("agent_1:prop1", new ReplaceStrategy());
            return keyStrategyMap;
        };

        // 定义节点
        var agent1 = node_async(state -> {
            System.out.println("agent_1 执行中");
            return Map.of("agent_1:prop1", "agent_1:test");
        });

        // 构建图
        StateGraph stateGraph = new StateGraph(keyStrategyFactory)
                .addNode("agent_1", agent1)
                .addEdge(START, "agent_1")
                .addEdge("agent_1", END);

        // 使用检查点编译图
        CompiledGraph workflow = stateGraph.compile(
                CompileConfig.builder()
                        .saverConfig(saverConfig)
                        .build()
        );

        // 执行工作流
        RunnableConfig runnableConfig = RunnableConfig.builder()
                .threadId("test-thread-1")
                .build();

        Map<String, Object> inputs = Map.of("input", "test1");
        OverAllState result = workflow.invoke(inputs, runnableConfig).orElseThrow();

        // 获取检查点历史
        List<StateSnapshot> history = (List<StateSnapshot>) workflow.getStateHistory(runnableConfig);

        System.out.println("检查点历史数量: " + history.size());

        // 获取最后保存的检查点
        StateSnapshot lastSnapshot = workflow.getState(runnableConfig);

        System.out.println("最后检查点节点: " + lastSnapshot.node());

        // 测试从数据库重新加载检查点
        // 创建新的 saver（重置缓存）
        PostgreSqlSaver newSaver = new PostgreSqlSaver(
                "jdbc:postgresql://localhost:5432/graphdb",
                "admin",
                "password"
        );

        SaverConfig newSaverConfig = SaverConfig.builder()
                .register(newSaver)
                .build();

        // 重新编译图
        CompiledGraph reloadedWorkflow = stateGraph.compile(
                CompileConfig.builder()
                        .saverConfig(newSaverConfig)
                        .build()
        );

        // 使用相同的 threadId 获取历史
        RunnableConfig reloadConfig = RunnableConfig.builder()
                .threadId("test-thread-1")
                .build();

        Collection<StateSnapshot> reloadedHistory = reloadedWorkflow.getStateHistory(reloadConfig);

        System.out.println("重新加载的检查点历史数量: " + reloadedHistory.size());
    }
}`}
</Code>

### Spring Boot 配置

如果您使用 Spring Boot，可以通过配置文件配置 PostgreSQL 连接：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/graphdb
    username: admin
    password: password
    driver-class-name: org.postgresql.Driver
```

然后在配置类中创建 PostgreSqlSaver Bean：

<Code
  language="java"
  title="Spring Boot 配置类" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class GraphCheckpointConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Bean
    public PostgreSqlSaver postgreSqlSaver() {
        return new PostgreSqlSaver(jdbcUrl, username, password);
    }

    @Bean
    public SaverConfig saverConfig(PostgreSqlSaver postgreSqlSaver) {
        return SaverConfig.builder()
                .register(postgreSqlSaver)
                .build();
    }
}`}
</Code>

## 数据库 Schema

PostgreSQL 检查点器会自动创建以下表来存储工作流状态：

- **checkpoints**：存储每个检查点的完整状态
- **checkpoint_metadata**：存储检查点的元数据

## 高级用法

### 恢复工作流

从 PostgreSQL 恢复工作流非常简单：

<Code
  language="java"
  title="恢复工作流" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.RunnableConfig;

import java.util.Map;

// 使用相同的 threadId
RunnableConfig config = RunnableConfig.builder()
        .threadId("original-thread-id")
        .build();

// 从上次检查点继续执行
workflow.invoke(Map.of(), config);`}
</Code>

### 查询历史状态

<Code
  language="java"
  title="查询历史状态" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.state.StateSnapshot;

import java.util.List;

// 获取所有历史状态
List<StateSnapshot> history = (List<StateSnapshot>) workflow.getStateHistory(config);

// 遍历历史
for (StateSnapshot snapshot : history) {
    System.out.println("节点: " + snapshot.node());
    System.out.println("状态: " + snapshot.state());
    System.out.println("Checkpoint ID: " + snapshot.config().checkPointId());
}`}
</Code>

### 从特定检查点恢复

<Code
  language="java"
  title="从特定检查点恢复" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.RunnableConfig;

import java.util.Map;

// 获取特定检查点
RunnableConfig checkpointConfig = RunnableConfig.builder()
        .threadId("thread-id")
        .checkPointId("specific-checkpoint-id")
        .build();

// 从该检查点继续
workflow.invoke(Map.of(), checkpointConfig);
System.out.println("从检查点恢复执行完成");`}
</Code>

## 性能优化

1. **连接池**：使用 HikariCP 或其他连接池来管理数据库连接。
2. **索引**：确保检查点表有适当的索引以加快查询速度。
3. **定期清理**：实施策略定期清理旧的检查点以避免表无限增长。
4. **批量操作**：如果可能，使用批量操作来减少数据库往返。

## 故障排除

### 连接问题

确保 PostgreSQL 数据库可访问且连接参数正确：

<Code
  language="java"
  title="测试连接" sourceUrl="https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointPostgresExample.java"
>
{`// 测试连接
try {
    Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
    System.out.println("连接成功！");
    conn.close();
} catch (SQLException e) {
    System.err.println("连接失败: " + e.getMessage());
}`}
</Code>

### Schema 问题

如果遇到表不存在的错误，确保已正确初始化数据库 schema。

## 最佳实践

1. **唯一的线程 ID**：为每个独立的工作流实例使用唯一的线程 ID。
2. **定期备份**：定期备份 PostgreSQL 数据库以防止数据丢失。
3. **监控**：监控数据库性能和检查点表的大小。
4. **清理策略**：实施自动清理旧检查点的策略。
5. **安全性**：使用强密码并限制数据库访问权限。

## 总结

PostgreSQL 检查点持久化为 Spring AI Alibaba Graph 提供了可靠的状态管理解决方案，使您的 AI 应用程序能够在故障后恢复，实现长时间运行的工作流，并支持人在回路中的交互。通过利用 PostgreSQL 的持久性和性能，您可以构建健壮的、生产级的 AI 应用程序。

