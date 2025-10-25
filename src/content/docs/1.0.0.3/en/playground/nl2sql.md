---
title: NL2SQL
description: Natural Language to SQL conversion
---

# NL2SQL

NL2SQL is a natural language to SQL conversion service that allows users to query databases using natural language, automatically generating and executing SQL statements.

## Overview

### Core Features
- **Natural Language Understanding**: Understand complex natural language queries
- **SQL Generation**: Automatically generate optimized SQL statements
- **Multi-database Support**: Support for MySQL, PostgreSQL, Oracle, and other databases
- **Schema Awareness**: Intelligent understanding of database schemas
- **Query Optimization**: Automatic SQL optimization and performance tuning

### Use Cases
- Business intelligence dashboards
- Data analysis tools
- Customer self-service analytics
- Database query assistance
- Report generation systems

## Quick Start

### Basic Configuration

```java
@Configuration
public class NL2SQLConfig {
    
    @Bean
    public NL2SQLService nl2sqlService() {
        return NL2SQLService.builder()
            .chatClient(chatClient())
            .schemaService(schemaService())
            .queryValidator(queryValidator())
            .build();
    }
    
    @Bean
    public SchemaService schemaService() {
        return new DatabaseSchemaService(dataSource());
    }
}
```

### Simple Usage

```java
@RestController
@RequestMapping("/api/nl2sql")
public class NL2SQLController {
    
    @Autowired
    private NL2SQLService nl2sqlService;
    
    @PostMapping("/query")
    public ResponseEntity<QueryResult> executeQuery(@RequestBody NLQueryRequest request) {
        try {
            QueryResult result = nl2sqlService.executeNaturalLanguageQuery(
                request.getQuery(),
                request.getDatabaseName()
            );
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(QueryResult.error(e.getMessage()));
        }
    }
}
```

## Schema Management

### Automatic Schema Discovery

```java
@Service
public class DatabaseSchemaService {
    
    @Autowired
    private DataSource dataSource;
    
    public DatabaseSchema discoverSchema(String databaseName) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            
            List<TableSchema> tables = new ArrayList<>();
            
            ResultSet tablesResult = metaData.getTables(databaseName, null, null, new String[]{"TABLE"});
            while (tablesResult.next()) {
                String tableName = tablesResult.getString("TABLE_NAME");
                String tableComment = tablesResult.getString("REMARKS");
                
                List<ColumnSchema> columns = discoverColumns(metaData, databaseName, tableName);
                List<IndexSchema> indexes = discoverIndexes(metaData, databaseName, tableName);
                
                tables.add(TableSchema.builder()
                    .name(tableName)
                    .comment(tableComment)
                    .columns(columns)
                    .indexes(indexes)
                    .build());
            }
            
            return DatabaseSchema.builder()
                .name(databaseName)
                .tables(tables)
                .build();
        } catch (SQLException e) {
            throw new SchemaDiscoveryException("Failed to discover schema", e);
        }
    }
    
    private List<ColumnSchema> discoverColumns(DatabaseMetaData metaData, String database, String table) throws SQLException {
        List<ColumnSchema> columns = new ArrayList<>();
        
        ResultSet columnsResult = metaData.getColumns(database, null, table, null);
        while (columnsResult.next()) {
            columns.add(ColumnSchema.builder()
                .name(columnsResult.getString("COLUMN_NAME"))
                .type(columnsResult.getString("TYPE_NAME"))
                .nullable(columnsResult.getBoolean("NULLABLE"))
                .comment(columnsResult.getString("REMARKS"))
                .build());
        }
        
        return columns;
    }
}
```

### Schema Enhancement

```java
@Service
public class SchemaEnhancementService {
    
    @Autowired
    private ChatClient chatClient;
    
    public EnhancedSchema enhanceSchema(DatabaseSchema schema) {
        List<EnhancedTable> enhancedTables = schema.getTables().stream()
            .map(this::enhanceTable)
            .collect(Collectors.toList());
        
        return EnhancedSchema.builder()
            .originalSchema(schema)
            .enhancedTables(enhancedTables)
            .build();
    }
    
    private EnhancedTable enhanceTable(TableSchema table) {
        String enhancementPrompt = String.format("""
            Analyze the following database table and provide enhanced descriptions:
            
            Table: %s
            Columns: %s
            
            Please provide:
            1. Business-friendly table description
            2. Common query patterns
            3. Relationships with other tables
            4. Synonyms and alternative names
            
            Return in JSON format.
            """, 
            table.getName(),
            table.getColumns().stream()
                .map(col -> col.getName() + " (" + col.getType() + ")")
                .collect(Collectors.joining(", "))
        );
        
        TableEnhancement enhancement = chatClient.prompt()
            .user(enhancementPrompt)
            .call()
            .entity(TableEnhancement.class);
        
        return EnhancedTable.builder()
            .originalTable(table)
            .enhancement(enhancement)
            .build();
    }
}
```

## Query Processing

### Natural Language Understanding

```java
@Service
public class QueryUnderstandingService {
    
    @Autowired
    private ChatClient chatClient;
    
    public QueryIntent analyzeQuery(String naturalLanguageQuery, DatabaseSchema schema) {
        String analysisPrompt = String.format("""
            Analyze the following natural language query and extract the intent:
            
            Query: %s
            
            Available tables and columns:
            %s
            
            Please identify:
            1. Query type (SELECT, COUNT, SUM, etc.)
            2. Target tables
            3. Required columns
            4. Filter conditions
            5. Grouping requirements
            6. Sorting requirements
            
            Return in JSON format.
            """, 
            naturalLanguageQuery,
            formatSchemaForPrompt(schema)
        );
        
        return chatClient.prompt()
            .user(analysisPrompt)
            .call()
            .entity(QueryIntent.class);
    }
    
    private String formatSchemaForPrompt(DatabaseSchema schema) {
        return schema.getTables().stream()
            .map(table -> String.format("%s: %s", 
                table.getName(),
                table.getColumns().stream()
                    .map(ColumnSchema::getName)
                    .collect(Collectors.joining(", "))
            ))
            .collect(Collectors.joining("\n"));
    }
}
```

### SQL Generation

```java
@Service
public class SQLGenerationService {
    
    @Autowired
    private ChatClient chatClient;
    
    public GeneratedSQL generateSQL(QueryIntent intent, DatabaseSchema schema) {
        String generationPrompt = String.format("""
            Generate SQL query based on the following intent and schema:
            
            Intent: %s
            Schema: %s
            
            Requirements:
            1. Generate syntactically correct SQL
            2. Use appropriate table aliases
            3. Include necessary JOINs
            4. Add proper WHERE clauses
            5. Optimize for performance
            
            Return only the SQL query without explanations.
            """, 
            intent.toString(),
            formatSchemaForSQL(schema)
        );
        
        String sqlQuery = chatClient.prompt()
            .user(generationPrompt)
            .call()
            .content();
        
        // Validate and clean the SQL
        String cleanedSQL = cleanSQL(sqlQuery);
        
        return GeneratedSQL.builder()
            .query(cleanedSQL)
            .intent(intent)
            .confidence(calculateConfidence(intent, cleanedSQL))
            .build();
    }
    
    private String cleanSQL(String sql) {
        // Remove markdown formatting
        sql = sql.replaceAll("```sql", "").replaceAll("```", "");
        
        // Remove extra whitespace
        sql = sql.trim();
        
        // Ensure semicolon at the end
        if (!sql.endsWith(";")) {
            sql += ";";
        }
        
        return sql;
    }
}
```

## Query Validation

### SQL Validation

```java
@Service
public class QueryValidationService {
    
    public ValidationResult validateSQL(String sql, DatabaseSchema schema) {
        List<ValidationError> errors = new ArrayList<>();
        
        // Syntax validation
        errors.addAll(validateSyntax(sql));
        
        // Schema validation
        errors.addAll(validateSchema(sql, schema));
        
        // Security validation
        errors.addAll(validateSecurity(sql));
        
        return ValidationResult.builder()
            .valid(errors.isEmpty())
            .errors(errors)
            .build();
    }
    
    private List<ValidationError> validateSyntax(String sql) {
        List<ValidationError> errors = new ArrayList<>();
        
        try {
            // Use SQL parser to validate syntax
            CCJSqlParserManager parser = new CCJSqlParserManager();
            Statement statement = parser.parse(new StringReader(sql));
            
            // Additional syntax checks
            if (statement instanceof Select) {
                Select select = (Select) statement;
                // Validate SELECT statement
            }
            
        } catch (JSQLParserException e) {
            errors.add(ValidationError.builder()
                .type("SYNTAX_ERROR")
                .message("SQL syntax error: " + e.getMessage())
                .build());
        }
        
        return errors;
    }
    
    private List<ValidationError> validateSecurity(String sql) {
        List<ValidationError> errors = new ArrayList<>();
        
        // Check for dangerous operations
        String upperSQL = sql.toUpperCase();
        
        if (upperSQL.contains("DROP") || upperSQL.contains("DELETE") || upperSQL.contains("UPDATE")) {
            errors.add(ValidationError.builder()
                .type("SECURITY_ERROR")
                .message("Dangerous SQL operations not allowed")
                .build());
        }
        
        // Check for SQL injection patterns
        if (containsSQLInjectionPatterns(sql)) {
            errors.add(ValidationError.builder()
                .type("SECURITY_ERROR")
                .message("Potential SQL injection detected")
                .build());
        }
        
        return errors;
    }
}
```

## Query Execution

### Safe Execution

```java
@Service
public class QueryExecutionService {
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private QueryValidationService validationService;
    
    public QueryResult executeQuery(GeneratedSQL generatedSQL, DatabaseSchema schema) {
        // Validate query first
        ValidationResult validation = validationService.validateSQL(generatedSQL.getQuery(), schema);
        
        if (!validation.isValid()) {
            return QueryResult.validationError(validation.getErrors());
        }
        
        try (Connection connection = dataSource.getConnection()) {
            // Set read-only mode for safety
            connection.setReadOnly(true);
            
            // Set query timeout
            try (PreparedStatement statement = connection.prepareStatement(generatedSQL.getQuery())) {
                statement.setQueryTimeout(30); // 30 seconds timeout
                
                long startTime = System.currentTimeMillis();
                
                try (ResultSet resultSet = statement.executeQuery()) {
                    List<Map<String, Object>> rows = new ArrayList<>();
                    ResultSetMetaData metaData = resultSet.getMetaData();
                    int columnCount = metaData.getColumnCount();
                    
                    while (resultSet.next() && rows.size() < 1000) { // Limit to 1000 rows
                        Map<String, Object> row = new HashMap<>();
                        for (int i = 1; i <= columnCount; i++) {
                            row.put(metaData.getColumnName(i), resultSet.getObject(i));
                        }
                        rows.add(row);
                    }
                    
                    long executionTime = System.currentTimeMillis() - startTime;
                    
                    return QueryResult.builder()
                        .success(true)
                        .data(rows)
                        .rowCount(rows.size())
                        .executionTime(executionTime)
                        .sql(generatedSQL.getQuery())
                        .build();
                }
            }
        } catch (SQLException e) {
            return QueryResult.executionError(e.getMessage());
        }
    }
}
```

## Query Optimization

### Performance Optimization

```java
@Service
public class QueryOptimizationService {
    
    @Autowired
    private ChatClient chatClient;
    
    public OptimizedSQL optimizeQuery(String originalSQL, DatabaseSchema schema) {
        String optimizationPrompt = String.format("""
            Optimize the following SQL query for better performance:
            
            Original SQL: %s
            
            Database Schema: %s
            
            Please provide:
            1. Optimized SQL query
            2. Optimization techniques applied
            3. Expected performance improvement
            4. Index recommendations
            
            Return in JSON format.
            """, 
            originalSQL,
            formatSchemaForOptimization(schema)
        );
        
        SQLOptimization optimization = chatClient.prompt()
            .user(optimizationPrompt)
            .call()
            .entity(SQLOptimization.class);
        
        return OptimizedSQL.builder()
            .originalSQL(originalSQL)
            .optimizedSQL(optimization.getOptimizedQuery())
            .optimizations(optimization.getOptimizations())
            .indexRecommendations(optimization.getIndexRecommendations())
            .build();
    }
}
```

## Result Formatting

### Data Visualization

```java
@Service
public class ResultFormattingService {
    
    public FormattedResult formatResult(QueryResult result, String format) {
        switch (format.toLowerCase()) {
            case "table":
                return formatAsTable(result);
            case "chart":
                return formatAsChart(result);
            case "json":
                return formatAsJSON(result);
            case "csv":
                return formatAsCSV(result);
            default:
                return formatAsTable(result);
        }
    }
    
    private FormattedResult formatAsTable(QueryResult result) {
        if (result.getData().isEmpty()) {
            return FormattedResult.empty("No data found");
        }
        
        List<String> headers = new ArrayList<>(result.getData().get(0).keySet());
        List<List<String>> rows = result.getData().stream()
            .map(row -> headers.stream()
                .map(header -> String.valueOf(row.get(header)))
                .collect(Collectors.toList()))
            .collect(Collectors.toList());
        
        return FormattedResult.table(headers, rows);
    }
    
    private FormattedResult formatAsChart(QueryResult result) {
        // Analyze data structure to determine best chart type
        ChartType chartType = determineChartType(result);
        
        ChartData chartData = ChartData.builder()
            .type(chartType)
            .data(result.getData())
            .build();
        
        return FormattedResult.chart(chartData);
    }
}
```

## Configuration Options

```properties
# NL2SQL configuration
spring.ai.nl2sql.enabled=true
spring.ai.nl2sql.max-results=1000
spring.ai.nl2sql.query-timeout=30s

# Schema configuration
spring.ai.nl2sql.schema.auto-discovery=true
spring.ai.nl2sql.schema.cache-ttl=1h
spring.ai.nl2sql.schema.enhancement=true

# Security configuration
spring.ai.nl2sql.security.read-only=true
spring.ai.nl2sql.security.allowed-operations=SELECT,SHOW,DESCRIBE
spring.ai.nl2sql.security.sql-injection-check=true

# Performance configuration
spring.ai.nl2sql.optimization.enabled=true
spring.ai.nl2sql.optimization.cache-queries=true
spring.ai.nl2sql.optimization.explain-plan=true
```

## Best Practices

### 1. Schema Design
- Provide clear table and column names
- Add meaningful comments
- Maintain up-to-date documentation
- Use consistent naming conventions

### 2. Query Safety
- Always validate generated SQL
- Use read-only connections
- Set appropriate timeouts
- Limit result set sizes

### 3. Performance Optimization
- Cache frequently used schemas
- Optimize generated queries
- Monitor query performance
- Provide index recommendations

### 4. User Experience
- Provide query suggestions
- Show example queries
- Explain query results
- Handle errors gracefully

## Next Steps

- [Explore Studio](/docs/1.0.0.3/playground/studio/)
- [Learn about JManus](/docs/1.0.0.3/playground/jmanus/)
- [Understand Multi-Agent Systems](/docs/1.0.0.3/multi-agent/agents/)
