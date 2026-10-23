import { NextRequest, NextResponse } from "next/server";
import { dbGetLatestReview, dbSaveReview, dbGetProject } from "@/lib/supabase";
import { auditProjectArchitecture } from "@/lib/architecture-audit";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId parameter required" }, { status: 400 });
    }

    const review = await dbGetLatestReview(projectId);
    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, projectData, updateFindingStatus, findingId, newStatus } = body;

    // Sub-action: Update finding status (Open, Accepted, Fixed, Dismissed)
    if (updateFindingStatus && projectId && findingId && newStatus) {
      const latest = await dbGetLatestReview(projectId);
      if (latest && latest.findings) {
        const updatedFindings = latest.findings.map((f: any) =>
          f.id === findingId || f.stableId === findingId ? { ...f, status: newStatus } : f
        );
        const fixedCount = updatedFindings.filter((f: any) => f.status === "fixed").length;
        const saved = await dbSaveReview({
          ...latest,
          findings: updatedFindings,
          summary: {
            ...latest.summary,
            fixed: fixedCount,
          },
        });
        return NextResponse.json({ success: true, review: saved });
      }
    }

    // Default: Run Architecture Audit
    let project = projectData;
    if (!project && projectId) {
      project = await dbGetProject(projectId);
    }

    if (!project) {
      return NextResponse.json({ success: false, error: "Project data required for audit" }, { status: 400 });
    }

    const auditResult = auditProjectArchitecture(project);

    // Save to database
    const savedReview = await dbSaveReview({
      project_id: project.id || projectId,
      overall_score: auditResult.overallScore,
      evaluated_at: auditResult.evaluatedAt,
      findings: auditResult.findings,
      summary: auditResult.summary,
    });

    return NextResponse.json({
      success: true,
      audit: {
        ...auditResult,
        id: savedReview.id,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

