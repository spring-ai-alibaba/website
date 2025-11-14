---
title: 模型评估
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "Spring AI Alibaba模型上下文协议（Model Context Protocol）评估"
---

## 评估测试

测试 AI 应用程序需要评估生成的内容，以确保 AI 模型没有产生幻觉响应。

一种评估响应的方法是使用 AI 模型本身进行评估。选择最适合评估的 AI 模型，这可能与用于生成响应的模型不同。

Spring AI 用于评估响应的接口是 `Evaluator`，定义如下：

```java
@FunctionalInterface
public interface Evaluator {
    EvaluationResponse evaluate(EvaluationRequest evaluationRequest);
}
```

评估的输入是 `EvaluationRequest`，定义如下：

```java
public class EvaluationRequest {

	private final String userText;

	private final List<Content> dataList;

	private final String responseContent;

	public EvaluationRequest(String userText, List<Content> dataList, String responseContent) {
		this.userText = userText;
		this.dataList = dataList;
		this.responseContent = responseContent;
	}

  ...
}
```

- `userText`: 用户的原始输入，作为 String 类型

- `dataList`: 上下文数据，例如来自检索增强生成(RAG)的数据，附加到原始输入

- `responseContent`: AI 模型的响应内容，作为 String 类型

### 相关性评估器

`RelevancyEvaluator` 是 `Evaluator` 接口的一个实现，旨在评估 AI 生成的响应与提供的上下文的相关性。这个评估器通过确定 AI 模型的响应是否与用户的输入和检索到的上下文相关，来帮助评估 RAG 流程的质量。

评估基于用户输入、AI 模型的响应和上下文信息。它使用提示模板来询问 AI 模型响应是否与用户输入和上下文相关。

这是 `RelevancyEvaluator` 使用的默认提示模板：

```text
你的任务是评估查询的响应
是否符合提供的上下文信息。

你有两个选项来回答。要么是 YES 要么是 NO。

如果查询的响应
符合上下文信息则回答 YES，否则回答 NO。

查询：
{query}

响应：
{response}

上下文：
{context}

回答：
```

注意：你可以通过 .promptTemplate() 构建器方法提供自己的 PromptTemplate 对象来自定义提示模板。

### 在集成测试中的使用

以下是在集成测试中使用 `RelevancyEvaluator` 的示例，使用 `RetrievalAugmentationAdvisor` 验证 RAG 流程的结果：

```java
@Test
void evaluateRelevancy() {
    String question = "Anacletus 和 Birba 的冒险发生在哪里？";

    RetrievalAugmentationAdvisor ragAdvisor = RetrievalAugmentationAdvisor.builder()
        .documentRetriever(VectorStoreDocumentRetriever.builder()
            .vectorStore(pgVectorStore)
            .build())
        .build();

    ChatResponse chatResponse = ChatClient.builder(chatModel).build()
        .prompt(question)
        .advisors(ragAdvisor)
        .call()
        .chatResponse();

    EvaluationRequest evaluationRequest = new EvaluationRequest(
        // 原始用户问题
        question,
        // 从 RAG 流程中检索到的上下文
        chatResponse.getMetadata().get(RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT),
        // AI 模型的响应
        chatResponse.getResult().getOutput().getText()
    );

    RelevancyEvaluator evaluator = new RelevancyEvaluator(ChatClient.builder(chatModel));

    EvaluationResponse evaluationResponse = evaluator.evaluate(evaluationRequest);

    assertThat(evaluationResponse.isPass()).isTrue();
}
```

你可以在 Spring AI 项目中找到几个使用 `RelevancyEvaluator` 来测试 `QuestionAnswerAdvisor` 功能的集成测试和 `RetrievalAugmentationAdvisor`。

#### 自定义模板

`RelevancyEvaluator` 使用默认模板来提示 AI 模型进行评估。你可以通过 `.promptTemplate()` 构建器方法提供自己的 `PromptTemplate` 对象来自定义此行为。

自定义 `PromptTemplate` 可以使用任何 `TemplateRenderer` 实现（默认情况下，它使用基于 `StringTemplate` 引擎的 `StPromptTemplate`）。重要要求是模板必须包含以下占位符：

- `query` 占位符用于接收用户问题

- `response` 占位符用于接收 AI 模型的响应

- `context` 占位符用于接收上下文信息

### 事实检查评估器

`FactCheckingEvaluator` 是 `Evaluator` 接口的另一个实现，旨在评估 AI 生成的响应与提供的上下文的事实准确性。这个评估器通过验证给定陈述（声明）是否在逻辑上得到提供的上下文（文档）的支持，来帮助检测和减少 AI 输出中的幻觉。

'声明’和’文档’被呈现给 AI 模型进行评估。有一些专门用于此目的的较小且更高效的 AI 模型可用，例如 `Bespoke` 的 `Minicheck`，这有助于降低执行这些检查的成本，相比旗舰模型如 GPT-4。`Minicheck` 也可以通过 Ollama 使用。

#### 使用

`FactCheckingEvaluator` 构造函数接受一个 `ChatClient.Builder` 作为参数：

```java
public FactCheckingEvaluator(ChatClient.Builder chatClientBuilder) {
  this.chatClientBuilder = chatClientBuilder;
}
```

评估器使用以下提示模板进行事实检查：

```text
文档：{document}
声明：{claim}
```

其中 `{document}` 是上下文信息，`{claim}` 是要评估的 AI 模型响应。

#### 示例

以下是如何使用基于 Ollama 的 ChatModel（特别是 Bespoke-Minicheck 模型）的 `FactCheckingEvaluator` 的示例：

```java
@Test
void testFactChecking() {
  // 设置 Ollama API
  OllamaApi ollamaApi = new OllamaApi("http://localhost:11434");

  ChatModel chatModel = new OllamaChatModel(ollamaApi,
				OllamaOptions.builder().model(BESPOKE_MINICHECK).numPredict(2).temperature(0.0d).build())


  // 创建 FactCheckingEvaluator
  var factCheckingEvaluator = new FactCheckingEvaluator(ChatClient.builder(chatModel));

  // 示例上下文和声明
  String context = "地球是太阳系中第三颗行星，也是已知唯一存在生命的行星。";
  String claim = "地球是太阳系中第四颗行星。";

  // 创建 EvaluationRequest
  EvaluationRequest evaluationRequest = new EvaluationRequest(context, Collections.emptyList(), claim);

  // 执行评估
  EvaluationResponse evaluationResponse = factCheckingEvaluator.evaluate(evaluationRequest);

  assertFalse(evaluationResponse.isPass(), "声明不应该被上下文支持");

}
```

### Spring AI Alibaba实现

#### LaajEvaluator（Evaluator接口实现）

`LaajEvaluator`通过实现Evaluator接口并添加下面三个变量提供具体实现类额外的规范

```java
public abstract class LaajEvaluator implements Evaluator {

    private ChatClient.Builder chatClientBuilder;//聊天客户端builder

    private String evaluationPromptText;//分析提示词文本

    private ObjectMapper objectMapper;//负责序列化工作
}
```

#### AnswerCorrectnessEvaluator

##### 源码分析

`AnswerCorrectnessEvaluator`负责评估Query返回的Response是否符合提供的Context信息

```java
public class AnswerCorrectnessEvaluator extends LaajEvaluator {
    
    private static final String DEFAULT_EVALUATION_PROMPT_TEXT = """
            你的任务是评估Query返回的Response是否符合提供的Context信息。
            你有两个选项来回答，要么是"YES"/"NO"。
            如果查询的响应与上下文信息一致，回答"YES"，否则回答"NO"。
            
            Query: {query}
            Response: {response}
            Context: {context}
            
            Answer: "
            """;

	@Override
	public EvaluationResponse evaluate(EvaluationRequest evaluationRequest) {
		// Add parameter validation
		if (evaluationRequest == null) {
			throw new IllegalArgumentException("EvaluationRequest must not be null");
		}

        //获取response和context
		var response = doGetResponse(evaluationRequest);
		var context = doGetSupportingData(evaluationRequest);

        //创建评估客户端，并且将评估提示词，问题(query)，需要评估的响应(response)，上下文信息(context)，最后进行评估操作
		String evaluationResponse = getChatClientBuilder().build()
			.prompt()
			.user(userSpec -> userSpec.text(getEvaluationPromptText())
				.param("query", evaluationRequest.getUserText())
				.param("response", response)
				.param("context", context))
			.call()
			.content();

        //获取评估结果
		boolean passing = false;
		float score = 0;
		if (evaluationResponse.toUpperCase().contains("YES")) {
			passing = true;
			score = 1;
		}

		return new EvaluationResponse(passing, score, "", Collections.emptyMap());
	}
}
```

##### 测试代码

以下是在集成测试中使用 `AnswerCorrectnessEvaluator` 的示例

```java
class AnswerCorrectnessEvaluatorTests {

    // Test constants
    private static final String TEST_QUERY = "What is Spring AI?";//测试问题

    private static final String TEST_RESPONSE = "Spring AI is a framework for building AI applications.";//测试问题的大模型客户端响应

    private static final String TEST_CONTEXT = "Spring AI is a framework for building AI applications.";//测试问题正确答案

    private static final String CUSTOM_PROMPT = "Custom evaluation prompt text";

    private ChatClient chatClient;

    private ChatClient.Builder chatClientBuilder;

    private AnswerCorrectnessEvaluator evaluator;

    //每个测试方法运行前的初始化代码
    @BeforeEach
    void setUp() {
        // Initialize mocks and evaluator
        chatClient = Mockito.mock(ChatClient.class);
        chatClientBuilder = Mockito.mock(ChatClient.Builder.class);
        when(chatClientBuilder.build()).thenReturn(chatClient);
        evaluator = new AnswerCorrectnessEvaluator(chatClientBuilder);
    }

    //模拟聊天响应体
    /**
     * Helper method to mock chat client response
     */
    private void mockChatResponse(String content) {
        ChatClient.ChatClientRequestSpec requestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec responseSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        // Mock the chain of method calls
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(any(Consumer.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(responseSpec);
        when(responseSpec.content()).thenReturn(content);
    }

    //评估正确的响应结果的测试
    /**
     * Test evaluation when the answer is correct according to the context. Should return
     * a passing evaluation with score 1.0.
     */
    @Test
    void testEvaluateCorrectAnswer() {
        // Mock chat client to return "YES" for correct answer
        mockChatResponse("YES");

        // Create evaluation request with matching response and context
        EvaluationRequest request = createEvaluationRequest(TEST_QUERY, TEST_RESPONSE, TEST_CONTEXT);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(1.0f);
    }

    //评估错误的响应结果的测试
    /**
     * Test evaluation when the answer is incorrect or inconsistent with the context.
     * Should return a failing evaluation with score 0.0.
     */
    @Test
    void testEvaluateIncorrectAnswer() {
        // Mock chat client to return "NO" for incorrect answer
        mockChatResponse("NO");

        // Create evaluation request with incorrect response
        EvaluationRequest request = createEvaluationRequest(TEST_QUERY, "Spring AI is a database management system.",
                TEST_CONTEXT);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(0.0f);
    }
}
```

#### AnswerFaithfulnessEvaluator

##### 源码介绍

`AnswerFaithfulnessEvaluator`作为`LaajEvaluator`的另一个实现类主要功能是将STUDENT ANSWER根据一些FACTS通过预先设定好的评分标准进行评估，并且最终输出格式为JSON。

```java
public class AnswerFaithfulnessEvaluator extends LaajEvaluator {

    private static final String DEFAULT_EVALUATION_PROMPT_TEXT = """
            您是一名评测专家，能够基于提供的评分标准和内容信息进行评分。
            您将获得一些FACTS(事实内容)和STUDENT ANSWER。
            
            以下是评分标准：
            (1) 确保STUDENT ANSWER的内容是基于FACTS的事实内容，不能随意编纂。
            (2) 确保STUDENT ANSWER的内容没有超出FACTS的内容范围外的虚假信息。
            
            Score:
            得分为1意味着STUDENT ANSWER满足所有标准。这是最高（最佳）得分。
            得分为0意味着STUDENT ANSWER没有满足所有标准。这是最低的得分。
            
            请逐步解释您的推理，以确保您的推理和结论正确，避免简单地陈述正确答案。
            
            最终答案按照标准的json格式输出,不要使用markdown的格式, 比如:
            \\{"score": 0.7, "feedback": "STUDENT ANSWER的内容超出了FACTS的事实内容。"\\}
            
            FACTS: {context}
            STUDENT ANSWER: {student_answer}
            """;

    @Override
    public EvaluationResponse evaluate(EvaluationRequest evaluationRequest) {
        // Add parameter validation
        if (evaluationRequest == null) {
            throw new IllegalArgumentException("EvaluationRequest must not be null");
        }

        //获取response和context
        var response = doGetResponse(evaluationRequest);
        var context = doGetSupportingData(evaluationRequest);

        //创建评估客户端，并且将评估提示词，需要评估的学生答案(response)，上下文信息(context)，最后进行评估操作
        String llmEvaluationResponse = getChatClientBuilder().build()
                .prompt()
                .user(userSpec -> userSpec.text(getEvaluationPromptText())
                        .param("context", context)
                        .param("student_answer", response))
                .call()
                .content();

        //将评估结果以JSON的格式读取
        JsonNode evaluationResponse = null;
        try {
            evaluationResponse = getObjectMapper().readTree(llmEvaluationResponse);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        //获取响应内容中的评分和反馈结果两部分，并对评估结果进行基础判断（passing）
        float score = (float) evaluationResponse.get("score").asDouble();
        String feedback = evaluationResponse.get("feedback").asText();
        boolean passing = score > 0;
        
        //封装必要的响应信息并返回
        return new EvaluationResponse(passing, score, feedback, Collections.emptyMap());
    }
}
```

##### 测试代码

以下是在集成测试中使用 `AnswerFaithfulnessEvaluator` 的示例

```java
class AnswerFaithfulnessEvaluatorTests {

    // Test constants
    private static final String TEST_FACTS = "The Earth is the third planet from the Sun and the only astronomical object known to harbor life.";//测试问题正确答案

    private static final String TEST_STUDENT_ANSWER = "The Earth is the third planet from the Sun and supports life.";//测试问题的大模型客户端响应

    private static final String CUSTOM_PROMPT = "Custom evaluation prompt text";

    private ChatClient chatClient;

    private ChatClient.Builder chatClientBuilder;

    private AnswerFaithfulnessEvaluator evaluator;

    //每个测试方法运行前的初始化代码
    @BeforeEach
    void setUp() {
        // Initialize mocks and evaluator
        chatClient = Mockito.mock(ChatClient.class);
        chatClientBuilder = Mockito.mock(ChatClient.Builder.class);
        when(chatClientBuilder.build()).thenReturn(chatClient);

        // Initialize evaluator with ObjectMapper
        ObjectMapper objectMapper = new ObjectMapper();
        evaluator = new AnswerFaithfulnessEvaluator(chatClientBuilder, objectMapper);
    }

    //模拟聊天响应体
    /**
     * Helper method to mock chat client response
     */
    private void mockChatResponse(String content) {
        ChatClient.ChatClientRequestSpec requestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec responseSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        // Mock the chain of method calls
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(any(Consumer.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(responseSpec);
        when(responseSpec.content()).thenReturn(content);
    }

    //评估正确的响应结果的测试
    /**
     * Test evaluation when the student answer is faithful to the facts. Should return a
     * passing evaluation with high score.
     */
    @Test
    void testEvaluateFaithfulAnswer() {
        // Mock chat client to return a high score response
        mockChatResponse("{\"score\": 1.0, \"feedback\": \"The answer is faithful to the facts.\"}");

        // Create evaluation request with faithful answer
        EvaluationRequest request = createEvaluationRequest(TEST_STUDENT_ANSWER, TEST_FACTS);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(1.0f);
        assertThat(response.getFeedback()).isEqualTo("The answer is faithful to the facts.");
    }

    //评估错误的响应结果的测试
    /**
     * Test evaluation when the student answer contains fabricated information. Should
     * return a failing evaluation with low score.
     */
    @Test
    void testEvaluateUnfaithfulAnswer() {
        // Mock chat client to return a low score response
        mockChatResponse("{\"score\": 0.0, \"feedback\": \"The answer contains fabricated information.\"}");

        // Create evaluation request with unfaithful answer
        String unfaithfulAnswer = "The Earth is the third planet and has three moons.";
        EvaluationRequest request = createEvaluationRequest(unfaithfulAnswer, TEST_FACTS);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(0.0f);
        assertThat(response.getFeedback()).isEqualTo("The answer contains fabricated information.");
    }
}
```

#### AnswerRelevancyEvaluator

##### 源码介绍

`AnswerRelevancyEvaluator`也是`LaajEvaluator`的一个继承类。主要功能：通过提供的正确基准答案对大模型客户端给出的响应(STUDENT ANSWER)进行评分。评分过程中要求STUDENT ANSWER不能出现内容前后冲突的情况。并且该评估模型要求输出格式为JSON类型。

```java
public class AnswerRelevancyEvaluator extends LaajEvaluator {

    //AnswerRelevancyEvaluator评估模型的默认提示词
    private static final String DEFAULT_EVALUATION_PROMPT_TEXT = """
            您是一名评测专家，能够基于提供的评分标准和内容信息进行评分。
            您将获得一个QUESTION, GROUND TRUTH (correct) ANSWER和STUDENT ANSWER。
            
            以下是评分标准：
            (1) 基于提供的GROUND TRUTH ANSWER作为正确基准答案，对STUDENT ANSWER的事实性、准确性和相关性进行评分。
            (2) 确保STUDENT ANSWER不包含任何冲突的陈述和内容。
            (3) 可以接受STUDENT ANSWER比GROUND TRUTH ANSWER包含更多的信息，只要对于GROUND TRUTH ANSWER保证事实性、准确性和相关性.
            
            Score:
            得分为1意味着STUDENT ANSWER满足所有标准。这是最高（最佳）得分。
            得分为0意味着STUDENT ANSWER没有满足所有标准。这是最低的得分。
            
            请逐步解释您的推理，以确保您的推理和结论正确。
            避免简单地陈述正确答案。
            
            最终答案按照标准的json格式输出, 比如:
            \\{"score": 0.7, "feedback": "GROUND TRUTH ANSWER与STUDENT ANSWER完全不相关。"\\}
            
            QUESTION: {question}
            GROUND TRUTH ANSWER: {correct_answer}
            STUDENT ANSWER: {student_answer}
            """;

    @Override
    public EvaluationResponse evaluate(EvaluationRequest evaluationRequest) {
        // Add parameter validation
        if (evaluationRequest == null) {
            throw new IllegalArgumentException("EvaluationRequest must not be null");
        }
        
        //获取response和context
        var response = doGetResponse(evaluationRequest);
        var context = doGetSupportingData(evaluationRequest);

        //创建评估客户端，并且将评估提示词，需要评估的问题(question)，学生答案(response)，正确答案(context)，最后进行评估操作
        String llmEvaluationResponse = getChatClientBuilder().build()
                .prompt()
                .user(userSpec -> userSpec.text(getEvaluationPromptText())
                        .param("question", evaluationRequest.getUserText())
                        .param("correct_answer", context)
                        .param("student_answer", response))
                .call()
                .content();

        //将评估结果以JSON的格式读取
        JsonNode evaluationResponse = null;
        try {
            evaluationResponse = getObjectMapper().readTree(llmEvaluationResponse);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        //获取响应内容中的评分和反馈结果两部分，并对评估结果进行基础判断（passing）
        float score = (float) evaluationResponse.get("score").asDouble();
        String feedback = evaluationResponse.get("feedback").asText();
        boolean passing = score > 0;
        
        //封装必要的响应信息并返回
        return new EvaluationResponse(passing, score, feedback, Collections.emptyMap());
    }
}
```

##### 测试代码：

以下是在集成测试中使用 `AnswerRelevancyEvaluator` 的示例

```java
class AnswerRelevancyEvaluatorTests {

    // Test constants
    private static final String TEST_QUESTION = "What is the capital of France?";//测试问题

    private static final String TEST_CORRECT_ANSWER = "The capital of France is Paris, which is also the largest city in the country.";//测试问题评估正确答案

    private static final String TEST_STUDENT_ANSWER = "Paris is the capital city of France.";//测试问题的大模型客户端响应

    private static final String CUSTOM_PROMPT = "Custom evaluation prompt text";

    private ChatClient chatClient;

    private ChatClient.Builder chatClientBuilder;

    private AnswerRelevancyEvaluator evaluator;

    //每个测试方法运行前的初始化代码
    @BeforeEach
    void setUp() {
        // Initialize mocks and evaluator
        chatClient = Mockito.mock(ChatClient.class);
        chatClientBuilder = Mockito.mock(ChatClient.Builder.class);
        when(chatClientBuilder.build()).thenReturn(chatClient);

        // Initialize evaluator with ObjectMapper to avoid NPE
        ObjectMapper objectMapper = new ObjectMapper();
        evaluator = new AnswerRelevancyEvaluator(chatClientBuilder, objectMapper);
    }

    //模拟聊天响应体
    /**
     * Helper method to mock chat client response
     */
    private void mockChatResponse(String content) {
        ChatClient.ChatClientRequestSpec requestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec responseSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        // Mock the chain of method calls
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(any(Consumer.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(responseSpec);
        when(responseSpec.content()).thenReturn(content);
    }

    //评估正确的响应结果的测试
    /**
     * Test evaluation when the student answer is relevant and accurate. Should return a
     * passing evaluation with high score.
     */
    @Test
    void testEvaluateRelevantAnswer() {
        // Mock chat client to return a high score response
        mockChatResponse("{\"score\": 1.0, \"feedback\": \"The answer is accurate and relevant.\"}");

        // Create evaluation request with relevant answer
        EvaluationRequest request = createEvaluationRequest(TEST_QUESTION, TEST_STUDENT_ANSWER, TEST_CORRECT_ANSWER);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(1.0f);
        assertThat(response.getFeedback()).isEqualTo("The answer is accurate and relevant.");
    }

    //评估错误的响应结果的测试
    /**
     * Test evaluation when the student answer is irrelevant. Should return a failing
     * evaluation with low score.
     */
    @Test
    void testEvaluateIrrelevantAnswer() {
        // Mock chat client to return a low score response
        mockChatResponse("{\"score\": 0.0, \"feedback\": \"The answer is completely irrelevant to the question.\"}");

        // Create evaluation request with irrelevant answer
        String irrelevantAnswer = "London is the capital of England.";
        EvaluationRequest request = createEvaluationRequest(TEST_QUESTION, irrelevantAnswer, TEST_CORRECT_ANSWER);

        // Evaluate and verify
        EvaluationResponse response = evaluator.evaluate(request);
        assertThat(response.getScore()).isEqualTo(0.0f);
        assertThat(response.getFeedback()).isEqualTo("The answer is completely irrelevant to the question.");
    }
}
```

