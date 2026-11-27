# 评估模块 - 高级特性

## 1. 评估项依赖关系

评估项可以通过 `dependsOn` 建立依赖关系，形成 DAG（有向无环图）执行：

```java
EvaluationSuiteBuilder.create("complex_suite", evaluatorRegistry)
    // Layer 1：并行执行
    .addCriterion(
        EvaluationCriterionBuilder.create("language")
            .description("识别输入语言")
            .resultType(ResultType.ENUM)
            .options("CHINESE", "ENGLISH", "OTHER")
            .build()
    )
    .addCriterion(
        EvaluationCriterionBuilder.create("sentiment")
            .description("情感分析")
            .resultType(ResultType.ENUM)
            .options("POSITIVE", "NEGATIVE", "NEUTRAL")
            .build()
    )
    // Layer 2：依赖前置结果
    .addCriterion(
        EvaluationCriterionBuilder.create("response_style")
            .description("根据语言和情感决定回复风格")
            .resultType(ResultType.TEXT)
            .dependsOn("language", "sentiment")  // 依赖两个评估项
            .workingMechanism("综合语言和情感分析结果，决定回复风格")
            .build()
    )
    .build();
```

---

## 2. Few-Shot 示例配置

为 LLM 评估器提供示例，提升评估准确性：

```java
EvaluationCriterionBuilder.create("intent_type")
    .description("判断用户意图类型")
    .resultType(ResultType.ENUM)
    .options("QUESTION", "TOOL_CALL", "CHITCHAT")
    .addFewShot(
        "今天天气怎么样？",      // input
        "",                      // context（可选）
        "QUESTION"               // expectedOutput
    )
    .addFewShot(
        "帮我查一下订单状态",
        "",
        "TOOL_CALL"
    )
    .addFewShot(
        "你好呀",
        "",
        "CHITCHAT"
    )
    .build();
```

---

## 3. 推理策略（ReasoningPolicy）

控制 LLM 是否输出推理过程：

```java
import com.alibaba.assistant.agent.evaluation.model.ReasoningPolicy;

EvaluationCriterionBuilder.create("complex_decision")
    .description("复杂业务决策")
    .resultType(ResultType.ENUM)
    .options("APPROVE", "REJECT", "MANUAL_REVIEW")
    .reasoningPolicy(ReasoningPolicy.REQUIRED)  // 要求输出推理过程
    .build();
```

| 策略 | 说明 |
|------|------|
| `NONE` | 不要求推理（默认） |
| `OPTIONAL` | 可选输出推理 |
| `REQUIRED` | 必须输出推理 |

---

## 4. 自定义 Prompt 模板

完全自定义评估 Prompt：

```java
EvaluationCriterionBuilder.create("custom_eval")
    .description("自定义评估")
    .resultType(ResultType.TEXT)
    .promptTemplate("""
        你是一个专业的评估专家。
        
        用户输入：{input}
        历史上下文：{history}
        
        请评估该输入的专业程度，返回评估结果。
        """)
    .contextBindings("input", "history")  // 绑定上下文变量
    .build();
```

---

## 5. 批量评估（Batching）

对多个输入进行批量评估：

```java
import com.alibaba.assistant.agent.evaluation.model.CriterionBatchingConfig;
import com.alibaba.assistant.agent.evaluation.model.EvaluationCriterion;

// 创建批量配置
CriterionBatchingConfig batchingConfig = new CriterionBatchingConfig();
batchingConfig.setEnabled(true);
batchingConfig.setBatchSize(10);                    // 每批最大数量
batchingConfig.setMaxConcurrentBatches(3);          // 并行执行数
batchingConfig.setSourcePath("context.items");      // 数据源路径
batchingConfig.setBatchBindingKey("itemBatch");     // 绑定键名
batchingConfig.setAggregationStrategy("ALL_TRUE");  // 聚合策略：ALL_TRUE 或 ANY_TRUE

// 创建评估项并设置批量配置
EvaluationCriterion criterion = EvaluationCriterionBuilder.create("batch_eval")
    .description("批量内容评估")
    .resultType(ResultType.BOOLEAN)
    .build();

// 通过 EvaluationCriterion 设置批量配置
criterion.setBatchingConfig(batchingConfig);
```

---

## 6. 多评估点配置

在 Agent 执行的不同阶段进行评估：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          evaluation:
            enabled: true
            
            # 输入路由评估（Agent 执行前）
            input-routing:
              enabled: true
              suite-id: input_routing_suite
              
            # 模型输出评估（每次模型调用后）
            model-output:
              enabled: true
              suite-id: model_output_quality_suite
              
            # 代码生成输入评估
            code-generation-input:
              enabled: true
              suite-id: code_generation_input_suite
              
            # 代码执行评估
            code-execution:
              enabled: true
              suite-id: code_execution_suite
              
            # 会话总结评估（Agent 执行后）
            session-summary:
              enabled: true
              suite-id: session_summary_suite
```

---

## 7. 异步评估

对于非关键路径的评估，可以启用异步执行：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          evaluation:
            async: true              # 异步执行
            timeout-ms: 3000         # 超时后跳过
```

```java
// 编程方式获取异步结果
CompletableFuture<EvaluationResult> future = evaluationService.evaluateAsync(suite, context);
future.whenComplete((result, ex) -> {
    if (ex != null) {
        logger.warn("Evaluation failed: {}", ex.getMessage());
    } else {
        processResult(result);
    }
});
```

---

## 8. 评估结果持久化

通过 `EvaluationResultAttacher` 将评估结果附加到 Agent 状态：

```java
@Component
public class CustomResultProcessor {

    private final CodeactEvaluationResultAttacher resultAttacher;

    public CustomResultProcessor(CodeactEvaluationResultAttacher resultAttacher) {
        this.resultAttacher = resultAttacher;
    }

    public void attachResults(OverAllState state, EvaluationResult result) {
        resultAttacher.attach(state, result);
        
        // 结果现在可以在后续节点中访问
        // state.get("evaluation_result") -> EvaluationResult
    }
}
```

---

## 9. 与经验模块集成

评估结果可以触发经验匹配：

```java
// 在评估套件中配置经验评估项
EvaluationCriterionBuilder.create("experience_match")
    .description("匹配相关经验")
    .evaluatorRef("experience_evaluator")  // 使用经验评估器
    .resultType(ResultType.TEXT)
    .build();
```

经验评估器会自动从经验库中检索相关经验，并将匹配的经验 ID 放入评估结果的 metadata 中。

---

## 10. 自定义评估器注册

实现复杂评估逻辑：

```java
import com.alibaba.assistant.agent.evaluation.evaluator.Evaluator;
import com.alibaba.assistant.agent.evaluation.model.*;

public class BusinessRuleEvaluator implements Evaluator {

    private final BusinessService businessService;

    public BusinessRuleEvaluator(BusinessService businessService) {
        this.businessService = businessService;
    }

    @Override
    public String getEvaluatorId() {
        return "business_rule_evaluator";
    }

    @Override
    public CriterionResult evaluate(CriterionExecutionContext context) {
        CriterionResult result = new CriterionResult();
        result.setCriterionName(context.getCriterion().getName());
        result.setStartTimeMillis(System.currentTimeMillis());

        try {
            String input = context.getEvaluationContext().getInput();
            
            // 调用业务服务进行评估
            BusinessDecision decision = businessService.evaluate(input);
            
            result.setStatus(CriterionStatus.SUCCESS);
            result.setValue(decision.getResult());
            result.setReason(decision.getReason());
            
            // 添加元数据
            result.getMetadata().put("confidence", decision.getConfidence());
            result.getMetadata().put("matched_rules", decision.getMatchedRules());
            
        } catch (Exception e) {
            result.setStatus(CriterionStatus.ERROR);
            result.setErrorMessage(e.getMessage());
        } finally {
            result.setEndTimeMillis(System.currentTimeMillis());
        }

        return result;
    }
}
```

注册自定义评估器：

```java
@PostConstruct
public void register() {
    evaluatorRegistry.register(new BusinessRuleEvaluator(businessService));
}
```

