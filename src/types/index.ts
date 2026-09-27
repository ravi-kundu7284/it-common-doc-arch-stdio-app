import { z } from "zod";

export interface DesignDocProject {
  id: string;
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
  documentSections: {
    id: string;
    title: string;
    contentMarkdown: string;
    mermaidDiagrams?: string[];
  }[];
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
