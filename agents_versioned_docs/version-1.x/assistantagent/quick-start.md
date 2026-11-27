---
title: Assistant Agent 快速开始
description: Assistant Agent 是基于 Spring AI Alibaba 构建的企业级智能助手框架，采用代码即行动（Code-as-Action）范式，通过生成和执行代码来编排工具、完成任务
keywords: [Assistant Agent, CodeAct, 智能助手, Spring AI Alibaba, GraalVM, 企业级Agent, 代码即行动]
---

# 项目简介

Assistant Agent 是一个基于 [Spring AI Alibaba](https://github.com/alibaba/spring-ai-alibaba) 构建的企业级智能助手框架，采用代码即行动（Code-as-Action）范式，Agent 通过生成并执行代码完成任务，灵活组合多个工具实现复杂流程。

> Github repository: https://github.com/spring-ai-alibaba/AssistantAgent

## 核心能力

| 能力 | 说明 |
|------|------|
| 🚀 **代码即行动** | Agent 通过生成并执行代码完成任务，灵活组合多个工具实现复杂流程 |
| 🔒 **安全沙箱** | AI 生成的代码在 GraalVM 多语言沙箱中安全运行，具备资源隔离能力 |
| 📊 **多维评估** | 通过评估图进行多层次意图识别，精准指导 Agent 行为 |
| 🔄 **动态 Prompt** | 根据场景及前置评估结果动态注入上下文到 Prompt 中 |
| 🧠 **经验学习** | 自动积累成功经验，持续提升后续任务的表现 |
| ⚡ **快速响应** | 熟悉场景下跳过 LLM 推理，基于经验快速响应 |
| 🔍 **智能问答** | 支持多数据源统一检索架构（通过 SPI 可扩展知识库、Web 等数据源） |
| 🛠️ **工具调用** | 支持 MCP、HTTP API（OpenAPI）等协议，灵活接入海量工具 |
| ⏰ **主动服务** | 支持定时任务、延迟执行、事件回调 |
| 📬 **多渠道触达** | 内置 IDE 回复，通过 SPI 可扩展钉钉、飞书、企微、Webhook 等 |

## 适用场景

| 场景 | 说明 |
|------|------|
| **智能客服** | 接入企业知识库，智能解答用户咨询 |
| **运维助手** | 对接监控、工单系统，自动处理告警、查询状态、执行操作 |
| **业务助理** | 连接 CRM、ERP 等业务系统，辅助员工完成日常工作 |

---

## Quick Start

### 前置要求

- ☕ **Java 17+**
- 📦 **Maven 3.8+**
- 🌐 **DashScope API Key** - 从 [阿里云百炼](https://dashscope.console.aliyun.com/) 获取

### 克隆并构建

```bash
git clone https://github.com/alibaba/assistant-agent.git
cd assistant-agent
mvn clean install -DskipTests
```

### 配置 API Key

```bash
export DASHSCOPE_API_KEY=your-api-key-here
```

### 启动应用

```bash
cd assistant-agent-start
mvn spring-boot:run
```

启动后即可体验内置 Mock 实现的 CodeAct Agent。

---

## 使用方式

### 方式一：Chat UI（可视化对话）

启动后，访问 `http://localhost:8080/chatui/index.html` 即可与 Agent 进行可视化对话。

![Agent Chat UI](/img/chatui/agent-chat-ui.gif)

> 项目默认集成了 [Spring AI Alibaba Studio](/docs/1.x/frameworks/studio/quick-start)，提供开箱即用的可视化对话界面。

### 方式二：API 集成

将 Agent 能力集成到已有项目中，通过 API 方式调用。

> ⚠️ **注意**：目前Jar包尚未发布到公网 Maven 仓库，需要先克隆项目并本地安装后才能使用。后续规划中将提供公网Jar包，届时可直接添加依赖使用。

#### 1. 本地安装依赖

```bash
git clone https://github.com/alibaba/assistant-agent.git
cd assistant-agent
mvn clean install -DskipTests
```

#### 2. 添加依赖

```xml
<dependency>
    <groupId>com.alibaba.assistant</groupId>
    <artifactId>assistant-agent-autoconfigure</artifactId>
    <version>${assistant-agent.version}</version>
</dependency>
```

#### 3. 注入并使用 Agent

```java
@RestController
public class ChatController {

    @Autowired
    private CodeactAgent codeactAgent;


    @GetMapping("/test-chat")
    public String chat(@RequestParam("message") String message) throws GraphRunnerException {

        // 1. 调用 invokeAndGetOutput 获取结果
        Optional<NodeOutput> nodeOutputOptional = codeactAgent.invokeAndGetOutput(message);

        // 2. 从 NodeOutput 中提取最终结果
        if (nodeOutputOptional.isPresent()) {
            NodeOutput nodeOutput = nodeOutputOptional.get();

            // 获取完整状态，包含 messages
            OverAllState state = nodeOutput.state();

            // 从 state 中获取 messages（核心结果）
            Optional<List<Message>> messagesOpt = state.value("messages");
            if (messagesOpt.isPresent()) {
                List<Message> messages = messagesOpt.get();
                // 最后一条消息通常是 AssistantMessage，包含最终答案
                Message lastMessage = messages.get(messages.size() - 1);
                if (lastMessage instanceof AssistantMessage assistantMessage) {
                    String finalAnswer = assistantMessage.getText();
                    System.out.println("最终答案: " + finalAnswer);
                    return finalAnswer;
                }
            }
        }
        return "No Response";
    }
}
```

---

## 接入知识库

知识库是 Agent 回答业务问题的核心数据来源。框架默认提供 Mock 知识库实现用于演示测试，**生产环境需要接入真实知识源**。

### 快速体验（使用内置 Mock 实现）

默认配置已启用知识库搜索，可直接体验：

```yaml
spring:
  ai:
    alibaba:
      codeact:
        extension:
          search:
            enabled: true
            knowledge-search-enabled: true  # 默认开启
```

### 接入真实知识库（推荐）

实现 `SearchProvider` SPI 接口，接入你的业务知识源：

```java
@Component
public class MyKnowledgeSearchProvider implements SearchProvider {

    @Override
    public boolean supports(SearchSourceType type) {
        return SearchSourceType.KNOWLEDGE == type;
    }

    @Override
    public List<SearchResultItem> search(SearchRequest request) {
        List<SearchResultItem> results = new ArrayList<>();
        
        // 从你的知识源查询（向量数据库、ES、API 等）
        // List<Doc> docs = vectorStore.similaritySearch(request.getQuery());
        
        // 转换为 SearchResultItem 并返回
        return results;
    }

    @Override
    public String getName() {
        return "MyKnowledgeSearchProvider";
    }
}
```

### 常见知识源接入方式

| 知识源类型 | 接入方式 |
|-----------|---------|
| **向量数据库**（阿里云 AnalyticDB、Milvus、Pinecone） | 在 `search()` 方法中调用向量相似度检索 API |
| **Elasticsearch** | 使用 ES 客户端执行全文检索或向量检索 |
| **企业知识库 API** | 调用内部知识库 REST API |
| **本地文档** | 读取并索引本地 Markdown/PDF 文件 |

> 📖 更多细节请参考：[知识检索模块文档](./features/search/quickstart.md)

---

## SPI 扩展点

Assistant Agent 提供丰富的 SPI 扩展点，支持快速二次开发：

| 扩展点 | 详细文档 |
|--------|----------|
| `SearchProvider` | [知识检索模块](./features/search/quickstart.md) |
| `ReplyChannelDefinition` | [回复渠道模块](./features/reply/quickstart.md) |
| `CodeactTool` | [自定义 CodeAct 工具](./features/custom-codeact-tool/quickstart.md) |
| `PromptBuilder` | [Prompt Builder 模块](./features/prompt-builder/quickstart.md) |
| `LearningExtractor` / `LearningRepository` | [学习模块](./features/learning/quickstart.md) |
| `ExperienceProvider` | [经验模块](./features/experience/quickstart.md) |
| `TriggerDefinition` | [触发器模块](./features/trigger/quickstart.md) |

---

## 二次开发

Assistant Agent 采用模块化设计，支持灵活的二次开发。核心思路如下：

### 开发思路

1. **接入知识**：实现 `SearchProvider` 接入企业知识库，让 Agent 能够回答业务问题
2. **扩展工具**：实现 `CodeactTool` 或通过 MCP/HTTP 接入外部工具，赋予 Agent 执行能力
3. **定制 Prompt**：实现 `PromptBuilder` 根据场景动态组装 Prompt
4. **多渠道触达**：实现 `ReplyChannelDefinition` 接入钉钉、飞书等消息渠道
5. **经验积累**：实现 `LearningExtractor` 和 `ExperienceProvider` 自动学习和复用经验

### 详细配置

关于各模块的详细配置方式和高级用法，请参考：

- [二次开发详细指南](./secondary-development.md)
- [各模块 Feature 文档](./features/evaluation/quickstart)

---

## Roadmap

Assistant Agent 项目采用渐进式发展策略：

- **第一阶段（当前）**：半集成框架，提供完整的 SPI 扩展机制，供开发者快速二次开发
- **第二阶段**：公共能力下沉到 Spring AI Alibaba，提供更多开箱即用的场景实现
- **第三阶段**：可视化配置，零代码接入，快速部署

---

## 参考文档

- [Spring AI Alibaba 文档](https://github.com/alibaba/spring-ai-alibaba)
- [Feature 详细文档](./features/evaluation/quickstart)
- [二次开发详细指南](./secondary-development.md)

## Contributing

欢迎贡献！请参阅 [CONTRIBUTING.md](https://github.com/alibaba/assistant-agent/blob/main/CONTRIBUTING.md) 了解指南。

## License

本项目采用 Apache License 2.0 许可证。
