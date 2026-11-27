---
title: Versions and dependencies
description: Select a release line and align Spring AI Alibaba, Extensions, Spring AI, and Spring Boot.
---

# Versions and dependencies

Use the site navigation to switch documentation versions. The table lists the releases and their aligned dependencies.

| Docs | Spring AI Alibaba | Extensions | Spring AI | Spring Boot | MCP Java SDK | Nacos Client |
| --- | --- | --- | --- | --- | --- | --- |
| [2.1.x](/docs/overview) | [2.1.0.0](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.1.0.0) | [2.1.0.0](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.1.0.0) | [2.1.0](https://github.com/spring-projects/spring-ai/releases/tag/v2.1.0) | 4.2.0 | 2.2.0 | 3.3.0 |
| [2.0.x](/docs/2.0.x/overview) | [2.0.3.0](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v2.0.3.0) | [2.0.3.0](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v2.0.3.0) | [2.0.3](https://github.com/spring-projects/spring-ai/releases/tag/v2.0.3) | 4.1.3 | 2.1.0 | 3.3.0 |
| [1.x](/docs/1.x/overview) | [1.1.2.2](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v1.1.2.2) | [1.1.2.3](https://github.com/spring-ai-alibaba/spring-ai-extensions/releases/tag/v1.1.2.3) | [1.1.2](https://github.com/spring-projects/spring-ai/releases/tag/v1.1.2) | 3.5.8 / 3.5.10 | 0.14.0 | 3.1.0 |

The Alibaba 1.1.2.2 release builds with Spring AI 1.1.2 and Boot 3.5.8. Extensions 1.1.2.3 builds with Spring AI 1.1.2 and Boot 3.5.10. Verify application and dependency compatibility when upgrading to a newer upstream patch.

[Spring AI 1.1.8](https://github.com/spring-projects/spring-ai/releases/tag/v1.1.8) · [Extensions 1.1.2.3 POM](https://github.com/spring-ai-alibaba/spring-ai-extensions/blob/v1.1.2.3/pom.xml)

## Manage dependencies with BOMs

Examples on this line use JDK 17+, Spring Boot 4.1.3, and Spring AI Alibaba 2.0.3.0. Import these BOMs in a Boot project aligned to `4.1.3`. Keep the Extensions BOM when using Extensions modules such as DashScope.

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.alibaba.cloud.ai</groupId>
      <artifactId>spring-ai-alibaba-bom</artifactId>
      <version>2.0.3.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>com.alibaba.cloud.ai</groupId>
      <artifactId>spring-ai-alibaba-extensions-bom</artifactId>
      <version>2.0.3.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>2.0.3</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

The Alibaba BOM manages Agent Framework, Graph Core, Studio, and Graph starters. The Extensions BOM manages DashScope, document parsers, and Alibaba Cloud vector-store starters. Use each Admin or example agent project’s own release instructions.

Continue with [Quick start](quick-start.md) and [release highlights and migration](release-highlights.md).

[Tagged dependency definitions](https://github.com/alibaba/spring-ai-alibaba/blob/v2.0.3.0/pom.xml)
