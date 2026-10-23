import { NextRequest, NextResponse } from "next/server";
import { dbGetProject } from "@/lib/supabase";
import {
  generateStandaloneHtml,
  generateRawMarkdown,
  generateStructuredJson,
  generateStructuredYaml,
  generateDocxDocument,
} from "@/lib/export-engine";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format, projectId, projectData } = body;

    let project = projectData;
    if (!project && projectId) {
      project = await dbGetProject(projectId);
    }

    if (!project) {
      return NextResponse.json({ success: false, error: "Project data required for export" }, { status: 400 });
    }

    const titleSlug = (project.metadata?.title || "architecture")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");

    switch (format) {
      case "html": {
        const content = generateStandaloneHtml(project);
        return new NextResponse(content, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${titleSlug}.html"`,
          },
        });
      }
      case "markdown":
      case "md": {
        const content = generateRawMarkdown(project);
        return new NextResponse(content, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${titleSlug}.md"`,
          },
        });
      }
      case "json": {
        const content = generateStructuredJson(project);
        return new NextResponse(content, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${titleSlug}.json"`,
          },
        });
      }
      case "yaml":
      case "yml": {
        const content = generateStructuredYaml(project);
        return new NextResponse(content, {
          headers: {
            "Content-Type": "text/yaml; charset=utf-8",
            "Content-Disposition": `attachment; filename="${titleSlug}.yaml"`,
          },
        });
      }
      case "docx": {
        const content = generateDocxDocument(project);
        return new NextResponse(content, {
          headers: {
            "Content-Type": "application/vnd.ms-word; charset=utf-8",
            "Content-Disposition": `attachment; filename="${titleSlug}.doc"`,
          },
        });
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported export format: ${format}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

