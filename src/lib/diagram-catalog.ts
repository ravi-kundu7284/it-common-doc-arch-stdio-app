import { DiagramType, DiagramItem } from "@/types";

export interface DiagramTemplateDefinition {
  type: DiagramType;
  title: string;
  category: "Architecture" | "UML" | "Data & Integration" | "DevOps & Workflow";
  description: string;
  defaultMermaid: string;
  defaultVisualModel: {
    nodes: Array<{
      id: string;
      label: string;
      subtext?: string;
      x: number;
      y: number;
      style?: { shape?: any; backgroundColor?: string; borderColor?: string; textColor?: string };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

export const DIAGRAM_CATALOG: DiagramTemplateDefinition[] = [
  {
    type: "system_context",
    title: "C4 System Context Diagram",
    category: "Architecture",
    description: "High-level boundary map showing external actors, partner APIs, and core system scope.",
    defaultMermaid: `flowchart TD
    User["Client Users / Web & Mobile"]
    ExtPay["External Payment Gateway (Stripe/Adyen)"]
    ExtIDP["Enterprise Identity Provider (Okta/SAML)"]
    CoreSystem["DocArch Core Platform Scope"]
    Analytics["External Data Warehouse / Snowflake"]

    User -->|"HTTPS / TLS 1.3"| CoreSystem
    CoreSystem -->|"OAuth 2.0 / OIDC"| ExtIDP
    CoreSystem -->|"PCI Tokenized REST"| ExtPay
    CoreSystem -.->|"Kafka Event Stream"| Analytics`,
    defaultVisualModel: {
      nodes: [
        { id: "User", label: "Client Users", subtext: "Web & Mobile Ingress", x: 60, y: 120 },
        { id: "CoreSystem", label: "Core System Platform", subtext: "System Boundary Scope", x: 300, y: 120 },
        { id: "ExtPay", label: "Payment Gateway", subtext: "Third-party PCI Gateway", x: 560, y: 40 },
        { id: "ExtIDP", label: "Enterprise IDP", subtext: "OAuth2 / OIDC", x: 560, y: 140 },
        { id: "Analytics", label: "Data Warehouse", subtext: "Snowflake / BigQuery", x: 560, y: 240 },
      ],
      edges: [
        { id: "e1", source: "User", target: "CoreSystem", label: "HTTPS (TLS 1.3)" },
        { id: "e2", source: "CoreSystem", target: "ExtPay", label: "REST / mTLS" },
        { id: "e3", source: "CoreSystem", target: "ExtIDP", label: "OIDC Tokens" },
        { id: "e4", source: "CoreSystem", target: "Analytics", label: "CDC / Stream" },
      ],
    },
  },
  {
    type: "container",
    title: "C4 Container & Component Model",
    category: "Architecture",
    description: "Decomposes systems into applications, services, data stores, and communication protocols.",
    defaultMermaid: `flowchart LR
    Browser["SPA Client (Next.js)"]
    API_GW["API Gateway / Envoy Ingress"]
    Auth_Svc["Auth & Session Service"]
    Order_Svc["Order Processing Service"]
    Inventory_Svc["Inventory Service"]
    DB_Auth[("PostgreSQL (Auth DB)")]
    DB_Order[("PostgreSQL (Order DB)")]
    Redis_Cache[("Redis Distributed Cache")]

    Browser -->|"JSON / HTTPS"| API_GW
    API_GW -->|"gRPC"| Auth_Svc
    API_GW -->|"gRPC"| Order_Svc
    Order_Svc -->|"gRPC"| Inventory_Svc
    Auth_Svc --> DB_Auth
    Order_Svc --> DB_Order
    Order_Svc --> Redis_Cache`,
    defaultVisualModel: {
      nodes: [
        { id: "Browser", label: "Next.js SPA", subtext: "Client Web Ingress", x: 40, y: 120 },
        { id: "API_GW", label: "API Gateway", subtext: "Envoy / TLS Ingress", x: 220, y: 120 },
        { id: "Auth_Svc", label: "Auth Service", subtext: "Go / gRPC", x: 420, y: 40 },
        { id: "Order_Svc", label: "Order Service", subtext: "Node / TypeScript", x: 420, y: 180 },
        { id: "DB_Auth", label: "Auth Database", subtext: "PostgreSQL 16", x: 640, y: 40 },
        { id: "DB_Order", label: "Order Database", subtext: "Aurora Multi-AZ", x: 640, y: 180 },
      ],
      edges: [
        { id: "e1", source: "Browser", target: "API_GW", label: "HTTPS" },
        { id: "e2", source: "API_GW", target: "Auth_Svc", label: "gRPC" },
        { id: "e3", source: "API_GW", target: "Order_Svc", label: "gRPC" },
        { id: "e4", source: "Auth_Svc", target: "DB_Auth", label: "TCP:5432" },
        { id: "e5", source: "Order_Svc", target: "DB_Order", label: "TCP:5432" },
      ],
    },
  },
  {
    type: "cloud_deployment",
    title: "Multi-AZ Cloud Deployment Topology",
    category: "Architecture",
    description: "Physical cloud infrastructure topology spanning availability zones, VPCs, and subnets.",
    defaultMermaid: `graph TD
    subgraph Edge["Edge Layer (Cloudflare)"]
        WAF["WAF + DDoS Protection"]
        CDN["Edge Static Asset Cache"]
    end

    subgraph AWS_VPC["VPC (10.0.0.0/16)"]
        subgraph PublicSubnets["Public Subnets (Multi-AZ)"]
            ALB["Application Load Balancer (ALB)"]
            NAT["NAT Gateways"]
        end

        subgraph PrivateSubnets["Private Subnets (EKS Cluster)"]
            Pod1["Pod: App Ingress (AZ-A)"]
            Pod2["Pod: App Ingress (AZ-B)"]
        end

        subgraph IsolatedSubnets["Data Subnets (Multi-AZ)"]
            DB_Writer[("Aurora Primary Writer (AZ-A)")]
            DB_Reader[("Aurora Read Replica (AZ-B)")]
        end
    end

    WAF --> ALB
    ALB --> Pod1
    ALB --> Pod2
    Pod1 --> DB_Writer
    Pod2 --> DB_Writer
    DB_Writer -.->|"Async Replication"| DB_Reader`,
    defaultVisualModel: {
      nodes: [
        { id: "WAF", label: "Cloudflare Edge WAF", subtext: "Global Anycast", x: 50, y: 100 },
        { id: "ALB", label: "AWS ALB", subtext: "Multi-AZ Load Balancer", x: 260, y: 100 },
        { id: "Pod1", label: "EKS Pod (AZ-A)", subtext: "Auto-scaled Compute", x: 480, y: 40 },
        { id: "Pod2", label: "EKS Pod (AZ-B)", subtext: "Auto-scaled Compute", x: 480, y: 160 },
        { id: "DB_Writer", label: "Aurora Primary", subtext: "Multi-AZ Storage", x: 700, y: 100 },
      ],
      edges: [
        { id: "e1", source: "WAF", target: "ALB", label: "TLS 1.3" },
        { id: "e2", source: "ALB", target: "Pod1", label: "HTTP/2" },
        { id: "e3", source: "ALB", target: "Pod2", label: "HTTP/2" },
        { id: "e4", source: "Pod1", target: "DB_Writer", label: "Write" },
        { id: "e5", source: "Pod2", target: "DB_Writer", label: "Write" },
      ],
    },
  },
  {
    type: "network",
    title: "Network Trust Zones & Firewalls",
    category: "Architecture",
    description: "Network segmentation, DMZ, internal bastion hosts, and security groups.",
    defaultMermaid: `graph LR
    Internet((Public Internet)) --> IngressFW["Perimeter Firewall"]
    IngressFW --> DMZ["DMZ Subnet (Reverse Proxy)"]
    DMZ --> AppFW["Internal Security Group"]
    AppFW --> AppZone["App Tier (Private VPC)"]
    AppZone --> DBFW["Database Firewall Rule"]
    DBFW --> SecureZone["Isolated PCI Zone (HSM / DB)"]`,
    defaultVisualModel: {
      nodes: [
        { id: "Internet", label: "Internet", subtext: "Untrusted", x: 40, y: 100 },
        { id: "DMZ", label: "DMZ Subnet", subtext: "Nginx Reverse Proxy", x: 220, y: 100 },
        { id: "AppZone", label: "Application Zone", subtext: "No Public IP", x: 440, y: 100 },
        { id: "SecureZone", label: "PCI Secure Zone", subtext: "Encrypted HSM Tier", x: 660, y: 100 },
      ],
      edges: [
        { id: "e1", source: "Internet", target: "DMZ", label: "Port 443" },
        { id: "e2", source: "DMZ", target: "AppZone", label: "Internal mTLS" },
        { id: "e3", source: "AppZone", target: "SecureZone", label: "Strict ACL" },
      ],
    },
  },
  {
    type: "uml_class",
    title: "UML Class & Domain Model",
    category: "UML",
    description: "Domain-driven classes, inheritance, interfaces, and associations.",
    defaultMermaid: `classDiagram
    class IAggregateRoot {
        <<interface>>
        +getUncommittedEvents() List~DomainEvent~
        +markEventsAsCommitted() void
    }

    class Order {
        -UUID id
        -CustomerId customerId
        -OrderStatus status
        -Money totalAmount
        -List~OrderItem~ items
        +addItem(Product, quantity) void
        +submitOrder() Result
        +cancelOrder(reason) void
    }

    class OrderItem {
        -UUID productId
        -int quantity
        -Money unitPrice
        +calculateSubtotal() Money
    }

    class OrderStatus {
        <<enumeration>>
        DRAFT
        SUBMITTED
        PAID
        FULFILLED
        CANCELLED
    }

    IAggregateRoot <|.. Order
    Order *-- OrderItem
    Order --> OrderStatus`,
    defaultVisualModel: {
      nodes: [
        { id: "IAggregateRoot", label: "IAggregateRoot", subtext: "Interface", x: 60, y: 40 },
        { id: "Order", label: "Order Entity", subtext: "Aggregate Root", x: 60, y: 160 },
        { id: "OrderItem", label: "OrderItem", subtext: "Value Object", x: 300, y: 160 },
        { id: "OrderStatus", label: "OrderStatus", subtext: "Enum", x: 60, y: 300 },
      ],
      edges: [
        { id: "e1", source: "Order", target: "IAggregateRoot", label: "implements" },
        { id: "e2", source: "Order", target: "OrderItem", label: "1..*" },
        { id: "e3", source: "Order", target: "OrderStatus", label: "has state" },
      ],
    },
  },
  {
    type: "sequence",
    title: "Sequence Diagram & Interaction Flow",
    category: "UML",
    description: "Chronological message interactions between actors, services, and queues.",
    defaultMermaid: `sequenceDiagram
    autonumber
    actor User as Client App
    participant GW as API Gateway
    participant Svc as Order Service
    participant Cache as Redis Cache
    participant DB as Postgres Database
    participant Bus as Kafka Broker

    User->>GW: POST /api/v1/orders (Idempotency-Key: abc-123)
    GW->>Cache: Check idempotency key exists
    alt Key found (Duplicate Request)
        Cache-->>GW: Cached Response Payload
        GW-->>User: 200 OK (Idempotent replay)
    else Key not found
        GW->>Svc: Forward order command
        Svc->>DB: Begin Transaction & Insert Order
        DB-->>Svc: Commit OK
        Svc->>Bus: Publish ORDER_CREATED event
        Svc->>Cache: Store Idempotency-Key (TTL 24h)
        Svc-->>GW: 201 Created Payload
        GW-->>User: 201 Created
    end`,
    defaultVisualModel: {
      nodes: [
        { id: "User", label: "Client App", x: 50, y: 100 },
        { id: "GW", label: "API Gateway", x: 220, y: 100 },
        { id: "Svc", label: "Order Service", x: 400, y: 100 },
        { id: "DB", label: "PostgreSQL", x: 580, y: 100 },
      ],
      edges: [
        { id: "e1", source: "User", target: "GW", label: "1. POST /orders" },
        { id: "e2", source: "GW", target: "Svc", label: "2. Forward" },
        { id: "e3", source: "Svc", target: "DB", label: "3. Commit" },
      ],
    },
  },
  {
    type: "activity",
    title: "Activity & Process Flow Diagram",
    category: "UML",
    description: "Algorithmic decision workflows, parallel splits, joins, and error branches.",
    defaultMermaid: `flowchart TD
    Start([User Initiates Checkout]) --> ValidateInput{Valid Payload?}
    ValidateInput -- No --> Return400[Return 400 Bad Request]
    ValidateInput -- Yes --> CheckStock{Inventory Available?}
    CheckStock -- No --> Return409[Return 409 Out of Stock]
    CheckStock -- Yes --> ReserveStock[Reserve Inventory Hold]
    ReserveStock --> ProcessPayment{Payment Approved?}
    ProcessPayment -- Failed --> ReleaseStock[Compensate: Release Hold]
    ReleaseStock --> Return402[Return 402 Payment Declined]
    ProcessPayment -- Approved --> CommitOrder[Commit Order & Emit Event]
    CommitOrder --> SuccessEnd([201 Order Confirmation])`,
    defaultVisualModel: {
      nodes: [
        { id: "Start", label: "Start Checkout", x: 80, y: 40 },
        { id: "Validate", label: "Validate Payload", x: 80, y: 120 },
        { id: "Stock", label: "Check Inventory", x: 80, y: 200 },
        { id: "Payment", label: "Process Payment", x: 80, y: 280 },
        { id: "Success", label: "Order Created", x: 80, y: 360 },
      ],
      edges: [
        { id: "e1", source: "Start", target: "Validate" },
        { id: "e2", source: "Validate", target: "Stock", label: "Valid" },
        { id: "e3", source: "Stock", target: "Payment", label: "In Stock" },
        { id: "e4", source: "Payment", target: "Success", label: "Paid" },
      ],
    },
  },
  {
    type: "data_flow",
    title: "Data Flow Diagram (DFD Level 1)",
    category: "Data & Integration",
    description: "Flow of information between processes, data stores, and external entities.",
    defaultMermaid: `flowchart LR
    Customer([Customer])
    P1[[1.0 Authenticate & Validate]]
    P2[[2.0 Order Processing Engine]]
    P3[[3.0 Invoice Generation]]
    D1[(D1: User Credentials)]
    D2[(D2: Orders Database)]
    D3[(D3: Financial Ledger)]

    Customer -->|"Login Credentials"| P1
    P1 <-->|"Verify Salt/Hash"| D1
    P1 -->|"JWT Session Token"| Customer
    Customer -->|"Order Submission"| P2
    P2 <-->|"Check & Write State"| D2
    P2 -->|"Completed Order"| P3
    P3 -->|"Post Entry"| D3`,
    defaultVisualModel: {
      nodes: [
        { id: "Customer", label: "Customer Entity", x: 50, y: 100 },
        { id: "P1", label: "1.0 Auth Process", x: 250, y: 40 },
        { id: "P2", label: "2.0 Order Process", x: 250, y: 160 },
        { id: "D2", label: "D2 Orders DB", x: 500, y: 160 },
      ],
      edges: [
        { id: "e1", source: "Customer", target: "P1", label: "Credentials" },
        { id: "e2", source: "Customer", target: "P2", label: "Order" },
        { id: "e3", source: "P2", target: "D2", label: "Write" },
      ],
    },
  },
  {
    type: "erd",
    title: "Entity-Relationship Diagram (ERD)",
    category: "Data & Integration",
    description: "Relational database schema, keys, foreign references, and cardinality.",
    defaultMermaid: `erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ SESSIONS : establishes
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : referenced_in

    USERS {
        uuid id PK
        varchar email UK
        text password_hash
        timestamp created_at
    }
    ORDERS {
        uuid id PK
        uuid user_id FK
        numeric total_amount
        varchar status
        timestamp created_at
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        numeric unit_price
    }
    PRODUCTS {
        uuid id PK
        varchar sku UK
        varchar title
        numeric price
        int stock_level
    }`,
    defaultVisualModel: {
      nodes: [
        { id: "USERS", label: "USERS Table", subtext: "id, email, password_hash", x: 60, y: 80 },
        { id: "ORDERS", label: "ORDERS Table", subtext: "id, user_id, status, total", x: 320, y: 80 },
        { id: "ORDER_ITEMS", label: "ORDER_ITEMS Table", subtext: "id, order_id, product_id", x: 580, y: 80 },
      ],
      edges: [
        { id: "e1", source: "USERS", target: "ORDERS", label: "1 to Many" },
        { id: "e2", source: "ORDERS", target: "ORDER_ITEMS", label: "1 to Many" },
      ],
    },
  },
  {
    type: "bpmn_workflow",
    title: "BPMN Business Process Workflow",
    category: "DevOps & Workflow",
    description: "End-to-end business workflows with human approvals, task assignments, and timers.",
    defaultMermaid: `flowchart LR
    StartNode((Start)) --> FillReq[Architect Submits HLD]
    FillReq --> Review[Peer Review Assignment]
    Review --> LeadApproval{Lead Architect Approval?}
    LeadApproval -- Rejected --> ReviseReq[Architect Revises Sections]
    ReviseReq --> Review
    LeadApproval -- Approved --> SecurityCheck{Security Review Required?}
    SecurityCheck -- Yes --> SecApproval[CISO Sign-off Checkpoint]
    SecurityCheck -- No --> PublishDoc[Auto-Publish Architecture Blueprint]
    SecApproval --> PublishDoc
    PublishDoc --> EndNode(((Published)))`,
    defaultVisualModel: {
      nodes: [
        { id: "Start", label: "Start Request", x: 40, y: 100 },
        { id: "Review", label: "Peer Review", x: 220, y: 100 },
        { id: "Approval", label: "Lead Approval", x: 420, y: 100 },
        { id: "Publish", label: "Publish Blueprint", x: 640, y: 100 },
      ],
      edges: [
        { id: "e1", source: "Start", target: "Review" },
        { id: "e2", source: "Review", target: "Approval" },
        { id: "e3", source: "Approval", target: "Publish", label: "Approved" },
      ],
    },
  },
  {
    type: "cicd_pipeline",
    title: "CI/CD & GitOps Pipeline",
    category: "DevOps & Workflow",
    description: "Automated continuous integration, security scanning, container builds, and canary rollouts.",
    defaultMermaid: `flowchart LR
    GitPush((Git Commit)) --> LintTest[Lint & Unit Tests]
    LintTest --> SecScan[SAST & Dependabot Security Scan]
    SecScan --> BuildImage[Docker Build & Push to ECR]
    BuildImage --> DeployStaging[Canary Deploy Staging (10% Traffic)]
    DeployStaging --> HealthCheck{Synthetic Health Checks OK?}
    HealthCheck -- Fail --> AutoRollback[Automatic Canary Rollback]
    HealthCheck -- Pass --> PromoteProd[Promote to Production (100%)]
    PromoteProd --> Notify[Slack / PagerDuty Notification]`,
    defaultVisualModel: {
      nodes: [
        { id: "Git", label: "Git Commit", x: 40, y: 100 },
        { id: "Test", label: "Lint & Tests", x: 200, y: 100 },
        { id: "Security", label: "SAST Scan", x: 360, y: 100 },
        { id: "Build", label: "Docker Build", x: 520, y: 100 },
        { id: "Deploy", label: "Prod Deploy", x: 680, y: 100 },
      ],
      edges: [
        { id: "e1", source: "Git", target: "Test" },
        { id: "e2", source: "Test", target: "Security" },
        { id: "e3", source: "Security", target: "Build" },
        { id: "e4", source: "Build", target: "Deploy" },
      ],
    },
  },
  {
    type: "event_flow",
    title: "Integration & Event Streaming Flow",
    category: "Data & Integration",
    description: "Event-driven integration topologies, Kafka topics, consumers, and dead-letter queues.",
    defaultMermaid: `flowchart TD
    Producer1["Order API Service"] -->|"Emit ORDER_PLACED"| Topic_Orders[["Kafka Topic: orders.events"]]
    Producer2["Payment Gateway Webhook"] -->|"Emit PAYMENT_PROCESSED"| Topic_Payments[["Kafka Topic: payment.events"]]

    Topic_Orders --> Consumer_Fulfillment["Fulfillment Consumer Service"]
    Topic_Orders --> Consumer_Analytics["ClickHouse Analytics Consumer"]
    Topic_Payments --> Consumer_Fulfillment

    Consumer_Fulfillment -.->|"Poison Message / 3x Retries"| DLQ[["Dead Letter Queue (orders.dlq)"]]
    DLQ --> AlertSystem["OpsGenie Alert & Quarantine Inspection"]`,
    defaultVisualModel: {
      nodes: [
        { id: "Producer", label: "Order Service", subtext: "Event Producer", x: 50, y: 80 },
        { id: "Topic", label: "Kafka: orders.events", subtext: "Partitioned Topic", x: 280, y: 80 },
        { id: "Consumer", label: "Fulfillment Worker", subtext: "Consumer Group", x: 520, y: 80 },
        { id: "DLQ", label: "orders.dlq", subtext: "Dead Letter Queue", x: 740, y: 80 },
      ],
      edges: [
        { id: "e1", source: "Producer", target: "Topic", label: "Emit" },
        { id: "e2", source: "Topic", target: "Consumer", label: "Consume" },
        { id: "e3", source: "Consumer", target: "DLQ", label: "Fail (3x)" },
      ],
    },
  },
  {
    type: "state_machine",
    title: "State Machine Lifecycle",
    category: "UML",
    description: "Deterministic state transitions, guards, events, and terminal states.",
    defaultMermaid: `stateDiagram-v2
    [*] --> Draft : Create New Design
    Draft --> InReview : Submit for Evaluation
    InReview --> ChangesRequested : Reviewer Feedback
    ChangesRequested --> InReview : Re-submit Revisions
    InReview --> Approved : Architecture Lead Sign-off
    Approved --> Implementation : Engineering Hand-off
    Implementation --> Deprecated : System Sunset
    Deprecated --> [*]`,
    defaultVisualModel: {
      nodes: [
        { id: "Draft", label: "Draft", subtext: "Initial state", x: 60, y: 100 },
        { id: "InReview", label: "In Review", subtext: "Peer review", x: 260, y: 100 },
        { id: "Approved", label: "Approved", subtext: "Lead sign-off", x: 460, y: 100 },
        { id: "Deprecated", label: "Deprecated", subtext: "Sunset", x: 660, y: 100 },
      ],
      edges: [
        { id: "e1", source: "Draft", target: "InReview", label: "Submit" },
        { id: "e2", source: "InReview", target: "Approved", label: "Approve" },
        { id: "e3", source: "Approved", target: "Deprecated", label: "Retire" },
      ],
    },
  },
];

export function getDiagramTemplate(type: DiagramType): DiagramTemplateDefinition {
  return DIAGRAM_CATALOG.find((d) => d.type === type) || DIAGRAM_CATALOG[0];
}

