import { DesignDocProject } from "@/types";

export function generateRawMarkdown(project: DesignDocProject): string {
  const { metadata, requirements, recommendations, documentSections } = project;

  const header = `---
title: "${metadata.title}"
version: "${metadata.version}"
status: "${metadata.status}"
authors: [${metadata.authors.map((a) => `"${a}"`).join(", ")}]
lastUpdated: "${metadata.lastUpdated}"
domain: "${requirements.domain}"
targetScale:
  rps: ${requirements.targetScale.rps}
  users: "${requirements.targetScale.users}"
  dataRetention: "${requirements.targetScale.dataRetention}"
selectedPattern: "${recommendations.selectedPattern}"
techStack:
  frontend: "${recommendations.stack.frontend}"
  backend: "${recommendations.stack.backend}"
  database: "${recommendations.stack.database}"
  caching: "${recommendations.stack.caching}"
  messaging: "${recommendations.stack.messaging}"
  devops: "${recommendations.stack.devops}"
---

# ${metadata.title}

> **Document Status:** \`${metadata.status}\` | **Version:** \`${metadata.version}\` | **Date:** \`${metadata.lastUpdated}\`  
> **Authors:** ${metadata.authors.join(", ")}  
> **Architectural Pattern:** **${recommendations.selectedPattern}**  
> **Target Scale:** ${requirements.targetScale.rps.toLocaleString()} RPS | ${requirements.targetScale.users}

---

`;

  const sectionsContent = documentSections
    .map((sec) => sec.contentMarkdown)
    .join("\n\n---\n\n");

  return header + sectionsContent;
}

// Convert markdown text to valid, responsive HTML with tables, code, and Mermaid blocks
export function convertMarkdownSectionToHtml(markdown: string): string {
  if (!markdown) return "";

  // Step 1: Extract Mermaid blocks safely
  const mermaidBlocks: string[] = [];
  let text = markdown.replace(/```mermaid\s*([\s\S]*?)\s*```/g, (_, code) => {
    const placeholder = `<!--MERMAID_BLOCK_${mermaidBlocks.length}-->`;
    mermaidBlocks.push(code.trim());
    return `\n\n${placeholder}\n\n`;
  });

  // Step 2: Extract standard code blocks safely
  const codeBlocks: { lang: string; code: string }[] = [];
  text = text.replace(/```(\w*)\s*([\s\S]*?)\s*```/g, (_, lang, code) => {
    const placeholder = `<!--CODE_BLOCK_${codeBlocks.length}-->`;
    codeBlocks.push({ lang: lang || "text", code: code.trim() });
    return `\n\n${placeholder}\n\n`;
  });

  // Helper for inline markdown formatting
  const formatInline = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\$([^\$]+)\$/g, '<span class="inline-math">$1</span>');
  };

  // Step 3: Process lines
  const lines = text.split("\n");
  const htmlParts: string[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable) return;
    let tableHtml = '<div class="table-wrapper"><table class="doc-table">';
    if (tableHeaders.length > 0) {
      tableHtml += "<thead><tr>";
      tableHeaders.forEach((th) => {
        tableHtml += `<th>${formatInline(th)}</th>`;
      });
      tableHtml += "</tr></thead>";
    }
    if (tableRows.length > 0) {
      tableHtml += "<tbody>";
      tableRows.forEach((row) => {
        tableHtml += "<tr>";
        row.forEach((cell) => {
          tableHtml += `<td>${formatInline(cell)}</td>`;
        });
        tableHtml += "</tr>";
      });
      tableHtml += "</tbody>";
    }
    tableHtml += "</table></div>";
    htmlParts.push(tableHtml);

    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  let inList = false;
  let listType: "ul" | "ol" = "ul";

  const flushList = () => {
    if (!inList) return;
    htmlParts.push(listType === "ul" ? "</ul>" : "</ol>");
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check placeholder blocks
    if (trimmed.startsWith("<!--MERMAID_BLOCK_") || trimmed.startsWith("<!--CODE_BLOCK_")) {
      flushTable();
      flushList();
      htmlParts.push(trimmed);
      continue;
    }

    // Check table row (starts and ends with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      const cells = trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());

      // If separator line like | :--- | :--- |
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Check Headings
    if (trimmed.startsWith("## ")) {
      flushList();
      htmlParts.push(`<h2 class="doc-h2">${formatInline(trimmed.substring(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      htmlParts.push(`<h3 class="doc-h3">${formatInline(trimmed.substring(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      flushList();
      htmlParts.push(`<h4 class="doc-h4">${formatInline(trimmed.substring(5))}</h4>`);
      continue;
    }

    // Check Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      htmlParts.push(`<blockquote class="doc-quote">${formatInline(trimmed.substring(2))}</blockquote>`);
      continue;
    }

    // Check unordered lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
        htmlParts.push('<ul class="doc-list">');
      }
      htmlParts.push(`<li>${formatInline(trimmed.substring(2))}</li>`);
      continue;
    }

    // Check ordered lists
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
        htmlParts.push('<ol class="doc-ordered-list">');
      }
      htmlParts.push(`<li>${formatInline(orderedMatch[2])}</li>`);
      continue;
    }

    // Empty lines
    if (!trimmed) {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    htmlParts.push(`<p class="doc-p">${formatInline(trimmed)}</p>`);
  }

  flushTable();
  flushList();

  let finalHtml = htmlParts.join("\n");

  // Step 4: Restore Mermaid blocks
  mermaidBlocks.forEach((code, idx) => {
    const placeholder = `<!--MERMAID_BLOCK_${idx}-->`;
    const blockHtml = `
      <div class="mermaid-diagram-box">
        <div class="mermaid-badge">Architecture Vector Diagram</div>
        <pre class="mermaid">${code}</pre>
      </div>
    `;
    finalHtml = finalHtml.replace(placeholder, blockHtml);
  });

  // Step 5: Restore Code blocks
  codeBlocks.forEach(({ lang, code }, idx) => {
    const placeholder = `<!--CODE_BLOCK_${idx}-->`;
    const blockHtml = `
      <div class="code-box">
        <div class="code-header">${lang.toUpperCase()}</div>
        <pre class="code-content"><code>${formatInline(code)}</code></pre>
      </div>
    `;
    finalHtml = finalHtml.replace(placeholder, blockHtml);
  });

  return finalHtml;
}

export function generateStandaloneHtml(project: DesignDocProject): string {
  const { metadata, requirements, recommendations, documentSections } = project;

  // Generate table of contents
  const tocList = documentSections
    .map(
      (sec, idx) =>
        `<li><a href="#${sec.id}" class="toc-link">${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}</a></li>`
    )
    .join("\n");

  // Render all sections with proper HTML markup
  const sectionsHtml = documentSections
    .map((sec) => {
      const contentHtml = convertMarkdownSectionToHtml(sec.contentMarkdown);
      return `
        <section id="${sec.id}" class="doc-section">
          ${contentHtml}
        </section>
      `;
    })
    .join("\n<hr class='section-divider' />\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title} - Software Architecture & Technical Design Document</title>
  
  <!-- Mermaid.js Renderer -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", async function() {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          themeVariables: {
            fontSize: '13px',
            primaryColor: '#e0e7ff',
            primaryTextColor: '#1e1b4b',
            primaryBorderColor: '#6366f1',
            lineColor: '#64748b'
          }
        });
        await mermaid.run({
          nodes: document.querySelectorAll('.mermaid')
        });
      } catch (err) {
        console.warn("Mermaid compilation error:", err);
      }
    });
  </script>

  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --text-main: #0f172a;
      --text-muted: #475569;
      --bg-surface: #ffffff;
      --bg-canvas: #f8fafc;
      --border-color: #e2e8f0;
    }

    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text-main);
      background-color: var(--bg-canvas);
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .doc-card {
      background: var(--bg-surface);
      border-radius: 14px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
      padding: 48px;
      border: 1px solid var(--border-color);
    }

    .header-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.025em;
    }
    .badge-primary { background: #e0e7ff; color: #3730a3; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-gray { background: #f1f5f9; color: #334155; }

    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.25;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 24px 0 36px 0;
      font-size: 13px;
    }
    .meta-item strong { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }

    .toc-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 40px;
    }
    .toc-box h3 {
      margin: 0 0 12px 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e40af;
      font-weight: 700;
    }
    .toc-box ol { margin: 0; padding-left: 20px; }
    .toc-box li { margin-bottom: 6px; }
    .toc-box a { color: #2563eb; text-decoration: none; font-weight: 500; font-size: 14px; }
    .toc-box a:hover { text-decoration: underline; color: #1d4ed8; }

    .doc-section { margin-bottom: 36px; }
    .section-divider { margin: 40px 0; border: none; border-top: 1px solid #e2e8f0; }

    .doc-h2 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 32px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .doc-h3 {
      font-size: 18px;
      font-weight: 700;
      color: #4338ca;
      margin: 24px 0 10px 0;
    }
    .doc-h4 {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 18px 0 8px 0;
    }
    .doc-p {
      margin: 12px 0;
      color: #334155;
      line-height: 1.7;
      font-size: 15px;
    }
    .doc-quote {
      border-left: 4px solid #6366f1;
      background: #f5f3ff;
      padding: 12px 18px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
      color: #4338ca;
      font-style: italic;
      font-size: 14px;
    }
    .doc-list, .doc-ordered-list {
      margin: 12px 0;
      padding-left: 24px;
      color: #334155;
      font-size: 15px;
      line-height: 1.7;
    }
    .doc-list li, .doc-ordered-list li { margin-bottom: 4px; }

    /* Tables Styling */
    .table-wrapper {
      margin: 24px 0;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      text-align: left;
      background: #ffffff;
    }
    table.doc-table th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      padding: 12px 16px;
      border-bottom: 2px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    table.doc-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
      line-height: 1.5;
    }
    table.doc-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    table.doc-table tr:hover {
      background-color: #f1f5f9;
    }

    /* Mermaid Diagrams Box */
    .mermaid-diagram-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
      overflow-x: auto;
      text-align: center;
      position: relative;
    }
    .mermaid-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6366f1;
      background: #e0e7ff;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      margin: 0 auto;
    }
    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
    }

    /* Code Block Box */
    .code-box {
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #1e293b;
      background: #0f172a;
    }
    .code-header {
      background: #1e293b;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-bottom: 1px solid #334155;
    }
    .code-content {
      padding: 14px;
      margin: 0;
      overflow-x: auto;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      background: #f1f5f9;
      color: #4338ca;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .inline-math {
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #0369a1;
      background: #f0f9ff;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .print-bar {
      position: sticky;
      top: 0;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
    }
    .btn-action {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    .btn-action:hover { background: #4338ca; }

    @media print {
      body { background: white !important; }
      .print-bar { display: none !important; }
      .container { max-width: 100% !important; padding: 0 !important; }
      .doc-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
      .doc-section { page-break-inside: avoid; }
      .doc-h2 { page-break-before: always; }
      .mermaid-diagram-box { border: none !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-weight: 700; color: #0f172a; font-size: 14px;">DocArch AI Architecture Export</div>
    <button class="btn-action" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="container">
    <div class="doc-card">
      <div class="header-badge-row">
        <span class="badge badge-primary">${metadata.status}</span>
        <span class="badge badge-success">Pattern: ${recommendations.selectedPattern}</span>
        <span class="badge badge-gray">Version ${metadata.version}</span>
        <span class="badge badge-gray">Domain: ${requirements.domain}</span>
      </div>

      <h1>${metadata.title}</h1>
      <p style="color: #64748b; margin-top: 0; font-size: 15px;">Comprehensive System Architecture & Technical Design Document (HLD/LLD)</p>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Authors</strong>
          ${metadata.authors.join(", ")}
        </div>
        <div class="meta-item">
          <strong>Last Updated</strong>
          ${metadata.lastUpdated}
        </div>
        <div class="meta-item">
          <strong>Target Scale</strong>
          ${requirements.targetScale.rps.toLocaleString()} RPS | ${requirements.targetScale.users}
        </div>
        <div class="meta-item">
          <strong>SLA & Availability</strong>
          ${requirements.nonFunctionalRequirements.availability} (${requirements.nonFunctionalRequirements.latency})
        </div>
      </div>

      <div class="toc-box">
        <h3>Table of Contents</h3>
        <ol>
          ${tocList}
        </ol>
      </div>

      <main>
        ${sectionsHtml}
      </main>

      <footer style="margin-top: 60px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        Generated by <strong>DocArch AI</strong> &bull; Production System Architecture Studio
      </footer>
    </div>
  </div>
</body>
</html>`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
