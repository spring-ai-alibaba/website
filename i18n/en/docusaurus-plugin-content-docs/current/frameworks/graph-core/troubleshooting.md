---
title: "Graph Core Troubleshooting"
description: "Diagnose graph compilation, resume, and stream consumption issues."
---

# Graph Core Troubleshooting

| Symptom | What to check |
| --- | --- |
| The graph cannot find a parallel join | Make sure each branch from the fork can reach the same join. |
| A resumed run starts at the entry point | Use the original saver and thread ID, with `withResume()` or a specific checkpoint ID. |
| A node runs twice | Check for multiple subscriptions. Calling both `subscribe()` and `blockLast()` on the same execution Flux runs it twice. |
| Appended values are duplicated | Return only the new values or removal operations for append keys. A wrapper that calls a child graph should select the necessary writes. |
| A checkpoint cannot be restored | Check the storage location, serializer, and retention settings. |

Reproduce the issue with the local [quick-start example](quick-start.md). Record the library version, thread ID, checkpoint ID, and node name along with the error.
