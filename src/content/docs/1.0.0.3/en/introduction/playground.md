---
title: Playground
keywords: [Spring AI Alibaba, Playground, Example Experience, JManus, DeepResearch, NL2SQL]
description: "Experience Spring AI Alibaba's official Playground examples with complete frontend UI and backend implementation, showcasing all core framework capabilities."
---

## Overview

Spring AI Alibaba Playground is a complete example application provided officially, including both frontend UI and backend implementation, allowing developers to intuitively experience all core framework features. Through Playground, you can quickly understand the capabilities of Spring AI Alibaba and use it as a starting point for your own projects.

## Official Playground Example

### Features

The official Spring AI Alibaba Playground covers all core framework capabilities:

- **Chatbot**: Basic conversational interaction functionality
- **Multi-turn Conversation**: Continuous dialogue with context memory support
- **Image Generation**: AI image generation capabilities
- **Multimodal**: Processing of text, images, and other input types
- **Tool Calling**: External API and service integration
- **MCP Integration**: Model Context Protocol support
- **RAG Knowledge Base**: Retrieval Augmented Generation functionality
- **Streaming**: Real-time response output

### Interface Display

![Spring AI Alibaba Playground](/img/user/ai/overview/1.0.0/playground.png)

### Quick Experience

#### 1. Local Deployment

```bash
# Clone the examples repository
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-playground

# Configure environment variables
export DASHSCOPE_API_KEY=your-api-key

# Start the application
./mvnw spring-boot:run
```

#### 2. Access Experience

After successful startup, access in your browser:
- **Homepage**: http://localhost:8080
- **Chat Interface**: http://localhost:8080/chat
- **Admin Interface**: http://localhost:8080/admin

#### 3. Feature Testing

You can try the following features:

```bash
# Basic chat
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, please introduce yourself"}'

# Tool calling
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like in Beijing today?"}'

# Image generation
curl -X POST http://localhost:8080/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cute kitten playing in a garden"}'
```

## Professional Agent Products

Based on the Spring AI Alibaba framework, the community has developed several professional agent products, showcasing the framework's application potential in different domains.

### JManus - General-purpose Agent Platform

JManus is a complete general-purpose agent platform that benchmarks against products like OpenManus, providing powerful autonomous planning and execution capabilities.

#### Core Features

- **Multi-Agent Collaboration**: Support for complex agent collaboration scenarios
- **Visual Configuration**: Easy agent configuration through web interface
- **MCP Protocol Integration**: Seamless integration with Model Context Protocol
- **PLAN-ACT Mode**: Intelligent planning combined with execution
- **Rich Tool Integration**: Built-in browser operations, file processing, and other tools

#### Application Scenarios

- **Business Process Automation**: Automate complex business processes
- **Intelligent Data Processing**: Batch processing and data analysis
- **Web Automation**: Automatic webpage operations and form filling
- **Cross-system Integration**: Connect different systems for data flow
- **Personalized AI Assistant**: Build assistants for specific business needs

#### Quick Experience

```bash
# Start JManus
cd spring-ai-alibaba-jmanus
./mvnw spring-boot:run

# Access management interface
open http://localhost:8080/manus
```

### DeepResearch - Deep Research Agent

DeepResearch is an agent system specifically designed for deep research, capable of automatically completing complex research tasks.

#### Core Capabilities

- **Multi-source Information Collection**: Collect relevant information from multiple channels
- **Intelligent Information Filtering**: Automatically filter and screen valuable information
- **Deep Analysis Processing**: Perform in-depth analysis of collected information
- **Structured Report Generation**: Generate professional research reports
- **Multi-Agent Collaboration**: Research team agents collaborate to complete tasks

#### System Architecture

DeepResearch adopts a multi-agent collaboration architecture:

1. **Coordinator Agent**: Responsible for task decomposition and process coordination
2. **Background Research Agent**: Collect and analyze background information
3. **Planning Agent**: Develop detailed research plans
4. **Research Agent**: Execute specific research tasks
5. **Writing Agent**: Generate final research reports

#### Usage Example

```bash
# Start DeepResearch
cd spring-ai-alibaba-deepresearch
./mvnw spring-boot:run

# Initiate research task
curl -X POST http://localhost:8080/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Current Status and Development Trends of AI in Healthcare"}'
```

### NL2SQL - Natural Language to SQL

NL2SQL is a natural language to SQL conversion service based on Bailian Xiyan ChatBI technology, allowing users to query databases using natural language.

#### Core Functions

- **Natural Language Understanding**: Understand user query intentions
- **Database Schema Analysis**: Automatically analyze database structure
- **Automatic SQL Generation**: Generate accurate SQL query statements
- **Result Visualization**: Visualize query results
- **Multi-database Support**: Support for MySQL, PostgreSQL, and other mainstream databases

#### Technical Features

- **Intelligent Schema Reasoning**: Automatically understand table structures and relationships
- **Context Awareness**: Support for multi-turn conversational queries
- **Automatic Error Correction**: Automatically detect and correct SQL errors
- **Performance Optimization**: Generate efficient SQL query statements

#### Usage Example

```bash
# Start NL2SQL service
cd spring-ai-alibaba-nl2sql
./mvnw spring-boot:run

# Natural language query
curl -X POST http://localhost:8080/api/nl2sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find the top 10 products with highest sales",
    "database": "sales_db"
  }'
```

## Studio - Visual Development Tool

Spring AI Alibaba Studio is a visual agent development tool that allows developers to build complex agent applications through drag-and-drop.

### Core Features

- **Visual Designer**: Drag-and-drop process design interface
- **Automatic Code Generation**: Automatically generate Spring AI Alibaba Graph code
- **Real-time Preview**: Real-time preview of agent execution effects
- **Template Library**: Rich predefined templates and components
- **Debugging Tools**: Complete debugging and monitoring functionality

### Usage Flow

1. **Create Project**: Choose template or start from blank
2. **Design Process**: Drag nodes to design agent flow
3. **Configure Parameters**: Set node parameters and connections
4. **Test and Debug**: Online testing and debugging of agents
5. **Export Code**: Generate complete project code

### Quick Start

```bash
# Start Studio
cd spring-ai-alibaba-graph-studio
./mvnw spring-boot:run

# Access designer
open http://localhost:8080/studio
```

## Custom Playground

You can create your own customized version based on the official Playground:

### 1. Clone and Modify

```bash
# Clone Playground
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-playground

# Modify configuration as needed
vim src/main/resources/application.yml
```

### 2. Add Custom Features

```java
@RestController
@RequestMapping("/api/custom")
public class CustomController {
    
    private final ChatClient chatClient;
    
    @PostMapping("/business-chat")
    public String businessChat(@RequestBody ChatRequest request) {
        String systemPrompt = """
            You are a professional business consultant specializing in helping 
            enterprises solve business problems. Please provide professional 
            advice and solutions based on user questions.
            """;
            
        return chatClient.prompt()
            .system(systemPrompt)
            .user(request.getMessage())
            .call()
            .content();
    }
}
```

### 3. Enterprise System Integration

```java
@Configuration
public class EnterpriseIntegrationConfig {
    
    @Bean
    public ToolCallback enterpriseSystemTool() {
        return new ToolCallback() {
            @Override
            public String call(String input) {
                // Call enterprise internal system
                return enterpriseService.processRequest(input);
            }
        };
    }
}
```

## Best Practices

### 1. Environment Configuration

```properties
# Basic configuration
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
spring.ai.dashscope.chat.options.model=qwen-max-latest

# Tool configuration
spring.ai.alibaba.toolcalling.weather.enabled=true
spring.ai.alibaba.toolcalling.weather.api-key=${WEATHER_API_KEY}

# MCP configuration
spring.ai.mcp.server.name=my-playground
spring.ai.mcp.server.capabilities.tool=true
```

### 2. Performance Optimization

- Set reasonable model parameters
- Use connection pools for resource management
- Implement appropriate caching strategies
- Monitor system performance metrics

### 3. Security Considerations

- Protect API key security
- Implement user authentication and authorization
- Limit API call frequency
- Log and monitor system access

## Summary

Spring AI Alibaba Playground provides developers with a complete framework experience environment. Through official examples and professional products, you can:

- Quickly understand framework capabilities
- Learn best practices
- Get project inspiration
- Accelerate development process

We recommend starting with Playground, gradually exploring various framework features, and then customizing and extending based on your own needs.
