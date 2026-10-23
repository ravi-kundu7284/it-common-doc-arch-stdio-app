# IT Architecture Studio — Developer & Contributor Guide

## 1. Prerequisites & Environment Setup

### 1.1 Requirements
- **Node.js:** Node 18.16.0 LTS or higher (tested on Node 18 & Node 20).
- **Package Manager:** `npm` v9.x or v10.x.
- **Operating System:** Windows, macOS, or Linux.
- **Docker & Docker Compose (Optional):** Only required if running a local PostgreSQL / Supabase stack.

### 1.2 Quickstart
```bash
# 1. Clone repository
git clone https://github.com/ravi-kundu7284/it-common-doc-arch-stdio-app.git
cd it-common-doc-arch-stdio-app

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env.local

# 4. Start local development server (Zero-config sandbox mode)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The studio will automatically load with seed enterprise architectures and local in-memory persistence.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.local`. All variables are optional for local development thanks to the built-in zero-config sandbox:

```ini
# --- Optional AI Providers (Leave blank for offline local synthesis) ---
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# --- Optional Supabase Enterprise Cloud (Leave blank for in-memory sandbox) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Security & Auth Configuration ---
JWT_SECRET=super-secret-local-dev-jwt-key
API_KEY_SALT=local-dev-salt
```

---

## 3. Running Automated Tests

The test suite runs with Node's native test runner (`node:test`) accelerated by a custom TypeScript transpile loader:

```bash
# Run all unit, integration, and engine test suites
npm test
```

### Test Suite Structure (`tests/`)
- `tests/smoke.test.mjs`: Test environment and runner operational verification.
- `tests/database.test.mjs`: CRUD and lifecycle validation across all 9 entities (`projects`, `document_sections`, `document_revisions`, `diagrams`, `workflows`, `requirements`, `requirement_trace_links`, `adrs`, `architecture_reviews`).
- `tests/architecture-audit.test.mjs`: Static analysis rule checks (SPOFs, encryption, idempotency, DLQs, SLA/RTO/RPO).
- `tests/workflow-engine.test.mjs`: Directed graph validation (missing triggers, broken edge references, cycles, simulations).
- `tests/impact-engine.test.mjs`: Requirement change impact detection, automated section patch proposals, and Traceability Matrix verification.
- `tests/export-engine.test.mjs`: Multi-format generators (HTML bundle, Markdown, YAML, JSON, Word DOCX).

---

## 4. Extending the Application

### 4.1 Adding a New Diagram Type
1. Define the diagram type in `src/types/index.ts` within the `DiagramType` union.
2. Add starter template vector code and metadata to `src/lib/diagram-catalog.ts`.
3. The interactive canvas (`src/components/diagram-designer.tsx`) will automatically render the new diagram type in its selector menu.

### 4.2 Adding a New Architecture Audit Rule
1. Open `src/lib/architecture-audit.ts`.
2. Append a new evaluation check to `runArchitectureAudit(project)`:
```typescript
if (isPaymentDomain && !hasAuditLog) {
  findings.push({
    id: "AUDIT-SEC-NEW",
    category: "compliance",
    severity: "high",
    title: "Immutable Financial Audit Log Missing",
    description: "Financial transactions require tamper-proof audit trail.",
    remediationText: "Introduce write-once append-only audit event streaming to S3 Glacier."
  });
}
```
3. Add a test in `tests/architecture-audit.test.mjs` verifying the rule triggers and produces remediation patches.

### 4.3 Adding a New Database Entity
1. Add Liquibase SQL changeset in `liquibase/changesets/009-your-new-table.sql`.
2. Register the changeset in `liquibase/changelog.master.xml`.
3. Add the table definition to `supabase/schema.sql` with Row-Level Security policies.
4. Extend `LocalSandboxDatabase` in `src/lib/supabase.ts` with in-memory array storage and async CRUD methods so offline sandbox mode continues to work seamlessly.

