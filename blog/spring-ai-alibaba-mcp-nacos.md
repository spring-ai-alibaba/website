---
title: Spring AI Alibaba + Nacos 发布企业级 MCP 分布式部署方案！
tags: [ Spring AI Alibaba, Nacos, Nacos3, MCP，分布式部署]
description: Spring AI Alibaba MCP 联合 Nacos，解决了企业级 AI Agent 的应用与落地场景中 MCP 分布式部署与动态更新的关键问题，其中包括流量的负载均衡、节点变更动态感知等关键解决方案。
authors: [GTyingzi, chickenlj]
date: "2025-06-16"
slug: spring-ai-alibaba-mcp-nacos
category: article
---

Spring AI 通过集成 MCP 官方的 java sdk，让 Spring Boot 开发者可以非常方便的开发自己的 MCP 服务，把自己企业内部的业务系统通过标准 MCP 形式发布为 AI Agent 能够接入的工具；另一方面，开发者也可以使用 Spring AI 开发自己的 AI Agent，去接入提供各种能力的 MCP 服务。

<!-- truncate -->

在企业级 AI Agent 的应用与落地场景，只是能发布或者调通 MCP 服务是远远不够的，其中一个非常重要的原因就是企业级的系统部署往往都是分布式的，不论是 Agent 还是 MCP Server，作为企业内部的一个个应用，它们都是要部署在多个机器上，要支持分布式的调用（这包括流量的负载均衡、节点变更动态感知等）。这么分析起来，Agent 与 MCP 需要的分布式能力与我们熟知微服务架构基本是一致的，Spring AI MCP 只是解决了 Agent 与 MCP 服务的编码与通信协议问题，我们还需要为 MCP 服务构建起一套地址自动发现、负载均衡调用的体系，这就是 Spring AI Alibaba MCP 整体方案解决的问题，接下来我们将在这篇文章中详细展开。

## 企业级 MCP 部署需要的分布式能力
市面上有很多公开可用的 MCP 服务，如生活类的高德地图、天气预报等 MCP 服务，这类服务的一个特点是他们都通过公开可访问的域名地址提供服务，因此对于消费端来说只需要配置访问地址即可使用。

区别于此类公共服务，Spring AI Alibaba MCP 解决的是企业内部 MCP 服务的部署与访问架构问题，接下来我们通过一个 Agent 的开发示例，一起来看一下 Spring AI Alibaba MCP 的整体架构。

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img.png)

在整个系统中，我们有一个使用 Spring AI Alibaba 开发的 MCP Server 应用，它为企业内提供机票预订的服务，该应用部署在多个实例，在实例启动过程中，Spring AI Alibaba 框架会将当前 IP 实例、工具列表等元数据注册到 Nacos，机票助手是一个基于 Spring AI Alibaba 开发的智能体应用，借助 Spring AI Alibaba 封装的分布式 MCP 能力，机票助手能够动态感知 MCP 订票系统的实例变化、工具变化，并基于内置的负载均衡策略对多个 MCP 实例节点发起调用。

1. 企业内部订票服务是一个独立的 MCP Server 应用，使用 Spring AI Alibaba 框架开发，具备自动注册 MCP 实例与元数据到 Nacos 注册中心的能力，目前同时兼容 Nacos2 与 Nacos3。
2. 机票助手 Agent 使用 Spring AI Alibaba 框架开发，作为 MCP Client 可以自动感知下游 MCP 服务实例的动态变化，动态感知 MCP 服务元数据的变化（如工具增加、参数更新、描述更新等），能够在保证负载均衡的情况下调用后端实例。

## 适用业务场景
对于任何需要在企业内部构建 MCP 业务系统的开发者，都可以使用 Spring AI Alibaba MCP

接下来，我们从企业现实情况出发，分析在不同场景下，应该如何发布自己的 MCP 服务，并将Agent接入 MCP 服务：

1. 企业内存在大量的已有微服务应用、HTTP接口，需要将这些应用或接口发布为 MCP 服务
2. 无需考虑存量应用，直接开发全新的 MCP 服务

### 通过 MCP 接入存量业务系统
对于存量应用或接口的接入，我们推荐使用增加代理应用的模式实现平滑接入，如下架构图所示，在存量应用和 Agent 之间部署一个新应用，这个应用主要有两个职责：

1. 作为 server，该应用是一个标准的 MCP server，对外发布 Agent 可以使用的 MCP Tool。
2. 作为 client，该应用负责转发 MCP 请求到后端应用，它使用 HttpClient 或 Dubbo 消费后端的存量应用。

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/saa-mcp-proxy.png)

以下是一个代码片段，展示如何在新开发的 MCP Server 应用中定义 MCP 服务并代理转发到后端微服务（rest 或 dubbo）：

```java
@Bean
@LoadBalanced
public RestTemplate restTemplate() {
    return new RestTemplate();
}

// ......

@Autowired
private RestTemplate restTemplate;

@Tool(description = "获取指定订单号的订单详情")
public Order getAirQuality(@ToolParam(description = "订单号") String orderId) {
   return restTemplate.getForObject("http://order-service/order?id" + orderId, Order.class)
}
```

其中，`restTemplate`基于 Spring Cloud Alibaba 的服务发现能力，可以动态发现后端 `order-service`服务与实例地址。而`@Tool`和`@ToolParam`注解将发布为可被 Agent 使用的 MCP 工具。

### 开发全新 MCP
如果您不需要考虑存量的应用或服务，则整体会更简单，只需要使用 Spring AI Alibaba MCP 开发一个 MCP server，并将业务逻辑发布为 MCP tool 就可以了。

以下是使用 Spring AI Alibaba 开发的整体架构图：

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_1.png)

## 完整开发指南
以下示例完整源码地址：[https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example/starter-example)

首先，您需要安装部署 Nacos，访问 Nacos Server 控制台，创建 MCP 服务专属的命名空间 `nacos-default-mcp`。

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_2.png)

注册 `nacos-default-mcp` 命名空间后，记住命名空间 ID：9ba5f1aa-b37d-493b-9057-72918a40ef35

### 开发 Spring AI Alibaba MCP Server

#### pom.xml 文件

添加如下`spring-ai-alibaba-starter-nacos-mcp-server`关键 starter 依赖到项目中：

```xml
<properties>
    <spring-ai.version>1.0.0</spring-ai.version>
    <ai-alibaba.version>1.0.0.2</ai-alibaba.version>
</properties>
<dependencies>
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-nacos-mcp-server</artifactId>
        <version>${ai-alibaba.version}</version>
    </dependency>
</dependencies>

```

##### 修改 `application.yml` 文件
在 `application.yml` 文件中，增加 Nacos 地址配置，这样应用就可以连接到 Nacos Server 并实现 MCP 地址与元数据自动注册。

```yaml
server:
  port: ${SERVER_PORT:19000}
spring:
  application:
    name: mcp-server-provider
---
spring:
  main:
    banner-mode: off
  ai:
    mcp:
      server:
        name: mcp-server-provider
        version: 1.0.1
        sse-message-endpoint: /mcp/messages_
        type: SYNC
    alibaba:
      mcp:
        nacos:
          enabled: true
          server-addr: 127.0.0.1:8848
          username: nacos
          password: nacos
          registry:
              service-namespace: 9ba5f1aa-b37d-493b-9057-72918a40ef35

_# 调试日志_
logging:
  level:
    io:
      modelcontextprotocol:
        client: DEBUG
        spec: DEBUG
        server: DEBUG
```

这里注意两个配置：

1. MCP Server 的服务名称：mcp-server-provider
2. MCP 的命名空间 ID：9ba5f1aa-b37d-493b-9057-72918a40ef35

##### 效果演示
打开 Nacos 控制台，可以看到 MCP Server 自动注册服务与实例信息。

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_3.png)

打开 Nacos 控制台，可以查看 MCP Server 自动注册上来的元数据信息

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_4.png)

### 开发 Spring AI Alibaba MCP Client

#### pom.xml 文件

```java
<properties>
    <spring-ai.version>1.0.0</spring-ai.version>
    <ai-alibaba.version>1.0.0.2</ai-alibaba.version>
</properties>
<dependencies>
   <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-nacos-mcp-client</artifactId>
        <version>${ai-alibaba.version}</version>
    </dependency>
</dependencies>

```

这里需要在应用中新增引入 `spring-ai-alibaba-starter-nacos-mcp-client` 依赖。

##### application.yml 文件
在 `application.yml` 文件中，增加 Nacos 地址配置，这样应用就可以连接到 Nacos Server 并实现 MCP 地址与元数据自动发现。

```yaml
server:
  port: 8080

spring:
  application:
    name: mcp-client-webflux
  ai:
    openai:
      api-key: ${DASHSCOPE_API_KEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max
    alibaba:
      mcp:
        nacos:
          enabled: true
          service-namespace: 9ba5f1aa-b37d-493b-9057-72918a40ef35 # nacos的命名空间ID
          server-addr: 127.0.0.1:8848
          username: nacos
          password: nacos

        client:
          sse:
            connections:
              server1: mcp-server-provider # 对应的MCP Server服务名
    mcp:
      client:
        enabled: true
        name: mcp-client-webflux
        version: 0.0.1
        initialized: true
        request-timeout: 600s

        nacos-enabled: true

        type: sync
        toolcallback:
          enabled: true
        root-change-notification: true


# 调试日志
logging:
  level:
    io:
      modelcontextprotocol:
        client: DEBUG
        spec: DEBUG
```

请注意，我们需要在配置中指定要连接的 MCP 服务，这样 Client 将只订阅该服务相关地址与元数据的更新

```yaml
  client:
    sse:
      connections:
        server1: mcp-server-provider # 对应的MCP Server服务名
```

##### 使用方式
MCP Client 注入

```java
@Autowired
private List<LoadbalancedMcpSyncClient> mcpClients;  // For sync client

// OR

@Autowired
private List<LoadbalancedMcpAsyncClient> mcpClients;  // For async client
```

ToolCallbackProvider 注入

```yaml
# sync类型，Bean名称为"loadbalancedSyncMcpToolCallbacks"
@Autowired
private LoadbalancedSyncMcpToolCallbackProvider toolCallbackProvider;
ToolCallback[] toolCallbacks = toolCallbackProvider.getToolCallbacks();

// OR

# Async类型，Bean名称为"loadbalancedMcpAsyncToolCallbacks"
@Autowired
private LoadbalancedAsyncMcpToolCallbackProvider toolCallbackProvider;
ToolCallback[] toolCallbacks = toolCallbackProvider.getToolCallbacks();
```

##### 效果演示
MCP Client 注入

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_5.png)

ToolCallbackProvider 注入

![Spring AI Alibaba MCP Nacos](/img/blog/mcp-nacos/img_6.png)

## 总结
Spring AI Alibaba MCP 联合 Nacos，解决了企业级 AI Agent 的应用与落地场景中 MCP 分布式部署与动态更新的关键问题，其中包括流量的负载均衡、节点变更动态感知等关键解决方案。

1. 查看完整示例源码：[spring-ai-alibaba-mcp-example](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-mcp-example)
2. Github 项目仓库：[https://github.com/alibaba/spring-ai-alibaba](https://github.com/alibaba/spring-ai-alibaba)
