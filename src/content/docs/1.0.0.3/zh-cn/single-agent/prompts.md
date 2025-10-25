---
title: 提示词 (Prompts)
keywords: ["Spring AI", "Prompts", "提示词", "PromptTemplate", "消息类型"]
description: "学习 Spring AI 中的提示词工程，包括提示词模板、变量替换、角色管理和最佳实践。"
---

# 提示词 (Prompts)

*本内容参考自 Spring AI 官方文档*

提示词是指导 AI 模型生成特定输出的输入。这些提示词的设计和措辞显著影响模型的响应。

在 Spring AI 中与 AI 模型交互的最低级别，处理提示词在某种程度上类似于管理 Spring MVC 中的"视图"。这涉及创建包含动态内容占位符的大量文本。然后根据用户请求或应用程序中的其他代码替换这些占位符。另一个类比是包含某些表达式占位符的 SQL 语句。

随着 Spring AI 的发展，它将引入与 AI 模型交互的更高级别抽象。本节中描述的基础类在角色和功能方面可以比作 JDBC。例如，ChatModel 类类似于 JDK 中的核心 JDBC 库。ChatClient 类可以比作 JdbcClient，构建在 ChatModel 之上，通过 Advisor 提供更高级的构造，以考虑与模型的过去交互，用额外的上下文文档增强提示词，并引入代理行为。

在 AI 领域中，提示词的结构随着时间的推移而演变。最初，提示词是简单的字符串。随着时间的推移，它们发展为包含特定输入的占位符，如"USER:"，AI 模型可以识别这些占位符。OpenAI 通过在 AI 模型处理之前将多个消息字符串分类为不同的角色，为提示词引入了更多结构。

## API 概述

### Prompt

通常使用 ChatModel 的 `call()` 方法，该方法接受 Prompt 实例并返回 ChatResponse。

Prompt 类充当有组织的 Message 对象系列和请求 ChatOptions 的容器。每个 Message 都体现了提示词中的独特角色，在内容和意图上有所不同。这些角色可以包含各种元素，从用户查询到 AI 生成的响应到相关背景信息。这种安排使得与 AI 模型的复杂和详细交互成为可能，因为提示词是由多个消息构建的，每个消息都被分配了在对话中发挥的特定角色。

以下是 Prompt 类的截断版本，为简洁起见省略了构造函数和实用方法：

```java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions chatOptions;
}
```

### Message

Message 接口封装了提示词文本内容、元数据属性集合和称为 MessageType 的分类。

接口定义如下：

```java
public interface Content {

	String getContent();

	Map<String, Object> getMetadata();
}

public interface Message extends Content {

	MessageType getMessageType();
}
```

多模态消息类型还实现了 MediaContent 接口，提供 Media 内容对象列表。

```java
public interface MediaContent extends Content {

	Collection<Media> getMedia();

}
```

Message 接口的各种实现对应于 AI 模型可以处理的不同类别的消息。模型根据对话角色区分消息类别。

> **注意**：这些角色由 MessageType 有效映射，如下所述。

### 角色

每个消息都被分配一个特定的角色。这些角色对消息进行分类，为 AI 模型澄清提示词每个部分的上下文和目的。这种结构化方法增强了与 AI 通信的细致性和有效性，因为提示词的每个部分在交互中都发挥着独特和明确的作用。

主要角色包括：

- **System Role**：指导 AI 的行为和响应风格，为 AI 如何解释和回复输入设置参数或规则。这类似于在开始对话之前向 AI 提供指令。
- **User Role**：代表用户的输入——他们对 AI 的问题、命令或陈述。这个角色是基础的，因为它构成了 AI 响应的基础。
- **Assistant Role**：AI 对用户输入的响应。不仅仅是答案或反应，它对于维持对话流程至关重要。通过跟踪 AI 的先前响应（其"Assistant Role"消息），系统确保连贯和上下文相关的交互。Assistant 消息也可能包含函数工具调用请求信息。这就像 AI 中的一个特殊功能，在需要时用于执行特定功能，如计算、获取数据或除了对话之外的其他任务。
- **Tool/Function Role**：Tool/Function Role 专注于响应工具调用 Assistant 消息返回附加信息。

角色在 Spring AI 中表示为枚举，如下所示：

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

Spring AI 中提示词模板化的关键组件是 PromptTemplate 类，旨在促进创建结构化提示词，然后将其发送到 AI 模型进行处理。

```java
public class PromptTemplate implements PromptTemplateActions, PromptTemplateMessageActions {

    // 稍后讨论的其他方法
}
```

此类使用 TemplateRenderer API 来渲染模板。默认情况下，Spring AI 使用 StTemplateRenderer 实现，它基于 Terence Parr 开发的开源 StringTemplate 引擎。模板变量由 `{}` 语法标识，但您也可以配置分隔符以使用其他语法。

```java
public interface TemplateRenderer extends BiFunction<String, Map<String, Object>, String> {

	@Override
	String apply(String template, Map<String, Object> variables);

}
```

Spring AI 使用 TemplateRenderer 接口来处理变量到模板字符串的实际替换。默认实现使用 [StringTemplate]。如果您需要自定义逻辑，可以提供自己的 TemplateRenderer 实现。对于不需要模板渲染的场景（例如，模板字符串已经完整），您可以使用提供的 NoOpTemplateRenderer。

### 使用带有 '<' 和 '>' 分隔符的自定义 StringTemplate 渲染器示例

```java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            告诉我 5 部由 <composer> 作曲的电影名称。
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "约翰·威廉姆斯"));
```

此类实现的接口支持提示词创建的不同方面：

- PromptTemplateStringActions 专注于创建和渲染提示词字符串，代表最基本的提示词生成形式。
- PromptTemplateMessageActions 专为通过生成和操作 Message 对象进行提示词创建而定制。
- PromptTemplateActions 旨在返回 Prompt 对象，该对象可以传递给 ChatModel 以生成响应。

虽然这些接口在许多项目中可能不会被广泛使用，但它们展示了提示词创建的不同方法。

实现的接口包括：

```java
public interface PromptTemplateStringActions {

	String render();

	String render(Map<String, Object> model);

}
```

方法 `String render()`：将提示词模板渲染为最终字符串格式，无需外部输入，适用于没有占位符或动态内容的模板。

方法 `String render(Map<String, Object> model)`：增强渲染功能以包含动态内容。它使用 Map<String, Object>，其中映射键是提示词模板中的占位符名称，值是要插入的动态内容。

```java
public interface PromptTemplateMessageActions {

	Message createMessage();

    Message createMessage(List<Media> mediaList);

	Message createMessage(Map<String, Object> model);

}
```

方法 `Message createMessage()`：创建不带附加数据的 Message 对象，用于静态或预定义的消息内容。

方法 `Message createMessage(List<Media> mediaList)`：创建带有静态文本和媒体内容的 Message 对象。

方法 `Message createMessage(Map<String, Object> model)`：扩展消息创建以集成动态内容，接受 Map<String, Object>，其中每个条目代表消息模板中的占位符及其对应的动态值。

```java
public interface PromptTemplateActions extends PromptTemplateStringActions {

	Prompt create();

	Prompt create(ChatOptions modelOptions);

	Prompt create(Map<String, Object> model);

	Prompt create(Map<String, Object> model, ChatOptions modelOptions);

}
```

方法 `Prompt create()`：生成不带外部数据输入的 Prompt 对象，适用于静态或预定义的提示词。

方法 `Prompt create(ChatOptions modelOptions)`：生成不带外部数据输入但带有聊天请求特定选项的 Prompt 对象。

方法 `Prompt create(Map<String, Object> model)`：扩展提示词创建功能以包含动态内容，接受 Map<String, Object>，其中每个映射条目是提示词模板中的占位符及其关联的动态值。

方法 `Prompt create(Map<String, Object> model, ChatOptions modelOptions)`：扩展提示词创建功能以包含动态内容，接受 Map<String, Object>，其中每个映射条目是提示词模板中的占位符及其关联的动态值，以及聊天请求的特定选项。

```java
// 创建提示词模板
String templateText = """
    你是一个{role}，专门帮助用户解决{domain}相关的问题。
    请用{style}的方式回答以下问题：
    
    问题：{question}
    """;

PromptTemplate template = new PromptTemplate(templateText);

// 使用模板
Map<String, Object> variables = Map.of(
    "role", "技术专家",
    "domain", "Spring 框架",
    "style", "详细且易懂",
    "question", "什么是依赖注入？"
);

Prompt prompt = template.create(variables);
String response = chatClient.prompt(prompt).call().content();
```

### 2. 系统提示词模板

```java
// 专门的系统提示词模板
SystemPromptTemplate systemTemplate = new SystemPromptTemplate("""
    你是一个{expertise}领域的专家，拥有{years}年的经验。
    你的回答风格是{style}，请始终保持{tone}的语调。
    
    核心原则：
    1. 准确性优先
    2. 简洁明了
    3. 实用性强
    """);

Map<String, Object> systemVars = Map.of(
    "expertise", "人工智能",
    "years", 10,
    "style", "专业严谨",
    "tone", "友好"
);

Message systemMessage = systemTemplate.createMessage(systemVars);
```

### 3. 文件模板管理

将提示词模板存储在文件中，便于管理和版本控制：

```java
// 从文件加载模板
@Component
public class PromptTemplateManager {
    
    @Value("classpath:prompts/expert-system.st")
    private Resource expertSystemTemplate;
    
    @Value("classpath:prompts/code-review.st")
    private Resource codeReviewTemplate;
    
    public String getExpertResponse(String question, String domain) {
        PromptTemplate template = new PromptTemplate(expertSystemTemplate);
        
        Map<String, Object> variables = Map.of(
            "domain", domain,
            "question", question,
            "current_date", LocalDate.now().toString()
        );
        
        return chatClient.prompt(template.create(variables))
            .call()
            .content();
    }
}
```

**expert-system.st 文件内容：**
```text
你是一个{domain}领域的专家顾问。

当前日期：{current_date}

请基于你的专业知识回答以下问题：
{question}

回答要求：
1. 准确专业
2. 结构清晰
3. 包含实际案例
4. 提供可行建议
```

## 动态提示词管理

### 1. 基于 Nacos 的动态提示词

Spring AI Alibaba 支持基于 Nacos 的动态提示词管理，可以在运行时动态更新提示词：

```yaml
# application.yml
spring:
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

**Nacos 配置示例（Data ID: spring.ai.alibaba.configurable.prompt）：**
```json
[
  {
    "name": "expert-consultant",
    "template": "你是一个{domain}专家，请回答：{question}",
    "model": {
      "domain": "技术",
      "style": "专业"
    }
  },
  {
    "name": "creative-writer",
    "template": "你是一个创意写作专家，请以{style}的风格创作关于{topic}的内容",
    "model": {
      "style": "幽默",
      "length": "简短"
    }
  }
]
```

### 2. 使用动态提示词

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

## 高级提示词技巧

### 1. 角色扮演提示词

```java
public class RolePlayingPrompts {
    
    public static final String TECHNICAL_INTERVIEWER = """
        你是一位资深的{technology}技术面试官，拥有{years}年的行业经验。
        
        面试风格：
        - 专业严谨，但不失友好
        - 注重实际应用能力
        - 会根据候选人回答进行深入追问
        
        请对候选人进行技术面试，问题：{question}
        """;
    
    public static final String CODE_REVIEWER = """
        你是一位经验丰富的代码审查专家，专注于{language}开发。
        
        审查标准：
        1. 代码质量和可读性
        2. 性能和安全性
        3. 最佳实践遵循
        4. 潜在问题识别
        
        请审查以下代码：
        ```{language}
        {code}
        ```
        """;
}
```

### 2. 任务分解提示词

```java
public class TaskDecompositionPrompt {
    
    public static final String PROJECT_PLANNER = """
        你是一个项目管理专家，擅长将复杂任务分解为可执行的步骤。
        
        任务分解原则：
        1. 每个步骤都应该是具体可执行的
        2. 步骤之间有清晰的依赖关系
        3. 包含时间估算和资源需求
        4. 考虑风险和应对措施
        
        请将以下项目分解为详细的执行计划：
        项目描述：{project_description}
        项目目标：{project_goals}
        可用资源：{available_resources}
        时间限制：{time_constraint}
        """;
}
```

### 3. 上下文增强提示词

```java
@Service
public class ContextEnhancedPromptService {
    
    public String generateWithContext(String userQuery, String contextInfo) {
        String enhancedPrompt = """
            基于以下上下文信息回答用户问题：
            
            【上下文信息】
            {context}
            
            【用户问题】
            {question}
            
            【回答要求】
            1. 充分利用上下文信息
            2. 如果上下文不足，明确说明
            3. 提供准确、相关的回答
            4. 必要时引用上下文中的具体信息
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

## 提示词优化策略

### 1. 结构化提示词

```java
public class StructuredPrompts {
    
    public static final String ANALYSIS_TEMPLATE = """
        # 分析任务
        
        ## 背景信息
        {background}
        
        ## 分析目标
        {objective}
        
        ## 数据来源
        {data_source}
        
        ## 分析要求
        1. 数据准确性验证
        2. 趋势分析
        3. 异常识别
        4. 结论和建议
        
        ## 输出格式
        请按照以下格式输出分析结果：
        
        ### 数据概览
        [数据基本情况]
        
        ### 关键发现
        [主要发现点]
        
        ### 趋势分析
        [趋势描述]
        
        ### 建议措施
        [具体建议]
        """;
}
```

### 2. 思维链提示词

```java
public class ChainOfThoughtPrompts {
    
    public static final String PROBLEM_SOLVING = """
        请使用思维链方法解决以下问题：
        
        问题：{problem}
        
        解题步骤：
        1. 问题理解：首先分析问题的核心要求
        2. 信息收集：列出已知条件和约束
        3. 方案设计：提出可能的解决方案
        4. 方案评估：分析各方案的优缺点
        5. 最终决策：选择最佳方案并说明理由
        6. 实施计划：制定具体的执行步骤
        
        请按照以上步骤逐一分析并给出答案。
        """;
}
```

### 3. 少样本学习提示词

```java
public class FewShotPrompts {
    
    public static final String CLASSIFICATION_TEMPLATE = """
        请根据以下示例学习如何分类文本：
        
        示例1：
        文本："这个产品质量很好，值得推荐"
        分类：正面
        
        示例2：
        文本："服务态度差，不会再来了"
        分类：负面
        
        示例3：
        文本："产品还可以，价格合理"
        分类：中性
        
        现在请对以下文本进行分类：
        文本："{text}"
        分类：
        """;
}
```

## 提示词测试和验证

### 1. 提示词测试框架

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

### 2. A/B 测试

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

## 最佳实践

### 1. 提示词设计原则

- **明确性**：指令要清晰明确，避免歧义
- **具体性**：提供具体的要求和示例
- **结构化**：使用清晰的结构组织提示词
- **上下文**：提供足够的背景信息
- **约束性**：明确输出格式和限制条件

### 2. 提示词管理策略

```java
@Configuration
public class PromptManagementConfig {
    
    @Bean
    public PromptTemplateRegistry promptTemplateRegistry() {
        PromptTemplateRegistry registry = new PromptTemplateRegistry();
        
        // 注册常用模板
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

### 3. 性能优化

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
        // 从文件或数据库加载模板
        Resource resource = new ClassPathResource("prompts/" + templateName + ".st");
        return new PromptTemplate(resource);
    }
}
```

## 总结

提示词是 AI 应用的核心，Spring AI Alibaba 提供了完整的提示词管理解决方案。通过合理使用提示词模板、动态提示词管理、结构化设计等技术，可以大大提升 AI 应用的质量和可维护性。

关键要点：
- 使用模板化管理提高提示词的可重用性
- 通过参数化实现提示词的灵活配置
- 利用动态提示词支持运行时更新
- 采用结构化设计提升提示词效果
- 建立测试和验证机制确保质量
- 遵循最佳实践提升开发效率
