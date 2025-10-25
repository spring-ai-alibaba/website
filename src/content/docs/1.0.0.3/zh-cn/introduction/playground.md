---
title: Playground
keywords: [Spring AI Alibaba, Playground, 示例体验, JManus, DeepResearch, NL2SQL]
description: "体验 Spring AI Alibaba 的官方 Playground 示例，包含完整的前端 UI 和后端实现，展示框架的所有核心能力。"
---

## 概述

Spring AI Alibaba Playground 是官方提供的完整示例应用，包含了前端 UI 和后端实现，让开发者可以直观地体验框架的所有核心功能。通过 Playground，您可以快速了解 Spring AI Alibaba 的能力边界，并将其作为自己项目的起点。

## 官方 Playground 示例

### 功能特性

Spring AI Alibaba 官方 Playground 涵盖了框架的所有核心能力：

- **聊天机器人**：基础的对话交互功能
- **多轮对话**：支持上下文记忆的连续对话
- **图片生成**：AI 图像生成能力
- **多模态**：文本、图像等多种输入类型处理
- **工具调用**：外部 API 和服务集成
- **MCP 集成**：模型上下文协议支持
- **RAG 知识库**：检索增强生成功能
- **流式处理**：实时响应输出

### 界面展示

![Spring AI Alibaba Playground](/img/user/ai/overview/1.0.0/playground.png)

### 快速体验

#### 1. 本地部署

```bash
# 克隆示例仓库
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-playground

# 配置环境变量
export DASHSCOPE_API_KEY=your-api-key

# 启动应用
./mvnw spring-boot:run
```

#### 2. 访问体验

启动成功后，在浏览器中访问：
- **主页**：http://localhost:8080
- **聊天界面**：http://localhost:8080/chat
- **管理界面**：http://localhost:8080/admin

#### 3. 功能测试

您可以尝试以下功能：

```bash
# 基础聊天
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，请介绍一下自己"}'

# 工具调用
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "今天北京的天气怎么样？"}'

# 图片生成
curl -X POST http://localhost:8080/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的小猫在花园里玩耍"}'
```

## 专业智能体产品

基于 Spring AI Alibaba 框架，社区开发了多个专业的智能体产品，展示了框架在不同领域的应用潜力。

### JManus - 通用智能体平台

JManus 是一个完整的通用智能体平台，对标 OpenManus 等产品，提供了强大的自主规划和执行能力。

#### 核心特性

- **多智能体协作**：支持复杂的智能体协作场景
- **可视化配置**：通过 Web 界面轻松配置智能体
- **MCP 协议集成**：无缝接入模型上下文协议
- **PLAN-ACT 模式**：智能规划与执行相结合
- **丰富的工具集成**：内置浏览器操作、文件处理等工具

#### 应用场景

- **自动化业务流程**：将复杂业务流程自动化
- **智能数据处理**：批量处理和分析数据
- **Web 自动化操作**：自动完成网页操作、表单填写
- **跨系统集成**：连接不同系统，实现数据流转
- **个性化 AI 助手**：构建特定业务需求的智能助手

#### 快速体验

```bash
# 启动 JManus
cd spring-ai-alibaba-jmanus
./mvnw spring-boot:run

# 访问管理界面
open http://localhost:8080/manus
```

### DeepResearch - 深度研究智能体

DeepResearch 是一个专门用于深度研究的智能体系统，能够自动完成复杂的研究任务。

#### 核心能力

- **多源信息收集**：从多个渠道收集相关信息
- **智能信息筛选**：自动过滤和筛选有价值的信息
- **深度分析处理**：对收集的信息进行深度分析
- **结构化报告生成**：生成专业的研究报告
- **多智能体协作**：研究团队智能体协作完成任务

#### 系统架构

DeepResearch 采用多智能体协作架构：

1. **协调智能体**：负责任务分解和流程协调
2. **背景调研智能体**：收集和分析背景信息
3. **规划智能体**：制定详细的研究计划
4. **研究智能体**：执行具体的研究任务
5. **写作智能体**：生成最终的研究报告

#### 使用示例

```bash
# 启动 DeepResearch
cd spring-ai-alibaba-deepresearch
./mvnw spring-boot:run

# 发起研究任务
curl -X POST http://localhost:8080/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "人工智能在医疗领域的应用现状与发展趋势"}'
```

### NL2SQL - 自然语言转 SQL

NL2SQL 是基于百炼析言 ChatBI 技术的自然语言到 SQL 转换服务，让用户可以用自然语言查询数据库。

#### 核心功能

- **自然语言理解**：理解用户的查询意图
- **数据库模式分析**：自动分析数据库结构
- **SQL 自动生成**：生成准确的 SQL 查询语句
- **结果可视化**：将查询结果可视化展示
- **多数据库支持**：支持 MySQL、PostgreSQL 等主流数据库

#### 技术特点

- **智能模式推理**：自动理解表结构和关系
- **上下文感知**：支持多轮对话式查询
- **错误自动修正**：自动检测和修正 SQL 错误
- **性能优化**：生成高效的 SQL 查询语句

#### 使用示例

```bash
# 启动 NL2SQL 服务
cd spring-ai-alibaba-nl2sql
./mvnw spring-boot:run

# 自然语言查询
curl -X POST http://localhost:8080/api/nl2sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "查询销售额最高的前10个产品",
    "database": "sales_db"
  }'
```

## Studio - 可视化开发工具

Spring AI Alibaba Studio 是一个可视化的智能体开发工具，让开发者可以通过拖拽的方式构建复杂的智能体应用。

### 核心特性

- **可视化设计器**：拖拽式的流程设计界面
- **代码自动生成**：自动生成 Spring AI Alibaba Graph 代码
- **实时预览**：实时预览智能体执行效果
- **模板库**：丰富的预定义模板和组件
- **调试工具**：完整的调试和监控功能

### 使用流程

1. **创建项目**：选择模板或从空白开始
2. **设计流程**：拖拽节点设计智能体流程
3. **配置参数**：设置节点参数和连接关系
4. **测试调试**：在线测试和调试智能体
5. **导出代码**：生成完整的项目代码

### 快速开始

```bash
# 启动 Studio
cd spring-ai-alibaba-graph-studio
./mvnw spring-boot:run

# 访问设计器
open http://localhost:8080/studio
```

## 自定义 Playground

您可以基于官方 Playground 创建自己的定制版本：

### 1. 克隆和修改

```bash
# 克隆 Playground
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-examples/spring-ai-alibaba-playground

# 根据需求修改配置
vim src/main/resources/application.yml
```

### 2. 添加自定义功能

```java
@RestController
@RequestMapping("/api/custom")
public class CustomController {
    
    private final ChatClient chatClient;
    
    @PostMapping("/business-chat")
    public String businessChat(@RequestBody ChatRequest request) {
        String systemPrompt = """
            你是一个专业的业务顾问，专门帮助企业解决业务问题。
            请根据用户的问题提供专业的建议和解决方案。
            """;
            
        return chatClient.prompt()
            .system(systemPrompt)
            .user(request.getMessage())
            .call()
            .content();
    }
}
```

### 3. 集成企业系统

```java
@Configuration
public class EnterpriseIntegrationConfig {
    
    @Bean
    public ToolCallback enterpriseSystemTool() {
        return new ToolCallback() {
            @Override
            public String call(String input) {
                // 调用企业内部系统
                return enterpriseService.processRequest(input);
            }
        };
    }
}
```

## 最佳实践

### 1. 环境配置

```properties
# 基础配置
spring.ai.dashscope.api-key=${DASHSCOPE_API_KEY}
spring.ai.dashscope.chat.options.model=qwen-max-latest

# 工具配置
spring.ai.alibaba.toolcalling.weather.enabled=true
spring.ai.alibaba.toolcalling.weather.api-key=${WEATHER_API_KEY}

# MCP 配置
spring.ai.mcp.server.name=my-playground
spring.ai.mcp.server.capabilities.tool=true
```

### 2. 性能优化

- 合理设置模型参数
- 使用连接池管理资源
- 实现适当的缓存策略
- 监控系统性能指标

### 3. 安全考虑

- 保护 API 密钥安全
- 实现用户认证和授权
- 限制 API 调用频率
- 记录和监控系统访问

## 总结

Spring AI Alibaba Playground 为开发者提供了完整的框架体验环境，通过官方示例和专业产品，您可以：

- 快速了解框架能力
- 学习最佳实践
- 获得项目灵感
- 加速开发进程

建议您从 Playground 开始，逐步探索框架的各项功能，然后根据自己的需求进行定制和扩展。
