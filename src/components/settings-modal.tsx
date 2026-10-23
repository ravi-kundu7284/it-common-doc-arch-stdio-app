"use client";

import React, { useState, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { useAuthStore } from "@/store/use-auth-store";
import {
  Settings,
  Key,
  Cpu,
  Check,
  X,
  ShieldCheck,
  Calendar,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Database,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { days: 1, label: "1 Day", tag: "Strict Security" },
  { days: 7, label: "7 Days", tag: "1 Week" },
  { days: 14, label: "14 Days", tag: "2 Weeks" },
  { days: 30, label: "30 Days", tag: "Recommended" },
  { days: 90, label: "90 Days", tag: "Quarterly" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiSettings, setApiSettings } = useDocStore();
  const { user, aiConfig, isAuthenticated, saveAiConfig, deleteAiConfig, openAuthModal } =
    useAuthStore();

  const [provider, setProvider] = useState(apiSettings.provider);
  const [apiKey, setApiKey] = useState(apiSettings.apiKey);
  const [modelName, setModelName] = useState(apiSettings.modelName);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [showKey, setShowKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Sync state when modal opens or user/aiConfig changes
  useEffect(() => {
    if (aiConfig) {
      setProvider(aiConfig.provider);
      setModelName(aiConfig.modelName);
      if (aiConfig.expiresInDays) setExpiresInDays(aiConfig.expiresInDays);
    } else {
      setProvider(apiSettings.provider);
      setModelName(apiSettings.modelName);
      setApiKey(apiSettings.apiKey);
    }
  }, [aiConfig, apiSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);

    // Save in client doc store
    setApiSettings({
      provider,
      apiKey,
      modelName,
    });

    // If authenticated, also save and encrypt in Supabase PostgreSQL
    if (isAuthenticated && apiKey.trim().length > 0) {
      const res = await saveAiConfig(provider, modelName, apiKey, expiresInDays);
      setIsSaving(false);
      if (!res.success) {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to save key in database." });
        return;
      }
      setFeedbackMsg({
        type: "success",
        text: `Key encrypted with AES-256-GCM. Set to auto-purge in ${expiresInDays} days!`,
      });
      setApiKey(""); // clear raw key from component state
    } else {
      setIsSaving(false);
      setFeedbackMsg({ type: "success", text: "Settings updated for current session." });
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleRevokeKey = async () => {
    if (!confirm("Are you sure you want to permanently delete your stored API key from the database?")) {
      return;
    }
    setIsRevoking(true);
    const res = await deleteAiConfig();
    setIsRevoking(false);

    if (res.success) {
      setFeedbackMsg({ type: "success", text: "API key permanently revoked from database." });
      setApiKey("");
      setApiSettings({ apiKey: "" });
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Failed to revoke key." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">AI Configuration & Security Vault</h3>
              <p className="text-xs text-slate-400">
                AES-256-GCM encrypted API keys with automated expiration in Supabase PostgreSQL
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

        {/* User Account & Database Status Banner */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold">
              {user ? user.username.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div>
              {isAuthenticated ? (
                <>
                  <div className="font-semibold text-slate-200">
                    Logged in as <span className="text-indigo-400 font-mono">@{user?.username}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Supabase PostgreSQL active</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-slate-300">Guest Mode (Session Only)</div>
                  <div className="text-[10px] text-slate-400">Sign in to save keys with auto-expiry</div>
                </>
              )}
            </div>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => {
                onClose();
                openAuthModal("signin");
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-red-950/40 border-red-800/60 text-red-300"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="space-y-5 text-sm">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select AI Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider("builtin");
                  setModelName("builtin");
                }}
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
                <span className="text-[10px] text-slate-400 mt-1">Zero config & offline</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("gemini");
                  if (!modelName || modelName.includes("gpt") || modelName === "builtin") {
                    setModelName("gemini-1.5-pro");
                  }
                }}
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
                <span className="text-[10px] text-slate-400 mt-1">Gemini 1.5 Pro / Flash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("openai");
                  if (!modelName || modelName.includes("gemini") || modelName === "builtin") {
                    setModelName("gpt-4o");
                  }
                }}
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
                <span className="text-[10px] text-slate-400 mt-1">GPT-4o & GPT-4o-mini</span>
              </button>
            </div>
          </div>

          {/* Model Name */}
          {provider !== "builtin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Target Model Identifier
                  </label>
                  {provider === "openai" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModelName("gpt-4o")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gpt-4o"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        gpt-4o
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName("gpt-4o-mini")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gpt-4o-mini"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        gpt-4o-mini
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o" : "gemini-1.5-pro"}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Protection
                </label>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>AES-256-GCM Hardware Cipher</span>
                </div>
              </div>
            </div>
          )}

          {/* API Key Input & Stored Key Status */}
          {provider !== "builtin" && (
            <div className="space-y-4">
              {/* If user already has active key stored in database */}
              {aiConfig?.hasKey && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">Active Encrypted Key:</span>
                      <code className="font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        •••••••••••••••••{aiConfig.keyLast4}
                      </code>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Auto-expires in{" "}
                        <strong className="text-cyan-300">{aiConfig.daysRemaining} days</strong> (
                        {new Date(aiConfig.expiresAt!).toLocaleDateString()})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeKey}
                    disabled={isRevoking}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-medium transition"
                    title="Permanently remove key from records now"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRevoking ? "Revoking..." : "Revoke"}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {aiConfig?.hasKey ? "Update API Key (Optional)" : "Confidential API Key"}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      aiConfig?.hasKey
                        ? "Enter new key to replace existing..."
                        : provider === "openai"
                        ? "sk-proj-..."
                        : "AIzaSy..."
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expiration Days Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auto-Expiration Duration</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Auto-purged from PostgreSQL
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {EXPIRY_OPTIONS.map((opt) => {
                    const isSelected = expiresInDays === opt.days;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setExpiresInDays(opt.days)}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-950/60 text-white font-bold"
                            : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs">{opt.label}</div>
                        <div className="text-[10px] text-indigo-300/80 font-normal">{opt.tag}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your API keys are <strong>never stored in plain text</strong>. Keys are encrypted with{" "}
              <strong>AES-256-GCM</strong> using dedicated cryptographic initialization vectors and
              authenticated tags. Once the chosen expiration days elapse, the record is permanently deleted.
            </p>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900 pt-3 mt-4 border-t border-slate-800 flex items-center justify-end gap-2.5 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? "Encrypting & Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
