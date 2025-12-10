# MCP Client Annotations

MCP Client Annotations 提供了一种使用 Java 注解实现 MCP 客户端处理器的声明式方法。
这些注解简化了服务器通知和客户端操作的处理。

> **重要提示：** 所有 MCP 客户端注解必须包含 `clients` 参数，以将处理器与特定的 MCP 客户端连接关联。`clients` 必须与应用程序属性中配置的连接名称匹配。

## Client Annotations

### @McpLogging

`@McpLogging` 注解处理来自 MCP 服务器的日志消息通知。

#### Basic Usage

```java
@Component
public class LoggingHandler {

    @McpLogging(clients = "my-mcp-server")
    public void handleLoggingMessage(LoggingMessageNotification notification) {
        System.out.println("Received log: " + notification.level() + 
                          " - " + notification.data());
    }
}
```

#### With Individual Parameters

```java
@McpLogging(clients = "my-mcp-server")
public void handleLoggingWithParams(LoggingLevel level, String logger, String data) {
    System.out.println(String.format("[%s] %s: %s", level, logger, data));
}
```

### @McpSampling

`@McpSampling` 注解处理来自 MCP 服务器的 LLM completions 的 sampling 请求。

#### Synchronous Implementation

```java
@Component
public class SamplingHandler {

    @McpSampling(clients = "llm-server")
    public CreateMessageResult handleSamplingRequest(CreateMessageRequest request) {
        // Process the request and generate a response
        String response = generateLLMResponse(request);
        
        return CreateMessageResult.builder()
            .role(Role.ASSISTANT)
            .content(new TextContent(response))
            .model("gpt-4")
            .build();
    }
}
```

#### Asynchronous Implementation

```java
@Component
public class AsyncSamplingHandler {

    @McpSampling(clients = "llm-server")
    public Mono<CreateMessageResult> handleAsyncSampling(CreateMessageRequest request) {
        return Mono.fromCallable(() -> {
            String response = generateLLMResponse(request);
            
            return CreateMessageResult.builder()
                .role(Role.ASSISTANT)
                .content(new TextContent(response))
                .model("gpt-4")
                .build();
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
```

### @McpElicitation

`@McpElicitation` 注解处理用于从用户收集额外信息的 elicitation 请求。

#### Basic Usage

```java
@Component
public class ElicitationHandler {

    @McpElicitation(clients = "interactive-server")
    public ElicitResult handleElicitationRequest(ElicitRequest request) {
        // Present the request to the user and gather input
        Map<String, Object> userData = presentFormToUser(request.requestedSchema());
        
        if (userData != null) {
            return new ElicitResult(ElicitResult.Action.ACCEPT, userData);
        } else {
            return new ElicitResult(ElicitResult.Action.DECLINE, null);
        }
    }
}
```

#### With User Interaction

```java
@McpElicitation(clients = "interactive-server")
public ElicitResult handleInteractiveElicitation(ElicitRequest request) {
    Map<String, Object> schema = request.requestedSchema();
    Map<String, Object> userData = new HashMap<>();
    
    // Check what information is being requested
    if (schema != null && schema.containsKey("properties")) {
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        
        // Gather user input based on schema
        if (properties.containsKey("name")) {
            userData.put("name", promptUser("Enter your name:"));
        }
        if (properties.containsKey("email")) {
            userData.put("email", promptUser("Enter your email:"));
        }
        if (properties.containsKey("preferences")) {
            userData.put("preferences", gatherPreferences());
        }
    }
    
    return new ElicitResult(ElicitResult.Action.ACCEPT, userData);
}
```

#### Async Elicitation

```java
@McpElicitation(clients = "interactive-server")
public Mono<ElicitResult> handleAsyncElicitation(ElicitRequest request) {
    return Mono.fromCallable(() -> {
        // Async user interaction
        Map<String, Object> userData = asyncGatherUserInput(request);
        return new ElicitResult(ElicitResult.Action.ACCEPT, userData);
    }).timeout(Duration.ofSeconds(30))
      .onErrorReturn(new ElicitResult(ElicitResult.Action.CANCEL, null));
}
```

### @McpProgress

`@McpProgress` 注解处理长时间运行操作的进度通知。

#### Basic Usage

```java
@Component
public class ProgressHandler {

    @McpProgress(clients = "my-mcp-server")
    public void handleProgressNotification(ProgressNotification notification) {
        double percentage = notification.progress() * 100;
        System.out.println(String.format("Progress: %.2f%% - %s", 
            percentage, notification.message()));
    }
}
```

#### With Individual Parameters

```java
@McpProgress(clients = "my-mcp-server")
public void handleProgressWithDetails(
        String progressToken, 
        double progress, 
        Double total, 
        String message) {
    
    if (total != null) {
        System.out.println(String.format("[%s] %.0f/%.0f - %s", 
            progressToken, progress, total, message));
    } else {
        System.out.println(String.format("[%s] %.2f%% - %s", 
            progressToken, progress * 100, message));
    }
    
    // Update UI progress bar
    updateProgressBar(progressToken, progress);
}
```

#### Client-Specific Progress

```java
@McpProgress(clients = "long-running-server")
public void handleLongRunningProgress(ProgressNotification notification) {
    // Track progress for specific server
    progressTracker.update("long-running-server", notification);
    
    // Send notifications if needed
    if (notification.progress() >= 1.0) {
        notifyCompletion(notification.progressToken());
    }
}
```

### @McpToolListChanged

`@McpToolListChanged` 注解处理服务器工具列表变更时的通知。

#### Basic Usage

```java
@Component
public class ToolListChangedHandler {

    @McpToolListChanged(clients = "tool-server")
    public void handleToolListChanged(List<McpSchema.Tool> updatedTools) {
        System.out.println("Tool list updated: " + updatedTools.size() + " tools available");
        
        // Update local tool registry
        toolRegistry.updateTools(updatedTools);
        
        // Log new tools
        for (McpSchema.Tool tool : updatedTools) {
            System.out.println("  - " + tool.name() + ": " + tool.description());
        }
    }
}
```

#### Async Handling

```java
@McpToolListChanged(clients = "tool-server")
public Mono<Void> handleAsyncToolListChanged(List<McpSchema.Tool> updatedTools) {
    return Mono.fromRunnable(() -> {
        // Process tool list update asynchronously
        processToolListUpdate(updatedTools);
        
        // Notify interested components
        eventBus.publish(new ToolListUpdatedEvent(updatedTools));
    }).then();
}
```

#### Client-Specific Tool Updates

```java
@McpToolListChanged(clients = "dynamic-server")
public void handleDynamicServerToolUpdate(List<McpSchema.Tool> updatedTools) {
    // Handle tools from a specific server that frequently changes its tools
    dynamicToolManager.updateServerTools("dynamic-server", updatedTools);
    
    // Re-evaluate tool availability
    reevaluateToolCapabilities();
}
```

### @McpResourceListChanged

`@McpResourceListChanged` 注解处理服务器资源列表变更时的通知。

#### Basic Usage

```java
@Component
public class ResourceListChangedHandler {

    @McpResourceListChanged(clients = "resource-server")
    public void handleResourceListChanged(List<McpSchema.Resource> updatedResources) {
        System.out.println("Resources updated: " + updatedResources.size());
        
        // Update resource cache
        resourceCache.clear();
        for (McpSchema.Resource resource : updatedResources) {
            resourceCache.register(resource);
        }
    }
}
```

#### With Resource Analysis

```java
@McpResourceListChanged(clients = "resource-server")
public void analyzeResourceChanges(List<McpSchema.Resource> updatedResources) {
    // Analyze what changed
    Set<String> newUris = updatedResources.stream()
        .map(McpSchema.Resource::uri)
        .collect(Collectors.toSet());
    
    Set<String> removedUris = previousUris.stream()
        .filter(uri -> !newUris.contains(uri))
        .collect(Collectors.toSet());
    
    if (!removedUris.isEmpty()) {
        handleRemovedResources(removedUris);
    }
    
    // Update tracking
    previousUris = newUris;
}
```

### @McpPromptListChanged

`@McpPromptListChanged` 注解处理服务器 prompt 列表变更时的通知。

#### Basic Usage

```java
@Component
public class PromptListChangedHandler {

    @McpPromptListChanged(clients = "prompt-server")
    public void handlePromptListChanged(List<McpSchema.Prompt> updatedPrompts) {
        System.out.println("Prompts updated: " + updatedPrompts.size());
        
        // Update prompt catalog
        promptCatalog.updatePrompts(updatedPrompts);
        
        // Refresh UI if needed
        if (uiController != null) {
            uiController.refreshPromptList(updatedPrompts);
        }
    }
}
```

#### Async Processing

```java
@McpPromptListChanged(clients = "prompt-server")
public Mono<Void> handleAsyncPromptUpdate(List<McpSchema.Prompt> updatedPrompts) {
    return Flux.fromIterable(updatedPrompts)
        .flatMap(prompt -> validatePrompt(prompt))
        .collectList()
        .doOnNext(validPrompts -> {
            promptRepository.saveAll(validPrompts);
        })
        .then();
}
```

## Spring Boot Integration

通过 Spring Boot 自动配置，客户端处理器会自动检测并注册：

```java
@SpringBootApplication
public class McpClientApplication {
    public static void main(String[] args) {
        SpringApplication.run(McpClientApplication.class, args);
    }
}

@Component
public class MyClientHandlers {

    @McpLogging(clients = "my-server")
    public void handleLogs(LoggingMessageNotification notification) {
        // Handle logs
    }

    @McpSampling(clients = "my-server")
    public CreateMessageResult handleSampling(CreateMessageRequest request) {
        // Handle sampling
    }

    @McpProgress(clients = "my-server")
    public void handleProgress(ProgressNotification notification) {
        // Handle progress
    }
}
```

自动配置将：

1. 扫描带有 MCP 客户端注解的 beans
2. 创建适当的规范
3. 将它们注册到 MCP 客户端
4. 支持同步和异步实现
5. 处理多个客户端，每个客户端有特定的处理器

## Configuration Properties

配置客户端注解扫描器和客户端连接：

```yaml
spring:
  ai:
    mcp:
      client:
        type: SYNC  # or ASYNC
        annotation-scanner:
          enabled: true
        # Configure client connections - the connection names become clients values
        sse:
          connections:
            my-server:  # This becomes the clients
              url: http://localhost:8080
            tool-server:  # Another clients
              url: http://localhost:8081
        stdio:
          connections:
            local-server:  # This becomes the clients
              command: /path/to/mcp-server
              args:
                - --mode=production
```

> **重要提示：** 注解中的 `clients` 参数必须与配置中定义的连接名称匹配。在上面的示例中，有效的 `clients` 值将是：`"my-server"`、`"tool-server"` 和 `"local-server"`。

## Usage with MCP Client

带注解的处理器会自动与 MCP 客户端集成：

```java
@Autowired
private List<McpSyncClient> mcpClients;

// The clients will automatically use your annotated handlers based on clients
// No manual registration needed - handlers are matched to clients by name
```

对于每个 MCP 客户端连接，具有匹配 `clients` 的处理器将自动注册，并在相应事件发生时被调用。

## Additional Resources

* [MCP Annotations Overview](api/mcp/mcp-annotations-overview.adoc)
* [Server Annotations](api/mcp/mcp-annotations-server.adoc)
* [Special Parameters](api/mcp/mcp-annotations-special-params.adoc)
* [MCP Client Boot Starter](api/mcp/mcp-client-boot-starter-docs.adoc)

