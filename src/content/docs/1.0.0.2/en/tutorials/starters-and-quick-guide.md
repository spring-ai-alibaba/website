---
title: Spring AI Alibaba Available Components and Usage Guide
keywords: [Spring Ai Alibaba, Spring Boot Starter]
description: "This article explores in depth"
---

## Core Components Released by Spring AI Alibaba

**1. Basic Usage Method**

Add the dependency using the following coordinates:

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
	<version>${spring-ai-alibaba.version}</version>
</dependency>
```

> The latest released version at the time of writing this document is 1.0.0.2. Please follow [Github Releases](https://github.com/alibaba/spring-ai-alibaba/releases) for information on the latest versions.

**2. Component List**

Below is a list of all core components released in Spring AI Alibaba version 1.0, which you can add to your project as needed.
For example: if you only want to use `ChatClient` to develop a simple single agent or chat assistant, you only need to add the `spring-ai-alibaba-starter-dashscope` dependency. If you need to use workflows or multi-agents, you need to add the `spring-ai-alibaba-graph-core` dependency.

* **spring-ai-alibaba-bom** - For unified version management of all components
* **spring-ai-alibaba-starter-dashscope** - Bailian model service adaptation
* **spring-ai-alibaba-graph-core** - Intelligent Agent Graph framework core components
* **spring-ai-alibaba-starter-nl2sql** - Natural language to SQL conversion component
* **spring-ai-alibaba-starter-memory** - Session memory component
* **spring-ai-alibaba-starter-nacos-mcp-client** - Nacos MCP client, recommending Nacos 3.0.1 version. Nacos2 Server users should use the older version (spring-ai-alibaba-starter-nacos2-mcp-client)
* **spring-ai-alibaba-starter-nacos-mcp-server** - Nacos MCP server, recommending Nacos 3.0.1 version. Nacos2 Server users should use the older version (spring-ai-alibaba-starter-nacos2-mcp-server)
* **spring-ai-alibaba-starter-nacos-prompt** - Nacos Prompt management
* **spring-ai-alibaba-starter-arms-observation** - ARMS observability
* community components
  * **spring-ai-alibaba-starter-tool-calling-*** - Tool calling components
  * **spring-ai-alibaba-starter-document-reader-*** - Document reader components

## Dependency Management Best Practices

### Using `bom` to Manage Dependency Versions
We recommend explicitly specifying the bom dependency versions for Spring AI Alibaba, Spring AI, and Spring Boot, and on this basis, enabling the required dependencies as needed.

> For the version dependency relationship between Spring AI Alibaba, Spring AI, and Spring Boot, please refer to [FAQ](../faq/).

```xml
<properties>
	<spring-ai.version>1.0.0</spring-ai.version>
	<spring-ai-alibaba.version>1.0.0.2</spring-ai-alibaba.version>
	<spring-boot.version>3.4.5</spring-boot.version>
</properties>

<dependencyManagement>
	<dependencies>
		<dependency>
			<groupId>com.alibaba.cloud.ai</groupId>
			<artifactId>spring-ai-alibaba-bom</artifactId>
			<version>${spring-ai-alibaba.version}</version>
			<type>pom</type>
			<scope>import</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-dependencies</artifactId>
			<version>${spring-boot.version}</version>
			<type>pom</type>
			<scope>import</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.ai</groupId>
			<artifactId>spring-ai-bom</artifactId>
			<version>${spring-ai.version}</version>
			<type>pom</type>
			<scope>import</scope>
		</dependency>

	</dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
  </dependency>
</dependencies>
```
