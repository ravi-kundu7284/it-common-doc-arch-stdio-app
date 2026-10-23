import test from "node:test";
import assert from "node:assert";
import { auditProjectArchitecture } from "../src/lib/architecture-audit.ts";

test("Audit Engine: detects High Scale Single Point of Failure (SPOF)", () => {
  const mockProject = {
    id: "proj_spof_test",
    requirements: {
      domain: "FinTech",
      targetScale: { rps: 10000, users: "5M MAU", dataRetention: "5 Years" },
      nonFunctionalRequirements: { latency: "p99 < 50ms", availability: "99.999%", compliance: [] },
      functionalRequirements: ["Process transactions"],
      constraints: [],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      stack: {
        frontend: "Next.js",
        backend: "Node.js",
        database: "PostgreSQL",
        caching: "Redis",
        messaging: "Kafka",
        devops: "Docker",
      },
    },
    documentSections: [
      {
        id: "s1",
        title: "Overview",
        contentMarkdown: "Basic single standalone database server with no standby failover or redundancy.",
      },
    ],
  };

  const result = auditProjectArchitecture(mockProject);
  assert.ok(result.overallScore < 100, "Score should have penalties applied");
  assert.ok(result.findings.some((f) => f.stableId === "HLD-001"), "Should detect SPOF on high scale");
  assert.ok(result.findings.some((f) => f.stableId === "HLD-002"), "Should detect missing RPO/RTO");
  assert.ok(result.summary.critical >= 1, "Should identify critical severity issues");
});

test("Audit Engine: identifies Financial Idempotency and DLQ gaps", () => {
  const mockProject = {
    id: "proj_fin_test",
    requirements: {
      domain: "Payment Gateway Service",
      targetScale: { rps: 500, users: "100k", dataRetention: "1 Year" },
      nonFunctionalRequirements: { latency: "p95 < 100ms", availability: "99.9%", compliance: ["PCI-DSS"] },
      functionalRequirements: ["Credit card authorization", "Settlement processing"],
      constraints: [],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      stack: {
        frontend: "React",
        backend: "Go",
        database: "Aurora Multi-AZ",
        caching: "Redis",
        messaging: "Kafka Cluster",
        devops: "Kubernetes",
      },
    },
    documentSections: [
      {
        id: "sec_1",
        title: "Payment Processing",
        contentMarkdown: "Clients send POST /api/v1/charge. Retries happen automatically on timeout without jitter.",
      },
    ],
  };

  const result = auditProjectArchitecture(mockProject);
  assert.ok(result.findings.some((f) => f.stableId === "LLD-001"), "Should detect missing Idempotency-Key on payments");
  assert.ok(result.findings.some((f) => f.stableId === "WFL-001"), "Should detect missing Dead-Letter Queue (DLQ)");
});

test("Audit Engine: clean well-architected project receives high score", () => {
  const goodProject = {
    id: "proj_good",
    requirements: {
      domain: "Healthcare Telehealth",
      targetScale: { rps: 1500, users: "500k", dataRetention: "7 Years" },
      nonFunctionalRequirements: { latency: "p99 < 120ms", availability: "99.99%", compliance: ["HIPAA"] },
      functionalRequirements: ["Doctor consultation", "Medical history"],
      constraints: [],
    },
    recommendations: {
      selectedPattern: "Modular Monolith",
      stack: {
        frontend: "Next.js",
        backend: "NestJS",
        database: "AWS Aurora Multi-AZ with Read Replica",
        caching: "Redis Cluster",
        messaging: "SQS with Dead-Letter Queue",
        devops: "Terraform + AWS EKS",
      },
    },
    documentSections: [
      {
        id: "s1",
        title: "Security & Observability",
        contentMarkdown:
          "Enforce TLS 1.3 and mTLS. Immutable audit log for PHI access. OpenTelemetry distributed tracing with Jaeger. " +
          "RPO < 5 minutes, RTO < 15 minutes. Optimistic locking with version column. Exponential backoff with jitter and Circuit Breakers.",
      },
    ],
  };

  const result = auditProjectArchitecture(goodProject);
  assert.ok(result.overallScore >= 90, `Expected score >= 90, got ${result.overallScore}`);
  assert.strictEqual(result.summary.critical, 0);
});
