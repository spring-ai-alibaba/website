# 学习模块 - 高级特性

## 1. 多种学习触发方式

### Agent 执行后学习

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            online:
              after-agent:
                enabled: true
                learning-types:
                  - experience   # 提取经验
                  - pattern      # 提取模式
                  - error        # 提取错误信息
```

### 模型调用后学习

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            online:
              after-model:
                enabled: true
                learning-types:
                  - prompt_pattern  # 提取 Prompt 模式
```

### 工具执行后学习

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            online:
              tool-interceptor:
                enabled: true
                included-tools:      # 只学习这些工具
                  - search
                  - query_database
                excluded-tools: []   # 排除这些工具
```

---

## 2. 异步学习

避免学习过程阻塞主流程：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            async:
              enabled: true
              core-pool-size: 2
              max-pool-size: 4
              queue-capacity: 100
```

---

## 3. 离线批量学习

处理历史数据进行批量学习：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            offline:
              enabled: true
              tasks:
                - name: daily_learning
                  cron: "0 0 2 * * ?"      # 每天凌晨2点执行
                  source: session_logs
                  learning-types:
                    - experience
                - name: weekly_summary
                  cron: "0 0 3 ? * SUN"    # 每周日凌晨3点
                  source: error_logs
                  learning-types:
                    - error_pattern
```

### 手动触发离线学习

```java
@Component
public class OfflineLearningTrigger {

    private final LearningExecutor learningExecutor;

    public void triggerBatchLearning(List<LearningContext> contexts) {
        for (LearningContext context : contexts) {
            learningExecutor.execute(context);
        }
    }
}
```

---

## 4. 条件学习

在 Extractor 中实现复杂的学习条件：

```java
@Component
public class QualityFilteredExtractor implements LearningExtractor<Experience> {

    @Override
    public boolean shouldLearn(LearningContext context) {
        // 1. 通过 customData 判断执行是否成功
        Object isSuccess = context.getCustomData().get("success");
        if (!Boolean.TRUE.equals(isSuccess)) {
            return false;
        }
        
        // 2. 通过 customData 检查执行时间（可能是简单任务）
        Long durationMs = (Long) context.getCustomData().get("durationMs");
        if (durationMs != null && durationMs < 1000) {
            return false;
        }
        
        // 3. 必须有工具调用（有实际操作）
        if (context.getToolCallRecords() == null || context.getToolCallRecords().isEmpty()) {
            return false;
        }
        
        // 4. 通过 customData 检查输出不能为空
        String output = (String) context.getCustomData().get("output");
        if (output == null || output.isEmpty()) {
            return false;
        }
        
        return true;
    }

    @Override
    public List<Experience> extract(LearningContext context) {
        // 提取高质量经验
        // ...
    }
}
```

---

## 5. 去重策略

避免重复学习相似内容：

```java
@Component
public class DeduplicatedExtractor implements LearningExtractor<Experience> {

    private final ExperienceProvider experienceProvider;

    @Override
    public List<Experience> extract(LearningContext context) {
        List<Experience> extracted = doExtract(context);
        
        // 检查是否已有相似经验
        return extracted.stream()
            .filter(exp -> !hasSimilarExperience(exp))
            .collect(Collectors.toList());
    }

    private boolean hasSimilarExperience(Experience exp) {
        ExperienceQuery query = new ExperienceQuery(exp.getType());
        query.setLimit(5);
        
        ExperienceQueryContext ctx = new ExperienceQueryContext();
        ctx.setUserQuery(exp.getTitle());
        
        List<Experience> existing = experienceProvider.query(query, ctx);
        
        // 使用相似度检测
        for (Experience e : existing) {
            if (calculateSimilarity(e.getContent(), exp.getContent()) > 0.8) {
                return true;
            }
        }
        
        return false;
    }
}
```

---

## 6. 学习记录类型扩展

定义自定义学习记录类型：

```java
// 自定义学习记录
public class ErrorPattern {
    private String errorType;
    private String errorMessage;
    private String solution;
    private int occurrenceCount;
    // ...
}

// 对应的 Extractor
@Component
public class ErrorPatternExtractor implements LearningExtractor<ErrorPattern> {

    @Override
    public String getSupportedLearningType() {
        return "error_pattern";
    }

    @Override
    public Class<ErrorPattern> getRecordType() {
        return ErrorPattern.class;
    }

    @Override
    public List<ErrorPattern> extract(LearningContext context) {
        if (context.getError() == null) {
            return Collections.emptyList();
        }
        
        ErrorPattern pattern = new ErrorPattern();
        pattern.setErrorType(context.getError().getClass().getSimpleName());
        pattern.setErrorMessage(context.getError().getMessage());
        // 从成功的重试中提取解决方案
        pattern.setSolution(extractSolution(context));
        
        return List.of(pattern);
    }
}

// 对应的 Repository
@Component
public class ErrorPatternRepository implements LearningRepository<ErrorPattern> {

    @Override
    public Class<ErrorPattern> getSupportedRecordType() {
        return ErrorPattern.class;
    }

    // ... 实现存储方法
}
```

---

## 7. 学习回调

监听学习过程：

```java
@Component
public class LearningCallback implements LearningEventListener {

    @Override
    public void onLearningStarted(LearningContext context) {
        log.info("LearningCallback#onLearningStarted - reason=开始学习, sessionId={}", 
            context.getSessionId());
    }

    @Override
    public void onLearningCompleted(LearningContext context, List<?> records) {
        log.info("LearningCallback#onLearningCompleted - reason=学习完成, recordCount={}", 
            records.size());
        
        // 发送通知、更新统计等
        metricsService.recordLearning(records.size());
    }

    @Override
    public void onLearningFailed(LearningContext context, Exception e) {
        log.error("LearningCallback#onLearningFailed - reason=学习失败", e);
        
        // 告警处理
        alertService.sendAlert("Learning failed: " + e.getMessage());
    }
}
```

---

## 8. 存储策略

### 内存存储（测试/开发）

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            storage:
              type: memory
              max-records: 1000
```

### Store 存储（生产）

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            storage:
              type: store
              namespace-prefix: learning
```

### 自定义存储

实现 `LearningRepository` 接口连接任意存储系统。

---

## 9. 学习指标监控

```java
@Component
public class LearningMetrics {

    private final MeterRegistry meterRegistry;

    public void recordExtraction(String type, int count) {
        meterRegistry.counter("learning.extraction.count", 
            "type", type).increment(count);
    }

    public void recordLatency(String type, long durationMs) {
        meterRegistry.timer("learning.extraction.latency", 
            "type", type).record(Duration.ofMillis(durationMs));
    }
}
```

---

## 10. 与经验模块集成

学习模块产出的经验自动进入经验库：

```java
@Component
public class ExperienceLearningRepository implements LearningRepository<Experience> {

    private final ExperienceDataInitializer initializer;

    @Override
    public void save(String namespace, String key, Experience record) {
        // 保存到经验库
        initializer.initialize(List.of(record));
    }

    @Override
    public void saveBatch(String namespace, List<Experience> records) {
        initializer.initialize(records);
    }

    @Override
    public Class<Experience> getSupportedRecordType() {
        return Experience.class;
    }
}
```

