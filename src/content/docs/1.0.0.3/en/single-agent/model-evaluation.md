---
title: Model Evaluation
description: Spring AI Alibaba model evaluation features
---

# Model Evaluation

Model evaluation is crucial for ensuring AI application quality. Spring AI Alibaba provides a comprehensive model evaluation framework to help developers assess and optimize model performance.

## Evaluation Types

### 1. Accuracy Evaluation
Assess the accuracy and relevance of model responses.

### 2. Consistency Evaluation
Evaluate model output consistency under similar inputs.

### 3. Safety Evaluation
Assess the safety and compliance of model outputs.

### 4. Performance Evaluation
Evaluate model response time and throughput.

## Basic Usage

### Configure Evaluators

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

### Execute Evaluation

```java
@Service
public class ModelEvaluationService {
    
    @Autowired
    private RelevancyEvaluator relevancyEvaluator;
    
    @Autowired
    private AccuracyEvaluator accuracyEvaluator;
    
    public EvaluationResult evaluateResponse(String question, String response, String expectedAnswer) {
        // Relevancy evaluation
        EvaluationRequest relevancyRequest = new EvaluationRequest(question, response);
        EvaluationResponse relevancyResult = relevancyEvaluator.evaluate(relevancyRequest);
        
        // Accuracy evaluation
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

## Batch Evaluation

### Dataset Evaluation

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

### Parallel Evaluation

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

## Custom Evaluators

### Create Custom Evaluator

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
            Please evaluate the relevance of the following answer to the question, 
            providing a score between 0-1:
            
            Question: %s
            Answer: %s
            
            Please return only the score (decimal between 0-1) and a brief reason.
            Format: score|reason
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

### Domain-Specific Evaluator

```java
@Component
public class MedicalAccuracyEvaluator implements Evaluator {
    
    @Autowired
    private ChatClient chatClient;
    
    @Override
    public EvaluationResponse evaluate(EvaluationRequest request) {
        String prompt = String.format("""
            As a medical expert, please evaluate the accuracy of the following medical Q&A:
            
            Question: %s
            Answer: %s
            Standard Answer: %s
            
            Evaluation criteria:
            1. Accuracy of medical facts
            2. Correct use of professional terminology
            3. Safety considerations
            4. Completeness
            
            Please provide a score between 0-1 and detailed evaluation.
            """, request.getQuestion(), request.getResponse(), request.getExpectedAnswer());
        
        String result = chatClient.prompt()
            .user(prompt)
            .call()
            .content();
        
        return parseDetailedEvaluationResult(result);
    }
}
```

## A/B Testing

### A/B Testing Framework

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

## Evaluation Reports

### Generate Evaluation Report

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
            recommendations.add("Overall performance needs improvement, consider optimizing prompts or adjusting model parameters");
        }
        
        // Analyze specific issues
        List<EvaluationResult> lowScoreResults = result.getResults().stream()
            .filter(r -> r.getAverageScore() < 0.5)
            .collect(Collectors.toList());
        
        if (!lowScoreResults.isEmpty()) {
            recommendations.add("Found " + lowScoreResults.size() + " low-scoring cases that need attention");
        }
        
        return recommendations;
    }
}
```

## Continuous Evaluation

### Automated Evaluation Pipeline

```java
@Component
@Scheduled(fixedRate = 3600000) // Execute every hour
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
            
            // Generate report
            EvaluationReport report = reportService.generateReport(result);
            
            // Check if alert is needed
            if (result.getAverageScore() < 0.6) {
                alertService.sendAlert("Model performance degradation", report);
            }
            
            // Save results
            saveEvaluationResult(result);
            
        } catch (Exception e) {
            log.error("Continuous evaluation failed", e);
            alertService.sendAlert("Evaluation system error", e.getMessage());
        }
    }
}
```

## Configuration Options

```properties
# Evaluation configuration
spring.ai.evaluation.enabled=true
spring.ai.evaluation.parallel=true
spring.ai.evaluation.thread-pool-size=10

# Evaluator configuration
spring.ai.evaluation.relevancy.enabled=true
spring.ai.evaluation.accuracy.enabled=true
spring.ai.evaluation.safety.enabled=true

# Report configuration
spring.ai.evaluation.report.format=json,html
spring.ai.evaluation.report.output-dir=/var/reports

# Alert configuration
spring.ai.evaluation.alert.threshold=0.6
spring.ai.evaluation.alert.email=admin@example.com
```

## Best Practices

### 1. Test Data Management
- Maintain high-quality test datasets
- Regularly update test cases
- Ensure data diversity

### 2. Evaluation Metric Selection
- Choose appropriate metrics for your use case
- Combine multiple dimensions for comprehensive evaluation
- Set reasonable thresholds

### 3. Continuous Improvement
- Establish evaluation feedback loops
- Optimize models based on evaluation results
- Monitor performance trends

## Next Steps

- [Learn about Observability](/docs/1.0.0.3/single-agent/observability/)
- [Understand Multi-Agent Systems](/docs/1.0.0.3/multi-agent/agents/)
- [Explore Playground](/docs/1.0.0.3/playground/studio/)
