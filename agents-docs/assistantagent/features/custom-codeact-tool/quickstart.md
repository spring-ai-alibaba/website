# 自定义 CodeAct 工具

## 1. 模块介绍

CodeAct 工具是 Assistant Agent 的核心扩展机制，允许开发者将自定义业务逻辑封装为可被 Agent 调用的工具。Agent 会生成代码调用这些工具，工具在 GraalVM 沙箱中安全执行。

### 核心接口

| 接口/类 | 说明 |
|--------|------|
| `CodeactTool` | 工具核心接口，继承自 Spring AI 的 `ToolCallback` |
| `CodeactToolMetadata` | 工具元数据，定义语言支持、类名、Few-shot 示例等 |
| `CodeactToolDefinition` | 结构化工具定义，包含参数树和返回值 schema |
| `ParameterTree` | 参数树，定义工具参数结构 |
| `ReturnSchema` | 返回值 schema，定义工具返回值结构 |

### 工具调用流程

```
Agent 生成 Python 代码
        │
        ▼
┌─────────────────────────────────────────┐
│         GraalVM 代码执行器              │
│                                          │
│  result = my_tool.do_something(arg=1)   │
│                 │                        │
│                 ▼                        │
│        CodeactToolRegistry              │
│                 │                        │
│                 ▼                        │
│        CodeactTool.call(json)           │
│                 │                        │
│                 ▼                        │
│            业务逻辑执行                   │
└────────────────┬────────────────────────┘
                 ▼
           返回结果给 Agent
```

---

## 2. 快速接入方式

### 方式一：实现 CodeactTool 接口

```java
import com.alibaba.assistant.agent.common.tools.CodeactTool;
import com.alibaba.assistant.agent.common.tools.CodeactToolMetadata;
import com.alibaba.assistant.agent.common.tools.DefaultCodeactToolMetadata;
import com.alibaba.assistant.agent.common.tools.definition.CodeactToolDefinition;
import com.alibaba.assistant.agent.common.tools.definition.DefaultCodeactToolDefinition;
import com.alibaba.assistant.agent.common.tools.definition.ParameterTree;
import com.alibaba.assistant.agent.common.tools.definition.ParameterNode;
import com.alibaba.assistant.agent.common.tools.definition.ParameterType;
import com.alibaba.assistant.agent.common.enums.Language;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class WeatherQueryTool implements CodeactTool {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String call(String toolInput) {
        try {
            // 解析输入参数
            Map<String, Object> params = objectMapper.readValue(toolInput, Map.class);
            String city = (String) params.get("city");
            
            // 执行业务逻辑
            String weather = queryWeather(city);
            
            // 返回结果（JSON 格式）
            return objectMapper.writeValueAsString(Map.of(
                "city", city,
                "weather", weather,
                "temperature", 25
            ));
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    @Override
    public CodeactToolDefinition getCodeactDefinition() {
        return DefaultCodeactToolDefinition.builder()
            .name("query_weather")
            .description("查询指定城市的天气信息")
            .parameterTree(ParameterTree.builder()
                .addParameter(ParameterNode.builder()
                    .name("city")
                    .type(ParameterType.STRING)
                    .description("城市名称")
                    .required(true)
                    .build())
                .build())
            .build();
    }

    @Override
    public CodeactToolMetadata getCodeactMetadata() {
        return DefaultCodeactToolMetadata.builder()
            .targetClassName("weather")
            .targetClassDescription("天气查询工具")
            .supportedLanguages(List.of(Language.PYTHON))
            .build();
    }

    @Override
    public ToolDefinition getToolDefinition() {
        // CodeactToolDefinition 继承自 ToolDefinition，可直接返回
        return getCodeactDefinition();
    }

    private String queryWeather(String city) {
        // 实际业务逻辑
        return "晴天";
    }
}
```

### 方式二：使用 @Bean 方式注册工具

```java
import com.alibaba.assistant.agent.common.tools.CodeactTool;
import com.alibaba.assistant.agent.common.tools.CodeactToolMetadata;
import com.alibaba.assistant.agent.common.tools.DefaultCodeactToolMetadata;
import com.alibaba.assistant.agent.common.tools.definition.CodeactToolDefinition;
import com.alibaba.assistant.agent.common.tools.definition.DefaultCodeactToolDefinition;
import com.alibaba.assistant.agent.common.tools.definition.ParameterTree;
import com.alibaba.assistant.agent.common.tools.definition.ParameterNode;
import com.alibaba.assistant.agent.common.tools.definition.ParameterType;
import com.alibaba.assistant.agent.common.enums.Language;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

@Configuration
public class ToolConfig {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public CodeactTool calculatorTool() {
        return new CodeactTool() {
            @Override
            public String call(String toolInput) {
                try {
                    Map<String, Object> params = objectMapper.readValue(toolInput, Map.class);
                    String expression = (String) params.get("expression");
                    // 计算逻辑（这里简化处理）
                    double result = 42.0;
                    return objectMapper.writeValueAsString(Map.of("result", result));
                } catch (Exception e) {
                    return "{\"error\": \"" + e.getMessage() + "\"}";
                }
            }

            @Override
            public CodeactToolDefinition getCodeactDefinition() {
                return DefaultCodeactToolDefinition.builder()
                    .name("calculate")
                    .description("执行数学计算")
                    .parameterTree(ParameterTree.builder()
                        .addParameter(ParameterNode.builder()
                            .name("expression")
                            .type(ParameterType.STRING)
                            .description("数学表达式")
                            .required(true)
                            .build())
                        .build())
                    .build();
            }

            @Override
            public CodeactToolMetadata getCodeactMetadata() {
                return DefaultCodeactToolMetadata.builder()
                    .targetClassName("math")
                    .targetClassDescription("数学计算工具")
                    .supportedLanguages(List.of(Language.PYTHON))
                    .build();
            }

            @Override
            public ToolDefinition getToolDefinition() {
                // CodeactToolDefinition 继承自 ToolDefinition，可直接返回
                return getCodeactDefinition();
            }
        };
    }
}
```

---

## 3. 工具自动注册

实现 `CodeactTool` 接口并标注 `@Component`，工具会自动注册到 `CodeactToolRegistry`。

Agent 生成的代码可以这样调用：

```python
# 天气查询工具
result = weather.query_weather(city="北京")
print(f"天气: {result['weather']}, 温度: {result['temperature']}℃")

# 计算器工具
calc_result = math.calculate(expression="1 + 2 * 3")
print(f"结果: {calc_result['result']}")
```

---

## 参数类型

| ParameterType | 说明 | Python 类型 |
|--------------|------|------------|
| `STRING` | 字符串 | `str` |
| `INTEGER` | 整数 | `int` |
| `NUMBER` | 浮点数 | `float` |
| `BOOLEAN` | 布尔值 | `bool` |
| `ARRAY` | 数组 | `list` |
| `OBJECT` | 对象 | `dict` |

