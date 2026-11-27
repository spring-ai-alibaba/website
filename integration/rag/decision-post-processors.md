# Decision Model 文档后处理

Spring AI 2.1 的 `spring-ai-rag` 模块提供 `DecisionDocumentFilter` 和 `DecisionDocumentReranker`。它们在检索之后、生成答案之前处理候选文档。先按调用方权限设置检索元数据过滤，再把文档交给这些处理器。对于需要评估的材料，应确认决策服务可以接收相应的文档内容。

## 在检索 Advisor 中组合

参考 [Decision Model](../decision-models/overview.md) 配置模型。下例先筛查检索到的前 12 篇文档，再取重排后的前 5 篇：

```java
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.postretrieval.document.DecisionDocumentFilter;
import org.springframework.ai.rag.postretrieval.document.DecisionDocumentReranker;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;

var advisor = RetrievalAugmentationAdvisor.builder()
        .documentRetriever(VectorStoreDocumentRetriever.builder()
                .vectorStore(vectorStore)
                .topK(12)
                .build())
        .documentPostProcessors(
                DecisionDocumentFilter.builder(decisionModel).failClosed(true).build(),
                DecisionDocumentReranker.builder(decisionModel).topK(5).build())
        .build();

String answer = chatClient.prompt()
        .user(question)
        .advisors(advisor)
        .call()
        .content();
```

## 过滤与评分

| 组件 | 行为 | 策略 |
| --- | --- | --- |
| `DecisionDocumentFilter` | 分别判断文档是否包含注入指令、与问题前提是否冲突、是否相关、是否有可用于回答的证据。注入或无关文档可被过滤，与前提冲突的证据保留并归类。 | 默认评估失败时保留文档，`failClosed(true)` 则丢弃未完成分类的文档。可通过 `decision.classification` 读取通过分类的文档。 |
| `DecisionDocumentReranker` | 按查询和文档内容进行评分，降序排列。已评分结果附带 `decision.rerank.score`。 | 用 `topK` 限制输出篇数，用 `minimumScore` 淘汰低分结果。未取得分数的文档排在已评分文档之后，仍受 `topK` 限制。 |

候选文档越多，判定请求越多。可限制检索篇数和处理器的并发数及超时。保留默认的空上下文行为时，筛查后没有文档会由 `ContextualQueryAugmenter` 提示模型缺少作答所需的依据。各类阈值、归类和回退行为见 [Spring AI RAG 参考](https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html)。
