import test from "node:test";
import assert from "node:assert";
import {
  dbGetProjects,
  dbGetProject,
  dbSaveProject,
  dbDeleteProject,
  dbGetRevisions,
  dbSaveRevision,
  dbGetDiagrams,
  dbGetDiagram,
  dbSaveDiagram,
  dbDeleteDiagram,
  dbGetWorkflows,
  dbGetWorkflow,
  dbSaveWorkflow,
  dbDeleteWorkflow,
  dbGetRequirements,
  dbGetRequirement,
  dbSaveRequirement,
  dbDeleteRequirement,
  dbGetTraceLinks,
  dbSaveTraceLink,
  dbDeleteTraceLink,
  dbGetAdrs,
  dbGetAdr,
  dbSaveAdr,
  dbDeleteAdr,
  dbSaveReview,
  dbGetLatestReview,
  dbCreateUser,
  dbFindUser,
  dbUpdateUserProfile,
} from "../src/lib/supabase.ts";

test("Database: Project CRUD operations", async () => {
  const projId = "proj_test_123";
  const projectData = {
    id: projId,
    title: "Global Payments Engine",
    domain: "FinTech",
    design_level: "hld",
    metadata: { title: "Global Payments Engine", version: "1.0.0", status: "Draft" },
    requirements: { domain: "FinTech" },
    recommendations: { selectedPattern: "Event-Driven Microservices" },
  };

  // Save
  const saved = await dbSaveProject(projectData);
  assert.strictEqual(saved.id, projId);
  assert.strictEqual(saved.title, "Global Payments Engine");

  // Get
  const fetched = await dbGetProject(projId);
  assert.ok(fetched);
  assert.strictEqual(fetched.domain, "FinTech");

  // List
  const list = await dbGetProjects();
  assert.ok(list.some((p) => p.id === projId));

  // Update
  await dbSaveProject({ id: projId, title: "Global Payments Engine v2" });
  const updated = await dbGetProject(projId);
  assert.strictEqual(updated.title, "Global Payments Engine v2");

  // Delete
  const deleted = await dbDeleteProject(projId);
  assert.strictEqual(deleted, true);
  const afterDelete = await dbGetProject(projId);
  assert.strictEqual(afterDelete, null);
});

test("Database: Document Revision history", async () => {
  const projId = "proj_rev_test";
  await dbSaveProject({ id: projId, title: "Revision Test Project" });

  const rev1 = await dbSaveRevision({
    project_id: projId,
    title: "Initial baseline",
    snapshot: { title: "V1 Snapshot" },
    author: "Lead Architect",
    comment: "Initial approved baseline",
  });
  assert.strictEqual(rev1.revision_number, 1);

  const rev2 = await dbSaveRevision({
    project_id: projId,
    title: "Scale out update",
    snapshot: { title: "V2 Snapshot" },
    author: "Senior Architect",
    comment: "Added multi-region topology",
  });
  assert.strictEqual(rev2.revision_number, 2);

  const history = await dbGetRevisions(projId);
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].revision_number, 2); // newest first

  await dbDeleteProject(projId);
});

test("Database: Diagram CRUD & versioning", async () => {
  const projId = "proj_diag_test";
  const diagId = "diag_test_c4";

  const diag = {
    id: diagId,
    project_id: projId,
    title: "C4 Container Diagram",
    diagram_type: "container",
    mermaid_code: "graph TD; A-->B;",
    visual_model: { nodes: [{ id: "A", label: "Client" }, { id: "B", label: "API" }], edges: [] },
    version: 1,
    is_locked: false,
  };

  const saved = await dbSaveDiagram(diag);
  assert.strictEqual(saved.id, diagId);
  assert.strictEqual(saved.diagram_type, "container");

  const fetched = await dbGetDiagram(diagId);
  assert.ok(fetched);
  assert.strictEqual(fetched.mermaid_code, "graph TD; A-->B;");

  const list = await dbGetDiagrams(projId);
  assert.strictEqual(list.length, 1);

  const deleted = await dbDeleteDiagram(diagId);
  assert.strictEqual(deleted, true);
  assert.strictEqual(await dbGetDiagram(diagId), null);
});

test("Database: Workflow modeling & lifecycle", async () => {
  const projId = "proj_wf_test";
  const wfId = "wf_payment_processing";

  const workflow = {
    id: wfId,
    project_id: projId,
    title: "Order Fulfillment Workflow",
    description: "Multi-stage order orchestration with compensation",
    status: "draft",
    steps: [
      { id: "s1", title: "Order Placed", type: "trigger" },
      { id: "s2", title: "Charge Card", type: "task" },
      { id: "s3", title: "Check Fraud", type: "condition" },
      { id: "s4", title: "Refund Customer", type: "compensation" },
    ],
    edges: [
      { id: "e1", source: "s1", target: "s2" },
      { id: "e2", source: "s2", target: "s3" },
      { id: "e3", source: "s3", target: "s4", isFailurePath: true },
    ],
    version: 1,
  };

  const saved = await dbSaveWorkflow(workflow);
  assert.strictEqual(saved.id, wfId);
  assert.strictEqual(saved.status, "draft");
  assert.strictEqual(saved.steps.length, 4);

  // Update status to published
  await dbSaveWorkflow({ id: wfId, status: "published", version: 2 });
  const updated = await dbGetWorkflow(wfId);
  assert.strictEqual(updated.status, "published");
  assert.strictEqual(updated.version, 2);

  await dbDeleteWorkflow(wfId);
  assert.strictEqual(await dbGetWorkflow(wfId), null);
});

test("Database: Requirements Registry & Traceability Links", async () => {
  const projId = "proj_req_test";
  const reqId = "req_fr_01";

  const req = {
    id: reqId,
    project_id: projId,
    stable_id: "FR-001",
    title: "User Multi-Factor Authentication",
    category: "functional",
    priority: "critical",
    status: "approved",
    description: "Require TOTP/WebAuthn for all privileged operations",
    acceptance_criteria: ["TOTP verification required", "Backup codes generated"],
  };

  const savedReq = await dbSaveRequirement(req);
  assert.strictEqual(savedReq.stable_id, "FR-001");

  // Trace Links
  const link1 = await dbSaveTraceLink({
    project_id: projId,
    requirement_id: reqId,
    target_type: "component",
    target_id: "auth-service",
    target_title: "Authentication & Identity Service",
  });
  assert.ok(link1.id);

  const links = await dbGetTraceLinks(projId);
  assert.strictEqual(links.length, 1);
  assert.strictEqual(links[0].target_type, "component");

  await dbDeleteTraceLink(link1.id);
  assert.strictEqual((await dbGetTraceLinks(projId)).length, 0);

  await dbDeleteRequirement(reqId);
  assert.strictEqual(await dbGetRequirement(reqId), null);
});

test("Database: ADR Governance & Supersession", async () => {
  const projId = "proj_adr_test";
  const adr1Id = "adr_001";
  const adr2Id = "adr_002";

  // ADR-001
  await dbSaveAdr({
    id: adr1Id,
    project_id: projId,
    stable_id: "ADR-001",
    title: "Use REST for Inter-Service Communication",
    status: "accepted",
    context: "Initial phase requires rapid prototyping",
    decision_drivers: ["Team familiarity", "Standard tooling"],
    options_considered: [{ option: "REST", pros: ["Simple"], cons: ["Higher latency"] }],
    decision: "Adopt REST over HTTP/2",
    consequences: { positive: ["Fast time to market"], negative: ["Network overhead"] },
    risks: ["Head-of-line blocking under high RPS"],
    author: "Lead Architect",
  });

  const adr1 = await dbGetAdr(adr1Id);
  assert.strictEqual(adr1.status, "accepted");

  // ADR-002 Supersedes ADR-001
  await dbSaveAdr({
    id: adr2Id,
    project_id: projId,
    stable_id: "ADR-002",
    title: "Migrate Internal Communication to gRPC",
    status: "accepted",
    context: "Scale exceeded 50,000 RPS, REST overhead became bottleneck",
    decision_drivers: ["p99 latency SLA < 50ms", "Binary protobuf efficiency"],
    options_considered: [{ option: "gRPC", pros: ["Multiplexing"], cons: ["Learning curve"] }],
    decision: "Replace internal REST with gRPC Protocol Buffers",
    consequences: { positive: ["60% latency reduction"], negative: ["Schema registry required"] },
    risks: ["Protobuf backward compatibility management"],
    author: "Principal Enterprise Architect",
  });

  // Mark ADR-001 as superseded
  await dbSaveAdr({
    id: adr1Id,
    status: "superseded",
    superseded_by: "ADR-002",
  });

  const updatedAdr1 = await dbGetAdr(adr1Id);
  assert.strictEqual(updatedAdr1.status, "superseded");
  assert.strictEqual(updatedAdr1.superseded_by, "ADR-002");

  const allAdrs = await dbGetAdrs(projId);
  assert.strictEqual(allAdrs.length, 2);

  await dbDeleteAdr(adr1Id);
  await dbDeleteAdr(adr2Id);
});

test("Database: Architecture Quality Reviews", async () => {
  const projId = "proj_revw_test";

  const audit = {
    project_id: projId,
    overall_score: 92,
    findings: [
      {
        id: "f1",
        stableId: "SEC-001",
        severity: "high",
        category: "security",
        component: "Ingress Gateway",
        title: "Missing Rate Limiter on Public Auth Route",
        description: "Public login endpoint lacks IP-based burst rate limiting",
        whyItMatters: "Exposes authentication service to credential stuffing attacks",
        remediation: "Apply token-bucket rate limiter of 5 req/sec per IP",
        tradeOffs: "Potential false positives for NATed enterprise corporate IPs",
        confidence: 95,
        status: "open",
      },
    ],
    summary: { critical: 0, high: 1, medium: 0, low: 0, fixed: 0 },
  };

  const saved = await dbSaveReview(audit);
  assert.strictEqual(saved.overall_score, 92);

  const latest = await dbGetLatestReview(projId);
  assert.ok(latest);
  assert.strictEqual(latest.overall_score, 92);
  assert.strictEqual(latest.findings.length, 1);
});

test("Database: User profile creation, avatar, and profile settings persistence", async () => {
  const testUser = {
    username: "ravi_profile_tester",
    email: "ravi_tester@enterprise.com",
    password_hash: "hash123",
    password_salt: "salt123",
    first_name: "Ravi",
    last_name: "Kundu",
    full_name: "Ravi Kundu",
    phone: "9876543210",
    phone_country_code: "+91",
    avatar_url: "data:image/svg+xml;utf8,<svg></svg>",
    company: "Enterprise Cloud Tech",
    timezone: "Asia/Kolkata",
    bio: "Principal Enterprise Architect for High-Scale Cloud Systems",
    designation: "Principal Enterprise Architect",
    role: "architect",
  };

  const created = await dbCreateUser(testUser);
  assert.ok(created.id);
  assert.strictEqual(created.username, "ravi_profile_tester");
  assert.strictEqual(created.first_name, "Ravi");
  assert.strictEqual(created.last_name, "Kundu");
  assert.strictEqual(created.full_name, "Ravi Kundu");
  assert.strictEqual(created.phone, "9876543210");
  assert.strictEqual(created.phone_country_code, "+91");
  assert.strictEqual(created.avatar_url, "data:image/svg+xml;utf8,<svg></svg>");
  assert.strictEqual(created.company, "Enterprise Cloud Tech");
  assert.strictEqual(created.timezone, "Asia/Kolkata");
  assert.strictEqual(created.bio, "Principal Enterprise Architect for High-Scale Cloud Systems");

  // Test profile update
  const updated = await dbUpdateUserProfile(created.id, {
    bio: "Updated Chief Architect specialized in Microservices and Resilience",
    company: "NextGen Global Systems",
    phone: "1234567890",
  });

  assert.ok(updated);
  assert.strictEqual(updated.bio, "Updated Chief Architect specialized in Microservices and Resilience");
  assert.strictEqual(updated.company, "NextGen Global Systems");
  assert.strictEqual(updated.phone, "1234567890");
  assert.strictEqual(updated.first_name, "Ravi");
});
