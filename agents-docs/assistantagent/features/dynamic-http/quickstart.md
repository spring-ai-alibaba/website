# 动态 HTTP 工具模块

## 1. 模块介绍

动态 HTTP 工具模块根据 OpenAPI 3.x 规范文档，自动生成可供 Agent 调用的 HTTP API 工具。开发者只需提供 OpenAPI 文档和需要暴露的 endpoints，即可将 REST API 转换为 CodeactTool。

### 核心概念

| 概念 | 说明 |
|------|------|
| `HttpDynamicToolFactory` | HTTP 动态工具工厂，解析 OpenAPI 生成 CodeactTool |
| `OpenApiSpec` | OpenAPI 规范，包含文档内容和 baseUrl |
| `EndpointSpec` | Endpoint 规格，定义要暴露的 HTTP 方法和路径 |
| `HttpDynamicCodeactTool` | 生成的 HTTP 工具，封装 HTTP 调用逻辑 |

### 工作流程

```
OpenAPI 文档（JSON/YAML）
        │
        ▼
┌─────────────────────────────────────────┐
│       HttpDynamicToolFactory             │
│                                          │
│  OpenAPI Doc + EndpointSpecs             │
│           ↓                              │
│  解析 operation、parameters、schema       │
│           ↓                              │
│  生成 CodeactTool (含参数定义)            │
└────────────────┬────────────────────────┘
                 ▼
        CodeactToolRegistry
                 │
                 ▼
         Agent 可调用工具
```

---

## 2. 快速接入方式

### 步骤 1：准备 OpenAPI 文档

将 OpenAPI 文档放到 `src/main/resources/openapi/`：

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store API",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "https://api.petstore.com/v1" }
  ],
  "paths": {
    "/pets": {
      "get": {
        "operationId": "listPets",
        "summary": "列出所有宠物",
        "tags": ["pets"],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer" }
          }
        ]
      },
      "post": {
        "operationId": "createPet",
        "summary": "创建新宠物",
        "tags": ["pets"],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "species": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 步骤 2：配置 HTTP 动态工具工厂

```java
import com.alibaba.assistant.agent.extension.dynamic.http.HttpDynamicToolFactory;
import com.alibaba.assistant.agent.extension.dynamic.http.OpenApiSpec;
import com.alibaba.assistant.agent.extension.dynamic.http.EndpointSpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import java.nio.charset.StandardCharsets;

@Configuration
public class HttpToolConfig {

    @Bean
    public HttpDynamicToolFactory petStoreToolFactory() throws Exception {
        // 读取 OpenAPI 文档
        String openApiContent = new String(
            new ClassPathResource("openapi/petstore.json").getInputStream().readAllBytes(),
            StandardCharsets.UTF_8
        );

        return HttpDynamicToolFactory.builder()
            .openApiSpec(OpenApiSpec.builder()
                .content(openApiContent)
                .baseUrl("https://api.petstore.com/v1")  // 可选，覆盖文档中的 server
                .build())
            // 指定要暴露的 endpoints
            .addEndpoint(EndpointSpec.get("/pets"))
            .addEndpoint(EndpointSpec.post("/pets"))
            .build();
    }
}
```

### 步骤 3：使用生成的工具

Agent 生成的代码将能够调用这些 HTTP API：

```python
# Agent 生成的代码示例
# 列出宠物
pets = http_pets.list_pets(limit=10)
print(f"找到 {len(pets)} 只宠物")

# 创建新宠物
new_pet = http_pets.create_pet(name="小白", species="cat")
print(f"创建成功: {new_pet}")
```

---

## 3. EndpointSpec 便捷方法

```java
// GET 请求
EndpointSpec.get("/pets")

// POST 请求
EndpointSpec.post("/pets")

// PUT 请求
EndpointSpec.put("/pets/{id}")

// DELETE 请求
EndpointSpec.delete("/pets/{id}")

// PATCH 请求
EndpointSpec.patch("/pets/{id}")

// 自定义方法
EndpointSpec.builder("HEAD", "/pets").build()

// 指定 operationId（精确匹配）
EndpointSpec.builder("GET", "/pets")
    .operationId("listAllPets")
    .build()
```

---

## 工具命名规则

| OpenAPI 属性 | 生成结果 |
|-------------|---------|
| `tags[0]` | 工具类名前缀（如 `http_pets`） |
| `operationId` | 方法名（如 `list_pets`） |
| `summary` / `description` | 工具描述 |

