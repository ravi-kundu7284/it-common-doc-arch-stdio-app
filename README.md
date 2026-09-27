# DocArch AI 🏛️
### AI-Powered Software Architecture & Technical Design Document (LLD / HLD) Studio

**DocArch AI** is a responsive, modern web application engineered to standardize and accelerate enterprise software architecture workflows. It guides engineering teams through structured requirements intake, conducts automated trade-off analysis, intelligently recommends architecture patterns and tech stacks, and compiles everything into production-grade HTML design documents featuring interactive Mermaid.js diagrams.

---

## 🚀 Key Modules & System Workflow

### 1. Module A: Guided Requirements Intake Wizard
- **Project Basics:** System title, domain (FinTech, E-Commerce, Healthcare, IoT, SaaS), audience, and target scale (RPS, active users, data retention lifecycle).
- **Core Capabilities:** Functional requirements journey builder, non-functional latency budgets (p95/p99 SLAs), availability targets (e.g., 99.999%), and regulatory compliance tags (PCI-DSS, SOC2, HIPAA, GDPR, ISO 27001, FedRAMP).
- **Operational Constraints:** Multi-cloud / on-premise topology, infrastructure budget limits, and legacy system anti-corruption layers.
- **1-Click Presets:** Instant loading of battle-tested industry architectures (FinTech Payment Clearinghouse, Flash Sale E-Commerce, HIPAA Telehealth, IoT Telemetry Pipeline).

### 2. Module B: AI Architecture & Tech Stack Recommender
- **Pattern Synthesis:** Real-time trade-off evaluation comparing candidate architectural styles:
  - *Event-Driven Microservices*
  - *Modular Monolith*
  - *CQRS + Event Sourcing*
  - *Hexagonal (Ports & Adapters)*
  - *Jamstack & Edge Compute*
- **Technology Layer Customizer:** Curated selections and custom overrides across 6 infrastructure layers:
  1. Frontend / Client Ingress
  2. Backend Runtime & RPC (gRPC / REST)
  3. Primary Database Tier (SQL, Distributed SQL, NoSQL, Time-series)
  4. Caching & Fast State Layer
  5. Message Broker & Event Streaming
  6. Observability, IaC & DevOps
- **Locking Mechanism:** Lock specific choices before proceeding to full document generation.

### 3. Module C: Standardized Design Document Generator
Enforces standard industry technical design sections with live reordering:
1. **Executive Summary & Scope** (Context, Problem Statement, Business Goals, Explicit Non-Goals)
2. **Architecture Overview** (C4 System Context & Container diagrams in Mermaid.js)
3. **Component & Service Design** (Low-Level Design, Service Responsibilities, API Contracts)
4. **Data Modeling & Storage** (Entity Relationship diagrams, Indexing, Partition Keys, Caching TTL)
5. **Key Workflows & Sequence Diagrams** (Step-by-step lifecycles with Mermaid `sequenceDiagram`)
6. **Cross-Cutting Concerns** (AuthN/AuthZ, KMS Encryption, OpenTelemetry 3-pillar observability, Circuit Breakers)
7. **Infrastructure & Deployment** (Multi-AZ cloud topology in Mermaid, CI/CD pipeline, RPO/RTO disaster recovery)
8. **Trade-offs & Alternatives Considered** (ADR decision matrix, rejected patterns rationale)

### 4. Module D: Interactive Document Preview & Studio
- **Split-Screen Interface:** Live Markdown editor on left; instant HTML preview on right.
- **Dynamic Mermaid Compilation:** Client-side vector diagram rendering with syntax verification, expand-to-fullscreen, and SVG copy.
- **Snippet Helpers:** 1-click diagram snippet inserters (`+ Sequence`, `+ C4`, `+ ERD`, `+ Topology`).
- **AI Section Refiner:** Context-aware prompts to refine, augment, or audit individual sections.
- **View Switcher:** Seamlessly switch between Split View, Full Document Preview, and Focused Editor.

### 5. Module E: Standalone Exporting & Template Engine
- **Standalone HTML Bundle:** Generates a completely self-contained `.html` file with embedded inline CSS, metadata, and Mermaid script. Host on GitHub Pages, S3, or open offline in any browser.
- **Raw Markdown:** Exports standard `.md` with raw Mermaid blocks compatible with GitHub and GitLab wikis.
- **Print / PDF Ready:** Optimized `@media print` styles with clean margins and automatic section page breaks.
- **Custom Template Library:** Save, organize, and reload custom architectural configurations.

---

## 🛠️ Tech Stack Specification

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + `@tailwindcss/typography`
- **State Management:** Zustand (with persistent local storage)
- **Forms & Validation:** React Hook Form + Zod
- **Diagrams:** Mermaid.js (client-side dynamic SVG rendering)
- **Icons:** Lucide React
- **LLM Integration:** Vercel AI SDK (`ai` package) with support for Google Gemini, OpenAI, Anthropic, and a zero-config built-in architectural synthesis engine.

---

## 💻 Getting Started Locally

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build:**
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`

---

## 📄 License
MIT License. Built for software engineering teams and systems architects.