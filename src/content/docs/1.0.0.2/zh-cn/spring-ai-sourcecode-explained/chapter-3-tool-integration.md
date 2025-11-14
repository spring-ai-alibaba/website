---
title: 第三章：tool 整合
keywords: [Spring AI, Spring AI Alibaba, 源码解读]
description: "本章详细阐述了如何在 Spring AI 中整合和使用 Tool（工具），以增强 AI 模型的功能，使其能够与外部 API 或自定义服务进行交互。内容包括必要的 `pom.xml` 依赖配置（如 `spring-ai-autoconfigure-model-tool`）和在 `application.yml` 中启用特定工具（如时间和天气工具）的设置。通过一个获取指定城市时间的 'Time Tool' 实例，章节具体展示了两种工具实现方式：一种是直接使用 `@Tool` 注解的 Method 版本（如 `TimeTools` 类），另一种是基于 `java.util.function.Function` 接口并结合 Spring 自动配置的 Function 版本（如 `TimeAutoConfiguration` 和 `GetCurrentTimeByTimeZoneIdService`）。此外，`TimeController` 中的示例代码演示了如何在聊天交互中实际调用这些已注册的工具，以响应用户关于时间的查询。"
---

- 作者：影子, Spring AI Alibaba Committer
- 本文档基于 Spring AI 1.0.0 版本，Spring AI Alibaba 1.0.0.2 版本
- 本章包含：Tool快速上手 + 源码解读（Tool类的说明 + 工具触发链路）

## tool 快速上手

> Tool 工具允许模型与一组 API 或工具进行交互，增强模型功能。 以下实现了工具的典型案例：Method 版、Function 版实现、internalToolExecutionEnabled 设置，实战代码可见：https://github.com/GTyingzi/spring-ai-tutorial 下的tool-calling


### pom 文件

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-openai</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-chat-client</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-autoconfigure-model-tool</artifactId>
    </dependency>
    
<!--        下面这两个依赖是额外引入的工具处理类，不需要可删除-->
    <dependency>
        <groupId>cn.hutool</groupId>
        <artifactId>hutool-extra</artifactId>
        <version>5.8.20</version>
    </dependency>

    <dependency>
        <groupId>com.belerweb</groupId>
        <artifactId>pinyin4j</artifactId>
        <version>2.5.1</version>
    </dependency>

</dependencies>
```

### application.yml

```yaml
server:
  port: 8080

spring:
  application:
    name: tool-calling

  ai:
    openai:
      api-key: ${DASHSCOPEAPIKEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-max

    // 启动配置的time、weather的工具
    toolcalling:
      time:
        enabled: true
      weather:
        enabled: true
        api-key: ${WEATHERAPIKEY}
```

天气预测 API 接入文档：[https://www.weatherapi.com/docs/](https://www.weatherapi.com/docs/)

### 时间工具

#### TimeUtils

```java
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class TimeUtils {

    public static String getTimeByZoneId(String zoneId) {

        // Get the time zone using ZoneId
        ZoneId zid = ZoneId.of(zoneId);

        // Get the current time in this time zone
        ZonedDateTime zonedDateTime = ZonedDateTime.now(zid);

        // Defining a formatter
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

        // Format ZonedDateTime as a string
        String formattedDateTime = zonedDateTime.format(formatter);

        return formattedDateTime;
    }
}
```

#### TimeTools（Method 版）

```java
public class TimeTools {

    private static final Logger logger = LoggerFactory.getLogger(TimeTools.class);

    @Tool(description = "Get the time of a specified city.")
    public String  getCityTimeMethod(@ToolParam(description = "Time zone id, such as Asia/Shanghai") String timeZoneId) {
        logger.info("The current time zone is {}", timeZoneId);
        return String.format("The current time zone is %s and the current time is " + "%s", timeZoneId,
                TimeUtils.getTimeByZoneId(timeZoneId));
    }
}
```

#### TimeAutoConfiguration（Function 版）

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

@Configuration
@ConditionalOnClass({GetCurrentTimeByTimeZoneIdService.class})
@ConditionalOnProperty(prefix = "spring.ai.toolcalling.time", name = "enabled", havingValue = "true")
public class TimeAutoConfiguration {

    @Bean(name = "getCityTimeFunction")
    @ConditionalOnMissingBean
    @Description("Get the time of a specified city.")
    public GetCurrentTimeByTimeZoneIdService getCityTimeFunction() {
        return new GetCurrentTimeByTimeZoneIdService();
    }

}
```

#### GetCurrentTimeByTimeZoneIdService（Function 版）

```java
import com.fasterxml.jackson.annotation.JsonClassDescription;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.spring.ai.tutorial.toolcall.component.time.TimeUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.function.Function;

public class GetCurrentTimeByTimeZoneIdService implements Function<GetCurrentTimeByTimeZoneIdService.Request, GetCurrentTimeByTimeZoneIdService.Response> {

    private static final Logger logger = LoggerFactory.getLogger(GetCurrentTimeByTimeZoneIdService.class);

    @Override
    public Response apply(Request request) {
        String timeZoneId = request.timeZoneId;
        logger.info("The current time zone is {}", timeZoneId);
        return new Response(String.format("The current time zone is %s and the current time is " + "%s", timeZoneId,
                TimeUtils.getTimeByZoneId(timeZoneId)));
    }

    @JsonInclude(JsonInclude.Include.NONNULL)
    @JsonClassDescription("Get the current time based on time zone id")
    public record Request(@JsonProperty(required = true, value = "timeZoneId") @JsonPropertyDescription("Time zone id, such as Asia/Shanghai") String timeZoneId) {
    }

    public record Response(String description) {
    }

}
```

#### TimeController

```java
import com.spring.ai.tutorial.toolcall.component.time.method.TimeTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.springframework.ai.chat.memory.ChatMemory.CONVERSATIONID;

@RestController
@RequestMapping("/chat/time")
public class TimeController {

    private final ChatClient chatClient;
    private final InMemoryChatMemoryRepository chatMemoryRepository = new InMemoryChatMemoryRepository();
    private final int MAXMESSAGES = 100;
    private final MessageWindowChatMemory messageWindowChatMemory = MessageWindowChatMemory.builder()
            .chatMemoryRepository(chatMemoryRepository)
            .maxMessages(MAXMESSAGES)
            .build();


    public TimeController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
                .build();
    }

    /**
     * 无工具版
     */
    @GetMapping("/call")
    public String call(@RequestParam(value = "query", defaultValue = "请告诉我现在北京时间几点了") String query) {
        return chatClient.prompt(query).call().content();
    }

    /**
     * 调用工具版 - function
     */
    @GetMapping("/call/tool-function")
    public String callToolFunction(@RequestParam(value = "query", defaultValue = "请告诉我现在北京时间几点了") String query) {
        return chatClient.prompt(query).toolNames("getCityTimeFunction").call().content();
    }

    /**
     * 调用工具版 - method
     */
    @GetMapping("/call/tool-method")
    public String callToolMethod(@RequestParam(value = "query", defaultValue = "请告诉我现在北京时间几点了") String query) {
        return chatClient.prompt(query).tools(new TimeTools()).call().content();
    }

    /**
     * call 调用工具版 - method - false
     */
    @GetMapping("/call/tool-method-false")
    public ChatResponse callToolMethodFalse(@RequestParam(value = "query", defaultValue = "请告诉我现在北京时间几点了") String query) {
        ChatClient.CallResponseSpec call = chatClient.prompt(query).tools(new TimeTools())
                .advisors(
                        a -> a.param(CONVERSATIONID, "yingzi")
                )
                .options(ToolCallingChatOptions.builder()
                        .internalToolExecutionEnabled(false)  // 禁用内部工具执行
                        .build()
                )
                .call();
        return call.chatResponse();
    }

    @GetMapping("/messages")
    public List<Message> messages(@RequestParam(value = "conversationid", defaultValue = "yingzi") String conversationId) {
        return messageWindowChatMemory.get(conversationId);
    }

}
```

#### 效果

无工具版，大模型无法知道当前时间

![](/img/user/ai/spring-ai-explained-sourcecode/AoQkbxgh7olAVTx2neVcpihgnIh.png)

工具版—Function，通过自动注入对应的工具 Bean，实现获取时间

![](/img/user/ai/spring-ai-explained-sourcecode/IpT9bWvSoopqH8xi5rtcLOwqnmK.png)

工具版—Method，通过 @Tool 注解指定工具 Bean，实现获取时间

![](/img/user/ai/spring-ai-explained-sourcecode/ERkDbhGU3oWYJZxX7Ssc5fR2nMg.png)

通过设置工具判断字段 internalToolExecutionEnabled=false（默认为 true），来手动控制工具执行

![](/img/user/ai/spring-ai-explained-sourcecode/QYnIbXx1jovwXRxfvL7cK1k3nKd.png)

可结合历史消息记录，用来编写手动控制工具之后的逻辑

![](/img/user/ai/spring-ai-explained-sourcecode/CKYLb6pU1o5QZSxAKR7cB2KonoW.png)

### 天气工具

#### WeatherUtils

```java
import cn.hutool.extra.pinyin.PinyinUtil;

public class WeatherUtils {

    public static String preprocessLocation(String location) {
        if (containsChinese(location)) {
            return PinyinUtil.getPinyin(location, "");
        }
        return location;
    }

    public static boolean containsChinese(String str) {
        return str.matches(".*[\u4e00-\u9fa5].*");
    }
}
```

#### WeatherProperties

```java
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "spring.ai.toolcalling.weather")
public class WeatherProperties {

    private String apiKey;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

}
```

#### WeatherTools（Method 版）

```java
package com.spring.ai.tutorial.toolcall.component.weather.method;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.ai.tutorial.toolcall.component.weather.WeatherProperties;
import com.spring.ai.tutorial.toolcall.component.weather.WeatherUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public class WeatherTools {

    private static final Logger logger = LoggerFactory.getLogger(WeatherTools.class);

    private static final String WEATHERAPIURL = "https://api.weatherapi.com/v1/forecast.json";

    private final WebClient webClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeatherTools(WeatherProperties properties) {
        this.webClient = WebClient.builder()
                .defaultHeader(HttpHeaders.CONTENTTYPE, "application/x-www-form-urlencoded")
                .defaultHeader("key", properties.getApiKey())
                .build();
    }

    @Tool(description = "Use api.weather to get weather information.")
    public Response getWeatherServiceMethod(@ToolParam(description = "City name") String city,
                                            @ToolParam(description = "Number of days of weather forecast. Value ranges from 1 to 14") int days) {

        if (!StringUtils.hasText(city)) {
            logger.error("Invalid request: city is required.");
            return null;
        }
        String location = WeatherUtils.preprocessLocation(city);
        String url = UriComponentsBuilder.fromHttpUrl(WEATHERAPIURL)
                .queryParam("q", location)
                .queryParam("days", days)
                .toUriString();
        logger.info("url : {}", url);
        try {
            Mono<String> responseMono = webClient.get().uri(url).retrieve().bodyToMono(String.class);
            String jsonResponse = responseMono.block();
            assert jsonResponse != null;

            Response response = fromJson(objectMapper.readValue(jsonResponse, new TypeReference<Map<String, Object>>() {
            }));
            logger.info("Weather data fetched successfully for city: {}", response.city());
            return response;
        } catch (Exception e) {
            logger.error("Failed to fetch weather data: {}", e.getMessage());
            return null;
        }
    }

    public static Response fromJson(Map<String, Object> json) {
        Map<String, Object> location = (Map<String, Object>) json.get("location");
        Map<String, Object> current = (Map<String, Object>) json.get("current");
        Map<String, Object> forecast = (Map<String, Object>) json.get("forecast");
        List<Map<String, Object>> forecastDays = (List<Map<String, Object>>) forecast.get("forecastday");
        String city = (String) location.get("name");
        return new Response(city, current, forecastDays);
    }

    public record Response(String city, Map<String, Object> current, List<Map<String, Object>> forecastDays) {
    }

}
```

#### WeatherAutoConfiguration（Function 版）

```java
import com.spring.ai.tutorial.toolcall.component.weather.WeatherProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

@Configuration
@ConditionalOnClass(WeatherService.class)
@EnableConfigurationProperties(WeatherProperties.class)
@ConditionalOnProperty(prefix = "spring.ai.toolcalling.weather", name = "enabled", havingValue = "true")
public class WeatherAutoConfiguration {

    @Bean(name = "getWeatherFunction")
    @ConditionalOnMissingBean
    @Description("Use api.weather to get weather information.")
    public WeatherService getWeatherServiceFunction(WeatherProperties properties) {
        return new WeatherService(properties);
    }

}
```

#### WeatherService（Function 版）

```java
import com.fasterxml.jackson.annotation.JsonClassDescription;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.ai.tutorial.toolcall.component.weather.WeatherProperties;
import com.spring.ai.tutorial.toolcall.component.weather.WeatherUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class WeatherService implements Function<WeatherService.Request, WeatherService.Response> {

    private static final Logger logger = LoggerFactory.getLogger(WeatherService.class);

    private static final String WEATHERAPIURL = "https://api.weatherapi.com/v1/forecast.json";

    private final WebClient webClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeatherService(WeatherProperties properties) {
        this.webClient = WebClient.builder()
                .defaultHeader(HttpHeaders.CONTENTTYPE, "application/x-www-form-urlencoded")
                .defaultHeader("key", properties.getApiKey())
                .build();
    }

    public static Response fromJson(Map<String, Object> json) {
        Map<String, Object> location = (Map<String, Object>) json.get("location");
        Map<String, Object> current = (Map<String, Object>) json.get("current");
        Map<String, Object> forecast = (Map<String, Object>) json.get("forecast");
        List<Map<String, Object>> forecastDays = (List<Map<String, Object>>) forecast.get("forecastday");
        String city = (String) location.get("name");
        return new Response(city, current, forecastDays);
    }

    @Override
    public Response apply(Request request) {
        if (request == null || !StringUtils.hasText(request.city())) {
            logger.error("Invalid request: city is required.");
            return null;
        }
        String location = WeatherUtils.preprocessLocation(request.city());
        String url = UriComponentsBuilder.fromHttpUrl(WEATHERAPIURL)
                .queryParam("q", location)
                .queryParam("days", request.days())
                .toUriString();
        logger.info("url : {}", url);
        try {
            Mono<String> responseMono = webClient.get().uri(url).retrieve().bodyToMono(String.class);
            String jsonResponse = responseMono.block();
            assert jsonResponse != null;

            Response response = fromJson(objectMapper.readValue(jsonResponse, new TypeReference<Map<String, Object>>() {
            }));
            logger.info("Weather data fetched successfully for city: {}", response.city());
            return response;
        } catch (Exception e) {
            logger.error("Failed to fetch weather data: {}", e.getMessage());
            return null;
        }
    }

    @JsonInclude(JsonInclude.Include.NONNULL)
    @JsonClassDescription("Weather Service API request")
    public record Request(
            @JsonProperty(required = true, value = "city") @JsonPropertyDescription("city name") String city,

            @JsonProperty(required = true,
                    value = "days") @JsonPropertyDescription("Number of days of weather forecast. Value ranges from 1 to 14") int days) {
    }

    public record Response(
            String city,
            Map<String, Object> current,
            List<Map<String, Object>> forecastDays) {
    }

}
```

#### WeatherController

```java
package com.spring.ai.tutorial.toolcall.controller;

import com.spring.ai.tutorial.toolcall.component.weather.WeatherProperties;
import com.spring.ai.tutorial.toolcall.component.weather.method.WeatherTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chat/weather")
public class WeatherController {

    private final ChatClient chatClient;

    private final WeatherProperties weatherProperties;


    public WeatherController(ChatClient.Builder chatClientBuilder, WeatherProperties weatherProperties) {
        this.chatClient = chatClientBuilder.build();
        this.weatherProperties = weatherProperties;
    }

    /**
     * 无工具版
     */
    @GetMapping("/call")
    public String call(@RequestParam(value = "query", defaultValue = "请告诉我北京1天以后的天气") String query) {
        return chatClient.prompt(query).call().content();
    }

    /**
     * 调用工具版 - function
     */
    @GetMapping("/call/tool-function")
    public String callToolFunction(@RequestParam(value = "query", defaultValue = "请告诉我北京1天以后的天气") String query) {
        return chatClient.prompt(query).toolNames("getWeatherFunction").call().content();
    }

    /**
     * 调用工具版 - method
     */
    @GetMapping("/call/tool-method")
    public String callToolMethod(@RequestParam(value = "query", defaultValue = "请告诉我北京1天以后的天气") String query) {
        return chatClient.prompt(query).tools(new WeatherTools(weatherProperties)).call().content();
    }
}
```

#### 效果

无工具版，大模型无法知道天气情况

![](/img/user/ai/spring-ai-explained-sourcecode/LrWBb5iafoCJMNxYhZhcPgPCn5c.png)

工具版—Function，通过自动注入对应的工具 Bean，实现获取天气

![](/img/user/ai/spring-ai-explained-sourcecode/BEvabUgF1oRF5ixk2lHcoodYnfh.png)

工具版—Function，通过 @Tool 注解指定工具 Bean，实现获取天气

![](/img/user/ai/spring-ai-explained-sourcecode/WMjpbffGuoTegkxc12Uc6zOAnKb.png)

## Tool 源码解读

> 本文档是关于 Tool 调用底层机制的梳理

### 工具各类说明（不含 MCP 内容）

![](/img/user/ai/spring-ai-explained-sourcecode/tool源码-工具各类说明.png)

### Tool（工具注解）

标记一个方法为 SpringAI 中的工具，从而使方法能够被框架识别并用于 AI 模型的调用

- `name`：工具名称，默认为方法名称
- `description`：工具描述信息，默认为方法名称
- `returnDirect`：指定工具结果是否直接返回或传递给模型，默认为 false
- `resultConverter`：工具调用结果的转化器，默认使用 DefaultToolCallResultConverter，将结果转换为字符串

```java
package org.springframework.ai.tool.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.ai.tool.execution.DefaultToolCallResultConverter;
import org.springframework.ai.tool.execution.ToolCallResultConverter;

@Target({ ElementType.METHOD, ElementType.ANNOTATIONTYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Tool {

    String name() default "";

    String description() default "";

    boolean returnDirect() default false;
    Class<? extends ToolCallResultConverter> resultConverter() default DefaultToolCallResultConverter.class;

}
```

#### ToolParam

用来标记工具方法的接口入参，通常和 @Tool 注解配合使用

- `required`：指定参数是否为必需参数，默认为 true
- `description`：参数的描述信息

```java
package org.springframework.ai.tool.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ ElementType.PARAMETER, ElementType.FIELD, ElementType.ANNOTATIONTYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ToolParam {

    boolean required() default true;

    String description() default "";

}
```

### ToolDefinition（工具定义）

定义工具的基本信息和调用参数结构

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>name<br/></td><td>工具的名称，提供给AI模型时，需要标识唯一<br/></td></tr>
<tr>
<td>description<br/></td><td>工具的描述信息，帮助AI模型理解工具的用途<br/></td></tr>
<tr>
<td>inputSchema<br/></td><td>定义工具的入参结构<br/></td></tr>
<tr>
<td>builder<br/></td><td>创建默认的ToolDefinition构建器<br/></td></tr>
</table>


```java
package org.springframework.ai.tool.definition;

public interface ToolDefinition {

    String name();

    String description();

    String inputSchema();

    static DefaultToolDefinition.Builder builder() {
       return DefaultToolDefinition.builder();
    }

}
```

#### DefaultToolDefinition

ToolDefinition 接口的默认实现类

```java
package org.springframework.ai.tool.definition;

import org.springframework.ai.util.ParsingUtils;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

public record DefaultToolDefinition(String name, String description, String inputSchema) implements ToolDefinition {

    public DefaultToolDefinition {
       Assert.hasText(name, "name cannot be null or empty");
       Assert.hasText(description, "description cannot be null or empty");
       Assert.hasText(inputSchema, "inputSchema cannot be null or empty");
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private String name;

       private String description;

       private String inputSchema;

       private Builder() {
       }

       public Builder name(String name) {
          this.name = name;
          return this;
       }

       public Builder description(String description) {
          this.description = description;
          return this;
       }

       public Builder inputSchema(String inputSchema) {
          this.inputSchema = inputSchema;
          return this;
       }

       public ToolDefinition build() {
          if (!StringUtils.hasText(this.description)) {
             Assert.hasText(this.name, "toolName cannot be null or empty");
             this.description = ParsingUtils.reConcatenateCamelCase(this.name, " ");
          }
          return new DefaultToolDefinition(this.name, this.description, this.inputSchema);
       }

    }

}
```

#### ToolDefinitions

主要用于根据 Java 的 Method 对象快速创建和构建 ToolDefinition 实例

```java
package org.springframework.ai.tool.support;

import java.lang.reflect.Method;

import org.springframework.ai.tool.definition.DefaultToolDefinition;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.util.json.schema.JsonSchemaGenerator;
import org.springframework.util.Assert;

public final class ToolDefinitions {

    private ToolDefinitions() {
    }

    public static DefaultToolDefinition.Builder builder(Method method) {
       Assert.notNull(method, "method cannot be null");
       return DefaultToolDefinition.builder()
          .name(ToolUtils.getToolName(method))
          .description(ToolUtils.getToolDescription(method))
          .inputSchema(JsonSchemaGenerator.generateForMethodInput(method));
    }

    public static ToolDefinition from(Method method) {
       return builder(method).build();
    }

}
```

### ToolMetadata（工具元数据）

描述工具的元数据信息，目前仅用来控制是否直接将工具结果返回给 AI 模型

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>returnDirect<br/></td><td>是否将工具结果直接返回给调用方（如 AI 模型），默认返回 false<br/></td></tr>
<tr>
<td>builder<br/></td><td>创建默认的ToolMetadata构建器<br/></td></tr>
<tr>
<td>from<br/></td><td>通过反射方法对象创建ToolMetadata实例<br/></td></tr>
</table>


```java
package org.springframework.ai.tool.metadata;

import java.lang.reflect.Method;

import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.util.Assert;

public interface ToolMetadata {

    default boolean returnDirect() {
       return false;
    }
    static DefaultToolMetadata.Builder builder() {
       return DefaultToolMetadata.builder();
    }
    
    static ToolMetadata from(Method method) {
       Assert.notNull(method, "method cannot be null");
       return DefaultToolMetadata.builder().returnDirect(ToolUtils.getToolReturnDirect(method)).build();
    }

}
```

#### DefaultToolMetadata

ToolMetadata 接口类的默认实现类

```java
package org.springframework.ai.tool.metadata;


public record DefaultToolMetadata(boolean returnDirect) implements ToolMetadata {

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private boolean returnDirect = false;

       private Builder() {
       }

       public Builder returnDirect(boolean returnDirect) {
          this.returnDirect = returnDirect;
          return this;
       }

       public ToolMetadata build() {
          return new DefaultToolMetadata(this.returnDirect);
       }

    }

}
```

### ToolUtils（工具的辅助类）

主要为 SpringAI 工具相关的内部框架提供各种静态辅助方法，简化对 @Tool 注解方法的元数据提取、工具名称/描述处理、结果转换器实例化、工具名唯一性校验等操作

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>getToolName<br/></td><td>获取方法的工具名称。优先取 @Tool 注解的 name 属性，否则用方法名<br/></td></tr>
<tr>
<td>getToolDescriptionFromName<br/></td><td>根据工具名生成描述（如将驼峰命名转为带空格的描述），便于自动生成人类可读的说明<br/></td></tr>
<tr>
<td>getToolDescription<br/></td><td>获取方法的工具描述。优先取 @Tool 注解的 description 属性，否则用方法名或自动生成<br/></td></tr>
<tr>
<td>getToolReturnDirect<br/></td><td>判断方法的 @Tool 注解是否设置了 returnDirect，用于标记工具是否直接返回结果<br/></td></tr>
<tr>
<td>getToolCallResultConverter<br/></td><td>获取方法指定的结果转换器实例。优先取 @Tool 注解的 resultConverter 类型，未指定则用默认实现<br/></td></tr>
<tr>
<td>getDuplicateToolNames<br/></td><td>检查工具回调中是否有重复的工具名，返回所有的重复工具名称<br/></td></tr>
</table>


```java
package org.springframework.ai.tool.support;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.execution.DefaultToolCallResultConverter;
import org.springframework.ai.tool.execution.ToolCallResultConverter;
import org.springframework.ai.util.ParsingUtils;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

public final class ToolUtils {

    private ToolUtils() {
    }

    public static String getToolName(Method method) {
       Assert.notNull(method, "method cannot be null");
       var tool = method.getAnnotation(Tool.class);
       if (tool == null) {
          return method.getName();
       }
       return StringUtils.hasText(tool.name()) ? tool.name() : method.getName();
    }

    public static String getToolDescriptionFromName(String toolName) {
       Assert.hasText(toolName, "toolName cannot be null or empty");
       return ParsingUtils.reConcatenateCamelCase(toolName, " ");
    }

    public static String getToolDescription(Method method) {
       Assert.notNull(method, "method cannot be null");
       var tool = method.getAnnotation(Tool.class);
       if (tool == null) {
          return ParsingUtils.reConcatenateCamelCase(method.getName(), " ");
       }
       return StringUtils.hasText(tool.description()) ? tool.description() : method.getName();
    }

    public static boolean getToolReturnDirect(Method method) {
       Assert.notNull(method, "method cannot be null");
       var tool = method.getAnnotation(Tool.class);
       return tool != null && tool.returnDirect();
    }

    public static ToolCallResultConverter getToolCallResultConverter(Method method) {
       Assert.notNull(method, "method cannot be null");
       var tool = method.getAnnotation(Tool.class);
       if (tool == null) {
          return new DefaultToolCallResultConverter();
       }
       var type = tool.resultConverter();
       try {
          return type.getDeclaredConstructor().newInstance();
       }
       catch (Exception e) {
          throw new IllegalArgumentException("Failed to instantiate ToolCallResultConverter: " + type, e);
       }
    }

    public static List<String> getDuplicateToolNames(List<ToolCallback> toolCallbacks) {
       Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
       return toolCallbacks.stream()
          .collect(Collectors.groupingBy(toolCallback -> toolCallback.getToolDefinition().name(),
                Collectors.counting()))
          .entrySet()
          .stream()
          .filter(entry -> entry.getValue() > 1)
          .map(Map.Entry::getKey)
          .collect(Collectors.toList());
    }

    public static List<String> getDuplicateToolNames(ToolCallback... toolCallbacks) {
       Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
       return getDuplicateToolNames(Arrays.asList(toolCallbacks));
    }

}
```

### ToolCallback（工具回调）

该接口定义了一个可被 AI 模型触发执行的工具回调

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>getToolDefinition<br/></td><td>获取工具的定义信息<br/></td></tr>
<tr>
<td>getToolMetadata<br/></td><td>获取工具的元数据信息<br/></td></tr>
<tr>
<td>call<br/></td><td>传入工具入参、工具上下文等信息，执行工具逻辑<br/></td></tr>
</table>


```java
package org.springframework.ai.tool;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.lang.Nullable;

public interface ToolCallback {

    ToolDefinition getToolDefinition();

    default ToolMetadata getToolMetadata() {
       return ToolMetadata.builder().build();
    }

    String call(String toolInput);

    default String call(String toolInput, @Nullable ToolContext tooContext) {
       if (tooContext != null && !tooContext.getContext().isEmpty()) {
          throw new UnsupportedOperationException("Tool context is not supported!");
       }
       return call(toolInput);
    }

}
```

#### FunctionToolCallback

用于将 Java 的函数式接口（如 Function、BiFunction、Supplier、Consumer）封装为可被 AI 框架调用的工具

- `ToolDefinition toolDefinition`：工具定义
- `ToolMetadata toolMetadata`：工具元数据
- `Type toolInputType`：工具输入参数的类型，用于 JSON 反序列化
- `BiFunction<I, ToolContext, O> toolFunction`：实际执行的函数逻辑
- `ToolCallResultConverter toolCallResultConverter`：结果转化器，默认将工具结果转换为字符串

```java
package org.springframework.ai.tool.function;

import java.lang.reflect.Type;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.DefaultToolDefinition;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.execution.DefaultToolCallResultConverter;
import org.springframework.ai.tool.execution.ToolCallResultConverter;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.ai.util.json.JsonParser;
import org.springframework.ai.util.json.schema.JsonSchemaGenerator;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

public class FunctionToolCallback<I, O> implements ToolCallback {

    private static final Logger logger = LoggerFactory.getLogger(FunctionToolCallback.class);

    private static final ToolCallResultConverter DEFAULTRESULTCONVERTER = new DefaultToolCallResultConverter();

    private static final ToolMetadata DEFAULTTOOLMETADATA = ToolMetadata.builder().build();

    private final ToolDefinition toolDefinition;

    private final ToolMetadata toolMetadata;

    private final Type toolInputType;

    private final BiFunction<I, ToolContext, O> toolFunction;

    private final ToolCallResultConverter toolCallResultConverter;

    public FunctionToolCallback(ToolDefinition toolDefinition, @Nullable ToolMetadata toolMetadata, Type toolInputType,
          BiFunction<I, ToolContext, O> toolFunction, @Nullable ToolCallResultConverter toolCallResultConverter) {
       Assert.notNull(toolDefinition, "toolDefinition cannot be null");
       Assert.notNull(toolInputType, "toolInputType cannot be null");
       Assert.notNull(toolFunction, "toolFunction cannot be null");
       this.toolDefinition = toolDefinition;
       this.toolMetadata = toolMetadata != null ? toolMetadata : DEFAULTTOOLMETADATA;
       this.toolFunction = toolFunction;
       this.toolInputType = toolInputType;
       this.toolCallResultConverter = toolCallResultConverter != null ? toolCallResultConverter
             : DEFAULTRESULTCONVERTER;
    }

    @Override
    public ToolDefinition getToolDefinition() {
       return this.toolDefinition;
    }

    @Override
    public ToolMetadata getToolMetadata() {
       return this.toolMetadata;
    }

    @Override
    public String call(String toolInput) {
       return call(toolInput, null);
    }

    @Override
    public String call(String toolInput, @Nullable ToolContext toolContext) {
       Assert.hasText(toolInput, "toolInput cannot be null or empty");

       logger.debug("Starting execution of tool: {}", this.toolDefinition.name());

       I request = JsonParser.fromJson(toolInput, this.toolInputType);
       O response = this.toolFunction.apply(request, toolContext);

       logger.debug("Successful execution of tool: {}", this.toolDefinition.name());

       return this.toolCallResultConverter.convert(response, null);
    }

    @Override
    public String toString() {
       return "FunctionToolCallback{" + "toolDefinition=" + this.toolDefinition + ", toolMetadata=" + this.toolMetadata
             + '}';
    }

    /**
     * Build a {@link FunctionToolCallback} from a {@link BiFunction}.
     */
    public static <I, O> Builder<I, O> builder(String name, BiFunction<I, ToolContext, O> function) {
       return new Builder<>(name, function);
    }

    /**
     * Build a {@link FunctionToolCallback} from a {@link Function}.
     */
    public static <I, O> Builder<I, O> builder(String name, Function<I, O> function) {
       Assert.notNull(function, "function cannot be null");
       return new Builder<>(name, (request, context) -> function.apply(request));
    }

    /**
     * Build a {@link FunctionToolCallback} from a {@link Supplier}.
     */
    public static <O> Builder<Void, O> builder(String name, Supplier<O> supplier) {
       Assert.notNull(supplier, "supplier cannot be null");
       Function<Void, O> function = input -> supplier.get();
       return builder(name, function).inputType(Void.class);
    }

    /**
     * Build a {@link FunctionToolCallback} from a {@link Consumer}.
     */
    public static <I> Builder<I, Void> builder(String name, Consumer<I> consumer) {
       Assert.notNull(consumer, "consumer cannot be null");
       Function<I, Void> function = (I input) -> {
          consumer.accept(input);
          return null;
       };
       return builder(name, function);
    }

    public static final class Builder<I, O> {

       private String name;

       private String description;

       private String inputSchema;

       private Type inputType;

       private ToolMetadata toolMetadata;

       private BiFunction<I, ToolContext, O> toolFunction;

       private ToolCallResultConverter toolCallResultConverter;

       private Builder(String name, BiFunction<I, ToolContext, O> toolFunction) {
          Assert.hasText(name, "name cannot be null or empty");
          Assert.notNull(toolFunction, "toolFunction cannot be null");
          this.name = name;
          this.toolFunction = toolFunction;
       }

       public Builder<I, O> description(String description) {
          this.description = description;
          return this;
       }

       public Builder<I, O> inputSchema(String inputSchema) {
          this.inputSchema = inputSchema;
          return this;
       }

       public Builder<I, O> inputType(Type inputType) {
          this.inputType = inputType;
          return this;
       }

       public Builder<I, O> inputType(ParameterizedTypeReference<?> inputType) {
          Assert.notNull(inputType, "inputType cannot be null");
          this.inputType = inputType.getType();
          return this;
       }

       public Builder<I, O> toolMetadata(ToolMetadata toolMetadata) {
          this.toolMetadata = toolMetadata;
          return this;
       }

       public Builder<I, O> toolCallResultConverter(ToolCallResultConverter toolCallResultConverter) {
          this.toolCallResultConverter = toolCallResultConverter;
          return this;
       }

       public FunctionToolCallback<I, O> build() {
          Assert.notNull(this.inputType, "inputType cannot be null");
          var toolDefinition = DefaultToolDefinition.builder()
             .name(this.name)
             .description(StringUtils.hasText(this.description) ? this.description
                   : ToolUtils.getToolDescriptionFromName(this.name))
             .inputSchema(StringUtils.hasText(this.inputSchema) ? this.inputSchema
                   : JsonSchemaGenerator.generateForType(this.inputType))
             .build();
          return new FunctionToolCallback<>(toolDefinition, this.toolMetadata, this.inputType, this.toolFunction,
                this.toolCallResultConverter);
       }

    }

}
```

#### MethodToolCallback

用于将 Java 方法封装为可被 AI 框架调用的工具

- `ToolDefinition toolDefinition`：工具定义
- `ToolMetadata toolMetadata`：工具元数据
- `Method toolMethod`：要调用的 Java 方法对象
- `Object toolObject`：方法所属对象，静态方法可为 null，实例方法必须提供
- `ToolCallResultConverter toolCallResultConverter`：结果转化器，默认将工具结果转换为字符串

```java
package org.springframework.ai.tool.method;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.stream.Stream;

import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.execution.DefaultToolCallResultConverter;
import org.springframework.ai.tool.execution.ToolCallResultConverter;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.ai.util.json.JsonParser;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;
import org.springframework.util.ClassUtils;
import org.springframework.util.CollectionUtils;

public final class MethodToolCallback implements ToolCallback {

    private static final Logger logger = LoggerFactory.getLogger(MethodToolCallback.class);

    private static final ToolCallResultConverter DEFAULTRESULTCONVERTER = new DefaultToolCallResultConverter();

    private static final ToolMetadata DEFAULTTOOLMETADATA = ToolMetadata.builder().build();

    private final ToolDefinition toolDefinition;

    private final ToolMetadata toolMetadata;

    private final Method toolMethod;

    @Nullable
    private final Object toolObject;

    private final ToolCallResultConverter toolCallResultConverter;

    public MethodToolCallback(ToolDefinition toolDefinition, @Nullable ToolMetadata toolMetadata, Method toolMethod,
          @Nullable Object toolObject, @Nullable ToolCallResultConverter toolCallResultConverter) {
       Assert.notNull(toolDefinition, "toolDefinition cannot be null");
       Assert.notNull(toolMethod, "toolMethod cannot be null");
       Assert.isTrue(Modifier.isStatic(toolMethod.getModifiers()) || toolObject != null,
             "toolObject cannot be null for non-static methods");
       this.toolDefinition = toolDefinition;
       this.toolMetadata = toolMetadata != null ? toolMetadata : DEFAULTTOOLMETADATA;
       this.toolMethod = toolMethod;
       this.toolObject = toolObject;
       this.toolCallResultConverter = toolCallResultConverter != null ? toolCallResultConverter
             : DEFAULTRESULTCONVERTER;
    }

    @Override
    public ToolDefinition getToolDefinition() {
       return this.toolDefinition;
    }

    @Override
    public ToolMetadata getToolMetadata() {
       return this.toolMetadata;
    }

    @Override
    public String call(String toolInput) {
       return call(toolInput, null);
    }

    @Override
    public String call(String toolInput, @Nullable ToolContext toolContext) {
       Assert.hasText(toolInput, "toolInput cannot be null or empty");

       logger.debug("Starting execution of tool: {}", this.toolDefinition.name());

       validateToolContextSupport(toolContext);

       Map<String, Object> toolArguments = extractToolArguments(toolInput);

       Object[] methodArguments = buildMethodArguments(toolArguments, toolContext);

       Object result = callMethod(methodArguments);

       logger.debug("Successful execution of tool: {}", this.toolDefinition.name());

       Type returnType = this.toolMethod.getGenericReturnType();

       return this.toolCallResultConverter.convert(result, returnType);
    }

    private void validateToolContextSupport(@Nullable ToolContext toolContext) {
       var isNonEmptyToolContextProvided = toolContext != null && !CollectionUtils.isEmpty(toolContext.getContext());
       var isToolContextAcceptedByMethod = Stream.of(this.toolMethod.getParameterTypes())
          .anyMatch(type -> ClassUtils.isAssignable(type, ToolContext.class));
       if (isToolContextAcceptedByMethod && !isNonEmptyToolContextProvided) {
          throw new IllegalArgumentException("ToolContext is required by the method as an argument");
       }
    }

    private Map<String, Object> extractToolArguments(String toolInput) {
       return JsonParser.fromJson(toolInput, new TypeReference<>() {
       });
    }

    // Based on the implementation in MethodToolCallback.
    private Object[] buildMethodArguments(Map<String, Object> toolInputArguments, @Nullable ToolContext toolContext) {
       return Stream.of(this.toolMethod.getParameters()).map(parameter -> {
          if (parameter.getType().isAssignableFrom(ToolContext.class)) {
             return toolContext;
          }
          Object rawArgument = toolInputArguments.get(parameter.getName());
          return buildTypedArgument(rawArgument, parameter.getParameterizedType());
       }).toArray();
    }

    @Nullable
    private Object buildTypedArgument(@Nullable Object value, Type type) {
       if (value == null) {
          return null;
       }

       if (type instanceof Class<?>) {
          return JsonParser.toTypedObject(value, (Class<?>) type);
       }

       // For generic types, use the fromJson method that accepts Type
       String json = JsonParser.toJson(value);
       return JsonParser.fromJson(json, type);
    }

    @Nullable
    private Object callMethod(Object[] methodArguments) {
       if (isObjectNotPublic() || isMethodNotPublic()) {
          this.toolMethod.setAccessible(true);
       }

       Object result;
       try {
          result = this.toolMethod.invoke(this.toolObject, methodArguments);
       }
       catch (IllegalAccessException ex) {
          throw new IllegalStateException("Could not access method: " + ex.getMessage(), ex);
       }
       catch (InvocationTargetException ex) {
          throw new ToolExecutionException(this.toolDefinition, ex.getCause());
       }
       return result;
    }

    private boolean isObjectNotPublic() {
       return this.toolObject != null && !Modifier.isPublic(this.toolObject.getClass().getModifiers());
    }

    private boolean isMethodNotPublic() {
       return !Modifier.isPublic(this.toolMethod.getModifiers());
    }

    @Override
    public String toString() {
       return "MethodToolCallback{" + "toolDefinition=" + this.toolDefinition + ", toolMetadata=" + this.toolMetadata
             + '}';
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private ToolDefinition toolDefinition;

       private ToolMetadata toolMetadata;

       private Method toolMethod;

       private Object toolObject;

       private ToolCallResultConverter toolCallResultConverter;

       private Builder() {
       }

       public Builder toolDefinition(ToolDefinition toolDefinition) {
          this.toolDefinition = toolDefinition;
          return this;
       }

       public Builder toolMetadata(ToolMetadata toolMetadata) {
          this.toolMetadata = toolMetadata;
          return this;
       }

       public Builder toolMethod(Method toolMethod) {
          this.toolMethod = toolMethod;
          return this;
       }

       public Builder toolObject(Object toolObject) {
          this.toolObject = toolObject;
          return this;
       }

       public Builder toolCallResultConverter(ToolCallResultConverter toolCallResultConverter) {
          this.toolCallResultConverter = toolCallResultConverter;
          return this;
       }

       public MethodToolCallback build() {
          return new MethodToolCallback(this.toolDefinition, this.toolMetadata, this.toolMethod, this.toolObject,
                this.toolCallResultConverter);
       }

    }

}
```

### ToolCallbackProvider（工具回调提供者）

抽象出 ToolCallback 的获取方式，支持从不同来源（MethodToolCallbackProvider、StaticToolCallbackProvider 等）集中管理 ToolCallback，便于框架扩展和集成

```java
package org.springframework.ai.tool;

import java.util.List;

public interface ToolCallbackProvider {

    ToolCallback[] getToolCallbacks();

    static ToolCallbackProvider from(List<? extends ToolCallback> toolCallbacks) {
       return new StaticToolCallbackProvider(toolCallbacks);
    }

    static ToolCallbackProvider from(ToolCallback... toolCallbacks) {
       return new StaticToolCallbackProvider(toolCallbacks);
    }

}
```

#### StaticToolCallbackProvider

ToolCallbackProvider 的一个简单实现，用于以静态方式集中管理和提供一组不可变的 ToolCallback

```java
package org.springframework.ai.tool;

import java.util.List;

import org.springframework.util.Assert;

public class StaticToolCallbackProvider implements ToolCallbackProvider {

    private final ToolCallback[] toolCallbacks;

    public StaticToolCallbackProvider(ToolCallback... toolCallbacks) {
       Assert.notNull(toolCallbacks, "ToolCallbacks must not be null");
       this.toolCallbacks = toolCallbacks;
    }

    public StaticToolCallbackProvider(List<? extends ToolCallback> toolCallbacks) {
       Assert.noNullElements(toolCallbacks, "toolCallbacks cannot contain null elements");
       this.toolCallbacks = toolCallbacks.toArray(new ToolCallback[0]);
    }

    @Override
    public ToolCallback[] getToolCallbacks() {
       return this.toolCallbacks;
    }

}
```

#### MethodToolCallbackProvider

用于从带 @Tool 注解的方法动态构建 ToolCallback 实例，统一提供给 AI 框架调用。适合基于注解的工具注册场景，简化工具方法的发现与管理。

getToolCallbacks 方法流程如下：

1. 遍历工具对象：对 toolObjects 列表中的每个对象进行处理
2. 获取方法列表：对每个对象，获取其所有声明的方法
3. 筛选 @Tool 注解方法：过滤出带有 @Tool 注解的方法
4. 排除函数式类型方法：过滤掉返回类型为 Function、Supplier、Consumer 的方法
5. 构建 ToolCallback 实例：对每个符合条件的方法，使用 MethodToolCallback.builder() 构建 ToolCallback 实例
6. 收集所有 ToolCallback：将所有构建好的 ToolCallback 实例收集到一个数组中
7. 校验工具名唯一性：调用 validateToolCallbacks，确保所有工具名唯一

```java
package org.springframework.ai.tool.method;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.ai.tool.support.ToolDefinitions;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.aop.support.AopUtils;
import org.springframework.util.Assert;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;

public final class MethodToolCallbackProvider implements ToolCallbackProvider {

    private static final Logger logger = LoggerFactory.getLogger(MethodToolCallbackProvider.class);

    private final List<Object> toolObjects;

    private MethodToolCallbackProvider(List<Object> toolObjects) {
       Assert.notNull(toolObjects, "toolObjects cannot be null");
       Assert.noNullElements(toolObjects, "toolObjects cannot contain null elements");
       assertToolAnnotatedMethodsPresent(toolObjects);
       this.toolObjects = toolObjects;
       validateToolCallbacks(getToolCallbacks());
    }

    private void assertToolAnnotatedMethodsPresent(List<Object> toolObjects) {

       for (Object toolObject : toolObjects) {
          List<Method> toolMethods = Stream
             .of(ReflectionUtils.getDeclaredMethods(
                   AopUtils.isAopProxy(toolObject) ? AopUtils.getTargetClass(toolObject) : toolObject.getClass()))
             .filter(toolMethod -> toolMethod.isAnnotationPresent(Tool.class))
             .filter(toolMethod -> !isFunctionalType(toolMethod))
             .toList();

          if (toolMethods.isEmpty()) {
             throw new IllegalStateException("No @Tool annotated methods found in " + toolObject + "."
                   + "Did you mean to pass a ToolCallback or ToolCallbackProvider? If so, you have to use .toolCallbacks() instead of .tool()");
          }
       }
    }

    @Override
    public ToolCallback[] getToolCallbacks() {
       var toolCallbacks = this.toolObjects.stream()
          .map(toolObject -> Stream
             .of(ReflectionUtils.getDeclaredMethods(
                   AopUtils.isAopProxy(toolObject) ? AopUtils.getTargetClass(toolObject) : toolObject.getClass()))
             .filter(toolMethod -> toolMethod.isAnnotationPresent(Tool.class))
             .filter(toolMethod -> !isFunctionalType(toolMethod))
             .map(toolMethod -> MethodToolCallback.builder()
                .toolDefinition(ToolDefinitions.from(toolMethod))
                .toolMetadata(ToolMetadata.from(toolMethod))
                .toolMethod(toolMethod)
                .toolObject(toolObject)
                .toolCallResultConverter(ToolUtils.getToolCallResultConverter(toolMethod))
                .build())
             .toArray(ToolCallback[]::new))
          .flatMap(Stream::of)
          .toArray(ToolCallback[]::new);

       validateToolCallbacks(toolCallbacks);

       return toolCallbacks;
    }

    private boolean isFunctionalType(Method toolMethod) {
       var isFunction = ClassUtils.isAssignable(toolMethod.getReturnType(), Function.class)
             || ClassUtils.isAssignable(toolMethod.getReturnType(), Supplier.class)
             || ClassUtils.isAssignable(toolMethod.getReturnType(), Consumer.class);

       if (isFunction) {
          logger.warn("Method {} is annotated with @Tool but returns a functional type. "
                + "This is not supported and the method will be ignored.", toolMethod.getName());
       }

       return isFunction;
    }

    private void validateToolCallbacks(ToolCallback[] toolCallbacks) {
       List<String> duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
       if (!duplicateToolNames.isEmpty()) {
          throw new IllegalStateException("Multiple tools with the same name (%s) found in sources: %s".formatted(
                String.join(", ", duplicateToolNames),
                this.toolObjects.stream().map(o -> o.getClass().getName()).collect(Collectors.joining(", "))));
       }
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private List<Object> toolObjects;

       private Builder() {
       }

       public Builder toolObjects(Object... toolObjects) {
          Assert.notNull(toolObjects, "toolObjects cannot be null");
          this.toolObjects = Arrays.asList(toolObjects);
          return this;
       }

       public MethodToolCallbackProvider build() {
          return new MethodToolCallbackProvider(this.toolObjects);
       }

    }

}
```

### ToolCallbackResolver（工具回调解析器）

为框架提供统一的工具回调解析入口，支持通过工具名查找实际的工具实现，便于解耦工具注册与调用逻辑，适合多工具动态分发场景

```java
package org.springframework.ai.tool.resolution;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.lang.Nullable;

public interface ToolCallbackResolver {

    @Nullable
    ToolCallback resolve(String toolName);

}
```

#### DelegatingToolCallbackResolver

实现工具回调解析的链式委托机制，支持将多个不同来源（如 StaticToolCallbackResolver、SpringBeanToolCallbackResolver 等）的工具回调解析器组合起来，统一对外提供按名称查找 ToolCallback 的能力

```java
package org.springframework.ai.tool.resolution;

import java.util.List;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

public class DelegatingToolCallbackResolver implements ToolCallbackResolver {

    private final List<ToolCallbackResolver> toolCallbackResolvers;

    public DelegatingToolCallbackResolver(List<ToolCallbackResolver> toolCallbackResolvers) {
       Assert.notNull(toolCallbackResolvers, "toolCallbackResolvers cannot be null");
       Assert.noNullElements(toolCallbackResolvers, "toolCallbackResolvers cannot contain null elements");
       this.toolCallbackResolvers = toolCallbackResolvers;
    }

    @Override
    @Nullable
    public ToolCallback resolve(String toolName) {
       Assert.hasText(toolName, "toolName cannot be null or empty");

       for (ToolCallbackResolver toolCallbackResolver : this.toolCallbackResolvers) {
          ToolCallback toolCallback = toolCallbackResolver.resolve(toolName);
          if (toolCallback != null) {
             return toolCallback;
          }
       }
       return null;
    }

}
```

#### StaticToolCallbackResolver

集中管理一组已知的 ToolCallback，通过工具名高效检索对应的 ToolCallback，便于 AI 框架按需调用工具，且实现简单、线程安全

```java
package org.springframework.ai.tool.resolution;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.util.Assert;

public class StaticToolCallbackResolver implements ToolCallbackResolver {

    private static final Logger logger = LoggerFactory.getLogger(StaticToolCallbackResolver.class);

    private final Map<String, ToolCallback> toolCallbacks = new HashMap<>();

    public StaticToolCallbackResolver(List<ToolCallback> toolCallbacks) {
       Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
       Assert.noNullElements(toolCallbacks, "toolCallbacks cannot contain null elements");

       toolCallbacks
          .forEach(toolCallback -> this.toolCallbacks.put(toolCallback.getToolDefinition().name(), toolCallback));
    }

    @Override
    public ToolCallback resolve(String toolName) {
       Assert.hasText(toolName, "toolName cannot be null or empty");
       logger.debug("ToolCallback resolution attempt from static registry");
       return this.toolCallbacks.get(toolName);
    }

}
```

#### SpringBeanToolCallbackResolver

基于 Spring ApplicationContext 的工具回调器，用于从 Spring 容器中按名称检索 bean，并将其包装为 ToolCallback

- `Map<String, ToolCallback> toolCallbacksCache`：静态缓存，存储已解析过的工具回调
- `GenericApplicationContext applicationContext`：Spring 应用上下文，用于查找和获取 bean
- `SchemaType schemaType`：例使用的 schema 类型，决定参数结构描述的生成方式，默认为 JSONSCHEMA

resolve 方法说明

1. 先查缓存，若命中则直接返回
2. 若未命中缓存，则从 Spring 容器查找 bean，推断类型、输入参数类型，生成描述和 schema，构建 ToolCallback 并缓存
3. 若找不到或异常，返回 null

```java
package org.springframework.ai.tool.resolution;

import java.util.HashMap;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import com.fasterxml.jackson.annotation.JsonClassDescription;
import kotlin.jvm.functions.Function0;
import kotlin.jvm.functions.Function1;
import kotlin.jvm.functions.Function2;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.ai.util.json.schema.JsonSchemaGenerator;
import org.springframework.ai.util.json.schema.SchemaType;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Description;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.KotlinDetector;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

public class SpringBeanToolCallbackResolver implements ToolCallbackResolver {

    private static final Logger logger = LoggerFactory.getLogger(SpringBeanToolCallbackResolver.class);

    private static final Map<String, ToolCallback> toolCallbacksCache = new HashMap<>();

    private static final SchemaType DEFAULTSCHEMATYPE = SchemaType.JSONSCHEMA;

    private final GenericApplicationContext applicationContext;

    private final SchemaType schemaType;

    public SpringBeanToolCallbackResolver(GenericApplicationContext applicationContext,
          @Nullable SchemaType schemaType) {
       Assert.notNull(applicationContext, "applicationContext cannot be null");

       this.applicationContext = applicationContext;
       this.schemaType = schemaType != null ? schemaType : DEFAULTSCHEMATYPE;
    }

    @Override
    public ToolCallback resolve(String toolName) {
       Assert.hasText(toolName, "toolName cannot be null or empty");

       logger.debug("ToolCallback resolution attempt from Spring application context");

       ToolCallback resolvedToolCallback = toolCallbacksCache.get(toolName);

       if (resolvedToolCallback != null) {
          return resolvedToolCallback;
       }

       try {
          ResolvableType toolType = TypeResolverHelper.resolveBeanType(this.applicationContext, toolName);
          ResolvableType toolInputType = (ResolvableType.forType(Supplier.class).isAssignableFrom(toolType))
                ? ResolvableType.forType(Void.class) : TypeResolverHelper.getFunctionArgumentType(toolType, 0);

          String toolDescription = resolveToolDescription(toolName, toolInputType.toClass());
          Object bean = this.applicationContext.getBean(toolName);

          resolvedToolCallback = buildToolCallback(toolName, toolType, toolInputType, toolDescription, bean);

          toolCallbacksCache.put(toolName, resolvedToolCallback);

          return resolvedToolCallback;
       }
       catch (Exception e) {
          logger.debug("ToolCallback resolution failed from Spring application context", e);
          return null;
       }
    }

    public SchemaType getSchemaType() {
       return this.schemaType;
    }

    private String resolveToolDescription(String toolName, Class<?> toolInputType) {
       Description descriptionAnnotation = this.applicationContext.findAnnotationOnBean(toolName, Description.class);
       if (descriptionAnnotation != null && StringUtils.hasText(descriptionAnnotation.value())) {
          return descriptionAnnotation.value();
       }

       JsonClassDescription jsonClassDescriptionAnnotation = toolInputType.getAnnotation(JsonClassDescription.class);
       if (jsonClassDescriptionAnnotation != null && StringUtils.hasText(jsonClassDescriptionAnnotation.value())) {
          return jsonClassDescriptionAnnotation.value();
       }

       return ToolUtils.getToolDescriptionFromName(toolName);
    }

    private ToolCallback buildToolCallback(String toolName, ResolvableType toolType, ResolvableType toolInputType,
          String toolDescription, Object bean) {
       if (KotlinDetector.isKotlinPresent()) {
          if (KotlinDelegate.isKotlinFunction(toolType.toClass())) {
             return FunctionToolCallback.builder(toolName, KotlinDelegate.wrapKotlinFunction(bean))
                .description(toolDescription)
                .inputSchema(generateSchema(toolInputType))
                .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
                .build();
          }
          if (KotlinDelegate.isKotlinBiFunction(toolType.toClass())) {
             return FunctionToolCallback.builder(toolName, KotlinDelegate.wrapKotlinBiFunction(bean))
                .description(toolDescription)
                .inputSchema(generateSchema(toolInputType))
                .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
                .build();
          }
          if (KotlinDelegate.isKotlinSupplier(toolType.toClass())) {
             return FunctionToolCallback.builder(toolName, KotlinDelegate.wrapKotlinSupplier(bean))
                .description(toolDescription)
                .inputSchema(generateSchema(toolInputType))
                .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
                .build();
          }
       }

       if (bean instanceof Function<?, ?> function) {
          return FunctionToolCallback.builder(toolName, function)
             .description(toolDescription)
             .inputSchema(generateSchema(toolInputType))
             .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
             .build();
       }
       if (bean instanceof BiFunction<?, ?, ?>) {
          return FunctionToolCallback.builder(toolName, (BiFunction<?, ToolContext, ?>) bean)
             .description(toolDescription)
             .inputSchema(generateSchema(toolInputType))
             .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
             .build();
       }
       if (bean instanceof Supplier<?> supplier) {
          return FunctionToolCallback.builder(toolName, supplier)
             .description(toolDescription)
             .inputSchema(generateSchema(toolInputType))
             .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
             .build();
       }
       if (bean instanceof Consumer<?> consumer) {
          return FunctionToolCallback.builder(toolName, consumer)
             .description(toolDescription)
             .inputSchema(generateSchema(toolInputType))
             .inputType(ParameterizedTypeReference.forType(toolInputType.getType()))
             .build();
       }

       throw new IllegalStateException(
             "Unsupported bean type. Support types: Function, BiFunction, Supplier, Consumer.");
    }

    private String generateSchema(ResolvableType toolInputType) {
       if (this.schemaType == SchemaType.OPENAPISCHEMA) {
          return JsonSchemaGenerator.generateForType(toolInputType.getType(),
                JsonSchemaGenerator.SchemaOption.UPPERCASETYPEVALUES);
       }
       return JsonSchemaGenerator.generateForType(toolInputType.getType());
    }

    public static Builder builder() {
       return new Builder();
    }

    public static class Builder {

       private GenericApplicationContext applicationContext;

       private SchemaType schemaType;

       public Builder applicationContext(GenericApplicationContext applicationContext) {
          this.applicationContext = applicationContext;
          return this;
       }

       public Builder schemaType(SchemaType schemaType) {
          this.schemaType = schemaType;
          return this;
       }

       public SpringBeanToolCallbackResolver build() {
          return new SpringBeanToolCallbackResolver(this.applicationContext, this.schemaType);
       }

    }

    private static final class KotlinDelegate {

       public static boolean isKotlinSupplier(Class<?> clazz) {
          return Function0.class.isAssignableFrom(clazz);
       }

       @SuppressWarnings("unchecked")
       public static Supplier<?> wrapKotlinSupplier(Object bean) {
          return () -> ((Function0<Object>) bean).invoke();
       }

       public static boolean isKotlinFunction(Class<?> clazz) {
          return Function1.class.isAssignableFrom(clazz);
       }

       @SuppressWarnings("unchecked")
       public static Function<?, ?> wrapKotlinFunction(Object bean) {
          return t -> ((Function1<Object, Object>) bean).invoke(t);
       }

       public static boolean isKotlinBiFunction(Class<?> clazz) {
          return Function2.class.isAssignableFrom(clazz);
       }

       @SuppressWarnings("unchecked")
       public static BiFunction<?, ToolContext, ?> wrapKotlinBiFunction(Object bean) {
          return (t, u) -> ((Function2<Object, ToolContext, Object>) bean).invoke(t, u);
       }

    }

}
```

##### TypeResolverHelper

用于在 Spring AI 工具体系中解析函数式接口（如 Function、BiFunction、Supplier、Consumer 及 Kotlin 函数）相关的类型信息，辅助 Spring 容器中 Bean 的类型推断和参数类型获取

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>getConsumerInputClass<br/></td><td>获取 Consumer 的输入参数类型<br/></td></tr>
<tr>
<td>getBiFunctionInputClass<br/></td><td>获取 BiFunction 的第一个输入参数类型<br/></td></tr>
<tr>
<td>getFunctionInputClass<br/></td><td>获取 Function 的输入参数类型<br/></td></tr>
<tr>
<td>getFunctionOutputClass<br/></td><td>获取 Function 的输出参数类型<br/></td></tr>
<tr>
<td>getFunctionArgumentClass<br/></td><td>获取 Function 指定参数索引的类型（如 0 为输入，1 为输出）<br/></td></tr>
<tr>
<td>getBiFunctionArgumentClass<br/></td><td>获取 BiFunction 指定参数索引的类型<br/></td></tr>
<tr>
<td>resolveBeanType<br/></td><td>解析 Spring 容器中指定 bean 的类型，支持直接解析、工厂方法、@Component 等多种情况<br/></td></tr>
<tr>
<td>getFunctionArgumentType<br/></td><td>获取函数类型（支持 Java/Kotlin 各种函数式接口）指定参数的 ResolvableType<br/></td></tr>
</table>


```java
package org.springframework.ai.tool.resolution;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import kotlin.jvm.functions.Function0;
import kotlin.jvm.functions.Function1;
import kotlin.jvm.functions.Function2;

import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.KotlinDetector;
import org.springframework.core.ResolvableType;
import org.springframework.util.Assert;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;


public final class TypeResolverHelper {

    private TypeResolverHelper() {
    }
    
    public static Class<?> getConsumerInputClass(Class<? extends Consumer<?>> consumerClass) {
       ResolvableType resolvableType = ResolvableType.forClass(consumerClass).as(Consumer.class);
       return (resolvableType == ResolvableType.NONE ? Object.class : resolvableType.getGeneric(0).toClass());
    }

    public static Class<?> getBiFunctionInputClass(Class<? extends BiFunction<?, ?, ?>> biFunctionClass) {
       return getBiFunctionArgumentClass(biFunctionClass, 0);
    }

    public static Class<?> getFunctionInputClass(Class<? extends Function<?, ?>> functionClass) {
       return getFunctionArgumentClass(functionClass, 0);
    }
    
    public static Class<?> getFunctionOutputClass(Class<? extends Function<?, ?>> functionClass) {
       return getFunctionArgumentClass(functionClass, 1);
    }

    public static Class<?> getFunctionArgumentClass(Class<? extends Function<?, ?>> functionClass, int argumentIndex) {
       ResolvableType resolvableType = ResolvableType.forClass(functionClass).as(Function.class);
       return (resolvableType == ResolvableType.NONE ? Object.class
             : resolvableType.getGeneric(argumentIndex).toClass());
    }

    public static Class<?> getBiFunctionArgumentClass(Class<? extends BiFunction<?, ?, ?>> biFunctionClass,
          int argumentIndex) {
       ResolvableType resolvableType = ResolvableType.forClass(biFunctionClass).as(BiFunction.class);
       return (resolvableType == ResolvableType.NONE ? Object.class
             : resolvableType.getGeneric(argumentIndex).toClass());
    }

    public static ResolvableType resolveBeanType(GenericApplicationContext applicationContext, String beanName) {
       BeanDefinition beanDefinition = getBeanDefinition(applicationContext, beanName);

       // Try to resolve directly
       ResolvableType functionType = beanDefinition.getResolvableType();
       if (functionType.resolve() != null) {
          return functionType;
       }

       if (beanDefinition instanceof RootBeanDefinition rootBeanDefinition) {
          return resolveRootBeanDefinitionType(applicationContext, rootBeanDefinition);
       }

       return resolveComponentBeanType(applicationContext, beanDefinition, beanName);
    }

    private static BeanDefinition getBeanDefinition(GenericApplicationContext applicationContext, String beanName) {
       try {
          return applicationContext.getBeanDefinition(beanName);
       }
       catch (NoSuchBeanDefinitionException ex) {
          throw new IllegalArgumentException(
                "Functional bean with name " + beanName + " does not exist in the context.");
       }
    }

    private static ResolvableType resolveRootBeanDefinitionType(GenericApplicationContext applicationContext,
          RootBeanDefinition rootBeanDefinition) {

       Class<?> factoryClass;
       boolean isStatic;

       if (rootBeanDefinition.getFactoryBeanName() != null) {
          factoryClass = applicationContext.getBeanFactory().getType(rootBeanDefinition.getFactoryBeanName());
          isStatic = false;
       }
       else {
          factoryClass = rootBeanDefinition.getBeanClass();
          isStatic = true;
       }

       Assert.state(factoryClass != null, "Unresolvable factory class");
       factoryClass = ClassUtils.getUserClass(factoryClass);

       Method uniqueCandidate = findUniqueFactoryMethod(factoryClass, isStatic, rootBeanDefinition);
       rootBeanDefinition.setResolvedFactoryMethod(uniqueCandidate);
       return rootBeanDefinition.getResolvableType();
    }

    private static Method findUniqueFactoryMethod(Class<?> factoryClass, boolean isStatic,
          RootBeanDefinition rootBeanDefinition) {
       Method[] candidates = getCandidateMethods(factoryClass, rootBeanDefinition);
       Method uniqueCandidate = null;

       for (Method candidate : candidates) {
          if ((!isStatic || isStaticCandidate(candidate, factoryClass))
                && rootBeanDefinition.isFactoryMethod(candidate)) {
             if (uniqueCandidate == null) {
                uniqueCandidate = candidate;
             }
             else if (isParamMismatch(uniqueCandidate, candidate)) {
                uniqueCandidate = null;
                break;
             }
          }
       }

       return uniqueCandidate;
    }

    private static ResolvableType resolveComponentBeanType(GenericApplicationContext applicationContext,
          BeanDefinition beanDefinition, String beanName) {
       if (beanDefinition.getFactoryMethodName() == null && beanDefinition.getBeanClassName() != null) {
          try {
             return ResolvableType.forClass(
                   ClassUtils.forName(beanDefinition.getBeanClassName(), applicationContext.getClassLoader()));
          }
          catch (ClassNotFoundException ex) {
             throw new IllegalArgumentException("Impossible to resolve the type of bean " + beanName, ex);
          }
       }
       throw new IllegalArgumentException("Impossible to resolve the type of bean " + beanName);
    }

    static private Method[] getCandidateMethods(Class<?> factoryClass, RootBeanDefinition mbd) {
       return (mbd.isNonPublicAccessAllowed() ? ReflectionUtils.getUniqueDeclaredMethods(factoryClass)
             : factoryClass.getMethods());
    }

    static private boolean isStaticCandidate(Method method, Class<?> factoryClass) {
       return (Modifier.isStatic(method.getModifiers()) && method.getDeclaringClass() == factoryClass);
    }

    static private boolean isParamMismatch(Method uniqueCandidate, Method candidate) {
       int uniqueCandidateParameterCount = uniqueCandidate.getParameterCount();
       int candidateParameterCount = candidate.getParameterCount();
       return (uniqueCandidateParameterCount != candidateParameterCount
             || !Arrays.equals(uniqueCandidate.getParameterTypes(), candidate.getParameterTypes()));
    }

    public static ResolvableType getFunctionArgumentType(ResolvableType functionType, int argumentIndex) {

       Class<?> resolvableClass = functionType.toClass();
       ResolvableType functionArgumentResolvableType = ResolvableType.NONE;

       if (Function.class.isAssignableFrom(resolvableClass)) {
          functionArgumentResolvableType = functionType.as(Function.class);
       }
       else if (BiFunction.class.isAssignableFrom(resolvableClass)) {
          functionArgumentResolvableType = functionType.as(BiFunction.class);
       }
       else if (Supplier.class.isAssignableFrom(resolvableClass)) {
          functionArgumentResolvableType = functionType.as(Supplier.class);
       }
       else if (Consumer.class.isAssignableFrom(resolvableClass)) {
          functionArgumentResolvableType = functionType.as(Consumer.class);
       }
       else if (KotlinDetector.isKotlinPresent()) {
          if (KotlinDelegate.isKotlinFunction(resolvableClass)) {
             functionArgumentResolvableType = KotlinDelegate.adaptToKotlinFunctionType(functionType);
          }
          else if (KotlinDelegate.isKotlinBiFunction(resolvableClass)) {
             functionArgumentResolvableType = KotlinDelegate.adaptToKotlinBiFunctionType(functionType);
          }
          else if (KotlinDelegate.isKotlinSupplier(resolvableClass)) {
             functionArgumentResolvableType = KotlinDelegate.adaptToKotlinSupplierType(functionType);
          }
       }

       if (functionArgumentResolvableType == ResolvableType.NONE) {
          throw new IllegalArgumentException(
                "Type must be a Function, BiFunction, Function1 or Function2. Found: " + functionType);
       }

       return functionArgumentResolvableType.getGeneric(argumentIndex);
    }

    private static final class KotlinDelegate {

       public static boolean isKotlinSupplier(Class<?> clazz) {
          return Function0.class.isAssignableFrom(clazz);
       }

       public static ResolvableType adaptToKotlinSupplierType(ResolvableType resolvableType) {
          return resolvableType.as(Function0.class);
       }

       public static boolean isKotlinFunction(Class<?> clazz) {
          return Function1.class.isAssignableFrom(clazz);
       }

       public static ResolvableType adaptToKotlinFunctionType(ResolvableType resolvableType) {
          return resolvableType.as(Function1.class);
       }

       public static boolean isKotlinBiFunction(Class<?> clazz) {
          return Function2.class.isAssignableFrom(clazz);
       }

       public static ResolvableType adaptToKotlinBiFunctionType(ResolvableType resolvableType) {
          return resolvableType.as(Function2.class);
       }

    }

}
```

### ToolCallingManager（工具管理器）

该接口用于管理聊天模型的工具调用流程

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>resolveToolDefinitions<br/></td><td>根据模型的工具调用选项，解析出可用的工具定义列表<br/></td></tr>
<tr>
<td>executeToolCalls<br/></td><td>根据模型的响应，实际执行所请求的工具调用，并返回执行结果<br/></td></tr>
<tr>
<td>builder<br/></td><td>提供默认实现的构建器<br/></td></tr>
</table>


```java
package org.springframework.ai.model.tool;

import java.util.List;

import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.tool.definition.ToolDefinition;

public interface ToolCallingManager {

    List<ToolDefinition> resolveToolDefinitions(ToolCallingChatOptions chatOptions);

    ToolExecutionResult executeToolCalls(Prompt prompt, ChatResponse chatResponse);

    static DefaultToolCallingManager.Builder builder() {
       return DefaultToolCallingManager.builder();
    }

}
```

#### DefaultToolCallingManager

ToolCallingManager 的默认实现类，负责管理 AI 聊天模型的工具调用流程，包括工具定义的解析、工具调用的执行、异常处理和观测埋点等

- `ObservationRegistry observationRegistry`：观测注册表，用于埋点和监控工具调用过程
- `ToolCallbackResolver toolCallbackResolver`：具回调解析器，根据工具名查找对应的 ToolCallback 实例
- `ToolExecutionExceptionProcessor toolExecutionExceptionProcessor`：工具执行异常处理器，负责将工具调用异常转为可返回的结果
- `ToolCallingObservationConvention observationConvention`：工具调用观测约定，定义观测数据的结构和内容

<table>
<tr>
<td>方法名称<br/></td>
<td>描述<br/></td>
</tr>
<tr>
<td>resolveToolDefinitions<br/></td>
<td>解析并返回当前会话可用的工具定义列表<br/></td>
</tr>
<tr>
<td>executeToolCalls<br/></td>
<td>
一. 提取工具调用请求：从 chatResponse 的结果中查找包含工具调用（toolCalls）的 Generation；<br/>
二. 构建ToolContext：根据 prompt 和提取到的 AssistantMessage 构建工具上下文（ToolContext），包含上下文参数和对话历史；<br/>
三. 执行工具调用：调用私有方法 executeToolCall，对每个工具以此调用；<br/>
1. 获取请求时的ToolCallback列表：若Prompt 的 options 是 ToolCallingChatOptions，则取出其中的工具回调列表（toolCallbacks），否则为空列表；<br/>	
2. 遍历所有工具调用请求：对 AssistantMessage 中的每个 ToolCall 依次处理；<br/>
1). 查找对应的 ToolCallback：先在 toolCallbacks 里按名称查找，找不到则用 toolCallbackResolver 解析；<br/>
2). 处理 returnDirect：第一次取当前工具的 returnDirect，后续与前面结果做 AND，确保所有工具都要求 returnDirect 才为 true；<br/>
3). 构建观测上下文：用工具定义、元数据、调用参数构建 ToolCallingObservationContext，用于埋点观测；<br/>		
4) 执行工具调用并观测：通过 observation.observe 执行工具回调（toolCallback.call），如有异常则用异常处理器处理，并将结果写入观测上下文；<br/>		
5). 收集响应：将每个工具调用的结果封装为 ToolResponseMessage.ToolResponse，加入响应列表；<br/>	
3. 结果返回：将每个工具调用的结果封装为 ToolResponseMessage.ToolResponse，加入响应列表；<br/>
四. 构建新的对话历史：将原有对话、助手消息和工具响应消息合并，形成新的对话历史；<br/>
五. 结果返回：返回 ToolExecutionResult，包含新的对话历史和 returnDirect 标志；<br/>
</td>
</tr>
<tr>
<td>setObservationConvention<br/></td>
<td>设置自定义的观测约定<br/></td>
</tr>
</table>


```java
package org.springframework.ai.model.tool;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.execution.DefaultToolExecutionExceptionProcessor;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor;
import org.springframework.ai.tool.observation.DefaultToolCallingObservationConvention;
import org.springframework.ai.tool.observation.ToolCallingObservationContext;
import org.springframework.ai.tool.observation.ToolCallingObservationConvention;
import org.springframework.ai.tool.observation.ToolCallingObservationDocumentation;
import org.springframework.ai.tool.resolution.DelegatingToolCallbackResolver;
import org.springframework.ai.tool.resolution.ToolCallbackResolver;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;

public final class DefaultToolCallingManager implements ToolCallingManager {

    private static final Logger logger = LoggerFactory.getLogger(DefaultToolCallingManager.class);

    private static final ObservationRegistry DEFAULTOBSERVATIONREGISTRY
          = ObservationRegistry.NOOP;

    private static final ToolCallingObservationConvention DEFAULTOBSERVATIONCONVENTION
          = new DefaultToolCallingObservationConvention();

    private static final ToolCallbackResolver DEFAULTTOOLCALLBACKRESOLVER
          = new DelegatingToolCallbackResolver(List.of());

    private static final ToolExecutionExceptionProcessor DEFAULTTOOLEXECUTIONEXCEPTIONPROCESSOR
          = DefaultToolExecutionExceptionProcessor.builder().build();

    private final ObservationRegistry observationRegistry;

    private final ToolCallbackResolver toolCallbackResolver;

    private final ToolExecutionExceptionProcessor toolExecutionExceptionProcessor;

    private ToolCallingObservationConvention observationConvention = DEFAULTOBSERVATIONCONVENTION;

    public DefaultToolCallingManager(ObservationRegistry observationRegistry, ToolCallbackResolver toolCallbackResolver,
          ToolExecutionExceptionProcessor toolExecutionExceptionProcessor) {
       Assert.notNull(observationRegistry, "observationRegistry cannot be null");
       Assert.notNull(toolCallbackResolver, "toolCallbackResolver cannot be null");
       Assert.notNull(toolExecutionExceptionProcessor, "toolCallExceptionConverter cannot be null");

       this.observationRegistry = observationRegistry;
       this.toolCallbackResolver = toolCallbackResolver;
       this.toolExecutionExceptionProcessor = toolExecutionExceptionProcessor;
    }

    @Override
    public List<ToolDefinition> resolveToolDefinitions(ToolCallingChatOptions chatOptions) {
       Assert.notNull(chatOptions, "chatOptions cannot be null");

       List<ToolCallback> toolCallbacks = new ArrayList<>(chatOptions.getToolCallbacks());
       for (String toolName : chatOptions.getToolNames()) {
          // Skip the tool if it is already present in the request toolCallbacks.
          // That might happen if a tool is defined in the options
          // both as a ToolCallback and as a tool name.
          if (chatOptions.getToolCallbacks()
             .stream()
             .anyMatch(tool -> tool.getToolDefinition().name().equals(toolName))) {
             continue;
          }
          ToolCallback toolCallback = this.toolCallbackResolver.resolve(toolName);
          if (toolCallback == null) {
             throw new IllegalStateException("No ToolCallback found for tool name: " + toolName);
          }
          toolCallbacks.add(toolCallback);
       }

       return toolCallbacks.stream().map(ToolCallback::getToolDefinition).toList();
    }

    @Override
    public ToolExecutionResult executeToolCalls(Prompt prompt, ChatResponse chatResponse) {
       Assert.notNull(prompt, "prompt cannot be null");
       Assert.notNull(chatResponse, "chatResponse cannot be null");

       Optional<Generation> toolCallGeneration = chatResponse.getResults()
          .stream()
          .filter(g -> !CollectionUtils.isEmpty(g.getOutput().getToolCalls()))
          .findFirst();

       if (toolCallGeneration.isEmpty()) {
          throw new IllegalStateException("No tool call requested by the chat model");
       }

       AssistantMessage assistantMessage = toolCallGeneration.get().getOutput();

       ToolContext toolContext = buildToolContext(prompt, assistantMessage);

       InternalToolExecutionResult internalToolExecutionResult = executeToolCall(prompt, assistantMessage,
             toolContext);

       List<Message> conversationHistory = buildConversationHistoryAfterToolExecution(prompt.getInstructions(),
             assistantMessage, internalToolExecutionResult.toolResponseMessage());

       return ToolExecutionResult.builder()
          .conversationHistory(conversationHistory)
          .returnDirect(internalToolExecutionResult.returnDirect())
          .build();
    }

    private static ToolContext buildToolContext(Prompt prompt, AssistantMessage assistantMessage) {
       Map<String, Object> toolContextMap = Map.of();

       if (prompt.getOptions() instanceof ToolCallingChatOptions toolCallingChatOptions
             && !CollectionUtils.isEmpty(toolCallingChatOptions.getToolContext())) {
          toolContextMap = new HashMap<>(toolCallingChatOptions.getToolContext());

          List<Message> messageHistory = new ArrayList<>(prompt.copy().getInstructions());
          messageHistory.add(new AssistantMessage(assistantMessage.getText(), assistantMessage.getMetadata(),
                assistantMessage.getToolCalls()));

          toolContextMap.put(ToolContext.TOOLCALLHISTORY,
                buildConversationHistoryBeforeToolExecution(prompt, assistantMessage));
       }

       return new ToolContext(toolContextMap);
    }

    private static List<Message> buildConversationHistoryBeforeToolExecution(Prompt prompt,
          AssistantMessage assistantMessage) {
       List<Message> messageHistory = new ArrayList<>(prompt.copy().getInstructions());
       messageHistory.add(new AssistantMessage(assistantMessage.getText(), assistantMessage.getMetadata(),
             assistantMessage.getToolCalls()));
       return messageHistory;
    }

    /**
     * Execute the tool call and return the response message.
     */
    private InternalToolExecutionResult executeToolCall(Prompt prompt, AssistantMessage assistantMessage,
          ToolContext toolContext) {
       List<ToolCallback> toolCallbacks = List.of();
       if (prompt.getOptions() instanceof ToolCallingChatOptions toolCallingChatOptions) {
          toolCallbacks = toolCallingChatOptions.getToolCallbacks();
       }

       List<ToolResponseMessage.ToolResponse> toolResponses = new ArrayList<>();

       Boolean returnDirect = null;

       for (AssistantMessage.ToolCall toolCall : assistantMessage.getToolCalls()) {

          logger.debug("Executing tool call: {}", toolCall.name());

          String toolName = toolCall.name();
          String toolInputArguments = toolCall.arguments();

          ToolCallback toolCallback = toolCallbacks.stream()
             .filter(tool -> toolName.equals(tool.getToolDefinition().name()))
             .findFirst()
             .orElseGet(() -> this.toolCallbackResolver.resolve(toolName));

          if (toolCallback == null) {
             throw new IllegalStateException("No ToolCallback found for tool name: " + toolName);
          }

          if (returnDirect == null) {
             returnDirect = toolCallback.getToolMetadata().returnDirect();
          }
          else {
             returnDirect = returnDirect && toolCallback.getToolMetadata().returnDirect();
          }

          ToolCallingObservationContext observationContext = ToolCallingObservationContext.builder()
             .toolDefinition(toolCallback.getToolDefinition())
             .toolMetadata(toolCallback.getToolMetadata())
             .toolCallArguments(toolInputArguments)
             .build();

          String toolCallResult = ToolCallingObservationDocumentation.TOOLCALL
             .observation(this.observationConvention, DEFAULTOBSERVATIONCONVENTION, () -> observationContext,
                   this.observationRegistry)
             .observe(() -> {
                String toolResult;
                try {
                   toolResult = toolCallback.call(toolInputArguments, toolContext);
                }
                catch (ToolExecutionException ex) {
                   toolResult = this.toolExecutionExceptionProcessor.process(ex);
                }
                observationContext.setToolCallResult(toolResult);
                return toolResult;
             });

          toolResponses.add(new ToolResponseMessage.ToolResponse(toolCall.id(), toolName,
                toolCallResult != null ? toolCallResult : ""));
       }

       return new InternalToolExecutionResult(new ToolResponseMessage(toolResponses, Map.of()), returnDirect);
    }

    private List<Message> buildConversationHistoryAfterToolExecution(List<Message> previousMessages,
          AssistantMessage assistantMessage, ToolResponseMessage toolResponseMessage) {
       List<Message> messages = new ArrayList<>(previousMessages);
       messages.add(assistantMessage);
       messages.add(toolResponseMessage);
       return messages;
    }

    public void setObservationConvention(ToolCallingObservationConvention observationConvention) {
       this.observationConvention = observationConvention;
    }

    public static Builder builder() {
       return new Builder();
    }

    private record InternalToolExecutionResult(ToolResponseMessage toolResponseMessage, boolean returnDirect) {
    }

    public final static class Builder {

       private ObservationRegistry observationRegistry = DEFAULTOBSERVATIONREGISTRY;

       private ToolCallbackResolver toolCallbackResolver = DEFAULTTOOLCALLBACKRESOLVER;

       private ToolExecutionExceptionProcessor toolExecutionExceptionProcessor = DEFAULTTOOLEXECUTIONEXCEPTIONPROCESSOR;

       private Builder() {
       }

       public Builder observationRegistry(ObservationRegistry observationRegistry) {
          this.observationRegistry = observationRegistry;
          return this;
       }

       public Builder toolCallbackResolver(ToolCallbackResolver toolCallbackResolver) {
          this.toolCallbackResolver = toolCallbackResolver;
          return this;
       }

       public Builder toolExecutionExceptionProcessor(
             ToolExecutionExceptionProcessor toolExecutionExceptionProcessor) {
          this.toolExecutionExceptionProcessor = toolExecutionExceptionProcessor;
          return this;
       }

       public DefaultToolCallingManager build() {
          return new DefaultToolCallingManager(this.observationRegistry, this.toolCallbackResolver,
                this.toolExecutionExceptionProcessor);
       }

    }

}
```

### ToolExecutionResult（工具执行结果）

该接口用于表示一次工具调用后的执行结果，统一封装工具执行后的对话历史和返回策略

- `String FINISHREASON`：标识工具执行完成的原因
- `String METADATATOOLID`：工具调用的唯一标识
- `String METADATATOOLNAME`：工具名称

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>conversationHistory<br/></td><td>获取包含工具执行结果在内的完整对话历史，便于后续上下文处理或直接返回给客户端<br/></td></tr>
<tr>
<td>returnDirect<br/></td><td>标识工具执行结果是否应直接返回给用户（true），还是继续传递给大模型进一步处理（false）。默认返回 false<br/></td></tr>
<tr>
<td>builder<br/></td><td>获取默认实现的构建器，便于链式构建 ToolExecutionResult 实例<br/></td></tr>
<tr>
<td>buildGenerations<br/></td><td>将工具执行结果转换为 Generation 列表，方便直接发送给客户端或用于后续处理。会提取最后一条 ToolResponseMessage 并生成对应的 Generation<br/></td></tr>
</table>


```java
package org.springframework.ai.model.tool;

import java.util.ArrayList;
import java.util.List;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.metadata.ChatGenerationMetadata;
import org.springframework.ai.chat.model.Generation;

public interface ToolExecutionResult {

    String FINISHREASON = "returnDirect";

    String METADATATOOLID = "toolId";

    String METADATATOOLNAME = "toolName";
    
    List<Message> conversationHistory();

    default boolean returnDirect() {
       return false;
    }

    static DefaultToolExecutionResult.Builder builder() {
       return DefaultToolExecutionResult.builder();
    }

    static List<Generation> buildGenerations(ToolExecutionResult toolExecutionResult) {
       List<Message> conversationHistory = toolExecutionResult.conversationHistory();
       List<Generation> generations = new ArrayList<>();
       if (conversationHistory
          .get(conversationHistory.size() - 1) instanceof ToolResponseMessage toolResponseMessage) {
          toolResponseMessage.getResponses().forEach(response -> {
             AssistantMessage assistantMessage = new AssistantMessage(response.responseData());
             Generation generation = new Generation(assistantMessage,
                   ChatGenerationMetadata.builder()
                      .metadata(METADATATOOLID, response.id())
                      .metadata(METADATATOOLNAME, response.name())
                      .finishReason(FINISHREASON)
                      .build());
             generations.add(generation);
          });
       }
       return generations;
    }

}
```

#### DefaultToolExecutionResult

```java
package org.springframework.ai.model.tool;

import java.util.List;

import org.springframework.ai.chat.messages.Message;
import org.springframework.util.Assert;

public record DefaultToolExecutionResult(List<Message> conversationHistory,
       boolean returnDirect) implements ToolExecutionResult {

    public DefaultToolExecutionResult {
       Assert.notNull(conversationHistory, "conversationHistory cannot be null");
       Assert.noNullElements(conversationHistory, "conversationHistory cannot contain null elements");
    }

    public static Builder builder() {
       return new Builder();
    }

    public static final class Builder {

       private List<Message> conversationHistory = List.of();

       private boolean returnDirect;

       private Builder() {
       }

       public Builder conversationHistory(List<Message> conversationHistory) {
          this.conversationHistory = conversationHistory;
          return this;
       }

       public Builder returnDirect(boolean returnDirect) {
          this.returnDirect = returnDirect;
          return this;
       }

       public DefaultToolExecutionResult build() {
          return new DefaultToolExecutionResult(this.conversationHistory, this.returnDirect);
       }

    }

}
```

### ToolCallingChatOptions（工具会话选项）

该接口用于配置与 ChatModel 交互时的工具调用相关选项

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>getToolCallbacks / setToolCallbacks<br/></td><td>获取 / 设置当前注册的ToolCallbacks<br/></td></tr>
<tr>
<td>getToolNames / setToolNames<br/></td><td>获取 / 设置注册到模型的工具名称<br/></td></tr>
<tr>
<td>getInternalToolExecutionEnabled / setInternalToolExecutionEnabled<br/></td><td>获取 /设置工具执行方式<br/></td></tr>
<tr>
<td>getToolContext / setToolContext<br/></td><td>获取 / 设置工具调用时的上下文参数<br/></td></tr>
<tr>
<td>mergeToolCallbacks<br/></td><td>合并运行时和默认的工具回调列表<br/></td></tr>
<tr>
<td>mergeToolNames<br/></td><td>合并运行时和默认的工具名集合<br/></td></tr>
<tr>
<td>mergeToolContext<br/></td><td>合并运行时和默认的工具上下文参数<br/></td></tr>
<tr>
<td>validateToolCallbacks<br/></td><td>校验工具回调列表中是否有重名工具<br/></td></tr>
<tr>
<td>builder<br/></td><td>获取构建器，便于链式配置各项参数<br/></td></tr>
</table>


```java
package org.springframework.ai.model.tool;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.support.ToolUtils;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;

public interface ToolCallingChatOptions extends ChatOptions {

    boolean DEFAULTTOOLEXECUTIONENABLED = true;
    
    List<ToolCallback> getToolCallbacks();
    
    void setToolCallbacks(List<ToolCallback> toolCallbacks);

    Set<String> getToolNames();

    void setToolNames(Set<String> toolNames);

    @Nullable
    Boolean getInternalToolExecutionEnabled();

    void setInternalToolExecutionEnabled(@Nullable Boolean internalToolExecutionEnabled);

    Map<String, Object> getToolContext();
    
    void setToolContext(Map<String, Object> toolContext);

    static Builder builder() {
       return new DefaultToolCallingChatOptions.Builder();
    }

    static boolean isInternalToolExecutionEnabled(ChatOptions chatOptions) {
       Assert.notNull(chatOptions, "chatOptions cannot be null");
       boolean internalToolExecutionEnabled;
       if (chatOptions instanceof ToolCallingChatOptions toolCallingChatOptions
             && toolCallingChatOptions.getInternalToolExecutionEnabled() != null) {
          internalToolExecutionEnabled = Boolean.TRUE
             .equals(toolCallingChatOptions.getInternalToolExecutionEnabled());
       }
       else {
          internalToolExecutionEnabled = DEFAULTTOOLEXECUTIONENABLED;
       }
       return internalToolExecutionEnabled;
    }

    static Set<String> mergeToolNames(Set<String> runtimeToolNames, Set<String> defaultToolNames) {
       Assert.notNull(runtimeToolNames, "runtimeToolNames cannot be null");
       Assert.notNull(defaultToolNames, "defaultToolNames cannot be null");
       if (CollectionUtils.isEmpty(runtimeToolNames)) {
          return new HashSet<>(defaultToolNames);
       }
       return new HashSet<>(runtimeToolNames);
    }

    static List<ToolCallback> mergeToolCallbacks(List<ToolCallback> runtimeToolCallbacks,
          List<ToolCallback> defaultToolCallbacks) {
       Assert.notNull(runtimeToolCallbacks, "runtimeToolCallbacks cannot be null");
       Assert.notNull(defaultToolCallbacks, "defaultToolCallbacks cannot be null");
       if (CollectionUtils.isEmpty(runtimeToolCallbacks)) {
          return new ArrayList<>(defaultToolCallbacks);
       }
       return new ArrayList<>(runtimeToolCallbacks);
    }

    static Map<String, Object> mergeToolContext(Map<String, Object> runtimeToolContext,
          Map<String, Object> defaultToolContext) {
       Assert.notNull(runtimeToolContext, "runtimeToolContext cannot be null");
       Assert.noNullElements(runtimeToolContext.keySet(), "runtimeToolContext keys cannot be null");
       Assert.notNull(defaultToolContext, "defaultToolContext cannot be null");
       Assert.noNullElements(defaultToolContext.keySet(), "defaultToolContext keys cannot be null");
       var mergedToolContext = new HashMap<>(defaultToolContext);
       mergedToolContext.putAll(runtimeToolContext);
       return mergedToolContext;
    }

    static void validateToolCallbacks(List<ToolCallback> toolCallbacks) {
       List<String> duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
       if (!duplicateToolNames.isEmpty()) {
          throw new IllegalStateException("Multiple tools with the same name (%s) found in ToolCallingChatOptions"
             .formatted(String.join(", ", duplicateToolNames)));
       }
    }

    interface Builder extends ChatOptions.Builder {

       Builder toolCallbacks(List<ToolCallback> toolCallbacks);

       Builder toolCallbacks(ToolCallback... toolCallbacks);

       Builder toolNames(Set<String> toolNames);

       Builder toolNames(String... toolNames);

       Builder internalToolExecutionEnabled(@Nullable Boolean internalToolExecutionEnabled);

       Builder toolContext(Map<String, Object> context);

       Builder toolContext(String key, Object value);

       // ChatOptions.Builder methods

       @Override
       Builder model(@Nullable String model);

       @Override
       Builder frequencyPenalty(@Nullable Double frequencyPenalty);

       @Override
       Builder maxTokens(@Nullable Integer maxTokens);

       @Override
       Builder presencePenalty(@Nullable Double presencePenalty);

       @Override
       Builder stopSequences(@Nullable List<String> stopSequences);

       @Override
       Builder temperature(@Nullable Double temperature);

       @Override
       Builder topK(@Nullable Integer topK);

       @Override
       Builder topP(@Nullable Double topP);

       @Override
       ToolCallingChatOptions build();

    }

}
```

#### DefaultToolCallingChatOptions

ToolCallingChatOptions 接口类的默认实现

```java
package org.springframework.ai.model.tool;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

public class DefaultToolCallingChatOptions implements ToolCallingChatOptions {

    private List<ToolCallback> toolCallbacks = new ArrayList<>();

    private Set<String> toolNames = new HashSet<>();

    private Map<String, Object> toolContext = new HashMap<>();

    @Nullable
    private Boolean internalToolExecutionEnabled;

    @Nullable
    private String model;

    @Nullable
    private Double frequencyPenalty;

    @Nullable
    private Integer maxTokens;

    @Nullable
    private Double presencePenalty;

    @Nullable
    private List<String> stopSequences;

    @Nullable
    private Double temperature;

    @Nullable
    private Integer topK;

    @Nullable
    private Double topP;

    @Override
    public List<ToolCallback> getToolCallbacks() {
       return List.copyOf(this.toolCallbacks);
    }

    @Override
    public void setToolCallbacks(List<ToolCallback> toolCallbacks) {
       Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
       Assert.noNullElements(toolCallbacks, "toolCallbacks cannot contain null elements");
       this.toolCallbacks = new ArrayList<>(toolCallbacks);
    }

    @Override
    public Set<String> getToolNames() {
       return Set.copyOf(this.toolNames);
    }

    @Override
    public void setToolNames(Set<String> toolNames) {
       Assert.notNull(toolNames, "toolNames cannot be null");
       Assert.noNullElements(toolNames, "toolNames cannot contain null elements");
       toolNames.forEach(toolName -> Assert.hasText(toolName, "toolNames cannot contain empty elements"));
       this.toolNames = new HashSet<>(toolNames);
    }

    @Override
    public Map<String, Object> getToolContext() {
       return Map.copyOf(this.toolContext);
    }

    @Override
    public void setToolContext(Map<String, Object> toolContext) {
       Assert.notNull(toolContext, "toolContext cannot be null");
       Assert.noNullElements(toolContext.keySet(), "toolContext cannot contain null keys");
       this.toolContext = new HashMap<>(toolContext);
    }

    @Override
    @Nullable
    public Boolean getInternalToolExecutionEnabled() {
       return this.internalToolExecutionEnabled;
    }

    @Override
    public void setInternalToolExecutionEnabled(@Nullable Boolean internalToolExecutionEnabled) {
       this.internalToolExecutionEnabled = internalToolExecutionEnabled;
    }

    @Override
    @Nullable
    public String getModel() {
       return this.model;
    }

    public void setModel(@Nullable String model) {
       this.model = model;
    }

    @Override
    @Nullable
    public Double getFrequencyPenalty() {
       return this.frequencyPenalty;
    }

    public void setFrequencyPenalty(@Nullable Double frequencyPenalty) {
       this.frequencyPenalty = frequencyPenalty;
    }

    @Override
    @Nullable
    public Integer getMaxTokens() {
       return this.maxTokens;
    }

    public void setMaxTokens(@Nullable Integer maxTokens) {
       this.maxTokens = maxTokens;
    }

    @Override
    @Nullable
    public Double getPresencePenalty() {
       return this.presencePenalty;
    }

    public void setPresencePenalty(@Nullable Double presencePenalty) {
       this.presencePenalty = presencePenalty;
    }

    @Override
    @Nullable
    public List<String> getStopSequences() {
       return this.stopSequences;
    }

    public void setStopSequences(@Nullable List<String> stopSequences) {
       this.stopSequences = stopSequences;
    }

    @Override
    @Nullable
    public Double getTemperature() {
       return this.temperature;
    }

    public void setTemperature(@Nullable Double temperature) {
       this.temperature = temperature;
    }

    @Override
    @Nullable
    public Integer getTopK() {
       return this.topK;
    }

    public void setTopK(@Nullable Integer topK) {
       this.topK = topK;
    }

    @Override
    @Nullable
    public Double getTopP() {
       return this.topP;
    }

    public void setTopP(@Nullable Double topP) {
       this.topP = topP;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T extends ChatOptions> T copy() {
       DefaultToolCallingChatOptions options = new DefaultToolCallingChatOptions();
       options.setToolCallbacks(getToolCallbacks());
       options.setToolNames(getToolNames());
       options.setToolContext(getToolContext());
       options.setInternalToolExecutionEnabled(getInternalToolExecutionEnabled());
       options.setModel(getModel());
       options.setFrequencyPenalty(getFrequencyPenalty());
       options.setMaxTokens(getMaxTokens());
       options.setPresencePenalty(getPresencePenalty());
       options.setStopSequences(getStopSequences());
       options.setTemperature(getTemperature());
       options.setTopK(getTopK());
       options.setTopP(getTopP());
       return (T) options;
    }

    public static Builder builder() {
       return new Builder();
    }

    /**
     * Default implementation of {@link ToolCallingChatOptions.Builder}.
     */
    public static class Builder implements ToolCallingChatOptions.Builder {

       private final DefaultToolCallingChatOptions options = new DefaultToolCallingChatOptions();

       @Override
       public ToolCallingChatOptions.Builder toolCallbacks(List<ToolCallback> toolCallbacks) {
          this.options.setToolCallbacks(toolCallbacks);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder toolCallbacks(ToolCallback... toolCallbacks) {
          Assert.notNull(toolCallbacks, "toolCallbacks cannot be null");
          this.options.setToolCallbacks(Arrays.asList(toolCallbacks));
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder toolNames(Set<String> toolNames) {
          this.options.setToolNames(toolNames);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder toolNames(String... toolNames) {
          Assert.notNull(toolNames, "toolNames cannot be null");
          this.options.setToolNames(Set.of(toolNames));
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder toolContext(Map<String, Object> context) {
          this.options.setToolContext(context);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder toolContext(String key, Object value) {
          Assert.hasText(key, "key cannot be null");
          Assert.notNull(value, "value cannot be null");
          Map<String, Object> updatedToolContext = new HashMap<>(this.options.getToolContext());
          updatedToolContext.put(key, value);
          this.options.setToolContext(updatedToolContext);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder internalToolExecutionEnabled(
             @Nullable Boolean internalToolExecutionEnabled) {
          this.options.setInternalToolExecutionEnabled(internalToolExecutionEnabled);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder model(@Nullable String model) {
          this.options.setModel(model);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder frequencyPenalty(@Nullable Double frequencyPenalty) {
          this.options.setFrequencyPenalty(frequencyPenalty);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder maxTokens(@Nullable Integer maxTokens) {
          this.options.setMaxTokens(maxTokens);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder presencePenalty(@Nullable Double presencePenalty) {
          this.options.setPresencePenalty(presencePenalty);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder stopSequences(@Nullable List<String> stopSequences) {
          this.options.setStopSequences(stopSequences);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder temperature(@Nullable Double temperature) {
          this.options.setTemperature(temperature);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder topK(@Nullable Integer topK) {
          this.options.setTopK(topK);
          return this;
       }

       @Override
       public ToolCallingChatOptions.Builder topP(@Nullable Double topP) {
          this.options.setTopP(topP);
          return this;
       }

       @Override
       public ToolCallingChatOptions build() {
          return this.options;
       }

    }

}
```

### ToolExecutionEligibilityPredicate（工具执行判断器）

作为一个函数式接口，用于根据对话选项和模型响应，灵活判断是否需要执行工具调用

```java
package org.springframework.ai.model.tool;

import java.util.function.BiPredicate;

import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.util.Assert;

public interface ToolExecutionEligibilityPredicate extends BiPredicate<ChatOptions, ChatResponse> {

    default boolean isToolExecutionRequired(ChatOptions promptOptions, ChatResponse chatResponse) {
       Assert.notNull(promptOptions, "promptOptions cannot be null");
       Assert.notNull(chatResponse, "chatResponse cannot be null");
       return test(promptOptions, chatResponse);
    }

}
```

#### DefaultToolExecutionEligibilityPredicate

ToolExecutionEligibilityPredicate 的默认实现，主要根据 promptOptions 是否启用了内部工具执行 && chatResponse 是否非空且包含工具调用

```java
package org.springframework.ai.model.tool;

import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;

public class DefaultToolExecutionEligibilityPredicate implements ToolExecutionEligibilityPredicate {

    @Override
    public boolean test(ChatOptions promptOptions, ChatResponse chatResponse) {
       return ToolCallingChatOptions.isInternalToolExecutionEnabled(promptOptions) && chatResponse != null
             && chatResponse.hasToolCalls();
    }

}
```

### ToolCallResultConverter（工具结果转换器）

函数式接口，主要用于将工具（Tool）调用的结果对象转换为可以返回给 AI 模型的字符串格式

```java
package org.springframework.ai.tool.execution;

import java.lang.reflect.Type;

import org.springframework.lang.Nullable;

@FunctionalInterface
public interface ToolCallResultConverter {

    String convert(@Nullable Object result, @Nullable Type returnType);

}
```

#### DefaultToolCallResultConverter

ToolCallResultConverter 的默认实现，统一处理工具调用结果的序列化，确保各种类型的返回值都能被正确转换为字符串，便于 AI 模型理解和处理

convert 核心逻辑

1. `无返回值（Void.TYPE）`：工具声明的返回类型为 void，则返回 "Done" 的 JSON 字符串，表示操作已完成
2. `图片类型（RenderedImage）`：若工具返回结果是图片（如 RenderedImage），会将图片编码为 PNG 格式的字节流，再转为 base64 字符串，并以 JSON 形式返回（包含 mimeType 和 data 字段）
3. `其他类型`：直接使用 JsonParser 序列化为 JSON 字符串

```java
package org.springframework.ai.tool.execution;

import java.awt.image.RenderedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.Base64;
import java.util.Map;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.ai.util.json.JsonParser;
import org.springframework.lang.Nullable;

public final class DefaultToolCallResultConverter implements ToolCallResultConverter {

    private static final Logger logger = LoggerFactory.getLogger(DefaultToolCallResultConverter.class);

    @Override
    public String convert(@Nullable Object result, @Nullable Type returnType) {
       if (returnType == Void.TYPE) {
          logger.debug("The tool has no return type. Converting to conventional response.");
          return JsonParser.toJson("Done");
       }
       if (result instanceof RenderedImage) {
          final var buf = new ByteArrayOutputStream(1024 * 4);
          try {
             ImageIO.write((RenderedImage) result, "PNG", buf);
          }
          catch (IOException e) {
             return "Failed to convert tool result to a base64 image: " + e.getMessage();
          }
          final var imgB64 = Base64.getEncoder().encodeToString(buf.toByteArray());
          return JsonParser.toJson(Map.of("mimeType", "image/png", "data", imgB64));
       }
       else {
          logger.debug("Converting tool result to JSON.");
          return JsonParser.toJson(result);
       }
    }

}
```

### ToolExecutionExceptionProcessor（工具执行异常处理器）

函数式接口，主要用于处理工具执行过程中抛出的 ToolExecutionException 异常

```java
package org.springframework.ai.tool.execution;

@FunctionalInterface
public interface ToolExecutionExceptionProcessor {

    String process(ToolExecutionException exception);

}
```

#### DefaultToolExecutionExceptionProcessor

ToolExecutionExceptionProcessor 的默认实现类

- `boolean alwaysThrow`：若为 true，遇到异常时直接抛出，由上层调用方处理；如果为 false（默认），则将异常信息（message）转换为字符串返回，通常用于反馈给 AI 模型

```java
package org.springframework.ai.tool.execution;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.util.Assert;

public class DefaultToolExecutionExceptionProcessor implements ToolExecutionExceptionProcessor {

    private final static Logger logger = LoggerFactory.getLogger(DefaultToolExecutionExceptionProcessor.class);

    private static final boolean DEFAULTALWAYSTHROW = false;

    private final boolean alwaysThrow;

    public DefaultToolExecutionExceptionProcessor(boolean alwaysThrow) {
       this.alwaysThrow = alwaysThrow;
    }

    @Override
    public String process(ToolExecutionException exception) {
       Assert.notNull(exception, "exception cannot be null");
       if (this.alwaysThrow) {
          throw exception;
       }
       logger.debug("Exception thrown by tool: {}. Message: {}", exception.getToolDefinition().name(),
             exception.getMessage());
       return exception.getMessage();
    }

    public static Builder builder() {
       return new Builder();
    }

    public static class Builder {

       private boolean alwaysThrow = DEFAULTALWAYSTHROW;

       public Builder alwaysThrow(boolean alwaysThrow) {
          this.alwaysThrow = alwaysThrow;
          return this;
       }

       public DefaultToolExecutionExceptionProcessor build() {
          return new DefaultToolExecutionExceptionProcessor(this.alwaysThrow);
       }

    }

}
```

### ToolContext（工具上下文）

用于在函数调用（工具调用）场景下，封装和传递工具执行所需的上下文信息。它保证上下文数据不可变，便于多线程安全地传递和使用

- `Map<String, Object> context`：于存储和获取工具调用的消息历史

```java
package org.springframework.ai.chat.model;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.ai.chat.messages.Message;

public final class ToolContext {
    public static final String TOOLCALLHISTORY = "TOOLCALLHISTORY";
    private final Map<String, Object> context;

    public ToolContext(Map<String, Object> context) {
        this.context = Collections.unmodifiableMap(context);
    }

    public Map<String, Object> getContext() {
        return this.context;
    }

    public List<Message> getToolCallHistory() {
        return (List)this.context.get("TOOLCALLHISTORY");
    }
}
```

## 工具触发链路解读

> 导入工具依赖，自动注入在 ChatModel 时需要用到的 ToolCallingManager，进行工具的系列调用说明

### pom.xml

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-autoconfigure-model-tool</artifactId>
</dependency>
```

### ToolCallingAutoConfiguration

用于自动装配与 AI 工具调用（Tool Calling）相关的核心组件，简化开发者集成和使用工具链的流程

提供的 Bean 说明

<table>
<tr>
<td>方法名称<br/></td><td>描述<br/></td></tr>
<tr>
<td>toolCallbackResolver<br/></td><td>提供ToolCallbackResolver的Bean，统一解析和管理所有可用的工具回调（ToolCallback），支持静态注册、Spring Bean 自动发现和 Provider 扩展<br/></td></tr>
<tr>
<td>toolExecutionExceptionProcessor<br/></td><td>提供ToolExecutionExceptionProcessor的Bean，处理工具执行过程中的异常<br/></td></tr>
<tr>
<td>toolCallingManager<br/></td><td>提供ToolCallingManager的Bean，调用的核心管理器，负责协调工具回调解析、异常处理、观测注册等<br/></td></tr>
<tr>
<td>toolCallingContentObservationFilter<br/></td><td>提供ToolCallingContentObservationFilter的Bean，用于观测链路中，过滤和记录工具调用的参数与结果内容。开启后会有安全警告，避免敏感信息泄露<br/></td></tr>
</table>


```java
package org.springframework.ai.model.tool.autoconfigure;

import io.micrometer.observation.ObservationRegistry;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.model.tool.DefaultToolCallingManager;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.execution.DefaultToolExecutionExceptionProcessor;
import org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor;
import org.springframework.ai.tool.observation.ToolCallingContentObservationFilter;
import org.springframework.ai.tool.observation.ToolCallingObservationConvention;
import org.springframework.ai.tool.resolution.DelegatingToolCallbackResolver;
import org.springframework.ai.tool.resolution.SpringBeanToolCallbackResolver;
import org.springframework.ai.tool.resolution.StaticToolCallbackResolver;
import org.springframework.ai.tool.resolution.ToolCallbackResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.support.GenericApplicationContext;

@AutoConfiguration
@ConditionalOnClass({ChatModel.class})
@EnableConfigurationProperties({ToolCallingProperties.class})
public class ToolCallingAutoConfiguration {
    private static final Logger logger = LoggerFactory.getLogger(ToolCallingAutoConfiguration.class);

    @Bean
    @ConditionalOnMissingBean
    ToolCallbackResolver toolCallbackResolver(GenericApplicationContext applicationContext, List<ToolCallback> toolCallbacks, List<ToolCallbackProvider> tcbProviders) {
        List<ToolCallback> allFunctionAndToolCallbacks = new ArrayList(toolCallbacks);
        Stream var10000 = tcbProviders.stream().map((pr) -> List.of(pr.getToolCallbacks()));
        Objects.requireNonNull(allFunctionAndToolCallbacks);
        var10000.forEach(allFunctionAndToolCallbacks::addAll);
        StaticToolCallbackResolver staticToolCallbackResolver = new StaticToolCallbackResolver(allFunctionAndToolCallbacks);
        SpringBeanToolCallbackResolver springBeanToolCallbackResolver = SpringBeanToolCallbackResolver.builder().applicationContext(applicationContext).build();
        return new DelegatingToolCallbackResolver(List.of(staticToolCallbackResolver, springBeanToolCallbackResolver));
    }

    @Bean
    @ConditionalOnMissingBean
    ToolExecutionExceptionProcessor toolExecutionExceptionProcessor() {
        return new DefaultToolExecutionExceptionProcessor(false);
    }

    @Bean
    @ConditionalOnMissingBean
    ToolCallingManager toolCallingManager(ToolCallbackResolver toolCallbackResolver, ToolExecutionExceptionProcessor toolExecutionExceptionProcessor, ObjectProvider<ObservationRegistry> observationRegistry, ObjectProvider<ToolCallingObservationConvention> observationConvention) {
        DefaultToolCallingManager toolCallingManager = ToolCallingManager.builder().observationRegistry((ObservationRegistry)observationRegistry.getIfUnique(() -> ObservationRegistry.NOOP)).toolCallbackResolver(toolCallbackResolver).toolExecutionExceptionProcessor(toolExecutionExceptionProcessor).build();
        Objects.requireNonNull(toolCallingManager);
        observationConvention.ifAvailable(toolCallingManager::setObservationConvention);
        return toolCallingManager;
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(
        prefix = "spring.ai.tools.observations",
        name = {"include-content"},
        havingValue = "true"
    )
    ToolCallingContentObservationFilter toolCallingContentObservationFilter() {
        logger.warn("You have enabled the inclusion of the tool call arguments and result in the observations, with the risk of exposing sensitive or private information. Please, be careful!");
        return new ToolCallingContentObservationFilter();
    }
}
```

### ToolCallingProperties

Spring AI 工具调用相关参数的配置类

- `boolean throwExceptionOnError`：控制工具调用过程中的异常处理方式，true 时抛出异常，false 时将错误消息返回给 AI 模型（默认）
- `Observations observations`：置观测（Observations）相关选项，决定是否在观测数据中包含工具调用的参数和结果内容（默认 false，开启会有泄漏信息风险）

```java
package org.springframework.ai.model.tool.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("spring.ai.tools")
public class ToolCallingProperties {
    public static final String CONFIGPREFIX = "spring.ai.tools";
    private final Observations observations = new Observations();

    public static class Observations {
        private boolean includeContent = false;

        public boolean isIncludeContent() {
            return this.includeContent;
        }

        public void setIncludeContent(boolean includeContent) {
            this.includeContent = includeContent;
        }
    }
}
```

### client 触发工具链路

![](/img/user/ai/spring-ai-explained-sourcecode/tool-工具链路触发.png)
