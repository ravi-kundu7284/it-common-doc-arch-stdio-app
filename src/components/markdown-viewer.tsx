"use client";

import React, { useMemo } from "react";
import { MermaidRenderer } from "./mermaid-renderer";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = "" }) => {
  // Parse content to separate raw markdown from mermaid blocks
  const parts = useMemo(() => {
    if (!content) return [];
    const segments: Array<{ type: "markdown" | "mermaid"; value: string }> = [];
    const regex = /```mermaid\s*([\s\S]*?)\s*```/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "markdown",
          value: content.slice(lastIndex, match.index),
        });
      }
      segments.push({
        type: "mermaid",
        value: match[1].trim(),
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: "markdown",
        value: content.slice(lastIndex),
      });
    }

    return segments;
  }, [content]);

  // Simple clean markdown parser for standard elements (tables, headings, lists, code)
  const renderSimpleMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (!inTable) return;
      elements.push(
        <div key={key} className="overflow-x-auto my-5 rounded-lg border border-slate-700/60 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            {tableHeaders.length > 0 && (
              <thead className="bg-slate-800/80 text-slate-200 uppercase text-xs tracking-wider border-b border-slate-700">
                <tr>
                  {tableHeaders.map((th, idx) => (
                    <th key={idx} className="p-3 font-semibold">
                      {renderInline(th)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    };

    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];

    const flushCodeBlock = (key: string) => {
      if (!inCodeBlock) return;
      elements.push(
        <div key={key} className="my-4 rounded-lg overflow-hidden border border-slate-700/70 bg-slate-950 font-mono text-xs">
          <div className="bg-slate-900 px-4 py-1.5 text-[11px] text-slate-400 font-semibold border-b border-slate-800 uppercase">
            {codeLanguage || "code"}
          </div>
          <pre className="p-4 text-emerald-300 overflow-x-auto">
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        </div>
      );
      inCodeBlock = false;
      codeLanguage = "";
      codeBuffer = [];
    };

    lines.forEach((line, index) => {
      const lineKey = `line-${index}`;

      // Check code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          flushCodeBlock(`cb-${index}`);
        } else {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Check tables
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        // Check if it's separator row
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          // It's separator, ignore
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(`tbl-${index}`);
      }

      // Headings
      if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={lineKey}
            className="text-2xl font-bold text-slate-100 tracking-tight mt-8 mb-4 pb-2 border-b border-slate-800 flex items-center gap-2"
          >
            {renderInline(line.replace("## ", ""))}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={lineKey} className="text-lg font-semibold text-indigo-300 mt-6 mb-2">
            {renderInline(line.replace("### ", ""))}
          </h3>
        );
        return;
      }
      if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={lineKey} className="text-sm font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-2">
            {renderInline(line.replace("#### ", ""))}
          </h4>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={lineKey} className="border-l-4 border-indigo-500 bg-indigo-950/20 pl-4 py-2 italic text-slate-300 my-3 rounded-r">
            {renderInline(line.replace("> ", ""))}
          </blockquote>
        );
        return;
      }

      // Bullet lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <li key={lineKey} className="ml-5 list-disc text-slate-300 my-1 leading-relaxed">
            {renderInline(line.substring(2))}
          </li>
        );
        return;
      }

      // Ordered lists
      const orderedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (orderedMatch) {
        elements.push(
          <div key={lineKey} className="flex gap-2 ml-2 my-1.5 text-slate-300 leading-relaxed">
            <span className="font-semibold text-indigo-400">{orderedMatch[1]}.</span>
            <span>{renderInline(orderedMatch[2])}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (!line.trim()) {
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={lineKey} className="text-slate-300 leading-relaxed my-2.5">
          {renderInline(line)}
        </p>
      );
    });

    if (inTable) flushTable("tbl-end");
    if (inCodeBlock) flushCodeBlock("cb-end");

    return elements;
  };

  // Helper for inline styles (bold, code, links)
  const renderInline = (str: string): React.ReactNode => {
    // Replace **bold**
    const parts = str.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[13px] border border-slate-700/50">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("$") && part.endsWith("$")) {
        return (
          <span key={i} className="font-mono text-cyan-300 font-medium px-1 bg-cyan-950/40 rounded">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {parts.map((segment, index) => {
        if (segment.type === "mermaid") {
          return <MermaidRenderer key={`mermaid-${index}`} chart={segment.value} />;
        }
        return <div key={`md-${index}`}>{renderSimpleMarkdown(segment.value)}</div>;
      })}
    </div>
  );
};
