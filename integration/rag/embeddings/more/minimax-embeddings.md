# MiniMax Embeddings

Spring AI 支持来自 MiniMax 的各种 AI 语言模型。您可以与 MiniMax 语言模型交互，并基于 MiniMax 模型创建多语言对话助手。

## 先决条件

您需要创建一个 API 来访问 MiniMax 语言模型。

在 https://www.minimaxi.com/login[MiniMax 注册页面] 创建账户，并在 https://www.minimaxi.com/user-center/basic-information/interface-key[API Keys 页面] 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.minimax.api-key` 的配置属性，您应该将其设置为从 API Keys 页面获取的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.minimax.api-key=<your-minimax-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    minimax:
      api-key: ${MINIMAX_API_KEY}
```

```bash
# In your environment or .env file
export MINIMAX_API_KEY=<your-minimax-api-key>
```

您还可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("MINIMAX_API_KEY");
```

### 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](https://docs.spring.io/spring-ai/reference/getting-started.html#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

Spring AI 为 Azure MiniMax Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-minimax</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-minimax'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

#### Retry 属性

前缀 `spring.ai.retry` 用作允许您配置 MiniMax Embedding 模型的重试机制的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.retry.max-attempts | 最大重试次数。 | 10 |
| spring.ai.retry.backoff.initial-interval | 指数退避策略的初始睡眠持续时间。 | 2 sec. |
| spring.ai.retry.backoff.multiplier | 退避间隔乘数。 | 5 |
| spring.ai.retry.backoff.max-interval | 最大退避持续时间。 | 3 min. |
| spring.ai.retry.on-client-errors | 如果为 false，抛出 NonTransientAiException，并且不对 `4xx` 客户端错误代码尝试重试 | false |
| spring.ai.retry.exclude-on-http-codes | 不应触发重试的 HTTP 状态代码列表（例如，抛出 NonTransientAiException）。 | empty |
| spring.ai.retry.on-http-codes | 应触发重试的 HTTP 状态代码列表（例如，抛出 TransientAiException）。 | empty |

#### 连接属性

前缀 `spring.ai.minimax` 用作允许您连接到 MiniMax 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.minimax.base-url | 要连接到的 URL | https://api.minimax.chat |
| spring.ai.minimax.api-key | API Key | - |

#### 配置属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=minimax（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 minimax 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.minimax.embedding` 是配置 MiniMax 的 `EmbeddingModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.minimax.embedding.enabled (已移除且不再有效) | 启用 MiniMax embedding 模型。 | true |
| spring.ai.model.embedding | 启用 MiniMax embedding 模型。 | minimax |
| spring.ai.minimax.embedding.base-url | 可选覆盖 spring.ai.minimax.base-url 以提供 embedding 特定的 url | - |
| spring.ai.minimax.embedding.api-key | 可选覆盖 spring.ai.minimax.api-key 以提供 embedding 特定的 api-key | - |
| spring.ai.minimax.embedding.options.model | 要使用的模型 | embo-01 |

注意：您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.minimax.base-url` 和 `spring.ai.minimax.api-key`。
如果设置了 `spring.ai.minimax.embedding.base-url` 和 `spring.ai.minimax.embedding.api-key` 属性，它们优先于通用属性。
同样，如果设置了 `spring.ai.minimax.chat.base-url` 和 `spring.ai.minimax.chat.api-key` 属性，它们优先于通用属性。
如果您想为不同的模型和不同的模型端点使用不同的 MiniMax 账户，这很有用。

提示：所有前缀为 `spring.ai.minimax.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-minimax/src/main/java/org/springframework/ai/minimax/MiniMaxEmbeddingOptions.java[MiniMaxEmbeddingOptions.java] 提供 MiniMax 配置，例如要使用的模型等。

也可以使用 `spring.ai.minimax.embedding.options` 属性配置默认选项。

在启动时使用 `MiniMaxEmbeddingModel` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `MiniMaxEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        MiniMaxEmbeddingOptions.builder()
            .model("Different-Embedding-Model-Deployment-Name")
        .build()));
```

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.minimax.api-key=YOUR_API_KEY
spring.ai.minimax.embedding.options.model=embo-01
```

```java
@RestController
public class EmbeddingController {

    private final EmbeddingModel embeddingModel;

    @Autowired
    public EmbeddingController(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @GetMapping("/ai/embedding")
    public Map embed(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        EmbeddingResponse embeddingResponse = this.embeddingModel.embedForResponse(List.of(message));
        return Map.of("embedding", embeddingResponse);
    }
}
```

## 手动配置

如果您不使用 Spring Boot，可以手动配置 MiniMax Embedding Model。
为此，请将 `spring-ai-minimax` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-minimax</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-minimax'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

注意：`spring-ai-minimax` 依赖项还提供对 `MiniMaxChatModel` 的访问。
有关 `MiniMaxChatModel` 的更多信息，请参阅 [MiniMax Chat Client](../chat/minimax-chat.html) 部分。

接下来，创建一个 `MiniMaxEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var miniMaxApi = new MiniMaxApi(System.getenv("MINIMAX_API_KEY"));

var embeddingModel = new MiniMaxEmbeddingModel(minimaxApi, MetadataMode.EMBED,
MiniMaxEmbeddingOptions.builder().model("embo-01").build());

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

`MiniMaxEmbeddingOptions` 提供 embedding 请求的配置信息。
options 类提供了一个 `builder()` 以便轻松创建选项。
