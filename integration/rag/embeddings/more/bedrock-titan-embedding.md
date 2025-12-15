# Titan Embeddings

提供 Bedrock Titan Embedding 模型。
link:https://aws.amazon.com/bedrock/titan/[Amazon Titan] 基础模型 (FMs) 通过完全托管的 API 为客户提供广泛的高性能图像、多模态 embeddings 和文本模型选择。
Amazon Titan 模型由 AWS 创建，并在大型数据集上进行预训练，使其成为强大的通用模型，旨在支持各种用例，同时支持负责任的 AI 使用。
按原样使用它们，或使用您自己的数据进行私有定制。

注意：Bedrock Titan Embedding 支持文本和图像 embedding。

注意：Bedrock Titan Embedding 不支持批量 embedding。

https://aws.amazon.com/bedrock/titan/[AWS Bedrock Titan Model Page] 和 https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html[Amazon Bedrock User Guide] 包含有关如何使用 AWS 托管模型的详细信息。

## 先决条件

请参阅 [Spring AI documentation on Amazon Bedrock](bedrock.adoc) 以设置 API 访问。

### 添加仓库和 BOM

Spring AI 工件发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started.adoc#artifact-repositories) 部分，将这些仓库添加到您的构建系统。

为了帮助依赖管理，Spring AI 提供了一个 BOM（物料清单），以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统。

## 自动配置

[注意]
====
Spring AI 自动配置、starter 模块的工件名称发生了重大变化。
请参阅 https://docs.spring.io/spring-ai/reference/upgrade-notes.html[升级说明] 了解更多信息。
====

将 `spring-ai-starter-model-bedrock` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-starter-model-bedrock</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-bedrock'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### 启用 Titan Embedding 支持

默认情况下，Titan embedding 模型是禁用的。
要启用它，请在应用程序配置中将 `spring.ai.model.embedding` 属性设置为 `bedrock-titan`：

```properties
spring.ai.model.embedding=bedrock-titan
```

或者，您可以使用 Spring Expression Language (SpEL) 引用环境变量：

```yaml
# In application.yml
spring:
  ai:
    model:
      embedding: ${AI_MODEL_EMBEDDING}
```

```bash
# In your environment or .env file
export AI_MODEL_EMBEDDING=bedrock-titan
```

您还可以在启动应用程序时使用 Java 系统属性设置此属性：

```shell
java -Dspring.ai.model.embedding=bedrock-titan -jar your-application.jar
```

### Embedding 属性

前缀 `spring.ai.bedrock.aws` 是配置与 AWS Bedrock 连接的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.bedrock.aws.region | 要使用的 AWS 区域。 | us-east-1 |
| spring.ai.bedrock.aws.access-key | AWS 访问密钥。 | - |
| spring.ai.bedrock.aws.secret-key | AWS 密钥。 | - |
| spring.ai.bedrock.aws.profile.name | AWS profile 名称。 | - |
| spring.ai.bedrock.aws.profile.credentials-path | AWS 凭据文件路径。 | - |
| spring.ai.bedrock.aws.profile.configuration-path | AWS 配置文件路径。 | - |

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=bedrock-titan（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 bedrock-titan 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.bedrock.titan.embedding`（在 `BedrockTitanEmbeddingProperties` 中定义）是配置 Titan 的 embedding 模型实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.bedrock.titan.embedding.enabled (已移除且不再有效) | 启用或禁用 Titan embedding | false |
| spring.ai.model.embedding | 启用或禁用 Titan embedding | bedrock-titan |
| spring.ai.bedrock.titan.embedding.model | 要使用的模型 ID。请参阅 `TitanEmbeddingModel` 以了解支持的模型。 | amazon.titan-embed-image-v1 |

支持的值为：`amazon.titan-embed-image-v1`、`amazon.titan-embed-text-v1` 和 `amazon.titan-embed-text-v2:0`。
模型 ID 值也可以在 https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html[AWS Bedrock documentation for base model IDs] 中找到。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/titan/BedrockTitanEmbeddingOptions.java[BedrockTitanEmbeddingOptions.java] 提供模型配置，例如 `input-type`。
在启动时，可以使用 `BedrockTitanEmbeddingOptions.builder().inputType(type).build()` 方法或 `spring.ai.bedrock.titan.embedding.input-type` 属性配置默认选项。

在运行时，您可以通过向 `EmbeddingRequest` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，为特定请求覆盖默认温度：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        BedrockTitanEmbeddingOptions.builder()
        .inputType(InputType.TEXT)
        .build()));
```

## 示例 Controller

https://start.spring.io/[创建] 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-bedrock` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加 `application.properties` 文件，以启用和配置 Titan Embedding 模型：

```properties
spring.ai.bedrock.aws.region=eu-central-1
spring.ai.bedrock.aws.access-key=${AWS_ACCESS_KEY_ID}
spring.ai.bedrock.aws.secret-key=${AWS_SECRET_ACCESS_KEY}

spring.ai.model.embedding=bedrock-titan
```

提示：将 `regions`、`access-key` 和 `secret-key` 替换为您的 AWS 凭据。

这将创建一个 `EmbeddingController` 实现，您可以将其注入到您的类中。
以下是一个使用 chat 模型进行文本生成的简单 `@Controller` 类示例。

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

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/titan/BedrockTitanEmbeddingModel.java[BedrockTitanEmbeddingModel] 实现 `EmbeddingModel` 并使用 [low-level-api](#low-level-api) 连接到 Bedrock Titan 服务。

将 `spring-ai-bedrock` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-bedrock</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-bedrock'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/titan/BedrockTitanEmbeddingModel.java[BedrockTitanEmbeddingModel] 并将其用于文本 embeddings：

```java
var titanEmbeddingApi = new TitanEmbeddingBedrockApi(
	TitanEmbeddingModel.TITAN_EMBED_IMAGE_V1.id(), Region.US_EAST_1.id());

var embeddingModel = new BedrockTitanEmbeddingModel(this.titanEmbeddingApi);

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World")); // 注意 titan 不支持批量 embedding。
```

## 低级 TitanEmbeddingBedrockApi 客户端

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/titan/api/TitanEmbeddingBedrockApi.java[TitanEmbeddingBedrockApi] 是在 AWS Bedrock https://docs.aws.amazon.com/bedrock/latest/userguide/titan-multiemb-models.html[Titan Embedding models] 之上的轻量级 Java 客户端。

以下类图说明了 TitanEmbeddingBedrockApi 接口和构建块：

![bedrock-titan-embedding-low-level-api](/img/integration/bedrock/bedrock-titan-embedding-low-level-api.jpg)

TitanEmbeddingBedrockApi 支持 `amazon.titan-embed-image-v1` 和 `amazon.titan-embed-image-v1` 模型，用于单个和批量 embedding 计算。

以下是一个简单的代码片段，展示如何以编程方式使用该 API：

```java
TitanEmbeddingBedrockApi titanEmbedApi = new TitanEmbeddingBedrockApi(
		TitanEmbeddingModel.TITAN_EMBED_TEXT_V1.id(), Region.US_EAST_1.id());

TitanEmbeddingRequest request = TitanEmbeddingRequest.builder()
	.withInputText("I like to eat apples.")
	.build();

TitanEmbeddingResponse response = this.titanEmbedApi.embedding(this.request);
```

要嵌入图像，您需要将其转换为 `base64` 格式：

```java
TitanEmbeddingBedrockApi titanEmbedApi = new TitanEmbeddingBedrockApi(
		TitanEmbeddingModel.TITAN_EMBED_IMAGE_V1.id(), Region.US_EAST_1.id());

byte[] image = new DefaultResourceLoader()
	.getResource("classpath:/spring_framework.png")
	.getContentAsByteArray();


TitanEmbeddingRequest request = TitanEmbeddingRequest.builder()
	.withInputImage(Base64.getEncoder().encodeToString(this.image))
	.build();

TitanEmbeddingResponse response = this.titanEmbedApi.embedding(this.request);
```
