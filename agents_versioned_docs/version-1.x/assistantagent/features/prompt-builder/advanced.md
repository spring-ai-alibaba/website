# Prompt Builder - 高级特性

## 1. 优先级控制

多个 PromptBuilder 按 `priority()` 值从小到大排序执行：

```java
@Component
public class HighPriorityBuilder implements PromptBuilder {
    @Override
    public int priority() {
        return 10;  // 先执行
    }
    // ...
}

@Component
public class LowPriorityBuilder implements PromptBuilder {
    @Override
    public int priority() {
        return 100;  // 后执行
    }
    // ...
}
```

**合并规则**：
- `systemTextToPrepend`：按优先级顺序拼接
- `systemTextToAppend`：按优先级顺序拼接
- `messagesToPrepend`：按优先级顺序依次添加
- `messagesToAppend`：按优先级顺序依次添加

---

## 2. 条件匹配

通过 `match()` 方法实现条件性参与：

```java
@Component
public class ConditionalPromptBuilder implements PromptBuilder {

    @Override
    public boolean match(ModelRequest request) {
        // 只在首次模型调用时参与
        Integer iteration = (Integer) request.getState().get("iteration_count");
        return iteration == null || iteration == 0;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        return PromptContribution.builder()
            .systemTextToPrepend("这是首次对话，请特别注意...")
            .build();
    }
}
```

### 常见匹配条件

```java
// 根据用户输入内容匹配
public boolean match(ModelRequest request) {
    String input = extractUserInput(request);
    return input != null && input.contains("代码");
}

// 根据状态标志匹配
public boolean match(ModelRequest request) {
    Boolean needsTools = (Boolean) request.getState().get("needs_tool");
    return Boolean.TRUE.equals(needsTools);
}

// 根据已有工具匹配
public boolean match(ModelRequest request) {
    return request.getTools() != null && !request.getTools().isEmpty();
}
```

---

## 3. 访问请求上下文

`ModelRequest` 提供丰富的上下文信息：

```java
@Override
public PromptContribution build(ModelRequest request) {
    // 获取 Agent 状态
    OverAllState state = request.getState();
    
    // 获取系统消息
    SystemMessage systemMessage = request.getSystemMessage();
    
    // 获取消息历史
    List<Message> messages = request.getMessages();
    
    // 获取可用工具
    List<ToolCallback> tools = request.getTools();
    
    // 获取模型选项
    ChatOptions options = request.getOptions();
    
    // 构建动态 Prompt
    return PromptContribution.builder()
        .systemTextToAppend("当前可用工具数量: " + (tools != null ? tools.size() : 0))
        .build();
}
```

---

## 4. 系统文本合并模式

`PromptInjectionInterceptor` 支持两种合并模式：

```java
import com.alibaba.assistant.agent.prompt.interceptor.PromptInjectionInterceptor;
import com.alibaba.assistant.agent.prompt.interceptor.PromptInjectionInterceptor.SystemTextMergeMode;

// 追加模式（默认）：原始 SystemPrompt + Prepend + Append
new PromptInjectionInterceptor(promptManager, SystemTextMergeMode.APPEND);

// 前置模式：Prepend + 原始 SystemPrompt + Append
new PromptInjectionInterceptor(promptManager, SystemTextMergeMode.PREPEND);
```

---

## 5. 自定义 PromptManager

手动创建和配置 PromptManager：

```java
@Bean
public PromptManager customPromptManager(List<PromptBuilder> builders) {
    // 过滤或重排序 builders
    List<PromptBuilder> filtered = builders.stream()
        .filter(b -> !(b instanceof DisabledBuilder))
        .collect(Collectors.toList());
    
    return new PromptManager(filtered);
}
```

---

## 6. 动态工具 Prompt

根据运行时条件动态生成工具说明：

```java
@Component
public class DynamicToolPromptBuilder implements PromptBuilder {

    private final CodeactToolRegistry toolRegistry;

    @Override
    public boolean match(ModelRequest request) {
        return true;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        // 获取当前场景需要的工具子集
        List<String> allowedTools = getAllowedTools(request);
        
        StringBuilder sb = new StringBuilder();
        sb.append("\n## 可用工具\n");
        
        for (String toolName : allowedTools) {
            toolRegistry.getTool(toolName).ifPresent(tool -> {
                sb.append("### ").append(tool.getName()).append("\n");
                sb.append(tool.getDescription()).append("\n\n");
            });
        }
        
        return PromptContribution.builder()
            .systemTextToAppend(sb.toString())
            .build();
    }

    @Override
    public int priority() {
        return 200;  // 工具说明放在较后位置
    }
}
```

---

## 7. 消息历史处理

操作消息列表进行上下文管理：

```java
@Component
public class ContextWindowBuilder implements PromptBuilder {

    private static final int MAX_HISTORY_MESSAGES = 20;

    @Override
    public boolean match(ModelRequest request) {
        return request.getMessages() != null && 
               request.getMessages().size() > MAX_HISTORY_MESSAGES;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        // 截断过长的历史，保留摘要
        List<Message> messages = request.getMessages();
        int excess = messages.size() - MAX_HISTORY_MESSAGES;
        
        String summary = summarizeMessages(messages.subList(0, excess));
        
        return PromptContribution.builder()
            .prepend(new UserMessage("[历史摘要] " + summary))
            .build();
    }
}
```

---

## 8. 与评估模块集成

访问评估结果动态构建 Prompt：

```java
@Component
public class EvaluationAwareBuilder implements PromptBuilder {

    @Override
    public PromptContribution build(ModelRequest request) {
        EvaluationResult result = (EvaluationResult) 
            request.getState().get("evaluation_result");
        
        if (result == null) {
            return PromptContribution.empty();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("\n## 输入分析\n");
        
        // 遍历所有评估结果
        for (CriterionResult criterion : result.getCriterionResults()) {
            if (criterion.getStatus() == CriterionStatus.SUCCESS) {
                sb.append("- ").append(criterion.getCriterionName())
                  .append(": ").append(criterion.getValue()).append("\n");
            }
        }
        
        return PromptContribution.builder()
            .systemTextToAppend(sb.toString())
            .build();
    }
}
```

---

## 9. 测试 PromptBuilder

```java
@SpringBootTest
class MyPromptBuilderTest {

    @Autowired
    private MyPromptBuilder builder;

    @Test
    void testBuild() {
        // 构造测试请求
        ModelRequest request = ModelRequest.builder()
            .systemMessage(new SystemMessage("原始系统消息"))
            .messages(List.of(new UserMessage("用户输入")))
            .state(new OverAllState())
            .build();

        // 测试匹配
        assertTrue(builder.match(request));

        // 测试构建
        PromptContribution contribution = builder.build(request);
        assertNotNull(contribution);
        assertNotNull(contribution.systemTextToAppend());
    }
}
```

