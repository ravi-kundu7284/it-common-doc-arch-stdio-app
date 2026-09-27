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

export function generateStandaloneHtml(project: DesignDocProject): string {
  const markdown = generateRawMarkdown(project);
  const { metadata, requirements, recommendations, documentSections } = project;

  // Generate table of contents
  const tocList = documentSections
    .map((sec, idx) => `<li><a href="#${sec.id}" class="toc-link">${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}</a></li>`)
    .join("\n");

  // Format sections into HTML markup
  const sectionsHtml = documentSections
    .map((sec) => {
      // Escape or transform mermaid blocks
      let html = sec.contentMarkdown;

      // Transform headers
      html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-indigo-700 mt-6 mb-2">$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-slate-900 border-b pb-2 mt-8 mb-4">$1</h2>');

      // Transform tables
      const tableRegex = /\|(.+)\|/g;
      // We will leave markdown or convert mermaid blocks into <pre class="mermaid">
      const processedHtml = html.replace(
        /```mermaid([\s\S]*?)```/g,
        '<div class="mermaid-diagram-box"><pre class="mermaid">$1</pre></div>'
      );

      return `
        <section id="${sec.id}" class="doc-section mb-12">
          <div class="content-body">
            ${processedHtml
              .split("\n\n")
              .map((para) => {
                if (para.includes("<h2") || para.includes("<h3") || para.includes("mermaid-diagram-box")) {
                  return para;
                }
                if (para.startsWith("- ") || para.startsWith("* ")) {
                  const items = para.split("\n").map((item) => `<li>${item.replace(/^[-*]\s*/, "")}</li>`).join("");
                  return `<ul class="list-disc pl-6 my-3 space-y-1">${items}</ul>`;
                }
                if (para.startsWith("> ")) {
                  return `<blockquote class="border-l-4 border-indigo-600 bg-indigo-50 pl-4 py-2 italic text-slate-700 my-4">${para.replace(/^>\s*/, "")}</blockquote>`;
                }
                return `<p class="my-3 text-slate-700 leading-relaxed">${para}</p>`;
              })
              .join("\n")}
          </div>
        </section>
      `;
    })
    .join("\n<hr class='my-10 border-slate-200' />\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title} - Software Architecture & Technical Design Document</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      });
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
      border-radius: 12px;
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
      padding: 4px 10px;
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
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0 36px 0;
      font-size: 13px;
    }
    .meta-item strong { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }

    .toc-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 40px;
    }
    .toc-box h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e40af;
    }
    .toc-box ol { margin: 0; padding-left: 20px; }
    .toc-box li { margin-bottom: 6px; }
    .toc-box a { color: #2563eb; text-decoration: none; font-weight: 500; }
    .toc-box a:hover { text-decoration: underline; }

    .mermaid-diagram-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow-x: auto;
      text-align: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
    }
    tr:nth-child(even) { background-color: #fcfcfd; }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #3730a3;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #334155;
    }

    .print-bar {
      position: sticky;
      top: 0;
      background: rgba(255,255,255,0.9);
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
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-action:hover { background: #4338ca; }

    @media print {
      body { background: white; }
      .print-bar { display: none; }
      .container { max-width: 100%; padding: 0; }
      .doc-card { border: none; box-shadow: none; padding: 0; }
      .doc-section { page-break-inside: avoid; }
      h2 { page-break-before: always; }
      .mermaid-diagram-box { border: none; box-shadow: none; }
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
      <p style="color: #64748b; margin-top: 0;">Comprehensive System Architecture & Technical Design Document (HLD/LLD)</p>

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
