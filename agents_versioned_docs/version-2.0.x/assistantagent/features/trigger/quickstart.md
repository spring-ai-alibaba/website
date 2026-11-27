# 触发器模块（Trigger）

## 1. 模块介绍

触发器模块提供定时任务和事件触发能力，支持 Agent 创建和管理定时任务，实现自动化执行场景。

### 核心概念

| 概念 | 说明 |
|------|------|
| `TriggerDefinition` | 触发器定义，包含调度策略和执行配置 |
| `ScheduleMode` | 调度模式：CRON、固定延迟、固定频率、一次性 |
| `TriggerManager` | 触发器管理器，负责触发器的注册和调度 |
| `TriggerExecutionRecord` | 触发器执行记录 |

### 调度模式

| 模式 | 说明 | scheduleValue 示例 |
|------|------|-------------------|
| `CRON` | Cron 表达式调度 | `0 0 9 * * ?`（每天9点） |
| `FIXED_DELAY` | 固定延迟（毫秒） | `60000`（每分钟） |
| `FIXED_RATE` | 固定频率（毫秒） | `30000`（每30秒） |
| `ONE_TIME` | 一次性执行 | `2024-12-31T23:59:59Z` |
| `TRIGGER` | 自定义 Trigger | 自定义实现 |

### 工作流程

```
Agent 创建触发器
        │
        ▼
┌─────────────────────────────────────────┐
│       trigger.create_trigger(...)       │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       TriggerManager                    │
│       注册触发器到调度器                  │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       Scheduler                         │
│       按调度策略执行任务                  │
└────────────────┬────────────────────────┘
                 ▼
         执行 Agent 任务
```

---

## 2. 快速接入方式

### 步骤 1：配置触发器模块

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          trigger:
            enabled: true
            scheduler:
              pool-size: 10
            execution:
              default-max-retries: 3
              execution-timeout: 300000  # 5分钟
```

### 步骤 2：Agent 创建触发器

Agent 可以通过内置工具创建定时任务：

```python
# 创建 Cron 定时任务
trigger.create_trigger(
    name="每日报告",
    description="每天上午9点生成日报",
    schedule_mode="CRON",
    schedule_value="0 0 9 * * ?",
    execute_function="generate_daily_report",
    parameters={"report_type": "daily"}
)

# 创建一次性任务
trigger.create_trigger(
    name="延迟提醒",
    description="1小时后提醒",
    schedule_mode="ONE_TIME",
    schedule_value="2024-01-08T10:00:00Z",
    execute_function="send_reminder",
    parameters={"message": "会议即将开始"}
)

# 创建固定频率任务
trigger.create_trigger(
    name="健康检查",
    description="每5分钟检查服务状态",
    schedule_mode="FIXED_RATE",
    schedule_value="300000",
    execute_function="health_check"
)
```

### 步骤 3：管理触发器

```python
# 列出所有触发器
triggers = trigger.list_triggers()

# 暂停触发器
trigger.pause_trigger(trigger_id="trigger-001")

# 恢复触发器
trigger.resume_trigger(trigger_id="trigger-001")

# 删除触发器
trigger.delete_trigger(trigger_id="trigger-001")
```

---

## 3. 触发器定义

```java
TriggerDefinition trigger = new TriggerDefinition();
trigger.setTriggerId("trigger-001");
trigger.setName("每日报告");
trigger.setDescription("每天生成日报");
trigger.setScheduleMode(ScheduleMode.CRON);
trigger.setScheduleValue("0 0 9 * * ?");
trigger.setExecuteFunction("generate_report");
trigger.setParameters(Map.of("type", "daily"));
trigger.setMaxRetries(3);
trigger.setRetryDelay(5000L);
trigger.setExpireAt(Instant.parse("2025-12-31T23:59:59Z"));
```

---

## Cron 表达式示例

| 表达式 | 说明 |
|--------|------|
| `0 0 9 * * ?` | 每天9:00 |
| `0 30 8 * * MON-FRI` | 工作日8:30 |
| `0 0 */2 * * ?` | 每2小时 |
| `0 0 0 1 * ?` | 每月1号0:00 |
| `0 0 12 ? * WED` | 每周三12:00 |

