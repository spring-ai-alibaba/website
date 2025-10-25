---
title: "跨智能体通信模式"
description: "学习如何构建 A2A 客户端来发现和调用其他智能体，并掌握管道、扇出等高级协作模式。"
---

# 跨智能体通信模式

## 概述

在掌握了如何创建一个 A2A Agent Server 之后，下一步是学习如何构建一个 **A2A Agent Client** 来发现和调用其他智能体。

本文将重点介绍客户端的实现，并展示如何组合多个智能体来完成复杂任务的协作模式。

**本文中的代码示例，大部分是客户端的业务逻辑，展示了如何利用 A2A 协议实现强大的分布式智能体系统。**

## 1. 客户端基础：服务发现与调用

要与其他智能体通信，客户端首先需要知道目标智能体的地址和能力。这通常通过服务发现来实现。

下面是一个简单的 `A2aClientService` 示例，它使用 Spring Cloud 的 `DiscoveryClient` (可对接 Nacos, Consul 等) 来查找智能体，并使用 `RestTemplate` 发送 JSON-RPC 请求。

```java
package com.example.a2aclient.service;

import io.a2a.spec.JSONRPCRequest;
import io.a2a.spec.JSONRPCResponse;
import io.a2a.spec.Message;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class A2aClientService {
    
    private final DiscoveryClient discoveryClient;
    private final RestTemplate restTemplate;

    public A2aClientService(DiscoveryClient discoveryClient, RestTemplate restTemplate) {
        this.discoveryClient = discoveryClient;
        this.restTemplate = restTemplate;
    }

    /**
     * 根据智能体的唯一名称调用智能体
     * @param agentName 在注册中心的服务名, e.g., "weather-agent"
     * @param message   要发送的消息
     * @return 来自智能体的响应文本
     */
    public String callAgent(String agentName, Message message) {
        // 1. 从注册中心发现服务实例
        Optional<ServiceInstance> agentInstance = discoveryClient.getInstances(agentName)
                .stream()
                .findFirst();

        if (agentInstance.isEmpty()) {
            throw new AgentNotFoundException("未找到名为 '" + agentName + "' 的智能体");
        }
        
        // 2. 构建 JSON-RPC 请求
        JSONRPCRequest request = JSONRPCRequest.builder()
            .method("sendMessage")
            .params(Map.of("message", message))
            .id(UUID.randomUUID().toString())
            .build();
            
        // 3. 发送 HTTP 请求
        ServiceInstance instance = agentInstance.get();
        // 假设 contact.endpoint 中存储的是相对路径 /a2a
        String url = instance.getUri() + "/a2a";
        
        JSONRPCResponse response = restTemplate.postForObject(url, request, JSONRPCResponse.class);
        
        // 4. 解析并返回结果
        if (response.getError() != null) {
            throw new AgentCallException("智能体调用失败: " + response.getError().getMessage());
        }
        
        return extractResponseText(response.getResult());
    }
    
    private String extractResponseText(Object result) {
        // 根据 A2A 规范，结果通常在 Task 的 artifacts 中
        // 此处为简化实现
        if (result instanceof Map) {
            Map<?, ?> task = (Map<?, ?>) ((Map<?, ?>) result).get("task");
            if (task != null && task.get("artifacts") instanceof List) {
                List<?> artifacts = (List<?>) task.get("artifacts");
                if (!artifacts.isEmpty() && artifacts.get(0) instanceof Map) {
                    return (String) ((Map<?, ?>) artifacts.get(0)).get("text");
                }
            }
        }
        return result.toString();
    }
}
```
**代码解释:**
- 这个示例展示了 A2A 客户端通信的核心流程：**发现 -> 构建请求 -> 发送 -> 解析**。
- 在实际项目中，您可以将 `RestTemplate` 替换为更强大的 `WebClient` 以支持异步和流式调用。

## 2. 核心通信模式

基于上述客户端基础，我们可以实现多种通信模式。

### a. 请求-响应模式 (同步调用)

这是最常见的模式，客户端发送请求并阻塞等待，直到收到响应。`A2aClientService` 中的 `callAgent` 方法就是此模式的实现。

**适用场景**:
- 需要立即获得结果的查询操作。
- 任务执行时间短。

### b. 异步消息模式

客户端发送请求后立即返回，不等待任务完成。通常用于触发一个长时间运行的后台任务。

```java
@Service
public class AsyncTaskService {
    
    private final A2aClientService a2aClient;

    /**
     * 触发一个异步的数据分析任务
     * @return 任务 ID，可用于后续查询状态
     */
    public String startDataAnalysis(String dataUrl) {
        Message message = Message.builder()
            .parts(List.of(TextPart.of("分析数据: " + dataUrl)))
            .metadata(Map.of("priority", "low"))
            .build();
            
        // 异步调用，假设 `callAgent` 内部会返回 Task ID
        String responseJson = a2aClient.callAgent("data-analysis-agent", message);
        
        // 从响应中解析并返回 Task ID
        return extractTaskId(responseJson);
    }
}
```
**适用场景**:
- 耗时较长的批处理任务。
- 不需要立即知道结果的操作。

### c. 流式响应模式

对于需要实时反馈进度的任务，客户端可以与服务端建立一个流式连接（如 Server-Sent Events, SSE），持续接收服务端的更新。

```java
@Service
public class StreamingClientService {
    
    private final WebClient webClient;

    public Flux<String> streamAnalysis(String dataSource) {
        // ... 服务发现逻辑以获取 url ...
        String url = "http://data-analysis-agent/a2a";

        JSONRPCRequest request = ...; // 构建请求

        // 使用 WebClient 发起 SSE 请求
        return this.webClient.post()
            .uri(url)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class); // 简单起见，直接接收字符串
    }
}
```
**适用场景**:
- 大模型生成内容的实时流式输出。
- 需要展示进度的长时间任务（如模型训练、数据处理）。
- 实时监控和日志流。

## 3. 高级协作模式

当单个智能体无法解决复杂问题时，就需要多个智能体进行协作。

### a. 管道模式 (Pipeline)

将一个任务分解为多个连续的阶段，每个阶段由一个专门的智能体处理。前一个智能体的输出是后一个智能体的输入。

```java
@Service
public class DocumentProcessingPipeline {
    
    private final A2aClientService a2aClient;
    
    public String processDocument(String documentText) {
        // 阶段 1: 文本校对 (调用校对智能体)
        Message proofreadMessage = Message.builder().parts(List.of(TextPart.of(documentText))).build();
        String correctedText = a2aClient.callAgent("proofreader-agent", proofreadMessage);
        
        // 阶段 2: 内容摘要 (调用摘要智能体)
        Message summarizeMessage = Message.builder().parts(List.of(TextPart.of(correctedText))).build();
        String summary = a2aClient.callAgent("summarizer-agent", summarizeMessage);
        
        // 阶段 3: 翻译 (调用翻译智能体)
        Message translateMessage = Message.builder().parts(List.of(TextPart.of(summary))).build();
        String translatedSummary = a2aClient.callAgent("translator-agent", translateMessage);
        
        return translatedSummary;
    }
}
```
**优点**: 结构清晰，每个智能体职责单一，易于维护和替换。

### b. 扇出/扇入模式 (Fan-out/Fan-in)

将一个任务分发给多个智能体并行处理，最后将它们的结果汇总。

```java
@Service
public class ParallelAnalysisService {
    
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final A2aClientService a2aClient;

    public Map<String, String> analyzeTextInParallel(String text) throws Exception {
        Message message = Message.builder().parts(List.of(TextPart.of(text))).build();
        
        // Fan-out: 并行调用多个智能体
        Future<String> sentimentFuture = executor.submit(() -> 
            a2aClient.callAgent("sentiment-agent", message));
        Future<String> keywordFuture = executor.submit(() -> 
            a2aClient.callAgent("keyword-agent", message));
        Future<String> topicFuture = executor.submit(() -> 
            a2aClient.callAgent("topic-agent", message));
        
        // Fan-in: 汇总结果
        Map<String, String> results = new HashMap<>();
        results.put("sentiment", sentimentFuture.get());
        results.put("keywords", keywordFuture.get());
        results.put("topic", topicFuture.get());
        
        return results;
    }
}
```
**优点**: 显著提升处理速度，充分利用分布式资源。

### c. 投票/共识模式 (Voting/Consensus)

让多个智能体对同一问题给出判断，然后通过投票或加权平均等方式形成最终决策。这在需要高准确性和鲁棒性的决策场景中非常有用。

```java
@Service
public class ConsensusDecisionService {

    private final A2aClientService a2aClient;
    private final List<String> expertAgents = List.of("expert-a", "expert-b", "expert-c");

    public String makeDecision(String problemDescription) {
        Message message = Message.builder().parts(List.of(TextPart.of(problemDescription))).build();
        
        // 1. 收集所有专家的意见
        List<String> opinions = expertAgents.stream()
            .parallel()
            .map(agent -> a2aClient.callAgent(agent, message))
            .toList();
        
        // 2. 分析意见并达成共识 (简化为投票)
        return opinions.stream()
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
            .entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("无法达成共识");
    }
}
```
**优点**: 提升决策的准确性和可靠性，避免单一智能体的偏见。

## 4. 生产级考量：路由、容错与监控

在生产环境中，客户端需要更强的健壮性。

### a. 智能路由与负载均衡

客户端可以实现更复杂的路由逻辑，例如根据智能体的能力、当前负载或响应时间来选择最佳实例。

```java
// 伪代码示例
public ServiceInstance selectBestInstance(List<ServiceInstance> instances) {
    return instances.stream()
        .min(Comparator.comparing(this::calculateScore))
        .orElse(null);
}

private double calculateScore(ServiceInstance instance) {
    // 从监控系统获取指标
    double load = getLoadFromMetrics(instance); // 负载
    double latency = getLatencyFromMetrics(instance); // 延迟
    // 返回加权分数，分数越低越优
    return (load * 0.6) + (latency * 0.4);
}
```

### b. 容错与恢复 (断路器模式)

使用 Resilience4j 或 Sentinel 等库，可以为客户端调用增加断路器和重试机制，防止因单个智能体故障导致整个系统雪崩。

```java
@Service
public class ResilientA2aClient {

    private final A2aClientService a2aClient;

    @CircuitBreaker(name = "a2aAgent", fallbackMethod = "fallbackCall")
    @Retry(name = "a2aAgent")
    public String callAgentWithResilience(String agentName, Message message) {
        return a2aClient.callAgent(agentName, message);
    }
    
    public String fallbackCall(String agentName, Message message, Throwable ex) {
        log.warn("调用智能体 {} 失败，启用降级策略: {}", agentName, ex.getMessage());
        return "服务暂时不可用，请稍后重试。";
    }
}
```

### c. 可观测性 (Tracing & Metrics)

通过集成 OpenTelemetry 或 Micrometer，可以实现对跨智能体调用的全链路追踪和性能指标监控。

```java
// 伪代码: 使用 AOP 为 A2aClientService 的方法添加监控
@Aspect
@Component
public class A2aMetricsAspect {
    
    private final MeterRegistry meterRegistry;
    
    @Around("execution(* com.example.a2aclient.service.A2aClientService.callAgent(..))")
    public Object measureCall(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            // 记录成功调用的耗时
            meterRegistry.timer("a2a.client.calls", "status", "success").record(System.currentTimeMillis() - startTime, TimeUnit.MILLISECONDS);
            return result;
        } catch (Throwable ex) {
            // 记录失败调用的耗时
            meterRegistry.timer("a2a.client.calls", "status", "failure").record(System.currentTimeMillis() - startTime, TimeUnit.MILLISECONDS);
            throw ex;
        }
    }
}
```

## 下一步

- **[A2A 协议基础](./protocol)**: 回顾 A2A 协议的底层规范和数据结构。
- **[多智能体协作模式](../../building/patterns/a2a)**: 深入了解如何在 SAA Graph 中实现更复杂的协作逻辑。
