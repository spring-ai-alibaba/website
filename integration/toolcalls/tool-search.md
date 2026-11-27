# 工具发现与按需加载

`ToolSearchToolCallingAdvisor` 适用于工具目录大、每次请求只用少数工具的应用。模型可先搜索工具目录，将相关工具定义加入当前工具循环。执行仍由工具调用管理器负责，可继续使用工具审批与调用次数限制。参见 [工具调用](tool-calls.md)。

## 启用与选择索引

在 Spring AI 2.1 BOM 下加入 `org.springframework.ai:spring-ai-starter-tool-search-advisor`。以下配置使用依赖少的正则匹配索引：

```properties
spring.ai.chat.client.tool-search-advisor.enabled=true
spring.ai.chat.client.tool-search-advisor.tool-index-type=regex
spring.ai.chat.client.tool-search-advisor.max-results=5
```

- `regex` 匹配工具名称和描述，适合有明确关键词的目录。
- `lucene` 使用关键词索引，可处理较大的目录。
- `vector` 通过 `VectorStore` 搜索语义相关工具。
- `decision` 使用 [DecisionModel](../decision-models/overview.md) 选择工具。
- 自定义 `ToolIndex` Bean 可替换自动配置的索引。

开启后，使用注入的 `ChatClient.Builder` 获取此 Advisor。按请求传入与身份关联的会话标识，索引作用域随会话隔离：

```java
import org.springframework.ai.chat.client.advisor.api.MemoryAdvisor;

var client = chatClientBuilder.defaultTools(catalogTools).build();
String answer = client.prompt()
        .user(question)
        .advisors(a -> a.param(MemoryAdvisor.CONVERSATION_ID, conversationId))
        .call()
        .content();
```

注册工具前按用户权限筛选工具集。索引会话及其淘汰策略用于管理加载状态，工具本身的权限检查仍在执行层生效。自定义逐轮策略和索引配置见 [Spring AI Tool Search Tool](https://docs.spring.io/spring-ai/reference/api/tools/tool-search-tool.html)。
