"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { Settings, Key, Cpu, Check, X, ShieldAlert } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiSettings, setApiSettings } = useDocStore();
  const [provider, setProvider] = useState(apiSettings.provider);
  const [apiKey, setApiKey] = useState(apiSettings.apiKey);
  const [modelName, setModelName] = useState(apiSettings.modelName);
  const [savedAlert, setSavedAlert] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiSettings({
      provider,
      apiKey,
      modelName,
    });
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">LLM & Generation Engine</h3>
              <p className="text-xs text-slate-400">Configure AI provider or use high-fidelity offline engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 py-5 text-sm">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setProvider("builtin")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "builtin"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Cpu className="w-4 h-4" />
                  <span>Built-in Generator</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">Zero config, instant HLD/LLD diagrams</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider("gemini")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "gemini"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Key className="w-4 h-4" />
                  <span>Google Gemini</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">Gemini 1.5 Pro / Flash API</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider("openai")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "openai"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Key className="w-4 h-4" />
                  <span>OpenAI</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">GPT-4o / GPT-4o mini</span>
              </button>
            </div>
          </div>

          {/* API Key Input (if not builtin) */}
          {provider !== "builtin" && (
            <div className="space-y-3 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {provider === "openai" ? "OpenAI API Key" : "Google Gemini API Key"}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === "openai" ? "sk-..." : "AIzaSy..."}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Model Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o" : "gemini-1.5-pro"}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              The <strong>Built-in Generator</strong> works offline and generates complete, mathematically sound architecture documents with full Mermaid diagrams. API keys are stored only in your local browser state.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            {savedAlert ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
