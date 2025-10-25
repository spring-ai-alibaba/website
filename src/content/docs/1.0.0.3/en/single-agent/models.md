---
title: Models
keywords: ["Spring AI Alibaba", "Models", "Qwen", "DashScope", "DeepSeek", "Multimodal"]
description: "Learn about various AI models supported by Spring AI Alibaba, including Qwen series, DeepSeek series, multimodal models, and their configuration and usage."
---

## Overview

Spring AI Alibaba provides support for various AI models through the Alibaba Cloud DashScope platform, including Qwen series, DeepSeek series, and other mainstream models. The framework offers a unified interface to access different model services, allowing developers to choose the most suitable model based on specific requirements.

## Maven Dependencies

To use AI models in your project, you need to add the appropriate dependencies to your `pom.xml` file.

### Alibaba Cloud DashScope Models (百炼)

For Alibaba Cloud DashScope models (Qwen series, DeepSeek series, etc.), use the Spring AI Alibaba starter:

```xml
<dependencies>
    <!-- Spring AI Alibaba DashScope Starter -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>1.0.0.3-SNAPSHOT</version>
    </dependency>

    <!-- Spring Boot Starter Web (for REST APIs) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot Starter WebFlux (for streaming support) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
</dependencies>
```

### Other AI Model Providers

For other AI model providers, refer to the [Spring AI official documentation](https://docs.spring.io/spring-ai/reference/):

#### OpenAI Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
</dependency>
```

#### Anthropic Claude Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-anthropic-spring-boot-starter</artifactId>
</dependency>
```

#### Azure OpenAI Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-azure-openai-spring-boot-starter</artifactId>
</dependency>
```

#### Google Vertex AI Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-vertex-ai-gemini-spring-boot-starter</artifactId>
</dependency>
```

#### Ollama Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
</dependency>
```

#### Hugging Face Models
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-transformers-spring-boot-starter</artifactId>
</dependency>
```

### Complete Example pom.xml for DashScope

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

        <!-- Optional: For JSON processing -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>

        <!-- Optional: For validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Test Dependencies -->
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

    <!-- Repository for SNAPSHOT versions -->
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

### Multi-Provider Example

For projects using multiple AI providers:

```xml
<dependencies>
    <!-- Alibaba Cloud DashScope -->
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

    <!-- Ollama for local models -->
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

### Gradle Dependencies

For Gradle users, add the following to your `build.gradle` file:

#### DashScope Models
```gradle
dependencies {
    implementation 'com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope:1.0.0.3-SNAPSHOT'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'

    // Optional dependencies
    implementation 'com.fasterxml.jackson.core:jackson-databind'
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // Test dependencies
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

repositories {
    mavenCentral()
    maven { url 'https://repo.spring.io/snapshot' }
}
```

#### Multi-Provider Setup
```gradle
dependencies {
    // Alibaba Cloud DashScope
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

> **Note**: For other AI providers, please refer to the [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/) for the latest dependency information and configuration details.

## Supported Model Types

### 1. Chat Models

Large language models for text conversation and generation tasks.

### 2. Multimodal Models

Models that support multiple input types including text, images, and audio.

### 3. Image Generation Models

Models specifically designed for image generation and editing.

### 4. Text-to-Speech Models

Models that convert text to speech.

### 5. Embedding Models

Models for text vectorization.

## Qwen Series Models

### 1. Basic Chat Models

#### Qwen-Plus
- **Model Name**: `qwen-plus`
- **Context Length**: 8K tokens (user input limited to 6K tokens)
- **Features**: Balanced performance and cost general-purpose model
- **Use Cases**: Daily conversation, text generation, simple reasoning

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
- **Model Name**: `qwen-turbo`
- **Context Length**: 32K tokens (user input limited to 30K tokens)
- **Features**: High performance with long context support
- **Use Cases**: Long document processing, complex conversations

```properties
spring.ai.dashscope.chat.options.model=qwen-turbo
spring.ai.dashscope.chat.options.max-tokens=2000
```

#### Qwen-Max
- **Model Name**: `qwen-max`
- **Context Length**: 8K tokens (user input limited to 6K tokens)
- **Features**: Highest performance general-purpose model
- **Use Cases**: Complex reasoning, professional tasks, high-quality content generation

#### Qwen-Max-LongContext
- **Model Name**: `qwen-max-longcontext`
- **Context Length**: 30K tokens (user input limited to 28K tokens)
- **Features**: Ultra-long context support
- **Use Cases**: Long document analysis, large-scale information processing

### 2. Reasoning-Enhanced Models

#### QwQ-Plus
- **Model Name**: `qwq-plus`
- **Features**: Reasoning-enhanced model based on Qwen2.5
- **Output Characteristics**: Outputs thinking process first, then final answer
- **Use Cases**: Mathematical reasoning, logical analysis, complex problem solving

```java
String response = chatClient.prompt()
    .user("Solve this math problem: If a square has an area of 25, what is its perimeter?")
    .options(DashScopeChatOptions.builder()
        .withModel("qwq-plus")
        .withTemperature(0.1)  // Use lower temperature for reasoning tasks
        .build())
    .call()
    .content();
```

#### Qwen3-32B
- **Model Name**: `qwq-32b`
- **Features**: 32B parameter reasoning model
- **Performance**: Reaches DeepSeek-R1 level in math and programming metrics
- **Use Cases**: Programming assistance, mathematical calculations, logical reasoning

### 3. Multimodal Models

#### Qwen-Omni-Turbo
- **Model Name**: `qwen-omni-turbo`
- **Supported Input**: Video, audio, images, text
- **Supported Output**: Audio, text
- **Use Cases**: Multimedia content understanding, voice interaction

```java
String response = chatClient.prompt()
    .user(u -> u.text("Describe the content of this video")
              .media(MimeTypeUtils.VIDEO_MP4, videoResource))
    .options(DashScopeChatOptions.builder()
        .withModel("qwen-omni-turbo")
        .build())
    .call()
    .content();
```

#### Qwen-VL-Max
- **Model Name**: `qwen-vl-max`
- **Features**: Strong visual understanding multimodal model
- **Use Cases**: Image analysis, visual Q&A, image-text understanding

```java
String response = chatClient.prompt()
    .user(u -> u.text("What's in this image?")
              .media(MimeTypeUtils.IMAGE_PNG, imageResource))
    .options(DashScopeChatOptions.builder()
        .withModel("qwen-vl-max")
        .build())
    .call()
    .content();
```

## DeepSeek Series Models

Spring AI Alibaba also supports accessing DeepSeek series models through the DashScope platform.

### DeepSeek-R1
- **Model Name**: `deepseek-r1`
- **Features**: Powerful reasoning capabilities
- **Use Cases**: Complex reasoning, mathematical calculations, code generation

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
- **Model Name**: `deepseek-v3`
- **Features**: Latest version of DeepSeek model
- **Use Cases**: General conversation, content generation

## Image Generation Models

### WANX Series

#### WANX-V1
- **Model Name**: `wanx-v1`
- **Features**: Basic image generation model

#### WANX2.1-T2I-Turbo
- **Model Name**: `wanx2.1-t2i-turbo`
- **Features**: Fast text-to-image generation

#### WANX2.1-T2I-Plus
- **Model Name**: `wanx2.1-t2i-plus`
- **Features**: High-quality text-to-image generation

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

### Image Editing Models

#### WANX2.1-ImageEdit
- **Model Name**: `wanx2.1-imageedit`
- **Features**: Image editing and modification

#### WANX-Sketch-to-Image-Lite
- **Model Name**: `wanx-sketch-to-image-lite`
- **Features**: Sketch to image conversion

## Text-to-Speech Models

### SamBert Series

Spring AI Alibaba supports multiple Chinese text-to-speech models:

- **sambert-zhinan-v1**: Zhinan voice
- **sambert-zhiqi-v1**: Zhiqi voice
- **sambert-zhichu-v1**: Zhichu voice
- **sambert-zhide-v1**: Zhide voice
- **sambert-zhiwei-v1**: Zhiwei voice
- **sambert-zhiting-v1**: Zhiting voice

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

## Embedding Models

### Text-Embedding-V1
- **Model Name**: `text-embedding-v1`
- **Dimensions**: 1536
- **Use Cases**: Text similarity calculation, RAG systems

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

## Model Configuration

### 1. Global Configuration

```properties
# Basic configuration
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
spring.ai.dashscope.base-url=https://dashscope.aliyuncs.com

# Chat model configuration
spring.ai.dashscope.chat.options.model=qwen-max-latest
spring.ai.dashscope.chat.options.temperature=0.7
spring.ai.dashscope.chat.options.max-tokens=2000
spring.ai.dashscope.chat.options.top-p=0.8

# Image model configuration
spring.ai.dashscope.image.options.model=wanx2.1-t2i-plus
spring.ai.dashscope.image.options.width=1024
spring.ai.dashscope.image.options.height=1024

# Embedding model configuration
spring.ai.dashscope.embedding.options.model=text-embedding-v1
```

### 2. Runtime Configuration

```java
// Dynamic chat options configuration
DashScopeChatOptions chatOptions = DashScopeChatOptions.builder()
    .withModel("qwen-max")
    .withTemperature(0.9)
    .withMaxTokens(1500)
    .withTopP(0.8)
    .withPresencePenalty(0.1)
    .withFrequencyPenalty(0.1)
    .withStop(List.of("END", "STOP"))
    .build();

// Dynamic image options configuration
DashScopeImageOptions imageOptions = DashScopeImageOptions.builder()
    .withModel("wanx2.1-t2i-plus")
    .withWidth(1024)
    .withHeight(1024)
    .withSteps(20)
    .withSeed(12345L)
    .build();
```

### 3. Multi-Model Configuration

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

## Model Selection Guide

### 1. Choose by Task Type

- **Daily Conversation**: qwen-plus, qwen-turbo
- **Complex Reasoning**: qwq-plus, qwen3-32b, deepseek-r1
- **Long Document Processing**: qwen-turbo, qwen-max-longcontext
- **Multimodal Tasks**: qwen-omni-turbo, qwen-vl-max
- **Creative Generation**: qwen-max (with high temperature settings)

### 2. Choose by Performance Requirements

- **High Performance**: qwen-max, qwq-plus
- **Balanced Performance**: qwen-plus, qwen-turbo
- **Fast Response**: qwen-turbo

### 3. Choose by Cost Considerations

- **Cost Sensitive**: qwen-plus, qwen-turbo
- **Quality Priority**: qwen-max, qwq-plus

## Best Practices

### 1. Model Parameter Tuning

```java
// Creative tasks: high temperature, high randomness
DashScopeChatOptions creativeOptions = DashScopeChatOptions.builder()
    .withTemperature(0.9)
    .withTopP(0.9)
    .build();

// Reasoning tasks: low temperature, high determinism
DashScopeChatOptions reasoningOptions = DashScopeChatOptions.builder()
    .withTemperature(0.1)
    .withTopP(0.1)
    .build();

// Balanced tasks: medium parameters
DashScopeChatOptions balancedOptions = DashScopeChatOptions.builder()
    .withTemperature(0.7)
    .withTopP(0.8)
    .build();
```

### 2. Error Handling and Retry

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
        return "Sorry, service is temporarily unavailable, please try again later.";
    }
}
```

### 3. Performance Monitoring

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

## Summary

Spring AI Alibaba provides unified access interfaces to various AI models, supporting scenarios from basic conversation to complex reasoning, from text generation to multimodal processing. By properly selecting models and configuring parameters, developers can build high-quality, high-performance AI applications.

Key Points:
- Choose appropriate models based on specific tasks
- Configure model parameters properly for optimal results
- Implement appropriate error handling and retry mechanisms
- Monitor model call performance and costs
- Consider multi-model combinations to meet different requirements
