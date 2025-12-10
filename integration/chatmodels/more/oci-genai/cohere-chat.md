# OCI GenAI Cohere Chat

[OCI GenAI Service](https://www.oracle.com/artificial-intelligence/generative-ai/generative-ai-service/) 提供生成式 AI chat，支持按需模型或专用 AI 集群。

[OCI Chat Models Page](https://docs.oracle.com/en-us/iaas/Content/generative-ai/chat-models.htm) 和 [OCI Generative AI Playground](https://docs.oracle.com/en-us/iaas/Content/generative-ai/use-playground-embed.htm) 提供了有关在 OCI 上使用和托管 chat models 的详细信息。

## Prerequisites

您需要一个活跃的 [Oracle Cloud Infrastructure (OCI)](https://signup.oraclecloud.com/) 账户才能使用 OCI GenAI Cohere Chat 客户端。客户端提供四种不同的连接方式，包括使用用户和私钥的简单身份验证、workload identity、instance principal 或 OCI 配置文件身份验证。

### Add Repositories and BOM

Spring AI artifacts 发布在 Maven Central 和 Spring Snapshot 仓库中。
请参阅 [Artifact Repositories](getting-started#artifact-repositories) 部分，将这些仓库添加到您的构建系统中。

为了帮助进行依赖管理，Spring AI 提供了一个 BOM (bill of materials)，以确保在整个项目中使用一致版本的 Spring AI。请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建系统中。

## Auto-configuration

> **注意：**
> Spring AI auto-configuration、starter modules 的 artifact 名称发生了重大变化。
> 请参阅 [upgrade notes](https://docs.spring.io/spring-ai/reference/upgrade-notes.html) 了解更多信息。

Spring AI 为 OCI GenAI Cohere Chat Client 提供 Spring Boot auto-configuration。
要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-oci-genai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-starter-model-oci-genai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

### Chat Properties

#### Connection Properties

前缀 `spring.ai.oci.genai` 是用于配置与 OCI GenAI 连接的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.oci.genai.authenticationType | 在向 OCI 进行身份验证时使用的身份验证类型。可以是 `file`、`instance-principal`、`workload-identity` 或 `simple`。 | file |
| spring.ai.oci.genai.region | OCI 服务区域。 | us-chicago-1 |
| spring.ai.oci.genai.tenantId | OCI 租户 OCID，在使用 `simple` auth 进行身份验证时使用。 | - |
| spring.ai.oci.genai.userId | OCI 用户 OCID，在使用 `simple` auth 进行身份验证时使用。 | - |
| spring.ai.oci.genai.fingerprint | 私钥指纹，在使用 `simple` auth 进行身份验证时使用。 | - |
| spring.ai.oci.genai.privateKey | 私钥内容，在使用 `simple` auth 进行身份验证时使用。 | - |
| spring.ai.oci.genai.passPhrase | 可选的私钥密码短语，在使用 `simple` auth 和受密码保护的私钥进行身份验证时使用。 | - |
| spring.ai.oci.genai.file | OCI 配置文件的路径。在使用 `file` auth 进行身份验证时使用。 | <user's home directory>/.oci/config |
| spring.ai.oci.genai.profile | OCI profile 名称。在使用 `file` auth 进行身份验证时使用。 | DEFAULT |
| spring.ai.oci.genai.endpoint | 可选的 OCI GenAI endpoint。 | - |

#### Configuration Properties

> **注意：**
> 现在通过前缀为 `spring.ai.model.chat` 的顶级属性来配置 chat auto-configurations 的启用和禁用。
> 要启用，spring.ai.model.chat=oci-genai（默认启用）
> 要禁用，spring.ai.model.chat=none（或任何与 oci-genai 不匹配的值）
> 此更改是为了允许配置多个模型。

前缀 `spring.ai.oci.genai.cohere.chat` 是用于配置 OCI GenAI Cohere Chat 的 `ChatModel` 实现的属性前缀。

| Property | Description | Default |
|----------|-------------|---------|
| spring.ai.model.chat | 启用 OCI GenAI Cohere chat model。 | oci-genai |
| spring.ai.oci.genai.cohere.chat.enabled (no longer valid) | 启用 OCI GenAI Cohere chat model。 | true |
| spring.ai.oci.genai.cohere.chat.options.model | Model OCID 或 endpoint | - |
| spring.ai.oci.genai.cohere.chat.options.compartment | Model compartment OCID。 | - |
| spring.ai.oci.genai.cohere.chat.options.servingMode | 要使用的 model serving mode。可以是 `on-demand` 或 `dedicated`。 | on-demand |
| spring.ai.oci.genai.cohere.chat.options.preambleOverride | 覆盖 chat model 的 prompt preamble | - |
| spring.ai.oci.genai.cohere.chat.options.temperature | Inference temperature | - |
| spring.ai.oci.genai.cohere.chat.options.topP | Top P 参数 | - |
| spring.ai.oci.genai.cohere.chat.options.topK | Top K 参数 | - |
| spring.ai.oci.genai.cohere.chat.options.frequencyPenalty | 较高的值将减少重复的 tokens，输出将更加随机。 | - |
| spring.ai.oci.genai.cohere.chat.options.presencePenalty | 较高的值鼓励生成使用未使用过的 tokens 的输出。 | - |
| spring.ai.oci.genai.cohere.chat.options.stop | 将结束 completions 生成的文本序列列表。 | - |
| spring.ai.oci.genai.cohere.chat.options.documents | 在 chat context 中使用的文档列表。 | - |

> **提示：** 所有前缀为 `spring.ai.oci.genai.cohere.chat.options` 的属性都可以通过在 `Prompt` 调用中添加请求特定的 <<chat-options>> 在运行时覆盖。

## Runtime Options [[chat-options]]

[OCICohereChatOptions.java](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-oci-genai/src/main/java/org/springframework/ai/oci/cohere/OCICohereChatOptions.java) 提供模型配置，例如要使用的模型、temperature、frequency penalty 等。

在启动时，可以使用 `OCICohereChatModel(api, options)` 构造函数或 `spring.ai.oci.genai.cohere.chat.options.*` 属性来配置默认选项。

在运行时，您可以通过向 `Prompt` 调用添加新的、请求特定的选项来覆盖默认选项。
例如，要覆盖特定请求的默认模型和 temperature：

```java
ChatResponse response = chatModel.call(
    new Prompt(
        "Generate the names of 5 famous pirates.",
        OCICohereChatOptions.builder()
            .model("my-model-ocid")
            .compartment("my-compartment-ocid")
            .temperature(0.5)
        .build()
    ));
```

## Sample Controller

[Create](https://start.spring.io/) 一个新的 Spring Boot 项目，并将 `spring-ai-starter-model-oci-genai` 添加到您的 pom（或 gradle）依赖项中。

在 `src/main/resources` 目录下添加一个 `application.properties` 文件，以启用和配置 OCI GenAI Cohere chat model：

```properties
spring.ai.oci.genai.authenticationType=file
spring.ai.oci.genai.file=/path/to/oci/config/file
spring.ai.oci.genai.cohere.chat.options.compartment=my-compartment-ocid
spring.ai.oci.genai.cohere.chat.options.servingMode=on-demand
spring.ai.oci.genai.cohere.chat.options.model=my-chat-model-ocid
```

> **提示：** 将 `file`、`compartment` 和 `model` 替换为您的 OCI 账户中的值。

这将创建一个 `OCICohereChatModel` 实现，您可以将其注入到您的类中。
以下是一个简单的 `@Controller` 类的示例，它使用 chat model 进行文本生成。

```java
@RestController
public class ChatController {

    private final OCICohereChatModel chatModel;

    @Autowired
    public ChatController(OCICohereChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/ai/generate")
    public Map generate(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        return Map.of("generation", chatModel.call(message));
    }

    @GetMapping("/ai/generateStream")
	public Flux<ChatResponse> generateStream(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message) {
        var prompt = new Prompt(new UserMessage(message));
        return chatModel.stream(prompt);
    }
}
```

## Manual Configuration

[OCICohereChatModel](https://github.com/spring-projects/spring-ai/blob/main/models/spring-ai-oci-genai/src/main/java/org/springframework/ai/oci/cohere/OCICohereChatModel.java) 实现了 `ChatModel` 并使用 OCI Java SDK 连接到 OCI GenAI 服务。

将 `spring-ai-oci-genai` 依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-oci-genai</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-oci-genai'
}
```

> **提示：** 请参阅 [Dependency Management](getting-started#dependency-management) 部分，将 Spring AI BOM 添加到您的构建文件中。

接下来，创建一个 `OCICohereChatModel` 并将其用于文本生成：

```java
var CONFIG_FILE = Paths.get(System.getProperty("user.home"), ".oci", "config").toString();
var COMPARTMENT_ID = System.getenv("OCI_COMPARTMENT_ID");
var MODEL_ID = System.getenv("OCI_CHAT_MODEL_ID");

ConfigFileAuthenticationDetailsProvider authProvider = new ConfigFileAuthenticationDetailsProvider(
        CONFIG_FILE,
        "DEFAULT"
);
var genAi = GenerativeAiInferenceClient.builder()
        .region(Region.valueOf("us-chicago-1"))
        .build(authProvider);

var chatModel = new OCICohereChatModel(genAi, OCICohereChatOptions.builder()
        .model(MODEL_ID)
        .compartment(COMPARTMENT_ID)
        .servingMode("on-demand")
        .build());

ChatResponse response = chatModel.call(
        new Prompt("Generate the names of 5 famous pirates."));
```

`OCICohereChatOptions` 提供 chat 请求的配置信息。
`OCICohereChatOptions.Builder` 是一个流畅的选项构建器。

