"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { AdrItem, AdrStatus, AdrOption } from "@/types";
import {
  FileCheck2,
  Plus,
  Trash2,
  Edit2,
  Link,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  CornerDownRight,
  AlertTriangle,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { downloadFile } from "@/lib/export-engine";

export const AdrManager: React.FC = () => {
  const { currentProject, adrs, saveAdrItem, deleteAdrItem, updateSectionContent } = useDocStore();

  const [selectedAdrId, setSelectedAdrId] = useState<string | null>(adrs[0]?.id || null);
  const [filterStatus, setFilterStatus] = useState<"all" | AdrStatus>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdr, setEditingAdr] = useState<Partial<AdrItem> | null>(null);

  // Modal helper state
  const [driverInput, setDriverInput] = useState("");
  const [posConsequenceInput, setPosConsequenceInput] = useState("");
  const [negConsequenceInput, setNegConsequenceInput] = useState("");
  const [riskInput, setRiskInput] = useState("");
  const [embedSuccess, setEmbedSuccess] = useState(false);

  const filteredAdrs = adrs.filter((a) => (filterStatus === "all" ? true : a.status === filterStatus));
  const selectedAdr = adrs.find((a) => a.id === selectedAdrId) || adrs[0];

  const handleOpenAddModal = () => {
    const nextNum = adrs.length + 1;
    setEditingAdr({
      id: `adr_${Date.now()}`,
      projectId: currentProject.id,
      stableId: `ADR-${String(nextNum).padStart(3, "0")}`,
      title: "",
      status: "proposed",
      context: "",
      decisionDrivers: [],
      optionsConsidered: [],
      decision: "",
      consequences: { positive: [], negative: [] },
      risks: [],
      author: "Principal Software Architect",
      reviewers: ["Tech Lead"],
      relatedRequirementIds: [],
      relatedDiagramIds: [],
    });
    setDriverInput("");
    setPosConsequenceInput("");
    setNegConsequenceInput("");
    setRiskInput("");
    setIsModalOpen(true);
  };

  const handleSaveAdr = () => {
    if (!editingAdr || !editingAdr.title || !editingAdr.stableId) return;
    const item: AdrItem = {
      id: editingAdr.id || `adr_${Date.now()}`,
      projectId: currentProject.id,
      stableId: editingAdr.stableId,
      title: editingAdr.title,
      status: editingAdr.status || "proposed",
      context: editingAdr.context || "",
      decisionDrivers: editingAdr.decisionDrivers || [],
      optionsConsidered: editingAdr.optionsConsidered || [],
      decision: editingAdr.decision || "",
      consequences: editingAdr.consequences || { positive: [], negative: [] },
      risks: editingAdr.risks || [],
      author: editingAdr.author || "Architect",
      reviewers: editingAdr.reviewers || [],
      relatedRequirementIds: editingAdr.relatedRequirementIds || [],
      relatedDiagramIds: editingAdr.relatedDiagramIds || [],
      supersededBy: editingAdr.supersededBy,
      createdAt: editingAdr.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAdrItem(item);
    setIsModalOpen(false);
    setSelectedAdrId(item.id);
  };

  const handleSupersede = (originalAdr: AdrItem) => {
    const nextNum = adrs.length + 1;
    const newStableId = `ADR-${String(nextNum).padStart(3, "0")}`;
    const newAdr: AdrItem = {
      id: `adr_${Date.now()}`,
      projectId: currentProject.id,
      stableId: newStableId,
      title: `Supersedes ${originalAdr.stableId}: ${originalAdr.title}`,
      status: "accepted",
      context: `Previous decision documented in ${originalAdr.stableId} required revision due to updated scale or technical constraints.`,
      decisionDrivers: [...originalAdr.decisionDrivers],
      optionsConsidered: [...originalAdr.optionsConsidered],
      decision: "Revised architectural decision...",
      consequences: { positive: [], negative: [] },
      risks: [],
      author: "Principal Enterprise Architect",
      reviewers: [],
      relatedRequirementIds: [...originalAdr.relatedRequirementIds],
      relatedDiagramIds: [...originalAdr.relatedDiagramIds],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Save new ADR
    saveAdrItem(newAdr);
    // Mark original as superseded
    saveAdrItem({
      ...originalAdr,
      status: "superseded",
      supersededBy: newStableId,
      updatedAt: new Date().toISOString(),
    });
    setSelectedAdrId(newAdr.id);
  };

  const handleEmbedInDoc = () => {
    if (!selectedAdr) return;
    const adrSec =
      currentProject.documentSections.find((s) => s.id === "hld-tradeoffs" || s.title.toLowerCase().includes("trade-off") || s.title.toLowerCase().includes("adr")) ||
      currentProject.documentSections[currentProject.documentSections.length - 1];

    if (adrSec) {
      const adrMarkdown = `\n\n### ${selectedAdr.stableId}: ${selectedAdr.title} (\`${selectedAdr.status.toUpperCase()}\`)\n\n` +
        `**Context:** ${selectedAdr.context}\n\n` +
        `**Decision:** ${selectedAdr.decision}\n\n` +
        `**Key Consequences:**\n` +
        selectedAdr.consequences.positive.map((p) => `- ✅ ${p}`).join("\n") +
        (selectedAdr.consequences.positive.length ? "\n" : "") +
        selectedAdr.consequences.negative.map((n) => `- ⚠ ${n}`).join("\n") + "\n";

      updateSectionContent(adrSec.id, adrSec.contentMarkdown + adrMarkdown);
      setEmbedSuccess(true);
      setTimeout(() => setEmbedSuccess(false), 3000);
    }
  };

  const handleExportMarkdown = () => {
    const md = adrs
      .map(
        (a) =>
          `# ${a.stableId}: ${a.title}\n\n` +
          `- **Status:** \`${a.status.toUpperCase()}\`\n` +
          `- **Author:** ${a.author}\n` +
          `- **Date:** ${a.createdAt.split("T")[0]}\n` +
          (a.supersededBy ? `- **Superseded By:** \`${a.supersededBy}\`\n` : "") +
          `\n## Context\n${a.context}\n\n` +
          `## Decision\n${a.decision}\n\n` +
          `## Consequences\n### Positive\n${a.consequences.positive.map((p) => `- ${p}`).join("\n")}\n\n` +
          `### Negative\n${a.consequences.negative.map((n) => `- ${n}`).join("\n")}\n`
      )
      .join("\n\n---\n\n");

    downloadFile(
      `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-adrs.md`,
      md,
      "text/markdown"
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-[#0d1322] px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-base">Architecture Decision Records (ADRs)</div>
            <div className="text-xs text-slate-400">
              {adrs.length} Formal Architecture Decisions &bull; Governance & Trade-off History
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export All ADRs
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" /> Create ADR
          </button>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List of ADRs */}
        <div className="w-80 border-r border-slate-800 bg-[#0b101c] flex flex-col shrink-0">
          {/* Status filter bar */}
          <div className="p-3 border-b border-slate-800 flex items-center gap-1 text-[11px] overflow-x-auto">
            {(["all", "proposed", "accepted", "superseded", "rejected"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                  filterStatus === st ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredAdrs.map((adr) => {
              const isSelected = selectedAdr?.id === adr.id;
              return (
                <div
                  key={adr.id}
                  onClick={() => setSelectedAdrId(adr.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#182238] border-indigo-500 shadow-md ring-1 ring-indigo-500/40"
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      {adr.stableId}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        adr.status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : adr.status === "superseded"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : adr.status === "rejected"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {adr.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-slate-100 line-clamp-1">{adr.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Author: {adr.author}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#070b14]">
          {selectedAdr ? (
            <div className="max-w-3xl space-y-6">
              {/* Main Card */}
              <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                        {selectedAdr.stableId}
                      </span>
                      <span
                        className={`text-xs uppercase font-bold px-2.5 py-0.5 rounded-full ${
                          selectedAdr.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : selectedAdr.status === "superseded"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {selectedAdr.status}
                      </span>
                      {selectedAdr.supersededBy && (
                        <span className="text-xs text-amber-300 flex items-center gap-1 font-mono">
                          &rarr; Superseded by {selectedAdr.supersededBy}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">{selectedAdr.title}</h2>
                    <div className="text-xs text-slate-400 mt-1">
                      Author: <span className="text-slate-300">{selectedAdr.author}</span> &bull;{" "}
                      {selectedAdr.createdAt ? selectedAdr.createdAt.split("T")[0] : "Active"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEmbedInDoc}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        embedSuccess
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {embedSuccess ? <Check className="w-3.5 h-3.5" /> : <CornerDownRight className="w-3.5 h-3.5" />}
                      {embedSuccess ? "Embedded!" : "Embed in HLD"}
                    </button>

                    {selectedAdr.status !== "superseded" && (
                      <button
                        onClick={() => handleSupersede(selectedAdr)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" /> Supersede ADR
                      </button>
                    )}

                    <button
                      onClick={() => {
                        deleteAdrItem(selectedAdr.id);
                        setSelectedAdrId(adrs[0]?.id || null);
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                      title="Delete ADR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Context & Problem Statement</h3>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    {selectedAdr.context}
                  </p>
                </div>

                {/* Decision Drivers */}
                {selectedAdr.decisionDrivers?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Decision Drivers</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAdr.decisionDrivers.map((dd, idx) => (
                        <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                          &bull; {dd}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Decision */}
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Adopted Architectural Decision</h3>
                  <div className="text-sm font-medium text-indigo-200 bg-indigo-950/30 border border-indigo-800/40 p-3.5 rounded-xl">
                    {selectedAdr.decision}
                  </div>
                </div>

                {/* Consequences */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Positive Consequences
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {selectedAdr.consequences.positive.map((pos, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">&bull;</span> {pos}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Negative Consequences & Trade-offs
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {selectedAdr.consequences.negative.map((neg, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">&bull;</span> {neg}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select an ADR from the list or click &quot;Create ADR&quot; above.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit ADR Modal */}
      {isModalOpen && editingAdr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">Create Architecture Decision Record (ADR)</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Stable ID</label>
                <input
                  type="text"
                  value={editingAdr.stableId || ""}
                  onChange={(e) => setEditingAdr({ ...editingAdr, stableId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status</label>
                <select
                  value={editingAdr.status || "proposed"}
                  onChange={(e) => setEditingAdr({ ...editingAdr, status: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Author</label>
                <input
                  type="text"
                  value={editingAdr.author || ""}
                  onChange={(e) => setEditingAdr({ ...editingAdr, author: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
              <input
                type="text"
                value={editingAdr.title || ""}
                onChange={(e) => setEditingAdr({ ...editingAdr, title: e.target.value })}
                placeholder="e.g. Adopt gRPC over REST for East-West Service Communication"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Context & Problem Statement</label>
              <textarea
                rows={3}
                value={editingAdr.context || ""}
                onChange={(e) => setEditingAdr({ ...editingAdr, context: e.target.value })}
                placeholder="Describe the technical or business problem, constraints, and why a decision is necessary..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Selected Decision</label>
              <textarea
                rows={2}
                value={editingAdr.decision || ""}
                onChange={(e) => setEditingAdr({ ...editingAdr, decision: e.target.value })}
                placeholder="State the explicit architectural decision chosen..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdr}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save Decision Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

