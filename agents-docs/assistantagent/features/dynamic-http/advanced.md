# 动态 HTTP 工具 - 高级特性

## 1. 多 OpenAPI 文档支持

配置多个 API 服务：

```java
@Bean
public List<HttpDynamicToolFactory> httpToolFactories() {
    return List.of(
        // Pet Store API
        HttpDynamicToolFactory.builder()
            .openApiSpec(loadOpenApiSpec("openapi/petstore.json"))
            .addEndpoint(EndpointSpec.get("/pets"))
            .addEndpoint(EndpointSpec.post("/pets"))
            .build(),
        
        // Order API
        HttpDynamicToolFactory.builder()
            .openApiSpec(loadOpenApiSpec("openapi/orders.json"))
            .addEndpoint(EndpointSpec.get("/orders"))
            .addEndpoint(EndpointSpec.post("/orders"))
            .build()
    );
}
```

---

## 2. 认证配置

### Bearer Token

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(OpenApiSpec.builder()
        .content(openApiContent)
        .baseUrl("https://api.example.com")
        .build())
    .defaultHeaders(Map.of(
        "Authorization", "Bearer " + apiToken
    ))
    .addEndpoint(EndpointSpec.get("/protected/data"))
    .build();
```

### API Key

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .defaultHeaders(Map.of(
        "X-API-Key", apiKey
    ))
    .addEndpoint(EndpointSpec.get("/data"))
    .build();
```

### 动态认证

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .headerProvider(() -> Map.of(
        "Authorization", "Bearer " + tokenService.getToken()
    ))
    .addEndpoint(EndpointSpec.get("/data"))
    .build();
```

---

## 3. 参数映射

### Path 参数

OpenAPI 中的 path 参数自动映射为工具参数：

```json
{
  "paths": {
    "/pets/{petId}": {
      "get": {
        "operationId": "getPet",
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ]
      }
    }
  }
}
```

```python
# Agent 生成的调用代码
pet = http_pets.get_pet(petId="123")
```

### Query 参数

```json
{
  "parameters": [
    {
      "name": "status",
      "in": "query",
      "schema": { 
        "type": "string",
        "enum": ["available", "pending", "sold"]
      }
    }
  ]
}
```

```python
# Agent 生成的调用代码
pets = http_pets.list_pets(status="available")
```

### Request Body

```json
{
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "integer" }
          },
          "required": ["name"]
        }
      }
    }
  }
}
```

```python
# Agent 生成的调用代码
result = http_pets.create_pet(name="小花", age=2)
```

---

## 4. 响应处理

### JSON 响应

默认解析 JSON 响应为 Python 字典/列表：

```python
result = http_api.get_data()
# result 是解析后的 JSON 对象
print(result["name"])
```

### 原始响应

获取原始 HTTP 响应信息：

```python
result = http_api.get_data_raw()
# result 包含 status_code, headers, body
print(f"状态码: {result['status_code']}")
print(f"响应体: {result['body']}")
```

---

## 5. 超时与重试

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .connectionTimeout(Duration.ofSeconds(10))
    .readTimeout(Duration.ofSeconds(30))
    .retryConfig(RetryConfig.builder()
        .maxRetries(3)
        .retryOn(IOException.class)
        .backoff(Duration.ofMillis(500))
        .build())
    .addEndpoint(EndpointSpec.get("/slow-api"))
    .build();
```

---

## 6. 请求/响应拦截

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .requestInterceptor(request -> {
        // 添加请求 ID
        request.header("X-Request-ID", UUID.randomUUID().toString());
        return request;
    })
    .responseInterceptor(response -> {
        // 记录响应时间
        logger.info("响应状态: {}", response.getStatusCode());
        return response;
    })
    .addEndpoint(EndpointSpec.get("/data"))
    .build();
```

---

## 7. 自定义类名和描述

```java
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .targetClassName("inventory")              // 覆盖 tags 推断的类名
    .targetClassDescription("库存管理系统 API")
    .addEndpoint(EndpointSpec.get("/stock"))
    .build();
```

---

## 8. 批量暴露 Endpoints

```java
// 暴露所有 GET endpoints
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .addAllEndpointsMatching(operation -> 
        "get".equalsIgnoreCase(operation.getMethod()))
    .build();

// 暴露特定 tag 下的所有 endpoints
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .addAllEndpointsWithTag("pets")
    .build();

// 暴露所有 endpoints
HttpDynamicToolFactory.builder()
    .openApiSpec(spec)
    .addAllEndpoints()
    .build();
```

---

## 9. OpenAPI 文档来源

### 从文件加载

```java
OpenApiSpec.fromFile("openapi/api.json")
OpenApiSpec.fromFile("openapi/api.yaml")
```

### 从 URL 加载

```java
OpenApiSpec.fromUrl("https://api.example.com/openapi.json")
```

### 从 classpath 加载

```java
OpenApiSpec.fromClasspath("openapi/api.json")
```

---

## 10. 调试与日志

启用详细日志：

```yaml
logging:
  level:
    com.alibaba.assistant.agent.extension.dynamic.http: DEBUG
```

查看生成的工具：

```java
@Component
public class HttpToolDiagnostics {

    private final CodeactToolRegistry registry;

    @PostConstruct
    public void printHttpTools() {
        registry.getAllTools().stream()
            .filter(t -> t.getMetadata().getFactoryId().equals("http"))
            .forEach(tool -> {
                System.out.println("HTTP Tool: " + tool.getName());
                System.out.println("  Class: " + tool.getMetadata().getTargetClassName());
                System.out.println("  Method: " + tool.getMetadata().getTargetMethodName());
            });
    }
}
```

