---
title: DeepResearch
description: DeepResearch 深度研究智能体
---

# DeepResearch

DeepResearch 是基于 Spring AI Alibaba 构建的深度研究智能体，专门用于执行复杂的研究任务，包括文献调研、数据分析、报告生成等。

## 功能特性

### 核心能力
- **多源信息收集**: 从网络、数据库、文档等多个来源收集信息
- **深度分析**: 对收集的信息进行深度分析和挖掘
- **智能推理**: 基于已有信息进行逻辑推理和假设验证
- **报告生成**: 自动生成结构化的研究报告
- **可视化展示**: 提供图表和可视化分析结果

### 应用场景
- 学术研究
- 市场调研
- 竞品分析
- 技术调研
- 政策分析

## 快速开始

### 环境配置

```yaml
# application.yml
deepresearch:
  enabled: true
  max-research-depth: 5
  max-sources: 50
  output-format: markdown
  
  data-sources:
    web-search:
      enabled: true
      engines: [google, bing, duckduckgo]
    academic:
      enabled: true
      databases: [arxiv, pubmed, ieee]
    news:
      enabled: true
      sources: [reuters, bloomberg, techcrunch]
```

### 基本使用

```java
@RestController
@RequestMapping("/api/research")
public class ResearchController {
    
    @Autowired
    private DeepResearchService researchService;
    
    @PostMapping("/start")
    public ResponseEntity<ResearchTask> startResearch(@RequestBody ResearchRequest request) {
        ResearchTask task = researchService.startResearch(
            ResearchQuery.builder()
                .topic(request.getTopic())
                .scope(request.getScope())
                .depth(request.getDepth())
                .outputFormat(request.getOutputFormat())
                .build()
        );
        
        return ResponseEntity.ok(task);
    }
    
    @GetMapping("/{taskId}/status")
    public ResponseEntity<ResearchStatus> getStatus(@PathVariable String taskId) {
        ResearchStatus status = researchService.getResearchStatus(taskId);
        return ResponseEntity.ok(status);
    }
    
    @GetMapping("/{taskId}/result")
    public ResponseEntity<ResearchResult> getResult(@PathVariable String taskId) {
        ResearchResult result = researchService.getResearchResult(taskId);
        return ResponseEntity.ok(result);
    }
}
```

## 研究工作流

### 工作流设计

```java
@Component
public class ResearchWorkflow {
    
    public StateGraph createResearchGraph() {
        return StateGraph.builder(ResearchState.class)
            .addNode("query_analysis", this::analyzeQuery)
            .addNode("source_discovery", this::discoverSources)
            .addNode("data_collection", this::collectData)
            .addNode("content_analysis", this::analyzeContent)
            .addNode("synthesis", this::synthesizeFindings)
            .addNode("report_generation", this::generateReport)
            .addNode("quality_check", this::checkQuality)
            .addConditionalEdges("query_analysis", this::routeAfterAnalysis)
            .addEdge("source_discovery", "data_collection")
            .addEdge("data_collection", "content_analysis")
            .addEdge("content_analysis", "synthesis")
            .addEdge("synthesis", "report_generation")
            .addEdge("report_generation", "quality_check")
            .addConditionalEdges("quality_check", this::routeAfterQualityCheck)
            .setEntryPoint("query_analysis")
            .setFinishPoint("quality_check")
            .build();
    }
    
    private ResearchState analyzeQuery(ResearchState state) {
        String query = state.getOriginalQuery();
        
        QueryAnalysis analysis = chatClient.prompt()
            .user(String.format("""
                分析以下研究查询，提取关键信息：
                
                查询：%s
                
                请提供：
                1. 核心研究问题
                2. 相关关键词
                3. 研究范围
                4. 预期深度
                5. 建议的信息源类型
                
                以JSON格式返回结果。
                """, query))
            .call()
            .entity(QueryAnalysis.class);
        
        return state.withQueryAnalysis(analysis);
    }
}
```

### 信息源发现

```java
@Component
public class SourceDiscoveryService {
    
    @Autowired
    private List<InformationSource> informationSources;
    
    public List<SourceCandidate> discoverSources(QueryAnalysis analysis) {
        List<SourceCandidate> candidates = new ArrayList<>();
        
        for (InformationSource source : informationSources) {
            if (source.isRelevant(analysis)) {
                List<SourceCandidate> sourceCandidates = source.findCandidates(analysis);
                candidates.addAll(sourceCandidates);
            }
        }
        
        // 按相关性排序
        return candidates.stream()
            .sorted(Comparator.comparing(SourceCandidate::getRelevanceScore).reversed())
            .limit(50)
            .collect(Collectors.toList());
    }
}

@Component
public class WebSearchSource implements InformationSource {
    
    @Autowired
    private WebSearchService webSearchService;
    
    @Override
    public boolean isRelevant(QueryAnalysis analysis) {
        return analysis.getSourceTypes().contains("web");
    }
    
    @Override
    public List<SourceCandidate> findCandidates(QueryAnalysis analysis) {
        List<SourceCandidate> candidates = new ArrayList<>();
        
        for (String keyword : analysis.getKeywords()) {
            List<SearchResult> results = webSearchService.search(keyword, 10);
            
            for (SearchResult result : results) {
                candidates.add(SourceCandidate.builder()
                    .url(result.getUrl())
                    .title(result.getTitle())
                    .snippet(result.getSnippet())
                    .source("web")
                    .relevanceScore(calculateRelevance(result, analysis))
                    .build());
            }
        }
        
        return candidates;
    }
}
```

## 数据收集

### 多源数据收集

```java
@Service
public class DataCollectionService {
    
    @Autowired
    private List<DataCollector> collectors;
    
    public List<CollectedData> collectData(List<SourceCandidate> sources) {
        return sources.parallelStream()
            .map(this::collectFromSource)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }
    
    private CollectedData collectFromSource(SourceCandidate source) {
        DataCollector collector = findCollector(source.getSource());
        
        if (collector != null) {
            try {
                return collector.collect(source);
            } catch (Exception e) {
                log.warn("Failed to collect from source: {}", source.getUrl(), e);
            }
        }
        
        return null;
    }
}

@Component
public class WebPageCollector implements DataCollector {
    
    @Override
    public String getSourceType() {
        return "web";
    }
    
    @Override
    public CollectedData collect(SourceCandidate source) {
        try {
            Document document = Jsoup.connect(source.getUrl())
                .timeout(10000)
                .get();
            
            String content = extractMainContent(document);
            Map<String, Object> metadata = extractMetadata(document);
            
            return CollectedData.builder()
                .source(source)
                .content(content)
                .metadata(metadata)
                .collectedAt(Instant.now())
                .build();
                
        } catch (IOException e) {
            throw new DataCollectionException("Failed to collect from: " + source.getUrl(), e);
        }
    }
    
    private String extractMainContent(Document document) {
        // 提取主要内容，去除导航、广告等
        Elements mainContent = document.select("article, main, .content, .post");
        
        if (!mainContent.isEmpty()) {
            return mainContent.first().text();
        }
        
        return document.body().text();
    }
}
```

## 内容分析

### 智能内容分析

```java
@Service
public class ContentAnalysisService {
    
    @Autowired
    private ChatClient chatClient;
    
    public List<AnalyzedContent> analyzeContent(List<CollectedData> data, QueryAnalysis query) {
        return data.stream()
            .map(content -> analyzeIndividualContent(content, query))
            .collect(Collectors.toList());
    }
    
    private AnalyzedContent analyzeIndividualContent(CollectedData data, QueryAnalysis query) {
        String analysisPrompt = String.format("""
            分析以下内容与研究主题的相关性：
            
            研究主题：%s
            关键词：%s
            
            内容：%s
            
            请提供：
            1. 相关性评分 (0-1)
            2. 关键信息摘要
            3. 支持的观点
            4. 反对的观点
            5. 数据和统计信息
            6. 引用价值
            
            以JSON格式返回。
            """, 
            query.getCoreQuestion(),
            String.join(", ", query.getKeywords()),
            truncateContent(data.getContent(), 2000)
        );
        
        ContentAnalysis analysis = chatClient.prompt()
            .user(analysisPrompt)
            .call()
            .entity(ContentAnalysis.class);
        
        return AnalyzedContent.builder()
            .originalData(data)
            .analysis(analysis)
            .analyzedAt(Instant.now())
            .build();
    }
}
```

### 信息提取

```java
@Component
public class InformationExtractor {
    
    public ExtractedInformation extractInformation(AnalyzedContent content) {
        return ExtractedInformation.builder()
            .facts(extractFacts(content))
            .statistics(extractStatistics(content))
            .quotes(extractQuotes(content))
            .references(extractReferences(content))
            .build();
    }
    
    private List<Fact> extractFacts(AnalyzedContent content) {
        String prompt = String.format("""
            从以下内容中提取事实性信息：
            
            %s
            
            请列出所有可验证的事实，每个事实包括：
            - 事实描述
            - 可信度评估
            - 来源信息
            """, content.getAnalysis().getKeySummary());
        
        String response = chatClient.prompt()
            .user(prompt)
            .call()
            .content();
        
        return parseFactsFromResponse(response);
    }
}
```

## 知识综合

### 智能综合分析

```java
@Service
public class KnowledgeSynthesisService {
    
    public SynthesisResult synthesizeFindings(List<AnalyzedContent> analyzedContent, QueryAnalysis query) {
        // 按主题分组
        Map<String, List<AnalyzedContent>> groupedContent = groupByTopic(analyzedContent);
        
        List<TopicSynthesis> topicSyntheses = new ArrayList<>();
        
        for (Map.Entry<String, List<AnalyzedContent>> entry : groupedContent.entrySet()) {
            TopicSynthesis synthesis = synthesizeTopic(entry.getKey(), entry.getValue(), query);
            topicSyntheses.add(synthesis);
        }
        
        // 生成整体结论
        OverallConclusion conclusion = generateOverallConclusion(topicSyntheses, query);
        
        return SynthesisResult.builder()
            .topicSyntheses(topicSyntheses)
            .overallConclusion(conclusion)
            .confidence(calculateConfidence(topicSyntheses))
            .build();
    }
    
    private TopicSynthesis synthesizeTopic(String topic, List<AnalyzedContent> content, QueryAnalysis query) {
        String synthesisPrompt = String.format("""
            综合分析以下关于"%s"的信息：
            
            研究问题：%s
            
            相关内容：
            %s
            
            请提供：
            1. 主要发现
            2. 一致性观点
            3. 争议性观点
            4. 证据强度
            5. 知识空白
            6. 进一步研究建议
            """,
            topic,
            query.getCoreQuestion(),
            formatContentForSynthesis(content)
        );
        
        TopicAnalysis analysis = chatClient.prompt()
            .user(synthesisPrompt)
            .call()
            .entity(TopicAnalysis.class);
        
        return TopicSynthesis.builder()
            .topic(topic)
            .analysis(analysis)
            .sourceCount(content.size())
            .build();
    }
}
```

## 报告生成

### 结构化报告生成

```java
@Service
public class ReportGenerationService {
    
    public ResearchReport generateReport(SynthesisResult synthesis, QueryAnalysis query, String format) {
        ReportStructure structure = designReportStructure(query, synthesis);
        
        switch (format.toLowerCase()) {
            case "markdown":
                return generateMarkdownReport(structure, synthesis);
            case "html":
                return generateHtmlReport(structure, synthesis);
            case "pdf":
                return generatePdfReport(structure, synthesis);
            default:
                throw new UnsupportedFormatException("Unsupported format: " + format);
        }
    }
    
    private ResearchReport generateMarkdownReport(ReportStructure structure, SynthesisResult synthesis) {
        StringBuilder report = new StringBuilder();
        
        // 标题和摘要
        report.append("# ").append(structure.getTitle()).append("\n\n");
        report.append("## 执行摘要\n\n");
        report.append(synthesis.getOverallConclusion().getExecutiveSummary()).append("\n\n");
        
        // 主要发现
        report.append("## 主要发现\n\n");
        for (TopicSynthesis topic : synthesis.getTopicSyntheses()) {
            report.append("### ").append(topic.getTopic()).append("\n\n");
            report.append(topic.getAnalysis().getMainFindings()).append("\n\n");
        }
        
        // 结论和建议
        report.append("## 结论和建议\n\n");
        report.append(synthesis.getOverallConclusion().getConclusions()).append("\n\n");
        report.append(synthesis.getOverallConclusion().getRecommendations()).append("\n\n");
        
        // 参考文献
        report.append("## 参考文献\n\n");
        appendReferences(report, synthesis);
        
        return ResearchReport.builder()
            .content(report.toString())
            .format("markdown")
            .generatedAt(Instant.now())
            .build();
    }
}
```

## 质量控制

### 自动质量检查

```java
@Component
public class QualityController {
    
    public QualityAssessment assessQuality(ResearchReport report, SynthesisResult synthesis) {
        List<QualityMetric> metrics = new ArrayList<>();
        
        // 内容完整性检查
        metrics.add(assessCompleteness(report, synthesis));
        
        // 信息准确性检查
        metrics.add(assessAccuracy(report, synthesis));
        
        // 逻辑一致性检查
        metrics.add(assessConsistency(report, synthesis));
        
        // 引用质量检查
        metrics.add(assessCitationQuality(report, synthesis));
        
        double overallScore = metrics.stream()
            .mapToDouble(QualityMetric::getScore)
            .average()
            .orElse(0.0);
        
        return QualityAssessment.builder()
            .overallScore(overallScore)
            .metrics(metrics)
            .passed(overallScore >= 0.7)
            .recommendations(generateQualityRecommendations(metrics))
            .build();
    }
    
    private QualityMetric assessCompleteness(ResearchReport report, SynthesisResult synthesis) {
        String prompt = String.format("""
            评估以下研究报告的完整性：
            
            报告内容：%s
            
            评估标准：
            1. 是否回答了核心研究问题
            2. 是否涵盖了主要方面
            3. 是否提供了充分的证据
            4. 是否有明确的结论
            
            请给出0-1之间的评分和详细说明。
            """, truncateContent(report.getContent(), 1000));
        
        QualityEvaluation evaluation = chatClient.prompt()
            .user(prompt)
            .call()
            .entity(QualityEvaluation.class);
        
        return QualityMetric.builder()
            .name("completeness")
            .score(evaluation.getScore())
            .description(evaluation.getDescription())
            .build();
    }
}
```

## 配置选项

```properties
# DeepResearch 配置
deepresearch.enabled=true
deepresearch.max-concurrent-tasks=5
deepresearch.task-timeout=3600s

# 数据收集配置
deepresearch.collection.max-sources=100
deepresearch.collection.timeout=30s
deepresearch.collection.retry-attempts=3

# 分析配置
deepresearch.analysis.max-content-length=5000
deepresearch.analysis.confidence-threshold=0.6

# 报告配置
deepresearch.report.default-format=markdown
deepresearch.report.include-references=true
deepresearch.report.max-length=10000

# 质量控制
deepresearch.quality.enabled=true
deepresearch.quality.min-score=0.7
deepresearch.quality.auto-retry=true
```

## 最佳实践

### 1. 查询设计
- 明确研究目标
- 使用具体的关键词
- 设定合理的范围

### 2. 信息源选择
- 多样化信息来源
- 验证信息可靠性
- 平衡深度和广度

### 3. 质量控制
- 实施多层质量检查
- 交叉验证信息
- 记录不确定性

### 4. 结果呈现
- 结构化组织内容
- 提供清晰的结论
- 标注信息来源

## 下一步

- [学习 NL2SQL](/docs/1.0.0.3/playground/nl2sql/)
- [了解多智能体架构](/docs/1.0.0.3/multi-agent/architectures/)
- [探索 Studio](/docs/1.0.0.3/playground/studio/)
