import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DesignDocProject, DocumentSection, DesignLevel, SavedProjectSummary } from "@/types";
import { PRESET_TEMPLATES, ARCHITECTURE_PATTERNS } from "@/lib/templates";
import { generateStandardDocument, syncTitleAcrossSections } from "@/lib/doc-generator";

interface DocState {
  currentProject: DesignDocProject;
  savedProjects: SavedProjectSummary[];
  lastSavedAt: string;
  activeStep: number;
  activeTab: "wizard" | "recommender" | "studio" | "templates";
  studioViewMode: "split" | "preview" | "editor";
  selectedSectionId: string | null;
  isGenerating: boolean;
  selectedSectionIds: string[];
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

  // Actions
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
  setActiveTab: (tab: "wizard" | "recommender" | "studio" | "templates") => void;
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

  return {
    ...baseProject,
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

  return {
    ...baseProject,
    documentSections: generateStandardDocument(baseProject, level),
  };
};

function formatNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      currentProject: createInitialProject(),
      savedProjects: [],
      lastSavedAt: formatNow(),
      activeStep: 1,
      activeTab: "wizard",
      studioViewMode: "split",
      selectedSectionId: "hld-exec-summary",
      isGenerating: false,
      selectedSectionIds: [],
      apiSettings: {
        provider: "builtin",
        apiKey: "",
        modelName: "gemini-1.5-pro",
      },
      customTemplates: [],

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
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: state.currentProject.documentSections.map((sec) =>
              sec.id === id ? { ...sec, contentMarkdown } : sec
            ),
          },
          lastSavedAt: formatNow(),
        })),

      updateSectionTitle: (id, title) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: state.currentProject.documentSections.map((sec) =>
              sec.id === id ? { ...sec, title } : sec
            ),
          },
          lastSavedAt: formatNow(),
        })),

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

        set((state) => ({
          currentProject: {
            ...state.currentProject,
            designLevel: targetLevel,
            documentSections: newSections,
          },
          selectedSectionId: newSections[0]?.id || null,
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
    }),
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
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);
