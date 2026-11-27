# Bedrock Converse API

[Amazon Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html) 为对话式 AI 模型提供统一接口，具有增强功能，包括 function/tool calling、multimodal 输入和 streaming 响应。

Bedrock Converse API 具有以下高级功能：

* Tool/Function Calling: 支持对话期间的 function 定义和 tool 使用
* Multimodal Input: 能够在对话中处理文本和图像输入
* Streaming Support: 模型响应的实时 streaming
* System Messages: 支持系统级指令和上下文设置

> **提示：** Bedrock Converse API 在多个模型提供商之间提供统一接口，同时处理 AWS 特定的身份验证和基础设施问题。
> 目前，Converse API [Supported Models](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html) 包括：
> `Amazon Titan`、`Amazon Nova`、`AI21 Labs`、`Anthropic Claude`、`Cohere Command`、`Meta Llama`、`Mistral AI`。

> **注意：**
> 遵循 Bedrock 建议，Spring AI 正在过渡到使用 Amazon Bedrock 的 Converse API 来实现 Spring AI 中的所有 chat conversation 实现。
> 虽然现有的 [InvokeModel API](https://docs.spring.io/spring-ai/reference/api/chat/bedrock-chat.html) 支持对话应用程序，但我们强烈建议为所有 Chat conversation 模型采用 Converse API。
>
> Converse API 不支持 embedding 操作，因此这些操作将保留在当前 API 中，现有 `InvokeModel API` 中的 embedding model 功能将得到维护

## Prerequisites

请参阅 [Getting started with Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html) 以设置 API 访问

* 获取 AWS 凭据：如果您还没有 AWS 账户和 AWS CLI 配置，此视频指南可以帮助您配置它：[AWS CLI & SDK Setup in Less Than 4 Minutes!](https://youtu.be/gswVHTrRX8I?si=buaY7aeI0l3-bBVb)。您应该能够获得您的访问和安全密钥。

* 启用要使用的模型：转到 [Amazon Bedrock](https://us-east-1.console.aws.amazon.com/bedrock/home) 并从左侧的 [Model Access](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) 菜单，配置对您要使用的模型的访问。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

将 `spring-ai-starter-model-bedrock-converse` 依赖项添加到项目的 Maven `pom.xml` 或 Gradle `build.gradle` 构建文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-bedrock-converse</artifactId>
</dependency>
```

```gradle
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-bedrock-converse'
}
```

> **提示：** 请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

前缀 `spring.ai.bedrock.aws` 是用于配置与 AWS Bedrock 连接的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.bedrock.aws.region | 要使用的 AWS 区域 | us-east-1 |
| spring.ai.bedrock.aws.timeout | AWS 整个 API 调用的最大持续时间 | 5m |
| spring.ai.bedrock.aws.connectionTimeout | 建立连接时等待的最大持续时间 | 5s |
| spring.ai.bedrock.aws.connectionAcquisitionTimeout | 从池中等待新连接的最大持续时间 | 30s |
| spring.ai.bedrock.aws.asyncReadTimeout | 读取异步响应所花费的最大持续时间 | 30s |
| spring.ai.bedrock.aws.access-key | AWS access key | - |
| spring.ai.bedrock.aws.secret-key | AWS secret key | - |
| spring.ai.bedrock.aws.session-token | 用于临时凭据的 AWS session token | - |
| spring.ai.bedrock.aws.profile.name | AWS profile 名称。 | - |
| spring.ai.bedrock.aws.profile.credentials-path | AWS credentials 文件路径。 | - |
| spring.ai.bedrock.aws.profile.configuration-path | AWS config 文件路径。 | - |

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=bedrock-converse（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 bedrock-converse 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.bedrock.converse.chat` 是用于配置 Converse API 的 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.bedrock.converse.chat.enabled (Removed and no longer valid) | 启用 Bedrock Converse chat model。 | true |
| spring.ai.model.chat | 启用 Bedrock Converse chat model。 | bedrock-converse |
| spring.ai.bedrock.converse.chat.options.model | 要使用的模型 ID。您可以使用 [Supported models and model features](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html) | None。从 AWS Bedrock 控制台选择您的 [modelId](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/models)。 |
| spring.ai.bedrock.converse.chat.options.temperature | 控制输出的随机性。值可以在 [0.0,1.0] 范围内 | 0.8 |
| spring.ai.bedrock.converse.chat.options.top-p | 采样时要考虑的最大累积概率。 | AWS Bedrock 默认值 |
| spring.ai.bedrock.converse.chat.options.top-k | 用于生成下一个 token 的 token 选择数量。 | AWS Bedrock 默认值 |
| spring.ai.bedrock.converse.chat.options.max-tokens | 生成响应中的最大 tokens 数。 | 500 |

## Runtime Options [[chat-options]]

使用可移植的 `ChatOptions` 或 `BedrockChatOptions` 可移植构建器来创建模型配置，例如 temperature、maxToken、topP 等。

在启动时，可以使用 `BedrockConverseProxyChatModel(api, options)` 构造函数或 `spring.ai.bedrock.converse.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项：

```java
var options = BedrockChatOptions.builder()
        .model("anthropic.claude-3-5-sonnet-20240620-v1:0")
        .temperature(0.6)
        .maxTokens(300)
        .toolCallbacks(List.of(FunctionToolCallback.builder("getCurrentWeather", new WeatherService())
            .description("Get the weather in location. Return temperature in 36°F or 36°C format. Use multi-turn if needed.")
            .inputType(WeatherService.Request.class)
            .build()))
        .build();

String response = ChatClient.create(this.chatModel)
    .prompt("What is current weather in Amsterdam?")
    .options(options)
    .call()
    .content();
```

## Prompt Caching

AWS Bedrock 的 [prompt caching feature](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) 允许您缓存经常使用的 prompts 以降低成本并提高重复交互的响应时间。
当您缓存 prompt 时，后续相同的请求可以重用缓存的内容，从而显著减少处理的输入 tokens 数量。

> **注意：**
> *支持的模型*
>
> Prompt caching 在通过 AWS Bedrock 提供的 Claude 3.x、Claude 4.x 和 Amazon Nova 模型上受支持。
>
> *Token 要求*
>
> 不同的模型对缓存有效性有不同的最小 token 阈值：
> - Claude Sonnet 4 和大多数模型：1024+ tokens
> - 模型特定要求可能有所不同 - 请查阅 AWS Bedrock 文档

### Cache Strategies

Spring AI 通过 `BedrockCacheStrategy` 枚举提供战略性缓存放置：

* `NONE`: 完全禁用 prompt caching（默认）
* `SYSTEM_ONLY`: 仅缓存 system message 内容
* `TOOLS_ONLY`: 仅缓存 tool 定义（仅限 Claude 模型）
* `SYSTEM_AND_TOOLS`: 缓存 system message 和 tool 定义（仅限 Claude 模型）
* `CONVERSATION_HISTORY`: 在 chat memory 场景中缓存整个对话历史

这种战略性方法确保在遵守 AWS Bedrock 的 4 个断点限制的同时，在最佳位置放置缓存断点。

> **注意：**
> *Amazon Nova 限制*
>
> Amazon Nova 模型（Nova Micro、Lite、Pro、Premier）仅支持缓存 `system` 和 `messages` 内容。
> 它们**不支持**缓存 `tools`。
>
> 如果您尝试对 Nova 模型使用 `TOOLS_ONLY` 或 `SYSTEM_AND_TOOLS` 策略，AWS 将返回 `ValidationException`。
> 对 Amazon Nova 模型使用 `SYSTEM_ONLY` 策略。

### Enabling Prompt Caching

通过在 `BedrockChatOptions` 上设置 `cacheOptions` 并选择 `strategy` 来启用 prompt caching。

#### System-Only Caching

最常见的用例 - 跨多个请求缓存系统指令：

```java
// Cache system message content
ChatResponse response = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage("You are a helpful AI assistant with extensive knowledge..."),
            new UserMessage("What is machine learning?")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                .build())
            .maxTokens(500)
            .build()
    )
);
```

#### Tools-Only Caching

缓存大型 tool 定义，同时保持 system prompts 动态（仅限 Claude 模型）：

```java
// Cache tool definitions only
ChatResponse response = chatModel.call(
    new Prompt(
        "What's the weather in San Francisco?",
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.TOOLS_ONLY)
                .build())
            .toolCallbacks(weatherToolCallbacks)  // Large tool definitions
            .maxTokens(500)
            .build()
    )
);
```

> **注意：** 此策略仅在 Claude 模型上受支持。
> Amazon Nova 模型将返回 `ValidationException`。

#### System and Tools Caching

缓存系统指令和 tool 定义以实现最大重用（仅限 Claude 模型）：

```java
// Cache system message and tool definitions
ChatResponse response = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage("You are a weather analysis assistant..."),
            new UserMessage("What's the weather like in Tokyo?")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_AND_TOOLS)
                .build())
            .toolCallbacks(weatherToolCallbacks)
            .maxTokens(500)
            .build()
    )
);
```

> **注意：** 此策略使用 2 个缓存断点（一个用于 tools，一个用于 system）。
> 仅在 Claude 模型上受支持。

#### Conversation History Caching

缓存不断增长的对话历史，用于多轮聊天机器人和助手：

```java
// Cache conversation history with ChatClient and memory
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultSystem("You are a personalized career counselor...")
    .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory)
        .conversationId(conversationId)
        .build())
    .build();

String response = chatClient.prompt()
    .user("What career advice would you give me?")
    .options(BedrockChatOptions.builder()
        .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
        .cacheOptions(BedrockCacheOptions.builder()
            .strategy(BedrockCacheStrategy.CONVERSATION_HISTORY)
            .build())
        .maxTokens(500)
        .build())
    .call()
    .content();
```

#### Using ChatClient Fluent API

```java
String response = ChatClient.create(chatModel)
    .prompt()
    .system("You are an expert document analyst...")
    .user("Analyze this large document: " + document)
    .options(BedrockChatOptions.builder()
        .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
        .cacheOptions(BedrockCacheOptions.builder()
            .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
            .build())
        .build())
    .call()
    .content();
```

### Usage Example

以下是一个完整的示例，演示了带有成本跟踪的 prompt caching：

```java
// Create system content that will be reused multiple times
String largeSystemPrompt = "You are an expert software architect specializing in distributed systems...";
// (Ensure this is 1024+ tokens for cache effectiveness)

// First request - creates cache
ChatResponse firstResponse = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage(largeSystemPrompt),
            new UserMessage("What is microservices architecture?")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                .build())
            .maxTokens(500)
            .build()
    )
);

// Access cache-related token usage from metadata
Integer cacheWrite1 = (Integer) firstResponse.getMetadata()
    .getMetadata()
    .get("cacheWriteInputTokens");
Integer cacheRead1 = (Integer) firstResponse.getMetadata()
    .getMetadata()
    .get("cacheReadInputTokens");

System.out.println("Cache creation tokens: " + cacheWrite1);
System.out.println("Cache read tokens: " + cacheRead1);

// Second request with same system prompt - reads from cache
ChatResponse secondResponse = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage(largeSystemPrompt),  // Same prompt - cache hit
            new UserMessage("What are the benefits of event sourcing?")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                .build())
            .maxTokens(500)
            .build()
    )
);

Integer cacheWrite2 = (Integer) secondResponse.getMetadata()
    .getMetadata()
    .get("cacheWriteInputTokens");
Integer cacheRead2 = (Integer) secondResponse.getMetadata()
    .getMetadata()
    .get("cacheReadInputTokens");

System.out.println("Cache creation tokens: " + cacheWrite2); // Should be 0
System.out.println("Cache read tokens: " + cacheRead2);      // Should be > 0
```

### Token Usage Tracking

AWS Bedrock 通过响应 metadata 提供缓存特定的指标。
缓存指标可通过 metadata Map 访问：

```java
ChatResponse response = chatModel.call(/* ... */);

// Access cache metrics from metadata Map
Integer cacheWrite = (Integer) response.getMetadata()
    .getMetadata()
    .get("cacheWriteInputTokens");
Integer cacheRead = (Integer) response.getMetadata()
    .getMetadata()
    .get("cacheReadInputTokens");
```

缓存特定的指标包括：

* `cacheWriteInputTokens`: 返回创建缓存条目时使用的 tokens 数量
* `cacheReadInputTokens`: 返回从现有缓存条目读取的 tokens 数量

当您首次发送缓存的 prompt 时：
- `cacheWriteInputTokens` 将大于 0
- `cacheReadInputTokens` 将为 0

当您再次发送相同的缓存 prompt 时（在 5 分钟 TTL 内）：
- `cacheWriteInputTokens` 将为 0
- `cacheReadInputTokens` 将大于 0

### Real-World Use Cases

#### Legal Document Analysis

通过跨多个问题缓存文档内容，高效分析大型法律合同或合规文档：

```java
// Load a legal contract (PDF or text)
String legalContract = loadDocument("merger-agreement.pdf"); // ~3000 tokens

// System prompt with legal expertise
String legalSystemPrompt = "You are an expert legal analyst specializing in corporate law. " +
    "Analyze the following contract and provide precise answers about terms, obligations, and risks: " +
    legalContract;

// First analysis - creates cache
ChatResponse riskAnalysis = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage(legalSystemPrompt),
            new UserMessage("What are the key termination clauses and associated penalties?")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                .build())
            .maxTokens(1000)
            .build()
    )
);

// Subsequent questions reuse cached document - 90% cost savings
ChatResponse obligationAnalysis = chatModel.call(
    new Prompt(
        List.of(
            new SystemMessage(legalSystemPrompt), // Same content - cache hit
            new UserMessage("List all financial obligations and payment schedules.")
        ),
        BedrockChatOptions.builder()
            .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                .build())
            .maxTokens(1000)
            .build()
    )
);
```

#### Batch Code Review

在缓存审查指南的同时，使用一致的审查标准处理多个代码文件：

```java
// Define comprehensive code review guidelines
String reviewGuidelines = """
    You are a senior software engineer conducting code reviews. Apply these criteria:
    - Security vulnerabilities and best practices
    - Performance optimizations and memory usage
    - Code maintainability and readability
    - Testing coverage and edge cases
    - Design patterns and architecture compliance
    """;

List<String> codeFiles = Arrays.asList(
    "UserService.java", "PaymentController.java", "SecurityConfig.java"
);

List<String> reviews = new ArrayList<>();

for (String filename : codeFiles) {
    String sourceCode = loadSourceFile(filename);

    ChatResponse review = chatModel.call(
        new Prompt(
            List.of(
                new SystemMessage(reviewGuidelines), // Cached across all reviews
                new UserMessage("Review this " + filename + " code:\n\n" + sourceCode)
            ),
            BedrockChatOptions.builder()
                .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
                .cacheOptions(BedrockCacheOptions.builder()
                    .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                    .build())
                .maxTokens(800)
                .build()
        )
    );

    reviews.add(review.getResult().getOutput().getText());
}

// Guidelines cached after first request, subsequent reviews are faster and cheaper
```

#### Customer Support with Knowledge Base

创建一个客户支持系统，缓存您的产品知识库以提供一致、准确的响应：

```java
// Load comprehensive product knowledge
String knowledgeBase = """
    PRODUCT DOCUMENTATION:
    - API endpoints and authentication methods
    - Common troubleshooting procedures
    - Billing and subscription details
    - Integration guides and examples
    - Known issues and workarounds
    """ + loadProductDocs(); // ~2500 tokens

@Service
public class CustomerSupportService {

    public String handleCustomerQuery(String customerQuery, String customerId) {
        ChatResponse response = chatModel.call(
            new Prompt(
                List.of(
                    new SystemMessage("You are a helpful customer support agent. " +
                        "Use this knowledge base to provide accurate solutions: " + knowledgeBase),
                    new UserMessage("Customer " + customerId + " asks: " + customerQuery)
                ),
                BedrockChatOptions.builder()
                    .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
                    .cacheOptions(BedrockCacheOptions.builder()
                        .strategy(BedrockCacheStrategy.SYSTEM_ONLY)
                        .build())
                    .maxTokens(600)
                    .build()
            )
        );

        return response.getResult().getOutput().getText();
    }
}

// Knowledge base is cached across all customer queries
// Multiple support agents can benefit from the same cached content
```

#### Multi-Tenant SaaS Application

跨不同租户缓存共享 tool 定义，同时为每个租户自定义 system prompts：

```java
// Shared tool definitions (cached once, used across all tenants)
List<FunctionToolCallback> sharedTools = createLargeToolRegistry(); // ~2000 tokens

// Tenant-specific configuration
@Service
public class MultiTenantAIService {

    public String processRequest(String tenantId, String userQuery) {
        // Load tenant-specific system prompt (changes per tenant)
        String tenantPrompt = loadTenantSystemPrompt(tenantId);

        ChatResponse response = chatModel.call(
            new Prompt(
                List.of(
                    new SystemMessage(tenantPrompt), // Tenant-specific, not cached
                    new UserMessage(userQuery)
                ),
                BedrockChatOptions.builder()
                    .model("us.anthropic.claude-3-7-sonnet-20250219-v1:0")
                    .cacheOptions(BedrockCacheOptions.builder()
                        .strategy(BedrockCacheStrategy.TOOLS_ONLY)
                        .build())
                    .toolCallbacks(sharedTools) // Shared tools - cached
                    .maxTokens(500)
                    .build()
            )
        );

        return response.getResult().getOutput().getText();
    }
}

// Tools cached once, each tenant gets customized system prompt
```

### Best Practices

1. **选择正确的策略**：
   - 对可重用的 system prompts 和指令使用 `SYSTEM_ONLY`（适用于所有模型）
   - 当您有大型稳定工具但动态 system prompts 时使用 `TOOLS_ONLY`（仅限 Claude）
   - 当 system 和 tools 都很大且稳定时使用 `SYSTEM_AND_TOOLS`（仅限 Claude）
   - 在 ChatClient memory 中使用 `CONVERSATION_HISTORY` 进行多轮对话
   - 使用 `NONE` 显式禁用缓存

2. **满足 Token 要求**：专注于缓存满足最小 token 要求的内容（大多数模型为 1024+ tokens）。

3. **重用相同内容**：缓存最适合与 prompt 内容的完全匹配。
即使很小的更改也需要新的缓存条目。

4. **监控 Token 使用**：使用 metadata 指标跟踪缓存有效性：

   ```java
   Integer cacheWrite = (Integer) response.getMetadata().getMetadata().get("cacheWriteInputTokens");
   Integer cacheRead = (Integer) response.getMetadata().getMetadata().get("cacheReadInputTokens");
   if (cacheRead != null && cacheRead > 0) {
       System.out.println("Cache hit: " + cacheRead + " tokens saved");
   }
   ```

5. **战略性缓存放置**：实现根据您选择的策略自动在最佳位置放置缓存断点，确保遵守 AWS Bedrock 的 4 个断点限制。

6. **缓存生命周期**：AWS Bedrock 缓存具有固定的 5 分钟 TTL（生存时间）。
每次缓存访问都会重置计时器。

7. **模型兼容性**：注意模型特定的限制：
   - **Claude 模型**：支持所有缓存策略
   - **Amazon Nova 模型**：仅支持 `SYSTEM_ONLY` 和 `CONVERSATION_HISTORY`（不支持 tool 缓存）

8. **Tool 稳定性**：使用 `TOOLS_ONLY`、`SYSTEM_AND_TOOLS` 或 `CONVERSATION_HISTORY` 策略时，确保 tools 保持稳定。
更改 tool 定义将使所有下游缓存断点失效，因为级联失效。

### Cache Invalidation and Cascade Behavior

AWS Bedrock 遵循具有级联失效的分层缓存模型：

**缓存层次结构**：`Tools → System → Messages`

每个级别的更改都会使该级别及所有后续级别失效：

| What Changes | Tools Cache | System Cache | Messages Cache |
|--------------|-------------|--------------|----------------|
| Tools | ❌ Invalid | ❌ Invalid | ❌ Invalid |
| System | ✅ Valid | ❌ Invalid | ❌ Invalid |
| Messages | ✅ Valid | ✅ Valid | ❌ Invalid |

**使用 `SYSTEM_AND_TOOLS` 策略的示例**：

```java
// Request 1: Cache both tools and system
ChatResponse r1 = chatModel.call(
    new Prompt(
        List.of(new SystemMessage("System prompt"), new UserMessage("Question")),
        BedrockChatOptions.builder()
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_AND_TOOLS)
                .build())
            .toolCallbacks(tools)
            .build()
    )
);
// Result: Both caches created

// Request 2: Change only system prompt (tools same)
ChatResponse r2 = chatModel.call(
    new Prompt(
        List.of(new SystemMessage("DIFFERENT system prompt"), new UserMessage("Question")),
        BedrockChatOptions.builder()
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_AND_TOOLS)
                .build())
            .toolCallbacks(tools) // SAME tools
            .build()
    )
);
// Result: Tools cache HIT (reused), system cache MISS (recreated)

// Request 3: Change tools (system same as Request 2)
ChatResponse r3 = chatModel.call(
    new Prompt(
        List.of(new SystemMessage("DIFFERENT system prompt"), new UserMessage("Question")),
        BedrockChatOptions.builder()
            .cacheOptions(BedrockCacheOptions.builder()
                .strategy(BedrockCacheStrategy.SYSTEM_AND_TOOLS)
                .build())
            .toolCallbacks(newTools) // DIFFERENT tools
            .build()
    )
);
// Result: BOTH caches MISS (tools change invalidates everything downstream)
```

### Implementation Details

Spring AI 中的 prompt caching 实现遵循以下关键设计原则：

1. **战略性缓存放置**：根据所选策略自动在最佳位置放置缓存断点，确保遵守 AWS Bedrock 的 4 个断点限制。

2. **提供商可移植性**：通过 `BedrockChatOptions` 而不是单个消息完成缓存配置，在切换不同 AI 提供商时保持兼容性。

3. **线程安全**：缓存断点跟踪使用线程安全机制实现，以正确处理并发请求。

4. **UNION 类型模式**：AWS SDK 使用 UNION 类型，其中缓存点作为单独的块添加，而不是属性。
这与直接 API 方法不同，但确保了类型安全和 API 合规性。

5. **增量缓存**：`CONVERSATION_HISTORY` 策略在最后一条用户消息上放置缓存断点，启用增量缓存，其中每个对话轮次都基于先前的缓存前缀构建。

### Cost Considerations

AWS Bedrock 的 prompt caching 定价（近似值，因模型而异）：

* **缓存写入**：比基础输入 tokens 贵约 25%
* **缓存读取**：便宜约 90%（仅为基础输入 token 价格的 10%）
* **盈亏平衡点**：仅 1 次缓存读取后，您就节省了资金

**成本计算示例**：

```java
// System prompt: 2000 tokens
// User question: 50 tokens

// Without caching (5 requests):
// Cost: 5 × (2000 + 50) = 10,250 tokens at base rate

// With caching (5 requests):
// Request 1: 2000 tokens × 1.25 (cache write) + 50 = 2,550 tokens
// Requests 2-5: 4 × (2000 × 0.10 (cache read) + 50) = 4 × 250 = 1,000 tokens
// Total: 2,550 + 1,000 = 3,550 tokens equivalent

// Savings: (10,250 - 3,550) / 10,250 = 65% cost reduction
```

## Tool Calling

Bedrock Converse API 支持 tool calling 功能，允许模型在对话过程中使用工具。
以下是如何定义和使用基于 @Tool 的工具的示例：

```java

public class WeatherService {

    @Tool(description = "Get the weather in location")
    public String weatherByLocation(@ToolParam(description= "City or state name") String location) {
        ...
    }
}

String response = ChatClient.create(this.chatModel)
        .prompt("What's the weather like in Boston?")
        .tools(new WeatherService())
        .call()
        .content();
```

您也可以使用 java.util.function beans 作为工具：

```java
@Bean
@Description("Get the weather in location. Return temperature in 36°F or 36°C format.")
public Function<Request, Response> weatherFunction() {
    return new MockWeatherService();
}

String response = ChatClient.create(this.chatModel)
        .prompt("What's the weather like in Boston?")
        .toolNames("weatherFunction")
        .inputType(Request.class)
        .call()
        .content();
```

在 [Tools](../../toolcalls/tool-calls) 文档中查找更多信息。

## Multimodal

Multimodality 是指模型同时理解和处理来自各种来源的信息的能力，包括文本、图像、视频、pdf、doc、html、md 和更多数据格式。

Bedrock Converse API 支持 multimodal 输入，包括文本和图像输入，并可以根据组合输入生成文本响应。

您需要一个支持 multimodal 输入的模型，例如 Anthropic Claude 或 Amazon Nova 模型。

### Images

对于支持 vision multimodality 的 [models](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html)，例如 Amazon Nova、Anthropic Claude、Llama 3.2，Bedrock Converse API Amazon 允许您在 payload 中包含多个图像。这些模型可以分析传递的图像并回答问题、对图像进行分类，以及根据提供的指令总结图像。

目前，Bedrock Converse 支持 `image/jpeg`、`image/png`、`image/gif` 和 `image/webp` mime 类型的 `base64` 编码图像。

Spring AI 的 `Message` 接口通过引入 `Media` 类型来支持 multimodal AI 模型。
它包含消息中媒体附件的数据和信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `java.lang.Object` 来存储原始媒体数据。

以下是一个简单的代码示例，演示了用户文本与图像的组合。

```java
String response = ChatClient.create(chatModel)
    .prompt()
    .user(u -> u.text("Explain what do you see on this picture?")
        .media(Media.Format.IMAGE_PNG, new ClassPathResource("/test.png")))
    .call()
    .content();

logger.info(response);
```

它将 `test.png` 图像作为输入：

![multimodal.test.png](/img/integration/multimodal.test.png)

以及文本消息 "Explain what do you see on this picture?"，并生成如下响应：

```
The image shows a close-up view of a wire fruit basket containing several pieces of fruit.
...
```

### Video

[Amazon Nova models](https://docs.aws.amazon.com/nova/latest/userguide/modalities-video.html) 允许您在 payload 中包含单个视频，可以通过 base64 格式或通过 Amazon S3 URI 提供。

目前，Bedrock Nova 支持 `video/x-matroska`、`video/quicktime`、`video/mp4`、`video/webm`、`video/x-flv`、`video/mpeg`、`video/x-ms-wmv` 和 `video/3gpp` mime 类型的视频。

Spring AI 的 `Message` 接口通过引入 `Media` 类型来支持 multimodal AI 模型。
它包含消息中媒体附件的数据和信息，使用 Spring 的 `org.springframework.util.MimeType` 和 `java.lang.Object` 来存储原始媒体数据。

以下是一个简单的代码示例，演示了用户文本与视频的组合。

```java
String response = ChatClient.create(chatModel)
    .prompt()
    .user(u -> u.text("Explain what do you see in this video?")
        .media(Media.Format.VIDEO_MP4, new ClassPathResource("/test.video.mp4")))
    .call()
    .content();

logger.info(response);
```

它将 `test.video.mp4` 图像作为输入：

![test.video.jpeg](/img/integration/test.video.jpeg)

以及文本消息 "Explain what do you see in this video?"，并生成如下响应：

```
The video shows a group of baby chickens, also known as chicks, huddled together on a surface
...
```

### Documents

对于某些模型，Bedrock 允许您通过 Converse API 文档支持在 payload 中包含文档，可以通过 bytes 提供。
文档支持有两种不同的变体，如下所述：

- **文本文档类型**（txt、csv、html、md 等），重点是文本理解。这些用例包括基于文档的文本元素回答问题。
- **媒体文档类型**（pdf、docx、xlsx），重点是基于视觉的理解来回答问题。这些用例包括基于图表、图形等回答问题。

目前，Anthropic [PDF support (beta)](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support) 和 Amazon Bedrock Nova 模型支持文档 multimodality。

以下是一个简单的代码示例，演示了用户文本与媒体文档的组合。

```java
String response = ChatClient.create(chatModel)
    .prompt()
    .user(u -> u.text(
            "You are a very professional document summarization specialist. Please summarize the given document.")
        .media(Media.Format.DOC_PDF, new ClassPathResource("/spring-ai-reference-overview.pdf")))
    .call()
    .content();

logger.info(response);
```

它将 `spring-ai-reference-overview.pdf` 文档作为输入：

![test.pdf.png](/img/integration/test.pdf.png)

以及文本消息 "You are a very professional document summarization specialist. Please summarize the given document."，并生成如下响应：

```
**Introduction:**
- Spring AI is designed to simplify the development of applications with artificial intelligence (AI) capabilities, aiming to avoid unnecessary complexity.
...
```

## Sample Controller

创建一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-bedrock-converse` 添加到您的依赖项中。

在 `src/main/resources` 下添加一个 `application.properties` 文件：

```properties
spring.ai.bedrock.aws.region=eu-central-1
spring.ai.bedrock.aws.timeout=10m
spring.ai.bedrock.aws.access-key=${AWS_ACCESS_KEY_ID}
spring.ai.bedrock.aws.secret-key=${AWS_SECRET_ACCESS_KEY}
# session token is only required for temporary credentials
spring.ai.bedrock.aws.session-token=${AWS_SESSION_TOKEN}

spring.ai.bedrock.converse.chat.options.temperature=0.8
spring.ai.bedrock.converse.chat.options.top-k=15
```

以下是一个使用 chat model 的控制器示例：

```java
@RestController
public class ChatController {

    private final ChatClient chatClient;

    @Autowired
    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", this.chatClient.prompt(message).call().content());
    }

    @GetMapping("/ai/generateStream")
    public Flux<ChatResponse> generateStream(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return this.chatClient.prompt(message).stream().content();
    }
}
```

