import { NextRequest, NextResponse } from "next/server";
import { dbGetRevisions, dbSaveRevision, dbGetProject, dbSaveProject } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId query parameter required" }, { status: 400 });
    }
    const revisions = await dbGetRevisions(projectId);
    return NextResponse.json({ success: true, revisions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const body = await req.json();
    const { action, projectId, revisionId, title, comment, snapshot } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }

    // Action 1: Create Snapshot Revision
    if (action === "create" || !action) {
      const saved = await dbSaveRevision({
        project_id: projectId,
        title: title || `Snapshot ${new Date().toLocaleDateString()}`,
        snapshot: snapshot || {},
        author: auth?.userId ? `User (${auth.userId.slice(0, 8)})` : "Architect",
        comment: comment || "Manual snapshot",
      });
      return NextResponse.json({ success: true, revision: saved });
    }

    // Action 2: Restore from a Revision Snapshot
    if (action === "restore") {
      const revisions = await dbGetRevisions(projectId);
      const target = revisions.find((r) => r.id === revisionId);
      if (!target || !target.snapshot) {
        return NextResponse.json({ success: false, error: "Revision not found or has no snapshot" }, { status: 404 });
      }
      // Overwrite current project with restored snapshot
      const restored = await dbSaveProject({
        ...target.snapshot,
        id: projectId,
      });
      return NextResponse.json({ success: true, restoredProject: restored });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

