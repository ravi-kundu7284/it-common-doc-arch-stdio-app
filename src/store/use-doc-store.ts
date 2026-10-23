import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DesignDocProject,
  DocumentSection,
  DesignLevel,
  SavedProjectSummary,
  DiagramItem,
  WorkflowItem,
  RequirementItem,
  TraceLink,
  AdrItem,
  ArchitectureAuditResult,
  DocumentType,
  DocumentLifecycleStatus,
  DocumentItem,
  AiRequirementAnalysis,
} from "@/types";
import { PRESET_TEMPLATES, ARCHITECTURE_PATTERNS } from "@/lib/templates";
import {
  generateStandardDocument,
  syncTitleAcrossSections,
  generateFullDocumentSet,
  generateDocumentByType,
  getDocumentTitle,
} from "@/lib/doc-generator";
import { DIAGRAM_CATALOG } from "@/lib/diagram-catalog";

export type StudioTab =
  | "wizard"
  | "recommender"
  | "studio"
  | "diagrams"
  | "workflows"
  | "traceability"
  | "adrs"
  | "quality"
  | "templates";

interface DocState {
  currentProject: DesignDocProject;
  savedProjects: SavedProjectSummary[];
  lastSavedAt: string;
  activeStep: number;
  activeTab: StudioTab;
  studioViewMode: "split" | "preview" | "editor";
  selectedSectionId: string | null;
  isGenerating: boolean;
  selectedSectionIds: string[];
  theme: "dark" | "light";
  syncStatus: "saved" | "saving" | "unsaved";
  apiSettings: {
    provider: "builtin" | "openai" | "gemini" | "anthropic";
    apiKey: string;
    modelName: string;
  };
  customTemplates: Array<{
    id: string;
    title: string;
    description: string;
    savedAt: string;
    project: DesignDocProject;
  }>;

  // Visual Diagrams State
  diagrams: DiagramItem[];
  activeDiagramId: string | null;
  saveDiagramItem: (diagram: DiagramItem) => void;
  deleteDiagramItem: (id: string) => void;
  setActiveDiagramId: (id: string | null) => void;

  // Workflows State
  workflows: WorkflowItem[];
  activeWorkflowId: string | null;
  saveWorkflowItem: (workflow: WorkflowItem) => void;
  deleteWorkflowItem: (id: string) => void;
  setActiveWorkflowId: (id: string | null) => void;

  // Requirements & Traceability State
  requirements: RequirementItem[];
  traceLinks: TraceLink[];
  saveRequirementItem: (req: RequirementItem) => void;
  deleteRequirementItem: (id: string) => void;
  saveTraceLinkItem: (link: TraceLink) => void;
  deleteTraceLinkItem: (id: string) => void;

  // ADRs State
  adrs: AdrItem[];
  saveAdrItem: (adr: AdrItem) => void;
  deleteAdrItem: (id: string) => void;

  // Architecture Quality Audit State
  latestAudit: ArchitectureAuditResult | null;
  setLatestAudit: (audit: ArchitectureAuditResult | null) => void;

  // Multi-Document Workspace State
  activeDocumentType: DocumentType | "all";
  setActiveDocumentType: (type: DocumentType | "all") => void;
  setDocumentLifecycleStatus: (docIdOrType: string, status: DocumentLifecycleStatus) => void;
  addDocumentReviewComment: (docIdOrType: string, author: string, role: string, comment: string) => void;
  applyAiAnalysisToProject: (analysis: AiRequirementAnalysis) => void;
  generateCoordinatedDocumentSuite: (selectedTypes?: DocumentType[]) => void;

  // Actions
  toggleTheme: () => void;
  setSyncStatus: (status: "saved" | "saving" | "unsaved") => void;
  toggleSectionLock: (sectionId: string) => void;
  setDesignLevel: (level: DesignLevel, regenerate?: boolean) => void;
  setProject: (project: Partial<DesignDocProject>) => void;
  updateMetadata: (metadata: Partial<DesignDocProject["metadata"]>) => void;
  updateRequirements: (requirements: Partial<DesignDocProject["requirements"]>) => void;
  updateRecommendations: (recommendations: Partial<DesignDocProject["recommendations"]>) => void;
  updateSectionContent: (id: string, contentMarkdown: string) => void;
  updateSectionTitle: (id: string, title: string) => void;
  reorderSections: (newSections: DocumentSection[]) => void;
  addSection: (
    title: string,
    contentMarkdown?: string,
    position?: "start" | "end" | "before" | "after",
    referenceSectionId?: string,
    level?: "hld" | "lld" | "common",
    phase?: string
  ) => void;
  deleteSection: (id: string) => void;
  toggleSectionSelection: (id: string) => void;
  loadPresetTemplate: (templateId: string, level?: DesignLevel) => void;
  saveCurrentAsTemplate: (customTitle: string, customDesc: string) => void;
  deleteCustomTemplate: (templateId: string) => void;
  setActiveStep: (step: number) => void;
  setActiveTab: (tab: StudioTab) => void;
  setStudioViewMode: (mode: "split" | "preview" | "editor") => void;
  setSelectedSectionId: (id: string | null) => void;
  setIsGenerating: (val: boolean) => void;
  setApiSettings: (settings: Partial<DocState["apiSettings"]>) => void;
  regenerateDocumentSections: (level?: DesignLevel) => void;
  resetProject: () => void;
  startBlankProject: (title?: string, domain?: string, level?: DesignLevel) => void;

  // Multi-Project / Drafts Management
  saveCurrentProjectToDrafts: () => void;
  loadSavedProject: (projectId: string) => void;
  deleteSavedProject: (projectId: string) => void;
  duplicateSavedProject: (projectId: string) => void;
  updateSavedProject: (
    projectId: string,
    partial: { title?: string; domain?: string; designLevel?: DesignLevel }
  ) => void;
  createNewProject: (title?: string, domain?: string, level?: DesignLevel) => void;
}

export const createBlankProject = (
  customTitle?: string,
  customDomain?: string,
  level: DesignLevel = "hld"
): DesignDocProject => {
  const title = customTitle || "New Technical Architecture";
  const domain = customDomain || "Cloud Distributed Services";

  const baseProject: Omit<DesignDocProject, "documentSections"> = {
    id: "proj_" + Math.random().toString(36).substring(2, 9),
    designLevel: level,
    metadata: {
      title,
      version: "1.0.0",
      authors: ["Solutions Architect"],
      status: "Draft",
      lastUpdated: new Date().toISOString().split("T")[0],
    },
    requirements: {
      domain,
      targetScale: {
        rps: 5000,
        users: "1,000,000 MAU",
        dataRetention: "3 Years",
      },
      functionalRequirements: [
        "Secure client authentication and session authorization",
        "Domain-specific transactional processing with idempotency guarantees",
        "High-performance read queries and asynchronous reporting",
      ],
      nonFunctionalRequirements: {
        latency: "p99 < 150ms",
        availability: "99.95%",
        compliance: ["SOC2 Type II", "ISO 27001"],
      },
      constraints: [
        "Must be deployable across multi-availability zones",
        "Zero downtime rolling deployments required",
      ],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      patternAlternatives: [
        {
          pattern: "Modular Monolith",
          reasonNotChosen: "Single deployable unit does not support independent scaling across distinct operational workloads.",
        },
      ],
      stack: {
        frontend: "Next.js 14 / TypeScript (Tailwind CSS)",
        backend: "Go (Golang) / Node.js (TypeScript) Microservices",
        database: "PostgreSQL 16 with Read Replicas",
        caching: "Redis Enterprise Cluster",
        messaging: "Apache Kafka / AWS SQS",
        devops: "Docker, Kubernetes, Terraform, Datadog / OpenTelemetry",
      },
    },
  };

  const initialDocs = generateFullDocumentSet(baseProject);
  const activeDoc = initialDocs.find((d) => d.type === "hld") || initialDocs[0];

  return {
    ...baseProject,
    documents: initialDocs,
    activeDocumentId: activeDoc?.id,
    documentSections: generateStandardDocument(baseProject, level),
  };
};

const createInitialProject = (): DesignDocProject => {
  const initialTemplate = PRESET_TEMPLATES[0];
  const level: DesignLevel = "hld";

  const baseProject: Omit<DesignDocProject, "documentSections"> = {
    id: "proj_" + Math.random().toString(36).substring(2, 9),
    designLevel: level,
    metadata: {
      title: initialTemplate.title,
      version: "1.0.0",
      authors: ["Principal Software Architect", "Tech Lead"],
      status: "Draft",
      lastUpdated: new Date().toISOString().split("T")[0],
    },
    requirements: { ...initialTemplate.requirements },
    recommendations: { ...initialTemplate.recommendations },
  };

  const initialDocs = generateFullDocumentSet(baseProject);
  const activeDoc = initialDocs.find((d) => d.type === "hld") || initialDocs[0];

  return {
    ...baseProject,
    documents: initialDocs,
    activeDocumentId: activeDoc?.id,
    documentSections: generateStandardDocument(baseProject, level),
  };
};

const createInitialDiagrams = (projectId: string): DiagramItem[] => {
  return DIAGRAM_CATALOG.slice(0, 5).map((def, idx) => ({
    id: `diag_init_${idx + 1}`,
    projectId,
    title: def.title,
    diagramType: def.type,
    mermaidCode: def.defaultMermaid,
    visualModel: def.defaultVisualModel,
    version: 1,
    isLocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

const createInitialWorkflow = (projectId: string): WorkflowItem => ({
  id: "wf_init_order",
  projectId,
  title: "Order Fulfillment & Settlement Workflow",
  description: "End-to-end checkout orchestration with automated compensation and risk approval checkpoint.",
  status: "published",
  version: 1,
  steps: [
    { id: "s1", title: "Order Placement Webhook", type: "trigger", description: "Triggered on client POST /api/v1/orders" },
    { id: "s2", title: "Verify Customer & Session", type: "task", description: "OIDC & Token verification" },
    { id: "s3", title: "Check Fraud Score", type: "condition", description: "ML Risk model evaluation" },
    { id: "s4", title: "Risk Officer Review", type: "approval", assignee: "Lead Risk Architect", description: "Manual sign-off if risk > 0.75" },
    { id: "s5", title: "Reserve Inventory Hold", type: "task", timeoutSeconds: 30, retryPolicy: { maxRetries: 3, backoffMs: 200 }, description: "Atomic Redis hold" },
    { id: "s6", title: "Release Inventory Hold", type: "compensation", description: "Rollback hold on payment decline" },
    { id: "s7", title: "Charge Credit Card", type: "task", retryPolicy: { maxRetries: 2, backoffMs: 500 }, description: "Stripe/Adyen payment intent" },
    { id: "s8", title: "Order Settled & Emitted", type: "end", description: "Terminal success state with Kafka event" },
  ],
  edges: [
    { id: "e1", source: "s1", target: "s2" },
    { id: "e2", source: "s2", target: "s3" },
    { id: "e3", source: "s3", target: "s5", label: "Low Risk (<0.75)" },
    { id: "e4", source: "s3", target: "s4", label: "High Risk (>=0.75)" },
    { id: "e5", source: "s4", target: "s5", label: "Approved" },
    { id: "e6", source: "s5", target: "s7" },
    { id: "e7", source: "s7", target: "s8", label: "Payment Success" },
    { id: "e8", source: "s7", target: "s6", isFailurePath: true, label: "Payment Failed" },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createInitialRequirements = (projectId: string): RequirementItem[] => [
  {
    id: "req_init_1",
    projectId,
    stableId: "BR-001",
    title: "Global Enterprise Multi-Tenancy",
    category: "business",
    priority: "critical",
    status: "approved",
    description: "System must strictly isolate data, rate limits, and audit trails across corporate enterprise tenants.",
    acceptanceCriteria: ["Row Level Security (RLS) on all tenant tables", "Distinct KMS keys per enterprise tier"],
    traceLinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_init_2",
    projectId,
    stableId: "FR-001",
    title: "WebAuthn & Hardware MFA Enforcement",
    category: "functional",
    priority: "high",
    status: "approved",
    description: "Provide FIDO2 passwordless and TOTP MFA for all architect and administrator accounts.",
    acceptanceCriteria: ["YubiKey / WebAuthn passkey registration", "Backup recovery codes generated"],
    traceLinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_init_3",
    projectId,
    stableId: "NFR-001",
    title: "Sub-100ms p99 Ingress Latency SLA",
    category: "non_functional",
    priority: "critical",
    status: "approved",
    description: "Edge CDN and API Gateway must serve authenticated cached read requests with p99 < 80ms.",
    acceptanceCriteria: ["Redis tier caching response headers", "HTTP/3 and TLS 1.3 0-RTT enabled"],
    traceLinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_init_4",
    projectId,
    stableId: "NFR-002",
    title: "Multi-AZ 99.999% High Availability & RPO < 5m",
    category: "non_functional",
    priority: "high",
    status: "approved",
    description: "Clustered database failover across 3 Availability Zones with automatic DNS health checks.",
    acceptanceCriteria: ["Aurora Multi-AZ synchronous replication", "RTO < 15 minutes in disaster scenario"],
    traceLinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const createInitialAdrs = (projectId: string): AdrItem[] => [
  {
    id: "adr_init_1",
    projectId,
    stableId: "ADR-001",
    title: "Adopt Event-Driven Microservices Style",
    status: "accepted",
    context: "The platform requires decoupled scaling of order ingestion, catalog queries, and billing pipelines.",
    decisionDrivers: ["Independent deployment cadence", "Horizontal auto-scaling during flash sales", "Fault isolation"],
    optionsConsidered: [
      { option: "Event-Driven Microservices", pros: ["Elastic scaling", "Fault isolation"], cons: ["Eventual consistency"] },
      { option: "Monolithic Application", pros: ["Single deployment", "ACID transactions"], cons: ["Scaling bottleneck"] },
    ],
    decision: "Adopt Event-Driven Microservices with Apache Kafka as the central immutable domain log.",
    consequences: {
      positive: ["Zero blast radius between order intake and analytics", "Independent CI/CD pipelines"],
      negative: ["Requires distributed tracing and Transactional Outbox pattern"],
    },
    risks: ["Schema evolution requires Avro/Protobuf backward compatibility enforcement"],
    author: "Chief Software Architect",
    reviewers: ["Principal DevOps Architect", "Security Lead"],
    relatedRequirementIds: ["BR-001", "NFR-001"],
    relatedDiagramIds: ["diag_init_1"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "adr_init_2",
    projectId,
    stableId: "ADR-002",
    title: "Standardize on gRPC for Internal East-West Communication",
    status: "accepted",
    context: "Inter-service HTTP/1.1 REST calls introduced significant JSON serialization overhead under 15,000 RPS.",
    decisionDrivers: ["Protocol Buffers efficiency", "HTTP/2 multiplexing", "Strict schema contracts"],
    optionsConsidered: [
      { option: "gRPC + Protobuf", pros: ["7x faster serialization", "Streaming support"], cons: ["Requires proto compilation"] },
      { option: "JSON over REST", pros: ["Human readable", "Simple debugging"], cons: ["High CPU parsing overhead"] },
    ],
    decision: "Enforce gRPC for all internal synchronous service-to-service communications.",
    consequences: {
      positive: ["55% reduction in internal latency", "Strong compile-time type safety"],
      negative: ["Debugging requires grpcurl or Postman gRPC client"],
    },
    risks: ["Client retry loops must implement exponential backoff with jitter"],
    author: "Lead Systems Architect",
    reviewers: ["Core Engineering Leads"],
    relatedRequirementIds: ["NFR-001"],
    relatedDiagramIds: ["diag_init_2"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function formatNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => {
      const initProject = createInitialProject();

      return {
        currentProject: initProject,
        savedProjects: [],
        lastSavedAt: formatNow(),
        activeStep: 1,
        activeTab: "wizard",
        studioViewMode: "split",
        selectedSectionId: "hld-exec-summary",
        isGenerating: false,
        selectedSectionIds: [],
        theme: "dark",
        syncStatus: "saved",
        apiSettings: {
          provider: "openai",
          apiKey: "",
          modelName: "gpt-4o",
        },
        customTemplates: [],

        // Multi-Document Workspace
        activeDocumentType: "hld" as DocumentType | "all",
        setActiveDocumentType: (type) => {
          const { currentProject } = get();
          if (type === "all") {
            set({ activeDocumentType: "all" });
            return;
          }

          const currentDocs = currentProject.documents ? [...currentProject.documents] : generateFullDocumentSet(currentProject);
          const currentDocIdx = currentDocs.findIndex(
            (d) => d.id === currentProject.activeDocumentId || d.type === get().activeDocumentType
          );
          if (currentDocIdx >= 0) {
            currentDocs[currentDocIdx] = {
              ...currentDocs[currentDocIdx],
              sections: currentProject.documentSections,
              updatedAt: new Date().toISOString(),
            };
          }

          const docType = type as DocumentType;
          let targetDoc = currentDocs.find((d) => d.type === docType);
          if (!targetDoc) {
            const generatedSections = generateDocumentByType(docType, currentProject);
            targetDoc = {
              id: `doc_${docType}_${Math.random().toString(36).substring(2, 7)}`,
              projectId: currentProject.id,
              type: docType,
              title: getDocumentTitle(docType),
              status: "draft",
              version: currentProject.metadata.version || "1.0.0",
              sections: generatedSections,
              reviewComments: [],
              lastModifiedBy: "DocArch AI",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            currentDocs.push(targetDoc);
          }

          set({
            activeDocumentType: type,
            currentProject: {
              ...currentProject,
              documents: currentDocs,
              activeDocumentId: targetDoc.id,
              documentSections: targetDoc.sections,
            },
            selectedSectionId: targetDoc.sections[0]?.id || null,
            lastSavedAt: formatNow(),
          });
        },

        setDocumentLifecycleStatus: (docIdOrType, status) => {
          const { currentProject } = get();
          const docs = currentProject.documents || generateFullDocumentSet(currentProject);
          const updatedDocs = docs.map((d) => {
            if (d.id === docIdOrType || d.type === docIdOrType) {
              return { ...d, status, updatedAt: new Date().toISOString() };
            }
            return d;
          });

          const targetDoc = updatedDocs.find((d) => d.id === docIdOrType || d.type === docIdOrType);
          const metaStatus = (status === "approved" ? "Approved" : status === "in_review" ? "In Review" : "Draft") as any;

          set({
            currentProject: {
              ...currentProject,
              documents: updatedDocs,
              metadata: {
                ...currentProject.metadata,
                status: targetDoc ? metaStatus : currentProject.metadata.status,
              },
            },
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          });
        },

        addDocumentReviewComment: (docIdOrType, author, role, comment) => {
          const { currentProject } = get();
          const docs = currentProject.documents || generateFullDocumentSet(currentProject);
          const newComment = {
            id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            author,
            role,
            comment,
            createdAt: new Date().toISOString(),
          };

          const updatedDocs = docs.map((d) => {
            if (d.id === docIdOrType || d.type === docIdOrType) {
              return {
                ...d,
                reviewComments: [...(d.reviewComments || []), newComment],
                updatedAt: new Date().toISOString(),
              };
            }
            return d;
          });

          set({
            currentProject: {
              ...currentProject,
              documents: updatedDocs,
            },
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          });
        },

        applyAiAnalysisToProject: (analysis) => {
          const { currentProject } = get();
          const updatedReqs = {
            domain: analysis.domain,
            targetScale: {
              rps: 1000,
              users: "50,000 MAU",
              dataRetention: "2 Years",
            },
            functionalRequirements: analysis.functionalRequirements.map((f) => `${f.title}: ${f.description}`),
            nonFunctionalRequirements: {
              latency: analysis.nonFunctionalRequirements.performance,
              availability: analysis.nonFunctionalRequirements.availability,
              compliance: analysis.nonFunctionalRequirements.compliance,
            },
            constraints: analysis.constraints,
          };

          const updatedRecs = {
            selectedPattern: analysis.recommendedPattern,
            patternAlternatives: [
              {
                pattern: "Distributed Microservices",
                reasonNotChosen: "High orchestration overhead for current throughput requirements.",
              },
            ],
            stack: analysis.recommendedStack,
          };

          const baseProject = {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              title: analysis.projectName,
              lastUpdated: new Date().toISOString().split("T")[0],
            },
            requirements: updatedReqs,
            recommendations: updatedRecs,
            aiAnalysis: analysis,
          };

          const generatedDocs = generateFullDocumentSet(baseProject, analysis.selectedDocumentTypes);
          const hldDoc = generatedDocs.find((d) => d.type === "hld") || generatedDocs[0];

          set({
            currentProject: {
              ...baseProject,
              documents: generatedDocs,
              activeDocumentId: hldDoc?.id,
              documentSections: hldDoc?.sections || generateStandardDocument(baseProject, "hld"),
            },
            activeDocumentType: (hldDoc?.type as DocumentType) || "hld",
            selectedSectionId: hldDoc?.sections[0]?.id || null,
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          });
        },

        generateCoordinatedDocumentSuite: (selectedTypes) => {
          const { currentProject } = get();
          const generatedDocs = generateFullDocumentSet(currentProject, selectedTypes);
          const activeDoc = generatedDocs.find((d) => d.type === get().activeDocumentType) || generatedDocs[0];

          set({
            currentProject: {
              ...currentProject,
              documents: generatedDocs,
              activeDocumentId: activeDoc?.id,
              documentSections: activeDoc?.sections || currentProject.documentSections,
            },
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          });
        },

        // Diagrams
        diagrams: createInitialDiagrams(initProject.id),
        activeDiagramId: "diag_init_1",
        saveDiagramItem: (diagram) =>
          set((state) => {
            const exists = state.diagrams.findIndex((d) => d.id === diagram.id);
            const updated = exists >= 0
              ? state.diagrams.map((d, i) => (i === exists ? { ...diagram, updatedAt: new Date().toISOString() } : d))
              : [...state.diagrams, { ...diagram, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
            return { diagrams: updated, lastSavedAt: formatNow(), syncStatus: "unsaved" };
          }),
        deleteDiagramItem: (id) =>
          set((state) => ({
            diagrams: state.diagrams.filter((d) => d.id !== id),
            activeDiagramId: state.activeDiagramId === id ? state.diagrams[0]?.id || null : state.activeDiagramId,
            lastSavedAt: formatNow(),
          })),
        setActiveDiagramId: (id) => set({ activeDiagramId: id }),

        // Workflows
        workflows: [createInitialWorkflow(initProject.id)],
        activeWorkflowId: "wf_init_order",
        saveWorkflowItem: (workflow) =>
          set((state) => {
            const exists = state.workflows.findIndex((w) => w.id === workflow.id);
            const updated = exists >= 0
              ? state.workflows.map((w, i) => (i === exists ? { ...workflow, updatedAt: new Date().toISOString() } : w))
              : [...state.workflows, { ...workflow, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
            return { workflows: updated, lastSavedAt: formatNow(), syncStatus: "unsaved" };
          }),
        deleteWorkflowItem: (id) =>
          set((state) => ({
            workflows: state.workflows.filter((w) => w.id !== id),
            activeWorkflowId: state.activeWorkflowId === id ? state.workflows[0]?.id || null : state.activeWorkflowId,
            lastSavedAt: formatNow(),
          })),
        setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),

        // Requirements & Traceability
        requirements: createInitialRequirements(initProject.id),
        traceLinks: [
          {
            id: "tl_init_1",
            requirement_id: "req_init_2",
            targetType: "component",
            targetId: "auth-service",
            targetTitle: "Auth & Identity Service (OAuth/OIDC)",
          },
          {
            id: "tl_init_2",
            requirement_id: "req_init_2",
            targetType: "diagram",
            targetId: "diag_init_1",
            targetTitle: "C4 System Context Diagram",
          },
        ],
        saveRequirementItem: (req) =>
          set((state) => {
            const exists = state.requirements.findIndex((r) => r.id === req.id);
            const updated = exists >= 0
              ? state.requirements.map((r, i) => (i === exists ? { ...req, updatedAt: new Date().toISOString() } : r))
              : [...state.requirements, { ...req, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
            return { requirements: updated, lastSavedAt: formatNow(), syncStatus: "unsaved" };
          }),
        deleteRequirementItem: (id) =>
          set((state) => ({
            requirements: state.requirements.filter((r) => r.id !== id),
            traceLinks: state.traceLinks.filter((l) => l.requirement_id !== id && (l as any).requirementId !== id),
            lastSavedAt: formatNow(),
          })),
        saveTraceLinkItem: (link) =>
          set((state) => {
            const id = link.id || `tl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            return {
              traceLinks: [...state.traceLinks.filter((l) => l.id !== id), { ...link, id }],
              lastSavedAt: formatNow(),
            };
          }),
        deleteTraceLinkItem: (id) =>
          set((state) => ({
            traceLinks: state.traceLinks.filter((l) => l.id !== id),
            lastSavedAt: formatNow(),
          })),

        // ADRs
        adrs: createInitialAdrs(initProject.id),
        saveAdrItem: (adr) =>
          set((state) => {
            const exists = state.adrs.findIndex((a) => a.id === adr.id);
            const updated = exists >= 0
              ? state.adrs.map((a, i) => (i === exists ? { ...adr, updatedAt: new Date().toISOString() } : a))
              : [...state.adrs, { ...adr, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
            return { adrs: updated, lastSavedAt: formatNow(), syncStatus: "unsaved" };
          }),
        deleteAdrItem: (id) =>
          set((state) => ({
            adrs: state.adrs.filter((a) => a.id !== id),
            lastSavedAt: formatNow(),
          })),

        // Quality Audit
        latestAudit: null,
        setLatestAudit: (audit) => set({ latestAudit: audit }),

        // Theme & Sync Actions
        toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
        setSyncStatus: (status) => set({ syncStatus: status }),

        // Lock Section against AI modification
        toggleSectionLock: (sectionId) =>
          set((state) => ({
            currentProject: {
              ...state.currentProject,
              documentSections: state.currentProject.documentSections.map((sec) =>
                sec.id === sectionId ? { ...sec, isLocked: !sec.isLocked } : sec
              ),
            },
            lastSavedAt: formatNow(),
          })),

      // Save/Upsert Current Project into Drafts List
      saveCurrentProjectToDrafts: () => {
        const { currentProject, savedProjects } = get();
        const existingIdx = savedProjects.findIndex((p) => p.id === currentProject.id);

        const summary: SavedProjectSummary = {
          id: currentProject.id,
          title: currentProject.metadata.title,
          domain: currentProject.requirements.domain,
          designLevel: currentProject.designLevel || "hld",
          lastUpdated: new Date().toLocaleString(),
          sectionCount: currentProject.documentSections.length,
          project: JSON.parse(JSON.stringify(currentProject)),
        };

        let updatedList: SavedProjectSummary[] = [];
        if (existingIdx >= 0) {
          updatedList = [...savedProjects];
          updatedList[existingIdx] = summary;
        } else {
          updatedList = [summary, ...savedProjects];
        }

        set({
          savedProjects: updatedList,
          lastSavedAt: formatNow(),
        });
      },

      loadSavedProject: (projectId) => {
        const { savedProjects } = get();
        const found = savedProjects.find((p) => p.id === projectId);
        if (!found) return;

        set({
          currentProject: JSON.parse(JSON.stringify(found.project)),
          selectedSectionId: found.project.documentSections[0]?.id || null,
          activeTab: "studio",
          lastSavedAt: formatNow(),
        });
      },

      deleteSavedProject: (projectId) => {
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== projectId),
        }));
      },

      duplicateSavedProject: (projectId) => {
        const { savedProjects } = get();
        const found = savedProjects.find((p) => p.id === projectId);
        if (!found) return;

        const newId = "proj_" + Math.random().toString(36).substring(2, 9);
        const clonedProject: DesignDocProject = {
          ...JSON.parse(JSON.stringify(found.project)),
          id: newId,
          metadata: {
            ...found.project.metadata,
            title: `${found.project.metadata.title} (Copy)`,
            lastUpdated: new Date().toISOString().split("T")[0],
          },
        };

        const clonedSummary: SavedProjectSummary = {
          id: newId,
          title: clonedProject.metadata.title,
          domain: clonedProject.requirements.domain,
          designLevel: clonedProject.designLevel || "hld",
          lastUpdated: new Date().toLocaleString(),
          sectionCount: clonedProject.documentSections.length,
          project: clonedProject,
        };

        set((state) => ({
          savedProjects: [clonedSummary, ...state.savedProjects],
        }));
      },

      updateSavedProject: (projectId, partial) => {
        set((state) => {
          const updatedDrafts = state.savedProjects.map((p) => {
            if (p.id !== projectId) return p;

            const updatedProject: DesignDocProject = {
              ...p.project,
              metadata: {
                ...p.project.metadata,
                title: partial.title !== undefined ? partial.title : p.project.metadata.title,
                lastUpdated: new Date().toISOString().split("T")[0],
              },
              requirements: {
                ...p.project.requirements,
                domain: partial.domain !== undefined ? partial.domain : p.project.requirements.domain,
              },
              designLevel: partial.designLevel !== undefined ? partial.designLevel : p.project.designLevel,
            };

            // If title changed, sync across document sections
            if (partial.title && partial.title.trim() && partial.title !== p.title) {
              updatedProject.documentSections = syncTitleAcrossSections(
                updatedProject.documentSections,
                p.title,
                partial.title.trim()
              );
            }

            return {
              ...p,
              title: partial.title !== undefined ? partial.title : p.title,
              domain: partial.domain !== undefined ? partial.domain : p.domain,
              designLevel: partial.designLevel !== undefined ? partial.designLevel : p.designLevel,
              lastUpdated: new Date().toLocaleString(),
              project: updatedProject,
            };
          });

          // If the edited draft is the currently active project, update currentProject too
          let nextCurrent = state.currentProject;
          if (state.currentProject.id === projectId) {
            const found = updatedDrafts.find((p) => p.id === projectId);
            if (found) {
              nextCurrent = JSON.parse(JSON.stringify(found.project));
            }
          }

          return {
            savedProjects: updatedDrafts,
            currentProject: nextCurrent,
            lastSavedAt: formatNow(),
          };
        });
      },

      createNewProject: (title, domain, level = "hld") => {
        // Auto-save current project before starting fresh
        get().saveCurrentProjectToDrafts();

        const fresh = createBlankProject(title, domain, level);
        set({
          currentProject: fresh,
          activeStep: 1,
          activeTab: "wizard",
          selectedSectionId: fresh.documentSections[0]?.id || null,
          selectedSectionIds: [],
          lastSavedAt: formatNow(),
        });

        // Add the new project to drafts
        get().saveCurrentProjectToDrafts();
      },

      setDesignLevel: (level, regenerate = false) => {
        set((state) => {
          const updatedProject: DesignDocProject = {
            ...state.currentProject,
            designLevel: level,
          };

          if (regenerate) {
            const newSections = generateStandardDocument(updatedProject, level);
            return {
              currentProject: {
                ...updatedProject,
                documentSections: newSections,
              },
              selectedSectionId: newSections[0]?.id || null,
              lastSavedAt: formatNow(),
            };
          }

          return { currentProject: updatedProject, lastSavedAt: formatNow() };
        });
      },

      setProject: (partial) =>
        set((state) => ({
          currentProject: { ...state.currentProject, ...partial },
          lastSavedAt: formatNow(),
        })),

      updateMetadata: (metadata) =>
        set((state) => {
          const prevTitle = state.currentProject.metadata.title;
          const newTitle = metadata.title;

          let updatedSections = state.currentProject.documentSections;
          if (newTitle && newTitle.trim() && newTitle !== prevTitle) {
            updatedSections = syncTitleAcrossSections(updatedSections, prevTitle, newTitle.trim());
          }

          const updatedProject = {
            ...state.currentProject,
            metadata: {
              ...state.currentProject.metadata,
              ...metadata,
              lastUpdated: new Date().toISOString().split("T")[0],
            },
            documentSections: updatedSections,
          };

          return {
            currentProject: updatedProject,
            lastSavedAt: formatNow(),
          };
        }),

      updateRequirements: (reqs) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            requirements: {
              ...state.currentProject.requirements,
              ...reqs,
            },
          },
          lastSavedAt: formatNow(),
        })),

      updateRecommendations: (recs) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            recommendations: {
              ...state.currentProject.recommendations,
              ...recs,
            },
          },
          lastSavedAt: formatNow(),
        })),

      updateSectionContent: (id, contentMarkdown) =>
        set((state) => {
          const updatedSections = state.currentProject.documentSections.map((sec) =>
            sec.id === id ? { ...sec, contentMarkdown, updatedAt: new Date().toISOString() } : sec
          );
          const currentDocs = state.currentProject.documents ? [...state.currentProject.documents] : [];
          const activeDocIdx = currentDocs.findIndex(
            (d) => d.id === state.currentProject.activeDocumentId || d.type === state.activeDocumentType
          );
          if (activeDocIdx >= 0) {
            currentDocs[activeDocIdx] = {
              ...currentDocs[activeDocIdx],
              sections: updatedSections,
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            currentProject: {
              ...state.currentProject,
              documentSections: updatedSections,
              documents: currentDocs.length > 0 ? currentDocs : state.currentProject.documents,
            },
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          };
        }),

      updateSectionTitle: (id, title) =>
        set((state) => {
          const updatedSections = state.currentProject.documentSections.map((sec) =>
            sec.id === id ? { ...sec, title, updatedAt: new Date().toISOString() } : sec
          );
          const currentDocs = state.currentProject.documents ? [...state.currentProject.documents] : [];
          const activeDocIdx = currentDocs.findIndex(
            (d) => d.id === state.currentProject.activeDocumentId || d.type === state.activeDocumentType
          );
          if (activeDocIdx >= 0) {
            currentDocs[activeDocIdx] = {
              ...currentDocs[activeDocIdx],
              sections: updatedSections,
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            currentProject: {
              ...state.currentProject,
              documentSections: updatedSections,
              documents: currentDocs.length > 0 ? currentDocs : state.currentProject.documents,
            },
            lastSavedAt: formatNow(),
            syncStatus: "unsaved",
          };
        }),

      reorderSections: (newSections) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: newSections,
          },
          lastSavedAt: formatNow(),
        })),

      addSection: (
        title,
        contentMarkdown = "",
        position = "end",
        referenceSectionId,
        level = "common",
        phase = "Custom Sections"
      ) =>
        set((state) => {
          const newId = "sec-custom-" + Math.random().toString(36).substring(2, 7);
          const newSection: DocumentSection = {
            id: newId,
            title,
            level,
            phase,
            contentMarkdown:
              contentMarkdown ||
              `## ${title}\n\nAdd technical specifications, architecture diagrams, or operational procedures here.`,
          };

          const currentSections = [...state.currentProject.documentSections];
          let updatedSections: DocumentSection[] = [];

          if (position === "start") {
            updatedSections = [newSection, ...currentSections];
          } else if (position === "before" && referenceSectionId) {
            const idx = currentSections.findIndex((s) => s.id === referenceSectionId);
            if (idx >= 0) {
              currentSections.splice(idx, 0, newSection);
              updatedSections = currentSections;
            } else {
              updatedSections = [...currentSections, newSection];
            }
          } else if (position === "after" && referenceSectionId) {
            const idx = currentSections.findIndex((s) => s.id === referenceSectionId);
            if (idx >= 0) {
              currentSections.splice(idx + 1, 0, newSection);
              updatedSections = currentSections;
            } else {
              updatedSections = [...currentSections, newSection];
            }
          } else {
            updatedSections = [...currentSections, newSection];
          }

          return {
            currentProject: {
              ...state.currentProject,
              documentSections: updatedSections,
            },
            selectedSectionId: newId,
            selectedSectionIds: [...state.selectedSectionIds, newId],
            lastSavedAt: formatNow(),
          };
        }),

      deleteSection: (id) =>
        set((state) => {
          const remaining = state.currentProject.documentSections.filter((sec) => sec.id !== id);
          return {
            currentProject: {
              ...state.currentProject,
              documentSections: remaining,
            },
            selectedSectionIds: state.selectedSectionIds.filter((sId) => sId !== id),
            selectedSectionId:
              state.selectedSectionId === id ? remaining[0]?.id || null : state.selectedSectionId,
            lastSavedAt: formatNow(),
          };
        }),

      toggleSectionSelection: (id) =>
        set((state) => {
          const exists = state.selectedSectionIds.includes(id);
          const next = exists
            ? state.selectedSectionIds.filter((sId) => sId !== id)
            : [...state.selectedSectionIds, id];
          return { selectedSectionIds: next };
        }),

      loadPresetTemplate: (templateId, level) => {
        const found = PRESET_TEMPLATES.find((t) => t.id === templateId);
        if (!found) return;

        const targetLevel: DesignLevel = level || get().currentProject.designLevel || "hld";

        const baseProject: Omit<DesignDocProject, "documentSections"> = {
          id: "proj_" + Math.random().toString(36).substring(2, 9),
          designLevel: targetLevel,
          metadata: {
            title: found.title,
            version: "1.0.0",
            authors: ["Principal Software Architect", "Tech Lead"],
            status: "Draft",
            lastUpdated: new Date().toISOString().split("T")[0],
          },
          requirements: { ...found.requirements },
          recommendations: { ...found.recommendations },
        };

        const documentSections = generateStandardDocument(baseProject, targetLevel);

        set({
          currentProject: {
            ...baseProject,
            documentSections,
          },
          selectedSectionId: documentSections[0]?.id || null,
          selectedSectionIds: [],
          activeStep: 1,
          activeTab: "wizard",
          lastSavedAt: formatNow(),
        });
      },

      startBlankProject: (title, domain, level = "hld") => {
        const fresh = createBlankProject(title, domain, level);
        set({
          currentProject: fresh,
          activeStep: 1,
          activeTab: "wizard",
          selectedSectionId: fresh.documentSections[0]?.id || null,
          selectedSectionIds: [],
          lastSavedAt: formatNow(),
        });
      },

      saveCurrentAsTemplate: (customTitle, customDesc) =>
        set((state) => ({
          customTemplates: [
            ...state.customTemplates,
            {
              id: "custom-tpl-" + Date.now(),
              title: customTitle || state.currentProject.metadata.title,
              description: customDesc || "Saved custom architecture document template.",
              savedAt: new Date().toLocaleDateString(),
              project: JSON.parse(JSON.stringify(state.currentProject)),
            },
          ],
          lastSavedAt: formatNow(),
        })),

      deleteCustomTemplate: (templateId) =>
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== templateId),
        })),

      setActiveStep: (step) => set({ activeStep: step }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setStudioViewMode: (mode) => set({ studioViewMode: mode }),
      setSelectedSectionId: (id) => set({ selectedSectionId: id }),
      setIsGenerating: (val) => set({ isGenerating: val }),
      setApiSettings: (settings) =>
        set((state) => ({
          apiSettings: { ...state.apiSettings, ...settings },
        })),

      regenerateDocumentSections: (level) => {
        const { currentProject, selectedSectionIds } = get();
        const targetLevel: DesignLevel = level || currentProject.designLevel || "hld";
        const newSections = generateStandardDocument(
          {
            ...currentProject,
            designLevel: targetLevel,
            selectedSectionIds,
          },
          targetLevel
        );

        // Preserve locked sections against automatic changes
        const mergedSections = newSections.map((newSec) => {
          const existing = currentProject.documentSections.find((s) => s.id === newSec.id);
          if (existing && existing.isLocked) {
            return existing;
          }
          return newSec;
        });

        set((state) => ({
          currentProject: {
            ...state.currentProject,
            designLevel: targetLevel,
            documentSections: mergedSections,
          },
          selectedSectionId: mergedSections[0]?.id || null,
          lastSavedAt: formatNow(),
        }));
      },

      resetProject: () => {
        const fresh = createInitialProject();
        set({
          currentProject: fresh,
          activeStep: 1,
          activeTab: "wizard",
          selectedSectionId: fresh.documentSections[0]?.id || null,
          selectedSectionIds: [],
          lastSavedAt: formatNow(),
        });
      },
    };
  },
  {
    name: "docarch-ai-storage-v1",
      partialize: (state) => ({
        currentProject: state.currentProject,
        savedProjects: state.savedProjects,
        activeTab: state.activeTab,
        activeStep: state.activeStep,
        selectedSectionId: state.selectedSectionId,
        studioViewMode: state.studioViewMode,
        customTemplates: state.customTemplates,
        apiSettings: state.apiSettings,
        diagrams: state.diagrams,
        workflows: state.workflows,
        requirements: state.requirements,
        traceLinks: state.traceLinks,
        adrs: state.adrs,
        theme: state.theme,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);
