import { NextRequest, NextResponse } from "next/server";
import { dbGetWorkflows, dbSaveWorkflow, dbDeleteWorkflow, dbGetWorkflow } from "@/lib/supabase";
import { validateWorkflow } from "@/lib/workflow-engine";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const workflowId = searchParams.get("id");

    if (workflowId) {
      const workflow = await dbGetWorkflow(workflowId);
      if (!workflow) return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
      return NextResponse.json({ success: true, workflow });
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId or id parameter required" }, { status: 400 });
    }

    const workflows = await dbGetWorkflows(projectId);
    return NextResponse.json({ success: true, workflows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.projectId && !body.project_id) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }

    const id = body.id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Auto-validate workflow upon saving
    const validation = validateWorkflow({
      ...body,
      id,
      steps: body.steps || [],
      edges: body.edges || [],
    });

    const saved = await dbSaveWorkflow({
      ...body,
      id,
      validation,
    });
    return NextResponse.json({ success: true, workflow: saved, validation });
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
    const deleted = await dbDeleteWorkflow(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

