---
title: 模型评估 (Model Evaluation)
description: Spring AI Alibaba 模型评估功能
---

# 模型评估 (Model Evaluation)

模型评估是确保 AI 应用质量的重要环节。Spring AI Alibaba 提供了全面的模型评估框架，帮助开发者评估和优化模型性能。

## 评估类型

### 1. 准确性评估
评估模型回答的准确性和相关性。

### 2. 一致性评估
评估模型在相似输入下的输出一致性。

### 3. 安全性评估
评估模型输出的安全性和合规性。

### 4. 性能评估
评估模型的响应时间和吞吐量。

## 基本使用

### 配置评估器

```java
@Configuration
public class EvaluationConfig {
    
    @Bean
    public RelevancyEvaluator relevancyEvaluator(ChatModel chatModel) {
        return new RelevancyEvaluator(chatModel);
    }
    
    @Bean
    public AccuracyEvaluator accuracyEvaluator(ChatModel chatModel) {
        return new AccuracyEvaluator(chatModel);
    }
    
    @Bean
    public SafetyEvaluator safetyEvaluator(ChatModel chatModel) {
        return new SafetyEvaluator(chatModel);
    }
}
```

### 执行评估

```java
@Service
public class ModelEvaluationService {
    
    @Autowired
    private RelevancyEvaluator relevancyEvaluator;
    
    @Autowired
    private AccuracyEvaluator accuracyEvaluator;
    
    public EvaluationResult evaluateResponse(String question, String response, String expectedAnswer) {
        // 相关性评估
        EvaluationRequest relevancyRequest = new EvaluationRequest(question, response);
        EvaluationResponse relevancyResult = relevancyEvaluator.evaluate(relevancyRequest);
        
        // 准确性评估
        EvaluationRequest accuracyRequest = new EvaluationRequest(question, response, expectedAnswer);
        EvaluationResponse accuracyResult = accuracyEvaluator.evaluate(accuracyRequest);
        
        return EvaluationResult.builder()
            .relevancyScore(relevancyResult.getScore())
            .accuracyScore(accuracyResult.getScore())
            .feedback(relevancyResult.getFeedback())
            .build();
    }
}
```

## 批量评估

### 数据集评估

```java
@Service
public class DatasetEvaluationService {
    
    @Autowired
    private List<Evaluator> evaluators;
    
    public DatasetEvaluationResult evaluateDataset(List<TestCase> testCases) {
        List<EvaluationResult> results = new ArrayList<>();
        
        for (TestCase testCase : testCases) {
            EvaluationResult result = evaluateTestCase(testCase);
            results.add(result);
        }
        
        return DatasetEvaluationResult.builder()
            .totalCases(testCases.size())
            .results(results)
            .averageScore(calculateAverageScore(results))
            .build();
    }
    
    private EvaluationResult evaluateTestCase(TestCase testCase) {
        String response = generateResponse(testCase.getQuestion());
        
        Map<String, Double> scores = new HashMap<>();
        for (Evaluator evaluator : evaluators) {
            EvaluationRequest request = new EvaluationRequest(
                testCase.getQuestion(), 
                response, 
                testCase.getExpectedAnswer()
            );
            EvaluationResponse evalResponse = evaluator.evaluate(request);
            scores.put(evaluator.getName(), evalResponse.getScore());
        }
        
        return EvaluationResult.builder()
            .question(testCase.getQuestion())
            .response(response)
            .expectedAnswer(testCase.getExpectedAnswer())
            .scores(scores)
            .build();
    }
}
```

### 并行评估

```java
@Service
public class ParallelEvaluationService {
    
    @Autowired
    private TaskExecutor taskExecutor;
    
    public CompletableFuture<DatasetEvaluationResult> evaluateDatasetAsync(List<TestCase> testCases) {
        List<CompletableFuture<EvaluationResult>> futures = testCases.stream()
            .map(testCase -> CompletableFuture.supplyAsync(
                () -> evaluateTestCase(testCase), taskExecutor))
            .collect(Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> {
                List<EvaluationResult> results = futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList());
                
                return DatasetEvaluationResult.builder()
                    .results(results)
                    .averageScore(calculateAverageScore(results))
                    .build();
            });
    }
}
```

## 自定义评估器

### 创建自定义评估器

```java
@Component
public class CustomRelevancyEvaluator implements Evaluator {
    
    @Autowired
    private ChatClient chatClient;
    
    @Override
    public String getName() {
        return "custom-relevancy";
    }
    
    @Override
    public EvaluationResponse evaluate(EvaluationRequest request) {
        String prompt = String.format("""
            请评估以下回答与问题的相关性，给出0-1之间的分数：
            
            问题：%s
            回答：%s
            
            请只返回分数（0-1之间的小数）和简短的评价理由。
            格式：分数|理由
            """, request.getQuestion(), request.getResponse());
        
        String result = chatClient.prompt()
            .user(prompt)
            .call()
            .content();
        
        return parseEvaluationResult(result);
    }
    
    private EvaluationResponse parseEvaluationResult(String result) {
        String[] parts = result.split("\\|");
        double score = Double.parseDouble(parts[0].trim());
        String feedback = parts.length > 1 ? parts[1].trim() : "";
        
        return EvaluationResponse.builder()
            .score(score)
            .feedback(feedback)
            .build();
    }
}
```

### 领域特定评估器

```java
@Component
public class MedicalAccuracyEvaluator implements Evaluator {
    
    @Autowired
    private ChatClient chatClient;
    
    @Override
    public EvaluationResponse evaluate(EvaluationRequest request) {
        String prompt = String.format("""
            作为医学专家，请评估以下医学问答的准确性：
            
            问题：%s
            回答：%s
            标准答案：%s
            
            评估标准：
            1. 医学事实的准确性
            2. 专业术语的正确使用
            3. 安全性考虑
            4. 完整性
            
            请给出0-1之间的分数和详细评价。
            """, request.getQuestion(), request.getResponse(), request.getExpectedAnswer());
        
        String result = chatClient.prompt()
            .user(prompt)
            .call()
            .content();
        
        return parseDetailedEvaluationResult(result);
    }
}
```

## A/B 测试

### A/B 测试框架

```java
@Service
public class ABTestingService {
    
    @Autowired
    private ChatClient modelA;
    
    @Autowired
    private ChatClient modelB;
    
    @Autowired
    private List<Evaluator> evaluators;
    
    public ABTestResult runABTest(List<TestCase> testCases) {
        List<ComparisonResult> comparisons = new ArrayList<>();
        
        for (TestCase testCase : testCases) {
            String responseA = modelA.prompt().user(testCase.getQuestion()).call().content();
            String responseB = modelB.prompt().user(testCase.getQuestion()).call().content();
            
            ComparisonResult comparison = compareResponses(
                testCase.getQuestion(), responseA, responseB, testCase.getExpectedAnswer());
            comparisons.add(comparison);
        }
        
        return ABTestResult.builder()
            .comparisons(comparisons)
            .modelAWins(countWins(comparisons, "A"))
            .modelBWins(countWins(comparisons, "B"))
            .ties(countTies(comparisons))
            .build();
    }
    
    private ComparisonResult compareResponses(String question, String responseA, 
                                            String responseB, String expectedAnswer) {
        Map<String, Double> scoresA = evaluateResponse(question, responseA, expectedAnswer);
        Map<String, Double> scoresB = evaluateResponse(question, responseB, expectedAnswer);
        
        double avgScoreA = scoresA.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double avgScoreB = scoresB.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        
        String winner = avgScoreA > avgScoreB ? "A" : (avgScoreB > avgScoreA ? "B" : "TIE");
        
        return ComparisonResult.builder()
            .question(question)
            .responseA(responseA)
            .responseB(responseB)
            .scoresA(scoresA)
            .scoresB(scoresB)
            .winner(winner)
            .build();
    }
}
```

## 评估报告

### 生成评估报告

```java
@Service
public class EvaluationReportService {
    
    public EvaluationReport generateReport(DatasetEvaluationResult result) {
        return EvaluationReport.builder()
            .summary(generateSummary(result))
            .detailedResults(result.getResults())
            .recommendations(generateRecommendations(result))
            .charts(generateCharts(result))
            .build();
    }
    
    private ReportSummary generateSummary(DatasetEvaluationResult result) {
        Map<String, Double> averageScores = calculateAverageScoresByEvaluator(result);
        
        return ReportSummary.builder()
            .totalTestCases(result.getTotalCases())
            .overallScore(result.getAverageScore())
            .averageScoresByEvaluator(averageScores)
            .passRate(calculatePassRate(result))
            .build();
    }
    
    private List<String> generateRecommendations(DatasetEvaluationResult result) {
        List<String> recommendations = new ArrayList<>();
        
        if (result.getAverageScore() < 0.7) {
            recommendations.add("整体性能需要改进，建议优化提示词或调整模型参数");
        }
        
        // 分析具体问题
        List<EvaluationResult> lowScoreResults = result.getResults().stream()
            .filter(r -> r.getAverageScore() < 0.5)
            .collect(Collectors.toList());
        
        if (!lowScoreResults.isEmpty()) {
            recommendations.add("发现 " + lowScoreResults.size() + " 个低分案例，需要重点关注");
        }
        
        return recommendations;
    }
}
```

## 持续评估

### 自动化评估流水线

```java
@Component
@Scheduled(fixedRate = 3600000) // 每小时执行一次
public class ContinuousEvaluationService {
    
    @Autowired
    private DatasetEvaluationService evaluationService;
    
    @Autowired
    private EvaluationReportService reportService;
    
    @Autowired
    private AlertService alertService;
    
    public void runContinuousEvaluation() {
        try {
            List<TestCase> testCases = loadTestCases();
            DatasetEvaluationResult result = evaluationService.evaluateDataset(testCases);
            
            // 生成报告
            EvaluationReport report = reportService.generateReport(result);
            
            // 检查是否需要告警
            if (result.getAverageScore() < 0.6) {
                alertService.sendAlert("模型性能下降", report);
            }
            
            // 保存结果
            saveEvaluationResult(result);
            
        } catch (Exception e) {
            log.error("持续评估失败", e);
            alertService.sendAlert("评估系统异常", e.getMessage());
        }
    }
}
```

## 配置选项

```properties
# 评估配置
spring.ai.evaluation.enabled=true
spring.ai.evaluation.parallel=true
spring.ai.evaluation.thread-pool-size=10

# 评估器配置
spring.ai.evaluation.relevancy.enabled=true
spring.ai.evaluation.accuracy.enabled=true
spring.ai.evaluation.safety.enabled=true

# 报告配置
spring.ai.evaluation.report.format=json,html
spring.ai.evaluation.report.output-dir=/var/reports

# 告警配置
spring.ai.evaluation.alert.threshold=0.6
spring.ai.evaluation.alert.email=admin@example.com
```

## 最佳实践

### 1. 测试数据管理
- 维护高质量的测试数据集
- 定期更新测试用例
- 确保数据的多样性

### 2. 评估指标选择
- 根据应用场景选择合适的评估指标
- 结合多个维度进行综合评估
- 设置合理的阈值

### 3. 持续改进
- 建立评估反馈循环
- 根据评估结果优化模型
- 监控性能趋势

## 下一步

- [了解可观测性](/docs/1.0.0.3/single-agent/observability/)
- [学习多智能体](/docs/1.0.0.3/multi-agent/agents/)
- [探索 Playground](/docs/1.0.0.3/playground/studio/)
