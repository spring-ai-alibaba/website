---
title: Implementing MCP Server with Spring AI MCP Server Starter
keywords: [Spring AI, MCP, Model Context Protocol, Agent Application]
description: "Implementing MCP Server with Spring AI MCP Server Starter"
---

## Case 4: Implementing MCP Server with Spring AI MCP Server Starter

In previous chapters, we introduced how to simplify MCP client development using Spring AI MCP Client Starter. This section will explain how to implement an MCP server using Spring AI MCP Server Starter, including two implementation methods: stdio-based server and SSE-based server.

### 4.1 Implementing stdio-based MCP Server

The stdio-based MCP server communicates with clients through standard input and output streams. It's suitable for scenarios where it's started and managed by the client as a subprocess, making it ideal for embedded applications.

#### Adding Dependencies

First, add the Spring AI MCP Server Starter dependency to your project:

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

#### Configuring the MCP Server

Configure the MCP server in `application.yml`:

```yaml
spring:
  main:
    web-application-type: none  # Must disable web application type
    banner-mode: off           # Disable banner
  ai:
    mcp:
      server:
        stdio: true            # Enable stdio mode
        name: my-weather-server # Server name
        version: 0.0.1         # Server version
```

#### Implementing MCP Tools

Use the `@Tool` annotation to mark methods so they can be discovered and called by MCP clients:

```java
@Service
public class OpenMeteoService {

    private final WebClient webClient;

    public OpenMeteoService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.open-meteo.com/v1")
                .build();
    }

    @Tool(description = "Get weather forecast by latitude and longitude")
    public String getWeatherForecastByLocation(
            @ToolParameter(description = "Latitude, e.g., 39.9042") String latitude,
            @ToolParameter(description = "Longitude, e.g., 116.4074") String longitude) {
        
        try {
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("current", "temperature_2m,wind_speed_10m")
                            .queryParam("timezone", "auto")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            // Parse the response and return formatted weather information
            // Simplified handling here; in a real application, you should parse the JSON
            return "Weather information for location (latitude: " + latitude + ", longitude: " + longitude + "):\n" + response;
        } catch (Exception e) {
            return "Failed to get weather information: " + e.getMessage();
        }
    }

    @Tool(description = "Get air quality information by latitude and longitude")
    public String getAirQuality(
            @ToolParameter(description = "Latitude, e.g., 39.9042") String latitude,
            @ToolParameter(description = "Longitude, e.g., 116.4074") String longitude) {
        
        // Simulated data; in a real application, you should call an actual API
        return "Air quality for location (latitude: " + latitude + ", longitude: " + longitude + "):\n" +
                "- PM2.5: 15 μg/m³ (Good)\n" +
                "- PM10: 28 μg/m³ (Fair)\n" +
                "- Air Quality Index (AQI): 42 (Good)\n" +
                "- Major Pollutant: None";
    }
}
```

#### Registering MCP Tools

Register the tools in your application entry class:

```java
@SpringBootApplication
public class McpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider weatherTools(OpenMeteoService openMeteoService) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(openMeteoService)
                .build();
    }
}
```

#### Running the Server

Compile and package the application:

```bash
mvn clean package -DskipTests
```

### 4.2 Implementing SSE-based MCP Server

The SSE-based MCP server communicates with clients via HTTP protocol. It's suitable for scenarios where it's deployed as a standalone service and can be called remotely by multiple clients.

#### Adding Dependencies

First, add the Spring AI MCP Server Starter dependency and Spring WebFlux dependency to your project:

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

#### Configuring the MCP Server

Configure the MCP server in `application.yml`:

```yaml
server:
  port: 8080  # Server port configuration

spring:
  ai:
    mcp:
      server:
        name: my-weather-server    # MCP server name
        version: 0.0.1            # Server version
```

#### Implementing MCP Tools

Same as the stdio-based implementation, use the `@Tool` annotation to mark methods:

```java
@Service
public class OpenMeteoService {

    private final WebClient webClient;

    public OpenMeteoService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.open-meteo.com/v1")
                .build();
    }

    @Tool(description = "Get weather forecast by latitude and longitude")
    public String getWeatherForecastByLocation(
            @ToolParameter(description = "Latitude, e.g., 39.9042") String latitude,
            @ToolParameter(description = "Longitude, e.g., 116.4074") String longitude) {
        
        try {
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("current", "temperature_2m,wind_speed_10m")
                            .queryParam("timezone", "auto")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            
            // Parse the response and return formatted weather information
            return "Weather information for location (latitude: " + latitude + ", longitude: " + longitude + "):\n" + response;
        } catch (Exception e) {
            return "Failed to get weather information: " + e.getMessage();
        }
    }

    @Tool(description = "Get air quality information by latitude and longitude")
    public String getAirQuality(
            @ToolParameter(description = "Latitude, e.g., 39.9042") String latitude,
            @ToolParameter(description = "Longitude, e.g., 116.4074") String longitude) {
        
        // Simulated data, in a real application, you should call an actual API
        return "Air quality for location (latitude: " + latitude + ", longitude: " + longitude + "):\n" +
                "- PM2.5: 15 μg/m³ (Good)\n" +
                "- PM10: 28 μg/m³ (Fair)\n" +
                "- Air Quality Index (AQI): 42 (Good)\n" +
                "- Major Pollutant: None";
    }
}
```

#### Registering MCP Tools

Register the tools in your application entry class:

```java
@SpringBootApplication
public class McpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider weatherTools(OpenMeteoService openMeteoService) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(openMeteoService)
                .build();
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
```

#### Running the Server

Compile and package the application:

```bash
mvn clean package -DskipTests
```

Run the server:

```bash
mvn spring-boot:run
```

The server will start at http://localhost:8080, and you can check the service status by accessing it via a browser.

### 4.3 Interaction Between MCP Server and Client

#### stdio-based Interaction

Let's plan how the client launches the server process and communicates with it through standard input and output streams:

```java
// Client code example
var stdioParams = ServerParameters.builder("java")
        // Set necessary system properties
        .args("-Dspring.ai.mcp.server.stdio=true",
              "-Dspring.main.web-application-type=none",
              "-Dlogging.pattern.console=",
              "-jar",
              "target/mcp-stdio-server-example-0.0.1-SNAPSHOT.jar")
        .build();

// Create stdio-based transport layer
var transport = new StdioClientTransport(stdioParams);
// Build synchronous MCP client
var client = McpClient.sync(transport).build();

// Initialize client connection
client.initialize();

// Call weather forecast tool
CallToolResult weatherResult = client.callTool(
    new CallToolRequest("getWeatherForecastByLocation", 
    Map.of("latitude", "39.9042", "longitude", "116.4074"))
);

// Print result
System.out.println(weatherResult.getContent());
```

This code shows how an stdio-based MCP client interacts with the server. It launches the server process and communicates with it through standard input and output streams to call the weather forecast function.

```java
// SSE client code example
var transport = new WebFluxSseClientTransport(
    // Configure WebClient base URL
    WebClient.builder().baseUrl("http://localhost:8080")
);

// Build synchronous MCP client
var client = McpClient.sync(transport).build();

// Initialize client connection
client.initialize();

// Call weather forecast tool
CallToolResult weatherResult = client.callTool(
    new CallToolRequest("getWeatherForecastByLocation", 
    Map.of("latitude", "39.9042", "longitude", "116.4074"))
);

// Print result
System.out.println(weatherResult.getContent());
```

This code shows how an SSE-based MCP client interacts with the server. It communicates with the server via HTTP protocol to call the same weather forecast function.

### 4.4 MCP Server Development Best Practices

1. **Tool Design**:
   - Each tool method should have a clear function and parameters
   - Use the `@Tool` annotation to provide detailed descriptions
   - Use the `@ToolParameter` annotation to describe the purpose of each parameter

2. **Error Handling**:
   - Catch and handle all possible exceptions
   - Return user-friendly error messages for client understanding and processing

3. **Performance Optimization**:
   - Consider using asynchronous processing for time-consuming operations
   - Set reasonable timeout periods to avoid clients waiting too long

4. **Security Considerations**:
   - Add appropriate permission verification for sensitive operations
   - Avoid executing dangerous operations in tool methods, such as executing arbitrary commands

5. **Deployment Strategy**:
   - stdio mode is suitable for embedded scenarios, running as a subprocess of the client
   - SSE mode is suitable for deployment as a standalone service that can be called by multiple clients

### 4.5 Summary

Spring AI MCP Server Starter provides two ways to implement an MCP server: stdio-based implementation and SSE-based implementation. The stdio-based implementation is suitable for embedded scenarios, while the SSE-based implementation is suitable for standalone service deployment.

By using the `@Tool` annotation and `@ToolParameter` annotation, you can easily convert ordinary Java methods into MCP tools that can be discovered and called by MCP clients. Spring Boot's auto-configuration mechanism makes MCP server development simple and efficient.

> Complete example code can be found at the following links:
> - [stdio-based implementation](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/server/mcp-stdio-server-example)
> - [SSE-based implementation](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/server/mcp-webflux-server-example)
