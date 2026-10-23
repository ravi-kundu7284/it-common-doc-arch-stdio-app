import { NextRequest, NextResponse } from "next/server";
import { dbGetProject, dbGetTraceLinks } from "@/lib/supabase";
import { analyzeRequirementChange, buildTraceabilityMatrix } from "@/lib/impact-engine";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, requirement, changedDescription, projectData } = body;

    let project = projectData;
    if (!project && projectId) {
      project = await dbGetProject(projectId);
    }

    if (!project) {
      return NextResponse.json({ success: false, error: "Project data required for impact analysis" }, { status: 400 });
    }

    const traceLinks = projectId ? await dbGetTraceLinks(projectId) : [];

    // Run impact analysis
    const impact = analyzeRequirementChange(
      project,
      requirement,
      changedDescription || requirement?.description || "",
      traceLinks
    );

    return NextResponse.json({
      success: true,
      impact,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

