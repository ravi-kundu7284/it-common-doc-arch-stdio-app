"use client";

import React, { useEffect, useState } from "react";
import { useDocStore, StudioTab } from "@/store/use-doc-store";
import {
  Sparkles,
  Cpu,
  FileText,
  Layers,
  GitBranch,
  TableProperties,
  FileCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";

export interface WorkflowStepDef {
  step: number;
  tab: StudioTab;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    step: 1,
    tab: "wizard",
    title: "1. Requirements Intake",
    shortTitle: "Requirements",
    description: "Natural-language project brief, AI requirement extraction & scope definition",
    icon: Sparkles,
  },
  {
    step: 2,
    tab: "recommender",
    title: "2. AI Recommender",
    shortTitle: "Recommender",
    description: "Architecture pattern trade-offs, tech stack evaluation & synthesis",
    icon: Cpu,
  },
  {
    step: 3,
    tab: "studio",
    title: "3. Document Studio",
    shortTitle: "Document Studio",
    description: "HLD/LLD multi-document editor, section alignment, revisions & export",
    icon: FileText,
  },
  {
    step: 4,
    tab: "diagrams",
    title: "4. Interactive Diagrams",
    shortTitle: "Diagrams",
    description: "System context, C4 containers, sequence flows, ERDs & cloud deployment",
    icon: Layers,
  },
  {
    step: 5,
    tab: "workflows",
    title: "5. Workflow Designer",
    shortTitle: "Workflows",
    description: "Visual state machine, Saga compensations & interactive simulation engine",
    icon: GitBranch,
  },
  {
    step: 6,
    tab: "traceability",
    title: "6. Requirements Traceability",
    shortTitle: "Traceability",
    description: "Bi-directional matrix linking requirements to ADRs, sections & test cases",
    icon: TableProperties,
  },
  {
    step: 7,
    tab: "adrs",
    title: "7. ADR Governance",
    shortTitle: "ADR Governance",
    description: "Architecture Decision Records in MADR format with status lifecycle",
    icon: FileCheck,
  },
  {
    step: 8,
    tab: "quality",
    title: "8. Quality Audit",
    shortTitle: "Quality Audit",
    description: "Automated architecture review, SPOF detection & compliance scorecard",
    icon: ShieldCheck,
  },
];

export const StepNavigationBar: React.FC = () => {
  const { activeTab, setActiveTab, setActiveStep } = useDocStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Find index in the 8 steps
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.tab === activeTab);
  const currentStep = currentStepIndex !== -1 ? WORKFLOW_STEPS[currentStepIndex] : WORKFLOW_STEPS[0];
  const hasPrevStep = currentStepIndex > 0;
  const hasNextStep = currentStepIndex !== -1 && currentStepIndex < WORKFLOW_STEPS.length - 1;

  const prevStep = hasPrevStep ? WORKFLOW_STEPS[currentStepIndex - 1] : null;
  const nextStep = hasNextStep ? WORKFLOW_STEPS[currentStepIndex + 1] : null;

  const goToStep = (stepDef: WorkflowStepDef) => {
    setActiveTab(stepDef.tab);
    setActiveStep(stepDef.step);
  };

  const handlePrev = () => {
    if (prevStep) {
      goToStep(prevStep);
    }
  };

  const handleNext = () => {
    if (nextStep) {
      goToStep(nextStep);
    }
  };

  // Keyboard navigation: Ctrl+Alt+Left/Right, Alt+PageUp/Down, or Alt+[ / Alt+]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if user is inside a form input/textarea and not using modifier keys
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.altKey && (e.key === "PageUp" || e.key === "[")) {
        e.preventDefault();
        handlePrev();
      } else if (e.altKey && (e.key === "PageDown" || e.key === "]")) {
        e.preventDefault();
        handleNext();
      } else if (e.ctrlKey && e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.ctrlKey && e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.altKey && !isInput && e.key >= "1" && e.key <= "8") {
        const stepNum = parseInt(e.key, 10);
        const targetStep = WORKFLOW_STEPS.find((s) => s.step === stepNum);
        if (targetStep) {
          e.preventDefault();
          goToStep(targetStep);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex]);

  return (
    <aside
      aria-label="Workflow Steps Navigator"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] transition-all duration-200 select-none print:hidden pointer-events-auto"
    >
      {/* Minimized / Collapsed Floating Pill */}
      {isCollapsed ? (
        <div className="flex items-center gap-2 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-xl px-3 py-1.5 rounded-full text-xs text-slate-200 transition">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrevStep}
            className="p-1 rounded-full hover:bg-slate-800 disabled:opacity-25 transition text-indigo-400"
            title={prevStep ? `Previous Step (Alt+[): ${prevStep.title}` : "At first step"}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1.5 text-xs font-semibold hover:text-white"
            title="Expand Workflow Stepper"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Step {currentStep.step}/8: {currentStep.shortTitle}</span>
            <Maximize2 className="w-3 h-3 text-slate-400 ml-1" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNextStep}
            className="p-1 rounded-full hover:bg-slate-800 disabled:opacity-25 transition text-indigo-400"
            title={nextStep ? `Next Step (Alt+]): ${nextStep.title}` : "At final step"}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Full Expanded Stepper Dock */
        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-950/95 border border-slate-800/90 shadow-2xl backdrop-blur-2xl p-1.5 sm:p-2 rounded-2xl text-xs">
          {/* Previous Step Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrevStep}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition font-medium shrink-0"
            title={prevStep ? `Move to Step ${prevStep.step}: ${prevStep.title} (Alt+[ or Alt+PageUp)` : "Already at initial step"}
          >
            <ChevronLeft className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline font-semibold">
              {prevStep ? `Prev: ${prevStep.shortTitle}` : "First Step"}
            </span>
            <span className="sm:hidden font-semibold">Prev</span>
          </button>

          {/* Stepper Dots & Badges (Desktop & Tablet) */}
          <div className="flex items-center gap-1 px-1 sm:px-2 border-x border-slate-800/80">
            {WORKFLOW_STEPS.map((step) => {
              const IconComp = step.icon;
              const isActive = step.step === currentStep.step;
              const isPast = step.step < currentStep.step;

              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => goToStep(step)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : isPast
                      ? "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/60"
                  }`}
                  title={`Step ${step.step} (Alt+${step.step}): ${step.title}\n${step.description}`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">{step.shortTitle}</span>
                  <span className="lg:hidden">{step.step}</span>
                  {isPast && <Check className="w-3 h-3 text-emerald-400 hidden xl:inline" />}
                </button>
              );
            })}
          </div>

          {/* Next Step Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNextStep}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-md shadow-indigo-600/25 disabled:opacity-30 disabled:hover:bg-indigo-600 shrink-0"
            title={nextStep ? `Advance to Step ${nextStep.step}: ${nextStep.title} (Alt+] or Alt+PageDown)` : "Workflow completed"}
          >
            <span className="hidden sm:inline">
              {nextStep ? `Next: ${nextStep.shortTitle}` : "Completed"}
            </span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4 text-white shrink-0" />
          </button>

          {/* Collapse Icon */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition shrink-0 hidden sm:block"
            title="Minimize Stepper Dock"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};
