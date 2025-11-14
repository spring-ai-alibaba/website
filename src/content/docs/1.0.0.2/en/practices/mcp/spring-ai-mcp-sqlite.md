---
title: Accessing SQLite Database with Spring AI MCP
keywords: [Spring AI, MCP, Model Context Protocol, Agent Application]
description: "Spring AI Agent integrating local file data through MCP"
---

## Case 2: Accessing SQLite Database with Spring AI MCP

This agent enables natural language interaction with an SQLite database through a command-line interface.

> You can view the [complete source code for this example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-manual-example/sqlite/ai-mcp-sqlite-chatbot).

### Running the Example

#### Prerequisites

1. Install uvx (Universal Package Manager):
   First, ensure that [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) is installed on your local machine, then run the following command:

    ```bash
    npm install -g npx
    ```

2. Download the example source code

    ```bash
    git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
    cd spring-ai-alibaba-examples/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-manual-example/sqlite/ai-mcp-sqlite-chatbot
    ```

3. Set environment variables

    ```bash
    # Tongyi LLM Dashscope API-KEY
    export AI_DASHSCOPE_API_KEY=${your-api-key-here}
    ```

4. Build the example

    ```bash
    ./mvnw clean install
    ```

#### Running the Sample Application

Run the example to query data in the database:

```bash
./mvnw spring-boot:run
```

Enter the content you want to query to perform database queries:

```
USER: What is the sum of all product prices?
ASSISTANT: The sum of all product prices is 1642.8 yuan.
```

More complex queries are also supported:

```
USER: Tell me which products have prices higher than the average
ASSISTANT:
The following products have prices higher than the average:

1. Smart Watch, priced at 199.99 yuan
2. Wireless Earbuds, priced at 89.99 yuan
3. Mini Drone, priced at 299.99 yuan
4. Keyboard, priced at 129.99 yuan
5. Gaming Headset, priced at 159.99 yuan
6. Fitness Tracker, priced at 119.99 yuan
7. Portable SSD, priced at 179.99 yuan

```

### Example Architecture (Source Code Explanation)

#### Initializing McpClient

```java
@Bean(destroyMethod = "close")
public McpSyncClient mcpClient() {

    var stdioParams = ServerParameters.builder("uvx")
            .args("mcp-server-sqlite", "--db-path", getDbPath())
            .build();

    var mcpClient = McpClient.sync(new StdioServerTransport(stdioParams),
            Duration.ofSeconds(10), new ObjectMapper());

    var init = mcpClient.initialize();

    System.out.println("MCP Initialized: " + init);

    return mcpClient;
}
```

In this code:

1. A separate process is created using the uvx package management tool to run the mcp-server-sqlite service.

2. A stdio-based transport layer is created to communicate with the MCP server run by uvx.

3. SQLite is specified as the backend database along with its location, a timeout of 10 seconds is set for operations, and Jackson is used for JSON serialization.
Finally, the connection to the MCP server is initialized.

#### Function Callbacks

Register MCP tools through Spring AI:

```java
@Bean
public List<McpFunctionCallback> functionCallbacks(McpSyncClient mcpClient) {
    return mcpClient.listTools(null)
            .tools()
            .stream()
            .map(tool -> new McpFunctionCallback(mcpClient, tool))
            .toList();
}
```

In this code:

1. Available MCP clients are obtained through mcpClient.

2. MCP clients are converted to Spring AI's Function Callbacks.

3. These Function Callbacks are registered with ChatClient.
