"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { MermaidRenderer } from "./mermaid-renderer";
import { DiagramItem, DiagramType } from "@/types";
import { DIAGRAM_CATALOG, getDiagramTemplate } from "@/lib/diagram-catalog";
import {
  Layers,
  Plus,
  Trash2,
  Save,
  Download,
  Share2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Code2,
  Eye,
  Columns,
  Grid,
  FileCode,
  Sparkles,
  Move,
  CornerDownRight,
  Maximize2,
} from "lucide-react";
import { downloadFile } from "@/lib/export-engine";

export const DiagramDesigner: React.FC = () => {
  const {
    currentProject,
    diagrams,
    activeDiagramId,
    saveDiagramItem,
    deleteDiagramItem,
    setActiveDiagramId,
    updateSectionContent,
  } = useDocStore();

  const activeDiagram = diagrams.find((d) => d.id === activeDiagramId) || diagrams[0];

  const [editorMode, setEditorMode] = useState<"visual" | "code" | "split">("split");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [embedSuccess, setEmbedSuccess] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Local editable state for current diagram
  const [mermaidText, setMermaidText] = useState(activeDiagram?.mermaidCode || "");
  const [diagramTitle, setDiagramTitle] = useState(activeDiagram?.title || "Architecture Diagram");
  const [isLocked, setIsLocked] = useState(Boolean(activeDiagram?.isLocked));
  const [visualNodes, setVisualNodes] = useState(activeDiagram?.visualModel?.nodes || []);
  const [visualEdges, setVisualEdges] = useState(activeDiagram?.visualModel?.edges || []);

  useEffect(() => {
    if (activeDiagram) {
      setMermaidText(activeDiagram.mermaidCode);
      setDiagramTitle(activeDiagram.title);
      setIsLocked(Boolean(activeDiagram.isLocked));
      setVisualNodes(activeDiagram.visualModel?.nodes || []);
      setVisualEdges(activeDiagram.visualModel?.edges || []);
      setSelectedNodeId(null);
    }
  }, [activeDiagram?.id]);

  const handleCreateDiagram = (type: DiagramType) => {
    const template = getDiagramTemplate(type);
    const newId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDiagram: DiagramItem = {
      id: newId,
      projectId: currentProject.id,
      title: template.title,
      diagramType: type,
      mermaidCode: template.defaultMermaid,
      visualModel: template.defaultVisualModel,
      version: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDiagramItem(newDiagram);
    setActiveDiagramId(newId);
  };

  const handleSaveCurrent = () => {
    if (!activeDiagram) return;
    const updated: DiagramItem = {
      ...activeDiagram,
      title: diagramTitle,
      mermaidCode: mermaidText,
      visualModel: {
        nodes: visualNodes,
        edges: visualEdges,
      },
      version: (activeDiagram.version || 1) + 1,
      isLocked,
      updatedAt: new Date().toISOString(),
    };
    saveDiagramItem(updated);
  };

  const handleNodeDrag = (nodeId: string, deltaX: number, deltaY: number) => {
    if (isLocked) return;
    setVisualNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? { ...node, x: Math.max(10, node.x + deltaX), y: Math.max(10, node.y + deltaY) }
          : node
      )
    );
  };

  const handleAddNode = () => {
    if (isLocked) return;
    const newId = `Node_${visualNodes.length + 1}`;
    const newNode = {
      id: newId,
      label: `Service ${visualNodes.length + 1}`,
      subtext: "Microservice Tier",
      x: 100 + visualNodes.length * 30,
      y: 100 + visualNodes.length * 20,
    };
    setVisualNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);

    // Sync to Mermaid text
    setMermaidText((prev) => `${prev}\n    ${newId}["${newNode.label}"]`);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId || isLocked) return;
    setVisualNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setVisualEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleEmbedIntoDocument = () => {
    if (!activeDiagram) return;
    const overviewSec =
      currentProject.documentSections.find((s) => s.id === "hld-arch-overview" || s.id.includes("overview")) ||
      currentProject.documentSections[1] ||
      currentProject.documentSections[0];

    if (overviewSec) {
      const diagramMarkdown = `\n\n### ${diagramTitle}\n\`\`\`mermaid\n${mermaidText.trim()}\n\`\`\`\n`;
      updateSectionContent(overviewSec.id, overviewSec.contentMarkdown + diagramMarkdown);
      setEmbedSuccess(true);
      setTimeout(() => setEmbedSuccess(false), 3000);
    }
  };

  const handleExportMermaid = () => {
    const filename = `${diagramTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.mmd`;
    downloadFile(filename, mermaidText, "text/plain");
  };

  const handleExportJson = () => {
    const filename = `${diagramTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-diagram.json`;
    const payload = JSON.stringify(
      {
        id: activeDiagram?.id,
        title: diagramTitle,
        diagramType: activeDiagram?.diagramType,
        version: activeDiagram?.version,
        mermaidCode: mermaidText,
        visualModel: { nodes: visualNodes, edges: visualEdges },
      },
      null,
      2
    );
    downloadFile(filename, payload, "application/json");
  };

  const selectedNode = visualNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Toolbar */}
      <div className="border-b border-slate-800 bg-[#0d1322] px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={diagramTitle}
                disabled={isLocked}
                onChange={(e) => setDiagramTitle(e.target.value)}
                className="bg-transparent font-bold text-slate-100 text-base focus:outline-none focus:border-b focus:border-indigo-500 px-1 py-0.5 rounded"
              />
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v{activeDiagram?.version || 1}
              </span>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`p-1 rounded text-xs transition-colors ${
                  isLocked ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
                }`}
                title={isLocked ? "Diagram is locked against edits" : "Click to lock diagram"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xs text-slate-400">
              Type: <span className="text-indigo-300 capitalize">{activeDiagram?.diagramType?.replace("_", " ") || "Architecture"}</span>
              {" "}&bull; Project: {currentProject.metadata.title}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setEditorMode("visual")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                editorMode === "visual" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Move className="w-3.5 h-3.5" /> Visual Canvas
            </button>
            <button
              onClick={() => setEditorMode("split")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                editorMode === "split" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Split Studio
            </button>
            <button
              onClick={() => setEditorMode("code")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                editorMode === "code" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Mermaid Code
            </button>
          </div>

          {/* Embed into document */}
          <button
            onClick={handleEmbedIntoDocument}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              embedSuccess
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
            }`}
            title="Embed this diagram directly into the document Overview section"
          >
            {embedSuccess ? <Check className="w-3.5 h-3.5" /> : <CornerDownRight className="w-3.5 h-3.5" />}
            {embedSuccess ? "Embedded!" : "Embed in Doc"}
          </button>

          {/* Export dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportMermaid}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1"
              title="Download Mermaid (.mmd) code"
            >
              <Download className="w-3.5 h-3.5" /> MMD
            </button>
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1"
              title="Download structured JSON"
            >
              JSON
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveCurrent}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Diagram Catalog Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-[#0b101c] flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project Diagrams</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{diagrams.length}</span>
          </div>

          {/* Current Project Diagrams List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {diagrams.map((diag) => {
              const isSelected = diag.id === activeDiagram?.id;
              return (
                <div
                  key={diag.id}
                  onClick={() => setActiveDiagramId(diag.id)}
                  className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-all border flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold truncate text-slate-200">{diag.title}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{diag.diagramType.replace("_", " ")}</div>
                  </div>
                  {diagrams.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDiagramItem(diag.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                      title="Delete diagram"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create New Diagram Picker */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/40">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Add Diagram Template
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleCreateDiagram(e.target.value as DiagramType);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>+ Choose from 13 Diagram Types...</option>
              {DIAGRAM_CATALOG.map((cat) => (
                <option key={cat.type} value={cat.type}>
                  {cat.title} ({cat.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Canvas / Editor Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Visual Canvas Mode or Left side of Split */}
          {(editorMode === "visual" || editorMode === "split") && (
            <div className={`relative flex flex-col bg-[#070b14] overflow-hidden ${editorMode === "split" ? "w-1/2 border-r border-slate-800" : "w-full"}`}>
              {/* Canvas Controls overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur p-1 rounded-lg text-xs shadow-xl">
                <button
                  onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 text-[10px]"
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <div className="w-px h-4 bg-slate-800 my-auto" />
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 rounded ${showGrid ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:bg-slate-800"}`}
                  title="Toggle Canvas Grid"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleAddNode}
                  disabled={isLocked}
                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" /> Add Node
                </button>
              </div>

              {/* Interactive SVG/Node Canvas */}
              <div
                className={`flex-1 relative overflow-auto ${showGrid ? "bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" : ""}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
              >
                {/* SVG Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                    </marker>
                  </defs>
                  {visualEdges.map((edge) => {
                    const src = visualNodes.find((n) => n.id === edge.source);
                    const tgt = visualNodes.find((n) => n.id === edge.target);
                    if (!src || !tgt) return null;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={src.x + 80}
                          y1={src.y + 35}
                          x2={tgt.x + 80}
                          y2={tgt.y + 35}
                          stroke="#6366f1"
                          strokeWidth="2"
                          strokeDasharray={edge.label?.includes("Async") ? "4 4" : undefined}
                          markerEnd="url(#arrow)"
                        />
                        {edge.label && (
                          <text
                            x={(src.x + tgt.x) / 2 + 80}
                            y={(src.y + tgt.y) / 2 + 25}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="middle"
                            className="select-none bg-slate-900 px-1"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Draggable Node Components */}
                {visualNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      onMouseDown={(e) => {
                        if (isLocked) return;
                        setSelectedNodeId(node.id);
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const dx = (moveEvent.clientX - startX) / zoom;
                          const dy = (moveEvent.clientY - startY) / zoom;
                          handleNodeDrag(node.id, dx, dy);
                        };
                        const onMouseUp = () => {
                          window.removeEventListener("mousemove", onMouseMove);
                          window.removeEventListener("mouseup", onMouseUp);
                        };
                        window.addEventListener("mousemove", onMouseMove);
                        window.addEventListener("mouseup", onMouseUp);
                      }}
                      style={{ left: `${node.x}px`, top: `${node.y}px` }}
                      className={`absolute w-44 p-3 rounded-xl cursor-grab active:cursor-grabbing select-none border transition-shadow ${
                        isSelected
                          ? "bg-[#182238] border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/40"
                          : "bg-[#0f172a] border-slate-700/80 hover:border-slate-600 shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {node.id}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="font-semibold text-xs text-slate-100 truncate">{node.label}</div>
                      {node.subtext && <div className="text-[10px] text-slate-400 truncate">{node.subtext}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Node Properties Panel (Bottom Drawer) */}
              {selectedNode && (
                <div className="border-t border-slate-800 bg-[#0d1322] p-3 flex items-center justify-between gap-4 z-10 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold">Node: {selectedNode.id}</span>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={selectedNode.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        setVisualNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, label: newLabel } : n))
                        );
                      }}
                      placeholder="Node Label"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      disabled={isLocked}
                      value={selectedNode.subtext || ""}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        setVisualNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, subtext: newSub } : n))
                        );
                      }}
                      placeholder="Subtext / Responsibility"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-52"
                    />
                  </div>
                  <button
                    onClick={handleDeleteSelectedNode}
                    disabled={isLocked}
                    className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mermaid Code Editor & Live Preview (Right side of Split or Code Mode) */}
          {(editorMode === "code" || editorMode === "split") && (
            <div className={`flex flex-col bg-[#0b101c] overflow-hidden ${editorMode === "split" ? "w-1/2" : "w-full"}`}>
              {/* Code vs Live SVG Preview tabs */}
              <div className="border-b border-slate-800 bg-[#0d1322] px-4 py-2 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" /> Mermaid Vector Source
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mermaidText);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <FileCode className="w-3 h-3" />}
                  {copiedCode ? "Copied" : "Copy Source"}
                </button>
              </div>

              {/* Code Textarea */}
              <div className="h-1/2 border-b border-slate-800 p-2">
                <textarea
                  value={mermaidText}
                  disabled={isLocked}
                  onChange={(e) => setMermaidText(e.target.value)}
                  placeholder="Enter Mermaid diagram code..."
                  className="w-full h-full bg-[#080c16] text-sky-300 font-mono text-xs p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  spellCheck={false}
                />
              </div>

              {/* Vector SVG Live Renderer */}
              <div className="h-1/2 flex flex-col overflow-hidden bg-[#070b14]">
                <div className="px-4 py-1.5 border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Live Dynamic SVG Vector Compilation</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                  <MermaidRenderer chart={mermaidText} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

