# MCP 服务认证

背景：MCP Server 服务，只为携带特定请求头 token 的提供服务

示例代码

- server：[https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-auth-example/server/mcp-auth-web-server](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-auth-example/server/mcp-auth-web-server)
- client：[https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-auth-example/client/mcp-auth-client](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-auth-example/client/mcp-auth-client)

## server

### pom 依赖

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
    </dependency>
</dependencies>
```

### application 文件

```yaml
server:
  port: 20000

spring:
  application:
     name: mcp-auth-web-server
  ai:
    mcp:
      server:
        name: streamable-mcp-server
        protocol: STREAMABLE # SSE、STREAMABLE、STATELESS
        version: 1.0.0
        type: ASYNC  # Recommended for reactive applications
        instructions: "This reactive server provides time information tools and resources"
        request-timeout: 20s
        streamable-http:
          mcp-endpoint: /mcp
          keep-alive-interval: 30s
          disallow-delete: false
```

### 过滤器链（核心）

```java
@Component
public class McpServerFilter implements WebFilter {

    private static final String TOKENHEADER = "token-1";
    private static final String TOKENVALUE = "yingzi-1";

    private static final Logger logger = LoggerFactory.getLogger(McpServerFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        // 获取请求头中的token值
        HttpHeaders headers = exchange.getRequest().getHeaders();
        // 打印所有请求头信息
        for (String headerName : headers.keySet()) {
            logger.info("Header {}: {}", headerName, headers.getFirst(headerName));
        }

        String token = headers.getFirst(TOKENHEADER);
        // 检查token是否存在且值正确
        if (TOKENVALUE.equals(token)) {
            logger.info("preHandle: 验证通过");
            logger.info("preHandle: 请求的URL: {}", exchange.getRequest().getURI());
            logger.info("preHandle: 请求的TOKEN: {}", token);
            // token验证通过，继续处理请求
            return chain.filter(exchange);
        } else {
            // token验证失败，返回401未授权错误
            logger.warn("Token验证失败: 请求的URL: {}, 提供的TOKEN: {}", exchange.getRequest().getURI(), token);
            logger.warn("要求的token为：{}", TOKENVALUE);
            exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }
}
```

实现 WebFilter，只对存在请求头 token-1，且只为 yingzi-1 的连接放行。

## client

### pom 依赖

```xml
<dependencies>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-client</artifactId>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>

</dependencies>
```

### application 文件

```yaml
server:
  port: 19100

spring:
  application:
    name: mcp-auth-client
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
        request-timeout: 600s
        type: ASYNC  # or ASYNC for reactive applications
        streamable-http:
          connections:
            server1:
              url: http://localhost:20000
              endpoint: /mcp
```

### HTTP 请求配置

自定义 McpSyncHttpClientRequestCustomizer 接口类，为 HttpRequest.Builder 配置请求头信息

```java
public class HeaderSyncHttpRequestCustomizer implements McpSyncHttpClientRequestCustomizer {

    private final Map<String, String> headers;

    public HeaderSyncHttpRequestCustomizer(Map<String, String> headers) {
        this.headers = headers;
    }

    @Override
    public void customize(HttpRequest.Builder builder, String method, URI endpoint, String body, McpTransportContext context) {
        headers.forEach(builder::header);
    }
}

@Configuration
public class HttpClientConfig {

    @Bean
    public McpSyncHttpClientRequestCustomizer mcpAsyncHttpClientRequestCustomizer() {
        Map<String, String> headers = new HashMap<>();
        headers.put("token-1", "yingzi-1");
        headers.put("token-2", "yingzi-2");

        return new HeaderSyncHttpRequestCustomizer(headers);
    }
}
```

## 验证

当 mcp client 侧携带对应请求头 kv 对`{token-1:yingzi-1}`时，通过，否则将不予连接
![mcp-auth-1](/img/blog/base/mcp/mcp-auth-1.png)

![mcp-auth-2](/img/blog/base/mcp/mcp-auth-2.png)
