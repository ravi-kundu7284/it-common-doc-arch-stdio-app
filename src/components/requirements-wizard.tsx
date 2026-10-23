"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requirementsFormSchema,
  RequirementsFormData,
  AiRequirementAnalysis,
  DocumentType,
} from "@/types";
import { useDocStore } from "@/store/use-doc-store";
import { PRESET_TEMPLATES } from "@/lib/templates";
import {
  SAMPLE_USER_PROMPTS,
  ALL_CORE_DOCUMENT_TYPES,
  analyzeRequirementText,
} from "@/lib/ai-analyzer";
import {
  FileText,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Server,
  Layers,
  Activity,
  Globe,
  DollarSign,
  Users,
  Cpu,
  HelpCircle,
  CheckSquare,
  Square,
  RefreshCw,
  Edit3,
  Bot,
  Send,
  FolderKanban,
  FileCheck,
  AlertTriangle,
  Settings,
} from "lucide-react";

export const RequirementsWizard: React.FC = () => {
  const {
    currentProject,
    updateMetadata,
    updateRequirements,
    setActiveTab,
    setActiveStep,
    loadPresetTemplate,
    startBlankProject,
    setDesignLevel,
    regenerateDocumentSections,
    applyAiAnalysisToProject,
    apiSettings,
  } = useDocStore();

  // Top level intake mode: "ai-prompt" or "structured-form"
  const [intakeMode, setIntakeMode] = useState<"ai-prompt" | "structured-form">("ai-prompt");

  // AI Prompt State
  const [naturalPrompt, setNaturalPrompt] = useState(
    SAMPLE_USER_PROMPTS[0].prompt
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{
    code?: string;
    message: string;
  } | null>(null);
  const [isOfflineSimulation, setIsOfflineSimulation] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiRequirementAnalysis | null>(
    currentProject.aiAnalysis || null
  );

  // Analysis Review State
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [newReqTitle, setNewReqTitle] = useState("");
  const [newReqDesc, setNewReqDesc] = useState("");
  const [isAddingReq, setIsAddingReq] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>(
    aiAnalysis?.selectedDocumentTypes ||
      ALL_CORE_DOCUMENT_TYPES.filter((d) => d.isRecommendedDefault).map((d) => d.type)
  );

  // Structured form state
  const [selectedLevel, setSelectedLevel] = useState<"hld" | "lld" | "full">(
    currentProject.designLevel || "hld"
  );
  const [stepIndex, setStepIndex] = useState(1);
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>(
    currentProject.requirements.nonFunctionalRequirements.compliance || []
  );
  const [functionalList, setFunctionalList] = useState<string[]>(
    currentProject.requirements.functionalRequirements.length > 0
      ? currentProject.requirements.functionalRequirements
      : [
          "Secure user authentication with multi-factor authentication (MFA)",
          "Core business domain transaction processing with idempotency guarantees",
          "Real-time event streaming and push notifications",
        ]
  );
  const [newFeatureText, setNewFeatureText] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequirementsFormData>({
    resolver: zodResolver(requirementsFormSchema),
    defaultValues: {
      title: currentProject.metadata.title,
      domain: currentProject.requirements.domain,
      targetAudience: "Developers, Systems Architects, and Engineering Stakeholders",
      rps: currentProject.requirements.targetScale.rps,
      users: currentProject.requirements.targetScale.users,
      dataRetention: currentProject.requirements.targetScale.dataRetention,
      functionalRequirements: functionalList.join("\n"),
      latency: currentProject.requirements.nonFunctionalRequirements.latency,
      availability: currentProject.requirements.nonFunctionalRequirements.availability,
      compliance: currentProject.requirements.nonFunctionalRequirements.compliance,
      constraints: currentProject.requirements.constraints.join("\n"),
    },
  });

  const handleStartBlank = () => {
    if (confirm("Reset current project to a blank canvas? Unsaved changes will be cleared.")) {
      startBlankProject();
      setValue("title", "New Technical Architecture");
      setValue("domain", "Cloud Distributed Services");
      setValue("rps", 5000);
      setValue("users", "1,000,000 MAU");
      setValue("dataRetention", "3 Years");
      setValue("latency", "p99 < 150ms");
      setValue("availability", "99.95%");
      setSelectedCompliance(["SOC2 Type II", "ISO 27001"]);
      setValue("compliance", ["SOC2 Type II", "ISO 27001"]);
      setFunctionalList([
        "Secure client authentication and session authorization",
        "Domain-specific transactional processing with idempotency guarantees",
        "High-performance read queries and asynchronous reporting",
      ]);
      setValue(
        "functionalRequirements",
        "Secure client authentication and session authorization\nDomain-specific transactional processing with idempotency guarantees\nHigh-performance read queries and asynchronous reporting"
      );
      setValue(
        "constraints",
        "Must be deployable across multi-availability zones\nZero downtime rolling deployments required"
      );
      setAiAnalysis(null);
      setAnalysisError(null);
    }
  };

  // Handle AI Analysis Execution via OpenAI
  const handleRunAiAnalysis = async (forceOffline = false) => {
    if (!naturalPrompt.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          promptType: "analyze_requirements",
          prompt: naturalPrompt,
          apiSettings,
          allowOfflineFallback: forceOffline,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAnalysisError({
          code: data.code || "AI_ERROR",
          message: data.error || "Failed to analyze requirements with OpenAI.",
        });
        setIsAnalyzing(false);
        return;
      }

      if (data.analysis) {
        setAiAnalysis(data.analysis);
        setSelectedDocs(data.analysis.selectedDocumentTypes || []);
        setIsOfflineSimulation(Boolean(data.isOfflineSimulation));
      }
    } catch (err: any) {
      setAnalysisError({
        code: "NETWORK_ERROR",
        message: err?.message || "Failed to communicate with architecture generation service.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Document Type in Checklist
  const toggleDocType = (type: DocumentType) => {
    if (selectedDocs.includes(type)) {
      setSelectedDocs(selectedDocs.filter((t) => t !== type));
    } else {
      setSelectedDocs([...selectedDocs, type]);
    }
  };

  const handleSelectAllDocs = () => {
    setSelectedDocs(ALL_CORE_DOCUMENT_TYPES.map((d) => d.type));
  };

  const handleSelectRecommendedDocs = () => {
    setSelectedDocs(ALL_CORE_DOCUMENT_TYPES.filter((d) => d.isRecommendedDefault).map((d) => d.type));
  };

  // Add / Remove Requirement in Analysis
  const handleAddRequirement = () => {
    if (!newReqTitle.trim() || !aiAnalysis) return;
    const newReq = {
      id: `FR-${String(aiAnalysis.functionalRequirements.length + 1).padStart(3, "0")}`,
      title: newReqTitle.trim(),
      description: newReqDesc.trim() || newReqTitle.trim(),
      priority: "high" as const,
    };
    setAiAnalysis({
      ...aiAnalysis,
      functionalRequirements: [...aiAnalysis.functionalRequirements, newReq],
    });
    setNewReqTitle("");
    setNewReqDesc("");
    setIsAddingReq(false);
  };

  const handleDeleteRequirement = (reqId: string) => {
    if (!aiAnalysis) return;
    setAiAnalysis({
      ...aiAnalysis,
      functionalRequirements: aiAnalysis.functionalRequirements.filter((r) => r.id !== reqId),
    });
  };

  // Approve & Generate Documents
  const handleApproveAndGenerate = () => {
    if (!aiAnalysis) return;
    const finalAnalysis: AiRequirementAnalysis = {
      ...aiAnalysis,
      selectedDocumentTypes: selectedDocs,
    };
    applyAiAnalysisToProject(finalAnalysis);
    setActiveTab("studio");
  };

  // Structured Submit
  const onSubmitStructured = (data: RequirementsFormData) => {
    updateMetadata({
      title: data.title,
    });
    updateRequirements({
      domain: data.domain,
      targetScale: {
        rps: Number(data.rps),
        users: data.users,
        dataRetention: data.dataRetention,
      },
      functionalRequirements: functionalList,
      nonFunctionalRequirements: {
        latency: data.latency,
        availability: data.availability,
        compliance: selectedCompliance,
      },
      constraints: data.constraints
        ? data.constraints.split("\n").filter((c) => c.trim().length > 0)
        : [],
    });

    setDesignLevel(selectedLevel);
    regenerateDocumentSections(selectedLevel);
    setActiveStep(2);
    setActiveTab("recommender");
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 pb-24 md:pb-8">
      {/* Header Banner & Mode Tabs */}
      <div className="mb-6 pb-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Module A &bull; Guided Requirements Intake</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Design Requirements Intake Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Synthesize architecture documents from natural-language briefs or structured parameters.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartBlank}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white text-indigo-300 transition shadow shrink-0 self-start sm:self-center"
            title="Start with a blank project without any demo data"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Blank Architecture</span>
          </button>
        </div>

        {/* Mode Toggle Switcher */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setIntakeMode("ai-prompt")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                intakeMode === "ai-prompt"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Natural Language Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakeMode("structured-form")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                intakeMode === "structured-form"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Detailed Form Parameters</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: AI NATURAL LANGUAGE PROMPT INTAKE & SYNTHESIS
          ========================================================================= */}
      {intakeMode === "ai-prompt" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Actionable Error Banner */}
          {analysisError && (
            <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs shadow-xl animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-300 text-sm">
                      {analysisError.code === "MISSING_API_KEY"
                        ? "OpenAI API Key Required"
                        : analysisError.code === "INVALID_API_KEY"
                        ? "Invalid OpenAI Credentials"
                        : "AI Architecture Generation Notice"}
                    </h4>
                    <p className="text-amber-200/90 text-xs mt-1 leading-relaxed">
                      {analysisError.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      const settingsBtn = document.querySelector('[data-testid="settings-btn"]') as HTMLElement;
                      if (settingsBtn) {
                        settingsBtn.click();
                      } else {
                        alert("Please configure OPENAI_API_KEY in your server environment (.env.local) or click the gear icon in the top header.");
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black font-bold text-xs text-amber-300 transition shadow"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Open Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunAiAnalysis(true)}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                    title="Synthesize architecture using built-in deterministic templates without an external API key"
                  >
                    Use Offline Mode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Prompt Input Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Enter Business Idea or Technical Brief</h2>
                  <p className="text-xs text-slate-400">
                    Describe your application goals, target scale, key features, or paste requirements.
                  </p>
                </div>
              </div>

              {aiAnalysis && (
                <button
                  type="button"
                  onClick={() => setAiAnalysis(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Edit Brief
                </button>
              )}
            </div>

            {/* Prompt Textarea */}
            <div className="relative">
              <textarea
                rows={4}
                value={naturalPrompt}
                onChange={(e) => setNaturalPrompt(e.target.value)}
                placeholder="e.g. Build an e-commerce platform for a residential society where only verified society members can buy and sell products. Include user authentication, product listings, orders, payments, admin approval, notifications, and deployment on a cloud platform..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm font-sans leading-relaxed focus:border-indigo-500 focus:outline-none resize-y"
              />
            </div>

            {/* Quick Preset Pills */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Or Try an Example Project Brief:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_USER_PROMPTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setNaturalPrompt(sample.prompt);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-slate-300 hover:text-indigo-200 text-xs transition flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="font-semibold text-white">{sample.title}</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">({sample.badge})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Run Analysis Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleRunAiAnalysis(false)}
                disabled={isAnalyzing || !naturalPrompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Architectural Blueprint with OpenAI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Synthesize Architecture</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: AI Architectural Analysis & Verification Dashboard */}
          {aiAnalysis && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              {/* Top Synthesis Overview Card */}
              <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                        Synthesized Blueprint
                      </span>
                      {isOfflineSimulation ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-600/50 text-amber-300 text-[10px] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                          <span>Offline Mode</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-900/50 border border-emerald-600/50 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          <span>OpenAI GPT-4o</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{aiAnalysis.projectName}</h3>
                    <p className="text-xs text-slate-400">Domain: {aiAnalysis.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-xs">
                      Pattern: {aiAnalysis.recommendedPattern}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {aiAnalysis.problemStatement}
                </p>

                {/* Tech Stack Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                  {Object.entries(aiAnalysis.recommendedStack).map(([layer, tech]) => (
                    <div key={layer} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        {layer}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 block truncate" title={tech}>
                        {tech}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clarifying Questions & Documented Assumptions */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Clarifying Questions & Architectural Assumptions</h3>
                </div>

                <div className="space-y-3">
                  {aiAnalysis.clarifyingQuestions.map((cq, idx) => (
                    <div key={cq.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold text-[10px]">
                          Q{idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-200">{cq.question}</p>
                          <p className="text-slate-400 mt-1">
                            <strong>Documented Assumption:</strong> {cq.answer}
                          </p>
                          <p className="text-[11px] text-indigo-400 mt-0.5">
                            <strong>Architectural Impact:</strong> {cq.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Functional Requirements Specification (Editable) */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">
                      Extracted Functional Requirements ({aiAnalysis.functionalRequirements.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingReq(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Requirement</span>
                  </button>
                </div>

                {isAddingReq && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Requirement Title (e.g. Audit Log Retention)"
                      value={newReqTitle}
                      onChange={(e) => setNewReqTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      placeholder="Detailed requirement description..."
                      value={newReqDesc}
                      onChange={(e) => setNewReqDesc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingReq(false)}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddRequirement}
                        className="px-3 py-1 rounded bg-indigo-600 text-white font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {aiAnalysis.functionalRequirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400">{req.id}</span>
                          <span className="font-bold text-white">{req.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-400">
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1 leading-relaxed">{req.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequirement(req.id)}
                        className="p-1.5 rounded hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition"
                        title="Remove requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configurable Document Generation Checklist (17 Core Documents) */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Document Generation Checklist ({selectedDocs.length} of {ALL_CORE_DOCUMENT_TYPES.length} Selected)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select which technical architecture documents to generate automatically.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectRecommendedDocs}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                    >
                      Recommended Default
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllDocs}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ALL_CORE_DOCUMENT_TYPES.map((docDef) => {
                    const isSelected = selectedDocs.includes(docDef.type);
                    return (
                      <div
                        key={docDef.type}
                        onClick={() => toggleDocType(docDef.type)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                          isSelected
                            ? "bg-indigo-950/30 border-indigo-500/50 text-white"
                            : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate">{docDef.title}</span>
                          </div>
                          <span className="text-[10px] text-indigo-400/80 font-mono block">
                            {docDef.category}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                            {docDef.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-slate-400 text-center sm:text-left">
                  Your manual edits and custom sections can be modified anytime in the Document Studio.
                </span>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleRunAiAnalysis(false)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Regenerate Analysis
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAndGenerate}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Generate {selectedDocs.length} Documents</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: STRUCTURED 3-STEP SPECIFICATION FORM (Legacy Compatibility)
          ========================================================================= */}
      {intakeMode === "structured-form" && (
        <form onSubmit={handleSubmit(onSubmitStructured)} className="space-y-6 animate-in fade-in">
          {/* STEP 1: Project Basics */}
          {stepIndex === 1 && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Project Identity & Scale Parameters</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define the system boundary, domain context, and target concurrency metrics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    System / Project Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("title")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. SocietyNest Community Marketplace"
                  />
                  {errors.title && <p className="text-red-400 text-[11px] mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Domain / Vertical <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("domain")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Community E-Commerce"
                  />
                  {errors.domain && <p className="text-red-400 text-[11px] mt-1">{errors.domain.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Peak Requests / Second (RPS) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    {...register("rps", { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 500"
                  />
                  {errors.rps && <p className="text-red-400 text-[11px] mt-1">{errors.rps.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Active User Base / Scale <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("users")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 5,000 Verified Households"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Data Retention Policy <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("dataRetention")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 3 Years Audit Trail"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStepIndex(2)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  <span>Next: Capabilities & SLAs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Capabilities & SLAs */}
          {stepIndex === 2 && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Capabilities & Quantitative SLAs</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Latency SLA Target <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("latency")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. p95 < 150ms"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Availability SLA <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("availability")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 99.95%"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Functional Requirements
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      placeholder="Add a functional requirement..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFeatureText.trim()) return;
                        setFunctionalList([...functionalList, newFeatureText.trim()]);
                        setNewFeatureText("");
                      }}
                      className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {functionalList.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                        <span>{f}</span>
                        <button
                          type="button"
                          onClick={() => setFunctionalList(functionalList.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex(3)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  <span>Next: Constraints & Generation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Constraints & Generation */}
          {stepIndex === 3 && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Constraints & Synthesis</span>
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Architectural Constraints (One per line)
                </label>
                <textarea
                  rows={4}
                  {...register("constraints")}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="e.g. Operating budget must be under $100/mo&#10;Must deploy on managed serverless containers"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStepIndex(2)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Architecture Specification</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
