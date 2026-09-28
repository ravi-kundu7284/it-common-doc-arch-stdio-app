"use client";

import React, { useState, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { MarkdownViewer } from "./markdown-viewer";
import { DesignLevel } from "@/types";
import {
  FileText,
  Eye,
  Columns,
  Code2,
  RefreshCw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Download,
  Copy,
  Check,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Layers,
  Cpu,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Filter,
  FolderKanban,
} from "lucide-react";
import { generateStandaloneHtml, generateRawMarkdown, downloadFile } from "@/lib/export-engine";
import { ProjectsModal } from "./projects-modal";

const SAMPLE_DIAGRAM_SNIPPETS = {
  sequence: `\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway
    participant Core as Core Domain Service
    participant DB as Distributed DB
    participant Bus as Kafka Broker

    Client->>GW: POST /api/v1/resource
    GW->>Core: Forward Authenticated gRPC
    Core->>DB: Begin ACID Transaction
    DB-->>Core: Commit Success
    Core->>Bus: Emit DOMAIN_EVENT
    Core-->>GW: Result Payload
    GW-->>Client: 201 Created
\`\`\``,
  c4: `\`\`\`mermaid
flowchart TD
    User["End User / Client App"]
    Edge["Edge CDN & Ingress Gateway"]
    Svc1["Auth & Identity Service"]
    Svc2["Core Business Domain"]
    DB[("High-Availability Storage")]

    User -->|"HTTPS (TLS 1.3)"| Edge
    Edge -->|"gRPC Routing"| Svc1
    Edge -->|"gRPC Routing"| Svc2
    Svc1 -->|"Verify Tokens"| DB
    Svc2 -->|"State Mutation"| DB
\`\`\``,
  er: `\`\`\`mermaid
erDiagram
    TENANT ||--o{ SUBSCRIPTION : holds
    TENANT {
        uuid id PK
        string company_name
        string plan_tier
    }
    TENANT ||--o{ API_KEY : provisions
    API_KEY {
        uuid id PK
        string key_hash
        string scopes
        timestamp expires_at
    }
\`\`\``,
  topology: `\`\`\`mermaid
graph TD
    Client["Global Traffic (Anycast)"]
    WAF["Cloudflare WAF / Shield"]
    LB["Multi-AZ Load Balancer"]
    K8s["EKS Cluster (Auto-scaling Pods)"]
    DB_Primary["Aurora Primary (Write)"]
    DB_Replica["Aurora Replica (Read)"]

    Client --> WAF --> LB --> K8s
    K8s --> DB_Primary
    DB_Primary -.-> DB_Replica
\`\`\``,
  classDiagram: `\`\`\`mermaid
classDiagram
    class ICommandBus {
        <<interface>>
        +dispatch(command) Result
    }
    class AggregateRoot {
        <<abstract>>
        #id: UUID
        +apply(event)
    }
    class DomainEntity {
        -status: string
        +executeAction()
    }
    AggregateRoot <|-- DomainEntity
\`\`\``,
};

const TEMPLATE_SUGGESTIONS = [
  {
    title: "C4 System Context & Container Model",
    level: "hld" as const,
    content: `## System Architecture & C4 Model\n\n### System Context (Level 1)\nDescribes external users, system boundaries, and partner integrations.\n\n\`\`\`mermaid\nflowchart TD\n    User["Client App"] --> GW["Ingress Gateway"]\n    GW --> Core["Core Domain Engine"]\n\`\`\``,
  },
  {
    title: "Microservice & Domain Decomposition",
    level: "hld" as const,
    content: `## Microservice Decomposition\n\n| Service | Domain Responsibility | Protocol | Storage |\n| :--- | :--- | :--- | :--- |\n| **Ingress Service** | Authentication & Rate Limiting | HTTP/2 | Redis |\n| **Core Domain** | Business Invariants & State | gRPC | PostgreSQL |`,
  },
  {
    title: "Component & Class / Interface Design",
    level: "lld" as const,
    content: `## Component & Class Design\n\n### Design Patterns Applied\n- **Repository Pattern:** Decouples persistence from domain models.\n- **Decorator Pattern:** Middleware instrumentation for tracing.\n\n\`\`\`mermaid\nclassDiagram\n    class IService {\n        <<interface>>\n        +process()\n    }\n\`\`\``,
  },
  {
    title: "Database Schemas & DDL Specifications",
    level: "lld" as const,
    content: `## Database Schemas & DDL\n\n\`\`\`sql\nCREATE TABLE records (\n    id UUID PRIMARY KEY,\n    tenant_id UUID NOT NULL,\n    idempotency_key VARCHAR(128) UNIQUE NOT NULL,\n    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP\n);\n\`\`\``,
  },
  {
    title: "REST / gRPC API Payload Specifications",
    level: "lld" as const,
    content: `## API Endpoint Specifications\n\n### POST /api/v1/commands/execute\n\`\`\`json\n{\n  "idempotencyKey": "idem_001",\n  "action": "MUTATE_STATE",\n  "parameters": {}\n}\n\`\`\``,
  },
  {
    title: "Error Handling & Circuit Breaker Policy",
    level: "lld" as const,
    content: `## Error Handling & Circuit Breakers\n\n- **Retry with Exponential Backoff:** 3 attempts with random jitter.\n- **Circuit Breaker:** Open upon 50% failure rate over 100 requests.`,
  },
];

interface SectionPreviewCardProps {
  section: {
    id: string;
    title: string;
    contentMarkdown: string;
    level?: string;
  };
  isActive: boolean;
}

const SectionPreviewCard = React.memo<SectionPreviewCardProps>(
  ({ section, isActive }) => {
    return (
      <section
        id={section.id}
        className={`scroll-mt-12 transition-all p-4 rounded-2xl ${
          isActive ? "ring-1 ring-indigo-500/40 bg-indigo-950/10" : ""
        }`}
      >
        <MarkdownViewer content={section.contentMarkdown} />
      </section>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.section.id === next.section.id &&
      prev.section.contentMarkdown === next.section.contentMarkdown &&
      prev.section.title === next.section.title
    );
  }
);
SectionPreviewCard.displayName = "SectionPreviewCard";

export const DocumentStudio: React.FC = () => {
  const {
    currentProject,
    selectedSectionId,
    setSelectedSectionId,
    updateSectionContent,
    updateSectionTitle,
    reorderSections,
    addSection,
    deleteSection,
    regenerateDocumentSections,
    setDesignLevel,
    studioViewMode,
    setStudioViewMode,
    updateMetadata,
    apiSettings,
    savedProjects,
    lastSavedAt,
    saveCurrentProjectToDrafts,
  } = useDocStore();

  const { metadata, requirements, recommendations, documentSections, designLevel = "hld" } = currentProject;
  const activeSection =
    documentSections.find((s) => s.id === selectedSectionId) || documentSections[0];

  const [editorText, setEditorText] = useState(activeSection?.contentMarkdown || "");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showSectionList, setShowSectionList] = useState(true);

  // Projects Modal & Auto-save feedback state
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [draftSavedFeedback, setDraftSavedFeedback] = useState(false);

  // Section Filter: "all" | "hld" | "lld"
  const [sectionFilter, setSectionFilter] = useState<"all" | "hld" | "lld">("all");

  // Add Section Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionLevel, setNewSectionLevel] = useState<"hld" | "lld" | "common">("hld");
  const [newSectionPosition, setNewSectionPosition] = useState<"start" | "end" | "before" | "after">("end");
  const [newSectionRefId, setNewSectionRefId] = useState<string>("");
  const [newSectionContent, setNewSectionContent] = useState("");

  // Sync editor when active section changes (external or initial)
  useEffect(() => {
    if (activeSection && editorText !== activeSection.contentMarkdown) {
      setEditorText(activeSection.contentMarkdown);
    }
  }, [activeSection?.id]);

  const handleSelectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    const target = documentSections.find((s) => s.id === sectionId);
    if (target) {
      setEditorText(target.contentMarkdown);
    }
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowSectionList(false);
    }
    // Smooth scroll to target section in preview pane
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  // Sync section filter when design level is changed from Navbar or other triggers
  useEffect(() => {
    if (designLevel === "hld") {
      setSectionFilter("hld");
    } else if (designLevel === "lld") {
      setSectionFilter("lld");
    } else {
      setSectionFilter("all");
    }
  }, [designLevel]);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorText(val);
    if (activeSection) {
      updateSectionContent(activeSection.id, val);
    }
  };

  const handleInsertDiagram = (snippet: string) => {
    const newContent = editorText + "\n\n" + snippet + "\n";
    setEditorText(newContent);
    if (activeSection) {
      updateSectionContent(activeSection.id, newContent);
    }
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...documentSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);
    reorderSections(newSections);
  };

  const openAddModal = (
    position: "start" | "end" | "before" | "after" = "end",
    refId?: string
  ) => {
    setNewSectionPosition(position);
    setNewSectionRefId(refId || activeSection?.id || "");
    setNewSectionTitle("");
    setNewSectionLevel(designLevel === "lld" ? "lld" : "hld");
    setNewSectionContent("");
    setIsAddModalOpen(true);
  };

  const handleConfirmAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    addSection(
      newSectionTitle.trim(),
      newSectionContent.trim(),
      newSectionPosition,
      newSectionRefId,
      newSectionLevel,
      newSectionLevel === "hld" ? "High-Level Architecture" : "Low-Level Specifications"
    );

    setIsAddModalOpen(false);
  };

  const handleAiRefine = async () => {
    if (!aiInstruction.trim() || !activeSection) return;
    setIsAiRefining(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptType: "refine_section",
          projectData: currentProject,
          sectionId: activeSection.id,
          userInstruction: aiInstruction,
          apiSettings,
        }),
      });

      const data = await res.json();
      if (data.success && data.content) {
        setEditorText(data.content);
        updateSectionContent(activeSection.id, data.content);
        setAiInstruction("");
      }
    } catch (err) {
      console.error("AI refine error:", err);
    } finally {
      setIsAiRefining(false);
    }
  };

  const handleExportHtml = () => {
    const html = generateStandaloneHtml(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.html`;
    downloadFile(filename, html, "text/html");
  };

  const handleCopyMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Filtered sections for sidebar navigation
  const filteredSections = documentSections.filter((sec) => {
    if (sectionFilter === "all") return true;
    if (sectionFilter === "hld") return sec.level === "hld" || sec.level === "common" || !sec.level;
    if (sectionFilter === "lld") return sec.level === "lld" || sec.level === "common";
    return true;
  });

  const hldCount = documentSections.filter((s) => s.level === "hld").length;
  const lldCount = documentSections.filter((s) => s.level === "lld").length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Studio Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSectionList(!showSectionList)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title={showSectionList ? "Hide Section Navigator" : "Show Section Navigator"}
          >
            {showSectionList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">Sections ({documentSections.length})</span>
          </button>

          {/* Project Title Input (dynamic live sync) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold hidden md:inline">Document:</span>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => updateMetadata({ title: e.target.value })}
              title="Click to edit document title (automatically synchronizes across all sections)"
              className="bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 focus:border-indigo-500 px-1 py-0.5 font-bold text-slate-200 text-xs w-28 sm:w-52 md:w-72 truncate focus:outline-none"
            />
          </div>

          {/* HLD vs LLD Selection Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              onClick={() => {
                setDesignLevel("hld");
                setSectionFilter("hld");
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                designLevel === "hld"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-emerald-300"
              }`}
              title="High-Level Design (System Context, Topology, Microservices, Scale)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>HLD</span>
            </button>
            <button
              onClick={() => {
                setDesignLevel("lld");
                setSectionFilter("lld");
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                designLevel === "lld"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-indigo-300"
              }`}
              title="Low-Level Design (Classes, DDL Schemas, API Specs, Workflows)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>LLD</span>
            </button>
            <button
              onClick={() => {
                setDesignLevel("full");
                setSectionFilter("all");
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                designLevel === "full"
                  ? "bg-cyan-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-cyan-300"
              }`}
              title="Full System Architecture Specification (HLD + LLD)"
            >
              <span>Full</span>
            </button>
          </div>
        </div>

        {/* View mode toggle & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Regenerate for Active Level */}
          <button
            onClick={() => {
              if (
                confirm(
                  `Re-synthesize all document sections specifically for ${designLevel.toUpperCase()}? This will apply your current project title ("${metadata.title}") and tech stack.`
                )
              ) {
                regenerateDocumentSections(designLevel);
              }
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={`Regenerate ${designLevel.toUpperCase()} Sections`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Align {designLevel.toUpperCase()}</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              onClick={() => setStudioViewMode("split")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                studioViewMode === "split"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Split View (Editor + Live HTML Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              onClick={() => setStudioViewMode("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                studioViewMode === "preview"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Full Preview Only"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
            <button
              onClick={() => setStudioViewMode("editor")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                studioViewMode === "editor"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Full Editor Only"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Editor</span>
            </button>
          </div>

          {/* Drafts & Projects Manager */}
          <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
            <button
              onClick={() => setIsProjectsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Open My Projects & Drafts (Continue where you left off or start new)"
            >
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Drafts</span>
              {savedProjects.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-bold">
                  {savedProjects.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                saveCurrentProjectToDrafts();
                setDraftSavedFeedback(true);
                setTimeout(() => setDraftSavedFeedback(false), 1500);
              }}
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition"
              title="Click to manually snapshot current draft (auto-save is active)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{draftSavedFeedback ? "Saved!" : `Autosaved ${lastSavedAt || "live"}`}</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            title="Copy Full Markdown to Clipboard"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedNotification ? "Copied!" : "Copy"}</span>
          </button>

          <button
            onClick={handleExportHtml}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition"
            title="Download Standalone HTML Bundle"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative pb-14 md:pb-0">
        {/* Mobile Backdrop Overlay */}
        {showSectionList && (
          <div
            onClick={() => setShowSectionList(false)}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs md:hidden"
          />
        )}

        {/* SIDEBAR: Sections List (Collapsible on Desktop, Off-canvas Drawer on Mobile) */}
        {showSectionList && (
          <aside className="fixed inset-y-16 left-0 z-30 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl md:relative md:inset-y-0 md:z-auto md:shadow-none md:bg-slate-900/70">
            {/* Sidebar Top: Section Filter and Add Button */}
            <div className="p-2.5 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
                  Document Sections ({documentSections.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAddModal("end")}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 transition"
                    title="Add New Custom Section (Start, Mid, or End)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                  <button
                    onClick={() => setShowSectionList(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
                    title="Close Sidebar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-950 text-[10px] font-medium">
                <button
                  onClick={() => setSectionFilter("all")}
                  className={`py-1 rounded text-center transition ${
                    sectionFilter === "all" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All ({documentSections.length})
                </button>
                <button
                  onClick={() => setSectionFilter("hld")}
                  className={`py-1 rounded text-center transition ${
                    sectionFilter === "hld" ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40" : "text-slate-400 hover:text-emerald-300"
                  }`}
                >
                  HLD ({hldCount})
                </button>
                <button
                  onClick={() => setSectionFilter("lld")}
                  className={`py-1 rounded text-center transition ${
                    sectionFilter === "lld" ? "bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/40" : "text-slate-400 hover:text-indigo-300"
                  }`}
                >
                  LLD ({lldCount})
                </button>
              </div>
            </div>

            {/* Quick Add Position Actions */}
            <div className="px-2.5 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Insert at:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openAddModal("start")}
                  className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Add Section at Top of Document"
                >
                  Top
                </button>
                {activeSection && (
                  <>
                    <button
                      onClick={() => openAddModal("before", activeSection.id)}
                      className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title={`Add Section before "${activeSection.title}"`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() => openAddModal("after", activeSection.id)}
                      className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title={`Add Section after "${activeSection.title}"`}
                    >
                      After
                    </button>
                  </>
                )}
                <button
                  onClick={() => openAddModal("end")}
                  className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Add Section at End of Document"
                >
                  End
                </button>
              </div>
            </div>

            {/* Sections Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSections.map((sec, idx) => {
                const isSelected = sec.id === activeSection?.id;
                const globalIndex = documentSections.findIndex((s) => s.id === sec.id);

                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSelectSection(sec.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group text-xs transition ${
                      isSelected
                        ? "bg-indigo-600/20 border border-indigo-500/60 text-white font-medium"
                        : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {globalIndex + 1}.
                      </span>
                      <span className="truncate">{sec.title.replace(/^\d+\.\s*/, "")}</span>
                      {sec.level && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase shrink-0 ${
                            sec.level === "hld"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                              : sec.level === "lld"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-800/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {sec.level}
                        </span>
                      )}
                    </div>

                    {/* Action Controls on Hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModal("before", sec.id);
                        }}
                        className="p-0.5 text-slate-500 hover:text-indigo-300"
                        title="Insert Section Before This"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModal("after", sec.id);
                        }}
                        className="p-0.5 text-slate-500 hover:text-indigo-300"
                        title="Insert Section After This"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(globalIndex, "up");
                        }}
                        disabled={globalIndex === 0}
                        className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(globalIndex, "down");
                        }}
                        disabled={globalIndex === documentSections.length - 1}
                        className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {documentSections.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete section "${sec.title}"?`)) {
                              deleteSection(sec.id);
                            }
                          }}
                          className="p-0.5 text-slate-500 hover:text-red-400"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Bottom Controls */}
            <div className="p-2.5 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Regenerate all sections for ${designLevel.toUpperCase()}? Current manual edits will be re-synthesized based on current project parameters.`
                    )
                  ) {
                    regenerateDocumentSections(designLevel);
                  }
                }}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-synthesize {designLevel.toUpperCase()}</span>
              </button>
            </div>
          </aside>
        )}

        {/* CENTER / LEFT: Markdown Editor (if not preview mode) */}
        {studioViewMode !== "preview" && (
          <div
            className={`flex flex-col bg-slate-950 border-r border-slate-800 ${
              studioViewMode === "split" ? "w-full lg:w-1/2 flex-1 min-h-[50vh] lg:min-h-0" : "w-full flex-1"
            }`}
          >
            {/* Editor Sub-header & Snippet Tools */}
            <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-semibold text-slate-400 shrink-0">Section Title:</span>
                <input
                  type="text"
                  value={activeSection?.title || ""}
                  onChange={(e) => {
                    if (activeSection) {
                      updateSectionTitle(activeSection.id, e.target.value);
                    }
                  }}
                  title="Rename this section"
                  className="bg-transparent border-b border-slate-700 text-indigo-300 font-semibold focus:outline-none focus:border-indigo-400 px-1 py-0.5 flex-1 min-w-0"
                />
              </div>

              {/* Diagram Inserters */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">+ Mermaid:</span>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.sequence)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert Sequence Diagram"
                >
                  Sequence
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.c4)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert C4 Architecture"
                >
                  C4
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.er)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert ERD Schema"
                >
                  ERD
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.topology)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert Cloud Topology"
                >
                  Topology
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.classDiagram)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert Class Diagram"
                >
                  Class
                </button>
              </div>
            </div>

            {/* Markdown Textarea */}
            <div className="flex-1 p-3 overflow-hidden relative">
              <textarea
                value={editorText}
                onChange={handleEditorChange}
                placeholder="Write or edit architecture specifications in Markdown. Full customization supported..."
                className="w-full h-full p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:outline-none resize-none selection:bg-indigo-600/40"
                spellCheck={false}
              />
            </div>

            {/* AI Assistant Bar */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold shrink-0">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Refine:</span>
              </div>
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAiRefine();
                  }
                }}
                placeholder="e.g. Add detailed table schema with indexes, or add retry backoff algorithm..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={isAiRefining || !aiInstruction.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shrink-0"
              >
                {isAiRefining ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isAiRefining ? "Refining..." : "Refine"}</span>
              </button>
            </div>
          </div>
        )}

        {/* RIGHT / MAIN: Live HTML Document Preview with Mermaid */}
        {studioViewMode !== "editor" && (
          <div
            className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-950 transition-all ${
              studioViewMode === "preview"
                ? "max-w-5xl mx-auto w-full"
                : studioViewMode === "split"
                ? "w-full lg:w-1/2 min-h-[50vh] lg:min-h-0"
                : ""
            }`}
          >
            {/* Document Header Card */}
            <div className="mb-10 pb-8 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950 border border-indigo-700/60 text-indigo-300 uppercase tracking-wider">
                  Level: {designLevel.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                  Pattern: {recommendations.selectedPattern}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                  v{metadata.version}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                  Domain: {requirements.domain}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                {metadata.title}
              </h1>
              <p className="text-sm text-slate-400">
                {designLevel === "hld"
                  ? "High-Level Architecture Design & Cloud Topology (HLD)"
                  : designLevel === "lld"
                  ? "Low-Level Implementation Specification & Component Design (LLD)"
                  : "Comprehensive Enterprise Architecture Specification (HLD + LLD)"}
              </p>

              {/* Metadata Key-Value Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Authors</span>
                  <span className="text-slate-200 font-medium">{metadata.authors.join(", ")}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Last Updated</span>
                  <span className="text-slate-200 font-medium">{metadata.lastUpdated}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Target Scale</span>
                  <span className="text-slate-200 font-medium">
                    {requirements.targetScale.rps.toLocaleString()} RPS ({requirements.targetScale.users})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Availability SLA</span>
                  <span className="text-slate-200 font-medium">
                    {requirements.nonFunctionalRequirements.availability}
                  </span>
                </div>
              </div>

              {/* Table of Contents Box */}
              <div className="mt-6 p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs">
                <div className="font-bold text-indigo-300 mb-2 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Table of Contents ({documentSections.length} Sections)</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400">
                    {designLevel.toUpperCase()} Specification
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                  {documentSections.map((sec, idx) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectSection(sec.id);
                      }}
                      className="text-indigo-400 hover:text-indigo-200 truncate transition py-0.5 flex items-center gap-1.5"
                    >
                      <span className="text-slate-500 font-mono text-[10px]">{idx + 1}.</span>
                      <span className="truncate">{sec.title.replace(/^\d+\.\s*/, "")}</span>
                      {sec.level && (
                        <span className="text-[9px] px-1 py-0 rounded bg-slate-800 text-slate-400 uppercase">
                          {sec.level}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Sections Content */}
            <div className="space-y-12">
              {documentSections.map((sec) => (
                <SectionPreviewCard
                  key={sec.id}
                  section={sec}
                  isActive={sec.id === activeSection?.id}
                />
              ))}
            </div>

            {/* Document Footer */}
            <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
              <p>Generated with <strong>DocArch AI Studio</strong> &bull; {designLevel.toUpperCase()} Technical Design</p>
            </footer>
          </div>
        )}
      </div>

      {/* MODAL: Flexible Add Section (Start, Mid, End) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Custom Architecture Section</h3>
                  <p className="text-[11px] text-slate-400">
                    Insert anywhere in the document (Start, Mid, or End)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddSection} className="space-y-4">
              {/* Section Title */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Section Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. 5. Detailed Cache Invalidation & Stampede Mitigation"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Design Level & Insertion Position Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Design Level
                  </label>
                  <select
                    value={newSectionLevel}
                    onChange={(e) => setNewSectionLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="hld">High-Level Design (HLD)</option>
                    <option value="lld">Low-Level Design (LLD)</option>
                    <option value="common">General / Scope</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Position in Document
                  </label>
                  <select
                    value={newSectionPosition}
                    onChange={(e) => setNewSectionPosition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="start">📌 At Start (Beginning)</option>
                    <option value="before">⬆️ Before Selected Section</option>
                    <option value="after">⬇️ After Selected Section</option>
                    <option value="end">🏁 At End (Bottom)</option>
                  </select>
                </div>
              </div>

              {/* Reference Section Selector if before/after */}
              {(newSectionPosition === "before" || newSectionPosition === "after") && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reference Section
                  </label>
                  <select
                    value={newSectionRefId}
                    onChange={(e) => setNewSectionRefId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {documentSections.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {idx + 1}. {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Template Suggestions */}
              <div>
                <span className="block text-slate-400 font-medium mb-1.5 text-[11px]">
                  Or Pick from Standard Templates:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  {TEMPLATE_SUGGESTIONS.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewSectionTitle(t.title);
                        setNewSectionLevel(t.level);
                        setNewSectionContent(t.content);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 text-[10px] transition border border-slate-700"
                    >
                      [{t.level.toUpperCase()}] {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Initial Markdown Content (Optional) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Initial Content (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="## Section Heading&#10;&#10;Add architecture specs or Mermaid diagram..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects and Drafts Modal */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
      />
    </div>
  );
};
