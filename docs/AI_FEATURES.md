# AI Architecture Assistant & Synthesis Engine

## 1. Overview & Operational Philosophy

The **AI Architecture Assistant** empowers architects, tech leads, and developers by augmenting their design workflow with automated synthesis, structural refinement, and architectural alternative exploration.

The assistant is built upon two core tenets:
1. **Zero-Config Sovereignty:** When no external AI provider API keys are supplied or when working in air-gapped/offline environments, the platform automatically activates its **Deterministic Local Architecture Synthesis Engine**. This guarantees that all generation, template creation, and alignment features function reliably with zero external dependencies.
2. **Non-Destructive Augmentation:** AI never overwrites human-approved content without explicit consent. With **Section Locking** and **Visual Diff Previews**, users maintain complete agency over every paragraph, schema, and diagram.

---

## 2. Supported AI Providers & Configuration

The studio supports multi-provider LLM configurations configured through UI settings or environment variables:

| Provider | Supported Models | Key Environment Variable | Best Used For |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-1.5-pro`, `gemini-1.5-flash` | `GEMINI_API_KEY` | Complex multi-modal reasoning and large context windows |
| **OpenAI** | `gpt-4o`, `gpt-4-turbo` | `OPENAI_API_KEY` | Code generation, schema design, and technical precision |
| **Anthropic** | `claude-3-5-sonnet` | `ANTHROPIC_API_KEY` | Long-form HLD documents, nuanced trade-off analysis |
| **Local Ollama** | `llama3`, `mistral`, `deepseek-coder` | `OLLAMA_BASE_URL` | Air-gapped, privacy-first local enterprise deployments |
| **Local Fallback** | Deterministic Heuristic Engine | *None required* | Instant offline development, unit tests, zero-cost sandboxing |

---

## 3. Local Deterministic Synthesis Fallback

When API calls to external providers are unavailable or fail, `src/app/api/generate/route.ts` seamlessly delegates to the local synthesis engine. The fallback engine leverages domain-specific heuristics:

```mermaid
flowchart TD
    Req["User Request (e.g. Refine Section or Generate Architecture)"] --> CheckKey{"API Key Present & Reachable?"}
    CheckKey -- Yes --> CallCloud["Invoke Cloud Provider (Gemini / OpenAI / Claude)"]
    CheckKey -- No / Failed --> LocalFallback["Local Deterministic Synthesis Engine"]
    CallCloud -- Error / Timeout --> LocalFallback
    LocalFallback --> Heuristic["Apply Domain Heuristics & Architecture Patterns"]
    Heuristic --> CleanMarkdown["Synthesize Well-Architected Markdown & Mermaid Code"]
    CleanMarkdown --> Response["Return Validated Architectural Content"]
```

### Domain-Aware Heuristic Adaptations:
- **Financial / Banking:** Automatically introduces double-entry ledgers, idempotency keys, distributed transaction isolation, and PCI-DSS compliance checkpoints.
- **Healthcare (HIPAA):** Enforces PHI data masking, field-level encryption, immutable audit logs, and BAA governance.
- **E-Commerce & High-Volume Retail:** Applies CQRS patterns, cache invalidation strategies, Kafka event streaming, and multi-region availability.
- **IoT & Telemetry:** Injects time-series storage (Timescale/InfluxDB), edge aggregation, and backpressure rate limiters.

---

## 4. Prompt Engineering & Modes of Interaction

### 4.1 Section Refinement (`promptType: "refine_section"`)
Allows targeted enhancement of individual document sections without modifying surrounding chapters.
- **Context Awareness:** Injects overall system metadata (scale, RPS, compliance tier, selected architectural pattern) into the prompt context so the AI's section advice remains coherent with the rest of the architecture.
- **Diff Inspection:** Proposed output is routed to the visual diff modal for architect review.

### 4.2 Interactive Requirement Clarification
When input requirements lack critical architectural parameters (e.g., unspecified RPS, missing compliance requirements, or undefined RTO/RPO), the assistant prompts the architect with clarifying multi-choice questions before generating specifications.

### 4.3 Architecture Alternative Exploration
For any design decision, the assistant analyzes trade-offs across 4 standard dimensions:
1. **Monolith vs. Microservices vs. Modular Monolith**
2. **Synchronous REST / gRPC vs. Asynchronous Event-Driven Messaging**
3. **Relational ACID vs. NoSQL Document / Wide-Column Storage**
4. **Cloud-Managed Serverless vs. Kubernetes Container Clusters**

---

## 5. Security & Safety Guardrails

### 5.1 Credential & Secret Redaction
Before any document content is transmitted to an external LLM endpoint:
- Database connection strings (`postgres://user:password@...`) are automatically stripped.
- Private keys, JWT tokens, and Bearer tokens are redacted via regex filtering.

### 5.2 Section Locking (`isLocked`)
Architects can toggle section lock status with a single click. When document regeneration or realignment is invoked:
```typescript
// use-doc-store.ts - Non-destructive guarantee:
if (existing && existing.isLocked) {
  return existing; // Preserves 100% of human manual edits
}
```

### 5.3 Anti-Prompt Injection Controls
User instructions are wrapped in strict system delimiters preventing system prompt escape or arbitrary script generation. Generated Mermaid blocks are validated against the standard Mermaid parser before rendering to eliminate XSS risks.

