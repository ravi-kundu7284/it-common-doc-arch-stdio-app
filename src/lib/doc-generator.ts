import { DesignDocProject } from "@/types";

export function generateStandardDocument(
  projectData: Omit<DesignDocProject, "documentSections"> & {
    selectedSectionIds?: string[];
  }
): DesignDocProject["documentSections"] {
  const { metadata, requirements, recommendations, selectedSectionIds } = projectData;
  const { title } = metadata;
  const { domain, targetScale, functionalRequirements, nonFunctionalRequirements, constraints } = requirements;
  const { selectedPattern, stack, patternAlternatives } = recommendations;

  const allSections: {
    id: string;
    title: string;
    contentMarkdown: string;
    mermaidDiagrams?: string[];
  }[] = [
    // 1. Executive Summary & Scope
    {
      id: "sec-exec-summary",
      title: "1. Executive Summary & Scope",
      contentMarkdown: `## 1. Executive Summary & Scope

### 1.1 Context & Problem Statement
The **${title}** system is designed to provide a mission-critical, enterprise-grade architecture for the **${domain}** domain. As customer and transaction volumes expand, the legacy or baseline architecture struggles to deliver the strict throughput, reliability, and security SLAs required. 

This document defines the comprehensive Technical Architecture (High-Level Design & Low-Level Design) adhering to the **${selectedPattern}** pattern to satisfy business scale, compliance standards, and fault-tolerance objectives.

### 1.2 Business Objectives & Success Criteria
- **High Throughput & Responsiveness:** Support peak loads of **${targetScale.rps.toLocaleString()} requests/second** while guaranteeing **${nonFunctionalRequirements.latency}**.
- **User Scale & Concurrency:** Seamlessly serve an active user base of **${targetScale.users}** with linear horizontal elasticity.
- **Enterprise Availability:** Maintain an SLA of **${nonFunctionalRequirements.availability}** with zero single points of failure (SPOF) and automated multi-zone failover.
- **Data Governance & Retention:** Store and retain operational and audit records for **${targetScale.dataRetention}** under strict regulatory compliance (${nonFunctionalRequirements.compliance.join(", ") || "Standard Enterprise SecOps"}).

### 1.3 Scope Boundaries

#### In-Scope
${functionalRequirements.map((req) => `- ${req}`).join("\n")}
- Complete operational telemetry, distributed tracing, and centralized audit logging.
- Disaster recovery and multi-region backup strategies.

#### Out-of-Scope (Non-Goals for v1.0)
- End-user legacy data migration scripts prior to cutover date.
- Proprietary third-party hardware appliances outside supported cloud platforms.
- Non-standard regional edge points outside primary cloud availability zones.
`,
    },

    // 2. Architecture Overview
    {
      id: "sec-architecture-overview",
      title: "2. Architecture Overview",
      contentMarkdown: `## 2. Architecture Overview

### 2.1 Architectural Style & Topology
The system adopts an **${selectedPattern}** paradigm. The topology separates client ingestion, edge boundary protection, domain service execution, event-driven decoupling, and multi-tier persistence.

### 2.2 C4 Model: System Context Diagram (Level 1)
The following C4 System Context diagram illustrates the system boundaries, human actors, and upstream/downstream integrations:

\`\`\`mermaid
flowchart TD
    User["Client Devices / Users<br/>[${targetScale.users}]"]
    Staff["Operations & SecOps<br/>[Internal Engineering]"]
    
    subgraph SystemBoundary ["System Boundary: ${title}"]
        Gateway["Cloud CDN & API Gateway<br/>[Edge Security & TLS 1.3]"]
        CoreApp["${title} Core Services<br/>[${selectedPattern}]"]
    end
    
    ExtServices["External Third-Party APIs<br/>[Gateways, SMS, Webhooks]"]
    AuthProviders["Identity Provider<br/>[OAuth2 / OIDC / IdP]"]

    User -->|"HTTPS / gRPC (TLS 1.3)"| Gateway
    Gateway -->|"Internal Reverse Proxy"| CoreApp
    Staff -->|"Internal VPN / Bastion"| CoreApp
    CoreApp -->|"mTLS Outbound"| ExtServices
    CoreApp -->|"SAML / OIDC Tokens"| AuthProviders

    classDef boundary fill:#f8fafc,stroke:#3b82f6,stroke-width:2px,color:#0f172a;
    classDef comp fill:#1e293b,stroke:#0284c7,stroke-width:2px,color:#ffffff;
    classDef actor fill:#047857,stroke:#059669,stroke-width:2px,color:#ffffff;
    class SystemBoundary boundary;
    class Gateway,CoreApp comp;
    class User,Staff,ExtServices,AuthProviders actor;
\`\`\`

### 2.3 C4 Model: Container Architecture (Level 2)
The container diagram delineates the runtime components, communication protocols, and storage boundaries:

\`\`\`mermaid
flowchart LR
    Client["Client Layer<br/>[${stack.frontend}]"]
    APIGW["API Gateway / Ingress<br/>[Rate Limiting & AuthN]"]
    
    subgraph Microservices ["Execution Compute Fabric"]
        IngressSvc["Ingestion & Validation Service"]
        CoreSvc["Core Business Domain Service"]
        AsyncWorker["Async Background Worker Cluster"]
    end
    
    CacheNode["In-Memory Cache<br/>[${stack.caching}]"]
    MsgBus["Distributed Message Bus<br/>[${stack.messaging}]"]
    PrimaryDB["Primary Storage<br/>[${stack.database}]"]

    Client -->|"HTTPS / WebSockets"| APIGW
    APIGW -->|"gRPC / HTTP/2"| IngressSvc
    IngressSvc -->|"Sync Query"| CacheNode
    IngressSvc -->|"Publishes Domain Events"| MsgBus
    MsgBus -->|"Subscribes & Consumes"| AsyncWorker
    AsyncWorker -->|"Batch Upserts / Writes"| PrimaryDB
    IngressSvc -->|"Direct Read/Write"| CoreSvc
    CoreSvc -->|"ACID Transaction"| PrimaryDB

    classDef compute fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff;
    classDef store fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#ffffff;
    classDef bus fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#ffffff;
    class IngressSvc,CoreSvc,AsyncWorker,APIGW compute;
    class CacheNode,PrimaryDB store;
    class MsgBus bus;
\`\`\`
`,
    },

    // 3. Component & Service Design
    {
      id: "sec-component-design",
      title: "3. Component & Service Design (LLD)",
      contentMarkdown: `## 3. Component & Service Design (Low-Level Design)

### 3.1 Service Responsibilities & Domain Boundaries
The core processing is decomposed into modular services adhering to bounded contexts:

| Service / Component | Protocol | Technology | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **API Gateway & Router** | HTTP/2, HTTPS | Envoy / Cloudflare | Token validation, SSL termination, global rate limiting, traffic routing. |
| **Domain Orchestrator** | gRPC / REST | ${stack.backend} | Enforces domain business rules, input schema validation, and authorization. |
| **High-Throughput Worker** | Asynchronous | ${stack.backend} | Consumes background queues, processes batch ledger tasks, and external syncs. |
| **State & Cache Manager** | Redis Protocol | ${stack.caching} | Real-time session locks, idempotency keys, hot cache layer. |
| **Audit & Event Broker** | Binary TCP | ${stack.messaging} | Durable event log, pub/sub fan-out, dead-letter queue (DLQ) routing. |

### 3.2 API Contracts & Communication Protocols
1. **External Ingress:** RESTful JSON over HTTPS (TLS 1.3) with OpenAPI 3.1 specifications and strict header signature verification (\`X-Request-ID\`, \`X-Signature-SHA256\`, \`Idempotency-Key\`).
2. **Internal Inter-Service RPC:** High-performance binary **gRPC** with Protobuf schemas, multiplexed HTTP/2 connections, and mutual TLS (mTLS) zero-trust authentication.
3. **Event Notification Protocol:** CloudEvents 1.0 JSON format delivered via **${stack.messaging}**.

\`\`\`json
// Sample Ingress Request Header & Payload Specification
{
  "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "idempotencyKey": "idem_sec_993847291034",
  "timestamp": 1727424000,
  "eventType": "DOMAIN_COMMAND_EXECUTE",
  "payload": {
    "organizationId": "org_77192",
    "operation": "TRANSACTION_AUTHORIZE",
    "attributes": {
      "targetScaleRps": ${targetScale.rps},
      "enforceSLA": true
    }
  }
}
\`\`\`
`,
    },

    // 4. Data Modeling & Storage
    {
      id: "sec-data-modeling",
      title: "4. Data Modeling & Storage",
      contentMarkdown: `## 4. Data Modeling & Storage

### 4.1 Storage Tier Strategy
- **Primary Database (\`${stack.database}\`):** Relational or Distributed SQL serving as the system of record with ACID guarantees for transactional states.
- **In-Memory Cache (\`${stack.caching}\`):** High-speed sub-millisecond key-value storage for distributed locks, token cache, and hot reads.
- **Telemetry & Event Store:** Append-only log storage optimized for analytics and historical auditing under the **${targetScale.dataRetention}** retention policy.

### 4.2 Entity Relationship Diagram (ERD)
The logical domain entities, relational cardinalities, and primary indices are shown below:

\`\`\`mermaid
erDiagram
    TENANT ||--o{ USER_ACCOUNT : contains
    TENANT {
        uuid id PK
        string name
        string tier
        string status
        timestamp created_at
    }
    USER_ACCOUNT ||--o{ SESSION_AUTH : generates
    USER_ACCOUNT {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        string role
        timestamp last_login
    }
    USER_ACCOUNT ||--o{ AUDIT_LOG : initiates
    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action_type
        string client_ip
        jsonb metadata
        timestamp created_at
    }
    TENANT ||--o{ DOMAIN_ENTITY : owns
    DOMAIN_ENTITY ||--o{ TRANSACTION_RECORD : executes
    DOMAIN_ENTITY {
        uuid id PK
        uuid tenant_id FK
        string entity_name
        string state
        numeric balance
        bigint version
    }
    TRANSACTION_RECORD {
        uuid id PK
        uuid entity_id FK
        string idempotency_key UK
        numeric amount
        string status
        timestamp settled_at
    }
\`\`\`

### 4.3 Indexing & Partitioning Strategy
1. **Partitioning Key:** Range partitioning on \`created_at\` (monthly chunks) combined with list partitioning by \`tenant_id\` to guarantee multi-tenant data isolation.
2. **Compound Unique Index:** \`CREATE UNIQUE INDEX idx_txn_idem ON TRANSACTION_RECORD(entity_id, idempotency_key);\` ensures zero duplicate billing or re-executions.
3. **Read Acceleration:** Redis caching with **Read-Through / Cache-Aside** pattern with jittered TTLs (300s ± 30s) to prevent cache stampedes.
`,
    },

    // 5. Key Workflows & Sequence Diagrams
    {
      id: "sec-workflows-sequence",
      title: "5. Key Workflows & Sequence Diagrams",
      contentMarkdown: `## 5. Key Workflows & Sequence Diagrams

### 5.1 End-to-End Core Transaction & Authorization Flow
The following sequence diagram details the step-by-step lifecycle for critical business requests, including distributed token validation, idempotency checks, atomic persistence, and async notification fan-out:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client as Client App
    participant GW as API Gateway
    participant Cache as Redis Cache
    participant Core as Core Domain Service
    participant DB as ${stack.database.split(" ")[0]}
    participant Bus as ${stack.messaging.split(" ")[0]} Bus
    participant Worker as Async Workers

    Client->>GW: POST /api/v1/execute (Bearer JWT + Idempotency-Key)
    GW->>GW: Validate JWT Signature & Rate Limit
    GW->>Cache: GET idempotency_key:{id}
    alt Idempotency Key Exists (Cached Response)
        Cache-->>GW: Return Cached Response Payload
        GW-->>Client: 200 OK (Replayed Result)
    else Key Not Found (New Request)
        Cache-->>GW: Nil (Proceed)
        GW->>Cache: SETNX idempotency_key:{id} (IN_PROGRESS, TTL=60s)
        GW->>Core: Forward Command (gRPC)
        Core->>DB: BEGIN TRANSACTION (Serializable)
        Core->>DB: Verify Preconditions & Deduct Quota
        Core->>DB: INSERT Audit & State Changes
        DB-->>Core: Commit Success (TxID: 88120)
        Core->>Bus: Publish Domain Event [EVENT_TRANSACTION_COMMITTED]
        Core->>Cache: SET idempotency_key:{id} (COMMITTED, TTL=86400s)
        Core-->>GW: Execution Result OK
        GW-->>Client: 201 Created (Confirmed)
        
        par Async Post-Processing
            Bus->>Worker: Consume EVENT_TRANSACTION_COMMITTED
            Worker->>Worker: Generate Invoice & Webhook Notification
        end
    end
\`\`\`

### 5.2 Failure & Circuit Breaker Workflow
If the primary persistence layer or downstream service experiences latency spikes exceeding the SLA (${nonFunctionalRequirements.latency}), the Ingress Gateway triggers a Circuit Breaker (Hystrix / Resilience4j pattern) returning an immediate degraded fallback, queuing non-critical events into a Dead Letter Queue (DLQ) to protect system stability.
`,
    },

    // 6. Cross-Cutting Concerns
    {
      id: "sec-cross-cutting",
      title: "6. Cross-Cutting Concerns",
      contentMarkdown: `## 6. Cross-Cutting Concerns

### 6.1 Security & Compliance Framework
- **Authentication & Authorization:** OAuth 2.0 / OpenID Connect with short-lived RS256 JWT tokens (15-minute expiry) and rotating refresh tokens stored in HTTP-only secure cookies. Fine-grained RBAC (Role-Based Access Control) enforced at the API gateway layer.
- **Data Protection:** 
  - **In-Transit:** Mandatory TLS 1.3 with strict cipher suites and HSTS enabled.
  - **At-Rest:** AES-256 GCM envelope encryption via Cloud KMS / HSM for all databases, caches, and storage volumes.
- **Regulatory Compliance:** Adherence to **${nonFunctionalRequirements.compliance.join(", ")}**, including audit logging, PII data masking, and automated data redaction.

### 6.2 Observability: Metrics, Logs & Tracing (Three Pillars)
\`\`\`mermaid
flowchart TD
    subgraph Instrumentation ["App & Infrastructure Tier"]
        App["Services [${stack.backend}]"]
        DBNode["Databases & Caches"]
    end

    subgraph TelemetryPipeline ["OpenTelemetry Collector Pipeline"]
        Collector["OTel DaemonSet / Collector"]
    end

    subgraph ObservabilityBackends ["Monitoring & Alerting Backends"]
        Metrics["Prometheus / Datadog (Metrics: RPS, Latency p95/p99, Error Rates)"]
        Logs["Loki / Elasticsearch (Structured JSON Logs with TraceId)"]
        Traces["Jaeger / Tempo (Distributed Tracing End-to-End)"]
    end

    App -->|"OTLP gRPC"| Collector
    DBNode -->|"Exporters"| Collector
    Collector --> Metrics
    Collector --> Logs
    Collector --> Traces

    classDef inst fill:#0284c7,stroke:#0369a1,color:#fff;
    classDef pipe fill:#7c3aed,stroke:#6d28d9,color:#fff;
    classDef obs fill:#0f172a,stroke:#38bdf8,color:#fff;
    class App,DBNode inst;
    class Collector pipe;
    class Metrics,Logs,Traces obs;
\`\`\`

### 6.3 Fault Tolerance & Resilience Mechanisms
- **Rate Limiting:** Token Bucket and Sliding Window rate limiting per IP / API client configured at ${targetScale.rps} RPS ceiling with HTTP 429 Retry-After headers.
- **Retry with Exponential Backoff & Jitter:** Default 3 retries for transient HTTP 503/504 errors using formula: $t_{wait} = 2^{attempt} \times 100\text{ms} + \text{random}(0, 50\text{ms})$.
- **Graceful Degradation:** Read-only replica failover if write master undergoes replication switchover.
`,
    },

    // 7. Infrastructure & Deployment
    {
      id: "sec-infrastructure-deployment",
      title: "7. Infrastructure & Deployment",
      contentMarkdown: `## 7. Infrastructure & Deployment

### 7.1 Cloud Topology & Infrastructure as Code (IaC)
Infrastructure is codified via **Terraform / Pulumi** and deployed across multi-Availability Zone (AZ) architecture:

\`\`\`mermaid
graph TD
    DNS["Global DNS / Anycast Route 53 / Cloudflare"]
    WAF["Cloud WAF & DDoS Shield"]
    
    subgraph MultiAZ ["Multi-AZ Cloud Region"]
        subgraph AZ1 ["Availability Zone A"]
            LB1["Application Load Balancer"]
            Pod1["K8s Service Pods (HPA)"]
            DB_Master["${stack.database.split(" ")[0]} Primary (Write)"]
        end
        subgraph AZ2 ["Availability Zone B"]
            LB2["Application Load Balancer"]
            Pod2["K8s Service Pods (HPA)"]
            DB_Replica["${stack.database.split(" ")[0]} Read Replica (Sync)"]
        end
    end
    
    Backup["Cross-Region Cold Storage (S3 / GCS)"]

    DNS --> WAF
    WAF --> LB1 & LB2
    LB1 --> Pod1
    LB2 --> Pod2
    Pod1 & Pod2 --> DB_Master
    DB_Master -.->|"Synchronous WAL Stream"| DB_Replica
    DB_Master -.->|"Continuous Snapshotting"| Backup

    classDef ext fill:#1e293b,stroke:#64748b,color:#fff;
    classDef az fill:#065f46,stroke:#10b981,color:#fff;
    DNS,WAF,Backup ext;
    class Pod1,Pod2,DB_Master,DB_Replica az;
\`\`\`

### 7.2 CI/CD Pipeline
- **Triggers:** Git tag / trunk-based PR merge to \`main\`.
- **Pipeline Stages:** Lint & Static Analysis (SonarQube) $\rightarrow$ Unit & Integration Tests (100% pass criteria) $\rightarrow$ Docker container multi-arch build $\rightarrow$ Vulnerability scan (Trivy) $\rightarrow$ Blue/Green or Canary progressive deployment with automated rollback on error rate $> 0.1\%$.

### 7.3 Disaster Recovery (DR) & Backup Objectives
- **Recovery Point Objective (RPO):** $< 1\text{ second}$ (synchronous database write replication across multi-AZs).
- **Recovery Time Objective (RTO):** $< 30\text{ seconds}$ (automated DNS failover and Kubernetes health-probe container restarts).
`,
    },

    // 8. Trade-offs & Alternatives Considered
    {
      id: "sec-tradeoffs-alternatives",
      title: "8. Trade-offs & Alternatives Considered",
      contentMarkdown: `## 8. Trade-offs & Alternatives Considered

### 8.1 Architectural Trade-Off Analysis
Architectural design is an exercise in conscious compromise. The selected **${selectedPattern}** pattern was vetted against candidate alternatives:

| Architectural Pattern | Suitability Score | Primary Advantages | Disqualifying Trade-Off / Rejection Rationale |
| :--- | :--- | :--- | :--- |
| **${selectedPattern} (Selected)** | **9.4 / 10** | Perfect match for domain scale (${targetScale.rps} RPS, ${targetScale.users}), decoupled deployments, and strict SLA requirements. | Requires elevated distributed observability tooling and contract testing overhead. |
${patternAlternatives
  .map(
    (alt) =>
      `| **${alt.pattern}** | 6.5 / 10 | Simpler initial scaffolding and fewer distributed components. | ${alt.reasonNotChosen} |`
  )
  .join("\n")}

### 8.2 Technology Stack Selection Matrix

| Component Layer | Selected Technology | Alternative Evaluated | Selection Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | ${stack.frontend} | Single Page App (Pure React/Vite) | Next.js server components and edge rendering provide superior First Contentful Paint (FCP) and SEO capabilities. |
| **Backend & Compute** | ${stack.backend} | Monolithic Ruby on Rails / Django | Superior CPU concurrency, lower memory footprint, and native async I/O required for high RPS. |
| **Primary Persistence** | ${stack.database} | Pure NoSQL / Key-Value | Strong transactional integrity and relational referential checks required for business entities. |
| **Cache Tier** | ${stack.caching} | Local In-Memory Cache | Distributed cache guarantees cache coherence across scaled container replicas. |
| **Message Broker** | ${stack.messaging} | Synchronous HTTP Webhooks | Asynchronous durable message streaming isolates spikes and avoids cascading HTTP timeouts. |
| **DevOps & Host** | ${stack.devops} | Bare Metal / Shared Hosting | Containerized orchestration provides auto-scaling, self-healing nodes, and automated zero-downtime rollouts. |

### 8.3 Known Limitations & Future Roadmap
1. **Dynamic Regional Traffic Sharding:** Future phases will introduce GeoDNS latency-based routing across EU, US, and APAC regions.
2. **AI-Assisted Capacity Auto-tuning:** Integration of predictive machine learning models to pre-warm serverless pods 10 minutes prior to expected flash spikes.
`,
    },
  ];

  if (selectedSectionIds && selectedSectionIds.length > 0) {
    return allSections.filter((sec) => selectedSectionIds.includes(sec.id));
  }

  return allSections;
}
