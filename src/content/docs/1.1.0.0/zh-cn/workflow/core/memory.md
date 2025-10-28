---
title: 内存管理
description: 使用 Spring AI Alibaba Graph 框架实现短期和长期内存管理，支持多轮对话和跨会话数据存储
keywords: [Spring AI Alibaba, 内存管理, 短期内存, 长期内存, 检查点, 会话管理]
---

# 内存管理

AI 应用程序需要内存来跨多个交互共享上下文。在 Spring AI Alibaba Graph 中，您可以添加两种类型的内存：

* [添加短期内存](#添加短期内存)作为智能体状态的一部分，以启用多轮对话。
* [添加长期内存](#添加长期内存)以跨会话存储用户特定或应用程序级别的数据。

## 添加短期内存

**短期内存**（线程级持久化）使智能体能够跟踪多轮对话。要添加短期内存：

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

// 创建内存检查点器
MemorySaver checkpointer = new MemorySaver();

SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, checkpointer)
    .build();

// 构建图
StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("agent", agentNode)
    .addEdge(START, "agent")
    .addEdge("agent", END);

// 使用检查点器编译图
CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);

// 使用线程 ID 调用图
RunnableConfig config = RunnableConfig.builder()
    .threadId("user-session-1")
    .build();

Map<String, Object> input = Map.of(
    "messages", List.of(
        Map.of("role", "user", "content", "你好！我是 Bob")
    )
);

graph.invoke(input, config);
```

### 生产环境使用

在生产环境中，使用由数据库支持的检查点器：

#### PostgreSQL 检查点器

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.PostgreSqlSaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

// PostgreSQL 配置
String dbUrl = "jdbc:postgresql://localhost:5432/graphdb";
String username = "postgres";
String password = "password";

PostgreSqlSaver postgresSaver = new PostgreSqlSaver(dbUrl, username, password);

SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.POSTGRES, postgresSaver)
    .build();

CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);
```

详细的 PostgreSQL 配置请参阅 [PostgreSQL 检查点持久化](./checkpoint-postgres.md)。

#### Redis 检查点器

```java
import com.alibaba.cloud.ai.graph.checkpoint.savers.RedisSaver;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.constant.SaverConstant;

// Redis 配置
String redisHost = "localhost";
int redisPort = 6379;

RedisSaver redisSaver = new RedisSaver(redisHost, redisPort);

SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.REDIS, redisSaver)
    .build();

CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);
```

### 完整示例：使用短期内存的多轮对话

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.chat.client.ChatClient;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

// 定义状态策略
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("messages", new AppendStrategy());
    return keyStrategyMap;
};

// 创建聊天节点
var chatNode = node_async(state -> {
    List<Map<String, String>> messages =
        (List<Map<String, String>>) state.value("messages").orElse(List.of());

    // 使用 ChatClient 调用 AI 模型
    ChatClient chatClient = chatClientBuilder.build();
    String response = chatClient.prompt()
        .user(messages.get(messages.size() - 1).get("content"))
        .call()
        .content();

    return Map.of("messages", List.of(
        Map.of("role", "assistant", "content", response)
    ));
});

// 构建图
StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("chat", chatNode)
    .addEdge(START, "chat")
    .addEdge("chat", END);

// 配置检查点
SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, new MemorySaver())
    .build();

// 编译图
CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);

// 第一轮对话
RunnableConfig config = RunnableConfig.builder()
    .threadId("conversation-1")
    .build();

graph.invoke(Map.of("messages", List.of(
    Map.of("role", "user", "content", "你好！我是 Bob")
)), config);

// 第二轮对话（使用相同的 threadId）
graph.invoke(Map.of("messages", List.of(
    Map.of("role", "user", "content", "我的名字是什么？")
)), config);
// AI 将能够记住之前的对话，回答 "Bob"
```

### 在子图中使用

如果您的图包含子图，您只需在编译父图时提供检查点器。Spring AI Alibaba Graph 将自动将检查点器传播到子图。

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import static com.alibaba.cloud.ai.graph.StateGraph.START;

// 定义状态
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("foo", new ReplaceStrategy());
    return keyStrategyMap;
};

// 子图
var subgraphNode = node_async(state -> {
    String foo = (String) state.value("foo").orElse("");
    return Map.of("foo", foo + "bar");
});

StateGraph subgraphBuilder = new StateGraph(keyStrategyFactory)
    .addNode("subgraph_node_1", subgraphNode)
    .addEdge(START, "subgraph_node_1");

// 子图不需要检查点器
CompiledGraph subgraph = subgraphBuilder.compile();

// 父图
StateGraph parentBuilder = new StateGraph(keyStrategyFactory)
    .addNode("node_1", state -> {
        // 调用子图
        return subgraph.invoke(state.data(),
            RunnableConfig.builder().build());
    })
    .addEdge(START, "node_1");

// 只在父图编译时提供检查点器
SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, new MemorySaver())
    .build();

CompiledGraph graph = parentBuilder.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);
```

如果您希望子图拥有自己的内存，可以使用适当的检查点器选项编译它。这在多智能体系统中很有用，如果您希望智能体跟踪其内部消息历史。

## 添加长期内存

使用长期内存跨对话存储用户特定或应用程序特定的数据。

长期内存可以通过以下方式实现：

### 使用外部数据库

您可以在节点中直接访问外部数据库来存储和检索长期数据：

```java
import org.springframework.jdbc.core.JdbcTemplate;

// 在节点中使用数据库存储用户信息
var userProfileNode = node_async(state -> {
    String userId = (String) state.value("userId").orElse("");

    // 从数据库获取用户配置
    JdbcTemplate jdbcTemplate = ...; // Spring Bean
    Map<String, Object> userProfile = jdbcTemplate.queryForMap(
        "SELECT * FROM user_profiles WHERE user_id = ?", userId
    );

    return Map.of("userProfile", userProfile);
});
```

### 使用 Redis 缓存

```java
import org.springframework.data.redis.core.RedisTemplate;

var cacheNode = node_async(state -> {
    String key = (String) state.value("cacheKey").orElse("");

    RedisTemplate<String, Object> redisTemplate = ...; // Spring Bean

    // 尝试从缓存获取
    Object cachedData = redisTemplate.opsForValue().get(key);

    if (cachedData == null) {
        // 执行计算或查询
        cachedData = performExpensiveOperation();

        // 存储到缓存
        redisTemplate.opsForValue().set(key, cachedData);
    }

    return Map.of("result", cachedData);
});
```

### 最佳实践

1. **分离关注点**：短期内存用于对话上下文，长期内存用于用户偏好和历史数据。

2. **性能优化**：对于频繁访问的长期数据，使用缓存层（如 Redis）。

3. **数据一致性**：确保长期内存的读写操作是原子的或使用适当的事务管理。

4. **隐私和安全**：对敏感的长期数据进行加密和访问控制。

5. **清理策略**：实施适当的数据保留和清理策略，避免无限增长。

## 完整示例：结合短期和长期内存

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.ai.chat.client.ChatClient;

// 定义状态
KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> keyStrategyMap = new HashMap<>();
    keyStrategyMap.put("userId", new ReplaceStrategy());
    keyStrategyMap.put("messages", new AppendStrategy());
    keyStrategyMap.put("userPreferences", new ReplaceStrategy());
    return keyStrategyMap;
};

// 加载用户偏好（长期内存）
var loadUserPreferences = node_async(state -> {
    String userId = (String) state.value("userId").orElse("");

    // 从数据库加载用户偏好
    JdbcTemplate jdbcTemplate = ...;
    Map<String, Object> preferences = jdbcTemplate.queryForMap(
        "SELECT * FROM user_preferences WHERE user_id = ?", userId
    );

    return Map.of("userPreferences", preferences);
});

// 聊天节点（使用短期和长期内存）
var chatNode = node_async(state -> {
    List<Map<String, String>> messages =
        (List<Map<String, String>>) state.value("messages").orElse(List.of());
    Map<String, Object> preferences =
        (Map<String, Object>) state.value("userPreferences").orElse(Map.of());

    // 构建包含用户偏好的提示
    String userPrompt = messages.get(messages.size() - 1).get("content");
    String enhancedPrompt = "用户偏好: " + preferences + "\n用户问题: " + userPrompt;

    // 调用 AI
    ChatClient chatClient = chatClientBuilder.build();
    String response = chatClient.prompt()
        .user(enhancedPrompt)
        .call()
        .content();

    return Map.of("messages", List.of(
        Map.of("role", "assistant", "content", response)
    ));
});

// 构建图
StateGraph stateGraph = new StateGraph(keyStrategyFactory)
    .addNode("load_preferences", loadUserPreferences)
    .addNode("chat", chatNode)
    .addEdge(START, "load_preferences")
    .addEdge("load_preferences", "chat")
    .addEdge("chat", END);

// 配置检查点（短期内存）
SaverConfig saverConfig = SaverConfig.builder()
    .register(SaverConstant.MEMORY, new MemorySaver())
    .build();

// 编译图
CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .saverConfig(saverConfig)
        .build()
);

// 执行
RunnableConfig config = RunnableConfig.builder()
    .threadId("user-123-session-1")
    .build();

graph.invoke(Map.of(
    "userId", "user-123",
    "messages", List.of(
        Map.of("role", "user", "content", "推荐一部电影")
    )
), config);
```

通过这种方式，您的应用程序可以同时利用短期内存（对话历史）和长期内存（用户偏好），提供更个性化和上下文感知的体验。

<Accordion title="Example: using Postgres checkpointer">
  ```
  pip install -U "psycopg[binary,pool]" langgraph langgraph-checkpoint-postgres
  ```

  <Tip>
    You need to call `checkpointer.setup()` the first time you're using Postgres checkpointer
  </Tip>

  <Tabs>
    <Tab title="Sync">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.postgres import PostgresSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"
      with PostgresSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]
          # checkpointer.setup()

          def call_model(state: MessagesState):
              response = model.invoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>

    <Tab title="Async">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"
      async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]
          # await checkpointer.setup()

          async def call_model(state: MessagesState):
              response = await model.ainvoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>
  </Tabs>
</Accordion>

<Accordion title="Example: using [MongoDB](https://pypi.org/project/langgraph-checkpoint-mongodb/) checkpointer">
  ```
  pip install -U pymongo langgraph langgraph-checkpoint-mongodb
  ```

  <Note>
    **Setup**
    To use the MongoDB checkpointer, you will need a MongoDB cluster. Follow [this guide](https://www.mongodb.com/docs/guides/atlas/cluster/) to create a cluster if you don't already have one.
  </Note>

  <Tabs>
    <Tab title="Sync">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.mongodb import MongoDBSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "localhost:27017"
      with MongoDBSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]

          def call_model(state: MessagesState):
              response = model.invoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>

    <Tab title="Async">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "localhost:27017"
      async with AsyncMongoDBSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]

          async def call_model(state: MessagesState):
              response = await model.ainvoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>
  </Tabs>
</Accordion>

<Accordion title="Example: using [Redis](https://pypi.org/project/langgraph-checkpoint-redis/) checkpointer">
  ```
  pip install -U langgraph langgraph-checkpoint-redis
  ```

  <Tip>
    You need to call `checkpointer.setup()` the first time you're using Redis checkpointer
  </Tip>

  <Tabs>
    <Tab title="Sync">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.redis import RedisSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "redis://localhost:6379"
      with RedisSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]
          # checkpointer.setup()

          def call_model(state: MessagesState):
              response = model.invoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>

    <Tab title="Async">
      ```python  theme={null}
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.redis.aio import AsyncRedisSaver  # [!code highlight]

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "redis://localhost:6379"
      async with AsyncRedisSaver.from_conn_string(DB_URI) as checkpointer:  # [!code highlight]
          # await checkpointer.asetup()

          async def call_model(state: MessagesState):
              response = await model.ainvoke(state["messages"])
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]

          config = {
              "configurable": {
                  "thread_id": "1"  # [!code highlight]
              }
          }

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "what's my name?"}]},
              config,  # [!code highlight]
              stream_mode="values"
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>
  </Tabs>
</Accordion>

### Use in subgraphs

If your graph contains [subgraphs](/oss/python/langgraph/use-subgraphs), you only need to provide the checkpointer when compiling the parent graph. LangGraph will automatically propagate the checkpointer to the child subgraphs.

```python  theme={null}
from langgraph.graph import START, StateGraph
from langgraph.checkpoint.memory import InMemorySaver
from typing import TypedDict

class State(TypedDict):
    foo: str

# Subgraph

def subgraph_node_1(state: State):
    return {"foo": state["foo"] + "bar"}

subgraph_builder = StateGraph(State)
subgraph_builder.add_node(subgraph_node_1)
subgraph_builder.add_edge(START, "subgraph_node_1")
subgraph = subgraph_builder.compile()  # [!code highlight]

# Parent graph

builder = StateGraph(State)
builder.add_node("node_1", subgraph)  # [!code highlight]
builder.add_edge(START, "node_1")

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)  # [!code highlight]
```

If you want the subgraph to have its own memory, you can compile it with the appropriate checkpointer option. This is useful in [multi-agent](/oss/python/langchain/multi-agent) systems, if you want agents to keep track of their internal message histories.

```python  theme={null}
subgraph_builder = StateGraph(...)
subgraph = subgraph_builder.compile(checkpointer=True)  # [!code highlight]
```

## Add long-term memory

Use long-term memory to store user-specific or application-specific data across conversations.

```python  theme={null}
from langgraph.store.memory import InMemoryStore  # [!code highlight]
from langgraph.graph import StateGraph

store = InMemoryStore()  # [!code highlight]

builder = StateGraph(...)
graph = builder.compile(store=store)  # [!code highlight]
```

### Use in production

In production, use a store backed by a database:

```python  theme={null}
from langgraph.store.postgres import PostgresStore

DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"
with PostgresStore.from_conn_string(DB_URI) as store:  # [!code highlight]
    builder = StateGraph(...)
    graph = builder.compile(store=store)  # [!code highlight]
```

<Accordion title="Example: using Postgres store">
  ```
  pip install -U "psycopg[binary,pool]" langgraph langgraph-checkpoint-postgres
  ```

  <Tip>
    You need to call `store.setup()` the first time you're using Postgres store
  </Tip>

  <Tabs>
    <Tab title="Sync">
      ```python  theme={null}
      from langchain_core.runnables import RunnableConfig
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.postgres import PostgresSaver
      from langgraph.store.postgres import PostgresStore  # [!code highlight]
      from langgraph.store.base import BaseStore

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"

      with (
          PostgresStore.from_conn_string(DB_URI) as store,  # [!code highlight]
          PostgresSaver.from_conn_string(DB_URI) as checkpointer,
      ):
          # store.setup()
          # checkpointer.setup()

          def call_model(
              state: MessagesState,
              config: RunnableConfig,
              *,
              store: BaseStore,  # [!code highlight]
          ):
              user_id = config["configurable"]["user_id"]
              namespace = ("memories", user_id)
              memories = store.search(namespace, query=str(state["messages"][-1].content))  # [!code highlight]
              info = "\n".join([d.value["data"] for d in memories])
              system_msg = f"You are a helpful assistant talking to the user. User info: {info}"

              # Store new memories if the user asks the model to remember
              last_message = state["messages"][-1]
              if "remember" in last_message.content.lower():
                  memory = "User name is Bob"
                  store.put(namespace, str(uuid.uuid4()), {"data": memory})  # [!code highlight]

              response = model.invoke(
                  [{"role": "system", "content": system_msg}] + state["messages"]
              )
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(
              checkpointer=checkpointer,
              store=store,  # [!code highlight]
          )

          config = {
              "configurable": {
                  "thread_id": "1",  # [!code highlight]
                  "user_id": "1",  # [!code highlight]
              }
          }
          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "Hi! Remember: my name is Bob"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()

          config = {
              "configurable": {
                  "thread_id": "2",  # [!code highlight]
                  "user_id": "1",
              }
          }

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "what is my name?"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>

    <Tab title="Async">
      ```python  theme={null}
      from langchain_core.runnables import RunnableConfig
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
      from langgraph.store.postgres.aio import AsyncPostgresStore  # [!code highlight]
      from langgraph.store.base import BaseStore

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"

      async with (
          AsyncPostgresStore.from_conn_string(DB_URI) as store,  # [!code highlight]
          AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer,
      ):
          # await store.setup()
          # await checkpointer.setup()

          async def call_model(
              state: MessagesState,
              config: RunnableConfig,
              *,
              store: BaseStore,  # [!code highlight]
          ):
              user_id = config["configurable"]["user_id"]
              namespace = ("memories", user_id)
              memories = await store.asearch(namespace, query=str(state["messages"][-1].content))  # [!code highlight]
              info = "\n".join([d.value["data"] for d in memories])
              system_msg = f"You are a helpful assistant talking to the user. User info: {info}"

              # Store new memories if the user asks the model to remember
              last_message = state["messages"][-1]
              if "remember" in last_message.content.lower():
                  memory = "User name is Bob"
                  await store.aput(namespace, str(uuid.uuid4()), {"data": memory})  # [!code highlight]

              response = await model.ainvoke(
                  [{"role": "system", "content": system_msg}] + state["messages"]
              )
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(
              checkpointer=checkpointer,
              store=store,  # [!code highlight]
          )

          config = {
              "configurable": {
                  "thread_id": "1",  # [!code highlight]
                  "user_id": "1",  # [!code highlight]
              }
          }
          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "Hi! Remember: my name is Bob"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()

          config = {
              "configurable": {
                  "thread_id": "2",  # [!code highlight]
                  "user_id": "1",
              }
          }

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "what is my name?"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>
  </Tabs>
</Accordion>

<Accordion title="Example: using [Redis](https://pypi.org/project/langgraph-checkpoint-redis/) store">
  ```
  pip install -U langgraph langgraph-checkpoint-redis
  ```

  <Tip>
    You need to call `store.setup()` the first time you're using Redis store
  </Tip>

  <Tabs>
    <Tab title="Sync">
      ```python  theme={null}
      from langchain_core.runnables import RunnableConfig
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.redis import RedisSaver
      from langgraph.store.redis import RedisStore  # [!code highlight]
      from langgraph.store.base import BaseStore

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "redis://localhost:6379"

      with (
          RedisStore.from_conn_string(DB_URI) as store,  # [!code highlight]
          RedisSaver.from_conn_string(DB_URI) as checkpointer,
      ):
          store.setup()
          checkpointer.setup()

          def call_model(
              state: MessagesState,
              config: RunnableConfig,
              *,
              store: BaseStore,  # [!code highlight]
          ):
              user_id = config["configurable"]["user_id"]
              namespace = ("memories", user_id)
              memories = store.search(namespace, query=str(state["messages"][-1].content))  # [!code highlight]
              info = "\n".join([d.value["data"] for d in memories])
              system_msg = f"You are a helpful assistant talking to the user. User info: {info}"

              # Store new memories if the user asks the model to remember
              last_message = state["messages"][-1]
              if "remember" in last_message.content.lower():
                  memory = "User name is Bob"
                  store.put(namespace, str(uuid.uuid4()), {"data": memory})  # [!code highlight]

              response = model.invoke(
                  [{"role": "system", "content": system_msg}] + state["messages"]
              )
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(
              checkpointer=checkpointer,
              store=store,  # [!code highlight]
          )

          config = {
              "configurable": {
                  "thread_id": "1",  # [!code highlight]
                  "user_id": "1",  # [!code highlight]
              }
          }
          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "Hi! Remember: my name is Bob"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()

          config = {
              "configurable": {
                  "thread_id": "2",  # [!code highlight]
                  "user_id": "1",
              }
          }

          for chunk in graph.stream(
              {"messages": [{"role": "user", "content": "what is my name?"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>

    <Tab title="Async">
      ```python  theme={null}
      from langchain_core.runnables import RunnableConfig
      from langchain.chat_models import init_chat_model
      from langgraph.graph import StateGraph, MessagesState, START
      from langgraph.checkpoint.redis.aio import AsyncRedisSaver
      from langgraph.store.redis.aio import AsyncRedisStore  # [!code highlight]
      from langgraph.store.base import BaseStore

      model = init_chat_model(model="anthropic:claude-3-5-haiku-latest")

      DB_URI = "redis://localhost:6379"

      async with (
          AsyncRedisStore.from_conn_string(DB_URI) as store,  # [!code highlight]
          AsyncRedisSaver.from_conn_string(DB_URI) as checkpointer,
      ):
          # await store.setup()
          # await checkpointer.asetup()

          async def call_model(
              state: MessagesState,
              config: RunnableConfig,
              *,
              store: BaseStore,  # [!code highlight]
          ):
              user_id = config["configurable"]["user_id"]
              namespace = ("memories", user_id)
              memories = await store.asearch(namespace, query=str(state["messages"][-1].content))  # [!code highlight]
              info = "\n".join([d.value["data"] for d in memories])
              system_msg = f"You are a helpful assistant talking to the user. User info: {info}"

              # Store new memories if the user asks the model to remember
              last_message = state["messages"][-1]
              if "remember" in last_message.content.lower():
                  memory = "User name is Bob"
                  await store.aput(namespace, str(uuid.uuid4()), {"data": memory})  # [!code highlight]

              response = await model.ainvoke(
                  [{"role": "system", "content": system_msg}] + state["messages"]
              )
              return {"messages": response}

          builder = StateGraph(MessagesState)
          builder.add_node(call_model)
          builder.add_edge(START, "call_model")

          graph = builder.compile(
              checkpointer=checkpointer,
              store=store,  # [!code highlight]
          )

          config = {
              "configurable": {
                  "thread_id": "1",  # [!code highlight]
                  "user_id": "1",  # [!code highlight]
              }
          }
          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "Hi! Remember: my name is Bob"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()

          config = {
              "configurable": {
                  "thread_id": "2",  # [!code highlight]
                  "user_id": "1",
              }
          }

          async for chunk in graph.astream(
              {"messages": [{"role": "user", "content": "what is my name?"}]},
              config,  # [!code highlight]
              stream_mode="values",
          ):
              chunk["messages"][-1].pretty_print()
      ```
    </Tab>
  </Tabs>
</Accordion>

### Use semantic search

Enable semantic search in your graph's memory store to let graph agents search for items in the store by semantic similarity.

```python  theme={null}
from langchain.embeddings import init_embeddings
from langgraph.store.memory import InMemoryStore

# Create store with semantic search enabled
embeddings = init_embeddings("openai:text-embedding-3-small")
store = InMemoryStore(
    index={
        "embed": embeddings,
        "dims": 1536,
    }
)

store.put(("user_123", "memories"), "1", {"text": "I love pizza"})
store.put(("user_123", "memories"), "2", {"text": "I am a plumber"})

items = store.search(
    ("user_123", "memories"), query="I'm hungry", limit=1
)
```

<Accordion title="Long-term memory with semantic search">
  ```python  theme={null}

  from langchain.embeddings import init_embeddings
  from langchain.chat_models import init_chat_model
  from langgraph.store.base import BaseStore
  from langgraph.store.memory import InMemoryStore
  from langgraph.graph import START, MessagesState, StateGraph

  model = init_chat_model("openai:gpt-4o-mini")

  # Create store with semantic search enabled
  embeddings = init_embeddings("openai:text-embedding-3-small")
  store = InMemoryStore(
      index={
          "embed": embeddings,
          "dims": 1536,
      }
  )

  store.put(("user_123", "memories"), "1", {"text": "I love pizza"})
  store.put(("user_123", "memories"), "2", {"text": "I am a plumber"})

  def chat(state, *, store: BaseStore):
      # Search based on user's last message
      items = store.search(
          ("user_123", "memories"), query=state["messages"][-1].content, limit=2
      )
      memories = "\n".join(item.value["text"] for item in items)
      memories = f"## Memories of user\n{memories}" if memories else ""
      response = model.invoke(
          [
              {"role": "system", "content": f"You are a helpful assistant.\n{memories}"},
              *state["messages"],
          ]
      )
      return {"messages": [response]}


  builder = StateGraph(MessagesState)
  builder.add_node(chat)
  builder.add_edge(START, "chat")
  graph = builder.compile(store=store)

  for message, metadata in graph.stream(
      input={"messages": [{"role": "user", "content": "I'm hungry"}]},
      stream_mode="messages",
  ):
      print(message.content, end="")
  ```
</Accordion>

## Manage short-term memory

With [short-term memory](#add-short-term-memory) enabled, long conversations can exceed the LLM's context window. Common solutions are:

* [Trim messages](#trim-messages): Remove first or last N messages (before calling LLM)
* [Delete messages](#delete-messages) from LangGraph state permanently
* [Summarize messages](#summarize-messages): Summarize earlier messages in the history and replace them with a summary
* [Manage checkpoints](#manage-checkpoints) to store and retrieve message history
* Custom strategies (e.g., message filtering, etc.)

This allows the agent to keep track of the conversation without exceeding the LLM's context window.

### Trim messages

Most LLMs have a maximum supported context window (denominated in tokens). One way to decide when to truncate messages is to count the tokens in the message history and truncate whenever it approaches that limit. If you're using LangChain, you can use the trim messages utility and specify the number of tokens to keep from the list, as well as the `strategy` (e.g., keep the last `max_tokens`) to use for handling the boundary.

To trim message history, use the [`trim_messages`](https://python.langchain.com/api_reference/core/messages/langchain_core.messages.utils.trim_messages.html) function:

```python  theme={null}
from langchain_core.messages.utils import (  # [!code highlight]
    trim_messages,  # [!code highlight]
    count_tokens_approximately  # [!code highlight]
)  # [!code highlight]

def call_model(state: MessagesState):
    messages = trim_messages(  # [!code highlight]
        state["messages"],
        strategy="last",
        token_counter=count_tokens_approximately,
        max_tokens=128,
        start_on="human",
        end_on=("human", "tool"),
    )
    response = model.invoke(messages)
    return {"messages": [response]}

builder = StateGraph(MessagesState)
builder.add_node(call_model)
...
```

<Accordion title="Full example: trim messages">
  ```python  theme={null}
  from langchain_core.messages.utils import (
      trim_messages,  # [!code highlight]
      count_tokens_approximately  # [!code highlight]
  )
  from langchain.chat_models import init_chat_model
  from langgraph.graph import StateGraph, START, MessagesState

  model = init_chat_model("anthropic:claude-sonnet-4-5")
  summarization_model = model.bind(max_tokens=128)

  def call_model(state: MessagesState):
      messages = trim_messages(  # [!code highlight]
          state["messages"],
          strategy="last",
          token_counter=count_tokens_approximately,
          max_tokens=128,
          start_on="human",
          end_on=("human", "tool"),
      )
      response = model.invoke(messages)
      return {"messages": [response]}

  checkpointer = InMemorySaver()
  builder = StateGraph(MessagesState)
  builder.add_node(call_model)
  builder.add_edge(START, "call_model")
  graph = builder.compile(checkpointer=checkpointer)

  config = {"configurable": {"thread_id": "1"}}
  graph.invoke({"messages": "hi, my name is bob"}, config)
  graph.invoke({"messages": "write a short poem about cats"}, config)
  graph.invoke({"messages": "now do the same but for dogs"}, config)
  final_response = graph.invoke({"messages": "what's my name?"}, config)

  final_response["messages"][-1].pretty_print()
  ```

  ```
  ================================== Ai Message ==================================

  Your name is Bob, as you mentioned when you first introduced yourself.
  ```
</Accordion>

### Delete messages

You can delete messages from the graph state to manage the message history. This is useful when you want to remove specific messages or clear the entire message history.

To delete messages from the graph state, you can use the `RemoveMessage`. For `RemoveMessage` to work, you need to use a state key with [`add_messages`](https://reference.langchain.com/python/langgraph/graphs/#langgraph.graph.message.add_messages) [reducer](/oss/python/langgraph/graph-api#reducers), like [`MessagesState`](/oss/python/langgraph/graph-api#messagesstate).

To remove specific messages:

```python  theme={null}
from langchain.messages import RemoveMessage  # [!code highlight]

def delete_messages(state):
    messages = state["messages"]
    if len(messages) > 2:
        # remove the earliest two messages
        return {"messages": [RemoveMessage(id=m.id) for m in messages[:2]]}  # [!code highlight]
```

To remove **all** messages:

```python  theme={null}
from langgraph.graph.message import REMOVE_ALL_MESSAGES  # [!code highlight]

def delete_messages(state):
    return {"messages": [RemoveMessage(id=REMOVE_ALL_MESSAGES)]}  # [!code highlight]
```

<Warning>
  When deleting messages, **make sure** that the resulting message history is valid. Check the limitations of the LLM provider you're using. For example:

  * some providers expect message history to start with a `user` message
  * most providers require `assistant` messages with tool calls to be followed by corresponding `tool` result messages.
</Warning>

<Accordion title="Full example: delete messages">
  ```python  theme={null}
  from langchain.messages import RemoveMessage  # [!code highlight]

  def delete_messages(state):
      messages = state["messages"]
      if len(messages) > 2:
          # remove the earliest two messages
          return {"messages": [RemoveMessage(id=m.id) for m in messages[:2]]}  # [!code highlight]

  def call_model(state: MessagesState):
      response = model.invoke(state["messages"])
      return {"messages": response}

  builder = StateGraph(MessagesState)
  builder.add_sequence([call_model, delete_messages])
  builder.add_edge(START, "call_model")

  checkpointer = InMemorySaver()
  app = builder.compile(checkpointer=checkpointer)

  for event in app.stream(
      {"messages": [{"role": "user", "content": "hi! I'm bob"}]},
      config,
      stream_mode="values"
  ):
      print([(message.type, message.content) for message in event["messages"]])

  for event in app.stream(
      {"messages": [{"role": "user", "content": "what's my name?"}]},
      config,
      stream_mode="values"
  ):
      print([(message.type, message.content) for message in event["messages"]])
  ```

  ```
  [('human', "hi! I'm bob")]
  [('human', "hi! I'm bob"), ('ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?')]
  [('human', "hi! I'm bob"), ('ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?'), ('human', "what's my name?")]
  [('human', "hi! I'm bob"), ('ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?'), ('human', "what's my name?"), ('ai', 'Your name is Bob.')]
  [('human', "what's my name?"), ('ai', 'Your name is Bob.')]
  ```
</Accordion>

### Summarize messages

The problem with trimming or removing messages, as shown above, is that you may lose information from culling of the message queue. Because of this, some applications benefit from a more sophisticated approach of summarizing the message history using a chat model.

<img src="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=c8ed3facdccd4ef5c7e52902c72ba938" alt="" data-og-width="609" width="609" data-og-height="242" height="242" data-path="oss/images/summary.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=280&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4208b9b0cc9f459f3dc4e5219918471b 280w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=560&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=7acb77c081545f57042368f4e9d0c8cb 560w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=840&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=2fcfdb0c481d2e1d361e76db763a41e5 840w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1100&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4abdac693a562788aa0db8681bef8ea7 1100w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1650&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=40acfefa91dcb11b247a6e4a7705f22b 1650w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=2500&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=8d765aaf7551e8b0fc2720de7d2ac2a8 2500w" />

Prompting and orchestration logic can be used to summarize the message history. For example, in LangGraph you can extend the [`MessagesState`](/oss/python/langgraph/graph-api#working-with-messages-in-graph-state) to include a `summary` key:

```python  theme={null}
from langgraph.graph import MessagesState
class State(MessagesState):
    summary: str
```

Then, you can generate a summary of the chat history, using any existing summary as context for the next summary. This `summarize_conversation` node can be called after some number of messages have accumulated in the `messages` state key.

```python  theme={null}
def summarize_conversation(state: State):

    # First, we get any existing summary
    summary = state.get("summary", "")

    # Create our summarization prompt
    if summary:

        # A summary already exists
        summary_message = (
            f"This is a summary of the conversation to date: {summary}\n\n"
            "Extend the summary by taking into account the new messages above:"
        )

    else:
        summary_message = "Create a summary of the conversation above:"

    # Add prompt to our history
    messages = state["messages"] + [HumanMessage(content=summary_message)]
    response = model.invoke(messages)

    # Delete all but the 2 most recent messages
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    return {"summary": response.content, "messages": delete_messages}
```

<Accordion title="Full example: summarize messages">
  ```python  theme={null}
  from typing import Any, TypedDict

  from langchain.chat_models import init_chat_model
  from langchain.messages import AnyMessage
  from langchain_core.messages.utils import count_tokens_approximately
  from langgraph.graph import StateGraph, START, MessagesState
  from langgraph.checkpoint.memory import InMemorySaver
  from langmem.short_term import SummarizationNode, RunningSummary  # [!code highlight]

  model = init_chat_model("anthropic:claude-sonnet-4-5")
  summarization_model = model.bind(max_tokens=128)

  class State(MessagesState):
      context: dict[str, RunningSummary]  # [!code highlight]

  class LLMInputState(TypedDict):  # [!code highlight]
      summarized_messages: list[AnyMessage]
      context: dict[str, RunningSummary]

  summarization_node = SummarizationNode(  # [!code highlight]
      token_counter=count_tokens_approximately,
      model=summarization_model,
      max_tokens=256,
      max_tokens_before_summary=256,
      max_summary_tokens=128,
  )

  def call_model(state: LLMInputState):  # [!code highlight]
      response = model.invoke(state["summarized_messages"])
      return {"messages": [response]}

  checkpointer = InMemorySaver()
  builder = StateGraph(State)
  builder.add_node(call_model)
  builder.add_node("summarize", summarization_node)  # [!code highlight]
  builder.add_edge(START, "summarize")
  builder.add_edge("summarize", "call_model")
  graph = builder.compile(checkpointer=checkpointer)

  # Invoke the graph
  config = {"configurable": {"thread_id": "1"}}
  graph.invoke({"messages": "hi, my name is bob"}, config)
  graph.invoke({"messages": "write a short poem about cats"}, config)
  graph.invoke({"messages": "now do the same but for dogs"}, config)
  final_response = graph.invoke({"messages": "what's my name?"}, config)

  final_response["messages"][-1].pretty_print()
  print("\nSummary:", final_response["context"]["running_summary"].summary)
  ```

  1. We will keep track of our running summary in the `context` field

  (expected by the `SummarizationNode`).

  1. Define private state that will be used only for filtering

  the inputs to `call_model` node.

  1. We're passing a private input state here to isolate the messages returned by the summarization node

  ```
  ================================== Ai Message ==================================

  From our conversation, I can see that you introduced yourself as Bob. That's the name you shared with me when we began talking.

  Summary: In this conversation, I was introduced to Bob, who then asked me to write a poem about cats. I composed a poem titled "The Mystery of Cats" that captured cats' graceful movements, independent nature, and their special relationship with humans. Bob then requested a similar poem about dogs, so I wrote "The Joy of Dogs," which highlighted dogs' loyalty, enthusiasm, and loving companionship. Both poems were written in a similar style but emphasized the distinct characteristics that make each pet special.
  ```
</Accordion>

### Manage checkpoints

You can view and delete the information stored by the checkpointer.

<a id="checkpoint" />

#### View thread state

<Tabs>
  <Tab title="Graph/Functional API">
    ```python  theme={null}
    config = {
        "configurable": {
            "thread_id": "1",  # [!code highlight]
            # optionally provide an ID for a specific checkpoint,
            # otherwise the latest checkpoint is shown
            # "checkpoint_id": "1f029ca3-1f5b-6704-8004-820c16b69a5a"  # [!code highlight]

        }
    }
    graph.get_state(config)  # [!code highlight]
    ```

    ```
    StateSnapshot(
        values={'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today?), HumanMessage(content="what's my name?"), AIMessage(content='Your name is Bob.')]}, next=(),
        config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1f5b-6704-8004-820c16b69a5a'}},
        metadata={
            'source': 'loop',
            'writes': {'call_model': {'messages': AIMessage(content='Your name is Bob.')}},
            'step': 4,
            'parents': {},
            'thread_id': '1'
        },
        created_at='2025-05-05T16:01:24.680462+00:00',
        parent_config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
        tasks=(),
        interrupts=()
    )
    ```
  </Tab>

  <Tab title="Checkpointer API">
    ```python  theme={null}
    config = {
        "configurable": {
            "thread_id": "1",  # [!code highlight]
            # optionally provide an ID for a specific checkpoint,
            # otherwise the latest checkpoint is shown
            # "checkpoint_id": "1f029ca3-1f5b-6704-8004-820c16b69a5a"  # [!code highlight]

        }
    }
    checkpointer.get_tuple(config)  # [!code highlight]
    ```

    ```
    CheckpointTuple(
        config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1f5b-6704-8004-820c16b69a5a'}},
        checkpoint={
            'v': 3,
            'ts': '2025-05-05T16:01:24.680462+00:00',
            'id': '1f029ca3-1f5b-6704-8004-820c16b69a5a',
            'channel_versions': {'__start__': '00000000000000000000000000000005.0.5290678567601859', 'messages': '00000000000000000000000000000006.0.3205149138784782', 'branch:to:call_model': '00000000000000000000000000000006.0.14611156755133758'}, 'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000004.0.5736472536395331'}, 'call_model': {'branch:to:call_model': '00000000000000000000000000000005.0.1410174088651449'}},
            'channel_values': {'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today?), HumanMessage(content="what's my name?"), AIMessage(content='Your name is Bob.')]},
        },
        metadata={
            'source': 'loop',
            'writes': {'call_model': {'messages': AIMessage(content='Your name is Bob.')}},
            'step': 4,
            'parents': {},
            'thread_id': '1'
        },
        parent_config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
        pending_writes=[]
    )
    ```
  </Tab>
</Tabs>

<a id="checkpoints" />

#### View the history of the thread

<Tabs>
  <Tab title="Graph/Functional API">
    ```python  theme={null}
    config = {
        "configurable": {
            "thread_id": "1"  # [!code highlight]
        }
    }
    list(graph.get_state_history(config))  # [!code highlight]
    ```

    ```
    [
        StateSnapshot(
            values={'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?'), HumanMessage(content="what's my name?"), AIMessage(content='Your name is Bob.')]},
            next=(),
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1f5b-6704-8004-820c16b69a5a'}},
            metadata={'source': 'loop', 'writes': {'call_model': {'messages': AIMessage(content='Your name is Bob.')}}, 'step': 4, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:24.680462+00:00',
            parent_config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
            tasks=(),
            interrupts=()
        ),
        StateSnapshot(
            values={'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?'), HumanMessage(content="what's my name?")]},
            next=('call_model',),
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
            metadata={'source': 'loop', 'writes': None, 'step': 3, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:23.863421+00:00',
            parent_config={...}
            tasks=(PregelTask(id='8ab4155e-6b15-b885-9ce5-bed69a2c305c', name='call_model', path=('__pregel_pull', 'call_model'), error=None, interrupts=(), state=None, result={'messages': AIMessage(content='Your name is Bob.')}),),
            interrupts=()
        ),
        StateSnapshot(
            values={'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')]},
            next=('__start__',),
            config={...},
            metadata={'source': 'input', 'writes': {'__start__': {'messages': [{'role': 'user', 'content': "what's my name?"}]}}, 'step': 2, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:23.863173+00:00',
            parent_config={...}
            tasks=(PregelTask(id='24ba39d6-6db1-4c9b-f4c5-682aeaf38dcd', name='__start__', path=('__pregel_pull', '__start__'), error=None, interrupts=(), state=None, result={'messages': [{'role': 'user', 'content': "what's my name?"}]}),),
            interrupts=()
        ),
        StateSnapshot(
            values={'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')]},
            next=(),
            config={...},
            metadata={'source': 'loop', 'writes': {'call_model': {'messages': AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')}}, 'step': 1, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:23.862295+00:00',
            parent_config={...}
            tasks=(),
            interrupts=()
        ),
        StateSnapshot(
            values={'messages': [HumanMessage(content="hi! I'm bob")]},
            next=('call_model',),
            config={...},
            metadata={'source': 'loop', 'writes': None, 'step': 0, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:22.278960+00:00',
            parent_config={...}
            tasks=(PregelTask(id='8cbd75e0-3720-b056-04f7-71ac805140a0', name='call_model', path=('__pregel_pull', 'call_model'), error=None, interrupts=(), state=None, result={'messages': AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')}),),
            interrupts=()
        ),
        StateSnapshot(
            values={'messages': []},
            next=('__start__',),
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-0870-6ce2-bfff-1f3f14c3e565'}},
            metadata={'source': 'input', 'writes': {'__start__': {'messages': [{'role': 'user', 'content': "hi! I'm bob"}]}}, 'step': -1, 'parents': {}, 'thread_id': '1'},
            created_at='2025-05-05T16:01:22.277497+00:00',
            parent_config=None,
            tasks=(PregelTask(id='d458367b-8265-812c-18e2-33001d199ce6', name='__start__', path=('__pregel_pull', '__start__'), error=None, interrupts=(), state=None, result={'messages': [{'role': 'user', 'content': "hi! I'm bob"}]}),),
            interrupts=()
        )
    ]
    ```
  </Tab>

  <Tab title="Checkpointer API">
    ```python  theme={null}
    config = {
        "configurable": {
            "thread_id": "1"  # [!code highlight]
        }
    }
    list(checkpointer.list(config))  # [!code highlight]
    ```

    ```
    [
        CheckpointTuple(
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1f5b-6704-8004-820c16b69a5a'}},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:24.680462+00:00',
                'id': '1f029ca3-1f5b-6704-8004-820c16b69a5a',
                'channel_versions': {'__start__': '00000000000000000000000000000005.0.5290678567601859', 'messages': '00000000000000000000000000000006.0.3205149138784782', 'branch:to:call_model': '00000000000000000000000000000006.0.14611156755133758'},
                'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000004.0.5736472536395331'}, 'call_model': {'branch:to:call_model': '00000000000000000000000000000005.0.1410174088651449'}},
                'channel_values': {'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?'), HumanMessage(content="what's my name?"), AIMessage(content='Your name is Bob.')]},
            },
            metadata={'source': 'loop', 'writes': {'call_model': {'messages': AIMessage(content='Your name is Bob.')}}, 'step': 4, 'parents': {}, 'thread_id': '1'},
            parent_config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
            pending_writes=[]
        ),
        CheckpointTuple(
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-1790-6b0a-8003-baf965b6a38f'}},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:23.863421+00:00',
                'id': '1f029ca3-1790-6b0a-8003-baf965b6a38f',
                'channel_versions': {'__start__': '00000000000000000000000000000005.0.5290678567601859', 'messages': '00000000000000000000000000000006.0.3205149138784782', 'branch:to:call_model': '00000000000000000000000000000006.0.14611156755133758'},
                'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000004.0.5736472536395331'}, 'call_model': {'branch:to:call_model': '00000000000000000000000000000005.0.1410174088651449'}},
                'channel_values': {'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?'), HumanMessage(content="what's my name?")], 'branch:to:call_model': None}
            },
            metadata={'source': 'loop', 'writes': None, 'step': 3, 'parents': {}, 'thread_id': '1'},
            parent_config={...},
            pending_writes=[('8ab4155e-6b15-b885-9ce5-bed69a2c305c', 'messages', AIMessage(content='Your name is Bob.'))]
        ),
        CheckpointTuple(
            config={...},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:23.863173+00:00',
                'id': '1f029ca3-1790-616e-8002-9e021694a0cd',
                'channel_versions': {'__start__': '00000000000000000000000000000004.0.5736472536395331', 'messages': '00000000000000000000000000000003.0.7056767754077798', 'branch:to:call_model': '00000000000000000000000000000003.0.22059023329132854'},
                'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000001.0.7040775356287469'}, 'call_model': {'branch:to:call_model': '00000000000000000000000000000002.0.9300422176788571'}},
                'channel_values': {'__start__': {'messages': [{'role': 'user', 'content': "what's my name?"}]}, 'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')]}
            },
            metadata={'source': 'input', 'writes': {'__start__': {'messages': [{'role': 'user', 'content': "what's my name?"}]}}, 'step': 2, 'parents': {}, 'thread_id': '1'},
            parent_config={...},
            pending_writes=[('24ba39d6-6db1-4c9b-f4c5-682aeaf38dcd', 'messages', [{'role': 'user', 'content': "what's my name?"}]), ('24ba39d6-6db1-4c9b-f4c5-682aeaf38dcd', 'branch:to:call_model', None)]
        ),
        CheckpointTuple(
            config={...},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:23.862295+00:00',
                'id': '1f029ca3-178d-6f54-8001-d7b180db0c89',
                'channel_versions': {'__start__': '00000000000000000000000000000002.0.18673090920108737', 'messages': '00000000000000000000000000000003.0.7056767754077798', 'branch:to:call_model': '00000000000000000000000000000003.0.22059023329132854'},
                'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000001.0.7040775356287469'}, 'call_model': {'branch:to:call_model': '00000000000000000000000000000002.0.9300422176788571'}},
                'channel_values': {'messages': [HumanMessage(content="hi! I'm bob"), AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')]}
            },
            metadata={'source': 'loop', 'writes': {'call_model': {'messages': AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?')}}, 'step': 1, 'parents': {}, 'thread_id': '1'},
            parent_config={...},
            pending_writes=[]
        ),
        CheckpointTuple(
            config={...},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:22.278960+00:00',
                'id': '1f029ca3-0874-6612-8000-339f2abc83b1',
                'channel_versions': {'__start__': '00000000000000000000000000000002.0.18673090920108737', 'messages': '00000000000000000000000000000002.0.30296526818059655', 'branch:to:call_model': '00000000000000000000000000000002.0.9300422176788571'},
                'versions_seen': {'__input__': {}, '__start__': {'__start__': '00000000000000000000000000000001.0.7040775356287469'}},
                'channel_values': {'messages': [HumanMessage(content="hi! I'm bob")], 'branch:to:call_model': None}
            },
            metadata={'source': 'loop', 'writes': None, 'step': 0, 'parents': {}, 'thread_id': '1'},
            parent_config={...},
            pending_writes=[('8cbd75e0-3720-b056-04f7-71ac805140a0', 'messages', AIMessage(content='Hi Bob! How are you doing today? Is there anything I can help you with?'))]
        ),
        CheckpointTuple(
            config={'configurable': {'thread_id': '1', 'checkpoint_ns': '', 'checkpoint_id': '1f029ca3-0870-6ce2-bfff-1f3f14c3e565'}},
            checkpoint={
                'v': 3,
                'ts': '2025-05-05T16:01:22.277497+00:00',
                'id': '1f029ca3-0870-6ce2-bfff-1f3f14c3e565',
                'channel_versions': {'__start__': '00000000000000000000000000000001.0.7040775356287469'},
                'versions_seen': {'__input__': {}},
                'channel_values': {'__start__': {'messages': [{'role': 'user', 'content': "hi! I'm bob"}]}}
            },
            metadata={'source': 'input', 'writes': {'__start__': {'messages': [{'role': 'user', 'content': "hi! I'm bob"}]}}, 'step': -1, 'parents': {}, 'thread_id': '1'},
            parent_config=None,
            pending_writes=[('d458367b-8265-812c-18e2-33001d199ce6', 'messages', [{'role': 'user', 'content': "hi! I'm bob"}]), ('d458367b-8265-812c-18e2-33001d199ce6', 'branch:to:call_model', None)]
        )
    ]
    ```
  </Tab>
</Tabs>

#### Delete all checkpoints for a thread

```python  theme={null}
thread_id = "1"
checkpointer.delete_thread(thread_id)
```

## Prebuilt memory tools

**LangMem** is a LangChain-maintained library that offers tools for managing long-term memories in your agent. See the [LangMem documentation](https://langchain-ai.github.io/langmem/) for usage examples.

***

<Callout icon="pen-to-square" iconType="regular">
  [Edit the source of this page on GitHub.](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/add-memory.mdx)
</Callout>

<Tip icon="terminal" iconType="regular">
  [Connect these docs programmatically](/use-these-docs) to Claude, VSCode, and more via MCP for    real-time answers.
</Tip>