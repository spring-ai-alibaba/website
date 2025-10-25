---
title: 多模态 (Multimodality)
keywords: ["Spring AI", "Multimodality", "图像处理", "音频处理", "视觉理解", "媒体处理"]
description: "学习如何使用 Spring AI 的多模态功能处理图像、音频和其他媒体类型。"
---

# 多模态 (Multimodality)

*本内容参考自 Spring AI 官方文档*

Spring AI 中的多模态功能使 AI 模型能够处理和理解多种类型的媒体内容，包括文本、图像、音频和视频。这个功能为构建能够处理多样化数据格式的丰富、交互式 AI 应用程序开辟了新的可能性。

## 概述

Spring AI 通过 Media 抽象提供对多模态交互的全面支持。这允许您在提示词中包含各种类型的媒体内容以及文本，使 AI 模型能够分析、理解和响应复杂的多模态输入。

Spring AI 中的多模态功能包括：
- 图像分析和理解
- 音频处理和转录
- 视频内容分析
- 文档处理
- 混合媒体交互

## 核心概念

### Media 接口

`Media` 接口是 Spring AI 中多模态内容的基础：

```java
public interface Media {

    MimeType getMimeType();

    Object getData();
}
```

### MediaContent 接口

支持媒体内容的消息实现 `MediaContent` 接口：

```java
public interface MediaContent extends Content {

    Collection<Media> getMedia();
}
```

### 带媒体的 UserMessage

`UserMessage` 类通过各种构造函数支持媒体内容：

```java
// 文本与单个媒体
UserMessage message = new UserMessage("描述这张图片", media);

// 文本与多个媒体项
UserMessage message = new UserMessage("比较这些图片", List.of(media1, media2));

// 使用 MediaContent 构建器
UserMessage message = new UserMessage("分析这个内容",
    List.of(
        new Media(MimeTypeUtils.IMAGE_JPEG, imageResource),
        new Media(MimeTypeUtils.TEXT_PLAIN, textContent)
    )
);
```

## 图像处理

### 基本图像分析

```java
@Service
public class ImageAnalysisService {

    private final ChatClient chatClient;

    public ImageAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String analyzeImage(Resource imageResource) {
        return chatClient.prompt()
            .user(u -> u.text("请描述您在这张图片中看到的内容")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public String analyzeImageFromUrl(String imageUrl) throws MalformedURLException {
        Resource imageResource = new UrlResource(imageUrl);

        return chatClient.prompt()
            .user(u -> u.text("分析这张图片并提供详细见解")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public String analyzeImageFromBytes(byte[] imageBytes) {
        Resource imageResource = new ByteArrayResource(imageBytes);

        return chatClient.prompt()
            .user(u -> u.text("您在这张图片中看到了什么？")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }
}
            );
            
            return chatClient.prompt()
                .messages(userMessage)
                .call()
                .content();
                
        } catch (IOException e) {
            return "图像处理失败: " + e.getMessage();
        }
    }
}
```

### 图像 OCR

```java
@Service
public class OCRService {
    
    @Autowired
    private ChatClient chatClient;
    
    public String extractText(byte[] imageBytes) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        UserMessage message = new UserMessage(
            "请提取图片中的所有文字内容",
            List.of(new Media(MimeTypeUtils.IMAGE_JPEG, base64Image))
        );
        
        return chatClient.prompt()
            .messages(message)
            .call()
            .content();
    }
}
```

## 音频处理示例

### 语音识别

```java
@Service
public class SpeechService {
    
    @Autowired
    private ChatClient chatClient;
    
    public String speechToText(byte[] audioBytes) {
        String base64Audio = Base64.getEncoder().encodeToString(audioBytes);
        
        UserMessage message = new UserMessage(
            "请将音频转换为文字",
            List.of(new Media(MimeTypeUtils.parseMediaType("audio/wav"), base64Audio))
        );
        
        return chatClient.prompt()
            .messages(message)
            .call()
            .content();
    }
}
```

## 多模态组合

### 图文结合分析

```java
@Service
public class MultiModalAnalysisService {
    
    @Autowired
    private ChatClient chatClient;
    
    public String analyzeImageWithContext(byte[] imageBytes, String context) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        UserMessage message = new UserMessage(
            String.format("结合以下背景信息分析图片：%s", context),
            List.of(new Media(MimeTypeUtils.IMAGE_JPEG, base64Image))
        );
        
        return chatClient.prompt()
            .messages(message)
            .call()
            .content();
    }
}
```

## 混合媒体处理

### 图像和文本上下文

```java
@Service
public class ContextualAnalysisService {

    private final ChatClient chatClient;

    public ContextualAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String analyzeImageWithContext(Resource imageResource, String context) {
        return chatClient.prompt()
            .user(u -> u.text("给定这个上下文：'{context}'，分析图像并解释它们的关系")
                       .param("context", context)
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public ProductAnalysis analyzeProductImage(Resource productImage, String productDescription) {
        String prompt = """
            分析这个产品图像以及描述：{description}

            提供：
            1. 视觉质量评估
            2. 图像与描述的匹配程度
            3. 缺失的视觉元素
            4. 改进建议
            5. 营销吸引力评分（1-10）
            """;

        return chatClient.prompt()
            .user(u -> u.text(prompt)
                       .param("description", productDescription)
                       .media(MimeTypeUtils.IMAGE_JPEG, productImage))
            .call()
            .entity(ProductAnalysis.class);
    }
}

public record ProductAnalysis(
    String visualQuality,
    String descriptionMatch,
    List<String> missingElements,
    List<String> improvements,
    int marketingAppeal
) {}
```

## REST API 集成

### 文件上传和分析

```java
@RestController
@RequestMapping("/api/multimodal")
public class MultiModalController {

    private final ImageAnalysisService imageAnalysisService;
    private final DocumentAnalysisService documentAnalysisService;

    public MultiModalController(
            ImageAnalysisService imageAnalysisService,
            DocumentAnalysisService documentAnalysisService) {
        this.imageAnalysisService = imageAnalysisService;
        this.documentAnalysisService = documentAnalysisService;
    }

    @PostMapping("/analyze-image")
    public ResponseEntity<ImageAnalysis> analyzeImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "prompt", defaultValue = "分析这张图片") String prompt) {

        try {
            // 将 MultipartFile 转换为 Resource
            Resource imageResource = new InputStreamResource(file.getInputStream()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            ImageAnalysis analysis = imageAnalysisService.analyzeImageStructured(imageResource);
            return ResponseEntity.ok(analysis);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/extract-document")
    public ResponseEntity<DocumentExtraction> extractDocument(
            @RequestParam("file") MultipartFile file) {

        try {
            Resource documentResource = new InputStreamResource(file.getInputStream()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            DocumentExtraction extraction = documentAnalysisService.extractDocumentContent(documentResource);
            return ResponseEntity.ok(extraction);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/compare-images")
    public ResponseEntity<String> compareImages(
            @RequestParam("file1") MultipartFile file1,
            @RequestParam("file2") MultipartFile file2) {

        try {
            Resource image1 = new InputStreamResource(file1.getInputStream());
            Resource image2 = new InputStreamResource(file2.getInputStream());

            String comparison = imageAnalysisService.compareImages(image1, image2);
            return ResponseEntity.ok(comparison);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
```

## 最佳实践

### 资源管理

```java
@Service
public class ResourceManagementService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public void validateResource(Resource resource) throws IOException {
        if (resource.contentLength() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("文件大小超过最大限制");
        }

        if (!resource.exists()) {
            throw new IllegalArgumentException("资源不存在");
        }
    }

    public Resource optimizeImage(Resource imageResource) throws IOException {
        // 实现图像优化逻辑
        // 根据需要调整大小、压缩或转换格式
        return imageResource;
    }
}
```

### 错误处理

```java
@Service
public class SafeMultiModalService {

    private final ChatClient chatClient;
    private final ResourceManagementService resourceManager;

    public Optional<String> safeAnalyzeImage(Resource imageResource) {
        try {
            resourceManager.validateResource(imageResource);

            String result = chatClient.prompt()
                .user(u -> u.text("分析这张图片")
                           .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
                .call()
                .content();

            return Optional.of(result);
        } catch (Exception e) {
            logger.warn("图像分析失败：{}", e.getMessage());
            return Optional.empty();
        }
    }
}
```

## 下一步

- 学习 [Tool Calling](../tool-calling/) 进行函数集成
- 探索 [Chat Memory](../chat-memory/) 进行对话上下文管理
- 查看 [Structured Output](../structured-output/) 进行格式化响应
