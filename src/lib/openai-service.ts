import { getOpenAiClient, resolveServerOpenAiModel, OpenAiConfig } from "./openai";
import {
  AiRequirementAnalysis,
  AiClarifyingQuestion,
  DocumentType,
  DesignDocProject,
  ArchitectureFinding,
  ArchitectureAuditResult,
} from "@/types";
import { ALL_CORE_DOCUMENT_TYPES } from "./ai-analyzer";

/**
 * Validates and normalizes selected document types against supported core documents.
 */
function normalizeDocumentTypes(types: any[]): DocumentType[] {
  const validTypes = new Set(ALL_CORE_DOCUMENT_TYPES.map((d) => d.type));
  const filtered = Array.isArray(types)
    ? (types.filter((t) => validTypes.has(t)) as DocumentType[])
    : [];

  if (filtered.length === 0) {
    return ALL_CORE_DOCUMENT_TYPES.filter((d) => d.isRecommendedDefault).map((d) => d.type);
  }
  return filtered;
}

/**
 * Analyze natural language requirements or project brief with OpenAI.
 */
export async function generateRequirementAnalysisWithOpenAi(
  prompt: string,
  config?: OpenAiConfig
): Promise<AiRequirementAnalysis> {
  const openai = getOpenAiClient(config);
  const model = resolveServerOpenAiModel(config?.modelName);

  const systemPrompt = `You are a Principal Enterprise Systems Architect and Solutions Architect.
Your task is to analyze the user's natural language requirements or technical brief, extract structured architectural requirements, and design a production-grade system blueprint.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "projectName": "Short, professional title for the system",
  "domain": "Domain or industry vertical (e.g. Community E-Commerce, FinTech, HealthTech)",
  "recommendedPattern": "Architectural pattern (e.g. Modular Monolith, Event-Driven Microservices, CQRS, etc.)",
  "recommendedStack": {
    "frontend": "Frontend technology specification",
    "backend": "Backend service specification",
    "database": "Primary database and storage engine",
    "caching": "In-memory cache or session tier",
    "messaging": "Message broker or event streaming technology",
    "devops": "Containerization, orchestration, and CI/CD tools"
  },
  "functionalRequirements": [
    {
      "id": "FR-001",
      "title": "Clear concise requirement title",
      "description": "Specific functional detail and acceptance criteria",
      "priority": "high" // "high" | "medium" | "low"
    }
  ],
  "nonFunctionalRequirements": {
    "scalability": "Target concurrency and throughput SLA (e.g. 1,000 RPS peak with auto-scaling)",
    "availability": "Uptime guarantee (e.g. 99.95% Multi-AZ SLA)",
    "security": "Security controls (e.g. RBAC, OAuth2/OIDC, TLS 1.3, AES-256)",
    "performance": "Latency target (e.g. p99 < 150ms)",
    "cost": "Budget and infrastructure cost efficiency considerations",
    "compliance": ["SOC2 Type II", "GDPR", ...] // Array of relevant compliance standards
  },
  "clarifyingQuestions": [
    {
      "id": "Q-1",
      "question": "Architectural ambiguity or clarifying question",
      "context": "Why this decision matters",
      "impactOnArchitecture": "How the answer changes the database, caching, or topology"
    }
  ],
  "assumptions": ["Assumption 1", "Assumption 2", ...],
  "constraints": ["Constraint 1", "Constraint 2", ...],
  "dependencies": ["Dependency 1", "Dependency 2", ...],
  "selectedDocumentTypes": ["overview", "brd", "srs", "hld", "lld", "sad", "adrs", "database", "api", "integration", "security", "deployment", "runbook", "raid", "roadmap"]
}

Guidelines:
1. Provide at least 5-8 granular functional requirements reflecting real-world enterprise requirements.
2. Provide at least 2-4 clarifying architectural questions with clear trade-offs.
3. Recommend an appropriate architectural pattern without unnecessary microservice over-engineering for small/medium workloads.
4. Select relevant document types out of the 17 core types.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please analyze this system requirement and generate the architectural blueprint:\n\n${prompt}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3, // Low temperature for consistent, analytical output
  });

  const rawJson = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawJson);

  return {
    id: `analysis_${Date.now()}`,
    userPrompt: prompt,
    projectName: parsed.projectName || "System Architecture Specification",
    domain: parsed.domain || "Enterprise Cloud System",
    problemStatement: parsed.problemStatement || `Architecture blueprint for ${parsed.domain || "distributed enterprise cloud system"} handling high concurrency and strict SLAs.`,
    businessGoals: Array.isArray(parsed.businessGoals) ? parsed.businessGoals : [
      "Deliver a resilient, fault-tolerant cloud architecture",
      "Ensure linear horizontal scalability at peak concurrency",
      "Enforce zero-trust security and data privacy compliance"
    ],
    recommendedPattern: parsed.recommendedPattern || "Modular Monolith",
    recommendedStack: {
      frontend: parsed.recommendedStack?.frontend || "Next.js 14 / TypeScript (React 18, Tailwind CSS)",
      backend: parsed.recommendedStack?.backend || "Node.js (NestJS / TypeScript) or Go",
      database: parsed.recommendedStack?.database || "PostgreSQL 16 with Row-Level Security",
      caching: parsed.recommendedStack?.caching || "Redis 7 (In-Memory Session & Cache)",
      messaging: parsed.recommendedStack?.messaging || "RabbitMQ / AWS SQS",
      devops: parsed.recommendedStack?.devops || "Docker, GitHub Actions, Terraform",
    },
    functionalRequirements: Array.isArray(parsed.functionalRequirements)
      ? parsed.functionalRequirements.map((r: any, idx: number) => ({
          id: r.id || `FR-${String(idx + 1).padStart(3, "0")}`,
          title: r.title || `Requirement ${idx + 1}`,
          description: r.description || "",
          priority: r.priority === "critical" || r.priority === "high" || r.priority === "medium" || r.priority === "low" ? r.priority : "high",
        }))
      : [],
    nonFunctionalRequirements: {
      scalability: parsed.nonFunctionalRequirements?.scalability || "Target 500 RPS with horizontal elasticity",
      availability: parsed.nonFunctionalRequirements?.availability || "99.9% uptime Multi-AZ SLA",
      security: parsed.nonFunctionalRequirements?.security || "RBAC, TLS 1.3, AES-256 envelope encryption",
      performance: parsed.nonFunctionalRequirements?.performance || "p95 latency < 200ms",
      cost: parsed.nonFunctionalRequirements?.cost || "Optimized cloud container and reserved instance tiers",
      compliance: Array.isArray(parsed.nonFunctionalRequirements?.compliance)
        ? parsed.nonFunctionalRequirements.compliance
        : ["SOC2 Type II", "GDPR"],
    },
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions)
      ? parsed.clarifyingQuestions.map((q: any, idx: number) => ({
          id: q.id || `Q-${idx + 1}`,
          question: q.question || "Architectural clarification",
          answer: q.answer || q.context || "Standard enterprise defaults applied",
          impact: q.impact || q.impactOnArchitecture || "Defines component boundaries and persistence topology",
        }))
      : [],
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
    selectedDocumentTypes: normalizeDocumentTypes(parsed.selectedDocumentTypes),
  };
}

/**
 * Refines a specific document section using OpenAI based on user feedback.
 */
export async function refineSectionWithOpenAi(
  currentMarkdown: string,
  userInstruction: string,
  projectContext: any,
  sectionTitle?: string,
  config?: OpenAiConfig
): Promise<string> {
  const openai = getOpenAiClient(config);
  const model = resolveServerOpenAiModel(config?.modelName);

  const systemPrompt = `You are a Senior Principal Software Architect and Technical Writer.
Your task is to refine and update a technical architecture document section according to user instructions.

Formatting Rules:
- Return pure GitHub-flavored Markdown. Do not enclose the whole output in \`\`\`markdown code fences.
- Maintain professional enterprise depth and technical rigor.
- When describing workflows, data models, or topologies, embed valid Mermaid.js diagrams (e.g. \`\`\`mermaid flowchart TD or sequenceDiagram or erDiagram).
- Ensure all Mermaid diagrams are syntactically valid with double-quoted labels where necessary.
- Preserve unchanged technical sections while incorporating requested enhancements.`;

  const userPrompt = `Project Title: ${projectContext.metadata?.title || "System Architecture"}
Domain: ${projectContext.requirements?.domain || "Enterprise Software"}
Architecture Pattern: ${projectContext.recommendations?.selectedPattern || "Standard"}
Tech Stack: ${JSON.stringify(projectContext.recommendations?.stack || {})}
Section Title: ${sectionTitle || "Architecture Section"}

User Enhancement Instruction:
"${userInstruction}"

Current Section Content:
${currentMarkdown}

Please output the revised section markdown incorporating the feedback.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  });

  return response.choices[0]?.message?.content?.trim() || currentMarkdown;
}

/**
 * Generates an in-depth dynamic document or section using OpenAI.
 */
export async function generateDocumentContentWithOpenAi(
  projectData: any,
  documentType: DocumentType | string,
  sectionTitle?: string,
  config?: OpenAiConfig
): Promise<string> {
  const openai = getOpenAiClient(config);
  const model = resolveServerOpenAiModel(config?.modelName);

  const systemPrompt = `You are an elite Enterprise Architect specializing in Cloud Distributed Systems and formal technical design documentation.
Your job is to generate an in-depth, production-ready specification for the specified document type.

Rules:
- Return valid GitHub-flavored Markdown with clear headings (##, ###), tables, code blocks, and valid Mermaid.js diagrams.
- Do NOT wrap the entire output in outer \`\`\`markdown fences.
- Make the document tailored directly to the specific project domain, RPS throughput, compliance, and tech stack.
- Include concrete DDL, API endpoints, error handling codes, or sequence diagrams where relevant.`;

  const userPrompt = `Generate a comprehensive specification for:
Document Type: ${documentType}
Section Focus: ${sectionTitle || "Full Specification"}
Project Title: ${projectData.metadata?.title || "System Architecture"}
Domain: ${projectData.requirements?.domain || "Cloud Service"}
Scale: ${projectData.requirements?.targetScale?.rps || 1000} RPS, ${projectData.requirements?.targetScale?.users || "100k Users"}
Availability SLA: ${projectData.requirements?.nonFunctionalRequirements?.availability || "99.95%"}
Latency SLA: ${projectData.requirements?.nonFunctionalRequirements?.latency || "p99 < 150ms"}
Compliance: ${JSON.stringify(projectData.requirements?.nonFunctionalRequirements?.compliance || [])}
Functional Requirements: ${JSON.stringify(projectData.requirements?.functionalRequirements || [])}
Constraints: ${JSON.stringify(projectData.requirements?.constraints || [])}
Architecture Pattern: ${projectData.recommendations?.selectedPattern || "Modular Monolith"}
Tech Stack: ${JSON.stringify(projectData.recommendations?.stack || {})}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.35,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

/**
 * Perform deep AI Architecture Quality & Threat Audit using OpenAI.
 */
export async function auditArchitectureWithOpenAi(
  projectData: DesignDocProject,
  config?: OpenAiConfig
): Promise<ArchitectureFinding[]> {
  const openai = getOpenAiClient(config);
  const model = resolveServerOpenAiModel(config?.modelName);

  const systemPrompt = `You are a Principal Cloud Security and Architecture Review Board (ARB) Auditor.
Evaluate the provided system architecture against:
1. Reliability & Resilience (Single points of failure, failure domain blast radius, database replica topology, circuit breakers).
2. Scalability & Latency (Bottlenecks at target RPS, caching strategy, lock contention, asynchronous queues).
3. Security & Compliance (STRIDE threat model, authentication/authorization, data encryption in-transit and at-rest, compliance standards).
4. Cost & Operational Feasibility (Over-engineering vs under-engineering, cloud egress, observability).

You MUST respond strictly with a JSON object matching this schema:
{
  "findings": [
    {
      "stableId": "AI-HLD-001",
      "severity": "critical", // "critical" | "warning" | "info"
      "category": "reliability", // "reliability" | "scalability" | "security" | "observability" | "cost" | "maintainability"
      "component": "Component or Tier name",
      "title": "Concise issue summary",
      "description": "Deep technical explanation of the vulnerability or architectural flaw",
      "whyItMatters": "Business or operational consequence if left unaddressed",
      "remediation": "Concrete actionable architectural remediation instructions or code/config snippet",
      "tradeOffs": "Cost, latency, or complexity trade-offs introduced by applying this remediation",
      "confidence": 95 // 50-100
    }
  ]
}

Return 4-7 high-quality, high-impact findings specific to the domain and scale parameters.`;

  const projectSummary = {
    title: projectData.metadata?.title,
    domain: projectData.requirements?.domain,
    scale: projectData.requirements?.targetScale,
    requirements: projectData.requirements?.functionalRequirements,
    nfrs: projectData.requirements?.nonFunctionalRequirements,
    constraints: projectData.requirements?.constraints,
    pattern: projectData.recommendations?.selectedPattern,
    stack: projectData.recommendations?.stack,
    sectionsSample: projectData.documentSections?.slice(0, 5).map((s) => ({
      title: s.title,
      summary: s.contentMarkdown.slice(0, 300),
    })),
  };

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please perform an architecture audit on this system:\n${JSON.stringify(projectSummary, null, 2)}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const rawJson = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawJson);

  if (!Array.isArray(parsed.findings)) return [];

  return parsed.findings.map((f: any, idx: number) => ({
    id: `finding_ai_${Date.now()}_${idx + 1}`,
    stableId: f.stableId || `AI-FIND-${idx + 1}`,
    severity: (f.severity === "critical" || f.severity === "high" || f.severity === "medium" || f.severity === "low")
      ? f.severity
      : f.severity === "warning"
      ? "high"
      : "medium",
    category: ["reliability", "scalability", "security", "observability", "cost", "maintainability"].includes(f.category)
      ? f.category
      : "reliability",
    component: f.component || "Architecture Core",
    title: f.title || "Architectural Challenge",
    description: f.description || "",
    whyItMatters: f.whyItMatters || "",
    remediation: f.remediation || "",
    tradeOffs: f.tradeOffs || "",
    confidence: typeof f.confidence === "number" ? f.confidence : 90,
    status: "open",
  }));
}
