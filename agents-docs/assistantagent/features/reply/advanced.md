# 回复渠道 - 高级特性

## 1. 多渠道配置

配置多个回复工具，支持不同场景：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          reply:
            enabled: true
            tools:
              # 普通文本消息
              - toolName: send_message
                channelCode: IDE_TEXT
                description: 发送文本消息
                parameters:
                  - name: text
                    type: STRING
                    required: true
              
              # 卡片消息
              - toolName: send_card
                channelCode: IDE_CARD
                description: 发送富文本卡片
                parameters:
                  - name: title
                    type: STRING
                    required: true
                  - name: content
                    type: STRING
                    required: true
                  - name: buttons
                    type: ARRAY
                    required: false
              
              # IM 通知
              - toolName: send_notification
                channelCode: IM_NOTIFICATION
                description: 发送即时通讯通知
                parameters:
                  - name: message
                    type: STRING
                    required: true
                  - name: mentions
                    type: ARRAY
                    required: false
```

Agent 调用：

```python
# 文本消息
reply.send_message(text="任务完成")

# 卡片消息
reply.send_card(
    title="查询结果",
    content="共找到 10 条记录",
    buttons=[{"text": "查看详情", "action": "view"}]
)

# IM 通知
reply.send_notification(
    message="紧急：服务器异常",
    mentions=["user1", "user2"]
)
```

---

## 2. 自定义渠道实现

### Webhook 渠道

```java
@Component
public class WebhookChannelDefinition implements ReplyChannelDefinition {

    private final RestTemplate restTemplate;

    @Override
    public String getChannelCode() {
        return "WEBHOOK";
    }

    @Override
    public String getDescription() {
        return "通过 Webhook 推送消息到外部系统";
    }

    @Override
    public ParameterSchema getSupportedParameters() {
        return ParameterSchema.builder()
            .addParameter("url", ParameterType.STRING, "Webhook URL", true)
            .addParameter("payload", ParameterType.OBJECT, "推送数据", true)
            .build();
    }

    @Override
    public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
        String url = (String) params.get("url");
        Object payload = params.get("payload");
        
        try {
            restTemplate.postForEntity(url, payload, String.class);
            return ReplyResult.success("Webhook 推送成功");
        } catch (Exception e) {
            return ReplyResult.failure("Webhook 推送失败: " + e.getMessage());
        }
    }

    @Override
    public boolean supportsAsync() {
        return true;  // 支持异步执行
    }
}
```

### 钉钉渠道

```java
@Component
public class DingTalkChannelDefinition implements ReplyChannelDefinition {

    private final DingTalkClient dingTalkClient;

    @Override
    public String getChannelCode() {
        return "DINGTALK";
    }

    @Override
    public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
        String message = (String) params.get("message");
        List<String> atUsers = (List<String>) params.get("at_users");
        
        DingTalkMessage msg = DingTalkMessage.builder()
            .msgtype("text")
            .text(new TextContent(message))
            .at(new AtConfig(atUsers))
            .build();
        
        dingTalkClient.send(msg);
        return ReplyResult.success("钉钉消息发送成功");
    }
}
```

---

## 3. 渠道执行上下文

`ChannelExecutionContext` 提供丰富的上下文信息：

```java
@Override
public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
    // 获取会话信息
    String sessionId = context.getSessionId();
    String userId = context.getUserId();
    String projectId = context.getProjectId();
    
    // 获取 Agent 状态
    OverAllState state = context.getState();
    
    // 获取元数据
    Map<String, Object> metadata = context.getMetadata();
    
    // 实现发送逻辑...
}
```

---

## 4. 异步渠道

对于耗时的发送操作，支持异步执行：

```java
@Component
public class EmailChannelDefinition implements ReplyChannelDefinition {

    @Override
    public String getChannelCode() {
        return "EMAIL";
    }

    @Override
    public boolean supportsAsync() {
        return true;  // 启用异步
    }

    @Override
    public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
        String to = (String) params.get("to");
        String subject = (String) params.get("subject");
        String body = (String) params.get("body");
        
        // 异步发送邮件
        emailService.sendAsync(to, subject, body);
        
        return ReplyResult.success("邮件已提交发送");
    }
}
```

---

## 5. 参数映射

将工具参数映射到渠道参数：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          reply:
            tools:
              - toolName: notify_user
                channelCode: IM_NOTIFICATION
                description: 通知用户
                parameters:
                  - name: message
                    type: STRING
                    required: true
                    mappedTo: content     # 映射到渠道的 content 参数
                  - name: priority
                    type: STRING
                    required: false
                    defaultValue: normal   # 默认值
```

---

## 6. 编程方式配置

通过 Bean 配置覆盖 YAML：

```java
import com.alibaba.assistant.agent.extension.reply.spi.ReplyToolConfigProvider;
import com.alibaba.assistant.agent.extension.reply.config.ReplyToolConfig;

@Component
public class CustomReplyToolProvider implements ReplyToolConfigProvider {

    @Override
    public List<ReplyToolConfig> getToolConfigs() {
        List<ReplyToolConfig> configs = new ArrayList<>();
        
        ReplyToolConfig alertTool = new ReplyToolConfig();
        alertTool.setToolName("send_alert");
        alertTool.setChannelCode("ALERT");
        alertTool.setDescription("发送告警消息");
        alertTool.setParameters(List.of(
            createParam("level", "STRING", true, "告警级别"),
            createParam("message", "STRING", true, "告警内容")
        ));
        
        configs.add(alertTool);
        return configs;
    }
}
```

---

## 7. 渠道选择逻辑

根据条件动态选择渠道：

```java
@Component
public class SmartChannelRouter {

    private final Map<String, ReplyChannelDefinition> channels;

    public ReplyResult route(String message, ChannelExecutionContext context) {
        // 根据消息长度选择渠道
        if (message.length() > 500) {
            return channels.get("IDE_CARD").execute(context, 
                Map.of("content", message));
        }
        
        // 根据用户偏好选择渠道
        String preferred = getUserPreferredChannel(context.getUserId());
        if (preferred != null && channels.containsKey(preferred)) {
            return channels.get(preferred).execute(context, 
                Map.of("text", message));
        }
        
        // 默认渠道
        return channels.get("IDE_TEXT").execute(context, 
            Map.of("text", message));
    }
}
```

---

## 8. 消息模板

支持预定义消息模板：

```java
@Component
public class TemplateChannelDefinition implements ReplyChannelDefinition {

    private final TemplateEngine templateEngine;

    @Override
    public String getChannelCode() {
        return "TEMPLATE_MESSAGE";
    }

    @Override
    public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
        String templateName = (String) params.get("template");
        Map<String, Object> variables = (Map<String, Object>) params.get("variables");
        
        // 渲染模板
        String rendered = templateEngine.render(templateName, variables);
        
        // 发送渲染后的消息
        messageSender.send(context.getSessionId(), rendered);
        
        return ReplyResult.success("模板消息发送成功");
    }
}
```

Agent 调用：

```python
reply.template_message(
    template="order_status",
    variables={
        "order_id": "ORD-001",
        "status": "已发货",
        "tracking_number": "SF123456"
    }
)
```

---

## 9. 发送结果处理

处理发送结果：

```java
@Override
public ReplyResult execute(ChannelExecutionContext context, Map<String, Object> params) {
    try {
        // 发送逻辑
        SendResult result = doSend(params);
        
        if (result.isSuccess()) {
            return ReplyResult.success(result.getMessageId());
        } else {
            return ReplyResult.failure(result.getErrorMessage());
        }
    } catch (Exception e) {
        log.error("ChannelDefinition#execute - reason=发送失败", e);
        return ReplyResult.failure("发送失败: " + e.getMessage());
    }
}
```

---

## 10. 日志与监控

```yaml
logging:
  level:
    com.alibaba.assistant.agent.extension.reply: DEBUG
```

```java
@Component
public class ReplyMetrics {

    private final MeterRegistry meterRegistry;

    public void recordSend(String channelCode, boolean success) {
        meterRegistry.counter("reply.send.count",
            "channel", channelCode,
            "result", success ? "success" : "failure"
        ).increment();
    }
}
```

