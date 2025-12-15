## Accessing the Native Client

Coherence Vector Store 实现通过 `getNativeClient()` 方法提供对底层原生 Coherence 客户端（`Session`）的访问：

```java
CoherenceVectorStore vectorStore = context.getBean(CoherenceVectorStore.class);
Optional<Session> nativeClient = vectorStore.getNativeClient();

if (nativeClient.isPresent()) {
    Session session = nativeClient.get();
    // 使用原生客户端进行 Coherence 特定操作
}
```

原生客户端使您可以访问可能未通过 `VectorStore` 接口公开的 Coherence 特定功能和操作。

