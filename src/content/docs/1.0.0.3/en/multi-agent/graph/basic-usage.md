---
title: "Basic Usage"
description: "Learn the basic usage of Spring AI Alibaba Graph, including state definition, basic graph construction, and simple examples."
---

This document introduces the basic usage of Spring AI Alibaba Graph, including state definition, basic graph construction, and simple examples.

## Defining and Updating State

Before we start building graphs, we need to understand how to define and update state. State is the data structure shared by all nodes in the graph, which defines the graph's schema and controls how data flows between nodes.

### Defining State

State in Spring AI Alibaba Graph can be any Java class, but typically we use Map or custom Java classes. The state determines the input and output schema of the graph.

Let's start with a simple example that contains messages:

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
import org.springframework.ai.chat.messages.Message;

// Define state strategy
KeyStrategyFactory messageStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", KeyStrategy.APPEND);  // Messages use append strategy
    strategies.put("extra_field", KeyStrategy.REPLACE);  // Other fields use replace strategy
    return strategies;
};
```

This state tracks a list of message objects and an additional integer field.

### Updating State

Let's build an example graph with a single node. A node is a Java function that reads the graph's state and updates it:

```java
import org.springframework.ai.chat.messages.AssistantMessage;

NodeAction simpleNode = state -> {
    List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
    AssistantMessage newMessage = new AssistantMessage("Hello!");
    
    // Return state update
    List<Message> updatedMessages = new ArrayList<>(messages);
    updatedMessages.add(newMessage);
    
    return Map.of(
        "messages", updatedMessages,
        "extra_field", 10
    );
};
```

### Building the Graph

Now let's build a graph with this node:

```java
import com.alibaba.cloud.ai.graph.StateGraph;
import static com.alibaba.cloud.ai.graph.action.AsyncNodeAction.node_async;

StateGraph graph = new StateGraph(messageStateFactory)
    .addNode("simple_node", node_async(simpleNode))
    .addEdge(StateGraph.START, "simple_node")
    .addEdge("simple_node", StateGraph.END);

CompiledGraph compiledGraph = graph.compile();
```

### Running the Graph

```java
// Create initial state
Map<String, Object> initialState = Map.of(
    "messages", new ArrayList<Message>(),
    "extra_field", 0
);

// Run the graph
Optional<OverAllState> result = compiledGraph.invoke(initialState);

// Access the result
if (result.isPresent()) {
    List<Message> messages = result.get().value("messages", List.class).orElse(new ArrayList<>());
    messages.forEach(message -> System.out.println(message.getContent()));
}
```

## Using Reducers for State Updates

### What is a Reducer?

In Spring AI Alibaba Graph, a **Reducer** is a state update strategy that determines how new values are merged with existing state when nodes return updates. Think of it as "state merging rules".

### Why Do We Need Reducers?

Consider a chat scenario:
- The state contains a `messages` list with conversation history
- Each node might add new messages
- We want new messages to be **appended** to the existing list, not **replace** the entire list

### Default Behavior vs Reducer Behavior

**Without Reducer (default override behavior):**

```java
// Assume current state: messages = [message1, message2]
NodeAction nodeWithoutReducer = state -> {
    List<Message> currentMessages = state.value("messages", List.class).orElse(new ArrayList<>());
    
    // Manual append logic
    List<Message> updatedMessages = new ArrayList<>(currentMessages);
    updatedMessages.add(new AssistantMessage("New message"));
    
    return Map.of(
        "messages", updatedMessages  // Must return complete list
    );
};
// Result: messages = [message1, message2, new message]
```

**With Reducer (automatic append behavior):**

```java
// 1. First configure Reducer strategy
KeyStrategyFactory reducerStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("messages", KeyStrategy.APPEND);     // Auto-append new messages
    strategies.put("user_name", KeyStrategy.REPLACE);   // Replace user name
    strategies.put("counters", KeyStrategy.MERGE);      // Merge counter objects
    return strategies;
};

// 2. Node code is greatly simplified
NodeAction nodeWithReducer = state -> {
    AssistantMessage newMessage = new AssistantMessage("New message");
    
    return Map.of(
        "messages", List.of(newMessage),  // Only return new message, framework auto-appends
        "user_name", "Alice"              // Direct replacement
    );
};
// Result: messages = [message1, message2, new message] (auto-appended)
```

### Available KeyStrategy Types

Spring AI Alibaba provides several built-in state update strategies:

```java
KeyStrategyFactory strategyFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    
    // 1. APPEND - Append to list end
    strategies.put("messages", KeyStrategy.APPEND);
    
    // 2. REPLACE - Complete replacement (default behavior)
    strategies.put("current_user", KeyStrategy.REPLACE);
    
    // 3. MERGE - Merge objects/Maps
    strategies.put("metadata", KeyStrategy.MERGE);
    
    return strategies;
};
```

### Practical Application Example

Let's look at a complete chatbot example:

```java
@Component
public class ChatBotExample {
    
    // Configure state update strategies
    @Bean
    public KeyStrategyFactory chatKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("messages", KeyStrategy.APPEND);      // Message append
            strategies.put("user_info", KeyStrategy.MERGE);      // User info merge
            strategies.put("current_topic", KeyStrategy.REPLACE); // Current topic replace
            return strategies;
        };
    }
    
    // User input node
    NodeAction userInputNode = state -> {
        String userInput = (String) state.value("user_input").orElse("");
        UserMessage userMessage = new UserMessage(userInput);
        
        return Map.of(
            "messages", List.of(userMessage),  // Auto-append to message list
            "current_topic", extractTopic(userInput)  // Replace current topic
        );
    };
    
    // AI response node
    NodeAction aiResponseNode = state -> {
        List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());
        String response = generateResponse(messages);
        AssistantMessage aiMessage = new AssistantMessage(response);
        
        return Map.of(
            "messages", List.of(aiMessage),  // Auto-append AI reply
            "user_info", Map.of(            // Merge user info
                "last_interaction", Instant.now(),
                "message_count", 1
            )
        );
    };
    
    private String extractTopic(String input) {
        // Simple topic extraction logic
        return input.length() > 10 ? "Detailed discussion" : "Simple Q&A";
    }
    
    private String generateResponse(List<Message> messages) {
        // Simple response generation logic
        return "I understand your question, let me answer...";
    }
}
```

### Key Advantages

The main advantages of using Reducers:

1. **Code Simplification**: Nodes don't need to manually handle state merging logic
2. **Consistency**: All nodes use the same state update rules
3. **Maintainability**: State update logic is centrally managed
4. **Error Reduction**: Avoids common errors in manual merging

### Important Notes

- Each state key can only have one KeyStrategy
- If no KeyStrategy is specified, REPLACE behavior is used by default
- APPEND strategy requires the returned value to be a List type
- MERGE strategy requires the returned value to be a Map type

### State Field Planning

When building complex graphs, proper planning of state fields is very important. It's recommended to categorize state fields by functionality and lifecycle:

```java
KeyStrategyFactory wellStructuredStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // Input layer: Raw input data
    strategies.put("user_input", KeyStrategy.REPLACE);      // User input
    strategies.put("session_id", KeyStrategy.REPLACE);      // Session ID
    strategies.put("request_time", KeyStrategy.REPLACE);    // Request time

    // Processing layer: Intermediate processing results
    strategies.put("processed_input", KeyStrategy.REPLACE); // Processed input
    strategies.put("analysis_results", KeyStrategy.MERGE);  // Analysis results (mergeable)
    strategies.put("intermediate_data", KeyStrategy.REPLACE); // Intermediate data

    // Output layer: Final results
    strategies.put("final_answer", KeyStrategy.REPLACE);    // Final answer
    strategies.put("confidence_score", KeyStrategy.REPLACE); // Confidence score
    strategies.put("response_metadata", KeyStrategy.MERGE); // Response metadata

    // Logging layer: Execution logs and debug info
    strategies.put("execution_log", KeyStrategy.APPEND);    // Execution log
    strategies.put("performance_metrics", KeyStrategy.APPEND); // Performance metrics

    return strategies;
};
```

### Complete Question-Answer System Example

Here's a complete question-answer system example that demonstrates how to properly organize state fields:

```java
@Component
public class QuestionAnswerSystem {

    @Autowired
    private ChatClient chatClient;

    @Bean
    public KeyStrategyFactory qaStateFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("question", KeyStrategy.REPLACE);
            strategies.put("processed_question", KeyStrategy.REPLACE);
            strategies.put("answer", KeyStrategy.REPLACE);
            strategies.put("confidence", KeyStrategy.REPLACE);
            strategies.put("processing_steps", KeyStrategy.APPEND);
            return strategies;
        };
    }

    // Step 1: Preprocess question
    NodeAction preprocessQuestionNode = state -> {
        String question = (String) state.value("question").orElse("");
        String processedQuestion = question.trim().toLowerCase();

        return Map.of(
            "processed_question", processedQuestion,
            "processing_steps", "Question preprocessing completed"
        );
    };

    // Step 2: Generate answer
    NodeAction generateAnswerNode = state -> {
        String processedQuestion = (String) state.value("processed_question").orElse("");

        String answer = chatClient.prompt()
            .user("Please answer the following question: " + processedQuestion)
            .call()
            .content();

        // Simple confidence calculation
        double confidence = Math.min(0.9, answer.length() / 100.0);

        return Map.of(
            "answer", answer,
            "confidence", confidence,
            "processing_steps", "Answer generation completed"
        );
    };

    @Bean
    public CompiledGraph qaWorkflow() {
        StateGraph graph = new StateGraph(qaStateFactory())
            .addNode("preprocess", node_async(preprocessQuestionNode))
            .addNode("generate_answer", node_async(generateAnswerNode))

            .addEdge(START, "preprocess")
            .addEdge("preprocess", "generate_answer")
            .addEdge("generate_answer", END);

        return graph.compile();
    }
}
```

### Using the Question-Answer System

```java
@Service
public class QAService {

    @Autowired
    private CompiledGraph qaWorkflow;

    public QAResult askQuestion(String question) {
        Map<String, Object> initialState = Map.of("question", question);

        Optional<OverAllState> result = qaWorkflow.invoke(initialState);

        if (result.isPresent()) {
            OverAllState state = result.get();

            String answer = state.value("answer", String.class).orElse("Unable to generate answer");
            Double confidence = state.value("confidence", Double.class).orElse(0.0);
            List<String> steps = state.value("processing_steps", List.class).orElse(new ArrayList<>());

            return new QAResult(answer, confidence, steps);
        }

        return new QAResult("Processing failed", 0.0, List.of("Execution failed"));
    }

    // Result class
    public static class QAResult {
        private final String answer;
        private final double confidence;
        private final List<String> processingSteps;

        public QAResult(String answer, double confidence, List<String> processingSteps) {
            this.answer = answer;
            this.confidence = confidence;
            this.processingSteps = processingSteps;
        }

        // getters...
        public String getAnswer() { return answer; }
        public double getConfidence() { return confidence; }
        public List<String> getProcessingSteps() { return processingSteps; }
    }
}
```

## Creating Simple Linear Graphs

Linear graphs are the most basic graph structure where nodes execute in a fixed sequence. This pattern is suitable for:

- **Data Processing Pipelines**: Data needs to go through multiple transformation and processing steps
- **Workflows**: Business processes with clear sequential order
- **Multi-step Analysis**: Analysis tasks requiring multiple consecutive steps

### Basic Linear Graph Example

```java
@Component
public class LinearGraphExample {

    @Bean
    public KeyStrategyFactory linearKeyStrategyFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("input", KeyStrategy.REPLACE);
            strategies.put("processed_data", KeyStrategy.REPLACE);
            strategies.put("analysis_result", KeyStrategy.REPLACE);
            strategies.put("final_output", KeyStrategy.REPLACE);
            strategies.put("execution_log", KeyStrategy.APPEND);
            return strategies;
        };
    }

    // Step 1: Data preprocessing
    NodeAction preprocessNode = state -> {
        String input = (String) state.value("input").orElse("");
        String processedData = input.trim().toLowerCase();

        return Map.of(
            "processed_data", processedData,
            "execution_log", "Data preprocessing completed"
        );
    };

    // Step 2: Data analysis
    NodeAction analyzeNode = state -> {
        String processedData = (String) state.value("processed_data").orElse("");
        String analysisResult = "Analysis result for: " + processedData;

        return Map.of(
            "analysis_result", analysisResult,
            "execution_log", "Data analysis completed"
        );
    };

    // Step 3: Generate final output
    NodeAction outputNode = state -> {
        String analysisResult = (String) state.value("analysis_result").orElse("");
        String finalOutput = "Final report: " + analysisResult;

        return Map.of(
            "final_output", finalOutput,
            "execution_log", "Output generation completed"
        );
    };

    @Bean
    public CompiledGraph linearWorkflow() {
        StateGraph graph = new StateGraph(linearKeyStrategyFactory())
            .addNode("preprocess", node_async(preprocessNode))
            .addNode("analyze", node_async(analyzeNode))
            .addNode("output", node_async(outputNode))

            .addEdge(START, "preprocess")
            .addEdge("preprocess", "analyze")
            .addEdge("analyze", "output")
            .addEdge("output", END);

        return graph.compile();
    }
}
```

### Running Linear Graphs

```java
@Service
public class LinearGraphService {

    @Autowired
    private CompiledGraph linearWorkflow;

    public String processData(String input) {
        Map<String, Object> initialState = Map.of("input", input);

        Optional<OverAllState> result = linearWorkflow.invoke(initialState);

        if (result.isPresent()) {
            String output = result.get().value("final_output", String.class).orElse("No output");
            List<String> logs = result.get().value("execution_log", List.class).orElse(new ArrayList<>());

            System.out.println("Execution logs:");
            logs.forEach(System.out::println);

            return output;
        }

        return "Processing failed";
    }
}
```

## Building AI Conversation Systems: Using Messages in Graph State

In the previous examples, we learned how to use basic state fields (like strings, numbers) to build graphs. But in real AI applications, we often need to build **conversation systems**, which requires handling conversation history.

### Evolution from Simple State to Conversation State

Let's review the previous question-answer system example. In that example, we only handled single-turn Q&A:

```java
// Previous simple Q&A: each interaction is independent, no context
NodeAction simpleQANode = state -> {
    String question = (String) state.value("question").orElse("");
    String answer = chatClient.prompt()
        .user(question)  // Only send current question, no historical context
        .call()
        .content();

    return Map.of("answer", answer);
};
```

But in real AI applications, we usually need **multi-turn conversations** where the AI needs to remember previous conversation content:

```java
// User: Hello, my name is John
// AI: Hello John! Nice to meet you.
// User: What did I just say my name was?
// AI: You just said your name was John.  <-- This requires remembering previous conversation
```

### What are LLM Conversation Messages?

> **Important Note**: The "messages" here refer to **LLM conversation messages** (such as `UserMessage`, `AssistantMessage`), not messages from async message queues (like RabbitMQ, RocketMQ, Kafka, etc.). These are completely different concepts.

To implement multi-turn conversations, we need to use conversation message classes provided by Spring AI:

- **`UserMessage`**: Represents user input messages
- **`AssistantMessage`**: Represents AI assistant reply messages
- **`SystemMessage`**: Represents system instruction messages (like role settings)

These message objects form the conversation history, and LLMs can generate more accurate replies based on this history.

### Why Store Conversation Messages in Graph State?

1. **Maintain conversation context**: AI needs to remember what was said before
2. **Support multi-turn interactions**: Users can continue asking questions based on previous conversations
3. **Improve reply quality**: With context, AI replies are more accurate and relevant
4. **Comply with LLM API specifications**: Most LLM providers' APIs accept message lists as input

### Using Conversation Messages in Graphs

Now that we understand why we need conversation messages, let's see how to implement them in graph state. The key is to add a `messages` field to the state to store conversation history and use the `APPEND` strategy to accumulate conversation records.

#### Step 1: Upgrade State Strategy to Support Conversation Messages

```java
import com.alibaba.cloud.ai.graph.KeyStrategy;
import com.alibaba.cloud.ai.graph.KeyStrategyFactory;
// Note: These imports are for Spring AI conversation message classes, not message queue messages
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;

// Comparison: Previous simple state strategy
KeyStrategyFactory simpleStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();
    strategies.put("question", KeyStrategy.REPLACE);  // Only current question
    strategies.put("answer", KeyStrategy.REPLACE);    // Only current answer
    return strategies;
};

// Upgrade: State strategy supporting conversation history
KeyStrategyFactory conversationStateFactory = () -> {
    Map<String, KeyStrategy> strategies = new HashMap<>();

    // Basic data uses replace strategy
    strategies.put("current_input", KeyStrategy.REPLACE);
    strategies.put("user_id", KeyStrategy.REPLACE);
    strategies.put("session_id", KeyStrategy.REPLACE);

    // Key improvement: Add conversation message history
    // messages field stores conversation message objects like UserMessage, AssistantMessage
    strategies.put("messages", KeyStrategy.APPEND);  // Use APPEND to accumulate conversation history

    // Other auxiliary data
    strategies.put("conversation_metadata", KeyStrategy.MERGE);

    return strategies;
};

#### Step 2: Implement Nodes Supporting Conversation History

```java
// Comparison: Previous simple Q&A node (no history)
NodeAction simpleQANode = state -> {
    String question = (String) state.value("question").orElse("");

    // Only send current question, no context
    String answer = chatClient.prompt()
        .user(question)
        .call()
        .content();

    return Map.of("answer", answer);
};

// Upgrade: Node supporting conversation history
NodeAction conversationNode = state -> {
    // 1. Read existing conversation message history (not message queue messages)
    List<Message> conversationHistory = state.value("messages", List.class).orElse(new ArrayList<>());
    String currentInput = state.value("current_input", String.class).orElse("");

    // 2. Create message object for user's current input
    UserMessage userMessage = new UserMessage(currentInput);

    // 3. Call LLM, key: pass complete conversation history
    String response = chatClient.prompt()
        .messages(conversationHistory)  // Pass conversation history for AI context
        .user(currentInput)             // Add current user input
        .call()
        .content();

    // 4. Create AI assistant's reply message object
    AssistantMessage assistantMessage = new AssistantMessage(response);

    // 5. Return state update: new conversation messages will be appended to history
    return Map.of(
        "messages", List.of(userMessage, assistantMessage),  // These two messages will be appended
        "last_response", response,
        "conversation_metadata", Map.of(
            "last_interaction_time", Instant.now(),
            "message_count", conversationHistory.size() + 2
        )
    );
};
```

### Complete Message-Based Chat Example

```java
@Component
public class ChatGraphExample {

    @Autowired
    private ChatClient chatClient;

    @Bean
    public KeyStrategyFactory chatStateFactory() {
        return () -> {
            Map<String, KeyStrategy> strategies = new HashMap<>();
            strategies.put("messages", KeyStrategy.APPEND);
            strategies.put("user_input", KeyStrategy.REPLACE);
            strategies.put("session_id", KeyStrategy.REPLACE);
            strategies.put("conversation_metadata", KeyStrategy.MERGE);
            return strategies;
        };
    }

    // User input processing node
    NodeAction userInputNode = state -> {
        String input = state.value("user_input", String.class).orElse("");
        UserMessage userMessage = new UserMessage(input);

        return Map.of(
            "messages", List.of(userMessage),
            "conversation_metadata", Map.of(
                "last_user_input_time", Instant.now(),
                "input_length", input.length()
            )
        );
    };

    // AI response node
    NodeAction aiResponseNode = state -> {
        List<Message> messages = state.value("messages", List.class).orElse(new ArrayList<>());

        String response = chatClient.prompt()
            .messages(messages)
            .call()
            .content();

        AssistantMessage assistantMessage = new AssistantMessage(response);

        return Map.of(
            "messages", List.of(assistantMessage),
            "conversation_metadata", Map.of(
                "last_ai_response_time", Instant.now(),
                "response_length", response.length()
            )
        );
    };

    @Bean
    public CompiledGraph chatWorkflow() {
        StateGraph graph = new StateGraph(chatStateFactory())
            .addNode("user_input", node_async(userInputNode))
            .addNode("ai_response", node_async(aiResponseNode))

            .addEdge(START, "user_input")
            .addEdge("user_input", "ai_response")
            .addEdge("ai_response", END);

        return graph.compile();
    }
}
```

### Running the Chat Graph

```java
@Service
public class ChatService {

    @Autowired
    private CompiledGraph chatWorkflow;

    public String chat(String userInput, String sessionId) {
        Map<String, Object> initialState = Map.of(
            "user_input", userInput,
            "session_id", sessionId,
            "messages", new ArrayList<Message>()
        );

        Optional<OverAllState> result = chatWorkflow.invoke(initialState);

        if (result.isPresent()) {
            List<Message> messages = result.get().value("messages", List.class).orElse(new ArrayList<>());

            // Get the last assistant message
            return messages.stream()
                .filter(msg -> msg instanceof AssistantMessage)
                .map(Message::getContent)
                .reduce((first, second) -> second)
                .orElse("No response generated");
        }

        return "Chat processing failed";
    }
}
```

## Next Steps

- Learn advanced configuration: [Advanced Configuration](./advanced-config)
- Understand control flow: [Control Flow](./control-flow)
- Return to overview: [Overview](./overview)
```
