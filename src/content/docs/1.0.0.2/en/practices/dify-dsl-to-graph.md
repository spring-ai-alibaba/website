---
title: Generating SAA Projects from Dify Workflows
keywords: [Spring AI Alibaba, Dify, DSL]
description: "This article explains how to convert AI applications developed on the Dify platform into Spring AI Alibaba applications."
---

## Operation Instructions
For export operation instructions, please refer to the [spring-ai-alibaba-graph-studio](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-graph/spring-ai-alibaba-graph-studio) module to quickly generate a Spring AI Alibaba project.

After starting Graph Studio, you can currently generate a project by calling the following HTTP request, which will automatically generate a zip package of the Spring AI Alibaba project.

```shell
curl --location --request POST 'http://localhost:8080/starter.zip' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'dependencies=spring-ai-alibaba-graph,web' \
--data-urlencode 'appMode=workflow' \
--data-urlencode 'type=maven-project' \
--data-urlencode 'language=java' \
--data-urlencode 'bootVersion=3.5.0' \
--data-urlencode 'baseDir=demo' \
--data-urlencode 'groupId=com.example' \
--data-urlencode 'artifactId=demo' \
--data-urlencode 'name=demo' \
--data-urlencode 'description=Spring AI Alibaba Project Exported from Dify.' \
--data-urlencode 'packageName=com.example.demo' \
--data-urlencode 'packaging=jar' \
--data-urlencode 'javaVersion=17' \
--data-urlencode '{put-your-dify-dsl-here}'
```

> Please note that this supporting functionality is still under continuous development. Please pay attention to documentation updates, as we will add more detailed explanations.

## Performance Test Data

### Test Cluster Specifications
1. Spring AI Alibaba project, independently deployed container, maintaining default thread pool and other configuration parameters, 2 PODs, POD specification 2C4G
2. Dify platform, official deployment method, maintaining default configuration parameters, with 2 PODs for each component, POD specification 2C4G

### Effective Concurrent Processing Limit
* **Test Method:** For each scenario, starting from 10 RPS (Requests Per Second) and gradually increasing until increasing the RPS value no longer improves TPS and the success rate decreases.
* **Conclusion:** Dify's maximum processing limit is < 10 RPS; Spring AI Alibaba's maximum processing limit is approximately 150 RPS.

Dify performance test screenshot:

![Dify DSL to Graph](/img/user/ai/practices/dify/dify-base-rps.png)

Spring AI Alibaba performance test screenshot:

![Dify DSL to Graph](/img/user/ai/practices/dify/spring-ai-alibaba-base-rps.png)


### Throughput in Extreme Scenarios
* **Test Method:** Sending test request volumes far exceeding reasonable concurrency to the cluster (test scenario: 1000 RPS), observing changes in the cluster's throughput and success rate.
* **Conclusion:** In this scenario, Dify's success rate is less than 10%, with an average RT approaching 60s, and most requests timing out (response greater than 60s); Spring AI Alibaba's success rate remains largely unchanged, maintaining over 99%, with an average RT around 18s.

Dify performance test screenshot:

![Dify DSL to Graph](/img/user/ai/practices/dify/dify-extreme-rps.png)

Spring AI Alibaba performance test screenshot:

![Dify DSL to Graph](/img/user/ai/practices/dify/spring-ai-alibaba-extreme-rps.png)

### Optimization Potential
* For Dify, subsequent optimization could involve adjusting related component configurations to see if there is performance improvement.
* For SAA, it is expected that simple adjustments to the thread pool strategy could significantly increase current concurrency and throughput.
