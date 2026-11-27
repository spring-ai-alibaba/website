# 触发器模块 - 高级特性

## 1. 条件触发

设置触发条件函数，只在满足条件时执行：

```python
# 创建带条件的触发器
trigger.create_trigger(
    name="条件触发任务",
    schedule_mode="CRON",
    schedule_value="0 */10 * * * ?",  # 每10分钟检查
    condition_function="should_run",   # 条件函数
    execute_function="do_task",
    parameters={"threshold": 100}
)

# 条件函数定义（由 Agent 生成）
def should_run(context):
    # 只在队列长度超过阈值时执行
    queue_length = get_queue_length()
    return queue_length > context.parameters["threshold"]
```

---

## 2. 重试策略

配置任务失败重试：

```python
trigger.create_trigger(
    name="可重试任务",
    schedule_mode="CRON",
    schedule_value="0 0 * * * ?",
    execute_function="risky_task",
    max_retries=3,           # 最大重试次数
    retry_delay=5000         # 重试延迟（毫秒）
)
```

配置默认重试策略：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          trigger:
            execution:
              default-max-retries: 3
              default-retry-delay: 1000
```

---

## 3. 触发器生命周期

### 状态流转

```
CREATED → SCHEDULED → RUNNING → COMPLETED
                   ↘          ↗
                    → FAILED →
                   ↘
                    → PAUSED → RESUMED
                   ↘
                    → CANCELLED
```

### 触发器状态

| 状态 | 说明 |
|------|------|
| `CREATED` | 已创建，未调度 |
| `SCHEDULED` | 已调度，等待执行 |
| `RUNNING` | 正在执行 |
| `COMPLETED` | 执行完成 |
| `FAILED` | 执行失败 |
| `PAUSED` | 已暂停 |
| `CANCELLED` | 已取消 |
| `EXPIRED` | 已过期 |

---

## 4. 执行超时控制

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          trigger:
            execution:
              execution-timeout: 300000  # 5分钟超时
```

单个触发器超时设置：

```python
trigger.create_trigger(
    name="长时间任务",
    schedule_mode="CRON",
    schedule_value="0 0 2 * * ?",
    execute_function="long_running_task",
    metadata={"execution_timeout": 3600000}  # 1小时超时
)
```

---

## 5. 触发器过期

设置触发器过期时间：

```python
trigger.create_trigger(
    name="限时任务",
    schedule_mode="FIXED_RATE",
    schedule_value="60000",
    execute_function="temporary_task",
    expire_at="2024-12-31T23:59:59Z"  # 到期后自动停止
)
```

---

## 6. 事件驱动触发

除了定时触发，还支持事件驱动：

```python
# HTTP Webhook 触发
trigger.create_trigger(
    name="Webhook触发器",
    event_protocol="http_webhook",
    event_key="/api/trigger/order-created",
    execute_function="handle_order",
    parameters={}
)

# 消息队列触发
trigger.create_trigger(
    name="MQ触发器",
    event_protocol="mq",
    event_key="topic:order-events",
    execute_function="process_order_event"
)
```

---

## 7. 会话快照绑定

将触发器绑定到特定会话状态：

```python
trigger.create_trigger(
    name="会话恢复任务",
    schedule_mode="ONE_TIME",
    schedule_value="2024-01-09T09:00:00Z",
    execute_function="resume_task",
    session_snapshot_id="snapshot-123",  # 恢复到此会话状态
    agent_name="my-agent"
)
```

---

## 8. 触发器仓库

自定义触发器存储：

```java
import com.alibaba.assistant.agent.extension.trigger.repository.TriggerRepository;

@Component
public class DatabaseTriggerRepository implements TriggerRepository {

    private final TriggerDao triggerDao;

    @Override
    public void save(TriggerDefinition trigger) {
        triggerDao.insert(trigger);
    }

    @Override
    public TriggerDefinition findById(String triggerId) {
        return triggerDao.findById(triggerId);
    }

    @Override
    public List<TriggerDefinition> findByStatus(TriggerStatus status) {
        return triggerDao.findByStatus(status);
    }

    @Override
    public void updateStatus(String triggerId, TriggerStatus status) {
        triggerDao.updateStatus(triggerId, status);
    }
}
```

---

## 9. 执行记录查询

```python
# 查询触发器执行历史
records = trigger.get_execution_history(
    trigger_id="trigger-001",
    limit=10
)

for record in records:
    print(f"执行时间: {record['executed_at']}")
    print(f"状态: {record['status']}")
    print(f"结果: {record['result']}")
```

---

## 10. 监控与告警

```java
@Component
public class TriggerMonitor {

    @EventListener
    public void onTriggerFailed(TriggerFailedEvent event) {
        log.error("TriggerMonitor#onTriggerFailed - reason=触发器执行失败, triggerId={}", 
            event.getTriggerId());
        
        // 发送告警
        alertService.send("Trigger failed: " + event.getTriggerId());
    }

    @EventListener
    public void onTriggerCompleted(TriggerCompletedEvent event) {
        // 记录指标
        metricsService.recordExecution(
            event.getTriggerId(),
            event.getDurationMs()
        );
    }
}
```

---

## 11. 调度器配置

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          trigger:
            scheduler:
              pool-size: 10                    # 线程池大小
              await-termination-seconds: 60    # 关闭等待时间
```

---

## 12. 触发器工具扩展

自定义触发器相关的 CodeAct 工具：

```java
@Component
public class TriggerStatusTool implements CodeactTool {

    private final TriggerManager triggerManager;

    @Override
    public String call(String toolInput) {
        Map<String, Object> params = parseInput(toolInput);
        String triggerId = (String) params.get("trigger_id");
        
        TriggerDefinition trigger = triggerManager.getTrigger(triggerId);
        
        return toJson(Map.of(
            "id", trigger.getTriggerId(),
            "name", trigger.getName(),
            "status", trigger.getStatus(),
            "next_execution", getNextExecutionTime(trigger)
        ));
    }

    @Override
    public CodeactToolDefinition getCodeactDefinition() {
        return DefaultCodeactToolDefinition.builder()
            .name("get_trigger_status")
            .description("获取触发器状态")
            .parameterTree(ParameterTree.builder()
                .addParameter(ParameterNode.builder()
                    .name("trigger_id")
                    .type(ParameterType.STRING)
                    .required(true)
                    .build())
                .build())
            .build();
    }

    @Override
    public CodeactToolMetadata getCodeactMetadata() {
        return DefaultCodeactToolMetadata.builder()
            .targetClassName("trigger")
            .build();
    }
}
```

