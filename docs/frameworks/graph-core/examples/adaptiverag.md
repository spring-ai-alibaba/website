---
title: Adaptive RAG
description: 自适应检索增强生成(Adaptive RAG)示例，动态调整检索策略
keywords: [Adaptive RAG, 自适应RAG, 检索增强, 动态检索, RAG优化]
---

# Adaptive RAG

## 初始化

配置日志和 ChatClient

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;

private static final Logger log = LoggerFactory.getLogger("AdaptiveRag");

```

## AnswerGrader 实现

使用 Spring AI Alibaba 实现答案评分功能


```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import java.util.Map;
import java.util.function.Function;

public class AnswerGrader implements Function<AnswerGrader.Arguments, AnswerGrader.Score> {

    /**
     * Binary score to assess answer addresses question.
     */
    public static class Score {
        public String binaryScore;

        @Override
        public String toString() {
            return "Score: " + binaryScore;
        }
    }

    record Arguments(String question, String generation) {
    }

    private final ChatClient chatClient;

    public AnswerGrader(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Score apply(Arguments args) {
        String systemPrompt = """
            You are a grader assessing whether an answer addresses and/or resolves a question.

            Give a binary score 'yes' or 'no'. Yes, means that the answer resolves the question otherwise return 'no'
            """;

        String userPrompt = """
            User question:

            {question}

            LLM generation:

            {generation}
            """;

        PromptTemplate promptTemplate = new PromptTemplate(userPrompt);
        Map<String, Object> params = Map.of(
            "question", args.question(),
            "generation", args.generation()
        );

        String response = chatClient.prompt()
            .system(systemPrompt)
            .user(promptTemplate.create(params).getContents())
            .call()
            .content();

        log.trace("prompt: User question: {} LLM generation: {}", args.question(), args.generation());

        Score score = new Score();
        score.binaryScore = response.toLowerCase().contains("yes") ? "yes" : "no";

        return score;
    }

}

```

## 测试示例

配置 ChatClient 并测试 AnswerGrader

```java
// 配置 ChatClient
ChatClient.Builder chatClientBuilder = ChatClient.builder(chatModel);
var grader = new AnswerGrader(chatClientBuilder);

// 测试案例 1: 答案不相关
var args = new AnswerGrader.Arguments(
    "What are the four operations?",
    "LLM means Large Language Model"
);
var result = grader.apply(args);
System.out.println(result); // 输出: Score: no

// 测试案例 2: 答案相关
args = new AnswerGrader.Arguments(
    "What are the four operations",
    "There are four basic operations: addition, subtraction, multiplication, and division."
);
result = grader.apply(args);
System.out.println(result); // 输出: Score: yes

// 测试案例 3: NFL draft 问题
args = new AnswerGrader.Arguments(
    "What player at the Bears expected to draft first in the 2024 NFL draft?",
    "The Bears selected USC quarterback Caleb Williams with the No. 1 pick in the 2024 NFL Draft."
);
result = grader.apply(args);
System.out.println(result); // 输出: Score: yes


