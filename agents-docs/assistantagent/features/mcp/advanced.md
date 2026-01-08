# MCP 工具模块 - 高级特性

## 1. 自定义工具类名和描述

通过 `McpServerSpec` 自定义 MCP 工具的类名和描述：

```java
import com.alibaba.assistant.agent.extension.dynamic.mcp.McpDynamicToolFactory;
import com.alibaba.assistant.agent.extension.dynamic.mcp.McpServerSpec;

@Bean
public McpDynamicToolFactory mcpToolFactory(ToolCallbackProvider provider) {
    return McpDynamicToolFactory.builder()
        .toolCallbackProvider(provider)
        .addServerSpec(McpServerSpec.builder()
            .connectionName("weather-service")
            .targetClassName("weather")           // 生成 weather.xxx() 调用
            .targetClassDescription("天气查询服务")
            .build())
        .addServerSpec(McpServerSpec.builder()
            .connectionName("database-service")
            .targetClassName("db")                // 生成 db.xxx() 调用
            .targetClassDescription("数据库查询服务")
            .build())
        .build();
}
```

---

## 2. 多 MCP 服务管理

配置多个 MCP 服务，每个服务的工具会自动按类名分组：

```json
{
  "mcpServers": {
    "search": {
      "command": "node",
      "args": ["search-mcp.js"]
    },
    "storage": {
      "command": "node", 
      "args": ["storage-mcp.js"]
    },
    "analytics": {
      "command": "python",
      "args": ["analytics_mcp.py"]
    }
  }
}
```

Agent 代码中按服务分组调用：

```python
# 搜索服务
result = search.query(keyword="test")

# 存储服务
storage.save(key="my_key", value="my_value")

# 分析服务
report = analytics.generate_report(start_date="2024-01-01")
```

---

## 3. 工具参数 Schema 自动解析

MCP 工具的 inputSchema 会自动解析为 CodeactTool 的参数定义：

```json
// MCP 工具定义
{
  "name": "search_documents",
  "description": "搜索文档",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词"
      },
      "limit": {
        "type": "integer",
        "description": "返回数量",
        "default": 10
      }
    },
    "required": ["query"]
  }
}
```

生成的 Python 调用代码：

```python
# 自动生成的工具调用签名
result = mcp.search_documents(query="关键词", limit=10)
```

---

## 4. 异步 MCP 客户端

对于长时间运行的 MCP 工具，使用异步模式：

```yaml
spring:
  ai:
    mcp:
      client:
        type: ASYNC                   # 异步模式
        request-timeout: 120s         # 增加超时时间
```

---

## 5. MCP 服务认证

### Bearer Token

```json
{
  "mcpServers": {
    "secure-service": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://api.example.com/mcp",
        "--header",
        "Authorization: Bearer ${API_TOKEN}"
      ]
    }
  }
}
```

### 环境变量注入

```json
{
  "mcpServers": {
    "env-auth": {
      "command": "python",
      "args": ["mcp_server.py"],
      "env": {
        "API_KEY": "${MY_API_KEY}",
        "SECRET": "${MY_SECRET}"
      }
    }
  }
}
```

---

## 6. 工具过滤与选择

在代码中过滤可用的 MCP 工具：

```java
@Component
public class McpToolFilter {

    private final CodeactToolRegistry toolRegistry;

    public McpToolFilter(CodeactToolRegistry toolRegistry) {
        this.toolRegistry = toolRegistry;
    }

    public List<CodeactTool> getMcpToolsForUser(String userId) {
        return toolRegistry.getAllTools().stream()
            .filter(tool -> tool.getMetadata().getFactoryId().equals("mcp"))
            .filter(tool -> hasPermission(userId, tool.getName()))
            .collect(Collectors.toList());
    }
}
```

---

## 7. 错误处理

MCP 工具调用失败时的处理：

```python
# Agent 生成的代码应包含错误处理
try:
    result = mcp.risky_operation(param="value")
    if result.get("error"):
        print(f"操作失败: {result['error']}")
except Exception as e:
    print(f"MCP 调用异常: {e}")
```

---

## 8. 调试 MCP 工具

启用详细日志：

```yaml
logging:
  level:
    com.alibaba.assistant.agent.extension.dynamic.mcp: DEBUG
    io.modelcontextprotocol: DEBUG
```

查看工具注册信息：

```java
@Component
public class McpToolDiagnostics {

    private final CodeactToolRegistry registry;

    @PostConstruct
    public void printMcpTools() {
        registry.getAllTools().stream()
            .filter(t -> t.getMetadata().getFactoryId().equals("mcp"))
            .forEach(tool -> {
                System.out.println("MCP Tool: " + tool.getName());
                System.out.println("  Class: " + tool.getMetadata().getTargetClassName());
                System.out.println("  Description: " + tool.getDescription());
            });
    }
}
```

---

## 9. 与 Streamable HTTP 集成

使用 HTTP 协议连接远程 MCP 服务：

```yaml
spring:
  ai:
    mcp:
      client:
        streamable-http:
          connections:
            remote-api:
              url: https://mcp.example.com
              endpoint: /api/mcp
              headers:
                Authorization: Bearer ${TOKEN}
                X-Custom-Header: custom-value
```

---

## 10. 工具元数据扩展

为 MCP 工具添加自定义元数据：

```java
@Bean
public McpDynamicToolFactory mcpToolFactory(ToolCallbackProvider provider) {
    return McpDynamicToolFactory.builder()
        .toolCallbackProvider(provider)
        .defaultTargetClassNamePrefix("mcp")
        .defaultTargetClassDescription("MCP 远程工具")
        // 后处理器：为所有 MCP 工具添加标签
        .postProcessor(tool -> {
            tool.getMetadata().getTags().add("mcp");
            tool.getMetadata().getTags().add("remote");
            return tool;
        })
        .build();
}
```

