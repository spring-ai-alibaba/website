---
title: 二次开发详细指南
description: Assistant Agent 二次开发的详细配置方式、各模块使用方法和高级定制指南
keywords: [Assistant Agent, 二次开发, 配置, SPI, 扩展]
---

# 二次开发详细指南

本文档详细介绍 Assistant Agent 各模块的配置方式和二次开发方法。如果你是第一次接触本项目，建议先阅读 [快速开始](./quick-start.md)。

---

## 目录

- [项目结构](#项目结构)
- [配置文件](#配置文件)
- [模块详细配置](#模块详细配置)
  - [知识检索模块](#知识检索模块)
  - [工具扩展](#工具扩展)
  - [回复渠道](#回复渠道)
  - [评估模块](#评估模块)
  - [Prompt Builder](#prompt-builder)
  - [经验模块](#经验模块)
  - [学习模块](#学习模块)
  - [触发器模块](#触发器模块)
- [高级定制](#高级定制)

---

## 项目结构

```
assistant-agent/
├── assistant-agent-common          # 通用工具、枚举、常量
├── assistant-agent-core            # 核心引擎：GraalVM 执行器、工具注册表
├── assistant-agent-extensions      # 扩展模块
│   ├── dynamic/               #   - 动态工具（MCP、HTTP API）
│   ├── experience/            #   - 经验管理与快速意图配置
│   ├── learning/              #   - 学习提取与存储
│   ├── search/                #   - 统一搜索能力
│   ├── reply/                 #   - 多渠道回复
│   ├── trigger/               #   - 触发器机制
│   └── evaluation/            #   - 评估集成
├── assistant-agent-prompt-builder  # Prompt 动态组装
├── assistant-agent-evaluation      # 评估引擎
├── assistant-agent-autoconfigure   # Spring Boot 自动配置
└── assistant-agent-start           # 启动模块（二次开发基础）
```

---

## 配置文件

### 核心配置文件位置

```
assistant-agent-start/src/main/resources/
├── application.yml                 # 主配置文件
├── application-reference.yml       # 完整配置参考
├── mcp-servers.json               # MCP 服务配置
└── mcp-servers.json.example       # MCP 配置示例
```

### 基础配置示例

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-max
    alibaba:
      codeact:
        # 核心配置
        max-iterations: 10
        code-execution-timeout-ms: 30000
        
        extension:
          # 各模块开关和配置
          search:
            enabled: true
          reply:
            enabled: true
          trigger:
            enabled: true
          learning:
            enabled: true
          experience:
            enabled: true
```

> 📖 完整配置项请参考 `application-reference.yml`

---

## 模块详细配置

### 知识检索模块

知识检索是 Agent 回答业务问题的核心能力，通过实现 `SearchProvider` SPI 接入各类数据源。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          search:
            enabled: true
            knowledge-search-enabled: true   # 知识库搜索
            project-search-enabled: false    # 项目代码搜索
            web-search-enabled: false        # Web 搜索
            experience-search-enabled: true  # 经验检索
            default-top-k: 5                 # 默认返回结果数
            search-timeout-ms: 5000          # 搜索超时时间
```

#### 实现自定义 SearchProvider

```java
import com.alibaba.assistant.agent.extension.search.spi.SearchProvider;
import com.alibaba.assistant.agent.extension.search.model.*;
import org.springframework.stereotype.Component;

@Component
public class ElasticsearchSearchProvider implements SearchProvider {

    @Autowired
    private ElasticsearchClient esClient;

    @Override
    public boolean supports(SearchSourceType type) {
        return SearchSourceType.KNOWLEDGE == type;
    }

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        // 1. 构建 ES 查询
        SearchResponse response = esClient.search(s -> s
            .index("knowledge-base")
            .query(q -> q.match(m -> m
                .field("content")
                .query(request.getQuery())
            ))
            .size(request.getTopK())
        );
        
        // 2. 转换结果
        return response.hits().hits().stream()
            .map(hit -> {
                SearchResultItem item = new SearchResultItem();
                item.setId(hit.id());
                item.setSourceType(SearchSourceType.KNOWLEDGE);
                item.setTitle(hit.source().getTitle());
                item.setContent(hit.source().getContent());
                item.setScore(hit.score());
                return item;
            })
            .collect(Collectors.toList());
    }

    @Override
    public String getName() {
        return "ElasticsearchSearchProvider";
    }
    
    @Override
    public int getOrder() {
        return 0; // 优先级，数值越小优先级越高
    }
}
```

> 📖 更多细节：[知识检索模块文档](./features/search/quickstart.md)

---

### 工具扩展

Agent 通过工具执行各类操作。框架支持三种工具接入方式：

#### 方式一：自定义 CodeactTool

```java
import com.alibaba.assistant.agent.common.tools.CodeactTool;
import org.springframework.stereotype.Component;

@Component
public class OrderQueryTool implements CodeactTool {

    @Override
    public String getName() {
        return "query_order";
    }

    @Override
    public String getDescription() {
        return "查询订单信息";
    }

    @Override
    public String call(String toolInput) {
        // toolInput 是 JSON 格式的参数
        OrderQueryRequest request = JSON.parseObject(toolInput, OrderQueryRequest.class);
        Order order = orderService.query(request.getOrderId());
        return JSON.toJSONString(order);
    }

    @Override
    public CodeactToolMetadata getMetadata() {
        return DefaultCodeactToolMetadata.builder()
            .className("order")
            .methodName("query")
            .build();
    }
}
```

> 📖 更多细节：[自定义 CodeAct 工具](./features/custom-codeact-tool/quickstart.md)

#### 方式二：MCP 工具

通过配置 `mcp-servers.json` 接入 MCP 协议工具：

```json
{
  "mcpServers": {
    "weather-server": {
      "command": "npx",
      "args": ["-y", "@anthropic/weather-mcp-server"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          mcp:
            enabled: true
            config-path: classpath:mcp-servers.json
```

> 📖 更多细节：[MCP 工具模块](./features/mcp/quickstart.md)

#### 方式三：HTTP API 工具

通过 OpenAPI 规范自动生成工具：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          http:
            enabled: true
            specs:
              - name: petstore
                url: https://petstore.swagger.io/v2/swagger.json
                base-url: https://petstore.swagger.io/v2
                endpoints:
                  - method: GET
                    path: /pet/{petId}
                  - method: POST
                    path: /pet
```

> 📖 更多细节：[动态 HTTP 工具模块](./features/dynamic-http/quickstart.md)

---

### 回复渠道

回复渠道决定 Agent 如何向用户发送消息。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          reply:
            enabled: true
            tools:
              - name: send_message
                description: 发送文本消息给用户
                channel-code: IDE_TEXT
                params:
                  - name: text
                    type: string
                    description: 消息内容
                    required: true
```

#### 实现自定义渠道

```java
import com.alibaba.assistant.agent.extension.reply.spi.ReplyChannelDefinition;
import org.springframework.stereotype.Component;

@Component
public class DingTalkChannelDefinition implements ReplyChannelDefinition {

    @Override
    public String getChannelCode() {
        return "DINGTALK";
    }

    @Override
    public String getChannelName() {
        return "钉钉消息";
    }

    @Override
    public Object execute(ChannelExecutionContext context, Map<String, Object> params) {
        String text = (String) params.get("text");
        String userId = context.getUserId();
        
        // 调用钉钉 API 发送消息
        dingTalkClient.sendMessage(userId, text);
        
        return Map.of("success", true);
    }
}
```

> 📖 更多细节：[回复渠道模块](./features/reply/quickstart.md)

---

### 评估模块

评估模块用于多维度意图识别，指导 Agent 行为。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          evaluation:
            enabled: true
            suite-config-path: classpath:evaluation-suite.yml
```

#### 评估套件配置

```yaml
# evaluation-suite.yml
name: default-suite
description: 默认评估套件
criteria:
  - name: is_ambiguous
    type: LLM
    description: 判断用户输入是否模糊
    resultType: BOOLEAN
    
  - name: has_experience
    type: RULE
    description: 检查是否有相关经验
    resultType: BOOLEAN
    ruleFunction: experienceCheckFunction
    
  - name: intent_type
    type: LLM
    description: 识别用户意图类型
    resultType: ENUM
    enumValues: [QUERY, ACTION, CHAT]
    dependsOn: [is_ambiguous]
```

> 📖 更多细节：[评估模块](./features/evaluation/quickstart.md)

---

### Prompt Builder

Prompt Builder 根据评估结果动态组装 Prompt。

#### 实现自定义 PromptBuilder

```java
import com.alibaba.assistant.agent.prompt.PromptBuilder;
import com.alibaba.assistant.agent.prompt.PromptContribution;
import org.springframework.stereotype.Component;

@Component
public class ExperiencePromptBuilder implements PromptBuilder {

    @Override
    public boolean match(ModelRequest request) {
        // 根据评估结果判断是否注入经验
        return request.getEvaluationResult("has_experience") == true;
    }

    @Override
    public PromptContribution build(ModelRequest request) {
        List<Experience> experiences = experienceService.search(request.getQuery());
        
        String experienceText = experiences.stream()
            .map(e -> "- " + e.getContent())
            .collect(Collectors.joining("\n"));
            
        return PromptContribution.builder()
            .systemText("以下是相关经验供参考：\n" + experienceText)
            .build();
    }

    @Override
    public int getOrder() {
        return 10; // 执行顺序
    }
}
```

> 📖 更多细节：[Prompt Builder 模块](./features/prompt-builder/quickstart.md)

---

### 经验模块

经验模块用于存储和复用历史成功经验。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          experience:
            enabled: true
            fast-intent:
              enabled: true  # 启用快速意图匹配
```

#### 实现自定义 ExperienceProvider

```java
import com.alibaba.assistant.agent.extension.experience.spi.ExperienceProvider;
import org.springframework.stereotype.Component;

@Component
public class DatabaseExperienceProvider implements ExperienceProvider {

    @Override
    public List<Experience> search(String query, int topK) {
        // 从数据库检索相关经验
        return experienceRepository.findSimilar(query, topK);
    }

    @Override
    public void save(Experience experience) {
        experienceRepository.save(experience);
    }

    @Override
    public String getName() {
        return "DatabaseExperienceProvider";
    }
}
```

> 📖 更多细节：[经验模块](./features/experience/quickstart.md)

---

### 学习模块

学习模块从 Agent 执行过程中自动提取经验。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          learning:
            enabled: true
            online:
              after-agent:
                enabled: true   # Agent 执行后学习
              after-model:
                enabled: false  # 模型调用后学习
              tool-interceptor:
                enabled: false  # 工具调用后学习
            offline:
              enabled: false    # 离线批量学习
```

#### 实现自定义 LearningExtractor

```java
import com.alibaba.assistant.agent.extension.learning.spi.LearningExtractor;
import org.springframework.stereotype.Component;

@Component
public class SuccessPatternExtractor implements LearningExtractor {

    @Override
    public boolean shouldLearn(LearningContext context) {
        // 只从成功的执行中学习
        return context.isSuccess() && context.getToolCalls().size() > 0;
    }

    @Override
    public List<LearningRecord> extract(LearningContext context) {
        // 提取成功模式
        LearningRecord record = LearningRecord.builder()
            .input(context.getInput())
            .output(context.getOutput())
            .toolCalls(context.getToolCalls())
            .type(LearningType.SUCCESS_PATTERN)
            .build();
            
        return List.of(record);
    }

    @Override
    public String getName() {
        return "SuccessPatternExtractor";
    }
}
```

> 📖 更多细节：[学习模块](./features/learning/quickstart.md)

---

### 触发器模块

触发器模块支持定时任务和事件触发。

#### 配置项

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          trigger:
            enabled: true
            max-triggers-per-user: 10
            default-timezone: Asia/Shanghai
```

#### 触发器使用

Agent 可以通过内置工具创建触发器：

```python
# Agent 生成的代码示例
trigger.create_trigger(
    name="daily_report",
    schedule_mode="CRON",
    schedule_value="0 9 * * *",
    task="生成并发送每日销售报告"
)
```

> 📖 更多细节：[触发器模块](./features/trigger/quickstart.md)

---

## 高级定制

### 替换核心组件

通过 Spring Bean 覆盖默认实现：

```java
@Configuration
public class CustomConfiguration {

    @Bean
    @Primary
    public CodeExecutor customCodeExecutor() {
        // 自定义代码执行器
        return new MyCodeExecutor();
    }
}
```

### 模型配置

```yaml
spring:
  ai:
    dashscope:
      chat:
        options:
          model: qwen-max
          temperature: 0.7
          max-tokens: 4096
          top-p: 0.9
```

### 日志配置

```yaml
logging:
  level:
    com.alibaba.assistant.agent: DEBUG
    com.alibaba.assistant.agent.core.executor: INFO
```

---

## 常见问题

### 1. 如何调试 Agent 执行过程？

启用 DEBUG 日志查看详细执行过程：

```yaml
logging:
  level:
    com.alibaba.assistant.agent: DEBUG
```

### 2. 如何限制代码执行时间？

```yaml
spring:
  ai:
    alibaba:
      codeact:
        code-execution-timeout-ms: 30000  # 30秒超时
```

### 3. 如何查看可用工具？

启动后访问 `/actuator/codeact/tools` 查看已注册的工具列表。

---

## 参考资源

- [完整配置参考](../assistant-agent-start/src/main/resources/application-reference.yml)
- [Feature 详细文档](./features/)
- [Spring AI Alibaba 文档](https://github.com/alibaba/spring-ai-alibaba)

