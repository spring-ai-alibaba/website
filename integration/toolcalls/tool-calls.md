# Tool Calling 使用指南

Spring AI Alibaba 提供了丰富的 Tool Calling 扩展实现，允许 AI 模型与外部 API 和工具进行交互，增强模型的能力。本文档将详细介绍 Tool Calling 的使用方法，并列出所有支持的扩展实现。

## 目录

- [概述](#概述)
- [DashScope 工具执行](#dashscope-工具执行)
- [详细使用说明](#详细使用说明)
- [支持的扩展实现](#支持的扩展实现)

## 概述

Tool Calling（工具调用，也称为 Function Calling）是 AI 应用中的常见模式，允许模型与一组 API 或工具进行交互，增强模型的能力。

工具主要用于：

- **信息检索**：从外部数据源检索信息，如数据库、Web 服务、文件系统或 Web 搜索引擎。例如，获取当前天气、检索最新新闻、查询数据库等。
- **执行操作**：在软件系统中执行特定操作，如发送电子邮件、在数据库中创建新记录、提交表单或触发工作流。例如，预订航班、填写表单、生成代码等。

Spring AI Alibaba 扩展了 Spring AI 的 Tool Calling 功能，提供了多种预构建的工具实现，包括：

- 搜索引擎（百度搜索、Google Scholar、Tavily Search 等）
- 翻译服务（阿里翻译、百度翻译、Google 翻译等）
- 地图服务（高德地图、百度地图、腾讯地图等）
- 数据服务（天气、快递、新闻等）
- 开发工具（GitHub、JSON 处理、正则表达式等）
- 其他工具（时间、Python 执行、敏感词过滤等）

## DashScope 工具执行

Extensions 2.1.0.0 的 `DashScopeAsyncToolCallingManager` 和 ARMS 集成使用的 `ObservableToolCallingManager` 都使用请求绑定的回调。用 `ChatClient` 让工具 Advisor 执行模型返回的完整调用。通过 `ChatModel.call(Prompt)` 接入时，需要由应用负责运行工具并回传结果。

```java
ChatResponse reply = chatClient.prompt()
    .user(question)
    .tools(lookupCallback)
    .call()
    .chatResponse();
```

`ToolCallbackResolver` 回退默认关闭，应用级注册的同名 Bean 不会自动加入当前请求。确实要保留按名称解析的旧应用可以设置 `spring.ai.tools.resolution.fallback.enabled=true`，并将 Resolver 暴露的工具限制在该应用希望共享的范围内。

### 异步执行、ARMS 和调用预算

安装 `spring-ai-alibaba-starter-arms-observation` 后，可以同时开启异步执行和工具观测。一次用户轮次默认允许每个工具调用 40 次，所有工具合计 150 次。通过以下配置可为单个工具设更低的预算，并决定超限时如何响应。

```yaml
spring:
  ai:
    alibaba:
      tool:
        async:
          enabled: true
      arms:
        enabled: true
        tool:
          enabled: true
    tools:
      limits:
        max-calls-per-tool-default: 40
        max-calls-per-tool:
          lookup: 5
        max-total-tool-calls: 150
        on-limit-exceeded: RETURN_ERROR_RESPONSE
```

`RETURN_ERROR_RESPONSE` 将超限作为工具结果返回模型。默认的 `THROW` 结束本轮循环。单工具和总上限可分别设为 `-1` 关闭。计数以当前用户轮次为范围，应用可通过 ARMS 观察异步回调的耗时与执行结果状态。

### 调用确认与恢复

可在工具方法上声明 `@Tool(requiresConfirmation = true)`，对无法修改定义的工具也可设置 `spring.ai.tools.confirmation.tools`。当批次里有待确认项时，整个批次都会暂停。通过 `.call().chatResponse()` 或流的最后一个 `ChatResponse` 调用 `ToolCallDecisions.awaitingDecision(reply)` 来发现暂停状态。

持久化原始回复、原顺序、当前轮次以及允许的回调集合。使用 `ToolCallDecisions.toolCallKeys(reply.getResult().getOutput())` 为每项取得稳定的审批键，遇到缺失或重复 ID 时，API 以位置键区分。收集本批次所有调用的决定后，使用接收原回复的同一个管理器恢复。下面的示例假设批次恰好有两个调用。

```java
import org.springframework.ai.model.tool.ToolCallDecision;
import org.springframework.ai.model.tool.ToolCallDecisions;

var keys = ToolCallDecisions.toolCallKeys(reply.getResult().getOutput());
var decisions = ToolCallDecisions.of(
    ToolCallDecision.allow(keys.get(0)),
    ToolCallDecision.deny(keys.get(1), "该请求未获批准")
);
var result = toolCallingManager.executeToolCalls(originalPrompt, reply, decisions);
```

`originalPrompt` 应保留当前轮的消息历史与实际绑定的回调。自行管理历史时，从 `result.conversationHistory()` 继续对话。使用 Session Memory 时，仅发送新的工具结果并复用原会话 ID，Advisor 会载入并保存历史。拒绝的调用生成工具结果，获准的工具仍受当前轮的调用预算约束。

[Session Memory](../chatclient.md#session-memory) · [Spring AI 2.1 工具确认参考](https://github.com/spring-projects/spring-ai/blob/v2.1.0/spring-ai-docs/src/main/antora/modules/ROOT/pages/api/tools/tool-call-confirmation.adoc)

[Extensions 2.1.0.0 发布说明](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.1.0.0)

## 详细使用说明

### Python Tool 示例

`PythonTool` 使用 GraalVM polyglot 在沙箱环境中执行 Python 代码。这个工具允许 AI 代理执行 Python 代码片段并获取结果。

#### 依赖配置

使用 Maven 添加依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-python</artifactId>
    <version>2.1.0.0</version>
</dependency>
```

**注意**：Python Tool 需要 GraalVM polyglot 依赖，这些依赖已作为可选依赖包含。如果需要使用，请确保 GraalVM polyglot 在 classpath 中。

#### 自动配置

Python Tool 默认启用，会自动注册为 `ToolCallback` 并可供 AI 代理使用。如果需要禁用，可以在配置文件中设置：

```yaml
spring:
  ai:
    alibaba:
      python:
        tool:
          enabled: false
```

#### 基本使用

##### 示例 1：在 ChatClient 中使用

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PythonToolService {

    @Autowired
    private ChatModel chatModel;

    @Autowired
    private PythonTool pythonTool;

    public String executeCalculation(String question) {
        // 创建 ChatClient 并添加 Python Tool
        ChatClient chatClient = ChatClient.builder(chatModel)
            .tools(pythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
            .build();

        // 使用工具进行对话
        String response = chatClient.prompt(question)
            .call()
            .content();

        return response;
    }
}
```

##### 示例 2：直接使用 PythonTool

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import java.util.Map;

import org.springframework.ai.chat.model.ToolContext;

public class DirectPythonToolUsage {

    public void executePythonCode() {
        PythonTool pythonTool = new PythonTool();
        
        // 创建请求
        PythonTool.PythonRequest request = new PythonTool.PythonRequest("2 + 2");
        
        // 执行 Python 代码
        String result = pythonTool.apply(request, new ToolContext(Map.of()));
        
        System.out.println("Result: " + result); // 输出: Result: 4
    }
}
```

##### 示例 3：执行复杂计算

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;

public class ComplexCalculationExample {

    private final ChatClient chatClient;

    public ComplexCalculationExample(ChatModel chatModel, PythonTool pythonTool) {
        this.chatClient = ChatClient.builder(chatModel)
            .tools(pythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
            .build();
    }

    public String calculateStatistics(String data) {
        String prompt = String.format("""
            请使用 Python 工具计算以下数据的统计信息：
            %s
            
            请计算平均值、最大值、最小值和总和。
            """, data);

        return chatClient.prompt(prompt)
            .call()
            .content();
    }
}
```

##### 示例 4：字符串处理

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import java.util.Map;

import org.springframework.ai.chat.model.ToolContext;

public class StringProcessingExample {

    public void processStrings() {
        PythonTool pythonTool = new PythonTool();
        ToolContext toolContext = new ToolContext(Map.of());

        // 字符串连接
        PythonTool.PythonRequest request1 = new PythonTool.PythonRequest(
            "'Hello, ' + 'World'"
        );
        String result1 = pythonTool.apply(request1, toolContext);
        System.out.println(result1); // 输出: Hello, World

        // 列表操作
        PythonTool.PythonRequest request2 = new PythonTool.PythonRequest(
            "[1, 2, 3, 4, 5][:3]"
        );
        String result2 = pythonTool.apply(request2, toolContext);
        System.out.println(result2); // 输出: [1, 2, 3]

        // 字典操作
        PythonTool.PythonRequest request3 = new PythonTool.PythonRequest(
            "{'name': 'Alice', 'age': 30}.get('name')"
        );
        String result3 = pythonTool.apply(request3, toolContext);
        System.out.println(result3); // 输出: Alice
    }
}
```

##### 示例 5：在 Spring Boot 应用中使用

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PythonToolAgent {

    private final ChatClient chatClient;

    @Autowired
    public PythonToolAgent(ChatModel chatModel, PythonTool pythonTool) {
        this.chatClient = ChatClient.builder(chatModel)
            .tools(pythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
            .build();
    }

    public String askWithPython(String question) {
        return chatClient.prompt(question)
            .call()
            .content();
    }
}
```

##### 示例 6：自定义 ToolCallback

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PythonToolConfiguration {

    @Bean
    public PythonTool pythonTool() {
        return new PythonTool();
    }

    @Bean
    public ToolCallback pythonToolCallback(PythonTool pythonTool) {
        return PythonTool.createPythonToolCallback(
            "执行 Python 代码并返回结果。支持数学计算、字符串处理、列表操作等。"
        );
    }
}
```

##### 示例 7：多工具组合使用

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import com.alibaba.cloud.ai.agent.time.tool.TimeTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;

public class MultiToolExample {

    public ChatClient createChatClient(ChatModel chatModel) {
        PythonTool pythonTool = new PythonTool();
        TimeTool timeTool = new TimeTool();

        return ChatClient.builder(chatModel)
            .tools(
                pythonTool.createPythonToolCallback(PythonTool.DESCRIPTION),
                timeTool.createTimeToolCallback(TimeTool.DESCRIPTION)
            )
            .build();
    }

    public String complexQuery(String question) {
        ChatClient chatClient = createChatClient(chatModel);
        
        return chatClient.prompt(question)
            .call()
            .content();
    }
}
```

#### 安全特性

Python Tool 在沙箱环境中运行，具有以下安全限制：

- **文件 I/O 已禁用**：无法读取或写入文件
- **本地访问已禁用**：无法访问本地系统资源
- **进程创建已禁用**：无法创建新进程
- **默认限制所有访问**：所有访问默认受限

这些限制确保了 Python 代码的执行安全性，防止恶意代码对系统造成损害。

#### 支持的数据类型

Python Tool 支持以下 Python 数据类型的返回：

- **字符串**：直接返回字符串值
- **数字**：转换为字符串返回
- **布尔值**：转换为字符串返回
- **数组/列表**：转换为字符串表示形式（如 `[1, 2, 3]`）
- **其他类型**：使用 `toString()` 方法转换

#### 注意事项

1. **GraalVM 依赖**：确保 GraalVM polyglot 依赖在 classpath 中
2. **性能考虑**：每次执行都会创建新的 Context，对于频繁调用可能需要优化
3. **错误处理**：代码执行错误会被捕获并返回错误消息
4. **代码限制**：由于安全限制，某些 Python 功能可能不可用
5. **资源管理**：Context 会自动关闭，无需手动管理

#### 完整示例：AI 代理使用 Python Tool

```java
import com.alibaba.cloud.ai.agent.python.tool.PythonTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

@Service
public class PythonToolAgentService {

    private final ChatClient chatClient;

    public PythonToolAgentService(ChatModel chatModel, PythonTool pythonTool) {
        this.chatClient = ChatClient.builder(chatModel)
            .tools(pythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
            .build();
    }

    public String solveMathProblem(String problem) {
        String prompt = String.format("""
            请使用 Python 工具解决以下数学问题：
            %s
            
            请展示计算过程。
            """, problem);

        return chatClient.prompt(prompt)
            .call()
            .content();
    }

    public String analyzeData(String dataDescription) {
        String prompt = String.format("""
            请使用 Python 工具分析以下数据：
            %s
            
            请计算基本统计信息（平均值、中位数、标准差等）。
            """, dataDescription);

        return chatClient.prompt(prompt)
            .call()
            .content();
    }
}
```

## 支持的扩展实现

下表列出了 Spring AI Alibaba 提供的所有 Tool Calling 扩展实现：

| 模块名称 | ArtifactId | 功能说明 | 主要用途 |
|---------|-----------|---------|---------|
| **阿里翻译** | `spring-ai-alibaba-starter-tool-calling-alitranslate` | 阿里云翻译服务 | 文本翻译 |
| **阿里云 AI 搜索** | `spring-ai-alibaba-starter-tool-calling-aliyunaisearch` | 阿里云 AI 搜索 | 智能搜索 |
| **高德地图** | `spring-ai-alibaba-starter-tool-calling-amap` | 高德地图 API | 地理位置服务 |
| **百度地图** | `spring-ai-alibaba-starter-tool-calling-baidumap` | 百度地图 API | 地理位置服务 |
| **百度搜索** | `spring-ai-alibaba-starter-tool-calling-baidusearch` | 百度搜索 API | Web 搜索 |
| **百度翻译** | `spring-ai-alibaba-starter-tool-calling-baidutranslate` | 百度翻译 API | 文本翻译 |
| **Brave Search** | `spring-ai-alibaba-starter-tool-calling-bravesearch` | Brave 搜索引擎 | Web 搜索 |
| **Common** | `spring-ai-alibaba-starter-tool-calling-common` | 通用工具基础 | 工具基础类 |
| **钉钉** | `spring-ai-alibaba-starter-tool-calling-dingtalk` | 钉钉 API | 企业通讯 |
| **DuckDuckGo** | `spring-ai-alibaba-starter-tool-calling-duckduckgo` | DuckDuckGo 搜索 | Web 搜索 |
| **Firecrawl** | `spring-ai-alibaba-starter-tool-calling-firecrawl` | Firecrawl 网页抓取 | 网页内容提取 |
| **GitHub Toolkit** | `spring-ai-alibaba-starter-tool-calling-githubtoolkit` | GitHub API | 代码仓库操作 |
| **Google Scholar** | `spring-ai-alibaba-starter-tool-calling-googlescholar` | Google Scholar | 学术搜索 |
| **Google 翻译** | `spring-ai-alibaba-starter-tool-calling-googletranslate` | Google 翻译 API | 文本翻译 |
| **Google Trends** | `spring-ai-alibaba-starter-tool-calling-googletrends` | Google Trends | 趋势分析 |
| **Jina Crawler** | `spring-ai-alibaba-starter-tool-calling-jinacrawler` | Jina 爬虫 | 网页爬取 |
| **JSON 处理** | `spring-ai-alibaba-starter-tool-calling-jsonprocessor` | JSON 数据处理 | JSON 操作 |
| **快递 100** | `spring-ai-alibaba-starter-tool-calling-kuaidi100` | 快递 100 API | 快递查询 |
| **飞书** | `spring-ai-alibaba-starter-tool-calling-larksuite` | 飞书 API | 企业协作 |
| **Memcached** | `spring-ai-alibaba-starter-tool-calling-memcached` | Memcached | 缓存操作 |
| **Metaso** | `spring-ai-alibaba-starter-tool-calling-metaso` | Metaso 搜索 | Web 搜索 |
| **Microsoft 翻译** | `spring-ai-alibaba-starter-tool-calling-microsofttranslate` | Microsoft 翻译 | 文本翻译 |
| **MinIO** | `spring-ai-alibaba-starter-tool-calling-minio` | MinIO 对象存储 | 文件存储 |
| **Ollama Search Model** | `spring-ai-alibaba-starter-tool-calling-ollamasearchmodel` | Ollama 搜索模型 | 本地模型搜索 |
| **OpenAlex** | `spring-ai-alibaba-starter-tool-calling-openalex` | OpenAlex 学术 | 学术数据 |
| **OpenTripMap** | `spring-ai-alibaba-starter-tool-calling-opentripmap` | OpenTripMap | 旅游信息 |
| **Python** | `spring-ai-alibaba-starter-tool-calling-python` | Python 代码执行 | 代码执行 |
| **正则表达式** | `spring-ai-alibaba-starter-tool-calling-regex` | 正则表达式处理 | 文本匹配 |
| **Searches** | `spring-ai-alibaba-starter-tool-calling-searches` | 搜索工具集合 | 多搜索引擎 |
| **敏感词过滤** | `spring-ai-alibaba-starter-tool-calling-sensitivefilter` | 敏感词过滤 | 内容审核 |
| **SerpAPI** | `spring-ai-alibaba-starter-tool-calling-serpapi` | SerpAPI | 搜索引擎结果 |
| **新浪新闻** | `spring-ai-alibaba-starter-tool-calling-sinanews` | 新浪新闻 API | 新闻检索 |
| **Tavily Search** | `spring-ai-alibaba-starter-tool-calling-tavilysearch` | Tavily 搜索 | AI 搜索 |
| **腾讯地图** | `spring-ai-alibaba-starter-tool-calling-tencentmap` | 腾讯地图 API | 地理位置服务 |
| **时间工具** | `spring-ai-alibaba-starter-tool-calling-time` | 时间处理 | 时间操作 |
| **头条新闻** | `spring-ai-alibaba-starter-tool-calling-toutiaonews` | 头条新闻 API | 新闻检索 |
| **TripAdvisor** | `spring-ai-alibaba-starter-tool-calling-tripadvisor` | TripAdvisor API | 旅游信息 |
| **Tushare** | `spring-ai-alibaba-starter-tool-calling-tushare` | Tushare 金融数据 | 金融数据 |
| **天气** | `spring-ai-alibaba-starter-tool-calling-weather` | 天气 API | 天气查询 |
| **Wikipedia** | `spring-ai-alibaba-starter-tool-calling-wikipedia` | Wikipedia API | 百科查询 |
| **世界银行数据** | `spring-ai-alibaba-starter-tool-calling-worldbankdata` | 世界银行数据 | 经济数据 |
| **有道翻译** | `spring-ai-alibaba-starter-tool-calling-youdaotranslate` | 有道翻译 API | 文本翻译 |
| **语雀** | `spring-ai-alibaba-starter-tool-calling-yuque` | 语雀 API | 文档管理 |

### 使用说明

所有 Tool Calling 实现都遵循相同的使用模式：

1. **添加依赖**：在 `pom.xml` 或 `build.gradle` 中添加相应的依赖
2. **自动配置**：大多数工具都支持 Spring Boot 自动配置，会自动注册为 `ToolCallback`
3. **在 ChatClient 中使用**：用 `prompt().tools(...)` 为当前请求绑定回调，或用 `builder().defaultTools(...)` 在当前客户端注册默认回调
4. **AI 模型调用**：AI 模型会根据对话内容自动决定是否调用工具

### 通用接口

使用 `ToolCallback` 时，通过 `getToolDefinition()` 读取工具定义，`call(String toolInput)` 执行 JSON 参数。需要运行时上下文的实现可以重写 `call(String toolInput, ToolContext toolContext)`。普通方法可以使用 `@Tool`，函数或自定义回调可以使用 `FunctionToolCallback`。

### ToolContext {#tool-context}

通过 `ChatClient.toolContext(Map<String, Object>)` 传递请求级的应用上下文，例如调用方标识或权限数据。有上下文参数的工具可以接收 `ToolContext`，并通过 `getContext()` 读取。应用上下文用于工具执行，MCP 客户端可按配置选择将其中部分信息映射到请求元数据。

### 配置说明

大多数工具都支持通过 Spring Boot 配置属性进行配置：

```yaml
spring:
  ai:
    alibaba:
      tool-name:
        enabled: true  # 启用/禁用工具
        # 其他工具特定配置
```

### 认证和 API Key

许多工具需要 API Key 或认证信息：

- **搜索引擎**：通常需要 API Key
- **翻译服务**：需要服务提供商的 API Key
- **地图服务**：需要地图服务商的 Key
- **其他服务**：根据具体服务要求配置

请参考各工具的文档了解具体的配置方法。

### 最佳实践

1. **工具选择**：根据实际需求选择合适的工具，避免添加不必要的工具
2. **错误处理**：工具调用可能失败，确保有适当的错误处理机制
3. **性能优化**：对于频繁调用的工具，考虑缓存结果
4. **安全性**：确保 API Key 等敏感信息的安全存储
5. **成本控制**：某些工具（如搜索、翻译）可能产生费用，注意使用量

### 更多信息

- 每个工具的具体使用方法和配置选项，请参考各模块的文档
- 对于需要认证的工具，请确保正确配置访问凭证
- 某些工具可能需要额外的依赖或运行时环境
- 建议查看 Spring AI 官方文档了解 Tool Calling 的更多细节

---

**注意**：本文档基于当前可用的实现。随着项目的发展，可能会有新的 Tool 实现添加或现有实现的更新。建议定期查看项目文档以获取最新信息。
