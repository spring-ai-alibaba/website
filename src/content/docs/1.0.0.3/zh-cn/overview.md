---
title: Spring AI Alibaba 概览
description: Spring AI Alibaba 1.0.0.3 版本概览
---

# Spring AI Alibaba 概览

Spring AI Alibaba 是一个基于 Spring AI 框架的扩展，专门为阿里云的 AI 服务提供集成支持。本版本 1.0.0.3 带来了许多新功能和改进。

## 主要特性

### 🤖 单智能体支持
- **模型集成**: 支持多种阿里云 AI 模型
- **聊天客户端**: 简化的聊天接口
- **提示工程**: 强大的提示模板系统
- **工具调用**: 函数调用和工具集成
- **RAG 支持**: 检索增强生成

### 🔗 多智能体支持
- **智能体编排**: 多个智能体协作
- **图形化工作流**: 可视化智能体关系
- **状态管理**: 智能体间状态共享

### 📊 可观测性
- **监控**: 实时性能监控
- **日志**: 详细的执行日志
- **指标**: 关键性能指标

### 🎮 Playground
- **交互式测试**: 在线测试环境
- **实时调试**: 即时反馈和调试

## 快速开始

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0.3</version>
</dependency>
```

## 版本亮点

### 新功能
- 增强的工具调用支持
- 改进的多智能体协作
- 新的监控和可观测性功能
- 更好的 RAG 集成

### 性能改进
- 优化的模型推理性能
- 减少的内存占用
- 更快的响应时间

### 兼容性
- 向后兼容 1.0.0.2 版本
- 支持最新的 Spring Boot 版本
- 兼容 Java 17+

## 下一步

- [单智能体开发](/docs/1.0.0.3/single-agent/models/)
- [多智能体开发](/docs/1.0.0.3/multi-agent/agents/)
- [从 1.0.0.2 迁移](/docs/1.0.0.3/migration/from-1.0.0.2/)
