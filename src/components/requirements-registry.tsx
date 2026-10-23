"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { RequirementItem, TraceLink, RequirementCategory, RequirementPriority, RequirementStatus, ImpactAnalysisResult } from "@/types";
import { analyzeRequirementChange, buildTraceabilityMatrix } from "@/lib/impact-engine";
import {
  ListChecks,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Link2,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Activity,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export const RequirementsRegistry: React.FC = () => {
  const {
    currentProject,
    requirements,
    traceLinks,
    saveRequirementItem,
    deleteRequirementItem,
    saveTraceLinkItem,
    deleteTraceLinkItem,
  } = useDocStore();

  const [activeTab, setActiveTab] = useState<"registry" | "matrix">("registry");
  const [filterCategory, setFilterCategory] = useState<"all" | RequirementCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Partial<RequirementItem> | null>(null);
  const [criteriaInput, setCriteriaInput] = useState("");

  // Impact Analysis modal state
  const [impactModalReq, setImpactModalReq] = useState<RequirementItem | null>(null);
  const [impactInputDesc, setImpactInputDesc] = useState("");
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);

  const filteredReqs = requirements.filter((r) => {
    const matchesCat = filterCategory === "all" || r.category === filterCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.stableId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectedReq = requirements.find((r) => r.id === selectedReqId);
  const selectedReqLinks = traceLinks.filter(
    (l) => l.requirement_id === selectedReqId || (l as any).requirementId === selectedReqId
  );

  const handleOpenAddModal = (cat?: RequirementCategory) => {
    const nextNum = requirements.length + 1;
    const category = cat || "functional";
    const prefix = category === "business" ? "BR" : category === "functional" ? "FR" : "NFR";
    setEditingReq({
      id: `req_${Date.now()}`,
      projectId: currentProject.id,
      stableId: `${prefix}-${String(nextNum).padStart(3, "0")}`,
      title: "",
      category,
      priority: "medium",
      status: "draft",
      description: "",
      acceptanceCriteria: [],
    });
    setCriteriaInput("");
    setIsModalOpen(true);
  };

  const handleSaveReq = () => {
    if (!editingReq || !editingReq.title || !editingReq.stableId) return;
    const item: RequirementItem = {
      id: editingReq.id || `req_${Date.now()}`,
      projectId: currentProject.id,
      stableId: editingReq.stableId,
      title: editingReq.title,
      category: editingReq.category || "functional",
      priority: editingReq.priority || "medium",
      status: editingReq.status || "draft",
      description: editingReq.description || "",
      acceptanceCriteria: editingReq.acceptanceCriteria || [],
      traceLinks: [],
      createdAt: editingReq.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveRequirementItem(item);
    setIsModalOpen(false);
    setSelectedReqId(item.id);
  };

  const handleAddCriteria = () => {
    if (!criteriaInput.trim() || !editingReq) return;
    setEditingReq({
      ...editingReq,
      acceptanceCriteria: [...(editingReq.acceptanceCriteria || []), criteriaInput.trim()],
    });
    setCriteriaInput("");
  };

  const handleRemoveCriteria = (idx: number) => {
    if (!editingReq) return;
    setEditingReq({
      ...editingReq,
      acceptanceCriteria: (editingReq.acceptanceCriteria || []).filter((_, i) => i !== idx),
    });
  };

  const handleRunImpact = (req: RequirementItem) => {
    setImpactModalReq(req);
    setImpactInputDesc(req.description);
    const result = analyzeRequirementChange(currentProject, req, req.description, traceLinks);
    setImpactResult(result);
  };

  const matrix = buildTraceabilityMatrix(requirements, traceLinks, currentProject);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-[#0d1322] px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-base">Requirements Traceability & Impact Engine</div>
            <div className="text-xs text-slate-400">
              {requirements.length} Tracked Requirements &bull; {traceLinks.length} Architecture Links
            </div>
          </div>
        </div>

        {/* View Switcher & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("registry")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "registry" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Requirements Registry
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "matrix" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Traceability Matrix
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Requirement
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "registry" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Requirements List & Filters */}
          <div className="w-96 border-r border-slate-800 bg-[#0b101c] flex flex-col shrink-0">
            {/* Filter Pills & Search */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-1 text-[11px]">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterCategory === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  All ({requirements.length})
                </button>
                <button
                  onClick={() => setFilterCategory("business")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterCategory === "business" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  BR
                </button>
                <button
                  onClick={() => setFilterCategory("functional")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterCategory === "functional" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => setFilterCategory("non_functional")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterCategory === "non_functional" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  NFR
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredReqs.map((req) => {
                const isSelected = selectedReqId === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#182238] border-indigo-500 shadow-md ring-1 ring-indigo-500/40"
                        : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          {req.stableId}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            req.priority === "critical"
                              ? "bg-red-500/20 text-red-300"
                              : req.priority === "high"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {req.priority}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{req.status}</span>
                    </div>
                    <div className="font-semibold text-xs text-slate-100 line-clamp-1">{req.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{req.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Requirement Details & Trace Links */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#070b14]">
            {selectedReq ? (
              <div className="max-w-3xl space-y-6">
                {/* Header Card */}
                <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="font-mono text-sm font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                          {selectedReq.stableId}
                        </span>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {selectedReq.category.replace("_", " ")}
                        </span>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Priority: {selectedReq.priority}
                        </span>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Status: {selectedReq.status}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100">{selectedReq.title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunImpact(selectedReq)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Analyze Change Impact
                      </button>
                      <button
                        onClick={() => {
                          setEditingReq({ ...selectedReq });
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Edit requirement"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          deleteRequirementItem(selectedReq.id);
                          setSelectedReqId(null);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                        title="Delete requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Requirement Statement</h3>
                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      {selectedReq.description}
                    </p>
                  </div>

                  {selectedReq.acceptanceCriteria?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Acceptance Criteria</h3>
                      <div className="space-y-1.5">
                        {selectedReq.acceptanceCriteria.map((ac, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{ac}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Traceability Links Section */}
                <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-sky-400" /> Linked Architecture Artifacts
                      </h3>
                      <p className="text-xs text-slate-400">
                        Components, Diagrams, APIs, and Document sections mapping to this requirement
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const targetType = "component";
                        const targetTitle = "Core Business Domain Service";
                        saveTraceLinkItem({
                          id: `tl_${Date.now()}`,
                          requirement_id: selectedReq.id,
                          targetType,
                          targetId: "core-domain",
                          targetTitle,
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Link Artifact
                    </button>
                  </div>

                  {selectedReqLinks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedReqLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200">{link.targetTitle}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{link.targetType}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTraceLinkItem(link.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No architecture artifacts linked yet. Click &quot;Link Artifact&quot; above to map this requirement.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                <ListChecks className="w-12 h-12 mb-3 text-slate-700" />
                <p>Select a requirement from the left list to view details and change impact analysis.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full Traceability Matrix Table View */
        <div className="flex-1 overflow-auto p-6 bg-[#070b14]">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Architecture Requirements Traceability Matrix (RTM)</h2>
                <p className="text-xs text-slate-400">
                  Verifies end-to-end design coverage: Requirements &rarr; Architecture Components &rarr; Diagrams &rarr; Sections
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0d1322]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Requirement</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Mapped Components</th>
                    <th className="px-4 py-3">Mapped Diagrams</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {matrix.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-sky-400">{row.stableId}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{row.title}</td>
                      <td className="px-4 py-3 uppercase text-[10px] text-slate-400">{row.category.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            row.priority === "critical"
                              ? "bg-red-500/20 text-red-300"
                              : row.priority === "high"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.components.length > 0 ? (
                          <span className="text-indigo-300 font-medium">{row.components.join(", ")}</span>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.diagrams.length > 0 ? (
                          <span className="text-indigo-300 font-medium">{row.diagrams.join(", ")}</span>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.coverageStatus === "Covered"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {row.coverageStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Change Impact Analysis Modal */}
      {impactModalReq && impactResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Change Impact Analysis ({impactResult.stableId})
                </h3>
              </div>
              <button
                onClick={() => setImpactModalReq(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Modified Requirement Description
              </label>
              <textarea
                rows={3}
                value={impactInputDesc}
                onChange={(e) => {
                  setImpactInputDesc(e.target.value);
                  const updated = analyzeRequirementChange(currentProject, impactModalReq, e.target.value, traceLinks);
                  setImpactResult(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Impacted Architecture Artifacts Detected
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="font-bold text-indigo-400 block mb-1">Impacted Components</span>
                  <div className="text-slate-300">{impactResult.impactedComponents.join(", ") || "None"}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="font-bold text-indigo-400 block mb-1">Impacted Diagrams</span>
                  <div className="text-slate-300">{impactResult.impactedDiagrams.join(", ") || "None"}</div>
                </div>
              </div>

              {impactResult.proposedUpdates.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Proposed Section Alignments ({impactResult.proposedUpdates.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {impactResult.proposedUpdates.map((pu, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">{pu.sectionTitle}</div>
                        <div className="text-[11px] text-amber-300/90 mt-1">{pu.proposedChange}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setImpactModalReq(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Requirement Modal */}
      {isModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {editingReq.id?.startsWith("req_") ? "Edit Requirement" : "Add New Architecture Requirement"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Stable ID</label>
                <input
                  type="text"
                  value={editingReq.stableId || ""}
                  onChange={(e) => setEditingReq({ ...editingReq, stableId: e.target.value })}
                  placeholder="e.g. FR-001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category</label>
                <select
                  value={editingReq.category || "functional"}
                  onChange={(e) => setEditingReq({ ...editingReq, category: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="business">Business (BR)</option>
                  <option value="functional">Functional (FR)</option>
                  <option value="non_functional">Non-Functional (NFR)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Priority</label>
                <select
                  value={editingReq.priority || "medium"}
                  onChange={(e) => setEditingReq({ ...editingReq, priority: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
              <input
                type="text"
                value={editingReq.title || ""}
                onChange={(e) => setEditingReq({ ...editingReq, title: e.target.value })}
                placeholder="Clear, concise requirement statement"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Detailed Description</label>
              <textarea
                rows={3}
                value={editingReq.description || ""}
                onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value })}
                placeholder="Outline the explicit functional or architectural behavior..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Acceptance Criteria</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={criteriaInput}
                  onChange={(e) => setCriteriaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCriteria();
                    }
                  }}
                  placeholder="e.g. Rate limits enforced at 50 req/sec"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddCriteria}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                >
                  Add
                </button>
              </div>

              {editingReq.acceptanceCriteria && editingReq.acceptanceCriteria.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {editingReq.acceptanceCriteria.map((ac, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded text-[11px]"
                    >
                      <span className="text-slate-300 truncate">{ac}</span>
                      <button onClick={() => handleRemoveCriteria(idx)} className="text-slate-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReq}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save Requirement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

