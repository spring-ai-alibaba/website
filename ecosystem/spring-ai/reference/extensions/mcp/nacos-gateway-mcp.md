# MCP 的网关

### 背景

Spring AI Alibaba MCP Gateway 基于 Nacos 提供的 MCP server registry 实现，为普通应用建立一个中间代理层 Java MCP 应用。一方面将 Nacos 中注册的服务信息转换成 MCP 协议的服务器信息，以便 MCP 客户端可以无缝调用这些服务；另一方面可以实现协议转化，将 MCP 协议转换为对后端 HTTP、Dubbo 等服务的调用。基于 Spring AI Alibaba MCP Gateway，您无需对原有业务代码进行改造，新增或者删除 MCP 服务（在 Nacos 中）无需重启代理应用。

示例代码可见：[https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/server/mcp-nacos-gateway-example](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/server/mcp-nacos-gateway-example)

### pom 依赖

```xml
<dependencies>
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-gateway</artifactId>
        <version>${spring-ai-extensions.version}</version>
    </dependency>

    <!-- MCP Server WebFlux 支持（也可换成 WebMvc） -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

</dependencies>
```

### application.yml 文件

```yaml
server:
  port: 19000

spring:
  application:
    name: mcp-gateway-server
  ai:
    mcp:
      server:
        name: mcp-nacos-gateway-example
        version: 1.0.0
        enabled: true
        protocol: _streamable_
_        _streamable-http:
          mcp-endpoint: /mcp
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}

    alibaba:
      mcp:
        gateway:
          enabled: true
          nacos:
            service-names: mcp-nacos-restful # 注册至nacos中的restful，新命名的mcp服务名
        nacos:
          namespace: 0908ca08-c382-404c-9d96-37fe1628b183
          server-addr: 127.0.0.1:8848
          username: nacos
          password: nacos
```

### 存量 restful

事先准备好一个存量 restful 服务（DEFAULT/nacos-restful），该服务已被注册至 Nacos 中。

- 填写工具名称、工具描述 -> 时间服务
- 选择对应工具对应的接口
- 根据 restful 接口响应，选择响应模版
![nacos-gateway-1](/img/blog/extensions/mcp/nacos-gateway-1.png)

### 验证

启动 gateway 服务，我们发现 restful 服务的工具已经被添加了

![nacos-gateway-2](/img/blog/extensions/mcp/nacos-gateway-2.png)

启动一个 mcp client 连接 Gateway 提供的 mcp 服务，触发时间工具

![nacos-gateway-3](/img/blog/extensions/mcp/nacos-gateway-3.png)

Gateway 被触发调用 restful 服务

![nacos-gateway-4](/img/blog/extensions/mcp/nacos-gateway-14png)

restful 接收请求

![nacos-gateway-6](/img/blog/extensions/mcp/nacos-gateway-6.png)
