"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { ArchitectureFinding, ArchitectureAuditResult, FindingSeverity, FindingCategory, FindingStatus } from "@/types";
import { auditProjectArchitecture } from "@/lib/architecture-audit";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Check,
  Cpu,
  CornerDownRight,
} from "lucide-react";

export const QualityAuditView: React.FC = () => {
  const { currentProject, latestAudit, setLatestAudit, updateSectionContent } = useDocStore();

  const [activeAudit, setActiveAudit] = useState<ArchitectureAuditResult | null>(
    latestAudit || auditProjectArchitecture(currentProject)
  );
  const [filterSeverity, setFilterSeverity] = useState<"all" | FindingSeverity>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | FindingCategory>("all");
  const [patchSuccessId, setPatchSuccessId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = auditProjectArchitecture(currentProject);
      setActiveAudit(result);
      setLatestAudit(result);
      setIsAuditing(false);
    }, 400);
  };

  const handleUpdateFindingStatus = (findingId: string, status: FindingStatus) => {
    if (!activeAudit) return;
    const updatedFindings = activeAudit.findings.map((f) =>
      f.id === findingId ? { ...f, status } : f
    );
    const fixedCount = updatedFindings.filter((f) => f.status === "fixed").length;
    const updatedAudit: ArchitectureAuditResult = {
      ...activeAudit,
      findings: updatedFindings,
      summary: {
        ...activeAudit.summary,
        fixed: fixedCount,
      },
    };
    setActiveAudit(updatedAudit);
    setLatestAudit(updatedAudit);
  };

  const handleApplyRemediation = (finding: ArchitectureFinding) => {
    const targetSection =
      currentProject.documentSections.find(
        (s) =>
          s.title.toLowerCase().includes(finding.category) ||
          s.title.toLowerCase().includes("concern") ||
          s.title.toLowerCase().includes("security") ||
          s.title.toLowerCase().includes("overview")
      ) || currentProject.documentSections[currentProject.documentSections.length - 2];

    if (targetSection) {
      const remediationText = `\n\n> 🛡️ **Remediation Patch (${finding.stableId} - ${finding.title}):**  \n> ${finding.remediation}  \n> *Trade-off:* ${finding.tradeOffs}\n`;
      updateSectionContent(targetSection.id, targetSection.contentMarkdown + remediationText);
      handleUpdateFindingStatus(finding.id, "fixed");
      setPatchSuccessId(finding.id);
      setTimeout(() => setPatchSuccessId(null), 3000);
    }
  };

  const findings = activeAudit?.findings || [];
  const filteredFindings = findings.filter((f) => {
    const matchesSev = filterSeverity === "all" || f.severity === filterSeverity;
    const matchesCat = filterCategory === "all" || f.category === filterCategory;
    return matchesSev && matchesCat;
  });

  const score = activeAudit?.overallScore ?? 85;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-[#0d1322] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-base">Architecture Quality & Validation Engine</div>
            <div className="text-xs text-slate-400">
              Deterministic rule evaluation + heuristic verification for enterprise readiness
            </div>
          </div>
        </div>

        {/* Audit Run button */}
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
          {isAuditing ? "Auditing System Architecture..." : "Re-Run Architecture Audit"}
        </button>
      </div>

      {/* Main Studio View */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#070b14]">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Score & Summary Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Health Score Card */}
            <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Architecture Health</span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-extrabold ${
                      score >= 90 ? "text-emerald-400" : score >= 75 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {score}
                  </span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {score >= 90 ? "Enterprise Grade" : score >= 75 ? "Moderate Risks" : "Critical Gaps"}
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                  score >= 90
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : score >= 75
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-red-500/40 bg-red-500/10 text-red-400"
                }`}
              >
                {score >= 90 ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
            </div>

            {/* Critical Findings */}
            <div
              onClick={() => setFilterSeverity("critical")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                filterSeverity === "critical" ? "bg-red-950/20 border-red-500" : "bg-[#0d1322] border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-xs uppercase font-bold text-red-400 block mb-1">Critical Severity</span>
              <div className="text-3xl font-extrabold text-red-400">{activeAudit?.summary.critical || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">SPOF & Zero-Trust blockers</div>
            </div>

            {/* High Findings */}
            <div
              onClick={() => setFilterSeverity("high")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                filterSeverity === "high" ? "bg-amber-950/20 border-amber-500" : "bg-[#0d1322] border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-xs uppercase font-bold text-amber-400 block mb-1">High Severity</span>
              <div className="text-3xl font-extrabold text-amber-400">{activeAudit?.summary.high || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">SLA & compliance gaps</div>
            </div>

            {/* Medium / Low Findings */}
            <div
              onClick={() => setFilterSeverity("medium")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                filterSeverity === "medium" ? "bg-indigo-950/20 border-indigo-500" : "bg-[#0d1322] border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-xs uppercase font-bold text-indigo-400 block mb-1">Medium & Low</span>
              <div className="text-3xl font-extrabold text-indigo-400">
                {(activeAudit?.summary.medium || 0) + (activeAudit?.summary.low || 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Observability & resiliency</div>
            </div>

            {/* Fixed Remediations */}
            <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
              <span className="text-xs uppercase font-bold text-emerald-400 block mb-1">Remediated Patches</span>
              <div className="text-3xl font-extrabold text-emerald-400">{activeAudit?.summary.fixed || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">Injected into document</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 rounded-xl bg-[#0d1322] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Filter Severity:</span>
              {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                    filterSeverity === sev ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                <option value="reliability">Reliability & SPOFs</option>
                <option value="security">Security & Encryption</option>
                <option value="compliance">Compliance</option>
                <option value="data_consistency">Data Consistency</option>
                <option value="coupling">Coupling & Boundaries</option>
                <option value="observability">Observability</option>
              </select>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            {filteredFindings.map((finding) => {
              const isFixed = finding.status === "fixed";
              const isAccepted = finding.status === "accepted";
              const isDismissed = finding.status === "dismissed";

              return (
                <div
                  key={finding.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isFixed
                      ? "bg-slate-900/30 border-slate-800/60 opacity-80"
                      : finding.severity === "critical"
                      ? "bg-[#130d17] border-red-500/30 shadow-lg shadow-red-950/10"
                      : finding.severity === "high"
                      ? "bg-[#13110d] border-amber-500/30 shadow-lg shadow-amber-950/10"
                      : "bg-[#0d1322] border-slate-800"
                  }`}
                >
                  {/* Finding Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {finding.stableId}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            finding.severity === "critical"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : finding.severity === "high"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Category: {finding.category.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          Affected Tier: <strong className="text-slate-200">{finding.component}</strong>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100">{finding.title}</h3>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={finding.status}
                        onChange={(e) => handleUpdateFindingStatus(finding.id, e.target.value as FindingStatus)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                          isFixed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isAccepted
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : isDismissed
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="accepted">Accepted Risk</option>
                        <option value="fixed">Fixed</option>
                        <option value="dismissed">Dismissed</option>
                      </select>

                      {!isFixed && (
                        <button
                          onClick={() => handleApplyRemediation(finding)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Inject recommended architecture remediation into design document"
                        >
                          {patchSuccessId === finding.id ? <Check className="w-3.5 h-3.5" /> : <CornerDownRight className="w-3.5 h-3.5" />}
                          {patchSuccessId === finding.id ? "Injected!" : "Apply Remediation"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description & Evidence */}
                  <div className="space-y-3 text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-slate-400 block mb-0.5">Description & Evidence</span>
                      <p className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                        <span className="font-bold text-amber-400 block mb-1">Why It Matters</span>
                        <p className="text-slate-300 leading-relaxed">{finding.whyItMatters}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                        <span className="font-bold text-emerald-400 block mb-1">Recommended Remediation</span>
                        <p className="text-slate-300 leading-relaxed">{finding.remediation}</p>
                        <div className="mt-2 text-[11px] text-slate-400">
                          <strong>Trade-offs:</strong> {finding.tradeOffs}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

