---
title: "高级配置"
description: "学习 Spring AI Alibaba Graph 的高级配置，包括运行时配置、重试策略和缓存优化。"
---

本文档介绍 Spring AI Alibaba Graph 的高级配置功能，包括运行时配置、重试策略和缓存优化。

## 添加运行时配置

有时您希望能够在调用图时配置图，而不将这些参数污染到图状态中。例如，您可能希望在运行时指定使用什么 LLM 或系统提示。

要添加运行时配置：

1. 为您的配置指定一个模式
2. 将配置添加到节点或条件边的函数签名中
3. 将配置传递给图

```java
// 1. 定义配置模式
public class RuntimeConfig {
    private String llmProvider = "qwen";
    private String systemMessage;
    
    // getters and setters
}

// 2. 定义访问配置的节点
NodeAction configAwareNode = (state, config) -> {
    RuntimeConfig runtimeConfig = (RuntimeConfig) config;
    String provider = runtimeConfig.getLlmProvider();
    
    if ("qwen".equals(provider)) {
        return Map.of("result", "使用通义千问处理");
    } else if ("gpt".equals(provider)) {
        return Map.of("result", "使用 GPT 处理");
    } else {
        throw new IllegalArgumentException("未知的 LLM 提供商: " + provider);
    }
};

// 3. 在运行时传递配置
RuntimeConfig config = new RuntimeConfig();
config.setLlmProvider("qwen");

RunnableConfig runnableConfig = RunnableConfig.builder()
    .context(config)
    .build();

Optional<OverAllState> result = compiledGraph.invoke(
    Map.of("input", "测试输入"), 
    runnableConfig
);
```

## 添加重试策略

在许多用例中，您可能希望节点具有自定义重试策略，例如调用 API、查询数据库或调用 LLM 等。Spring AI Alibaba Graph 允许您为节点添加重试策略。

要配置重试策略，在 `addNode` 时传递 `retryPolicy` 参数：

```java
import com.alibaba.cloud.ai.graph.retry.RetryPolicy;

// 定义重试策略
RetryPolicy retryPolicy = RetryPolicy.builder()
    .maxAttempts(3)                    // 最大重试次数
    .initialDelay(Duration.ofSeconds(1))  // 初始延迟
    .maxDelay(Duration.ofSeconds(10))     // 最大延迟
    .backoffMultiplier(2.0)              // 退避倍数
    .retryOn(IOException.class)          // 重试的异常类型
    .build();

// 添加带重试策略的节点
StateGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("api_call", node_async(apiCallAction), retryPolicy)
    .addEdge(START, "api_call")
    .addEdge("api_call", END);
```

### 自定义重试条件

您可以自定义重试条件，只对特定类型的异常进行重试：

```java
// 定义 API 调用节点
NodeAction apiCallAction = state -> {
    try {
        // 模拟可能失败的 API 调用
        String result = callExternalAPI();
        return Map.of("api_result", result);
    } catch (ConnectException e) {
        // 连接异常，应该重试
        throw new RuntimeException("API 连接失败", e);
    } catch (IllegalArgumentException e) {
        // 参数错误，不应该重试
        return Map.of("error", "参数错误: " + e.getMessage());
    }
};

// 只对运行时异常重试，不对参数错误重试
RetryPolicy selectiveRetryPolicy = RetryPolicy.builder()
    .maxAttempts(3)
    .retryOn(RuntimeException.class)
    .notRetryOn(IllegalArgumentException.class)
    .build();
```

### 重试策略最佳实践

```java
@Configuration
public class RetryPolicyConfig {

    // 网络调用重试策略
    @Bean
    public RetryPolicy networkRetryPolicy() {
        return RetryPolicy.builder()
            .maxAttempts(3)
            .initialDelay(Duration.ofSeconds(1))
            .maxDelay(Duration.ofSeconds(30))
            .backoffMultiplier(2.0)
            .retryOn(ConnectException.class, SocketTimeoutException.class)
            .notRetryOn(IllegalArgumentException.class, SecurityException.class)
            .build();
    }

    // LLM 调用重试策略
    @Bean
    public RetryPolicy llmRetryPolicy() {
        return RetryPolicy.builder()
            .maxAttempts(2)
            .initialDelay(Duration.ofSeconds(2))
            .maxDelay(Duration.ofSeconds(10))
            .backoffMultiplier(1.5)
            .retryOn(RuntimeException.class)
            .build();
    }

    // 数据库操作重试策略
    @Bean
    public RetryPolicy databaseRetryPolicy() {
        return RetryPolicy.builder()
            .maxAttempts(5)
            .initialDelay(Duration.ofMillis(500))
            .maxDelay(Duration.ofSeconds(5))
            .backoffMultiplier(1.2)
            .retryOn(SQLException.class, DataAccessException.class)
            .build();
    }
}
```

## 添加节点缓存

节点缓存在您想要避免重复操作的情况下很有用，比如执行昂贵的操作（时间或成本方面）。Spring AI Alibaba Graph 允许您为图中的节点添加个性化的缓存策略。

要配置缓存策略，在 `addNode` 时传递 `cachePolicy` 参数：

```java
import com.alibaba.cloud.ai.graph.cache.CachePolicy;
import com.alibaba.cloud.ai.graph.cache.InMemoryCache;

// 定义昂贵的计算节点
NodeAction expensiveComputationAction = state -> {
    // 模拟昂贵的计算
    try {
        Thread.sleep(2000); // 2秒延迟
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
    
    String input = state.value("input", String.class).orElse("");
    String result = "计算结果: " + input.toUpperCase();
    
    return Map.of("computation_result", result);
};

// 配置缓存策略
CachePolicy cachePolicy = CachePolicy.builder()
    .ttl(Duration.ofMinutes(5))  // 缓存5分钟
    .keyFunction(state -> {      // 自定义缓存键生成函数
        String input = state.value("input", String.class).orElse("");
        return "computation_" + input.hashCode();
    })
    .build();

// 构建带缓存的图
StateGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("expensive_computation", node_async(expensiveComputationAction), cachePolicy)
    .addEdge(START, "expensive_computation")
    .addEdge("expensive_computation", END);

// 编译时指定缓存
CompileConfig config = CompileConfig.builder()
    .cache(new InMemoryCache())
    .build();

CompiledGraph compiledGraph = graph.compile(config);

// 第一次运行需要2秒
long start1 = System.currentTimeMillis();
compiledGraph.invoke(Map.of("input", "test"));
System.out.println("第一次执行时间: " + (System.currentTimeMillis() - start1) + "ms");

// 第二次运行使用缓存，立即返回
long start2 = System.currentTimeMillis();
compiledGraph.invoke(Map.of("input", "test"));
System.out.println("第二次执行时间: " + (System.currentTimeMillis() - start2) + "ms");
```

### 缓存策略选项

Spring AI Alibaba Graph 支持多种缓存实现：

```java
// 内存缓存（适用于开发和测试）
CompileConfig memoryConfig = CompileConfig.builder()
    .cache(new InMemoryCache())
    .build();

// Redis 缓存（适用于分布式环境）
CompileConfig redisConfig = CompileConfig.builder()
    .cache(new RedisCache(redisTemplate))
    .build();

// 数据库缓存（适用于持久化需求）
CompileConfig dbConfig = CompileConfig.builder()
    .cache(new DatabaseCache(dataSource))
    .build();
```

### 缓存键策略

```java
// 基于输入内容的缓存键
CachePolicy contentBasedCache = CachePolicy.builder()
    .keyFunction(state -> {
        String input = state.value("input", String.class).orElse("");
        return "content_" + DigestUtils.md5Hex(input);
    })
    .ttl(Duration.ofHours(1))
    .build();

// 基于用户的缓存键
CachePolicy userBasedCache = CachePolicy.builder()
    .keyFunction(state -> {
        String userId = state.value("user_id", String.class).orElse("anonymous");
        String input = state.value("input", String.class).orElse("");
        return String.format("user_%s_input_%s", userId, input.hashCode());
    })
    .ttl(Duration.ofMinutes(30))
    .build();

// 基于时间窗口的缓存键
CachePolicy timeWindowCache = CachePolicy.builder()
    .keyFunction(state -> {
        String input = state.value("input", String.class).orElse("");
        long timeWindow = System.currentTimeMillis() / (5 * 60 * 1000); // 5分钟窗口
        return String.format("time_%d_input_%s", timeWindow, input.hashCode());
    })
    .ttl(Duration.ofMinutes(10))
    .build();
```

## 节点缓存和运行时上下文

### 运行时上下文

创建图时，您可以指定运行时上下文模式，用于传递给节点的运行时上下文。这对于传递不属于图状态的信息很有用，例如模型名称或数据库连接等依赖项。

```java
@Component
public class ContextAwareGraph {
    
    // 定义上下文模式
    public static class RuntimeContext {
        private String llmProvider = "qwen";
        private String userId;
        private Map<String, Object> metadata = new HashMap<>();
        
        // getters and setters
    }
    
    // 使用上下文的节点
    NodeAction contextAwareAction = (state, context) -> {
        RuntimeContext ctx = (RuntimeContext) context;
        String provider = ctx.getLlmProvider();
        String userId = ctx.getUserId();
        
        // 根据上下文选择不同的处理逻辑
        String result = processWithProvider(state, provider, userId);
        
        return Map.of("result", result);
    };
    
    // 使用上下文的条件边
    EdgeAction contextAwareEdge = (state, context) -> {
        RuntimeContext ctx = (RuntimeContext) context;
        String provider = ctx.getLlmProvider();
        
        // 根据提供商选择不同的路径
        return "qwen".equals(provider) ? "qwen_processor" : "default_processor";
    };
}
```

### 组合使用缓存和上下文

```java
@Configuration
public class AdvancedGraphConfig {

    @Bean
    public CompiledGraph advancedGraph() {
        KeyStrategyFactory keyStrategyFactory = () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("result", KeyStrategy.REPLACE);
            strategies.put("processing_log", KeyStrategy.APPEND);
            return strategies;
        };

        // 带缓存和重试的节点
        NodeAction advancedAction = (state, context) -> {
            RuntimeContext ctx = (RuntimeContext) context;
            String input = state.value("input", String.class).orElse("");
            
            // 使用上下文信息处理
            String result = processWithContext(input, ctx);
            
            return Map.of(
                "result", result,
                "processing_log", List.of("处理完成: " + System.currentTimeMillis())
            );
        };

        // 配置缓存策略（考虑上下文）
        CachePolicy contextAwareCache = CachePolicy.builder()
            .keyFunction(state -> {
                String input = state.value("input", String.class).orElse("");
                // 注意：缓存键不能直接访问上下文，需要将关键信息放入状态
                return "advanced_" + input.hashCode();
            })
            .ttl(Duration.ofMinutes(10))
            .build();

        // 配置重试策略
        RetryPolicy retryPolicy = RetryPolicy.builder()
            .maxAttempts(3)
            .initialDelay(Duration.ofSeconds(1))
            .backoffMultiplier(2.0)
            .build();

        StateGraph graph = new StateGraph(keyStrategyFactory)
            .addNode("advanced_node", node_async(advancedAction), cachePolicy, retryPolicy)
            .addEdge(START, "advanced_node")
            .addEdge("advanced_node", END);

        CompileConfig config = CompileConfig.builder()
            .cache(new InMemoryCache())
            .build();

        return graph.compile(config);
    }
}
```

## 配置最佳实践

### 1. 环境特定配置

```java
@Configuration
@Profile("development")
public class DevelopmentGraphConfig {
    
    @Bean
    public CompileConfig devCompileConfig() {
        return CompileConfig.builder()
            .cache(new InMemoryCache())  // 开发环境使用内存缓存
            .debug(true)                 // 启用调试模式
            .build();
    }
}

@Configuration
@Profile("production")
public class ProductionGraphConfig {
    
    @Bean
    public CompileConfig prodCompileConfig() {
        return CompileConfig.builder()
            .cache(new RedisCache(redisTemplate))  // 生产环境使用 Redis 缓存
            .debug(false)                          // 关闭调试模式
            .build();
    }
}
```

### 2. 配置外部化

```java
@ConfigurationProperties(prefix = "spring.ai.graph")
@Data
public class GraphProperties {
    
    private Cache cache = new Cache();
    private Retry retry = new Retry();
    private Runtime runtime = new Runtime();
    
    @Data
    public static class Cache {
        private String type = "memory";
        private Duration ttl = Duration.ofMinutes(10);
        private int maxSize = 1000;
    }
    
    @Data
    public static class Retry {
        private int maxAttempts = 3;
        private Duration initialDelay = Duration.ofSeconds(1);
        private double backoffMultiplier = 2.0;
    }
    
    @Data
    public static class Runtime {
        private int recursionLimit = 25;
        private boolean debug = false;
    }
}
```

## 下一步

- 学习控制流：[控制流](./control-flow)
- 了解并行处理：[并行处理](./parallel-processing)
- 返回基础用法：[基础用法](./basic-usage)
