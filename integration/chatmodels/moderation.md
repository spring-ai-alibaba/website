# 内容审核

Spring AI 的 `ModerationModel` 用于评估内容是否触发提供方的审核类别。适合在消息送给聊天模型之前，或结果发给用户之前调用。应用根据分类与业务策略决定是否拦截、转人工或继续。

## 接入 OpenAI

在 Spring AI BOM 下加入 `org.springframework.ai:spring-ai-starter-model-openai`：

```properties
spring.ai.model.moderation=openai
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.moderation.model=omni-moderation-latest
```

注入 `ModerationModel` 后读取结果：

```java
import org.springframework.ai.moderation.ModerationPrompt;
import org.springframework.ai.moderation.ModerationResult;

var result = moderationModel.call(new ModerationPrompt(userText));
boolean flagged = result.getResult().getOutput().getResults().stream()
        .anyMatch(ModerationResult::isFlagged);
```

提供方类别和阈值会影响结果。将服务调用失败与正常审核判定分别处理，并为审核结果配置业务动作。还可选择 [Mistral AI 审核](https://docs.spring.io/spring-ai/reference/api/moderation/mistral-ai-moderation.html)。需要自定义语义判定，例如给客服工单分类，可使用 [Decision Models](../decision-models/overview.md)。

[Spring AI Moderation 参考](https://docs.spring.io/spring-ai/reference/api/moderation.html)

## 分类与拒绝在 Advisor 中的用法

对输入或输出做自定义语义筛查时，可结合 [Decision Models](../decision-models/overview.md) 和社区维护的 [Spring AI Decision Extensions](https://spring-ai-community.github.io/spring-ai-decision-extensions/)。其中提供 `DecisionGuardrailAdvisor`、`DecisionJudge` 和 `DecisionSelfRefineAdvisor`。如果自定义 Advisor 拒绝请求，使用 Spring AI 的 `GuardrailRefusal` 标记响应，使结构化校验跳过重试、语义缓存跳过写入。调用方可统一按 [内容过滤](../chatclient.md#处理内容过滤与用量) 处理。
