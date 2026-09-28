import { z } from "zod";

export type DesignLevel = "hld" | "lld" | "full";

export interface DocumentSection {
  id: string;
  title: string;
  contentMarkdown: string;
  level?: "hld" | "lld" | "common";
  phase?: string;
  mermaidDiagrams?: string[];
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
  metadata: {
    title: string;
    version: string;
    authors: string[];
    status: "Draft" | "In Review" | "Approved";
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
