# Changelog

All notable changes to the **IT Common Documentation & Architecture Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-10-23

### End-to-End AI User Journey & Multi-Document Architecture Studio

This release completes the primary user journey: **Natural-language idea intake → AI requirement analysis & synthesis → Coordinated 17-document generation → Three-panel review and non-destructive editing → Document lifecycle governance → Multi-format and project package export.**

#### Added
- **Natural Language Idea Intake:**
  - Free-form natural-language prompt intake supporting arbitrary ideas, specifications, or pasted briefs (e.g., residential society e-commerce, global fintech payment gateways, telehealth platforms, IoT fleet tracking).
  - One-click industry preset chips for instant experimentation.
- **AI Requirements Analysis & Synthesis:**
  - Automated extraction of business problem statement, strategic objectives, functional requirements (FR-001..FR-00n), and quantitative non-functional SLAs.
  - Interactive clarifying questions with documented architectural assumptions and impact analysis.
  - Interactive requirements editor (Add, Edit, Remove, Prioritize).
  - Configurable 17-document generation checklist with category grouping and recommended defaults.
- **17 Core Technical Architecture Documents:**
  - Project Overview & Scope, Business Requirements Document (BRD), Software Requirements Specification (SRS), High-Level Design (HLD), Low-Level Design (LLD), Solution Architecture Document (SAD), Architecture Decision Records (ADRs), Database Design Document (DDL & ERD), API Specification, Integration Design Document, Security Architecture & STRIDE Threat Model, Deployment Architecture, CI/CD Pipeline Design, Testing Strategy & Quality Plan, Operational Runbook & SRE Manual, RAID Log (Risks, Assumptions, Issues, Dependencies), Implementation Roadmap & Milestones.
- **Three-Panel Document Workspace Layout:**
  - **Left Panel (Workspace Navigator):** Document switcher for all generated documents, lifecycle status badge, search bar, and reorderable/lockable sections list.
  - **Center Panel (Editor & Live Preview):** Split, Preview, and Editor views with real-time Mermaid vector rendering, syntax highlighting, and section-level locking.
  - **Right Panel (Contextual AI Assistant & Governance Inspector):**
    - 9 Contextual AI Transformation chips ("Simplify for non-technical stakeholders", "Improve scalability & cost", "Convert to modular monolith", "Add failure handling & retries", "Add security controls", "Generate sequence diagram", "Compare databases", etc.).
    - Side-by-side Visual Diff modal (`diffModal`) before applying changes.
    - Document Lifecycle State selector (`Draft` → `In Review` → `Changes Requested` → `Approved` → `Published` → `Archived`).
    - Review notes and comments timeline with author and role sign-offs.
    - Document metrics inspector (word count, reading time, section counts).
- **Multi-File Project Package Export:**
  - One-click download of the complete documentation package (`README.md` manifest, individual markdown and HTML documents, structured JSON and YAML architecture specifications).
  - Print / Save as PDF support with print-optimized CSS layout.
- **Automated Verification:**
  - 23/23 tests passing across 7 automated test suites.
  - TypeScript compiles with 0 errors and Next.js production build succeeds across all 28 routes.

---

## [2.0.0] - 2026-10-23

### Major Architecture Studio Upgrade

This release represents a transformative upgrade from the initial prototype into an enterprise-ready **IT Architecture & Documentation Studio** supporting architects, tech leads, DevOps engineers, and product teams across the entire architecture lifecycle.

### Added

#### 1. Dual-Level Document Studio & Non-Destructive Editing
- **High-Level Design (HLD) & Low-Level Design (LLD):** Full support for distinct architectural abstraction levels. HLD focuses on C4 topologies, business context, and cloud components; LLD focuses on classes, database schemas, API payload contracts, and resilience algorithms.
- **Section Locking Invariant:** Sections can be locked by the user (`isLocked`), ensuring manual edits are 100% preserved during automated AI alignment or template regeneration.
- **AI Visual Diff Modal:** Before applying AI-generated section refinements, architects can inspect a side-by-side comparison (`Original` vs `AI Proposed`) with Accept and Discard controls.
- **Milestone Revisions & Snapshots:** Capture named project states (e.g., "Pre-CAB Baseline") and restore previous versions on demand.
- **Multi-Format Export Engine:** One-click exports to Microsoft Word (.doc), Standalone HTML bundle, GitHub-flavored Markdown (.md), Structured YAML (.yaml), and Structured JSON (.json).

#### 2. Interactive Diagram Designer (13 Diagram Types)
- **Hybrid Visual + Vector Canvas:** Real-time bi-directional synchronization between an interactive drag-and-drop node canvas and Mermaid.js vector code.
- **Full 13 Diagram Types Supported:**
  1. System Context Diagram (C4 L1)
  2. Container & Component Diagram (C4 L2/3)
  3. Deployment & Cloud Architecture (Multi-AZ AWS/GCP/Azure)
  4. Network & Infrastructure Diagram (VPC, Subnets, Firewalls)
  5. UML Class Diagram (Domain entities, interfaces, aggregates)
  6. Sequence Diagram (Numbered calls, asynchronous events)
  7. Activity Diagram (Decision diamonds, parallel forks)
  8. Data Flow Diagram (DFD Level 1)
  9. Entity-Relationship Diagram (ERD with Crow's foot notation)
  10. BPMN-Style Business Workflow (Tasks, Gateways, Events)
  11. CI/CD Pipeline Diagram (Lint, Test, Scan, Deploy)
  12. Integration & Event-Flow Diagram (Kafka, EventBridge, DLQ)
  13. State Machine Diagram (State guards, timeouts, terminal states)
- **1-Click Document Embedding:** Inject active diagrams directly into document sections.

#### 3. Architecture Workflow Designer
- **Modeling vs Execution Separation:** Enterprise-safe visual process designer for operational pipelines (failovers, deployments, change approvals) without running arbitrary server code.
- **DAG Validation Engine:** Validates triggers, reaches terminal nodes, catches cycles, and identifies orphan steps.
- **Simulation Trace:** Deterministic step-by-step traversal with accumulated latency and retry simulation.

#### 4. Requirements Registry & Change-Impact Engine
- **Categorized Requirements:** Business (BR), Functional (FR), and Non-Functional (NFR) requirements with MoSCoW prioritization.
- **Change-Impact Analysis:** Automated detection of affected document sections and diagrams when requirements change, accompanied by concrete proposed markdown patches.
- **Traceability Matrix:** Real-time bi-directional matrix linking requirements to document sections, diagrams, and ADRs.

#### 5. ADR Governance Manager
- **MADR Standard Decisions:** Context, options considered, decisions, trade-offs, and compliance tags.
- **Supersession Lifecycle:** Formal linking when decisions are superseded by newer architectural standards.

#### 6. Architecture Quality Review & Audit Engine
- **Deterministic Static Audit:** 10 core checks evaluating Single Points of Failure (SPOF), encryption in transit/rest, financial idempotency, dead letter queues (DLQs), exponential backoff jitter, and RTO/RPO definitions.
- **Architecture Score:** Quantitative rating (0-100) with severity breakdown (Critical, High, Medium, Low).
- **1-Click Patch Injection:** One-click insertion of recommended remediations into document sections.

#### 7. Persistence & Data Tier
- **Liquibase Migration `008-create-architecture-artifacts.sql`:** 9 new tables (`projects`, `document_sections`, `document_revisions`, `diagrams`, `workflows`, `requirements`, `requirement_trace_links`, `adrs`, `architecture_reviews`) with Row-Level Security.
- **LocalSandboxDatabase:** Zero-config in-memory persistence with `localStorage` synchronization for 100% offline functionality.

#### 8. Automated Test Suite & Documentation
- **6 Test Suites with 20 Automated Tests (`tests/`):** Tested via custom fast TypeScript loader (`scripts/ts-loader.mjs`) without external test runners.
- **Comprehensive Documentation Suite (`docs/`):**
  - `docs/UPGRADE_ASSESSMENT.md`: Initial audit and migration roadmap.
  - `docs/ARCHITECTURE.md`: High-level system architecture and subsystem design.
  - `docs/HLD_TEMPLATE.md`: Reusable enterprise High-Level Design template.
  - `docs/LLD_TEMPLATE.md`: Reusable enterprise Low-Level Design template.
  - `docs/AI_FEATURES.md`: Provider configuration, prompt safety, and local synthesis fallback.
  - `docs/DIAGRAMS_AND_WORKFLOWS.md`: Diagram catalog and workflow engine guide.
  - `docs/API.md`: Full OpenAPI REST specification.
  - `docs/SECURITY.md`: Threat model, credential hashing, RLS, and privacy.
  - `docs/DEVELOPMENT.md`: Developer quickstart, environment variables, and extension guide.
  - `docs/DEPLOYMENT.md`: Production deployment with Docker, Kubernetes, and Liquibase.

### Changed
- Refactored Navigation Bar with direct switcher between Studio, Intake Wizard, Diagram Designer, Workflow Designer, Requirements Traceability, ADR Manager, and Quality Audit.
- Updated Next.js configuration to streamline production builds and eliminate Windows-specific directory collisions.
- Preserved PBKDF2 authentication, intake wizards, and responsive Tailwind styling.

