---
title: 流式输出
description: 从 Spring AI Alibaba Graph 智能体或工作流中流式输出数据
---

# 流式输出

Spring AI Alibaba Graph 提供了强大的流式处理能力，让您可以实时获取执行进度、LLM令牌输出和自定义数据流。

## 概述

流式输出是现代AI应用的重要特性，它能够：

- 提供实时的执行反馈
- 改善用户体验
- 支持长时间运行的任务
- 实现透明的处理过程

## 主要特性

- **多种流式模式** - 支持进度更新、LLM令牌、自定义数据等多种流式模式
- **智能体集成** - 与智能体系统无缝集成
- **工作流支持** - 完整的工作流流式处理能力
- **性能优化** - 内置缓存、压缩和背压控制

## 文档导航

### 基础概念
- [**概览**](./streaming/overview) - 流式输出的基本概念和功能特性

### 实现指南
- [**智能体流式处理**](./streaming/agent-streaming) - 从智能体流式传输数据
- [**工作流流式处理**](./streaming/workflow-streaming) - 从工作流流式传输数据
- [**自定义流式数据**](./streaming/custom-streaming) - 发送自定义流式数据

### 高级主题
- [**性能优化**](./streaming/performance) - 优化流式处理性能

## 快速开始

最简单的流式处理示例：

```java
@Service
public class StreamingExample {

    @Autowired
    private CompiledGraph graph;

    public void basicStreaming() {
        // 同步流式处理
        for (StreamEvent event : graph.stream(inputs, StreamConfig.builder()
                .streamMode("updates")
                .build())) {
            System.out.println(event);
        }
    }
}
```

## 下一步

- [持久化](./persistence) - 了解数据持久化
- [持久执行](./durable-execution) - 学习持久执行
- [记忆管理](./memory) - 探索记忆管理
