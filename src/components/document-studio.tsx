"use client";

import React, { useState, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { MarkdownViewer } from "./markdown-viewer";
import { DesignLevel, DocumentType, DocumentLifecycleStatus } from "@/types";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  Check,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
  Layers,
  Cpu,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Filter,
  FolderKanban,
  Lock,
  Unlock,
  History,
  GitCompare,
  FileCode,
  CheckCheck,
  Printer,
  Tag,
  MessageSquare,
  FileStack,
  Edit3,
  CheckCircle2,
  Search,
  AlertTriangle,
  Settings,
} from "lucide-react";
import {
  generateStandaloneHtml,
  generateRawMarkdown,
  generateDocxDocument,
  generateStructuredYaml,
  generateStructuredJson,
  downloadFile,
  buildProjectDocumentationPackage,
} from "@/lib/export-engine";
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

const QUICK_AI_PROMPTS = [
  "Simplify this section for non-technical stakeholders",
  "Improve scalability while keeping infrastructure costs low",
  "Convert this monolithic design into a modular monolith",
  "Add authentication and authorization details",
  "Update the deployment architecture for Google Cloud Run",
  "Add failure handling, retry policies, and timeouts",
  "Generate a sequence diagram for the order creation workflow",
  "Compare PostgreSQL and MongoDB for this use case",
  "Review this document for missing security controls",
];

interface SectionPreviewCardProps {
  section: {
    id: string;
    title: string;
    contentMarkdown: string;
    level?: string;
    isLocked?: boolean;
  };
  isActive: boolean;
  sectionIndex: number;
  totalSections: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevTitle?: string;
  nextTitle?: string;
  onSelect: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const SectionPreviewCard = React.memo<SectionPreviewCardProps>(
  ({
    section,
    isActive,
    sectionIndex,
    totalSections,
    hasPrev,
    hasNext,
    prevTitle,
    nextTitle,
    onSelect,
    onPrev,
    onNext,
  }) => {
    return (
      <section
        id={section.id}
        className={`scroll-mt-14 transition-all rounded-2xl border ${
          isActive
            ? "border-indigo-500/50 bg-indigo-950/20 shadow-xl shadow-indigo-950/25 ring-1 ring-indigo-500/30"
            : "border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80"
        } p-4 sm:p-5 space-y-3.5`}
      >
        {/* Section Header Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold shrink-0">
              {sectionIndex + 1}/{totalSections}
            </span>
            <span className="font-bold text-slate-100 truncate">
              {section.title.replace(/^\d+\.\s*/, "")}
            </span>
            {section.level && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold shrink-0">
                {section.level}
              </span>
            )}
            {section.isLocked && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded shrink-0">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )}
          </div>

          {/* Section Action & Moving Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-20 border border-slate-800 text-[11px] font-semibold transition"
              title={hasPrev ? `Previous Section: "${prevTitle}"` : "First Section"}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-20 border border-slate-800 text-[11px] font-semibold transition"
              title={hasNext ? `Next Section: "${nextTitle}"` : "Last Section"}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
              title="Focus and edit this section"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isActive ? "Active in Editor" : "Edit"}</span>
            </button>
          </div>
        </div>

        {/* Rendered Markdown Body */}
        <MarkdownViewer content={section.contentMarkdown} />

        {/* Section Bottom Transition Buttons */}
        <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 disabled:opacity-20 transition truncate max-w-[42%]"
            title={prevTitle ? `Go to: ${prevTitle}` : "Beginning"}
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{prevTitle ? `Prev: ${prevTitle}` : "Start of Document"}</span>
          </button>

          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            Section {sectionIndex + 1} of {totalSections}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 disabled:opacity-20 transition truncate max-w-[42%]"
            title={nextTitle ? `Go to: ${nextTitle}` : "End"}
          >
            <span className="truncate">{nextTitle ? `Next: ${nextTitle}` : "End of Document"}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </section>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.section.id === next.section.id &&
      prev.section.contentMarkdown === next.section.contentMarkdown &&
      prev.section.title === next.section.title &&
      prev.sectionIndex === next.sectionIndex &&
      prev.totalSections === next.totalSections &&
      prev.hasPrev === next.hasPrev &&
      prev.hasNext === next.hasNext
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
    toggleSectionLock,
    setProject,
    activeDocumentType,
    setActiveDocumentType,
    setDocumentLifecycleStatus,
    addDocumentReviewComment,
  } = useDocStore();

  const { metadata, requirements, recommendations, documentSections, designLevel = "hld" } = currentProject;
  const activeSection =
    documentSections.find((s) => s.id === selectedSectionId) || documentSections[0];

  const [editorText, setEditorText] = useState(activeSection?.contentMarkdown || "");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [aiError, setAiError] = useState<{ code?: string; message: string } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showSectionList, setShowSectionList] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"ai" | "lifecycle" | "stats">("ai");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Comment State
  const [commentAuthor, setCommentAuthor] = useState("Enterprise Architect");
  const [commentRole, setCommentRole] = useState("Reviewer");
  const [commentText, setCommentText] = useState("");

  // Diff Modal State (Review AI changes before applying)
  const [diffModal, setDiffModal] = useState<{
    originalText: string;
    proposedText: string;
    sectionId: string;
    sectionTitle: string;
  } | null>(null);

  // Revisions Modal State
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [snapshotComment, setSnapshotComment] = useState("");
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Projects Modal & Auto-save feedback state
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [draftSavedFeedback, setDraftSavedFeedback] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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

  const currentDocList = currentProject.documents || [];
  const currentDocIdx = currentDocList.findIndex(
    (d) => d.id === currentProject.activeDocumentId || d.type === activeDocumentType
  );
  const hasPrevDoc = currentDocIdx > 0;
  const hasNextDoc = currentDocIdx !== -1 && currentDocIdx < currentDocList.length - 1;
  const prevDoc = hasPrevDoc ? currentDocList[currentDocIdx - 1] : null;
  const nextDoc = hasNextDoc ? currentDocList[currentDocIdx + 1] : null;

  const currentSectionIndex = documentSections.findIndex((s) => s.id === activeSection?.id);
  const hasPrevSection = currentSectionIndex > 0;
  const hasNextSection = currentSectionIndex !== -1 && currentSectionIndex < documentSections.length - 1;

  const canMovePrev = hasPrevSection || hasPrevDoc;
  const canMoveNext = hasNextSection || hasNextDoc;

  const handlePrevSection = () => {
    if (hasPrevSection) {
      const prevSection = documentSections[currentSectionIndex - 1];
      handleSelectSection(prevSection.id);
    } else if (hasPrevDoc && prevDoc) {
      setActiveDocumentType(prevDoc.type);
      const targetSec = prevDoc.sections && prevDoc.sections.length > 0
        ? prevDoc.sections[prevDoc.sections.length - 1].id
        : null;
      if (targetSec) {
        setSelectedSectionId(targetSec);
      }
    }
  };

  const handleNextSection = () => {
    if (hasNextSection) {
      const nextSection = documentSections[currentSectionIndex + 1];
      handleSelectSection(nextSection.id);
    } else if (hasNextDoc && nextDoc) {
      setActiveDocumentType(nextDoc.type);
      const targetSec = nextDoc.sections && nextDoc.sections.length > 0
        ? nextDoc.sections[0].id
        : null;
      if (targetSec) {
        setSelectedSectionId(targetSec);
      }
    }
  };

  // Keyboard Navigation: Alt+ArrowLeft for Prev, Alt+ArrowRight for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSection();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSectionIndex, documentSections, currentDocIdx, currentDocList]);

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
    setAiError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          promptType: "refine_section",
          projectData: currentProject,
          sectionId: activeSection.id,
          userInstruction: aiInstruction,
          apiSettings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiError({
          code: data.code || "AI_ERROR",
          message: data.error || "Failed to refine section with OpenAI.",
        });
        return;
      }

      if (data.success && data.content) {
        // Show visual diff modal to inspect changes before applying
        setDiffModal({
          originalText: activeSection.contentMarkdown,
          proposedText: data.content,
          sectionId: activeSection.id,
          sectionTitle: activeSection.title,
        });
        setAiInstruction("");
      }
    } catch (err: any) {
      console.error("AI refine error:", err);
      setAiError({
        code: "NETWORK_ERROR",
        message: err?.message || "Failed to connect to AI generation service.",
      });
    } finally {
      setIsAiRefining(false);
    }
  };

  const handleApplyDiff = () => {
    if (!diffModal) return;
    setEditorText(diffModal.proposedText);
    updateSectionContent(diffModal.sectionId, diffModal.proposedText);
    setDiffModal(null);
  };

  const handleDiscardDiff = () => {
    setDiffModal(null);
  };

  const handleFetchRevisions = async () => {
    try {
      const res = await fetch(`/api/documents/revisions?projectId=${currentProject.id}`);
      const data = await res.json();
      if (data.success) {
        setRevisions(data.revisions || []);
      }
    } catch (e) {
      console.warn("Could not fetch revisions:", e);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsSavingSnapshot(true);
    try {
      const res = await fetch("/api/documents/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          projectId: currentProject.id,
          title: snapshotComment.trim() || `Revision Snapshot (${new Date().toLocaleTimeString()})`,
          comment: snapshotComment.trim(),
          snapshot: currentProject,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSnapshotComment("");
        handleFetchRevisions();
      }
    } catch (e) {
      console.error("Save snapshot error:", e);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleRestoreRevision = async (rev: any) => {
    if (!confirm(`Restore project to Revision #${rev.revision_number} (${rev.title})?`)) return;
    try {
      if (rev.snapshot) {
        setProject(rev.snapshot);
        setIsRevisionsOpen(false);
      }
    } catch (e) {
      console.error("Restore error:", e);
    }
  };

  const handleExportDocx = () => {
    const docx = generateDocxDocument(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.doc`;
    downloadFile(filename, docx, "application/vnd.ms-word");
  };

  const handleExportYaml = () => {
    const yaml = generateStructuredYaml(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.yaml`;
    downloadFile(filename, yaml, "text/yaml");
  };

  const handleExportJson = () => {
    const jsonStr = generateStructuredJson(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.json`;
    downloadFile(filename, jsonStr, "application/json");
  };

  const handleExportHtml = () => {
    const html = generateStandaloneHtml(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.html`;
    downloadFile(filename, html, "text/html");
  };

  const handleExportProjectPackage = () => {
    const files = buildProjectDocumentationPackage(currentProject);
    const manifestContent = files
      .map((f) => `=== FILE: ${f.filename} ===\n\n${f.content}\n\n`)
      .join("\n" + "=".repeat(60) + "\n\n");
    downloadFile(
      `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_project_documentation_package.txt`,
      manifestContent,
      "text/plain"
    );
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleExportMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${designLevel}.md`;
    downloadFile(filename, md, "text/markdown");
  };

  // Filtered sections for sidebar navigation with search
  const filteredSections = documentSections.filter((sec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        sec.title.toLowerCase().includes(q) || sec.contentMarkdown.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (sectionFilter === "all") return true;
    if (sectionFilter === "hld") return sec.level === "hld" || sec.level === "common" || !sec.level;
    if (sectionFilter === "lld") return sec.level === "lld" || sec.level === "common";
    return true;
  });

  const hldCount = documentSections.filter((s) => s.level === "hld").length;
  const lldCount = documentSections.filter((s) => s.level === "lld").length;

  // Stats calculation
  const fullDocumentMarkdown = documentSections.map((s) => s.contentMarkdown).join("\n\n");
  const wordCount = fullDocumentMarkdown.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const currentDocItem = (currentProject.documents || []).find(
    (d) => d.id === currentProject.activeDocumentId || d.type === activeDocumentType
  );
  const currentStatus: DocumentLifecycleStatus = currentDocItem?.status || "draft";

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

          {/* Document Suite Switcher */}
          {currentProject.documents && currentProject.documents.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <FileStack className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={activeDocumentType || "hld"}
                onChange={(e) => setActiveDocumentType(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 max-w-[160px] sm:max-w-[220px] truncate"
                title="Switch active document in project suite"
              >
                {currentProject.documents.map((d) => (
                  <option key={d.id} value={d.type}>
                    {d.title} ({d.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Document Lifecycle Badge */}
          <div className="hidden sm:flex items-center">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                currentStatus === "approved" || currentStatus === "published"
                  ? "bg-emerald-950/80 border-emerald-700/60 text-emerald-300"
                  : currentStatus === "in_review"
                  ? "bg-blue-950/80 border-blue-700/60 text-blue-300"
                  : currentStatus === "changes_requested"
                  ? "bg-rose-950/80 border-rose-700/60 text-rose-300"
                  : "bg-amber-950/80 border-amber-700/60 text-amber-300"
              }`}
            >
              {currentStatus.replace("_", " ")}
            </span>
          </div>

          {/* Project Title Input (dynamic live sync) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold hidden md:inline">Document:</span>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => updateMetadata({ title: e.target.value })}
              title="Click to edit document title (automatically synchronizes across all sections)"
              className="bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 focus:border-indigo-500 px-1 py-0.5 font-bold text-slate-200 text-xs w-24 sm:w-44 md:w-56 truncate focus:outline-none"
            />
          </div>

          {/* HLD vs LLD Selection Mode Switcher */}
          <div className="hidden md:flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
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
                handleFetchRevisions();
                setIsRevisionsOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Document Revision History & Named Snapshots"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Revisions</span>
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

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition"
              title="Download Document (HTML, Word, Markdown, YAML, JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50 text-xs text-slate-200"
                onClick={() => setIsExportMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Export Document As
                </div>
                <button
                  onClick={handleExportDocx}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">Microsoft Word (.doc)</div>
                    <div className="text-[10px] text-slate-400">OpenXML document format</div>
                  </div>
                </button>
                <button
                  onClick={handleExportHtml}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-semibold">Standalone HTML (.html)</div>
                    <div className="text-[10px] text-slate-400">Self-contained responsive view</div>
                  </div>
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Markdown File (.md)</div>
                    <div className="text-[10px] text-slate-400">Full raw markdown bundle</div>
                  </div>
                </button>
                <button
                  onClick={handleExportYaml}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Structured YAML (.yaml)</div>
                    <div className="text-[10px] text-slate-400">CI/CD & Architecture as Code</div>
                  </div>
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-semibold">Structured JSON (.json)</div>
                    <div className="text-[10px] text-slate-400">Machine-readable data spec</div>
                  </div>
                </button>
                <div className="border-t border-slate-800 my-1"></div>
                <button
                  onClick={handlePrintDocument}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Print / Save as PDF</div>
                    <div className="text-[10px] text-slate-400">High-res vector print dialog</div>
                  </div>
                </button>
                <button
                  onClick={handleExportProjectPackage}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-200 transition"
                >
                  <FolderKanban className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Full Project Package (.zip bundle)</div>
                    <div className="text-[10px] text-slate-400">All docs, README manifest & models</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Print button */}
          <button
            onClick={handlePrintDocument}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
            title="Print or Save as PDF (Ctrl+P)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Print</span>
          </button>

          {/* Toggle Right Inspector (AI Assistant & Lifecycle) */}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
              showRightPanel
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title={showRightPanel ? "Hide AI Assistant & Review Inspector" : "Show AI Assistant & Review Inspector"}
          >
            {showRightPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">AI & Review</span>
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
            {/* Sidebar Top: Section Filter, Search and Add Button */}
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

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
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
                      {sec.isLocked && (
                        <span title="Locked against AI overwrites">
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        </span>
                      )}
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
                          toggleSectionLock(sec.id);
                        }}
                        className={`p-0.5 transition ${
                          sec.isLocked
                            ? "text-amber-400 hover:text-amber-300"
                            : "text-slate-500 hover:text-amber-400"
                        }`}
                        title={
                          sec.isLocked
                            ? "Section is Locked. Click to unlock."
                            : "Lock section (protects against AI regeneration)"
                        }
                      >
                        {sec.isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                      </button>
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
                {activeSection && (
                  <button
                    type="button"
                    onClick={() => toggleSectionLock(activeSection.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition border shrink-0 ${
                      activeSection.isLocked
                        ? "bg-amber-950/70 border-amber-600/50 text-amber-300 hover:bg-amber-900/70"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                    title={
                      activeSection.isLocked
                        ? "Section is Locked: AI section alignment will not overwrite this section"
                        : "Section is Unlocked: Click to protect against AI overwrite"
                    }
                  >
                    {activeSection.isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                    <span>{activeSection.isLocked ? "Locked" : "Lock"}</span>
                  </button>
                )}

                {/* Prev / Next Quick Section Navigator */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={handlePrevSection}
                    disabled={!canMovePrev}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
                    title={
                      hasPrevSection
                        ? `Move to previous section (Alt+Left): "${documentSections[currentSectionIndex - 1]?.title}"`
                        : hasPrevDoc
                        ? `Move to previous document (Alt+Left): "${prevDoc?.title}"`
                        : "Already at start of project documentation"
                    }
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-400 px-1.5 border-x border-slate-800 shrink-0">
                    {currentSectionIndex !== -1 ? currentSectionIndex + 1 : 1}/{documentSections.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextSection}
                    disabled={!canMoveNext}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
                    title={
                      hasNextSection
                        ? `Move to next section (Alt+Right): "${documentSections[currentSectionIndex + 1]?.title}"`
                        : hasNextDoc
                        ? `Advance to next document (Alt+Right): "${nextDoc?.title}"`
                        : "Already at end of project documentation"
                    }
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
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

            {/* Section Transition Bar (Prev / Next Section) */}
            <div className="px-3.5 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={!canMovePrev}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-25 disabled:hover:bg-slate-950 disabled:hover:text-slate-400 transition truncate max-w-[42%]"
                title={
                  hasPrevSection
                    ? `Previous (Alt+Left): ${documentSections[currentSectionIndex - 1]?.title}`
                    : hasPrevDoc
                    ? `Previous Document (Alt+Left): ${prevDoc?.title}`
                    : "First section"
                }
              >
                <ChevronLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  {hasPrevSection
                    ? `Prev: ${documentSections[currentSectionIndex - 1]?.title}`
                    : hasPrevDoc
                    ? `Prev Doc: ${prevDoc?.title}`
                    : "First Section"}
                </span>
              </button>

              <div className="text-[11px] text-slate-400 font-mono text-center shrink-0">
                Section {currentSectionIndex !== -1 ? currentSectionIndex + 1 : 1} of {documentSections.length}
              </div>

              <button
                type="button"
                onClick={handleNextSection}
                disabled={!canMoveNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-25 disabled:hover:bg-slate-950 disabled:hover:text-slate-400 transition truncate max-w-[42%]"
                title={
                  hasNextSection
                    ? `Next (Alt+Right): ${documentSections[currentSectionIndex + 1]?.title}`
                    : hasNextDoc
                    ? `Advance to Next Document (Alt+Right): ${nextDoc?.title}`
                    : "Last section"
                }
              >
                <span className="truncate">
                  {hasNextSection
                    ? `Next: ${documentSections[currentSectionIndex + 1]?.title}`
                    : hasNextDoc
                    ? `Next Doc: ${nextDoc?.title}`
                    : "Last Section"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </button>
            </div>

            {/* AI Error Alert Banner */}
            {aiError && (
              <div className="px-3.5 py-2.5 bg-amber-950/40 border-t border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium">{aiError.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const btn = document.querySelector('[data-testid="settings-btn"]') as HTMLElement;
                      if (btn) btn.click();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-400/40 text-[11px] font-bold text-amber-300 transition"
                  >
                    Configure Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiError(null)}
                    className="p-1 hover:text-white text-slate-400 transition"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

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
              {documentSections.map((sec, idx) => {
                const secHasPrev = idx > 0;
                const secHasNext = idx < documentSections.length - 1;
                const prevTitle = secHasPrev ? documentSections[idx - 1].title : undefined;
                const nextTitle = secHasNext ? documentSections[idx + 1].title : undefined;

                return (
                  <SectionPreviewCard
                    key={sec.id}
                    section={sec}
                    isActive={sec.id === activeSection?.id}
                    sectionIndex={idx}
                    totalSections={documentSections.length}
                    hasPrev={secHasPrev}
                    hasNext={secHasNext}
                    prevTitle={prevTitle}
                    nextTitle={nextTitle}
                    onSelect={(id) => handleSelectSection(id)}
                    onPrev={() => {
                      if (secHasPrev) handleSelectSection(documentSections[idx - 1].id);
                    }}
                    onNext={() => {
                      if (secHasNext) handleSelectSection(documentSections[idx + 1].id);
                    }}
                  />
                );
              })}
            </div>

            {/* Document Bottom Navigation Bar (Prev / Next Section) */}
            <div className="mt-12 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={!canMovePrev}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-950 transition font-medium"
                title={
                  hasPrevSection
                    ? `Move to previous section: ${documentSections[currentSectionIndex - 1]?.title}`
                    : hasPrevDoc
                    ? `Move to previous document: ${prevDoc?.title}`
                    : "Already at start of document"
                }
              >
                <ChevronLeft className="w-4 h-4 text-indigo-400" />
                <span className="truncate max-w-xs">
                  {hasPrevSection
                    ? `Prev: ${documentSections[currentSectionIndex - 1]?.title}`
                    : hasPrevDoc
                    ? `Prev Doc: ${prevDoc?.title}`
                    : "First Section"}
                </span>
              </button>

              <div className="text-slate-400 font-mono text-[11px] text-center">
                Viewing Section {currentSectionIndex !== -1 ? currentSectionIndex + 1 : 1} of {documentSections.length}
                <span className="block text-[10px] text-slate-500 mt-0.5">Use Alt+Left / Alt+Right to navigate sections</span>
              </div>

              <button
                type="button"
                onClick={handleNextSection}
                disabled={!canMoveNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-30 transition shadow-md shadow-indigo-600/20"
                title={
                  hasNextSection
                    ? `Move to next section: ${documentSections[currentSectionIndex + 1]?.title}`
                    : hasNextDoc
                    ? `Advance to next document: ${nextDoc?.title}`
                    : "Already at end of document"
                }
              >
                <span className="truncate max-w-xs">
                  {hasNextSection
                    ? `Next: ${documentSections[currentSectionIndex + 1]?.title}`
                    : hasNextDoc
                    ? `Next Doc: ${nextDoc?.title}`
                    : "End of Document"}
                </span>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Document Footer */}
            <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
              <p>Generated with <strong>DocArch AI Studio</strong> &bull; {designLevel.toUpperCase()} Technical Design</p>
            </footer>
          </div>
        )}

        {/* PANEL 3: Collapsible Right Panel (Contextual AI Assistant & Governance Inspector) */}
        {showRightPanel && (
          <aside className="fixed inset-y-16 right-0 z-30 w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl md:relative md:inset-y-0 md:z-auto md:shadow-none md:bg-slate-900/80">
            {/* Header Tabs */}
            <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("ai")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    rightPanelTab === "ai"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Assistant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("lifecycle")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    rightPanelTab === "lifecycle"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Lifecycle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("stats")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    rightPanelTab === "stats"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Stats</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowRightPanel(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Collapse Right Inspector"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: AI Assistant */}
            {rightPanelTab === "ai" && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Target Section:
                  </span>
                  <div className="font-bold text-slate-200 mt-0.5 truncate" title={activeSection?.title}>
                    {activeSection?.title || "No section selected"}
                  </div>
                </div>

                {/* Quick Action Prompt Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Quick AI Architectural Refinements:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_AI_PROMPTS.map((promptText, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAiInstruction(promptText);
                        }}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-slate-300 hover:text-indigo-200 text-left text-[11px] transition leading-tight flex items-start gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                        <span>{promptText}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Instruction Box */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {aiError && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-300 block">AI Notice</span>
                          <span className="text-[11px] leading-tight block text-amber-200/90">{aiError.message}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const btn = document.querySelector('[data-testid="settings-btn"]') as HTMLElement;
                          if (btn) btn.click();
                        }}
                        className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-400/40 text-xs font-bold text-amber-300 transition"
                      >
                        Configure Key in Settings
                      </button>
                    </div>
                  )}

                  <label className="block text-[11px] font-semibold text-slate-300">
                    Custom AI Instruction:
                  </label>
                  <textarea
                    rows={3}
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="e.g. Add multi-AZ failover diagram, or add PCI-DSS tokenization table..."
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiRefine}
                    disabled={isAiRefining || !aiInstruction.trim()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30"
                  >
                    {isAiRefining ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Refining Architecture...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Refine Section with AI (Review Diff)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Document Governance & Lifecycle */}
            {rightPanelTab === "lifecycle" && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
                {/* Status Selector */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Document Lifecycle State
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        setDocumentLifecycleStatus(
                          currentDocItem?.id || activeDocumentType || "hld",
                          e.target.value as any
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="draft">Draft (Work in Progress)</option>
                      <option value="in_review">In Review (Architecture Board)</option>
                      <option value="changes_requested">Changes Requested</option>
                      <option value="approved">Approved (CAB Signed-Off)</option>
                      <option value="published">Published (Production Baseline)</option>
                      <option value="archived">Archived (Superseded)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Governs whether this specification is a preliminary draft or signed-off architecture standard.
                  </p>
                </div>

                {/* Add Review Comment */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Add Architecture Review Note:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Your Name / Role"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
                    />
                    <select
                      value={commentRole}
                      onChange={(e) => setCommentRole(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="Lead Architect">Lead Architect</option>
                      <option value="Security Officer">Security Officer</option>
                      <option value="DevOps / SRE Lead">DevOps / SRE Lead</option>
                      <option value="Product Manager">Product Manager</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="e.g. Approved with condition that RTO is tested before cutover..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      addDocumentReviewComment(
                        currentDocItem?.id || activeDocumentType || "hld",
                        commentAuthor,
                        commentRole,
                        commentText.trim()
                      );
                      setCommentText("");
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                  >
                    Post Review Comment
                  </button>
                </div>

                {/* Comments List */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Review History ({currentDocItem?.reviewComments?.length || 0})
                  </span>
                  {(currentDocItem?.reviewComments || []).map((cmt) => (
                    <div key={cmt.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-slate-200">{cmt.author} ({cmt.role})</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(cmt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1 leading-relaxed">{cmt.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Document Stats & Inspector */}
            {rightPanelTab === "stats" && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Document Metrics
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Words</span>
                      <span className="text-base font-bold text-white">{wordCount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Read Time</span>
                      <span className="text-base font-bold text-white">~{readingTimeMinutes} min</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Sections</span>
                      <span className="text-base font-bold text-white">{documentSections.length}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Locked Sections</span>
                      <span className="text-base font-bold text-amber-400">
                        {documentSections.filter((s) => s.isLocked).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-400 text-[11px]">
                  <p><strong>Project:</strong> {metadata.title}</p>
                  <p><strong>Domain:</strong> {requirements.domain}</p>
                  <p><strong>Pattern:</strong> {recommendations.selectedPattern}</p>
                  <p><strong>Version:</strong> v{metadata.version}</p>
                  <p><strong>Last Updated:</strong> {metadata.lastUpdated}</p>
                </div>
              </div>
            )}
          </aside>
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
                    <option value="start">Top - At Start (Beginning)</option>
                    <option value="before">Above - Before Selected Section</option>
                    <option value="after">Below - After Selected Section</option>
                    <option value="end">Bottom - At End (Bottom)</option>
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

      {/* MODAL: AI Diff Review (Non-destructive AI refinement) */}
      {diffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-indigo-500/40 bg-slate-900 shadow-2xl flex flex-col text-xs text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Review AI Refinements: <span className="text-indigo-400">{diffModal.sectionTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Non-destructive modification. Compare the AI suggestions against current text before applying.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDiscardDiff}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 flex-1 overflow-hidden min-h-[350px]">
              {/* Left: Original */}
              <div className="flex flex-col h-full overflow-hidden p-3 bg-slate-950/40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                  <span>Current Section Content</span>
                  <span className="text-slate-500 font-mono text-[10px]">{diffModal.originalText.length} chars</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 bg-slate-950/80 rounded border border-slate-800 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {diffModal.originalText || "(Empty section)"}
                </div>
              </div>

              {/* Right: AI Proposed */}
              <div className="flex flex-col h-full overflow-hidden p-3 bg-indigo-950/10">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-900/40 text-[11px] font-semibold text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Proposed Refinements</span>
                  </span>
                  <span className="text-indigo-400 font-mono text-[10px]">{diffModal.proposedText.length} chars</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 bg-slate-950/90 rounded border border-indigo-500/30 text-indigo-100 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                  {diffModal.proposedText}
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Your manual edits in other sections are preserved untouched.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardDiff}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleApplyDiff}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Accept & Apply Refinement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Revisions & History */}
      {isRevisionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col text-xs text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Document Revisions & Snapshots</h3>
                  <p className="text-[11px] text-slate-400">
                    Capture named milestones and restore previous architecture states safely.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRevisionsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Snapshot Bar */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={snapshotComment}
                onChange={(e) => setSnapshotComment(e.target.value)}
                placeholder="Name this milestone (e.g. 'Pre-CAB Approved Baseline', 'Sprint 3 Design')..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={handleCreateSnapshot}
                disabled={isSavingSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold transition shrink-0"
              >
                {isSavingSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Snapshot</span>
              </button>
            </div>

            {/* Revisions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No snapshots saved for this project yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Create a milestone snapshot above to safeguard your progress.</p>
                </div>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          #{rev.revision_number} &bull; {rev.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {new Date(rev.created_at).toLocaleString()}
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-[11px] text-slate-400 mt-1">{rev.comment}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRestoreRevision(rev)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/30 text-slate-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 font-medium transition text-xs"
                      title="Restore document to this revision"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsRevisionsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Close
              </button>
            </div>
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
