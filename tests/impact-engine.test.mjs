import test from "node:test";
import assert from "node:assert";
import { analyzeRequirementChange, buildTraceabilityMatrix } from "../src/lib/impact-engine.ts";

test("Impact Engine: detects impacted sections and proposes updates upon requirement change", () => {
  const project = {
    id: "proj_impact",
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
    },
    documentSections: [
      {
        id: "sec_auth",
        title: "Authentication & Authorization Architecture",
        contentMarkdown: "Describes JWT token verification and OAuth2 session handling.",
      },
      {
        id: "sec_order",
        title: "Order Fulfillment Service",
        contentMarkdown: "Handles checkout flow and inventory reservation.",
      },
    ],
  };

  const requirement = {
    id: "req_mfa",
    projectId: "proj_impact",
    stableId: "FR-101",
    title: "Multi-Factor Authentication Enforcement",
    category: "functional",
    priority: "critical",
    status: "approved",
    description: "Enforce WebAuthn hardware keys and TOTP for all authentication sessions.",
    acceptanceCriteria: ["WebAuthn support", "FIDO2 compliance"],
    traceLinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const impact = analyzeRequirementChange(
    project,
    requirement,
    "Upgrade to mandatory FIDO2 hardware tokens and WebAuthn for all enterprise authentication logins.",
    []
  );

  assert.strictEqual(impact.stableId, "FR-101");
  assert.ok(
    impact.impactedSections.some((s) => s.includes("Authentication")),
    "Should identify Authentication section as impacted"
  );
  assert.ok(impact.proposedUpdates.length > 0, "Should propose updates for impacted sections");
});

test("Impact Engine: builds comprehensive Traceability Matrix", () => {
  const requirements = [
    {
      id: "r1",
      stableId: "BR-001",
      title: "Real-time Order Tracking",
      category: "business",
      priority: "high",
      status: "approved",
    },
    {
      id: "r2",
      stableId: "NFR-001",
      title: "Sub-second Query Latency",
      category: "non_functional",
      priority: "critical",
      status: "draft",
    },
  ];

  const traceLinks = [
    {
      id: "l1",
      requirement_id: "r1",
      targetType: "component",
      targetId: "order-tracker-svc",
      targetTitle: "Order Tracking Microservice",
    },
    {
      id: "l2",
      requirement_id: "r1",
      targetType: "diagram",
      targetId: "diag_c4_tracking",
      targetTitle: "Tracking C4 Diagram",
    },
  ];

  const matrix = buildTraceabilityMatrix(requirements, traceLinks, {});
  assert.strictEqual(matrix.length, 2);

  const r1Matrix = matrix.find((m) => m.stableId === "BR-001");
  assert.strictEqual(r1Matrix.coverageStatus, "Covered");
  assert.strictEqual(r1Matrix.components.length, 1);
  assert.strictEqual(r1Matrix.diagrams.length, 1);

  const r2Matrix = matrix.find((m) => m.stableId === "NFR-001");
  assert.strictEqual(r2Matrix.coverageStatus, "Unmapped Gap");
});

