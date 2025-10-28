---
title: Implementing MCP Client with Spring AI MCP Client Starter
keywords: [Spring AI, MCP, Model Context Protocol, Agent Application]
description: "Implementing MCP Client with Spring AI MCP Client Starter"
---

## Case 3: Implementing MCP Client with Spring AI MCP Client Starter

In previous cases, we saw how to manually configure and initialize MCP clients. Spring AI provides a more convenient way to use MCP through starters that greatly simplify MCP client configuration and usage. Spring AI MCP supports two different transport layer implementations: stdio-based implementation and SSE-based implementation.

### Introduction to Transport Layers

#### stdio Transport Layer

The stdio (standard input/output) transport layer is the most basic transport implementation for MCP. It works through inter-process communication (IPC), with the specific working principles as follows:

1. **Process Creation**: The MCP client launches a subprocess to run the MCP server
2. **Communication Mechanism**:
   - Uses standard input (stdin) to send requests to the MCP server
   - Receives responses from the MCP server via standard output (stdout)
   - Standard error (stderr) is used for logs and error messages
3. **Advantages**:
   - Simple and reliable, no network configuration needed
   - Suitable for local deployment scenarios
   - Process isolation for better security
4. **Disadvantages**:
   - Only supports single-machine deployment
   - Doesn't support cross-network access
   - Each client needs to launch its own server process

#### SSE Transport Layer

SSE (Server-Sent Events) transport layer is an HTTP-based one-way communication mechanism specifically designed for servers to push data to clients. Its working principles are as follows:

1. **Connection Establishment**:
   - The client establishes a persistent connection with the server via HTTP
   - Uses the `text/event-stream` content type
2. **Communication Mechanism**:
   - The server can actively push messages to the client
   - Supports automatic reconnection mechanism
   - Supports event IDs and custom event types
3. **Advantages**:
   - Supports distributed deployment
   - Can be accessed across networks
   - Supports multiple client connections
   - Lightweight, uses standard HTTP protocol
4. **Disadvantages**:
   - Requires additional network configuration
   - Slightly more complex than stdio implementation
   - Network security considerations required

### 3.1 stdio-based MCP Client Implementation

The stdio-based implementation is the most common MCP client implementation method. It communicates with the MCP server through standard input and output streams. This approach is suitable for locally deployed MCP servers, allowing direct launch of the MCP server process on the same machine.

#### Adding Dependencies

First, add the Spring AI MCP starter dependency to your project:

```xml
<!-- Add Spring AI MCP starter dependency -->
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
</dependency>
```

#### Configuring the MCP Server

Configure the MCP server in `application.yml`:

```yaml
spring:
  ai:
    dashscope:
      # Configure Tongyi Qianwen API key
      api-key: ${DASH_SCOPE_API_KEY}
    mcp:
      client:
        stdio:
          # Specify MCP server configuration file path (recommended)
          servers-configuration: classpath:/mcp-servers-config.json
          # Direct configuration example, choose one configuration approach
          # connections:
          #   server1:
          #     command: java
          #     args:
          #       - -jar
          #       - /path/to/your/mcp-server.jar
```

This configuration file sets the basic configuration for the MCP client, including the API key and the location of the server configuration file. You can also choose to define server configuration directly in this file.

```json
{
    "mcpServers": {
        // Define an MCP server named "weather"
        "weather": {
            // Specify the start command as java
            "command": "java",
            // Define start parameters
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-jar",
                "/path/to/your/mcp-server.jar"
            ],
            // Environment variable configuration (optional)
            "env": {}
        }
    }
}
```

This JSON configuration file defines the detailed configuration of the MCP server, including how to start the server process, parameters to pass, and environment variable settings.

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        // Start Spring Boot application
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(
            ChatClient.Builder chatClientBuilder, 
            ToolCallbackProvider tools,
            ConfigurableApplicationContext context) {
        return args -> {
            // Build ChatClient and inject MCP tools
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // Define user input
            String userInput = "What's the weather like in Beijing?";
            // Print the question
            System.out.println("\n>>> QUESTION: " + userInput);
            // Call LLM and print the response
            System.out.println("\n>>> ASSISTANT: " + 
                chatClient.prompt(userInput).call().content());

            // Close application context
            context.close();
        };
    }
}
```

This code shows how to use MCP client in a Spring Boot application. It creates a command line runner, builds a ChatClient and injects MCP tools, then uses this client to send queries and get responses.

### 3.2 SSE-based MCP Client Implementation

In addition to the stdio-based implementation, Spring AI Alibaba also provides an SSE (Server-Sent Events) based MCP client implementation. This approach is suitable for remotely deployed MCP servers and can communicate with MCP servers via HTTP protocol.

#### Adding Dependencies

First, add the Spring AI MCP starter dependency to your project:

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>

```

#### Configuring the MCP Server

Configure the MCP server in `application.yml`:

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASH_SCOPE_API_KEY}
    mcp:
      client:
        sse:
          connections:
            server1:
              url: http://localhost:8080
```

#### Using the MCP Client

The usage is the same as the stdio-based implementation. Just inject `ToolCallbackProvider` and `ChatClient.Builder`:

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(ChatClient.Builder chatClientBuilder, 
                                                ToolCallbackProvider tools,
                                                ConfigurableApplicationContext context) {
        return args -> {
            // Build ChatClient and inject MCP tools
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // Use ChatClient to interact with LLM
            String userInput = "What's the weather like in Beijing?";
            System.out.println("\n>>> QUESTION: " + userInput);
            System.out.println("\n>>> ASSISTANT: " + chatClient.prompt(userInput).call().content());

            context.close();
        };
    }
}
```

### 3.3 Summary

Using the MCP starter provided by Spring AI Alibaba greatly simplifies the configuration and use of MCP clients. You only need to add the appropriate dependencies, configure the MCP server, and then inject `ToolCallbackProvider` and `ChatClient.Builder` to use MCP functionality.

Depending on your deployment requirements, you can choose either the stdio-based implementation or the SSE-based implementation. The stdio-based implementation is suitable for locally deployed MCP servers, while the SSE-based implementation is suitable for remotely deployed MCP servers.

> Complete example code can be found at the following links:
> - [stdio-based implementation](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/client/mcp-stdio-client-example)
> - [SSE-based implementation](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/client/mcp-webflux-client-example)
