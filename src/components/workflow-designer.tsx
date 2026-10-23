"use client";

import React, { useState } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { WorkflowItem, WorkflowStep, WorkflowEdge, WorkflowStepType } from "@/types";
import { validateWorkflow, simulateWorkflowExecution, WorkflowValidationResult, WorkflowSimulationResult } from "@/lib/workflow-engine";
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
  Save,
  Trash2,
  GitBranch,
  ArrowRight,
  UserCheck,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { downloadFile } from "@/lib/export-engine";

export const WorkflowDesigner: React.FC = () => {
  const {
    currentProject,
    workflows,
    activeWorkflowId,
    saveWorkflowItem,
    deleteWorkflowItem,
    setActiveWorkflowId,
  } = useDocStore();

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || workflows[0];

  const [workflowTitle, setWorkflowTitle] = useState(activeWorkflow?.title || "Architecture Workflow");
  const [workflowDesc, setWorkflowDesc] = useState(activeWorkflow?.description || "");
  const [workflowStatus, setWorkflowStatus] = useState<"draft" | "published" | "archived">(activeWorkflow?.status || "draft");
  const [steps, setSteps] = useState<WorkflowStep[]>(activeWorkflow?.steps || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(activeWorkflow?.edges || []);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const [validationResult, setValidationResult] = useState<WorkflowValidationResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<WorkflowSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync with active workflow selection
  React.useEffect(() => {
    if (activeWorkflow) {
      setWorkflowTitle(activeWorkflow.title);
      setWorkflowDesc(activeWorkflow.description);
      setWorkflowStatus(activeWorkflow.status);
      setSteps(activeWorkflow.steps || []);
      setEdges(activeWorkflow.edges || []);
      setSelectedStepId(null);
      setValidationResult(null);
      setSimulationResult(null);
    }
  }, [activeWorkflow?.id]);

  const handleValidate = () => {
    const res = validateWorkflow({
      id: activeWorkflow?.id || "temp",
      projectId: currentProject.id,
      title: workflowTitle,
      description: workflowDesc,
      status: workflowStatus,
      steps,
      edges,
      version: activeWorkflow?.version || 1,
      createdAt: "",
      updatedAt: "",
    });
    setValidationResult(res);
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    const sim = simulateWorkflowExecution({
      id: activeWorkflow?.id || "temp",
      projectId: currentProject.id,
      title: workflowTitle,
      description: workflowDesc,
      status: workflowStatus,
      steps,
      edges,
      version: activeWorkflow?.version || 1,
      createdAt: "",
      updatedAt: "",
    });
    setSimulationResult(sim);
    setIsSimulating(false);
  };

  const handleSave = () => {
    if (!activeWorkflow) return;
    const validation = validateWorkflow({
      ...activeWorkflow,
      title: workflowTitle,
      description: workflowDesc,
      status: workflowStatus,
      steps,
      edges,
    });

    const updated: WorkflowItem = {
      ...activeWorkflow,
      title: workflowTitle,
      description: workflowDesc,
      status: workflowStatus,
      steps,
      edges,
      validation,
      version: (activeWorkflow.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    saveWorkflowItem(updated);
    setValidationResult(validation);
  };

  const handleAddStep = (type: WorkflowStepType) => {
    const newId = `s_${Date.now().toString().slice(-4)}`;
    const newStep: WorkflowStep = {
      id: newId,
      title: `New ${type.toUpperCase()} Step`,
      type,
      description: `Description of ${type} process`,
      timeoutSeconds: type === "task" ? 60 : undefined,
      retryPolicy: type === "task" ? { maxRetries: 3, backoffMs: 250 } : undefined,
    };
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);

    // Auto-connect from previous step if one exists
    if (steps.length > 0) {
      const prevStep = steps[steps.length - 1];
      const newEdge: WorkflowEdge = {
        id: `e_${prevStep.id}_${newId}`,
        source: prevStep.id,
        target: newId,
        isFailurePath: type === "compensation",
      };
      setEdges([...edges, newEdge]);
    }

    setSelectedStepId(newId);
  };

  const handleDeleteStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const handleExportJson = () => {
    const filename = `${workflowTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-workflow.json`;
    const payload = JSON.stringify(
      {
        id: activeWorkflow?.id,
        title: workflowTitle,
        description: workflowDesc,
        status: workflowStatus,
        version: activeWorkflow?.version || 1,
        steps,
        edges,
      },
      null,
      2
    );
    downloadFile(filename, payload, "application/json");
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-[#0d1322] px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowTitle}
                onChange={(e) => setWorkflowTitle(e.target.value)}
                className="bg-transparent font-bold text-slate-100 text-base focus:outline-none focus:border-b focus:border-indigo-500 px-1 py-0.5 rounded"
              />
              <select
                value={workflowStatus}
                onChange={(e) => setWorkflowStatus(e.target.value as any)}
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  workflowStatus === "published"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : workflowStatus === "archived"
                    ? "bg-slate-800 text-slate-400 border-slate-700"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="text-xs text-slate-400">
              {steps.length} Steps &bull; {edges.length} Transitions &bull; Version {activeWorkflow?.version || 1}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Validate
          </button>
          <button
            onClick={handleSimulate}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Dry-Run Simulation
          </button>
          <button
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Save className="w-3.5 h-3.5" /> Save Workflow
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Step Palette & Workflow List */}
        <div className="w-64 border-r border-slate-800 bg-[#0b101c] flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Step Palette</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddStep("trigger")}
                className="px-2 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Trigger
              </button>
              <button
                onClick={() => handleAddStep("task")}
                className="px-2 py-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Task
              </button>
              <button
                onClick={() => handleAddStep("approval")}
                className="px-2 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Approval
              </button>
              <button
                onClick={() => handleAddStep("condition")}
                className="px-2 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Branch
              </button>
              <button
                onClick={() => handleAddStep("compensation")}
                className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Rollback
              </button>
              <button
                onClick={() => handleAddStep("end")}
                className="px-2 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> End State
              </button>
            </div>
          </div>

          {/* Workflow List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">Saved Workflows</div>
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => setActiveWorkflowId(wf.id)}
                className={`group px-3 py-2 rounded-lg cursor-pointer border text-xs flex items-center justify-between ${
                  wf.id === activeWorkflow?.id
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <div className="truncate font-semibold">{wf.title}</div>
                {workflows.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWorkflowItem(wf.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Visual Workflow Pipeline Canvas */}
        <div className="flex-1 flex flex-col bg-[#070b14] overflow-auto p-6 relative">
          {/* Validation Notice Banner if errors exist */}
          {validationResult && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs ${
                validationResult.isValid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {validationResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Workflow Verified Valid for Execution
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" /> Validation Failed ({validationResult.errors.length} errors)
                  </>
                )}
              </div>
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="ml-5 text-[11px] list-disc">• {err}</div>
              ))}
              {validationResult.warnings.map((warn, idx) => (
                <div key={idx} className="ml-5 text-[11px] text-amber-300">⚠ {warn}</div>
              ))}
            </div>
          )}

          {/* Workflow Steps Sequence */}
          <div className="flex flex-col items-center gap-4 py-8">
            {steps.map((step, idx) => {
              const isSelected = selectedStepId === step.id;
              const hasFailureOut = edges.some((e) => e.source === step.id && e.isFailurePath);

              return (
                <React.Fragment key={step.id}>
                  {/* Step Card */}
                  <div
                    onClick={() => setSelectedStepId(step.id)}
                    className={`w-96 p-4 rounded-xl border cursor-pointer transition-all shadow-md ${
                      isSelected
                        ? "bg-[#182238] border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-500/20"
                        : "bg-[#0d1322] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          step.type === "trigger"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : step.type === "approval"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : step.type === "condition"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : step.type === "compensation"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : step.type === "end"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {step.type}
                      </span>
                      <div className="flex items-center gap-2">
                        {step.timeoutSeconds && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {step.timeoutSeconds}s
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(step.id);
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-slate-100">{step.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{step.description}</div>
                    {step.assignee && (
                      <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Checkpoint Assignee: {step.assignee}
                      </div>
                    )}
                  </div>

                  {/* Transition Arrow to Next Step */}
                  {idx < steps.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-indigo-500/40" />
                      <div className="w-2 h-2 rotate-45 border-b-2 border-r-2 border-indigo-400 mb-1" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Step Inspector & Simulation Drawer */}
        <div className="w-80 border-l border-slate-800 bg-[#0b101c] flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {selectedStep ? "Step Inspector" : "Workflow Simulation Trace"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {selectedStep ? (
              <>
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Step Title</label>
                  <input
                    type="text"
                    value={selectedStep.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSteps(steps.map((s) => (s.id === selectedStep.id ? { ...s, title: val } : s)));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Process Type</label>
                  <select
                    value={selectedStep.type}
                    onChange={(e) => {
                      const val = e.target.value as WorkflowStepType;
                      setSteps(steps.map((s) => (s.id === selectedStep.id ? { ...s, type: val } : s)));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="trigger">Trigger (Start)</option>
                    <option value="task">Task (Async/Sync Execution)</option>
                    <option value="approval">Human Approval Checkpoint</option>
                    <option value="condition">Conditional Branch</option>
                    <option value="parallel">Parallel Execution Split</option>
                    <option value="compensation">Failure / Rollback Compensation</option>
                    <option value="end">Terminal End State</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Description & Rules</label>
                  <textarea
                    rows={3}
                    value={selectedStep.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSteps(steps.map((s) => (s.id === selectedStep.id ? { ...s, description: val } : s)));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {selectedStep.type === "approval" && (
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Human Assignee / Role</label>
                    <input
                      type="text"
                      value={selectedStep.assignee || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSteps(steps.map((s) => (s.id === selectedStep.id ? { ...s, assignee: val } : s)));
                      }}
                      placeholder="e.g. Lead Risk Architect"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {selectedStep.type === "task" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Timeout (Sec)</label>
                      <input
                        type="number"
                        value={selectedStep.timeoutSeconds || 30}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSteps(steps.map((s) => (s.id === selectedStep.id ? { ...s, timeoutSeconds: val } : s)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Max Retries</label>
                      <input
                        type="number"
                        value={selectedStep.retryPolicy?.maxRetries || 3}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSteps(
                            steps.map((s) =>
                              s.id === selectedStep.id
                                ? { ...s, retryPolicy: { maxRetries: val, backoffMs: s.retryPolicy?.backoffMs || 250 } }
                                : s
                            )
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : simulationResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-emerald-400">Simulation Complete</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                    {simulationResult.completedSteps} / {simulationResult.totalSteps} Steps Executed
                  </span>
                </div>
                <div className="space-y-2">
                  {simulationResult.executionTrace.map((tr, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{idx + 1}. {tr.stepTitle}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400">
                          {tr.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{tr.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <Workflow className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Click on any workflow step to inspect and configure properties, or click &quot;Dry-Run Simulation&quot; above.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

