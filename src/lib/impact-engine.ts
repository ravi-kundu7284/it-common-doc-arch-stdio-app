import { DesignDocProject, RequirementItem, TraceLink, ImpactAnalysisResult } from "@/types";

/**
 * Requirements Traceability & Change Impact Analysis Engine
 */
export function analyzeRequirementChange(
  project: DesignDocProject,
  requirement: RequirementItem,
  changedDescription: string,
  existingTraceLinks: TraceLink[] = []
): ImpactAnalysisResult {
  const reqLinks = existingTraceLinks.filter((l) => l.requirement_id === requirement.id || (l as any).requirementId === requirement.id);

  const impactedComponents: Set<string> = new Set();
  const impactedDiagrams: Set<string> = new Set();
  const impactedApis: Set<string> = new Set();
  const impactedSections: Set<string> = new Set();
  const proposedUpdates: ImpactAnalysisResult["proposedUpdates"] = [];

  // 1. Direct trace links
  for (const link of reqLinks) {
    if (link.targetType === "component") impactedComponents.add(link.targetTitle);
    if (link.targetType === "diagram") impactedDiagrams.add(link.targetTitle);
    if (link.targetType === "api") impactedApis.add(link.targetTitle);
    if (link.targetType === "section") impactedSections.add(link.targetTitle);
  }

  // 2. Keyword & semantic heuristic matching across sections
  const reqKeywords = `${requirement.title} ${requirement.description} ${changedDescription}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !["system", "service", "application", "should", "using", "which", "their"].includes(w));

  const uniqueKeywords = Array.from(new Set(reqKeywords));

  // Scan project document sections
  for (const section of project.documentSections || []) {
    const secLower = `${section.title}\n${section.contentMarkdown}`.toLowerCase();
    const matches = uniqueKeywords.filter((kw) => secLower.includes(kw));

    // If section matches key terms or was explicitly traced
    if (matches.length >= 1 || impactedSections.has(section.title)) {
      impactedSections.add(section.title);

      // Check if section contains Mermaid diagrams
      if (secLower.includes("```mermaid")) {
        impactedDiagrams.add(`${section.title} Architecture Diagram`);
      }

      // Check if section defines APIs
      if (secLower.includes("post /") || secLower.includes("get /") || secLower.includes("endpoint") || secLower.includes("api contract")) {
        impactedApis.add(`${section.title} API Contract`);
      }

      // Generate proposed update
      proposedUpdates.push({
        sectionId: section.id,
        sectionTitle: section.title,
        currentSummary: `Matches keywords: ${matches.slice(0, 3).join(", ")}`,
        proposedChange: `Review and align with requirement ${requirement.stableId}: "${changedDescription.slice(0, 100)}..."`,
      });
    }
  }

  // Fallbacks if no matches found
  if (impactedComponents.size === 0) {
    impactedComponents.add(project.recommendations?.selectedPattern || "Core Business Domain");
  }
  if (impactedSections.size === 0 && project.documentSections?.length) {
    impactedSections.add(project.documentSections[0].title);
  }

  return {
    requirementId: requirement.id,
    stableId: requirement.stableId,
    changeDescription: changedDescription,
    impactedComponents: Array.from(impactedComponents),
    impactedDiagrams: Array.from(impactedDiagrams),
    impactedApis: Array.from(impactedApis),
    impactedSections: Array.from(impactedSections),
    proposedUpdates,
  };
}

/**
 * Builds a comprehensive Traceability Matrix comparing all requirements against architecture components, diagrams, and sections.
 */
export function buildTraceabilityMatrix(
  requirements: RequirementItem[],
  traceLinks: TraceLink[],
  project: DesignDocProject
) {
  return requirements.map((req) => {
    const links = traceLinks.filter((l) => l.requirement_id === req.id || (l as any).requirementId === req.id);
    const components = links.filter((l) => l.targetType === "component").map((l) => l.targetTitle);
    const diagrams = links.filter((l) => l.targetType === "diagram").map((l) => l.targetTitle);
    const apis = links.filter((l) => l.targetType === "api").map((l) => l.targetTitle);
    const sections = links.filter((l) => l.targetType === "section").map((l) => l.targetTitle);
    const testCases = links.filter((l) => l.targetType === "test_case").map((l) => l.targetTitle);

    const hasCoverage = components.length > 0 || diagrams.length > 0 || sections.length > 0;

    return {
      id: req.id,
      stableId: req.stableId,
      title: req.title,
      category: req.category,
      priority: req.priority,
      status: req.status,
      components,
      diagrams,
      apis,
      sections,
      testCases,
      coverageStatus: hasCoverage ? "Covered" : "Unmapped Gap",
    };
  });
}
