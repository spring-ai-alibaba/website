---
title: 智能体流式处理
description: 从 Spring AI Alibaba Graph 智能体流式输出数据
---

# 智能体流式处理

从智能体流式传输数据可以提供实时的执行反馈和LLM令牌输出。

## 智能体进度流式传输

要流式传输智能体进度，请使用 [`stream()`](../../../api-reference/graph/#stream) 或 [`streamAsync()`](../../../api-reference/graph/#streamAsync) 方法，并设置 `streamMode="updates"`。这会在每个智能体步骤后发出事件。

例如，如果您有一个调用工具一次的智能体，您应该看到以下更新：

- **LLM 节点**：带有工具调用请求的 AI 消息
- **工具节点**：带有执行结果的工具消息
- **LLM 节点**：最终 AI 响应

**同步方式：**

```java
@Service
public class AgentStreamingService {
    
    @Autowired
    private CompiledGraph reactAgent;
    
    public void processWithStreaming(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user", 
                "content", userInput
            ))
        );
        
        // 流式执行智能体
        for (StreamEvent chunk : reactAgent.stream(input, StreamConfig.builder()
                .streamMode("updates")
                .build())) {
            System.out.println(chunk);
            System.out.println();
        }
    }
}
```

**异步方式：**

```java
@Service
public class AgentStreamingService {
    
    @Autowired
    private CompiledGraph reactAgent;
    
    public void processWithStreaming(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user", 
                "content", userInput
            ))
        );
        
        // 异步流式执行智能体
        reactAgent.streamAsync(input, StreamConfig.builder()
                .streamMode("updates")
                .build())
            .subscribe(chunk -> {
                System.out.println(chunk);
                System.out.println();
            });
    }
}
```

## LLM 令牌流式传输

要从智能体流式传输 LLM 令牌，请使用 [`stream()`](../../../api-reference/graph/#stream) 或 [`streamAsync()`](../../../api-reference/graph/#streamAsync) 方法，并设置 `streamMode="messages"`。这会在生成令牌时发出事件。

**同步方式：**

```java
@Service
public class LLMTokenStreamingService {

    @Autowired
    private CompiledGraph reactAgent;

    public void streamLLMTokens(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user",
                "content", userInput
            ))
        );

        // 流式传输 LLM 令牌
        for (StreamEvent event : reactAgent.stream(input, StreamConfig.builder()
                .streamMode("messages")
                .build())) {
            if (event instanceof MessageStreamEvent) {
                MessageStreamEvent msgEvent = (MessageStreamEvent) event;
                System.out.println("令牌: " + msgEvent.getToken());
                System.out.println("元数据: " + msgEvent.getMetadata());
                System.out.println();
            }
        }
    }
}
```

**异步方式：**

```java
@Service
public class LLMTokenStreamingService {

    @Autowired
    private CompiledGraph reactAgent;

    public void streamLLMTokens(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user",
                "content", userInput
            ))
        );

        // 异步流式传输 LLM 令牌
        reactAgent.streamAsync(input, StreamConfig.builder()
                .streamMode("messages")
                .build())
            .subscribe(event -> {
                if (event instanceof MessageStreamEvent) {
                    MessageStreamEvent msgEvent = (MessageStreamEvent) event;
                    System.out.println("令牌: " + msgEvent.getToken());
                    System.out.println("元数据: " + msgEvent.getMetadata());
                    System.out.println();
                }
            });
    }
}
```

## 多种模式流式传输

您可以通过将流式模式作为列表传递来指定多种流式模式：`streamMode=["updates", "messages", "custom"]`：

**同步方式：**

```java
@Service
public class MultiModeStreamingService {

    @Autowired
    private CompiledGraph reactAgent;

    public void streamMultipleModes(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user",
                "content", userInput
            ))
        );

        // 流式传输多种模式
        for (StreamEvent event : reactAgent.stream(input, StreamConfig.builder()
                .streamModes(List.of("updates", "messages", "custom"))
                .build())) {
            String mode = event.getMode();
            Object chunk = event.getChunk();

            System.out.println("模式: " + mode + ", 数据: " + chunk);
            System.out.println();
        }
    }
}
```

**异步方式：**

```java
@Service
public class MultiModeStreamingService {

    @Autowired
    private CompiledGraph reactAgent;

    public void streamMultipleModes(String userInput) {
        Map<String, Object> input = Map.of(
            "messages", List.of(Map.of(
                "role", "user",
                "content", userInput
            ))
        );

        // 异步流式传输多种模式
        reactAgent.streamAsync(input, StreamConfig.builder()
                .streamModes(List.of("updates", "messages", "custom"))
                .build())
            .subscribe(event -> {
                String mode = event.getMode();
                Object chunk = event.getChunk();

                System.out.println("模式: " + mode + ", 数据: " + chunk);
                System.out.println();
            });
    }
}
```

## 禁用流式处理

在某些应用程序中，您可能需要为给定模型禁用单个令牌的流式处理。这在[多智能体](../../multi-agent)系统中很有用，可以控制哪些智能体流式传输其输出。

请参阅[模型](../../models#disable-streaming)指南了解如何禁用流式处理。

## 下一步

- [工作流流式处理](./workflow-streaming) - 了解工作流的流式处理
- [自定义流式数据](./custom-streaming) - 发送自定义流式数据
- [性能优化](./performance) - 优化流式处理性能
