---
title: 环境准备
description: 快速搭建您的第一个 SAA Agent 开发环境。
---

本文将指导您如何快速搭建一个最小化的 Spring AI Alibaba (SAA) Agent 开发环境。

## 1. 环境要求

在开始之前，请确保您的开发环境满足以下要求：

- **Java Development Kit (JDK)**: 版本 17 或更高。
- **构建工具**: [Apache Maven](https://maven.apache.org/download.cgi) 3.6+。
- **Dashscope API Key**: 您需要一个有效的阿里云百炼平台 API Key。请访问[百炼平台控制台](https://dashscope.console.aliyun.com/)获取。

## 3. 添加 SAA 依赖

打开项目的 `pom.xml` 文件，我们需要添加 Spring AI Alibaba (SAA) 的相关依赖。

首先，在 `<properties>` 标签中，添加 SAA 和 Spring AI 的版本号：

```xml
<properties>
    <java.version>17</java.version>
    <spring-ai-alibaba.version>1.0.0.3</spring-ai-alibaba.version>
    <spring-ai.version>1.0.0</spring-ai.version>
</properties>
```

接下来，在 `<dependencyManagement>` 标签中，添加 SAA 的 BOM (Bill of Materials)，以确保所有相关依赖版本的一致性。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-bom</artifactId>
            <version>${spring-ai-alibaba.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

最后，在 `<dependencies>` 标签中，添加与 Dashscope 模型集成的 starter 依赖，以及 SAA Graph 依赖：

```xml
<dependencies>
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    </dependency>
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-graph-core</artifactId>
   </dependency>
</dependencies>
```

## 4. 配置模型 API Key

为了让您的应用能够调用大模型，您需要配置 API Key。

在 `src/main/resources` 目录下，找到 `application.properties` 文件，并将其重命名为 `application.yml`。然后，添加以下内容：

```yaml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
```

我们强烈建议您使用环境变量来管理 API Key，而不是直接硬编码在代码中。请将您的 Dashscope API Key 设置为名为 `AI_DASHSCOPE_API_KEY` 的环境变量。

```bash
export AI_DASHSCOPE_API_KEY=${REPLACE-WITH-VALID-API-KEY}
```

