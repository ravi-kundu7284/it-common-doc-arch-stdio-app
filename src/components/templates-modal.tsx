"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { PRESET_TEMPLATES } from "@/lib/templates";
import {
  Layers,
  CreditCard,
  ShoppingCart,
  Activity,
  Cpu,
  Bookmark,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose }) => {
  const {
    loadPresetTemplate,
    customTemplates,
    deleteCustomTemplate,
    saveCurrentAsTemplate,
    startBlankProject,
    currentProject,
    setActiveTab,
  } = useDocStore();

  const [activeTab, setActivePresetTab] = useState<"presets" | "custom" | "save">("presets");
  const [saveTitle, setSaveTitle] = useState(currentProject.metadata.title);
  const [saveDesc, setSaveDesc] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const getTemplateIcon = (name: string) => {
    switch (name) {
      case "CreditCard":
        return <CreditCard className="w-5 h-5 text-emerald-400" />;
      case "ShoppingCart":
        return <ShoppingCart className="w-5 h-5 text-indigo-400" />;
      case "Activity":
        return <Activity className="w-5 h-5 text-cyan-400" />;
      case "Cpu":
        return <Cpu className="w-5 h-5 text-amber-400" />;
      default:
        return <Layers className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleSelectPreset = (id: string) => {
    loadPresetTemplate(id, currentProject.designLevel);
    onClose();
  };

  const handleStartBlank = (level: "hld" | "lld" | "full" = "hld") => {
    startBlankProject("Custom Architecture Specification", "Enterprise Architecture", level);
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;
    saveCurrentAsTemplate(saveTitle, saveDesc);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setActivePresetTab("custom");
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Architecture Templates Library</h3>
              <p className="text-xs text-slate-400">
                Load battle-tested industry architectures or save your custom design patterns
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

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActivePresetTab("presets")}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 ${
              activeTab === "presets"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Industry Reference Presets ({PRESET_TEMPLATES.length})
          </button>
          <button
            onClick={() => setActivePresetTab("custom")}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 ${
              activeTab === "custom"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Saved Custom Templates ({customTemplates.length})
          </button>
          <button
            onClick={() => setActivePresetTab("save")}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "save"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Current As Template</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "presets" && (
            <div className="space-y-4">
              {/* Blank Project / Clean Slate Card */}
              <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-sm">Blank Architecture Canvas</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-400 font-semibold uppercase">
                      Zero Demo Data
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Start with a fresh, clean slate. Completely free of demo records, ready for manual input or AI generation.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartBlank("hld")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                  >
                    Start Blank HLD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartBlank("lld")}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                  >
                    Start Blank LLD
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESET_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/60 hover:bg-slate-900/60 transition group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTemplateIcon(tpl.iconName)}
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {tpl.domain}
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-mono">
                        {tpl.requirements.targetScale.rps.toLocaleString()} RPS
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-100 text-sm mb-1.5 group-hover:text-indigo-300 transition">
                      {tpl.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{tpl.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        Pattern: {tpl.recommendations.selectedPattern}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        Users: {tpl.requirements.targetScale.users}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPreset(tpl.id)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                  >
                    <span>Load Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          {activeTab === "custom" && (
            <div>
              {customTemplates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-400">No saved custom templates yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Configure your desired requirements and architecture in DocArch AI, then click &quot;Save Current As Template&quot; to reuse it across projects.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-mono text-[11px]">Saved {tpl.savedAt}</span>
                          <button
                            onClick={() => deleteCustomTemplate(tpl.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-bold text-slate-100 text-sm mb-1">{tpl.title}</h4>
                        <p className="text-xs text-slate-400 mb-3">{tpl.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          useDocStore.getState().setProject(tpl.project);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                      >
                        <span>Load Custom Design</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "save" && (
            <form onSubmit={handleSaveCustom} className="max-w-md mx-auto py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Template Title</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Enterprise Realtime Chat Pattern"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description & Purpose</label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Summarize target throughput, domain assumptions, and key architectural choices..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Template Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save Current Document as Template</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
