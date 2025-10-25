---
title: Human-in-the-Loop
description: Spring AI Alibaba human-in-the-loop capabilities
---

# Human-in-the-Loop

Human-in-the-loop (HITL) is an important pattern in multi-agent systems that allows human intervention at critical decision points, ensuring system controllability and reliability.

## Core Concepts

### Collaboration Modes
- **Human Supervision**: Humans monitor agent execution processes
- **Human Approval**: Critical decisions require human confirmation
- **Human Intervention**: Humans actively intervene in exceptional situations
- **Human Guidance**: Humans provide guidance and feedback

### Application Scenarios
- High-risk decision making
- Complex problem solving
- Quality control
- Learning and training

## Basic Configuration

```java
@Configuration
@EnableHumanInTheLoop
public class HumanInTheLoopConfig {
    
    @Bean
    public HumanInteractionManager humanInteractionManager() {
        return HumanInteractionManager.builder()
            .approvalService(approvalService())
            .notificationService(notificationService())
            .timeoutDuration(Duration.ofMinutes(30))
            .build();
    }
    
    @Bean
    public ApprovalService approvalService() {
        return new DatabaseApprovalService(dataSource());
    }
    
    @Bean
    public NotificationService notificationService() {
        return new EmailNotificationService(mailSender());
    }
}
```

## Human Approval Nodes

### Creating Approval Nodes

```java
@Component
public class HumanApprovalWorkflow {
    
    public StateGraph createApprovalWorkflow() {
        return StateGraph.builder(ApprovalState.class)
            .addNode("data_analysis", this::analyzeData)
            .addNode("human_review", this::requestHumanReview)
            .addNode("execute_action", this::executeAction)
            .addNode("notify_completion", this::notifyCompletion)
            .addEdge("data_analysis", "human_review")
            .addConditionalEdges("human_review", this::routeAfterReview)
            .addEdge("execute_action", "notify_completion")
            .setEntryPoint("data_analysis")
            .setFinishPoint("notify_completion")
            .build();
    }
    
    @HumanApprovalRequired(
        approvers = {"manager", "senior_analyst"},
        timeout = "PT30M",
        escalation = "director"
    )
    private ApprovalState requestHumanReview(ApprovalState state) {
        // Create approval request
        ApprovalRequest request = ApprovalRequest.builder()
            .requestId(UUID.randomUUID().toString())
            .title("Data Analysis Result Approval")
            .description("Please review the following data analysis results")
            .data(state.getAnalysisResult())
            .requiredApprovers(List.of("manager", "senior_analyst"))
            .deadline(Instant.now().plus(Duration.ofMinutes(30)))
            .build();
        
        // Submit approval request
        String approvalId = humanInteractionManager.submitApprovalRequest(request);
        
        // Wait for approval result
        ApprovalResult result = humanInteractionManager.waitForApproval(approvalId);
        
        return state.withApprovalResult(result);
    }
    
    private Map<String, String> routeAfterReview(ApprovalState state) {
        ApprovalResult result = state.getApprovalResult();
        
        if (result.isApproved()) {
            return Map.of("approved", "execute_action");
        } else {
            return Map.of("rejected", "notify_completion");
        }
    }
}
```

### Approval Service Implementation

```java
@Service
public class ApprovalService {
    
    @Autowired
    private ApprovalRequestRepository approvalRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    public String submitApprovalRequest(ApprovalRequest request) {
        ApprovalRequestEntity entity = ApprovalRequestEntity.builder()
            .id(request.getRequestId())
            .title(request.getTitle())
            .description(request.getDescription())
            .data(request.getData())
            .requiredApprovers(request.getRequiredApprovers())
            .status(ApprovalStatus.PENDING)
            .createdAt(Instant.now())
            .deadline(request.getDeadline())
            .build();
        
        approvalRepository.save(entity);
        
        // Send notifications to approvers
        for (String approver : request.getRequiredApprovers()) {
            notificationService.sendApprovalNotification(approver, request);
        }
        
        return request.getRequestId();
    }
    
    public ApprovalResult processApproval(String requestId, String approverId, ApprovalDecision decision) {
        ApprovalRequestEntity request = approvalRepository.findById(requestId)
            .orElseThrow(() -> new ApprovalRequestNotFoundException(requestId));
        
        if (request.getStatus() != ApprovalStatus.PENDING) {
            throw new ApprovalAlreadyProcessedException(requestId);
        }
        
        // Record approval decision
        ApprovalDecisionEntity decisionEntity = ApprovalDecisionEntity.builder()
            .requestId(requestId)
            .approverId(approverId)
            .decision(decision.getDecision())
            .comment(decision.getComment())
            .timestamp(Instant.now())
            .build();
        
        approvalDecisionRepository.save(decisionEntity);
        
        // Check if all required approvals are complete
        List<ApprovalDecisionEntity> decisions = approvalDecisionRepository.findByRequestId(requestId);
        ApprovalResult result = evaluateApprovalResult(request, decisions);
        
        if (result.isFinal()) {
            request.setStatus(result.isApproved() ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED);
            request.setCompletedAt(Instant.now());
            approvalRepository.save(request);
            
            // Notify result
            notificationService.sendApprovalResultNotification(request, result);
        }
        
        return result;
    }
    
    private ApprovalResult evaluateApprovalResult(ApprovalRequestEntity request, List<ApprovalDecisionEntity> decisions) {
        Set<String> requiredApprovers = new HashSet<>(request.getRequiredApprovers());
        Set<String> approvedBy = new HashSet<>();
        Set<String> rejectedBy = new HashSet<>();
        
        for (ApprovalDecisionEntity decision : decisions) {
            if (requiredApprovers.contains(decision.getApproverId())) {
                if (decision.getDecision() == DecisionType.APPROVED) {
                    approvedBy.add(decision.getApproverId());
                } else {
                    rejectedBy.add(decision.getApproverId());
                }
            }
        }
        
        // If any rejection, overall rejection
        if (!rejectedBy.isEmpty()) {
            return ApprovalResult.rejected(rejectedBy, "Request rejected by: " + String.join(", ", rejectedBy));
        }
        
        // If all required approvers have approved
        if (approvedBy.containsAll(requiredApprovers)) {
            return ApprovalResult.approved(approvedBy, "Request approved by all required approvers");
        }
        
        // Still waiting for more approvals
        return ApprovalResult.pending(approvedBy, "Waiting for approval from: " + 
            requiredApprovers.stream()
                .filter(approver -> !approvedBy.contains(approver))
                .collect(Collectors.joining(", ")));
    }
}
```

## Human Intervention

### Intervention Mechanism

```java
@Component
public class HumanInterventionService {
    
    @Autowired
    private ExecutionManager executionManager;
    
    @EventListener
    public void onExecutionError(ExecutionErrorEvent event) {
        if (requiresHumanIntervention(event)) {
            requestHumanIntervention(event);
        }
    }
    
    private boolean requiresHumanIntervention(ExecutionErrorEvent event) {
        return event.getErrorType() == ErrorType.CRITICAL ||
               event.getRetryCount() >= 3 ||
               event.getError().getMessage().contains("human_intervention_required");
    }
    
    private void requestHumanIntervention(ExecutionErrorEvent event) {
        InterventionRequest request = InterventionRequest.builder()
            .executionId(event.getExecutionId())
            .nodeId(event.getNodeId())
            .errorMessage(event.getError().getMessage())
            .currentState(event.getCurrentState())
            .suggestedActions(generateSuggestedActions(event))
            .priority(InterventionPriority.HIGH)
            .build();
        
        String interventionId = interventionManager.submitInterventionRequest(request);
        
        // Pause execution waiting for human intervention
        executionManager.pauseExecution(event.getExecutionId(), "Waiting for human intervention: " + interventionId);
        
        // Send notification
        notificationService.sendInterventionNotification(request);
    }
    
    private List<String> generateSuggestedActions(ExecutionErrorEvent event) {
        return List.of(
            "Retry current node",
            "Skip current node",
            "Modify execution state",
            "Terminate execution",
            "Rollback to previous checkpoint"
        );
    }
}
```

### Intervention Handling

```java
@RestController
@RequestMapping("/api/intervention")
public class InterventionController {
    
    @Autowired
    private InterventionService interventionService;
    
    @GetMapping("/pending")
    public ResponseEntity<List<InterventionRequest>> getPendingInterventions() {
        List<InterventionRequest> pending = interventionService.getPendingInterventions();
        return ResponseEntity.ok(pending);
    }
    
    @PostMapping("/{interventionId}/resolve")
    public ResponseEntity<Void> resolveIntervention(
            @PathVariable String interventionId,
            @RequestBody InterventionResolution resolution) {
        
        interventionService.resolveIntervention(interventionId, resolution);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{interventionId}/escalate")
    public ResponseEntity<Void> escalateIntervention(
            @PathVariable String interventionId,
            @RequestBody EscalationRequest escalation) {
        
        interventionService.escalateIntervention(interventionId, escalation);
        return ResponseEntity.ok().build();
    }
}

@Service
public class InterventionService {
    
    public void resolveIntervention(String interventionId, InterventionResolution resolution) {
        InterventionRequest request = interventionRepository.findById(interventionId)
            .orElseThrow(() -> new InterventionNotFoundException(interventionId));
        
        switch (resolution.getAction()) {
            case RETRY:
                retryExecution(request);
                break;
            case SKIP:
                skipNode(request);
                break;
            case MODIFY_STATE:
                modifyState(request, resolution.getNewState());
                break;
            case TERMINATE:
                terminateExecution(request);
                break;
            case ROLLBACK:
                rollbackExecution(request, resolution.getCheckpointId());
                break;
        }
        
        // Mark intervention as resolved
        request.setStatus(InterventionStatus.RESOLVED);
        request.setResolvedAt(Instant.now());
        request.setResolvedBy(resolution.getResolvedBy());
        interventionRepository.save(request);
        
        // Resume execution
        executionManager.resumeExecution(request.getExecutionId());
    }
}
```

## Human Feedback

### Feedback Collection

```java
@Component
public class FeedbackCollectionService {
    
    @Autowired
    private FeedbackRepository feedbackRepository;
    
    public void collectFeedback(String executionId, String nodeId, FeedbackRequest request) {
        Feedback feedback = Feedback.builder()
            .id(UUID.randomUUID().toString())
            .executionId(executionId)
            .nodeId(nodeId)
            .userId(request.getUserId())
            .rating(request.getRating())
            .comment(request.getComment())
            .suggestions(request.getSuggestions())
            .timestamp(Instant.now())
            .build();
        
        feedbackRepository.save(feedback);
        
        // Analyze feedback and apply improvements
        analyzeFeedbackAndImprove(feedback);
    }
    
    private void analyzeFeedbackAndImprove(Feedback feedback) {
        if (feedback.getRating() < 3) {
            // Low rating, needs analysis
            String analysisPrompt = String.format("""
                Analyze the following user feedback and identify issues and improvement suggestions:
                
                Rating: %d/5
                Comment: %s
                Suggestions: %s
                
                Please provide:
                1. Problem analysis
                2. Improvement suggestions
                3. Priority assessment
                """, 
                feedback.getRating(),
                feedback.getComment(),
                String.join(", ", feedback.getSuggestions())
            );
            
            FeedbackAnalysis analysis = chatClient.prompt()
                .user(analysisPrompt)
                .call()
                .entity(FeedbackAnalysis.class);
            
            // Create improvement task
            createImprovementTask(feedback, analysis);
        }
    }
    
    private void createImprovementTask(Feedback feedback, FeedbackAnalysis analysis) {
        ImprovementTask task = ImprovementTask.builder()
            .feedbackId(feedback.getId())
            .description(analysis.getProblemDescription())
            .suggestions(analysis.getImprovementSuggestions())
            .priority(analysis.getPriority())
            .status(TaskStatus.PENDING)
            .createdAt(Instant.now())
            .build();
        
        improvementTaskRepository.save(task);
        
        // Notify development team
        notificationService.sendImprovementTaskNotification(task);
    }
}
```

## Human Guidance

### Guidance System

```java
@Component
public class HumanGuidanceService {
    
    @Autowired
    private GuidanceRepository guidanceRepository;
    
    public void provideGuidance(String agentId, String context, GuidanceRequest request) {
        Guidance guidance = Guidance.builder()
            .id(UUID.randomUUID().toString())
            .agentId(agentId)
            .context(context)
            .instruction(request.getInstruction())
            .examples(request.getExamples())
            .constraints(request.getConstraints())
            .providedBy(request.getProvidedBy())
            .timestamp(Instant.now())
            .build();
        
        guidanceRepository.save(guidance);
        
        // Apply guidance to agent
        applyGuidanceToAgent(agentId, guidance);
    }
    
    private void applyGuidanceToAgent(String agentId, Guidance guidance) {
        // Update agent behavior patterns
        AgentBehavior behavior = agentService.getAgentBehavior(agentId);
        behavior.addGuidance(guidance);
        
        // Update agent context
        agentContextService.setAgentContext(agentId, "human_guidance", guidance);
        
        // Record guidance application
        GuidanceApplication application = GuidanceApplication.builder()
            .guidanceId(guidance.getId())
            .agentId(agentId)
            .appliedAt(Instant.now())
            .build();
        
        guidanceApplicationRepository.save(application);
    }
    
    public List<Guidance> getRelevantGuidance(String agentId, String currentContext) {
        List<Guidance> allGuidance = guidanceRepository.findByAgentId(agentId);
        
        return allGuidance.stream()
            .filter(guidance -> isRelevantToContext(guidance, currentContext))
            .sorted(Comparator.comparing(Guidance::getTimestamp).reversed())
            .limit(5)
            .collect(Collectors.toList());
    }
    
    private boolean isRelevantToContext(Guidance guidance, String currentContext) {
        // Use vector similarity or keyword matching to determine relevance
        double similarity = calculateContextSimilarity(guidance.getContext(), currentContext);
        return similarity > 0.7;
    }
}
```

## Collaboration Interface

### Web Interface

```java
@Controller
@RequestMapping("/human-collaboration")
public class HumanCollaborationController {
    
    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        List<ApprovalRequest> pendingApprovals = approvalService.getPendingApprovals();
        List<InterventionRequest> pendingInterventions = interventionService.getPendingInterventions();
        List<FeedbackRequest> feedbackRequests = feedbackService.getPendingFeedbackRequests();
        
        model.addAttribute("pendingApprovals", pendingApprovals);
        model.addAttribute("pendingInterventions", pendingInterventions);
        model.addAttribute("feedbackRequests", feedbackRequests);
        
        return "human-collaboration/dashboard";
    }
    
    @GetMapping("/approval/{requestId}")
    public String approvalDetail(@PathVariable String requestId, Model model) {
        ApprovalRequest request = approvalService.getApprovalRequest(requestId);
        model.addAttribute("request", request);
        return "human-collaboration/approval-detail";
    }
    
    @PostMapping("/approval/{requestId}/decide")
    public String processApproval(
            @PathVariable String requestId,
            @RequestParam String decision,
            @RequestParam String comment,
            HttpServletRequest httpRequest) {
        
        String approverId = getCurrentUserId(httpRequest);
        
        ApprovalDecision approvalDecision = ApprovalDecision.builder()
            .decision(DecisionType.valueOf(decision))
            .comment(comment)
            .build();
        
        approvalService.processApproval(requestId, approverId, approvalDecision);
        
        return "redirect:/human-collaboration/dashboard";
    }
}
```

## Real-time Communication

### WebSocket Support

```java
@Configuration
@EnableWebSocket
public class CollaborationWebSocketConfig implements WebSocketConfigurer {
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new CollaborationWebSocketHandler(), "/ws/collaboration")
                .setAllowedOrigins("*");
    }
}

@Component
public class CollaborationWebSocketHandler extends TextWebSocketHandler {
    
    private final Map<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String userId = getUserId(session);
        userSessions.put(userId, session);
    }
    
    @EventListener
    public void onApprovalRequest(ApprovalRequestEvent event) {
        for (String approverId : event.getRequiredApprovers()) {
            WebSocketSession session = userSessions.get(approverId);
            if (session != null && session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(
                        objectMapper.writeValueAsString(event)
                    ));
                } catch (IOException e) {
                    log.error("Failed to send approval notification", e);
                }
            }
        }
    }
    
    @EventListener
    public void onInterventionRequest(InterventionRequestEvent event) {
        // Notify all online administrators
        List<String> administrators = userService.getAdministrators();
        
        for (String adminId : administrators) {
            WebSocketSession session = userSessions.get(adminId);
            if (session != null && session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(
                        objectMapper.writeValueAsString(event)
                    ));
                } catch (IOException e) {
                    log.error("Failed to send intervention notification", e);
                }
            }
        }
    }
}
```

## Configuration Options

```properties
# Human-in-the-loop configuration
spring.ai.human-in-the-loop.enabled=true
spring.ai.human-in-the-loop.approval.timeout=30m
spring.ai.human-in-the-loop.intervention.auto-escalation=true

# Approval configuration
spring.ai.human-in-the-loop.approval.require-all=true
spring.ai.human-in-the-loop.approval.escalation-timeout=1h
spring.ai.human-in-the-loop.approval.notification.email=true

# Intervention configuration
spring.ai.human-in-the-loop.intervention.priority-threshold=HIGH
spring.ai.human-in-the-loop.intervention.auto-pause=true
spring.ai.human-in-the-loop.intervention.escalation-delay=15m

# Feedback configuration
spring.ai.human-in-the-loop.feedback.enabled=true
spring.ai.human-in-the-loop.feedback.auto-collect=true
spring.ai.human-in-the-loop.feedback.analysis.enabled=true

# Notification configuration
spring.ai.human-in-the-loop.notification.email.enabled=true
spring.ai.human-in-the-loop.notification.websocket.enabled=true
spring.ai.human-in-the-loop.notification.sms.enabled=false
```

## Best Practices

### 1. Design Principles
- Clearly define when human intervention is needed
- Provide clear context information
- Design intuitive interaction interfaces

### 2. Process Optimization
- Set reasonable timeout periods
- Implement escalation mechanisms
- Provide quick decision options

### 3. User Experience
- Simplify operation workflows
- Provide real-time notifications
- Support mobile access

### 4. Quality Assurance
- Record all human decisions
- Analyze decision patterns
- Continuously improve the system

## Next Steps

- [Learn about Durable Execution & Time Travel](/docs/1.0.0.3/multi-agent/durable-execution/)
- [Understand Subgraphs](/docs/1.0.0.3/multi-agent/subgraphs/)
- [Explore Observability](/docs/1.0.0.3/multi-agent/observability/)
