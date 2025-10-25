---
title: 模型 (Models)
keywords: ["Spring AI Alibaba", "模型", "通义千问", "DashScope", "DeepSeek", "多模态"]
description: "了解 Spring AI Alibaba 支持的各种 AI 模型，包括通义千问系列、DeepSeek 系列、多模态模型等的配置和使用方法。"
---

## 概述

Spring AI Alibaba 通过阿里云 DashScope 平台提供对多种 AI 模型的支持，包括通义千问系列、DeepSeek 系列等主流模型。框架提供了统一的接口来访问不同的模型服务，让开发者可以根据具体需求选择最适合的模型。

## Maven 依赖配置

要在项目中使用 AI 模型，需要在 `pom.xml` 文件中添加相应的依赖。

### 阿里云百炼 DashScope 模型

对于阿里云百炼 DashScope 模型（通义千问系列、DeepSeek 系列等），使用 Spring AI Alibaba starter：

```xml
<dependencies>
    <!-- Spring AI Alibaba DashScope Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>1.0.0.3-SNAPSHOT</version>
    </dependency>

    <!-- Spring Boot Starter Web (用于 REST API) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot Starter WebFlux (用于流式支持) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
</dependencies>
```

### 其他 AI 模型提供商

对于其他 AI 模型提供商，请参考 [Spring AI 官方文档](https://docs.spring.io/spring-ai/reference/)：

#### OpenAI 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
</dependency>
```

#### Anthropic Claude 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-anthropic-spring-boot-starter</artifactId>
</dependency>
```

#### Azure OpenAI 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-azure-openai-spring-boot-starter</artifactId>
</dependency>
```

#### Google Vertex AI 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-vertex-ai-gemini-spring-boot-starter</artifactId>
</dependency>
```

#### Ollama 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
</dependency>
```

#### Hugging Face 模型
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-transformers-spring-boot-starter</artifactId>
</dependency>
```

### DashScope 完整的 pom.xml 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.5</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>spring-ai-dashscope-demo</artifactId>
    <version>1.0.0</version>
    <name>Spring AI DashScope Demo</name>

    <properties>
        <java.version>17</java.version>
        <spring-ai-alibaba.version>1.0.0.3-SNAPSHOT</spring-ai-alibaba.version>
    </properties>

    <dependencies>
        <!-- Spring AI Alibaba DashScope Starter -->
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
            <version>${spring-ai-alibaba.version}</version>
        </dependency>

        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>

        <!-- 可选：JSON 处理 -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>

        <!-- 可选：数据验证 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- 测试依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

    <!-- SNAPSHOT 版本的仓库 -->
    <repositories>
        <repository>
            <id>spring-snapshots</id>
            <name>Spring Snapshots</name>
            <url>https://repo.spring.io/snapshot</url>
            <snapshots>
                <enabled>true</enabled>
            </snapshots>
        </repository>
    </repositories>
</project>
```

### 多提供商示例

对于使用多个 AI 提供商的项目：

```xml
<dependencies>
    <!-- 阿里云百炼 DashScope -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>1.0.0.3-SNAPSHOT</version>
    </dependency>

    <!-- OpenAI -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    </dependency>

    <!-- Ollama 本地模型 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
    </dependency>

    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
</dependencies>
```

### Gradle 依赖配置

对于 Gradle 用户，在 `build.gradle` 文件中添加以下内容：

#### DashScope 模型
```gradle
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope:1.0.0.3-SNAPSHOT'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'

    // 可选依赖
    implementation 'com.fasterxml.jackson.core:jackson-databind'
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // 测试依赖
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

repositories {
    mavenCentral()
    maven { url 'https://repo.spring.io/snapshot' }
}
```

#### 多提供商设置
```gradle
dependencies {
    // 阿里云百炼 DashScope
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope:1.0.0.3-SNAPSHOT'

    // OpenAI
    implementation 'org.springframework.ai:spring-ai-openai-spring-boot-starter'

    // Ollama
    implementation 'org.springframework.ai:spring-ai-ollama-spring-boot-starter'

    // Spring Boot
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'
}
```

> **注意**：对于其他 AI 提供商，请参考 [Spring AI 文档](https://docs.spring.io/spring-ai/reference/) 获取最新的依赖信息和配置详情。

## 支持的模型类型

### 1. 聊天模型（Chat Models）

用于文本对话和生成任务的大语言模型。

### 2. 多模态模型（Multimodal Models）

支持文本、图像、音频等多种输入类型的模型。

### 3. 图像生成模型（Image Generation Models）

专门用于图像生成和编辑的模型。

### 4. 语音合成模型（Text-to-Speech Models）

将文本转换为语音的模型。

### 5. 嵌入模型（Embedding Models）

用于文本向量化的模型。

## 通义千问系列模型

### 1. 基础聊天模型

#### Qwen-Plus
- **模型名称**：`qwen-plus`
- **上下文长度**：8K tokens（用户输入限制 6K tokens）
- **特点**：平衡性能和成本的通用模型
- **适用场景**：日常对话、文本生成、简单推理

```java
@Configuration
public class ModelConfig {
    
    @Bean
    public ChatClient qwenPlusChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwen-plus")
                .withTemperature(0.7)
                .build())
            .build();
    }
}
```

#### Qwen-Turbo
- **模型名称**：`qwen-turbo`
- **上下文长度**：32K tokens（用户输入限制 30K tokens）
- **特点**：高性能、长上下文支持
- **适用场景**：长文档处理、复杂对话

```properties
spring.ai.dashscope.chat.options.model=qwen-turbo
spring.ai.dashscope.chat.options.max-tokens=2000
```

#### Qwen-Max
- **模型名称**：`qwen-max`
- **上下文长度**：8K tokens（用户输入限制 6K tokens）
- **特点**：最强性能的通用模型
- **适用场景**：复杂推理、专业任务、高质量内容生成

#### Qwen-Max-LongContext
- **模型名称**：`qwen-max-longcontext`
- **上下文长度**：30K tokens（用户输入限制 28K tokens）
- **特点**：超长上下文支持
- **适用场景**：长文档分析、大规模信息处理

### 2. 推理增强模型

#### QwQ-Plus
- **模型名称**：`qwq-plus`
- **特点**：基于 Qwen2.5 的推理增强模型
- **输出特点**：先输出思考过程，再给出最终答案
- **适用场景**：数学推理、逻辑分析、复杂问题解决

```java
String response = chatClient.prompt()
    .user("解决这个数学问题：如果一个正方形的面积是 25，那么它的周长是多少？")
    .options(DashScopeChatOptions.builder()
        .withModel("qwq-plus")
        .withTemperature(0.1)  // 推理任务使用较低温度
        .build())
    .call()
    .content();
```

#### Qwen3-32B
- **模型名称**：`qwq-32b`
- **特点**：32B 参数的推理模型
- **性能**：在数学、编程等指标上达到 DeepSeek-R1 水平
- **适用场景**：编程辅助、数学计算、逻辑推理

### 3. 多模态模型

#### Qwen-Omni-Turbo
- **模型名称**：`qwen-omni-turbo`
- **支持输入**：视频、音频、图像、文本
- **支持输出**：音频、文本
- **适用场景**：多媒体内容理解、语音交互

```java
String response = chatClient.prompt()
    .user(u -> u.text("描述这个视频的内容")
              .media(MimeTypeUtils.VIDEO_MP4, videoResource))
    .options(DashScopeChatOptions.builder()
        .withModel("qwen-omni-turbo")
        .build())
    .call()
    .content();
```

#### Qwen-VL-Max
- **模型名称**：`qwen-vl-max`
- **特点**：视觉理解能力强的多模态模型
- **适用场景**：图像分析、视觉问答、图文理解

```java
String response = chatClient.prompt()
    .user(u -> u.text("这张图片中有什么？")
              .media(MimeTypeUtils.IMAGE_PNG, imageResource))
    .options(DashScopeChatOptions.builder()
        .withModel("qwen-vl-max")
        .build())
    .call()
    .content();
```

## DeepSeek 系列模型

Spring AI Alibaba 也支持通过 DashScope 平台访问 DeepSeek 系列模型。

### DeepSeek-R1
- **模型名称**：`deepseek-r1`
- **特点**：强大的推理能力
- **适用场景**：复杂推理、数学计算、代码生成

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: deepseek-r1
          temperature: 0.1
```

### DeepSeek-V3
- **模型名称**：`deepseek-v3`
- **特点**：最新版本的 DeepSeek 模型
- **适用场景**：通用对话、内容生成

## 图像生成模型

### WANX 系列

#### WANX-V1
- **模型名称**：`wanx-v1`
- **特点**：基础图像生成模型

#### WANX2.1-T2I-Turbo
- **模型名称**：`wanx2.1-t2i-turbo`
- **特点**：快速文本到图像生成

#### WANX2.1-T2I-Plus
- **模型名称**：`wanx2.1-t2i-plus`
- **特点**：高质量文本到图像生成

```java
@Service
public class ImageGenerationService {
    
    private final ImageModel imageModel;
    
    public String generateImage(String prompt) {
        ImageResponse response = imageModel.call(
            new ImagePrompt(prompt,
                DashScopeImageOptions.builder()
                    .withModel("wanx2.1-t2i-plus")
                    .withWidth(1024)
                    .withHeight(1024)
                    .build())
        );
        
        return response.getResult().getOutput().getUrl();
    }
}
```

### 图像编辑模型

#### WANX2.1-ImageEdit
- **模型名称**：`wanx2.1-imageedit`
- **特点**：图像编辑和修改

#### WANX-Sketch-to-Image-Lite
- **模型名称**：`wanx-sketch-to-image-lite`
- **特点**：草图转图像

## 语音合成模型

### SamBert 系列

Spring AI Alibaba 支持多种中文语音合成模型：

- **sambert-zhinan-v1**：智楠语音
- **sambert-zhiqi-v1**：智琪语音
- **sambert-zhichu-v1**：智楚语音
- **sambert-zhide-v1**：智德语音
- **sambert-zhiwei-v1**：智薇语音
- **sambert-zhiting-v1**：智婷语音

```java
@Service
public class TextToSpeechService {
    
    private final SpeechModel speechModel;
    
    public byte[] synthesizeSpeech(String text) {
        SpeechResponse response = speechModel.call(
            new SpeechPrompt(text,
                DashScopeSpeechOptions.builder()
                    .withModel("sambert-zhiqi-v1")
                    .withVoice("zhiqi")
                    .build())
        );
        
        return response.getResult().getOutput();
    }
}
```

## 嵌入模型

### Text-Embedding-V1
- **模型名称**：`text-embedding-v1`
- **维度**：1536
- **适用场景**：文本相似度计算、RAG 系统

```java
@Service
public class EmbeddingService {
    
    private final EmbeddingModel embeddingModel;
    
    public List<Double> getEmbedding(String text) {
        EmbeddingResponse response = embeddingModel.embedForResponse(
            List.of(text)
        );
        
        return response.getResults().get(0).getOutput();
    }
}
```

## 模型配置

### 1. 全局配置

```properties
# 基础配置
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
spring.ai.dashscope.base-url=https://dashscope.aliyuncs.com

# 聊天模型配置
spring.ai.dashscope.chat.options.model=qwen-max-latest
spring.ai.dashscope.chat.options.temperature=0.7
spring.ai.dashscope.chat.options.max-tokens=2000
spring.ai.dashscope.chat.options.top-p=0.8

# 图像模型配置
spring.ai.dashscope.image.options.model=wanx2.1-t2i-plus
spring.ai.dashscope.image.options.width=1024
spring.ai.dashscope.image.options.height=1024

# 嵌入模型配置
spring.ai.dashscope.embedding.options.model=text-embedding-v1
```

### 2. 运行时配置

```java
// 动态配置聊天选项
DashScopeChatOptions chatOptions = DashScopeChatOptions.builder()
    .withModel("qwen-max")
    .withTemperature(0.9)
    .withMaxTokens(1500)
    .withTopP(0.8)
    .withPresencePenalty(0.1)
    .withFrequencyPenalty(0.1)
    .withStop(List.of("END", "STOP"))
    .build();

// 动态配置图像选项
DashScopeImageOptions imageOptions = DashScopeImageOptions.builder()
    .withModel("wanx2.1-t2i-plus")
    .withWidth(1024)
    .withHeight(1024)
    .withSteps(20)
    .withSeed(12345L)
    .build();
```

### 3. 多模型配置

```java
@Configuration
public class MultiModelConfig {
    
    @Bean
    @Primary
    public ChatClient defaultChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwen-plus")
                .build())
            .build();
    }
    
    @Bean
    public ChatClient reasoningChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwq-plus")
                .withTemperature(0.1)
                .build())
            .build();
    }
    
    @Bean
    public ChatClient creativeChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultOptions(DashScopeChatOptions.builder()
                .withModel("qwen-max")
                .withTemperature(0.9)
                .build())
            .build();
    }
}
```

## 模型选择指南

### 1. 根据任务类型选择

- **日常对话**：qwen-plus、qwen-turbo
- **复杂推理**：qwq-plus、qwen3-32b、deepseek-r1
- **长文档处理**：qwen-turbo、qwen-max-longcontext
- **多模态任务**：qwen-omni-turbo、qwen-vl-max
- **创意生成**：qwen-max（高温度设置）

### 2. 根据性能要求选择

- **高性能**：qwen-max、qwq-plus
- **平衡性能**：qwen-plus、qwen-turbo
- **快速响应**：qwen-turbo

### 3. 根据成本考虑选择

- **成本敏感**：qwen-plus、qwen-turbo
- **质量优先**：qwen-max、qwq-plus

## 最佳实践

### 1. 模型参数调优

```java
// 创意任务：高温度、高随机性
DashScopeChatOptions creativeOptions = DashScopeChatOptions.builder()
    .withTemperature(0.9)
    .withTopP(0.9)
    .build();

// 推理任务：低温度、高确定性
DashScopeChatOptions reasoningOptions = DashScopeChatOptions.builder()
    .withTemperature(0.1)
    .withTopP(0.1)
    .build();

// 平衡任务：中等参数
DashScopeChatOptions balancedOptions = DashScopeChatOptions.builder()
    .withTemperature(0.7)
    .withTopP(0.8)
    .build();
```

### 2. 错误处理和重试

```java
@Service
public class RobustModelService {
    
    @Retryable(value = {Exception.class}, maxAttempts = 3)
    public String callModelWithRetry(String prompt) {
        try {
            return chatClient.prompt(prompt).call().content();
        } catch (Exception e) {
            log.warn("Model call failed, retrying: {}", e.getMessage());
            throw e;
        }
    }
    
    @Recover
    public String recover(Exception ex, String prompt) {
        log.error("All retry attempts failed: {}", ex.getMessage());
        return "抱歉，服务暂时不可用，请稍后重试。";
    }
}
```

### 3. 性能监控

```java
@Component
public class ModelMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Timer modelCallTimer;
    private final Counter modelCallCounter;
    
    public ModelMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.modelCallTimer = Timer.builder("model.call.duration")
            .description("Model call duration")
            .register(meterRegistry);
        this.modelCallCounter = Counter.builder("model.call.count")
            .description("Model call count")
            .register(meterRegistry);
    }
    
    public String timedModelCall(String prompt, String model) {
        return modelCallTimer.recordCallable(() -> {
            modelCallCounter.increment(Tags.of("model", model));
            return chatClient.prompt(prompt)
                .options(DashScopeChatOptions.builder()
                    .withModel(model)
                    .build())
                .call()
                .content();
        });
    }
}
```

## 总结

Spring AI Alibaba 提供了对多种 AI 模型的统一访问接口，支持从基础对话到复杂推理、从文本生成到多模态处理的各种应用场景。通过合理选择模型和配置参数，开发者可以构建高质量、高性能的 AI 应用。

关键要点：
- 根据具体任务选择合适的模型
- 合理配置模型参数以获得最佳效果
- 实现适当的错误处理和重试机制
- 监控模型调用性能和成本
- 考虑多模型组合以满足不同需求
