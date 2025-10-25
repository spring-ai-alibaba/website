---
title: Spring AI Alibaba MCP Gateway 正式发布，零代码实现存量应用转换 MCP 工具！
tags: [Spring AI Alibaba, Gateway, Nacos3, MCP，存量服务转MCP]
description: Spring AI Alibaba MCP Gateway 基于 Nacos 提供的 MCP server registry 实现，为普通应用建立一个中间代理层 Java MCP 应用。一方面将 Nacos 中注册的服务信息转换成 MCP 协议的服务器信息，以便 MCP 客户端可以无缝调用这些服务；另一方面可以实现协议转化，将 MCP 协议转换为对后端 HTTP、Dubbo 等服务的调用。
authors: [chickenlj, Aias00]
date: "2025-06-16"
slug: spring-ai-alibaba-mcp-gateway
category: article
---

## Spring AI Alibaba MCP Gateway 简介
Spring AI Alibaba MCP Gateway 基于 Nacos 提供的 MCP server registry 实现，为普通应用建立一个中间代理层 Java MCP 应用。一方面将 Nacos 中注册的服务信息转换成 MCP 协议的服务器信息，以便 MCP 客户端可以无缝调用这些服务；另一方面可以实现协议转化，将 MCP 协议转换为对后端 HTTP、Dubbo 等服务的调用。基于 Spring AI Alibaba MCP Gateway，您无需对原有业务代码进行改造，新增或者删除 MCP 服务（在Nacos中）无需重启代理应用。

<!-- truncate -->

## 业务背景
现存业务代码，对外仅提供 http、dubbo 等接口供外部调用。在 AI 智能化改造期间，如果要对这类服务进行改造，涉及到开发、测试、版本发布等一系列流程，改造工作量不容小觑。

所以要考虑有没有什么方式，可以做到按需将现有服务转换成 mcp server 提供能力，且近可能减少对既有业务代码的改造工作量。

在 Spring AI Alibaba MCP 模块中，基于 nacos 2.x 版本，实现了存量业务直接注册 mcp server 相关信息到 nacos 的相关能力；

在近期刚刚发布的 nacos 3.0 版本中，也提供了管理页面，供开发人员进行手动注册 mcp server 等相关信息。

至此，需要暴露的 mcp server 信息，已经成功注册到了 nacos，但是 nacos 本身并没有直接将配置信息转成 mcp server的能力。所以就需要借助 higress 这类网关的能力，来实现真正的服务暴露。

Spring AI Alibaba MCP Gateway 模块的动态代理能力可以理解成是 higress mcp server 插件的 java 版本实现，让用户的业务架构更简单，实现 Java 技术栈闭环。

## 实现原理
附一张启动流程图，目前程序代码兼容了 nacos 2.x 版本以及 nacos 3.x 版本的能力。区别在于 nacos 2.x 版本目前需要通过 configService 来获取 mcp registry 相关信息，而 nacos 3.x 版本提供了 mcp 相关的 openapi，可以通过调用 api 接口的方式来获取相关信息。

![Spring AI Alibaba MCP Gateway](/img/blog/mcp-gateway/spring-ai-alibaba-mcp-gateway.png)

动态的 mcp server 暴露出来的是标准的 mcp 协议的内容，基于 spring ai + mcp 官方 sdk 的能力，目前 java 版本 sdk 暂不支持 streamable http。

在请求打到 mcp server 之后，会将 mcp 协议内容解析之后，转发到注册到 nacos 的原生 http 之类的服务上。

在协议转换环节，目前代码实现的方案是基于 Higress 提供的调用模板的格式，参见： https://nacos.io/docs/v3.0/manual/user/mcp-template/?spm=5238cd80.4b5bafc7.0.0.76d91d13ntdJqg。通过 Nacos 提供的 loadbalance 的方式选取实例信息，确定目标 ip:port ，最后组装调用信息，发起实现调用的。

### 配置及使用流程
配置内容以 Nacos 3.0 版本为例，主要配置过程参考： [https://nacos.io/blog/nacos-gvr7dx_awbbpb_gg16sv97bgirkixe/?source=blog](https://nacos.io/blog/nacos-gvr7dx_awbbpb_gg16sv97bgirkixe/?source=blog)

1. 在 nacos 中进入 mcp 列表管理功能，创建一个 mcp server。

![Image](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1747986476230-5a84634f-7d75-4745-a425-1b585ff08992.png)

2. 在 mcp server 中添加 tools 相关内容，表明要暴露的 tools 信息

![Image](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/54037/1747986480357-58081f37-3acf-485a-90cc-69cae9345d59.png)

3. 在 tools 信息中，需要配置一个 request template。格式与 higress 目前支持的格式完全兼容

```json
{
  "requestTemplate": {
    "url": "/v3/weather/weatherInfo?key={{ .config.credentials.api_key.data }}",
    "argsToUrlParam": true,
    "method": "GET"
  },
  "responseTemplate": {
    "body": "response value {{ .value }}"
  }
}
```

1. 在工程中引入相关依赖

```xml
<dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-web</artifactId>
        </dependency>

        <!-- Spring AI Alibaba MCP Gateway -->
        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-mcp-gateway</artifactId>
            <version>1.0.0.3-SANPSHOT</version>
        </dependency>

        <!-- Spring AI Alibaba MCP Server -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-alibaba-starter-nacos-mcp-server</artifactId>
            <version>1.0.0.3-SANPSHOT</version>
        </dependency>

    </dependencies>

```

2. 配置 spring.ai.alibaba.mcp.nacos 相关信息

```yaml
    spring:
      ai:
        alibaba:
          mcp:
            nacos:
              server-addr: 127.0.0.1:8848
              namespace: public
              username:
              password:
              gateway:
                service-names:
                 - echo-server
```

3. 启动服务之后，会读取 nacos 中持有的 mcp server 相关配置信息，对外暴露出来，供 mcp client 进行调用

![Spring AI Alibaba MCP Gateway](/img/blog/mcp-gateway/mcp-inspector.png)

## 总结
Spring AI Alibaba MCP 联合 Nacos，解决了企业级 AI Agent 的应用与落地场景中 MCP 分布式部署与动态更新的关键问题，其中包括流量的负载均衡、节点变更动态感知等关键解决方案，可阅读本公众号上一篇文章了解详情。

参考资料：

+ Spring AI Alibaba MCP Gateway 相关示例请参考 [spring-ai-alibaba-mcp-example](https://github.com/springaialibaba/spring-ai-alibaba-examples)
+ Spring AI Alibaba MCP 动态代理思路和 Higress mcp server 插件类似且协议转换格式完全兼容：[https://higress.cn/ai/mcp-quick-start/](https://higress.cn/ai/mcp-quick-start/)
+ 本方案MCP服务动态配置思路与格式源于：[https://nacos.io/blog/nacos-gvr7dx_awbbpb_vksfvdh9258pgddl/](https://nacos.io/blog/nacos-gvr7dx_awbbpb_vksfvdh9258pgddl/)
