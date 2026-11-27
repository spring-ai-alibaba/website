# 经验模块（Experience）

## 1. 模块介绍

经验模块是 Assistant Agent 的知识积累与复用机制，支持将最佳实践、代码模式、行为策略等以"经验"的形式存储，并在 Agent 执行时自动检索和注入。

### 核心概念

| 概念 | 说明 |
|------|------|
| `Experience` | 经验领域对象，包含类型、标题、内容、元数据等 |
| `ExperienceType` | 经验类型：CODE（代码经验）、REACT（行为经验）、COMMON（通用常识） |
| `ExperienceProvider` | 经验读取 SPI，负责检索经验 |
| `FastIntentService` | 快速意图服务，根据条件直接匹配经验执行 |

### 经验类型

| 类型 | 说明 | 应用场景 |
|------|------|---------|
| `CODE` | 代码经验 | 代码片段、编码规范、最佳实践 |
| `REACT` | 行为经验 | Agent 行为策略、工具调用模式 |
| `COMMON` | 通用常识 | 安全提示、注意事项、规范约束 |

### 工作流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────┐
│         FastIntent 快速匹配（可选）       │
│   条件匹配 → 直接执行经验产物             │
└────────────────┬────────────────────────┘
    未匹配 ↓
┌─────────────────────────────────────────┐
│         ExperienceProvider              │
│   根据输入检索相关经验                    │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│         PromptBuilder                    │
│   将经验注入到 System Prompt             │
└────────────────┬────────────────────────┘
                 ▼
         Agent 执行（参考经验）
```

---

## 2. 快速接入方式

### 步骤 1：配置经验模块

```yaml
# application.yml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            enabled: true
            code-experience-enabled: true
            react-experience-enabled: true
            common-experience-enabled: true
            max-items-per-query: 5
            in-memory:
              enabled: true
```

### 步骤 2：实现 ExperienceProvider

```java
import com.alibaba.assistant.agent.extension.experience.spi.ExperienceProvider;
import com.alibaba.assistant.agent.extension.experience.model.*;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.ArrayList;

@Component
public class MyExperienceProvider implements ExperienceProvider {

    @Override
    public List<Experience> query(ExperienceQuery query, ExperienceQueryContext context) {
        List<Experience> experiences = new ArrayList<>();
        
        // 根据查询条件检索经验
        // 这里简单演示，实际可从数据库/向量库检索
        if (query.getType() == ExperienceType.CODE) {
            experiences.add(createCodeExperience());
        }
        
        return experiences;
    }
    
    private Experience createCodeExperience() {
        Experience exp = new Experience();
        exp.setType(ExperienceType.CODE);
        exp.setTitle("日志规范");
        exp.setContent("""
            代码中的日志应遵循以下格式：
            logger.info("类名#方法名 - reason=说明原因");
            
            示例：
            logger.info("UserService#createUser - reason=创建用户成功, userId={}", user.getId());
            """);
        exp.getTags().add("logging");
        return exp;
    }
}
```

### 步骤 3：初始化经验数据

```java
import com.alibaba.assistant.agent.extension.experience.ExperienceDataInitializer;
import com.alibaba.assistant.agent.extension.experience.model.*;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.util.List;

@Component
public class MyExperienceInitializer {

    private final ExperienceDataInitializer initializer;

    public MyExperienceInitializer(ExperienceDataInitializer initializer) {
        this.initializer = initializer;
    }

    @PostConstruct
    public void init() {
        // 初始化代码经验
        Experience codeExp = new Experience();
        codeExp.setType(ExperienceType.CODE);
        codeExp.setTitle("异常处理规范");
        codeExp.setContent("捕获异常时需要记录完整堆栈...");
        
        // 初始化行为经验
        Experience reactExp = new Experience();
        reactExp.setType(ExperienceType.REACT);
        reactExp.setTitle("查询订单流程");
        reactExp.setContent("当用户询问订单状态时，优先调用 order.get_status...");
        
        initializer.initialize(List.of(codeExp, reactExp));
    }
}
```

---

## 3. 经验结构

```java
Experience exp = new Experience();
exp.setId("exp-001");                        // 唯一 ID
exp.setType(ExperienceType.CODE);            // 经验类型
exp.setTitle("日志格式规范");                 // 标题
exp.setContent("日志格式为...");              // 主体内容
exp.setScope(ExperienceScope.GLOBAL);        // 生效范围
exp.setOwnerId("user-123");                  // 所属用户
exp.setProjectId("project-456");             // 所属项目
exp.setLanguage("java");                     // 编程语言
exp.getTags().add("logging");                // 标签
exp.getTags().add("best-practice");
```

---

## 经验生效范围

| ExperienceScope | 说明 |
|-----------------|------|
| `GLOBAL` | 全局生效 |
| `PROJECT` | 项目级别生效 |
| `USER` | 用户级别生效 |
| `SESSION` | 会话级别生效 |

