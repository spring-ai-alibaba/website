# 项目结构与主入口

## 1. 模块介绍

Assistant Agent 采用模块化设计，基于 Spring Boot 3.4 + Spring AI Alibaba 构建。项目由以下核心模块组成：

### 模块概览

```
assistant-agent/
├── assistant-agent-common          # 通用层：工具接口定义、枚举、常量
├── assistant-agent-core            # 核心层：GraalVM 执行器、工具注册表
├── assistant-agent-extensions      # 扩展层：各功能模块实现
├── assistant-agent-prompt-builder  # Prompt 动态组装
├── assistant-agent-evaluation      # 评估引擎
├── assistant-agent-autoconfigure   # Spring Boot 自动配置
└── assistant-agent-start           # 启动模块（示例应用）
```

### 核心类说明

| 类名 | 所属模块 | 职责 |
|------|---------|------|
| `CodeactAgent` | autoconfigure | Agent 主体，继承自 ReactAgent，提供代码生成与执行能力 |
| `GraalCodeExecutor` | core | GraalVM 代码执行器，在沙箱中安全执行 AI 生成的代码 |
| `CodeactToolRegistry` | core | 工具注册表，管理所有可供 Agent 调用的工具 |
| `CodeactTool` | common | 工具接口，所有自定义工具需实现此接口 |

### 执行流程

```
用户输入
    │
    ▼
┌─────────────────────┐
│   Evaluation        │  ← 多维度评估（可选）
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   PromptBuilder     │  ← 动态组装 Prompt
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   CodeactAgent      │  ← Agent 主循环（Think → Code → Execute）
│   (ReactAgent)      │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  GraalCodeExecutor  │  ← 安全执行 Python/JS 代码
└─────────┬───────────┘
          ▼
      输出结果
```

---

## 2. 快速接入方式

### 最小配置启动

**步骤 1：添加依赖**

在你的项目 `pom.xml` 中添加：

```xml
<dependency>
    <groupId>com.alibaba.assistant</groupId>
    <artifactId>assistant-agent-autoconfigure</artifactId>
    <version>${assistant-agent.version}</version>
</dependency>
```

**步骤 2：配置 API Key**

```yaml
# application.yml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-max
```

**步骤 3：启用 ComponentScan**

```java
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.your.package",
    "com.alibaba.assistant.agent.autoconfigure",
    "com.alibaba.assistant.agent.extension"
})
public class YourApplication {
    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

**步骤 4：注入并使用 Agent**

```java
@RestController
public class ChatController {

    @Autowired
    private CodeactAgent codeactAgent;

    @PostMapping("/chat")
    public String chat(@RequestBody String message) {
        // 创建初始状态
        OverAllState state = OverAllState.builder()
            .build();
        
        // 执行 Agent
        OverAllState result = codeactAgent.invoke(state, message);
        
        return result.getOutput();
    }
}
```

---

## 3. 高级特性

### 3.1 自定义 Agent 配置

通过 `CodeactAgentBuilder` 进行精细配置：

```java
@Bean
public CodeactAgent customAgent(ChatModel chatModel, 
                                 CodeactToolRegistry toolRegistry) {
    return CodeactAgent.builder()
        .chatModel(chatModel)
        .toolRegistry(toolRegistry)
        .language(Language.PYTHON)           // 代码语言
        .maxIterations(10)                   // 最大迭代次数
        .executionTimeoutMs(30000)           // 执行超时
        .allowIO(false)                      // 禁止 IO 操作
        .allowNativeAccess(false)            // 禁止原生访问
        .build();
}
```

### 3.2 注册 Agent Hook

在 Agent 执行前后注入自定义逻辑：

```java
@Component
public class MyAgentHook implements Hook {
    
    @Override
    public void beforeAgent(OverAllState state) {
        // Agent 执行前
    }
    
    @Override
    public void afterAgent(OverAllState state) {
        // Agent 执行后
    }
}
```

### 3.3 注册 Model Interceptor

拦截模型调用：

```java
@Component
public class MyModelInterceptor implements ModelInterceptor {
    
    @Override
    public Prompt beforeModel(Prompt prompt, OverAllState state) {
        // 修改发送给模型的 Prompt
        return prompt;
    }
    
    @Override
    public ChatResponse afterModel(ChatResponse response, OverAllState state) {
        // 处理模型响应
        return response;
    }
}
```

### 3.4 注册 Tool Interceptor

拦截工具调用：

```java
@Component
public class MyToolInterceptor implements ToolInterceptor {
    
    @Override
    public Object beforeTool(String toolName, Object args, OverAllState state) {
        // 工具执行前
        return args;
    }
    
    @Override
    public Object afterTool(String toolName, Object result, OverAllState state) {
        // 工具执行后
        return result;
    }
}
```

### 3.5 CheckpointSaver 会话持久化

```java
@Bean
public BaseCheckpointSaver checkpointSaver() {
    // 返回自定义的 CheckpointSaver 实现
    return new RedisCheckpointSaver(redisTemplate);
}
```

---

## 参考资料

- [Spring AI Alibaba 文档](https://github.com/alibaba/spring-ai-alibaba)

