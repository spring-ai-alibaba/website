# ETL Pipeline

ETL（Extract、Transform、Load）框架是 Retrieval Augmented Generation (RAG) 用例中数据处理的支柱。

ETL pipeline 编排从原始数据源到结构化向量存储的流程，确保数据以 AI 模型检索的最佳格式存在。

RAG 用例是通过从数据体中检索相关信息来增强生成模型能力的文本，以提高生成输出的质量和相关性。

## API 概述

ETL pipeline 创建、转换和存储 `Document` 实例。

![Spring AI Message API](/img/integration/spring-ai-document1-api.jpg)

`Document` 类包含文本、元数据，以及可选的额外媒体类型，如图像、音频和视频。

ETL pipeline 有三个主要组件：

* `DocumentReader`，实现 `Supplier<List<Document>>`
* `DocumentTransformer`，实现 `Function<List<Document>, List<Document>>`
* `DocumentWriter`，实现 `Consumer<List<Document>>`

`Document` 类的内容是在 `DocumentReader` 的帮助下从 PDF、文本文件和其他文档类型创建的。

要构建一个简单的 ETL pipeline，可以将每种类型的实例链接在一起。

![ETL Pipeline](/img/integration/etl-pipeline.jpg)

假设我们有这三种 ETL 类型的以下实例：

* `PagePdfDocumentReader`，`DocumentReader` 的实现
* `TokenTextSplitter`，`DocumentTransformer` 的实现
* `VectorStore`，`DocumentWriter` 的实现

要执行将数据加载到 Vector Database 以用于 Retrieval Augmented Generation 模式的基本操作，请在 Java 函数式语法中使用以下代码。

```java
vectorStore.accept(tokenTextSplitter.apply(pdfReader.get()));
```

或者，您可以使用对领域更自然表达的方法名称：

```java
vectorStore.write(tokenTextSplitter.split(pdfReader.read()));
```

## ETL 接口

ETL pipeline 由以下接口和实现组成。
详细的 ETL 类图在 [ETL 类图](#etl-class-diagram) 部分显示。

### DocumentReader

提供来自不同来源的文档源。

```java
public interface DocumentReader extends Supplier<List<Document>> {

    default List<Document> read() {
		return get();
	}
}
```

### DocumentTransformer

转换一批文档作为处理工作流的一部分。

```java
public interface DocumentTransformer extends Function<List<Document>, List<Document>> {

    default List<Document> transform(List<Document> transform) {
		return apply(transform);
	}
}
```

### DocumentWriter

管理 ETL 过程的最后阶段，准备文档以供存储。

```java
public interface DocumentWriter extends Consumer<List<Document>> {

    default void write(List<Document> documents) {
		accept(documents);
	}
}
```

### ETL 类图

以下类图说明了 ETL 接口和实现。

![ETL Class Diagram](/img/integration/etl-class-diagram.jpg)

## DocumentReaders

### JSON

`JsonReader` 处理 JSON 文档，将它们转换为 `Document` 对象列表。

#### 示例

```java
@Component
class MyJsonReader {

	private final Resource resource;

    MyJsonReader(@Value("classpath:bikes.json") Resource resource) {
        this.resource = resource;
    }

	List<Document> loadJsonAsDocuments() {
        JsonReader jsonReader = new JsonReader(this.resource, "description", "content");
        return jsonReader.get();
	}
}
```

#### 构造函数选项

`JsonReader` 提供多个构造函数选项：

1. `JsonReader(Resource resource)`
2. `JsonReader(Resource resource, String... jsonKeysToUse)`
3. `JsonReader(Resource resource, JsonMetadataGenerator jsonMetadataGenerator, String... jsonKeysToUse)`

#### 参数

* `resource`：指向 JSON 文件的 Spring `Resource` 对象。
* `jsonKeysToUse`：JSON 中应作为结果 `Document` 对象中文本内容使用的键数组。
* `jsonMetadataGenerator`：可选的 `JsonMetadataGenerator`，用于为每个 `Document` 创建元数据。

#### 行为

`JsonReader` 按以下方式处理 JSON 内容：

* 它可以处理 JSON 数组和单个 JSON 对象。
* 对于每个 JSON 对象（在数组中或单个对象中）：
** 它根据指定的 `jsonKeysToUse` 提取内容。
** 如果未指定键，它使用整个 JSON 对象作为内容。
** 它使用提供的 `JsonMetadataGenerator`（如果未提供则使用空生成器）生成元数据。
** 它创建一个包含提取内容和元数据的 `Document` 对象。

#### 使用 JSON Pointers

`JsonReader` 现在支持使用 JSON Pointers 检索 JSON 文档的特定部分。此功能允许您轻松地从复杂的 JSON 结构中提取嵌套数据。

##### `get(String pointer)` 方法

```java
public List<Document> get(String pointer)
```

此方法允许您使用 JSON Pointer 检索 JSON 文档的特定部分。

###### 参数

* `pointer`：JSON Pointer 字符串（如 RFC 6901 中定义），用于定位 JSON 结构中的所需元素。

###### 返回值

* 返回包含从指针定位的 JSON 元素解析的文档的 `List<Document>`。

###### 行为

* 该方法使用提供的 JSON Pointer 导航到 JSON 结构中的特定位置。
* 如果指针有效且指向现有元素：
** 对于 JSON 对象：它返回包含单个 Document 的列表。
** 对于 JSON 数组：它返回 Document 列表，数组中的每个元素一个。
* 如果指针无效或指向不存在的元素，它会抛出 `IllegalArgumentException`。

###### 示例

```java
JsonReader jsonReader = new JsonReader(resource, "description");
List<Document> documents = this.jsonReader.get("/store/books/0");
```

#### 示例 JSON 结构

```json
[
  {
    "id": 1,
    "brand": "Trek",
    "description": "A high-performance mountain bike for trail riding."
  },
  {
    "id": 2,
    "brand": "Cannondale",
    "description": "An aerodynamic road bike for racing enthusiasts."
  }
]
```

在此示例中，如果 `JsonReader` 配置为使用 `"description"` 作为 `jsonKeysToUse`，它将创建 `Document` 对象，其中内容是数组中每辆自行车的 "description" 字段的值。

#### 注意事项

* `JsonReader` 使用 Jackson 进行 JSON 解析。
* 它可以通过对数组使用流式处理来高效处理大型 JSON 文件。
* 如果在 `jsonKeysToUse` 中指定了多个键，内容将是这些键值的连接。
* 通过自定义 `jsonKeysToUse` 和 `JsonMetadataGenerator`，读取器可以灵活适应各种 JSON 结构。

### Text

`TextReader` 处理纯文本文档，将它们转换为 `Document` 对象列表。

#### 示例

```java
@Component
class MyTextReader {

    private final Resource resource;

    MyTextReader(@Value("classpath:text-source.txt") Resource resource) {
        this.resource = resource;
    }

	List<Document> loadText() {
		TextReader textReader = new TextReader(this.resource);
		textReader.getCustomMetadata().put("filename", "text-source.txt");

		return textReader.read();
    }
}
```

#### 构造函数选项

`TextReader` 提供两个构造函数选项：

1. `TextReader(String resourceUrl)`
2. `TextReader(Resource resource)`

#### 参数

* `resourceUrl`：表示要读取的资源的 URL 的字符串。
* `resource`：指向文本文件的 Spring `Resource` 对象。

#### 配置

* `setCharset(Charset charset)`：设置用于读取文本文件的字符集。默认为 UTF-8。
* `getCustomMetadata()`：返回一个可变映射，您可以在其中为文档添加自定义元数据。

#### 行为

`TextReader` 按以下方式处理文本内容：

* 它将整个文本文件的内容读入单个 `Document` 对象。
* 文件的内容成为 `Document` 的内容。
* 元数据自动添加到 `Document`：
** `charset`：用于读取文件的字符集（默认："UTF-8"）。
** `source`：源文本文件的文件名。
* 通过 `getCustomMetadata()` 添加的任何自定义元数据都包含在 `Document` 中。

#### 注意事项

* `TextReader` 将整个文件内容读入内存，因此可能不适合非常大的文件。
* 如果需要将文本拆分为更小的块，可以在读取文档后使用文本拆分器（如 `TokenTextSplitter`）：

```java
List<Document> documents = textReader.get();
List<Document> splitDocuments = new TokenTextSplitter().apply(this.documents);
```

* 读取器使用 Spring 的 `Resource` 抽象，允许它从各种源（classpath、文件系统、URL 等）读取。
* 可以使用 `getCustomMetadata()` 方法向读取器创建的所有文档添加自定义元数据。

### HTML (JSoup)

`JsoupDocumentReader` 使用 JSoup 库处理 HTML 文档，将它们转换为 `Document` 对象列表。

#### 示例

```java
@Component
class MyHtmlReader {

    private final Resource resource;

    MyHtmlReader(@Value("classpath:/my-page.html") Resource resource) {
        this.resource = resource;
    }

    List<Document> loadHtml() {
        JsoupDocumentReaderConfig config = JsoupDocumentReaderConfig.builder()
            .selector("article p") // Extract paragraphs within <article> tags
            .charset("ISO-8859-1")  // Use ISO-8859-1 encoding
            .includeLinkUrls(true) // Include link URLs in metadata
            .metadataTags(List.of("author", "date")) // Extract author and date meta tags
            .additionalMetadata("source", "my-page.html") // Add custom metadata
            .build();

        JsoupDocumentReader reader = new JsoupDocumentReader(this.resource, config);
        return reader.get();
    }
}
```

`JsoupDocumentReaderConfig` 允许您自定义 `JsoupDocumentReader` 的行为：

*   `charset`：指定 HTML 文档的字符编码（默认为 "UTF-8"）。
*   `selector`：JSoup CSS 选择器，用于指定要从中提取文本的元素（默认为 "body"）。
*   `separator`：用于连接多个选定元素的文本的字符串（默认为 "\n"）。
*   `allElements`：如果为 `true`，则从 `<body>` 元素提取所有文本，忽略 `selector`（默认为 `false`）。
*   `groupByElement`：如果为 `true`，则为 `selector` 匹配的每个元素创建一个单独的 `Document`（默认为 `false`）。
*   `includeLinkUrls`：如果为 `true`，则提取绝对链接 URL 并将它们添加到元数据（默认为 `false`）。
*   `metadataTags`：要从中提取内容的 `<meta>` 标签名称列表（默认为 `["description", "keywords"]`）。
*   `additionalMetadata`：允许您向所有创建的 `Document` 对象添加自定义元数据。

#### 示例文档：my-page.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Web Page</title>
    <meta name="description" content="A sample web page for Spring AI">
    <meta name="keywords" content="spring, ai, html, example">
    <meta name="author" content="John Doe">
    <meta name="date" content="2024-01-15">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to My Page</h1>
    </header>
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
        </ul>
    </nav>
    <article>
        <h2>Main Content</h2>
        <p>This is the main content of my web page.</p>
        <p>It contains multiple paragraphs.</p>
        <a href="https://www.example.com">External Link</a>
    </article>
    <footer>
        <p>&copy; 2024 John Doe</p>
    </footer>
</body>
</html>
```

行为：

`JsoupDocumentReader` 处理 HTML 内容并根据配置创建 `Document` 对象：

*   `selector` 确定哪些元素用于文本提取。
*   如果 `allElements` 为 `true`，则 `<body>` 内的所有文本都被提取到单个 `Document` 中。
*   如果 `groupByElement` 为 `true`，则匹配 `selector` 的每个元素创建一个单独的 `Document`。
*   如果 `allElements` 和 `groupByElement` 都不为 `true`，则匹配 `selector` 的所有元素的文本使用 `separator` 连接。
*   文档标题、来自指定 `<meta>` 标签的内容以及（可选）链接 URL 被添加到 `Document` 元数据。
*   将从 URL 资源中提取基本 URI，用于解析相对链接。

读取器保留选定元素的文本内容，但删除其中的任何 HTML 标签。

### Markdown

`MarkdownDocumentReader` 处理 Markdown 文档，将它们转换为 `Document` 对象列表。

#### 示例

```java
@Component
class MyMarkdownReader {

    private final Resource resource;

    MyMarkdownReader(@Value("classpath:code.md") Resource resource) {
        this.resource = resource;
    }

    List<Document> loadMarkdown() {
        MarkdownDocumentReaderConfig config = MarkdownDocumentReaderConfig.builder()
            .withHorizontalRuleCreateDocument(true)
            .withIncludeCodeBlock(false)
            .withIncludeBlockquote(false)
            .withAdditionalMetadata("filename", "code.md")
            .build();

        MarkdownDocumentReader reader = new MarkdownDocumentReader(this.resource, config);
        return reader.get();
    }
}
```

`MarkdownDocumentReaderConfig` 允许您自定义 MarkdownDocumentReader 的行为：

* `horizontalRuleCreateDocument`：当设置为 `true` 时，Markdown 中的水平规则将创建新的 `Document` 对象。
* `includeCodeBlock`：当设置为 `true` 时，代码块将包含在与周围文本相同的 `Document` 中。当 `false` 时，代码块创建单独的 `Document` 对象。
* `includeBlockquote`：当设置为 `true` 时，引用块将包含在与周围文本相同的 `Document` 中。当 `false` 时，引用块创建单独的 `Document` 对象。
* `additionalMetadata`：允许您向所有创建的 `Document` 对象添加自定义元数据。

#### 示例文档：code.md

```markdown
This is a Java sample application:

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

Markdown also provides the possibility to `use inline code formatting throughout` the entire sentence.

---

Another possibility is to set block code without specific highlighting:

```
./mvnw spring-javaformat:apply
```
```

行为：MarkdownDocumentReader 处理 Markdown 内容并根据配置创建 Document 对象：

* 标题成为 Document 对象中的元数据。
* 段落成为 Document 对象的内容。
* 代码块可以分离到它们自己的 Document 对象中，或者与周围文本一起包含。
* 引用块可以分离到它们自己的 Document 对象中，或者与周围文本一起包含。
* 水平规则可用于将内容拆分为单独的 Document 对象。

读取器保留格式，如内联代码、列表和 Document 对象内容中的文本样式。

### PDF Page

`PagePdfDocumentReader` 使用 Apache PdfBox 库解析 PDF 文档

使用 Maven 或 Gradle 将依赖项添加到您的项目。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pdf-document-reader</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-pdf-document-reader'
}
```

#### 示例

```java
@Component
public class MyPagePdfDocumentReader {

	List<Document> getDocsFromPdf() {

		PagePdfDocumentReader pdfReader = new PagePdfDocumentReader("classpath:/sample1.pdf",
				PdfDocumentReaderConfig.builder()
					.withPageTopMargin(0)
					.withPageExtractedTextFormatter(ExtractedTextFormatter.builder()
						.withNumberOfTopTextLinesToDelete(0)
						.build())
					.withPagesPerDocument(1)
					.build());

		return pdfReader.read();
    }

}
```

### PDF Paragraph

`ParagraphPdfDocumentReader` 使用 PDF 目录（例如 TOC）信息将输入 PDF 拆分为文本段落，并为每个段落输出单个 `Document`。
注意：并非所有 PDF 文档都包含 PDF 目录。

#### 依赖项

使用 Maven 或 Gradle 将依赖项添加到您的项目。

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pdf-document-reader</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-pdf-document-reader'
}
```

#### 示例

```java
@Component
public class MyPagePdfDocumentReader {

	List<Document> getDocsFromPdfWithCatalog() {

        ParagraphPdfDocumentReader pdfReader = new ParagraphPdfDocumentReader("classpath:/sample1.pdf",
                PdfDocumentReaderConfig.builder()
                    .withPageTopMargin(0)
                    .withPageExtractedTextFormatter(ExtractedTextFormatter.builder()
                        .withNumberOfTopTextLinesToDelete(0)
                        .build())
                    .withPagesPerDocument(1)
                    .build());

	    return pdfReader.read();
    }
}
```

### Tika (DOCX, PPTX, HTML...)

`TikaDocumentReader` 使用 Apache Tika 从各种文档格式（如 PDF、DOC/DOCX、PPT/PPTX 和 HTML）中提取文本。有关支持的格式的完整列表，请参阅 https://tika.apache.org/3.1.0/formats.html[Tika 文档]。

#### 依赖项

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-tika-document-reader</artifactId>
</dependency>
```

或添加到您的 Gradle `build.gradle` 构建文件。

```groovy
dependencies {
    implementation 'org.springframework.ai:spring-ai-tika-document-reader'
}
```

#### 示例

```java
@Component
class MyTikaDocumentReader {

    private final Resource resource;

    MyTikaDocumentReader(@Value("classpath:/word-sample.docx")
                            Resource resource) {
        this.resource = resource;
    }

    List<Document> loadText() {
        TikaDocumentReader tikaDocumentReader = new TikaDocumentReader(this.resource);
        return tikaDocumentReader.read();
    }
}
```

## Transformers

### TextSplitter

`TextSplitter` 是一个抽象基类，有助于将文档分割以适合 AI 模型的上下文窗口。

### TokenTextSplitter

`TokenTextSplitter` 是 `TextSplitter` 的实现，它使用 CL100K_BASE 编码基于 token 计数将文本拆分为块。

#### 用法

```java
@Component
class MyTokenTextSplitter {

    public List<Document> splitDocuments(List<Document> documents) {
        TokenTextSplitter splitter = new TokenTextSplitter();
        return splitter.apply(documents);
    }

    public List<Document> splitCustomized(List<Document> documents) {
        TokenTextSplitter splitter = new TokenTextSplitter(1000, 400, 10, 5000, true);
        return splitter.apply(documents);
    }
}
```

#### 构造函数选项

`TokenTextSplitter` 提供两个构造函数选项：

1. `TokenTextSplitter()`：使用默认设置创建拆分器。
2. `TokenTextSplitter(int defaultChunkSize, int minChunkSizeChars, int minChunkLengthToEmbed, int maxNumChunks, boolean keepSeparator)`

#### 参数

* `defaultChunkSize`：每个文本块的目标大小（以 token 为单位）（默认值：800）。
* `minChunkSizeChars`：每个文本块的最小大小（以字符为单位）（默认值：350）。
* `minChunkLengthToEmbed`：要包含的块的最小长度（默认值：5）。
* `maxNumChunks`：从文本生成的最大块数（默认值：10000）。
* `keepSeparator`：是否在块中保留分隔符（如换行符）（默认值：true）。

#### 行为

`TokenTextSplitter` 按以下方式处理文本内容：

1. 它使用 CL100K_BASE 编码将输入文本编码为 token。
2. 它根据 `defaultChunkSize` 将编码的文本拆分为块。
3. 对于每个块：
a. 它将块解码回文本。
b. 它尝试在 `minChunkSizeChars` 之后找到合适的断点（句号、问号、感叹号或换行符）。
c. 如果找到断点，它会在该点截断块。
d. 它修剪块，并根据 `keepSeparator` 设置可选地删除换行符。
e. 如果结果块长于 `minChunkLengthToEmbed`，则将其添加到输出中。
4. 此过程继续进行，直到处理完所有 token 或达到 `maxNumChunks`。
5. 如果剩余文本长于 `minChunkLengthToEmbed`，则将其作为最终块添加。

#### 示例

```java
Document doc1 = new Document("This is a long piece of text that needs to be split into smaller chunks for processing.",
        Map.of("source", "example.txt"));
Document doc2 = new Document("Another document with content that will be split based on token count.",
        Map.of("source", "example2.txt"));

TokenTextSplitter splitter = new TokenTextSplitter();
List<Document> splitDocuments = this.splitter.apply(List.of(this.doc1, this.doc2));

for (Document doc : splitDocuments) {
    System.out.println("Chunk: " + doc.getContent());
    System.out.println("Metadata: " + doc.getMetadata());
}
```

#### 注意事项

* `TokenTextSplitter` 使用来自 `jtokkit` 库的 CL100K_BASE 编码，它与较新的 OpenAI 模型兼容。
* 拆分器尝试通过在可能的情况下在句子边界处断开来创建语义上有意义的块。
* 原始文档的元数据被保留并复制到从该文档派生的所有块。
* 如果 `copyContentFormatter` 设置为 `true`（默认行为），原始文档的内容格式化程序（如果设置）也会复制到派生的块。
* 此拆分器对于为具有 token 限制的大型语言模型准备文本特别有用，确保每个块都在模型的处理能力范围内。

### ContentFormatTransformer

确保所有文档的内容格式统一。

### KeywordMetadataEnricher

`KeywordMetadataEnricher` 是一个 `DocumentTransformer`，它使用生成式 AI 模型从文档内容中提取关键字并将它们添加为元数据。

#### 用法

```java
@Component
class MyKeywordEnricher {

    private final ChatModel chatModel;

    MyKeywordEnricher(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    List<Document> enrichDocuments(List<Document> documents) {
        KeywordMetadataEnricher enricher = KeywordMetadataEnricher.builder(chatModel)
                .keywordCount(5)
                .build();

        // Or use custom templates
        KeywordMetadataEnricher enricher = KeywordMetadataEnricher.builder(chatModel)
               .keywordsTemplate(YOUR_CUSTOM_TEMPLATE)
               .build();

        return enricher.apply(documents);
    }
}
```

#### 构造函数选项

`KeywordMetadataEnricher` 提供两个构造函数选项：

1. `KeywordMetadataEnricher(ChatModel chatModel, int keywordCount)`：使用默认模板并提取指定数量的关键字。
2. `KeywordMetadataEnricher(ChatModel chatModel, PromptTemplate keywordsTemplate)`：使用自定义模板进行关键字提取。

#### 行为

`KeywordMetadataEnricher` 按以下方式处理文档：

1. 对于每个输入文档，它使用文档的内容创建提示。
2. 它将此提示发送到提供的 `ChatModel` 以生成关键字。
3. 生成的关键字作为键 "excerpt_keywords" 添加到文档的元数据中。
4. 返回丰富的文档。

#### 自定义

您可以使用默认模板或通过 keywordsTemplate 参数自定义模板。
默认模板是：

```java
\{context_str}. Give %s unique keywords for this document. Format as comma separated. Keywords:
```

其中 `+{context_str}+` 被文档内容替换，`%s` 被指定的关键字计数替换。

#### 示例

```java
ChatModel chatModel = // initialize your chat model
KeywordMetadataEnricher enricher = KeywordMetadataEnricher.builder(chatModel)
                .keywordCount(5)
                .build();

// Or use custom templates
KeywordMetadataEnricher enricher = KeywordMetadataEnricher.builder(chatModel)
                .keywordsTemplate(new PromptTemplate("Extract 5 important keywords from the following text and separate them with commas:\n{context_str}"))
                .build();

Document doc = new Document("This is a document about artificial intelligence and its applications in modern technology.");

List<Document> enrichedDocs = enricher.apply(List.of(this.doc));

Document enrichedDoc = this.enrichedDocs.get(0);
String keywords = (String) this.enrichedDoc.getMetadata().get("excerpt_keywords");
System.out.println("Extracted keywords: " + keywords);
```

#### 注意事项

* `KeywordMetadataEnricher` 需要正常工作的 `ChatModel` 来生成关键字。
* 关键字计数必须为 1 或更大。
* 丰富器将 "excerpt_keywords" 元数据字段添加到每个处理的文档。
* 生成的关键字作为逗号分隔的字符串返回。
* 此丰富器对于提高文档的可搜索性以及为文档生成标签或类别特别有用。
* 在 Builder 模式中，如果设置了 `keywordsTemplate` 参数，则忽略 `keywordCount` 参数。

### SummaryMetadataEnricher

`SummaryMetadataEnricher` 是一个 `DocumentTransformer`，它使用生成式 AI 模型为文档创建摘要并将它们添加为元数据。它可以为当前文档以及相邻文档（上一个和下一个）生成摘要。

#### 用法

```java
@Configuration
class EnricherConfig {

    @Bean
    public SummaryMetadataEnricher summaryMetadata(OpenAiChatModel aiClient) {
        return new SummaryMetadataEnricher(aiClient,
            List.of(SummaryType.PREVIOUS, SummaryType.CURRENT, SummaryType.NEXT));
    }
}

@Component
class MySummaryEnricher {

    private final SummaryMetadataEnricher enricher;

    MySummaryEnricher(SummaryMetadataEnricher enricher) {
        this.enricher = enricher;
    }

    List<Document> enrichDocuments(List<Document> documents) {
        return this.enricher.apply(documents);
    }
}
```

#### 构造函数

`SummaryMetadataEnricher` 提供两个构造函数：

1. `SummaryMetadataEnricher(ChatModel chatModel, List<SummaryType> summaryTypes)`
2. `SummaryMetadataEnricher(ChatModel chatModel, List<SummaryType> summaryTypes, String summaryTemplate, MetadataMode metadataMode)`

#### 参数

* `chatModel`：用于生成摘要的 AI 模型。
* `summaryTypes`：`SummaryType` 枚举值列表，指示要生成哪些摘要（PREVIOUS、CURRENT、NEXT）。
* `summaryTemplate`：用于摘要生成的自定义模板（可选）。
* `metadataMode`：指定在生成摘要时如何处理文档元数据（可选）。

#### 行为

`SummaryMetadataEnricher` 按以下方式处理文档：

1. 对于每个输入文档，它使用文档的内容和指定的摘要模板创建提示。
2. 它将此提示发送到提供的 `ChatModel` 以生成摘要。
3. 根据指定的 `summaryTypes`，它向每个文档添加以下元数据：
* `section_summary`：当前文档的摘要。
* `prev_section_summary`：上一个文档的摘要（如果可用且已请求）。
* `next_section_summary`：下一个文档的摘要（如果可用且已请求）。
4. 返回丰富的文档。

#### 自定义

可以通过提供自定义 `summaryTemplate` 来自定义摘要生成提示。默认模板是：

```java
"""
Here is the content of the section:
{context_str}

Summarize the key topics and entities of the section.

Summary:
"""
```

#### 示例

```java
ChatModel chatModel = // initialize your chat model
SummaryMetadataEnricher enricher = new SummaryMetadataEnricher(chatModel,
    List.of(SummaryType.PREVIOUS, SummaryType.CURRENT, SummaryType.NEXT));

Document doc1 = new Document("Content of document 1");
Document doc2 = new Document("Content of document 2");

List<Document> enrichedDocs = enricher.apply(List.of(this.doc1, this.doc2));

// Check the metadata of the enriched documents
for (Document doc : enrichedDocs) {
    System.out.println("Current summary: " + doc.getMetadata().get("section_summary"));
    System.out.println("Previous summary: " + doc.getMetadata().get("prev_section_summary"));
    System.out.println("Next summary: " + doc.getMetadata().get("next_section_summary"));
}
```

提供的示例演示了预期行为：

* 对于两个文档的列表，两个文档都收到 `section_summary`。
* 第一个文档收到 `next_section_summary` 但没有 `prev_section_summary`。
* 第二个文档收到 `prev_section_summary` 但没有 `next_section_summary`。
* 第一个文档的 `section_summary` 与第二个文档的 `prev_section_summary` 匹配。
* 第一个文档的 `next_section_summary` 与第二个文档的 `section_summary` 匹配。

#### 注意事项

* `SummaryMetadataEnricher` 需要正常工作的 `ChatModel` 来生成摘要。
* 丰富器可以处理任何大小的文档列表，正确处理第一个和最后一个文档的边缘情况。
* 此丰富器对于创建上下文感知的摘要特别有用，允许更好地理解序列中文档的关系。
* `MetadataMode` 参数允许控制现有元数据如何合并到摘要生成过程中。

## Writers

### File

`FileDocumentWriter` 是一个 `DocumentWriter` 实现，它将 `Document` 对象列表的内容写入文件。

#### 用法

```java
@Component
class MyDocumentWriter {

    public void writeDocuments(List<Document> documents) {
        FileDocumentWriter writer = new FileDocumentWriter("output.txt", true, MetadataMode.ALL, false);
        writer.accept(documents);
    }
}
```

#### 构造函数

`FileDocumentWriter` 提供三个构造函数：

1. `FileDocumentWriter(String fileName)`
2. `FileDocumentWriter(String fileName, boolean withDocumentMarkers)`
3. `FileDocumentWriter(String fileName, boolean withDocumentMarkers, MetadataMode metadataMode, boolean append)`

#### 参数

* `fileName`：要写入文档的文件名。
* `withDocumentMarkers`：是否在输出中包含文档标记（默认值：false）。
* `metadataMode`：指定要写入文件的文档内容（默认值：MetadataMode.NONE）。
* `append`：如果为 true，数据将写入文件末尾而不是开头（默认值：false）。

#### 行为

`FileDocumentWriter` 按以下方式处理文档：

1. 它为指定的文件名打开 FileWriter。
2. 对于输入列表中的每个文档：
a. 如果 `withDocumentMarkers` 为 true，它写入包括文档索引和页码的文档标记。
b. 它根据指定的 `metadataMode` 写入文档的格式化内容。
3. 写入所有文档后关闭文件。

#### 文档标记

当 `withDocumentMarkers` 设置为 true 时，写入器为每个文档包含以下格式的标记：

```
### Doc: [index], pages:[start_page_number,end_page_number]
```

#### 元数据处理

写入器使用两个特定的元数据键：

* `page_number`：表示文档的起始页码。
* `end_page_number`：表示文档的结束页码。

这些在写入文档标记时使用。

#### 示例

```java
List<Document> documents = // initialize your documents
FileDocumentWriter writer = new FileDocumentWriter("output.txt", true, MetadataMode.ALL, true);
writer.accept(documents);
```

这将将所有文档写入 "output.txt"，包括文档标记，使用所有可用的元数据，如果文件已存在则追加到文件。

#### 注意事项

* 写入器使用 `FileWriter`，因此它使用操作系统的默认字符编码写入文本文件。
* 如果在写入过程中发生错误，会抛出 `RuntimeException`，原始异常作为其原因。
* `metadataMode` 参数允许控制现有元数据如何合并到写入的内容中。
* 此写入器对于调试或创建文档集合的人类可读输出特别有用。

### VectorStore

提供与各种向量存储的集成。
有关完整列表，请参阅 [Vector DB 文档](vectordbs.adoc)。
