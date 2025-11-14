---
title: Accessing Local File System with Spring AI MCP
keywords: [Spring AI, MCP, Model Context Protocol, Agent Application]
description: "Spring AI Agent integrating local file data through MCP"
---

## Case 1: Accessing Local File System with Spring AI MCP

Here we provide a sample agent application that can query or update the local file system via MCP and interact with the model using data from the file system as context. This example demonstrates how to use the Model Context Protocol (MCP) to integrate Spring AI with the local file system.

> You can view the [complete source code for this example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-manual-example/ai-mcp-fileserver).

### Running the Example

#### Prerequisites

1. Install npx (Node Package eXecute):
   First, ensure that [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) is installed on your local machine, then run the following command:

    ```bash
    npm install -g npx
    ```

2. Download the example source code

    ```bash
    git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
    cd spring-ai-alibaba-examples/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-manual-example/ai-mcp-fileserver
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

Run the example, and the agent will send questions to the model (the source code includes preset questions, which you can view in the source code). You can check the output results through the console.

```bash
./mvnw spring-boot:run
```

> If you are running the example in an IDE and encounter file access permission issues returned by the filesystem mcp server, please ensure that the current process working directory is set to the spring-ai-alibaba-mcp-example/filesystem directory.

### Example Architecture (Source Code Explanation)

In the previous section, we explained the basic architecture of integrating Spring AI with MCP. In the following example, we will use these key components:

1. **MCP Client**, the key to integrating with MCP, providing the ability to interact with the local file system.
2. **Function Callbacks**, Spring AI MCP's function calling declaration method.
3. **Chat Client**, a key component of Spring AI, used for LLM model interaction and agent proxying.

#### Declaring ChatClient

```java
// List<McpFunctionCallback> functionCallbacks;
var chatClient = chatClientBuilder.defaultFunctions(functionCallbacks).build();
```

As with developing previous Spring AI applications, we first define a ChatClient Bean for interacting with the large model. Note that the functions we inject into ChatClient are created through the MCP component (McpFunctionCallback).

Let's take a closer look at how McpFunctionCallback is used.

#### Declaring MCP Function Callbacks

The following code snippet interacts with the MCP server through `mcpClient` and adapts MCP tools as standard Spring AI functions through McpFunctionCallback.

1. Discover the list of available tools in the MCP server (called functions in Spring AI)
2. Convert each tool into a Spring AI function callback
3. We will ultimately register these McpFunctionCallbacks with ChatClient

```java
@Bean
public List<McpFunctionCallback> functionCallbacks(McpSyncClient mcpClient) {
    // Get the list of tools from the MCP server
    return mcpClient.listTools(null)
            // Convert each tool to a Function Callback
            .tools()
            .stream()
            .map(tool -> new McpFunctionCallback(mcpClient, tool))
            .toList();
}
```

As you can see, the process of ChatClient interacting with the model remains unchanged. When needed, the model informs ChatClient to make function calls, but Spring AI delegates the actual function call process to MCP through McpFunctionCallback, interacting with the local file system via the standard MCP protocol:

- During interaction with the large model, ChatClient handles related function calls requests
- ChatClient calls MCP tools (through McpClient)
- McpClient interacts with the MCP server (i.e., filesystem)

#### Initializing McpClient

This agent application uses a synchronous MCP client to communicate with the locally running filesystem MCP server:

```java
@Bean(destroyMethod = "close")
public McpSyncClient mcpClient() {
    // Configure server startup parameters
    var stdioParams = ServerParameters.builder("npx")
            .args("-y", "@modelcontextprotocol/server-filesystem", "path"))
            .build(); // 1

    // Create synchronous MCP client
    var mcpClient = McpClient.sync(new StdioServerTransport(stdioParams),
            Duration.ofSeconds(10), new ObjectMapper()); //2

    // Initialize client connection
    var init = mcpClient.initialize(); // 3
    System.out.println("MCP Initialized: " + init);

    return mcpClient;
}
```

In the code above:

1. Configure the MCP server startup command and parameters
2. Initialize McpClient: associate with MCP server, specify timeout, etc.
3. Spring AI will use `npx -y @modelcontextprotocol/server-filesystem "/path/to/file"` to create a separate subprocess (representing the local Mcp server) on the local machine. Spring AI communicates with McpClient, which in turn operates on the local file through the connection with the Mcp server.
