---
title: 模型上下文协议（Model Context Protocol）
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "Spring AI 智能体通过 MCP 集成本地文件数据"
---

## MCP 简介

[模型上下文协议（即 Model Context Protocol，MCP）](https://modelcontextprotocol.io)是一个开放协议，它规范了应用程序如何向大型语言模型（LLM）提供上下文。MCP 提供了一种统一的方式将 AI 模型连接到不同的数据源和工具，它定义了统一的集成方式。在开发智能体（Agent）的过程中，我们经常需要将将智能体与数据和工具集成，MCP 以标准的方式规范了智能体与数据及工具的集成方式，可以帮助您在 LLM 之上构建智能体（Agent）和复杂的工作流。目前已经有大量的服务接入并提供了 MCP server 实现，当前这个生态正在以非常快的速度不断的丰富中，具体可参见：[MCP Servers](https://github.com/modelcontextprotocol/servers)。

## Spring AI MCP

Spring AI MCP 为模型上下文协议提供 Java 和 Spring 框架集成。它使 Spring AI 应用程序能够通过标准化的接口与不同的数据源和工具进行交互，支持同步和异步通信模式。

![spring-ai-mcp-architecture](/img/blog/mcp-filesystem/spring-ai-mcp-architecture.png)

Spring AI MCP 采用模块化架构，包括以下组件：

- Spring AI 应用程序：使用 Spring AI 框架构建想要通过 MCP 访问数据的生成式 AI 应用程序
- Spring MCP 客户端：MCP 协议的 Spring AI 实现，与服务器保持 1:1 连接
- MCP 服务器：轻量级程序，每个程序都通过标准化的模型上下文协议公开特定的功能
- 本地数据源：MCP 服务器可以安全访问的计算机文件、数据库和服务
- 远程服务：MCP 服务器可以通过互联网（例如，通过 API）连接到的外部系统

## 如何使用

要启用此功能，请将以下依赖项添加到您项目的 Maven`pom.xml`文件中：

```xml
<dependency>
    <groupId>org.springframework.experimental</groupId>
    <artifactId>spring-ai-mcp</artifactId>
    <version>0.2.0</version>
</dependency>
```

或者添加到您的 Gradle`build.gradle`文件中：

```groovy
dependencies {
    implementation 'org.springframework.experimental:spring-ai-mcp:0.2.0'
}
```

Spring AI MCP 目前并没有在 Maven Central Repository 中提供。需要将 `Spring milestone`仓库添加到`pom.xml`中，才可以访问 Spring AI MCP 工件：

```xml
<repositories>
  <repository>
    <id>spring-milestones</id>
    <name>Spring Milestones</name>
    <url>https://repo.spring.io/libs-milestone-local</url>
    <snapshots>
      <enabled>false</enabled>
    </snapshots>
  </repository>
</repositories>
```

要使用 MCP，首先需要创建`McpClient`，它提供了与 MCP server 的同步和异步通信能力。现在我们创建一个 McpClient 来注册 MCP Brave 服务和 ChatClient，从而让 LLM 调用它们：

```java
var stdioParams = ServerParameters.builder("npx")
        .args("-y", "@modelcontextprotocol/server-brave-search")
        .addEnvVar("BRAVE_API_KEY", System.getenv("BRAVE_API_KEY"))
        .build();

var mcpClient = McpClient.using(new StdioClientTransport(stdioParams)).sync();

var init = mcpClient.initialize();

var chatClient = chatClientBuilder
        .defaultFunctions(mcpClient.listTools(null)
                .tools()
                .stream()
                .map(tool -> new McpFunctionCallback(mcpClient, tool))
                .toArray(McpFunctionCallback[]::new))
        .build();

String response = chatClient
        .prompt("Does Spring AI supports the Model Context Protocol? Please provide some references.")
        .call().content();
```

在上述代码中，首先通过`npx`命令启动一个独立的进程，运行`@modelcontextprotocol/server-brave-search`服务，并指定 Brave API 密钥。然后创建一个基于 stdio 的传输层，与 MCP server 进行通信。最后初始化与 MCP 服务器的连接。

要使用 McpClient，需要将`McpClient`注入到 Spring AI 的`ChatClient`中，从而让 LLM 调用 MCP server。在 Spring AI 中，可以通过 Function Callbacks 的方式将 MCP 工具转换为 Spring AI 的 Function，从而让 LLM 调用。

最后，通过`ChatClient`与 LLM 进行交互，并使用`McpClient`与 MCP server 进行通信，获取最终的返回结果。

## 案例 1：使用 Spring AI MCP 访问本地文件系统

这里我们提供一个示例智能体应用，这个智能体可以通过 MCP 查询或更新本地文件系统，并以文件系统中的数据作为上下文与模型交互。次示例演示如何使用模型上下文协议（MCP）将 Spring AI 与本地文件系统进行集成。

> 可在此查看 [示例完整源码](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example)。

### 运行示例

#### 前提条件

1. 安装 npx (Node Package eXecute):
   首先确保本地机器安装了 [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)，然后运行如下命令：

```bash
npm install -g npx
```

2. 下载示例源码

```bash
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-mcp-example/filesystem
```

3. 设置环境变量

```bash
# 通义大模型 Dashscope API-KEY
export AI_DASHSCOPE_API_KEY=${your-api-key-here}
```

4. 构建示例

```bash
./mvnw clean install
```

#### 运行示例应用

运行示例，智能体将向模型发起提问（源码中包含预置问题，可通过源码查看），可通过控制台查看输出结果。

```bash
./mvnw spring-boot:run
```

> 如果您是在 IDE 中运行示例，并且遇到 filesystem mcp server 返回的文件访问权限问题，请确保指定当前进程工作目录为 spring-ai-alibaba-mcp-example/filesystem 目录。

### 示例架构（源码说明）

前文中我们讲解了 Spring AI 与 MCP 集成的基础架构，在接下来的示例中，我们将用到以下关键组件：

1. **MCP Client**，与 MCP 集成的关键，提供了与本地文件系统进行交互的能力。
2. **Function Callbacks**，Spring AI MCP 的 function calling 声明方式。
3. **Chat Client**，Spring AI 关键组件，用于 LLM 模型交互、智能体代理。

#### 声明 ChatClient

```java
// List<McpFunctionCallback> functionCallbacks;
var chatClient = chatClientBuilder.defaultFunctions(functionCallbacks).build();
```

和开发之前的 Spring AI 应用一样，我们先定义一个 ChatClient Bean，用于与大模型交互的代理。需要注意的是，我们为 ChatClient 注入的 functions 是通过 MCP 组件（McpFunctionCallback）创建的。

接下来让我们具体看一下 McpFunctionCallback 是怎么使用的。

#### 声明 MCP Function Callbacks

以下代码段通过 `mcpClient`与 MCP server 交互，将 MCP 工具通过 McpFunctionCallback 适配为标准的 Spring AI function。

1. 发现 MCP server 中可用的工具 tool（Spring AI 中叫做 function） 列表
2. 依次将每个 tool 转换成 Spring AI function callback
3. 最终我们会将这些 McpFunctionCallback 注册到 ChatClient 使用

```java
@Bean
public List<McpFunctionCallback> functionCallbacks(McpSyncClient mcpClient) {
    // 获取 MCP Server 中的工具列表
    return mcpClient.listTools(null)
            // 将每个 tool 转换为 Function Callback
            .tools()
            .stream()
            .map(tool -> new McpFunctionCallback(mcpClient, tool))
            .toList();
}
```

可以看出，ChatClient 与模型交互的过程是没有变化的，模型在需要的时候告知 ChatClient 去做函数调用，只不过 Spring AI 通过 McpFunctionCallback 将实际的函数调用过程委托给了 MCP，通过标准的 MCP 协议与本地文件系统交互:

- 在与大模交互的过程中，ChatClient 处理相关的 function calls 请求
- ChatClient 调用 MCP 工具（通过 McpClient）
- McpClient 与 MCP server（即 filesystem）交互

#### 初始化 McpClient

该智能体应用使用同步 MCP 客户端与本地运行的文件系统 MCP server 通信：

```java
@Bean(destroyMethod = "close")
public McpSyncClient mcpClient() {
    // 配置服务器启动参数
    var stdioParams = ServerParameters.builder("npx")
            .args("-y", "@modelcontextprotocol/server-filesystem", "path"))
            .build(); // 1

    // 创建同步MCP客户端
    var mcpClient = McpClient.sync(new StdioServerTransport(stdioParams),
            Duration.ofSeconds(10), new ObjectMapper()); //2

    // 初始化客户端连接
    var init = mcpClient.initialize(); // 3
    System.out.println("MCP Initialized: " + init);

    return mcpClient;
}
```

在以上代码中：

1. 配置 MCP server 启动命令与参数
2. 初始化 McpClient：关联 MCP server、指定超时时间等
3. Spring AI 会使用 `npx -y @modelcontextprotocol/server-filesystem "/path/to/file"`在本地机器创建一个独立的子进程（代表本地 Mcp server），Spring AI 与 McpClient 通信，McpClient 进而通过与 Mcp server 的连接操作本地文件。

## 案例 2：使用 Spring AI MCP 访问 SQLite 数据库

这个智能体通过命令行界面使您能够与 SQLite 数据库进行自然语言交互。

> 可在此查看 [示例完整源码](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example)。

### 运行示例

#### 前提条件

1. 安装 uvx（Universal Package Manager 通用包管理器）：
   请参考 [UV 安装文档](https://docs.astral.sh/uv/getting-started/installation/)

2. 下载示例源码

```bash
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-mcp-example/chatbot
```

3. 设置环境变量

```bash
# 通义大模型 Dashscope API-KEY
export AI_DASHSCOPE_API_KEY=${your-api-key-here}
```

4. 构建示例

```bash
./mvnw clean install
```

#### 运行示例应用

运行示例，用户可以对数据库中的数据进行查询。

```bash
./mvnw spring-boot:run
```

输入想要查询的内容，进行数据库的查询：

```
USER: 所有商品的价格总和是多少
ASSISTANT: 所有商品的价格总和是1642.8元。
```

还可以支持更复杂的查询：

```
USER: 告诉我价格高于平均值的商品
ASSISTANT:
以下是价格高于平均值的商品：

1. Smart Watch，价格为 199.99 元
2. Wireless Earbuds，价格为 89.99 元
3. Mini Drone，价格为 299.99 元
4. Keyboard，价格为 129.99 元
5. Gaming Headset，价格为 159.99 元
6. Fitness Tracker，价格为 119.99 元
7. Portable SSD，价格为 179.99 元

```

### 示例架构（源码说明）

#### 初始化 McpClient

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

在这段代码中：

1、通过 uvx 包管理工具，创建一个独立的进程，运行 mcp-server-sqlite 服务。

2、创建一个基于 stdio 的传输层，与 uvx 运行的 MCP 服务器进行通信

3、指定 SQLite 作为后端数据库及其位置，设置操作的超时时间为 10 秒，使用 Jackson 进行 JSON 序列化。
最后初始化与 MCP 服务器的连接

#### Function Callbacks

通过 Spring AI 注册 MCP 工具：

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

在这段代码中：

1、通过 mcpClient 获取 MCP 可用客户端。

2、将MCP客户端转换为为 Spring AI 的Function Callbacks。

3、将这些Function Callbacks注册到 ChatClient 中。




## 三、使用starter简化MCP客户端的使用

在前面的案例中，我们看到了如何手动配置和初始化MCP客户端。Spring AI 提供了更简便的方式来使用MCP，通过starter可以大大简化MCP客户端的配置和使用。Spring AI MCP支持两种不同的传输层实现：基于stdio的实现和基于SSE的实现。

### 传输层介绍

#### stdio传输层
stdio（标准输入输出）传输层是MCP最基本的传输实现方式。它通过进程间通信（IPC）实现，具体工作原理如下：

1. **进程创建**：MCP Client 会启动一个子进程来运行 MCP Server
2. **通信机制**：
   - 使用标准输入（stdin）向 MCP Server 发送请求
   - 通过标准输出（stdout）接收 MCP Server 的响应
   - 标准错误（stderr）用于日志和错误信息
3. **优点**：
   - 简单可靠，无需网络配置
   - 适合本地部署场景
   - 进程隔离，安全性好
4. **缺点**：
   - 仅支持单机部署
   - 不支持跨网络访问
   - 每个客户端需要独立启动服务器进程

#### SSE传输层
SSE（Server-Sent Events）传输层是基于HTTP的单向通信机制，专门用于服务器向客户端推送数据。其工作原理如下：

1. **连接建立**：
   - Client 通过HTTP建立与 Server 的持久连接
   - 使用`text/event-stream`内容类型
2. **通信机制**：
   - Server 可以主动向 Client 推送消息
   - 支持自动重连机制
   - 支持事件ID和自定义事件类型
3. **优点**：
   - 支持分布式部署
   - 可跨网络访问
   - 支持多客户端连接
   - 轻量级，使用标准HTTP协议
4. **缺点**：
   - 需要额外的网络配置
   - 相比stdio实现略微复杂
   - 需要考虑网络安全性

### 3.1 基于stdio的MCP客户端实现

基于stdio的实现是最常见的MCP Client 实现方式，它通过标准输入输出流与 MCP Server 进行通信。这种方式适用于本地部署的 MCP Server，可以直接在同一台机器上启动 MCP Server 进程。

#### 添加依赖

首先，在您的项目中添加 Spring AI MCP Client Starter 依赖：

```xml
<!-- 添加Spring AI MCP starter依赖 -->
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
</dependency>
```

#### 配置 MCP Server

在`application.yml`中配置 MCP Server：

```yaml
spring:
  ai:
    dashscope:
      # 配置通义千问API密钥
      api-key: ${DASH_SCOPE_API_KEY}
    mcp:
      client:
        stdio:
          # 指定 MCP Server 配置文件路径（推荐）
          servers-configuration: classpath:/mcp-servers-config.json
          # 直接配置示例，和上边的配制二选一
          # connections:
          #   server1:
          #     command: java
          #     args:
          #       - -jar
          #       - /path/to/your/mcp-server.jar
```

这个配置文件设置了 MCP Client 的基本配置，包括 API 密钥和服务器配置文件的位置。你也可以选择直接在配置文件中定义服务器配置。

```json
{
    "mcpServers": {
        // 定义名为"weather"的 MCP Server
        "weather": {
            // 指定启动命令为java
            "command": "java",
            // 定义启动参数
            "args": [
                "-Dspring.ai.mcp.server.stdio=true",
                "-Dspring.main.web-application-type=none",
                "-jar",
                "/path/to/your/mcp-server.jar"
            ],
            // 环境变量配置（可选）
            "env": {}
        }
    }
}
```

这个JSON配置文件定义了 MCP Server 的详细配置，包括如何启动 Server 进程、需要传递的参数以及环境变量设置。

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        // 启动Spring Boot应用
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(
            ChatClient.Builder chatClientBuilder, 
            ToolCallbackProvider tools,
            ConfigurableApplicationContext context) {
        return args -> {
            // 构建ChatClient并注入MCP工具
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // 定义用户输入
            String userInput = "北京的天气如何？";
            // 打印问题
            System.out.println("\n>>> QUESTION: " + userInput);
            // 调用LLM并打印响应
            System.out.println("\n>>> ASSISTANT: " + 
                chatClient.prompt(userInput).call().content());

            // 关闭应用上下文
            context.close();
        };
    }
}
```

这段代码展示了如何在 Spring Boot 应用中使用 MCP Client。它创建了一个命令行运行器，构建了 ChatClient 并注入了 MCP 工具，然后使用这个客户端发送查询并获取响应。

### 3.2 基于SSE的MCP客户端实现

除了基于stdio的实现外，Spring AI Alibaba还提供了基于Server-Sent Events (SSE)的 MCP Client 实现。这种方式适用于远程部署的 MCP Server，可以通过HTTP协议与 MCP Server 进行通信。

#### 添加依赖

首先，在您的项目中添加Spring AI MCP starter依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-client-webflux-spring-boot-starter</artifactId>
</dependency>

```

#### 配置 MCP Server

在`application.yml`中配置 MCP Server：

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

#### 使用 MCP Client

使用方式与基于stdio的实现相同，只需注入`ToolCallbackProvider`和`ChatClient.Builder`：

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
            // 构建ChatClient并注入MCP工具
            var chatClient = chatClientBuilder
                    .defaultTools(tools)
                    .build();

            // 使用ChatClient与LLM交互
            String userInput = "北京的天气如何？";
            System.out.println("\n>>> QUESTION: " + userInput);
            System.out.println("\n>>> ASSISTANT: " + chatClient.prompt(userInput).call().content());

            context.close();
        };
    }
}
```

### 3.3 总结

使用Spring AI Alibaba提供的MCP starter，可以大大简化 MCP Client 的配置和使用。您只需要添加相应的依赖，配置 MCP Server，然后注入`ToolCallbackProvider`和`ChatClient.Builder`即可使用MCP功能。

根据您的部署需求，可以选择基于stdio的实现或基于SSE的实现。基于stdio的实现适用于本地部署的 MCP Server，而基于SSE的实现适用于远程部署的 MCP Server。

> 完整示例代码可在以下链接查看：
> - [基于stdio的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example/client/starter-default-client)
> - [基于SSE的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example/client/starter-webflux-client)



## 四、使用Spring AI MCP Server Starter实现 MCP Server

在前面的章节中，我们介绍了如何使用Spring AI MCP Client Starter简化 MCP Client 的开发。本节将介绍如何使用Spring AI MCP Server Starter来实现 MCP Server，包括基于stdio的服务端和基于SSE的服务端两种实现方式。

### 4.1 基于stdio的MCP服务端实现

基于stdio的 MCP Server 通过标准输入输出流与 Client 通信，适用于作为子进程被 Client 启动和管理的场景，非常适合嵌入式应用。

#### 添加依赖

首先，在您的项目中添加Spring AI MCP Server Starter依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-server-spring-boot-starter</artifactId>
</dependency>
```

#### 配置 MCP Server

在`application.yml`中配置 MCP Server：

```yaml
spring:
  main:
    web-application-type: none  # 必须禁用web应用类型
    banner-mode: off           # 禁用banner
  ai:
    mcp:
      server:
        stdio: true            # 启用stdio模式
        name: my-weather-server # 服务器名称
        version: 0.0.1         # 服务器版本
```

#### 实现 MCP Tool

使用`@Tool`注解标记方法，使其可以被MCP客户端发现和调用：

```java
@Service
public class OpenMeteoService {

    private final WebClient webClient;

    public OpenMeteoService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.open-meteo.com/v1")
                .build();
    }

    @Tool(description = "根据经纬度获取天气预报")
    public String getWeatherForecastByLocation(
            @ToolParameter(description = "纬度，例如：39.9042") String latitude,
            @ToolParameter(description = "经度，例如：116.4074") String longitude) {
        
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
            
            // 解析响应并返回格式化的天气信息
            // 这里简化处理，实际应用中应该解析JSON
            return "当前位置（纬度：" + latitude + "，经度：" + longitude + "）的天气信息：\n" + response;
        } catch (Exception e) {
            return "获取天气信息失败：" + e.getMessage();
        }
    }

    @Tool(description = "根据经纬度获取空气质量信息")
    public String getAirQuality(
            @ToolParameter(description = "纬度，例如：39.9042") String latitude,
            @ToolParameter(description = "经度，例如：116.4074") String longitude) {
        
        // 模拟数据，实际应用中应调用真实API
        return "当前位置（纬度：" + latitude + "，经度：" + longitude + "）的空气质量：\n" +
                "- PM2.5: 15 μg/m³ (优)\n" +
                "- PM10: 28 μg/m³ (良)\n" +
                "- 空气质量指数(AQI): 42 (优)\n" +
                "- 主要污染物: 无";
    }
}
```

#### 注册MCP工具

在应用程序入口类中注册工具：

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

#### 运行服务端

编译并打包应用：

```bash
mvn clean package -DskipTests
```

### 4.2 基于SSE的MCP服务端实现

基于SSE的MCP服务端通过HTTP协议与客户端通信，适用于作为独立服务部署的场景，可以被多个客户端远程调用。

#### 添加依赖

首先，在您的项目中添加Spring AI MCP Server Starter依赖和Spring WebFlux依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-mcp-server-webflux-spring-boot-starter</artifactId>
</dependency>
```

#### 配置 MCP Server

在`application.yml`中配置MCP服务端：

```yaml
server:
  port: 8080  # 服务器端口配置

spring:
  ai:
    mcp:
      server:
        name: my-weather-server    # MCP Server 名称
        version: 0.0.1            # 服务器版本号
```

#### 实现 MCP Tool

与基于stdio的实现相同，使用`@Tool`注解标记方法：

```java
@Service
public class OpenMeteoService {

    private final WebClient webClient;

    public OpenMeteoService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.open-meteo.com/v1")
                .build();
    }

    @Tool(description = "根据经纬度获取天气预报")
    public String getWeatherForecastByLocation(
            @ToolParameter(description = "纬度，例如：39.9042") String latitude,
            @ToolParameter(description = "经度，例如：116.4074") String longitude) {
        
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
            
            // 解析响应并返回格式化的天气信息
            return "当前位置（纬度：" + latitude + "，经度：" + longitude + "）的天气信息：\n" + response;
        } catch (Exception e) {
            return "获取天气信息失败：" + e.getMessage();
        }
    }

    @Tool(description = "根据经纬度获取空气质量信息")
    public String getAirQuality(
            @ToolParameter(description = "纬度，例如：39.9042") String latitude,
            @ToolParameter(description = "经度，例如：116.4074") String longitude) {
        
        // 模拟数据，实际应用中应调用真实API
        return "当前位置（纬度：" + latitude + "，经度：" + longitude + "）的空气质量：\n" +
                "- PM2.5: 15 μg/m³ (优)\n" +
                "- PM10: 28 μg/m³ (良)\n" +
                "- 空气质量指数(AQI): 42 (优)\n" +
                "- 主要污染物: 无";
    }
}
```

#### 注册 MCP Tool

在应用程序入口类中注册工具：

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

#### 运行 MCP Server

编译并打包应用：

```bash
mvn clean package -DskipTests
```

运行 MCP Server：

```bash
mvn spring-boot:run
```

MCP Server 将在 http://localhost:8080 启动，可以通过浏览器访问查看服务状态。

### 4.3 MCP Server 与 Client 的交互

#### 基于stdio的交互

策划一下，Client 通过启动 MCP Server 进程并通过标准输入输出流与其通信：

```java
// 客户端代码示例
var stdioParams = ServerParameters.builder("java")
        // 设置必要的系统属性
        .args("-Dspring.ai.mcp.server.stdio=true",
              "-Dspring.main.web-application-type=none",
              "-Dlogging.pattern.console=",
              "-jar",
              "target/mcp-stdio-server-example-0.0.1-SNAPSHOT.jar")
        .build();

// 创建基于stdio的传输层
var transport = new StdioClientTransport(stdioParams);
// 构建同步MCP客户端
var client = McpClient.sync(transport).build();

// 初始化客户端连接
client.initialize();

// 调用天气预报工具
CallToolResult weatherResult = client.callTool(
    new CallToolRequest("getWeatherForecastByLocation", 
    Map.of("latitude", "39.9042", "longitude", "116.4074"))
);

// 打印结果
System.out.println(weatherResult.getContent());
```

这段代码展示了基于stdio的 MCP Client 如何与 MCP Server 交互。它通过启动 MCP Server 进程并通过标准输入输出流与其通信，实现了天气预报功能的调用。

```java
// SSE客户端代码示例
var transport = new WebFluxSseClientTransport(
    // 配置WebClient基础URL
    WebClient.builder().baseUrl("http://localhost:8080")
);

// 构建同步MCP客户端
var client = McpClient.sync(transport).build();

// 初始化客户端连接
client.initialize();

// 调用天气预报工具
CallToolResult weatherResult = client.callTool(
    new CallToolRequest("getWeatherForecastByLocation", 
    Map.of("latitude", "39.9042", "longitude", "116.4074"))
);

// 打印结果
System.out.println(weatherResult.getContent());
```

这段代码展示了基于SSE的 MCP Client 如何与 MCP Server 交互。它通过HTTP协议与 MCP Server 通信，实现了相同的天气预报功能调用。

### 4.4 MCP Server 开发最佳实践

1. **工具设计**：
   - 每个工具方法应该有明确的功能和参数
   - 使用`@Tool`注解提供详细的描述
   - 使用`@ToolParameter`注解描述每个参数的用途

2. **错误处理**：
   - 捕获并处理所有可能的异常
   - 返回友好的错误信息，便于客户端理解和处理

3. **性能优化**：
   - 对于耗时操作，考虑使用异步处理
   - 合理设置超时时间，避免客户端长时间等待

4. **安全考虑**：
   - 对于敏感操作，添加适当的权限验证
   - 避免在工具方法中执行危险操作，如执行任意命令

5. **部署策略**：
   - stdio模式适合嵌入式场景，作为客户端的子进程运行
   - SSE模式适合作为独立服务部署，可以被多个客户端调用

### 4.5 总结

Spring AI MCP Server Starter提供了两种实现 MCP Server 的方式：基于stdio的实现和基于SSE的实现。基于stdio的实现适用于嵌入式场景，而基于SSE的实现适用于独立服务部署。

通过使用`@Tool`注解和`@ToolParameter`注解，可以轻松地将普通的Java方法转换为 MCP Tool，使其可以被 MCP Client 发现和调用。Spring Boot的自动配置机制使得 MCP Server 的开发变得简单高效。

> 完整示例代码可在以下链接查看：
> - [基于stdio的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example/server/starter-stdio-server)
> - [基于SSE的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example/server/starter-webflux-server)

