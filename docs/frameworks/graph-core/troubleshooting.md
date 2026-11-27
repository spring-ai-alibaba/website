---
title: "常见问题"
description: "排查图编译、会话恢复、流输出和状态聚合问题。"
---

# Graph Core 常见问题

| 现象 | 检查项 |
| --- | --- |
| 编译提示找不到并行汇合点 | 检查从同一节点发出的所有并行分支是否能到达共同汇合节点。参见[并行节点定义](examples/parallel-branch.md)。 |
| 续跑时又从入口执行 | 检查保存器、`threadId`，并用 `withResume()` 或明确的检查点 ID。参见[持久化](core/persistence.md)。 |
| 独立执行读到了上一次的状态 | 检查是否复用了默认线程或同一个 `threadId`。给独立执行分配不同的线程 ID。参见[条件循环与迭代修订](examples/review-loop.md)。 |
| 节点或工具执行了两次 | 检查同一个执行 Flux 是否被订阅两次。例如 `subscribe()` 后又调用 `blockLast()` 会再订阅一次。参见[流式输出](core/streaming.md)。 |
| 并行结果顺序与屏幕显示不一致 | 片段按到达顺序显示。用节点 ID 分组，用汇合节点读取应用策略后的状态。参见[并行流式输出](examples/parallel-streaming.md)。 |
| 历史消息重复 | 对使用追加策略的键返回新增消息。包装子图时只将需要的更新写回父图。参见[核心概念](core/core-library.md)和[子图](examples/subgraph.md)。 |
| 检查点能写但恢复失败 | 在同一个保存位置、用同一序列化器重新读取，并检查历史是否被保留策略清理。参见[时光旅行](examples/time-travel.md)。 |

从不需要模型和外部服务的[快速入门](quick-start.md)复现流程。排查时记录实际使用的库版本、`threadId`、检查点 ID、节点名和完整错误原因。
