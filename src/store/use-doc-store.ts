import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DesignDocProject } from "@/types";
import { PRESET_TEMPLATES } from "@/lib/templates";
import { generateStandardDocument } from "@/lib/doc-generator";

interface DocState {
  currentProject: DesignDocProject;
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
  setProject: (project: Partial<DesignDocProject>) => void;
  updateMetadata: (metadata: Partial<DesignDocProject["metadata"]>) => void;
  updateRequirements: (requirements: Partial<DesignDocProject["requirements"]>) => void;
  updateRecommendations: (recommendations: Partial<DesignDocProject["recommendations"]>) => void;
  updateSectionContent: (id: string, contentMarkdown: string) => void;
  updateSectionTitle: (id: string, title: string) => void;
  reorderSections: (newSections: DesignDocProject["documentSections"]) => void;
  addSection: (title: string, contentMarkdown?: string) => void;
  deleteSection: (id: string) => void;
  toggleSectionSelection: (id: string) => void;
  loadPresetTemplate: (templateId: string) => void;
  saveCurrentAsTemplate: (customTitle: string, customDesc: string) => void;
  deleteCustomTemplate: (templateId: string) => void;
  setActiveStep: (step: number) => void;
  setActiveTab: (tab: "wizard" | "recommender" | "studio" | "templates") => void;
  setStudioViewMode: (mode: "split" | "preview" | "editor") => void;
  setSelectedSectionId: (id: string | null) => void;
  setIsGenerating: (val: boolean) => void;
  setApiSettings: (settings: Partial<DocState["apiSettings"]>) => void;
  regenerateDocumentSections: () => void;
  resetProject: () => void;
}

const DEFAULT_SECTIONS = [
  "sec-exec-summary",
  "sec-architecture-overview",
  "sec-component-design",
  "sec-data-modeling",
  "sec-workflows-sequence",
  "sec-cross-cutting",
  "sec-infrastructure-deployment",
  "sec-tradeoffs-alternatives",
];

const initialTemplate = PRESET_TEMPLATES[0];

const createInitialProject = (): DesignDocProject => {
  const baseProject: Omit<DesignDocProject, "documentSections"> = {
    id: "proj_" + Math.random().toString(36).substring(2, 9),
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
    documentSections: generateStandardDocument(baseProject),
  };
};

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      currentProject: createInitialProject(),
      activeStep: 1,
      activeTab: "wizard",
      studioViewMode: "split",
      selectedSectionId: "sec-exec-summary",
      isGenerating: false,
      selectedSectionIds: DEFAULT_SECTIONS,
      apiSettings: {
        provider: "builtin",
        apiKey: "",
        modelName: "gemini-1.5-pro",
      },
      customTemplates: [],

      setProject: (partial) =>
        set((state) => ({
          currentProject: { ...state.currentProject, ...partial },
        })),

      updateMetadata: (metadata) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            metadata: {
              ...state.currentProject.metadata,
              ...metadata,
              lastUpdated: new Date().toISOString().split("T")[0],
            },
          },
        })),

      updateRequirements: (reqs) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            requirements: {
              ...state.currentProject.requirements,
              ...reqs,
            },
          },
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
        })),

      updateSectionContent: (id, contentMarkdown) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: state.currentProject.documentSections.map((sec) =>
              sec.id === id ? { ...sec, contentMarkdown } : sec
            ),
          },
        })),

      updateSectionTitle: (id, title) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: state.currentProject.documentSections.map((sec) =>
              sec.id === id ? { ...sec, title } : sec
            ),
          },
        })),

      reorderSections: (newSections) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: newSections,
          },
        })),

      addSection: (title, contentMarkdown = "") =>
        set((state) => {
          const newId = "sec-custom-" + Math.random().toString(36).substring(2, 7);
          return {
            currentProject: {
              ...state.currentProject,
              documentSections: [
                ...state.currentProject.documentSections,
                {
                  id: newId,
                  title,
                  contentMarkdown:
                    contentMarkdown || `## ${title}\n\nAdd technical specifications, operational procedures, or metrics here.`,
                },
              ],
            },
            selectedSectionId: newId,
            selectedSectionIds: [...state.selectedSectionIds, newId],
          };
        }),

      deleteSection: (id) =>
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: state.currentProject.documentSections.filter((sec) => sec.id !== id),
          },
          selectedSectionIds: state.selectedSectionIds.filter((sId) => sId !== id),
          selectedSectionId:
            state.selectedSectionId === id
              ? state.currentProject.documentSections[0]?.id || null
              : state.selectedSectionId,
        })),

      toggleSectionSelection: (id) =>
        set((state) => {
          const exists = state.selectedSectionIds.includes(id);
          const next = exists
            ? state.selectedSectionIds.filter((sId) => sId !== id)
            : [...state.selectedSectionIds, id];
          return { selectedSectionIds: next };
        }),

      loadPresetTemplate: (templateId) => {
        const found = PRESET_TEMPLATES.find((t) => t.id === templateId);
        if (!found) return;

        const baseProject: Omit<DesignDocProject, "documentSections"> = {
          id: "proj_" + Math.random().toString(36).substring(2, 9),
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

        const documentSections = generateStandardDocument(baseProject);

        set({
          currentProject: {
            ...baseProject,
            documentSections,
          },
          selectedSectionId: documentSections[0]?.id || null,
          selectedSectionIds: DEFAULT_SECTIONS,
          activeStep: 1,
          activeTab: "wizard",
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

      regenerateDocumentSections: () => {
        const { currentProject, selectedSectionIds } = get();
        const newSections = generateStandardDocument({
          ...currentProject,
          selectedSectionIds,
        });
        set((state) => ({
          currentProject: {
            ...state.currentProject,
            documentSections: newSections,
          },
          selectedSectionId: newSections[0]?.id || null,
        }));
      },

      resetProject: () => {
        const fresh = createInitialProject();
        set({
          currentProject: fresh,
          activeStep: 1,
          activeTab: "wizard",
          selectedSectionId: fresh.documentSections[0]?.id || null,
          selectedSectionIds: DEFAULT_SECTIONS,
        });
      },
    }),
    {
      name: "docarch-ai-storage-v1",
      partialize: (state) => ({
        currentProject: state.currentProject,
        customTemplates: state.customTemplates,
        apiSettings: state.apiSettings,
      }),
    }
  )
);
