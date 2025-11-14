---
title: 阿里云百炼开源面向 Java 开发者的 NL2SQL 智能体框架！
keywords: [Spring AI, Spring AI Alibaba, NL2SQL, ChatBI, 自然语言转SQL]
description: Spring AI Alibaba Nl2sql 是基于 Spring AI Alibaba 的一个智能体框架，致力于打造一套轻量、高效、可扩展的 NL2SQL 框架，让 Java 程序员可以快速构建和集成自然语言查询系统，降低数据问答场景下 AI 能力的接入门槛。
author: 许起瑞, 李维, 刘军
date: "2025-06-17"
category: article
---
## 开源 NL2SQL 智能体框架简介
随着大模型技术的快速发展，自然语言到 SQL（NL2SQL）能力在数据分析领域的落地日益广泛。然而，传统 NL2SQL 方案存在Schema 理解偏差、复杂查询生成效率低、执行结果不可控等问题，导致业务场景中频繁出现“答非所问”或“生成失败”的窘境。为了让更多开发者能够便捷地使用这一能力，我们决定将阿里云析言GBI中“Schema 召回 + SQL 生成 + SQL 执行”的核心链路模块化、组件化，并以开源的形式回馈社区。

官方仓库地址：[https://github.com/alibaba/spring-ai-alibaba](https://github.com/alibaba/spring-ai-alibaba)

### 析言云服务
作为阿里云百炼官方推出的智能数据分析产品，析言 GBI 基于大模型的 ChatBI 技术，帮助用户轻松实现自然语言交互的数据分析。通过 NL2SQL 和数据问答功能，析言 GBI 支持企业快速构建 AI 原生的数据分析解决方案。同时，析言 GBI 提供了丰富的云端服务支持，助力企业实现高效的数据管理与分析。

作为阿里云百炼平台的重要组成部分，析言 GBI 基于通义大模型，针对 NL2SQL 链路进行了深度优化。本次开源聚焦于Schema 召回、SQL 生成与执行引擎 三大核心模块，旨在为开发者提供一个轻量、灵活、可扩展的 NL2SQL 解决方案，让“自然语言对话数据库”真正落地为生产力工具。我们始终秉持“让 SQL 更简单，让数据更自由 ”的初心，希望通过开源与社区共建，推动 NL2SQL 技术在企业级场景中的广泛应用。

### Spring AI Alibaba Nl2sql

Spring AI Alibaba 是一款以 Spring AI 为基础，深度集成百炼平台，支持 ChatBot、工作流、多智能体应用开发模式的 AI 框架。

Spring-ai-alibaba-nl2sql 是基于 Spring AI Alibaba 的一个子项目，致力于打造一套轻量、高效、可扩展的 NL2SQL 框架，让 Java 程序员可以快速构建和集成自然语言查询系统，降低数据问答场景下 AI 能力的接入门槛。

作为阿里云析言 GBI 产品的开源延伸，Spring-ai-alibaba-nl2sql 已经在 GitHub 上发布，并持续更新迭代中。如果你正在寻找一款面向企业级数据场景、支持本地部署与云端调用、兼容多种数据库的 NL2SQL 解决方案，Spring-ai-alibaba-nl2sql 将是一个理想的选择。


## 🧠 核心功能
### ✅ Schema 智能召回：精准匹配数据库语义
在复杂的数据环境中，用户往往不清楚具体字段名或表结构。Spring-ai-alibaba-nl2sql 提供了强大的语义相似度计算能力和多策略召回机制，能够在海量表结构中精准匹配出最可能涉及的数据库 schema 和字段信息。Schema 召回是 NL2SQL 的第一步，也是决定生成质量的关键环节。析言 GBI 开源模块通过以下创新设计，显著提升 Schema 匹配的准确性：

+ 多模态语义理解 ：结合表名、字段名、注释等元数据，构建数据库的“知识图谱”，实现自然语言与 Schema 的双向映射。
+ 动态权重计算 ：根据用户问题上下文，动态调整字段相关性权重（如时间维度、业务关键词），避免冗余字段干扰。
+ 集成向量化索引构建

> 示例 ：
用户提问：“2024 年A手机销量对比B手机”
Schema 召回结果：
>
> + 表名：`sales_data`（相关度 98%）
> + 字段：`brand（A手机、B手机）, sale_date（2024年）, quantity（销量）`
>

### ✅ SQL 智能生成与优化：从对话到高效查询
基于 Qwen 等主流大语言模型的强大推理能力，析言Spring-ai-alibaba-nl2sql实现了从自然语言到结构化 SQL 的一键生成。无论是简单的条件过滤还是复杂的聚合统计、多表关联，都能准确生成对应的 SQL 语句。在复杂 SQL 生成场景中表现卓越：

+ 支持多种数据库方言（MySQL、PostgreSQL）
+ 复杂函数能力 ：支持嵌套子查询、多表关联、窗口函数等复杂语法，覆盖 90% 以上业务场景。

> 生成效果对比 ：
>

| 输入问提 | 传统方案生成SQL | Spring-ai-alibaba-nl2sql |
| --- | --- | --- |
| 找出销售额最高的前 10 个商品，并展示品类和库存量 | `SELECT * FROM products ORDER BY sales DESC LIMIT 10`（漏掉品类字段） | SELECT product_name, category, stock, sales FROM products ORDER BY sales DESC LIMIT 10 |


### ✅ SQL 自动执行与结果反馈：安全、高效、可扩展
生成的 SQL 语句可以直接调度并安全执行，返回结构化结果。同时，系统还提供了丰富的错误处理机制，确保即使在执行失败时也能给出清晰的提示和建议。

+ 数据库连接池管理，提升性能稳定性

### ✅Schema管控模块
同时开源数据库 Schema 管控模块 ，支持对数据库结构的精细管理和向量召回功能。这一模块的引入，使得开发者可以更好地控制和维护数据库结构，提升 Schema 匹配的准确性和效率。

---

## 🔧 系统特点
### 🌱 轻量模块化设计
Spring-ai-alibaba 采用高度解耦的设计理念，将 Schema 召回、SQL 生成、SQL 执行三个环节进行模块化封装，开发者可以根据自身需求灵活组合，适配不同的业务场景。

### ⚙️ 基于 Spring Boot 3.x 支持
得益于对 Spring AI Alibaba 的深度集成，析言GBI-Open 支持 JDK 17+，并提供开箱即用的 Starter 包，开发者只需引入依赖即可快速启动 NL2SQL 服务。

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-nl2sql</artifactId>
    <version>${revision}</version>
</dependency>

```

### ☁️ 无缝对接 Qwen 等主流模型服务
支持接入阿里云 DashScope 平台上的 Qwen 系列模型，也预留了其他 LLM 接入接口，方便开发者自由选择适合自己的模型服务。

---

## 🚀 快速运行
### 1. 准备环境
访问项目地址下载源码：

```bash
git clone https://github.com/springaialibaba/spring-ai-alibaba-examples.git
cd spring-ai-alibaba-nl2sql-example
```

确保已安装：

+ JDK 17 或更高版本
+ MySQL 8.0（或其他支持 JDBC 的数据库）
+ DashScope API Key（用于大模型服务）

设置 DashScope API Key：

```bash
export AI_DASHSCOPE_API_KEY=your_api_key
```

### 2. 项目启动
根据 spring-ai-alibaba-nl2sql-example/chat/README.md 相关操作即可一键启动chat server。

![Spring AI Alibaba Nl2sql](/img/blog/nl2sql/demo.png)

## 开源计划
+ 扩展更多数据库支持 ：涵盖主流数据库系统，如 Oracle、SQL Server 等。
+ 提供可视化配置界面 ：降低使用门槛，方便非技术人员快速上手。
+ 支持对 SQL 结果进行分析总结 ：通过可视化模块展示 SQL 查询结果，帮助用户更直观地理解数据。
+ 深度 BI 分析功能 ：集成高级分析能力，满足企业级数据分析需求。

## 🤝 社区共建计划
作为 Spring AI Alibaba 社区的重要一员，我们欢迎所有开发者共同完善这一生态。Spring-ai-alibaba-nl2sql 不仅仅是一个工具，更是一个开放协作的技术生态。我们诚邀所有对 NL2SQL、大模型应用感兴趣的开发者加入我们：

+ 优化召回策略，提升 Schema 匹配准确率
+ 扩展更多数据库支持
+ 提供可视化配置界面，降低使用门槛
+ 支持流式 SQL 生成、执行监控、结果缓存等功能

## 模型开源
析言 GBI 云服务使用的 SQL 生成模型也是开源的，欢迎大家访问以下地址查看和使用：

+ GitHub 地址：[https://github.com/XGenerationLab/XiYan-SQL?tab=readme-ov-file](https://github.com/XGenerationLab/XiYan-SQL?tab=readme-ov-file)

通过这些模型，开发者可以轻松实现高质量的自然语言到 SQL 的转换。


## 总结

Spring-ai-alibaba-nl2sql 是析言GBI产品在数据问答领域的一次重要开源尝试，专注于 NL2SQL 场景下的核心能力开放。无论你是想快速搭建一个企业级数据助理原型，还是希望深入研究大模型在数据库交互中的应用，Spring-ai-alibaba-nl2sql 都将是你值得信赖的起点。这不仅是对 NL2SQL 技术的一次革新，更是对“开箱即用、共建共享”开源精神的践行。我们相信，通过社区的共同努力，每一个开发者都能轻松驾驭自然语言与数据库的对话，让数据价值触手可及。

让 SQL 更简单，让未来更自由！
