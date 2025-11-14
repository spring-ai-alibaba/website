---
title: "Spring AI Alibaba实践｜后台定时Agent"
description: "Spring AI Alibaba实践｜后台定时Agent"
date: "2025-10-23"
category: "article"
keywords: ["SCA-AI"]
authors: "CH3CHO"
---

作者：千习

参考Langchain的这篇文章[https://blog.langchain.com/introducing-ambient-agents/](https://blog.langchain.com/introducing-ambient-agents/)，面对目前我们常见Chat模式的Agent形态以外，还可以充分发挥Agent新的运行形态：

+ 自主持续运行Agent：突破目前大部分AI应用依赖用户主动发起对话（Chat）聊天模式的限制。Agent通过监听环境信号（如：定时运行、消息事件、上下文变化），Agent作为智能体，按计划定时运行的特性在实际业务场景中非常有用。
+ Agent发起人机交互：关键点在于部分任务需通过“人工确认”机制（如通知、提问、审核）确保与用户目标一致，Agent在自主运行过程中需要一个人机交互窗口，支持人工介入机制，从而在自主性与可控性间取得平衡。

Spring AI Alibaba（以下简称SAA）为开发上述形态的Agent提供了相应的框架支持，方便业务快速实现上述场景需求下的Agent开发。

## 为什么需要自主运行Agent
通过自主运行的Agent可以充分发挥其执行效率，让其具备按预设规划自主工作的能力，无需每次都等待人类指令运行，可将Agent作为一个能替代你部分工作自主运行的“人”来看待。

![画板](https://img.alicdn.com/imgextra/i4/O1CN01eWsV1w1fOgArav4Bg_!!6000000003997-2-tps-862-529.png)

由此我们可以看到，随着Agent的能力增强，以及Agent自主能力的提升，应该会出现以下局面：

+ 个体创业者的能力边界将被大幅度拓宽。
+ 在工程领域多人协同的工作可拆解到由一个人+多Agent来完成，以提高生产效率。

从业务需求的角度看，可以有以下一些场景可探索挖掘。

+ **<font style="color:rgb(13, 18, 57);">自动化周期性业务  
</font>**<font style="color:rgb(13, 18, 57);">面向企业经营的业务系统，可构建周期性地自动收集分析数据、提取数据核心要素、可视化经营报表生成等场景。通过定时运行的Agent可实现无人值守的自动化执行，显著提升数据分析整理效率。相较于传统经营报表，通过模型对非结构化数据的分析总结能力，可显著提升报告质量。</font>
+ **<font style="color:rgb(13, 18, 57);">批量清算处理  
</font>**<font style="color:rgb(13, 18, 57);">部署多个Agent，每个Agent可同时批量并行处理不同维度的数据信息。在金融行业智能投研领域，AI Agent 可批量处理来自于不同数据源渠道的海量金融数据、新闻资讯和社交媒体信息，借助大模型充分挖掘行业投资机遇和风险事件。</font>
+ **<font style="color:rgb(13, 18, 57);">事件应急预案响应  
</font>**<font style="color:rgb(13, 18, 57);">在物联网、安全监控等场景中，系统需对突发消息事件（如设备报警、用户行为、危险事件识别触发）做出自动响应。后台常驻Agent可通过监听消息队列或定时巡检扫描的方式运行，分析识别事件等级做出响应级别的告警消息发布。</font>
+ **<font style="color:rgb(13, 18, 57);">人类参与决策判断  
</font>**<font style="color:rgb(13, 18, 57);">Agent自动处理，人只在需要时进入决策判断以提升效率。比如Agent每天固定时间自动采集汇总供应商的新闻、舆情及社交平台讨论，并进行风险分类与情绪分析；遇到高风险负面事件（如食品安全事故）时，Agent能通知管理人员人工介入判断，选择采取下一步行动策略，比如生成自检报告、批量通知各网点下架对应供应商产品等。</font>
+ **<font style="color:rgb(13, 18, 57);">复杂长周期任务  
</font>**<font style="color:rgb(13, 18, 57);">现阶段大批量基于模型进行数据分析处理的场景下，往往执行较慢，就不适合构建Chat模式交互。通过任务固定周期触发、涉及跨域和多模态数据分析，Agent在后台将数据做预制加工处理，最终交互上即可提供给用户加工完成后的数据信息。</font>
+ **<font style="color:rgb(13, 18, 57);">周期性任务记忆管理  
</font>**<font style="color:rgb(13, 18, 57);">定时后台运行的Agent，在每个周期执行后可以管理其对应的多个周期的执行记忆。通过周期执行记录信息，可分析随时间周期变化，借助模型来解读数据的变化过程。比如出现舆论舆情时，可根据周期变化来分析事件是再持续发酵还是逐步消退，根据变化趋势来智能路由下一步决策。</font>

## 如何构建定时运行Agent
目前市面上定时AI Task相关的应用，主要分为以下几类：

| **<font style="color:rgb(0, 0, 255);">对比维度</font>** | **<font style="color:rgb(0, 0, 255);">Chat聊天模式</font>** | **<font style="color:rgb(0, 0, 255);">低代码平台</font>** | **<font style="color:rgb(0, 0, 255);">Agent开发框架</font>** |
| :---: | --- | --- | --- |
| **<font style="color:rgb(0, 0, 0);">代表性产品</font>** | <font style="color:rgb(0, 0, 0);">ChatGPT Task、Manus Task</font> | <font style="color:rgb(0, 0, 0);">百炼、Coze、Dify</font> | <font style="color:rgb(0, 0, 0);">LangGraph、Spring AI Alibaba</font> |
| **<font style="color:rgb(0, 0, 0);">使用方式</font>** | <font style="color:rgb(0, 0, 0);">通过聊天提示按指定周期执行某项任务</font> | <font style="color:rgb(0, 0, 0);">配置定时触发器，或者通过第三方定时触发源运行</font> | <font style="color:rgb(0, 0, 0);">提供API设置定时执行</font> |
| **<font style="color:rgb(0, 0, 0);">特点说明</font>** | <font style="color:rgb(0, 0, 0);">基于提示词简单周期性总结提醒</font> | <font style="color:rgb(0, 0, 0);">低代码开发场景，依赖外部触发源管理；可通过</font>[MSE任务调度产品](https://mse.console.aliyun.com/#/schedulerx-xxljob?region=cn-hangzhou)<font style="color:rgb(0, 0, 0);">配置Http任务触发运行</font> | <font style="color:rgb(0, 0, 0);">高代码场景，适合开发复杂企业级AI Agent应用场景；</font>[LangGraph CronJob](https://docs.langchain.com/langgraph-platform/cron-jobs)<font style="color:rgb(0, 0, 0);">需要对接其专用调度平台支持</font> |


接下来重点说明下SAA中的定时Agent设计构想，为了支持后台自主执行的Agent，在`CompiledGraph`上提供的`schedule(ScheduleConfig config)`方法可自由设置该Agent定时执行。对于后台定时运行的Agent任务在设计上都通过`ScheduledAgentManager`来进行任务的注册管理，目前开源默认实现提供了单机应用进程内的Agent任务运行管理实现。

![画板](https://img.alicdn.com/imgextra/i4/O1CN01930ciV29jEQ5RYEhB_!!6000000008103-2-tps-677-344.png)

通过上述方式，后续可支持在分布式部署场景下的定时Agent任务运行，同时为自定义Agent任务可视化管理和运行监控提供扩展点。

## 基于SAA自主运行Agent展示
Spring AI Alibaba作为Agent开发框架，可方便地为业务开发Agent提供了对应解决方案，同时在框架侧也提供了构建定时运行的Agent能力。后续将通过框架提供的定时调度、人工节点功能，实现两个实践案例：店铺经营分析Agent、评价舆情分析Agent。

**店铺经营日报Agent**

通过SAA框架可以方便的开发出自定义的Agent（Workflow Agent），相比于低代码平台的流程构建，通过编码方式定义Agent流程会更适合高度定制的场景。比如当前的这个Agent我们需要从多个维度（交易订单、产品说明、客户画像信息、门店基础信息、客户评价反馈等）去提取对应的数据信息，通过业务编码再结合Prompt模版提供给LLM进行分析处理在实现上更具灵活性和可控性。

通过这个方式，让业务报表既能保持关键数据的准确性，又可结合发挥模型对非结构化数据分析，提炼总结出报告的核心要点和下一步行动方案。

![画板](https://img.alicdn.com/imgextra/i3/O1CN01uujusv29im1YAcAKi_!!6000000008102-2-tps-794-362.png)

参考代码

```java
@Bean
public CompiledGraph dailyReportAgent(ChatModel chatModel) throws GraphStateException {

    ChatClient chatClient = ChatClient.builder(chatModel).defaultAdvisors(new SimpleLoggerAdvisor()).build();

    AsyncNodeAction dataLoaderNode = node_async(
        (state) -> {
            /*
             * 业务报告元数据读取，如：指定周期的订单销量数据、
             * 门店产品信息、订单用户反馈信息
             */
        }       
    );
    // 定义一个经营日报生成节点，根据提供的原始数据信息结合Prompt生成报告
    LlmNode llmDataAnalysisNode = LlmNode.builder().chatClient(chatClient)
            .paramsKey("data_summary")
            .outputKey("summary_message_to_sender")
            .userPromptTemplate(DAILY_REPORT)
            .build();
    // Agent流程：提取原始数据-->生成经营日报-->发送日报信息
    StateGraph stateGraph = new StateGraph("OperationAnalysisAgent", () -> {
        Map<String, KeyStrategy> strategies = new HashMap<>();
        strategies.put("data_summary", new ReplaceStrategy());
        strategies.put("summary_message_to_sender", new ReplaceStrategy());
        strategies.put("message_sender_result", new ReplaceStrategy());
        strategies.put("access_token", new ReplaceStrategy());
        return strategies;
    }).addNode("data_loader", dataLoaderNode)
            .addNode("data_analysis", node_async(llmDataAnalysisNode))
            .addNode("message_sender", node_async(generateMessageSender()))
            .addEdge(START, "data_loader")
            .addEdge("data_loader", "data_analysis")
            .addEdge("data_analysis", "message_sender")
            .addEdge("message_sender", END);

    CompiledGraph compiledGraph = stateGraph.compile();
    compiledGraph.setMaxIterations(100);

    // 设定当前Agent每天8点执行
    ScheduleConfig scheduleConfig = ScheduleConfig.builder()
				.cronExpression("0 0 8 */1 * ?") // 每天8点
				.build();
    compiledGraph.schedule(scheduleConfig);
    return compiledGraph;
}
```

![](https://img.alicdn.com/imgextra/i4/O1CN018CvR5H1ez1zhuo7yd_!!6000000003941-2-tps-716-1440.png)![](https://img.alicdn.com/imgextra/i4/O1CN01sgX4jQ1T66ixxFaUL_!!6000000002332-2-tps-708-1466.png)

****

**评价舆情分析Agent**

当前案例主要体现Agent自主定时运行，仅在分析发现必要时提示用户进入“人工决策”。相比较于传统的基于数值比较、关键词匹配等监控方式，通过LLM接入可增加业务监控新的维度，让监控面向更加泛化的数据场景，包括非结构化的文本数据、图片、影像等等，通过各类型结构数据充分挖掘出潜在风险。

![画板](https://img.alicdn.com/imgextra/i2/O1CN01EujHr51rOvmUTLUPw_!!6000000005622-2-tps-1108-389.png)

参考代码

```java
@Bean
public CompiledGraph evaluationAnalysisAgent(ChatModel chatModel,
                 FeedbackMapper feedbackMapper) throws GraphStateException {

    ChatClient chatClient = ChatClient.builder(chatModel).defaultAdvisors(new SimpleLoggerAdvisor()).build();

    EvaluationClassifierNode sessionAnalysis = EvaluationClassifierNode.builder()
            .chatClient(chatClient)
            .inputTextKey("iterator_item")
            .outputKey("session_analysis_result")
            .categories(List.of("yes", "no"))
            .classificationInstructions(List.of("要求返回纯JSON字符串，禁止包含非JSON格式内容，包含字段:user、time、complaint、satisfaction、summary。",
                            "complaint: 表示当前评价是否为店铺或产品投诉，取值范围（yes or no）.",
                            "satisfaction: 表示用户实际的消费满意度",
                            "summary: 提炼本条核心吐槽点，以及可以改进的方向"))
            .build();

    StateGraph sessionAnalysisGraph = new StateGraph("session_analysis", subFactory1)
            .addNode("iterator", node_async(sessionAnalysis))
            .addEdge(StateGraph.START, "iterator")
            .addEdge("iterator", StateGraph.END);

    AsyncNodeAction sessionLoaderNode = node_async((state) -> {
        // 舆情和评价数据加载... ...
        return result;
    });

    // 舆情评价结果分析汇总
    AsyncNodeAction sessionResultSummaryNode = node_async((state) -> {
        // 舆情评价结果分析汇总... ...
        return Map.of();
    });

    // 通过LLM生成告警报告
    LlmNode llmNode = LlmNode.builder().chatClient(chatClient)
            .paramsKey("summary_message")
            .outputKey("summary_message_to_sender")
            .systemPromptTemplate("自定义Prompt")
            .build();

    // 构建Agent运行流程
    StateGraph stateGraph = new StateGraph("ReviewAnalysisAgent", () -> {
        Map<String, KeyStrategy> strategies = new HashMap<>();
        ... ...
        return strategies;
    }).addNode("session_loader_node", sessionLoaderNode)
            .addNode("iteration_session_analysis_node", iterationNode)
            .addNode("session_result_summary_node", sessionResultSummaryNode)
            .addNode("message_parse", node_async(llmNode))
            .addNode("message_sender", node_async(generateMessageSender()))
            .addNode("human_feedback", node_async(new HumanFeedbackNode()))
            .addNode("human_action", node_async(new HumanActionNode()))
            .addEdge(START, "session_loader_node")
            .addEdge("session_loader_node", "iteration_session_analysis_node")
            .addEdge("iteration_session_analysis_node", "session_result_summary_node")
            .addConditionalEdges("session_result_summary_node", AsyncEdgeAction.edge_async(state -> {
                Integer complaint = state.value("complaint", 0);
                return complaint > 0 ? "message_parse" : StateGraph.END;
            }), Map.of("message_parse", "message_parse", StateGraph.END, StateGraph.END))
            .addEdge("message_parse", "message_sender")
            .addEdge("message_sender", "human_feedback")
            .addConditionalEdges("human_feedback", AsyncEdgeAction.edge_async(state -> {
                boolean ignore = state.value("ignore", true);
                return ignore ? StateGraph.END : "human_action";
            }), Map.of("human_action", "human_action", StateGraph.END, StateGraph.END))
            .addEdge("message_sender", END);

    CompiledGraph compiledGraph = stateGraph.compile();
    compiledGraph.setMaxIterations(1000);
    // 设定当前Agent每小时执行检测一次
    ScheduleConfig scheduleConfig = ScheduleConfig.builder()
				.cronExpression("0 0 */1 * * ?") // 每小时执行检测一次
				.build();
    compiledGraph.schedule(scheduleConfig);
    return compiledGraph;
}
```

![](https://img.alicdn.com/imgextra/i1/O1CN013zBO501VAo1Dwtovg_!!6000000002613-2-tps-726-1024.png)

## 结束语
自主运行的AI Agent开拓了企业智能化场景，通过定时触发、事件响应和人工协同机制，为业务带来高效、精准的自动化能力。借助Spring AI Alibaba框架，开发者可快速构建定制化Agent，实现从数据采集、分析到决策的全流程闭环。


