---
title: Advisors API
keywords: [Spring AI,通义千问,百炼,智能体应用]
description: "Spring AI Alibaba顾问"
---

## Advisors API

Spring AI Advisors API提供了一种灵活而强大的方法来拦截、修改和增强 Spring 应用程序中的 AI 驱动的交互。 通过利用 Advisors API，开发人员可以创建更复杂、可重用和可维护的 AI 组件。

主要优势包括封装重复的生成式 AI 模式、转换发送到大型语言模型 （LLM） 和从大型语言模型 （LLM） 发送的数据，以及提供跨各种模型和用例的可移植性。

您可以使用 ChatClient API 配置现有advisor，如以下示例所示：

```java
var chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(
        MessageChatMemoryAdvisor.builder(chatMemory).build(), // chat-memory advisor
        QuestionAnswerAdvisor.builder(vectorStore).builder() // RAG advisor
    )
    .build();

var conversationId = "678";

String response = this.chatClient.prompt()
    // Set advisor parameters at runtime
    .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, conversationId))
    .user(userText)
    .call()
	.content();
```

建议在构建时使用 builder 的方法注册 advisor。defaultAdvisors()

### 核心组件

API 由非流式处理方案和 和 流式处理方案组成。 它还包括表示 Chat Completion 响应的未密封 Prompt 请求。两者都在 advisor 链中持有 to share 状态。
![core-components.png](../../../../../../../public/img/user/ai/tutorials/basics/core-components.png)

通常执行各种作，例如检查未密封的 Prompt 数据、自定义和扩充 Prompt 数据、调用 advisor 链中的下一个实体、选择性地阻止请求、检查聊天完成响应以及引发异常以指示处理错误。`nextAroundCall()` `nextAroundStream()`

此外，`getOrder()`方法确定advisor在链上的顺序，而`getName()`提供唯一的advisor名称

由 Spring AI 框架创建的 Advisor Chain 允许按 `getOrder()` 值排序的多个 advisors 顺序调用。 较低的值首先执行。 最后一个 advisor（自动添加）将请求发送到 LLM。

以下流程图说明了 advisor 链与 Chat Model 之间的交互：

![advisor-chain-and-chat-model.png](../../../../../../../public/img/user/ai/tutorials/basics/advisor-chain-and-chat-model.png)

1. Spring AI 框架从用户的 `Prompt` 创建一个 `AdvisedRequest`，同时创建一个空的 `AdvisorContext` 对象。

2. 链中的每个 advisor 处理请求，可能会修改它。或者，它可以选择通过不调用下一个实体来阻止请求。在后一种情况下，advisor 负责填写响应。

3. 框架提供的最终 advisor 将请求发送到 `Chat Model`。

4. Chat Model 的响应然后通过 advisor 链传回并转换为 `AdvisedResponse`。后者包含共享的 `AdvisorContext` 实例。

5. 每个 advisor 可以处理或修改响应。

6. 通过提取 `ChatCompletion` 将最终的 `AdvisedResponse` 返回给客户端。

#### Advisor顺序

链中 advisors 的执行顺序由 `getOrder()` 方法确定。需要理解的关键点：

- 具有较低顺序值的 advisors 首先执行。

- advisor 链作为堆栈运行：

    - 链中的第一个 advisor 是第一个处理请求的。

    - 它也是最后一个处理响应的。

- 要控制执行顺序：

    - 将顺序设置为接近 Ordered.HIGHEST_PRECEDENCE 以确保 advisor 在链中首先执行（请求处理时首先，响应处理时最后）。

    - 将顺序设置为接近 Ordered.LOWEST_PRECEDENCE 以确保 advisor 在链中最后执行（请求处理时最后，响应处理时首先）。

- 较高的值被解释为较低的优先级。

- 如果多个 advisors 具有相同的顺序值，它们的执行顺序不能保证。

>顺序和执行序列之间的看似矛盾是由于 advisor 链的堆栈性质：
>- 具有最高优先级（最低顺序值）的 advisor 被添加到堆栈顶部。
>- 当堆栈展开时，它将是第一个处理请求的。
>- 当堆栈重绕时，它将是最后一个处理响应的。

作为提醒，以下是 Spring `Ordered` 接口的语义：

```java
public interface Ordered {

    /**
     * 最高优先级值的常量。
     * @see java.lang.Integer#MIN_VALUE
     */
    int HIGHEST_PRECEDENCE = Integer.MIN_VALUE;

    /**
     * 最低优先级值的常量。
     * @see java.lang.Integer#MAX_VALUE
     */
    int LOWEST_PRECEDENCE = Integer.MAX_VALUE;

    /**
     * 获取此对象的顺序值。
     * <p>较高的值被解释为较低的优先级。因此，
     * 具有最低值的对象具有最高优先级（某种程度上
     * 类似于 Servlet {@code load-on-startup} 值）。
     * <p>相同的顺序值将导致受影响对象的任意排序位置。
     * @return 顺序值
     * @see #HIGHEST_PRECEDENCE
     * @see #LOWEST_PRECEDENCE
     */
    int getOrder();
}
```

>对于需要在输入和输出端都是链中第一个的用例：
>1. 为每一端使用单独的 advisors。
>2. 使用不同的顺序值配置它们。
>3. 使用 advisor 上下文在它们之间共享状态。

### API概述

主要的 Advisor 接口位于 `org.springframework.ai.chat.client.advisor.api` 包中。以下是创建自己的 advisor 时会遇到的关键接口：

```java
public interface Advisor extends Ordered {

	String getName();

}
```

同步和流式 Advisors 的两个子接口是

```java
public interface CallAdvisor extends Advisor {
  ChatClientResponse adviseCall(ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain);
}

public interface StreamAdvisor extends Advisor {
  Flux<ChatClientResponse> adviseStream(ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain);
}
```

要在 Advice 实现中继续 Advice 链，请使用 `CallAdvisorChain` 和 `StreamAdvisorChain`：

```java
public interface CallAdvisorChain extends AdvisorChain {
    
  ChatClientResponse nextCall(ChatClientRequest chatClientRequest);

  List<CallAdvisor> getCallAdvisors();
}

public interface StreamAdvisorChain extends AdvisorChain {
    
  Flux<ChatClientResponse> nextStream(ChatClientRequest chatClientRequest);

  List<StreamAdvisor> getStreamAdvisors();
}
```

### 实现Advisor

要创建 advisor，请实现 `CallAdvisor` 或 `StreamAdvisor`（或两者）。要实现的关键方法是用于非流式的 `nextCall()` 或用于流式的 `nextStream()`。

#### 实例

我们将提供几个实践示例来说明如何实现用于观察和增强用例的 advisors。

##### DashScopeDocumentRetrievalAdvisor

我们可以实现对，它在调用链中的下一个 advisor 之前记录 `AdvisedRequest`，之后记录 `AdvisedResponse`。 注意，advisor 只观察请求和响应，不修改它们。 此实现支持非流式和流式场景。

```java
public class SimpleLoggerAdvisor implements CallAroundAdvisor, StreamAroundAdvisor {

	private static final Logger logger = LoggerFactory.getLogger(SimpleLoggerAdvisor.class);

    //	为 advisor 提供唯一名称。
	@Override
	public String getName() {
        
		return this.getClass().getSimpleName();
        
	}

    //	您可以通过设置顺序值来控制执行顺序。较低的值首先执行。
	@Override
	public int getOrder() {
        
		return 0;
	}


  @Override
  public ChatClientResponse adviseCall(ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain) {

    this.logRequest(chatClientRequest);

    ChatClientResponse chatClientResponse = callAdvisorChain.nextCall(chatClientRequest);
    
    this.logResponse(chatClientResponse);
    
    return chatClientResponse;
  }

  //	MessageAggregator 是一个实用类，它将 Flux 响应聚合为单个 AdvisedResponse。这对于记录或观察整个响应而不是流中单个项目的其他处理很有用。 
  //	注意，您不能在 MessageAggregator 中修改响应，因为它是只读操作。
  @Override
  public Flux<ChatClientResponse> adviseStream(ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {

    this.logRequest(chatClientRequest);

    Flux<ChatClientResponse> chatClientResponses = streamAdvisorChain.nextStream(chatClientRequest);
    
    return (new ChatClientMessageAggregator()).aggregateChatClientResponse(chatClientResponses, this::logResponse);
  }
}
```

> `ChatClientMessageAggregator` 是一个实用类，它将 Flux 响应聚合为单个 `chatClientResponses`。 这对于记录或观察整个响应而不是流中单个项目的其他处理很有用。 注意，您不能在 `ChatClientMessageAggregator` 中修改响应，因为它是只读操作。

##### Spring AI Alibaba内置Advisors

Spring AI Alibaba框架提供了几个内置的 advisors 来增强您的 AI 交互。以下是可用的 advisors 概述：

###### 文档处理 Advisors

这些 advisors 在文档处理中管理有关文档的各种信息：

- `RetrievalRerankAdvisor`

  提供按照文档的相关性进行重新排序的方法

- `RetrievalRerankAdvisor`

  按照历史记录尝试生成答案。

- `DashScopeDocumentRetrievalAdvisor`

  您需要仅使用提供的搜索文档为给定问题写出高质量的答案，并正确引用它们。

#### 流式与非流式

![non-streaming-and-streaming.png](../../../../../../../public/img/user/ai/tutorials/basics/non-streaming-and-streaming.png)

- 非流式 advisors 处理完整的请求和响应。

- 流式 advisors 将请求和响应作为连续流处理，使用响应式编程概念（例如，使用 Flux 处理响应）。

```java
@Override
default Flux<ChatClientResponse> adviseStream(ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {
  Assert.notNull(chatClientRequest, "chatClientRequest cannot be null");
  Assert.notNull(streamAdvisorChain, "streamAdvisorChain cannot be null");
  Assert.notNull(this.getScheduler(), "scheduler cannot be null");
  Mono var10000 = Mono.just(chatClientRequest).publishOn(this.getScheduler()).map((request) -> {
    return this.before(request, streamAdvisorChain);// 这可以由阻塞和非阻塞线程执行。Advisor 在 next 部分之前
  });
  Objects.requireNonNull(streamAdvisorChain);
  Flux<ChatClientResponse> chatClientResponseFlux = var10000.flatMapMany(streamAdvisorChain::nextStream);
  return chatClientResponseFlux.map((response) -> {
    if (AdvisorUtils.onFinishReason().test(response)) {
      response = this.after(response, streamAdvisorChain);// Advisor 在 next 部分之后
    }

    return response;
  }).onErrorResume((error) -> {
    return Flux.error(new IllegalStateException("Stream processing failed", error));
  });
}
```

#### 最佳实践

1. 保持 advisors 专注于特定任务，以实现更好的模块化。

2. 必要时使用 `adviseContext` 在 advisors 之间共享状态。

3. 实现 advisor 的流式和非流式版本，以获得最大的灵活性。

4. 仔细考虑 advisor 链中的顺序，以确保正确的数据流。

### 向后兼容性

重要：`AdvisedRequest` 类已移至新包。

### API重大变更

Spring AI Advisor Chain 从版本 1.0 M2 到 1.0 M3 经历了重大变化。以下是主要修改：

#### Advisor 接口

- 在 1.0 M2 中，有单独的 `RequestAdvisor` 和 `ResponseAdvisor` 接口。

  - `RequestAdvisor` 在 `ChatModel.call` 和 `ChatModel.stream` 方法之前被调用。

  - `ResponseAdvisor` 在这些方法之后被调用。

- 在 1.0 M3 中，这些接口已被替换为：

  - `CallAroundAdvisor`

  - `StreamAroundAdvisor`

- `StreamResponseMode`（以前是 `ResponseAdvisor` 的一部分）已被删除。

#### 上下文映射处理

- 在 1.0 M2 中：

  - 上下文映射是一个单独的方法参数。

  - 映射是可变的，并沿链传递。

- 在 1.0 M3 中：

  - 上下文映射现在是 `AdvisedRequest` 和 `AdvisedResponse` 记录的一部分。

  - 映射是不可变的。

  - 要更新上下文，请使用 `updateContext` 方法，该方法创建一个包含更新内容的新不可修改映射。

在 1.0 M3 中更新上下文的示例：

```java
@Override
public AdvisedResponse aroundCall(AdvisedRequest advisedRequest, CallAroundAdvisorChain chain) {

    this.advisedRequest = advisedRequest.updateContext(context -> {
        context.put("aroundCallBefore" + getName(), "AROUND_CALL_BEFORE " + getName());  // 添加多个键值对
        context.put("lastBefore", getName());  // 添加单个键值对
        return context;
    });

    // 方法实现继续...
}
```

