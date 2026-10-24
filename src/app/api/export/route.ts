import { NextRequest, NextResponse } from "next/server";
import { dbGetProject, dbFindUserById } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { NotificationService } from "@/lib/notifications";
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

    // Asynchronously dispatch export completion notifications (non-blocking)
    (async () => {
      try {
        const authUser = await getAuthenticatedUser(req);
        if (authUser?.userId && authUser.userId !== "00000000-0000-0000-0000-000000000001") {
          const user = await dbFindUserById(authUser.userId);
          if (user) {
            const projectName = project.metadata?.title || "Architecture Package";
            const fmt = String(format).toUpperCase();

            // 1. Email notification (preference checked inside NotificationService)
            NotificationService.sendEmail(
              {
                to: user.email,
                template: "export-alert",
                priority: "notification",
                userId: user.id,
                data: {
                  name: user.full_name || user.username,
                  projectName,
                  format: fmt,
                  exportedAt: new Date().toUTCString(),
                  documentCount: project.documents?.length || 1,
                },
              },
              true
            ).catch(() => {});

            // 2. SMS notification (preference & phone verification checked inside NotificationService)
            if (user.phone && user.phone_verified_at) {
              NotificationService.sendSms(
                user.phone,
                `DocArch AI: Documentation export completed for ${projectName} (${fmt}).`,
                "export-alert",
                undefined,
                user.id,
                true
              ).catch(() => {});
            }
          }
        }
      } catch (notifErr) {
        console.error("[Export] Notification dispatch error:", notifErr);
      }
    })();

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

