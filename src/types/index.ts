import { z } from "zod";

export type DesignLevel = "hld" | "lld" | "full";

export type DocumentType =
  | "overview"
  | "brd"
  | "srs"
  | "hld"
  | "lld"
  | "sad"
  | "adrs"
  | "database"
  | "api"
  | "integration"
  | "security"
  | "deployment"
  | "cicd"
  | "testing"
  | "runbook"
  | "raid"
  | "roadmap";

export type DocumentLifecycleStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";

export interface DocumentReviewComment {
  id: string;
  author: string;
  role: string;
  comment: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  description?: string;
  status: DocumentLifecycleStatus;
  version: string;
  sections: DocumentSection[];
  reviewComments: DocumentReviewComment[];
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiClarifyingQuestion {
  id: string;
  question: string;
  answer?: string;
  impact: string;
}

export interface AiRequirementAnalysis {
  id: string;
  userPrompt: string;
  projectName: string;
  domain: string;
  problemStatement: string;
  businessGoals: string[];
  functionalRequirements: {
    id: string;
    title: string;
    description: string;
    priority: "critical" | "high" | "medium" | "low";
  }[];
  nonFunctionalRequirements: {
    scalability: string;
    availability: string;
    security: string;
    performance: string;
    cost: string;
    compliance: string[];
  };
  assumptions: string[];
  constraints: string[];
  dependencies: string[];
  clarifyingQuestions: AiClarifyingQuestion[];
  recommendedPattern: string;
  recommendedStack: {
    frontend: string;
    backend: string;
    database: string;
    caching: string;
    messaging: string;
    devops: string;
  };
  selectedDocumentTypes: DocumentType[];
}

export interface DocumentSection {
  id: string;
  title: string;
  contentMarkdown: string;
  level?: "hld" | "lld" | "common";
  phase?: string;
  mermaidDiagrams?: string[];
  isLocked?: boolean;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export interface DocumentRevision {
  id: string;
  projectId: string;
  revisionNumber: number;
  title: string;
  snapshot: DesignDocProject;
  author: string;
  comment: string;
  createdAt: string;
}

// Diagram Types & Models
export type DiagramType =
  | "system_context"
  | "container"
  | "component"
  | "cloud_deployment"
  | "network"
  | "uml_class"
  | "sequence"
  | "activity"
  | "data_flow"
  | "erd"
  | "bpmn_workflow"
  | "cicd_pipeline"
  | "event_flow"
  | "state_machine";

export interface VisualNode {
  id: string;
  type?: string;
  label: string;
  subtext?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    shape?: "rectangle" | "rounded" | "cylinder" | "circle" | "cloud" | "diamond";
  };
  metadata?: Record<string, any>;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    dashed?: boolean;
    arrowHead?: boolean;
  };
}

export interface DiagramItem {
  id: string;
  projectId: string;
  title: string;
  diagramType: DiagramType;
  mermaidCode: string;
  visualModel: {
    nodes: VisualNode[];
    edges: VisualEdge[];
    viewport?: { x: number; y: number; zoom: number };
  };
  version: number;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Architecture Workflow Types
export type WorkflowStepType =
  | "trigger"
  | "task"
  | "approval"
  | "condition"
  | "parallel"
  | "failure_path"
  | "compensation"
  | "end";

export interface WorkflowStep {
  id: string;
  title: string;
  type: WorkflowStepType;
  description: string;
  assignee?: string;
  timeoutSeconds?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  isFailurePath?: boolean;
  label?: string;
}

export interface WorkflowItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  steps: WorkflowStep[];
  edges: WorkflowEdge[];
  version: number;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// Requirements Traceability & Impact Analysis
export type RequirementCategory = "business" | "functional" | "non_functional";
export type RequirementStatus = "draft" | "approved" | "implemented" | "verified" | "deprecated";
export type RequirementPriority = "critical" | "high" | "medium" | "low";

export interface TraceLink {
  id: string;
  projectId?: string;
  requirementId?: string;
  requirement_id?: string;
  targetType: "component" | "api" | "data_model" | "diagram" | "test_case" | "section";
  targetId: string;
  targetTitle: string;
}

export interface RequirementItem {
  id: string;
  projectId: string;
  stableId: string; // e.g. BR-001, FR-001, NFR-001
  title: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  status: RequirementStatus;
  description: string;
  acceptanceCriteria: string[];
  traceLinks: TraceLink[];
  createdAt: string;
  updatedAt: string;
}

export interface ImpactAnalysisResult {
  requirementId: string;
  stableId: string;
  changeDescription: string;
  impactedComponents: string[];
  impactedDiagrams: string[];
  impactedApis: string[];
  impactedSections: string[];
  proposedUpdates: {
    sectionId: string;
    sectionTitle: string;
    currentSummary: string;
    proposedChange: string;
  }[];
}

// Architecture Decision Records (ADR)
export type AdrStatus = "proposed" | "accepted" | "rejected" | "deprecated" | "superseded";

export interface AdrOption {
  option: string;
  pros: string[];
  cons: string[];
}

export interface AdrItem {
  id: string;
  projectId: string;
  stableId: string; // e.g. ADR-001
  title: string;
  status: AdrStatus;
  context: string;
  decisionDrivers: string[];
  optionsConsidered: AdrOption[];
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  risks: string[];
  relatedRequirementIds: string[];
  relatedDiagramIds: string[];
  author: string;
  reviewers: string[];
  supersededBy?: string; // id or stableId of superseding ADR
  createdAt: string;
  updatedAt: string;
}

// Architecture Quality & Validation Engine
export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingCategory =
  | "scalability"
  | "security"
  | "reliability"
  | "coupling"
  | "data_consistency"
  | "observability"
  | "cost"
  | "compliance";
export type FindingStatus = "open" | "accepted" | "fixed" | "dismissed";

export interface ArchitectureFinding {
  id: string;
  stableId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  component: string;
  title: string;
  description: string;
  whyItMatters: string;
  remediation: string;
  tradeOffs: string;
  confidence: number; // 0 - 100
  status: FindingStatus;
}

export interface ArchitectureAuditResult {
  id: string;
  projectId: string;
  overallScore: number; // 0 - 100
  evaluatedAt: string;
  findings: ArchitectureFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixed: number;
  };
}

export interface SavedProjectSummary {
  id: string;
  title: string;
  domain: string;
  designLevel: DesignLevel;
  lastUpdated: string;
  sectionCount: number;
  project: DesignDocProject;
}

export interface DesignDocProject {
  id: string;
  designLevel?: DesignLevel;
  activeDocumentId?: string;
  documents?: DocumentItem[];
  aiAnalysis?: AiRequirementAnalysis;
  metadata: {
    title: string;
    version: string;
    authors: string[];
    status: "Draft" | "In Review" | "Changes Requested" | "Approved" | "Published" | "Archived";
    lastUpdated: string;
  };
  requirements: {
    domain: string;
    targetScale: {
      rps: number;
      users: string;
      dataRetention: string;
    };
    functionalRequirements: string[];
    nonFunctionalRequirements: {
      latency: string;
      availability: string;
      compliance: string[];
    };
    constraints: string[];
  };
  recommendations: {
    selectedPattern: string;
    patternAlternatives: {
      pattern: string;
      reasonNotChosen: string;
    }[];
    stack: {
      frontend: string;
      backend: string;
      database: string;
      caching: string;
      messaging: string;
      devops: string;
    };
  };
  documentSections: DocumentSection[];
}

export interface ArchitecturePatternInfo {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  pros: string[];
  cons: string[];
  idealFor: string[];
  recommendedScale: string;
}

export interface TechStackCatalogItem {
  name: string;
  category: "frontend" | "backend" | "database" | "caching" | "messaging" | "devops";
  typeBadge: string;
  description: string;
  pros: string[];
}

export interface PresetTemplate {
  id: string;
  title: string;
  domain: string;
  badgeColor: string;
  description: string;
  iconName: string;
  requirements: DesignDocProject["requirements"];
  recommendations: DesignDocProject["recommendations"];
}

// Zod validation schemas
export const requirementsFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  domain: z.string().min(2, "Domain is required"),
  targetAudience: z.string().default("Developers and Stakeholders"),
  rps: z.number().min(1, "RPS must be at least 1"),
  users: z.string().min(1, "Expected users/MAU is required"),
  dataRetention: z.string().min(1, "Data retention policy required"),
  functionalRequirements: z.string().min(10, "Please outline at least one or two functional requirements"),
  latency: z.string().min(1, "Latency SLA required (e.g. p99 < 150ms)"),
  availability: z.string().min(1, "Availability SLA required (e.g. 99.99%)"),
  compliance: z.array(z.string()).default([]),
  constraints: z.string().default(""),
});

export type RequirementsFormData = z.infer<typeof requirementsFormSchema>;

export interface TicketComment {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  isStaff: boolean;
}

export type TicketCategory =
  | "bug"
  | "feature"
  | "architecture"
  | "performance"
  | "account"
  | "other";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketStatus = "open" | "in_review" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. TKT-7482
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  userEmail: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
  diagnostics?: {
    projectTitle?: string;
    designLevel?: string;
    browser?: string;
    os?: string;
  };
  comments: TicketComment[];
}

export type FeedbackCategory =
  | "overall"
  | "ai_quality"
  | "diagrams"
  | "export"
  | "templates"
  | "other";

export interface UserFeedback {
  id: string;
  rating: number; // 1 - 5
  category: FeedbackCategory;
  likes: string;
  improvements: string;
  recommendScore: number; // 0 - 10 NPS
  userEmail?: string;
  createdAt: string;
}
