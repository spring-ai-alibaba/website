---
title: 预定义节点使用指南
description: 全面了解 SAA Graph 提供的十多种即开即用的预定义节点，大幅加速您的 Agent 工作流开发。
---

为了最大化开发效率并推广最佳实践，SAA Graph 提供了一套丰富的预定义节点库。这些节点封装了构建 Agent 和 AI 工作流时最常见的功能，经过了充分测试和优化，让您无需编写大量模板代码，即可快速搭建起强大的功能。

本章将作为一份速查指南，介绍所有预定义节点的功能和核心用法。

## 节点分类概览

我们将预定义节点分为四大类，以便您快速定位所需功能：

1.  **AI 核心节点**: 与大语言模型交互、执行工具、实现 RAG 的基础。
    -   `LlmNode`, `ToolNode`, `KnowledgeRetrievalNode`, `AgentNode`
2.  **智能文本处理**: 对文本进行分类、提取结构化信息、生成标准格式的回复。
    -   `QuestionClassifierNode`, `ParameterParsingNode`, `AnswerNode`, `TemplateTransformNode`
3.  **数据与流程控制**: 处理文档、操作数据、控制工作流分支与循环。
    -   `DocumentExtractorNode`, `ListOperatorNode`, `VariableAggregatorNode`, `AssignerNode`, `IterationNode`, `HumanNode`, `BranchNode`
4.  **外部集成与执行**: 调用外部 API、执行自定义代码。
    -   `HttpNode`, `McpNode`, `CodeExecutorNodeAction`

---

## 1. AI 核心节点

这类节点是构建智能决策能力的基础。

### `LlmNode` - 大语言模型节点
`LlmNode` 是与大语言模型（LLM）交互的核心。它封装了模板渲染、参数注入、流式处理和工具调用支持等所有关键功能。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.LlmNode;

// ...
LlmNode llmNode = LlmNode.builder()
    .chatClient(chatClient) // 必需：提供 ChatClient
    .systemPromptTemplate("你是一个专业的AI助手。") // 设置系统指令
    .userPromptTemplate("请总结以下内容：{raw_text}") // 设置用户指令模板
    .inputKey("raw_text") // 指定模板变量 {raw_text} 的值从 OverAllState 的 "raw_text" 键获取
    .outputKey("llm_summary") // 指定 LLM 的回复内容存储到 OverAllState 的 "llm_summary" 键
    .build();

// 在 StateGraph 中使用
graph.addNode("summarizer", llmNode);
```

#### 关键配置
-   `.systemPromptTemplate(String)` / `.userPromptTemplate(String)`: 定义发送给 LLM 的提示词模板。您可以在模板中使用 `{key}` 格式的占位符。
-   `.inputKey(String)` / `.inputKeys(List<String>)`: 指定用于填充提示词模板中占位符的变量来源。例如，`.inputKey("raw_text")` 会将 `state.value("raw_text")` 的值填充到 `{raw_text}` 占位符中。
-   `.outputKey(String)`: 指定 LLM 的输出（`AssistantMessage` 或 `String`）存入 `OverAllState` 的键名。
-   `.stream(boolean)`: 是否启用流式输出。启用后，输出将是一个 `AsyncGenerator<NodeOutput>`。

### `ToolNode` - 工具调用节点
`ToolNode` 用于执行由 `LlmNode` 生成的工具调用请求。它是在 ReAct 或其他 Agentic 模式中实现“行动”(Acting) 步骤的关键。

#### 核心用法
`ToolNode` 通常紧跟在 `LlmNode` 之后，处理 `LlmNode` 输出的 `AssistantMessage` 中包含的工具调用。

```java
import com.alibaba.cloud.ai.graph.node.ToolNode;

// ...
ToolNode toolExecutor = ToolNode.builder()
    // 提供所有可用的工具回调
    .toolCallbacks(List.of(weatherTool, calculatorTool))
    // 指定从哪个 key 获取包含工具调用请求的 AssistantMessage
    .inputKey("llm_output") // 假设 llm_output 是上一个 LlmNode 的 outputKey
    // 指定将工具执行结果 (List<ToolResponseMessage>) 存入哪个键
    .outputKey("tool_results")
    .build();

// 在 StateGraph 中使用
graph.addNode("execute_tools", toolExecutor);
```

#### 关键配置
-   `.toolCallbacks(List<ToolCallback>)`: 提供一个包含所有可用工具的列表。
-   `.toolCallbackResolver(ToolCallbackResolver)`: (高级用法) 提供一个 Bean 名称解析器来动态查找工具。
-   `.inputKey(String)`: 从 `OverAllState` 中获取 `AssistantMessage` 的键名。如果未指定，它会自动查找 `messages` 列表中的最后一条消息。

### `KnowledgeRetrievalNode` - 知识检索节点
该节点是实现检索增强生成 (RAG) 的核心组件。它负责根据用户查询从向量数据库中检索相关文档，并可以选择性地进行重排序。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.KnowledgeRetrievalNode;

// ...
KnowledgeRetrievalNode ragNode = KnowledgeRetrievalNode.builder()
    .vectorStore(myVectorStore) // 必需：提供 VectorStore 实例
    .inputKey("user_query") // 从 OverAllState 获取用户原始查询的键
    .topK(5) // 设置检索返回的最相似的文档数量
    .outputKey("retrieved_documents") // 将检索到的 List<Document> 存入指定的键
    // --- (可选) 启用重排序 ---
    .enableRanker(true)
    .rerankModel(myRerankModel)
    .build();
    
graph.addNode("retrieve_knowledge", ragNode);
```

#### 关键配置
-   `.vectorStore(VectorStore)`: 必需，用于执行向量搜索。
-   `.topK(int)` / `.similarityThreshold(double)`: 控制检索的数量和相似度阈值。
-   `.enableRanker(boolean)` / `.rerankModel(RerankModel)`: 用于启用和配置重排序模型，以提高检索结果的相关性。
-   `.outputKey(String)`: 默认情况下，该节点会将检索到的文档内容追加到输入的用户提示词中。如果设置了 `outputKey`，则会将 `List<Document>` 直接存入该键，而**不修改**原始输入。

### `AgentNode` - Agent 包装节点
这是一个基于 `ChatClient` 的高级 Agent 节点，内置了 ReAct 和 Tool-Calling 两种常用策略，并支持自动重试，可以快速构建一个具备工具调用能力的 Agent。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.AgentNode;
import com.alibaba.cloud.ai.graph.node.AgentNode.Strategy;

AgentNode reactAgent = AgentNode.builder()
    .chatClient(chatClient) // 必需：ChatClient 实例
    .strategy(Strategy.REACT) // 策略：REACT 或 TOOL_CALLING
    .systemPrompt("你是一个专业的AI助手，请根据用户需求调用合适的工具。")
    .userPrompt("用户请求：{user_request}，请分析并采取行动。")
    .toolCallBacks(List.of(weatherTool, calculatorTool)) // 可用工具列表
    .maxIterations(3) // 最大重试/迭代次数
    .outputKey("agent_response") // 输出键
    .build();

graph.addNode("intelligent_agent", reactAgent);
```

#### 关键配置
-   `.strategy(Strategy)`: Agent 的工作策略。`REACT`（默认）适用于需要多轮思考-行动循环的复杂任务；`TOOL_CALLING` 适用于可以直接调用工具的简单任务。
-   `.maxIterations(Integer)`: 在 `REACT` 模式下，表示最大的“思考-行动”循环次数；在 `TOOL_CALLING` 模式下，表示工具执行失败后的最大重试次数。

---

## 2. 智能文本处理

这类节点专注于理解和操作文本。

### `QuestionClassifierNode` - 文本分类节点
`QuestionClassifierNode` 是一个基于 LLM 的智能文本分类器，只需提供分类标签，即可对输入文本进行意图识别和分类。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.QuestionClassifierNode;

// ...
QuestionClassifierNode classifier = QuestionClassifierNode.builder()
    .chatClient(chatClient) // 必需：提供 ChatClient
    .inputTextKey("user_feedback") // 从 OverAllState 获取要分类的文本
    .categories(List.of("positive feedback", "negative feedback", "neutral")) // 定义分类类别
    .classificationInstructions(List.of(
        "根据用户的情感倾向对反馈进行分类", 
        "重点关注用户的语言表达和态度"
    )) // (可选) 提供更详细的分类指令
    .outputKey("classification_result") // 分类结果存储的键
    .build();

graph.addNode("classify_feedback", classifier);
```

#### 关键配置
-   `.categories(List<String>)`: **必需**，定义所有可能的分类类别。
-   `输出格式`: 分类结果是一个包含 `category_name` 和 `keywords` 字段的 JSON 对象。

### `ParameterParsingNode` - 参数提取节点
该节点专门用于从自然语言文本中提取结构化参数，例如从“帮我预订一张明天从上海到北京的机票”中提取出出发地、目的地和时间。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.ParameterParsingNode;

// ...
// 1. 定义要提取的参数
List<Map<String, String>> parameters = List.of(
    Map.of("name", "user_name", "type", "string", "description", "用户姓名"),
    Map.of("name", "age", "type", "number", "description", "用户年龄"),
    Map.of("name", "hobbies", "type", "array", "description", "用户的兴趣爱好列表")
);

// 2. 构建节点
ParameterParsingNode paramExtractor = ParameterParsingNode.builder()
    .chatClient(chatClient)
    .inputTextKey("user_input") // 输入文本的键
    .parameters(parameters) // 提供参数定义列表
    .instruction("请从用户介绍中提取个人信息") // (可选) 提供提取指令
    .outputKey("extracted_params") // 提取结果的存储键
    .build();

graph.addNode("extract_parameters", paramExtractor);
```

#### 关键配置
-   `.parameters(List<Map<String, String>>)`: **必需**，参数定义列表。每个参数都是一个 Map，包含 `name`、`type` (`string`, `number`, `boolean`, `array`) 和 `description` 三个字段。
-   `输出格式`: 提取结果是一个 `Map<String, Object>`。

### `AnswerNode` - 答案渲染节点
`AnswerNode` 用于将一个包含占位符的模板字符串渲染成最终的答案。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.AnswerNode;

// ...
AnswerNode answerRenderer = AnswerNode.builder()
    .answer("根据分析结果，用户 {user_name} 的情感倾向是 {sentiment}，主要关注点是 {main_topic}")
    .outputKey("final_answer") // 可选，默认为 "answer"
    .build();

graph.addNode("render_answer", answerRenderer);
```
-   `模板语法`: 使用 `{key}` 格式的占位符，会被替换为 `OverAllState` 中对应键的值。

### `TemplateTransformNode` - 模板转换节点
与 `AnswerNode` 类似，但功能更通用。它将模板中的 `{{key}}` 占位符替换为 `OverAllState` 中的值，常用于生成格式化的报告、JSON 或邮件内容。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.TemplateTransformNode;

TemplateTransformNode transformer = TemplateTransformNode.builder()
    .template("用户 {{user_name}} 在 {{analysis_date}} 的情感倾向是 {{sentiment}}。")
    .outputKey("formatted_report") // 可选，默认为 "result"
    .build();

graph.addNode("format_report", transformer);
```
-   `模板语法`: 使用 `{{key}}` 格式的占位符。如果变量不存在，占位符会保留，便于调试。

---

## 3. 数据与流程控制

这类节点负责处理各种数据结构，并控制工作流的走向。

### `DocumentExtractorNode` - 文档解析节点
该节点提供强大的文档内容提取能力，支持多种格式的本地或网络文件。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.DocumentExtractorNode;

// 处理单个文件
DocumentExtractorNode singleDocExtractor = DocumentExtractorNode.builder()
    .paramsKey("file_path") // 从 OverAllState 获取文件路径
    .outputKey("document_content")
    .build();

// 处理多个文件
DocumentExtractorNode multiDocExtractor = DocumentExtractorNode.builder()
    .paramsKey("file_list") // 提供文件路径列表的键
    .outputKey("documents_content")
    .inputIsArray(true) // 设为 true 以处理列表
    .build();

graph.addNode("extract_document", singleDocExtractor);
```
-   **支持格式**: txt, md, html, pdf, doc(x), xls(x), ppt(x), json, yaml 等。
-   **文件来源**: 支持本地路径 (`/path/to/file`) 和 URL (`http://...`, `ftp://...`)。

### `ListOperatorNode` - 列表操作节点
提供对列表数据的过滤、排序、限制等链式操作。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.ListOperatorNode;

// 处理 String 列表：过滤长度大于5的字符串，按长度排序，取前3个
ListOperatorNode<String> stringProcessor = ListOperatorNode.<String>builder()
    .inputKey("string_list")
    .outputKey("filtered_strings")
    .filter(str -> str.length() > 5) // 添加过滤条件
    .comparator(Comparator.comparing(String::length)) // 添加排序条件
    .limitNumber(3) // 限制结果数量
    .build();

graph.addNode("process_list", stringProcessor);
```

#### 关键配置
-   `.mode(Mode)`: 输入/输出模式。`LIST`（默认）处理 `java.util.List` 对象；`JSON_STR` 处理 JSON 数组字符串；`ARRAY` 处理 Java 数组。
-   `.elementClassType(Class<T>)`: 当模式为 `JSON_STR` 或 `ARRAY` 时**必需**，用于反序列化。
-   `.filter(Predicate<T>)` / `.comparator(Comparator<T>)`: 可链式调用以添加多个过滤和排序条件。

### `VariableAggregatorNode` - 变量聚合节点
用于从 `OverAllState` 的不同层级收集多个变量，并将它们聚合成一个新的数据结构（列表、字符串或分组的 Map）。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.VariableAggregatorNode;

// 基础聚合：收集多个变量到列表
VariableAggregatorNode basicAggregator = VariableAggregatorNode.builder()
    .variables(List.of(
        List.of("user_info"),           // 简单路径: state.value("user_info")
        List.of("analysis", "result")  // 嵌套路径: state.value("analysis").get("result")
    ))
    .outputKey("aggregated_data")
    .build(); // 默认输出为 list

graph.addNode("aggregate_variables", basicAggregator);
```
-   `.outputType(String)`: 输出格式。`list`（默认）返回列表；`string` 返回换行分隔的字符串。
-   `.advancedSettings(...)`: 支持按业务逻辑进行分组聚合，生成更复杂的 Map 结构。

### `AssignerNode` - 赋值节点
一个强大的状态写入节点，可以向 `OverAllState` 中写入、追加或清空数据。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.AssignerNode;
import com.alibaba.cloud.ai.graph.node.AssignerNode.WriteMode;

// 批量赋值操作
AssignerNode batchAssigner = AssignerNode.builder()
    .addItem("status", "current_status", WriteMode.OVER_WRITE) // 覆盖写入
    .addItem("history", "new_event", WriteMode.APPEND) // 追加到列表
    .addItem("temp_data", null, WriteMode.CLEAR) // 清空数据
    .build();

graph.addNode("update_state", batchAssigner);
```

#### 写入模式 (WriteMode)
-   `OVER_WRITE`: 覆盖写入，用源值替换目标值。
-   `APPEND`: 追加模式。如果目标是 `List`，则追加；否则创建一个新 `List`。
-   `CLEAR`: 清空模式。根据目标类型智能清空（`List`->空列表, `Map`->空Map, `String`->空字符串, `Number`->0, 其他->`null`）。

### `IterationNode` - 迭代处理节点
`IterationNode` 是一个复合节点，用于对 JSON 数组中的每个元素执行相同的处理逻辑（一个子图），是实现批量处理的关键。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.IterationNode;

// 将一个处理单个元素的子图 (processingSubGraph) 应用于数组
StateGraph iterationGraph = IterationNode.<String, String>converter()
    .inputArrayJsonKey("input_texts") // 输入 JSON 数组的键
    .outputArrayJsonKey("processed_texts") // 输出 JSON 数组的键
    .iteratorItemKey("current_text") // 在子图中，当前元素的键
    .iteratorResultKey("processed_text") // 在子图中，处理结果的键
    .subGraph(processingSubGraph) // 处理单个元素的子图
    .convertToStateGraph();

// 通常，这个 iterationGraph 会被用作一个子图节点
graph.addNode("batch_process", iterationGraph);
```

### `HumanNode` - 人机交互节点
`HumanNode` 能够中断图的执行以等待人类反馈。这是实现审批、人机协作等场景的核心。

**注意**: 使用 `HumanNode` 必须为图配置**持久化**。请参考 **[高级特性 -> 持久化与恢复](../advanced/persistence)**。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.HumanNode;

// 定义一个总是会中断的 HumanNode
HumanNode approvalNode = new HumanNode(); // 默认总是中断

// 在需要审批的步骤之后添加此节点
graph.addNode("dangerous_operation", dangerousTool)
     .addNode("wait_for_approval", approvalNode)
     .addEdge("dangerous_operation", "wait_for_approval");
```
-   工作流执行到此节点时会暂停。需要通过外部调用，使用相同的 `threadId` 再次 `invoke` 并提供反馈，流程才会继续。

### `BranchNode` - 分支节点
一个简单的数据复制/重命名节点，常用于为条件路由准备判断依据。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.BranchNode;

// 将 LlmNode 的输出 "llm_decision" 复制到 "routing_key"，
// 以便后续的条件边可以基于 "routing_key" 来判断走向。
BranchNode prepareForRouting = BranchNode.builder()
    .inputKey("llm_decision")
    .outputKey("routing_key")
    .build();

graph.addNode("prepare_branch", prepareForRouting);
```
-   它读取 `inputKey` 的值并将其写入 `outputKey`。

---

## 4. 外部集成与执行

这类节点负责与外部系统通信和执行代码。

### `HttpNode` - HTTP 请求节点
`HttpNode` 提供了一个完整的 HTTP 客户端，可以轻松地与任何 RESTful API 进行交互。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.HttpNode;
import org.springframework.http.HttpMethod;

// ...
HttpNode apiCaller = HttpNode.builder()
    .url("https://api.example.com/users/{userId}") // 支持在 URL 中使用 {key} 占位符
    .method(HttpMethod.GET) // 支持 GET, POST, PUT, DELETE 等
    .pathVariable("userId", "user_id_from_state") // {userId} 的值从 state 的 "user_id_from_state" 键获取
    .queryParam("filter", "active_users") // 从 state 的 "active_users" 键获取查询参数
    .outputKey("api_response") // 将 API 响应体存入指定的键
    .build();

graph.addNode("call_external_api", apiCaller);
```

#### 关键配置
-   `.pathVariable(...)` / `.queryParam(...)` / `.header(...)`: 第二个参数是 `OverAllState` 中的键名，用于动态填充值。
-   `.body(HttpRequestNodeBody)`: 配置 POST/PUT 请求的请求体（支持 JSON, Form, Raw 格式）。
-   `.auth(AuthConfig)`: 配置认证方式（支持 Basic Auth, Bearer Token, API Key）。

### `McpNode` - MCP 协议节点
用于与实现了模型上下文协议 (Model Context Protocol, MCP) 的外部服务通信。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.McpNode;

McpNode mcpNode = McpNode.builder()
    .url("http://localhost:8080/sse") // MCP 服务器 SSE 端点
    .tool("search_knowledge") // 要调用的 MCP 工具名称
    .header("Authorization", "Bearer ${token}") // 支持变量替换
    .param("query", "${user_query}") // 固定参数，也支持变量替换
    .inputParamKeys(List.of("search_context")) // 从状态中读取的动态参数
    .outputKey("search_results")
    .build();

graph.addNode("mcp_search", mcpNode);
```
-   **变量替换**: 在 `header`, `tool`, `param` 中均支持 `${key}` 格式的变量替换。

### `CodeExecutorNodeAction` - 代码执行节点
提供了一个安全的环境来执行多种语言的动态代码，是实现 Code Interpreter 功能的核心。

#### 核心用法
```java
import com.alibaba.cloud.ai.graph.node.code.CodeExecutorNodeAction;
import com.alibaba.cloud.ai.graph.node.code.LocalCommandlineCodeExecutor;
import com.alibaba.cloud.ai.graph.node.code.entity.CodeExecutionConfig;

// ...
CodeExecutorNodeAction pythonExecutor = CodeExecutorNodeAction.builder()
    .codeExecutor(new LocalCommandlineCodeExecutor()) // 执行器：本地命令行或 Docker
    .codeLanguage("python3") // 支持: python3, javascript, java
    .code("""
        # 您的 Python 代码
        def analyze_data(data_list):
            return sum(data_list)
        
        # 'input_data' 会被自动注入
        result = analyze_data(input_data)
        """)
    .config(new CodeExecutionConfig.Builder().timeout(60000).build()) // 配置超时等
    .params(Map.of("input_data", "numbers_list")) // 参数映射：代码中的变量名 -> state 中的键名
    .outputKey("code_execution_result")
    .build();

graph.addNode("execute_python", pythonExecutor);
```

#### 关键配置
-   `.codeExecutor(CodeExecutor)`: **必需**。`LocalCommandlineCodeExecutor`（默认）在本地执行；`DockerCodeExecutor` 在 Docker 容器中执行以提供更好的隔离性。
-   `.params(Map<String, String>)`: 定义如何将 `OverAllState` 中的数据作为变量注入到代码执行环境中。
-   `.config(CodeExecutionConfig)`: 配置执行超时、工作目录、资源限制和安全策略。
