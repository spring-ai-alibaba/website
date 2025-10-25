---
title: Spring AI Alibaba配置管理，用 Nacos ，就够了
tags: [Spring AI Alibaba, 动态prompt模板管理]
description: 使用Nacos实现Spring AI Alibaba的动态模型参数调整与提示词模板管理
authors: [CZJCC]
date: "2024-12-09"
slug: spring-ai-dynamic-prompt-nacos
category: article
---

## 前言
Hi，如果你能点进这篇文章，大概率也是在用Spring AI搭建Java AI应用的时候，碰到了各种让人头疼的配置动态管理的问题了吧~  比如像调用算法模型的“API-KEY密钥”这类打死也不能让别人知道的敏感配置该如何加密存储管理，还有像模型的各类调用配置参数，以及Prompt Engineering里的Prompt Template如何可以在不发布重启应用的情况下，快速修改生效来响应业务需求的变化？另外 AI应用所依赖外部的向量数据库、文本Embedding服务的接入点、服务认证信息配置又该如何安全高效管理？不过不用焦虑，接下来我们就着这些问题深入讨论下，看看如何利用Spring AI Alibaba + Nacos来一一解决。

<!-- truncate -->

首先打个广告~ 介绍下为什么会推荐使用Spring AI Alibaba，相信大家已经或多或少了解阿里云通义千问大模型了，那在各大开源模型榜单上都是屠榜者的存在，但是Java开发者如果选型使用Spring AI框架构建应用的话就会发现，目前支持的基本上都是国外的模型供应商，比如OpenAI、微软、亚马逊、谷歌和Huggingface这些，并不支持通义模型。不过现在没关系了，在刚刚过去的云栖大会上，阿里云官方刚刚宣布开源了Spring AI Alibaba项目，它基于Spring AI + 通义大模型开发构建，可以说是整个阿里云通义系列的模型及服务在Java AI应用开发领域的最佳实践，也提供了高层次的AI API抽象和云原生基础设施的集成方案，可以帮助Java开发者快速地构建 AI 应用。

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-1.png)

言归正传，回到文章开篇介绍的那几个配置管理问题，如果你恰好正在使用Spring AI Alibaba开发应用的话，可以跟着我一起动手试验下。只需要在你的应用启动 **application.properties** 配置文件里稍加改动下，你就会发现其实只需要几行配置就统统都搞定啦😄

```plain
#nacos server地址
spring.cloud.nacos.config.server-addr=${NAOCS_SERVER_ADDR}

#nacos 配置管理所在的命名空间ID
spring.cloud.nacos.config.namespace=

#nacos ram ak、sk，如果是开源自建的服务端可以使用用户名密码的认证鉴权方式
spring.cloud.nacos.config.access-key=${NACOS_CONFIG_ACCESS_KEY}
spring.cloud.nacos.config.secret-key=${NACOS_CONFIG_SECRET_KEY}

#通义模型接入API KEY
spring.ai.dashscope.api-key=${AI_DASHSCOPE_API_KEY}
```

接入Nacos后，我们接下来就可以在控制台上创建几个配置，即可完成所有场景下的配置托管，就这么简单，不信的话我们一个个来看

## Prompt模板动态加载
众所周知，Spring AI提供了Prompt Template来方便开发者根据用户参数动态渲染Prompt内容，然后喂给AI模型去处理。但是模型响应结果的质量特别依赖一个好的Prompt模板，这也就意味着我们往往需要在使用期间经常调整这个模板内容来测试效果。但是Spring AI原生提供的方式要么需要在代码中固定写死，要么就是在配置文件中预置好模板内容，没有办法做到动态更新。

为了解决这个问题，Spring AI Alibaba内置了一套基于Nacos实现的动态PromptTemplate功能，你只需要在Nacos上把要托管的PromptTemplate配置好，配置内容是一个JSON数组，JSON里面的格式也很简单。另外配置在Nacos上标识是固定的，data ID 是 **spring.ai.alibaba.configurable.prompt**, group 是 **DEFAULT_GROUP**。

```plain
[
  {
    "name":"模板名称",
    "template":"预置的Prompt模板内容",
    "model":{
      "key":"value"
    }
  }
]
```

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-2.png)

搞定了以上配置后，我们来基于Spring AI Alibaba写一个测试例子，运行起来后访问"localhost:8080/ai/prompt-template"看下效果

```plain
@RestController
@RequestMapping("/ai")
public class PromptTemplateController {

 private final ChatClient chatClient;

 private final ConfigurablePromptTemplateFactory configurablePromptTemplateFactory;

 @Autowired
 public PromptTemplateController(ChatClient.Builder builder,
   ConfigurablePromptTemplateFactory configurablePromptTemplateFactory) {
  this.chatClient = builder.build();
  this.configurablePromptTemplateFactory = configurablePromptTemplateFactory;
 }
 @GetMapping("/prompt-template")
 public AssistantMessage generate(@RequestParam(value = "author") String author) {
  ConfigurablePromptTemplate template = configurablePromptTemplateFactory.create("test-template",
    "please list the three most famous books by this {author}.");
  Prompt prompt;
  if (StringUtils.hasText(author)) {
   prompt = template.create(Map.of("author", author));
  } else {
   prompt = template.create();
  }
  return chatClient.prompt(prompt).call().chatResponse().getResult().getOutput();
 }
```

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-3.png)

还不错的感觉，但是我们嫌这个AI回复的结果太冗长了，那就在控制台上修改下这个模板内容并动态发布配置，不用重启应用，再次重新调用这个请求看下结果呢，你就会发现大模型已经感知到我们动态下发的PromptTemplate，并轻松达到了我们想要的效果啦😄

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-4.png)

## 算法模型参数热更新
翻看Spring AI Alibaba源码，你会发现在基于通义模型的DashScope实现里，开放了各种各样的模型调用参数，比如像temperature、topP这些可以通过调整来动态控制模型输出结果随机性和多样性的参数，又亦或是function、tool这类增加模型能力的配置。当我们在开发调试或者是线上运行需要动态调整这些参数的话，传统的做法基本上就是改配置参数文件，重新打镜像重启发布，这样一套流程下来效率特别低，费时费力。

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-6.png)

但用了Spring AI Alibaba，内置的Nacos集成方案可不允许你的时间浪费在这种没意义的地方。跟着我来做，到控制台上来创建以下一条配置，配置data ID默认为**spring.ai.alibaba.dashscope.chat.options**，group 默认为 **DEFAULT_GROUP**，配置内容就是你需要自定义的 **DashScopeChatOptions **配置JSON文本。后续如果想要变更算法模型的调用参数，只需要在控制台上更新配置即可动态下发生效新的参数，再也不需要重启应用发布了，使用体验跟刚才的Prompt 模板配置几乎一模一样。

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-7.png)

todo: 场景列举

## 敏感配置加密存储
最后再介绍下像 API-KEY、外部依赖服务认证信息这种高度敏感的配置如何托管管理，一般的配置中心都会以明文的格式来存储，但是Nacos通过集成KMS的密钥服务，提供了配置数据的加解密能力，从而大幅降低这些敏感数据的泄漏风险，具体的配置文档可以参考 [https://nacos.io/docs/latest/plugin/config-encryption-plugin/](https://nacos.io/docs/latest/plugin/config-encryption-plugin/)

接下来我们来实操一下，首先需要在Nacos控制台上新建一个配置项来管理所有需要加密存储的配置内容，这里我们使用推荐的 KMS AES-256位 加密算法，加密强度足够高且配置内容的数据也不会传输到KMS系统，安全性更高。需要注意的是，这样加密存储的配置data ID会默认有个 **cipher-kms-aes-256- **前缀，这个不可以丢掉。另外配置的内容就是我们想要加密存储的配置项，这里推荐用properties的格式来管理。

![spring-ai-dynamic-prompt-nacos](/img/blog/nacos/spring-ai-dynamic-prompt-nacos-8.png)

接下来我们在应用启动配置文件里追加以下几行配置，这里使用了占位符`${AI_DASHSCOPE_API_KEY}`来引用通用模型调用的API_KEY值。这样应用启动时就会尝试从环境变量、系统属性或其他配置源中查找这个键对应的值。但是我们通过spring.config.import的配置标识我们需要从外部Nacos配置源动态导入配置项，并且这个配置data ID还是具有加解密特性的，应用启动后会动态把实际的spring.ai.dashscope.api-key值解密后替换到占位符的位置，这样就可以正常的调用模型服务了。另外 refreshEnabled 参数设置为true，也表示启用了自动刷新功能。这样当Nacos中的这个配置文件发生变化时，应用能够自动感知并重新加载这些配置，实现了配置的热更新，这对于动态调整运行时配置非常有用，提高了应用的灵活性和运维效率。

```plain
spring.config.import=optional:nacos:cipher-kms-aes-256-encrypted-config.properties?group=DEFAULT_GROUP&refreshEnabled=true
spring.cloud.nacos.config.kms_region_id=cn-zhangjiakou
spring.cloud.nacos.config.kmsVersion=v1.0

spring.ai.dashscope.api-key=${AI_DASHSCOPE_API_KEY}
```

## 后记

总的来说，本文通过一些实操案例展示了Spring AI Alibaba + Nacos在解决AI应用中一系列复杂配置管理挑战的方案，从动态Prompt模板的灵活调整、模型参数的即时优化，到敏感信息的安全加密存储。Spring AI Alibaba简化了对接阿里云通义大模型的流程，内置Nacos集成也为开发者提供了无缝衔接云端配置托管的捷径，整体上极大提升了AI应用开发的灵活性和响应速度。
