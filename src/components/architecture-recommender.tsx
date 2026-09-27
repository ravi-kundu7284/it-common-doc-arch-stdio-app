"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { ARCHITECTURE_PATTERNS } from "@/lib/templates";
import {
  Sparkles,
  CheckCircle,
  Check,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft,
  Layers,
  Database,
  Cpu,
  Zap,
  Globe,
  Radio,
  Server,
  Scale,
  RefreshCw,
} from "lucide-react";

const TECH_CATALOG = {
  frontend: [
    "Next.js 14 (App Router, Server Components, Edge Caching)",
    "React (Vite SPA) + TanStack Query",
    "Remix / React Router v7",
    "Flutter / React Native (Cross-Platform Mobile)",
  ],
  backend: [
    "Go (Golang) / gRPC + Gin (High-concurrency, low-latency microservices)",
    "Node.js (NestJS / TypeScript) + Fastify",
    "Rust (Axum / Tokio) for extreme performance & zero GC pause",
    "Python (FastAPI) + Pydantic v2 (ML/AI pipelines & rapid REST)",
    "Java 21 / Spring Boot 3 with Virtual Threads",
  ],
  database: [
    "CockroachDB / PostgreSQL (Distributed SQL, ACID, multi-region)",
    "PostgreSQL 16 (Relational, JSONB, Row-Level Security, TimescaleDB)",
    "MongoDB Atlas (Flexible schema document store)",
    "Amazon DynamoDB / ScyllaDB (Predictable sub-10ms key-value)",
    "ClickHouse (Ultra high-throughput real-time analytical OLAP)",
  ],
  caching: [
    "Redis Enterprise Cluster (In-memory, distributed locks, pub/sub)",
    "Dragonfly (High-throughput modern Redis/Memcached drop-in)",
    "Memcached (Pure in-memory key-value caching)",
    "AWS ElastiCache / MemoryDB",
  ],
  messaging: [
    "Apache Kafka (Multi-broker partitioned durable log streaming)",
    "AWS SQS / SNS (Fully managed serverless queues and fan-out)",
    "RabbitMQ (AMQP flexible routing & dead-letter exchanges)",
    "NATS.io (Ultra-lightweight high-performance publish/subscribe)",
  ],
  devops: [
    "Kubernetes (EKS/GKE), Docker, Terraform, Helm, ArgoCD (GitOps)",
    "AWS ECS Fargate (Serverless container orchestration)",
    "Cloudflare Workers & Edge Compute",
    "Terraform, GitHub Actions CI/CD, Datadog APM & Prometheus",
  ],
};

export const ArchitectureRecommender: React.FC = () => {
  const {
    currentProject,
    updateRecommendations,
    setActiveTab,
    setActiveStep,
    regenerateDocumentSections,
  } = useDocStore();

  const { requirements, recommendations } = currentProject;
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    ARCHITECTURE_PATTERNS.find((p) => p.name === recommendations.selectedPattern)?.id ||
      ARCHITECTURE_PATTERNS[0].id
  );

  const [stackSelection, setStackSelection] = useState(recommendations.stack);
  const [lockedLayers, setLockedLayers] = useState<Record<string, boolean>>({
    frontend: false,
    backend: false,
    database: false,
    caching: false,
    messaging: false,
    devops: false,
  });

  const toggleLock = (layer: string) => {
    setLockedLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleSelectPattern = (patternObj: (typeof ARCHITECTURE_PATTERNS)[0]) => {
    setSelectedPatternId(patternObj.id);

    // Compute alternatives
    const alts = ARCHITECTURE_PATTERNS.filter((p) => p.id !== patternObj.id)
      .slice(0, 2)
      .map((p) => ({
        pattern: p.name,
        reasonNotChosen: p.cons[0] || "Higher operational complexity for target requirements.",
      }));

    updateRecommendations({
      selectedPattern: patternObj.name,
      patternAlternatives: alts,
    });
  };

  const handleStackChange = (layer: keyof typeof stackSelection, val: string) => {
    const next = { ...stackSelection, [layer]: val };
    setStackSelection(next);
    updateRecommendations({
      stack: next,
    });
  };

  const handleProceedToStudio = () => {
    updateRecommendations({
      stack: stackSelection,
    });
    regenerateDocumentSections();
    setActiveStep(3);
    setActiveTab("studio");
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Module B &bull; Architectural Synthesis & Trade-off Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Architecture & Tech Stack Recommendations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Based on <span className="text-indigo-300 font-semibold">{requirements.domain}</span> at{" "}
            <span className="font-mono text-cyan-300 font-semibold">{requirements.targetScale.rps.toLocaleString()} RPS</span> &bull;{" "}
            SLA {requirements.nonFunctionalRequirements.availability}
          </p>
        </div>

        <button
          onClick={handleProceedToStudio}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Compile Production Design Document</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* SECTION 1: Architecture Pattern Selection */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              <span>Recommended Architectural Patterns</span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated against your throughput, latency budgets, and compliance constraints. Click to lock pattern.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHITECTURE_PATTERNS.map((pattern) => {
            const isSelected = recommendations.selectedPattern === pattern.name;
            return (
              <div
                key={pattern.id}
                onClick={() => handleSelectPattern(pattern)}
                className={`flex flex-col justify-between p-5 rounded-2xl border text-left cursor-pointer transition relative group ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm">
                    <Check className="w-3 h-3" />
                    Selected
                  </span>
                )}

                <div>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 mb-2">
                    {pattern.badge}
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm mb-1">{pattern.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{pattern.description}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Key Pros:</div>
                    {pattern.pros.slice(0, 2).map((pro, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">Trade-offs:</div>
                    {pattern.cons.slice(0, 1).map((con, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <span className="text-amber-500 text-xs shrink-0 font-bold">&bull;</span>
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Scale: {pattern.recommendedScale}</span>
                  <button
                    type="button"
                    className={`font-semibold ${isSelected ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}
                  >
                    {isSelected ? "Locked" : "Select Pattern"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Interactive Tech Stack Customizer */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Curated Technology Stack Components</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize or lock each infrastructure layer. Changes automatically update C4 diagrams, ERDs, and code blocks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Frontend Layer */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>1. Frontend / Client Ingress</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("frontend")}
                className="text-slate-500 hover:text-slate-300"
                title={lockedLayers.frontend ? "Layer Locked" : "Click to Lock Layer"}
              >
                {lockedLayers.frontend ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.frontend}
              onChange={(e) => handleStackChange("frontend", e.target.value)}
              disabled={lockedLayers.frontend}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.frontend.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.frontend}
              onChange={(e) => handleStackChange("frontend", e.target.value)}
              disabled={lockedLayers.frontend}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
              placeholder="Or specify custom client technology..."
            />
          </div>

          {/* Backend / Compute */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>2. Backend Runtime & RPC</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("backend")}
                className="text-slate-500 hover:text-slate-300"
              >
                {lockedLayers.backend ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.backend}
              onChange={(e) => handleStackChange("backend", e.target.value)}
              disabled={lockedLayers.backend}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.backend.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.backend}
              onChange={(e) => handleStackChange("backend", e.target.value)}
              disabled={lockedLayers.backend}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
              placeholder="Or specify custom runtime & protocols..."
            />
          </div>

          {/* Primary Database */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>3. Primary Database Tier</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("database")}
                className="text-slate-500 hover:text-slate-300"
              >
                {lockedLayers.database ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.database}
              onChange={(e) => handleStackChange("database", e.target.value)}
              disabled={lockedLayers.database}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.database.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.database}
              onChange={(e) => handleStackChange("database", e.target.value)}
              disabled={lockedLayers.database}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
            />
          </div>

          {/* Caching Tier */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>4. Caching & Fast State Layer</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("caching")}
                className="text-slate-500 hover:text-slate-300"
              >
                {lockedLayers.caching ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.caching}
              onChange={(e) => handleStackChange("caching", e.target.value)}
              disabled={lockedLayers.caching}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.caching.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.caching}
              onChange={(e) => handleStackChange("caching", e.target.value)}
              disabled={lockedLayers.caching}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
            />
          </div>

          {/* Messaging & Streaming */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>5. Message Broker & Event Streaming</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("messaging")}
                className="text-slate-500 hover:text-slate-300"
              >
                {lockedLayers.messaging ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.messaging}
              onChange={(e) => handleStackChange("messaging", e.target.value)}
              disabled={lockedLayers.messaging}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.messaging.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.messaging}
              onChange={(e) => handleStackChange("messaging", e.target.value)}
              disabled={lockedLayers.messaging}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
            />
          </div>

          {/* DevOps & Observability */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>6. Observability, IaC & DevOps</span>
              </div>
              <button
                type="button"
                onClick={() => toggleLock("devops")}
                className="text-slate-500 hover:text-slate-300"
              >
                {lockedLayers.devops ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <select
              value={stackSelection.devops}
              onChange={(e) => handleStackChange("devops", e.target.value)}
              disabled={lockedLayers.devops}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {TECH_CATALOG.devops.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stackSelection.devops}
              onChange={(e) => handleStackChange("devops", e.target.value)}
              disabled={lockedLayers.devops}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <button
          onClick={() => {
            setActiveStep(1);
            setActiveTab("wizard");
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Requirements</span>
        </button>

        <button
          onClick={handleProceedToStudio}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Compile Production Design Document</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
