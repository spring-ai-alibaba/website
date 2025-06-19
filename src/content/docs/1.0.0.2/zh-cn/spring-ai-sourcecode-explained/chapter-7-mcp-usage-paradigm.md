---
title: 第七章：MCP 使用范式
keywords: [Spring AI, Spring AI Alibaba, 源码解读]
description: "本章介绍了 MCP（Model Context Protocol），一个旨在标准化 AI 模型与外部工具及资源交互方式的协议。通过一个基于 WebFlux 的客户端-服务器（Client-Server） 示例，展示了其在 Spring AI 中的应用。对于 MCP 服务器端，展示了 `spring-ai-starter-mcp-server-webflux` 依赖、`application.yml` 中的服务器配置（包括服务器名称、版本、类型、指令、SSE 端点及声明的能力如工具、资源调用等），以及如何通过一个带有 `@Tool` 注解的 `TimeService` 来暴露工具功能，并在主应用类 `WebfluxServerApplication` 中注册为 `ToolCallbackProvider`。对于 MCP 客户端，展示了 `spring-ai-starter-mcp-client-webflux` 依赖、客户端 `application.yml` 配置（包括启用标志、客户端名称、版本、请求超时、类型及指向 MCP 服务器的 SSE 连接），以及一个 `WebfluxClientApplication` 示例，该示例通过 `ChatClient` 与 MCP 服务器通信，利用服务器提供的工具来响应用户输入。章节后续计划进行 MCP 的源码解读。 "
---

- 作者：影子, Spring AI Alibaba Committer
- 本文档基于 Spring AI 1.0.0 版本，Spring AI Alibaba 1.0.0.2 版本
- 本章是MCP快速上手 + 源码解读（MCP、SpringAI下的MCP）

## 第七章：MCP 快速上手

> MCP 官方文档：[https://modelcontextprotocol.io/introduction](https://modelcontextprotocol.io/introduction),
> MCP（Model Context Protocol）是一种标准化协议，使 AI 模型能够以结构化方式与外部工具和资源交互
> 以下是实现时间工具的 MCP 典型案例：webflux,实战代码可见：https://github.com/GTyingzi/spring-ai-tutorial 下的mcp

### webflux

#### server

##### pom.xml

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
    </dependency>
</dependencies>
```

##### application.yml

```yml
server:
  port: 19000

spring:
  application:
    name: mcp-webflux-server
  ai:
    mcp:
      server:
        name: webflux-mcp-server
        version: 1.0.0
        type: ASYNC  # Recommended for reactive applications
        instructions: "This reactive server provides time information tools and resources"
        sse-message-endpoint: /mcp/messages
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true
```

##### TimeService

```java
package com.spring.ai.tutorial.mcp.server.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class TimeService {

    private static final Logger logger = LoggerFactory.getLogger(TimeService.class);

    @Tool(description = "Get the time of a specified city.")
    public String  getCityTimeMethod(@ToolParam(description = "Time zone id, such as Asia/Shanghai") String timeZoneId) {
        logger.info("The current time zone is {}", timeZoneId);
        return String.format("The current time zone is %s and the current time is " + "%s", timeZoneId,
                getTimeByZoneId(timeZoneId));
    }

    private String getTimeByZoneId(String zoneId) {

        // Get the time zone using ZoneId
        ZoneId zid = ZoneId.of(zoneId);

        // Get the current time in this time zone
        ZonedDateTime zonedDateTime = ZonedDateTime.now(zid);

        // Defining a formatter
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

        // Format ZonedDateTime as a string
        String formattedDateTime = zonedDateTime.format(formatter);

        return formattedDateTime;
    }
}
```

##### WebfluxServerApplication

```java
package com.spring.ai.tutorial.mcp.server;

import com.spring.ai.tutorial.mcp.server.service.TimeService;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class WebfluxServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebfluxServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider timeTools(TimeService timeService) {
        return MethodToolCallbackProvider.builder().toolObjects(timeService).build();
    }
}
```

#### client

##### pom.xml

```xml
<dependencies>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-client-webflux</artifactId>
    </dependency>

</dependencies>
```

##### application.yml

```yaml
server:
  port: 19100

spring:
  application:
    name: mcp-webflux-client
  main:
    web-application-type: none
  ai:
    openai:
      api-key: ${DASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
    mcp:
      client:
        enabled: true
        name: my-mcp-client
        version: 1.0.0
        request-timeout: 30s
        type: ASYNC  # or ASYNC for reactive applications
        sse:
          connections:
            server1:
              url: http://localhost:19000
```

##### WebfluxClientApplication

```java
package com.spring.ai.tutorial.mcp.client;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;

import java.util.Scanner;

@SpringBootApplication
public class WebfluxClientApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebfluxClientApplication.class, args);
    }

    @Bean
    public CommandLineRunner predefinedQuestions(ChatClient.Builder chatClientBuilder, ToolCallbackProvider tools,
                                                 ConfigurableApplicationContext context) {

        return args -> {
            var chatClient = chatClientBuilder
                    .defaultToolCallbacks(tools.getToolCallbacks())
                    .build();

            Scanner scanner = new Scanner(System.in);
            while (true) {
                System.out.print("\n>>> QUESTION: ");
                String userInput = scanner.nextLine();
                if (userInput.equalsIgnoreCase("exit")) {
                    break;
                }
                System.out.println("\n>>> ASSISTANT: " + chatClient.prompt(userInput).call().content());
            }
            scanner.close();
            context.close();
        };
    }
}
```

##### 效果

![](/img/user/ai/spring-ai-explained-sourcecode/AlkVb6xPSombAmxM5MDcBOJon2b.png)

## MCP 源码解读

> 本文档是 Java 实现 MCP 的 0.10.0 版本

![](/img/user/ai/spring-ai-explained-sourcecode/mcp-源码解读.png)

### pom.xml

```java
<dependency>
  <groupId>io.modelcontextprotocol.sdk</groupId>
  <artifactId>mcp</artifactId>
  <version>0.10.0</version>
</dependency>
```

#### MCP 各类说明


#### McpTransport

该接口定义了一个异步传输层，用于实现模型的上下文协议的双向通信，设计目标是基于 JSON-RPC 格式的异步消息交换，并且与协议无关，可通过不同的传输机制（入 WebSocket、HTTP 或自定义协议）实现

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>close<br/></td><td>关闭传输连接并释放相关资源，提供默认实现，调用closeGracefully()方法完成资源清理<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>异步关闭传输连接并释放资源<br/></td></tr>
<tr>
<td>sendMessage<br/></td><td>以异步方式向对端发送消息<br/></td></tr>
<tr>
<td>unmarshalFrom<br/></td><td>将给定的数据反序列化为指定类型的对象<br/>- Object data：需要反序列化的数据<br/>- TypeReference<T> typeRef：目标对象的类型<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.spec;

import com.fasterxml.jackson.core.type.TypeReference;
import reactor.core.publisher.Mono;

public interface McpTransport {
    default void close() {
        this.closeGracefully().subscribe();
    }

    Mono<Void> closeGracefully();

    Mono<Void> sendMessage(McpSchema.JSONRPCMessage message);

    <T> T unmarshalFrom(Object data, TypeReference<T> typeRef);
}
```

### McpClientTransport

用于定义客户端侧的 MCP 传输层，继承自 McpTransport 接口类

connect 方法：建立客户端与服务端的连接，并定义消息处理逻辑

```java
package io.modelcontextprotocol.spec;

import java.util.function.Function;
import reactor.core.publisher.Mono;

public interface McpClientTransport extends McpTransport {
    Mono<Void> connect(Function<Mono<McpSchema.JSONRPCMessage>, Mono<McpSchema.JSONRPCMessage>> handler);
}
```

#### HttpClientSseClientTransport

基于 HTTP、SSE 协议实现 MCP 客户端传输层

- `String MESSAGEEVENTTYPE = "message"`：SSE 事件类型，用于接收 JSON-RPC 消息
- `String ENDPOINTEVENTTYPE = "endpoint"`：SSE 事件类型，用于接收服务器提供的消息发送端点 URI
- `String DEFAULTSSEENDPOINT = "/sse"`：默认的 SSE 连接端点路径
- `URI baseUri`：MCP 服务器等基础 URI，用于构建请求和连接
- `FlowSseClient sseClient`：用于处理服务器发送事件的 SSE 客户端
- `HttpClient httpClient`：用于发送 HTTP POST 请求的 HTTP 客户端
- `HttpRequest.Builder requestBuilder`：HTTP 请求构建器，用于构建发送到服务器的请求
- `ObjectMapper objectMapper`：用于 JSON 序列化和反序列化的 ObjectMapper 实例
- `volatile boolean isClosing = false`：标志传输是否正在关闭，防止关闭期间执行新操作
- `CountDownLatch closeLatch`：协调端点发现的计数器锁
- `AtomicReference<String> messageEndpoint`：保存发现的消息端点 URL
- `AtomicReference<CompletableFuture<Void>> connectionFuture`：保存 SSE 连接的异步操作

```java
package io.modelcontextprotocol.client.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpClientTransport;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import io.modelcontextprotocol.util.Utils;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpClient.Version;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;

public class HttpClientSseClientTransport implements McpClientTransport {
    private static final Logger logger = LoggerFactory.getLogger(HttpClientSseClientTransport.class);
    private static final String MESSAGEEVENTTYPE = "message";
    private static final String ENDPOINTEVENTTYPE = "endpoint";
    private static final String DEFAULTSSEENDPOINT = "/sse";
    private final URI baseUri;
    private final String sseEndpoint;
    private final FlowSseClient sseClient;
    private final HttpClient httpClient;
    private final HttpRequest.Builder requestBuilder;
    protected ObjectMapper objectMapper;
    private volatile boolean isClosing;
    private final CountDownLatch closeLatch;
    private final AtomicReference<String> messageEndpoint;
    private final AtomicReference<CompletableFuture<Void>> connectionFuture;

    /** @deprecated */
    @Deprecated(
        forRemoval = true
    )
    public HttpClientSseClientTransport(String baseUri) {
        this(HttpClient.newBuilder(), baseUri, new ObjectMapper());
    }

    /** @deprecated */
    @Deprecated(
        forRemoval = true
    )
    public HttpClientSseClientTransport(HttpClient.Builder clientBuilder, String baseUri, ObjectMapper objectMapper) {
        this(clientBuilder, baseUri, "/sse", objectMapper);
    }

    /** @deprecated */
    @Deprecated(
        forRemoval = true
    )
    public HttpClientSseClientTransport(HttpClient.Builder clientBuilder, String baseUri, String sseEndpoint, ObjectMapper objectMapper) {
        this(clientBuilder, HttpRequest.newBuilder(), baseUri, sseEndpoint, objectMapper);
    }

    /** @deprecated */
    @Deprecated(
        forRemoval = true
    )
    public HttpClientSseClientTransport(HttpClient.Builder clientBuilder, HttpRequest.Builder requestBuilder, String baseUri, String sseEndpoint, ObjectMapper objectMapper) {
        this(clientBuilder.connectTimeout(Duration.ofSeconds(10L)).build(), requestBuilder, baseUri, sseEndpoint, objectMapper);
    }

    HttpClientSseClientTransport(HttpClient httpClient, HttpRequest.Builder requestBuilder, String baseUri, String sseEndpoint, ObjectMapper objectMapper) {
        this.isClosing = false;
        this.closeLatch = new CountDownLatch(1);
        this.messageEndpoint = new AtomicReference();
        this.connectionFuture = new AtomicReference();
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        Assert.hasText(baseUri, "baseUri must not be empty");
        Assert.hasText(sseEndpoint, "sseEndpoint must not be empty");
        Assert.notNull(httpClient, "httpClient must not be null");
        Assert.notNull(requestBuilder, "requestBuilder must not be null");
        this.baseUri = URI.create(baseUri);
        this.sseEndpoint = sseEndpoint;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.requestBuilder = requestBuilder;
        this.sseClient = new FlowSseClient(this.httpClient, requestBuilder);
    }

    public static Builder builder(String baseUri) {
        return (new Builder()).baseUri(baseUri);
    }

    public Mono<Void> connect(final Function<Mono<McpSchema.JSONRPCMessage>, Mono<McpSchema.JSONRPCMessage>> handler) {
        final CompletableFuture<Void> future = new CompletableFuture();
        this.connectionFuture.set(future);
        URI clientUri = Utils.resolveUri(this.baseUri, this.sseEndpoint);
        this.sseClient.subscribe(clientUri.toString(), new FlowSseClient.SseEventHandler() {
            public void onEvent(FlowSseClient.SseEvent event) {
                if (!HttpClientSseClientTransport.this.isClosing) {
                    try {
                        if ("endpoint".equals(event.type())) {
                            String endpoint = event.data();
                            HttpClientSseClientTransport.this.messageEndpoint.set(endpoint);
                            HttpClientSseClientTransport.this.closeLatch.countDown();
                            future.complete((Object)null);
                        } else if ("message".equals(event.type())) {
                            McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(HttpClientSseClientTransport.this.objectMapper, event.data());
                            ((Mono)handler.apply(Mono.just(message))).subscribe();
                        } else {
                            HttpClientSseClientTransport.logger.error("Received unrecognized SSE event type: {}", event.type());
                        }
                    } catch (IOException e) {
                        HttpClientSseClientTransport.logger.error("Error processing SSE event", e);
                        future.completeExceptionally(e);
                    }

                }
            }

            public void onError(Throwable error) {
                if (!HttpClientSseClientTransport.this.isClosing) {
                    HttpClientSseClientTransport.logger.error("SSE connection error", error);
                    future.completeExceptionally(error);
                }

            }
        });
        return Mono.fromFuture(future);
    }

    public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
        if (this.isClosing) {
            return Mono.empty();
        } else {
            try {
                if (!this.closeLatch.await(10L, TimeUnit.SECONDS)) {
                    return Mono.error(new McpError("Failed to wait for the message endpoint"));
                }
            } catch (InterruptedException var6) {
                return Mono.error(new McpError("Failed to wait for the message endpoint"));
            }

            String endpoint = (String)this.messageEndpoint.get();
            if (endpoint == null) {
                return Mono.error(new McpError("No message endpoint available"));
            } else {
                try {
                    String jsonText = this.objectMapper.writeValueAsString(message);
                    URI requestUri = Utils.resolveUri(this.baseUri, endpoint);
                    HttpRequest request = this.requestBuilder.uri(requestUri).POST(BodyPublishers.ofString(jsonText)).build();
                    return Mono.fromFuture(this.httpClient.sendAsync(request, BodyHandlers.discarding()).thenAccept((response) -> {
                        if (response.statusCode() != 200 && response.statusCode() != 201 && response.statusCode() != 202 && response.statusCode() != 206) {
                            logger.error("Error sending message: {}", response.statusCode());
                        }

                    }));
                } catch (IOException e) {
                    return !this.isClosing ? Mono.error(new RuntimeException("Failed to serialize message", e)) : Mono.empty();
                }
            }
        }
    }

    public Mono<Void> closeGracefully() {
        return Mono.fromRunnable(() -> {
            this.isClosing = true;
            CompletableFuture<Void> future = (CompletableFuture)this.connectionFuture.get();
            if (future != null && !future.isDone()) {
                future.cancel(true);
            }

        });
    }

    public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
        return (T)this.objectMapper.convertValue(data, typeRef);
    }

    public static class Builder {
        private String baseUri;
        private String sseEndpoint = "/sse";
        private HttpClient.Builder clientBuilder;
        private ObjectMapper objectMapper;
        private HttpRequest.Builder requestBuilder;

        Builder() {
            this.clientBuilder = HttpClient.newBuilder().version(Version.HTTP11).connectTimeout(Duration.ofSeconds(10L));
            this.objectMapper = new ObjectMapper();
            this.requestBuilder = HttpRequest.newBuilder().header("Content-Type", "application/json");
        }

        /** @deprecated */
        @Deprecated(
            forRemoval = true
        )
        public Builder(String baseUri) {
            this.clientBuilder = HttpClient.newBuilder().version(Version.HTTP11).connectTimeout(Duration.ofSeconds(10L));
            this.objectMapper = new ObjectMapper();
            this.requestBuilder = HttpRequest.newBuilder().header("Content-Type", "application/json");
            Assert.hasText(baseUri, "baseUri must not be empty");
            this.baseUri = baseUri;
        }

        Builder baseUri(String baseUri) {
            Assert.hasText(baseUri, "baseUri must not be empty");
            this.baseUri = baseUri;
            return this;
        }

        public Builder sseEndpoint(String sseEndpoint) {
            Assert.hasText(sseEndpoint, "sseEndpoint must not be empty");
            this.sseEndpoint = sseEndpoint;
            return this;
        }

        public Builder clientBuilder(HttpClient.Builder clientBuilder) {
            Assert.notNull(clientBuilder, "clientBuilder must not be null");
            this.clientBuilder = clientBuilder;
            return this;
        }

        public Builder customizeClient(final Consumer<HttpClient.Builder> clientCustomizer) {
            Assert.notNull(clientCustomizer, "clientCustomizer must not be null");
            clientCustomizer.accept(this.clientBuilder);
            return this;
        }

        public Builder requestBuilder(HttpRequest.Builder requestBuilder) {
            Assert.notNull(requestBuilder, "requestBuilder must not be null");
            this.requestBuilder = requestBuilder;
            return this;
        }

        public Builder customizeRequest(final Consumer<HttpRequest.Builder> requestCustomizer) {
            Assert.notNull(requestCustomizer, "requestCustomizer must not be null");
            requestCustomizer.accept(this.requestBuilder);
            return this;
        }

        public Builder objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "objectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public HttpClientSseClientTransport build() {
            return new HttpClientSseClientTransport(this.clientBuilder.build(), this.requestBuilder, this.baseUri, this.sseEndpoint, this.objectMapper);
        }
    }
}
```

#### StdioClientTransport

基于标准输入/输出流与服务器进行进程通信

- `Sinks.Many<JSONRPCMessage> inboundSink`：用于接收服务器进程发送的消息的消息缓冲区
- `Sinks.Many<JSONRPCMessage> outboundSink`：用于发送到服务器进程的消息的消息缓冲区
- `Process process`：与服务器通信的进程对象
- `ObjectMapper objectMapper`：用于 JSON 序列化和反序列化的对象映射器
- `Scheduler inboundScheduler`：处理从服务器接收消息的调度器
- `Scheduler outboundScheduler`：处理发送消息到服务器的调度器
- `Scheduler errorScheduler`：处理从服务器接收错误信息的调度器
- `ServerParameters params`：配置服务器进程的参数（如命令、环境变量等）
- `Sinks.Many<String> errorSink`：用于接收服务器错误信息的缓冲区
- `volatile boolean isClosing`：标志传输是否正在关闭，防止新消息处理
- `Consumer<String> stdErrorHandler`：用于处理 stderr 错误信息的消费者

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>connect<br/></td><td>建立SSE连接，处理服务器发送的消息，并设置消息处理逻辑<br/></td></tr>
<tr>
<td>sendMessage<br/></td><td>通过HTTP POST请求向服务器发送JSON-RPC消息<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅地关闭传输连接，清理资源<br/></td></tr>
<tr>
<td>unmarshalFrom<br/></td><td>将数据反序列化为指定类型的对象<br/></td></tr>
<tr>
<td>awaitForExit<br/></td><td>等待服务器进程退出<br/></td></tr>
<tr>
<td>setStdErrorHandler<br/></td><td>设置处理stderr错误信息的逻辑<br/></td></tr>
<tr>
<td>getErrorSink<br/></td><td>获取用于接收错误信息的缓冲区<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.client.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpClientTransport;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;

public class StdioClientTransport implements McpClientTransport {
    private static final Logger logger = LoggerFactory.getLogger(StdioClientTransport.class);
    private final Sinks.Many<McpSchema.JSONRPCMessage> inboundSink;
    private final Sinks.Many<McpSchema.JSONRPCMessage> outboundSink;
    private Process process;
    private ObjectMapper objectMapper;
    private Scheduler inboundScheduler;
    private Scheduler outboundScheduler;
    private Scheduler errorScheduler;
    private final ServerParameters params;
    private final Sinks.Many<String> errorSink;
    private volatile boolean isClosing;
    private Consumer<String> stdErrorHandler;

    public StdioClientTransport(ServerParameters params) {
        this(params, new ObjectMapper());
    }

    public StdioClientTransport(ServerParameters params, ObjectMapper objectMapper) {
        this.isClosing = false;
        this.stdErrorHandler = (error) -> logger.info("STDERR Message received: {}", error);
        Assert.notNull(params, "The params can not be null");
        Assert.notNull(objectMapper, "The ObjectMapper can not be null");
        this.inboundSink = Sinks.many().unicast().onBackpressureBuffer();
        this.outboundSink = Sinks.many().unicast().onBackpressureBuffer();
        this.params = params;
        this.objectMapper = objectMapper;
        this.errorSink = Sinks.many().unicast().onBackpressureBuffer();
        this.inboundScheduler = Schedulers.fromExecutorService(Executors.newSingleThreadExecutor(), "inbound");
        this.outboundScheduler = Schedulers.fromExecutorService(Executors.newSingleThreadExecutor(), "outbound");
        this.errorScheduler = Schedulers.fromExecutorService(Executors.newSingleThreadExecutor(), "error");
    }

    public Mono<Void> connect(Function<Mono<McpSchema.JSONRPCMessage>, Mono<McpSchema.JSONRPCMessage>> handler) {
        return Mono.fromRunnable(() -> {
            this.handleIncomingMessages(handler);
            this.handleIncomingErrors();
            List<String> fullCommand = new ArrayList();
            fullCommand.add(this.params.getCommand());
            fullCommand.addAll(this.params.getArgs());
            ProcessBuilder processBuilder = this.getProcessBuilder();
            processBuilder.command(fullCommand);
            processBuilder.environment().putAll(this.params.getEnv());

            try {
                this.process = processBuilder.start();
            } catch (IOException e) {
                throw new RuntimeException("Failed to start process with command: " + String.valueOf(fullCommand), e);
            }

            if (this.process.getInputStream() != null && this.process.getOutputStream() != null) {
                this.startInboundProcessing();
                this.startOutboundProcessing();
                this.startErrorProcessing();
            } else {
                this.process.destroy();
                throw new RuntimeException("Process input or output stream is null");
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    protected ProcessBuilder getProcessBuilder() {
        return new ProcessBuilder(new String[0]);
    }

    public void setStdErrorHandler(Consumer<String> errorHandler) {
        this.stdErrorHandler = errorHandler;
    }

    public void awaitForExit() {
        try {
            this.process.waitFor();
        } catch (InterruptedException e) {
            throw new RuntimeException("Process interrupted", e);
        }
    }

    private void startErrorProcessing() {
        this.errorScheduler.schedule(() -> {
            try {
                BufferedReader processErrorReader = new BufferedReader(new InputStreamReader(this.process.getErrorStream()));

                String line;
                try {
                    while(!this.isClosing && (line = processErrorReader.readLine()) != null) {
                        try {
                            if (!this.errorSink.tryEmitNext(line).isSuccess()) {
                                if (!this.isClosing) {
                                    logger.error("Failed to emit error message");
                                }
                                break;
                            }
                        } catch (Exception e) {
                            if (!this.isClosing) {
                                logger.error("Error processing error message", e);
                            }
                            break;
                        }
                    }
                } catch (Throwable var12) {
                    try {
                        processErrorReader.close();
                    } catch (Throwable var10) {
                        var12.addSuppressed(var10);
                    }

                    throw var12;
                }

                processErrorReader.close();
            } catch (IOException e) {
                if (!this.isClosing) {
                    logger.error("Error reading from error stream", e);
                }
            } finally {
                this.isClosing = true;
                this.errorSink.tryEmitComplete();
            }

        });
    }

    private void handleIncomingMessages(Function<Mono<McpSchema.JSONRPCMessage>, Mono<McpSchema.JSONRPCMessage>> inboundMessageHandler) {
        this.inboundSink.asFlux().flatMap((message) -> Mono.just(message).transform(inboundMessageHandler).contextWrite((ctx) -> ctx.put("observation", "myObservation"))).subscribe();
    }

    private void handleIncomingErrors() {
        this.errorSink.asFlux().subscribe((e) -> this.stdErrorHandler.accept(e));
    }

    public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
        return this.outboundSink.tryEmitNext(message).isSuccess() ? Mono.empty() : Mono.error(new RuntimeException("Failed to enqueue message"));
    }

    private void startInboundProcessing() {
        this.inboundScheduler.schedule(() -> {
            try {
                BufferedReader processReader = new BufferedReader(new InputStreamReader(this.process.getInputStream()));

                String line;
                try {
                    while(!this.isClosing && (line = processReader.readLine()) != null) {
                        try {
                            McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(this.objectMapper, line);
                            if (!this.inboundSink.tryEmitNext(message).isSuccess()) {
                                if (!this.isClosing) {
                                    logger.error("Failed to enqueue inbound message: {}", message);
                                }
                                break;
                            }
                        } catch (Exception e) {
                            if (!this.isClosing) {
                                logger.error("Error processing inbound message for line: " + line, e);
                            }
                            break;
                        }
                    }
                } catch (Throwable var12) {
                    try {
                        processReader.close();
                    } catch (Throwable var10) {
                        var12.addSuppressed(var10);
                    }

                    throw var12;
                }

                processReader.close();
            } catch (IOException e) {
                if (!this.isClosing) {
                    logger.error("Error reading from input stream", e);
                }
            } finally {
                this.isClosing = true;
                this.inboundSink.tryEmitComplete();
            }

        });
    }

    private void startOutboundProcessing() {
        this.handleOutbound((messages) -> messages.publishOn(this.outboundScheduler).handle((message, s) -> {
                if (message != null && !this.isClosing) {
                    try {
                        String jsonMessage = this.objectMapper.writeValueAsString(message);
                        jsonMessage = jsonMessage.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n");
                        OutputStream os = this.process.getOutputStream();
                        synchronized(os) {
                            os.write(jsonMessage.getBytes(StandardCharsets.UTF8));
                            os.write("\n".getBytes(StandardCharsets.UTF8));
                            os.flush();
                        }

                        s.next(message);
                    } catch (IOException e) {
                        s.error(new RuntimeException(e));
                    }
                }

            }));
    }

    protected void handleOutbound(Function<Flux<McpSchema.JSONRPCMessage>, Flux<McpSchema.JSONRPCMessage>> outboundConsumer) {
        ((Flux)outboundConsumer.apply(this.outboundSink.asFlux())).doOnComplete(() -> {
            this.isClosing = true;
            this.outboundSink.tryEmitComplete();
        }).doOnError((e) -> {
            if (!this.isClosing) {
                logger.error("Error in outbound processing", e);
                this.isClosing = true;
                this.outboundSink.tryEmitComplete();
            }

        }).subscribe();
    }

    public Mono<Void> closeGracefully() {
        return Mono.fromRunnable(() -> {
            this.isClosing = true;
            logger.debug("Initiating graceful shutdown");
        }).then(Mono.defer(() -> {
            this.inboundSink.tryEmitComplete();
            this.outboundSink.tryEmitComplete();
            this.errorSink.tryEmitComplete();
            return Mono.delay(Duration.ofMillis(100L));
        })).then(Mono.defer(() -> {
            logger.debug("Sending TERM to process");
            if (this.process != null) {
                this.process.destroy();
                return Mono.fromFuture(this.process.onExit());
            } else {
                logger.warn("Process not started");
                return Mono.empty();
            }
        })).doOnNext((process) -> {
            if (process.exitValue() != 0) {
                logger.warn("Process terminated with code " + process.exitValue());
            }

        }).then(Mono.fromRunnable(() -> {
            try {
                this.inboundScheduler.dispose();
                this.errorScheduler.dispose();
                this.outboundScheduler.dispose();
                logger.debug("Graceful shutdown completed");
            } catch (Exception e) {
                logger.error("Error during graceful shutdown", e);
            }

        })).then().subscribeOn(Schedulers.boundedElastic());
    }

    public Sinks.Many<String> getErrorSink() {
        return this.errorSink;
    }

    public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
        return (T)this.objectMapper.convertValue(data, typeRef);
    }
}
```

#### WebFluxSseClientTransport

基于 Spring WebFlux 框架，使用 SSE 协议实现 MCP 客户端传输层，主要功能如下：

- 接收消息：通过 SSE 连接从服务器接收消息
- 发送消息：通过 HTTP POST 请求向服务器发送消息
- 遵循 MCP HTTP 与 SSE 传输规范：支持 JSON 序列化和反序列化，处理 JSON-RPC 格式的消息

各字段含义

- `String MESSAGEEVENTTYPE = "message"`：SSE 事件类型，用于接收 JSON-RPC 消息
- `String ENDPOINTEVENTTYPE = "endpoint"`：SSE 事件类型，用于接收服务器提供的消息发送端点 URI
- `String DEFAULTSSEENDPOINT = "/sse"`：默认的 SSE 连接端点路径
- `ParameterizedTypeReference<ServerSentEvent<String>> SSETYPE`：用于解析 SSE 事件中包含字符串数据的类型引用
- `WebClient webClient`：用于处理 SSE 连接和 HTTP POST 请求的 WebClient 实例
- `ObjectMapper objectMapper`：用于 JSON 序列化和反序列化的 ObjectMapper 实例
- `Disposable inboundSubscription`：管理 SSE 连接的订阅，用于在关闭时清理资源
- `volatile boolean isClosing = false`：标志传输是否正在关闭，防止关闭期间执行新操作
- `Sinks.One<String> messageEndpointSink = Sinks.one()`：储服务器提供的消息发送端点 URI
- `String sseEndpoint`：SSE 连接的端点 URI

对外暴露的方法

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>connect<br/></td><td>建立SSE连接，处理服务器发送的消息，并设置消息处理逻辑<br/></td></tr>
<tr>
<td>sendMessage<br/></td><td>通过HTTP POST请求向服务器发送JSON-RPC消息<br/></td></tr>
<tr>
<td>eventStream<br/></td><td>初始化并启动入站的SSE事件处理，它通过建立SSE连接来接收服务器发送的事件<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅地关闭传输连接，清理资源<br/></td></tr>
<tr>
<td>unmarshalFrom<br/></td><td>将数据反序列化为指定类型的对象<br/></td></tr>
<tr>
<td>builder<br/></td><td>创建WebFluxSseClientTransport的构建器，用于定制化实例化<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.client.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpClientTransport;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import java.io.IOException;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.publisher.SynchronousSink;
import reactor.core.scheduler.Schedulers;
import reactor.util.retry.Retry;

public class WebFluxSseClientTransport implements McpClientTransport {
    private static final Logger logger = LoggerFactory.getLogger(WebFluxSseClientTransport.class);
    private static final String MESSAGEEVENTTYPE = "message";
    private static final String ENDPOINTEVENTTYPE = "endpoint";
    private static final String DEFAULTSSEENDPOINT = "/sse";
    private static final ParameterizedTypeReference<ServerSentEvent<String>> SSETYPE = new ParameterizedTypeReference<ServerSentEvent<String>>() {
    };
    private final WebClient webClient;
    protected ObjectMapper objectMapper;
    private Disposable inboundSubscription;
    private volatile boolean isClosing;
    protected final Sinks.One<String> messageEndpointSink;
    private String sseEndpoint;
    private BiConsumer<Retry.RetrySignal, SynchronousSink<Object>> inboundRetryHandler;

    public WebFluxSseClientTransport(WebClient.Builder webClientBuilder) {
        this(webClientBuilder, new ObjectMapper());
    }

    public WebFluxSseClientTransport(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this(webClientBuilder, objectMapper, "/sse");
    }

    public WebFluxSseClientTransport(WebClient.Builder webClientBuilder, ObjectMapper objectMapper, String sseEndpoint) {
        this.isClosing = false;
        this.messageEndpointSink = Sinks.one();
        this.inboundRetryHandler = (retrySpec, sink) -> {
            if (this.isClosing) {
                logger.debug("SSE connection closed during shutdown");
                sink.error(retrySpec.failure());
            } else if (retrySpec.failure() instanceof IOException) {
                logger.debug("Retrying SSE connection after IO error");
                sink.next(retrySpec);
            } else {
                logger.error("Fatal SSE error, not retrying: {}", retrySpec.failure().getMessage());
                sink.error(retrySpec.failure());
            }
        };
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        Assert.notNull(webClientBuilder, "WebClient.Builder must not be null");
        Assert.hasText(sseEndpoint, "SSE endpoint must not be null or empty");
        this.objectMapper = objectMapper;
        this.webClient = webClientBuilder.build();
        this.sseEndpoint = sseEndpoint;
    }

    public Mono<Void> connect(Function<Mono<McpSchema.JSONRPCMessage>, Mono<McpSchema.JSONRPCMessage>> handler) {
        Flux<ServerSentEvent<String>> events = this.eventStream();
        this.inboundSubscription = events.concatMap((event) -> Mono.just(event).handle((e, s) -> {
                if ("endpoint".equals(event.event())) {
                    String messageEndpointUri = (String)event.data();
                    if (this.messageEndpointSink.tryEmitValue(messageEndpointUri).isSuccess()) {
                        s.complete();
                    } else {
                        s.error(new McpError("Failed to handle SSE endpoint event"));
                    }
                } else if ("message".equals(event.event())) {
                    try {
                        McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(this.objectMapper, (String)event.data());
                        s.next(message);
                    } catch (IOException ioException) {
                        s.error(ioException);
                    }
                } else {
                    s.error(new McpError("Received unrecognized SSE event type: " + event.event()));
                }

            }).transform(handler)).subscribe();
        return this.messageEndpointSink.asMono().then();
    }

    public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
        return this.messageEndpointSink.asMono().flatMap((messageEndpointUri) -> {
            if (this.isClosing) {
                return Mono.empty();
            } else {
                try {
                    String jsonText = this.objectMapper.writeValueAsString(message);
                    return ((WebClient.RequestBodySpec)this.webClient.post().uri(messageEndpointUri, new Object[0])).contentType(MediaType.APPLICATIONJSON).bodyValue(jsonText).retrieve().toBodilessEntity().doOnSuccess((response) -> logger.debug("Message sent successfully")).doOnError((error) -> {
                        if (!this.isClosing) {
                            logger.error("Error sending message: {}", error.getMessage());
                        }

                    });
                } catch (IOException e) {
                    return !this.isClosing ? Mono.error(new RuntimeException("Failed to serialize message", e)) : Mono.empty();
                }
            }
        }).then();
    }

    protected Flux<ServerSentEvent<String>> eventStream() {
        return this.webClient.get().uri(this.sseEndpoint, new Object[0]).accept(new MediaType[]{MediaType.TEXTEVENTSTREAM}).retrieve().bodyToFlux(SSETYPE).retryWhen(Retry.from((retrySignal) -> retrySignal.handle(this.inboundRetryHandler)));
    }

    public Mono<Void> closeGracefully() {
        return Mono.fromRunnable(() -> {
            this.isClosing = true;
            if (this.inboundSubscription != null) {
                this.inboundSubscription.dispose();
            }

        }).then().subscribeOn(Schedulers.boundedElastic());
    }

    public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
        return (T)this.objectMapper.convertValue(data, typeRef);
    }

    public static Builder builder(WebClient.Builder webClientBuilder) {
        return new Builder(webClientBuilder);
    }

    public static class Builder {
        private final WebClient.Builder webClientBuilder;
        private String sseEndpoint = "/sse";
        private ObjectMapper objectMapper = new ObjectMapper();

        public Builder(WebClient.Builder webClientBuilder) {
            Assert.notNull(webClientBuilder, "WebClient.Builder must not be null");
            this.webClientBuilder = webClientBuilder;
        }

        public Builder sseEndpoint(String sseEndpoint) {
            Assert.hasText(sseEndpoint, "sseEndpoint must not be empty");
            this.sseEndpoint = sseEndpoint;
            return this;
        }

        public Builder objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "objectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public WebFluxSseClientTransport build() {
            return new WebFluxSseClientTransport(this.webClientBuilder, this.objectMapper, this.sseEndpoint);
        }
    }
}
```

### McpServerTransport（McpServerTransportProvider）

McpServerTransport 是服务端传输层的标记接口，定义了服务端通信的基础功能

```java
package io.modelcontextprotocol.spec;

public interface McpServerTransport extends McpTransport {
}
```

McpServerTransportProvider 是服务端传输层的核心接口，负责会话管理、消息广播和资源清理

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>setSessionFactory<br/></td><td>设置会话工厂，用于创建新的服务端会话<br/></td></tr>
<tr>
<td>notifyClients<br/></td><td>向所有活跃客户端广播JSON-RPC消息<br/></td></tr>
<tr>
<td>close<br/></td><td>立即关闭所有传输层连接并释放资源<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅地关闭所有活跃会话，清理资源<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.spec;

import reactor.core.publisher.Mono;

public interface McpServerTransportProvider {
    void setSessionFactory(McpServerSession.Factory sessionFactory);

    Mono<Void> notifyClients(String method, Object params);

    default void close() {
        this.closeGracefully().subscribe();
    }

    Mono<Void> closeGracefully();
}
```

#### HttpServletSseServerTransportProvider

该类是服务端实现的 MCP 传输层（内部类 HttpServletMcpSessionTransport 实现 McpServerTransport），基于 Servlet 的 MCP 服务器传输实现，使用 HTTP、SSE 协议来支持客户端与服务器之间的双向通信

各字段含义

- `ObjectMapper objectMapper`：用于 JSON 序列化和反序列化的 ObjectMapper 实例
- `String baseUrl`：消息端点的基础 URL，用于构建客户端发送消息的完整路径，默认为""
- `String messageEndpoint`：客户端发送 JSON-RPC 消息的端点 URI，默认为"/mcp/message"
- `String sseEndpoint`：服务端接收 SSE 连接的端点 URI，默认为"/sse"
- `Map<String, McpServerSession> sessions`：活跃客户端会话的映射表，键为会话 ID
- `McpServerSession.Factory sessionFactory`：创建新会话的会话工厂
- `boolean isClosing`：标志传输是否正在关闭，防止关闭期间接受新连接

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>setSessionFactory<br/></td><td>设置会话工厂，用于创建新的服务端会话<br/></td></tr>
<tr>
<td>notifyClients<br/></td><td>向所有活跃客户端广播JSON-RPC消息<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅地关闭所有活跃会话，清理资源<br/></td></tr>
<tr>
<td>doGet<br/></td><td>处理SSE连接的GET请求<br/></td></tr>
<tr>
<td>doPost<br/></td><td>处理客户端消息的POST请求<br/></td></tr>
<tr>
<td>sendEvent<br/></td><td>向客户端发送SSE事件<br/></td></tr>
<tr>
<td>destroy<br/></td><td>在Servlet销毁时清理资源<br/></td></tr>
<tr>
<td>builder<br/></td><td>Builder方式创建HttpServletSseServerTransportProvider实例对象<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransport;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.util.Assert;
import jakarta.servlet.AsyncContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@WebServlet(
    asyncSupported = true
)
public class HttpServletSseServerTransportProvider extends HttpServlet implements McpServerTransportProvider {
    private static final Logger logger = LoggerFactory.getLogger(HttpServletSseServerTransportProvider.class);
    public static final String UTF8 = "UTF-8";
    public static final String APPLICATIONJSON = "application/json";
    public static final String FAILEDTOSENDERRORRESPONSE = "Failed to send error response: {}";
    public static final String DEFAULTSSEENDPOINT = "/sse";
    public static final String MESSAGEEVENTTYPE = "message";
    public static final String ENDPOINTEVENTTYPE = "endpoint";
    public static final String DEFAULTBASEURL = "";
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String messageEndpoint;
    private final String sseEndpoint;
    private final Map<String, McpServerSession> sessions;
    private final AtomicBoolean isClosing;
    private McpServerSession.Factory sessionFactory;

    public HttpServletSseServerTransportProvider(ObjectMapper objectMapper, String messageEndpoint, String sseEndpoint) {
        this(objectMapper, "", messageEndpoint, sseEndpoint);
    }

    public HttpServletSseServerTransportProvider(ObjectMapper objectMapper, String baseUrl, String messageEndpoint, String sseEndpoint) {
        this.sessions = new ConcurrentHashMap();
        this.isClosing = new AtomicBoolean(false);
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.messageEndpoint = messageEndpoint;
        this.sseEndpoint = sseEndpoint;
    }

    public HttpServletSseServerTransportProvider(ObjectMapper objectMapper, String messageEndpoint) {
        this(objectMapper, messageEndpoint, "/sse");
    }

    public void setSessionFactory(McpServerSession.Factory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    public Mono<Void> notifyClients(String method, Object params) {
        if (this.sessions.isEmpty()) {
            logger.debug("No active sessions to broadcast message to");
            return Mono.empty();
        } else {
            logger.debug("Attempting to broadcast message to {} active sessions", this.sessions.size());
            return Flux.fromIterable(this.sessions.values()).flatMap((session) -> session.sendNotification(method, params).doOnError((e) -> logger.error("Failed to send message to session {}: {}", session.getId(), e.getMessage())).onErrorComplete()).then();
        }
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String requestURI = request.getRequestURI();
        if (!requestURI.endsWith(this.sseEndpoint)) {
            response.sendError(404);
        } else if (this.isClosing.get()) {
            response.sendError(503, "Server is shutting down");
        } else {
            response.setContentType("text/event-stream");
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Cache-Control", "no-cache");
            response.setHeader("Connection", "keep-alive");
            response.setHeader("Access-Control-Allow-Origin", "*");
            String sessionId = UUID.randomUUID().toString();
            AsyncContext asyncContext = request.startAsync();
            asyncContext.setTimeout(0L);
            PrintWriter writer = response.getWriter();
            HttpServletMcpSessionTransport sessionTransport = new HttpServletMcpSessionTransport(sessionId, asyncContext, writer);
            McpServerSession session = this.sessionFactory.create(sessionTransport);
            this.sessions.put(sessionId, session);
            this.sendEvent(writer, "endpoint", this.baseUrl + this.messageEndpoint + "?sessionId=" + sessionId);
        }
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        if (this.isClosing.get()) {
            response.sendError(503, "Server is shutting down");
        } else {
            String requestURI = request.getRequestURI();
            if (!requestURI.endsWith(this.messageEndpoint)) {
                response.sendError(404);
            } else {
                String sessionId = request.getParameter("sessionId");
                if (sessionId == null) {
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.setStatus(400);
                    String jsonError = this.objectMapper.writeValueAsString(new McpError("Session ID missing in message endpoint"));
                    PrintWriter writer = response.getWriter();
                    writer.write(jsonError);
                    writer.flush();
                } else {
                    McpServerSession session = (McpServerSession)this.sessions.get(sessionId);
                    if (session == null) {
                        response.setContentType("application/json");
                        response.setCharacterEncoding("UTF-8");
                        response.setStatus(404);
                        String jsonError = this.objectMapper.writeValueAsString(new McpError("Session not found: " + sessionId));
                        PrintWriter writer = response.getWriter();
                        writer.write(jsonError);
                        writer.flush();
                    } else {
                        try {
                            BufferedReader reader = request.getReader();
                            StringBuilder body = new StringBuilder();

                            String line;
                            while((line = reader.readLine()) != null) {
                                body.append(line);
                            }

                            McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(this.objectMapper, body.toString());
                            session.handle(message).block();
                            response.setStatus(200);
                        } catch (Exception var11) {
                            Exception e = var11;
                            logger.error("Error processing message: {}", var11.getMessage());

                            try {
                                McpError mcpError = new McpError(e.getMessage());
                                response.setContentType("application/json");
                                response.setCharacterEncoding("UTF-8");
                                response.setStatus(500);
                                String jsonError = this.objectMapper.writeValueAsString(mcpError);
                                PrintWriter writer = response.getWriter();
                                writer.write(jsonError);
                                writer.flush();
                            } catch (IOException ex) {
                                logger.error("Failed to send error response: {}", ex.getMessage());
                                response.sendError(500, "Error processing message");
                            }
                        }

                    }
                }
            }
        }
    }

    public Mono<Void> closeGracefully() {
        this.isClosing.set(true);
        logger.debug("Initiating graceful shutdown with {} active sessions", this.sessions.size());
        return Flux.fromIterable(this.sessions.values()).flatMap(McpServerSession::closeGracefully).then();
    }

    private void sendEvent(PrintWriter writer, String eventType, String data) throws IOException {
        writer.write("event: " + eventType + "\n");
        writer.write("data: " + data + "\n\n");
        writer.flush();
        if (writer.checkError()) {
            throw new IOException("Client disconnected");
        }
    }

    public void destroy() {
        this.closeGracefully().block();
        super.destroy();
    }

    public static Builder builder() {
        return new Builder();
    }

    private class HttpServletMcpSessionTransport implements McpServerTransport {
        private final String sessionId;
        private final AsyncContext asyncContext;
        private final PrintWriter writer;

        HttpServletMcpSessionTransport(String sessionId, AsyncContext asyncContext, PrintWriter writer) {
            this.sessionId = sessionId;
            this.asyncContext = asyncContext;
            this.writer = writer;
            HttpServletSseServerTransportProvider.logger.debug("Session transport {} initialized with SSE writer", sessionId);
        }

        public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
            return Mono.fromRunnable(() -> {
                try {
                    String jsonText = HttpServletSseServerTransportProvider.this.objectMapper.writeValueAsString(message);
                    HttpServletSseServerTransportProvider.this.sendEvent(this.writer, "message", jsonText);
                    HttpServletSseServerTransportProvider.logger.debug("Message sent to session {}", this.sessionId);
                } catch (Exception e) {
                    HttpServletSseServerTransportProvider.logger.error("Failed to send message to session {}: {}", this.sessionId, e.getMessage());
                    HttpServletSseServerTransportProvider.this.sessions.remove(this.sessionId);
                    this.asyncContext.complete();
                }

            });
        }

        public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
            return (T)HttpServletSseServerTransportProvider.this.objectMapper.convertValue(data, typeRef);
        }

        public Mono<Void> closeGracefully() {
            return Mono.fromRunnable(() -> {
                HttpServletSseServerTransportProvider.logger.debug("Closing session transport: {}", this.sessionId);

                try {
                    HttpServletSseServerTransportProvider.this.sessions.remove(this.sessionId);
                    this.asyncContext.complete();
                    HttpServletSseServerTransportProvider.logger.debug("Successfully completed async context for session {}", this.sessionId);
                } catch (Exception e) {
                    HttpServletSseServerTransportProvider.logger.warn("Failed to complete async context for session {}: {}", this.sessionId, e.getMessage());
                }

            });
        }

        public void close() {
            try {
                HttpServletSseServerTransportProvider.this.sessions.remove(this.sessionId);
                this.asyncContext.complete();
                HttpServletSseServerTransportProvider.logger.debug("Successfully completed async context for session {}", this.sessionId);
            } catch (Exception e) {
                HttpServletSseServerTransportProvider.logger.warn("Failed to complete async context for session {}: {}", this.sessionId, e.getMessage());
            }

        }
    }

    public static class Builder {
        private ObjectMapper objectMapper = new ObjectMapper();
        private String baseUrl = "";
        private String messageEndpoint;
        private String sseEndpoint = "/sse";

        public Builder objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "ObjectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public Builder baseUrl(String baseUrl) {
            Assert.notNull(baseUrl, "Base URL must not be null");
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder messageEndpoint(String messageEndpoint) {
            Assert.hasText(messageEndpoint, "Message endpoint must not be empty");
            this.messageEndpoint = messageEndpoint;
            return this;
        }

        public Builder sseEndpoint(String sseEndpoint) {
            Assert.hasText(sseEndpoint, "SSE endpoint must not be empty");
            this.sseEndpoint = sseEndpoint;
            return this;
        }

        public HttpServletSseServerTransportProvider build() {
            if (this.objectMapper == null) {
                throw new IllegalStateException("ObjectMapper must be set");
            } else if (this.messageEndpoint == null) {
                throw new IllegalStateException("MessageEndpoint must be set");
            } else {
                return new HttpServletSseServerTransportProvider(this.objectMapper, this.baseUrl, this.messageEndpoint, this.sseEndpoint);
            }
        }
    }
}
```

#### StdioServerTransportProvider

该类是服务端实现的 MCP 传输层（内部类 StdioMcpSessionTransport 实现 McpServerTransport），基于标准输入/输出流与客户端进行进程通信

- `ObjectMapper objectMapper`: 用于 JSON 序列化和反序列化的对象映射器
- `InputStream inputStream`: 用于接收客户端消息的输入流
- `OutputStream outputStream:` 用于发送消息到客户端的输出流
- `McpServerSession session:` 当前传输的 MCP 服务器会话
- `AtomicBoolean isClosing`: 标志传输是否正在关闭，防止新消息处理
- `Sinks.One<Void> inboundReady`: 用于标记输入流准备就绪的信号

```java
package io.modelcontextprotocol.server.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransport;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.util.Assert;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;

public class StdioServerTransportProvider implements McpServerTransportProvider {
    private static final Logger logger = LoggerFactory.getLogger(StdioServerTransportProvider.class);
    private final ObjectMapper objectMapper;
    private final InputStream inputStream;
    private final OutputStream outputStream;
    private McpServerSession session;
    private final AtomicBoolean isClosing;
    private final Sinks.One<Void> inboundReady;

    public StdioServerTransportProvider() {
        this(new ObjectMapper());
    }

    public StdioServerTransportProvider(ObjectMapper objectMapper) {
        this(objectMapper, System.in, System.out);
    }

    public StdioServerTransportProvider(ObjectMapper objectMapper, InputStream inputStream, OutputStream outputStream) {
        this.isClosing = new AtomicBoolean(false);
        this.inboundReady = Sinks.one();
        Assert.notNull(objectMapper, "The ObjectMapper can not be null");
        Assert.notNull(inputStream, "The InputStream can not be null");
        Assert.notNull(outputStream, "The OutputStream can not be null");
        this.objectMapper = objectMapper;
        this.inputStream = inputStream;
        this.outputStream = outputStream;
    }

    public void setSessionFactory(McpServerSession.Factory sessionFactory) {
        StdioMcpSessionTransport transport = new StdioMcpSessionTransport();
        this.session = sessionFactory.create(transport);
        transport.initProcessing();
    }

    public Mono<Void> notifyClients(String method, Object params) {
        return this.session == null ? Mono.error(new McpError("No session to close")) : this.session.sendNotification(method, params).doOnError((e) -> logger.error("Failed to send notification: {}", e.getMessage()));
    }

    public Mono<Void> closeGracefully() {
        return this.session == null ? Mono.empty() : this.session.closeGracefully();
    }

    private class StdioMcpSessionTransport implements McpServerTransport {
        private final Sinks.Many<McpSchema.JSONRPCMessage> inboundSink = Sinks.many().unicast().onBackpressureBuffer();
        private final Sinks.Many<McpSchema.JSONRPCMessage> outboundSink = Sinks.many().unicast().onBackpressureBuffer();
        private final AtomicBoolean isStarted = new AtomicBoolean(false);
        private Scheduler inboundScheduler = Schedulers.fromExecutorService(Executors.newSingleThreadExecutor(), "stdio-inbound");
        private Scheduler outboundScheduler = Schedulers.fromExecutorService(Executors.newSingleThreadExecutor(), "stdio-outbound");
        private final Sinks.One<Void> outboundReady = Sinks.one();

        public StdioMcpSessionTransport() {
        }

        public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
            return Mono.zip(StdioServerTransportProvider.this.inboundReady.asMono(), this.outboundReady.asMono()).then(Mono.defer(() -> this.outboundSink.tryEmitNext(message).isSuccess() ? Mono.empty() : Mono.error(new RuntimeException("Failed to enqueue message"))));
        }

        public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
            return (T)StdioServerTransportProvider.this.objectMapper.convertValue(data, typeRef);
        }

        public Mono<Void> closeGracefully() {
            return Mono.fromRunnable(() -> {
                StdioServerTransportProvider.this.isClosing.set(true);
                StdioServerTransportProvider.logger.debug("Session transport closing gracefully");
                this.inboundSink.tryEmitComplete();
            });
        }

        public void close() {
            StdioServerTransportProvider.this.isClosing.set(true);
            StdioServerTransportProvider.logger.debug("Session transport closed");
        }

        private void initProcessing() {
            this.handleIncomingMessages();
            this.startInboundProcessing();
            this.startOutboundProcessing();
        }

        private void handleIncomingMessages() {
            this.inboundSink.asFlux().flatMap((message) -> StdioServerTransportProvider.this.session.handle(message)).doOnTerminate(() -> {
                this.outboundSink.tryEmitComplete();
                this.inboundScheduler.dispose();
            }).subscribe();
        }

        private void startInboundProcessing() {
            if (this.isStarted.compareAndSet(false, true)) {
                this.inboundScheduler.schedule(() -> {
                    StdioServerTransportProvider.this.inboundReady.tryEmitValue((Object)null);
                    BufferedReader reader = null;

                    try {
                        reader = new BufferedReader(new InputStreamReader(StdioServerTransportProvider.this.inputStream));

                        while(!StdioServerTransportProvider.this.isClosing.get()) {
                            try {
                                String line = reader.readLine();
                                if (line == null || StdioServerTransportProvider.this.isClosing.get()) {
                                    break;
                                }

                                StdioServerTransportProvider.logger.debug("Received JSON message: {}", line);

                                try {
                                    McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(StdioServerTransportProvider.this.objectMapper, line);
                                    if (!this.inboundSink.tryEmitNext(message).isSuccess()) {
                                        break;
                                    }
                                } catch (Exception e) {
                                    this.logIfNotClosing("Error processing inbound message", e);
                                    break;
                                }
                            } catch (IOException e) {
                                this.logIfNotClosing("Error reading from stdin", e);
                                break;
                            }
                        }
                    } catch (Exception e) {
                        this.logIfNotClosing("Error in inbound processing", e);
                    } finally {
                        StdioServerTransportProvider.this.isClosing.set(true);
                        if (StdioServerTransportProvider.this.session != null) {
                            StdioServerTransportProvider.this.session.close();
                        }

                        this.inboundSink.tryEmitComplete();
                    }

                });
            }

        }

        private void startOutboundProcessing() {
            Function<Flux<McpSchema.JSONRPCMessage>, Flux<McpSchema.JSONRPCMessage>> outboundConsumer = (messages) -> messages.doOnSubscribe((subscription) -> this.outboundReady.tryEmitValue((Object)null)).publishOn(this.outboundScheduler).handle((message, sink) -> {
                    if (message != null && !StdioServerTransportProvider.this.isClosing.get()) {
                        try {
                            String jsonMessage = StdioServerTransportProvider.this.objectMapper.writeValueAsString(message);
                            jsonMessage = jsonMessage.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n");
                            synchronized(StdioServerTransportProvider.this.outputStream) {
                                StdioServerTransportProvider.this.outputStream.write(jsonMessage.getBytes(StandardCharsets.UTF8));
                                StdioServerTransportProvider.this.outputStream.write("\n".getBytes(StandardCharsets.UTF8));
                                StdioServerTransportProvider.this.outputStream.flush();
                            }

                            sink.next(message);
                        } catch (IOException e) {
                            if (!StdioServerTransportProvider.this.isClosing.get()) {
                                StdioServerTransportProvider.logger.error("Error writing message", e);
                                sink.error(new RuntimeException(e));
                            } else {
                                StdioServerTransportProvider.logger.debug("Stream closed during shutdown", e);
                            }
                        }
                    } else if (StdioServerTransportProvider.this.isClosing.get()) {
                        sink.complete();
                    }

                }).doOnComplete(() -> {
                    StdioServerTransportProvider.this.isClosing.set(true);
                    this.outboundScheduler.dispose();
                }).doOnError((e) -> {
                    if (!StdioServerTransportProvider.this.isClosing.get()) {
                        StdioServerTransportProvider.logger.error("Error in outbound processing", e);
                        StdioServerTransportProvider.this.isClosing.set(true);
                        this.outboundScheduler.dispose();
                    }

                }).map((msg) -> (McpSchema.JSONRPCMessage)msg);
            ((Flux)outboundConsumer.apply(this.outboundSink.asFlux())).subscribe();
        }

        private void logIfNotClosing(String message, Exception e) {
            if (!StdioServerTransportProvider.this.isClosing.get()) {
                StdioServerTransportProvider.logger.error(message, e);
            }

        }
    }
}
```

#### WebFluxSseServerTransportProvider

该类是服务端实现的 MCP 传输层（内部类 WebFluxMcpSessionTransport 实现 McpServerTransport），基于 Spring WebFlux 框架，使用 SSE 协议实现双向通信。它负责管理客户端会话，处理消息的接收与发送，并提供可靠的消息广播功能，主要功能如下：

1. SSE 连接管理：通过 SSE 建立服务端到客户端的实时消息通道
2. 消息接收与处理：通过 HTTP POST 接收客户端发送的 JSON-RPC 消息
3. 消息广播：支持将消息推送到所有活跃的客户端会话
4. 会话管理：维护客户端会话的生命周期，支持资源清理和优雅关闭
5. 线程安全：使用 ConcurrentHashMap 管理会话，确保多客户端连接的安全性

各字段含义

- `ObjectMapper objectMapper`：用于 JSON 序列化和反序列化的 ObjectMapper 实例
- `String baseUrl`：消息端点的基础 URL，用于构建客户端发送消息的完整路径，默认为""
- `String messageEndpoint`：客户端发送 JSON-RPC 消息的端点 URI，默认为"/mcp/message"
- `String sseEndpoint`：服务端接收 SSE 连接的端点 URI，默认为"/sse"
- `RouterFunction<?> routerFunction`：定义 HTTP 路由的 RouterFunction，包括 SSE 和消息端点
- `McpServerSession.Factory sessionFactory`：会话工厂，用于创建新的服务端会话
- `ConcurrentHashMap<String, McpServerSession> sessions`：存储活跃客户端会话的线程安全映射，键为会话 ID
- `boolean isClosing`：标志传输是否正在关闭，防止关闭期间接受新连接

对外暴露的方法

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>setSessionFactory<br/></td><td>设置会话工厂，用于创建新的服务端会话<br/></td></tr>
<tr>
<td>notifyClients<br/></td><td>向所有活跃客户端广播JSON-RPC消息<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅地关闭所有活跃会话，清理资源<br/></td></tr>
<tr>
<td>getRouterFunction<br/></td><td>返回定义SSE和消息端点的路由函数<br/></td></tr>
<tr>
<td>builder<br/></td><td>Builder方式创建WebFluxSseServerTransportProvider实例对象<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server.transport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransport;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.util.Assert;
import java.io.IOException;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.Exceptions;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;
import reactor.core.publisher.Mono;

public class WebFluxSseServerTransportProvider implements McpServerTransportProvider {
    private static final Logger logger = LoggerFactory.getLogger(WebFluxSseServerTransportProvider.class);
    public static final String MESSAGEEVENTTYPE = "message";
    public static final String ENDPOINTEVENTTYPE = "endpoint";
    public static final String DEFAULTSSEENDPOINT = "/sse";
    public static final String DEFAULTBASEURL = "";
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String messageEndpoint;
    private final String sseEndpoint;
    private final RouterFunction<?> routerFunction;
    private McpServerSession.Factory sessionFactory;
    private final ConcurrentHashMap<String, McpServerSession> sessions;
    private volatile boolean isClosing;

    public WebFluxSseServerTransportProvider(ObjectMapper objectMapper, String messageEndpoint) {
        this(objectMapper, messageEndpoint, "/sse");
    }

    public WebFluxSseServerTransportProvider(ObjectMapper objectMapper, String messageEndpoint, String sseEndpoint) {
        this(objectMapper, "", messageEndpoint, sseEndpoint);
    }

    public WebFluxSseServerTransportProvider(ObjectMapper objectMapper, String baseUrl, String messageEndpoint, String sseEndpoint) {
        this.sessions = new ConcurrentHashMap();
        this.isClosing = false;
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        Assert.notNull(baseUrl, "Message base path must not be null");
        Assert.notNull(messageEndpoint, "Message endpoint must not be null");
        Assert.notNull(sseEndpoint, "SSE endpoint must not be null");
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.messageEndpoint = messageEndpoint;
        this.sseEndpoint = sseEndpoint;
        this.routerFunction = RouterFunctions.route().GET(this.sseEndpoint, this::handleSseConnection).POST(this.messageEndpoint, this::handleMessage).build();
    }

    public void setSessionFactory(McpServerSession.Factory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    public Mono<Void> notifyClients(String method, Object params) {
        if (this.sessions.isEmpty()) {
            logger.debug("No active sessions to broadcast message to");
            return Mono.empty();
        } else {
            logger.debug("Attempting to broadcast message to {} active sessions", this.sessions.size());
            return Flux.fromIterable(this.sessions.values()).flatMap((session) -> session.sendNotification(method, params).doOnError((e) -> logger.error("Failed to send message to session {}: {}", session.getId(), e.getMessage())).onErrorComplete()).then();
        }
    }

    public Mono<Void> closeGracefully() {
        return Flux.fromIterable(this.sessions.values()).doFirst(() -> logger.debug("Initiating graceful shutdown with {} active sessions", this.sessions.size())).flatMap(McpServerSession::closeGracefully).then();
    }

    public RouterFunction<?> getRouterFunction() {
        return this.routerFunction;
    }

    private Mono<ServerResponse> handleSseConnection(ServerRequest request) {
        return this.isClosing ? ServerResponse.status(HttpStatus.SERVICEUNAVAILABLE).bodyValue("Server is shutting down") : ServerResponse.ok().contentType(MediaType.TEXTEVENTSTREAM).body(Flux.create((sink) -> {
            WebFluxMcpSessionTransport sessionTransport = new WebFluxMcpSessionTransport(sink);
            McpServerSession session = this.sessionFactory.create(sessionTransport);
            String sessionId = session.getId();
            logger.debug("Created new SSE connection for session: {}", sessionId);
            this.sessions.put(sessionId, session);
            logger.debug("Sending initial endpoint event to session: {}", sessionId);
            sink.next(ServerSentEvent.builder().event("endpoint").data(this.baseUrl + this.messageEndpoint + "?sessionId=" + sessionId).build());
            sink.onCancel(() -> {
                logger.debug("Session {} cancelled", sessionId);
                this.sessions.remove(sessionId);
            });
        }), ServerSentEvent.class);
    }

    private Mono<ServerResponse> handleMessage(ServerRequest request) {
        if (this.isClosing) {
            return ServerResponse.status(HttpStatus.SERVICEUNAVAILABLE).bodyValue("Server is shutting down");
        } else if (request.queryParam("sessionId").isEmpty()) {
            return ServerResponse.badRequest().bodyValue(new McpError("Session ID missing in message endpoint"));
        } else {
            McpServerSession session = (McpServerSession)this.sessions.get(request.queryParam("sessionId").get());
            return session == null ? ServerResponse.status(HttpStatus.NOTFOUND).bodyValue(new McpError("Session not found: " + (String)request.queryParam("sessionId").get())) : request.bodyToMono(String.class).flatMap((body) -> {
                try {
                    McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(this.objectMapper, body);
                    return session.handle(message).flatMap((response) -> ServerResponse.ok().build()).onErrorResume((error) -> {
                        logger.error("Error processing  message: {}", error.getMessage());
                        return ServerResponse.status(HttpStatus.INTERNALSERVERERROR).bodyValue(new McpError(error.getMessage()));
                    });
                } catch (IOException | IllegalArgumentException e) {
                    logger.error("Failed to deserialize message: {}", ((Exception)e).getMessage());
                    return ServerResponse.badRequest().bodyValue(new McpError("Invalid message format"));
                }
            });
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    private class WebFluxMcpSessionTransport implements McpServerTransport {
        private final FluxSink<ServerSentEvent<?>> sink;

        public WebFluxMcpSessionTransport(FluxSink<ServerSentEvent<?>> sink) {
            this.sink = sink;
        }

        public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
            return Mono.fromSupplier(() -> {
                try {
                    return WebFluxSseServerTransportProvider.this.objectMapper.writeValueAsString(message);
                } catch (IOException e) {
                    throw Exceptions.propagate(e);
                }
            }).doOnNext((jsonText) -> {
                ServerSentEvent<Object> event = ServerSentEvent.builder().event("message").data(jsonText).build();
                this.sink.next(event);
            }).doOnError((e) -> {
                Throwable exception = Exceptions.unwrap(e);
                this.sink.error(exception);
            }).then();
        }

        public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
            return (T)WebFluxSseServerTransportProvider.this.objectMapper.convertValue(data, typeRef);
        }

        public Mono<Void> closeGracefully() {
            FluxSink var10000 = this.sink;
            Objects.requireNonNull(var10000);
            return Mono.fromRunnable(var10000::complete);
        }

        public void close() {
            this.sink.complete();
        }
    }

    public static class Builder {
        private ObjectMapper objectMapper;
        private String baseUrl = "";
        private String messageEndpoint;
        private String sseEndpoint = "/sse";

        public Builder objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "ObjectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public Builder basePath(String baseUrl) {
            Assert.notNull(baseUrl, "basePath must not be null");
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder messageEndpoint(String messageEndpoint) {
            Assert.notNull(messageEndpoint, "Message endpoint must not be null");
            this.messageEndpoint = messageEndpoint;
            return this;
        }

        public Builder sseEndpoint(String sseEndpoint) {
            Assert.notNull(sseEndpoint, "SSE endpoint must not be null");
            this.sseEndpoint = sseEndpoint;
            return this;
        }

        public WebFluxSseServerTransportProvider build() {
            Assert.notNull(this.objectMapper, "ObjectMapper must be set");
            Assert.notNull(this.messageEndpoint, "Message endpoint must be set");
            return new WebFluxSseServerTransportProvider(this.objectMapper, this.baseUrl, this.messageEndpoint, this.sseEndpoint);
        }
    }
}
```

### McpSession

MCP 会话，用于处理客户端与服务端之间的通信。它定义了会话的生命周期管理以及消息交互的核心功能，支持异步操作，基于 Project Reactor 的 Mono 实现非阻塞通信，主要功能如下

- 请求-响应模式：支持发送请求并接收响应
- 通知模式：支持发送无需响应的通知消息
- 会话管理：提供会话关闭和资源释放的功能
- 异步通信：通过 Mono 实现非阻塞的消息交互

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>sendRequest<br/></td><td>发送请求并接收指定类型的响应<br/></td></tr>
<tr>
<td>sendNotification<br/></td><td>发送无需参数的通知消息<br/></td></tr>
<tr>
<td>sendNotification<br/></td><td>发送带参数的通知消息<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>异步关闭会话并释放资源<br/></td></tr>
<tr>
<td>close<br/></td><td>立即关闭会话并释放资源<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.spec;

import com.fasterxml.jackson.core.type.TypeReference;
import reactor.core.publisher.Mono;

public interface McpSession {
    <T> Mono<T> sendRequest(String method, Object requestParams, TypeReference<T> typeRef);

    default Mono<Void> sendNotification(String method) {
        return this.sendNotification(method, (Object)null);
    }

    Mono<Void> sendNotification(String method, Object params);

    Mono<Void> closeGracefully();

    void close();
}
```

#### McpClientSession

客户端会话实现类，负责管理与服务端之间的双向 JSON-RPC 通信，主要功能如下：

- 请求/响应处理：支持发送请求并接收响应，确保消息的唯一性和正确性。
- 通知处理：支持发送无需响应的通知消息。
- 消息超时管理：通过配置超时时间，确保请求不会无限等待。
- 传输层抽象：通过 McpClientTransport 实现消息的发送和接收。
- 会话管理：提供会话的生命周期管理，包括优雅关闭和立即关闭。

各字段含义

- `Duration requestTimeout`：请求超时时间，等待响应的最大时长
- `McpClientTransport transport`：传输层实现，用于消息的发送和接收
- `ConcurrentHashMap<Object, MonoSink<McpSchema.JSONRPCResponse>> pendingResponses`：存储待处理响应的映射，键为请求 ID，值为响应的回调
- `ConcurrentHashMap<String, RequestHandler<?>> requestHandlers`：存储请求处理器的映射，键为方法名称，值为对应的处理逻辑
- `ConcurrentHashMap<String, NotificationHandler> notificationHandlers`：存储通知处理器的映射，键为方法名称，值为对应的处理逻辑
- `String sessionPrefix`：会话特定的请求 ID 前缀，用于生成唯一请求 ID
- `AtomicLong requestCounter`：用于生成唯一请求 ID 的计数器
- `Disposable connection`：管理与传输层的连接，负责监听和处理消息

```java
package io.modelcontextprotocol.spec;

import com.fasterxml.jackson.core.type.TypeReference;
import io.modelcontextprotocol.util.Assert;
import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;
import reactor.core.publisher.MonoSink;

public class McpClientSession implements McpSession {
    private static final Logger logger = LoggerFactory.getLogger(McpClientSession.class);
    private final Duration requestTimeout;
    private final McpClientTransport transport;
    private final ConcurrentHashMap<Object, MonoSink<McpSchema.JSONRPCResponse>> pendingResponses = new ConcurrentHashMap();
    private final ConcurrentHashMap<String, RequestHandler<?>> requestHandlers = new ConcurrentHashMap();
    private final ConcurrentHashMap<String, NotificationHandler> notificationHandlers = new ConcurrentHashMap();
    private final String sessionPrefix = UUID.randomUUID().toString().substring(0, 8);
    private final AtomicLong requestCounter = new AtomicLong(0L);
    private final Disposable connection;

    public McpClientSession(Duration requestTimeout, McpClientTransport transport, Map<String, RequestHandler<?>> requestHandlers, Map<String, NotificationHandler> notificationHandlers) {
        Assert.notNull(requestTimeout, "The requestTimeout can not be null");
        Assert.notNull(transport, "The transport can not be null");
        Assert.notNull(requestHandlers, "The requestHandlers can not be null");
        Assert.notNull(notificationHandlers, "The notificationHandlers can not be null");
        this.requestTimeout = requestTimeout;
        this.transport = transport;
        this.requestHandlers.putAll(requestHandlers);
        this.notificationHandlers.putAll(notificationHandlers);
        this.connection = this.transport.connect((mono) -> mono.doOnNext(this::handle)).subscribe();
    }

    private void handle(McpSchema.JSONRPCMessage message) {
        if (message instanceof McpSchema.JSONRPCResponse response) {
            logger.debug("Received Response: {}", response);
            MonoSink<McpSchema.JSONRPCResponse> sink = (MonoSink)this.pendingResponses.remove(response.id());
            if (sink == null) {
                logger.warn("Unexpected response for unknown id {}", response.id());
            } else {
                sink.success(response);
            }
        } else if (message instanceof McpSchema.JSONRPCRequest request) {
            logger.debug("Received request: {}", request);
            Mono var10000 = this.handleIncomingRequest(request).onErrorResume((error) -> {
                McpSchema.JSONRPCResponse errorResponse = new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32603, error.getMessage(), (Object)null));
                return this.transport.sendMessage(errorResponse).then(Mono.empty());
            });
            McpClientTransport var10001 = this.transport;
            Objects.requireNonNull(var10001);
            var10000.flatMap(var10001::sendMessage).subscribe();
        } else if (message instanceof McpSchema.JSONRPCNotification notification) {
            logger.debug("Received notification: {}", notification);
            this.handleIncomingNotification(notification).doOnError((error) -> logger.error("Error handling notification: {}", error.getMessage())).subscribe();
        } else {
            logger.warn("Received unknown message type: {}", message);
        }

    }

    private Mono<McpSchema.JSONRPCResponse> handleIncomingRequest(McpSchema.JSONRPCRequest request) {
        return Mono.defer(() -> {
            RequestHandler<?> handler = (RequestHandler)this.requestHandlers.get(request.method());
            if (handler == null) {
                MethodNotFoundError error = this.getMethodNotFoundError(request.method());
                return Mono.just(new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32601, error.message(), error.data())));
            } else {
                return handler.handle(request.params()).map((result) -> new McpSchema.JSONRPCResponse("2.0", request.id(), result, (McpSchema.JSONRPCResponse.JSONRPCError)null)).onErrorResume((errorx) -> Mono.just(new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32603, errorx.getMessage(), (Object)null))));
            }
        });
    }

    private MethodNotFoundError getMethodNotFoundError(String method) {
        switch (method) {
            case "roots/list" -> {
                return new MethodNotFoundError(method, "Roots not supported", Map.of("reason", "Client does not have roots capability"));
            }
            default -> {
                return new MethodNotFoundError(method, "Method not found: " + method, (Object)null);
            }
        }
    }

    private Mono<Void> handleIncomingNotification(McpSchema.JSONRPCNotification notification) {
        return Mono.defer(() -> {
            NotificationHandler handler = (NotificationHandler)this.notificationHandlers.get(notification.method());
            if (handler == null) {
                logger.error("No handler registered for notification method: {}", notification.method());
                return Mono.empty();
            } else {
                return handler.handle(notification.params());
            }
        });
    }

    private String generateRequestId() {
        String var10000 = this.sessionPrefix;
        return var10000 + "-" + this.requestCounter.getAndIncrement();
    }

    public <T> Mono<T> sendRequest(String method, Object requestParams, TypeReference<T> typeRef) {
        String requestId = this.generateRequestId();
        return Mono.deferContextual((ctx) -> Mono.create((sink) -> {
                this.pendingResponses.put(requestId, sink);
                McpSchema.JSONRPCRequest jsonrpcRequest = new McpSchema.JSONRPCRequest("2.0", method, requestId, requestParams);
                this.transport.sendMessage(jsonrpcRequest).contextWrite(ctx).subscribe((v) -> {
                }, (error) -> {
                    this.pendingResponses.remove(requestId);
                    sink.error(error);
                });
            })).timeout(this.requestTimeout).handle((jsonRpcResponse, sink) -> {
            if (jsonRpcResponse.error() != null) {
                logger.error("Error handling request: {}", jsonRpcResponse.error());
                sink.error(new McpError(jsonRpcResponse.error()));
            } else if (typeRef.getType().equals(Void.class)) {
                sink.complete();
            } else {
                sink.next(this.transport.unmarshalFrom(jsonRpcResponse.result(), typeRef));
            }

        });
    }

    public Mono<Void> sendNotification(String method, Object params) {
        McpSchema.JSONRPCNotification jsonrpcNotification = new McpSchema.JSONRPCNotification("2.0", method, params);
        return this.transport.sendMessage(jsonrpcNotification);
    }

    public Mono<Void> closeGracefully() {
        return Mono.defer(() -> {
            this.connection.dispose();
            return this.transport.closeGracefully();
        });
    }

    public void close() {
        this.connection.dispose();
        this.transport.close();
    }

    static record MethodNotFoundError(String method, String message, Object data) {
    }

    @FunctionalInterface
    public interface NotificationHandler {
        Mono<Void> handle(Object params);
    }

    @FunctionalInterface
    public interface RequestHandler<T> {
        Mono<T> handle(Object params);
    }
}
```

#### McpServerSession

服务端会话管理类，负责管理与客户端的双向 JSON-RPC 通信，主要功能如下：

- 请求/响应处理：支持发送请求并接收响应，确保消息的唯一性和正确性
- 通知处理：支持发送无需响应的通知消息
- 会话初始化：管理客户端与服务端的初始化过程，包括能力协商和信息交换
- 传输层抽象：通过 McpServerTransport 实现消息的发送和接收
- 会话管理：提供会话的生命周期管理，包括优雅关闭和立即关闭

各字段含义

- `String id`：会话唯一标识符，用于区分不同的会话
- `Duration requestTimeout`：请求超时时间，等待响应的最大时长
- `AtomicLong requestCounter`：用于生成唯一请求 ID 的计数器
- `InitRequestHandler initRequestHandler`：存储待处理响应的映射，键为请求 ID，值为响应的回调
- `InitNotificationHandler initNotificationHandler`：处理初始化请求的处理器
- `Map<String, RequestHandler<?>> requestHandlers`：存储请求处理器的映射，键为方法名称，值为对应的处理逻辑
- `Map<String, NotificationHandler> notificationHandlers`：存储通知处理器的映射，键为方法名称，值为对应的处理逻辑
- `McpServerTransport transport`：传输层实现，用于消息的发送和接收
- `Sinks.One<McpAsyncServerExchange> exchangeSink`：用于管理服务端与客户端的交互状态
- `AtomicReference<McpSchema.ClientCapabilities> clientCapabilities`：存储客户端的能力信息
- `AtomicReference<McpSchema.Implementation> clientInfo`：存储客户端的实现信息
- `AtomicInteger state`：会话状态，未初始化、初始化中或已初始化

```java
package io.modelcontextprotocol.spec;

import com.fasterxml.jackson.core.type.TypeReference;
import io.modelcontextprotocol.server.McpAsyncServerExchange;
import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;
import reactor.core.publisher.MonoSink;
import reactor.core.publisher.Sinks;

public class McpServerSession implements McpSession {
    private static final Logger logger = LoggerFactory.getLogger(McpServerSession.class);
    private final ConcurrentHashMap<Object, MonoSink<McpSchema.JSONRPCResponse>> pendingResponses = new ConcurrentHashMap();
    private final String id;
    private final Duration requestTimeout;
    private final AtomicLong requestCounter = new AtomicLong(0L);
    private final InitRequestHandler initRequestHandler;
    private final InitNotificationHandler initNotificationHandler;
    private final Map<String, RequestHandler<?>> requestHandlers;
    private final Map<String, NotificationHandler> notificationHandlers;
    private final McpServerTransport transport;
    private final Sinks.One<McpAsyncServerExchange> exchangeSink = Sinks.one();
    private final AtomicReference<McpSchema.ClientCapabilities> clientCapabilities = new AtomicReference();
    private final AtomicReference<McpSchema.Implementation> clientInfo = new AtomicReference();
    private static final int STATEUNINITIALIZED = 0;
    private static final int STATEINITIALIZING = 1;
    private static final int STATEINITIALIZED = 2;
    private final AtomicInteger state = new AtomicInteger(0);

    public McpServerSession(String id, Duration requestTimeout, McpServerTransport transport, InitRequestHandler initHandler, InitNotificationHandler initNotificationHandler, Map<String, RequestHandler<?>> requestHandlers, Map<String, NotificationHandler> notificationHandlers) {
        this.id = id;
        this.requestTimeout = requestTimeout;
        this.transport = transport;
        this.initRequestHandler = initHandler;
        this.initNotificationHandler = initNotificationHandler;
        this.requestHandlers = requestHandlers;
        this.notificationHandlers = notificationHandlers;
    }

    public String getId() {
        return this.id;
    }

    public void init(McpSchema.ClientCapabilities clientCapabilities, McpSchema.Implementation clientInfo) {
        this.clientCapabilities.lazySet(clientCapabilities);
        this.clientInfo.lazySet(clientInfo);
    }

    private String generateRequestId() {
        String var10000 = this.id;
        return var10000 + "-" + this.requestCounter.getAndIncrement();
    }

    public <T> Mono<T> sendRequest(String method, Object requestParams, TypeReference<T> typeRef) {
        String requestId = this.generateRequestId();
        return Mono.create((sink) -> {
            this.pendingResponses.put(requestId, sink);
            McpSchema.JSONRPCRequest jsonrpcRequest = new McpSchema.JSONRPCRequest("2.0", method, requestId, requestParams);
            this.transport.sendMessage(jsonrpcRequest).subscribe((v) -> {
            }, (error) -> {
                this.pendingResponses.remove(requestId);
                sink.error(error);
            });
        }).timeout(this.requestTimeout).handle((jsonRpcResponse, sink) -> {
            if (jsonRpcResponse.error() != null) {
                sink.error(new McpError(jsonRpcResponse.error()));
            } else if (typeRef.getType().equals(Void.class)) {
                sink.complete();
            } else {
                sink.next(this.transport.unmarshalFrom(jsonRpcResponse.result(), typeRef));
            }

        });
    }

    public Mono<Void> sendNotification(String method, Object params) {
        McpSchema.JSONRPCNotification jsonrpcNotification = new McpSchema.JSONRPCNotification("2.0", method, params);
        return this.transport.sendMessage(jsonrpcNotification);
    }

    public Mono<Void> handle(McpSchema.JSONRPCMessage message) {
        return Mono.defer(() -> {
            if (message instanceof McpSchema.JSONRPCResponse response) {
                logger.debug("Received Response: {}", response);
                MonoSink<McpSchema.JSONRPCResponse> sink = (MonoSink)this.pendingResponses.remove(response.id());
                if (sink == null) {
                    logger.warn("Unexpected response for unknown id {}", response.id());
                } else {
                    sink.success(response);
                }

                return Mono.empty();
            } else if (message instanceof McpSchema.JSONRPCRequest request) {
                logger.debug("Received request: {}", request);
                Mono var10000 = this.handleIncomingRequest(request).onErrorResume((error) -> {
                    McpSchema.JSONRPCResponse errorResponse = new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32603, error.getMessage(), (Object)null));
                    return this.transport.sendMessage(errorResponse).then(Mono.empty());
                });
                McpServerTransport var10001 = this.transport;
                Objects.requireNonNull(var10001);
                return var10000.flatMap(var10001::sendMessage);
            } else if (message instanceof McpSchema.JSONRPCNotification notification) {
                logger.debug("Received notification: {}", notification);
                return this.handleIncomingNotification(notification).doOnError((error) -> logger.error("Error handling notification: {}", error.getMessage()));
            } else {
                logger.warn("Received unknown message type: {}", message);
                return Mono.empty();
            }
        });
    }

    private Mono<McpSchema.JSONRPCResponse> handleIncomingRequest(McpSchema.JSONRPCRequest request) {
        return Mono.defer(() -> {
            Mono<?> resultMono;
            if ("initialize".equals(request.method())) {
                McpSchema.InitializeRequest initializeRequest = (McpSchema.InitializeRequest)this.transport.unmarshalFrom(request.params(), new TypeReference<McpSchema.InitializeRequest>() {
                });
                this.state.lazySet(1);
                this.init(initializeRequest.capabilities(), initializeRequest.clientInfo());
                resultMono = this.initRequestHandler.handle(initializeRequest);
            } else {
                RequestHandler<?> handler = (RequestHandler)this.requestHandlers.get(request.method());
                if (handler == null) {
                    MethodNotFoundError error = this.getMethodNotFoundError(request.method());
                    return Mono.just(new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32601, error.message(), error.data())));
                }

                resultMono = this.exchangeSink.asMono().flatMap((exchange) -> handler.handle(exchange, request.params()));
            }

            return resultMono.map((result) -> new McpSchema.JSONRPCResponse("2.0", request.id(), result, (McpSchema.JSONRPCResponse.JSONRPCError)null)).onErrorResume((errorx) -> Mono.just(new McpSchema.JSONRPCResponse("2.0", request.id(), (Object)null, new McpSchema.JSONRPCResponse.JSONRPCError(-32603, errorx.getMessage(), (Object)null))));
        });
    }

    private Mono<Void> handleIncomingNotification(McpSchema.JSONRPCNotification notification) {
        return Mono.defer(() -> {
            if ("notifications/initialized".equals(notification.method())) {
                this.state.lazySet(2);
                this.exchangeSink.tryEmitValue(new McpAsyncServerExchange(this, (McpSchema.ClientCapabilities)this.clientCapabilities.get(), (McpSchema.Implementation)this.clientInfo.get()));
                return this.initNotificationHandler.handle();
            } else {
                NotificationHandler handler = (NotificationHandler)this.notificationHandlers.get(notification.method());
                if (handler == null) {
                    logger.error("No handler registered for notification method: {}", notification.method());
                    return Mono.empty();
                } else {
                    return this.exchangeSink.asMono().flatMap((exchange) -> handler.handle(exchange, notification.params()));
                }
            }
        });
    }

    private MethodNotFoundError getMethodNotFoundError(String method) {
        return new MethodNotFoundError(method, "Method not found: " + method, (Object)null);
    }

    public Mono<Void> closeGracefully() {
        return this.transport.closeGracefully();
    }

    public void close() {
        this.transport.close();
    }

    static record MethodNotFoundError(String method, String message, Object data) {
    }

    @FunctionalInterface
    public interface Factory {
        McpServerSession create(McpServerTransport sessionTransport);
    }

    public interface InitNotificationHandler {
        Mono<Void> handle();
    }

    public interface InitRequestHandler {
        Mono<McpSchema.InitializeResult> handle(McpSchema.InitializeRequest initializeRequest);
    }

    public interface NotificationHandler {
        Mono<Void> handle(McpAsyncServerExchange exchange, Object params);
    }

    public interface RequestHandler<T> {
        Mono<T> handle(McpAsyncServerExchange exchange, Object params);
    }
}
```

### McpClient

该接口用于创建 MCP 客户端的工厂类，提供了构建同步和异步客户端的静态方法

静态方法说明：

- sync：创建一个同步 MCP 客户端的构建器
- async：创建一个异步 MCP 客户端的构建器

内部类 SyncSpec、AsyncSpec 类说明

<table>
<tr>
<td><br/></td><td>字段<br/></td><td>名称<br/></td></tr>
<tr>
<td rowspan="11">SyncSpec、AsyncSpec<br/><br/></td><td>McpClientTransport transport<br/></td><td>客户端传输层实现<br/></td></tr>
<tr>
<td>Duration requestTimeout<br/></td><td>请求超时时间，默认20秒<br/></td></tr>
<tr>
<td>Duration initializationTimeout<br/></td><td>初始化超时时间，默认20秒<br/></td></tr>
<tr>
<td>ClientCapabilities capabilities<br/></td><td>客户端能力配置<br/></td></tr>
<tr>
<td>Implementation clientInfo<br/></td><td>客户端实现信息<br/></td></tr>
<tr>
<td>Map<String, Root> roots<br/></td><td>客户端可访问的资源根URI映射<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Tool>>> toolsChangeConsumers<br/></td><td>工具变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Resource>>> resourcesChangeConsumers<br/></td><td>资源变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Prompt>>> promptsChangeConsumers<br/></td><td>提示变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers<br/></td><td>日志消息通知的消费者列表<br/></td></tr>
<tr>
<td>Function<CreateMessageRequest, CreateMessageResult> samplingHandler<br/></td><td>自定义消息采样处理器<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.client;

import io.modelcontextprotocol.client.McpClientFeatures.Async;
import io.modelcontextprotocol.spec.McpClientTransport;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;
import reactor.core.publisher.Mono;

public interface McpClient {
    static SyncSpec sync(McpClientTransport transport) {
        return new SyncSpec(transport);
    }

    static AsyncSpec async(McpClientTransport transport) {
        return new AsyncSpec(transport);
    }

    public static class SyncSpec {
        private final McpClientTransport transport;
        private Duration requestTimeout = Duration.ofSeconds(20L);
        private Duration initializationTimeout = Duration.ofSeconds(20L);
        private McpSchema.ClientCapabilities capabilities;
        private McpSchema.Implementation clientInfo = new McpSchema.Implementation("Java SDK MCP Client", "1.0.0");
        private final Map<String, McpSchema.Root> roots = new HashMap();
        private final List<Consumer<List<McpSchema.Tool>>> toolsChangeConsumers = new ArrayList();
        private final List<Consumer<List<McpSchema.Resource>>> resourcesChangeConsumers = new ArrayList();
        private final List<Consumer<List<McpSchema.Prompt>>> promptsChangeConsumers = new ArrayList();
        private final List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers = new ArrayList();
        private Function<McpSchema.CreateMessageRequest, McpSchema.CreateMessageResult> samplingHandler;

        private SyncSpec(McpClientTransport transport) {
            Assert.notNull(transport, "Transport must not be null");
            this.transport = transport;
        }

        public SyncSpec requestTimeout(Duration requestTimeout) {
            Assert.notNull(requestTimeout, "Request timeout must not be null");
            this.requestTimeout = requestTimeout;
            return this;
        }

        public SyncSpec initializationTimeout(Duration initializationTimeout) {
            Assert.notNull(initializationTimeout, "Initialization timeout must not be null");
            this.initializationTimeout = initializationTimeout;
            return this;
        }

        public SyncSpec capabilities(McpSchema.ClientCapabilities capabilities) {
            Assert.notNull(capabilities, "Capabilities must not be null");
            this.capabilities = capabilities;
            return this;
        }

        public SyncSpec clientInfo(McpSchema.Implementation clientInfo) {
            Assert.notNull(clientInfo, "Client info must not be null");
            this.clientInfo = clientInfo;
            return this;
        }

        public SyncSpec roots(List<McpSchema.Root> roots) {
            Assert.notNull(roots, "Roots must not be null");

            for(McpSchema.Root root : roots) {
                this.roots.put(root.uri(), root);
            }

            return this;
        }

        public SyncSpec roots(McpSchema.Root... roots) {
            Assert.notNull(roots, "Roots must not be null");

            for(McpSchema.Root root : roots) {
                this.roots.put(root.uri(), root);
            }

            return this;
        }

        public SyncSpec sampling(Function<McpSchema.CreateMessageRequest, McpSchema.CreateMessageResult> samplingHandler) {
            Assert.notNull(samplingHandler, "Sampling handler must not be null");
            this.samplingHandler = samplingHandler;
            return this;
        }

        public SyncSpec toolsChangeConsumer(Consumer<List<McpSchema.Tool>> toolsChangeConsumer) {
            Assert.notNull(toolsChangeConsumer, "Tools change consumer must not be null");
            this.toolsChangeConsumers.add(toolsChangeConsumer);
            return this;
        }

        public SyncSpec resourcesChangeConsumer(Consumer<List<McpSchema.Resource>> resourcesChangeConsumer) {
            Assert.notNull(resourcesChangeConsumer, "Resources change consumer must not be null");
            this.resourcesChangeConsumers.add(resourcesChangeConsumer);
            return this;
        }

        public SyncSpec promptsChangeConsumer(Consumer<List<McpSchema.Prompt>> promptsChangeConsumer) {
            Assert.notNull(promptsChangeConsumer, "Prompts change consumer must not be null");
            this.promptsChangeConsumers.add(promptsChangeConsumer);
            return this;
        }

        public SyncSpec loggingConsumer(Consumer<McpSchema.LoggingMessageNotification> loggingConsumer) {
            Assert.notNull(loggingConsumer, "Logging consumer must not be null");
            this.loggingConsumers.add(loggingConsumer);
            return this;
        }

        public SyncSpec loggingConsumers(List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers) {
            Assert.notNull(loggingConsumers, "Logging consumers must not be null");
            this.loggingConsumers.addAll(loggingConsumers);
            return this;
        }

        public McpSyncClient build() {
            McpClientFeatures.Sync syncFeatures = new McpClientFeatures.Sync(this.clientInfo, this.capabilities, this.roots, this.toolsChangeConsumers, this.resourcesChangeConsumers, this.promptsChangeConsumers, this.loggingConsumers, this.samplingHandler);
            McpClientFeatures.Async asyncFeatures = Async.fromSync(syncFeatures);
            return new McpSyncClient(new McpAsyncClient(this.transport, this.requestTimeout, this.initializationTimeout, asyncFeatures));
        }
    }

    public static class AsyncSpec {
        private final McpClientTransport transport;
        private Duration requestTimeout = Duration.ofSeconds(20L);
        private Duration initializationTimeout = Duration.ofSeconds(20L);
        private McpSchema.ClientCapabilities capabilities;
        private McpSchema.Implementation clientInfo = new McpSchema.Implementation("Spring AI MCP Client", "0.3.1");
        private final Map<String, McpSchema.Root> roots = new HashMap();
        private final List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumers = new ArrayList();
        private final List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumers = new ArrayList();
        private final List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumers = new ArrayList();
        private final List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers = new ArrayList();
        private Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler;

        private AsyncSpec(McpClientTransport transport) {
            Assert.notNull(transport, "Transport must not be null");
            this.transport = transport;
        }

        public AsyncSpec requestTimeout(Duration requestTimeout) {
            Assert.notNull(requestTimeout, "Request timeout must not be null");
            this.requestTimeout = requestTimeout;
            return this;
        }

        public AsyncSpec initializationTimeout(Duration initializationTimeout) {
            Assert.notNull(initializationTimeout, "Initialization timeout must not be null");
            this.initializationTimeout = initializationTimeout;
            return this;
        }

        public AsyncSpec capabilities(McpSchema.ClientCapabilities capabilities) {
            Assert.notNull(capabilities, "Capabilities must not be null");
            this.capabilities = capabilities;
            return this;
        }

        public AsyncSpec clientInfo(McpSchema.Implementation clientInfo) {
            Assert.notNull(clientInfo, "Client info must not be null");
            this.clientInfo = clientInfo;
            return this;
        }

        public AsyncSpec roots(List<McpSchema.Root> roots) {
            Assert.notNull(roots, "Roots must not be null");

            for(McpSchema.Root root : roots) {
                this.roots.put(root.uri(), root);
            }

            return this;
        }

        public AsyncSpec roots(McpSchema.Root... roots) {
            Assert.notNull(roots, "Roots must not be null");

            for(McpSchema.Root root : roots) {
                this.roots.put(root.uri(), root);
            }

            return this;
        }

        public AsyncSpec sampling(Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler) {
            Assert.notNull(samplingHandler, "Sampling handler must not be null");
            this.samplingHandler = samplingHandler;
            return this;
        }

        public AsyncSpec toolsChangeConsumer(Function<List<McpSchema.Tool>, Mono<Void>> toolsChangeConsumer) {
            Assert.notNull(toolsChangeConsumer, "Tools change consumer must not be null");
            this.toolsChangeConsumers.add(toolsChangeConsumer);
            return this;
        }

        public AsyncSpec resourcesChangeConsumer(Function<List<McpSchema.Resource>, Mono<Void>> resourcesChangeConsumer) {
            Assert.notNull(resourcesChangeConsumer, "Resources change consumer must not be null");
            this.resourcesChangeConsumers.add(resourcesChangeConsumer);
            return this;
        }

        public AsyncSpec promptsChangeConsumer(Function<List<McpSchema.Prompt>, Mono<Void>> promptsChangeConsumer) {
            Assert.notNull(promptsChangeConsumer, "Prompts change consumer must not be null");
            this.promptsChangeConsumers.add(promptsChangeConsumer);
            return this;
        }

        public AsyncSpec loggingConsumer(Function<McpSchema.LoggingMessageNotification, Mono<Void>> loggingConsumer) {
            Assert.notNull(loggingConsumer, "Logging consumer must not be null");
            this.loggingConsumers.add(loggingConsumer);
            return this;
        }

        public AsyncSpec loggingConsumers(List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers) {
            Assert.notNull(loggingConsumers, "Logging consumers must not be null");
            this.loggingConsumers.addAll(loggingConsumers);
            return this;
        }

        public McpAsyncClient build() {
            return new McpAsyncClient(this.transport, this.requestTimeout, this.initializationTimeout, new McpClientFeatures.Async(this.clientInfo, this.capabilities, this.roots, this.toolsChangeConsumers, this.resourcesChangeConsumers, this.promptsChangeConsumers, this.loggingConsumers, this.samplingHandler));
        }
    }
}
```

#### McpClientFeatures

用于定义和管理 MCP 客户端的功能和能力。它提供了两种规范：

- Sync：阻塞操作，直接返回响应
- Async：非阻塞操作，基于 Project Reactor 的 Mono 响应

对外暴露构建 Sync、Async 类，包含如下字段

<table>
<tr>
<td><br/></td><td>字段<br/></td><td>名称<br/></td></tr>
<tr>
<td rowspan="8">Sync、Async<br/><br/></td><td>ClientCapabilities capabilities<br/></td><td>客户端能力配置<br/></td></tr>
<tr>
<td>Implementation clientInfo<br/></td><td>客户端实现信息<br/></td></tr>
<tr>
<td>Map<String, Root> roots<br/></td><td>客户端可访问的资源根URI映射<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Tool>>> toolsChangeConsumers<br/></td><td>工具变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Resource>>> resourcesChangeConsumers<br/></td><td>资源变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<List<McpSchema.Prompt>>> promptsChangeConsumers<br/></td><td>提示变更通知的消费者列表<br/></td></tr>
<tr>
<td>List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers<br/></td><td>日志消息通知的消费者列表<br/></td></tr>
<tr>
<td>Function<CreateMessageRequest, CreateMessageResult> samplingHandler<br/></td><td>自定义消息采样处理器<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.client;

import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import io.modelcontextprotocol.util.Utils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.function.Function;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

class McpClientFeatures {
    static record Async(McpSchema.Implementation clientInfo, McpSchema.ClientCapabilities clientCapabilities, Map<String, McpSchema.Root> roots, List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumers, List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumers, List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumers, List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers, Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler) {
        public Async(McpSchema.Implementation clientInfo, McpSchema.ClientCapabilities clientCapabilities, Map<String, McpSchema.Root> roots, List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumers, List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumers, List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumers, List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers, Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler) {
            Assert.notNull(clientInfo, "Client info must not be null");
            this.clientInfo = clientInfo;
            this.clientCapabilities = clientCapabilities != null ? clientCapabilities : new McpSchema.ClientCapabilities((Map)null, !Utils.isEmpty(roots) ? new McpSchema.ClientCapabilities.RootCapabilities(false) : null, samplingHandler != null ? new McpSchema.ClientCapabilities.Sampling() : null);
            this.roots = roots != null ? new ConcurrentHashMap(roots) : new ConcurrentHashMap();
            this.toolsChangeConsumers = toolsChangeConsumers != null ? toolsChangeConsumers : List.of();
            this.resourcesChangeConsumers = resourcesChangeConsumers != null ? resourcesChangeConsumers : List.of();
            this.promptsChangeConsumers = promptsChangeConsumers != null ? promptsChangeConsumers : List.of();
            this.loggingConsumers = loggingConsumers != null ? loggingConsumers : List.of();
            this.samplingHandler = samplingHandler;
        }

        public static Async fromSync(Sync syncSpec) {
            List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumers = new ArrayList();

            for(Consumer<List<McpSchema.Tool>> consumer : syncSpec.toolsChangeConsumers()) {
                toolsChangeConsumers.add((Function)(t) -> Mono.fromRunnable(() -> consumer.accept(t)).subscribeOn(Schedulers.boundedElastic()));
            }

            List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumers = new ArrayList();

            for(Consumer<List<McpSchema.Resource>> consumer : syncSpec.resourcesChangeConsumers()) {
                resourcesChangeConsumers.add((Function)(r) -> Mono.fromRunnable(() -> consumer.accept(r)).subscribeOn(Schedulers.boundedElastic()));
            }

            List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumers = new ArrayList();

            for(Consumer<List<McpSchema.Prompt>> consumer : syncSpec.promptsChangeConsumers()) {
                promptsChangeConsumers.add((Function)(p) -> Mono.fromRunnable(() -> consumer.accept(p)).subscribeOn(Schedulers.boundedElastic()));
            }

            List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers = new ArrayList();

            for(Consumer<McpSchema.LoggingMessageNotification> consumer : syncSpec.loggingConsumers()) {
                loggingConsumers.add((Function)(l) -> Mono.fromRunnable(() -> consumer.accept(l)).subscribeOn(Schedulers.boundedElastic()));
            }

            Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler = (r) -> Mono.fromCallable(() -> (McpSchema.CreateMessageResult)syncSpec.samplingHandler().apply(r)).subscribeOn(Schedulers.boundedElastic());
            return new Async(syncSpec.clientInfo(), syncSpec.clientCapabilities(), syncSpec.roots(), toolsChangeConsumers, resourcesChangeConsumers, promptsChangeConsumers, loggingConsumers, samplingHandler);
        }
    }

    public static record Sync(McpSchema.Implementation clientInfo, McpSchema.ClientCapabilities clientCapabilities, Map<String, McpSchema.Root> roots, List<Consumer<List<McpSchema.Tool>>> toolsChangeConsumers, List<Consumer<List<McpSchema.Resource>>> resourcesChangeConsumers, List<Consumer<List<McpSchema.Prompt>>> promptsChangeConsumers, List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers, Function<McpSchema.CreateMessageRequest, McpSchema.CreateMessageResult> samplingHandler) {
        public Sync(McpSchema.Implementation clientInfo, McpSchema.ClientCapabilities clientCapabilities, Map<String, McpSchema.Root> roots, List<Consumer<List<McpSchema.Tool>>> toolsChangeConsumers, List<Consumer<List<McpSchema.Resource>>> resourcesChangeConsumers, List<Consumer<List<McpSchema.Prompt>>> promptsChangeConsumers, List<Consumer<McpSchema.LoggingMessageNotification>> loggingConsumers, Function<McpSchema.CreateMessageRequest, McpSchema.CreateMessageResult> samplingHandler) {
            Assert.notNull(clientInfo, "Client info must not be null");
            this.clientInfo = clientInfo;
            this.clientCapabilities = clientCapabilities != null ? clientCapabilities : new McpSchema.ClientCapabilities((Map)null, !Utils.isEmpty(roots) ? new McpSchema.ClientCapabilities.RootCapabilities(false) : null, samplingHandler != null ? new McpSchema.ClientCapabilities.Sampling() : null);
            this.roots = roots != null ? new HashMap(roots) : new HashMap();
            this.toolsChangeConsumers = toolsChangeConsumers != null ? toolsChangeConsumers : List.of();
            this.resourcesChangeConsumers = resourcesChangeConsumers != null ? resourcesChangeConsumers : List.of();
            this.promptsChangeConsumers = promptsChangeConsumers != null ? promptsChangeConsumers : List.of();
            this.loggingConsumers = loggingConsumers != null ? loggingConsumers : List.of();
            this.samplingHandler = samplingHandler;
        }
    }
}
```

#### McpSyncClient

MCP 的同步客户端实现，封装了 McpAsyncClient 以提供阻塞操作的 API。它适用于非响应式应用程序，提供了工具发现、资源管理、提示模板处理以及实时通知等功能

对外暴露方法说明

<table>
<tr>
<td>核心板块<br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td rowspan="3">生命周期管理<br/></td><td>initialize<br/></td><td>执行客户端与服务端的初始化过程，包括能力协商和信息交换<br/></td></tr>
<tr>
<td>close<br/></td><td>立即关闭客户端并释放资源<br/></td></tr>
<tr>
<td>closeGracefully<br/></td><td>优雅关闭客户端，确保未完成的操作完成<br/></td></tr>
<tr>
<td rowspan="2">工具管理<br/></td><td>callTool<br/></td><td>调用服务端提供的工具并返回执行结果<br/></td></tr>
<tr>
<td>listTools<br/></td><td>获取服务端提供的工具列表<br/></td></tr>
<tr>
<td rowspan="7">资源管理<br/></td><td>listResources<br/></td><td>获取服务端提供的资源列表<br/></td></tr>
<tr>
<td>readResource<br/></td><td>读取指定资源的内容<br/></td></tr>
<tr>
<td>listResourceTemplates<br/></td><td>获取服务端提供的资源模板列表<br/></td></tr>
<tr>
<td>subscribeResource<br/></td><td>订阅资源变更通知<br/></td></tr>
<tr>
<td>unsubscribeResource<br/></td><td>取消资源变更订阅<br/></td></tr>
<tr>
<td>addRoot<br/></td><td>动态添加资源根<br/></td></tr>
<tr>
<td>removeRoot<br/></td><td>动态移除资源根<br/></td></tr>
<tr>
<td rowspan="2">提示模板管理<br/></td><td>listPrompts<br/></td><td>获取服务端提供的提示模板列表<br/></td></tr>
<tr>
<td>getPrompt<br/></td><td>获取指定提示模板的详细信息<br/></td></tr>
<tr>
<td>日志管理<br/></td><td>setLoggingLevel<br/></td><td>设置客户端接收的最小日志级别<br/></td></tr>
<tr>
<td rowspan="2">通用功能<br/></td><td>ping<br/></td><td>发送同步Ping请求以检查连接状态<br/></td></tr>
<tr>
<td>completeCompletion<br/></td><td>发送完成请求以生成建议值<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.client;

import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class McpSyncClient implements AutoCloseable {
    private static final Logger logger = LoggerFactory.getLogger(McpSyncClient.class);
    private static final long DEFAULTCLOSETIMEOUTMS = 10000L;
    private final McpAsyncClient delegate;

    McpSyncClient(McpAsyncClient delegate) {
        Assert.notNull(delegate, "The delegate can not be null");
        this.delegate = delegate;
    }

    public McpSchema.ServerCapabilities getServerCapabilities() {
        return this.delegate.getServerCapabilities();
    }

    public String getServerInstructions() {
        return this.delegate.getServerInstructions();
    }

    public McpSchema.Implementation getServerInfo() {
        return this.delegate.getServerInfo();
    }

    public boolean isInitialized() {
        return this.delegate.isInitialized();
    }

    public McpSchema.ClientCapabilities getClientCapabilities() {
        return this.delegate.getClientCapabilities();
    }

    public McpSchema.Implementation getClientInfo() {
        return this.delegate.getClientInfo();
    }

    public void close() {
        this.delegate.close();
    }

    public boolean closeGracefully() {
        try {
            this.delegate.closeGracefully().block(Duration.ofMillis(10000L));
            return true;
        } catch (RuntimeException e) {
            logger.warn("Client didn't close within timeout of {} ms.", 10000L, e);
            return false;
        }
    }

    public McpSchema.InitializeResult initialize() {
        return (McpSchema.InitializeResult)this.delegate.initialize().block();
    }

    public void rootsListChangedNotification() {
        this.delegate.rootsListChangedNotification().block();
    }

    public void addRoot(McpSchema.Root root) {
        this.delegate.addRoot(root).block();
    }

    public void removeRoot(String rootUri) {
        this.delegate.removeRoot(rootUri).block();
    }

    public Object ping() {
        return this.delegate.ping().block();
    }

    public McpSchema.CallToolResult callTool(McpSchema.CallToolRequest callToolRequest) {
        return (McpSchema.CallToolResult)this.delegate.callTool(callToolRequest).block();
    }

    public McpSchema.ListToolsResult listTools() {
        return (McpSchema.ListToolsResult)this.delegate.listTools().block();
    }

    public McpSchema.ListToolsResult listTools(String cursor) {
        return (McpSchema.ListToolsResult)this.delegate.listTools(cursor).block();
    }

    public McpSchema.ListResourcesResult listResources(String cursor) {
        return (McpSchema.ListResourcesResult)this.delegate.listResources(cursor).block();
    }

    public McpSchema.ListResourcesResult listResources() {
        return (McpSchema.ListResourcesResult)this.delegate.listResources().block();
    }

    public McpSchema.ReadResourceResult readResource(McpSchema.Resource resource) {
        return (McpSchema.ReadResourceResult)this.delegate.readResource(resource).block();
    }

    public McpSchema.ReadResourceResult readResource(McpSchema.ReadResourceRequest readResourceRequest) {
        return (McpSchema.ReadResourceResult)this.delegate.readResource(readResourceRequest).block();
    }

    public McpSchema.ListResourceTemplatesResult listResourceTemplates(String cursor) {
        return (McpSchema.ListResourceTemplatesResult)this.delegate.listResourceTemplates(cursor).block();
    }

    public McpSchema.ListResourceTemplatesResult listResourceTemplates() {
        return (McpSchema.ListResourceTemplatesResult)this.delegate.listResourceTemplates().block();
    }

    public void subscribeResource(McpSchema.SubscribeRequest subscribeRequest) {
        this.delegate.subscribeResource(subscribeRequest).block();
    }

    public void unsubscribeResource(McpSchema.UnsubscribeRequest unsubscribeRequest) {
        this.delegate.unsubscribeResource(unsubscribeRequest).block();
    }

    public McpSchema.ListPromptsResult listPrompts(String cursor) {
        return (McpSchema.ListPromptsResult)this.delegate.listPrompts(cursor).block();
    }

    public McpSchema.ListPromptsResult listPrompts() {
        return (McpSchema.ListPromptsResult)this.delegate.listPrompts().block();
    }

    public McpSchema.GetPromptResult getPrompt(McpSchema.GetPromptRequest getPromptRequest) {
        return (McpSchema.GetPromptResult)this.delegate.getPrompt(getPromptRequest).block();
    }

    public void setLoggingLevel(McpSchema.LoggingLevel loggingLevel) {
        this.delegate.setLoggingLevel(loggingLevel).block();
    }

    public McpSchema.CompleteResult completeCompletion(McpSchema.CompleteRequest completeRequest) {
        return (McpSchema.CompleteResult)this.delegate.completeCompletion(completeRequest).block();
    }
}
```

#### McpAsyncClient

MCP 的异步客户端实现，其余同 McpSyncClient 一致

```java
package io.modelcontextprotocol.client;

import com.fasterxml.jackson.core.type.TypeReference;
import io.modelcontextprotocol.spec.McpClientSession;
import io.modelcontextprotocol.spec.McpClientTransport;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpTransport;
import io.modelcontextprotocol.util.Assert;
import io.modelcontextprotocol.util.Utils;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

public class McpAsyncClient {
    private static final Logger logger = LoggerFactory.getLogger(McpAsyncClient.class);
    private static TypeReference<Void> VOIDTYPEREFERENCE = new TypeReference<Void>() {
    };
    protected final Sinks.One<McpSchema.InitializeResult> initializedSink = Sinks.one();
    private AtomicBoolean initialized = new AtomicBoolean(false);
    private final Duration initializationTimeout;
    private final McpClientSession mcpSession;
    private final McpSchema.ClientCapabilities clientCapabilities;
    private final McpSchema.Implementation clientInfo;
    private McpSchema.ServerCapabilities serverCapabilities;
    private String serverInstructions;
    private McpSchema.Implementation serverInfo;
    private final ConcurrentHashMap<String, McpSchema.Root> roots;
    private Function<McpSchema.CreateMessageRequest, Mono<McpSchema.CreateMessageResult>> samplingHandler;
    private final McpTransport transport;
    private List<String> protocolVersions = List.of("2024-11-05");
    private static final TypeReference<McpSchema.CallToolResult> CALLTOOLRESULTTYPEREF = new TypeReference<McpSchema.CallToolResult>() {
    };
    private static final TypeReference<McpSchema.ListToolsResult> LISTTOOLSRESULTTYPEREF = new TypeReference<McpSchema.ListToolsResult>() {
    };
    private static final TypeReference<McpSchema.ListResourcesResult> LISTRESOURCESRESULTTYPEREF = new TypeReference<McpSchema.ListResourcesResult>() {
    };
    private static final TypeReference<McpSchema.ReadResourceResult> READRESOURCERESULTTYPEREF = new TypeReference<McpSchema.ReadResourceResult>() {
    };
    private static final TypeReference<McpSchema.ListResourceTemplatesResult> LISTRESOURCETEMPLATESRESULTTYPEREF = new TypeReference<McpSchema.ListResourceTemplatesResult>() {
    };
    private static final TypeReference<McpSchema.ListPromptsResult> LISTPROMPTSRESULTTYPEREF = new TypeReference<McpSchema.ListPromptsResult>() {
    };
    private static final TypeReference<McpSchema.GetPromptResult> GETPROMPTRESULTTYPEREF = new TypeReference<McpSchema.GetPromptResult>() {
    };
    private static final TypeReference<McpSchema.CompleteResult> COMPLETIONCOMPLETERESULTTYPEREF = new TypeReference<McpSchema.CompleteResult>() {
    };

    McpAsyncClient(McpClientTransport transport, Duration requestTimeout, Duration initializationTimeout, McpClientFeatures.Async features) {
        Assert.notNull(transport, "Transport must not be null");
        Assert.notNull(requestTimeout, "Request timeout must not be null");
        Assert.notNull(initializationTimeout, "Initialization timeout must not be null");
        this.clientInfo = features.clientInfo();
        this.clientCapabilities = features.clientCapabilities();
        this.transport = transport;
        this.roots = new ConcurrentHashMap(features.roots());
        this.initializationTimeout = initializationTimeout;
        Map<String, McpClientSession.RequestHandler<?>> requestHandlers = new HashMap();
        if (this.clientCapabilities.roots() != null) {
            requestHandlers.put("roots/list", this.rootsListRequestHandler());
        }

        if (this.clientCapabilities.sampling() != null) {
            if (features.samplingHandler() == null) {
                throw new McpError("Sampling handler must not be null when client capabilities include sampling");
            }

            this.samplingHandler = features.samplingHandler();
            requestHandlers.put("sampling/createMessage", this.samplingCreateMessageHandler());
        }

        Map<String, McpClientSession.NotificationHandler> notificationHandlers = new HashMap();
        List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumersFinal = new ArrayList();
        toolsChangeConsumersFinal.add((Function)(notification) -> Mono.fromRunnable(() -> logger.debug("Tools changed: {}", notification)));
        if (!Utils.isEmpty(features.toolsChangeConsumers())) {
            toolsChangeConsumersFinal.addAll(features.toolsChangeConsumers());
        }

        notificationHandlers.put("notifications/tools/listchanged", this.asyncToolsChangeNotificationHandler(toolsChangeConsumersFinal));
        List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumersFinal = new ArrayList();
        resourcesChangeConsumersFinal.add((Function)(notification) -> Mono.fromRunnable(() -> logger.debug("Resources changed: {}", notification)));
        if (!Utils.isEmpty(features.resourcesChangeConsumers())) {
            resourcesChangeConsumersFinal.addAll(features.resourcesChangeConsumers());
        }

        notificationHandlers.put("notifications/resources/listchanged", this.asyncResourcesChangeNotificationHandler(resourcesChangeConsumersFinal));
        List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumersFinal = new ArrayList();
        promptsChangeConsumersFinal.add((Function)(notification) -> Mono.fromRunnable(() -> logger.debug("Prompts changed: {}", notification)));
        if (!Utils.isEmpty(features.promptsChangeConsumers())) {
            promptsChangeConsumersFinal.addAll(features.promptsChangeConsumers());
        }

        notificationHandlers.put("notifications/prompts/listchanged", this.asyncPromptsChangeNotificationHandler(promptsChangeConsumersFinal));
        List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumersFinal = new ArrayList();
        loggingConsumersFinal.add((Function)(notification) -> Mono.fromRunnable(() -> logger.debug("Logging: {}", notification)));
        if (!Utils.isEmpty(features.loggingConsumers())) {
            loggingConsumersFinal.addAll(features.loggingConsumers());
        }

        notificationHandlers.put("notifications/message", this.asyncLoggingNotificationHandler(loggingConsumersFinal));
        this.mcpSession = new McpClientSession(requestTimeout, transport, requestHandlers, notificationHandlers);
    }

    public McpSchema.ServerCapabilities getServerCapabilities() {
        return this.serverCapabilities;
    }

    public String getServerInstructions() {
        return this.serverInstructions;
    }

    public McpSchema.Implementation getServerInfo() {
        return this.serverInfo;
    }

    public boolean isInitialized() {
        return this.initialized.get();
    }

    public McpSchema.ClientCapabilities getClientCapabilities() {
        return this.clientCapabilities;
    }

    public McpSchema.Implementation getClientInfo() {
        return this.clientInfo;
    }

    public void close() {
        this.mcpSession.close();
    }

    public Mono<Void> closeGracefully() {
        return this.mcpSession.closeGracefully();
    }

    public Mono<McpSchema.InitializeResult> initialize() {
        String latestVersion = (String)this.protocolVersions.get(this.protocolVersions.size() - 1);
        McpSchema.InitializeRequest initializeRequest = new McpSchema.InitializeRequest(latestVersion, this.clientCapabilities, this.clientInfo);
        Mono<McpSchema.InitializeResult> result = this.mcpSession.sendRequest("initialize", initializeRequest, new TypeReference<McpSchema.InitializeResult>() {
        });
        return result.flatMap((initializeResult) -> {
            this.serverCapabilities = initializeResult.capabilities();
            this.serverInstructions = initializeResult.instructions();
            this.serverInfo = initializeResult.serverInfo();
            logger.info("Server response with Protocol: {}, Capabilities: {}, Info: {} and Instructions {}", new Object[]{initializeResult.protocolVersion(), initializeResult.capabilities(), initializeResult.serverInfo(), initializeResult.instructions()});
            return !this.protocolVersions.contains(initializeResult.protocolVersion()) ? Mono.error(new McpError("Unsupported protocol version from the server: " + initializeResult.protocolVersion())) : this.mcpSession.sendNotification("notifications/initialized", (Object)null).doOnSuccess((v) -> {
                this.initialized.set(true);
                this.initializedSink.tryEmitValue(initializeResult);
            }).thenReturn(initializeResult);
        });
    }

    private <T> Mono<T> withInitializationCheck(String actionName, Function<McpSchema.InitializeResult, Mono<T>> operation) {
        return this.initializedSink.asMono().timeout(this.initializationTimeout).onErrorResume(TimeoutException.class, (ex) -> Mono.error(new McpError("Client must be initialized before " + actionName))).flatMap(operation);
    }

    public Mono<Object> ping() {
        return this.<Object>withInitializationCheck("pinging the server", (initializedResult) -> this.mcpSession.sendRequest("ping", (Object)null, new TypeReference<Object>() {
            }));
    }

    public Mono<Void> addRoot(McpSchema.Root root) {
        if (root == null) {
            return Mono.error(new McpError("Root must not be null"));
        } else if (this.clientCapabilities.roots() == null) {
            return Mono.error(new McpError("Client must be configured with roots capabilities"));
        } else if (this.roots.containsKey(root.uri())) {
            return Mono.error(new McpError("Root with uri '" + root.uri() + "' already exists"));
        } else {
            this.roots.put(root.uri(), root);
            logger.debug("Added root: {}", root);
            if (this.clientCapabilities.roots().listChanged()) {
                if (this.isInitialized()) {
                    return this.rootsListChangedNotification();
                }

                logger.warn("Client is not initialized, ignore sending a roots list changed notification");
            }

            return Mono.empty();
        }
    }

    public Mono<Void> removeRoot(String rootUri) {
        if (rootUri == null) {
            return Mono.error(new McpError("Root uri must not be null"));
        } else if (this.clientCapabilities.roots() == null) {
            return Mono.error(new McpError("Client must be configured with roots capabilities"));
        } else {
            McpSchema.Root removed = (McpSchema.Root)this.roots.remove(rootUri);
            if (removed != null) {
                logger.debug("Removed Root: {}", rootUri);
                if (this.clientCapabilities.roots().listChanged()) {
                    if (this.isInitialized()) {
                        return this.rootsListChangedNotification();
                    }

                    logger.warn("Client is not initialized, ignore sending a roots list changed notification");
                }

                return Mono.empty();
            } else {
                return Mono.error(new McpError("Root with uri '" + rootUri + "' not found"));
            }
        }
    }

    public Mono<Void> rootsListChangedNotification() {
        return this.<Void>withInitializationCheck("sending roots list changed notification", (initResult) -> this.mcpSession.sendNotification("notifications/roots/listchanged"));
    }

    private McpClientSession.RequestHandler<McpSchema.ListRootsResult> rootsListRequestHandler() {
        return (params) -> {
            McpSchema.PaginatedRequest request = (McpSchema.PaginatedRequest)this.transport.unmarshalFrom(params, new TypeReference<McpSchema.PaginatedRequest>() {
            });
            List<McpSchema.Root> roots = this.roots.values().stream().toList();
            return Mono.just(new McpSchema.ListRootsResult(roots));
        };
    }

    private McpClientSession.RequestHandler<McpSchema.CreateMessageResult> samplingCreateMessageHandler() {
        return (params) -> {
            McpSchema.CreateMessageRequest request = (McpSchema.CreateMessageRequest)this.transport.unmarshalFrom(params, new TypeReference<McpSchema.CreateMessageRequest>() {
            });
            return (Mono)this.samplingHandler.apply(request);
        };
    }

    public Mono<McpSchema.CallToolResult> callTool(McpSchema.CallToolRequest callToolRequest) {
        return this.<McpSchema.CallToolResult>withInitializationCheck("calling tools", (initializedResult) -> this.serverCapabilities.tools() == null ? Mono.error(new McpError("Server does not provide tools capability")) : this.mcpSession.sendRequest("tools/call", callToolRequest, CALLTOOLRESULTTYPEREF));
    }

    public Mono<McpSchema.ListToolsResult> listTools() {
        return this.listTools((String)null);
    }

    public Mono<McpSchema.ListToolsResult> listTools(String cursor) {
        return this.<McpSchema.ListToolsResult>withInitializationCheck("listing tools", (initializedResult) -> this.serverCapabilities.tools() == null ? Mono.error(new McpError("Server does not provide tools capability")) : this.mcpSession.sendRequest("tools/list", new McpSchema.PaginatedRequest(cursor), LISTTOOLSRESULTTYPEREF));
    }

    private McpClientSession.NotificationHandler asyncToolsChangeNotificationHandler(List<Function<List<McpSchema.Tool>, Mono<Void>>> toolsChangeConsumers) {
        return (params) -> this.listTools().flatMap((listToolsResult) -> Flux.fromIterable(toolsChangeConsumers).flatMap((consumer) -> (Publisher)consumer.apply(listToolsResult.tools())).onErrorResume((error) -> {
                    logger.error("Error handling tools list change notification", error);
                    return Mono.empty();
                }).then());
    }

    public Mono<McpSchema.ListResourcesResult> listResources() {
        return this.listResources((String)null);
    }

    public Mono<McpSchema.ListResourcesResult> listResources(String cursor) {
        return this.<McpSchema.ListResourcesResult>withInitializationCheck("listing resources", (initializedResult) -> this.serverCapabilities.resources() == null ? Mono.error(new McpError("Server does not provide the resources capability")) : this.mcpSession.sendRequest("resources/list", new McpSchema.PaginatedRequest(cursor), LISTRESOURCESRESULTTYPEREF));
    }

    public Mono<McpSchema.ReadResourceResult> readResource(McpSchema.Resource resource) {
        return this.readResource(new McpSchema.ReadResourceRequest(resource.uri()));
    }

    public Mono<McpSchema.ReadResourceResult> readResource(McpSchema.ReadResourceRequest readResourceRequest) {
        return this.<McpSchema.ReadResourceResult>withInitializationCheck("reading resources", (initializedResult) -> this.serverCapabilities.resources() == null ? Mono.error(new McpError("Server does not provide the resources capability")) : this.mcpSession.sendRequest("resources/read", readResourceRequest, READRESOURCERESULTTYPEREF));
    }

    public Mono<McpSchema.ListResourceTemplatesResult> listResourceTemplates() {
        return this.listResourceTemplates((String)null);
    }

    public Mono<McpSchema.ListResourceTemplatesResult> listResourceTemplates(String cursor) {
        return this.<McpSchema.ListResourceTemplatesResult>withInitializationCheck("listing resource templates", (initializedResult) -> this.serverCapabilities.resources() == null ? Mono.error(new McpError("Server does not provide the resources capability")) : this.mcpSession.sendRequest("resources/templates/list", new McpSchema.PaginatedRequest(cursor), LISTRESOURCETEMPLATESRESULTTYPEREF));
    }

    public Mono<Void> subscribeResource(McpSchema.SubscribeRequest subscribeRequest) {
        return this.<Void>withInitializationCheck("subscribing to resources", (initializedResult) -> this.mcpSession.sendRequest("resources/subscribe", subscribeRequest, VOIDTYPEREFERENCE));
    }

    public Mono<Void> unsubscribeResource(McpSchema.UnsubscribeRequest unsubscribeRequest) {
        return this.<Void>withInitializationCheck("unsubscribing from resources", (initializedResult) -> this.mcpSession.sendRequest("resources/unsubscribe", unsubscribeRequest, VOIDTYPEREFERENCE));
    }

    private McpClientSession.NotificationHandler asyncResourcesChangeNotificationHandler(List<Function<List<McpSchema.Resource>, Mono<Void>>> resourcesChangeConsumers) {
        return (params) -> this.listResources().flatMap((listResourcesResult) -> Flux.fromIterable(resourcesChangeConsumers).flatMap((consumer) -> (Publisher)consumer.apply(listResourcesResult.resources())).onErrorResume((error) -> {
                    logger.error("Error handling resources list change notification", error);
                    return Mono.empty();
                }).then());
    }

    public Mono<McpSchema.ListPromptsResult> listPrompts() {
        return this.listPrompts((String)null);
    }

    public Mono<McpSchema.ListPromptsResult> listPrompts(String cursor) {
        return this.<McpSchema.ListPromptsResult>withInitializationCheck("listing prompts", (initializedResult) -> this.mcpSession.sendRequest("prompts/list", new McpSchema.PaginatedRequest(cursor), LISTPROMPTSRESULTTYPEREF));
    }

    public Mono<McpSchema.GetPromptResult> getPrompt(McpSchema.GetPromptRequest getPromptRequest) {
        return this.<McpSchema.GetPromptResult>withInitializationCheck("getting prompts", (initializedResult) -> this.mcpSession.sendRequest("prompts/get", getPromptRequest, GETPROMPTRESULTTYPEREF));
    }

    private McpClientSession.NotificationHandler asyncPromptsChangeNotificationHandler(List<Function<List<McpSchema.Prompt>, Mono<Void>>> promptsChangeConsumers) {
        return (params) -> this.listPrompts().flatMap((listPromptsResult) -> Flux.fromIterable(promptsChangeConsumers).flatMap((consumer) -> (Publisher)consumer.apply(listPromptsResult.prompts())).onErrorResume((error) -> {
                    logger.error("Error handling prompts list change notification", error);
                    return Mono.empty();
                }).then());
    }

    private McpClientSession.NotificationHandler asyncLoggingNotificationHandler(List<Function<McpSchema.LoggingMessageNotification, Mono<Void>>> loggingConsumers) {
        return (params) -> {
            McpSchema.LoggingMessageNotification loggingMessageNotification = (McpSchema.LoggingMessageNotification)this.transport.unmarshalFrom(params, new TypeReference<McpSchema.LoggingMessageNotification>() {
            });
            return Flux.fromIterable(loggingConsumers).flatMap((consumer) -> (Publisher)consumer.apply(loggingMessageNotification)).then();
        };
    }

    public Mono<Void> setLoggingLevel(McpSchema.LoggingLevel loggingLevel) {
        return loggingLevel == null ? Mono.error(new McpError("Logging level must not be null")) : this.withInitializationCheck("setting logging level", (initializedResult) -> {
            McpSchema.SetLevelRequest params = new McpSchema.SetLevelRequest(loggingLevel);
            return this.mcpSession.sendRequest("logging/setLevel", params, new TypeReference<Object>() {
            }).then();
        });
    }

    void setProtocolVersions(List<String> protocolVersions) {
        this.protocolVersions = protocolVersions;
    }

    public Mono<McpSchema.CompleteResult> completeCompletion(McpSchema.CompleteRequest completeRequest) {
        return this.<McpSchema.CompleteResult>withInitializationCheck("complete completions", (initializedResult) -> this.mcpSession.sendRequest("completion/complete", completeRequest, COMPLETIONCOMPLETERESULTTYPEREF));
    }
}
```

### McpServer

用于创建 MCP 服务端的工厂类，提供了同步、异步服务端的静态方法

静态方法说明：

- sync：创建一个同步 MCP 服务器的构建器
- async：创建一个异步 MCP 服务器的构建器

内部类 SyncSpecification、AsyncSpecification 类说明

<table>
<tr>
<td><br/></td><td>字段<br/></td><td>名称<br/></td></tr>
<tr>
<td rowspan="13">SyncSpecification、AsyncSpecification<br/></td><td>McpUriTemplateManagerFactory uriTemplateManagerFactory<br/></td><td>URI模板管理器工厂<br/></td></tr>
<tr>
<td>McpServerTransportProvider transportProvider<br/></td><td>服务端传输层实现<br/></td></tr>
<tr>
<td>ObjectMapper objectMapper<br/></td><td>用于序列化和反序列化JSON消息的对象映射器<br/></td></tr>
<tr>
<td>McpSchema.Implementation serverInfo<br/></td><td>服务器实现信息<br/></td></tr>
<tr>
<td>McpSchema.ServerCapabilities serverCapabilities<br/></td><td>服务器支持的功能<br/></td></tr>
<tr>
<td>String instructions<br/></td><td>服务器的初始化说明<br/></td></tr>
<tr>
<td>List<McpServerFeatures.SyncToolSpecification> tools<br/></td><td>注册的工具列表<br/></td></tr>
<tr>
<td>Map<String, McpServerFeatures.SyncResourceSpecification> resources<br/></td><td>注册的资源映射<br/></td></tr>
<tr>
<td>List<ResourceTemplate> resourceTemplates<br/></td><td>资源模板列表<br/></td></tr>
<tr>
<td>Map<String, McpServerFeatures.SyncPromptSpecification> prompts<br/></td><td>注册的提示模板映射<br/></td></tr>
<tr>
<td>Map<McpSchema.CompleteReference, McpServerFeatures.SyncCompletionSpecification> completions<br/></td><td>注册的完成处理映射<br/></td></tr>
<tr>
<td>List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeHandlers<br/></td><td>根变更通知的处理器列表<br/></td></tr>
<tr>
<td>Duration requestTimeout<br/></td><td>请求超时时间，默认10秒<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.McpServerFeatures.Async;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.util.Assert;
import io.modelcontextprotocol.util.DeafaultMcpUriTemplateManagerFactory;
import io.modelcontextprotocol.util.McpUriTemplateManagerFactory;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import reactor.core.publisher.Mono;

public interface McpServer {
    static SyncSpecification sync(McpServerTransportProvider transportProvider) {
        return new SyncSpecification(transportProvider);
    }

    static AsyncSpecification async(McpServerTransportProvider transportProvider) {
        return new AsyncSpecification(transportProvider);
    }

    public static class AsyncSpecification {
        private static final McpSchema.Implementation DEFAULTSERVERINFO = new McpSchema.Implementation("mcp-server", "1.0.0");
        private final McpServerTransportProvider transportProvider;
        private McpUriTemplateManagerFactory uriTemplateManagerFactory = new DeafaultMcpUriTemplateManagerFactory();
        private ObjectMapper objectMapper;
        private McpSchema.Implementation serverInfo;
        private McpSchema.ServerCapabilities serverCapabilities;
        private String instructions;
        private final List<McpServerFeatures.AsyncToolSpecification> tools;
        private final Map<String, McpServerFeatures.AsyncResourceSpecification> resources;
        private final List<McpSchema.ResourceTemplate> resourceTemplates;
        private final Map<String, McpServerFeatures.AsyncPromptSpecification> prompts;
        private final Map<McpSchema.CompleteReference, McpServerFeatures.AsyncCompletionSpecification> completions;
        private final List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootsChangeHandlers;
        private Duration requestTimeout;

        private AsyncSpecification(McpServerTransportProvider transportProvider) {
            this.serverInfo = DEFAULTSERVERINFO;
            this.tools = new ArrayList();
            this.resources = new HashMap();
            this.resourceTemplates = new ArrayList();
            this.prompts = new HashMap();
            this.completions = new HashMap();
            this.rootsChangeHandlers = new ArrayList();
            this.requestTimeout = Duration.ofSeconds(10L);
            Assert.notNull(transportProvider, "Transport provider must not be null");
            this.transportProvider = transportProvider;
        }

        public AsyncSpecification uriTemplateManagerFactory(McpUriTemplateManagerFactory uriTemplateManagerFactory) {
            Assert.notNull(uriTemplateManagerFactory, "URI template manager factory must not be null");
            this.uriTemplateManagerFactory = uriTemplateManagerFactory;
            return this;
        }

        public AsyncSpecification requestTimeout(Duration requestTimeout) {
            Assert.notNull(requestTimeout, "Request timeout must not be null");
            this.requestTimeout = requestTimeout;
            return this;
        }

        public AsyncSpecification serverInfo(McpSchema.Implementation serverInfo) {
            Assert.notNull(serverInfo, "Server info must not be null");
            this.serverInfo = serverInfo;
            return this;
        }

        public AsyncSpecification serverInfo(String name, String version) {
            Assert.hasText(name, "Name must not be null or empty");
            Assert.hasText(version, "Version must not be null or empty");
            this.serverInfo = new McpSchema.Implementation(name, version);
            return this;
        }

        public AsyncSpecification instructions(String instructions) {
            this.instructions = instructions;
            return this;
        }

        public AsyncSpecification capabilities(McpSchema.ServerCapabilities serverCapabilities) {
            Assert.notNull(serverCapabilities, "Server capabilities must not be null");
            this.serverCapabilities = serverCapabilities;
            return this;
        }

        public AsyncSpecification tool(McpSchema.Tool tool, BiFunction<McpAsyncServerExchange, Map<String, Object>, Mono<McpSchema.CallToolResult>> handler) {
            Assert.notNull(tool, "Tool must not be null");
            Assert.notNull(handler, "Handler must not be null");
            this.tools.add(new McpServerFeatures.AsyncToolSpecification(tool, handler));
            return this;
        }

        public AsyncSpecification tools(List<McpServerFeatures.AsyncToolSpecification> toolSpecifications) {
            Assert.notNull(toolSpecifications, "Tool handlers list must not be null");
            this.tools.addAll(toolSpecifications);
            return this;
        }

        public AsyncSpecification tools(McpServerFeatures.AsyncToolSpecification... toolSpecifications) {
            Assert.notNull(toolSpecifications, "Tool handlers list must not be null");

            for(McpServerFeatures.AsyncToolSpecification tool : toolSpecifications) {
                this.tools.add(tool);
            }

            return this;
        }

        public AsyncSpecification resources(Map<String, McpServerFeatures.AsyncResourceSpecification> resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers map must not be null");
            this.resources.putAll(resourceSpecifications);
            return this;
        }

        public AsyncSpecification resources(List<McpServerFeatures.AsyncResourceSpecification> resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers list must not be null");

            for(McpServerFeatures.AsyncResourceSpecification resource : resourceSpecifications) {
                this.resources.put(resource.resource().uri(), resource);
            }

            return this;
        }

        public AsyncSpecification resources(McpServerFeatures.AsyncResourceSpecification... resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers list must not be null");

            for(McpServerFeatures.AsyncResourceSpecification resource : resourceSpecifications) {
                this.resources.put(resource.resource().uri(), resource);
            }

            return this;
        }

        public AsyncSpecification resourceTemplates(List<McpSchema.ResourceTemplate> resourceTemplates) {
            Assert.notNull(resourceTemplates, "Resource templates must not be null");
            this.resourceTemplates.addAll(resourceTemplates);
            return this;
        }

        public AsyncSpecification resourceTemplates(McpSchema.ResourceTemplate... resourceTemplates) {
            Assert.notNull(resourceTemplates, "Resource templates must not be null");

            for(McpSchema.ResourceTemplate resourceTemplate : resourceTemplates) {
                this.resourceTemplates.add(resourceTemplate);
            }

            return this;
        }

        public AsyncSpecification prompts(Map<String, McpServerFeatures.AsyncPromptSpecification> prompts) {
            Assert.notNull(prompts, "Prompts map must not be null");
            this.prompts.putAll(prompts);
            return this;
        }

        public AsyncSpecification prompts(List<McpServerFeatures.AsyncPromptSpecification> prompts) {
            Assert.notNull(prompts, "Prompts list must not be null");

            for(McpServerFeatures.AsyncPromptSpecification prompt : prompts) {
                this.prompts.put(prompt.prompt().name(), prompt);
            }

            return this;
        }

        public AsyncSpecification prompts(McpServerFeatures.AsyncPromptSpecification... prompts) {
            Assert.notNull(prompts, "Prompts list must not be null");

            for(McpServerFeatures.AsyncPromptSpecification prompt : prompts) {
                this.prompts.put(prompt.prompt().name(), prompt);
            }

            return this;
        }

        public AsyncSpecification completions(List<McpServerFeatures.AsyncCompletionSpecification> completions) {
            Assert.notNull(completions, "Completions list must not be null");

            for(McpServerFeatures.AsyncCompletionSpecification completion : completions) {
                this.completions.put(completion.referenceKey(), completion);
            }

            return this;
        }

        public AsyncSpecification completions(McpServerFeatures.AsyncCompletionSpecification... completions) {
            Assert.notNull(completions, "Completions list must not be null");

            for(McpServerFeatures.AsyncCompletionSpecification completion : completions) {
                this.completions.put(completion.referenceKey(), completion);
            }

            return this;
        }

        public AsyncSpecification rootsChangeHandler(BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>> handler) {
            Assert.notNull(handler, "Consumer must not be null");
            this.rootsChangeHandlers.add(handler);
            return this;
        }

        public AsyncSpecification rootsChangeHandlers(List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> handlers) {
            Assert.notNull(handlers, "Handlers list must not be null");
            this.rootsChangeHandlers.addAll(handlers);
            return this;
        }

        public AsyncSpecification rootsChangeHandlers(BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>... handlers) {
            Assert.notNull(handlers, "Handlers list must not be null");
            return this.rootsChangeHandlers(Arrays.asList(handlers));
        }

        public AsyncSpecification objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "ObjectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public McpAsyncServer build() {
            McpServerFeatures.Async features = new McpServerFeatures.Async(this.serverInfo, this.serverCapabilities, this.tools, this.resources, this.resourceTemplates, this.prompts, this.completions, this.rootsChangeHandlers, this.instructions);
            ObjectMapper mapper = this.objectMapper != null ? this.objectMapper : new ObjectMapper();
            return new McpAsyncServer(this.transportProvider, mapper, features, this.requestTimeout, this.uriTemplateManagerFactory);
        }
    }

    public static class SyncSpecification {
        private static final McpSchema.Implementation DEFAULTSERVERINFO = new McpSchema.Implementation("mcp-server", "1.0.0");
        private McpUriTemplateManagerFactory uriTemplateManagerFactory = new DeafaultMcpUriTemplateManagerFactory();
        private final McpServerTransportProvider transportProvider;
        private ObjectMapper objectMapper;
        private McpSchema.Implementation serverInfo;
        private McpSchema.ServerCapabilities serverCapabilities;
        private String instructions;
        private final List<McpServerFeatures.SyncToolSpecification> tools;
        private final Map<String, McpServerFeatures.SyncResourceSpecification> resources;
        private final List<McpSchema.ResourceTemplate> resourceTemplates;
        private final Map<String, McpServerFeatures.SyncPromptSpecification> prompts;
        private final Map<McpSchema.CompleteReference, McpServerFeatures.SyncCompletionSpecification> completions;
        private final List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeHandlers;
        private Duration requestTimeout;

        private SyncSpecification(McpServerTransportProvider transportProvider) {
            this.serverInfo = DEFAULTSERVERINFO;
            this.tools = new ArrayList();
            this.resources = new HashMap();
            this.resourceTemplates = new ArrayList();
            this.prompts = new HashMap();
            this.completions = new HashMap();
            this.rootsChangeHandlers = new ArrayList();
            this.requestTimeout = Duration.ofSeconds(10L);
            Assert.notNull(transportProvider, "Transport provider must not be null");
            this.transportProvider = transportProvider;
        }

        public SyncSpecification uriTemplateManagerFactory(McpUriTemplateManagerFactory uriTemplateManagerFactory) {
            Assert.notNull(uriTemplateManagerFactory, "URI template manager factory must not be null");
            this.uriTemplateManagerFactory = uriTemplateManagerFactory;
            return this;
        }

        public SyncSpecification requestTimeout(Duration requestTimeout) {
            Assert.notNull(requestTimeout, "Request timeout must not be null");
            this.requestTimeout = requestTimeout;
            return this;
        }

        public SyncSpecification serverInfo(McpSchema.Implementation serverInfo) {
            Assert.notNull(serverInfo, "Server info must not be null");
            this.serverInfo = serverInfo;
            return this;
        }

        public SyncSpecification serverInfo(String name, String version) {
            Assert.hasText(name, "Name must not be null or empty");
            Assert.hasText(version, "Version must not be null or empty");
            this.serverInfo = new McpSchema.Implementation(name, version);
            return this;
        }

        public SyncSpecification instructions(String instructions) {
            this.instructions = instructions;
            return this;
        }

        public SyncSpecification capabilities(McpSchema.ServerCapabilities serverCapabilities) {
            Assert.notNull(serverCapabilities, "Server capabilities must not be null");
            this.serverCapabilities = serverCapabilities;
            return this;
        }

        public SyncSpecification tool(McpSchema.Tool tool, BiFunction<McpSyncServerExchange, Map<String, Object>, McpSchema.CallToolResult> handler) {
            Assert.notNull(tool, "Tool must not be null");
            Assert.notNull(handler, "Handler must not be null");
            this.tools.add(new McpServerFeatures.SyncToolSpecification(tool, handler));
            return this;
        }

        public SyncSpecification tools(List<McpServerFeatures.SyncToolSpecification> toolSpecifications) {
            Assert.notNull(toolSpecifications, "Tool handlers list must not be null");
            this.tools.addAll(toolSpecifications);
            return this;
        }

        public SyncSpecification tools(McpServerFeatures.SyncToolSpecification... toolSpecifications) {
            Assert.notNull(toolSpecifications, "Tool handlers list must not be null");

            for(McpServerFeatures.SyncToolSpecification tool : toolSpecifications) {
                this.tools.add(tool);
            }

            return this;
        }

        public SyncSpecification resources(Map<String, McpServerFeatures.SyncResourceSpecification> resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers map must not be null");
            this.resources.putAll(resourceSpecifications);
            return this;
        }

        public SyncSpecification resources(List<McpServerFeatures.SyncResourceSpecification> resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers list must not be null");

            for(McpServerFeatures.SyncResourceSpecification resource : resourceSpecifications) {
                this.resources.put(resource.resource().uri(), resource);
            }

            return this;
        }

        public SyncSpecification resources(McpServerFeatures.SyncResourceSpecification... resourceSpecifications) {
            Assert.notNull(resourceSpecifications, "Resource handlers list must not be null");

            for(McpServerFeatures.SyncResourceSpecification resource : resourceSpecifications) {
                this.resources.put(resource.resource().uri(), resource);
            }

            return this;
        }

        public SyncSpecification resourceTemplates(List<McpSchema.ResourceTemplate> resourceTemplates) {
            Assert.notNull(resourceTemplates, "Resource templates must not be null");
            this.resourceTemplates.addAll(resourceTemplates);
            return this;
        }

        public SyncSpecification resourceTemplates(McpSchema.ResourceTemplate... resourceTemplates) {
            Assert.notNull(resourceTemplates, "Resource templates must not be null");

            for(McpSchema.ResourceTemplate resourceTemplate : resourceTemplates) {
                this.resourceTemplates.add(resourceTemplate);
            }

            return this;
        }

        public SyncSpecification prompts(Map<String, McpServerFeatures.SyncPromptSpecification> prompts) {
            Assert.notNull(prompts, "Prompts map must not be null");
            this.prompts.putAll(prompts);
            return this;
        }

        public SyncSpecification prompts(List<McpServerFeatures.SyncPromptSpecification> prompts) {
            Assert.notNull(prompts, "Prompts list must not be null");

            for(McpServerFeatures.SyncPromptSpecification prompt : prompts) {
                this.prompts.put(prompt.prompt().name(), prompt);
            }

            return this;
        }

        public SyncSpecification prompts(McpServerFeatures.SyncPromptSpecification... prompts) {
            Assert.notNull(prompts, "Prompts list must not be null");

            for(McpServerFeatures.SyncPromptSpecification prompt : prompts) {
                this.prompts.put(prompt.prompt().name(), prompt);
            }

            return this;
        }

        public SyncSpecification completions(List<McpServerFeatures.SyncCompletionSpecification> completions) {
            Assert.notNull(completions, "Completions list must not be null");

            for(McpServerFeatures.SyncCompletionSpecification completion : completions) {
                this.completions.put(completion.referenceKey(), completion);
            }

            return this;
        }

        public SyncSpecification completions(McpServerFeatures.SyncCompletionSpecification... completions) {
            Assert.notNull(completions, "Completions list must not be null");

            for(McpServerFeatures.SyncCompletionSpecification completion : completions) {
                this.completions.put(completion.referenceKey(), completion);
            }

            return this;
        }

        public SyncSpecification rootsChangeHandler(BiConsumer<McpSyncServerExchange, List<McpSchema.Root>> handler) {
            Assert.notNull(handler, "Consumer must not be null");
            this.rootsChangeHandlers.add(handler);
            return this;
        }

        public SyncSpecification rootsChangeHandlers(List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> handlers) {
            Assert.notNull(handlers, "Handlers list must not be null");
            this.rootsChangeHandlers.addAll(handlers);
            return this;
        }

        public SyncSpecification rootsChangeHandlers(BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>... handlers) {
            Assert.notNull(handlers, "Handlers list must not be null");
            return this.rootsChangeHandlers(List.of(handlers));
        }

        public SyncSpecification objectMapper(ObjectMapper objectMapper) {
            Assert.notNull(objectMapper, "ObjectMapper must not be null");
            this.objectMapper = objectMapper;
            return this;
        }

        public McpSyncServer build() {
            McpServerFeatures.Sync syncFeatures = new McpServerFeatures.Sync(this.serverInfo, this.serverCapabilities, this.tools, this.resources, this.resourceTemplates, this.prompts, this.completions, this.rootsChangeHandlers, this.instructions);
            McpServerFeatures.Async asyncFeatures = Async.fromSync(syncFeatures);
            ObjectMapper mapper = this.objectMapper != null ? this.objectMapper : new ObjectMapper();
            McpAsyncServer asyncServer = new McpAsyncServer(this.transportProvider, mapper, asyncFeatures, this.requestTimeout, this.uriTemplateManagerFactory);
            return new McpSyncServer(asyncServer);
        }
    }
}
```

#### McpServerFeatures

用于定义和管理 MCP 服务端的功能和能力。它提供了两种规范：

- Sync：阻塞操作，直接返回响应
- Async：非阻塞操作，基于 Project Reactor 的 Mono 响应

对外暴露构建 Sync、Async 类，包含如下字段

<table>
<tr>
<td><br/></td><td>字段<br/></td><td>名称<br/></td></tr>
<tr>
<td rowspan="9">Sync、Async<br/><br/></td><td>McpSchema.Implementation serverInfo<br/></td><td>服务器实现信息<br/></td></tr>
<tr>
<td>McpSchema.ServerCapabilities serverCapabilities<br/></td><td>服务器支持的功能<br/></td></tr>
<tr>
<td>String instructions<br/></td><td>服务器的初始化说明<br/></td></tr>
<tr>
<td>List<McpServerFeatures.SyncToolSpecification> tools<br/></td><td>注册的工具列表<br/></td></tr>
<tr>
<td>Map<String, McpServerFeatures.SyncResourceSpecification> resources<br/></td><td>注册的资源映射<br/></td></tr>
<tr>
<td>List<ResourceTemplate> resourceTemplates<br/></td><td>资源模板列表<br/></td></tr>
<tr>
<td>Map<String, McpServerFeatures.SyncPromptSpecification> prompts<br/></td><td>注册的提示模板映射<br/></td></tr>
<tr>
<td>Map<McpSchema.CompleteReference, McpServerFeatures.SyncCompletionSpecification> completions<br/></td><td>注册的完成处理映射<br/></td></tr>
<tr>
<td>List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeHandlers<br/></td><td>根变更通知的处理器列表<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server;

import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import io.modelcontextprotocol.util.Utils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

public class McpServerFeatures {
    static record Async(McpSchema.Implementation serverInfo, McpSchema.ServerCapabilities serverCapabilities, List<AsyncToolSpecification> tools, Map<String, AsyncResourceSpecification> resources, List<McpSchema.ResourceTemplate> resourceTemplates, Map<String, AsyncPromptSpecification> prompts, Map<McpSchema.CompleteReference, AsyncCompletionSpecification> completions, List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootsChangeConsumers, String instructions) {
        Async(McpSchema.Implementation serverInfo, McpSchema.ServerCapabilities serverCapabilities, List<AsyncToolSpecification> tools, Map<String, AsyncResourceSpecification> resources, List<McpSchema.ResourceTemplate> resourceTemplates, Map<String, AsyncPromptSpecification> prompts, Map<McpSchema.CompleteReference, AsyncCompletionSpecification> completions, List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootsChangeConsumers, String instructions) {
            Assert.notNull(serverInfo, "Server info must not be null");
            this.serverInfo = serverInfo;
            this.serverCapabilities = serverCapabilities != null ? serverCapabilities : new McpSchema.ServerCapabilities((McpSchema.ServerCapabilities.CompletionCapabilities)null, (Map)null, new McpSchema.ServerCapabilities.LoggingCapabilities(), !Utils.isEmpty(prompts) ? new McpSchema.ServerCapabilities.PromptCapabilities(false) : null, !Utils.isEmpty(resources) ? new McpSchema.ServerCapabilities.ResourceCapabilities(false, false) : null, !Utils.isEmpty(tools) ? new McpSchema.ServerCapabilities.ToolCapabilities(false) : null);
            this.tools = tools != null ? tools : List.of();
            this.resources = resources != null ? resources : Map.of();
            this.resourceTemplates = resourceTemplates != null ? resourceTemplates : List.of();
            this.prompts = prompts != null ? prompts : Map.of();
            this.completions = completions != null ? completions : Map.of();
            this.rootsChangeConsumers = rootsChangeConsumers != null ? rootsChangeConsumers : List.of();
            this.instructions = instructions;
        }

        static Async fromSync(Sync syncSpec) {
            List<AsyncToolSpecification> tools = new ArrayList();

            for(SyncToolSpecification tool : syncSpec.tools()) {
                tools.add(McpServerFeatures.AsyncToolSpecification.fromSync(tool));
            }

            Map<String, AsyncResourceSpecification> resources = new HashMap();
            syncSpec.resources().forEach((key, resource) -> resources.put(key, McpServerFeatures.AsyncResourceSpecification.fromSync(resource)));
            Map<String, AsyncPromptSpecification> prompts = new HashMap();
            syncSpec.prompts().forEach((key, prompt) -> prompts.put(key, McpServerFeatures.AsyncPromptSpecification.fromSync(prompt)));
            Map<McpSchema.CompleteReference, AsyncCompletionSpecification> completions = new HashMap();
            syncSpec.completions().forEach((key, completion) -> completions.put(key, McpServerFeatures.AsyncCompletionSpecification.fromSync(completion)));
            List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootChangeConsumers = new ArrayList();

            for(BiConsumer<McpSyncServerExchange, List<McpSchema.Root>> rootChangeConsumer : syncSpec.rootsChangeConsumers()) {
                rootChangeConsumers.add((BiFunction)(exchange, list) -> Mono.fromRunnable(() -> rootChangeConsumer.accept(new McpSyncServerExchange(exchange), list)).subscribeOn(Schedulers.boundedElastic()));
            }

            return new Async(syncSpec.serverInfo(), syncSpec.serverCapabilities(), tools, resources, syncSpec.resourceTemplates(), prompts, completions, rootChangeConsumers, syncSpec.instructions());
        }
    }

    static record Sync(McpSchema.Implementation serverInfo, McpSchema.ServerCapabilities serverCapabilities, List<SyncToolSpecification> tools, Map<String, SyncResourceSpecification> resources, List<McpSchema.ResourceTemplate> resourceTemplates, Map<String, SyncPromptSpecification> prompts, Map<McpSchema.CompleteReference, SyncCompletionSpecification> completions, List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeConsumers, String instructions) {
        Sync(McpSchema.Implementation serverInfo, McpSchema.ServerCapabilities serverCapabilities, List<SyncToolSpecification> tools, Map<String, SyncResourceSpecification> resources, List<McpSchema.ResourceTemplate> resourceTemplates, Map<String, SyncPromptSpecification> prompts, Map<McpSchema.CompleteReference, SyncCompletionSpecification> completions, List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeConsumers, String instructions) {
            Assert.notNull(serverInfo, "Server info must not be null");
            this.serverInfo = serverInfo;
            this.serverCapabilities = serverCapabilities != null ? serverCapabilities : new McpSchema.ServerCapabilities((McpSchema.ServerCapabilities.CompletionCapabilities)null, (Map)null, new McpSchema.ServerCapabilities.LoggingCapabilities(), !Utils.isEmpty(prompts) ? new McpSchema.ServerCapabilities.PromptCapabilities(false) : null, !Utils.isEmpty(resources) ? new McpSchema.ServerCapabilities.ResourceCapabilities(false, false) : null, !Utils.isEmpty(tools) ? new McpSchema.ServerCapabilities.ToolCapabilities(false) : null);
            this.tools = (List<SyncToolSpecification>)(tools != null ? tools : new ArrayList());
            this.resources = (Map<String, SyncResourceSpecification>)(resources != null ? resources : new HashMap());
            this.resourceTemplates = (List<McpSchema.ResourceTemplate>)(resourceTemplates != null ? resourceTemplates : new ArrayList());
            this.prompts = (Map<String, SyncPromptSpecification>)(prompts != null ? prompts : new HashMap());
            this.completions = (Map<McpSchema.CompleteReference, SyncCompletionSpecification>)(completions != null ? completions : new HashMap());
            this.rootsChangeConsumers = (List<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>>)(rootsChangeConsumers != null ? rootsChangeConsumers : new ArrayList());
            this.instructions = instructions;
        }
    }

    public static record AsyncToolSpecification(McpSchema.Tool tool, BiFunction<McpAsyncServerExchange, Map<String, Object>, Mono<McpSchema.CallToolResult>> call) {
        static AsyncToolSpecification fromSync(SyncToolSpecification tool) {
            return tool == null ? null : new AsyncToolSpecification(tool.tool(), (exchange, map) -> Mono.fromCallable(() -> (McpSchema.CallToolResult)tool.call().apply(new McpSyncServerExchange(exchange), map)).subscribeOn(Schedulers.boundedElastic()));
        }
    }

    public static record AsyncResourceSpecification(McpSchema.Resource resource, BiFunction<McpAsyncServerExchange, McpSchema.ReadResourceRequest, Mono<McpSchema.ReadResourceResult>> readHandler) {
        static AsyncResourceSpecification fromSync(SyncResourceSpecification resource) {
            return resource == null ? null : new AsyncResourceSpecification(resource.resource(), (exchange, req) -> Mono.fromCallable(() -> (McpSchema.ReadResourceResult)resource.readHandler().apply(new McpSyncServerExchange(exchange), req)).subscribeOn(Schedulers.boundedElastic()));
        }
    }

    public static record AsyncPromptSpecification(McpSchema.Prompt prompt, BiFunction<McpAsyncServerExchange, McpSchema.GetPromptRequest, Mono<McpSchema.GetPromptResult>> promptHandler) {
        static AsyncPromptSpecification fromSync(SyncPromptSpecification prompt) {
            return prompt == null ? null : new AsyncPromptSpecification(prompt.prompt(), (exchange, req) -> Mono.fromCallable(() -> (McpSchema.GetPromptResult)prompt.promptHandler().apply(new McpSyncServerExchange(exchange), req)).subscribeOn(Schedulers.boundedElastic()));
        }
    }

    public static record AsyncCompletionSpecification(McpSchema.CompleteReference referenceKey, BiFunction<McpAsyncServerExchange, McpSchema.CompleteRequest, Mono<McpSchema.CompleteResult>> completionHandler) {
        static AsyncCompletionSpecification fromSync(SyncCompletionSpecification completion) {
            return completion == null ? null : new AsyncCompletionSpecification(completion.referenceKey(), (exchange, request) -> Mono.fromCallable(() -> (McpSchema.CompleteResult)completion.completionHandler().apply(new McpSyncServerExchange(exchange), request)).subscribeOn(Schedulers.boundedElastic()));
        }
    }

    public static record SyncToolSpecification(McpSchema.Tool tool, BiFunction<McpSyncServerExchange, Map<String, Object>, McpSchema.CallToolResult> call) {
    }

    public static record SyncResourceSpecification(McpSchema.Resource resource, BiFunction<McpSyncServerExchange, McpSchema.ReadResourceRequest, McpSchema.ReadResourceResult> readHandler) {
    }

    public static record SyncPromptSpecification(McpSchema.Prompt prompt, BiFunction<McpSyncServerExchange, McpSchema.GetPromptRequest, McpSchema.GetPromptResult> promptHandler) {
    }

    public static record SyncCompletionSpecification(McpSchema.CompleteReference referenceKey, BiFunction<McpSyncServerExchange, McpSchema.CompleteRequest, McpSchema.CompleteResult> completionHandler) {
    }
}
```

##### McpSyncServerExchange

MCP 服务器端端同步交互实现，封装了异步交互类 McpAsyncServerExchange，提供了阻塞式的 API 以支持传统同步编程模型。它主要用于服务器与客户端之间的交互，支持客户端能力查询、消息创建、根资源管理以及日志通知等功能

<table>
<tr>
<td><br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td rowspan="2">客户端信息查询<br/></td><td>getClientCapabilities<br/></td><td>获取客户端支持的功能和特性<br/></td></tr>
<tr>
<td>getClientInfo<br/></td><td>获取客户端的实现信息<br/></td></tr>
<tr>
<td>消息创建<br/></td><td>createMessage<br/></td><td>使用客户端的采样能力创建新消息<br/></td></tr>
<tr>
<td>根资源管理<br/></td><td>listRoots<br/></td><td>获取客户端提供的所有根资源列表<br/></td></tr>
<tr>
<td>日志通知<br/></td><td>loggingNotification<br/></td><td>向所有连接的客户端发送日志消息通知<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server;

import io.modelcontextprotocol.spec.McpSchema;

public class McpSyncServerExchange {
    private final McpAsyncServerExchange exchange;

    public McpSyncServerExchange(McpAsyncServerExchange exchange) {
        this.exchange = exchange;
    }

    public McpSchema.ClientCapabilities getClientCapabilities() {
        return this.exchange.getClientCapabilities();
    }

    public McpSchema.Implementation getClientInfo() {
        return this.exchange.getClientInfo();
    }

    public McpSchema.CreateMessageResult createMessage(McpSchema.CreateMessageRequest createMessageRequest) {
        return (McpSchema.CreateMessageResult)this.exchange.createMessage(createMessageRequest).block();
    }

    public McpSchema.ListRootsResult listRoots() {
        return (McpSchema.ListRootsResult)this.exchange.listRoots().block();
    }

    public McpSchema.ListRootsResult listRoots(String cursor) {
        return (McpSchema.ListRootsResult)this.exchange.listRoots(cursor).block();
    }

    public void loggingNotification(McpSchema.LoggingMessageNotification loggingMessageNotification) {
        this.exchange.loggingNotification(loggingMessageNotification).block();
    }
}
```

##### McpAsyncServerExchange

MCP 服务器端端异步交互实现，其余同 McpSyncServerExchange 保持一致

```java
package io.modelcontextprotocol.server;

import com.fasterxml.jackson.core.type.TypeReference;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpSchema.LoggingLevel;
import io.modelcontextprotocol.util.Assert;
import reactor.core.publisher.Mono;

public class McpAsyncServerExchange {
    private final McpServerSession session;
    private final McpSchema.ClientCapabilities clientCapabilities;
    private final McpSchema.Implementation clientInfo;
    private volatile McpSchema.LoggingLevel minLoggingLevel;
    private static final TypeReference<McpSchema.CreateMessageResult> CREATEMESSAGERESULTTYPEREF = new TypeReference<McpSchema.CreateMessageResult>() {
    };
    private static final TypeReference<McpSchema.ListRootsResult> LISTROOTSRESULTTYPEREF = new TypeReference<McpSchema.ListRootsResult>() {
    };

    public McpAsyncServerExchange(McpServerSession session, McpSchema.ClientCapabilities clientCapabilities, McpSchema.Implementation clientInfo) {
        this.minLoggingLevel = LoggingLevel.INFO;
        this.session = session;
        this.clientCapabilities = clientCapabilities;
        this.clientInfo = clientInfo;
    }

    public McpSchema.ClientCapabilities getClientCapabilities() {
        return this.clientCapabilities;
    }

    public McpSchema.Implementation getClientInfo() {
        return this.clientInfo;
    }

    public Mono<McpSchema.CreateMessageResult> createMessage(McpSchema.CreateMessageRequest createMessageRequest) {
        if (this.clientCapabilities == null) {
            return Mono.error(new McpError("Client must be initialized. Call the initialize method first!"));
        } else {
            return this.clientCapabilities.sampling() == null ? Mono.error(new McpError("Client must be configured with sampling capabilities")) : this.session.sendRequest("sampling/createMessage", createMessageRequest, CREATEMESSAGERESULTTYPEREF);
        }
    }

    public Mono<McpSchema.ListRootsResult> listRoots() {
        return this.listRoots((String)null);
    }

    public Mono<McpSchema.ListRootsResult> listRoots(String cursor) {
        return this.session.sendRequest("roots/list", new McpSchema.PaginatedRequest(cursor), LISTROOTSRESULTTYPEREF);
    }

    public Mono<Void> loggingNotification(McpSchema.LoggingMessageNotification loggingMessageNotification) {
        return loggingMessageNotification == null ? Mono.error(new McpError("Logging message must not be null")) : Mono.defer(() -> this.isNotificationForLevelAllowed(loggingMessageNotification.level()) ? this.session.sendNotification("notifications/message", loggingMessageNotification) : Mono.empty());
    }

    void setMinLoggingLevel(McpSchema.LoggingLevel minLoggingLevel) {
        Assert.notNull(minLoggingLevel, "minLoggingLevel must not be null");
        this.minLoggingLevel = minLoggingLevel;
    }

    private boolean isNotificationForLevelAllowed(McpSchema.LoggingLevel loggingLevel) {
        return loggingLevel.level() >= this.minLoggingLevel.level();
    }
}
```

#### McpSyncServer

McpSyncServer 类是 MCP 服务器的同步实现，封装了 McpAsyncServer 以提供阻塞操作的 API。它适用于非响应式编程场景，简化了传统同步应用程序的集成。该类主要用于管理工具、资源、提示模板的注册与通知，同时支持客户端交互和服务器生命周期管理

对外暴露方法说明

<table>
<tr>
<td>核心板块<br/></td><td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td rowspan="3">工具管理<br/></td><td>addTool<br/></td><td>添加新的工具处理器<br/></td></tr>
<tr>
<td>removeTool<br/></td><td>移除指定名称的工具处理器<br/></td></tr>
<tr>
<td>notifyToolsListChanged<br/></td><td>通知客户端工具列表发生变化<br/></td></tr>
<tr>
<td rowspan="3">资源管理<br/></td><td>addResource<br/></td><td>添加新的资源处理器<br/></td></tr>
<tr>
<td>removeResource<br/></td><td>移除指定URI的资源处理器<br/></td></tr>
<tr>
<td>notifyResourcesListChanged<br/></td><td>通知客户端资源列表发生变化<br/></td></tr>
<tr>
<td rowspan="3">提示模板管理<br/></td><td>addPrompt<br/></td><td>添加新的提示模板处理器<br/></td></tr>
<tr>
<td>removePrompt<br/></td><td>移除指定名称的提示模板处理器<br/></td></tr>
<tr>
<td>notifyPromptsListChanged<br/></td><td>通知客户端提示模板列表发生变化<br/></td></tr>
<tr>
<td>日志管理<br/></td><td>loggingNotification<br/></td><td>向所有客户端广播日志消息（已弃用，建议使用McpSyncServerExchange的日志通知方法）<br/></td></tr>
<tr>
<td rowspan="2">生命周期管理<br/></td><td>closeGracefully<br/></td><td>优雅关闭服务器，确保未完成的操作完成<br/></td></tr>
<tr>
<td>close<br/></td><td>立即关闭服务器<br/></td></tr>
<tr>
<td rowspan="3">其他<br/></td><td>getServerCapabilities<br/></td><td>获取服务器支持的功能和特性<br/></td></tr>
<tr>
<td>getServerInfo<br/></td><td>获取服务器的实现信息<br/></td></tr>
<tr>
<td>getAsyncServer<br/></td><td>获取底层的异步服务器实例<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.server;

import io.modelcontextprotocol.server.McpServerFeatures.AsyncPromptSpecification;
import io.modelcontextprotocol.server.McpServerFeatures.AsyncResourceSpecification;
import io.modelcontextprotocol.server.McpServerFeatures.AsyncToolSpecification;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;

public class McpSyncServer {
    private final McpAsyncServer asyncServer;

    public McpSyncServer(McpAsyncServer asyncServer) {
        Assert.notNull(asyncServer, "Async server must not be null");
        this.asyncServer = asyncServer;
    }

    public void addTool(McpServerFeatures.SyncToolSpecification toolHandler) {
        this.asyncServer.addTool(AsyncToolSpecification.fromSync(toolHandler)).block();
    }

    public void removeTool(String toolName) {
        this.asyncServer.removeTool(toolName).block();
    }

    public void addResource(McpServerFeatures.SyncResourceSpecification resourceHandler) {
        this.asyncServer.addResource(AsyncResourceSpecification.fromSync(resourceHandler)).block();
    }

    public void removeResource(String resourceUri) {
        this.asyncServer.removeResource(resourceUri).block();
    }

    public void addPrompt(McpServerFeatures.SyncPromptSpecification promptSpecification) {
        this.asyncServer.addPrompt(AsyncPromptSpecification.fromSync(promptSpecification)).block();
    }

    public void removePrompt(String promptName) {
        this.asyncServer.removePrompt(promptName).block();
    }

    public void notifyToolsListChanged() {
        this.asyncServer.notifyToolsListChanged().block();
    }

    public McpSchema.ServerCapabilities getServerCapabilities() {
        return this.asyncServer.getServerCapabilities();
    }

    public McpSchema.Implementation getServerInfo() {
        return this.asyncServer.getServerInfo();
    }

    public void notifyResourcesListChanged() {
        this.asyncServer.notifyResourcesListChanged().block();
    }

    public void notifyPromptsListChanged() {
        this.asyncServer.notifyPromptsListChanged().block();
    }

    /** @deprecated */
    @Deprecated
    public void loggingNotification(McpSchema.LoggingMessageNotification loggingMessageNotification) {
        this.asyncServer.loggingNotification(loggingMessageNotification).block();
    }

    public void closeGracefully() {
        this.asyncServer.closeGracefully().block();
    }

    public void close() {
        this.asyncServer.close();
    }

    public McpAsyncServer getAsyncServer() {
        return this.asyncServer;
    }
}
```

#### McpAsyncServer

McpSyncServer 类是 MCP 服务器的异步实现，其余同 McpSyncServer 一致

```java
package io.modelcontextprotocol.server;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.LoggingLevel;
import io.modelcontextprotocol.util.DeafaultMcpUriTemplateManagerFactory;
import io.modelcontextprotocol.util.McpUriTemplateManagerFactory;
import io.modelcontextprotocol.util.Utils;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BiFunction;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class McpAsyncServer {
    private static final Logger logger = LoggerFactory.getLogger(McpAsyncServer.class);
    private final McpServerTransportProvider mcpTransportProvider;
    private final ObjectMapper objectMapper;
    private final McpSchema.ServerCapabilities serverCapabilities;
    private final McpSchema.Implementation serverInfo;
    private final String instructions;
    private final CopyOnWriteArrayList<McpServerFeatures.AsyncToolSpecification> tools = new CopyOnWriteArrayList();
    private final CopyOnWriteArrayList<McpSchema.ResourceTemplate> resourceTemplates = new CopyOnWriteArrayList();
    private final ConcurrentHashMap<String, McpServerFeatures.AsyncResourceSpecification> resources = new ConcurrentHashMap();
    private final ConcurrentHashMap<String, McpServerFeatures.AsyncPromptSpecification> prompts = new ConcurrentHashMap();
    private McpSchema.LoggingLevel minLoggingLevel;
    private final ConcurrentHashMap<McpSchema.CompleteReference, McpServerFeatures.AsyncCompletionSpecification> completions;
    private List<String> protocolVersions;
    private McpUriTemplateManagerFactory uriTemplateManagerFactory;

    McpAsyncServer(McpServerTransportProvider mcpTransportProvider, ObjectMapper objectMapper, McpServerFeatures.Async features, Duration requestTimeout, McpUriTemplateManagerFactory uriTemplateManagerFactory) {
        this.minLoggingLevel = LoggingLevel.DEBUG;
        this.completions = new ConcurrentHashMap();
        this.protocolVersions = List.of("2024-11-05");
        this.uriTemplateManagerFactory = new DeafaultMcpUriTemplateManagerFactory();
        this.mcpTransportProvider = mcpTransportProvider;
        this.objectMapper = objectMapper;
        this.serverInfo = features.serverInfo();
        this.serverCapabilities = features.serverCapabilities();
        this.instructions = features.instructions();
        this.tools.addAll(features.tools());
        this.resources.putAll(features.resources());
        this.resourceTemplates.addAll(features.resourceTemplates());
        this.prompts.putAll(features.prompts());
        this.completions.putAll(features.completions());
        this.uriTemplateManagerFactory = uriTemplateManagerFactory;
        Map<String, McpServerSession.RequestHandler<?>> requestHandlers = new HashMap();
        requestHandlers.put("ping", (McpServerSession.RequestHandler)(exchange, params) -> Mono.just(Map.of()));
        if (this.serverCapabilities.tools() != null) {
            requestHandlers.put("tools/list", this.toolsListRequestHandler());
            requestHandlers.put("tools/call", this.toolsCallRequestHandler());
        }

        if (this.serverCapabilities.resources() != null) {
            requestHandlers.put("resources/list", this.resourcesListRequestHandler());
            requestHandlers.put("resources/read", this.resourcesReadRequestHandler());
            requestHandlers.put("resources/templates/list", this.resourceTemplateListRequestHandler());
        }

        if (this.serverCapabilities.prompts() != null) {
            requestHandlers.put("prompts/list", this.promptsListRequestHandler());
            requestHandlers.put("prompts/get", this.promptsGetRequestHandler());
        }

        if (this.serverCapabilities.logging() != null) {
            requestHandlers.put("logging/setLevel", this.setLoggerRequestHandler());
        }

        if (this.serverCapabilities.completions() != null) {
            requestHandlers.put("completion/complete", this.completionCompleteRequestHandler());
        }

        Map<String, McpServerSession.NotificationHandler> notificationHandlers = new HashMap();
        notificationHandlers.put("notifications/initialized", (McpServerSession.NotificationHandler)(exchange, params) -> Mono.empty());
        List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootsChangeConsumers = features.rootsChangeConsumers();
        if (Utils.isEmpty(rootsChangeConsumers)) {
            rootsChangeConsumers = List.of((BiFunction)(exchange, roots) -> Mono.fromRunnable(() -> logger.warn("Roots list changed notification, but no consumers provided. Roots list changed: {}", roots)));
        }

        notificationHandlers.put("notifications/roots/listchanged", this.asyncRootsListChangedNotificationHandler(rootsChangeConsumers));
        mcpTransportProvider.setSessionFactory((transport) -> new McpServerSession(UUID.randomUUID().toString(), requestTimeout, transport, this::asyncInitializeRequestHandler, Mono::empty, requestHandlers, notificationHandlers));
    }

    private Mono<McpSchema.InitializeResult> asyncInitializeRequestHandler(McpSchema.InitializeRequest initializeRequest) {
        return Mono.defer(() -> {
            logger.info("Client initialize request - Protocol: {}, Capabilities: {}, Info: {}", new Object[]{initializeRequest.protocolVersion(), initializeRequest.capabilities(), initializeRequest.clientInfo()});
            String serverProtocolVersion = (String)this.protocolVersions.get(this.protocolVersions.size() - 1);
            if (this.protocolVersions.contains(initializeRequest.protocolVersion())) {
                serverProtocolVersion = initializeRequest.protocolVersion();
            } else {
                logger.warn("Client requested unsupported protocol version: {}, so the server will suggest the {} version instead", initializeRequest.protocolVersion(), serverProtocolVersion);
            }

            return Mono.just(new McpSchema.InitializeResult(serverProtocolVersion, this.serverCapabilities, this.serverInfo, this.instructions));
        });
    }

    public McpSchema.ServerCapabilities getServerCapabilities() {
        return this.serverCapabilities;
    }

    public McpSchema.Implementation getServerInfo() {
        return this.serverInfo;
    }

    public Mono<Void> closeGracefully() {
        return this.mcpTransportProvider.closeGracefully();
    }

    public void close() {
        this.mcpTransportProvider.close();
    }

    private McpServerSession.NotificationHandler asyncRootsListChangedNotificationHandler(List<BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>>> rootsChangeConsumers) {
        return (exchange, params) -> exchange.listRoots().flatMap((listRootsResult) -> Flux.fromIterable(rootsChangeConsumers).flatMap((consumer) -> (Publisher)consumer.apply(exchange, listRootsResult.roots())).onErrorResume((error) -> {
                    logger.error("Error handling roots list change notification", error);
                    return Mono.empty();
                }).then());
    }

    public Mono<Void> addTool(McpServerFeatures.AsyncToolSpecification toolSpecification) {
        if (toolSpecification == null) {
            return Mono.error(new McpError("Tool specification must not be null"));
        } else if (toolSpecification.tool() == null) {
            return Mono.error(new McpError("Tool must not be null"));
        } else if (toolSpecification.call() == null) {
            return Mono.error(new McpError("Tool call handler must not be null"));
        } else {
            return this.serverCapabilities.tools() == null ? Mono.error(new McpError("Server must be configured with tool capabilities")) : Mono.defer(() -> {
                if (this.tools.stream().anyMatch((th) -> th.tool().name().equals(toolSpecification.tool().name()))) {
                    return Mono.error(new McpError("Tool with name '" + toolSpecification.tool().name() + "' already exists"));
                } else {
                    this.tools.add(toolSpecification);
                    logger.debug("Added tool handler: {}", toolSpecification.tool().name());
                    return this.serverCapabilities.tools().listChanged() ? this.notifyToolsListChanged() : Mono.empty();
                }
            });
        }
    }

    public Mono<Void> removeTool(String toolName) {
        if (toolName == null) {
            return Mono.error(new McpError("Tool name must not be null"));
        } else {
            return this.serverCapabilities.tools() == null ? Mono.error(new McpError("Server must be configured with tool capabilities")) : Mono.defer(() -> {
                boolean removed = this.tools.removeIf((toolSpecification) -> toolSpecification.tool().name().equals(toolName));
                if (removed) {
                    logger.debug("Removed tool handler: {}", toolName);
                    return this.serverCapabilities.tools().listChanged() ? this.notifyToolsListChanged() : Mono.empty();
                } else {
                    return Mono.error(new McpError("Tool with name '" + toolName + "' not found"));
                }
            });
        }
    }

    public Mono<Void> notifyToolsListChanged() {
        return this.mcpTransportProvider.notifyClients("notifications/tools/listchanged", (Object)null);
    }

    private McpServerSession.RequestHandler<McpSchema.ListToolsResult> toolsListRequestHandler() {
        return (exchange, params) -> {
            List<McpSchema.Tool> tools = this.tools.stream().map(McpServerFeatures.AsyncToolSpecification::tool).toList();
            return Mono.just(new McpSchema.ListToolsResult(tools, (String)null));
        };
    }

    private McpServerSession.RequestHandler<McpSchema.CallToolResult> toolsCallRequestHandler() {
        return (exchange, params) -> {
            McpSchema.CallToolRequest callToolRequest = (McpSchema.CallToolRequest)this.objectMapper.convertValue(params, new TypeReference<McpSchema.CallToolRequest>() {
            });
            Optional<McpServerFeatures.AsyncToolSpecification> toolSpecification = this.tools.stream().filter((tr) -> callToolRequest.name().equals(tr.tool().name())).findAny();
            return toolSpecification.isEmpty() ? Mono.error(new McpError("Tool not found: " + callToolRequest.name())) : (Mono)toolSpecification.map((tool) -> (Mono)tool.call().apply(exchange, callToolRequest.arguments())).orElse(Mono.error(new McpError("Tool not found: " + callToolRequest.name())));
        };
    }

    public Mono<Void> addResource(McpServerFeatures.AsyncResourceSpecification resourceSpecification) {
        if (resourceSpecification != null && resourceSpecification.resource() != null) {
            return this.serverCapabilities.resources() == null ? Mono.error(new McpError("Server must be configured with resource capabilities")) : Mono.defer(() -> {
                if (this.resources.putIfAbsent(resourceSpecification.resource().uri(), resourceSpecification) != null) {
                    return Mono.error(new McpError("Resource with URI '" + resourceSpecification.resource().uri() + "' already exists"));
                } else {
                    logger.debug("Added resource handler: {}", resourceSpecification.resource().uri());
                    return this.serverCapabilities.resources().listChanged() ? this.notifyResourcesListChanged() : Mono.empty();
                }
            });
        } else {
            return Mono.error(new McpError("Resource must not be null"));
        }
    }

    public Mono<Void> removeResource(String resourceUri) {
        if (resourceUri == null) {
            return Mono.error(new McpError("Resource URI must not be null"));
        } else {
            return this.serverCapabilities.resources() == null ? Mono.error(new McpError("Server must be configured with resource capabilities")) : Mono.defer(() -> {
                McpServerFeatures.AsyncResourceSpecification removed = (McpServerFeatures.AsyncResourceSpecification)this.resources.remove(resourceUri);
                if (removed != null) {
                    logger.debug("Removed resource handler: {}", resourceUri);
                    return this.serverCapabilities.resources().listChanged() ? this.notifyResourcesListChanged() : Mono.empty();
                } else {
                    return Mono.error(new McpError("Resource with URI '" + resourceUri + "' not found"));
                }
            });
        }
    }

    public Mono<Void> notifyResourcesListChanged() {
        return this.mcpTransportProvider.notifyClients("notifications/resources/listchanged", (Object)null);
    }

    private McpServerSession.RequestHandler<McpSchema.ListResourcesResult> resourcesListRequestHandler() {
        return (exchange, params) -> {
            List<McpSchema.Resource> resourceList = this.resources.values().stream().map(McpServerFeatures.AsyncResourceSpecification::resource).toList();
            return Mono.just(new McpSchema.ListResourcesResult(resourceList, (String)null));
        };
    }

    private McpServerSession.RequestHandler<McpSchema.ListResourceTemplatesResult> resourceTemplateListRequestHandler() {
        return (exchange, params) -> Mono.just(new McpSchema.ListResourceTemplatesResult(this.getResourceTemplates(), (String)null));
    }

    private List<McpSchema.ResourceTemplate> getResourceTemplates() {
        ArrayList<McpSchema.ResourceTemplate> list = new ArrayList(this.resourceTemplates);
        List<McpSchema.ResourceTemplate> resourceTemplates = this.resources.keySet().stream().filter((uri) -> uri.contains("{")).map((uri) -> {
            McpSchema.Resource resource = ((McpServerFeatures.AsyncResourceSpecification)this.resources.get(uri)).resource();
            McpSchema.ResourceTemplate template = new McpSchema.ResourceTemplate(resource.uri(), resource.name(), resource.description(), resource.mimeType(), resource.annotations());
            return template;
        }).toList();
        list.addAll(resourceTemplates);
        return list;
    }

    private McpServerSession.RequestHandler<McpSchema.ReadResourceResult> resourcesReadRequestHandler() {
        return (exchange, params) -> {
            McpSchema.ReadResourceRequest resourceRequest = (McpSchema.ReadResourceRequest)this.objectMapper.convertValue(params, new TypeReference<McpSchema.ReadResourceRequest>() {
            });
            String resourceUri = resourceRequest.uri();
            McpServerFeatures.AsyncResourceSpecification specification = (McpServerFeatures.AsyncResourceSpecification)this.resources.values().stream().filter((resourceSpecification) -> this.uriTemplateManagerFactory.create(resourceSpecification.resource().uri()).matches(resourceUri)).findFirst().orElseThrow(() -> new McpError("Resource not found: " + resourceUri));
            return (Mono)specification.readHandler().apply(exchange, resourceRequest);
        };
    }

    public Mono<Void> addPrompt(McpServerFeatures.AsyncPromptSpecification promptSpecification) {
        if (promptSpecification == null) {
            return Mono.error(new McpError("Prompt specification must not be null"));
        } else {
            return this.serverCapabilities.prompts() == null ? Mono.error(new McpError("Server must be configured with prompt capabilities")) : Mono.defer(() -> {
                McpServerFeatures.AsyncPromptSpecification specification = (McpServerFeatures.AsyncPromptSpecification)this.prompts.putIfAbsent(promptSpecification.prompt().name(), promptSpecification);
                if (specification != null) {
                    return Mono.error(new McpError("Prompt with name '" + promptSpecification.prompt().name() + "' already exists"));
                } else {
                    logger.debug("Added prompt handler: {}", promptSpecification.prompt().name());
                    return this.serverCapabilities.prompts().listChanged() ? this.notifyPromptsListChanged() : Mono.empty();
                }
            });
        }
    }

    public Mono<Void> removePrompt(String promptName) {
        if (promptName == null) {
            return Mono.error(new McpError("Prompt name must not be null"));
        } else {
            return this.serverCapabilities.prompts() == null ? Mono.error(new McpError("Server must be configured with prompt capabilities")) : Mono.defer(() -> {
                McpServerFeatures.AsyncPromptSpecification removed = (McpServerFeatures.AsyncPromptSpecification)this.prompts.remove(promptName);
                if (removed != null) {
                    logger.debug("Removed prompt handler: {}", promptName);
                    return this.serverCapabilities.prompts().listChanged() ? this.notifyPromptsListChanged() : Mono.empty();
                } else {
                    return Mono.error(new McpError("Prompt with name '" + promptName + "' not found"));
                }
            });
        }
    }

    public Mono<Void> notifyPromptsListChanged() {
        return this.mcpTransportProvider.notifyClients("notifications/prompts/listchanged", (Object)null);
    }

    private McpServerSession.RequestHandler<McpSchema.ListPromptsResult> promptsListRequestHandler() {
        return (exchange, params) -> {
            List<McpSchema.Prompt> promptList = this.prompts.values().stream().map(McpServerFeatures.AsyncPromptSpecification::prompt).toList();
            return Mono.just(new McpSchema.ListPromptsResult(promptList, (String)null));
        };
    }

    private McpServerSession.RequestHandler<McpSchema.GetPromptResult> promptsGetRequestHandler() {
        return (exchange, params) -> {
            McpSchema.GetPromptRequest promptRequest = (McpSchema.GetPromptRequest)this.objectMapper.convertValue(params, new TypeReference<McpSchema.GetPromptRequest>() {
            });
            McpServerFeatures.AsyncPromptSpecification specification = (McpServerFeatures.AsyncPromptSpecification)this.prompts.get(promptRequest.name());
            return specification == null ? Mono.error(new McpError("Prompt not found: " + promptRequest.name())) : (Mono)specification.promptHandler().apply(exchange, promptRequest);
        };
    }

    /** @deprecated */
    @Deprecated
    public Mono<Void> loggingNotification(McpSchema.LoggingMessageNotification loggingMessageNotification) {
        if (loggingMessageNotification == null) {
            return Mono.error(new McpError("Logging message must not be null"));
        } else {
            return loggingMessageNotification.level().level() < this.minLoggingLevel.level() ? Mono.empty() : this.mcpTransportProvider.notifyClients("notifications/message", loggingMessageNotification);
        }
    }

    private McpServerSession.RequestHandler<Object> setLoggerRequestHandler() {
        return (exchange, params) -> Mono.defer(() -> {
                McpSchema.SetLevelRequest newMinLoggingLevel = (McpSchema.SetLevelRequest)this.objectMapper.convertValue(params, new TypeReference<McpSchema.SetLevelRequest>() {
                });
                exchange.setMinLoggingLevel(newMinLoggingLevel.level());
                this.minLoggingLevel = newMinLoggingLevel.level();
                return Mono.just(Map.of());
            });
    }

    private McpServerSession.RequestHandler<McpSchema.CompleteResult> completionCompleteRequestHandler() {
        return (exchange, params) -> {
            McpSchema.CompleteRequest request = this.parseCompletionParams(params);
            if (request.ref() == null) {
                return Mono.error(new McpError("ref must not be null"));
            } else if (request.ref().type() == null) {
                return Mono.error(new McpError("type must not be null"));
            } else {
                String type = request.ref().type();
                String argumentName = request.argument().name();
                if (type.equals("ref/prompt")) {
                    McpSchema.CompleteReference patt25185$temp = request.ref();
                    if (patt25185$temp instanceof McpSchema.PromptReference) {
                        McpSchema.PromptReference promptReference = (McpSchema.PromptReference)patt25185$temp;
                        McpServerFeatures.AsyncPromptSpecification promptSpec = (McpServerFeatures.AsyncPromptSpecification)this.prompts.get(promptReference.name());
                        if (promptSpec == null) {
                            return Mono.error(new McpError("Prompt not found: " + promptReference.name()));
                        }

                        if (!promptSpec.prompt().arguments().stream().filter((arg) -> arg.name().equals(argumentName)).findFirst().isPresent()) {
                            return Mono.error(new McpError("Argument not found: " + argumentName));
                        }
                    }
                }

                if (type.equals("ref/resource")) {
                    McpSchema.CompleteReference patt25760$temp = request.ref();
                    if (patt25760$temp instanceof McpSchema.ResourceReference) {
                        McpSchema.ResourceReference resourceReference = (McpSchema.ResourceReference)patt25760$temp;
                        McpServerFeatures.AsyncResourceSpecification resourceSpec = (McpServerFeatures.AsyncResourceSpecification)this.resources.get(resourceReference.uri());
                        if (resourceSpec == null) {
                            return Mono.error(new McpError("Resource not found: " + resourceReference.uri()));
                        }

                        if (!this.uriTemplateManagerFactory.create(resourceSpec.resource().uri()).getVariableNames().contains(argumentName)) {
                            return Mono.error(new McpError("Argument not found: " + argumentName));
                        }
                    }
                }

                McpServerFeatures.AsyncCompletionSpecification specification = (McpServerFeatures.AsyncCompletionSpecification)this.completions.get(request.ref());
                return specification == null ? Mono.error(new McpError("AsyncCompletionSpecification not found: " + String.valueOf(request.ref()))) : (Mono)specification.completionHandler().apply(exchange, request);
            }
        };
    }

    private McpSchema.CompleteRequest parseCompletionParams(Object object) {
        Map<String, Object> params = (Map)object;
        Map<String, Object> refMap = (Map)params.get("ref");
        Map<String, Object> argMap = (Map)params.get("argument");
        Object var10000;
        switch ((String)refMap.get("type")) {
            case "ref/prompt" -> var10000 = new McpSchema.PromptReference(refType, (String)refMap.get("name"));
            case "ref/resource" -> var10000 = new McpSchema.ResourceReference(refType, (String)refMap.get("uri"));
            default -> throw new IllegalArgumentException("Invalid ref type: " + refType);
        }

        McpSchema.CompleteReference ref = (McpSchema.CompleteReference)var10000;
        String argName = (String)argMap.get("name");
        String argValue = (String)argMap.get("value");
        McpSchema.CompleteRequest.CompleteArgument argument = new McpSchema.CompleteRequest.CompleteArgument(argName, argValue);
        return new McpSchema.CompleteRequest(ref, argument);
    }

    void setProtocolVersions(List<String> protocolVersions) {
        this.protocolVersions = protocolVersions;
    }
}
```

### McpSchema

McpSchema 类定义了 MCP（Model Context Protocol）协议的核心规范和数据结构。它基于 JSON-RPC 2.0 协议，提供了方法名称、错误代码、消息类型以及与客户端和服务器交互的请求和响应模型。该类的主要作用是：

- 协议版本管理：定义最新的协议版本和 JSON-RPC 版本
- 方法名称定义：提供所有支持的 JSON-RPC 方法名称
- 错误代码定义：定义标准的 JSON-RPC 错误代码
- 消息序列化与反序列化：支持 JSON-RPC 消息的序列化和反序列化
- 数据结构定义：提供与 MCP 交互的请求、响应和通知的具体数据结构

<table>
<tr>
<td><br/></td><td>内部类<br/></td><td>描述<br/></td></tr>
<tr>
<td rowspan="4">JSON-RPC消息类型<br/></td><td>JSONRPCMessage<br/></td><td>标识所有JSON-RPC消息的基类<br/></td></tr>
<tr>
<td>JSONRPCRequest<br/></td><td>JSON-RPC请求消息<br/></td></tr>
<tr>
<td>JSONRPCResponse<br/></td><td>JSON-RPC响应消息<br/></td></tr>
<tr>
<td>JSONRPCNotification<br/></td><td>JSON-RPC通知消息<br/></td></tr>
<tr>
<td rowspan="2">生命周期管理<br/></td><td>InitializeRequest<br/></td><td>客户端发送的初始化请求<br/></td></tr>
<tr>
<td>InitializeResult<br/></td><td>服务器返回的初始化结果<br/></td></tr>
<tr>
<td rowspan="4">工具管理<br/></td><td>Tool<br/></td><td>服务器提供的工具<br/></td></tr>
<tr>
<td>CallToolRequest<br/></td><td>调用工具的请求<br/></td></tr>
<tr>
<td>CallToolResult<br/></td><td>调用工具的响应结果<br/></td></tr>
<tr>
<td>ListToolsResult<br/></td><td>工具列表的响应结果<br/></td></tr>
<tr>
<td rowspan="9">资源管理<br/></td><td>Resource<br/></td><td>服务器提供的资源<br/></td></tr>
<tr>
<td>ResourceTemplate<br/></td><td>资源模板<br/></td></tr>
<tr>
<td>ListResourcesResult<br/></td><td>资源列表的响应结果<br/></td></tr>
<tr>
<td>ListResourceTemplatesResult<br/></td><td>资源模板列表的响应结果<br/></td></tr>
<tr>
<td>ReadResourceRequest<br/></td><td>读取资源的请求<br/></td></tr>
<tr>
<td>ReadResourceResult<br/></td><td>读取资源的响应结果<br/></td></tr>
<tr>
<td>SubscribeRequest<br/></td><td>订阅资源变更的请求<br/></td></tr>
<tr>
<td>UnsubscribeRequest<br/></td><td>取消订阅资源变更的请求<br/></td></tr>
<tr>
<td>ResourceContents<br/></td><td>资源的内容<br/></td></tr>
<tr>
<td rowspan="6">提示模板管理<br/></td><td>Prompt<br/></td><td>服务器提供的提示模板<br/></td></tr>
<tr>
<td>PromptArgument<br/></td><td>提示模板的参数<br/></td></tr>
<tr>
<td>PromptMessage<br/></td><td>提示模板返回的消息<br/></td></tr>
<tr>
<td>ListPromptsResult<br/></td><td>提示模板列表的响应结果<br/></td></tr>
<tr>
<td>GetPromptRequest<br/></td><td>获取提示模板的请求<br/></td></tr>
<tr>
<td>GetPromptResult<br/></td><td>获取提示模板的响应结果<br/></td></tr>
<tr>
<td rowspan="3">完成请求管理<br/></td><td>CompleteReference<br/></td><td>完成请求的引用<br/></td></tr>
<tr>
<td>CompleteRequest<br/></td><td>完成请求<br/></td></tr>
<tr>
<td>CompleteResult<br/></td><td>请求的响应结果<br/></td></tr>
<tr>
<td rowspan="3">日志管理<br/></td><td>LoggingMessageNotification<br/></td><td>日志消息通知<br/></td></tr>
<tr>
<td>SetLevelRequest<br/></td><td>设置日志级别的请求<br/></td></tr>
<tr>
<td>LoggingLevel<br/></td><td>日志级别的枚举<br/></td></tr>
<tr>
<td rowspan="2">根资源管理<br/></td><td>Root<br/></td><td>服务器可操作的根资源<br/></td></tr>
<tr>
<td>ListRootsResult<br/></td><td>资源列表的响应结果<br/></td></tr>
<tr>
<td rowspan="5">采样管理<br/></td><td>SamplingMessage<br/></td><td>采样消息<br/></td></tr>
<tr>
<td>CreateMessageRequest<br/></td><td>创建消息的请求<br/></td></tr>
<tr>
<td>CreateMessageResult<br/></td><td>创建消息的响应结果<br/></td></tr>
<tr>
<td>ModelPreferences<br/></td><td>模型偏好设置<br/></td></tr>
<tr>
<td>ModelHint<br/></td><td>模型提示<br/></td></tr>
<tr>
<td rowspan="2">分页管理<br/></td><td>PaginatedRequest<br/></td><td>分页请求<br/></td></tr>
<tr>
<td>PaginatedResult<br/></td><td>分页响应结果<br/></td></tr>
<tr>
<td>进度通知<br/></td><td>ProgressNotification<br/></td><td>进度通知<br/></td></tr>
<tr>
<td>通用内容类型<br/></td><td>Content<br/></td><td>消息内容的基类<br/></td></tr>
<tr>
<td>错误代码<br/></td><td>ErrorCodes<br/></td><td>标准的JSON-RPC错误代码<br/></td></tr>
</table>


```java
package io.modelcontextprotocol.spec;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.fasterxml.jackson.annotation.JsonTypeInfo.As;
import com.fasterxml.jackson.annotation.JsonTypeInfo.Id;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.util.Assert;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class McpSchema {
    private static final Logger logger = LoggerFactory.getLogger(McpSchema.class);
    public static final String LATESTPROTOCOLVERSION = "2024-11-05";
    public static final String JSONRPCVERSION = "2.0";
    public static final String METHODINITIALIZE = "initialize";
    public static final String METHODNOTIFICATIONINITIALIZED = "notifications/initialized";
    public static final String METHODPING = "ping";
    public static final String METHODTOOLSLIST = "tools/list";
    public static final String METHODTOOLSCALL = "tools/call";
    public static final String METHODNOTIFICATIONTOOLSLISTCHANGED = "notifications/tools/listchanged";
    public static final String METHODRESOURCESLIST = "resources/list";
    public static final String METHODRESOURCESREAD = "resources/read";
    public static final String METHODNOTIFICATIONRESOURCESLISTCHANGED = "notifications/resources/listchanged";
    public static final String METHODRESOURCESTEMPLATESLIST = "resources/templates/list";
    public static final String METHODRESOURCESSUBSCRIBE = "resources/subscribe";
    public static final String METHODRESOURCESUNSUBSCRIBE = "resources/unsubscribe";
    public static final String METHODPROMPTLIST = "prompts/list";
    public static final String METHODPROMPTGET = "prompts/get";
    public static final String METHODNOTIFICATIONPROMPTSLISTCHANGED = "notifications/prompts/listchanged";
    public static final String METHODCOMPLETIONCOMPLETE = "completion/complete";
    public static final String METHODLOGGINGSETLEVEL = "logging/setLevel";
    public static final String METHODNOTIFICATIONMESSAGE = "notifications/message";
    public static final String METHODROOTSLIST = "roots/list";
    public static final String METHODNOTIFICATIONROOTSLISTCHANGED = "notifications/roots/listchanged";
    public static final String METHODSAMPLINGCREATEMESSAGE = "sampling/createMessage";
    private static final ObjectMapper OBJECTMAPPER = new ObjectMapper();
    private static final TypeReference<HashMap<String, Object>> MAPTYPEREF = new TypeReference<HashMap<String, Object>>() {
    };

    private McpSchema() {
    }

    public static JSONRPCMessage deserializeJsonRpcMessage(ObjectMapper objectMapper, String jsonText) throws IOException {
        logger.debug("Received JSON message: {}", jsonText);
        HashMap<String, Object> map = (HashMap)objectMapper.readValue(jsonText, MAPTYPEREF);
        if (map.containsKey("method") && map.containsKey("id")) {
            return (JSONRPCMessage)objectMapper.convertValue(map, JSONRPCRequest.class);
        } else if (map.containsKey("method") && !map.containsKey("id")) {
            return (JSONRPCMessage)objectMapper.convertValue(map, JSONRPCNotification.class);
        } else if (!map.containsKey("result") && !map.containsKey("error")) {
            throw new IllegalArgumentException("Cannot deserialize JSONRPCMessage: " + jsonText);
        } else {
            return (JSONRPCMessage)objectMapper.convertValue(map, JSONRPCResponse.class);
        }
    }

    private static JsonSchema parseSchema(String schema) {
        try {
            return (JsonSchema)OBJECTMAPPER.readValue(schema, JsonSchema.class);
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid schema: " + schema, e);
        }
    }

    public static final class ErrorCodes {
        public static final int PARSEERROR = -32700;
        public static final int INVALIDREQUEST = -32600;
        public static final int METHODNOTFOUND = -32601;
        public static final int INVALIDPARAMS = -32602;
        public static final int INTERNALERROR = -32603;
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record JSONRPCRequest(String jsonrpc, String method, Object id, Object params) implements JSONRPCMessage {
        public JSONRPCRequest(@JsonProperty("jsonrpc") String jsonrpc, @JsonProperty("method") String method, @JsonProperty("id") Object id, @JsonProperty("params") Object params) {
            this.jsonrpc = jsonrpc;
            this.method = method;
            this.id = id;
            this.params = params;
        }

        @JsonProperty("jsonrpc")
        public String jsonrpc() {
            return this.jsonrpc;
        }

        @JsonProperty("method")
        public String method() {
            return this.method;
        }

        @JsonProperty("id")
        public Object id() {
            return this.id;
        }

        @JsonProperty("params")
        public Object params() {
            return this.params;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record JSONRPCNotification(String jsonrpc, String method, Object params) implements JSONRPCMessage {
        public JSONRPCNotification(@JsonProperty("jsonrpc") String jsonrpc, @JsonProperty("method") String method, @JsonProperty("params") Object params) {
            this.jsonrpc = jsonrpc;
            this.method = method;
            this.params = params;
        }

        @JsonProperty("jsonrpc")
        public String jsonrpc() {
            return this.jsonrpc;
        }

        @JsonProperty("method")
        public String method() {
            return this.method;
        }

        @JsonProperty("params")
        public Object params() {
            return this.params;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record JSONRPCResponse(String jsonrpc, Object id, Object result, JSONRPCError error) implements JSONRPCMessage {
        public JSONRPCResponse(@JsonProperty("jsonrpc") String jsonrpc, @JsonProperty("id") Object id, @JsonProperty("result") Object result, @JsonProperty("error") JSONRPCError error) {
            this.jsonrpc = jsonrpc;
            this.id = id;
            this.result = result;
            this.error = error;
        }

        @JsonProperty("jsonrpc")
        public String jsonrpc() {
            return this.jsonrpc;
        }

        @JsonProperty("id")
        public Object id() {
            return this.id;
        }

        @JsonProperty("result")
        public Object result() {
            return this.result;
        }

        @JsonProperty("error")
        public JSONRPCError error() {
            return this.error;
        }

        @JsonInclude(Include.NONABSENT)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record JSONRPCError(int code, String message, Object data) {
            public JSONRPCError(@JsonProperty("code") int code, @JsonProperty("message") String message, @JsonProperty("data") Object data) {
                this.code = code;
                this.message = message;
                this.data = data;
            }

            @JsonProperty("code")
            public int code() {
                return this.code;
            }

            @JsonProperty("message")
            public String message() {
                return this.message;
            }

            @JsonProperty("data")
            public Object data() {
                return this.data;
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record InitializeRequest(String protocolVersion, ClientCapabilities capabilities, Implementation clientInfo) implements Request {
        public InitializeRequest(@JsonProperty("protocolVersion") String protocolVersion, @JsonProperty("capabilities") ClientCapabilities capabilities, @JsonProperty("clientInfo") Implementation clientInfo) {
            this.protocolVersion = protocolVersion;
            this.capabilities = capabilities;
            this.clientInfo = clientInfo;
        }

        @JsonProperty("protocolVersion")
        public String protocolVersion() {
            return this.protocolVersion;
        }

        @JsonProperty("capabilities")
        public ClientCapabilities capabilities() {
            return this.capabilities;
        }

        @JsonProperty("clientInfo")
        public Implementation clientInfo() {
            return this.clientInfo;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record InitializeResult(String protocolVersion, ServerCapabilities capabilities, Implementation serverInfo, String instructions) {
        public InitializeResult(@JsonProperty("protocolVersion") String protocolVersion, @JsonProperty("capabilities") ServerCapabilities capabilities, @JsonProperty("serverInfo") Implementation serverInfo, @JsonProperty("instructions") String instructions) {
            this.protocolVersion = protocolVersion;
            this.capabilities = capabilities;
            this.serverInfo = serverInfo;
            this.instructions = instructions;
        }

        @JsonProperty("protocolVersion")
        public String protocolVersion() {
            return this.protocolVersion;
        }

        @JsonProperty("capabilities")
        public ServerCapabilities capabilities() {
            return this.capabilities;
        }

        @JsonProperty("serverInfo")
        public Implementation serverInfo() {
            return this.serverInfo;
        }

        @JsonProperty("instructions")
        public String instructions() {
            return this.instructions;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ClientCapabilities(Map<String, Object> experimental, RootCapabilities roots, Sampling sampling) {
        public ClientCapabilities(@JsonProperty("experimental") Map<String, Object> experimental, @JsonProperty("roots") RootCapabilities roots, @JsonProperty("sampling") Sampling sampling) {
            this.experimental = experimental;
            this.roots = roots;
            this.sampling = sampling;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("experimental")
        public Map<String, Object> experimental() {
            return this.experimental;
        }

        @JsonProperty("roots")
        public RootCapabilities roots() {
            return this.roots;
        }

        @JsonProperty("sampling")
        public Sampling sampling() {
            return this.sampling;
        }

        @JsonInclude(Include.NONABSENT)
        @JsonIgnoreProperties(
            ignoreUnknown = true
        )
        public static record RootCapabilities(Boolean listChanged) {
            public RootCapabilities(@JsonProperty("listChanged") Boolean listChanged) {
                this.listChanged = listChanged;
            }

            @JsonProperty("listChanged")
            public Boolean listChanged() {
                return this.listChanged;
            }
        }

        @JsonInclude(Include.NONABSENT)
        public static record Sampling() {
        }

        public static class Builder {
            private Map<String, Object> experimental;
            private RootCapabilities roots;
            private Sampling sampling;

            public Builder experimental(Map<String, Object> experimental) {
                this.experimental = experimental;
                return this;
            }

            public Builder roots(Boolean listChanged) {
                this.roots = new RootCapabilities(listChanged);
                return this;
            }

            public Builder sampling() {
                this.sampling = new Sampling();
                return this;
            }

            public ClientCapabilities build() {
                return new ClientCapabilities(this.experimental, this.roots, this.sampling);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ServerCapabilities(CompletionCapabilities completions, Map<String, Object> experimental, LoggingCapabilities logging, PromptCapabilities prompts, ResourceCapabilities resources, ToolCapabilities tools) {
        public ServerCapabilities(@JsonProperty("completions") CompletionCapabilities completions, @JsonProperty("experimental") Map<String, Object> experimental, @JsonProperty("logging") LoggingCapabilities logging, @JsonProperty("prompts") PromptCapabilities prompts, @JsonProperty("resources") ResourceCapabilities resources, @JsonProperty("tools") ToolCapabilities tools) {
            this.completions = completions;
            this.experimental = experimental;
            this.logging = logging;
            this.prompts = prompts;
            this.resources = resources;
            this.tools = tools;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("completions")
        public CompletionCapabilities completions() {
            return this.completions;
        }

        @JsonProperty("experimental")
        public Map<String, Object> experimental() {
            return this.experimental;
        }

        @JsonProperty("logging")
        public LoggingCapabilities logging() {
            return this.logging;
        }

        @JsonProperty("prompts")
        public PromptCapabilities prompts() {
            return this.prompts;
        }

        @JsonProperty("resources")
        public ResourceCapabilities resources() {
            return this.resources;
        }

        @JsonProperty("tools")
        public ToolCapabilities tools() {
            return this.tools;
        }

        @JsonInclude(Include.NONABSENT)
        public static record CompletionCapabilities() {
        }

        @JsonInclude(Include.NONABSENT)
        public static record LoggingCapabilities() {
        }

        @JsonInclude(Include.NONABSENT)
        public static record PromptCapabilities(Boolean listChanged) {
            public PromptCapabilities(@JsonProperty("listChanged") Boolean listChanged) {
                this.listChanged = listChanged;
            }

            @JsonProperty("listChanged")
            public Boolean listChanged() {
                return this.listChanged;
            }
        }

        @JsonInclude(Include.NONABSENT)
        public static record ResourceCapabilities(Boolean subscribe, Boolean listChanged) {
            public ResourceCapabilities(@JsonProperty("subscribe") Boolean subscribe, @JsonProperty("listChanged") Boolean listChanged) {
                this.subscribe = subscribe;
                this.listChanged = listChanged;
            }

            @JsonProperty("subscribe")
            public Boolean subscribe() {
                return this.subscribe;
            }

            @JsonProperty("listChanged")
            public Boolean listChanged() {
                return this.listChanged;
            }
        }

        @JsonInclude(Include.NONABSENT)
        public static record ToolCapabilities(Boolean listChanged) {
            public ToolCapabilities(@JsonProperty("listChanged") Boolean listChanged) {
                this.listChanged = listChanged;
            }

            @JsonProperty("listChanged")
            public Boolean listChanged() {
                return this.listChanged;
            }
        }

        public static class Builder {
            private CompletionCapabilities completions;
            private Map<String, Object> experimental;
            private LoggingCapabilities logging = new LoggingCapabilities();
            private PromptCapabilities prompts;
            private ResourceCapabilities resources;
            private ToolCapabilities tools;

            public Builder completions() {
                this.completions = new CompletionCapabilities();
                return this;
            }

            public Builder experimental(Map<String, Object> experimental) {
                this.experimental = experimental;
                return this;
            }

            public Builder logging() {
                this.logging = new LoggingCapabilities();
                return this;
            }

            public Builder prompts(Boolean listChanged) {
                this.prompts = new PromptCapabilities(listChanged);
                return this;
            }

            public Builder resources(Boolean subscribe, Boolean listChanged) {
                this.resources = new ResourceCapabilities(subscribe, listChanged);
                return this;
            }

            public Builder tools(Boolean listChanged) {
                this.tools = new ToolCapabilities(listChanged);
                return this;
            }

            public ServerCapabilities build() {
                return new ServerCapabilities(this.completions, this.experimental, this.logging, this.prompts, this.resources, this.tools);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Implementation(String name, String version) {
        public Implementation(@JsonProperty("name") String name, @JsonProperty("version") String version) {
            this.name = name;
            this.version = version;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("version")
        public String version() {
            return this.version;
        }
    }

    public static enum Role {
        @JsonProperty("user")
        USER,
        @JsonProperty("assistant")
        ASSISTANT;
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Annotations(List<Role> audience, Double priority) {
        public Annotations(@JsonProperty("audience") List<Role> audience, @JsonProperty("priority") Double priority) {
            this.audience = audience;
            this.priority = priority;
        }

        @JsonProperty("audience")
        public List<Role> audience() {
            return this.audience;
        }

        @JsonProperty("priority")
        public Double priority() {
            return this.priority;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Resource(String uri, String name, String description, String mimeType, Annotations annotations) implements Annotated {
        public Resource(@JsonProperty("uri") String uri, @JsonProperty("name") String name, @JsonProperty("description") String description, @JsonProperty("mimeType") String mimeType, @JsonProperty("annotations") Annotations annotations) {
            this.uri = uri;
            this.name = name;
            this.description = description;
            this.mimeType = mimeType;
            this.annotations = annotations;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("mimeType")
        public String mimeType() {
            return this.mimeType;
        }

        @JsonProperty("annotations")
        public Annotations annotations() {
            return this.annotations;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ResourceTemplate(String uriTemplate, String name, String description, String mimeType, Annotations annotations) implements Annotated {
        public ResourceTemplate(@JsonProperty("uriTemplate") String uriTemplate, @JsonProperty("name") String name, @JsonProperty("description") String description, @JsonProperty("mimeType") String mimeType, @JsonProperty("annotations") Annotations annotations) {
            this.uriTemplate = uriTemplate;
            this.name = name;
            this.description = description;
            this.mimeType = mimeType;
            this.annotations = annotations;
        }

        @JsonProperty("uriTemplate")
        public String uriTemplate() {
            return this.uriTemplate;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("mimeType")
        public String mimeType() {
            return this.mimeType;
        }

        @JsonProperty("annotations")
        public Annotations annotations() {
            return this.annotations;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ListResourcesResult(List<Resource> resources, String nextCursor) {
        public ListResourcesResult(@JsonProperty("resources") List<Resource> resources, @JsonProperty("nextCursor") String nextCursor) {
            this.resources = resources;
            this.nextCursor = nextCursor;
        }

        @JsonProperty("resources")
        public List<Resource> resources() {
            return this.resources;
        }

        @JsonProperty("nextCursor")
        public String nextCursor() {
            return this.nextCursor;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ListResourceTemplatesResult(List<ResourceTemplate> resourceTemplates, String nextCursor) {
        public ListResourceTemplatesResult(@JsonProperty("resourceTemplates") List<ResourceTemplate> resourceTemplates, @JsonProperty("nextCursor") String nextCursor) {
            this.resourceTemplates = resourceTemplates;
            this.nextCursor = nextCursor;
        }

        @JsonProperty("resourceTemplates")
        public List<ResourceTemplate> resourceTemplates() {
            return this.resourceTemplates;
        }

        @JsonProperty("nextCursor")
        public String nextCursor() {
            return this.nextCursor;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ReadResourceRequest(String uri) {
        public ReadResourceRequest(@JsonProperty("uri") String uri) {
            this.uri = uri;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ReadResourceResult(List<ResourceContents> contents) {
        public ReadResourceResult(@JsonProperty("contents") List<ResourceContents> contents) {
            this.contents = contents;
        }

        @JsonProperty("contents")
        public List<ResourceContents> contents() {
            return this.contents;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record SubscribeRequest(String uri) {
        public SubscribeRequest(@JsonProperty("uri") String uri) {
            this.uri = uri;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record UnsubscribeRequest(String uri) {
        public UnsubscribeRequest(@JsonProperty("uri") String uri) {
            this.uri = uri;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record TextResourceContents(String uri, String mimeType, String text) implements ResourceContents {
        public TextResourceContents(@JsonProperty("uri") String uri, @JsonProperty("mimeType") String mimeType, @JsonProperty("text") String text) {
            this.uri = uri;
            this.mimeType = mimeType;
            this.text = text;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }

        @JsonProperty("mimeType")
        public String mimeType() {
            return this.mimeType;
        }

        @JsonProperty("text")
        public String text() {
            return this.text;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record BlobResourceContents(String uri, String mimeType, String blob) implements ResourceContents {
        public BlobResourceContents(@JsonProperty("uri") String uri, @JsonProperty("mimeType") String mimeType, @JsonProperty("blob") String blob) {
            this.uri = uri;
            this.mimeType = mimeType;
            this.blob = blob;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }

        @JsonProperty("mimeType")
        public String mimeType() {
            return this.mimeType;
        }

        @JsonProperty("blob")
        public String blob() {
            return this.blob;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Prompt(String name, String description, List<PromptArgument> arguments) {
        public Prompt(@JsonProperty("name") String name, @JsonProperty("description") String description, @JsonProperty("arguments") List<PromptArgument> arguments) {
            this.name = name;
            this.description = description;
            this.arguments = arguments;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("arguments")
        public List<PromptArgument> arguments() {
            return this.arguments;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record PromptArgument(String name, String description, Boolean required) {
        public PromptArgument(@JsonProperty("name") String name, @JsonProperty("description") String description, @JsonProperty("required") Boolean required) {
            this.name = name;
            this.description = description;
            this.required = required;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("required")
        public Boolean required() {
            return this.required;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record PromptMessage(Role role, Content content) {
        public PromptMessage(@JsonProperty("role") Role role, @JsonProperty("content") Content content) {
            this.role = role;
            this.content = content;
        }

        @JsonProperty("role")
        public Role role() {
            return this.role;
        }

        @JsonProperty("content")
        public Content content() {
            return this.content;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ListPromptsResult(List<Prompt> prompts, String nextCursor) {
        public ListPromptsResult(@JsonProperty("prompts") List<Prompt> prompts, @JsonProperty("nextCursor") String nextCursor) {
            this.prompts = prompts;
            this.nextCursor = nextCursor;
        }

        @JsonProperty("prompts")
        public List<Prompt> prompts() {
            return this.prompts;
        }

        @JsonProperty("nextCursor")
        public String nextCursor() {
            return this.nextCursor;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record GetPromptRequest(String name, Map<String, Object> arguments) implements Request {
        public GetPromptRequest(@JsonProperty("name") String name, @JsonProperty("arguments") Map<String, Object> arguments) {
            this.name = name;
            this.arguments = arguments;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("arguments")
        public Map<String, Object> arguments() {
            return this.arguments;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record GetPromptResult(String description, List<PromptMessage> messages) {
        public GetPromptResult(@JsonProperty("description") String description, @JsonProperty("messages") List<PromptMessage> messages) {
            this.description = description;
            this.messages = messages;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("messages")
        public List<PromptMessage> messages() {
            return this.messages;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ListToolsResult(List<Tool> tools, String nextCursor) {
        public ListToolsResult(@JsonProperty("tools") List<Tool> tools, @JsonProperty("nextCursor") String nextCursor) {
            this.tools = tools;
            this.nextCursor = nextCursor;
        }

        @JsonProperty("tools")
        public List<Tool> tools() {
            return this.tools;
        }

        @JsonProperty("nextCursor")
        public String nextCursor() {
            return this.nextCursor;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record JsonSchema(String type, Map<String, Object> properties, List<String> required, Boolean additionalProperties, Map<String, Object> defs, Map<String, Object> definitions) {
        public JsonSchema(@JsonProperty("type") String type, @JsonProperty("properties") Map<String, Object> properties, @JsonProperty("required") List<String> required, @JsonProperty("additionalProperties") Boolean additionalProperties, @JsonProperty("$defs") Map<String, Object> defs, @JsonProperty("definitions") Map<String, Object> definitions) {
            this.type = type;
            this.properties = properties;
            this.required = required;
            this.additionalProperties = additionalProperties;
            this.defs = defs;
            this.definitions = definitions;
        }

        @JsonProperty("type")
        public String type() {
            return this.type;
        }

        @JsonProperty("properties")
        public Map<String, Object> properties() {
            return this.properties;
        }

        @JsonProperty("required")
        public List<String> required() {
            return this.required;
        }

        @JsonProperty("additionalProperties")
        public Boolean additionalProperties() {
            return this.additionalProperties;
        }

        @JsonProperty("$defs")
        public Map<String, Object> defs() {
            return this.defs;
        }

        @JsonProperty("definitions")
        public Map<String, Object> definitions() {
            return this.definitions;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Tool(String name, String description, JsonSchema inputSchema) {
        public Tool(String name, String description, String schema) {
            this(name, description, McpSchema.parseSchema(schema));
        }

        public Tool(@JsonProperty("name") String name, @JsonProperty("description") String description, @JsonProperty("inputSchema") JsonSchema inputSchema) {
            this.name = name;
            this.description = description;
            this.inputSchema = inputSchema;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("description")
        public String description() {
            return this.description;
        }

        @JsonProperty("inputSchema")
        public JsonSchema inputSchema() {
            return this.inputSchema;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CallToolRequest(String name, Map<String, Object> arguments) implements Request {
        public CallToolRequest(String name, String jsonArguments) {
            this(name, parseJsonArguments(jsonArguments));
        }

        public CallToolRequest(@JsonProperty("name") String name, @JsonProperty("arguments") Map<String, Object> arguments) {
            this.name = name;
            this.arguments = arguments;
        }

        private static Map<String, Object> parseJsonArguments(String jsonArguments) {
            try {
                return (Map)McpSchema.OBJECTMAPPER.readValue(jsonArguments, McpSchema.MAPTYPEREF);
            } catch (IOException e) {
                throw new IllegalArgumentException("Invalid arguments: " + jsonArguments, e);
            }
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }

        @JsonProperty("arguments")
        public Map<String, Object> arguments() {
            return this.arguments;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CallToolResult(List<Content> content, Boolean isError) {
        public CallToolResult(String content, Boolean isError) {
            this(List.of(new TextContent(content)), isError);
        }

        public CallToolResult(@JsonProperty("content") List<Content> content, @JsonProperty("isError") Boolean isError) {
            this.content = content;
            this.isError = isError;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("content")
        public List<Content> content() {
            return this.content;
        }

        @JsonProperty("isError")
        public Boolean isError() {
            return this.isError;
        }

        public static class Builder {
            private List<Content> content = new ArrayList();
            private Boolean isError;

            public Builder content(List<Content> content) {
                Assert.notNull(content, "content must not be null");
                this.content = content;
                return this;
            }

            public Builder textContent(List<String> textContent) {
                Assert.notNull(textContent, "textContent must not be null");
                Stream var10000 = textContent.stream().map(TextContent::new);
                List var10001 = this.content;
                Objects.requireNonNull(var10001);
                var10000.forEach(var10001::add);
                return this;
            }

            public Builder addContent(Content contentItem) {
                Assert.notNull(contentItem, "contentItem must not be null");
                if (this.content == null) {
                    this.content = new ArrayList();
                }

                this.content.add(contentItem);
                return this;
            }

            public Builder addTextContent(String text) {
                Assert.notNull(text, "text must not be null");
                return this.addContent(new TextContent(text));
            }

            public Builder isError(Boolean isError) {
                Assert.notNull(isError, "isError must not be null");
                this.isError = isError;
                return this;
            }

            public CallToolResult build() {
                return new CallToolResult(this.content, this.isError);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ModelPreferences(List<ModelHint> hints, Double costPriority, Double speedPriority, Double intelligencePriority) {
        public ModelPreferences(@JsonProperty("hints") List<ModelHint> hints, @JsonProperty("costPriority") Double costPriority, @JsonProperty("speedPriority") Double speedPriority, @JsonProperty("intelligencePriority") Double intelligencePriority) {
            this.hints = hints;
            this.costPriority = costPriority;
            this.speedPriority = speedPriority;
            this.intelligencePriority = intelligencePriority;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("hints")
        public List<ModelHint> hints() {
            return this.hints;
        }

        @JsonProperty("costPriority")
        public Double costPriority() {
            return this.costPriority;
        }

        @JsonProperty("speedPriority")
        public Double speedPriority() {
            return this.speedPriority;
        }

        @JsonProperty("intelligencePriority")
        public Double intelligencePriority() {
            return this.intelligencePriority;
        }

        public static class Builder {
            private List<ModelHint> hints;
            private Double costPriority;
            private Double speedPriority;
            private Double intelligencePriority;

            public Builder hints(List<ModelHint> hints) {
                this.hints = hints;
                return this;
            }

            public Builder addHint(String name) {
                if (this.hints == null) {
                    this.hints = new ArrayList();
                }

                this.hints.add(new ModelHint(name));
                return this;
            }

            public Builder costPriority(Double costPriority) {
                this.costPriority = costPriority;
                return this;
            }

            public Builder speedPriority(Double speedPriority) {
                this.speedPriority = speedPriority;
                return this;
            }

            public Builder intelligencePriority(Double intelligencePriority) {
                this.intelligencePriority = intelligencePriority;
                return this;
            }

            public ModelPreferences build() {
                return new ModelPreferences(this.hints, this.costPriority, this.speedPriority, this.intelligencePriority);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ModelHint(String name) {
        public ModelHint(@JsonProperty("name") String name) {
            this.name = name;
        }

        public static ModelHint of(String name) {
            return new ModelHint(name);
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record SamplingMessage(Role role, Content content) {
        public SamplingMessage(@JsonProperty("role") Role role, @JsonProperty("content") Content content) {
            this.role = role;
            this.content = content;
        }

        @JsonProperty("role")
        public Role role() {
            return this.role;
        }

        @JsonProperty("content")
        public Content content() {
            return this.content;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CreateMessageRequest(List<SamplingMessage> messages, ModelPreferences modelPreferences, String systemPrompt, ContextInclusionStrategy includeContext, Double temperature, int maxTokens, List<String> stopSequences, Map<String, Object> metadata) implements Request {
        public CreateMessageRequest(@JsonProperty("messages") List<SamplingMessage> messages, @JsonProperty("modelPreferences") ModelPreferences modelPreferences, @JsonProperty("systemPrompt") String systemPrompt, @JsonProperty("includeContext") ContextInclusionStrategy includeContext, @JsonProperty("temperature") Double temperature, @JsonProperty("maxTokens") int maxTokens, @JsonProperty("stopSequences") List<String> stopSequences, @JsonProperty("metadata") Map<String, Object> metadata) {
            this.messages = messages;
            this.modelPreferences = modelPreferences;
            this.systemPrompt = systemPrompt;
            this.includeContext = includeContext;
            this.temperature = temperature;
            this.maxTokens = maxTokens;
            this.stopSequences = stopSequences;
            this.metadata = metadata;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("messages")
        public List<SamplingMessage> messages() {
            return this.messages;
        }

        @JsonProperty("modelPreferences")
        public ModelPreferences modelPreferences() {
            return this.modelPreferences;
        }

        @JsonProperty("systemPrompt")
        public String systemPrompt() {
            return this.systemPrompt;
        }

        @JsonProperty("includeContext")
        public ContextInclusionStrategy includeContext() {
            return this.includeContext;
        }

        @JsonProperty("temperature")
        public Double temperature() {
            return this.temperature;
        }

        @JsonProperty("maxTokens")
        public int maxTokens() {
            return this.maxTokens;
        }

        @JsonProperty("stopSequences")
        public List<String> stopSequences() {
            return this.stopSequences;
        }

        @JsonProperty("metadata")
        public Map<String, Object> metadata() {
            return this.metadata;
        }

        public static enum ContextInclusionStrategy {
            @JsonProperty("none")
            NONE,
            @JsonProperty("thisServer")
            THISSERVER,
            @JsonProperty("allServers")
            ALLSERVERS;
        }

        public static class Builder {
            private List<SamplingMessage> messages;
            private ModelPreferences modelPreferences;
            private String systemPrompt;
            private ContextInclusionStrategy includeContext;
            private Double temperature;
            private int maxTokens;
            private List<String> stopSequences;
            private Map<String, Object> metadata;

            public Builder messages(List<SamplingMessage> messages) {
                this.messages = messages;
                return this;
            }

            public Builder modelPreferences(ModelPreferences modelPreferences) {
                this.modelPreferences = modelPreferences;
                return this;
            }

            public Builder systemPrompt(String systemPrompt) {
                this.systemPrompt = systemPrompt;
                return this;
            }

            public Builder includeContext(ContextInclusionStrategy includeContext) {
                this.includeContext = includeContext;
                return this;
            }

            public Builder temperature(Double temperature) {
                this.temperature = temperature;
                return this;
            }

            public Builder maxTokens(int maxTokens) {
                this.maxTokens = maxTokens;
                return this;
            }

            public Builder stopSequences(List<String> stopSequences) {
                this.stopSequences = stopSequences;
                return this;
            }

            public Builder metadata(Map<String, Object> metadata) {
                this.metadata = metadata;
                return this;
            }

            public CreateMessageRequest build() {
                return new CreateMessageRequest(this.messages, this.modelPreferences, this.systemPrompt, this.includeContext, this.temperature, this.maxTokens, this.stopSequences, this.metadata);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CreateMessageResult(Role role, Content content, String model, StopReason stopReason) {
        public CreateMessageResult(@JsonProperty("role") Role role, @JsonProperty("content") Content content, @JsonProperty("model") String model, @JsonProperty("stopReason") StopReason stopReason) {
            this.role = role;
            this.content = content;
            this.model = model;
            this.stopReason = stopReason;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("role")
        public Role role() {
            return this.role;
        }

        @JsonProperty("content")
        public Content content() {
            return this.content;
        }

        @JsonProperty("model")
        public String model() {
            return this.model;
        }

        @JsonProperty("stopReason")
        public StopReason stopReason() {
            return this.stopReason;
        }

        public static enum StopReason {
            @JsonProperty("endTurn")
            ENDTURN,
            @JsonProperty("stopSequence")
            STOPSEQUENCE,
            @JsonProperty("maxTokens")
            MAXTOKENS;
        }

        public static class Builder {
            private Role role;
            private Content content;
            private String model;
            private StopReason stopReason;

            public Builder() {
                this.role = McpSchema.Role.ASSISTANT;
                this.stopReason = McpSchema.CreateMessageResult.StopReason.ENDTURN;
            }

            public Builder role(Role role) {
                this.role = role;
                return this;
            }

            public Builder content(Content content) {
                this.content = content;
                return this;
            }

            public Builder model(String model) {
                this.model = model;
                return this;
            }

            public Builder stopReason(StopReason stopReason) {
                this.stopReason = stopReason;
                return this;
            }

            public Builder message(String message) {
                this.content = new TextContent(message);
                return this;
            }

            public CreateMessageResult build() {
                return new CreateMessageResult(this.role, this.content, this.model, this.stopReason);
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record PaginatedRequest(String cursor) {
        public PaginatedRequest(@JsonProperty("cursor") String cursor) {
            this.cursor = cursor;
        }

        @JsonProperty("cursor")
        public String cursor() {
            return this.cursor;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record PaginatedResult(String nextCursor) {
        public PaginatedResult(@JsonProperty("nextCursor") String nextCursor) {
            this.nextCursor = nextCursor;
        }

        @JsonProperty("nextCursor")
        public String nextCursor() {
            return this.nextCursor;
        }
    }

    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ProgressNotification(String progressToken, double progress, Double total) {
        public ProgressNotification(@JsonProperty("progressToken") String progressToken, @JsonProperty("progress") double progress, @JsonProperty("total") Double total) {
            this.progressToken = progressToken;
            this.progress = progress;
            this.total = total;
        }

        @JsonProperty("progressToken")
        public String progressToken() {
            return this.progressToken;
        }

        @JsonProperty("progress")
        public double progress() {
            return this.progress;
        }

        @JsonProperty("total")
        public Double total() {
            return this.total;
        }
    }

    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record LoggingMessageNotification(LoggingLevel level, String logger, String data) {
        public LoggingMessageNotification(@JsonProperty("level") LoggingLevel level, @JsonProperty("logger") String logger, @JsonProperty("data") String data) {
            this.level = level;
            this.logger = logger;
            this.data = data;
        }

        public static Builder builder() {
            return new Builder();
        }

        @JsonProperty("level")
        public LoggingLevel level() {
            return this.level;
        }

        @JsonProperty("logger")
        public String logger() {
            return this.logger;
        }

        @JsonProperty("data")
        public String data() {
            return this.data;
        }

        public static class Builder {
            private LoggingLevel level;
            private String logger;
            private String data;

            public Builder() {
                this.level = McpSchema.LoggingLevel.INFO;
                this.logger = "server";
            }

            public Builder level(LoggingLevel level) {
                this.level = level;
                return this;
            }

            public Builder logger(String logger) {
                this.logger = logger;
                return this;
            }

            public Builder data(String data) {
                this.data = data;
                return this;
            }

            public LoggingMessageNotification build() {
                return new LoggingMessageNotification(this.level, this.logger, this.data);
            }
        }
    }

    public static enum LoggingLevel {
        @JsonProperty("debug")
        DEBUG(0),
        @JsonProperty("info")
        INFO(1),
        @JsonProperty("notice")
        NOTICE(2),
        @JsonProperty("warning")
        WARNING(3),
        @JsonProperty("error")
        ERROR(4),
        @JsonProperty("critical")
        CRITICAL(5),
        @JsonProperty("alert")
        ALERT(6),
        @JsonProperty("emergency")
        EMERGENCY(7);

        private final int level;

        private LoggingLevel(int level) {
            this.level = level;
        }

        public int level() {
            return this.level;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record SetLevelRequest(LoggingLevel level) {
        public SetLevelRequest(@JsonProperty("level") LoggingLevel level) {
            this.level = level;
        }

        @JsonProperty("level")
        public LoggingLevel level() {
            return this.level;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record PromptReference(String type, String name) implements CompleteReference {
        public PromptReference(String name) {
            this("ref/prompt", name);
        }

        public PromptReference(@JsonProperty("type") String type, @JsonProperty("name") String name) {
            this.type = type;
            this.name = name;
        }

        public String identifier() {
            return this.name();
        }

        @JsonProperty("type")
        public String type() {
            return this.type;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ResourceReference(String type, String uri) implements CompleteReference {
        public ResourceReference(String uri) {
            this("ref/resource", uri);
        }

        public ResourceReference(@JsonProperty("type") String type, @JsonProperty("uri") String uri) {
            this.type = type;
            this.uri = uri;
        }

        public String identifier() {
            return this.uri();
        }

        @JsonProperty("type")
        public String type() {
            return this.type;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CompleteRequest(CompleteReference ref, CompleteArgument argument) implements Request {
        public CompleteRequest(@JsonProperty("ref") CompleteReference ref, @JsonProperty("argument") CompleteArgument argument) {
            this.ref = ref;
            this.argument = argument;
        }

        @JsonProperty("ref")
        public CompleteReference ref() {
            return this.ref;
        }

        @JsonProperty("argument")
        public CompleteArgument argument() {
            return this.argument;
        }

        public static record CompleteArgument(String name, String value) {
            public CompleteArgument(@JsonProperty("name") String name, @JsonProperty("value") String value) {
                this.name = name;
                this.value = value;
            }

            @JsonProperty("name")
            public String name() {
                return this.name;
            }

            @JsonProperty("value")
            public String value() {
                return this.value;
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record CompleteResult(CompleteCompletion completion) {
        public CompleteResult(@JsonProperty("completion") CompleteCompletion completion) {
            this.completion = completion;
        }

        @JsonProperty("completion")
        public CompleteCompletion completion() {
            return this.completion;
        }

        public static record CompleteCompletion(List<String> values, Integer total, Boolean hasMore) {
            public CompleteCompletion(@JsonProperty("values") List<String> values, @JsonProperty("total") Integer total, @JsonProperty("hasMore") Boolean hasMore) {
                this.values = values;
                this.total = total;
                this.hasMore = hasMore;
            }

            @JsonProperty("values")
            public List<String> values() {
                return this.values;
            }

            @JsonProperty("total")
            public Integer total() {
                return this.total;
            }

            @JsonProperty("hasMore")
            public Boolean hasMore() {
                return this.hasMore;
            }
        }
    }

    @JsonTypeInfo(
        use = Id.NAME,
        include = As.PROPERTY,
        property = "type"
    )
    @JsonSubTypes({@Type(
    value = TextContent.class,
    name = "text"
), @Type(
    value = ImageContent.class,
    name = "image"
), @Type(
    value = EmbeddedResource.class,
    name = "resource"
)})
    public sealed interface Content permits McpSchema.TextContent, McpSchema.ImageContent, McpSchema.EmbeddedResource {
        default String type() {
            if (this instanceof TextContent) {
                return "text";
            } else if (this instanceof ImageContent) {
                return "image";
            } else if (this instanceof EmbeddedResource) {
                return "resource";
            } else {
                throw new IllegalArgumentException("Unknown content type: " + String.valueOf(this));
            }
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record TextContent(List<Role> audience, Double priority, String text) implements Content {
        public TextContent(String content) {
            this((List)null, (Double)null, content);
        }

        public TextContent(@JsonProperty("audience") List<Role> audience, @JsonProperty("priority") Double priority, @JsonProperty("text") String text) {
            this.audience = audience;
            this.priority = priority;
            this.text = text;
        }

        @JsonProperty("audience")
        public List<Role> audience() {
            return this.audience;
        }

        @JsonProperty("priority")
        public Double priority() {
            return this.priority;
        }

        @JsonProperty("text")
        public String text() {
            return this.text;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ImageContent(List<Role> audience, Double priority, String data, String mimeType) implements Content {
        public ImageContent(@JsonProperty("audience") List<Role> audience, @JsonProperty("priority") Double priority, @JsonProperty("data") String data, @JsonProperty("mimeType") String mimeType) {
            this.audience = audience;
            this.priority = priority;
            this.data = data;
            this.mimeType = mimeType;
        }

        @JsonProperty("audience")
        public List<Role> audience() {
            return this.audience;
        }

        @JsonProperty("priority")
        public Double priority() {
            return this.priority;
        }

        @JsonProperty("data")
        public String data() {
            return this.data;
        }

        @JsonProperty("mimeType")
        public String mimeType() {
            return this.mimeType;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record EmbeddedResource(List<Role> audience, Double priority, ResourceContents resource) implements Content {
        public EmbeddedResource(@JsonProperty("audience") List<Role> audience, @JsonProperty("priority") Double priority, @JsonProperty("resource") ResourceContents resource) {
            this.audience = audience;
            this.priority = priority;
            this.resource = resource;
        }

        @JsonProperty("audience")
        public List<Role> audience() {
            return this.audience;
        }

        @JsonProperty("priority")
        public Double priority() {
            return this.priority;
        }

        @JsonProperty("resource")
        public ResourceContents resource() {
            return this.resource;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record Root(String uri, String name) {
        public Root(@JsonProperty("uri") String uri, @JsonProperty("name") String name) {
            this.uri = uri;
            this.name = name;
        }

        @JsonProperty("uri")
        public String uri() {
            return this.uri;
        }

        @JsonProperty("name")
        public String name() {
            return this.name;
        }
    }

    @JsonInclude(Include.NONABSENT)
    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    public static record ListRootsResult(List<Root> roots) {
        public ListRootsResult(@JsonProperty("roots") List<Root> roots) {
            this.roots = roots;
        }

        @JsonProperty("roots")
        public List<Root> roots() {
            return this.roots;
        }
    }

    public interface Annotated {
        Annotations annotations();
    }

    public sealed interface CompleteReference permits McpSchema.PromptReference, McpSchema.ResourceReference {
        String type();

        String identifier();
    }

    public sealed interface JSONRPCMessage permits McpSchema.JSONRPCRequest, McpSchema.JSONRPCNotification, McpSchema.JSONRPCResponse {
        String jsonrpc();
    }

    public sealed interface Request permits McpSchema.InitializeRequest, McpSchema.CallToolRequest, McpSchema.CreateMessageRequest, McpSchema.CompleteRequest, McpSchema.GetPromptRequest {
    }

    @JsonTypeInfo(
        use = Id.DEDUCTION,
        include = As.PROPERTY
    )
    @JsonSubTypes({@Type(
    value = TextResourceContents.class,
    name = "text"
), @Type(
    value = BlobResourceContents.class,
    name = "blob"
)})
    public sealed interface ResourceContents permits McpSchema.TextResourceContents, McpSchema.BlobResourceContents {
        String uri();

        String mimeType();
    }
}
```



## SpringAI 下的 MCP

### pom.xml 文件

```java
// 服务端
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
</dependency>

// 客户端
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client-webflux</artifactId>
</dependency>
```

- spring-ai-autoconfigure-mcp-server：server 自动注入
- spring-ai-autoconfigure-mcp-client：client 自动注入
- spring-ai-mcp：SpringAI 下集成 MCP 转换 ToolCallback
- mcp-spring-webflux：主要是提供了 WebFluxSseServerTransportProvider、WebFluxSseClientTransport 两个类

### SpringAI 下 MCP 各类的说明

![](/img/user/ai/spring-ai-explained-sourcecode/SpringAI下的MCP.png)

### server 自动注入

#### McpServerProperties

MCP 服务器的配置类，通过 @ConfigurationProperties 注解将配置文件中以 spring.ai.mcp.server 为前缀的属性映射到类的字段中

- `boolean enabled（默认为true）`：启用/禁用整个 MCP 服务器。若为 false，服务器及其组件不会初始化
- `boolean stdio（默认为false）`：是否启用标准输入/输出（stdio）传输。启用后，服务器通过标准输入监听消息，标准输出发送响应
- `String name（默认为"mcp-server"）`：服务器实例名称，用于日志和监控中的标识
- `String version（默认为“1.0.0”）`：服务器版本号，报告给客户端用于兼容性检查
- `boolean resourceChangeNotification（默认为true）`：是否启用资源变更通知（如资源增删改），仅当服务器支持资源能力时生效
- `boolean toolChangeNotification（默认为true）`：是否启用工具变更通知（如工具注册/注销），仅当服务器支持工具能力时生效
- `boolean promptChangeNotification（默认为true）`：是否启用提示模板变更通知，仅当服务器支持提示能力时生效
- `String baseUrl（默认为""）`：服务器的基础 URL，用于构建资源路径。需确保不为 null
- `String sseEndpoint（默认为"sse"）`：Server-Sent Events (SSE) 的端点路径。仅在 WebMvc/WebFlux 传输模式下使用
- `String sseMessageEndpoint（默认为"/mcp/message"）`：SSE 消息端点路径，用于客户端与服务器的消息通信
- `ServerType type（默认为ServerType.` SYNC `）`：服务器类型，可选 SYNC 或 ASYNC
- `Duration requestTimeout（默认20s）`：请求超时时间，适用于所有客户端请求（如工具调用、资源访问）
- `Capabilities capabilities`：封装服务器支持的核心能力开关，包括：资源、工具、提示、完成（completion）能力是否启用

  - boolean resource（默认为 true）：是否支持资源管理能力（如文件、数据读取）
  - boolean tool（默认为 true）：是否支持工具调用能力（如外部 API 调用）
  - boolean prompt（默认为 true）：是否支持提示模板管理能力（如动态提示生成）
  - boolean completion（默认为 true）：是否支持补全能力（如文本生成）
- `Map<String, String> toolResponseMimeType`：按工具名称指定响应的 MIME 类型（如 "toolA": "application/json"），用于自定义工具返回格式
- `String instructions`：当前服务端的指导建议，便于客户端识别

```java
package org.springframework.ai.mcp.server.autoconfigure;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.Assert;

@ConfigurationProperties("spring.ai.mcp.server")
public class McpServerProperties {
    public static final String CONFIGPREFIX = "spring.ai.mcp.server";
    private boolean enabled = true;
    private boolean stdio = false;
    private String name = "mcp-server";
    private String version = "1.0.0";
    private String instructions = null;
    private boolean resourceChangeNotification = true;
    private boolean toolChangeNotification = true;
    private boolean promptChangeNotification = true;
    private String baseUrl = "";
    private String sseEndpoint = "/sse";
    private String sseMessageEndpoint = "/mcp/message";
    private ServerType type;
    private Capabilities capabilities;
    private Duration requestTimeout;
    private Map<String, String> toolResponseMimeType;

    public McpServerProperties() {
        this.type = McpServerProperties.ServerType.SYNC;
        this.capabilities = new Capabilities();
        this.requestTimeout = Duration.ofSeconds(20L);
        this.toolResponseMimeType = new HashMap();
    }

    public Duration getRequestTimeout() {
        return this.requestTimeout;
    }

    public void setRequestTimeout(Duration requestTimeout) {
        Assert.notNull(requestTimeout, "Request timeout must not be null");
        this.requestTimeout = requestTimeout;
    }

    public Capabilities getCapabilities() {
        return this.capabilities;
    }

    public boolean isStdio() {
        return this.stdio;
    }

    public void setStdio(boolean stdio) {
        this.stdio = stdio;
    }

    public boolean isEnabled() {
        return this.enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        Assert.hasText(name, "Name must not be empty");
        this.name = name;
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        Assert.hasText(version, "Version must not be empty");
        this.version = version;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public boolean isResourceChangeNotification() {
        return this.resourceChangeNotification;
    }

    public void setResourceChangeNotification(boolean resourceChangeNotification) {
        this.resourceChangeNotification = resourceChangeNotification;
    }

    public boolean isToolChangeNotification() {
        return this.toolChangeNotification;
    }

    public void setToolChangeNotification(boolean toolChangeNotification) {
        this.toolChangeNotification = toolChangeNotification;
    }

    public boolean isPromptChangeNotification() {
        return this.promptChangeNotification;
    }

    public void setPromptChangeNotification(boolean promptChangeNotification) {
        this.promptChangeNotification = promptChangeNotification;
    }

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        Assert.notNull(baseUrl, "Base URL must not be null");
        this.baseUrl = baseUrl;
    }

    public String getSseEndpoint() {
        return this.sseEndpoint;
    }

    public void setSseEndpoint(String sseEndpoint) {
        Assert.hasText(sseEndpoint, "SSE endpoint must not be empty");
        this.sseEndpoint = sseEndpoint;
    }

    public String getSseMessageEndpoint() {
        return this.sseMessageEndpoint;
    }

    public void setSseMessageEndpoint(String sseMessageEndpoint) {
        Assert.hasText(sseMessageEndpoint, "SSE message endpoint must not be empty");
        this.sseMessageEndpoint = sseMessageEndpoint;
    }

    public ServerType getType() {
        return this.type;
    }

    public void setType(ServerType serverType) {
        Assert.notNull(serverType, "Server type must not be null");
        this.type = serverType;
    }

    public Map<String, String> getToolResponseMimeType() {
        return this.toolResponseMimeType;
    }

    public static enum ServerType {
        SYNC,
        ASYNC;
    }

    public static class Capabilities {
        private boolean resource = true;
        private boolean tool = true;
        private boolean prompt = true;
        private boolean completion = true;

        public boolean isResource() {
            return this.resource;
        }

        public void setResource(boolean resource) {
            this.resource = resource;
        }

        public boolean isTool() {
            return this.tool;
        }

        public void setTool(boolean tool) {
            this.tool = tool;
        }

        public boolean isPrompt() {
            return this.prompt;
        }

        public void setPrompt(boolean prompt) {
            this.prompt = prompt;
        }

        public boolean isCompletion() {
            return this.completion;
        }

        public void setCompletion(boolean completion) {
            this.completion = completion;
        }
    }
}
```

#### McpWebFluxServerAutoConfiguration

MCP 服务器的的 WebFlux 自动配置类，仅当满足以下条件时自动配置生效

- @ConditionalOnClass({ WebFluxSseServerTransportProvider.class })：类路径包含该类（来自 mcp-spring-webflux 依赖）
- @ConditionalOnMissingBean(McpServerTransportProvider.class)：未手动定义 McpServerTransportProvider Bean
- McpServerStdioDisabledCondition 条件成立（即 stdio 配置为 false）

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>webFluxTransport<br/></td><td>提供WebFluxSseServerTransportProvider的Bean：提供基于 Spring WebFlux 的 SSE 传输实现<br/></td></tr>
<tr>
<td>webfluxMcpRouterFunction<br/></td><td>提供RouterFunction的Bean：定义 WebFlux 的 路由规则，将 HTTP 请求映射到 MCP 服务器的 SSE 处理逻辑<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp.server.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.transport.WebFluxSseServerTransportProvider;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.web.reactive.function.server.RouterFunction;

@AutoConfiguration
@ConditionalOnClass({WebFluxSseServerTransportProvider.class})
@ConditionalOnMissingBean({McpServerTransportProvider.class})
@Conditional({McpServerStdioDisabledCondition.class})
public class McpWebFluxServerAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public WebFluxSseServerTransportProvider webFluxTransport(ObjectProvider<ObjectMapper> objectMapperProvider, McpServerProperties serverProperties) {
        ObjectMapper objectMapper = (ObjectMapper)objectMapperProvider.getIfAvailable(ObjectMapper::new);
        return new WebFluxSseServerTransportProvider(objectMapper, serverProperties.getBaseUrl(), serverProperties.getSseMessageEndpoint(), serverProperties.getSseEndpoint());
    }

    @Bean
    public RouterFunction<?> webfluxMcpRouterFunction(WebFluxSseServerTransportProvider webFluxProvider) {
        return webFluxProvider.getRouterFunction();
    }
}
```

#### McpWebMvcServerAutoConfiguration

MCP 服务器的的 WebFlux 自动配置类，仅当满足以下条件时自动配置生效

- @ConditionalOnClass({ WebMvcSseServerTransportProvider.class })：类路径包含该类（来自 mcp-spring-webmvc 依赖）
- @ConditionalOnMissingBean(McpServerTransportProvider.class)：未手动定义 McpServerTransportProvider Bean
- McpServerStdioDisabledCondition 条件成立（即 stdio 配置为 false）

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>webMvcSseServerTransportProvider<br/></td><td>提供WebMvcSseServerTransportProvider的Bean：提供基于 Spring MVC 的 SSE 传输实现<br/></td></tr>
<tr>
<td>mvcMcpRouterFunction<br/></td><td>提供RouterFunction的Bean：定义 WebMVC 的 路由规则，将 HTTP 请求映射到 MCP 服务器的 SSE 处理逻辑<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp.server.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.transport.WebMvcSseServerTransportProvider;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

@AutoConfiguration
@ConditionalOnClass({WebMvcSseServerTransportProvider.class})
@ConditionalOnMissingBean({McpServerTransportProvider.class})
@Conditional({McpServerStdioDisabledCondition.class})
public class McpWebMvcServerAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public WebMvcSseServerTransportProvider webMvcSseServerTransportProvider(ObjectProvider<ObjectMapper> objectMapperProvider, McpServerProperties serverProperties) {
        ObjectMapper objectMapper = (ObjectMapper)objectMapperProvider.getIfAvailable(ObjectMapper::new);
        return new WebMvcSseServerTransportProvider(objectMapper, serverProperties.getBaseUrl(), serverProperties.getSseMessageEndpoint(), serverProperties.getSseEndpoint());
    }

    @Bean
    public RouterFunction<ServerResponse> mvcMcpRouterFunction(WebMvcSseServerTransportProvider transportProvider) {
        return transportProvider.getRouterFunction();
    }
}
```

#### McpServerStdioDisabledCondition

条件注解类，用于判断是否满足以下两个核心条件：

- MCP 服务器已启用
- STDIO 传输模式已禁用

```java
package org.springframework.ai.mcp.server.autoconfigure;

import org.springframework.boot.autoconfigure.condition.AllNestedConditions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.ConfigurationCondition.ConfigurationPhase;

public class McpServerStdioDisabledCondition extends AllNestedConditions {
    public McpServerStdioDisabledCondition() {
        super(ConfigurationPhase.PARSECONFIGURATION);
    }

    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"enabled"},
        havingValue = "true",
        matchIfMissing = true
    )
    static class McpServerEnabledCondition {
    }

    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"stdio"},
        havingValue = "false",
        matchIfMissing = true
    )
    static class StdioDisabledCondition {
    }
}
```

#### McpServerAutoConfiguration

根据配置动态创建同步/异步服务器实例，并集成工具、资源、提示等能力，支持多种传输协议（STDIO/WebMvc/WebFlux），仅当满足以下条件时自动配置生效

- 类路径包含 McpSchema 和 McpSyncServer（MCP SDK 依赖）
- 配置项 spring.ai.mcp.server.enabled 为 true 时（默认为 true）

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>stdioServerTransport<br/></td><td>提供McpServerTransportProvider的Bean，默认为STDIO传输<br/></td></tr>
<tr>
<td>capabilitiesBuilder<br/></td><td>提供McpSchema.ServerCapabilities.Builder的Bean，初始化MCP服务器的能力构建器<br/></td></tr>
<tr>
<td>syncTools<br/></td><td>提供List<McpServerFeatures.SyncToolSpecification>的Bean，将 ToolCallback 转换为 SyncToolSpecification，支持同步工具调用<br/></td></tr>
<tr>
<td>asyncTools<br/></td><td>提供List<McpServerFeatures.AsyncToolSpecification>的Bean，将 ToolCallback 转换为 AsyncToolSpecification，支持异步工具调用<br/></td></tr>
<tr>
<td>mcpSyncServer<br/></td><td>提供McpSyncServer的Bean，创建同步模式的 MCP 服务器实例<br/></td></tr>
<tr>
<td>mcpAsyncServer<br/></td><td>提供McpAsyncServer的Bean，创建异步模式的 MCP 服务器实例<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp.server.autoconfigure;

import io.modelcontextprotocol.server.McpAsyncServer;
import io.modelcontextprotocol.server.McpAsyncServerExchange;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import io.modelcontextprotocol.server.transport.StdioServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.stream.Collectors;
import org.springframework.ai.mcp.McpToolUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.core.log.LogAccessor;
import org.springframework.util.CollectionUtils;
import org.springframework.util.MimeType;
import reactor.core.publisher.Mono;

@AutoConfiguration(
    after = {McpWebMvcServerAutoConfiguration.class, McpWebFluxServerAutoConfiguration.class}
)
@ConditionalOnClass({McpSchema.class, McpSyncServer.class})
@EnableConfigurationProperties({McpServerProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.mcp.server",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class McpServerAutoConfiguration {
    private static final LogAccessor logger = new LogAccessor(McpServerAutoConfiguration.class);

    @Bean
    @ConditionalOnMissingBean
    public McpServerTransportProvider stdioServerTransport() {
        return new StdioServerTransportProvider();
    }

    @Bean
    @ConditionalOnMissingBean
    public McpSchema.ServerCapabilities.Builder capabilitiesBuilder() {
        return ServerCapabilities.builder();
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    public List<McpServerFeatures.SyncToolSpecification> syncTools(ObjectProvider<List<ToolCallback>> toolCalls, List<ToolCallback> toolCallbacksList, McpServerProperties serverProperties) {
        List<ToolCallback> tools = new ArrayList(toolCalls.stream().flatMap(Collection::stream).toList());
        if (!CollectionUtils.isEmpty(toolCallbacksList)) {
            tools.addAll(toolCallbacksList);
        }

        return this.toSyncToolSpecifications(tools, serverProperties);
    }

    private List<McpServerFeatures.SyncToolSpecification> toSyncToolSpecifications(List<ToolCallback> tools, McpServerProperties serverProperties) {
        return ((Map)tools.stream().collect(Collectors.toMap((tool) -> tool.getToolDefinition().name(), (tool) -> tool, (existing, replacement) -> existing))).values().stream().map((tool) -> {
            String toolName = tool.getToolDefinition().name();
            MimeType mimeType = serverProperties.getToolResponseMimeType().containsKey(toolName) ? MimeType.valueOf((String)serverProperties.getToolResponseMimeType().get(toolName)) : null;
            return McpToolUtils.toSyncToolSpecification(tool, mimeType);
        }).toList();
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    public McpSyncServer mcpSyncServer(McpServerTransportProvider transportProvider, McpSchema.ServerCapabilities.Builder capabilitiesBuilder, McpServerProperties serverProperties, ObjectProvider<List<McpServerFeatures.SyncToolSpecification>> tools, ObjectProvider<List<McpServerFeatures.SyncResourceSpecification>> resources, ObjectProvider<List<McpServerFeatures.SyncPromptSpecification>> prompts, ObjectProvider<List<McpServerFeatures.SyncCompletionSpecification>> completions, ObjectProvider<BiConsumer<McpSyncServerExchange, List<McpSchema.Root>>> rootsChangeConsumers, List<ToolCallbackProvider> toolCallbackProvider) {
        McpSchema.Implementation serverInfo = new McpSchema.Implementation(serverProperties.getName(), serverProperties.getVersion());
        McpServer.SyncSpecification serverBuilder = McpServer.sync(transportProvider).serverInfo(serverInfo);
        if (serverProperties.getCapabilities().isTool()) {
            logger.info("Enable tools capabilities, notification: " + serverProperties.isToolChangeNotification());
            capabilitiesBuilder.tools(serverProperties.isToolChangeNotification());
            List<McpServerFeatures.SyncToolSpecification> toolSpecifications = new ArrayList(tools.stream().flatMap(Collection::stream).toList());
            List<ToolCallback> providerToolCallbacks = toolCallbackProvider.stream().map((pr) -> List.of(pr.getToolCallbacks())).flatMap(Collection::stream).filter((fc) -> fc instanceof ToolCallback).map((fc) -> fc).toList();
            toolSpecifications.addAll(this.toSyncToolSpecifications(providerToolCallbacks, serverProperties));
            if (!CollectionUtils.isEmpty(toolSpecifications)) {
                serverBuilder.tools(toolSpecifications);
                logger.info("Registered tools: " + toolSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isResource()) {
            logger.info("Enable resources capabilities, notification: " + serverProperties.isResourceChangeNotification());
            capabilitiesBuilder.resources(false, serverProperties.isResourceChangeNotification());
            List<McpServerFeatures.SyncResourceSpecification> resourceSpecifications = resources.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(resourceSpecifications)) {
                serverBuilder.resources(resourceSpecifications);
                logger.info("Registered resources: " + resourceSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isPrompt()) {
            logger.info("Enable prompts capabilities, notification: " + serverProperties.isPromptChangeNotification());
            capabilitiesBuilder.prompts(serverProperties.isPromptChangeNotification());
            List<McpServerFeatures.SyncPromptSpecification> promptSpecifications = prompts.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(promptSpecifications)) {
                serverBuilder.prompts(promptSpecifications);
                logger.info("Registered prompts: " + promptSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isCompletion()) {
            logger.info("Enable completions capabilities");
            capabilitiesBuilder.completions();
            List<McpServerFeatures.SyncCompletionSpecification> completionSpecifications = completions.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(completionSpecifications)) {
                serverBuilder.completions(completionSpecifications);
                logger.info("Registered completions: " + completionSpecifications.size());
            }
        }

        rootsChangeConsumers.ifAvailable((consumer) -> {
            serverBuilder.rootsChangeHandler((exchange, roots) -> consumer.accept(exchange, roots));
            logger.info("Registered roots change consumer");
        });
        serverBuilder.capabilities(capabilitiesBuilder.build());
        serverBuilder.instructions(serverProperties.getInstructions());
        serverBuilder.requestTimeout(serverProperties.getRequestTimeout());
        return serverBuilder.build();
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"type"},
        havingValue = "ASYNC"
    )
    public List<McpServerFeatures.AsyncToolSpecification> asyncTools(ObjectProvider<List<ToolCallback>> toolCalls, List<ToolCallback> toolCallbackList, McpServerProperties serverProperties) {
        List<ToolCallback> tools = new ArrayList(toolCalls.stream().flatMap(Collection::stream).toList());
        if (!CollectionUtils.isEmpty(toolCallbackList)) {
            tools.addAll(toolCallbackList);
        }

        return this.toAsyncToolSpecification(tools, serverProperties);
    }

    private List<McpServerFeatures.AsyncToolSpecification> toAsyncToolSpecification(List<ToolCallback> tools, McpServerProperties serverProperties) {
        return ((Map)tools.stream().collect(Collectors.toMap((tool) -> tool.getToolDefinition().name(), (tool) -> tool, (existing, replacement) -> existing))).values().stream().map((tool) -> {
            String toolName = tool.getToolDefinition().name();
            MimeType mimeType = serverProperties.getToolResponseMimeType().containsKey(toolName) ? MimeType.valueOf((String)serverProperties.getToolResponseMimeType().get(toolName)) : null;
            return McpToolUtils.toAsyncToolSpecification(tool, mimeType);
        }).toList();
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.server",
        name = {"type"},
        havingValue = "ASYNC"
    )
    public McpAsyncServer mcpAsyncServer(McpServerTransportProvider transportProvider, McpSchema.ServerCapabilities.Builder capabilitiesBuilder, McpServerProperties serverProperties, ObjectProvider<List<McpServerFeatures.AsyncToolSpecification>> tools, ObjectProvider<List<McpServerFeatures.AsyncResourceSpecification>> resources, ObjectProvider<List<McpServerFeatures.AsyncPromptSpecification>> prompts, ObjectProvider<List<McpServerFeatures.AsyncCompletionSpecification>> completions, ObjectProvider<BiConsumer<McpAsyncServerExchange, List<McpSchema.Root>>> rootsChangeConsumer, List<ToolCallbackProvider> toolCallbackProvider) {
        McpSchema.Implementation serverInfo = new McpSchema.Implementation(serverProperties.getName(), serverProperties.getVersion());
        McpServer.AsyncSpecification serverBuilder = McpServer.async(transportProvider).serverInfo(serverInfo);
        if (serverProperties.getCapabilities().isTool()) {
            List<McpServerFeatures.AsyncToolSpecification> toolSpecifications = new ArrayList(tools.stream().flatMap(Collection::stream).toList());
            List<ToolCallback> providerToolCallbacks = toolCallbackProvider.stream().map((pr) -> List.of(pr.getToolCallbacks())).flatMap(Collection::stream).filter((fc) -> fc instanceof ToolCallback).map((fc) -> fc).toList();
            toolSpecifications.addAll(this.toAsyncToolSpecification(providerToolCallbacks, serverProperties));
            logger.info("Enable tools capabilities, notification: " + serverProperties.isToolChangeNotification());
            capabilitiesBuilder.tools(serverProperties.isToolChangeNotification());
            if (!CollectionUtils.isEmpty(toolSpecifications)) {
                serverBuilder.tools(toolSpecifications);
                logger.info("Registered tools: " + toolSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isResource()) {
            logger.info("Enable resources capabilities, notification: " + serverProperties.isResourceChangeNotification());
            capabilitiesBuilder.resources(false, serverProperties.isResourceChangeNotification());
            List<McpServerFeatures.AsyncResourceSpecification> resourceSpecifications = resources.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(resourceSpecifications)) {
                serverBuilder.resources(resourceSpecifications);
                logger.info("Registered resources: " + resourceSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isPrompt()) {
            logger.info("Enable prompts capabilities, notification: " + serverProperties.isPromptChangeNotification());
            capabilitiesBuilder.prompts(serverProperties.isPromptChangeNotification());
            List<McpServerFeatures.AsyncPromptSpecification> promptSpecifications = prompts.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(promptSpecifications)) {
                serverBuilder.prompts(promptSpecifications);
                logger.info("Registered prompts: " + promptSpecifications.size());
            }
        }

        if (serverProperties.getCapabilities().isCompletion()) {
            logger.info("Enable completions capabilities");
            capabilitiesBuilder.completions();
            List<McpServerFeatures.AsyncCompletionSpecification> completionSpecifications = completions.stream().flatMap(Collection::stream).toList();
            if (!CollectionUtils.isEmpty(completionSpecifications)) {
                serverBuilder.completions(completionSpecifications);
                logger.info("Registered completions: " + completionSpecifications.size());
            }
        }

        rootsChangeConsumer.ifAvailable((consumer) -> {
            BiFunction<McpAsyncServerExchange, List<McpSchema.Root>, Mono<Void>> asyncConsumer = (exchange, roots) -> {
                consumer.accept(exchange, roots);
                return Mono.empty();
            };
            serverBuilder.rootsChangeHandler(asyncConsumer);
            logger.info("Registered roots change consumer");
        });
        serverBuilder.capabilities(capabilitiesBuilder.build());
        serverBuilder.instructions(serverProperties.getInstructions());
        serverBuilder.requestTimeout(serverProperties.getRequestTimeout());
        return serverBuilder.build();
    }
}
```

### client 自动注入

#### McpClientCommonProperties

MCP 客户端的通用配置参数，适用于所有传输类型（stdio、http、sse 等），通过 @ConfigurationProperties 注解，将以 spring.ai.mcp.client 为前缀的配置项自动绑定到该类的字段

- `boolean enabled（默认为true）`：是否启用 MCP 客户端，true 表示启用，false 表示不初始化相关组件
- `String name（默认为"spring-ai-mcp-client"）`：MCP 客户端实例名称
- `String version（默认为"1.0.0"）`：MCP 客户端版本号
- `boolean initialized（默认为true）`：标记 MCP 客户端是否需要初始化
- `Duration requestTimeout（默认为20s）`：客户端请求超时时间，默认 20 秒，所有请求（如工具调用、资源访问等）都受此超时控制
- `ClientType type（默认为ClientType.` SYNC `）`：客户端类型，枚举值有 SYNC、ASYNC，决定通信模式
- `boolean rootChangeNotification（默认为true）`：是否启用根变更通知，启用后，根配置变更时客户端会收到通知
- `Toolcallback toolcallback`：工具回调相关配置，包含一个 enabled 字段。该字段决定了是否提供 ToolCallbackProvider

  - `boolean enabled（默认为true）`：是否启用工具回调

```java
package org.springframework.ai.mcp.client.autoconfigure.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.mcp.client")
public class McpClientCommonProperties {
    public static final String CONFIGPREFIX = "spring.ai.mcp.client";
    private boolean enabled = true;
    private String name = "spring-ai-mcp-client";
    private String version = "1.0.0";
    private boolean initialized = true;
    private Duration requestTimeout = Duration.ofSeconds(20L);
    private ClientType type;
    private boolean rootChangeNotification;
    private Toolcallback toolcallback;

    public McpClientCommonProperties() {
        this.type = McpClientCommonProperties.ClientType.SYNC;
        this.rootChangeNotification = true;
        this.toolcallback = new Toolcallback();
    }

    public boolean isEnabled() {
        return this.enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public boolean isInitialized() {
        return this.initialized;
    }

    public void setInitialized(boolean initialized) {
        this.initialized = initialized;
    }

    public Duration getRequestTimeout() {
        return this.requestTimeout;
    }

    public void setRequestTimeout(Duration requestTimeout) {
        this.requestTimeout = requestTimeout;
    }

    public ClientType getType() {
        return this.type;
    }

    public void setType(ClientType type) {
        this.type = type;
    }

    public boolean isRootChangeNotification() {
        return this.rootChangeNotification;
    }

    public void setRootChangeNotification(boolean rootChangeNotification) {
        this.rootChangeNotification = rootChangeNotification;
    }

    public Toolcallback getToolcallback() {
        return this.toolcallback;
    }

    public void setToolcallback(Toolcallback toolcallback) {
        this.toolcallback = toolcallback;
    }

    public static enum ClientType {
        SYNC,
        ASYNC;
    }

    public static class Toolcallback {
        private boolean enabled = true;

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isEnabled() {
            return this.enabled;
        }
    }
}
```

#### McpSseClientProperties

基于 SSE 的 MCP 客户端连接参数，通过 @ConfigurationProperties("spring.ai.mcp.client.sse")绑定配置项

- `Map<String, SseParameters> connections`：存储多个命名的 SSE 连接配置

```java
package org.springframework.ai.mcp.client.autoconfigure.properties;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.mcp.client.sse")
public class McpSseClientProperties {
    public static final String CONFIGPREFIX = "spring.ai.mcp.client.sse";
    private final Map<String, SseParameters> connections = new HashMap();

    public Map<String, SseParameters> getConnections() {
        return this.connections;
    }

    public static record SseParameters(String url, String sseEndpoint) {
    }
}
```

#### McpStdioClientProperties

基于 stdio 的 MCP 客户端连接参数配置，通过 @ConfigurationProperties("spring.ai.mcp.client.stdio")绑定配置项

- `Resource serversConfiguration`：外部资源文件（如 JSON），包含 MCP 服务器的 stdio 连接配置。可集中管理多个服务器的命令、参数、环境变量等
- `Map<String, Parameters> connections`：以 Map 形式存储多个命名的 stdio 连接配置。key 为连接名称，value 为该连接的参数（命令、参数、环境变量）

```java
package org.springframework.ai.mcp.client.autoconfigure.properties;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.transport.ServerParameters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

@ConfigurationProperties("spring.ai.mcp.client.stdio")
public class McpStdioClientProperties {
    public static final String CONFIGPREFIX = "spring.ai.mcp.client.stdio";
    private Resource serversConfiguration;
    private final Map<String, Parameters> connections = new HashMap();

    public Resource getServersConfiguration() {
        return this.serversConfiguration;
    }

    public void setServersConfiguration(Resource stdioConnectionResources) {
        this.serversConfiguration = stdioConnectionResources;
    }

    public Map<String, Parameters> getConnections() {
        return this.connections;
    }

    private Map<String, ServerParameters> resourceToServerParameters() {
        try {
            Map<String, Map<String, Parameters>> stdioConnection = (Map)(new ObjectMapper()).readValue(this.serversConfiguration.getInputStream(), new TypeReference<Map<String, Map<String, Parameters>>>() {
            });
            Map<String, Parameters> mcpServerJsonConfig = (Map)((Map.Entry)stdioConnection.entrySet().iterator().next()).getValue();
            return (Map)mcpServerJsonConfig.entrySet().stream().collect(Collectors.toMap((kv) -> (String)kv.getKey(), (kv) -> {
                Parameters parameters = (Parameters)kv.getValue();
                return ServerParameters.builder(parameters.command()).args(parameters.args()).env(parameters.env()).build();
            }));
        } catch (Exception e) {
            throw new RuntimeException("Failed to read stdio connection resource", e);
        }
    }

    public Map<String, ServerParameters> toServerParameters() {
        Map<String, ServerParameters> serverParameters = new HashMap();
        if (this.serversConfiguration != null) {
            serverParameters.putAll(this.resourceToServerParameters());
        }

        for(Map.Entry<String, Parameters> entry : this.connections.entrySet()) {
            serverParameters.put((String)entry.getKey(), ((Parameters)entry.getValue()).toServerParameters());
        }

        return serverParameters;
    }

    @JsonInclude(Include.NONABSENT)
    public static record Parameters(String command, List<String> args, Map<String, String> env) {
        public Parameters(@JsonProperty("command") String command, @JsonProperty("args") List<String> args, @JsonProperty("env") Map<String, String> env) {
            this.command = command;
            this.args = args;
            this.env = env;
        }

        public ServerParameters toServerParameters() {
            return ServerParameters.builder(this.command()).args(this.args()).env(this.env()).build();
        }

        @JsonProperty("command")
        public String command() {
            return this.command;
        }

        @JsonProperty("args")
        public List<String> args() {
            return this.args;
        }

        @JsonProperty("env")
        public Map<String, String> env() {
            return this.env;
        }
    }
}
```

#### NamedClientMcpTransport

封装带有名称的 MCP 客户端传输对象，标识和管理多个 MCP 客户端传输

```java
package org.springframework.ai.mcp.client.autoconfigure;

import io.modelcontextprotocol.spec.McpClientTransport;

public record NamedClientMcpTransport(String name, McpClientTransport transport) {
}
```

#### SseWebFluxTransportAutoConfiguration

自动配置基于 WebFlux 的 SSE MCP 客户端传输能力，仅当满足以下条件时自动配置生效

- 类路径中有 WebFluxSseClientTransport
- 配置项 spring.ai.mcp.client.enabled=true（默认为 true）

对外提供 List<NamedClientMcpTransport>的 Bean，逻辑如下

1. 读取所有配置的 SSE 连接（如 server1、server2）
2. 为每个连接克隆一个 WebClient.Builder，设置对应的 baseUrl
3. 构建 WebFluxSseClientTransport 实例，设置端点和 JSON 处理器
4. 封装为 NamedClientMcpTransport，加入列表

```java
package org.springframework.ai.mcp.client.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.transport.WebFluxSseClientTransport;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpSseClientProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.web.reactive.function.client.WebClient;

@AutoConfiguration
@ConditionalOnClass({WebFluxSseClientTransport.class})
@EnableConfigurationProperties({McpSseClientProperties.class, McpClientCommonProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.mcp.client",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class SseWebFluxTransportAutoConfiguration {
    @Bean
    public List<NamedClientMcpTransport> webFluxClientTransports(McpSseClientProperties sseProperties, ObjectProvider<WebClient.Builder> webClientBuilderProvider, ObjectProvider<ObjectMapper> objectMapperProvider) {
        List<NamedClientMcpTransport> sseTransports = new ArrayList();
        WebClient.Builder webClientBuilderTemplate = (WebClient.Builder)webClientBuilderProvider.getIfAvailable(WebClient::builder);
        ObjectMapper objectMapper = (ObjectMapper)objectMapperProvider.getIfAvailable(ObjectMapper::new);

        for(Map.Entry<String, McpSseClientProperties.SseParameters> serverParameters : sseProperties.getConnections().entrySet()) {
            WebClient.Builder webClientBuilder = webClientBuilderTemplate.clone().baseUrl(((McpSseClientProperties.SseParameters)serverParameters.getValue()).url());
            String sseEndpoint = ((McpSseClientProperties.SseParameters)serverParameters.getValue()).sseEndpoint() != null ? ((McpSseClientProperties.SseParameters)serverParameters.getValue()).sseEndpoint() : "/sse";
            WebFluxSseClientTransport transport = WebFluxSseClientTransport.builder(webClientBuilder).sseEndpoint(sseEndpoint).objectMapper(objectMapper).build();
            sseTransports.add(new NamedClientMcpTransport((String)serverParameters.getKey(), transport));
        }

        return sseTransports;
    }
}
```

#### SseHttpClientTransportAutoConfiguration

主要用于在没有 WebFlux 环境时，自动配置基于 JDK HttpClient 的 SSE（Server-Sent Events）MCP 客户端传输能力，仅当满足以下条件时自动配置生效

- 类路径中有 McpSchema、McpSyncClient
- 类路径缺失：io.modelcontextprotocol.client.transport.WebFluxSseClientTransport
- 配置项 spring.ai.mcp.client.enabled=true（默认为 true）

对外提供 List<NamedClientMcpTransport>的 Bean

```java
package org.springframework.ai.mcp.client.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientSseClientTransport;
import io.modelcontextprotocol.spec.McpSchema;
import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpSseClientProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration(
    after = {SseWebFluxTransportAutoConfiguration.class}
)
@ConditionalOnClass({McpSchema.class, McpSyncClient.class})
@ConditionalOnMissingClass({"io.modelcontextprotocol.client.transport.WebFluxSseClientTransport"})
@EnableConfigurationProperties({McpSseClientProperties.class, McpClientCommonProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.mcp.client",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class SseHttpClientTransportAutoConfiguration {
    @Bean
    public List<NamedClientMcpTransport> mcpHttpClientTransports(McpSseClientProperties sseProperties, ObjectProvider<ObjectMapper> objectMapperProvider) {
        ObjectMapper objectMapper = (ObjectMapper)objectMapperProvider.getIfAvailable(ObjectMapper::new);
        List<NamedClientMcpTransport> sseTransports = new ArrayList();

        for(Map.Entry<String, McpSseClientProperties.SseParameters> serverParameters : sseProperties.getConnections().entrySet()) {
            String baseUrl = ((McpSseClientProperties.SseParameters)serverParameters.getValue()).url();
            String sseEndpoint = ((McpSseClientProperties.SseParameters)serverParameters.getValue()).sseEndpoint() != null ? ((McpSseClientProperties.SseParameters)serverParameters.getValue()).sseEndpoint() : "/sse";
            HttpClientSseClientTransport transport = HttpClientSseClientTransport.builder(baseUrl).sseEndpoint(sseEndpoint).clientBuilder(HttpClient.newBuilder()).objectMapper(objectMapper).build();
            sseTransports.add(new NamedClientMcpTransport((String)serverParameters.getKey(), transport));
        }

        return sseTransports;
    }
}
```

#### StdioTransportAutoConfiguration

自动配置基于 Stdio MCP 客户端传输能力，仅当满足以下条件时自动配置生效

- 类路径中有 McpSchema
- 配置项 spring.ai.mcp.client.enabled=true（默认为 true）

对外提供 List<NamedClientMcpTransport>的 Bean

```java
package org.springframework.ai.mcp.client.autoconfigure;

import io.modelcontextprotocol.client.transport.ServerParameters;
import io.modelcontextprotocol.client.transport.StdioClientTransport;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpStdioClientProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass({McpSchema.class})
@EnableConfigurationProperties({McpStdioClientProperties.class, McpClientCommonProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.mcp.client",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class StdioTransportAutoConfiguration {
    @Bean
    public List<NamedClientMcpTransport> stdioTransports(McpStdioClientProperties stdioProperties) {
        List<NamedClientMcpTransport> stdioTransports = new ArrayList();

        for(Map.Entry<String, ServerParameters> serverParameters : stdioProperties.toServerParameters().entrySet()) {
            StdioClientTransport transport = new StdioClientTransport((ServerParameters)serverParameters.getValue());
            stdioTransports.add(new NamedClientMcpTransport((String)serverParameters.getKey(), transport));
        }

        return stdioTransports;
    }
}
```

#### McpClientAutoConfiguration

自动装配 MCP 客户端的核心组件，包括 Sync、Async 的客户端，依赖于传输层（stdio、SSE HTTP、SSE WebFlux）的自动配置，确保在有可用传输通道时自动创建 MCP 客户端实例，作用描述如下：

- 自动装配 MCP 客户端：根据配置（spring.ai.mcp.client.type），自动创建 Sync、Async 客户端实例
- 多连接支持：支持多个命名传输通道（如多个服务器），为每个通道分别创建对应的客户端实例
- 客户端信息与定制：支持通过配置设置客户端名称、版本、请求超时等参数，并允许通过自定义器（Customizer/Configurer）扩展客户端行为
- 生命周期管理：提供可关闭的客户端包装类，确保应用关闭时资源被正确释放

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>mcpSyncClients<br/></td><td>提供List<McpSyncClient>的Bean，按需创建并暴露所有同步 MCP 客户端实例，每个实例对应一个命名传输通道。用于阻塞式调用场景<br/></td></tr>
<tr>
<td>mcpAsyncClients<br/></td><td>提供List<McpAsyncClient>的Bean，按需创建并暴露所有异步 MCP 客户端实例，每个实例对应一个命名传输通道。用于非阻塞式调用场景<br/></td></tr>
<tr>
<td>mcpSyncClientConfigurer<br/></td><td>提供McpSyncClientConfigurer的Bean，聚合所有 McpSyncClientCustomizer，用于定制同步客户端的创建和配置<br/></td></tr>
<tr>
<td>mcpAsyncClientConfigurer<br/></td><td>提供McpAsyncClientConfigurer的Bean，聚合所有 McpAsyncClientCustomizer，用于定制异步客户端的创建和配置<br/></td></tr>
<tr>
<td>makeSyncClientsClosable<br/></td><td>提供CloseableMcpSyncClients的Bean，封装所有同步客户端，实现 AutoCloseable，用于 Spring 容器关闭时自动释放资源<br/></td></tr>
<tr>
<td>makeAsyncClientsClosable<br/></td><td>提供CloseableMcpAsyncClients的Bean，封装所有异步客户端，实现 AutoCloseable，用于 Spring 容器关闭时自动释放资源<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp.client.autoconfigure;

import io.modelcontextprotocol.client.McpAsyncClient;
import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.ai.mcp.client.autoconfigure.configurer.McpAsyncClientConfigurer;
import org.springframework.ai.mcp.client.autoconfigure.configurer.McpSyncClientConfigurer;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.ai.mcp.customizer.McpAsyncClientCustomizer;
import org.springframework.ai.mcp.customizer.McpSyncClientCustomizer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.util.CollectionUtils;

@AutoConfiguration(
    after = {StdioTransportAutoConfiguration.class, SseHttpClientTransportAutoConfiguration.class, SseWebFluxTransportAutoConfiguration.class}
)
@ConditionalOnClass({McpSchema.class})
@EnableConfigurationProperties({McpClientCommonProperties.class})
@ConditionalOnProperty(
    prefix = "spring.ai.mcp.client",
    name = {"enabled"},
    havingValue = "true",
    matchIfMissing = true
)
public class McpClientAutoConfiguration {
    private String connectedClientName(String clientName, String serverConnectionName) {
        return clientName + " - " + serverConnectionName;
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    public List<McpSyncClient> mcpSyncClients(McpSyncClientConfigurer mcpSyncClientConfigurer, McpClientCommonProperties commonProperties, ObjectProvider<List<NamedClientMcpTransport>> transportsProvider) {
        List<McpSyncClient> mcpSyncClients = new ArrayList();
        List<NamedClientMcpTransport> namedTransports = transportsProvider.stream().flatMap(Collection::stream).toList();
        if (!CollectionUtils.isEmpty(namedTransports)) {
            for(NamedClientMcpTransport namedTransport : namedTransports) {
                McpSchema.Implementation clientInfo = new McpSchema.Implementation(this.connectedClientName(commonProperties.getName(), namedTransport.name()), commonProperties.getVersion());
                McpClient.SyncSpec spec = McpClient.sync(namedTransport.transport()).clientInfo(clientInfo).requestTimeout(commonProperties.getRequestTimeout());
                spec = mcpSyncClientConfigurer.configure(namedTransport.name(), spec);
                McpSyncClient client = spec.build();
                if (commonProperties.isInitialized()) {
                    client.initialize();
                }

                mcpSyncClients.add(client);
            }
        }

        return mcpSyncClients;
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    public CloseableMcpSyncClients makeSyncClientsClosable(List<McpSyncClient> clients) {
        return new CloseableMcpSyncClients(clients);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    McpSyncClientConfigurer mcpSyncClientConfigurer(ObjectProvider<McpSyncClientCustomizer> customizerProvider) {
        return new McpSyncClientConfigurer(customizerProvider.orderedStream().toList());
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "ASYNC"
    )
    public List<McpAsyncClient> mcpAsyncClients(McpAsyncClientConfigurer mcpAsyncClientConfigurer, McpClientCommonProperties commonProperties, ObjectProvider<List<NamedClientMcpTransport>> transportsProvider) {
        List<McpAsyncClient> mcpAsyncClients = new ArrayList();
        List<NamedClientMcpTransport> namedTransports = transportsProvider.stream().flatMap(Collection::stream).toList();
        if (!CollectionUtils.isEmpty(namedTransports)) {
            for(NamedClientMcpTransport namedTransport : namedTransports) {
                McpSchema.Implementation clientInfo = new McpSchema.Implementation(this.connectedClientName(commonProperties.getName(), namedTransport.name()), commonProperties.getVersion());
                McpClient.AsyncSpec spec = McpClient.async(namedTransport.transport()).clientInfo(clientInfo).requestTimeout(commonProperties.getRequestTimeout());
                spec = mcpAsyncClientConfigurer.configure(namedTransport.name(), spec);
                McpAsyncClient client = spec.build();
                if (commonProperties.isInitialized()) {
                    client.initialize().block();
                }

                mcpAsyncClients.add(client);
            }
        }

        return mcpAsyncClients;
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "ASYNC"
    )
    public CloseableMcpAsyncClients makeAsyncClientsClosable(List<McpAsyncClient> clients) {
        return new CloseableMcpAsyncClients(clients);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "ASYNC"
    )
    McpAsyncClientConfigurer mcpAsyncClientConfigurer(ObjectProvider<McpAsyncClientCustomizer> customizerProvider) {
        return new McpAsyncClientConfigurer(customizerProvider.orderedStream().toList());
    }

    public static record CloseableMcpSyncClients(List<McpSyncClient> clients) implements AutoCloseable {
        public void close() {
            this.clients.forEach(McpSyncClient::close);
        }
    }

    public static record CloseableMcpAsyncClients(List<McpAsyncClient> clients) implements AutoCloseable {
        public void close() {
            this.clients.forEach(McpAsyncClient::close);
        }
    }
}
```

#### McpToolCallbackAutoConfiguration

用于自动装配 MCP 客户端与 Spring AI 的 ToolCallback 集成的 Bean，主要作用如下

- 自动装配 MCP 工具回调：自动为所有已配置的 MCP 客户端（同步或异步）创建对应的 ToolCallbackProvider
- 条件生效（由 McpToolCallbackAutoConfigurationCondition 条件装配类控制）：仅在 spring.ai.mcp.client.enabled=true 且 spring.ai.mcp.client.toolcallback.enabled=true、时生效，确保按需启用
- 客户端支持：支持为所有已配置的 MCP 客户端（支持多连接）批量创建工具回调，便于多服务器/多通道场景下的统一管理

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>mcpToolCallbacks<br/></td><td>提供SyncMcpToolCallbackProvider的Bean，为所有同步 MCP 客户端创建ToolCallback<br/></td></tr>
<tr>
<td>mcpAsyncToolCallbacks<br/></td><td>提供AsyncMcpToolCallbackProvider的Bean，为所有异步 MCP 客户端创建ToolCallback<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp.client.autoconfigure;

import io.modelcontextprotocol.client.McpAsyncClient;
import io.modelcontextprotocol.client.McpSyncClient;
import java.util.Collection;
import java.util.List;
import org.springframework.ai.mcp.AsyncMcpToolCallbackProvider;
import org.springframework.ai.mcp.SyncMcpToolCallbackProvider;
import org.springframework.ai.mcp.client.autoconfigure.properties.McpClientCommonProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.AllNestedConditions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.ConfigurationCondition.ConfigurationPhase;

@AutoConfiguration(
    after = {McpClientAutoConfiguration.class}
)
@EnableConfigurationProperties({McpClientCommonProperties.class})
@Conditional({McpToolCallbackAutoConfigurationCondition.class})
public class McpToolCallbackAutoConfiguration {
    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "SYNC",
        matchIfMissing = true
    )
    public SyncMcpToolCallbackProvider mcpToolCallbacks(ObjectProvider<List<McpSyncClient>> syncMcpClients) {
        List<McpSyncClient> mcpClients = syncMcpClients.stream().flatMap(Collection::stream).toList();
        return new SyncMcpToolCallbackProvider(mcpClients);
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "spring.ai.mcp.client",
        name = {"type"},
        havingValue = "ASYNC"
    )
    public AsyncMcpToolCallbackProvider mcpAsyncToolCallbacks(ObjectProvider<List<McpAsyncClient>> mcpClientsProvider) {
        List<McpAsyncClient> mcpClients = mcpClientsProvider.stream().flatMap(Collection::stream).toList();
        return new AsyncMcpToolCallbackProvider(mcpClients);
    }

    public static class McpToolCallbackAutoConfigurationCondition extends AllNestedConditions {
        public McpToolCallbackAutoConfigurationCondition() {
            super(ConfigurationPhase.PARSECONFIGURATION);
        }

        @ConditionalOnProperty(
            prefix = "spring.ai.mcp.client",
            name = {"enabled"},
            havingValue = "true",
            matchIfMissing = true
        )
        static class McpAutoConfigEnabled {
        }

        @ConditionalOnProperty(
            prefix = "spring.ai.mcp.client.toolcallback",
            name = {"enabled"},
            havingValue = "true",
            matchIfMissing = true
        )
        static class ToolCallbackProviderEnabled {
        }
    }
}
```

### SpringAI 下的 MCP

#### SyncMcpToolCallbackProvider

集成 MCP 同步客户端的 ToolCallbackProvider，负责从一个或多个 MCP 同步服务器（通过 McpSyncClient）自动发现、收集所有可用的工具，支持对工具进行过滤，确保工具名唯一

- `List<McpSyncClient> mcpClients`：存储所有需要集成的 MCP 同步客户端实例，用于从多个 MCP 服务器拉取工具列表
- `BiPredicate<McpSyncClient, Tool> toolFilter`：工具过滤器，允许根据客户端和工具元数据自定义过滤逻辑，决定哪些工具被暴露

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>SyncMcpToolCallbackProvider<br/></td><td>根据MCP同步客户端、工具过滤器等实现构造器<br/></td></tr>
<tr>
<td>getToolCallbacks<br/></td><td>从所有 MCP 客户端拉取工具列表，应用过滤器，包装为 SyncMcpToolCallback，并校验工具名唯一性，最终返回所有可用工具的回调数组<br/></td></tr>
<tr>
<td>syncToolCallbacks<br/></td><td>静态工具方法，快速从一组 MCP 客户端获取所有工具回调，便于批量集成<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp;

import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.List;
import java.util.function.BiPredicate;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;

public class SyncMcpToolCallbackProvider implements ToolCallbackProvider {
    private final List<McpSyncClient> mcpClients;
    private final BiPredicate<McpSyncClient, McpSchema.Tool> toolFilter;

    public SyncMcpToolCallbackProvider(BiPredicate<McpSyncClient, McpSchema.Tool> toolFilter, List<McpSyncClient> mcpClients) {
        Assert.notNull(mcpClients, "MCP clients must not be null");
        Assert.notNull(toolFilter, "Tool filter must not be null");
        this.mcpClients = mcpClients;
        this.toolFilter = toolFilter;
    }

    public SyncMcpToolCallbackProvider(List<McpSyncClient> mcpClients) {
        this((mcpClient, tool) -> true, mcpClients);
    }

    public SyncMcpToolCallbackProvider(BiPredicate<McpSyncClient, McpSchema.Tool> toolFilter, McpSyncClient... mcpClients) {
        this(toolFilter, List.of(mcpClients));
    }

    public SyncMcpToolCallbackProvider(McpSyncClient... mcpClients) {
        this(List.of(mcpClients));
    }

    public ToolCallback[] getToolCallbacks() {
        ToolCallback[] array = (ToolCallback[])this.mcpClients.stream().flatMap((mcpClient) -> mcpClient.listTools().tools().stream().filter((tool) -> this.toolFilter.test(mcpClient, tool)).map((tool) -> new SyncMcpToolCallback(mcpClient, tool))).toArray((x$0) -> new ToolCallback[x$0]);
        this.validateToolCallbacks(array);
        return array;
    }

    private void validateToolCallbacks(ToolCallback[] toolCallbacks) {
        List<String> duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
        if (!duplicateToolNames.isEmpty()) {
            throw new IllegalStateException("Multiple tools with the same name (%s)".formatted(String.join(", ", duplicateToolNames)));
        }
    }

    public static List<ToolCallback> syncToolCallbacks(List<McpSyncClient> mcpClients) {
        return CollectionUtils.isEmpty(mcpClients) ? List.of() : List.of((new SyncMcpToolCallbackProvider(mcpClients)).getToolCallbacks());
    }
}
```

##### SyncMcpToolCallback

MCP 同步工具适配为 SpringAI 中 ToolCallback 的桥接实现

- `McpSyncClient mcpClient`：MCP 同步客户端实例，负责与 MCP 服务器通信、发起工具调用
- `Tool tool`：MCP 工具定义对象，包含工具的名称、描述、输入参数 schema 等元数据

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>SyncMcpToolCallback<br/></td><td>根据MCP同步客户端、工具定义实现构造器<br/></td></tr>
<tr>
<td>getToolDefinition<br/></td><td>将 MCP 工具定义转换为 Spring AI 的 ToolDefinition，包括名称（带前缀防止冲突）、描述、输入参数 schema（JSON 格式）<br/></td></tr>
<tr>
<td>call<br/></td><td>执行工具调用。将 JSON 字符串参数转为 Map，调用 MCP 工具，处理异常和错误，并将结果序列化为 JSON 字符串返回<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp;

import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.Map;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.model.ModelOptionsUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.DefaultToolDefinition;
import org.springframework.ai.tool.definition.ToolDefinition;

public class SyncMcpToolCallback implements ToolCallback {
    private final McpSyncClient mcpClient;
    private final McpSchema.Tool tool;

    public SyncMcpToolCallback(McpSyncClient mcpClient, McpSchema.Tool tool) {
        this.mcpClient = mcpClient;
        this.tool = tool;
    }

    public ToolDefinition getToolDefinition() {
        return DefaultToolDefinition.builder().name(McpToolUtils.prefixedToolName(this.mcpClient.getClientInfo().name(), this.tool.name())).description(this.tool.description()).inputSchema(ModelOptionsUtils.toJsonString(this.tool.inputSchema())).build();
    }

    public String call(String functionInput) {
        Map<String, Object> arguments = ModelOptionsUtils.jsonToMap(functionInput);
        McpSchema.CallToolResult response = this.mcpClient.callTool(new McpSchema.CallToolRequest(this.tool.name(), arguments));
        if (response.isError() != null && response.isError()) {
            throw new IllegalStateException("Error calling tool: " + String.valueOf(response.content()));
        } else {
            return ModelOptionsUtils.toJsonString(response.content());
        }
    }

    public String call(String toolArguments, ToolContext toolContext) {
        return this.call(toolArguments);
    }
}
```

#### AsyncMcpToolCallbackProvider

集成 MCP 异步客户端的 ToolCallbackProvider，其余同 SyncMcpToolCallbackProvider 一致

- `List<McpAsyncClient> mcpClients`：存储所有需要集成的 MCP 同步客户端实例，用于从多个 MCP 服务器拉取工具列表
- `BiPredicate<McpAsyncClient, Tool> toolFilter`：工具过滤器，允许根据客户端和工具元数据自定义过滤逻辑，决定哪些工具被暴露

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>AsyncMcpToolCallbackProvider<br/></td><td>根据MCP异步客户端、工具过滤器等实现构造器<br/></td></tr>
<tr>
<td>getToolCallbacks<br/></td><td>从所有 MCP 客户端拉取工具列表，应用过滤器，包装为 AsyncMcpToolCallback，并校验工具名唯一性，最终返回所有可用工具的回调数组<br/></td></tr>
<tr>
<td>asyncToolCallbacks<br/></td><td>静态工具方法，快速从一组 MCP 客户端获取所有工具回调，便于批量集成<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp;

import io.modelcontextprotocol.client.McpAsyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.util.Assert;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiPredicate;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;

public class AsyncMcpToolCallbackProvider implements ToolCallbackProvider {
    private final List<McpAsyncClient> mcpClients;
    private final BiPredicate<McpAsyncClient, McpSchema.Tool> toolFilter;

    public AsyncMcpToolCallbackProvider(BiPredicate<McpAsyncClient, McpSchema.Tool> toolFilter, List<McpAsyncClient> mcpClients) {
        Assert.notNull(mcpClients, "MCP clients must not be null");
        Assert.notNull(toolFilter, "Tool filter must not be null");
        this.mcpClients = mcpClients;
        this.toolFilter = toolFilter;
    }

    public AsyncMcpToolCallbackProvider(List<McpAsyncClient> mcpClients) {
        this((mcpClient, tool) -> true, mcpClients);
    }

    public AsyncMcpToolCallbackProvider(BiPredicate<McpAsyncClient, McpSchema.Tool> toolFilter, McpAsyncClient... mcpClients) {
        this(toolFilter, List.of(mcpClients));
    }

    public AsyncMcpToolCallbackProvider(McpAsyncClient... mcpClients) {
        this(List.of(mcpClients));
    }

    public ToolCallback[] getToolCallbacks() {
        List<ToolCallback> toolCallbackList = new ArrayList();

        for(McpAsyncClient mcpClient : this.mcpClients) {
            ToolCallback[] toolCallbacks = (ToolCallback[])mcpClient.listTools().map((response) -> (ToolCallback[])response.tools().stream().filter((tool) -> this.toolFilter.test(mcpClient, tool)).map((tool) -> new AsyncMcpToolCallback(mcpClient, tool)).toArray((x$0) -> new ToolCallback[x$0])).block();
            this.validateToolCallbacks(toolCallbacks);
            toolCallbackList.addAll(List.of(toolCallbacks));
        }

        return (ToolCallback[])toolCallbackList.toArray(new ToolCallback[0]);
    }

    private void validateToolCallbacks(ToolCallback[] toolCallbacks) {
        List<String> duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
        if (!duplicateToolNames.isEmpty()) {
            throw new IllegalStateException("Multiple tools with the same name (%s)".formatted(String.join(", ", duplicateToolNames)));
        }
    }

    public static Flux<ToolCallback> asyncToolCallbacks(List<McpAsyncClient> mcpClients) {
        return CollectionUtils.isEmpty(mcpClients) ? Flux.empty() : Flux.fromArray((new AsyncMcpToolCallbackProvider(mcpClients)).getToolCallbacks());
    }
}
```

##### AsyncMcpToolCallback

MCP 异步工具适配为 SpringAI 中 ToolCallback 的桥接实现

- `McpAsyncClient mcpClient`：MCP 异步客户端实例，负责与 MCP 服务器通信、发起工具调用
- `Tool tool`：MCP 工具定义对象，包含工具的名称、描述、输入参数 schema 等元数据

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>AsyncMcpToolCallback<br/></td><td>根据MCP异步客户端、工具定义实现构造器<br/></td></tr>
<tr>
<td>getToolDefinition<br/></td><td>将 MCP 工具定义转换为 Spring AI 的 ToolDefinition，包括名称（带前缀防止冲突）、描述、输入参数 schema（JSON 格式）<br/></td></tr>
<tr>
<td>call<br/></td><td>执行工具调用。将 JSON 字符串参数转为 Map，调用 MCP 工具，处理异常和错误，并将结果序列化为 JSON 字符串返回<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp;

import io.modelcontextprotocol.client.McpAsyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.Map;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.model.ModelOptionsUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.DefaultToolDefinition;
import org.springframework.ai.tool.definition.ToolDefinition;

public class AsyncMcpToolCallback implements ToolCallback {
    private final McpAsyncClient asyncMcpClient;
    private final McpSchema.Tool tool;

    public AsyncMcpToolCallback(McpAsyncClient mcpClient, McpSchema.Tool tool) {
        this.asyncMcpClient = mcpClient;
        this.tool = tool;
    }

    public ToolDefinition getToolDefinition() {
        return DefaultToolDefinition.builder().name(McpToolUtils.prefixedToolName(this.asyncMcpClient.getClientInfo().name(), this.tool.name())).description(this.tool.description()).inputSchema(ModelOptionsUtils.toJsonString(this.tool.inputSchema())).build();
    }

    public String call(String functionInput) {
        Map<String, Object> arguments = ModelOptionsUtils.jsonToMap(functionInput);
        return (String)this.asyncMcpClient.callTool(new McpSchema.CallToolRequest(this.tool.name(), arguments)).map((response) -> {
            if (response.isError() != null && response.isError()) {
                throw new IllegalStateException("Error calling tool: " + String.valueOf(response.content()));
            } else {
                return ModelOptionsUtils.toJsonString(response.content());
            }
        }).block();
    }

    public String call(String toolArguments, ToolContext toolContext) {
        return this.call(toolArguments);
    }
}
```

#### McpToolUtils

作为 SpringAI 与 MCP 协议集成的工具类，负责将 SpringAI 的 ToolCallback 转换为 MCP 协议兼容的同步/异步工具规范

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>prefixedToolName<br/></td><td>避免工具名冲突，确保命名唯一性<br/></td></tr>
<tr>
<td>toSyncToolSpecification<br/></td><td>将ToolCallback转换为SyncToolSpecification<br/></td></tr>
<tr>
<td>toSyncToolSpecifications<br/></td><td>批量将ToolCallback转换为SyncToolSpecification<br/></td></tr>
<tr>
<td>getToolCallbacksFromSyncClients<br/></td><td>从多个同步 MCP 客户端中提取ToolCallback<br/></td></tr>
<tr>
<td>toAsyncToolSpecification<br/></td><td>将ToolCallback转换为AsyncToolSpecification<br/></td></tr>
<tr>
<td>toAsyncToolSpecifications<br/></td><td>批量将ToolCallback转换为AsyncToolSpecification<br/></td></tr>
<tr>
<td>getToolCallbacksFromAsyncClients<br/></td><td>从多个异步 MCP 客户端中提取ToolCallback<br/></td></tr>
<tr>
<td>getMcpExchange<br/></td><td>从 ToolContext 中提取 MCP 交换对象，用于在工具调用时传递 MCP 上下文信息<br/></td></tr>
</table>


```java
package org.springframework.ai.mcp;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.micrometer.common.util.StringUtils;
import io.modelcontextprotocol.client.McpAsyncClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpSchema.Role;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.model.ModelOptionsUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.lang.Nullable;
import org.springframework.util.CollectionUtils;
import org.springframework.util.MimeType;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

public final class McpToolUtils {
    public static final String TOOLCONTEXTMCPEXCHANGEKEY = "exchange";

    private McpToolUtils() {
    }

    public static String prefixedToolName(String prefix, String toolName) {
        if (!StringUtils.isEmpty(prefix) && !StringUtils.isEmpty(toolName)) {
            String input = prefix + "" + toolName;
            String formatted = input.replaceAll("[^a-zA-Z0-9-]", "");
            formatted = formatted.replaceAll("-", "");
            if (formatted.length() > 64) {
                formatted = formatted.substring(formatted.length() - 64);
            }

            return formatted;
        } else {
            throw new IllegalArgumentException("Prefix or toolName cannot be null or empty");
        }
    }

    public static List<McpServerFeatures.SyncToolSpecification> toSyncToolSpecification(List<ToolCallback> toolCallbacks) {
        return toolCallbacks.stream().map(McpToolUtils::toSyncToolSpecification).toList();
    }

    public static List<McpServerFeatures.SyncToolSpecification> toSyncToolSpecifications(ToolCallback... toolCallbacks) {
        return toSyncToolSpecification(List.of(toolCallbacks));
    }

    public static McpServerFeatures.SyncToolSpecification toSyncToolSpecification(ToolCallback toolCallback) {
        return toSyncToolSpecification(toolCallback, (MimeType)null);
    }

    public static McpServerFeatures.SyncToolSpecification toSyncToolSpecification(ToolCallback toolCallback, MimeType mimeType) {
        McpSchema.Tool tool = new McpSchema.Tool(toolCallback.getToolDefinition().name(), toolCallback.getToolDefinition().description(), toolCallback.getToolDefinition().inputSchema());
        return new McpServerFeatures.SyncToolSpecification(tool, (exchange, request) -> {
            try {
                String callResult = toolCallback.call(ModelOptionsUtils.toJsonString(request), new ToolContext(Map.of("exchange", exchange)));
                return mimeType != null && mimeType.toString().startsWith("image") ? new McpSchema.CallToolResult(List.of(new McpSchema.ImageContent(List.of(Role.ASSISTANT), (Double)null, callResult, mimeType.toString())), false) : new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(callResult)), false);
            } catch (Exception e) {
                return new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(e.getMessage())), true);
            }
        });
    }

    public static Optional<McpSyncServerExchange> getMcpExchange(ToolContext toolContext) {
        return toolContext != null && toolContext.getContext().containsKey("exchange") ? Optional.ofNullable((McpSyncServerExchange)toolContext.getContext().get("exchange")) : Optional.empty();
    }

    public static List<McpServerFeatures.AsyncToolSpecification> toAsyncToolSpecifications(List<ToolCallback> toolCallbacks) {
        return toolCallbacks.stream().map(McpToolUtils::toAsyncToolSpecification).toList();
    }

    public static List<McpServerFeatures.AsyncToolSpecification> toAsyncToolSpecifications(ToolCallback... toolCallbacks) {
        return toAsyncToolSpecifications(List.of(toolCallbacks));
    }

    public static McpServerFeatures.AsyncToolSpecification toAsyncToolSpecification(ToolCallback toolCallback) {
        return toAsyncToolSpecification(toolCallback, (MimeType)null);
    }

    public static McpServerFeatures.AsyncToolSpecification toAsyncToolSpecification(ToolCallback toolCallback, MimeType mimeType) {
        McpServerFeatures.SyncToolSpecification syncToolSpecification = toSyncToolSpecification(toolCallback, mimeType);
        return new McpServerFeatures.AsyncToolSpecification(syncToolSpecification.tool(), (exchange, map) -> Mono.fromCallable(() -> (McpSchema.CallToolResult)syncToolSpecification.call().apply(new McpSyncServerExchange(exchange), map)).subscribeOn(Schedulers.boundedElastic()));
    }

    public static List<ToolCallback> getToolCallbacksFromSyncClients(McpSyncClient... mcpClients) {
        return getToolCallbacksFromSyncClients(List.of(mcpClients));
    }

    public static List<ToolCallback> getToolCallbacksFromSyncClients(List<McpSyncClient> mcpClients) {
        return CollectionUtils.isEmpty(mcpClients) ? List.of() : List.of((new SyncMcpToolCallbackProvider(mcpClients)).getToolCallbacks());
    }

    public static List<ToolCallback> getToolCallbacksFromAsyncClients(McpAsyncClient... asyncMcpClients) {
        return getToolCallbacksFromAsyncClients(List.of(asyncMcpClients));
    }

    public static List<ToolCallback> getToolCallbacksFromAsyncClients(List<McpAsyncClient> asyncMcpClients) {
        return CollectionUtils.isEmpty(asyncMcpClients) ? List.of() : List.of((new AsyncMcpToolCallbackProvider(asyncMcpClients)).getToolCallbacks());
    }

    @JsonIgnoreProperties(
        ignoreUnknown = true
    )
    private static record Base64Wrapper(MimeType mimeType, String data) {
        private Base64Wrapper(@JsonAlias({"mimetype"}) @Nullable MimeType mimeType, @JsonAlias({"base64", "b64", "imageData"}) @Nullable String data) {
            this.mimeType = mimeType;
            this.data = data;
        }

        @JsonAlias({"mimetype"})
        @Nullable
        public MimeType mimeType() {
            return this.mimeType;
        }

        @JsonAlias({"base64", "b64", "imageData"})
        @Nullable
        public String data() {
            return this.data;
        }
    }
}
```
