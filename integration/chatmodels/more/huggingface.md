# Hugging Face Chat

Hugging Face Text Generation Inference (TGI) 是一个专门用于在云端部署 Large Language Models (LLMs) 的解决方案，通过 API 使它们可访问。TGI 通过 continuous batching、token streaming 和高效内存管理等特性，为文本生成任务提供优化的性能。

> **重要：** Text Generation Inference 要求模型与其架构特定的优化兼容。虽然支持许多流行的 LLMs，但并非 Hugging Face Hub 上的所有模型都可以使用 TGI 部署。如果您需要部署其他类型的模型，请考虑使用标准的 Hugging Face Inference Endpoints。

> **提示：** 有关支持的模型和架构的完整和最新列表，请参阅 [Text Generation Inference supported models documentation](https://huggingface.co/docs/text-generation-inference/en/supported_models)。

## Prerequisites

您需要在 Hugging Face 上创建一个 Inference Endpoint 并创建一个 API token 来访问该端点。
更多详细信息可以在[这里](https://huggingface.co/docs/inference-endpoints/index)找到。

Spring AI 项目定义了两个配置属性：

1. `spring.ai.huggingface.chat.api-key`: 将其设置为从 Hugging Face 获得的 API token 的值。
2. `spring.ai.huggingface.chat.url`: 将其设置为在 Hugging Face 中配置模型时获得的 inference endpoint URL。

您可以在 Inference Endpoint 的 UI [这里](https://ui.endpoints.huggingface.co/)找到您的 inference endpoint URL。

您可以在 `application.properties` 文件中设置这些配置属性：

```properties
spring.ai.huggingface.chat.api-key=<your-huggingface-api-key>
spring.ai.huggingface.chat.url=<your-inference-endpoint-url>
```

为了在处理敏感信息（如 API keys）时增强安全性，您可以使用 Spring Expression Language (SpEL) 来引用自定义环境变量：

```yaml
# In application.yml
spring:
  ai:
    huggingface:
      chat:
        api-key: ${HUGGINGFACE_API_KEY}
        url: ${HUGGINGFACE_ENDPOINT_URL}
```

```bash
# In your environment or .env file
export HUGGINGFACE_API_KEY=<your-huggingface-api-key>
export HUGGINGFACE_ENDPOINT_URL=<your-inference-endpoint-url>
```

您也可以在应用程序代码中以编程方式设置这些配置：

```java
// Retrieve API key and endpoint URL from secure sources or environment variables
String apiKey = System.getenv("HUGGINGFACE_API_KEY");
String endpointUrl = System.getenv("HUGGINGFACE_ENDPOINT_URL");
```

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 Hugging Face Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-huggingface</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-huggingface'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
>
> 要启用，spring.ai.model.chat=huggingface（默认启用）
>
> 要禁用，spring.ai.model.chat=none（或任何与 huggingface 不匹配的值）
>
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.huggingface` 是允许您为 Hugging Face 配置 chat model 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.huggingface.chat.api-key | API Key 用于与 Inference Endpoint 进行身份验证。 | - |
| spring.ai.huggingface.chat.url | 要连接到的 Inference Endpoint 的 URL | - |
| spring.ai.huggingface.chat.enabled (Removed and no longer valid) | 启用 Hugging Face chat model。 | true |
| spring.ai.model.chat | 启用 Hugging Face chat model。 | huggingface |

## Sample Controller (Auto-configuration)

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-huggingface` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 Hugging Face chat model：

```properties
spring.ai.huggingface.chat.api-key=YOUR_API_KEY
spring.ai.huggingface.chat.url=YOUR_INFERENCE_ENDPOINT_URL
```

> **提示：** 将 `api-key` 和 `url` 替换为您的 Hugging Face 值。

这将创建一个 `HuggingfaceChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final HuggingfaceChatModel chatModel;

    @Autowired
    public ChatController(HuggingfaceChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", this.chatModel.call(message));
    }
}
```

## Manual Configuration

[HuggingfaceChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-huggingface/src/main/java/org/springframework/ai/huggingface/HuggingfaceChatModel.java) 实现了 `ChatModel` 接口，并使用 【low-level-api】 连接到 Hugging Face inference endpoints。

将 `spring-ai-huggingface` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-huggingface</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-huggingface'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `HuggingfaceChatModel` 并将其用于文本生成：

```java
HuggingfaceChatModel chatModel = new HuggingfaceChatModel(apiKey, url);

ChatResponse response = this.chatModel.call(
    new Prompt("Generate the names of 5 famous pirates."));

System.out.println(response.getResult().getOutput().getText());
```

