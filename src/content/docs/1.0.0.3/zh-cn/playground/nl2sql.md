---
title: NL2SQL
description: NL2SQL 自然语言到 SQL 转换服务
---

# NL2SQL

NL2SQL 是基于 Spring AI Alibaba 构建的自然语言到 SQL 转换服务，能够将自然语言查询自动转换为 SQL 语句，并执行查询返回结果。

## 功能特性

### 核心能力
- **自然语言理解**: 理解复杂的自然语言查询意图
- **SQL 生成**: 自动生成准确的 SQL 语句
- **多数据库支持**: 支持 MySQL、PostgreSQL、Oracle 等主流数据库
- **智能优化**: 自动优化生成的 SQL 语句
- **结果解释**: 对查询结果进行自然语言解释

### 应用场景
- 商业智能分析
- 数据探索和分析
- 报表生成
- 自助式数据查询
- 数据库学习辅助

## 快速开始

### 环境配置

```yaml
# application.yml
nl2sql:
  enabled: true
  default-database: mysql
  max-query-time: 30s
  
  databases:
    - name: sales_db
      type: mysql
      url: jdbc:mysql://localhost:3306/sales
      username: ${DB_USERNAME}
      password: ${DB_PASSWORD}
      schema-cache-ttl: 1h
    
    - name: analytics_db
      type: postgresql
      url: jdbc:postgresql://localhost:5432/analytics
      username: ${PG_USERNAME}
      password: ${PG_PASSWORD}
      schema-cache-ttl: 1h
```

### 基本使用

```java
@RestController
@RequestMapping("/api/nl2sql")
public class NL2SQLController {
    
    @Autowired
    private NL2SQLService nl2sqlService;
    
    @PostMapping("/query")
    public ResponseEntity<QueryResult> executeQuery(@RequestBody NLQueryRequest request) {
        QueryResult result = nl2sqlService.executeNaturalLanguageQuery(
            NLQuery.builder()
                .question(request.getQuestion())
                .database(request.getDatabase())
                .context(request.getContext())
                .build()
        );
        
        return ResponseEntity.ok(result);
    }
    
    @PostMapping("/explain")
    public ResponseEntity<SQLExplanation> explainSQL(@RequestBody SQLExplainRequest request) {
        SQLExplanation explanation = nl2sqlService.explainSQL(
            request.getSql(), request.getDatabase());
        
        return ResponseEntity.ok(explanation);
    }
    
    @GetMapping("/schema/{database}")
    public ResponseEntity<DatabaseSchema> getSchema(@PathVariable String database) {
        DatabaseSchema schema = nl2sqlService.getDatabaseSchema(database);
        return ResponseEntity.ok(schema);
    }
}
```

## 核心组件

### 自然语言理解

```java
@Component
public class NaturalLanguageProcessor {
    
    @Autowired
    private ChatClient chatClient;
    
    public QueryIntent analyzeIntent(String question, DatabaseSchema schema) {
        String prompt = String.format("""
            分析以下自然语言查询的意图：
            
            问题：%s
            
            可用的数据库表结构：
            %s
            
            请识别：
            1. 查询类型（SELECT, COUNT, SUM, AVG, etc.）
            2. 涉及的表
            3. 需要的字段
            4. 过滤条件
            5. 排序要求
            6. 聚合需求
            7. 关联关系
            
            以JSON格式返回分析结果。
            """, question, formatSchema(schema));
        
        return chatClient.prompt()
            .user(prompt)
            .call()
            .entity(QueryIntent.class);
    }
    
    private String formatSchema(DatabaseSchema schema) {
        StringBuilder sb = new StringBuilder();
        
        for (Table table : schema.getTables()) {
            sb.append("表名: ").append(table.getName()).append("\n");
            sb.append("描述: ").append(table.getDescription()).append("\n");
            sb.append("字段:\n");
            
            for (Column column : table.getColumns()) {
                sb.append("  - ").append(column.getName())
                  .append(" (").append(column.getType()).append(")")
                  .append(" - ").append(column.getDescription()).append("\n");
            }
            sb.append("\n");
        }
        
        return sb.toString();
    }
}
```

### SQL 生成器

```java
@Component
public class SQLGenerator {
    
    @Autowired
    private ChatClient chatClient;
    
    public GeneratedSQL generateSQL(QueryIntent intent, DatabaseSchema schema, String dialect) {
        String prompt = String.format("""
            根据查询意图生成SQL语句：
            
            查询意图：%s
            数据库方言：%s
            表结构：%s
            
            要求：
            1. 生成准确的SQL语句
            2. 使用适当的JOIN
            3. 添加必要的WHERE条件
            4. 考虑性能优化
            5. 确保语法正确
            
            请返回：
            - SQL语句
            - 执行计划说明
            - 可能的性能问题
            """, 
            intent.toString(), 
            dialect, 
            formatSchemaForSQL(schema, intent.getTables())
        );
        
        SQLGenerationResult result = chatClient.prompt()
            .user(prompt)
            .call()
            .entity(SQLGenerationResult.class);
        
        return GeneratedSQL.builder()
            .sql(result.getSql())
            .explanation(result.getExplanation())
            .estimatedCost(result.getEstimatedCost())
            .warnings(result.getWarnings())
            .build();
    }
}
```

### 数据库模式管理

```java
@Service
public class DatabaseSchemaService {
    
    @Autowired
    private Map<String, DataSource> dataSources;
    
    @Cacheable(value = "database-schemas", key = "#databaseName")
    public DatabaseSchema getSchema(String databaseName) {
        DataSource dataSource = dataSources.get(databaseName);
        if (dataSource == null) {
            throw new DatabaseNotFoundException(databaseName);
        }
        
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            
            List<Table> tables = extractTables(metaData);
            List<Relationship> relationships = extractRelationships(metaData);
            
            return DatabaseSchema.builder()
                .databaseName(databaseName)
                .tables(tables)
                .relationships(relationships)
                .extractedAt(Instant.now())
                .build();
                
        } catch (SQLException e) {
            throw new SchemaExtractionException("Failed to extract schema", e);
        }
    }
    
    private List<Table> extractTables(DatabaseMetaData metaData) throws SQLException {
        List<Table> tables = new ArrayList<>();
        
        try (ResultSet tableRs = metaData.getTables(null, null, "%", new String[]{"TABLE"})) {
            while (tableRs.next()) {
                String tableName = tableRs.getString("TABLE_NAME");
                String tableComment = tableRs.getString("REMARKS");
                
                List<Column> columns = extractColumns(metaData, tableName);
                
                tables.add(Table.builder()
                    .name(tableName)
                    .description(tableComment)
                    .columns(columns)
                    .build());
            }
        }
        
        return tables;
    }
    
    private List<Column> extractColumns(DatabaseMetaData metaData, String tableName) throws SQLException {
        List<Column> columns = new ArrayList<>();
        
        try (ResultSet columnRs = metaData.getColumns(null, null, tableName, "%")) {
            while (columnRs.next()) {
                columns.add(Column.builder()
                    .name(columnRs.getString("COLUMN_NAME"))
                    .type(columnRs.getString("TYPE_NAME"))
                    .nullable(columnRs.getInt("NULLABLE") == DatabaseMetaData.columnNullable)
                    .description(columnRs.getString("REMARKS"))
                    .build());
            }
        }
        
        return columns;
    }
}
```

## 查询执行

### 安全执行器

```java
@Component
public class SafeQueryExecutor {
    
    @Autowired
    private Map<String, DataSource> dataSources;
    
    @Autowired
    private QueryValidator queryValidator;
    
    public QueryExecutionResult executeQuery(String sql, String databaseName, QueryContext context) {
        // 验证SQL安全性
        ValidationResult validation = queryValidator.validate(sql);
        if (!validation.isValid()) {
            throw new UnsafeQueryException(validation.getErrors());
        }
        
        DataSource dataSource = dataSources.get(databaseName);
        if (dataSource == null) {
            throw new DatabaseNotFoundException(databaseName);
        }
        
        try (Connection connection = dataSource.getConnection()) {
            // 设置只读模式
            connection.setReadOnly(true);
            
            // 设置查询超时
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(30);
                
                long startTime = System.currentTimeMillis();
                
                try (ResultSet resultSet = statement.executeQuery()) {
                    List<Map<String, Object>> rows = extractRows(resultSet);
                    long executionTime = System.currentTimeMillis() - startTime;
                    
                    return QueryExecutionResult.builder()
                        .rows(rows)
                        .rowCount(rows.size())
                        .executionTimeMs(executionTime)
                        .columns(extractColumnInfo(resultSet.getMetaData()))
                        .build();
                }
            }
            
        } catch (SQLException e) {
            throw new QueryExecutionException("Failed to execute query", e);
        }
    }
}
```

### 查询验证器

```java
@Component
public class QueryValidator {
    
    private static final Set<String> FORBIDDEN_KEYWORDS = Set.of(
        "DROP", "DELETE", "UPDATE", "INSERT", "CREATE", "ALTER", "TRUNCATE"
    );
    
    private static final Set<String> FORBIDDEN_FUNCTIONS = Set.of(
        "LOAD_FILE", "INTO OUTFILE", "INTO DUMPFILE"
    );
    
    public ValidationResult validate(String sql) {
        List<String> errors = new ArrayList<>();
        
        String upperSql = sql.toUpperCase();
        
        // 检查禁用关键词
        for (String keyword : FORBIDDEN_KEYWORDS) {
            if (upperSql.contains(keyword)) {
                errors.add("Forbidden keyword: " + keyword);
            }
        }
        
        // 检查禁用函数
        for (String function : FORBIDDEN_FUNCTIONS) {
            if (upperSql.contains(function)) {
                errors.add("Forbidden function: " + function);
            }
        }
        
        // 检查SQL注入
        if (containsSQLInjection(sql)) {
            errors.add("Potential SQL injection detected");
        }
        
        // 检查复杂度
        if (isQueryTooComplex(sql)) {
            errors.add("Query is too complex");
        }
        
        return ValidationResult.builder()
            .valid(errors.isEmpty())
            .errors(errors)
            .build();
    }
    
    private boolean containsSQLInjection(String sql) {
        // 简单的SQL注入检测
        String[] injectionPatterns = {
            "';", "--", "/*", "*/", "xp_", "sp_", "UNION", "EXEC"
        };
        
        String upperSql = sql.toUpperCase();
        for (String pattern : injectionPatterns) {
            if (upperSql.contains(pattern)) {
                return true;
            }
        }
        
        return false;
    }
}
```

## 结果解释

### 智能结果解释器

```java
@Component
public class ResultInterpreter {
    
    @Autowired
    private ChatClient chatClient;
    
    public ResultExplanation explainResult(QueryExecutionResult result, String originalQuestion) {
        String prompt = String.format("""
            解释以下查询结果：
            
            原始问题：%s
            
            查询结果：
            行数：%d
            执行时间：%d毫秒
            
            数据样本：
            %s
            
            请提供：
            1. 结果摘要
            2. 关键发现
            3. 数据趋势
            4. 异常值
            5. 建议的后续分析
            """,
            originalQuestion,
            result.getRowCount(),
            result.getExecutionTimeMs(),
            formatSampleData(result.getRows())
        );
        
        ExplanationResult explanation = chatClient.prompt()
            .user(prompt)
            .call()
            .entity(ExplanationResult.class);
        
        return ResultExplanation.builder()
            .summary(explanation.getSummary())
            .keyFindings(explanation.getKeyFindings())
            .trends(explanation.getTrends())
            .anomalies(explanation.getAnomalies())
            .recommendations(explanation.getRecommendations())
            .build();
    }
    
    private String formatSampleData(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) {
            return "无数据";
        }
        
        StringBuilder sb = new StringBuilder();
        
        // 显示前5行数据
        int sampleSize = Math.min(5, rows.size());
        for (int i = 0; i < sampleSize; i++) {
            Map<String, Object> row = rows.get(i);
            sb.append("行 ").append(i + 1).append(": ");
            
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                sb.append(entry.getKey()).append("=").append(entry.getValue()).append(", ");
            }
            
            sb.append("\n");
        }
        
        if (rows.size() > sampleSize) {
            sb.append("... (还有 ").append(rows.size() - sampleSize).append(" 行)");
        }
        
        return sb.toString();
    }
}
```

## 查询优化

### SQL 优化建议

```java
@Component
public class QueryOptimizer {
    
    public OptimizationSuggestions optimizeQuery(String sql, DatabaseSchema schema) {
        List<OptimizationSuggestion> suggestions = new ArrayList<>();
        
        // 分析查询
        QueryAnalysis analysis = analyzeQuery(sql);
        
        // 检查索引使用
        suggestions.addAll(checkIndexUsage(analysis, schema));
        
        // 检查JOIN优化
        suggestions.addAll(checkJoinOptimization(analysis));
        
        // 检查WHERE条件
        suggestions.addAll(checkWhereConditions(analysis));
        
        // 检查SELECT字段
        suggestions.addAll(checkSelectFields(analysis));
        
        return OptimizationSuggestions.builder()
            .originalQuery(sql)
            .suggestions(suggestions)
            .estimatedImprovement(calculateImprovement(suggestions))
            .build();
    }
    
    private List<OptimizationSuggestion> checkIndexUsage(QueryAnalysis analysis, DatabaseSchema schema) {
        List<OptimizationSuggestion> suggestions = new ArrayList<>();
        
        for (String tableName : analysis.getTables()) {
            Table table = schema.getTable(tableName);
            List<String> whereColumns = analysis.getWhereColumns(tableName);
            
            for (String column : whereColumns) {
                if (!table.hasIndex(column)) {
                    suggestions.add(OptimizationSuggestion.builder()
                        .type("INDEX")
                        .description("考虑在 " + tableName + "." + column + " 上创建索引")
                        .impact("HIGH")
                        .suggestedSQL("CREATE INDEX idx_" + tableName + "_" + column + 
                                     " ON " + tableName + "(" + column + ")")
                        .build());
                }
            }
        }
        
        return suggestions;
    }
}
```

## 可视化支持

### 图表生成

```java
@Component
public class ChartGenerator {
    
    public ChartData generateChart(QueryExecutionResult result, String chartType) {
        switch (chartType.toLowerCase()) {
            case "bar":
                return generateBarChart(result);
            case "line":
                return generateLineChart(result);
            case "pie":
                return generatePieChart(result);
            case "scatter":
                return generateScatterChart(result);
            default:
                return generateAutoChart(result);
        }
    }
    
    private ChartData generateAutoChart(QueryExecutionResult result) {
        // 自动选择最适合的图表类型
        ChartTypeAnalysis analysis = analyzeDataForChart(result);
        
        switch (analysis.getRecommendedType()) {
            case "BAR":
                return generateBarChart(result);
            case "LINE":
                return generateLineChart(result);
            case "PIE":
                return generatePieChart(result);
            default:
                return generateTableChart(result);
        }
    }
    
    private ChartTypeAnalysis analyzeDataForChart(QueryExecutionResult result) {
        List<ColumnInfo> columns = result.getColumns();
        
        int numericColumns = (int) columns.stream()
            .filter(col -> isNumericType(col.getType()))
            .count();
        
        int categoricalColumns = columns.size() - numericColumns;
        
        if (numericColumns == 1 && categoricalColumns == 1) {
            return ChartTypeAnalysis.builder()
                .recommendedType("BAR")
                .confidence(0.9)
                .reason("一个分类字段和一个数值字段，适合柱状图")
                .build();
        } else if (numericColumns >= 2) {
            return ChartTypeAnalysis.builder()
                .recommendedType("SCATTER")
                .confidence(0.8)
                .reason("多个数值字段，适合散点图")
                .build();
        } else {
            return ChartTypeAnalysis.builder()
                .recommendedType("TABLE")
                .confidence(0.6)
                .reason("数据结构复杂，建议使用表格展示")
                .build();
        }
    }
}
```

## 配置选项

```properties
# NL2SQL 核心配置
nl2sql.enabled=true
nl2sql.max-concurrent-queries=10
nl2sql.query-timeout=30s

# 安全配置
nl2sql.security.read-only=true
nl2sql.security.forbidden-keywords=DROP,DELETE,UPDATE,INSERT
nl2sql.security.max-rows=1000

# 缓存配置
nl2sql.cache.schema-ttl=1h
nl2sql.cache.query-result-ttl=5m
nl2sql.cache.enabled=true

# 优化配置
nl2sql.optimization.enabled=true
nl2sql.optimization.suggest-indexes=true
nl2sql.optimization.analyze-performance=true

# 可视化配置
nl2sql.visualization.enabled=true
nl2sql.visualization.auto-chart=true
nl2sql.visualization.max-data-points=1000
```

## 最佳实践

### 1. 数据库设计
- 使用有意义的表名和字段名
- 添加详细的注释说明
- 建立合适的索引

### 2. 查询安全
- 启用只读模式
- 设置查询超时
- 验证SQL安全性

### 3. 性能优化
- 缓存数据库模式
- 限制结果集大小
- 监控查询性能

### 4. 用户体验
- 提供查询建议
- 解释查询结果
- 支持可视化展示

## 下一步

- [了解多智能体架构](/docs/1.0.0.3/multi-agent/architectures/)
- [探索 Studio](/docs/1.0.0.3/playground/studio/)
- [学习 JManus](/docs/1.0.0.3/playground/jmanus/)
