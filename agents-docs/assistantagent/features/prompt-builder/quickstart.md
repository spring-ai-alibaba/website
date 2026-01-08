# Prompt Builder 模块

## 1. 模块介绍

Prompt Builder 是 Assistant Agent 的动态 Prompt 组装框架，支持在模型调用前根据运行时上下文（评估结果、经验、搜索结果等）动态组装 System Prompt 和消息。

### 核心概念

| 概念 | 说明 |
|------|------|
| `PromptBuilder` | Prompt 构建器接口，实现 `match()` 和 `build()` 方法 |
| `PromptContribution` | Prompt 贡献，包含要注入的系统文本和消息 |
| `PromptManager` | 管理器，编排多个 PromptBuilder 并合并结果 |
| `PromptInjectionInterceptor` | 模型拦截器，将组装的 Prompt 注入到模型请求中 |

### 工作流程

```
ModelRequest（原始请求）
        │
        ▼
┌─────────────────────────────────────────┐
│        PromptInjectionInterceptor       │
│                                         │
│  ┌────────────┐  ┌────────────┐         │
│  │ Builder A  │  │ Builder B  │  ...    │
│  │ priority=1 │  │ priority=2 │         │
│  └─────┬──────┘  └─────┬──────┘         │
│        │               │                │
│        └───────┬───────┘                │
│                ▼                        │
│       PromptContribution（合并）         │
└────────────────┬────────────────────────┘
                 ▼
        ModelRequest（增强后）
                 │
                 ▼
            LLM 调用
```

---

## 2. 快速接入方式

### 步骤 1：实现 PromptBuilder 接口

```java
import com.alibaba.assistant.agent.prompt.PromptBuilder;
import com.alibaba.assistant.agent.prompt.PromptContribution;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelRequest;
import org.springframework.stereotype.Component;

@Component
public class MyPromptBuilder implements PromptBuilder {

    @Override
    public boolean match(ModelRequest request) {
        // 决定是否参与本次 Prompt 组装
        // 可以根据请求内容、状态等条件判断
        return true;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        // 构建 Prompt 贡献
        return PromptContribution.builder()
            .systemTextToAppend("你是一个专业的助手，请用简洁的语言回答问题。")
            .build();
    }

    @Override
    public int priority() {
        // 优先级，数字越小越先执行
        return 100;
    }
}
```

### 步骤 2：自动注入（无需额外配置）

实现 `PromptBuilder` 接口并标注 `@Component`，框架会自动发现并注册。

---

## 3. PromptContribution 构建方式

### 追加系统文本

```java
PromptContribution.builder()
    .systemTextToAppend("追加到 System Prompt 末尾的内容")
    .build();
```

### 前置系统文本

```java
PromptContribution.builder()
    .systemTextToPrepend("前置到 System Prompt 开头的内容")
    .build();
```

### 追加消息

```java
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;

PromptContribution.builder()
    .append(new UserMessage("追加到消息列表末尾"))
    .build();
```

### 前置消息

```java
PromptContribution.builder()
    .prepend(new UserMessage("前置到消息列表开头"))
    .build();
```

### 组合使用

```java
PromptContribution.builder()
    .systemTextToPrepend("角色定义...")
    .systemTextToAppend("行为约束...")
    .prepend(new UserMessage("前置上下文..."))
    .append(new AssistantMessage("参考回答..."))
    .build();
```

---

## 常见用例

### 根据评估结果注入 Prompt

```java
@Component
public class EvaluationBasedPromptBuilder implements PromptBuilder {

    @Override
    public boolean match(ModelRequest request) {
        // 检查是否有评估结果
        return request.getState() != null && 
               request.getState().get("evaluation_result") != null;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        EvaluationResult evalResult = (EvaluationResult) 
            request.getState().get("evaluation_result");
        
        String intentType = evalResult.getCriterionValue("intent_type", String.class);
        
        if ("TOOL_CALL".equals(intentType)) {
            return PromptContribution.builder()
                .systemTextToAppend("用户需要调用工具，请生成正确的工具调用代码。")
                .build();
        }
        
        return PromptContribution.empty();
    }

    @Override
    public int priority() {
        return 50;
    }
}
```

### 根据经验注入 Prompt

```java
@Component  
public class ExperiencePromptBuilder implements PromptBuilder {

    private final ExperienceProvider experienceProvider;

    public ExperiencePromptBuilder(ExperienceProvider experienceProvider) {
        this.experienceProvider = experienceProvider;
    }

    @Override
    public boolean match(ModelRequest request) {
        return true;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        String userInput = extractUserInput(request);
        List<Experience> experiences = experienceProvider.search(userInput, 3);
        
        if (experiences.isEmpty()) {
            return PromptContribution.empty();
        }
        
        StringBuilder sb = new StringBuilder();
        sb.append("\n## 相关经验参考\n");
        for (Experience exp : experiences) {
            sb.append("- ").append(exp.getContent()).append("\n");
        }
        
        return PromptContribution.builder()
            .systemTextToAppend(sb.toString())
            .build();
    }

    @Override
    public int priority() {
        return 80;
    }
}
```

