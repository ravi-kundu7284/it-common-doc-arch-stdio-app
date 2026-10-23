import {
  DesignDocProject,
  DocumentSection,
  DesignLevel,
  DocumentType,
  DocumentItem,
} from "@/types";

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

/**
 * -----------------------------------------------------------------------------
 * 5. SPECIALIZED ENTERPRISE DOCUMENT GENERATORS
 * -----------------------------------------------------------------------------
 */

export function generateOverviewDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, requirements, recommendations } = projectData;
  const title = metadata?.title || "System Architecture";
  const { domain, targetScale, functionalRequirements, nonFunctionalRequirements } = requirements;

  return [
    {
      id: "overview-exec",
      title: "1. Executive Summary & Problem Statement",
      level: "common",
      phase: "Phase 1: Project Charter",
      contentMarkdown: `## 1. Executive Summary & Problem Statement

### 1.1 Business Context
The **${title}** initiative establishes a modern, high-resilience architecture for the **${domain}** domain.
Operating at a target peak throughput of **${targetScale.rps.toLocaleString()} RPS** across **${targetScale.users}**, the system modernizes existing operational paradigms to deliver high reliability, automated governance, and superior user experience.

### 1.2 Core Problem Statement
Traditional architectures in the ${domain} space suffer from tight coupling, opaque state transitions, scalability bottlenecks during peak load spikes, and disproportionately high maintenance costs. **${title}** solves these challenges by implementing a decoupled, observable, and standards-compliant architectural foundation.
`,
    },
    {
      id: "overview-scope",
      title: "2. Strategic Objectives & Scope Boundaries",
      level: "common",
      phase: "Phase 1: Project Charter",
      contentMarkdown: `## 2. Strategic Objectives & Scope Boundaries

### 2.1 Strategic Key Performance Indicators (KPIs)
- **High Availability:** Maintain service availability of **${nonFunctionalRequirements.availability}**.
- **Low-Latency Guarantees:** Deliver p95 API response times under **${nonFunctionalRequirements.latency}**.
- **Security & Governance:** Full compliance with **${nonFunctionalRequirements.compliance.join(", ") || "Standard Enterprise SecOps"}**.
- **Data Durability:** Enforce a strict data retention and audit window of **${targetScale.dataRetention}**.

### 2.2 In-Scope Workstream Deliverables
${functionalRequirements.map((f, i) => `- **[P1 Deliverable]** ${f}`).join("\n")}
- Cloud-native auto-scaling deployment on **${recommendations.stack.devops}**.
- Centralized distributed tracing, metrics, and audit logging.

### 2.3 Non-Goals (Out of Scope for Initial Milestone)
- Legacy hardware-based appliance maintenance.
- Cross-cloud multi-master active-active write synchronizations prior to regional cutover.
`,
    },
    {
      id: "overview-landscape",
      title: "3. Solution Landscape & Architecture Topology",
      level: "common",
      phase: "Phase 1: Project Charter",
      contentMarkdown: `## 3. Solution Landscape & Architecture Topology

### 3.1 High-Level Solution Map
\`\`\`mermaid
flowchart TD
    Users["Verified End Users / Residents"] --> Edge["Cloud Edge & WAF"]
    Edge --> App["${title} Core Services (${recommendations.stack.backend})"]
    App --> Cache["In-Memory Cache (${recommendations.stack.caching})"]
    App --> DB[("Primary Database (${recommendations.stack.database})")]
    App --> Bus["Message Broker (${recommendations.stack.messaging})"]
    Bus --> Workers["Async Job Workers & Notifications"]
\`\`\`

### 3.2 Key Architecture Highlights
- **Pattern:** ${recommendations.selectedPattern} pattern optimized for maintainability and modular decoupling.
- **Compute:** Auto-scaling containerized workloads running on ${recommendations.stack.devops}.
- **Persistence:** Multi-AZ ACID relational persistence with Point-in-Time Recovery.
`,
    },
    {
      id: "overview-governance",
      title: "4. Governance, Stakeholders & Operating Model",
      level: "common",
      phase: "Phase 1: Project Charter",
      contentMarkdown: `## 4. Governance, Stakeholders & Operating Model

### 4.1 Architecture Decision Authority
| Role | Accountable Owner | Key Decision Responsibilities |
| :--- | :--- | :--- |
| **Lead Solutions Architect** | Principal Architect | Pattern selection, technology stack, NFR enforcement |
| **Security Officer** | SecOps Lead | Zero-trust compliance, encryption keys, vulnerability gates |
| **Engineering Lead** | Tech Lead | Sprint delivery, code quality, automated test coverage |
| **Product Manager** | Product Owner | Requirements prioritization, business acceptance |

### 4.2 Review Gates & Sign-Off Cadence
1. **Architecture Review Board (ARB):** Formal review at Milestone HLD completion.
2. **Security & Threat Model Audit:** Pre-production pen-testing & STRIDE verification.
3. **Operational Readiness Review (ORR):** Runbook drills and DR failover validation.
`,
    },
  ];
}

export function generateBrdDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, requirements, recommendations } = projectData;
  const title = metadata?.title || "System Architecture";
  const { domain, functionalRequirements, nonFunctionalRequirements } = requirements;

  return [
    {
      id: "brd-context",
      title: "1. Business Context & Stakeholder Analysis",
      level: "common",
      phase: "Business Requirements",
      contentMarkdown: `## 1. Business Context & Stakeholder Analysis

### 1.1 Business Opportunity
The market demand in **${domain}** requires rapid turnaround, zero-trust verification, and predictable operational costs. **${title}** creates direct stakeholder value by automating workflows, eliminating manual approval delays, and providing real-time visibility.

### 1.2 Stakeholder Value Matrix
| Stakeholder Group | Primary Objective | Business Value Delivered |
| :--- | :--- | :--- |
| **End Users / Customers** | Low-friction interaction & instant feedback | Sub-second latency, accessible UI, and transparent status. |
| **Operations & Admins** | Efficient management & fraud control | Automated verification queues, audit trails, and dispute resolution. |
| **Engineering / DevOps** | Maintainability & cost predictability | Standardized **${recommendations.selectedPattern}** pattern on **${recommendations.stack.backend}**. |
| **Executive Leadership** | SLA compliance & ROI | Predictable infrastructure costs and scalable growth. |
`,
    },
    {
      id: "brd-process",
      title: "2. Business Process & Core Workflow",
      level: "common",
      phase: "Business Requirements",
      contentMarkdown: `## 2. Business Process & Core Workflow

\`\`\`mermaid
flowchart TD
    Start(["Business Trigger / Client Request"]) --> Validate{"Initial Verification"}
    Validate -->|"Passed"| Process["Process Domain Transaction"]
    Validate -->|"Failed"| Reject["Notify Rejection & Log"]
    Process --> Ledger["Record Audit & State Mutation"]
    Ledger --> Notify["Dispatch Notifications (Push / Email / SMS)"]
    Notify --> Finish(["Transaction Fulfilled"])
\`\`\`

### 2.3 Core Business Rules
${functionalRequirements.map((f, idx) => `1. **Rule BR-${100 + idx + 1}:** ${f}`).join("\n")}
`,
    },
    {
      id: "brd-detailed-reqs",
      title: "3. Detailed Business Requirements & Acceptance Criteria",
      level: "common",
      phase: "Business Requirements",
      contentMarkdown: `## 3. Detailed Business Requirements & Acceptance Criteria

### 3.1 Business Capabilities
| Capability ID | Capability Name | Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
${functionalRequirements.map((f, idx) => `| **CAP-${idx + 1}** | ${f.slice(0, 28)} | Automated fulfillment of ${f.toLowerCase()} | System processes requests in under 200ms with full audit trace. |`).join("\n")}

### 3.2 Business SLA Mandates
- **Availability Target:** ${nonFunctionalRequirements.availability} uptime during standard operations.
- **Latency Requirement:** ${nonFunctionalRequirements.latency} turnaround for interactive client workflows.
`,
    },
    {
      id: "brd-constraints",
      title: "4. Business Constraints, Assumptions & Regulatory Mandates",
      level: "common",
      phase: "Business Requirements",
      contentMarkdown: `## 4. Business Constraints, Assumptions & Regulatory Mandates

### 4.1 Regulatory Compliance
- Full compliance with: **${nonFunctionalRequirements.compliance.join(", ") || "Standard Enterprise Privacy Regulations"}**.
- Complete data isolation and audit retention policies enforced.

### 4.2 Documented Assumptions & Guardrails
- End users have mobile or modern web browser connectivity.
- Third-party webhook providers guarantee at least 99.9% uptime with idempotent delivery.
`,
    },
  ];
}

export function generateSrsDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, requirements, recommendations } = projectData;
  const title = metadata?.title || "System Architecture";
  const { functionalRequirements, nonFunctionalRequirements, targetScale } = requirements;

  return [
    {
      id: "srs-scope",
      title: "1. System Scope & Product Perspective",
      level: "common",
      phase: "SRS",
      contentMarkdown: `## 1. System Scope & Product Perspective

### 1.1 Product Scope
**${title}** is a carrier-grade software system engineered for **${requirements.domain}**.
It serves as the authoritative transactional core, interfacing with client frontends, external payment processors, identity providers, and messaging gateways.

### 1.2 System Context Diagram
\`\`\`mermaid
flowchart LR
    Client["Client Web / Mobile"] --> Gateway["API Gateway / Reverse Proxy"]
    Gateway --> Backend["${recommendations.stack.backend} Core Application"]
    Backend --> DB[("Database: ${recommendations.stack.database}")]
    Backend --> Ext["External Payment & SMS Gateways"]
\`\`\`
`,
    },
    {
      id: "srs-functional",
      title: "2. Functional Requirements & User Stories",
      level: "common",
      phase: "SRS",
      contentMarkdown: `## 2. Functional Requirements & User Stories

### 2.1 Functional Specification Matrix
| Req ID | Requirement Title | User Story | Priority |
| :--- | :--- | :--- | :--- |
${functionalRequirements
  .map(
    (f, idx) =>
      `| **FR-${String(idx + 1).padStart(3, "0")}** | ${f.slice(0, 30)}... | As a verified user, I must be able to ${f.toLowerCase()}, so that business operations proceed securely. | High |`
  )
  .join("\n")}
`,
    },
    {
      id: "srs-nfr",
      title: "3. Non-Functional Quantitative SLAs",
      level: "common",
      phase: "SRS",
      contentMarkdown: `## 3. Non-Functional Quantitative SLAs

### 3.1 Performance & Scalability
- **Peak Concurrency:** **${targetScale.rps} RPS** sustained throughput.
- **Latency SLA:** **${nonFunctionalRequirements.latency}** for 95th percentile requests.
- **Service Availability:** **${nonFunctionalRequirements.availability}** uptime SLA (equating to < 4.38 hours downtime/year).

### 3.2 Security & Compliance Mandates
- **Compliance Standards:** ${nonFunctionalRequirements.compliance.join(", ") || "ISO 27001, SOC2 Type II"}.
- **Transport Security:** Strict TLS 1.3 encryption with HTTP Strict Transport Security (HSTS).
- **Data at Rest:** Transparent Database Encryption using AES-256 keys managed by Cloud KMS.
`,
    },
    {
      id: "srs-interfaces",
      title: "4. External Interfaces & Verification Matrix",
      level: "common",
      phase: "SRS",
      contentMarkdown: `## 4. External Interfaces & Verification Matrix

### 4.1 Interface Protocols
- **Client Protocol:** HTTPS REST / JSON API with OAuth2 Bearer Tokens.
- **Data Protocol:** TCP wire protocol with connection pooling.
- **Telemetry Protocol:** OpenTelemetry gRPC metrics and OTLP tracing collector.

### 4.2 Quality Assurance Verification Gates
- **Unit Testing:** Minimum 85% branch coverage required for CI merge.
- **Integration Testing:** Automated end-to-end regression test suite running in staging.
- **Load Testing:** Automated k6 benchmark tests verifying ${targetScale.rps} RPS target.
`,
    },
  ];
}

export function generateSadDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, recommendations, requirements } = projectData;
  const title = metadata?.title || "System Architecture";
  const { selectedPattern, stack } = recommendations;

  return [
    {
      id: "sad-blueprint",
      title: "1. Holistic Solution Blueprint",
      level: "hld",
      phase: "Solution Architecture",
      contentMarkdown: `## 1. Holistic Solution Blueprint

The **${title}** solution implements a **${selectedPattern}** architecture designed for durability, modular maintenance, and cloud elasticity.

\`\`\`mermaid
flowchart TD
    Client["Client Clients<br/>[Web / Mobile PWA]"]
    WAF["Cloud Edge & WAF<br/>[DDoS Shield, TLS 1.3]"]
    App["Application Tier<br/>[${stack.backend}]"]
    Cache["Caching Layer<br/>[${stack.caching}]"]
    DB[("Primary Database<br/>[${stack.database}]")]
    Queue["Asynchronous Broker<br/>[${stack.messaging}]"]

    Client -->|"HTTPS / REST"| WAF
    WAF -->|"Reverse Proxy"| App
    App <-->|"Session & Hot Lookups"| Cache
    App <-->|"ACID Transactions"| DB
    App -->|"Emit Events / Jobs"| Queue
\`\`\`
`,
    },
    {
      id: "sad-matrix",
      title: "2. Technology Evaluation & Standards Matrix",
      level: "hld",
      phase: "Solution Architecture",
      contentMarkdown: `## 2. Technology Evaluation & Standards Matrix

| Architectural Layer | Chosen Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Tier** | ${stack.frontend} | Server-Side Rendering (SSR) for fast First Contentful Paint, TypeScript type safety. |
| **Backend Tier** | ${stack.backend} | High I/O concurrency, rich ecosystem, and modular package boundaries. |
| **Data Tier** | ${stack.database} | ACID transactional guarantees, JSONB semi-structured capability, robust replication. |
| **Caching Layer** | ${stack.caching} | Sub-millisecond latency for session validation and rate limit tracking. |
| **Messaging Layer** | ${stack.messaging} | Guaranteed message delivery, decoupled asynchronous task processing. |
| **Infrastructure / DevOps** | ${stack.devops} | Immutable container packaging and automated infrastructure-as-code deployments. |
`,
    },
    {
      id: "sad-decomposition",
      title: "3. Component Decomposition & Bounded Contexts",
      level: "hld",
      phase: "Solution Architecture",
      contentMarkdown: `## 3. Component Decomposition & Bounded Contexts

### 3.1 Bounded Contexts
1. **Identity & Access Management:** Manages member credentials, MFA challenges, and RBAC permissions.
2. **Core Domain Processing:** Encapsulates business logic, state machines, and business invariant validations.
3. **Notification Engine:** Dispatches real-time webhooks, push notifications, and emails via queues.
4. **Audit & Compliance Ledger:** Append-only tamper-evident logging for regulatory review.
`,
    },
    {
      id: "sad-resilience",
      title: "4. Cross-Cutting Concerns & Resilience Architecture",
      level: "hld",
      phase: "Solution Architecture",
      contentMarkdown: `## 4. Cross-Cutting Concerns & Resilience Architecture

### 4.1 Fault Tolerance Patterns
- **Circuit Breakers:** Implemented on all third-party outbound HTTP requests (5 failures trip breaker for 30s).
- **Dead Letter Queues (DLQ):** Poison messages redirected to DLQ with exponential retry headers.
- **Idempotency Enforcement:** Redis-backed unique token deduplication prevents duplicate billing.
`,
    },
  ];
}

export function generateDatabaseDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, recommendations } = projectData;
  const title = metadata?.title || "System Architecture";

  return [
    {
      id: "db-erd",
      title: "1. Entity-Relationship Data Model",
      level: "lld",
      phase: "Database Architecture",
      contentMarkdown: `## 1. Entity-Relationship Data Model

\`\`\`mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : initiates
    USERS ||--o{ AUDIT_LOGS : generates
    USERS {
        uuid id PK
        string email UK
        string full_name
        string role
        string status
        timestamptz created_at
    }
    TRANSACTIONS ||--o{ TRANSACTION_EVENTS : tracks
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        string idempotency_key UK
        numeric amount
        string currency
        string status
        timestamptz created_at
    }
    TRANSACTION_EVENTS {
        uuid id PK
        uuid transaction_id FK
        string event_type
        jsonb payload
        timestamptz timestamp
    }
\`\`\`
`,
    },
    {
      id: "db-ddl",
      title: "2. Relational DDL Specifications & Indexing Strategy",
      level: "lld",
      phase: "Database Architecture",
      contentMarkdown: `## 2. Relational DDL Specifications & Indexing Strategy

\`\`\`sql
-- Schema DDL for ${title} Core Data Entities
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(50) DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'initiated',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
\`\`\`
`,
    },
    {
      id: "db-migrations",
      title: "3. Database Migrations, Versioning & Seeding",
      level: "lld",
      phase: "Database Architecture",
      contentMarkdown: `## 3. Database Migrations, Versioning & Seeding

### 3.1 Migration Strategy
- Managed via automated database migration tools (e.g. Liquibase or Prisma Migrate).
- Backward-compatible schema evolution (expand and contract pattern) with zero-downtime deployments.
- Reversible rollback scripts verified on staging before production execution.
`,
    },
    {
      id: "db-backup-pitr",
      title: "4. Backup, Replication & Point-in-Time Recovery",
      level: "lld",
      phase: "Database Architecture",
      contentMarkdown: `## 4. Backup, Replication & Point-in-Time Recovery

### 4.1 Replication Topology
- **Primary Node:** Synchronous writes in Availability Zone 1.
- **Standby Node:** Synchronous hot standby in Availability Zone 2 with automatic failover (< 30s).
- **Read Replicas:** Up to 4 asynchronous read replicas for read-heavy query distribution.

### 4.2 Backup & Retention
- **Automated Snapshots:** Nightly full volume backups retained for 35 days.
- **Write-Ahead Log (WAL) Archiving:** Continuous streaming WAL archiving to Cloud Storage, guaranteeing an RPO < 5 minutes.
`,
    },
  ];
}

export function generateApiDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata } = projectData;
  const title = metadata?.title || "System Architecture";

  return [
    {
      id: "api-standards",
      title: "1. API Architecture Principles & Standards",
      level: "lld",
      phase: "API Design",
      contentMarkdown: `## 1. API Architecture Principles & Standards

### 1.1 Design Standards
- **RESTful Conventions:** Standard HTTP semantics (\`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`).
- **Base URI:** \`https://api.${title.toLowerCase().replace(/[^a-z0-9]/g, "")}.com/v1\`
- **Authentication:** Bearer JWT in the \`Authorization: Bearer <token>\` header.
- **Idempotency:** All mutating requests require an \`Idempotency-Key: <UUID>\` header.
- **Pagination:** Standard cursor-based pagination (\`?cursor=<token>&limit=50\`).

### 1.2 Unified JSON Response Envelope
\`\`\`json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_84f932847a",
    "timestamp": "2026-10-23T12:00:00Z"
  }
}
\`\`\`
`,
    },
    {
      id: "api-endpoints",
      title: "2. Core API Endpoints Specification",
      level: "lld",
      phase: "API Design",
      contentMarkdown: `## 2. Core API Endpoints Specification

| Method | Endpoint Path | Description | Auth Required | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| \`POST\` | \`/api/v1/auth/register\` | Register new user / request verification | No | 10 req/min |
| \`POST\` | \`/api/v1/auth/login\` | Authenticate user and issue JWT session | No | 15 req/min |
| \`GET\` | \`/api/v1/resources\` | Paginated listing of domain items | Yes | 300 req/min |
| \`POST\` | \`/api/v1/resources\` | Create new resource (idempotent) | Yes | 60 req/min |
| \`GET\` | \`/api/v1/resources/:id\` | Fetch resource details by UUID | Yes | 600 req/min |
| \`PATCH\` | \`/api/v1/resources/:id\` | Update mutable resource properties | Yes | 60 req/min |
| \`POST\` | \`/api/v1/checkout\` | Initiate checkout transaction | Yes | 30 req/min |
`,
    },
    {
      id: "api-security-ratelimit",
      title: "3. Authentication, Authorization & Rate Limiting",
      level: "lld",
      phase: "API Design",
      contentMarkdown: `## 3. Authentication, Authorization & Rate Limiting

### 3.1 Token Lifecycle
- Access tokens expire after 15 minutes.
- Refresh tokens stored in HTTP-only, SameSite=Strict cookies with automatic rotation on reuse.

### 3.2 Rate Limiting Policies
- Token bucket algorithm implemented via Redis.
- Standard clients: 300 requests/minute.
- Burst allowance: 50 requests over baseline.
`,
    },
    {
      id: "api-errors-webhooks",
      title: "4. Error Handling, Problem Details & Webhooks",
      level: "lld",
      phase: "API Design",
      contentMarkdown: `## 4. Error Handling, Problem Details & Webhooks

### 4.1 RFC 7807 Problem Details Standard
All API errors return RFC 7807 structured JSON payloads:
\`\`\`json
{
  "type": "https://api.docs/errors/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Resource with specified UUID was not found.",
  "instance": "/api/v1/resources/res_123"
}
\`\`\`

### 4.2 Webhook Callbacks
- Outbound webhooks signed with HMAC SHA-256 using shared secret.
- Receiver validates header \`X-Signature-SHA256\` before processing.
`,
    },
  ];
}

export function generateSecurityDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, requirements } = projectData;
  const title = metadata?.title || "System Architecture";
  const { nonFunctionalRequirements } = requirements;

  return [
    {
      id: "sec-stride",
      title: "1. STRIDE Threat Model & Attack Surface",
      level: "common",
      phase: "Security Architecture",
      contentMarkdown: `## 1. STRIDE Threat Model & Attack Surface

| STRIDE Category | Threat Vector | Implemented Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Forged client credentials or session hijacking | Ephemeral JWT with RS256 asymmetric signing, short TTL (15 mins), and refresh rotation. |
| **Tampering** | In-flight payload manipulation | Strict TLS 1.3, cryptographic HMAC signatures on webhooks, and DB audit hashing. |
| **Repudiation** | Denying completed transactions | Tamper-evident append-only audit trail recording actor IP, timestamp, and action. |
| **Information Disclosure** | Data leakage in logs or error stack traces | Strict sanitization of PII/credentials, column-level DB encryption, and generic errors. |
| **Denial of Service** | Volumetric layer 7 HTTP flood attacks | Cloudflare WAF, Redis sliding-window rate limiters, and auto-scaling pods. |
| **Elevation of Privilege** | Horizontal privilege escalation (IDOR) | Strict Row-Level Security (RLS) policies and policy-based authorization (ABAC). |
`,
    },
    {
      id: "sec-crypto",
      title: "2. Cryptographic Governance & Compliance",
      level: "common",
      phase: "Security Architecture",
      contentMarkdown: `## 2. Cryptographic Governance & Compliance

### 2.1 Encryption Standards
- **Data in Transit:** TLS 1.3 enforced on all ingress endpoints with forward secrecy cipher suites.
- **Data at Rest:** Database volumes and Cloud Storage buckets encrypted using AES-256-GCM via Cloud KMS.
- **Secrets Management:** Zero plaintext secrets in code or configuration. Managed through HashiCorp Vault or Cloud Secret Manager with automatic 90-day rotation.

### 2.2 Compliance Verification
Adherence to **${nonFunctionalRequirements.compliance.join(", ") || "SOC2 Type II, ISO 27001"}**. Annual third-party penetration testing and quarterly vulnerability scans.
`,
    },
    {
      id: "sec-iam-rbac",
      title: "3. Identity, Access Management & Zero Trust",
      level: "common",
      phase: "Security Architecture",
      contentMarkdown: `## 3. Identity, Access Management & Zero Trust

### 3.1 Role-Based Access Control (RBAC) Matrix
| Role | Read Catalog | Create Listing / Order | Admin Verification | System Config |
| :--- | :---: | :---: | :---: | :---: |
| **Guest / Anonymous** | Yes | No | No | No |
| **Verified Member** | Yes | Yes | No | No |
| **Society Admin** | Yes | Yes | Yes | No |
| **Super Administrator** | Yes | Yes | Yes | Yes |

### 3.2 Least Privilege Architecture
- Microservices use dedicated service accounts with IAM least privilege.
- Production database access strictly restricted to application connection pools.
`,
    },
    {
      id: "sec-ops-audit",
      title: "4. Security Operations & Audit Logging",
      level: "common",
      phase: "Security Architecture",
      contentMarkdown: `## 4. Security Operations & Audit Logging

### 4.1 Audit Trail Mandate
All security events (authentication failures, permission modifications, financial mutations) emit immutable audit events to dedicated SIEM collectors.
`,
    },
  ];
}

export function generateDeploymentDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, recommendations } = projectData;
  const title = metadata?.title || "System Architecture";
  const { stack } = recommendations;

  return [
    {
      id: "deploy-topology",
      title: "1. Multi-AZ Cloud Infrastructure Topology",
      level: "hld",
      phase: "Deployment Architecture",
      contentMarkdown: `## 1. Multi-AZ Cloud Infrastructure Topology

\`\`\`mermaid
graph TD
    User["End Users / Mobile App"] --> CDN["Cloud Edge CDN & WAF"]
    CDN --> LB["Application Load Balancer"]
    
    subgraph VPC ["Production VPC (10.0.0.0/16)"]
        subgraph AZ1 ["Availability Zone 1"]
            App1["App Container Replica 1"]
            DB_Primary[("Primary DB (Writer)")]
        end
        subgraph AZ2 ["Availability Zone 2"]
            App2["App Container Replica 2"]
            DB_Standby[("Standby DB (Sync Replica)")]
        end
    end

    LB --> App1
    LB --> App2
    App1 --> DB_Primary
    App2 --> DB_Primary
    DB_Primary -.->|"Synchronous Replication"| DB_Standby
\`\`\`
`,
    },
    {
      id: "deploy-specs",
      title: "2. Capacity Sizing & Auto-Scaling Parameters",
      level: "hld",
      phase: "Deployment Architecture",
      contentMarkdown: `## 2. Capacity Sizing & Auto-Scaling Parameters

| Component | Minimum Replicas | Maximum Replicas | Scale-Out Metric |
| :--- | :--- | :--- | :--- |
| **Ingress Load Balancer** | 2 | 10 | Sustained HTTP request count > 2,000 req/sec |
| **App Compute (${stack.backend})** | 2 | 20 | CPU utilization > 70% or Memory > 75% |
| **Redis Cache Cluster** | 2 (Primary + Replica) | 6 nodes | Memory utilization > 80% |
| **Database (${stack.database})** | 1 Writer, 1 Read Replica | 4 Read Replicas | Read IOPS or CPU > 75% |
`,
    },
    {
      id: "deploy-cicd",
      title: "3. CI/CD Deployment Pipeline & Rollout Automation",
      level: "hld",
      phase: "Deployment Architecture",
      contentMarkdown: `## 3. CI/CD Deployment Pipeline & Rollout Automation

### 3.1 Deployment Strategy: Canary Rollouts
\`\`\`mermaid
flowchart LR
    Commit["Git Push to Main"] --> Lint["Static Lint & TypeScript Check"]
    Lint --> Tests["Automated Test Suites (Unit & E2E)"]
    Tests --> Build["Docker Container Image Build"]
    Build --> Scan["Trivy Container Security Vulnerability Scan"]
    Scan --> Canary["Deploy Canary (10% Traffic)"]
    Canary --> Promote["Promote to 100% Production"]
\`\`\`
`,
    },
    {
      id: "deploy-finops",
      title: "4. Infrastructure Cost Governance & FinOps",
      level: "hld",
      phase: "Deployment Architecture",
      contentMarkdown: `## 4. Infrastructure Cost Governance & FinOps

### 4.1 Cost Budgeting & Optimization
- Cloud resources tagged by environment (\`env: prod\`) and component (\`app: ${title.toLowerCase().replace(/[^a-z0-9]/g, "")}\`).
- Compute auto-scaling scales down during off-peak night windows to maintain reasonable operational expenditure.
`,
    },
  ];
}

export function generateRunbookDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata } = projectData;
  const title = metadata?.title || "System Architecture";

  return [
    {
      id: "runbook-observability",
      title: "1. Health Monitoring & Alerting Matrix",
      level: "common",
      phase: "Operations & Runbooks",
      contentMarkdown: `## 1. Health Monitoring & Alerting Matrix

### 1.1 Golden Signals & Alerting Thresholds
| Metric | Healthy Baseline | Warning Alert | Critical PagerDuty Alert |
| :--- | :--- | :--- | :--- |
| **HTTP 5xx Error Rate** | < 0.05% | > 1.0% for 2 mins | > 5.0% for 1 min |
| **p95 Latency** | < 150ms | > 400ms for 3 mins | > 1,000ms for 2 mins |
| **Database CPU Usage** | < 45% | > 75% for 5 mins | > 90% for 3 mins |
| **Disk Storage Capacity** | < 60% used | > 80% used | > 90% used |
`,
    },
    {
      id: "runbook-sop",
      title: "2. Standard Operating Procedures (SOP)",
      level: "common",
      phase: "Operations & Runbooks",
      contentMarkdown: `## 2. Standard Operating Procedures (SOP)

### SOP-01: Application Service Emergency Rolling Restart
1. Verify traffic is cleanly balanced across both availability zones.
2. Trigger non-disruptive rolling restart via container orchestrator:
   \`\`\`bash
   kubectl rollout restart deployment/${title.toLowerCase().replace(/[^a-z0-9]/g, "")}-backend -n production
   \`\`\`
3. Monitor error rates in Datadog / Grafana dashboard for 5 minutes.

### SOP-02: Relational Database Failover Drill
1. Trigger managed failover to warm standby replica.
2. Applications automatically reconnect via DNS endpoint within 30 seconds.
3. Validate write availability with synthetic smoke test.
`,
    },
    {
      id: "runbook-escalation",
      title: "3. Incident Management & Escalation Tiers",
      level: "common",
      phase: "Operations & Runbooks",
      contentMarkdown: `## 3. Incident Management & Escalation Tiers

### 3.1 Severity Definitions
- **Sev-1 (Critical Outage):** Production system offline, critical data loss risk. SLA: 15-minute response.
- **Sev-2 (Degraded Performance):** High latency, partial feature unavailability. SLA: 30-minute response.
- **Sev-3 (Minor Issue):** Cosmetic or non-blocking defect. SLA: Next business day.
`,
    },
    {
      id: "runbook-dr",
      title: "4. Disaster Recovery & Regional Failover Playbook",
      level: "common",
      phase: "Operations & Runbooks",
      contentMarkdown: `## 4. Disaster Recovery & Regional Failover Playbook

### 4.1 DR Metrics
- **Recovery Point Objective (RPO):** < 5 minutes via streaming WAL replication.
- **Recovery Time Objective (RTO):** < 15 minutes for standby region activation.
`,
    },
  ];
}

export function generateRaidDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata, requirements } = projectData;
  const title = metadata?.title || "System Architecture";
  const { constraints } = requirements;

  return [
    {
      id: "raid-matrix",
      title: "1. Risk, Assumptions, Issues, Dependencies (RAID) Register",
      level: "common",
      phase: "RAID Governance",
      contentMarkdown: `## 1. Risk, Assumptions, Issues, Dependencies (RAID) Register

### 1.1 Risk Register
| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Third-party payment gateway or webhook downtime | Medium | High | Exponential backoff retry queue with DLQ; fallback provider. |
| **RSK-02** | Rapid surge in concurrency during promotional events | High | Medium | Horizontal Pod Autoscaling (HPA) with Redis edge caching. |
| **RSK-03** | Unauthorized access or compromised resident credentials | Low | Critical | Multi-factor authentication, audit logs, and instant session revocation. |

### 1.2 Documented Architectural Assumptions
- High-speed internet connectivity available to all end clients.
- Managed cloud database provides automatic daily snapshots and PITR.

### 1.3 Project Constraints
${constraints.map((c, i) => `- **[Constraint ${i + 1}]** ${c}`).join("\n")}
`,
    },
    {
      id: "raid-assumptions",
      title: "2. Architectural Assumptions & Validation Criteria",
      level: "common",
      phase: "RAID Governance",
      contentMarkdown: `## 2. Architectural Assumptions & Validation Criteria

### 2.1 Technical Assumptions
1. Client applications support WebSocket or SSE for real-time notifications.
2. Ingress CDN handles SSL/TLS termination and DDoS mitigation before traffic reaches backend VPC.
`,
    },
    {
      id: "raid-issues",
      title: "3. Active Issues & Escalation Tracker",
      level: "common",
      phase: "RAID Governance",
      contentMarkdown: `## 3. Active Issues & Escalation Tracker

### 3.1 Issue Resolution Protocol
All architecture blockers are logged in the project tracking backlog with an assigned owner, target release sprint, and impact analysis.
`,
    },
    {
      id: "raid-dependencies",
      title: "4. External Dependencies & SLA Matrix",
      level: "common",
      phase: "RAID Governance",
      contentMarkdown: `## 4. External Dependencies & SLA Matrix

| Dependency | Vendor / Provider | Target SLA | Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **Identity Provider** | Cloud Auth / OAuth2 | 99.99% | Cached public keys, graceful token validation |
| **SMS Gateway** | Twilio / AWS SNS | 99.9% | Secondary SMS gateway fallback |
| **Payment Gateway** | Stripe / Razorpay | 99.95% | Asynchronous webhook queuing with idempotency |
`,
    },
  ];
}

export function generateRoadmapDocument(
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  const { metadata } = projectData;
  const title = metadata?.title || "System Architecture";

  return [
    {
      id: "roadmap-timeline",
      title: "1. Phased Architecture Delivery Roadmap",
      level: "common",
      phase: "Roadmap",
      contentMarkdown: `## 1. Phased Architecture Delivery Roadmap

\`\`\`mermaid
flowchart LR
    P1["Phase 1: Foundation (Weeks 1-4)<br/>Core Entities, Auth & DDL"]
    P2["Phase 2: MVP Core (Weeks 5-8)<br/>Business Flows & Ingress API"]
    P3["Phase 3: Hardening (Weeks 9-12)<br/>SecOps, Multi-AZ & Testing"]
    P4["Phase 4: Scale (Weeks 13+)<br/>Advanced Analytics & SLA Drills"]

    P1 --> P2 --> P3 --> P4
\`\`\`

### 1.1 Milestone Deliverables Breakdown
- **Sprint 1 - 2:** Database DDL migrations, container base images, and OAuth2 identity provider integration.
- **Sprint 3 - 4:** Core business transactional endpoints with idempotency keys and unit/integration test suites.
- **Sprint 5 - 6:** UI Client integration, Webhook handling, and Redis rate-limiting filters.
- **Sprint 7 - 8:** Production multi-AZ infrastructure provisioning, disaster recovery drills, and security sign-off.
`,
    },
    {
      id: "roadmap-milestones",
      title: "2. Architecture Milestones & Epics",
      level: "common",
      phase: "Roadmap",
      contentMarkdown: `## 2. Architecture Milestones & Epics

### 2.1 Major Epics
- **EPIC-1: Core Domain Service Implementation:** End-to-end CRUD and state validation.
- **EPIC-2: Data Pipeline & Analytics:** Asynchronous event publishing to warehouse.
- **EPIC-3: Production Readiness & Hardening:** Chaos engineering and disaster recovery drills.
`,
    },
    {
      id: "roadmap-resources",
      title: "3. Team & Resource Allocation",
      level: "common",
      phase: "Roadmap",
      contentMarkdown: `## 3. Team & Resource Allocation

| Role | Headcount | Primary Focus |
| :--- | :--- | :--- |
| **Principal Solutions Architect** | 1 | Architecture governance, ADR reviews |
| **Senior Backend Engineers** | 2 | Core business logic, APIs, and DB performance |
| **Frontend Engineer** | 1 | Client UX, state management, and real-time updates |
| **DevOps / Cloud Engineer** | 1 | Multi-AZ cloud infrastructure, CI/CD, and monitoring |
`,
    },
    {
      id: "roadmap-critical-path",
      title: "4. Critical Path & Contingency Buffers",
      level: "common",
      phase: "Roadmap",
      contentMarkdown: `## 4. Critical Path & Contingency Buffers

### 4.1 Critical Path Dependencies
1. Schema approval and DDL execution.
2. Authentication provider registration.
3. Payment gateway regulatory verification.
A two-week contingency buffer is reserved prior to general availability cutover.
`,
    },
  ];
}

/**
 * Dispatcher to generate sections for any requested DocumentType.
 */
export function generateDocumentByType(
  type: DocumentType,
  projectData: Omit<DesignDocProject, "documentSections">
): DocumentSection[] {
  switch (type) {
    case "overview":
      return generateOverviewDocument(projectData);
    case "brd":
      return generateBrdDocument(projectData);
    case "srs":
      return generateSrsDocument(projectData);
    case "hld":
      return generateHldDocument(projectData);
    case "lld":
      return generateLldDocument(projectData);
    case "sad":
      return generateSadDocument(projectData);
    case "database":
      return generateDatabaseDocument(projectData);
    case "api":
      return generateApiDocument(projectData);
    case "security":
      return generateSecurityDocument(projectData);
    case "deployment":
      return generateDeploymentDocument(projectData);
    case "runbook":
      return generateRunbookDocument(projectData);
    case "raid":
      return generateRaidDocument(projectData);
    case "roadmap":
      return generateRoadmapDocument(projectData);
    case "adrs":
    case "integration":
    case "cicd":
    case "testing":
    default:
      return generateStandardDocument(projectData, "hld");
  }
}

/**
 * Generate full coordinated set of DocumentItem objects.
 */
export function generateFullDocumentSet(
  projectData: Omit<DesignDocProject, "documentSections">,
  selectedTypes?: DocumentType[]
): DocumentItem[] {
  const typesToGenerate: DocumentType[] =
    selectedTypes && selectedTypes.length > 0
      ? selectedTypes
      : ["overview", "brd", "srs", "hld", "lld", "sad", "database", "api", "security", "deployment", "runbook", "raid", "roadmap"];

  const now = new Date().toISOString();

  return typesToGenerate.map((type) => {
    const title = getDocumentTitle(type);
    const sections = generateDocumentByType(type, projectData);

    return {
      id: `doc_${type}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: projectData.id,
      type,
      title,
      status: "draft",
      version: projectData.metadata.version || "1.0.0",
      sections,
      reviewComments: [
        {
          id: `cmt_${Math.random().toString(36).substring(2, 7)}`,
          author: "DocArch AI Assistant",
          role: "Architecture Governance Engine",
          comment: `Initial draft generated automatically aligned with ${projectData.recommendations.selectedPattern} pattern.`,
          createdAt: now,
        },
      ],
      lastModifiedBy: "DocArch AI",
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function getDocumentTitle(type: DocumentType): string {
  switch (type) {
    case "overview":
      return "Project Overview & Scope";
    case "brd":
      return "Business Requirements Document (BRD)";
    case "srs":
      return "Software Requirements Specification (SRS)";
    case "hld":
      return "High-Level Design (HLD)";
    case "lld":
      return "Low-Level Design (LLD)";
    case "sad":
      return "Solution Architecture Document (SAD)";
    case "adrs":
      return "Architecture Decision Records (ADRs)";
    case "database":
      return "Database Design Document";
    case "api":
      return "API Specification Document";
    case "integration":
      return "Integration Design Document";
    case "security":
      return "Security Architecture & Threat Model";
    case "deployment":
      return "Deployment Architecture";
    case "cicd":
      return "CI/CD Pipeline Design";
    case "testing":
      return "Testing Strategy & Quality Plan";
    case "runbook":
      return "Operational Runbook & SRE Manual";
    case "raid":
      return "RAID Log (Risks, Assumptions, Issues, Dependencies)";
    case "roadmap":
      return "Implementation Roadmap & Milestones";
    default:
      return "Technical Architecture Document";
  }
}

