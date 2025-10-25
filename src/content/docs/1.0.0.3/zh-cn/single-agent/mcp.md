---
title: 模型上下文协议 (MCP)
description: Spring AI Alibaba MCP 集成
---

# 模型上下文协议 (MCP)

模型上下文协议 (Model Context Protocol, MCP) 是一个开放标准，用于在 AI 应用和外部数据源及工具之间建立安全、可控的连接。

## MCP 概述

### 什么是 MCP
MCP 提供了一种标准化的方式来：
- 连接 AI 模型与外部工具
- 管理上下文和资源
- 确保安全的数据访问
- 实现工具的动态发现

### 核心组件
- **MCP 服务器**: 提供工具和资源的服务端
- **MCP 客户端**: 消费工具和资源的客户端
- **协议层**: 标准化的通信协议
- **安全层**: 认证和授权机制

## Spring AI Alibaba MCP 集成

### 基本配置

```java
@Configuration
@EnableMcp
public class McpConfig {
    
    @Bean
    public McpClient mcpClient() {
        return McpClient.builder()
            .serverUrl("http://localhost:8080/mcp")
            .authentication(McpAuthentication.apiKey("your-api-key"))
            .build();
    }
}
```

### MCP 服务器实现

```java
@McpServer
@RestController
public class MyMcpServer {
    
    @McpTool(name = "calculator", description = "执行数学计算")
    public String calculate(@McpParameter("expression") String expression) {
        // 实现计算逻辑
        return evaluateExpression(expression);
    }
    
    @McpResource(name = "user-data", description = "获取用户数据")
    public UserData getUserData(@McpParameter("userId") String userId) {
        // 获取用户数据
        return userService.findById(userId);
    }
    
    @McpPrompt(name = "summarize", description = "文本摘要提示")
    public String getSummarizePrompt(@McpParameter("text") String text) {
        return "请为以下文本生成摘要：\n" + text;
    }
}
```

## Nacos MCP Registry

Spring AI Alibaba 提供了基于 Nacos 的 MCP 服务注册与发现机制。

### 配置 Nacos Registry

```properties
# Nacos 配置
spring.cloud.nacos.discovery.server-addr=127.0.0.1:8848
spring.cloud.nacos.discovery.namespace=mcp

# MCP Registry 配置
spring.ai.mcp.registry.enabled=true
spring.ai.mcp.registry.type=nacos
spring.ai.mcp.registry.nacos.group=MCP_GROUP
```

### 服务注册

```java
@Service
public class McpServiceRegistry {
    
    @Autowired
    private NacosDiscoveryProperties nacosProperties;
    
    @PostConstruct
    public void registerMcpServices() {
        McpServiceDefinition service = McpServiceDefinition.builder()
            .name("calculator-service")
            .description("数学计算服务")
            .version("1.0.0")
            .endpoint("http://localhost:8080/mcp/calculator")
            .tools(List.of(
                McpToolDefinition.builder()
                    .name("add")
                    .description("加法运算")
                    .parameters(Map.of(
                        "a", "第一个数字",
                        "b", "第二个数字"
                    ))
                    .build()
            ))
            .build();
        
        mcpRegistry.register(service);
    }
}
```

### 服务发现

```java
@Service
public class McpServiceDiscovery {
    
    @Autowired
    private McpRegistry mcpRegistry;
    
    public List<McpServiceDefinition> discoverServices(String category) {
        return mcpRegistry.discover(
            McpDiscoveryRequest.builder()
                .category(category)
                .tags(List.of("math", "calculation"))
                .build()
        );
    }
    
    public McpClient createClient(String serviceName) {
        McpServiceDefinition service = mcpRegistry.findByName(serviceName);
        return McpClient.builder()
            .serverUrl(service.getEndpoint())
            .build();
    }
}
```

## 工具调用集成

### MCP 工具适配器

```java
@Component
public class McpToolAdapter {
    
    @Autowired
    private McpClient mcpClient;
    
    @Bean
    public Function<CalculateRequest, String> calculateFunction() {
        return request -> {
            return mcpClient.callTool("calculator", Map.of(
                "expression", request.getExpression()
            ));
        };
    }
    
    @Bean
    public Function<SearchRequest, String> searchFunction() {
        return request -> {
            return mcpClient.callTool("search", Map.of(
                "query", request.getQuery(),
                "limit", request.getLimit()
            ));
        };
    }
}
```

### 在 Chat Client 中使用

```java
@Service
public class McpChatService {
    
    @Autowired
    private ChatClient chatClient;
    
    public String chatWithMcpTools(String message) {
        return chatClient.prompt()
            .user(message)
            .functions("calculateFunction", "searchFunction")
            .call()
            .content();
    }
}
```

## 安全和认证

### API Key 认证

```java
@Configuration
public class McpSecurityConfig {
    
    @Bean
    public McpAuthenticationProvider apiKeyProvider() {
        return new ApiKeyAuthenticationProvider("your-secret-key");
    }
    
    @Bean
    public McpSecurityFilter mcpSecurityFilter() {
        return new McpSecurityFilter(apiKeyProvider());
    }
}
```

### OAuth2 认证

```java
@Configuration
public class McpOAuth2Config {
    
    @Bean
    public McpAuthenticationProvider oauth2Provider() {
        return OAuth2AuthenticationProvider.builder()
            .clientId("your-client-id")
            .clientSecret("your-client-secret")
            .tokenEndpoint("https://auth.example.com/oauth/token")
            .build();
    }
}
```

## 监控和可观测性

### MCP 指标

```java
@Component
public class McpMetrics {
    
    private final Counter mcpCallsTotal;
    private final Timer mcpCallDuration;
    
    public McpMetrics(MeterRegistry meterRegistry) {
        this.mcpCallsTotal = Counter.builder("mcp.calls.total")
            .description("Total MCP calls")
            .register(meterRegistry);
            
        this.mcpCallDuration = Timer.builder("mcp.call.duration")
            .description("MCP call duration")
            .register(meterRegistry);
    }
    
    public void recordCall(String toolName, Duration duration, boolean success) {
        mcpCallsTotal.increment(
            Tags.of(
                "tool", toolName,
                "status", success ? "success" : "error"
            )
        );
        
        mcpCallDuration.record(duration, Tags.of("tool", toolName));
    }
}
```

### 链路追踪

```java
@Component
public class McpTracing {
    
    @Autowired
    private Tracer tracer;
    
    public <T> T traceCall(String toolName, Supplier<T> supplier) {
        Span span = tracer.nextSpan()
            .name("mcp.call")
            .tag("mcp.tool", toolName)
            .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            T result = supplier.get();
            span.tag("mcp.status", "success");
            return result;
        } catch (Exception e) {
            span.tag("mcp.status", "error");
            span.tag("mcp.error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

## 最佳实践

### 1. 服务设计
- 保持工具功能单一
- 提供清晰的描述
- 定义明确的参数

### 2. 错误处理
- 实现重试机制
- 提供友好的错误信息
- 记录详细的日志

### 3. 性能优化
- 使用连接池
- 实现缓存机制
- 监控性能指标

### 4. 安全考虑
- 实施访问控制
- 验证输入参数
- 保护敏感数据

## 示例应用

### 企业知识库 MCP

```java
@McpServer
public class KnowledgeBaseMcp {
    
    @McpTool(name = "search-docs", description = "搜索企业文档")
    public List<Document> searchDocuments(
        @McpParameter("query") String query,
        @McpParameter("department") String department) {
        
        return documentService.search(query, department);
    }
    
    @McpResource(name = "policy", description = "获取企业政策")
    public Policy getPolicy(@McpParameter("policyId") String policyId) {
        return policyService.findById(policyId);
    }
}
```

## 下一步

- [了解 RAG 功能](/docs/1.0.0.3/single-agent/rag/)
- [学习模型评估](/docs/1.0.0.3/single-agent/model-evaluation/)
- [探索多智能体](/docs/1.0.0.3/multi-agent/agents/)
