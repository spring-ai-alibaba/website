---
title: "Spring AI Alibaba 游乐场来啦！在线畅玩 AI 应用开发全流程"
description: "Spring AI Alibaba 游乐场来啦！在线畅玩 AI 应用开发全流程"
date: "2025-10-21"
category: "article"
keywords: ["SCA-AI"]
authors: "CH3CHO"
---

Playground 是社区以 Spring AI Alibaba 框架为基础搭建的 AI 应用体验平台，应用包含完善的前端 UI + 后端实现，具备对话、图片生成、工具调用、RAG、MCP 等众多 AI 相关功能。基于 Playground 项目源码，您可以快速复刻一个属于自己的 AI 应用。



访问以下地址快速体验 Playground：**playground.java2ai.com**



效果预览：

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751510218493-7ff7a527-4f3b-48a8-b14f-c2f949c8c323.png)



如果您需要查看 Playground 源码，访问以下项目地址：

[https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground)

## 功能快速体验
打开 Playground 首页，您可以体验聊天助手（支持多轮对话、深度思考、联网搜索、多模型切换）、图像生成、文档总结、RAG、MCP、Function Call 等 AI 应用核心功能，所有功能都是基于 Spring AI Alibaba 框架实现。

### 聊天助手
聊天窗口是一个基于 LLM 大模型服务实现的智能机器人，您可以问 Playground 任何问题，它会基于模型响应回复。整个对话过程支持流式响应输出、聊天记忆。如果您想使用不同的模型，可以在页面左侧切换。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751515433788-ff40ebea-003e-4558-93f4-e6f6226d1a73.png)

#### 联网搜索
联网搜索，顾名思义，就是将网络上的数据通过实时搜索的方式获取到并交给大模型来获得最新得消息咨询。Playground 项目中使用了阿里云的 IQS 信息检索服务作为联网搜索的数据源。在定制开发中，您也可以使用搜索引擎服务替换 IQS。

IQS 搜索实现如下：其本质为请求服务接口或调用 SDK。

```java
public GenericSearchResult search(String query) {

    // String encodeQ = URLEncoder.encode(query, StandardCharsets.UTF_8);
    ResponseEntity<GenericSearchResult> resultResponseEntity = run(query);

    return genericSearchResult(resultResponseEntity);
}

private ResponseEntity<GenericSearchResult> run(String query) {

    return this.restClient.get()
        .uri(
        "/search/genericSearch?query={query}&timeRange={timeRange}",
        query,
        TIME_RANGE
    ).retrieve()
        .toEntity(GenericSearchResult.class);
}

}
```

#### 深度思考
深度思考是利用模型服务提供的思考与推理服务，Spring AI Alibaba 支持通过开关控制思考过程，同时可以将思考内容展示出来。您可以通过 `enable_thinking`参数控制开启或关闭。

### 图像生成
Spring AI Alibaba 支持多模态模型，通过 Playground 左侧的“图像生成”菜单，可以快速体验图像生成功能。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751516822262-93c174ef-603e-465c-8d9c-387b1046ca70.png)



以下是基于 Qwen 系列模型实现的图像生成对话效果：



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751516942000-e5ef8b9f-871a-43c0-907a-2948a82abfac.png)

### 文档总结
文档总结功能可以基于您上传的本地文件、网络连接进行信息提取与总结，利用大模型帮您生成一份简练的总结报告。

上传文件：

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751516993794-49f88cfd-f1a5-448f-945e-747733a2b5ae.png)



文件处理完成，点击继续即可生成文档总结：

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751521498050-d6fb5ab4-c39b-4a5a-ba2d-193faa5875a9.png)



### RAG
RAG 仍然是当今最流行的 AI 应用结合私有知识库的方式、通过 RAG 能够构建问答机器人、专业领域助手等。

Playground 项目同时支持基于 AnalyticdbVectorStore 的实现、基于内存的 SimpleVectorStore 实现。您可以在部署时替换为想使用的向量数据库。

我们部署的 Playground 体验示例已经内置了 Spring AI Alibaba 文档，因为您可以问它关于 Spring AI Alibaba 项目的任何问题，它都能很好的给出回答。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751522047272-1be410ea-f4b9-444d-bc9b-043246064af5.png)



#### 模块化 RAG 介绍
Spring AI Alibaba 框架支持模块化 RAG，包括问题查询重写、问题分解、检索重排序、检索结果聚合等优化，以下是模块化 RAG 的核心流程与接口定义。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751515309106-350f3574-443e-4112-a394-ede921b24a48.png)



Spring AI Alibaba 中的模块化 RAG 大概可以分为四个环节：Pre-retrieval、Retrieval、Post-retrieval、内容生成。

+ **Pre-Retrieval**

> 增强和转换用户输入，使其更有效地执行检索任务，解决格式不正确的查询、query 语义不清晰、或不受支持的语言等。
>

    - QueryAugmenter 查询增强：使用附加的上下文数据信息增强用户 query，提供大模型回答问题时的必要上下文信息；
    - QueryTransformer 查询改写：因为用户的输入通常是片面的，关键信息较少，不便于大模型理解和回答问题。因此需要使用 prompt 调优手段或者大模型改写用户 query；
    - QueryExpander 查询扩展：将用户 query 扩展为多个语义不同的变体以获得不同视角，有助于检索额外的上下文信息并增加找到相关结果的机会。
+ **Retrieval**

> 负责查询向量存储等数据系统并检索和用户 query 相关性最高的 Document。
>

    1. DocumentRetriever：检索器，根据 QueryExpander 使用不同的数据源进行检索，例如 搜索引擎、向量存储、数据库或知识图等；
    2. DocumentJoiner：将从多个 query 和从多个数据源检索到的 Document 合并为一个 Document 集合；
+ **Post-Retrieval**

> 负责处理检索到的 Document 以获得最佳的输出结果，解决模型中的_中间丢失_和上下文长度限制等。
>

+ **生成**

将`Query + 上下文`一同输入给大模型，获得模型响应输出。

### MCP
Playground 提供了 MCP 体验页面，目前内置了一个基于 Java 实现的 `weather_server`MCP 服务，您可以直接在线触发 MCP 服务调用。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1751523903547-568c89a8-4e62-4290-b105-c4385bcb7267.png)

如果您想增加更多的 MCP 服务，请参考源码解读部分了解如何修改 Playground 源码进行定制。

##  本地部署
如果您想在本地快速部署 Playground，则可以通过 Docker 和下载源码本地构建两种方式实现。

### 使用 Docker 运行
运行如下命令，可以使用 Docker 快速启动 Playground 项目。请访问 [阿里云百炼 API-KEY](https://bailian.console.aliyun.com/?tab=model#/api-key)获得 API-KEY 并设置 `AI_DASHSCOPE_API_KEY=your_api_key`。

```shell
docker run -d -p 8080:8080 \
  -e AI_DASHSCOPE_API_KEY=your_api_key \
  --name spring-ai-alibaba-playground \
  sca-registry.cn-hangzhou.cr.aliyuncs.com/spring-ai-alibaba/playground:1.0.0.2-x
```

打开浏览器访问 `http://localhost:8080` 查看前端页面：

#### 开启更多组件
Playground 作为一个 AI 智能体应用，依赖大模型等在线服务，需要通过环境变量指定访问凭证。如果要开启 Playground 全部能力，需要通过环境变量指定访问凭证：

+ 【必须】[阿里云百炼 API-KEY](https://bailian.console.aliyun.com/?tab=model#/api-key)，大模型服务，示例 `export AI_DASHSCOPE_API_KEY=xxx`
+ 【可选】[百度翻译 appId 和 secretKey](https://api.fanyi.baidu.com/product/113)，使用 Tool Call 时必须，示例 `export BAIDU_TRANSLATE_APP_ID=xxx`、`export BAIDU_TRANSLATE_SECRET_KEY=xxx`
+ 【可选】[百度地图 api key](https://lbs.baidu.com/faq/api)，使用 Tool Call 必须，示例 `export BAIDU_MAP_API_KEY=xxx`
+ 【可选】[阿里云 IQS 服务 apikey](https://help.aliyun.com/document_detail/2870227.html?)，使用联网搜索必须，示例 `export IQS_SEARCH_API_KEY=xxx`
+ 【可选】[阿里云 AnalyticDB 向量数据库](https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/getting-started/instances-with-vector-engine-optimization-enabled/)，使用 RAG 时可开启（默认使用内存向量数据库）。先使用 `export VECTOR_STORE_TYPE=analyticdb` 开启 AnalyticDB，然后配置相关参数

示例 Docker 运行命令：

```shell
docker run -d -p 8080:8080 \
  -v "$(pwd)/logs:/app/logs" \
  -e AI_DASHSCOPE_API_KEY=your_api_key \
  -e ADB_ACCESS_KEY_ID=your_access_key \
  -e ADB_ACCESS_KEY_SECRET=your_secret_key \
  -e BAIDU_TRANSLATE_APP_ID=your_app_id \
  -e BAIDU_TRANSLATE_SECRET_KEY=your_secret_key \
  -e BAIDU_MAP_API_KEY=your_api_key \
  -e VECTOR_STORE_TYPE=analyticdb \
  -e IQS_SEARCH_API_KEY=your_api_key \
  --name spring-ai-alibaba-playground \
  sca-registry.cn-hangzhou.cr.aliyuncs.com/spring-ai-alibaba/playground:1.0.0.2-x
```

### 下载源码构建运行
**1. 项目打包**

```shell
mvn clean install -DskipTests
```

**2. 配置环境变量**

请注意，必须要为 Playground 配置环境变量，配置方法参考 Docker 运行一节中的说明。

**3. 运行项目**

```shell
java -jar ./target/app.jar
```

启动成功后，打开浏览器访问 `http://localhost:8080` 查看前端页面。

## 源码解读
如果您需要查看 Playground 源码，访问以下项目地址：

[https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-playground)

我们在官网还发布了关于 Playground 的源码解读文章：

[https://java2ai.com/docs/1.0.0.2/practices/usecase/playground/](https://java2ai.com/docs/1.0.0.2/practices/usecase/playground/?)



我们希望 Playground 可以帮助到开发者快速构建自己的 AI 应用，通过仿照 Playground 的开发模式，或者直接复制并改造 Playground 的代码来定制自己的应用。

## 总结
随着 Spring AI Alibaba 1.0 版本的正式发布，Java 智能体开发进入了一个新时代。

通过 Playground 项目，期望能让开发者以更低成本快速的体验和开发自己的智能体应用。

**playground.java2ai.com**


