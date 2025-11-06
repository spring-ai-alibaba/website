---
title: 使用 Spring AI MCP Server Starter 实现 MCP 服务端
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "使用 Spring AI MCP Server Starter 实现 MCP 服务端"
---

## 案例4：使用 Spring AI MCP Server Starter 实现 MCP 服务端

在前面的章节中，我们介绍了如何使用Spring AI MCP Client Starter简化MCP客户端的开发。本节将介绍如何使用Spring AI MCP Server Starter来实现MCP服务端，包括基于stdio的服务端和基于SSE的服务端两种实现方式。

### 4.1 基于 stdio 的 MCP 服务端实现

基于 stdio 的 MCP 服务端通过标准输入输出流与客户端通信，适用于作为子进程被客户端启动和管理的场景，非常适合嵌入式应用。

#### 添加依赖

首先，在您的项目中添加 Spring AI MCP Server Starter 依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

#### 配置 MCP 服务端

在`application.yml`中配置MCP服务端：

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

#### 实现 MCP 工具

使用 `@Tool` 注解标记方法，使其可以被 MCP 客户端发现和调用：

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

#### 注册 MCP 工具

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

### 4.2 基于 SSE 的 MCP 服务端实现

基于SSE的 MCP Server 通过HTTP协议与 Client 通信，适用于作为独立服务部署的场景，可以被多个 Client 远程调用。

#### 添加依赖

首先，在您的项目中添加Spring AI MCP Server Starter依赖和Spring WebFlux依赖：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>
```

#### 配置 MCP 服务端

在`application.yml`中配置MCP服务端：

```yaml
server:
  port: 8080  # MCP Server 端口配置

spring:
  ai:
    mcp:
      server:
        name: my-weather-server    # MCP Server 名称
        version: 0.0.1            # MCP Server 版本号
```

#### 实现 MCP 工具

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

#### 注册 MCP 工具

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

#### 运行服务端

编译并打包应用：

```bash
mvn clean package -DskipTests
```

运行服务端：

```bash
mvn spring-boot:run
```

服务端将在 http://localhost:8080 启动，可以通过浏览器访问查看服务状态。

### 4.3 MCP 服务端与客户端的交互

#### 基于 stdio 的交互

策划一下，客户端通过启动服务端进程并通过标准输入输出流与其通信：

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

这段代码展示了基于stdio的MCP客户端如何与服务端交互。它通过启动服务端进程并通过标准输入输出流与其通信，实现了天气预报功能的调用。

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

这段代码展示了基于SSE的MCP客户端如何与服务端交互。它通过HTTP协议与服务端通信，实现了相同的天气预报功能调用。

### 4.4 MCP 服务端开发最佳实践

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

Spring AI MCP Server Starter提供了两种实现MCP服务端的方式：基于stdio的实现和基于SSE的实现。基于stdio的实现适用于嵌入式场景，而基于SSE的实现适用于独立服务部署。

通过使用`@Tool`注解和`@ToolParameter`注解，可以轻松地将普通的Java方法转换为MCP工具，使其可以被MCP客户端发现和调用。Spring Boot的自动配置机制使得MCP服务端的开发变得简单高效。

> 完整示例代码可在以下链接查看：
> - [基于 stdio 的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/server/mcp-stdio-server-example)
> - [基于 SSE 的实现](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-starter-example/server/mcp-webflux-server-example)
