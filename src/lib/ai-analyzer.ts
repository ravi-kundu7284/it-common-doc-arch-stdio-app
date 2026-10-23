import {
  AiRequirementAnalysis,
  AiClarifyingQuestion,
  DocumentType,
  DesignDocProject,
} from "@/types";

export const SAMPLE_USER_PROMPTS = [
  {
    id: "society-marketplace",
    title: "Residential Society E-Commerce",
    badge: "Community / Retail",
    prompt:
      "Build an e-commerce platform for a residential society where only verified society members can buy and sell products. Include user authentication, product listings, orders, payments, admin approval, notifications, and deployment on a cloud platform. Design the system for security, maintainability, scalability, and reasonable operating costs.",
  },
  {
    id: "fintech-payments",
    title: "Global FinTech Payment Gateway",
    badge: "FinTech / High-Scale",
    prompt:
      "Build a high-throughput, multi-currency payment gateway and reconciliation platform. Must handle 10,000 transactions per second with sub-50ms latency, strict idempotency, PCI-DSS Level 1 compliance, automated fraud detection, event-driven ledgering, and multi-region active-active disaster recovery.",
  },
  {
    id: "telehealth-ehr",
    title: "Telehealth & Clinical Records",
    badge: "HealthTech / HIPAA",
    prompt:
      "Design an enterprise telehealth and clinical consultation platform with real-time WebRTC video, encrypted patient messaging, HL7 FHIR v4 electronic health record integration, HIPAA/GDPR audit logging, prescription management, and zero-trust role-based access for physicians and patients.",
  },
  {
    id: "iot-fleet",
    title: "IoT Fleet Telemetry & Tracking",
    badge: "IoT / Edge",
    prompt:
      "Design a real-time IoT vehicle fleet telemetry ingestion engine processing 100,000 sensor pings/sec. Provide geofencing alerts, predictive maintenance analytics, time-series aggregation, automated cold-storage archiving, and offline-tolerant edge device sync.",
  },
];

export const ALL_CORE_DOCUMENT_TYPES: {
  type: DocumentType;
  title: string;
  category: "Strategy & Requirements" | "Architecture & Design" | "Engineering & Operations";
  description: string;
  isRecommendedDefault: boolean;
}[] = [
  {
    type: "overview",
    title: "Project Overview & Scope",
    category: "Strategy & Requirements",
    description: "Executive summary, strategic objectives, in/out-of-scope, and success KPIs.",
    isRecommendedDefault: true,
  },
  {
    type: "brd",
    title: "Business Requirements Document (BRD)",
    category: "Strategy & Requirements",
    description: "Business context, stakeholder needs, monetization/cost model, and business rules.",
    isRecommendedDefault: true,
  },
  {
    type: "srs",
    title: "Software Requirements Specification (SRS)",
    category: "Strategy & Requirements",
    description: "Detailed functional user stories, acceptance criteria, and non-functional SLAs.",
    isRecommendedDefault: true,
  },
  {
    type: "hld",
    title: "High-Level Design (HLD)",
    category: "Architecture & Design",
    description: "System context (C4 L1), container topology (C4 L2), subsystem boundaries, and macro resilience.",
    isRecommendedDefault: true,
  },
  {
    type: "lld",
    title: "Low-Level Design (LLD)",
    category: "Architecture & Design",
    description: "Component/class models (C4 L3), DDL schemas, API payload contracts, and concurrency locks.",
    isRecommendedDefault: true,
  },
  {
    type: "sad",
    title: "Solution Architecture Document (SAD)",
    category: "Architecture & Design",
    description: "Holistic end-to-end architecture blueprint, cross-cutting concerns, and buy-vs-build trade-offs.",
    isRecommendedDefault: true,
  },
  {
    type: "adrs",
    title: "Architecture Decision Records (ADRs)",
    category: "Architecture & Design",
    description: "MADR decision logs for database, pattern, auth, and communication style decisions.",
    isRecommendedDefault: true,
  },
  {
    type: "database",
    title: "Database Design Document",
    category: "Architecture & Design",
    description: "Entity-Relationship models, relational DDL, index strategies, partition keys, and backup schedules.",
    isRecommendedDefault: true,
  },
  {
    type: "api",
    title: "API Specification & Contract",
    category: "Architecture & Design",
    description: "RESTful / OpenAPI endpoints, request-response envelopes, rate-limits, and idempotency headers.",
    isRecommendedDefault: true,
  },
  {
    type: "integration",
    title: "Integration Design Document",
    category: "Architecture & Design",
    description: "Third-party gateways, webhook delivery semantics, message broker topics, and contract tests.",
    isRecommendedDefault: false,
  },
  {
    type: "security",
    title: "Security Architecture & Threat Model",
    category: "Architecture & Design",
    description: "STRIDE threat model, zero-trust network boundaries, OWASP controls, and cryptographic standards.",
    isRecommendedDefault: true,
  },
  {
    type: "deployment",
    title: "Deployment Architecture",
    category: "Engineering & Operations",
    description: "Multi-AZ cloud topology (AWS/GCP/Azure), VPC peering, ingress gateways, and auto-scaling pods.",
    isRecommendedDefault: true,
  },
  {
    type: "cicd",
    title: "CI/CD Pipeline & Release Design",
    category: "Engineering & Operations",
    description: "Automated test gates, SAST/DAST container scans, GitOps deployment, and canary rollback policies.",
    isRecommendedDefault: false,
  },
  {
    type: "testing",
    title: "Testing Strategy & Quality Plan",
    category: "Engineering & Operations",
    description: "Test pyramid distribution, load testing (k6/JMeter), contract testing, and regression criteria.",
    isRecommendedDefault: false,
  },
  {
    type: "runbook",
    title: "Operational Runbook & SRE Manual",
    category: "Engineering & Operations",
    description: "Telemetry alerting thresholds, on-call escalation matrix, failover SOPs, and incident drills.",
    isRecommendedDefault: true,
  },
  {
    type: "raid",
    title: "RAID Log (Risks, Assumptions, Issues, Dependencies)",
    category: "Strategy & Requirements",
    description: "Risk probability/impact matrix, documented architectural assumptions, and external dependencies.",
    isRecommendedDefault: true,
  },
  {
    type: "roadmap",
    title: "Implementation Roadmap & Milestones",
    category: "Engineering & Operations",
    description: "Phase 1 MVP to Phase 4 Enterprise Rollout, sprint work breakdown, and critical path analysis.",
    isRecommendedDefault: true,
  },
];

/**
 * Intelligent deterministic requirement analyzer.
 * Extracts structured architecture blueprints from free-form natural language prompts.
 */
export function analyzeRequirementText(prompt: string): AiRequirementAnalysis {
  const pLower = prompt.toLowerCase();

  // Detect domain
  let domain = "Enterprise Cloud Application";
  let projectName = "Cloud Architecture Platform";
  let recommendedPattern = "Modular Monolith";
  let recommendedStack = {
    frontend: "Next.js 14 / TypeScript (Tailwind CSS)",
    backend: "Node.js (NestJS / TypeScript) or Go",
    database: "PostgreSQL 16 (Relational with JSONB)",
    caching: "Redis 7 (In-Memory Session & Cache)",
    messaging: "RabbitMQ or AWS SQS",
    devops: "Docker, Kubernetes, GitHub Actions, Terraform",
  };

  let functionalRequirements: AiRequirementAnalysis["functionalRequirements"] = [];
  let clarifyingQuestions: AiClarifyingQuestion[] = [];
  let assumptions: string[] = [];
  let constraints: string[] = [];
  let dependencies: string[] = [];

  const nonFunctionalRequirements = {
    scalability: "Target 200 - 1,000 RPS peak with auto-scaling container replicas",
    availability: "99.9% uptime SLA with Multi-AZ redundancy",
    security: "Role-Based Access Control (RBAC), TLS 1.3, and AES-256-GCM encryption",
    performance: "p95 API response time < 200ms for read requests",
    cost: "Optimized serverless / container pricing with reserved cloud tiers",
    compliance: ["SOC2 Type II", "GDPR / Data Privacy"],
  };

  // Specific domain detection: Residential Society E-Commerce / Marketplace
  if (
    pLower.includes("society") ||
    (pLower.includes("residential") && pLower.includes("ecommerce")) ||
    pLower.includes("buy and sell")
  ) {
    projectName = "SocietyNest Community Marketplace";
    domain = "Community E-Commerce & Residential Services";
    recommendedPattern = "Modular Monolith (Optimized for Cost & Maintainability)";
    recommendedStack = {
      frontend: "Next.js 14 / TypeScript (React 18, Tailwind CSS, PWA)",
      backend: "Node.js / Express or NestJS (TypeScript)",
      database: "PostgreSQL 16 (Supabase managed with Row-Level Security)",
      caching: "Redis for session tokens and hot listing lookups",
      messaging: "Redis Pub/Sub & BullMQ for background job queues",
      devops: "Cloud Run / AWS App Runner, Cloudflare Edge CDN, Docker",
    };

    functionalRequirements = [
      {
        id: "FR-001",
        title: "Member Verification & Resident Onboarding",
        description:
          "Resident registration with verification against society flats/units via admin approval or utility proof upload before granting buying/selling privileges.",
        priority: "critical",
      },
      {
        id: "FR-002",
        title: "Product Catalog & Classified Listings",
        description:
          "Verified residents can create, edit, categorize (pre-owned, groceries, handmade, services), price, and upload images of items for sale within the society.",
        priority: "high",
      },
      {
        id: "FR-003",
        title: "Order Placement, Cart & Checkout",
        description:
          "Buyers can browse listings, communicate with sellers, add items to cart, select delivery/pickup time within the society gates, and initiate checkout.",
        priority: "high",
      },
      {
        id: "FR-004",
        title: "Integrated Payments & Escrow Settlement",
        description:
          "Secure digital payment gateway integration (UPI, cards, netbanking) with optional escrow hold until buyer confirms item receipt at doorstep.",
        priority: "critical",
      },
      {
        id: "FR-005",
        title: "RWA / Society Admin Portal & Moderation",
        description:
          "Administrative management dashboard for Resident Welfare Association (RWA) admins to approve member registrations, resolve disputes, and moderate banned items.",
        priority: "high",
      },
      {
        id: "FR-006",
        title: "Real-Time Push Notifications & In-App Alerts",
        description:
          "Push notifications, SMS, and WhatsApp alerts for new order requests, item approvals, payment receipts, and delivery confirmations.",
        priority: "medium",
      },
    ];

    clarifyingQuestions = [
      {
        id: "CQ-001",
        question: "How will resident verification be authenticated initially?",
        answer: "Initial manual verification by Society Management Committee / RWA Admin, with plans to integrate building management software (e.g. MyGate/NoBrokerHood) in Phase 2.",
        impact: "Determines whether an external third-party API integration is in scope for Phase 1.",
      },
      {
        id: "CQ-002",
        question: "Should payments be held in escrow until buyer confirms item receipt?",
        answer: "Yes, an automated escrow release policy (auto-release after 48 hours or upon buyer verification) is recommended to protect community trust.",
        impact: "Requires webhook reconciliation, payout scheduling, and dispute state machines.",
      },
      {
        id: "CQ-003",
        question: "What is the expected operating budget constraint for cloud infrastructure?",
        answer: "Low initial operating expenditure (< $100/month). Using managed serverless containers (Cloud Run) with serverless PostgreSQL (Supabase) to scale to zero when idle.",
        impact: "Recommends Modular Monolith over microservices to avoid cluster orchestration overhead.",
      },
    ];

    assumptions = [
      "All active buyers and sellers reside within the physical gated community.",
      "Delivery is primarily resident-to-resident pickup or local guard gate handover (no external freight carrier needed).",
      "Platform administrators are nominated members of the resident welfare association.",
    ];

    constraints = [
      "Operating costs must remain predictable and under $100/month at initial scale.",
      "Must operate with zero downtime during evening peak transaction hours (6 PM - 10 PM).",
      "Must adhere to local consumer privacy laws (GDPR / Digital Personal Data Protection).",
    ];

    dependencies = [
      "Third-party payment aggregator (Stripe / Razorpay) for KYC and settlement.",
      "Cloudflare CDN & SSL for DDoS mitigation and image caching.",
      "Twilio / Firebase Cloud Messaging for multi-channel push alerts.",
    ];

    nonFunctionalRequirements.scalability = "50 - 300 RPS during peak evening hours, supporting 2,000 - 10,000 resident households";
    nonFunctionalRequirements.availability = "99.9% uptime SLA";
    nonFunctionalRequirements.performance = "p95 page load < 1.5s, API responses < 120ms";
    nonFunctionalRequirements.cost = "< $100/month baseline using scale-to-zero serverless primitives";
  } else if (pLower.includes("payment") || pLower.includes("fintech") || pLower.includes("ledger")) {
    projectName = "ApexPay Global Transaction Gateway";
    domain = "FinTech & Real-Time Settlement";
    recommendedPattern = "Event-Driven Microservices with Distributed Ledger";
    recommendedStack = {
      frontend: "Next.js 14 / TypeScript (Financial Ops Portal)",
      backend: "Go (Golang) High-Throughput Engines & Java (Spring Boot) Ledger",
      database: "PostgreSQL 16 (Multi-AZ Primary) + CockroachDB (Distributed Transactions)",
      caching: "Redis Cluster (Distributed Locks & Idempotency Keys)",
      messaging: "Apache Kafka (Strict Partition Ordering)",
      devops: "EKS Kubernetes, Terraform, HashiCorp Vault, Datadog",
    };

    functionalRequirements = [
      {
        id: "FR-001",
        title: "Idempotent Transaction Ingestion",
        description: "Zero-duplicate payment instruction ingestion with cryptographically verified idempotency keys.",
        priority: "critical",
      },
      {
        id: "FR-002",
        title: "Double-Entry Accounting Ledger",
        description: "Immutable, append-only double-entry financial ledger guaranteeing absolute asset-liability balance.",
        priority: "critical",
      },
      {
        id: "FR-003",
        title: "Real-Time Fraud Scoring & Risk Rules",
        description: "Sub-20ms ML fraud scoring evaluation before dispatching authorization to acquiring banks.",
        priority: "high",
      },
      {
        id: "FR-004",
        title: "Automated Multi-Currency Settlement",
        description: "End-of-day clearing, batch netting, and foreign exchange settlement with partner banks.",
        priority: "high",
      },
    ];

    clarifyingQuestions = [
      {
        id: "CQ-001",
        question: "What is the target peak transactions per second (TPS)?",
        answer: "10,000 peak TPS with p99 latency < 50ms.",
        impact: "Necessitates Kafka partition scaling and in-memory Redis idempotency guards.",
      },
      {
        id: "CQ-002",
        question: "Is PCI-DSS Level 1 certification required for cardholder data?",
        answer: "Yes, card data will be tokenized at ingress using an isolated HSM/vault proxy.",
        impact: "Enforces strict network segmentation and hardware tokenization boundaries.",
      },
    ];

    assumptions = [
      "Acquiring networks support webhook status notifications.",
      "All outbound banking operations require mTLS with client certificate validation.",
    ];
    constraints = [
      "Zero data loss (RPO = 0) and automatic failover (RTO < 30 seconds).",
      "Strict compliance with PCI-DSS Level 1 and SOC2 Type II.",
    ];
    dependencies = [
      "Card Networks (Visa, Mastercard, Swift)",
      "Hardware Security Module (HSM) Cloud Vault",
    ];

    nonFunctionalRequirements.scalability = "10,000 peak TPS, auto-scaling up to 50,000 TPS during flash events";
    nonFunctionalRequirements.availability = "99.999% high-availability SLA";
    nonFunctionalRequirements.performance = "p99 authorization latency < 50ms";
    nonFunctionalRequirements.compliance = ["PCI-DSS Level 1", "SOC2 Type II", "ISO 27001"];
  } else {
    // General Enterprise Application
    projectName = prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Enterprise Cloud Platform";
    domain = "Cloud Enterprise Services";
    recommendedPattern = "Clean Hexagonal Architecture / Modular Services";

    functionalRequirements = [
      {
        id: "FR-001",
        title: "Secure Identity & Role-Based Access Control",
        description: "Multi-tenant authentication with OAuth2/OIDC, session tokens, and granular permission enforcement.",
        priority: "critical",
      },
      {
        id: "FR-002",
        title: "Core Domain Business Workflows",
        description: "Transactional business logic processing with strict data validation and state management.",
        priority: "high",
      },
      {
        id: "FR-003",
        title: "Asynchronous Notifications & Event Publishing",
        description: "Event-driven updates, background job processing, and outward integrations.",
        priority: "medium",
      },
      {
        id: "FR-004",
        title: "Administrative Governance & Audit Trail",
        description: "Centralized administration dashboard, system analytics, and tamper-evident audit logs.",
        priority: "high",
      },
    ];

    clarifyingQuestions = [
      {
        id: "CQ-001",
        question: "What is the expected initial and year-1 user concurrency scale?",
        answer: "Starting with 5,000 MAU and growing to 100,000 MAU over 12 months.",
        impact: "Enables starting with managed container services before moving to dedicated Kubernetes.",
      },
      {
        id: "CQ-002",
        question: "Which primary cloud provider aligns with existing organizational standards?",
        answer: "Cloud-agnostic container design deployable on AWS, GCP, or Microsoft Azure.",
        impact: "Standardizes on Docker containers, PostgreSQL, and OpenTelemetry.",
      },
    ];

    assumptions = [
      "Standard web and mobile clients connecting over HTTPS / REST / GraphQL.",
      "Relational data model with ACID transaction requirements for core entities.",
    ];
    constraints = [
      "Adhere to enterprise security standards and data encryption mandates.",
      "Linear horizontal scalability without architectural rewrites.",
    ];
    dependencies = [
      "Managed Cloud Ingress Gateway & WAF",
      "Managed Relational Database Service (RDS / Cloud SQL)",
    ];
  }

  // Pick recommended document types
  const selectedDocumentTypes: DocumentType[] = ALL_CORE_DOCUMENT_TYPES.filter(
    (d) => d.isRecommendedDefault
  ).map((d) => d.type);

  return {
    id: "analysis_" + Math.random().toString(36).substring(2, 9),
    userPrompt: prompt,
    projectName,
    domain,
    problemStatement: `The system aims to address the challenges outlined in the requirements: "${prompt.slice(0, 200)}...". It establishes a resilient, scalable, and secure technical architecture that optimizes operational cost while fulfilling all functional expectations.`,
    businessGoals: [
      `Deliver a reliable, production-ready ${domain} platform within predictable cost constraints.`,
      "Provide seamless, responsive user experience across both desktop and mobile clients.",
      "Guarantee enterprise-grade data security, regulatory compliance, and tamper-evident auditability.",
      "Enable rapid feature iteration through decoupled, well-documented architecture boundaries.",
    ],
    functionalRequirements,
    nonFunctionalRequirements,
    assumptions,
    constraints,
    dependencies,
    clarifyingQuestions,
    recommendedPattern,
    recommendedStack,
    selectedDocumentTypes,
  };
}

