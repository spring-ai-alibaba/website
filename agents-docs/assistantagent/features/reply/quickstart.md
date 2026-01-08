# 回复渠道模块（Reply）

## 1. 模块介绍

回复渠道模块提供 Agent 与用户交互的多渠道能力，支持配置多种回复工具（如文本消息、卡片、通知等），让 Agent 能够通过不同渠道向用户发送消息。

### 核心概念

| 概念 | 说明 |
|------|------|
| `ReplyChannelDefinition` | 回复渠道定义，定义渠道能力和执行逻辑 |
| `ReplyToolConfig` | 回复工具配置，通过 YAML 配置生成工具 |
| `ReplyCodeactTool` | 回复工具实例，供 Agent 调用 |
| `ChannelExecutionContext` | 渠道执行上下文，包含会话和用户信息 |

### 工作流程

```
Agent 生成代码
        │
        ▼
┌─────────────────────────────────────────┐
│   reply.send_message(text="Hello")      │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       ReplyCodeactTool                  │
│       (根据 channelCode 路由)            │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       ReplyChannelDefinition            │
│       (执行实际发送逻辑)                  │
└────────────────┬────────────────────────┘
                 ▼
         消息发送到用户
```

---

## 2. 快速接入方式

### 步骤 1：配置回复工具

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          reply:
            enabled: true
            tools:
              # 文本消息工具
              - toolName: send_message
                channelCode: IDE_TEXT
                description: 发送文本消息给用户
                reactEnabled: true
                codeActEnabled: true
                parameters:
                  - name: text
                    type: STRING
                    required: true
                    description: 消息内容
```

### 步骤 2：实现 ReplyChannelDefinition

```java
import com.alibaba.assistant.agent.extension.reply.spi.ReplyChannelDefinition;
import com.alibaba.assistant.agent.extension.reply.model.*;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class TextChannelDefinition implements ReplyChannelDefinition {

    @Override
    public String getChannelCode() {
        return "IDE_TEXT";
    }

    @Override
    public String getDescription() {
        return "发送纯文本消息到 IDE";
    }

    @Override
    public ParameterSchema getSupportedParameters() {
        return ParameterSchema.builder()
            .addParameter("text", ParameterType.STRING, "消息文本", true)
            .build();
    }

    @Override
    public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
        String text = (String) params.get("text");
        String sessionId = context.getSessionId();
        
        // 实际发送逻辑（如 WebSocket、SSE 等）
        messageSender.send(sessionId, text);
        
        return ReplyResult.success("消息已发送");
    }
}
```

### 步骤 3：Agent 调用

Agent 生成的代码可以调用配置的回复工具：

```python
# Agent 生成的代码
reply.send_message(text="查询完成，共找到 10 条记录")
```

---

## 3. 默认配置

模块默认提供 `send_message` 工具：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          reply:
            enabled: true
            tools:
              - toolName: send_message
                channelCode: IDE_TEXT
                description: Send a message to the user
                reactEnabled: true
                codeActEnabled: true
                parameters:
                  - name: text
                    type: STRING
                    required: true
                    description: The message text to send
```

---

## 4. 参数类型

| 类型 | 说明 |
|------|------|
| `STRING` | 字符串 |
| `INTEGER` | 整数 |
| `NUMBER` | 浮点数 |
| `BOOLEAN` | 布尔值 |
| `ARRAY` | 数组 |
| `OBJECT` | 对象 |

---

## 常见渠道类型

| 渠道 | 说明 | 使用场景 |
|------|------|---------|
| `IDE_TEXT` | IDE 文本消息 | 开发工具内消息 |
| `IDE_CARD` | IDE 卡片消息 | 富文本、结构化展示 |
| `IM_NOTIFICATION` | IM 通知 | 钉钉、企微等 |
| `WEBHOOK` | Webhook 推送 | 外部系统集成 |
| `EMAIL` | 邮件 | 异步通知 |

