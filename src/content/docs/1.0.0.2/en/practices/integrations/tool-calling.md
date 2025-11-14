---
title: Tool Calling Plugin Integration
keywords: [Spring AI Alibaba,Ecosystem Integration,ToolCalling,Tool Calling]
description: "Using Spring AI Alibaba community's Tool Calling to quickly integrate third-party services"
---

## Usage Method

The Spring AI Alibaba community provides many Tool Calling extension implementations, making it convenient for developers to enable plugins through declarative methods, avoiding the trouble of repetitive development.

The community-provided Tool Calling plugins have an `artifactId` in the format of `spring-ai-alibaba-starter-tool-calling-xxx`. Taking Alibaba Translation Service (`alitranslate`) as an example, here are the steps to use a community Tool Calling plugin:

1. **Add Maven dependency**:

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    <version>1.0.0.2</version>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-tool-calling-alitranslate</artifactId>
    <version>1.0.0.2</version>
</dependency>
```

2. **Configure to enable the plugin and necessary parameters in the configuration file**:

```yaml
spring:
  ai:
    alibaba:
      toolcalling:
        alitranslate:
          enabled: true
          access-key-id: ${ALITRANSLATE_ACCESS_KEY_ID}
          secret-key: ${ALITRANSLATE_ACCESS_KEY_SECRET}
```

3. **Register the Tool when calling ChatClient**:

```java
String response = chatClient.prompt("You are a translation assistant.")
    .user("Please translate 'Thank you for using this product' into English and Japanese")
    .toolNames("aliTranslateService")
    .call()
    .content();
```

**Or register the Tool when constructing ChatClient**:

```java
chatClient = ChatClient.builder(chatModel)
    .defaultToolNames("aliTranslateService")
    .build();
String response = chatClient.prompt("You are a translation assistant.")
        .user("Please translate 'Thank you for using this product' into English and Japanese")
        .call()
        .content();
```

## Community Implementation List

Here is the list of Tool Calling available for version `1.0.0.2` (**Future version updates may have changes, please refer to the corresponding version code.**), which can be used according to business needs:

- Alibaba Cloud Machine Translation
    - **Tool Name**: `aliTranslateService`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.alitranslate`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-alitranslate`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `access-key-id`: Service's AccessKeyId, if not provided, reads the value from system environment variable `ALITRANSLATE_ACCESS_KEY_ID`.
        - `secret-key`: Service's SecretKey, if not provided, reads the value from system environment variable `ALITRANSLATE_ACCESS_KEY_SECRET`.
- Gaode Map City Weather
    - **Tool Name**: `gaoDeGetAddressWeather`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.amap`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-amap`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Gaode Map service's ApiKey, if not provided, reads the value from system environment variable `GAODE_AMAP_API_KEY`.
- Baidu Map
    - **Tool Name**:
        - `baiduMapGetAddressInformation`: Get detailed address information
        - `baiDuMapGetAddressWeatherInformation`: Get city weather
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.baidu.map`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-baidumap`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Baidu Map service's ApiKey, if not provided, reads the value from system environment variable `BAIDU_MAP_API_KEY`.
- Baidu Search
    - **Tool Name**: `baiduSearch`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.baidu.search`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-baidusearch`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Baidu Translate
    - **Tool Name**: `baiduTranslate`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.baidu.translate`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-baidutranslate`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `secret-key`: Baidu Translate service's SecretKey, if not provided, reads the value from system environment variable `BAIDU_TRANSLATE_SECRET_KEY`.
        - `app-id`: Baidu Translate service's AppId, if not provided, reads the value from system environment variable `BAIDU_TRANSLATE_APP_ID`.
- Bing Search
    - **Tool Name**: `bingSearch`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.bingsearch`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-bingsearch`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `token`: Bing service's Token, if not provided, reads the value from system environment variable `BING_SEARCH_TOKEN`.
- DingTalk Group Message
    - **Tool Name**: `dingTalkGroupSendMessageByCustomRobot`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.dingtalk`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-dingtalk`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `custom-robot-access-token`: Custom robot's AccessToken, must be provided.
        - `custom-robot-signature`: Custom robot's Signature, must be provided.
- DuckDuckGo Recent News Query
    - **Tool Name**: `duckDuckGoQueryNews`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.duckduckgo`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-duckduckgo`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Serpapi service's ApiKey, if not provided, reads the value from system environment variable `SERPAPI_KEY`.
- GitHub Tool Kits
    - **Tool Name**:
        - `getIssue`: Get GitHub repository issue information
        - `createPullRequest`: Create PR in a GitHub repository
        - `SearchRepository`: Query GitHub repository information by name
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.githubtoolkit`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-githubtoolkit`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `token`: GitHub's Token, if not provided, reads the value from system environment variable `GITHUB_TOKEN`.
        - `owner`: Repository owner to query, must be set.
        - `repository`: Repository name to query, must be set.
- Google Translate
    - **Tool Name**: `googleTranslate`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.googletranslate`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-googletranslate`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Google Translate's ApiKey, if not provided, reads the value from system environment variable `GOOGLE_TRANSLATE_APIKEY`.
- JSON Processing Tools
    - **Tool Name**:
        - `jsonInsertPropertyFieldFunction`: Add a field value to a JSON object.
        - `jsonParsePropertyFunction`: Get the value of a field from a JSON object.
        - `jsonRemovePropertyFieldFunction`: Remove a field from a JSON object.
        - `jsonReplacePropertyFiledValueFunction`: Replace the value of a field in a JSON object.
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.jsonprocessor`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-jsonprocessor`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Kuaidi100 Express Tracking
    - **Tool Name**: `queryTrack`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.kuaidi100`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-kuaidi100`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Kuaidi100's ApiKey, if not provided, reads the value from system environment variable `KUAIDI100_KEY`.
        - `app-id`: Kuaidi100's AppId, if not provided, reads the value from system environment variable `KUAIDI100_CUSTOMER`.
- Lark Suite Documents
    - **Tool Name**:
        - `larksuiteCreateDocFunction`: Create document
        - `larksuiteChatFunction`: Send chat message
        - `larksuiteCreateSheetFunction`: Create worksheet
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.larksuite`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-larksuite`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `app-id`: Lark Suite's AppId, must be provided.
        - `app-secret`: Lark Suite's AppSecret, must be provided.
- Microsoft Translate
    - **Tool Name**: `microSoftTranslateFunction`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.microsofttranslate`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-microsofttranslate`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Microsoft Translate's ApiKey, if not provided, reads the value from system environment variable `MICROSOFT_TRANSLATE_API_KEY`.
        - `region`: Value for the request header `Ocp-Apim-Subscription-Region`, must be provided.
- Regex Query
    - **Tool Name**: `regexFindAll`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.regex`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-regex`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Sensitive Information Filter
    - **Tool Name**: `sensitiveFilter`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.sensitivefilter`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-sensitivefilter`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `replacement`: String used to replace sensitive information, defaults to `"***"`.
        - `filterPhoneNumber`: Whether to filter phone numbers, defaults to `true`.
        - `filterIdCard`: Whether to filter ID card numbers, defaults to `true`.
        - `filterBankCard`: Whether to filter bank card numbers, defaults to `true`.
        - `filterEmail`: Whether to filter email addresses, defaults to `true`.
- Serpapi Query
    - **Tool Name**:
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.serpai`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-serpai`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Serpapi service's ApiKey, if not provided, reads the value from system environment variable `SERPAPI_KEY`.
        - `engine`: Select the search engine to use, required.
- Sina News
    - **Tool Name**: `getSinaNews`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.sinanews`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-sinanews`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Tavily Search
    - **Tool Name**: `tavilySearch`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.tavilysearch`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-tavilysearch`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Tavily Search's ApiKey, if not provided, reads the value from system environment variable `TAVILY_SEARCH_API_KEY`.
- Get Time for a Specific Timezone
    - **Tool Name**: `getCityTimeFunction`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.time`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-time`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Toutiao News
    - **Tool Name**: `getToutiaoNews`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.toutiaonews`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-toutiaonews`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
- Weather Api City Weather
    - **Tool Name**: `getWeatherService`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.weather`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-weather`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `api-key`: Service's ApiKey, if not provided, reads the value from system environment variable `WEATHER_API_KEY`.
- Youdao Translate
    - **Tool Name**: `youdaoTranslate`
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.youdaotranslate`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-youdaotranslate`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `secret-key`: Youdao Translate's AppSecret, if not provided, reads the value from system environment variable `YOUDAO_APP_SECRET`.
        - `app-id`: Youdao Translate's AppId, if not provided, reads the value from system environment variable `YOUDAO_APP_ID`.
- Yuque
    - **Tool Name**:
        - `createYuqueDoc`: Create Yuque document.
        - `createYuqueBook`: Create Yuque Book knowledge base.
        - `updateDocService`: Update Yuque document.
        - `deleteDocService`: Delete Yuque document.
    - **Configuration File Prefix**: `spring.ai.alibaba.toolcalling.yuque`
    - **Maven Dependency Name**: `spring-ai-alibaba-starter-tool-calling-yuque`
    - **Configuration Field Description**:
        - `enabled`: Enables the plugin when set to `true`.
        - `token`: Yuque's Token, must be set.
