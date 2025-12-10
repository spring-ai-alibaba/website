# MCP Annotations Special Parameters

MCP Annotations 支持几种特殊参数类型，为带注解的方法提供额外的上下文和功能。
这些参数由框架自动注入，并从 JSON schema 生成中排除。

## Special Parameter Types

### McpMeta

`McpMeta` 类提供对来自 MCP 请求、通知和结果的元数据的访问。

#### Overview

* 用作方法参数时自动注入
* 从参数计数限制和 JSON schema 生成中排除
* 通过 `get(String key)` 方法提供便捷的元数据访问
* 如果请求中没有元数据，则注入空的 `McpMeta` 对象

#### Usage in Tools

```java
@McpTool(name = "contextual-tool", description = "Tool with metadata access")
public String processWithContext(
        @McpToolParam(description = "Input data", required = true) String data,
        McpMeta meta) {
    
    // Access metadata from the request
    String userId = (String) meta.get("userId");
    String sessionId = (String) meta.get("sessionId");
    String userRole = (String) meta.get("userRole");
    
    // Use metadata to customize behavior
    if ("admin".equals(userRole)) {
        return processAsAdmin(data, userId);
    } else {
        return processAsUser(data, userId);
    }
}
```

#### Usage in Resources

```java
@McpResource(uri = "secure-data://{id}", name = "Secure Data")
public ReadResourceResult getSecureData(String id, McpMeta meta) {
    
    String requestingUser = (String) meta.get("requestingUser");
    String accessLevel = (String) meta.get("accessLevel");
    
    // Check access permissions using metadata
    if (!"admin".equals(accessLevel)) {
        return new ReadResourceResult(List.of(
            new TextResourceContents("secure-data://" + id, 
                "text/plain", "Access denied")
        ));
    }
    
    String data = loadSecureData(id);
    return new ReadResourceResult(List.of(
        new TextResourceContents("secure-data://" + id, 
            "text/plain", data)
    ));
}
```

#### Usage in Prompts

```java
@McpPrompt(name = "localized-prompt", description = "Localized prompt generation")
public GetPromptResult localizedPrompt(
        @McpArg(name = "topic", required = true) String topic,
        McpMeta meta) {
    
    String language = (String) meta.get("language");
    String region = (String) meta.get("region");
    
    // Generate localized content based on metadata
    String message = generateLocalizedMessage(topic, language, region);
    
    return new GetPromptResult("Localized Prompt",
        List.of(new PromptMessage(Role.ASSISTANT, new TextContent(message)))
    );
}
```

### @McpProgressToken

`@McpProgressToken` 注解标记一个参数以接收来自 MCP 请求的进度令牌。

#### Overview

* 参数类型应为 `String`
* 自动从请求接收进度令牌值
* 从生成的 JSON schema 中排除
* 如果没有进度令牌，则注入 `null`
* 用于跟踪长时间运行的操作

#### Usage in Tools

```java
@McpTool(name = "long-operation", description = "Long-running operation with progress")
public String performLongOperation(
        @McpProgressToken String progressToken,
        @McpToolParam(description = "Operation name", required = true) String operation,
        @McpToolParam(description = "Duration in seconds", required = true) int duration,
        McpSyncServerExchange exchange) {
    
    if (progressToken != null) {
        // Send initial progress
        exchange.progressNotification(new ProgressNotification(
            progressToken, 0.0, 1.0, "Starting " + operation));
        
        // Simulate work with progress updates
        for (int i = 1; i <= duration; i++) {
            Thread.sleep(1000);
            double progress = (double) i / duration;
            
            exchange.progressNotification(new ProgressNotification(
                progressToken, progress, 1.0, 
                String.format("Processing... %d%%", (int)(progress * 100))));
        }
    }
    
    return "Operation " + operation + " completed";
}
```

#### Usage in Resources

```java
@McpResource(uri = "large-file://{path}", name = "Large File Resource")
public ReadResourceResult getLargeFile(
        @McpProgressToken String progressToken,
        String path,
        McpSyncServerExchange exchange) {
    
    File file = new File(path);
    long fileSize = file.length();
    
    if (progressToken != null) {
        // Track file reading progress
        exchange.progressNotification(new ProgressNotification(
            progressToken, 0.0, fileSize, "Reading file"));
    }
    
    String content = readFileWithProgress(file, progressToken, exchange);
    
    if (progressToken != null) {
        exchange.progressNotification(new ProgressNotification(
            progressToken, fileSize, fileSize, "File read complete"));
    }
    
    return new ReadResourceResult(List.of(
        new TextResourceContents("large-file://" + path, "text/plain", content)
    ));
}
```

### McpSyncRequestContext / McpAsyncRequestContext

请求上下文对象提供对 MCP 请求信息和服务器端操作的统一访问。

#### Overview

* 为有状态和无状态操作提供统一接口
* 用作参数时自动注入
* 从 JSON schema 生成中排除
* 支持日志记录、进度通知、sampling 和 elicitation 等高级功能
* 适用于有状态（服务器交换）和无状态（传输上下文）模式

#### McpSyncRequestContext Features

```java
public record UserInfo(String name, String email, int age) {}

@McpTool(name = "advanced-tool", description = "Tool with full server capabilities")
public String advancedTool(
        McpSyncRequestContext context,
        @McpToolParam(description = "Input", required = true) String input) {
    
    // Send logging notification
    context.info("Processing: " + input);
    
    // Ping the client
    context.ping();
    
    // Send progress updates
    context.progress(50); // 50% complete
    
    // Check if elicitation is supported before using it
    if (context.elicitEnabled()) {
        // Request additional information from user
        StructuredElicitResult<UserInfo> elicitResult = context.elicit(
            e -> e.message("Need additional information"),
            UserInfo.class
        );
        
        if (elicitResult.action() == ElicitResult.Action.ACCEPT) {
            UserInfo userInfo = elicitResult.structuredContent();
            // Use the user information
        }
    }
    
    // Check if sampling is supported before using it
    if (context.sampleEnabled()) {
        // Request LLM sampling
        CreateMessageResult samplingResult = context.sample(
            s -> s.message("Process: " + input)
                .modelPreferences(pref -> pref.modelHints("gpt-4"))
        );
    }
    
    return "Processed with advanced features";
}
```

#### McpAsyncRequestContext Features

```java
public record UserInfo(String name, String email, int age) {}

@McpTool(name = "async-advanced-tool", description = "Async tool with server capabilities")
public Mono<String> asyncAdvancedTool(
        McpAsyncRequestContext context,
        @McpToolParam(description = "Input", required = true) String input) {
    
    return context.info("Async processing: " + input)
        .then(context.progress(25))
        .then(context.ping())
        .flatMap(v -> {
            // Perform elicitation if supported
            if (context.elicitEnabled()) {
                return context.elicitation(UserInfo.class)
                    .map(userInfo -> "Processing for user: " + userInfo.name());
            }
            return Mono.just("Processing...");
        })
        .flatMap(msg -> {
            // Perform sampling if supported
            if (context.sampleEnabled()) {
                return context.sampling("Process: " + input)
                    .map(result -> "Completed: " + result);
            }
            return Mono.just("Completed: " + msg);
        });
}
```

### McpTransportContext

用于无状态操作的轻量级上下文。

#### Overview

* 提供最小上下文，无需完整的服务器交换
* 用于无状态实现
* 用作参数时自动注入
* 从 JSON schema 生成中排除

#### Usage Example

```java
@McpTool(name = "stateless-tool", description = "Stateless tool with context")
public String statelessTool(
        McpTransportContext context,
        @McpToolParam(description = "Input", required = true) String input) {
    
    // Limited context access
    // Useful for transport-level operations
    
    return "Processed in stateless mode: " + input;
}

@McpResource(uri = "stateless://{id}", name = "Stateless Resource")
public ReadResourceResult statelessResource(
        McpTransportContext context,
        String id) {
    
    // Access transport context if needed
    String data = loadData(id);
    
    return new ReadResourceResult(List.of(
        new TextResourceContents("stateless://" + id, "text/plain", data)
    ));
}
```

### CallToolRequest

需要访问完整请求和动态 schema 的工具的特殊参数。

#### Overview

* 提供对完整工具请求的访问
* 支持运行时动态 schema 处理
* 自动注入并从 schema 生成中排除
* 适用于适应不同输入 schema 的灵活工具

#### Usage Examples

```java
@McpTool(name = "dynamic-tool", description = "Tool with dynamic schema support")
public CallToolResult processDynamicSchema(CallToolRequest request) {
    Map<String, Object> args = request.arguments();
    
    // Process based on whatever schema was provided at runtime
    StringBuilder result = new StringBuilder("Processed:\n");
    
    for (Map.Entry<String, Object> entry : args.entrySet()) {
        result.append("  ").append(entry.getKey())
              .append(": ").append(entry.getValue()).append("\n");
    }
    
    return CallToolResult.builder()
        .addTextContent(result.toString())
        .build();
}
```

#### Mixed Parameters

```java
@McpTool(name = "hybrid-tool", description = "Tool with typed and dynamic parameters")
public String processHybrid(
        @McpToolParam(description = "Operation", required = true) String operation,
        @McpToolParam(description = "Priority", required = false) Integer priority,
        CallToolRequest request) {
    
    // Use typed parameters for known fields
    String result = "Operation: " + operation;
    if (priority != null) {
        result += " (Priority: " + priority + ")";
    }
    
    // Access additional dynamic arguments
    Map<String, Object> allArgs = request.arguments();
    
    // Remove known parameters to get only additional ones
    Map<String, Object> additionalArgs = new HashMap<>(allArgs);
    additionalArgs.remove("operation");
    additionalArgs.remove("priority");
    
    if (!additionalArgs.isEmpty()) {
        result += " with " + additionalArgs.size() + " additional parameters";
    }
    
    return result;
}
```

#### With Progress Token

```java
@McpTool(name = "flexible-with-progress", description = "Flexible tool with progress")
public CallToolResult flexibleWithProgress(
        @McpProgressToken String progressToken,
        CallToolRequest request,
        McpSyncServerExchange exchange) {
    
    Map<String, Object> args = request.arguments();
    
    if (progressToken != null) {
        exchange.progressNotification(new ProgressNotification(
            progressToken, 0.0, 1.0, "Processing dynamic request"));
    }
    
    // Process dynamic arguments
    String result = processDynamicArgs(args);
    
    if (progressToken != null) {
        exchange.progressNotification(new ProgressNotification(
            progressToken, 1.0, 1.0, "Complete"));
    }
    
    return CallToolResult.builder()
        .addTextContent(result)
        .build();
}
```

## Parameter Injection Rules

### Automatic Injection

以下参数由框架自动注入：

1. `McpMeta` - 来自请求的元数据
2. `@McpProgressToken String` - 进度令牌（如果可用）
3. `McpSyncServerExchange` / `McpAsyncServerExchange` - 服务器交换上下文
4. `McpTransportContext` - 用于无状态操作的传输上下文
5. `CallToolRequest` - 用于动态 schema 的完整工具请求

### Schema Generation

特殊参数从 JSON schema 生成中排除：

* 它们不会出现在工具的输入 schema 中
* 它们不计入参数限制
* 它们对 MCP 客户端不可见

### Null Handling

* `McpMeta` - 永不为 null，如果没有元数据则为空对象
* `@McpProgressToken` - 如果没有提供令牌，可以为 null
* Server exchanges - 在正确配置时永不为 null
* `CallToolRequest` - 对于工具方法永不为 null

## Best Practices

### Use McpMeta for Context

```java
@McpTool(name = "context-aware", description = "Context-aware tool")
public String contextAware(
        @McpToolParam(description = "Data", required = true) String data,
        McpMeta meta) {
    
    // Always check for null values in metadata
    String userId = (String) meta.get("userId");
    if (userId == null) {
        userId = "anonymous";
    }
    
    return processForUser(data, userId);
}
```

### Progress Token Null Checks

```java
@McpTool(name = "safe-progress", description = "Safe progress handling")
public String safeProgress(
        @McpProgressToken String progressToken,
        @McpToolParam(description = "Task", required = true) String task,
        McpSyncServerExchange exchange) {
    
    // Always check if progress token is available
    if (progressToken != null) {
        exchange.progressNotification(new ProgressNotification(
            progressToken, 0.0, 1.0, "Starting"));
    }
    
    // Perform work...
    
    if (progressToken != null) {
        exchange.progressNotification(new ProgressNotification(
            progressToken, 1.0, 1.0, "Complete"));
    }
    
    return "Task completed";
}
```

### Choose the Right Context

* 使用 `McpSyncRequestContext` / `McpAsyncRequestContext` 统一访问请求上下文，支持有状态和无状态操作，并提供便捷的辅助方法
* 使用 `McpTransportContext` 进行简单的无状态操作，当您只需要传输级上下文时
* 对于最简单的情况，完全省略上下文参数

### Capability Checking

在使用客户端功能之前，始终检查能力支持：

```java
@McpTool(name = "capability-aware", description = "Tool that checks capabilities")
public String capabilityAware(
        McpSyncRequestContext context,
        @McpToolParam(description = "Data", required = true) String data) {
    
    // Check if elicitation is supported before using it
    if (context.elicitEnabled()) {
        // Safe to use elicitation
        var result = context.elicit(UserInfo.class);
        // Process result...
    }
    
    // Check if sampling is supported before using it
    if (context.sampleEnabled()) {
        // Safe to use sampling
        var samplingResult = context.sample("Process: " + data);
        // Process result...
    }
    
    // Note: Stateless servers do not support bidirectional operations
    // (roots, elicitation, sampling) and will return false for these checks
    
    return "Processed with capability awareness";
}
```


