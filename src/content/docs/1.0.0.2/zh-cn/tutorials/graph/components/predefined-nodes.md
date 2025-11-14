---
title: 预定义节点类型
keywords: [Spring AI,预定义节点,QuestionClassifierNode,LlmNode,ToolNode,KnowledgeRetrievalNode]
description: "全面了解 Spring AI Alibaba Graph 提供的10+种预定义节点类型和使用方法。"
---

## Graph预定义组件：节点库

**Spring AI Alibaba Graph**提供了丰富的预定义节点，涵盖了AI工作流中最常用的功能组件。这些节点经过精心设计和优化，开箱即用，大幅降低了开发复杂度。

## 完整节点清单

### 核心AI节点
- **LlmNode** - 大语言模型节点，支持流式输出和工具调用
- **ToolNode** - 工具调用节点，执行外部工具函数
- **QuestionClassifierNode** - 问题分类节点，基于LLM的文本分类
- **ParameterParsingNode** - 参数解析节点，从自然语言提取结构化参数

### 数据处理节点
- **KnowledgeRetrievalNode** - 知识检索节点，向量搜索与重排序
- **DocumentExtractorNode** - 文档解析节点，多格式文档内容提取
- **ListOperatorNode** - 列表操作节点，支持过滤、排序、限制
- **VariableAggregatorNode** - 变量聚合节点，多层级数据聚合

### 网络通信节点
- **HttpNode** - HTTP请求节点，完整的RESTful API客户端
- **McpNode** - MCP协议节点，Model Context Protocol服务调用

### 控制流节点
- **HumanNode** - 人机交互节点，支持工作流中断和反馈
- **BranchNode** - 分支控制节点，简单的数据传递和转换
- **AnswerNode** - 答案渲染节点，模板化答案生成

### 代码执行节点
- **CodeExecutorNodeAction** - 代码执行节点，支持Python、JavaScript、Java

## 核心AI节点

### LlmNode - 大语言模型节点

**LlmNode**是框架中最核心的节点，封装了与大语言模型的交互逻辑。

#### 核心特性

- **多模板支持**：支持`systemPrompt`和`userPrompt`双模板配置
- **动态参数注入**：通过状态键实现运行时参数替换
- **流式输出**：原生支持流式响应处理
- **工具集成**：内置`ToolCallback`和`Advisor`支持
- **消息管理**：智能的消息链管理和上下文维护

#### 使用示例

```java
// 基础配置
LlmNode llmNode = LlmNode.builder()
    .chatClient(chatClient)
    .systemPromptTemplate("你是一个专业的AI助手")
    .userPromptTemplate("请回答以下问题：{question}")
    .params(Map.of("question", "什么是Spring AI?"))
    .messagesKey("messages")
    .stream(true)  // 启用流式输出
    .build();

// 动态状态注入
LlmNode dynamicNode = LlmNode.builder()
    .chatClient(chatClient)
    .userPromptTemplateKey("prompt_template")  // 从状态获取模板
    .paramsKey("prompt_params")                // 从状态获取参数
    .outputKey("llm_response")
    .build();
```

#### 核心特性

**1. 模板渲染机制**

```java
// 简洁的参数替换实现
private String renderPromptTemplate(String prompt, Map<String, Object> params) {
    PromptTemplate promptTemplate = new PromptTemplate(prompt);
    return promptTemplate.render(params);
}
```

**2. 流式响应处理**
```java
// 自动生成StreamingChatGenerator
if (Boolean.TRUE.equals(stream)) {
    Flux<ChatResponse> chatResponseFlux = stream();
    var generator = StreamingChatGenerator.builder()
        .startingNode("llmNode")
        .startingState(state)
        .mapResult(response -> Map.of(outputKey, response.getResult().getOutput()))
        .build(chatResponseFlux);
    return Map.of(outputKey, generator);
}
```

**3. 智能消息管理**
```java
// 支持多种消息配置方式
if (StringUtils.hasLength(systemPrompt) && StringUtils.hasLength(userPrompt)) {
    return chatClient.prompt()
        .system(systemPrompt)
        .user(userPrompt)
        .messages(messages)
        .advisors(advisors)
        .toolCallbacks(toolCallbacks)
        .call().chatResponse();
}
```

### QuestionClassifierNode - 智能问题分类节点

**QuestionClassifierNode**实现了基于少样本学习的智能文本分类功能。

#### 核心特性

- **少样本学习**：内置优化的示例提示词
- **多分类支持**：支持自定义分类标签和指令
- **关键词提取**：自动提取分类相关的关键词
- **JSON结构化输出**：标准化的分类结果格式

#### 使用示例

```java
QuestionClassifierNode classifier = QuestionClassifierNode.builder()
    .chatClient(chatClient)
    .inputTextKey("user_question")
    .categories(List.of("技术支持", "销售咨询", "产品反馈", "其他"))
    .classificationInstructions(List.of("根据用户问题的主要意图进行分类"))
    .outputKey("classification_result")
    .build();
```

#### 分类算法机制

**1. 内置示例模板**
```java
// 优化的少样本学习示例
private static final String QUESTION_CLASSIFIER_USER_PROMPT_1 = """
    { "input_text": ["I recently had a great experience with your company..."],
    "categories": ["Customer Service", "Satisfaction", "Sales", "Product"],
    "classification_instructions": ["classify based on feedback"]}
    """;
```

**2. 系统提示词模板**
```java
private static final String CLASSIFIER_PROMPT_TEMPLATE = """
    ### Job Description
    You are a text classification engine that analyzes text data...
    ### Task
    Your task is to assign one category ONLY to the input text...
    ### Format
    The input text is: {inputText}. Categories are: {categories}...
    ### Constraint
    DO NOT include anything other than the JSON array in your response.
    """;
```

### ToolNode - 工具调用节点

**ToolNode**负责处理大语言模型的工具调用请求，是实现Agent能力的关键组件。

#### 核心特性

- **工具回调机制**：支持`ToolCallback`和`ToolCallbackResolver`两种模式
- **智能消息解析**：自动从状态中提取`AssistantMessage`
- **错误处理**：完善的工具执行异常处理机制
- **结果封装**：自动生成`ToolResponseMessage`

#### 使用示例

```java
// 方式1：直接配置工具回调
ToolNode toolNode = ToolNode.builder()
    .toolCallbacks(List.of(weatherToolCallback, calculatorToolCallback))
    .llmResponseKey("llm_output")
    .outputKey("tool_result")
    .build();

// 方式2：使用工具解析器
ToolNode resolverNode = ToolNode.builder()
    .toolCallbackResolver(toolCallbackResolver)
    .build();
```

#### 工具执行机制

**1. 消息提取逻辑**
```java
// 智能的消息提取
this.assistantMessage = (AssistantMessage) state.value(this.llmResponseKey).orElseGet(() -> {
    List<Message> messages = (List<Message>) state.value("messages").orElseThrow();
    return messages.get(messages.size() - 1);
});
```

**2. 工具执行流程**
```java
// 核心执行逻辑
private ToolResponseMessage executeFunction(AssistantMessage assistantMessage, OverAllState state) {
    // 1. 解析工具调用
    // 2. 执行工具函数
    // 3. 封装响应结果
    // 4. 返回ToolResponseMessage
}
```

### KnowledgeRetrievalNode - 知识检索节点

**KnowledgeRetrievalNode**提供了企业级的知识库检索和重排序能力。

#### 核心特性

- **向量检索**：基于相似度的语义检索
- **智能重排序**：集成DashScope重排序模型
- **灵活过滤**：支持复杂的过滤表达式
- **动态配置**：运行时参数动态注入
- **内容增强**：将检索到的文档内容追加到用户提示词中

#### 使用示例

```java
KnowledgeRetrievalNode retrievalNode = KnowledgeRetrievalNode.builder()
    .userPromptKey("search_query")
    .topK(10)
    .similarityThreshold(0.7)
    .enableRanker(true)
    .rerankModel(rerankModel)
    .vectorStore(vectorStore)
    .outputKey("enhanced_prompt")
    .build();
```

#### 检索机制详解

**1. 多阶段检索流程**
```java
// 1. 向量检索
DocumentRetriever documentRetriever = VectorStoreDocumentRetriever.builder()
    .similarityThreshold(similarityThreshold)
    .topK(topK)
    .filterExpression(filterExpression)
    .vectorStore(vectorStore)
    .build();

// 2. 重排序优化
documents = enableRanker
    ? ranking(query, documents, new KnowledgeRetrievalDocumentRanker(rerankModel, rerankOptions))
    : documents;
```

**2. 内容增强输出**
```java
// 将检索到的文档内容追加到用户提示词
StringBuilder newUserPrompt = new StringBuilder(userPrompt);
for (Document document : documents) {
    newUserPrompt.append("Document: ").append(document.getFormattedContent()).append("\n");
}

// 输出增强后的提示词
if (StringUtils.hasLength(this.userPromptKey)) {
    updatedState.put(this.userPromptKey, newUserPrompt.toString());
}
else {
    updatedState.put("user_prompt", newUserPrompt.toString());
}
```

## 数据处理节点

### DocumentExtractorNode - 文档解析节点

**DocumentExtractorNode**提供了多格式文档的智能解析能力，支持从文本到复杂办公文档的统一处理。

#### 核心特性

- **多格式支持**：支持txt、md、html、pdf、docx、xlsx、pptx等15+格式
- **智能解析器选择**：根据文件扩展名自动选择最优解析器  
- **批量处理**：支持文件列表的批量解析
- **资源管理**：自动的输入流管理和异常处理

#### 支持格式

| 格式类别 | 支持格式 | 解析器 |
|---------|---------|--------|
| 文本格式 | txt | TextDocumentParser |
| 标记语言 | md, markdown | MarkdownDocumentParser |
| 网页格式 | html, htm, xml | BsHtmlDocumentParser |
| 数据格式 | json, yaml, yml | JsonDocumentParser, YamlDocumentParser |
| Office文档 | pdf, doc, docx, xls, xlsx, ppt, pptx, csv | TikaDocumentParser |

#### 使用示例

```java
DocumentExtractorNode extractor = DocumentExtractorNode.builder()
    .paramsKey("file_list")           // 从状态获取文件列表
    .outputKey("text")                // 输出到指定键(默认为"text")
    .fileList(List.of(               // 或直接指定文件列表
        "documents/user_manual.pdf",
        "data/config.yaml",
        "reports/analysis.xlsx"
    ))
    .build();
```

### ListOperatorNode - 列表操作节点

**ListOperatorNode**是一个强大的通用列表处理节点，支持过滤、排序、限制等复杂操作。

#### 核心特性

- **泛型设计**：支持String、Number、File等多种元素类型
- **链式操作**：支持多重过滤和排序条件
- **JSON序列化**：自动处理JSON输入输出转换
- **扩展性强**：易于自定义元素类型和操作逻辑

#### 支持的元素类型

**1. NumberElement - 数值元素**
```java
ListOperatorNode<NumberElement> numberNode = ListOperatorNode.<NumberElement>builder()
    .elementClassType(NumberElement.class)
    .filter(NumberElement::isInteger)              // 仅保留整数
    .comparator(NumberElement::compareToReverse)   // 降序排列
    .limitNumber(10)                               // 限制前10个
    .build();
```

**2. StringElement - 字符串元素**
```java
ListOperatorNode<StringElement> stringNode = ListOperatorNode.<StringElement>builder()
    .elementClassType(StringElement.class)
    .filter(x -> x.startsWith("prefix"))          // 前缀过滤
    .filter(x -> x.lengthNoMoreThan(100))         // 长度限制
    .comparator(StringElement::compareTo)          // 字典序排序
    .build();
```

**3. FileElement - 文件元素**
```java
ListOperatorNode<FileElement> fileNode = ListOperatorNode.<FileElement>builder()
    .elementClassType(FileElement.class)
    .filter(x -> x.excludeExtension("tmp", "log")) // 排除特定扩展名
    .filter(x -> x.sizeNoLessThan(1024))          // 最小文件大小
    .comparator(FileElement::compareSize)          // 按大小排序
    .build();
```

### CodeExecutorNodeAction - 代码执行节点

**CodeExecutorNodeAction**提供了安全的多语言代码执行环境，支持Python、JavaScript、Java等语言。

#### 核心特性

- **多语言支持**：Python3、JavaScript（Node.js）、Java
- **安全执行**：支持Docker容器和本地命令行两种执行方式
- **模板转换**：内置代码模板转换器，处理输入输出
- **超时控制**：可配置的执行超时和资源限制

#### 支持的执行环境

| 语言 | 执行器 | 容器支持 | 模板转换器 |
|------|--------|----------|-----------|
| Python3 | python3 | ✅ | Python3TemplateTransformer |
| JavaScript | nodejs | ✅ | NodeJsTemplateTransformer |
| Java | java | ✅ | JavaTemplateTransformer |

**注意**：Java支持通过本地命令行执行，需要预编译的.class文件或.jar文件。

#### 使用示例

```java
// Docker执行环境
CodeExecutorNodeAction dockerExecutor = CodeExecutorNodeAction.builder()
    .codeExecutor(new DockerCodeExecutor())
    .codeLanguage("python3")
    .code("""
        import json
        result = {"status": "success", "data": inputs[0] * 2}
        print(f"<<r>>{json.dumps(result)}<<r>>")
        """)
    .config(CodeExecutionConfig.builder()
        .timeout(30)
        .build())
    .params(Map.of("input_value", "calculation_data"))
    .outputKey("execution_result")
    .build();

// 本地执行环境
CodeExecutorNodeAction localExecutor = CodeExecutorNodeAction.builder()
    .codeExecutor(new LocalCommandlineCodeExecutor())
    .codeLanguage("javascript")
    .code("""
        const result = {
            timestamp: new Date().toISOString(),
            processed: inputs[0]
        };
        console.log(`<<r>>${JSON.stringify(result)}<<r>>`);
        """)
    .config(CodeExecutionConfig.builder()
        .timeout(15)
        .workDir("/tmp/code_exec")
        .build())
    .outputKey("js_result")
    .build();
```

## 其他预定义节点

### AnswerNode

**AnswerNode**用于将模板渲染为最终答案字符串，支持变量替换和格式化输出。

#### 核心特性

- **模板渲染**：支持`{{变量名}}`语法的模板替换
- **状态提取**：自动从状态中提取对应变量值
- **安全处理**：处理特殊字符转义和空值情况
- **固定输出**：始终输出到`answer`键

#### 使用示例

```java
AnswerNode answerNode = AnswerNode.builder()
    .answer("根据分析结果，{{analysis_result}}。建议采取以下措施：{{recommendations}}")
    .build();
```

#### 模板语法

```java
// 支持的模板语法
"用户{{user_name}}，您好！您的查询{{query}}已处理完成。"

// 变量替换示例
Map<String, Object> state = Map.of(
    "user_name", "张三",
    "query", "订单状态查询"
);
// 输出：用户张三，您好！您的查询订单状态查询已处理完成。
```

#### 技术实现

```java
@Override
public Map<String, Object> apply(OverAllState state) {
    // 使用正则表达式匹配{{key}}模式
    StringBuffer sb = new StringBuffer();
    Matcher matcher = PLACEHOLDER_PATTERN.matcher(answerTemplate);
    while (matcher.find()) {
        String key = matcher.group(1);
        Object val = state.value(key).orElse("");
        String replacement = val != null ? val.toString() : "";
        // 处理特殊字符转义
        replacement = replacement.replace("\\", "\\\\").replace("$", "\\$");
        matcher.appendReplacement(sb, replacement);
    }
    matcher.appendTail(sb);
    
    // 固定输出到answer键
    return Map.of("answer", sb.toString());
}
```

---

### BranchNode

**BranchNode**提供简单的数据传递和键值转换功能，用于在节点间传递状态数据。

#### 核心特性

- **数据传递**：从输入键读取数据，输出到指定键
- **类型转换**：自动转换为字符串格式
- **空值处理**：支持空值的安全处理
- **轻量级**：最简单的数据流控制节点

#### 使用示例

```java
BranchNode branchNode = BranchNode.builder()
    .inputKey("classification_result")
    .outputKey("next_action")
    .build();
```

#### 应用场景

```java
// 场景1：键名转换
BranchNode renameNode = BranchNode.builder()
    .inputKey("llm_output")
    .outputKey("processed_text")
    .build();

// 场景2：条件分支准备
BranchNode prepareBranch = BranchNode.builder()
    .inputKey("decision")
    .outputKey("branch_condition")
    .build();
```

---

### ParameterParsingNode

**ParameterParsingNode**使用大语言模型从自然语言文本中提取结构化参数。

#### 核心特性

- **智能解析**：基于LLM的参数提取能力
- **结构化输出**：返回JSON格式的参数对象
- **类型支持**：支持string、number、boolean、array类型
- **少样本学习**：内置示例提高解析准确性

#### 使用示例

```java
ParameterParsingNode paramNode = ParameterParsingNode.builder()
    .chatClient(chatClient)
    .inputTextKey("user_input")
    .parameters(List.of(
        Map.of("name", "paper_num", "type", "string", "description", "论文编号"),
        Map.of("name", "author_name", "type", "string", "description", "作者姓名"),
        Map.of("name", "keywords", "type", "array", "description", "关键词列表")
    ))
    .outputKey("extracted_params")
    .build();
```

#### 参数定义格式

```java
List<Map<String, String>> parameters = List.of(
    Map.of(
        "name", "start_date",
        "type", "string", 
        "description", "开始日期，格式为YYYY-MM-DD"
    ),
    Map.of(
        "name", "amount",
        "type", "number", 
        "description", "金额数值"
    ),
    Map.of(
        "name", "is_urgent",
        "type", "boolean", 
        "description", "是否紧急"
    ),
    Map.of(
        "name", "categories",
        "type", "array", 
        "description", "分类列表"
    )
);
```

#### 内置提示词模板

```java
private static final String PARAMETER_PARSING_PROMPT_TEMPLATE = """
    ### Role
    You are a JSON-based structured data extractor. Your task is to extract parameter values
    from user input.
    ### Task
    Given user input and a list of expected parameters (with names, types, and descriptions
    Type can be "string", "number", "boolean", or "array"),
    return a valid JSON object containing those parameter values.
    ### Input
    Text: {inputText}
    ### Parameters:
    {parameters}
    ### Output Constraints
    - Return ONLY a valid JSON object containing all defined keys.
    - Missing values must be set to null.
    - DO NOT include any explanation, markdown, or preamble.
    - Output must be directly parsable as JSON.
    """;
```

---

### VariableAggregatorNode

**VariableAggregatorNode**提供强大的变量聚合和组织功能，支持多层次路径访问和分组输出。

#### 核心特性

- **路径访问**：支持多层次变量路径访问
- **灵活聚合**：支持list和string两种聚合方式
- **分组功能**：支持高级分组设置
- **类型转换**：智能的输出格式转换

#### 使用示例

```java
VariableAggregatorNode aggregator = VariableAggregatorNode.builder()
    .variables(List.of(
        List.of("user", "name"),
        List.of("user", "email"),
        List.of("order", "id"),
        List.of("order", "total")
    ))
    .outputKey("aggregated_data")
    .outputType("list")
    .build();
```

#### 高级分组功能

```java
VariableAggregatorNode.AdvancedSettings advancedSettings = 
    new VariableAggregatorNode.AdvancedSettings()
        .setGroupEnabled(true)
        .setGroups(List.of(
            new VariableAggregatorNode.Group() {{
                setGroupName("user_info");
                setOutputType("string");
                setVariables(List.of(
                    List.of("user", "name"),
                    List.of("user", "email")
                ));
            }},
            new VariableAggregatorNode.Group() {{
                setGroupName("order_info");
                setOutputType("list");
                setVariables(List.of(
                    List.of("order", "id"),
                    List.of("order", "total")
                ));
            }}
        ));

VariableAggregatorNode groupedAggregator = VariableAggregatorNode.builder()
    .variables(variables)
    .outputKey("grouped_result")
    .outputType("group")
    .advancedSettings(advancedSettings)
    .build();
```

#### 路径访问机制

```java
// 支持的路径格式
List.of("user", "profile", "name")     // 访问 state.user.profile.name
List.of("config", "database", "host")  // 访问 state.config.database.host
List.of("results", "0", "score")       // 访问 state.results[0].score
```

---

### HttpNode

**HttpNode**提供完整的HTTP客户端功能，支持各种HTTP方法、认证方式和响应处理。

#### 核心特性

- **多种HTTP方法**：GET、POST、PUT、DELETE等
- **认证支持**：Basic Auth、Bearer Token、API Key
- **变量替换**：URL和参数中的动态变量替换
- **文件处理**：自动检测和处理文件下载
- **重试机制**：可配置的重试策略
- **响应解析**：智能的JSON/文本响应处理

#### 使用示例

```java
HttpNode httpNode = HttpNode.builder()
    .webClient(webClient)
    .method(HttpMethod.POST)
    .url("https://api.example.com/users/${user_id}/orders")
    .header("Authorization", "Bearer ${token}")
    .header("Content-Type", "application/json")
    .queryParam("limit", "10")
    .body(new HttpRequestNodeBody() {{
        setType("json");
        setData(Map.of(
            "product_id", "${product_id}",
            "quantity", "${quantity}"
        ));
    }})
    .auth(new AuthConfig("basic", "username", "password"))
    .retryConfig(new RetryConfig(3, 2000, true))
    .outputKey("api_response")
    .build();
```

#### 认证配置

```java
// Basic认证
AuthConfig basicAuth = new AuthConfig("basic", "username", "password");

// Bearer Token
AuthConfig bearerAuth = new AuthConfig("bearer", null, "your_token_here");

// API Key
AuthConfig apiKeyAuth = new AuthConfig("api_key", "X-API-Key", "your_api_key");
```

#### 请求体配置

```java
// JSON请求体
HttpRequestNodeBody jsonBody = new HttpRequestNodeBody();
jsonBody.setType("json");
jsonBody.setData(Map.of(
    "name", "${user_name}",
    "email", "${user_email}"
));

// 表单请求体
HttpRequestNodeBody formBody = new HttpRequestNodeBody();
formBody.setType("form");
formBody.setData(Map.of(
    "field1", "value1",
    "field2", "${dynamic_value}"
));

// 原始文本
HttpRequestNodeBody rawBody = new HttpRequestNodeBody();
rawBody.setType("raw");
rawBody.setData("Raw text content with ${variables}");
```

#### 变量替换

```java
// 支持的变量替换格式
"https://api.example.com/users/${user_id}"     // URL中的变量
"Bearer ${access_token}"                        // Header中的变量
Map.of("param", "${state_value}")              // 参数中的变量
```

---

### McpNode

**McpNode**提供Model Context Protocol (MCP)服务器调用功能，支持与外部MCP服务的集成。

#### 核心特性

- **MCP协议支持**：完整的MCP客户端实现
- **工具调用**：调用MCP服务器提供的工具
- **参数映射**：灵活的参数传递和映射
- **连接管理**：自动的连接建立和清理
- **错误处理**：完善的异常处理机制

#### 使用示例

```java
McpNode mcpNode = McpNode.builder()
    .url("http://localhost:8080/mcp")
    .tool("database_query")
    .header("Authorization", "Bearer token")
    .param("query", "SELECT * FROM users WHERE id = ${user_id}")
    .param("database", "production")
    .inputParamKeys(List.of("user_id", "filters"))
    .outputKey("query_result")
    .build();
```

#### 工具调用配置

```java
McpNode analyticsNode = McpNode.builder()
    .url("http://analytics-service:9090/mcp")
    .tool("generate_report")
    .param("report_type", "sales")
    .param("start_date", "${start_date}")
    .param("end_date", "${end_date}")
    .param("format", "json")
    .inputParamKeys(List.of("start_date", "end_date", "department"))
    .outputKey("analytics_report")
    .build();
```

#### 参数处理机制

```java
// 静态参数配置
.param("static_key", "static_value")

// 动态参数（从状态中获取）
.inputParamKeys(List.of("dynamic_key1", "dynamic_key2"))

// 变量替换（在静态参数值中）
.param("query", "SELECT * FROM ${table_name} WHERE id = ${record_id}")
```

#### MCP客户端配置

```java
// 基本连接配置
private HttpClientSseClientTransport transport;
private McpSyncClient client;

// 初始化连接
transport = HttpClientSseClientTransport.builder()
    .baseUrl(resolvedUrl)
    .headers(resolvedHeaders)
    .build();
client = McpClient.sync(transport);

// 工具调用
CallToolResult result = client.callTool(tool, resolvedParams);
```

