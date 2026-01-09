# 搜索模块 - 高级特性

## 1. 多数据源聚合搜索

同时搜索多个数据源并聚合结果：

```python
# Agent 调用多源搜索
results = search.multi_source(
    query="订单处理流程",
    sources=["PROJECT", "KNOWLEDGE", "EXPERIENCE"],
    top_k_per_source=5
)

# 结果按数据源分组
for source, items in results.items():
    print(f"=== {source} ===")
    for item in items:
        print(f"  - {item['title']}: {item['score']}")
```

---

## 2. 向量搜索集成

与 Spring AI VectorStore 集成：

```java
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.SearchRequest;

@Component
public class VectorSearchProvider implements SearchProvider {

    private final VectorStore vectorStore;

    @Override
    public boolean supports(SearchSourceType type) {
        return type == SearchSourceType.KNOWLEDGE;
    }

    @Override
    public List<SearchResultItem> search(com.alibaba.assistant.agent.extension.search.model.SearchRequest request) {
        // 使用向量搜索
        List<Document> docs = vectorStore.similaritySearch(
            SearchRequest.query(request.getQuery())
                .withTopK(request.getTopK())
                .withSimilarityThreshold(0.7)
        );
        
        return docs.stream()
            .map(this::toSearchResultItem)
            .collect(Collectors.toList());
    }
}
```

---

## 3. Web 搜索

启用并配置 Web 搜索：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          search:
            web-search-enabled: true
            baidu-api-key: ${BAIDU_SEARCH_API_KEY}
```

自定义 Web 搜索提供者：

```java
@Component
public class BaiduSearchProvider implements SearchProvider {

    private final String apiKey;
    private final RestTemplate restTemplate;

    @Override
    public boolean supports(SearchSourceType type) {
        return type == SearchSourceType.WEB;
    }

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        // 调用百度搜索 API
        String url = String.format(
            "https://api.baidu.com/search?key=%s&q=%s",
            apiKey, 
            URLEncoder.encode(request.getQuery(), StandardCharsets.UTF_8)
        );
        
        BaiduSearchResponse response = restTemplate.getForObject(url, BaiduSearchResponse.class);
        
        return response.getResults().stream()
            .map(r -> {
                SearchResultItem item = new SearchResultItem();
                item.setTitle(r.getTitle());
                item.setContent(r.getSnippet());
                item.setUri(r.getUrl());
                item.setSourceType(SearchSourceType.WEB);
                return item;
            })
            .collect(Collectors.toList());
    }
}
```

---

## 4. 项目上下文搜索

搜索当前项目的代码和配置：

```java
@Component
public class ProjectSearchProvider implements SearchProvider {

    private final ProjectIndexer projectIndexer;

    @Override
    public boolean supports(SearchSourceType type) {
        return type == SearchSourceType.PROJECT;
    }

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        String projectId = (String) request.getFilters().get("projectId");
        
        // 搜索代码索引
        List<CodeSnippet> snippets = projectIndexer.search(
            projectId,
            request.getQuery(),
            request.getTopK()
        );
        
        return snippets.stream()
            .map(s -> {
                SearchResultItem item = new SearchResultItem();
                item.setTitle(s.getFilePath());
                item.setContent(s.getCode());
                item.setSourceType(SearchSourceType.PROJECT);
                item.setScore(s.getScore());
                
                // 设置元数据
                SearchMetadata metadata = new SearchMetadata();
                metadata.setLanguage(s.getLanguage());
                metadata.getExtensions().put("lineNumber", s.getLineNumber());
                item.setMetadata(metadata);
                
                return item;
            })
            .collect(Collectors.toList());
    }
}
```

---

## 5. 搜索结果缓存

```java
@Component
public class CachedSearchProvider implements SearchProvider {

    private final SearchProvider delegate;
    private final Cache<String, List<SearchResultItem>> cache;

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        String cacheKey = generateCacheKey(request);
        
        return cache.get(cacheKey, () -> delegate.search(request));
    }

    private String generateCacheKey(SearchRequest request) {
        return request.getSourceType() + ":" + 
               request.getQuery() + ":" + 
               request.getTopK();
    }
}
```

---

## 6. 搜索结果排序

自定义排序策略：

```java
@Component
public class SearchResultSorter {

    public List<SearchResultItem> sort(List<SearchResultItem> items, String strategy) {
        switch (strategy) {
            case "score":
                return items.stream()
                    .sorted(Comparator.comparingDouble(SearchResultItem::getScore).reversed())
                    .collect(Collectors.toList());
                    
            case "recency":
                return items.stream()
                    .sorted(Comparator.comparing(i -> 
                        (Instant) i.getMetadata().get("updatedAt"), 
                        Comparator.reverseOrder()))
                    .collect(Collectors.toList());
                    
            default:
                return items;
        }
    }
}
```

---

## 7. 搜索过滤器

```java
@Component
public class SearchFilterChain {

    private final List<SearchFilter> filters;

    public List<SearchResultItem> filter(List<SearchResultItem> items, SearchContext context) {
        List<SearchResultItem> result = items;
        
        for (SearchFilter filter : filters) {
            result = filter.apply(result, context);
        }
        
        return result;
    }
}

// 权限过滤器示例
@Component
public class PermissionFilter implements SearchFilter {

    @Override
    public List<SearchResultItem> apply(List<SearchResultItem> items, SearchContext context) {
        String userId = context.getUserId();
        
        return items.stream()
            .filter(item -> hasPermission(userId, item))
            .collect(Collectors.toList());
    }
}
```

---

## 8. 搜索上下文

```java
SearchContext context = SearchContext.builder()
    .userId("user-123")
    .projectId("project-456")
    .sessionId("session-789")
    .metadata(Map.of(
        "language", "java",
        "framework", "spring-boot"
    ))
    .build();

SearchRequest request = new SearchRequest();
request.setQuery("配置文件加载");
request.setContext(context);
```

---

## 9. 自定义搜索工具

为 Agent 提供自定义搜索工具：

```java
@Component
public class DatabaseSearchTool implements CodeactTool {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public String call(String toolInput) {
        Map<String, Object> params = parseInput(toolInput);
        String table = (String) params.get("table");
        String keyword = (String) params.get("keyword");
        
        String sql = "SELECT * FROM " + table + " WHERE content LIKE ?";
        List<Map<String, Object>> results = jdbcTemplate.queryForList(
            sql, "%" + keyword + "%"
        );
        
        return toJson(results);
    }

    @Override
    public CodeactToolDefinition getCodeactDefinition() {
        return DefaultCodeactToolDefinition.builder()
            .name("search_database")
            .description("搜索数据库表")
            .parameterTree(ParameterTree.builder()
                .addParameter(ParameterNode.builder()
                    .name("table")
                    .type(ParameterType.STRING)
                    .required(true)
                    .build())
                .addParameter(ParameterNode.builder()
                    .name("keyword")
                    .type(ParameterType.STRING)
                    .required(true)
                    .build())
                .build())
            .build();
    }

    @Override
    public CodeactToolMetadata getCodeactMetadata() {
        return DefaultCodeactToolMetadata.builder()
            .targetClassName("search")
            .build();
    }
}
```

---

## 10. 搜索指标监控

```java
@Component
public class SearchMetrics {

    private final MeterRegistry meterRegistry;

    public void recordSearch(SearchSourceType type, long durationMs, int resultCount) {
        meterRegistry.timer("search.duration", "source", type.name())
            .record(Duration.ofMillis(durationMs));
            
        meterRegistry.counter("search.results", "source", type.name())
            .increment(resultCount);
    }
}
```

---

## 11. 日志配置

```yaml
logging:
  level:
    com.alibaba.assistant.agent.extension.search: DEBUG
```

