import { DesignDocProject, PresetTemplate, ArchitecturePatternInfo } from "@/types";

export const ARCHITECTURE_PATTERNS: ArchitecturePatternInfo[] = [
  {
    id: "event-driven-microservices",
    name: "Event-Driven Microservices",
    badge: "Distributed & Scalable",
    tagline: "Decoupled domain services communicating asynchronously via durable event buses.",
    description:
      "Decomposes system into autonomous, independently deployable bounded contexts. State transitions are published as domain events, allowing asynchronous parallel consumers and extreme fault tolerance.",
    pros: [
      "Independent team velocity & continuous deployment",
      "High horizontal scalability & decoupled fault domains",
      "Event auditability and replayability",
    ],
    cons: [
      "Eventual consistency complexity (saga orchestrations)",
      "High observability & operational overhead (distributed tracing)",
      "Network latency overhead across service boundaries",
    ],
    idealFor: ["Complex domains", "Large engineering teams", "High-throughput asynchronous workloads"],
    recommendedScale: "10,000+ RPS / 1M+ MAU",
  },
  {
    id: "modular-monolith",
    name: "Modular Monolith",
    badge: "Cost-Effective & Pragmatic",
    tagline: "Single deployable unit with strictly enforced in-process domain module boundaries.",
    description:
      "Combines the development simplicity, atomic transactions, and zero-network overhead of a monolith with the clean architectural separation of microservices. Can be decomposed into microservices later if necessary.",
    pros: [
      "Zero network latency between domain modules",
      "Single CI/CD pipeline and single deployment artifact",
      "ACID transactions without distributed two-phase commits",
      "Low cloud operational cost",
    ],
    cons: [
      "Must scale the entire codebase homogeneously",
      "Shared database can risk accidental cross-module table joins if not policed",
      "Longer single-binary compilation times as code grows",
    ],
    idealFor: ["Early-to-growth stage startups", "Small to medium teams", "Applications with tight data consistency needs"],
    recommendedScale: "< 10,000 RPS / High single-team velocity",
  },
  {
    id: "cqrs-event-sourcing",
    name: "CQRS + Event Sourcing",
    badge: "High Audit & Financial Grade",
    tagline: "Segregates Read and Write models; persists domain events as the single source of truth.",
    description:
      "All state changes are stored as an immutable append-only sequence of domain events. Read models (projections) are asynchronously or synchronously derived to optimize specific query patterns.",
    pros: [
      "Complete historical audit log built-in with zero data loss",
      "Independent optimization of read and write storage engines",
      "Ability to project new views retroactively from inception",
    ],
    cons: [
      "Steep learning curve for developers",
      "Event schema migration/versioning is complex",
      "Eventual consistency between write log and read projections",
    ],
    idealFor: ["FinTech & Ledgers", "Order management systems", "Compliance-heavy auditable records"],
    recommendedScale: "Any scale where auditability and complex reads dominate",
  },
  {
    id: "hexagonal-architecture",
    name: "Hexagonal (Ports & Adapters)",
    badge: "Core Domain Isolation",
    tagline: "Pure domain logic decoupled from frameworks, databases, and external I/O protocols.",
    description:
      "The application core (entities, business rules, use cases) is shielded from external dependencies. External actors (APIs, databases, message brokers) interact through clearly typed ports and adapters.",
    pros: [
      "Extremely testable without live databases or mocks",
      "Framework-agnostic; easy to swap ORMs, web frameworks, or drivers",
      "Clean separation of business invariants from transport protocols",
    ],
    cons: [
      "Boilerplate mapping between domain models and DTOs/database entities",
      "Can feel overly verbose for simple CRUD operations",
    ],
    idealFor: ["Enterprise core domains", "Long-lifecycle software", "Mission-critical business logic"],
    recommendedScale: "Mid-to-enterprise engineering projects",
  },
  {
    id: "jamstack-edge",
    name: "Jamstack & Edge Compute",
    badge: "Ultra Low Latency",
    tagline: "Pre-rendered static assets distributed globally with Edge computing and serverless APIs.",
    description:
      "Static generation (SSG) and incremental static regeneration (ISR) hosted on edge CDNs. Dynamic logic is delegated to lightweight edge functions running close to end-users with global databases.",
    pros: [
      "Sub-50ms TTFB worldwide via edge CDN caching",
      "High reliability during traffic spikes (static CDN layer)",
      "Zero server maintenance and low infrastructure cost",
    ],
    cons: [
      "Build times scale with content volume",
      "Edge runtime limitations (restricted Node.js APIs, memory limits)",
      "Complex cache invalidation strategies required",
    ],
    idealFor: ["Content platforms", "Marketing sites", "E-commerce storefronts", "Global consumer apps"],
    recommendedScale: "Global distributed user bases, read-heavy workloads",
  },
];

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "fintech-payment-ledger",
    title: "FinTech Real-time Payment & Ledger System",
    domain: "FinTech & Payments",
    badgeColor: "emerald",
    iconName: "CreditCard",
    description:
      "High-throughput, double-entry financial ledger with multi-region high availability, idempotent transactions, and PCI-DSS compliance.",
    requirements: {
      domain: "FinTech",
      targetScale: {
        rps: 12000,
        users: "5,000,000 MAU",
        dataRetention: "7 Years (PCI-DSS & Financial Regulatory Auditing)",
      },
      functionalRequirements: [
        "Card payment authorization, capture, and settlement via Visa/Mastercard/Stripe gateways",
        "Immutable double-entry ledger tracking debits and credits with zero rounding errors",
        "Multi-currency wallet accounts with real-time balance calculations",
        "Idempotent API key authorization for payment intents and transaction rollbacks",
        "Real-time fraud scoring and webhook event notification dispatcher",
      ],
      nonFunctionalRequirements: {
        latency: "p99 < 120ms for authorization, p99 < 250ms for settlement",
        availability: "99.999% SLA (Five Nines, < 5.26 mins downtime/year)",
        compliance: ["PCI-DSS Level 1", "SOC2 Type II", "GDPR", "ISO 27001"],
      },
      constraints: [
        "Zero data loss allowed for committed transactions (strict RPO=0)",
        "Must support automated disaster recovery failover (RTO < 30s)",
        "Hardware security modules (HSM) or KMS envelope encryption for card PANs",
      ],
    },
    recommendations: {
      selectedPattern: "CQRS + Event Sourcing",
      patternAlternatives: [
        {
          pattern: "CRUD Modular Monolith",
          reasonNotChosen: "Lacks native immutable append-only event auditing; high risk of non-auditable database updates during ledger disputes.",
        },
        {
          pattern: "Choreographed Microservices",
          reasonNotChosen: "Cross-service eventual consistency creates window for double-spending before ledger sync completes.",
        },
      ],
      stack: {
        frontend: "Next.js 14, Tailwind CSS, TypeScript (Internal Admin & Merchant Portal)",
        backend: "Go (Golang) / Rust microservices with gRPC for internal RPC and Gin for external REST",
        database: "CockroachDB / PostgreSQL with Serializable isolation and TimescaleDB for audit telemetry",
        caching: "Redis Cluster with Redis Sentinel (Idempotency keys & rate-limiting)",
        messaging: "Apache Kafka (multi-broker partitioned event streams with schema registry)",
        devops: "Kubernetes (EKS), Terraform, Datadog APM, OpenTelemetry, AWS KMS",
      },
    },
  },
  {
    id: "ecommerce-flash-sale",
    title: "High-Throughput Global E-Commerce & Flash Sale",
    domain: "E-Commerce & Retail",
    badgeColor: "indigo",
    iconName: "ShoppingCart",
    description:
      "Omnichannel retail engine engineered for massive flash sale traffic spikes, atomic inventory reservations, and low-latency product catalog search.",
    requirements: {
      domain: "E-Commerce",
      targetScale: {
        rps: 35000,
        users: "20,000,000 MAU",
        dataRetention: "5 Years historical order records, 90 days active telemetry",
      },
      functionalRequirements: [
        "Product catalog with faceted search, instant autocomplete, and dynamic pricing",
        "Flash sale virtual waiting room and atomic inventory reservation with TTL expiration",
        "Cart checkout, coupon calculation engine, and automated payment gateway routing",
        "Order lifecycle state machine (Created -> Paid -> Fulfilled -> Shipped -> Delivered)",
        "Omnichannel push/email/SMS notification engine via async workers",
      ],
      nonFunctionalRequirements: {
        latency: "p99 < 80ms for catalog browsing, p99 < 300ms for checkout reservation",
        availability: "99.99% during standard operations, zero crash during 10x traffic spikes",
        compliance: ["GDPR", "CCPA", "PCI-DSS Level 2"],
      },
      constraints: [
        "Cloud auto-scaling must respond within 60 seconds to traffic surges",
        "Over-selling inventory is strictly unacceptable; inventory decrements must be atomic",
        "Cost optimization during non-peak hours via serverless elastic compute",
      ],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      patternAlternatives: [
        {
          pattern: "Monolithic Architecture",
          reasonNotChosen: "Checkout bottlenecks entire catalog browsing during flash-sales; impossible to scale inventory independently.",
        },
        {
          pattern: "Serverless Jamstack only",
          reasonNotChosen: "Cold starts and database connection pooling limitations hinder 35k RPS concurrent inventory locks.",
        },
      ],
      stack: {
        frontend: "Next.js App Router (ISR/SSG for product pages), Edge CDN Caching",
        backend: "Node.js (NestJS) for Gateway & Services, Go for high-concurrency Inventory Lock worker",
        database: "PostgreSQL (Aurora Serverless) for Orders, MongoDB for Product Catalog, Elasticsearch for Search",
        caching: "Redis Enterprise Cluster (Atomic Lua scripts for inventory decrements)",
        messaging: "AWS SQS/SNS + Apache Kafka for order processing pipeline",
        devops: "Docker, AWS ECS Fargate / EKS, Cloudflare Enterprise CDN, Prometheus & Grafana",
      },
    },
  },
  {
    id: "healthcare-telehealth",
    title: "HIPAA-Compliant Telehealth & EHR Records Platform",
    domain: "Healthcare & Life Sciences",
    badgeColor: "cyan",
    iconName: "Activity",
    description:
      "Secure real-time telemedicine consultation platform with electronic health records (EHR) integration, HL7 FHIR compliance, and strict encryption.",
    requirements: {
      domain: "Healthcare",
      targetScale: {
        rps: 2500,
        users: "1,200,000 Patients & Clinicians",
        dataRetention: "10 Years (HIPAA & Medical Board records retention mandates)",
      },
      functionalRequirements: [
        "Encrypted WebRTC HD audio/video consultation with doctor clinical note-taking",
        "Patient electronic health records (EHR) timeline, lab reports, and medication histories",
        "E-Prescription dispatch to national pharmacy networks (Surescripts / FHIR standards)",
        "Appointment scheduling with calendar sync and SMS/email confirmation alerts",
        "Role-Based Access Control (RBAC) with Break-Glass emergency access logging",
      ],
      nonFunctionalRequirements: {
        latency: "Video latency < 150ms round-trip; API responses p95 < 200ms",
        availability: "99.95% uptime SLA",
        compliance: ["HIPAA Security & Privacy Rule", "HITECH", "HL7 FHIR v4", "SOC2 Type II"],
      },
      constraints: [
        "All Protected Health Information (PHI) encrypted at rest (AES-256) and in transit (TLS 1.3)",
        "Zero PHI data stored in unencrypted memory caches or plain-text application logs",
        "Strict BAA (Business Associate Agreement) required for all cloud infrastructure providers",
      ],
    },
    recommendations: {
      selectedPattern: "Hexagonal (Ports & Adapters)",
      patternAlternatives: [
        {
          pattern: "Direct ORM Monolith",
          reasonNotChosen: "Ties compliance business rules to database drivers, making certified independent audit testing extremely difficult.",
        },
        {
          pattern: "Choreographed Event Sourcing",
          reasonNotChosen: "Overly complex for regulatory compliance where clear point-in-time snapshot verification is prioritized by auditors.",
        },
      ],
      stack: {
        frontend: "React / Next.js with WebRTC LiveKit client, Tailwind CSS, Encrypted Local State",
        backend: "Python (FastAPI) or TypeScript (Node.js) with Hexagonal architecture and FHIR validator",
        database: "PostgreSQL with Row-Level Security (RLS) & AWS S3 with Client-Side Envelope Encryption",
        caching: "Encrypted Redis (Session management & ephemeral WebRTC room signalling)",
        messaging: "RabbitMQ / AWS SQS for asynchronous report generation and e-prescriptions",
        devops: "AWS GovCloud or HIPAA-compliant VPC, AWS KMS, CloudTrail, Splunk SIEM",
      },
    },
  },
  {
    id: "iot-telemetry-fleet",
    title: "IoT Fleet Telemetry & Predictive Maintenance",
    domain: "IoT & Logistics",
    badgeColor: "amber",
    iconName: "Cpu",
    description:
      "Ingestion and analytics pipeline processing high-frequency sensor streams from 500,000+ connected vehicles for anomaly detection and route optimization.",
    requirements: {
      domain: "IoT & Automotive",
      targetScale: {
        rps: 50000,
        users: "500,000 Connected Devices",
        dataRetention: "1 Year raw time-series data, 5 Years aggregated summaries",
      },
      functionalRequirements: [
        "High-frequency GPS, battery temperature, tire pressure, and engine telemetry ingestion",
        "Real-time geofencing and instant alert triggering for threshold violations",
        "Predictive maintenance machine learning model inferencing for component wear",
        "Over-The-Air (OTA) firmware update orchestration and campaign verification",
        "Interactive fleet operations map dashboard with historical breadcrumb replays",
      ],
      nonFunctionalRequirements: {
        latency: "Ingestion pipeline p99 < 50ms, alert dispatch < 1.5 seconds",
        availability: "99.99% ingestion pipeline uptime",
        compliance: ["ISO 26262 (Automotive Safety)", "GDPR for GPS driver privacy", "SOC2"],
      },
      constraints: [
        "High write-to-read ratio (98% writes, 2% reads)",
        "Edge devices have intermittent network connectivity; ingestion must handle bulk backlog bursts",
        "Storage cost efficiency for petabyte-scale sensor telemetry",
      ],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      patternAlternatives: [
        {
          pattern: "Relational Monolith",
          reasonNotChosen: "Standard RDBMS cannot sustain 50,000 write operations per second without catastrophic IOPS costs and locking bottlenecks.",
        },
        {
          pattern: "Jamstack",
          reasonNotChosen: "Completely unsuitable for persistent MQTT connections and petabyte-scale write ingestion streams.",
        },
      ],
      stack: {
        frontend: "Next.js, Deck.gl / Mapbox GL for hardware-accelerated fleet visualization",
        backend: "EMQX MQTT Broker -> Rust / Go ingestion workers -> Kafka pipeline",
        database: "ClickHouse or TimescaleDB for time-series data; PostgreSQL for fleet metadata",
        caching: "Redis (Current device state & last known GPS coordinates)",
        messaging: "Apache Kafka (dedicated high-throughput partitioned topics)",
        devops: "Kubernetes, Grafana Mimir & Loki, Terraform, AWS IoT Core or EMQX Cloud",
      },
    },
  },
];
