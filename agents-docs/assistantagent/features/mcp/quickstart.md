# MCP 工具模块

## 1. 模块介绍

MCP（Model Context Protocol）工具模块通过集成 Spring AI MCP Client，将 MCP 协议的工具自动转换为 CodeactTool，使 Agent 能够调用外部 MCP 服务提供的工具。

### 核心概念

| 概念 | 说明 |
|------|------|
| `McpDynamicToolFactory` | MCP 动态工具工厂，将 ToolCallback 适配为 CodeactTool |
| `McpToolCallbackAdapter` | 适配器，封装 MCP ToolCallback 为 CodeactTool |
| `McpServerSpec` | MCP 服务元数据，用于自定义类名和描述 |
| `ToolCallbackProvider` | Spring AI MCP 提供的工具回调提供者 |

### 工作流程

```
MCP 服务配置（mcp-servers.json）
        │
        ▼
┌─────────────────────────────────────────┐
│     Spring AI MCP Client Starter         │
│     (自动创建 ToolCallbackProvider)       │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│       McpDynamicToolFactory              │
│       (ToolCallback → CodeactTool)       │
└────────────────┬────────────────────────┘
                 ▼
        CodeactToolRegistry
                 │
                 ▼
         Agent 可调用工具
```

---

## 2. 快速接入方式

### 步骤 1：配置 MCP 服务

创建 `src/main/resources/mcp-servers.json`：

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.example.com/api/mcp",
        "--header",
        "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

### 步骤 2：启用 MCP Client

```yaml
# application.yml
spring:
  ai:
    mcp:
      client:
        enabled: true
        name: assistant-agent-mcp
        version: 1.0.0
        type: SYNC
        request-timeout: 30s
        toolcallback:
          enabled: true
        stdio:
          servers-configuration: classpath:mcp-servers.json
```

### 步骤 3：验证工具注册

启动应用后，MCP 工具会自动注册到 `CodeactToolRegistry`，可在日志中看到：

```
McpDynamicToolFactory#createTools - reason=创建MCP工具成功, toolName=xxx
```

Agent 即可在代码中调用这些工具：

```python
# Agent 生成的代码示例
result = mcp.tool_name(param1="value1", param2="value2")
```

---

## 3. 完整配置示例

### MCP 服务配置文件

```json
{
  "mcpServers": {
    "weather-service": {
      "command": "node",
      "args": ["/path/to/weather-mcp-server.js"]
    },
    "database-service": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://db.example.com/mcp",
        "--header",
        "Authorization: Bearer ${DB_TOKEN}"
      ]
    }
  }
}
```

### 应用配置

```yaml
spring:
  ai:
    mcp:
      client:
        enabled: true
        name: my-agent-mcp
        type: SYNC                    # SYNC 或 ASYNC
        request-timeout: 30s
        toolcallback:
          enabled: true               # 必须启用才能获取 ToolCallback
        stdio:
          servers-configuration: classpath:mcp-servers.json
```

---

## 常见 MCP 服务类型

### 本地进程（stdio）

```json
{
  "mcpServers": {
    "local-tool": {
      "command": "python",
      "args": ["/path/to/mcp_server.py"]
    }
  }
}
```

### 远程服务（streamable-http）

```yaml
spring:
  ai:
    mcp:
      client:
        streamable-http:
          connections:
            remote-server:
              url: https://mcp.example.com
              endpoint: /mcp
```

### Docker 容器

```json
{
  "mcpServers": {
    "docker-tool": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "my-mcp-image:latest"]
    }
  }
}
```

