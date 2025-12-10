# MCP Server Annotations

MCP Server Annotations 提供了一种使用 Java 注解实现 MCP 服务器功能的声明式方法。
这些注解简化了工具、资源、prompts 和 completion 处理器的创建。

## Server Annotations

### @McpTool

`@McpTool` 注解将方法标记为 MCP 工具实现，自动生成 JSON schema。

#### Basic Usage

```java
@Component
public class CalculatorTools {

    @McpTool(name = "add", description = "Add two numbers together")
    public int add(
            @McpToolParam(description = "First number", required = true) int a,
            @McpToolParam(description = "Second number", required = true) int b) {
        return a + b;
    }
}
```

#### Advanced Features

```java
@McpTool(name = "calculate-area", 
         description = "Calculate the area of a rectangle",
         annotations = McpTool.McpAnnotations(
             title = "Rectangle Area Calculator",
             readOnlyHint = true,
             destructiveHint = false,
             idempotentHint = true
         ))
public AreaResult calculateRectangleArea(
        @McpToolParam(description = "Width", required = true) double width,
        @McpToolParam(description = "Height", required = true) double height) {
    
    return new AreaResult(width * height, "square units");
}
```

#### With Request Context

工具可以访问请求上下文以进行高级操作：

```java
@McpTool(name = "process-data", description = "Process data with request context")
public String processData(
        McpSyncRequestContext context,
        @McpToolParam(description = "Data to process", required = true) String data) {
    
    // Send logging notification
    context.info("Processing data: " + data);
    
    // Send progress notification (using convenient method)
    context.progress(p -> p.progress(0.5).total(1.0).message("Processing..."));
    
    // Ping the client
    context.ping();
    
    return "Processed: " + data.toUpperCase();
}
```

#### Dynamic Schema Support

工具可以接受 `CallToolRequest` 进行运行时 schema 处理：

```java
@McpTool(name = "flexible-tool", description = "Process dynamic schema")
public CallToolResult processDynamic(CallToolRequest request) {
    Map<String, Object> args = request.arguments();
    
    // Process based on runtime schema
    String result = "Processed " + args.size() + " arguments dynamically";
    
    return CallToolResult.builder()
        .addTextContent(result)
        .build();
}
```

#### Progress Tracking

工具可以接收进度令牌以跟踪长时间运行的操作：

```java
@McpTool(name = "long-task", description = "Long-running task with progress")
public String performLongTask(
        McpSyncRequestContext context,
        @McpToolParam(description = "Task name", required = true) String taskName) {
    
    // Access progress token from context
    String progressToken = context.request().progressToken();
    
    if (progressToken != null) {
        context.progress(p -> p.progress(0.0).total(1.0).message("Starting task"));
        
        // Perform work...
        
        context.progress(p -> p.progress(1.0).total(1.0).message("Task completed"));
    }
    
    return "Task " + taskName + " completed";
}
```

### @McpResource

`@McpResource` 注解通过 URI 模板提供资源访问。

#### Basic Usage

```java
@Component
public class ResourceProvider {

    @McpResource(
        uri = "config://{key}", 
        name = "Configuration", 
        description = "Provides configuration data")
    public String getConfig(String key) {
        return configData.get(key);
    }
}
```

#### With ReadResourceResult

```java
@McpResource(
    uri = "user-profile://{username}", 
    name = "User Profile", 
    description = "Provides user profile information")
public ReadResourceResult getUserProfile(String username) {
    String profileData = loadUserProfile(username);
    
    return new ReadResourceResult(List.of(
        new TextResourceContents(
            "user-profile://" + username,
            "application/json", 
            profileData)
    ));
}
```

#### With Request Context

```java
@McpResource(
    uri = "data://{id}", 
    name = "Data Resource", 
    description = "Resource with request context")
public ReadResourceResult getData(
        McpSyncRequestContext context, 
        String id) {
    
    // Send logging notification using convenient method
    context.info("Accessing resource: " + id);
    
    // Ping the client
    context.ping();
    
    String data = fetchData(id);
    
    return new ReadResourceResult(List.of(
        new TextResourceContents("data://" + id, "text/plain", data)
    ));
}
```

### @McpPrompt

`@McpPrompt` 注解为 AI 交互生成 prompt 消息。

#### Basic Usage

```java
@Component
public class PromptProvider {

    @McpPrompt(
        name = "greeting", 
        description = "Generate a greeting message")
    public GetPromptResult greeting(
            @McpArg(name = "name", description = "User's name", required = true) 
            String name) {
        
        String message = "Hello, " + name + "! How can I help you today?";
        
        return new GetPromptResult(
            "Greeting",
            List.of(new PromptMessage(Role.ASSISTANT, new TextContent(message)))
        );
    }
}
```

#### With Optional Arguments

```java
@McpPrompt(
    name = "personalized-message",
    description = "Generate a personalized message")
public GetPromptResult personalizedMessage(
        @McpArg(name = "name", required = true) String name,
        @McpArg(name = "age", required = false) Integer age,
        @McpArg(name = "interests", required = false) String interests) {
    
    StringBuilder message = new StringBuilder();
    message.append("Hello, ").append(name).append("!\n\n");
    
    if (age != null) {
        message.append("At ").append(age).append(" years old, ");
        // Add age-specific content
    }
    
    if (interests != null && !interests.isEmpty()) {
        message.append("Your interest in ").append(interests);
        // Add interest-specific content
    }
    
    return new GetPromptResult(
        "Personalized Message",
        List.of(new PromptMessage(Role.ASSISTANT, new TextContent(message.toString())))
    );
}
```

### @McpComplete

`@McpComplete` 注解为 prompts 提供自动完成功能。

#### Basic Usage

```java
@Component
public class CompletionProvider {

    @McpComplete(prompt = "city-search")
    public List<String> completeCityName(String prefix) {
        return cities.stream()
            .filter(city -> city.toLowerCase().startsWith(prefix.toLowerCase()))
            .limit(10)
            .toList();
    }
}
```

#### With CompleteRequest.CompleteArgument

```java
@McpComplete(prompt = "travel-planner")
public List<String> completeTravelDestination(CompleteRequest.CompleteArgument argument) {
    String prefix = argument.value().toLowerCase();
    String argumentName = argument.name();
    
    // Different completions based on argument name
    if ("city".equals(argumentName)) {
        return completeCities(prefix);
    } else if ("country".equals(argumentName)) {
        return completeCountries(prefix);
    }
    
    return List.of();
}
```

#### With CompleteResult

```java
@McpComplete(prompt = "code-completion")
public CompleteResult completeCode(String prefix) {
    List<String> completions = generateCodeCompletions(prefix);
    
    return new CompleteResult(
        new CompleteResult.CompleteCompletion(
            completions,
            completions.size(),  // total
            hasMoreCompletions   // hasMore flag
        )
    );
}
```

## Stateless vs Stateful Implementations

### Unified Request Context (Recommended)

使用 `McpSyncRequestContext` 或 `McpAsyncRequestContext` 获得统一接口，适用于有状态和无状态操作：

```java
public record UserInfo(String name, String email, int age) {}

@McpTool(name = "unified-tool", description = "Tool with unified request context")
public String unifiedTool(
        McpSyncRequestContext context,
        @McpToolParam(description = "Input", required = true) String input) {
    
    // Access request and metadata
    String progressToken = context.request().progressToken();
    
    // Logging with convenient methods
    context.info("Processing: " + input);
    
    // Progress notifications (Note client should set a progress token 
    // with its request to be able to receive progress updates)
    context.progress(50); // Simple percentage    
    
    // Ping client
    context.ping();
    
    // Check capabilities before using
    if (context.elicitEnabled()) {
        // Request user input (only in stateful mode)
        StructuredElicitResult<UserInfo> elicitResult = context.elicit(UserInfo.class);
        if (elicitResult.action() == ElicitResult.Action.ACCEPT) {
            // Use elicited data
        }
    }
    
    if (context.sampleEnabled()) {
        // Request LLM sampling (only in stateful mode)
        CreateMessageResult samplingResult = context.sample("Generate response");
        // Use sampling result
    }
    
    return "Processed with unified context";
}
```

### Simple Operations (No Context)

对于简单操作，可以完全省略上下文参数：

```java
@McpTool(name = "simple-add", description = "Simple addition")
public int simpleAdd(
        @McpToolParam(description = "First number", required = true) int a,
        @McpToolParam(description = "Second number", required = true) int b) {
    return a + b;
}
```

### Lightweight Stateless (with McpTransportContext)

对于需要最小传输上下文的无状态操作：

```java
@McpTool(name = "stateless-tool", description = "Stateless with transport context")
public String statelessTool(
        McpTransportContext context,
        @McpToolParam(description = "Input", required = true) String input) {
    // Access transport-level context only
    // No bidirectional operations (roots, elicitation, sampling)
    return "Processed: " + input;
}
```

> **重要提示：** 无状态服务器不支持双向操作：

因此，在无状态模式下使用 `McpSyncRequestContext` 或 `McpAsyncRequestContext` 的方法会被忽略。

## Method Filtering by Server Type

MCP annotations 框架根据服务器类型和方法特征自动过滤带注解的方法。这确保只为每个服务器配置注册适当的方法。
每个被过滤的方法都会记录警告，以帮助调试。

### Synchronous vs Asynchronous Filtering

#### Synchronous Servers

同步服务器（配置为 `spring.ai.mcp.server.type=SYNC`）使用同步提供程序，它们：

* **接受** 具有非响应式返回类型的方法：
  - 基本类型（`int`、`double`、`boolean`）
  - 对象类型（`String`、`Integer`、自定义 POJOs）
  - MCP 类型（`CallToolResult`、`ReadResourceResult`、`GetPromptResult`、`CompleteResult`）
  - 集合（`List<String>`、`Map<String, Object>`）

* **过滤掉** 具有响应式返回类型的方法：
  - `Mono<T>`
  - `Flux<T>`
  - `Publisher<T>`

```java
@Component
public class SyncTools {
    
    @McpTool(name = "sync-tool", description = "Synchronous tool")
    public String syncTool(String input) {
        // This method WILL be registered on sync servers
        return "Processed: " + input;
    }
    
    @McpTool(name = "async-tool", description = "Async tool")
    public Mono<String> asyncTool(String input) {
        // This method will be FILTERED OUT on sync servers
        // A warning will be logged
        return Mono.just("Processed: " + input);
    }
}
```

#### Asynchronous Servers

异步服务器（配置为 `spring.ai.mcp.server.type=ASYNC`）使用异步提供程序，它们：

* **接受** 具有响应式返回类型的方法：
  - `Mono<T>`（用于单个结果）
  - `Flux<T>`（用于流式结果）
  - `Publisher<T>`（通用响应式类型）

* **过滤掉** 具有非响应式返回类型的方法：
  - 基本类型
  - 对象类型
  - 集合
  - MCP 结果类型

```java
@Component
public class AsyncTools {
    
    @McpTool(name = "async-tool", description = "Async tool")
    public Mono<String> asyncTool(String input) {
        // This method WILL be registered on async servers
        return Mono.just("Processed: " + input);
    }
    
    @McpTool(name = "sync-tool", description = "Sync tool")
    public String syncTool(String input) {
        // This method will be FILTERED OUT on async servers
        // A warning will be logged
        return "Processed: " + input;
    }
}
```

### Stateful vs Stateless Filtering

#### Stateful Servers

有状态服务器支持双向通信，并接受具有以下内容的方法：

* **双向上下文参数**：
  - `McpSyncRequestContext`（用于同步操作）
  - `McpAsyncRequestContext`（用于异步操作）
  - `McpSyncServerExchange`（遗留，用于同步操作）
  - `McpAsyncServerExchange`（遗留，用于异步操作）

* 支持双向操作：
  - `roots()` - 访问根目录
  - `elicit()` - 请求用户输入
  - `sample()` - 请求 LLM sampling

```java
@Component
public class StatefulTools {
    
    @McpTool(name = "interactive-tool", description = "Tool with bidirectional operations")
    public String interactiveTool(
            McpSyncRequestContext context,
            @McpToolParam(description = "Input", required = true) String input) {
        
        // This method WILL be registered on stateful servers
        // Can use elicitation, sampling, roots
        if (context.sampleEnabled()) {
            var samplingResult = context.sample("Generate response");
            // Process sampling result...
        }
        
        return "Processed with context";
    }
}
```

#### Stateless Servers

无状态服务器针对简单的请求-响应模式进行了优化，并且：

* **过滤掉** 具有双向上下文参数的方法：
  - 具有 `McpSyncRequestContext` 的方法会被跳过
  - 具有 `McpAsyncRequestContext` 的方法会被跳过
  - 具有 `McpSyncServerExchange` 的方法会被跳过
  - 具有 `McpAsyncServerExchange` 的方法会被跳过
  - 每个被过滤的方法都会记录警告

* **接受** 具有以下内容的方法：
  - `McpTransportContext`（轻量级无状态上下文）
  - 完全没有上下文参数
  - 只有常规的 `@McpToolParam` 参数

* **不支持** 双向操作：
  - `roots()` - 不可用
  - `elicit()` - 不可用
  - `sample()` - 不可用

```java
@Component
public class StatelessTools {
    
    @McpTool(name = "simple-tool", description = "Simple stateless tool")
    public String simpleTool(@McpToolParam(description = "Input") String input) {
        // This method WILL be registered on stateless servers
        return "Processed: " + input;
    }
    
    @McpTool(name = "context-tool", description = "Tool with transport context")
    public String contextTool(
            McpTransportContext context,
            @McpToolParam(description = "Input") String input) {
        // This method WILL be registered on stateless servers
        return "Processed: " + input;
    }
    
    @McpTool(name = "bidirectional-tool", description = "Tool with bidirectional context")
    public String bidirectionalTool(
            McpSyncRequestContext context,
            @McpToolParam(description = "Input") String input) {
        // This method will be FILTERED OUT on stateless servers
        // A warning will be logged
        return "Processed with sampling";
    }
}
```

### Filtering Summary

| Server Type | Accepted Methods | Filtered Methods |
| --- | --- | --- |
| **Sync Stateful** | Non-reactive returns + bidirectional context | Reactive returns (Mono/Flux) |
| **Async Stateful** | Reactive returns (Mono/Flux) + bidirectional context | Non-reactive returns |
| **Sync Stateless** | Non-reactive returns + no bidirectional context | Reactive returns OR bidirectional context parameters |
| **Async Stateless** | Reactive returns (Mono/Flux) + no bidirectional context | Non-reactive returns OR bidirectional context parameters |

> **提示：** 方法过滤的最佳实践：

1. **保持方法与服务器类型一致** - 同步服务器使用同步方法，异步服务器使用异步方法
2. **将有状态和无状态实现分离**到不同的类中以提高清晰度
3. **检查启动时的日志**以查看被过滤方法的警告
4. **使用正确的上下文** - 有状态使用 `McpSyncRequestContext`/`McpAsyncRequestContext`，无状态使用 `McpTransportContext`
5. **测试两种模式**（如果您同时支持有状态和无状态部署）

## Async Support

所有服务器注解都支持使用 Reactor 的异步实现：

```java
@Component
public class AsyncTools {

    @McpTool(name = "async-fetch", description = "Fetch data asynchronously")
    public Mono<String> asyncFetch(
            @McpToolParam(description = "URL", required = true) String url) {
        
        return Mono.fromCallable(() -> {
            // Simulate async operation
            return fetchFromUrl(url);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @McpResource(uri = "async-data://{id}", name = "Async Data")
    public Mono<ReadResourceResult> asyncResource(String id) {
        return Mono.fromCallable(() -> {
            String data = loadData(id);
            return new ReadResourceResult(List.of(
                new TextResourceContents("async-data://" + id, "text/plain", data)
            ));
        }).delayElements(Duration.ofMillis(100));
    }
}
```

## Spring Boot Integration

通过 Spring Boot 自动配置，带注解的 beans 会自动检测并注册：

```java
@SpringBootApplication
public class McpServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }
}

@Component
public class MyMcpTools {
    // Your @McpTool annotated methods
}

@Component
public class MyMcpResources {
    // Your @McpResource annotated methods
}
```

自动配置将：

1. 扫描带有 MCP 注解的 beans
2. 创建适当的规范
3. 将它们注册到 MCP 服务器
4. 根据配置处理同步和异步实现

## Configuration Properties

配置服务器注解扫描器：

```yaml
spring:
  ai:
    mcp:
      server:
        type: SYNC  # or ASYNC
        annotation-scanner:
          enabled: true
```

## Additional Resources

* [MCP Annotations Overview](api/mcp/mcp-annotations-overview.adoc)
* [Client Annotations](api/mcp/mcp-annotations-client.adoc)
* [Special Parameters](api/mcp/mcp-annotations-special-params.adoc)
* [MCP Server Boot Starter](api/mcp/mcp-server-boot-starter-docs.adoc)

