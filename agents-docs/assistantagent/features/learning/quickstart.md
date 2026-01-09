# 学习模块（Learning）

## 1. 模块介绍

学习模块是 Assistant Agent 的自动经验提取机制，从 Agent 执行过程中自动提取有价值的模式和经验，存储到经验库供后续复用。

### 核心概念

| 概念 | 说明 |
|------|------|
| `LearningExtractor` | 学习提取器，从上下文中提取学习记录 |
| `LearningRepository` | 学习仓库，负责学习记录的持久化存储 |
| `LearningStrategy` | 学习策略，协调提取器和仓库 |
| `LearningExecutor` | 学习执行器，执行学习流程 |
| `LearningContext` | 学习上下文，包含 Agent 执行信息 |

### 学习触发时机

| 时机 | 说明 | 配置项 |
|------|------|--------|
| Agent 执行后 | 完整会话结束后提取经验 | `online.after-agent.enabled` |
| 模型调用后 | 每次 LLM 调用后提取模式 | `online.after-model.enabled` |
| 工具执行后 | 工具调用完成后提取记录 | `online.tool-interceptor.enabled` |
| 离线批量 | 定时任务批量处理历史数据 | `offline.enabled` |

### 工作流程

```
Agent 执行完成
        │
        ▼
┌─────────────────────────────────────────┐
│         LearningContext                  │
│   收集：输入、输出、代码、工具调用等        │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│         LearningExtractor               │
│   判断 shouldLearn() → extract()        │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│         LearningRepository              │
│   保存学习记录到存储                      │
└────────────────┬────────────────────────┘
                 ▼
         经验库更新完成
```

---

## 2. 快速接入方式

### 步骤 1：配置学习模块

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            enabled: true
            online:
              enabled: true
              after-agent:
                enabled: true
                learning-types:
                  - experience    # 提取经验
            async:
              enabled: true
              core-pool-size: 2
              max-pool-size: 4
```

### 步骤 2：实现自定义 LearningExtractor

````java
import com.alibaba.assistant.agent.extension.learning.spi.LearningExtractor;
import com.alibaba.assistant.agent.extension.learning.model.LearningContext;
import com.alibaba.assistant.agent.extension.experience.model.Experience;
import com.alibaba.assistant.agent.extension.experience.model.ExperienceType;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.ArrayList;

@Component
public class CodePatternExtractor implements LearningExtractor<Experience> {

    @Override
    public boolean shouldLearn(LearningContext context) {
        // 判断是否需要学习
        // 通过 customData 判断执行是否成功
        Object isSuccess = context.getCustomData().get("success");
        return Boolean.TRUE.equals(isSuccess) && 
               !context.getToolCallRecords().isEmpty();
    }

    @Override
    public List<Experience> extract(LearningContext context) {
        List<Experience> experiences = new ArrayList<>();
        
        // 从执行上下文中提取经验
        // 通过 customData 获取用户输入和生成的代码
        String userInput = (String) context.getCustomData().get("userInput");
        String generatedCode = (String) context.getCustomData().get("generatedCode");
        String output = (String) context.getCustomData().get("output");
        
        // 创建代码经验
        Experience exp = new Experience();
        exp.setType(ExperienceType.CODE);
        exp.setTitle("代码模式: " + summarize(userInput));
        exp.setContent(String.format("""
            ## 用户需求
            %s
            
            ## 解决方案
            ```python
            %s
            ```
            
            ## 执行结果
            %s
            """, userInput, generatedCode, output));
        
        experiences.add(exp);
        return experiences;
    }

    @Override
    public String getSupportedLearningType() {
        return "experience";
    }

    @Override
    public Class<Experience> getRecordType() {
        return Experience.class;
    }
    
    private String summarize(String input) {
        if (input == null) return "";
        return input.length() > 50 ? input.substring(0, 50) + "..." : input;
    }
}
````

### 步骤 3：实现 LearningRepository（可选）

使用默认的内存/Store 实现，或自定义：

```java
import com.alibaba.assistant.agent.extension.learning.spi.LearningRepository;
import com.alibaba.assistant.agent.extension.learning.model.LearningSearchRequest;
import com.alibaba.assistant.agent.extension.experience.model.Experience;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class DatabaseLearningRepository implements LearningRepository<Experience> {

    private final ExperienceDao experienceDao;

    @Override
    public void save(String namespace, String key, Experience record) {
        record.setId(key);
        experienceDao.insert(record);
    }

    @Override
    public void saveBatch(String namespace, List<Experience> records) {
        experienceDao.batchInsert(records);
    }

    @Override
    public Experience get(String namespace, String key) {
        return experienceDao.findById(key);
    }

    @Override
    public List<Experience> search(LearningSearchRequest request) {
        return experienceDao.search(request.getQuery(), request.getLimit());
    }

    @Override
    public void delete(String namespace, String key) {
        experienceDao.deleteById(key);
    }

    @Override
    public Class<Experience> getSupportedRecordType() {
        return Experience.class;
    }
}
```

---

## 3. 学习上下文

`LearningContext` 包含 Agent 执行的完整信息：

```java
// 获取学习上下文中的信息
Object overAllState = context.getOverAllState();                      // Agent 执行状态
List<Object> conversationHistory = context.getConversationHistory();  // 对话历史
List<ToolCallRecord> toolCalls = context.getToolCallRecords();        // 工具调用记录
List<ModelCallRecord> modelCalls = context.getModelCallRecords();     // 模型调用记录
Map<String, Object> customData = context.getCustomData();             // 自定义数据
LearningTriggerSource triggerSource = context.getTriggerSource();     // 触发来源
```

