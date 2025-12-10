# Oracle Cloud Infrastructure (OCI) GenAI Embeddings

https://www.oracle.com/artificial-intelligence/generative-ai/generative-ai-service/[OCI GenAI Service] 提供按需模型或专用 AI 集群的文本 embedding。

https://docs.oracle.com/en-us/iaas/Content/generative-ai/embed-models.htm[OCI Embedding Models Page] 和 https://docs.oracle.com/en-us/iaas/Content/generative-ai/use-playground-embed.htm[OCI Text Embeddings Page] 提供有关在 OCI 上使用和托管 embedding 模型的详细信息。

## 先决条件

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

Spring AI 为 OCI GenAI Embedding Client 提供 Spring Boot 自动配置。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-oci-genai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-oci-genai'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

### Embedding 属性

前缀 `spring.ai.oci.genai` 是配置与 OCI GenAI 连接的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.oci.genai.authenticationType | 在向 OCI 进行身份验证时使用的身份验证类型。可以是 `file`、`instance-principal`、`workload-identity` 或 `simple`。 | file |
| spring.ai.oci.genai.region | OCI 服务区域。 | us-chicago-1 |
| spring.ai.oci.genai.tenantId | OCI 租户 OCID，在使用 `simple` 身份验证时使用。 | - |
| spring.ai.oci.genai.userId | OCI 用户 OCID，在使用 `simple` 身份验证时使用。 | - |
| spring.ai.oci.genai.fingerprint | 私钥指纹，在使用 `simple` 身份验证时使用。 | - |
| spring.ai.oci.genai.privateKey | 私钥内容，在使用 `simple` 身份验证时使用。 | - |
| spring.ai.oci.genai.passPhrase | 可选的私钥密码，在使用 `simple` 身份验证和受密码保护的私钥时使用。 | - |
| spring.ai.oci.genai.file | OCI 配置文件的路径。在使用 `file` 身份验证时使用。 | <user's home directory>/.oci/config |
| spring.ai.oci.genai.profile | OCI profile 名称。在使用 `file` 身份验证时使用。 | DEFAULT |
| spring.ai.oci.genai.endpoint | 可选的 OCI GenAI 端点。 | - |

[注意]
====
现在通过前缀为 `spring.ai.model.embedding` 的顶级属性来配置 embedding 自动配置的启用和禁用。

要启用，spring.ai.model.embedding=oci-genai（默认启用）

要禁用，spring.ai.model.embedding=none（或任何不匹配 oci-genai 的值）

进行此更改是为了允许配置多个模型。
====

前缀 `spring.ai.oci.genai.embedding` 是配置 OCI GenAI 的 `EmbeddingModel` 实现的属性前缀

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.oci.genai.embedding.enabled (已移除且不再有效) | 启用 OCI GenAI embedding 模型。 | true |
| spring.ai.model.embedding | 启用 OCI GenAI embedding 模型。 | oci-genai |
| spring.ai.oci.genai.embedding.compartment | 模型 compartment OCID。 | - |
| spring.ai.oci.genai.embedding.servingMode | 要使用的模型服务模式。可以是 `on-demand` 或 `dedicated`。 | on-demand |
| spring.ai.oci.genai.embedding.truncate | 如果文本超过 embedding 上下文，如何截断文本。可以是 `START` 或 `END`。 | END |
| spring.ai.oci.genai.embedding.model | 用于 embeddings 的模型或模型端点。 | - |

提示：所有前缀为 `spring.ai.oci.genai.embedding.options` 的属性都可以通过在 `EmbeddingRequest` 调用中添加特定于请求的 [embedding-options](#embedding-options) 在运行时覆盖。

## 运行时选项

`OCIEmbeddingOptions` 提供 embedding 请求的配置信息。
`OCIEmbeddingOptions` 提供了一个 builder 来创建选项。

在启动时使用 `OCIEmbeddingOptions` 构造函数来设置用于所有 embedding 请求的默认选项。
在运行时，您可以通过在 `EmbeddingRequest` 请求中传递 `OCIEmbeddingOptions` 实例来覆盖默认选项。

例如，为特定请求覆盖默认模型名称：

```java
EmbeddingResponse embeddingResponse = embeddingModel.call(
    new EmbeddingRequest(List.of("Hello World", "World is big and salvation is near"),
        OCIEmbeddingOptions.builder()
            .model("my-other-embedding-model")
            .build()
));
```

## 示例代码

这将创建一个 `EmbeddingModel` 实现，您可以将其注入到您的类中。
以下是一个使用 `EmbeddingModel` 实现的简单 `@Controller` 类示例。

```properties
spring.ai.oci.genai.embedding.model=<your model>
spring.ai.oci.genai.embedding.compartment=<your model compartment>
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

如果您不想使用 Spring Boot 自动配置，可以在应用程序中手动配置 `OCIEmbeddingModel`。
为此，请将 `spring-oci-genai-openai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-oci-genai-openai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```gradle
dependencies {
    implementation 'org.springframework.ai:spring-oci-genai-openai'
}
```

提示：请参阅 [Dependency Management](getting-started.adoc#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件。

接下来，创建一个 `OCIEmbeddingModel` 实例并使用它来计算两个输入文本之间的相似性：

```java
final String EMBEDDING_MODEL = "cohere.embed-english-light-v2.0";
final String CONFIG_FILE = Paths.get(System.getProperty("user.home"), ".oci", "config").toString();
final String PROFILE = "DEFAULT";
final String REGION = "us-chicago-1";
final String COMPARTMENT_ID = System.getenv("OCI_COMPARTMENT_ID");

var authProvider = new ConfigFileAuthenticationDetailsProvider(
		this.CONFIG_FILE, this.PROFILE);
var aiClient = GenerativeAiInferenceClient.builder()
    .region(Region.valueOf(this.REGION))
    .build(this.authProvider);
var options = OCIEmbeddingOptions.builder()
    .model(this.EMBEDDING_MODEL)
    .compartment(this.COMPARTMENT_ID)
    .servingMode("on-demand")
    .build();
var embeddingModel = new OCIEmbeddingModel(this.aiClient, this.options);
List<Double> embedding = this.embeddingModel.embed(new Document("How many provinces are in Canada?"));
```
