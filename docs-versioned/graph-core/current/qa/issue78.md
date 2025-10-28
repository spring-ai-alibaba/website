---
title:  如何重置记忆线程- 重置记忆线程
description: 学习如何在Spring AI Alibaba中重置记忆线程，管理多个会话的内存
keywords: [重置记忆, Reset Memory, Thread, 内存管理, Checkpoint, Spring AI Alibaba]
---


本示例展示如何在 Spring AI Alibaba Graph 中管理多个独立的对话线程及其记忆。

## 初始化配置

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;

private static final Logger log = LoggerFactory.getLogger("MemoryThread");
```

## 定义状态

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import com.alibaba.cloud.ai.graph.state.strategy.ReplaceStrategy;
import java.util.Map;
import java.util.HashMap;

// 配置状态策略
KeyStrategyFactory keyStrategyFactory = () -> {
    HashMap<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("conversation", new ReplaceStrategy());
    strategies.put("response", new ReplaceStrategy());
    return strategies;
};
```

## 创建带记忆的对话节点

```java
import com.alibaba.cloud.ai.graph.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import com.alibaba.cloud.ai.graph.RunnableConfig;

class ConversationAgent implements NodeAction {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public ConversationAgent(ChatClient.Builder chatClientBuilder) {
        // 创建内存存储
        this.chatMemory = new InMemoryChatMemory();

        // 配置带记忆的 ChatClient
        this.chatClient = chatClientBuilder
            .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
            .build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) throws Exception {
        var conversation = (String) state.value("conversation")
            .orElseThrow(() -> new IllegalStateException("No conversation found in state"));

        // 从运行配置中获取 threadId（会话 ID）
        String threadId = "default"; // 默认值

        // 使用 ChatClient 进行对话
        String response = chatClient.prompt()
            .user(conversation)
            .call()
            .content();

        return Map.of("response", response);
    }
}
```

## 使用 RunnableConfig 的高级版本

为了更好地支持多线程记忆，可以使用带配置的节点：

```java
import com.alibaba.cloud.ai.graph.action.NodeActionWithConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;

class ConversationAgentWithConfig implements NodeActionWithConfig {

    private final ChatClient.Builder chatClientBuilder;
    private final Map<String, ChatMemory> memoryStore = new HashMap<>();

    public ConversationAgentWithConfig(ChatClient.Builder chatClientBuilder) {
        this.chatClientBuilder = chatClientBuilder;
    }

    @Override
    public Map<String, Object> apply(OverAllState state, RunnableConfig config) throws Exception {
        var conversation = (String) state.value("conversation")
            .orElseThrow(() -> new IllegalStateException("No conversation found"));

        // 获取线程 ID
        String threadId = config.threadId().orElse("default");

        // 为每个线程创建独立的记忆
        ChatMemory memory = memoryStore.computeIfAbsent(threadId,
            id -> new InMemoryChatMemory());

        // 创建带该线程记忆的 ChatClient
        ChatClient chatClient = chatClientBuilder
            .defaultAdvisors(new MessageChatMemoryAdvisor(memory))
            .build();

        // 执行对话
        String response = chatClient.prompt()
            .user(conversation)
            .call()
            .content();

        return Map.of("response", response);
    }

    // 重置特定线程的记忆
    public void resetMemory(String threadId) {
        memoryStore.remove(threadId);
    }

    // 清空所有记忆
    public void clearAll() {
        memoryStore.clear();
    }
}
```

## 构建 Graph

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.MemorySaver;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeActionWithConfig.nodeasyncwithconfig;

// 创建对话节点
var conversationAgent = new ConversationAgentWithConfig(chatClientBuilder);

// 构建工作流
var workflow = new StateGraph(keyStrategyFactory)
    .addNode("agent", nodeasyncwithconfig(conversationAgent))
    .addEdge(StateGraph.START, "agent")
    .addEdge("agent", StateGraph.END);

// 配置 Checkpoint 持久化
var memory = new MemorySaver();
var compileConfig = CompileConfig.builder()
    .checkpointSaver(memory)
    .build();

var app = workflow.compile(compileConfig);
```

## 测试多线程记忆

```java
// 配置第一个对话线程
var config1 = RunnableConfig.builder()
    .threadId("conversation-num-1")
    .build();

// 配置第二个对话线程
var config2 = RunnableConfig.builder()
    .threadId("conversation-num-2")
    .build();

// 线程 1 - 第一次对话
var result1 = app.invoke(Map.of("conversation", "Hi, my name is Chris"), config1);
System.out.println("Thread 1: " + result1.value("response").orElse(""));
// 输出: Nice to meet you, Chris! How can I help you?

// 线程 1 - 询问名字（应该记住）
result1 = app.invoke(Map.of("conversation", "what's my name?"), config1);
System.out.println("Thread 1: " + result1.value("response").orElse(""));
// 输出: Your name is Chris.

// 线程 2 - 询问名字（不应该知道）
var result2 = app.invoke(Map.of("conversation", "What's my name?"), config2);
System.out.println("Thread 2: " + result2.value("response").orElse(""));
// 输出: I don't have any information about your name. This is the beginning of our conversation.
```

## 重置记忆

```java
// 重置特定线程的记忆
conversationAgent.resetMemory("conversation-num-1");

// 现在线程 1 应该忘记之前的对话
result1 = app.invoke(Map.of("conversation", "what's my name?"), config1);
System.out.println("Thread 1 (after reset): " + result1.value("response").orElse(""));
// 输出: I don't have any information about your name.

// 清空所有线程的记忆
conversationAgent.clearAll();
```

## 使用 Checkpoint 管理记忆

也可以通过删除 Checkpoint 来重置记忆：

```java
// 删除特定线程的所有 checkpoint
memory.delete("conversation-num-1");

// 或者获取并删除特定的 checkpoint
var checkpoints = memory.list("conversation-num-1");
for (var checkpoint : checkpoints) {
    memory.delete(checkpoint.config().checkpointId());
}
```

## 完整示例

```java
import com.alibaba.cloud.ai.graph.*;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;

public class MemoryThreadExample {

    public static void main(String[] args) {
        // 配置 ChatClient
        ChatClient.Builder builder = ChatClient.builder(chatModel);

        // 创建带记忆管理的节点
        var agent = new ConversationAgentWithConfig(builder);

        // 构建 Graph
        var workflow = new StateGraph(keyStrategyFactory)
            .addNode("agent", nodeasyncwithconfig(agent))
            .addEdge(StateGraph.START, "agent")
            .addEdge("agent", StateGraph.END);

        var app = workflow.compile(CompileConfig.builder()
            .checkpointSaver(new MemorySaver())
            .build());

        // 测试多线程对话
        var config1 = RunnableConfig.builder().threadId("user1").build();
        var config2 = RunnableConfig.builder().threadId("user2").build();

        // 用户 1 的对话
        app.invoke(Map.of("conversation", "My name is Alice"), config1);
        app.invoke(Map.of("conversation", "What's my name?"), config1);

        // 用户 2 的对话
        app.invoke(Map.of("conversation", "My name is Bob"), config2);
        app.invoke(Map.of("conversation", "What's my name?"), config2);

        // 重置用户 1 的记忆
        agent.resetMemory("user1");

        // 用户 1 的记忆已被清除
        app.invoke(Map.of("conversation", "What's my name?"), config1);
    }
}
```

## 关键要点

1. **线程隔离**: 每个 `threadId` 对应独立的记忆空间
2. **记忆管理**: 使用 `ChatMemory` 或 `Checkpoint` 管理记忆
3. **重置策略**: 可以重置单个线程或所有线程的记忆
4. **持久化**: 使用 `MemorySaver` 持久化对话状态

## 应用场景

- 多用户对话系统
- 客服机器人会话管理
- 临时会话和持久会话
- 记忆清除和隐私保护

## 相关文档

- [持久化](/workflow/examples/persistence) - 状态持久化
- [等待用户输入](/workflow/examples/wait-user-input) - 会话中断
- [Checkpoint 机制](/workflow/graph/checkpoint) - Checkpoint 详解


