---
title: Local Integration with Bailian Agent Applications
keywords: [Spring AI Alibaba,Bailian,Agent Applications]
description: "Use the Spring AI Alibaba framework to connect local Spring Boot applications to Bailian agent applications, enabling access to Bailian agent application APIs."
---

Alibaba Cloud Bailian is a visual AI agent application development platform that provides three development modes for large model applications: agent, workflow, and agent orchestration. It supports knowledge base retrieval, internet search, workflow design, and agent collaboration.

This example demonstrates how to develop and publish a simple agent application using Bailian, and then shows how to connect a regular Spring Boot microservice application to the agent, enabling intelligent capabilities in ordinary applications.

![agent-architecture.png](/img/user/ai/practices/bailian-agent/agent-architecture.png)

## Define and Publish a Bailian Agent Application

Open the Bailian console and create your own agent application as shown below. For detailed application creation steps, refer to the [Bailian official documentation](https://help.aliyun.com/zh/model-studio/user-guide/application-introduction).

![bailian-app-new.png](/img/user/ai/practices/bailian-agent/bailian-app-new.png)

After editing the application, you can visually test it online. If the test meets your expectations, click the "Publish" button in the upper right corner of the page to officially publish the agent.

![bailian-app-publish.png](/img/user/ai/practices/bailian-agent/bailian-app-publish.png)

After publishing, we can communicate with this agent application through APIs. Next, we'll demonstrate how to quickly access this agent application in a Spring Boot application.

## Calling the Agent Application in a Spring Boot Application

To allow a Spring Boot application to access an agent application published in Bailian, first add the Spring AI Alibaba dependency:

```xml
<dependency>
	<groupId>com.alibaba.cloud.ai</groupId>
	<artifactId>spring-ai-alibaba-starter</artifactId>
	<version>${spring-ai-alibaba.version}</version>
</dependency>
```

Next, obtain the application identifier, model API key, and other information from the Bailian platform:

```yaml
spring:
  ai:
    dashscope:
      agent:
        app-id: put-your-app-id-here
      api-key: ${AI_DASHSCOPE_API_KEY}
```

* api-key: Required, the key for accessing the model service.
* app-id: Required, each Bailian application has a unique ID.
* workspace-id: Optional, defaults to using the default business space. If the application was created in a separate business space, you need to specify this.

Application ID:

![bailian-app-id.png](/img/user/ai/practices/bailian-agent/bailian-app-id.png)

Workspace:

![bailian-app-workspace.png](/img/user/ai/practices/bailian-agent/bailian-app-workspace.png)


Spring AI Alibaba uses `DashScopeAgent` for access. Here's how to use it:

```java
public class BailianAgentRagController {
	private DashScopeAgent agent;

	@Value("${spring.ai.dashscope.agent.app-id}")
	private String appId;

	public BailianAgentRagController(DashScopeAgentApi dashscopeAgentApi) {
		this.agent = new DashScopeAgent(dashscopeAgentApi);
	}

	@GetMapping("/bailian/agent/call")
	public String call(@RequestParam(value = "message") String message) {
		ChatResponse response = agent.call(new Prompt(message, DashScopeAgentOptions.builder().withAppId(appId).build()));
		AssistantMessage app_output = response.getResult().getOutput();
		return app_output.getContent();
	}
}
```

Streaming call mode:

```java
public Flux<String> stream(@RequestParam(value = "message") String message) {
	return agent.stream(new Prompt(message, DashScopeAgentOptions.builder().withAppId(appId).build())).map(response -> {
		AssistantMessage app_output = response.getResult().getOutput();
		return app_output.getContent();
	});
}
```

> For the source code of the example project, please check the Github repository [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples/tree/main/spring-ai-alibaba-rag-example).
