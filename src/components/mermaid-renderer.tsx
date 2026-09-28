"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, AlertCircle, Maximize2, Minimize2 } from "lucide-react";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

let mermaidInstance: any = null;
const svgCache = new Map<string, string>();

export const MermaidRenderer: React.FC<MermaidRendererProps> = React.memo(({ chart, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanChart = chart ? chart.trim() : "";
  const [svgHtml, setSvgHtml] = useState<string>(() => svgCache.get(cleanChart) || "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!cleanChart) {
      setSvgHtml("");
      setError(null);
      return;
    }

    // Instant cache hit
    if (svgCache.has(cleanChart)) {
      setSvgHtml(svgCache.get(cleanChart)!);
      setError(null);
      return;
    }

    const renderChart = async () => {
      // Generate unique ID per render call to prevent Mermaid ID collisions
      const renderId = `mermaid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        if (!mermaidInstance) {
          const mermaidModule = await import("mermaid");
          mermaidInstance = mermaidModule.default;
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            themeVariables: {
              fontSize: "13px",
              primaryColor: "#e0e7ff",
              primaryTextColor: "#1e1b4b",
              primaryBorderColor: "#6366f1",
              lineColor: "#64748b",
              secondaryColor: "#f1f5f9",
              tertiaryColor: "#ffffff",
            },
          });
        }

        const { svg } = await mermaidInstance.render(renderId, cleanChart);
        svgCache.set(cleanChart, svg);
        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Mermaid render error:", err);
          setError(err?.message || "Invalid Mermaid Diagram Syntax");
        }
      } finally {
        // Clean up temporary DOM elements created by Mermaid
        const el = document.getElementById(renderId);
        if (el) el.remove();
        const dEl = document.getElementById("d" + renderId);
        if (dEl) dEl.remove();
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative my-6 rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-md transition-all overflow-hidden ${
        isExpanded ? "fixed inset-6 z-50 flex flex-col bg-slate-950 p-6 border-indigo-500 shadow-2xl" : "p-4"
      } ${className}`}
    >
      {/* Action Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500/80 animate-pulse" />
          <span className="font-mono uppercase tracking-wider text-[11px] text-slate-300 font-semibold">
            Architecture Diagram
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            title="Copy Mermaid source code"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse view" : "Expand full screen"}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Render Area */}
      <div className={`overflow-x-auto py-4 ${isExpanded ? "flex-1 flex items-center justify-center overflow-auto" : ""}`}>
        {error ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="font-semibold text-red-200">Diagram Compilation Error</p>
              <p className="text-xs font-mono text-red-300/80 mt-1">{error}</p>
              <pre className="mt-3 p-2 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto max-h-32">
                {chart}
              </pre>
            </div>
          </div>
        ) : svgHtml ? (
          <div
            ref={containerRef}
            className="flex justify-center items-center w-full [&>svg]:max-w-full [&>svg]:h-auto transition-transform"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm animate-pulse">
            Rendering architectural diagram...
          </div>
        )}
      </div>
    </div>
  );
});
