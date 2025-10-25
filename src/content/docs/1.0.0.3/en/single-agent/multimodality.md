---
title: Multimodality
keywords: ["Spring AI", "Multimodality", "Image Processing", "Audio Processing", "Vision", "Media"]
description: "Learn how to use Spring AI's multimodal capabilities for processing images, audio, and other media types."
---

# Multimodality

*This content is referenced from Spring AI documentation*

Multimodality in Spring AI enables AI models to process and understand multiple types of media content, including text, images, audio, and video. This capability opens up new possibilities for building rich, interactive AI applications that can work with diverse data formats.

## Overview

Spring AI provides comprehensive support for multimodal interactions through the Media abstraction. This allows you to include various types of media content alongside text in your prompts, enabling AI models to analyze, understand, and respond to complex multimodal inputs.

The multimodal capabilities in Spring AI include:
- Image analysis and understanding
- Audio processing and transcription
- Video content analysis
- Document processing
- Mixed media interactions

## Core Concepts

### Media Interface

The `Media` interface is the foundation for multimodal content in Spring AI:

```java
public interface Media {

    MimeType getMimeType();

    Object getData();
}
```

### MediaContent Interface

Messages that support media content implement the `MediaContent` interface:

```java
public interface MediaContent extends Content {

    Collection<Media> getMedia();
}
```

### UserMessage with Media

The `UserMessage` class supports media content through various constructors:

```java
// Text with single media
UserMessage message = new UserMessage("Describe this image", media);

// Text with multiple media items
UserMessage message = new UserMessage("Compare these images", List.of(media1, media2));

// Using MediaContent builder
UserMessage message = new UserMessage("Analyze this content",
    List.of(
        new Media(MimeTypeUtils.IMAGE_JPEG, imageResource),
        new Media(MimeTypeUtils.TEXT_PLAIN, textContent)
    )
);
```

## Image Processing

### Basic Image Analysis

```java
@Service
public class ImageAnalysisService {

    private final ChatClient chatClient;

    public ImageAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String analyzeImage(Resource imageResource) {
        return chatClient.prompt()
            .user(u -> u.text("Please describe what you see in this image")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public String analyzeImageFromUrl(String imageUrl) throws MalformedURLException {
        Resource imageResource = new UrlResource(imageUrl);

        return chatClient.prompt()
            .user(u -> u.text("Analyze this image and provide detailed insights")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public String analyzeImageFromBytes(byte[] imageBytes) {
        Resource imageResource = new ByteArrayResource(imageBytes);

        return chatClient.prompt()
            .user(u -> u.text("What do you see in this image?")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }
}
```

### Structured Image Analysis

```java
public record ImageAnalysis(
    String description,
    List<String> objects,
    String scene,
    String mood,
    List<String> colors,
    String textContent
) {}

@Service
public class StructuredImageAnalysisService {

    private final ChatClient chatClient;

    public StructuredImageAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public ImageAnalysis analyzeImageStructured(Resource imageResource) {
        String prompt = """
            Analyze this image and provide a structured response with:
            1. Overall description
            2. List of objects detected
            3. Scene type (indoor/outdoor, location type)
            4. Mood or atmosphere
            5. Dominant colors
            6. Any text content visible
            """;

        return chatClient.prompt()
            .user(u -> u.text(prompt)
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .entity(ImageAnalysis.class);
    }
}
```

### Multiple Image Analysis

```java
@Service
public class MultiImageAnalysisService {

    private final ChatClient chatClient;

    public MultiImageAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String compareImages(Resource image1, Resource image2) {
        return chatClient.prompt()
            .user(u -> u.text("Compare these two images and describe the differences and similarities")
                       .media(MimeTypeUtils.IMAGE_JPEG, image1)
                       .media(MimeTypeUtils.IMAGE_JPEG, image2))
            .call()
            .content();
    }

    public String analyzeImageSequence(List<Resource> images) {
        UserMessage.Builder builder = new UserMessage.Builder()
            .text("Analyze this sequence of images and describe the progression or story");

        for (Resource image : images) {
            builder.media(MimeTypeUtils.IMAGE_JPEG, image);
        }

        return chatClient.prompt()
            .messages(builder.build())
            .call()
            .content();
    }
}
```

## Document and Text Processing

### Document Image Analysis

```java
@Service
public class DocumentAnalysisService {

    private final ChatClient chatClient;

    public DocumentAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public DocumentExtraction extractDocumentContent(Resource documentImage) {
        String prompt = """
            Extract and structure the content from this document image:
            1. Title/header
            2. Main text content
            3. Tables or structured data
            4. Key information or highlights
            5. Document type
            6. Any forms or fields
            """;

        return chatClient.prompt()
            .user(u -> u.text(prompt)
                       .media(MimeTypeUtils.IMAGE_JPEG, documentImage))
            .call()
            .entity(DocumentExtraction.class);
    }

    public String extractTextFromImage(Resource imageResource) {
        return chatClient.prompt()
            .user(u -> u.text("Extract all text content from this image")
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }
}

public record DocumentExtraction(
    String title,
    String mainContent,
    List<String> tables,
    List<String> keyInformation,
    String documentType,
    List<String> forms
) {}
```

### Chart and Graph Analysis

```java
@Service
public class ChartAnalysisService {

    private final ChatClient chatClient;

    public ChartAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public ChartAnalysis analyzeChart(Resource chartImage) {
        String prompt = """
            Analyze this chart or graph and provide:
            1. Chart type (bar, line, pie, etc.)
            2. Title and axis labels
            3. Key data points and trends
            4. Main insights or conclusions
            5. Data range and scale
            """;

        return chatClient.prompt()
            .user(u -> u.text(prompt)
                       .media(MimeTypeUtils.IMAGE_JPEG, chartImage))
            .call()
            .entity(ChartAnalysis.class);
    }
}

public record ChartAnalysis(
    String chartType,
    String title,
    List<String> axisLabels,
    List<String> keyDataPoints,
    String insights,
    String dataRange
) {}
```

## Mixed Media Processing

### Image and Text Context

```java
@Service
public class ContextualAnalysisService {

    private final ChatClient chatClient;

    public ContextualAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String analyzeImageWithContext(Resource imageResource, String context) {
        return chatClient.prompt()
            .user(u -> u.text("Given this context: '{context}', analyze the image and explain how it relates")
                       .param("context", context)
                       .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
            .call()
            .content();
    }

    public ProductAnalysis analyzeProductImage(Resource productImage, String productDescription) {
        String prompt = """
            Analyze this product image along with the description: {description}

            Provide:
            1. Visual quality assessment
            2. How well the image matches the description
            3. Missing visual elements
            4. Suggested improvements
            5. Marketing appeal rating (1-10)
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

## REST API Integration

### File Upload and Analysis

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
            @RequestParam(value = "prompt", defaultValue = "Analyze this image") String prompt) {

        try {
            // Convert MultipartFile to Resource
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

## Best Practices

### Resource Management

```java
@Service
public class ResourceManagementService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public void validateResource(Resource resource) throws IOException {
        if (resource.contentLength() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum limit");
        }

        if (!resource.exists()) {
            throw new IllegalArgumentException("Resource does not exist");
        }
    }

    public Resource optimizeImage(Resource imageResource) throws IOException {
        // Implement image optimization logic
        // Resize, compress, or convert format as needed
        return imageResource;
    }
}
```

### Error Handling

```java
@Service
public class SafeMultiModalService {

    private final ChatClient chatClient;
    private final ResourceManagementService resourceManager;

    public Optional<String> safeAnalyzeImage(Resource imageResource) {
        try {
            resourceManager.validateResource(imageResource);

            String result = chatClient.prompt()
                .user(u -> u.text("Analyze this image")
                           .media(MimeTypeUtils.IMAGE_JPEG, imageResource))
                .call()
                .content();

            return Optional.of(result);
        } catch (Exception e) {
            logger.warn("Failed to analyze image: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
```

## Next Steps

- Learn about [Tool Calling](../tool-calling/) for function integration
- Explore [Chat Memory](../chat-memory/) for conversation context
- Check out [Structured Output](../structured-output/) for formatted responses
spring.ai.multimodal.image.max-size=10MB
```

### Audio Processing Configuration

```properties
# Audio processing configuration
spring.ai.multimodal.audio.supported-formats=wav,mp3,m4a
spring.ai.multimodal.audio.max-duration=300s
spring.ai.multimodal.audio.max-size=50MB
```

## Best Practices

### 1. Image Preprocessing
- Ensure image clarity
- Control image size
- Choose appropriate formats

### 2. Prompt Optimization
- Clearly specify task types
- Provide necessary context
- Use structured output formats

### 3. Error Handling
- Validate input formats
- Handle network exceptions
- Provide friendly error messages

### 4. Performance Optimization
- Image compression
- Batch processing
- Result caching

## Common Use Cases

### 1. Intelligent Customer Service
- Image problem identification
- Voice customer service
- Multimedia content understanding

### 2. Content Moderation
- Image content detection
- Audio content analysis
- Multimodal content classification

### 3. Educational Applications
- Homework grading
- Voice assessment
- Multimedia learning material analysis

### 4. E-commerce Applications
- Product image analysis
- User review audio processing
- Multimedia search

## Next Steps

- [Learn about Tool Calling](/docs/1.0.0.3/single-agent/tool-calling/)
- [Explore RAG Features](/docs/1.0.0.3/single-agent/rag/)
- [Learn Multi-Agent Systems](/docs/1.0.0.3/multi-agent/agents/)
