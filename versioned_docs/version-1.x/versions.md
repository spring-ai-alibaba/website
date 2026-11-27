---
title: 版本与依赖
description: 选择版本线，并核对 Spring AI Alibaba、Extensions、Spring AI 和 Spring Boot 的依赖组合。
---

# 版本与依赖

在站点导航栏切换文档版本。下表列出各版本线的正式发布及其对齐的依赖。

| 文档 | Spring AI Alibaba | Extensions | Spring AI | Spring Boot | MCP Java SDK | Nacos Client |
| --- | --- | --- | --- | --- | --- | --- |
| [2.1.x](/docs/overview) | [2.1.0.0](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.1.0.0) | [2.1.0.0](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.1.0.0) | [2.1.0](https://github.com/spring-projects/spring-ai/releases/tag/v2.1.0) | 4.2.0 | 2.2.0 | 3.3.0 |
| [2.0.x](/docs/2.0.x/overview) | [2.0.3.0](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.0.3.0) | [2.0.3.0](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.0.3.0) | [2.0.3](https://github.com/spring-projects/spring-ai/releases/tag/v2.0.3) | 4.1.3 | 2.1.0 | 3.3.0 |
| [1.x](/docs/1.x/overview) | [1.1.2.2](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v1.1.2.2) | [1.1.2.3](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v1.1.2.3) | [1.1.2](https://github.com/spring-projects/spring-ai/releases/tag/v1.1.2) | 3.5.8 / 3.5.10 | 0.14.0 | 3.1.0 |

主项目 1.1.2.2 的发布 POM 对齐 Spring AI 1.1.2 和 Spring Boot 3.5.8；Extensions 1.1.2.3 使用 Spring AI 1.1.2 和 Boot 3.5.10。Spring AI 1.1.x 独立维护，升级上游补丁时需验证应用和依赖兼容性。

[Spring AI 1.1.8](https://github.com/spring-projects/spring-ai/releases/tag/v1.1.8) · [Extensions 1.1.2.3 POM](https://github.com/spring-ai-alibaba/spring-ai-extensions/blob/v1.1.2.3/pom.xml)

## 使用 BOM 管理依赖

本版本线的示例使用 JDK 17+、Spring Boot 3.5.10 和 Spring AI Alibaba 1.1.2.2。在 Spring Boot 项目中导入下列 BOM，并将 Boot 父 POM 或依赖管理版本对齐为 `3.5.10`。使用 DashScope 等 Extensions 组件时保留 Extensions BOM。

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.alibaba.cloud.ai</groupId>
      <artifactId>spring-ai-alibaba-bom</artifactId>
      <version>1.1.2.2</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>com.alibaba.cloud.ai</groupId>
      <artifactId>spring-ai-alibaba-extensions-bom</artifactId>
      <version>1.1.2.3</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>1.1.2</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

Agent Framework、Graph Core、Studio 与 Graph Starter 使用主仓库 BOM。DashScope、文档解析器和阿里云向量库 Starter 使用 Extensions BOM。Admin 与示例智能体的安装版本按各自的发布说明选用。

继续阅读 [快速开始](quick-start.md) 与 [本版本新特性与迁移](release-highlights.md)。

[发布版依赖定义](https://github.com/alibaba/spring-ai-alibaba/blob/v1.1.2.2/pom.xml)
