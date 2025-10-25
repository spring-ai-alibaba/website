---
title: 结构化输出 (Structured Output)
keywords: ["Spring AI", "Structured Output", "JSON", "对象映射", "数据转换"]
description: "学习如何使用 Spring AI 的结构化输出功能将 AI 模型输出转换为结构化的 Java 对象。"
---

# 结构化输出 (Structured Output)

*本内容参考自 Spring AI 官方文档*

结构化输出是 Spring AI 中的一个强大功能，允许您将 AI 模型的文本响应转换为结构化的 Java 对象。这个功能对于构建需要程序化处理和操作 AI 生成数据的健壮 AI 应用程序至关重要。

## 概述

结构化输出转换器是 Spring AI 中的一个关键组件，它将 AI 模型的文本输出转换为结构化数据格式。这个功能使开发者能够使用强类型的 Java 对象而不是原始文本响应。

转换器的工作原理：
1. 向 AI 模型提供格式指令
2. 解析模型的响应
3. 将响应转换为所需的 Java 类型

## 核心概念

### OutputConverter 接口

`OutputConverter` 接口是 Spring AI 中结构化输出的基础：

```java
public interface OutputConverter<T> {
    
    T convert(String text);
    
    String getFormat();
}
```

- `convert(String text)`：将 AI 模型的文本响应转换为目标类型
- `getFormat()`：返回附加到提示词的格式指令

### BeanOutputConverter

`BeanOutputConverter` 是最常用的实现，它将 JSON 响应转换为 Java 对象：

```java
public class BeanOutputConverter<T> implements OutputConverter<T> {
    
    private Class<T> clazz;
    private ObjectMapper objectMapper;
    
    public BeanOutputConverter(Class<T> clazz) {
        this.clazz = clazz;
        this.objectMapper = new ObjectMapper();
    }
    
    // 实现细节...
}
```

## 基本使用

### 简单对象映射

```java
// 定义目标类
public record Person(String name, int age, String occupation) {}

// 创建转换器
BeanOutputConverter<Person> converter = new BeanOutputConverter<>(Person.class);

// 与 ChatClient 一起使用
Person person = chatClient.prompt()
    .user("生成一个随机人物的信息。" + converter.getFormat())
    .call()
    .entity(converter);

System.out.println("姓名：" + person.name());
System.out.println("年龄：" + person.age());
System.out.println("职业：" + person.occupation());
```

### 使用 ChatClient 的 entity() 方法

ChatClient 提供了便捷的 `entity()` 方法，可以自动处理转换器的创建：

```java
// 直接类映射
Person person = chatClient.prompt()
    .user("生成一个随机人物的信息")
    .call()
    .entity(Person.class);

// 使用 ParameterizedTypeReference 进行集合映射
List<Person> people = chatClient.prompt()
    .user("生成 3 个随机人物")
    .call()
    .entity(new ParameterizedTypeReference<List<Person>>() {});
```

### 集合映射

```java
public record Movie(String title, String director, int year, String genre) {}

// 映射到列表
List<Movie> movies = chatClient.prompt()
    .user("推荐 5 部经典科幻电影，包括标题、导演、年份和类型")
    .call()
    .entity(new ParameterizedTypeReference<List<Movie>>() {});

// 映射到 Map
Map<String, Object> movieData = chatClient.prompt()
    .user("提供一部电影的详细信息")
    .call()
    .entity(new ParameterizedTypeReference<Map<String, Object>>() {});
```

## 高级用法

### 复杂对象结构

```java
public record Address(String street, String city, String country) {}

public record Company(String name, String industry, Address address) {}

public record Employee(
    String name,
    int age,
    String position,
    Company company,
    List<String> skills
) {}

Employee employee = chatClient.prompt()
    .user("生成一个软件工程师的完整信息，包括公司和技能")
    .call()
    .entity(Employee.class);
```

### 自定义转换器

```java
public class CustomPersonConverter implements OutputConverter<Person> {
    
    @Override
    public Person convert(String text) {
        // 自定义解析逻辑
        String[] parts = text.split(",");
        return new Person(
            parts[0].trim(),
            Integer.parseInt(parts[1].trim()),
            parts[2].trim()
        );
    }
    
    @Override
    public String getFormat() {
        return "请以逗号分隔的格式返回：姓名,年龄,职业";
    }
}

// 使用自定义转换器
CustomPersonConverter converter = new CustomPersonConverter();
Person person = chatClient.prompt()
    .user("生成一个人物信息。" + converter.getFormat())
    .call()
    .entity(converter);
```

### 枚举支持

```java
public enum Priority {
    LOW, MEDIUM, HIGH, CRITICAL
}

public record Task(String title, String description, Priority priority, LocalDate dueDate) {}

Task task = chatClient.prompt()
    .user("创建一个高优先级的编程任务")
    .call()
    .entity(Task.class);
```

## 错误处理

### 转换异常处理

```java
@Service
public class SafeStructuredOutputService {
    
    private final ChatClient chatClient;
    
    public SafeStructuredOutputService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
    
    public Optional<Person> generatePersonSafely(String prompt) {
        try {
            Person person = chatClient.prompt()
                .user(prompt)
                .call()
                .entity(Person.class);
            return Optional.of(person);
        } catch (Exception e) {
            logger.warn("转换失败：{}", e.getMessage());
            return Optional.empty();
        }
    }
    
    public Person generatePersonWithRetry(String prompt, int maxRetries) {
        for (int i = 0; i < maxRetries; i++) {
            try {
                return chatClient.prompt()
                    .user(prompt + " 请确保返回有效的 JSON 格式。")
                    .call()
                    .entity(Person.class);
            } catch (Exception e) {
                if (i == maxRetries - 1) {
                    throw new RuntimeException("转换失败，已重试 " + maxRetries + " 次", e);
                }
                logger.warn("第 {} 次尝试失败，正在重试...", i + 1);
            }
        }
        throw new RuntimeException("不应该到达这里");
    }
}
```

### 验证和清理

```java
public record ValidatedPerson(
    @JsonProperty("name") String name,
    @JsonProperty("age") int age,
    @JsonProperty("occupation") String occupation
) {
    public ValidatedPerson {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("姓名不能为空");
        }
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("年龄必须在 0-150 之间");
        }
        if (occupation == null || occupation.trim().isEmpty()) {
            throw new IllegalArgumentException("职业不能为空");
        }
    }
}
```

## 最佳实践

### 1. 明确的提示词

```java
public String generateStructuredPrompt(String basePrompt, Class<?> targetClass) {
    return basePrompt + 
           "\n\n请以 JSON 格式返回，确保字段名称与以下结构匹配：" +
           getClassStructure(targetClass);
}

private String getClassStructure(Class<?> clazz) {
    // 生成类结构描述
    return "{ \"name\": \"字符串\", \"age\": \"数字\", \"occupation\": \"字符串\" }";
}
```

### 2. 类型安全

```java
public <T> T convertSafely(String prompt, Class<T> targetClass) {
    return chatClient.prompt()
        .user(prompt + " 返回格式：" + getJsonSchema(targetClass))
        .call()
        .entity(targetClass);
}
```

### 3. 性能优化

```java
@Service
public class CachedStructuredOutputService {
    
    private final Cache<String, Object> responseCache;
    
    @Cacheable(value = "structured-responses", key = "#prompt + #targetClass.name")
    public <T> T getCachedResponse(String prompt, Class<T> targetClass) {
        return chatClient.prompt()
            .user(prompt)
            .call()
            .entity(targetClass);
    }
}
```

## 下一步

- 学习 [Tool Calling](../tool-calling/) 进行函数集成
- 探索 [Multimodality](../multimodality/) 处理多模态内容
- 查看 [Chat Memory](../chat-memory/) 进行对话上下文管理
