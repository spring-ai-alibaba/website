# MCP 的分布式

### 背景

Spring AI 通过集成 MCP 官方的 java sdk，让 Spring Boot 开发者可以非常方便的开发自己的 MCP 服务，把自己企业内部的业务系统通过标准 MCP 形式发布为 AI Agent 能够接入的工具；另一方面，开发者也可以使用 Spring AI 开发自己的 AI Agent，去接入提供各种能力的 MCP 服务。

在企业级 AI Agent 的应用与落地场景，只是能发布或者调通 MCP 服务是远远不够的，其中一个非常重要的原因就是企业级的系统部署往往都是分布式的，不论是 Agent 还是 MCP Server，作为企业内部的一个个应用，它们都是要部署在多个机器上，要支持分布式的调用（这包括流量的负载均衡、节点变更动态感知等）。

描述：现阶段 MCP Client 和 MCP Server 是一对一的连接方式，若当前 MCP Server 挂掉了，那么 MCP Client 便不能使用 MCP Server 提供的工具能力。工具稳定性的提供得不到保证

解决：做了一些分布式 Client 连接的探索，一个 MCP Client 端可以连接多个 MCP Server（分布式部署），目前采用的方案如下：

1. 新建一个包含服务名和对应连接的类
2. 另外实现监听机制，可以动态的应对 MCP Server 节点上下线，去动态调整 MCP Server 列表
3. （读操作）获取 MCP Server 相关信息的，采用从 MCP Server 列表中随机中获取一个去发起请求，比如获取工具列表信息
4. （写操作）对应 MCP Server 需要更改的信息，由 MCP Client 端发起，需要修改所有的 MCP Server

分布式调用注册至 nacos 的 mcp 服务，示例代码：[https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/client/mcp-nacos-distributed-extensions-example](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/client/mcp-nacos-distributed-extensions-example)

### pom 依赖

```xml
<dependencies>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-client-webflux</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
        <version>${spring-ai-alibaba.version}</version>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-distributed</artifactId>
        <version>${spring-ai-extensions.version}</version>
    </dependency>

</dependencies>
```

### application.yml 文件

```yaml
spring:
  application:
    name: mcp-distributed-client
  main:
    web-application-type: none
  ai:
    dashscope:
      api-key: ${AIDASHSCOPEAPIKEY}
    mcp:
      client:
        enabled: true
        name: my-mcp-client
        version: 1.0.0
        request-timeout: 30s
        type: ASYNC  # or ASYNC for reactive applications

    alibaba:
      mcp:
        nacos:
          client:
            enabled: true
            streamable:
              connections:
                server1:
                  service-name: webflux-mcp-server
                  version: 1.0.0
            configs:
              server1:
                namespace: 0908ca08-c382-404c-9d96-37fe1628b183
                server-addr: 127.0.0.1:8848
                username: nacos
                password: nacos
```

1. 支持发现 sse、streamable 类型 MCP 服务
2. 支持发现不同命名空间下的 MCP 服务

### 启动

```java
@SpringBootApplication
public class DistributedApplication {

    public static void main(String[] args) {
        SpringApplication.run(DistributedApplication.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(ChatClient.Builder chatClientBuilder, @Qualifier("distributedAsyncToolCallback") ToolCallbackProvider tools,
                                                 ConfigurableApplicationContext context) {

        ToolCallback[] toolCallbacks = tools.getToolCallbacks();
        System.out.println(">>> Available tools: ");
        for (int i = 0; i < toolCallbacks.length; i++) {
            System.out.println("[" + i + "] " + toolCallbacks[i].getToolDefinition().name());
        }

        return args -> {
            var chatClient = chatClientBuilder
                    .defaultToolCallbacks(toolCallbacks)
                    .build();

            Scanner scanner = new Scanner(System.in);
            while (true) {
                System.out.print("\n>>> QUESTION: ");
                String userInput = scanner.nextLine();
                if (userInput.equalsIgnoreCase("exit")) {
                    break;
                }
                if (userInput.isEmpty()) {
                    userInput = "北京时间现在几点钟";
                }
                System.out.println("\n>>> ASSISTANT: " + chatClient.prompt(userInput).call().content());
            }
            scanner.close();
            context.close();
        };
    }
}
```

- ASYNC：导入 Bean 名称为 distributedAsyncToolCallback
- SYNC：导入 Bean 名称为 distributedSyncToolCallback

### 验证

为 webflux-mcp-server 服务注册两个实例（演示是以本地启动，分别暴露 21000、21001 端口号）
![nacos-distributed-1](/img/blog/extensions/mcp/nacos-distributed-1.png)

MCP Client 侧触发两次工具，将负载均衡的去调用 MCP 服务

![nacos-distributed-2](/img/blog/extensions/mcp/nacos-distributed-2.png)

第一次是由 21000 端口号的 MCP 服务接收

![nacos-distributed-3](/img/blog/extensions/mcp/nacos-distributed-3.png)

第一次是由 21001 端口号的 MCP 服务接收

![nacos-distributed-4](/img/blog/extensions/mcp/nacos-distributed-4.png)
