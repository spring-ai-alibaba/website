---
title: Prompts
keywords: ["Spring AI", "Prompts", "Prompt Templates", "PromptTemplate", "Message Types"]
description: "Learn about prompt engineering in Spring AI, including prompt templates, variable substitution, role management, and best practices."
---

# Prompts

*This content is referenced from Spring AI documentation*

Prompts are the inputs that guide an AI model to generate specific outputs. The design and phrasing of these prompts significantly influence the model's responses.

At the lowest level of interaction with AI models in Spring AI, handling prompts in Spring AI is somewhat similar to managing the "View" in Spring MVC. This involves creating extensive text with placeholders for dynamic content. These placeholders are then replaced based on user requests or other code in the application. Another analogy is a SQL statement that contain placeholders for certain expressions.

As Spring AI evolves, it will introduce higher levels of abstraction for interacting with AI models. The foundational classes described in this section can be likened to JDBC in terms of their role and functionality. The ChatModel class, for instance, is analogous to the core JDBC library in the JDK. The ChatClient class can be likened to the JdbcClient, built on top of ChatModel and providing more advanced constructs via Advisor to consider past interactions with the model, augment the prompt with additional contextual documents, and introduce agentic behavior.

The structure of prompts has evolved over time within the AI field. Initially, prompts were simple strings. Over time, they grew to include placeholders for specific inputs, like "USER:", which the AI model recognizes. OpenAI have introduced even more structure to prompts by categorizing multiple message strings into distinct roles before they are processed by the AI model.

## API Overview

### Prompt

It is common to use the `call()` method of ChatModel that takes a Prompt instance and returns a ChatResponse.

The Prompt class functions as a container for an organized series of Message objects and a request ChatOptions. Every Message embodies a unique role within the prompt, differing in its content and intent. These roles can encompass a variety of elements, from user inquiries to AI-generated responses to relevant background information. This arrangement enables intricate and detailed interactions with AI models, as the prompt is constructed from multiple messages, each assigned a specific role to play in the dialogue.

Below is a truncated version of the Prompt class, with constructors and utility methods omitted for brevity:

```java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions chatOptions;
}
```

### Message

The Message interface encapsulates a Prompt textual content, a collection of metadata attributes, and a categorization known as MessageType.

The interface is defined as follows:

```java
public interface Content {

	String getContent();

	Map<String, Object> getMetadata();
}

public interface Message extends Content {

	MessageType getMessageType();
}
```

The multimodal message types implement also the MediaContent interface providing a list of Media content objects.

```java
public interface MediaContent extends Content {

	Collection<Media> getMedia();

}
```

Various implementations of the Message interface correspond to different categories of messages that an AI model can process. The Models distinguish between message categories based on conversational roles.

> **Note**: These roles are effectively mapped by the MessageType, as discussed below.

### Roles

Each message is assigned a specific role. These roles categorize the messages, clarifying the context and purpose of each segment of the prompt for the AI model. This structured approach enhances the nuance and effectiveness of communication with the AI, as each part of the prompt plays a distinct and defined role in the interaction.

The primary roles are:

- **System Role**: Guides the AI's behavior and response style, setting parameters or rules for how the AI interprets and replies to the input. It's akin to providing instructions to the AI before initiating a conversation.
- **User Role**: Represents the user's input – their questions, commands, or statements to the AI. This role is fundamental as it forms the basis of the AI's response.
- **Assistant Role**: The AI's response to the user's input. More than just an answer or reaction, it's crucial for maintaining the flow of the conversation. By tracking the AI's previous responses (its 'Assistant Role' messages), the system ensures coherent and contextually relevant interactions. The Assistant message may contain Function Tool Call request information as well. It's like a special feature in the AI, used when needed to perform specific functions such as calculations, fetching data, or other tasks beyond just talking.
- **Tool/Function Role**: The Tool/Function Role focuses on returning additional information in response to Tool Call Assistant Messages.

Roles are represented as an enumeration in Spring AI as shown below

```java
public enum MessageType {

	USER("user"),

	ASSISTANT("assistant"),

	SYSTEM("system"),

	TOOL("tool");

    ...
}
```

## PromptTemplate

A key component for prompt templating in Spring AI is the PromptTemplate class, designed to facilitate the creation of structured prompts that are then sent to the AI model for processing

```java
public class PromptTemplate implements PromptTemplateActions, PromptTemplateMessageActions {

    // Other methods to be discussed later
}
```

This class uses the TemplateRenderer API to render templates. By default, Spring AI uses the StTemplateRenderer implementation, which is based on the open-source StringTemplate engine developed by Terence Parr. Template variables are identified by the `{}` syntax, but you can configure the delimiters to use other syntax as well.

```java
public interface TemplateRenderer extends BiFunction<String, Map<String, Object>, String> {

	@Override
	String apply(String template, Map<String, Object> variables);

}
```

Spring AI uses the TemplateRenderer interface to handle the actual substitution of variables into the template string. The default implementation uses [StringTemplate]. You can provide your own implementation of TemplateRenderer if you need custom logic. For scenarios where no template rendering is required (e.g., the template string is already complete), you can use the provided NoOpTemplateRenderer.

### Example using a custom StringTemplate renderer with '<' and '>' delimiters

```java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            Tell me the names of 5 movies whose soundtrack was composed by <composer>.
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "John Williams"));
```

The interfaces implemented by this class support different aspects of prompt creation:

- PromptTemplateStringActions focuses on creating and rendering prompt strings, representing the most basic form of prompt generation.
- PromptTemplateMessageActions is tailored for prompt creation through the generation and manipulation of Message objects.
- PromptTemplateActions is designed to return the Prompt object, which can be passed to ChatModel for generating a response.

While these interfaces might not be used extensively in many projects, they show the different approaches to prompt creation.

The implemented interfaces are

```java
public interface PromptTemplateStringActions {

	String render();

	String render(Map<String, Object> model);

}
```

The method `String render()`: Renders a prompt template into a final string format without external input, suitable for templates without placeholders or dynamic content.

The method `String render(Map<String, Object> model)`: Enhances rendering functionality to include dynamic content. It uses a Map<String, Object> where map keys are placeholder names in the prompt template, and values are the dynamic content to be inserted.

```java
public interface PromptTemplateMessageActions {

	Message createMessage();

    Message createMessage(List<Media> mediaList);

	Message createMessage(Map<String, Object> model);

}
```

The method `Message createMessage()`: Creates a Message object without additional data, used for static or predefined message content.

The method `Message createMessage(List<Media> mediaList)`: Creates a Message object with static textual and media content.

The method `Message createMessage(Map<String, Object> model)`: Extends message creation to integrate dynamic content, accepting a Map<String, Object> where each entry represents a placeholder in the message template and its corresponding dynamic value.

```java
public interface PromptTemplateActions extends PromptTemplateStringActions {

	Prompt create();

	Prompt create(ChatOptions modelOptions);

	Prompt create(Map<String, Object> model);

	Prompt create(Map<String, Object> model, ChatOptions modelOptions);

}
```

The method `Prompt create()`: Generates a Prompt object without external data inputs, ideal for static or predefined prompts.

The method `Prompt create(ChatOptions modelOptions)`: Generates a Prompt object without external data inputs and with specific options for the chat request.

The method `Prompt create(Map<String, Object> model)`: Expands prompt creation capabilities to include dynamic content, taking a Map<String, Object> where each map entry is a placeholder in the prompt template and its associated dynamic value.

The method `Prompt create(Map<String, Object> model, ChatOptions modelOptions)`: Expands prompt creation capabilities to include dynamic content, taking a Map<String, Object> where each map entry is a placeholder in the prompt template and its associated dynamic value, and specific options for the chat request.

## Examples

### Basic PromptTemplate Usage

Here's a simple example of using PromptTemplate:

```java
PromptTemplate promptTemplate = new PromptTemplate("Tell me a {adjective} joke about {topic}.");
Prompt prompt = promptTemplate.create(Map.of("adjective", "funny", "topic", "cats"));
```

### System Message Template

You can create system message templates to define the AI's behavior:

```java
String systemText = """
    You are a helpful AI assistant that helps people find information.
    Your name is {name}
    You should reply to the user's request with your name and also in the style of a {voice}.
    """;

SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemText);
Message systemMessage = systemPromptTemplate.createMessage(Map.of(
    "name", "Spring AI Assistant",
    "voice", "pirate"
));
```

### User Message Template

Similarly, you can create user message templates:

```java
String userText = """
    Tell me about three famous pirates from the Golden Age of Piracy and why they did.
    Write at least a sentence for each pirate.
    """;

UserPromptTemplate userPromptTemplate = new UserPromptTemplate(userText);
Message userMessage = userPromptTemplate.createMessage();
```

### Resource-based Templates

You can load templates from external resources:

```java
@Value("classpath:/prompts/system-message.st")
private Resource systemResource;

SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemResource);
Message systemMessage = systemPromptTemplate.createMessage(Map.of(
    "name", "Assistant",
    "voice", "professional"
));
```

### Complete Example

Here's a complete example that demonstrates creating a prompt with both system and user messages:

```java
@Service
public class PromptService {

    private final ChatModel chatModel;

    public PromptService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    public String generateResponse(String topic, String style) {
        // Create system message template
        String systemText = """
            You are a helpful AI assistant.
            Your response style should be {style}.
            Always be informative and engaging.
            """;

        SystemPromptTemplate systemTemplate = new SystemPromptTemplate(systemText);
        Message systemMessage = systemTemplate.createMessage(Map.of("style", style));

        // Create user message template
        String userText = "Tell me about {topic} in an interesting way.";
        UserPromptTemplate userTemplate = new UserPromptTemplate(userText);
        Message userMessage = userTemplate.createMessage(Map.of("topic", topic));

        // Create prompt with both messages
        Prompt prompt = new Prompt(List.of(systemMessage, userMessage));

        // Call the model
        ChatResponse response = chatModel.call(prompt);
        return response.getResult().getOutput().getContent();
    }
}
```

## Best Practices

### Template Organization

Organize your templates in a structured way:

```java
@Component
public class PromptTemplates {

    @Value("classpath:/prompts/system/expert.st")
    private Resource expertSystemTemplate;

    @Value("classpath:/prompts/user/question.st")
    private Resource questionTemplate;

    public SystemPromptTemplate getExpertSystemTemplate() {
        return new SystemPromptTemplate(expertSystemTemplate);
    }

    public UserPromptTemplate getQuestionTemplate() {
        return new UserPromptTemplate(questionTemplate);
    }
}
```

### Parameter Validation

Always validate your template parameters:

```java
public Prompt createPrompt(String topic, String style) {
    if (topic == null || topic.trim().isEmpty()) {
        throw new IllegalArgumentException("Topic cannot be empty");
    }

    if (style == null) {
        style = "professional"; // default value
    }

    Map<String, Object> variables = Map.of(
        "topic", topic,
        "style", style
    );

    return promptTemplate.create(variables);
}
```

### Template Testing

Test your templates to ensure they work correctly:

```java
@Test
public void testPromptTemplate() {
    PromptTemplate template = new PromptTemplate("Tell me about {topic}");
    Prompt prompt = template.create(Map.of("topic", "Spring AI"));

    String expectedContent = "Tell me about Spring AI";
    assertEquals(expectedContent, prompt.getInstructions().get(0).getContent());
}
```

## Integration with ChatClient

The ChatClient provides seamless integration with prompt templates through its fluent API:

### Using Templates with ChatClient

```java
String response = chatClient.prompt()
    .user(u -> u.text("Tell me about {topic} in {style} style")
               .param("topic", "artificial intelligence")
               .param("style", "simple"))
    .call()
    .content();
```

### System Templates with ChatClient

```java
@Configuration
public class ChatClientConfig {

    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
            .defaultSystem("""
                You are {assistantName}, a {expertise} expert.
                Your communication style is {style}.
                Always provide {responseType} responses.
                """)
            .build();
    }
}
```

### Runtime Template Parameters

```java
String response = chatClient.prompt()
    .system(s -> s.param("assistantName", "Spring AI Helper")
                  .param("expertise", "Java development")
                  .param("style", "friendly")
                  .param("responseType", "detailed"))
    .user("How do I configure Spring Boot?")
    .call()
    .content();
```

## Advanced Template Features

### Conditional Content

You can use conditional logic in your templates:

```java
String template = """
    You are a helpful assistant.
    {if(formal)}Please respond in a formal manner.{endif}
    {if(!formal)}Feel free to be casual and friendly.{endif}

    User question: {question}
    """;

PromptTemplate promptTemplate = new PromptTemplate(template);
Prompt prompt = promptTemplate.create(Map.of(
    "formal", true,
    "question", "What is Spring Boot?"
));
```

### Nested Objects

Templates support nested object properties:

```java
public class User {
    private String name;
    private String role;
    private int experience;
    // getters and setters
}

String template = """
    Hello {user.name}!
    As a {user.role} with {user.experience} years of experience,
    please answer: {question}
    """;

User user = new User("John", "Senior Developer", 10);
PromptTemplate promptTemplate = new PromptTemplate(template);
Prompt prompt = promptTemplate.create(Map.of(
    "user", user,
    "question", "What are Spring Boot best practices?"
));
```

### Lists and Iterations

Handle lists in your templates:

```java
String template = """
    Please review the following topics:
    {topics:{topic|
    - {topic}
    }}

    Provide a summary for each.
    """;

List<String> topics = List.of("Spring Boot", "Spring Security", "Spring Data");
PromptTemplate promptTemplate = new PromptTemplate(template);
Prompt prompt = promptTemplate.create(Map.of("topics", topics));
```

## Next Steps

- Learn about [Structured Output](../structured-output/) for formatted responses
- Explore [Tool Calling](../tool-calling/) for function integration
- Check out [Multimodality](../multimodality/) for multi-modal prompts
- Understand [Chat Memory](../chat-memory/) for conversation management
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        namespace: your-namespace
        group: DEFAULT_GROUP
  ai:
    alibaba:
      configurable:
        prompt:
          enabled: true
```

**Nacos Configuration Example (Data ID: spring.ai.alibaba.configurable.prompt):**
```json
[
  {
    "name": "expert-consultant",
    "template": "You are a {domain} expert, please answer: {question}",
    "model": {
      "domain": "technology",
      "style": "professional"
    }
  },
  {
    "name": "creative-writer",
    "template": "You are a creative writing expert, please create content about {topic} in a {style} style",
    "model": {
      "style": "humorous",
      "length": "brief"
    }
  }
]
```

### 2. Using Dynamic Prompts

```java
@Service
public class DynamicPromptService {
    
    private final ConfigurablePromptTemplateFactory promptFactory;
    private final ChatClient chatClient;
    
    public String consultExpert(String domain, String question) {
        ConfigurablePromptTemplate template = promptFactory.getTemplate("expert-consultant");
        
        Map<String, Object> variables = Map.of(
            "domain", domain,
            "question", question
        );
        
        Prompt prompt = template.create(variables);
        return chatClient.prompt(prompt).call().content();
    }
    
    public String createContent(String topic, String style) {
        ConfigurablePromptTemplate template = promptFactory.getTemplate("creative-writer");
        
        Map<String, Object> variables = Map.of(
            "topic", topic,
            "style", style
        );
        
        return chatClient.prompt(template.create(variables))
            .call()
            .content();
    }
}
```

## Advanced Prompt Techniques

### 1. Role-playing Prompts

```java
public class RolePlayingPrompts {
    
    public static final String TECHNICAL_INTERVIEWER = """
        You are a senior {technology} technical interviewer with {years} years of industry experience.
        
        Interview style:
        - Professional and rigorous, yet friendly
        - Focus on practical application skills
        - Ask follow-up questions based on candidate responses
        
        Please conduct a technical interview with the candidate, question: {question}
        """;
    
    public static final String CODE_REVIEWER = """
        You are an experienced code review expert specializing in {language} development.
        
        Review criteria:
        1. Code quality and readability
        2. Performance and security
        3. Best practices compliance
        4. Potential issue identification
        
        Please review the following code:
        ```{language}
        {code}
        ```
        """;
}
```

### 2. Task Decomposition Prompts

```java
public class TaskDecompositionPrompt {
    
    public static final String PROJECT_PLANNER = """
        You are a project management expert skilled at breaking down complex tasks into executable steps.
        
        Task decomposition principles:
        1. Each step should be specific and executable
        2. Clear dependencies between steps
        3. Include time estimates and resource requirements
        4. Consider risks and mitigation measures
        
        Please break down the following project into a detailed execution plan:
        Project description: {project_description}
        Project goals: {project_goals}
        Available resources: {available_resources}
        Time constraints: {time_constraint}
        """;
}
```

### 3. Context-enhanced Prompts

```java
@Service
public class ContextEnhancedPromptService {
    
    public String generateWithContext(String userQuery, String contextInfo) {
        String enhancedPrompt = """
            Answer the user question based on the following context information:
            
            【Context Information】
            {context}
            
            【User Question】
            {question}
            
            【Answer Requirements】
            1. Make full use of context information
            2. Clearly state if context is insufficient
            3. Provide accurate and relevant answers
            4. Reference specific information from context when necessary
            """;
        
        PromptTemplate template = new PromptTemplate(enhancedPrompt);
        Map<String, Object> variables = Map.of(
            "context", contextInfo,
            "question", userQuery
        );
        
        return chatClient.prompt(template.create(variables))
            .call()
            .content();
    }
}
```

## Prompt Optimization Strategies

### 1. Structured Prompts

```java
public class StructuredPrompts {
    
    public static final String ANALYSIS_TEMPLATE = """
        # Analysis Task
        
        ## Background Information
        {background}
        
        ## Analysis Objective
        {objective}
        
        ## Data Source
        {data_source}
        
        ## Analysis Requirements
        1. Data accuracy verification
        2. Trend analysis
        3. Anomaly identification
        4. Conclusions and recommendations
        
        ## Output Format
        Please output analysis results in the following format:
        
        ### Data Overview
        [Basic data situation]
        
        ### Key Findings
        [Main discovery points]
        
        ### Trend Analysis
        [Trend description]
        
        ### Recommended Actions
        [Specific recommendations]
        """;
}
```

### 2. Chain of Thought Prompts

```java
public class ChainOfThoughtPrompts {
    
    public static final String PROBLEM_SOLVING = """
        Please use the chain of thought method to solve the following problem:
        
        Problem: {problem}
        
        Solution steps:
        1. Problem understanding: First analyze the core requirements of the problem
        2. Information gathering: List known conditions and constraints
        3. Solution design: Propose possible solutions
        4. Solution evaluation: Analyze pros and cons of each solution
        5. Final decision: Choose the best solution and explain reasoning
        6. Implementation plan: Develop specific execution steps
        
        Please analyze step by step according to the above steps and provide an answer.
        """;
}
```

### 3. Few-shot Learning Prompts

```java
public class FewShotPrompts {
    
    public static final String CLASSIFICATION_TEMPLATE = """
        Please learn how to classify text based on the following examples:
        
        Example 1:
        Text: "This product quality is very good, worth recommending"
        Classification: Positive
        
        Example 2:
        Text: "Poor service attitude, won't come again"
        Classification: Negative
        
        Example 3:
        Text: "Product is okay, reasonable price"
        Classification: Neutral
        
        Now please classify the following text:
        Text: "{text}"
        Classification:
        """;
}
```

## Prompt Testing and Validation

### 1. Prompt Testing Framework

```java
@Component
public class PromptTestFramework {
    
    private final ChatClient chatClient;
    
    public PromptTestResult testPrompt(String templateName, 
                                     List<Map<String, Object>> testCases,
                                     Function<String, Boolean> validator) {
        PromptTemplate template = loadTemplate(templateName);
        List<TestCase> results = new ArrayList<>();
        
        for (Map<String, Object> testCase : testCases) {
            try {
                Prompt prompt = template.create(testCase);
                String response = chatClient.prompt(prompt).call().content();
                
                boolean isValid = validator.apply(response);
                results.add(new TestCase(testCase, response, isValid));
                
            } catch (Exception e) {
                results.add(new TestCase(testCase, null, false, e.getMessage()));
            }
        }
        
        return new PromptTestResult(templateName, results);
    }
    
    public record TestCase(Map<String, Object> input, 
                          String output, 
                          boolean isValid, 
                          String error) {
        public TestCase(Map<String, Object> input, String output, boolean isValid) {
            this(input, output, isValid, null);
        }
    }
    
    public record PromptTestResult(String templateName, List<TestCase> testCases) {
        public double getSuccessRate() {
            long successCount = testCases.stream()
                .mapToLong(tc -> tc.isValid() ? 1 : 0)
                .sum();
            return (double) successCount / testCases.size();
        }
    }
}
```

### 2. A/B Testing

```java
@Service
public class PromptABTestService {
    
    public ABTestResult comparePrompts(String promptA, String promptB, 
                                     List<Map<String, Object>> testData,
                                     Function<String, Double> scorer) {
        double scoreA = 0.0;
        double scoreB = 0.0;
        
        for (Map<String, Object> data : testData) {
            String responseA = chatClient.prompt(new PromptTemplate(promptA).create(data))
                .call().content();
            String responseB = chatClient.prompt(new PromptTemplate(promptB).create(data))
                .call().content();
            
            scoreA += scorer.apply(responseA);
            scoreB += scorer.apply(responseB);
        }
        
        return new ABTestResult(
            scoreA / testData.size(),
            scoreB / testData.size(),
            scoreB > scoreA ? "B" : "A"
        );
    }
    
    public record ABTestResult(double scoreA, double scoreB, String winner) {}
}
```

## Best Practices

### 1. Prompt Design Principles

- **Clarity**: Instructions should be clear and unambiguous
- **Specificity**: Provide specific requirements and examples
- **Structure**: Use clear structure to organize prompts
- **Context**: Provide sufficient background information
- **Constraints**: Clearly define output format and limitations

### 2. Prompt Management Strategy

```java
@Configuration
public class PromptManagementConfig {
    
    @Bean
    public PromptTemplateRegistry promptTemplateRegistry() {
        PromptTemplateRegistry registry = new PromptTemplateRegistry();
        
        // Register common templates
        registry.register("expert-qa", loadTemplate("expert-qa.st"));
        registry.register("code-review", loadTemplate("code-review.st"));
        registry.register("creative-writing", loadTemplate("creative-writing.st"));
        
        return registry;
    }
    
    @Bean
    public PromptVersionManager promptVersionManager() {
        return new PromptVersionManager();
    }
}

public class PromptTemplateRegistry {
    private final Map<String, PromptTemplate> templates = new ConcurrentHashMap<>();
    
    public void register(String name, PromptTemplate template) {
        templates.put(name, template);
    }
    
    public PromptTemplate getTemplate(String name) {
        return templates.get(name);
    }
}
```

### 3. Performance Optimization

```java
@Service
public class OptimizedPromptService {
    
    private final LoadingCache<String, PromptTemplate> templateCache;
    
    public OptimizedPromptService() {
        this.templateCache = Caffeine.newBuilder()
            .maximumSize(100)
            .expireAfterWrite(Duration.ofHours(1))
            .build(this::loadTemplate);
    }
    
    public String processWithCachedTemplate(String templateName, 
                                          Map<String, Object> variables) {
        try {
            PromptTemplate template = templateCache.get(templateName);
            Prompt prompt = template.create(variables);
            
            return chatClient.prompt(prompt).call().content();
        } catch (Exception e) {
            throw new RuntimeException("Failed to process prompt", e);
        }
    }
    
    private PromptTemplate loadTemplate(String templateName) {
        // Load template from file or database
        Resource resource = new ClassPathResource("prompts/" + templateName + ".st");
        return new PromptTemplate(resource);
    }
}
```

## Summary

Prompts are the core of AI applications, and Spring AI Alibaba provides a complete prompt management solution. By properly using prompt templates, dynamic prompt management, structured design, and other techniques, you can greatly improve the quality and maintainability of AI applications.

Key Points:
- Use template management to improve prompt reusability
- Achieve flexible prompt configuration through parameterization
- Leverage dynamic prompts for runtime updates
- Use structured design to enhance prompt effectiveness
- Establish testing and validation mechanisms to ensure quality
- Follow best practices to improve development efficiency
