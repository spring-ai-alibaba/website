---
title: "工具调用 (Tool Calling)"
description: "赋予您的 AI 应用调用外部工具和函数的能力。"
---

大语言模型（LLM）本身是无状态的，并且其知识仅限于训练数据。为了构建能够与外部世界交互、执行操作或获取实时信息的强大 AI 应用，我们需要一种机制来让 LLM “调用工具”。

**工具调用 (Tool Calling)** 就是这样一种机制。它允许您向 LLM 注册一组可用的“工具”（即普通的 Java 函数），LLM 可以根据用户的提问，智能地决定是否需要以及如何调用这些工具来完成任务。例如，当用户问“北京今天天气怎么样？”时，模型可以调用一个真实的天气查询工具来获取最新信息，而不是依赖其可能已经过时的内部知识。

Spring AI 为 Tool Calling 提供了标准的 API，而 SAA（Spring AI Alibaba）则在此基础上，通过提供一系列预构建的工具 `starter`，极大地简化了与常用第三方服务的集成。

## 使用 SAA 预构建的工具

SAA 社区提供了许多开箱即用的 Tool Calling 扩展实现，覆盖了地图、翻译、搜索等多种场景。这些工具的 `artifactId` 均为 `spring-ai-alibaba-starter-tool-calling-xxx` 的格式。

下面以**高德地图天气查询**为例，介绍如何使用 SAA 提供的社区工具。

### 1. 添加依赖

除了 `spring-ai-alibaba-starter-dashscope` 之外，您还需要添加高德地图工具的 `starter`：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-amap</artifactId>
</dependency>
```

### 2. 配置工具

在 `application.yml` 中启用该工具，并配置您的高德地图 API Key。您可以从[高德开放平台](https://lbs.amap.com/)申请 Key。

```yaml
spring:
  ai:
    dashscope:
      api-key: "sk-your-dashscope-api-key"
    alibaba:
      toolcalling:
        amap:
          enabled: true
          api-key: "your-amap-api-key"
```

### 3. 在代码中启用工具

配置完成后，您可以在调用 `ChatClient` 时，通过 `.options()` 启用指定的工具。SAA 提供的每个工具都有一个固定的工具名称（`functionName`），对于高德天气查询，其名称为 `gaoDeGetAddressWeather`。

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.dashscope.aot.DashScopeChatOptionsBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ToolCallingController {

    private final ChatClient chatClient;

    @Autowired
    public ToolCallingController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/ai/tool-calling")
    public String toolCalling(@RequestParam(value = "message", defaultValue = "北京今天天气怎么样？") String message) {

        var options = DashScopeChatOptionsBuilder.builder()
                .withFunction("gaoDeGetAddressWeather")
                .build();

        return chatClient.prompt()
                .user(message)
                .options(options)
                .call()
                .content();
    }
}
```

现在，当您访问 `/ai/tool-calling` 端点时，`DashScopeChatModel` 会分析用户的意图，发现需要查询天气，于是自动调用 `gaoDeGetAddressWeather` 这个工具，将工具返回的实时天气信息整合后，生成最终的、自然的回答。

## 创建自定义工具

除了使用 SAA 提供的预构建工具外，您也可以轻松地创建自己的工具。只需将一个 `java.util.function.Function` 声明为 Spring Bean，并为其添加 `@Description` 注解即可。

`@Description` 注解至关重要，它向 LLM 解释了这个工具的功能、输入参数和用途，是模型能否正确理解并使用该工具的关键。

以下是一个模拟查询股票价格的自定义工具示例：

### 1. 定义 POJO

首先，定义请求和响应的数据结构。

```java
public record StockRequest(String ticker) {}
public record StockResponse(double price) {}
```

### 2. 创建 Function Bean

创建一个实现了 `Function<StockRequest, StockResponse>` 的 Bean，并用 `@Description` 详细描述它。

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import java.util.function.Function;

@Configuration
public class MyTools {

    @Bean
    @Description("获取指定股票的最新价格")
    public Function<StockRequest, StockResponse> getStockPrice() {
        return request -> {
            System.out.println("正在查询股票 " + request.ticker() + " 的价格...");
            // 在实际应用中，这里会调用真实的股票服务 API
            // 此处为模拟实现
            double price = Math.round(Math.random() * 1000 * 100.0) / 100.0;
            System.out.println("查询到价格为: " + price);
            return new StockResponse(price);
        };
    }
}
```

### 3. 调用自定义工具

在调用 `ChatClient` 时，通过 `.options()` 启用您刚刚创建的 Bean（Bean 的名称就是函数名称）。

```java
// ...
var options = DashScopeChatOptionsBuilder.builder()
        .withFunction("getStockPrice") // Bean的名称
        .build();

return chatClient.prompt()
        .user("请问阿里巴巴的股票现在多少钱一股？")
        .options(options)
        .call()
        .content();
```

模型会理解用户的意图，并将“阿里巴巴”映射到 `StockRequest` 的 `ticker` 字段（尽管我们的示例没有处理中文到 ticker 的转换），然后调用 `getStockPrice` 函数，最终根据函数返回值生成回答。

## 深入阅读

本文档主要介绍了 SAA 中 Tool Calling 的基本用法和增强功能。关于 Spring AI 在 Tool Calling 方面的完整概念、API 设计以及更多高级用法，我们强烈建议您阅读 [Spring AI 的官方参考文档](https://docs.spring.io/spring-ai/reference/api/tool-calling.html)。

## SAA 社区工具列表

以下是社区提供的部分开箱即用的 Tool Calling 列表（**未来的版本更新可能会有变动，请以最新的官方文档和项目代码为准。**），可根据业务需要选用：

- 阿里云机器翻译
    - **工具名称（Tool Name）**：`aliTranslateService`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.alitranslate`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-alitranslate`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `access-key-id`：服务的AccessKeyId，若不提供则读取系统环境变量`ALITRANSLATE_ACCESS_KEY_ID`的值。
        - `secret-key`：服务的SecretKey，若不提供则读取系统环境变量`ALITRANSLATE_ACCESS_KEY_SECRET`的值。
- 高德地图获取城市天气
    - **工具名称（Tool Name）**：`gaoDeGetAddressWeather`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.amap`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-amap`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：高德地图服务的ApiKey，若不提供则读取系统环境变量`GAODE_AMAP_API_KEY`的值。
- 百度地图
    - **工具名称（Tool Name）**：
        - `baiduMapGetAddressInformation`：获取地址详细信息
        - `baiDuMapGetAddressWeatherInformation`：获取城市天气
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.baidu.map`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-baidumap`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：百度地图服务的ApiKey，若不提供则读取系统环境变量`BAIDU_MAP_API_KEY`的值。
- 百度搜索
    - **工具名称（Tool Name）**：`baiduSearch`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.baidu.search`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-baidusearch`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- 百度翻译
    - **工具名称（Tool Name）**：`baiduTranslate`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.baidu.translate`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-baidutranslate`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `secret-key`：百度翻译服务的SecretKey，若不提供则读取系统环境变量`BAIDU_TRANSLATE_SECRET_KEY`的值。
        - `app-id`：百度翻译服务的AppId，若不提供则读取系统环境变量`BAIDU_TRANSLATE_APP_ID`的值。
- 必应搜索
    - **工具名称（Tool Name）**：`bingSearch`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.bingsearch`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-bingsearch`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `token`：必应服务的Token，若不提供则读取系统环境变量`BING_SEARCH_TOKEN`的值。
- 钉钉群发消息
    - **工具名称（Tool Name）**：`dingTalkGroupSendMessageByCustomRobot`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.dingtalk`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-dingtalk`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `custom-robot-access-token`：自定义机器人的AccessToken，必须提供。
        - `custom-robot-signature`：自定义机器人的Signature，必须提供。
- DuckDuckGo 查询最近新闻
    - **工具名称（Tool Name）**：`duckDuckGoQueryNews`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.duckduckgo`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-duckduckgo`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：Serpapi服务的ApiKey，若不提供则读取系统环境变量`SERPAPI_KEY`的值。
- GitHub Tool Kits
    - **工具名称（Tool Name）**：
        - `getIssue`：获取 GitHub 某个仓库的 Issue 信息
        - `createPullRequest`：在 GitHub 某个仓库创建 PR
        - `SearchRepository`：查询 GitHub 某个名称的仓库信息
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.githubtoolkit`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-githubtoolkit`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `token`：GitHub的Token，若不提供则读取系统环境变量`GITHUB_TOKEN`。
        - `owner`：要查询的仓库所有者，必须设置。
        - `repository`：要查询的仓库名称，必须设置。
- 谷歌翻译
    - **工具名称（Tool Name）**：`googleTranslate`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.googletranslate`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-googletranslate`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：谷歌翻译的ApiKey，若不提供则读取系统环境变量`GOOGLE_TRANSLATE_APIKEY`。
- JSON 处理工具
    - **工具名称（Tool Name）**：
        - `jsonInsertPropertyFieldFunction`：给一个 JSON 对象添加字段值。
        - `jsonParsePropertyFunction`：获取 JSON 对象某个字段的值。
        - `jsonRemovePropertyFieldFunction`：删除 JSON 对象某个字段。
        - `jsonReplacePropertyFiledValueFunction`： 替换 JSON 对象某个字段的值。
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.jsonprocessor`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-jsonprocessor`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- 快递100查询快递信息
    - **工具名称（Tool Name）**：`queryTrack`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.kuaidi100`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-kuaidi100`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：快递100的ApiKey，若不提供则读取系统环境变量`KUAIDI100_KEY`的值。
        - `app-id`：快递100的AppId，若不提供则读取系统环境变量`KUAIDI100_CUSTOMER`的值。
- 飞书文档
    - **工具名称（Tool Name）**：
        - `larksuiteCreateDocFunction`：创建文档
        - `larksuiteChatFunction`：发送聊天消息
        - `larksuiteCreateSheetFunction`：创建工作表
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.larksuite`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-larksuite`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `app-id`：飞书的AppId，必须提供。
        - `app-secret`：飞书的AppSecret，必须提供。
- 微软翻译
    - **工具名称（Tool Name）**：`microSoftTranslateFunction`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.microsofttranslate`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-microsofttranslate<`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：微软翻译的ApiKey，若不提供则读取系统环境变量`MICROSOFT_TRANSLATE_API_KEY`的值。
        - `region`：为请求头`Ocp-Apim-Subscription-Region`的值，必须提供。
- 正则表达式查询
    - **工具名称（Tool Name）**：`regexFindAll`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.regex`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-regex`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- 敏感信息过滤
    - **工具名称（Tool Name）**：`sensitiveFilter`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.sensitivefilter`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-sensitivefilter`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `replacement`：用来替换敏感信息的字符串，默认为`"***"`。
        - `filterPhoneNumber`：是否过滤电话号码，默认为`true`。
        - `filterIdCard`：是否过滤 ID 卡号，默认为`true`。
        - `filterBankCard`：是否过滤银行卡号，默认为`true`。
        - `filterEmail`：是否过滤邮箱地址，默认为`true`。
- Serpai 查询
    - **工具名称（Tool Name）**：
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.serpai`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-serpai`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：Serpapi服务的ApiKey，若不提供则读取系统环境变量`SERPAPI_KEY`的值。
        - `engine`：选择使用的搜索引擎，必填。
- 新浪新闻
    - **工具名称（Tool Name）**：`getSinaNews`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.sinanews`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-sinanews`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- Tavily Search
    - **工具名称（Tool Name）**：`tavilySearch`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.tavilysearch`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-tavilysearch`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：Tavily Search 的ApiKey，若不提供则读取系统环境变量`TAVILY_SEARCH_API_KEY`的值。
- 获取某个时区时间
    - **工具名称（Tool Name）**：`getCityTimeFunction`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.time`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-time`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- 今日头条
    - **工具名称（Tool Name）**：`getToutiaoNews`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.toutiaonews`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-toutiaonews`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
- Weather Api 获取城市天气
    - **工具名称（Tool Name）**：`getWeatherService`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.weather`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-weather`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `api-key`：服务的ApiKey，若不提供则读取系统环境变量`WEATHER_API_KEY`的值。
- 有道翻译
    - **工具名称（Tool Name）**：`youdaoTranslate`
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.youdaotranslate`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-youdaotranslate`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `secret-key`：有道翻译的AppSecret，若不提供则读取系统环境变量`YOUDAO_APP_SECRET`的值。
        - `app-id`：有道翻译的AppId，若不提供则读取系统环境变量`YOUDAO_APP_ID`的值。
- 语雀
    - **工具名称（Tool Name）**：
        - `createYuqueDoc`：创建语雀文档。
        - `createYuqueBook`：创建语雀Book知识库。
        - `updateDocService`：更新语雀文档。
        - `deleteDocService`：删除语雀文档。
    - **配置文件前缀**：`spring.ai.alibaba.toolcalling.yuque`
    - **Maven 依赖名**：`spring-ai-alibaba-starter-tool-calling-yuque`
    - **配置字段说明**：
        - `enabled`：设置为`true`时启动插件。
        - `token`，语雀的Token，必须设置。
