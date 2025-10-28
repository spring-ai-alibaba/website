---
title: Vector Store Database Integration
keywords: [Spring Ai Alibaba, vector database, vector store]
description: "Spring Ai Alibaba plugin and tool ecosystem, this document mainly covers vector database integration, adaptation and usage methods."
---

## Basic Usage

Below are the Alibaba Cloud vector database product implementations integrated with Spring AI Alibaba. For more information about extended vector store implementations and usage methods, please refer to the official Spring AI documentation or our example repository.

## Community Implementation List

| Name (Code Reference) | application.yml Configuration | Maven Dependency | Description |
| --- | --- | --- | --- |
| Aliyun OpenSearch | ```yaml spring:  ai:   vectorstore:     aliyun-opensearch:      index-name: spring-ai-document-index ```  | ```xml <dependency>   <groupId>com.alibaba.cloud.ai</groupId>   <artifactId>spring-ai-alibaba-analyticdb-store</artifactId>   <version>${spring.ai.alibaba.version}</version> </dependency> ```  | Aliyun OpenSearch vector retrieval version adaptation.<br/><br/>Example address (if available) |
| Aliyun AnalyticDB | | | |
| Aliyun Tair | | | |
