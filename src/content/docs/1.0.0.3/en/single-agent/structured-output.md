---
title: Structured Output
keywords: ["Spring AI", "Structured Output", "JSON", "Object Mapping", "Data Conversion"]
description: "Learn how to convert AI model outputs into structured Java objects using Spring AI's structured output capabilities."
---

# Structured Output

*This content is referenced from Spring AI documentation*

Structured Output is a powerful feature in Spring AI that allows you to convert AI model text responses into structured Java objects. This capability is essential for building robust AI applications that need to process and manipulate AI-generated data programmatically.

## Overview

The Structured Output Converter is a key component in Spring AI that transforms the AI model's text output into structured data formats. This feature enables developers to work with strongly-typed Java objects instead of raw text responses.

The converter works by:
1. Providing format instructions to the AI model
2. Parsing the model's response
3. Converting the response into the desired Java type

## Core Concepts

### OutputConverter Interface

The `OutputConverter` interface is the foundation of structured output in Spring AI:

```java
public interface OutputConverter<T> {
    
    T convert(String text);
    
    String getFormat();
}
```

- `convert(String text)`: Converts the AI model's text response into the target type
- `getFormat()`: Returns format instructions that are appended to the prompt

### BeanOutputConverter

The `BeanOutputConverter` is the most commonly used implementation that converts JSON responses to Java objects:

```java
public class BeanOutputConverter<T> implements OutputConverter<T> {
    
    private Class<T> clazz;
    private ObjectMapper objectMapper;
    
    public BeanOutputConverter(Class<T> clazz) {
        this.clazz = clazz;
        this.objectMapper = new ObjectMapper();
    }
    
    // Implementation details...
}
```

## Basic Usage

### Simple Object Mapping

```java
// Define target class
public record Person(String name, int age, String occupation) {}

// Create converter
BeanOutputConverter<Person> converter = new BeanOutputConverter<>(Person.class);

// Use with ChatClient
Person person = chatClient.prompt()
    .user("Generate a random person's information. " + converter.getFormat())
    .call()
    .entity(converter);

System.out.println("Name: " + person.name());
System.out.println("Age: " + person.age());
System.out.println("Occupation: " + person.occupation());
```

### Using ChatClient's entity() Method

ChatClient provides convenient `entity()` methods that handle the converter creation automatically:

```java
// Direct class mapping
Person person = chatClient.prompt()
    .user("Generate a random person's information")
    .call()
    .entity(Person.class);

// Collection mapping with ParameterizedTypeReference
List<Person> people = chatClient.prompt()
    .user("Generate 3 random people")
    .call()
    .entity(new ParameterizedTypeReference<List<Person>>() {});
```

### Collection Mapping

```java
// Define collection type
public record Movie(String title, int year, String genre) {}

// Map to List
List<Movie> movies = chatClient.prompt()
    .user("Generate 5 popular movies from the 1990s")
    .call()
    .entity(new ParameterizedTypeReference<List<Movie>>() {});

movies.forEach(movie -> 
    System.out.println(movie.title() + " (" + movie.year() + ")")
);
```

### Complex Nested Objects

```java
public record Address(String street, String city, String country) {}

public record Company(String name, Address address, int employees) {}

public record Employee(
    String name,
    String position,
    Company company,
    List<String> skills
) {}

Employee employee = chatClient.prompt()
    .user("Generate detailed information for a software engineer")
    .call()
    .entity(Employee.class);
```

## Advanced Features

### Custom Output Converters

Create custom converters for specific formatting needs:

```java
public class CustomPersonConverter implements OutputConverter<Person> {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public Person convert(String text) {
        try {
            JsonNode node = objectMapper.readTree(text);
            return new Person(
                node.get("name").asText(),
                node.get("age").asInt(),
                node.get("occupation").asText()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse person data", e);
        }
    }
    
    @Override
    public String getFormat() {
        return """
            Please return the response in the following JSON format:
            {
                "name": "person's name",
                "age": person's age as number,
                "occupation": "person's occupation"
            }
            """;
    }
}
```

### ListOutputConverter

For converting responses to lists without using ParameterizedTypeReference:

```java
ListOutputConverter converter = new ListOutputConverter(Person.class);

List<Person> people = chatClient.prompt()
    .user("Generate 3 people. " + converter.getFormat())
    .call()
    .entity(converter);
```

### MapOutputConverter

For converting responses to maps:

```java
MapOutputConverter converter = new MapOutputConverter();

Map<String, Object> result = chatClient.prompt()
    .user("Analyze this text and return key insights. " + converter.getFormat())
    .call()
    .entity(converter);
```

## Integration Patterns

### Service Layer Integration

```java
@Service
@Transactional
public class ProductRecommendationService {
    
    private final ChatClient chatClient;
    private final ProductRepository productRepository;
    
    public ProductRecommendationService(
            ChatClient.Builder builder,
            ProductRepository productRepository) {
        this.chatClient = builder.build();
        this.productRepository = productRepository;
    }
    
    public List<ProductRecommendation> getRecommendations(String userPreferences) {
        List<ProductRecommendation> recommendations = chatClient.prompt()
            .user("Based on preferences: {preferences}, recommend 5 products")
            .param("preferences", userPreferences)
            .call()
            .entity(new ParameterizedTypeReference<List<ProductRecommendation>>() {});
        
        // Validate and save recommendations
        return recommendations.stream()
            .filter(this::isValidRecommendation)
            .map(this::saveRecommendation)
            .collect(Collectors.toList());
    }
    
    private boolean isValidRecommendation(ProductRecommendation rec) {
        return rec.productId() != null && 
               rec.confidence() > 0.5 &&
               productRepository.existsById(rec.productId());
    }
    
    private ProductRecommendation saveRecommendation(ProductRecommendation rec) {
        // Save to database and return
        return productRepository.saveRecommendation(rec);
    }
}

public record ProductRecommendation(
    String productId,
    String reason,
    double confidence,
    List<String> tags
) {}
```

### REST API Integration

```java
@RestController
@RequestMapping("/api/ai")
public class AIController {
    
    private final ChatClient chatClient;
    
    public AIController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
    
    @PostMapping("/analyze-sentiment")
    public ResponseEntity<SentimentAnalysis> analyzeSentiment(@RequestBody TextRequest request) {
        try {
            SentimentAnalysis analysis = chatClient.prompt()
                .user("Analyze sentiment of: {text}")
                .param("text", request.text())
                .call()
                .entity(SentimentAnalysis.class);
            
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new SentimentAnalysis("error", 0.0, "Analysis failed"));
        }
    }
    
    @PostMapping("/extract-entities")
    public ResponseEntity<List<Entity>> extractEntities(@RequestBody TextRequest request) {
        List<Entity> entities = chatClient.prompt()
            .user("Extract named entities from: {text}")
            .param("text", request.text())
            .call()
            .entity(new ParameterizedTypeReference<List<Entity>>() {});
        
        return ResponseEntity.ok(entities);
    }
}

public record TextRequest(String text) {}

public record SentimentAnalysis(
    String sentiment,
    double confidence,
    String explanation
) {}

public record Entity(
    String text,
    String type,
    double confidence
) {}
```

## Best Practices

### Clear Output Format Specification

Always provide clear format instructions:

```java
String formatInstruction = """
    Please return the response in the following JSON format:
    {
        "field1": "description of field1",
        "field2": number_value,
        "field3": ["array", "of", "strings"]
    }
    
    Ensure all fields are present and correctly typed.
    """;

MyObject result = chatClient.prompt()
    .user("Generate data. " + formatInstruction)
    .call()
    .entity(MyObject.class);
```

### Error Handling

Implement robust error handling:

```java
public Optional<MyObject> safeEntityExtraction(String prompt) {
    try {
        MyObject result = chatClient.prompt()
            .user(prompt)
            .call()
            .entity(MyObject.class);
        return Optional.of(result);
    } catch (Exception e) {
        logger.warn("Failed to extract entity: {}", e.getMessage());
        return Optional.empty();
    }
}
```

## Next Steps

- Learn about [Tool Calling](../tool-calling/) for function integration
- Explore [Multimodality](../multimodality/) for multi-modal outputs
- Check out [Chat Memory](../chat-memory/) for conversation context
