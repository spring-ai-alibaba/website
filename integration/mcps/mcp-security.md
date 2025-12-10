# MCP Security

**注意：** 这仍在进行中。文档和 API 可能在未来的版本中更改。

Spring AI MCP Security 模块为 Spring AI 中的 Model Context Protocol 实现提供全面的 OAuth 2.0 和基于 API 密钥的安全支持。这个社区驱动的项目使开发者能够使用行业标准的身份验证和授权机制来保护 MCP 服务器和客户端。

**注意：** 此模块是 [spring-ai-community/mcp-security](https://github.com/spring-ai-community/mcp-security) 项目的一部分，目前仅适用于 Spring AI 的 1.1.x 分支。
这是一个社区驱动的项目，尚未得到 Spring AI 或 MCP 项目的官方认可。

## Overview

MCP Security 模块提供三个主要组件：

* *MCP Server Security* - 用于 Spring AI MCP 服务器的 OAuth 2.0 资源服务器和 API 密钥身份验证
* *MCP Client Security* - 用于 Spring AI MCP 客户端的 OAuth 2.0 客户端支持
* *MCP Authorization Server* - 具有 MCP 特定功能的增强 Spring Authorization Server

该项目使开发者能够：

* 使用 OAuth 2.0 身份验证和基于 API 密钥的访问来保护 MCP 服务器
* 使用 OAuth 2.0 授权流程配置 MCP 客户端
* 设置专门为 MCP 工作流设计的授权服务器
* 为 MCP 工具和资源实现细粒度访问控制

## MCP Server Security

MCP Server Security 模块为 [Spring AI's MCP servers](mcp/mcp-server-boot-starter-docs.adoc) 提供 OAuth 2.0 资源服务器功能。
它还提供基于 API 密钥的身份验证的基本支持。

> **重要提示：** 此模块仅与基于 Spring WebMVC 的服务器兼容。

### Dependencies

将以下依赖项添加到项目中：

**Maven:**

```xml
<dependencies>
    <dependency>
        <groupId>org.springaicommunity</groupId>
        <artifactId>mcp-server-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- OPTIONAL: For OAuth2 support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
</dependencies>
```

**Gradle:**

```groovy
implementation 'org.springaicommunity:mcp-server-security'
implementation 'org.springframework.boot:spring-boot-starter-security'

// OPTIONAL: For OAuth2 support
implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
```

### OAuth 2.0 Configuration

#### Basic OAuth 2.0 Setup

首先，在 `application.properties` 中启用 MCP 服务器：

```properties
spring.ai.mcp.server.name=my-cool-mcp-server
# Supported protocols: STREAMABLE, STATELESS
spring.ai.mcp.server.protocol=STREAMABLE
```

然后，使用提供的 MCP configurer 使用 Spring Security 的标准 API 配置安全：

```java
@Configuration
@EnableWebSecurity
class McpServerConfiguration {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUrl;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Enforce authentication with token on EVERY request
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                // Configure OAuth2 on the MCP server
                .with(
                        McpServerOAuth2Configurer.mcpServerOAuth2(),
                        (mcpAuthorization) -> {
                            // REQUIRED: the issuerURI
                            mcpAuthorization.authorizationServer(issuerUrl);
                            // OPTIONAL: enforce the `aud` claim in the JWT token.
                            // Not all authorization servers support resource indicators,
                            // so it may be absent. Defaults to `false`.
                            // See RFC 8707 Resource Indicators for OAuth 2.0
                            // https://www.rfc-editor.org/rfc/rfc8707.html
                            mcpAuthorization.validateAudienceClaim(true);
                        }
                )
                .build();
    }
}
```

#### Securing Tool Calls Only

您可以配置服务器仅保护工具调用，而将其他 MCP 操作（如 `initialize` 和 `tools/list`）公开：

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Enable annotation-driven security
class McpServerConfiguration {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUrl;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Open every request on the server
                .authorizeHttpRequests(auth -> {
                    auth.requestMatcher("/mcp").permitAll();
                    auth.anyRequest().authenticated();
                })
                // Configure OAuth2 on the MCP server
                .with(
                        McpResourceServerConfigurer.mcpServerOAuth2(),
                        (mcpAuthorization) -> {
                            // REQUIRED: the issuerURI
                            mcpAuthorization.authorizationServer(issuerUrl);
                        }
                )
                .build();
    }
}
```

然后，使用 `@PreAuthorize` 注解和[方法安全](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html)来保护您的工具调用：

```java
@Service
public class MyToolsService {

    @PreAuthorize("isAuthenticated()")
    @McpTool(name = "greeter", description = "A tool that greets you, in the selected language")
    public String greet(
            @ToolParam(description = "The language for the greeting (example: english, french, ...)") String language
    ) {
        if (!StringUtils.hasText(language)) {
            language = "";
        }
        return switch (language.toLowerCase()) {
            case "english" -> "Hello you!";
            case "french" -> "Salut toi!";
            default -> "I don't understand language \"%s\". So I'm just going to say Hello!".formatted(language);
        };
    }
}
```

您还可以使用 `SecurityContextHolder` 直接从工具方法访问当前身份验证：

```java
@McpTool(name = "greeter", description = "A tool that greets the user by name, in the selected language")
@PreAuthorize("isAuthenticated()")
public String greet(
        @ToolParam(description = "The language for the greeting (example: english, french, ...)") String language
) {
    if (!StringUtils.hasText(language)) {
        language = "";
    }
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    var name = authentication.getName();
    return switch (language.toLowerCase()) {
        case "english" -> "Hello, %s!".formatted(name);
        case "french" -> "Salut %s!".formatted(name);
        default -> ("I don't understand language \"%s\". " +
                    "So I'm just going to say Hello %s!").formatted(language, name);
    };
}
```

### API Key Authentication

MCP Server Security 模块还支持基于 API 密钥的身份验证。您需要提供自己的 `ApiKeyEntityRepository` 实现来存储 `ApiKeyEntity` 对象。

示例实现提供了 `InMemoryApiKeyEntityRepository` 以及默认的 `ApiKeyEntityImpl`：

> **警告：** `InMemoryApiKeyEntityRepository` 使用 bcrypt 存储 API 密钥，这在计算上是昂贵的。它不适合高流量的生产使用。对于生产环境，请实现您自己的 `ApiKeyEntityRepository`。

```java
@Configuration
@EnableWebSecurity
class McpServerConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(authz -> authz.anyRequest().authenticated())
                .with(
                        mcpServerApiKey(),
                        (apiKey) -> {
                            // REQUIRED: the repo for API keys
                            apiKey.apiKeyRepository(apiKeyRepository());

                            // OPTIONAL: name of the header containing the API key.
                            // Here for example, api keys will be sent with "CUSTOM-API-KEY: <value>"
                            // Replaces .authenticationConverter(...) (see below)
                            //
                            // apiKey.headerName("CUSTOM-API-KEY");

                            // OPTIONAL: custom converter for transforming an http request
                            // into an authentication object. Useful when the header is
                            // "Authorization: Bearer <value>".
                            // Replaces .headerName(...) (see above)
                            //
                            // apiKey.authenticationConverter(request -> {
                            //     var key = extractKey(request);
                            //     return ApiKeyAuthenticationToken.unauthenticated(key);
                            // });
                        }
                )
                .build();
    }

    /**
     * Provide a repository of {@link ApiKeyEntity}.
     */
    private ApiKeyEntityRepository<ApiKeyEntityImpl> apiKeyRepository() {
        var apiKey = ApiKeyEntityImpl.builder()
                .name("test api key")
                .id("api01")
                .secret("mycustomapikey")
                .build();

        return new InMemoryApiKeyEntityRepository<>(List.of(apiKey));
    }
}
```

使用此配置，您可以使用标头 `X-API-key: api01.mycustomapikey` 调用 MCP 服务器。

### Known Limitations

> **重要提示：**

* 不支持已弃用的 SSE 传输。使用 [Streamable HTTP](mcp/mcp-streamable-http-server-boot-starter-docs.adoc) 或 [stateless transport](mcp/mcp-stateless-server-boot-starter-docs.adoc)。
* 不支持基于 WebFlux 的服务器。
* 不支持 Opaque tokens。使用 JWT。

## MCP Client Security

MCP Client Security 模块为 [Spring AI's MCP clients](mcp/mcp-client-boot-starter-docs.adoc) 提供 OAuth 2.0 支持，支持基于 HttpClient 的客户端（来自 `spring-ai-starter-mcp-client`）和基于 WebClient 的客户端（来自 `spring-ai-starter-mcp-client-webflux`）。

> **重要提示：** 此模块仅支持 `McpSyncClient`。

### Dependencies

**Maven:**

```xml
<dependency>
    <groupId>org.springaicommunity</groupId>
    <artifactId>mcp-client-security</artifactId>
</dependency>
```

**Gradle:**

```groovy
implementation 'org.springaicommunity:mcp-client-security'
```

### Authorization Flows

三种 OAuth 2.0 流程可用于获取令牌：

* *Authorization Code Flow* - 用于用户级权限，当每个 MCP 请求都在用户请求的上下文中进行时
* *Client Credentials Flow* - 用于机器到机器的用例，其中没有人在循环中
* *Hybrid Flow* - 结合两种流程，适用于某些操作（如 `initialize` 或 `tools/list`）在没有用户在场的情况下发生，但工具调用需要用户级权限的场景

> **提示：** 当您有用户级权限且所有 MCP 请求都在用户上下文中发生时，使用 authorization code flow。对于机器到机器的通信，使用 client credentials。当使用 Spring Boot 属性进行 MCP 客户端配置时，使用 hybrid flow，因为工具发现在启动时发生，没有用户在场。

### Common Setup

对于所有流程，在 `application.properties` 中激活 Spring Security 的 OAuth2 客户端支持：

```properties
# Ensure MCP clients are sync
spring.ai.mcp.client.type=SYNC

# For authorization_code or hybrid flow
spring.security.oauth2.client.registration.authserver.client-id=<THE CLIENT ID>
spring.security.oauth2.client.registration.authserver.client-secret=<THE CLIENT SECRET>
spring.security.oauth2.client.registration.authserver.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.authserver.provider=authserver

# For client_credentials or hybrid flow
spring.security.oauth2.client.registration.authserver-client-credentials.client-id=<THE CLIENT ID>
spring.security.oauth2.client.registration.authserver-client-credentials.client-secret=<THE CLIENT SECRET>
spring.security.oauth2.client.registration.authserver-client-credentials.authorization-grant-type=client_credentials
spring.security.oauth2.client.registration.authserver-client-credentials.provider=authserver

# Authorization server configuration
spring.security.oauth2.client.provider.authserver.issuer-uri=<THE ISSUER URI OF YOUR AUTH SERVER>
```

然后，创建一个配置类来激活 OAuth2 客户端功能：

```java
@Configuration
@EnableWebSecurity
class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // in this example, the client app has no security on its endpoints
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                // turn on OAuth2 support
                .oauth2Client(Customizer.withDefaults())
                .build();
    }
}
```

### HttpClient-Based Clients

使用 `spring-ai-starter-mcp-client` 时，配置 `McpSyncHttpClientRequestCustomizer` bean：

```java
@Configuration
class McpConfiguration {

    @Bean
    McpSyncClientCustomizer syncClientCustomizer() {
        return (name, syncSpec) ->
                syncSpec.transportContextProvider(
                        new AuthenticationMcpTransportContextProvider()
                );
    }

    @Bean
    McpSyncHttpClientRequestCustomizer requestCustomizer(
            OAuth2AuthorizedClientManager clientManager
    ) {
        // The clientRegistration name, "authserver",
        // must match the name in application.properties
        return new OAuth2AuthorizationCodeSyncHttpRequestCustomizer(
                clientManager,
                "authserver"
        );
    }
}
```

可用的 customizers：

* `OAuth2AuthorizationCodeSyncHttpRequestCustomizer` - 用于 authorization code flow
* `OAuth2ClientCredentialsSyncHttpRequestCustomizer` - 用于 client credentials flow
* `OAuth2HybridSyncHttpRequestCustomizer` - 用于 hybrid flow

### WebClient-Based Clients

使用 `spring-ai-starter-mcp-client-webflux` 时，使用 MCP `ExchangeFilterFunction` 配置 `WebClient.Builder`：

```java
@Configuration
class McpConfiguration {

    @Bean
    McpSyncClientCustomizer syncClientCustomizer() {
        return (name, syncSpec) ->
                syncSpec.transportContextProvider(
                        new AuthenticationMcpTransportContextProvider()
                );
    }

    @Bean
    WebClient.Builder mcpWebClientBuilder(OAuth2AuthorizedClientManager clientManager) {
        // The clientRegistration name, "authserver", must match the name in application.properties
        return WebClient.builder().filter(
                new McpOAuth2AuthorizationCodeExchangeFilterFunction(
                        clientManager,
                        "authserver"
                )
        );
    }
}
```

可用的过滤器函数：

* `McpOAuth2AuthorizationCodeExchangeFilterFunction` - 用于 authorization code flow
* `McpOAuth2ClientCredentialsExchangeFilterFunction` - 用于 client credentials flow
* `McpOAuth2HybridExchangeFilterFunction` - 用于 hybrid flow

### Working Around Spring AI Autoconfiguration

Spring AI 的自动配置在启动时初始化 MCP 客户端，这可能会导致基于用户身份验证的问题。要避免这种情况：

#### Option 1: Disable @Tool Auto-configuration

通过发布一个空的 `ToolCallbackResolver` bean 来禁用 Spring AI 的 `@Tool` 自动配置：

```java
@Configuration
public class McpConfiguration {

    @Bean
    ToolCallbackResolver resolver() {
        return new StaticToolCallbackResolver(List.of());
    }
}
```

#### Option 2: Programmatic Client Configuration

使用程序化配置而不是 Spring Boot 属性来配置 MCP 客户端。对于基于 HttpClient 的客户端：

```java
@Bean
McpSyncClient client(
        ObjectMapper objectMapper,
        McpSyncHttpClientRequestCustomizer requestCustomizer,
        McpClientCommonProperties commonProps
) {
    var transport = HttpClientStreamableHttpTransport.builder(mcpServerUrl)
            .clientBuilder(HttpClient.newBuilder())
            .jsonMapper(new JacksonMcpJsonMapper(objectMapper))
            .httpRequestCustomizer(requestCustomizer)
            .build();

    var clientInfo = new McpSchema.Implementation("client-name", commonProps.getVersion());

    return McpClient.sync(transport)
            .clientInfo(clientInfo)
            .requestTimeout(commonProps.getRequestTimeout())
            .transportContextProvider(new AuthenticationMcpTransportContextProvider())
            .build();
}
```

对于基于 WebClient 的客户端：

```java
@Bean
McpSyncClient client(
        WebClient.Builder mcpWebClientBuilder,
        ObjectMapper objectMapper,
        McpClientCommonProperties commonProperties
) {
    var builder = mcpWebClientBuilder.baseUrl(mcpServerUrl);
    var transport = WebClientStreamableHttpTransport.builder(builder)
            .jsonMapper(new JacksonMcpJsonMapper(objectMapper))
            .build();

    var clientInfo = new McpSchema.Implementation("clientName", commonProperties.getVersion());

    return McpClient.sync(transport)
            .clientInfo(clientInfo)
            .requestTimeout(commonProperties.getRequestTimeout())
            .transportContextProvider(new AuthenticationMcpTransportContextProvider())
            .build();
}
```

然后将客户端添加到您的聊天客户端：

```java
var chatResponse = chatClient.prompt("Prompt the LLM to do the thing")
        .toolCallbacks(new SyncMcpToolCallbackProvider(mcpClient1, mcpClient2, mcpClient3))
        .call()
        .content();
```

### Known Limitations

> **重要提示：**

* 不支持 Spring WebFlux 服务器。
* Spring AI 自动配置在应用启动时初始化 MCP 客户端，需要针对基于用户身份验证的变通方法。
* 与服务器模块不同，客户端实现支持使用 `HttpClient` 和 `WebClient` 的 SSE 传输。

## MCP Authorization Server

MCP Authorization Server 模块增强了 [Spring Security's OAuth 2.0 Authorization Server](https://docs.spring.io/spring-security/reference/7.0/servlet/oauth2/authorization-server/index.html)，具有与 [MCP authorization spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) 相关的功能，例如 Dynamic Client Registration 和 Resource Indicators。

### Dependencies

**Maven:**

```xml
<dependency>
    <groupId>org.springaicommunity</groupId>
    <artifactId>mcp-authorization-server</artifactId>
</dependency>
```

**Gradle:**

```groovy
implementation 'org.springaicommunity:mcp-authorization-server'
```

### Configuration

在 `application.yml` 中配置授权服务器：

```yaml
spring:
  application:
    name: sample-authorization-server
  security:
    oauth2:
      authorizationserver:
        client:
          default-client:
            token:
              access-token-time-to-live: 1h
            registration:
              client-id: "default-client"
              client-secret: "{noop}default-secret"
              client-authentication-methods:
                - "client_secret_basic"
                - "none"
              authorization-grant-types:
                - "authorization_code"
                - "client_credentials"
              redirect-uris:
                - "http://127.0.0.1:8080/authorize/oauth2/code/authserver"
                - "http://localhost:8080/authorize/oauth2/code/authserver"
                # mcp-inspector
                - "http://localhost:6274/oauth/callback"
                # claude code
                - "https://claude.ai/api/mcp/auth_callback"
    user:
      # A single user, named "user"
      name: user
      password: password

server:
  servlet:
    session:
      cookie:
        # Override the default cookie name (JSESSIONID).
        # This allows running multiple Spring apps on localhost, and they'll each have their own cookie.
        # Otherwise, since the cookies do not take the port into account, they are confused.
        name: MCP_AUTHORIZATION_SERVER_SESSIONID
```

然后使用安全过滤器链激活授权服务器功能：

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
            // all requests must be authenticated
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            // enable authorization server customizations
            .with(McpAuthorizationServerConfigurer.mcpAuthorizationServer(), withDefaults())
            // enable form-based login, for user "user"/"password"
            .formLogin(withDefaults())
            .build();
}
```

### Known Limitations

> **重要提示：**

* 不支持 Spring WebFlux 服务器。
* 每个客户端支持所有 `resource` 标识符。

## Samples and Integrations

[samples directory](https://github.com/spring-ai-community/mcp-security/tree/main/samples) 包含此项目中所有模块的工作示例，包括集成测试。

使用 `mcp-server-security` 和支持的 `mcp-authorization-server`，您可以与以下内容集成：

* Cursor
* Claude Desktop
* [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)

**注意：** 使用 [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) 时，您可能需要禁用 CSRF 和 CORS 保护。

## Additional Resources

* [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#communication-security)
* [MCP Security GitHub Repository](https://github.com/spring-ai-community/mcp-security)
* [Sample Applications](https://github.com/spring-ai-community/mcp-security/tree/main/samples)
* [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
* [Spring Security OAuth 2.0 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
* [Spring Security OAuth 2.0 Client](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/index.html)
* [Spring Authorization Server](https://docs.spring.io/spring-security/reference/7.0/servlet/oauth2/authorization-server/index.html)

