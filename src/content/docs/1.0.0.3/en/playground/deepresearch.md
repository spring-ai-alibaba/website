---
title: DeepResearch
description: DeepResearch deep research agent
---

# DeepResearch

DeepResearch is a deep research agent built on Spring AI Alibaba, specifically designed for executing complex research tasks including literature review, data analysis, and report generation.

## Features

### Core Capabilities
- **Multi-source Information Collection**: Collect information from web, databases, documents, and other sources
- **Deep Analysis**: Perform in-depth analysis and mining of collected information
- **Intelligent Reasoning**: Logical reasoning and hypothesis validation based on existing information
- **Report Generation**: Automatically generate structured research reports
- **Visualization**: Provide charts and visual analysis results

### Use Cases
- Academic research
- Market research
- Competitive analysis
- Technical research
- Policy analysis

## Quick Start

### Environment Configuration

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

### Basic Usage

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

## Research Workflow

### Workflow Design

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
                Analyze the following research query and extract key information:
                
                Query: %s
                
                Please provide:
                1. Core research question
                2. Related keywords
                3. Research scope
                4. Expected depth
                5. Suggested information source types
                
                Return results in JSON format.
                """, query))
            .call()
            .entity(QueryAnalysis.class);
        
        return state.withQueryAnalysis(analysis);
    }
}
```

### Source Discovery

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
        
        // Sort by relevance
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

## Data Collection

### Multi-source Data Collection

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
        // Extract main content, remove navigation, ads, etc.
        Elements mainContent = document.select("article, main, .content, .post");
        
        if (!mainContent.isEmpty()) {
            return mainContent.first().text();
        }
        
        return document.body().text();
    }
}
```

## Content Analysis

### Intelligent Content Analysis

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
            Analyze the relevance of the following content to the research topic:
            
            Research Topic: %s
            Keywords: %s
            
            Content: %s
            
            Please provide:
            1. Relevance score (0-1)
            2. Key information summary
            3. Supporting viewpoints
            4. Opposing viewpoints
            5. Data and statistics
            6. Citation value
            
            Return in JSON format.
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

### Information Extraction

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
            Extract factual information from the following content:
            
            %s
            
            Please list all verifiable facts, each fact including:
            - Fact description
            - Credibility assessment
            - Source information
            """, content.getAnalysis().getKeySummary());
        
        String response = chatClient.prompt()
            .user(prompt)
            .call()
            .content();
        
        return parseFactsFromResponse(response);
    }
}
```

## Knowledge Synthesis

### Intelligent Synthesis Analysis

```java
@Service
public class KnowledgeSynthesisService {
    
    public SynthesisResult synthesizeFindings(List<AnalyzedContent> analyzedContent, QueryAnalysis query) {
        // Group by topic
        Map<String, List<AnalyzedContent>> groupedContent = groupByTopic(analyzedContent);
        
        List<TopicSynthesis> topicSyntheses = new ArrayList<>();
        
        for (Map.Entry<String, List<AnalyzedContent>> entry : groupedContent.entrySet()) {
            TopicSynthesis synthesis = synthesizeTopic(entry.getKey(), entry.getValue(), query);
            topicSyntheses.add(synthesis);
        }
        
        // Generate overall conclusion
        OverallConclusion conclusion = generateOverallConclusion(topicSyntheses, query);
        
        return SynthesisResult.builder()
            .topicSyntheses(topicSyntheses)
            .overallConclusion(conclusion)
            .confidence(calculateConfidence(topicSyntheses))
            .build();
    }
    
    private TopicSynthesis synthesizeTopic(String topic, List<AnalyzedContent> content, QueryAnalysis query) {
        String synthesisPrompt = String.format("""
            Synthesize and analyze the following information about "%s":
            
            Research Question: %s
            
            Related Content:
            %s
            
            Please provide:
            1. Main findings
            2. Consistent viewpoints
            3. Controversial viewpoints
            4. Evidence strength
            5. Knowledge gaps
            6. Further research recommendations
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

## Report Generation

### Structured Report Generation

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
        
        // Title and summary
        report.append("# ").append(structure.getTitle()).append("\n\n");
        report.append("## Executive Summary\n\n");
        report.append(synthesis.getOverallConclusion().getExecutiveSummary()).append("\n\n");
        
        // Main findings
        report.append("## Main Findings\n\n");
        for (TopicSynthesis topic : synthesis.getTopicSyntheses()) {
            report.append("### ").append(topic.getTopic()).append("\n\n");
            report.append(topic.getAnalysis().getMainFindings()).append("\n\n");
        }
        
        // Conclusions and recommendations
        report.append("## Conclusions and Recommendations\n\n");
        report.append(synthesis.getOverallConclusion().getConclusions()).append("\n\n");
        report.append(synthesis.getOverallConclusion().getRecommendations()).append("\n\n");
        
        // References
        report.append("## References\n\n");
        appendReferences(report, synthesis);
        
        return ResearchReport.builder()
            .content(report.toString())
            .format("markdown")
            .generatedAt(Instant.now())
            .build();
    }
}
```

## Configuration Options

```properties
# DeepResearch configuration
deepresearch.enabled=true
deepresearch.max-concurrent-tasks=5
deepresearch.task-timeout=3600s

# Data collection configuration
deepresearch.collection.max-sources=100
deepresearch.collection.timeout=30s
deepresearch.collection.retry-attempts=3

# Analysis configuration
deepresearch.analysis.max-content-length=5000
deepresearch.analysis.confidence-threshold=0.6

# Report configuration
deepresearch.report.default-format=markdown
deepresearch.report.include-references=true
deepresearch.report.max-length=10000

# Quality control
deepresearch.quality.enabled=true
deepresearch.quality.min-score=0.7
deepresearch.quality.auto-retry=true
```

## Best Practices

### 1. Query Design
- Define clear research objectives
- Use specific keywords
- Set reasonable scope

### 2. Information Source Selection
- Diversify information sources
- Verify information reliability
- Balance depth and breadth

### 3. Quality Control
- Implement multi-layer quality checks
- Cross-validate information
- Document uncertainties

### 4. Result Presentation
- Structure content organization
- Provide clear conclusions
- Mark information sources

## Next Steps

- [Learn NL2SQL](/docs/1.0.0.3/playground/nl2sql/)
- [Understand Multi-Agent Architectures](/docs/1.0.0.3/multi-agent/architectures/)
- [Explore Studio](/docs/1.0.0.3/playground/studio/)
