---
title: 多模态 Agent
description: 用 ReactAgent 处理媒体输入、调用多模态工具并交付图片和音频。
---

# 多模态 Agent

`ReactAgent` 可将带媒体的用户消息交给模型，并让模型决定何时调用工具。例如，用户上传门店照片，请 Agent 提取招牌风格，再决定是否调用图片生成工具制作新版插画。只要求读图时可以直接调用支持视觉的聊天模型。需要生成插画时可以让 Agent 调用专用图像模型。

使用 [2.1.x BOM](/docs/versions)，引入 `com.alibaba.cloud.ai:spring-ai-alibaba-agent-framework` 和选用的模型 Starter。下面的百炼示例使用 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`。如果 Spring 容器中有多个 `ChatModel`，显式注入对应模型。

## 直接传入图像与文字

使用 DashScope HTTP Starter 时可用下列配置启动视觉模型。示例使用实际接受图片的模型。换用其他模型时检查多模态端点、工具调用和媒体格式。若只调用下例中的视觉 Agent，无需为它配置工具。

```yaml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
      chat:
        model: qwen4-max
        multi-model: true
        enable-thinking: false
```

从应用已验证的上传文件构造 `Media`。如果输入是业务存储中的媒体，可改用 `new Media(mimeType, modelAccessibleUri)`。URL 必须能被所选模型的端点访问。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.content.Media;
import org.springframework.core.io.Resource;
import org.springframework.util.MimeTypeUtils;

static AssistantMessage describeSign(ChatModel visionModel, Resource png)
        throws GraphRunnerException {
    var agent = ReactAgent.builder()
        .name("sign-reviewer")
        .model(visionModel)
        .build();

    var request = UserMessage.builder()
        .text("描述照片中招牌的文字、配色与布局。看不清的地方请说明。")
        .media(new Media(MimeTypeUtils.IMAGE_PNG, png))
        .build();

    return agent.call(request);
}
```

`agent.call(UserMessage)` 返回最终 `AssistantMessage`。用 `getText()` 读取正文，用 `getParts()` 取得有序内容，或用 `getMedia()` 检查模型是否返回媒体。需要工具结果和图状态时调用 `agent.invoke(request)`。传入多轮历史时使用 `List<Message>`。多张图片可以放在同一条消息里，需将文字与媒体交错时用 `.part(TextPart.of(...))` 和 `.part(MediaPart.of(...))` 依次加入。[消息与 Message Parts](messages.md)

视频、录音与文档沿用消息入口。用于视频的同一适配器可能分别支持视频 URL、字节和帧序列，按模型要求选择。PDF 可交给支持 PDF 的模型，也可通过文档工具抽取文本并保留页码。语音只需要转写时，转录模型和普通聊天模型即可构成一条独立路径。[百炼多模态接入](/integration/multimodals/dashscope-multimodal) · [语音识别](/integration/multimodals/audio/transcriptions/dashscope-transcriptions)

## 让 Agent 选择专用多模态工具

给 Agent 注册职责明确的工具。理解类工具适合返回带证据位置的文字结果，例如 `inspect_image(assetId, question)` 返回观察和制品 ID，`transcribe_audio(assetId)` 返回转录及时间戳，`read_document(assetId)` 返回段落与页码。工具用当前用户权限解析 `assetId`，再调用适合该输入的模型或解析器。主聊天模型可以使用这些文字结果继续推理。

以 `inspect_image` 为例，模型只需填写 `{ "assetId": "storefront-photo-42", "question": "招牌有什么颜色？" }`。工具根据当前授权解析 `assetId`，复用上面的媒体消息构造，把 `question` 与图片交给视觉模型。工具将解释和来源 ID 作为结构化文本返回，例如 `{ "assetId": "storefront-photo-42", "observation": "招牌为蓝底白字。" }`。需要看视频时可以用同一模式返回观察及时间范围。

生成类工具调用 `ImageModel`、语音合成模型或视频服务。下面演示图片工具。`publishPng` 是应用提供的函数，负责从 `Image` 的 URL 或 Base64 获取内容、验证 PNG 格式、写入应用存储，并返回客户端可访问的 HTTPS 地址。工具结果中的说明和媒体可由应用直接读取。

```java
import java.util.List;
import java.util.function.Function;

import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.tool.multimodal.MultimodalToolCallResultConverter;
import com.alibaba.cloud.ai.graph.agent.tool.multimodal.ToolMultimodalResult;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.image.Image;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.util.MimeTypeUtils;

static final class IllustrationTool {
    private final ImageModel imageModel;
    private final Function<Image, String> publishPng;

    IllustrationTool(ImageModel imageModel, Function<Image, String> publishPng) {
        this.imageModel = imageModel;
        this.publishPng = publishPng;
    }

    @Tool(name = "generate_illustration",
        description = "Generate an illustration from the supplied description",
        resultConverter = MultimodalToolCallResultConverter.class)
    public ToolMultimodalResult generate(@ToolParam(description = "Illustration description") String description) {
        var generation = imageModel.call(new ImagePrompt(description)).getResult();
        if (generation == null) {
            throw new IllegalStateException("Image model returned no generation");
        }
        var image = generation.getOutput();
        String url = publishPng.apply(image);
        return ToolMultimodalResult.of("插画已生成。",
            ToolMultimodalResult.mediaFromUrl(url, MimeTypeUtils.IMAGE_PNG));
    }
}

static List<ToolResponseMessage.ToolResponse> generateIllustration(
        ChatModel planningModel, ImageModel imageModel, Function<Image, String> publishPng, UserMessage request)
        throws GraphRunnerException {
    var agent = ReactAgent.builder()
        .name("illustration-agent")
        .model(planningModel)
        .methodTools(new IllustrationTool(imageModel, publishPng))
        .build();

    var result = agent.invoke(request).orElseThrow();
    return result.<List<Message>>value("messages").orElseThrow().stream()
        .filter(ToolResponseMessage.class::isInstance)
        .map(ToolResponseMessage.class::cast)
        .flatMap(message -> message.getResponses().stream())
        .filter(response -> "generate_illustration".equals(response.name()))
        .toList();
}
```

仅根据文字生成时，传入 `new UserMessage("请调用插画工具，生成一张蓝白配色的书店门面插画。")`。若要让同一个 Agent 先看原图再决定是否生成，把原图放进 `UserMessage.media(...)`，并选择同时支持图像输入和函数调用的 `planningModel`。工具参数仍是模型根据原图生成的文字描述。对参考图进行编辑时，可在工具参数中传入制品 ID，再通过图像模型的参考图选项提交解析后的媒体。

这段代码读取单次运行中对应工具的 `responseData()`。若模型没有发起调用，结果列表为空。应用应验证工具结果及 MIME 后渲染。多轮会话按运行和工具调用 ID 筛选，或在应用存储中按运行记录制品关系，避免把前一轮的文件当作本轮结果。面向应用的长期接口宜返回稳定制品 ID，在交付时签发 URL。

```json
{
  "text": "插画已生成。",
  "media": [
    { "type": "image", "mimeType": "image/png", "url": "https://media.example.com/illustrations/42.png" }
  ]
}
```

如果希望工具完成后直接结束，可以为该工具设置 `@Tool(returnDirect = true, ...)`。该标记仍由模型决定是否触发工具调用。上面的转换器会把结果编码成 JSON 文本，直接返回时也应按 JSON 解析。用转换器处理内联媒体时，默认 URL 模式可能把字节写入临时文件并返回 `file:` 地址。部署时先使用应用存储。Base64 转换器适合有大小限制的内联响应，避免把大型媒体编码放入模型循环。

### 给模型看工具产物

如果主 Agent 需要根据工具生成的图片继续工作，可在质检工具中根据 `assetId` 读取图片，发起一次带 `Media` 的视觉模型请求，再把检查结果交回主 Agent。也可以在应用取得工具产物后，明确发起新的用户消息轮次，附带应用已解析的媒体。当前普通回调只返回字符串，DashScope 工具消息也只接受文本。`ToolResultPart` 能表示有序媒体工具结果，发送前需要验证执行路径和适配器。显式构造方式见 [Graph 工具反馈](../../graph-core/examples/multimodal-workflow.md#rich-tool-result)。

[工具注册和调用](tools.md) · [图像与语音生成示例](https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/multimodal)

## 直接接收聊天模型产生的媒体

模型和端点支持原生媒体输出时，给 Agent 注入已开启该输出的 `ChatModel`，继续使用 `agent.call(...)`。下面使用 `org.springframework.ai:spring-ai-openai`。`apiKey` 来自应用配置，`audioModelName` 是当前部署支持同步文本和音频输出的模型名。实际服务中可将模型与 Agent 构造成可复用的 bean。

```java
import java.util.List;

import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatOptions.AudioParameters;

static AssistantMessage audioReply(String apiKey, String audioModelName, String question)
        throws GraphRunnerException {
    var options = OpenAiChatOptions.builder()
        .apiKey(apiKey)
        .model(audioModelName)
        .outputModalities(List.of("text", "audio"))
        .outputAudio(new AudioParameters(AudioParameters.Voice.ALLOY,
            AudioParameters.AudioResponseFormat.WAV))
        .build();
    var model = OpenAiChatModel.builder().options(options).build();
    return ReactAgent.builder().name("spoken-answer").model(model).build().call(question);
}
```

`AssistantMessage.getMedia()` 可为空。若目标是朗读 Agent 最终正文，并且应用需要指定音色与文件编码，可在 `call` 之后把 `getText()` 交给语音合成模型，或注册语音生成工具让 Agent 按需调用。原生语音的输入输出、是否能同时使用工具以及能否回放上一轮音频，按端点单独验证。[Spring AI OpenAI 聊天适配器](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html) · [百炼语音合成](/integration/multimodals/audio/speech/dashscope-speech)

## 流式、追问与交付

- 通过 `agent.stream(request)` 消费中间输出。输出为 `StreamingOutput` 时，可通过 `message()` 读取消息部分，并用 `chunk()` 展示文本增量。保存或交付完整图片、音频时，从聚合后的媒体消息或已写入存储的制品取得内容。
- 跨轮会话使用绑定会话的 `RunnableConfig.threadId(...)` 和所选 saver。将大媒体的稳定 ID 与租户绑定。用户追问“刚生成的第二张图”时，用应用保存的顺序和制品 ID 解析并重新附加，保持媒体与相应轮次的关系。
- 需要边说边听时，用实时语音协议接收音频帧、处理打断，并以定稿文本或明确的工具调用驱动 Agent。普通 Agent 流可用于流式文本以及业务过程展示。[实时语音 Agent 示例](https://github.com/alibaba/spring-ai-alibaba/tree/v2.1.0.0/examples/voice-agent)

## 运行仓库示例

按 [图文工作流的启动与调用步骤](../../multimodality.md#run-image-workflows) 运行示例。`POST /api/workflows/agent` 将上传图片和问题交给使用 `qwen4-max` 的 `ReactAgent`。开启插画后，模型调用 `generate_illustration` 并传入观察结果和生成提示。工具将生成图片存到应用目录并返回制品 ID，HTTP 层从实际工具消息中取得 ID，再生成展示地址。

需要对制品生成、质检和审批固定执行顺序时，使用 [Graph 多模态工作流](../../graph-core/examples/multimodal-workflow.md)。模型、媒体存储和工具边界见 [多模态架构与选型](../../multimodality.md)。
