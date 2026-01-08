# 评估模块（Evaluation）

## 1. 模块介绍

评估模块是 Assistant Agent 的多维度意图识别框架，通过**评估图（Evaluation Graph）**对用户输入进行多层次特质识别，为后续的 Prompt 组装和 Agent 行为提供决策依据。

### 核心概念

| 概念 | 说明 |
|------|------|
| `EvaluationSuite` | 评估套件，包含一组评估项，定义评估的整体配置 |
| `EvaluationCriterion` | 评估项，单个评估维度，可配置依赖关系 |
| `Evaluator` | 评估器，执行实际评估逻辑（LLM 或规则） |
| `EvaluationContext` | 评估上下文，携带输入数据和运行时信息 |
| `CriterionResult` | 评估结果，包含值、状态、元数据 |

### 评估器类型

- **LLM 评估器（LLMBasedEvaluator）**：通过大模型进行复杂语义判断
- **规则评估器（RuleBasedEvaluator）**：通过 Java 函数执行规则逻辑

### 执行流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────┐
│ EvaluationSuite（评估图）                          │
│   ┌─────────────┐   ┌─────────────┐             │
│   │ Criterion A │   │ Criterion B │  ← Layer 1  │
│   └──────┬──────┘   └──────┬──────┘   (并行)     │
│          │                 │                    │
│          └────────┬────────┘                    │
│                   ▼                             │
│   ┌─────────────────────────────┐               │
│   │ Criterion C (dependsOn A,B) │  ← Layer 2   │
│   └─────────────────────────────┘               │
└─────────────────────────────────────────────────┘
    │
    ▼
EvaluationResult（传递给 PromptBuilder）
```

---

## 2. 快速接入方式

### 步骤 1：配置启用评估模块

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          evaluation:
            enabled: true
            input-routing:
              enabled: true
              suite-id: my_custom_suite
```

### 步骤 2：创建自定义评估套件

```java
import com.alibaba.assistant.agent.evaluation.EvaluationService;
import com.alibaba.assistant.agent.evaluation.builder.EvaluationSuiteBuilder;
import com.alibaba.assistant.agent.evaluation.builder.EvaluationCriterionBuilder;
import com.alibaba.assistant.agent.evaluation.evaluator.EvaluatorRegistry;
import com.alibaba.assistant.agent.evaluation.model.ResultType;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@Component
public class MyEvaluationSuiteConfig {

    private final EvaluationService evaluationService;
    private final EvaluatorRegistry evaluatorRegistry;

    public MyEvaluationSuiteConfig(EvaluationService evaluationService,
                                    EvaluatorRegistry evaluatorRegistry) {
        this.evaluationService = evaluationService;
        this.evaluatorRegistry = evaluatorRegistry;
    }

    @PostConstruct
    public void registerSuites() {
        // 创建评估套件
        var suite = EvaluationSuiteBuilder.create("my_custom_suite", evaluatorRegistry)
            .name("自定义输入评估")
            .description("评估用户输入的意图和属性")
            // 评估项 1：意图分类（LLM）
            .addCriterion(
                EvaluationCriterionBuilder.create("intent_type")
                    .description("判断用户意图类型")
                    .resultType(ResultType.ENUM)
                    .options("QUESTION", "TOOL_CALL", "CHITCHAT")
                    .workingMechanism("分析用户输入，判断属于哪种意图类型")
                    .build()
            )
            // 评估项 2：是否需要工具（规则）
            .addCriterion(
                EvaluationCriterionBuilder.create("needs_tool")
                    .description("判断是否需要调用工具")
                    .resultType(ResultType.BOOLEAN)
                    .evaluatorRef("needs_tool_rule")  // 使用自定义规则评估器
                    .build()
            )
            .build();

        evaluationService.registerSuite(suite);
    }
}
```

### 步骤 3：注册自定义规则评估器

```java
import com.alibaba.assistant.agent.evaluation.evaluator.EvaluatorRegistry;
import com.alibaba.assistant.agent.evaluation.evaluator.RuleBasedEvaluator;
import com.alibaba.assistant.agent.evaluation.model.CriterionResult;
import com.alibaba.assistant.agent.evaluation.model.CriterionStatus;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@Component
public class MyEvaluatorConfig {

    private final EvaluatorRegistry evaluatorRegistry;

    public MyEvaluatorConfig(EvaluatorRegistry evaluatorRegistry) {
        this.evaluatorRegistry = evaluatorRegistry;
    }

    @PostConstruct
    public void registerEvaluators() {
        // 注册规则评估器
        evaluatorRegistry.register(new RuleBasedEvaluator(
            "needs_tool_rule",
            context -> {
                String input = context.getEvaluationContext().getInput();
                CriterionResult result = new CriterionResult();
                result.setStatus(CriterionStatus.SUCCESS);
                
                // 简单规则：包含"查询"、"执行"等关键词则需要工具
                boolean needsTool = input.contains("查询") || 
                                   input.contains("执行") ||
                                   input.contains("调用");
                result.setValue(needsTool);
                return result;
            }
        ));
    }
}
```

### 步骤 4：在 PromptBuilder 中使用评估结果

```java
import com.alibaba.assistant.agent.prompt.builder.PromptBuilder;
import com.alibaba.assistant.agent.prompt.builder.PromptBuilderContext;
import org.springframework.stereotype.Component;

@Component
public class MyPromptBuilder implements PromptBuilder {

    @Override
    public int getOrder() {
        return 100;
    }

    @Override
    public String build(PromptBuilderContext context) {
        // 获取评估结果
        var evalResult = context.getEvaluationResult();
        if (evalResult == null) {
            return "";
        }

        String intentType = evalResult.getCriterionValue("intent_type", String.class);
        Boolean needsTool = evalResult.getCriterionValue("needs_tool", Boolean.class);

        // 根据评估结果动态生成 Prompt 片段
        StringBuilder prompt = new StringBuilder();
        if ("QUESTION".equals(intentType)) {
            prompt.append("用户正在提问，请提供准确的回答。\n");
        }
        if (Boolean.TRUE.equals(needsTool)) {
            prompt.append("请使用合适的工具来完成任务。\n");
        }
        
        return prompt.toString();
    }
}
```

---

## 参考配置

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          evaluation:
            enabled: true           # 总开关
            async: false            # 是否异步执行
            timeout-ms: 5000        # 超时时间
            input-routing:
              enabled: true
              suite-id: input_routing_suite
```

