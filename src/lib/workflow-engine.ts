import { WorkflowItem, WorkflowStep, WorkflowEdge } from "@/types";

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimulationStepTrace {
  stepId: string;
  stepTitle: string;
  type: string;
  status: "success" | "compensated" | "branched" | "waiting_approval" | "failed";
  message: string;
  timestamp: string;
}

export interface WorkflowSimulationResult {
  workflowId: string;
  isSuccessful: boolean;
  executionTrace: SimulationStepTrace[];
  completedSteps: number;
  totalSteps: number;
}

/**
 * Validates an Architecture Workflow definition against enterprise execution constraints.
 */
export function validateWorkflow(workflow: WorkflowItem): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { steps, edges } = workflow;

  if (!steps || steps.length === 0) {
    return {
      isValid: false,
      errors: ["Workflow must contain at least one step."],
      warnings: [],
    };
  }

  const stepIds = new Set(steps.map((s) => s.id));

  // 1. Check for Trigger / Start Step
  const triggers = steps.filter((s) => s.type === "trigger");
  if (triggers.length === 0) {
    errors.push("Workflow is missing an initial Trigger / Start node.");
  } else if (triggers.length > 1) {
    warnings.push("Workflow has multiple triggers; ensure triggers are mutually exclusive or join safely.");
  }

  // 2. Check for End Step
  const endSteps = steps.filter((s) => s.type === "end");
  if (endSteps.length === 0) {
    warnings.push("Workflow has no terminal 'End' step; consider defining an explicit terminal state.");
  }

  // 3. Edge Integrity: sources and targets must exist
  const incomingCount: Record<string, number> = {};
  const outgoingCount: Record<string, number> = {};
  steps.forEach((s) => {
    incomingCount[s.id] = 0;
    outgoingCount[s.id] = 0;
  });

  for (const edge of edges || []) {
    if (!stepIds.has(edge.source)) {
      errors.push(`Edge connects from non-existent source step ID: '${edge.source}'.`);
    } else {
      outgoingCount[edge.source] = (outgoingCount[edge.source] || 0) + 1;
    }

    if (!stepIds.has(edge.target)) {
      errors.push(`Edge connects to non-existent target step ID: '${edge.target}'.`);
    } else {
      incomingCount[edge.target] = (incomingCount[edge.target] || 0) + 1;
    }
  }

  // 4. Reachability: Detect orphaned / unreachable steps
  for (const step of steps) {
    if (step.type !== "trigger" && incomingCount[step.id] === 0) {
      warnings.push(`Step '${step.title}' (${step.id}) is unreachable: no incoming transition edges.`);
    }
    if (step.type !== "end" && outgoingCount[step.id] === 0) {
      warnings.push(`Step '${step.title}' (${step.id}) is a dead-end: no outgoing transition edges.`);
    }
  }

  // 5. Conditional Branching Check
  const conditions = steps.filter((s) => s.type === "condition");
  for (const cond of conditions) {
    const outCount = outgoingCount[cond.id] || 0;
    if (outCount < 2) {
      warnings.push(`Conditional step '${cond.title}' has fewer than 2 outgoing branch paths.`);
    }
  }

  // 6. Failure & Compensation Path Coverage
  const criticalTasks = steps.filter((s) => s.type === "task" && (s.retryPolicy || s.timeoutSeconds));
  for (const task of criticalTasks) {
    const outEdges = (edges || []).filter((e) => e.source === task.id);
    const hasFailurePath = outEdges.some((e) => e.isFailurePath);
    if (!hasFailurePath) {
      warnings.push(`Step '${task.title}' has retry/timeout policies but no explicit failure/compensation edge.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Performs a safe dry-run simulation of a workflow without executing real production operations.
 */
export function simulateWorkflowExecution(workflow: WorkflowItem): WorkflowSimulationResult {
  const trace: SimulationStepTrace[] = [];
  const { steps, edges } = workflow;

  const trigger = steps.find((s) => s.type === "trigger") || steps[0];
  if (!trigger) {
    return {
      workflowId: workflow.id,
      isSuccessful: false,
      executionTrace: [],
      completedSteps: 0,
      totalSteps: 0,
    };
  }

  let currentStep: WorkflowStep | undefined = trigger;
  const visited = new Set<string>();

  while (currentStep && !visited.has(currentStep.id)) {
    visited.add(currentStep.id);
    const now = new Date().toISOString();

    if (currentStep.type === "trigger") {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "success",
        message: `Workflow initiated by trigger: "${currentStep.title}"`,
        timestamp: now,
      });
    } else if (currentStep.type === "approval") {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "waiting_approval",
        message: `Human approval checkpoint reached (${currentStep.assignee || "Lead Architect"}). Auto-approved in simulation mode.`,
        timestamp: now,
      });
    } else if (currentStep.type === "condition") {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "branched",
        message: `Evaluated business condition: "${currentStep.title}" -> Defaulted to Primary Success Branch`,
        timestamp: now,
      });
    } else if (currentStep.type === "compensation") {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "compensated",
        message: `Compensation transaction executed to roll back state: "${currentStep.title}"`,
        timestamp: now,
      });
    } else if (currentStep.type === "end") {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "success",
        message: `Workflow reached terminal state: "${currentStep.title}"`,
        timestamp: now,
      });
      break;
    } else {
      trace.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        type: currentStep.type,
        status: "success",
        message: `Task completed successfully: "${currentStep.title}"`,
        timestamp: now,
      });
    }

    // Find next edge
    const outgoing = (edges || []).filter((e) => e.source === currentStep?.id && !e.isFailurePath);
    if (outgoing.length > 0) {
      const nextTargetId = outgoing[0].target;
      currentStep = steps.find((s) => s.id === nextTargetId);
    } else {
      break;
    }
  }

  return {
    workflowId: workflow.id,
    isSuccessful: true,
    executionTrace: trace,
    completedSteps: trace.length,
    totalSteps: steps.length,
  };
}

