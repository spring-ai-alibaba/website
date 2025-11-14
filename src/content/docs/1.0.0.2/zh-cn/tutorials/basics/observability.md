---
title: 可观测性
keywords: [Spring AI, MCP, 模型上下文协议, 智能体应用]
description: "Spring AI Alibaba可观测性介绍"
---

## 可观测性

Spring AI 基于 Spring 生态系统中的可观测性功能，为 AI 相关操作提供洞察。 Spring AI 为其核心组件提供指标和追踪功能：`ChatClient`（包括 `Advisor`）、 `ChatModel`、`EmbeddingModel`、`ImageModel` 和 `VectorStore`。

注意：低基数键将被添加到指标和追踪中，而高基数键仅添加到追踪中。

> 1.0.0-RC1 重大变更
>
> 以下配置属性已重命名以更好地反映其用途：
>
> `spring.ai.chat.client.observations.include-prompt` → `spring.ai.chat.client.observations.log-prompt`
>
> `spring.ai.chat.observations.include-prompt` → `spring.ai.chat.observations.log-prompt`
>
> `spring.ai.chat.observations.include-completion` → `spring.ai.chat.observations.log-completion`
>
> `spring.ai.image.observations.include-prompt` → `spring.ai.image.observations.log-prompt`
>
> `spring.ai.vectorstore.observations.include-query-response` → `spring.ai.vectorstore.observations.log-query-response`

### 聊天客户端

当调用 ChatClient 的 `call()` 或 `stream()` 操作时，会记录 `spring.ai.chat.client` 观测数据。 它们测量执行调用所花费的时间并传播相关的追踪信息。

Table 1. 低基数键

| 名称                             | 描述                                |
|--------------------------------|-----------------------------------|
| `gen_ai.operation.name`        | 始终为 framework                     | 
| `gen_ai.system`                | 始终为 spring_ai                     |
| `spring.ai.chat.client.stream` | 聊天模型响应是否为流 - true 或 false         |
| `spring.ai.kind`               | Spring AI 中框架 API 的类型：chat_client |

Table 2. 高基数键

| 名称                                                   | 描述                                                           |
|------------------------------------------------------|--------------------------------------------------------------|
| `gen_ai.prompt`                                      | 通过聊天客户端发送的提示内容(可选)                                           |
| `spring.ai.chat.client.advisor.params`（已弃用）          | 顾问参数映射。会话 ID 现在包含在 `spring.ai.chat.client.conversation.id` 中 |
| `spring.ai.chat.client.advisors`                     | 已配置的聊天客户端顾问列表                                                |
| `spring.ai.chat.client.conversation.id`              | 使用聊天内存时的会话标识符                                                |
| `spring.ai.chat.client.system.params`（已弃用）           | 聊天客户端系统参数。可选。已被 `gen_ai.prompt` 取代                           |
| `spring.ai.chat.client.system.text`（已弃用）             | 聊天客户端系统文本。可选。已被 `gen_ai.prompt` 取代                           |
| `spring.ai.chat.client.tool.function.names`（已弃用）     | 启用的工具函数名称。已被 `spring.ai.chat.client.tool.names` 取代           |
| `spring.ai.chat.client.tool.function.callbacks`（已弃用） | 已配置的聊天客户端函数回调列表。已被 `spring.ai.chat.client.tool.names` 取代     |
| `spring.ai.chat.client.tool.names`                   | 传递给聊天客户端的工具名称                                                |
| `spring.ai.chat.client.user.params`（已弃用）             | 聊天客户端用户参数。可选。已被 gen_ai.prompt 取代                             |
| `spring.ai.chat.client.user.text`（已弃用）               | 聊天客户端用户文本。可选。已被 gen_ai.prompt 取代                             |

#### 提示内容

`ChatClient` 提示内容通常很大，可能包含敏感信息。 因此，默认情况下不会导出。

Spring AI 支持记录提示内容以帮助调试和故障排除。

| 属性                                              | 描述            | 默认值     |
|-------------------------------------------------|---------------|---------|
| `spring.ai.chat.client.observations.log-prompt` | 是否记录聊天客户端提示内容 | `false` |

警告：如果启用聊天客户端提示内容的记录，可能会暴露敏感或私人信息。请谨慎使用！

#### 输入数据（已弃用）

警告：`spring.ai.chat.client.observations.include-input` 属性已弃用，替换为 `spring.ai.chat.client.observations.log-prompt`。参见 提示内容。

`ChatClient` 输入数据通常很大，可能包含敏感信息。 因此，默认情况下不会导出。

Spring AI 支持记录输入数据以帮助调试和故障排除。

| 属性                                                 | 描述           | 	默认值    |
|----------------------------------------------------|--------------|---------|
| `spring.ai.chat.client.observations.include-input` | 是否在观测中包含输入内容 | `false` |

警告：如果在观测中包含输入内容，可能会暴露敏感或私人信息。请谨慎使用！

#### 聊天客户端顾问

当执行顾问时，会记录 `spring.ai.advisor` 观测数据。 它们测量在顾问中花费的时间（包括内部顾问的时间）并传播相关的追踪信息。

Table 3. 低基数键

| 名称                            | 描述                                                                        |
|-------------------------------|---------------------------------------------------------------------------|
| `gen_ai.operation.name`       | 始终为 `framework`                                                           |
| `gen_ai.system`               | 始终为 `spring_ai`                                                           |
| `spring.ai.advisor.type`（已弃用） | 顾问在请求处理中应用其逻辑的位置，为 `BEFORE`、`AFTER` 或 `AROUND` 之一。由于所有顾问现在都是相同类型，这个区分不再适用 |
| `spring.ai.kind`              | Spring AI 中框架 API 的类型：`advisor`                                           |

Table 4. 高基数键

| 名称                        | 描述         |
|---------------------------|------------|
| `spring.ai.advisor.name`  | 顾问的名称      |
| `spring.ai.advisor.order` | 顾问在顾问链中的顺序 |

### 聊天模型

注意：目前仅支持以下 AI 模型提供商的 `ChatModel` 实现的可观测性功能： Anthropic、Azure OpenAI、Mistral AI、Ollama、OpenAI、Vertex AI、MiniMax、Moonshot、QianFan、Zhiu AI。 其他 AI 模型提供商将在未来版本中支持。

当调用 `ChatModel` 的 `call` 或 `stream` 方法时，会记录 `gen_ai.client.operation` 观测数据。 它们测量方法完成所花费的时间并传播相关的追踪信息。

重要：`gen_ai.client.token.usage` 指标测量单个模型调用使用的输入和输出令牌数量。

Table 5. 低基数键

| 名称                      | 描述             |
|-------------------------|----------------|
| `gen_ai.operation.name` | 正在执行的操作名称      |
| `gen_ai.system`         | 由客户端检测识别的模型提供商 |
| `gen_ai.request.model`  | 请求所针对的模型名称     |
| `gen_ai.response.model` | 生成响应的模型名称      |

Table 6. 高基数键

| 名称                                   | 描述                      |
|--------------------------------------|-------------------------|
| `gen_ai.request.frequency_penalty`   | 模型请求的频率惩罚设置             |
| `gen_ai.request.max_tokens`          | 模型为请求生成的最大令牌数           |
| `gen_ai.request.presence_penalty`    | 模型请求的存在惩罚设置             |
| `gen_ai.request.stop_sequences`      | 模型将用于停止生成更多令牌的序列列表      |
| `gen_ai.request.temperature`         | 模型请求的温度设置               |
| `gen_ai.request.top_k`               | 模型请求的 top_k 采样设置        |
| `gen_ai.request.top_p`               | 模型请求的 top_p 采样设置        |
| `gen_ai.response.finish_reasons`     | 模型停止生成令牌的原因，对应于每个接收到的生成 |
| `gen_ai.response.id`                 | AI 响应的唯一标识符             |
| `gen_ai.usage.input_tokens`          | 模型输入（提示）中使用的令牌数         |
| `gen_ai.usage.output_tokens`         | 模型输出（完成）中使用的令牌数         |
| `gen_ai.usage.total_tokens`          | 模型交换中使用的总令牌数            |
| `gen_ai.prompt`                      | 发送给模型的完整提示(可选)          |
| `gen_ai.completion`                  | 从模型接收的完整响应(可选)          |
| `spring.ai.model.request.tool.names` | 在请求中提供给模型的工具定义列表        |

注意：对于测量用户令牌，上表列出了观测追踪中存在的值。 使用由 `ChatModel` 提供的指标名称 `gen_ai.client.token.usage`。

#### 聊天提示和完成数据

聊天提示和完成数据通常很大，可能包含敏感信息。 因此，默认情况下不会导出。

Spring AI 支持记录聊天提示和完成数据，对故障排除场景很有用。当追踪可用时，日志将包含追踪信息以更好地关联。

| 属性                                                  | 描述                           | 默认值     |
|-----------------------------------------------------|------------------------------|---------|
| `spring.ai.chat.observations.log-prompt`            | 记录提示内容`true` 或 `false`       | `false` |
| `spring.ai.chat.observations.log-completion`        | 记录完成内容`true` 或 `false`       | `false` |
| `spring.ai.chat.observations.include-error-logging` | 在观测中包含错误日志记录`true` 或 `false` | `false` |

警告：如果启用聊天提示和完成数据的记录，可能会暴露敏感或私人信息。请谨慎使用！

### 工具调用

在聊天模型交互的上下文中执行工具调用时，会记录 `spring.ai.tool` 观测数据。 它们测量工具调用完成所花费的时间并传播相关的追踪信息。

Table 7. 低基数键

| 名称                               | 描述                                 |
|----------------------------------|------------------------------------|
| `gen_ai.operation.name`          | 正在执行的操作名称。始终为 `framework`。         |
| `gen_ai.system`                  | 负责操作的提供商。始终为 `spring_ai`。          |
| `spring.ai.kind`                 | Spring AI 执行的操作类型.始终为 `tool_call`。 |
| `spring.ai.tool.definition.name` | 工具的名称。                             |

Table 8. 高基数键

| 名称                                      | 描述                  |
|-----------------------------------------|---------------------|
| `spring.ai.tool.definition.description` | 工具的描述。              |
| `spring.ai.tool.definition.schema`      | 用于调用工具的参数模式。        |
| `spring.ai.tool.call.arguments`         | 工具调用的输入参数。（仅在启用时）   |
| `spring.ai.tool.call.result`            | 用于调用工具的参数模式。（仅在启用时） |

#### 工具调用参数和结果数据

默认情况下不会导出工具调用的输入参数和结果，因为它们可能包含敏感信息。

Spring AI 支持将工具调用参数和结果数据导出为跨度属性。

| 属性                                             | 描述                            | 默认值     |
|------------------------------------------------|-------------------------------|---------|
| `spring.ai.tools.observations.include-content` | 在观测中包含工具调用内容。`true` 或 `false` | `false` |

警告：如果在观测中包含工具调用参数和结果，可能会暴露敏感或私人信息。请谨慎使用！

### 嵌入模型

注意：目前仅支持以下 AI 模型提供商的 `EmbeddingModel` 实现的可观测性功能： Azure OpenAI、Mistral AI、Ollama 和 OpenAI。 其他 AI 模型提供商将在未来版本中支持。

在嵌入模型方法调用时记录 `gen_ai.client.operation` 观测数据。 它们测量方法完成所花费的时间并传播相关的追踪信息。

重要：`gen_ai.client.token.usage` 指标测量单个模型调用使用的输入和输出令牌数量。

Table 9. 低基数键

| 名称                      | 描述              |
|-------------------------|-----------------|
| `gen_ai.operation.name` | 正在执行的操作名称。      |
| `gen_ai.system`         | 由客户端检测识别的模型提供商。 |
| `gen_ai.request.model`  | 请求所针对的模型名称。     |
| `gen_ai.response.model` | 生成响应的模型名称。      |

Table 10. 高基数键

| 名称                                    | 描述            |
|---------------------------------------|---------------|
| `gen_ai.request.embedding.dimensions` | 结果输出嵌入的维度数。   |
| `gen_ai.usage.input_tokens`           | 模型输入中使用的令牌数。  |
| `gen_ai.usage.total_tokens`           | 模型交换中使用的总令牌数。 |

注意：对于测量用户令牌，上表列出了观测追踪中存在的值。 使用由 `EmbeddingModel` 提供的指标名称 `gen_ai.client.token.usage`。

### 图像模型

注意：目前仅支持以下 AI 模型提供商的 `ImageModel` 实现的可观测性功能： OpenAI。 其他 AI 模型提供商将在未来版本中支持。

在图像模型方法调用时记录 `gen_ai.client.operation` 观测数据。 它们测量方法完成所花费的时间并传播相关的追踪信息。

重要：`gen_ai.client.token.usage` 指标测量单个模型调用使用的输入和输出令牌数量。

Table 11. 低基数键

| 名称                      | 描述              |
|-------------------------|-----------------|
| `gen_ai.operation.name` | 正在执行的操作名称。      |
| `gen_ai.system`         | 由客户端检测识别的模型提供商。 |
| `gen_ai.request.model`  | 请求所针对的模型名称。     |

Table 12. 高基数键

| 名称                                     | 	描述              |
|----------------------------------------|------------------|
| `gen_ai.request.image.response_format` | 返回生成的图像的格式。      |
| `gen_ai.request.image.size`            | 要生成的图像大小。        |
| `gen_ai.request.image.style`           | 要生成的图像样式。        |
| `gen_ai.response.id`                   | AI 响应的唯一标识符。     |
| `gen_ai.response.model`                | 生成响应的模型名称。       |
| `gen_ai.usage.input_tokens`            | 模型输入（提示）中使用的令牌数。 |
| `gen_ai.usage.output_tokens`           | 模型输出（生成）中使用的令牌数。 |
| `gen_ai.usage.total_tokens`            | 模型交换中使用的总令牌数。    |
| `gen_ai.prompt`                        | 发送给模型的完整提示。可选。   |

注意：对于测量用户令牌，上表列出了观测追踪中存在的值。 使用由 `ImageModel` 提供的指标名称 `gen_ai.client.token.usage`。

#### 图像提示数据

图像提示数据通常很大，可能包含敏感信息。 因此，默认情况下不会导出。

Spring AI 支持记录图像提示数据，对故障排除场景很有用。当追踪可用时，日志将包含追踪信息以更好地关联。

| 属性                                        | 描述                        | 默认值     |
|-------------------------------------------|---------------------------|---------|
| `spring.ai.image.observations.log-prompt` | 记录图像提示内容。`true` 或 `false` | `false` |

警告：如果启用图像提示数据的记录，可能会暴露敏感或私人信息。请谨慎使用！

### 向量存储

Spring AI 中的所有向量存储实现都通过 Micrometer 提供指标和分布式追踪数据。

在与向量存储交互时记录 `db.vector.client.operation` 观测数据。 它们测量 `query`、`add` 和 `remove` 操作所花费的时间并传播相关的追踪信息。

Table 13. 低基数键

| 名称                  | 描述                                                                                                                                                                                                                    |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `db.operation.name` | 正在执行的操作或命令名称。为 `add`、`delete` 或 `query` 之一。                                                                                                                                                                           |
| `db.system`         | 由客户端检测识别的数据库管理系统（DBMS）产品。为 `pg_vector`、`azure`、`cassandra`、`chroma`、`elasticsearch`、`milvus`、`neo4j`、`opensearch`、`qdrant`、`redis`、`typesense`、`weaviate`、`pinecone`、`oracle`、`mongodb`、`gemfire`、`hana`、`simple` 之一。 |
| `spring.ai.kind`    | Spring AI 中框架 API 的类型：`vector_store`。                                                                                                                                                                                 |

Table 14. 高基数键

| 名称                                      | 描述                                                         |
|-----------------------------------------|------------------------------------------------------------|
| `db.collection.name`                    | 数据库中的集合（表、容器）名称。                                           |
| `db.namespace`                          | 数据库的名称，在服务器地址和端口内完全限定。                                     |
| `db.record.id`                          | 记录标识符（如果存在）。                                               |
| `db.search.similarity_metric`           | 相似性搜索中使用的度量标准。                                             |
| `db.vector.dimension_count`             | 向量的维度。                                                     |
| `db.vector.field_name`                  | 向量的名称字段（例如字段名）。                                            |
| `db.vector.query.content`               | 正在执行的搜索查询内容。                                               |
| `db.vector.query.filter`                | 搜索查询中使用的元数据过滤器。                                            |
| `db.vector.query.response.documents`    | 从相似性搜索查询返回的文档。可选。                                          |
| `db.vector.query.similarity_threshold ` | 接受所有搜索分数的相似性阈值。阈值 0.0 表示接受任何相似性或禁用相似性阈值过滤。阈值 1.0 表示需要完全匹配。 |
| `db.vector.query.top_k`                 | 查询返回的最相似向量的 top-k。                                         |

#### 响应数据

向量搜索响应数据通常很大，可能包含敏感信息。 因此，默认情况下不会导出。

Spring AI 支持记录向量搜索响应数据，对故障排除场景很有用。当追踪可用时，日志将包含追踪信息以更好地关联。

| 属性                                                      | 描述                            | 	默认值    |
|---------------------------------------------------------|-------------------------------|---------|
| `spring.ai.vectorstore.observations.log-query-response` | 记录向量存储查询响应内容。`true` 或 `false` | `false` |

警告：如果启用向量搜索响应数据的记录，可能会暴露敏感或私人信息。请谨慎使用！

