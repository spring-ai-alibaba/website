# 搜索模块（Search）

## 1. 模块介绍

搜索模块提供多数据源检索能力，支持项目上下文搜索、知识库搜索、Web 搜索等，为 Agent 提供信息获取能力。

### 核心概念

| 概念 | 说明 |
|------|------|
| `SearchProvider` | 搜索提供者 SPI，实现特定数据源的搜索能力 |
| `SearchFacade` | 搜索门面，统一搜索入口 |
| `SearchSourceType` | 数据源类型枚举 |
| `SearchRequest` | 搜索请求 |
| `SearchResultItem` | 搜索结果项 |

### 数据源类型

| 类型 | 说明 | 使用场景 |
|------|------|---------|
| `PROJECT` | 项目上下文 | 代码、配置、日志 |
| `KNOWLEDGE` | 知识库 | FAQ、规范、最佳实践 |
| `WEB` | Web 搜索 | 公开搜索引擎 |
| `EXPERIENCE` | 经验池 | 历史经验检索 |
| `CUSTOM` | 自定义 | 自定义数据源 |

### 工作流程

```
Agent 调用搜索工具
        │
        ▼
┌─────────────────────────────────────────┐
│   search.query(keyword="xxx")           │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       SearchFacade                      │
│       路由到合适的 SearchProvider        │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       SearchProvider                    │
│       执行实际搜索                       │
└────────────────┬────────────────────────┘
                 ▼
         返回搜索结果
```

---

## 2. 快速接入方式

### 步骤 1：配置搜索模块

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          search:
            enabled: true
            project-search-enabled: true
            knowledge-search-enabled: true
            web-search-enabled: false
            default-top-k: 10
            search-timeout-ms: 5000
```

### 步骤 2：实现 SearchProvider

```java
import com.alibaba.assistant.agent.extension.search.spi.SearchProvider;
import com.alibaba.assistant.agent.extension.search.model.*;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.ArrayList;

@Component
public class KnowledgeSearchProvider implements SearchProvider {

    private final KnowledgeBaseClient knowledgeClient;

    public KnowledgeSearchProvider(KnowledgeBaseClient knowledgeClient) {
        this.knowledgeClient = knowledgeClient;
    }

    @Override
    public boolean supports(SearchSourceType type) {
        return type == SearchSourceType.KNOWLEDGE;
    }

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        List<SearchResultItem> results = new ArrayList<>();
        
        // 调用知识库搜索
        List<Document> docs = knowledgeClient.search(
            request.getQuery(),
            request.getTopK()
        );
        
        // 转换结果
        for (Document doc : docs) {
            SearchResultItem item = new SearchResultItem();
            item.setId(doc.getId());
            item.setTitle(doc.getTitle());
            item.setContent(doc.getContent());
            item.setSourceType(SearchSourceType.KNOWLEDGE);
            item.setScore(doc.getScore());
            
            // 设置元数据
            SearchMetadata metadata = new SearchMetadata();
            metadata.setSourceName("knowledge-base");
            metadata.getExtensions().put("docId", doc.getId());
            metadata.getExtensions().put("category", doc.getCategory());
            item.setMetadata(metadata);
            
            results.add(item);
        }
        
        return results;
    }

    @Override
    public String getName() {
        return "KnowledgeSearchProvider";
    }
}
```

### 步骤 3：Agent 调用搜索

Agent 生成的代码可以调用搜索工具：

```python
# 搜索知识库
results = search.knowledge(query="如何处理订单超时", top_k=5)
for item in results:
    print(f"标题: {item['title']}")
    print(f"内容: {item['content']}")

# 搜索项目代码
code_results = search.project(query="订单状态枚举", top_k=3)

# 统一搜索（自动选择数据源）
all_results = search.query(keyword="订单处理", sources=["KNOWLEDGE", "PROJECT"])
```

---

## 3. 搜索请求

```java
SearchRequest request = new SearchRequest();
request.setQuery("搜索关键词");
request.getSourceTypes().add(SearchSourceType.KNOWLEDGE);  // 添加数据源类型
request.setTopK(10);
request.getFilters().put("category", "技术文档");
request.getFilters().put("language", "java");
```

---

## 4. 搜索结果

```java
SearchResultItem item = new SearchResultItem();
item.setId("doc-001");
item.setTitle("文档标题");
item.setContent("文档内容...");
item.setSnippet("文档摘要...");
item.setSourceType(SearchSourceType.KNOWLEDGE);
item.setScore(0.95);                     // 相关度分数
item.setUri("https://...");              // 资源链接（可选）

// 设置元数据
SearchMetadata metadata = new SearchMetadata();
metadata.setSourceName("knowledge-base");
metadata.setLanguage("java");
metadata.getExtensions().put("category", "技术文档");
item.setMetadata(metadata);
```

