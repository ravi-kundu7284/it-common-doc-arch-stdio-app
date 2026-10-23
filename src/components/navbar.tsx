"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FolderKanban,
  LifeBuoy,
  MessageSquareHeart,
  Menu,
  X,
} from "lucide-react";
import {
  generateRawMarkdown,
  generateStandaloneHtml,
  generateDocxDocument,
  generateStructuredYaml,
  downloadFile,
} from "@/lib/export-engine";
import { useSupportStore } from "@/store/use-support-store";
import { TemplatesModal } from "./templates-modal";
import { SettingsModal } from "./settings-modal";
import { AuthModal } from "./auth-modal";
import { ProjectsModal } from "./projects-modal";
import { SupportModal } from "./support-modal";
import { FeedbackModal } from "./feedback-modal";

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setActiveStep,
    currentProject,
    resetProject,
    setDesignLevel,
    startBlankProject,
    savedProjects,
    lastSavedAt,
  } = useDocStore();

  const STEP_TABS = ["wizard", "recommender", "studio", "diagrams", "workflows", "traceability", "adrs", "quality"] as const;
  const currentStepIdx = STEP_TABS.indexOf(activeTab as any);
  const hasPrevStep = currentStepIdx > 0;
  const hasNextStep = currentStepIdx !== -1 && currentStepIdx < STEP_TABS.length - 1;

  const handlePrevStep = () => {
    if (hasPrevStep) {
      const prevTab = STEP_TABS[currentStepIdx - 1];
      setActiveTab(prevTab);
      setActiveStep(currentStepIdx);
    }
  };

  const handleNextStep = () => {
    if (hasNextStep) {
      const nextTab = STEP_TABS[currentStepIdx + 1];
      setActiveTab(nextTab);
      setActiveStep(currentStepIdx + 2);
    }
  };

  const {
    user,
    aiConfig,
    isAuthenticated,
    logout,
    openAuthModal,
  } = useAuthStore();

  const {
    tickets,
    setSupportModalOpen,
    setFeedbackModalOpen,
  } = useSupportStore();

  const openTicketsCount = tickets.filter(
    (t) => t.status === "open" || t.status === "in_review" || t.status === "in_progress"
  ).length;

  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
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

  const handleExportDocx = () => {
    const docx = generateDocxDocument(currentProject);
    const filename = `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture.doc`;
    downloadFile(filename, docx, "application/vnd.ms-word");
    setIsExportOpen(false);
  };

  const handleExportYaml = () => {
    const yaml = generateStructuredYaml(currentProject);
    const filename = `${currentProject.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture.yaml`;
    downloadFile(filename, yaml, "text/yaml");
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
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        {/* Tier 1: Brand, Quick Status & Global Actions */}
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 border-b border-slate-900">
          {/* Logo, Title & Mode Toggle */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-base shrink-0">
              <Layers className="w-4 h-4 text-white" />
            </div>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white shrink-0">
                DocArch <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
              </span>

              {/* HLD / LLD Quick Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setDesignLevel("hld")}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    currentProject.designLevel === "hld"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-emerald-300"
                  }`}
                  title="High-Level Design Mode"
                >
                  HLD
                </button>
                <button
                  type="button"
                  onClick={() => setDesignLevel("lld")}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    currentProject.designLevel === "lld"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-indigo-300"
                  }`}
                  title="Low-Level Design Mode"
                >
                  LLD
                </button>
                <button
                  type="button"
                  onClick={() => setDesignLevel("full")}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    currentProject.designLevel === "full"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-cyan-300"
                  }`}
                  title="Full Architecture Mode (HLD + LLD)"
                >
                  Full
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400 text-xs min-w-0">
                <span className="truncate max-w-[240px] font-medium text-slate-300" title={currentProject.metadata.title}>
                  {currentProject.metadata.title}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Primary Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* My Projects & Drafts */}
            <button
              onClick={() => setIsProjectsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition shrink-0"
              title="Open My Projects & Drafts"
            >
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Projects</span>
              {savedProjects.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-bold">
                  {savedProjects.length}
                </span>
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition shrink-0"
                title="Download architecture specifications"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
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
                    onClick={handleExportDocx}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-medium">Word Document (.doc)</div>
                      <div className="text-[10px] text-slate-400">Microsoft Word OpenXML with tables & styling</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportYaml}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-medium">Structured YAML (.yaml)</div>
                      <div className="text-[10px] text-slate-400">Clean architecture spec format</div>
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

            {/* AI Settings / Vault */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              title="AI Provider & Key Vault Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              {aiConfig?.hasKey && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Help & Community Dropdown */}
            <div className="relative shrink-0" ref={helpDropdownRef}>
              <button
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                className="relative flex items-center gap-1 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
                title="Templates, Support & Community"
              >
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
                {openTicketsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>

              {isHelpOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Help & Resources
                  </div>
                  <button
                    onClick={() => {
                      setIsHelpOpen(false);
                      setIsTemplatesOpen(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="font-medium">Architecture Templates</div>
                      <div className="text-[10px] text-slate-400">Battle-tested reference systems</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsHelpOpen(false);
                      setSupportModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <LifeBuoy className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <span>Support Desk</span>
                        {openTicketsCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-900 text-blue-300 font-bold">
                            {openTicketsCount} open
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">Report issues & track status</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsHelpOpen(false);
                      setFeedbackModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white transition"
                  >
                    <MessageSquareHeart className="w-4 h-4 text-pink-400" />
                    <div>
                      <div className="font-medium">Share Feedback</div>
                      <div className="text-[10px] text-slate-400">Suggest new features & fixes</div>
                    </div>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={() => {
                      setIsHelpOpen(false);
                      if (confirm("Reset current project to initial baseline?")) {
                        resetProject();
                      }
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-red-300 hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="w-4 h-4 text-red-400" />
                    <div>
                      <div className="font-medium">Reset Project</div>
                      <div className="text-[10px] text-slate-400">Revert to default template</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Admin Portal Button (If user is Administrator) */}
            {isAuthenticated && user?.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold shadow-xs transition shrink-0"
                title="Open Administrator Control Portal"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* User Profile */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 p-1 pl-2 pr-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-[11px] text-white">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left mr-1">
                  <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                    @{user?.username}
                  </div>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Dedicated Studio Workspace Tabs Navigation Bar */}
        <div className="w-full px-4 sm:px-6 lg:px-8 h-11 flex items-center bg-slate-950/75 border-t border-slate-900 justify-between gap-2">
          {/* Previous Step Button */}
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={!hasPrevStep}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 transition shrink-0 text-xs font-semibold"
            title={hasPrevStep ? `Previous Step (Alt+[): ${STEP_TABS[currentStepIdx - 1]}` : "Already at Step 1"}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Prev Step</span>
          </button>

          <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs font-medium flex-1">
            <button
              onClick={() => setActiveTab("wizard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "wizard"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>1. Requirements Intake</span>
            </button>

            <button
              onClick={() => setActiveTab("recommender")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "recommender"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>2. AI Recommender</span>
            </button>

            <button
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "studio"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>3. Document Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5" />
            </button>

            <button
              onClick={() => setActiveTab("diagrams")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "diagrams"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>4. Diagram Designer</span>
            </button>

            <button
              onClick={() => setActiveTab("workflows")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "workflows"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>5. Workflow Designer</span>
            </button>

            <button
              onClick={() => setActiveTab("traceability")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "traceability"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>6. Requirements Traceability</span>
            </button>

            <button
              onClick={() => setActiveTab("adrs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "adrs"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>7. ADR Governance</span>
            </button>

            <button
              onClick={() => setActiveTab("quality")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === "quality"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>8. Architecture Quality Audit</span>
            </button>
          </nav>

          {/* Next Step Button */}
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!hasNextStep}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:text-white hover:bg-indigo-600 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition shrink-0 text-xs font-semibold"
            title={hasNextStep ? `Next Step (Alt+]): ${STEP_TABS[currentStepIdx + 1]}` : "Already at final step"}
          >
            <span className="hidden sm:inline">Next Step</span>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-300" />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Navigation Drawer (Slide-down for screens < xl) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 xl:hidden overflow-y-auto animate-in slide-in-from-top-2 p-4 sm:p-6 pb-24 text-xs">
          <div className="max-w-lg mx-auto space-y-5">
            {/* Stepper Navigation */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Workflow Phases
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setActiveTab("wizard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "wizard"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
                    <span>1. Requirements Intake</span>
                  </div>
                  {activeTab === "wizard" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("recommender");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "recommender"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
                    <span>2. AI Recommender & Stack</span>
                  </div>
                  {activeTab === "recommender" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("studio");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "studio"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
                    <span>3. Document Studio</span>
                  </div>
                  {activeTab === "studio" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("diagrams");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "diagrams"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">4</span>
                    <span>4. Interactive Diagrams</span>
                  </div>
                  {activeTab === "diagrams" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("workflows");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "workflows"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">5</span>
                    <span>5. Workflow Designer</span>
                  </div>
                  {activeTab === "workflows" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("traceability");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "traceability"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">6</span>
                    <span>6. Requirements Traceability</span>
                  </div>
                  {activeTab === "traceability" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("adrs");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "adrs"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">7</span>
                    <span>7. Architecture Decision Records</span>
                  </div>
                  {activeTab === "adrs" && <Check className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("quality");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    activeTab === "quality"
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">8</span>
                    <span>8. Quality & Validation Engine</span>
                  </div>
                  {activeTab === "quality" && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Design Level Quick Switch */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Architecture Level
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setDesignLevel("hld");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2 rounded-lg font-bold transition text-center ${
                    currentProject.designLevel === "hld"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  HLD
                </button>
                <button
                  onClick={() => {
                    setDesignLevel("lld");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2 rounded-lg font-bold transition text-center ${
                    currentProject.designLevel === "lld"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  LLD
                </button>
                <button
                  onClick={() => {
                    setDesignLevel("full");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2 rounded-lg font-bold transition text-center ${
                    currentProject.designLevel === "full"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Full
                </button>
              </div>
            </div>

            {/* Platform Utilities */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Studio Tools & Management
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsProjectsOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <div className="font-semibold">Projects & Drafts</div>
                    <div className="text-[10px] text-slate-500">{savedProjects.length} saved</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsTemplatesOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <div className="font-semibold">Templates</div>
                    <div className="text-[10px] text-slate-500">Presets & architectures</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSupportModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <LifeBuoy className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-semibold">Support Desk</div>
                    <div className="text-[10px] text-slate-500">Log tickets & track</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setFeedbackModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <MessageSquareHeart className="w-4 h-4 text-pink-400" />
                  <div className="text-left">
                    <div className="font-semibold">Give Feedback</div>
                    <div className="text-[10px] text-slate-500">Rate experience</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <div className="font-semibold">API Key Vault</div>
                    <div className="text-[10px] text-slate-500">{aiConfig?.hasKey ? "Key configured" : "No key"}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (confirm("Reset current project to initial baseline?")) {
                      resetProject();
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <div className="font-semibold">Reset Project</div>
                    <div className="text-[10px] text-slate-500">Clean baseline</div>
                  </div>
                </button>
              </div>
            </div>

            {/* User Session */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              {isAuthenticated ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">@{user?.username}</div>
                      <div className="text-[10px] text-slate-500">{user?.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 hover:text-white text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    openAuthModal("signin");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center"
                >
                  Sign In to Studio
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Bottom Navigation Bar (Phones & Small Tablets) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 py-1.5 px-3 flex md:hidden items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setActiveTab("wizard");
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "wizard" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
          <span className="text-[10px]">Intake</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("recommender");
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "recommender" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
          <span className="text-[10px]">Stack</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("studio");
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition relative ${
            activeTab === "studio" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
          <span className="text-[10px]">Studio</span>
          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </button>

        <button
          onClick={() => {
            setIsProjectsOpen(true);
            setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px]">Drafts</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            isMobileMenuOpen ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span className="text-[10px]">Menu</span>
        </button>
      </div>

      {/* Modals */}
      <ProjectsModal isOpen={isProjectsOpen} onClose={() => setIsProjectsOpen(false)} />
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal />
      <SupportModal />
      <FeedbackModal />
    </>
  );
};
