---
title: Decision Models
description: 用 Spring AI 2.1 的类型化判定 API 实现分类、路由与评分。
---

# Decision Models

Spring AI 2.1 提供 `DecisionModel`。应用把输入和一组带名称的问题交给模型，分别得到布尔判定、有限选项或评分等级。适合工单分流、工具筛选和 RAG 文档判定。需要生成自然语言答复或复杂结构时，使用 [ChatClient](../chatclient.md)。

## 选择服务和依赖

用 [版本对照](/docs/versions) 配置 BOM，从下表选择一个 `org.springframework.ai` starter。项目有多个候选依赖时，显式设置 `spring.ai.model.decision`。

| 服务 | Starter | `spring.ai.model.decision` | 连接与模型 |
| --- | --- | --- | --- |
| Ollama | `spring-ai-starter-model-ollama` | `ollama` | `spring.ai.ollama.base-url`，`spring.ai.ollama.decision.model` |
| OpenAI | `spring-ai-starter-model-openai` | `openai` | `spring.ai.openai.api-key`，`spring.ai.openai.decision.model` |
| System One 协议端点 | `spring-ai-starter-model-systemone` | `systemone` | `spring.ai.systemone.base-url`、`spring.ai.systemone.api-key` 和 `spring.ai.systemone.decision.model` |

本地示例使用支持 Decision API 的 Ollama 0.40.4 或更新版本。启动 Ollama 后执行 `ollama pull d1-omni:600m`，加入 Ollama starter，并配置：

```properties
spring.ai.model.decision=ollama
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.decision.model=d1-omni:600m
```

OpenAI 与 System One 接入需要具备对应判定服务权限。将端点、密钥和模型名替换为对应服务实际开通的配置。具体参数参见 [Ollama](https://docs.spring.io/spring-ai/reference/api/decision/ollama-decision.html)、[OpenAI](https://docs.spring.io/spring-ai/reference/api/decision/openai-decision.html) 和 [System One](https://docs.spring.io/spring-ai/reference/api/decision/systemone-decision.html)。

百炼 Decision Model 使用 System One 协议适配器。业务空间、地域和当前预览模型的配置见 [百炼 Decision Model](../chatmodels/dashScope.md#百炼-decision-model)。

## 执行和读取判定

注入 starter 配置的 `DecisionModel`。下面的请求一次评估三个问题，各结果通过问题名称读取：

```java
import org.springframework.ai.decision.DecisionPrompt;
import org.springframework.ai.decision.question.ChoiceQuestion;
import org.springframework.ai.decision.question.ScoreQuestion;
import org.springframework.ai.decision.question.YesNoQuestion;

var response = decisionModel.call(DecisionPrompt.builder()
        .text("包裹昨天到了，配件少了一件，我想尽快补发。")
        .question("missing", YesNoQuestion.of("客户是否报告缺件？"))
        .question("team", ChoiceQuestion.of("转交哪个团队？", "物流", "售后", "账户", "人工分流"))
        .question("urgency", ScoreQuestion.of("请求有多紧急？", "低", "中", "高"))
        .build());

boolean autoOpenTicket = response.hasAnswer("missing")
        && !response.isRefused("missing")
        && response.getYesNo("missing").isYes(0.9);
String team = response.hasAnswer("team") && !response.isRefused("team")
        ? response.getChoice("team").getValue() : "人工分流";
int urgency = response.hasAnswer("urgency") && !response.isRefused("urgency")
        ? response.getScore("urgency").getNearestLevel() : 0;
```

- `YesNoAnswer.getProbability()` 返回「是」的概率，`isYes(threshold)` 应用业务阈值。
- `ChoiceAnswer.getValue()` 返回一个选项。可按提供方返回的数据读取排序、概率及置信度，需要表达「无法归类」时应提供对应选项。
- `ScoreAnswer.getNearestLevel()` 返回从零开始的最可能等级，`getValue()` 返回各等级的概率加权期望。高风险动作可使用应用自定义的回退路径。
- 拒绝发生在单个问题上。读取强类型结果前检查 `hasAnswer(name)` 和 `isRefused(name)`。用业务样本为各模型和问题分别校准阈值。

在框架内，可把 `DecisionModel` 传给 [RAG 文档后处理器](../rag/decision-post-processors.md) 或 [工具发现 Advisor](../toolcalls/tool-search.md)。输入可用单段文本、按角色组织的消息，或文档等任务上下文。更多输入形式和选项见 [Spring AI Decision Model 参考](https://docs.spring.io/spring-ai/reference/api/decision.html)。
