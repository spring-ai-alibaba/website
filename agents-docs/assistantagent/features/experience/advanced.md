# 经验模块 - 高级特性

## 1. FastIntent 快速意图

FastIntent 允许经验在满足特定条件时直接执行，跳过完整的 Agent 流程。

### 启用 FastIntent

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            fast-intent-enabled: true
            fast-intent-react-enabled: true
            fast-intent-code-enabled: true
            fast-intent-allowed-tools: []  # 空表示不限制
```

### 配置 FastIntent 经验

```java
Experience exp = new Experience();
exp.setType(ExperienceType.REACT);
exp.setTitle("快速查询天气");

// 配置 FastIntent
FastIntentConfig fastIntent = new FastIntentConfig();
fastIntent.setEnabled(true);
fastIntent.setPriority(100);  // 优先级，数字越大越优先

// 匹配条件：消息以"天气"开头
FastIntentConfig.MatchExpression match = new FastIntentConfig.MatchExpression();
match.setType("message_prefix");
match.setValue("天气");
fastIntent.setMatch(match);

// 设置产物（直接执行的代码）
ExperienceArtifact artifact = new ExperienceArtifact();
artifact.setCode("""
    city = extract_city(user_message)
    result = weather.query(city=city)
    reply.send(text=f"{city}的天气：{result['weather']}")
    """);
exp.setArtifact(artifact);

exp.setFastIntentConfig(fastIntent);
```

### 匹配条件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `message_prefix` | 消息前缀匹配 | `"天气"` → 匹配 "天气怎么样" |
| `message_regex` | 正则表达式匹配 | `".*订单.*状态.*"` |
| `metadata_exists` | 元数据存在检查 | `"user.vip"` |
| `metadata_equals` | 元数据值相等 | `"user.level=gold"` |
| `metadata_in` | 元数据值在列表中 | `"user.role=admin,superadmin"` |
| `state_equals` | 状态值相等 | `"mode=debug"` |

### 复合条件

```java
// AND 条件
FastIntentConfig.MatchExpression allOf = new FastIntentConfig.MatchExpression();
allOf.setAllOf(List.of(condition1, condition2));

// OR 条件
FastIntentConfig.MatchExpression anyOf = new FastIntentConfig.MatchExpression();
anyOf.setAnyOf(List.of(condition1, condition2));

// NOT 条件
FastIntentConfig.MatchExpression not = new FastIntentConfig.MatchExpression();
not.setNot(condition);
```

---

## 2. 经验存储策略

### 内存存储（默认）

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            in-memory:
              enabled: true
              max-total-experiences: 1000
              ttl-seconds: -1  # -1 表示不过期
```

### Store 持久化存储

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            store:
              enabled: true
              namespace-prefix: experience
```

### 自定义 ExperienceProvider

```java
@Component
@Primary
public class VectorExperienceProvider implements ExperienceProvider {

    private final VectorStore vectorStore;

    @Override
    public List<Experience> query(ExperienceQuery query, ExperienceQueryContext context) {
        // 使用向量检索相关经验
        String input = context.getUserInput();
        
        List<Document> docs = vectorStore.similaritySearch(
            SearchRequest.query(input)
                .withTopK(query.getMaxItems())
                .withFilterExpression("type == '" + query.getType() + "'")
        );
        
        return docs.stream()
            .map(this::toExperience)
            .collect(Collectors.toList());
    }
}
```

---

## 3. 经验查询上下文

```java
// 构建查询上下文
ExperienceQueryContext context = ExperienceQueryContext.builder()
    .userInput("如何处理订单超时？")
    .sessionId("session-123")
    .userId("user-456")
    .projectId("project-789")
    .metadata(Map.of(
        "language", "java",
        "framework", "spring-boot"
    ))
    .build();

// 执行查询
ExperienceQuery query = new ExperienceQuery(ExperienceType.CODE);
query.setMaxItems(5);
query.setTags(Set.of("order", "timeout"));

List<Experience> experiences = experienceProvider.query(query, context);
```

---

## 4. 经验注入 Prompt

经验通过 PromptBuilder 自动注入到 Agent 的 System Prompt 中：

```java
@Component
public class ExperiencePromptBuilder implements PromptBuilder {

    private final ExperienceProvider provider;
    private final ExperienceExtensionProperties properties;

    @Override
    public boolean match(ModelRequest request) {
        return properties.isEnabled();
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        String userInput = extractUserInput(request);
        
        ExperienceQueryContext context = ExperienceQueryContext.builder()
            .userInput(userInput)
            .build();
        
        List<Experience> codeExps = provider.queryByType(ExperienceType.CODE, context);
        List<Experience> reactExps = provider.queryByType(ExperienceType.REACT, context);
        
        StringBuilder sb = new StringBuilder();
        
        if (!codeExps.isEmpty()) {
            sb.append("\n## 代码规范参考\n");
            for (Experience exp : codeExps) {
                sb.append("### ").append(exp.getTitle()).append("\n");
                sb.append(exp.getContent()).append("\n\n");
            }
        }
        
        if (!reactExps.isEmpty()) {
            sb.append("\n## 行为策略参考\n");
            for (Experience exp : reactExps) {
                sb.append("### ").append(exp.getTitle()).append("\n");
                sb.append(exp.getContent()).append("\n\n");
            }
        }
        
        return PromptContribution.builder()
            .systemTextToAppend(sb.toString())
            .build();
    }

    @Override
    public int priority() {
        return 50;
    }
}
```

---

## 5. 经验产物（Artifact）

经验可以包含可执行产物，用于 FastIntent 直接执行：

```java
ExperienceArtifact artifact = new ExperienceArtifact();

// Python 代码产物
artifact.setType("python_code");
artifact.setCode("""
    result = tool.execute(param="value")
    reply.send(text=f"执行结果: {result}")
    """);

// 工具调用产物
artifact.setType("tool_call");
artifact.setToolName("send_message");
artifact.setToolArgs(Map.of("text", "固定回复内容"));

experience.setArtifact(artifact);
```

---

## 6. 自定义 FastIntent 匹配器

```java
import com.alibaba.assistant.agent.extension.experience.fastintent.FastIntentConditionMatcher;
import com.alibaba.assistant.agent.extension.experience.fastintent.FastIntentContext;

@Component
public class CustomMatcher implements FastIntentConditionMatcher {

    @Override
    public String getType() {
        return "custom_business";
    }

    @Override
    public boolean matches(String value, FastIntentContext context) {
        // 自定义匹配逻辑
        String userInput = context.getUserMessage();
        Map<String, Object> metadata = context.getMetadata();
        
        // 例如：检查用户是否为 VIP
        Boolean isVip = (Boolean) metadata.get("isVip");
        return Boolean.TRUE.equals(isVip) && userInput.contains(value);
    }
}
```

---

## 7. 经验生命周期管理

```java
@Component
public class ExperienceManager {

    private final ExperienceDataInitializer initializer;

    // 添加经验
    public void addExperience(Experience exp) {
        initializer.initialize(List.of(exp));
    }

    // 批量导入
    public void importFromFile(String filePath) throws Exception {
        List<Experience> experiences = loadFromFile(filePath);
        initializer.initialize(experiences);
    }

    // 清理过期经验（需自定义实现）
    public void cleanupExpired() {
        // 实现清理逻辑
    }
}
```

---

## 8. 经验与评估集成

在评估阶段使用经验进行意图识别：

```java
// 评估套件中配置经验匹配评估项
EvaluationCriterionBuilder.create("experience_match")
    .description("匹配相关经验")
    .evaluatorRef("experience_evaluator")
    .resultType(ResultType.TEXT)
    .build();
```

经验评估器返回匹配的经验 ID，供后续处理使用。

---

## 9. 日志配置

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            logging:
              enabled: true

logging:
  level:
    com.alibaba.assistant.agent.extension.experience: DEBUG
```

