import { DesignDocProject, DocumentSection, DesignLevel } from "@/types";

/**
 * Replace occurrences of a previous title or domain across all document sections.
 */
export function syncTitleAcrossSections(
  sections: DocumentSection[],
  oldTitle: string,
  newTitle: string
): DocumentSection[] {
  if (!oldTitle || !newTitle || oldTitle === newTitle) return sections;
  return sections.map((sec) => ({
    ...sec,
    contentMarkdown: sec.contentMarkdown.replaceAll(oldTitle, newTitle),
  }));
}

/**
 * -----------------------------------------------------------------------------
 * 1. HIGH-LEVEL DESIGN (HLD) GENERATOR
 * Focus: High-level topology, C4 models, subsystem boundaries, external integrations,
 * cloud infra, security governance, SLAs, and trade-offs.
 * -----------------------------------------------------------------------------
 */
export function generateHldDocument(
  projectData: Omit<DesignDocProject, "documentSections"> & {
    selectedSectionIds?: string[];
  }
): DocumentSection[] {
  const { metadata, requirements, recommendations, selectedSectionIds } = projectData;
  const title = metadata?.title?.trim() || "System Architecture Design";
  const { domain, targetScale, functionalRequirements, nonFunctionalRequirements, constraints } = requirements;
  const { selectedPattern, stack, patternAlternatives } = recommendations;

  const sections: DocumentSection[] = [
    // HLD 1: Executive Summary & Scope
    {
      id: "hld-exec-summary",
      title: "1. Executive Summary & Scope (HLD)",
      level: "hld",
      phase: "Phase 1: Context & Scope",
      contentMarkdown: `## 1. Executive Summary & Scope

### 1.1 Context & Problem Statement
The **${title}** system is designed to provide an enterprise-grade architectural blueprint for the **${domain}** domain. As user concurrency and transaction volumes expand, the target architecture must guarantee strict throughput, sub-second latency, and multi-region resilience.

This High-Level Design (HLD) establishes the overarching topology, service boundaries, technology choices, and architectural standards adhering to the **${selectedPattern}** pattern.

### 1.2 Strategic Business Objectives & Success Criteria
- **Peak Throughput:** Support up to **${targetScale.rps.toLocaleString()} requests/second** during peak surges.
- **Audience & User Scale:** Support **${targetScale.users}** with linear horizontal elasticity.
- **Strict SLA Targets:** Guarantee **${nonFunctionalRequirements.latency}** with a service availability SLA of **${nonFunctionalRequirements.availability}**.
- **Data Governance & Retention:** Maintain compliance with **${nonFunctionalRequirements.compliance.join(", ") || "Standard Enterprise SecOps"}** with a data retention policy of **${targetScale.dataRetention}**.

### 1.3 Scope Boundaries

#### In-Scope
${functionalRequirements.map((req) => `- ${req}`).join("\n")}
- High-availability distributed deployments across multi-availability zones.
- Global traffic routing, SSL termination, and centralized observability.

#### Out-of-Scope (Non-Goals for Current Phase)
- Legacy data migrations prior to scheduled production cutover.
- Direct hardware-level custom cryptographic appliances outside cloud provider KMS.
- Regional edge instances outside supported primary cloud regions.
`,
    },

    // HLD 2: System Architecture Overview & C4 Topology
    {
      id: "hld-architecture-overview",
      title: "2. System Architecture & C4 Topology (HLD)",
      level: "hld",
      phase: "Phase 1: Context & Scope",
      contentMarkdown: `## 2. System Architecture & C4 Topology

### 2.1 Architectural Paradigm & Core Philosophy
The **${title}** adopts the **${selectedPattern}** architectural paradigm. Client requests are ingested at the edge, validated through ingress gateways, routed to decoupled domain services, and persisted in purpose-built data stores.

### 2.2 C4 Model: System Context Diagram (Level 1)
The following System Context diagram highlights the primary human personas, core system boundary, and external upstream/downstream integrations:

\`\`\`mermaid
flowchart TD
    User["End Users / Client Applications<br/>[${targetScale.users}]"]
    Staff["Operations & Engineering<br/>[Internal DevOps / SRE]"]
    
    subgraph SystemBoundary ["System Boundary: ${title}"]
        Gateway["Cloud Edge & Ingress Gateway<br/>[WAF, TLS 1.3, Rate Limiting]"]
        CoreEngine["${title} Core Services<br/>[${selectedPattern}]"]
    end
    
    ExtThirdParty["External Partner APIs<br/>[Gateways, Notifications, Webhooks]"]
    IdP["Identity & Access Provider<br/>[OAuth2 / OIDC / SAML]"]

    User -->|"HTTPS / gRPC (TLS 1.3)"| Gateway
    Gateway -->|"Internal Reverse Proxy"| CoreEngine
    Staff -->|"Zero-Trust Bastion / VPN"| CoreEngine
    CoreEngine -->|"Outbound Webhooks / REST"| ExtThirdParty
    CoreEngine -->|"Token Verification"| IdP

    classDef boundary fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef comp fill:#1e293b,stroke:#0284c7,stroke-width:2px,color:#ffffff;
    classDef actor fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff;
    class SystemBoundary boundary;
    class Gateway,CoreEngine comp;
    class User,Staff,ExtThirdParty,IdP actor;
\`\`\`

### 2.3 C4 Model: Container Architecture (Level 2)
The container diagram delineates runtime boundaries, inter-service protocols, and storage segregation:

\`\`\`mermaid
flowchart LR
    Client["Client Presentation Layer<br/>[${stack.frontend}]"]
    APIGW["API Gateway / Ingress<br/>[Rate Limiting, Routing]"]
    
    subgraph CoreFabric ["Core Processing Services"]
        IngressSvc["Ingress API Gateway Service"]
        DomainSvc["${domain} Core Domain Service"]
        AsyncCluster["Async Worker & Background Cluster"]
    end
    
    CacheNode["In-Memory Distributed Cache<br/>[${stack.caching}]"]
    EventBus["Durable Message Streaming Bus<br/>[${stack.messaging}]"]
    PrimaryDB["Primary Relational/NoSQL Database<br/>[${stack.database}]"]

    Client -->|"HTTPS / WebSockets"| APIGW
    APIGW -->|"gRPC / HTTP/2"| IngressSvc
    IngressSvc -->|"Fast Read"| CacheNode
    IngressSvc -->|"Publish Events"| EventBus
    EventBus -->|"Consume Tasks"| AsyncCluster
    AsyncCluster -->|"Batch Persist"| PrimaryDB
    IngressSvc -->|"Sync Core Ops"| DomainSvc
    DomainSvc -->|"ACID State Changes"| PrimaryDB

    classDef compute fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff;
    classDef store fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#ffffff;
    classDef bus fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#ffffff;
    class IngressSvc,DomainSvc,AsyncCluster,APIGW compute;
    class CacheNode,PrimaryDB store;
    class EventBus bus;
\`\`\`
`,
    },

    // HLD 3: Service Decomposition & Boundaries
    {
      id: "hld-service-decomposition",
      title: "3. Service Decomposition & Subsystems (HLD)",
      level: "hld",
      phase: "Phase 2: Subsystem Design",
      contentMarkdown: `## 3. Service Decomposition & Subsystems

### 3.1 Bounded Contexts & Subsystem Roles
The application architecture divides responsibilities into autonomous functional domains:

| Subsystem / Service | Role & Responsibility | Implementation Tech | Communication Protocols |
| :--- | :--- | :--- | :--- |
| **Ingress & Edge Routing** | Terminates TLS, verifies rate limits, sanitizes incoming payloads, and load balances traffic. | Cloudflare / Envoy Gateway | HTTPS (TLS 1.3), HTTP/2 |
| **Domain Orchestration** | Enforces core ${domain} business validation rules and coordinates multi-step operations. | ${stack.backend} | Internal gRPC / REST |
| **Asynchronous Task Queue** | Processes heavy background calculations, batch processing, and non-blocking syncs. | ${stack.backend} | Event-driven (Kafka / SQS) |
| **Hot Storage & Caching** | Serves read-heavy queries, distributed lock coordination, and token expiration. | ${stack.caching} | Redis protocol / Memcached |
| **System of Record** | Guarantees durable persistence, relational consistency, and auditable history. | ${stack.database} | SQL / Wire Protocol |
`,
    },

    // HLD 4: Data Architecture & Storage Strategy
    {
      id: "hld-data-architecture",
      title: "4. Data Architecture & Persistence Strategy (HLD)",
      level: "hld",
      phase: "Phase 2: Subsystem Design",
      contentMarkdown: `## 4. Data Architecture & Persistence Strategy

### 4.1 Polyglot Storage Strategy
The data layer utilizes specialized storage tiers matching specific latency and consistency profiles:
- **Transactional State (System of Record):** Hosted on **${stack.database}**. Enforces schema integrity, strict primary keys, and foreign-key constraints.
- **High-Speed Cache Tier:** Hosted on **${stack.caching}** with sub-millisecond retrieval. Employs Cache-Aside pattern with deterministic key namespacing.
- **Event Streaming & Audit Logs:** Hosted on **${stack.messaging}** with partitioned logs retaining immutable history for **${targetScale.dataRetention}**.

### 4.2 Data Flow & Ingestion Pipeline
\`\`\`mermaid
flowchart TD
    Client["Client Request"] --> Gateway["API Gateway"]
    Gateway --> WritePath["Write Handler (Command)"]
    Gateway --> ReadPath["Read Handler (Query)"]

    ReadPath -->|"1. Cache Query"| Cache["${stack.caching}"]
    Cache -.->|"Cache Miss"| ReadReplica["Read Replica (${stack.database.split(" ")[0]})"]
    
    WritePath -->|"2. Atomic Insert/Update"| MasterDB["Primary DB (${stack.database.split(" ")[0]})"]
    MasterDB -->|"3. Binlog / CDC Stream"| StreamBus["Event Bus (${stack.messaging.split(" ")[0]})"]
    StreamBus -->|"4. Update Cache & Search"| Cache
    MasterDB -.->|"Replication Sync"| ReadReplica
\`\`\`
`,
    },

    // HLD 5: External Integrations & API Gateway
    {
      id: "hld-integrations",
      title: "5. External Integrations & APIs (HLD)",
      level: "hld",
      phase: "Phase 2: Subsystem Design",
      contentMarkdown: `## 5. External Integrations & APIs

### 5.1 External Integration Topology
To operate within the modern enterprise ecosystem, **${title}** integrates with upstream identity providers, third-party webhook receivers, and payment/notification gateways.

### 5.2 API Boundary Standards
1. **Public APIs:** OpenAPI 3.1 specification, JSON payloads over HTTPS, versioned at \`/api/v1/...\`.
2. **Idempotency Keys:** Mandatory \`Idempotency-Key\` header on all non-GET state-mutating requests.
3. **Outbound Resiliency:** All third-party external integrations operate behind circuit breakers with exponential backoff and jitter.
`,
    },

    // HLD 6: Infrastructure & Multi-Region Topology
    {
      id: "hld-infrastructure",
      title: "6. Infrastructure & Deployment Topology (HLD)",
      level: "hld",
      phase: "Phase 3: Operations & Reliability",
      contentMarkdown: `## 6. Infrastructure & Deployment Topology

### 6.1 Multi-Availability Zone Cloud Architecture
Deployed using Infrastructure as Code (**${stack.devops}**) across high-availability cloud regions:

\`\`\`mermaid
graph TD
    GlobalDNS["Global Anycast DNS / CDN"]
    GlobalWAF["Cloud Edge WAF & DDoS Shield"]
    
    subgraph CloudRegion ["Multi-AZ Cloud Region"]
        subgraph AZ_A ["Availability Zone A"]
            ALB1["Application Load Balancer A"]
            AppClusterA["Container Nodes (K8s Pods)"]
            DB_Primary["${stack.database.split(" ")[0]} Primary (Write)"]
        end
        subgraph AZ_B ["Availability Zone B"]
            ALB2["Application Load Balancer B"]
            AppClusterB["Container Nodes (K8s Pods)"]
            DB_Secondary["${stack.database.split(" ")[0]} Standby (Sync)"]
        end
    end
    
    ColdStore["Encrypted Object Storage Backup"]

    GlobalDNS --> GlobalWAF
    GlobalWAF --> ALB1 & ALB2
    ALB1 --> AppClusterA
    ALB2 --> AppClusterB
    AppClusterA & AppClusterB --> DB_Primary
    DB_Primary -.->|"Synchronous Replication"| DB_Secondary
    DB_Primary -.->|"Automated Daily Snapshots"| ColdStore
\`\`\`

### 6.2 Progressive Delivery & Deployment Strategy
- **Deployment Model:** Containerized orchestration utilizing Kubernetes or managed container runners.
- **Rollout Strategy:** Automated Canary or Blue/Green rollouts with automated rollback triggers if error rate exceeds 0.1% or latency increases by $> 15\\%$.
`,
    },

    // HLD 7: Zero-Trust Security & Compliance
    {
      id: "hld-security",
      title: "7. Security, Zero Trust & Compliance (HLD)",
      level: "hld",
      phase: "Phase 3: Operations & Reliability",
      contentMarkdown: `## 7. Security, Zero Trust & Compliance

### 7.1 Security Architecture Pillars
- **Zero Trust Network Access (ZTNA):** All inter-service communications require mutual TLS (mTLS) with short-lived certificates.
- **Identity & Access Management:** OAuth 2.0 / OpenID Connect with JWT access tokens and cryptographically signed claims.
- **Data Protection at Rest:** AES-256-GCM envelope encryption for all database volumes, table partitions, and cache instances.
- **Data Protection in Transit:** Mandatory TLS 1.3 with strict HTTPS redirection and HSTS headers.
- **Regulatory Compliance:** Engineered to satisfy: **${nonFunctionalRequirements.compliance.join(", ") || "Standard Enterprise SecOps"}**.
`,
    },

    // HLD 8: Non-Functional Requirements & Resilience SLAs
    {
      id: "hld-nfr-resilience",
      title: "8. NFRs & Disaster Recovery SLAs (HLD)",
      level: "hld",
      phase: "Phase 3: Operations & Reliability",
      contentMarkdown: `## 8. Non-Functional Requirements & Disaster Recovery SLAs

### 8.1 Performance & Availability Targets
- **Target Scale:** ${targetScale.rps.toLocaleString()} RPS sustained peak load.
- **Latency Objectives:** ${nonFunctionalRequirements.latency} (p99).
- **Service Level Agreement (SLA):** ${nonFunctionalRequirements.availability} uptime.

### 8.2 Disaster Recovery Objectives
- **Recovery Point Objective (RPO):** $< 1\\text{ second}$ (Synchronous multi-zone database replication).
- **Recovery Time Objective (RTO):** $< 30\\text{ seconds}$ (Automated DNS health failover and container self-healing).
`,
    },

    // HLD 9: Architecture Decision Records (ADRs) & Trade-offs
    {
      id: "hld-adrs-tradeoffs",
      title: "9. Architecture Decision Records (ADRs) & Trade-offs (HLD)",
      level: "hld",
      phase: "Phase 4: Synthesis & Governance",
      contentMarkdown: `## 9. Architecture Decision Records (ADRs) & Trade-offs

### 9.1 ADR: Selected Architectural Pattern
- **Decision:** Adopted **${selectedPattern}**.
- **Context:** System requires high concurrency (${targetScale.rps} RPS), horizontal scalability, and modular maintenance.
- **Consequences:** Provides decoupled fault domains and independent scaling at the cost of distributed tracing overhead.

### 9.2 Pattern Comparison & Alternatives Evaluated
| Architectural Pattern | Suitability Score | Key Strengths | Reason Rejected / Trade-Off |
| :--- | :--- | :--- | :--- |
| **${selectedPattern} (Chosen)** | **9.5 / 10** | High scalability, decoupled deployments | Requires distributed tracing tooling |
${patternAlternatives
  .map(
    (alt) =>
      `| **${alt.pattern}** | 6.5 / 10 | Simpler initial scaffolding | ${alt.reasonNotChosen} |`
  )
  .join("\n")}

### 9.3 Tech Stack Selection Justification
- **Frontend (${stack.frontend}):** Optimal performance and user experience.
- **Backend (${stack.backend}):** High-throughput compute with minimal thread contention.
- **Database (${stack.database}):** Guaranteed referential integrity and strong consistency.
- **Caching (${stack.caching}):** Low-latency sub-millisecond retrieval.
- **Messaging (${stack.messaging}):** Durable event publishing and spike absorption.
- **DevOps (${stack.devops}):** Automated CI/CD, container orchestration, and observability.
`,
    },
  ];

  if (selectedSectionIds && selectedSectionIds.length > 0) {
    return sections.filter((s) => selectedSectionIds.includes(s.id));
  }
  return sections;
}

/**
 * -----------------------------------------------------------------------------
 * 2. LOW-LEVEL DESIGN (LLD) GENERATOR
 * Focus: Detailed class diagrams, database schemas (DDL), API payload specifications,
 * detailed sequence diagrams, algorithms, retry/concurrency, and telemetry.
 * -----------------------------------------------------------------------------
 */
export function generateLldDocument(
  projectData: Omit<DesignDocProject, "documentSections"> & {
    selectedSectionIds?: string[];
  }
): DocumentSection[] {
  const { metadata, requirements, recommendations, selectedSectionIds } = projectData;
  const title = metadata?.title?.trim() || "System Implementation Specification";
  const { domain, targetScale, functionalRequirements, nonFunctionalRequirements } = requirements;
  const { selectedPattern, stack } = recommendations;

  const sections: DocumentSection[] = [
    // LLD 1: Component & Class / Module Design
    {
      id: "lld-component-class-design",
      title: "1. Component & Class / Module Design (LLD)",
      level: "lld",
      phase: "Phase 1: Component & Code Architecture",
      contentMarkdown: `## 1. Component & Class / Module Design

### 1.1 Class Hierarchy & Object-Oriented Structure
The core business domain within **${title}** applies Domain-Driven Design (DDD) with clean interfaces and dependency inversion:

\`\`\`mermaid
classDiagram
    class ICommandBus {
        <<interface>>
        +dispatch(command: Command) Promise~Result~
        +registerHandler(type: string, handler: ICommandHandler)
    }

    class DomainController {
        -ICommandBus commandBus
        -IQueryHandler queryHandler
        +handleRequest(req: HttpRequest) HttpResponse
        +validatePayload(schema: Schema, data: any) boolean
    }

    class AggregateRoot {
        <<abstract>>
        #id: UUID
        #version: Long
        #uncommittedEvents: List~DomainEvent~
        +apply(event: DomainEvent) void
        +clearEvents() void
    }

    class DomainEntity {
        -status: EntityStatus
        -metadata: Map~String, Object~
        +executeAction(params: ActionParams) ActionResult
        +validateInvariants() boolean
    }

    class IRepository~T~ {
        <<interface>>
        +findById(id: UUID) Promise~T~
        +save(entity: T) Promise~void~
        +delete(id: UUID) Promise~void~
    }

    DomainController --> ICommandBus : Dispatches commands
    AggregateRoot <|-- DomainEntity : Extends
    IRepository <.. DomainEntity : Persisted by
\`\`\`

### 1.2 Design Patterns Utilized
1. **Repository Pattern:** Decouples the domain logic from database query implementations.
2. **Factory & Builder Patterns:** Encapsulates the instantiation of complex domain aggregates.
3. **Decorator / Middleware Pattern:** Applies cross-cutting concerns (authentication, rate limiting, distributed tracing) without modifying core business handlers.
`,
    },

    // LLD 2: Database Schemas, DDL & Entity Relationship Diagram
    {
      id: "lld-database-schemas",
      title: "2. Database Schemas, Tables & ERD (LLD)",
      level: "lld",
      phase: "Phase 1: Component & Code Architecture",
      contentMarkdown: `## 2. Database Schemas, Tables & ERD

### 2.1 Entity Relationship Diagram (Detailed ERD)
\`\`\`mermaid
erDiagram
    TENANTS ||--o{ ACCOUNTS : manages
    TENANTS {
        uuid id PK
        string slug UK
        string legal_name
        string plan_tier
        timestamp created_at
    }
    ACCOUNTS ||--o{ USER_CREDENTIALS : secures
    ACCOUNTS {
        uuid id PK
        uuid tenant_id FK
        string email UK
        string status
        timestamp created_at
    }
    USER_CREDENTIALS {
        uuid id PK
        uuid account_id FK
        string password_hash
        string salt
        int failed_attempts
        timestamp locked_until
    }
    ACCOUNTS ||--o{ DOMAIN_RECORDS : generates
    DOMAIN_RECORDS {
        uuid id PK
        uuid account_id FK
        string idempotency_key UK
        numeric value_amount
        string state
        timestamp recorded_at
    }
    DOMAIN_RECORDS ||--o{ AUDIT_TRAILS : logs
    AUDIT_TRAILS {
        uuid id PK
        uuid record_id FK
        string actor_id
        string event_type
        jsonb details
        timestamp occurred_at
    }
\`\`\`

### 2.2 DDL Schema Definition (PostgreSQL 16 / CockroachDB)
\`\`\`sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(32) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Domain Records Table with Partitioning & Idempotency
CREATE TABLE IF NOT EXISTS domain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    value_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    state VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_records_tenant_created 
    ON domain_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_state 
    ON domain_records(state) WHERE state = 'PENDING';
\`\`\`
`,
    },

    // LLD 3: API Endpoint Specifications & Contracts
    {
      id: "lld-api-specifications",
      title: "3. API Specifications & Payload Contracts (LLD)",
      level: "lld",
      phase: "Phase 2: API & Data Exchange",
      contentMarkdown: `## 3. API Specifications & Payload Contracts

### 3.1 Endpoint Index & HTTP Methods
| Method | Route Path | Description | Auth Scope | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| \`POST\` | \`/api/v1/commands/execute\` | Submits a state-mutating domain operation with idempotency. | \`write:domain\` | 500 req/min |
| \`GET\` | \`/api/v1/records/{id}\` | Retrieves full status and audit details of a record. | \`read:domain\` | 2000 req/min |
| \`GET\` | \`/api/v1/health/liveness\` | Kubernetes liveness probe endpoint. | None | Unlimited |
| \`GET\` | \`/api/v1/health/readiness\` | Validates DB and cache connections. | None | Unlimited |

### 3.2 Request / Response Payload Specification

#### Request Payload: \`POST /api/v1/commands/execute\`
\`\`\`json
{
  "traceId": "c479b1df-4b9d-47fb-9ad1-9ef2134db02a",
  "idempotencyKey": "idem_req_20260928_8819230",
  "operation": "EXECUTE_DOMAIN_TRANSACTION",
  "parameters": {
    "targetAmount": 1500.50,
    "currency": "USD",
    "metadata": {
      "channel": "API_INGRESS",
      "requestedScale": "${targetScale.rps} RPS"
    }
  }
}
\`\`\`

#### Success Response: \`201 Created\`
\`\`\`json
{
  "success": true,
  "data": {
    "recordId": "rec_01J8W2XZ5E81A",
    "status": "CONFIRMED",
    "createdAt": "2026-09-28T14:30:00Z"
  }
}
\`\`\`

#### Error Response: \`422 Unprocessable Entity\`
\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Field 'targetAmount' exceeds authorized transaction ceiling",
    "traceId": "c479b1df-4b9d-47fb-9ad1-9ef2134db02a"
  }
}
\`\`\`
`,
    },

    // LLD 4: Sequence & State Machine Workflows
    {
      id: "lld-sequence-workflows",
      title: "4. Detailed Sequence & State Machine Workflows (LLD)",
      level: "lld",
      phase: "Phase 2: API & Data Exchange",
      contentMarkdown: `## 4. Detailed Sequence & State Machine Workflows

### 4.1 End-to-End Command Processing Sequence
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client as Client App
    participant GW as API Gateway
    participant Cache as Redis Cache
    participant Service as Domain Service
    participant DB as Postgres DB
    participant Queue as Kafka Broker

    Client->>GW: POST /api/v1/commands/execute
    GW->>GW: Validate JWT, Headers & Rate Limits
    GW->>Cache: GET idempotency_key:{id}
    alt Idempotency Key Already Exists
        Cache-->>GW: Return Cached Result
        GW-->>Client: 200 OK (Replayed Response)
    else New Request
        Cache-->>GW: Nil
        GW->>Cache: SETNX idempotency_key:{id} (STATE=IN_PROGRESS, TTL=60s)
        GW->>Service: Forward gRPC Request
        Service->>DB: BEGIN Transaction
        Service->>DB: Lock Entity & Verify Invariants
        Service->>DB: INSERT Record & Update State
        DB-->>Service: Transaction Committed
        Service->>Queue: Publish DOMAIN_EVENT_PROCESSED
        Service->>Cache: SET idempotency_key:{id} (STATE=COMPLETED, TTL=86400s)
        Service-->>GW: Operation Successful
        GW-->>Client: 201 Created
    end
\`\`\`

### 4.2 Record State Transition Lifecycle
\`\`\`mermaid
stateDiagram-v2
    [*] --> DRAFT : Record Submitted
    DRAFT --> VALIDATED : Schema & Rule Check Pass
    DRAFT --> REJECTED : Validation Error
    VALIDATED --> PROCESSING : Acquired Lock
    PROCESSING --> COMPLETED : Committed to DB
    PROCESSING --> FAILED : Timeout / Unrecoverable Error
    FAILED --> RETRYING : Retry Triggered (< 3 attempts)
    RETRYING --> PROCESSING : Re-executed
    RETRYING --> DEAD_LETTER : Max Retries Exceeded
    COMPLETED --> [*]
    REJECTED --> [*]
    DEAD_LETTER --> [*]
\`\`\`
`,
    },

    // LLD 5: Core Business Logic & Algorithm Flowcharts
    {
      id: "lld-algorithm-flowcharts",
      title: "5. Algorithms & Business Logic Flowcharts (LLD)",
      level: "lld",
      phase: "Phase 3: Algorithms & Execution Mechanics",
      contentMarkdown: `## 5. Algorithms & Business Logic Flowcharts

### 5.1 Business Invariant Validation Logic
\`\`\`mermaid
flowchart TD
    Start(["Start Ingestion"]) --> CheckAuth{"Is Token Valid & Non-Expired?"}
    CheckAuth -- No --> AuthErr["Return 401 Unauthorized"]
    CheckAuth -- Yes --> CheckRateLimit{"Current RPS <= Ceiling?"}
    CheckRateLimit -- No --> RateErr["Return 429 Too Many Requests"]
    CheckRateLimit -- Yes --> AcquireLock["Acquire Distributed Lock (Redis Redlock)"]
    AcquireLock --> CheckBalance{"Pre-condition checks valid?"}
    CheckBalance -- No --> ReleaseLock["Release Lock"] --> RejectErr["Return 422 Business Rejection"]
    CheckBalance -- Yes --> ExecuteWrite["Commit Atomic DB Transaction"]
    ExecuteWrite --> ReleaseLock2["Release Lock"]
    ReleaseLock2 --> EmitEvent["Emit Event to ${stack.messaging.split(" ")[0]}"]
    EmitEvent --> ReturnSuccess(["Return 201 Created"])
\`\`\`

### 5.2 Pseudocode Implementation
\`\`\`typescript
async function processDomainCommand(command: DomainCommand): Promise<CommandResult> {
  const lockKey = \`lock:entity:\${command.entityId}\`;
  const lock = await distributedLockManager.acquire(lockKey, 5000); // 5s timeout

  try {
    const entity = await entityRepository.findById(command.entityId);
    if (!entity) {
      throw new EntityNotFoundException(command.entityId);
    }

    entity.assertCanExecute(command);
    const event = entity.applyCommand(command);

    await database.transaction(async (tx) => {
      await entityRepository.save(entity, tx);
      await outboxRepository.save(event, tx);
    });

    await messageBus.publish(event);
    return { success: true, entityId: entity.id, version: entity.version };
  } finally {
    await lock.release();
  }
}
\`\`\`
`,
    },

    // LLD 6: Error Handling, Retry & Circuit Breakers
    {
      id: "lld-error-handling",
      title: "6. Error Handling & Circuit Breaker Policies (LLD)",
      level: "lld",
      phase: "Phase 3: Algorithms & Execution Mechanics",
      contentMarkdown: `## 6. Error Handling & Circuit Breaker Policies

### 6.1 Exponential Backoff with Jitter
For all transient downstream network errors (HTTP 502, 503, 504), clients and worker queues execute randomized full-jitter backoff:
$$\\Delta t = \\min\\left(T_{\\max}, T_{\\text{base}} \\times 2^{\\text{attempt}}\\right) \\times \\text{random}(0.5, 1.0)$$

- $T_{\\text{base}} = 100\\text{ ms}$
- $T_{\\max} = 5000\\text{ ms}$
- Maximum Attempts: 3

### 6.2 Circuit Breaker Configuration (Resilience4j / Istio)
- **Failure Rate Threshold:** 50% failures within a sliding window of 100 requests opens the circuit.
- **Wait Duration in Open State:** 10,000 ms before entering Half-Open.
- **Permitted Calls in Half-Open:** 10 test calls. If 90% succeed, circuit resets to Closed.
- **Fallback Action:** Return cached degraded state or schedule async job to Dead Letter Queue (DLQ).
`,
    },

    // LLD 7: Concurrency & Worker Execution Model
    {
      id: "lld-concurrency-workers",
      title: "7. Concurrency Model & Threading / Workers (LLD)",
      level: "lld",
      phase: "Phase 3: Algorithms & Execution Mechanics",
      contentMarkdown: `## 7. Concurrency Model & Threading / Workers

### 7.1 Worker Pool Allocation
- **Ingress Web Server:** Non-blocking async event loop (Node.js / Go goroutines) capable of sustaining ${targetScale.rps} concurrent connections.
- **Background Consumer Cluster:** Pre-forked worker pool scaled horizontally with partition affinity matching message broker partition keys.
- **Distributed Locking:** Multi-node Redis Redlock ensuring single-leader concurrency per entity identifier.
`,
    },

    // LLD 8: Caching Mechanics & Invalidation Patterns
    {
      id: "lld-caching-mechanics",
      title: "8. Caching Strategy & Invalidation Mechanics (LLD)",
      level: "lld",
      phase: "Phase 4: Persistence, Telemetry & Ops",
      contentMarkdown: `## 8. Caching Strategy & Invalidation Mechanics

### 8.1 Key Namespacing & TTL Topology
- **Session Tokens:** \`session:token:{token_hash}\` (TTL: 86400s / 24h, Sliding).
- **Domain Entity Cache:** \`entity:{tenant_id}:{id}\` (TTL: 300s $\\pm$ 30s jitter).
- **Idempotency Locks:** \`idempotency:{tenant_id}:{key}\` (TTL: 86400s).

### 8.2 Invalidation & Stampede Mitigation
- **Cache-Aside Pattern:** Reads hit cache first. If missed, load from database and populate cache with TTL.
- **Probabilistic Early Expiration (XFetch algorithm):** Refresh cache before expiry when hot keys experience heavy query velocity.
`,
    },

    // LLD 9: Logging, Tracing & Telemetry Instrumentation
    {
      id: "lld-telemetry-instrumentation",
      title: "9. Telemetry, Tracing & Log Schemas (LLD)",
      level: "lld",
      phase: "Phase 4: Persistence, Telemetry & Ops",
      contentMarkdown: `## 9. Telemetry, Tracing & Log Schemas

### 9.1 Structured JSON Log Standard
Every log entry emitted by **${title}** includes unified contextual tracing fields:
\`\`\`json
{
  "timestamp": "2026-09-28T14:35:10.192Z",
  "level": "INFO",
  "service": "${domain.toLowerCase().replace(/[^a-z0-9]/g, "-")}-service",
  "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "spanId": "4a71b2d09c1234ef",
  "actorId": "usr_9921",
  "message": "Domain state transition completed successfully",
  "durationMs": 14.2
}
\`\`\`

### 9.2 Key Metrics & Alert Thresholds
- \`http_requests_total\`: Counter partitioned by status code and route.
- \`http_request_duration_seconds\`: Histogram measuring p50, p95, p99 latency against SLA (${nonFunctionalRequirements.latency}).
- \`db_connection_pool_active\`: Gauge alerting if pool saturation exceeds 85%.
`,
    },

    // LLD 10: Testing Strategy & Scenarios
    {
      id: "lld-testing-strategy",
      title: "10. Unit, Integration & Performance Testing (LLD)",
      level: "lld",
      phase: "Phase 4: Persistence, Telemetry & Ops",
      contentMarkdown: `## 10. Unit, Integration & Performance Testing

### 10.1 Test Coverage Hierarchy
1. **Unit Tests (80%+ target):** Domain aggregate invariants, validation rules, pure algorithms.
2. **Integration Tests:** Database transactions, repository query plans, cache invalidation cycles (using Testcontainers).
3. **Contract Tests:** Consumer-driven contract testing via Pact verifying OpenAPI / gRPC Protobuf compatibility.
4. **Load & Stress Testing:** k6 / Locust performance test suites asserting ${targetScale.rps} RPS throughput.
`,
    },

    // LLD 11: Configuration & Secrets Management
    {
      id: "lld-configuration-secrets",
      title: "11. Configuration & Secrets Management (LLD)",
      level: "lld",
      phase: "Phase 4: Persistence, Telemetry & Ops",
      contentMarkdown: `## 11. Configuration & Secrets Management

### 11.1 Secret Injection & Rotation
- **Zero Plaintext Secrets in Repositories:** All credentials injected dynamically via HashiCorp Vault / AWS Secrets Manager.
- **Automated Key Rotation:** Encryption keys and database credentials rotated every 90 days.
- **Environment Isolation:** Strictly separated staging, sandbox, and production configs with distinct KMS keys.
`,
    },
  ];

  if (selectedSectionIds && selectedSectionIds.length > 0) {
    return sections.filter((s) => selectedSectionIds.includes(s.id));
  }
  return sections;
}

/**
 * -----------------------------------------------------------------------------
 * 3. COMBINED FULL ARCHITECTURE DOCUMENT (HLD + LLD)
 * -----------------------------------------------------------------------------
 */
export function generateFullDocument(
  projectData: Omit<DesignDocProject, "documentSections"> & {
    selectedSectionIds?: string[];
  }
): DocumentSection[] {
  const hld = generateHldDocument(projectData);
  const lld = generateLldDocument(projectData);
  return [...hld, ...lld];
}

/**
 * -----------------------------------------------------------------------------
 * 4. STANDARD DISPATCHER
 * -----------------------------------------------------------------------------
 */
export function generateStandardDocument(
  projectData: Omit<DesignDocProject, "documentSections"> & {
    selectedSectionIds?: string[];
    designLevel?: DesignLevel;
  },
  overrideLevel?: DesignLevel
): DocumentSection[] {
  const level: DesignLevel = overrideLevel || projectData.designLevel || "hld";

  if (level === "lld") {
    return generateLldDocument(projectData);
  }
  if (level === "full") {
    return generateFullDocument(projectData);
  }
  return generateHldDocument(projectData);
}
