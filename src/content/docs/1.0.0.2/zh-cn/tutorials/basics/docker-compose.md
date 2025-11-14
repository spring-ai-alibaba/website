---
title: 开发时服务
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "spring AI Alibaba运行"
---

## Docker Compose

Spring AI 提供了 Spring Boot 自动配置，用于建立与通过 Docker Compose 运行的模型服务或向量存储的连接。 要启用它，请将以下依赖项添加到项目的 Maven `pom.xml` 文件中：

```xml
<dependency>
   <groupId>org.springframework.ai</groupId>
   <artifactId>spring-ai-spring-boot-docker-compose</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件中。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-spring-boot-docker-compose'
}
```

### 依赖管理

Spring AI 物料清单（BOM）声明了当前版本 Spring AI 所用全部依赖的推荐版本。 该 BOM 仅用于依赖管理，不包含插件声明，也不直接引用 Spring 或 Spring Boot。 你可以使用 Spring Boot 父 POM，或通过 Spring Boot 的 BOM（`spring-boot-dependencies`）来管理 Spring Boot 版本。

将 BOM 添加到你的项目中：

#### Maven

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>1.0.0-SNAPSHOT</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

#### Gradle

```groovy
dependencies {
  implementation platform("org.springframework.ai:spring-ai-bom:1.0.0-SNAPSHOT")
  // 替换为你需要使用的具体模块的 starter 依赖
  implementation 'org.springframework.ai:spring-ai-openai'
}
```

Gradle 用户也可通过 Gradle（5.0+）原生支持的 Maven BOM 依赖约束方式使用 Spring AI BOM。只需在 Gradle 构建脚本的 dependencies 部分添加 'platform' 依赖处理方法即可。

#### 服务连接

`spring-ai-spring-boot-docker-compose` 模块中提供了以下服务连接工厂：

| 连接详情                             | 匹配条件                                                                           |
|----------------------------------|--------------------------------------------------------------------------------|
| `AwsOpenSearchConnectionDetails` | 名为 `localstack/localstack` 的容器                                                 |
| `ChromaConnectionDetails`        | 名为 `chromadb/chroma`, `ghcr.io/chroma-core/chroma` 的容器                         |
| `MongoConnectionDetails`         | 名为 `mongodb/mongodb-atlas-local` 的容器                                           |
| `OllamaConnectionDetails`        | 名为 `ollama/ollama` 的容器                                                         |
| `OpenSearchConnectionDetails`    | 名为 `opensearchproject/opensearch` 的容器                                          |
| `QdrantConnectionDetails`        | 名为 `qdrant/qdrant` 的容器                                                         |
| `TypesenseConnectionDetails`     | 名为 `typesense/typesense` 的容器                                                   |
| `WeaviateConnectionDetails`      | 名为 `semitechnologies/weaviate`, `cr.weaviate.io/semitechnologies/weaviate` 的容器 |


