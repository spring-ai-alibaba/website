---
title: 基于 Dify 工作流生成 SAA 工程
keywords: [Spring AI Alibaba, Dify, DSL]
description: "本文讲解如何将 Dify 平台上开发的 AI 应用，转换为 Spring AI Alibaba 应用。"
---

## 操作说明
导出操作说明，请参考 [spring-ai-alibaba-graph-studio](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-graph/spring-ai-alibaba-graph-studio) 模块，快速生成 Spring AI Alibaba 工程。

在启动 Graph Studio 后，当前可以调用如下 HTTP 请求生成，该请求将自动生成 Spring AI Alibaba 工程的 zip 包。

```shell
curl --location --request POST 'http://localhost:8080/starter.zip' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'dependencies=spring-ai-alibaba-graph,web' \
--data-urlencode 'appMode=workflow' \
--data-urlencode 'type=maven-project' \
--data-urlencode 'language=java' \
--data-urlencode 'bootVersion=3.5.0' \
--data-urlencode 'baseDir=demo' \
--data-urlencode 'groupId=com.example' \
--data-urlencode 'artifactId=demo' \
--data-urlencode 'name=demo' \
--data-urlencode 'description=Spring AI Alibaba Project Exported from Dify.' \
--data-urlencode 'packageName=com.example.demo' \
--data-urlencode 'packaging=jar' \
--data-urlencode 'javaVersion=17' \
--data-urlencode 'dsl={put-your-dify-dsl-here}'
```

> 请注意，这块的配套还在持续建设中，请关注文档更新，我们将补充更多详细说明。

## 压测数据

### 压测集群规格
1. Spring AI Alibaba 工程，独立部署的容器，保持默认线程池等配置参数，2个POD，POD 规格 2C4G
2. Dify 平台，官方部署方式，保持默认配置参数，每个组件都拉起2个POD，POD 规格 2C4G

### 有效并发处理上限
* **压测方式：** 每个场景从 10 个 RPS（Request Per Second）开始，逐步提升，直到提升 RPS 值并不能带来 TPS 提升、成功率答复下降。
* **结论：** Dify 能处理的上限 RPS < 10；Spring AI Alibaba 能处理的上限 RPS 约 150。

Dify 压测截图：

![Dify DSL to Graph](/img/user/ai/practices/dify/dify-base-rps.png)

Spring AI Alibaba 压测截图：

![Dify DSL to Graph](/img/user/ai/practices/dify/spring-ai-alibaba-base-rps.png)


### 极限场景下的吞吐量
* **压测方式：** 给集群远高于合理并发的压测请求量（测试场景为 1000 RPS），看集群的吞吐量、成功率变化。
* **结论：** Dify 在此场景下成功率小于 10%，平均 RT 接近 60s，大部分请求出现超时（响应大于 60s）；Spring AI Alibaba 成功率变化不大，维持 99% 以上，平均 RT 也在 18s 左右。

Dify 压测截图：

![Dify DSL to Graph](/img/user/ai/practices/dify/dify-extreme-rps.png)

Spring AI Alibaba 压测截图：

![Dify DSL to Graph](/img/user/ai/practices/dify/spring-ai-alibaba-extreme-rps.png)

### 优化空间
* Dify，后续可通过尝试调整相关组件配置，看是否有性能提升。
* SAA，预期通过简单调整线程池策略，能大幅提升当前的并发和吞吐量。
