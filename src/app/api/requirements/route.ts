import { NextRequest, NextResponse } from "next/server";
import {
  dbGetRequirements,
  dbSaveRequirement,
  dbDeleteRequirement,
  dbGetTraceLinks,
  dbSaveTraceLink,
  dbDeleteTraceLink,
} from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId parameter required" }, { status: 400 });
    }

    const requirements = await dbGetRequirements(projectId);
    const traceLinks = await dbGetTraceLinks(projectId);

    return NextResponse.json({ success: true, requirements, traceLinks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, requirement, traceLink } = body;

    // Save trace link
    if (action === "save_trace" && traceLink) {
      const savedLink = await dbSaveTraceLink(traceLink);
      return NextResponse.json({ success: true, traceLink: savedLink });
    }

    // Delete trace link
    if (action === "delete_trace" && traceLink?.id) {
      const deleted = await dbDeleteTraceLink(traceLink.id);
      return NextResponse.json({ success: true, deleted });
    }

    // Default: Save requirement
    const reqData = requirement || body;
    if (!reqData.projectId && !reqData.project_id) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }

    const id = reqData.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await dbSaveRequirement({
      ...reqData,
      id,
    });

    return NextResponse.json({ success: true, requirement: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id parameter required" }, { status: 400 });
    }
    const deleted = await dbDeleteRequirement(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

