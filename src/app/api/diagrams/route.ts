import { NextRequest, NextResponse } from "next/server";
import { dbGetDiagrams, dbSaveDiagram, dbDeleteDiagram, dbGetDiagram } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const diagramId = searchParams.get("id");

    if (diagramId) {
      const diagram = await dbGetDiagram(diagramId);
      if (!diagram) return NextResponse.json({ success: false, error: "Diagram not found" }, { status: 404 });
      return NextResponse.json({ success: true, diagram });
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId or id parameter required" }, { status: 400 });
    }

    const diagrams = await dbGetDiagrams(projectId);
    return NextResponse.json({ success: true, diagrams });
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

    const id = body.id || `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await dbSaveDiagram({
      ...body,
      id,
    });
    return NextResponse.json({ success: true, diagram: saved });
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
    const deleted = await dbDeleteDiagram(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

