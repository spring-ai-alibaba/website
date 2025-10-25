---
title: RAG 质量评估 | Spring AI on Alibaba Cloud
---

import Bilibili from '@components/Bilibili.astro';

在生产环境中部署 RAG 应用后，持续监控和评估系统的质量表现至关重要。Spring AI Alibaba (SAA) 提供了一套完整的 RAG 质量评估工具，帮助您量化和优化检索增强生成系统的效果。

## 评估体系概览

SAA 的 RAG 评估体系基于学术界和工业界广泛认可的三个核心维度：

*   **答案正确性 (Answer Correctness)**: 生成答案在事实层面的准确程度
*   **答案忠实性 (Answer Faithfulness)**: 生成答案对检索到的源文档内容的忠实程度  
*   **答案相关性 (Answer Relevancy)**: 生成答案与用户问题的相关程度

这三个维度相互补充，形成了一个全面的质量评估框架：

![RAG评估维度](https://img.alicdn.com/imgextra/i4/O1CN01example_!!6000000005971-2-tps-1554-712.png)

## 核心评估器

### 1. AnswerCorrectnessEvaluator (答案正确性评估器)

答案正确性评估器通过比较生成答案与标准答案（Ground Truth），来评估回答在事实层面的准确性。

**核心特点**:
*   **语义理解**: 不仅比较字面相似度，还理解语义层面的正确性
*   **多维度评分**: 提供详细的正确性得分和具体的错误分析
*   **支持中英文**: 针对中文语境进行了优化

**使用示例**:

```java
import com.alibaba.cloud.ai.evaluation.AnswerCorrectnessEvaluator;
import org.springframework.ai.evaluation.EvaluationRequest;
import org.springframework.ai.evaluation.EvaluationResponse;
import org.springframework.stereotype.Service;

@Service
public class RagEvaluationService {

    private final AnswerCorrectnessEvaluator correctnessEvaluator;

    public RagEvaluationService(AnswerCorrectnessEvaluator correctnessEvaluator) {
        this.correctnessEvaluator = correctnessEvaluator;
    }

    public double evaluateCorrectness(String userQuestion, String generatedAnswer, String groundTruth) {
        EvaluationRequest request = EvaluationRequest.builder()
                .withUserText(userQuestion)
                .withAssistantResponse(generatedAnswer)
                .withExpectedResponse(groundTruth)
                .build();

        EvaluationResponse response = correctnessEvaluator.evaluate(request);
        return response.getScore(); // 返回 0.0 - 1.0 之间的得分
    }
}
```

### 2. AnswerFaithfulnessEvaluator (答案忠实性评估器)

忠实性评估器检查生成的答案是否与检索到的源文档保持一致，确保没有产生幻觉或篡改原文内容。

**核心特点**:
*   **反幻觉检测**: 识别生成答案中不基于源文档的内容
*   **引用验证**: 验证答案中的每个要点是否都能在源文档中找到依据
*   **细粒度分析**: 提供逐句的忠实性分析报告

**使用示例**:

```java
import com.alibaba.cloud.ai.evaluation.AnswerFaithfulnessEvaluator;
import org.springframework.ai.document.Document;
import org.springframework.ai.evaluation.EvaluationRequest;
import org.springframework.ai.evaluation.EvaluationResponse;

@Service
public class FaithfulnessEvaluationService {

    private final AnswerFaithfulnessEvaluator faithfulnessEvaluator;

    public FaithfulnessEvaluationService(AnswerFaithfulnessEvaluator faithfulnessEvaluator) {
        this.faithfulnessEvaluator = faithfulnessEvaluator;
    }

    public double evaluateFaithfulness(String userQuestion, String generatedAnswer, List<Document> sourceDocuments) {
        // 将检索到的文档内容合并
        String sourceContext = sourceDocuments.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n"));

        EvaluationRequest request = EvaluationRequest.builder()
                .withUserText(userQuestion)
                .withAssistantResponse(generatedAnswer)
                .withDataList(List.of(sourceContext)) // 提供源文档上下文
                .build();

        EvaluationResponse response = faithfulnessEvaluator.evaluate(request);
        return response.getScore();
    }
}
```

### 3. AnswerRelevancyEvaluator (答案相关性评估器)

相关性评估器评估生成答案与用户问题的匹配程度，确保回答切中要害且有针对性。

**核心特点**:
*   **意图理解**: 深度理解用户问题的真实意图
*   **完整性检查**: 评估答案是否完整回应了用户的所有关切点
*   **偏题检测**: 识别答案中与问题无关的冗余内容

**使用示例**:

```java
import com.alibaba.cloud.ai.evaluation.AnswerRelevancyEvaluator;

@Service  
public class RelevancyEvaluationService {

    private final AnswerRelevancyEvaluator relevancyEvaluator;

    public RelevancyEvaluationService(AnswerRelevancyEvaluator relevancyEvaluator) {
        this.relevancyEvaluator = relevancyEvaluator;
    }

    public double evaluateRelevancy(String userQuestion, String generatedAnswer) {
        EvaluationRequest request = EvaluationRequest.builder()
                .withUserText(userQuestion)
                .withAssistantResponse(generatedAnswer)
                .build();

        EvaluationResponse response = relevancyEvaluator.evaluate(request);
        return response.getScore();
    }
}
```

### 4. LaajEvaluator (综合评估器)

LaajEvaluator 是一个综合性评估器，它将上述三个维度的评估结果进行加权整合，提供一个整体的质量评分。

**核心特点**:
*   **多维度整合**: 自动整合正确性、忠实性和相关性评分
*   **权重可配置**: 可以根据业务需求调整各维度的权重
*   **趋势分析**: 支持长期趋势监控和质量变化分析

**使用示例**:

```java
import com.alibaba.cloud.ai.evaluation.LaajEvaluator;
import com.alibaba.cloud.ai.evaluation.LaajEvaluationResult;

@Service
public class ComprehensiveEvaluationService {

    private final LaajEvaluator laajEvaluator;

    public ComprehensiveEvaluationService(LaajEvaluator laajEvaluator) {
        this.laajEvaluator = laajEvaluator;
    }

    public LaajEvaluationResult comprehensiveEvaluate(
            String userQuestion, 
            String generatedAnswer, 
            String groundTruth,
            List<Document> sourceDocuments) {

        String sourceContext = sourceDocuments.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n"));

        EvaluationRequest request = EvaluationRequest.builder()
                .withUserText(userQuestion)
                .withAssistantResponse(generatedAnswer)
                .withExpectedResponse(groundTruth)
                .withDataList(List.of(sourceContext))
                .build();

        return laajEvaluator.evaluate(request);
    }
}
```

## 配置评估器

要启用 RAG 评估功能，您需要在 `application.yml` 中进行相应配置：

```yaml
spring:
  ai:
    alibaba:
      dashscope:
        api-key: ${DASH_SCOPE_API_KEY}
        
        # 评估器配置
        evaluation:
          enabled: true
          # 评估使用的模型，建议使用性能较强的模型以获得更准确的评估结果
          model: qwen-max
          
          # 各维度权重配置 (可选)
          weights:
            correctness: 0.4    # 正确性权重
            faithfulness: 0.35  # 忠实性权重  
            relevancy: 0.25     # 相关性权重
```

## 批量评估实践

在生产环境中，您通常需要对大批量的问答对进行评估。以下是一个批量评估的完整示例：

```java
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class BatchEvaluationService {

    private final LaajEvaluator laajEvaluator;
    private final VectorStore vectorStore;
    private final ChatModel chatModel;

    public BatchEvaluationService(LaajEvaluator laajEvaluator, VectorStore vectorStore, ChatModel chatModel) {
        this.laajEvaluator = laajEvaluator;
        this.vectorStore = vectorStore;
        this.chatModel = chatModel;
    }

    @Async
    public CompletableFuture<EvaluationReport> evaluateTestSet(List<TestCase> testCases) {
        List<EvaluationResult> results = new ArrayList<>();

        for (TestCase testCase : testCases) {
            try {
                // 1. 执行 RAG 检索和生成
                List<Document> retrievedDocs = vectorStore.similaritySearch(
                    SearchRequest.builder().query(testCase.getQuestion()).topK(3).build()
                );
                
                String generatedAnswer = generateAnswer(testCase.getQuestion(), retrievedDocs);

                // 2. 执行综合评估
                LaajEvaluationResult evaluation = comprehensiveEvaluate(
                    testCase.getQuestion(),
                    generatedAnswer,
                    testCase.getExpectedAnswer(),
                    retrievedDocs
                );

                results.add(new EvaluationResult(testCase, evaluation));

            } catch (Exception e) {
                logger.error("评估测试用例失败: {}", testCase.getQuestion(), e);
            }
        }

        return CompletableFuture.completedFuture(generateReport(results));
    }

    private String generateAnswer(String question, List<Document> documents) {
        // 实现 RAG 答案生成逻辑
        String context = documents.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n"));
        
        return chatModel.call(new Prompt(String.format(
            "根据以下上下文回答问题：\n\n%s\n\n问题：%s", context, question
        ))).getResult().getOutput().getText();
    }
}

// 数据类定义
public class TestCase {
    private String question;
    private String expectedAnswer;
    // getters and setters
}

public class EvaluationResult {
    private TestCase testCase;
    private LaajEvaluationResult evaluation;
    // getters and setters
}
```

## 最佳实践

### 1. 建立基准测试集
*   **多样性**: 确保测试集覆盖各种类型的问题和场景
*   **质量**: 人工标注高质量的标准答案
*   **更新**: 定期更新测试集以反映业务变化

### 2. 持续监控
*   **定期评估**: 建议至少每周进行一次完整评估
*   **阈值告警**: 设置质量得分阈值，低于阈值时及时告警
*   **趋势分析**: 关注评估得分的变化趋势而非单次结果

### 3. 迭代优化
*   **问题分析**: 对低分案例进行详细分析，找出问题根因
*   **策略调整**: 基于评估结果调整检索策略、重排参数等
*   **模型升级**: 考虑升级到更强的基础模型或优化 Prompt

通过 SAA 提供的这套完整的评估体系，您可以建立起一个科学、量化的 RAG 质量管理流程，确保系统在生产环境中始终保持高质量的输出。
