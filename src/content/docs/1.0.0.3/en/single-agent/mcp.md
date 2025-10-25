---
title: Model Context Protocol (MCP)
description: Spring AI Alibaba MCP integration
---

# Model Context Protocol (MCP)

Model Context Protocol (MCP) is an open standard for establishing secure, controlled connections between AI applications and external data sources and tools.

## MCP Overview

### What is MCP
MCP provides a standardized way to:
- Connect AI models with external tools
- Manage context and resources
- Ensure secure data access
- Enable dynamic tool discovery

### Core Components
- **MCP Server**: Server-side providing tools and resources
- **MCP Client**: Client-side consuming tools and resources
- **Protocol Layer**: Standardized communication protocol
- **Security Layer**: Authentication and authorization mechanisms

## Spring AI Alibaba MCP Integration

### Basic Configuration

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

### MCP Server Implementation

```java
@McpServer
@RestController
public class MyMcpServer {
    
    @McpTool(name = "calculator", description = "Perform mathematical calculations")
    public String calculate(@McpParameter("expression") String expression) {
        // Implement calculation logic
        return evaluateExpression(expression);
    }
    
    @McpResource(name = "user-data", description = "Get user data")
    public UserData getUserData(@McpParameter("userId") String userId) {
        // Get user data
        return userService.findById(userId);
    }
    
    @McpPrompt(name = "summarize", description = "Text summarization prompt")
    public String getSummarizePrompt(@McpParameter("text") String text) {
        return "Please generate a summary for the following text:\n" + text;
    }
}
```

## Nacos MCP Registry

Spring AI Alibaba provides Nacos-based MCP service registration and discovery.

### Configure Nacos Registry

```properties
# Nacos configuration
spring.cloud.nacos.discovery.server-addr=127.0.0.1:8848
spring.cloud.nacos.discovery.namespace=mcp

# MCP Registry configuration
spring.ai.mcp.registry.enabled=true
spring.ai.mcp.registry.type=nacos
spring.ai.mcp.registry.nacos.group=MCP_GROUP
```

### Service Registration

```java
@Service
public class McpServiceRegistry {
    
    @Autowired
    private NacosDiscoveryProperties nacosProperties;
    
    @PostConstruct
    public void registerMcpServices() {
        McpServiceDefinition service = McpServiceDefinition.builder()
            .name("calculator-service")
            .description("Mathematical calculation service")
            .version("1.0.0")
            .endpoint("http://localhost:8080/mcp/calculator")
            .tools(List.of(
                McpToolDefinition.builder()
                    .name("add")
                    .description("Addition operation")
                    .parameters(Map.of(
                        "a", "First number",
                        "b", "Second number"
                    ))
                    .build()
            ))
            .build();
        
        mcpRegistry.register(service);
    }
}
```

### Service Discovery

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

## Tool Calling Integration

### MCP Tool Adapter

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

### Using in Chat Client

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

## Security and Authentication

### API Key Authentication

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

### OAuth2 Authentication

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

## Monitoring and Observability

### MCP Metrics

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

### Distributed Tracing

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

## Best Practices

### 1. Service Design
- Keep tool functionality focused
- Provide clear descriptions
- Define explicit parameters

### 2. Error Handling
- Implement retry mechanisms
- Provide friendly error messages
- Log detailed information

### 3. Performance Optimization
- Use connection pooling
- Implement caching mechanisms
- Monitor performance metrics

### 4. Security Considerations
- Implement access controls
- Validate input parameters
- Protect sensitive data

## Example Application

### Enterprise Knowledge Base MCP

```java
@McpServer
public class KnowledgeBaseMcp {
    
    @McpTool(name = "search-docs", description = "Search enterprise documents")
    public List<Document> searchDocuments(
        @McpParameter("query") String query,
        @McpParameter("department") String department) {
        
        return documentService.search(query, department);
    }
    
    @McpResource(name = "policy", description = "Get enterprise policy")
    public Policy getPolicy(@McpParameter("policyId") String policyId) {
        return policyService.findById(policyId);
    }
}
```

## Next Steps

- [Learn about RAG Features](/docs/1.0.0.3/single-agent/rag/)
- [Understand Model Evaluation](/docs/1.0.0.3/single-agent/model-evaluation/)
- [Explore Multi-Agent Systems](/docs/1.0.0.3/multi-agent/agents/)
