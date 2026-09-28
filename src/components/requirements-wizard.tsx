"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requirementsFormSchema, RequirementsFormData } from "@/types";
import { useDocStore } from "@/store/use-doc-store";
import { PRESET_TEMPLATES } from "@/lib/templates";
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
} from "lucide-react";

const COMPLIANCE_OPTIONS = [
  "PCI-DSS Level 1",
  "SOC2 Type II",
  "HIPAA Privacy & Security",
  "GDPR & Data Protection",
  "ISO 27001",
  "FedRAMP",
  "CCPA",
  "HL7 FHIR v4",
];

const CLOUD_ENVIRONMENTS = [
  "AWS (Amazon Web Services)",
  "GCP (Google Cloud Platform)",
  "Microsoft Azure",
  "Multi-Cloud / Hybrid",
  "On-Premise Private Cloud",
  "Serverless & Edge (Cloudflare/Vercel/Fly.io)",
];

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
  } = useDocStore();

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
      compliance: selectedCompliance,
      constraints: currentProject.requirements.constraints.join("\n"),
    },
  });

  const toggleCompliance = (item: string) => {
    const next = selectedCompliance.includes(item)
      ? selectedCompliance.filter((c) => c !== item)
      : [...selectedCompliance, item];
    setSelectedCompliance(next);
    setValue("compliance", next);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const next = [...functionalList, newFeatureText.trim()];
    setFunctionalList(next);
    setValue("functionalRequirements", next.join("\n"));
    setNewFeatureText("");
  };

  const handleRemoveFeature = (idx: number) => {
    const next = functionalList.filter((_, i) => i !== idx);
    setFunctionalList(next);
    setValue("functionalRequirements", next.join("\n"));
  };

  const handleStartBlank = () => {
    startBlankProject("Custom Architecture Project", "Enterprise Software", selectedLevel);
    setValue("title", "Custom Architecture Project");
    setValue("domain", "Enterprise Software");
    setValue("rps", 5000);
    setValue("users", "1,000,000 MAU");
    setValue("dataRetention", "3 Years");
    setValue("latency", "p99 < 150ms");
    setValue("availability", "99.95%");
    setSelectedCompliance(["SOC2 Type II", "ISO 27001"]);
    setValue("compliance", ["SOC2 Type II", "ISO 27001"]);
    const blankFeatures = [
      "Secure client authentication and access control",
      "Core domain transactional processing with idempotency",
    ];
    setFunctionalList(blankFeatures);
    setValue("functionalRequirements", blankFeatures.join("\n"));
    setValue("constraints", "Zero single points of failure");
  };

  const onSubmit = (data: RequirementsFormData) => {
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Banner & Presets Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Module A &bull; Guided Requirements Intake</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Design Requirements Intake Wizard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Standardize your system design parameters to eliminate ambiguity before architectural synthesis.
            </p>
          </div>

          {/* Quick preset selector & Start Blank button */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
            <button
              type="button"
              onClick={handleStartBlank}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white text-indigo-300 transition shadow"
              title="Start with a blank project without any demo data"
            >
              + Blank Architecture (No Demo Data)
            </button>
            <span className="text-[11px] text-slate-400 mx-1 font-medium hidden sm:inline">Presets:</span>
            {PRESET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  loadPresetTemplate(tpl.id, selectedLevel);
                  setValue("title", tpl.title);
                  setValue("domain", tpl.requirements.domain);
                  setValue("rps", tpl.requirements.targetScale.rps);
                  setValue("users", tpl.requirements.targetScale.users);
                  setValue("dataRetention", tpl.requirements.targetScale.dataRetention);
                  setValue("latency", tpl.requirements.nonFunctionalRequirements.latency);
                  setValue("availability", tpl.requirements.nonFunctionalRequirements.availability);
                  setSelectedCompliance(tpl.requirements.nonFunctionalRequirements.compliance);
                  setValue("compliance", tpl.requirements.nonFunctionalRequirements.compliance);
                  setFunctionalList(tpl.requirements.functionalRequirements);
                  setValue("functionalRequirements", tpl.requirements.functionalRequirements.join("\n"));
                  setValue("constraints", tpl.requirements.constraints.join("\n"));
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:text-indigo-300 text-slate-300 transition"
              >
                {tpl.domain}
              </button>
            ))}
          </div>
        </div>

        {/* DESIGN LEVEL SELECTION (HLD vs LLD vs Full) */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Select Architecture Design Level</span>
            </span>
            <span className="text-[11px] text-slate-400">Content and sections adapt to this selection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedLevel("hld");
                setDesignLevel("hld");
              }}
              className={`p-3.5 rounded-xl border text-left transition ${
                selectedLevel === "hld"
                  ? "border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/50"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-emerald-300">🏛️ High-Level Design (HLD)</span>
                {selectedLevel === "hld" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                System Context, C4 Containers, Microservices, Multi-Region Topology, Security & DR SLAs.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedLevel("lld");
                setDesignLevel("lld");
              }}
              className={`p-3.5 rounded-xl border text-left transition ${
                selectedLevel === "lld"
                  ? "border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-indigo-300">⚙️ Low-Level Design (LLD)</span>
                {selectedLevel === "lld" && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Class Models, Detailed DDL Schemas, API Payload Contracts, Sequence Workflows, Algorithms & Retries.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedLevel("full");
                setDesignLevel("full");
              }}
              className={`p-3.5 rounded-xl border text-left transition ${
                selectedLevel === "full"
                  ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/50"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-cyan-300">📑 Full Architecture (HLD + LLD)</span>
                {selectedLevel === "full" && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Comprehensive end-to-end design specification incorporating both macro topology and deep code mechanics.
              </p>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <button
            type="button"
            onClick={() => setStepIndex(1)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
              stepIndex === 1
                ? "border-indigo-500 bg-indigo-950/40 text-white"
                : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stepIndex === 1 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              1
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-200">Project Basics</div>
              <div className="text-[10px] text-slate-400">Scale, Domain, Audience</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStepIndex(2)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
              stepIndex === 2
                ? "border-indigo-500 bg-indigo-950/40 text-white"
                : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stepIndex === 2 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              2
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-200">Core Capabilities</div>
              <div className="text-[10px] text-slate-400">Features, SLAs, Compliance</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStepIndex(3)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
              stepIndex === 3
                ? "border-indigo-500 bg-indigo-950/40 text-white"
                : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stepIndex === 3 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              3
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-200">Constraints & Cloud</div>
              <div className="text-[10px] text-slate-400">Budget, Topology, Legacy</div>
            </div>
          </button>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  System / Project Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("title")}
                  placeholder="e.g. Global High-Throughput Financial Clearinghouse"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Business Domain <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("domain")}
                  placeholder="e.g. FinTech, Healthcare, E-Commerce, IoT, EdTech"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.domain && <p className="text-xs text-red-400 mt-1">{errors.domain.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Audience / Stakeholders
                </label>
                <input
                  type="text"
                  {...register("targetAudience")}
                  placeholder="e.g. B2B Enterprise Tenants, Mobile App Users"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Peak Expected Throughput (RPS) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    {...register("rps", { valueAsNumber: true })}
                    placeholder="10000"
                    className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-semibold">RPS</span>
                </div>
                {errors.rps && <p className="text-xs text-red-400 mt-1">{errors.rps.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Active User Scale (MAU / Concurrency) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("users")}
                  placeholder="e.g. 10,000,000 MAU / 250,000 Concurrent"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.users && <p className="text-xs text-red-400 mt-1">{errors.users.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Data Retention & Storage Lifecycle <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("dataRetention")}
                  placeholder="e.g. 7 Years historical audit storage; 90 days hot memory cache"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.dataRetention && <p className="text-xs text-red-400 mt-1">{errors.dataRetention.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStepIndex(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <span>Next: Core Capabilities</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Core Capabilities & SLAs */}
        {stepIndex === 2 && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl animate-in fade-in">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Functional Requirements & Non-Functional SLAs</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Specify user journeys, latency budgets, availability uptime targets, and regulatory standards.
              </p>
            </div>

            {/* Functional Requirements Builder */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Functional Requirements / Core Features
              </label>

              <div className="space-y-2 mb-3">
                {functionalList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  placeholder="e.g. Asynchronous payment reconciliation worker with dead-letter queue"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Feature</span>
                </button>
              </div>
            </div>

            {/* Non-Functional Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Latency Budget & SLA <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("latency")}
                  placeholder="e.g. p99 < 120ms for authorization; p95 < 50ms for reads"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
                />
                {errors.latency && <p className="text-xs text-red-400 mt-1">{errors.latency.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Availability / Uptime Target <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register("availability")}
                  placeholder="e.g. 99.999% SLA (< 5.26 minutes annual downtime)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
                />
                {errors.availability && <p className="text-xs text-red-400 mt-1">{errors.availability.message}</p>}
              </div>
            </div>

            {/* Compliance & Security Tags */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Regulatory Standards & Compliance Mandates
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMPLIANCE_OPTIONS.map((opt) => {
                  const isChecked = selectedCompliance.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleCompliance(opt)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition ${
                        isChecked
                          ? "border-indigo-500 bg-indigo-950/40 text-indigo-300 font-semibold"
                          : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${isChecked ? "text-indigo-400" : "text-slate-600"}`}
                      />
                      <span className="truncate">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStepIndex(1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStepIndex(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <span>Next: Constraints & Cloud</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Constraints & Cloud Environment */}
        {stepIndex === 3 && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl animate-in fade-in">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Operational Constraints & Cloud Environment</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Capture infrastructure targets, budget boundaries, legacy adapters, and team capabilities.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Target Cloud & Hosting Environments
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CLOUD_ENVIRONMENTS.map((env) => (
                  <div
                    key={env}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-slate-300"
                  >
                    <Server className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{env}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Architectural Constraints, Budget & Legacy Limits (1 per line)
              </label>
              <textarea
                {...register("constraints")}
                rows={4}
                placeholder="e.g.&#10;Strict RPO=0 (zero data loss on database crash)&#10;Cloud infrastructure budget capped under $5,000/month&#10;Legacy ERP REST API must be wrapped with an Anti-Corruption Layer (ACL)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono leading-relaxed focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStepIndex(2)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze & Recommend Architecture</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
