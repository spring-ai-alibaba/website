---
title: Chatbot
keywords: [Spring AI,DashScope]
description: "Develop Java AI applications using Spring AI."
---

Spring AI Alibaba has achieved complete adaptation with Alibaba's Qwen models. Next, this passage will show how to use Spring AI Alibaba to develop an intelligent chatbot application based on Qwen model services.

## Quick Samples

> Note: Since Spring AI Alibaba is built on Spring Boot 3.x, it requires a local JDK version of 17 or above.

1. Download Source Code

Run the following command to download the source code, then navigate into the helloworld example directory:

```shell
git clone --depth=1 https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-helloworld
```

2. Compile and Run

First, obtain a valid `API-KEY` and set the `AI_DASHSCOPE_API_KEY` environment variable. For instructions on acquiring this key, visit <a target="_blank" href="https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key">Alibaba Cloud Platform</a> .

```shell
export AI_DASHSCOPE_API_KEY=${REPLACE-WITH-VALID-API-KEY}
```

Then run example application:

```shell
./mvnw compile exec:java -Dexec.mainClass="com.alibaba.cloud.ai.example.helloworld.HelloworldApplication"
```

Access `http://localhost:18080/helloworld/simple/chat?query=Can%20you%20tell%20me%20a%20joke` to query the Qwen model and receive the response.

## Example Development Guide

The example above is essentially a standard Spring Boot application. Next, the source code is analyzed to understand the specific development workflow.

1. Add Dependency

First, add the `spring-ai-alibaba-starter` dependency to your project. It will automatically initialize `ChatClient` and `ChatModel` instances for communicating with Qwen LLM through Spring Boot's auto-configuration mechanism.

```xml
<dependency>	
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
	<version>1.0.0.2</version>
</dependency>
```

2. Inject the ChatClient

Next, inject the `ChatClient` instance into a standard Controller bean. This will enable your bean to conduct intelligent conversations with the AI model.

```java
@RestController
@RequestMapping("/helloworld")
public class HelloworldController {
	private static final String DEFAULT_PROMPT = "You are a knowledgeable intelligent chat assistant, please answer according to user questions!";

	private final ChatClient dashScopeChatClient;

	public HelloworldController(ChatClient.Builder chatClientBuilder) {
		this.dashScopeChatClient = chatClientBuilder
				.defaultSystem(DEFAULT_PROMPT)
				 // Implement a Logger Advisor
				 .defaultAdvisors(
						 new SimpleLoggerAdvisor()
				 )
				 // Configure the ChatModel Options parameters in ChatClient
				 .defaultOptions(
						 DashScopeChatOptions.builder()
								 .withTopP(0.7)
								 .build()
				 )
				 .build();
	 }

	/**
	 * ChatClient simple call
	 */
	@GetMapping("/simple/chat")
	public String simpleChat(@RequestParam(value = "query", defaultValue = "Hello, nice to meet you. Can you briefly introduce yourself?")String query) {

		return dashScopeChatClient.prompt(query).call().content();
	}
}
```

In the above example, ChatClient invokes the LLM with default parameters. Spring AI Alibaba additionally supports parameter adjustment for model interactions through `DashScopeChatOptions`, which offers two distinct configuration dimensions:

1. Global default values, i.e., the initialization parameters for `ChatClient` instances

Configuration initialization can be completed either by defining `spring.ai.dashscope.chat.options.*` in the `application.yaml` file, or by programmatically invoking constructors through `ChatClient.Builder.defaultOptions(options)` and `DashScopeChatModel(api, options)`.

2. Dynamically specify before each Prompt invocation

```java
String result = dashScopeChatClient
	.prompt(query)
	.options(DashScopeChatOptions.builder().withTopP(0.8).build())
	.call()
	.content();
```

For detailed specifications of `DashScopeChatOptions` configuration items, please refer to the reference manual.

Additionally, the model supports streaming invocation, which enables a 'typewriter effect' for data returned to the frontend:

```java
	/**
	 * ChatClient stream call
	 */
	@GetMapping("/stream/chat")
	public Flux<String> streamChat(@RequestParam(value = "query", defaultValue = "Hello, nice to meet you. Can you briefly introduce yourself?")String query, HttpServletResponse response) {

		response.setCharacterEncoding("UTF-8");
		return dashScopeChatClient.prompt(query).stream().content();
	}
```

## Chatbot with Memory

The above code is stateless - each AI model invocation does not retain context from previous calls.

One solution is to have developer-written code maintain multi-turn conversation memory during LLM invocations, though this significantly increases project code complexity.

Spring AI Alibaba provides `jdbc`, `redis`, and `elasticsearch` plugins to enable chatbot memory capabilities. Using MySQL as an example, the document will demonstrate how to quickly implement a conversational AI with memory.

1. Add Dependency

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-memory-jdbc</artifactId>
	<version>1.0.0.2</version>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.32</version>
</dependency>
```

2. JDBC Config

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/chatMemory?useUnicode=true&characterEncoding=UTF-8
    username: root
    password: root
```

3. Instantiate both the `ChatMemoryRepository` and `ChatMemory` objects

```java
// Instantiate both the ChatMemoryRepository and ChatMemory objects
ChatMemoryRepository chatMemoryRepository = MysqlChatMemoryRepository.mysqlBuilder()
     .jdbcTemplate(jdbcTemplate)
     .build();
ChatMemory chatMemory = MessageWindowChatMemory.builder()
     .chatMemoryRepository(chatMemoryRepository)
     .build();
```

4. Register the `MessageChatMemoryAdvisor` via `.defaultAdvisors()` when constructing the ChatClient

```java
public HelloworldController(JdbcTemplate jdbcTemplate, ChatClient.Builder chatClientBuilder) {
    // Instantiate both the ChatMemoryRepository and ChatMemory objects
    ChatMemoryRepository chatMemoryRepository = MysqlChatMemoryRepository.mysqlBuilder()
         .jdbcTemplate(jdbcTemplate)
         .build();
    ChatMemory chatMemory = MessageWindowChatMemory.builder()
         .chatMemoryRepository(chatMemoryRepository)
         .build();
    this.dashScopeChatClient = chatClientBuilder
         .defaultSystem(DEFAULT_PROMPT)
         .defaultAdvisors(new SimpleLoggerAdvisor())
         // Register Advisor
         .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
         .defaultOptions(
                 DashScopeChatOptions.builder()
                         .withTopP(0.7)
                         .build()
         )
         .build();
}
```

5. Pass the current session ID through `.advisors()` during each LLM invocation

```java
@GetMapping("/simple/chat")
public String simpleChat(@RequestParam(value = "query", defaultValue = "Hello, nice to meet you. Can you briefly introduce yourself?")String query,
                         @RequestParam(value = "chat-id", defaultValue = "1") String chatId) {

    return dashScopeChatClient.prompt(query)
            .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, chatId))
            .call().content();
}
```

This enables the LLM to retrieve historical messages associated with the chat ID.

## More Documents

### Other Examples

* [Other LLM Examples](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-example)
* [Chat with Memory Examples](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-chat-memory-example)

### Basic Documents

* [ChatClient](../tutorials/basics/chat-client.md)
* [Chat Memory](../tutorials/basics/memory.md)
* [Prompt Template](../tutorials/basics/prompt.md)
* [Tool Calling](../tutorials/basics/tool-calling.md)

### Advanced Examples

* [Develop a Q&A assistant using RAG](../practices/bailian/rag-agent.md)
* [Intelligent Ticket Assistant](../practices/usecase/playground-flight-booking.md)
