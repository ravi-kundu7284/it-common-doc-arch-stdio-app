import { DesignDocProject, ArchitectureFinding, ArchitectureAuditResult, FindingSeverity, FindingCategory } from "@/types";

export interface AuditOptions {
  includeHeuristicAi?: boolean;
}

/**
 * Deterministic Architecture Quality and Validation Engine
 * Evaluates architectural design against explicit enterprise rules and quality criteria.
 */
export function auditProjectArchitecture(project: DesignDocProject, options?: AuditOptions): ArchitectureAuditResult {
  const findings: ArchitectureFinding[] = [];
  const reqs = project.requirements || {
    domain: "",
    targetScale: { rps: 0, users: "", dataRetention: "" },
    functionalRequirements: [],
    nonFunctionalRequirements: { latency: "", availability: "", compliance: [] },
    constraints: [],
  };
  const stack = project.recommendations?.stack || {
    frontend: "",
    backend: "",
    database: "",
    caching: "",
    messaging: "",
    devops: "",
  };
  const pattern = project.recommendations?.selectedPattern || "";
  const sections = project.documentSections || [];
  const sectionsText = sections.map((s) => `${s.title}\n${s.contentMarkdown}`).join("\n\n").toLowerCase();

  let checkIndex = 1;
  const addFinding = (
    stableId: string,
    severity: FindingSeverity,
    category: FindingCategory,
    component: string,
    title: string,
    description: string,
    whyItMatters: string,
    remediation: string,
    tradeOffs: string,
    confidence: number = 90
  ) => {
    findings.push({
      id: `finding_${Date.now()}_${checkIndex++}`,
      stableId,
      severity,
      category,
      component,
      title,
      description,
      whyItMatters,
      remediation,
      tradeOffs,
      confidence,
      status: "open",
    });
  };

  // =========================================================================
  // 1. HIGH-LEVEL DESIGN (HLD) CHALLENGES
  // =========================================================================

  // Rule HLD-001: Single Point of Failure (SPOF) in Primary Database
  const rps = reqs.targetScale?.rps || 0;
  if (rps > 2000 && !sectionsText.includes("replica") && !sectionsText.includes("multi-az") && !sectionsText.includes("cluster") && !sectionsText.includes("aurora")) {
    addFinding(
      "HLD-001",
      "critical",
      "reliability",
      "Primary Database Tier",
      "Single Point of Failure (SPOF) under High Traffic Scale",
      `The system targets ${rps.toLocaleString()} RPS but does not specify a multi-AZ read-replica or clustered database topology in the design sections.`,
      "A database instance outage will immediately cascade to a total system outage, violating enterprise availability SLAs.",
      "Deploy a Multi-AZ clustered database (e.g. AWS Aurora Multi-AZ, PostgreSQL Streaming Replication, or Google Cloud Spanner) with automatic failover.",
      "Increases monthly cloud infrastructure costs by approximately 60-100% for the database tier.",
      95
    );
  }

  // Rule HLD-002: Missing Disaster Recovery & RPO/RTO SLAs
  if (!sectionsText.includes("rpo") || !sectionsText.includes("rto")) {
    addFinding(
      "HLD-002",
      "high",
      "reliability",
      "Disaster Recovery & Business Continuity",
      "Undefined Recovery Point Objective (RPO) and Recovery Time Objective (RTO)",
      "The architecture documentation does not formally declare Recovery Point Objective (RPO) or Recovery Time Objective (RTO) targets.",
      "Without concrete RPO/RTO metrics, infrastructure teams cannot configure appropriate backup frequencies, cross-region replication, or failover runbooks.",
      "Define explicit SLA metrics in the Infrastructure & Deployment section: e.g. RPO < 5 minutes (WAL archiving) and RTO < 15 minutes (DNS failover).",
      "Strict RPO targets (< 1 minute) require continuous asynchronous or synchronous cross-region data replication, increasing egress bandwidth costs.",
      92
    );
  }

  // Rule HLD-003: Unencrypted Trust Boundaries & Internal Ingress
  if (
    !sectionsText.includes("tls") &&
    !sectionsText.includes("https") &&
    !sectionsText.includes("mtls") &&
    !sectionsText.includes("encryption at rest")
  ) {
    addFinding(
      "HLD-003",
      "critical",
      "security",
      "Network & Security Boundaries",
      "Missing End-to-End Encryption (TLS 1.3 / mTLS)",
      "No explicit encryption in transit or mutual TLS (mTLS) enforcement detected across ingress and service boundaries.",
      "Exposes data to eavesdropping, man-in-the-middle (MITM) attacks, and non-compliance with SOC2 and PCI-DSS standards.",
      "Enforce TLS 1.3 at API Ingress and service-mesh mTLS (e.g. Istio / Linkerd / Envoy) for east-west microservice traffic.",
      "Adds marginal CPU overhead (typically < 2%) for cryptographic handshakes; requires automated PKI / certificate rotation.",
      98
    );
  }

  // Rule HLD-004: Regulatory Compliance Gaps
  const compliance = reqs.nonFunctionalRequirements?.compliance || [];
  if (compliance.includes("PCI-DSS") && !sectionsText.includes("tokenization") && !sectionsText.includes("kms")) {
    addFinding(
      "HLD-004",
      "high",
      "compliance",
      "Data Storage Tier",
      "Missing Cardholder Data Tokenization for PCI-DSS Scope",
      "The project is flagged for PCI-DSS compliance, but does not specify HSM/KMS envelope encryption or third-party tokenization for primary account numbers (PAN).",
      "Storing raw or un-tokenized payment data exponentially expands PCI-DSS audit scope (SAQ-D) and creates severe legal liability.",
      "Utilize external PCI-compliant payment tokenization (e.g. Stripe/Adyen/VGS) so PANs never traverse internal databases.",
      "Relies on external vendor availability and introduces payment provider vendor lock-in.",
      95
    );
  }

  if (compliance.includes("HIPAA") && !sectionsText.includes("audit log") && !sectionsText.includes("phi")) {
    addFinding(
      "HLD-005",
      "high",
      "compliance",
      "Data Access Governance",
      "Missing Immutable Audit Logging for Protected Health Information (PHI)",
      "HIPAA compliance requires tamper-proof audit trails for every access and mutation of PHI.",
      "Failing to maintain immutable access logs results in direct civil penalties under HIPAA enforcement audits.",
      "Implement append-only access audit logging to AWS CloudTrail / WORM (Write Once Read Many) S3 Object Lock storage.",
      "Slightly increases write latency and long-term cold storage costs.",
      90
    );
  }

  // Rule HLD-006: Missing Observability (3 Pillars: Metrics, Logs, Tracing)
  if (!sectionsText.includes("opentelemetry") && !sectionsText.includes("tracing") && !sectionsText.includes("prometheus")) {
    addFinding(
      "HLD-006",
      "medium",
      "observability",
      "Cross-Cutting Observability",
      "Missing Distributed Tracing in Distributed Architecture",
      "No distributed tracing (e.g. OpenTelemetry, Jaeger) or correlation ID propagation defined in the architecture.",
      "In a distributed system, troubleshooting multi-service request latency without trace spans leads to high Mean Time to Detect (MTTD) and Repair (MTTR).",
      "Standardize on OpenTelemetry instrumentation across all backend services with W3C Trace Context propagation headers (`traceparent`).",
      "Requires small trace sampling rate adjustments (e.g. 5-10% sample rate) to avoid high telemetry storage costs.",
      88
    );
  }

  // =========================================================================
  // 2. LOW-LEVEL DESIGN (LLD) CHALLENGES
  // =========================================================================

  // Rule LLD-001: Missing Idempotency in Payment / Transaction APIs
  if (
    (reqs.domain?.toLowerCase().includes("pay") ||
      reqs.domain?.toLowerCase().includes("order") ||
      reqs.domain?.toLowerCase().includes("fintech") ||
      reqs.domain?.toLowerCase().includes("commerce")) &&
    !sectionsText.includes("idempotency")
  ) {
    addFinding(
      "LLD-001",
      "critical",
      "data_consistency",
      "API & Service Layer",
      "Missing Idempotency Controls for Financial State Mutations",
      "Mutating financial requests (such as payments, withdrawals, and order placement) lack an Idempotency-Key specification.",
      "Network retries by clients or API gateways will cause duplicate charges, double inventory reservations, and financial loss.",
      "Implement `Idempotency-Key` header validation backed by distributed atomic Redis locks with 24-hour cache TTL.",
      "Requires atomic lock release handling and state persistence for in-flight requests.",
      96
    );
  }

  // Rule LLD-002: Concurrency & Optimistic Locking Gaps
  if (!sectionsText.includes("optimistic locking") && !sectionsText.includes("pessimistic") && !sectionsText.includes("version column")) {
    addFinding(
      "LLD-002",
      "medium",
      "data_consistency",
      "Data Storage Tier",
      "Missing Concurrency Control / Optimistic Locking",
      "Entity updates lack explicit concurrency controls or version numbers to prevent lost updates.",
      "Concurrent writes by separate worker threads or users will silently overwrite earlier modifications (Lost Update anomaly).",
      "Introduce a `version INT NOT NULL DEFAULT 1` column on core entities and update using `WHERE id = :id AND version = :version`.",
      "Clients must handle HTTP 409 Conflict responses and implement automatic reload/retry logic.",
      85
    );
  }

  // Rule LLD-003: Distributed Transaction Assumptions
  if (
    pattern.toLowerCase().includes("microservice") &&
    !sectionsText.includes("saga") &&
    !sectionsText.includes("outbox") &&
    (sectionsText.includes("distributed transaction") || sectionsText.includes("2pc"))
  ) {
    addFinding(
      "LLD-003",
      "high",
      "coupling",
      "Microservice Boundaries",
      "Anti-Pattern: Distributed 2-Phase Commit (2PC) in Microservices",
      "Microservices appear to assume synchronous distributed transactions across database boundaries.",
      "2-Phase Commit (2PC) introduces severe latency, locks distributed resources, and fails catastrophically during network partitions.",
      "Adopt the Saga Pattern (orchestrated or choreographed) with compensating transactions and Transactional Outbox pattern.",
      "Increases architecture complexity with asynchronous eventual consistency and compensation handlers.",
      94
    );
  }

  // =========================================================================
  // 3. WORKFLOW & INTEGRATION CHALLENGES
  // =========================================================================

  // Rule WFL-001: Missing Dead Letter Queue (DLQ)
  if (
    (pattern.toLowerCase().includes("event") || stack.messaging?.length > 0) &&
    !sectionsText.includes("dead-letter") &&
    !sectionsText.includes("dlq")
  ) {
    addFinding(
      "WFL-001",
      "high",
      "reliability",
      "Event Broker & Message Streaming",
      "Missing Dead-Letter Queue (DLQ) Configuration for Poison Messages",
      "Message consumers do not specify a Dead Letter Queue (DLQ) policy for unparseable or continuously failing events.",
      "Poison pills will cause consumer threads to crash in an infinite retry loop, stalling the entire event partition.",
      "Configure a DLQ with a maximum retry count of 3 to 5, followed by message routing to a dead-letter topic with alert notifications.",
      "Requires operational tooling and runbooks for inspecting, replaying, or discarding quarantined messages.",
      91
    );
  }

  // Rule WFL-002: Retry Storms & Missing Exponential Backoff
  if (sectionsText.includes("retry") && !sectionsText.includes("jitter") && !sectionsText.includes("exponential backoff")) {
    addFinding(
      "WFL-002",
      "medium",
      "reliability",
      "Integration & Client Ingress",
      "Potential Retry Storm (Thundering Herd) Without Jittered Backoff",
      "Retry mechanisms are mentioned without exponential backoff and randomized jitter.",
      "When downstream services experience transient degradation, synchronized immediate retries create a thundering herd that completely prevents recovery.",
      "Adopt truncated exponential backoff with full jitter: `sleep = rand(0, min(cap, base * 2 ^ attempt))`.",
      "Slightly delays recovery notification to callers during transient failures.",
      89
    );
  }

  // Rule WFL-003: Missing Circuit Breaker for External Dependencies
  if (!sectionsText.includes("circuit breaker") && !sectionsText.includes("resilience4j") && !sectionsText.includes("fallback")) {
    addFinding(
      "WFL-003",
      "medium",
      "reliability",
      "Third-Party Integrations",
      "Missing Circuit Breaker Pattern on External Integrations",
      "No circuit breaker mechanism defined to isolate synchronous calls to third-party dependencies.",
      "An outage in an external partner API can exhaust server thread pools and cascade into an outage of the entire host application.",
      "Implement a Circuit Breaker (e.g. Resilience4j, Envoy, or Cockatiel) with defined failure rate thresholds and fallback responses.",
      "Requires defining meaningful graceful degradation / cached fallback states.",
      87
    );
  }

  // Calculate Overall Score (out of 100)
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "critical") penalty += 20;
    else if (f.severity === "high") penalty += 10;
    else if (f.severity === "medium") penalty += 5;
    else if (f.severity === "low") penalty += 2;
  }
  const overallScore = Math.max(10, Math.min(100, 100 - penalty));

  const summary = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    fixed: 0,
  };

  return {
    id: `audit_${Date.now()}`,
    projectId: project.id,
    overallScore,
    evaluatedAt: new Date().toISOString(),
    findings,
    summary,
  };
}

