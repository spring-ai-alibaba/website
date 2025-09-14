---
title: 多智能体协作模式 (A2A)
description: 构建由多个独立的、通过网络协作的分布式智能体系统。
---

在之前的章节中，我们学习了如何在一个应用内部组合 `ReactAgent` 和 `FlowAgent`。现在，我们将探索一个更强大、更具扩展性的模式——**分布式多智能体协作 (Agent-to-Agent, A2A)**。

SAA 的 A2A 框架允许您将一个 Agent 的能力**服务化**，通过网络（如 HTTP）暴露出去，让其他任何应用中的 Agent 都能像调用本地函数一样调用它。这使得构建一个由多个微服务化、专业化的 Agent 组成的复杂“智能体社会”成为可能。

**A2A 模式的核心优势**:
-   **松耦合**: 每个 Agent 都是一个独立的服务，可以独立开发、部署、扩展和维护。
-   **语言无关**: 只要遵循 A2A 的通信协议，任何语言编写的 Agent 都可以加入协作网络（尽管当前 SAA 的实现主要关注 Java）。
-   **专业化与复用**: 您可以创建一个“代码执行 Agent”服务，然后任何其他需要此功能的应用都可以直接调用它，而无需重复实现。

## A2A 的三大核心组件

要理解 SAA 的 A2A 模式，需要认识三个关键组件：

1.  **Agent 服务 (Agent Service)**: 这是一个标准的网络服务（如 Spring Boot 应用），它包含一个或多个 Agent，并通过一个符合 A2A 协议的 API 端点将其能力暴露出来。
2.  **Agent 名片 (`AgentCard`)**: 这是一个元数据描述，包含了远程 Agent 的地址（URL）、能力、认证方式等信息。它就像一个可以被其他 Agent 发现和使用的“API 文档”。
3.  **远程代理 (`A2aRemoteAgent`)**: 在调用方，您使用 `A2aRemoteAgent` 来代表一个远程的 Agent。它封装了所有网络通信的细节，让您可以像调用一个本地 Agent 一样与其交互。

## 构建一个分布式 Agent 系统：端到端示例

接下来，我们将通过一个完整的例子，手把手教您构建一个包含“服务提供方”和“服务调用方”的 A2A 系统。

**场景**: 我们将创建一个独立的 **`CodeInterpreterService`**，它专门负责执行 Python 代码。然后，我们创建另一个 **`ManagerApp`**，它会远程调用这个代码服务来完成用户的请求。

### 1. 服务提供方：`CodeInterpreterService`

这是一个独立的 Spring Boot 项目。

#### ① 添加 A2A 依赖

首先，在 `pom.xml` 中确保您有 `spring-ai-alibaba-a2a-server-starter` 依赖。

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-a2a-server-starter</artifactId>
</dependency>
```

#### ② 创建专家 Agent

我们创建一个标准的 `ReactAgent` 作为代码专家。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class AgentConfiguration {

    @Bean
    public ReactAgent codeInterpreterAgent(ChatClient.Builder builder) throws GraphStateException {
        CodeExecutionTool codeExecutionTool = new CodeExecutionTool(); // 假设的工具
        return ReactAgent.builder()
                .name("CodeInterpreterAgent")
                .description("一个可以执行 Python 代码的专家。")
                .chatClient(builder.build())
                .tools(List.of(codeExecutionTool))
                .instruction("你是一个 Python 代码解释器。")
                .build();
    }
}
```

#### ③ 将 Agent 服务化

最关键的一步来了。我们需要创建一个 `@RestController`，并使用 SAA 提供的 `A2aJsonRpcControllerSupport` 来将我们的 Agent 快速暴露为符合 A2A 协议的 JSON-RPC 服务。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/agent")
public class AgentController extends A2aJsonRpcControllerSupport {

    @Autowired
    public AgentController(ReactAgent codeInterpreterAgent) throws GraphStateException {
        // 将 Agent 注册到 A2A 服务支持中
        super.registerAgent(codeInterpreterAgent);
    }

    // A2aJsonRpcControllerSupport 会自动处理 /card, /message/send, /message/stream 等端点
}
```
**就是这么简单！** 继承 `A2aJsonRpcControllerSupport` 并调用 `registerAgent` 后，您的 `codeInterpreterAgent` 现在已经是一个可以通过 `/agent` 路径访问的网络服务了。它会自动拥有：
-   `/agent/card`: 获取 Agent 名片的端点。
-   `/agent/message/send`: 接收同步调用请求的端点。
-   `/agent/message/stream`: 接收流式调用请求的端点。

现在，启动 `CodeInterpreterService` 应用。

### 2. 服务调用方：`ManagerApp`

这是另一个独立的 Spring Boot 项目。

#### ① 添加 A2A 依赖

在 `pom.xml` 中添加 `spring-ai-alibaba-graph-core`。

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-graph-core</artifactId>
</dependency>
```

#### ② 获取远程 Agent 的“名片”

在调用方的配置类中，我们首先需要获取远程代码专家的 `AgentCard`。

```java
import com.alibaba.cloud.ai.graph.agent.a2a.RemoteAgentCard;
import io.a2a.spec.AgentCard;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ManagerConfiguration {

    @Bean
    public AgentCard remoteCodeAgentCard() {
        // 远程服务的 AgentCard 地址
        String remoteAgentUrl = "http://localhost:8081/agent/card"; // 假设专家服务运行在 8081 端口
        return RemoteAgentCard.builder()
                .url(remoteAgentUrl)
                .build();
    }
}
```
`RemoteAgentCard.builder()` 会发起一个 HTTP 请求到指定的 URL，获取远程 Agent 的元数据。

#### ③ 创建远程代理 Agent

有了 `AgentCard`，我们就可以创建 `A2aRemoteAgent` 的实例，它将作为远程 Agent 在本地的代理。

```java
import com.alibaba.cloud.ai.graph.agent.a2a.A2aRemoteAgent;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import io.a2a.spec.AgentCard;
import org.springframework.context.annotation.Bean;

// ... in ManagerConfiguration.java

@Bean
public A2aRemoteAgent codeInterpreterProxyAgent(AgentCard remoteCodeAgentCard) throws GraphStateException {
    return A2aRemoteAgent.builder()
            .name("RemoteCodeInterpreter")
            .description("一个远程的代码执行专家。")
            .agentCard(remoteCodeAgentCard)
            // 如果远程 Agent 支持流式，这里可以开启
            .streaming(true) 
            .build();
}
```

#### ④ 调用远程 Agent

现在，最神奇的部分来了。我们可以将这个 `A2aRemoteAgent` 代理实例注入到任何服务中，像使用一个本地 `ReactAgent` 一样调用它，甚至可以将它作为一个 `Tool` 提供给另一个总管 Agent！

```java
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.a2a.A2aRemoteAgent;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

@Service
public class ManagerService {

    private final ReactAgent managerAgent;

    public ManagerService(A2aRemoteAgent codeInterpreterProxyAgent, ChatClient.Builder builder) throws GraphStateException {
        // 创建一个自定义工具来包装远程 Agent
        Function<String, String> remoteAgentFunction = (query) -> {
            try {
                Optional<OverAllState> result = codeInterpreterProxyAgent.invoke(Map.of("messages", query));
                if (result.isPresent()) {
                    List<Message> messages = result.get().value("messages", List.class).orElse(List.of());
                    if (!messages.isEmpty()) {
                        return messages.get(messages.size() - 1).getContent();
                    }
                }
                return "远程代理执行失败";
            } catch (GraphStateException | GraphRunnerException e) {
                return "远程代理执行出错: " + e.getMessage();
            }
        };
        
        // 将远程 Agent 包装为 ToolCallback
        ToolCallback remoteCodeTool = FunctionToolCallback.builder("RemoteCodeInterpreter", remoteAgentFunction)
                .description("一个远程的代码执行专家，可以执行 Python 代码")
                .inputType(String.class)
                .build();

        // 创建一个总管 Agent，并把远程工具注册给它
        this.managerAgent = ReactAgent.builder()
                .name("ManagerAgent")
                .chatClient(builder.build())
                .tools(List.of(remoteCodeTool))
                .instruction("你是一个项目经理，请将代码执行任务委派给你的专家工具。")
                .build();
    }

    public String delegateTask(String query) {
        Optional<OverAllState> result = managerAgent.invoke(Map.of("messages", query));
        if (result.isPresent()) {
            List<Message> messages = result.get().value("messages", List.class).orElse(List.of());
            if (!messages.isEmpty()) {
                return messages.get(messages.size() - 1).getContent();
            }
        }
        return "No result.";
    }
}
```

当您调用 `managerService.delegateTask("写一个 python 函数计算斐波那契数列")` 时，`managerAgent` 会思考并决定调用名为 `RemoteCodeInterpreter` 的工具。这个调用会被 `A2aRemoteAgent` 代理拦截，转换为一个 JSON-RPC HTTP 请求，发送到 `CodeInterpreterService` 的 `/agent/message/send` 端点。`CodeInterpreterService` 收到请求后，会调用它本地的 `codeInterpreterAgent` 来执行任务，并将结果通过 HTTP 响应返回。`ManagerApp` 收到响应后，再继续后续的流程。

整个过程对 `ManagerAgent` 来说是完全透明的，它根本不知道自己调用的工具背后是一个运行在另一台机器上的、完整的 Agent 服务。这就是 SAA A2A 框架的强大之处。 
