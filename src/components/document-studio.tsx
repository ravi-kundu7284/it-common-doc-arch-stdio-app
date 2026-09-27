"use client";

import React, { useState, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { MarkdownViewer } from "./markdown-viewer";
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
  Printer,
  Download,
  Copy,
  Check,
  Bookmark,
  Share2,
  ListOrdered,
  Layers,
  ArrowRight,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { generateStandaloneHtml, generateRawMarkdown, downloadFile } from "@/lib/export-engine";

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
    User["End User / Mobile Client"]
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
};

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
    studioViewMode,
    setStudioViewMode,
    updateMetadata,
    apiSettings,
  } = useDocStore();

  const { metadata, requirements, recommendations, documentSections } = currentProject;
  const activeSection =
    documentSections.find((s) => s.id === selectedSectionId) || documentSections[0];

  const [editorText, setEditorText] = useState(activeSection?.contentMarkdown || "");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showSectionList, setShowSectionList] = useState(true);

  // Sync editor when active section changes
  useEffect(() => {
    if (activeSection) {
      setEditorText(activeSection.contentMarkdown);
    }
  }, [activeSection?.id]);

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
    const filename = `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture.html`;
    downloadFile(filename, html, "text/html");
  };

  const handleCopyMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Studio Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSectionList(!showSectionList)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title={showSectionList ? "Hide Section Navigator" : "Show Section Navigator"}
          >
            {showSectionList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">Sections ({documentSections.length})</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold hidden md:inline">Document:</span>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => updateMetadata({ title: e.target.value })}
              className="bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 focus:border-indigo-500 px-1 py-0.5 font-bold text-slate-200 text-xs w-56 sm:w-80 truncate focus:outline-none"
            />
          </div>

          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
            {recommendations.selectedPattern}
          </span>
        </div>

        {/* View mode toggle & Quick Actions */}
        <div className="flex items-center gap-2">
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
              <span className="hidden sm:inline">Split</span>
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
              <span className="hidden sm:inline">Preview</span>
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
              <span className="hidden sm:inline">Editor</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            title="Copy Full Markdown to Clipboard"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedNotification ? "Copied!" : "Copy MD"}</span>
          </button>

          <button
            onClick={handleExportHtml}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition"
            title="Download Standalone HTML Bundle"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HTML Bundle</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: Sections List (Collapsible) */}
        {showSectionList && (
          <aside className="w-64 sm:w-72 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Document Sections
              </span>
              <button
                onClick={() => addSection("Custom Architecture Section")}
                className="flex items-center gap-1 p-1 rounded hover:bg-slate-800 text-indigo-400 hover:text-indigo-300"
                title="Add Custom Section"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">Add</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {documentSections.map((sec, idx) => {
                const isSelected = sec.id === activeSection?.id;
                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group text-xs transition ${
                      isSelected
                        ? "bg-indigo-600/20 border border-indigo-500/60 text-white font-medium"
                        : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">{idx + 1}.</span>
                      <span className="truncate">{sec.title.replace(/^\d+\.\s*/, "")}</span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(idx, "down");
                        }}
                        disabled={idx === documentSections.length - 1}
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

            <div className="p-3 border-t border-slate-800">
              <button
                onClick={() => {
                  if (confirm("Regenerate all sections from current requirements? Manual edits will be replaced.")) {
                    regenerateDocumentSections();
                  }
                }}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-synthesize All</span>
              </button>
            </div>
          </aside>
        )}

        {/* CENTER / LEFT: Markdown Editor (if not preview mode) */}
        {studioViewMode !== "preview" && (
          <div
            className={`flex flex-col bg-slate-950 border-r border-slate-800 ${
              studioViewMode === "split" ? "w-1/2 flex-1" : "w-full flex-1"
            }`}
          >
            {/* Editor Sub-header & Snippet Tools */}
            <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Section Editor:</span>
                <input
                  type="text"
                  value={activeSection?.title || ""}
                  onChange={(e) => {
                    if (activeSection) {
                      updateSectionTitle(activeSection.id, e.target.value);
                    }
                  }}
                  className="bg-transparent border-b border-slate-700 text-indigo-300 font-semibold focus:outline-none focus:border-indigo-400 px-1 py-0.5"
                />
              </div>

              {/* Diagram Inserters */}
              <div className="flex items-center gap-1">
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
                  title="Insert C4 Container Architecture"
                >
                  C4
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDiagram(SAMPLE_DIAGRAM_SNIPPETS.er)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] transition"
                  title="Insert Entity Relationship Diagram"
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
              </div>
            </div>

            {/* Markdown Textarea */}
            <div className="flex-1 p-3 overflow-hidden relative">
              <textarea
                value={editorText}
                onChange={handleEditorChange}
                placeholder="Write or edit architecture specifications in Markdown..."
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
                placeholder="e.g. Add Redis Sentinel failover strategy and 3-node quorum details..."
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
            className={`flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-950 transition-all ${
              studioViewMode === "preview" ? "max-w-5xl mx-auto w-full" : ""
            }`}
          >
            {/* Document Header Card */}
            <div className="mb-10 pb-8 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                  Status: {metadata.status}
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
                Production-grade Software Architecture & Technical Design Document (HLD/LLD)
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
                <div className="font-bold text-indigo-300 mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Document Table of Contents</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                  {documentSections.map((sec, idx) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="text-indigo-400 hover:text-indigo-200 truncate transition py-0.5"
                    >
                      {idx + 1}. {sec.title.replace(/^\d+\.\s*/, "")}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Sections Content */}
            <div className="space-y-12">
              {documentSections.map((sec) => (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={`scroll-mt-12 transition-all p-4 rounded-2xl ${
                    sec.id === activeSection?.id
                      ? "ring-1 ring-indigo-500/40 bg-indigo-950/10"
                      : ""
                  }`}
                >
                  <MarkdownViewer content={sec.contentMarkdown} />
                </section>
              ))}
            </div>

            {/* Document Footer */}
            <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
              <p>Generated with <strong>DocArch AI</strong> &bull; Production System Design Architecture Studio</p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
