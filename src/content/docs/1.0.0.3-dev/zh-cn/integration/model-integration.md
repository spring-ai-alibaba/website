---
title: "模型集成：释放 DashScope 的全部 AI 潜力"
description: "通过 SAA 统一、简化的 API，轻松集成 DashScope 强大的聊天、文生图、向量化及语音模型。"
---

DashScope（灵骏）作为阿里巴巴的旗舰 AI 模型服务平台，提供了包括“通义千问”在内的一系列强大模型。如何将这些顶尖的聊天、多模态、嵌入和语音能力，以一种**标准、简单、可维护**的方式集成到您的 Spring 应用中？

这正是 **Spring AI Alibaba (SAA) 的核心价值所在**。SAA 遵循 Spring AI 的设计哲学，为您提供了一套统一且简化的 API。这意味着您无需为每种模型能力学习一套新的 SDK，而是可以通过 `ChatClient`、`ImageModel` 等标准接口，无缝地调用 DashScope 的全部功能。

本指南将带您领略如何通过 SAA，优雅地将 DashScope 的各项 AI 能力集成到您的项目中。

## 准备工作

在开始之前，请确保已完成以下两个步骤。

### 1. 添加依赖

在您的 `pom.xml` 中，加入 SAA 的 DashScope Starter：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>
```

### 2. 配置 API Key

您的 API Key 是访问 DashScope 服务的凭证。请登录[阿里云百炼控制台](https://bailian.console.aliyun.com/)获取。

```yaml
spring:
  ai:
    dashscope:
      api-key: "sk-your-api-key"
```

## 核心能力 1：实现智能对话 (Chat Models)

智能对话是 AI 应用最核心的场景。SAA 通过 `ChatClient` 接口，让调用通义千问系列模型变得极其简单。

### 基础用法：单轮对话

这是与 AI 进行交互最基础的方式。

```java
@RestController
public class ChatController {
    
    private final ChatClient chatClient;
    
    @Autowired
    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }
}
```

### 进阶技巧 1：流式响应

对于需要实时反馈的场景（如在线聊天），使用流式响应可以显著提升用户体验。只需在调用链中增加一个 `.stream()` 即可。

```java
@GetMapping("/chat/stream")
public Flux<String> streamChat(@RequestParam String message) {
    return chatClient.prompt()
        .user(message)
        .stream()
        .content();
}
```

### 进阶技巧 2：模型与参数定制

您可以精细地控制模型的行为，例如选择更高性能的模型、调整创造性（`temperature`）等。

在 `application.yaml` 中进行全局配置：

```yaml
spring:
  ai:
    dashscope:
      chat:
        options:
          model: "qwen-max"      # 可选: qwen-plus, qwen-turbo, qwen-max
          temperature: 0.7       # 0.0 ~ 1.0，数值越高，回答越有创意
          max-tokens: 2048
```

### 进阶技巧 3：图像理解 (Vision)

通义千问强大的多模态能力，可以让它“看懂”图片。您只需在 `prompt` 中加入图片媒体即可。

```java
@PostMapping("/vision/analyze")
public String analyzeImage(@RequestParam String imageUrl, 
                          @RequestParam(defaultValue = "请描述这张图片") String question) {
    return chatClient.prompt()
        .user(userSpec -> userSpec
            .text(question)
            .media(MimeTypeUtils.IMAGE_JPEG, new ClassPathResource(imageUrl)))
        .call()
        .content();
}
```

## 核心能力 2：生成创意图片 (Image Model)

文生图是 AIGC 的另一大核心应用。SAA 通过 `ImageModel` 接口统一了图像生成能力。

### 基础用法

```java
@RestController
public class ImageGenerationController {
    
    private final ImageModel imageModel;
    
    @Autowired
    public ImageGenerationController(ImageModel imageModel) {
        this.imageModel = imageModel;
    }
    
    @PostMapping("/image/generate")
    public String generateImage(@RequestParam String prompt) {
        ImagePrompt imagePrompt = new ImagePrompt(prompt);
        ImageResponse response = imageModel.call(imagePrompt);
        // 返回生成图片的首个URL
        return response.getResult().getOutput().getUrl();
    }
}
```

### 进阶技巧：定制图片规格

您可以指定生成的图片尺寸、模型版本等参数。

```java
@PostMapping("/image/generate/custom")
public String generateCustomImage(@RequestParam String prompt) {
    ImageOptions options = DashScopeImageOptions.builder()
        .withModel("wanx-v1") // 指定万相系列模型
        .withWidth(1024)
        .withHeight(1024)
        .withN(1) // 生成图片数量
        .build();
        
    ImagePrompt imagePrompt = new ImagePrompt(prompt, options);
    ImageResponse response = imageModel.call(imagePrompt);
    
    return response.getResult().getOutput().getUrl();
}
```

## 核心能力 3：文本向量化 (Embedding Models)

文本向量化是将文本转换为数学向量的过程，是实现 RAG（检索增强生成）、文本相似度计算等高级功能的基石。SAA 通过 `EmbeddingModel` 接口提供此能力。

### 基础用法：计算文本相似度

一个常见的应用场景是判断两段文本的语义相似度。

```java
@Service
public class SimilarityService {
    
    private final EmbeddingModel embeddingModel;

    @Autowired
    public SimilarityService(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }
    
    public double calculateSimilarity(String text1, String text2) {
        // 1. 将两段文本转换为向量
        List<List<Double>> embeddings = embeddingModel.embed(List.of(text1, text2));
        
        // 2. 计算余弦相似度
        return cosineSimilarity(embeddings.get(0), embeddings.get(1));
    }
    
    private double cosineSimilarity(List<Double> v1, List<Double> v2) {
        // ... (余弦相似度计算逻辑)
    }
}
```

### 进阶技巧：批量处理

当需要处理大量文档时，批量调用可以显著提升效率。

```java
@PostMapping("/embedding/batch")
public List<List<Double>> batchEmbedding(@RequestBody List<String> texts) {
    // 一次调用即可获取所有文本的向量表示
    return embeddingModel.embed(texts);
}
```

## 核心能力 4：语音处理 (Speech & Audio)

SAA 还封装了 DashScope 的语音合成（TTS）和语音识别（ASR）能力。

### 语音合成 (Text-to-Speech)

```java
@RestController
public class SpeechController {
    
    private final SpeechModel speechModel;
    
    @Autowired
    public SpeechController(SpeechModel speechModel) {
        this.speechModel = speechModel;
    }
    
    @PostMapping("/speech/synthesize")
    public ResponseEntity<byte[]> synthesizeSpeech(@RequestParam String text) {
        SpeechPrompt prompt = new SpeechPrompt(text);
        byte[] audioData = speechModel.call(prompt).getResult().getOutput();
        
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(audioData);
    }
}
```

### 语音识别 (Audio-to-Text)

```java
@PostMapping("/speech/transcribe")
public String transcribeAudio(@RequestParam("file") MultipartFile audioFile) throws IOException {
    // SAA 提供了 AudioTranscriptionModel 接口
    AudioTranscriptionPrompt prompt = new AudioTranscriptionPrompt(audioFile.getResource());
    AudioTranscriptionResponse response = audioTranscriptionModel.call(prompt);
    
    return response.getResult().getOutput();
}
```

## 生产级最佳实践

### 为不同场景配置多模型实例

假设您需要一个高创造性的模型用于市场文案生成，同时需要一个严谨、低偏差的模型用于客服问答。您可以通过 Spring 的 `@Bean` 和 `@Qualifier` 轻松实现。

```java
@Configuration
public class ModelConfiguration {
    
    @Bean("creativeChatClient")
    public ChatClient creativeChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwen-max")
                .withTemperature(0.9f) // 高创造性
                .build())
            .build();
    }
    
    @Bean("conservativeChatClient")
    public ChatClient conservativeChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwen-plus")
                .withTemperature(0.1f) // 低偏差，更严谨
                .build())
            .build();
    }
}

// 在 Service 中按需注入
@Service
public class ContentService {
    private final ChatClient marketingClient;
    private final ChatClient supportClient;

    public ContentService(@Qualifier("creativeChatClient") ChatClient marketingClient,
                          @Qualifier("conservativeChatClient") ChatClient supportClient) {
        this.marketingClient = marketingClient;
        this.supportClient = supportClient;
    }
}
```

### 增加接口健壮性：重试机制

网络波动或服务瞬时高负载是生产环境中常见的问题。SAA 允许您通过 `RetryTemplate` 优雅地处理这些问题。

```java
@Configuration
public class RobustChatConfiguration {

    @Bean
    @Primary
    public ChatClient robustChatClient(ChatClient.Builder builder) {
        return builder
            .defaultOptions(DashScopeChatOptions.builder()
                .withRetryTemplate(RetryTemplate.builder()
                    .maxAttempts(3) // 最多重试3次
                    .fixedBackoff(Duration.ofSeconds(2)) // 每次重试间隔2秒
                    .build())
                .build())
            .build();
    }
}
```

## 深入阅读

- **Spring AI 官方文档**: SAA 专注于 DashScope 的深度集成。如果您需要集成 **OpenAI, Azure, Bedrock** 等其他模型提供商，或者想深入理解 SAA 背后的核心抽象（如 `ChatClient`, `ImageModel` 等）和设计哲学，Spring AI 的官方文档是您的最佳起点。请阅读 [Spring AI 的官方参考文档](https://docs.spring.io/spring-ai/reference/)。
- **DashScope 官方文档**: 要获取关于“通义千问”等模型最详尽的参数说明、最新功能和最佳实践，请查阅 [DashScope 官方文档](https://dashscope.aliyun.com/)。
