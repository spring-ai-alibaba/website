# Cohere Embeddings

提供 Bedrock Cohere Embedding 模型。
将生成式 AI 功能集成到基本应用程序和工作流中，以改善业务成果。

https://aws.amazon.com/bedrock/cohere-command-embed/[AWS Bedrock Cohere Model Page] 和 https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html[Amazon Bedrock User Guide] 包含有关如何使用 AWS 托管模型的详细信息。

## 先决条件

请参阅 [Spring AI documentation on Amazon Bedrock](https://docs.spring.io/spring-ai/reference/api/chat/bedrock-chat.html) 以设置 API 访问。

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

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### 启用 Cohere Embedding 支持

默认情况下，Cohere embedding 模型是禁用的。
要启用它，请在应用程序配置中将 `spring.ai.model.embedding` 属性设置为 `bedrock-cohere`：

```properties
spring.ai.model.embedding=bedrock-cohere
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
export AI_MODEL_EMBEDDING=bedrock-cohere
```

您还可以在启动应用程序时使用 Java 系统属性设置此属性：

```shell
java -Dspring.ai.model.embedding=bedrock-cohere -jar your-application.jar
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

要启用，spring.ai.model.embedding=bedrock-cohere（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 bedrock-cohere 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.bedrock.cohere.embedding`（在 `BedrockCohereEmbeddingProperties` 中定义）是配置 Cohere 的 embedding 模型实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.embedding | 启用或禁用 Cohere 支持 | bedrock-cohere |
| spring.ai.bedrock.cohere.embedding.enabled (已移除且不再有效) | 启用或禁用 Cohere 支持 | false |
| spring.ai.bedrock.cohere.embedding.model | 要使用的模型 ID。请参阅 https://github.com/spring-projects/spring-ai/blob/056b95a00efa5b014a1f488329fbd07a46c02378/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/api/CohereEmbeddingBedrockApi.java#L150[CohereEmbeddingModel] 以了解支持的模型。 | cohere.embed-multilingual-v3 |
| spring.ai.bedrock.cohere.embedding.options.input-type | 添加特殊 token 以区分每种类型。您不应混合不同的类型，除非在搜索和检索时混合类型。在这种情况下，使用 search_document 类型嵌入您的语料库，使用 search_query 类型嵌入查询。 | SEARCH_DOCUMENT |
| spring.ai.bedrock.cohere.embedding.options.truncate | 指定 API 如何处理超过最大 token 长度的输入。如果指定 LEFT 或 RIGHT，模型将丢弃输入，直到剩余输入恰好是模型的最大输入 token 长度。 | NONE |

注意：通过 Amazon Bedrock 访问 Cohere 时，截断功能不可用。这是 Amazon Bedrock 的问题。Spring AI 类 `BedrockCohereEmbeddingModel` 将截断到 2048 个字符长度，这是模型支持的最大值。

请查看 https://github.com/spring-projects/spring-ai/blob/056b95a00efa5b014a1f488329fbd07a46c02378/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/api/CohereEmbeddingBedrockApi.java#L150[CohereEmbeddingModel] 以了解其他模型 ID。
支持的值为：`cohere.embed-multilingual-v3` 和 `cohere.embed-english-v3`。
模型 ID 值也可以在 https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html[AWS Bedrock documentation for base model IDs] 中找到。

提示：所有前缀为 `spring.ai.bedrock.cohere.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/BedrockCohereEmbeddingOptions.java[BedrockCohereEmbeddingOptions.java] 提供模型配置，例如 `input-type` 或 `truncate`。

在启动时，可以使用 `BedrockCohereEmbeddingModel(api, options)` 构造函数或 `spring.ai.bedrock.cohere.embedding.options.*` 属性配置默认选项。

在运行时，您可以通过向 `EmbeddingRequest` 调用添加新的、特定于请求的选项来覆盖默认选项。
例如，为特定请求覆盖默认输入类型：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        BedrockCohereEmbeddingOptions.builder()
        .inputType(InputType.SEARCH_DOCUMENT)
        .build()));
```

## 示例 Controller

https://start.spring.io/[创建] 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-bedrock` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加 `application.properties` 文件，以启用和配置 Cohere Embedding 模型：

```properties
spring.ai.bedrock.aws.region=eu-central-1
spring.ai.bedrock.aws.access-key=${AWS_ACCESS_KEY_ID}
spring.ai.bedrock.aws.secret-key=${AWS_SECRET_ACCESS_KEY}

spring.ai.model.embedding=bedrock-cohere
spring.ai.bedrock.cohere.embedding.options.input-type=search-document
```

提示：将 `regions`、`access-key` 和 `secret-key` 替换为您的 AWS 凭据。

这将创建一个 `BedrockCohereEmbeddingModel` 实现，您可以将其注入到您的类中。
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

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/BedrockCohereEmbeddingModel.java[BedrockCohereEmbeddingModel] 实现 `EmbeddingModel` 并使用 [low-level-api](#low-level-api) 连接到 Bedrock Cohere 服务。

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

提示：请参阅 [Dependency Management](https://docs.spring.io/spring-ai/reference/getting-started.html#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/BedrockCohereEmbeddingModel.java[BedrockCohereEmbeddingModel] 并将其用于文本 embeddings：

```java
var cohereEmbeddingApi =new CohereEmbeddingBedrockApi(
		CohereEmbeddingModel.COHERE_EMBED_MULTILINGUAL_V1.id(),
		EnvironmentVariableCredentialsProvider.create(), Region.US_EAST_1.id(), new ObjectMapper());


var embeddingModel = new BedrockCohereEmbeddingModel(this.cohereEmbeddingApi);

EmbeddingResponse embeddingResponse = this.embeddingModel
	.embedForResponse(List.of("Hello World", "World is big and salvation is near"));
```

## 低级 CohereEmbeddingBedrockApi 客户端

https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-bedrock/src/main/java/org/springframework/ai/bedrock/cohere/api/CohereEmbeddingBedrockApi.java[CohereEmbeddingBedrockApi] 是在 AWS Bedrock https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-command.html[Cohere Command models] 之上的轻量级 Java 客户端。

以下类图说明了 CohereEmbeddingBedrockApi 接口和构建块：

![bedrock-cohere-embedding-low-level-api](/img/integration/bedrock/bedrock-cohere-embedding-low-level-api.jpg)

CohereEmbeddingBedrockApi 支持 `cohere.embed-english-v3` 和 `cohere.embed-multilingual-v3` 模型，用于单个和批量 embedding 计算。

以下是一个简单的代码片段，展示如何以编程方式使用该 API：

```java
CohereEmbeddingBedrockApi api = new CohereEmbeddingBedrockApi(
		CohereEmbeddingModel.COHERE_EMBED_MULTILINGUAL_V1.id(),
		EnvironmentVariableCredentialsProvider.create(),
		Region.US_EAST_1.id(), new ObjectMapper());

CohereEmbeddingRequest request = new CohereEmbeddingRequest(
		List.of("I like to eat apples", "I like to eat oranges"),
		CohereEmbeddingRequest.InputType.search_document,
		CohereEmbeddingRequest.Truncate.NONE);

CohereEmbeddingResponse response = this.api.embedding(this.request);
```
