"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import {
  FolderKanban,
  Plus,
  Layers,
  Cpu,
  Trash2,
  Copy,
  ArrowRight,
  X,
  Sparkles,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  Edit3,
  Check,
} from "lucide-react";
import { generateStandaloneHtml, downloadFile } from "@/lib/export-engine";
import { DesignLevel, SavedProjectSummary } from "@/types";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ isOpen, onClose }) => {
  const {
    currentProject,
    savedProjects,
    saveCurrentProjectToDrafts,
    loadSavedProject,
    deleteSavedProject,
    duplicateSavedProject,
    updateSavedProject,
    createNewProject,
    lastSavedAt,
  } = useDocStore();

  const [filterLevel, setFilterLevel] = useState<"all" | "hld" | "lld" | "full">("all");
  const [justSaved, setJustSaved] = useState(false);

  // Edit draft state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editLevel, setEditLevel] = useState<DesignLevel>("hld");

  if (!isOpen) return null;

  const handleManualSave = () => {
    saveCurrentProjectToDrafts();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleLoad = (id: string) => {
    loadSavedProject(id);
    onClose();
  };

  const handleCreateNew = (level: DesignLevel = "hld") => {
    const levelLabel = level === "hld" ? "High-Level" : level === "lld" ? "Low-Level" : "Full";
    createNewProject(`New ${levelLabel} Architecture`, "Cloud Distributed Services", level);
    onClose();
  };

  const handleExport = (project: typeof currentProject) => {
    const html = generateStandaloneHtml(project);
    const filename = `${project.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-draft.html`;
    downloadFile(filename, html, "text/html");
  };

  const handleStartEdit = (p: SavedProjectSummary) => {
    setEditingDraftId(p.id);
    setEditTitle(p.title);
    setEditDomain(p.domain);
    setEditLevel(p.designLevel || "hld");
  };

  const handleSaveEdit = (pId: string) => {
    if (!editTitle.trim()) return;
    updateSavedProject(pId, {
      title: editTitle.trim(),
      domain: editDomain.trim(),
      designLevel: editLevel,
    });
    setEditingDraftId(null);
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
  };

  const filteredProjects = savedProjects.filter((p) => {
    if (filterLevel === "all") return true;
    return p.designLevel === filterLevel;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>My Architecture Projects & Drafts</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {savedProjects.length} Saved
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Continue where you left off, edit draft metadata, remove drafts, or start a new system design
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Project Snapshot Card */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Currently Editing
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    currentProject.designLevel === "lld"
                      ? "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                      : currentProject.designLevel === "full"
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                  }`}
                >
                  {(currentProject.designLevel || "hld").toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-500">Autosaved at {lastSavedAt}</span>
              </div>
              <h4 className="font-extrabold text-white text-sm truncate">{currentProject.metadata.title}</h4>
              <p className="text-[11px] text-slate-400 truncate">
                Domain: {currentProject.requirements.domain} &bull; {currentProject.documentSections.length} sections
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                {justSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Snapshot to Drafts</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar: New Project Options & Filter */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
          {/* New Project Buttons: HLD, LLD, Full */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Start New:</span>
            <button
              type="button"
              onClick={() => handleCreateNew("hld")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
              title="Start a fresh High-Level Design document"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New HLD</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateNew("lld")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
              title="Start a fresh Low-Level Design document"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New LLD</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateNew("full")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow"
              title="Start a complete Full Architecture specification (HLD + LLD)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Full (HLD+LLD)</span>
            </button>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilterLevel("all")}
              className={`px-2 py-0.5 rounded transition ${
                filterLevel === "all" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterLevel("hld")}
              className={`px-2 py-0.5 rounded transition ${
                filterLevel === "hld" ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400 hover:text-emerald-300"
              }`}
            >
              HLD
            </button>
            <button
              onClick={() => setFilterLevel("lld")}
              className={`px-2 py-0.5 rounded transition ${
                filterLevel === "lld" ? "bg-indigo-950 text-indigo-300 font-bold" : "text-slate-400 hover:text-indigo-300"
              }`}
            >
              LLD
            </button>
            <button
              onClick={() => setFilterLevel("full")}
              className={`px-2 py-0.5 rounded transition ${
                filterLevel === "full" ? "bg-cyan-950 text-cyan-300 font-bold" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              Full
            </button>
          </div>
        </div>

        {/* Saved Drafts List */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-semibold text-slate-300 text-sm">No saved drafts found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Every project you work on is automatically auto-saved. Click &quot;Snapshot to Drafts&quot; above to create explicit restore points.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProjects.map((p) => {
                const isCurrent = p.id === currentProject.id;
                const isEditing = editingDraftId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      isCurrent
                        ? "border-indigo-500/60 bg-indigo-950/20 ring-1 ring-indigo-500/30"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Form for Draft */
                      <div className="space-y-2.5 pb-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                          <span>Edit Draft Details</span>
                          <span className="text-[10px] text-slate-500">{p.id}</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Project Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                            placeholder="Title..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Domain
                          </label>
                          <input
                            type="text"
                            value={editDomain}
                            onChange={(e) => setEditDomain(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                            placeholder="Domain..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Architecture Level
                          </label>
                          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setEditLevel("hld")}
                              className={`py-1 rounded font-bold transition ${
                                editLevel === "hld" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              HLD
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditLevel("lld")}
                              className={`py-1 rounded font-bold transition ${
                                editLevel === "lld" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              LLD
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditLevel("full")}
                              className={`py-1 rounded font-bold transition ${
                                editLevel === "full" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Full
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1 shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Draft Normal View */
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              p.designLevel === "lld"
                                ? "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                                : p.designLevel === "full"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            }`}
                          >
                            {(p.designLevel || "hld").toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{p.lastUpdated.split(",")[0]}</span>
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-sm truncate mb-1" title={p.title}>
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mb-3">
                          {p.domain} &bull; {p.sectionCount} sections
                        </p>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        {/* Draft actions: Edit, Remove, Clone, Export */}
                        <div className="flex items-center gap-1">
                          {/* Edit Option */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(p)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition text-[11px]"
                            title="Edit draft title, domain, or design level"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          {/* Remove Option */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove draft "${p.title}"?`)) {
                                deleteSavedProject(p.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition text-[11px]"
                            title="Remove this draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>

                          {/* Clone Option */}
                          <button
                            type="button"
                            onClick={() => duplicateSavedProject(p.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Duplicate this project"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Export Option */}
                          <button
                            type="button"
                            onClick={() => handleExport(p.project)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Export standalone HTML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Continue / Active Button */}
                        <button
                          type="button"
                          onClick={() => handleLoad(p.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isCurrent
                              ? "bg-slate-800 text-slate-300"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                          }`}
                        >
                          <span>{isCurrent ? "Active" : "Continue"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
