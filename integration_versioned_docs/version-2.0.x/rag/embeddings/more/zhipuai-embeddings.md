# ZhiPuAI Embeddings

Spring AI 支持 ZhiPuAI 的文本 embeddings 模型。
ZhiPuAI 的文本 embeddings 测量文本字符串的相关性。
embedding 是浮点数（列表）的向量。两个向量之间的距离衡量它们的相关性。小距离表示高相关性，大距离表示低相关性。

## 先决条件

您需要创建一个 API 来访问 ZhiPu AI 语言模型。

在 https://open.bigmodel.cn/login[ZhiPu AI 注册页面] 创建账户，并在 https://open.bigmodel.cn/usercenter/apikeys[API Keys 页面] 生成 token。

Spring AI 项目定义了一个名为 `spring.ai.zhipuai.api-key` 的配置属性，您应该将其设置为从 API Keys 页面获取的 `API Key` 的值。

您可以在 `application.properties` 文件中设置此配置属性：

```properties
spring.ai.zhipuai.api-key=<your-zhipuai-api-key>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    zhipuai:
      api-key: ${ZHIPUAI_API_KEY}
```

```bash
# In your environment or .env file
export ZHIPUAI_API_KEY=<your-zhipuai-api-key>
```

您还可以在应用程序代码中以编程方式设置此配置：

```java
// Retrieve API key from a secure source or environment variable
String apiKey = System.getenv("ZHIPUAI_API_KEY");
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

Spring AI 为 Azure ZhiPuAI Embedding Model 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-zhipuai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-zhipuai'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

#### Retry 属性

前缀 `spring.ai.retry` 用作允许您配置 ZhiPuAI Embedding 模型的重试机制的属性前缀。

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

前缀 `spring.ai.zhipuai` 用作允许您连接到 ZhiPuAI 的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.base-url | 要连接到的 URL | https://open.bigmodel.cn/api/paas |
| spring.ai.zhipuai.api-key | API Key | - |

#### 配置属性

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=zhipuai（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 zhipuai 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.zhipuai.embedding` 是配置 ZhiPuAI 的 `EmbeddingModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.zhipuai.embedding.enabled (已移除且不再有效) | 启用 ZhiPuAI embedding 模型。 | true |
| spring.ai.model.embedding | 启用 ZhiPuAI embedding 模型。 | zhipuai |
| spring.ai.zhipuai.embedding.base-url | 可选覆盖 spring.ai.zhipuai.base-url 以提供 embedding 特定的 url | - |
| spring.ai.zhipuai.embedding.api-key | 可选覆盖 spring.ai.zhipuai.api-key 以提供 embedding 特定的 api-key | - |
| spring.ai.zhipuai.embedding.options.model | 要使用的模型 | embedding-2 |
| spring.ai.zhipuai.embedding.options.dimensions | 维度数，当模型为 embedding-3 时默认值为 2048 | - |

注意：您可以为 `ChatModel` 和 `EmbeddingModel` 实现覆盖通用的 `spring.ai.zhipuai.base-url` 和 `spring.ai.zhipuai.api-key`。
如果设置了 `spring.ai.zhipuai.embedding.base-url` 和 `spring.ai.zhipuai.embedding.api-key` 属性，它们优先于通用属性。
同样，如果设置了 `spring.ai.zhipuai.chat.base-url` 和 `spring.ai.zhipuai.chat.api-key` 属性，它们优先于通用属性。
如果您想为不同的模型和不同的模型端点使用不同的 ZhiPuAI 账户，这很有用。

提示：所有前缀为 `spring.ai.zhipuai.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-zhipuai/src/main/java/org/springframework/ai/zhipuai/ZhiPuAiEmbeddingOptions.java[ZhiPuAiEmbeddingOptions.java] 提供 ZhiPuAI 配置，例如要使用的模型等。

也可以使用 `spring.ai.zhipuai.embedding.options` 属性配置默认选项。

在启动时使用 `ZhiPuAiEmbeddingModel` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以使用 `ZhiPuAiEmbeddingOptions` 实例作为 `EmbeddingRequest` 的一部分来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        ZhiPuAiEmbeddingOptions.builder()
            .model("Different-Embedding-Model-Deployment-Name")
        .build()));
```

## 示例 Controller

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.zhipuai.api-key=YOUR_API_KEY
spring.ai.zhipuai.embedding.options.model=embedding-2
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

如果您不使用 Spring Boot，可以手动配置 ZhiPuAI Embedding Model。
为此，请将 `spring-ai-zhipuai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-zhipuai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-zhipuai'
}
```

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

注意：`spring-ai-zhipuai` 依赖项还提供对 `ZhiPuAiChatModel` 的访问。
有关 `ZhiPuAiChatModel` 的更多信息，请参阅 [ZhiPuAI Chat Client](../../../chatmodels/more/zhipuai-chat) 部分。

接下来，创建一个 `ZhiPuAiEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
var zhiPuAiApi = new ZhiPuAiApi(System.getenv("ZHIPUAI_API_KEY"));

var embeddingModel = new ZhiPuAiEmbeddingModel(api, MetadataMode.EMBED,
				ZhiPuAiEmbeddingOptions.builder()
						.model("embedding-3")
						.dimensions(1536)
						.build());

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

`ZhiPuAiEmbeddingOptions` 提供 embedding 请求的配置信息。
options 类提供了一个 `builder()` 以便轻松创建选项。
