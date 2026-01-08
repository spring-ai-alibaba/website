# 自定义 CodeAct 工具 - 高级特性

## 1. 结构化参数定义

### 嵌套对象参数

```java
ParameterTree.builder()
    .addParameter(ParameterNode.builder()
        .name("user")
        .type(ParameterType.OBJECT)
        .description("用户信息")
        .required(true)
        .addProperty(ParameterNode.builder()
            .name("name")
            .type(ParameterType.STRING)
            .description("用户名")
            .required(true)
            .build())
        .addProperty(ParameterNode.builder()
            .name("age")
            .type(ParameterType.INTEGER)
            .description("年龄")
            .build())
        .addProperty(ParameterNode.builder()
            .name("email")
            .type(ParameterType.STRING)
            .description("邮箱")
            .build())
        .build())
    .build();
```

Agent 调用代码：

```python
result = user_tool.create_user(user={
    "name": "张三",
    "age": 25,
    "email": "zhangsan@example.com"
})
```

### 数组参数

```java
ParameterTree.builder()
    .addParameter(ParameterNode.builder()
        .name("items")
        .type(ParameterType.ARRAY)
        .description("项目列表")
        .required(true)
        .items(ParameterNode.builder()
            .name("item")
            .type(ParameterType.STRING)
            .description("项目名")
            .build())
        .build())
    .build();
```

Agent 调用代码：

```python
result = tool.process_items(items=["item1", "item2", "item3"])
```

---

## 2. 返回值 Schema 定义

```java
@Override
public CodeactToolDefinition getCodeactDefinition() {
    // 构建商品对象的 shape
    ObjectShapeNode productShape = new ObjectShapeNode();
    productShape.putField("id", new PrimitiveShapeNode(PrimitiveType.STRING, false, "商品ID"));
    productShape.putField("name", new PrimitiveShapeNode(PrimitiveType.STRING, false, "商品名称"));
    productShape.putField("price", new PrimitiveShapeNode(PrimitiveType.NUMBER, false, "价格"));

    // 构建返回值的 shape
    ObjectShapeNode resultShape = new ObjectShapeNode();
    resultShape.putField("products", new ArrayShapeNode(productShape, false, "商品列表"));
    resultShape.putField("total", new PrimitiveShapeNode(PrimitiveType.INTEGER, false, "总数量"));

    return DefaultCodeactToolDefinition.builder()
        .name("search_products")
        .description("搜索商品")
        .parameterTree(ParameterTree.builder()
            .addParameter(ParameterNode.builder()
                .name("keyword")
                .type(ParameterType.STRING)
                .description("搜索关键词")
                .required(true)
                .build())
            .build())
        .declaredReturnSchema(ReturnSchema.builder()
            .successShape(resultShape)
            .build())
        .build();
}
```

---

## 3. Few-Shot 示例

为工具提供调用示例，帮助 LLM 生成更准确的代码：

```java
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("order")
        .targetClassDescription("订单管理工具")
        .supportedLanguages(List.of(Language.PYTHON))
        .addFewShot(new CodeExample(
            "创建一个订单，商品ID是123，数量是2",
            """
            order_result = order.create_order(
                product_id="123",
                quantity=2
            )
            print(f"订单创建成功，订单号: {order_result['order_id']}")
            """,
            "成功创建订单并返回订单号"
        ))
        .addFewShot(new CodeExample(
            "查询订单 ORD-001 的状态",
            """
            status = order.get_order_status(order_id="ORD-001")
            print(f"订单状态: {status['status']}")
            """,
            "返回订单状态信息"
        ))
        .build();
}
```

---

## 4. 工具别名

```java
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("db")
        .displayName("数据库查询工具")
        .aliases(List.of("database", "query", "sql"))
        .build();
}
```

---

## 5. 带 Context 的工具调用

访问 ToolContext 获取运行时信息：

```java
@Override
public String call(String toolInput, ToolContext context) {
    // 获取会话 ID
    String sessionId = (String) context.get("sessionId");
    
    // 获取用户信息
    Map<String, Object> userInfo = (Map<String, Object>) context.get("userInfo");
    
    // 获取 Agent 状态
    OverAllState state = (OverAllState) context.get("state");
    
    // 执行业务逻辑
    return doBusinessLogic(toolInput, sessionId, userInfo);
}
```

---

## 6. 返回直接结果（returnDirect）

设置工具返回后直接返回给用户，不经过后续 Agent 处理：

```java
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("reply")
        .returnDirect(true)  // 返回后直接结束
        .build();
}
```

---

## 7. 多语言支持

```java
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("tools")
        .supportedLanguages(List.of(
            Language.PYTHON,
            Language.JAVASCRIPT
        ))
        .build();
}
```

---

## 8. 异步工具

对于长时间运行的操作：

```java
@Component
public class LongRunningTool implements CodeactTool {

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Override
    public String call(String toolInput) {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            // 长时间运行的操作
            return doLongRunningOperation(toolInput);
        }, executor);

        try {
            // 设置超时
            return future.get(30, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            return "{\"error\": \"操作超时\"}";
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }
}
```

---

## 9. 工具分组

同一 `targetClassName` 的工具会被分到同一组：

```java
// 工具 1
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("file_ops")
        .targetClassDescription("文件操作工具集")
        .build();
}

// 工具 2
@Override
public CodeactToolMetadata getCodeactMetadata() {
    return DefaultCodeactToolMetadata.builder()
        .targetClassName("file_ops")  // 同一组
        .build();
}
```

Agent 调用代码：

```python
# 同一组的工具通过相同的类名调用
content = file_ops.read_file(path="/data/file.txt")
file_ops.write_file(path="/data/output.txt", content=content)
```

---

## 10. 工具测试

```java
@SpringBootTest
class WeatherQueryToolTest {

    @Autowired
    private WeatherQueryTool weatherTool;

    @Test
    void testQueryWeather() throws Exception {
        // 构造输入
        String input = "{\"city\": \"北京\"}";
        
        // 调用工具
        String result = weatherTool.call(input);
        
        // 验证结果
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> resultMap = mapper.readValue(result, Map.class);
        
        assertEquals("北京", resultMap.get("city"));
        assertNotNull(resultMap.get("weather"));
    }

    @Test
    void testToolDefinition() {
        CodeactToolDefinition definition = weatherTool.getCodeactDefinition();
        
        assertEquals("query_weather", definition.name());
        assertFalse(definition.parameterTree().getParameters().isEmpty());
    }
}
```

---

## 11. 错误处理最佳实践

```java
@Override
public String call(String toolInput) {
    try {
        Map<String, Object> params = objectMapper.readValue(toolInput, Map.class);
        
        // 参数校验
        String requiredParam = (String) params.get("required_field");
        if (requiredParam == null || requiredParam.isEmpty()) {
            return toErrorResponse("参数 required_field 不能为空");
        }
        
        // 业务逻辑
        Object result = doBusinessLogic(params);
        
        return toSuccessResponse(result);
        
    } catch (JsonProcessingException e) {
        return toErrorResponse("JSON 解析失败: " + e.getMessage());
    } catch (BusinessException e) {
        return toErrorResponse("业务错误: " + e.getMessage());
    } catch (Exception e) {
        logger.error("WeatherQueryTool#call - reason=工具执行异常", e);
        return toErrorResponse("系统错误: " + e.getMessage());
    }
}

private String toSuccessResponse(Object data) {
    try {
        return objectMapper.writeValueAsString(Map.of(
            "success", true,
            "data", data
        ));
    } catch (Exception e) {
        return "{\"success\": false, \"error\": \"序列化失败\"}";
    }
}

private String toErrorResponse(String message) {
    return "{\"success\": false, \"error\": \"" + message + "\"}";
}
```

