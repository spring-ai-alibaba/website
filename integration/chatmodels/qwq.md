---
sidebar_position: 8
---

# Qwen 推理模型

QwQ 32B 和 Qwen 的其他推理模型可通过 [DashScope](dashScope.md) 接入。选择百炼当前向业务空间开放的模型，并按模型文档配置思考模式；需要继续使用 `qwq-32b` 时，先确认该模型仍在所在地域可用。

使用 Extensions 2.1.0.0 的 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`，将部署环境中的 `DASHSCOPE_API_KEY` 和模型名传入配置：

```properties
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
spring.ai.dashscope.chat.model=${DASHSCOPE_CHAT_MODEL}
```

## 获取推理内容

注入配置好的 `ChatModel`。推理片段和最终正文可以分别读取：

```java
import org.springframework.ai.chat.prompt.Prompt;

var output = chatModel.call(new Prompt("如何判断一次库存盘点存在误差？"))
        .getResult()
        .getOutput();
var reasoning = output.getReasoning();
String answer = output.getText();
```

如果模型只支持流式调用，使用 `ChatModel.stream(Prompt)` 或 `ChatClient.stream()`。多轮回放请保留完整消息及其有序片段。参见 [DashScope 推理消息与回放](dashScope.md) 和 [Session Memory](../chatclient.md#session-memory)。
