"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { useAuthStore } from "@/store/use-auth-store";
import {
  FileText,
  Cpu,
  Layers,
  Download,
  Settings,
  Printer,
  FileCode,
  FileDown,
  RotateCcw,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { generateRawMarkdown, generateStandaloneHtml, downloadFile } from "@/lib/export-engine";
import { TemplatesModal } from "./templates-modal";
import { SettingsModal } from "./settings-modal";
import { AuthModal } from "./auth-modal";

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentProject,
    resetProject,
  } = useDocStore();

  const {
    user,
    aiConfig,
    isAuthenticated,
    logout,
    openAuthModal,
    checkSession,
  } = useAuthStore();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check user session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportHtml = () => {
    const html = generateStandaloneHtml(currentProject);
    const filename = `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture.html`;
    downloadFile(filename, html, "text/html");
    setIsExportOpen(false);
  };

  const handleExportMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    const filename = `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture.md`;
    downloadFile(filename, md, "text/markdown");
    setIsExportOpen(false);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    const filename = `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-project.json`;
    downloadFile(filename, jsonStr, "application/json");
    setIsExportOpen(false);
  };

  const handleCopyMarkdown = () => {
    const md = generateRawMarkdown(currentProject);
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => {
      setCopiedMd(false);
      setIsExportOpen(false);
    }, 1500);
  };

  const handlePrint = () => {
    setIsExportOpen(false);
    setActiveTab("studio");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  DocArch <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  HLD / LLD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
                Software Architecture & Technical Design Document Studio
              </p>
            </div>
          </div>

          {/* Workflow Stepper Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("wizard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === "wizard"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
              <span>Requirements Intake</span>
            </button>

            <button
              onClick={() => setActiveTab("recommender")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === "recommender"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
              <span>AI Recommender</span>
            </button>

            <button
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === "studio"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
              <span>Document Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5" />
            </button>
          </nav>

          {/* Utility Actions & User Auth */}
          <div className="flex items-center gap-2">
            {/* Templates Library */}
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Browse reference architecture templates"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* AI Settings / Vault */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              title="AI Provider & Key Vault Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              {aiConfig?.hasKey && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Export Document
                  </div>

                  <button
                    onClick={handleExportHtml}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="font-medium">Standalone HTML Bundle</div>
                      <div className="text-[10px] text-slate-400">Single self-contained file with tables & Mermaid</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="font-medium">Raw Markdown (.md)</div>
                      <div className="text-[10px] text-slate-400">With raw Mermaid code for GitHub/GitLab</div>
                    </div>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium">Print to PDF</div>
                      <div className="text-[10px] text-slate-400">Print-ready layout & page break styles</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <FileDown className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-medium">Export Project JSON</div>
                      <div className="text-[10px] text-slate-400">Full structured schema backup</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center justify-between w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      {copiedMd ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-slate-400" />}
                      <span>{copiedMd ? "Copied Markdown!" : "Copy Raw Markdown"}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User Authentication & Sign Off Button */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 p-1 pl-2 pr-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-[11px] text-white">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left mr-1">
                  <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                    @{user?.username}
                  </div>
                  {aiConfig?.hasKey ? (
                    <div className="text-[9px] text-emerald-400 font-mono leading-none">
                      {aiConfig.provider}: {aiConfig.daysRemaining}d
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 font-mono leading-none">
                      No API Key
                    </div>
                  )}
                </div>
                <button
                  onClick={() => logout()}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Sign Off (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal("signin")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Reset Project */}
            <button
              onClick={() => {
                if (confirm("Reset current project to initial baseline?")) {
                  resetProject();
                }
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Reset Project"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal />
    </>
  );
};
