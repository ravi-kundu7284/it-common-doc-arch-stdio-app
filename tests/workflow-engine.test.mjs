import test from "node:test";
import assert from "node:assert";
import { validateWorkflow, simulateWorkflowExecution } from "../src/lib/workflow-engine.ts";

test("Workflow Engine: validates valid workflow correctly", () => {
  const validWf = {
    id: "wf_valid",
    projectId: "proj_1",
    title: "Order Fulfillment Workflow",
    description: "Standard fulfillment",
    status: "draft",
    steps: [
      { id: "s1", title: "Order Submitted", type: "trigger", description: "Webhook from e-commerce" },
      { id: "s2", title: "Validate Balance", type: "task", description: "Check customer ledger" },
      { id: "s3", title: "Balance Sufficient?", type: "condition", description: "Evaluate amount" },
      { id: "s4", title: "Human Credit Review", type: "approval", description: "Manual risk sign-off" },
      { id: "s5", title: "Order Completed", type: "end", description: "Terminal success state" },
    ],
    edges: [
      { id: "e1", source: "s1", target: "s2" },
      { id: "e2", source: "s2", target: "s3" },
      { id: "e3", source: "s3", target: "s5", label: "Yes" },
      { id: "e4", source: "s3", target: "s4", label: "No" },
      { id: "e5", source: "s4", target: "s5" },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = validateWorkflow(validWf);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.errors.length, 0);

  const simulation = simulateWorkflowExecution(validWf);
  assert.strictEqual(simulation.isSuccessful, true);
  assert.ok(simulation.executionTrace.length >= 3);
});

test("Workflow Engine: flags missing trigger and broken edge targets", () => {
  const invalidWf = {
    id: "wf_invalid",
    projectId: "proj_1",
    title: "Broken Workflow",
    description: "Missing trigger and invalid edge",
    status: "draft",
    steps: [
      { id: "t1", title: "Task 1", type: "task", description: "First task" },
      { id: "t2", title: "Task 2", type: "task", description: "Second task" },
    ],
    edges: [
      { id: "e1", source: "t1", target: "non_existent_step" },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = validateWorkflow(invalidWf);
  assert.strictEqual(validation.isValid, false);
  assert.ok(validation.errors.some((err) => err.includes("missing an initial Trigger")));
  assert.ok(validation.errors.some((err) => err.includes("non-existent target step ID")));
});

